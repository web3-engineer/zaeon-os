# Plano de Implementação — Área do Professor (Zaeon OS)

> Objetivo: a área do **professor** ficar tão completa quanto a do **aluno**, numa seção
> dedicada (`/workstation/teacher`), com os dois lados conversando (tarefa → entrega →
> correção → feedback), e o professor podendo **convidar alunos sem teto**.
>
> Status deste doc: **plano** (nada implementado nesta passada). Data: 2026-06-15.

---

## 1. O que JÁ existe (não reinventar)

A investigação do código mostra que boa parte do encanamento está pronto:

**Modelos Prisma** (`prisma/schema.prisma`):
- `ClassLink` — convite/link de turma do professor (`token` único, `subject/room/hour/days`). **Não tem teto de alunos** — qualquer número entra por `/join/{token}`.
- `TeacherStudent` — relação professor↔aluno (M2M, `@@unique([teacherId, studentId])`).
- `TeacherDocument` — tarefa/prova/informe/material: `type`, `questions` (JSON), `status` (draft|published), `assignedTo[]`, `dueAt`, `headerImage`, `attachment*`.
- `ExamSubmission` — entrega do aluno: `answers` (JSON), `score`, `status` (submitted|graded), `gradedBy` ('ai'|teacherId), `feedback`. `@@unique([documentId, studentId])`.
- `User.role` ('teacher'|'professor'|'student') + relações (`teacherStudents`, `studentOf`, `teacherDocuments`, `studentSubmissions`, `teacherLinks`).

**Rotas de API** (funcionais):
- `/api/teacher/invite` (POST) → cria `ClassLink`. `/api/teacher/links` (GET).
- `/api/teacher/students` (GET/POST/DELETE) + `/api/teacher/search-students` (GET).
- `/api/teacher/documents` (GET/POST/PATCH/DELETE) — CRUD de tarefas/provas.
- `/api/teacher/submissions` (GET/PATCH) — lista entregas e **corrige** (score+feedback).
- `/api/student/tasks` (GET, tira o gabarito) + `/api/student/submissions` (GET/POST, auto-grade das fechadas).

**UI do professor** (`app/workstation/teacher/`):
- `[module]/page.tsx` — shell com sidebar + focus mode; módulos: `profile, work, research, repos, agentic, lounge, finances`. `layout.tsx` faz o gate (role teacher|admin).
- `WorkAreaContent.tsx` — **~80%**: abas Alunos / Tarefas / Provas + "Matrícula Mágica" (gera link). Cria documento via `/api/ai/generate-document`.
- `AgenticAreaContent.tsx` — parcial: chat Aura + módulos 3D (BioSim/Quantum/CodeLab).
- `ResearchAreaContent.tsx`, `LoungeContent.tsx`, `FinancesContent.tsx` — **stubs**.

**Perfil** (`app/workstation/page.tsx`): já é reutilizável por role (`isTeacher`). Para professor mostra "Mural de Publicações"; esconde skills/salas de aluno. `NetworkMural` (fotos) e `NetworkConnectionsPanel` são compartilhados.

**Agentes**: Gemini único (`lib/ai/model.ts`), padrão de rota = `getServerSession` + `guard()` (rate-limit, `src/lib/ratelimit.ts`) + `vertexCredentials()`/`geminiText` + cache (`src/lib/cache.ts`). Chat tem `summon_agent` (study/research/write/code) e personas (Aura, Scholar, Examiner, Zenita…).

**Conclusão**: o ciclo tarefa→entrega→correção→feedback **já fecha** no backend. O que falta é (a) UX do professor no nível do aluno, (b) uma interface de correção de verdade (de preferência com IA), (c) o convite de turma sem teto bem-acabado, (d) o professor operar por **agente** como o aluno, e (e) paridade de perfil/salas.

---

## 2. Lacunas vs a área do aluno

| Área | Aluno | Professor (hoje) | Lacuna |
|---|---|---|---|
| Perfil | completo (skills/salas/mural) | reusa, mas variante teacher é mais pobre | enriquecer variante teacher |
| Criar conteúdo | editor rico (research-lab, A4 + IA) | gera doc só por prompt | usar a MESMA interface rica pra montar tarefa |
| Entregar/atribuir | recebe `assignedTo` | atribui por lista de IDs | atribuir à **turma inteira** num clique |
| Correção | — | `PATCH submissions` (sem UI boa) | tela de correção (manual + IA) |
| Convite | onboarding (`InviteCode`, teto 3) | `ClassLink` (sem teto) | formalizar "convite de turma ilimitado" + tela `/join` |
| Agente | Aura/Zaeon/Examiner | Aura chat só | agente "Professor" que cria/corrige via chat |
| Salas | estudos/pesquisa/lounge | research/lounge/finances stubs | completar ou ocultar com elegância |

---

## 3. Arquitetura proposta

Manter a seção dedicada `/workstation/teacher` (já existe e é gated). Reaproveitar ao máximo:
- O **editor rico** do aluno (`research-lab` / `RichText`) como base do construtor de tarefas — em vez de duplicar, extrair o editor para um componente compartilhável e montar a tarefa nele.
- Os modelos atuais (`TeacherDocument`/`ExamSubmission`) — bastam; talvez +1 model `Classroom` (opcional, P2) para agrupar alunos por turma e atribuir de uma vez.
- O padrão de agente (Gemini + `guard`/cache) para um agente "Professor".

---

## 4. Fases

### P0 — Convite de turma sem teto (rápido, alto valor)
- `ClassLink` já não tem teto → o "sem limite de alunos" **já é verdade**; falta acabamento.
- Criar/checar a página pública **`/join/[token]`**: mostra a turma (professor, matéria), e ao logar vincula o aluno em `TeacherStudent` (upsert) — confirmar se esse vínculo acontece hoje no fluxo de join (a rota `students` POST existe; garantir que `/join` chama o vínculo).
- No `WorkAreaContent`, "Matrícula Mágica" deve gerar um link **simples de turma** (não exigir horário/sala) e expor: copiar link, QR, e contador "X alunos entraram".
- Deixar explícito no schema/route que `ClassLink` é ilimitado (sem `maxUses`).
- **Verificação**: criar link, abrir `/join` em aba anônima, logar como aluno teste, confirmar vínculo aparecendo em "Alunos".

### P1 — Construtor de tarefas com a MESMA interface
- Extrair o editor do aluno (`research-lab` A4 + IA + anexos) para um componente reutilizável (`components/editor/RichDocEditor`).
- Aba **Tarefas/Provas** do professor passa a abrir esse editor para montar o enunciado (texto rico + questões + anexo + `dueAt`), com IA assistindo (gerar/expandir questões via `generate-document`, já existe).
- "Enviar" = `status: published` + `assignedTo`. Botão **"Atribuir à turma toda"** (preenche `assignedTo` com todos os `TeacherStudent`).
- **Verificação**: professor cria tarefa rica, publica para a turma; aluno vê em `/api/student/tasks` sem gabarito.

### P2 — Correção (grading) decente, com IA
- Nova tela **Correção** no professor: lista `ExamSubmission` por tarefa (usar `/api/teacher/submissions`), abre cada entrega, mostra respostas do aluno lado a lado com o gabarito.
- Correção manual (score + feedback) e **correção assistida por IA**: nova rota `POST /api/teacher/grade` (Gemini, com `guard`/cache) que sugere nota e feedback por questão aberta; professor revisa e confirma (`gradedBy` vira o teacherId ao confirmar).
- Aluno recebe nota/feedback via `/api/student/submissions` (já existe).
- (Opcional) model `Classroom` para agrupar alunos e relatórios por turma.
- **Verificação**: aluno entrega; professor corrige (manual e IA); aluno vê a nota e o feedback.

### P3 — Paridade de perfil + salas do professor
- Enriquecer a variante teacher do perfil (`workstation/page.tsx`): mural de publicações funcional (fixar artigos/links), estatísticas (nº de turmas, alunos, tarefas), badges de docente.
- `ResearchAreaContent`/`LoungeContent`/`FinancesContent`: ligar o que faz sentido (pesquisa reaproveita o research-lab; lounge reaproveita o feed de posts; finanças pode ficar "em breve" elegante por enquanto).
- **Verificação**: visitar `/workstation/teacher/profile` e ver paridade visual/funcional com o aluno.

### P4 — Agente "Professor" (operar por chat, como o aluno)
- Adicionar persona/tool no `/api/ai/chat`: um agente que entende comandos como "crie uma tarefa de X para a turma Y", "corrija as entregas da prova Z", e dispara as ações (function-calling, igual `update_schedule`/`summon_agent`).
- Reusa `guard`/cache; ações chamam as rotas `/api/teacher/*` internamente.
- **Verificação**: pelo chat, criar e publicar uma tarefa e iniciar uma correção.

### P5 — "Os dois conversam" (loop social/notificações)
- Notificar o aluno quando recebe tarefa e quando é corrigida; notificar o professor quando chega entrega.
- Mural/feed bidirecional (professor publica avisos à turma; aluno comenta).
- **Verificação**: ciclo completo ponta-a-ponta com 1 professor + 1 aluno de teste.

---

## 5. Dados (delta)

- **Nada obrigatório novo** para P0–P1 (modelos atuais bastam).
- **P2 (opcional)**: `Classroom { id, teacherId, name, studentIds[] , classLinkId? }` para agrupar e atribuir/relatar por turma. Exige `prisma generate` + restart.
- Garantir que `ClassLink` permaneça **sem `maxUses`** (ilimitado) — é o requisito do convite sem teto.

---

## 6. Riscos / cuidados
- `prisma generate` + restart do `next dev` sempre que mexer no schema (dor recorrente — evitar schema em P0/P1).
- Reaproveitar o editor do aluno sem quebrar o research-lab (extrair com cuidado, manter props).
- IA de correção é **assistente**, nunca decide sozinha: professor sempre confirma a nota.
- Rate-limit/cache já existem — usar `guard()` em toda rota de IA nova (ex.: `/api/teacher/grade`).

---

## 7. Ordem sugerida de execução
P0 (convite ilimitado + `/join`) → P1 (construtor de tarefas rico) → P2 (correção + IA) → P3 (perfil/salas) → P4 (agente professor) → P5 (notificações/social).

Cada fase é entregável e verificável de forma independente.
