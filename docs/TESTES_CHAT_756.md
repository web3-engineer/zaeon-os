# Testes do #756 — gráfico legível, imagem, referências, versão nova, lista, "Aplicado!" e microfone com a avatar

Achados nos testes do #749 (09/11 e 11/11).

## O que muda

1. **Gráfico de barras legível e com todos os números** (`components/chat/GraficoDados.tsx`).
   - As barras viram texto da página, não uma imagem que encolhe.
   - No celular, o nome fica em cima da barra; no computador, do lado.
   - Toda barra tem o número com a unidade ("84,8 mi").
   - A letra acompanha o A−/A+.
   - Barra pequena nunca some, e zero mostra só o "0".
   - Os gráficos automáticos da resposta (G3) continuam como estavam.
2. **Ponto de milhar:** "84847187" vira "84.847.187" (`numeroBR` em `lib/chat/graficoDados.ts`).
3. **Porcentagem sem espaço:** "41,8%" dentro de fórmula saía "41, 8%".
   - A vírgula entre dígitos vira `{,}` antes do KaTeX (`virgulaDecimal`, usada no `Formula.tsx`).
   - A Aura também passa a ser orientada a não pôr número comum em fórmula (`lib/agent/matematica.ts`).
4. **Pedido de imagem vira imagem** (`lib/agent/router.ts`).
   - Nova regra fixa `pedeImagem`: verbo de pedir + imagem/ilustração/figura/foto/desenho vai para artefato, e o `pickStudioKind` escolhe "image". Ela manda mais que o palpite do modelo.
   - A lista do modelo do roteador passa a falar de imagem.
   - "o que é figura de linguagem" continua sendo explicação.
5. **Referências sem barra e sem fórmula** (`lib/rag/citar.ts`).
   - O título é desarmado sem barra (`tituloParaTela`), porque o chat não tira a barra e `\(` abria fórmula.
   - Agora "(MMLU pt)" e "questao_98" saem como são.
6. **Referência que não foi usada fica de fora** (`lib/rag/citar.ts`).
   - Um título que só aparece numa frase de "os materiais… não abordam / nenhum deles…" não entra em "Referências", nem quando o modelo lista o documento em `citacoes_base`.
   - O bloco da base também orienta: se nenhum trecho serve, não citar os títulos.
7. **Aviso de versão nova** (`components/sistema/AvisoVersaoNova.tsx`, `app/api/versao`).
   - Quando falta um pedaço do site (ChunkLoadError, o "Application error"), a página recarrega sozinha, no máximo uma vez por minuto.
   - Quando o commit do ar mudou (conferido ao voltar para a aba e a cada 10 min), aparece a faixa "Tem uma versão nova da Zaeon." com o botão **Atualizar**.
8. **Lista de conversas volta com a internet** (`StudyCoworkChat.tsx`): quando a internet volta, a lista do servidor é juntada de novo, sem trocar a conversa aberta.
9. **"Aplicado! O percurso avançou." some sozinho** (`CerebroPanel.tsx`). O aviso some em 6 s; o de "o mapa não atualizou" some em 12 s.
10. **Microfone com a avatar 3D** (`CoworkComposer.tsx`, `ZaeonDocumentos.tsx`, `lib/research/zaeonEventos.ts`, `lib/voice/useSTT.ts`).
    - Ao tocar no 🎤, aparece "Preparando o microfone…". A avatar faz a pose de pensativa e **congela** depois de 1 s; só então o microfone liga.
    - Quando ele desliga, por qualquer motivo, ela descongela.
    - Sem avatar na tela, o microfone liga na hora. Se ela travar, ele liga mesmo assim em 1,8 s.
    - O microfone nunca fica "Ouvindo…" para sempre: sem texto 5 s depois do fim da fala, ou 12 s depois do começo, ele desliga com "Não entendi o que você falou…".

## Para o Martinez

- **Deploy (item 7):**
  - linha nova no `app/layout.tsx` (`<AvisoVersaoNova />`);
  - rota nova `app/api/versao`, que devolve só o `GIT_SHA`, sem as sondas do health.
- **Mapa (item 9):** `CerebroPanel.tsx`, só o tempo do aviso.
- **Avatar (item 10):** `ZaeonDocumentos.tsx`.
  - Nada no worker nem na cena: usa as mensagens que já existiam (`sinais` com `escrevendo: true` para a pose de pensar, e `visivel: false` para congelar).
  - Se a avatar ainda estiver **baixando** ("A Aura está chegando…"), congelar não para o download.
- **Harness (item 4):** `router.ts`, a regra `pedeImagem` e uma frase no prompt do roteador.
- **Base (itens 5 e 6):** `lib/rag/citar.ts`. O `tituloSemMarkdown` continua existindo, só para reconhecer o formato antigo.
- Não precisa de `prisma db push`.

## Como testar em produção (depois do deploy, F5 antes)

1. **Gráfico no computador:** "faça um gráfico da população do Brasil por região".
   - As 5 barras aparecem, todas com o número e o "mi", com o nome da região do lado.
   - Embaixo aparece "Fonte: … · números citados pela Aura".
2. **Gráfico no celular** (ou na janela estreita): o nome fica em cima e a barra embaixo, com a letra legível. A+ aumenta a letra do gráfico.
3. **Porcentagem:** no texto da mesma resposta, "41,8%" sem espaço depois da vírgula.
4. **Imagem:** "faça uma imagem da mitocôndria" em conversa nova.
   - Vem **imagem**, não diagrama, com o título "Imagem — …".
   - Troque de conversa e volte: a imagem continua lá.
5. **Referências:** "crie uma ilustração da mitocôndria" com a Minha base ligada.
   - O rodapé não lista as questões de MMLU que não tratam do assunto.
   - Se aparecer algum nome com parênteses, ele sai normal, sem letra de fórmula.
6. **Versão nova:** deixe uma aba aberta e espere o próximo deploy. Ao voltar para a aba, aparece "Tem uma versão nova da Zaeon. **Atualizar**".
7. **Lista com a internet:**
   1. Desligue a internet e abra o chat; a lista mostra só as conversas do aparelho.
   2. Ligue a internet: a lista completa volta sozinha, sem F5.
8. **"Aplicado!":** no mapa, aplique uma etapa. O aviso some sozinho em uns 6 segundos.
9. **Microfone com a avatar aberta (Edge e Chrome):**
   - Toque no 🎤: aparece "Preparando o microfone…" e a avatar faz a pose de pensativa e para.
   - Em seguida aparece "Ouvindo… pode falar". Fale "o que é fotossíntese": o texto aparece na caixa.
   - Uns 2 s depois de parar de falar, o microfone desliga e a avatar volta a se mexer.
