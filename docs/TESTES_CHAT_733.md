# Testes do #733 — chat da Aura: lista por dia, conversa repetida, tela estreita e microfone

## O que muda

- **1. Lista agrupada por dia:** as conversas ficam em "Hoje", "Ontem", "Últimos 7 dias", "Últimos 30 dias" e "Mais antigas", com a mais nova em cima. A data saiu do lado do nome, e ao passar o mouse aparece "criada hoje às 21:28". O mesmo vale para a lista curta do menu (`ConversasDaSala`).
- **2. Botões escondidos sem ocupar espaço:** sub-tema, renomear e excluir só ocupam espaço na conversa aberta, ao passar o mouse, com foco de teclado ou em tela de toque. Antes ficavam invisíveis, mas tomavam uns 70 px do nome.
- **3. Aviso antes de repetir:** numa conversa nova, se a 1ª pergunta daria o mesmo nome de uma conversa que já existe, aparece "Você já tem a conversa ‘X’. Quer continuar nela?".
  - **continuar nela** abre a conversa que já existe, com o texto ainda na caixa.
  - **começar nova** envia normalmente.
  - Compara sem acento, sem maiúsculas e sem pontuação.
- **4. Janela estreita e baixa:** com menos de 1024 px de largura e menos de 720 px de altura, a biblioteca (Aura e lixeira) começa recolhida, como no celular. Antes a conversa ficava com 0 px de altura.
- **5. Microfone diz o que está fazendo:**
  - Enquanto grava, mostra "Ouvindo… pode falar".
  - Depois de ouvir algo, mostra "quando parar de falar, ele desliga sozinho".
  - Quando desliga sem a pessoa pedir, explica o porquê por 6 segundos: pausa, microfone bloqueado, não ouviu nada ou sem internet.
  - De quebra, no modo contínuo (resposta falada das aulas), o que já tinha sido reconhecido não some mais quando a pessoa continua falando.

## O que não precisou de mudança

- **6. Pedido de microfone ao abrir:** com o microfone vigiado no navegador do Claude, nenhum código da Zaeon pediu acesso (zero chamadas em 8 segundos). O aviso aparece até em "Sobre nós", então vem do próprio navegador do Claude. Falta só conferir no Edge (teste 7 abaixo).

## Para Martinez

- Só a parte de tela do chat (lista de conversas, caixa de texto, biblioteca) e o ditado (`lib/voice/useSTT.ts`). Não mexe no harness.
- Não precisa de `prisma db push`.

## Testes automáticos

- `lib/chat/threads.test.ts`: grupos do dia, "criada hoje às…", ordem dentro do grupo e a conversa repetida.
- `components/chat/ConversasSidebar.dia.test.tsx` (novo): os grupos, o nome sem data do lado e as ações escondidas.
- `lib/voice/useSTT.test.ts` (novo): ouvindo, ouviu, desligou sozinho, parar sem aviso, microfone bloqueado e os trechos juntos.
- `components/study/CoworkComposer.test.tsx`: as mensagens do microfone na caixa.

## Como testar em produção

1. **Lista por dia:** abra o Menu de conversas. Aparecem os títulos "Hoje", "Ontem"… e os nomes inteiros. Passe o mouse num nome: aparece "criada hoje às…".
2. **Botões:** passe o mouse numa conversa fechada. Os botões aparecem e, ao tirar o mouse, somem sem deixar espaço vazio.
3. **Conversa repetida:** abra uma conversa nova e mande uma pergunta igual ao nome de uma que já existe (por exemplo, "o que é fotossíntese?"). Aparece o aviso. Teste os dois botões.
4. **Janela estreita e baixa:** com zoom de 150% no navegador, recarregue o chat. A biblioteca começa recolhida e a conversa aparece.
5. **Microfone (Edge ou Chrome):** toque no 🎤. Aparece "Ouvindo… pode falar". Fale e pare. Ele desliga e mostra o aviso da pausa.
6. **Microfone bloqueado:** bloqueie o microfone para o site e toque no 🎤. Aparece o aviso de liberar o microfone.
7. **Pedido ao abrir:** no Edge, abra o chat sem tocar no 🎤. O navegador não pede o microfone.
8. **No computador com tela normal:** tudo como antes.
