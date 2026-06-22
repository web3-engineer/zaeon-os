# Notes / Evidence — Liquid Glass Rooms Transition

## ⚠️ Prompt "source of truth" vs. actual repo (verified 2026-06-12)

The prompt's map is partly idealized. Confirmed discrepancies:

| Prompt says | Reality |
|---|---|
| `lib/ai/model.ts` (centralized Gemini, "use SEMPRE este") | **Does not exist.** Real module: `lib/scholar/gemini.ts` → `getGeminiModel` / `getGeminiChatModel` / `geminiJson` / `extractText`. Routes also instantiate `VertexAI` inline (chat = `gemini-2.5-pro`, agent-search/generate-doc = `gemini-2.0-flash-001` **which is 404'd per gemini.ts comment**, plus a `llama-3.3-70b` fallback in chat). |
| `agent-gateway/` (route Core Active + Provas through it) | **Does not exist anywhere.** AI surface is `app/api/ai/*` routes (`chat`, `agent-search`, `research-suggest`, `scholar`, `voice`, …). |
| Rooms: cyber/main-hall, bio/main-room, lounge/main-lounge | **6 rooms**: bio, cyber, humanities, lounge, med, quantic. Structure **inconsistent**: bio/cyber/lounge nest under `main-{room|hall|lounge}/`; humanities/med/quantic put submodules at room root. |
| `lessons` submodule across rooms | Only `bio/main-room/lessons` (77 lines) exists. Others use `classes`. |

So "migrate ALL rooms" = ~54 `page.tsx` files (many near-identical copies: exams 466L ×6, researches 349/362L ×6, projects 356L ×6, community 451/599L ×6, news 332L ×5, profile 396/463L ×6) + entry pages (cyber 413, lounge 414, bio 434, med 342, quantic 597, humanities 466) + `app/study-rooms/page.tsx` (263).

## Resolved substitutions (decided, matches prompt intent)
- "lib/ai/model.ts" → **`lib/scholar/gemini.ts`** (the real centralized Vertex Gemini helper).
- "agent-gateway/" → new `app/api/ai/*` route(s) that call `lib/scholar/gemini.ts`.
- Pesquisas classifier → `lib/scholar/termometro.ts` + `lib/scholar/levels.ts` (already in TS, per memory).

## Existing surfaces relevant to phases
- Phase 2 (Provas): teacher/student API already partly exists — `app/api/teacher/{invite,documents,links,students,search-students}`, `app/api/student/{join,confirm-join,tasks}`, `lib/invite-codes.ts`, `lib/convite/`. Gateway can build on these, not greenfield.
- Phase 4 (chat about research): `app/api/research/chat/[researchId]/route.ts` exists (the buggy past-research chat).
- Phase 5 (Lounge): `components/sub/LoungeEarth.tsx` (28KB, CyberGlobe+feed), `LoungeChatWidget.tsx` (37KB); `/api/feed` + `/api/feed/[id]/{like,comment}` exist. Recoverable deleted: `app/study-rooms copy/lounge/lounge-br/FeedBrasil.tsx` (commit c34e52e).
- Phase 6 (DNA): `gender: 'male'|'female'|'other'` in `OnboardAgent.tsx` + `components/main/OnboardModal.tsx`. Memory note: auth has no `session.user.id` quirk — verify `session.user.gender` is actually populated.

## Foundation built
- `components/ui/GlassPanel.tsx` — exact spec tokens, variants shell/inner/dock/popover + GLASS_ACCENT, GLASS_ACTIVE_PILL exports. tsc clean.
- `components/ui/ProLockBadge.tsx` — tooltip seal. tsc clean.

## Phase 1 progress
- `components/ui/ProFeaturePanel.tsx` — shared Pro-gated surface (GlassPanel + ProLockBadge + Lock).
- Projects gated as Pro in all 6 rooms: removed `ProjectsModule` dynamic import, render branch → `<ProFeaturePanel>`. `projects/page.tsx` files untouched (code preserved). tsc clean.

## Duplication map (verified md5, for Checkpoint #3)
Rooms render submodules as **dynamic component imports** (not href routes), e.g. `dynamic(() => import('./main-hall/researches/page'))`. They are ALSO routable URLs.
- **researches** (the embedded *old* research UI, ~349L): identical in bio/cyber/humanities/med/quantic; lounge is a variant (362L). Canonical research surface = `app/research-lab/page.tsx` (gold standard) — NOT these.
- **news** (~332L): identical in humanities/lounge/med/quantic; bio is a variant. Canonical top-level `app/news/page.tsx` (351L) ALREADY EXISTS. (cyber has no news submodule — its News tab is an orphan.)
- **profile** (~396–463L): **3 variants** — humanities (unique) / bio+lounge (shared) / cyber+med+quantic (shared). No top-level canonical route.
- **community** (~451–599L): bio (unique) / lounge (unique 599L) / cyber+humanities+med+quantic (shared).
- **exams** (466L): identical in bio/cyber/lounge/med/quantic; humanities is a 15L stub (broken).
- **cyber orphan bug**: `news` tab in `baseTabs` but no import/render branch → clicking shows nothing.

## Verification log
- `npx tsc --noEmit` → clean after foundation (2026-06-12).
- `npx tsc --noEmit` → clean after Projects Pro-gate across 6 rooms (2026-06-12).
- `npx tsc --noEmit` → clean after Research/News repoint + cyber orphan fix (2026-06-12).
- `npm run build` → `✓ Compiled successfully` + `✓ Generating static pages (104/104)`, all study-rooms routes present (2026-06-12). NOTE: build needs env — worktree has no `.env*`; symlinked `.env`/`.env.local` from main checkout (both gitignored) so page-data collection (Mongo at module load in /api/agentic/*) passes. Without env, build stops at "Collecting page data" — environmental, not code.

## Repoint detail (Checkpoint #3 = "repoint now, defer deletes")
- New `components/ui/CanonicalLaunchPanel.tsx`: glass panel + next/link CTA. `target="research"`→/research-lab, `target="news"`→/news.
- All 6 rooms: removed `ResearchModule`/`NewsModule` dynamic imports; render branches now `<CanonicalLaunchPanel>`. cyber gained the missing news render branch (orphan tab fixed).
- Duplicate `researches/`, `news/`, `profile/`, `community/` submodule files KEPT on disk (deletion deferred to a later focused pass).

## Glass reskin DONE — user confirmed intent: unify ALL rooms to research-lab violet glass, remove per-course colors
- cyber: hand-reskinned (shell, sidebar active pill → violet glow, tooltips → glass popover, focus btn, header icon, auth gate). `cyan-500→violet-500`, `#06b6d4→#8b5cf6`.
- lounge/med/quantic/humanities/bio: shell glass (cardStyle/fixedBioStyle) → canonical tokens; accent Tailwind family → violet (lounge cyan, med rose, quantic cyan+blue, humanities amber, bio emerald); hardcoded course hex/rgba → violet/cyan (bio green DNA helix #166534/#34d399/rgba greens, med crimson #ff003c/#ff2a5f/#e11d48, quantic blue #3b82f6, humanities amber rgba(217,119,6)).
- KEPT: `#f59e0b/#d97706/#fbbf24` window minimize dot (shared macOS control); amber ⚠ "Restricted Area" warning in bio (semantic warning, not course color); canonical cyan `#22d3ee` (Zaeon secondary accent).
- Dev preview: machine compiles routes very slowly (cyber ~25s, bio ~231s). Viewport glitched to 35px once → use preview_resize width/height explicit. cyber proven in dark mode; bio proven green-gone.
- Verify: tsc EXIT=0 0 errors; `npm run build` BUILD_EXIT=0, Compiled successfully, 104/104 static pages (after reskin).

## Phase 2 — Provas gateway (spec approved, implemented)
- Spec: `docs/superpowers/specs/2026-06-12-provas-gateway-design.md` (Checkpoint #1 APPROVED: auto-grade + teacher override; shared component).
- Reused existing: `ClassLink`+`/api/teacher/invite`+`/api/student/join` (keys), `TeacherDocument`+`/api/teacher/documents`+`/api/student/tasks` (teacher→student), `/api/ai/voice` (Piper TTS, returns `{audio_base64}` → play `data:audio/wav;base64,`), `/api/ai/chat` (gen). Role = `User.role ∈ {teacher,professor}`.
- New: `model ExamSubmission` (@@unique[documentId,studentId]); `TeacherDocument` widened (type informe|material|tarefa|prova + attachmentUrl/Name + dueAt) + back-relations; `prisma generate` ok.
- New routes: `/api/student/submissions` (POST upsert + auto-grade closed-form, GET own), `/api/teacher/submissions` (GET for owned docs, PATCH grade/override). `/api/student/tasks` → subject optional + **strips `answer`** from questions (anti-cheat).
- `components/sub/ExamsGateway.tsx`: role-detected. Teacher banner (invite keys / publish informe·material·tarefa·prova / published+submission counts). Student body (take assigned provas → submit → score; Knowledge Check self with fixed TEXT+AUDIO pair per item via AudioButton→/api/ai/voice; my grades). All 6 `exams/page.tsx` re-export it.
- Verify: tsc 0 errs · build 104/104 (`/api/student/submissions`, `/api/teacher/submissions` registered; exams page 7.75kB→1.66kB) · vitest 248/248. Render check: gateway loads student view, 0 JS errors. NOTE: light-mode text-white low-contrast standalone — but renders inside dark room shell (room dark-first convention, matches sibling modules). Live teacher↔student QA needs seeded teacher account + voice engine (port 8004) — deferred.
