# Testes do #883 (parte 2b): a voz do cyberespaço sem o Google

A parte 2a (#885) passou a voz da Aura, do podcast, do vídeo e da aula para o Hugging Face. Faltava a Zaeon do cyberespaço e do lounge 3D, que ainda chamava o Gemini-TTS direto. Como o Google responde **403 "requires billing"**, o holograma ficava sem voz: o balão saía mudo. Este PR fecha a parte da voz.

## O que muda

- **Rota da voz do lounge** (`app/api/lounge3d/[id]/zaeon/voz/route.ts`): passa a usar o mesmo ponto de voz do resto da Zaeon (`lib/voice/sintetizar.ts`).
  - Ordem: **1. Hugging Face (Kokoro, feminina pt_BR) → 2. Gemini-TTS** (só enquanto a credencial existir) **→ 3. Piper**.
  - Antes a rota não tinha o Piper de reserva. Agora tem.
  - Continua igual: limite próprio "cyber-voz", só a voz da Zaeon, cache das falas fixas (a 2ª pessoa não paga) e prazo de 12 s.
  - Sem voz, o balão sai mudo e a conversa segue, como antes.
- **Custo no ledger** (agente `cyber:zaeon-voz`), registrado com o provedor que falou:
  - Hugging Face: `huggingface` / `kokoro-pt-br`, sem custo por token (é cobrado na conta do HF);
  - Google de reserva: `vertex`, como antes;
  - Piper: é local e de graça, não entra no ledger.
- `lib/cyber/vozZaeon.ts`: só os comentários (a voz não é mais "Gemini-TTS, Leda").

## Para o Martinez

- **Provedor e custo são área dele.** Cada fala nova do holograma gasta créditos do HF (fal-ai). As falas fixas ficam em cache no servidor, então só a 1ª pessoa paga.
- Usa as mesmas variáveis da parte 2a (`HF_VOZ`, `HF_VOZ_F`, `HF_VOZ_TIMEOUT_MS`), que já estão no deploy. Não tem variável nova.
- Não precisa de `prisma db push`.

## Testes automáticos

- `app/api/lounge3d/zaeonVoz.test.ts` (atualizado, 7 testes):
  - continua: sem sessão 401, não-membro 404, texto vazio 400, limite próprio, cache das falas fixas, sala "dev" só em desenvolvimento;
  - a rota chama `sintetizarVoz` com a voz da Zaeon e sem o ✦;
  - voz pelo HF vai ao ledger como `huggingface`/`kokoro-pt-br`, sem custo de token, e o cliente não recebe o nome do provedor;
  - voz pelo Piper não entra no ledger;
  - nenhum provedor respondeu → 503, e o erro vai ao ledger;
  - a rota não chama mais o Gemini-TTS direto.
- `lib/voice/*` e `lib/cyber/*`: passando, sem mudança.
- `tsc` sem erros nos arquivos deste PR (os 7 erros de `convites` são do cliente do Prisma local, iguais aos da `main`).

## Verificado na prévia

- A prévia local não tem o token do HF, então não dá para gerar voz aqui.
- Fica coberto pelos testes e pelo teste em produção abaixo.

## Como testar em produção (depois do deploy, F5 antes)

1. **Tutorial do cyberespaço:** com uma conta nova no cyberespaço (ou a que ainda não fez o tutorial), fale com o holograma da Zaeon. Ela **fala em voz feminina, em português**, e a boca mexe junto.
2. **Fala com o seu nome:** a fala que diz o seu nome também tem voz (pode chegar 1 ou 2 segundos depois do balão).
3. **Capela:** quando o Droid leva você à capela, as frases da Zaeon têm voz.
4. **Sem voz** (só se o HF falhar): o balão aparece mudo e a conversa continua, sem travar.

## Resultado dos testes

| Teste | Resultado |
|---|---|
| `zaeonVoz.test.ts` | ✅ 27/11: 7/7; `lib/voice` e `lib/cyber` 101 arquivos passando |
| Suíte completa (27/11) | ✅ 823 arquivos passando; 29 falhas do Windows, as mesmas da parte 2a; o `imagen.test.ts` falhou só na suíte cheia (o prazo encurta com a máquina carregada) e passa 10/10 sozinho |
| 1. Tutorial com voz | ⏳ falta testar |
| 2. Fala com o nome | ⏳ falta testar |
| 3. Capela | ⏳ falta testar |
| 4. Sem voz | ⏳ só se acontecer |
