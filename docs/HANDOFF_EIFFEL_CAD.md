# Handoff · Eiffel, CAD na Zaeon

> **STATUS EM 2026-11-08** — leia isto antes de qualquer coisa.
>
> **PRONTO e commitado** na branch `claude/eiffel-cad` (em cima de `8a74789c`, que precisa entrar
> antes — ver "Dependência de merge" no fim):
>
> | arquivo | o que já está lá |
> |---|---|
> | `constants/courses.ts` | `"Engenharia Civil"` criado |
> | `lib/plugins/chatPlugins.ts` | `PluginChat` = `"octa-code" \| "eiffel-cad"` |
> | `lib/estudos/vitrine.ts` | item `eiffel-cad` no `CATALOGO`, grátis, `plugavel: "eiffel-cad"` |
> | `lib/agents/chatAgentes.ts` | `AgenteChatId` ganha `"eiffel"`; entrada com `tela: "chat"`, `plugin: "eiffel-cad"` |
> | `lib/ai/personas.ts` | persona `eiffel` completa, com o guardrail CREA/ART |
> | `lib/agent/mentors.ts` | `MentorSkill` ganha `"cad"`; em `ALL_MENTOR_SKILLS` e `RUNTIME_SKILLS`; Eiffel com a skill |
> | `lib/agents/capacidades.ts` | `CONECTOR_CAD`, `TOOLS_DO_SOLIDCRAFT` (as 19), `TOOLS_POR_HABILIDADE.cad` (18 nomes), `CAPACIDADES.eiffel` |
> | `lib/office/mapa.ts` | departamento `cad` → "Prancheta" |
> | `lib/agents/eiffel.test.ts` | 12 testes (curso, loja, identidade) |
> | `lib/agents/capacidades.test.ts` | verificação da superfície do conector |
> | `lib/office/mapa.test.ts` | o pod do Eiffel virou Prancheta |
>
> Gates nesse estado: **`tsc` limpo · 6.502 testes, 0 falhas**.
>
> **FALTA** (nesta ordem, cada um com seu passo na seção 10):
> 1. `lib/cad/mcp.ts` — o conector, com `riscoMaximo` por conector
> 2. `Dockerfile` — estágio Rust **com `strip`**
> 3. `/api/health` — o recibo `cad`
> 4. `studioKind: "cad"` + `CadView` (glTF no three.js)
> 5. O bundle WASM, a host page e o modo edição
> 6. Os testes T3 a T8


**Objetivo:** o Eiffel conectável no chat, com a habilidade `cad`, um workspace CAD dentro da
conversa, funcionando na Zaeon — e com os testes que provam que ele opera como o repositório de
referência, só que dentro da nossa casa.

Referência: [`tangency-labs/solidcraft`](https://github.com/tangency-labs/solidcraft) ·
**licença MIT OU Apache-2.0** · versão `0.40.0-rc.3` · `edition 2024` · `rust-version = "1.95"`.

Tudo aqui foi lido no repositório clonado ou medido nesta máquina. Onde eu não verifiquei, está
escrito que não verifiquei.

---

## 1 · A pergunta do cargo, respondida

Eu disse "caro" sobre compilar com cargo e isso foi adjetivo, não medida. Fui medir.

**O que o `solidcraft-cli` exige, lido no `Cargo.toml` dele:**

```
[dependencies]
solidcore-record, solidcraft-engine, solidcraft-gpu, solidcraft-mcp, log, serde_json

[features]
default = ["raytrace-cpu", "profile"]
```

**E o `docs/building.md` não declara uma única dependência de sistema.** Nenhum `apt install`,
nenhum header, nenhum SDK. É `cargo build` e pronto. O que eu temia — `solidcraft-gpu` arrastando
bibliotecas gráficas — não se confirma no documento: a feature padrão é `raytrace-cpu`, e o
`screenshot` headless diz explicitamente que cai no rasterizador de CPU quando não há adaptador
(`renderer: "cpu"`, com `warning`).

O que o cargo custa de verdade (medido nesta máquina: 4 vCPU, 15 GB RAM):

| | |
|---|---|
| repositório | **331 MB** com `--depth 1` |
| toolchain | `cargo 1.97.0` já satisfaz o `rust-version = 1.95` |
| **tempo de build** | **15m51s de parede** (56m42s de CPU em 4 vCPU), `exit 0` |
| tamanho do `target/` | **3,5 GB** — fica no estágio builder, não na imagem |
| binário bruto | **646,5 MB** — o perfil release é `[optimized + debuginfo]` |
| **binário strippado** | **133,9 MB** — é o que vai pra imagem |

**E ele funciona, medido nesta máquina sem GPU:**

```
solidcraft-cli run examples/bracket.json --out bracket.step
  → STEP de 22,8 KB, começando em `ISO-10303-21;`
  → reply: volume_mm3 = 22385.309769646756 · vertices = 18

solidcraft-cli snapshot examples/bracket.json --out bracket.png
  → PNG de 987,8 KB
  → warning: "drawn by the CPU rasterizer (no GPU adapter qualified…)"
```

O aviso do rasterizador de CPU é exatamente o que a documentação previa. **A cadeia inteira —
modelar, exportar STEP e gerar miniatura — roda em container sem placa de vídeo.**

**Conclusão de arquitetura, que não depende do número exato:** o build é de **imagem**, não de
runtime. Ele acontece uma vez, num estágio `builder` do Dockerfile, e o que vai para a imagem final
é só o binário. Então o custo é de CI e de tamanho de camada — não de resposta ao aluno. É o mesmo
padrão que já usamos para a geometria do atlas: trabalho caro no deploy, barato no turno.

A alternativa — baixar o binário de release de linux-x64 — existe e é mais rápida, mas nos amarra a
um artefato que não compilamos. Com cargo disponível e sem dependência de sistema, **compilar é a
escolha certa**: reprodutível, auditável, e pinada por commit.

---

## 2 · O que o SolidCraft nos dá (verificado)

### Quatro superfícies, um vocabulário

O README diz: *"Desktop app, browser app, headless CLI and MCP server, all running the same
commands."* Essa frase é a razão de tudo abaixo funcionar: o agente, o aluno e os nossos testes
falam a **mesma** linguagem de comandos.

### Um design é um JSON

```json
{"commands": [
  {"command": "sketch.create", "params": {"plane": "XY"}},
  {"command": "sketch.rectangle.two_point", "params": {"p0": [0,0], "p1": [40,30]}},
  {"command": "solid.extrude", "params": {"distance": 20}},
  {"command": "solid.fillet", "params": {"edges": [[0,0,10]], "radius": 3}}
]}
```

Isto é o **artefato**. Pequeno, versionável, diffável, e reconstrói o modelo inteiro. É a mesma
forma dos nossos artefatos de Studio: JSON que o cliente desenha.

### O CLI

```
solidcraft-cli run script.json --out part.step      # o arquivo CAD
solidcraft-cli snapshot script.json --out prev.png   # a miniatura
solidcraft-cli render studio.json --out product.png  # render de produto
solidcraft-cli eval part.step                        # mede um STEP importado
solidcraft-cli commands                              # o registro de comandos
solidcraft-cli mcp                                   # o servidor MCP
```

### Formatos

Entrando e saindo: **STEP, IGES, 3MF, STL, OBJ, glTF**. Saindo também URDF. Designs em `.sc`.

O `glTF` é a peça que resolve o visualizador: **o atlas de anatomia já é three.js carregando
geometria binária.** glTF no three.js é o mesmo caminho e mais simples. Não escrevemos visualizador.

### O servidor MCP

`solidcraft-cli mcp` fala MCP sobre **stdio** (JSON-RPC 2.0, revisões `2025-06-18`, `2025-03-26`,
`2024-11-05`). Modos:

- `solidcraft-cli mcp` — sessão de design headless, em processo, sem janela;
- `--in part.sc` — começa de um design ou de um script;
- `--connect 127.0.0.1:7878` — dirige o app aberto, para a pessoa assistir;
- `--headless` força o headless quando há app rodando.

**As 19 tools** (de `docs/mcp.md`): `list_commands`, `describe_command`, `execute`, `batch`,
`inspect_design`, `measure`, `body_topology`, `set_parameter`, `check_parameters`, `screenshot`,
`compare_picture`, `export`, `pending`, `crash_reports`, `skill_reference`, `running`,
`new_design`, `open`, `save`.

### O sandbox de arquivos — e por que ele importa para nós

As tools leem, escrevem e apagam **somente dentro das pastas do servidor**:

- a pasta do design aberto, e só quando ela está **estritamente dentro** da home (ou do temporário)
  e **não** numa pasta oculta. A home em si, `/`, `/home`, `/Users` e `~/.config` **não contam**;
- arquivos e pastas ocultos dentro da pasta permitida (`.env`, `.git`) **também estão fora**;
- as pastas onde o agente abriu ou salvou design nesta execução (as 16 mais recentes);
- a pasta de recuperação do SolidCraft;
- uma pasta de rascunho privada (`solidcraft-mcp-*`) no temporário, para onde vai o `screenshot`
  sem `path`;
- cada `--allow-path DIR` — e essa é reachada por inteiro, ocultos incluídos.

Caminhos são resolvidos **antes** da comparação, então `..` e symlink que sai são recusados. O
stderr lista as pastas no start-up.

**Para nós isso é uma propriedade de segurança que vem de graça** e compõe com o nosso
`guardAction`: rodamos com `--allow-path /app/cad/<scopeId>` e o agente fica confinado ao
workspace daquela conversa. O documento diz explicitamente que a pasta de trabalho onde o servidor
subiu **não conta por si**, então `~/.ssh`, `~/.aws` e dotfiles nunca estão ao alcance por padrão.

### As cinco skills do próprio repositório

`skills/` traz cinco Agent Skills: `solidcraft-modeling`, `solidcraft-editing`,
`solidcraft-checking`, `solidcraft-mechanisms`, `solidcraft-reporting`. E a tool
`skill_reference` devolve esses documentos **das cópias embutidas no binário**, para um agente sem
acesso a arquivo poder segui-los.

O documento diz: *"SolidCraft's own chat turns the agent's file tools off, so this is how its agent
reads the skills there."* **É exatamente a nossa situação.** As instruções que o servidor manda no
`initialize` já apontam o agente para o `skill_reference` primeiro, depois dizem como planejar os
números, construir em poucas chamadas de `batch` e verificar cada etapa com `measure`.

**Consequência para o handoff:** não precisamos inventar metodologia de modelagem para o Eiffel. Ela
vem no servidor. O que precisamos é deixá-lo ler.

### A API do navegador — o modo edição

Depois que o app do navegador sobe, `window.solidcraft` controla o design daquela aba, com os
**mesmos** ids de comando, parâmetros, handlers e histórico de undo do canal de controle do desktop.
*"No separate engine or server is started."*

| chamada | resultado |
|---|---|
| `solidcraft.request(method, params?)` | qualquer método de controle (`ui.inspect`, `document.inspect`, `engine.batch`) |
| `solidcraft.execute(command, params?)` | roda um comando do motor sem abrir diálogo |
| `solidcraft.commands()` | descobre comandos, parâmetros e se estão habilitados agora |
| `solidcraft.inspect(params?)` | inspeciona o documento ativo, com `{measure: true}` opcional |

Limites, que são requisitos do nosso lado: toda chamada devolve promise; parâmetros têm de ser
serializáveis em JSON e **no máximo 16 MiB**; **no máximo 256 requisições pendentes**; as requisições
rodam na thread de UI **entre frames**; aba oculta ou suspensa atrasa a conclusão; recarregar encerra
a sessão.

### `?embed=editor` — o contrato do workspace

*"`?embed=editor` runs the app as an editing embed: the ribbon, browser, timeline and properties,
without the application bar or start page, and with nothing kept in the browser."*

Uma página que o enquadra **da mesma origem** alcança a API como `frame.contentWindow.solidcraft`,
**guarda os designs ela mesma**, e os move com três métodos:

```js
const app = frame.contentWindow.solidcraft;
const kept = await app.request("document.export");  // {name, revision, dirty, format: "json", text}
// a página guarda kept.text, e avisa:
await app.request("document.saved", {revision: kept.revision});
// e depois devolve, com timeline e parâmetros como salvos:
await app.request("document.import", {text: kept.text, name: "Bracket"});
```

O limite de 16 MiB vale para o `text` do `document.import`. Design que linka outros arquivos mantém
os links como caminhos; os arquivos não vão no `text`.

**Isso é o workspace CAD, inteiro, especificado pelo próprio repositório.** Nós somos a "host page":
guardamos o design, servimos o embed da nossa origem, e movemos o estado com três chamadas.

### O build do navegador

`cd apps/solidcraft-web && trunk build --release --public-url ./` → WebGPU, ou WebGL2 com `?webgl`.
Exige `trunk` (cargo install trunk) e o target `wasm32-unknown-unknown`. **Não medi esse build.**

---

## 3 · Arquitetura na Zaeon

```
  turno do chat (Eiffel)
     │
     ├─ habilidade `cad` → portão de tools (ToolContext.toolsDoAgente)
     │
     ├─ MCP: solidcraft-cli mcp  (stdio, headless, --allow-path /app/cad/<scopeId>)
     │     └─ registerMcpConnector → as 19 tools entram no registry como tools nossas
     │
     ├─ o agente modela com batch/measure/check_parameters, lendo skill_reference primeiro
     │
     ├─ export → .sc (design) + glTF (ver) + STEP (baixar) + PNG (miniatura)
     │
     └─ artefato  studioKind: "cad"
           ├─ payload: o script JSON + glTF + STEP + PNG
           ├─ visualizador: three.js carregando o glTF (o caminho do atlas)
           └─ modo edição: iframe do solidcraft-web ?embed=editor, mesma origem
                 └─ document.export / document.saved / document.import
```

**Por que headless e não ponte:** o canal de controle e o MCP são `127.0.0.1`, locais. Nosso
servidor não alcança o `localhost` do aluno, e o navegador dele não alcança o nosso processo. Então
a geração é headless no servidor e a edição é o WASM no navegador. Não é limitação nossa: é o
desenho do SolidCraft, e ele oferece as duas pontas.

---

## 4 · Entregáveis

### E1 · Eiffel conectável no chat

Hoje o Eiffel é **mentor** (`MENTOR_SEED`, slug `eng-civil`), alcançável pelo `MentorPill` e pelo
Escritório, rodando como Aura parametrizada. O pedido é ele no **seletor do chat**, plugável pelo
Escritório — o que o dono já definiu: *"queremos agentes no chat, mas que sao plugaveis dentro do
escritorio"*.

| arquivo | mudança |
|---|---|
| `lib/agents/chatAgentes.ts` | entrada `eiffel`, `tela: "chat"`, `plugin` para só aparecer depois de plugado |
| `lib/ai/personas.ts` | persona `eiffel` — engenharia civil e estrutural, com a voz dele |
| `lib/agents/capacidades.ts` | `habilidades: ["cad", "literature"]`, `area: "eng-civil"`, `termosProprios`, `protocolo` |
| `lib/agents/nativos.ts` | linha no `VITRINE` (a vitrine pública) |
| `lib/rag/areas.ts` | `eng-civil` já existe; **0 documentos hoje** |

⚠️ **Pendência de produto, não técnica:** `Engenharia Civil` **não está** em `constants/courses.ts`.
O Eiffel serve um curso que a plataforma não oferece. Isso não bloqueia o CAD, mas tem de ser
decidido: ou o curso entra, ou o Eiffel é reapontado para `Arquitetura`, que é oferecida.

### E2 · A habilidade `cad`

| arquivo | mudança |
|---|---|
| `lib/agent/mentors.ts` | `MentorSkill` ganha `"cad"`; `ALL_MENTOR_SKILLS` e `RUNTIME_SKILLS` acompanham |
| `lib/agents/capacidades.ts` | `TOOLS_POR_HABILIDADE.cad` = as tools do MCP que admitimos, **com o nome real** |

**O nome de uma tool de MCP no nosso registro é `mcp:<conector>:<tool>`** (`lib/agent/mcp.ts:141` e
`:161`). Então o mapa de capacidades leva `mcp:solidcraft:execute`, `mcp:solidcraft:batch`, e assim
por diante — não `execute`. Foi exatamente aqui que eu errei antes com `octa_patch`, e o teste do
`capacidades.test.ts` compara cada nome do mapa com o registro real justamente para pegar isso.
| `lib/cad/mcp.ts` (novo) | registra o conector, com `riscoMaximo` e `--allow-path` por conversa |

**A política de risco é nossa, e tem de ser explícita.** `registerMcpConnector` filtra por
`riskFromAnnotations`, e o limite padrão do chat é `RISCO_MAXIMO_CHAT`. Das 19 tools:

- **leitura** (entram sem discussão): `list_commands`, `describe_command`, `inspect_design`,
  `measure`, `body_topology`, `check_parameters`, `screenshot`, `compare_picture`,
  `skill_reference`, `running`, `pending`;
- **escrita no design** (entram, porque é o trabalho dele): `execute`, `batch`, `set_parameter`,
  `export`, `save`, `new_design`, `open`;
- **fora**: `crash_reports` — lê relatórios de crash da máquina, que não é assunto de aluno.

#### A medição do risco — feita, e ela muda o desenho

Subi o servidor (`solidcraft-cli mcp --headless`), fiz o handshake JSON-RPC e li o `tools/list`:

```
initialize: ok · servidor: solidcraft 0.40.0-rc.3
tools: 21 · COM anotação: 21 · SEM anotação: 0

list_commands     readOnly=true   destructive=false  idempotent=true
describe_command  readOnly=true   destructive=false  idempotent=true
inspect_design    readOnly=true   destructive=false  idempotent=true
measure           readOnly=true   destructive=false  idempotent=true
body_topology     readOnly=true   destructive=false  idempotent=true
set_parameter     readOnly=false  destructive=false  idempotent=false
execute           readOnly=false  destructive=TRUE   idempotent=false
batch             readOnly=false  destructive=TRUE   idempotent=false
```

**Boa notícia:** todas as 21 vêm anotadas. O limite conhecido do `lib/agent/mcp.ts:65` não nos
atinge — nada vira `write` por omissão.

**Má notícia, e é a que importa:** `execute` e `batch` — justamente as duas que modelam — vêm com
`destructiveHint: true`. E o nosso teto é **`RISCO_MAXIMO_CHAT = "read"`**. Com ele, `toolsAdmitidas`
recusa `execute`, `batch`, `set_parameter`, `export`, `save`, `open` e `new_design`. **Só as de
leitura entram.** O Eiffel poderia medir e inspecionar, e não poderia modelar nada.

E há um segundo portão depois: `permit()` devolve `REQUIRE_APPROVAL` para `destructive`, e o turno
do chat não passa `approve` — então mesmo admitindo a tool, a chamada morreria sem aprovação.

**As três saídas, e a minha recomendação:**

| | o que faz | veredito |
|---|---|---|
| a · `riscoMaximo: "destructive"` no conector | as tools entram, mas o `permit` exige aprovação em toda chamada de `execute`/`batch` | **não serve** sem um canal de aprovação no chat |
| b · `riscoMaximo: "write"` | `destructive` continua recusado | **não serve** |
| c · **reclassificar `execute`/`batch` como `write` para ESTE conector**, com o motivo declarado | as tools entram e o `permit` libera em modo `auto` | **é a saída** |

O argumento de (c), e ele tem de ficar escrito no código: `destructiveHint: true` ali significa
*"pode alterar o design"* — e o design é um arquivo descartável dentro de
`--allow-path /app/cad/<scopeId>`. Não há dado de usuário, não há repositório, não há mundo externo.
O sandbox do SolidCraft (seção 2) mais o workspace por conversa fazem o raio de alcance ser **um
design descartável**. Não é afrouxar a política: é dizer que, neste conector e dentro deste
confinamento, `write` descreve a verdade melhor que `destructive`.

⚠️ **Isso é decisão de segurança e tem de ser estreita:** um `riscoMaximo` por conector, nunca mexer
no `RISCO_MAXIMO_CHAT` global, e com teste que afirme que **nenhum outro** conector herdou a
exceção.

### E3 · O workspace CAD

| arquivo | mudança |
|---|---|
| `lib/agent/tools.ts` | `StudioKind` ganha `"cad"`; `STUDIO_KINDS`, `STUDIO_LABEL` ("peça CAD"), `ALIASES` |
| `components/studio/CadView.tsx` (novo) | three.js + glTF. Espelha `MoleculeView.tsx`, que é o precedente de artefato 3D |
| `components/studio/StudioArtifactViews.tsx` | despacha `cad` para o `CadView` |
| `app/cad/editor/page.tsx` (novo) | a host page: enquadra `?embed=editor` da nossa origem e guarda o design |
| `public/cad/` | o bundle WASM do `solidcraft-web`, servido da nossa origem |

**Mesma origem é requisito, não preferência:** a API só é alcançável como
`frame.contentWindow.solidcraft` quando o embed vem da mesma origem. Usar `solidcraft.io/app` num
iframe **não** dá acesso à API. Então o bundle tem de ser nosso.

**Onde o design vive:** o `text` do `document.export` é o estado canônico. Ele vai para o nosso
artefato (e a conversa já persiste artefato). O `revision` fecha o ciclo com `document.saved`, para
o embed não reclamar de alterações não salvas.

### E4 · Funcionando na Zaeon

| arquivo | mudança |
|---|---|
| `Dockerfile` | estágio `builder` com Rust: clona o solidcraft num commit **fixado**, `cargo build --release -p solidcraft-cli`, copia só o binário para a imagem final |
| `Dockerfile` | segundo estágio para o WASM: `trunk build --release` em `apps/solidcraft-web` → `public/cad/` |
| `docker-compose.beta.yml` | volume `cad_workspaces:/app/cad` para os designs por conversa |
| `.github/workflows/deploy.yml` | nada no `script:` — o build é do Dockerfile. **Atenção ao teto de 21.000 bytes do scalar** |
| `/api/health` | `cad: { cli: "on|off", wasm: "on|off", versao }` — recibo, como `atlas` e `leitor` |

⚠️ **O build de Rust no Dockerfile muda o tempo de CI e o tamanho da imagem.** O número exato está
na seção 1. Se o tempo for inaceitável, a mitigação é cache de camada do cargo (`cargo-chef`) ou um
estágio pré-construído publicado como imagem própria — **não** voltar ao binário baixado.

---

## 5 · Os testes

O repositório de referência tem um teste que é exatamente o que precisamos espelhar:

```
cargo xtask web-api-test --site dist/web
```

*"The test starts a local server and headless Chrome, discovers commands, creates a box in the live
document, checks undo and redo, and verifies error handling and the pending-request limit. It also
checks that Ctrl+Tab and Ctrl+Shift+Tab are left to the browser."*

**E nós temos Chromium e Playwright pré-instalados.** Então o espelho é direto.

### T1 · O portão de habilidade (vitest, puro)

- o Eiffel tem `cad`; Aura, Zenita e Nina **não**;
- `toolsPermitidas(["cad"])` contém as tools do MCP e **não** contém `crash_reports`;
- quem não tem `cad` recebe `DENY` em `execute` e `batch` (prova o portão do `runtime.ts`);
- **injeção de defeito obrigatória:** tirar `cad` do Eiffel e o teste tem de acusar.

### T2 · A política de risco do conector (vitest, com `connect` injetado)

- um servidor falso que anota `readOnlyHint` em `measure` e nada em `execute`;
- afirma quais entram e quais são recusadas, e que `recusadas` nomeia cada uma;
- **o teste que mede o limite conhecido:** servidor que **não anota nada** → tudo vira `write` →
  afirma o comportamento real, qualquer que seja, em vez de supor.

### T3 · O script → STEP (integração, com o binário)

Espelha `solidcraft-cli run examples/bracket.json --out bracket.step`:

- roda o `bracket.json` **do próprio repositório de referência**, fixado;
- afirma que o STEP sai, começa com `ISO-10303-21` e tem tamanho > 0;
- roda `eval` no STEP gerado e compara o volume com o valor que o `measure` deu — **número contra
  número**, não "deu certo".

### T4 · O sandbox de arquivos (integração)

Isto é segurança, e tem de ser testado por **negação**:

- com `--allow-path /tmp/cad-teste`, um `export` para `/tmp/cad-teste/x.step` **passa**;
- um `export` para `/etc/x.step` **falha**;
- um `export` para `/tmp/cad-teste/../fora.step` **falha** (o `..` resolvido);
- um `export` para `/tmp/cad-teste/.oculto/x.step` **falha** (oculto dentro do permitido);
- e o stderr do start-up lista as pastas — afirmamos que `/app` e a home não estão nela.

### T5 · A API do navegador (Playwright, espelho do `web-api-test`)

Contra a nossa host page, servindo o nosso bundle:

1. `await solidcraft.commands()` devolve lista não vazia;
2. `await solidcraft.execute("solid.box", {length: 30, width: 20, height: 10})` cria o corpo;
3. `await solidcraft.inspect({measure: true})` devolve volume **30×20×10 = 6000 mm³** — valor
   analítico, como o repositório de referência faz;
4. `edit.undo` e `edit.redo` voltam e refazem;
5. um comando inválido **rejeita** com `Error` (e não derruba a página);
6. o limite de 256 pendentes: a 257ª rejeita **sem rodar**;
7. `Ctrl+Tab` continua com o navegador.

### T6 · O ciclo do workspace (Playwright)

O contrato dos três métodos, ponta a ponta:

1. cria um corpo no embed;
2. `document.export` → guarda `text` e `revision`;
3. `document.saved {revision}` → o embed para de se dizer `dirty`;
4. recarrega o iframe;
5. `document.import {text}` → afirma que **timeline e parâmetros voltaram**, medindo o volume de
   novo e comparando com o de antes;
6. um `text` acima de 16 MiB **rejeita** — o limite documentado, afirmado.

### T7 · O turno do Eiffel (vitest, `genJson` injetado)

Como fizemos com escopo e protocolo: sem rede, provando a **composição**.

- a identidade do Eiffel chega ao `system` (via `vozDoTurno`);
- `toolsDoAgente` do turno contém as tools de `cad`;
- a área pedida ao RAG é `area:eng-civil`;
- uma pergunta de CAD **passa** o portão de escopo; "o que você acha do GTA VI" cai em `neutro`;
- o artefato sai com `studioKind: "cad"` e o payload tem o script JSON.

### T8 · O recibo (vitest)

`/api/health` diz `cad.cli` e `cad.wasm` comparando com o que está **em disco** — não uma constante.
É a lição do teste de geometria do atlas, que eu escrevi errado uma vez: afirmar fato de ambiente
como invariante quebra em produção.

---

## 6 · Riscos e o que eu não sei

| risco | o que fazer |
|---|---|
| ~~O SolidCraft anota suas tools MCP?~~ **MEDIDO**: 21 de 21 anotadas | resolvido. Mas `execute`/`batch` são `destructive` e o nosso teto é `read` — ver a decisão (c) na seção E2 |
| Tempo de build do Rust no CI: **15m51s** em 4 vCPU | aceitável para build de imagem. Mitigação se incomodar: `cargo-chef` para cache de camada, ou runner com mais núcleos (o build usou 56m de CPU — escala bem) |
| Binário de **133,9 MB** strippado na imagem | aceitável; sem `strip` são 646,5 MB, então o `strip` é obrigatório no Dockerfile |
| **Não medi o build do WASM** (`trunk`) nem o tamanho do bundle | medir antes de prometer o modo edição |
| O `?embed=editor` exige mesma origem | já tratado: o bundle é nosso. Mas **não testei** o embed |
| `screenshot` headless sem GPU cai no rasterizador de CPU | aceitável para miniatura; medir o tempo |
| 16 MiB no `document.import` | design grande com muitos links pode estourar. O teste T6 afirma o limite |
| Versão `0.40.0-rc.3` é **release candidate** | fixar o commit e não seguir `main` cegamente |
| `Engenharia Civil` não está em `constants/courses.ts` | decisão de produto: entra o curso, ou o Eiffel vai para `Arquitetura` |

---

## 7 · Ordem de execução

1. ~~T2 primeiro — descobrir se as anotações existem.~~ **FEITO.** 21 de 21 anotadas; `execute` e
   `batch` são `destructive`; a decisão é a (c) da seção E2 — `riscoMaximo` por conector, com o
   motivo no código e teste de não-contaminação.
2. O estágio de build no Dockerfile (**com `strip`**) + o recibo no `/api/health`. Sem binário, nada
   mais roda.
3. O conector MCP + a habilidade `cad` + o Eiffel no registro (E1, E2) com T1 e T7.
4. O `studioKind: "cad"` e o `CadView` com glTF (E3, primeira metade) com T3.
5. O bundle WASM, a host page e o modo edição (E3, segunda metade) com T5 e T6.
6. T4 — o sandbox, por negação. Antes de qualquer coisa ir a produção.


---

## 8 · Os contratos exatos que o executor vai tocar

Tudo abaixo foi lido no código, não suposto. Linha quando ela importa.

### `ConnectorConfig` — `lib/agent/mcp.ts:29`

```ts
export type ConnectorConfig = {
  id?: string;
  name: string;                 // slug único — namespaceia as tools
  transport: "http" | "stdio";
  endpoint: string;             // URL (http) OU linha de comando (stdio)
  authType?: "none" | "bearer" | "header";
  authRef?: string;             // NOME da env var, nunca o segredo
  minPlan?: Plan;
};
```

### `MCP_CATALOG` — `lib/agent/mcp.ts:337`

Entradas são `CatalogEntry` = `{ name, label, transport, endpoint, note, experimental?, indisponivel? }`.
O precedente é o `scholar`:

```ts
{ name: "scholar", label: "Scholar (acadêmico)", transport: "stdio",
  endpoint: "node node_modules/scholar-mcp/dist/index.js",
  note: "pinado 1.2.0 · handshake real OK, 9/10 tools admitidas", experimental: true },
```

**Caminho relativo de propósito:** o processo sobe com cwd `/app` no container e na raiz do repo em
dev. Para o SolidCraft o binário é absoluto (`/usr/local/bin/solidcraft-cli`), porque ele vem da
imagem, não do `node_modules`.

### Como um conector é escolhido — `lib/agent/mcp-boot.ts:25`

`ENV_CONECTORES = "MCP_CONECTORES"`. A env var escolhe **por nome do catálogo**, e o comentário em
`mcp-boot.ts:10` diz por quê: *"Endpoint arbitrário vindo de env daria ao modelo uma superfície"*
que ninguém revisou. **Não invente um caminho novo de registro:** acrescente a entrada ao catálogo
e ligue por `MCP_CONECTORES`.

⚠️ **CONSEQUÊNCIA QUE O EXECUTOR PRECISA DECIDIR:** `MCP_CATALOG` é **estático**, então o
`--allow-path` dele é fixo. Um `--allow-path` **por conversa** não cabe no catálogo. As duas saídas:
- **(a) uma raiz compartilhada** `--allow-path /app/cad`, e o isolamento por conversa passa a ser
  **nosso**: o wrapper da tool valida que todo caminho cai em `/app/cad/<scopeId>`. O sandbox do
  SolidCraft continua barrando `/etc`, dotfiles, `..` e symlink — só não separa conversa de conversa;
- **(b) registro por turno**, fora do catálogo — mais isolado, e **quebra** a propriedade "nunca um
  endpoint arbitrário" se feito sem cuidado.

**Recomendo (a) para a v1**, com o teste T4b afirmando que o wrapper recusa caminho de outra
conversa. E escreva no código que a separação entre conversas é **nossa**, não do SolidCraft, nessa
configuração — senão alguém vai ler o sandbox dele e supor mais do que ele dá.

### A política de risco — `lib/agent/mcp.ts:73`

```ts
export const RISCO_MAXIMO_CHAT: ToolRisk = "read";
const ORDEM_RISCO: Record<ToolRisk, number> = { read: 0, write: 1, destructive: 2 };
export function toolsAdmitidas(tools, riscoMaximo = RISCO_MAXIMO_CHAT) { … }
export async function registerMcpConnector(cfg, opts?: { connect?: ConnectFn; riscoMaximo?: ToolRisk })
```

`registerMcpConnector` **já aceita `riscoMaximo` por chamada** (`lib/agent/mcp.ts:247`). É por aí
que a decisão (c) se implementa — sem tocar na constante global.

E o segundo portão, `lib/agent/runtime.ts:137`: `if (def.risk === "destructive") return "REQUIRE_APPROVAL"`.
Então reclassificar na admissão **não basta**: o `ToolDef` tem de nascer com `risk: "write"`.
`mcpToolToToolDef` (`lib/agent/mcp.ts:159`) define `risk: riskFromAnnotations(tool.annotations)` —
é esse ponto que precisa do override, não o `toolsAdmitidas`.

### O nome da tool no registro — `lib/agent/mcp.ts:141` e `:161`

```ts
name: `mcp:${connector.name}:${tool.name}`
```

Com `name: "solidcraft"`, as tools são `mcp:solidcraft:execute`, `mcp:solidcraft:batch`, etc. Já
estão escritas assim em `TOOLS_POR_HABILIDADE.cad`.

### O artefato — `components/studio/StudioBlock.tsx` e `components/study/StudyCoworkChat.tsx:162`

`StudioBlockData` = `{ studioKind, title, data, artifactId? }`.

E tem um detalhe que decide o desenho do CAD. Em `StudyCoworkChat.tsx:162`:

```ts
const leve = (b?: StudioBlockData) =>
  (b && (b.studioKind === "diagram" || b.studioKind === "aula") && b.artifactId
    ? { ...b, data: null } : undefined);
```

Os artefatos **pesados** (`diagram`, `aula`) viajam com `data: null` e só o `artifactId` — o
conteúdo é buscado depois. **O CAD é pesado** (glTF + STEP + PNG), então ele entra nessa lista, não
inline. Esquecer isso joga megabytes no histórico da conversa.

### O precedente de visualizador 3D — `components/studio/MoleculeView.tsx`

Três coisas para copiar dele, e a terceira é a que quebra se esquecida:
1. `"use client"`;
2. import **dinâmico** da biblioteca, **depois da montagem** — o cabeçalho dele diz: *"a biblioteca é
   UMD e mexe em `window`, então o import é DINÂMICO e só depois da montagem — em SSR ela quebra"*;
3. é montado em **dois** lugares: `StudioBlock.tsx` e `MagazineAnswerView.tsx:558`. Um `CadView`
   registrado só num deles aparece pela metade.

### O Dockerfile — dois estágios hoje

```
FROM node:20-bookworm-slim AS builder   (linha 10)
FROM node:20-bookworm-slim AS runtime   (linha 91)
COPY --from=builder /app ./             (linha 113)
```

### O recibo — `app/api/health/route.ts:129`

`atlas: atlasDeAnatomia()` é o padrão: uma função que devolve o estado **lido do disco**, não uma
constante.

---

## 9 · As armadilhas que eu já encontrei

Não repita nenhuma delas. Cada uma me custou uma volta.

| armadilha | o que acontece |
|---|---|
| **`strip` esquecido no Dockerfile** | o binário vai com 646,5 MB em vez de 133,9 MB. O perfil release do SolidCraft é `[optimized + debuginfo]` |
| **Nome de tool inventado** | escrevi `octa_patch`/`octa_run` sem olhar o registro; nenhuma existe. Tool de MCP é `mcp:<conector>:<tool>`, nunca o nome cru |
| **Tool de MCP não está no registry em teste** | `registerMcpConnector` só registra com servidor de pé. A autoridade sobre esses nomes é `TOOLS_DO_SOLIDCRAFT` (a superfície que eu medi), não `listTools()` |
| **`destructive` passa pela admissão e morre no `permit`** | são DOIS portões. Reclassificar só na admissão deixa a tool entrar e a chamada falhar |
| **Record exaustivo** | `MentorSkill` novo faz o `tsc` cobrar `TOOLS_POR_HABILIDADE`, `CAPACIDADES` e `lib/office/mapa.ts` (`Record<MentorSkill, Departamento>`). Isso é o tipo funcionando — preencha, não faça cast |
| **O pod do Escritório se move** | `departamentoDe` escolhe a skill mais **rara**. `cad` virou a mais rara, então o pod do Eiffel saiu de "Biblioteca" para "Prancheta" e `lib/office/mapa.test.ts` cobrou. A verdade nova é a certa |
| **`ufrgs.br` está fora** | HTTP 000/503. Não é fonte confiável agora |
| **`git clone` de release do GitHub** | reescrever `github.com/.../releases/download/...` para `raw.githubusercontent.com` dá 404. Release é no host original |
| **O API do GitHub é restrito nesta sessão** | `api.github.com` responde "not enabled for this session"; `raw.githubusercontent.com` funciona para qualquer repo público |

---

## 10 · O passo a passo

Cada passo tem **o que escrever**, **como verificar** e **quando parar**. Não siga para o próximo
sem o verde do anterior.

### Passo 1 · O conector (`lib/cad/mcp.ts`)

**Escrever:**
- a entrada no `MCP_CATALOG`:
  ```ts
  { name: "solidcraft", label: "SolidCraft (CAD)", transport: "stdio",
    endpoint: "/usr/local/bin/solidcraft-cli mcp --headless --allow-path /app/cad",
    note: "0.40.0-rc.3 · handshake real OK, 21/21 tools anotadas · execute/batch são destructive: ver riscoMaximo por conector",
    experimental: true },
  ```
- o override de risco. **Não** mexa em `RISCO_MAXIMO_CHAT`. O ponto é `mcpToolToToolDef`
  (`lib/agent/mcp.ts:159`), que hoje faz `risk: riskFromAnnotations(tool.annotations)`. Acrescente
  um parâmetro opcional de reclassificação por conector, com o motivo **no código**:
  *o `destructiveHint` do SolidCraft significa "pode alterar o design", e o design é um arquivo
  descartável dentro de `--allow-path`; não há dado de usuário, repositório nem mundo externo*;
- o wrapper que valida caminho: toda tool que recebe `path` tem o caminho forçado para
  `/app/cad/<scopeId>/…` antes de ir ao servidor.

**Verificar:** `npx vitest run lib/cad lib/agent/mcp` — e os testes T2 e T4b da seção 5.

**Parar se:** o handshake não responder. Nesse caso o binário não está na imagem: volte ao passo 2.

### Passo 2 · O Dockerfile

**Escrever**, antes do estágio `runtime`:

```dockerfile
FROM rust:1-bookworm AS cad
WORKDIR /src
# PINADO. 0.40.0-rc.3 é release candidate: não siga `main`.
RUN git clone --depth 1 --branch <TAG-OU-COMMIT> https://github.com/tangency-labs/solidcraft .
RUN cargo build --release -p solidcraft-cli
RUN strip target/release/solidcraft-cli
```

e no `runtime`: `COPY --from=cad /src/target/release/solidcraft-cli /usr/local/bin/solidcraft-cli`.

**Números medidos nesta máquina (4 vCPU, 15 GB):** 15m51s de parede, 56m42s de CPU, `target/` 3,5 GB,
binário 646,5 MB → **133,9 MB** depois do `strip`.

**Verificar:** build local da imagem e `docker run --rm <img> solidcraft-cli commands | head`.
Depois o par do passo 3: `run examples/bracket.json --out /tmp/b.step` e conferir
`ISO-10303-21;` + `volume_mm3 ≈ 22385.31`.

**Parar se:** o tempo de CI for inaceitável. A mitigação é `cargo-chef` ou runner com mais núcleos
(o build usou 56 minutos de CPU — escala bem). **Não** volte ao binário baixado sem registrar por quê.

### Passo 3 · O recibo no `/api/health`

**Escrever:** `cad: { cli: "on"|"off", wasm: "on"|"off", versao?: string }`, no molde do
`atlasDeAnatomia()` — lendo o **disco** (`existsSync("/usr/local/bin/solidcraft-cli")` e o bundle em
`public/cad/`), nunca uma constante.

**Verificar:** T8. E o teste compara com `existsSync`, não com um valor fixo — foi assim que eu
errei uma vez no recibo do atlas, afirmando fato de ambiente como invariante.

### Passo 4 · O artefato `cad`

**Escrever:**
- `lib/agent/tools.ts`: `StudioKind` ganha `"cad"`; entra em `STUDIO_KINDS`, `STUDIO_LABEL`
  (`"peça CAD"`) e nos `ALIASES` (`"cad"`, `"peça"`, `"peca"`, `"modelo 3d"` — **cuidado:**
  `"modelo 3d"` já é alias de `molecule`; decida e deixe escrito);
- `components/studio/CadView.tsx`: three.js + `GLTFLoader`, no molde do `MoleculeView` (as três
  coisas da seção 8);
- registrar em **`StudioBlock.tsx` E `MagazineAnswerView.tsx`**;
- `StudyCoworkChat.tsx:162`: acrescentar `"cad"` à lista de pesados do `leve()`.

**Verificar:** T3 (o script → STEP, com o número) e um teste de render do `CadView` com um glTF
mínimo.

### Passo 5 · O workspace (modo edição)

**Escrever:**
- estágio no Dockerfile para o WASM: `cargo install trunk`, target `wasm32-unknown-unknown`,
  `cd apps/solidcraft-web && trunk build --release --public-url ./`, saída para `public/cad/`;
- `app/cad/editor/page.tsx`: a host page que enquadra `?embed=editor` **da nossa origem** e guarda o
  design com os três métodos (`document.export`, `document.saved`, `document.import`).

**Verificar:** T5 e T6, com Playwright e o Chromium pré-instalado.

**Parar se:** o bundle WASM passar de alguns MB sem compressão — meça antes de prometer. **Eu não
medi esse build.**

---

## 11 · Dependência de merge

| branch | contém | situação |
|---|---|---|
| `claude/eiffel-cad` | este trabalho | **em cima** da de baixo |
| `claude/escopo-protocolo-cargo` | `8a74789c` — `termosProprios`, `protocolo`, o portão de escopo | **sem PR**; o Eiffel não compila sem ela |
| `origin/main` | `daf315b9` | andou (#728, #732) depois das duas |

**Ordem obrigatória:** `8a74789c` primeiro. E as duas precisam de rebase na `main` atual — o
conflito conhecido é em `lib/agent/aura-harness.ts`, que a #728 também tocou.


---

## 12 · O 1:1 — e por que ele é um ARQUIVO, não um fork

Pedido do dono (2026-11-08): *"se certifique de que o repositorio base seja realmente bem
aproveitado. quero 1:1 com apenas as cores, cards e visuais caracteristicos da zaeon."*

Fui medir o que "1:1" significa em número antes de propor qualquer coisa.

### O tamanho do que está em jogo

| crate | linhas `.rs` |
|---|---|
| **`ui-egui`** | **383.019** |
| `engine` | 255.581 |
| `doc` | 83.734 |
| `kernel` | 70.531 |
| `render` | 55.574 |
| `geom` | 36.653 |
| `sketch` | 32.659 |
| `gpu` | 25.990 |
| `smlib` | 24.546 |
| `io` | 18.963 |
| `step` | 9.122 |
| `mcp` | 7.717 |
| …e mais 6 | ~7.600 |
| **TOTAL `crates/`** | **1.011.706** |
| **TOTAL `apps/`** | **26.878** |

**Mais de um milhão de linhas de Rust.** E a superfície funcional, medida rodando
`solidcraft-cli commands` no binário que eu compilei:

| família | comandos | | família | comandos |
|---|---|---|---|---|
| `sketch` | **129** | | `inspect` | 20 |
| `render` | **65** | | `construct` | 20 |
| `view` | 44 | | `surface` | 19 |
| `solid` | 36 | | `joint` | 19 |
| `component` | 32 | | `panel` | 16 |
| `timeline` | 22 | | `file` | 16 |
| | | | `sheet` · `parameters` · `motion` · `appearance` · `browser` · `config` | 13 · 13 · 11 · 10 · 9 · 8 |

**610 comandos.** Esse é o 1:1 — e ele não se reimplementa. Qualquer tentativa de reescrever a UI
em React joga fora 383 mil linhas e entrega uma fração.

### Onde a cor mora — e é exatamente onde precisávamos que morasse

O `ui-egui` tem um sistema de tema inteiro, e o `theme_files.rs` (3.221 linhas) abre dizendo:

> *"Colour and shape themes as files (#2255): a `solidcraft-theme/1` JSON file names a base palette
> (the built-in Dark or Light) and sets any of its `Tokens` by name, so a theme can be a handful of
> lines. Built-in themes (Gruvbox and others) are such files under `assets/styles/ui/themes/`;
> imported ones are kept in the preferences (`Prefs::custom_themes`), **so they also work in the
> browser**."*

**Um tema é um arquivo JSON.** E ele controla:

| | quanto |
|---|---|
| tokens de **cor** | **192** (`accent`, `panel`, `app_bar`, `axis_x/y/z`, `agent_ok`, `agent_busy`, …) |
| **raios de canto** | **6** — `radius_sm`, `radius_md`, `radius_lg`, `radius_xl`, `control_radius`, `sketch_mode_radius` |
| tokens de **forma** no total | 54 (larguras, gaps, alturas, insets, tamanhos de fonte) |
| temas de exemplo já no repo | **25** — de `gruvbox` e `nord` a `cga`, `solidcraft-95` e **`blueprint`** |

Os limites de entrada hostil estão declarados: 256 KB por arquivo, 512 cores, 64 temas importados.
E os modos de visão de cor se aplicam **por cima** do tema (`Tokens::with_vision`), com 1.355 linhas
de teste só para isso.

Formato real, do `blueprint.json` (155 cores definidas):

```json
{
  "format": "solidcraft-theme/1",
  "name": "Blueprint",
  "base": "dark",
  "order": 160,
  "provenance": "…",
  "colors": {
    "accent": "#66ddff",
    "accent_soft": "#153c60",
    "app_bar": "#07192f",
    "agent_ok": "#6ee0bb",
    "app_bar_icon": ["#eceff4", "#a4b0c2", "#88c0d0"]
  }
}
```

Uma cor é hex **ou** lista de hex (ícones de várias camadas). Chave ausente herda da base.

### A conclusão, e é a entrega mais barata desta sessão

**O "Zaeon" é UM ARQUIVO: `zaeon.json`.** Nada de fork, nada de patch no `ui-egui`, nada de
divergência para manter. 610 comandos 1:1, nossas cores e nossos cantos, e funciona **no desktop e
no navegador** porque temas importados vivem nas preferências.

Isso também **corrige a seção E3 deste handoff**, que eu escrevi antes de medir. Ela propunha um
`CadView` em three.js como o workspace, e isso seria reimplementar UI. O desenho certo tem duas
camadas, com papéis diferentes:

| camada | o que é | por quê |
|---|---|---|
| **bolha da conversa** | leve: o PNG do `screenshot` (ou o glTF no three.js, molde do `MoleculeView`) | uma bolha de chat não deve subir um CAD inteiro. Precisa aparecer em milissegundos |
| **workspace** | **o app deles**, WASM, `?embed=editor`, com o tema `zaeon.json` | é aqui que o 1:1 vive: os 610 comandos, a timeline, os parâmetros, o histórico de undo |

O `CadView` continua valendo — como **miniatura**, não como editor.

### O que o executor faz, concretamente

1. **Escrever `zaeon.json`** no formato acima, sobre `base: "dark"`, mirando o `blueprint.json` como
   referência de quantidade (155 de 192 cores). As nossas: o ciano/violeta da marca, o fundo
   `#05060c` do cyberespaço, e os cantos do nosso padrão.
2. **Colocá-lo no bundle**, em `assets/styles/ui/themes/zaeon.json`, no estágio de build do WASM — é
   um arquivo de asset, não um patch de código.
3. **Selecioná-lo como padrão** no embed. Confirmar **como** se seleciona: há
   `crates/ui-egui/src/prefs/theme_picker.rs` e `theme_options.rs`, e provavelmente um comando
   `config.*` na família de 8 — `list_commands` com `prefix: "config."` responde isso em uma chamada.
   **Eu não verifiquei qual comando é.**
4. **Teste T9 (novo):** carregar o embed, ler um token de cor via `solidcraft.request("ui.inspect")`
   e afirmar que o valor é o nosso, não o padrão. É o que prova que o tema pegou, em vez de confiar
   que pegou.

⚠️ **O que eu NÃO verifiquei nesta rodada:** qual comando ou preferência seleciona o tema no embed,
e se um tema pode vir embutido no bundle WASM como padrão (em vez de importado pelo usuário). São as
duas perguntas que o passo 3 tem de responder antes de escrever código — e `list_commands` com
`prefix: "config."` é onde olhar primeiro.
