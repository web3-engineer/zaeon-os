# Testes do #883 (parte 2): voz sem o Google

O Gemini-TTS está fora do ar (o Google responde **403 "requires billing"**), e por isso narração, podcast e vídeo do Studio não geravam voz. A voz da Aura só saía pela reserva, o Piper. O Martinez pediu para tirar o Google da equação. Este PR faz a parte 2 do card: a voz.

## O que muda

### Voz pelo Hugging Face (`lib/voice/hf-voz.ts`, novo)
- A voz passa a sair do **Kokoro em português**, pelo Hugging Face (provedor fal-ai), com o **mesmo `HF_TOKEN`** do chat e da imagem.
- Vozes: **pf_dora** (feminina, a padrão da Zaeon), **pm_alex** e **pm_santa** (masculinas).
- Os nomes antigos continuam valendo: "leda", "kore" e qualquer outra viram a feminina; "Charon" vira a masculina.
- **Texto longo** (aula, vídeo) é dividido por frase em trechos de até 450 caracteres, e os áudios são juntados num só.
- O áudio só é baixado do site do provedor, por https, sem seguir redirecionamento, com tempo máximo e limite de tamanho, igual à imagem.
- Se o áudio vier em mp3, o ffmpeg converte para WAV.

### Um ponto só para a voz (`lib/voice/sintetizar.ts`, novo)
- Ordem: **1. Hugging Face → 2. Gemini-TTS** (só enquanto a credencial existir; sai na parte 6) **→ 3. Piper** do voice-engine.
- O Piper antes era reserva só da voz da Aura. Agora vale para tudo.
- Todo áudio sai no mesmo formato (24 kHz, mono). O Piper (22 kHz) e áudio estéreo são convertidos, para o podcast não sair acelerado ou lento quando junta pedaços de provedores diferentes (`normalizarWav` em `lib/studio/wav.ts`).

### Quem passa a usar a voz nova
- **Voz da Aura** (`app/api/ai/voice/route.ts`): não manda mais o erro cru do Google para a tela. Sem voz, a resposta é "A voz está fora do ar agora.".
- **Podcast** (`lib/studio/podcast-pipeline.ts`): continua com **duas vozes**, a feminina e a masculina, uma fala por vez.
- **Vídeo do Studio** (`lib/studio/video-pipeline.ts`), **narração da aula** (`lib/aula-interativa/narracao.ts`) e **vídeo-doc** (`lib/videodoc/gerar-server.ts`).

### Quando a voz está fora do ar
- Podcast e vídeo mostram **"A geração de podcast/vídeo está fora do ar agora."**, e não mais "Pode tentar de novo".

### O que fica para depois
- **Cyberespaço e lounge 3D** (`lib/cyber/vozZaeon.ts`, `app/api/lounge3d/[id]/zaeon/voz/route.ts`): é outra seção, fica para o **PR 2b**.

## Para o Martinez

- **Provedor e custo são área dele.** Cada trecho de voz gasta créditos da conta do HF, no provedor fal-ai.
- Funciona com o `HF_TOKEN` que já está no servidor. O token precisa da permissão "Make calls to Inference Providers", a mesma do chat e da imagem.
- **Variáveis novas, todas opcionais** (o `deploy.yml` já passa todas):
  - `HF_VOZ=0`: desliga só a voz pelo HF.
  - `HF_VOZ_F` / `HF_VOZ_M`: trocam a voz feminina e a masculina (pf_dora, pm_alex, pm_santa).
  - `HF_VOZ_TIMEOUT_MS`: tempo máximo de cada trecho (padrão 30 s).
- O Piper só funciona se o voice-engine estiver no ar (`WITH_VOICE=true` no deploy). Sem ele, a reserva falha rápido e não trava nada.
- Não precisa de `prisma db push`.

## Testes automáticos

- `lib/voice/hf-voz.test.ts` (novo, 13 testes):
  - liga só com `HF_TOKEN`; `HF_RESERVA=0` e `HF_VOZ=0` desligam;
  - os nomes antigos viram a voz certa, e voz inválida em `HF_VOZ_F` cai na padrão;
  - o pedido vai para o Kokoro pt-BR pelo router;
  - texto longo vira trechos que respeitam o limite, sem perder texto;
  - WAV de 22 kHz, estéreo e float viram 24 kHz mono 16-bit, com a mesma duração;
  - mp3 passa pelo conversor; o áudio só é baixado de host de provedor;
  - um pedido por trecho, com os áudios juntados; o erro não vaza o token.
- `lib/voice/sintetizar.test.ts` (novo, 9 testes):
  - com o HF ligado, o Google nem é chamado;
  - HF falhou → Google; Google 403 → Piper; sem credencial Google, pula direto para o Piper;
  - ninguém respondeu → "voz indisponível" com o motivo de cada um, e o podcast e o vídeo mostram "fora do ar";
  - os 5 lugares que falam usam a voz nova, e o deploy passa as 4 variáveis.
- `lib/agent/imagem883.test.ts`: ajustado para a frase nova do vídeo (imagem ou voz).
- `tsc` e lint sem erros nos arquivos deste PR (os 7 erros de `convites` são do cliente do Prisma local, iguais aos da `main`).
- O tamanho do script do deploy ficou em 19.195 bytes, abaixo do limite de 19.500 que o teste confere na CI.

## Verificado na prévia

- A prévia local não tem o token do HF, então não dá para gerar voz aqui.
- Fica coberto pelos testes e pelo teste em produção abaixo.

## Como testar em produção (depois do deploy, F5 antes)

1. **Voz da Aura:** numa conversa, aperte o botão de ouvir a resposta. A voz é feminina, em português.
2. **Podcast:** no Studio, gere um podcast curto. Saem **duas vozes diferentes**, uma feminina e uma masculina, e a velocidade é normal.
3. **Vídeo do Studio:** gere um vídeo. As cenas têm narração.
4. **Aula interativa:** gere uma aula com narração. Ela toca até o fim, inclusive os trechos longos.
5. **Fora do ar** (só se o HF falhar): o podcast mostra "A geração de podcast está fora do ar agora", sem "tentar de novo".

## Resultado dos testes

| Teste | Resultado |
|---|---|
| Testes novos de voz | ✅ 27/11: `hf-voz` 13, `sintetizar` 9 |
| Suíte completa (27/11) | ✅ 824 arquivos passando; as 29 falhas são do Windows (compose, links simbólicos, caminhos) e nenhuma toca voz, áudio, podcast ou vídeo |
| 1. Voz da Aura | ⏳ falta testar |
| 2. Podcast com duas vozes | ⏳ falta testar |
| 3. Vídeo do Studio | ⏳ falta testar |
| 4. Aula interativa | ⏳ falta testar |
| 5. Fora do ar | ⏳ só se acontecer |
