# Migration Notes — Omega Surgery

MongoDB via Prisma **sem migrations versionadas** → as mudanças de schema são aplicadas com
`npx prisma db push` (não `prisma migrate`). Este arquivo documenta o estado anterior para rollback manual.

> ⚠️ **`prisma db push` NÃO foi executado neste worktree** — não há `DATABASE_URL`/Mongo acessível aqui.
> `npx prisma generate` foi rodado (cliente reflete os novos campos). **Você precisa rodar `db push` no seu
> ambiente** (com `DATABASE_URL` setado) antes de usar as features em runtime.

---

## Etapa B — `ScholarSession.suggestions`

**Mudança:** adicionado campo opcional ao modelo existente (aditivo, não destrutivo).

```prisma
model ScholarSession {
  ...
  gaps        Json?   // mantido (auditoria; fora da UI)
  files       Json?   // mantido (auditoria; fora da UI)
  suggestions Json?   // NOVO — ForgeResponse (Suggestion Forge 8003)
  ...
}
```

**Aplicar:**
```bash
npx prisma generate
npx prisma db push   # requer DATABASE_URL
```

**Rollback manual (mongosh):**
```js
db.ScholarSession.updateMany({}, { $unset: { suggestions: "" } })
```
`gaps` e `files` **permanecem no banco** — apenas saíram da UI (abas Arquivos/Lacunas removidas). Nada a migrar neles.

---

## Etapa C — `PastResearchChat` (modelo novo)

**Mudança:** modelo novo (não toca em `ScholarSession`).

```prisma
model PastResearchChat {
  id               String   @id @default(auto()) @map("_id") @db.ObjectId
  userId           String   @db.ObjectId
  researchId       String
  scholarSessionId String?  @db.ObjectId
  title            String
  contextJson      Json
  messages         Json
  pinned           Boolean  @default(false)
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
  @@index([userId, researchId])
}
```

**Aplicar:** `npx prisma generate && npx prisma db push` (requer `DATABASE_URL`). `generate` já rodado aqui; `db push` **pendente** (sem Mongo local).

**Rollback manual (mongosh):**
```js
db.PastResearchChat.drop()
```

---

## Variáveis de ambiente novas

| Var | Onde | Default |
|-----|------|---------|
| `SUGGESTION_FORGE_URL` | proxy `/api/ai/suggestion-forge` | `http://localhost:8003` |
| `GEMINI_API_KEY` (ou `GOOGLE_API_KEY`) | engine Python `suggestion-forge` | — (obrigatória p/ `/forge` ao vivo) |
| `NEXT_PUBLIC_FEATURE_PAST_RESEARCH_CHAT` | botão "Iniciar mini-chat" no `SuggestionForgeModule` | desativado (set `1` p/ habilitar a costura sugestão→chat) |
| `OMEGA_SCHOLAR_PATH` | loader de seções (opcional) | `<cwd>/OMEGA_SCHOLAR.md` |

O chat (`/api/research/chat`) usa o **Vertex** existente (`GOOGLE_CREDENTIALS`/`GOOGLE_PROJECT_ID`), igual ao `/api/ai/scholar`.
