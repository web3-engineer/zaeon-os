# Handoff LOTE 3 — Sala de Pesquisa: PDF da biblioteca, "Minhas coisas", exportar e motor ABNT

> Para o **Claude Code**. **NÃO é o mesmo lote que outro agente já está mexendo**
> (Aulas/Onboarding/`docs/AJUSTES_ONBOARDING_E_SALAS_AGENT.md`). Este é independente —
> trabalhe em **branch própria** (ex.: `feat/pesquisa-lote3`) pra não colidir.
> Tudo já foi investigado: cada item tem **causa-raiz (arquivo:linha)** + **rota de solução**.
> Confirme os trechos antes de editar (linhas podem ter deslocado).

## Regras DURAS (idem aos outros lotes)
- **Git:** branch + PR. Nunca `git add -A`. Push direto na `main` trava (proxy ISP). Sem
  commit/push com credenciais do sandbox — se travar, deixe pronto e avise o Martinez.
- **Sem segredos** em git/chat. **Sem SSH na VPS.**
- **Escopo cirúrgico.** macOS sem `python` (use `python3`).
- **Verificação ao fim:** `npx tsc --noEmit` (+ `npx vitest run` se rápido). Conserte só erros novos.
- Reuse o que já existe: `constants/universities.ts`, `components/onboard/UniversityModal.tsx`,
  `lib/voice/ttsController.ts`.

---

## 11. BUG — PDFs salvos na biblioteca falham ao abrir no painel
**Sintoma:** muitos PDFs salvos na biblioteca não abrem quando o usuário tenta lê-los no painel.
**Fluxo:** `app/research-lab/PdfViewer.tsx:27-29` — se `pdfUrl` é http(s), o viewer carrega via
proxy `/api/ai/scholar/pdf?url=...`; senão usa a URL direta.

**Causa-raiz (principal):** o proxy `app/api/ai/scholar/pdf/route.ts:26-36` só autoriza a URL se
ela existir no campo **`references`** de alguma `ScholarSession` do usuário
(`select: { references: true }`). Mas no schema (`prisma/schema.prisma:411-412`):
- `references` = papers VERIFICADOS (aba Referências);
- `results` = TODOS os descobertos (aba Resultados).

O botão "Salvar na biblioteca" aparece **nas duas abas**. PDF salvo a partir de **Resultados**
tem `pdfUrl` só em `results` → o proxy responde **403 Forbidden** → pdf.js falha. Como Resultados
é a maioria, "muitos" falham.

**Causas secundárias:**
- A biblioteca vive em `localStorage` (`lib/useLibraryFiles.ts`, key `zaeon.libraryFiles`) e é
  permanente; o allowlist do proxy depende de `ScholarSession` no banco (take 20, podem rotacionar)
  → URL salva há tempo deixa de ser autorizada → 403.
- Uploads viram `blob:` URLs, que **morrem ao recarregar** (o `read()` do `useLibraryFiles:41`
  descarta `blob:`), então uploads "somem" entre sessões.

**Rota de solução:**
1. **Fix imediato (mata o grosso):** no proxy, autorizar a URL se ela estiver em **`references`
   OU `results`**. Trocar `select: { references: true }` por
   `select: { references: true, results: true }` e a checagem `allowed` para varrer os dois arrays
   (`[...(s.references||[]), ...(s.results||[])]`).
2. **Robustez (recomendado):** desacoplar a biblioteca do allowlist de sessões. Opção A: persistir
   a biblioteca no servidor (model `LibraryFile` por usuário) e autorizar o proxy por essa tabela.
   Opção B (mais simples): como o usuário está autenticado e o `isSafePublicHttpUrl` (SSRF guard,
   `lib/scholar/ssrf.ts`) já impede host privado, **relaxar** o allowlist para aceitar qualquer
   `pdfUrl` http(s) público de um usuário logado (mantendo o SSRF guard como proteção anti-abuso).
   Decida com o Martinez; se for rápido, faça a Opção B + mantenha o fix #1.
3. **Uploads (`blob:`):** ao subir um PDF, em vez de guardar `blob:` (que morre), salve como
   `data:` URL (base64) **ou** suba pro storage e guarde a URL — assim o upload persiste. (Cheque
   onde o upload cria o `pdfUrl` antes de salvar via `useLibraryFiles.save`.)
4. **UX de erro:** quando o proxy falhar (403/502), a mensagem em `PdfViewer` (`loadError`) deve
   dizer algo acionável ("não consegui reabrir este arquivo — talvez a fonte tenha saído do ar;
   baixe de novo"), em vez de genérico.

---

## 12. BUG — "Minhas coisas" salva pesquisas FANTASMAS e não salva o trabalho real
**Sintoma:** em "Minhas coisas" (painel 📁 da Sala de Pesquisa) aparecem pesquisas fantasmas
vindas da Sala de Estudos, e **não** aparece a pesquisa que o usuário realmente iniciou/escreveu.

**Causa-raiz (estrutural):**
- "Minhas coisas" lista `GET /api/ai/scholar/sessions` → **`ScholarSession`**
  (`app/research-lab/page.tsx:780-799`). Esses registros são criados a **cada busca** (inclusive
  buscas iniciadas na Sala de Estudos) → aparecem como "Pesquisa sem título" = **os fantasmas**.
- O trabalho real (título + texto do editor) é salvo por `handleSaveWorkspace`
  (`page.tsx:2018-2045`) em `POST /api/workspace` → **`UserSpaceData.workTitle/workContent`**
  (`app/api/workspace/route.ts`), que é um **slot ÚNICO por usuário** (upsert), **não** uma lista —
  e **não** é o que "Minhas coisas" lê. Por isso some.

**Comportamento desejado (do usuário):**
- pesquisa **iniciada** → salva em Minhas coisas;
- **título** colocado → fica salvo (com o título);
- **escreveu algo** no painel sem título → salvo como **"Pesquisa sem título"**.

**Rota de solução (criar um conceito real de "Trabalho"):**
1. **Modelo novo** `ResearchWork` no `prisma/schema.prisma`:
   `id, userId (@db.ObjectId, index), title String?, content String?, workType String?, createdAt,
   updatedAt @updatedAt`. Rodar `prisma generate` (roda no build; cuidado com TS excess-property:
   monte o objeto `data` numa `const` separada, não inline).
2. **Rotas** `app/api/research-works/route.ts`:
   - `GET` → lista os works do usuário (id, title || "Pesquisa sem título", updatedAt), ordenado por
     updatedAt desc.
   - `POST` (upsert) → cria/atualiza um work por `id`; cria com título vazio quando a pesquisa é
     iniciada; atualiza title/content conforme muda.
   - `DELETE ?id=` → remove (só do dono).
3. **Front (`page.tsx`)**:
   - Trocar a fonte de `sessions` (Minhas coisas) de `/api/ai/scholar/sessions` para
     `/api/research-works`. (As `ScholarSession` continuam sendo o **histórico de buscas**, que
     pode virar outra aba/seção, mas **não** "Minhas coisas".)
   - **Autosave inteligente** do work atual (debounce ~1s):
     - ao **iniciar** uma pesquisa (gerar pesquisa / `zaeon:research:newdoc`) → cria um work (sem
       título) e guarda o `workId` atual;
     - ao mudar `docTitle` → `POST` com title;
     - ao mudar `docContent` (não vazio) → `POST` com content; se sem título, fica "Pesquisa sem título".
   - `onOpenSession`/`handleNewWork` passam a operar sobre `ResearchWork` (abrir = carregar
     title+content no editor; novo = cria work novo e limpa o editor).
4. **Não poluir:** garantir que abrir/usar a Sala de Estudos **não** cria `ResearchWork` — só a
   ação de pesquisa/escrita na Sala de Pesquisa cria. (Os fantasmas eram ScholarSession; ao trocar
   a fonte da lista, eles somem de "Minhas coisas".)

> Se preferir não criar modelo agora (escopo), o **mínimo viável**: filtrar a lista de
> `/api/ai/scholar/sessions` para esconder sessões sem trabalho associado, e migrar o save do
> trabalho pra uma lista — mas o caminho limpo é o `ResearchWork`. Alinhe com o Martinez se for
> cortar escopo.

---

## 13. Modal de exportar documento — menos "ABNT", bonito/legível, instituição real
**Arquivo:** `app/research-lab/page.tsx`, modal "SALVAR & EXPORTAR ABNT" (~2808–3130) + estados
`abntMeta`/`abntStep` (~881–895). (Bônus: `app/research-lab/MetadataModal.tsx` tem o mesmo vício
de legibilidade — texto `text-white/40` só funciona no escuro.)

**O que mudar:**
1. **Reduzir o termo "ABNT".** Hoje ele aparece em excesso: título "Exportar com ABNT" (2896),
   "formatando conforme ABNT NBR 14724:2011" (2881/3063), "Salvar na Nuvem (sem formatação ABNT)"
   (3022), "Formatação ABNT (NBR 14724)" (3107). Trocar por linguagem amigável: ex. título
   **"Exportar seu trabalho"**, subtítulo **"Formatação acadêmica automática"**, e deixar a menção
   à norma **uma vez só**, discreta (ex.: um selo "padrão acadêmico (NBR 14724)"). "Salvar na
   Nuvem (sem formatação ABNT)" → "Salvar rascunho (sem formatar)".
2. **Bonito e destacado, legível nos 2 temas.** O momento de exportar deve ser um "momentão":
   - matar textos cinza-claro ilegíveis: `text-slate-400`/`text-slate-500` sem par dark viram
     `text-slate-600 dark:text-slate-300` (ou mais forte) em **todos** os labels, resumos e dicas
     do modal. Garantir contraste no claro **e** no escuro.
   - dar destaque ao CTA final (gradiente Zaeon violeta→ciano, sombra), ícone, título grande.
   - revisar o "Resumo dos metadados" (3067-3101) e o painel "Formatação" (3104+): hoje muito
     `text-slate-500` → subir contraste.
3. **Módulo de instituições reais (não depender do aluno digitar certo).** O campo "Instituição"
   (2922-2932) é input livre. **Reusar `components/onboard/UniversityModal.tsx`** (já tem busca em
   `BRAZILIAN_FEDERAL_UNIVERSITIES` de `constants/universities.ts`): trocar o input por um seletor
   com busca (autocomplete) que grava `abntMeta.institution` a partir da lista; permitir "outra"
   como fallback manual. (Se `UniversityModal` for modal-cheio demais, extraia o autocomplete num
   componentinho reutilizável `InstitutionPicker` baseado nele.)
4. **Placeholders em branco.** Em textos/placeholders de exemplo:
   - Cidade (2967): `placeholder="São Paulo"` → **`placeholder=""`** (em branco).
   - Instituição (2930): `placeholder="Universidade Federal..."` → **em branco** (ou só "Busque sua
     instituição" se virar autocomplete). Nada de cidade/instituição de exemplo "chumbada".
   - Conferir o resto do modal/`abntTemplate`/exemplos por outras menções a "São Paulo" e zerá-las.

---

## 14. Verificar se o motor ABNT está LIGADO em produção
**Sintoma:** ao exportar, apareceu que o serviço estava **desligado**.
**Causa-raiz:** `app/api/documents/abnt-export/route.ts:328` chama `${ABNT_SERVICE_URL}/format`;
se inacessível, retorna **503** "Serviço ABNT indisponível". Em prod, `ABNT_SERVICE_URL` =
`http://abnt-service:8001` (definido no `docker-compose.beta.yml`, env do `web`). O serviço roda no
container `abnt-service` (FastAPI + LibreOffice).

**Problema de observabilidade:** no `docker-compose.beta.yml` o `abnt-service` **não tem
`healthcheck`** (diferente do `web`), então o `depends_on` não garante que ele subiu de fato, e não
há sinal de prod de que caiu.

**Rota de solução (o que dá pra fazer SEM SSH):**
1. **Healthcheck no compose** para o `abnt-service` (`docker-compose.beta.yml`): adicionar
   `healthcheck` batendo num endpoint leve do FastAPI (ex.: `GET /health` ou `/`), com
   `interval/timeout/retries/start_period`. Conferir no `abnt-service/` (main FastAPI) se existe
   rota de health; se não, **adicionar** uma (`@app.get("/health")` retornando `{ok:true}`). Fazer
   o `web` depender de `condition: service_healthy`.
2. **Status visível em prod:** estender `/api/health` (ou criar `/api/health/abnt`) para fazer um
   ping em `${ABNT_SERVICE_URL}/health` e reportar up/down — assim dá pra ver de fora se o motor
   está vivo.
3. **Mensagem do usuário:** o 503 atual fala "rode em localhost:8001" — em prod isso confunde.
   Trocar para "O formatador está reiniciando, tente em instantes." (sem citar localhost).
4. **Sinalizar ao Martinez (não dá pra SSH daqui):** depois do merge/redeploy, ele deve conferir
   na VPS `docker compose -f docker-compose.beta.yml ps` / `logs abnt-service` se o container está
   `Up`/healthy; se estiver caído por RAM/crash de LibreOffice, reiniciar
   (`docker compose -f docker-compose.beta.yml up -d abnt-service`). Deixe isso escrito no PR.

---

# Verificação final
1. `npx tsc --noEmit` — zero erros novos (atenção ao `prisma generate` no build se criar
   `ResearchWork`: monte `data` em `const` separada pra evitar excess-property check do TS).
2. Smoke manual (descreva no PR):
   - Salvar um PDF da aba **Resultados** e reabrir no painel → abre (não dá 403).
   - Iniciar pesquisa → aparece em "Minhas coisas"; pôr título → atualiza; escrever sem título →
     "Pesquisa sem título"; **não** aparecem fantasmas da Sala de Estudos.
   - Modal de exportar: pouco "ABNT", legível no claro e no escuro, instituição por busca,
     placeholders de cidade/instituição em branco.
   - `/api/health` (ou `/api/health/abnt`) reporta status do motor ABNT.
3. **Git:** branch `feat/pesquisa-lote3` + PR. Nunca `git add -A`. No corpo do PR, lembre o
   Martinez de checar o container `abnt-service` na VPS.

# Arquivos que você vai tocar
- `app/api/ai/scholar/pdf/route.ts` (item 11), `app/research-lab/PdfViewer.tsx` (msg de erro),
  possível `lib/useLibraryFiles.ts` / fluxo de upload (blob→data).
- `prisma/schema.prisma` + `app/api/research-works/route.ts` (novo) + `app/research-lab/page.tsx`
  (item 12).
- `app/research-lab/page.tsx` (modal export, item 13) + reuso de
  `components/onboard/UniversityModal.tsx` / `constants/universities.ts`
  (+ opcional `app/research-lab/MetadataModal.tsx` legibilidade).
- `docker-compose.beta.yml` + `abnt-service/` (health) + `app/api/health` (item 14) +
  `app/api/documents/abnt-export/route.ts` (mensagem 503).
