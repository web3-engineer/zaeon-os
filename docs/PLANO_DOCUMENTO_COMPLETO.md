# Documento completo: por que ele sai com buracos, e como fechar

> Status: diagnóstico + plano. Nada implementado ainda.
> Auditado em 2026-10-29 sobre a `main` (`b7083a78`).

## 1. O que o pedido é

Receber **vários arquivos de texto** e gerar **texto de nível acadêmico com todos os tópicos
feitos** — o básico da plataforma sendo um documento *já pronto e factível*, dentro das regras da
ABNT (ou outra formatação). Hoje a geração deixa tópicos em branco.

## 2. Por que os tópicos saem em branco (não é o modelo)

A suspeita natural é qualidade de modelo, truncamento de saída ou teto de token. **Não é.** O
documento sai com buracos **por construção**, e isso é verificável lendo três arquivos.

O esqueleto do TCC tem 6 seções (`lib/tcc/secoes.ts:99`):

```
INTRODUÇÃO · REFERENCIAL TEÓRICO · METODOLOGIA · RESULTADOS E DISCUSSÃO · CONCLUSÃO · REFERÊNCIAS
```

O gerador produz corpo para **3** delas (`lib/tcc/gerar.ts:20`, `corposDoEsboco`):

```ts
return {
  [chaveTitulo("INTRODUÇÃO")]: intro,
  [chaveTitulo("METODOLOGIA")]: d.metodologia?.trim() ?? "",
  [chaveTitulo("REFERÊNCIAS")]: d.referencias?.trim() ?? "",
};
```

**REFERENCIAL TEÓRICO, RESULTADOS E DISCUSSÃO e CONCLUSÃO não têm nenhum caminho de código que as
preencha.** E não é esquecimento de um `if`: o contrato do JSON pedido ao modelo
(`DraftJson`, `lib/research/esboco.ts:6`) **não tem chave para elas**. O modelo nunca é perguntado.

O mesmo vale no caminho da Sala de Pesquisa (`buildDocFromDraft`, `lib/abntTemplate.ts:132`), e
`renderSections` (`:100`) emite literalmente um cabeçalho seguido de linhas vazias quando não há
corpo — é o branco que você vê na tela.

Contagem por tipo de trabalho:

| tipo | seções | preenchidas | **em branco** |
|---|---|---|---|
| TCC | 6 | 3 | **3** + as 2 subseções |
| Artigo | 6 | 4 | **2** |
| Relatório | 6 | 3 | **3** |

As subseções são um caso ainda mais claro: `WORK_SECTIONS.TCC` declara
`subs: ['Conceitos Fundamentais', 'Estado da Arte']`, e `renderSections` **nunca** recebe corpo para
sub — elas saem vazias 100% das vezes, em todo documento já gerado.

**Causa raiz:** uma única chamada ao modelo, um único JSON, 8 campos
(`ESBOCO_SYS`, `lib/research/esboco.ts:17`) — e esse contrato é **menor que o esqueleto** que ele
precisa preencher. É um esboço sendo usado como se fosse um documento.

## 3. Por que a janela de arquivos não ajuda (ela não chega no gerador)

O gerador recebe `{ topic, references: string[] }` — e `references` são **strings de citação**,
cortadas em 12 (`app/api/ai/research-draft/route.ts:28`). A geração em background do TCC é ainda
mais magra: chama `esbocoUser(topic)` **sem nem as referências** (`lib/tcc/gerar.ts:44`).

Enquanto isso, existe um RAG completo e testado em `lib/rag/`: ingestão, corte em trechos de 3.000
caracteres, embeddings, pgvector, busca com `K_PADRAO = 8`, citação e permissão. Ele atende o chat.

**Ele nunca é consultado pela geração de documento.** Nenhum import de `lib/rag/` em `lib/tcc/`,
`lib/research/` ou nas rotas de geração.

E a ingestão **aceita apenas PDF** (`app/api/rag/minha-base/route.ts:27`):

```ts
const ehPdf = (f: File) => f.type === "application/pdf" || /\.pdf$/i.test(f.name);
// ... if (!ehPdf(f)) → erro "nao_pdf"
```

Ou seja: **"receber múltiplos arquivos de texto" hoje é recusado na porta** — `.txt`, `.md`, `.docx`
voltam com erro. Limites atuais: 25 MB por arquivo, 50 documentos por usuário, 2 envios em paralelo.

## 4. O terceiro buraco: o "nível acadêmico" existe, mas no caminho errado

`lib/tcc/rigor.ts` já tem a maquinaria que faz um texto ser acadêmico de verdade:
busca de papers reais, um **crítico determinístico** que derruba toda edição sem fonte verificada, a
chamada autor-data da NBR 10520 (`chamadaAutorData`) e a referência NBR 6023
(`formatAbntReference`).

Isso só roda no caminho de **revisão** (a Sala de Pesquisa lapidando um documento que já existe).
A **geração** não passa por nada disso. Daí a assimetria que você sente: revisar entrega rigor,
gerar entrega esboço.

## 5. Técnicas open-source que resolvem exatamente isto

| técnica | o que é | onde encaixa aqui |
|---|---|---|
| **[STORM](https://github.com/stanford-oval/storm)** (Stanford, MIT, DSPy) | duas etapas: pré-escrita que pesquisa e monta o **outline**, depois escrita **seção por seção** com citações ([paper](https://arxiv.org/pdf/2402.14207)) | é o remédio do §2. E a boa notícia: `gerarTccEmBackground` **já tem o laço** de escrever uma seção por vez — está só alimentado por um esboço de 3 corpos |
| **rascunho-até-agora como contexto** (ex.: `long_writer` do [DeepCritical](https://huggingface.co/spaces/DataQuests/DeepCritical/blob/refs%2Fpr%2F2/src/agents/long_writer.py)) | o escritor recebe o documento parcial ao escrever a próxima seção | evita que CONCLUSÃO contradiga INTRODUÇÃO, e é o que faz o texto ler como um documento e não como 6 respostas |
| **[RAPTOR](https://github.com/parthsarthi03/raptor)** (MIT, [ICLR 2024](https://iclr.cc/virtual/2024/poster/19034)) | embute, **clusteriza e resume recursivamente** os trechos, montando uma árvore; a busca puxa de vários níveis | é a resposta do §3 para REFERENCIAL TEÓRICO. Com 10 arquivos, um top-k=8 de trechos planos responde "qual o método do texto 3?", mas **não** "o que esses 10 textos dizem em comum sobre X" — que é justamente o que uma revisão de literatura é |
| **orçamento de contexto por seção** (a disciplina de context packing de ferramentas como [prompt-tower](https://repos.ecosyste.ms/topics/llm-context)) | escolher o que entra no prompt dentro de um teto explícito | o pool grátis tem teto apertado (o Groq roda com 8K TPM). Seção por seção **cabe**; o documento inteiro de uma vez não |

**O ganho colateral que vale dizer em voz alta:** trocar 1 chamada grande por N chamadas pequenas
não é só qualidade — é o que faz isso **caber no VPS com o pool grátis**. O modo atual pede 8 campos
de texto acadêmico numa resposta só; é exatamente o formato que estoura limite de saída e volta
truncado. Seção por seção, cada chamada é pequena, e uma que falhe não leva o documento junto.

## 6. A definição de "pronto" que eu proponho fixar

> **Documento básico = nenhuma seção do esqueleto sai vazia, e nenhuma afirmação de fonte sai sem a
> fonte.**

Isso vira **invariante testada**, não meta: um documento com seção vazia não passa no gate.

Quando uma seção não pode ser fundamentada (sem arquivos, sem papers), ela **não sai em branco e não
sai inventando**: sai escrita no registro acadêmico com o recorte explícito do que falta — e
marcada. Branco silencioso é o pior dos três desfechos, porque o aluno descobre na entrega.

## 7. Fases (1 PR cada, flag + rollback)

| Fase | Entrega | Risco | Depende de |
|---|---|---|---|
| **F0** | Ingestão aceita `.txt`, `.md`, `.docx` além de PDF. Destrava "múltiplos arquivos de **texto**" — hoje recusado na porta. | zero | — |
| **F1** | `lib/documento/plano.ts` **puro**: do esqueleto (incl. subseções) sai um slot obrigatório por tópico, com `nenhumVazio()` como invariante testada. O contrato passa a ser do tamanho do documento. | zero | — |
| **F2** | Gerador **seção por seção** (etapa de escrita do STORM): uma chamada por slot, recebendo o outline + o rascunho-até-agora. Retry por seção. Nenhuma seção fica vazia em silêncio. | baixo | F1 |
| **F3** | RAG **na geração**: busca por seção em `lib/rag/busca`, citação ABNT reusando `chamadaAutorData`/`formatAbntReference` do `rigor.ts`. O "nível acadêmico" muda de caminho. | baixo | F0, F2 |
| **F4** | RAPTOR-lite: resumo por documento + um nível global, para REFERENCIAL TEÓRICO e RESULTADOS falarem do **conjunto** dos arquivos, não de um trecho. | médio | F3 |
| **F5** | Gate de completude no export: ABNT não sai com buraco; o que falta vai no relatório, não no PDF. | baixo | F1, F2 |

**Rollback em qualquer fase:** flag por fase; sem ela, o caminho atual (`corposDoEsboco`) continua
valendo byte a byte.

## 8. 🔒 Portões do dono — DECIDIDOS (2026-10-29)

1. **Seção sem fundamentação → escreve E MARCA.** A seção sai completa, no registro acadêmico, com
   um marcador visível de "precisa de fonte" nela e no relatório. Nunca sai branca, nunca finge ter
   fonte. É isso que torna `nenhumVazio()` uma invariante possível de cumprir: há sempre um desfecho
   escrito, e a honestidade fica no marcador — não num buraco que o aluno descobre na entrega.
2. **Teto: 10 arquivos por documento.** Cabe no orçamento de contexto por seção **sem** árvore de
   resumos → a **F4 (RAPTOR) passa a ser opcional**, entra só se o REFERENCIAL ficar raso na
   prática. (O RAG continua guardando 50 por usuário; este teto é por trabalho.)
3. **Formatação:** ABNT é o alvo agora. O esqueleto já nasce com a norma como parâmetro para que
   APA/Vancouver sejam um dado, não um refactor — mas só ABNT é implementada.

**Ordem de execução escolhida: F0 + F1 juntas** (risco zero, não mudam o comportamento atual),
depois F2, que é onde os brancos morrem.
