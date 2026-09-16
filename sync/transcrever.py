#!/usr/bin/env python3
"""
transcrever.py — transcreve um arquivo de áudio via faster-whisper.

Roda dentro do venv de `sync/` (`sync/.venv`) — é onde `faster-whisper`
está instalado, separado do Python de sistema (que só tem `psycopg2`, sem
venv, de propósito — ver requirements.txt). `sync.py` chama este script
como subprocesso, não importa a lib direto, pra manter os dois mundos
isolados sem precisar reinstalar `psycopg2` dentro do venv.

Modelo "small" com quantização int8: no teste real feito em 14-16/set/2026,
usou ~770MB de pico (vs. o `openai-whisper` "small" anterior, que sozinho
já deixava o servidor de 3,8GB sem RAM /virou o motivo de trocar). "medium"
foi testado e descartado — ~2GB de pico, sem ganho de qualidade
consistente no áudio mais difícil testado.

Uso:
  transcrever.py <caminho_do_wav>

Imprime só o texto transcrito no stdout (sem nada mais, pra `sync.py`
capturar direto).
"""
import sys

from faster_whisper import WhisperModel

def main():
    if len(sys.argv) != 2:
        print("uso: transcrever.py <caminho_do_wav>", file=sys.stderr)
        return 1

    caminho = sys.argv[1]
    model = WhisperModel("small", device="cpu", compute_type="int8")
    segments, _info = model.transcribe(caminho, language="pt")
    texto = " ".join(s.text for s in segments).strip()
    print(texto)
    return 0


if __name__ == "__main__":
    sys.exit(main())
