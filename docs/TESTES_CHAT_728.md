# Testes do #728 — melhorias no chat da Aura

## O que muda

- **1. Ordem da lista de conversas:** depois de juntar as conversas do navegador com as do servidor, a lista fica com a mais nova em cima. Antes, a conversa criada em outro navegador entrava no fim da lista.
- **2. Diagrama sem pedir:** quando o aluno pede uma resposta curta ("em 2 frases", "resumido", "rapidinho"), o diagrama automático não vem. Se o aluno pedir um diagrama com todas as letras, ele continua vindo.
- **3. Número de frases:** com "em N frases", o prompt diz que a resposta inteira cabe nisso. Se o modelo ainda puser um segundo parágrafo, o código tira esse parágrafo.
- **4. Resposta repetida:** o prompt passa a dizer que o segundo parágrafo continua de onde o primeiro parou, sem recontar.
- **5. Nomes iguais na lista:** a data das conversas de mesmo nome fica fora do "…". Antes, com o nome longo, a data era cortada e as duas pareciam iguais.
- **6. Caixa de texto em tela baixa:** em janela com menos de 640 px de altura, as opções (Minha base, agente, modelo, Modo pesquisa e Árvore) recolhem no botão ⚙, como no celular.
- **7. O ⌄ não cobre o texto:** o botão de ir para o fim da conversa sai do meio e vai para o canto direito.

## O que não precisou de mudança

- **8. Pedidos repetidos ao servidor:** os pedidos que pareciam repetidos têm motivo. Depois de uma resposta, o mapa é buscado de novo porque é criado ou atualizado; a conversa salva a pergunta e a resposta (dois envios); e o diagrama é consultado até ficar pronto.
- **9. Aviso de sem internet no chat de Pesquisa:** com o chat único ligado no ar, o chat de Pesquisa antigo não aparece mais. Ele virou o Modo pesquisa do chat da Aura, que já tem o aviso (#705).

## Para Martinez

- **Itens 2 a 4 mexem no harness da Aura** (`lib/agent/aura-harness.ts`), com um arquivo novo, `lib/agent/tamanho.ts`, no mesmo molde do `tabela.ts`.
  - A regra dele ("o que é X" ganha diagrama) continua valendo. Só não vale quando o aluno pede resposta curta.
- **Não precisa de `prisma db push`.**

## Testes automáticos

- `lib/agent/tamanho.test.ts`: lê "em 2 frases", "em três frases", "numa frase", "resumidamente"; a linha do prompt; o segundo parágrafo sai só com o pedido curto.
- `lib/chat/conversasServidor.test.ts`: a conversa de outro aparelho entra pela data, e não no fim.
- `lib/chat/threads.test.ts`: a marca das conversas repetidas é só a data.
- `components/study/CoworkComposer.test.tsx`: as opções também recolhem em tela baixa.

## Como testar em produção

1. **Ordem:** crie uma conversa num navegador e recarregue o outro. Ela aparece em cima da lista nos dois.
2. **Resposta curta:** pergunte "o que é mitocôndria? responda em 2 frases". Vêm só 2 frases e nenhum diagrama.
3. **Diagrama pedido:** pergunte "faça um diagrama da mitocôndria". O diagrama vem.
4. **Pergunta normal:** pergunte "o que é fotossíntese?". O diagrama automático continua vindo, e o segundo parágrafo não repete o primeiro.
5. **Nomes iguais:** com duas conversas "o que é fotossíntese", a data aparece ao lado das duas, mesmo com a lista estreita.
6. **Tela baixa:** diminua a altura da janela do navegador (ou use zoom de 150%). As opções somem e o botão ⚙ abre e fecha.
7. **O ⌄:** role a conversa para cima. O ⌄ aparece no canto direito, sem cobrir o texto.
8. **No computador com tela normal:** a caixa de texto continua igual a antes.
