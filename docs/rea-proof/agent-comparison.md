# Comparação de agente com e sem memória — M5

O objetivo continua sendo provar uma análise de APK, guardar apenas sucesso verificável, recuperar esse procedimento em outra sessão e medir sua transferência. A PR inicial qualificou o fluxo estático e a persistência, mas o controle B usou o mesmo algoritmo determinístico nas duas condições. Ele não mede comportamento de LLM.

Esta continuação implementa a comparação com chamadas reais de modelo. **A última tentativa está pendente por ausência de gateway/modelo configurado; nenhum resultado simulado abaixo satisfaz M5.** O CI da entrega anterior passou. Overmind real (M4) também continua exigindo ambiente de teste e credenciais.

## O que será medido

`node scripts/rea/evaluate.mjs --fixture B --compare-agent`

Cada condição começa uma sessão nova, sem histórico da outra e com chave virtual própria, limitada ao mesmo modelo e à metade do orçamento total. Ordem sorteada e congelada antes das chamadas; mesmas perguntas, ferramentas, engine e limites. No piloto são até 8 chamadas de modelo, 8 chamadas estáticas, 2.000 tokens de saída por chamada, 16.000 tokens totais e 10 minutos por condição. O teto monetário é configurado explicitamente; o gateway aplica o budget da virtual key.

- `without_memory`: pergunta e ferramentas estáticas, sem procedimento.
- `with_verified_procedure`: mesma tarefa mais o procedimento/limites de uma lição canônica de A. O store reconfirma dono, projeto, evidências, revisão e engine antes do uso e ao longo da tentativa, inclusive após a resposta final.

O modelo decide quais ferramentas consultar e deve devolver os sete fatos com `evidenceId` por fato. Não recebe os fatos de A, gabarito de B, arquivos do repositório, shell, tokens ou handles. Só quatro ferramentas tipadas do APK desta sessão entram na allowlist: pacote, busca de classes, classe e método. Todas passam pelo runner/guard existente em modo `review`; argumentos extras e chamadas a ferramentas de escrita são recusados.

A Evidence integral é guardada antes da resposta resumida ao modelo. Depois das duas sessões, o executor privado carrega o oracle B selado, relê os blobs e verifica separadamente: objetivo estático, resposta do modelo e fonte correta de cada fato. A validação segue os IDs citados: repetir uma leitura ou explorar depois outro método não invalida evidência anterior correta. Uma resposta correta sem fontes válidas, um literal copiado, blobs adulterados ou permissão divergente não passam. O modelo não escreve recibos ou verdicts.

O relatório inclui task pass/fail, calls, tokens, duração, modelo/deployment reportados e custo informado pelo proxy. Custo ausente ou resposta perdida vira `null`, nunca zero inventado. O header de custo é o [reportado pelo LiteLLM](https://docs.litellm.ai/docs/proxy/cost_tracking); não é uma nova estimativa de preço. Mudança de modelo/deployment ou falha de infraestrutura torna o par inconclusivo. Exceder o orçamento é falha da tarefa dentro do mesmo limite, não sucesso recuperado por outra chave.

## Protocolo, persistência e limites

O protocolo recebe hash e é congelado antes da primeira chamada. Cada experimento usa diretório novo e mantém protocolo, tentativas, transcript/trace, Evidence e recibos duráveis. Um `--experiment-id` existente é recusado para impedir reinício implícito de trabalho pago após falha. O journal incremental preserva referências, custo conhecido, chamadas com custo desconhecido e o resultado de revogação de cada condição, inclusive se abrir a chave seguinte ou persistir a comparação falhar. As virtual keys são revogadas ao encerrar cada condição; falha de limpeza fica explícita.

Um resultado comparável é referenciado na outbox canônica pela lição/revisão e `agent-eval:<experimentId>`. Isso não promove B, não muda pesos, não aumenta confiança da lição A e não exporta holdout para otimização. Um par sintético não sustenta generalização estatística nem garante ganho: delta zero ou piora também são resultados válidos a registrar.

Os testes usam drivers declarados `test_double`, e os relatórios são `mock_agent_trial/comparison`. O caminho CLI aceita apenas o driver real do gateway. O controle determinístico anterior continua disponível com `--compare-memory`, com sua classificação original.

## Configuração necessária para fechar o objetivo

O arquivo [evaluation.env.example](../../scripts/rea/evaluation.env.example) separa os dois ambientes:

1. **M5:** `REA_AGENT_EVAL=1`, `GATEWAY_URL`, `GATEWAY_MASTER_KEY`, `REA_AGENT_EVAL_MODEL`, `REA_AGENT_EVAL_MAX_USD`, Mongo/vault e motor local de teste.
2. **M4:** `REA_OVERMIND_EVAL=1`, endpoint/chave/projeto Overmind, conjunto determinístico de avaliação aprovado, Python pinado e limite de itens.

Carregar credenciais pelo ambiente privado/cofre, sem colocá-las no chat, em argumentos CLI, prompts ou Git. Com configuração ausente, a tentativa retorna `pending`, exit 2 e zero chamadas de modelo. Isso é uma pendência explícita, não qualificação concluída.
