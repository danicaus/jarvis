# Processamento Assíncrono (Orientado a Eventos) + Plano de Etapas Atualizado

## Por que isso existe

A Vercel (onde o back está hospedado) limita o tempo de execução de uma função —
5-10s por padrão no plano gratuito, até 60s com configuração. Uma chamada de IA
multi-turno (perguntas do `processar-dia`) pode facilmente ultrapassar isso se
tratada como uma requisição HTTP síncrona comum. A solução: separar "iniciar o
processamento" de "esperar o processamento terminar".

## Arquitetura proposta

### Modelo de dados (reaproveita o que já existe)

A tabela `sessoes_processamento`, já desenhada no `ARQUITETURA-PLUGIN.md`, já era
adequada pra isso — só formalizamos o padrão:

```json
{
  "session_id": "uuid",
  "started_at": "timestamp",
  "status": "iniciando | em_andamento | aguardando_resposta | concluida | erro",
  "items": [
    {
      "inbox_id": "referência ao item original do inbox",
      "status": "pendente | em_pergunta | resolvido | pulado",
      "categoria_gtd": "acao | projeto | algum_dia | referencia | null",
      "dados_resolvidos": { "contexto": "@casa", "prazo": "2026-08-01" }
    }
  ],
  "item_atual": "inbox_id do item sendo perguntado agora",
  "pergunta_atual": "texto da pergunta pendente, se status = aguardando_resposta"
}
```

### Fluxo passo a passo

1. **Front dispara o processamento**
   `POST /api/processar-dia` → back cria a linha em `sessoes_processamento`
   (`status: "iniciando"`), responde imediatamente com o `session_id`, sem esperar
   a IA. Isso evita o timeout de cara.

2. **Processamento roda em segundo plano**
   O back inicia a chamada à IA (Agent SDK) de forma assíncrona, fora do ciclo de
   vida da requisição HTTP original. A cada passo (item resolvido, nova pergunta
   feita), o back atualiza a linha em `sessoes_processamento` no Postgres (Neon).

3. **Front acompanha o progresso**
   Duas opções, com recomendação:

    - **Polling** (mais simples): front pergunta a cada poucos segundos
      `GET /api/processar-dia/:session_id` → back responde o estado atual da sessão.
      Fácil de implementar, funciona bem em serverless, sem conexão persistente.
    - **SSE / Server-Sent Events** (mais elegante): back mantém uma conexão aberta
      enviando atualizações conforme acontecem. Mais "chat" de verdade, mas exige
      que a função fique viva por mais tempo — em ambiente serverless isso é mais
      delicado (a conexão em si já consome o tempo de execução da função).

   **Recomendação:** começar com **polling** (a cada 2-3 segundos). É suficiente
   pro caso de uso (não é um chat em tempo real com múltiplos usuários, é só você),
   e evita a complexidade extra de manter conexão viva numa função serverless.

4. **Você responde uma pergunta**
   `POST /api/processar-dia/:session_id/responder` com a resposta → back atualiza
   o item resolvido na sessão, avança pro próximo item que precisa de pergunta
   (ou finaliza, se acabaram).

5. **Sessão pausa e retoma naturalmente**
   Como o estado inteiro vive no Postgres, fechar o app no meio não perde nada —
   a próxima vez que você abrir a tela de processamento, ela lê a sessão em
   `aguardando_resposta` e continua de onde parou. Isso já era uma exigência
   nossa desde o desenho original; o modelo orientado a eventos só reforça isso.

6. **Finalização e commit no Git**
   Quando todos os itens da sessão estão `resolvido` ou `pulado`, o back distribui
   os dados resolvidos pras tabelas certas e faz o commit consolidado no vault via
   Git — como já estava previsto.

### Endpoints novos (resumo)

| Rota | O que faz |
|---|---|
| `POST /api/processar-dia` | Inicia uma sessão, retorna `session_id` na hora |
| `GET /api/processar-dia/:session_id` | Consulta estado atual (pro polling) |
| `POST /api/processar-dia/:session_id/responder` | Envia resposta a uma pergunta pendente |
| `POST /api/processar-dia/:session_id/finalizar` | Força encerramento (itens não resolvidos viram "pulado") |

---

## Plano de etapas atualizado

**Concluído:**
- ✅ Captura funcionando (local e já com deploy: front + back na Vercel, banco Neon)
- ✅ Editar/deletar item não processado no inbox

**Fase atual — validar a IA em produção:**
1. Teste isolado: uma rota simples que chama a IA (Agent SDK) na Vercel, medir
   tempo de resposta e confirmar que roda sem problema no ambiente deles
2. Implementar o padrão assíncrono descrito acima (sessão + polling), já que
   resolve de vez a preocupação de timeout — não faz sentido testar a IA "pelada"
   e depois ter que redesenhar por causa do timeout

**Próximas fases (ordem confirmada):**
3. `processar-dia` de verdade — skill + painel de chat consumindo o padrão de
   polling acima
4. Tela "Hoje"
5. `concluir-tarefa` (considerando também riscar direto do inbox)
6. Vault / Registros (leitura)
7. `processar-semana` + `programar-semana` (tolerante à ausência de dados de
   hábitos, que ainda não existirão nessa fase)
8. `registrar-tempo`
9. `registrar-habito`
10. `revisar-estimativas`

**Pendências de UI, sem fase fixa (encaixar quando fizer sentido):**
- Campo de "dia de execução" no item do inbox (ainda não processado), fazendo a
  tela "Hoje" também consultar o `inbox`, não só as tabelas processadas
- Tela de Configurações com campo de API key própria (BYOK)