# Resumo do Projeto — Assistente Pessoal GTD (pra continuar no Claude Code)

## Contexto
Dani quer construir um sistema pessoal de organização baseado em GTD (Getting Things Done),
integrado com um assistente de IA (Claude), que processa notas manuscritas/faladas e organiza
tudo dentro de um vault Obsidian pessoal.

## Estado atual do projeto
O planejamento já avançou bastante em conversas anteriores com o Claude (web). Este
arquivo e os outros na mesma pasta capturam esse planejamento. Leia também:
- `ARQUITETURA-PLUGIN.md` — as skills do sistema (capturar, processar-dia, etc.),
  o modelo de dados, e como o Git funciona como banco de dados
- `VISAO-TECNICA-PROJETO.md` — stack, estrutura de repositório, telas do app, e o
  modelo da sessão de processamento (pausável)
- `skills/capturar/SKILL.md` — primeira skill já escrita, pronta pra uso

Ainda não existe código escrito. Este é o ponto de partida pra começar a implementação.

## Estrutura de arquivos do vault pessoal (formato Obsidian, com [[wikilinks]])
- `Vida Pessoal.md` — índice/hub, linka todos os outros
- `Próximas Ações.md` — organizado por contexto GTD (@Ligações, @Casa, @Computador, @Saindo, @Filipe)
- `Projetos.md` — iniciativas multi-passo (vida médica, vida financeira, hábitos, estrutura do
  Obsidian, e este próprio projeto)
- `Contextos.md` — explicação das listas situacionais do GTD
- `Algum Dia Talvez.md` — sem prazo definido
- `Perguntas em Aberto.md` — reflexões, não tarefas

## Já existe no Obsidian de Dani
- Pasta "Trabalho": bem estruturada, com templates de início/pausa/fim de tarefa,
  tracking de tempo por projeto, registro de feedback de colegas
- Pasta "Estudos": contextos, conceitos, cursos, livros — funciona bem
- Pasta "Vida Pessoal": nova, sendo construída com ajuda do Claude (ver arquivos acima)

## Preferências de Dani sobre o método
- Não quer seguir o GTD à risca — está aberto a misturar com bullet journal
  ou outros métodos, conforme o que funcionar na prática
- Prioriza baixa fricção: quer poder escrever à mão ou falar, sem ter que aprender
  ferramenta nova complexa
- Já tentou apps de hábito/alimentação antes e abandonou — cuidado ao sugerir esse tipo
  de solução, prefere algo simples
- Tem TDAH, com dificuldade real de noção de tempo (se atrasa, perde a hora de tarefas
  concentradas) — isso motivou as skills de registro e estimativa de tempo
- Regra importante: o sistema nunca assume datas, prazos, ou previsões — sempre pergunta

## Próximo passo
Começar a estruturar o monorepo (`ia/`, `front/`, `back/`, `vault/` como submódulo) e
planejar a implementação, seguindo o que está descrito em `VISAO-TECNICA-PROJETO.md`.
