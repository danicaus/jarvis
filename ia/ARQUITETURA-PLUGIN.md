# Arquitetura do Plugin — Assistente Pessoal GTD

## Visão geral
Um plugin único, agrupando skills que compartilham a mesma configuração de acesso
ao "banco de dados" (Git/vault, com armazenamento leve auxiliar pro inbox — ver
modelo confirmado ao final deste documento).

## Skills do plugin

### `capturar`
**O que faz:** Recebe qualquer input solto — texto, voz transcrita, foto de nota manuscrita.
Não processa, não decide nada. Só grava numa "inbox".

**Onde vive o inbox:** não é commitado no Git a cada captura — fica num armazenamento leve
(chave-valor), rápido de escrever, sem gerar ruído de commits o dia todo. Só quando o
`processar-dia` roda é que o conteúdo é lido, distribuído, e o commit consolidado
acontece no Git.

**Lê:** nada
**Escreve:** `inbox` (novo item, timestamp, origem — texto/voz/foto)

---

### `processar-dia`
**O que faz:** Esvazia a inbox. Pra cada item, aplica o fluxograma GTD: é acionável?
Vira ação (com contexto @), projeto, referência, ou "algum dia".

**Regra importante:** nunca assume prazo, data de revisão, ou previsão. Sempre pergunta
a você quando o item precisar dessa informação:
- Ação com prazo? → pergunta a data
- Vai pra "algum dia/talvez"? → pergunta quando revisitar (data fixa ou gatilho,
  tipo "quando eu tiver mais tempo livre")
- Projeto novo? → pergunta se tem prazo alvo

Se você não souber responder na hora, a skill registra "sem data definida" — não
inventa um valor.

**Lê:** `inbox`, `contextos` (lista de @tags existentes)
**Escreve:** `proximas-acoes`, `projetos`, `algum-dia`, `referencia` — e limpa a `inbox`

---

### `processar-semana`
**O que faz:** Revisão semanal GTD. Passa por todos os projetos (garante que cada um
tem próxima ação clara), revisa "aguardando resposta", limpa "algum dia" obsoleto.

**Lê:** `projetos`, `proximas-acoes`, `aguardando`, `algum-dia`
**Escreve:** atualizações nesses mesmos arquivos/tabelas

---

### `concluir-tarefa`
**O que faz:** Marca uma ou mais tarefas como concluídas. Se for a última ação de um
projeto, sinaliza que o projeto pode estar completo (e pergunta a você). Também verifica
o `inbox`: se você capturou algo hoje e já resolveu antes mesmo dele ser processado,
essa skill reconhece e risca direto do inbox, sem precisar esperar o `processar-dia`.

**Lê:** `proximas-acoes`, `projetos`, `inbox`
**Escreve:** move item pra `concluidas` (com data), atualiza status do projeto se aplicável,
remove do `inbox` se for o caso

---

### `marcar-compromisso`
**O que faz:** Registra algo com hora marcada (não é "próxima ação" solta, é compromisso).

**Lê:** `agenda` (evita conflito de horário)
**Escreve:** `agenda`
**Observação:** essa é a skill que mais faria sentido ligar ao Google Calendar via MCP,
no futuro — por enquanto pode ficar só no seu banco/vault.

---

### `registrar-tempo`
**O que faz:** Start / pausa / fim de uma atividade. Pensada especialmente pra sua
dificuldade de noção de tempo (arrumar-se, tarefas de concentração).

**Modelo de dados:** é uma tabela de log (`registros-tempo`), não colunas dentro da
própria tarefa. Cada linha é um registro de início/fim, com uma relação **opcional**
com uma tarefa (`proximas-acoes` ou `projetos`). Se a atividade não tem tarefa
associada (banho, maquiagem, deslocamento), o campo de relação fica vazio — é um
registro "solto", mas ainda útil pro seu mapa de tempo do dia.

Quando uma tarefa leva mais de um dia, o tempo total dela é a **soma de todos os logs**
relacionados a ela — não um único início/fim.

**Lê:** nada pra registrar, mas consulta `registros-tempo` histórico quando você pergunta
"quanto eu costumo demorar em X?"
**Escreve:** `registros-tempo` (atividade, tarefa relacionada — opcional, início, fim,
duração calculada)

---

### `revisar-estimativas`
**O que faz:** Periodicamente (parte do `processar-semana`), calcula a média/mediana de
tempo real gasto em cada tipo de atividade (via `registros-tempo`) e atualiza uma tabela
de estimativas calibradas. Essa tabela é o que alimenta perguntas pontuais de
planejamento — tipo "se meu ônibus sai às 18h, que horas devo sair do trabalho,
considerando arrumar mala, banho, me arrumar e deslocamento até a rodoviária, com 30min
de folga?". Essas perguntas não precisam de uma skill própria — eu já consulto
`estimativas-calibradas` (e `registros-tempo` quando não há estimativa calibrada ainda)
direto, a qualquer momento que você perguntar algo assim.

**Lê:** `registros-tempo`
**Escreve:** `estimativas-calibradas` (atividade, tempo médio, tempo mediano, nº de amostras)

---

### `registrar-habito`
**O que faz:** Registra uma ocorrência de hábito — estudei, joguei (e qual jogo), fiz
exercício, li (e qual livro). Diferente de tarefa: não "conclui", só acumula frequência.
Alimentada tanto por você contando diretamente quanto pelo processamento das notas do
caderno (como aquelas páginas de "Acompanhamentos" que você já mantém).

**Lê:** `habitos-definidos` (lista de hábitos que você quer trackear)
**Escreve:** `registros-habitos` (hábito, data, detalhe opcional — ex: nome do jogo/livro)

---

### `programar-semana`
**O que faz:** Roda depois do `processar-semana`. Olha todas as próximas ações e passos
de projetos em aberto, junto com os contextos de cada uma (@casa, @computador, etc.),
e propõe uma distribuição pelos dias da semana — considerando compromissos já marcados
na agenda e reservando blocos de tempo pros hábitos que estão desequilibrados (ex:
jogou bastante, leu pouco → reserva um tempo pra leitura).

**Regra importante:** nunca marca nada na agenda sozinha. Monta uma **proposta** e
mostra pra você revisar — só vira compromisso de verdade depois que você confirmar
(aí sim aciona `marcar-compromisso`).

**Lê:** `proximas-acoes`, `projetos`, `contextos`, `habitos-definidos`,
`registros-habitos`, `agenda` (pra não sugerir horário já ocupado)
**Escreve:** nada direto — gera a proposta, que só vira dado real via `marcar-compromisso`
depois da sua confirmação

---

## "Banco de dados" — tabelas/arquivos compartilhados

| Nome              | O que guarda                                      | Escrito por                    |
|-------------------|----------------------------------------------------|---------------------------------|
| `inbox`           | Itens capturados, ainda não processados            | `capturar`                     |
| `proximas-acoes`  | Tarefas acionáveis, com contexto @                 | `processar-dia`, `concluir-tarefa` |
| `projetos`        | Iniciativas multi-passo                            | `processar-dia`, `processar-semana` |
| `algum-dia`       | Sem prazo definido                                 | `processar-dia`, `processar-semana` |
| `referencia`      | Não acionável, só consulta                         | `processar-dia`                |
| `aguardando`      | Delegado / esperando resposta de alguém            | `processar-dia`, `processar-semana` |
| `agenda`          | Compromissos com hora marcada                      | `marcar-compromisso`           |
| `registros-tempo` | Log de início/fim de atividades                    | `registrar-tempo`              |
| `concluidas`      | Histórico de tarefas finalizadas                   | `concluir-tarefa`              |
| `contextos`       | Lista de @tags válidas (@casa, @ligações, etc.)    | Você edita direto, raramente muda |
| `habitos-definidos` | Lista de hábitos que você quer trackear (estudar, jogar, exercício, ler) | Você edita direto, raramente muda |
| `registros-habitos` | Ocorrências: hábito + data + detalhe opcional (qual jogo, qual livro) | `registrar-habito` |
| `estimativas-calibradas` | Tempo médio/mediano real por tipo de atividade, calculado a partir dos logs | `revisar-estimativas` |

## Como as skills se relacionam (fluxo típico do dia)

```
Você fala/escreve algo solto
        ↓
   [capturar] → inbox
        ↓
(em algum momento do dia)
   [processar-dia] → distribui inbox pras tabelas certas
        ↓
Você trabalha ao longo do dia:
   [registrar-tempo] → mede quanto demora em cada coisa
   [marcar-compromisso] → agenda coisas com hora
   [concluir-tarefa] → risca o que terminou
        ↓
Ao longo do dia/semana, também:
   [registrar-habito] → estudei, joguei X, li Y, fiz exercício...
        ↓
(uma vez por semana)
   [processar-semana] → revisão geral, garante que nada ficou esquecido
   [revisar-estimativas] → te mostra se seu senso de tempo está calibrado
   [programar-semana] → distribui ações/projetos pelos dias, considerando contextos
                          e reservando tempo pra hábitos desequilibrados
                          (proposta — você confirma antes de virar compromisso real)
```

## Decisão sobre onde vive o "banco de dados" — modelo confirmado

**Git/vault como banco perene, com esse padrão de uso:**
- **Leituras ao longo do dia:** direto via API, sem gerar commit — rápido, "grátis"
- **Escritas:** concentradas nos momentos de processamento (`processar-dia`,
  `concluir-tarefa`, `registrar-habito`, etc.), cada uma virando um commit
- **Inbox:** fica fora do Git, num armazenamento leve chave-valor, pra não gerar um
  commit a cada captura solta. Só é consolidado no Git quando `processar-dia` roda.

Esse modelo evita a fricção que preocupava antes (commit a cada captura), mantendo o
Git como fonte única de verdade pra tudo que já foi processado.
