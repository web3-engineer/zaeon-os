# Testes do #873 (PR 4): Exportar da peça e o que os testes de 24 e 25/11 acharam

PR 1 (#874), PR 3 (#875 e #877) e o HF na frente (#876) já estão no ar. O PR 2 (ler PDF sem Google) espera o Martinez escolher o modelo dos embeddings. Este PR junta o Exportar da peça e os achados dos testes de 24 e 25/11.

## O que muda

### Exportar
1. **O Exportar de toda peça dava "Erro no serviço ABNT: Internal Server Error"** (Word e PDF).
   - **Causa:** o serviço que monta o arquivo põe o título no nome do download, e o "—" de "Petição inicial — …" não cabe no cabeçalho (ele só aceita latin-1). A resposta quebrava inteira.
   - **Agora** (`abnt-service/main.py`, `nome_do_arquivo`): o nome do arquivo vira só letras simples, com "—" trocado por "-" e sem acento. **O documento não muda**, só o nome do arquivo.
2. **A janela de exportar da peça pedia instituição, cidade, orientador e capa,** que são de TCC.
   - **Agora:** na peça, a janela se chama "Exportar peça" e mostra só o formato (Word ou PDF) (`components/tcc/ExportarTrabalho.tsx`).
   - A rota não pede a capa e não chama a IA pra escrever resumo (`app/api/documents/abnt-export/route.ts`, `lib/export/peca.ts`).
   - O serviço tem um estilo novo, `peca` (`abnt-service/styles.py`): título, partes da peça ("DOS FATOS", "DOS PEDIDOS"), texto justificado, entrelinha 1,5, sem capa, sem folha de rosto e sem resumo.

### Chat com documentos
3. **A Aura aponta o outro arquivo.**
   - **O problema:** no teste de 25/11, com o manual anexado, a pergunta era sobre o Mandacaru. Ela disse "procure no capítulo de orçamento do manual", ou seja, no lugar errado.
   - **Agora:** com um arquivo anexado, a Aura recebe os **nomes** dos outros arquivos guardados (`blocoOutrosArquivos` em `lib/agent/anexos.ts`, ligado no `runChatTurn`).
     - Se a resposta não está no anexo e a pergunta combina com um desses nomes, ela diz "isso não está no manual; parece estar no seu outro arquivo mandacaru-7-teste, quer que eu olhe nele?".
     - Ela só recebe os nomes: nunca inventa o conteúdo de um arquivo que não leu.
4. **O anexo sobrevive ao recarregar.**
   - **O problema:** no teste de 25/11, a Zaeon reiniciou (deploy) e as duas conversas voltaram sem o PDF.
   - **Agora** (`lib/chat/anexoGuardado.ts` + `useAnexoChat`):
     - Fica guardado no aparelho só o "ponteiro" de cada conversa (id e nome). O PDF em si já mora na Biblioteca.
     - Ao recarregar, cada conversa pega o PDF dela de volta.
     - O × apaga o ponteiro. Se o arquivo saiu da Biblioteca, a conversa não traz ele de volta.
5. **A peça não inventa número de julgado nem de processo.**
   - **O problema:** a petição citou "REsp 1.234.567/SP".
   - **Agora** (`semNumeroInventado`): todo número de julgado (REsp, RE, HC, AgRg…) e todo número de processo no padrão do CNJ vira um campo pra preencher, "[JULGADO — CONFIRA E PREENCHA O NÚMERO]". A citação da **lei** (art. 62 da Lei 8.245/91) continua.
6. **A bolha da procuração não diz mais "a base de conhecimento não contém informações…".**
   - Quando a peça é criada e a resposta do chat é esse tipo de recusa, ela vira a confirmação: "Comecei a escrever **Procuração — …** na aba ao lado… dados entre colchetes… revisão de um advogado".
   - Resposta boa fica como está (`respostaDaPecaCriada`).
7. **O gráfico "Papers por ano" não aparece mais quando a Aura cria um documento** (peça ou artigo), conforme `lib/agent/graficosDoTurno.ts`.
   - Na peça ele não tinha nada a ver. No artigo, o quadro já vai **dentro** do documento.
   - Quem pede panorama, estado da arte ou "quantos artigos existem" continua recebendo.
8. **O título do documento começa com maiúscula e sem o artigo do pedido:** "Gera um artigo sobre a Lei do Inquilinato" vira **"Lei do Inquilinato"** (`lib/tcc/titulo.ts`). O tema enviado pra geração não muda.
9. **Reabrir o documento fechado.**
   - Ao fechar a aba de um documento, aparece a pasta **"↺ Reabrir"**, que traz o último de volta (`StudyCoworkChat.tsx`).
   - Com vários fechados, ela mostra o número, como "↺ Reabrir (2)".
   - O documento nunca é apagado.
10. **Mensagem enviada duas vezes:**
    - Enter duas vezes rápido, ou Enter + clique, mandava a pergunta em dobro.
    - **Agora** a trava é imediata, e a mesma frase digitada não sai de novo em menos de 3 s (`lib/chat/envioRepetido.ts`).
11. **Resultados dos testes de 24 e 25/11** registrados em:
    - `docs/TESTES_DOCUMENTOS_873.md`;
    - `docs/TESTES_DOCUMENTOS_873_PR3.md`;
    - `docs/TESTES_HF_PRIMARIO_DEPLOY.md`;
    - `docs/TESTES_CELULAR_832.md`.

## Para o Martinez

- Chat, documentos, Exportar e o `abnt-service` são área dele.
- O `abnt-service` ganhou o estilo `peca` e o nome de arquivo seguro. **Precisa subir a imagem nova do serviço** junto com o deploy, que já faz isso.
- O chat passa a ler a **lista** de documentos da base pessoal quando há anexo: só os nomes, com prazo de 1,5 s, e se falhar o turno segue igual.
- O gráfico "Papers por ano" deixa de sair em `criar_trabalho` (foi decisão de produto dele antes). O motivo está no item 7.
- Não muda banco, provedor nem custo. Não precisa de `prisma db push`.

## Testes automáticos

- `lib/agent/chatDocumentosPr4.test.ts` (novo, 15 testes):
  - Exportar da peça sem capa, e a rota ligada no estilo `peca`.
  - O bloco dos outros arquivos: sem o anexado, sem repetir e com teto.
  - O ponteiro do anexo: grava, lê, o × apaga, sem imagem, com teto.
  - Julgado e processo inventados viram campo, e a lei continua.
  - A recusa da procuração vira confirmação.
  - O título com maiúscula.
  - O envio repetido em 3 s, ligado no chat.
- `components/chat/useAnexoChat.test.tsx` (+2): recarregar a página devolve o PDF de cada conversa, e o × e o arquivo apagado não voltam.
- `abnt-service/test_styles.py` (+2, pytest na CI):
  - o título com "—" exporta com status 200 e nome em latin-1;
  - a peça sai sem capa nem resumo.
- Ajustados:
  - `lib/agent/anatomiaDoTurno.test.ts`: `criar_trabalho` não traz mais o gráfico;
  - `lib/tcc/turno.test.ts` e `lib/tcc/entrelace.test.ts`: título com maiúscula.

## Verificado na prévia

- A prévia local não tem banco, provedores nem o `abnt-service`, então não dá pra gerar nem exportar a peça aqui.
- O nome do arquivo foi conferido rodando a função com os títulos reais do teste:
  - "PETIÇÃO INICIAL — AÇÃO DE COBRANÇA DE R$ 3.000" → `PETICAO_INICIAL_-_ACAO_DE_COBRANCA_DE_R_3.000`, que cabe no cabeçalho.
- O resto fica coberto pelos testes e pelo teste em produção abaixo.

## Como testar em produção (depois do deploy, no computador)

1. **Exportar a peça:** abra a petição da conversa "Faz uma petição inicial…" e clique em **Exportar**.
   - A janela se chama "Exportar peça" e **não** pede instituição nem cidade.
   - Escolha Word. O arquivo **baixa** e abre com o título e as partes da peça, sem capa.
   - Repita com PDF.
2. **Exportar um artigo continua igual:** no artigo "Lei do Inquilinato", o Exportar pede a norma e a capa, como antes.
3. **Peça sem número inventado:** peça uma petição nova. Onde ela citar julgado, aparece "[JULGADO — CONFIRA E PREENCHA O NÚMERO]".
4. **Procuração:** "cria uma procuração para representar alguém no INSS". A bolha diz "Comecei a escrever…", e não "a base não contém…".
5. **Sem gráfico na peça:** nenhuma das duas mostra "Papers por ano" embaixo da resposta.
6. **Título:** "gera um artigo sobre a Lei do Inquilinato". A aba se chama "Lei do Inquilinato".
7. **Reabrir:** feche a aba da petição. Aparece "↺ Reabrir". Clique, e a petição volta.
8. **Anexo depois de recarregar:** anexe o `mandacaru-7-teste` numa conversa e aperte F5. O chip volta na mesma conversa, e não nas outras.
9. **Outro arquivo:**
   - Numa conversa nova, anexe o `manual-gigante-300p` e pergunte "quanto custou o projeto Mandacaru-7?".
   - Ela deve dizer que isso parece estar no **mandacaru-7-teste**, sem inventar o valor.
10. **Sem mensagem dupla:** digite uma pergunta e aperte Enter duas vezes rápido. Sai um balão só.

## Resultado dos testes

| Teste | Resultado |
|---|---|
| Testes novos + documentos + chat (25/11) | ✅ 194 passando (`chatDocumentosPr4`, `lib/tcc`, `lib/documento`); `useAnexoChat` 18; gráficos 34; sala de estudos 38 |
| Suíte completa (25/11) | ✅ `tsc` limpo. As 72 falhas estão em 30 arquivos de ambiente do Windows (compose, skills, symlink, docx, Colyseus), as mesmas da parte 2, mais as instáveis de sempre (`mcp-real`, `console`) e o `runChatTurn` "emite as fases", que estourou o tempo sob carga e passa sozinho (19/19) |
| `abnt-service` (pytest) | ⏳ roda na CI (as dependências Python não estão instaladas nesta máquina) |
| 1. Exportar a peça | ⏳ |
| 2. Exportar o artigo | ⏳ |
| 3. Sem número inventado | ⏳ |
| 4. Procuração | ⏳ |
| 5. Sem gráfico | ⏳ |
| 6. Título | ⏳ |
| 7. Reabrir | ⏳ |
| 8. Anexo depois de recarregar | ⏳ |
| 9. Outro arquivo | ⏳ |
| 10. Sem mensagem dupla | ⏳ |
