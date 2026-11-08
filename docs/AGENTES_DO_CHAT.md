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

---

## 9 · O esquadrão das exatas e o DATASET

Decisão do dono (2026-11-08): *"zaeon tem que ser o agente especialista em dados e IA. software,
téo continua. infra, precisamos de um novo agente chamado janaina. e segurança, o octa-code."*

### 9.1 · Os quatro, e o endereço de cada um

| mentor | slug / área | curso (existe em `ALL_COURSES`) | corpus já baixado | licença |
|---|---|---|---|---|
| **Téo** | `software` | Engenharia de Software | MDN Web Docs — **10.654** páginas | CC BY-SA 2.5 |
| **Janaina** | `infra` | Redes de Computadores | documentação do Kubernetes — **1.113** páginas | CC BY 4.0 |
| **Octa** | `seguranca` | Segurança da Informação / Cibersegurança | CWE **956** + MITRE ATT&CK **706** | MITRE, comercial liberado |
| **Zaeon** | `dados-ia` | Ciência de Dados | arXiv cs.LG aberto + estatística do REA-MECC | aberta / CC BY-SA 3.0 |

Os quatro entram em `MENTOR_SEED` (order 14–17), com look em `lib/avatars/looks.ts`, pod no
escritório e área em `lib/rag/areas.ts`. `direito` **não** entrou: a Constituição está baixada (412
artigos em vigor, CC0 e art. 8º IV da Lei 9.610/98), mas o agente de leis é decisão adiada — e a
área espera o mentor, nunca o contrário. Ver 9.3.

### 9.2 · Por que área e mentor são UMA mudança

Tentei criar as cinco áreas sozinhas primeiro. Dois testes recusaram, e os dois estavam certos:

1. **`lib/rag/areas.test.ts`** exige um-para-um entre `SLUGS_AREA` e `MENTOR_SEED`. Sem o mentor,
   `idArea("seguranca")` produz um `turmaId` que `areasDoTurno` nunca pede — o documento é ingerido,
   contabilizado no placar, e **nenhum agente o alcança**. Já perdemos uma carga assim.
2. **`lib/agents/escopo.test.ts`** pegou o estrago pior, que eu não tinha previsto: **a área órfã
   rouba a classificação de uma área que tem dono.** Com `dados-ia` existindo sem ninguém, a pergunta
   *"como funciona uma rede neural artificial?"* deixou de cair em `eng-computacao` (que tem o
   Turing) e passou a cair numa área sem responsável. `responsavelDaArea` devolveu `null`, e o
   veredicto desabou de `nega` para `neutro`: a Zenita, em vez de encaminhar, passou a **torcer a
   pergunta de rede neural pro lado da medicina**. Uma área vazia é pior que área nenhuma.

### 9.3 · O termo tem um dono só

`areaDaPergunta` devolve `null` no empate (exige 2× a segunda colocada). Então **termo repetido em
duas áreas desliga o portão**. A entrada do esquadrão me fez criar quatro duplicatas, e a varredura
achou mais uma colisão por substring. Todas corrigidas:

- `rede neural`, `aprendizado de maquina`, `ciencia de dados`, `inteligencia artificial`,
  `mineracao de dados` — saíram de `eng-computacao` e ficaram com `dados-ia`. Quando chega um
  especialista, o termo muda de dono; o Turing fica com algoritmo, computabilidade e linguagem.
- `software` cru saiu de `eng-computacao` para `software`.
- `probabilidade` é da `matematica` (Noether); `dados-ia` fica com a inferência.
- `paradigma de programacao` continha `programacao` (do Turing) — trocado.
- `disponibilidade` (infra) estava **dentro** de `biodisponibilidade` (farmácia): um artigo de
  farmacologia pontuava para infra. Agora é `alta disponibilidade`, que é o termo do ofício.

A única colisão restante é anterior a esta mudança: `molecula` (química) ⊂ `molecular` (biologia).

### 9.4 · O DATASET: como ele sai deste container

O corpus são 66 MB de JSONL e PDF — grandes demais pro git. Então o repositório guarda o **caminho**,
e a VPS refaz o dado. Mesmo padrão da geometria do atlas: caro no deploy, barato no turno.

```bash
# 1. montar (origens fixadas por commit; só precisa de rede)
node scripts/dataset-montar.mjs --saida /opt/zaeon/dataset

# 2. ingerir (dentro do contêiner, pelo mesmo caminho dos PDFs do aluno)
docker exec -w /app zaeon_web npx tsx scripts/ingerir-bases-area.ts \
  --fontes dataset --dir /opt/zaeon/dataset --seco     # confere primeiro
docker exec -w /app zaeon_web npx tsx scripts/ingerir-bases-area.ts \
  --fontes dataset --dir /opt/zaeon/dataset            # grava
```

O que conferir no fim do passo 1 (é o que eu medi em 2026-11-08):

```
constituicao 412 · infra 1113 · seguranca 1662 (cwe 956 + attack 706) · software 10654 · 14 PDFs
```

Duas armadilhas que a execução de prova pegou, e que o script agora trava:

- **`git fetch --depth 1 origin <sha>` só aceita o hash COMPLETO de 40.** Com o abreviado o git
  responde `couldn't find remote ref`, que parece erro de rede e não é. Os pins são de 40, e uma
  trava recusa pin curto nomeando a fonte.
- **`createWriteStream` + `process.exit(0)` descartava tudo.** O script dizia "412 documentos" e o
  diretório ficava vazio. Escrita síncrona em lotes.
- **`PDF_LOADER_URL` ausente** faz `extractPdfStructured` devolver `null` em silêncio: os 14 PDFs
  entrariam todos como `erro: leitura_falhou`. O script para antes, dizendo o que falta.
- **Área inexistente é FALHA, não aviso** — e a falha vem depois do placar, pro operador ver o que
  entrou antes de ler o que ficou de fora.

### 9.5 · O que isto NÃO faz

Os quatro são **mentores** (Escritório + rota de mentor do turno), não agentes do seletor do chat.
`areasDoTurno(cap.area ?? mentor?.slug)` em `lib/agent/runChatTurn.ts:149` é o que faz a base chegar:
pela área da agente **ou** pelo slug do mentor ativo. Colocá-los no seletor de `AGENTES_CHAT` é uma
decisão separada, com persona, voz e vitrine próprias — como foi feito com o Eiffel.

---

## 10 · Hugging Face: o que dá pra usar, medido

Tudo nesta seção foi medido neste contêiner em 2026-11-08, anonimamente (**sem token** — o dono não
forneceu um, e não é necessário para nada abaixo).

### 10.1 · O que a rede permite

| caminho | resultado |
|---|---|
| `huggingface.co/api/datasets/...` | **200** — metadados e licença de qualquer dataset público |
| `.../resolve/main/<arquivo>` (pequeno) | **307 → `/api/resolve-cache/`**, fica no mesmo host, baixa |
| `.../resolve/main/<parquet grande>` | **302 → `us.aws.cdn.hf.co`**, alcançável, aceita **range** |
| `cdn-lfs.huggingface.co` | **bloqueado** pela política de rede (CDN antigo; não é mais usado) |
| `datasets-server.../info`, `/splits`, `/first-rows` | **200** |
| `datasets-server.../rows` | **funciona, mas 100 linhas por chamada e o nginx do HF devolve 502 depois de ~23 chamadas anônimas** (medido: 3/3 ok, depois 20/20 falhas) |

Conclusão operacional: **a API de linhas não serve para carga em massa; os parquets servem.** Ler por
faixa com `hyparquet` (JS puro, sem dependência nativa) dá acesso a um shard de 406 MB lendo só os
pedaços necessários — 3 linhas em 1,9 s, sem baixar o arquivo e sem arquivo temporário.

### 10.2 · A fonte `wikipt` — Wikipédia em português

`wikimedia/wikipedia`, config `20231101.pt`, 6 shards, licença **`cc-by-sa-3.0` + `gfdl`** (lida no
`cardData` da API, não de memória). É um **instantâneo datado**, não a Wikipédia de hoje: isso o
torna reproduzível, e a data entra na chave e no crédito do texto.

> **Atenção à licença:** a fonte `wiki` (API ao vivo) cita **CC BY-SA 4.0**, que é o regime atual. O
> instantâneo de 2023 é do regime **3.0**. Citar 4.0 nele seria errado, e `lib/rag/wikipedia.test.ts`
> trava isso.

A decisão de cada verbete é pura e fica em `lib/rag/wikipedia.ts` (7 testes); o script só faz I/O.
Filtros: mínimo **1.200 chars** (esboço não ensina, e ocupa vaga no teto por área), fora páginas de
**desambiguação**, e a área sai do nosso `classificarArea` (limiar de 5 pontos).

**Medição real, shard 0 de 6 — 185.375 verbetes:**

```
aceitos 8.108 · descartes: curto=99.909 sem_area=73.214 area_cheia=2.156 desambiguacao=1.988
```

| área | docs | área | docs | área | docs |
|---|---|---|---|---|---|
| biologia | 1.500 (teto) | agronomia | 834 | eng-energias | 741 |
| medicina | 1.362 | quimica | 659 | matematica | 619 |
| eng-computacao | 460 | eng-civil | 330 | psicologia | 295 |
| veterinaria | 253 | software | 237 | fisica | 221 |
| seguranca | 154 | farmacia | 151 | dados-ia | 143 |
| infra | 116 | enfermagem | 33 | | |

**As 17 áreas recebem conteúdo** — inclusive veterinária, enfermagem e farmácia, que eram justamente
as três sem corpus aberto em lugar nenhum. Com os 6 shards isso vira ~48 mil documentos em PT-BR.
Só `biologia` encheu o teto; as escassas recolhem o corpus inteiro.

A carga é **por fluxo**, e isso é escolha, não descuido: guardar o melhor por pontos exigiria segurar
`--por-area` × 17 × 20 KB na memória (meio giga). Então cada verbete é ingerido na hora e a área para
quando enche; a qualidade vem do limiar do classificador e do mínimo de caracteres, não de ranquear.

```bash
docker exec -w /app zaeon_web npx tsx scripts/ingerir-bases-area.ts --fontes wikipt --seco
docker exec -w /app zaeon_web npx tsx scripts/ingerir-bases-area.ts --fontes wikipt --wiki-shards 6
```

### 10.3 · A fonte `mmlu` — MMLU em português

`FreedomIntelligence/MMLU_Portuguese`, licença **MIT** (lida do `cardData`). É o MMLU (Hendrycks et
al., 2021) traduzido: **57 matérias**, splits `dev` e `test`, em CSV. São 114 arquivos pequenos
baixados por `resolve` — nada de parquet, nada da API de linhas.

O parser de CSV é escrito à mão em `lib/rag/mmlu.ts` porque o enunciado do MMLU tem vírgula, aspas e
**quebra de linha dentro do campo** (equação em várias linhas): `split(",")` perderia questão.
Conferido contra o módulo `csv` do Python em 3 arquivos reais, incluindo um de 1,8 MB:

```
college_physics          meu= 102  python= 102  ✓   professional_law  meu=1534  python=1534  ✓
high_school_mathematics  meu= 270  python= 270  ✓   → 3/3 idênticos, 100% das linhas viraram questão
```

**20 questões por documento**, não uma: o RAG devolve DOCUMENTO, e mil documentos de 300 caracteres
entopem a busca e fazem a citação ao aluno virar "uma questão" sem contexto de matéria. É o mesmo
desenho da fonte `medicina`. O gabarito sai **escrito** (`Gabarito: C) 600 nm`) e não só como letra,
porque o trecho recuperado pode cortar as alternativas.

**Execução real, 2026-11-08 — 114 CSVs, nenhum erro de rede, nenhuma linha torta:**

```
743 documentos · geral 406 · medicina 87 · matematica 65 · psicologia 59 · fisica 34
biologia 24 · seguranca 19 · quimica 17 · dados-ia 12 · eng-computacao 12 · eng-energias 8
```

O maior ganho é **`geral` com 406 documentos**, e isso importa mais do que parece: `areasDoTurno`
sempre devolve `area:geral` junto da área do agente, então essa base é consultada por **todos** — e
ela estava VAZIA na VPS.

O mapa matéria→área é explícito e conservador: matéria que não é claramente de uma das nossas áreas
vai pra `geral`, nunca forçada. As três de direito (`international_law`, `jurisprudence`,
`professional_law` — 1.778 questões) ficam em `geral` porque a área `direito` ainda não tem mentor;
quando ele existir, é trocar `null` por `"direito"` no mapa e reingerir. `lib/rag/mmlu.test.ts` trava
as 57 matérias contra a listagem real da API, então matéria nova ou renomeada no dataset acusa.

```bash
docker exec -w /app zaeon_web npx tsx scripts/ingerir-bases-area.ts --fontes mmlu --seco
docker exec -w /app zaeon_web npx tsx scripts/ingerir-bases-area.ts --fontes mmlu
```

### 10.4 · O que mais existe no HF, com licença conferida

Verificado via `cardData.license` na API, não de memória:

| dataset | licença | serve para |
|---|---|---|
| `wikimedia/wikipedia` (`20231101.pt`) | cc-by-sa-3.0 + gfdl | **em produção** — as 17 áreas, em PT |
| `FreedomIntelligence/MMLU_Portuguese` | mit | **em produção** — 743 docs, fonte `mmlu` (ver 10.3) |
| `liaad/math_dataset_portuguese` | mit | matemática em PT (sintético, DeepMind traduzido) |
| `maritaca-ai/enem` | apache-2.0 | **já em produção** na fonte `enem` |
| `kamel-usp/aes_enem_dataset` | apache-2.0 | redação do ENEM |
| `tardellirs/brazilian-federal-law-corpus` | cc-by-4.0 | o agente de leis, quando ele existir |
| `allenai/peS2o` | odc-by | ~40M artigos acadêmicos (sem viewer; só parquet) |
| `HuggingFaceFW/fineweb-2` | odc-by | web em PT (`por_Latn`), bruta — não curada |
| `HuggingFaceTB/cosmopedia` | apache-2.0 | livros-texto sintéticos |

**O que NÃO achei:** corpus aberto decente para **veterinária** (nenhum com licença comercial clara),
e para enfermagem/farmácia só coisas minúsculas ou sintéticas. É a Wikipédia PT que cobre esses três
— que era exatamente o buraco levantado antes.
