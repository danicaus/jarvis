# Jarvis — Progresso e Plano

> **Como usar este arquivo:** leia isso primeiro em qualquer sessão nova (com a Dani
> ou com uma instância fresca do Claude Code) pra saber onde as coisas estão. É um
> documento vivo — deve ser **atualizado**, não acumulado como changelog. A data no
> topo de cada seção indica a última vez que aquilo mudou.

_Última atualização: 2026-07-27_

## Status atual — o que já está em produção

- ✅ Login com Google (Google Identity Services + JWT em cookie httpOnly)
- ✅ Captura de itens no inbox (criar, listar, editar, deletar)
- ✅ Banco Postgres via Neon (região São Paulo)
- ✅ Tratamento de erros centralizado (classes de erro + middleware, estilo tabnews)
- ✅ Testes de integração do back (vitest + supertest, Postgres via Docker, 12 testes)
- ✅ **Deploy em produção na Vercel** — dois projetos (back + front), validado
  end-to-end inclusive no celular:
  - Back: `https://jarvis-backend-seven-henna.vercel.app`
  - Front: `https://jarvis-front-eight.vercel.app`

## Decisões técnicas fechadas

- **Auth:** Google Sign-In, não senha. `users` guarda `google_sub` + `email` + `name`.
  Allow-list de emails autorizados via env var (`ALLOWED_EMAILS`) — sem isso, qualquer
  conta Google conseguiria se autocadastrar.
- **Storage:** Postgres via Neon, não SQLite. Motivo: Fly.io perdeu o free tier real em
  2024; Neon é grátis de verdade pro nosso uso (sem cartão, sem cobrança por excesso —
  só suspende). Mesma base do dev é usada em produção (sem branch separada).
- **Neon Auth:** avaliado e recusado — não resolve nenhum problema real, e acoplaria a
  autenticação ao Neon especificamente. Mantém "um seam por dependência externa".
- **Hospedagem:** Vercel (front + back como projetos separados), reaproveitando conta
  que a Dani já tinha. Front faz proxy reverso pro back via `rewrites` em
  `front/vercel.json` — do ponto de vista do navegador tudo é same-origin, então o
  cookie de sessão funciona sem precisar de `SameSite=None` cross-site.
- **Arquitetura de código:** rotas finas delegando pra `models/`/`services/`; um seam
  por dependência externa (`services/auth.ts`, futuro `services/ai.ts`); padrão
  repository por entidade; tipos duplicados entre front/back até a duplicação incomodar
  de verdade (sem pacote compartilhado prematuro).
- **Invocação de IA — decidido, mas ver ⚠️ abaixo:** Claude Code CLI headless
  (`claude -p`, login por assinatura), não Agent SDK — pra não sair do plano pago e
  cair em billing por API/token. Essa decisão está em tensão com o ambiente serverless
  da Vercel; ver seção de pendência abaixo antes de implementar.

## O que aprendemos (não repetir)

- **Docker > banco real pra testes.** Suíte de integração roda contra Postgres local
  via Docker Compose (`back/src/infra/compose.test.yaml`), não uma branch do Neon —
  mais rápido, isolado, sem tráfego real.
- **Nunca mudar git config pelo assistente**, mesmo com pedido explícito — é uma regra
  absoluta de segurança. `git commit --amend` é diferente (ação separada) e pode ser
  feito quando pedido.
- **Deploy Express na Vercel — três armadilhas reais:**
  1. Framework Preset genérico "Other" faz a Vercel esperar uma pasta `public/` de
     output estático e falha. Fix: selecionar o preset **"Express"** (é uma opção de
     primeira classe, não "Other").
  2. A Vercel escaneia `src/app.ts` como candidato a entrypoint **antes** de
     `src/index.ts`, e exige `export default` (ou `app.listen`) nesse arquivo
     especificamente. Fix: `export default app` no fim de `back/src/app.ts`, mantendo
     o export nomeado que os testes usam.
  3. A UI da Vercel não aceita salvar env var com valor vazio — não dá pra configurar
     `VITE_API_URL=''` direto no dashboard. Fix: `front/src/api/client.ts` decide o
     fallback pelo modo (`import.meta.env.DEV`), e a variável simplesmente não é criada
     em produção.
- **Verificar preço/free-tier atual antes de recomendar hospedagem** — já erramos uma
  vez recomendando Fly.io de memória, sem checar que o free tier tinha acabado.
- **Cuidado com números de limite "de memória" da Vercel também.** O rascunho inicial
  de `ia/Processamento assíncrono.md` assumia timeout de função serverless de "5-10s,
  até 60s configurado" — desatualizado. Com Fluid Compute (que já é o padrão pro nosso
  deploy de Express), o limite hoje é **300s por padrão em todos os planos**, podendo
  chegar a 800s (Pro) ou 1800s em beta. Ver seção de pendência abaixo pra entender por
  que isso não muda a necessidade da arquitetura orientada a eventos, só o motivo real
  por trás dela.
- **Vault do Obsidian:** nunca ignorar os arquivos nativos (`.obsidian/workspace.json`
  etc.) — a Dani quer abrir o vault em outra máquina e ver o mesmo estado/layout.
- **Email pessoal em repos pessoais** — identidade git local ao repo
  (`user.email = danicaus.br@gmail.com`), diferente da global (email de trabalho).

## ⚠️ Questão em aberto — resolver antes de começar a Fase atual

O arquivo `ia/Processamento assíncrono.md` (escrito com o Claude Web) propõe usar o
**Agent SDK** pra chamar a IA dentro do padrão assíncrono/polling, e justifica a
arquitetura orientada a eventos pelo timeout de função serverless da Vercel. Duas
correções importantes, discutidas em 2026-07-27, antes de seguir:

**1. O motivo real da arquitetura orientada a eventos não é o timeout da Vercel.**
Com Fluid Compute (padrão do nosso deploy), o limite de execução é 300s por padrão —
uma chamada de IA processando um item cabe tranquilo nisso. O motivo de verdade é que
`processar-dia` é uma **conversa com humano no meio**: a IA pergunta algo e a resposta
pode demorar minutos ou horas (a Dani pode fechar o notebook no meio). Nenhuma
requisição HTTP deveria ficar aberta esperando isso — é uma questão de natureza da
interação, não uma limitação específica de hospedagem serverless. Isso **não muda a
necessidade** de separar "iniciar processamento" de "esperar resposta" (a arquitetura
de sessão + polling continua correta), só a razão registrada por trás dela.

**2. Isso não resolve a escolha entre Agent SDK e `claude -p` — são problemas
diferentes.** Mesmo com a arquitetura de eventos perfeita, cada passo (uma pergunta,
uma resposta) ainda precisa chamar a IA de verdade em algum lugar:
- `claude -p` **não é uma conexão aberta** — é uma chamada única (prompt entra,
  resposta sai, processo termina), do tamanho de segundos, não de uma sessão de
  terminal interativa. Em termos de **duração** ele cabe numa function da Vercel sem
  problema.
- O problema real é **autenticação e ambiente**: `claude -p` lê uma credencial de
  login por assinatura salva em disco (criada num login interativo único, via
  navegador). Funções serverless da Vercel não garantem disco persistente entre
  invocações, e não tem como repetir aquele fluxo de login interativo dentro de uma
  function automatizada. Ou seja, não é sobre a requisição travar — é sobre o
  `claude -p` não ter como provar que é a assinatura da Dani rodando ali.
- Embutir essa credencial no deploy (como um secret) seria possível tecnicamente, mas
  fica em aberto se os termos de uso da Anthropic pra login por assinatura permitem
  esse tipo de uso automatizado/headless em produção — **precisa verificar antes de
  considerar esse caminho**, não presumir que é permitido.

**Precisa decidir, antes de codar a Fase atual:** como a invocação de IA vai funcionar
de verdade em produção. Caminhos possíveis a discutir (nenhum decidido ainda):
- Aceitar o custo do Agent SDK (billing por token) só pra essa parte — encaixa limpo
  no serverless, sem os problemas de credencial acima.
- Rodar a parte de IA em outro lugar que não seja função serverless da Vercel (ex.: um
  processo próprio com disco persistente), enquanto o resto do back continua na Vercel.
- Verificar se embutir a credencial de assinatura no deploy é permitido pelos termos
  da Anthropic e, se for, considerar esse caminho.

## Roadmap (fases, em ordem — vem do `ia/Processamento assíncrono.md`)

**Concluído:** captura (local e produção), editar/deletar item do inbox.

**Fase atual — validar a IA em produção:**
1. Teste isolado: uma rota simples chamando a IA, medir tempo de resposta e ver se
   roda no ambiente da Vercel — **bloqueado pela questão em aberto acima**.
2. Implementar o padrão assíncrono (sessão em `sessoes_processamento` + polling do
   front) — arquitetura completa descrita em `ia/Processamento assíncrono.md`.

**Próximas fases:**
3. `processar-dia` de verdade (skill + painel de chat consumindo o polling)
4. Tela "Hoje"
5. `concluir-tarefa` (considerar riscar direto do inbox também)
6. Vault / Registros (leitura)
7. `processar-semana` + `programar-semana` (tolerante à ausência de dados de hábitos)
8. `registrar-tempo`
9. `registrar-habito`
10. `revisar-estimativas`

## Pendências de UI, sem fase fixa

- Campo de "dia de execução" no item do inbox ainda não processado — a tela "Hoje"
  também precisa consultar o `inbox`, não só as tabelas já processadas.
- Tela de Configurações com campo de API key própria (BYOK).

## Outros documentos de referência

- `ia/RESUMO-PARA-CLAUDE-CODE.md`, `ia/ARQUITETURA-PLUGIN.md`,
  `ia/VISAO-TECNICA-PROJETO.md` — planejamento original, mais detalhado por área.
- `ia/Processamento assíncrono.md` — desenho completo do padrão assíncrono/polling
  citado na Fase atual acima.
