# Testes do #705 — chat da Aura: abrir a conversa certa, aviso de internet, Modo pesquisa e mapa

## O que muda

- **Abrir a conversa do blueprint:** se a conversa não está na lista do navegador, o chat busca no servidor e abre. Se ela não existe mais, aparece "A conversa deste blueprint não está mais disponível", e o chat não muda de conversa. Antes o pedido era ignorado, e o chat ficava na conversa aberta.
- **Modo pesquisa:** a pergunta gravada no servidor leva se o Modo pesquisa estava ligado. A conversa aberta em outro navegador vem com ele ligado.
- **Aviso de internet:** sem conexão, o chat mostra "Sem conexão. Sua mensagem fica na caixa de texto até a internet voltar." e não manda a mensagem. Se a rede cair no meio do envio, a pergunta volta para a caixa de texto, com o aviso. Quando a internet volta, o aviso some.
- **Botão ⌄ e cronômetro:** ficam logo acima da caixa de texto, que muda de altura. Antes ficavam a 96 px do fundo e cobriam a barra de baixo.
- **Títulos repetidos:** na lista, conversas com o mesmo nome ganham a data, e a hora se forem do mesmo dia. O título guardado não muda.
- **Diagrama na resposta:** a conversa vinda do servidor mostra o diagrama dentro da resposta, sem um balão separado só com o nome. Vale também para o Modo pesquisa.
- **Mapa:** a etapa seguinte mostra só ◀, com "◀ Próxima etapa" na legenda. As etiquetas ficam fora da faixa dos botões do alto e da legenda. O erro do Apliquei aparece dentro da caixinha. A dica "↻ Arraste para girar o mapa" fica maior, no centro.

## Para Martinez

- **Não precisa de `prisma db push`:** o Modo pesquisa vai no `meta` da mensagem, que já existe.
- O chat do celular (`/m`) não muda.

## Limitações conhecidas

- O Modo pesquisa só chega ao outro navegador depois de uma pergunta feita com ele ligado. Ligar e não perguntar não é guardado no servidor.
- Uma conversa sem nenhuma mensagem no servidor (antiga, de antes do #663) não tem como ser aberta: aparece o aviso.
- A busca de uma conversa de fora mostra só a primeira página da lista do servidor (até 200 conversas).

## Testes automáticos

- `lib/chat/threads.test.ts`: títulos repetidos ganham data e hora.
- `lib/chat/conversasServidor.test.ts`: o Modo pesquisa vai na pergunta e volta da última, e o diagrama entra na resposta.
- `components/cerebro/CerebroPanel.test.tsx`: o erro do Apliquei fica dentro da caixinha.
- **Não testado:** o aviso de internet, o botão ⌄ e o "abrir a conversa" na tela (o chat inteiro não tem teste de componente). A lista abaixo confere isso.

## Como testar em produção

1. Na Sala de Estudos, em blueprints diferentes, clique em "← abrir a conversa": cada um abre a sua conversa.
2. Num blueprint cuja conversa foi apagada: aparece o aviso, e o chat fica na conversa de antes.
3. Ligue o Modo pesquisa numa conversa, mande uma pergunta e abra a conversa em outro navegador: aparece ligado.
4. Com F12 → Rede → Offline, mande uma mensagem: aparece o aviso, e o texto continua na caixa. Volte a conexão: o aviso some.
5. Role a conversa para cima: o ⌄ aparece acima da caixa de texto, sem cobrir "Minha base".
6. Duas conversas com o mesmo começo: na lista, os nomes ficam diferentes.
7. Peça um diagrama e abra a conversa em outro navegador: o diagrama aparece dentro da resposta.
8. Abra o mapa: só ◀ na etapa seguinte, e "◀ Próxima etapa" na legenda.
9. Gire o mapa: nenhuma etiqueta cobre os botões do alto, o aviso "Aplicado!" nem a legenda.
10. Sem internet, envie o Apliquei: o aviso aparece dentro da caixinha.
11. Numa janela anônima: a dica "↻ Arraste para girar o mapa" aparece no centro, e some ao girar.
