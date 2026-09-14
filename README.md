# jarvis

Assistente pessoal baseado em GTD (Getting Things Done), adaptado de forma não
ortodoxa. O "banco de dados" perene é um vault Obsidian versionado em Git (o
"life-vault"), mantido por uma instância separada de Claude Code (a Atena),
rodando num servidor à parte — não faz parte deste repositório.

## Arquitetura (revisada em 13-14/set/2026)

**Correção de rumo (14/09):** a primeira versão desta revisão tinha proposto
tirar o `back/` inteiro (Express, OAuth, JWT, CRUD do inbox). Isso foi longe
demais — o problema real nunca foi o Express nem o login, foi só
`services/ai.ts` nunca ter sido implementado (e nem chegar a ser chamado por
nenhuma rota). `back/` **continua existindo**: login Google, JWT e o CRUD do
inbox (listar/editar/excluir) seguem valendo — inclusive editar/excluir é
uma funcionalidade real que já foi usada e vale manter, escopada a itens
ainda **não processados** (`status = 'pendente'`).

O que de fato muda: a IA (transcrever, decidir GTD, escrever no vault) sai
deste repositório e passa a rodar external, num processo (`sync/`) que lê o
Neon direto — sem passar pela API deste back.

```
[Front Vite+React, celular/navegador — login Google, como já era]
   → captura texto/áudio/foto + tag(s)
   → back/ (Express, na Vercel) grava no Neon
   → back/ também serve listar/editar/excluir, só p/ status='pendente'

[sync/ — roda no servidor da Atena, fora deste deploy]
   → lê o Neon direto (mesma DATABASE_URL), sem passar pelo back/
   → marca status='processando' ao pegar um item (evita disputa com
     edição/exclusão feita ao mesmo tempo pelo front)
   → transcreve áudio, interpreta imagem via claude -p, grava no vault
   → marca status='processada', preenche vault_path, limpa os blobs
```

`back/` e `sync/` **compartilham o mesmo Postgres, sem se chamar um ao
outro** — cada lado só lê/escreve linhas, na fase que lhe cabe.

## Estrutura

- `front/` — UI em Vite + React + TypeScript. Três formas de captura (texto,
  áudio, foto) + tag(s) antes de salvar. Continua com login Google.
- `back/` — API Express, como já era: auth Google/JWT, CRUD do inbox. Só
  muda o schema (tags, status com 3 valores, vault_path) e a listagem, que
  agora filtra por padrão pra `status = 'pendente'`.
- `sync/` — script Python que roda **no servidor da Atena**, fora do deploy
  deste repo. Lê o Neon, processa, escreve no vault. Ver `sync/sync.py` e
  `sync/.env.example`.

## Schema do Neon

```sql
CREATE TABLE inbox (
  id            SERIAL PRIMARY KEY,
  tipo          TEXT NOT NULL CHECK (tipo IN ('texto', 'audio', 'imagem')),
  conteudo      TEXT,
  audio_blob    BYTEA,
  imagem_blob   BYTEA,
  tags          TEXT[] NOT NULL DEFAULT '{}',
  timestamp     TIMESTAMPTZ NOT NULL DEFAULT now(),
  status        TEXT NOT NULL DEFAULT 'pendente'
                CHECK (status IN ('pendente', 'processando', 'processada')),
  vault_path    TEXT
);
```

`status = 'processando'` existe só pra evitar corrida: o `sync/` marca isso
assim que pega um item pra processar, e o `back/` recusa editar/excluir
qualquer item que não esteja mais em `pendente`.

## Rodando localmente

Cada pasta (`back/`, `front/`) tem seu próprio `package.json`:

```bash
cd back && npm install && npm run dev
cd front && npm install && npm run dev
```

Veja `back/.env.example` e `front/.env.example` pras variáveis de ambiente.

Pro `sync/`, ver `sync/.env.example` — roda só no servidor onde o vault e o
`claude -p` (autenticado com assinatura, não API key) já existem.
