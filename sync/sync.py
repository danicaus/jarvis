#!/usr/bin/env python3
"""
sync.py — lê o inbox pendente no Neon, processa e grava no life-vault.

Roda no servidor onde a Atena mora — separado do `back/` (Express), que
continua existindo pro CRUD/login do front. Este script só lê/escreve o
mesmo Postgres, direto, sem passar pela API do back. Sem manter estado
entre execuções além do que já está no próprio Neon (`status`).

Pipeline por item:
  1. Busca linhas com status='pendente' e já marca como 'processando' na
     mesma query atômica (SELECT FOR UPDATE SKIP LOCKED) — é o sinal pro
     back/ recusar edição/exclusão desse item enquanto o sync mexe nele.
  2. Se tipo == 'audio': transcreve (via `whisper` CLI, local — precisa
     estar instalado; ver requirements.txt).
  3. Se tipo == 'imagem': salva o blob num arquivo temporário — a
     interpretação em si acontece dentro do prompt do `claude -p` (ele lê
     imagem nativamente via ferramenta Read, não precisa de lib separada).
  4. Monta um prompt descrevendo o item (conteúdo/transcrição, tags,
     timestamp, caminho de anexo se houver) e roda `claude -p`, dando
     acesso a Bash/Read/Edit — ele decide o registro certo no vault
     (reaproveitando `~/.claude/scripts/diario-log.py`) e **comita**
     (diferente do fluxo manual "manda-pra-atena": aqui não tem sessão
     interativa acompanhando, então cada rodada do sync fecha o próprio
     ciclo sozinha, pra não acumular estado sem dono).
  5. Sucesso: marca 'processada', preenche `vault_path`, limpa os blobs
     (o binário já não precisa viver em duas cópias). Falha: volta pra
     'pendente' — vai tentar de novo na próxima rodada (sem limite de
     tentativas ainda; se um item travar sempre, fica retentando pra
     sempre — não resolvido nesta primeira versão).

Uso:
  python3 sync.py [--dry-run] [--once] [--limit N]

Variáveis de ambiente (ver .env.example):
  DATABASE_URL   — connection string do Neon
  VAULT_PATH     — caminho do life-vault nesta máquina
  ANEXOS_AUDIO   — pasta local (fora do Git) onde ficam os áudios
"""
import argparse
import os
import subprocess
import sys
import tempfile
from pathlib import Path

try:
    import psycopg2
    import psycopg2.extras
except ImportError:
    print("faltando psycopg2 — instale com: sudo apt install python3-psycopg2", file=sys.stderr)
    sys.exit(1)

DATABASE_URL = os.environ.get("DATABASE_URL")
VAULT_PATH = os.environ.get("VAULT_PATH", "/home/daniela/vaults/life-vault")
ANEXOS_AUDIO = os.environ.get("ANEXOS_AUDIO", "/home/daniela/vaults/life-vault/Anexos/Audio")


def conectar():
    if not DATABASE_URL:
        print("faltando DATABASE_URL no ambiente — ver sync/.env.example", file=sys.stderr)
        sys.exit(1)
    return psycopg2.connect(DATABASE_URL)


def buscar_e_travar_pendentes(conn, limite):
    """Atômico: pega até `limite` itens 'pendente' e já marca 'processando'
    na mesma transação (SKIP LOCKED evita esbarrar em outra execução
    concorrente do próprio sync, embora hoje ele rode um de cada vez)."""
    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(
            """
            UPDATE inbox SET status = 'processando'
            WHERE id IN (
                SELECT id FROM inbox WHERE status = 'pendente'
                ORDER BY id ASC LIMIT %s FOR UPDATE SKIP LOCKED
            )
            RETURNING id, tipo, conteudo, audio_blob, imagem_blob, tags, timestamp
            """,
            (limite,),
        )
        itens = cur.fetchall()
    conn.commit()
    return itens


def voltar_para_pendente(conn, item_id):
    with conn.cursor() as cur:
        cur.execute("UPDATE inbox SET status = 'pendente' WHERE id = %s", (item_id,))
    conn.commit()


def transcrever_audio(blob: bytes) -> str:
    """Escreve o blob num arquivo temporário e chama `whisper` local.
    Requer o pacote instalado (ver sync/requirements.txt) — ainda não
    instalado nesta máquina no momento em que este script foi escrito."""
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
        f.write(blob)
        caminho = f.name
    try:
        resultado = subprocess.run(
            [os.path.expanduser("~/.local/bin/whisper"), caminho, "--model", "small", "--language", "Portuguese",
             "--output_format", "txt", "--output_dir", tempfile.gettempdir()],
            capture_output=True, text=True, timeout=300,
        )
        if resultado.returncode != 0:
            raise RuntimeError(f"whisper falhou: {resultado.stderr}")
        txt_path = Path(tempfile.gettempdir()) / (Path(caminho).stem + ".txt")
        return txt_path.read_text(encoding="utf-8").strip()
    finally:
        os.unlink(caminho)


def salvar_imagem_temp(blob: bytes) -> str:
    with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as f:
        f.write(blob)
        return f.name


def processar_item(item, dry_run: bool) -> str | None:
    """Monta o prompt e chama claude -p. Retorna o vault_path relatado por
    ele (lido da última linha do stdout, por convenção do prompt), ou None
    se falhar."""
    tipo = item["tipo"]
    tags = ", ".join(item["tags"] or [])
    timestamp = item["timestamp"].isoformat()
    anexo_info = ""

    conteudo = item["conteudo"] or ""
    if tipo == "audio" and item["audio_blob"]:
        conteudo = transcrever_audio(bytes(item["audio_blob"]))
        os.makedirs(ANEXOS_AUDIO, exist_ok=True)
        audio_path = os.path.join(ANEXOS_AUDIO, f"{item['id']}.wav")
        with open(audio_path, "wb") as f:
            f.write(bytes(item["audio_blob"]))
        anexo_info = (
            f"Áudio original salvo em: {audio_path}. Embuta com a sintaxe do "
            f"Obsidian: ![[{os.path.basename(audio_path)}]] — com `!` na frente, "
            f"só o nome do arquivo, sem a pasta (o Obsidian acha pelo nome e "
            f"toca inline; caminho completo só cria link de texto, não embute)."
        )
    elif tipo == "imagem" and item["imagem_blob"]:
        img_temp = salvar_imagem_temp(bytes(item["imagem_blob"]))
        anexo_info = (
            f"Imagem em: {img_temp} — leia com a ferramenta Read, descreva o "
            f"que tem nela, e copie pra Anexos/ do vault com nome "
            f"AAAA-MM-DD-descrição.jpg antes de referenciar na nota. Embuta com "
            f"a sintaxe do Obsidian: ![[AAAA-MM-DD-descrição.jpg]] — com `!` na "
            f"frente, só o nome do arquivo, sem a pasta (caminho completo só "
            f"cria link de texto, não embute a imagem de verdade)."
        )

    prompt = f"""Um item chegou pela captura remota (app Jarvis), pendente de registro no vault.

Tipo: {tipo}
Tag(s): {tags}
Timestamp da captura: {timestamp}
Conteúdo: {conteudo or "(vazio — ver anexo)"}
{anexo_info}

Registre isso no life-vault seguindo as convenções de sempre (diário do dia
certo pelo timestamp acima, não pelo horário de agora; use
~/.claude/scripts/diario-log.py pra inserir a linha). Depois, dê
git add/commit/push no life-vault — este fluxo é automático, sem sessão
interativa acompanhando, então feche o ciclo você mesmo.

Ao final, imprima como ÚLTIMA linha, e só isso nessa linha:
VAULT_PATH: <caminho relativo do arquivo do diário que recebeu o registro>
"""

    if dry_run:
        print(f"--- [dry-run] item {item['id']} ---\n{prompt}\n")
        return "dry-run"

    resultado = subprocess.run(
        ["claude", "-p", prompt, "--allowedTools", "Read,Edit,Bash",
         "--permission-mode", "acceptEdits", "--output-format", "json"],
        capture_output=True, text=True, timeout=600, cwd=VAULT_PATH,
    )
    if resultado.returncode != 0:
        print(f"item {item['id']}: claude -p falhou: {resultado.stderr}", file=sys.stderr)
        return None

    import json
    try:
        saida = json.loads(resultado.stdout)
        texto = saida.get("result", "")
    except json.JSONDecodeError:
        texto = resultado.stdout

    for linha in texto.splitlines():
        if linha.startswith("VAULT_PATH:"):
            return linha.split("VAULT_PATH:", 1)[1].strip()
    return "(processado, caminho não relatado — ver diário do dia)"


def marcar_processada(conn, item_id, vault_path):
    with conn.cursor() as cur:
        cur.execute(
            "UPDATE inbox SET status = 'processada', vault_path = %s, "
            "audio_blob = NULL, imagem_blob = NULL WHERE id = %s",
            (vault_path, item_id),
        )
    conn.commit()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--once", action="store_true", help="processa só o lote atual e sai (default)")
    ap.add_argument("--limit", type=int, default=20)
    args = ap.parse_args()

    conn = conectar()

    if args.dry_run:
        # não muda status nenhum — só olha o que tá pendente
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                "SELECT id, tipo, conteudo, audio_blob, imagem_blob, tags, timestamp "
                "FROM inbox WHERE status = 'pendente' ORDER BY id ASC LIMIT %s",
                (args.limit,),
            )
            itens = cur.fetchall()
    else:
        itens = buscar_e_travar_pendentes(conn, args.limit)

    if not itens:
        print("nada pendente.")
        return 0

    for item in itens:
        print(f"processando item {item['id']} ({item['tipo']}, tags={item['tags']})...")
        vault_path = processar_item(item, args.dry_run)
        if args.dry_run:
            print("  -> [dry-run] nada gravado no Neon")
        elif vault_path:
            marcar_processada(conn, item["id"], vault_path)
            print(f"  -> ok, {vault_path}")
        else:
            voltar_para_pendente(conn, item["id"])
            print(f"  -> falhou, item {item['id']} voltou pra pendente")

    conn.close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
