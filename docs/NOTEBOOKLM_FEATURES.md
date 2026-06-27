# Zaeon Studio — multimídia GenAI dentro de "Meus Estudos" · Spec definitiva p/ agente

> **Missão:** transformar cada estudo da Zaeon em **várias formas mastigadas** (podcast,
> vídeo, mapa mental, linha do tempo, guia, FAQ, flashcards, slides, imagem didática,
> trilha, voz) **e** dar multimodalidade ao chat (mandar foto → análise; pedir imagem →
> geração) — **tudo com a interface da Zaeon** (⟁, botão Play, pílulas, liquid glass),
> **NUNCA a UI do Google**, e **100% sobre modelos GenAI do Google** (debita do crédito).
>
> **Resultado esperado:** ao terminar, o dono só faz **subir e testar**. Backend **e**
> frontend ligados, visíveis em **Meus Estudos**, com `npx vitest run` verde.

---

## 0. Princípios (não negociáveis)

1. **UI é a da Zaeon.** Reusar os padrões existentes: ícone ⟁, botão de Play, pílulas, cards liquid-glass com sombra, modo foco. Nada de embed/UI do Google. O usuário clica num botão bonito da Zaeon e recebe o artefato **dentro da página**.
2. **Agentes contextuais, não "texto solto".** Cada gerador é um **agente** que (a) entende o conteúdo do estudo e a intenção, (b) produz **saída estruturada** (schema JSON), (c) entrega "mastigado" — formatado, confiável, detalhado, citando o próprio conteúdo. Igual o NotebookLM transforma 1 fonte em N formatos.
3. **Tudo no crédito Google.** Texto = Gemini (Vertex); voz = **Gemini-TTS**; imagem = **Imagen 4**; vídeo = **Veo 3**; trilha = **Lyria 3**; visão (análise de foto) = Gemini multimodal. Nada de serviço fora do crédito. Ver `docs/GOOGLE_CREDITS_ARCH.md` (fundação: voz, creds, modelo central).
4. **Encaixe principal: a sala "Meus Estudos"** (`components/study/MeusEstudosFeed.tsx`). É lá que o Studio aparece. Secundário: chat multimodal no widget (`components/sub/LoungeChatWidget.tsx`).
5. **Confiável e assíncrono.** Gerações pesadas (vídeo) são `queued→running→done|error` com polling. Saídas validadas por schema; nunca renderizar lixo.

## Dependência
Coordene com `docs/GOOGLE_CREDITS_ARCH.md`. Precisa de `lib/voice/gemini-tts.ts` (voz Gemini-TTS, inclusive **multi-speaker**), `lib/ai/model.ts` (Gemini central) e `lib/ai/vertex-credentials.ts`. **Se o `gemini-tts.ts` ainda não existir, este agente cria.**

## Referência open-source PRINCIPAL — espelhar o melhor (OBRIGATÓRIO)

> **Blueprint canônico: `https://github.com/lfnovo/open-notebook` (MIT).** É DESTE repo que o
> agente deve extrair o melhor — arquitetura, pipelines, prompts e features. Clonar/ler antes
> de implementar e **portar os padrões** para a stack Google GenAI da Zaeon (adaptar, não copiar
> cego). Manter aviso de licença (MIT) ao reaproveitar trechos. `podcastfy` abaixo é só
> complemento opcional pro pipeline de podcast.

- **`lfnovo/open-notebook`** (MIT, ~18k stars) — **a referência**. Implementação completa do NotebookLM. Minerar:
  - **Podcast multi-speaker (1–4 vozes)** e os **"Episode Profiles"** (tom, duração, nº de vozes, persona de cada host) → virar nossas opções de podcast.
  - Estrutura de **transformações de conteúdo** (study guide, FAQ, resumo, etc.) e os **prompts**.
  - Modelagem de "notebook/sources/notes" → comparar com nosso `StudyItem`/`StudySpace`.
- **`souzatharsis/podcastfy`** (Apache-2.0) — especialista em **gerar podcast**. Minerar:
  - **Pipeline transcript→áudio**, **shorts (2–5 min) vs longform (30+ min)**, e os **prompts de roteiro** (como faz dois hosts soarem naturais, com idas e voltas).
  - Estratégia de **chunking + concatenação** de áudio e controle de duração.

**Como usar (regras):**
- **Adaptar, não copiar cego:** porta os **padrões e prompts** para a nossa stack **100% Google GenAI** (Gemini p/ roteiro, **Gemini-TTS multi-speaker** p/ voz, Imagen/Veo/Lyria). Esses repos usam outros provedores (OpenAI/ElevenLabs/etc.) — troque pelos modelos Google do crédito.
- **Licença:** ao reaproveitar trechos, manter o aviso de licença/origem (MIT/Apache-2.0 são compatíveis). Registrar a origem num `NOTICE`/comentário.
- **Objetivo:** acelerar e aumentar a qualidade (roteiro natural, episode profiles, longform) — não reinventar o que já foi resolvido bem nesses repos.
- Como consultar: ler o código no GitHub (`github.com/lfnovo/open-notebook`, `github.com/souzatharsis/podcastfy`); focar nos módulos de podcast/transcript/prompts.

## Guardrails (LER)
- Segredos só em `.env`/`.env.local` (gitignored) + VPS; nunca em git/log. **Sem SSH ao VPS** (deploy é do dono). macOS sem `python` (use `python3`/Node).
- **Verificação por fatia:** `npx vitest run` (alvo 248/248+) + transpile dos arquivos tocados. Testes unitários puros p/ os montadores de schema (roteiro, storyboard, mindmap).
- Não quebrar o verde. IDs de modelo via **env** com default (Imagen/Veo: confirmar id no Model Garden; deixar `IMAGEN_MODEL`, `VEO_MODEL`).

---

## 1. Fundação comum (fazer primeiro)

- **Prisma `StudioArtifact`**: `{ id, ownerId, sourceIds String[], kind, status (queued|running|done|error), title, mime, storageRef, meta Json, error?, createdAt, updatedAt }`. `prisma generate`.
- **Armazenamento**: arquivos em `/app/.studio/<id>.<ext>` no container, servidos por rota de stream (`GET /api/studio/[id]/file`). (Fase 2: bucket.) Texto/JSON pode ir no `meta`.
- **Rotas base**: `app/api/studio/[id]/route.ts` (GET status/meta), `.../file` (stream). `POST /api/studio/<feature>` cria o artifact (queued) e dispara a geração (await curto p/ texto; em background/polling p/ áudio/vídeo).
- **`lib/studio/`**: orquestradores **puros e testáveis** (montar roteiro, storyboard, mindmap, validação de schema). Carregar conteúdo do estudo a partir do banco (`StudyItem`/`StudySpace`/markdown do feed) — **não** baixar PDF externo.
- **Helper de saída estruturada**: usar `responseSchema`/JSON do Gemini (não regex em texto livre).

---

## 2. UI em "Meus Estudos" (a cara Zaeon)

No `MeusEstudosFeed.tsx`, adicionar um **"Studio da Zaeon"**: uma barra/dock de ações no estilo da casa (pílulas + ⟁), cada ação gera um artefato e o mostra **inline** (player de áudio/vídeo Zaeon, viewer de mapa mental, cards de flashcards, etc.), e salva no acervo (dock/biblioteca).

- Botões (pílulas liquid-glass, com ícone): **🎙️ Podcast · 🎬 Vídeo · 🧠 Mapa mental · 🕒 Linha do tempo · 📘 Guia · ❓ FAQ · 🃏 Flashcards · 🖼️ Imagem · 🎼 Trilha · 🔊 Ouvir**.
- Cada botão → `POST /api/studio/...` → mostra estado (gerando…, com o ⟁ girando) → renderiza o resultado na própria página, com **Play** (áudio/vídeo) e ações (salvar na biblioteca, baixar, refazer).
- Reusar componentes/estética existentes (cards, ttsController p/ áudio, glitch ⟁). **Não** abrir UI do Google.
- Artefatos gerados entram na **biblioteca/dock** do usuário (aparecem junto dos outros itens).

**Critério de aceite UI:** abrir um estudo em Meus Estudos, clicar em cada botão e ver o resultado **dentro da página**, com a estética Zaeon, podendo dar Play e salvar.

---

## 3. Catálogo de features (cada uma: rota · modelo · schema · UI · aceite)

### 3.1 🎙️ Podcast / Audio Overview (2 apresentadores) — ⭐ FEATURE-CARRO-CHEFE
> Esta é a feature âncora. Ela se **encaixa no botão Play que já existe** no estudo.
> Hoje o Play em Meus Estudos só "lê o estudo" (narração TTS de uma voz). Evoluir o **mesmo Play** para oferecer **dois modos**:
> - **Ouvir** (narração, 1 voz feminina pt-BR via Gemini-TTS — caminho atual, instantâneo);
> - **Podcast** (2 apresentadores conversando sobre o tema — gera e toca no mesmo player).
>
> Ou seja: o usuário aperta Play → escolhe "Narração" ou "Podcast" (pílula/toggle no estilo Zaeon, ao lado do ⟁). O Podcast é a versão "mastigada e gostosa de ouvir" do estudo.

- Rota `POST /api/studio/podcast` (`sourceIds`, duração-alvo, tom, idioma pt-BR, nomes dos hosts).
- Agente: Gemini gera **roteiro em turnos** `{title, turns:[{speaker:"A|B", text}]}` (A = condutor curioso; B = especialista; fala natural, ganchos, analogias, sem markdown; fiel ao conteúdo do estudo).
- Síntese: **Gemini-TTS multi-speaker** (`speechConfig.multiSpeakerVoiceConfig.speakerVoiceConfigs[]`) → 2 vozes pt-BR; concatenar os WAV no Node (ou ffmpeg se houver no container). Trilha de fundo opcional via Lyria (volume baixo).
- **Cache:** salvar o podcast como `StudioArtifact{kind:"podcast", sourceIds}` — se já existe pro estudo, o Play reusa (não regenera à toa).
- UI: **mesmo player do Play** (reusar `ttsController`/o player atual), com Play/pause + transcrição expansível (mostra os turnos A/B). Botão "Regerar".
- Aceite: num estudo, apertar Play → "Podcast" → em alguns segundos toca um áudio de ~2–5 min com 2 vozes conversando, coerente com o conteúdo, pt-BR, debitando do crédito; "Narração" continua instantânea.

### 3.2 🎬 Vídeo Overview (apresentação narrada)
- Rota `POST /api/studio/video`. Agente: Gemini → seções `{narração, bullets, prompt_de_imagem}`.
- **Nível A (default, barato/confiável):** Imagen 4 (1 imagem/seção) + narração Gemini-TTS + montagem slides (ffmpeg ou slideshow). **Nível B:** Veo 3 (clipes por seção).
- UI: player de vídeo Zaeon. Aceite: .mp4 curto com slides/clipes + narração sincronizada.

### 3.3 🧠 Mapa mental
- Rota `POST /api/studio/mindmap`. Gemini → JSON `{nodes:[{id,label,parent?}], edges?}` (validar schema).
- UI: render do mapa **na página** (componente Zaeon — pode usar SVG/canvas simples; sem lib pesada se não houver). Aceite: nós coerentes hierárquicos do conteúdo.

### 3.4 🕒 Linha do tempo
- `POST /api/studio/timeline`. Gemini → `{events:[{when, title, detail}]}` ordenado. UI: timeline vertical Zaeon. Aceite: eventos corretos quando o tema tiver cronologia.

### 3.5 📘 Guia de estudos · ❓ FAQ · 🃏 Flashcards
- `POST /api/studio/guide` → `{resumo, conceitos:[{termo,definicao}], revisao:[perguntas]}`.
- `POST /api/studio/faq` → `{faq:[{q,a}]}`.
- `POST /api/studio/flashcards` → `{cards:[{front,back}]}` (UI: cards viráveis, já há padrão de flip no projeto — reusar).
- Aceite: markdown/JSON fiel ao conteúdo, "mastigado".

### 3.6 🖼️ Imagem didática (Imagen) — ex.: anatomia/medicina
- `POST /api/studio/image` (`prompt` derivado do estudo OU pedido direto). Imagen 4. Útil p/ diagramas (anatomia, química, etc.).
- UI: imagem na página + salvar na biblioteca. Aceite: imagem coerente com o pedido, no crédito.

### 3.7 🎼 Trilha sonora (Lyria)
- `POST /api/studio/soundtrack` (humor/tema). Lyria 3 → áudio curto. UI: Play. Opcional como fundo do podcast/vídeo.

### 3.8 🔊 Ouvir o estudo (Gemini-TTS)
- Já existe via `ttsController`/`/api/ai/voice` (após `GOOGLE_CREDITS_ARCH.md`): integrar o botão **Ouvir** no Meus Estudos com voz feminina pt-BR.

---

## 4. Chat multimodal (LoungeChatWidget) — visão + geração

### 4.1 Enviar foto → análise (Gemini Vision)
- No chat widget, permitir anexar **imagem**; rota manda a imagem (inlineData) + pergunta ao **Gemini multimodal** → resposta (descrever, explicar diagrama, resolver questão da foto, transcrever, etc.).
- Aceite: tirar foto de um exercício/diagrama e a Zaeon analisa/explica.

### 4.2 Gerar imagem pelo chat (Imagen)
- Detectar intenção "gere/crie uma imagem de…" no chat → Imagen 4 → devolve a imagem no balão da Zaeon (estética Zaeon), com opção de salvar na biblioteca. Ex.: "gere um modelo do coração humano com as câmaras nomeadas".
- Aceite: pedir imagem no chat e receber inline.

---

## 5. Confiabilidade
- **Saída estruturada** sempre (Gemini `responseSchema`/JSON) + validação; se inválido, 1 retry com instrução de correção; senão erro tratado (sem renderizar lixo).
- **Idempotência/polling** p/ áudio/vídeo; status no `StudioArtifact`.
- **Limites:** chunk de TTS ≤ ~420 chars (já no controller); cap de duração do vídeo; timeouts generosos nas rotas pesadas (`maxDuration`).
- **Custos no crédito:** confirmar IDs Imagen/Veo no Model Garden; tudo Gemini/GenMedia.

---

## 6. Ordem (fatias) — cada fatia: implementar → vitest+transpile → relatar
1. **Fundação**: `StudioArtifact` (Prisma) + `app/api/studio/[id]` + storage/stream + `lib/studio/` (puros + testes).
2. **Geradores de texto** (guia, FAQ, flashcards, mapa mental, timeline) — baratos, validam ponta-a-ponta + **UI no Meus Estudos** (botões + render inline).
3. **Podcast** (Gemini-TTS multi-speaker) + player Zaeon.
4. **Imagem** (Imagen) no Meus Estudos + **chat: gerar imagem** + **chat: analisar foto** (Gemini Vision).
5. **Vídeo** (Nível A: Imagen+slides+narração) → **Trilha** (Lyria) → Veo (upgrade).
6. **Ouvir** (Gemini-TTS) integrado.

## 7. "Pronto pra subir" (definição de done)
- Botões aparecem em **Meus Estudos** com a estética Zaeon e **funcionam** (geram + mostram inline + salvam na biblioteca).
- Chat aceita foto (análise) e gera imagem.
- Tudo passa por modelo Google (crédito). `npx vitest run` verde + transpile limpo.
- Nenhum segredo no git. Deploy/rebuild fica pro dono.

## Não-objetivos
- Não copiar a UI do NotebookLM/Google — só a lógica, com a cara da Zaeon.
- Não usar serviços fora do crédito GenAI (sem Cloud TTS clássico, sem APIs pagas externas).
