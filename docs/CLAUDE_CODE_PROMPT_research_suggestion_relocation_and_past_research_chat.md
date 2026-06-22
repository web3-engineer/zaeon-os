# CLAUDE CODE PROMPT — Realocação do Painel de Sugestão + Pesquisas Anteriores como Mini-Chats Exploráveis

> **Versão:** 1.0
> **Alvo:** Claude Code rodando no repositório `zaeon-os` com o agente **Omega Scholar** carregado (`OMEGA_SCHOLAR.md`)
> **Skills sugeridas:** `planning-with-files`, `obsidian-project-kb-core`, `results-analysis`, `engineering:code-review`, `anthropic-skills:docx` (apenas se relatório final for pedido), `pdf-viewer:view-pdf` (para inspecionar artigos das pesquisas)
> **Conectores opcionais:** `mcp__plugin_operations_notion__*` (para sincronizar specs), `mcp__obsidian-mcp-tools__*` (para escrever no KB se o repo estiver bound)
> **Modo:** Agentic Loop com sub-agentes paralelos quando a etapa permitir
> **Linguagem dos commits, comentários e UI strings:** **pt-BR** (manter convenção do repo). Logs internos: en.

---

## 0. CONCLUSÃO (LEIA PRIMEIRO)

Você vai executar **duas correções de arquitetura** com impacto cruzado em UI, API e modelo de dados:

1. **Mover** `ResearchSuggestionPanel` da aba `pesquisa` para a aba `sala-de-estudos`, com **gatilho automático contextual** que dispara quando o usuário digita termos científicos ou palavras-chave acadêmicas (debounce + classificador leve). O card aparece **flutuando no topo** da sala de estudos como uma sugestão generativa, alinhada às regras dos engines (`research-engine/` e `lib/scholar/`).
2. **Transformar** cada item de `PESQUISAS ANTERIORES` (aba `pesquisas`, componente `ResearchesPage`) em um **assunto-chat infinitamente explorável**: clique → abre um mini-chat com contexto carregado (paper, autores, abstract, métricas, downloads), permitindo conversação contínua acoplada ao **Omega Scholar** como agente padrão.

Ambas as mudanças **se somam** ao Omega Scholar: o painel de sugestão fica como _surface_ de entrada (intent capture) e cada past-research-chat consome o mesmo agente reutilizando `ScholarSession`.

**Não é apenas trabalho de UI.** Há mudança de modelo Prisma (campo opcional), nova rota de API streaming reutilizando o pipeline scholar, e um novo classificador leve client-side para detectar "termo acadêmico".

---

## 1. CONTEXTO DO REPOSITÓRIO (NÃO REDESCUBRA)

Arquivos âncora — **leia antes de tocar em qualquer coisa**:

| Caminho | Papel |
|--------|-------|
| `app/research-lab/page.tsx` | Página com as 7 abas (`pesquisa`, `sala-de-estudos`, `pesquisas`, `lounge`, `pevem`, `news`, `profile`). Tem ~1767 linhas. |
| `components/research/ResearchSuggestionPanel.tsx` | Painel atual de sugestão (302 linhas). Bate em `/api/ai/research-suggest`. |
| `app/api/ai/research-suggest/route.ts` | Proxy Next → FastAPI engine na porta 8002. |
| `research-engine/main.py` + `engine.py` + `prompts.py` + `models.py` | Engine FastAPI que gera sugestões via Gemini. Endpoints `/suggest` e `/refresh`. |
| `app/study-rooms/lounge/main-lounge/researches/page.tsx` | "PESQUISAS ANTERIORES" — hoje só expande cards com métricas estáticas (349 linhas, dados em `RESEARCH_DATA` mockado). |
| `app/api/ai/scholar/route.ts` | Pipeline streaming completo: planejamento → busca multi-base → dedup → fulltext → síntese, persistindo em `ScholarSession`. |
| `lib/scholar/*` | Camadas do scholar: `sources`, `dedup`, `fulltext`, `synthesize`, `assemble`, `bibtex`, `prompt`, `types`. |
| `prisma/schema.prisma` (linhas ~344-360) | Modelo `ScholarSession` (já tem `thread`, `references`, `evidence`, `insights`, `gaps`). |
| `OMEGA_SCHOLAR.md` | Prompt-mestre do agente. **Carregue na sessão antes de implementar.** |
| `CLAUDE.md` | Disciplina de escrita, planejamento e verificação. **Obrigatória.** |

**Aba `pesquisa` (linha 1161) — bloco a remover:**
```tsx
{/* SUGESTÃO DE PESQUISA */}
<div className="bg-[#030014] rounded-[2rem] shrink-0">
  <ResearchSuggestionPanel
    docTitle={docTitle}
    onSelectTitle={handleSelectResearchTitle}
  />
</div>
```

**Aba `sala-de-estudos` (linha 1429-1433) — bloco a estender:**
```tsx
{activeTab === "sala-de-estudos" && (
  <div className="w-full h-full overflow-y-auto custom-scrollbar pb-32 pr-2">
    <StudyRoomContent flushTop />
  </div>
)}
```

---

## 2. PLANO EXECUTÁVEL (USE `planning-with-files`)

Crie estes arquivos antes de codar:

- `task_plan.md` — fases, status, blockers
- `notes.md` — evidências de leitura, decisões intermediárias
- `migration_notes.md` — somente se mexer em `schema.prisma`

Sequência **obrigatória** de fases. Não avance sem checkpoint.

### Fase 0 — Reconhecimento (15 min, sem escrita)
- [ ] Ler arquivos âncora listados em §1
- [ ] Confirmar que `research-engine` sobe em `http://localhost:8002` (`/health`)
- [ ] Rodar `npm run dev` e abrir `/research-lab` para baseline visual
- [ ] Tirar screenshot das 3 abas afetadas (`pesquisa`, `sala-de-estudos`, `pesquisas`)
- [ ] **Saída:** `notes.md` com 5 bullets de estado atual

### Fase 1 — P0: Realocar `ResearchSuggestionPanel` (sala-de-estudos)
**Objetivo:** mover o card sem perder funcionalidade, com gatilho contextual.

1. **Extrair** o bloco JSX do painel da aba `pesquisa` (`app/research-lab/page.tsx` ~linha 1161-1167).
2. **Criar** novo wrapper: `components/research/ContextualSuggestionDock.tsx` que:
   - Recebe `topic: string`, `level?: Level`, `onSelectTitle`, `autoHideMs?: number`.
   - Encapsula `ResearchSuggestionPanel` em um container **flutuante no topo** da sala de estudos: `sticky top-0 z-30`, `max-h-[420px]`, fundo `bg-[#030014]/95 backdrop-blur-xl`, com botão de colapso (chevron) e estado persistido em `localStorage` por usuário (`zaeon:dock:collapsed`).
   - Só renderiza quando `topic.length ≥ 3` E `isAcademicTerm(topic)` retorna `true`.
3. **Criar** `lib/scholar/academic-term-classifier.ts` — classificador leve **client-side**:
   - Entrada: string livre
   - Saída: `{ isAcademic: boolean; confidence: number; matchedTerms: string[]; domain?: 'bio'|'med'|'cs'|'phys'|'chem'|'eng'|'human'|'social'|'multi' }`
   - Heurísticas (todas combinadas, threshold ≥ 0.55):
     - Match contra dicionário de termos-chave por domínio (criar `lib/scholar/academic-lexicon.json` com ~400 termos extraídos de `OMEGA_SCHOLAR.md` seção §2 — bases públicas — e de `research-engine/prompts.py`)
     - Presença de tokens morfológicos (`-omics`, `-genesis`, `bio-`, `nano-`, `quantum`, `ab initio`, `in vitro/vivo/silico`, `metaanálise`, `revisão sistemática`, `framework`, `theorem`, `hypothesis`)
     - Estrutura tipográfica (CamelCase de gene/proteína, fórmulas químicas `[A-Z][a-z]?\d*`, DOIs, arXiv IDs)
     - Detecção de idioma: aceitar pt-BR e en
   - Função pura, **sem chamadas de rede** — esse classificador roda em cada keystroke (debounced 350 ms).
   - Testes: `lib/scholar/academic-term-classifier.test.ts` com ≥ 25 casos positivos e ≥ 25 negativos.
4. **Integrar** o `ContextualSuggestionDock` no `StudyRoomContent` (procurar arquivo: `app/workstation/student/StudyRoomContent.tsx`; se houver input de busca/comando lá, plugar nele; se não, criar `useStudyRoomTopic()` hook em `lib/scholar/useStudyRoomTopic.ts` que escuta digitação em qualquer campo `[data-academic-input="true"]` da sub-árvore).
5. **Remover** o bloco antigo da aba `pesquisa` em `app/research-lab/page.tsx`. Preservar `handleSelectResearchTitle` — ele continua sendo callback válido se o usuário "Usar como título no editor →".
6. **Verificar:**
   - `npm run lint` limpo
   - `npm test -- academic-term-classifier` verde
   - Manual: digitar "graphene oxide synthesis" na sala de estudos → dock aparece em ≤ 500 ms; digitar "comprar pão" → dock não aparece
   - Manual: aba `pesquisa` não mostra mais o painel de sugestão

### Fase 2 — P0: Past-Research-Chat (mini-chat infinito por pesquisa)
**Objetivo:** transformar cada `ResearchCard` em portal para um chat com contexto carregado.

1. **Migração Prisma** (`prisma/schema.prisma`): adicionar modelo novo (não alterar `ScholarSession`):
   ```prisma
   model PastResearchChat {
     id              String   @id @default(auto()) @map("_id") @db.ObjectId
     userId          String   @db.ObjectId
     researchId      String   // id estável do card de pesquisa (string pra acomodar mock e real)
     scholarSessionId String? @db.ObjectId  // FK lógica para ScholarSession se já foi pesquisada
     title           String
     contextJson     Json     // snapshot: participants, agents, métricas, references, doi, downloadUrl
     messages        Json     // [{ id, role: 'user'|'assistant', content, createdAt, citations?: Citation[] }]
     pinned          Boolean  @default(false)
     createdAt       DateTime @default(now())
     updatedAt       DateTime @updatedAt

     @@index([userId, researchId])
   }
   ```
   Rodar `npx prisma generate` e `npx prisma db push` (MongoDB — sem `migrate`). Documentar em `migration_notes.md`.

2. **Backend — nova rota streaming** `app/api/research/chat/[researchId]/route.ts`:
   - `GET` → retorna `PastResearchChat` (cria se não existe, popula `contextJson` a partir de `ResearchesPage` data ou de `ScholarSession`).
   - `POST` (streaming NDJSON, mesmo padrão do `/api/ai/scholar/route.ts`) → recebe `{ message: string }`, aplica o **prompt-sistema do Omega Scholar** (extrair do `OMEGA_SCHOLAR.md` seção §1 + §3) com **contexto injetado** do `contextJson`, e responde via Gemini (`lib/scholar/gemini.ts`).
   - Citação obrigatória: se o assistente afirmar fato, deve marcar `[ref:N]` onde `N` é índice em `contextJson.references`. Validar com regex no servidor antes de persistir.
   - Persistir cada turn em `messages[]`.

3. **Frontend — componente novo** `components/research/PastResearchChatModal.tsx`:
   - Modal full-screen com 3 colunas:
     - Esquerda (25%): metadados do paper — título, autores, ano, venue, DOI clicável, botão "Baixar PDF" (se `contextJson.downloadUrl`), lista de participantes (`grads/masters/phds`), agentes (`details.agents`), métricas (writing/methodology/impact/clarity, rank).
     - Centro (50%): chat infinito — mensagens, input com auto-resize, suporte a `Ctrl+Enter` para enviar, render Markdown + citações destacadas (badge cyan `[ref:1]` linkando para a referência na coluna direita).
     - Direita (25%): painel de **referências verificadas** + ações: "Exportar conversa (Markdown)", "Salvar como nota Obsidian" (se KB bound), "Iniciar pesquisa aprofundada" (chama `/api/ai/scholar` com `room = researchId`).
   - Estado de loading com `IosLoader` (já existe em `app/research-lab/page.tsx`).
   - Auto-scroll para fundo a cada novo token.
   - Persistência local em `localStorage` como fallback se a sessão de auth cair.

4. **Tornar cada `ResearchCard` clicável** em `app/study-rooms/lounge/main-lounge/researches/page.tsx`:
   - O comportamento atual de expandir métricas vira **secundário** (botão `Detalhes ▼` dentro do card).
   - Clique no corpo do card abre `PastResearchChatModal` com o `item` como prop.
   - Manter `motion.div` com `layout` para animação suave.
   - Adicionar indicador `MessageSquareIcon` + contador de mensagens (`messages.length` se já existir chat) — buscar via novo endpoint `GET /api/research/chat?ids=...` em batch ao montar a página.

5. **Verificar:**
   - `npm run build` sem erros
   - Smoke test E2E manual: abrir aba `pesquisas` → clicar em 3 cards diferentes → enviar pergunta → resposta chega com citação válida → fechar modal → reabrir → histórico preservado
   - Console limpo (sem warnings de hydration ou key duplicada)

### Fase 3 — P1: Integração contextual cruzada com Omega Scholar
**Objetivo:** sugestão da sala-de-estudos deve poder "virar pesquisa anterior" e o chat de pesquisa anterior deve poder "gerar nova sugestão derivada".

1. No `ContextualSuggestionDock`, adicionar botão `→ Iniciar pesquisa` que:
   - Cria `ScholarSession` via `POST /api/ai/scholar` com `prompt = result.suggestion.title`
   - Após `done`, cria `PastResearchChat` com `scholarSessionId` populado
   - Redireciona para aba `pesquisas` e abre modal automaticamente (use query param `?openChat=<id>`)
2. No `PastResearchChatModal`, adicionar comando slash `/sugerir-derivada` que chama `/api/ai/research-suggest` com `topic = title atual` e `exclude_titles = [title]`. Renderiza o resultado inline como mensagem do assistente.

### Fase 4 — P1: Telemetria + Acessibilidade
- [ ] Logar dispatches (PostHog ou `console.info` se sem analytics): `suggestion_dock_shown`, `suggestion_dock_dismissed`, `past_research_chat_opened`, `past_research_message_sent`.
- [ ] WCAG: dock e modal navegáveis por teclado, `aria-live="polite"` para tokens streaming, contraste mínimo AA no texto cyan-400/40.
- [ ] `prefers-reduced-motion` desabilita animações framer-motion no modal.

### Fase 5 — P2 (opcional, só se sobrar tempo)
- [ ] Cache de sugestões no engine FastAPI (Redis se disponível em `test-redis.ts`) — chave `sha1(topic|level|exclude)`.
- [ ] Export do chat para `.docx` usando `anthropic-skills:docx`.
- [ ] Indexação dos chats no KB Obsidian quando o repo estiver bound.

---

## 3. CONTRATOS QUE NÃO PODEM QUEBRAR

| Símbolo | Onde | Garantia |
|---------|------|----------|
| `ResearchSuggestionPanel` (props `docTitle`, `onSelectTitle`) | `components/research/ResearchSuggestionPanel.tsx` | API pública inalterada — só muda quem o renderiza. |
| `POST /api/ai/research-suggest` body `{ topic, level, exclude_titles }` | rota Next | Inalterado. |
| `SuggestResponse` Pydantic (`research-engine/models.py`) | engine | Inalterado. |
| `ScholarSession` (Prisma) | schema | **Não alterar**. Criar `PastResearchChat` separado e linkar via `scholarSessionId` opcional. |
| Streaming NDJSON do scholar (`ScholarEvent` em `lib/scholar/types.ts`) | `/api/ai/scholar` | Reaproveitar o mesmo encoder no novo endpoint para consistência client-side. |
| Tipografia/cores existentes (`Space Grotesk`, paleta cyan/teal) | global | Manter — não introduzir nova paleta. |

---

## 4. RISCOS E LIMITES

- **Falso positivo no classificador**: se "academic term" disparar em texto trivial, o dock vira ruído. Mitigar com threshold 0.55 e cooldown de 8 s após dismiss explícito.
- **MongoDB sem migrations versionadas**: `prisma db push` aplica direto. Documentar em `migration_notes.md` o estado anterior do schema para rollback manual (`db.PastResearchChat.drop()`).
- **Custo Gemini**: chats infinitos podem explodir tokens. Aplicar **janela deslizante** de 12 mensagens + summary das anteriores; soft-limit de 50 turns por sessão antes de avisar o usuário.
- **Hidratação Next.js**: dock `sticky` precisa de `mounted` guard (mesmo padrão de `app/research-lab/page.tsx:392`).
- **Engine offline**: a rota `/api/ai/research-suggest` já retorna 503; o dock deve mostrar fallback "Engine indisponível — verifique `research-engine` na porta 8002" em vez de erro genérico.

---

## 5. VERIFICAÇÃO FINAL (OBRIGATÓRIO ANTES DE FECHAR)

Execute na ordem e cole evidência em `task_plan.md`:

```bash
# 1. Tipagem + lint
npx tsc --noEmit
npm run lint

# 2. Testes
npm test -- academic-term-classifier
npm test -- lib/scholar

# 3. Engine
curl -s http://localhost:8002/health | jq
curl -s -X POST http://localhost:8002/suggest \
  -H 'Content-Type: application/json' \
  -d '{"topic":"graphene oxide synthesis","level":"phd","exclude_titles":[]}' | jq '.suggestion.title'

# 4. Build
npm run build

# 5. Manual (cheque um por um)
# - Aba 'pesquisa' NÃO mostra mais o painel de sugestão
# - Aba 'sala-de-estudos' mostra dock APENAS quando termo acadêmico é digitado
# - Aba 'pesquisas' → clicar em card abre modal com chat
# - Modal: enviar pergunta → resposta com citação → fechar → reabrir → histórico preservado
# - Botão "Iniciar pesquisa aprofundada" no modal → cria ScholarSession e atualiza chat com referências reais
```

**Saída esperada no relatório final** (formato do `CLAUDE.md`):

```text
Conclusion:
What I changed:
  - Movido ResearchSuggestionPanel: components/research/ContextualSuggestionDock.tsx (novo wrapper),
    integrado em app/workstation/student/StudyRoomContent.tsx; removido de app/research-lab/page.tsx:1161-1167
  - Novo classificador: lib/scholar/academic-term-classifier.ts + lexicon JSON + testes
  - Novo modelo Prisma: PastResearchChat
  - Nova rota: app/api/research/chat/[researchId]/route.ts (GET + POST streaming)
  - Novo modal: components/research/PastResearchChatModal.tsx
  - app/study-rooms/lounge/main-lounge/researches/page.tsx: cards agora abrem modal
What I checked:
  - tsc, lint, testes específicos verdes
  - engine /suggest 200
  - build sucesso
  - smoke E2E manual cobrindo 3 cards + 2 chats persistidos
Risks / limits:
  - Custo Gemini não tem hard cap ainda (P2)
  - Lexicon inicial cobre ~400 termos; falsos negativos em domínios de nicho
Next step:
  - Habilitar cache Redis (Fase 5)
  - Indexar chats no Obsidian KB se repo bound
```

---

## 6. INTEGRAÇÃO COM OMEGA SCHOLAR (NÃO PULAR)

Toda chamada de chat no `PastResearchChatModal` deve **carregar o prompt-mestre do Omega Scholar** como `system` message:

1. Ler `OMEGA_SCHOLAR.md` na inicialização do servidor (cache em memória, invalidar a cada 60 s).
2. Extrair seções §1 (identidade), §3 (loop agentic), §6 (regras de citação) e concatenar com o `contextJson` do paper.
3. Passar para `lib/scholar/gemini.ts` como primeiro turno.
4. **Validar resposta**: rejeitar e re-prompt se não houver pelo menos uma citação `[ref:N]` quando a pergunta exigir fato verificável (classificar via heurística simples: presença de quantificadores, datas, nomes próprios).

Isso garante que o agente do mini-chat **é** o Omega Scholar, não um chat genérico. O usuário deve perceber consistência de voz e disciplina de evidência entre o engine de sugestão, a pesquisa profunda e o chat exploratório.

---

## 7. SUPERPOWERS DISPONÍVEIS — USE NA ORDEM

1. **`planning-with-files`** — antes de qualquer código, materialize o plano em `task_plan.md`.
2. **`engineering:code-review`** — auto-review antes de marcar fases como concluídas.
3. **`engineering:debug`** — quando o streaming NDJSON travar (já tem precedente em `lib/scholar/`).
4. **`anthropic-skills:web-artifacts-builder`** — se quiser prototipar o modal isoladamente antes de integrar.
5. **`obsidian-project-kb-core`** — se o repo estiver bound, registre cada decisão arquitetural na nota canônica do projeto.
6. **`pdf-viewer:view-pdf`** — para inspecionar artigos baixados pelo `PastResearchChatModal` sem sair do app.

---

## 8. REGRAS DE OURO

- **Conclusão primeiro** em qualquer resposta intermediária ao usuário.
- **Caminhos absolutos** sempre que reportar arquivos tocados.
- **Não invente** termos no lexicon — extraia de `OMEGA_SCHOLAR.md` §2 e `research-engine/prompts.py`.
- **Não quebre** `ScholarSession` — é a fonte de verdade da pesquisa profunda.
- **Pergunte** se encontrar ambiguidade real (ex: design do modal em mobile não foi especificado — peça antes de chutar).
- **Pare** se `npm run build` falhar. Não empurre commits quebrados.
- **Reporte** exatamente: arquivos alterados, arquivos NÃO alterados, comandos executados, saídas.

---

**Fim do prompt. Comece pela Fase 0.**
