# Testes do #883 (parte 1): imagem sem o Google

Achado no teste do #764 em 27/11: nenhuma imagem saía, nem a do vulcão. O diagnóstico do Studio (`/api/studio/diag`) mostrou o Google devolvendo **403 "requires billing to be enabled"**. O Martinez pediu para tirar o Google da equação. Este PR faz a parte 1 do card: a imagem.

## O que muda

### Imagem pelo Hugging Face (`lib/ai/hf-image.ts`, novo)
- A imagem passa a ser gerada pelo **Hugging Face**, com o **mesmo `HF_TOKEN`** que o chat já usa.
- Modelo padrão: **FLUX.1-schnell**, tentado em 4 provedores, um depois do outro: together → nebius → fal-ai → hf-inference. O primeiro que responder entrega a imagem.
- Cada provedor conhece o modelo por um id próprio. O id vem do mapeamento público do HF e fica guardado em memória.
- A proporção pedida (ex.: 16:9 no vídeo) vira o tamanho certo (1024 × 576).
- `lib/studio/imagen.ts`: **o HF vem primeiro**. O Google fica só como reserva enquanto a credencial existir; ele sai de vez na parte 6 do card.
- Isso vale para todo lugar que usa a imagem do Studio: o chat, o Studio, a prancha da cartolina e as cenas do vídeo.

### "Imagem do coração" não vira mais o 3D (`lib/agent/anatomiaDoTurno.ts`)
- "imagem", "ilustração", "figura" e "foto" entraram na lista de pedidos pelo nome.
- "faça uma imagem do coração humano" com o Osler agora gera a **imagem**.
- "desenhe o pulmão" e "como funciona o coração?" continuam mostrando a **peça do atlas**, como antes.

### Quando o gerador está fora do ar (`lib/studio/falhaArtefato.ts`)
- Antes: "Não consegui desenhar essa imagem agora. Pode tentar de novo.", e o próximo clique falhava igual.
- Agora: **"A geração de imagem está fora do ar agora. Se quiser, peça um diagrama ou um mapa mental do mesmo assunto."**
- Vale quando o motivo é falta de provedor, a cobrança do Google (403) ou todos os provedores do HF recusarem. Podcast e vídeo ganham a mesma frase.
- Erro passageiro (rede) continua com "Pode tentar de novo".

### O texto do pedido de imagem (`lib/agent/aura-harness.ts`)
- Com a base ligada, a bolha dizia "Nenhum dos documentos disponíveis contém instruções para criar uma imagem de um vulcão em erupção".
- Agora o turno sabe que a imagem é feita por outra ferramenta. A bolha fala do assunto da imagem e lista as partes.

### Revisão do PR #884 (Sourcery)
- **Download seguro:** o link da imagem só é baixado de host de provedor (fal.media, huggingface.co…), por https, sem seguir redirecionamento, com prazo e teto de 12 MB.
- **Sempre PNG:** JPEG/WebP viram PNG (a rota e o vídeo gravam `.png`).
- **Sem cobrar duas vezes:** só passa para o próximo provedor quando o atual recusou; se o pedido saiu e não voltou, para.
- **`HF_IMAGEM_MODELOS` com erro de digitação** não cai no padrão pago: avisa "HF_IMAGEM_MODELOS inválido".
- **Um prazo só** para HF + reserva Google, com folga para a rota responder.
- "foto", "fotos", "figuras" e "fotografias" também pedem imagem.
- Vídeo sem cena por falta de imagem mostra "fora do ar".
- `/api/studio/diag` testa o HF primeiro (`imagem`) e o Google como `imagem_reserva_google`.
- `deploy.yml` passa `HF_IMAGEM`, `HF_IMAGEM_MODELOS` e `HF_IMAGEM_TIMEOUT_MS` das Variables do GitHub.
- `docs/HF_PRIMARIO.md`: imagem do Studio ✅ no HF; avatares ficam no Google.

### O que fica para depois
- **Avatares** (`lib/avatars/gemini-image.ts`): eles **editam** uma imagem mantendo o personagem, e isso o FLUX.1-schnell não faz. Fica para um PR próprio, com um modelo de edição.

## Para o Martinez

- **Provedor e custo são área dele.** Cada imagem gerada gasta créditos da conta do HF.
- Funciona com o `HF_TOKEN` que já está no servidor. O token precisa da permissão "Make calls to Inference Providers", a mesma que o chat já usa.
- **Variáveis novas, todas opcionais:**
  - `HF_IMAGEM_MODELOS`: troca a lista de modelos e provedores, no formato `modelo:provedor` separado por vírgula. Provedores entendidos: together, nebius, fal-ai e hf-inference.
  - `HF_IMAGEM=0`: desliga só a imagem pelo HF.
  - `HF_IMAGEM_TIMEOUT_MS`: tempo máximo de cada tentativa (padrão 45 s).
- `HF_RESERVA=0` continua desligando o HF inteiro, imagem incluída.
- Não precisa de `prisma db push`.

## Testes automáticos

- `lib/ai/hf-image.test.ts` (novo, 13 testes):
  - liga só com `HF_TOKEN`; `HF_RESERVA=0` e `HF_IMAGEM=0` desligam;
  - a lista padrão e a troca por `HF_IMAGEM_MODELOS`;
  - a proporção vira tamanho;
  - o pedido de cada provedor (URL e corpo);
  - o mapeamento do HF nos dois formatos;
  - a leitura da resposta: bytes, base64, data URL e link (só https);
  - provedor recusou → tenta o próximo; o id do mapeamento fica guardado;
  - nenhum respondeu → o erro traz o motivo de cada um, sem o token.
- `lib/studio/imagen.test.ts` (4 testes novos): o HF vem primeiro e o Google nem é chamado; HF falhou → reserva Google; sem Google, o motivo do HF; a mensagem de indisponível não fala só de Google. Os 6 testes antigos do Google continuam passando.
- `lib/agent/imagem883.test.ts` (novo, 7 testes): "imagem/ilustração/figura/foto" do coração não viram 3D; "desenhe o pulmão" e "fotossíntese" continuam com a peça; a frase de fora do ar; a linha nova do prompt; o HF antes do Google na rota.
- Suíte completa (27/11): 817 arquivos passando. As 34 falhas são do ambiente do Windows (skills, links simbólicos, compose, docx, caminhos) e falham igual na `main` sem esta mudança (conferido em 6 delas com a mudança guardada). Nenhuma toca imagem, anatomia ou o harness.
- `tsc`: só os 7 erros de `app/api/estudos/convites` e `lib/estudos/convites-board.ts`, porque o cliente do Prisma local não tem o `conviteBoard` novo da `main`. Nenhum nos arquivos deste PR.

## Verificado na prévia

- A prévia local não tem o token do HF nem o banco, então não dá para gerar imagem aqui.
- Fica coberto pelos testes e pelo teste em produção abaixo.

## Como testar em produção (depois do deploy, F5 antes)

1. **Imagem:** numa conversa nova, "faça uma imagem de um vulcão em erupção". A imagem aparece.
2. **Texto da bolha:** na mesma resposta, a bolha fala do vulcão e lista as partes, sem "nenhum documento contém instruções".
3. **Coração com o Osler:** escolha o Osler · Medicina e peça "faça uma imagem do coração humano". Vem **imagem**, não o cartão 3D.
4. **3D continua:** com o Osler, "desenhe a anatomia do coração humano". Vem o cartão 3D, como antes.
5. **Studio:** no Studio, gere uma imagem pelo botão de imagem. Ela aparece.
6. **Fora do ar** (só se o HF falhar): a mensagem é "A geração de imagem está fora do ar agora…", sem "tentar de novo".

## Resultado dos testes

| Teste | Resultado |
|---|---|
| Testes novos e de imagem | ✅ 27/11: `hf-image` 13, `imagen` 10, `imagem883` 7 |
| Revisão do #884 (27/11) | ✅ `hf-image` 19, `imagen` 10, `imagem883` 12, lint e tsc limpos |
| Suíte completa (27/11) | ✅ 817 arquivos passando; as 34 falhas são do Windows e iguais às da `main` |
| 1. Imagem | ⏳ falta testar |
| 2. Texto da bolha | ⏳ falta testar |
| 3. Coração com o Osler | ⏳ falta testar |
| 4. 3D continua | ⏳ falta testar |
| 5. Studio | ⏳ falta testar |
| 6. Fora do ar | ⏳ só se acontecer |
