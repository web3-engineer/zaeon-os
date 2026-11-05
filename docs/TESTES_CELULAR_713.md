# Testes do #713 — o site da Zaeon bom de usar no celular

## O que muda

Só em tela pequena. No computador, tudo continua igual, menos a cor do "Ver mapa" aberto no tema claro.

- **Caixa de texto do chat:** no celular, Minha base, agente, modelo, Modo pesquisa e Árvore ficam recolhidos num botão (⚙ de opções) da caixa. Com o Modo pesquisa ou a Árvore ligados, o botão ganha um ponto. Os anexos continuam sempre à vista.
- **Botões do tamanho do dedo:** os da caixa de texto passam a 44 px no celular, e os de sub-tema, renomear e excluir das conversas passam a 44 px em tela de toque.
- **Menu do celular fecha ao escolher uma conversa:** antes, a lista de conversas entrava na gaveta por um "portal" do React, e o clique nela não chegava ao código que fecha a gaveta.
- **Abas da conversa:** no celular, o "Ver mapa" vira só a bolinha, e as abas de documento cortam o nome em 96 px. Assim a aba "Conversa" e as dos documentos aparecem.
- **"Ver mapa" aberto no tema claro:** o texto fica escuro. Antes era quase branco sobre azul-claro.
- **Mapa no celular:** "Voltar à conversa", ↻, "Mapas anteriores", "Etapa X de Y" e o "Apliquei" entram no alto, antes da lista das etapas. Antes ficavam todos soltos por cima da primeira etapa.
- **Diagrama no celular:** cabe na largura da tela, e a barra de Caminho, Lente, busca e zoom vai para baixo dele, inteira. Antes o archify deixava o diagrama com no mínimo 720 px, rolando para o lado, e a barra escondia o +. Testado no diagrama real da fotossíntese em 375 px: o zoom funciona.
- **Sala de Estudos no celular:** a barra quebra em linhas. Em cima ficam a skin e a letra, depois a busca com as ações (abrir a conversa, renomear, excluir) e, embaixo, a lista de blueprints rolando para o lado. A legenda da prancha sobe, para não cobrir os botões de zoom.
- **Menu do site no celular:** um botão ☰ ao lado do tema abre Documentação, Sobre nós, Laboratório, Assistentes e Notícias.
- **Login sem zoom no iPhone:** o campo de e-mail fica com 16 px no celular, na `/login` e no painel do menu.

## O que ficou de fora

- **Página inicial mais rápida (item 14):** com o navegador já tendo aberto o site antes, a página carrega em uns 3 s. O tempo maior da primeira visita vem da pré-carga do Cyberespaço (`lib/cyber/precarga.ts`), que baixa os sons e o código do jogo já na página inicial, para ele abrir na hora. Os corpos 3D pesados já ficam de fora no celular. Mudar isso é decisão do Martinez, e precisa de uma medição com o cache limpo. Fica para um card próprio.
- O app separado do celular (`/m`) continua desligado e não foi mexido.

## Para Martinez

- **Áreas dele:** a navbar (o ☰ novo), o mapa (`CerebroPanel`), o diagrama (o estilo injetado no HTML do archify, sem mexer no `vendor/archify`) e a Sala de Estudos.
- **Não precisa de `prisma db push`.**

## Testes automáticos

- `components/study/CoworkComposer.test.tsx`: opções recolhidas no celular, botão abre e fecha, ponto com opção ligada, anexos sempre à vista, botões de 44 px.
- `components/studio/DiagramView.test.tsx`: o estilo do celular entra no `<head>` do diagrama.
- **Não testado na tela:** o site não roda neste computador (falta o banco). Só o diagrama foi testado de verdade, injetando o mesmo estilo no diagrama real. O resto é conferido pela lista abaixo.

## Como testar em produção (no celular)

1. **Chat:** a conversa tem espaço para ler. Toque no botão de opções da caixa: aparecem Minha base, agente, modelo, Modo pesquisa e Árvore.
2. **Sugestões:** numa conversa nova, as três sugestões aparecem acima da caixa de texto.
3. **Menu:** abra o Menu, toque numa conversa: o menu fecha e a conversa abre.
4. **Botões:** os de sub-tema, renomear e excluir das conversas são fáceis de tocar.
5. **Abas:** com um diagrama aberto, a aba "Conversa" e a do diagrama aparecem, e o mapa vira só a bolinha.
6. **Mapa:** abra o mapa: os botões do alto e o "Apliquei" ficam em cima, e as etapas começam depois deles.
7. **"Ver mapa" no tema claro:** com o mapa aberto, o texto do botão dá para ler.
8. **Diagrama:** aparece inteiro na largura, e a barra de baixo mostra o zoom com o + e o −.
9. **Sala de Estudos:** a busca, os botões e a lista de blueprints aparecem. A legenda não cobre o zoom.
10. **Menu do site:** na página inicial, o ☰ abre Documentação, Sobre nós, Laboratório, Assistentes e Notícias.
11. **Login no iPhone:** tocar no e-mail não dá zoom.
12. **No computador:** chat, mapa, diagrama, Sala e menu continuam como antes.
