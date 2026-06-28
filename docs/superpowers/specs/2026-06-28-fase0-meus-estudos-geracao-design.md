# Fase 0 — Consertar a geração do "Meus Estudos"

**Data:** 2026-06-28
**Escopo:** 1 PR (Fase 0 do plano de Aulas — bônus rápido, ver `docs/AULAS_TEACHER_AGENT.md`)
**Objetivo:** a geração deve (1) produzir **um estudo de verdade** (não vazio / não erro sticky) e
(2) funcionar **mesmo com a aba "Meus Estudos" fora de foco** (feed montado, só escondido).

---

## 1. Diagnóstico (causa-raiz)

Caminho da geração:
`typeIntoBarAndRun → zaeonStudy → POST /api/study/agent → geminiText` + `cacheJson` (Redis).

### Causa A — parse de JSON frágil → "estudo" só com título
`app/api/study/agent/route.ts:48` faz `JSON.parse(raw.replace(/```json|```/g, "").trim())`.
O Gemini Flash às vezes devolve prosa em volta do JSON, vírgula sobrando ou aspas curvas.
Quando o parse estoura: `parsed = {}` → `blocks = []` → a linha 60
(`if (!blocks.some(heading)) blocks.unshift({heading, text: title})`) injeta **um único heading**.
Resultado: `{ title, blocks: [só o título] }`.

No front (`components/study/MeusEstudosFeed.tsx:355`) o guard é `d.blocks.length === 0` — que é
**falso** (tem 1 bloco) — então **não mostra erro** e renderiza um estudo só com título, sem corpo.
→ É o sintoma "gera vazio".

### Causa B — cache envenenado por 7 dias
`cacheJson` (`src/lib/cache.ts:42`) grava qualquer resultado não-nulo por 7 dias. O estudo
degenerado (só título) é não-nulo → vai pro cache. A partir daí **toda** tentativa com o mesmo
comando devolve o mesmo estudo vazio por uma semana. Por isso parece "quebrado", não "instável".

### Causa C — usuário sem nenhum espaço → eventos descartados (Goal 2)
`zaeonStudy` (linha 331) e o listener `zaeon:study:run` (linha 441) abortam em silêncio se
`!spaceId`. Usuário novo (zero estudos) tem `spaceId = ""` → "Estudar esse tema" / handoff de voz
não fazem nada. Sem fila, sem retry: o evento some. O mesmo guard descarta um evento que chega
enquanto `zaeonBusy` ainda está `true`.

### Fora de escopo
Falha por credencial/região Vertex (502 puro vindo de `geminiText` lançando) é deploy/env, não
código. Não tratamos aqui além de deixar o log claro.

---

## 2. Correção

### Goal 1 — gerar estudo de verdade (server: `app/api/study/agent/route.ts`)

1. **`extractJson(raw)` tolerante** (helper novo, testável):
   - remove fences ```` ```json ```` / ```` ``` ````;
   - acha o **primeiro objeto `{…}` balanceado** dentro do texto (ignora prosa antes/depois);
   - retorna `null` em vez de lançar quando não acha JSON válido.

2. **JSON mode do Gemini (opt-in)** — flag nova `json?: boolean` em `lib/ai/gemini-text.ts`:
   - quando `true`, seta `generationConfig.responseMimeType = "application/json"`;
   - **só** a rota `study/agent` usa — zero impacto nas outras rotas (decisão: flag opt-in).
   - `extractJson` continua como cinto-e-suspensório mesmo com JSON mode ligado.

3. **Validar "estudo de verdade"** (`isRealStudy(blocks)`):
   - mínimo: **≥ 3 blocos** no total **e ≥ 1 bloco `text`** com corpo não-trivial
     (ex.: `text.trim().length >= 40`).
   - heading-only / vazio **não** conta como estudo.

4. **1 retry** — se a 1ª resposta falhar no parse ou em `isRealStudy`, repetir `geminiText` uma vez
   com prompt mais firme (reforça "responda só JSON, entre 6 e 12 blocos, com parágrafos de corpo").

5. **Não envenenar o cache** — se mesmo após o retry vier degenerado, **lançar** dentro de
   `produce()` (em vez de retornar o objeto magro). Como `cacheJson` só grava resultado não-nulo e
   `produce` lança, **nada é cacheado** e o `catch` da rota responde **502** →
   front mostra "Não consegui montar agora. Tente reformular o comando." (decisão: erro honesto +
   retry, sem fallback de esqueleto).

6. **Bump da versão da chave de cache** — `hashKey("studyagent", …)` → `hashKey("studyagent2", …)`.
   Ignora **na hora** todas as entradas já envenenadas, sem esperar o TTL de 7 dias.

### Goal 2 — gerar mesmo ao sair da aba (front: `components/study/MeusEstudosFeed.tsx`)

1. **`ensureSpaceId()`** — se `spaceId` estiver vazio na hora de um run, **criar um espaço**
   (`POST /api/study/spaces`), setar no estado e devolver o id (em vez de abortar).

2. **Fila + flush** — `pendingTopicRef` guarda o tópico pendente:
   - o listener `zaeon:study:run` e o handoff **enfileiram** o tópico e chamam `flush()`;
   - `flush()` só roda se **não** estiver `zaeonBusy`; se faltar `spaceId`, chama `ensureSpaceId()`;
   - um `useEffect([spaceId, zaeonBusy])` chama `flush()` de novo quando o espaço fica pronto ou o
     busy libera → o evento **nunca** mais é descartado em silêncio.
   - Ao consumir, limpa o ref (1 run por tópico enfileirado).

3. A barra de comando manual (submit direto) continua chamando `zaeonStudy` como hoje, mas passando
   pela mesma garantia de espaço.

---

## 3. Testes (vitest)

- **`extractJson`** — casos: JSON puro; com fences; com prosa antes/depois; com vírgula sobrando;
  lixo total (→ `null`).
- **`isRealStudy`** — heading-only → `false`; estudo com corpo → `true`; < 3 blocos → `false`.
- (Se houver harness pra rota) opcional: a rota responde 502 quando `geminiText` devolve lixo
  repetido, e **não** grava cache.

Verificação padrão: `npx tsc --noEmit` (tolerar o 1 erro pré-existente em `app/research-lab/page.tsx`)
+ `npx vitest run`.

---

## 4. Arquivos tocados

- `app/api/study/agent/route.ts` — `extractJson`, `isRealStudy`, retry, lançar em degenerado,
  JSON mode, bump da chave.
- `lib/ai/gemini-text.ts` — flag opt-in `json?: boolean` → `responseMimeType`.
- `components/study/MeusEstudosFeed.tsx` — `ensureSpaceId`, `pendingTopicRef`, `flush`,
  `useEffect([spaceId, zaeonBusy])`.
- Testes novos em `__tests__/`/`tests/` (seguir o padrão existente do repo).

## 5. Regras de processo (do handoff)

Branch + PR (não push direto no `main`). Não usar `git add -A`. Parar e pedir revisão ao fim da fase.
Manter `voice-engine` em `1g` (não tocamos em docker aqui).
