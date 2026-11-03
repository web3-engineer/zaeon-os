# Testes do #683 — buscar blueprint, nome inteiro e voltar à conversa

## O que muda

- **Busca:** um campo "buscar…" na barra da Sala de Estudos filtra os blueprints pelo nome. Não liga para acento nem maiúscula, e as palavras podem vir em qualquer ordem. Esc limpa.
- **Sem resultado:** aparece "nenhum blueprint com …". Se ainda há blueprints para carregar, o aviso diz que a busca olhou só os que já carregaram.
- **Nome inteiro:** parar o mouse sobre um blueprint mostra o nome completo. O leitor de tela já lia o nome inteiro.
- **Ver mais:** a lista vem de 40 em 40. Quando há mais, aparece "ver mais →" no fim, e cada clique traz os próximos 40, até 400.
- **Abrir a conversa:** o botão "← abrir a conversa" leva ao chat, na conversa de onde o blueprint aberto nasceu.
- **Ações sempre à vista:** a busca, "abrir a conversa", "renomear" e "excluir" ficam presos à esquerda da barra. Antes, ficavam depois do último blueprint, e com muitos blueprints era preciso rolar até o fim.
- A rota `GET /api/blueprint` aceita `?limite=` e devolve `temMais`.

## Para Martinez

- **Área dele (Sala de Estudos).** Só a barra de cima da Sala e a rota da lista mudam.
- **Não precisa de `prisma db push`.**

## Limitações conhecidas

- A busca olha só os blueprints já carregados. Com mais de 40, é preciso clicar em "ver mais" para buscar nos antigos.
- "Abrir a conversa" não faz nada se a conversa foi apagada.

## Testes automáticos

- `lib/blueprint/busca.test.ts`: busca sem acento e em qualquer ordem, páginas de 40, aviso de "tem mais", limite inválido.
- `components/blueprint/useBlueprint.test.tsx`: "ver mais" pede os próximos 40 e o aviso some quando acabam.
- **Não testado:** a tela no navegador. A lista abaixo confere isso.

## Como testar em produção

1. Abra a Sala de Estudos: a busca, "abrir a conversa", "renomear" e "excluir" aparecem no começo da barra.
2. Role a barra até o fim: esses botões continuam à vista, à esquerda.
3. Digite parte do nome de um blueprint, sem acento: só os que combinam aparecem.
4. Digite algo que não existe: aparece "nenhum blueprint com …". Aperte Esc: a lista volta inteira.
5. Pare o mouse sobre um nome cortado: aparece o nome inteiro.
6. Clique em "← abrir a conversa": o chat abre na conversa daquele blueprint.
7. Com mais de 40 blueprints: aparece "ver mais →" no fim, e o clique traz os antigos.
