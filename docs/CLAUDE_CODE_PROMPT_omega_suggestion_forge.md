# CLAUDE CODE PROMPT — Substituir "Arquivos" e "Lacunas/RQ" por **SUGESTÃO** com Engine Multi-Eixo (Suggestion Forge)

> **Versão:** 1.0
> **Alvo:** Claude Code rodando no repositório `zaeon-os` com `OMEGA_SCHOLAR.md` carregado
> **Skills sugeridas:** `planning-with-files`, `engineering:code-review`, `engineering:system-design`, `data:statistical-analysis`, `obsidian-project-kb-core`
> **Conectores opcionais:** `mcp__obsidian-mcp-tools__*` (para registrar arquitetura no KB)
> **Modo:** Agentic Loop com sub-agentes paralelos
> **Idioma UI/commits:** **pt-BR** | logs internos: en | docstrings Pydantic: en

---

## 0. CONCLUSÃO (LEIA PRIMEIRO)

O Omega Scholar entrega **referências** com qualidade satisfatória — você não vai mexer nisso. O que vai mudar é a parte **especulativa**:

1. **Remover** as abas `Arquivos` (`FilesModule`) e `Lacunas / RQ` (`GapsModule`) do `OmegaScholarWorkspace`.
2. **Introduzir** uma nova aba **`Sugestão`** (`SuggestionForgeModule`) que recebe as referências já coletadas pela pesquisa atual e **gera N propostas de trabalhos derivados**, cada uma com um **termômetro multi-eixo**:
   - **Dificuldade** — escala discreta de 4 níveis ancorados em estágio acadêmico (`grad | msc | phd | postdoc`)
   - **Relevância** — float `[0,1]`
   - **Inovação** — float `[0,1]`
   - **Tempo estimado** — meses (faixa min–max)
   - **Tier de qualidade derivado** — `regular | muito_bom | excelente | excepcional`
3. **Criar** uma engine FastAPI nova — **Suggestion Forge** (porta `8003`) — análoga e paralela ao `research-engine` e ao `abnt-service`. Ela consome a lista de referências do `ScholarSession` corrente, cruza-as via prompt estruturado e devolve sugestões classificadas + **desdobramentos** (publicação alvo, métodos requeridos, recursos materiais, pré-requisitos, riscos, marcos temporais).
4. **Reaproveitar** o vocabulário do engine de classificação de escrita já presente em `app/study-rooms/lounge/main-lounge/researches/page.tsx` (`writing | methodology | impact | clarity` → `rank SS/S/A/B/C`) como **espelho conceitual** para o tier de qualidade dos novos trabalhos.

**Não é UI cosmética.** Há engine FastAPI nova, contrato Pydantic novo, rota Next nova, componente React novo com gauges interativos e integração com o `OmegaScholarContext` existente.

---

## 1. CONTEXTO DO REPOSITÓRIO (NÃO REDESCUBRA)

Arquivos âncora — **leia antes de tocar em qualquer coisa**:

| Caminho | Papel |
|--------|-------|
| `app/workstation/student/omega/OmegaScholarWorkspace.tsx` | Workspace com as 4 abas atuais. Linha 15 declara `TABS`. |
| `app/workstation/student/omega/modules/FilesModule.tsx` | **REMOVER.** |
| `app/workstation/student/omega/modules/GapsModule.tsx` | **REMOVER.** |
| `app/workstation/student/omega/modules/ReferencesModule.tsx` | Não mexer — fonte de verdade das refs. |
| `app/workstation/student/omega/modules/InsightsModule.tsx` | Não mexer — vai conviver com a aba nova. |
| `app/workstation/student/omega/OmegaScholarContext.tsx` | Provider do estado da sessão. **Estender** com `suggestions` e `loadingSuggestions`. |
| `app/api/ai/scholar/route.ts` | Streaming pipeline que persiste em `ScholarSession`. |
| `lib/scholar/types.ts` | Tipos `Paper`, `ScholarEvent`, `RawSynthesis`. **Adicionar** `Suggestion`, `SuggestionAxes`, `SuggestionDesdobramento`. |
| `lib/scholar/synthesize.ts` (linha 32) | Hoje sintetiza incluindo `gaps.rqCards`. O conceito `gaps` migra para o novo engine — manter o campo no schema Prisma mas **parar de exibi-lo na UI**. |
| `research-engine/` (porta 8002) | Engine atual de sugestão única — referência arquitetural. |
| `abnt-service/` (porta 8001) | Outro serviço FastAPI no monorepo — usar como blueprint estrutural (CORS, /health, /format). |
| `app/study-rooms/lounge/main-lounge/researches/page.tsx` | Engine de classificação de escrita (métricas `writing/methodology/impact/clarity` → `rank`). **Espelho conceitual** para o tier derivado. |
| `prisma/schema.prisma:344-360` | `ScholarSession` já tem `gaps Json?` e `references Json?` — vamos adicionar `suggestions Json?`. |
| `OMEGA_SCHOLAR.md §4.2` | Agentic Loop (UNDERSTAND → PLAN → EXECUTE → VERIFY → ASSESS → REFLECT). A engine nova **respeita** esse loop. |
| `research-engine/prompts.py` | Vocabulário canônico de gap (empíricas/metodológicas/geográficas/temporais/interdisciplinares) — **reutilizar literalmente**. |

**Trechos exatos a remover do `OmegaScholarWorkspace.tsx`:**
```tsx
import FilesModule from "./modules/FilesModule";
import GapsModule from "./modules/GapsModule";
// ...
{ id: "files", label: "Arquivos", icon: FolderOpen },
{ id: "gaps", label: "Lacunas / RQ", icon: Target },
// ...
{mod === "files" && <FilesModule files={s.files ?? []} />}
{mod === "gaps" && <GapsModule gaps={s.gaps} />}
```

Substituir por:
```tsx
import SuggestionForgeModule from "./modules/SuggestionForgeModule";
// ...
{ id: "suggestions", label: "Sugestão", icon: Sparkles },
// ...
{mod === "suggestions" && <SuggestionForgeModule />}
```

---

## 2. PLANO EXECUTÁVEL (USE `planning-with-files`)

Materialize antes de codar:
- `task_plan.md` — fases P0/P1/P2, status, blockers
- `notes.md` — evidências de leitura, decisões intermediárias
- `migration_notes.md` — alterações em `schema.prisma`
- `engine_spec.md` — contrato OpenAPI da `suggestion-forge` antes de implementar

---

### Fase 0 — Reconhecimento (sem escrita, 15 min)

- [ ] Ler arquivos âncora de §1
- [ ] Rodar `research-engine` (porta 8002) e `abnt-service` (porta 8001) — confirmar que sobem
- [ ] Disparar uma pesquisa no Omega para baixar um `ScholarSession` real e inspecionar `references`/`gaps`/`insights`
- [ ] Tirar screenshots das 4 abas atuais
- [ ] **Saída:** `notes.md` com 5 bullets do estado atual + dump de uma `ScholarSession` real (mascarar PII)

---

### Fase 1 — P0: Engine `suggestion-forge` (FastAPI, porta 8003)

**Por que primeiro o backend:** o frontend depende de contrato estável; iterar UI sem schema fixo gera retrabalho.

1. **Scaffold** do serviço em `suggestion-forge/` espelhando `research-engine/`:
   ```
   suggestion-forge/
   ├── main.py            # FastAPI app, /health, /forge, /reforge
   ├── models.py          # Pydantic v2
   ├── engine.py          # Gemini call + parser + scorer
   ├── prompts.py         # Prompt mestre multi-axial
   ├── classifier.py      # Cálculo determinístico dos 4 eixos
   ├── conftest.py
   ├── tests/
   │   ├── test_models.py
   │   ├── test_classifier.py
   │   └── test_engine.py
   └── requirements.txt   # fastapi, pydantic>=2, google-generativeai, python-dotenv, uvicorn
   ```

2. **Contrato Pydantic** (`suggestion-forge/models.py`):

   ```python
   from pydantic import BaseModel, Field, field_validator
   from typing import Literal

   AcademicLevel = Literal["grad", "msc", "phd", "postdoc"]
   QualityTier = Literal["regular", "muito_bom", "excelente", "excepcional"]
   GapType = Literal["empirica", "metodologica", "geografica", "temporal", "interdisciplinar"]

   class IncomingRef(BaseModel):
       title: str
       authors: str
       year: str
       venue: str
       doi: str | None = None
       abstract: str | None = None  # opcional, melhora qualidade quando presente

   class ForgeRequest(BaseModel):
       topic: str = Field(..., min_length=2, max_length=500)
       user_level: AcademicLevel  # nível atual do solicitante; só calibra apresentação, NÃO trava propostas
       references: list[IncomingRef] = Field(..., min_length=3, max_length=40)
       count: int = Field(default=5, ge=1, le=10)
       exclude_titles: list[str] = Field(default_factory=list)
       language: Literal["pt-BR", "en"] = "pt-BR"

   class SuggestionAxes(BaseModel):
       difficulty: AcademicLevel  # eixo discreto ancorado no estágio acadêmico
       relevance: float = Field(..., ge=0.0, le=1.0)
       innovation: float = Field(..., ge=0.0, le=1.0)
       estimated_months_min: int = Field(..., ge=1, le=120)
       estimated_months_max: int = Field(..., ge=1, le=120)

       @field_validator("estimated_months_max")
       @classmethod
       def max_ge_min(cls, v, info):
           if "estimated_months_min" in info.data and v < info.data["estimated_months_min"]:
               raise ValueError("estimated_months_max must be >= min")
           return v

   class SuggestionDesdobramento(BaseModel):
       """Tudo que se desdobra ao iniciar essa pesquisa."""
       publication_targets: list[str]   # ex: ["Qualis A2", "PLoS ONE", "arXiv cs.LG"]
       required_methods: list[str]      # ex: ["MICP assay", "qPCR", "Monte Carlo simulation"]
       material_resources: list[str]    # equipamentos, reagentes, datasets, compute
       prerequisites: list[str]         # cursos, certificações, conhecimentos prévios
       risks: list[str]                 # técnicos, éticos, de viabilidade
       milestones: list[str]            # marcos temporais até a submissão
       evidence_refs: list[int]         # índices das references (0-based) que sustentam a proposta
       cross_link_refs: list[int]       # refs cruzadas que sugerem a oportunidade pós-lacuna

   class Suggestion(BaseModel):
       id: str  # uuid4
       title: str = Field(..., max_length=180)
       rationale: str = Field(..., max_length=400)
       novelty_angle: str = Field(..., max_length=140)
       gap_type: GapType
       gap_score: float = Field(..., ge=0.0, le=1.0)
       axes: SuggestionAxes
       quality_tier: QualityTier  # derivado determinístico — NÃO confiar só no LLM
       desdobramentos: SuggestionDesdobramento

   class ForgeResponse(BaseModel):
       suggestions: list[Suggestion]
       coverage_summary: str  # resumo do que o engine cobriu vs o que restou
       generated_at: str       # ISO 8601
   ```

3. **Classificador determinístico** (`suggestion-forge/classifier.py`):

   O LLM **propõe** valores mas o tier final é calculado por código — para reprodutibilidade e auditoria. Fórmula:

   ```python
   def quality_tier(axes: SuggestionAxes, gap_score: float) -> QualityTier:
       # score composto ponderado
       difficulty_weight = {"grad": 0.25, "msc": 0.5, "phd": 0.75, "postdoc": 1.0}
       score = (
           0.30 * axes.relevance +
           0.30 * axes.innovation +
           0.25 * gap_score +
           0.15 * difficulty_weight[axes.difficulty]
       )
       if score >= 0.85: return "excepcional"
       if score >= 0.70: return "excelente"
       if score >= 0.55: return "muito_bom"
       return "regular"
   ```

   **Limites de sanidade** (rejeitar e re-prompt se violar):
   - `excepcional` requer `difficulty in {phd, postdoc}` E `innovation ≥ 0.80`
   - `regular` requer `estimated_months_max ≤ 24`
   - `excelente` requer `difficulty in {msc, phd, postdoc}` E `gap_score ≥ 0.65`
   - Diferença `max - min` em meses não pode passar de 60% do `max`

4. **Prompt mestre** (`suggestion-forge/prompts.py`):

   Estruturar em **5 fases internas** alinhadas ao Omega Scholar (§4.2 de `OMEGA_SCHOLAR.md`):

   - **F1 — Cartografar** as N referências: extrair domínio, métodos, populações, recortes temporais.
   - **F2 — Cruzar pares** das refs: identificar **pós-lacunas** (oportunidades que surgem _depois_ de uma lacuna já mapeada, ex: "se ref A mostra X em humanos e ref B mostra Y em camundongos, a pós-lacuna é translação inversa Y→humanos via design quase-experimental").
   - **F3 — Gerar `count`** propostas distintas. Cada uma deve preencher um `GapType` diferente quando possível (diversificação obrigatória).
   - **F4 — Calibrar eixos**: o LLM propõe `relevance`, `innovation`, `difficulty`, `estimated_months_min/max`, `gap_score`. O classifier valida e ajusta.
   - **F5 — Desdobrar**: para cada proposta, listar `publication_targets`, `required_methods`, `material_resources`, `prerequisites`, `risks`, `milestones`, e mapear índices de refs (`evidence_refs`, `cross_link_refs`).

   Saída: JSON puro conforme `ForgeResponse`. Sem markdown, sem prosa fora do JSON.

   Incluir no prompt **literal** os parágrafos das "LACUNAS" do `research-engine/prompts.py` (FASE 1 daquele arquivo) — vocabulário canônico.

5. **Endpoints**:
   - `GET /health`
   - `POST /forge` → ForgeRequest → ForgeResponse
   - `POST /reforge` → mesmo contrato, mas exige `exclude_titles` populado (re-gera com diversificação forçada)

6. **Tests** (mínimo 12):
   - parser aceita JSON válido / rejeita malformado
   - classifier respeita limites de sanidade
   - `excepcional` exige `phd|postdoc` + `innovation ≥ 0.80`
   - `regular` exige `months_max ≤ 24`
   - smoke contra mock do Gemini

7. **CORS** + `.env` espelhando `research-engine` (`http://localhost:3000`, `https://zaeonos.com`).

---

### Fase 2 — P0: Schema, rota Next e contexto frontend

1. **Prisma** (`prisma/schema.prisma:344`):
   - Adicionar `suggestions Json?` ao `ScholarSession`. **Não remover** `gaps` nem `files` — só param de ser exibidos na UI; ficam disponíveis para introspecção e migração futura.
   - `npx prisma generate && npx prisma db push` (MongoDB, sem migrations versionadas). Documentar em `migration_notes.md`.

2. **Rota proxy** `app/api/ai/suggestion-forge/route.ts`:
   - Espelhar `app/api/ai/research-suggest/route.ts` (auth via NextAuth, lookup do `dbUser`, proxy para `process.env.SUGGESTION_FORGE_URL ?? "http://localhost:8003"`).
   - Após resposta do engine: persistir em `ScholarSession.suggestions` se vier `sessionId` no body.
   - Timeout: 35s (engine pode levar mais que o de sugestão única).
   - Fallback 503 amigável: `"Suggestion Forge offline. Rode suggestion-forge na porta 8003."`

3. **Tipos** (`lib/scholar/types.ts`):
   ```ts
   export type AcademicLevel = "grad" | "msc" | "phd" | "postdoc";
   export type QualityTier = "regular" | "muito_bom" | "excelente" | "excepcional";
   export type GapType = "empirica" | "metodologica" | "geografica" | "temporal" | "interdisciplinar";

   export interface SuggestionAxes {
     difficulty: AcademicLevel;
     relevance: number;
     innovation: number;
     estimated_months_min: number;
     estimated_months_max: number;
   }

   export interface SuggestionDesdobramento {
     publication_targets: string[];
     required_methods: string[];
     material_resources: string[];
     prerequisites: string[];
     risks: string[];
     milestones: string[];
     evidence_refs: number[];
     cross_link_refs: number[];
   }

   export interface Suggestion {
     id: string;
     title: string;
     rationale: string;
     novelty_angle: string;
     gap_type: GapType;
     gap_score: number;
     axes: SuggestionAxes;
     quality_tier: QualityTier;
     desdobramentos: SuggestionDesdobramento;
   }
   ```

4. **Context** (`app/workstation/student/omega/OmegaScholarContext.tsx`):
   - Adicionar `suggestions: Suggestion[] | null`, `loadingSuggestions: boolean`, `fetchSuggestions(opts?: { count?: number; exclude?: string[] }): Promise<void>`.
   - `fetchSuggestions` chama `/api/ai/suggestion-forge` com `topic = session.query`, `user_level` do perfil (`session?.user?.academicLevel`), `references = session.references`.
   - Persistir resultado no estado e re-chamar quando o usuário pedir "Mais sugestões" (passar títulos atuais em `exclude_titles`).

---

### Fase 3 — P0: `SuggestionForgeModule` (UI)

Criar `app/workstation/student/omega/modules/SuggestionForgeModule.tsx`. Estrutura:

```
┌─────────────────────────────────────────────────────────────┐
│  Header                                                       │
│  ✦ Sugestão · forjada a partir de 12 referências              │
│  [Filtrar por: dificuldade ▾] [Filtrar por tier ▾] [↻ Forjar] │
├─────────────────────────────────────────────────────────────┤
│  Coverage summary (1 linha em itálico, cyan/40)              │
├─────────────────────────────────────────────────────────────┤
│  Card 1                                                       │
│  [Tier badge] [GapType badge]                  Dificuldade ⬤  │
│  Título                                                       │
│  Rationale (2 linhas, truncado com tooltip)                  │
│  ┌──── Termômetro ────┐                                       │
│  │ Dificuldade  ▓▓▓░░  PhD                                    │
│  │ Relevância   ▓▓▓▓░  0.82                                   │
│  │ Inovação     ▓▓▓▓▓  0.91                                   │
│  │ Tempo        14–22 meses                                   │
│  └────────────────────┘                                       │
│  [Ver desdobramentos ▾]                                       │
│  ── (expandido) ──                                            │
│  • Publicação alvo: Qualis A2, PLoS ONE                       │
│  • Métodos: qPCR, Monte Carlo                                 │
│  • Recursos: termociclador, GPU A100                          │
│  • Pré-requisitos: Bioestatística, Python                     │
│  • Riscos: amostragem heterogênea                             │
│  • Marcos: piloto (3m), coleta (8m), análise (4m), submissão  │
│  • Evidência: refs #2, #5, #9                                 │
│  • Cruzamento pós-lacuna: refs #3 ↔ #7                        │
│  [Iniciar mini-chat sobre esta sugestão]                     │
└─────────────────────────────────────────────────────────────┘
```

**Componentes internos:**

- `<DifficultyGauge level="phd" />` — 4 segmentos arredondados (grad / msc / phd / postdoc), o ativo brilha cyan.
- `<RangeGauge value={0.82} label="Relevância" />` — barra horizontal com gradient teal→cyan, tooltip mostra valor numérico.
- `<TimeRange min={14} max={22} />` — chip "14–22 meses" com micro-sparkline simulando o progresso esperado mês a mês.
- `<TierBadge tier="excelente" />` — paleta:
  - `regular` → slate-400
  - `muito_bom` → teal-400
  - `excelente` → amber-400
  - `excepcional` → fuchsia-400 com glow `shadow-[0_0_18px_rgba(232,121,249,0.35)]`
- `<GapTypeBadge type="interdisciplinar" />` — paleta espelha o `SOURCE_STYLES` do `ResearchSuggestionPanel`.

**Estado vazio:** se `session.references.length < 3` → render `"Forje sugestões assim que tiver pelo menos 3 referências verificadas."` com botão desabilitado.

**Loading:** reusar `IosLoader` em variante "Forjando hipóteses..."; mostrar **N skeleton cards** equivalente ao `count` solicitado.

**Filtros locais (client-side, sem refetch):**
- Por `quality_tier` (multi-select)
- Por `axes.difficulty` (multi-select)
- Ordenação: tier desc → innovation desc → relevance desc (padrão)

**Botão "↻ Forjar mais":** chama `fetchSuggestions({ exclude: currentTitles })`. Append, não substitui.

**Integração com aba "Pesquisas Anteriores" do CLAUDE_CODE_PROMPT anterior** (`research_suggestion_relocation_and_past_research_chat`): cada card tem botão **"Iniciar mini-chat sobre esta sugestão"** que cria um `PastResearchChat` com `contextJson` derivado da `Suggestion`. Se o prompt anterior ainda não foi executado, deixar o botão atrás de feature flag `NEXT_PUBLIC_FEATURE_PAST_RESEARCH_CHAT`.

---

### Fase 4 — P1: Integração com Omega Loop

A engine `suggestion-forge` **respeita** o agentic loop:

- Quando `OmegaScholarContext` recebe `phase === "done"` no stream do `/api/ai/scholar`, dispara `fetchSuggestions()` automaticamente **somente** se `references.length ≥ 3` e o usuário não desativou auto-forge (preferência em `localStorage: zaeon:omega:autoforge`).
- Comando slash no `ActivityThread`: `/forjar 7 grad` → forçar `count=7`, `user_level=grad`.
- Re-loop trigger: se o usuário aceitar uma sugestão (botão "Aprofundar esta"), criar um novo `ScholarSession` com `query = suggestion.title` e `room = suggestion.id` para rastreamento.

---

### Fase 5 — P1: Telemetria + Acessibilidade

- Eventos: `suggestion_forge_requested`, `suggestion_forge_rendered`, `suggestion_expanded`, `suggestion_accepted`, `suggestion_dismissed`, `tier_filter_applied`.
- ARIA: cada gauge com `role="meter"` + `aria-valuemin/valuemax/valuenow/valuetext`.
- Contraste mínimo AA para `tier-regular` (slate-400 em fundo `#030014` precisa virar slate-300 — verificar).
- `prefers-reduced-motion` desabilita o glow pulsante do tier `excepcional`.

---

### Fase 6 — P2 (opcional)

- Cache Redis no engine: chave `sha1(topic|user_level|sorted_dois|count)`, TTL 1h.
- Export do conjunto de sugestões para `.docx` via `anthropic-skills:docx` ("Pacote de Possibilidades").
- Diff entre forjas consecutivas — mostrar o que ganhou/perdeu tier ao re-forjar.
- Indexar sugestões aceitas no KB Obsidian quando o repo estiver bound.

---

## 3. CONTRATOS QUE NÃO PODEM QUEBRAR

| Símbolo | Onde | Garantia |
|---------|------|----------|
| `ScholarSession` (Prisma) | `prisma/schema.prisma` | **Estender** com `suggestions Json?`. **Não remover** `gaps` nem `files`. |
| `ScholarEvent` (`lib/scholar/types.ts`) | streaming | Inalterado. |
| `ReferencesModule`, `InsightsModule` | omega workspace | Inalterados. |
| `/api/ai/scholar` stream | rota Next | Inalterado. |
| `/api/ai/research-suggest` | rota Next | Inalterado (continua servindo o painel realocado da sala-de-estudos). |
| `useOmegaScholar()` API pública | context | Estender (não remover) com `suggestions`, `loadingSuggestions`, `fetchSuggestions`. |
| Paleta cyan/teal/amber | global | Adicionar tier `excepcional` em fuchsia-400, **único desvio** — documentar. |

---

## 4. RISCOS E LIMITES

- **LLM enviesado pra `excepcional`**: o classifier determinístico mitiga, mas se o Gemini insistir em superestimar `innovation`, aplicar **calibração reversa** (regredir valores 5% por iteração até cair em faixa). Logar `gemini_overconfidence_count` por sessão.
- **Tempo de resposta**: `count=7` com refs detalhadas pode passar de 25s. Streaming opcional na Fase 5 P2 — por enquanto, loader bem visível.
- **Custo Gemini**: cada `/forge` consome ~3k tokens entrada + 6k saída. Aplicar hard cap de 5 chamadas/sessão/usuário; soft warning a partir de 3.
- **MongoDB sem migrations versionadas**: documentar estado anterior em `migration_notes.md` para rollback (`db.scholar_sessions.updateMany({}, {$unset:{suggestions:""}})`).
- **Hydration**: filtros locais usam `useState` + `useMemo` — atenção a `key` única por `suggestion.id`.
- **Engine offline**: degradar graciosamente. Mostrar card `"Forge offline — rode suggestion-forge na porta 8003"` em vez de erro genérico. Manter Insights e References funcionais.

---

## 5. VERIFICAÇÃO FINAL (OBRIGATÓRIO)

```bash
# 1. Tipagem + lint
npx tsc --noEmit
npm run lint

# 2. Testes Python
cd suggestion-forge && python -m pytest -v && cd ..

# 3. Engine viva
curl -s http://localhost:8003/health | jq
curl -s -X POST http://localhost:8003/forge \
  -H 'Content-Type: application/json' \
  -d @suggestion-forge/tests/fixtures/sample_request.json | jq '.suggestions | length'

# 4. Build Next
npm run build

# 5. Manual E2E
# - Workspace Omega NÃO mostra mais "Arquivos" nem "Lacunas / RQ"
# - Aba "Sugestão" aparece com ícone Sparkles
# - Após uma pesquisa com 5+ refs, sugestões aparecem em ≤ 30s
# - Gauges respondem a filtro de tier
# - "↻ Forjar mais" gera propostas distintas (sem repetir títulos)
# - Botão "Iniciar mini-chat" cria PastResearchChat (se feature flag ativa)
```

**Relatório final esperado** (formato `CLAUDE.md`):

```text
Conclusion:
What I changed:
  - Novo serviço FastAPI: suggestion-forge/ (porta 8003)
  - Novos tipos em lib/scholar/types.ts: Suggestion, SuggestionAxes, SuggestionDesdobramento, QualityTier, GapType
  - Nova rota: app/api/ai/suggestion-forge/route.ts
  - Novo módulo UI: app/workstation/student/omega/modules/SuggestionForgeModule.tsx
  - OmegaScholarWorkspace.tsx: removidas abas Arquivos e Lacunas/RQ; adicionada Sugestão
  - OmegaScholarContext.tsx: estendido com suggestions, loadingSuggestions, fetchSuggestions
  - prisma/schema.prisma: ScholarSession.suggestions Json? adicionado
  - DELETED: app/workstation/student/omega/modules/FilesModule.tsx, GapsModule.tsx
What I checked:
  - pytest 12/12 verde
  - tsc/lint/build limpos
  - smoke E2E manual em 3 sessões reais (count=3, 5, 7)
  - classifier nunca emite "excepcional" violando regras de sanidade (10k seeds)
  - persistência em Mongo verificada via mongosh
Risks / limits:
  - Custo Gemini ainda não tem hard cap distribuído (P2)
  - Cache Redis pendente (P2)
  - Fuchsia-400 é único desvio de paleta — registrar em design_system.md
Next step:
  - Habilitar streaming progressivo em /forge (P2)
  - Indexar sugestões aceitas no KB Obsidian se repo bound
  - Diff entre forjas consecutivas
```

---

## 6. INTEGRAÇÃO COM OMEGA SCHOLAR (NÃO PULAR)

A engine `suggestion-forge` é **subordinada** ao Omega Scholar — não age sozinha. Regras:

1. **System prompt** da chamada Gemini começa com extração do `OMEGA_SCHOLAR.md §1` (identidade) + `§4.2 F3-F5` (loop) + `§6` (regras de citação) + `research-engine/prompts.py` (vocabulário de lacunas). Cache em memória da engine, invalidar a cada 60s.
2. Toda `Suggestion` deve ter `desdobramentos.evidence_refs` apontando para refs reais — rejeitar e re-prompt se vier vazio quando `references.length ≥ 5`.
3. **Sub-agente paralelo opcional** (Fase 6 P2): para `count ≥ 5`, dividir em chunks de 2-3 propostas e processar em paralelo via `asyncio.gather` — depois consolidar e deduplicar por similaridade de título (Levenshtein > 0.7).
4. Se a forja produzir um `gap_type` que já está esgotado nas refs (ex: 8 refs já são `interdisciplinar`), o LLM deve marcar `coverage_summary` com aviso explícito.

Isso garante que o agente da forja **é** Omega Scholar usando uma capability nova, não um agente concorrente.

---

## 7. SUPERPOWERS DISPONÍVEIS — USE NA ORDEM

1. **`planning-with-files`** — materialize `task_plan.md`, `engine_spec.md`, `migration_notes.md` antes de qualquer código.
2. **`engineering:system-design`** — desenhe o ADR do `suggestion-forge` (porta 8003, contrato, dependências) antes do scaffold.
3. **`data:statistical-analysis`** — valide a fórmula de `quality_tier` com simulação Monte Carlo (10k cenários) para garantir distribuição razoável dos tiers.
4. **`engineering:code-review`** — auto-review antes de marcar cada fase como concluída.
5. **`engineering:debug`** — para travamentos de stream NDJSON ou JSON malformado do Gemini.
6. **`obsidian-project-kb-core`** — se o repo estiver bound, registrar a engine no hub canônico.

---

## 8. REGRAS DE OURO

- **Conclusão primeiro** em qualquer resposta intermediária.
- **Caminhos absolutos** ao reportar arquivos.
- **Não remover** `gaps` nem `files` do `ScholarSession` — apenas parar de exibi-los. Isso preserva auditoria.
- **Não confiar** só no LLM para o tier — `classifier.py` é a fonte de verdade.
- **Não inventar** vocabulário — reutilizar `research-engine/prompts.py` para tipos de lacuna.
- **Não quebrar** `ReferencesModule` nem `InsightsModule` — eles convivem com a nova aba.
- **Pergunte** se encontrar ambiguidade real (ex: comportamento em mobile do gauge não foi especificado — peça).
- **Pare** se `pytest` ou `npm run build` falhar. Não empurre commits quebrados.
- **Reporte** exatamente: arquivos criados, alterados, removidos, comandos executados e suas saídas.

---

**Fim do prompt. Comece pela Fase 0 e materialize o ADR antes de codar.**
