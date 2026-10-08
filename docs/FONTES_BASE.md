# FONTES-BASE — código-fonte por feature (bill of materials)

> Mapa definitivo: **cada feature da Zaeon → o(s) código(s)-fonte base**. Legenda de status:
> **ADOTAR** = construímos em cima / portamos o padrão · **REFERÊNCIA** = roubamos só o mecanismo, não o código
> · **DADOS** = API/fonte de fatos · **⚠️** = alerta de licença. Regra-mãe: rouba-se o mecanismo,
> implementa-se nativo (Next/Gemini único) — como fizemos com o MemPalace. Compilado 2026 (Fable).

---

## 1. Harness — o motor (laço tipado)
| Repo | Licença | O que usamos | Status |
|---|---|---|---|
| `ai-boost/awesome-harness-engineering` | lista (MIT-ish) | laço ReAct, reasoning-sandwich, middleware/guardrails, deny-by-default | ADOTAR (padrão) |
| `SakanaAI/AI-Scientist` (+v2) | Apache-2.0 | pipeline por estágios + crítico/reflexão; v2 = podar nó "buggy" | ADOTAR (padrão) |
| `langchain-ai/langgraph` | MIT | estado tipado + checkpoint/retry numa camada | REFERÊNCIA |
| `deepseek-ai/deepseek-harness` | MIT | **log-as-context** (contexto = projeção de log append-only) + hooks `pre-step`/`turn-stopping` | REFERÊNCIA (refinamento) |
| `smolagents` · `OpenHands` | Apache-2.0 · MIT | **error-as-observation** (falha volta ao modelo como observação) | REFERÊNCIA |
| `SakanaAI/ShinkaEvolve` | Apache-2.0 | best-of-N com crítico como fitness (modo Max) | REFERÊNCIA |

## 2. Memória (L3 — contexto por usuário/tópico)
| Repo | Licença | O que usamos | Status |
|---|---|---|---|
| `MemPalace` | OSS | esquema verbatim wing/room/drawer + recall barato por embedding | ADOTAR (padrão, nativo Mongo Atlas) |
| MongoDB **$rankFusion** (Atlas 8.1+) | produto | recall híbrido nativo (vetor + texto, RRF) | ADOTAR |
| `mem0` · `Letta/MemGPT` · `Zep/Graphiti` | Apache-2.0 | curadoria ADD/SUPERSEDE/NOOP · perfil pinado · invalidar-não-deletar | REFERÊNCIA |
| PubChem embeddings via `gemini-embedding-001` | API | embeddings (1536) | DADOS |

## 3. Crítico / qualidade (examiner)
| Repo | Licença | O que usamos | Status |
|---|---|---|---|
| K-Dense `scientific-writer` (**ScholarEval**) | MIT | rubrica 8 dims + soundness/contribution → `ExaminerVerdict` | ADOTAR (padrão) |
| K-Dense `science-superpowers` | MIT | pré-registro, red-team, verify-before-claiming | ADOTAR (conteúdo/markdown) |
| `ai4s-research/open-science` | MIT | provenance + grading de evidência 4 níveis | ADOTAR (padrão) |

## 4. Artefatos generativos inline (a "geração de UI")
| Repo | Licença | O que usamos | Status |
|---|---|---|---|
| `vercel/ai` (AI SDK) | Apache-2.0 | **base preferida**: modelo emite → componente inline (via Gemini function-calling + registry) | ADOTAR (padrão; lib opcional) |
| `tambo-ai/tambo` | MIT | referência de API do registry tipado (⚠️ tem backend próprio — não acoplar) | REFERÊNCIA |
| `StudioArtifactViews` (nosso) | — | o registry de viewers **já existe** | ADOTAR (in-house) |

## 5. Molécula 3D + viewers ricos
| Repo | Licença | O que usamos | Status |
|---|---|---|---|
| `3dmol/3Dmol.js` | **BSD-3** | render 3D de molécula no navegador (single-file CDN) | ADOTAR |
| **PubChem PUG-REST** · **RCSB PDB** | API pública | estrutura molécula/proteína por nome (SDF/PDB) | DADOS (proxy server-side) |
| Mermaid · Chart.js · KaTeX · React Flow | MIT | diagrama · gráfico · fórmula · árvore | ADOTAR (libs) |

## 6. Skills (marketplace + runtime)
| Repo | Licença | O que usamos | Status |
|---|---|---|---|
| **agentskills.io** (spec) | aberto (Anthropic) | formato `SKILL.md` (campos, progressive disclosure, validação) | ADOTAR (padrão) |
| K-Dense `scientific-agent-skills` | MIT | catálogo (paper-lookup, database-lookup, citation…) | ADOTAR (catálogo) |
| `NousResearch/hermes-agent` | MIT | skill auto-autorada a partir de trajetória aprovada | REFERÊNCIA |

## 7. Conectores (MCP)
| Repo | Licença | O que usamos | Status |
|---|---|---|---|
| MCP spec + `@modelcontextprotocol/sdk` (TS) | MIT/aberto | cliente MCP (isolar handshake — RC 2026-07-28 breaking) | ADOTAR |
| `openags/paper-search-mcp` | MIT | arXiv/PubMed/bioRxiv (flagship literatura) | ADOTAR (conector) |
| `genomoncology/biomcp` | MIT | med/bio (PubMed/ClinicalTrials/variantes) | ADOTAR (conector) |
| `oksure/openalex-research-mcp` | MIT | OpenAlex (TS/npx — 1º smoke local) | ADOTAR (conector) |
| `modelcontextprotocol/servers` | MIT | fetch/filesystem/git oficiais | ADOTAR (utilitário) |
| `pvliesdonk/scholar-mcp` | MIT | Semantic Scholar (⚠️ experimental, ~2★) | REFERÊNCIA |

## 8. Camada agêntica — Tutores por domínio
| Repo | Licença | O que usamos | Status |
|---|---|---|---|
| K-Dense `scientific-agents` | MIT | 503 perfis `AGENTS.md` → persona/cérebro de cada tutor | ADOTAR (adaptar PT-BR) |
| (nossos) `StudentAgent`/§9 + `getRoomForCourse` | — | roster, persona por curso, gating | ADOTAR (in-house) |

## 9. Skill Tree (aprendizado gamificado, visível por tópico)
| Repo | Licença | O que usamos | Status |
|---|---|---|---|
| `24kchengYe/human-skill-tree` | **⚠️ app AGPL-3.0** · skills MIT/AGPL | estrutura da árvore (fases 0-6, teoria/exp/prático), unlock por maestria, guardrails de learning-science (Socrático/repetição espaçada) | ADOTAR o **padrão** (⚠️ NÃO copiar código do app — AGPL; skills MIT ok) |
| React Flow | MIT | render da árvore | ADOTAR (lib) |
| `HKUDS/DeepTutor` | (verificar) | tutoria personalizada vitalícia p/ assuntos complexos (MCP) | REFERÊNCIA |
| (nosso) `User.skills Json` (RPG Ranks F-SS) | — | substrato de gamificação **já existe** | ADOTAR (in-house) |

## 10. Camada mestra / probatória (professores, doutorado)
| Repo | Licença | O que usamos | Status |
|---|---|---|---|
| `princeton-nlp/LM-Science-Tutor` (**TutorEval**) | MIT | motor de exame: LLM-juiz nota resposta vs key-points de especialista; open/closed-book | ADOTAR (padrão do exame) |
| (nosso) `examiner`/ScholarEval | — | o crítico elevado a `academicLevel: doutorado` | ADOTAR (in-house) |

---

## 11. Agente mensageiro — chip da ChipFlow via bridge Redis
| Repo | Licença | O que usamos | Status |
|---|---|---|---|
| `zenith-warmer` `app/bridge/{producer,shard}.py` + `whatsapp-adapter` `internal/bridge/contracts.go` | interno (Martinez) | envelope do Command/Event, `shard = id % NUM_SHARDS`, XADD com `v` JSON | ADOTAR (portado em `lib/chipflow/bridge-request.ts`) |
| `axtral-store` (FlowShot) `backend/core/bridge.py` | interno | modelo por-chamada: last_id ANTES do XADD + XREAD BLOCK até o terminal | REFERÊNCIA (`lib/chipflow/bridge.ts`) — **não** copiar o `payload.state` da presença (o adapter lê `presence`) nem o fallback pro `REDIS_URL` |
| `zenith-warmer` `app/api/routers/admin.py` (`chip-directory`) | interno | diretório read-only de chips elegíveis | DADOS (PR-W2) |

Os números de aquecimento (tiers, teto por maturidade, piso de 60 s, 463) entram nos PRs W3/W4 —
com o motivo registrado: custaram **73 chips em 25/08/2026** (`app/services/warm_speed.py`).

## 12. Gateway / chave única (Escritório v2, Fatia 1)
| Repo | Licença | O que usamos | Status |
|---|---|---|---|
| `BerriAI/litellm` (proxy) | MIT (core) | gateway OpenAI-compatible interno, virtual keys por agente com budget/TTL/allowlist, fallback | ADOTAR — gateway/virtual keys |

## 13. Esteira leve — pool grátis + Leitor/Executor (Escritório v2, Fatia 7)
| Fonte | Licença / termos | O que usamos | Status |
|---|---|---|---|
| `BerriAI/litellm` (proxy) | MIT (core) | grupos `zaeon-pool-*` com fallback entre provedores grátis, `model_info.id` → header `x-litellm-model-id` | ADOTAR (já na §12) |
| *Rule of Two* (Meta AI, 2025) | referência conceitual | quem lê input não confiável não tem credencial nem comunica para fora → Leitor (proxy sem segredo) × Executor (sem internet) | REFERÊNCIA — re-implementado (lib/chore, services/leitor-proxy) |
| *Lethal trifecta* (Simon Willison, 2025) | referência conceitual | dado não confiável + acesso sensível + saída externa = comprometido; quebrado antes de o conteúdo entrar (plan-then-execute) + sem imagem remota na saída | REFERÊNCIA |
| Google AI Studio (Gemini Flash-Lite, free tier) | termos lidos em 2026-10-07 — o free tier treina com o conteúdo | primário do pool, **conta dedicada**; só conteúdo público da web | USAR — uma conta por provedor |
| Cloudflare Workers AI | termos lidos em 2026-10-07 | fallback 1 do pool (`llama-3.1-8b-instruct`) | USAR — uma conta por provedor |
| Groq | termos lidos em 2026-10-07 | fallback 2 do pool (`openai/gpt-oss-20b`) | USAR — uma conta por provedor |
| Zhipu (GLM) | termos lidos em 2026-10-07 | comentado/off (provedor fora de BR/EUA; decisão de política) | OFF |

## Alertas de licença (ler antes de codar)
- **`human-skill-tree` (app) = AGPL-3.0** → copiar o código do app obrigaria abrir a Zaeon sob AGPL. **Só o padrão/estrutura + as `skills/` (MIT).** Nunca o código do app.
- **`tambo`** → funciona, mas roda o loop/backend dele → **não acoplar**; usar como referência de API. Base de UI generativa preferida = `vercel/ai` (Apache-2.0) ou nativo.
- **`deepseek-harness`** → developer preview com breaking changes → **estudar, não depender**.
- **DeepTutor** → confirmar licença antes de qualquer uso de código.

## Princípio único
Tudo acima é **mecanismo/padrão/dados** — o código de produção é **nativo Next + Gemini único**. Adotamos
libs de render (3Dmol/Mermaid/Chart.js/KaTeX/React Flow) e, opcionalmente, `vercel/ai` como camada fina.
Os "ADOTAR (padrão)" a gente re-implementa; os "REFERÊNCIA" a gente só consulta.
