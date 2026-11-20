# Trechos em papel: a IA acha no material e mostra como folha escrita à mão (nov/2026)

> Skill: `lib/trechos/` (`achar.ts` motor · `literal.ts` prova e parágrafos · `bloco.ts` harness · `folhas.ts` cliente · `server.ts` peças reais)
> Tela: `components/trechos/FolhaDePapel.tsx` + `folha.css`, dentro de `components/study/StructuredAnswerView.tsx`
> Flag: `TRECHOS_EM_PAPEL=1` (padrão desligado) · vitrine local: `/dev/trechos` (404 em produção)
> Estilo do papel: o pergaminho da Escola de Anúbis (`escola-de-anubis/app/globals.css` `.pergaminho`), clareado em folha de caderno.

## O que faz

A pessoa pergunta em linguagem natural: "ache na minha apostila os trechos sobre fotossíntese", "onde o livro fala de
entropia?", "em que página aparece a definição de derivada?", "todas as vezes que o autor cita Kant". A Aura responde
em texto corrido e, no meio dele, logo depois do parágrafo que comenta cada passagem, aparece uma **folha de papel**
com o trecho LITERAL do documento. A folha cai e se assenta presa por uma fita; o contexto aparece a lápis; a citação
é escrita palavra por palavra em caneta azul; o marca-texto passa por cima. Com "reduzir movimento", aparece pronta.

## Por que a busca do turno não bastava

| antes | agora |
|---|---|
| uma consulta, top-8 (40 na larga), sem reordenar | 3–5 consultas do plano (sinônimos, termo técnico, inglês) fundidas por RRF |
| nunca acha a 7ª menção | **varredura**: os documentos apontados são lidos INTEIROS (`trechosDoDocumento`) atrás dos termos |
| o modelo recebe 3000 caracteres e cita o documento | **juiz**: o modelo aponta a passagem exata em cada candidato, com o porquê e a relevância |
| citação é o que o modelo escreveu | **prova**: o código acha a citação no texto do trecho e guarda a substring ORIGINAL; paráfrase é descartada |
| rodapé "Da sua base" com título e página | folha com citação, contexto, página, carimbo (responde · sustenta · relacionado) e "copiar com referência" |

## Como entra no harness

1. `runChatTurn`: com a flag e `pedeTrechos(prompt)`, a skill roda EM PARALELO com o preparo do turno (memória, base,
   cartolina). O cache de respostas não é consultado nesse turno e nunca guarda resposta com trechos (é material de
   UMA pessoa).
2. `aura-harness`: os trechos conferidos entram no reason/draft (`blocoDosTrechos`) com o marcador `[[T#]]` e a regra:
   texto corrido, marcador sozinho numa linha depois do parágrafo que comenta o trecho.
3. Depois do motor (Aura ou orquestra), `comTrechos` tira os marcadores e grava em cada trecho a âncora
   `{campo, paragrafo}`. **O texto da resposta volta limpo**: voz, memória, cartolina e cache não veem marcador.
4. O cliente parte o texto com a MESMA função (`paragrafos`, que respeita cerca de código e bloco `$$`) e intercala.
   Trecho sem âncora vai pra pilha "Trechos do seu material" no fim. Durante a datilografia do núcleo, a folha espera
   o parágrafo dela terminar de ser escrito.

## O anexo do chat

O arquivo que a pessoa manda no chat (fora da base) também entra. Ele não tem vetor, então é lido INTEIRO, em pedaços
de ~1800 caracteres partidos em parágrafo, e os pedaços com os termos do plano vão pro mesmo juiz e pra mesma prova.
Na ordem das folhas, o anexo vem primeiro (é o material que a pessoa acabou de trazer pra esta pergunta).

A página: o extrator do PDF devolve a página de cada parágrafo, mas o anexo só guardava o texto corrido. Agora ele
guarda `marcasDePagina` (onde cada página começa no texto final — `lib/agent/anexos.ts`), e a folha diz a página da
PRÓPRIA citação, não a faixa do pedaço. Word e texto puro não têm paginação: a folha sai sem página.

## União com o PaperOrchestra

O gerador de artigo (`gerarComPaperOrquestra`, docs/PAPER_ORQUESTRA.md) busca no material do aluno pela skill: cada
evidência do aluno é uma passagem literal com página — o artigo cita "(Apostila…, p. 12)" sobre o que a página diz,
não sobre um bloco de 3000 caracteres. Sem achado, cai na busca simples de antes. Duas passagens da mesma apostila
viram duas evidências.

## Custo e prazo

2–4 chamadas de Flash por pergunta (plano + 1–3 lotes de juiz, em paralelo), até 6 buscas e a leitura de até 6
documentos. Prazo de 25 s no chat (40 s no artigo); estourou ou falhou, o turno segue sem folhas. Juiz fora do ar →
reserva determinística (a frase do trecho com mais termos, relevância "relacionado").

## Como ligar

`TRECHOS_EM_PAPEL=1` no `.env` da VPS (o compose repassa ao web e ao worker). Opcional: `TRECHOS_MODELO` (padrão o
Flash da casa). Precisa da base RAG de pé (`RAG_PG_URL`).

## O que NÃO foi verificado

- Nada rodou contra modelo real nem contra a base real: os testes usam modelo, busca e documento falsos.
- O SQL de `trechosDoDocumento` tem teste de banco, mas ele só roda com `RAG_PG_TEST_URL` (pulado nesta máquina).
- A tela foi conferida na vitrine `/dev/trechos` (claro, escuro, celular), não no chat logado.
