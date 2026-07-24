# Visão Técnica do Projeto — Assistente Pessoal GTD

## Stack proposta

- **Front:** React + Vite, hospedado no GitHub Pages
- **Back:** a definir — NestJS considerado, mas Express simples ou funções serverless
  (Cloudflare Workers / Vercel Functions) podem bastar pro escopo atual. Decisão em
  aberto, discutir com Claude Code considerando familiaridade da Dani.
- **Hospedagem do back:** GitHub Pages só serve estático — back precisa de outro
  provedor (Render, Railway, Fly.io, ou serverless)
- **Segurança:** chaves (GitHub token, Claude API key) só existem no backend, nunca
  expostas no front. Front público precisa de autenticação simples (login/senha).

## Estrutura de repositórios

Monorepo com pipelines separadas por pasta é viável — como cada pipeline (front, back,
ia) já é independente, estar ou não no mesmo repositório não afeta deploy. A
recomendação que fica de pé é sobre **dados**, não sobre deploy: o vault carrega
informação pessoal, então vale mantê-lo isolado (ex: submódulo git) mesmo dentro do
mesmo monorepo — por privacidade e pra manter o código do app portátil/compartilhável
no futuro, se quiser.

**Visão de produto pra manter em mente (não construir agora):** o app deve tratar
"vault" como uma abstração — pode ser criado localmente no primeiro uso, ou conectado
a um vault existente (como o dela). O contrato de leitura/escrita do backend com o
vault deve ser desenhado pensando nisso desde já, mesmo que a primeira versão só
suporte o vault dela.

```
monorepo/
├── ia/       — .claude, skills, plugins
├── front/    — React + Vite
├── back/     — Express (a definir hospedagem)
└── vault/    — submódulo git, isolado, aponta pro repo pessoal da Dani
```

## Telas do front (substituindo o chat atual)

### 1. Captura
- Estado inicial: campo de texto/voz + lista do inbox pendente + botão "Processar"
- Ao clicar "Processar", a tela transiciona pra um **painel de chat embutido**
  (não modal, não navegação separada) — mantém a lista visível ao lado quando possível
- Cada pergunta (prazo, contexto, data de revisão) é feita uma de cada vez
- Cada resposta é salva imediatamente na sessão de processamento (armazenamento leve,
  não Git) — permite pausar e retomar exatamente de onde parou
- Só quando a sessão termina (todos os itens resolvidos, ou você decide parar) é que
  acontece o commit consolidado no Git

### 2. Hoje
- Duas seções: tarefas por contexto disponíveis + compromissos agendados do dia
- Navegação entre datas (passado e futuro)
- Mostra resultado de `programar-semana` quando aplicável

### 3. Revisão e Programação
- Espaço próprio pra `processar-semana` e `programar-semana` — diferente do fluxo
  diário, acontece uma vez por semana, revisa tudo: projetos, aguardando, algum-dia,
  e propõe distribuição da semana seguinte

### 4. Vault / Registros
- Consulta somente-leitura do que já foi processado (próximas ações, projetos,
  hábitos, histórico de tempo)
- Sem edição nessa fase inicial

### 5. Configurações
- Visualização (não edição, por enquanto) de: skills ativas, contextos definidos,
  hábitos trackeados, conexões de banco/vault

### 6. Login
- Necessária já que o front fica público no GitHub Pages
- Autenticação simples (usuário/senha), protege acesso aos dados pessoais

## Sessão de processamento — modelo de dados sugerido

```json
{
  "session_id": "uuid",
  "started_at": "timestamp",
  "status": "em_andamento | concluida",
  "items": [
    {
      "inbox_id": "referência ao item original do inbox",
      "status": "pendente | em_pergunta | resolvido | pulado",
      "categoria_gtd": "acao | projeto | algum_dia | referencia | null",
      "dados_resolvidos": { "contexto": "@casa", "prazo": "2026-08-01", "...": "..." }
    }
  ],
  "item_atual": "inbox_id do item sendo perguntado agora"
}
```

Fica no armazenamento leve (não Git) durante todo o processamento. Permite pausar a
qualquer momento — o app simplesmente lê esse objeto e retoma no `item_atual`. Só no
fechamento da sessão (todos resolvidos/pulados, ou você decide encerrar) os itens
resolvidos são escritos nas tabelas certas e um commit único é feito no Git.

## Perguntas em aberto pra discutir com Claude Code

- Express — pesquisar onde hospedar (Render, Railway, Fly.io, serverless)
- Modelo de autenticação simples pro front público (tela de Login)
- Formato exato do submódulo git do vault dentro do monorepo
