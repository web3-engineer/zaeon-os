# Zaeon OS — Fase VPS: Voz Avançada + Autonomia (Prompt de Implementação)

> Documento-mestre para a próxima fase: sair do Vercel para uma **VPS própria**, trocar a voz
> "básica" (Piper) por um **stack de voz de alta textura**, levar **modo vocal nativo** a todas as
> janelas de input/output, e entregar um **Modo Voz Avançado (premium)** com foco mobile —
> onde o estudante comanda a Zaeon por voz para pesquisar, estudar e escrever na tela.
>
> Entregáveis-âncora: **(1) Autonomia** e **(2) Modo Voz Avançado**.
> Status: PLANO. Nada aqui foi implementado ainda — é o briefing para executar.
> Data: 2026-06-18. Autor do plano: par de engenharia da Zaeon (com Martinez).

---

## Decisões confirmadas (2026-06-18)

- **VPS = Hostinger KVM 2** — 2 vCPU, **8 GB RAM**, 100 GB NVMe, **sem GPU**. Implicações:
  - TTS = **Kokoro** (CPU, <2GB, tempo real) + **Piper** fallback. **Chatterbox/cloning fica para
    quando houver GPU** (KVM com GPU ou upgrade). Sem XTTS (licença).
  - STT = **faster-whisper `small`/`base` int8** (CPU) — 1 stream por vez no início; Web Speech como
    fallback/escala.
  - **Mongo (Atlas) e Redis (Upstash) gerenciados** — não rodar no host (poupa RAM dos 8 GB).
  - **`next build` no CI** (GitHub Actions) e enviar artefato/`pull` — 2 vCPU sofre com build local.
  - Orçar RAM: Next ~0.5–1 GB, voice(Kokoro) ~1–2 GB, stt(small) ~1–2 GB, sobra folga. OK no MVP.
- **Deploy = Docker Compose + Caddy** (TLS automático). 1 container por serviço.
- **Gating premium = OS DOIS**: `plan==='plus'` libera por padrão **+** override por usuário via
  `User.advancedVoiceEnabled` (admin). `/api/ai/capabilities` expõe `advancedVoice`.
- **Começar por: "voz boa local primeiro"** — voice-engine v2 (Kokoro) + `lib/voice/useTTS.ts` +
  botão 🔊 na resposta da Pesquisa, rodando local. Infra VPS (Fase 0) vem logo em seguida.

---

## 0. Por que agora (contexto real do repo)

O projeto já está "meio caminho andado" para isso — e é por isso que o Vercel virou gargalo:

- **`server.js` custom com Socket.IO** já existe. O Vercel (serverless) não mantém WebSocket/processo
  vivo; numa VPS isso roda nativo. (já temos chat privado em tempo real via socket.)
- **`voice-engine/`** já existe: FastAPI na porta **8004**, TTS via **Piper** (`engine.py`,
  `main.py`, `models.py`), consumido pelo proxy **`app/api/ai/voice/route.ts`** via
  `VOICE_ENGINE_URL`. O próprio README diz: *"Não roda na Vercel"*. Mesmo padrão dos outros engines
  Python: `abnt-service` (8001), `suggestion-forge` (8003).
- **`page.tsx`** já tem `webkitSpeechRecognition`, `voiceOn`, `playVoice(text)` e leitura automática
  da última resposta — ou seja, a **fundação de voz já está plugada**, só falta elevar a qualidade e
  universalizar.
- Limites de serverless que já nos morderam: `maxDuration` ≤ 60s (cortamos scholar 300→60), 503/504
  em engines externos, e processos de IA longos. Tudo isso some numa VPS com processos persistentes.
- IA central = **Vertex Gemini** (`lib/ai/model.ts`: `GEMINI_MODEL_FLASH=gemini-2.5-flash`,
  `GEMINI_MODEL_PRO=gemini-2.5-pro`). Isso **continua** — a VPS só hospeda o app + engines de voz,
  não o LLM.

Conclusão: a migração para VPS **destrava** o que a arquitetura já pedia (sockets, engines Python
persistentes, modelos de voz com GPU/CPU dedicada, jobs longos de autonomia).

---

## 1. Pesquisa de voz (TTS/STT) — o que vamos usar e por quê

Pesquisei por estrelas no GitHub e por reputação em fóruns (Reddit/HN/blogs especializados). Resumo
acionável (2025–2026):

### 1.1 TTS — síntese (texto → fala)

| Modelo | Licença | Stars / reputação | Textura | Latência | Papel na Zaeon |
|---|---|---|---|---|---|
| **Kokoro-82M** (`hexgrad/kokoro`) | **Apache-2.0** | ~muito alta; queridinho de 2025 em fóruns | Excelente p/ o tamanho, natural | Tempo real mesmo em CPU/baixa VRAM (<2GB) | **Default novo** (free + premium base) |
| **Chatterbox** (`resemble-ai/chatterbox`) | **MIT** | 11k+ stars, 1M+ downloads HF | SoTA, expressivo, *voice cloning* | Médio (ideal GPU) | **Premium** (voz com mais emoção / clonagem) |
| **Piper** (`rhasspy/piper` → `OHF-Voice/piper1-gpl`) | MIT/GPL | ~11k stars | Boa, robótica-leve | Rapidíssimo em CPU | **Fallback offline** (já instalado) |
| **XTTS-v2** (`coqui-ai/TTS`) | **CPML (não-comercial)** | mais baixado no HF | Ótimo cloning multi-idioma | Médio | ❌ evitar (licença trava comercial) |
| **Fish-Speech / F5-TTS** | Apache / CC-BY-NC | altas | Ótimas p/ cloning | Médio | Opção futura p/ cloning comercial (Fish = Apache) |

**Orquestrador:** **RealtimeTTS** (`KoljaB/RealtimeTTS`, **MIT**) — abstrai múltiplos engines
(Kokoro, Orpheus, Piper, XTTS…) com **streaming por chunks** e fallback. É a "cola" que nos deixa
trocar de voz por config e fazer *streaming* token→áudio (Zaeon "falando enquanto pensa").

**Decisão:** Kokoro como padrão (Apache, leve, natural) + Chatterbox como camada premium (MIT,
expressivo, cloning) + Piper como fallback, tudo atrás do RealtimeTTS. Mantém nossa regra de licença
limpa para uso comercial.

### 1.2 STT — reconhecimento (fala → texto) — necessário p/ os comandos de voz

| Engine | Licença | Nota | Papel |
|---|---|---|---|
| **faster-whisper** (`SYSTRAN/faster-whisper`, CTranslate2) | MIT | Rápido em GPU, int8; melhor backend p/ streaming | **STT do servidor (VPS com GPU)** |
| **whisper.cpp** | MIT | Melhor em CPU/Apple, binário pequeno, VAD/streaming | Fallback CPU / edge |
| **Web Speech API** (browser) | nativo | `webkitSpeechRecognition` (já usado) | **Fallback instantâneo / mobile básico** |
| **Whisper-Streaming** | MIT | Política de latência adaptativa sobre faster-whisper | Camada de streaming p/ ditado contínuo |

**Decisão:** faster-whisper no servidor (modo premium/avançado, ditado contínuo e preciso) +
Web Speech API como caminho grátis/instantâneo no browser. STT vira um novo micro-engine Python
(`stt-engine/`, porta sugerida **8005**) espelhando o padrão do voice-engine.

### 1.3 Insight de produto

- **Streaming é o que vende.** O "uau" não é só a voz bonita — é a Zaeon **começar a falar em
  ~200ms** e o texto **aparecer na tela enquanto ela fala** (já temos a escrita ao vivo no feed de
  estudos e nas citações; casar isso com voz fecha o loop).
- **Licença primeiro.** Mantemos só Apache/MIT no caminho comercial (Kokoro, Chatterbox, Piper,
  faster-whisper, RealtimeTTS). XTTS fica de fora por causa do CPML.
- **Premium = servidor; Free = browser.** Voz nativa do navegador (Web Speech) cobre o grátis;
  o stack neural na VPS é o diferencial pago. Encaixa no nosso gating que já existe.

Fontes: ver seção 11.

---

## 2. Arquitetura alvo na VPS

```
                         ┌──────────────────────────────────────────────┐
  Internet ──TLS──▶ Nginx│ (reverse proxy + WebSocket upgrade + gzip)    │
                         └───────┬───────────────┬───────────────┬──────┘
                                 │               │               │
                    ┌────────────▼───┐   ┌───────▼──────┐  ┌─────▼─────────┐
                    │ Next.js (3000) │   │ voice-engine │  │ stt-engine    │
                    │ server.js +    │   │ FastAPI 8004 │  │ FastAPI 8005  │
                    │ Socket.IO      │   │ Kokoro/Chat/ │  │ faster-whisper│
                    └───┬────────┬───┘   │ Piper (RTTS) │  └───────────────┘
                        │        │       └──────────────┘
              ┌─────────▼──┐  ┌──▼─────────┐   ┌──────────────┐   ┌──────────────┐
              │ MongoDB    │  │ Redis      │   │ abnt 8001    │   │ forge 8003   │
              │ (Atlas/    │  │ (Upstash/  │   │ (já existe)  │   │ (já existe)  │
              │  self)     │  │  self)     │   └──────────────┘   └──────────────┘
              └────────────┘  └────────────┘
```

- **Processos:** `pm2` (ou `systemd`) p/ Next (`node server.js`) e cada engine Python (uvicorn).
  Alternativa: `docker compose` (1 serviço por engine + nginx) — recomendado para reprodutibilidade.
- **Reverse proxy:** Nginx/Caddy com TLS (Let's Encrypt). **Caddy** é o atalho (TLS automático).
  WebSocket upgrade habilitado para o Socket.IO (`/socket.io/`).
- **GPU:** se a VPS tiver GPU (ideal p/ Chatterbox + faster-whisper), instalar drivers CUDA. Sem GPU,
  Kokoro + Piper + whisper.cpp ainda rodam bem em CPU (qualidade Kokoro continua ótima).
- **Sessão/escala:** Socket.IO com adapter Redis se houver mais de 1 instância Next (`@socket.io/redis-adapter`).
- **Domínio:** apontar `zaeon.space` (ou subdomínio) → VPS; `NEXTAUTH_URL` = domínio real;
  registrar o redirect do Google OAuth no console (mesma pendência que já tínhamos no Vercel).

### 2.1 O que sai do Vercel e como

1. Build continua `prisma generate && next build`; runtime `node server.js` (já é o nosso start).
2. Variáveis: migrar **todas** as envs do Vercel para `/etc/zaeon/.env` (lido pelo systemd/pm2) ou
   `.env` no deploy. **Segredos NUNCA no git nem na memória** (YouTube key, Upstash, Google creds,
   Vertex creds) — regra já vigente do projeto.
3. Remover suposições serverless: `export const maxDuration`/`dynamic` deixam de ser limitantes
   (podem ficar; não atrapalham). Jobs longos agora podem rodar de verdade (ver Autonomia §6).
4. Deploy: `git pull` + `pnpm/npm ci` + `build` + `pm2 reload`. Opcional: GitHub Actions → SSH deploy.

---

## 3. Voice engine v2 (TTS de alta textura)

Evoluir `voice-engine/` mantendo o **mesmo contrato** (`POST /synthesize` → `{audio_base64, mime, voice}`)
para não quebrar o proxy atual, e **adicionar streaming**.

### 3.1 Backend (`voice-engine/`)
- Trocar implementação interna por **RealtimeTTS** com engines:
  - `kokoro` (default), `chatterbox` (premium), `piper` (fallback).
- Manter `synthesize_base64()` (compat) **e** adicionar **`POST /stream`** que devolve áudio em
  chunks (`audio/wav` ou `audio/pcm` via `Transfer-Encoding: chunked` ou WebSocket) para latência baixa.
- Vozes: expor catálogo `GET /voices` → `[{id, label, gender:'f'|'m', tier:'free'|'premium', lang}]`.
  Pelo menos **uma feminina e uma masculina** PT-BR em cada tier (entregável explícito).
- `requirements.txt`: `realtimetts[kokoro]`, `realtimetts[chatterbox]` (premium), manter `piper-tts`,
  `fastapi`, `uvicorn[standard]`, `pydantic`.
- `engine_spec.md`: atualizar contrato (síntese, stream, vozes, tier).

### 3.2 STT engine novo (`stt-engine/`, porta 8005)
- FastAPI + **faster-whisper** (`model_size=base|small`, `compute_type=int8`).
- `POST /transcribe` (áudio base64/multipart → `{text, lang, confidence}`).
- `WS /stream` para ditado contínuo (Whisper-Streaming): recebe PCM, emite parciais.
- Fallback: se engine offline, o front cai no Web Speech API.

### 3.3 Proxies Next (novas rotas)
- `app/api/ai/voice/route.ts`: já existe (síntese). Adicionar passagem de `tier` e `voice`.
- `app/api/ai/voice/stream/route.ts`: **novo** — repassa stream do engine (Node runtime, sem buffer).
- `app/api/ai/stt/route.ts`: **novo** — proxy do stt-engine (transcribe).
- `STT_ENGINE_URL` nova env (default `http://localhost:8005`).
- Manter o **degrade gracioso** que já temos (503 → front usa Web Speech / texto).

---

## 4. Modo vocal nativo em TODA janela de input/output

Objetivo: qualquer lugar com texto ganha (a) **ouvir** (TTS read-out) e (b) **falar** (STT ditado).

### 4.1 Camada compartilhada (criar)
- `lib/voice/useTTS.ts` — hook: `speak(text, {voice, tier})`, `stop()`, `speaking`. Decide engine:
  premium→`/api/ai/voice/stream`; free→`speechSynthesis` do browser. Reaproveita `playVoice` do page.tsx.
- `lib/voice/useSTT.ts` — hook: `start()`, `stop()`, `transcript`, `listening`. premium→`/api/ai/stt`
  (faster-whisper); free→`webkitSpeechRecognition`.
- `lib/voice/VoiceContext.tsx` — provider global: `voiceEnabled`, `voiceGender`, `tier`, `autoRead`.
  Persistência: localStorage (`zaeon.voice.*`) + (opcional) `User` no Mongo.
- `components/voice/VoiceButtons.tsx` — par de botões reutilizável (🔊 ouvir / 🎙️ ditar) para plugar
  em qualquer input/output com 1 linha.

### 4.2 Pontos de plugagem (todas as abas/salas)
- **Pesquisa (Omega/Aura):** ouvir respostas; ditar a query; ditar no framework de texto.
- **Sala de Estudos / Meus Estudos:** ditar para a barra-agente ⟁ ("Zaeon, estude sobre…");
  ouvir blocos do caderno; ditar conteúdo direto no caderno.
- **Sala de Aula:** chat da Zaeon por voz; ditar eventos da agenda ("cinema hoje 13–16h").
- **Projetos (Zaeon Code):** ouvir explicações; ditar comandos pro agente.
- **Lounge / chat privado:** ouvir/ditar mensagens.
- Regra: todo `input`/`textarea` relevante recebe o botão 🎙️; toda saída de agente recebe o 🔊.

---

## 4.3 Switch de voz POR JANELA (regra confirmada 2026-06-18)

Cada janela de **chat/input** tem o **seu próprio switch de voz** (`components/voice/VoiceModeSwitch.tsx`),
independente das outras — não é um toggle global. Onde houver um campo de comando/escrita, há um 🎙️.
- Já plugado: barra da Pesquisa (Omega). A plugar: barra ⟁ de Meus Estudos, chat da Sala de Aula,
  framework de texto da Pesquisa, chat de Projetos, Lounge.
- O switch dita ao vivo no input (`onTranscript`) e fecha a frase em `onFinal`.

**Janela de LOADING inicial (splash) — caso especial:** ela também tem switch de voz, mas o modo de
áudio dela **NÃO abre o app**. Ele só **dispara pesquisas/comandos nas salas** (estudo, pesquisa, etc.)
— ou seja, a pessoa fala um comando no splash e a Zaeon executa a ação na sala correspondente (via o
runtime de autonomia §6), sem navegar/abrir a aplicação inteira. É um atalho de voz "headless": só o
backend processa e o resultado materializa na sala certa. (Arquivos: `components/ui/MacSplash.tsx` e
`app/study-rooms/*/loading.tsx`.)

## 5. Modal de Voz (ondas vocais estilizadas) — desktop + mobile

Componente `components/voice/VoiceOrbModal.tsx`:
- **Visual:** ondas/órbita reagindo ao áudio (Web Audio `AnalyserNode` → amplitude). Estética Zaeon:
  gradiente **violeta `#8b5cf6` → ciano `#22d3ee`** (claro e escuro), glow suave, vidro fosco — mesma
  identidade do ⟁ e dos fios de energia.
- **Estados:** ouvindo (ondas pulsando na fala do usuário), pensando (órbita girando — só backend
  processando), falando (ondas seguindo o TTS). Frases de status com emoção (padrão do projeto).
- **Acessibilidade:** `prefers-reduced-motion` → reduz animação; legenda do que foi entendido/falado.
- **Aparece** no desktop e no smartphone enquanto o "modo voz avançado" está ativo; fecha com gesto/ESC.
- **Cores por tema:** tokens já existentes; respeitar light/dark.

---

## 6. Autonomia (entregável-âncora 1)

A VPS permite o que o serverless não permitia: **agentes que escrevem na tela de verdade, em jobs
longos e retomáveis**. Consolidar o que já existe (escrita ao vivo no feed, citações em tempo real,
Zaeon generativa) num **runtime de autonomia**:

- **Job server-side durável:** fila simples (Mongo/Redis) para tarefas "Zaeon, faça X" que sobrevivem
  a reload/troca de aba (resolve o TODO antigo do "durable research job"). Estados:
  `queued|running|streaming|done|error`, com progresso.
- **Stream para a UI:** via Socket.IO (já temos) — o cliente assina o `jobId` e recebe blocos/áudio
  conforme são gerados. Reconectar = retomar de onde parou.
- **Ferramentas (tool-calling) unificadas:** `study_action`, `update_schedule` (já existe),
  `research`, `write_document`, `code` — a Zaeon decide e executa, escrevendo no destino certo.
  Ver `docs/STUDY_ROOM_ACTIONS.md` e `docs/BENTO_CONTEXT.md`.
- **Guardrails:** anti-loop, teto de passos, timeout por etapa (já temos no Zaeon Code; generalizar).
- **Voz fecha o loop:** comando falado → job de autonomia → texto aparece na tela + Zaeon narra.

---

## 7. Modo Voz Avançado MOBILE (entregável-âncora 2)

O coração do pedido: **no celular**, a pessoa fala e a Zaeon **faz** — pesquisa, estuda, escreve.
Transportar o "gadget de chat" do desktop para o mobile como **controle total por voz**.

- **Gadget de voz mobile** (`components/voice/MobileVoiceDock.tsx`): botão flutuante ⟁ persistente;
  toque → abre o `VoiceOrbModal` em tela cheia; segura-pra-falar **ou** modo conversa contínua.
- **Comandos → ações** (mapeados ao runtime de autonomia §6):
  - "Zaeon, **pesquise** sobre X" → abre Pesquisa, dispara Omega, narra os achados.
  - "Zaeon, **estude** Y" → cria/escreve no Meus Estudos ao vivo (já temos o worker `/api/study/agent`).
  - "Zaeon, **escreva** Z na pesquisa" → injeta no framework de texto da aba Pesquisa
    (reusa evento `zaeon:research:use-title` e a escrita ao vivo).
  - "Zaeon, **agende** …", "**resuma** …", "**cite** …" → ferramentas correspondentes.
- **Só backend processando:** durante a ação, a tela mostra **apenas o modal de ondas** (sem teclado),
  e o resultado materializa na aba certa quando pronto.
- **Mobile-first de verdade:** auditar e corrigir responsividade das abas (não só "funcionar", mas
  **funcionalidade**): alvos de toque ≥44px, sem hover-only, viewport, teclado, safe-areas. Começar
  pelas telas tocadas pelo modo voz (Pesquisa, Meus Estudos, Sala de Aula).
- **PWA (recomendado):** manifest + service worker p/ instalar no celular, ícone ⟁, splash — dá
  cara de app nativo sem loja.

---

## 7.1 Modo de voz: PASSIVO vs ATIVO (regra confirmada 2026-06-18)

A voz tem duas personalidades (persistidas em `lib/voice/voiceMode.ts`, `zaeon.voice.mode`):
- **Passivo (default):** recebe o comando e executa com o mínimo de conversa — breve, direto,
  aciona o agente certo sem narração.
- **Ativo:** pode conversar com leveza e personalidade sobre o assunto (uma faísca de opinião/curiosidade)
  e AO MESMO TEMPO despacha os agentes para executar. NÃO narra tarefas técnicas ("estou abrindo…");
  fala a resposta (auto-TTS) e age. Mais "falante".
- Implementado: `/api/ai/chat` aceita `voiceMode` e injeta a diretiva no system prompt; o widget de chat
  tem o toggle Passiva/Ativa e, no modo ativo, fala a resposta automaticamente (useTTS).

## 7.2 Mobile (proporções e layout)

Alvo: viewports **360–430px** (base ~390px); breakpoint mobile `< 640px` (sm). Lógica estilo Claude/ChatGPT:
- **Chat sempre presente** como centro: o widget (`LoungeChatWidget`) já vira quase full-screen no mobile
  (largura ~vw-12, altura ~84vh) e mantém o ⟁ flutuante quando fechado. Voz em foco (Mic + modo ativo).
- **Linha horizontal inferior** (a fazer): pastas/arquivos como chips roláveis na mesma faixa do input,
  com **arrasta-e-solta** para o caderno/conversa. Reusar o padrão de chips já existente.
- **Escrita navegável pela sidebar/módulo no tamanho da tela** (a fazer por sala): coluna única, sidebar
  colapsável, alvos de toque ≥44px, sem hover-only, safe-areas. Começar pela **Pesquisa**.

## 8. Premium gating (Modo Voz Avançado é pago)

Reusar o padrão do **Modo Econômico / deep-thinking** (`User.deepThinkEnabled`,
`lib/ai/deepThinkAccess.ts`, `/api/ai/capabilities`):
- Novo flag `User.advancedVoiceEnabled` (Mongoose `strict:false`, sem migração) **ou** derivar de
  `plan === 'plus'`. Admin libera por usuário no dashboard (mesma UI do deep-think).
- `/api/ai/capabilities` passa a expor `advancedVoice: boolean` e `voices: [...]` por tier.
- **Free:** voz nativa do browser (Web Speech) — TTS/STT básicos, sem modal de ondas neural.
- **Premium:** Kokoro/Chatterbox + faster-whisper + modal de ondas + comandos de autonomia por voz.
- Rate-limit nas rotas de voz (helper `guard` em `src/lib/ratelimit.ts`, já usado pela `/api/ai/voice`).

---

## 9. Modelo de dados (Prisma/Mongo)

- `User.advancedVoiceEnabled?: boolean` (ou usar `plan`).
- `User.voicePref?: { gender: 'f'|'m', voiceId: string, autoRead: boolean }`.
- `VoiceJob` (autonomia): `{ id, userId, kind, input, status, progress, result, createdAt, updatedAt }`.
- Sem migração destrutiva (padrão do projeto: `strict:false`, campos opcionais).

---

## 10. Roadmap em fases (com verificação ao fim de cada uma)

**Fase 0 — VPS base (sem mudar features).**
Provisionar VPS, Caddy/Nginx+TLS, Mongo, Redis, `pm2`/`docker compose`, mover envs, apontar domínio,
ajustar `NEXTAUTH_URL` + redirect Google. Subir Next (`server.js`) + engines existentes (voice 8004,
abnt 8001, forge 8003). ✅ Verif.: app no domínio, login Google, socket conecta, `/api/ai/*` 200.

**Fase 1 — Voice engine v2 (TTS).**
RealtimeTTS + Kokoro default + Piper fallback; `/voices`; `/stream`; vozes F/M PT-BR free.
✅ Verif.: síntese < 400ms TTFB; fallback ok; pytest do engine (Piper mockado, padrão atual).

**Fase 2 — STT engine + hooks de voz.**
`stt-engine/` (faster-whisper) + `useTTS`/`useSTT`/`VoiceContext` + `VoiceButtons` em Pesquisa e
Meus Estudos. ✅ Verif.: ditar query e ouvir resposta nas duas abas; fallback Web Speech.

**Fase 3 — Modal de ondas + nativo em todas as abas.**
`VoiceOrbModal` (light/dark, cores Zaeon) plugado em todas as salas. ✅ Verif.: estados
ouvir/pensar/falar; reduced-motion; consistência tema.

**Fase 4 — Autonomia durável + voz fecha o loop.**
`VoiceJob` + stream via Socket.IO + ferramentas unificadas; retomada após reload.
✅ Verif.: comando longo sobrevive a reload e narra o resultado.

**Fase 5 — Mobile-first + Modo Voz Avançado (premium) + PWA.**
`MobileVoiceDock`, comandos→ações, auditoria responsiva, gating `advancedVoiceEnabled`, PWA.
✅ Verif.: no celular, 3 fluxos (pesquisar/estudar/escrever) 100% por voz; gating bloqueia free.

**Fase 6 — Chatterbox premium + clonagem (opcional) + polish.**
Voz expressiva/cloning na VPS com GPU; catálogo de vozes premium. ✅ Verif.: A/B Kokoro×Chatterbox.

---

## 11. Riscos & decisões

- **Licença comercial:** só Apache/MIT no caminho pago (Kokoro, Chatterbox, Piper, faster-whisper,
  RealtimeTTS). **XTTS fora** (CPML). Revisar `LICENSING_ADDENDUM` do RealtimeTTS antes do release.
- **Custo de GPU:** Chatterbox/faster-whisper grandes pedem GPU. MVP roda CPU com Kokoro+Piper+
  whisper small. Premium "completo" exige a VPS com GPU.
- **Privacidade de áudio:** não persistir áudio bruto sem consentimento; transcrever e descartar.
  Deixar claro no termo. (alinha com `user_wellbeing`/segurança do projeto.)
- **Segredos:** continuam só em `.env`/secret store — nunca git, nunca memória.
- **Mobile:** o maior esforço de UI; tratar como trilha paralela desde a Fase 2.

### Fontes da pesquisa de voz
- Kokoro — https://github.com/hexgrad/kokoro · https://huggingface.co/hexgrad/Kokoro-82M
- Chatterbox — https://github.com/resemble-ai/chatterbox
- Piper — https://github.com/rhasspy/piper · https://github.com/OHF-Voice/piper1-gpl
- Coqui XTTS — https://github.com/coqui-ai/TTS
- RealtimeTTS — https://github.com/KoljaB/RealtimeTTS · https://pypi.org/project/realtimetts/
- faster-whisper — https://github.com/SYSTRAN/faster-whisper
- Comparativos — https://www.bentoml.com/blog/exploring-the-world-of-open-source-text-to-speech-models ·
  https://modal.com/blog/open-source-tts · https://www.codesota.com/guides/tts-models ·
  https://modal.com/blog/choosing-whisper-variants

---

## 12. Pra começar amanhã (primeiros passos concretos)

1. **Fase 0**: subir a VPS com Caddy + `docker compose` (Next + voice-engine + abnt + forge), mover
   envs, apontar domínio, validar login.
2. **Fase 1**: `pip install "realtimetts[kokoro]"`, baixar voz Kokoro PT-BR, trocar `engine.py` para
   RealtimeTTS mantendo `/synthesize`, adicionar `/voices` e `/stream`.
3. Criar `lib/voice/useTTS.ts` e plugar 🔊 na resposta da Pesquisa (menor caminho até "ouvir a Zaeon
   com voz boa"). A partir daí, expandir conforme o roadmap.

> Quando for executar, seguir a regra do projeto: trabalhar em branch, `transpile`/checagem a cada
> passo, commits pequenos e reversíveis, e atualizar `docs/` + memória do Obsidian ao fim de cada fase.
