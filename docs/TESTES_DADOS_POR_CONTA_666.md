# Testes do #666 — biblioteca e dados do navegador por conta

## O que muda

Passam a ser da conta logada, usando a mesma área do #663 (`lib/chat/contaNoNavegador.ts`):

- biblioteca de PDFs (`zaeon.libraryFiles`);
- citações salvas (`zaeon.savedCitations`);
- trabalhos (`zaeon.researchWorks`);
- lixeira (`zaeon.trash`);
- documentos do editor (`zaeon_research_docs`, `zaeon_research_draft`);
- dados da tela de aulas (`zaeon_liquid_chat`, `zaeon_stored_pdfs`, `zaeon_schedule_data`, `zaeon_plugged_day`, `zaeon_gadget_on`, `zaeon_user_modules`). Antes, a conta seguinte no navegador podia enviar esses dados para o próprio espaço no servidor.

A lateral agora mostra o agente que está na tela: com o Octa salvo e o chat aberto, ela mostra a Aura.

## Para Martinez olhar

Muda a forma como esses dados são guardados no navegador. O servidor e o banco não mudam, e não precisa de `prisma db push`.

## Limitações conhecidas

- **Os dados ficam escondidos, mas continuam gravados naquele navegador.** Isso vale também para os bytes dos PDFs no IndexedDB (`zaeon-pdfs`), que não são separados por conta. A tela só chega neles pela lista da conta, mas alguém com acesso às ferramentas do navegador ainda consegue lê-los.
- **Dados antigos não têm dono marcado.** A primeira conta que entrar no navegador depois do deploy recebe todos.
- **Documento repetido (item 7): causa só em parte.** Cada envio cria um novo registro, mesmo para o mesmo arquivo, então repetir o envio repete o documento. Não descobri por que a lista caiu de 5 para 1 no teste, e não mudei esse comportamento.
- **`zaeon_exam_history`:** só tem leitura no código, nada grava essa chave. Não mexi.
- Outras chaves do laboratório (`zaeon_active_project`, `zaeon.research.caret.*`) guardam só preferência ou posição e não foram alteradas. Não conferi o conteúdo de `zaeon_active_project` em uso real.

## Testes automáticos

- `lib/useLibraryFiles.conta.test.tsx`: biblioteca e listas sem login, em outra conta e ao voltar; sessão carregando; sessão que acaba sem recarregar; migração dos dados antigos.
- `lib/agents/chatAgentes.test.ts`: agente na tela.
- **Não coberto por teste automático:** a tela do editor (`app/research-lab/page.tsx`) e a tela de aulas (`ClassesView`). A lista abaixo confere o editor e a lateral.

## Como testar em produção

1. Entre na conta principal: a biblioteca, os trabalhos e a lixeira continuam lá.
2. Adicione um PDF de teste. Saia da conta: a biblioteca fica vazia, e a lixeira não mostra número.
3. Entre de novo: o PDF volta e abre.
4. Com uma segunda conta: os arquivos da primeira não aparecem.
5. Escolha o Octa e recarregue: na tela do chat, a lateral mostra a Aura. Ao escolher o Octa de novo, abre a IDE.
6. Abra a Aura: a conversa e o avatar aparecem como antes.
