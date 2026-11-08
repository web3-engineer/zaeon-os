# Os agentes do chat — como funciona hoje, e quem tem o quê

Escrito em 2026-11-07, a pedido do dono: *"precisamos de agentes que tenham todas as capacidades de
harness em um mesmo nível — mas com habilidades diferentes. pra isso, vamos estruturar como funciona
hoje nosso chat e quais agentes tem quais capacidades."*

Tudo aqui foi **medido no código**, não suposto. Onde eu digo "nunca aconteceu", eu procurei o
chamador e não achei — e deixei dito onde procurei, pra quem vier depois poder me desmentir.

---

## 1 · O caminho de uma mensagem

```
seletor da sidebar (app/research-lab/page.tsx)
      └─ localStorage "zaeon.lab.agente"  ← o contrato entre telas (lib/research/zaeonEventos)
            └─ lib/agents/agenteEscolhido.ts        agenteDoChatSalvo()
                  └─ components/study/StudyCoworkChat.tsx     pedirAura({ agente })
                        └─ lib/chat/auraClient.ts            body: { agent, stream: true }
                              └─ app/api/ai/chat/route.ts    agentKey + ehAgenteDeConversa
                                    ├─ agente de conversa → HARNESS  (lib/agent/runChatTurn)
                                    └─ o resto           → motor legado (Vertex direto, na própria rota)
```

**O que estava quebrado.** Eram dois defeitos em série, e consertar só o primeiro teria piorado:

1. `lib/chat/auraClient.ts` montava o corpo com `agent: "aura"` **literal**. A escolha do seletor
   vivia no localStorage e era lida só pro **rosto** (o avatar do painel, `personaSalva()`). Nunca
   chegava ao servidor, que caía em `DEFAULT_AGENT_ID`. O seletor trocava a cara, não a conversa.
2. O harness estava gateado em `agentKey === "aura"` em **três** pontos da rota (anexo, anexo-no-
   harness, turno). Mandar `agent: "zenita"` e mais nada não consertaria nada: **desligaria** o
   harness e devolveria um turno sem laço, sem tools, sem base RAG, sem memória, sem anexo, sem a
   rede da F0 e sem a regra de tabela. Trocaria agente mudo por agente burro.

Hoje: o seletor viaja, e **todas as agentes de conversa entram pelo mesmo harness**. A diferença
entre elas é o portão de habilidade, não um desvio pro motor velho.

---

## 2 · Quem é agente de conversa, e quem não é

| `agent` | o que é | caminho |
|---|---|---|
| `aura`, `zenita`, `nina` | agentes de conversa (`tela: "chat"`) | **harness** |
| `octa` | Octa Code — tela de IDE (`tela: "ide"`) | o chat o mapeia pra Aura; as tools dele são da IDE |
| `zaeon` / `bento` | a anfitriã: convoca agente, abre sala | legado (`summon_agent`, `open_room`) |
| `core_active` (Davi) | **a agenda** — Sala de Aulas | legado (`update_schedule`, `lessons`) |
| `caio`, `teo` | personas de outras telas | legado |
| `scholar`, `examiner`, `abnt_structurer` | personas de serviço (chamadas por código, não pelo aluno) | caminho próprio |

Os **13 mentores** (`lib/agent/mentors.ts MENTOR_SEED`) são outra coisa: não são motor novo, são a
agente parametrizada — o `personaText` entra na frente do `systemContext` e a memória ganha
`wing = slug/userId`. Um mentor **acrescenta** habilidade ao turno, nunca tira.

---

## 3 · BASE × HABILIDADE

Esta é a separação que o pedido do dono exige, e ela está em `lib/agents/capacidades.ts`.

### BASE — todas têm, no mesmo nível

O laço do harness (`route · plan · gather · reason · draft · critique · finalize`) e as tools que ele
sempre teve:

`memory_search` · `web_search` · `abrir_url` · `baixar_para_base` · `listar_anexos` · `ler_anexo` ·
`examiner` · `studio_generate` · `research_generate`

Mais o que não é tool e também é de todas: base RAG do turno (turma + pessoal + área), memória,
anexos, a rede de capacidade honesta (F0), a regra de tabela (`lib/agent/tabela.ts`), o cache de
respostas, a prévia em streaming e o ledger.

`abrir_url` e `baixar_para_base` dependem de **configuração do servidor** (Leitor, `RAG_PG_URL`), não
da agente: se o servidor não as tem, ninguém as tem — e isso é igual pra todas, que é o que "mesmo
nível" quer dizer.

### HABILIDADE — o único eixo em que diferem

| habilidade | abre | observação |
|---|---|---|
| `literature` | `literature_search`, `book_search` | busca acadêmica |
| `anatomia` | `buscar_anatomia`, `inspecionar_anatomia` | o atlas BodyParts3D (2.234 malhas, 3.432 conceitos) |
| `molecule` | — | é um `studioKind` (PubChem), não tool: o portão dela mora no catálogo do Studio |
| `code` | — | as onze `octa_*` moram na IDE; o turno do chat nunca as vê |

`memory` e `studio` **ficaram fora** das distintivas: os 13 mentores declaram as duas, então já são
base. Chamá-las de distinção seria fingir diferença onde não há.

### O portão

Era um **rótulo**: `enabledSkills` existia em `MENTOR_SEED` e `toolsDoTurno` **nunca o leu** —
filtrava só por `disponivelNoTurno`. Declarar `anatomia` num mentor mudava a vitrine do Escritório
(`lib/office/mapa.ts`) e **nada** na tool que o modelo recebia.

Agora `ToolContext.toolsDoAgente` é um conjunto de nomes que `permit()` e `toolsDoTurno()` consultam.
Ausente = sem portão, de propósito: o mesmo `ToolContext` serve Octa, canal, MCP e rea-eval. O turno
do chat sempre o manda, então **pro chat é portão de verdade**.

---

## 4 · A matriz

| agente | habilidades | base de área (RAG) | o que a distingue |
|---|---|---|---|
| **Aura** | `literature` | — (só a geral) | pesquisa acadêmica: busca em bases e livros, e redige o trabalho |
| **Zenita** | `anatomia`, `literature` | `medicina` | o atlas de anatomia 3D e a base de saúde |
| **Nina** | — | — | caderno: resumo, plano de estudo, revisão — sem busca externa |
| **Octa** | `code` | — | código, na IDE dele |

A **voz** vem de `lib/agents/voz.ts`: o harness foi escrito "em Aura" (os prompts dizem *"Você é a
Aura"* literalmente), e `transformarSystem` troca isso pelo nome de quem fala. O canal já fazia; o
chat não — por isso a identidade não mudava. O regex é frágil por natureza, então
`lib/agents/voz.test.ts` lê o harness de verdade e **exige** que a marca ainda esteja lá: um
`replace` que não casa falha em silêncio, e a resposta sai assinada por quem não é.

---

## 5 · A Zenita assumiu medicina

Decisão do dono, 2026-11-07: *"ela agora sera a responsavel por medicina e usará o atlas — bem como
o dataset de medicina da hugging face que nos temos"*.

O que ela ganhou: a habilidade `anatomia` (o atlas), a base de área `medicina` (onde entram os
datasets de saúde do HF) e uma persona de medicina com o guardrail que não se negocia — educacional,
**nunca** diagnóstico, prescrição ou terapia, inclusive quando a pessoa insiste.

O que ela **perdeu, e por quê**: a frase `USE A FERRAMENTA 'update_schedule'`. Isso eu medi:

- nenhum chamador do app manda `agent: "zenita"` (procurei em `app/`, `components/`, `lib/`);
- a agenda é do **Davi** (`core_active`), chamado por `components/sub/ClassesView.tsx`;
- `update_schedule` **não existe** no registro de tools do harness — ela é *relayed* como `toolCall`
  pro cliente executar;
- e o ramo em **streaming** do caminho legado só trata `studio_generate` e `research_generate`: um
  `update_schedule` ali era descartado em silêncio.

Ou seja, aquela frase prometia uma ação que **nunca aconteceu uma vez**. Agora que a Zenita entra
pelo harness, mantê-la seria a mentira da F0 assinada por ela. Ela também saiu de `scheduleAgents` na
rota, que era configuração morta pelo mesmo motivo.

### O que NÃO foi feito, e o custo medido

O dono respondeu *"Zenita assume, Osler sai"*. A primeira metade está feita. A segunda — **retirar o
mentor Osler** (`MENTOR_SEED` slug `medicina`) — eu **não** fiz, e não por esquecimento:

- renomear o mentor pra "Zenita" criaria **colisão de `@menção` no canal**: `@Zenita` passaria a
  resolver dois agentes (a agente de chat `zenita` e o mentor `medicina` chamado Zenita), e
  `lib/canal/mention.ts` resolve por nome **ou** por key;
- Osler está em **~15 arquivos** fora dos mentores: carrossel público
  (`components/main/MentoresCarrossel.tsx`), avatar (`lib/avatars/looks.ts`, com descrição visual
  própria), personagem do cyberespaço (`lib/cyber/vidaPersonagem`), o Escritório
  (`lib/office/mapa`), e **~40 asserções** de teste do canal que o chamam por `@Osler`.

Isso é uma decisão de produto com um custo que agora está visível — não um detalhe de implementação
pra eu resolver de passagem. O chat já entrega o que foi pedido: **quem responde por medicina no chat
é a Zenita**.

---

## 6 · Os datasets de medicina na VPS

A pergunta do dono (*"verifique se tem na vps os datasets"*) não era respondível, e isso é o achado:

- os datasets de saúde (`rhaymison/medicine-medical_meadow_wikidoc_pt`,
  `rhaymison/medicine-information-pt`, Apache-2.0) entram pelo
  `scripts/ingerir-bases-area.ts --fontes medicina`, que é **manual** (`docker exec`) e **nunca
  entrou no deploy**;
- `/api/health` mostra `contabo.rag: on|off|degraded` e **nenhuma contagem** (hoje: `on`);
- `/api/admin/rag?turmaId=` responderia, mas pede **sessão de admin**;
- `RAG_PG_URL` vive na **tailnet** — nenhuma sessão fora da VPS alcança.

Então criei `scripts/bases-area-placar.ts`. Um comando, só leitura, e a pergunta passa a ter resposta:

```
docker exec -w /app zaeon_web npx tsx scripts/bases-area-placar.ts --area medicina
```

Ele mostra documentos, trechos, quantos já têm vetor e **de que fonte** cada documento veio
(`criado_por = "dataset:<fonte>"`). Zero documentos = os datasets não foram ingeridos nesta VPS, e o
cabeçalho do `ingerir-bases-area.ts` tem os comandos pra encher.

---

## 7 · O protocolo de raciocínio por cargo

Pedido do dono, 2026-11-07: *"reflections e ensemble devem ser justamente o diferencial que temos
que criar para definir os cargos para cada agente — e seu novo modelo de raciocinio que deve ser
debruçado totalmente em sua especialidade."*

### Por que eles estavam mortos (é estrutural, não esquecimento)

`reflections` e `ensemble` nasceram em `INTENTS` (`lib/agent/contracts.ts`), copiados do
**AI-Scientist**, e nunca foram lidos. Medi o motivo: no AI-Scientist o revisor é um **modelo**, e
faz sentido amostrá-lo N vezes e agregar. O **nosso crítico é CÓDIGO** — `lib/agent/examiner.ts` não
tem uma única chamada de modelo, e o cabeçalho do harness diz que *"plan/reason/draft são as ÚNICAS
chamadas de geração"*. Um ensemble de função pura devolve **N vereditos idênticos**. Eles estavam no
único lugar onde não podiam funcionar.

Como o AI-Scientist faz, de verdade (li `ai_scientist/perform_review.py`):

- **ensemble**: N amostras paralelas do mesmo prompt, temperatura **fixa em 0.75**, sem
  embaralhamento → um meta-review de LLM com persona de *Area Chair* funde a prosa → os 9 campos
  numéricos são **sobrescritos pela média arredondada**;
- **reflections**: `for j in range(num_reflections - 1)` (ou seja, `N` dá `N-1` rodadas) sobre o
  veredito **já agregado**, com saída antecipada pela substring `"I am done"`;
- ordem: **ensemble primeiro, reflexão depois**.
- Licença: **"AI Scientist Source Code License"**, derivada da RAIL, com cláusula de divulgação
  obrigatória. **Não é permissiva** — a ideia serve, o código não.

### O que eles são aqui

Saíram da **tarefa** e vieram pro **cargo** (`lib/agents/capacidades.ts` → `Protocolo`), e cada um
foi pro lugar onde tem efeito:

| campo | onde age | o que faz |
|---|---|---|
| `ensemble` | fase `draft` | N rascunhos independentes, à mesma temperatura (0.6), e **o crítico determinístico escolhe** o de maior score |
| `reflexoes` | `maxRevisions` do laço que já existe | quantas voltas de revisão contra a própria crítica, acima do que a intenção já pede |

O crítico ser código deixa de ser limitação e passa a ser **a peça que faz isso funcionar**: é um
juiz grátis, consistente e sem variância própria para confundir com a das amostras. E `reflexoes`
**não cria laço novo** — usar o `maxRevisions` do `trajectory.ts` em vez de importar o laço interno
do AI-Scientist evita duplicar reflexão, que é o defeito de adotar um desenho sem olhar o que a casa
já tem.

Contagem **explícita**: aqui `0` é zero. No AI-Scientist `num_reflections=1` significa *nenhuma*, o
que é uma armadilha.

### Os tetos, e por que eles moram no `trajectory.ts`

| modo | orçamento | base estimada | `ensemble` | `reflexoes` |
|---|---|---|---|---|
| `quick` | 3.000 | ~2.300 (1 tiro) | 1 | 0 |
| `elaborated` | 12.000 | ~7.700 | 3 | 1 |
| `research` | 40.000 | ~8.900 | 5 | 2 |

Derivados do `BUDGET` e do `COST` — rascunho 1.800, volta de revisão 4.800 — e por isso moram **ao
lado deles**, não em `capacidades.ts`. Teto longe do orçamento que o justifica é número que o ledger
desfaz, que é a mentira que o comentário da F6 recusou escrever. `capacidades.ts` guarda só o
**pedido** do cargo; `ensembleDoTurno` e `maxRevisionsDoTurno` cortam.

A intenção é **piso** de `maxRevisions`: um cargo pode subir, nunca tornar uma tarefa menos
exigente do que ela é.

### A matriz de protocolos

| cargo | `ensemble` | `reflexoes` | por quê |
|---|---|---|---|
| **Aura** | 1 | 2 | pesquisa se corrige relendo, não reamostrando: o risco dela é afirmação sem lastro, e isso a crítica pega. Reamostrar o mesmo prompt não acha fonte que falta |
| **Zenita** | 3 | 0 | **Medprompt**: em fato clínico, uma amostra só é arriscada. Zero revisão é decisão: ela gasta em **largura**, a Aura em **profundidade** — reler o mesmo rascunho não reduz variância |
| **Nina** | 1 | 0 | o valor dela é clareza didática, não variância nem fonte |
| **Octa** | 1 | 0 | não passa pelo turno do chat |

### Dois trade-offs que o dono precisa saber

1. **Sem prévia ao vivo quando `ensemble > 1`.** Não se transmite um rascunho que pode ser
   descartado: o aluno leria um texto médico e veria **outro** no lugar. Pior que esperar. Então a
   Zenita perde a datilografia ao vivo nos turnos `elaborated`/`research`. É uma linha para reverter,
   se você preferir o inverso.
2. **Custo.** `ensemble: 3` são **três** chamadas de rascunho por turno da Zenita — 3× tokens e 3×
   pressão de rate-limit, medidos pelo ledger. `reflexoes: 2` na Aura acrescenta até duas voltas de
   `reason+draft+critique` (4.800 cada) nos modos que cabem.

---

## 8 · `specific_knowledge` — o portão de conhecimento específico

Pedido do dono: um agente de um tema responde, ou tenta responder, **apenas** sobre aquele tema.

`lib/agents/escopo.ts` roda a cada pergunta e devolve um de três:

| veredito | quando | o que a agente faz |
|---|---|---|
| `passa` | é do campo dela | assume a resposta e segue o raciocínio normal (**nenhuma diretiva é injetada** — caminho byte a byte o de antes) |
| `neutro` | ninguém aqui é dono do tema | procura, **dentro do contexto dado**, um fio que toque o campo dela, cita esse fio em uma frase — e **não** continua o assunto |
| `nega` | é claramente de outra área | diz isso e **aponta quem ajuda**, pelo nome, do nosso registro |

O exemplo do dono: a Zenita, perguntada sobre **GTA VI**, não comenta o jogo; pode observar que os
GTA modelam ferimento e acidente físico com certo realismo — uma deixa para o tema dela, dentro do
contexto, sem querer levar a conversa para lá. Perguntada sobre rede neural, é `nega`: existe quem
responda, e ela diz quem.

### Como o veredito é decidido — sem chamada de modelo

O portão roda em **todo** turno. Uma chamada extra aqui seria latência antes da primeira palavra em
100% das perguntas — o mesmo custo que fez o `pensar` da fase `acao` virar `minimal`. Então ele usa,
em ordem:

1. **O dado da própria agente.** Para quem tem `anatomia`, a pergunta é testada palavra por palavra
   contra os **3.432 conceitos do atlas**. Alcance honesto: é o que pega o aluno que digita o nome em
   latim ou inglês (`hippocampus`, `femur`) — `termoDeBusca` não tokeniza, por isso a pergunta vai
   fatiada e não inteira.
2. **O vocabulário do campo** (`CapacidadeDoAgente.termosProprios`). Existe porque as listas de
   `lib/rag/areas` foram escritas para classificar **título + resumo de artigo da SciELO**
   (`paciente`, `mortalidade`, `neoplasia`) e quase nunca batem numa pergunta de aluno: *"me explica
   o ciclo de Krebs"* não casa com nenhum termo de medicina. Sem esta lista a Zenita **recusaria o
   próprio campo** — a falha mais grave que o portão pode ter. Provei: desligando-a, **17 de 18**
   perguntas de medicina do corpus caem em `neutro`.
3. **A área alheia** (`areaDaPergunta`, os mesmos termos com limiar de pergunta, exigindo 2× a
   segunda colocada) → `nega` + encaminhamento.
4. **Nada se destaca** → `neutro`.

**Generalista nunca é gateada.** Agente sem área (Aura, Nina) passa sempre: fechar o escopo de quem
é generalista não dá personalidade, dá uma agente que recusa o próprio trabalho.

### As duas diretivas novas

`passa` injeta **nada** — por isso as diretivas novas são exatamente duas:
`DIRETRIZ_FORA_DO_ESCOPO` (recusa com encaminhamento) e `DIRETRIZ_ESCOPO_NEUTRO` (o contorno de
contexto). Entram no `sys` do rascunho **depois** da regra de tabela e **antes** das regras de campo
obrigatório: as duas desligam `desenvolvimento`, `conceitos` e `proximos_passos`, que as linhas
seguintes pedem, e o último a falar ganha.

Ambas proíbem responder a pergunta **depois** do aviso — uma resposta dada após o aviso anula o
aviso, e é o defeito que a regra existe para impedir. A neutra proíbe **desenvolver** o fio: ele é
uma deixa, não um gancho para puxar a conversa; se virar parágrafo, a agente trocou de assunto no
lugar da pessoa.

### Fora do escopo não se coleta

Quando o veredito não é `passa`, `plan()` devolve **zero** passos. Buscar na web sobre GTA VI para
depois dizer "não é meu assunto" gasta volta, orçamento e tempo — e é pior: a evidência colhida fica
no contexto do rascunho, e um modelo com evidência na mão **responde** a pergunta que a diretiva
mandou não responder.

### O limite honesto

As listas de área são de vocabulário acadêmico, então muitas perguntas óbvias (*"o que é
fotossíntese"*, *"me explica a integral"*) **não classificam** e caem em `neutro` em vez de `nega`.
O escopo continua fechado — `neutro` também recusa continuar —, mas o **encaminhamento pelo nome**
só sai quando a área alheia dá sinal claro. É conservador de propósito: apontar o colega errado é
pior que não apontar.
