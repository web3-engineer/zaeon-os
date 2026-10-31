# Testes do #663, PR 2 — guardar e apagar as conversas no servidor

## O que muda

- Cada mensagem é gravada na conversa aberta, com o título, em vez de ir para a conversa "geral" ou para o estudo em foco.
- Nova rota `/api/ai/conversas`: lista, guarda título e apaga.
- O chat junta a lista do servidor com a do navegador, e uma conversa criada em outro aparelho abre com as mensagens do servidor.
- Apagar remove a conversa, as sub-conversas e as mensagens no servidor. Sem conexão, o pedido fica na fila e a conversa não volta.
- Editar e regenerar também apagam no servidor as mensagens cortadas na tela.
- Diagrama e aula guardam só o número na mensagem.

Vale para a Sala de Estudos e a Sala de Pesquisa. **O chat do celular (`/m`) não muda.**

## Para Martinez, depois do merge

**Rodar `prisma db push` em produção.** O PR adiciona `parentScopeId` e `contextoHerdado`, opcionais, em `Conversation`. O código só usa esses campos com o cliente novo, gerado no deploy.

Pontos para conferir:

1. **Memória L3:** apagar não remove os `MemoryDrawer` derivados da conversa. Não mudei isso.
2. **Mapa:** apagar a conversa remove a linha de `Conversation`, mas não apaga o `MapaProbabilistico` ligado a ela.
3. **WhatsApp:** `lib/whatsapp/zaeon/contexto.ts` lê as conversas recentes da conta. Ele continua vendo as mensagens novas, e deixa de ver as apagadas.
4. **Mensagens antigas misturadas:** continuam no banco, fora da lista. Falta decidir se e quando apagar.
5. **`purgeUser`:** `ChatMessage` não tem campo de dono. Pela leitura do código, apagar a conta parece deixar as mensagens para trás. Não mudei isso.

## Limitações conhecidas

- As conversas antigas só existem no navegador até o PR 3. Elas continuam aparecendo ali, mas não em outro aparelho.
- A conversa só aparece em outro aparelho depois da primeira mensagem gravada.
- Uma mensagem gravada antes deste PR não tem como ser cortada no servidor, porque nunca esteve na conversa certa.
- O artefato volta como uma mensagem própria, depois da resposta que o gerou, e não dentro dela.

## Testes automáticos

- `app/api/ai/conversas/route.test.ts`: login, conta certa, listar, guardar, apagar com sub-conversas e cortar.
- `lib/chat/conversasServidor.test.ts`: junção das listas, gravação na conversa certa, fila de apagar e artefato.
- **Não testado:** as consultas contra um MongoDB de verdade (os testes usam um banco simulado), e as telas das salas no navegador. A lista abaixo confere isso.

## Como testar em produção (depois do `prisma db push`)

1. Crie uma conversa, mande uma mensagem, dê um nome a ela e recarregue: continua lá.
2. Abra a mesma conta em outro navegador: a conversa aparece com o título, e ao abrir vêm as mensagens.
3. Crie uma sub-conversa e confira no outro navegador: ela aparece embaixo da conversa-mãe.
4. Regenere uma resposta e abra no outro navegador (em uma conversa ainda não aberta nele): a resposta antiga não aparece.
5. Peça um diagrama e abra a conversa no outro navegador: o diagrama abre.
6. Apague a conversa e recarregue nos dois navegadores: ela não volta.
7. Com F12 → Rede → "Sem conexão de rede", apague uma conversa. Volte para "Sem limitação" e recarregue: ela não volta.
8. Repita os passos 1, 2 e 6 na Sala de Pesquisa.
9. Conversas antigas continuam aparecendo no navegador em que foram feitas.
