# Agent Mission — Finalize the "Zaeon" persona system + fix Onboarding (Zaeon OS)

> You are a senior full-stack agent on the **Zaeon OS** monorepo. This document is your
> single source of truth — **ignore prior chat context** and work only from here.
> Two goals, in order: **(1) close out the Zaeon persona model for good**, then
> **(2) fix the new-user Onboarding** per the spec below. Work in **small slices**,
> verify each slice, **never break green**, and **don't deploy** (the owner merges → CI deploys).

---

## 0. Project context (essential)

- **Repo:** `/Users/donmartinez/Documents/Projects.nosync/zaeon-os` · base branch `main`.
- **Stack:** Next 14 (App Router) + custom `server.js`. AI = **Gemini via Vertex AI**
  (`lib/ai/model.ts`, default `gemini-2.5-flash`). Runs on a Hostinger VPS (Docker Compose,
  `docker-compose.beta.yml`, `beta.zaeon.space`).
- **Deploy = automatic on merge:** pushing to `main` triggers `.github/workflows/deploy.yml`
  (SSH → `git reset --hard origin/main` + `docker compose up -d --build`). The owner merges
  PRs on GitHub. **You never SSH/deploy.**
- **Per-slice verification (mandatory):** `npx tsc --noEmit -p tsconfig.json` (filter to the
  files you touched) **+** `npx vitest run`. `next.config` has `ignoreBuildErrors` → the build
  does NOT catch type errors; trust `tsc` + `vitest`.
- **Tolerated pre-existing tsc error:** `app/research-lab/page.tsx` has **1** known error
  (`onWorkType` — `WorkType` vs `string`). Expect the count to be **1, not 0**. Don't chase it.
- **Secrets:** only in `.env`/`.env.local` (gitignored) and on the VPS. The `GOOGLE_*` Vertex
  creds are set locally on the owner's Mac → you can run scripts that call Vertex locally.

### GOTCHA — "Stranding" (read this)
The owner merges PRs **very fast**, and commits pushed *after* a merge get stranded outside
`main`. To avoid it:
- Always `git fetch origin` and check what `origin/main` actually contains before assuming what's
  deployed (`git show origin/main:<file> | grep <thing>`).
- Tell the owner **explicitly** when a branch is complete and ready to merge.
- If a PR goes `CONFLICTING` due to stacking, rebuild the branch from `origin/main` and
  cherry-pick only your own commits.

### Don't break the VOICE system (context, do not regress)
Voice is finished and delicate: `app/api/ai/voice/route.ts` → `synthGeminiTTS`
(`lib/voice/gemini-tts.ts`, Vertex REST) with Piper fallback; global controller
`lib/voice/ttsController.ts` (singleton; `speak()` → `speakSequence()`; everything chunks
~420 chars); fillers in `lib/voice/fillers.ts` + `public/agents/voice-fillers/`; waves in
`components/voice/VoiceWaveIndicator.tsx`; `useTTS()` exposes `{speaking,loading,activeText}`.
**Don't touch this unless a persona/onboarding change requires it, and if so, keep it working.**

---

## PART 1 — Finalize the persona model: "Zaeon is the collective" ⭐ primary goal

### The mental model (drill this into every system prompt)
- **"Zaeon" is NOT a single agent.** Zaeon is the **collective / the platform** — the
  constellation of all the agents working **together**. Together they **are** Zaeon.
- **Every agent has its OWN name and identity.** **No individual agent is named "Zaeon"** and
  **no agent ever introduces itself as "Zaeon."** Each one says its own name (e.g., the
  orchestrator, the research agent, the study agent, etc.).
- **The user is NEVER called "Zaeon" (or any agent name).** Those are product/agent names, not
  the user. Address the user by their **real first name** (`userData.name` / session) or by
  **no name at all**.
- **"Zion" is REMOVED.** That name must not exist anywhere anymore (no agent, no env, no copy,
  no comment). The orchestrator is renamed (see roster below).
- Agents don't add meta-commentary about being agents or about the persona system; they just act
  in-character with their own name.

### Canonical roster (use these names — easy, Brazilian)
> "Zaeon" = the collective of all of these working together. Each one has its own name; none is
> individually "Zaeon".

| Agent | Name | Role |
|---|---|---|
| Orchestrator (**was "Zion" → delete that name**) | **Bento** | Receives the request, routes to the right agent, the friendly front of the chat widget. |
| Research / academic summaries | **Aura** | Keep (already shipped; has `public/agents/aura.png`). Omega Scholar summaries, references, insights. |
| Study room / "Meus Estudos" | **Nina** | Day-to-day studying: notebook, organize, read, study material. |
| Academic writing (TCC/Artigo/Relatório) | **Caio** | Drafting and structuring the written work. |
| Code / Projetos (Zaeon Code) | **Téo** | The coding/IDE agent. |

If the code has more/fewer personas than this, map by **role** and pick another easy Brazilian
first name (Lia, Duda, Davi, Tom, Léo) for any extra — but **never** reuse "Zion" or "Zaeon".

### What to do
1. **Recon (first):** map the current persona system. Grep and read:
   ```
   rg -n "AGENT_PERSONAS|persona|Aura|Zion|Zaeon|userData.name|REGRA DE RESUMO" app/api/ai lib components
   rg -n "system|systemInstruction|role: ?\"system\"" app/api/ai/chat/route.ts
   ```
   Known anchors (verify, may have moved): `app/api/ai/chat/route.ts` holds `AGENT_PERSONAS`
   (at least `aura` = research/summary agent, `zion` = orchestrator) with a weak
   "REGRA DE RESUMO" block. There may be more agents (study/research/write/code).
2. **Define the canonical roster** in ONE place (e.g., `lib/ai/personas.ts` if it doesn't
   exist — extract from the route): for each agent → `{ id, name, role, voice, oneLiner, systemPrompt }`.
   Use the **Canonical roster** table above (Bento, Aura, Nina, Caio, Téo). **Rename the
   orchestrator persona `zion` → `bento`** and delete the `zion` id/name.
   - Add a **shared persona preamble** injected into every agent's system prompt encoding the
     mental model above (collective = Zaeon; each has its own name; never call the user by
     "Zaeon" or any agent name; use `userData.name` or none).
3. **Hard naming rule (fixes the live bug where the agent calls the user "Zion"/"Zaeon"):** add
   an explicit, unmissable instruction to every persona:
   > "Zaeon is the PLATFORM — the collective of all the agents working together. You are
   > **<agent name>** (e.g., Bento/Aura/Nina/Caio/Téo), NEVER 'Zaeon'. NEVER call the USER
   > 'Zaeon' or by any agent name. Address the user by their real first name (`userData.name`)
   > when known, otherwise use no name."
3b. **Delete "Zion" everywhere.** Grep `rg -ni "zion"` across the repo (code, env files,
   comments, copy, `lib/ai/*`, onboarding, memory/docs) and remove or rename to **Bento**. After
   this, `rg -ni "zion"` should return nothing meaningful. (Note: there was a
   `zaeon-zion-orchestrator` reference historically — kill the name.)
4. **Sweep the UI for "Zaeon = one agent" leaks:** chat widget header/labels, onboarding copy,
   avatars. Where a single speaking agent is shown, show **its own name** (e.g., "Aura"), not
   "Zaeon". "Zaeon" may remain only as the **product/brand** (e.g., "Zaeon OS", the collective).
5. **Avatars:** the avatar PNGs are **already generated** in `public/agents/` (512×512,
   on-brand liquid-glass gradient + monogram): `bento.png` (cyan), `aura.png` (violet),
   `nina.png` (pink), `caio.png` (blue), `teo.png` (emerald). **Wire each persona to its file**
   (Téo → `teo.png`, ascii) and make sure every `public/agents/<name>.png` referenced in
   `app/research-lab/page.tsx` / `MeusEstudosFeed` / chat widget points to an existing file
   (this fixes the previously-broken `aura.png`). You may regenerate/replace them later, but no
   broken avatars.
6. **Consistency check:** grep the whole app for places that address the user as "Zaeon"/"Zion"
   or make an agent call itself "Zaeon", and fix them.

### Acceptance (Part 1)
- In chat (research/study/orchestrator), the agent uses **its own name**, refers to **Zaeon as
  the platform/collective**, and **addresses the user by real name or none** — never "Zaeon"/"Zion".
- No broken avatars (aura.png present).
- `tsc` (1 tolerated) + `vitest` green.

---

## PART 2 — Fix the new-user Onboarding (do AFTER Part 1)

Onboarding lives in `lib/onboarding/tour.ts` (`TOUR_STEPS`, store), `components/onboard/OnboardingGuide.tsx`
(overlay card: `hint`, ring highlight, advance logic), and the chat widget say/voice handler
(`components/sub/LoungeChatWidget.tsx`, event `zaeon:onboard:say`). The page is
`app/research-lab/page.tsx` (`activeTab`, the `isChatLeft` toggle that moves the chat dock side,
the sidebar tabs incl. "Meus Estudos"/"Estudos"). Recon first with:
```
rg -n "TOUR_STEPS|onboard|isChatLeft|activeTab|faça a ação|não repetir|Eu sou a Zaeon|história do Brasil|result-tabs" lib app components
```

### Required changes
1. **Remove unnecessary copy** (the system already tracks completion via `tourDone`, so don't
   explain it in text):
   - Remove **"eu sou Zaeon"** (greeting). The onboarding greeter is the orchestrator **Bento**
     — use a short warm line in his name (or no self-introduction), obeying Part 1 (no "Zaeon"
     as a single speaker, never "Zion").
   - Remove **"faça a ação"** (the `OnboardingGuide` hint when a step is action-driven).
   - Remove **"ok, não repetir"** (the replay-stop control). Onboarding shows once per user
     based on `tourDone`; no replay UI text in the normal flow.
2. **Fix the "Meus Estudos" flow.** Today, when the user opens/clicks **Meus Estudos**, the
   onboarding redirects straight to **Estudos**. Instead:
   - First, **show the "move the chat to the other side" feature** (the `isChatLeft` toggle) so
     the user can actually SEE the **Meus Estudos** tab (the chat dock was covering it).
   - **Then** continue the flow to **Estudos**.
3. **Estudos → search step (keep behavior, tighten copy):**
   - The typed example must always be **"história do Brasil"** (prefill).
   - The card must explain that **pressing Enter starts the study of that theme**.
4. **After the study search:** visually indicate the **Referências, Insights, Base** tabs
   (keep the current highlight/ring). The card text must read **exactly**:
   > "Role as referências para baixo até encontrar algumas que você queira salvar."
5. **"Gerar pesquisa" + "Iniciar" step is good — DO NOT change it.**
6. **Remove the document-comparison step/feature** — it isn't working correctly. Remove the
   "comparar" onboarding step entirely, and disable/hide the broken "drag one doc onto another to
   compare" feature so it isn't presented to users.

### Acceptance (Part 2)
- New user with `tourDone=false` runs the tour with **no** "eu sou Zaeon" / "faça a ação" /
  "ok, não repetir" text.
- Clicking **Meus Estudos** first demos the **chat-side toggle** (so the tab is visible), then
  proceeds to **Estudos**.
- Search step prefills **"história do Brasil"** and the card mentions **Enter starts the study**.
- After search, **Referências/Insights/Base** are highlighted and the card shows the exact
  sentence in item 4.
- The **gerar/iniciar** step is unchanged.
- The **comparison** step/feature is gone.
- `tsc` (1 tolerated) + `vitest` green.

---

## Guardrails (do not violate)
- **No secrets in git/logs**; only `.env`/`.env.local` (gitignored) + VPS. Don't print key values.
- **No SSH/deploy** — owner merges → CI deploys. Watch the **stranding** gotcha (§0).
- **macOS has no `python`** — use `python3`/Node for local scripts.
- **Per-slice:** `npx tsc --noEmit` (expect 1 pre-existing error in `page.tsx`) + `npx vitest run`.
  Don't break green. If blocked, stop and report.
- Don't regress the **voice** system.
- Don't make any agent call itself "Zaeon" or call the **user** "Zaeon"/"Zion".

## Suggested slices (each: implement → tsc+vitest → report)
1. Recon (personas + onboarding) — short written map.
2. Persona roster + shared preamble + hard naming rule (Part 1, 1–4).
3. Avatars / `aura.png` + UI label sweep (Part 1, 5–6).
4. Onboarding copy cleanup (Part 2, 1).
5. Meus Estudos flow + chat-side-toggle step (Part 2, 2).
6. Search/Referências copy + tab highlight (Part 2, 3–4).
7. Remove comparison step/feature (Part 2, 6).

## Definition of DONE (owner just merges & tests)
- Persona model is consistent app-wide: collective = Zaeon; each agent uses its own name; user
  never called Zaeon/Zion; aura.png present.
- Onboarding matches Part 2 exactly.
- `tsc` = 1 tolerated error, `vitest` all green, no secrets committed. Branch announced as
  ready-to-merge (stranding-safe).
