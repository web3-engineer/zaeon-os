# HANDOFF — Sala de Estudos Modular (todas as skills/cursos) → para o Codex

> Autor: Claude (Opus 4.8). Motivo deste handoff: falhei repetidamente em acertar o
> alvo desta tarefa. Toda a experiência de "comprar um card de estudo → abrir o
> conteúdo" está quebrada, para TODAS as famílias de skill — não só os cursos de
> código. Este documento entrega o contexto inteiro para o Codex implementar do zero,
> com o alvo correto e sem repetir meus erros.

---

## 0. Contexto / por que esta mudança

A Zaeon tem uma **vitrine de estudos** onde o aluno "compra/conecta" cards. Cada card é
uma **skill** lida de `.claude/skills/<slug>/SKILL.md`. Ao conectar, o aluno deveria cair
na **Sala de Estudos**, no **módulo certo** para aquele tipo de conteúdo. Hoje isso está
quebrado: todo card abre no lugar errado. O dono quer uma **Sala de Estudos MODULAR** —
a sala escolhe o módulo pela **família da skill + se tem repositório**.

## 1. Sintomas observados em produção (main, hoje)

- Comprar um card → abre no **CHAT**, dentro de uma **conversa já existente de outro
  assunto** (injeta no thread ativo).
- **MuseScore** (família `device`) → abre no chat. Deveria ser painel de **download +
  instruções**.
- **astropy / pandas** (código) → abrem no chat, **sem board, sem graphify, sem repo**.
- "na sala de estudos ainda abre usando **anatomy**" → há um **default** que mostra o
  atlas de anatomia independentemente do card clicado (investigar — ver §5 fase 5).
- Antes de tudo isso aparecia "**blueprints antigos**" (o `feed`/`SalaBlueprint`).

## 2. O ENTREGÁVEL (confirmado com o dono)

Uma **Sala de Estudos Modular**: cada card abre o módulo certo, **numa conversa/espaço
NOVO** (nunca no thread ativo). Mapa **família → módulo**:

| família | qtd | módulo correto |
|---|---|---|
| `device` | 23 | **Painel device**: botão de download (mirror) + sha256 + corpo da skill como cards de instrução. SEM repo/graphify. |
| `procedimento` **com repo** | ~8 | **Board de código** (graphify + cards interligados + repositório + understand-anything). |
| `course` | 3 | **Board de código** (idem). |
| `agentic` | 9 | **Artefato focado**: o agente roda e mostra a saída (slides, diagrama, fórmulas…). |
| `procedimento` **sem repo** | ~1 | fallback para `agente`. |
| `pago` | 1 | conforme o conteúdo (tratar como a família de base). |

### Decisões travadas com o dono (via perguntas diretas)
1. **device → painel device dedicado** (não board; não chat).
2. **repo → campo estruturado `zaeon-repo: owner/name`** no frontmatter; preencher os ~12
   cards de código. (Extrair do corpo é frágil — ver §6, já saiu sujo.)
3. **Board de código agora = `procedimento`-com-repo + `course`** (~12 cards).

## 3. Histórico das falhas — o que NÃO fazer

- **PR #803 (JÁ MERGEADO em `main`)** — meu erro central. Roteou **TODO** `skill:*` → chat
  (mandava um texto pra Aura via `send`). Errado em 3 frentes: (a) device também foi pro
  chat; (b) injetou no **thread ativo** de outro assunto; (c) **nunca mostra board**.
  **PRECISA SER SUBSTITUÍDO** pelo roteamento modular (ver §5 fase 0).
- Erros anteriores já corrigidos e em `main` (não mexer; só contexto): #798 (falas de
  música → neutras no ocioso), #799 (aba-fantasma do doc auto-aberto), #801 (gate de
  provas-reais), #802 (quality-engine).
- **Lições (regras):** não mandar código pro chat; não injetar no thread ativo; **não
  tratar todo `skill:*` igual** — rotear por família; não subir motor com fetch mockado
  (PROVAS REAIS, §7).

## 4. Arquitetura atual — mapa do código

### 4.1 Skills no disco
- `.claude/skills/<slug>/SKILL.md`, frontmatter YAML com envelope `metadata.zaeon-*`.
- Parser/validação: **`lib/agent/skills-dir.ts`** → `cardDaSkill(s)` → `CardDaSkill`
  `{slug,titulo,subtitulo,modelo,tags,entrega,app,precoBRL,familia,device}`. Famílias:
  `procedimento|agentic|pago|device|course`. `device` carrega `DeviceInfo {plataforma,
  mirror, sha256}` de `zaeon-device-*`.
- Validador **strict**: `lib/agent/skills.ts` `validateSkill(md,{mode:"strict",dir})`.
  **ATENÇÃO:** conferir se adicionar uma nova chave `zaeon-repo` em `metadata` passa no
  strict (promove warning→erro). Se o strict rejeitar chaves desconhecidas, ajustar lá.
- **Empacotamento:** `.dockerignore` tem `*.md` com exceção `!.claude/skills/**`
  (fixada por `lib/agent/skills-dir.test.ts`). Sem ela as skills somem na imagem.

### 4.2 Card → item da vitrine
- `lib/estudos/vitrineSkills.ts` `itemDaSkill(card)` → `ItemVitrine` com **id `skill:<slug>`**,
  `tipo` = `curso` (família course) | `skill`, `execucao: "agente"`.
- `lib/estudos/vitrine.ts`: catálogo, `filtrarVitrine`, tipo `ItemVitrine`, `NOME_TIPO`.
- `lib/estudos/vitrineSkills.test.ts`: bom modelo de teste — itera os cards REAIS do disco
  (`itensDasSkillsDoDisco()`), não inventa fixtures.

### 4.3 Conexão/compra (o ritual) e roteamento atual
- **`components/estudos/VitrineEstudos.tsx`**:
  - ~linha 151 (fim do ritual de conexão): `conectarItem(it.id)`, `plugar`,
    `marcarCadernoPendente(cadernoDoItem(it))`, `marcarForjaPendente(forjaDoItem(it))`,
    `marcarSkillPendente(skillDoItem(it))` **[#803 — substituir por roteador modular]**.
  - `destinoDe(it)` (de `lib/estudos/detalhes.ts`) decide a aba do botão "abrir":
    `skill:*` → `"chat"` **[#803 — errado]**. Precisa virar **módulo-aware**.
  - `abrirDestino(d)` ~linha 40: aba `"chat"` → `EVT_ESTUDOS_CHAT`; senão `zaeon:set-tab`.
- **Três mecanismos de "pendente"** (padrão a seguir — exceto o de skill, que está errado):
  - Jornada: `lib/jornadas/desbloqueio.ts` (`cadernoDoItem`, `marcarCadernoPendente`,
    `EVT_ABRIR_CADERNO`).
  - **Forja (o bom exemplo):** `lib/forja/desbloqueioForja.ts` (`forjaDoItem` id `forja:*`,
    `marcarForjaPendente`, `EVT_ABRIR_FORJA`, `consumirForjaPendente`).
  - Skill **[#803 — errado]:** `lib/estudos/desbloqueioSkill.ts` (`skillDoItem`,
    `marcarSkillPendente`, `EVT_ABRIR_SKILL`, `primeiraMensagemDaSkill` → manda texto pro
    chat). A *plumbing* (pendente+evento) é reaproveitável; o **destino** é que está errado.

### 4.4 A Sala de Estudos (shell + abas)
- **`app/workstation/student/StudyRoomContent.tsx`**: abas `meus-estudos` (o
  `StudyCoworkChat` + embeds de estúdio renderizados INLINE na conversa), `feed`
  (`components/blueprint/SalaBlueprint` = os "blueprints antigos"), `community`.
  `EVT_ESTUDOS_CHAT` → `setActiveTab("meus-estudos")`.
- **`components/study/StudyCoworkChat.tsx`**:
  - `runStudioAction(kind, topic, attachMsgId?, silencioso?, contexto?, pdf?,
    espacoDeAntes?, autoAbrir?)` ~linha 941 → `gerarArtefato(kind,{spaceId,topic,...})` →
    dispatch **`zaeon:study:embed`** (renderiza o artefato **INLINE na conversa**,
    `scopeId` = conversa ativa). `spaceId` vem de `focusIds[0]` ou `criarEstudo(topic)`.
  - Consumidores pendentes: caderno ~995, **forja ~1008** (`runStudioAction("forja", id,
    …, autoAbrir=true)`), skill ~1021 **[#803 — errado: `sendRefA.current(
    primeiraMensagemDaSkill(...))`]**.
  - `sendRefA` ~458 (envio direto ao chat). `skillNode` state ~514.
  - **BUG do thread:** `scopeId`/`spaceId` usam `abaAtivaRef.current` → por isso o conteúdo
    cai na conversa aberta de outro assunto. Abrir um estudo tem que **criar espaço/conversa
    NOVA**, não reusar a ativa.

### 4.5 O board da Forja — a UX-alvo para "código"
- **`lib/forja/cursoRepo.ts`**: `ESQUELETOS` (exemplo + INICIANTES + AVANCADOS),
  `esqueletoPorId(id)`, `montarCursoEsqueleto(esq)`, `cursoEsqueletoPorId(id)`. Esqueleto =
  `{id, repo:"owner/name", titulo, resumo, modo, licenca?}`. O board (cards-módulo via
  `modulosPadrao`) nasce do esqueleto; grafo/árvore vêm do engine depois.
- **`lib/forja/engineClient.ts`**: `grafoDoRepo(repo)` (graphify, estático, sem LLM) +
  `entendimentoDoRepo(repo)` (understand-anything), via `FORJA_BRIDGE_URL/TOKEN` (app server
  `localhost:8800`). **Sem a ponte → null → o board degrada pro esqueleto curado** (ainda
  tem cards, só sem o grafo vivo). Degrada bem: é seguro abrir o board sem a box ligada.
- `lib/forja/adaptadores.ts` (graphify/understand → grafo/árvore); `lib/forja/tipos.ts`
  (`CursoRepo`, `EsqueletoRepo`, `GrafoConhecimento`, `ArvoreEntendimento`).
- **Render:** `gerarArtefato("forja",...)` (server) → `studioKind` forja → componente de
  estúdio (`components/studio/StudioBlock.tsx` + a view do board). **Codex: confirmar o
  componente exato do board e se ele é inline (bolha) ou tela cheia.** A UX que o dono pede
  é "board com cards interligados, repositório, graphify, understand-anything" — pode exigir
  uma **aba/vista dedicada** na sala, não uma bolha inline no chat.

### 4.6 Aura / skills no chat (relevante só se o board também quiser a Aura conduzindo)
- `lib/agent/aura-harness.ts`: `registrarSkillsDaCasa()` + cardápio + ferramenta
  `activate_skill`.

## 5. Proposta de implementação (para o Codex executar, fase a fase)

**Fase 0 — Neutralizar/substituir o #803**
- Remover o roteamento `skill:*`→chat: tirar `marcarSkillPendente` do `VitrineEstudos`,
  reverter `destinoDe` `skill:*`→"chat", remover (ou reaproveitar) o consumidor de skill em
  `StudyCoworkChat`. Manter `desbloqueioSkill.ts` só se a plumbing for reusada pelo roteador
  modular.

**Fase 1 — Metadados + resolvedor (fundação; puro + testes)**
- Adicionar `zaeon-repo: owner/name` no frontmatter dos ~12 cards de código (§6). Parsear em
  `cardDaSkill` → `CardDaSkill.repo: string|null`. Conferir validador strict (§4.1).
- `lib/estudos/moduloDoItem.ts` (novo, **PURO**): `moduloDoItem(card)` →
  `"board" | "device" | "agente"`:
  - `course` → board; `procedimento` **com** `repo` → board; `device` → device;
    `agentic` → agente; `procedimento` **sem** repo → agente; `pago` → base por conteúdo.
- Testes iterando os cards REAIS do disco (modelo: `vitrineSkills.test.ts`), exigindo o
  módulo certo por família.

**Fase 2 — Board de código (a dor mais alta)**
- Construir um `EsqueletoRepo` on-the-fly a partir do card: `{id: <slug>, repo:
  <zaeon-repo>, titulo: card.titulo, resumo: card.subtitulo, modo: "curso"}`. Opção A:
  registrar os skill-cursos em `ESQUELETOS`; Opção B: estender o caminho de abertura do
  forja pra aceitar um esqueleto derivado da skill. Abrir via `runStudioAction("forja", …)`.
- **Abrir em ESPAÇO/CONVERSA NOVA**, não no thread ativo (corrigir o bug do §4.4).
- Decidir com o dono se o board vira **aba dedicada** ou segue embed inline (ver §4.5).

**Fase 3 — Painel device (23 cards)**
- Novo módulo/`studioKind` "device": botão de download (`card.device.mirror`), `sha256`, e o
  **corpo da skill como cards de instrução**. Investigar se o card device já mostra algo
  pós-plug para reaproveitar. Abrir em espaço novo.

**Fase 4 — Agentic (9)**
- O agente roda e mostra o artefato (slides/diagrama/fórmulas/etc.) **num espaço novo**; não
  injeta em thread alheio.

**Fase 5 — O default "anatomy"**
- Investigar por que a sala mostra **anatomia** por padrão. Leads: `components/blueprint/
  SalaBlueprint.tsx`, o `skillNode` default em `StudyCoworkChat.tsx` (~514), `components/
  studio/AnatomiaView.tsx` como studio block default, `lib/agent/anatomiaDoTurno.ts`.
  Corrigir para placeholder neutro quando nada específico foi aberto.

## 6. Os 12 cursos de código e o repo (preencher `zaeon-repo`)

Valores extraídos do corpo do `.md` (alguns saíram **sujos** — confirmar cada um):

| slug | família | repo (conferir) |
|---|---|---|
| algoritmos-classicos | course | `TheAlgorithms/Python` |
| astropy-astronomia | procedimento | `astropy/astropy` |
| biopython-bioinformatica | procedimento | `biopython/biopython` (corpo tinha ponto final) |
| buraco-negro-ascii | course | **SUSPEITO** (corpo deu `JIN2-ASCII/-JIN2-ASCII`) — conferir no SKILL.md |
| game-engine-brutal | course | `ahwootech/BRUTAL` |
| jupyter-notebooks | procedimento | `jupyterlab/jupyterlab` |
| leaflet-mapas-web | procedimento | `Leaflet/Leaflet` |
| pandas-analise-de-dados | procedimento | `pandas-dev/pandas` |
| querido-diario-direito | procedimento | `okfn-brasil/querido-diario` |
| rdkit-quimica-computacional | procedimento | `rdkit/rdkit` |
| scroll-suave-lenis | procedimento | **sem repo no corpo** — é `darkroomengineering/lenis` (confirmar) |
| sympy-matematica-simbolica | procedimento | `sympy/sympy` |

NOTA: jupyter/leaflet/scroll/querido são libs/web; o dono confirmou "procedimento-com-repo →
board". Se algum não fizer sentido como board, revisar com o dono antes.

## 7. Gate / Provas Reais (obrigatório antes de qualquer PR)

- `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit -p .` → **0**
- `npx next lint` → **0** (só warnings pré-existentes)
- `npx vitest run` → **verde** (hoje ~8215 testes, ~208s)
- `node scripts/compose-check.mjs` → **0**
- **PROVAS REAIS:** `docs/PROVAS_REAIS.md`, `config/provas-reais.json`,
  `scripts/provas-reais-check.mjs`. Nenhum motor próprio é "pronto" só com fetch mockado —
  precisa de smoke real. A Forja já tem smoke (`scripts/forja-smoke.mjs`); se mexer no
  engine, registrar a prova.

## 8. Verificação ponta-a-ponta

Rodar o app no **app server** (porta do deploy), abrir a vitrine de estudos e conectar:
- (a) **astropy** → board com cards/repo, em **espaço novo**;
- (b) **MuseScore** → painel **device** com download + instruções;
- (c) um **agentic** (ex: slides-agente) → artefato focado.
Nenhum pode cair no chat de outro assunto nem na tela de anatomia.

## 9. Branch / PR

As mudanças do #803 já estão em `main`. O Codex deve trabalhar em branch própria, substituir
o comportamento do #803, e abrir PR(s) — de preferência **fase a fase**. Gate verde
obrigatório em cada um.
