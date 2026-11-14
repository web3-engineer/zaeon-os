# Testes do #764 — gráfico garantido, imagem, título, referência, 3D de anatomia e microfone

Achados nos testes do #756 (11/11).

## O que muda

1. **Gráfico pedido sempre aparece** (`lib/agent/aura-harness.ts`, `lib/chat/graficoDados.ts`).
   - Quando a pessoa pede gráfico, a Aura também manda os números no campo `grafico`.
   - Se o texto vier sem o desenho, o código põe as barras no fim da resposta (`blocoDoCampoGrafico`).
2. **"faça uma imagem do coração humano" vira imagem** (`lib/agent/runChatTurn.ts`, `lib/rag/cacheRespostas.ts`).
   - A causa era o **cache de respostas**: antes do #756 esse pedido virava explicação, a resposta ficou guardada e continuava sendo servida.
   - Pedido de imagem não consulta mais o cache, e as respostas antigas deixam de valer (`CACHE_VERSAO` 2).
3. **Título da imagem é o assunto** (`lib/studio/tituloImagem.ts`): "Imagem — vulcão em erupção", não o pedido inteiro.
4. **Referência usada volta ao rodapé** (`lib/rag/citar.ts`). "Não trazem…, mencionando apenas … (ENEM 2022 — questao_74)" agora conta como uso. "Não abordam…, mas podemos…" continua negação.
5. **3D de anatomia no chat**:
   - **Fica na conversa:** a anatomia entrou no que é guardado pelo número (`StudyCoworkChat.tsx`). Ao reabrir, o cartão busca o estado em `/api/studio/<id>` (`AnatomiaView.tsx`).
   - **Abre enquadrado:** a cena reservava as margens dos painéis da página /anatomia (110 px em cima, 170 embaixo); no cartão de 300 px sobravam 40 px. No cartão, a margem é a do cartão (`lib/anatomia/cena.ts`, opção `cartao`).
   - **Com a cor do sistema:** o realce verde de seleção pintava a estrutura isolada. No cartão, sem realce.
   - **Nome em português:** "coração", não "heart" (`lib/anatomia/nomeNaTela.ts`).
   - **"Abrir o atlas" abre na estrutura:** `/anatomia?estrutura=FMA7088`.
6. **Imagem gerada**:
   - A legenda em inglês (o pedido ao gerador) saiu da tela (`StudioArtifactViews.tsx`).
   - No pedido de imagem, a Aura termina o texto com a lista das partes e de como reconhecer cada uma.
7. **Microfone**:
   - Frases com espaço: "mim. Por favor. Ok." (`juntarFala` em `lib/voice/useSTT.ts`).
   - Sem o aviso "desligou depois da pausa" quando o texto chegou certo.
   - A pose é a **mão na cabeça**: o gesto `fidget_hair`, congelado em 1,4 s (antes: "pensar", mão no queixo).

## Para o Martinez

- **Anatomia (5):**
  - `lib/anatomia/cena.ts`: opção nova `cartao` (margem e realce); a página /anatomia não muda.
  - `CenaDoCorpo.tsx` repassa `cartao`.
  - `AtlasDoCorpo.tsx`: igual ao da main (o link é o `?estrutura=` do #777).
  - `app/api/studio/anatomia`: `nomeNaTela` no `meta` e no título.
- **Avatar (7):** a mensagem `gesto` ganhou `nome` (`avatarMensagens.ts`, `avatar.worker.ts`, `avatarCena.ts`); sem nome, segue igual.
- **Harness (1, 2, 6):**
  - `aura-harness.ts`: duas linhas de prompt condicionais e o campo `grafico`.
  - `runChatTurn.ts`: pedido de imagem fora do cache.
  - `CACHE_VERSAO` subiu para 2, então as respostas guardadas deixam de ser servidas e o cache se refaz.
- **Microfone com a avatar, aba aberta há horas:** **não mexido**. Numa aba nova funciona. Na aba antiga, o microfone fica sem texto mesmo com a avatar congelada. Suspeita: memória da página com o tempo (junto do vazamento de memória).
- Não precisa de `prisma db push`.

## Como testar em produção (depois do deploy, F5 antes)

1. **Gráfico:** "faça um gráfico da população de cada região do Brasil" (conversa nova). As 5 barras aparecem.
2. **Imagem do coração:** "faça uma imagem do coração humano" (conversa nova).
   - Vem **imagem**, sem diagrama.
   - O título é curto ("Imagem — coração humano").
   - Não aparece legenda em inglês embaixo.
   - O texto termina com a lista das partes.
3. **Referência:** "faça uma imagem de um vulcão em erupção" com a Minha base ligada. Se a Aura citar uma questão no texto, ela aparece no rodapé.
4. **3D do coração:** "desenhe a anatomia do coração humano".
   - O cartão diz "coração".
   - Em **Ver em 3D**, o coração aparece **grande e avermelhado**, sem precisar de zoom.
   - Troque de conversa e volte (ou F5): o cartão continua lá.
   - **Abrir o atlas** abre já no coração.
5. **Microfone** (aba nova):
   - Toque no 🎤 e diga duas frases com pausa: o texto vem com espaço depois do ponto.
   - Quando desligar sozinho com texto, não aparece aviso.
   - Com a avatar aberta, ela leva a mão à cabeça e para.
