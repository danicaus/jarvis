# jarvis

Assistente pessoal baseado em GTD (Getting Things Done), adaptado de forma não
ortodoxa. O "banco de dados" perene é um vault Obsidian versionado em Git (o
"life-vault"); leituras acontecem ao vivo via API, e escritas são consolidadas em
commits durante os passos de processamento (`processar-dia`, etc.).

## Estrutura

- `ia/` — skills do Claude Code (`ia/.claude/skills/`) que implementam a lógica GTD
  (capturar, processar-dia, processar-semana, ...).
- `back/` — API em Express + TypeScript. Armazena inbox e sessões de processamento em
  SQLite (dado leve, fora do Git); a IA é invocada via Claude Code CLI headless
  (`claude -p`), atrás de um seam único em `src/services/ai.ts`.
- `front/` — UI em Vite + React + TypeScript.
- `vault/` — (ainda não wireado) submódulo Git apontando pro life-vault.

## Rodando localmente

Cada pasta (`back/`, `front/`) tem seu próprio `package.json`:

```bash
cd back && npm install && npm run dev
cd front && npm install && npm run dev
```

Veja `back/.env.example` e `front/.env.example` pras variáveis de ambiente
necessárias (incluindo o `GOOGLE_CLIENT_ID` do OAuth e o `ALLOWED_EMAILS` do
allow-list de login).