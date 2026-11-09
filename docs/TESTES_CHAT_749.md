# Testes do #749 — pedido de gráfico, A−/A+ no diagrama e microfone

Achados nos testes do #745 e do #733 (09/11). O Martinez liberou mexer na parte do harness (itens 1 a 3).

## O que muda

1. **Gráfico de verdade.** "faça um gráfico da população do Brasil por região" ia para o gerador de **imagem** (um mapa com bonequinhos e nenhum número) ou virava **diagrama**. Agora é um **gráfico de barras** dentro da resposta, com os números e a fonte embaixo.
   - O pedido é reconhecido por `pedeGraficoDeDados` (`lib/agent/matematica.ts`). Gráfico de função e de geometria continuam como antes.
   - O roteador manda o pedido para o texto (`router.ts`), sem diagrama extra (`aprender.ts`). "gráfico" saiu da regra que mandava para imagem (`aura-harness.ts`).
   - A diretriz ensina o bloco ```` ```grafico ```` com `"barras"`, e a `"fonte"` é obrigatória: sem ela, o gráfico não é desenhado.
   - O desenho é o mesmo SVG dos gráficos do G3 (`lib/agent/grafico.ts`), feito pelo `GraficoDados`. Embaixo aparece "Fonte: … · números citados pela Aura".
2. **Quando a base não tem o dado.** Antes, se os documentos eram do assunto mas não tinham o número, a Aura parava em "a base não tem os dados". Agora ela avisa em uma frase e responde com o que sabe, dizendo a fonte, sem atribuir esse dado à base (`lib/rag/citar.ts`).
3. **"Trechos usados por documento" só quando ajuda.** Esse gráfico não aparece quando todos os documentos têm o mesmo número (no ar, eram 10 questões, todas com 1). Também não aparece quando a pessoa pediu um gráfico de outra coisa (`graficosDoTurno.ts`).
4. **Título da imagem.** "Imagem — imagem: …" virou só "Imagem — …" (`app/api/studio/image/route.ts`).
5. **A imagem volta ao reabrir a conversa.** A conversa guarda o número da imagem, como já fazia com o diagrama, e a tela busca o arquivo por esse número (`StudyCoworkChat.tsx`, `StudioBlock.tsx`, `studioClient.ts`). O gráfico de barras novo volta junto porque fica no próprio texto da resposta.
6. **A−/A+ no diagrama.** Com o diagrama aberto na aba, o A−/A+ não fazia nada. Agora ele afasta e aproxima o diagrama, chamando o zoom do próprio archify por `postMessage` (`DiagramView.tsx`, `ChatZoom.tsx`).
7. **Microfone que não entendeu.** Quando o navegador ouve a fala mas devolve vazio, aparece **"Não entendi o que você falou. Toque no microfone e tente de novo, falando um pouco mais devagar."** Antes aparecia "desligou depois da pausa" (`lib/voice/useSTT.ts`).
8. **Microfone ouvindo por mais tempo.** O microfone do chat ouve no modo contínuo e desliga sozinho depois de 2,5 s de pausa. Se ninguém falar, desliga em 10 s com "Não ouvi nada". As outras telas que usam o microfone (a resposta por voz da aula e o modo voz) continuam como estavam.

## Para Martinez

- **Harness:**
  - `lib/agent/matematica.ts`: diretriz e `pedeGraficoDeDados`.
  - `router.ts` e `aprender.ts`: o pedido de gráfico de dados vai para o texto.
  - `aura-harness.ts`: "gráfico" saiu da regra da imagem, e o `objetivo` passa a ir para o `graficosDoTurno`.
  - `lib/rag/citar.ts`: uma frase nova no bloco `ok`.
  - `graficosDoTurno.ts`: regra nova da cobertura.
- **Lei do `grafico.ts` (o número não vem do modelo):** o G3 continua do mesmo jeito. O gráfico de barras novo só aparece quando a pessoa **pede** um gráfico, exige `fonte` e mostra "números citados pela Aura".
- **Não precisa de `prisma db push`.**

## Testes automáticos

- `lib/chat/graficoDados.test.ts` (novo):
  - o pedido do ar vira gráfico de dados e vai para o texto, sem diagrama e sem imagem;
  - o parser exige fonte e pelo menos 2 números;
  - o rótulo é escapado no SVG;
  - a cobertura some quando os valores são todos iguais ou quando o pedido é outro gráfico.
- `components/study/ChatMarkdown.test.tsx`: ```` ```grafico ```` com barras vira gráfico de barras, com a fonte.
- `lib/rag/citar.test.ts`: a regra "trecho sem o dado".
- `components/studio/StudioBlock.imagem.test.tsx` (novo): a imagem reaberta vem por `/api/studio/<id>/file`.
- `components/studio/DiagramView.test.tsx`: o script de zoom vai no diagrama, e o A−/A+ chega só ao diagrama certo.
- `components/chat/ChatUx.test.tsx`: no diagrama, o A−/A+ vira "Afastar/Aproximar o diagrama" e nunca fica travado.
- `lib/voice/useSTT.test.ts`:
  - "não entendi";
  - o modo contínuo desliga depois da pausa;
  - "não ouvi nada" em 10 s.

## Como testar em produção (depois do deploy, F5 antes)

1. **Gráfico:** mande "faça um gráfico da população do Brasil por região". Tem que vir o texto com os números e um **gráfico de barras** com as 5 regiões, com "Fonte: … · números citados pela Aura" embaixo. Não pode vir imagem nem diagrama.
2. **Base sem o dado:** com a Minha base ligada, faça o mesmo pedido. Se a base não tiver os números, a Aura avisa em uma frase e mostra os números mesmo assim.
3. **Sem "Trechos usados por documento"** nesse pedido.
4. **Imagem:** mande "faça uma imagem da mitocôndria". O título aparece "Imagem — …", sem "imagem:" repetido. Troque de conversa e volte: a imagem continua lá.
5. **Reabrir o gráfico:** troque de conversa e volte na do gráfico. O gráfico de barras continua lá.
6. **A−/A+ no diagrama:** abra um diagrama na aba e aperte A+ e A−. O diagrama aproxima e afasta. Volte para a aba Conversa: o A−/A+ volta a mudar o tamanho das letras.
7. **Microfone (Edge ou Chrome):**
   - Toque no 🎤 e fale uma frase. O texto aparece, e uns 2 segundos depois de você parar de falar ele desliga com "O microfone desligou depois da pausa".
   - Toque no 🎤 e fique calado. Em 10 segundos aparece "Não ouvi nada".
   - Se o navegador não entender, aparece "Não entendi o que você falou…".
