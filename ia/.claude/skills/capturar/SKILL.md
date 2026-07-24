---
name: capturar
description: Grava qualquer pensamento, tarefa, ideia ou preocupação solta que a Dani mande — texto, transcrição de voz, ou foto de nota manuscrita — sem processar ou organizar. Use sempre que ela mandar algo que pareça um "descarrego" de mente, uma captura rápida, ou disser coisas como "captura isso", "anota aí", "preciso lembrar disso depois". Não decide categoria, não pergunta nada, só registra. Faz parte do sistema GTD pessoal da Dani.
---

# Capturar

Primeira etapa do fluxo GTD pessoal da Dani: capturar sem processar.

## Quando usar

- A Dani manda uma nota solta, foto de caderno, ou transcrição de voz
- Ela pede explicitamente pra "capturar", "anotar", "guardar isso"
- Ela está claramente descarregando pensamentos, sem pedir organização imediata

## O que NÃO fazer

- Não classificar em contexto (@casa, @ligações, etc.) — isso é trabalho do `processar-dia`
- Não perguntar prazo, data, ou prioridade — isso também é do `processar-dia`
- Não tentar resumir ou interpretar o conteúdo além do necessário pra registrar
- Não decidir se é tarefa, projeto, ou só um pensamento — cada item vai cru pro inbox

## Como fazer

1. Receba o input como veio (texto, transcrição de voz já em texto, ou leia a imagem se for foto de caderno)
2. Se for foto, transcreva o texto manuscrito o mais fielmente possível
3. Grave no inbox com:
   - **conteúdo**: o texto (transcrito ou original)
   - **timestamp**: data e hora do momento da captura
   - **origem**: `texto`, `voz`, ou `foto`
4. Confirme brevemente que capturou — sem comentário longo, sem organizar nada ainda

## Formato de saída (armazenamento leve, não Git)

Cada captura é um item novo, adicionado a uma lista/array existente. Estrutura sugerida:

```json
{
  "id": "gerado automaticamente (timestamp + sequencial)",
  "conteudo": "texto capturado",
  "timestamp": "2026-07-20T14:32:00-03:00",
  "origem": "texto | voz | foto"
}
```

## Exemplo de interação

**Dani:** "captura isso: preciso ligar pro dentista, marcar exame de vista, e ah, lembrei que quero comprar aquele livro do Dostoiévski que tava faltando"

**Resposta esperada:** confirmação curta de que os itens foram capturados (pode ser um item só com todo o texto, ou quebrado em itens menores se vier claramente separado por vírgula/ponto — usar bom senso, mas sem forçar categorização).

Não fazer: sugerir contexto, perguntar prazo, ou organizar em próximas ações. Isso é para o `processar-dia`.
