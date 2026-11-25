# Testes do #873 (PR 3, parte 1): o chat com documentos anexados

Achado em 23/11 nos testes com os PDFs Mandacaru-7, escaneado e manual de 300 páginas, na conta da Giulia.

O PR 1 (gerar peças jurídicas, #874) já está em produção. O PR 2 (ler sem Google: embeddings e PDF escaneado) espera o Martinez escolher o modelo. Este PR é a primeira parte do PR 3.

## O que muda

### 1. O anexo é da conversa, não do chat inteiro
- **O problema:** "quando abri uma nova conversa já veio anexado". O anexo era um só pra sala inteira, então a conversa nova já nascia "lendo" o PDF da anterior.
- **Agora:** cada conversa tem o seu anexo, e vale tanto para o chip 📎 quanto para os chips 📚 de vários arquivos.
  - Conversa nova começa sem anexo.
  - Voltar pra conversa anterior traz o anexo dela.
  - Tirar o anexo (×) numa conversa não tira da outra.
  - Se o arquivo termina de carregar depois que você trocou de conversa, ele fica na conversa onde foi anexado.
- Vale na Sala de Estudos (chat da Aura) e na Sala de Pesquisa.
- `components/chat/useAnexoChat.tsx` (opção nova `conversa`).

### 2. Arquivo maior que o limite: a Aura avisa
- **O problema:** do manual de 300 páginas, só ~40 páginas cabem (120 mil caracteres). A Aura respondia como se tivesse lido tudo.
- **Agora:** o anexo cortado sabe até qual página foi lido. A IA recebe o aviso "você só tem até a página N (de M)".
  - Se a resposta não estiver nessa parte, ela diz isso: "li até a página N; o resto ainda está sendo preparado na sua base".
- `lib/agent/anexos.ts` (`cortado`, `ultimaPaginaLida`, `avisoDeCorte`) e `lib/agent/anexos-server.ts`.

### 3. Não misturar documentos
- **O problema:** perguntando a palavra-código do manual, a Aura respondeu **GIRASSOL-42**, que é do **outro** PDF (Mandacaru-7), dizendo que era do manual. A certa era **ARARA-93**.
- **Agora:** com arquivo anexado, a IA recebe a regra:
  - pergunta sobre o anexo se responde pelo conteúdo dele;
  - trecho da base com outro título é de outro documento e nunca é atribuído ao anexo;
  - se usar um trecho desses, diz de qual documento veio.
- `lib/agent/anexos.ts` (`regraDeNaoMisturar`, dentro do `blocoDosAnexos`).

### 4. O "não consegui ler" não contamina as próximas respostas
- **O problema:** a resposta de falha ficava no histórico, e nas perguntas seguintes a IA lia a própria falha e repetia, mesmo com o arquivo legível.
- **Agora:** aviso de falha curto da IA ("Não consegui ler/abrir/responder…", "Sem conexão com a Aura") continua na tela, mas não vai mais no histórico pro modelo.
  - A pergunta do aluno fica.
  - Resposta longa que só começa assim também fica.
- `lib/chat/semFalhas.ts`, usado em `StudyCoworkChat.tsx` e `ResearchChat.tsx`.

### 5. Sai a etiqueta "· reserva"
- **O problema:** debaixo da resposta aparecia "gpt-oss-120b · reserva", com a dica "O Google falhou e a reserva respondeu". Não usamos mais o Google como provedor, então a etiqueta assustava sem motivo.
- **Agora:** aparece só o nome do modelo ("gpt-oss-120b"), neutro.
- `lib/chat/modelos.ts` e `components/chat/SeletorModelo.tsx`.

## Para o Martinez

- Chat e base são área dele.
- As regras 2 e 3 são texto a mais no contexto do turno, e só quando há anexo. Turno sem anexo fica igual, byte a byte.
- Não muda banco, nem provedor, nem custo. Não precisa de `prisma db push`.

### Fica para a parte 2 do PR 3
- #868 no chat da Aura (trechos aleatórios da base);
- Guia de estudo que contradiz a resposta;
- fonte inventada;
- "processando o arquivo…" na tela.

### Fica para o PR 2
- PDF escaneado (precisa de leitura de imagem sem Google);
- embeddings (precisa da escolha do modelo).

## Testes automáticos

- `lib/chat/anexosPr3.test.ts` (novo, 11 testes):
  - anexo cortado × inteiro;
  - última página lida;
  - aviso "até a página N (de M)" e "o começo";
  - nenhum aviso quando coube;
  - regra de não misturar, com um e com vários anexos;
  - o arquivo grande leva os dois avisos;
  - avisos de falha reconhecidos;
  - conteúdo não confundido com aviso;
  - o histórico perde só a falha da IA (a do aluno fica).
- `components/chat/useAnexoChat.test.tsx` (+3 testes):
  - conversa nova sem o PDF da anterior, e voltar traz o dela;
  - o × numa conversa não tira da outra;
  - o lote 📚 também é por conversa.
- `lib/chat/modelos.test.ts` e `components/chat/SeletorModelo.test.tsx`: sem "· reserva" e sem "Google falhou".
- `npx tsc --noEmit` limpo.
- Suíte completa: ver "Resultado dos testes".

## Verificado na prévia

- A prévia local não tem banco nem chave dos provedores, então a Aura não responde aqui.
- O anexo por conversa é coberto pelos testes do hook e pelo teste em produção abaixo.

## Como testar em produção (depois do deploy, no chat da Aura)

1. **Anexo por conversa:**
   - Anexe o `mandacaru-7-teste.pdf` numa conversa e clique em **Nova conversa**. O chip 📎 não aparece.
   - Volte pra primeira conversa. O chip do Mandacaru está lá.
2. **× numa conversa só:**
   - Na conversa nova, anexe outro PDF e clique no ×.
   - Volte pra primeira. O Mandacaru continua anexado.
3. **Arquivo grande:**
   - Numa conversa nova, anexe o `manual-gigante-300p.pdf` e pergunte "qual é a palavra-código secreta?".
   - A Aura deve dizer que leu só até a página ~40 e que o resto está sendo preparado.
   - Ela **não** pode responder GIRASSOL-42.
4. **Não misturar:**
   - Ainda com o manual anexado, pergunte algo que só existe no Mandacaru.
   - Se ela usar o Mandacaru, tem que dizer "isso está em outro material seu: mandacaru-7-teste".
5. **Falha não contamina:**
   - Se aparecer um "Não consegui responder agora", mande a pergunta de novo.
   - A resposta nova não pode repetir "não consegui ler" à toa.
6. **Etiqueta:** debaixo das respostas não aparece mais "· reserva".

## Resultado dos testes

| Teste | Resultado |
|---|---|
| Suíte completa (24/11) | ✅ nenhuma falha nova: os 85 arquivos que usam o código mexido rodaram com 1311 testes passando. As 12 falhas desses arquivos são de ambiente do Windows (skills, `rea-agent-eval`) e acontecem igual na main; o `mcp-real` falhou só sob carga e passou sozinho. As outras falhas da suíte completa são de arquivos que não usam este código (compose, symlink, docx), as mesmas de sempre. |
| 1. Anexo por conversa | ✅ 25/11 (conversa nova sem o chip; voltar trouxe o Mandacaru). Achado: recarregar a página apagava o anexo de todas as conversas, corrigido no PR 4 |
| 2. × numa conversa só | ✅ 25/11 (o × tirou o caatinga só da conversa dele) |
| 3. Arquivo grande | ✅ 25/11 ("leitura disponível cobre apenas até a página 43", sem GIRASSOL-42) |
| 4. Não misturar | ✅ 25/11 ("não está nas páginas lidas do manual", fonte só o manual; resposta em ~35 s). Melhoria: apontar o outro arquivo, feita no PR 4 |
| 5. Falha não contamina | ⏳ não apareceu falha pra testar |
| 6. Etiqueta | ✅ 24/11 (sem "· reserva") |
