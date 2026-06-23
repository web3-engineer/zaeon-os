# Plano — Admin alimenta a Bento com contexto (sem GitHub)

Objetivo: o admin (founder) injeta/atualiza o contexto da **Bento** pelo próprio
painel, e o usuário percebe isso no chat dele — sem precisar mexer no código/GitHub.

Status atual: a Bento já é **100% funcional** com o contexto estático embutido
(persona `bento` em `app/api/ai/chat/route.ts` + `docs/BENTO_CONTEXT.md`). Este plano
adiciona uma camada de contexto **dinâmica e editável**.

## Como funciona hoje (base já pronta)
- `POST /api/ai/chat` aceita `systemContext` e injeta na system instruction
  ("=== CONTEXTO ADICIONAL FORNECIDO PELO SISTEMA ===").
- A persona `bento` já instrui: "se houver [CONTEXTO ADICIONAL], trate como verdade
  atual da plataforma (pode ter sido injetado pelo admin)".
- Logo, basta o `BentoOrchestrator` passar um `systemContext` vindo de uma fonte editável.

## Design proposto (mínimo esforço, sem GitHub)

### 1. Armazenamento (1 doc no Mongo)
Coleção `bento_context` (ou reusar `Plugin`/um `Setting` singleton):
```
{ _id, scope: "global" | "<sala>", content: string, updatedBy, updatedAt }
```
- `scope:"global"` = vale para todos. `scope` por sala permite contexto específico
  (ex.: contexto só da sala de Pesquisa).

### 2. Rotas
- `GET /api/bento/context?scope=global` → `{ content, updatedAt }` (público a logados).
- `PUT /api/bento/context` (admin-gated, `lib/auth/roles.isSuperAdmin`) → salva `content`.

### 3. Painel admin (aba no `/workstation/admin`)
- Nova aba **"Bento"**: textarea grande para o `content` + seletor de `scope` + "Salvar".
- Mostra `updatedAt`/quem editou.

### 4. Cliente (chat do usuário)
- `BentoOrchestrator` faz `GET /api/bento/context` ao abrir e passa como `systemContext`.
- **Usuário percebe**: um selo discreto no header do card — "contexto atualizado pela
  equipe" quando `updatedAt` for recente (ex.: < 7 dias), e a Bento responde já sabendo.

### 5. Caching/limite
- Cachear no cliente por sessão; `content` limitado a ~4–8 KB (cabe no prompt do Flash).
- Sanitizar (texto puro), sem segredos.

## Esforço estimado
- Modelo + 2 rotas: ~0.5 dia. Aba admin (textarea + salvar): ~0.5 dia. Hook no
  orquestrador + selo: ~0.5 dia. Total ~1.5 dia. Sem migração pesada (Mongo flexível).

## Extensões futuras
- Versionar o contexto (histórico de edições).
- Contexto por **curso**/turma (segmentar quem vê o quê).
- Deixar a Bento **propor** atualização de contexto ao admin a partir de dúvidas recorrentes.
