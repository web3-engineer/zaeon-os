# Orquestra: a Zaeon decide quem trabalha (nov/2026)

> Código: `lib/orquestra/` · Entrada no turno: `lib/agent/runChatTurn.ts` (onde antes era só `runTrajectoryTraced`)
> Python: `research-engine/` vira o hospedeiro de motores Python (contrato `/motor/v1`)
> Flag: `ORQUESTRA=off|sombra|on` (padrão `off` = byte a byte o caminho de antes)

## A decisão

A Zaeon deixa de ser **um agente** e passa a ser a **orquestradora**. Antes, todo pedido ia para o
mesmo harness, do "oi" ao TCC de quem paga MAX. Agora o pedido é entendido (o mesmo `classify`
do harness, chamado uma vez), o roteador decide **quem trabalha** (plano × formato da tarefa), e
a saída de qualquer motor passa pelo **mesmo portão de qualidade** e volta **no mesmo formato**
(`StructuredAnswer`). O resto do turno não sabe de onde veio a resposta: TCC, cartolina, memória e cliente.

**O que é da Zaeon, seja quem for o motor:** o contexto do aluno, as ferramentas (as 8 bases acadêmicas
do Scholar, web, memória), o registro de evidência com chave `[E#]`, o verificador, o prazo de relógio
e o ledger por tarefa. **O que é do motor:** a arquitetura do agente (loop, decomposição, raciocínio).

Isso muda uma regra antiga do `docs/PROSPECCAO_AGENTES_AUTONOMOS.md` ("toda em TypeScript, sem
microserviço Python"). A regra servia para **um** agente nosso. Com o objetivo de pôr as arquiteturas
abertas do mercado para trabalhar e comparar, a maioria delas é Python (Tongyi, STORM, PaperQA2,
gpt-researcher). Por isso o `research-engine` vira o hospedeiro delas, falando o contrato `/motor/v1`.

## Os motores

| id | origem | formato | arquitetura |
|---|---|---|---|
| `aura` | zaeon | único | o harness de hoje (classify → plano → coleta → rascunho → crítica) |
| `deepseek-v4-profundo` | DeepSeek | profundo | DeepSeek V4 Pro, ReAct com function-calling nativo e raciocínio mantido entre as chamadas, até 30 passos |
| `tongyi-deepresearch` | Alibaba | profundo | Tongyi DeepResearch 30B-A3B (Apache-2.0, RL para pesquisa longa) via OpenRouter, até 40 passos |
| `kimi-enxame` | Moonshot | enxame | Kimi K2.6 como orquestrador criando subagentes Kimi em paralelo |
| `enxame-misto` | zaeon | enxame | orquestrador (Kimi ou DeepSeek) + subagentes de **laboratórios diferentes** em rodízio |
| `http:<id>` | (env) | (env) | serviço Python que fala `/motor/v1` (research-engine) |

**Por que o runtime de enxame é nosso:** o Agent Swarm do Kimi é um orquestrador **treinado** (PARL) a
decompor tarefas. Quem executa os subagentes, porém, é o runtime do app da Moonshot. Pela API não há
enxame confirmado, e os pesos (~594 GB) não cabem na nossa infra. Então a Zaeon fornece o runtime:
- a ferramenta `delegar`;
- subagentes em paralelo, com **contexto isolado**;
- relatórios compactos de volta para o orquestrador;
- um registro de evidência único, compartilhado por todos.

O Kimi usa isso como foi treinado; qualquer outro modelo usa porque o prompt manda. A arena diz quem faz melhor.

## Quem trabalha em cada pedido

| plano | conversa · dúvida · livro · artefato | explicar conceito | revisar | trabalho · levantamento de fontes |
|---|---|---|---|---|
| free / plus | Aura | Aura | Aura | Aura |
| pro | Aura | Aura | profundo | enxame com até 4 subagentes |
| max | Aura | profundo (se não for quick) | profundo | enxame com até 12 subagentes + verificador global |

- Enxame ganha em tarefa **ampla**, não em pergunta curta. Disparar 300 agentes para "o que é mitose?" é dinheiro queimado e aluno esperando.
- Sem chave de enxame, a tarefa ampla ganha um agente profundo. Sem chave nenhuma, fica com a Aura.
- **Motor longo só roda no worker** (`CHAT_BG=1`). O caminho inline vive sob `maxDuration = 60`, e lá é sempre a Aura.
- **Trabalho da Sala de Pesquisa sem chat único** é gerado no cliente (sentinela research), então também fica com a Aura.
- **Teto por processo:** `ORQ_MAX_SIMULTANEAS`, padrão 2. Um enxame segura um slot do `CHAT_WORKER_CONCURRENCY` (padrão 4) por minutos. Com a orquestra lotada, a Aura responde na hora.
- **Motor que falha** faz a Aura assumir, com aviso no progresso. Se o próprio aluno cancelou, a Aura não é chamada.

## O que este desenho conserta

| Defeito de antes | Aqui |
|---|---|
| `withTimeout` era `Promise.race`: a chamada perdedora seguia rodando e cobrando | `lib/orquestra/prazo.ts`: um AbortSignal desce pela árvore inteira (tarefa → subagente → fetch → espera de retry) |
| Orçamento estimado (`charge()`), sem prazo de relógio | Prazo de relógio por formato, com teto de 12 min (o reaper corta em 15) |
| 429 do Vertex ia direto para outra família de modelo | Retry no **mesmo** modelo, com `Retry-After` e jitter; a rota seguinte é o mesmo modelo por outro provedor |
| `systemContext.slice(0, 4000)` cortava o texto colado pelo aluno | Contexto com orçamento (início e fim preservados) e compactação das observações antigas estilo Tongyi |
| Ledger sem id de turno | Toda chamada grava o `taskId` da tarefa, então dá para somar o custo de um enxame inteiro |
| JSON no prompt, até 6 voltas × 3 ferramentas | Function-calling nativo e dezenas de passos; o freio é prazo e teto de ferramentas |
| Crítico heurístico, sem modelo | Portão de citação determinístico (sempre) + verificador global por modelo (MAX), com uma revisão |

## Os datasets da casa chegam aos motores

As bases do RAG só chegavam à Aura, injetadas no prompt. São elas:
- as áreas: SciELO pt, Wikipédia pt, medicina/enfermagem/farmácia e ENEM;
- a base da turma;
- a base pessoal do aluno.

Agora todo motor de fora recebe a ferramenta **`base_conhecimento`** (`lib/orquestra/datasets.ts`). Ela faz a
**mesma** busca do turno (permissão, corte de similaridade, disjuntor), com as áreas da agente e do mentor,
e cada trecho vira evidência `[E#]`. Sem `RAG_PG_URL`, a ferramenta não existe: o motor não é avisado de
uma base que não está lá. Na arena, sem aluno, só as bases públicas por área respondem.

## Console interno: Zaeon Hermes (app macOS)

Cada tarefa assumida por um motor fica gravada em `OrquestraTarefa` (`lib/orquestra/trilha.ts`):
- a decisão;
- os eventos no tempo;
- as evidências;
- o texto com `[E#]`;
- as métricas.

O custo de cada chamada fica no TokenLedger, ligado por `taskId`. O app **Zaeon Hermes**
(`apps/zaeon-hermes-mac`) lê tudo pelas rotas `/api/admin/orquestra/*`. Ele tem:
- um quadro kanban;
- o dashboard de cada motor;
- a trilha de cada tarefa;
- os datasets;
- a arena;
- o export das trajetórias para um dataset do Hugging Face.

Contrato e autenticação: `docs/HERMES_ZAEON.md`.

## Portão de qualidade (`lib/orquestra/verificador.ts`)

1. **Citação.** Cada achado de ferramenta ganha uma chave `[E#]`, e a observação já chega ao modelo com as chaves (desenho do PaperQA2). Chave que nenhuma ferramenta devolveu é **cortada** do texto e contada em `invalidas`. A cobertura mede quantos parágrafos substantivos têm fonte.
2. **Verificador global** (MiroThinker-H1). Um modelo lê o texto contra as evidências e aponta afirmação sem lastro, citação que não sustenta a frase e pedido não atendido. Se reprovar e houver tempo, roda **uma** revisão, e o passo 1 roda de novo. Se o verificador estiver fora do ar, o texto que já passou pela citação é entregue.

## Sem conta nova: tudo pelo Hugging Face

O `HF_TOKEN` que a reserva do chat já usa serve também à orquestra, pelo router do Hugging Face (OpenAI-compatível).
Conferido ao vivo na API do Hub, em nov/2026:

| Modelo | Disponível no HF | Provedores |
|---|---|---|
| DeepSeek V4 Pro e Flash | sim | DeepInfra, Novita, Featherless |
| Kimi K2.6 | sim | DeepInfra, Novita, Featherless |
| Qwen 3.5 397B | sim | 5 provedores |
| Tongyi DeepResearch | **não** | — |

Com o `HF_TOKEN` funcionam DeepSeek, Qwen, Kimi em enxame e o enxame misto. O Tongyi continua precisando do OpenRouter.

**Não é grátis.** A conta do HF é cobrada pelo uso: os créditos inclusos no plano e, depois deles, pay-as-you-go. A vantagem é não precisar abrir conta em cada laboratório.

**Roteamento automático vs. escolha na Loja.** Com a chave em prod, os agentes escolhidos na Loja já trabalham. O roteamento
automático (Pro/Max sem escolher nada) fica atrás de `ORQ_AUTOMATICO=1` e só deve ser ligado depois da Arena.

## Como ligar (rollout)

1. **Chaves no `.env` da VPS** (o `env_file` chega ao web e ao worker): `DEEPSEEK_API_KEY`, `MOONSHOT_API_KEY`, `OPENROUTER_API_KEY` (Tongyi + reserva) e, opcionalmente, `DASHSCOPE_API_KEY`. Depois, rerun do último `deploy.yml` (regra de prod do `docs/CHAT_DESEMPENHO.md`).
2. **Arena antes de tudo**, para saber quem é bom antes de dar a aluno:
   `docker exec -w /app zaeon_web npx tsx scripts/orquestra/arena.ts` (com `ARENA_AURA=1` para a linha de base).
3. `ORQUESTRA=sombra`: os logs `[orquestra]` mostram o que mudaria, sem mudar nada.
4. `ORQUESTRA=on` com `ORQ_PLANO_MINIMO=max`: só MAX no começo. Acompanhar `[orquestra] concluído` (tempo, custo, citações inventadas, cobertura) e o TokenLedger por `taskId`.
5. `ORQ_SORTEIO=1`: sorteia o motor entre os disponíveis do formato. É o A/B do mercado com alunos reais; o 👍/👎 do chat diz quem ganhou.

## Custo: cuidado

Sistemas multiagente gastam várias vezes os tokens de um chat. A Anthropic relatou cerca de 15× no
sistema de pesquisa dela, em 2025; número de memória, a ser conferido. Os tetos que seguram isso:
`ORQ_SUBAGENTES_*`, `ORQ_MAX_FERRAMENTAS` (80 por tarefa), os passos por motor e os prazos.

**Antes de ligar para alunos pagantes:** medir o custo real por tarefa na arena e comparar com o preço
do plano (MAX R$250). Os preços de `lib/ai/preco.ts` para os modelos novos são **provisórios** (Kimi e
Tongyi vêm de listagens de terceiros; o DeepSeek V4 ficou com o preço do Pro do Google, conservador).

## O que NÃO foi verificado (precisa de chave real)

- Ids de modelo e base URLs vêm de documentação de terceiros de nov/2026. Todos são sobrescrevíveis por env (`ORQ_MODELO_*`, `ORQ_OR_*`, `*_BASE_URL`).
- Se o Tongyi DeepResearch aceita function-calling pelo OpenRouter: ele foi treinado com o formato de ferramenta do Qwen. Se não aceitar, o motor falha e a Aura assume; a arena mostra.
- O formato exato em que o DeepSeek V4 quer o `reasoning_content` de volta no modo pensar com tools: devolvemos dentro da mesma tarefa, como no V3.2.
- Nada foi chamado de verdade: os testes (`lib/orquestra/*.test.ts`) usam fetch e modelo falsos.

## Como adicionar um motor

- **TS:** um objeto `Motor` em `lib/orquestra/motores.ts` e uma linha em `MOTORES_NATIVOS`. Se precisar de modelo novo, uma entrada em `MODELOS` (`lib/orquestra/provedores.ts`).
- **Python:** um arquivo e uma linha de registro no `research-engine` (ver o README de lá), e `ORQ_MOTORES_HTTP=<id>:<formato>:<origem>`.
- **Depois, rodar a arena.**
