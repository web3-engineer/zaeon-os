# App mobile (`/m`)

Chat de **coluna única** para o celular, no estilo dos apps do Claude/ChatGPT: quem está no telefone
não cai nas salas completas (sidebar, biblioteca, Studio, abas). Atrás de `NEXT_PUBLIC_MOBILE_UI`.

## Rotas
| Rota | O quê |
|---|---|
| `/m` | home: cartões **Estudos** / **Pesquisa** + conversas recentes |
| `/m/estudos` | chat com a Aura (`/api/ai/chat`, com o modo retomável da Fase 3 se `CHAT_BG=1`) + ações do Studio |
| `/m/pesquisa` | Sala de Pesquisa (`/api/ai/scholar`, em BG se `SCHOLAR_BG=1`) com referências |

`/m/layout.tsx` dá 404 com a flag desligada. Navbar e widget de chat do site se escondem em `/m`
(checam o pathname). Sem StarBackground/ParticleSystem/vídeo.

## Arquitetura: um núcleo de rede, duas telas
| Núcleo (sem React) | Desktop usa em | Mobile usa via |
|---|---|---|
| `lib/chat/auraClient.ts` | `StudyCoworkChat.send()` | `lib/chat/useAuraChat.ts` |
| `lib/scholar/scholarClient.ts` | `OmegaScholarContext` | `lib/chat/useScholar.ts` |
| `lib/studio/studioClient.ts` | `StudyCoworkChat.runStudioAction` | `MobileChat` (ações) |

Componentes: `components/mobile/` — `MobileChat`, `MobileComposer`, `MobileActionsSheet`,
`MobileHistory`, `BannerVersaoMobile`, `estilo.ts` (o mesmo vidro da navbar).

## Mobile ⇄ completo (nunca prender)
- Nas salas completas (`/research-lab`, `/workstation/*`), no celular, aparece um banner
  **"Abrir versão mobile"** (oferece, não força). "Continuar aqui" grava `zaeon:ui=full` e ele não volta.
- Em `/m`, "versão completa" grava `zaeon:ui=full` e leva à sala equivalente.
- A última aba (Estudos/Pesquisa) e as conversas ficam no `localStorage` (por aparelho).

## Funcionalidades
- Estudos: resposta estruturada compacta (`StructuredAnswerView`; tocar num conceito/próximo passo envia),
  markdown (`ChatMarkdown`), fase do harness enquanto pensa, **reengate** de turno pendente.
- Ações (sheet "+"): mapa mental, guia, FAQ, flashcards, imagem, podcast, molécula. Cartão
  "Gerando… você pode sair" e viewer compacto (`StudioBlock`, carregado sob demanda).
- Pesquisa: fase atual, resposta, até 10 referências com link; histórico de pesquisas no drawer.

## Fora de escopo (e por quê)
| Corte | Por quê |
|---|---|
| Sidebar de salas, biblioteca lateral, árvore de habilidades, cover-flow de agentes, mural, modo foco | é exatamente a densidade que o mobile existe pra evitar |
| Revista (`MagazineAnswerView`) | layout de página larga; no celular vira rolagem lateral |
| **Exportar ABNT** | o endpoint existe, mas exige a folha de rosto (autor, instituição, curso, cidade, ano) que o desktop coleta num modal; isso é um formulário, não "trivial" — fica pra uma PR própria |
| Anexar arquivo | upload + PDF no celular é um fluxo próprio (câmera/arquivos); não é trivial |
| Histórico de Estudos entre aparelhos | as conversas mobile são locais (L0); o L1 do servidor é por estudo, não por conversa mobile |

## Qualidade
- Alvos de toque ≥ 44px, foco visível, diálogos com `role=dialog`/`aria-modal`, Esc fecha, Tab preso
  no drawer, composer rotulado, `aria-live` nas respostas; `axe-core` sem violações nos testes
  (contraste desligado no jsdom, que não calcula cor real).
- Teclado não cobre o input: altura em `dvh` + composer `sticky` com `safe-area-inset-bottom`; campo
  em 16px (o iOS não dá zoom ao focar).
- Bundle: `/m/estudos` **113 kB** first load vs **330 kB** do `/research-lab` (34%). `StudioBlock`
  (3Dmol/áudio) é lazy; nada de framer-motion/recharts no caminho crítico.

## Ligar
`NEXT_PUBLIC_MOBILE_UI=1` (**valor de build**: precisa rebuild).

## Definition of Done (handoff Fase 3 + Mobile) — onde cada item foi feito
| Item | Onde | Status |
|---|---|---|
| `ChatTurn` no schema + `prisma generate`/`db push` documentado | PR 1 · `docs/BACKGROUND_JOBS_SALA_PESQUISA.md` | ✅ (o `db push` roda no deploy com `db_push=true`) |
| Chat de Estudos retomável: sai no meio, conclui no servidor, volta e vê | PR 2 | ✅ testado (unit/rota/hook); ciclo com Redis real **não** rodado |
| Fila `chat` na infra BullMQ; worker no mesmo container; reaper | PR 1 | ✅ boot real verificado (reaper + 2 workers) |
| `/m/estudos` e `/m/pesquisa` de coluna única, geração de artefato + poll | PR 4 | ✅ verificado em Chrome a 390px |
| Alternância mobile ⇄ completo, preferência persistida | PR 4 (cookie `zaeon:ui`) | ✅ |
| `npm run test` verde, cobertura ≥ 80% nos arquivos novos, `tsc` limpo | todos | ✅ por arquivo (PR 5) |
| Desktop intacto (regressão) | PR 3 (`OmegaScholarProvider` em jsdom) + builds | ✅ testes; clique manual no desktop **não** feito (sem Vertex local) |
| Tudo atrás de flag | `CHAT_BG`, `NEXT_PUBLIC_MOBILE_UI` (+ `SCHOLAR_WORKER`) | ✅ off por padrão |
| Sem segredos; rotas com sessão + rate-limit | `/api/ai/chat/turns*` | ✅ IDOR testado; erro cru nunca sai |

**Acessibilidade verificada em navegador real (PR 5):** axe-core com cálculo REAL de contraste no
Chrome headless, regras WCAG 2.0 A/AA + 2.1 AA + best-practice, nos dois temas, em 12 estados
(`/m`, `/m/estudos` com conversa, `/m/pesquisa`, sheet de ações aberto, drawer de histórico aberto):
**0 violações**. As 4 que o jsdom não via foram corrigidas: bolha do usuário no escuro (3,68:1 →
5,36:1), texto do drawer no escuro (4,23:1 → ~7:1), `<h1>` (só leitor de tela) e o composer
como landmark nomeado.
