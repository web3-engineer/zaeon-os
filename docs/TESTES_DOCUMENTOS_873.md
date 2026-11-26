# Testes do #873 (PR 1): gerar documentos de Direito no chat

Achado em 23/11. O Martinez disse que o chat "não está gerando os documentos de Direito", e a Giulia e o Claude testaram em produção, na conta dela.

O card vai em 3 PRs:
- **PR 1:** gerar documentos de Direito (este);
- **PR 2:** ler documentos (base e anexos);
- **PR 3:** comportamento do chat com documentos.

## O que muda

### O problema
- "Faz uma petição inicial de ação de cobrança… pra eu baixar" **não virava documento**: vinha só uma descrição do que uma petição tem, mais um "Guia de estudo".
- "Gera um artigo sobre a Lei do Inquilinato" **virava documento** normalmente (ABNT, no editor, com Exportar).
- **Causa:** o código só conhecia 4 tipos de trabalho (artigo, relatório, TCC e pesquisa), todos acadêmicos. Pedido de peça jurídica era lido como "explicar o conceito".

### A correção (`lib/documento/pecaJuridica.ts`)
- **Reconhece o pedido de peça pronta** (`pedePecaJuridica`):
  - petição inicial, contestação, recurso (apelação, agravo, embargos), contrato, parecer, procuração e notificação extrajudicial;
  - "peça processual" ou "minuta" sem dizer qual.
  - **Não** confunde com quem quer aprender ("como fazer uma petição?", "o que é contestação") nem com trabalho acadêmico sobre o tema ("artigo sobre contratos").
- **Roteador** (`lib/agent/router.ts`): pedido de peça vira `criar_trabalho` com o tipo `peca`. A regra vale antes do palpite do modelo, que lia "faz uma petição" como explicação.
- **Documento com a estrutura da peça**, não do artigo. Exemplos:
  - petição: endereçamento, qualificação das partes, fatos, direito, pedidos, provas, valor da causa e fechamento;
  - contrato: objeto, obrigações, preço, prazo, rescisão, penalidades, foro e assinaturas.
- **Aviso fixo no topo** ("OBSERVAÇÃO"): é modelo para estudo, não substitui advogado, e precisa de revisão antes de usar ou protocolar.
- **Dados que o aluno não deu ficam entre colchetes**, como [NOME DO AUTOR], [CPF] e [COMARCA]. A IA não inventa dados, jurisprudência nem número de processo.
- **Escrita** pelo envelope (`lib/llm/envelope`, os provedores atuais), sem Google direto. Abre no mesmo editor, com "Exportar". Se falhar, o documento fica com status "erro" e o aviso.
- **Documento novo sempre:** com um artigo aberto, a peça não edita o artigo.

### O Exportar sem Google
- `app/api/documents/abnt-export` chamava o Vertex (Google) direto pra gerar o resumo e as palavras-chave.
- Com a cota do Google acabada, o export saía com o resumo cortado e as palavras-chave "Pesquisa, Acadêmico, Zaeon".
- Agora usa o envelope (os provedores atuais).

### Ajustes da revisão (Sourcery, PR #874)
- **"Artigo" de lei não atrapalha:** "petição… com base no artigo 23 da Lei 8.245" continua sendo peça. "Pesquisa sobre contratos" e "estudo sobre recursos" são trabalho, não peça.
- **O aviso nasce escrito** quando o documento é criado. Ele fica mesmo se a geração falhar.
- **O texto do aluno não é sobrescrito:** se ele escrever numa parte enquanto a peça é gerada, o texto dele fica.
- **Título com outra grafia** ("Dos Pedidos.") casa com a parte certa, sem duplicar.
- **Parte que não veio** aparece marcada no texto ("[ESTA PARTE NÃO VEIO NA GERAÇÃO…]"), e o documento sai como "erro", não "pronto".
- **O mesmo pedido de novo** em menos de 3 minutos (reenvio) não cria uma segunda peça.
- **Funciona também sem o chat único**, no chat de um trabalho só.
- **Se o gerador nem começar**, o documento é marcado "erro" e não fica preso em "gerando".
- **A arena da orquestra** aceita o tipo `peca`.
- **O editor não quebra** com um tipo sem modelo próprio (volta pro modelo clássico).

## Para o Martinez

- Chat, roteador, documento e export são área dele.
- Tipo novo: `WorkKind` ganhou `"peca"`, e o `workType` do documento é "Peça jurídica".
- **Limite conhecido:** o Exportar ainda monta no formato acadêmico (ABNT com capa). Pra peça, o melhor hoje é escolher **APA/Vancouver** (sem capa). Um formato próprio de peça no `abnt-service` fica pra outro PR, porque é área de deploy.
- Não precisa de `prisma db push`.

## Testes automáticos

- `lib/documento/pecaJuridica.test.ts` (novo, 36 testes depois da revisão):
  - os 8 tipos de pedido reconhecidos;
  - 6 frases que **não** são pedido de peça (aprender, artigo, TCC);
  - o roteador manda pra `criar_trabalho`/`peca`;
  - a estrutura da peça não tem resumo, metodologia nem referências;
  - o título;
  - o prompt proíbe inventar dados e jurisprudência;
  - o aviso é sempre o nosso;
  - a geração grava as seções e marca "pronto", e na falha marca "erro";
  - usa o envelope, sem Vertex;
  - o turno cria "Peça jurídica" e não edita o artigo aberto;
  - o export sem Vertex.
- Roteador, TCC, documento, export e orquestra continuam passando. O `lib/orquestra/console.test.ts` falhou uma vez por tempo e passou sozinho (18/18).
- Suíte completa (23/11): 838 arquivos, 8089 testes passando. Não teve nenhuma falha nova: as que aparecem são as mesmas da main.

## Verificado na prévia

- A prévia local não tem banco de dados nem chave dos provedores, então a peça não pode ser gerada aqui.
- Fica coberta pelos testes e pelo teste em produção abaixo.

## Como testar em produção (depois do deploy, no chat da Aura)

1. **Petição:** "Faz uma petição inicial de ação de cobrança de R$ 3.000 de aluguel atrasado".
   - Ao lado da "Conversa" abre um documento "Petição inicial — …", com o aviso no topo.
   - Endereçamento, partes, fatos, direito, pedidos e valor da causa vêm preenchidos.
   - Os dados que faltam aparecem entre colchetes.
2. **Contrato:** "redija um contrato de prestação de serviços de design". Vêm as cláusulas de objeto, preço, prazo, rescisão e foro.
3. **Outros tipos:** "faça um parecer jurídico sobre…", "cria uma procuração…", "me passa uma notificação extrajudicial…". Cada um com a sua estrutura.
4. **Não vira peça:** "como fazer uma petição inicial?". A Aura explica, sem criar documento.
5. **Artigo continua igual:** "gera um artigo sobre a Lei do Inquilinato". Sai o artigo ABNT, como antes.
6. **Exportar:** na peça, clique em Exportar, escolha APA e Word. O arquivo baixa com o texto da peça.
7. **Exportar um artigo:** o resumo e as palavras-chave vêm do texto, e não "Pesquisa, Acadêmico, Zaeon".

## Resultado dos testes

| Teste | Resultado |
|---|---|
| 1. Petição | ✅ 24/11 ("Petição inicial — ação de cobrança de R$ 3.000…", com o aviso, as partes e os colchetes). ❌ citou "REsp 1.234.567", número inventado: corrigido no PR 4 |
| 2. Contrato | ✅ 24/11 (cláusulas e colchetes) |
| 3. Outros tipos | ✅ 24/11, procuração para o INSS. ❌ a bolha disse "a base de conhecimento não contém informações…": corrigido no PR 4 |
| 4. Não vira peça | ✅ 24/11 (explicou e abriu um diagrama, sem criar peça) |
| 5. Artigo continua | ✅ 24/11. ❌ título "a Lei do Inquilinato" com minúscula e o gráfico "Papers por ano" na bolha: corrigidos no PR 4 |
| 6. Exportar a peça | ❌ 25/11: "Erro no serviço ABNT: Internal Server Error" em Word e PDF (o "—" do título no nome do arquivo). Corrigido no PR 4 |
| 7. Exportar o artigo | ⏳ falta testar (fica pro teste do PR 4) |
