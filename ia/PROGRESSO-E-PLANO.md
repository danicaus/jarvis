# Jarvis — Progresso e Plano

> **Como usar este arquivo:** leia isso primeiro em qualquer sessão nova (com a Dani
> ou com uma instância fresca do Claude Code) pra saber onde as coisas estão. É um
> documento vivo — deve ser **atualizado**, não acumulado como changelog. A data no
> topo de cada seção indica a última vez que aquilo mudou.

_Última atualização: 2026-09-13_

## Status atual — o que já está em produção

- ✅ Login com Google (Google Identity Services + JWT em cookie httpOnly)
- ✅ Captura de itens no inbox — texto, áudio (gravado no navegador) ou foto,
  cada um com tag(s) obrigatória(s). Listar/editar/excluir seguem existindo,
  agora escopados a itens ainda `pendente` (ver schema revisado abaixo).
- ✅ Banco Postgres via Neon (região São Paulo)
- ✅ Tratamento de erros centralizado (classes de erro + middleware, estilo tabnews)
- ✅ Testes de integração do back (vitest + supertest, Postgres via Docker, 18 testes)
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
- **Invocação de IA — resolvida em 13-14/09, ver ⚠️ antiga pendência abaixo:** não
  mora mais neste repositório. `back/src/services/ai.ts` (nunca implementado, nenhuma
  rota chegou a chamá-lo) foi deletado. A IA de verdade (transcrever áudio, interpretar
  imagem, decidir GTD, escrever no vault) roda em `sync/`, um processo Python separado
  no servidor onde a Atena mora, lendo/escrevendo o Neon direto (sem passar pela API
  deste back) via `claude -p` autenticado por assinatura naquela máquina — resolve de
  vez a tensão com o ambiente serverless da Vercel (não tem função serverless
  guardando credencial de assinatura). Detalhe completo em `README.md` e `sync/sync.py`.

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
- **Uma peça travada não é licença pra tirar as peças vizinhas que já funcionam.**
  `services/ai.ts` travado quase levou o `back/` inteiro (Express, OAuth, CRUD) junto
  numa primeira tentativa de resolver — foi revertido no mesmo dia. Ver detalhe na
  seção de pendência resolvida, logo abaixo.

## ⚠️ Questão em aberto — RESOLVIDA em 13-14/09/2026

A pendência que existia aqui (escolha entre Agent SDK e `claude -p` pra invocar IA
dentro deste repo, em tensão com o ambiente serverless da Vercel — credencial de
assinatura do `claude -p` não sobrevive num ambiente sem disco persistente) foi
resolvida **tirando a invocação de IA deste repositório por completo**, em vez de
escolher entre as opções listadas antigamente aqui. A IA passou a rodar em `sync/`,
processo à parte no servidor onde a Atena/vault já vivem — lá o `claude -p` já está
autenticado por assinatura de forma estável (não é ambiente serverless), então o
problema de credencial simplesmente não existe mais nesse desenho.

Isso também tornou obsoleto o padrão "sessão + polling dentro deste repo" descrito em
`ia/Processamento assíncrono.md` — `sync/` faz seu próprio polling direto no Postgres
(`status = 'pendente' → 'processando' → 'processada'`), sem precisar de uma tabela de
sessão neste back nem de um painel de chat consumindo polling por aqui. A tabela
`sessoes_processamento` foi removida do schema por causa disso. O documento
`ia/Processamento assíncrono.md` fica só como registro histórico do raciocínio (não
está mais desenhando o que vai ser construído).

**Houve uma correção de rumo no meio do caminho** (14/09): a primeira tentativa de
resolver isso propôs tirar o `back/` inteiro (Express, OAuth, JWT, CRUD do inbox),
achando que era tudo a mesma pendência. Foi longe demais — o problema real sempre foi
só `services/ai.ts` nunca implementado, não o Express nem o login. `back/` continua
existindo, com login Google e CRUD do inbox intactos. Lição: ao encontrar uma peça
travada (`services/ai.ts`), checar o que exatamente depende dela antes de propor tirar
a peça vizinha que já funciona e já é usada.

## Roadmap (fases, em ordem — vem do `ia/Processamento assíncrono.md`)

**Concluído:** captura multimodal (texto/áudio/foto + tags) em produção,
editar/deletar item do inbox (escopado a `pendente`), `sync/` rodando no servidor da
Atena consumindo o inbox.

**Fase atual — validar o `sync/` em produção de verdade:**
1. Rodar `sync/sync.py` contra captura real (não só teste manual) e conferir os três
   casos (texto, áudio transcrito via whisper local, imagem interpretada pelo
   `claude -p`) terminando em `processada` com `vault_path` certo.
2. Decidir o que fica de pé de `ia/Processamento assíncrono.md` (o "painel de chat"
   pra `processar-dia` ainda não tem lugar decidido — não é mais dentro deste back).

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
