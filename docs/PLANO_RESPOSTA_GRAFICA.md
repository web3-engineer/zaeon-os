# Resposta gráfica + o furo que a conversa dos benchmarks revelou

Dois pedidos do dono na mesma mensagem, e o segundo muda a ordem do primeiro:

1. **Gráficos na resposta**, como fazem as IAs acadêmicas — "de forma convencional na resposta, e
   apenas aonde coubesse", inclusive em temas menos explorados.
2. **Corrigir a conversa dos benchmarks** (TruthfulQA/MMLU/Natural Questions), que prometeu baixar
   CSV e clonar repositório e não entregou nada: *"o arquivo deveria aparecer ai — ou quando
   falhou, deveria aparecer a opção de corrigir"*.

O (2) vem primeiro neste documento porque ele revelou um furo **maior** que os dois da §9 do
PLANO_HARNESS_AGENTICO, e porque um gráfico bonito em cima de uma resposta que mente é pior do que
não ter gráfico.

---

## Parte A · A conversa dos benchmarks: três defeitos, não um

### A1 · FURO 3 da rede: o infinitivo escapa inteiro

Rodei a rede de honestidade contra as oito frases exatas daquela conversa. **Todas as oito passam.**

```
PASSOU | Acessar o repositório do TruthfulQA (GitHub) e baixar o arquivo CSV contendo as 817…
PASSOU | Clonar o repositório MMLU (GitHub) e baixar o diretório 'data' com os arquivos de teste…
PASSOU | Obter o conjunto Natural Questions via o site oficial da Google Research e fazer download…
PASSOU | Clonar os repositórios usando git ou baixar os arquivos CSV/JSON diretamente.
PASSOU | Selecionar e baixar os conjuntos de dados dos benchmarks TruthfulQA, MMLU e Natural…
PASSOU | Clonar o repositório: `git clone https://github.com/sylheong/TruthfulQA.git`.
PASSOU | Instalar Git caso ainda não esteja disponível (ex.: `sudo apt-get install git`).
PASSOU | Carregar os datasets em um script Python (pandas) para gerar splits de treino/validação.
```

A causa é estrutural, não um esquecimento: `afirmaAcao` exige **sujeito em primeira pessoa** —
`vou baixar`, `baixei`, `eu baixo`. Foi desenhada assim de propósito, porque *"baixe o arquivo em X
e anexe aqui"* é conteúdo bom e não pode cair. Só que **o infinitivo não tem sujeito**, e é
exatamente a forma que o modelo usa num plano: `Acessar…`, `Clonar…`, `Baixar…`.

E aí o defeito não está na frase, está em **onde ela aparece**. "Clonar o repositório" dentro de
`proximos_passos` é lido pelo aluno como *o plano da plataforma* — é o que faz a conversa inteira
parecer uma promessa. A mesma frase no corpo, depois de "você pode", é instrução legítima.

**Conclusão de desenho:** a rede precisa de um segundo modo, que vale **só nos campos de plano**
(`proximos_passos`, e os passos do percurso do Cérebro): ali o infinitivo de uma classe sem lastro é
promessa. No `nucleo`/`desenvolvimento` nada muda — senão mata a instrução ao aluno.

### A2 · O pedido era impossível, e ninguém disse isso

`github.com` **não está na allowlist do Leitor**. A lista que subiu no "tudo ON" é:

```
*.gov.br, *.edu.br, *.scielo.br, *.scielo.org, *.wikipedia.org, arxiv.org, doi.org, *.nih.gov, *.who.int
```

Ou seja: a CSV do TruthfulQA, que vive no GitHub, **não tinha como ser baixada** — o proxy negaria
com `dominio_fora_da_lista`. A resposta honesta era de uma linha: *"não consigo baixar desse
domínio; baixe você e anexe aqui"*. Em vez disso veio um plano de cinco passos.

Então "o arquivo deveria aparecer ai" depende de uma decisão que **é sua**, não minha: incluir
`raw.githubusercontent.com` (e talvez `github.com`) na allowlist. É ampliar a superfície de SSRF
para um host que serve conteúdo de qualquer pessoa do mundo — diferente de `*.gov.br`. Ver Portões.

### A3 · A falha não chega ao aluno

`resumoDasFalhas(observations)` existe e é usado — mas só **no prompt da ação**, para o modelo saber
o que falhou e tentar outro caminho. Nada disso vira UI. Não há "o download falhou (domínio fora da
lista) · tentar de novo / anexar manualmente". O `↺` daquela conversa é o retry do bloco inteiro,
não do passo que falhou.

É isso que o dono pediu com *"deveria aparecer a opção de corrigir"*: a falha de tool precisa ser
**um objeto da resposta**, não uma linha de log.

### A4 · Bônus ruim: a URL estava errada

A conversa manda `git clone https://github.com/sylheong/TruthfulQA.git`. O repositório real é
`sylinrl/TruthfulQA` — e as **próprias fontes da mesma resposta** dizem "GitHub - sylinrl/TruthfulQA".
Instrução ao aluno com URL inventada é pior que recusa: ele vai tentar e falhar sozinho.

---

## Parte B · Gráficos na resposta

### B1 · O que as ferramentas acadêmicas realmente fazem

Procurei o mecanismo, não a propaganda. O que dá para confirmar:

- **Consensus** tem o *Consensus Meter* (distribuição de evidência a favor/contra numa pergunta
  sim-ou-não) e um grafo de citações. É o único visual quantitativo confirmado por mais de uma
  fonte, e repare: **os números dele vêm do próprio acervo da ferramenta**, não do texto do modelo.
- **Elicit** é tabela, não gráfico: colunas extraídas dos papers.
- **SciSpace** anuncia geração de figuras e tabelas estatísticas; é material de marketing, não
  confirmei por fonte independente.

A lição é a mais importante do documento: **nas ferramentas sérias, o número do gráfico nunca é
digitado pelo modelo.** Ele vem de dados que a ferramenta tem.

### B2 · A arquitetura que a literatura recomenda

Sobre *como* gerar o gráfico com LLM, a convergência é clara:

- O modelo emite **só a especificação** (Vega-Lite é o formato citado: JSON compacto, fácil de
  gerar e **validável por schema**, o que permite corrigir erro na hora). Os **dados reais são
  injetados por código** no momento de desenhar.
- O relato mais direto sobre o risco: deixar o modelo ver os números **e** decidir a apresentação
  produz "gráficos que parecem certos, com valores plausíveis que não batem com os dados".
- Uma avaliação no arXiv mediu as classes de erro: JSON inválido, Vega-Lite inválido, tipo de
  gráfico trocado, e **conteúdo trocado**.

Isto é o contrato da F0 aplicado a gráfico: *não afirme o que não aconteceu* → **não desenhe número
que você não tem recibo de onde veio.**

### B3 · O que já existe aqui (auditoria antes de desenhar)

- **Nenhuma dependência de gráfico no projeto.** Nem `recharts`, nem `vega`, nem `d3`, nem
  `chart.js`. Zero.
- O Studio tem `diagram` (archify), `mindmap` e `timeline` — todos **estrutura**, não dados, e
  desenhados à mão pelo cliente.
- Os artefatos do Studio são **artefato separado** (card com provenance), não inline. O dono pediu
  inline, "onde couber": isso quer dizer um campo novo no `StructuredAnswer`, não um `StudioKind`.
- O contrato da resposta já tem o vocabulário de lastro que um gráfico honesto precisa:
  `evidencia` (claim + source), `sources`, `fontesBase` (documento + páginas) e a numeração
  posicional `[B1]..[Bn]` das citações da base.

### B4 · A ideia que resolve "temas menos explorados" sem inventar número

O dono quer gráfico até em tema pouco explorado. A saída não é afrouxar o lastro — é notar que
**a plataforma já possui números de verdade que hoje ninguém desenha**:

| gráfico | de onde vem o número | inventável? |
|---|---|---|
| papers por ano do tema | resultado do `literature_search` (OpenAlex/Crossref/arXiv/PubMed) | **não** |
| distribuição por base/fonte | o mesmo resultado | **não** |
| cobertura por documento da base | o agrupamento da F4 (`agruparPorDocumento`) | **não** |
| consenso a favor/contra | `evidencia` + o que a checagem derrubou (`lib/scholar/verify`) | **não** |
| qualquer série de uma CSV anexada | o anexo, lido pelo RAG | **não** |

Nenhum desses depende de o modelo digitar valor. Todos têm **recibo**. E "papers por ano" é
justamente o gráfico que faz um tema pouco explorado *parecer* pouco explorado — que é a informação
honesta e útil.

---

## Fases propostas

| fase | o que entra | flag | custo |
|---|---|---|---|
| **G1** | FURO 3: modo infinitivo da rede, só nos campos de PLANO | `HARNESS_CAPACIDADE` (já existe) | 0 chamadas |
| **G2** | Falha de tool virar objeto da resposta + "corrigir" (anexar / tentar de novo) | nova | 0 chamadas |
| **G3** | Gráfico COM RECIBO: `graficos?` no contrato + renderer SVG, dados só das 5 origens de B4 | nova | 0 chamadas (os números já estão no turno) |
| **G4** | Gráfico PROPOSTO pelo modelo: spec validada por schema, cada ponto com citação; sem citação, não desenha | nova | +1 chamada só quando couber |
| **G5** | Figura no documento ABNT (legenda + fonte), reaproveitando o SVG do G3/G4 | nova | 0 |

G1 e G2 não dependem de decisão nenhuma e consertam a conversa que você mostrou. G3 é o que entrega
gráfico de verdade sem risco de número inventado. G4 é o que precisa de disciplina — e é opcional.

---

## Decisões do dono (2026-11-03) e o que foi entregue

| portão | decisão |
|---|---|
| renderer | **SVG à mão, zero dependência** |
| allowlist | **`raw.githubusercontent.com` + `github.com`** |
| fases agora | **G1 + G2 + G3** (G4 fica para depois) |

### G1 entregue · o modo PLANO da rede

`promessaNoPlano(frase, registradas, executadas)`: infinitivo + objeto, **sem** exigir marcador de
pessoa — e só para classe que a casa **não tem**. A regra de corte é o que evita destruir conteúdo
bom: se a plataforma FAZ a ação, um passo no infinitivo é instrução ao aluno ou trabalho do laço
(que deveria ter executado); apagá-lo seria pior. Se a casa NÃO faz, o passo é impossível de
qualquer ângulo — ninguém na conversa clona um repositório.

Efeito na conversa que o dono mandou: os passos de **clonar** somem; os de **baixar** ficam — e
agora funcionam, porque o GitHub entrou na allowlist. É a diferença entre censurar o sintoma e
destravar a ação.

### G2 entregue · a falha vira objeto da resposta

`lib/agent/falhas.ts` → `falhas?: FalhaVisivel[]` no contrato, preenchido **pelo código** (como
`fontesBase`). Cada código de erro do Leitor vira UMA frase do porquê + UM caminho que existe:
domínio fora da lista → "baixe e anexe aqui (📎)"; proxy fora do ar → botão "tentar de novo" que
reenvia o pedido. Três regras que evitam virar parede de erro: só tool que o aluno pode corrigir
(`memory_search` falhar é ruído interno), dedupe por tool+código, e **a tool que funcionou depois
não aparece** — pedir três links e acertar dois não produz card de erro no meio de uma boa resposta.

### G3 entregue · gráfico com recibo

`lib/agent/grafico.ts` (desenho) + `lib/agent/graficosDoTurno.ts` (o que cabe). Dois gráficos, zero
chamada de modelo, zero número digitado por ele:

- **Papers por ano**, da contagem do `literature_search`.
- **Trechos usados por documento**, da contagem do agrupamento da F4.

Decisões de desenho que vieram da referência de dataviz, não de gosto:

- **Série única ⇒ sem legenda**; o título nomeia a série.
- **Cor `#0891b2`**, validada por script nas DUAS superfícies (clara e escura): passa banda de
  luminosidade, piso de croma e contraste ≥ 3:1 nos dois casos.
- **Tinta em `currentColor`** — herda a cor da bolha, então o tema escuro não precisa de um segundo
  desenho nem de media query (que aqui não valeria: o app troca tema por classe).
- **Rótulo de valor seletivo** (todos só quando são ≤ 4; senão, só a máxima). Número em toda barra
  é anti-padrão.
- `<desc>` com a série inteira: é a "table view" possível dentro de uma bolha, e o leitor de tela
  recebe todo valor. `<title>` por barra dá o hover sem uma linha de JS.

**Três defeitos só apareceram quando eu RENDERIZEI e olhei** — nenhum teste os pegaria:

1. rótulo de documento vazando pela esquerda (28 caracteres não cabiam em 142px → teto 24 e faixa
   de 170px);
2. "3 trech…" cortado à direita (a unidade repetida em toda barra estourava a margem → a unidade
   ficou no título, que é onde ela já estava);
3. **barra de valor ZERO virando um toco de 2px** — fazia "nenhum paper neste ano" parecer "quase
   um", exatamente a leitura errada que o preenchimento com zero existe pra evitar. Zero agora não
   desenha barra: fica o rótulo do ano e o vazio embaixo, que é a informação.

O ano sem paper entrar com **zero** é a decisão que faz este gráfico servir ao pedido "temas menos
explorados": eixo de ano com buraco escondido sugere produção contínua que não existe.

**Gates:** 5647 testes (+43 nesta fase), `tsc` limpo fora do `server/colyseus` pré-existente,
`eslint` 0, os dois YAML validados. Flag `HARNESS_GRAFICO` ligada por padrão, encanada nas cinco
pontas e no recibo do deploy.

## 🔒 Portões do dono

1. **`raw.githubusercontent.com` na allowlist?** Sem isso, "baixa a CSV do TruthfulQA" continua
   impossível — e o melhor que o G1 entrega é uma recusa honesta em vez de um plano falso. Incluir é
   abrir o Leitor para um host que serve arquivo de qualquer pessoa; o proxy continua com
   default-deny, tetos, só-GET e remoção de texto oculto, mas o conteúdo deixa de ser
   institucional. **Minha recomendação: incluir só `raw.githubusercontent.com`** (serve arquivo
   cru, não página), e **não** `github.com`.
2. **Renderer do gráfico: SVG à mão ou dependência?** Recomendo **SVG à mão, zero dependência**:
   é como o archify já desenha, roda no servidor, cabe na bolha da resposta e o mesmo SVG vai pro
   documento ABNT no G5. `recharts` traria React+d3 e só serve na tela; `vega-lite` é grande. A
   especificação pode continuar no formato Vega-Lite (é bom p/ o modelo e validável) **sem** instalar
   o Vega: eu interpreto o subconjunto que a gente desenha.
3. **G4 vale a chamada extra?** Gráfico proposto pelo modelo custa +1 chamada e é onde mora o risco
   de número plausível e errado. G3 já entrega gráfico em quase toda resposta de pesquisa.
