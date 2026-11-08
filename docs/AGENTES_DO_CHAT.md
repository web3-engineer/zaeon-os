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

### 10.4 · A primeira execução na VPS, e o que ela ensinou

Rodado pelo dono em 2026-11-08 na VPS. Quatro resultados, e três eram meus erros:

**1. `geral · enem novos=540` — funcionou.** A base `geral`, que estava vazia, tem 540 questões do
ENEM. É a única base que TODOS os agentes consultam.

**2. `[wiki] sem texto` nas 122 sementes — a mensagem MENTIA.** A verdade era **HTTP 429** da borda
da Wikimedia contra o IP de saída da VPS. O `json()` jogava o status fora, quem chamava fazia
`.catch(() => null)`, e três situações diferentes (pedido falhou / verbete não existe / verbete
curto) saíam com a mesma frase. Corrigido: o status volta, o `Retry-After` é respeitado (a Wikimedia
manda `retry-after: 1` e a escada cega de 2/4/8/16/32 s gastava 62 s pra esperar 1 s), os três
desfechos são contados em separado, e a pausa de 300 ms saiu do caminho de sucesso — antes uma
rodada limitada batia na Wikimedia **sem pausa nenhuma**, piorando o que já estava ruim.

Daqui, com o conserto: **167 ok · 0 falharam · 0 inexistentes · 1 curto**. Ou seja, o código está
certo e o 429 é do IP. A fonte `wiki` são 122 sementes pela API ao vivo e depende do humor da
Wikimedia; **`wikipt` não depende dela** — lê o instantâneo em parquet, 8.108 documentos por shard,
de um host que não nos limita. Para carga de verdade, `wikipt`.

A execução também achou **três títulos errados que eu mesmo tinha posto** nas áreas novas:
`Infraestrutura como código` → `Infraestrutura como Código` (1.626 chars), `Observabilidade` (não
existe em pt, só páginas de produto) → `Infraestrutura como serviço` (10.749 chars) e
`Perícia forense computacional` → `Computação forense`. Conferidos na busca da própria Wikipédia.
Sobra `Exame físico`, que é esboço de 410 chars — anterior a isto, e agora o log diz o porquê.

**3. `--fontes mmlu,wikipt` não imprimiu nada — o código não está na VPS.** O `main` é `daf315b9` e
só tem as fontes `scielo`, `wiki`, `medicina` e `enem`. `mmlu` e `wikipt` existem no branch. O
`--fontes` simplesmente não casou com nada. Isto foi erro meu: entreguei comandos de código que
ainda não estava lá.

**4. `npm i hyparquet` deu EACCES — e o conserto não é esse.** O contêiner roda como usuário
`zaeon`, não root, e `/app/node_modules` não é dele. Mas instalar no contêiner em execução seria
remendo, porque **o código também precisa subir**. As duas coisas se resolvem com um deploy: o
`package.json` do branch já traz o `hyparquet` em `dependencies`.

> `hyparquet@1.33.0` não declara `engines` e não usa nenhuma API exclusiva do node 22
> (`Promise.withResolvers`, `ArrayBuffer.prototype.transfer`, `structuredClone`, `Array.fromAsync`,
> `toSorted` — todas conferidas, nenhuma presente). O contêiner é node v20.20.2, então roda.

**5. `/tmp/bases/scielo.jsonl` desapareceu** (o `/tmp` foi limpo), então as áreas 7–13 não podem ser
retomadas pela SciELO. Mas isso deixou de ser o caminho: `wikipt` + `mmlu` cobrem as sete, sem
depender de nenhum arquivo sobrevivente.

**A ordem certa, então:** deploy primeiro, carga depois.

```bash
# na VPS, com o branch já no main:
cd ~/zaeon && git pull && docker compose up -d --build web
docker exec -w /app zaeon_web npx tsx scripts/ingerir-bases-area.ts --fontes mmlu --seco
docker exec -w /app zaeon_web npx tsx scripts/ingerir-bases-area.ts --fontes mmlu
docker exec -w /app zaeon_web npx tsx scripts/ingerir-bases-area.ts --fontes wikipt --wiki-shards 6
docker exec -w /app zaeon_web npx tsx scripts/bases-area-placar.ts
```

### 10.5 · O inventário: quantas bases, e de quem

A pergunta "quantos datasets temos e de quem são" não tinha onde ser respondida: as fontes moravam
nos `if (FONTES.includes(...))` do script, a licença de cada uma no comentário ao lado, a área de
algumas num mapa próprio, e o dono da área em `lib/agent/mentors`. Agora o catálogo é
`lib/rag/fontes.ts` e o inventário sai de um comando:

```bash
npx tsx scripts/datasets-inventario.ts            # roda em qualquer máquina: lê só o código
docker exec -w /app zaeon_web npx tsx scripts/bases-area-placar.ts   # a contagem REAL, só na VPS
```

A diferença entre os dois é o ponto: o inventário diz *"a Janaina lê `infra`, que tem 3 fontes"*; o
placar diz *"`infra` tem 1.113 documentos"*. Um é desenho, o outro é realidade — e confundir os dois
foi exatamente como se perdeu uma carga antes.

**7 fontes: 1 em produção, 4 prontas, 2 bloqueadas.**

| fonte | estado | licença | alcança |
|---|---|---|---|
| `enem` | **em produção** | Apache-2.0 | `geral` — 540 questões na VPS |
| `wikipt` | pronta | CC BY-SA 3.0 + GFDL | as 17 áreas — 8.108/shard medidos |
| `mmlu` | pronta | MIT | 11 áreas + `geral` — 743 docs medidos |
| `dataset` | pronta | CC0 / CC BY 4.0 / CC BY-SA 2.5 / MITRE / CC BY-SA 3.0 | infra, matematica, seguranca, software |
| `wiki` | pronta | CC BY-SA 4.0 | as 17 áreas — 167 sementes |
| `scielo` | **bloqueada** | CC BY 4.0 | perdeu `/tmp/bases/scielo.jsonl`; 7.292 docs já dentro |
| `medicina` | **bloqueada** | Apache-2.0 | perdeu os JSONL do `/tmp` |

**O dono de cada base** (`sem` = sementes da Wikipédia, `mat` = matérias do MMLU — ambos derivados,
não escritos à mão):

| agente | área | sem | mat | fontes vivas |
|---|---|---|---|---|
| Osler | medicina | 12 | 8 | wiki, mmlu, wikipt |
| Nightingale | enfermagem | 7 | 0 | wiki, wikipt |
| Darwin | biologia | 12 | 2 | wiki, mmlu, wikipt |
| Turing | eng-computacao | 11 | 2 | wiki, mmlu, wikipt |
| Tesla | eng-energias | 9 | 1 | wiki, mmlu, wikipt |
| Noether | matematica | 10 | 6 | wiki, mmlu, wikipt, **dataset** |
| Feynman | fisica | 10 | 4 | wiki, mmlu, wikipt |
| Borlaug | agronomia | 9 | 0 | wiki, wikipt |
| Mendeleev | quimica | 10 | 2 | wiki, mmlu, wikipt |
| Eiffel | eng-civil | 8 | 0 | wiki, wikipt |
| Pasteur | veterinaria | 7 | 0 | wiki, wikipt |
| James | psicologia | 9 | 2 | wiki, mmlu, wikipt |
| Kekulé | farmacia | 8 | 0 | wiki, wikipt |
| **Téo** | software | 12 | 0 | wiki, wikipt, **dataset** (MDN) |
| **Janaina** | infra | 11 | 0 | wiki, wikipt, **dataset** (Kubernetes) |
| **Octa** | seguranca | 11 | 2 | wiki, mmlu, wikipt, **dataset** (CWE+ATT&CK) |
| **Zaeon** | dados-ia | 12 | 2 | wiki, mmlu, wikipt |
| *(todos)* | `geral` | 0 | 26 | enem, mmlu |

Três coisas que a tabela deixa à vista:

1. **O classificador nunca manda pra `geral`.** `classificarArea` só escolhe entre `AREAS`, então
   `scielo` e `wikipt` — as duas fontes mais volumosas — **não alimentam a base geral**, por mais
   gerais que pareçam. `geral` depende só de `enem` e `mmlu`. E é a base que todo agente lê.
2. **Quatro agentes só têm a Wikipédia:** Nightingale, Borlaug, Pasteur e Kekulé (0 matérias do MMLU,
   sem DATASET). São justamente enfermagem, agronomia, veterinária e farmácia — e no HF não há
   corpus aberto decente para elas, o que já foi medido em 10.5 abaixo.
3. **Há dois "Octa".** O mentor `seguranca` chama-se Octa e lê a base de segurança; o agente do chat
   `octa` (Octa Code) tem `tela: "ide"` e `area: null`, então lê só `area:geral`. São entidades
   diferentes com o mesmo nome, e vale decidir se isso fica.

`lib/rag/fontes.test.ts` confere o catálogo contra o script de ingestão **nos dois sentidos**: fonte
catalogada que o script não executa é promessa vazia, e fonte que o script executa sem estar no
catálogo é dado entrando sem dono declarado.

### 10.6 · A SciELO refeita, e a cobertura fechada

A SciELO morreu assim: 7.292 documentos ingeridos, o `/tmp` da VPS limpo, e a execução sem poder ser
retomada porque o `scielo.jsonl` tinha sumido. Ela era a única fonte que alcançava agronomia,
engenharia civil, veterinária e farmácia — as quatro DESCOBERTAS. Refazê-la fechava as quatro de uma
vez, e foi o que se fez.

**`scripts/scielo-para-jsonl.ts` substitui o `.py`.** Sem Python e sem pyarrow (lê com `hyparquet`,
que já é dependência), usando o **mesmo** `tituloEResumo` de `lib/rag/areas` — o `.py` tinha uma
reimplementação da regra em Python, e duas cópias de uma regra divergem sozinhas. E a saída deixou de
ser `/tmp`.

#### O custo de memória é real, medido e alto

| o que | pico de RSS | tempo |
|---|---:|---:|
| grupo 0 (122.491 linhas) | **10.983 MB** | 68 s |
| grupo 1 (31.727 linhas), sozinho | 3.858 MB | 26 s |
| os dois juntos | **10.983 MB** | 84 s · saída de 408 MB |

Não é falha do leitor. O arquivo tem 2 grupos de linha (o maior com 4 GB descomprimidos), páginas de
dados gigantes e **nenhum índice de página**. Medi as três coisas: ler 50 linhas custa o mesmo que
ler 20 mil (19 s e 4,5 GB nas duas), e `onPage` devolveu **uma** página com 20.557 valores. Não
existe ler um pedaço, e fatiar só multiplicaria o tempo.

> **Não rode dentro do `zaeon_web`.** O contêiner web não declara limite de memória no compose, então
> um pico de 11 GB disputa RAM com o servidor e o OOM killer do host pode escolher o node do
> servidor. Sem ~12 GB livres, use `--grupos 1`: 31.727 artigos num pico de 3,9 GB, e ainda caem nas
> 17 áreas (agronomia 285, eng-civil 187, farmacia 160, veterinaria 56).

```bash
docker run --rm -m 12g -v /opt/zaeon/dataset:/saida -v $PWD:/app -w /app node:20-slim \
  sh -c "npm i -s hyparquet tsx && npx tsx scripts/scielo-para-jsonl.ts --saida /saida/scielo/scielo.jsonl"
docker exec -w /app zaeon_web npx tsx scripts/ingerir-bases-area.ts --fontes scielo --dir /opt/zaeon/dataset/scielo
```

**Resultado real: 154.040 artigos extraídos, 62.032 classificados, as 17 áreas atendidas.** Com o
teto de `--por-area 1500`, **18.034 documentos** entram:

```
medicina 1500 · enfermagem 1500 · psicologia 1500 · biologia 1500 · agronomia 1500 · veterinaria 1500
quimica 1410 · matematica 1274 · dados-ia 1181 · eng-civil 1169 · farmacia 1017 · eng-energias 972
infra 608 · seguranca 517 · fisica 471 · eng-computacao 262 · software 153
```

#### A fonte `medicina` também deixou de depender de arquivo

Ela lia dois JSONL de `--dir`, e morreu pelo mesmo motivo. Agora lê o **parquet direto** do Hugging
Face: 5,5 MB / 10.000 linhas / 10 grupos e 3,0 MB / 6.865 linhas / 7 grupos, pico de 90 MB. Sem
arquivo intermediário, nada pra perder. Rende 753 docs em medicina, 493 em enfermagem, 260 em
farmácia.

#### Cobertura: NENHUM agente descoberto

```bash
npx tsx scripts/datasets-inventario.ts --cobertura
```

**As 17 áreas têm corpus do ofício. Só `geral` é de prova** — e para ela isso é o certo, já que é
feita de ENEM e MMLU.

| agente | área | na VPS | c/ deploy | próprio |
|---|---|---:|---:|---:|
| Téo | software | 0 | 11.056 | 10.807 |
| Osler | medicina | 1.497 | 3.713 | 2.253 |
| Darwin | biologia | 1.500 | 3.036 | 1.500 |
| Octa | seguranca | 0 | 2.363 | 2.179 |
| Borlaug | **agronomia** | 0 | 2.343 | **1.500** |
| Mendeleev | quimica | 0 | 2.096 | 1.410 |
| Nightingale | enfermagem | 1.500 | 2.033 | 1.993 |
| Noether | matematica | 1.185 | 1.982 | 1.288 |
| James | psicologia | 0 | 1.863 | 1.500 |
| Janaina | infra | 0 | 1.848 | 1.721 |
| Pasteur | **veterinaria** | 0 | 1.760 | **1.500** |
| Tesla | eng-energias | 984 | 1.742 | 984 |
| Eiffel | **eng-civil** | 0 | 1.507 | **1.169** |
| Kekulé | **farmacia** | 0 | 1.436 | **1.277** |
| Zaeon | dados-ia | 0 | 1.348 | 1.181 |
| Turing | eng-computacao | 626 | 1.109 | 626 |
| Feynman | fisica | 0 | 736 | 471 |
| *(todos)* | `geral` | 540 | 946 | 0 (prova) |

**Na VPS hoje: 7.832. Pronto esperando deploy: 42.001.**

> **Duas medições da mesma fonte são um TETO, não duas remessas.** A SciELO tem 1.497 de `medicina`
> já na VPS e 1.500 que entrariam ao refazer; somar daria 2.997, e é falso — a ingestão dedupe pelo
> hash do texto e devolve "reaproveitado". Então `coberturaDaArea` toma o **máximo** por fonte+área, e
> soma só entre fontes diferentes. Está travado em teste.

### 10.7 · A fonte `arxiv`, e a varredura funda por mais bases

Varri o Hugging Face, o GitHub, agregadores e repositórios brasileiros. O resultado prático foi uma
fonte nova em produção-pronta e um achado arquitetural que vale mais que ela.

#### O achado: corpus em inglês não pode passar pelo classificador

Medi o **peS2o** (`allenai/peS2o`, ODC-By, ~40M artigos) em **84.967 registros reais** do shard 0:
o classificador aproveitou **5,4%**, com **física, química, eng-computação, eng-civil e dados-ia em
ZERO**. A causa não é o corpus — é que o peS2o é em **inglês** e os termos de `lib/rag/areas` são em
**português**. Os 5,4% vieram de cognato (`medicin` casando com `medicine`), não de classificação.

> **A regra que saiu disso:** corpus em inglês só entra com **área declarada** (fixa ou por mapa),
> nunca pelo classificador. É o que já valia pro MDN, Kubernetes e CWE sem estar escrito. Agora está,
> e `lib/rag/fontes.test.ts` o trava. Para usar o peS2o de verdade seria preciso uma lista de termos
> em inglês por área — trabalho real, não feito.

#### A fonte `arxiv`

O arXiv resolve isso de graça: **já vem rotulado pela própria taxonomia**. `cat:math.*` é matemática
por construção. Licença conferida nos Termos de Uso das APIs do arXiv: o **metadado descritivo
(título, resumo, autores, classificação) é CC0 1.0**. O **texto completo não é** — tem a licença que
o autor escolheu, e há opções NonCommercial entre elas. Por isso entra **só o resumo**.

Física no arXiv não é só `physics.*`: `astro-ph`, `cond-mat`, `gr-qc`, `hep-*`, `nucl-*` e `quant-ph`
são arquivos de primeiro nível, irmãos de `physics`. Mapear só `physics*` deixaria de fora a maior
parte da física — que é justamente a área mais fraca.

**Execução real contra a API, as 11 áreas encostaram no teto de `--por-area 1500` = 16.500 docs:**

| área | disponível no arXiv | área | disponível |
|---|---:|---|---:|
| fisica | **1.541.518** | infra | 58.986 |
| matematica | 753.931 | biologia | 57.538 |
| dados-ia | 498.054 | seguranca | 54.213 |
| eng-computacao | 51.219 | eng-energias | 49.941 |
| software | 39.532 | quimica | 28.773 |
| medicina | 9.399 | | |

O teto não é o arXiv, é o nosso `--por-area`. Não mapeia enfermagem, farmácia, veterinária,
agronomia, psicologia nem engenharia civil: o arXiv quase não tem esses campos, e forçar categoria
vizinha encheria a base do agente errado.

```bash
docker exec -w /app zaeon_web npx tsx scripts/ingerir-bases-area.ts --fontes arxiv
```

#### Verificado e disponível, ainda não construído

| fonte | licença | volume medido | para |
|---|---|---|---|
| **Wikilivros pt** (`dumps.wikimedia.org/ptwikibooks`) | CC BY-SA | 21,2 MB · **14.354 artigos** | em PORTUGUÊS, logo o classificador funciona |
| **Wikiversidade pt** (`ptwikiversity`) | CC BY-SA | 19,1 MB | idem |
| **Zenodo** (API aberta) | por registro (`license.id`) | eng-civil 2.276 · veterinaria 2.238 · psicologia 2.250 · enfermagem 2.198 · farmacia 173 · agronomia 103, em `language:por` | as áreas que o arXiv não alcança |
| **DOAJ** (API aberta) | por revista | **979.567** artigos de revistas brasileiras, com resumo | todas as áreas, em PT |
| **peS2o** | ODC-By | ~40M artigos | só com lista de termos em inglês (ver acima) |

A DOAJ é o maior deles e o mais promissor para PT, mas o **dump em massa exige aprovação caso a caso
por e-mail**; pela API são ~9.800 chamadas paginadas para os 979 mil.

#### Recusados, com o motivo

| fonte | por quê |
|---|---|
| `bigscience-data/roots_pt_*` (Wikilivros/Wikiversidade em parquet) | **gated** — HTTP 401 `GatedRepo`, exige autenticação |
| **Embrapa** Infoteca-e e Alice | 59.700 registros em português e OAI-PMH funcionando, mas `dc:rights` diz só **`openAccess`** — que é declaração de ACESSO, não licença. Sem licença por item, não entra |
| repos de "livros" no GitHub (`free-educa/books`, `ACERVO_DE_MEDICINA_VETERINARIA`) | acervos de PDF de livros comerciais, sem licença real — o "LICENSE" do acervo veterinário é um Código de Conduta. É material infringente |
| `EngenhariaLivre/Tabelas` (Unlicense), `ArvoreDosSaberes` (CC0) | licença boa, conteúdo mínimo: tabelas em LaTeX e perfil de organização, não livro-texto |
| **CORE**, **OpenAlex** | HTTP 429; exigem chave |
| **BDTD/IBICT**, **SciELO Books**, **USP Teses**, **UNESP**, **Lume/UFRGS** | OAI-PMH não responde nos endpoints públicos (404 ou sem conexão) |
| **Gutendex** (Project Gutenberg) | inalcançável deste ambiente |
| `U4R/SurveyBench` | sem licença declarada |
| `ByteDance-Seed/WideSearch` | licença `other`, precisa de leitura antes de usar |

#### Benchmarks (de `mangopy/Deep-Research-Survey`)

Aquele repositório é uma **lista de leitura** (265 links, 182 para o arXiv, **sem LICENSE**), e os 14
datasets dele no HF são **benchmarks de avaliação de agente**, não corpus de conhecimento. Não somam
nada à cobertura. Servem a um buraco diferente: não temos nenhum benchmark externo do nosso modo de
pesquisa. Os de licença limpa são `ByteDance-BandAI/ReportBench` (CC0),
`google/frames-benchmark` (Apache-2.0) e `callanwu/WebWalkerQA` (Apache-2.0).

### 10.8 · O que mais existe no HF, com licença conferida

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
