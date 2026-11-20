# Paper Orquestra: o artigo completo pelo chat, no documento editável (nov/2026)

> Código: `lib/paper-orquestra/` (pipeline + prompts + peças puras) · cola: `lib/tcc/gerar.ts` `gerarComPaperOrquestra`
> Gatilho: `lib/tcc/turno.ts` (pedido de trabalho NOVO no chat) e `POST /api/tcc`
> Flag: `PAPER_ORQUESTRA=1` (padrão desligado = byte a byte o caminho de antes)
> Origem: [google-research/paper-orchestra](https://github.com/google-research/paper-orchestra) (Apache-2.0),
> artigo arXiv:2604.05018. Prompts e lógica PORTADOS para TypeScript e adaptados ao pt-BR/ABNT.

## O problema

Pedido "escreva um artigo sobre X" no chat → a Aura escreve o documento INTEIRO dentro de **uma** resposta
JSON (`work.sections`), disputando o orçamento de saída com núcleo, conceitos, evidência e fontes. Medido
em prod (2026-11-10): 57 palavras numa seção cujo piso é 180. Com seções da Aura na resposta, o documento
nascia com esse texto raso (`tccDoTurno`: `gerando = doModelo.length === 0`) e o gerador por seção nem rodava.

## A decisão: camada de EXECUÇÃO, não substituição

O PaperOrchestra entra como o motor que **escreve** o documento editável que já existe (chat único / TCC →
`ResearchWork` → aba do `TccPanel`, export ABNT). Nada do que a Zaeon já sabe sai do caminho:

| continua da Zaeon | vem do PaperOrchestra |
|---|---|
| o chat, o `classify` (`criar_trabalho`), o `tccDoTurno` que cria o documento | o PIPELINE de agentes especializados |
| o esqueleto ABNT do documento (`ESQUELETO_ARTIGO/TCC/RELATORIO` ou o plano do pedido) — é ele o "template" | o esboço (plano de figuras, estratégia de busca macro/micro, plano por seção com `citation_hints`) |
| as bases acadêmicas (`retrievePapers`: OpenAlex, Crossref, arXiv, PubMed, Semantic Scholar) e a base do aluno pela skill de trechos (docs/TRECHOS_EM_PAPEL.md: passagem literal com página) | as buscas DIRIGIDAS pelo esboço (introdução × revisão × citação obrigatória) |
| "referências do pedido substituem a busca" (decisão do dono) | a separação ideia / dados (nenhum número fora do que o aluno deu) |
| citação autor-data e referência ABNT (`lib/documento/fontes`), `referenciasNovas` | escrita por etapas: Introdução + Revisão primeiro, depois o resto, com o rascunho à vista |
| `aplicarNoTcc` (histórico por seção, Pusher/poll — o aluno vê cada seção nascer) | parecerista AgentReview (nota 1–10) + refinamento que só aceita versão com nota melhor |
| rota/modelo do `planoDaSecao` (Pro pra quem tem direito, pool grátis ou Flash), ledger por documento | — |
| o gerador por seção de antes, como **rede**: completa só o que ficar vazio | — |

## O pipeline (o `write_single_paper` de `methods/paper_writer.py`)

```
"escreva um artigo sobre X" ─ chat (Aura responde o núcleo) ─ tccDoTurno ─ documento nasce do esqueleto, "gerando"
  └─ gerarTccEmBackground ─ PAPER_ORQUESTRA=1 ─ gerarComPaperOrquestra
       0. Materiais   pedido → ideia + dados (+ título do documento)          [novo: no PO são arquivos prontos]
       1. Esboço      OutlineAgent → JSON com plotting_plan / intro_related_work_plan / section_plan
       2. Literatura  HybridLiteratureAgent → até 16 buscas nas bases (4 em paralelo) → registro [E#]
                      → escreve INTRODUÇÃO + REFERENCIAL TEÓRICO  ─────────── grava no documento
       3. Seções      SectionWritingAgent → o resto numa chamada; o que faltar, uma chamada por seção ── grava
       4. Refinamento AgentReview + ContentRefinementAgent, até 2 voltas, só fica a versão de nota maior ── regrava
       ─ REFERÊNCIAS: das chaves [E#] realmente citadas, em ABNT
  └─ sobrou seção vazia ou o pipeline caiu → gerarPorSecao (o de antes) completa só os buracos → "pronto"
```

### Adaptações deliberadas

- **LaTeX → markdown nas seções do documento.** `# TÍTULO` é a seção do documento, `##` é subtítulo dentro do corpo
  (o formato que o editor já guarda). O export ABNT (DOCX/PDF) continua o de sempre.
- **Google Search + Semantic Scholar → `retrievePapers` da casa.** O registro `[E#]` (com o resumo de cada paper,
  como o `citation_map.json` do original) só existe dentro do pipeline: o modelo cita `[E3][E7]`, o código grava
  `(SILVA, 2020; SOUZA, 2021)` e corta chave inventada. Colisão de autor-ano vira `2020a/2020b`.
- **"No leakage" → "só materiais + evidências".** O PO proíbe conhecimento de treino porque reescreve papers
  existentes; aqui o aluno pede um tema, então o lastro é a evidência buscada. Continua proibido inventar dado,
  número, autor, resultado ou citação.
- **Sem dados do aluno** (o caso comum), o esboço planeja um trabalho de **revisão**: sem resultado próprio, sem
  tabela com número inventado.
- **Revisor com 1 parecer** (o PO faz ensemble de 3) e as voltas sempre dentro do prazo.
- **O aluno vence.** Seção que ele escreveu antes não entra no pipeline; seção que ele editar DURANTE a geração não
  é sobrescrita pelo refinamento (o `salvarSecao` só troca texto que ainda é o último que gravamos).

## Fora deste PR (fases seguintes)

1. **Plotting agent**: o `plotting_plan` do esboço já sai. Ligar ao G3 (`lib/agent/grafico.ts`, SVG por código) quando
   houver dados do aluno, e ao diagrama do Studio para figura conceitual.
2. **Revisão visual** do PDF ABNT (o `format_agent` + VLM), quando o worker ABNT devolver páginas renderizadas.
3. **Conversa e anexos como materiais**: hoje o pipeline lê o pedido (com texto colado) via `Briefing.instrucoes`;
   levar o histórico e os anexos do turno até `gerarTccEmBackground`.
4. **Não gastar o rascunho da Aura** quando a flag estiver ligada (hoje ela ainda redige `work.sections` que o
   documento descarta): instruir o harness a responder só o núcleo em pedido de trabalho novo.
5. **Arena de qualidade**: comparar nota do parecerista, cobertura de citação e custo contra o gerador por seção.

## Como ligar

1. `PAPER_ORQUESTRA=1` no `.env` da VPS — o compose já repassa ao **web** e ao **worker** (o turno do chat roda no
   worker com `CHAT_BG=1`). O trilho do documento precisa estar ligado (`CHAT_UNICO=1` ou `TCC_CROSS=1`).
2. Opcionais (com padrão): `PAPER_ORQ_MODELO_ESCRITOR` / `PAPER_ORQ_MODELO_REVISOR` (vazio = `planoDaSecao`),
   `PAPER_ORQ_REFLEXOES` (2; `0` desliga o refinamento), `PAPER_ORQ_MAX_BUSCAS` (16), `PAPER_ORQ_PRAZO_MS` (900000).
3. Rerun do `deploy.yml` (regra de prod: nunca recriar o web à mão).
4. Acompanhar no log: `[paper-orquestra] <workId>: <etapa>` e a linha `concluído {...}` com chamadas, buscas,
   evidências, citadas, inválidas, nota inicial/final e voltas aceitas. Custo no TokenLedger por `taskId` = id do documento.

Custo esperado por artigo: ~6–9 chamadas de modelo longas (materiais, esboço, literatura, seções, 1–3 pareceres,
0–2 refinamentos) + até 16 buscas acadêmicas. Medir nas primeiras gerações antes de abrir para todos.
