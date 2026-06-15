# Plano — Admin alimenta a Zion com contexto (sem GitHub)

Objetivo: o admin (founder) injeta/atualiza o contexto da **Zion** pelo próprio
painel, e o usuário percebe isso no chat dele — sem precisar mexer no código/GitHub.

Status atual: a Zion já é **100% funcional** com o contexto estático embutido
(persona `zion` em `app/api/ai/chat/route.ts` + `docs/ZION_CONTEXT.md`). Este plano
adiciona uma camada de contexto **dinâmica e editável**.

## Como funciona hoje (base já pronta)
- `POST /api/ai/chat` aceita `systemContext` e injeta na system instruction
  ("=== CONTEXTO ADICIONAL FORNECIDO PELO SISTEMA ===").
- A persona `zion` já instrui: "se houver [CONTEXTO ADICIONAL], trate como verdade
  atual da plataforma (pode ter sido injetado pelo admin)".
- Logo, basta o `ZionOrchestrator` passar um `systemContext` vindo de uma fonte editável.

## Design proposto (mínimo esforço, sem GitHub)

### 1. Armazenamento (1 doc no Mongo)
Coleção `zion_context` (ou reusar `Plugin`/um `Setting` singleton):
```
{ _id, scope: "global" | "<sala>", content: string, updatedBy, updatedAt }
```
- `scope:"global"` = vale para todos. `scope` por sala permite contexto específico
  (ex.: contexto só da sala de Pesquisa).

### 2. Rotas
- `GET /api/zion/context?scope=global` → `{ content, updatedAt }` (público a logados).
- `PUT /api/zion/context` (admin-gated, `lib/auth/roles.isSuperAdmin`) → salva `content`.

### 3. Painel admin (aba no `/workstation/admin`)
- Nova aba **"Zion"**: textarea grande para o `content` + seletor de `scope` + "Salvar".
- Mostra `updatedAt`/quem editou.

### 4. Cliente (chat do usuário)
- `ZionOrchestrator` faz `GET /api/zion/context` ao abrir e passa como `systemContext`.
- **Usuário percebe**: um selo discreto no header do card — "contexto atualizado pela
  equipe" quando `updatedAt` for recente (ex.: < 7 dias), e a Zion responde já sabendo.

### 5. Caching/limite
- Cachear no cliente por sessão; `content` limitado a ~4–8 KB (cabe no prompt do Flash).
- Sanitizar (texto puro), sem segredos.

## Esforço estimado
- Modelo + 2 rotas: ~0.5 dia. Aba admin (textarea + salvar): ~0.5 dia. Hook no
  orquestrador + selo: ~0.5 dia. Total ~1.5 dia. Sem migração pesada (Mongo flexível).

## Extensões futuras
- Versionar o contexto (histórico de edições).
- Contexto por **curso**/turma (segmentar quem vê o quê).
- Deixar a Zion **propor** atualização de contexto ao admin a partir de dúvidas recorrentes.
