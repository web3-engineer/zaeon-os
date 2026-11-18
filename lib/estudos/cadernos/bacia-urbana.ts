import type { CadernoEstudo } from "../cadernosEstudo";

/**
 * Caderno de campo: Leitura de uma bacia hidrográfica urbana.
 * Conteúdo com lastro real: Lei 9.433/1997 (Política Nacional de Recursos Hídricos, bacia
 * como unidade de gestão), Lei 12.651/2012 (Código Florestal, APP de nascentes e margens),
 * Lei 12.608/2012 (Proteção e Defesa Civil), método racional e SCS-CN (NRCS TR-55),
 * ordenamento de Strahler, parâmetros morfométricos clássicos (Horton, Schumm), curvas IDF,
 * dados abertos de ANA/SNIRH (HidroWeb), INMET/BDMEP, MDE do TOPODATA/INPE (SRTM), MapBiomas,
 * delineamento em QGIS e no USGS StreamStats, e casos reais verificáveis. As etapas que
 * exigem profissional habilitado (topógrafo, engenheiro hídrico/civil com ART, laboratório
 * acreditado, órgão gestor) viram blocos de mobilização. Sem vídeos: nenhum id foi confirmado
 * nesta sessão, e a regra do caderno proíbe inventar fonte.
 */
export const caderno: CadernoEstudo = {
  id: "bacia-urbana",
  titulo: "Leitura de uma bacia hidrográfica urbana: delimitar, medir e projetar",
  resumo:
    "Do divisor de águas ao exutório: como uma pessoa ou um coletivo aprende a enxergar a bacia que existe embaixo da cidade, delimitá-la no mapa e em campo, medir chuva e vazão, calcular o escoamento, projetar soluções que seguram a água e manter um monitoramento que vira prova e decisão. Cada número tem norma, dataset público ou estudo citado na própria página; cada etapa que exige um profissional mostra quem chamar.",
  paginas: [
    // ===================== CAPÍTULO 1 — CONTEXTO =====================
    {
      id: "abertura",
      titulo: "Como usar este caderno de campo",
      blocos: [
        { tipo: "texto", texto: "Este caderno ensina a ler uma bacia hidrográfica dentro da cidade: aquela área de terreno que, mesmo escondida sob asfalto e lajes, drena toda a chuva para um mesmo ponto baixo. Cada página traz leitura curta, um desenho ou diagrama, tarefas de campo, uma lição para fixar e a fonte que sustenta a afirmação. Nada aqui é opinião: quando aparece um número, ele vem de norma, dataset público ou estudo citado na própria página." },
        { tipo: "texto", texto: "Regra do caderno: antes de concluir, meça; antes de medir, delimite; e antes de propor uma obra, entenda para onde a água vai. Quando a etapa exigir topógrafo, laboratório acreditado ou responsável técnico com ART, a página mostra um campo de mobilização que abre a vaga e acompanha até ficar pronto. Você observa, mapeia e registra; o profissional assina o que precisa de assinatura." },
        { tipo: "diagrama", titulo: "O percurso do caderno", codigo: `flowchart TD
  A["Contexto: o que e e por que ler a bacia"] --> B["Leitura do local: divisor, rede, uso do solo"]
  B --> C["Metodo: cartografia e delimitacao"]
  C --> D["Calculo: chuva, vazao, escoamento"]
  D --> E["Projeto: solucoes que seguram a agua"]
  E --> F["Execucao: campo, licenca, instalacao"]
  F --> G["Manutencao: series, QA/QC, alerta"]
  G --> H["Casos reais"]
  H --> I["Recursos e prancha de sintese"]` },
        { tipo: "texto", texto: "Leia na ordem na primeira vez. Depois use como consulta: cada capítulo resolve uma pergunta (onde está a bacia, quanto de água ela gera, o que fazer com essa água). Ao final, a Prancha de síntese junta tudo em uma folha só." },
      ],
    },
    {
      id: "o-que-e-bacia",
      titulo: "O que é, de fato, uma bacia hidrográfica",
      blocos: [
        { tipo: "texto", texto: "Bacia hidrográfica é toda a área de terreno cuja água de chuva escoa para um mesmo ponto de saída, chamado exutório. O limite dessa área é o divisor de águas: a linha que separa para que lado a gota vai correr. Pingou de um lado, vai para este rio; pingou do outro, vai para outro. A bacia é, portanto, uma unidade definida pelo relevo, não pelo mapa político." },
        { tipo: "texto", texto: "Dentro da bacia existe uma rede de drenagem: córregos menores que se juntam em córregos maiores até o curso principal. Numa cidade, boa parte dessa rede foi canalizada, enterrada ou virou galeria de concreto, mas a bacia continua existindo. Ler a bacia urbana é reconstruir, em cima do mapa da cidade, a bacia que o relevo ainda comanda por baixo." },
        {
          tipo: "prancha",
          titulo: "A bacia: divisor, rede e exutório",
          desenho: {
            legenda: "A linha de cumeada (divisor) encerra a area; os afluentes convergem para o curso principal, que sai no exutorio.",
            primitivas: [
              { t: "curva", pts: [[30, 40], [80, 25], [150, 20], [230, 30], [275, 55]], cor: "suave" },
              { t: "curva", pts: [[30, 40], [40, 90], [60, 140], [110, 175]], cor: "suave" },
              { t: "curva", pts: [[275, 55], [265, 100], [230, 150], [170, 178]], cor: "suave" },
              { t: "curva", pts: [[110, 175], [140, 178], [170, 178]], cor: "suave" },
              { t: "curva", pts: [[150, 30], [148, 70], [150, 110], [150, 150], [150, 178]], cor: "tinta" },
              { t: "curva", pts: [[90, 50], [120, 95], [150, 115]], cor: "tinta" },
              { t: "curva", pts: [[215, 55], [180, 100], [150, 120]], cor: "tinta" },
              { t: "circulo", c: [150, 178], r: 5, cor: "destaque" },
              { t: "rotulo", p: [156, 184], texto: "Exutorio" },
              { t: "rotulo", p: [40, 30], texto: "Divisor de aguas" },
              { t: "rotulo", p: [118, 70], texto: "Afluentes" },
            ],
          },
        },
        {
          tipo: "licao",
          pergunta: "O que define o limite de uma bacia hidrográfica?",
          alternativas: [
            "A divisa entre bairros ou municípios",
            "O divisor de águas, definido pelo relevo",
            "O leito visível do rio principal",
          ],
          correta: 1,
          explicacao: "A bacia é delimitada pelo divisor de águas, a linha de cumeada que separa o escoamento entre bacias vizinhas. É o relevo que manda, não a divisa administrativa.",
        },
      ],
    },
    {
      id: "por-que-ler-bacia-urbana",
      titulo: "Por que ler a bacia dentro da cidade",
      blocos: [
        { tipo: "texto", texto: "A cidade troca o solo que infiltrava por superfícies impermeáveis. Onde antes a chuva entrava na terra, agora ela escorre rápido por telhado, rua e calçada e chega ao córrego toda de uma vez. O resultado é o alagamento: o mesmo volume de chuva, concentrado em menos tempo, estoura a capacidade da galeria. Ler a bacia é entender de onde vem essa água e por que ela se acumula onde se acumula." },
        { tipo: "texto", texto: "Quem lê a bacia para de tratar enchente como azar e passa a tratá-la como consequência mensurável da ocupação. Dá para apontar a área que gera o pico, estimar quanto a impermeabilização aumentou a vazão e defender onde cabe um jardim de chuva, um reservatório ou a desobstrução de uma várzea. Sem a leitura da bacia, qualquer obra é tiro no escuro." },
        {
          tipo: "diagrama",
          titulo: "Urbanização muda o caminho da água",
          codigo: `flowchart LR
  A["Chuva"] --> B{"Solo da bacia"}
  B -->|"Natural: mata e terra"| C["Infiltra, evapora, pico baixo e lento"]
  B -->|"Urbano: asfalto e laje"| D["Escoa rapido, pico alto e cedo"]
  D --> E["Galeria estoura: alagamento"]
  C --> F["Corrego perene, recarga do lencol"]` },
        {
          tipo: "licao",
          pergunta: "Por que a urbanização agrava as enchentes para a mesma chuva?",
          alternativas: [
            "Porque aumenta o total de chuva que cai",
            "Porque a impermeabilização faz a água escoar mais rápido e concentrar o pico",
            "Porque o rio fica mais fundo",
          ],
          correta: 1,
          explicacao: "A impermeabilização reduz a infiltração e acelera o escoamento superficial. O volume pode ser o mesmo, mas chega concentrado em menos tempo, elevando a vazão de pico além da capacidade da drenagem.",
        },
      ],
    },
    {
      id: "bacia-unidade-gestao",
      titulo: "A bacia como unidade de gestão (e de lei)",
      blocos: [
        { tipo: "texto", texto: "No Brasil, a bacia hidrográfica não é só um conceito de geografia: é a unidade legal de planejamento e gestão da água. A Lei 9.433/1997, que criou a Política Nacional de Recursos Hídricos, estabelece a bacia como o território onde se decide o uso da água, por meio de comitês de bacia que reúnem poder público, usuários e sociedade civil." },
        { tipo: "texto", texto: "Isso tem efeito prático para quem lê uma bacia urbana: existe um comitê, um plano de bacia e dados oficiais para o seu rio. Antes de medir qualquer coisa, vale descobrir a qual bacia e sub-bacia o seu córrego pertence e se há plano e metas já publicados. A leitura de campo conversa com esse arcabouço, não parte do zero." },
        {
          tipo: "tarefas",
          itens: [
            { id: "t-comite", titulo: "Identifique o comitê de bacia do seu córrego", entrega: "Nome do comitê, bacia e sub-bacia anotados, com o link da página oficial." },
            { id: "t-plano", titulo: "Procure o plano de bacia ou plano de drenagem municipal", entrega: "Uma folha dizendo se existe plano, de quando é e qual meta ele cita para a sua área." },
          ],
        },
        { tipo: "fontes", titulo: "A base legal da bacia", itens: [
          { titulo: "Lei 9.433/1997 — Política Nacional de Recursos Hídricos", url: "https://www.planalto.gov.br/ccivil_03/leis/l9433.htm", tipo: "norma", nota: "Define a bacia como unidade de gestão e cria os comitês de bacia." },
          { titulo: "ANA — Agência Nacional de Águas e Saneamento Básico", url: "https://www.gov.br/ana/pt-br", tipo: "site", nota: "Órgão federal; reúne comitês, planos e dados por bacia." },
        ] },
      ],
    },
    {
      id: "anatomia-bacia",
      titulo: "A anatomia de uma bacia: as peças que você vai nomear",
      blocos: [
        { tipo: "texto", texto: "Para ler com precisão, use os nomes certos. Divisor de águas: o limite externo. Exutório: o ponto de saída, onde se mede a bacia inteira. Curso principal (ou talvegue): a linha mais baixa, por onde desce o fluxo. Afluentes ou tributários: os cursos que entram no principal. Cabeceira: a parte alta onde nascem os córregos. Foz: onde o rio deságua em outro corpo d'água." },
        { tipo: "texto", texto: "Duas palavras fazem diferença no urbano. Sub-bacia: uma bacia menor dentro da maior, drenando para um afluente. Interbacia ou área incremental: o pedaço que drena direto para o trecho principal, sem passar por um afluente nomeado. Numa cidade, a sub-bacia costuma coincidir com a área de uma galeria-tronco." },
        {
          tipo: "prancha",
          titulo: "As peças da bacia, nomeadas",
          desenho: {
            legenda: "Cabeceira em cima, exutorio embaixo; o curso principal recebe afluentes ao longo do caminho.",
            primitivas: [
              { t: "retangulo", p: [20, 20], w: 263, h: 160, cor: "suave" },
              { t: "rotulo", p: [26, 16], texto: "Divisor (limite)" },
              { t: "curva", pts: [[150, 35], [150, 80], [150, 130], [150, 172]], cor: "tinta" },
              { t: "curva", pts: [[90, 45], [120, 85], [150, 100]], cor: "tinta" },
              { t: "curva", pts: [[215, 50], [180, 95], [150, 115]], cor: "tinta" },
              { t: "circulo", c: [150, 35], r: 4, cor: "destaque" },
              { t: "rotulo", p: [156, 34], texto: "Cabeceira" },
              { t: "rotulo", p: [60, 60], texto: "Afluente" },
              { t: "rotulo", p: [200, 70], texto: "Afluente" },
              { t: "rotulo", p: [158, 120], texto: "Curso principal" },
              { t: "circulo", c: [150, 172], r: 5, cor: "destaque" },
              { t: "rotulo", p: [100, 186], texto: "Exutorio / foz" },
            ],
          },
        },
        {
          tipo: "licao",
          pergunta: "O que é o exutório de uma bacia?",
          alternativas: [
            "A parte mais alta, onde nascem os córregos",
            "O ponto de saída por onde passa toda a água drenada pela bacia",
            "A linha que separa bacias vizinhas",
          ],
          correta: 1,
          explicacao: "O exutório é o ponto de saída da bacia. Toda a água que cai dentro do divisor converge para ele; por isso é lá que se mede a vazão da bacia inteira.",
        },
      ],
    },
    {
      id: "fontes-contexto",
      titulo: "Fontes: panorama e dados de entrada",
      blocos: [
        { tipo: "texto", texto: "Estes endereços são a porta de entrada da leitura de bacias no Brasil. Guarde-os: vão reaparecer quando você for delimitar, medir e comparar. Priorize sempre a fonte primária (órgão oficial, dataset aberto, norma) ao invés de resumo de terceiros." },
        { tipo: "fontes", titulo: "Portais e dados abertos", itens: [
          { titulo: "ANA — HidroWeb (séries de estações fluviométricas e pluviométricas)", url: "https://www.snirh.gov.br/hidroweb/apresentacao", tipo: "dataset", nota: "Dados históricos de nível, vazão e chuva por estação." },
          { titulo: "INMET — BDMEP (banco de dados meteorológicos)", url: "https://bdmep.inmet.gov.br/", tipo: "dataset", nota: "Séries históricas de precipitação e clima das estações do INMET." },
          { titulo: "TOPODATA / INPE — MDE derivado do SRTM para o Brasil", url: "http://www.dsr.inpe.br/topodata/", tipo: "dataset", nota: "Modelo digital de elevação para delimitar bacia e extrair drenagem." },
          { titulo: "MapBiomas Brasil — uso e cobertura da terra (1985 em diante)", url: "https://brasil.mapbiomas.org/", tipo: "dataset", nota: "Base de uso do solo para estimar impermeabilização e coeficientes." },
        ] },
        {
          tipo: "licao",
          pergunta: "Qual fonte dá o modelo de elevação para delimitar a bacia?",
          alternativas: ["INMET/BDMEP", "TOPODATA/INPE (MDE do SRTM)", "MapBiomas"],
          correta: 1,
          explicacao: "O TOPODATA/INPE distribui o modelo digital de elevação derivado do SRTM, insumo para traçar o divisor de águas e extrair a rede de drenagem. O BDMEP dá chuva; o MapBiomas dá uso do solo.",
        },
      ],
    },
    // ===================== CAPÍTULO 2 — LEITURA DO LOCAL =====================
    {
      id: "divisor-de-aguas",
      titulo: "Achar o divisor de águas no relevo",
      blocos: [
        { tipo: "texto", texto: "O divisor de águas passa pelas cristas, pelos pontos mais altos entre dois vales. Para traçá-lo num mapa de curvas de nível, lembre a regra: o divisor cruza as curvas sempre pela perpendicular e passa pelos topos; ele nunca corta o leito de um córrego. Visualmente, imagine uma gota caindo em cima da linha: de um lado ela rola para um vale, do outro para o vale vizinho." },
        { tipo: "texto", texto: "Na cidade o divisor some sob quadras e avenidas, mas ainda está lá. Ruas de cumeada (que não acumulam água na chuva) e a direção para onde as sarjetas correm são pistas de campo. Onde a rua é divisor, a água da chuva escorre para os dois lados; onde é talvegue, converge e às vezes alaga." },
        {
          tipo: "prancha",
          titulo: "Regra do divisor sobre as curvas de nível",
          desenho: {
            legenda: "As curvas em V apontam morro acima nos vales; o divisor passa pelos topos e cruza as curvas pela perpendicular.",
            primitivas: [
              { t: "curva", pts: [[20, 60], [90, 50], [150, 70], [210, 50], [283, 60]], cor: "suave" },
              { t: "curva", pts: [[20, 95], [90, 85], [150, 110], [210, 85], [283, 95]], cor: "suave" },
              { t: "curva", pts: [[20, 130], [90, 120], [150, 150], [210, 120], [283, 130]], cor: "suave" },
              { t: "linha", de: [90, 40], ate: [90, 165], cor: "destaque" },
              { t: "linha", de: [210, 40], ate: [210, 165], cor: "destaque" },
              { t: "rotulo", p: [66, 32], texto: "Divisor (topo)" },
              { t: "rotulo", p: [190, 32], texto: "Divisor (topo)" },
              { t: "curva", pts: [[150, 70], [150, 110], [150, 150], [150, 180]], cor: "tinta" },
              { t: "rotulo", p: [156, 175], texto: "Talvegue (vale)" },
            ],
          },
        },
        {
          tipo: "tarefas",
          itens: [
            { id: "t-cumeada", titulo: "Caminhe por uma rua e diga se é cumeada ou vale", entrega: "Foto da sarjeta mostrando para onde a água corre e sua conclusão (divisor ou talvegue)." },
            { id: "t-tracar", titulo: "Trace à mão o divisor da sua quadra num mapa impresso", entrega: "Mapa com a linha do divisor desenhada passando pelos pontos altos." },
          ],
        },
      ],
    },
    {
      id: "hierarquia-fluvial",
      titulo: "A ordem dos cursos: hierarquia de Strahler",
      blocos: [
        { tipo: "texto", texto: "Para comparar bacias e falar a mesma língua dos hidrólogos, numere os cursos pela hierarquia de Strahler. Todo córrego sem afluente é de 1ª ordem. Quando dois cursos de 1ª ordem se juntam, nasce um de 2ª ordem; dois de 2ª formam um de 3ª, e assim por diante. Atenção: um curso só sobe de ordem quando encontra outro de mesma ordem; receber um curso de ordem menor não muda o número." },
        { tipo: "texto", texto: "A ordem do exutório é a ordem da bacia. Bacias urbanas pequenas costumam ser de 2ª ou 3ª ordem. Esse número ajuda a dimensionar esforço: quanto maior a ordem, mais afluentes para mapear e mais pontos de medição necessários." },
        {
          tipo: "diagrama",
          titulo: "Como a ordem sobe nas confluências",
          codigo: `flowchart TD
  A1["1a"] --> J1(( ))
  A2["1a"] --> J1
  J1 --> B1["2a"]
  A3["1a"] --> J2(( ))
  A4["1a"] --> J2
  J2 --> B2["2a"]
  B1 --> J3(( ))
  B2 --> J3
  J3 --> C1["3a ordem = ordem da bacia"]` },
        {
          tipo: "licao",
          pergunta: "Um curso de 2ª ordem recebe um afluente de 1ª ordem. Qual passa a ser sua ordem?",
          alternativas: ["3ª ordem", "Continua 2ª ordem", "1ª ordem"],
          correta: 1,
          explicacao: "Pela regra de Strahler, a ordem só aumenta quando dois cursos de mesma ordem se encontram. Receber um curso de ordem menor não altera o número: segue 2ª ordem.",
        },
      ],
    },
    {
      id: "rede-de-drenagem",
      titulo: "Padrões de drenagem: o desenho que o terreno faz",
      blocos: [
        { tipo: "texto", texto: "O jeito como os córregos se arranjam conta a história do terreno. Padrão dendrítico (como galhos de árvore) aparece em rochas uniformes e é o mais comum. Paralelo indica encostas íngremes e uniformes. Treliça e retangular surgem onde há falhas e fraturas controlando o fluxo. Radial sai de um ponto alto, como um morro ou vulcão. Reconhecer o padrão ajuda a prever por onde a água corre mesmo sem ver o córrego." },
        { tipo: "texto", texto: "Na cidade, o padrão natural foi reescrito pelo traçado das ruas e galerias, que viram uma drenagem artificial em grade. Ainda assim, o padrão original resiste nos trechos de fundo de vale e nas poucas calhas abertas. Ler os dois padrões ao mesmo tempo, o natural e o imposto, é o truque da bacia urbana." },
        {
          tipo: "prancha",
          titulo: "Três padrões de drenagem",
          desenho: {
            legenda: "Dendritico (galhos), paralelo (encosta uniforme) e radial (morro central).",
            primitivas: [
              { t: "curva", pts: [[30, 30], [45, 70], [55, 110]], cor: "tinta" },
              { t: "curva", pts: [[20, 50], [45, 70]], cor: "tinta" },
              { t: "curva", pts: [[70, 45], [55, 75]], cor: "tinta" },
              { t: "rotulo", p: [24, 125], texto: "Dendritico" },
              { t: "linha", de: [120, 30], ate: [135, 115], cor: "tinta" },
              { t: "linha", de: [140, 30], ate: [152, 115], cor: "tinta" },
              { t: "linha", de: [160, 30], ate: [170, 115], cor: "tinta" },
              { t: "rotulo", p: [122, 125], texto: "Paralelo" },
              { t: "circulo", c: [245, 70], r: 4, cor: "destaque" },
              { t: "linha", de: [245, 70], ate: [215, 40], cor: "tinta" },
              { t: "linha", de: [245, 70], ate: [280, 45], cor: "tinta" },
              { t: "linha", de: [245, 70], ate: [220, 108], cor: "tinta" },
              { t: "linha", de: [245, 70], ate: [278, 105], cor: "tinta" },
              { t: "rotulo", p: [232, 125], texto: "Radial" },
            ],
          },
        },
        {
          tipo: "licao",
          pergunta: "Qual padrão de drenagem é o mais comum e lembra galhos de árvore?",
          alternativas: ["Radial", "Dendrítico", "Treliça"],
          correta: 1,
          explicacao: "O padrão dendrítico, semelhante a galhos de árvore, é o mais comum e típico de terrenos com rochas de resistência uniforme.",
        },
      ],
    },
    {
      id: "talvegue-e-perfil",
      titulo: "O talvegue e o perfil longitudinal",
      blocos: [
        { tipo: "texto", texto: "Talvegue é a linha que liga os pontos mais baixos ao longo do vale: o caminho natural da água. O perfil longitudinal é o talvegue visto de lado, da nascente ao exutório, mostrando como a altitude cai com a distância. Perto da cabeceira a queda é forte (água rápida, erosiva); perto da foz a declividade suaviza (água lenta, que deposita sedimento)." },
        { tipo: "texto", texto: "O perfil importa para a bacia urbana porque a declividade controla a velocidade e, com ela, o tempo que a água leva para chegar ao ponto crítico. Trechos muito retificados e lisos (canal de concreto) aceleram o fluxo e antecipam o pico de cheia lá embaixo. O perfil é a primeira coisa a extrair do modelo de elevação." },
        {
          tipo: "prancha",
          titulo: "Perfil longitudinal: da cabeceira à foz",
          desenho: {
            legenda: "Altitude cai com a distancia; forte na cabeceira, suave perto do exutorio.",
            primitivas: [
              { t: "linha", de: [30, 30], ate: [30, 170], cor: "tinta" },
              { t: "linha", de: [30, 170], ate: [285, 170], cor: "tinta" },
              { t: "rotulo", p: [8, 26], texto: "Alt." },
              { t: "rotulo", p: [250, 182], texto: "Distancia" },
              { t: "curva", pts: [[35, 45], [70, 80], [120, 120], [190, 150], [280, 162]], cor: "destaque" },
              { t: "rotulo", p: [40, 40], texto: "Cabeceira" },
              { t: "rotulo", p: [228, 150], texto: "Foz" },
            ],
          },
        },
        {
          tipo: "tarefas",
          itens: [
            { id: "t-perfil", titulo: "Extraia um perfil longitudinal do seu córrego no QGIS ou Google Earth", entrega: "Gráfico altitude x distância da cabeceira ao exutório, com a declividade média anotada." },
          ],
        },
      ],
    },
    {
      id: "impermeabilizacao",
      titulo: "Ler a impermeabilização: quanto da bacia é concreto",
      blocos: [
        { tipo: "texto", texto: "A variável que mais muda o comportamento de uma bacia urbana é a taxa de área impermeável: a fração da bacia coberta por superfícies que não deixam a água entrar (telhado, asfalto, calçada, pátio). Estudos clássicos de hidrologia urbana mostram que, acima de cerca de 10% de área impermeável conectada, córregos já começam a degradar; acima de 25 a 30%, o regime de cheias muda de patamar." },
        { tipo: "texto", texto: "Você estima essa taxa de duas formas: por sensoriamento remoto (classificando uma imagem de satélite ou usando o MapBiomas de área urbana) e por amostragem de campo (percorrer transectos e anotar o tipo de piso a cada tantos metros). As duas se completam: o satélite dá o total, o campo dá a textura e confere." },
        {
          tipo: "diagrama",
          titulo: "Da cobertura ao escoamento",
          codigo: `flowchart LR
  A["% area impermeavel"] --> B["Menos infiltracao"]
  A --> C["Menos tempo de concentracao"]
  B --> D["Mais volume escoado"]
  C --> D
  D --> E["Vazao de pico maior"]` },
        {
          tipo: "licao",
          pergunta: "A partir de quanto de área impermeável conectada os córregos urbanos já costumam mostrar degradação?",
          alternativas: ["Cerca de 10%", "Cerca de 60%", "Só acima de 90%"],
          correta: 0,
          explicacao: "A literatura de hidrologia urbana aponta sinais de degradação a partir de aproximadamente 10% de área impermeável conectada, com mudança acentuada do regime de cheias acima de 25 a 30%.",
        },
      ],
    },
    {
      id: "canalizacao-tamponamento",
      titulo: "Córregos enterrados: canalização e tamponamento",
      blocos: [
        { tipo: "texto", texto: "Grande parte dos córregos urbanos foi canalizada (confinada em galeria de concreto) ou tamponada (coberta, virando rua ou avenida de fundo de vale). O curso d'água some do mapa da cidade, mas segue drenando a bacia por baixo. Avenidas que alagam com frequência quase sempre correm sobre um córrego tamponado: a avenida é o antigo talvegue." },
        { tipo: "texto", texto: "Para reconstruir a rede enterrada, cruze três fontes: mapas antigos (antes da urbanização), o modelo de elevação (que ainda mostra o fundo de vale) e o cadastro de galerias da prefeitura ou companhia de saneamento. Toponímia ajuda: ruas com nome de rio ou córrego denunciam o curso coberto." },
        {
          tipo: "tarefas",
          itens: [
            { id: "t-mapa-antigo", titulo: "Compare um mapa antigo da cidade com o atual", entrega: "Dois recortes lado a lado marcando um córrego que foi tamponado e virou via." },
            { id: "t-cadastro", titulo: "Solicite ou consulte o cadastro de galerias da sua área", entrega: "Anotação de onde passa a galeria-tronco e seu diâmetro, se disponível." },
          ],
        },
        { tipo: "fontes", titulo: "Mapas e base cartográfica", itens: [
          { titulo: "IBGE — Geociências e bases cartográficas", url: "https://www.ibge.gov.br/geociencias/", tipo: "site", nota: "Cartas topográficas e bases para reconstituir a drenagem." },
          { titulo: "OpenStreetMap — feições de drenagem e vias", url: "https://www.openstreetmap.org/", tipo: "dataset", nota: "Rios, córregos e ruas mapeados de forma aberta; útil para cruzar com o relevo." },
        ] },
      ],
    },
    {
      id: "uso-do-solo",
      titulo: "Ler o uso e a cobertura do solo da bacia",
      blocos: [
        { tipo: "texto", texto: "Cada tipo de cobertura responde de um jeito à chuva: mata infiltra muito, gramado infiltra bem, solo exposto infiltra pouco e sela com a batida da gota, asfalto e telhado quase não infiltram. Mapear o uso do solo da bacia é montar o mosaico que define o escoamento. Para a bacia inteira, o MapBiomas dá a série anual desde 1985; para o detalhe fino do bairro, uma imagem recente e a checagem de campo." },
        { tipo: "texto", texto: "Transforme o mapa em números: calcule a porcentagem de cada classe (impermeável, vegetação, solo exposto, água). Essa tabela vira a base para o coeficiente de escoamento ponderado e para o Curve Number, que você vai usar no capítulo de cálculo. Guarde o ano da imagem: uso do solo muda rápido no urbano." },
        {
          tipo: "prancha",
          titulo: "Mosaico de usos numa sub-bacia",
          desenho: {
            legenda: "A soma das areas de cada classe alimenta o coeficiente de escoamento da bacia.",
            primitivas: [
              { t: "retangulo", p: [20, 25], w: 120, h: 70, cor: "suave" },
              { t: "rotulo", p: [40, 60], texto: "Vegetacao" },
              { t: "retangulo", p: [145, 25], w: 138, h: 70, hachura: true },
              { t: "rotulo", p: [170, 60], texto: "Impermeavel" },
              { t: "retangulo", p: [20, 100], w: 90, h: 70, cor: "destaque" },
              { t: "rotulo", p: [28, 138], texto: "Solo exposto" },
              { t: "retangulo", p: [115, 100], w: 168, h: 70, cor: "tinta" },
              { t: "rotulo", p: [150, 138], texto: "Telhado + via" },
            ],
          },
        },
        {
          tipo: "tarefas",
          itens: [
            { id: "t-classes", titulo: "Monte a tabela de uso do solo da sua bacia no MapBiomas", entrega: "Planilha com a área (ha e %) de cada classe e o ano da imagem usada." },
          ],
        },
      ],
    },
    {
      id: "nascentes-e-apps",
      titulo: "Nascentes e APPs: o que a lei protege na bacia",
      blocos: [
        { tipo: "texto", texto: "Mesmo degradada, a bacia urbana tem pontos que a lei manda preservar. O Código Florestal (Lei 12.651/2012) define Áreas de Preservação Permanente: faixa marginal ao longo de rios (largura conforme a largura do curso) e raio de 50 m no entorno de nascentes e olhos d'água. Em área urbana consolidada há regras específicas, mas o princípio permanece: margem e nascente são áreas sensíveis." },
        { tipo: "texto", texto: "Ao ler a bacia, localize nascentes (ativas, intermitentes ou já soterradas) e verifique se a faixa marginal está ocupada. Nascente urbana costuma virar ponto de lançamento de esgoto ou lixo; recuperá-la é uma das intervenções de maior retorno. Registre a situação com foto e coordenada: isso embasa denúncia, projeto e monitoramento." },
        {
          tipo: "licao",
          pergunta: "Qual o raio de APP no entorno de uma nascente, pelo Código Florestal?",
          alternativas: ["5 metros", "50 metros", "500 metros"],
          correta: 1,
          explicacao: "A Lei 12.651/2012 estabelece APP num raio de 50 metros no entorno de nascentes e olhos d'água perenes e intermitentes, qualquer que seja a situação topográfica.",
        },
        { tipo: "fontes", titulo: "Proteção de nascentes e margens", itens: [
          { titulo: "Lei 12.651/2012 — Código Florestal (APPs)", url: "https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2012/lei/l12651.htm", tipo: "norma", nota: "Define faixas de APP de margens e o raio de 50 m de nascentes." },
        ] },
      ],
    },
    {
      id: "ocupacao-de-varzea",
      titulo: "Várzea ocupada: onde o rio quer voltar",
      blocos: [
        { tipo: "texto", texto: "Várzea (ou planície de inundação) é a faixa plana ao lado do curso que o rio ocupa naturalmente nas cheias. Em bacia urbana, a várzea quase sempre foi aterrada e construída, e é exatamente ali que a água retorna quando a chuva é forte. Não é o rio que invade a cidade: é a cidade que ocupou o espaço do rio. Ler a bacia é reconhecer a várzea mesmo coberta de casas." },
        { tipo: "texto", texto: "Para identificar a várzea, procure no relevo a faixa de declividade quase nula ao lado do talvegue, cruze com o histórico de alagamentos e com as manchas de inundação da Defesa Civil. Essa leitura orienta onde recuar ocupação, onde criar parque linear e onde a água de cheia pode ser estocada com segurança." },
        {
          tipo: "prancha",
          titulo: "Seção transversal: leito, várzea e encosta",
          desenho: {
            legenda: "O leito menor leva o dia a dia; na cheia, a agua espraia pela varzea plana antes da encosta.",
            primitivas: [
              { t: "curva", pts: [[20, 70], [70, 95], [110, 135], [140, 150]], cor: "tinta" },
              { t: "linha", de: [140, 150], ate: [200, 150], cor: "suave" },
              { t: "curva", pts: [[200, 150], [235, 130], [270, 90], [285, 65]], cor: "tinta" },
              { t: "linha", de: [148, 158], ate: [192, 158], cor: "destaque" },
              { t: "rotulo", p: [150, 168], texto: "Leito menor" },
              { t: "rotulo", p: [128, 128], texto: "Varzea" },
              { t: "rotulo", p: [205, 128], texto: "Varzea" },
              { t: "rotulo", p: [30, 60], texto: "Encosta" },
              { t: "rotulo", p: [240, 60], texto: "Encosta" },
            ],
          },
        },
        {
          tipo: "licao",
          pergunta: "O que é a várzea de um rio?",
          alternativas: [
            "O ponto mais fundo do canal",
            "A planície plana ao lado do curso, ocupada pelas cheias",
            "A nascente do rio",
          ],
          correta: 1,
          explicacao: "A várzea ou planície de inundação é a faixa plana lateral que o rio ocupa naturalmente nas cheias. Ocupá-la é a causa recorrente de perdas por inundação no urbano.",
        },
      ],
    },
    {
      id: "leitura-campo-visual",
      titulo: "Pistas de campo: ler a bacia com os pés",
      blocos: [
        { tipo: "texto", texto: "Antes de qualquer sensor, treine o olho. Marca de lâmina d'água em muros e pilares indica até onde a cheia subiu. Sedimento e lixo pendurado em grades e arbustos mostram a altura e a direção do fluxo. Boca de lobo entupida, sarjeta com sentido invertido e poça recorrente denunciam o ponto baixo. Cheiro de esgoto e água colorida apontam lançamento clandestino." },
        { tipo: "texto", texto: "Caminhe a bacia da parte alta para a baixa, no sentido da água. Faça isso em dois momentos: tempo seco (para ver lançamentos permanentes) e logo após uma chuva (para ver por onde a água corre de verdade). A bacia se revela andando; o mapa só confirma o que os pés já descobriram." },
        {
          tipo: "tarefas",
          itens: [
            { id: "t-marca", titulo: "Fotografe uma marca de cheia em muro ou pilar", entrega: "Foto com uma referência de escala (pessoa, régua) e a coordenada do ponto." },
            { id: "t-seco-chuva", titulo: "Percorra o mesmo trecho em tempo seco e após chuva", entrega: "Duas fotos do mesmo ponto e três diferenças observadas no comportamento da água." },
          ],
        },
        {
          tipo: "diagrama",
          titulo: "Sentido da caminhada de reconhecimento",
          codigo: `flowchart TD
  A["Cabeceira (parte alta)"] --> B["Trecho medio"]
  B --> C["Fundo de vale / varzea"]
  C --> D["Exutorio"]
  D --> E["Anota: marcas, lancamentos, pontos baixos"]` },
      ],
    },
    {
      id: "caderneta-de-campo",
      titulo: "A caderneta de campo: registrar para provar",
      blocos: [
        { tipo: "texto", texto: "Observação sem registro vira memória, e memória não serve de prova. A caderneta de campo padroniza o que anotar em cada ponto: data e hora, coordenada (GPS do celular já serve), descrição do ponto, condição do tempo (seco, chuva recente), o que foi observado e medido, e o número da foto. Um ponto bem registrado pode ser revisitado por qualquer pessoa, meses depois." },
        { tipo: "texto", texto: "Monte uma ficha simples e repita-a em todos os pontos. A regularidade é o que transforma visitas soltas em uma série que mostra tendência. Hoje há aplicativos de coleta (formulários georreferenciados) que exportam planilha e mapa automaticamente; comece no papel se preferir, mas migre para o digital assim que a rotina pegar." },
        {
          tipo: "prancha",
          titulo: "Modelo de ficha de ponto",
          desenho: {
            legenda: "Uma linha por campo; a mesma ficha em todos os pontos garante comparabilidade.",
            primitivas: [
              { t: "retangulo", p: [30, 25], w: 243, h: 150, cor: "tinta" },
              { t: "linha", de: [30, 50], ate: [273, 50], cor: "suave" },
              { t: "linha", de: [30, 75], ate: [273, 75], cor: "suave" },
              { t: "linha", de: [30, 100], ate: [273, 100], cor: "suave" },
              { t: "linha", de: [30, 125], ate: [273, 125], cor: "suave" },
              { t: "linha", de: [30, 150], ate: [273, 150], cor: "suave" },
              { t: "rotulo", p: [38, 42], texto: "Ponto / coordenada" },
              { t: "rotulo", p: [38, 67], texto: "Data, hora, tempo" },
              { t: "rotulo", p: [38, 92], texto: "Observacao" },
              { t: "rotulo", p: [38, 117], texto: "Medida" },
              { t: "rotulo", p: [38, 142], texto: "Foto no" },
              { t: "rotulo", p: [38, 167], texto: "Responsavel" },
            ],
          },
        },
        {
          tipo: "tarefas",
          itens: [
            { id: "t-ficha", titulo: "Crie sua ficha de ponto e preencha em 3 pontos reais", entrega: "Três fichas preenchidas com coordenada, foto e observação." },
          ],
        },
      ],
    },
    {
      id: "fontes-leitura",
      titulo: "Fontes: leitura do local",
      blocos: [
        { tipo: "texto", texto: "O capítulo de leitura se apoia em norma ambiental, dados de cobertura e ferramentas de coleta. Reúna estes endereços antes de ir a campo." },
        { tipo: "fontes", titulo: "Leitura do território", itens: [
          { titulo: "MapBiomas — coleções de uso e cobertura (download e toolkit)", url: "https://brasil.mapbiomas.org/", tipo: "dataset", nota: "Série anual para quantificar impermeabilização e vegetação da bacia." },
          { titulo: "Lei 12.651/2012 — Código Florestal", url: "https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2012/lei/l12651.htm", tipo: "norma", nota: "APPs de margens e nascentes que recortam a leitura da bacia." },
          { titulo: "OpenStreetMap — base aberta de drenagem e vias", url: "https://www.openstreetmap.org/", tipo: "dataset", nota: "Cruzar córregos e ruas com o relevo para achar cursos enterrados." },
        ] },
        {
          tipo: "licao",
          pergunta: "Por que caminhar a bacia em tempo seco E após chuva?",
          alternativas: [
            "Para conferir a previsão do tempo",
            "Seco revela lançamentos permanentes; após chuva revela por onde a água corre de verdade",
            "Não há diferença entre os dois momentos",
          ],
          correta: 1,
          explicacao: "Em tempo seco aparecem os lançamentos contínuos (esgoto clandestino); logo após a chuva se vê o caminho real do escoamento e os pontos de acúmulo. Os dois momentos se completam.",
        },
      ],
    },
    // ===================== CAPÍTULO 3 — MÉTODO E CARTOGRAFIA =====================
    {
      id: "mapa-base",
      titulo: "O mapa-base: escala, projeção e datum",
      blocos: [
        { tipo: "texto", texto: "Toda delimitação começa num mapa-base correto. Três escolhas não podem errar. Escala: para bacia urbana, trabalhe em 1:10.000 ou mais detalhado; curvas de nível de 5 m já permitem traçar o divisor. Projeção: no Brasil, UTM na zona da sua cidade, para que distâncias e áreas saiam em metros. Datum: SIRGAS 2000, o oficial brasileiro desde 2015." },
        { tipo: "texto", texto: "Misturar datum ou projeção desloca camadas e estraga o cálculo de área. Padronize tudo no mesmo sistema de referência antes de medir qualquer coisa. Guarde essa decisão no topo do seu projeto de SIG: é a primeira linha de qualquer trabalho sério de bacia." },
        {
          tipo: "licao",
          pergunta: "Qual é o datum geodésico oficial do Brasil para mapeamento?",
          alternativas: ["WGS 84 apenas", "SIRGAS 2000", "Córrego Alegre"],
          correta: 1,
          explicacao: "O SIRGAS 2000 é o sistema de referência geodésico oficial do Brasil. Manter todas as camadas nele (e em UTM para medir em metros) evita deslocamentos e erros de área.",
        },
        { tipo: "fontes", titulo: "Referência cartográfica", itens: [
          { titulo: "IBGE — SIRGAS 2000 e sistema geodésico brasileiro", url: "https://www.ibge.gov.br/geociencias/informacoes-sobre-posicionamento-geodesico/", tipo: "site", nota: "Datum oficial, transformação entre sistemas e redes de referência." },
        ] },
      ],
    },
    {
      id: "mde-e-curvas",
      titulo: "O modelo de elevação e as curvas de nível",
      blocos: [
        { tipo: "texto", texto: "O modelo digital de elevação (MDE) é uma grade em que cada célula guarda a altitude do terreno. É a matéria-prima para delimitar bacia e extrair drenagem no computador. Para o Brasil inteiro, o TOPODATA/INPE oferece gratuitamente o MDE derivado do SRTM, com célula de cerca de 30 m. Para detalhe urbano, prefira MDE de alta resolução (LiDAR da prefeitura, quando existir)." },
        { tipo: "texto", texto: "Das curvas de nível ao MDE e vice-versa: curvas são linhas de igual altitude; o espaçamento entre elas diz a declividade (curvas juntas, terreno íngreme; curvas afastadas, terreno plano). Saber ler esse adensamento é o que permite traçar o divisor na mão e conferir o que o software fez." },
        {
          tipo: "prancha",
          titulo: "Curvas juntas e afastadas",
          desenho: {
            legenda: "Curvas proximas = encosta ingreme; curvas afastadas = terreno plano (candidato a varzea).",
            primitivas: [
              { t: "curva", pts: [[30, 30], [60, 40], [90, 32]], cor: "suave" },
              { t: "curva", pts: [[30, 45], [60, 55], [90, 47]], cor: "suave" },
              { t: "curva", pts: [[30, 60], [60, 70], [90, 62]], cor: "suave" },
              { t: "rotulo", p: [26, 90], texto: "Ingreme" },
              { t: "curva", pts: [[160, 40], [210, 46], [270, 40]], cor: "suave" },
              { t: "curva", pts: [[160, 90], [210, 96], [270, 90]], cor: "suave" },
              { t: "curva", pts: [[160, 140], [210, 146], [270, 140]], cor: "suave" },
              { t: "rotulo", p: [190, 165], texto: "Plano" },
            ],
          },
        },
        {
          tipo: "licao",
          pergunta: "Num mapa de curvas de nível, o que indicam curvas muito juntas?",
          alternativas: ["Terreno plano", "Encosta íngreme (declividade alta)", "Presença de água"],
          correta: 1,
          explicacao: "Curvas de nível próximas indicam que a altitude varia muito em pouca distância, ou seja, declividade alta (encosta íngreme). Curvas afastadas indicam terreno plano.",
        },
      ],
    },
    {
      id: "delimitacao-manual",
      titulo: "Delimitar a bacia na mão, pelas curvas",
      blocos: [
        { tipo: "texto", texto: "Saber delimitar no papel ensina o método e permite auditar o computador. Passos: 1) marque o exutório (onde quer medir a bacia); 2) a partir dele, suba pelos dois lados do vale sempre pelos pontos mais altos, cruzando as curvas pela perpendicular; 3) feche o contorno no topo, sem nunca cortar o leito de um córrego; 4) confira se toda gota dentro da linha desce para o exutório." },
        { tipo: "texto", texto: "Erros comuns: deixar o divisor passar pelo fundo do vale (ele passa pela crista), e esquecer de fechar o contorno no exutório. Faça o traçado a lápis, confira e só então passe a limpo. Esse desenho manual é a referência para validar o resultado do SIG." },
        {
          tipo: "prancha",
          titulo: "Passo a passo do traçado manual",
          desenho: {
            legenda: "Do exutorio, subir pelos topos dos dois lados ate fechar; a linha nunca cruza o corrego.",
            primitivas: [
              { t: "curva", pts: [[30, 50], [90, 40], [150, 45], [210, 38], [275, 55]], cor: "suave" },
              { t: "curva", pts: [[30, 110], [90, 100], [150, 120], [210, 100], [275, 110]], cor: "suave" },
              { t: "curva", pts: [[150, 50], [150, 120], [150, 178]], cor: "tinta" },
              { t: "circulo", c: [150, 178], r: 5, cor: "destaque" },
              { t: "rotulo", p: [156, 184], texto: "1. Exutorio" },
              { t: "curva", pts: [[150, 178], [100, 130], [80, 70], [90, 40]], cor: "destaque" },
              { t: "curva", pts: [[150, 178], [205, 130], [220, 70], [210, 38]], cor: "destaque" },
              { t: "rotulo", p: [60, 95], texto: "2. Sobe pelo topo" },
              { t: "rotulo", p: [100, 32], texto: "3. Fecha no alto" },
            ],
          },
        },
        {
          tipo: "tarefas",
          itens: [
            { id: "t-manual", titulo: "Delimite à mão a bacia do seu exutório num mapa de curvas", entrega: "Mapa com o divisor fechado a lápis e a área estimada por contagem de quadrículas." },
          ],
        },
      ],
    },
    {
      id: "delimitacao-sig",
      titulo: "Delimitar no QGIS: do MDE à bacia",
      blocos: [
        { tipo: "texto", texto: "No SIG, a delimitação vira uma sequência de processamento sobre o MDE. O fluxo clássico (ferramentas do GRASS/SAGA dentro do QGIS): 1) preencher depressões (fill sinks), para a água não ficar presa em buracos numéricos; 2) calcular a direção de fluxo (para onde cada célula drena); 3) calcular a acumulação de fluxo (quantas células drenam para cada ponto); 4) definir a rede de drenagem por um limiar; 5) marcar o exutório e extrair a bacia a montante." },
        { tipo: "texto", texto: "O QGIS é gratuito e roda em qualquer máquina. O resultado é um polígono da bacia e uma linha da drenagem, ambos prontos para medir área, perímetro e comprimentos. Sempre compare o polígono com o seu traçado manual e com a imagem de satélite: o computador erra quando o MDE é grosseiro ou o exutório foi mal posicionado." },
        {
          tipo: "diagrama",
          titulo: "Cadeia de processamento no SIG",
          codigo: `flowchart LR
  A["MDE (SRTM/LiDAR)"] --> B["Preencher depressoes"]
  B --> C["Direcao de fluxo"]
  C --> D["Acumulacao de fluxo"]
  D --> E["Rede de drenagem"]
  E --> F["Exutorio -> bacia (poligono)"]` },
        {
          tipo: "tarefas",
          itens: [
            { id: "t-qgis", titulo: "Delimite a mesma bacia no QGIS a partir do MDE do TOPODATA", entrega: "Polígono da bacia exportado e a área em km², comparada com a estimativa manual." },
          ],
        },
        { tipo: "fontes", titulo: "Ferramenta aberta", itens: [
          { titulo: "QGIS — SIG livre e de código aberto", url: "https://qgis.org/", tipo: "site", nota: "Delimitação, extração de drenagem e cálculo de parâmetros, sem custo." },
        ] },
      ],
    },
    {
      id: "streamstats",
      titulo: "Delimitação automática: StreamStats e similares",
      blocos: [
        { tipo: "texto", texto: "Para ter rapidez e um resultado de referência, ferramentas web delimitam a bacia com um clique no exutório. O USGS StreamStats faz isso e ainda calcula características da bacia (área, declividade, uso do solo) para regiões cobertas. É excelente para aprender o conceito e para conferir ordens de grandeza, mesmo quando a cobertura detalhada é dos Estados Unidos." },
        { tipo: "texto", texto: "A lição é o método, replicável com dados brasileiros: clicar no exutório, deixar o sistema subir pela acumulação de fluxo e devolver o polígono. Use o resultado automático como primeira aproximação e refine com MDE local e checagem de campo. Nunca entregue uma bacia sem olhar se o divisor faz sentido no terreno real." },
        {
          tipo: "licao",
          pergunta: "Qual é a melhor postura diante de uma delimitação automática de bacia?",
          alternativas: [
            "Aceitar como definitiva, pois o software não erra",
            "Usar como primeira aproximação e validar com MDE local e campo",
            "Ignorar e fazer tudo na mão",
          ],
          correta: 1,
          explicacao: "Ferramentas automáticas dão uma primeira aproximação rápida, mas dependem da qualidade do MDE e da posição do exutório. O resultado deve ser validado com dados locais e observação de campo.",
        },
        { tipo: "fontes", titulo: "Delimitação assistida", itens: [
          { titulo: "USGS StreamStats", url: "https://streamstats.usgs.gov/ss/", tipo: "site", nota: "Delimita bacia a partir do exutório e calcula parâmetros; referência de método." },
        ] },
      ],
    },
    {
      id: "parametros-morfometricos",
      titulo: "Parâmetros morfométricos: medir a forma da bacia",
      blocos: [
        { tipo: "texto", texto: "A forma da bacia influencia a cheia. Dois índices clássicos: coeficiente de compacidade Kc = 0,28 x P / raiz(A), onde P é o perímetro e A a área; quanto mais perto de 1, mais circular (e mais sujeita a picos concentrados). Fator de forma Kf = A / L², onde L é o comprimento axial; valores baixos indicam bacia alongada, com cheias mais distribuídas no tempo. Bacia circular concentra; bacia alongada espalha." },
        { tipo: "texto", texto: "Esses números saem direto do polígono e da drenagem no SIG. Calcule-os uma vez e anote-os na ficha da bacia: servem para comparar sua bacia com outras e para explicar por que ela responde do jeito que responde às chuvas. São descritores reconhecidos desde os trabalhos de Horton e Villela e Mattos na hidrologia." },
        {
          tipo: "prancha",
          titulo: "Bacia circular x bacia alongada",
          desenho: {
            legenda: "Circular (Kc perto de 1) concentra a cheia; alongada (Kf baixo) distribui o escoamento.",
            primitivas: [
              { t: "circulo", c: [75, 80], r: 45, cor: "tinta" },
              { t: "curva", pts: [[75, 40], [72, 80], [75, 125]], cor: "destaque" },
              { t: "rotulo", p: [45, 140], texto: "Circular: pico alto" },
              { t: "curva", pts: [[200, 30], [215, 80], [205, 130], [218, 160]], cor: "tinta" },
              { t: "curva", pts: [[185, 45], [210, 70]], cor: "tinta" },
              { t: "curva", pts: [[240, 55], [212, 95]], cor: "tinta" },
              { t: "rotulo", p: [185, 172], texto: "Alongada: pico espalhado" },
            ],
          },
        },
        {
          tipo: "licao",
          pergunta: "Uma bacia com coeficiente de compacidade Kc próximo de 1 tende a:",
          alternativas: [
            "Ter cheias mais espalhadas no tempo",
            "Ser mais circular e concentrar o pico de cheia",
            "Não ter cheias",
          ],
          correta: 1,
          explicacao: "Kc próximo de 1 indica forma mais circular. Nessas bacias a água chega ao exutório de forma mais simultânea, concentrando e elevando o pico de cheia.",
        },
      ],
    },
    {
      id: "densidade-de-drenagem",
      titulo: "Densidade de drenagem e comprimento do curso",
      blocos: [
        { tipo: "texto", texto: "Densidade de drenagem Dd = soma dos comprimentos de todos os cursos / área da bacia, em km/km². Dd alta (rede fina e ramificada) indica terreno que escoa rápido e infiltra pouco; Dd baixa indica solo permeável e resposta mais lenta. No urbano, some à rede natural a drenagem artificial (galerias e sarjetas) para não subestimar a capacidade real de condução da água." },
        { tipo: "texto", texto: "Meça também o comprimento do curso principal (L) e o comprimento axial da bacia: eles entram no tempo de concentração e nos índices de forma. Tudo isso sai do SIG com a ferramenta de medir comprimento sobre as linhas de drenagem, desde que estejam em projeção métrica (UTM)." },
        {
          tipo: "tarefas",
          itens: [
            { id: "t-dd", titulo: "Calcule a densidade de drenagem da sua bacia", entrega: "Soma dos comprimentos dos cursos, área e o valor de Dd em km/km²." },
            { id: "t-lprincipal", titulo: "Meça o comprimento do curso principal", entrega: "Comprimento L em km, medido sobre a drenagem em projeção UTM." },
          ],
        },
        {
          tipo: "diagrama",
          titulo: "O que a densidade de drenagem revela",
          codigo: `flowchart TD
  A["Dd = soma dos cursos / area"] --> B{"Dd alta?"}
  B -->|"Sim"| C["Escoa rapido, infiltra pouco"]
  B -->|"Nao"| D["Resposta lenta, solo permeavel"]` },
      ],
    },
    {
      id: "declividade-hipsometria",
      titulo: "Declividade e curva hipsométrica",
      blocos: [
        { tipo: "texto", texto: "A declividade média da bacia controla a velocidade do escoamento: quanto mais íngreme, mais rápido a água chega ao exutório e maior o pico. Extraia-a do MDE (mapa de declividade) e resuma pela média ou por classes. A declividade do curso principal (queda total dividida pelo comprimento) entra direto no cálculo do tempo de concentração." },
        { tipo: "texto", texto: "A curva hipsométrica mostra quanto da área da bacia está acima de cada altitude. O formato conta o estágio de evolução do relevo: curva alta e convexa indica bacia jovem e erosiva; curva baixa e côncava, bacia madura. É uma leitura de uma folha só que posiciona sua bacia no tempo geológico." },
        {
          tipo: "prancha",
          titulo: "Curva hipsométrica",
          desenho: {
            legenda: "Eixo x: % da area acima de cada cota. Eixo y: altitude. A forma indica o estagio do relevo.",
            primitivas: [
              { t: "linha", de: [35, 25], ate: [35, 170], cor: "tinta" },
              { t: "linha", de: [35, 170], ate: [285, 170], cor: "tinta" },
              { t: "rotulo", p: [8, 24], texto: "Alt." },
              { t: "rotulo", p: [240, 182], texto: "% area" },
              { t: "curva", pts: [[40, 40], [90, 60], [150, 100], [220, 150], [280, 165]], cor: "destaque" },
            ],
          },
        },
        {
          tipo: "licao",
          pergunta: "Como a declividade média da bacia afeta a cheia?",
          alternativas: [
            "Maior declividade acelera o escoamento e aumenta o pico",
            "Declividade não tem efeito sobre a cheia",
            "Maior declividade reduz a vazão de pico",
          ],
          correta: 0,
          explicacao: "Maior declividade aumenta a velocidade do escoamento, reduz o tempo de concentração e eleva a vazão de pico para a mesma chuva.",
        },
      ],
    },
    {
      id: "tempo-de-concentracao",
      titulo: "Tempo de concentração: o relógio da bacia",
      blocos: [
        { tipo: "texto", texto: "Tempo de concentração (tc) é o tempo que a gota do ponto hidraulicamente mais distante leva para chegar ao exutório. É o relógio da bacia: define a duração de chuva crítica a adotar no cálculo. Uma fórmula muito usada no Brasil é a de Kirpich: tc (min) = 57 x (L³ / H)^0,385, com L em km (comprimento do talvegue) e H em metros (desnível entre cabeceira e exutório)." },
        { tipo: "texto", texto: "Na bacia urbana, o tc cai bastante porque galerias e canais lisos aceleram a água; isso antecipa e aumenta o pico. Por isso métodos urbanos somam o tempo de escoamento superficial (da sarjeta à boca de lobo) ao tempo de percurso na galeria. Calcule o tc natural e o urbanizado e compare: a diferença é, em números, o efeito da cidade." },
        {
          tipo: "diagrama",
          titulo: "O que o tempo de concentração governa",
          codigo: `flowchart LR
  A["Comprimento L e desnivel H"] --> B["tc (Kirpich)"]
  B --> C["Duracao critica de chuva"]
  C --> D["Intensidade i na curva IDF"]
  D --> E["Vazao de pico pelo metodo racional"]` },
        {
          tipo: "tarefas",
          itens: [
            { id: "t-tc", titulo: "Calcule o tc da sua bacia pela fórmula de Kirpich", entrega: "L, H e o tc em minutos, mostrando a conta." },
          ],
        },
      ],
    },
    {
      id: "fontes-metodo",
      titulo: "Fontes: método e cartografia",
      blocos: [
        { tipo: "texto", texto: "Delimitação e morfometria têm décadas de literatura consolidada. Para a base de dados e as ferramentas, guarde estes endereços; para as fórmulas, a hidrologia aplicada brasileira é a referência." },
        { tipo: "fontes", titulo: "Dados de elevação e ferramentas", itens: [
          { titulo: "TOPODATA / INPE — MDE do SRTM para o Brasil", url: "http://www.dsr.inpe.br/topodata/", tipo: "dataset", nota: "Altitude por célula para delimitar e extrair drenagem." },
          { titulo: "USGS EarthExplorer — SRTM e imagens", url: "https://earthexplorer.usgs.gov/", tipo: "dataset", nota: "Fonte internacional do SRTM e de imagens para sensoriamento remoto." },
          { titulo: "QGIS — documentação e algoritmos de hidrologia", url: "https://docs.qgis.org/", tipo: "site", nota: "Preencher depressões, direção e acumulação de fluxo, extração de bacia." },
        ] },
        {
          tipo: "licao",
          pergunta: "O que é o tempo de concentração de uma bacia?",
          alternativas: [
            "O tempo que a chuva dura",
            "O tempo que a água do ponto mais distante leva para chegar ao exutório",
            "O intervalo entre duas chuvas",
          ],
          correta: 1,
          explicacao: "O tempo de concentração é o tempo de percurso da água do ponto hidraulicamente mais distante até o exutório. Ele define a duração crítica de chuva usada no dimensionamento.",
        },
      ],
    },
    // ===================== CAPÍTULO 4 — CÁLCULO E MEDIÇÃO =====================
    {
      id: "chuva-idf",
      titulo: "A chuva de projeto: curvas IDF",
      blocos: [
        { tipo: "texto", texto: "Para dimensionar, não basta saber que choveu: é preciso a intensidade da chuva (mm/h) para uma dada duração e frequência. Isso vem da curva IDF (intensidade-duração-frequência), ajustada a partir de séries longas de pluviógrafo. A forma geral é i = a x T^b / (t + c)^d, onde T é o período de retorno, t a duração, e a, b, c, d são coeficientes locais. Muitas cidades têm sua IDF publicada; use a da estação mais próxima." },
        { tipo: "texto", texto: "A lógica: entra o tempo de concentração como duração t, entra o período de retorno T escolhido, e sai a intensidade i. Quanto mais curta a duração, mais intensa a chuva; por isso bacias pequenas e rápidas são dimensionadas por chuvas curtas e fortes. Os dados brutos de chuva saem do BDMEP/INMET e do HidroWeb/ANA." },
        {
          tipo: "prancha",
          titulo: "Família de curvas IDF",
          desenho: {
            legenda: "Intensidade cai com a duracao e sobe com o periodo de retorno (cada curva = um T).",
            primitivas: [
              { t: "linha", de: [35, 25], ate: [35, 170], cor: "tinta" },
              { t: "linha", de: [35, 170], ate: [285, 170], cor: "tinta" },
              { t: "rotulo", p: [6, 24], texto: "i (mm/h)" },
              { t: "rotulo", p: [220, 182], texto: "duracao (min)" },
              { t: "curva", pts: [[45, 45], [100, 90], [180, 130], [280, 150]], cor: "destaque" },
              { t: "curva", pts: [[45, 70], [100, 110], [180, 145], [280, 160]], cor: "tinta" },
              { t: "rotulo", p: [200, 120], texto: "T=50 anos" },
              { t: "rotulo", p: [200, 158], texto: "T=10 anos" },
            ],
          },
        },
        {
          tipo: "licao",
          pergunta: "Numa curva IDF, o que acontece com a intensidade quando a duração aumenta?",
          alternativas: ["Aumenta", "Diminui", "Não muda"],
          correta: 1,
          explicacao: "Chuvas de curta duração são mais intensas; à medida que a duração cresce, a intensidade média cai. Por isso bacias rápidas são governadas por chuvas curtas e fortes.",
        },
      ],
    },
    {
      id: "periodo-de-retorno",
      titulo: "Período de retorno e risco de falha",
      blocos: [
        { tipo: "texto", texto: "Período de retorno T é o intervalo médio, em anos, entre eventos que igualam ou superam uma dada chuva. T de 10 anos não significa que ocorre de 10 em 10 anos exatos: significa 10% de chance a cada ano. A escolha de T define o nível de proteção da obra: microdrenagem urbana costuma usar T de 2 a 10 anos; macrodrenagem e obras maiores, 25, 50 ou 100 anos." },
        { tipo: "texto", texto: "O risco de falha ao longo da vida útil é R = 1 - (1 - 1/T)^n, onde n é o número de anos. Uma obra para T=25 anos tem risco considerável de ser superada em 50 anos de vida. Explicitar isso evita a ilusão de segurança absoluta: toda drenagem pode falhar; a decisão é quanto risco aceitar e quanto pagar por isso." },
        {
          tipo: "licao",
          pergunta: "Uma chuva com período de retorno de 10 anos tem, a cada ano, probabilidade de:",
          alternativas: ["1% de ser igualada ou superada", "10% de ser igualada ou superada", "100% em 10 anos"],
          correta: 1,
          explicacao: "Período de retorno de 10 anos corresponde a 10% (1/10) de probabilidade anual de ser igualado ou superado. Não é um relógio fixo; é probabilidade.",
        },
        {
          tipo: "diagrama",
          titulo: "Escolha do período de retorno por tipo de obra",
          codigo: `flowchart TD
  A["Tipo de sistema"] --> B["Microdrenagem: T 2 a 10 anos"]
  A --> C["Macrodrenagem: T 25 a 50 anos"]
  A --> D["Obras criticas: T 100 anos"]` },
      ],
    },
    {
      id: "coeficiente-de-escoamento",
      titulo: "Coeficiente de escoamento (runoff) C",
      blocos: [
        { tipo: "texto", texto: "O coeficiente de escoamento C é a fração da chuva que vira escoamento superficial (o resto infiltra, evapora ou fica retido). Vai de 0 a 1. Valores de referência: telhado e asfalto 0,80 a 0,95; concreto 0,80; pavimento de paralelepípedo 0,55 a 0,70; gramado em solo plano 0,10 a 0,25; mata 0,05 a 0,20. Para a bacia, calcula-se o C ponderado pela área de cada cobertura." },
        { tipo: "texto", texto: "O C ponderado é a ponte entre a leitura de uso do solo (capítulo 2) e o cálculo de vazão. Monte a tabela: área de cada classe vezes seu C, somado e dividido pela área total. É nesse ponto que a impermeabilização vira número: aumentar a área de telhado e asfalto puxa o C médio para cima e, com ele, a vazão de pico." },
        {
          tipo: "prancha",
          titulo: "Coeficiente C por cobertura",
          desenho: {
            legenda: "Quanto mais impermeavel, maior o C: mais chuva vira escoamento.",
            primitivas: [
              { t: "linha", de: [35, 170], ate: [285, 170], cor: "tinta" },
              { t: "retangulo", p: [50, 150], w: 30, h: 20, cor: "suave" },
              { t: "rotulo", p: [46, 185], texto: "Mata 0,1" },
              { t: "retangulo", p: [120, 110], w: 30, h: 60, cor: "destaque" },
              { t: "rotulo", p: [112, 185], texto: "Grama 0,2" },
              { t: "retangulo", p: [190, 55], w: 30, h: 115, hachura: true },
              { t: "rotulo", p: [182, 185], texto: "Asfalto 0,9" },
              { t: "rotulo", p: [8, 50], texto: "C" },
            ],
          },
        },
        {
          tipo: "tarefas",
          itens: [
            { id: "t-cpond", titulo: "Calcule o C ponderado da sua bacia", entrega: "Tabela com área e C de cada classe e o C médio da bacia." },
          ],
        },
      ],
    },
    {
      id: "metodo-racional",
      titulo: "Método racional: estimar a vazão de pico",
      blocos: [
        { tipo: "texto", texto: "O método racional é o mais usado para bacias pequenas (até cerca de 2 a 3 km²): Q = C x i x A / 360, com Q em m³/s, C o coeficiente de escoamento, i a intensidade em mm/h e A a área em hectares. A intensidade i é tirada da IDF para uma duração igual ao tempo de concentração e o período de retorno escolhido. É um cálculo de uma linha que fecha o raciocínio dos capítulos anteriores." },
        { tipo: "texto", texto: "Monte o cálculo em passos: 1) tc da bacia; 2) i na IDF para t = tc e o T desejado; 3) C ponderado; 4) A em hectares; 5) aplique a fórmula. O método assume chuva uniforme e C constante, por isso serve de estimativa; bacias maiores ou complexas pedem modelagem hidrológica (hidrograma). Ainda assim, o racional é a ferramenta de bolso da drenagem urbana." },
        {
          tipo: "diagrama",
          titulo: "O encadeamento do método racional",
          codigo: `flowchart LR
  A["tc"] --> B["i na IDF (t=tc, T)"]
  C["Uso do solo"] --> D["C ponderado"]
  E["Poligono"] --> F["Area A"]
  B --> G["Q = C i A / 360"]
  D --> G
  F --> G` },
        {
          tipo: "licao",
          pergunta: "Na fórmula do método racional Q = C i A / 360, o que é i?",
          alternativas: [
            "A área da bacia",
            "A intensidade da chuva de projeto (mm/h) para t igual ao tempo de concentração",
            "O período de retorno",
          ],
          correta: 1,
          explicacao: "i é a intensidade da chuva de projeto, em mm/h, obtida da curva IDF para a duração igual ao tempo de concentração e o período de retorno adotado.",
        },
      ],
    },
    {
      id: "curve-number",
      titulo: "Método SCS-CN: escoamento por Curve Number",
      blocos: [
        { tipo: "texto", texto: "Para estimar o volume escoado de um evento (não só o pico), o método do Curve Number do SCS/NRCS é padrão. O CN (de 30 a 100) resume solo e uso: quanto mais impermeável, mais perto de 100. A retenção potencial é S = 25400/CN - 254 (mm). O escoamento é Q = (P - 0,2S)² / (P + 0,8S), para P maior que 0,2S, com P a chuva total em mm. É a base do TR-55, manual de hidrologia urbana do NRCS." },
        { tipo: "texto", texto: "O CN entra no SIG combinando o mapa de uso do solo com o grupo hidrológico do solo (A a D, do mais ao menos permeável). O resultado é um CN ponderado da bacia e o volume escoado por chuva. Compare com o método racional: o racional dá pico, o CN dá volume; juntos, dimensionam condução e reservação." },
        {
          tipo: "prancha",
          titulo: "Chuva, abstração e escoamento (SCS-CN)",
          desenho: {
            legenda: "Parte da chuva fica retida (S); o excedente vira escoamento Q, maior quanto maior o CN.",
            primitivas: [
              { t: "retangulo", p: [40, 30], w: 60, h: 140, cor: "suave" },
              { t: "rotulo", p: [48, 22], texto: "Chuva P" },
              { t: "retangulo", p: [40, 110], w: 60, h: 60, cor: "destaque" },
              { t: "rotulo", p: [46, 185], texto: "Retido S" },
              { t: "seta", de: [110, 70], ate: [180, 70], cor: "tinta" },
              { t: "retangulo", p: [200, 30], w: 60, h: 80, hachura: true },
              { t: "rotulo", p: [205, 22], texto: "Escoa Q" },
            ],
          },
        },
        {
          tipo: "licao",
          pergunta: "No método SCS-CN, um CN próximo de 100 representa:",
          alternativas: [
            "Solo muito permeável, quase todo infiltra",
            "Superfície quase impermeável, quase tudo escoa",
            "Ausência de chuva",
          ],
          correta: 1,
          explicacao: "CN próximo de 100 indica retenção potencial S quase nula: a superfície é praticamente impermeável e quase toda a chuva vira escoamento.",
        },
      ],
    },
    {
      id: "hidrograma",
      titulo: "O hidrograma: a cheia no tempo",
      blocos: [
        { tipo: "texto", texto: "Vazão de pico é um número; o hidrograma é o filme: a vazão no exutório ao longo do tempo durante e após a chuva. Ele sobe até o pico (ramo de ascensão), passa pelo máximo e desce (recessão). A área sob a curva é o volume total escoado. Para a mesma chuva, a urbanização sobe e adianta o pico e estreita o hidrograma: a água chega toda junta e cedo." },
        { tipo: "texto", texto: "O conceito de hidrograma unitário permite montar a resposta da bacia a uma chuva qualquer. Você não precisa dominar a modelagem para ler a bacia, mas precisa entender a figura: comparar o hidrograma pré e pós-urbanização é a forma mais direta de mostrar, em um gráfico, por que a cidade alaga e quanto um reservatório de amortecimento ajudaria." },
        {
          tipo: "prancha",
          titulo: "Hidrograma: natural x urbanizado",
          desenho: {
            legenda: "O urbanizado tem pico mais alto e mais cedo; o natural e mais baixo e espalhado.",
            primitivas: [
              { t: "linha", de: [35, 25], ate: [35, 170], cor: "tinta" },
              { t: "linha", de: [35, 170], ate: [285, 170], cor: "tinta" },
              { t: "rotulo", p: [4, 24], texto: "Q" },
              { t: "rotulo", p: [240, 182], texto: "tempo" },
              { t: "curva", pts: [[45, 168], [80, 60], [110, 90], [170, 150], [250, 168]], cor: "destaque" },
              { t: "curva", pts: [[45, 168], [110, 120], [160, 110], [220, 140], [280, 165]], cor: "tinta" },
              { t: "rotulo", p: [70, 50], texto: "Urbanizado" },
              { t: "rotulo", p: [170, 100], texto: "Natural" },
            ],
          },
        },
        {
          tipo: "licao",
          pergunta: "Comparado ao natural, o hidrograma de uma bacia urbanizada costuma ter pico:",
          alternativas: ["Mais baixo e mais tarde", "Mais alto e mais cedo", "Idêntico"],
          correta: 1,
          explicacao: "A impermeabilização acelera o escoamento: o pico fica mais alto e ocorre mais cedo, e o hidrograma se estreita. É a assinatura hidrológica da urbanização.",
        },
      ],
    },
    {
      id: "balanco-hidrico",
      titulo: "Balanço hídrico: onde a água entra e sai",
      blocos: [
        { tipo: "texto", texto: "O balanço hídrico fecha a conta da bacia: tudo o que entra como chuva (P) tem que sair como escoamento (Q), evapotranspiração (ET), infiltração/recarga (I) e variação de armazenamento. Numa escala de tempo longa, P = Q + ET + I, aproximadamente. Esse balanço mostra quanto da chuva vira água de rio, quanto volta à atmosfera e quanto recarrega o lençol." },
        { tipo: "texto", texto: "A leitura prática: ao impermeabilizar, a parcela Q cresce às custas de ET e I. Isso explica dois sintomas opostos da bacia urbana ao mesmo tempo: mais enchente na chuva (Q sobe) e córrego mais seco na estiagem (I cai, falta água subterrânea para alimentar o rio). Devolver infiltração à bacia ataca os dois de uma vez." },
        {
          tipo: "diagrama",
          titulo: "Balanço hídrico simplificado",
          codigo: `flowchart TD
  P["Chuva P"] --> Q["Escoamento Q"]
  P --> ET["Evapotranspiracao ET"]
  P --> I["Infiltracao / recarga I"]
  Q --> R["Rio / galeria"]
  I --> L["Lencol freatico"]
  L --> R` },
        {
          tipo: "licao",
          pergunta: "Impermeabilizar a bacia tende a produzir, ao mesmo tempo:",
          alternativas: [
            "Menos enchente e mais água no lençol",
            "Mais enchente na chuva e córrego mais seco na estiagem",
            "Nenhum efeito sobre o regime do rio",
          ],
          correta: 1,
          explicacao: "Ao aumentar o escoamento (Q) e reduzir a infiltração (I), a cidade gera picos de cheia maiores e, por falta de recarga, vazões mínimas menores na estiagem.",
        },
      ],
    },
    {
      id: "medir-vazao-flutuador",
      titulo: "Medir vazão em campo: método do flutuador",
      blocos: [
        { tipo: "texto", texto: "Vazão é volume por tempo (m³/s). O método mais simples mede a velocidade com um flutuador e a área da seção. Escolha um trecho reto e uniforme, marque uma distância L (ex.: 10 m), solte um objeto que flutua e cronometra o tempo t para percorrer L; a velocidade superficial é L/t. Multiplique por um fator de 0,8 a 0,9 (a velocidade média é menor que a da superfície). A vazão é Q = velocidade média x área da seção." },
        { tipo: "texto", texto: "A área da seção sai medindo a largura e a profundidade em vários pontos (seção dividida em faixas). Repita a medição três vezes e use a média. É um método de baixa precisão, mas honesto e replicável, ótimo para acompanhar tendência e para checar ordens de grandeza do cálculo. Faça sempre em segurança: nunca entre em córrego urbano em cheia." },
        {
          tipo: "prancha",
          titulo: "Flutuador: velocidade e seção",
          desenho: {
            legenda: "Velocidade = L/t x fator; area da secao por faixas de largura e profundidade.",
            primitivas: [
              { t: "linha", de: [30, 60], ate: [280, 60], cor: "suave" },
              { t: "linha", de: [30, 60], ate: [30, 75], cor: "tinta" },
              { t: "linha", de: [230, 60], ate: [230, 75], cor: "tinta" },
              { t: "rotulo", p: [110, 50], texto: "L (distancia)" },
              { t: "circulo", c: [70, 67], r: 5, cor: "destaque" },
              { t: "seta", de: [70, 67], ate: [120, 67], cor: "destaque" },
              { t: "curva", pts: [[30, 110], [80, 150], [150, 160], [220, 150], [280, 110]], cor: "tinta" },
              { t: "linha", de: [80, 118], ate: [80, 152], cor: "suave" },
              { t: "linha", de: [150, 118], ate: [150, 160], cor: "suave" },
              { t: "linha", de: [220, 118], ate: [220, 150], cor: "suave" },
              { t: "rotulo", p: [120, 178], texto: "Secao por faixas" },
            ],
          },
        },
        {
          tipo: "tarefas",
          itens: [
            { id: "t-flutuador", titulo: "Meça a vazão de um córrego pelo método do flutuador", entrega: "Velocidade, área da seção e Q em m³/s, com as três repetições anotadas." },
          ],
        },
      ],
    },
    {
      id: "medir-vazao-vertedouro",
      titulo: "Vazão com mais precisão: vertedouro e seção-velocidade",
      blocos: [
        { tipo: "texto", texto: "Para pequenos cursos, um vertedouro (soleira em V ou retangular) transforma nível em vazão por fórmula conhecida. No vertedouro triangular de 90 graus, Q depende da altura da lâmina sobre a soleira (H) por Q = 1,4 x H^2,5 (Q em m³/s, H em m). Basta ler a altura para ter a vazão, o que facilita o monitoramento contínuo. É montável com material simples num córrego de cabeceira." },
        { tipo: "texto", texto: "O método seção-velocidade com molinete (ou sensor acústico) é o padrão profissional: mede a velocidade em várias verticais e profundidades e integra. É mais preciso e mais caro. Para a maioria dos projetos de cidadão, flutuador e vertedouro dão o bastante; a medição profissional entra quando o dado vai para laudo ou outorga." },
        {
          tipo: "licao",
          pergunta: "Qual a vantagem de um vertedouro para monitorar vazão?",
          alternativas: [
            "Dispensa qualquer medição",
            "Converte a leitura de uma única altura (H) em vazão por fórmula",
            "Só funciona em rios grandes",
          ],
          correta: 1,
          explicacao: "O vertedouro cria uma relação fixa entre a altura da lâmina sobre a soleira e a vazão; medir só o nível já dá a vazão, ideal para acompanhamento contínuo em pequenos cursos.",
        },
        {
          tipo: "diagrama",
          titulo: "Três formas de medir vazão",
          codigo: `flowchart TD
  A["Medir vazao"] --> B["Flutuador: barato, baixa precisao"]
  A --> C["Vertedouro: nivel vira vazao"]
  A --> D["Molinete / acustico: padrao profissional"]` },
      ],
    },
    {
      id: "curva-chave",
      titulo: "Curva-chave: do nível à vazão, automaticamente",
      blocos: [
        { tipo: "texto", texto: "Medir vazão a cada evento é inviável; medir nível é fácil e barato (régua linimétrica ou sensor de pressão). A curva-chave é a relação entre nível e vazão de uma seção: construída com várias medições de vazão em diferentes níveis, ela permite transformar o nível registrado continuamente em série de vazão. É assim que as estações da ANA geram as séries do HidroWeb." },
        { tipo: "texto", texto: "Para uma estação própria, instale uma régua e um registrador de nível (data logger de pressão) e levante vazões em níveis variados ao longo de meses. A curva-chave precisa ser revista: cheias mudam a seção (assoreamento, erosão) e deslocam a relação. Esse é um ponto em que um profissional de hidrometria agrega muito, especialmente se o dado for usado oficialmente." },
        {
          tipo: "mobilizacao",
          papel: "Técnico ou engenheiro de hidrometria (recursos hídricos)",
          porque: "Construir e validar uma curva-chave confiável exige medições de vazão com molinete/ADCP em vários níveis e tratamento estatístico que sustente uso oficial (outorga, laudo, enquadramento).",
          entregaEsperada: "Curva-chave da seção com medições de calibração, faixa de validade e relatório assinado, pronta para converter a série de nível em série de vazão.",
          gerenciadoPor: "zaeon",
        },
        {
          tipo: "prancha",
          titulo: "Curva-chave: nível x vazão",
          desenho: {
            legenda: "Cada ponto e uma medicao de vazao num nivel; a curva ajustada converte nivel em vazao.",
            primitivas: [
              { t: "linha", de: [35, 25], ate: [35, 170], cor: "tinta" },
              { t: "linha", de: [35, 170], ate: [285, 170], cor: "tinta" },
              { t: "rotulo", p: [4, 24], texto: "Nivel" },
              { t: "rotulo", p: [230, 182], texto: "Vazao" },
              { t: "curva", pts: [[45, 160], [90, 130], [150, 90], [220, 55], [275, 40]], cor: "destaque" },
              { t: "circulo", c: [90, 130], r: 3, cor: "tinta" },
              { t: "circulo", c: [150, 90], r: 3, cor: "tinta" },
              { t: "circulo", c: [220, 55], r: 3, cor: "tinta" },
            ],
          },
        },
      ],
    },
    {
      id: "infiltracao-teste",
      titulo: "Testar a infiltração do solo",
      blocos: [
        { tipo: "texto", texto: "Quanto o solo da bacia ainda infiltra decide se um jardim de chuva ou um poço de infiltração vai funcionar. O teste do anel (ou do furo) mede a taxa de infiltração: satura-se o solo, enche-se de água e cronometra-se a queda do nível em um furo ou anel de dimensão conhecida. O resultado (mm/h ou cm/h) classifica o solo de rápido a lento e orienta o dimensionamento." },
        { tipo: "texto", texto: "Faça o teste em vários pontos: a infiltração varia muito dentro da mesma bacia, por causa de compactação, entulho enterrado e lençol alto. Em área urbana, desconfie de solo compactado e de contaminação; se for projetar infiltração para muita água, confirme com sondagem e profissional. O teste simples serve de triagem; a decisão de obra pede dado geotécnico." },
        {
          tipo: "tarefas",
          itens: [
            { id: "t-infil", titulo: "Faça um teste de infiltração em dois pontos da bacia", entrega: "Taxa de infiltração (mm/h) em cada ponto e a classificação do solo." },
          ],
        },
        {
          tipo: "licao",
          pergunta: "Por que testar a infiltração em vários pontos da bacia?",
          alternativas: [
            "Para gastar mais tempo",
            "Porque a infiltração varia muito no urbano (compactação, entulho, lençol)",
            "Porque o solo é sempre igual",
          ],
          correta: 1,
          explicacao: "No ambiente urbano a infiltração muda bastante ponto a ponto, por compactação, aterro e lençol freático raso. Vários testes evitam dimensionar uma obra com base num ponto atípico.",
        },
      ],
    },
    {
      id: "fontes-calculo",
      titulo: "Fontes: cálculo e medição",
      blocos: [
        { tipo: "texto", texto: "A hidrologia de projeto se apoia em métodos consolidados e em dados oficiais de chuva e vazão. Reúna estes endereços antes de dimensionar." },
        { tipo: "fontes", titulo: "Métodos e dados hidrológicos", itens: [
          { titulo: "USDA NRCS — TR-55, Urban Hydrology for Small Watersheds (SCS-CN, 1986)", url: "https://www.hydrocad.net/pdf/TR-55%20Manual.pdf", tipo: "norma", nota: "Documento oficial (PDF) do Curve Number e do cálculo de escoamento urbano." },
          { titulo: "ANA — HidroWeb (séries de nível, vazão e chuva)", url: "https://www.snirh.gov.br/hidroweb/apresentacao", tipo: "dataset", nota: "Dados observados para calibrar e conferir estimativas." },
          { titulo: "INMET — BDMEP (precipitação histórica)", url: "https://bdmep.inmet.gov.br/", tipo: "dataset", nota: "Séries de chuva para montar ou validar curvas IDF." },
        ] },
        {
          tipo: "licao",
          pergunta: "O que a curva-chave de uma seção permite fazer?",
          alternativas: [
            "Transformar a série de nível medido em série de vazão",
            "Medir a chuva diretamente",
            "Delimitar a bacia",
          ],
          correta: 0,
          explicacao: "A curva-chave relaciona nível e vazão de uma seção. Com ela, basta registrar o nível (barato e contínuo) para obter a vazão ao longo do tempo.",
        },
      ],
    },
    // ===================== CAPÍTULO 5 — PROJETO =====================
    {
      id: "diagnostico-integrado",
      titulo: "Fechar o diagnóstico da bacia",
      blocos: [
        { tipo: "texto", texto: "Antes de projetar, consolide o que você levantou em um diagnóstico de uma página: área e forma da bacia, uso do solo e taxa impermeável, tempo de concentração, vazão de pico para um T de referência, pontos de alagamento e suas causas, trechos de várzea ocupada, nascentes e lançamentos. O diagnóstico aponta onde a bacia sofre e por quê; é ele que orienta a escolha das soluções." },
        { tipo: "texto", texto: "Transforme problemas em metas mensuráveis: reduzir a vazão de pico no ponto X em tanto por cento, reabrir tal trecho de várzea, infiltrar tal volume por evento. Meta sem número não se verifica. A partir daqui, cada solução é escolhida pelo quanto contribui para uma meta, não por moda." },
        {
          tipo: "diagrama",
          titulo: "Do diagnóstico às metas",
          codigo: `flowchart LR
  A["Dados da bacia"] --> B["Diagnostico: onde e por que sofre"]
  B --> C["Metas com numero"]
  C --> D["Escolha de solucoes"]
  D --> E["Projeto e monitoramento"]` },
        {
          tipo: "tarefas",
          itens: [
            { id: "t-diag", titulo: "Escreva o diagnóstico de uma página da sua bacia", entrega: "Uma folha com os parâmetros-chave, três problemas e três metas numéricas." },
          ],
        },
      ],
    },
    {
      id: "solucoes-baseadas-natureza",
      titulo: "Soluções baseadas na natureza e drenagem sustentável",
      blocos: [
        { tipo: "texto", texto: "A drenagem tradicional canaliza e manda a água embora o mais rápido possível, empurrando o problema para jusante. A abordagem atual, chamada de drenagem urbana sustentável (SuDS), infraestrutura verde ou soluções baseadas na natureza, faz o oposto: retém, infiltra e atrasa a água perto de onde ela cai. O princípio é devolver à bacia parte da capacidade de absorção que a cidade tirou." },
        { tipo: "texto", texto: "Essas soluções trabalham em conjunto, distribuídas pela bacia: jardins de chuva e biovaletas na fonte, pavimentos permeáveis nas superfícies, reservatórios de detenção nos pontos estratégicos e renaturalização nos fundos de vale. Nenhuma sozinha resolve; somadas, recortam o pico de cheia e melhoram a qualidade da água. É a cidade-esponja." },
        {
          tipo: "prancha",
          titulo: "Soluções distribuídas na bacia",
          desenho: {
            legenda: "Da cabeceira ao exutorio: reter e infiltrar na fonte, amortecer no meio, renaturalizar embaixo.",
            primitivas: [
              { t: "curva", pts: [[150, 30], [150, 90], [150, 150], [150, 178]], cor: "tinta" },
              { t: "circulo", c: [90, 55], r: 10, cor: "destaque" },
              { t: "rotulo", p: [40, 52], texto: "Jardim chuva" },
              { t: "retangulo", p: [195, 45], w: 30, h: 18, cor: "suave" },
              { t: "rotulo", p: [195, 38], texto: "Pav. permeavel" },
              { t: "retangulo", p: [100, 110], w: 40, h: 22, hachura: true },
              { t: "rotulo", p: [60, 135], texto: "Detencao" },
              { t: "curva", pts: [[150, 150], [170, 160], [150, 170]], cor: "suave" },
              { t: "rotulo", p: [180, 165], texto: "Renaturalizar" },
            ],
          },
        },
        {
          tipo: "licao",
          pergunta: "Qual é o princípio da drenagem urbana sustentável (SuDS)?",
          alternativas: [
            "Canalizar e mandar a água embora o mais rápido possível",
            "Reter, infiltrar e atrasar a água perto de onde ela cai",
            "Impermeabilizar mais para a água escoar rápido",
          ],
          correta: 1,
          explicacao: "A drenagem sustentável busca reter, infiltrar e retardar o escoamento na fonte, recuperando parte da capacidade de absorção da bacia, em vez de só acelerar a saída da água.",
        },
      ],
    },
    {
      id: "jardim-de-chuva",
      titulo: "Jardim de chuva: reter e infiltrar na fonte",
      blocos: [
        { tipo: "texto", texto: "Jardim de chuva é uma depressão vegetada que recebe a água de telhados e pisos, segura por alguns minutos e deixa infiltrar. É uma das soluções de melhor custo-benefício na fonte: pequeno, barato e replicável quarteirão a quarteirão. Dimensiona-se pela área contribuinte e pela taxa de infiltração medida (capítulo anterior): a superfície do jardim costuma ficar entre 5% e 10% da área impermeável que drena para ele." },
        { tipo: "texto", texto: "Camadas típicas: vegetação adaptada a encharcar e secar, solo preparado, camada de brita e um extravasor para o excedente. Perto de edificação, cuide do afastamento e da impermeabilização lateral para a água não ir para a fundação. Onde a infiltração é ruim, o jardim vira de biorretenção com dreno, priorizando qualidade e atraso em vez de infiltração total." },
        {
          tipo: "prancha",
          titulo: "Corte de um jardim de chuva",
          desenho: {
            legenda: "Entrada da agua, depressao vegetada, solo e brita; extravasor para o excedente.",
            primitivas: [
              { t: "seta", de: [30, 50], ate: [80, 75], cor: "destaque" },
              { t: "rotulo", p: [20, 44], texto: "Entrada" },
              { t: "curva", pts: [[80, 78], [120, 100], [180, 100], [220, 78]], cor: "tinta" },
              { t: "retangulo", p: [80, 100], w: 140, h: 25, cor: "suave" },
              { t: "rotulo", p: [110, 116], texto: "Solo preparado" },
              { t: "retangulo", p: [80, 125], w: 140, h: 25, hachura: true },
              { t: "rotulo", p: [128, 142], texto: "Brita" },
              { t: "seta", de: [220, 85], ate: [255, 85], cor: "suave" },
              { t: "rotulo", p: [228, 72], texto: "Extravasor" },
            ],
          },
        },
        {
          tipo: "tarefas",
          itens: [
            { id: "t-jardim", titulo: "Pré-dimensione um jardim de chuva para um telhado real", entrega: "Área do telhado, taxa de infiltração usada e a área proposta do jardim." },
          ],
        },
      ],
    },
    {
      id: "biovaleta",
      titulo: "Biovaleta: conduzir infiltrando",
      blocos: [
        { tipo: "texto", texto: "Biovaleta (swale) é um canal raso e vegetado que conduz a água ao longo de uma via ou terreno enquanto infiltra e filtra parte dela. Substitui a sarjeta de concreto por uma faixa verde com pequena declividade longitudinal. Ao reduzir a velocidade e permitir infiltração ao longo do percurso, atrasa a chegada da água à galeria e retém sedimento e poluentes difusos." },
        { tipo: "texto", texto: "É ideal em canteiros centrais, laterais de rua e estacionamentos. A declividade longitudinal fica baixa (tipicamente 1% a 4%); se for maior, usam-se pequenas barreiras para frear o fluxo. Combina muito bem com jardins de chuva: a biovaleta coleta e conduz, os jardins retêm e infiltram nos pontos. Juntos, formam uma rede verde paralela à cinza." },
        {
          tipo: "diagrama",
          titulo: "Biovaleta no sistema da rua",
          codigo: `flowchart LR
  A["Chuva na via"] --> B["Biovaleta vegetada"]
  B --> C["Infiltra e filtra parte"]
  B --> D["Conduz devagar o excedente"]
  D --> E["Jardim de chuva ou galeria"]` },
        {
          tipo: "licao",
          pergunta: "O que diferencia uma biovaleta de uma sarjeta de concreto comum?",
          alternativas: [
            "A biovaleta conduz mais rápido e impermeabiliza",
            "A biovaleta é vegetada: infiltra, filtra e atrasa o escoamento enquanto conduz",
            "Não há diferença de função",
          ],
          correta: 1,
          explicacao: "A biovaleta é um canal vegetado que, além de conduzir, reduz a velocidade, infiltra parte da água e retém poluentes, ao contrário da sarjeta de concreto, que só escoa rápido.",
        },
      ],
    },
    {
      id: "pavimento-permeavel",
      titulo: "Pavimento permeável: deixar a superfície respirar",
      blocos: [
        { tipo: "texto", texto: "Pavimento permeável permite a água atravessar a superfície e ser armazenada ou infiltrada em uma base de brita, em vez de escorrer pela superfície. Há vários tipos: concreto poroso, asfalto poroso, blocos vazados com grama e pisos intertravados com juntas abertas. Aplicável em estacionamentos, calçadas, praças e vias de baixo tráfego, reduz o escoamento na própria superfície onde a chuva cai." },
        { tipo: "texto", texto: "O ponto fraco é a manutenção: os poros entopem com sedimento e perdem permeabilidade se não forem limpos (aspiração/varrição periódica). Por isso o pavimento permeável funciona melhor onde o aporte de sedimento é baixo e há rotina de limpeza. Nunca o use sobre solo contaminado sem avaliar o risco de levar poluente ao lençol." },
        {
          tipo: "prancha",
          titulo: "Camadas de um pavimento permeável",
          desenho: {
            legenda: "A agua atravessa a superficie porosa e e armazenada na base de brita antes de infiltrar.",
            primitivas: [
              { t: "retangulo", p: [40, 40], w: 220, h: 22, hachura: true },
              { t: "rotulo", p: [95, 34], texto: "Superficie porosa" },
              { t: "retangulo", p: [40, 62], w: 220, h: 20, cor: "suave" },
              { t: "rotulo", p: [120, 77], texto: "Assentamento" },
              { t: "retangulo", p: [40, 82], w: 220, h: 45, cor: "tinta" },
              { t: "rotulo", p: [110, 108], texto: "Base de brita (reservatorio)" },
              { t: "seta", de: [150, 127], ate: [150, 150], cor: "destaque" },
              { t: "rotulo", p: [120, 162], texto: "Infiltra no solo" },
            ],
          },
        },
        {
          tipo: "licao",
          pergunta: "Qual é o principal cuidado de manutenção de um pavimento permeável?",
          alternativas: [
            "Pintá-lo todo ano",
            "Limpar os poros, que entopem com sedimento e perdem permeabilidade",
            "Molhá-lo com frequência",
          ],
          correta: 1,
          explicacao: "Os vazios do pavimento permeável colmatam com sedimento ao longo do tempo. Sem limpeza periódica (varrição/aspiração), ele perde a capacidade de infiltrar e passa a escoar como um pavimento comum.",
        },
      ],
    },
    {
      id: "reservatorio-deteccao",
      titulo: "Reservatório de detenção: amortecer o pico",
      blocos: [
        { tipo: "texto", texto: "Quando a área contribuinte já é grande, a solução é um reservatório de detenção (o popular piscinão) ou de retenção: um volume que recebe a cheia, segura temporariamente e libera devagar, por um descarregador controlado. Ele não reduz o volume total, mas corta o pico: o hidrograma de saída fica mais baixo e espalhado que o de entrada. Detenção esvazia entre chuvas; retenção mantém uma lâmina permanente." },
        { tipo: "texto", texto: "Dimensiona-se pela diferença entre o volume que entra e o que a jusante aguenta receber, para o T de projeto. É obra de engenharia com segurança, estabilidade e operação: um reservatório mal projetado ou sem manutenção vira risco. Por isso o dimensionamento definitivo e a responsabilidade técnica são de engenheiro habilitado, com ART." },
        {
          tipo: "mobilizacao",
          papel: "Engenheiro civil/hídrico responsável pelo projeto de drenagem (com ART no CREA)",
          porque: "O dimensionamento, a estabilidade, o descarregador e a segurança de um reservatório de detenção têm responsabilidade técnica legal e exigem projeto assinado; erro aqui coloca vidas e patrimônio em risco a jusante.",
          entregaEsperada: "Projeto do reservatório (volume, descarregador, extravasor, segurança e plano de manutenção) com ART emitida e memorial de cálculo.",
          gerenciadoPor: "zaeon",
        },
        {
          tipo: "prancha",
          titulo: "Detenção corta o pico do hidrograma",
          desenho: {
            legenda: "A saida (linha cheia) e mais baixa e espalhada que a entrada (tracejada): o pico foi amortecido.",
            primitivas: [
              { t: "linha", de: [35, 25], ate: [35, 170], cor: "tinta" },
              { t: "linha", de: [35, 170], ate: [285, 170], cor: "tinta" },
              { t: "rotulo", p: [4, 24], texto: "Q" },
              { t: "rotulo", p: [240, 182], texto: "tempo" },
              { t: "curva", pts: [[45, 168], [85, 50], [120, 90], [200, 160], [280, 168]], cor: "suave" },
              { t: "curva", pts: [[45, 168], [110, 110], [160, 105], [230, 140], [280, 165]], cor: "destaque" },
              { t: "rotulo", p: [70, 44], texto: "Entrada" },
              { t: "rotulo", p: [160, 95], texto: "Saida" },
            ],
          },
        },
      ],
    },
    {
      id: "micro-macrodrenagem",
      titulo: "Microdrenagem e macrodrenagem: dois níveis",
      blocos: [
        { tipo: "texto", texto: "A drenagem urbana trabalha em dois níveis. Microdrenagem: o sistema de perto, que coleta a chuva da rua (sarjetas, bocas de lobo, galerias de pequeno porte), dimensionado para chuvas frequentes (T de 2 a 10 anos). Macrodrenagem: o sistema de longe, que conduz e amortece as grandes cheias (canais, córregos, reservatórios), dimensionado para chuvas raras (T de 25, 50 ou 100 anos)." },
        { tipo: "texto", texto: "Os dois precisam conversar. De nada adianta microdrenagem eficiente despejando tudo numa macrodrenagem estrangulada: o problema só muda de lugar. A leitura de bacia expõe esse descompasso, mostrando onde a água coletada rápido encontra um gargalo a jusante. Projetar é equilibrar coleta, condução e amortecimento ao longo de toda a bacia." },
        {
          tipo: "diagrama",
          titulo: "Microdrenagem e macrodrenagem",
          codigo: `flowchart TD
  A["Chuva na rua"] --> B["Microdrenagem: boca de lobo, galeria"]
  B --> C["Macrodrenagem: canal, corrego, reservatorio"]
  C --> D["Exutorio da bacia"]
  B -.-> E["Se a macro esta estrangulada, alaga a jusante"]` },
        {
          tipo: "licao",
          pergunta: "Qual a diferença entre micro e macrodrenagem?",
          alternativas: [
            "Micro coleta a chuva local (T baixo); macro conduz e amortece grandes cheias (T alto)",
            "São sinônimos",
            "Macro é só para zona rural",
          ],
          correta: 0,
          explicacao: "A microdrenagem coleta a chuva da rua para chuvas frequentes; a macrodrenagem conduz e amortece as cheias raras na escala da bacia. Os dois níveis precisam estar equilibrados.",
        },
      ],
    },
    {
      id: "renaturalizacao",
      titulo: "Renaturalização: reabrir e devolver o rio",
      blocos: [
        { tipo: "texto", texto: "Renaturalizar é reverter a canalização: reabrir um córrego tamponado (daylighting), recompor margens com vegetação, devolver sinuosidade e reconectar a várzea. Além de reduzir a velocidade e ampliar o espaço de cheia, recupera habitat, qualidade da água e paisagem. É a solução mais ambiciosa e, onde cabe, a de maior retorno social e ambiental." },
        { tipo: "texto", texto: "Nem todo trecho comporta renaturalização completa; muitas vezes o possível é um parque linear que combina via, área inundável e trecho de rio aberto. O essencial é inverter a lógica: dar espaço ao rio em vez de espremê-lo. Projetos de referência mundial (como a reabertura do Cheonggyecheon em Seul) mostram o efeito em cidade densa." },
        {
          tipo: "prancha",
          titulo: "De canal de concreto a córrego renaturalizado",
          desenho: {
            legenda: "Antes: canal reto e estreito. Depois: leito sinuoso, margens vegetadas e varzea.",
            primitivas: [
              { t: "retangulo", p: [30, 40], w: 100, h: 50, cor: "suave" },
              { t: "linha", de: [40, 45], ate: [40, 85], cor: "tinta" },
              { t: "linha", de: [120, 45], ate: [120, 85], cor: "tinta" },
              { t: "rotulo", p: [45, 105], texto: "Antes: canal" },
              { t: "seta", de: [140, 65], ate: [175, 65], cor: "destaque" },
              { t: "curva", pts: [[195, 45], [220, 70], [205, 95], [235, 115]], cor: "tinta" },
              { t: "curva", pts: [[185, 55], [210, 72]], cor: "suave" },
              { t: "curva", pts: [[255, 55], [218, 80]], cor: "suave" },
              { t: "rotulo", p: [195, 135], texto: "Depois: renaturalizado" },
            ],
          },
        },
        {
          tipo: "licao",
          pergunta: "O que é daylighting de um córrego urbano?",
          alternativas: [
            "Iluminar o córrego à noite",
            "Reabrir um curso d'água que estava tamponado/enterrado",
            "Canalizar o córrego em concreto",
          ],
          correta: 1,
          explicacao: "Daylighting é reabrir à superfície um curso d'água antes tamponado ou canalizado, devolvendo espaço de cheia, habitat e paisagem.",
        },
      ],
    },
    {
      id: "plano-de-monitoramento",
      titulo: "Projetar o plano de monitoramento",
      blocos: [
        { tipo: "texto", texto: "Projeto bom nasce com monitoramento. Defina antes da obra: o que medir (nível, vazão, chuva, e se for o caso qualidade), onde (pontos a montante e a jusante da intervenção, mais um ponto de controle), com que frequência (contínuo para nível, campanhas para o resto) e por quanto tempo. Sem linha de base antes da obra, não há como provar o efeito depois." },
        { tipo: "texto", texto: "O plano vira uma tabela simples: ponto, variável, método, frequência, responsável. Inclua metas (os números do diagnóstico) e gatilhos de alerta. Esse é o instrumento que transforma a bacia em um experimento acompanhado: cada chuva passa a ser um dado que confirma ou corrige o projeto." },
        {
          tipo: "tarefas",
          itens: [
            { id: "t-plano-mon", titulo: "Monte o plano de monitoramento da sua intervenção", entrega: "Tabela com pontos, variáveis, métodos, frequência e responsáveis, incluindo a linha de base." },
          ],
        },
        {
          tipo: "diagrama",
          titulo: "Monitorar antes e depois",
          codigo: `flowchart LR
  A["Linha de base (antes)"] --> B["Obra"]
  B --> C["Monitoramento (depois)"]
  A --> D["Comparar: a meta foi atingida?"]
  C --> D` },
      ],
    },
    {
      id: "fontes-projeto",
      titulo: "Fontes: projeto e drenagem sustentável",
      blocos: [
        { tipo: "texto", texto: "As soluções de drenagem sustentável e de infraestrutura verde têm manuais e normas de referência. Reúna estes endereços ao projetar." },
        { tipo: "fontes", titulo: "Drenagem sustentável e normas", itens: [
          { titulo: "ABNT NBR 15527 — Aproveitamento de água de chuva de coberturas", url: "https://www.abntcatalogo.com.br/", tipo: "norma", nota: "Referência para captação e uso de água de chuva (reduz escoamento na fonte)." },
          { titulo: "ANA — Agência Nacional de Águas e Saneamento Básico", url: "https://www.gov.br/ana/pt-br", tipo: "site", nota: "Planos, manuais e diretrizes de recursos hídricos e drenagem." },
          { titulo: "US EPA — Green Infrastructure", url: "https://www.epa.gov/green-infrastructure", tipo: "site", nota: "Guias técnicos de jardins de chuva, biovaletas, pavimento permeável e detenção." },
        ] },
        {
          tipo: "licao",
          pergunta: "Por que estabelecer uma linha de base antes de uma obra de drenagem?",
          alternativas: [
            "Para atrasar a obra",
            "Para poder provar, com dado, o efeito da intervenção depois",
            "A linha de base não serve para nada",
          ],
          correta: 1,
          explicacao: "Sem medir a bacia antes da intervenção, não há com o que comparar depois. A linha de base é o que permite demonstrar, com número, se a meta foi atingida.",
        },
      ],
    },
    // ===================== CAPÍTULO 6 — EXECUÇÃO =====================
    {
      id: "mobilizacao-equipe",
      titulo: "Montar a equipe e os papéis",
      blocos: [
        { tipo: "texto", texto: "Ler e cuidar de uma bacia é trabalho coletivo. Separe o que você faz sozinho (observar, mapear com SIG, medir vazão por flutuador, registrar) do que exige profissional habilitado (levantamento topográfico, projeto de obra com ART, análise de laboratório, operação de reservatório). Reconhecer esse limite não é fraqueza: é o que mantém o trabalho seguro e com valor legal quando precisar." },
        { tipo: "texto", texto: "Defina papéis claros: quem coordena, quem vai a campo, quem cuida dos dados, quem fala com a prefeitura e o comitê. Para coletivos, uma escala simples evita que tudo dependa de uma pessoa. Quando a etapa pedir um especialista, o caderno aponta uma mobilização: o campo abre a vaga e a Zaeon acompanha até a entrega." },
        {
          tipo: "diagrama",
          titulo: "Quem faz o quê",
          codigo: `flowchart TD
  A["Trabalho da bacia"] --> B["Cidadao: observar, mapear, medir simples, registrar"]
  A --> C["Profissional: topografia, projeto com ART, laboratorio"]
  B --> D["Dados e diagnostico"]
  C --> D
  D --> E["Decisao com prefeitura e comite"]` },
        {
          tipo: "licao",
          pergunta: "Qual tarefa, na leitura de bacia, normalmente NÃO exige profissional habilitado?",
          alternativas: [
            "Projeto de reservatório de detenção com ART",
            "Observar, mapear no SIG e medir vazão por flutuador",
            "Levantamento topográfico oficial",
          ],
          correta: 1,
          explicacao: "Observação, mapeamento em SIG e medições simples (flutuador) são acessíveis ao cidadão. Projeto de obra com ART, topografia oficial e laboratório exigem profissional habilitado.",
        },
      ],
    },
    {
      id: "licenciamento",
      titulo: "Licenças, outorga e responsabilidade técnica",
      blocos: [
        { tipo: "texto", texto: "Intervir num curso d'água esbarra em exigências legais. Intervenção em APP, obra em córrego, captação ou lançamento de água e canalização costumam exigir licença ambiental do órgão competente e, no caso de uso da água, outorga de direito de uso (prevista na Lei 9.433/1997). Obras de engenharia exigem responsável técnico com Anotação de Responsabilidade Técnica (ART) no CREA ou RRT no CAU." },
        { tipo: "texto", texto: "Medir e observar não precisam de licença; projetar e construir, sim. Não pule essa etapa: obra irregular em bacia urbana costuma ser embargada e pode agravar o risco. O caminho é levantar as exigências cedo, com o órgão ambiental e a prefeitura, e mobilizar o profissional que assina. Melhor descobrir a exigência no planejamento do que na fiscalização." },
        {
          tipo: "mobilizacao",
          papel: "Responsável técnico para licenciamento e outorga (engenheiro/arquiteto com ART/RRT) e órgão ambiental",
          porque: "Intervenção em APP ou em curso d'água, captação e lançamento exigem licença ambiental, outorga de uso da água e responsabilidade técnica legal; sem isso a obra é irregular e pode ser embargada.",
          entregaEsperada: "Lista de licenças e outorgas aplicáveis, protocolo junto ao órgão ambiental e ART/RRT emitida para o projeto.",
          gerenciadoPor: "zaeon",
        },
        {
          tipo: "licao",
          pergunta: "Captar água de um córrego para uso regular geralmente exige:",
          alternativas: [
            "Nada, é livre em qualquer quantidade",
            "Outorga de direito de uso da água, prevista na Política Nacional de Recursos Hídricos",
            "Apenas avisar os vizinhos",
          ],
          correta: 1,
          explicacao: "A Lei 9.433/1997 prevê a outorga de direito de uso dos recursos hídricos para captações e lançamentos relevantes, instrumento que ordena o uso da água na bacia.",
        },
      ],
    },
    {
      id: "campanha-de-campo",
      titulo: "A campanha de campo: logística e segurança",
      blocos: [
        { tipo: "texto", texto: "Uma campanha de campo bem planejada rende o dobro. Antes de sair: defina os pontos no mapa e a ordem de visita (da parte alta para a baixa), confira equipamento (trena, GPS/celular, régua, cronômetro, fichas, câmera, luvas), veja a previsão do tempo e avise alguém da rota. Em bacia urbana, muitos pontos ficam em vias movimentadas: planeje acesso e estacionamento." },
        { tipo: "texto", texto: "Segurança é inegociável. Nunca entre em córrego urbano durante ou logo após chuva: a subida é rápida e a água carrega esgoto e detritos. Use luvas e botas, lave as mãos, evite contato com a água. Trabalhe em dupla. Água urbana é contaminada por padrão: trate toda coleta como material biológico de risco." },
        {
          tipo: "tarefas",
          itens: [
            { id: "t-campanha", titulo: "Planeje uma campanha com 5 pontos", entrega: "Mapa com a ordem de visita, lista de equipamento e um checklist de segurança." },
          ],
        },
        {
          tipo: "diagrama",
          titulo: "Ritmo de uma campanha",
          codigo: `flowchart LR
  A["Planejar pontos e rota"] --> B["Checar equipamento e tempo"]
  B --> C["Campo em dupla, alto para baixo"]
  C --> D["Registrar cada ponto na ficha"]
  D --> E["Descarregar dados no mesmo dia"]` },
      ],
    },
    {
      id: "instalar-regua-sensor",
      titulo: "Instalar régua e sensor de nível",
      blocos: [
        { tipo: "texto", texto: "Para monitorar nível de forma contínua, instale uma régua linimétrica (leitura visual) e, se possível, um sensor de pressão (data logger) que registra sozinho. A régua vai fixada em estrutura firme (pilar de ponte, muro de canal), com o zero referenciado a uma cota conhecida. O sensor fica protegido num tubo perfurado (poço de tranquilização) para não sofrer com a turbulência." },
        { tipo: "texto", texto: "Documente a instalação: foto, coordenada, cota do zero e data. Uma régua sem referência de cota não serve para comparar com outros pontos. Combine a régua com observadores voluntários que leem e registram em horários fixos: é a base da ciência cidadã de nível, barata e robusta. Com a curva-chave, essa série de nível vira série de vazão." },
        {
          tipo: "prancha",
          titulo: "Régua e poço de tranquilização",
          desenho: {
            legenda: "Regua fixada em estrutura firme; sensor dentro de tubo perfurado para leitura estavel.",
            primitivas: [
              { t: "retangulo", p: [60, 30], w: 16, h: 140, cor: "tinta" },
              { t: "linha", de: [60, 55], ate: [76, 55], cor: "suave" },
              { t: "linha", de: [60, 80], ate: [76, 80], cor: "suave" },
              { t: "linha", de: [60, 105], ate: [76, 105], cor: "suave" },
              { t: "linha", de: [60, 130], ate: [76, 130], cor: "suave" },
              { t: "rotulo", p: [30, 24], texto: "Regua" },
              { t: "retangulo", p: [150, 60], w: 20, h: 110, hachura: true },
              { t: "circulo", c: [160, 150], r: 5, cor: "destaque" },
              { t: "rotulo", p: [178, 70], texto: "Tubo perfurado" },
              { t: "rotulo", p: [176, 150], texto: "Sensor" },
              { t: "linha", de: [30, 120], ate: [280, 120], cor: "suave" },
              { t: "rotulo", p: [230, 112], texto: "Lamina d agua" },
            ],
          },
        },
        {
          tipo: "licao",
          pergunta: "Por que a régua linimétrica precisa ter o zero referenciado a uma cota conhecida?",
          alternativas: [
            "Para ficar mais bonita",
            "Para que as leituras possam ser comparadas entre pontos e no tempo",
            "Não precisa de referência",
          ],
          correta: 1,
          explicacao: "Sem uma cota de referência, o nível lido é um número solto. Referenciar o zero permite comparar leituras entre estações e ao longo do tempo e integrá-las ao modelo da bacia.",
        },
      ],
    },
    {
      id: "coleta-segura",
      titulo: "Amostra de água: quando o laboratório entra",
      blocos: [
        { tipo: "texto", texto: "A leitura da bacia pode incluir qualidade da água: medir no local o que é simples (temperatura, pH, condutividade, oxigênio dissolvido, turbidez com disco) e coletar amostra para o que exige laboratório (coliformes, DBO, metais, nutrientes). A coleta tem protocolo: frasco certo, preservação, refrigeração e cadeia de custódia. Amostra mal coletada gera resultado inválido, pior que não medir." },
        { tipo: "texto", texto: "Resultado de laboratório que vira prova (laudo, denúncia, enquadramento) precisa de laboratório acreditado e, muitas vezes, de responsável técnico. Para triagem e educação, kits e sondas simples bastam; para decisão oficial, mobilize o laboratório. Saber a diferença evita tanto o gasto desnecessário quanto a frustração de um dado que não é aceito." },
        {
          tipo: "mobilizacao",
          papel: "Laboratório acreditado (ISO/IEC 17025) para análise de água",
          porque: "Parâmetros como coliformes, DBO, metais e nutrientes exigem análise laboratorial com método acreditado e cadeia de custódia para ter validade legal em laudo, denúncia ou enquadramento.",
          entregaEsperada: "Coleta conforme protocolo, análise acreditada e laudo assinado com os parâmetros solicitados e seus limites de referência.",
          gerenciadoPor: "zaeon",
        },
        {
          tipo: "licao",
          pergunta: "Para um resultado de qualidade da água virar prova legal, normalmente é preciso:",
          alternativas: [
            "Qualquer medição com kit de triagem",
            "Coleta com protocolo e análise em laboratório acreditado",
            "Apenas uma foto da água",
          ],
          correta: 1,
          explicacao: "Decisões oficiais exigem coleta conforme protocolo (preservação, cadeia de custódia) e análise em laboratório acreditado. Kits simples servem para triagem e educação, não para laudo.",
        },
      ],
    },
    {
      id: "registro-e-fotos",
      titulo: "Registrar e fotografar para durar",
      blocos: [
        { tipo: "texto", texto: "O valor do trabalho de campo depende do registro. Padronize a foto: inclua referência de escala (régua, pessoa, objeto conhecido), fotografe sempre do mesmo ângulo nos pontos de monitoramento (fotos comparáveis mês a mês) e anote o número da foto na ficha. Ative a geolocalização da câmera ou registre a coordenada à parte. Uma foto sem contexto é só uma imagem; com ficha, é dado." },
        { tipo: "texto", texto: "Organize o acervo: pasta por ponto, nome de arquivo com data e ponto, planilha mestra ligando foto, ficha e medição. Faça backup em dois lugares. Esse cuidado parece burocracia, mas é o que permite, anos depois, provar uma tendência ou um dano. O registro é a memória da bacia, e memória bem guardada é poder de decisão." },
        {
          tipo: "tarefas",
          itens: [
            { id: "t-fotoponto", titulo: "Crie um ponto de foto fixa e fotografe do mesmo ângulo", entrega: "Duas fotos do mesmo enquadramento em datas diferentes, com escala visível." },
            { id: "t-acervo", titulo: "Monte a planilha mestra do seu acervo", entrega: "Planilha ligando ponto, data, foto, ficha e medição, com backup em dois locais." },
          ],
        },
      ],
    },
    {
      id: "engajamento-comunidade",
      titulo: "Ciência cidadã: a bacia monitorada por muitos",
      blocos: [
        { tipo: "texto", texto: "Uma bacia urbana é grande demais para uma pessoa só monitorar. A ciência cidadã distribui a tarefa: moradores leem réguas, escolas adotam pontos, voluntários fotografam alagamentos em tempo real. Protocolos simples e padronizados garantem que dados de muitas mãos sejam comparáveis. O engajamento também cria pressão política: quem mede, cobra." },
        { tipo: "texto", texto: "Para funcionar, dê retorno a quem participa: mapas atualizados, resultados visíveis, reconhecimento. Programas de monitoramento participativo de rios no Brasil mostram que o dado cidadão, bem estruturado, complementa o oficial e chega onde a rede pública não alcança. A bacia vira causa comum, não planilha de especialista." },
        {
          tipo: "diagrama",
          titulo: "Rede de monitoramento cidadão",
          codigo: `flowchart TD
  A["Protocolo simples e padronizado"] --> B["Moradores leem regua"]
  A --> C["Escolas adotam pontos"]
  A --> D["Voluntarios fotografam alagamento"]
  B --> E["Banco de dados comum da bacia"]
  C --> E
  D --> E
  E --> F["Mapas e retorno a quem participa"]` },
        {
          tipo: "licao",
          pergunta: "O que faz a ciência cidadã de bacias funcionar com qualidade?",
          alternativas: [
            "Cada um medir do seu jeito",
            "Protocolos simples e padronizados, mais retorno a quem participa",
            "Não dar nenhum retorno aos voluntários",
          ],
          correta: 1,
          explicacao: "Protocolos padronizados tornam os dados de muitos comparáveis, e o retorno (mapas, resultados, reconhecimento) sustenta a participação ao longo do tempo.",
        },
      ],
    },
    {
      id: "fontes-execucao",
      titulo: "Fontes: execução e campo",
      blocos: [
        { tipo: "texto", texto: "Execução envolve norma de coleta, responsabilidade técnica e programas de monitoramento. Reúna estes endereços antes de ir a campo com objetivo oficial." },
        { tipo: "fontes", titulo: "Normas e programas de campo", itens: [
          { titulo: "ABNT NBR 9898 — Preservação e técnicas de amostragem de efluentes e águas", url: "https://www.abntcatalogo.com.br/", tipo: "norma", nota: "Procedimento de coleta e preservação de amostras de água." },
          { titulo: "ANA — Programa Nacional de Avaliação da Qualidade das Águas (PNQA)", url: "https://www.gov.br/ana/pt-br/assuntos/monitoramento-e-eventos-criticos/qualidade-da-agua", tipo: "site", nota: "Diretrizes e rede oficial de monitoramento de qualidade." },
          { titulo: "SOS Mata Atlântica — Observando os Rios (monitoramento participativo)", url: "https://sosma.org.br/iniciativas/observando-os-rios", tipo: "site", nota: "Metodologia de ciência cidadã (índice IQA) para avaliar rios no Brasil." },
        ] },
        {
          tipo: "licao",
          pergunta: "Em que momento um levantamento de bacia passa a exigir profissional com ART?",
          alternativas: [
            "Ao observar e mapear a bacia",
            "Ao projetar e construir obras de drenagem",
            "Ao fotografar os pontos",
          ],
          correta: 1,
          explicacao: "Observar, mapear e medir de forma simples não exigem ART. Projeto e construção de obras de drenagem têm responsabilidade técnica legal e exigem ART (ou RRT).",
        },
      ],
    },
    // ===================== CAPÍTULO 7 — MANUTENÇÃO =====================
    {
      id: "series-temporais",
      titulo: "Séries temporais: o valor está na continuidade",
      blocos: [
        { tipo: "texto", texto: "Um dado isolado quase não serve; o poder está na série. Nível, vazão e chuva medidos regularmente formam séries temporais que revelam sazonalidade, tendência e eventos extremos. A regra de ouro é a continuidade: é melhor uma medição simples feita toda semana por anos do que uma medição sofisticada feita uma vez. Falhas na série reduzem muito o seu valor." },
        { tipo: "texto", texto: "Padronize o armazenamento: uma planilha ou banco por variável, com data e hora, valor, unidade, método e observação. Nunca sobrescreva o dado bruto; correções ficam em coluna separada. Esse cuidado permite que outra pessoa, anos depois, confie e continue a série. A bacia se conhece no tempo, e o tempo não se recupera depois de perdido." },
        {
          tipo: "prancha",
          titulo: "Série temporal de nível",
          desenho: {
            legenda: "Picos nas chuvas, base na estiagem; a continuidade revela o padrao da bacia.",
            primitivas: [
              { t: "linha", de: [35, 25], ate: [35, 170], cor: "tinta" },
              { t: "linha", de: [35, 170], ate: [285, 170], cor: "tinta" },
              { t: "rotulo", p: [4, 24], texto: "Nivel" },
              { t: "rotulo", p: [240, 182], texto: "tempo" },
              { t: "curva", pts: [[40, 150], [70, 70], [95, 140], [130, 60], [160, 150], [200, 90], [240, 155], [280, 120]], cor: "destaque" },
            ],
          },
        },
        {
          tipo: "licao",
          pergunta: "O que mais agrega valor a um monitoramento de bacia?",
          alternativas: [
            "Uma única medição muito precisa",
            "A continuidade: medições regulares ao longo de anos",
            "Trocar de método a cada campanha",
          ],
          correta: 1,
          explicacao: "Séries contínuas revelam sazonalidade, tendência e extremos. Uma medição simples e regular por anos vale mais que uma medição sofisticada isolada.",
        },
      ],
    },
    {
      id: "qa-qc-dados",
      titulo: "QA/QC: garantir que o dado é confiável",
      blocos: [
        { tipo: "texto", texto: "Dado sem controle de qualidade engana. QA (garantia) são os procedimentos definidos antes (protocolo, calibração, padronização); QC (controle) são as checagens sobre o dado coletado: amplitude plausível (valor dentro do fisicamente possível), consistência (nível não cai durante chuva forte sem motivo), salto brusco (falha de sensor), e comparação com estação vizinha. Marque, não apague, os suspeitos." },
        { tipo: "texto", texto: "Calibre os instrumentos com frequência (sonda de pH e OD derivam rápido) e registre a calibração. Duplique parte das medições para estimar o erro. Um relatório de QA/QC junto da série diz ao usuário futuro o quanto confiar em cada trecho. Transparência sobre a qualidade do dado é o que separa monitoramento sério de coleta amadora." },
        {
          tipo: "diagrama",
          titulo: "Fluxo de QA/QC",
          codigo: `flowchart LR
  A["Dado bruto"] --> B["Amplitude plausivel?"]
  B --> C["Consistente com a chuva?"]
  C --> D["Sem salto de sensor?"]
  D --> E["Compara com estacao vizinha"]
  E --> F["Dado validado + flag de qualidade"]` },
        {
          tipo: "licao",
          pergunta: "Ao encontrar um valor suspeito na série, o correto é:",
          alternativas: [
            "Apagar o valor",
            "Marcar com uma flag de qualidade, sem apagar o dado bruto",
            "Ignorar e seguir",
          ],
          correta: 1,
          explicacao: "O dado bruto nunca é apagado. Valores suspeitos recebem flag de qualidade e, se preciso, correção em coluna separada, preservando a rastreabilidade.",
        },
      ],
    },
    {
      id: "tendencia-e-alerta",
      titulo: "Ler tendência e disparar alerta",
      blocos: [
        { tipo: "texto", texto: "Com a série em mãos, duas leituras importam. Tendência: a bacia está melhorando ou piorando? Vazões mínimas caindo, picos subindo e nível de base recuando são sinais de mais impermeabilização ou menos recarga. Teste a tendência com método adequado (por exemplo o teste de Mann-Kendall, não-paramétrico), para não confundir ruído com mudança real." },
        { tipo: "texto", texto: "Alerta: a série em tempo quase real permite avisar antes da cheia. Defina limiares de nível (atenção, alerta, emergência) e um protocolo de quem avisa quem. No Brasil, o monitoramento de áreas de risco é atribuição do CEMADEN e da Defesa Civil; sua rede local pode alimentar e complementar esse sistema. Dado que não vira aviso perde metade do valor." },
        {
          tipo: "prancha",
          titulo: "Limiares de alerta no nível",
          desenho: {
            legenda: "Tres faixas: atencao, alerta e emergencia; cada uma dispara uma acao definida.",
            primitivas: [
              { t: "linha", de: [35, 25], ate: [35, 170], cor: "tinta" },
              { t: "linha", de: [35, 170], ate: [285, 170], cor: "tinta" },
              { t: "linha", de: [35, 120], ate: [285, 120], cor: "suave" },
              { t: "rotulo", p: [210, 113], texto: "Atencao" },
              { t: "linha", de: [35, 85], ate: [285, 85], cor: "destaque" },
              { t: "rotulo", p: [220, 78], texto: "Alerta" },
              { t: "linha", de: [35, 50], ate: [285, 50], cor: "tinta" },
              { t: "rotulo", p: [205, 43], texto: "Emergencia" },
              { t: "curva", pts: [[40, 165], [90, 130], [140, 95], [190, 60], [240, 48]], cor: "destaque" },
            ],
          },
        },
        {
          tipo: "licao",
          pergunta: "No Brasil, qual órgão federal é referência no monitoramento e alerta de áreas de risco de desastre?",
          alternativas: ["IBGE", "CEMADEN (com a Defesa Civil)", "Banco Central"],
          correta: 1,
          explicacao: "O CEMADEN (Centro Nacional de Monitoramento e Alertas de Desastres Naturais) monitora e emite alertas, operando com a Defesa Civil. Redes locais podem complementar esse sistema.",
        },
      ],
    },
    {
      id: "limpeza-estruturas",
      titulo: "Manter as estruturas funcionando",
      blocos: [
        { tipo: "texto", texto: "Solução de drenagem sem manutenção falha. Boca de lobo entope com folha e lixo; jardim de chuva acumula sedimento e perde infiltração; pavimento permeável colmata; reservatório assoreia e perde volume; biovaleta precisa de poda e remoção de resíduo. A manutenção não é opcional: é parte do projeto, com rotina, responsável e orçamento definidos desde o início." },
        { tipo: "texto", texto: "Monte um calendário por tipo de estrutura: inspeção após cada chuva forte, limpeza periódica e revisão anual completa. Registre cada intervenção. Muitas falhas atribuídas a projeto são, na verdade, falta de manutenção. Cuidar do que existe costuma render mais que construir mais: a estrutura limpa entrega o que foi dimensionada para entregar." },
        {
          tipo: "tarefas",
          itens: [
            { id: "t-calendario", titulo: "Monte o calendário de manutenção das estruturas da sua área", entrega: "Tabela com estrutura, tipo de serviço, frequência e responsável." },
            { id: "t-inspecao", titulo: "Faça uma inspeção pós-chuva de uma boca de lobo ou jardim de chuva", entrega: "Ficha de inspeção com foto do antes e do depois da limpeza." },
          ],
        },
      ],
    },
    {
      id: "revisao-anual",
      titulo: "A revisão anual da bacia",
      blocos: [
        { tipo: "texto", texto: "Uma vez por ano, pare e revise a bacia inteira. Atualize o uso do solo (a cidade mudou?), recalcule a taxa impermeável e o C ponderado, compare as séries com o ano anterior, veja se as metas do diagnóstico avançaram e revise a curva-chave das estações. A bacia urbana é um alvo móvel: o que era verdade há cinco anos pode já não ser." },
        { tipo: "texto", texto: "Transforme a revisão em um relatório curto e público: o estado da bacia, o que melhorou, o que piorou, o que fazer no próximo ano. Esse documento mantém o comitê, a prefeitura e a comunidade informados e sustenta a continuidade do trabalho mesmo com troca de pessoas. A revisão anual é o que transforma esforço pontual em cuidado permanente." },
        {
          tipo: "diagrama",
          titulo: "Ciclo anual de gestão da bacia",
          codigo: `flowchart LR
  A["Monitorar o ano"] --> B["Revisar dados e metas"]
  B --> C["Atualizar uso do solo e parametros"]
  C --> D["Relatorio publico do estado da bacia"]
  D --> E["Ajustar plano do proximo ano"]
  E --> A` },
        {
          tipo: "licao",
          pergunta: "Por que a revisão anual recalcula a taxa impermeável e o C ponderado?",
          alternativas: [
            "Por formalidade, os valores nunca mudam",
            "Porque a cidade muda: nova ocupação altera o escoamento da bacia",
            "Para substituir o monitoramento de campo",
          ],
          correta: 1,
          explicacao: "A urbanização avança e muda o uso do solo. Recalcular a taxa impermeável e o C mantém o diagnóstico e o dimensionamento coerentes com a bacia real do ano corrente.",
        },
      ],
    },
    {
      id: "fontes-manutencao",
      titulo: "Fontes: manutenção, alerta e dados oficiais",
      blocos: [
        { tipo: "texto", texto: "A manutenção da série e o alerta conversam com os sistemas oficiais de monitoramento e defesa civil. Reúna estes endereços para alimentar e complementar a rede pública." },
        { tipo: "fontes", titulo: "Monitoramento e alerta", itens: [
          { titulo: "CEMADEN — monitoramento e alertas de desastres", url: "https://www.gov.br/cemaden/pt-br", tipo: "site", nota: "Alertas de risco hidrológico e geológico; rede de pluviômetros." },
          { titulo: "Lei 12.608/2012 — Política Nacional de Proteção e Defesa Civil", url: "https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2012/lei/l12608.htm", tipo: "norma", nota: "Marco do monitoramento de áreas de risco e da atuação da Defesa Civil." },
          { titulo: "ANA — Sala de Situação (acompanhamento de bacias)", url: "https://www.gov.br/ana/pt-br/sala-de-situacao", tipo: "site", nota: "Monitoramento em tempo quase real de bacias e reservatórios." },
        ] },
        {
          tipo: "licao",
          pergunta: "Qual teste é adequado para checar tendência numa série hidrológica?",
          alternativas: ["Mann-Kendall (não-paramétrico)", "Sorteio aleatório", "Média simples sem análise"],
          correta: 0,
          explicacao: "O teste de Mann-Kendall é não-paramétrico e amplamente usado para detectar tendência monotônica em séries ambientais, sem exigir distribuição normal dos dados.",
        },
      ],
    },
    // ===================== CAPÍTULO 8 — CASOS REAIS =====================
    {
      id: "caso-arroio-diluvio",
      titulo: "Caso: Arroio Dilúvio, Porto Alegre",
      blocos: [
        { tipo: "texto", texto: "O Arroio Dilúvio corta Porto Alegre e drena uma bacia densamente urbanizada. Grande parte do seu curso foi retificada e canalizada em concreto, com a Avenida Ipiranga correndo ao lado. O nome já avisa: a área sofre com cheias históricas. O caso mostra a lógica antiga da drenagem (retificar e acelerar) e seus limites, com alagamentos recorrentes a jusante quando a chuva supera a capacidade do canal." },
        { tipo: "texto", texto: "A leitura de bacia aqui é clássica: a avenida de fundo de vale é o antigo talvegue, a canalização aumentou a velocidade e a ocupação reduziu a várzea. Discussões de requalificação propõem devolver espaço à água e tratar o aporte difuso da bacia, em vez de só reforçar o canal. É o retrato urbano de que acelerar a água empurra o problema para a frente." },
        {
          tipo: "licao",
          pergunta: "O que o caso do Arroio Dilúvio ilustra sobre a drenagem por canalização?",
          alternativas: [
            "Que canalizar resolve a cheia definitivamente",
            "Que acelerar a água pelo canal pode empurrar o alagamento para jusante",
            "Que o arroio não tem bacia",
          ],
          correta: 1,
          explicacao: "A retificação e canalização aumentam a velocidade e transferem o pico para jusante. O caso evidencia os limites de tratar a cheia só acelerando a saída da água.",
        },
        { tipo: "fontes", titulo: "Sobre o caso", itens: [
          { titulo: "ANA — Conjuntura dos Recursos Hídricos no Brasil (contexto urbano)", url: "https://www.gov.br/ana/pt-br/centrais-de-conteudos/publicacoes", tipo: "site", nota: "Publicações oficiais sobre recursos hídricos e drenagem urbana no país." },
        ] },
      ],
    },
    {
      id: "caso-piscinoes-sp",
      titulo: "Caso: os piscinões de São Paulo",
      blocos: [
        { tipo: "texto", texto: "A Região Metropolitana de São Paulo construiu dezenas de reservatórios de detenção, os piscinões, nas bacias do Tietê, Tamanduateí e afluentes, para amortecer cheias em áreas críticas. Eles recebem a onda de cheia e liberam devagar, cortando o pico a jusante. É a aplicação em escala da ideia de detenção: não eliminam o volume, mas reduzem a vazão máxima nos pontos de gargalo." },
        { tipo: "texto", texto: "O caso também ensina sobre manutenção e operação: piscinões assoreiam, acumulam lixo e exigem limpeza constante; sem isso, perdem volume e viram foco de problema. E mostram que obra isolada não basta, sem reduzir o escoamento na fonte e sem gestão da bacia inteira. É detenção real, com suas virtudes e seus custos de operação." },
        {
          tipo: "prancha",
          titulo: "Piscinão na bacia: entra a cheia, sai devagar",
          desenho: {
            legenda: "O reservatorio enche na cheia e esvazia por um descarregador controlado, cortando o pico.",
            primitivas: [
              { t: "seta", de: [30, 60], ate: [90, 80], cor: "destaque" },
              { t: "rotulo", p: [20, 54], texto: "Cheia entra" },
              { t: "curva", pts: [[90, 85], [120, 130], [200, 130], [230, 85]], cor: "tinta" },
              { t: "linha", de: [90, 85], ate: [230, 85], cor: "suave" },
              { t: "rotulo", p: [135, 115], texto: "Piscinao" },
              { t: "seta", de: [230, 110], ate: [275, 110], cor: "suave" },
              { t: "rotulo", p: [232, 98], texto: "Sai devagar" },
            ],
          },
        },
        {
          tipo: "licao",
          pergunta: "Um piscinão (reservatório de detenção) age reduzindo:",
          alternativas: [
            "O volume total de chuva",
            "A vazão de pico a jusante, liberando a água devagar",
            "A área da bacia",
          ],
          correta: 1,
          explicacao: "A detenção não reduz o volume escoado, e sim a vazão de pico: segura a onda de cheia e a libera lentamente, aliviando os pontos de gargalo a jusante.",
        },
      ],
    },
    {
      id: "caso-cheonggyecheon",
      titulo: "Caso: Cheonggyecheon, Seul (renaturalização)",
      blocos: [
        { tipo: "texto", texto: "Em Seul, na Coreia do Sul, o córrego Cheonggyecheon estava coberto por uma via elevada no centro da cidade. Em um projeto concluído em 2005, a via foi removida e o curso d'água reaberto, criando um corredor fluvial urbano de vários quilômetros. É um dos casos mais citados de daylighting (reabertura) de rio em cidade densa, com efeitos no microclima, na biodiversidade e na vida urbana." },
        { tipo: "texto", texto: "O caso mostra que renaturalizar em metrópole é possível e desejado, mesmo exigindo gestão de tráfego e grande investimento. Também lembra que o projeto é hidrológico além de paisagístico: reabrir exige garantir vazão, controlar cheia e tratar a água. Serve de referência para quem sonha em reabrir um córrego tamponado na própria bacia." },
        {
          tipo: "diagrama",
          titulo: "A lógica do daylighting",
          codigo: `flowchart LR
  A["Via elevada sobre o corrego coberto"] --> B["Remocao da estrutura"]
  B --> C["Reabertura do curso"]
  C --> D["Corredor fluvial urbano"]
  D --> E["Microclima, biodiversidade, cidade viva"]` },
        {
          tipo: "licao",
          pergunta: "O projeto Cheonggyecheon é referência mundial de qual abordagem?",
          alternativas: [
            "Canalização em concreto",
            "Reabertura (daylighting) de curso d'água em cidade densa",
            "Construção de mais vias elevadas",
          ],
          correta: 1,
          explicacao: "O Cheonggyecheon removeu uma via elevada e reabriu o córrego no centro de Seul, tornando-se caso emblemático de daylighting e renaturalização urbana.",
        },
      ],
    },
    {
      id: "caso-sponge-city",
      titulo: "Caso: cidades-esponja na China",
      blocos: [
        { tipo: "texto", texto: "A China lançou em meados da década de 2010 o programa Sponge City (cidade-esponja), aplicado em dezenas de cidades, para enfrentar enchentes urbanas com infraestrutura verde em larga escala: pavimentos permeáveis, jardins de chuva, telhados verdes, zonas úmidas e parques inundáveis. A meta é que a cidade absorva, armazene e reaproveite boa parte da chuva, em vez de só escoá-la." },
        { tipo: "texto", texto: "O caso é a maior experiência mundial de drenagem sustentável em escala urbana e oferece lições dos dois lados: ganhos reais onde foi bem implantada e manutenção, e limites diante de chuvas extremas que superam o dimensionamento. Reforça que infraestrutura verde complementa, mas não substitui, a macrodrenagem e o planejamento da ocupação da bacia." },
        {
          tipo: "licao",
          pergunta: "Qual é a ideia central do conceito de cidade-esponja?",
          alternativas: [
            "Escoar a chuva o mais rápido possível",
            "Fazer a cidade absorver, armazenar e reaproveitar a chuva com infraestrutura verde",
            "Impermeabilizar toda a superfície urbana",
          ],
          correta: 1,
          explicacao: "A cidade-esponja usa infraestrutura verde em escala para absorver, reter e reusar a água da chuva, reduzindo o escoamento e as cheias, em vez de apenas acelerar a saída da água.",
        },
        { tipo: "fontes", titulo: "Sobre infraestrutura verde", itens: [
          { titulo: "US EPA — Green Infrastructure (conceitos e técnicas)", url: "https://www.epa.gov/green-infrastructure", tipo: "site", nota: "Base técnica das soluções aplicadas também em programas como o cidade-esponja." },
        ] },
      ],
    },
    {
      id: "caso-cemaden-alerta",
      titulo: "Caso: monitoramento e alerta de cheias no Brasil",
      blocos: [
        { tipo: "texto", texto: "Depois de desastres graves em áreas urbanas de encosta e fundo de vale, o Brasil estruturou um sistema nacional de monitoramento e alerta. O CEMADEN opera uma rede de pluviômetros e estações, acompanha bacias em risco e emite alertas que acionam as Defesas Civis municipais. É a tradução institucional da ideia deste caderno: medir a bacia para avisar antes que a água chegue." },
        { tipo: "texto", texto: "O caso mostra o elo entre dado e decisão: limiares de chuva e nível disparam avisos, que viram evacuação e redução de perdas. Também revela o valor da rede densa e da participação local, já que nenhuma rede oficial cobre cada pequeno córrego urbano. A bacia bem monitorada por muitos é o complemento natural do sistema nacional." },
        {
          tipo: "diagrama",
          titulo: "Da medição ao aviso",
          codigo: `flowchart LR
  A["Pluviometros e niveis na bacia"] --> B["CEMADEN: analise e limiares"]
  B --> C["Alerta a Defesa Civil municipal"]
  C --> D["Acao local: aviso e evacuacao"]` },
        {
          tipo: "licao",
          pergunta: "Qual o elo essencial que o sistema de alerta de cheias representa?",
          alternativas: [
            "Medir por medir, sem uso",
            "Transformar dado da bacia em aviso e ação que reduz perdas",
            "Substituir a drenagem por completo",
          ],
          correta: 1,
          explicacao: "O sistema fecha o ciclo dado-decisão: medições de chuva e nível viram alertas que acionam a Defesa Civil e reduzem perdas humanas e materiais.",
        },
      ],
    },
    {
      id: "caso-parques-lineares",
      titulo: "Caso: parques lineares em fundos de vale",
      blocos: [
        { tipo: "texto", texto: "Diversas cidades brasileiras, com destaque para programas em São Paulo, adotaram parques lineares ao longo de córregos de fundo de vale. A ideia reúne várias soluções deste caderno: preservar ou recuperar a várzea, criar área verde inundável, controlar a ocupação das margens (APP) e oferecer lazer. Em vez de canalizar e esconder o córrego, o parque dá a ele espaço e visibilidade, reduzindo o risco de ocupação irregular." },
        { tipo: "texto", texto: "O caso mostra uma combinação virtuosa: função hidrológica (espaço para a cheia, infiltração, retenção), função ambiental (mata ciliar, biodiversidade) e função social (parque, mobilidade ativa). Não resolve sozinho a cheia da bacia inteira, mas reconquista o fundo de vale como aliado da drenagem. É uma intervenção acessível à escala municipal e replicável bacia a bacia." },
        {
          tipo: "prancha",
          titulo: "Parque linear no fundo de vale",
          desenho: {
            legenda: "O corrego no centro, varzea vegetada dos dois lados e caminho de lazer: espaco para a cheia.",
            primitivas: [
              { t: "curva", pts: [[150, 30], [145, 90], [150, 150], [148, 180]], cor: "tinta" },
              { t: "retangulo", p: [100, 30], w: 100, h: 150, cor: "suave" },
              { t: "rotulo", p: [55, 100], texto: "Varzea verde" },
              { t: "rotulo", p: [205, 100], texto: "Varzea verde" },
              { t: "curva", pts: [[120, 30], [118, 180]], cor: "destaque" },
              { t: "curva", pts: [[180, 30], [182, 180]], cor: "destaque" },
              { t: "rotulo", p: [158, 170], texto: "Corrego" },
            ],
          },
        },
        {
          tipo: "licao",
          pergunta: "Qual combinação de funções um parque linear de fundo de vale reúne?",
          alternativas: [
            "Apenas lazer",
            "Hidrológica, ambiental e social ao mesmo tempo",
            "Apenas estacionamento",
          ],
          correta: 1,
          explicacao: "O parque linear junta função hidrológica (espaço para a cheia e infiltração), ambiental (mata ciliar e biodiversidade) e social (lazer e mobilidade), reconquistando o fundo de vale para a drenagem.",
        },
      ],
    },
    {
      id: "fontes-casos",
      titulo: "Fontes: casos e referências",
      blocos: [
        { tipo: "texto", texto: "Os casos reunidos têm documentação oficial e técnica. Reúna estes endereços para aprofundar cada exemplo e adaptar as lições à sua bacia." },
        { tipo: "fontes", titulo: "Casos e panorama", itens: [
          { titulo: "ANA — Publicações e Conjuntura dos Recursos Hídricos", url: "https://www.gov.br/ana/pt-br/centrais-de-conteudos/publicacoes", tipo: "site", nota: "Diagnósticos oficiais de bacias e drenagem urbana no Brasil." },
          { titulo: "CEMADEN — monitoramento e alerta de desastres", url: "https://www.gov.br/cemaden/pt-br", tipo: "site", nota: "Caso brasileiro de alerta de cheias e deslizamentos." },
          { titulo: "US EPA — Green Infrastructure", url: "https://www.epa.gov/green-infrastructure", tipo: "site", nota: "Base das soluções usadas em cidades-esponja e renaturalização." },
        ] },
        {
          tipo: "licao",
          pergunta: "Que lição comum atravessa os casos deste capítulo?",
          alternativas: [
            "Só obra cinza resolve enchente",
            "Dar espaço à água e medir a bacia funciona melhor que só acelerar a saída",
            "Bacia urbana não tem solução",
          ],
          correta: 1,
          explicacao: "De Seul às cidades-esponja e aos sistemas de alerta, a linha comum é devolver espaço à água e basear a decisão em medição, em vez de apenas canalizar e acelerar.",
        },
      ],
    },
    // ===================== CAPÍTULO 9 — RECURSOS =====================
    {
      id: "kit-de-campo",
      titulo: "Kit de campo da leitura de bacia",
      blocos: [
        { tipo: "texto", texto: "O kit básico cabe numa mochila e é barato. Para mapear e localizar: celular com GPS e bússola, mapa impresso da bacia, caderneta e lápis. Para medir: trena de 30 m, cronômetro, flutuador improvisado, régua graduada, disco de turbidez (ou garrafa). Para qualidade simples: fitas ou sonda de pH, kit de oxigênio dissolvido. Para segurança: luvas, botas, álcool em gel, colete refletivo e um colega." },
        { tipo: "texto", texto: "Conforme o trabalho cresce, agregue: sensor de nível (data logger de pressão), pluviômetro, sonda multiparâmetro e uma estação simples. Nunca deixe o avançado atrasar o começo: dá para fazer uma leitura de bacia séria com trena, cronômetro e caderneta. O equipamento serve ao método, não o contrário." },
        {
          tipo: "tarefas",
          itens: [
            { id: "t-kit", titulo: "Monte seu kit básico de campo", entrega: "Foto do kit reunido e a lista de itens que faltam adquirir." },
          ],
        },
        {
          tipo: "prancha",
          titulo: "O kit básico na mochila",
          desenho: {
            legenda: "Mapear, medir e se proteger: o essencial cabe numa mochila.",
            primitivas: [
              { t: "retangulo", p: [90, 40], w: 120, h: 130, cor: "tinta" },
              { t: "curva", pts: [[120, 40], [150, 20], [180, 40]], cor: "tinta" },
              { t: "rotulo", p: [120, 60], texto: "Trena" },
              { t: "rotulo", p: [110, 80], texto: "Caderneta" },
              { t: "rotulo", p: [118, 100], texto: "Regua" },
              { t: "rotulo", p: [110, 120], texto: "Cronometro" },
              { t: "rotulo", p: [122, 140], texto: "Luvas" },
            ],
          },
        },
      ],
    },
    {
      id: "softwares-e-dados",
      titulo: "Caixa de ferramentas: softwares e dados abertos",
      blocos: [
        { tipo: "texto", texto: "Tudo o que este caderno pede pode ser feito com ferramentas gratuitas e dados abertos. SIG e delimitação: QGIS. Elevação: TOPODATA/INPE (SRTM) e, para alta resolução, LiDAR municipal quando houver. Uso do solo: MapBiomas. Chuva e vazão: BDMEP/INMET e HidroWeb/ANA. Delimitação assistida: USGS StreamStats. Base de drenagem e vias: OpenStreetMap. Visualização rápida: Google Earth." },
        { tipo: "texto", texto: "Organize por etapa: delimitar (MDE + QGIS/StreamStats), caracterizar (MapBiomas + morfometria no QGIS), dimensionar (IDF + método racional/SCS-CN), monitorar (régua/sensor + planilha), comparar (HidroWeb/CEMADEN). Guarde os links num só lugar; este caderno já reúne os principais nas páginas de fontes." },
        {
          tipo: "diagrama",
          titulo: "Ferramenta por etapa",
          codigo: `flowchart TD
  A["Delimitar: QGIS + TOPODATA + StreamStats"] --> B["Caracterizar: MapBiomas + morfometria"]
  B --> C["Dimensionar: IDF + racional + SCS-CN"]
  C --> D["Monitorar: regua/sensor + planilha"]
  D --> E["Comparar: HidroWeb + CEMADEN"]` },
        {
          tipo: "licao",
          pergunta: "Qual ferramenta gratuita faz a delimitação da bacia a partir do MDE?",
          alternativas: ["Uma planilha de texto", "QGIS (com algoritmos de hidrologia)", "Um editor de imagem"],
          correta: 1,
          explicacao: "O QGIS, com algoritmos de preenchimento de depressões, direção e acumulação de fluxo, delimita a bacia e extrai a drenagem a partir do modelo de elevação, sem custo.",
        },
      ],
    },
    {
      id: "glossario",
      titulo: "Glossário essencial da bacia",
      blocos: [
        { tipo: "texto", texto: "Bacia hidrográfica: área que drena para um mesmo exutório. Divisor de águas: limite da bacia, pelas cristas. Exutório: ponto de saída. Talvegue: linha mais baixa do vale. Afluente: curso que entra no principal. Várzea: planície de inundação. Sub-bacia: bacia menor dentro da maior." },
        { tipo: "texto", texto: "Tempo de concentração: tempo do ponto mais distante até o exutório. Coeficiente de escoamento (C): fração da chuva que escoa. Curve Number (CN): índice de escoamento por solo e uso. IDF: relação intensidade-duração-frequência da chuva. Período de retorno (T): intervalo médio entre eventos de dada magnitude. Hidrograma: vazão no tempo. Curva-chave: relação nível-vazão de uma seção." },
        { tipo: "texto", texto: "MDE: modelo digital de elevação. Morfometria: medidas da forma da bacia (Kc, Kf, Dd). Daylighting: reabrir curso tamponado. SuDS / infraestrutura verde: drenagem sustentável (reter e infiltrar). Outorga: direito de uso da água. ART/RRT: anotação de responsabilidade técnica. Linha de base: estado medido antes da intervenção." },
        {
          tipo: "licao",
          pergunta: "Densidade de drenagem (Dd) é:",
          alternativas: [
            "A soma dos comprimentos dos cursos dividida pela área da bacia",
            "A profundidade do rio principal",
            "O número de pontes da bacia",
          ],
          correta: 0,
          explicacao: "Dd = soma dos comprimentos de todos os cursos / área da bacia (km/km²). Indica o quanto a bacia é ramificada e, indiretamente, a rapidez da resposta ao escoamento.",
        },
      ],
    },
    {
      id: "checklist-final",
      titulo: "Checklist da leitura completa de uma bacia",
      blocos: [
        { tipo: "texto", texto: "Use esta lista para saber se a leitura está completa. Se faltar item, volte ao capítulo correspondente. A meta é fechar o ciclo: entender, medir, projetar e monitorar, sempre com fonte e com o profissional certo quando a etapa exigir." },
        {
          tipo: "tarefas",
          itens: [
            { id: "c-delim", titulo: "Bacia delimitada e validada (manual, SIG e campo)", entrega: "Polígono da bacia com área, perímetro e exutório definidos." },
            { id: "c-param", titulo: "Parâmetros calculados (Kc, Kf, Dd, declividade, tc)", entrega: "Ficha da bacia com os índices morfométricos e o tempo de concentração." },
            { id: "c-uso", titulo: "Uso do solo e taxa impermeável levantados", entrega: "Tabela de classes e o C ponderado e/ou CN da bacia." },
            { id: "c-vazao", titulo: "Vazão de pico estimada e vazão medida em campo", entrega: "Q do método racional e ao menos uma medição de campo para comparar." },
            { id: "c-diag", titulo: "Diagnóstico com problemas e metas numéricas", entrega: "Uma página com pontos críticos e metas mensuráveis." },
            { id: "c-mon", titulo: "Plano de monitoramento com linha de base", entrega: "Tabela de pontos, variáveis, métodos e responsáveis, com dados iniciais." },
          ],
        },
        {
          tipo: "licao",
          pergunta: "Quando a leitura de uma bacia pode ser considerada completa?",
          alternativas: [
            "Quando só se delimitou o contorno",
            "Quando se fecha o ciclo: entender, medir, projetar e monitorar, com fonte",
            "Quando se tira uma foto bonita do rio",
          ],
          correta: 1,
          explicacao: "A leitura completa cobre entender a bacia, medir chuva e vazão, diagnosticar com metas e montar o monitoramento, tudo com lastro e com o profissional certo nas etapas que exigem.",
        },
      ],
    },
    {
      id: "aprofundar",
      titulo: "Para aprofundar: fontes reunidas",
      blocos: [
        { tipo: "texto", texto: "Reunimos aqui as fontes estruturantes do caderno, para consulta rápida. Todas são oficiais, abertas ou normativas; priorize sempre a fonte primária ao estudar um ponto específico." },
        { tipo: "fontes", titulo: "Normas e políticas", itens: [
          { titulo: "Lei 9.433/1997 — Política Nacional de Recursos Hídricos", url: "https://www.planalto.gov.br/ccivil_03/leis/l9433.htm", tipo: "norma", nota: "Bacia como unidade de gestão, outorga, comitês." },
          { titulo: "Lei 12.651/2012 — Código Florestal (APPs)", url: "https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2012/lei/l12651.htm", tipo: "norma", nota: "Faixas de margem e raio de nascente." },
          { titulo: "Lei 12.608/2012 — Proteção e Defesa Civil", url: "https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2012/lei/l12608.htm", tipo: "norma", nota: "Monitoramento de áreas de risco e alerta." },
          { titulo: "USDA NRCS — TR-55, Urban Hydrology for Small Watersheds (1986)", url: "https://www.hydrocad.net/pdf/TR-55%20Manual.pdf", tipo: "norma", nota: "Documento oficial (PDF) do método do Curve Number e escoamento urbano." },
        ] },
        { tipo: "fontes", titulo: "Dados abertos e ferramentas", itens: [
          { titulo: "ANA — HidroWeb (nível, vazão, chuva)", url: "https://www.snirh.gov.br/hidroweb/apresentacao", tipo: "dataset", nota: "Séries observadas por estação." },
          { titulo: "INMET — BDMEP (precipitação)", url: "https://bdmep.inmet.gov.br/", tipo: "dataset", nota: "Chuva histórica para IDF." },
          { titulo: "TOPODATA / INPE — MDE do SRTM", url: "http://www.dsr.inpe.br/topodata/", tipo: "dataset", nota: "Elevação para delimitar e extrair drenagem." },
          { titulo: "MapBiomas Brasil — uso e cobertura", url: "https://brasil.mapbiomas.org/", tipo: "dataset", nota: "Impermeabilização e vegetação da bacia." },
          { titulo: "QGIS — SIG livre", url: "https://qgis.org/", tipo: "site", nota: "Delimitação, morfometria e mapas." },
          { titulo: "USGS StreamStats — delimitação assistida", url: "https://streamstats.usgs.gov/ss/", tipo: "site", nota: "Bacia e parâmetros a partir do exutório." },
        ] },
      ],
    },
    {
      id: "compilado",
      titulo: "Prancha de síntese",
      blocos: [
        { tipo: "texto", texto: "Da gota ao gráfico: ler uma bacia urbana é reconhecer, embaixo da cidade, o território que o relevo ainda comanda; delimitá-lo pelo divisor de águas; caracterizar seu uso do solo e sua forma; medir chuva e vazão; estimar o escoamento com método (racional, SCS-CN); projetar soluções que devolvem à bacia a capacidade de reter e infiltrar; e manter um monitoramento que vira prova e decisão. Cada passo deste caderno tem norma, dataset ou estudo citado, e cada etapa que exige topógrafo, laboratório ou engenheiro com ART aparece como mobilização, não como atalho. A bacia bem lida é a diferença entre tratar enchente como azar e tratá-la como consequência mensurável, e portanto mudável. Comece pequeno, meça com constância, dê espaço à água e trabalhe em rede: é assim que uma bacia urbana deixa de só escoar o problema e passa a ser cuidada." },
        { tipo: "compilado" },
      ],
    },
  ],
};
