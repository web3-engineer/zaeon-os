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
       2. Literatura  HybridLiteratureAgent → até 16 buscas nas bases (4 em paralelo)
                      → ENRICHMENT: resumo ausente buscado pelo DOI (OpenAlex)  [o "S2 enrichment" do PO]
                      → TRIAGEM por título e resumo (inclusiva, piso de 12)     [novo: o PO escolhe pelo Google]
                      → registro [E#] + REGISTRO DE BUSCA (bases, consultas, números da triagem, critérios reais)
                      → escreve INTRODUÇÃO + REFERENCIAL TEÓRICO  ─────────── grava no documento
       3. Seções      SectionWritingAgent → o resto numa chamada; o que faltar, uma chamada por seção ── grava
      3b. Condensar   o "Page Limit Enforcement" do format_agent: seção > 115% do teto é enxugada ── regrava
       4. Refinamento AgentReview + ContentRefinementAgent, até 2 voltas; devolve SÓ as seções que mudou;
                      só fica a versão de nota maior e que cabe no orçamento ── regrava
       ─ REFERÊNCIAS: das chaves [E#] realmente citadas, em ABNT (NBR 6023/10520)
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
- **Orçamento de palavras por seção** (`orcamentoDaSecao`), pelo tipo de trabalho — o "page limit" do original.
- **Metodologia honesta.** Em revisão, a metodologia descreve o REGISTRO DE BUSCA e nada além (sem PRISMA, Scopus ou
  "dois revisores" que não aconteceram; os critérios são os únicos aplicados). Com dados do aluno, a busca de literatura
  não é método. Detalhe de coleta que o aluno não deu (plataforma, termo de consentimento, forma de seleção da amostra,
  teste não informado) vira LIMITAÇÃO declarada — inclusive quando o parecerista pergunta.
- **ABNT de verdade.** Citação com até 3 sobrenomes ou "et al." (4+), referência "SOBRENOME, I." com veículo; nome no
  formato PubMed ("Schmidt MJ") e instituição listada como autor são tratados. Estatística simples sai como texto.
- **O aluno vence.** Seção que ele escreveu antes não entra no pipeline; seção que ele editar DURANTE a geração não
  é sobrescrita pelo refinamento (o `salvarSecao` só troca texto que ainda é o último que gravamos).

## Avaliação: o gerador × documentos escritos à mão (nov/2026)

> Pasta: `docs/avaliacao-paper-orquestra/` · medidor: `lib/paper-orquestra/avaliar.ts` · roteiros: `scripts/paper-orquestra/`

**Método.** Três casos que cobrem os três caminhos do gerador — artigo de REVISÃO (sem dados), artigo COM DADOS (tabela
colada no pedido) e TCC. Cada caso roda o pipeline de verdade (Vertex `gemini-3.5-flash`, bases acadêmicas reais) com
`scripts/paper-orquestra/gerar-local.ts`, sem banco. Uma versão de REFERÊNCIA de cada um foi escrita à mão com as MESMAS
fontes incluídas (`fontes-da-rodada.ts`), o mesmo esqueleto ABNT e a mesma regra de lastro. A partir da 3ª rodada a
biblioteca foi fixada (`biblioteca/*.json`): as rodadas comparam a ESCRITA com o mesmo material. `comparar.ts` mede
quantidade (palavras por seção, parágrafos), riqueza (subseções, obras citadas, densidade de citação, referências,
tabelas, equações), regras (resumo + palavras-chave, voz impessoal, nenhuma chave interna sobrando) e entrega (título,
nenhuma seção vazia). "Similar" = toda métrica dentro de ±25% (ou diferença absoluta pequena em contagem baixa).

**O que as rodadas acharam e consertaram no gerador** (cada item é código + teste):

| rodada | achado | conserto |
|---|---|---|
| 1 | metodologia INVENTADA (PRISMA, Scopus, Web of Science, "dois revisores") | registro de busca real + regra de lastro de método |
| 1 | revisão respondendo ao parecer com detalhe de coleta inventado (Google Forms, TCLE, bimestre) | método/coleta só dos dados; o resto vira limitação |
| 1 | 7 de 40 fontes sem resumo, citadas mesmo assim; fontes fora do tema | fonte sem resumo fica fora; TRIAGEM por título e resumo |
| 1 | citação "(A, 2020), (B, 2021)"; referência sem ABNT | grupo de citação; NBR 10520/6023 (et al., iniciais, veículo) |
| 1 | refinamento devolvendo o trabalho inteiro e truncando | refinamento devolve só as seções que mudou |
| 2 | TCC com 1 fonte: 38 de 49 sem resumo (Crossref/PubMed) | ENRICHMENT do resumo pelo DOI (OpenAlex); triagem inclusiva com piso |
| 3 | nomes do PubMed ("Schmidt MJ") viravam "(M; J; C, …)"; instituição como autor | formato PubMed e instituição tratados |
| 3 | artigo com dados descrevendo a busca de literatura como método | registro de busca só em revisão |
| 3–7 | gerador 1,3–1,7× mais longo; metodologia 2–3,6×; poucas subseções | orçamento de palavras por seção; subseções por seção |
| 6 | 429 do Vertex com 3 documentos em paralelo: seções inteiras perdidas | nova tentativa com espera crescente |
| 7–13 | instrução não converge sozinha (±20% entre rodadas) | AUDITORIA DE ENTREGA: checagem de código + ajuste por seção, aceito só se aproximar |
| 15 | a MESMA tabela de dados repetida em 3 seções | tabela só em Resultados (determinístico) |
| 17 | "cite menos" virava "escreva menos" no ajuste | citação repetida no parágrafo sai em código; parágrafo longo partido em código |

**Resultado.** Similares nos três casos na rodada 14 (depois de corrigir um defeito do próprio medidor), na 16 e em DUAS
RODADAS SEGUIDAS, 19 e 20 — o critério de parada. Os documentos da pasta são os da rodada 20; `comparacao-*.md` traz a
tabela métrica por métrica. O TCC bateu em 8 das últimas 10 rodadas. Entre as rodadas 15 e 18 cada documento ainda
oscilou numa métrica de estilo por vez (densidade de citação, número de parágrafos), corrigidas como acima.

**O que NÃO foi verificado.** A métrica mede forma, não verdade: a fidelidade das afirmações às fontes foi conferida por
amostragem na leitura, não sistematicamente. A nota do parecerista (o modelo) ficou entre 5 e 6/10 em todas as rodadas.
As referências foram escritas por quem também ajustou o gerador. Nada disso rodou no documento editável logado, só pelo
roteiro — a seção seguinte cobre isso.

## Verificação no documento editável LOGADO (nov/2026)

A avaliação acima rodou pelo roteiro. A suíte `tests/e2e_paper` (Python, ver o README dela) roda o caminho real: app de
pé, sessão NextAuth, Minha base (Postgres+pgvector), pdf-loader, Vertex; a aluna pede o artigo no chat, escreve a
conclusão NO MEIO da geração, salva o artigo em PDF, sobe pra base e pede um TCC a partir dele. Os oráculos são
independentes de `lib/` (o PDF lido por pypdf é a verdade; DOIs conferidos no Crossref/doi.org).

O que ela achou no gerador (todos corrigidos, cada um com teste):

| Achado | Onde | Conserto |
|---|---|---|
| Material do aluno RENOMEADO no texto ("Apostila Técnica do Sistema Tapiri") | escrita | regra no `REGRA_DE_LASTRO` + oráculo `titulo_inventado` |
| Faixa de chaves `[E1-E7]` vazando na tabela do TCC | conversão de citação | `expandirFaixasDeChaves` + rede final que corta `[E…]` malformada |
| Literatura fora do tema (telescópio Fermi, monção indiana) com o OpenAlex fora | triagem | prompt pelo "teste do orientador"; o PISO de 12 que repunha fonte REJEITADA saiu |
| OpenAlex sem chave: orçamento diário COMPARTILHADO por IP, esgotado → 429 o dia todo | `lib/scholar` | `OPENALEX_API_KEY` (env) + 429 sem retentativa → `rate_limited` → pausa |
| Crossref sem resumo (o parser nem lia o campo) | `lib/scholar` | resumo JATS mapeado |
| `&amp;` cru em título do arXiv | `lib/scholar` | entidades XML decodificadas |

**Pendência do dono:** criar a chave gratuita do OpenAlex e pôr `OPENALEX_API_KEY` no `.env` da VPS (web e worker).
Sem ela, num dia de uso alto a busca de literatura do documento cai pro Crossref (pouco resumo) e arXiv.

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
