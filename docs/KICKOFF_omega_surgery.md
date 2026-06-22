# KICKOFF — Cirurgia Omega Scholar (Sala-de-Estudos + Past-Chat + Suggestion Forge)

> **Para:** sessão Claude Code rodando neste repositório
> **De:** sessão Cowork de planejamento
> **Data de plano:** 2026-06-05
> **Status:** PRONTO PARA EXECUÇÃO

---

## 0. CONCLUSÃO (LEIA PRIMEIRO)

Há **3 prompts encadeados** neste repositório que, executados em ordem, entregam:

1. Realocação do `ResearchSuggestionPanel` para a Sala de Estudos com gatilho contextual por termo acadêmico
2. Transformação de cada "Pesquisa Anterior" em mini-chat infinito acoplado ao Omega Scholar
3. Substituição das abas `Arquivos` e `Lacunas/RQ` por uma aba `Sugestão` alimentada por uma engine nova (Suggestion Forge, porta 8003) com termômetro multi-eixo e tier de qualidade derivado

Os três se compõem em um único ecossistema — Sala-de-Estudos sugere → Omega forja com classificador determinístico → tudo desemboca em chat infinito por pesquisa.

**Disciplina obrigatória:** seguir `CLAUDE.md` e `OMEGA_SCHOLAR.md` deste repo. Conclusão-primeiro em toda resposta. Caminhos absolutos. Verificação após cada fase.

---

## 1. SEQUÊNCIA DE EXECUÇÃO

Execute na ordem. **Não pule fases.** Materialize `task_plan.md` antes de cada uma (skill `planning-with-files`).

### Etapa A — Suggestion Forge (engine standalone, base do resto)

Arquivos âncora a ler na ordem:
1. `OMEGA_SCHOLAR.md` (carregue inteiro como contexto-mestre)
2. `CLAUDE.md` (disciplina de escrita e verificação)
3. `suggestion-forge/engine_spec.md` (contrato OpenAPI 3.1 fechado — schemas, exemplos, invariantes, fixtures, checklist)
4. `CLAUDE_CODE_PROMPT_omega_suggestion_forge.md` (plano executável completo — fases P0/P1/P2, verificação final, regras de ouro)

Execução:
- Implemente `suggestion-forge/` seguindo o checklist do §8 do `engine_spec.md`
- Rode `pytest --cov` antes de marcar a fase como concluída
- Rode o Monte Carlo 10k de calibração do classifier
- Boot manual: `uvicorn main:app --port 8003 --reload` e smoke curl

**Gate:** não avance para a etapa B se `pytest` não passar com coverage ≥ 85% e se o smoke curl não retornar 200 com ≥ 1 suggestion.

---

### Etapa B — Integração da Forge no Workspace Omega

Mesmo prompt mestre: `CLAUDE_CODE_PROMPT_omega_suggestion_forge.md`, fases 2–4.

Execução:
- Adicionar `suggestions Json?` em `ScholarSession` (Prisma) sem remover `gaps` ou `files`
- Criar `app/api/ai/suggestion-forge/route.ts` (proxy autenticado para porta 8003)
- Estender `OmegaScholarContext.tsx` com `suggestions`, `loadingSuggestions`, `fetchSuggestions`
- Adicionar tipos em `lib/scholar/types.ts`
- **Remover** `FilesModule.tsx` e `GapsModule.tsx`
- Criar `SuggestionForgeModule.tsx` com `DifficultyGauge`, `RangeGauge`, `TimeRange`, `TierBadge`, `GapTypeBadge`
- Trocar as duas abas removidas pela aba `Sugestão` (ícone `Sparkles`)

**Gate:** `npx tsc --noEmit` + `npm run lint` + `npm run build` limpos; smoke E2E manual em 3 sessões reais (count 3/5/7).

---

### Etapa C — Sala-de-Estudos + Mini-Chats Infinitos

Arquivo âncora: `CLAUDE_CODE_PROMPT_research_suggestion_relocation_and_past_research_chat.md` (plano completo com 5 fases, contratos, riscos, verificação).

Execução resumida:
- Mover `ResearchSuggestionPanel` da aba `pesquisa` para o `StudyRoomContent`
- Criar `ContextualSuggestionDock.tsx` com gatilho contextual
- Criar classificador `lib/scholar/academic-term-classifier.ts` + `academic-lexicon.json` (extrair termos de `OMEGA_SCHOLAR.md §2` e `research-engine/prompts.py`)
- Adicionar modelo Prisma `PastResearchChat`
- Criar rota streaming `app/api/research/chat/[researchId]/route.ts`
- Criar `PastResearchChatModal.tsx` (3 colunas: metadata / chat / refs)
- Tornar cada `ResearchCard` clicável em `app/study-rooms/lounge/main-lounge/researches/page.tsx`

**Gate:** mesma bateria de verificação + checklist do §5 do prompt.

---

### Etapa D — Costuras entre as três peças

Verificar ao final que:

- Botão "Iniciar mini-chat sobre esta sugestão" no `SuggestionForgeModule` cria um `PastResearchChat` válido com `contextJson` derivado da `Suggestion`
- Auto-forge dispara após `phase === "done"` no stream do `/api/ai/scholar` (a menos que o usuário tenha desativado em `localStorage`)
- Dock contextual da sala-de-estudos aceita arrastar uma sugestão direto para o editor do PDF (`onSelectTitle`)
- `gaps` e `files` continuam no banco para auditoria, apenas removidos da UI

---

## 2. SUPERPOWERS SUGERIDOS — CARREGAR NA SESSÃO

Na ordem em que devem ser invocados:

1. `planning-with-files` — antes de qualquer código, em toda etapa
2. `engineering:system-design` — ADR do `suggestion-forge` antes do scaffold
3. `data:statistical-analysis` — validar a distribuição do classifier com Monte Carlo
4. `engineering:code-review` — auto-review ao final de cada fase
5. `engineering:debug` — para problemas de stream NDJSON e parsing Gemini
6. `obsidian-project-kb-core` — registrar decisões arquiteturais no KB se o repo estiver bound

---

## 3. CONTRATOS QUE NÃO PODEM QUEBRAR (resumo cross-cutting)

| Símbolo | Garantia |
|---------|----------|
| `ScholarSession` | apenas estender com `suggestions Json?`; manter `gaps` e `files` |
| `ScholarEvent` (streaming) | inalterado |
| `ReferencesModule`, `InsightsModule` | inalterados |
| `/api/ai/scholar`, `/api/ai/research-suggest` | inalterados |
| `useOmegaScholar()` | extensão, não substituição |
| Paleta cyan/teal/amber | manter; único desvio permitido é `fuchsia-400` para tier `excepcional` |

---

## 4. RELATÓRIO FINAL ESPERADO

Use exatamente este formato (`CLAUDE.md`):

```text
Conclusion:
What I changed:
  - <lista exata de arquivos criados, alterados, removidos com caminhos absolutos>
What I checked:
  - <comandos executados e saídas-chave: pytest, tsc, lint, build, curls, smoke E2E>
Risks / limits:
  - <riscos ainda abertos e por quê>
Next step:
  - <próxima ação mínima recomendada>
```

---

## 5. ARQUIVOS DE PLANO PRESENTES NESTE REPO

| Caminho | Função |
|---------|--------|
| `CLAUDE_CODE_PROMPT_omega_suggestion_forge.md` | Prompt mestre da Etapa A+B |
| `suggestion-forge/engine_spec.md` | Contrato OpenAPI fechado da Forge |
| `CLAUDE_CODE_PROMPT_research_suggestion_relocation_and_past_research_chat.md` | Prompt mestre da Etapa C |
| `OMEGA_SCHOLAR.md` | Agente-mestre — system prompt base |
| `CLAUDE.md` | Disciplina de comunicação e execução |
| `ABNT_ENGINE_PLAN.md` | Histórico arquitetural — leia se mexer em `abnt-service` |
| `research-engine/prompts.py` | Vocabulário canônico de lacunas — reutilizar literal |

---

## 6. COMANDO DE PARTIDA (cole na sessão Claude Code)

```text
Você é a sessão de implementação do Zaeon Omega. Leia, nesta ordem exata:

1. CLAUDE.md
2. OMEGA_SCHOLAR.md
3. KICKOFF_omega_surgery.md (este arquivo)

Depois carregue as skills sugeridas em §2 do KICKOFF e materialize task_plan.md
seguindo a sequência A → B → C → D do §1.

NÃO comece a codar antes de:
- ter task_plan.md no disco
- ter ADR do suggestion-forge escrito (engineering:system-design)
- ter confirmado que research-engine (porta 8002) e abnt-service (porta 8001) sobem

Reporte conclusão de cada fase no formato do §4 antes de avançar.

Comece pela Etapa A — Suggestion Forge.
```

---

**Fim do KICKOFF. A sessão Claude Code tem tudo que precisa para executar sem ambiguidade.**
