# jarvis

Assistente pessoal baseado em GTD (Getting Things Done), adaptado de forma não
ortodoxa. O "banco de dados" perene é um vault Obsidian versionado em Git (o
"life-vault"), mantido por uma instância separada de Claude Code (a Atena),
rodando num servidor à parte — não faz parte deste repositório.

## Arquitetura (revisada em 13-14/set/2026)

Este repositório cuida só da **captura** — a inteligência (processar,
decidir o que vira tarefa, escrever no vault) mora fora, do lado do
servidor onde a Atena roda.

```
[Front Vite+React, celular/navegador]
   → grava texto/áudio/foto + tag
   → POST pra uma Vercel Serverless Function (token secreto, não login)
        - grava no Neon (tabela `inbox`)
   ← confirma "salvo"

[sync/ — roda no servidor separado, fora deste deploy]
   → lê o Neon periodicamente (status='pendente')
   → transcreve áudio, interpreta imagem via claude -p
   → grava no life-vault, comita
   → marca status='processada', limpa os blobs
```

## Estrutura

- `front/` — UI em Vite + React + TypeScript. Três formas de captura (texto,
  áudio, foto) + tag antes de salvar.
- `front/api/` *(a criar)* — Vercel Serverless Function única, valida um
  token secreto (env var) e grava no Neon. Substitui o antigo `back/`
  Express — não tem mais login de usuário (Google OAuth/JWT saíram).
- `sync/` — script Python que roda **no servidor da Atena**, não faz parte
  do deploy do front. Lê o Neon, processa, escreve no vault. Ver
  `sync/sync.py` e `sync/.env.example`.

## O que saiu (13-14/set/2026)

- `back/` inteiro (Express, rotas de auth/inbox, middleware JWT) — a
  `services/ai.ts` de lá nunca chegou a ser implementada nem chamada; a
  função de "conversar com a IA" mudou de lugar e de forma (virou o
  `sync/`, do lado do servidor, chamando `claude -p` direto).
- Login Google OAuth / JWT — segurança da escrita no Neon virou um token
  secreto único, não conta de usuário (uso é de uma pessoa só).

## Schema do Neon

```sql
CREATE TABLE inbox (
  id            SERIAL PRIMARY KEY,
  tipo          TEXT NOT NULL CHECK (tipo IN ('texto', 'audio', 'imagem')),
  conteudo      TEXT,
  audio_blob    BYTEA,
  imagem_blob   BYTEA,
  tag           TEXT NOT NULL,
  timestamp     TIMESTAMPTZ NOT NULL DEFAULT now(),
  status        TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'processada')),
  vault_path    TEXT
);
```

## Rodando localmente

```bash
cd front && npm install && npm run dev
```

Veja `front/.env.example` pras variáveis necessárias (URL da function, token).

Pro `sync/`, ver `sync/.env.example` — roda só no servidor onde o vault e o
`claude -p` (autenticado com assinatura, não API key) já existem.
