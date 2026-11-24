# Testes do #873 (PR 3, parte 2): trechos aleatórios, Guia de estudo e fonte inventada

A parte 1 (anexo por conversa, arquivo grande, não misturar, falha que não contamina, sem "· reserva") já está em produção pelo #875. Esta é a parte 2.

## O que muda

### 1. #868 no chat da Aura: sem trechos aleatórios da base
- **O problema:** no resumo do PDF (teste D5), o quadro "Trechos usados por documento" trouxe "Direito profissional — questões de prova (MMLU pt)", "Dengue", "Tuberculose" e "Medicina geral".
  - "Resuma o documento" não tem assunto, então a busca devolvia o que estava mais perto, e o mais perto era lixo.
  - O #868 já tinha corrigido isso no Escritório. No chat da Aura faltava.
- **Agora** (`lib/rag/buscaDoTurno.ts`, ligado no `lib/agent/runChatTurn.ts`):
  - **Pedido sem assunto** ("resume", "me ajuda com isso"): não busca na base. Sem anexo, a Aura usa a conversa, e se a conversa não deixar claro, pergunta "resumo de quê?". É a mesma instrução do #868.
  - **Com arquivo anexado:** palavras que só apontam pro anexo ("o documento", "o PDF", "o que diz o arquivo") não contam como assunto. As bases públicas (MMLU, ENEM, Wikipédia) ficam de fora. A base pessoal continua.
  - **Sem anexo e com assunto:** tudo igual a antes.

### 2. O Guia de estudo não contradiz a resposta
- **O problema:** a Aura resumiu o PDF certo, e logo abaixo o "Guia de estudo" automático dizia "o documento não foi detalhado, não há como resumir".
  - O guia nascia de um estudo novo e vazio, só com o título. Ele nunca via o PDF nem a resposta.
- **Agora:** o guia (e também o FAQ, os flashcards e a linha do tempo) parte da explicação que o aluno acabou de ler, como o diagrama e o mapa mental já faziam.
  - `lib/studio/materialDoPedido.ts`, `lib/studio/text-pipeline.ts`, `lib/studio/studioClient.ts` e `StudyCoworkChat.tsx`.
  - Estudo com conteúdo próprio continua vencendo, como sempre.

### 3. Fonte inventada vira palpite marcado, sem link
- **O problema:** no Escritório, resumindo um texto colado (sem fonte nenhuma), o agente listou "Faculdade de Direito da UFMG — https://www.ufmg.br/…", com link cortado e genérico. Também listou o "Brasil Escola", que acertou, mas por palpite.
- **Agora** (`lib/agent/fontesConferidas.ts`, dentro do `normalizeAnswer` do harness, ou seja, no chat da Aura e no Escritório): o código confere cada fonte da lista "Fontes" com o que o turno realmente teve em mãos, que é a evidência das ferramentas (busca web, livros) e o texto do pedido.
  - **Achou:** a fonte fica como está.
  - **Não achou:** fica como palpite, **sem o link** e com "(provável — confira)" no título.
  - **Link cortado com "…"** nunca conta como link de verdade.
- As fontes da base ("Da sua base") continuam saindo do código, como antes.

## Para o Martinez

- Chat, harness e base são área dele.
- A busca na base deixa de rodar em pedido sem assunto, e com anexo fica sem as bases públicas. Pergunta normal fica igual.
- A lista "Fontes" passa a ser conferida pelo código.
- Não muda banco, nem provedor, nem custo. Não precisa de `prisma db push`.

### Fica para o PR 2 (ler sem Google)
- **"Processando o arquivo…" na tela:** depende da preparação da busca (embeddings), que hoje ainda passa pelo Google e não termina. Mostrar agora deixaria o aviso na tela pra sempre.
- **PDF escaneado:** precisa de leitura de imagem sem Google.

## Testes automáticos

- `lib/agent/chatDocumentosPr3b.test.ts` (novo, 15 testes):
  - **Busca na base:** pedido sem assunto não busca; com anexo, "resuma o documento", "o que diz esse PDF?" e "explica a página 3 do arquivo" não buscam; com anexo e assunto, só a base pessoal; sem anexo e com assunto, igual a antes ("documento público" continua sendo assunto).
  - **Guia de estudo:** parte da explicação; o estudo com conteúdo vence; sem explicação, só o tópico; texto gigante é cortado.
  - **Fontes:** o caso da UFMG e do Brasil Escola; fonte que a busca trouxe fica; link colado pela pessoa confere; título confere; não marca duas vezes; chave do link; e ligado de verdade na resposta da Aura (`normalizeAnswer`).
- Harness, `runChatTurn`, canal, studio e RAG continuam passando.

## Verificado na prévia

- A prévia local não tem banco nem os provedores, então a Aura não responde aqui.
- Fica coberto pelos testes e pelo teste em produção abaixo.

## Como testar em produção (depois do deploy, no chat da Aura)

1. **Sem trecho aleatório:**
   - Numa conversa nova, anexe o `mandacaru-7-teste.pdf` e mande "resuma o documento".
   - Em "Trechos usados" **não** pode aparecer MMLU, "Direito profissional", Dengue nem Tuberculose.
2. **Pedido vago:** numa conversa nova, sem anexo, mande só "resume". Ela deve perguntar "resumo de quê?" em vez de inventar um assunto.
3. **Guia de estudo:**
   - No teste 1, se vier um "Guia de estudo" junto, ele tem que bater com o resumo.
   - Ele **não** pode dizer que o documento não tem conteúdo.
4. **Fonte inventada:**
   - Cole um parágrafo de notícia sem fonte e peça "resume isso".
   - Se ela listar fontes que não estão no texto, devem vir **sem link** e com "(provável — confira)".
5. **Pergunta normal continua igual:** "explica o ciclo de Krebs". A resposta vem normal, com as fontes da busca e os links funcionando.

## Resultado dos testes

| Teste | Resultado |
|---|---|
| Suíte completa (24/11) | ✅ 8124 testes passando e `tsc` limpo. As 72 falhas estão em 29 arquivos que não usam este código (ambiente do Windows: compose, skills, symlink, docx; e o `agenteCompose`, que já falha na main). São as mesmas da parte 1. |
| 1. Sem trecho aleatório | ⏳ falta testar |
| 2. Pedido vago | ⏳ falta testar |
| 3. Guia de estudo | ⏳ falta testar |
| 4. Fonte inventada | ⏳ falta testar |
| 5. Pergunta normal | ⏳ falta testar |
