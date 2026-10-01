# Handoff — a Cartolina como MEMÓRIA do agente da Sala de Estudos (PR2)

> Objetivo central: **a memória do agente da Sala de Estudos É uma cartolina viva** (tema
> Caderno) que o aluno estuda DURANTE o chat. Cada conversa preenche/atualiza cards; o
> agente lê a cartolina como contexto; o aluno vê e manipula. Solo e, depois, em grupo.
>
> O que JÁ existe (feito nesta sessão — reaproveite, não reescreva):
> - **UI da cartolina:** `components/lounge/LoungeCartolina.tsx` (globo + aba puxável →
>   coworking; desktop infinito pan/zoom + drag; mobile quadro fixo). Já usada na rota
>   `/study-rooms/lounge` e na aba "lounge" do `/research-lab` (2a).
> - **Modelo + geração:** `lib/caderno/cartolina.ts` (`CartolinaCard`, `layoutCartolina`,
>   `cardsFromAura`, `gerarCartolina(topic, gen?)`) + testes `lib/caderno/cartolina.test.ts`.
> - **Rota de geração:** `POST /api/lounge/cartolina { topic } → { cards }` (Aura gera, sem
>   persistir). Reusa `geminiJson` (Vertex, `gemini-2.5-flash`).
> - Infra de background (BullMQ) e padrões de sessão (`ScholarSession`) — ver
>   `docs/BACKGROUND_JOBS_SALA_PESQUISA.md`.

## Escopo desta PR (a memória)
1. **Persistência.** Modelo Prisma `Cartolina` (um board por estudo/sala):
   ```prisma
   model Cartolina {
     id        String   @id @default(auto()) @map("_id") @db.ObjectId
     ownerId   String   @db.ObjectId
     surface   String   // "estudos" | "lounge"
     scopeId   String?  // thread/sala; agrupa a cartolina àquela conversa
     titulo    String   @default("Estudo")
     cards     Json     // CartolinaCard[] (inclui x,y,w,rot → posições persistem)
     createdAt DateTime @default(now())
     updatedAt DateTime @updatedAt
     @@index([ownerId, surface, scopeId, updatedAt])
   }
   ```
   `npx prisma generate` + `db push`. Rotas: `GET/POST/PATCH /api/cartolina` (dono via
   sessão; nunca confiar em id do cliente — padrão de `scholar/sessions/route.ts`).
   PATCH salva movimentação/edição de cards (debounce no cliente).

2. **Chat ⇄ cartolina (o coração).** Na Sala de Estudos, cada turno da Aura deve **fixar/
   atualizar cards** na cartolina daquele `scopeId` (nota do conceito explicado, pergunta
   gerada, exercício, prancha). Reaproveite o harness (`lib/agent/trajectory.ts`,
   `buildHarnessDeps`) e a saída estruturada (`@@STRUCTURED@@`) → mapeie os campos
   (`conceitos`, `evidencia`, `proximos_passos`, `artifacts`) em `CartolinaCard`s via
   `cardsFromAura`/um novo `cardsFromStructured`. O chat **não some**: ele é a caneta; a
   cartolina é a memória (base de layout já cravada: desktop docs fechada/amplo, mobile
   sem canvas — ver `docs/PLANO_MAPA_PROBABILISTICO_E_SALAS.md`).

3. **Agente LÊ a cartolina.** Injete um resumo da cartolina (títulos dos cards + estado)
   no contexto do harness (junto do `wakeUpContext` da memória), pra a Aura saber o que já
   foi estudado e o que falta — a "bússola". Isso conecta com o Mapa Probabilístico (PR2 do
   plano): a cartolina é a materialização visual dessa memória.

4. **Memória por região.** Cada card guarda `msgIds` (as mensagens que o geraram); tap no
   card abre a conversa daquela região. (Campo `msgIds?: string[]` em `CartolinaCard`.)

## Polish deferido (encaixe aqui ou em PRs próprias)
- **Globo real:** hoje a `LoungeCartolina` usa um globo SVG (com marcadores, sem texto).
  Trocar pelo globo R3F de `components/sub/LoungeEarth.tsx` (`<Canvas>`+`<Sphere>` +
  marcadores), extraído num `components/lounge/GloboFundo.tsx` **só com o globo e os pins**
  (sem o lobby/feed/texto). É three.js/R3F — lazy-load (`ssr:false`) e cuidar do bundle.
- **Prancha LLM→SVG (PR0 completa):** hoje a prancha usa um desenho fixo (ciclo da água).
  Implementar o compile real: a Aura descreve primitivas → `lib/harness/caderno/compile.ts`
  gera o SVG manuscrito de QUALQUER assunto; fallback = imagem (`/api/studio/image`).
  Ver PR0 em `docs/PLANO_MAPA_PROBABILISTICO_E_SALAS.md`.
- **Grupo/realtime (lounge):** vários alunos na mesma cartolina, cursores + comentários
  (PR5 do plano; Pusher já no projeto).

## Padrão-ouro (obrigatório)
- Testes vitest ≥80% nos arquivos novos (LLM/IO mockados, nunca Vertex real). Já há base em
  `lib/caderno/cartolina.test.ts` — estenda pro mapeamento chat→cards e pras rotas (auth/IDOR).
- `npx tsc --noEmit` limpo; rotas com `guard()` + sessão; flags off por padrão
  (`CARTOLINA_MEMORIA`); nada muda até ligar. Docs atualizados.

## Nota de ambiente
O chat de IA dá **404 em DEV** (credencial/permissão Vertex local — os NOMES de modelo
estão certos: `gemini-2.5-flash`/`gemini-2.5-pro`, projeto `zaeon-os`/`us-central1`). Em
**prod** funciona. Teste a geração/memória em prod ou com credencial Vertex válida no
`.env` local.

---
## Status — PR 1: persistência (feita)

**Flags (todas off por padrão — merge não muda nada):**
| Var | Onde | Efeito |
|---|---|---|
| `CARTOLINA_MEMORIA` | servidor | `1` liga `/api/cartolina*` (senão 404) |
| `NEXT_PUBLIC_CARTOLINA_MEMORIA` | cliente (build) | `1` faz o `LoungeCartolina` carregar/salvar o board real |
| `CARTOLINA_COWORK` | servidor | reservada p/ PR de compartilhar/comentar (ainda não usada) |

**Banco:** `Cartolina`, `CartolinaMembro`, `CartolinaComentario` (os 3 já no schema; membro/comentário só serão usados no PR de coworking). Rodar `npx prisma db push` no Atlas antes de ligar a flag (o deploy faz com `db_push=true`).

**Rotas:** `GET/POST /api/cartolina`, `GET/PATCH /api/cartolina/:id`. `userId` sempre da sessão; `guard()`; "sem acesso" = 404 (não vaza quais ids existem).

**Decisões que não estavam no handoff:**
- `PATCH` recebe **operações por card** (`{upsert, remove, titulo}`), não o array inteiro: dois colaboradores em cards diferentes não se apagam. Conflito no mesmo card = último a gravar vence, card inteiro.
- Controle otimista com `rev` no documento: escrita só vale se `rev` bater; senão relê e reaplica (5 tentativas, depois 409).
- Papel `dono` é derivado de `ownerId`, não gravado em `CartolinaMembro` (evita duplicata que poderia divergir).
- `POST` devolve o board existente da conversa se já houver (evita duplicata e custo de modelo); a UI manda `regenerar:true` ao apertar "gerar".

**Faltam:** chat→cartolina (`cardsFromStructured`) e cartolina→agente (bússola); `msgIds` já é aceito/validado no card. Compartilhar/convite/comentários. Globo R3F e prancha LLM→SVG.

## Status — PR 2: memória chat ⇄ cartolina (feita)
- **Chat → cartolina:** `cardsFromStructured(answer, existentes, msgId)` (`lib/cartolina/fromStructured.ts`) mapeia `conceitos`→nota, `evidencia`→nota "Evidência" (com a fonte na legenda), `proximos_passos`→pergunta, `work.sections`→nota, `artifacts`→prancha/vídeo. Ids **determinísticos pelo conteúdo**: o mesmo conceito em dois turnos é o mesmo card (acumula `msgIds`, não mexe na posição que o aluno arrumou). Até 8 cards por turno.
- **Cartolina → agente (bússola):** `bussola(cards)` vira um bloco curto (≤1200 chars) no `systemContext` do harness, ao lado do `wakeUpContext`: já estudado / em aberto / material criado.
- **Memória por região:** card com `msgIds` mostra "↩ ver na conversa"; o chat fecha a cartolina e ancora na resposta (`data-msg`).
- **Onde:** botão "Cartolina" no chat da Sala de Estudos (só com `NEXT_PUBLIC_CARTOLINA_MEMORIA=1`), board = a ABA ativa (`scopeId` = id da conversa). O cliente manda `agentContext.cartolinaScopeId`/`cartolinaMsgId`.
- **Sem fila de propósito:** o handoff pedia background pra escrita pesada, mas fixar o turno **não chama modelo** (só mapeia a resposta que já existe): é 1 leitura + 1 escrita, fire-and-forget, depois que a resposta já foi enviada. Pôr isso na fila seria latência e infra a mais sem ganho. A geração por tópico (`POST /api/cartolina`) é a parte pesada e segue síncrona como antes.
- **Limitação:** `msgIds` são ids do cliente (localStorage); em outro aparelho o "ver na conversa" cai no fim da conversa.
