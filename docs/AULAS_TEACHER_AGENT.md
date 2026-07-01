# Agente: Sala de Aula + Perfil Professor (LMS + Studio + Zaeon)

> Handoff pro Claude Code. Construir o sistema de **Aulas** (LMS leve estilo frappe/lms, sem a UI
> deles) + um perfil **Professor** que cria aulas tão fluido quanto criar um estudo, com base
> **generativa** (igual Meus Estudos) e quiz/avaliação. Tudo via branch + PR (push direto no main
> trava por proxy de rede; CI deploya no merge). Não aceitar token em chat. Construir sobre o `main`
> já com pdf-loader (#84) + `feat/estudos-lounge-ux` mergeados.

## Regras de ESCOPO (duras)
- **NÃO mexer na navbar/sidebar** nem trocar layout entre perfis. **Tudo** que muda fica DENTRO da
  aba **"Aulas"** + uma aba nova **"Meus Alunos"** (só professor).
- **Remover do perfil professor** (`app/workstation/teacher/`): o **Lounge** e o **Finanças**
  (`LoungeContent.tsx`, `FinancesContent.tsx` e seus pontos de navegação). Sem lounge pra professor
  por enquanto. Não criar lounge novo.
- Reaproveitar o que já existe: `components/sub/ClassesView.tsx` (agenda radial + chat + módulo de
  aulas + agente `update_schedule`), o Studio (`components/studio/*`), o padrão generativo do
  `components/study/MeusEstudosFeed.tsx` (`zaeonStudy` / barra ⟁ / painel à direita), o
  `ttsController`/`useTTS` (voz) e `app/join/[token]` (entrada por token).

## Conceitos
- **Turma** = entidade real (grupo nomeado por disciplina), dona do vínculo professor↔alunos.
  Exposta visualmente na aba **"Meus Alunos"**. A entrega de aula é **individual** (cada aluno recebe
  na própria sala/chat), mas pertence a uma turma. O que importa é a relação aluno↔professor.
- **Convite de amizade por turma/aula:** professor gera convite **nomeando a turma/aula**; usuário
  Zaeon existente aceita → os dois passam a aparecer no chat um do outro como **card** (não solto;
  rotulado pela turma) → aluno entra na turma. Professor pode ter várias turmas sem bagunçar o chat.
- **Aula** = uma lição com conteúdo (markdown generativo) + vídeo YouTube indexado + quiz/desafio +
  avaliação final + nota/assertividade. Estados: **rascunho** (só o professor vê) → **enviada**
  (aparece em destaque pro aluno) → no aluno: **nova → em andamento → concluída**.
- **Geração com autonomia:** no chat (mesmo agente da agenda, agora também acessa as aulas):
  - intenção de **enviar** ("gere **e envie** uma aula de X pra turma Y") → agente **gera + envia**.
  - sem enviar ("gere uma aula de X", "me ajuda a montar") → gera só **rascunho**, NÃO envia; o
    professor lapida no Studio e envia depois. Professor escolhe: gerar / co-gerar / fazer manual.

## Models Prisma (adaptados do frappe/lms, sem UI deles)
```prisma
model Turma {
  id          String   @id @default(auto()) @map("_id") @db.ObjectId
  professorId String   @db.ObjectId
  name        String   // "Cálculo I", "História 9ºB"…
  createdAt   DateTime @default(now())
  members     TurmaMember[]
  aulas       Aula[]
  invites     TurmaInvite[]
  @@index([professorId])
}
model TurmaMember {     // aluno↔turma (pivot); a relação que importa
  id        String  @id @default(auto()) @map("_id") @db.ObjectId
  turmaId   String  @db.ObjectId
  studentId String  @db.ObjectId
  joinedAt  DateTime @default(now())
  @@unique([turmaId, studentId])
}
model TurmaInvite {     // convite por token (o frappe não tem nativo)
  id        String  @id @default(auto()) @map("_id") @db.ObjectId
  turmaId   String  @db.ObjectId
  token     String  @unique
  label     String  // nome mostrado no card do chat (turma/aula)
  uses      Int     @default(0)
  expiresAt DateTime?
  createdAt DateTime @default(now())
}
model Aula {
  id          String   @id @default(auto()) @map("_id") @db.ObjectId
  professorId String   @db.ObjectId
  turmaId     String?  @db.ObjectId         // null enquanto rascunho geral
  title       String
  body        String?                       // markdown (base generativa)
  youtubeIds  String[]                      // vídeos indexados
  status      String   @default("draft")    // draft | sent
  sentAt      DateTime?
  createdAt   DateTime @default(now())
  quiz        AulaQuiz?
}
model AulaQuiz {
  id        String @id @default(auto()) @map("_id") @db.ObjectId
  aulaId    String @unique @db.ObjectId
  title     String
  passingPct Int   @default(70)
  questions  AulaQuestion[]
  submissions AulaQuizSubmission[]
}
model AulaQuestion {
  id       String @id @default(auto()) @map("_id") @db.ObjectId
  quizId   String @db.ObjectId
  text     String
  type     String // choice | input | open | voice
  options  Json?  // [{text,isCorrect,explanation}] (choice)
  accepted String[] // respostas aceitas (input)
  marks    Int    @default(1)
  order    Int
}
model AulaQuizSubmission {   // tentativa + nota (assertividade)
  id         String @id @default(auto()) @map("_id") @db.ObjectId
  quizId     String @db.ObjectId
  studentId  String @db.ObjectId
  percentage Float
  passed     Boolean
  answers    Json   // [{questionId, answer, audioUrl?, transcript?, isCorrect, marks, marksOutOf}]
  createdAt  DateTime @default(now())
}
model AulaProgress {        // progresso/completude por aluno por aula
  id         String @id @default(auto()) @map("_id") @db.ObjectId
  aulaId     String @db.ObjectId
  studentId  String @db.ObjectId
  status     String @default("new") // new | in_progress | completed
  readingMs  Int    @default(0)     // tempo de leitura (modo foco)
  updatedAt  DateTime @updatedAt
  @@unique([aulaId, studentId])
}
```
(Lembrete: `prisma generate` roda no build; usar `data` em const separada pra evitar excess-property
check enquanto o client não regenera — padrão já usado no projeto.)

## FASES (entrega incremental, cada uma com tsc+vitest verde e PR próprio)

**Fase 1 — Fundação + limpeza do perfil professor**
- Models Prisma acima (+ rotas `/api/aulas/*`, `/api/turmas/*`, `/api/aulas/invite`).
- Remover Lounge e Finanças do professor (sem tocar navbar). Aba **"Meus Alunos"** (só professor)
  ao lado de "Aulas" na sala de estudos (gate por `isTeacher`).

**Fase 2 — Criar aula (professor), fluido como um estudo**
- Na área de Aulas do professor: criação **generativa** reusando o padrão do `MeusEstudosFeed`
  (barra ⟁ → gera rascunho) + **Studio adaptado** (motor estilo NotebookLM) pra gerar **conteúdo +
  quiz/desafios + sugestão de vídeo**. Liberdade total: gerar / co-gerar / manual.
- **Painel de rascunhos à direita** (estilo biblioteca do Meus Estudos): acumula vários rascunhos,
  professor lapida; **botão ENVIAR destacado**; ao enviar, a aula vira **"enviado"** no painel dele.

**Fase 3 — Módulo de aulas do ALUNO (a antiga "Livraria", SEM nome)**
- Onde ficam as aulas do aluno. Aula nova = **em destaque**. Abrir → **rola e abre o módulo embaixo**
  com: conteúdo (markdown), **vídeo YouTube indexado**, **quiz por texto OU por voz** (grava a
  resposta na voz do aluno via `ttsController`/STT → salva `audioUrl`+`transcript`), **avaliação
  final** (assíncrona/síncrona) e **nota/assertividade**. Ao chegar ao fim/completar → marca
  **concluída** ali (estado refletido no `AulaProgress`).

**Fase 4 — Agente do chat acessa as AULAS (além da agenda)**
- O agente do chat da `ClassesView` (que já tem `update_schedule`) ganha ferramentas de aula:
  - professor: "gere e **envie** uma aula de X pra turma Y" → gera + envia (autonomia de envio).
    "gere uma aula de X" → só rascunho (não envia).
  - **aviso de aula nova** chega no chat; a aula aparece como **card** na sala do aluno (rotulado
    pela turma, não solto).

**Fase 5 — "Meus Alunos" (professor)**
- Lista turmas + alunos; por aluno: **nota** (das submissões), **tempo de leitura** (somatório do
  `readingMs`, medido quando o aluno abre a aula em **modo foco** — instrumentar abrir/fechar),
  **nível de interesse** (pontualidade nas tarefas/resumos enviados pelo professor).

**Fase 6 — Polimento da Sala de Aula (cosmético/funcional)**
- **Relógio/agenda radial:** garantir funcional — todas as fatias nos **horários e direção corretos**.
  Manter a **linha fina do "trabalho"** (diferencia de estudo) como feature.
- **Chat:** minimizar numa **barra horizontal**; expandir/abrir só quando for marcar algo; **trocar a
  cor dos balões** de mensagem pro padrão Zaeon (hoje usam a cor do tema — fora de padrão).

**Fase 0 (bônus, rápido) — Meus Estudos:** verificar/consertar a geração — deve gerar um **exemplo de
estudo de verdade** e **gerar mesmo ao sair da aba** (`MeusEstudosFeed` fica montado/escondido; testar
`zaeonStudy`/`zaeon:study:run` e o `typeIntoBarAndRun`).

## Verificação (cada fase)
`npx tsc --noEmit` (tolerar 1 erro pré-existente em `research-lab/page.tsx`) · `npx vitest run` ·
smoke manual do fluxo (professor cria/gera → envia → aluno recebe card → abre → faz quiz → nota →
professor vê em Meus Alunos). Branch + PR por fase.

## Restrições
Segredos só em `.env`/VPS. Não mexer na navbar/sidebar. Mudanças só em Aulas + Meus Alunos.
Super admins: donmartinezcaiudoceu@gmail.com, donmartinez@aluno.unilab.edu.br.
