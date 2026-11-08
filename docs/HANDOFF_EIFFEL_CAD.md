# Handoff · Eiffel, CAD na Zaeon

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
| tempo de build | *(preencher com o número da medição — a compilação estava em andamento quando este documento foi escrito)* |
| tamanho do `target/` | *(idem)* |
| binário final | *(idem)* |

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
| `lib/agents/capacidades.ts` | `TOOLS_POR_HABILIDADE.cad` = as tools do MCP que admitimos |
| `lib/cad/mcp.ts` (novo) | registra o conector, com `riscoMaximo` e `--allow-path` por conversa |

**A política de risco é nossa, e tem de ser explícita.** `registerMcpConnector` filtra por
`riskFromAnnotations`, e o limite padrão do chat é `RISCO_MAXIMO_CHAT`. Das 19 tools:

- **leitura** (entram sem discussão): `list_commands`, `describe_command`, `inspect_design`,
  `measure`, `body_topology`, `check_parameters`, `screenshot`, `compare_picture`,
  `skill_reference`, `running`, `pending`;
- **escrita no design** (entram, porque é o trabalho dele): `execute`, `batch`, `set_parameter`,
  `export`, `save`, `new_design`, `open`;
- **fora**: `crash_reports` — lê relatórios de crash da máquina, que não é assunto de aluno.

⚠️ `lib/agent/mcp.ts:65` documenta um limite conhecido: `riskFromAnnotations` devolve `write`
quando o servidor não anota. **Não verifiquei** se o SolidCraft anota suas tools. Se não anotar,
tudo vira `write` e o teto do chat pode recusar a tool inteira — é a **primeira coisa a medir**.

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
| **O SolidCraft anota suas tools MCP?** Se não, `riskFromAnnotations` devolve `write` para tudo e o teto do chat pode recusá-las | **medir primeiro** (T2). É o item que pode mudar o desenho do portão |
| Tempo de build do Rust no CI | está na seção 1. Mitigação: `cargo-chef` ou imagem pré-construída |
| **Não medi o build do WASM** (`trunk`) nem o tamanho do bundle | medir antes de prometer o modo edição |
| O `?embed=editor` exige mesma origem | já tratado: o bundle é nosso. Mas **não testei** o embed |
| `screenshot` headless sem GPU cai no rasterizador de CPU | aceitável para miniatura; medir o tempo |
| 16 MiB no `document.import` | design grande com muitos links pode estourar. O teste T6 afirma o limite |
| Versão `0.40.0-rc.3` é **release candidate** | fixar o commit e não seguir `main` cegamente |
| `Engenharia Civil` não está em `constants/courses.ts` | decisão de produto: entra o curso, ou o Eiffel vai para `Arquitetura` |

---

## 7 · Ordem de execução

1. **T2 primeiro** — descobrir se as anotações de risco existem. Muda o portão.
2. O estágio de build no Dockerfile + o recibo no `/api/health`. Sem binário, nada mais roda.
3. O conector MCP + a habilidade `cad` + o Eiffel no registro (E1, E2) com T1 e T7.
4. O `studioKind: "cad"` e o `CadView` com glTF (E3, primeira metade) com T3.
5. O bundle WASM, a host page e o modo edição (E3, segunda metade) com T5 e T6.
6. T4 — o sandbox, por negação. Antes de qualquer coisa ir a produção.
