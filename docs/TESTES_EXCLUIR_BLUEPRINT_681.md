# Testes do #681 — excluir e renomear blueprint

## O que muda

- **Excluir:** o dono do blueprint aberto vê "excluir" ao lado da lista. Uma faixa pede confirmação, com o nome do blueprint, e avisa quantas pessoas com acesso também deixam de ver.
- **A conversa fica:** a conversa de onde o blueprint nasceu continua, e não cria outro nos turnos seguintes.
- **No servidor:** o conteúdo, os comentários e o acesso de quem foi convidado saem. Fica só uma marca sem conteúdo (`surface: "blueprint-excluido"`), que impede a conversa de recriar o blueprint.
- **Renomear:** o dono vê "renomear". O nome novo fica, mesmo quando a Zaeon refaz o blueprint.
- **Erro ao carregar:** se a lista não carregar, a Sala mostra o erro e "tentar de novo", em vez de "nenhum blueprint ainda".
- Nova rota `DELETE /api/blueprint/:id`, só para o dono.

## Para Martinez

- **Não precisa de `prisma db push`:** a marca usa a tabela `Cartolina` que já existe.
- **Confirmar a proposta:** a conversa fica e só para de recriar, e quem foi convidado perde o acesso.
- **Os "mentores" do blueprint** são os personagens da plataforma (`MENTOR_SEED`), não pessoas. Na Sala, a tela não tem como compartilhar um blueprint; o aviso conta quem entrou por convite (`CartolinaMembro`).
- **Vídeos já gerados** para os documentos do blueprint não são apagados.
- **Renomear** continua permitido para quem pode editar, como já era na rota.

## Limitações conhecidas

- Excluir não tem lixeira: não dá para desfazer.
- Se a conversa for apagada depois, a marca fica no banco, sem conteúdo.
- A lista continua mostrando só os 40 blueprints mais recentes.

## Testes automáticos

- `lib/blueprint/excluir.test.ts`: excluir não volta pela conversa, conteúdo sai, convidados e comentários saem, só o dono exclui, renomear sobrevive à recomposição.
- `components/blueprint/useBlueprint.test.tsx`: excluir tira da lista e abre o próximo, falha não tira, erro ao carregar.
- **Não testado:** as consultas num MongoDB de verdade e a tela no navegador. A lista abaixo confere isso.

## Como testar em produção

1. Na Sala de Estudos, abra um blueprint e clique em "renomear". Dê outro nome e salve: o nome muda na lista e na prancha.
2. Volte ao chat e mande mais mensagens na conversa desse blueprint. Espere 2 minutos e recarregue a Sala: o nome escolhido continua.
3. Clique em "excluir": aparece a faixa com o nome do blueprint. Clique em "cancelar": nada muda.
4. Clique em "excluir" de novo e confirme: o blueprint some e a Sala abre outro, ou mostra "nenhum blueprint ainda".
5. Recarregue a página: ele não volta.
6. Mande mensagens na conversa de onde ele nasceu: nenhum blueprint novo aparece.
7. A conversa continua no chat, com as mensagens.
8. Com F12 → Rede → Offline, recarregue a Sala: aparece "não deu para carregar" e "tentar de novo". Volte a conexão e clique: a lista aparece.
9. Com outra conta: o blueprint da primeira não aparece e não pode ser excluído.
