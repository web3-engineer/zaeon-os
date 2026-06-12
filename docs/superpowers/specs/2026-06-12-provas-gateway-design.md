# Provas / Knowledge Check Gateway — Design Spec

> Phase 2 of the liquid-glass-rooms transition. **Checkpoint #1**: this spec is for
> approval BEFORE any implementation. Status: **AWAITING APPROVAL**.

## 1. Context & goal

Today `app/study-rooms/*/main-*/exams/page.tsx` (`ExamsModule`) is a **client-only
self-assessment**: it reads topics from `localStorage` (`zaeon_schedule_data`),
asks `/api/ai/chat` for 25 questions, runs them locally, and writes results to
`localStorage` (`zaeon_exam_history`). There is **no teacher side**, no invite
keys, no submission, no audio.

Phase 2 turns Exams into a **bidirectional gateway** between professor and aluno:

- **Top banner = professor → aluno (intake):** informes, files/materials, tasks and
  provas the teacher publishes; generate/paste invite keys here; upload materials;
  list what the teacher has published.
- **Body = aluno → professor (output):** take online provas, answer teacher-sent
  tests, submit answers. The **Knowledge Check** is reworked so the **text generator
  and the audio (TTS) always appear as a fixed pair** on every item.

## 2. What already exists (reuse — do NOT rebuild)

| Concern | Existing | Notes |
|---|---|---|
| Invite keys | `model ClassLink` + `POST /api/teacher/invite` + `GET /api/student/join` | token, subject, room, schedule (hour/days). |
| Teacher-authored provas/tarefas | `model TeacherDocument` (`type` `'tarefa'|'prova'`, `questions` Json `{number,statement,options[],answer,type}`, `status` draft/published, `assignedTo[]`, `headerImage`, `context`) + `GET/POST/PATCH /api/teacher/documents` | This already is the professor→aluno delivery channel. |
| Student inbox | `GET /api/student/tasks` reads published `TeacherDocument` for the student | |
| Teacher↔student relation | `model TeacherStudent` (`subjects[]`) + `/api/teacher/students` | |
| TTS (audio) | `POST /api/ai/voice` → proxies Piper at `${VOICE_URL}/synthesize` | The text+audio pair uses this. |
| Question generation (text) | `POST /api/ai/chat` (agent `exam_generator`) → Vertex Gemini via `lib/scholar/gemini.ts` | Centralized model helper (the prompt's `lib/ai/model.ts`/`agent-gateway/` do not exist). |

## 3. Data model

### 3.1 Extend `TeacherDocument` (additive, no migration risk on Mongo)
- `type`: widen to `'informe' | 'material' | 'tarefa' | 'prova'`.
- add `attachmentUrl String?` and `attachmentName String?` (for material/informe file uploads; reuse the existing upload path used by avatars/photos, or base64 like `headerImage`).
- add `dueAt DateTime?` (optional deadline for tarefa/prova).
- `questions` stays `Json` (empty `[]` for informe/material).

### 3.2 NEW `model ExamSubmission` (the missing piece — student output)
```prisma
model ExamSubmission {
  id          String   @id @default(auto()) @map("_id") @db.ObjectId
  documentId  String   @db.ObjectId            // TeacherDocument (prova/tarefa)
  studentId   String   @db.ObjectId
  answers     Json                              // [{ number, answer }]
  score       Int?                              // 0–100, null until graded
  status      String   @default("submitted")    // submitted | graded
  gradedBy    String?                            // 'ai' | teacherId
  feedback    String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  document    TeacherDocument @relation(fields: [documentId], references: [id])
  student     User            @relation("StudentSubmissions", fields: [studentId], references: [id])

  @@unique([documentId, studentId])             // one submission per student per doc
  @@index([studentId])
}
```
Plus back-relations on `TeacherDocument` (`submissions ExamSubmission[]`) and `User`.

### 3.3 Knowledge Check (self-assessment) — no new model
Stays ephemeral/local for the *self* mode, but each generated item now carries
`{ text, audioReady }` and lazily fetches `/api/ai/voice` so **text + audio render
as one fixed unit**. History can stay in `localStorage` for self mode (out of scope
to migrate now) — teacher-assigned provas go through `ExamSubmission`.

## 4. API contracts

New / changed routes (all use NextAuth session; teacher routes assert teacher role):

| Route | Method | Who | Body / returns |
|---|---|---|---|
| `/api/teacher/documents` | POST/PATCH | teacher | extended with `type=informe|material`, `attachment*`, `dueAt` |
| `/api/teacher/submissions` *(new)* | GET | teacher | submissions for the teacher's documents (for grading/list) |
| `/api/teacher/submissions` *(new)* | PATCH | teacher | set `score`/`feedback`/`status=graded` |
| `/api/student/submissions` *(new)* | POST | student | `{ documentId, answers }` → creates/updates `ExamSubmission`; optional AI auto-grade vs `questions[].answer` |
| `/api/student/submissions` *(new)* | GET | student | the student's own submissions + scores |
| `/api/ai/voice` | POST | both | unchanged; called per Knowledge Check item |
| `/api/ai/chat` | POST | both | unchanged; `exam_generator` for self-mode generation |

Auto-grade: for `type=prova` with non-empty `questions[].answer`, the submission
route grades server-side by comparing normalized answers (same normalize rule as
current `ExamsModule.handleAnswer`); `gradedBy='ai'`. Open-ended items stay
`null`/teacher-graded.

## 5. UX (liquid glass — uses `GlassPanel`)

```
┌──────────────────────────────────────────────────────────────┐
│  PROFESSOR BANNER  (GlassPanel variant="shell")               │
│  ┌──────────────┬───────────────┬──────────────────────────┐  │
│  │ Invite Keys  │ Upload/Publish│ Published list           │  │
│  │ gen / paste  │ informe·mat·  │ (tarefa·prova·informe)   │  │
│  │ (ClassLink)  │ tarefa·prova  │ + submission counts      │  │
│  └──────────────┴───────────────┴──────────────────────────┘  │
├──────────────────────────────────────────────────────────────┤
│  ALUNO BODY                                                    │
│  • Assigned provas/tarefas (from /api/student/tasks) → take →  │
│    submit (/api/student/submissions) → see score              │
│  • Knowledge Check (self): each item = TEXT + ▶ AUDIO (fixed   │
│    pair via /api/ai/voice), generated by /api/ai/chat          │
└──────────────────────────────────────────────────────────────┘
```
Role detection: `session.user.role` (or `TeacherStudent`/`ClassLink` ownership).
A pure student sees an empty/disabled banner ("você não é professor desta sala");
a teacher sees the banner active. Same component, role-gated sections.

## 6. Flow (professor ↔ aluno)

1. Teacher generates an invite key (`ClassLink`) in the banner → shares it.
2. Student joins via key (`/api/student/join` → `TeacherStudent`).
3. Teacher publishes an informe/material/tarefa/prova (`TeacherDocument`,
   `status=published`, `assignedTo`).
4. Student sees it in the body (`/api/student/tasks`), takes the prova, submits
   (`ExamSubmission`); auto-grade if closed-form.
5. Teacher reviews submissions (`/api/teacher/submissions`), optionally grades
   open-ended, leaves `feedback`.

## 7. AI routing (per memory + repo reality)
- Text: `/api/ai/chat` → `lib/scholar/gemini.ts` (`getGeminiChatModel`/`geminiJson`).
- Audio: `/api/ai/voice` → Piper (`${VOICE_URL}/synthesize`).
- No new `agent-gateway/`; no `lib/ai/model.ts` (neither exists). New logic lives in
  the routes above.

## 8. Scope / non-goals
- Reuse existing upload mechanism; do not build new blob storage.
- Self-mode Knowledge Check history stays in `localStorage` (no migration now).
- Real-time collaborative exam-taking is out of scope (Pro/Collective, Phase 3).
- All 6 rooms' exams pages are identical copies → implement once, propagate (or
  extract `ExamsGateway` into a shared component — **see open question Q3**).

## 9. Open questions (please confirm at Checkpoint #1)
- **Q1 — Role source:** is `session.user.role` reliably set (memory notes a
  `session.user.id` auth quirk)? If not, derive teacher-ness from `ClassLink.teacherId`
  / `TeacherStudent`. Which is canonical?
- **Q2 — Auto-grade vs teacher-grade:** auto-grade closed-form provas immediately
  (`gradedBy='ai'`) and let teachers override? Or hold all grading for the teacher?
- **Q3 — Shared component:** extract a single `components/sub/ExamsGateway.tsx` that
  all 6 rooms import (like ClassesView), or keep per-room copies? (Recommend extract.)
- **Q4 — Materials/informes storage:** base64 (like `headerImage`) for simplicity,
  or the existing file-upload endpoint? Any size limits?
- **Q5 — Knowledge Check audio:** generate audio per-item lazily on reveal (cheaper)
  vs prefetch all 25 (snappier, more TTS calls)? (Recommend lazy on reveal.)
