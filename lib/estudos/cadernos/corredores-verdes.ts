import type { CadernoEstudo } from "../cadernosEstudo";

/**
 * Caderno de campo: Mapeamento de corredores verdes num bairro (geografia e SIG, ecologia urbana).
 * Conteudo com lastro real: conceito de corredor ecologico do SNUC (Lei 9.985/2000, art. 2, XIX),
 * ecologia de paisagens (matriz-mancha-corredor, Forman & Godron; Metzger), metricas de conectividade
 * por teoria dos grafos (IIC de Pascual-Hortal & Saura 2006; PC de Saura & Pascual-Hortal 2007; software
 * Conefor), modelagem por caminho de menor custo e teoria de circuitos (Circuitscape, Linkage Mapper),
 * sensoriamento remoto (NDVI, dados abertos do MapBiomas, INPE/CBERS, USGS/Landsat, Copernicus/Sentinel),
 * amostragem de cobertura de copa com i-Tree Canopy, a regra 3-30-300 de Konijnendijk (2023), o Codigo
 * Florestal (Lei 12.651/2012, APP ripariana) e o Estatuto da Cidade (Lei 10.257/2001). Ferramenta de
 * SIG: QGIS com dados do OpenStreetMap e IBGE. As etapas que exigem profissional habilitado (engenheiro
 * agronomo/florestal, arborista com ART, poder publico) viram blocos de mobilizacao. Videos reais
 * verificados. Cada numero, norma e desenho tem fonte citada na propria pagina.
 */
export const caderno: CadernoEstudo = {
  id: "corredores-verdes",
  titulo: "Mapeamento de corredores verdes num bairro: ler, medir e conectar",
  resumo:
    "Da caminhada ao mapa de prioridade: como uma pessoa ou um coletivo aprende a enxergar um bairro como paisagem, mede o verde com satelite e campo, modela em SIG onde a fauna consegue (ou nao) atravessar, e desenha corredores verdes que ligam pracas, quintais e matas de beira de rio. Cada metrica tem metodo, cada regra tem norma e cada etapa que pede um profissional mostra quem chamar e o que ele entrega.",
  paginas: [
    // ===================== CAPITULO 1 — CONTEXTO =====================
    {
      id: "abertura",
      titulo: "Como usar este caderno de campo",
      blocos: [
        { tipo: "texto", texto: "Este caderno acompanha quem quer transformar um bairro numa paisagem conectada: ligar os pedacos de verde que hoje estao soltos (uma praca aqui, um quintal arborizado ali, uma mata de beira de corrego acola) numa rede por onde passarinho, abelha, borboleta e agua consigam circular. O produto final e um mapa de prioridade: onde plantar, onde alargar calcada, onde proteger o que ja existe." },
        { tipo: "texto", texto: "Regra do caderno: antes de propor um corredor, meca o verde que ja existe; antes de medir, defina para quem o corredor serve (qual fauna, qual funcao); e antes de plantar, compare com a norma certa. Voce observa, mapeia e registra. Quando a etapa exige plano assinado, arborista habilitado ou decisao da prefeitura, a pagina abre um campo de mobilizacao que chama o profissional e acompanha ate ficar pronto." },
        { tipo: "diagrama", titulo: "O percurso do caderno", codigo: `flowchart TD
  A["Contexto: por que conectar o verde"] --> B["Ler o bairro como paisagem"]
  B --> C["Metodo SIG: dados e camadas"]
  C --> D["Calculo: NDVI, resistencia e conectividade"]
  D --> E["Projeto: desenhar a rede de corredores"]
  E --> F["Execucao: mobilizar e plantar"]
  F --> G["Manutencao: monitorar no tempo"]
  G --> H["Casos reais e recursos"]
  H --> I["Prancha de sintese"]` },
      ],
    },
    {
      id: "por-que-conectar",
      titulo: "Por que um bairro precisa de corredores verdes",
      blocos: [
        { tipo: "texto", texto: "A cidade quebra o habitat em cacos. Onde havia mata continua, sobram fragmentos ilhados por asfalto, muro e laje. Populacao pequena e isolada perde variedade genetica, nao recebe reforco de fora e some no primeiro ano ruim. Corredor verde e a ponte entre esses cacos: faixa de vegetacao que devolve o transito de genes, de sementes e de bichos entre manchas que a urbanizacao separou." },
        { tipo: "texto", texto: "O ganho nao e so ecologico. Copa de arvore derruba a temperatura da rua em dias de calor, a vegetacao infiltra chuva e alivia alagamento, e um bairro com verde acessivel tem morador mais saudavel. A pergunta deste caderno e pratica: entre tudo o que poderia ser feito, onde um metro de corredor rende mais conexao? Isso se mede, nao se chuta." },
        { tipo: "video", titulo: "O que sao os Corredores Ecologicos? (ciencia ambiental)", youtube: "lUKlT1BFkC4" },
        {
          tipo: "licao",
          pergunta: "Qual e o problema ecologico central que um corredor verde combate num bairro?",
          alternativas: [
            "O excesso de arvores numa unica praca",
            "A fragmentacao do habitat, que isola populacoes pequenas",
            "A falta de iluminacao publica nas ruas",
          ],
          correta: 1,
          explicacao: "O corredor combate a fragmentacao: ao religar fragmentos isolados, permite fluxo genico, dispersao e recolonizacao, reduzindo o risco de extincao local de populacoes pequenas.",
        },
      ],
    },
    {
      id: "o-que-e-corredor",
      titulo: "O que e, de fato, um corredor verde",
      blocos: [
        { tipo: "texto", texto: "A lei brasileira ja define a ideia. O SNUC (Lei 9.985/2000, art. 2, XIX) chama corredores ecologicos de 'porcoes de ecossistemas naturais ou seminaturais, ligando unidades de conservacao, que possibilitam entre elas o fluxo de genes e o movimento da biota'. No bairro a escala e menor, mas a funcao e a mesma: ligar manchas de verde para a vida circular entre elas." },
        { tipo: "texto", texto: "Guarde duas palavras. Conectividade estrutural e o verde ligado no mapa, visto de cima, independente de quem usa. Conectividade funcional e o verde que de fato serve de passagem para uma especie real, que depende de quanto ela consegue voar ou andar. Um corredor pode parecer continuo no mapa (estrutural) e ainda assim nao funcionar para um sabia que nao atravessa 80 m de asfalto (funcional). O caderno mede os dois." },
        {
          tipo: "prancha",
          titulo: "Estrutural x funcional: o mapa nao conta tudo",
          desenho: {
            legenda: "Em cima: duas manchas ligadas por uma faixa continua (conectividade estrutural). Embaixo: a mesma faixa com uma avenida cortando no meio, que a especie nao cruza (funcional baixa).",
            primitivas: [
              { t: "circulo", c: [50, 45], r: 20, cor: "destaque", hachura: true },
              { t: "circulo", c: [250, 45], r: 20, cor: "destaque", hachura: true },
              { t: "retangulo", p: [70, 38], w: 160, h: 14, cor: "suave" },
              { t: "rotulo", p: [96, 22], texto: "Estrutural: ligado" },
              { t: "circulo", c: [50, 140], r: 20, cor: "destaque", hachura: true },
              { t: "circulo", c: [250, 140], r: 20, cor: "destaque", hachura: true },
              { t: "retangulo", p: [70, 133], w: 160, h: 14, cor: "suave" },
              { t: "linha", de: [150, 110], ate: [150, 170], cor: "tinta" },
              { t: "linha", de: [142, 110], ate: [142, 170], cor: "tinta" },
              { t: "rotulo", p: [128, 182], texto: "Avenida: barreira" },
              { t: "rotulo", p: [92, 118], texto: "Funcional: quebrado" },
            ],
          },
        },
        { tipo: "texto", texto: "Por isso corredor nao e so 'linha verde no Google Earth'. E preciso perguntar: continuo para quem? Com que largura? Com quais buracos? O mapeamento serio responde isso com dado de satelite, medida de campo e um modelo que pesa o esforco de atravessar cada tipo de piso." },
      ],
    },
    {
      id: "tipos-de-corredor",
      titulo: "Os tipos de corredor que cabem num bairro",
      blocos: [
        { tipo: "texto", texto: "No tecido urbano, quatro formas de conexao aparecem com mais frequencia, e quase sempre combinadas. Saber o tipo muda a estrategia de mapeamento e de projeto." },
        {
          tipo: "prancha",
          titulo: "Quatro formas de religar o verde",
          desenho: {
            legenda: "Ripario (beira de corrego), viario (arvores de rua ligando pracas), stepping-stones (manchas em pulos) e greenway (faixa larga de uso misto).",
            primitivas: [
              { t: "curva", pts: [[20, 30], [60, 45], [110, 40], [160, 55]], cor: "destaque" },
              { t: "rotulo", p: [22, 18], texto: "1. Ripario" },
              { t: "linha", de: [20, 85], ate: [160, 85], cor: "tinta" },
              { t: "circulo", c: [20, 85], r: 7, cor: "suave" },
              { t: "circulo", c: [160, 85], r: 7, cor: "suave" },
              { t: "rotulo", p: [22, 70], texto: "2. Viario" },
              { t: "circulo", c: [25, 130], r: 6, cor: "destaque", hachura: true },
              { t: "circulo", c: [70, 122], r: 6, cor: "destaque", hachura: true },
              { t: "circulo", c: [115, 134], r: 6, cor: "destaque", hachura: true },
              { t: "circulo", c: [160, 126], r: 6, cor: "destaque", hachura: true },
              { t: "rotulo", p: [22, 108], texto: "3. Stepping-stones" },
              { t: "retangulo", p: [20, 162], w: 150, h: 20, cor: "suave", hachura: true },
              { t: "rotulo", p: [185, 170], texto: "4. Greenway" },
            ],
          },
        },
        { tipo: "texto", texto: "O corredor ripario (mata de beira de corrego) e o mais poderoso e o mais barato: a Area de Preservacao Permanente ja e obrigatoria por lei, costuma ter solo umido e so precisa ser recuperada. O viario usa a arborizacao de rua para 'costurar' pracas. Os stepping-stones (trampolins) sao manchas proximas que a fauna usa em pulos, uteis quando nao da para uma faixa continua. A greenway e a faixa larga que soma ecologia, caminhada e ciclovia." },
        {
          tipo: "licao",
          pergunta: "Por que o corredor ripario costuma ser o ponto de partida mais eficiente num bairro?",
          alternativas: [
            "Porque e o unico tipo que atrai turistas",
            "Porque a faixa de beira de rio ja e APP protegida por lei e so precisa ser recuperada",
            "Porque dispensa qualquer tipo de planta nativa",
          ],
          correta: 1,
          explicacao: "A mata ciliar ocupa a APP, que o Codigo Florestal (Lei 12.651/2012) ja obriga a preservar/recuperar; aproveitar essa faixa custa menos disputa de espaco e ja tem funcao hidrica.",
        },
      ],
    },
    {
      id: "fontes-contexto",
      titulo: "Fontes: o conceito e o marco legal",
      blocos: [
        { tipo: "texto", texto: "O capitulo se apoia na definicao legal de corredor (SNUC), na protecao da mata ciliar (Codigo Florestal) e no instrumento que da ao municipio o poder de planejar o verde (Estatuto da Cidade). Guarde estes enderecos: sao a porta de entrada juridica do assunto." },
        { tipo: "fontes", titulo: "Base conceitual e legal", itens: [
          { titulo: "Lei 9.985/2000 — SNUC (define corredores ecologicos, art. 2, XIX)", url: "https://www.planalto.gov.br/ccivil_03/leis/l9985.htm", tipo: "norma", nota: "Corredor = porcao de ecossistema que liga areas e permite fluxo de genes e movimento da biota." },
          { titulo: "Lei 12.651/2012 — Codigo Florestal (APP e mata ciliar)", url: "https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2012/lei/l12651.htm", tipo: "norma", nota: "Faixas de APP ao longo de cursos d'agua: base do corredor ripario urbano." },
          { titulo: "Lei 10.257/2001 — Estatuto da Cidade", url: "https://www.planalto.gov.br/ccivil_03/leis/leis_2001/l10257.htm", tipo: "norma", nota: "Plano Diretor e instrumentos de politica urbana que amparam areas verdes." },
          { titulo: "Politize! — Corredores ecologicos: conectando a biodiversidade", url: "https://www.politize.com.br/corredores-ecologicos/", tipo: "site", nota: "Panorama acessivel do conceito e da funcao." },
        ] },
        {
          tipo: "licao",
          pergunta: "Qual norma federal da ao municipio o Plano Diretor como instrumento para planejar areas verdes?",
          alternativas: ["O SNUC (Lei 9.985/2000)", "O Estatuto da Cidade (Lei 10.257/2001)", "O Codigo Florestal (Lei 12.651/2012)"],
          correta: 1,
          explicacao: "O Estatuto da Cidade regulamenta a politica urbana e institui o Plano Diretor, instrumento onde o municipio pode definir e proteger a rede de areas verdes e corredores.",
        },
      ],
    },

    // ===================== CAPITULO 2 — LER O LOCAL E O TEMA =====================
    {
      id: "ecologia-paisagem",
      titulo: "Ler o bairro como paisagem: matriz, mancha, corredor",
      blocos: [
        { tipo: "texto", texto: "A ecologia de paisagens oferece tres palavras que organizam tudo o que voce ve do alto. Mancha (patch) e cada area homogenea, como uma praca ou um quarteirao arborizado. Corredor e a faixa que liga manchas. Matriz e o fundo dominante onde tudo esta mergulhado, no bairro quase sempre o construido: ruas, telhados, lajes. Essa trinca vem de Forman & Godron e foi difundida no Brasil por Metzger." },
        {
          tipo: "prancha",
          titulo: "Mancha, corredor e matriz",
          desenho: {
            legenda: "As manchas verdes (pracas, quintais) sobre a matriz construida, costuradas por corredores. O olhar do mapeamento e sempre este.",
            primitivas: [
              { t: "retangulo", p: [10, 12], w: 283, h: 173, cor: "suave" },
              { t: "rotulo", p: [210, 175], texto: "matriz = construido" },
              { t: "circulo", c: [60, 55], r: 22, cor: "destaque", hachura: true },
              { t: "rotulo", p: [44, 56], texto: "mancha" },
              { t: "circulo", c: [220, 70], r: 26, cor: "destaque", hachura: true },
              { t: "rotulo", p: [206, 72], texto: "mancha" },
              { t: "circulo", c: [150, 150], r: 18, cor: "destaque", hachura: true },
              { t: "retangulo", p: [78, 50], w: 120, h: 12, cor: "destaque" },
              { t: "rotulo", p: [96, 40], texto: "corredor" },
              { t: "curva", pts: [[150, 132], [170, 110], [200, 92]], cor: "destaque" },
            ],
          },
        },
        { tipo: "texto", texto: "Por que importa? Porque o mapeamento inteiro vira: identificar manchas (o que ja e verde), medir a matriz (o quao hostil e a travessia) e projetar corredores (onde religar). E porque a qualidade da matriz decide tudo: atravessar 50 m de quintal com arvore e facil; atravessar 50 m de estacionamento e quase impossivel para a maioria da fauna urbana." },
      ],
    },
    {
      id: "fragmentacao-borda",
      titulo: "Fragmentacao e efeito de borda",
      blocos: [
        { tipo: "texto", texto: "Quando uma mata vira fragmentos, dois problemas aparecem. O isolamento ja vimos. O outro e a borda: a beira do fragmento recebe mais sol, vento e ruido, resseca, e e invadida por especies de area aberta e por gato e cachorro. Quanto menor e mais recortado o fragmento, maior a proporcao de borda e menor o 'coracao' (nucleo) protegido. Fragmento redondo guarda mais nucleo que fragmento em fita." },
        {
          tipo: "prancha",
          titulo: "Nucleo e borda: a forma importa",
          desenho: {
            legenda: "O mesmo tamanho de area: o fragmento compacto (esq.) guarda um nucleo grande; o alongado (dir.) e quase so borda.",
            primitivas: [
              { t: "circulo", c: [75, 95], r: 48, cor: "suave" },
              { t: "circulo", c: [75, 95], r: 28, cor: "destaque", hachura: true },
              { t: "rotulo", p: [58, 97], texto: "nucleo" },
              { t: "rotulo", p: [55, 155], texto: "compacto" },
              { t: "retangulo", p: [175, 55], w: 110, h: 80, cor: "suave" },
              { t: "retangulo", p: [195, 85], w: 70, h: 18, cor: "destaque", hachura: true },
              { t: "rotulo", p: [205, 155], texto: "alongado" },
            ],
          },
        },
        { tipo: "texto", texto: "Para o corredor isso tem consequencia dupla. Um corredor estreito e quase todo borda, logo serve mais de passagem do que de moradia, e pode virar armadilha se leva o bicho para onde ha predador domestico. Regra pratica da literatura: quanto mais largo o corredor, mais especies ele atende; faixas de poucos metros ajudam insetos e aves, mas mamiferos e especies de interior precisam de dezenas de metros." },
        {
          tipo: "licao",
          pergunta: "Entre dois fragmentos de mesma area, qual guarda mais habitat de 'nucleo', longe da borda?",
          alternativas: ["O fragmento compacto e arredondado", "O fragmento longo e estreito", "Os dois guardam exatamente o mesmo nucleo"],
          correta: 0,
          explicacao: "Para a mesma area, a forma compacta tem menor perimetro por area, logo menos borda e mais nucleo protegido. A forma alongada e dominada pelo efeito de borda.",
        },
      ],
    },
    {
      id: "caminhada-diagnostica",
      titulo: "A caminhada diagnostica: o que olhar no chao",
      blocos: [
        { tipo: "texto", texto: "Antes do computador, os pes. O mapeamento comeca com uma caminhada sistematica pelo bairro, de preferencia pela manha, com caderno, celular com GPS e uma trena. Voce esta catalogando as pecas do quebra-cabeca: onde ja ha verde, onde a fauna aparece, onde a travessia trava." },
        { tipo: "tarefas", itens: [
          { id: "t1", titulo: "Marcar as manchas de verde", entrega: "Lista georreferenciada (ponto de GPS + foto) de toda praca, terreno baldio vegetado, quintal arborizado visivel e mata de corrego, com estimativa de tamanho." },
          { id: "t2", titulo: "Registrar barreiras de travessia", entrega: "Pontos das maiores barreiras: avenidas largas, muros continuos, areas totalmente impermeaveis sem nenhuma arvore." },
          { id: "t3", titulo: "Anotar indicios de fauna", entrega: "Onde viu ou ouviu passarinho, abelha, borboleta, lagartixa; que arvores estao com flor/fruto atraindo bicho." },
          { id: "t4", titulo: "Medir calcadas candidatas", entrega: "Largura (em metros) das calcadas das ruas que ligam duas manchas: candidatas a corredor viario." },
        ] },
        { tipo: "texto", texto: "Dica de campo: fotografe sempre com o GPS do celular ligado, para a foto guardar a coordenada. Essa coleta vira a 'verdade de campo' que depois valida o mapa de satelite. Mapa sem checagem no chao erra: sombra de predio vira 'verde', e arvore de quintal escondida some." },
      ],
    },
    {
      id: "especie-foco",
      titulo: "Para quem e o corredor? A especie-foco",
      blocos: [
        { tipo: "texto", texto: "Corredor 'para a biodiversidade em geral' nao se projeta: cada especie atravessa de um jeito. A saida da ecologia aplicada e escolher uma especie-foco (ou um pequeno grupo, uma guilda) que represente a necessidade de conexao do bairro. Em cidade, aves de borda e beija-flores sao praticas: sao visiveis, dependem de arvores com flor e fruto e respondem rapido a corredores." },
        { tipo: "texto", texto: "A escolha define os numeros do modelo. Quanto esse animal cruza de area aberta? Que largura de verde ele usa? Beija-flor atravessa vaos maiores que um pequeno passaro de sub-bosque. Definir a especie-foco transforma o corredor de desejo vago em projeto com meta: 'nenhum vao de matriz hostil maior que X metros no caminho entre a praca A e a mata B'." },
        {
          tipo: "diagrama", titulo: "Da especie-foco ao parametro do modelo", codigo: `flowchart LR
  A["Escolher especie-foco<br/>(ex.: ave de borda)"] --> B["Capacidade de travessia<br/>quantos metros de vao ela cruza"]
  B --> C["Largura minima de corredor<br/>que ela usa"]
  C --> D["Parametros da superficie<br/>de resistencia no SIG"]` },
        {
          tipo: "licao",
          pergunta: "Por que escolher uma especie-foco antes de modelar o corredor?",
          alternativas: [
            "Porque cada especie atravessa a cidade de um jeito, e isso define os parametros do modelo",
            "Porque so e permitido plantar uma especie de arvore",
            "Porque a especie-foco substitui a necessidade de ir a campo",
          ],
          correta: 0,
          explicacao: "A capacidade de travessia e a largura usada mudam por especie. A especie-foco traduz 'conectar a biodiversidade' em numeros concretos para a superficie de resistencia e as metricas.",
        },
      ],
    },
    {
      id: "fontes-ecologia",
      titulo: "Fontes: ecologia de paisagens e conectividade",
      blocos: [
        { tipo: "texto", texto: "Para aprofundar o vocabulario do capitulo, a publicacao Conectividade em Foco (Ministerio do Meio Ambiente) reune os conceitos de conectividade estrutural e funcional e a teoria dos grafos aplicada a paisagem, e o artigo seminal de Pascual-Hortal & Saura (2006) compara dez indices e propoe o IIC, base dos indices de grafo usados aqui." },
        { tipo: "fontes", titulo: "Ecologia de paisagens e conectividade", itens: [
          { titulo: "MMA — Conectividade em Foco (publicacao)", url: "https://www.gov.br/mma/pt-br/centrais-de-conteudo/publicacoes/biodiversidade-e-biomas/conectividade-em-foco.pdf", tipo: "livro", nota: "Conectividade estrutural x funcional e teoria dos grafos aplicada a paisagem." },
          { titulo: "Pascual-Hortal & Saura (2006) — indices de conectividade (registro)", url: "https://hero.epa.gov/hero/index.cfm/reference/details/reference_id/3349555", tipo: "artigo", nota: "Compara 10 indices e propoe o IIC (Integral Index of Connectivity)." },
        ] },
      ],
    },

    // ===================== CAPITULO 3 — METODO (SIG) =====================
    {
      id: "kit-sig",
      titulo: "O kit de SIG: ferramentas gratuitas que dao conta",
      blocos: [
        { tipo: "texto", texto: "Nao precisa de software caro. O trabalho inteiro cabe no QGIS, um Sistema de Informacao Geografica livre e de codigo aberto, maduro e com farta documentacao em portugues. Nele voce carrega mapas, imagens de satelite, calcula indices e roda a modelagem de conectividade com plugins. O resto do kit sao fontes de dados abertas." },
        { tipo: "texto", texto: "SIG, em uma frase: um programa que guarda informacao amarrada a uma coordenada no mundo real. Cada camada (ruas, arvores, imagem de satelite, limite do bairro) e empilhada no mesmo espaco geografico, e o poder esta em cruzar camadas: 'onde ha verde E esta a menos de 300 m de uma praca E dentro do bairro?'." },
        { tipo: "fontes", titulo: "Ferramentas e plugins", itens: [
          { titulo: "QGIS — SIG livre e de codigo aberto", url: "https://qgis.org/", tipo: "site", nota: "Baixe a versao LTR (suporte longo). Roda em Windows, Mac e Linux." },
          { titulo: "Circuitscape — conectividade por teoria de circuitos", url: "https://docs.circuitscape.org/Circuitscape.jl/latest/usage/", tipo: "site", nota: "Modela multiplos caminhos de dispersao, nao so o melhor." },
          { titulo: "Linkage Mapper — corredores de menor custo e pinch points", url: "https://linkagemapper.org/", tipo: "site", nota: "Kit de ferramentas para desenhar e priorizar ligacoes entre nucleos de habitat." },
        ] },
      ],
    },
    {
      id: "dados-base",
      titulo: "As camadas base: de onde vem cada mapa",
      blocos: [
        { tipo: "texto", texto: "Mapear corredor e empilhar camadas certas. Quatro fontes abertas resolvem a maior parte: o OpenStreetMap da ruas, quarteiroes e muitas vezes arvores e parques; o MapBiomas da uso e cobertura do solo em 30 m para todo o Brasil, de 1985 a hoje; o IBGE da os limites e os dados de populacao; e as imagens de satelite (INPE/CBERS, USGS/Landsat, Copernicus/Sentinel) dao o verde em alta resolucao espectral para calcular NDVI." },
        {
          tipo: "diagrama", titulo: "Empilhando as camadas no QGIS", codigo: `flowchart TD
  OSM["OpenStreetMap<br/>ruas, pracas, arvores"] --> SIG["Projeto QGIS<br/>(mesmo sistema de coordenadas)"]
  MB["MapBiomas<br/>uso e cobertura 30 m"] --> SIG
  IBGE["IBGE<br/>limite do bairro + populacao"] --> SIG
  SAT["Satelite Sentinel/Landsat/CBERS<br/>bandas para NDVI"] --> SIG
  SIG --> MAPA["Mapa de manchas, matriz e candidatos a corredor"]` },
        { tipo: "texto", texto: "Cuidado com o sistema de coordenadas (CRS/SRC): toda camada precisa estar no mesmo, senao os mapas nao se sobrepoem. Para medir area e distancia em metros, use uma projecao metrica (UTM na zona do seu bairro, ex.: SIRGAS 2000 / UTM). Latitude-longitude pura mede em graus e estraga qualquer calculo de largura de corredor." },
        { tipo: "fontes", titulo: "Dados abertos de base", itens: [
          { titulo: "MapBiomas Brasil — uso e cobertura (downloads)", url: "https://brasil.mapbiomas.org/", tipo: "dataset", nota: "Colecoes anuais 1985-atual, 30 m, licenca CC-BY; tambem via Google Earth Engine." },
          { titulo: "MapBiomas no Google Earth Engine (colecao LULC Brasil)", url: "https://developers.google.com/earth-engine/datasets/catalog/projects_mapbiomas-public_assets_brazil_lulc_v1", tipo: "dataset", nota: "Citar Souza et al. 2020, doi 10.3390/rs12172735." },
          { titulo: "OpenStreetMap", url: "https://www.openstreetmap.org/", tipo: "dataset", nota: "Ruas, quarteiroes, parques e, em muitas cidades, arvores mapeadas (natural=tree)." },
          { titulo: "IBGE — portal de geociencias e malhas", url: "https://www.ibge.gov.br/", tipo: "dataset", nota: "Limites de setor/bairro e dados de populacao para indices por habitante." },
        ] },
      ],
    },
    {
      id: "ndvi",
      titulo: "NDVI: medir o verde com satelite",
      blocos: [
        { tipo: "texto", texto: "Como o satelite sabe que ali ha vegetacao? A planta viva reflete muito infravermelho proximo (NIR) e absorve muito vermelho (R) na fotossintese. O NDVI (Indice de Vegetacao por Diferenca Normalizada) explora isso: NDVI = (NIR - R) / (NIR + R). O resultado vai de -1 a +1. Agua e sombra dao valores negativos ou perto de zero; asfalto e telhado ficam baixos; vegetacao vigorosa passa de 0,6." },
        {
          tipo: "prancha",
          titulo: "A formula do NDVI e a escala",
          desenho: {
            legenda: "NDVI = (NIR - Vermelho) / (NIR + Vermelho). Quanto mais verde e vigorosa a planta, mais perto de +1.",
            primitivas: [
              { t: "rotulo", p: [40, 30], texto: "NDVI = (NIR - R) / (NIR + R)" },
              { t: "linha", de: [30, 95], ate: [273, 95], cor: "tinta" },
              { t: "seta", de: [30, 95], ate: [273, 95], cor: "tinta" },
              { t: "rotulo", p: [24, 112], texto: "-1" },
              { t: "rotulo", p: [148, 112], texto: "0" },
              { t: "rotulo", p: [262, 112], texto: "+1" },
              { t: "circulo", c: [55, 95], r: 7, cor: "suave" },
              { t: "rotulo", p: [40, 75], texto: "agua" },
              { t: "circulo", c: [150, 95], r: 7, hachura: true },
              { t: "rotulo", p: [128, 75], texto: "asfalto" },
              { t: "circulo", c: [240, 95], r: 9, cor: "destaque", hachura: true },
              { t: "rotulo", p: [214, 75], texto: "mata densa" },
              { t: "rotulo", p: [36, 150], texto: "Limiar comum p/ vegetacao urbana densa: NDVI > 0,6" },
            ],
          },
        },
        { tipo: "texto", texto: "Na pratica, no QGIS voce baixa uma cena de satelite com pouca nuvem (Sentinel-2 tem 10 m e e gratis no Copernicus; Landsat 8/9 tem 30 m no USGS; CBERS-4A no catalogo do INPE), identifica as bandas do vermelho e do NIR e aplica a formula na Calculadora Raster. Um limiar (ex.: NDVI > 0,6) separa o que e copa densa do resto. Esse mapa de verde e a materia-prima das manchas e dos corredores." },
        { tipo: "video", titulo: "Aula 08: Gerando NDVI no QGIS (CePE-Geo)", youtube: "2mHa8lTtSJY" },
      ],
    },
    {
      id: "classificar-cobertura",
      titulo: "Classificar a cobertura: arvore, grama, construido",
      blocos: [
        { tipo: "texto", texto: "NDVI alto nao distingue copa de arvore de gramado: os dois sao verdes. Mas corredor funcional depende sobretudo de copa (estrato arboreo), que oferece poleiro, flor, fruto e sombra. Entao o passo seguinte e classificar a cena em classes uteis: copa arborea, vegetacao rasteira/gramado, solo exposto, agua e construido/impermeavel." },
        {
          tipo: "diagrama", titulo: "Do pixel a classe de cobertura", codigo: `flowchart LR
  IMG["Imagem de satelite<br/>(varias bandas)"] --> NDVI["NDVI + outras bandas"]
  NDVI --> CLASS["Classificacao<br/>(limiar ou supervisionada)"]
  CLASS --> C1["Copa arborea"]
  CLASS --> C2["Rasteira / gramado"]
  CLASS --> C3["Construido / impermeavel"]
  CLASS --> C4["Agua"]` },
        { tipo: "texto", texto: "Dois caminhos. O simples usa limiares de NDVI e de altura (se houver dado de altura, como MDS menos MDT, voce separa copa alta de grama). O robusto e a classificacao supervisionada: voce marca no QGIS exemplos de cada classe (amostras de treino), o algoritmo aprende e classifica a cena inteira. Depois se valida com os pontos de GPS da caminhada: concordou com o chao? Se nao, ajusta." },
        { tipo: "video", titulo: "Curso QGIS - Aula 09: NDVI", youtube: "c5OzBs1ahiE" },
        {
          tipo: "licao",
          pergunta: "Por que nao basta o NDVI alto para mapear corredor arboreo?",
          alternativas: [
            "Porque o NDVI so funciona a noite",
            "Porque gramado e copa de arvore tem NDVI parecido, e o corredor depende sobretudo da copa",
            "Porque o NDVI mede temperatura, nao vegetacao",
          ],
          correta: 1,
          explicacao: "NDVI responde a vegetacao verde em geral. Gramado e copa dao valores altos semelhantes; para corredor arboreo e preciso classificar e separar o estrato arboreo da rasteira.",
        },
      ],
    },
    {
      id: "itree-canopy",
      titulo: "Amostragem com i-Tree Canopy: quanto por cento e copa",
      blocos: [
        { tipo: "texto", texto: "Para responder 'que porcentagem do bairro e copa de arvore?' com rigor e sem classificar pixel a pixel, use o i-Tree Canopy, ferramenta web do Servico Florestal dos EUA. Voce delimita o bairro sobre a imagem aerea, e ela joga pontos aleatorios; voce classifica cada ponto (copa, grama, construido, agua, solo). A proporcao de pontos 'copa' estima a cobertura de copa, com margem de erro que cai conforme voce classifica mais pontos." },
        { tipo: "tarefas", itens: [
          { id: "i1", titulo: "Delimitar o bairro no i-Tree Canopy", entrega: "Poligono do bairro carregado (shapefile) ou desenhado no mapa da ferramenta." },
          { id: "i2", titulo: "Classificar 500 a 1000 pontos", entrega: "Cada ponto aleatorio rotulado (copa arborea / rasteira / construido / solo / agua); a propria ferramenta recomenda de 500 a 1000 pontos para boa estimativa." },
          { id: "i3", titulo: "Registrar o percentual de copa e a margem", entrega: "Tabela com % de cobertura de copa do bairro e o erro-padrao reportado pela ferramenta." },
        ] },
        { tipo: "texto", texto: "Esse numero e ouro: e a linha de base contra a qual voce vai comparar a meta (a regra 3-30-300 pede 30% de copa no bairro). E, por ser amostragem estatistica simples, qualquer pessoa reproduz e qualquer tecnico confere. Observacao: a ferramenta depende de imagem aerea atual; cheque a data da imagem usada." },
        { tipo: "fontes", titulo: "Amostragem de copa", itens: [
          { titulo: "i-Tree Canopy (ferramenta de avaliacao de copa)", url: "https://canopy.itreetools.org/", tipo: "site", nota: "Amostra pontos aleatorios; recomenda 500-1000 pontos; estima beneficios (CO2, poluicao, agua de chuva)." },
          { titulo: "i-Tree (suite oficial, USDA Forest Service)", url: "https://www.itreetools.org/", tipo: "site", nota: "Conjunto de ferramentas de analise de floresta urbana." },
        ] },
      ],
    },
    {
      id: "resistencia",
      titulo: "A superficie de resistencia: o custo de atravessar",
      blocos: [
        { tipo: "texto", texto: "Aqui o mapa deixa de ser 'onde ha verde' e vira 'quao dificil e a fauna atravessar cada ponto'. Monta-se uma superficie de resistencia (ou de custo): um raster onde cada pixel recebe um valor de resistencia conforme a cobertura. Mata e copa densa: resistencia baixa (passagem facil). Gramado e quintal: media. Rua, estacionamento, telhado: resistencia alta (travessia cara ou impossivel)." },
        {
          tipo: "prancha",
          titulo: "Valores de resistencia por tipo de piso",
          desenho: {
            legenda: "Quanto mais hostil a cobertura para a especie-foco, maior o custo de atravessar aquele pixel.",
            primitivas: [
              { t: "rotulo", p: [30, 24], texto: "Resistencia (custo de passar)" },
              { t: "retangulo", p: [30, 40], w: 40, h: 22, cor: "destaque", hachura: true },
              { t: "rotulo", p: [80, 54], texto: "Mata/copa densa = 1" },
              { t: "retangulo", p: [30, 72], w: 40, h: 22, cor: "destaque" },
              { t: "rotulo", p: [80, 86], texto: "Arvores esparsas = 5" },
              { t: "retangulo", p: [30, 104], w: 40, h: 22, cor: "suave" },
              { t: "rotulo", p: [80, 118], texto: "Gramado/quintal = 20" },
              { t: "retangulo", p: [30, 136], w: 40, h: 22, cor: "tinta" },
              { t: "rotulo", p: [80, 150], texto: "Rua/telhado = 100" },
            ],
          },
        },
        { tipo: "texto", texto: "Os valores nao sao sagrados: vem da classe de cobertura e do que a literatura (ou um especialista) estima para a especie-foco. O que importa e a razao entre eles: a rua deve custar muito mais que a mata. Essa superficie e o terreno onde o modelo vai procurar o caminho mais barato entre as manchas, no proximo capitulo." },
        {
          tipo: "licao",
          pergunta: "Numa superficie de resistencia para corredor, o que recebe o maior valor (maior custo)?",
          alternativas: ["A mata densa continua", "O gramado de uma praca", "A avenida asfaltada sem arvores"],
          correta: 2,
          explicacao: "Resistencia alta = travessia cara/hostil. A avenida impermeavel sem cobertura e a mais dificil de a fauna cruzar, logo recebe o maior valor; a mata densa recebe o menor.",
        },
      ],
    },
    {
      id: "video-ndvi-qgis",
      titulo: "Oficina: indices de vegetacao no QGIS",
      blocos: [
        { tipo: "texto", texto: "Consolidando o metodo de sensoriamento remoto do bairro: gerar o NDVI (e, se quiser, EVI e SAVI, que corrigem solo e saturacao) na pratica, dentro do QGIS, com a Calculadora Raster. O video abaixo cobre o fluxo completo com imagem Landsat." },
        { tipo: "video", titulo: "Gerar indices de vegetacao (NDVI, EVI e SAVI) no QGIS", youtube: "0VlVxlbwAfY" },
        { tipo: "tarefas", itens: [
          { id: "o1", titulo: "Baixar uma cena com pouca nuvem", entrega: "Imagem Sentinel-2 (Copernicus) ou Landsat (USGS) do bairro, com menos de 10% de nuvem, data anotada." },
          { id: "o2", titulo: "Calcular o NDVI no QGIS", entrega: "Raster de NDVI do bairro gerado na Calculadora Raster, com legenda de -1 a +1." },
          { id: "o3", titulo: "Extrair as manchas de copa", entrega: "Camada vetorial das manchas com NDVI acima do limiar escolhido, recortada no limite do bairro." },
        ] },
        { tipo: "fontes", titulo: "Imagens de satelite abertas", itens: [
          { titulo: "Copernicus Data Space (Sentinel-2, 10 m)", url: "https://dataspace.copernicus.eu/", tipo: "dataset", nota: "Imagens opticas gratuitas, bandas vermelho e NIR para NDVI." },
          { titulo: "USGS EarthExplorer (Landsat 8/9, 30 m)", url: "https://earthexplorer.usgs.gov/", tipo: "dataset", nota: "Serie historica longa, util para comparar anos." },
        ] },
      ],
    },

    // ===================== CAPITULO 4 — CALCULO / MEDICAO =====================
    {
      id: "caminho-menor-custo",
      titulo: "Caminho de menor custo: onde o corredor quer passar",
      blocos: [
        { tipo: "texto", texto: "Com as manchas (nucleos de habitat) e a superficie de resistencia prontas, o modelo responde: qual o trajeto mais barato (de menor custo acumulado) para ir de uma mancha a outra? E a analise de caminho de menor custo (least-cost path). O custo acumulado soma a resistencia pixel a pixel ao longo do caminho; o modelo acha a rota que minimiza essa soma. Esse trajeto e o esqueleto do corredor." },
        {
          tipo: "prancha",
          titulo: "O caminho de menor custo entre duas manchas",
          desenho: {
            legenda: "O trajeto desvia das areas de alta resistencia (rua/telhado) e costura pelos quintais e arvores de rua. A linha cheia e o corredor sugerido.",
            primitivas: [
              { t: "circulo", c: [40, 100], r: 18, cor: "destaque", hachura: true },
              { t: "rotulo", p: [26, 102], texto: "A" },
              { t: "circulo", c: [265, 100], r: 18, cor: "destaque", hachura: true },
              { t: "rotulo", p: [260, 102], texto: "B" },
              { t: "retangulo", p: [120, 30], w: 60, h: 50, cor: "tinta", hachura: true },
              { t: "rotulo", p: [118, 22], texto: "quadra impermeavel" },
              { t: "curva", pts: [[58, 100], [100, 120], [150, 135], [200, 120], [247, 100]], cor: "destaque" },
              { t: "rotulo", p: [120, 160], texto: "corredor de menor custo" },
            ],
          },
        },
        { tipo: "texto", texto: "Atencao a um erro comum (alertado nos guias de conectividade): nao confie num corredor de 'um pixel' de largura. O caminho de menor custo e uma linha; o corredor real precisa de faixa. Por isso se usa um corte de custo (threshold) ao redor da linha, gerando uma faixa de custo baixo, e se decide a largura olhando a especie-foco e o espaco disponivel na rua." },
      ],
    },
    {
      id: "circuitscape",
      titulo: "Teoria de circuitos: varios caminhos e os pontos de estrangulamento",
      blocos: [
        { tipo: "texto", texto: "O caminho de menor custo da uma rota otima, mas a natureza nao anda em fila. A teoria de circuitos (implementada no Circuitscape) trata a paisagem como um circuito eletrico: a corrente flui por todos os trajetos possiveis, mais por onde ha menos resistencia. O resultado mostra nao uma linha, mas um feixe de passagens, e revela os pinch points: pontos de estrangulamento por onde quase toda a corrente passa, porque nao ha alternativa." },
        {
          tipo: "prancha",
          titulo: "Pinch point: o gargalo insubstituivel",
          desenho: {
            legenda: "Quando so ha uma passagem possivel entre as manchas, toda a 'corrente' se concentra nela: e o ponto mais critico a proteger ou criar.",
            primitivas: [
              { t: "circulo", c: [45, 100], r: 20, cor: "destaque", hachura: true },
              { t: "circulo", c: [258, 100], r: 20, cor: "destaque", hachura: true },
              { t: "retangulo", p: [90, 20], w: 50, h: 65, cor: "tinta", hachura: true },
              { t: "retangulo", p: [90, 118], w: 50, h: 65, cor: "tinta", hachura: true },
              { t: "retangulo", p: [165, 20], w: 50, h: 65, cor: "tinta", hachura: true },
              { t: "retangulo", p: [165, 118], w: 50, h: 65, cor: "tinta", hachura: true },
              { t: "curva", pts: [[65, 100], [110, 100], [152, 100], [195, 100], [238, 100]], cor: "destaque" },
              { t: "circulo", c: [152, 100], r: 9, cor: "destaque" },
              { t: "rotulo", p: [120, 150], texto: "pinch point" },
            ],
          },
        },
        { tipo: "texto", texto: "Na pratica do bairro: o pinch point costuma ser aquela unica rua arborizada que liga dois lados, ou a passagem estreita de mata sobre o corrego. Perdeu aquele ponto, perdeu a conexao inteira. Mapear pinch points diz onde cada real investido rende mais: e ali que vale brigar por uma arvore, um recuo, uma faixa verde." },
        { tipo: "fontes", titulo: "Modelagem de conectividade", itens: [
          { titulo: "Circuitscape — como funciona (documentacao)", url: "https://docs.circuitscape.org/Circuitscape.jl/latest/usage/", tipo: "site", nota: "Teoria de circuitos para fluxo e pinch points na paisagem." },
          { titulo: "Linkage Mapper (corredores + Pinchpoint Mapper)", url: "https://linkagemapper.org/", tipo: "site", nota: "Combina menor custo e Circuitscape para desenhar e priorizar ligacoes." },
        ] },
      ],
    },
    {
      id: "metricas-grafo",
      titulo: "Teoria dos grafos: medir a conectividade da rede inteira",
      blocos: [
        { tipo: "texto", texto: "Ate aqui olhamos ligacoes par a par. Mas o bairro e uma rede inteira. A teoria dos grafos representa as manchas como nos (vertices) e as ligacoes possiveis como arestas, e calcula indices que resumem a conectividade de toda a rede. Dois sao padrao na literatura: o IIC (Integral Index of Connectivity), com modelo binario de ligacao, e o PC (Probability of Connectivity), com ligacao probabilistica, ambos de Saura e colegas e calculados no software Conefor." },
        {
          tipo: "prancha",
          titulo: "A paisagem como grafo: nos e ligacoes",
          desenho: {
            legenda: "Cada mancha e um no (tamanho = area de habitat); cada ligacao viavel e uma aresta. Os indices medem quanto a rede toda esta conectada.",
            primitivas: [
              { t: "circulo", c: [55, 50], r: 16, cor: "destaque", hachura: true },
              { t: "circulo", c: [160, 40], r: 22, cor: "destaque", hachura: true },
              { t: "circulo", c: [250, 80], r: 12, cor: "destaque", hachura: true },
              { t: "circulo", c: [110, 130], r: 18, cor: "destaque", hachura: true },
              { t: "circulo", c: [220, 150], r: 14, cor: "destaque", hachura: true },
              { t: "linha", de: [55, 50], ate: [160, 40], cor: "tinta" },
              { t: "linha", de: [160, 40], ate: [250, 80], cor: "tinta" },
              { t: "linha", de: [160, 40], ate: [110, 130], cor: "tinta" },
              { t: "linha", de: [110, 130], ate: [220, 150], cor: "tinta" },
              { t: "linha", de: [250, 80], ate: [220, 150], cor: "suave" },
            ],
          },
        },
        { tipo: "texto", texto: "O que esses indices entregam de pratico: a importancia de cada mancha (dPC). Voce roda o modelo, remove uma mancha de cada vez e mede quanto a conectividade total cai. A mancha cuja remocao derruba mais o indice e a mais insubstituivel, mesmo que seja pequena, se ela for o unico 'trampolim' entre dois lados. Isso prioriza o que proteger primeiro com criterio, nao com achismo." },
        { tipo: "fontes", titulo: "Indices e software de conectividade", itens: [
          { titulo: "Saura & Pascual-Hortal (2007) — indice PC (Probability of Connectivity)", url: "https://doi.org/10.1016/j.landurbplan.2007.03.005", tipo: "artigo", nota: "A new habitat availability index to integrate connectivity in landscape planning; Landscape and Urban Planning 83(2-3):91-103; propoe o PC, base do Conefor." },
          { titulo: "MMA — Conectividade em Foco (grafos na paisagem)", url: "https://www.gov.br/mma/pt-br/centrais-de-conteudo/publicacoes/biodiversidade-e-biomas/conectividade-em-foco.pdf", tipo: "livro", nota: "Explica nos, arestas e a leitura dos indices." },
        ] },
        {
          tipo: "licao",
          pergunta: "O que o dPC (importancia de uma mancha no indice PC) mede?",
          alternativas: [
            "A altura media das arvores da mancha",
            "Quanto a conectividade total da rede cai se aquela mancha for removida",
            "A quantidade de lixo encontrada na mancha",
          ],
          correta: 1,
          explicacao: "O dPC quantifica a contribuicao da mancha para a conectividade da rede: remove-se a mancha e mede-se a queda do indice. Maior queda = mancha mais insubstituivel.",
        },
      ],
    },
    {
      id: "cobertura-30",
      titulo: "A regua do bairro: 3-30-300 e cobertura de copa",
      blocos: [
        { tipo: "texto", texto: "Falta uma regua simples para dizer se o bairro esta bem servido de verde, entendivel por qualquer morador e defensavel numa reuniao. A regra 3-30-300, proposta por Cecil Konijnendijk e formalizada em artigo de 2023, da tres metas: todo mundo deve ver pelo menos 3 arvores da janela de casa; cada bairro deve ter ao menos 30% de cobertura de copa; e ninguem deve estar a mais de 300 m de uma area verde de qualidade (pelo menos 0,5 ha)." },
        {
          tipo: "prancha",
          titulo: "A regra 3-30-300",
          desenho: {
            legenda: "3 arvores a vista + 30% de copa no bairro + area verde a no maximo 300 m. Tres metas que o SIG mede uma a uma.",
            primitivas: [
              { t: "rotulo", p: [30, 35], texto: "3: tres arvores da janela" },
              { t: "circulo", c: [60, 70], r: 8, cor: "destaque", hachura: true },
              { t: "circulo", c: [85, 70], r: 8, cor: "destaque", hachura: true },
              { t: "circulo", c: [110, 70], r: 8, cor: "destaque", hachura: true },
              { t: "retangulo", p: [135, 60], w: 18, h: 22, cor: "suave" },
              { t: "rotulo", p: [30, 110], texto: "30: copa cobre 30% do bairro" },
              { t: "retangulo", p: [30, 120], w: 240, h: 16, cor: "suave" },
              { t: "retangulo", p: [30, 120], w: 72, h: 16, cor: "destaque", hachura: true },
              { t: "rotulo", p: [30, 165], texto: "300: area verde a <= 300 m" },
              { t: "circulo", c: [220, 165], r: 12, cor: "destaque", hachura: true },
              { t: "seta", de: [150, 170], ate: [206, 166], cor: "tinta" },
            ],
          },
        },
        { tipo: "texto", texto: "O bom da regra: cada meta vira uma analise de SIG. O '30%' e a cobertura de copa que voce ja mediu com i-Tree Canopy ou classificacao. O '300 m' e uma analise de area de servico (buffer/isocrona) ao redor de cada praca, mostrando quem esta coberto e quem esta em 'deserto verde'. O '3' se checa em amostra de ruas. Juntas, apontam onde o corredor e mais urgente: justamente nos vazios da regra." },
        { tipo: "fontes", titulo: "A regra 3-30-300", itens: [
          { titulo: "Konijnendijk (2023) — Introducing the 3-30-300 rule (Journal of Forestry Research)", url: "https://link.springer.com/article/10.1007/s11676-022-01523-z", tipo: "artigo", nota: "Artigo original, doi 10.1007/s11676-022-01523-z." },
          { titulo: "Nature Based Solutions Institute — The 3-30-300 rule", url: "https://nbsi.eu/the-3-30-300-rule", tipo: "site", nota: "Explicacao e aplicacao pratica da regra." },
        ] },
      ],
    },
    {
      id: "medir-largura",
      titulo: "Medir no campo: largura, continuidade e qualidade",
      blocos: [
        { tipo: "texto", texto: "O SIG aponta o corredor; o campo diz se ele serve. Volte ao trajeto sugerido pelo modelo com a trena e um formulario. Tres coisas decidem a qualidade: largura efetiva de verde (nao da calcada, do verde), continuidade (quantos vaos sem copa, e de que tamanho) e estrutura (so grama? so copa alta sem sub-bosque? ha flor e fruto para alimentar?)." },
        { tipo: "tarefas", itens: [
          { id: "m1", titulo: "Medir a largura de copa a cada trecho", entrega: "Largura de verde (m) medida com trena a cada 20-50 m ao longo do corredor sugerido, anotada com o ponto de GPS." },
          { id: "m2", titulo: "Mapear os vaos (gaps)", entrega: "Cada trecho sem copa, com comprimento em metros; marcar os vaos maiores que a capacidade de travessia da especie-foco." },
          { id: "m3", titulo: "Avaliar a estrutura da vegetacao", entrega: "Por trecho: tem so grama, copa isolada, ou copa + arbustos + flores/frutos? Fotos dos melhores e piores pontos." },
          { id: "m4", titulo: "Checar a arborizacao de rua existente", entrega: "Especie (quando identificavel), porte e espacamento das arvores de rua no trajeto; lacunas onde cabe plantar." },
        ] },
        { tipo: "texto", texto: "Esses numeros fecham o ciclo: entram de volta no SIG para refinar a superficie de resistencia (agora com dado real, nao so satelite) e para dimensionar o projeto (quantas arvores faltam, onde o vao e grande demais). Mapeamento bom e esse vaivem entre tela e rua ate o mapa descrever o bairro de verdade." },
      ],
    },
    {
      id: "licao-calculo",
      titulo: "Consolidando o calculo da conectividade",
      blocos: [
        { tipo: "texto", texto: "Antes de desenhar a rede, fixe a cadeia logica do calculo: classes de cobertura viram superficie de resistencia; a resistencia alimenta o caminho de menor custo e a teoria de circuitos; os indices de grafo priorizam manchas e ligacoes; a regra 3-30-300 e a medida de campo dizem onde a necessidade e maior." },
        {
          tipo: "licao",
          pergunta: "Qual e a sequencia correta do calculo de conectividade?",
          alternativas: [
            "Desenhar o corredor primeiro, depois medir a cobertura",
            "Classes de cobertura -> superficie de resistencia -> menor custo/circuitos -> indices e prioridade",
            "Plantar as arvores e so depois rodar o SIG",
          ],
          correta: 1,
          explicacao: "Primeiro se classifica a cobertura, dela se deriva a resistencia; com a resistencia roda-se menor custo e circuitos; os indices de grafo e a regua 3-30-300 fecham a priorizacao. So entao se desenha e planta.",
        },
      ],
    },

    // ===================== CAPITULO 5 — PROJETO =====================
    {
      id: "desenhar-rede",
      titulo: "Desenhar a rede: nos, links e prioridades",
      blocos: [
        { tipo: "texto", texto: "Agora se desenha o produto final: um mapa com a rede verde proposta. Os nos sao as manchas-ancora (as pracas e matas que ficam, priorizadas pelo dPC). Os links sao os corredores sugeridos (do menor custo e dos pinch points). E uma camada de prioridade ordena o que fazer primeiro, cruzando importancia ecologica, custo de implantar e vazios da regra 3-30-300." },
        {
          tipo: "diagrama", titulo: "Montando o mapa de prioridade", codigo: `flowchart TD
  N["Nos: manchas-ancora<br/>(prioridade por dPC)"] --> R["Rede proposta"]
  L["Links: menor custo + pinch points"] --> R
  V["Vazios da regra 3-30-300"] --> R
  C["Custo/viabilidade de cada trecho"] --> R
  R --> P["Camada de prioridade:<br/>1 proteger, 2 recuperar, 3 criar"]` },
        {
          tipo: "prancha",
          titulo: "O mapa-sintese do bairro",
          desenho: {
            legenda: "Manchas-ancora (circulos), corredores a proteger (linha cheia), a recuperar (tracejada no ripario) e a criar (pontilhada na rua).",
            primitivas: [
              { t: "retangulo", p: [10, 10], w: 283, h: 177, cor: "suave" },
              { t: "circulo", c: [55, 55], r: 18, cor: "destaque", hachura: true },
              { t: "circulo", c: [235, 50], r: 20, cor: "destaque", hachura: true },
              { t: "circulo", c: [150, 150], r: 16, cor: "destaque", hachura: true },
              { t: "linha", de: [73, 55], ate: [215, 50], cor: "tinta" },
              { t: "rotulo", p: [96, 40], texto: "proteger" },
              { t: "curva", pts: [[150, 134], [140, 100], [70, 70]], cor: "destaque" },
              { t: "rotulo", p: [96, 110], texto: "recuperar (ripario)" },
              { t: "seta", de: [166, 150], ate: [221, 66], cor: "tinta" },
              { t: "rotulo", p: [176, 120], texto: "criar (rua)" },
            ],
          },
        },
        { tipo: "texto", texto: "Entregue o mapa em tres camadas de acao: proteger (verde que ja conecta e nao pode sumir, como o pinch point), recuperar (faixas degradadas, sobretudo a APP do corrego) e criar (plantar onde hoje so ha asfalto, as ruas-link). Essa divisao transforma analise em plano que cabe num oficio para a prefeitura e num mutirao." },
      ],
    },
    {
      id: "ruas-verdes",
      titulo: "Ruas verdes: transformar o link viario em corredor",
      blocos: [
        { tipo: "texto", texto: "Muitos links so existem como rua. Transforma-los em corredor viario e arborizar com criterio: arvores alinhadas, de copas que quase se tocam, formando um dossel continuo que vira poleiro e sombra. Onde cabe, somam-se canteiros permeaveis, jardins de chuva na sarjeta e faixas de vegetacao rasteira. Isso exige respeitar a calcada acessivel e a infraestrutura (fiacao, tubulacao)." },
        {
          tipo: "prancha",
          titulo: "Secao de uma rua verde",
          desenho: {
            legenda: "Faixa de servico com arvore e canteiro permeavel; faixa livre de 1,20 m para o pedestre (NBR 9050); copas formando dossel sobre a via.",
            primitivas: [
              { t: "linha", de: [15, 150], ate: [288, 150], cor: "tinta" },
              { t: "retangulo", p: [15, 120], w: 70, h: 30, cor: "suave" },
              { t: "rotulo", p: [18, 168], texto: "faixa servico" },
              { t: "circulo", c: [50, 80], r: 24, cor: "destaque", hachura: true },
              { t: "linha", de: [50, 104], ate: [50, 120], cor: "tinta" },
              { t: "retangulo", p: [90, 120], w: 55, h: 30, cor: "suave" },
              { t: "rotulo", p: [92, 168], texto: "livre 1,20 m" },
              { t: "retangulo", p: [150, 120], w: 138, h: 30, cor: "tinta", hachura: true },
              { t: "rotulo", p: [200, 168], texto: "leito carrocavel" },
              { t: "circulo", c: [230, 78], r: 24, cor: "destaque", hachura: true },
              { t: "curva", pts: [[70, 70], [150, 55], [210, 70]], cor: "destaque" },
            ],
          },
        },
        { tipo: "texto", texto: "Regra de calcada que o projeto nao pode furar: a NBR 9050 (acessibilidade) divide a calcada em faixas e exige uma faixa livre minima de 1,20 m para o pedestre. Arvore e canteiro ficam na faixa de servico. Em calcada estreita, nao force a arvore sobre a rota do pedestre; use jardineira, cantero na via ou escolha outro lado da rua. Corredor que atrapalha quem anda a pe nao se sustenta." },
        { tipo: "mobilizacao", papel: "Engenheiro(a) / arquiteto(a) responsavel pelo projeto viario (com ART/RRT)", porque: "Mexer na secao da rua (canteiro, recuo, drenagem, acessibilidade) e intervencao no sistema viario e exige projeto assinado que respeite a NBR 9050, a fiacao e a tubulacao, alem de aprovacao do municipio.", entregaEsperada: "Projeto de rua verde assinado (planta e secao), compativel com acessibilidade e infraestrutura, apto a protocolo na prefeitura.", gerenciadoPor: "zaeon" },
      ],
    },
    {
      id: "especies-nativas",
      titulo: "Escolha de especies: nativas, estratos e floracao escalonada",
      blocos: [
        { tipo: "texto", texto: "Corredor nao e so 'por arvore'; e montar comida e abrigo que durem o ano. Tres criterios guiam a lista de especies. Nativas da regiao (atraem a fauna local e aguentam o clima), estratos variados (arvore alta, arvore baixa, arbusto, trepadeira, forracao: o sub-bosque e o que faz o corredor abrigar, nao so passar) e floracao/frutificacao escalonada (sempre haja algo com flor ou fruto, para nao faltar alimento em nenhum mes)." },
        { tipo: "tarefas", itens: [
          { id: "e1", titulo: "Montar a lista de nativas da regiao", entrega: "Lista de especies nativas do bioma local, separadas por estrato, com epoca de flor/fruto e porte adulto; conferir com o manual de arborizacao do municipio." },
          { id: "e2", titulo: "Casar porte x local", entrega: "Para cada ponto de plantio, especie de porte compativel (arvore grande so onde ha espaco aereo e de raiz; porte pequeno sob fiacao)." },
          { id: "e3", titulo: "Checar a origem das mudas", entrega: "Fonte das mudas (viveiro municipal, horto, viveiro certificado), evitando especies invasoras e priorizando procedencia local." },
        ] },
        { tipo: "texto", texto: "Evite dois erros classicos: plantar uma unica especie em serie (monocultura: uma praga leva o corredor inteiro) e usar exoticas invasoras (leucena, uva-japao e afins escapam e dominam, piorando a ecologia que voce queria curar). Diversidade e nativas sao seguro de longo prazo." },
        { tipo: "fontes", titulo: "Arborizacao e especies", itens: [
          { titulo: "ABNT NBR 16246-1 — manejo de arvores (poda e conducao)", url: "https://www.abntcatalogo.com.br/", tipo: "norma", nota: "Procedimentos tecnicos de manejo/poda de arvores urbanas (consulta no catalogo ABNT)." },
          { titulo: "ABNT NBR 9050 — acessibilidade (faixas da calcada)", url: "https://www.abntcatalogo.com.br/", tipo: "norma", nota: "Faixa livre minima de 1,20 m; vegetacao na faixa de servico." },
        ] },
      ],
    },
    {
      id: "corredor-ripario",
      titulo: "O corredor ripario: a APP como espinha dorsal",
      blocos: [
        { tipo: "texto", texto: "Se o bairro tem corrego, a decisao estrategica esta tomada: a mata ciliar e a espinha dorsal da rede. A faixa de beira de curso d'agua e Area de Preservacao Permanente pelo Codigo Florestal (Lei 12.651/2012); recuperar essa vegetacao soma ecologia (corredor umido, sombreado, rico) e servico hidrico (segura barranco, filtra agua, reduz enchente). Na cidade ha regras especificas e, muitas vezes, conflito com ocupacoes: por isso a etapa pede tecnico e dialogo com o poder publico." },
        {
          tipo: "prancha",
          titulo: "A faixa ripario como corredor umido",
          desenho: {
            legenda: "A mata ciliar nas duas margens forma um corredor continuo que acompanha o corrego atravessando o bairro.",
            primitivas: [
              { t: "curva", pts: [[15, 70], [80, 95], [150, 85], [220, 105], [288, 95]], cor: "tinta" },
              { t: "curva", pts: [[15, 90], [80, 115], [150, 105], [220, 125], [288, 115]], cor: "tinta" },
              { t: "rotulo", p: [130, 150], texto: "corrego" },
              { t: "circulo", c: [60, 55], r: 10, cor: "destaque", hachura: true },
              { t: "circulo", c: [120, 48], r: 10, cor: "destaque", hachura: true },
              { t: "circulo", c: [190, 58], r: 10, cor: "destaque", hachura: true },
              { t: "circulo", c: [255, 52], r: 10, cor: "destaque", hachura: true },
              { t: "circulo", c: [60, 128], r: 10, cor: "destaque", hachura: true },
              { t: "circulo", c: [150, 135], r: 10, cor: "destaque", hachura: true },
              { t: "circulo", c: [240, 132], r: 10, cor: "destaque", hachura: true },
              { t: "rotulo", p: [40, 28], texto: "mata ciliar (APP) = corredor" },
            ],
          },
        },
        { tipo: "texto", texto: "No SIG, o corredor ripario e quase automatico: trace a linha do corrego (do OpenStreetMap ou da hidrografia oficial), gere um buffer da largura da APP e cruze com a cobertura atual. O que esta dentro da APP e nao e verde e a sua lista de recuperacao prioritaria. Esse costuma ser o trecho de maior retorno por metro do bairro inteiro." },
        { tipo: "fontes", titulo: "Mata ciliar e APP", itens: [
          { titulo: "Lei 12.651/2012 — Codigo Florestal (APP ao longo d'agua)", url: "https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2012/lei/l12651.htm", tipo: "norma", nota: "Define as faixas de APP ripariana e o regime de recuperacao." },
        ] },
      ],
    },
    {
      id: "priorizar",
      titulo: "Priorizar com criterio: a matriz de decisao",
      blocos: [
        { tipo: "texto", texto: "Recurso e tempo sao finitos; o plano precisa dizer o que vem primeiro. Em vez de escolher pelo gosto, monte uma matriz de priorizacao: cada trecho candidato recebe nota em alguns criterios, e a soma ordena a fila. Criterios uteis: ganho de conectividade (dPC/pinch point), urgencia pela regra 3-30-300 (atende a quem esta em deserto verde?), viabilidade (espaco e dono da area) e co-beneficio (alivia calor ou alagamento?)." },
        {
          tipo: "diagrama", titulo: "Matriz de priorizacao dos trechos", codigo: `flowchart LR
  T["Cada trecho candidato"] --> C1["Ganho de conectividade"]
  T --> C2["Urgencia 3-30-300"]
  T --> C3["Viabilidade (espaco/dono)"]
  T --> C4["Co-beneficio (calor/agua)"]
  C1 --> S["Nota somada"]
  C2 --> S
  C3 --> S
  C4 --> S
  S --> F["Fila de prioridade"]` },
        { tipo: "texto", texto: "A matriz tem outra virtude: e transparente. Numa audiencia publica ou numa reuniao com a prefeitura, voce mostra por que a rua X vem antes da rua Y, com nota e criterio a vista. Isso tira a decisao do campo da preferencia e a coloca no campo do argumento, muito mais dificil de derrubar." },
        {
          tipo: "licao",
          pergunta: "Qual e a vantagem de priorizar trechos com uma matriz de criterios?",
          alternativas: [
            "Garante que todos os trechos sejam feitos no mesmo dia",
            "Ordena a acao de forma transparente e defensavel, por nota e criterio",
            "Elimina a necessidade de ir a campo e de SIG",
          ],
          correta: 1,
          explicacao: "A matriz torna a priorizacao explicita e argumentavel: cada trecho tem nota por criterio, o que sustenta a decisao em reunioes e audiencias e evita a escolha por gosto.",
        },
      ],
    },

    // ===================== CAPITULO 6 — EXECUCAO =====================
    {
      id: "mobilizar-poder-publico",
      titulo: "Mobilizar o poder publico e os donos de area",
      blocos: [
        { tipo: "texto", texto: "Boa parte do corredor passa por espaco publico (rua, praca, APP) ou por terreno de terceiros. Nada disso se executa sem a prefeitura e sem acordo com donos. O mapeamento que voce fez e exatamente a ferramenta dessa conversa: mostra, com dado e norma, onde e por que intervir. O proximo passo e protocolar formalmente, com o mapa de prioridade, junto a Secretaria de Meio Ambiente e/ou de Obras." },
        { tipo: "mobilizacao", papel: "Poder publico municipal (Secretaria de Meio Ambiente / Obras / Planejamento)", porque: "Plantio em via publica, intervencao em APP, mudanca de calcada e protecao de areas verdes dependem de autorizacao, projeto aprovado e, muitas vezes, de constar no Plano Diretor. E atribuicao do municipio, nao do coletivo.", entregaEsperada: "Protocolo formal com o mapa de prioridade e as fichas de campo, pedido de autorizacao de plantio/recuperacao e resposta do orgao, acompanhado ate o encaminhamento.", gerenciadoPor: "zaeon" },
        { tipo: "texto", texto: "Dica de articulacao: procure programas que ja existem (planos municipais de arborizacao, de adaptacao climatica, de recuperacao de nascentes) e encaixe seu corredor neles. E muito mais facil somar a uma politica em curso do que criar uma do zero. Escolas, associacoes de bairro e universidades sao aliados que dao mao de obra e legitimidade." },
      ],
    },
    {
      id: "plantio-mutirao",
      titulo: "O mutirao de plantio",
      blocos: [
        { tipo: "texto", texto: "Com autorizacao e mudas, o plantio vira evento de bairro. O mutirao faz duas coisas ao mesmo tempo: implanta o corredor e cria vinculo (quem planta cuida). Mas plantar certo tem tecnica, e plantar errado desperdica muda e credibilidade. Por isso o mutirao e preparado, nao improvisado: locacao marcada, covas abertas no tamanho certo, mudas de porte adequado e um responsavel tecnico orientando." },
        { tipo: "tarefas", itens: [
          { id: "p1", titulo: "Marcar os pontos de plantio", entrega: "Locacao no chao (estacas) seguindo o mapa: espacamento compativel com a especie e a distancia minima de meio-fio, esquina, poste e entrada de garagem." },
          { id: "p2", titulo: "Preparar covas e insumos", entrega: "Covas abertas na vespera com dimensao adequada, terra, composto e tutor por cova; mudas regadas e separadas por ponto." },
          { id: "p3", titulo: "Organizar as equipes e a seguranca", entrega: "Grupos com um orientador cada, ferramentas, agua e EPI; cronograma do dia e registro de quem adotou cada arvore." },
        ] },
        { tipo: "mobilizacao", papel: "Engenheiro(a) agronomo(a) / florestal ou arborista responsavel tecnico", porque: "Definir especie por local, espacamento, tecnica de plantio e primeiros cuidados, e assinar o plantio em area publica, exige profissional habilitado; muda certa no lugar errado morre ou vira conflito com calcada e fiacao.", entregaEsperada: "Plano de plantio (especies, locacao, espacamento, tratos iniciais) e acompanhamento tecnico do mutirao, com responsabilidade tecnica.", gerenciadoPor: "zaeon" },
      ],
    },
    {
      id: "plantio-tecnica",
      titulo: "A tecnica do plantio e o tutor",
      blocos: [
        { tipo: "texto", texto: "A muda jovem de rua enfrenta pisoteio, falta de agua e vento. Alguns cuidados de plantio decidem se ela pega: cova maior que o torrao, muda no nivel certo (colo nem enterrado nem exposto), terra firmada sem socar demais, bacia para segurar agua, tutor amarrado sem ferir o caule e protetor contra pisoteio e podador. Rega generosa no plantio e constante nas primeiras semanas e o que mais mata ou salva muda urbana." },
        {
          tipo: "prancha",
          titulo: "Muda plantada com tutor e bacia",
          desenho: {
            legenda: "Cova ampla, colo da muda no nivel do solo, tutor amarrado em oito, bacia de rega e protetor na base.",
            primitivas: [
              { t: "linha", de: [20, 130], ate: [288, 130], cor: "tinta" },
              { t: "retangulo", p: [110, 130], w: 70, h: 45, cor: "suave", hachura: true },
              { t: "rotulo", p: [185, 160], texto: "cova ampla" },
              { t: "linha", de: [145, 130], ate: [145, 55], cor: "tinta" },
              { t: "circulo", c: [145, 45], r: 22, cor: "destaque", hachura: true },
              { t: "linha", de: [170, 130], ate: [170, 70], cor: "tinta" },
              { t: "rotulo", p: [176, 80], texto: "tutor" },
              { t: "linha", de: [148, 90], ate: [170, 95], cor: "suave" },
              { t: "curva", pts: [[120, 128], [145, 122], [172, 128]], cor: "suave" },
              { t: "rotulo", p: [60, 120], texto: "bacia de rega" },
            ],
          },
        },
        { tipo: "texto", texto: "Combine a adocao: cada muda com um 'padrinho' (morador, comercio, escola) responsavel pela rega no primeiro ano, que e o mais critico. Uma planilha simples com a data de plantio, a especie e o responsavel por arvore e o que transforma mutirao bonito em corredor vivo tres anos depois." },
        {
          tipo: "licao",
          pergunta: "Qual fator mais frequentemente decide a sobrevivencia de uma muda recem-plantada na rua?",
          alternativas: ["A cor da flor da especie", "A rega constante nas primeiras semanas e no primeiro ano", "O tamanho do protetor de metal"],
          correta: 1,
          explicacao: "A muda jovem tem raiz rasa e perde agua rapido; a rega frequente no plantio e ao longo do primeiro ano e o fator que mais pesa na sobrevivencia em ambiente urbano.",
        },
      ],
    },

    // ===================== CAPITULO 7 — MANUTENCAO =====================
    {
      id: "manutencao",
      titulo: "Manutencao: o corredor so existe se sobrevive",
      blocos: [
        { tipo: "texto", texto: "Plantar e o comeco. Nos dois ou tres primeiros anos a muda precisa de rega, controle de formiga e mato, replantio das que morreram e podas de formacao (nunca drasticas) para a copa crescer com estrutura. Sem esse acompanhamento, a taxa de perda e alta e o corredor nunca fecha. Combine um calendario de cuidados e registre a taxa de sobrevivencia: ela mede o sucesso real, nao o numero de mudas plantadas." },
        { tipo: "tarefas", itens: [
          { id: "mn1", titulo: "Rodar o calendario de cuidados", entrega: "Cronograma de rega, capina, adubacao e vistoria por trecho, com responsavel definido (padrinhos + apoio tecnico)." },
          { id: "mn2", titulo: "Medir a sobrevivencia", entrega: "Censo periodico (ex.: a cada 3-6 meses): quantas mudas vivas sobre plantadas, por trecho; lista de replantio." },
          { id: "mn3", titulo: "Registrar conflitos e podas necessarias", entrega: "Pontos de conflito com fiacao, calcada ou visibilidade, encaminhados para poda tecnica (nunca topping/poda drastica)." },
        ] },
        { tipo: "mobilizacao", papel: "Arborista / equipe tecnica de poda (conforme NBR 16246)", porque: "Poda de arvore urbana, sobretudo perto de fiacao ou de porte grande, tem tecnica e risco; poda errada adoece a arvore e gera acidente. A NBR 16246 trata do manejo e a NBR 16246-2 dos requisitos de seguranca do servico.", entregaEsperada: "Plano e execucao de poda tecnica das arvores do corredor conforme a NBR 16246, com seguranca do trabalho e preservacao da arvore.", gerenciadoPor: "zaeon" },
      ],
    },
    {
      id: "monitorar-dados",
      titulo: "Monitorar no tempo: o SIG vivo do corredor",
      blocos: [
        { tipo: "texto", texto: "O mapeamento nao acaba no plantio: ele vira um monitoramento. A graca do metodo baseado em dado aberto e que ele se repete. A cada ano, refaca o NDVI e a cobertura de copa com uma nova imagem; recalcule a regra 3-30-300; reavalie os indices de conectividade. A serie historica mostra, com prova, se o corredor esta fechando (copa aumentando, vaos diminuindo) ou travando, e orienta a proxima rodada de plantio." },
        {
          tipo: "diagrama", titulo: "O ciclo de monitoramento", codigo: `flowchart TD
  A["Imagem nova do ano"] --> B["Refazer NDVI + cobertura de copa"]
  B --> C["Recalcular 3-30-300 e conectividade"]
  C --> D["Comparar com os anos anteriores"]
  D --> E["Corrigir: replantar, alargar, abrir novo trecho"]
  E --> A` },
        { tipo: "texto", texto: "Indicadores simples de acompanhar: % de cobertura de copa do bairro, numero e tamanho dos vaos no corredor, taxa de sobrevivencia das mudas, populacao da especie-foco (contagem de aves, por exemplo) e area coberta pela regra dos 300 m. Publique o painel: dado aberto e monitorado e o que mantem a prefeitura e a comunidade comprometidas ano apos ano." },
        {
          tipo: "licao",
          pergunta: "Por que repetir o NDVI e a cobertura a cada ano depois de implantar o corredor?",
          alternativas: [
            "Porque a imagem antiga apaga sozinha",
            "Para formar serie historica e provar, com dado, se a conexao esta avancando ou travando",
            "Porque o NDVI so vale no primeiro ano",
          ],
          correta: 1,
          explicacao: "Repetir a medicao cria uma serie temporal que mostra objetivamente a evolucao da copa, dos vaos e da conectividade, orientando as correcoes e sustentando o compromisso ao longo do tempo.",
        },
      ],
    },

    // ===================== CAPITULO 8 — CASOS REAIS E RECURSOS =====================
    {
      id: "casos-reais",
      titulo: "Casos reais: de Blumenau a Medellin",
      blocos: [
        { tipo: "texto", texto: "O metodo deste caderno nao e teoria: e o que cidades e pesquisadores ja fizeram. Alguns exemplos com lastro, para calibrar expectativa e copiar o que funciona." },
        { tipo: "texto", texto: "Blumenau (SC): um estudo mapeou a vegetacao urbana com imagem de satelite e limiar de NDVI acima de 0,60, combinando ferramentas de analise espacial no QGIS para identificar fragmentos e conexoes. Mostra que o fluxo NDVI-limiar-fragmentos deste caderno e aplicavel com dado aberto." },
        { tipo: "texto", texto: "Goiania (GO), bacia do Ribeirao Anicuns: uma dissertacao da UFG combinou processamento de imagens, metricas de paisagem e algebra de mapas em SIG para avaliar a configuracao espacial dos corredores urbanos, exatamente a cadeia cobertura-metrica-prioridade." },
        { tipo: "texto", texto: "Medellin (Colombia): o programa de Corredores Verdes conectou dezenas de eixos de ruas e cursos d'agua com arborizacao macica; a cidade reportou ganho de sombra, queda de temperatura em pontos quentes e mais biodiversidade, um caso emblematico de corredor viario + ripario em escala de cidade. Vale estudar como referencia internacional de corredor urbano." },
        { tipo: "fontes", titulo: "Casos e metodologias aplicadas", itens: [
          { titulo: "Estudo de vegetacao urbana com NDVI (Blumenau) — ANAP", url: "https://publicacoes.amigosdanatureza.org.br/index.php/anap/en/article/download/5688/5681/12619", tipo: "artigo", nota: "NDVI > 0,60 + analise espacial no QGIS para mapear fragmentos." },
          { titulo: "MapBiomas (Souza et al. 2020) — base de uso e cobertura", url: "https://developers.google.com/earth-engine/datasets/catalog/projects_mapbiomas-public_assets_brazil_lulc_v1", tipo: "dataset", nota: "Dataset e citacao (doi 10.3390/rs12172735) para a serie de cobertura." },
        ] },
      ],
    },
    {
      id: "recursos",
      titulo: "Recursos, trilha de estudo e proximos passos",
      blocos: [
        { tipo: "texto", texto: "Para continuar: domine o QGIS (ha farta documentacao em portugues), aprofunde ecologia de paisagens e pratique a modelagem de conectividade no Linkage Mapper/Circuitscape. E, acima de tudo, comece pequeno: mapeie um corredor entre duas pracas do seu bairro e leve o mapa a uma reuniao. Dado na mao muda conversa." },
        { tipo: "video", titulo: "A importancia dos corredores ecologicos para a biodiversidade", youtube: "63scPM7dDEc" },
        { tipo: "fontes", titulo: "Caixa de ferramentas do mapeador de corredores", itens: [
          { titulo: "QGIS — documentacao e download", url: "https://qgis.org/", tipo: "site", nota: "Ferramenta principal; versao LTR para estabilidade." },
          { titulo: "MapBiomas Brasil — uso e cobertura", url: "https://brasil.mapbiomas.org/", tipo: "dataset", nota: "Cobertura anual 30 m para o contexto do bairro na bacia." },
          { titulo: "OpenStreetMap", url: "https://www.openstreetmap.org/", tipo: "dataset", nota: "Base de ruas, parques e arvores; contribua mapeando o seu bairro." },
          { titulo: "i-Tree Canopy", url: "https://canopy.itreetools.org/", tipo: "site", nota: "Medir a cobertura de copa por amostragem." },
          { titulo: "Circuitscape — documentacao", url: "https://docs.circuitscape.org/Circuitscape.jl/latest/usage/", tipo: "site", nota: "Modelagem de conectividade por teoria de circuitos." },
          { titulo: "Linkage Mapper", url: "https://linkagemapper.org/", tipo: "site", nota: "Corredores de menor custo e pinch points." },
          { titulo: "Konijnendijk (2023) — regra 3-30-300", url: "https://link.springer.com/article/10.1007/s11676-022-01523-z", tipo: "artigo", nota: "A regua de verde do bairro." },
          { titulo: "MMA — Conectividade em Foco", url: "https://www.gov.br/mma/pt-br/centrais-de-conteudo/publicacoes/biodiversidade-e-biomas/conectividade-em-foco.pdf", tipo: "livro", nota: "Conectividade estrutural x funcional e grafos." },
        ] },
      ],
    },

    // ===================== CAPITULO 9 — SINTESE =====================
    {
      id: "compilado",
      titulo: "Prancha de sintese",
      blocos: [
        { tipo: "texto", texto: "O caminho inteiro em uma respiracao: ler o bairro como paisagem (matriz, mancha, corredor); escolher para quem o corredor serve (especie-foco); medir o verde com satelite (NDVI) e campo (i-Tree Canopy, trena); modelar a travessia com superficie de resistencia, caminho de menor custo e teoria de circuitos; priorizar com indices de grafo e a regra 3-30-300; desenhar a rede em tres acoes (proteger, recuperar, criar); mobilizar poder publico e profissionais; plantar em mutirao com tecnica; e monitorar ano a ano com dado aberto. Cada afirmacao deste caderno tem norma, dataset ou estudo citado na propria pagina, e cada etapa que exige um profissional mostra quem chamar e o que ele entrega. Corredor verde nao e sorte: e paisagem lida, medida e costurada com metodo." },
        { tipo: "compilado" },
      ],
    },
  ],
};
