# Handoff final — fechar o MVP (pro agente de integração)

> Contexto: esta sessão entregou várias features no branch **`feat/estudos-lounge-ux`**.
> O `git fetch/pull/push` trava na rede local (proxy do ISP come o protocolo git) e o branch
> divergiu no remoto — por isso 2 mudanças ficaram **só locais** (listadas abaixo). Você
> (agente) deve: (1) garantir essas 2 mudanças no branch, (2) integrar com o **PR #84
> (pdf-loader)**, (3) construir a fase final (voz no PDF + citação clicável). Tudo via
> branch + PR (NUNCA push direto no main; CI deploya no merge). Não aceitar token em chat.

## 1) O que já está no branch `feat/estudos-lounge-ux` (origin até `70ed676`)
Já no GitHub — só revisar/mergear:
- **Onboarding refeito** (`lib/onboarding/tour.ts`, `OnboardingGuide` global no `app/layout.tsx`,
  `MenuNavigation`, `research-lab/page.tsx`): tour começa no MENU; 1º passo foca SÓ o chat
  (`data-tour="chat-widget"`/`chat-flip` no `LoungeChatWidget`) com a IA se apresentando +
  flip; depois Estudos; prefill "história do Brasil" **re-disparado** (250/700/1400/2400ms);
  subabas destacam 1x → passo "salvar" (avança em `zaeon:savedCitations`) → "Gerar pesquisa".
  Card antigo "Conta verificada" removido; tour **auto-inicia 1x** pra quem tem `tourDone=false`.
- **Switch "Tutoriais ON/OFF"** nas Opções (só super admin) + `donmartinezcaiudoceu@gmail.com`
  na allowlist de super admin (`lib/auth/roles.ts`).
- **Convite** saiu do hero; vive só nas Opções.
- **Persistência da sala** (`research-lab/page.tsx`): volta na última aba; 1ª vez → Sala de Estudos.
- **Sala de Estudos**: menu→estudo deep-link (`?space=`), Play na Base gera estudo em Meus Estudos,
  bandejas do Lounge minimizadas, modo foco alinhado, Studio minimizado por padrão.
- **Plugins** (PT + imagem): `prisma Plugin.imageUrl`, `/api/plugins` aceita imageUrl, `PluginsModule`
  (admin) com campo de imagem, loja em PT, categoria Blockchain removida, card com capa.
- **Voz**: resumo por voz na Sala de Pesquisa com **karaokê INLINE** (`ResearchReadingView` dentro
  do painel, sem overlay flutuante) — `playVoice` liga/desliga `summaryRead`.
- **Citações**: fix do drag-and-drop (`onDragOver` sempre `preventDefault`).
- **Aba "Resultados"** (`app/api/ai/scholar/route.ts` persiste `results`; `prisma ScholarSession.results`;
  `app/workstation/student/omega/modules/ResultadosModule.tsx`; `OmegaScholarWorkspace`): lista TODOS
  os artigos achados (não só os citados), com salvar/links. Ordem: Referências/Resultados/Insights/Base.

## 2) Mudanças LOCAIS que NÃO subiram (RE-APLICAR no branch)
Estavam nos commits locais `5e45d80` e `307add8`:

**A. `docker-compose.beta.yml` — voice-engine 3g → 1g (libera ~2GB).** A voz padrão é Gemini-TTS
(Google/Vertex "Leda", nuvem). O Kokoro é lazy e não é chamado; o engine local é só fallback Piper.
Aplicar no bloco `voice-engine`:
```yaml
    environment:
      KOKORO_LANG: p
      ZAEON_TTS_DEFAULT: natural-br   # default Piper (Kokoro lazy, não infla RAM)
      HF_HOME: /app/.hf
    ...
    deploy:
      resources:
        limits: { memory: 1g }   # era 3g (Kokoro); agora só fallback Piper
```
E o comentário de orçamento no topo (já contando o pdf-loader do #84):
```
# Orçamento de RAM (limites): web 1.5g + voz 1g + abnt 1.2g + redis 0.38g + caddy 0.25g
#   + pdf-loader 0.896g ≈ 5.2g → folga ~2.8g em 8g.
```

**B. `docs/PDF_LOADER_AGENT.md`** — handoff antigo do pdf-loader (JÁ feito no #84). Pode ignorar/apagar.

## 3) Integração com o PR #84 (pdf-loader)
Único conflito esperado entre `feat/estudos-lounge-ux` e `feat/pdf-loader` é o
**`docker-compose.beta.yml`** (o bloco `voice-engine` que mudei e o bloco novo `pdf-loader` deles
ficam em seções diferentes — git deve auto-mesclar; o choque real é só o comentário de orçamento,
use o da seção 2A). `synthesize` é arquivo separado (`lib/scholar/synthesize.ts`), sem choque com o
meu `route.ts` (só adicionei `results`). Mergeie #84 e este branch no main; CI builda os 2 serviços.

## 4) Fase FINAL a construir (em cima do #84 já mergeado)
Os `blocks` com `bbox`+página e o `markdown` do pdf-loader habilitam:
- **Voz no PDF**: botão "Ouvir" no painel de leitura → lê o `markdown` estruturado com o karaokê
  (`lib/voice/ttsController.ts` `speakSequence` + `app/research-lab/ResearchReadingView.tsx`,
  destaque INLINE, sem overlay flutuante — mesmo padrão do resumo). A ordem de leitura correta do
  pdf-loader faz a voz sair certa.
- **Citação clicável**: usar `bbox`+página dos `blocks` pra "clique → vai à fonte no PDF" (plugar no
  `PdfViewer`/`ResearchReadingView`). Casa com as Citações ABNT já existentes.
- Verificar: `npx tsc --noEmit` (tolerar 1 erro pré-existente em `research-lab/page.tsx`), `npx vitest run`.
- Lembrete deploy: `prisma generate` roda no build (campos novos `imageUrl`/`results` já dependem disso).

## 5) Restrições
Segredos só em `.env`/VPS. Branch + PR (push direto no main trava por proxy). Apache 2.0 do
opendataloader mantido. Super admins: donmartinezcaiudoceu@gmail.com, donmartinez@aluno.unilab.edu.br.

---

## 6) HYBRID (OCR + fórmulas) — construir GATED e DESLIGADO por padrão

### Orçamento (LER ANTES) — não ligar always-on no 8 GB
Base atual (voz 1g + pdf-loader Fast 0.9g): web 1.5 + voz 1 + abnt 1.2 + redis 0.38 + caddy 0.25 +
pdf-loader 0.9 ≈ **5.2 GB**; folga ~2.8 GB (real ~2.2 GB com SO). O Hybrid troca o pdf-loader de
~0.9g por **~2.5–4 GB** (OCR + SmolVLM + tabelas + JVM) → pico **~6.7–8.4 GB de 8 GB**.
**Veredito: 8 GB NÃO comporta Hybrid sempre-ligado** (OOM / beta cai). Logo:
- **Construir agora, mas DESLIGADO** (`PDF_LOADER_HYBRID=0`, default). Não estoura prod.
- **Ligar quando:** (a) VPS → **16 GB** (recomendado, confortável), OU (b) sob demanda no 8 GB
  ciente do aperto (margem quase zero). NÃO deixar o container hybrid com `restart: unless-stopped`
  reservando 4g fixos no 8 GB.

### Arquitetura
- Manter o `pdf-loader` (Fast, 896m) como caminho PADRÃO e always-on.
- Adicionar um **container separado** `pdf-loader-hybrid` (o backend de IA do opendataloader,
  `opendataloader-pdf-hybrid`, ex.: porta 5002) com `profiles: ["hybrid"]` no compose → **só sobe
  quando o profile `hybrid` é ativado** (não no `up` normal). `deploy.resources.limits.memory: ~2.5g`.
- `web`: env `PDF_LOADER_HYBRID_URL=http://pdf-loader-hybrid:5002` e flag `PDF_LOADER_HYBRID=0`.

### Quando acionar (on-demand, não em todo PDF)
Disparar Hybrid SÓ se: PDF **escaneado** (sem camada de texto — detectável: extração Fast retorna
texto vazio/ínfimo), OU PDF **rico em fórmulas/tabelas complexas**, OU **opt-in** do usuário
("ler com OCR/fórmulas"). Senão, Fast. Mesma filosofia do deep-thinking (caro só quando precisa).

### Features do Hybrid (entregar)
OCR (PDF escaneado, 80+ idiomas) · **fórmulas → LaTeX** · tabelas complexas/sem borda (TEDS alto) ·
descrição de figuras/gráficos por IA (SmolVLM) — tudo realimentando o mesmo `{ markdown, blocks[bbox] }`,
então **voz no PDF e citação clicável (seção 4) funcionam igual**, só com conteúdo melhor.

### Verificação Hybrid
Build do container hybrid isolado; smoke com **1 PDF escaneado** (OCR sai texto) e **1 paper de
matemática** (fórmula vira LaTeX no markdown). Confirmar que com `PDF_LOADER_HYBRID=0` o sistema usa
Fast e o container hybrid **não sobe** (sem custo de RAM). Documentar no `docs/BETA_DEPLOY.md` como
ligar (profile `hybrid` + flag) e o requisito de RAM (≥16 GB recomendado).

## 7) Apêndice técnico — PdfViewer (pra voz no PDF + citação clicável da seção 4)
Levantado do `app/research-lab/PdfViewer.tsx` (250 linhas):
- Render é **pdf.js**: cada página vira `<div class="zaeon-pdf-page" data-page="N" style="position:relative">`
  com um `<canvas>` + camada de texto. O scroll é no `pagesRef` (`.flex-1.overflow-y-auto`).
- **Citação clicável:** pra ir à fonte, role até `[data-page="N"]` (`el.scrollIntoView`); pro realce,
  desenhe um overlay absoluto dentro do `pageDiv` convertendo o `bbox` do bloco pela escala do viewport
  (`page.getViewport({ scale: fit*zoom })` — o `bbox` do opendataloader é `[left,bottom,right,top]` em
  pts do PDF; mapear pra px multiplicando pela escala e invertendo o Y). Já existe `onCite` e `currentPage()`.
- **Voz no PDF:** põe o botão "🔊 Ouvir" na **barra superior** (onde está o zoom, ~linha 211) e renderiza
  o `ResearchReadingView` **inline** (`absolute inset-0` dentro do `relative` da raiz do PdfViewer, igual
  ao resumo) — NÃO overlay flutuante. Fonte do texto = `markdown` do pdf-loader (ordem certa); fallback
  = `extractPdfParagraphs` (pdf.js, já existe em `lib/scholar/pdf.ts`).
