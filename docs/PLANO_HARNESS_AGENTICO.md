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
| **F4** | Pensamento por documento: um passe por documento + uma síntese cruzada antes do draft (RAPTOR-lite, compartilhado com a F4 do plano do documento). Resolve o §4.3. | médio | F3 |
| **F5** | Conectores MCP ligados (`lib/agent/mcp.ts` **já está escrito** e nunca é chamado): catálogo tem `fetch`, `filesystem`, `git` — é o caminho pra "clonar um repo" sem escrever tool nova. Exige `npm i @modelcontextprotocol/sdk` e smoke-test do dono. | médio | F2 |

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
4. **F5 exige instalar `@modelcontextprotocol/sdk`** e rodar servidores MCP por `npx`/`python` no
   VPS. É dependência nova e processo novo — decisão de infra.
