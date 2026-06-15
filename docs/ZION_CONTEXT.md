# ZION_CONTEXT — mapa de features e agentes da Zaeon OS

> Fonte de verdade do contexto que orienta a **Zion** (agente orquestrador) a
> entender a plataforma inteira sem se perder. Mantido à mão; também serve de base
> para o admin alimentar contexto dinâmico (ver docs/ZION_ADMIN_CONTEXT_FEED_PLAN.md).
>
> Atualizado: 2026-06-15.

## O que é a Zaeon OS
Sistema operacional de pesquisa acadêmica: salas temáticas, agentes de IA e
ferramentas para estudar, pesquisar, escrever (ABNT) e programar — com onboarding
por convite e plano Plus grátis para estudantes.

## IA
- **Única IA do app: Gemini (Vertex AI), tier Flash** — `lib/ai/model.ts`
  (`GEMINI_MODEL_FLASH`, default `gemini-2.5-flash`; troca por env `GEMINI_MODEL`).
- Backbone de chat: `POST /api/ai/chat` (multimodal, function-calling p/ agenda).
  Texto leve: `lib/ai/gemini-text.ts` (`geminiText`). Roteador: `lib/ai/router.ts`
  (Gemini ativo; Sonnet/Opus travados). Groq/OpenAI foram removidos do caminho ativo.

## Agentes (personas em `app/api/ai/chat/route.ts`)
| Agente | Papel | Onde |
|---|---|---|
| **Zion** | Orquestrador central: conhece todos os agentes/salas, faz onboarding e guia o usuário. | Ícone ⟁ global (FAB) |
| **Aura** | IA principal de pesquisa: dialoga sobre PDFs, orquestra, sugere pautas/citações. | Sala de Pesquisa |
| **Scholar** | Citações ABNT (trechos verbatim + referências). | Pesquisa |
| **Examiner** | Cria perguntas a partir do PDF para testar o usuário. | Pesquisa |
| **Zenita / Zaeon Core Active** | Agente da Sala de Aulas: agenda acadêmica (add/edit aulas via tool `update_schedule`), conecta aulas↔pesquisas↔tarefas. | Sala de Aulas/Estudos |
| **ABNT Structurer** | Estrutura texto bruto nas seções ABNT (saída JSON). | Documentos |
| **Zaeon Code** | IDE agêntica no navegador: planeja→escreve arquivos→roda→corrige→commita no GitHub. Memória de projeto, checklist, guardrails. | Sala Projetos |

## Salas / módulos (research-lab, deep-link `?tab=`)
- **Pesquisa** (`?tab=pesquisa`) — barra de pesquisa + Aura.
- **Sala de Estudos** (`?tab=sala-de-estudos`) — estudos/aulas.
- **Projetos / Zaeon Code** (`?tab=projetos`) — IDE agêntica. Gate: Computação/áreas correlatas ou admin (`lib/projects/access.ts`).
- **Pesquisas salvas** (`?tab=pesquisas`), **Lounge** (`?tab=lounge`), **Perfil** (`?tab=profile`).
- **Plugin Store** (`/plugin-store`) — módulos; Zaeon Code em destaque (gating na ativação).
- **Modo Founder** (`/workstation/admin`) — painel admin (só super admin).

## Perfis / acesso
- **Super admin (founder):** allowlist + role (`lib/auth/roles.ts`): `zaeondao@gmail.com`,
  `donmartinez@aluno.unilab.edu.br`. Vê o "Modo Founder"; pode tudo (inclusive Zaeon Code).
- **Gate do Zaeon Code:** ligado por padrão; só Computação/correlatas ou super admin
  (`PROJECTS_COURSE_GATE=off` libera todos).

## Onboarding (convite)
- Card-first (`components/convite/InviteCard.tsx`): valida código → dados (nome, idade,
  **curso da lista** `constants/courses.ts`, papel, **universidade** `constants/universities.ts`
  — federais+estaduais+IFs) → comprovação de estudante → finaliza com **Google**.
- IA conversacional foi removida do convite (card-only).
- Convite vive no **menu inicial** (`MenuNavigation`), não na navbar.

## Plano Plus (grátis para estudante)
- Planos: `free` | `plus` (`lib/plans.ts`, 30 dias). Plus é grátis para estudante de
  **qualquer faculdade**. Comprovação: (a) conta Google de estudante → fast-track no
  `finalizar`; (b) **comprovante de matrícula** (upload) → fila do admin → aprovação concede Plus.

## Fila do admin (submissões)
- `GET /api/admin` lista os usuários (kycStatus pending/verified/rejected, curso,
  instituição, comprovante). Exibido no **Node Queue** (`ProfileModule`, aba *profiles*):
  aprovar ("Mint Access" = concede Plus), rejeitar, purgar. PATCH/DELETE gated por admin.

## Zaeon convoca agentes (summon) — via chat
A Zaeon (chat, `agent:"zaeon"`) tem a ferramenta `summon_agent` (function-calling) e age
em nome do usuário conforme a habilidade pedida:

| skill | habilidade | agente/sala | rota |
|---|---|---|---|
| `study` | estudar um assunto | Examiner · Sala de Estudos | `/research-lab?tab=sala-de-estudos` |
| `research` | buscar/ler pesquisa | Aura · Pesquisa | `/research-lab?tab=pesquisa` |
| `write` | escrever texto/ABNT | Redatora ABNT · Pesquisa | `/research-lab?tab=pesquisa` |
| `code` | programar | Zaeon Code · Projetos | `/research-lab?tab=projetos` |

O backend devolve `{ summon: { skill, topic, agent, route, cta } }`; o chat
(`LoungeChatWidget`) renderiza um card de handoff com botão que leva à sala (o `topic`
vai como `&q=`). Mapa em `app/api/ai/chat/route.ts` (SUMMON_MAP).

## Modo "pensamento profundo" (opcional)
`POST /api/ai/deepthink` usa **Gemini Pro** em CHUNKS orquestrados pelo cliente para caber
no limite (~10s/função): `step:"plan"` (raciocínio curto) → `step:"answer"` (resposta final
seguindo o plano). Toggle "Pensar mais a fundo" no chat. O default segue **Flash**.

## Convenção visual
- Liquid glass; **paleta azul→ciano da Zaeon** (`#0ea5e9`→`#22d3ee`); roxo reduzido.
- Sinais: roxo=processando, ciano=conectado/estável, vermelho=erro, verde=pronto.
- Ícone característico: triângulo **⟁** (barra de pesquisa e, agora, o FAB da Zion).
