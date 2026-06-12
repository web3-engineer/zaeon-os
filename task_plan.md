# Task Plan — Liquid Glass Transition (all rooms → Zaeon design system)

Branch: `feat/liquid-glass-rooms-transition` (to be created from `claude/great-wescoff-ef66c1`)
Single PR at the end. Source of truth: `docs/superpowers/specs/2026-06-07-liquid-glass-style-reference.md`.

## Foundation (done)
- [x] `components/ui/GlassPanel.tsx` — variants `shell | inner | dock | popover` (exact spec tokens)
- [x] `components/ui/ProLockBadge.tsx` — reusable 🔒 Pro seal w/ tooltip
- [x] tsc clean after foundation

## Phase 1 — Sala de Estudos entry + cleanup  `P0`  (in progress)
- [x] `projects` → Pro-locked via ProFeaturePanel in all 6 rooms (keep code, gate nav)
- [x] 🛑 CHECKPOINT #3 decided: "repoint now, defer deletes" (no deletions this PR)
- [x] Repoint Research tab → /research-lab, News tab → /news (canonical, already exist); fix cyber orphan News tab. Duplicate files kept on disk.
- [x] Verify: tsc clean + `npm run build` green (104/104 static pages)
- [x] **Glass reskin** of all 6 room shells → canonical violet glass; per-course accent colors removed (cyber=cyan, lounge=cyan, med=crimson, quantic=blue, humanities=amber, bio=emerald/green) → unified violet/cyan. Tailwind families + hardcoded hex/rgba (incl. bio green DNA canvas) converted. Window-control dot (#f59e0b) kept as shared macOS control.
- [x] Visual QA: cyber verified full (auth gate, shell, sidebar active pill, Projects→Pro panel, Research→/research-lab link) in dark mode; bio verified green-gone (greenEls:0). grep: 0 residual course colors across all 5 rooms.
- [x] Verify: tsc clean + `npm run build` green (104/104)
- [ ] Decide `app/study-rooms/page.tsx` (marketing Features page, not a room lobby) — keep cyan or move to glass
- [ ] Deferred: delete duplicate researches/news/profile/community submodules (separate cleanup pass)

## Phase 2 — Provas / Knowledge Check gateway  `P1`  (spec written; PR #37 = Phase 1)
- [x] Recon: ExamsModule is local-only; TeacherDocument/ClassLink/TeacherStudent/voice already exist
- [x] 🛑 CHECKPOINT #1: spec written `docs/superpowers/specs/2026-06-12-provas-gateway-design.md` — **AWAITING APPROVAL** (5 open questions)
- [x] Approved (auto-grade + teacher override; shared component) → implemented
- [x] Prisma: `ExamSubmission` model + `TeacherDocument` widened (type informe|material|tarefa|prova, attachmentUrl/Name, dueAt) + back-relations; `prisma generate` ok
- [x] Routes: `/api/student/submissions` (POST auto-grade + GET), `/api/teacher/submissions` (GET + PATCH grade); `/api/student/tasks` subject now optional + answers stripped (anti-cheat)
- [x] `components/sub/ExamsGateway.tsx`: professor banner (invite keys, publish, published+counts) + aluno body (take/submit assigned provas, Knowledge Check with fixed text+AUDIO pair via /api/ai/voice, my grades)
- [x] All 6 `exams/page.tsx` → re-export shared ExamsGateway
- [x] Verify: tsc clean · build 104/104 (new routes registered) · vitest 248/248
- [ ] Live teacher↔student browser QA needs seeded teacher account + voice engine (port 8004) — deferred

## Phase 3 — Aulas (ClassesView.tsx rewrite)  `P1`  (functional core done)
- [x] Remove Sticky Notes (state, `zaeon_sticky_note`, load/save, UI, imports)
- [x] Keep Backpack only (unchanged)
- [x] CollectiveZone → Pro via `ProFeaturePanel` (component code kept, not rendered)
- [x] Remove RealTimeModule (render + 126-line component)
- [x] Core Active agent: chat (already labelled "Core Active") now routes `agent: "core_active"` with the student's agenda as context, and applies the existing `update_schedule` function-tool → creates/removes/updates agenda items (`applyScheduleTool`). Backend: `core_active` persona + tool enabled (was zenita-only).
- [x] Verify: tsc clean · vitest 248/248 · build 104/104
- [x] **Layout reorg DONE** (user OK'd removing drag + simplifying): single horizontal line Core Active(440) → Agenda(300) → Details(176) → Plug(64), decreasing; drag removed from agenda/details; old chat section → static Library+Plugins row; cords removed. 🛑 Checkpoint #2: fits horizontally (~980px < 1400) — no overflow. Screenshot-verified at 1360px.

## Phase 4 — Pesquisas: classifier engine + visual sync  `P1`  (done)
- [x] `components/sub/ResearchesView.tsx` (shared, all 6 re-export): GlassPanel + reconnected to `lib/scholar/levels` (LEVEL_META) + `termometro` (estimateResearchTime/publicationTarget) — each research classified by academic position with time + Qualis readout. Deterministic data (no Math.random → no hydration drift).
- [x] Lean detail: agents + metrics hidden behind "Ver detalhes" toggle.
- [x] Chat about research: the `/api/research/chat/[researchId]` route is functionally complete (streams via getGeminiChatModel, persists pastResearchChat) — NOT changed (no concrete repro; don't "fix" working code). Research is canonically served by research-lab since Phase 1.
- [x] Verify: tsc · vitest 248/248 · build 104/104 (researches 349L→205B re-exports)

## Phase 5 — Lounge: globe + futuristic Twitter  `P2`  (done)
- [x] LoungeEarth (CyberGlobe + feed + likes + comments) is ALREADY rendered in all 6 community tabs and functional — no recovery needed (confirmed wired).
- [x] Per-course social gate: `/api/feed/comment` POST blocks comments when commenter's course ≠ post author's course (403); `/api/feed` GET now returns `course` + `canComment` per post; LoungeEarth shows "Mural de outro curso — apenas curtir e visualizar" instead of the comment box when `canComment === false`. Likes/view stay open.
- [x] Verify: tsc · vitest 248/248 · build 104/104

## Phase 6 — Perfil: DNA by gender  `P2`  (done)
- [x] Diagnosis: `session.user.gender` IS set (auth.ts session callback) — regression was that NO profile page rendered a DNA capsule anymore (dropped in migration).
- [x] `components/sub/GenderDNA.tsx` — animated SVG double-helix, colour by gender (male=blue #3b82f6, female=pink #ec4899, other=violet→cyan), reads `session.user.gender`. Glass.
- [x] Inserted into all 5 non-stub profile pages (463L ×3 near profile circle; 396L ×2 above circle).
- [x] Verify: tsc · vitest 248/248 · build 104/104; DOM render confirmed.

## Dead-code recovery sweep  `P2`  (done)
- Recovered & reconnected: the **globe + feed** (CyberGlobe, /api/feed) is already live in `components/sub/LoungeEarth.tsx`, rendered in all 6 community tabs — no recovery action needed.
- Intentionally dead (left as-is): `app/study-rooms copy/` (stale duplicate tree incl. `FeedBrasil.tsx`, old lounge pages) was deleted in prior commits and is superseded by the current rooms + LoungeEarth; `CollectiveZone` component in ClassesView kept-but-unrendered (Pro-gated, code preserved per request).
- No TODO/DEPRECATED/LEGACY markers needing action in the touched modules.

## Delivery
- [ ] engineering:code-review self-review
- [ ] tsc + build + no orphan hrefs per phase
- [ ] Single PR, changed-vs-untouched table per phase, layout warnings
