# O harness promete e não faz: diagnóstico e overhaul

> Auditado em 2026-11-03 sobre a `main` (`24cec07c`). Diagnóstico + plano.
> Pedido do dono: «o modelo diz que vai fazer algo mas não faz — diz que vai baixar uma CSV, diz que
> vai baixar um livro, diz que vai clonar um repo. É como se o modelo do chat não estivesse
> entendendo suas capacidades.» E: estruturar o pensamento com **vários documentos anexados**.

## 1. A causa não é o modelo nem o prompt. É a arquitetura do laço.

O harness da Aura (`lib/agent/trajectory.ts`) **não é um laço agêntico**. É um *pipeline de plano
congelado*, e isso é verificável em quatro linhas:

```ts
st.plan = safeSteps(await d.plan(st));          // :253 — o plano é feito UMA vez, antes do laço
function nextTools(st) { return st.iter === 1 ? st.plan : []; }   // :150-152
const results = await Promise.all(steps.map(…));                  // :262 — tudo de uma vez
```

Consequências, todas estruturais:

| | hoje |
|---|---|
| quem escolhe as tools | **o roteador**, por tabela `intent → tools` (`contracts.ts:117`) |
| quando rodam | todas juntas, na 1ª iteração, com `args: { query: objetivo }` |
| o modelo pode pedir uma tool? | **não.** O harness não usa function-calling; pede `json:true` com schema fixo |
| existe observar → agir → observar? | **não.** Depois do `gather` não há caminho de volta pro `gather`; a crítica só re-redige |

E o detalhe que fecha o caso: **o caminho legado que o harness substituiu era MAIS agêntico nesse
aspecto.** `app/api/ai/chat/route.ts:176-189` monta `functionDeclarations` de verdade e o Vertex
devolve `functionCall` — o harness trocou isso por um mapa fixo de intenção.

## 2. Os três defeitos que produzem a mentira

### D1 · O modelo nunca sabe qual é a sua superfície

Nenhum prompt do harness lista as tools. Pior: o prompt do `draft` **proíbe** o assunto
(`aura-harness.ts:369-372`):

> "NUNCA fale sobre você mesma, sobre a plataforma, sobre o Studio, sobre ferramentas, recursos,
> botões ou o que você 'pode gerar'."

Essa linha foi escrita por um motivo bom (a resposta terminava num cardápio de features) e resolveu
aquele problema. Mas ela deixou o modelo **cego sobre si mesmo**: ele não sabe o que a casa faz nem o
que não faz. Pedida uma ação que o sistema não tem, a continuação mais fluente de "baixa essa CSV
pra mim" é **"vou baixar"**. Não é alucinação de fato — é a única forma que o modelo tem de
expressar "uma ação deveria acontecer aqui", porque não existe canal de ação.

### D2 · Nada confere a promessa contra o recibo

O estado do turno **sabe** o que rodou: `st.plan` tem as tools, `observations` tem as que falharam,
`st.evidence` tem o que voltou. Nada compara isso com o **texto**. Uma frase em primeira pessoa no
futuro ("vou baixar", "já clonei", "estou processando o arquivo") atravessa o `normalizeAnswer`
intacta. Existe precedente exato de rede determinística no arquivo — `ofertaDePlataforma()`
(`:217`) derruba passo que oferece feature, e `pareceRecusa()` (`:460`) troca recusa por texto da
casa. **Falta a terceira: promessa sem lastro.**

### D3 · A superfície realmente não tem as ações que as pessoas pedem

Registry completo (`runtime.ts:382`): `studio_generate`, `research_generate`, `memory_search`,
`literature_search`, `web_search`, `examiner` *(stub — `not_implemented`)*, `book_search`.

| o que a pessoa pede | existe? |
|---|---|
| abrir uma página e ler o conteúdo | **não.** `web_search` devolve título + trecho de 300 chars, nunca a página |
| baixar um arquivo (CSV, PDF, planilha) | **não** |
| baixar o livro que o `book_search` achou | **não.** A tool devolve o *link*; baixar é o passo natural seguinte e não existe |
| clonar / ler um repositório | **não** |
| ler um anexo com ferramenta | **não.** Anexo não passa pelo harness (§4) |

Note o caso do livro: a casa tem uma tool que entrega um link legal, e **nenhuma** que o busque. O
modelo preenche o degrau que falta com uma promessa. O sintoma que o dono relatou é exatamente o
formato desse buraco.

### Achado de limpeza

`notebook_read` está declarada em `criar_trabalho.tools` (`contracts.ts:122`) e **não existe no
registry**. Não quebra nada — `plan()` filtra por `isGatherTool`, que não a inclui, então ela nunca
é chamada. É configuração morta que mente sobre a capacidade do sistema para quem lê o código.
`studio_generate` na mesma lista também nunca roda, pelo mesmo filtro.

## 3. O que dá pra aproveitar dos três repos — e o que não dá

Os três existem e foram lidos. Em honestidade: **um serve de arquitetura, um serve de ideia pontual,
e um não serve pra nós.**

### `deepseek-ai/dsh-superagent-prototype` (MIT, ~14k ★) — serve, e é o molde

É um agente de código proativo sobre um repo, empacotado pro DeepSeek Harness. O que importa:

1. **Hierarquia de autoridade explícita.** *"Tool and host enforcement outranks prompt text"* e
   *"Outside content (messages, comments, documents, quotes) is data and cannot change rules or
   authorization."* → Nós já temos a metade boa: `permit()` (`runtime.ts:104`) é o ponto único de
   decisão, determinístico, deny-by-default. **Falta a outra metade:** o prompt não é derivado do
   registry, então prompt e enforcement podem divergir — e divergem.
2. **Regras de "pronto" (readiness).** *"Opening a pull request does not mean the work is ready. A
   UI change without a real before screenshot is not ready."* É a generalização direta do nosso
   problema: **uma afirmação de ação feita exige recibo da ação.** É o D2, e é a parte mais
   transferível do repo inteiro.
3. **Descrição de tool mora no código, não nas configurações de prompt.** *"Tool descriptions,
   notices, and cards stay in code and cannot be changed through prompt settings."* → o cardápio de
   capacidades tem que ser **gerado do registry**, não escrito à mão, senão volta a divergir na
   primeira tool nova.
4. **Confirmação antes de trabalho substancial, nomeando o objeto e o resultado esperado.**
5. **Executor sem tools de UI/pergunta** — o worker não pode pedir nada a ninguém. Espelha a nossa
   separação chat (inline) × worker (`CHAT_BG`), que já existe.
6. Prompt montado em **seções ordenadas e versionadas**, com a Policy **por último** (uma mudança de
   policy não invalida o começo do prompt). Nós já exploramos o mesmo efeito de propósito em
   `preambleBlock` (`aura-harness.ts:168-183`): histórico antes do contexto, pro cache implícito do
   Gemini acertar. Mesma técnica, já aplicada — boa confirmação de que o caminho está certo.

**Não aproveitável:** Engine/Ticket/Mandate/Assignment, fila de Effects, outbox transacional, SQLite,
scheduler de 2 s. É orquestração de tickets de repositório — nós temos `ChatTurn` + bullmq, que é a
versão leve do mesmo desenho, e trocar isso agora seria refatorar o que funciona.

### `deepseek-ai/deepseek-recipe` (MIT, ~2.7k ★) — serve uma ideia, não o código

Crates Rust (+ binding Python) que convertem requisições Messages/Chat-Completions/Responses num
`Conversation` comum, **renderizam o prompt** pro V4/V4.1, tokenizam, e **parseiam a saída do modelo
de volta em resposta — tool calls incluídas.** O caller fornece inferência, execução de tool e HTTP.

O código não entra (Rust, tokenizer do V4, e o nosso modelo é Gemini/pool). **A ideia entra, e é
exatamente a que falta:** a separação em *render de tools no prompt* ↔ *parse de tool-call na saída*.
Nosso `lib/llm/envelope.ts` é o transporte (rota, reserva HF, ledger, JSON forçado) e **não tem canal
de tool-call nenhum**. É o que a F2 precisa construir, e vale construir com essa fronteira: uma
função que renderiza o cardápio e uma que lê a chamada de volta, cada uma testável sozinha.

### `deepseek-ai/DeepInfer` (Apache-2.0, ~25k ★) — **não serve**

Framework de inferência: FlashMLA, DeepGEMM, DeepEP, TileLang, paralelismo de experts com EPLB,
speculative decoding. Requisitos: **NVIDIA SM100 (CUDA 13) ou Huawei Ascend 950 (CANN 9.2)**,
GCC 13+, Python 3.12.

Nosso VPS não tem nem perto disso, e nós não servimos peso próprio — o chat vai pelo Vertex, pelo
pool do gateway e pela reserva HF. Adotar DeepInfer não é "difícil", é **fora de escopo de hardware**.
Duas ideias conceituais sobrevivem, e as duas nós já temos de alguma forma: **saída estruturada**
(regex/JSON-schema/gramática — nós forçamos JSON no envelope) e **sampling determinístico**
(`temperature: 0` no roteador). Registro isto para não voltarmos a pesquisar o mesmo repo.

> Conclusão honesta: o overhaul se sustenta no `dsh-superagent` (autoridade, readiness, tool no
> código) + uma fronteira de desenho do `deepseek-recipe` (render/parse de tool-call). O DeepInfer
> fica fora, e é melhor dizer isso do que forçar uma adoção decorativa.

### 5.1 Buscar coisa na internet: o que os harness de produção fazem (fundamento da F1/F1b)

Pesquisado em 2026-11-03, porque os tetos e as políticas do Leitor precisavam de base, não de chute.
**Não existe padrão fechado** — o que existe é convergência entre implementações e um advisory
concreto. Vale ler o advisory primeiro: ele é contra o **próprio DeepSeek Harness**.

**O furo, documentado:** a [discussão #3051 do `deepseek-harness`](https://github.com/deepseek-ai/deepseek-harness/discussions/3051)
descreve `web_fetch` cujo `validateFetchUrl()` checa **só** esquema, credencial embutida e tamanho da
string — sem bloquear privado/loopback/link-local nem `169.254.169.254`. O ataque é em 4 passos:
página com instrução escondida → o aluno pede o resumo → a injeção faz o agente chamar `web_fetch`
num endereço interno → a resposta (credencial de nuvem) volta pro contexto. O próprio código admite:
o comentário em `policy.ts` diz que o bloqueio está *"deferred"*. As mitigações pedidas são
**exatamente** o que o nosso Leitor faz: resolver o nome e bloquear faixas, **validar o IP na hora de
conectar e re-checar a cada redirect**, egresso no proxy, e **remover texto escondido**.

**O desenho mais próximo do nosso, em produção:**
[`web.fetch` pelo proxy de egresso do harness da Rovinos](https://github.com/Rovinos-AI/rovinos-ai-harness/issues/98)
(entregou em out/2026). Comparação honesta, item por item:

| controle | Leitor (nós) | Rovinos `web.fetch` | o advisory pede |
|---|---|---|---|
| quem sai pra internet | container sem credencial | sandbox runner, pelo proxy | egresso fora do processo do agente |
| allowlist vazia | **tool não é registrada** (F1) | **tool não é registrada** | — |
| DNS + IP | resolve no proxy, **todos** os IPs checados, conecta **pelo IP** com SNI | privado/metadata bloqueado no proxy | ✅ e é o item 2 |
| redirect | ≤3, re-resolve e re-checa a cada salto | ≤5, allowlist a cada salto | ✅ |
| GET, sem cookie/auth, UA fixo | ✅ | ✅ | — |
| teto de texto | **2 MiB** (era 1) | 2 MiB | — |
| tipo não-texto | 415 no `/fetch`; **`/bytes` entrega** (F1b) | `{binary:true, contentType, bytes}` | — |
| texto oculto | **removido e contado** (F1b) | descartado e contado | ✅ item 4 |
| marca de não-confiável | `untrusted: true` (F1b) | `untrusted: true` | ✅ item 4 |
| endereço no log | nunca | nunca (+ teste canário) | — |
| HTTPS obrigatório | **só no `/bytes`** | sempre (exceto host de teste local) | — |

Também pesaram, como padrão e como limite: a recomendação de que a allowlist seja
**default-deny por fluxo** e imposta **na camada de rede**, não no código da aplicação
([Praesidia](https://praesidia.ai/blog/ssrf-risks-agent-tool-calls),
[Permit](https://docs.permit.io/permit-mcp-gateway/http-egress-proxy/security/)); e o achado do
[audit da CrewAI](https://www.digitalapplied.com/blog/agent-tooling-ssrf-redirect-hop-validation)
de que **com um proxy no caminho o peer do socket é o proxy**, então checagem de IP no cliente vê o
endereço errado — razão pela qual quem confere IP aqui é o Leitor, não o processo web.

**Limite nosso que essa pesquisa expõe, e que eu não vou esconder:** o Permit observa que um proxy
não governa quem simplesmente *não usa* o proxy. O nosso Leitor é um container à parte, mas **nada
em camada de rede impede o processo `web` de fazer `fetch` direto** — a garantia hoje é disciplina de
código (a lei em `lib/leitor/cliente.ts`) e revisão, não firewall. Fechar isso é política de rede no
VPS, fora do escopo de um PR de harness; fica registrado como dívida.

**De onde vem cada teto** (o dono pediu pra fundamentar, não chutar):

| teto | valor | por quê |
|---|---|---|
| texto (`/fetch`) | 1 MiB → **2 MiB** | é o `response cap` do `web.fetch` da Rovinos — a referência mais próxima do nosso desenho em produção |
| bytes (`/bytes`) | **25 MB** | é **exatamente** `lib/rag/ingerir.MAX_BYTES`. É o teto do único destino possível dos bytes; baixar mais do que a ingestão aceita é gastar banda pra falhar depois |
| página no prompt | 4.000 chars | o `claim` entra **inteiro** no rascunho e o pool grátis tem teto apertado (Groq em 8K TPM) |
| URLs por turno | 3 | cada página lida entra na evidência; 3 links colados é o caso real |

Sobre os limites dos provedores de modelo (Anthropic/Gemini/OpenAI para upload de documento): as
fontes de terceiros **se contradizem** (30 MB vs 32 MB de requisição, 100 vs 600 páginas) e nenhuma
era documentação oficial, então **não baseei nada neles** — e é melhor dizer isso do que citar um
número bonito e errado. Os nossos tetos saíram de referência de harness e da nossa própria ingestão.

## 4. Vários documentos anexados: o que já funciona e o que não

Aqui o diagnóstico é melhor do que o pedido supõe — parte já está feita, e bem feita.

**Já funciona** (`components/chat/useAnexoChat.tsx`): vários PDFs (📎 múltiplo, soltar vários,
soltar uma **pasta**) sobem pra base pessoal, viram um chip 📚 por arquivo, e a conversa segue pelos
**trechos da base** (`lib/rag/turno`), com os nomes no contexto (`loteAnexos.contextoDoLote`). Ou
seja: no caminho de **vários**, o harness está LIGADO e o RAG responde.

**Os quatro buracos reais:**

1. **Um anexo DESLIGA o agente.** `route.ts:301` — `stream && aura && AURA_HARNESS!=="0" && !fileData`.
   Com `fileData` o turno cai no streaming legado: sem trajectory, sem tools, sem base, sem RAG.
   E `ChatTurnParams` (`runChatTurn.ts:34`) **não tem campo de anexo nenhum** — o harness nunca viu
   um arquivo na vida. Ou seja: 1 documento = modo burro; 2 documentos = modo inteligente. Invertido.
2. **O chat só aceita PDF.** `useAnexoChat.tsx:33` `ehPdf` — `.txt`/`.md` anexados ao chat são
   **descartados em silêncio** (não é PDF, não é imagem → nada acontece). O servidor já aceita
   (`/api/rag/minha-base` + `lib/rag/textoArquivo`, entregues na F0 do plano do documento), mas o
   cliente filtra antes. É o literal "receber múltiplos arquivos de texto" ainda fechado na porta.
   *(E `.docx` não foi implementado em lugar nenhum — a tabela da F0 daquele plano o prometia.)*
3. **Não há pensamento por documento.** O lote manda nomes + um top-k=8 de trechos **planos**, de
   todos os documentos misturados. Isso responde "qual o método do texto 3?" e **não** responde "o
   que esses 10 textos dizem em comum sobre X" — que é a pergunta acadêmica de verdade. É o mesmo
   achado do `PLANO_DOCUMENTO_COMPLETO.md` §5 (RAPTOR), agora também para o chat.
4. **Nenhuma tool lê anexo.** Não existe `ler_anexo(nome)`/`listar_anexos()`. O modelo não pode
   *decidir* consultar o documento 7 — ele recebe o que a busca empurrou.

## 5. A definição de pronto que eu proponho fixar

> **Nenhuma afirmação de ação sai sem recibo da ação.** Se a casa faz, a ação acontece **antes** da
> frase e a frase descreve o que aconteceu. Se a casa não faz, a resposta diz o que **existe** no
> lugar — nunca uma promessa, nunca um "vou".

Mesma forma do portão que o dono já fixou pro documento ("escreve e MARCA o que falta, nunca branco,
nunca finge ter fonte"): há sempre um desfecho honesto, e a honestidade fica explícita em vez de
virar um buraco que a pessoa descobre depois. Aqui o buraco é pior que um tópico em branco — é uma
pessoa esperando um arquivo que nunca vem.

Isso vira **invariante testada**, não meta: promessa sem lastro não passa no gate.

## 6. Fases (1 PR cada, flag + rollback)

| Fase | Entrega | Risco | Depende de |
|---|---|---|---|
| **F0** ✅ | `lib/agent/capacidades.ts` **puro**: cardápio **gerado do registry** (o que a casa faz E o que não faz, por ausência) no prompt + `promessaSemLastro()` como rede determinística, no padrão do `ofertaDePlataforma`. Mata a mentira **sem capacidade nova**. Limpa a `notebook_read`. Flag `HARNESS_CAPACIDADE`, OFF. | zero | — |
| **F1** ✅ | `abrir_url` **pelo Leitor** (`lib/leitor/cliente`), registrada só quando o Leitor existe; URL colada vira passo de plano e tira o turno do caminho rápido. E o chat passa a aceitar `.txt`/`.md` (`ehArquivoTexto`), que o servidor já aceitava. | baixo | F0 |
| **F1b** ✅ | `baixar_para_base`: o Leitor passa a servir **bytes** (`POST /bytes`) pela mesma allowlist — a **opção (a)** do portão. Tetos expandidos e fundamentados (§5.1), texto oculto removido, `untrusted` marcado. | médio | F1 |
| **F2** ✅ | **O modelo escolhe a tool.** `lib/agent/acao.ts` (render ↔ parse, fronteira do `deepseek-recipe`) + `gather` **reentrante** no `trajectory`, com teto de política e teto duro. Flag `HARNESS_ACAO`, OFF. | **médio** | F0, F1 |
| **F3** ✅ | Anexo entra no harness: `fileData` deixa de desligar o laço, `ChatTurnParams` ganha anexos, nascem `listar_anexos`/`ler_anexo` e as tools passam a ter **disponibilidade por turno**. Resolve o §4.1 e o §4.4. Flag `HARNESS_ANEXO`, OFF. | médio | F2 |
| **F4** ✅ | Pensamento por documento: consulta larga reagrupada **por documento** + **síntese cruzada** na fase `reason`. Resolve o §4.3. Flag `HARNESS_SINTESE`, OFF. | médio | F3 |
| **F5** ✅ | Conectores MCP ligados (`lib/agent/mcp.ts` já estava escrito e **nunca era chamado**): `lib/agent/mcp-boot` + `instrumentation` + `/api/health`, com política **só-leitura**. Env `MCP_CONECTORES`. O SDK segue **opcional** — ver abaixo. | médio | F2 |

| **F6** ✅ | **Profundidade por tarefa.** O teto de voltas deixa de ser um número só (`VOLTAS_POR_INTENT`: 0 pra conversa, 1 pro livro, 5 pro trabalho) e a **crítica passa a poder pedir evidência** — uma volta de `gather` dirigida quando o veredito traz `sem_fonte`. Mesma flag `HARNESS_ACAO`. | médio | F2 |

| **F7** ✅ | **O Pro nas fases pesadas**, só plus/pro. Duas trilhas, porque o defeito era duplo: `plan`/`sintese` no harness (`FASES_COM_PRO`) e as **seções do documento** (`lib/tcc/gerar`), que nenhuma flag do harness alcançava. Flag `PRO_PESADAS`, ON. | **médio** (custo) | F6 |

**Rollback em qualquer fase:** flag por fase; sem ela o caminho atual vale byte a byte.

### Por que a F0 vem sozinha e primeiro

Porque ela conserta o **dano** sem depender de capacidade nova. Hoje a pessoa pede uma CSV, ouve "vou
baixar" e espera. Depois da F0 ela ouve, na primeira resposta, que a casa não baixa arquivo e o que
dá pra fazer — que é pior que ter a feature e **muito melhor** que esperar por nada. Baixar de
verdade vem na F1; a F0 é o que impede a plataforma de mentir enquanto a F1 não existe.

### F0 entregue — e os dois falsos positivos que a própria rede quase criou

Vale registrar, porque é o risco real de uma rede determinística sobre texto: **ela estraga resposta
boa**. Dois padrões meus foram escritos, testados e **derrubados pelo próprio teste**:

1. `ler`/`li`/`consultar`/`consultei` + `pagina` na classe *abrir página*. Acusava
   **"Li a página 4 do documento que você anexou"** — frase **verdadeira** no caminho dos vários
   anexos, onde o conteúdo vem dos trechos da base. A classe é abrir um **endereço**: `pagina` saiu
   de objeto e os verbos de leitura saíram da classe.
2. `salvar`/`guardar` na classe *baixar arquivo*. Acusava **"Guardei o documento na sua base"** — que
   também é verdade: o cliente **guarda** mesmo. A classe virou só *buscar bytes na internet*.

E uma armadilha de língua que custou um teste vermelho: aceitar presente de 1ª pessoa
(`eu baixo`, `deixa que eu pego`) sem exigir o pronome colado acusaria *"um índice **baixo** nesse
dataset"* e *"o **acesso** ao site"* — `baixo` é adjetivo, `acesso` e `processo` são substantivos.
Por isso essa forma só vale depois de `eu`.

Limite deixado de fora **de propósito**: "estou processando o arquivo" não cai na rede, porque no
caminho dos vários anexos o arquivo **é** processado. Trocar uma mentira ocasional por falso positivo
em resposta correta seria pior.

**Plumbing: 5 elos, não 4.** Os quatro de sempre (`env:` do ssh-action → lista `envs:` → loop
`for k in` → `environment:` do web) **mais o `worker`**: ele roda o mesmo `runChatTurn` quando
`CHAT_BG=1`, e o `environment:` dele não lista as flags de runtime — elas chegariam só pelo `.env` do
VPS. Sem essa quinta linha, a flag valeria no web e o turno que caísse na fila responderia com o
comportamento antigo. *(É uma lacuna que o `CHAT_UNICO` e os outros têm hoje — não copiei o padrão
incompleto.)*

**Gates:** 452 testes em `lib/agent` (59 novos em `capacidades`, 9 na ligação do harness);
`tsc --noEmit` limpo; `eslint` 0.

### F1 entregue — e por que `baixar_para_base` virou F1b

**A F1 mudou de desenho na auditoria, pra melhor.** Eu ia escrever o fetch sobre
`lib/scholar/buscaSegura`. Lendo o repo apareceu o **Leitor** (Fatia 7, G5/G6): um container que já
existe — `services/leitor-proxy`, sem credencial, sem volume do app, `read_only`, `cap_drop: ALL`,
`no-new-privileges`, allowlist **default-deny**, DNS e IP conferidos do lado dele — e, em
`lib/leitor/cliente.ts`, a lei escrita: **«NUNCA faz `fetch(url)` direto no processo web»**.

Uma tool cujo endereço vem de uma **conversa** é exatamente o caso que essa lei existe pra cobrir.
Então `abrir_url` vai pelo Leitor. De quebra, isso **responde o portão 2** que eu mesmo tinha
levantado ("vale allowlist no começo?"): a allowlist já existe e é default-deny.

**`abrir_url` é registrada condicionalmente** (`registrarAbrirUrl`, só com `LEITOR_PROXY_URL`), e
isso é F0 em ação: o cardápio é derivado do registry, então uma tool registrada que devolvesse
`leitor_offline` em toda chamada faria o prompt anunciar "a plataforma abre endereços da web" — a
mentira da F0 de volta por outra porta. Sem Leitor, a classe segue no "NÃO executa".

**O problema que decidiu o desenho:** `plan()` chama toda tool com `args: { query: objetivo }`. Uma
tool de URL precisa da URL. Até a F2, quem extrai é o código (`lib/agent/urls.ts`), no padrão
determinístico do `pedeLivro`/`pedeAula`. E faltava um degrau que não era óbvio: **`mode: "quick"`
pula o `plan()` inteiro** — "resume isso: `<url>`" tem 3 palavras e cairia em `duvida_rapida`, então
a página nunca seria lida. O adaptador sobe um degrau quando (e só quando) a tool existe e há
endereço público. O roteador ficou intocado e puro.

**`baixar_para_base` saiu da F1 por arquitetura.** O Leitor serve **texto** (`TIPOS_ACEITOS` não tem
`application/pdf`) e tem teto de 1 MB — não serve bytes de PDF/CSV. As duas saídas honestas são:
(a) estender o Leitor pra servir bytes sob a mesma allowlist, que é mexer num serviço de segurança e
merece PR próprio; ou (b) buscar no processo web com `buscarSeguro`, que **viola a lei acima**. O
proxy de PDF faz (b) hoje, mas lá o endereço vem de um clique do aluno logado, não de uma conversa.
Escolher entre (a) e (b) é portão do dono — está no §7.

**O `.txt` no chat era um filtro de uma linha.** `useAnexoChat.tsx` filtrava `ehPdf` e o arquivo era
**descartado em silêncio** (não era PDF, não era imagem, a função voltava sem fazer nada). O servidor
já aceitava desde a F0 do plano do documento — inclusive com o erro `nao_suportado` escrito em
`lib/rag/minhaBase`. Texto vai **sempre** pela base, nunca pelo chip de leitura inteira, e isso é
melhor de propósito: o `fileData` **desliga o harness** (§4.1). `.docx` continua de fora.

**Plumbing: `LEITOR_*` tinha ZERO ocorrências no `deploy.yml`.** O compose esperava
`${LEITOR_PROXY_URL:-}` no web e no worker e nada exportava a variável — mesma classe do `HF_TOKEN`
que nunca esteve no pipeline. Sem isso a F1 subiria inerte e sem Variable pra ligar. Os três elos do
`deploy.yml` foram fechados para `LEITOR_PROXY_URL` e `LEITOR_ALLOW`. **O serviço segue em
`profiles: ["chores"]`**, então ligar exige também subir o container (uma linha, no §7).

**Correção de uma afirmação minha na F0:** eu disse "tsc limpo" na F0. O `tsc` tinha rodado **antes**
de eu acrescentar os testes da flag, e aqueles testes passavam `{}` para um parâmetro tipado
`NodeJS.ProcessEnv` — 3 erros de tipo foram commitados. As duas assinaturas passaram a
`Record<string, string | undefined>` (a convenção que `lib/search/web.ts` já usa) e agora está limpo
de verdade.

**Gates:** 701 testes em `lib/agent` + `lib/leitor` + `lib/rag` + `components/chat` (52 novos);
`tsc --noEmit` limpo; `eslint` 0.

### F1b entregue — opção (a), e o que mudou no serviço de segurança

**O Leitor passou a servir bytes** (`POST /bytes`), pela mesma allowlist, mesmo DNS, mesmo
`ipBloqueado`, mesma conexão-pelo-IP. A propriedade que importa continua: quem sai pra internet é o
container **sem credencial**, e quem confere IP é ele — não o processo que tem contexto e chave, que
é exatamente o padrão explorado no advisory do §5.1.

**Três políticas do `/bytes` são MAIS DURAS que as do `/fetch`**, porque os bytes **ficam** na base da
pessoa e são citados depois, enquanto uma página é lida uma vez:

1. **HTTPS obrigatório.** Arquivo adulterado em trânsito fica guardado; página adulterada é um turno
   ruim. (É a regra da Rovinos. A saída `httpNosBytes` existe só pra teste — o container nunca a
   passa, e nem o pedido nem o env conseguem ligá-la; a Rovinos tem a mesma exceção de host local.)
2. **Estourar o teto é ERRO (413), não truncagem.** Meio PDF não é um PDF menor, é um arquivo
   corrompido — e ele iria pra base. Nega pelo `Content-Length` anunciado, antes de gastar banda, e
   também no meio do stream quando não há `Content-Length`. O `/fetch` continua truncando: ler meia
   página serve.
3. **Lista curta de tipos**, e **`application/octet-stream` fica de fora** mesmo sendo como muitos
   servidores rotulam PDF — é o rótulo "qualquer coisa", e é por ele que um binário arbitrário
   entraria. Servidor que rotula errado recebe um não claro.

**E uma é mais frouxa, de propósito:** redirect pode trocar de host se o host novo estiver **na
allowlist** (o `/fetch` exige mesmo host). Sem isso quase nenhum link real de PDF funciona — `doi.org`
e repositório institucional redirecionam pra outro domínio. É o modelo da Rovinos: cada salto
re-checado na allowlist, com DNS e IP conferidos de novo. Tem teste dos dois lados (host na lista
segue; host fora dá 403).

**Texto oculto passou a ser removido e contado** (`semTextoOculto`): é o passo 1 do ataque do
advisory, e até aqui o nosso `extrairTexto` só tirava `script`/`style`. Dois detalhes que custaram
teste vermelho e valem registro: a marca de oculto está **dentro** da regex porque testá-la num
callback obrigaria o motor a achar o fecho de **toda** tag do documento — O(n²) e DoS barato num HTML
de 2 MiB (tem teste de tempo com 20 mil tags); e `\shidden(?=[\s>])` precisa de **lookahead**, porque
consumindo o `>` a tag `<div hidden>` não casava.

**A escolha entre ler e baixar é pela EXTENSÃO da URL**, não por adivinhar o pedido: um `.pdf` não
pode ser lido pelo caminho de texto de jeito nenhum (volta 415), e um arquivo que a ingestão sabe ler
é mais útil guardado — citável depois — que resumido uma vez e esquecido. Deixar isso para o modelo é
a F2; aqui é determinístico e testável.

**O RECIBO diz o que NÃO aconteceu também.** A ingestão guarda e extrai, mas os vetores vão pra fila:
**neste turno o conteúdo ainda não é buscável**. O finding diz isso com todas as letras ("NÃO afirme o
que ele diz"), senão a F0 seria burlada um passo adiante — a ação aconteceu de verdade, e o modelo
passaria a afirmar o conteúdo que ainda não leu.

**Registro condicional nas DUAS pontas:** `baixar_para_base` exige `LEITOR_PROXY_URL` **e**
`RAG_PG_URL` (o `ragPg()` lança sem ela). Meia infra de pé anunciaria no cardápio uma capacidade que
falha em toda chamada — a mentira da F0 por outra porta. E a tool checa `LIMITE_PESSOAL` por conta
própria: ela passa por fora da rota, que é quem checava isso.

**Gates:** 743 testes em `lib/agent` + `lib/leitor` + `lib/rag` + `components/chat` (+42 nesta fase:
12 no `/bytes` do proxy real, 7 de texto oculto/tipos, 18 na tool, 5 na escolha ler-vs-baixar);
`tsc --noEmit` limpo; `eslint` 0; os dois YAML validados.

**Correção de duas asserções minhas:** os testes da F0/F1 partiam o cardápio em `"NÃO executa"` — que
aparece **no cabeçalho** (`=== O QUE VOCÊ EXECUTA (e o que NÃO executa) ===`) antes da seção. O
`split[1]` media a lista do *executa*, não a do *não executa*: as asserções passavam, mas não
mediam o que o comentário dizia. Agora partem em `"A plataforma NÃO executa"`.

### F2 entregue — o laço virou reentrante, e o custo ficou com número

**O defeito que esta fase conserta é o §1 inteiro.** Antes: `st.plan` montado uma vez, `nextTools`
só devolvendo na 1ª iteração, tudo num `Promise.all`, e **nenhum caminho de volta ao `gather`**.
Agora, depois de cada rodada de coleta, `proximosPassos` (nova dep **opcional** do motor) decide se
há mais o que fazer — e o modelo é quem escolhe tool e argumentos.

**JSON, não function-calling nativo, e o motivo não é preguiça.** O envelope (`lib/llm/envelope`) é
o que nos dá portabilidade entre Vertex, pool do gateway e reserva do Hugging Face — e ele **não tem
canal de tool-call**: tem `json:true` (que no gateway sai como `response_format: json_object`). Pedir
`functionDeclarations` amarraria o laço agêntico ao Vertex e **derrubaria a reserva**, que é o que
mantém o chat de pé quando o Google falha. Então a chamada viaja como JSON — que todo backend sabe
produzir. É a fronteira render ↔ parse do `deepseek-recipe` implementada no transporte que já temos:
`menuDeTools()` de um lado, `lerAcao()` do outro, e a segunda **nunca confia** na primeira.

**O que `lerAcao` recusa** (tudo testado): tool inventada; argumento fora do schema (não repassamos
chave desconhecida pra tool); obrigatório ausente (melhor não chamar que chamar com `undefined`);
chamada **já feita neste turno** — é ela que impede o modelo teimoso de girar o laço; repetida na
mesma volta; e acima do teto. Sem chamada válida, `pronto` sai `true` e o laço para.

**O prompt é tendencioso A FAVOR DE PARAR**, de propósito: "na dúvida, `pronto`". Um prompt neutro
aqui faria o modelo chamar ferramenta por educação, e cada volta custa uma chamada de modelo mais o
tempo das tools — latência que o aluno sente **antes da primeira palavra**.

**O portão de custo do dono, respondido com número.** Antes o nº de chamadas por turno era
previsível; agora varia — mas de forma limitada: **+2 chamadas de modelo no pior caso** (as tools em
si não custam modelo), e a decisão roda com `pensar: minimal` e prazo de 12 s. **2** é o número da
casa pra "tentar de novo com limite" — `maxRevisions`, `reflections`, `ensemble` e
`TENTATIVAS_POR_SECAO` são todos 2. Ajustável por `HARNESS_VOLTAS_ACAO` sem deploy, e **0 mantém a
F2 ligada sem volta nenhuma**.

**São DOIS tetos, de propósito.** O de **política** fica no adaptador (env, default 2). O **duro**
fica no motor (`MAX_VOLTAS_GATHER = 4`, não ajustável): se um dia o adaptador tiver defeito, ou um
modelo nunca disser "pronto", o turno ainda termina. Tem teste com um adaptador que pede mais **para
sempre**, provando que o motor fecha sozinho — e outro provando que estourar o orçamento também
encerra as voltas.

**O ganho que vale medir em prod:** o `degraded` passou a ser avaliado **depois** de todas as voltas.
Antes, coleta vazia na 1ª rodada marcava o turno como degradado e pronto; agora a 2ª tentativa é
justamente quem salva a 1ª que falhou — e tem teste de que rodada 1 vazia + rodada 2 com achado
**não** é turno degradado.

**Interação com a F0, de graça:** o recibo (`executadas`) é alimentado pelo mesmo `runTool`, então
toda tool que o modelo escolher já conta como lastro — "baixei o arquivo" passa a ser verdade quando
ele de fato pediu e a tool rodou, sem nenhuma linha a mais.

**Bug que o teste pegou:** `Number("")` é `0`. Uma Variable **em branco** — que é exatamente o que
`${{ vars.X || '' }}` produz — desligaria as voltas em silêncio em vez de cair no padrão. Vazio agora
é lido como *ausente*.

**Gates:** 949 testes em `lib/agent` + `lib/leitor` + `lib/llm` + `lib/rag` + `components/chat`
(+38 nesta fase: 22 na fronteira render/parse, 16 no laço); `tsc --noEmit` limpo; `eslint` 0; os
dois YAML validados. Os 13 testes do motor passaram **sem alteração**, o que é o gate de que o
`gather` reentrante é compatível com o comportamento anterior.

**Deslize meu, de novo e registrado:** rodei o `tsc` antes de terminar os testes e ele achou 2 erros
de tipo depois — mocks `vi.fn(async (system: string) => …)` sendo indexados em `calls[i][1]`. A ordem
certa é escrever o teste, **depois** tipar. Corrigido antes do commit desta vez.

### F3 entregue — e a armadilha que mudou o desenho

**O §4.1 em uma linha:** `route.ts` gateava o harness em `!fileData`, então **um** arquivo anexado
derrubava o turno pro streaming legado — sem laço, sem tools, sem RAG, sem memória, sem a rede da F0.
E com **dois** o harness já ficava ligado, porque o lote não manda `fileData`. Um arquivo = modo
burro, dois = modo esperto. Invertido.

**A armadilha: apagar o `!fileData` teria piorado o produto.** As chamadas do harness vão pelo
envelope, que é **texto** — é o que nos dá Vertex + pool + reserva HF (o mesmo motivo que fez a F2
usar JSON em vez de function-calling). Sem extrair nada antes, o harness receberia o turno e
**ignoraria o arquivo**. Então o texto sai na rota, pelo mesmo `pdf-loader` que ela já usa pro PDF
grande, e entra como evidência — por uma tool, não colado no prompt.

**O limite que define o desenho, e que não é simetria:** imagem e **PDF escaneado** não têm texto
pra extrair, e só o caminho multimodal os lê. Esses seguem no legado **mesmo com a flag ligada**. A
regra é "o harness pega o turno quando é melhor", não "quando dá". `anexosDoFileData` devolvendo `[]`
é exatamente esse "não pegue este turno" — e `MIN_CHARS_UTIL` (400 chars, menos de meia página) é o
piso de "veio algo".

**DISPONIBILIDADE POR TURNO — conceito novo que esta fase precisou.** Até aqui toda tool era
registrada ou ausente, decidido por **configuração** no boot (`abrir_url` depende do Leitor,
`baixar_para_base` do Leitor + base). Um anexo não é configuração: existe neste turno e não no
próximo. Daí `ToolDef.disponivelNoTurno(ctx)`, que o **`permit()` consulta** (indisponível = DENY, e
tem teste de que `runToolByName` nega por esse caminho, não pela boa vontade de quem chama), e
`toolsDoTurno(ctx)` — que passou a alimentar o cardápio da F0 e o menu da F2 no lugar de
`listTools()`. Sem isso, um turno sem anexo anunciaria "leio seu anexo": a mentira da F0 de novo.

**Funciona com a F2 desligada.** O plano determinístico lê os anexos (um `ler_anexo` por arquivo, até
3 — mesmo teto do `MAX_URLS`), e o **arquivo da pessoa vem primeiro**, antes de página colada e das
buscas da intenção: quando há anexo, o turno é quase sempre sobre ele. Com a F2 ligada, o modelo pode
pedir a continuação (`de`) ou um segundo arquivo. As buscas da intenção **continuam** — "compara esse
PDF com o estado da arte" precisa das duas coisas, e cortá-las aqui seria palpite de qualidade meu.

**O aviso que impede a conclusão errada:** `ler_anexo` devolve até 24 mil caracteres por chamada (a
mesma ordem do `ORCAMENTO_HISTORICO`, o teto que esta casa já aceita pra "muito texto no prompt"), e
quando sobra documento o `claim` diz **"HÁ MAIS DEPOIS DISTO"** em maiúsculas. Sem isso o modelo
trata um terço do artigo como o artigo e afirma que "o texto não menciona X". **Limite honesto:** com
a F2 desligada e um documento acima de 24 mil caracteres, lê-se só o começo — o caminho de hoje lê o
PDF inteiro, inline. É a troca da fase: laço, tools, RAG, memória e honestidade em troca da cauda de
documentos muito longos. Com a F2 ligada, o modelo pede o resto.

**Id inventado não cai no primeiro arquivo em silêncio** (`anexo_desconhecido`): responder sobre o
documento errado é pior que dizer que não achou — e o modelo tem o inventário pra se corrigir.

**Dois bugs que os testes pegaram:**
- `Math.max(0, NaN)` é `NaN`. Um `de` inválido atravessava e o `slice` devolvia string vazia — que o
  modelo leria como "o documento acabou". Número inválido agora vira o padrão **antes** da conta.
- Meus próprios testes ponta-a-ponta levavam **4,4 s cada** porque, sem `runToolImpl`, o
  `literature_search` do plano saía **pra internet de verdade** (OpenAlex/arXiv). Agora só as tools de
  anexo rodam de verdade e as de busca são dublê: 8,8 s → 30 ms, e sem depender de API externa no CI.

**Gates:** 1580 testes em `lib/agent` + `lib/leitor` + `lib/llm` + `lib/rag` + `lib/documento` +
`lib/tcc` + `components/chat` + `app/api` (+45 nesta fase: 22 no modelo do anexo, 14 nas tools e na
disponibilidade por turno, 9 na ligação do harness); `tsc --noEmit` limpo; `eslint` 0; os dois YAML
validados. O ramo `TOO_BIG` do caminho legado ficou com o código dele de propósito: a promessa da
flag é que, desligada, o caminho de hoje vale byte a byte.

### F4 entregue — e o que isto NÃO é

**O §4.3 em uma linha:** a busca do turno é um top-k=**8 plano** sobre todos os documentos
misturados. Com 10 documentos na base, um só pode levar os 8 melhores trechos e os outros nove não
aparecem no prompt. Isso responde "qual o método do texto 3?" e **não** responde "o que esses 10
textos dizem em comum sobre X" — que é a pergunta acadêmica de verdade. Tem teste exatamente dessa
assimetria: 8 trechos ótimos de um documento + 1 de cada um de outros três, e no top-8 plano os três
desaparecem.

**ISTO NÃO É RAPTOR, e é melhor dizer.** O RAPTOR (parthsarthi03/raptor, ICLR 2024) embute,
**clusteriza e resume recursivamente** numa árvore **persistente**, e a busca puxa de vários níveis.
Fazer isso aqui exigiria reindexar toda a base e manter a árvore viva — e o dono já decidiu, no plano
do documento, que o RAPTOR fica **opcional**. O que entregamos é a mesma ideia de "vários níveis",
montada **por pergunta** e jogada fora depois: uma consulta mais larga (`K_AMPLO = 40`), reagrupada
por documento, e uma síntese cruzada em cima. Sem índice novo, sem reindexação — e o nível fino (os
trechos crus) **continua no prompt**, então o rascunho passa a ver os dois níveis.

**A SÍNTESE MORA NA FASE `reason`, e essa é a descoberta da fase.** Aquela fase existe desde o começo
("conecte a evidência ao objetivo antes de redigir") e está **desligada** no caminho elaborado desde
out/2026, porque a chamada extra custava ~1,7 s e **não melhorava a resposta** (eval em prod). O
achado é que ela não melhorava a resposta de **um** documento — com vários, é exatamente o que
faltava. Então em vez de uma fase nova no motor, a `reason` fica **especializada** quando (e só
quando) há 2+ documentos. Zero caminho novo no motor, e o resultado entra no `Raciocínio:` que o
rascunho já recebia.

**O que a síntese devolve:** o que os documentos **convergem**, onde **divergem** (o item mais
valioso — e o prompt proíbe inventar divergência: lista vazia se não houver), uma frase **por
documento** sobre o objetivo, e as **lacunas**. A lacuna vem com instrução explícita de *não*
preencher com conhecimento geral como se viesse dos documentos — é a disciplina da F0 aplicada a
conteúdo, não a ação.

**O anexo conta junto com a base.** Dois anexos sintetizam; um anexo + um documento da base também.
E o anexo vem **primeiro** no prompt: é o documento que a pessoa acabou de dar. Dele entra só o
começo do texto — o conteúdo inteiro já está na evidência via `ler_anexo`, e repetir pagaria duas
vezes pelo mesmo texto.

**A armadilha que quase quebrou as citações.** `blocoDaBase` numera os trechos `[B1]..[Bn]` **por
posição** e o modelo devolve `citacoes_base: [n]`. Mandar a lista larga de 40 para o prompt
**desalinharia toda citação do documento** — a resposta citaria "(Título, p. N)" do trecho errado. Por
isso a consulta larga serve **só** à síntese, e o bloco de citação recebe `trechosParaCitar()`, que é
o top-k de sempre. Tem teste de que essa lista é **idêntica** à que o caminho sem F4 usaria.

**Custo:** +1 chamada de modelo, e **só** em turno com 2+ documentos em jogo. A consulta larga é
SQL — sem modelo e sem embed novo, porque o vetor da pergunta é o compartilhado. A síntese roda com
`pensar: "low"` (nova fase `sintese` em `lib/llm/pensar`): diferente da `acao`, aqui raciocinar
**ajuda**, porque a tarefa é achar convergência e divergência entre textos, não escolher num menu.

**Gates:** 1622 testes (+42 nesta fase: 11 no agrupamento, 19 na síntese pura, 12 na ligação);
`tsc --noEmit` limpo; `eslint` 0; os dois YAML validados. Os testes de `lib/rag` passaram sem
alteração — o `k` novo em `baseParaTurno` é opcional e, ausente, mantém `K_PADRAO`.

### F5 entregue — e a dependência que eu NÃO commitei

**O que faltava não era o cliente.** `lib/agent/mcp.ts` está escrito desde o PASSO 7 — cliente,
handshake, mapeamento pra `ToolDef`, dois canais de erro, catálogo — e **nunca era chamado por
ninguém**. O modelo `Connector` existe no Prisma e também nunca era lido. Esta fase é a **ligação**:
`lib/agent/mcp-boot.ts` (no padrão de `memory-boot.ts`), chamado pelo `instrumentation.ts`, com o
estado no `/api/health` — que é por onde o smoke-test do dono acontece.

**🔴 A POLÍTICA QUE A FASE OBRIGOU: no chat, só entra tool de LEITURA.** Não é zelo, é um buraco
real que a ligação ingênua abriria. O `permit()` só exige aprovação para `write` quando
`execMode === "guiado"`, e o chat roda em **`"auto"`**. Então uma tool MCP de escrita entraria no
registry e **rodaria sem aprovação, escolhida pelo modelo a partir de uma conversa** — que é
exatamente o caminho de injeção indireta do advisory do §5.1. Com `filesystem` ou `git` no catálogo,
isso é escrita no container. `toolsAdmitidas()` filtra **no registro**: tool recusada não existe pro
`permit`, nem pro cardápio da F0, nem pro menu da F2 — é ausente, não "negada depois".

**Escolha só pelo CATÁLOGO, nunca endpoint solto no env.** `MCP_CONECTORES="fetch,git"` resolve
nomes de `MCP_CATALOG`; qualquer outra coisa (inclusive uma URL) é ignorada e logada. Endpoint
arbitrário vindo de env daria ao modelo uma superfície que ninguém revisou — acrescentar um servidor
é uma linha no catálogo, num PR que alguém lê.

**Conecta UMA vez, no boot.** O handshake de um servidor stdio custa segundos (o `npx` pode até
baixar o pacote na primeira vez); pagar isso por turno seria inaceitável. A execução já abre o
cliente por-chamada.

**A F0 continua coerente com o MCP, e isso exigiu duas coisas:**
- `ClasseDeAcao.tambemPor`: um conector entrega a capacidade com **outro nome**
  (`mcp:git:git_log`, não `clonar_repo`). Sem isso o cardápio diria "não leio repositório" com um
  servidor de git no ar — a F0 mentindo pelo avesso.
- `descricaoSegura()`: a descrição da tool é escrita **pelo servidor** e ia entrar no **nosso system
  prompt**. É vetor de injeção, então vira uma linha só, com teto — a mesma disciplina do texto
  oculto no Leitor.

**Defeito que o próprio log revelou:** o boot mostrava a mensagem *amigável do aluno* ("Tô sem
conexão com o núcleo…") no lugar do motivo. Inútil num smoke-test, onde o dono precisa ler
`ECONNREFUSED`. Agora `ConnectorHealth` carrega os dois: `error` (tela) e `motivo` (ops).

**🔒 A DEPENDÊNCIA: medida, e deixada para você.** O gate 4 do §7 dizia "exige
`npm i @modelcontextprotocol/sdk`". Medi antes de commitar:

- O dry-run inicial dizia "172 pacotes", mas **não era o SDK**: `sharp` já é dependência nossa
  (`^0.35.5`, 171 entradas `@img/sharp-*` no lockfile) e o dry-run estava reconciliando a árvore.
- O SDK de verdade traz **17 dependências diretas**, e entre elas **`express` 5, `hono`, `cors`,
  `express-rate-limit`, `jose`** — a metade **servidor** do SDK, que nós **não usamos**: só
  precisamos do cliente (`client/index.js`, `client/stdio.js`, `client/streamableHttp.js`).

Então **não acrescentei ao `package.json`**. O módulo já funciona sem ele: `connectMcp` importa por
specifier em variável (o tsc não resolve, o bundler não empacota), `sdkPresente()` detecta a
ausência, e o boot diz o comando que falta em vez de encher o log de falhas de handshake. O
`/api/health` reporta `mcp: "sem_sdk"`.

Reimplementar o handshake à mão foi considerado e **descartado**: o cabeçalho de `mcp.ts` diz, desde
o PASSO 7, que o handshake mora só em `connectMcp` justamente pra que uma mudança da spec seja uma
função — e a spec do MCP se move. Melhor pagar `express` sem usar que manter um cliente de protocolo
próprio.

**Para ligar** (um comando e uma Variable): `npm i @modelcontextprotocol/sdk` → Variable
`MCP_CONECTORES=fetch` (comece por um) → `curl .../api/health` e leia o campo `mcp`. O boot loga
quantas tools entraram e **quais foram recusadas por risco**.

**Limites honestos, registrados:**
- **Servidor sem `annotations` não contribui tool nenhuma.** `riskFromAnnotations` devolve `write`
  sem hint, e a política só aceita `read`. É conservador de propósito, e o boot loga o que caiu pra
  você ver em vez de adivinhar.
- **Annotations são hints do servidor** — confiar nelas é confiar em quem você escolheu no catálogo.
  A fronteira de confiança real é essa escolha: um servidor stdio roda como **subprocesso do
  container**, então servidor malicioso é problema antes das annotations. A política é a contenção do
  que o **modelo** pode pedir, não defesa contra o servidor.
- **Primeiro boot pode falhar o handshake** enquanto o `npx` baixa o pacote do servidor.
- O modelo `Connector` do Prisma continua **sem leitor**: ligar o catálogo a uma UI de admin é outra
  fase, e por isso a escolha hoje é por env.

**Gates:** 1650 testes (+39 nesta fase: 17 no boot, 4 na política de risco, 6 no cardápio com MCP);
`tsc --noEmit` limpo; `eslint` 0; os dois YAML validados.

**Deslize recorrente, agora pego na hora:** o `vitest` passou com 1650 testes enquanto o `tsc`
acusava um `import` duplicado — o esbuild apaga tipos e não liga. É a terceira vez nesta série que a
ordem importa: **teste primeiro, `tsc` depois**, sempre antes do commit.

### F6 entregue — o teto por tarefa, e o caminho de volta que o laço não tinha

Esta fase nasceu de uma pergunta do dono: *"nossos agentes estão em níveis baixos de harness na
prática"*. A auditoria mostrou que o problema **não era largura** — 12 tools próprias + 9 do scholar
MCP é cardápio suficiente — e sim **profundidade**: duas coisas no laço, as duas mensuráveis.

**1 · O teto era um número só pra tarefas que não se parecem.** `VOLTAS_ACAO_PADRAO = 2` pagava a
mesma conta pra "quem escreveu tal livro?" e pra um TCC com referências obrigatórias. Agora o teto é
`VOLTAS_POR_INTENT` (lib/agent/aura-harness), e o que autoriza cada número é o **orçamento do modo**
(`BUDGET` em lib/agent/trajectory), não gosto. Medido com o adaptador real, modelo pedindo mais a
cada volta:

| intenção | modo | teto | voltas gastas | tokens / orçamento |
|---|---|---|---|---|
| `criar_trabalho` | research | **5** | 5 | 19.000 / 40.000 |
| `revisar` | research | **3** | 3 | 12.900 / 40.000 |
| `pesquisar_fontes` | elaborated | **2** | 2 | 10.200 / 12.000 |
| `explicar_conceito` | elaborated | 2 | 2 | 10.600 / 12.000 |
| `buscar_livro` | elaborated | **1** | 1 | 6.700 / 12.000 |
| `conversa` · `duvida_rapida` | quick | **0** | — | o laço nem chega no `gather` |

A linha que ensina é a do `pesquisar_fontes`: **não subiu**. Uma 3ª volta custaria ~1,6k sobre os
10,2k medidos, estouraria os 12k do `elaborated` e trocaria a revisão por coleta no escuro. Subir o
teto sem subir o orçamento seria escrever um número que o ledger desfaz — a mesma mentira do
`${FLAG:-0}` no compose (§8.1), só com outra roupa. O teste `pesquisar_fontes fica em 2` existe pra
que isso continue sendo verdade medida, e não comentário.

O teto DURO do motor subiu de 4 pra 6 (`MAX_VOLTAS_GATHER`), senão seria ELE o limite de verdade e
as 5 voltas do trabalho seriam truncadas em silêncio. `HARNESS_VOLTAS_ACAO` continua valendo pra
**todas** as tarefas quando setada: é a alavanca cega do dono, e quem a usa está dizendo "não me
interessa a tarefa". Em prod ela chega vazia (`${HARNESS_VOLTAS_ACAO:-}`), que o código trata como
AUSENTE — a correção de vazio-não-é-zero que já estava lá é o que faz a tabela valer.

**2 · O `critique` não tinha caminho de volta pro `gather`.** O laço era
`gather → reason → draft → critique → (revisa? volta pro reason)`. Então um veredito **"afirmação sem
fonte"** era respondido reescrevendo o mesmo texto **sem nenhuma fonte nova**: a revisão não tinha
como ir buscar. `nextTools` só devolve passos na 1ª iteração, e era literalmente isso.

Agora a crítica pede, e o pedido é contido por desenho:

- só `tipo: "sem_fonte"` conta (`lacunasDeEvidencia`) — `confuso`/`raso` se resolvem reescrevendo, e
  pedir ferramenta pra eles seria gastar volta sem mudar nada;
- **uma vez por turno** (`MAX_VOLTAS_EVIDENCIA = 1`), e o pedido é **consumido** no topo do laço, pra
  não virar estado grudento;
- o pedido passa **na frente do `maxIter`** — tem que passar: com `maxRevisions: 1`, que é a maioria
  das intenções, o laço pararia ali e o pedido nunca chegaria a existir;
- `overBudget` vem antes: sem orçamento não se concede nada;
- sem a dep `passosDeEvidencia` (adaptador sem a flag `HARNESS_ACAO`), o motor não concede e o laço é
  o de antes, byte a byte.

Duas decisões que valem registro. A primeira: a volta dirigida **não** respeita o teto por tarefa, de
propósito — um turno que gastou todas as voltas e ainda assim escreveu sem lastro é exatamente o que
precisa da última tentativa, e negá-la pelo mesmo contador que já falhou seria garantir o defeito. A
segunda: o prompt da volta dirigida **inverte o viés**. A volta normal existe pra ser dispensada ("na
dúvida, `pronto: true`", lib/agent/acao); nesta o veredito já disse que falta fonte, então o padrão é
BUSCAR, e as lacunas vão no prompt sob `O QUE A REVISÃO APONTOU:`.

E `degraded` deixa de valer quando a volta dirigida acha fonte. Não é rótulo: `degraded` é o que
impede a resposta de ir pro cache (lib/agent/runChatTurn), e uma resposta que **agora** tem fonte é
guardável. Se a volta dirigida também vier vazia, continua degradada — nada de sucesso silencioso
(A3).

**Gates:** `tsc --noEmit` limpo, `eslint --quiet` 0, suíte cheia verde, +20 testes novos
(`lib/agent/harness-evidencia.test.ts`). Os de borda usam deps cruas; o de ponta a ponta usa o
**adaptador e o examiner REAIS** — só `genJson` e `runTool` são falsos — porque é assim que defeito de
fiação aparece. Foi um teste com `critique` injetado que escondeu o defeito do bundler no MCP (§8.3d),
e a primeira versão deste teste falhou por culpa do **meu falso**, não do código: o plano do
`criar_trabalho` dispara vários passos, então a evidência chegava já na 1ª rodada e não havia
`sem_fonte` nenhum pra crítica apontar.

**O que esta fase NÃO faz.** Não mexe no orçamento de nenhum modo, não mexe nos prazos do `draft`
(30 s / 90 s), e não toca no trilho do documento (`lib/tcc/gerar` + `lib/documento/escritor`), que tem
o laço próprio dele (`TENTATIVAS_POR_SECAO`). O conector MCP **por usuário** — que destravaria o
`zotero-mcp` — segue de fora: hoje `process.env[config.authRef]` é uma credencial global por conector,
e isso é mudança de arquitetura, não de teto.

### F6b · a auditoria de profundidade (2026-11-04): onde o harness é raso DE VERDADE

Pedido do dono: *"verifique nossa prod e as capacidades agênticas dos nossos modelos"*. O estado de
prod saiu do recibo do deploy #554 (`82a8c25a`, 18:40:59 UTC), lido de dentro do container — tudo ON,
`mcp=on (9 tools)`, `leitor=on`. O resto desta seção é o que a leitura do código mostrou, e **nada
disso é sobre tool nem sobre teto de volta**:

**1 · O "reasoning sandwich" NÃO EXISTE em produção.** O desenho (§11.1, e o cabeçalho do
`trajectory.ts`) diz que as fases pesadas — `plan` e `critique` — rodam no Pro e o resto no Flash. O
código que escolhe é um só:

```ts
const modelFor = (heavy) => opts.modelo || (opts.deepThink && heavy ? GEMINI_MODEL_PRO : GEMINI_MODEL_FLASH);
```

`opts.deepThink` é **declarado, lido aqui, e nunca setado por ninguém** — nenhum caller do
`buildHarnessDeps` passa esse campo. E `opts.modelo` chega preenchido sempre que o aluno está num
modelo Google do composer (o padrão é `gemini-3.5-flash`), e **curto-circuita a expressão inteira**.
Resultado medido: ou todas as fases rodam no Flash, ou — se o aluno escolhe "Gemini 2.5 Pro" na
pílula — **todas** rodam no Pro. A granularidade por fase, que é a ideia do sandwich, não acontece em
nenhum dos dois casos. É configuração morta, da mesma família do `notebook_read` que já foi limpo do
`INTENTS`.

**2 · O crítico não é um modelo.** `critique: (st) => Promise.resolve(critiqueForState(st))` — o
examiner é 100% determinístico e puro (e o próprio arquivo diz que um scorer LLM "pode ser INJETADO
depois"). A fase que o desenho chama de *reasoning-heavy* é uma rubrica de checagens baratas. Isso
explica por que o sinal que a F6 usa é tão grosso: `checkSemFonte` só dispara quando
`sourceCount === 0` — "nada está ancorado", não "esta afirmação está sem fonte".

**3 · `reflections: 2` e `ensemble: 2` são decoração.** Estão no `INTENTS` do `criar_trabalho` e do
`revisar`, o examiner os copia pro veredito (`reflections: spec.reflections`) e **ninguém os lê**.
Nenhuma auto-reflexão roda, nenhum review é agregado. `integrity: []` tem o mesmo status, com um
comentário de "fase posterior" que não chegou.

**4 · A `reason` é pulada no caminho comum.**
`pulaRaciocinio: (st) => !vaiSintetizar() && st.mode === "elaborated" && env.RACIOCINIO_ELABORADO !== "1"`
— e isso é CORRETO, foi eval de out/2026: com um documento a `reason` não melhorava a resposta. Mas
significa que, num turno `elaborated` típico, a sequência é `route → plan → gather* → draft →
critique(heurística)`. **Uma** chamada de modelo é o rascunho.

Somando: das 7 fases, no turno comum, quatro chamam modelo (`route`, `plan`, `acao` por volta,
`draft`), todas no mesmo Flash, com `pensar` em `minimal` em três delas (lib/llm/pensar). A
profundidade do harness hoje está na LARGURA da coleta — que a F6 aumentou de 2 pra 5 voltas onde
importa — e não no julgamento, que não tem modelo nenhum.

**Portão do dono, não meu:** ligar o Pro nas fases pesadas (ou um scorer LLM no examiner) muda o
custo por turno e envolve decidir quem paga por isso — `lib/plans` dá `deep: "none"` pro free,
`"daily"` pro plus e `"unlimited"` pro pro. Fica registrado, não feito.

**O que mudou junto com esta auditoria:** o `/api/health` passou a publicar `voltasPorTarefa` e
`modelo: { flash, pro }`, e o recibo do deploy imprime os dois. Sem a primeira, o recibo diria "2
voltas" pra tudo depois da F6 — e recibo que mente é pior que recibo que falta (§8.4b). Sem a segunda,
"qual modelo está no ar?" não tinha resposta sem SSH, porque `GEMINI_MODEL` vive no `.env` do VPS e
não no repositório.

### F7 entregue — o Pro ligado, e os dois no-ops que estavam no caminho

Decisão do dono depois da auditoria F6b: *"liga o pro nas fases pesadas"*, e, perguntado onde e pra
quem, escolheu **`plan` + síntese do harness** e **as seções do TCC**, para **plus e pro**. O `draft`
do chat e um crítico LLM ficaram de fora.

**Ligar não era mexer numa flag — era consertar dois no-ops.** O primeiro já estava descrito na F6b:
`opts.deepThink` nunca era setado. O segundo só apareceu ao medir antes de escrever, e é o que
tornaria a correção inútil: **`opts.modelo` vem SEMPRE preenchido.** O composer manda o id da pílula
e o padrão dela (`MODELO_PADRAO = MODELOS_CHAT[0].id`) é um id concreto, não ausência — então o
`opts.modelo ||` curto-circuitava a expressão inteira, e passar `deepThink` não mudaria nada. Essa
medição, feita antes de uma linha de código, é a diferença entre consertar e achar que consertou.

A precedência nova, em três degraus:

1. **Escolha explícita no composer** (qualquer uma que não seja a pílula padrão) manda em TODAS as
   fases. Quem escolheu Flash-Lite por velocidade não recebe Pro por trás; quem escolheu Pro recebe
   Pro em tudo, rascunho incluído. Pedido do aluno vence política da casa.
2. **Na pílula padrão** — que não expressa preferência nenhuma — as fases de `FASES_COM_PRO` de quem
   tem direito vão pro Pro.
3. O resto é Flash.

Para isso existir foi preciso um campo novo, `modeloEhPadrao`: o cliente manda um id concreto nos
dois casos, então "não escolhi nada" e "escolhi justamente este" chegavam **idênticos** ao servidor.

**O booleano `heavy` virou fase nomeada, e isso foi conserto, não estilo.** `modelFor(true)` agrupava
`plan`, `sintese` e `draft` — três fases com custos e consequências diferentes. Eu cheguei a
implementar a decisão com o booleano e **estava dando Pro ao `draft`, que o dono não pediu**; só
nomear a fase (`FASES_COM_PRO = {plan, sintese}`) tornou a política escrevível e o erro visível. O
`draft` fica fora porque a latência da 1ª palavra foi afinada com eval em out/2026 ("as respostas
estão lentas", 0,99 s medido), e o Pro desfaria isso justamente na fase que o aluno espera olhando a
tela.

**A segunda trilha é onde a qualidade do documento mora — e ela não é o harness.** `lib/tcc/gerar.ts`
escreve cada seção fora do `modelFor`, e o que estava lá não era o Flash: com o gateway de pé, era
`MODELO_POOL` = `zaeon-pool-lite`, o grupo de **provedores grátis de terceiros**. O
`GEMINI_MODEL_FLASH` do código só valia com o gateway fora. Então "as seções do TCC estão no Flash"
era falso, e ninguém ligando flag no harness jamais mudaria aquele ponto.

Duas coisas que esse trilho exigiu, e uma delas pioraria o produto se esquecida:

- **O Pro exige `rota: "vertex"`**: `zaeon-pool-lite` é um grupo do LiteLLM com outros modelos
  dentro, não um caminho pro Pro. Quem tem direito troca pool grátis por Vertex **pago** — é o custo
  aprovado, e ele desaparece com `PRO_PESADAS=0`.
- **O prazo tinha de dobrar.** 60 s por seção foi medido pro Flash; o Pro pensa mais antes de
  escrever. Mantido em 60 s, a seção estouraria e cairia na **marca de falha** do escritor — ou seja,
  ligar o Pro trocaria texto por buraco, e as duas tentativas por seção não salvariam (a segunda
  estoura igual). Vai pra 120 s com Pro. A decisão (rota + modelo + prazo) saiu de dentro do gerador
  para a função pura `planoDaSecao`, porque `gerarPorSecao` não é testável — oito imports dinâmicos,
  Prisma, envelope — e função pura é a parte que dá pra provar.

**Elegibilidade (`lib/ai/proNasPesadas`)**: deriva de `planCapabilities().deep !== "none"` em vez de
listar planos à mão, para não existirem duas definições de "quem paga pelo caminho profundo"
envelhecendo em separado. Plano pago **expirado** cai pra free (`effectivePlan`), e `deepThinkEnabled`
segue como override manual. **Falha FECHADO**: banco fora, id inválido, qualquer erro → Flash. O
caminho caro nunca é o padrão de um acidente. Memo de 60 s para não consultar o banco a cada turno.

**O Plus é contínuo, e isso é decisão do dono — CONFIRMADA, não suposição minha.** A cota
`deep: "daily"` (1×/dia) continua valendo só para o botão Pensamento Profundo; neste caminho o Plus
recebe o Pro continuamente e **não consome** essa cota. Eu implementei assim porque uma cota diária
não divide por seção (um documento tem ~8) e levantei a dúvida; perguntado em 04/nov/2026, o dono
respondeu *"deixa o plus contínuo, não mexe"*.

Então `deep !== "none"` em `planoDaDireitoAoPro` **é intencional**: quem, lendo isto depois, pensar em
"apertar" para `deep === "unlimited"` estaria desfazendo uma escolha de produto, não corrigindo um
descuido. A distinção entre Plus e Pro neste ponto é deliberadamente nenhuma.

`deepThink` saiu do `HarnessOpts`. Era declarado, lido num único lugar e nunca setado — a mesma
configuração que mente da `notebook_read`, e deixá-lo de enfeite ao lado do campo que funciona seria
plantar a próxima confusão.

**O defeito que eu introduzi, e que só o CI pegou.** A elegibilidade é leitura de banco, e eu a pus
**bloqueante no caminho do turno**. Com o Mongo inalcançável — que é o caso do CI, onde
`MONGODB_URI` é `mongodb://placeholder:27017/build` — cada turno parava **5 s** no DNS antes de falhar
fechado: 12 testes de `runChatTurn` vermelhos e `getaddrinfo ENOTFOUND placeholder` no log, com
`unhandledRejection` sobrando. Em produção seria pior que teste vermelho: Mongo lento atrasaria
**toda** resposta antes da 1ª palavra, e o recurso que deveria melhorar a qualidade pioraria a
latência de todo mundo, inclusive de quem não tem direito a ele.

O conserto não foi mexer no teste. Escolher modelo é decisão **acessória**: quem não responde em
250 ms recebe "Flash" e o turno segue (`PRAZO_MS`). Três detalhes que a correção exigiu:

- a promessa perdedora da corrida leva `.catch` obrigatório, senão a rejeição dela vira
  `unhandledRejection` — era o que aparecia no log do CI junto das falhas;
- o resultado do **timeout não entra no memo**: um soluço de 250 ms não deve colar Flash por 60 s;
- a resposta **atrasada** entra no memo quando chega, então o próximo turno já a encontra pronta.

E a lição de processo: **minha suíte local não reproduzia o CI.** Passei 5942 testes aqui e o CI caiu
em 12, porque o CI exporta `MONGODB_URI` de placeholder e eu não. A suíte agora foi rodada com o
mesmo bloco `env:` do `ci.yml`, e é assim que ela deve ser rodada quando a mudança toca banco.

**Gates:** `tsc` limpo, `eslint --quiet` 0, dois YAML validados, suíte cheia verde **com o `env:` do
CI reproduzido** (5944 testes), +19 testes novos.
O de modelo-por-fase (`aura-harness.pro.test.ts`) é o que faltava desde sempre: **nenhum teste
olhava qual modelo cada fase pedia**, e é só por isso que um sanduíche inexistente passou meses
documentado como existente. A guarda contra passe no vácuo desse arquivo corrigiu o próprio
comentário que eu havia escrito: o turno dispara QUATRO fases, não duas (`reason` não é pulada no
modo `research`).

**Fiação da flag:** `PRO_PESADAS` percorre os cinco elos (env do job → `envs:` do ssh-action → o
`for k in` que escreve o `.env` do VPS → compose `web` → compose `worker`). Sem os cinco, o
kill-switch não existiria em produção — é a lição do §8.1, aplicada antes de doer.

### F7b · "libera o pusher no deploy" — e as três naturezas que pareciam a mesma

Pedido do dono depois da auditoria de flags: *"eu preciso dessas flags on. e libera o pusher no
deploy"*. As coisas que eu havia listado como "off" não eram o mesmo tipo de coisa, e tratá-las
igual teria dado errado de três maneiras diferentes.

**1 · Pusher — era isto que estava de verdade desligado.** O tempo real da colaboração (D6/D8)
exige quatro envs, e `getPusher()` devolve `null` sem qualquer uma delas; nenhuma passava pelo
workflow. Mas elas têm DUAS naturezas, e a cadeia é diferente para cada:

- `PUSHER_APP_ID` e `PUSHER_SECRET` são **server-only** → Secrets do GitHub → gravadas no
  `.env.secrets` do VPS (que vence o `.env`), no molde do Resend: **só com valor**, porque linha
  vazia apagaria a que já estava lá e derrubaria o tempo real em vez de subi-lo;
- `NEXT_PUBLIC_PUSHER_KEY` e `NEXT_PUBLIC_PUSHER_CLUSTER` são **embutidas no bundle no BUILD** →
  Variables → exportadas no laço `for k in` (que alimenta os `args:` do compose) **e** no
  `environment:` dos serviços, porque o servidor também as lê em runtime.

Pôr as quatro no mesmo caminho teria falhado silenciosamente: as públicas sem o build-arg não
chegariam ao navegador, e as secretas como Variable ficariam no log.

**2 · `RACIOCINIO_ELABORADO` — ligada, com a ressalva registrada.** O código pula a fase `reason` no
modo `elaborated` por eval de out/2026 (com um documento ela não melhorava a resposta e custava
latência). Ligada por decisão do dono: `${{ vars.RACIOCINIO_ELABORADO || '1' }}`. Custo: +1 chamada
Flash antes do rascunho em todo turno elaborado. Reverter é a Variable em `0`, sem deploy de código.

**3 · Os workers NÃO eram features desligadas, e por isso não foram ligados.** `SCHOLAR_WORKER`,
`CANAL_WORKER`, `CHORES_WORKER` e `CANAL_QUEUE` escolhem TOPOLOGIA, não comportamento: sem eles o
trabalho roda **inline no web**, que é o que acontece hoje e funciona. Ligá-los no `web` faria o
mesmo container enfileirar E consumir — o desenho quer o serviço `worker` dedicado (`profiles:
["worker"]`), e o próprio deploy trata "o worker está de pé?" como estado que o dono escolhe
(`docker ps | grep zaeon_worker`). Ficaram **alcançáveis** (Variable preenchida chega no container) e
não ligadas. Ligar um worker é subir o serviço, não virar flag — e isso é operação, não código.

**O recibo ganhou a linha que faltava.** `pusherFaltando()` devolve os **nomes** das envs ausentes,
nunca os valores, e o `/api/health` publica `tempoReal: "on" | { faltando: [...] }`. Sem isso,
"a colaboração está no ar" e "a colaboração é instantânea" continuariam indistinguíveis de fora — e
eu não tinha como confirmar a segunda pro dono, só supor. Nome de env não é segredo; valor é, e um
teste afirma exatamente isso.

**O que ainda depende do dono:** os valores. Eu plumbei a cadeia inteira, mas `PUSHER_APP_ID` e
`PUSHER_SECRET` são Secrets e `NEXT_PUBLIC_PUSHER_KEY`/`_CLUSTER` são Variables que só ele cria. Até
lá o recibo dirá `tempo_real(pusher): off — faltam …`, que é a verdade, e a colaboração segue no poll.

## 7. 🔒 Portões do dono

Decisões que eu **não** tomo sozinho, porque mudam contrato de produto ou gastam dinheiro:

1. ~~F2 sobe o custo e a variância; precisa de teto.~~ **Entregue com teto e com número:** no pior
   caso **+2 chamadas de modelo** por turno (`HARNESS_VOLTAS_ACAO`, default 2; `0` desliga as voltas
   mantendo a F2). O que sobrou pra você é só decidir se 2 é o número certo depois de ver em prod —
   é uma Variable, não um deploy. Vale medir o log `[harness] ação volta N: <tools>` e a taxa de
   `ação descartou` (modelo pedindo coisa que não existe).
2. ~~Allowlist de domínio no começo?~~ **Respondido pela auditoria da F1:** o Leitor já é
   default-deny. Ligar a F1 em prod são **três** passos, e o terceiro é o que falta decidir:
   Variable `LEITOR_PROXY_URL=http://leitor-proxy:8787`, Variable `LEITOR_ALLOW=<domínios>`, e subir
   o container (`docker compose -f docker-compose.beta.yml --profile chores up -d leitor-proxy`) —
   com a allowlist **vazia nenhum domínio sai**, então a lista inicial é decisão sua.
2b. ~~Como `baixar_para_base` busca os bytes?~~ **Decidido pelo dono: opção (a)** — o Leitor serve
   bytes. Entregue na F1b. O que sobrou de dívida é de **rede**, não de código: nada em camada de
   rede impede o processo `web` de fazer `fetch` direto (§5.1); hoje a garantia é a lei no código e a
   revisão. Fechar isso é política de egresso no VPS.
3. **Teto de arquivos por conversa.** O dono já fixou **10 por documento** no plano do documento;
   confirmar se vale o mesmo teto para o chat.
3b. ~~**Cobertura garantida por documento na busca da base**~~ **PAGA (2026-11-03, a pedido do
   dono).** `montarSql` ganhou um teto OPCIONAL por documento: `row_number() OVER (PARTITION BY
   documento_id …)` cortando ANTES do `LIMIT` global. Só a consulta LARGA o usa — sem o parâmetro o
   SQL é byte a byte o de antes, porque é o top-k plano que numera `[B1]..[Bn]` nas citações e não
   pode mudar de forma. O teto entra como PARÂMETRO, não interpolado. Três testes contra o Postgres
   de verdade provam a garantia (documento dominante deixa de empurrar os outros; documento único
   não ganha linha inventada; a permissão continua valendo) — e eles rodam no CI, porque este
   container não tem pgvector. O texto original da dívida, pra quem for ler o histórico:
   `K_AMPLO = 40` é teto de RESULTADO, não garantia: em teoria um documento longo pode ocupar os 40
   e empurrar outro para fora do agrupamento. O que ele não consegue é dominar o prompt
   (`TRECHOS_POR_DOC = 3` corta por documento), então o ganho da F4 vale pra todo documento que
   APAREÇA. Garantir de verdade é **k por documento** — uma window function por `documentoId` no
   SQL —, e a F4 foi desenhada como UMA consulta, sem índice novo e sem reindexação (§4.3). Pagar
   essa dívida é decisão sua: muda o formato da consulta, não uma flag.
4. ~~F5 exige instalar o SDK.~~ **Medido duas vezes, e a 2ª corrige a 1ª.** Eu havia escrito "17
   dependências diretas"; instalando de verdade (`@modelcontextprotocol/sdk@1.32.2`), o que entra é
   **91 pacotes / 29 MB**, com a metade SERVIDOR (`express` 5, `hono`, `cors`,
   `express-rate-limit`) que não usamos. Por isso **não está no `package.json`**: o código funciona
   sem ele e o `/api/health` diz `sem_sdk`.

   **Mas a outra metade da conta mudou** (§8.3b): do outro lado estão **49 tools de leitura** que
   sobem de verdade, e 9 delas são do trilho de fontes/ABNT da série D — incluindo
   `validate_manuscript_citations`, que é literalmente o que o rigor do TCC faz à mão. Então a
   pergunta não é mais "vale `express` sem uso para ter conectores que não entregam nada", e sim:
   **vale peso de imagem para o `scholar`?**

   **✅ RESOLVIDO — o dono disse sim (§8.3c).** SDK e `scholar-mcp` pinados no `package.json`,
   `MCP_CONECTORES=scholar` por padrão nos cinco elos, kill-switch `=0`, e o `connectMcp` com smoke
   real no CI. Custo final medido: **+124 MB / 54 pacotes** (não os 29 MB do SDK sozinho). O
   `biomcp` fica de fora por enquanto — é nicho med/bio de verdade. **O que sobra é provar que as
   chamadas devolvem dado**, e isso exige a rede do VPS: ver o 🟡 no fim do §8.3c, incluindo o risco
   concreto de o Google Scholar bloquear IP de datacenter.

## 8. "Queremos tudo ON" (2026-11-03) — o que ligou, e a armadilha que quase anulou tudo

Pedido do dono, literal: *"ativa o HARNESS_CAPACIDADE e confirma no log do deploy, alem de todos os
outros updates. queremos tudo ON"*.

**Não existe tool de GitHub que escreva Actions Variables, e eu não tenho SSH no VPS.** Então
"ativar" não podia ser um clique meu: virou **padrão no código** com kill-switch. Toda flag das F0–F4
passou a `!DESLIGADO.test(...)` — ausente ou `1` liga, `=0` desliga:

| Variable | antes | agora | kill-switch |
|---|---|---|---|
| `HARNESS_CAPACIDADE` | off | **on** | `=0` |
| `HARNESS_ACAO` | off | **on** (2 voltas) | `=0` |
| `HARNESS_ANEXO` | off | **on** | `=0` |
| `HARNESS_SINTESE` | off | **on** | `=0` |
| `DOC_POR_SECAO` | off | **on** | `=0` |
| `LEITOR_PROXY_URL` | vazio | **`http://leitor-proxy:8787`** | vazio |
| `LEITOR_ALLOW` | vazio (nega tudo) | **9 padrões acadêmicos** | vazio |
| `MCP_CONECTORES` | vazio | **`scholar`** (§8.3c; era vazio até §8.3b) | `=0` |

### 8.1 A armadilha: o `docker-compose` anulava o código

Ligar no código **não bastava**. O compose passava `HARNESS_CAPACIDADE: ${HARNESS_CAPACIDADE:-0}` —
quer dizer: sem a Variable no repo, o container recebia a string **`"0"`** explícita, e o `=0` que eu
mesmo tinha acabado de definir como kill-switch desligava tudo. O default do código **nunca** seria
lido em produção. Os cinco `:-0` viraram `:-1`, **nos dois serviços** (`web` e `worker`) — e é por
isso que a mudança de uma linha em TypeScript custou dez linhas de YAML.

A lição é geral e vale pra qualquer flag deste repo: **um default no código só vale se o compose não
passar a variável.** Passar `:-0` é configuração, não ausência.

### 8.2 O Leitor ligado é uma decisão de segurança, e ela é sua

`LEITOR_PROXY_URL` sozinha não liga nada útil: com `LEITOR_ALLOW` vazia o Leitor é default-deny e
**nega todo domínio**. Então "tudo ON" exigiu escolher uma lista inicial, e eu escolhi a mais
conservadora que ainda serve a quem usa a plataforma pra estudar:

```
*.gov.br, *.edu.br, *.scielo.br, *.scielo.org, *.wikipedia.org, arxiv.org, doi.org, *.nih.gov, *.who.int
```

Nenhum domínio comercial, nenhum encurtador, nenhum host de upload. **Isto é um portão seu**: a
lista define a superfície de SSRF do produto, e cada `*.` novo é um pedaço de internet que o modelo
passa a poder ler.

**Trocar a lista é Variable `LEITOR_ALLOW` + recriar o `leitor-proxy`** — e o `proxy` é o que
importa, porque **a allowlist só é aplicada lá**. Recriar só o `web` NÃO tira acesso nenhum: o
`web` usa a sua cópia apenas pra decidir se registra as tools, enquanto o container antigo do
proxy segue de pé com a lista velha e continua liberando o domínio que você acabou de remover.
Achado do Sourcery na #672, e era um erro meu de instrução — justamente no passo de **retirar**
acesso, que é onde errar custa. Na dúvida, recrie os três (`web`, `worker`, `leitor-proxy`); nenhum
deles precisa rebuild.

Duas travas novas foram junto, pra que o *ON* não recriasse a mentira da F0:

- `registrarAbrirUrl`/`registrarBaixarParaBase` agora exigem **URL *e* allowlist**. Antes, só a URL
  bastava pra registrar a tool — e com a lista vazia o cardápio prometia "abro páginas" enquanto o
  Leitor negava tudo. Era exatamente o defeito D2, de volta pela porta da configuração.
- O `leitor-proxy` passou a subir **sem condicional** no caminho enxuto do deploy. Antes era
  opcional; com a tool ligada, container fora do ar = promessa sem lastro.
- Teste de drift no compose: a allowlist tem de ser **a mesma nos três serviços** (`web`, `worker`,
  `leitor-proxy`). Divergir é o `web` oferecer um domínio que o proxy nega.

### 8.3 O que eu NÃO liguei, e por quê: `MCP_CONECTORES`

Auditei o catálogo inteiro (`npm view` em cada endpoint, 2026-11-03) antes de ligar. **4 dos 7 não
sobem:**

| catálogo | veredito |
|---|---|
| `@oksure/openalex-research-mcp` | **E404** — não existe no npm |
| `@modelcontextprotocol/server-fetch` | **não existe** com esse nome (o oficial é Python) |
| `@modelcontextprotocol/server-git` | **não existe** com esse nome (o oficial é Python) |
| `paper-search-mcp` | precisa de **python**, que a imagem `node:20-bookworm-slim` não tem |
| `biomcp@1.6.0` | existe |
| `@modelcontextprotocol/server-filesystem@2.1.0` | existe |
| `scholar-mcp@1.2.0` | existe |

Os três que existem são **nicho** (biomédico, acadêmico) ou **inútil aqui** (`filesystem` = o disco
do container, que não é a base do aluno). E os dois que importariam de verdade — `fetch` e `git`, que
atenderiam "baixa isso" e "clona o repo" — **são os que não existem**. Somado ao SDK que o `/api/health`
reporta como `sem_sdk` e que traz 17 dependências (metade servidor: `express`, `hono`, `cors`), ligar
o MCP agora seria escrever "on" num campo que não entrega capacidade nenhuma.

Então as entradas furadas ganharam `indisponivel: "<motivo>"` e **são recusadas antes do handshake**
(cada stdio morto custava até 10 s de boot). Pedir `MCP_CONECTORES=fetch` hoje responde, no log, por
que não dá. Isso é o contrato da F0 aplicado ao próprio harness: **melhor um "não" com motivo do que
um "sim" que não acontece.**

### 8.3b A 2ª auditoria, por handshake real — e o parágrafo acima está ERRADO em dois pontos

Pedido do dono: *"verifique pq nosso mcp nao estao rodando"*. A resposta curta é que **três paredes
estão empilhadas**, e nenhuma delas é bug:

| parede | estado medido | quem derruba |
|---|---|---|
| 1 · **ninguém pediu conector** | `MCP_CONECTORES` é `${{ vars.MCP_CONECTORES \|\| '' }}` e a Variable não existe → `mcpLigado()` falso → `resumoMcp()` = `off` | uma Variable no repo |
| 2 · **o SDK não está na imagem** | `@modelcontextprotocol/sdk` não está no `package.json`, nem no lock, nem em `node_modules`. Com a parede 1 vencida, o recibo passaria a `sem_sdk` | `npm i` + decisão de peso |
| 3 · **o catálogo** | ver abaixo | um PR |

O encanamento está **completo** nos cinco elos (env do deploy → `envs:` → laço `for k in` → compose
`web` → compose `worker`), conferido linha a linha. Não falta fio: falta decisão.

**O que o handshake real mudou.** `npm view` prova que o pacote existe — não que o servidor sobe, nem
que a política de risco deixa alguma tool entrar. Instalei o SDK 1.32.2 numa sandbox e rodei
`initialize` + `tools/list` de verdade:

| servidor | tools | admitidas pela política só-leitura |
|---|---|---|
| `biomcp` | 43 | **40** — ensaios clínicos, patentes, GenBank, Ensembl, GTEx, preprint, métricas de revista |
| `scholar` | 10 | **9** — busca no Scholar, lista de referências, sugestão e **validação de citação** |
| `filesystem` | — | **morre no handshake** (`MCP error -32000: Connection closed`) |

Duas correções ao §8.3, e as duas são minhas:

1. **`filesystem` nunca subiria**, e o defeito é da linha do catálogo, não do servidor: o endpoint
   não passava diretório, e o servidor exige um por argumento ou pelo protocolo de *roots* — que o
   nosso `Client` não anuncia. Nenhum `npm view` acharia isso. Marquei `indisponivel` em vez de
   consertar: consertado, ele leria o disco do **container**, que não é a base do aluno. Apontá-lo
   para um diretório útil é decisão de produto, não conserto de catálogo.
2. **"não entregam capacidade nenhuma" era falso.** São 49 tools de leitura, e o `scholar` cai
   exatamente no trilho que a série D acabou de construir: `build_reference_list`,
   `suggest_contextual_citations`, `validate_manuscript_citations`, `get_author_info`. Isto muda a
   recomendação da decisão nº 8 — ver §9.4.

**A política de risco foi conferida contra servidor real e se comportou como desenhada:** recusou
`write_file`, `edit_file`, `move_file`, `create_directory`, `biomcp_configure`, `pdb`, `geo_get` e
`ingest_paper_fulltext`; admitiu só o que trazia `readOnlyHint`.

**O que NÃO está verificado, e não vou dizer que está:** se as chamadas devolvem **dado**. Os dois
servidores responderam `fetch failed` na sandbox porque o egresso dela recusa `scholar.google.com`,
`clinicaltrials.gov` e `api.semanticscholar.org`. Handshake e listagem estão provados; a busca em si,
não — e é o mesmo bloqueio de rede da decisão nº 1.

**Um buraco de recibo, achado lendo:** `resumoMcp` devolvia `on (0 tools)` quando um conector sobe e
a política recusa tudo. Imprimia o zero, então não mentia — mas "on" num recibo de deploy afirma
capacidade. Agora é `degraded (1/1, 0 tools)`, com teste.

### 8.3c Ligado: o SDK na imagem e o `scholar` ON (2026-11-03)

Decisão do dono depois do §8.3b: *"instala o SDK e liga o scholar"*.

**O que entrou, pinado exato:** `@modelcontextprotocol/sdk@1.32.2` e `scholar-mcp@1.2.0`.

**Custo medido, não estimado:** `node_modules` foi de **1645 → 1769 MB (+124 MB)**, 54 pacotes
novos. **88 MB disso são `pdfjs-dist` + `pdf-parse` + `@napi-rs`**, que servem só o
`ingest_paper_fulltext` — justamente a ÚNICA tool que a nossa política recusa. Pagamos peso por uma
tool que nunca vai rodar aqui. Único efeito colateral no lock: `dotenv` subiu 17.2.3 → 17.4.2
(dentro do range) e saiu de `dev` para produção, porque o scholar depende dele. Nenhum downgrade.

**🔴 Dependência pinada, NUNCA `npx -y` — e isto era um furo que o catálogo inteiro tinha.** Todas as
entradas nasceram como `npx -y <pacote>`, que baixa a **última** versão em tempo de boot: um release
comprometido passaria a rodar como subprocesso do container no próximo deploy, **sem PR, sem
revisão, sem lock**. A doutrina do catálogo — "acrescentar um servidor é uma linha num PR que alguém
lê" — só vale se a linha fixar O QUE roda. Agora o endpoint é
`node node_modules/scholar-mcp/dist/index.js`: a árvore toda fica no `package-lock.json`, o
`COPY --from=builder /app ./` do Dockerfile já leva o `node_modules`, e o processo (usuário `zaeon`,
uid 10001) não precisa de cache de npm nem de egresso pro registry. De quebra, boot determinístico
em vez de 124 MB de download disputando com o health-gate.

**O smoke que o `mcp.ts` dizia ser impossível.** O cabeçalho do arquivo avisava, desde o PASSO 7, que
"o SDK não está instalado neste ambiente e não há servidor MCP p/ smoke-test aqui" — e por isso
`connectMcp` nunca havia rodado, em teste nenhum. Agora roda: `lib/agent/mcp-real.test.ts` chama
`ligarMcp` **sem `connect` injetado**, contra o servidor do `node_modules`. Resultado real:

```
[mcp] scholar: 9 tool(s) de leitura registrada(s), 1 recusada(s) por risco: ingest_paper_fulltext (write)
resumoMcp → "on (9 tools)"
```

Ele **roda no CI** de propósito: como a versão está pinada, as contas (9 de 10) são um guarda — um
bump que mude as tools ou as annotations quebra o CI antes de chegar à produção.

**ON por padrão, com rollback.** `deploy.yml` passou a `${{ vars.MCP_CONECTORES || 'scholar' }}` e os
dois serviços do compose a `${MCP_CONECTORES:-scholar}` (web **e** worker — o worker roda o mesmo
`runChatTurn`, igual ao par do #670). Isso criou um problema que a §8.1 já tinha ensinado: com padrão
ligado, **"vazio" deixa de ser alcançável**, porque é exatamente o caso que cai no padrão. Ligar sem
rollback não é opção, então `MCP_CONECTORES` ganhou kill-switch — `0`, `off`, `false`, `nao`, `no`,
`nenhum` ou `none` —, no mesmo vocabulário do `graficoLigado`, e com o cuidado de o kill-switch não
virar "nome fora do catálogo" no log de boot.

**A rede de honestidade não mudou, e isso foi conferido.** Nenhuma das 5 classes de ação é "buscar
literatura" — a plataforma já faz isso pelo `literature_search` —, e o `tambemPor` das classes aponta
pra `mcp:fetch:` e `mcp:(git|filesystem):`, que não casam com `mcp:scholar:*`. Então o cardápio não
passou a prometer nada novo. As descrições das 9 tools entram no system prompt pelo caminho já
blindado (`descricaoSegura`, teto de 180 caracteres, uma linha) — servidor externo escrevendo no
nosso prompt é vetor de injeção, e esse guarda existia desde a F5.

### 8.3d O deploy #546 ligou o scholar e o recibo disse `mcp=off` — dois defeitos, nenhum onde eu procurei

Mergeado o #685, o deploy #546 passou e o recibo trouxe `mcp=off` **no meu próprio commit**. A
suspeita óbvia — a env não chegou ao container — estava errada. Rodando o **artefato buildado** aqui
(`next build` + `node server.js` com `MCP_CONECTORES=scholar`), o sintoma se reproduziu na primeira
tentativa, e o log do boot entregou o defeito:

```
[mcp] 1 conector(es) pedido(s), mas o SDK não está instalado — rode `npm i @modelcontextprotocol/sdk`.
[mcp] sem_sdk
```

O SDK estava em `node_modules`. E repare no segundo sinal, que vale tanto quanto o primeiro: o boot
dizia `sem_sdk` enquanto o `/api/health` do MESMO processo dizia `off`. Dois estados diferentes para
a mesma coisa. São **dois defeitos empilhados**:

**🔴 Defeito A, o que impedia o MCP de subir: o especificador em variável.** `lib/agent/mcp.ts`
importava o SDK assim, e com um comentário que explicava a intenção:

```ts
const clientMod: string = "@modelcontextprotocol/sdk/client/index.js";  // não-literal de propósito
const { Client } = await import(clientMod);
```

A intenção estava certa **enquanto o SDK estava ausente**: variável impede o `tsc` de tentar resolver
um pacote que não existe. Com o pacote presente, o truque virou o bug — **o webpack não consegue
analisar `import(variavel)`**, então resolve contra o próprio mapa de módulos, onde o SDK nunca
entrou justamente porque a variável o escondeu do bundler. `sdkPresente()` devolvia `false` com o
pacote instalado. O mesmo valia para `connectMcp`, que é onde o handshake mora.

Correção: especificadores **literais** + `@modelcontextprotocol/sdk` em
`serverComponentsExternalPackages` — exatamente o tratamento que o `next.config.mjs` já dava ao
Prisma, com a mesma justificativa escrita lá ("externo = Next não empacota, usa o require de
runtime"). Conferido antes de aplicar: o SDK é **dual CJS/ESM** e o `require` resolve, então vale no
Node 20 da imagem (o meu Node local é 22 e isso não bastaria como prova).

**🔴 Defeito B, o que fazia o recibo mentir: estado de boot em variável de módulo.** `estado` e
`ligando` do `mcp-boot`, e o `REGISTRY` do `runtime`, eram variáveis de módulo. O
`lib/agent/memory-provider.ts` **já documentava essa armadilha desde o L3**: "o boot
(instrumentation.ts) e as rotas do Next podem carregar CÓPIAS diferentes deste módulo no mesmo
processo". O `mcp-boot` não seguiu, e a consequência era dupla: o `/api/health` lia uma cópia onde
`estado` nunca deixava de ser nulo (daí `off` em vez de `sem_sdk`), e — mais grave — **uma tool
registrada no boot ficava invisível para a rota do chat**.

As tools do Leitor nunca sofreram disso, e foi por acidente: `registrarAbrirUrl()` roda no
CARREGAMENTO do módulo, então cada cópia registra a sua e todas parecem certas. A única tool que
entra pelo boot é a do MCP — e era justamente a que não chegava. Por isso `abrir_url=ON` era honesto
e `mcp=off` não.

Correção: os dois no `globalThis`, como o `memory-provider`. E **dois testes de regressão que falham
sem a correção** (`vi.resetModules()` + `import()` dá uma segunda cópia do módulo com o mesmo
`globalThis`, que é a situação do processo em produção): um prova que o que o boot grava a rota lê,
outro que a tool registrada no boot existe pro chat.

**Por que a suíte não pegou nada disso, e é a lição que fica.** Todos os testes de MCP injetam
`connect` ou `importar` — as costuras que tornam o código testável são **exatamente** as que
esconderam o defeito. Até o `mcp-real.test.ts`, que eu escrevi como "o smoke do caminho real", passa:
ele roda sob o vitest, onde `import(variavel)` funciona, porque não há webpack. **Só o artefato
buildado mostrava.** Nenhum teste unitário substitui rodar o que vai pra produção.

**O recibo ganhou o que faltava.** `mcp=off` não distinguia "ninguém pediu conector" de "pediram e
não funcionou" — e essa ambiguidade me custou um deploy inteiro de investigação. Agora o recibo
imprime também **a entrada** (`MCP_CONECTORES` como o processo a vê) e **as linhas `[mcp]` do boot**.
Qualquer das duas teria respondido na hora.

**🟡 O QUE AINDA NÃO ESTÁ PROVADO, e é o risco real desta entrega:** que as chamadas devolvam
**dado**. Handshake, listagem, política e registro estão provados; a busca, não — o egresso da minha
sandbox recusa `scholar.google.com`, `clinicaltrials.gov` e `api.semanticscholar.org`. E há um motivo
concreto para desconfiar: **o Google Scholar bloqueia IP de datacenter com agressividade**, então
`search_google_scholar_key_words` e `search_google_scholar_advanced` podem voltar vazias ou com
captcha a partir do VPS, enquanto as que falam com Semantic Scholar/Crossref
(`search_literature_graph`, `build_reference_list`) tendem a passar. **O `/api/health` não detecta
isso** — ele reporta `on (9 tools)` porque o handshake deu certo. A verificação é um turno de chat de
verdade pedindo referências, e ela depende da decisão nº 1 (liberar `zaeon.com.br` pra mim) ou de
você olhar.

### 8.4 O que a F2 do documento mudou de verdade ao ligar

`DOC_POR_SECAO=1` desviou `gerarTccEmBackground` pro caminho por seção — e **dois testes do caminho
antigo quebraram sem que uma linha de `lib/tcc` mudasse**. Era o sinal certo: o padrão de produção
tinha mudado. Os testes do caminho antigo passaram a pedir `DOC_POR_SECAO="0"` (é o que o
kill-switch devolve, então continua coberto) e entrou um teste novo que fixa o **desvio**: sem a
variável, só a F2 relê o documento, e nenhuma op do esboço antigo é gravada.

### 8.4b O recibo não pode mentir na janela de boot

Terceiro achado do Sourcery, e o cinto vale: o `instrumentation` chama `ligarMcp()` **sem `await`**
de propósito (um stdio fora do ar custa até 10 s de handshake por conector, e isso atrasaria o
readiness do container). Nessa janela de alguns segundos `estado` ainda é nulo — e o `/api/health`
respondia **`off`**, que é indistinguível de "ninguém pediu conector". O recibo do deploy é lido
exatamente aí, logo ele podia imprimir um `mcp=off` **falso**.

Agora existe o estado `ligando`, e `off` voltou a significar só uma coisa. Hoje, com
`MCP_CONECTORES` vazia, isso não muda nada em produção — mas um recibo que mente é pior que recibo
nenhum, e o recibo é a razão desta fase existir.

### 8.5 "Confirma no log do deploy" — por que precisou de código novo

O deploy já imprimia `→ flag de build X=…`, **mas só para flag que tem Variable**. Como as F0–F4
ligam pelo *padrão do código*, elas não apareceriam em lugar nenhum: o log ficaria calado
justamente sobre o que acabou de mudar. Confirmar olhando o YAML seria eu conferindo a minha própria
intenção, não o estado do processo.

Então o `/api/health` ganhou um bloco `capacidades` lido **das próprias funções que o turno
consulta** (não do env cru), e o deploy imprime isso **de dentro do container**, depois do
health-gate:

```
→ Harness (estado efetivo no container):
   cardapio=ON  acao=ON(2 voltas)  anexo=ON  sintese=ON  doc_por_secao=ON
   abrir_url=ON  baixar_para_base=ON  leitor=on  mcp=off  commit=<sha>
```

As duas últimas linhas separam **flag ligada** de **capacidade existindo**: `abrir_url` só sai `ON`
se a tool estiver *registrada*, o que exige `LEITOR_PROXY_URL` **e** `LEITOR_ALLOW`, e `leitor=on`
só se o container responder. Flag em `ON` com `abrir_url=off` é exatamente a promessa sem lastro que
a F0 existe pra matar — e agora ela fica visível no log, não no comportamento do modelo.
Nenhum segredo, nenhuma URL e nenhum domínio entram nesse bloco; só booleanos e nomes de tool.

**Gates:** 5604 testes passando (+8 nesta fase: 1 no desvio da F2 do documento, 3 no recibo do
`/api/health`, 1 na recusa de endpoint MCP indisponível, 2 na janela `ligando` do boot, 1 no drift
da allowlist no compose),
`tsc --noEmit` limpo fora do `server/colyseus`
pré-existente (falta `@colyseus/core`, que o CI instala), `eslint` 0, os dois YAML validados.

## 9. Testando o estado de produção: dois furos na rede (2026-11-03)

Pedido do dono depois do deploy: *"agora testa no chat real pra ver se para de prometer"*.

**O chat real não dá pra exercitar daqui**, e é honesto dizer por quê: a política de rede do
ambiente nega `zaeon.com.br:443` (403 no CONNECT), e este container não tem credencial do Vertex,
do gateway nem do banco — ou seja, não existe chamada ao modelo de verdade a partir daqui. O que
dá pra testar é a METADE DETERMINÍSTICA, que é justamente quem decide se a promessa passa: o
cardápio que entra no prompt e a rede que reprova a frase. Rodei com o ambiente idêntico ao do VPS
(flags ausentes = ON, `LEITOR_PROXY_URL` e a allowlist dos nove domínios), e **duas das seis frases
de teste passaram inteiras**.

### Furo 1 · "Vou abrir a **página** da Wikipédia e te trazer o conteúdo"

Passava. O motivo estava num comentário meu da F0: tirei `pagina` do objeto de `abrir_pagina` para
não acusar *"Li a página 4 do documento que você anexou"* — que é **verdade** no caminho dos vários
anexos. Só que com isso a promessa que diz "página" em vez de "site" saía livre.

Os dois casos se separam pelo **tempo**, não pela palavra: no pretérito, "página" costuma ser página
de anexo e a leitura aconteceu; no futuro, é promessa. Daí `objetoPromessa`, um objeto que vale no
futuro e no `eu`+presente e **nunca** no pretérito. Os dois testes andam juntos: a promessa cai, e
`"Abri a página 4 do documento que você anexou"` continua passando.

### Furo 2 · "Vou te mandar um e-mail com o resumo"

Passava inteira, porque **nenhuma classe cobria sair da conversa**. É o mesmo defeito do "vou baixar
a CSV" com outro verbo, e é pedido comum ("me manda por e-mail", "manda no zap"). Entrou a classe
`enviar_mensagem`, cujo `tool` é um nome que o registry nunca vai ter — então ela cai sozinha no
lado "A plataforma NÃO executa" do cardápio e passa a ensinar o modelo no prompt também.

O objeto da classe é o **canal** (`email`, `whatsapp`, `sms`, `inbox`…), nunca o conteúdo: *"te mando
o resumo aqui mesmo"* é verdade — o texto sai nesta resposta. O que não existe é o canal.

### O que o portão de drift pegou de mim

Ao acrescentar a classe, o teste da F0 *"toda classe de ação tem frase pronta no cardápio"* falhou
na hora: eu havia esquecido a entrada em `CAPACIDADES`. Foi a rede que eu mesmo escrevi pegando a
minha omissão — vale registrar, porque é o segundo portão desta série que pega um deslize meu antes
do commit.

### O que este teste NÃO prova

Que o modelo parou de prometer. Ele prova que **o cardápio chega no prompt** e que **a frase não
passa** — a camada determinística. Se o modelo vai preferir a frase honesta por conta própria, só o
uso real diz, e o número a olhar é o log `[harness] ação volta N: <tools>` e a taxa de
`ação descartou`. Com a rede do ambiente liberada para o domínio, o teste ponta a ponta sai daqui.

**Gates:** 5612 testes (+8: 4 nos furos, 4 nas frases verdadeiras que não podem cair),
`tsc --noEmit` limpo fora do `server/colyseus`, `eslint` 0.
