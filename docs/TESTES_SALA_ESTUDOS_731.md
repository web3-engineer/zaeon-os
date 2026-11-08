# Testes do #731 — melhorias na Sala de Estudos

## O que muda

- **1. Cartolina legível na sala vazia:** o estilo da cartolina passa a valer na Sala inteira (barra, sala vazia e erro), e não só com um blueprint aberto. O aviso "Nenhum blueprint ainda" passou de contraste 1,07 para 5,40, medido no ar, e a barra ganha a letra de mão.
- **2. Blueprint que não abre:** em vez de "carregando o blueprint…" sem fim, aparece "Não deu para abrir este blueprint agora." com o botão "tentar de novo".
- **3. Desfazer ao excluir:** depois de confirmar, aparece "“X” foi excluído." com o botão **desfazer** por 6 segundos. O pedido ao servidor só sai depois disso. Se a pessoa sair da página antes, ele sai na hora. Se o servidor recusar, o blueprint volta para a lista com um aviso.
- **4. Botões do tamanho do dedo:** em tela de toque, os botões de skin, letra, abrir a conversa, renomear, excluir e zoom ficam com 40 px; renomear e excluir ficam lado a lado.
- **5. Zoom com dois dedos na prancha:** a pinça aumenta e diminui, com o ponto entre os dedos parado.
- **6. Botões de zoom com nome:** "Diminuir o zoom", "Aumentar o zoom", "Voltar pro foco" e "Ver a prancha inteira".
- **7. Sala vazia com caminho:** botão "conversar com a Aura →", que abre o chat.
- **8. Conversa apagada:** o "← abrir a conversa" confere antes se a conversa existe. Apagada, o aviso aparece na Sala e a pessoa não sai dela. Sem resposta certa (sem rede, ou com 200 conversas ou mais), vai para o chat como antes.
- **9. Faixa do fundo opaco:** o grupo da busca fica preso na borda da barra, e a faixa de 12 px com os blueprints rolando por trás some.
- **10. Avisos na cor da skin:** "carregando o blueprint…", o aviso da avaliação, o aviso de falha e o "desfazer" seguem a skin (creme na cartolina, vidro rosa na barbie).
- **11. Prova sem vermelho na cartolina:** o texto digitado no campo de prova fica na cor da tinta.
- **12. Menos pedidos a cada 20 segundos:** a recarga da lista só relê o blueprint aberto quando a data dele mudou no servidor. Antes eram 2 pedidos a cada 20 segundos, agora é 1.

## Para Martinez

- **Tudo é área dele:** a Sala de Estudos (`components/blueprint/`).
- **O chat não foi mexido.** A Sala só usa o caminho que já existe para ir ao chat (`irPraAbaEstudos`, `pedirConversa`) e lê a lista de conversas (`/api/ai/conversas`).
- **Não precisa de `prisma db push`.**

## Testes automáticos

- `components/blueprint/useBlueprint.test.tsx`:
  - desfazer sem DELETE;
  - sair com exclusão esperando manda o DELETE;
  - falha ao abrir;
  - a recarga não relê o aberto sem mudança;
  - os testes de excluir ajustados ao desfazer.
- `components/blueprint/SalaBlueprint.test.tsx` (novo):
  - cartolina na sala vazia;
  - o botão para o chat;
  - falha ao abrir com "tentar de novo";
  - conversa apagada e conversa que existe;
  - o desfazer.

## Como testar em produção

1. **Cartolina vazia:** sem blueprints e na skin cartolina, o aviso "Nenhum blueprint ainda" dá para ler, com letra de mão.
2. **Sala vazia:** o botão "conversar com a Aura →" abre o chat.
3. **Desfazer:** com 2 blueprints, exclua um e clique em "desfazer". Ele volta. Exclua de novo e espere uns 6 segundos: some de vez. Recarregue e confira que não voltou.
4. **Conversa apagada:** apague a conversa de um blueprint e clique em "← abrir a conversa". O aviso aparece na Sala e você continua nela.
5. **Faixa:** com muitos blueprints, role a lista para o lado. Nada aparece na beirada esquerda da barra.
6. **Avisos:** na cartolina e na barbie, "carregando o blueprint…" e o "desfazer" aparecem na cor da skin.
7. **Celular:** os botões são fáceis de tocar, e dá para dar zoom na prancha com dois dedos.
8. **Prova (cartolina):** digite um link no campo de prova de um crítico. O texto fica na cor da tinta, não vermelho.
9. **No computador:** a Sala continua como antes.
