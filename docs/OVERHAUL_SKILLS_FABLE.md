# OVERHAUL — Fábrica de Skills da Zaeon (plano de execução para o Claude Fable)

**Para:** Claude Fable (executor). Você vai AUTORAR cards de skill em lote. O mecanismo já existe e
está provado — você **não** constrói sistema, você **abastece** o catálogo.
**Base:** branch `claude/skills-da-casa` (sistema de skills + 5 famílias + 13 cards, provado).
**Status:** mecanismo COMPROVADO (6.643 testes verdes, 643 arquivos, `tsc` rc=0). Era a condição do
dono: *"apenas depois de comprovarmos que funciona."* Agora funciona. Este plano é o abastecimento.
**Regra de ouro:** nenhum card entra sem passar no PORTÃO (§2). O portão é o aceite — se ele passa,
o card vai para produção; se não passa, o card não existe.

---

## 0. O que JÁ existe (NÃO reconstrua)

O catálogo é o **diretório** `.claude/skills/` — cada subpasta é um card. O loader, o portão e a
vitrine já leem dali. Os módulos de mecanismo (não toque, só use):

| Arquivo | O que faz |
|---|---|
| `lib/agent/skills-dir.ts` | lê o diretório, monta o `CardDaSkill` (preço, família, device). |
| `lib/agent/skills-boot.ts` | liga o cardápio no chat (`activate_skill`). |
| `lib/estudos/vitrineSkills.ts` | card → item da vitrine (aplica a regra do dono). |
| `lib/solana/cotacao.ts` | preço fixo em reais → SOL ao vivo (CoinGecko). |
| `lib/curso/formato.ts` | valida um `curso.json` (reusa `buildQuestionBlock` do professor). |
| `lib/agentic-skill/contrato.ts` + `runner.ts` | "funciona nos 3 modelos" por contrato de saída. |
| `lib/auth/roles.ts` → `DONO_VITRINE` | o dono de todo item pago/curso. **Fonte única.** |

**As 5 famílias** (o campo `zaeon-familia` no frontmatter decide o que o portão cobra):

1. `procedimento` — skill de conhecimento comum (ex.: `anatomia-3d`, `scroll-suave-lenis`).
2. `agentic` — roda em Claude, Codex e Octa; tem `agentic.json` (tarefa + contrato + 3 modelos).
3. `pago` — tem `zaeon-preco-brl > 0`; pertence ao fundador.
4. `device` — espelho de download + instruções; roda na máquina do aluno.
5. `course` — curso completo autorado em `curso.json`; pertence ao fundador.

**Os 13 cards que já existem** (NÃO recrie): `anatomia-3d`, `scroll-suave-lenis` (procedimento);
`lgpd-scan`, `revisao-fresca`, `slides-agente`, `busca-30dias`, `blindar-engenharia-reversa`
(agentic); `phoneuse-iphone`, `musica-orpheon`, `llm-local-apple`, `poki-iphone` (device);
`buraco-negro-ascii`, `game-engine-brutal` (R$ 545) (course).

---

## 1. TRAVAS DE FERRO (quebrar qualquer uma = o card não entra, e você errou)

1. **Licença.** Todo card credita a fonte e declara a licença (`zaeon-app-licenca` + `license`).
   **Sem `LICENSE` no repo = card não entra** — exceto se o dono já confirmou a licença por escrito
   (ex.: BRUTAL e JIN2 = MIT, confirmado). Na dúvida, **pergunte ao dono, não assuma**.
2. **AGPL.** Código AGPL **nunca roda no servidor da Zaeon**. Só entra como `device` (o aluno roda na
   máquina dele) — jamais como `agentic` que a casa executa. Diga isso no corpo do card.
3. **Regra do dono.** Todo `pago` e todo `course` pertence ao fundador. Isso é **atribuído** pelo
   código (`DONO_VITRINE`), não lido da skill — você **não** escreve e-mail de dono em lugar nenhum.
4. **Sem hash falso.** `zaeon-device-sha256` só entra se você computou o hash do arquivo REAL. Se não
   dá para baixar e conferir, **deixe ausente** (device grátis aceita). Device **pago** exige sha256
   — então um device pago sem hash conferido **não entra**; peça o hash ao dono.
5. **Sem mentir sobre modelo.** Você NÃO roda os 3 modelos (não há chave no ambiente de autoria). O
   `agentic.json` declara o contrato; a prova real é o `AGENTIC_E2E=1`, que o dono/CI roda com as
   chaves. Nunca diga que rodou o que não rodou.
6. **Segurança.** Nada de card que ajude ataque, deepfake de pessoa real, burla de DRM/licença/auth,
   ou evasão de detecção. Ferramenta dual-use (pentest, engenharia reversa) **só** com enquadramento
   **defensivo explícito** no corpo e, para as ofensivas, **decisão do dono** (§6).
7. **Crédito e link.** O corpo de todo card baseado em repo de terceiro credita o autor e linka a
   fonte. Você ensina/aponta; você não redistribui o código alheio como se fosse seu.
8. **Nunca use `[skip ci]`, `[ci skip]`, `[no ci]`, `[skip actions]`** em nenhuma mensagem de commit.

---

## 2. O PORTÃO — o aceite (rode ANTES de cada commit; se não passa, o card não existe)

```sh
# 1. typecheck
npx tsc --noEmit -p .                       # tem de dar rc=0

# 2. o portão das skills (valida TODO card do diretório)
npx vitest run lib/agent/skills-dir.test.ts \
               lib/estudos/vitrineSkills.test.ts \
               lib/curso lib/agentic-skill       # tudo verde

# 3. a suíte inteira (nenhuma regressão)
npx vitest run lib/ app/                          # tudo verde
```

O portão cobra, por família, automaticamente (você não escreve teste — o teste já existe e varre o
diretório):

- **todas:** frontmatter no formato do Claude (`name` = pasta, ≤ 64; `description` ≤ 1024 e com
  "use"/"quando"); corpo com ≥ 3 linhas de instrução; `courseTags` não-vazio; card (se houver) com
  título, subtítulo, entrega e um `zaeon-modelo` que a vitrine desenha; gatilhos que **não** disparam
  em pedido neutro; toda tool de `allowedTools` existe no registry.
- **agentic:** `agentic.json` válido — `tarefa` real, `contrato` (json/contains/regex), e promete os
  **três** modelos (`claude`, `codex`, `octa`).
- **pago:** `zaeon-preco-brl > 0`, e o item pertence ao fundador.
- **device:** `zaeon-device-mirror` é URL https; `zaeon-device-plataforma` ∈ {ios, macos, android,
  windows, linux}; sha256 (se houver) é 64 hex; **device pago exige sha256**.
- **course:** `curso.json` completo — ≥ 2 módulos, cada um com estudo (≥ 280 chars), prova (≥ 2
  blocos que passam no validador do professor), desafio, e sandbox (python/react/none; se código,
  com `inicial` + `teste`).

**Sandbox de curso:** se o sandbox é `python`, **confira com Python real** que a solução correta
passa no `teste` e o `inicial` (stub) falha. Um sandbox que não discrimina solução de stub é um
desafio vazio.

Os e2e reais são **opt-in** e você NÃO roda (sem chave/rede aqui): `AGENTIC_E2E=1` (3 modelos),
`DEVICE_E2E=1` (o espelho resolve), `COTACAO_E2E=1` (CoinGecko). São o dono/CI que roda.

---

## 3. COMO AUTORAR UM CARD (o envelope `metadata.zaeon-*`, por família)

Cada card é `.claude/skills/<nome-kebab>/SKILL.md`. O frontmatter é YAML; o `name` = o nome da pasta.
Modelo mínimo comum:

```markdown
---
name: <nome-kebab>
description: <em 3ª pessoa, diz O QUE faz e QUANDO usar; contém "use" ou "quando">. <Credita a fonte>.
license: <SPDX, ex.: MIT>
runtime: ts
risk: read
minPlan: free
courseTags: [<área1>, <área2>]
metadata:
  zaeon-familia: <procedimento|agentic|pago|device|course>
  zaeon-titulo: <título do card na vitrine>
  zaeon-subtitulo: <uma linha de chamariz>
  zaeon-modelo: <console|chip|planta|predio|drone|foguete|molecula|engrenagem|livro|graos|ondas|robo>
  zaeon-tags: <a, b, c>
  zaeon-entrega: <o que o aluno ganha; itens separados por ; >
  zaeon-app-licenca: <licença da fonte original, creditada>
---

# <título>
<corpo: o PROCEDIMENTO, ≥ 3 linhas reais. Para agentic, inclui o FORMATO DE SAÍDA obrigatório.>
## O que esta skill NÃO faz
<os limites — sempre presentes>
```

**Família `agentic`** — some `.claude/skills/<nome>/agentic.json`:
```json
{
  "tarefa": "<pedido canônico, > 12 chars, que vai aos 3 modelos>",
  "contrato": { "tipo": "json", "chaves": ["<k1>", "<k2>"] },
  "modelos": ["claude", "codex", "octa"]
}
```
O corpo da SKILL.md **precisa** ditar o formato de saída que casa com o contrato (ex.: "Responda
APENAS um array JSON com as chaves …"). Contrato `contains` (lista `termos`) ou `regex` (`padrao`)
quando JSON não serve.

**Família `pago`** — acrescente `zaeon-preco-brl: <reais>` no `metadata`. O dono é atribuído pelo
código; não escreva dono.

**Família `device`** — acrescente:
```yaml
  zaeon-device-plataforma: <ios|macos|android|windows|linux>
  zaeon-device-mirror: <URL https estável de download, ex.: .../releases/latest>
  zaeon-device-sha256: <64 hex, SÓ se você conferiu; obrigatório se pago>
```
O corpo = instalação + uso no dispositivo do aluno, com a seção "O que esta skill NÃO faz" deixando
claro que a Zaeon **não executa** o app.

**Família `course`** — some `.claude/skills/<nome>/curso.json`:
```json
{ "modulos": [ {
  "titulo": "…", "estudo": "<markdown, ≥ 280 chars, ensina de verdade>",
  "prova": [ {"kind":"q-choice","block":{…}}, {"kind":"q-written","block":{…}} ],
  "desafio": {"kind":"q-written","block":{…}},
  "sandbox": {"tipo":"python","inicial":"<stub>","teste":"<asserts: solução passa, stub falha>"}
} ] }
```
Blocos válidos (`kind`): `q-choice` (options com ≥ 2 e ≥ 1 `isCorrect`), `q-written`
(`accepted: []`), `q-voice`, `q-roulette`, `q-cloze`, `q-dragwords`. Curso pago → acrescente
`zaeon-preco-brl` e `zaeon-familia: course` (o portão trata preço + curso como do fundador).

---

## 4. A FILA DE TRABALHO (o abastecimento, em lotes)

Trabalhe **um lote por vez**: autore, rode o PORTÃO (§2), **commit**, **push**. Nunca acumule vários
lotes sem o portão passar. Mensagem de commit no padrão `feat(vitrine): …` com Co-Authored-By.

### Lote A — Apps científicos (os que o dono nomeou)

Família recomendada e como cada um entra. **Antes de autorar**, verifique o repo oficial, a licença
e um release real (o mirror). Onde a família pedir dado que você não tem (hash, conteúdo de curso),
**pare e peça ao dono** — não invente.

| App | Família recomendada | Como entra | Licença a confirmar |
|---|---|---|---|
| **GeoGebra** | `agentic` | o agente emite comandos de construção; contrato JSON `["comando"]` (a página renderiza o applet). | não-OSS p/ app; o deployment web tem termos — **confirme com o dono** antes. |
| **Jupyter / JupyterLite** | `procedimento` | ensina notebooks; o sandbox de curso já roda Python (Pyodide). | BSD-3. |
| **QGIS** | `device` | download do GUI + instruções (SIG no desktop do aluno). | GPL-2.0 (device, ok). |
| **Blender** | `device` | download + instruções; (upgrade `agentic` só se o dono aprovar `blender --background --python` na imagem). | GPL-2.0/3.0 (device, ok). |
| **FreeCAD** | `device` | download + instruções; (upgrade `agentic` via `freecadcmd` só com aval do dono). | LGPL-2.1 (device, ok). |
| **KiCad** | `device` | download + instruções; (upgrade `agentic` via `kicad-cli`). | GPL-3.0 (device, ok). |
| **Scilab** | `device` | download + instruções; ou `procedimento` ensinando o equivalente em Python no sandbox. | GPL-2.0 (device, ok). |

**Regra do "upgrade agentic por CLI na imagem":** instalar um binário no `Dockerfile` (como o
`solidcraft-cli` do Eiffel) é **decisão do dono**, não sua. Entregue como `device` por padrão;
proponha o upgrade agentic ao dono numa linha, não o faça sozinho.

### Lote B — "As melhores skills de cada área do conhecimento" (pesquisa + autoria)

O dono pediu: *"pesquise as melhores skills de várias áreas do conhecimento."* Para cada área,
encontre **1–3 repos open-source de referência** (licença OSS, ativo, com release/uso real) e autore
o card na família certa. Áreas-semente (expanda): matemática, física, química, biologia, medicina,
engenharia, computação, ciência de dados, design, música, idiomas, finanças, direito, história,
geografia, astronomia.

Para cada card de pesquisa: **verifique o repo no GitHub** (existe? licença OSS? ativo?), credite,
e escolha a família pela natureza (roda no navegador do aluno e produz JSON → `agentic`; app que ele
baixa → `device`; conteúdo que você autora → `course`; conhecimento puro → `procedimento`). Um repo
sem licença OSS **não vira card** — anote e siga.

### Lote C — Resto da lista original do dono (as 13 que faltam já foram; sobram as sinalizadas)

Nada a fazer sem o dono: ver §6.

---

## 5. DISCIPLINA DE COMMIT

- Branch: `claude/skills-da-casa` (ou o que o dono indicar). **Nunca** empurre direto na default.
- Um lote = um commit, só depois do PORTÃO (§2) todo verde.
- Mensagem: `feat(vitrine): <lote> — <o que entrou, por família, creditado>`, com a verificação
  (tsc rc=0, N testes verdes) e, para course, "sandbox conferido com Python real". Termine com:
  ```
  Co-Authored-By: Claude Fable <noreply@anthropic.com>
  Claude-Session: <a sua sessão>
  ```
- `git push` com retry (2s, 4s, 8s, 16s) só em erro de rede.

---

## 6. O QUE É DECISÃO DO DONO (NÃO sua) — pare e pergunte

1. **Instalar binário na imagem** (Blender/FreeCAD/KiCad/QGIS headless no `Dockerfile`) — custo de
   imagem e de manutenção. Proponha; não faça.
2. **Os três antes sinalizados — DECIDIDOS pelo dono e EMBARCADOS** (o dono é a autoridade de
   publicação da plataforma, e os três são open-source):
   - **`godmod3-redteam`** — G0DM0D3 (AGPL-3.0), acesso `pago` **R$ 333**, sob demanda. Enquadrado como
     ferramenta de **pesquisa de segurança de IA / red-teaming**; self-host na máquina do aluno (a
     Zaeon não executa). **Nota técnica importante:** um card NÃO passa por `guardAction` — aquela
     trava governa *ações do agente* (furtividade/evasão), não o catálogo. Então o card entra sem
     tocar na trava, e a trava **continua intacta** (ela é um dos três locks imutáveis de
     `agentic.ts`). Não marque "admin" em `guardAction`: é desnecessário e seria enfraquecer o lock.
   - **`artex-pentest`** — ARTEX (AGPL-3.0), `device` grátis, com disclaimer de **autorização
     obrigatória** (só alvos próprios/autorizados). Self-host; a Zaeon não executa.
   - **`koubo-video-ia`** — Digital Human Koubo (MIT), `device` grátis, com a regra de **só a própria
     imagem/voz ou com consentimento**. Self-host; a Zaeon não executa.
3. **Qualquer licença não confirmada** (repo sem `LICENSE`). Não assuma — pergunte.
4. **Preço** de qualquer card pago além do que o dono já definiu (BRUTAL = R$ 545).
5. **Ligar a cotação/Solana em produção** (env `CROSSMINT_SERVER_KEY`, `HELIUS_API_KEY`,
   `SOLANA_NETWORK`, e a allowlist de rede para `api.coingecko.com`). A camada existe e degrada sem
   as chaves; ligar é deploy, é do dono.

---

## 7. DEFINIÇÃO DE PRONTO (de cada card, e do overhaul)

**Um card está pronto quando:** passa no PORTÃO (§2); credita e linka a fonte; respeita as travas de
ferro (§1); e (course) tem o sandbox conferido com execução real.

**O overhaul está pronto quando:** o Lote A (apps científicos) e o Lote B (melhores por área) estão
no ar como cards que passam no portão, cada área do conhecimento tem pelo menos uma skill plugável no
chat, e as decisões do §6 foram levadas ao dono. O norte do dono: *"a Zaeon como uma grande fábrica
de coisas open-source — abastecer todos os cursos com todos os tipos de skills possíveis para eles
plugarem no chat, e não apenas uma ou duas."* Cada skill também é um card na seção **Skills** da
vitrine, automaticamente (você não mexe na vitrine; o `vitrineSkills` já faz).

---

### Apêndice — comandos que você vai repetir

```sh
# validar um curso.json isolado:
npx tsx -e "import {carregarCurso,leitorDeDisco} from './lib/curso/carregar'; \
  const r=carregarCurso(leitorDeDisco(),'<pasta>'); console.log(r.ok?'OK':JSON.stringify(r.problemas))"

# validar um agentic.json isolado:
npx vitest run lib/agentic-skill/runner.test.ts -t 'repositório'

# ver todos os cards e seus donos/preços:
npx tsx -e "import {itensDasSkillsDoDisco} from './lib/estudos/vitrineSkills'; \
  for (const x of itensDasSkillsDoDisco()) console.log(x.id, x.tipo, x.dono??'—', 'R\$'+(x.precoBRL??0))"
```
