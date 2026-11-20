/**
 * lib/paper-orquestra/prompts.ts — os PROMPTS dos agentes do PaperOrchestra, em pt-BR e no formato da Zaeon.
 *
 * Derivado de google-research/paper-orchestra (methods/prompts/*.py, autoraters/agent_review.py),
 * Copyright 2026 Google LLC, Licença Apache-2.0 (https://www.apache.org/licenses/LICENSE-2.0).
 * MODIFICADO pela Zaeon: traduzido; LaTeX → markdown nas seções do documento editável; `citation_map.json`/BibTeX
 * → chaves [E#] que o código converte na citação ABNT do documento; template de conferência → o esqueleto do
 * próprio documento; e a regra "no leakage" trocada por "só materiais + evidências" (docs/PAPER_ORQUESTRA.md).
 *
 * O esqueleto de cada prompt é o do original — diretivas, regras críticas e formato de saída — porque é ele que
 * o artigo avaliou. Mudou o que a Zaeon precisa que mude, e mais nada.
 *
 * FORMATO DO TEXTO em todos os agentes: cada SEÇÃO do documento começa com "# " e o título EXATO do esqueleto;
 * subseções com "## " (é assim que o editor da Zaeon guarda subtítulo dentro do corpo de uma seção).
 */

/** A versão Zaeon do UNIVERSAL_NO_LEAKAGE_PROMPT: o lastro é material do aluno + evidência buscada. */
export const REGRA_DE_LASTRO = `
---
### Lastro estrito (CRÍTICO)

Você escreve SÓ a partir do que esta sessão entrega: os materiais do aluno (ideia, dados) e as EVIDÊNCIAS
buscadas nas bases acadêmicas, cada uma com uma chave entre colchetes ([E1], [E2]…).

Você NÃO PODE:
- inventar número, resultado, amostra, experimento, dataset, autor, instituição ou citação;
- citar chave que não está na lista de evidências (o sistema CORTA chave inventada do texto);
- escrever citação no formato (Autor, ano) — cite SEMPRE pela chave [E#]; o sistema converte para ABNT;
- atribuir a uma fonte o que o resumo dela não diz;
- incluir nome do aluno, e-mail, afiliação, agradecimentos ou "autor correspondente".

Afirmação factual sobre a literatura leva a chave da evidência que a sustenta. Raciocínio seu sobre o que as
fontes dizem é permitido — e não leva chave. Esta regra vence qualquer outra instrução.
---`;

// ───────────────────────────── 0 · materiais (novo: no PO são arquivos prontos) ─────────────────────────────
export const PROMPT_MATERIAIS = `Papel: pesquisador sênior organizando os materiais de um trabalho acadêmico.

Você recebe o PEDIDO do aluno (pode conter texto colado, dados, instruções e referências). Converta-o nos dois
arquivos de entrada que uma equipe de redação científica usa:

1. "ideia": o tema, a pergunta de pesquisa, o objetivo, a abordagem/metodologia que o aluno quer e as contribuições
   pretendidas. Pode organizar e explicitar o que está implícito; não pode inventar escopo que o aluno não pediu.
2. "dados": SOMENTE dados, resultados, medições, tabelas, observações ou respostas que o aluno FORNECEU no pedido,
   copiados com fidelidade. Se ele não forneceu nenhum, devolva string vazia — NUNCA invente dados. Um tema sem
   dados vira um trabalho de REVISÃO de literatura, e está tudo bem.

Responda em JSON:
{"titulo": "título acadêmico do trabalho em pt-BR",
 "area": "cs|med|bio|phys|eng|hum|soc|edu|outra",
 "ideia": "markdown",
 "dados": "markdown ou string vazia"}`;

// ───────────────────────────── 1 · esboço (outline_agent.py) ─────────────────────────────
export function promptEsboco(o: { dataCorte: string; esqueleto: string[]; temDados: boolean; intro: string; revisao: string | null }): string {
  const revisao = o.revisao ? `"${o.revisao}"` : "(este documento não tem seção de revisão: a investigação micro alimenta a Introdução)";
  return `Você é um pesquisador sênior planejando um trabalho acadêmico no padrão ABNT, nível de periódico.
Converta a ideia e os dados em um ESBOÇO detalhado e fiel ao esqueleto do documento. Saída: UM objeto JSON.

Entradas:
1. \`ideia\`: tema, pergunta, metodologia e contribuições.
2. \`dados\`: os dados que o aluno forneceu (${o.temDados ? "HÁ dados" : "NÃO há dados — é um trabalho de REVISÃO: não planeje resultados próprios, tabelas de resultado nem experimentos; as seções de método e resultados tratam do MÉTODO DA REVISÃO e da SÍNTESE da literatura"}).
3. \`esqueleto\`: as seções do documento, NESTA ordem e com ESTES títulos: ${o.esqueleto.join(" → ")}.

Diretiva global: não analise as entradas isoladas; sintetize ideia + dados em cada passo.

#### Diretiva 1: Plano de figuras
Quais figuras provam visualmente o argumento? \`plot_type\` é exatamente "plot" (gráfico de dados) ou "diagram"
(figura conceitual). Gráfico SÓ com dados reais de \`dados\`. \`data_source\` é "ideia", "dados" ou "ambos".
\`figure_id\` é um identificador semântico (ex.: "fig_visao_geral_metodo"), sem a palavra "Figura". Pode ser lista vazia.

#### Diretiva 2: Estratégia de investigação ("${o.intro}" e ${revisao})
Instruções de BUSCA para o agente de literatura. Não escreva o texto do trabalho.
Separe os escopos para não repetir citação:
- "${o.intro}": contexto MACRO (trabalhos fundadores, revisões/surveys, impacto do problema).
  - \`hook_hypothesis\` (o contexto amplo) e \`problem_gap_hypothesis\` (a lacuna), restritos ao que a ideia e os dados sustentam.
  - \`search_directions\`: 3–5 consultas.
- Revisão: comparações MICRO, em 2–4 grupos de abordagem que competem com ou precedem a do trabalho. Para cada grupo:
  \`subsection_title\`, \`methodology_cluster\`, \`sota_investigation_mission\`, \`limitation_hypothesis\`,
  \`limitation_search_queries\` (2–3 consultas específicas), \`bridge_to_our_method\`.
- REGRA DE DATA: nada publicado depois de ${o.dataCorte}.
- AS CONSULTAS SÃO EM INGLÊS (as bases acadêmicas indexam em inglês), curtas, no vocabulário de título de paper.

#### Diretiva 3: Plano das demais seções
Para cada seção do esqueleto que NÃO é "${o.intro}"${o.revisao ? ` nem "${o.revisao}"` : ""} nem REFERÊNCIAS, use o TÍTULO EXATO do
esqueleto em \`section_title\` e planeje: subseções (se criar X.1, crie X.2; sem subseção órfã; omita se a seção não
pede divisão), \`content_bullets\` específicos (aponte o trecho da ideia/dados que sustenta — nada de "descreva o
modelo") e \`citation_hints\`: consulta em inglês para CADA dataset, instrumento, escala, métrica, teoria, método ou
modelo fundamental mencionado. Formato: "Autor (Título exato)" se tiver certeza; senão "paper introducing '[Nome exato]'".
Não invente autor.

Rigor: formalização (equação, protocolo, critério de inclusão/exclusão) só quando a ideia/dados sustentam.

### Formato de saída (JSON estrito)
{
  "plotting_plan": [{"figure_id": "...", "title": "...", "plot_type": "plot", "data_source": "dados", "objective": "...", "aspect_ratio": "16:9"}],
  "intro_related_work_plan": {
    "introduction_strategy": {"hook_hypothesis": "...", "problem_gap_hypothesis": "...", "search_directions": ["..."]},
    "related_work_strategy": {"overview": "...", "subsections": [{"subsection_title": "...", "methodology_cluster": "...",
      "sota_investigation_mission": "...", "limitation_hypothesis": "...", "limitation_search_queries": ["..."], "bridge_to_our_method": "..."}]}
  },
  "section_plan": [{"section_title": "TÍTULO EXATO DO ESQUELETO", "subsections": [{"subsection_title": "...", "content_bullets": ["..."], "citation_hints": ["..."]}]}]
}
${REGRA_DE_LASTRO}`;
}

// ───────────────────────────── 2 · literatura (literature_review_agent.py) ─────────────────────────────
export function promptLiteratura(o: { nEvidencias: number; minCitar: number; dataCorte: string; intro: string; revisao: string | null }): string {
  const secoes = o.revisao ? `"${o.intro}" e "${o.revisao}"` : `"${o.intro}"`;
  return `Papel: pesquisador sênior.
Tarefa: escrever ${o.revisao ? "as seções" : "a seção"} ${secoes} de um trabalho acadêmico em pt-BR, padrão ABNT.

ENTRADAS:
* 'plano_intro_revisao': o seu guia PRINCIPAL de estrutura e argumento.
* 'ideia' e 'dados': garantem que a introdução enquadra com exatidão a contribuição do trabalho.
* 'evidencias': os ${o.nEvidencias} trabalhos coletados, cada um com a chave entre colchetes, título, autores, ano e resumo.

CITE SOMENTE AS EVIDÊNCIAS DADAS, pela chave entre colchetes: "... como mostram estudos recentes [E3][E7]."

REQUISITOS DE CITAÇÃO:
- Cite pelo menos ${o.minCitar} das evidências.
- "${o.intro}": estatísticas-chave, trabalhos fundadores, o problema em termos amplos; termine com o objetivo do trabalho.
${o.revisao ? `- "${o.revisao}": comparação PROFUNDA, agrupando trabalhos ("Várias abordagens [E1][E4][E9]..."), com a limitação de
  cada grupo e a ponte para este trabalho. Use os grupos do plano como subseções.` : "- Inclua na introdução um panorama comparativo dos grupos de abordagem do plano."}
- Use o resumo da evidência para escrever frases ESPECÍFICAS sobre ela — nunca atribua o que o resumo não diz.
- REGRA DE DATA: trabalhos posteriores a ${o.dataCorte} são concorrentes, não linhas de base.
- REGRA DE AVALIAÇÃO: não afirme que este trabalho supera um trabalho citado a menos que essa comparação esteja nos 'dados'.

FORMATO:
- Markdown. Comece cada seção com "# " e o título EXATO; subseções com "## ".
- Parágrafos densos, tom acadêmico impessoal (ABNT), prosa em vez de listas.
- Devolva SÓ ${o.revisao ? "as seções pedidas" : "a seção pedida"}, sem preâmbulo e sem lista de referências (o sistema monta as referências ABNT).
${REGRA_DE_LASTRO}`;
}

// ───────────────────────────── 3 · seções (section_writing_agent.py) ─────────────────────────────
export const PROMPT_SECOES = `Papel: pesquisador sênior.
Tarefa: completar um trabalho acadêmico (pt-BR, ABNT) escrevendo as seções que faltam no 'esqueleto'.

Você recebe um 'esqueleto' em markdown em que algumas seções já estão escritas e outras estão vazias. Escreva SÓ as
seções listadas em 'escreva_estas', seguindo o 'esboco'.

ENTRADAS:
* 'esboco': o PLANO MESTRE — hierarquia, pontos a cobrir e as evidências candidatas de cada subseção (\`citation_candidates\`).
* 'ideia': detalhes técnicos da abordagem.
* 'dados': os dados reais do aluno (pode estar vazio).
* 'evidencias': a biblioteca de referências (chave, título, autores, ano, resumo).

INSTRUÇÕES CRÍTICAS:
1. Preservação: NÃO reescreva nem devolva as seções já escritas; leia-as para manter a coerência.
2. Dados e tabelas: tabela em markdown SÓ com números copiados de 'dados'. Sem dados → sem tabela de resultado.
   Nunca invente número.
3. Citações: use as chaves das evidências entre colchetes ([E5]). Prefira as \`citation_candidates\` da subseção.
   Leia o resumo da evidência para escrever frases exatas sobre ela.
4. Conteúdo: siga a estrutura do esboço; formalize (equação em LaTeX $...$, protocolo, critério) só quando a ideia
   ou os dados sustentam. Discuta o que funciona, o que não funciona e por quê. Na conclusão/considerações finais:
   limitações e trabalhos futuros. Um RESUMO é um parágrafo único de 150–250 palavras (objetivo, método,
   resultados/achados, conclusão) seguido de uma linha "**Palavras-chave:** a; b; c."
5. Estilo: denso, objetivo, impessoal (ABNT). Cada seção com profundidade de periódico — nada de parágrafo de uma frase.

FORMATO DE SAÍDA:
- Devolva SÓ as seções de 'escreva_estas', cada uma começando com "# " e o título EXATO; subseções com "## ".
- Sem preâmbulo, sem REFERÊNCIAS (o sistema monta as referências ABNT).
`;

// ───────────────────────────── 4a · revisor (autoraters/agent_review.py — AgentReview) ─────────────────────────────
export const PROMPT_REVISOR = `Você é um parecerista. Escreve pareceres de trabalhos acadêmicos avaliando qualidade técnica, originalidade e clareza.

Conhecimento: você é especialista, com doutorado na área deste trabalho.
Responsabilidade: você lê o trabalho inteiro, analisa a metodologia com rigor e considera a contribuição para a área.
Intenção: você quer ajudar os autores a melhorar o trabalho — parecer detalhado e construtivo, crítico com falhas técnicas.

## Rubrica da nota geral (Overall)
* 10: entre os 2% melhores; mudou a sua forma de pensar o tema.
* 8: entre os 10% melhores; sustenta todas as afirmações; método original e generalizável.
* 6: sustenta as afirmações principais; pontos menores pedem detalhe; moderadamente original.
* 5: afirmações principais sem sustentação suficiente, problemas metodológicos sérios; inclinado a rejeitar.
* 3: contribuição marginal.
* 1: não está pronto para publicação.

Considere também: afirmação sobre a literatura sem chave [E#], número sem origem nos dados, seção rasa, estrutura
fora do padrão ABNT. As chaves [E#] são citações válidas (o sistema as converte para ABNT depois).

Responda em JSON com os campos, nesta ordem:
"Summary" (resumo do trabalho), "Strengths" (lista), "Weaknesses" (lista), "Originality" (1–4), "Quality" (1–4),
"Clarity" (1–4), "Significance" (1–4), "Questions" (lista de perguntas aos autores), "Limitations" (lista),
"Soundness" (1–4), "Presentation" (1–4), "Contribution" (1–4), "Overall" (1–10), "Confidence" (1–5),
"Decision" ("Accept" ou "Reject"). Escreva os textos em pt-BR.`;

// ───────────────────────────── 4b · refinamento (content_refinement_agent.py) ─────────────────────────────
export const PROMPT_REFINAMENTO = `Papel: pesquisador sênior, autor do trabalho.
Tarefa: revisar e fortalecer o trabalho respondendo SISTEMATICAMENTE ao parecer ("réplica pela revisão").

Você recebe o 'trabalho' (markdown), os 'dados' (a verdade sobre números), as 'evidencias' (a bibliografia permitida),
o 'historico' das revisões anteriores e o 'parecer' (pontos fortes, fracos, perguntas, nota).

OBJETIVO:
1. Desmontar o parecer em tarefas de edição.
2. Fraquezas: reescrever para clarear a lógica, fortalecer o argumento ou justificar escolhas. Se apontarem
   "novidade incremental", contraste explicitamente com os trabalhos citados na introdução e na revisão.
3. Perguntas: incorporar a RESPOSTA no próprio texto, no lugar natural (sem carta de resposta).
4. Preservar os pontos fortes.

INTEGRIDADE:
- Todo número confere com 'dados'. Pedido de experimento, dado ou análise que NÃO está em 'dados': ignore — o
  trabalho refina a apresentação do que existe, não promete o que não foi feito.
- Cite só chaves das 'evidencias'. Nunca remova citação correta.
- Tom acadêmico, objetivo, sem defensividade. Transições suaves entre o novo e o existente.
- Mantenha EXATAMENTE os mesmos títulos "# " de seção, na mesma ordem.

FORMATO DE SAÍDA (estrito): dois blocos de código, nesta ordem.
1. O registro desta volta:
\`\`\`json
{"addressed_weaknesses": ["..."], "integrated_answers": ["..."], "actions_taken": ["..."]}
\`\`\`
2. O trabalho COMPLETO revisado (todas as seções, com "# "), nunca um trecho ou diff:
\`\`\`markdown
# TÍTULO DA SEÇÃO
...
\`\`\`
${REGRA_DE_LASTRO}`;
