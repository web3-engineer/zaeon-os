# Testes do #663, PR 3 — conversas que já existem

## O que muda

- **Conversas antigas sobem:** ao abrir o chat, as conversas que só existem naquele navegador sobem para o servidor, uma vez em cada navegador.
- **Sem perda:** cada uma só conta como enviada depois de o servidor confirmar. Se falhar, tenta de novo na próxima abertura.
- **Sem duplicar:** enviar de novo não repete mensagens.
- **Ao sair da conta:** a cópia das conversas no navegador é apagada. Se as antigas ainda não subiram, a cópia fica.
- **Apagar a conta:** a cópia sai sempre, para nada subir de novo.
- **Apagar a conversa-mãe com a sub-conversa aberta:** a tela agora troca de conversa. Antes, a lista atualizava, mas a tela continuava mostrando a sub-conversa apagada.
- **Apagada em outro aparelho:** a conversa também some deste navegador ao recarregar. Essa correção completa o item 10, que o PR 2 só cobria no navegador que apagou.

Vale para a Sala de Estudos e o Modo pesquisa. **O chat do celular (`/m`) e o Octa não mudam.**

## Para Martinez

**Não precisa de `prisma db push`.** Nenhum campo novo.

As mensagens antigas misturadas (item 16) continuam no banco, fora da lista. Falta ele decidir se e quando apagar.

## Limitações conhecidas

- Cada conversa sobe com o que está no navegador: no máximo as últimas 60 mensagens. O que está só em outro navegador sobe quando a pessoa entrar por ele.
- Uma conversa apagada em outro aparelho **antes** deste PR pode voltar uma vez, ao subir do navegador que ainda tinha a cópia. Basta apagá-la de novo.
- Se a sessão expirar sem clicar em sair, a cópia continua no navegador, escondida na área da conta, até a pessoa sair pelo botão.
- O rascunho e o que não é conversa (biblioteca, por exemplo) continuam no navegador, porque não existem no servidor.
- Depois da primeira subida, uma mensagem cuja gravação falhou não é reenviada. Ao sair da conta, ela se perde.
- Quem nunca abre o chat naquele navegador não sobe nada, e a cópia fica até abrir.
- A lista do navegador continua limitada a 40 conversas.

## Testes automáticos

- `lib/chat/conversasAntigas.test.ts`: subir, falhar e tentar de novo, limpar ao sair, apagada em outro aparelho.
- `app/api/ai/conversas/route.test.ts`: login, não duplicar, título e erros.
- **Não testado:** as consultas contra um MongoDB de verdade (os testes usam um banco simulado), e as telas no navegador. A lista abaixo confere isso.

## Como testar em produção

1. No navegador com conversas antigas, entre e abra o chat. Depois abra a mesma conta em outro navegador: as antigas aparecem, com título e mensagens.
2. Recarregue os dois: nenhuma mensagem aparece repetida.
3. Saia da conta e entre de novo: as conversas voltam, abrindo pelo servidor.
4. Com F12 → Armazenamento, depois de sair: não há mais mensagens de conversas da conta.
5. Apague uma conversa em um navegador e recarregue o outro: ela some nos dois.
6. Se a conversa aberta for a apagada, o outro navegador abre outra, sem erro.
7. Com duas contas: uma não recebe as conversas da outra.
8. Abra uma sub-conversa e apague a conversa-mãe: a tela troca para outra conversa.
9. Repita os passos 1, 3, 5 e 8 no Modo pesquisa.
