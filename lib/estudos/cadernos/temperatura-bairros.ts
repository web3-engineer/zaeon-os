import type { CadernoEstudo } from "../cadernosEstudo";

/**
 * Caderno de campo: Ilhas de calor urbanas, comparando a temperatura entre bairros.
 * Conteudo com lastro: WMO-No. 1292 (2023) "Guidance on Measuring, Modelling and Monitoring
 * the Canopy Layer Urban Heat Island (CL-UHI)", classificacao de Zonas Climaticas Locais de
 * Stewart & Oke (2012, BAMS, doi 10.1175/BAMS-D-11-00019.1), guias do US EPA sobre heat
 * islands, produto Landsat Collection 2 Level-2 Surface Temperature (USGS/NASA), dados do
 * INMET (BDMEP), cobertura do solo do MapBiomas, o framework WUDAPT/LCZ, as campanhas de
 * ciencia cidada NIHHIS-CAPA Heat Watch (NOAA) e estudos de caso brasileiros publicados. As
 * etapas que exigem calibracao metrologica ou responsavel tecnico viram blocos de mobilizacao.
 * Videos verificados um a um (ids reais, 11 chars).
 */
export const caderno: CadernoEstudo = {
  id: "temperatura-bairros",
  titulo: "Ilhas de calor: comparar a temperatura entre bairros",
  resumo:
    "Da fisica ao mapa: como uma pessoa ou um coletivo prova, com metodo, que um bairro e mais quente que o vizinho. Entender por que a cidade esquenta, escolher entre estacao fixa, transecto movel e satelite, medir com abrigo e calibracao, calcular a intensidade da ilha de calor, cruzar com vegetacao e uso do solo e levar o mapa a quem decide onde plantar e onde esfriar. Cada numero tem norma, dataset ou estudo citado na propria pagina.",
  paginas: [
    // ===================== CAPITULO 1 — CONTEXTO =====================
    {
      id: "abertura",
      titulo: "Como usar este caderno de campo",
      blocos: [
        { tipo: "texto", texto: "Este caderno acompanha quem quer saber, com prova, se um bairro e mais quente que outro e por que. Cada pagina traz leitura curta, um desenho ou diagrama, tarefas de campo e a fonte que sustenta a afirmacao. Nada aqui e opiniao: quando aparece um numero, ele vem de norma, dataset publico ou estudo citado na propria pagina." },
        { tipo: "texto", texto: "Regra do caderno: antes de concluir, meca; antes de medir, calibre e planeje; e antes de comparar dois bairros, garanta que mediu a mesma coisa, do mesmo jeito, na mesma hora. Quando a etapa exigir calibracao metrologica ou um responsavel tecnico, a pagina mostra um campo de mobilizacao que abre a vaga e acompanha ate ficar pronto. Voce observa, percorre e registra; o profissional assina o que precisa de assinatura." },
        { tipo: "diagrama", titulo: "O percurso do caderno", codigo: `flowchart TD
  A["Contexto: por que a cidade esquenta"] --> B["Fisica: balanco de energia e causas"]
  B --> C["Metodo: fixo, transecto, satelite"]
  C --> D["Medicao: abrigo, calibracao, intensidade"]
  D --> E["Projeto: campanha e mapa de calor"]
  E --> F["Execucao: campo, seguranca, QA/QC"]
  F --> G["Mitigacao: arvores, telhados, pavimento"]
  G --> H["Casos reais"]
  H --> I["Prancha de sintese"]` },
      ],
    },
    {
      id: "o-que-e-ilha-calor",
      titulo: "O que e uma ilha de calor urbana",
      blocos: [
        { tipo: "texto", texto: "Ilha de calor urbana (ICU, ou UHI em ingles) e a diferenca de temperatura entre a cidade e o campo ao redor: a mancha urbana forma uma ilha quente sobre um mar mais fresco. A intensidade da ilha e justamente essa diferenca, a temperatura urbana menos a rural de referencia, medida ao mesmo tempo. Nao e o calor da cidade em si, e o excedente que a cidade cria." },
        { tipo: "texto", texto: "O fenomeno foi descrito pela primeira vez por Luke Howard, que no inicio do seculo XIX comparou o ar do centro de Londres com o do campo e viu o centro mais quente, sobretudo a noite. Desde entao, a ilha de calor virou um dos efeitos mais bem documentados do clima urbano, e a boa noticia e que ela e mensuravel: compara-se temperatura, nao sensacao." },
        {
          tipo: "licao",
          pergunta: "O que e, tecnicamente, a intensidade de uma ilha de calor urbana?",
          alternativas: [
            "A maior temperatura registrada na cidade no ano",
            "A diferenca entre a temperatura urbana e a rural de referencia, medidas ao mesmo tempo",
            "A media anual de temperatura do municipio",
          ],
          correta: 1,
          explicacao: "A intensidade da ICU e um delta: temperatura urbana menos temperatura rural de referencia, medidas simultaneamente. Sem o par e sem a simultaneidade, nao ha intensidade de ilha de calor.",
        },
        { tipo: "video", titulo: "What is an urban heat island?", youtube: "0Wevbkcg43g" },
      ],
    },
    {
      id: "por-que-importa",
      titulo: "Por que medir isso importa",
      blocos: [
        { tipo: "texto", texto: "A ilha de calor nao e so desconforto. Noites mais quentes elevam a mortalidade e a internacao durante ondas de calor, porque o corpo nao descansa do calor do dia. Segundo o US EPA, em areas urbanas a temperatura do ar fica, em media, cerca de 1 a 7 graus Fahrenheit (cerca de 0,5 a 4 graus Celsius) acima do entorno durante o dia e de 2 a 5 graus Fahrenheit (cerca de 1 a 3 graus Celsius) a mais a noite." },
        { tipo: "texto", texto: "Esse excedente custa caro: mais ar-condicionado e mais energia, mais poluicao e ozonio, menos conforto e saude. E, dentro da mesma cidade, o calor nao e distribuido por igual: bairros sem arvore, com telhado escuro e muito asfalto cozinham mais que bairros arborizados. Medir a diferenca entre bairros e o primeiro passo para cobrar sombra e area verde onde falta." },
        {
          tipo: "prancha",
          titulo: "O perfil de temperatura atravessando a cidade",
          desenho: {
            legenda: "A temperatura do ar sobe sobre a area construida e cai sobre parques e rios. O topo do perfil e o centro denso; o vale e a vegetacao.",
            primitivas: [
              { t: "linha", de: [20, 160], ate: [288, 160], cor: "suave" },
              { t: "linha", de: [24, 24], ate: [24, 160], cor: "suave" },
              { t: "rotulo", p: [0, 20], texto: "Temp. ar" },
              { t: "curva", pts: [[28, 140], [70, 135], [110, 70], [150, 60], [180, 110], [210, 70], [250, 130], [284, 138]], cor: "destaque" },
              { t: "rotulo", p: [30, 150], texto: "Rural" },
              { t: "rotulo", p: [120, 48], texto: "Centro" },
              { t: "rotulo", p: [168, 122], texto: "Parque" },
              { t: "rotulo", p: [225, 150], texto: "Suburbio" },
            ],
          },
        },
      ],
    },
    {
      id: "fontes-contexto",
      titulo: "Fontes: o que ja foi medido e normatizado",
      blocos: [
        { tipo: "texto", texto: "Este caderno nao inventa metodo: segue um guia internacional dedicado ao tema e um orgao ambiental de referencia. Guarde estes dois enderecos como a base de tudo o que vem adiante." },
        { tipo: "fontes", titulo: "Guia e referencia institucional", itens: [
          { titulo: "WMO-No. 1292 (2023) — Guidance on Measuring, Modelling and Monitoring the Canopy Layer Urban Heat Island (CL-UHI)", url: "https://www.preventionweb.net/quick/80339", tipo: "norma", nota: "Guia da Organizacao Meteorologica Mundial: como medir a ilha de calor da camada do dossel a ~1,5 m." },
          { titulo: "US EPA — Heat Island Effect (Learn About Heat Islands)", url: "https://www.epa.gov/heat-islands", tipo: "site", nota: "Causas, impactos, medicao e estrategias de reducao; numeros de referencia do excedente termico." },
          { titulo: "WMO — Urban heat island (pagina da comunidade)", url: "https://community.wmo.int/node/37182", tipo: "site", nota: "Contexto e publicacoes da OMM sobre clima urbano e ilha de calor." },
        ] },
        {
          tipo: "licao",
          pergunta: "A que altura o guia WMO-No. 1292 foca a medicao da ilha de calor do dossel?",
          alternativas: ["No topo dos predios", "Em torno de 1,5 m acima do solo, onde as pessoas vivem", "A 10 km de altitude"],
          correta: 1,
          explicacao: "A camada do dossel urbano (canopy layer) e o ar entre o solo e o topo das construcoes; o guia foca a temperatura a cerca de 1,5 m, a altura padrao de abrigo meteorologico e a que as pessoas sentem.",
        },
      ],
    },

    // ===================== CAPITULO 2 — FISICA: POR QUE A CIDADE ESQUENTA =====================
    {
      id: "balanco-energia",
      titulo: "O balanco de energia da cidade",
      blocos: [
        { tipo: "texto", texto: "Toda superficie recebe sol e precisa se livrar desse calor. No campo, boa parte da energia vira evaporacao de agua do solo e das plantas (calor latente), o que resfria. Na cidade, falta agua livre: o sol vira calor sensivel, que aquece o ar, e calor armazenado no concreto e no asfalto, devolvido a noite. Essa troca no balanco de energia e a raiz da ilha de calor." },
        { tipo: "diagrama", titulo: "Para onde vai a energia do sol", codigo: `flowchart TD
  S["Radiacao solar"] --> C["Cidade: pouca agua"]
  S --> R["Campo: solo e vegetacao umidos"]
  C --> Q["Calor sensivel: aquece o ar"]
  C --> G["Calor armazenado no concreto e asfalto"]
  G --> N["Liberado a noite: ilha de calor noturna"]
  R --> E["Calor latente: evapotranspiracao resfria"]` },
        { tipo: "texto", texto: "Soma-se a isso o calor antropico: carros, ar-condicionado, industria e os proprios corpos liberam energia direto no ar urbano. A cidade e, ao mesmo tempo, uma superficie que guarda calor e uma fonte que o produz. Entender esse balanco explica por que o pico da ilha de calor costuma ser a noite, e nao ao meio-dia." },
      ],
    },
    {
      id: "causas-uhi",
      titulo: "As causas: albedo, geometria e verde",
      blocos: [
        { tipo: "texto", texto: "Tres fatores comandam o quanto um local esquenta. Albedo e a fracao de luz que a superficie reflete: telhado e asfalto escuros tem albedo baixo, absorvem quase tudo e esquentam; superficie clara reflete e permanece mais fria. Geometria urbana: ruas estreitas entre predios altos (os canions urbanos) prendem o calor e bloqueiam a perda noturna para o ceu. E a vegetacao: arvore faz sombra e evapotranspira, resfriando o ar ao redor." },
        {
          tipo: "prancha",
          titulo: "Albedo: superficie clara reflete, escura absorve",
          desenho: {
            legenda: "A superficie clara (alto albedo) devolve a maior parte da luz; a escura (baixo albedo) absorve e esquenta. Por isso telhado branco esfria.",
            primitivas: [
              { t: "seta", de: [50, 20], ate: [70, 90], cor: "destaque" },
              { t: "retangulo", p: [30, 92], w: 90, h: 24, cor: "suave" },
              { t: "rotulo", p: [36, 128], texto: "Clara: reflete" },
              { t: "seta", de: [70, 90], ate: [50, 30], cor: "destaque" },
              { t: "seta", de: [210, 20], ate: [230, 90], cor: "destaque" },
              { t: "retangulo", p: [190, 92], w: 90, h: 24, hachura: true },
              { t: "rotulo", p: [196, 128], texto: "Escura: absorve" },
              { t: "rotulo", p: [205, 150], texto: "esquenta" },
            ],
          },
        },
        {
          tipo: "licao",
          pergunta: "Por que um telhado branco deixa o ambiente mais fresco que um telhado escuro?",
          alternativas: ["Porque o branco e mais bonito", "Porque tem albedo alto e reflete a luz do sol, absorvendo menos calor", "Porque o branco conduz mais eletricidade"],
          correta: 1,
          explicacao: "O albedo alto da superficie clara reflete grande parte da radiacao solar; a superficie escura absorve quase tudo e converte em calor. Por isso telhados frios (cool roofs) reduzem a temperatura.",
        },
      ],
    },
    {
      id: "superficie-vs-ar",
      titulo: "Temperatura de superficie e temperatura do ar",
      blocos: [
        { tipo: "texto", texto: "Existem duas ilhas de calor diferentes, e confundi-las gera erro. A ilha de calor de superficie e a temperatura da pele das coisas (asfalto, telhado, grama), medida por satelite; e intensa de dia, quando o asfalto ao sol passa de 50 graus. A ilha de calor do ar e a temperatura que um termometro sombreado le a 1,5 m; e mais suave e tem pico a noite. Satelite ve superficie; termometro ve ar." },
        {
          tipo: "prancha",
          titulo: "Duas medidas, dois picos",
          desenho: {
            legenda: "A temperatura de superficie (satelite) dispara de dia; a do ar (termometro) e mais estavel e sua diferenca urbano-rural cresce a noite.",
            primitivas: [
              { t: "linha", de: [24, 24], ate: [24, 160], cor: "suave" },
              { t: "linha", de: [24, 160], ate: [290, 160], cor: "suave" },
              { t: "curva", pts: [[30, 150], [90, 60], [150, 50], [210, 120], [284, 150]], cor: "destaque" },
              { t: "rotulo", p: [96, 44], texto: "Superficie (dia)" },
              { t: "curva", pts: [[30, 130], [90, 110], [150, 115], [210, 95], [284, 100]], cor: "tinta" },
              { t: "rotulo", p: [205, 84], texto: "Ar" },
              { t: "rotulo", p: [40, 172], texto: "manha" },
              { t: "rotulo", p: [130, 172], texto: "meio-dia" },
              { t: "rotulo", p: [240, 172], texto: "noite" },
            ],
          },
        },
        {
          tipo: "licao",
          pergunta: "Qual medida capta melhor o pico noturno da ilha de calor sentida pelas pessoas?",
          alternativas: ["Temperatura de superficie por satelite ao meio-dia", "Temperatura do ar a 1,5 m, com termometro sombreado", "A cor do asfalto"],
          correta: 1,
          explicacao: "A ilha de calor do ar, medida a 1,5 m, representa o que as pessoas sentem e tem pico noturno. A temperatura de superficie por satelite e util, mas e outra grandeza, com pico diurno.",
        },
      ],
    },
    {
      id: "camadas-atmosfera",
      titulo: "Camada do dossel e camada limite",
      blocos: [
        { tipo: "texto", texto: "A atmosfera urbana tem andares. A camada do dossel urbano (urban canopy layer) e o ar entre o solo e o topo dos predios: e onde moramos, onde o transecto e a estacao medem, e e o foco do guia da WMO. Acima dela esta a camada limite urbana, uma cupula de ar modificado que pode se estender por quilometros vento abaixo. Cada camada pede um metodo: a do dossel, sensores proximos ao solo; a limite, torres, baloes e modelos." },
        {
          tipo: "prancha",
          titulo: "Os andares do ar urbano",
          desenho: {
            legenda: "No nivel das ruas esta a camada do dossel (foco do caderno); acima do telhado, a camada limite urbana.",
            primitivas: [
              { t: "retangulo", p: [40, 110], w: 26, h: 60, cor: "tinta" },
              { t: "retangulo", p: [90, 90], w: 26, h: 80, cor: "tinta" },
              { t: "retangulo", p: [140, 120], w: 26, h: 50, cor: "tinta" },
              { t: "retangulo", p: [200, 95], w: 26, h: 75, cor: "tinta" },
              { t: "linha", de: [24, 84], ate: [288, 84], cor: "suave" },
              { t: "rotulo", p: [40, 150], texto: "Dossel" },
              { t: "rotulo", p: [120, 60], texto: "Camada limite urbana" },
              { t: "curva", pts: [[24, 44], [120, 34], [220, 40], [288, 36]], cor: "destaque" },
            ],
          },
        },
        { tipo: "texto", texto: "Para comparar bairros, trabalhamos quase sempre na camada do dossel: o ar que as pessoas respiram, a cerca de 1,5 m. E o nivel certo para transecto e para o par de estacoes urbano/rural que vem nos proximos capitulos." },
      ],
    },
    {
      id: "video-conceito",
      titulo: "Ver o fenomeno em movimento",
      blocos: [
        { tipo: "texto", texto: "Antes de medir, fixe a imagem do fenomeno. Os dois videos mostram, em portugues e em espanhol, como a ilha de calor se forma, por que o centro esquenta mais e o que o verde faz. Assista pensando no seu bairro: onde estao o asfalto, a sombra e a agua." },
        { tipo: "video", titulo: "Ilhas de calor (Brasil Escola)", youtube: "g8wEplWLWyA" },
        { tipo: "video", titulo: "ClimateBits: Urban Heat Islands (em espanhol)", youtube: "V2Cf6ahbAus" },
      ],
    },

    // ===================== CAPITULO 3 — METODO =====================
    {
      id: "tres-metodos",
      titulo: "Tres formas de medir a ilha de calor",
      blocos: [
        { tipo: "texto", texto: "Ha tres caminhos, e eles se complementam. Estacoes fixas: sensores parados num ponto urbano e num rural, comparando a mesma hora, dia e noite, por longos periodos. Transecto movel: um sensor num carro ou bicicleta percorre uma rota fixa cruzando bairros, tirando um retrato da cidade numa noite. Satelite: imagens de temperatura de superficie cobrem a cidade inteira de uma vez, mas medem a pele, nao o ar." },
        { tipo: "diagrama", titulo: "Qual metodo responde o que", codigo: `flowchart TD
  P["Pergunta do estudo"] --> A["Serie longa num ponto? Estacao fixa"]
  P --> B["Retrato de muitos bairros numa noite? Transecto movel"]
  P --> C["Mapa continuo da cidade? Satelite (superficie)"]
  A --> R["Compara com norma e com o historico"]
  B --> R
  C --> R` },
        {
          tipo: "licao",
          pergunta: "Voce quer comparar a temperatura de doze bairros na mesma noite. Qual metodo e o mais direto?",
          alternativas: ["Uma unica estacao fixa", "Um transecto movel por uma rota que cruza os bairros", "Esperar a media anual"],
          correta: 1,
          explicacao: "O transecto movel foi feito para isso: numa noite estavel, um sensor movel cruza varios bairros e registra a temperatura ponto a ponto, dando um retrato espacial comparavel.",
        },
      ],
    },
    {
      id: "o-que-medir",
      titulo: "O que medir, alem da temperatura",
      blocos: [
        { tipo: "texto", texto: "Temperatura do ar e a estrela, mas sozinha conta meia historia. Umidade relativa ajuda a calcular o conforto termico e o indice de calor. Vento mistura o ar e pode apagar a ilha de calor numa noite ventosa. Cobertura do ceu (nuvem) muda a perda de calor noturna. E, para explicar o porque, registre o entorno: percentual de arvore, de area impermeavel e o tipo de superficie em cada ponto." },
        { tipo: "texto", texto: "Para cada ponto, o minimo util e: temperatura do ar, umidade, coordenada de GPS, hora exata e uma foto do entorno. Com isso voce nao so compara bairros como explica a diferenca: o ponto quente tem pouca arvore e muito asfalto? O frio esta perto de um parque? A medicao vira argumento quando carrega o contexto." },
        { tipo: "tarefas", itens: [
          { id: "ficha-ponto", titulo: "Monte a ficha do ponto", entrega: "Crie uma ficha com os campos: id do ponto, coordenada GPS, hora, temperatura, umidade, percentual estimado de arvore e de piso impermeavel, e uma foto. Teste preenchendo tres pontos perto de casa." },
        ] },
      ],
    },
    {
      id: "lcz-zonas",
      titulo: "Zonas Climaticas Locais: o mapa do porque",
      blocos: [
        { tipo: "texto", texto: "Dizer so urbano ou rural e grosseiro demais. Stewart e Oke (2012) criaram as Zonas Climaticas Locais (LCZ), 17 tipos que descrevem cada lugar pela forma construida e pela cobertura: 10 tipos construidos (de arranha-ceus compactos a casas esparsas) e 7 de cobertura natural (arvore densa, grama, agua). Cada LCZ tem um comportamento termico proprio, entao comparar bairros por LCZ e mais justo do que por nome." },
        {
          tipo: "prancha",
          titulo: "Da LCZ compacta a esparsa",
          desenho: {
            legenda: "LCZ densas e altas (esquerda) retem mais calor; LCZ abertas e vegetadas (direita) esfriam. Classificar o bairro pela LCZ explica a temperatura.",
            primitivas: [
              { t: "retangulo", p: [24, 60], w: 16, h: 90, cor: "tinta" },
              { t: "retangulo", p: [44, 70], w: 16, h: 80, cor: "tinta" },
              { t: "retangulo", p: [64, 64], w: 16, h: 86, cor: "tinta" },
              { t: "rotulo", p: [26, 164], texto: "LCZ 1 compacta alta" },
              { t: "retangulo", p: [150, 110], w: 18, h: 40, cor: "suave" },
              { t: "retangulo", p: [178, 115], w: 18, h: 35, cor: "suave" },
              { t: "circulo", c: [220, 120], r: 12, cor: "destaque" },
              { t: "circulo", c: [250, 125], r: 10, cor: "destaque" },
              { t: "rotulo", p: [150, 164], texto: "LCZ 6 aberta + arvore" },
            ],
          },
        },
        { tipo: "fontes", titulo: "Classificacao e mapeamento", itens: [
          { titulo: "Stewart & Oke (2012) — Local Climate Zones for Urban Temperature Studies (BAMS)", url: "https://doi.org/10.1175/BAMS-D-11-00019.1", tipo: "artigo", nota: "O artigo que define as 17 LCZ; base para comparar bairros de forma padronizada." },
          { titulo: "WUDAPT — Local Climate Zones", url: "https://www.wudapt.org/lcz/", tipo: "site", nota: "Projeto global que mapeia LCZ; traz o LCZ Generator para gerar o mapa da sua cidade." },
        ] },
        {
          tipo: "licao",
          pergunta: "Por que comparar bairros por Zona Climatica Local e melhor que por nome do bairro?",
          alternativas: ["Porque e mais rapido", "Porque a LCZ descreve a forma e a cobertura, que determinam o comportamento termico, tornando a comparacao justa", "Porque os nomes mudam"],
          correta: 1,
          explicacao: "A LCZ padroniza a descricao fisica do lugar (altura, densidade, verde). Dois bairros da mesma LCZ sao termicamente comparaveis; comparar LCZ diferentes isola o efeito da forma urbana.",
        },
      ],
    },
    {
      id: "pontos-pares",
      titulo: "Onde medir: o par urbano/rural e a rota",
      blocos: [
        { tipo: "texto", texto: "A intensidade da ilha de calor exige um par: um ponto urbano representativo e um ponto rural de referencia, fora da influencia da cidade, medidos ao mesmo tempo. Para comparar bairros dentro da cidade, distribua pontos por LCZ diferentes: um canion denso, um bairro arborizado, uma praca, uma avenida de asfalto. Escolha locais seguros, de acesso repetivel, longe de fontes pontuais como a saida quente de um ar-condicionado." },
        {
          tipo: "prancha",
          titulo: "Rota de transecto cruzando bairros",
          desenho: {
            legenda: "A rota liga o ponto rural de referencia ao centro, passando por LCZ distintas; cada marcador e um ponto de registro.",
            primitivas: [
              { t: "curva", pts: [[24, 150], [80, 140], [130, 110], [180, 90], [240, 70], [284, 50]], cor: "tinta" },
              { t: "circulo", c: [30, 148], r: 6, cor: "destaque" },
              { t: "rotulo", p: [20, 166], texto: "Rural ref." },
              { t: "circulo", c: [110, 122], r: 5, cor: "suave" },
              { t: "rotulo", p: [92, 108], texto: "Parque" },
              { t: "circulo", c: [185, 88], r: 5, cor: "suave" },
              { t: "rotulo", p: [172, 74], texto: "Avenida" },
              { t: "circulo", c: [280, 50], r: 6, cor: "destaque" },
              { t: "rotulo", p: [250, 38], texto: "Centro denso" },
            ],
          },
        },
        { tipo: "tarefas", itens: [
          { id: "definir-pontos", titulo: "Defina a rota e os pontos", entrega: "Num mapa, marque um ponto rural de referencia e de 6 a 12 pontos urbanos em LCZ diferentes. Trace uma rota que os ligue em ate 1 hora de percurso. Anote a LCZ provavel de cada ponto." },
        ] },
      ],
    },
    {
      id: "quando-janela",
      titulo: "Quando medir: a noite clara e calma",
      blocos: [
        { tipo: "texto", texto: "A ilha de calor do ar aparece com forca numa condicao especifica: ceu limpo e vento fraco, algumas horas depois do por do sol. Nessa janela, a cidade segura o calor e o campo esfria rapido, e a diferenca entre eles atinge o maximo. Vento forte mistura tudo e apaga a ilha; nuvem e chuva mudam o balanco. Por isso nao se mede ilha de calor em qualquer dia: escolhe-se a noite certa." },
        {
          tipo: "prancha",
          titulo: "A diferenca urbano-rural ao longo da noite",
          desenho: {
            legenda: "Apos o por do sol, o campo esfria rapido e a cidade segura o calor; a diferenca (a ilha de calor) cresce e chega ao pico na madrugada.",
            primitivas: [
              { t: "linha", de: [24, 24], ate: [24, 160], cor: "suave" },
              { t: "linha", de: [24, 160], ate: [290, 160], cor: "suave" },
              { t: "rotulo", p: [0, 20], texto: "Delta T" },
              { t: "curva", pts: [[30, 150], [80, 120], [140, 70], [200, 55], [260, 60], [284, 90]], cor: "destaque" },
              { t: "seta", de: [36, 150], ate: [36, 158], cor: "suave" },
              { t: "rotulo", p: [30, 172], texto: "por do sol" },
              { t: "rotulo", p: [170, 172], texto: "madrugada" },
              { t: "rotulo", p: [185, 42], texto: "pico da ilha" },
            ],
          },
        },
        {
          tipo: "licao",
          pergunta: "Qual condicao de tempo favorece o pico da ilha de calor do ar?",
          alternativas: ["Vento forte e ceu nublado", "Ceu limpo e vento fraco, algumas horas apos o por do sol", "Chuva de verao ao meio-dia"],
          correta: 1,
          explicacao: "Ceu limpo e calmaria permitem que o campo perca calor para o ceu enquanto a cidade o retem; a diferenca cresce e atinge o pico na madrugada. Vento e nuvem reduzem ou apagam a ilha.",
        },
      ],
    },
    {
      id: "fontes-metodo",
      titulo: "Fontes: como a norma manda medir",
      blocos: [
        { tipo: "texto", texto: "O metodo nao e improviso. O guia da WMO padroniza a medicao da ilha de calor do dossel; o zoneamento bioclimatico da ABNT da o pano de fundo climatico brasileiro; e o framework LCZ da a linguagem para descrever cada ponto. Estes enderecos sustentam todo este capitulo." },
        { tipo: "fontes", titulo: "Normas e protocolos de medicao", itens: [
          { titulo: "WMO-No. 1292 (2023) — medir, modelar e monitorar a CL-UHI", url: "https://www.preventionweb.net/quick/80339", tipo: "norma", nota: "Protocolos de abrigo, exposicao e altura de medicao da ilha de calor do dossel." },
          { titulo: "ABNT NBR 15220-3 — Desempenho termico de edificacoes: zoneamento bioclimatico", url: "https://www.target.com.br/produtos/normas-tecnicas/27317/nbr15220-3-desempenho-termico-de-edificacoes-parte-3-zoneamento-bioclimatico-por-desempenho", tipo: "norma", nota: "Zoneamento bioclimatico brasileiro; contexto climatico que molda o conforto por regiao." },
          { titulo: "LabEEE/UFSC — Zoneamento bioclimatico e desempenho termico (material)", url: "https://labeee.ufsc.br/sites/default/files/documents/zoneamento_projeto.pdf", tipo: "artigo", nota: "Explica a NBR 15220-3 e as zonas bioclimaticas com diretrizes construtivas." },
        ] },
      ],
    },

    // ===================== CAPITULO 4 — MEDICAO E CALCULO =====================
    {
      id: "sensor-abrigo",
      titulo: "O sensor e o abrigo contra radiacao",
      blocos: [
        { tipo: "texto", texto: "O erro numero um em campo e o sol batendo no sensor. Um termometro exposto ao sol le a si mesmo aquecido, nao o ar: a diferenca pode passar de 4 graus. Por isso o sensor vai dentro de um abrigo contra radiacao (radiation shield), branco, ventilado, que barra o sol e a chuva mas deixa o ar passar. A WMO padroniza isso; sem abrigo, o dado nao vale para comparar bairros." },
        {
          tipo: "prancha",
          titulo: "Sensor dentro do abrigo ventilado",
          desenho: {
            legenda: "O abrigo de pratos brancos reflete o sol e deixa o ar circular; o sensor no centro le a temperatura real do ar.",
            primitivas: [
              { t: "seta", de: [80, 18], ate: [110, 60], cor: "destaque" },
              { t: "rotulo", p: [40, 20], texto: "Sol" },
              { t: "linha", de: [120, 70], ate: [190, 70], cor: "tinta" },
              { t: "linha", de: [120, 86], ate: [190, 86], cor: "tinta" },
              { t: "linha", de: [120, 102], ate: [190, 102], cor: "tinta" },
              { t: "linha", de: [120, 118], ate: [190, 118], cor: "tinta" },
              { t: "circulo", c: [155, 94], r: 6, cor: "destaque" },
              { t: "rotulo", p: [196, 92], texto: "Sensor" },
              { t: "seta", de: [100, 94], ate: [120, 94], cor: "suave" },
              { t: "seta", de: [190, 94], ate: [210, 94], cor: "suave" },
              { t: "rotulo", p: [120, 140], texto: "Abrigo ventilado" },
            ],
          },
        },
        {
          tipo: "licao",
          pergunta: "Por que o sensor de temperatura do ar precisa de abrigo contra radiacao?",
          alternativas: ["Para ficar bonito", "Porque, sob sol direto, o sensor aquece e mede a si mesmo, com erro que pode passar de 4 graus", "Para medir a chuva"],
          correta: 1,
          explicacao: "Sem abrigo, a radiacao solar aquece o proprio sensor e o valor deixa de representar o ar. O abrigo branco e ventilado barra o sol e permite a troca com o ar, garantindo leitura comparavel.",
        },
      ],
    },
    {
      id: "calibracao",
      titulo: "Calibracao: sem ela, dois sensores nao se comparam",
      blocos: [
        { tipo: "texto", texto: "Para dizer que o bairro A e 2 graus mais quente que o B, os dois sensores precisam concordar entre si. Cada sensor tem um pequeno desvio; se um le 0,5 grau a mais que o outro, a diferenca entre bairros fica mascarada. A solucao e a calibracao: comparar cada sensor contra um padrao de referencia e corrigir o desvio. Para um estudo com valor tecnico, essa calibracao e rastreavel a um laboratorio acreditado." },
        { tipo: "texto", texto: "Na pratica cidada, ha um atalho util: a intercomparacao. Antes do campo, deixe todos os sensores lado a lado, no mesmo abrigo, por algumas horas, e registre o desvio de cada um em relacao a mediana. Esse offset vira uma correcao aplicada depois. Nao substitui a calibracao de laboratorio, mas evita o erro grosseiro de comparar sensores que nunca foram conferidos." },
        { tipo: "mobilizacao", papel: "Laboratorio de calibracao acreditado (RBC/Inmetro) ou metrologista", porque: "Um estudo com valor tecnico, legal ou cientifico exige sensores calibrados contra um padrao rastreavel, com certificado de calibracao e incerteza; a intercomparacao caseira reduz, mas nao elimina, o vies entre sensores.", entregaEsperada: "Certificado de calibracao de cada sensor de temperatura e umidade, com pontos de calibracao, correcoes e incerteza, rastreavel a padroes nacionais.", gerenciadoPor: "zaeon" },
      ],
    },
    {
      id: "transecto-exec",
      titulo: "Executar o transecto movel",
      blocos: [
        { tipo: "texto", texto: "Monte o sensor no veiculo fora da influencia do motor: num mastro a frente ou na lateral, acima do capo, nunca perto do escapamento. Ande devagar e constante, pare o minimo, e registre em cada ponto a temperatura, a umidade, a hora e a coordenada, com o GPS ligado o tempo todo. Faca a rota de ida e, se der, de volta, para medir o quanto a noite esfriou durante o percurso. Repita a rota em mais de uma noite boa." },
        {
          tipo: "prancha",
          titulo: "Sensor no mastro, longe do calor do veiculo",
          desenho: {
            legenda: "O sensor vai num mastro a frente do veiculo, acima do capo e longe do escapamento, para ler o ar e nao o calor do motor.",
            primitivas: [
              { t: "retangulo", p: [90, 110], w: 110, h: 34, cor: "tinta" },
              { t: "circulo", c: [112, 150], r: 10, cor: "suave" },
              { t: "circulo", c: [182, 150], r: 10, cor: "suave" },
              { t: "linha", de: [70, 110], ate: [70, 50], cor: "tinta" },
              { t: "circulo", c: [70, 46], r: 7, cor: "destaque" },
              { t: "rotulo", p: [40, 34], texto: "Sensor" },
              { t: "seta", de: [200, 100], ate: [230, 100], cor: "suave" },
              { t: "rotulo", p: [205, 86], texto: "sentido" },
              { t: "rotulo", p: [120, 170], texto: "Veiculo" },
            ],
          },
        },
        { tipo: "tarefas", itens: [
          { id: "rodar-transecto", titulo: "Rode um transecto de teste", entrega: "Numa noite de ceu limpo e vento fraco, percorra sua rota registrando temperatura, umidade, hora e GPS em cada ponto. Anote a hora do por do sol e a de inicio e fim do percurso." },
        ] },
      ],
    },
    {
      id: "correcao-tempo",
      titulo: "Corrigir a deriva de tempo do percurso",
      blocos: [
        { tipo: "texto", texto: "Um transecto tem uma armadilha: enquanto voce dirige, a noite inteira esfria. O ultimo ponto pode parecer mais frio nao por ser outro bairro, mas por ter sido medido meia hora depois. Para comparar bairros de forma justa, corrige-se essa deriva: estima-se a taxa de resfriamento da noite (por exemplo, com uma estacao fixa de referencia) e ajusta-se cada ponto para uma hora comum, como se tudo tivesse sido medido no mesmo instante." },
        { tipo: "diagrama", titulo: "Da leitura bruta ao valor comparavel", codigo: `flowchart TD
  A["Leitura bruta por ponto, com hora"] --> B["Taxa de resfriamento da noite (estacao de referencia)"]
  B --> C["Ajustar cada ponto para uma hora comum"]
  C --> D["Aplicar correcao de calibracao do sensor"]
  D --> E["Temperatura comparavel entre bairros"]
  E --> F["Mapa e intensidade da ilha de calor"]` },
        {
          tipo: "licao",
          pergunta: "Por que corrigir a deriva de tempo num transecto?",
          alternativas: ["Para andar mais rapido", "Porque a noite esfria durante o percurso, e sem corrigir um ponto parece mais frio so por ter sido medido depois", "Porque o GPS atrasa"],
          correta: 1,
          explicacao: "Durante o trajeto a temperatura cai com o tempo; a correcao traz todos os pontos a uma hora comum, isolando a diferenca que vem do bairro, e nao do relogio.",
        },
      ],
    },
    {
      id: "intensidade-uhi",
      titulo: "Calcular a intensidade da ilha de calor",
      blocos: [
        { tipo: "texto", texto: "Com os dados corrigidos, a conta e simples e poderosa. A intensidade da ilha de calor de um bairro e a sua temperatura menos a do ponto rural de referencia, na mesma hora: um delta em graus. Monte um ranking dos bairros por esse delta e voce tem, em numeros, quem cozinha mais. Com varias noites, use a media e mostre a faixa (minimo e maximo) para dizer o quanto o resultado e estavel." },
        {
          tipo: "prancha",
          titulo: "Ranking de intensidade por bairro",
          desenho: {
            legenda: "Cada barra e o delta do bairro em relacao ao rural de referencia. O centro denso lidera; o bairro com parque fica proximo de zero.",
            primitivas: [
              { t: "rotulo", p: [8, 24], texto: "Centro" },
              { t: "retangulo", p: [86, 18], w: 180, h: 12, cor: "destaque" },
              { t: "rotulo", p: [8, 48], texto: "Avenida" },
              { t: "retangulo", p: [86, 42], w: 150, h: 12, cor: "destaque" },
              { t: "rotulo", p: [8, 72], texto: "Residencial" },
              { t: "retangulo", p: [86, 66], w: 100, h: 12, cor: "tinta" },
              { t: "rotulo", p: [8, 96], texto: "Arborizado" },
              { t: "retangulo", p: [86, 90], w: 50, h: 12, cor: "suave" },
              { t: "rotulo", p: [8, 120], texto: "Parque" },
              { t: "retangulo", p: [86, 114], w: 20, h: 12, cor: "suave" },
              { t: "linha", de: [86, 10], ate: [86, 134], cor: "tinta" },
              { t: "rotulo", p: [92, 150], texto: "Delta T em relacao ao rural" },
            ],
          },
        },
        { tipo: "tarefas", itens: [
          { id: "calcular-delta", titulo: "Calcule o delta de cada ponto", entrega: "Numa planilha, subtraia de cada ponto a temperatura do rural de referencia na mesma hora (ja corrigida). Ordene do maior para o menor delta e identifique os tres bairros mais quentes." },
        ] },
      ],
    },
    {
      id: "lst-satelite",
      titulo: "Temperatura de superficie por satelite",
      blocos: [
        { tipo: "texto", texto: "O satelite da a visao de cima. O Landsat (missoes 8 e 9) carrega um sensor termico e a USGS/NASA publica, de graca, o produto Collection 2 Level-2 Surface Temperature: temperatura de superficie ja corrigida, com pixel reamostrado a 30 m e revisita a cada 16 dias, por volta das 10h da manha local. Nao e a temperatura do ar, e a da superficie, mas cobre a cidade inteira e revela os pontos quentes de uma vez." },
        { tipo: "texto", texto: "Quando o produto pronto nao basta, calcula-se a temperatura de superficie a partir da banda termica: converte-se o numero digital em radiancia, depois em temperatura de brilho, e corrige-se pela emissividade, estimada do NDVI, o indice de vegetacao NDVI igual a (infravermelho proximo menos vermelho) sobre (infravermelho proximo mais vermelho). As constantes de calibracao vem do arquivo de metadados (MTL) da propria cena." },
        { tipo: "video", titulo: "Calculo de temperatura de superficie em Celsius usando QGIS 3.8", youtube: "dZRKTmjcFZY" },
      ],
    },
    {
      id: "video-qgis",
      titulo: "Mapear a ilha de calor no QGIS",
      blocos: [
        { tipo: "texto", texto: "Com a cena Landsat baixada, um SIG transforma numero em mapa. No QGIS, voce calcula a temperatura de superficie, gera o NDVI e cruza os dois: ve, lado a lado, onde falta verde e onde sobra calor. O video mostra o fluxo completo para ilha de calor; siga com uma cena da sua cidade, de ceu limpo, e compare o resultado com os pontos que voce mediu em campo." },
        { tipo: "video", titulo: "How to Map Urban Heat Islands in QGIS Using Landsat Satellite Data", youtube: "Y4faQzmKafY" },
        { tipo: "tarefas", itens: [
          { id: "mapa-lst", titulo: "Gere um mapa de superficie da sua cidade", entrega: "Baixe uma cena Landsat 8/9 de ceu limpo sobre sua cidade, calcule (ou use o produto Level-2) a temperatura de superficie e gere o NDVI. Marque os tres pontos mais quentes e verifique se coincidem com areas sem arvore." },
        ] },
      ],
    },

    // ===================== CAPITULO 5 — PROJETO DA CAMPANHA =====================
    {
      id: "desenhar-campanha",
      titulo: "Desenhar a campanha de medicao",
      blocos: [
        { tipo: "texto", texto: "Medir bem comeca por uma pergunta clara: o bairro X e mais quente que o Y, e por quanto? A falta de arvore explica a diferenca? A pergunta define os pontos, o metodo, o numero de noites e o criterio de comparacao. Uma boa campanha combina os tres metodos: satelite para escolher onde medir, transecto para o retrato de uma noite e, se possivel, estacoes fixas para a serie no tempo." },
        { tipo: "diagrama", titulo: "O ciclo da campanha", codigo: `flowchart TD
  P["Pergunta: qual bairro, qual hipotese"] --> O["Onde: pontos por LCZ + rural de referencia"]
  O --> Q["Quando: noites de ceu limpo e calmaria"]
  Q --> E["Executar: transecto + estacao + satelite"]
  E --> A["Analisar: delta, mapa, correlacao com verde"]
  A --> C["Comunicar: mapa e relatorio a quem decide"]
  C -->|novo ciclo| P` },
        { tipo: "tarefas", itens: [
          { id: "escrever-pergunta", titulo: "Escreva a pergunta da campanha", entrega: "Em uma frase, defina a hipotese (ex.: o bairro sem arvore e ao menos 2 graus mais quente que o arborizado). Liste os pontos, o metodo e quantas noites voce vai medir." },
        ] },
      ],
    },
    {
      id: "ciencia-cidada",
      titulo: "Ciencia cidada: medir em muita gente",
      blocos: [
        { tipo: "texto", texto: "Mapear o calor de uma cidade inteira numa noite e trabalho para muitas maos. Nos EUA, o programa NIHHIS-CAPA Heat Watch, financiado pela NOAA, treina voluntarios que percorrem rotas de carro ou bicicleta com sensores padronizados num dos dias mais quentes do ano; a CAPA compila e devolve mapas e relatorio. Mais de 60 comunidades ja mapearam suas ilhas de calor assim, e os mapas entraram em planos municipais e de saude." },
        { tipo: "texto", texto: "A forca da ciencia cidada e a escala e a mobilizacao: dado em dezenas de pontos que nenhum orgao faria sozinho, e moradores que passam a enxergar o calor do proprio bairro. O limite e o rigor: para valer como laudo tecnico ou embasar politica com forca legal, o metodo precisa ser padronizado, os sensores calibrados e, muitas vezes, um responsavel tecnico assina. Triar e mobilizar, a ciencia cidada faz muito bem." },
        {
          tipo: "licao",
          pergunta: "Qual e a forca e o limite da ciencia cidada no mapeamento de calor?",
          alternativas: [
            "Substitui qualquer orgao e vale como laudo oficial sozinha",
            "Gera dado em escala e mobiliza a comunidade, mas para fins tecnicos exige metodo padronizado e sensores calibrados",
            "Nao serve para nada sem satelite",
          ],
          correta: 1,
          explicacao: "A ciencia cidada cobre muitos pontos e cria pressao social com metodo comum, mas decisoes tecnicas pedem padronizacao, calibracao e, quando for o caso, responsavel tecnico.",
        },
      ],
    },
    {
      id: "mapa-calor",
      titulo: "Do dado ao mapa de calor",
      blocos: [
        { tipo: "texto", texto: "Os pontos medidos viram mapa por interpolacao: entre dois pontos, o programa estima a temperatura do caminho e pinta uma superficie continua. Mas cuidado: a interpolacao so e confiavel onde ha pontos; nao invente valor onde ninguem mediu. Um bom mapa de calor mostra os pontos reais por cima da superficie interpolada e, ao lado, o mapa de arvore e de piso impermeavel, para o leitor ver a causa junto com o efeito." },
        {
          tipo: "prancha",
          titulo: "Mapa de calor com os pontos por cima",
          desenho: {
            legenda: "A mancha quente (hachurada) cobre o centro; os circulos sao os pontos realmente medidos. A verdade esta nos pontos; o resto e estimativa.",
            primitivas: [
              { t: "retangulo", p: [24, 30], w: 256, h: 140, cor: "suave" },
              { t: "retangulo", p: [150, 50], w: 110, h: 90, hachura: true },
              { t: "rotulo", p: [176, 96], texto: "Quente" },
              { t: "circulo", c: [60, 60], r: 4, cor: "tinta" },
              { t: "circulo", c: [100, 120], r: 4, cor: "tinta" },
              { t: "circulo", c: [180, 70], r: 4, cor: "destaque" },
              { t: "circulo", c: [230, 110], r: 4, cor: "destaque" },
              { t: "circulo", c: [120, 90], r: 4, cor: "tinta" },
              { t: "rotulo", p: [40, 184], texto: "circulo = ponto medido" },
            ],
          },
        },
        { tipo: "tarefas", itens: [
          { id: "montar-mapa", titulo: "Monte seu mapa de calor", entrega: "Num SIG ou numa ferramenta de mapa, plote os pontos com a cor pela temperatura corrigida. Coloque ao lado o mapa de cobertura (arvore x piso) e escreva uma frase sobre a relacao que voce ve." },
        ] },
      ],
    },
    {
      id: "fontes-dados",
      titulo: "Fontes: datasets abertos para comparar",
      blocos: [
        { tipo: "texto", texto: "Voce nao parte do zero: dados publicos cobrem temperatura, superficie e uso do solo. Cruze seus pontos de campo com estas bases para validar e contextualizar. Tudo aqui e aberto e gratuito." },
        { tipo: "fontes", titulo: "Dados de temperatura, superficie e cobertura", itens: [
          { titulo: "INMET — BDMEP (dados historicos das estacoes)", url: "https://portal.inmet.gov.br/servicos/bdmep-dados-historicos", tipo: "dataset", nota: "Series historicas de temperatura e umidade das estacoes do INMET; referencia regional." },
          { titulo: "Landsat Collection 2 Level-2 Surface Temperature (USGS/NASA via data.gov)", url: "https://catalog.data.gov/dataset/landsat-level-2-surface-temperature-collection-2", tipo: "dataset", nota: "Temperatura de superficie corrigida, Landsat 4-9, 1982 ate hoje; pixel 30 m." },
          { titulo: "NASA Earthdata — Land Surface Temperature", url: "https://www.earthdata.nasa.gov/topics/land-surface-temperature", tipo: "dataset", nota: "Portal de produtos de temperatura de superficie e ferramentas de recorte (AppEEARS)." },
          { titulo: "MapBiomas — cobertura e uso do solo do Brasil", url: "https://brasil.mapbiomas.org", tipo: "dataset", nota: "Mapas anuais de cobertura (1985 ate hoje), pixel 30 m; explica a causa (verde x impermeavel)." },
          { titulo: "NIHHIS-CAPA Heat Watch (NOAA) — campanhas de mapeamento comunitario", url: "https://www.heat.gov", tipo: "site", nota: "Programa de ciencia cidada de mapeamento de ilhas de calor; metodo e mapas de referencia." },
        ] },
      ],
    },

    // ===================== CAPITULO 6 — EXECUCAO E ANALISE =====================
    {
      id: "seguranca-etica",
      titulo: "Seguranca, etica e responsabilidade tecnica",
      blocos: [
        { tipo: "texto", texto: "Medir a noite tem riscos reais. Nunca faca transecto sozinho; combine dupla, avise onde vai, escolha rotas seguras e evite parar em locais isolados. Dirigir e anotar nao combinam: uma pessoa guia, outra registra. Respeite a privacidade ao fotografar o entorno e nao exponha enderecos de moradores nos dados publicados. Seguranca e etica vem antes de qualquer dado." },
        { tipo: "texto", texto: "Quando o estudo vai embasar politica publica, licenciamento, plano de arborizacao ou acao com forca legal, ele precisa de metodo rastreavel e, em geral, de um responsavel tecnico que assine. O dado cidadao e poderoso para triar, alertar e mobilizar; o laudo oficial tem exigencias formais de calibracao, metodo e assinatura." },
        { tipo: "mobilizacao", papel: "Responsavel tecnico (meteorologista, engenheiro ambiental ou arquiteto urbanista com registro)", porque: "Estudo destinado a politica publica, plano de arborizacao, licenciamento ou prova precisa de desenho amostral e relatorio assinados por profissional habilitado, com metodo e incerteza declarados.", entregaEsperada: "Plano de amostragem e relatorio tecnico assinados, com metodo (WMO/LCZ), pontos georreferenciados, calibracao e comparacao entre bairros com incerteza.", gerenciadoPor: "zaeon" },
      ],
    },
    {
      id: "coleta-registro",
      titulo: "Coletar e registrar sem perder dado",
      blocos: [
        { tipo: "texto", texto: "Dado perdido e noite jogada fora. Cada leitura vira uma linha com: id do ponto, coordenada, data, hora exata, temperatura, umidade, sensor usado, condicao de ceu e vento, e a LCZ provavel. Use a hora do GPS ou do logger, nao a do relogio de pulso, para casar com a correcao de tempo depois. Padronizar o registro e o que permite comparar noites e cruzar com satelite e com o MapBiomas." },
        { tipo: "diagrama", titulo: "Estrutura minima do registro", codigo: `flowchart TD
  A["Id do ponto e coordenada"] --> R["Linha de dado"]
  B["Data, hora exata, sensor"] --> R
  C["Temperatura, umidade"] --> R
  D["Ceu, vento, LCZ provavel"] --> R
  R --> S["Serie comparavel entre noites e bairros"]` },
        { tipo: "tarefas", itens: [
          { id: "modelo-registro", titulo: "Crie o modelo de registro", entrega: "Monte a tabela com as colunas de id, coordenada, data, hora, temperatura, umidade, sensor, ceu, vento e LCZ. Preencha com os dados do seu transecto de teste." },
        ] },
      ],
    },
    {
      id: "qaqc",
      titulo: "Controle de qualidade dos dados",
      blocos: [
        { tipo: "texto", texto: "Antes de concluir qualquer coisa, limpe os dados. Procure valores impossiveis (temperatura negativa numa noite de verao, salto de 5 graus entre pontos vizinhos), horas fora de ordem e pontos sem coordenada. Aplique a correcao de calibracao de cada sensor e a correcao de deriva de tempo. Marque, nao apague: registre por que um ponto foi descartado. Dado sem controle de qualidade gera conclusao errada com ar de ciencia." },
        { tipo: "texto", texto: "Repita para ganhar confianca: uma unica noite pode ser atipica. Com tres ou mais noites boas, compare se o ranking dos bairros se mantem. Se o bairro X aparece como o mais quente em todas as noites, a conclusao e solida; se muda a cada noite, algo na medicao ou no tempo precisa ser revisto." },
        {
          tipo: "licao",
          pergunta: "O que fazer com um ponto que registrou um salto de 5 graus em relacao aos vizinhos?",
          alternativas: ["Apagar sem anotar", "Investigar (fonte de calor local, erro de sensor), marcar o motivo e so entao decidir manter ou descartar", "Confiar cegamente"],
          correta: 1,
          explicacao: "Um outlier pode ser real (um escapamento, uma churrasqueira) ou erro. O controle de qualidade investiga a causa e registra a decisao, preservando a rastreabilidade em vez de apagar silenciosamente.",
        },
      ],
    },
    {
      id: "analise-correlacao",
      titulo: "Explicar a diferenca: verde, piso e forma",
      blocos: [
        { tipo: "texto", texto: "Comparar bairros e metade; explicar e a outra. Cruze a temperatura de cada ponto com o percentual de arvore (do NDVI ou do MapBiomas), o percentual de piso impermeavel e a LCZ. O padrao classico aparece: quanto mais verde, mais fresco; quanto mais asfalto e densidade, mais quente. Uma correlacao forte entre falta de arvore e calor transforma o seu mapa num argumento para plantar onde mais importa." },
        {
          tipo: "prancha",
          titulo: "Mais arvore, menos calor",
          desenho: {
            legenda: "Cada ponto e um bairro: no eixo, o percentual de arvore; na altura, a temperatura. A nuvem desce da esquerda quente para a direita fresca.",
            primitivas: [
              { t: "linha", de: [30, 24], ate: [30, 160], cor: "suave" },
              { t: "linha", de: [30, 160], ate: [290, 160], cor: "suave" },
              { t: "rotulo", p: [2, 20], texto: "Temp." },
              { t: "rotulo", p: [230, 174], texto: "% arvore" },
              { t: "circulo", c: [60, 50], r: 4, cor: "destaque" },
              { t: "circulo", c: [90, 65], r: 4, cor: "destaque" },
              { t: "circulo", c: [130, 90], r: 4, cor: "tinta" },
              { t: "circulo", c: [170, 100], r: 4, cor: "tinta" },
              { t: "circulo", c: [210, 130], r: 4, cor: "suave" },
              { t: "circulo", c: [255, 140], r: 4, cor: "suave" },
              { t: "curva", pts: [[55, 55], [130, 92], [255, 138]], cor: "tinta" },
            ],
          },
        },
        { tipo: "tarefas", itens: [
          { id: "correlacionar", titulo: "Correlacione calor e verde", entrega: "Para cada ponto, anote a temperatura corrigida e o percentual de arvore (do NDVI ou do MapBiomas). Plote um contra o outro e descreva a tendencia em uma frase, com o sentido e a forca." },
        ] },
      ],
    },

    // ===================== CAPITULO 7 — MITIGACAO =====================
    {
      id: "mitigacao-arvores",
      titulo: "Arvores e vegetacao: o resfriador natural",
      blocos: [
        { tipo: "texto", texto: "A arvore resfria de dois jeitos: faz sombra, barrando o sol antes que ele aqueca o chao, e evapotranspira, trocando calor por vapor de agua, como um ar-condicionado movido a seiva. Segundo o US EPA, arvore e vegetacao estao entre as principais estrategias de reducao da ilha de calor. Nos dados que voce mesmo coleta, o ponto arborizado costuma ser o mais fresco do ranking: a sombra vira numero." },
        {
          tipo: "prancha",
          titulo: "Sombra e evapotranspiracao",
          desenho: {
            legenda: "A copa barra o sol (sombra) e libera vapor (evapotranspiracao); o ar sob a arvore fica mais fresco que ao lado, no asfalto exposto.",
            primitivas: [
              { t: "circulo", c: [90, 60], r: 34, cor: "destaque" },
              { t: "linha", de: [90, 94], ate: [90, 150], cor: "tinta" },
              { t: "seta", de: [40, 20], ate: [70, 46], cor: "suave" },
              { t: "rotulo", p: [16, 18], texto: "Sol" },
              { t: "seta", de: [110, 50], ate: [130, 28], cor: "suave" },
              { t: "rotulo", p: [132, 26], texto: "Vapor" },
              { t: "rotulo", p: [60, 166], texto: "Sombra fresca" },
              { t: "retangulo", p: [190, 140], w: 90, h: 14, hachura: true },
              { t: "rotulo", p: [196, 170], texto: "Asfalto exposto" },
            ],
          },
        },
        { tipo: "video", titulo: "Telhados verdes levam vida e beleza as alturas em Sao Paulo", youtube: "1XTejry2tus" },
      ],
    },
    {
      id: "telhados-pavimentos",
      titulo: "Telhados frios, telhados verdes e pavimentos",
      blocos: [
        { tipo: "texto", texto: "Onde nao cabe arvore, muda-se a superficie. Telhado frio (cool roof) e uma cobertura clara e refletiva, de alto albedo, que devolve o sol e reduz o calor do predio e da rua; em cidades quentes como Ahmedabad, pintar telhados de branco virou politica contra o calor. Telhado verde cobre a laje de vegetacao, isolando e evapotranspirando. E o pavimento frio, mais claro ou permeavel, esquenta menos que o asfalto preto. Sao as quatro estrategias que o US EPA destaca: arvore, telhado verde, telhado frio e pavimento frio." },
        {
          tipo: "prancha",
          titulo: "Tres coberturas, tres temperaturas",
          desenho: {
            legenda: "O telhado escuro esquenta; o frio reflete; o verde isola e evapotranspira. A mesma laje, tres resultados.",
            primitivas: [
              { t: "retangulo", p: [24, 100], w: 70, h: 18, hachura: true },
              { t: "rotulo", p: [30, 134], texto: "Escuro: quente" },
              { t: "retangulo", p: [118, 100], w: 70, h: 18, cor: "suave" },
              { t: "seta", de: [153, 100], ate: [153, 70], cor: "destaque" },
              { t: "rotulo", p: [124, 134], texto: "Frio: reflete" },
              { t: "retangulo", p: [212, 100], w: 70, h: 18, cor: "destaque" },
              { t: "circulo", c: [230, 92], r: 6, cor: "tinta" },
              { t: "circulo", c: [255, 94], r: 6, cor: "tinta" },
              { t: "rotulo", p: [214, 134], texto: "Verde: isola" },
            ],
          },
        },
        { tipo: "video", titulo: "Telhado verde refresca as ilhas de calor urbanas", youtube: "bx8FMWe2tkk" },
      ],
    },
    {
      id: "projeto-bairro",
      titulo: "Projetar a intervencao no bairro",
      blocos: [
        { tipo: "texto", texto: "Agora o dado vira projeto. Com o ranking e o mapa, priorize: onde esta o maior delta e menos arvore, ali a intervencao rende mais. Combine as estrategias conforme o espaco: calcada larga pede arvore de sombra; laje exposta pede telhado frio ou verde; patio de escola e ponto de onibus pedem sombra onde as pessoas esperam. Estime o efeito pela propria evidencia: se o ponto arborizado foi 3 graus mais fresco, a meta de arborizacao tem numero." },
        { tipo: "diagrama", titulo: "Da prova a intervencao", codigo: `flowchart TD
  M["Mapa e ranking dos bairros"] --> P["Priorizar: maior calor + menos verde"]
  P --> E["Escolher estrategia por espaco"]
  E --> T["Arvore de sombra na calcada"]
  E --> F["Telhado frio ou verde na laje"]
  E --> V["Sombra em pontos de espera"]
  T --> R["Reavaliar: medir de novo apos a obra"]
  F --> R
  V --> R` },
        { tipo: "mobilizacao", papel: "Engenheiro florestal ou agronomo (plano de arborizacao) e arquiteto urbanista", porque: "Plantio urbano em escala exige escolha de especies adequadas a calcada e a rede eletrica, plano de manejo e projeto que respeite acessibilidade e drenagem; execucao errada mata a muda ou danifica a infraestrutura.", entregaEsperada: "Plano de arborizacao e de intervencao com especies, locais, cronograma e metas de sombra, compativel com as normas municipais e a rede de servicos.", gerenciadoPor: "zaeon" },
        { tipo: "tarefas", itens: [
          { id: "priorizar-intervencao", titulo: "Priorize onde intervir", entrega: "Com seu mapa, escolha os dois pontos de maior calor e menor verde. Para cada um, proponha uma estrategia (arvore, telhado frio, telhado verde ou pavimento) e justifique com o dado que voce coletou." },
        ] },
      ],
    },

    // ===================== CAPITULO 8 — CASOS REAIS =====================
    {
      id: "caso-sao-paulo",
      titulo: "Caso: Jardim Peri, zona norte de Sao Paulo",
      blocos: [
        { tipo: "texto", texto: "Estudos brasileiros ja fizeram esse caminho e publicaram. Na zona norte de Sao Paulo, um estudo de caso no bairro Jardim Peri usou transectos moveis, temperatura do ar e uso do solo para avaliar a ilha de calor, mostrando como trechos mais adensados e com menos vegetacao se destacam dos arborizados. E o metodo deste caderno aplicado de ponta a ponta, num bairro real, por pesquisadores que publicaram o resultado." },
        { tipo: "texto", texto: "Outros casos confirmam o padrao: em Goiania, trechos muito urbanizados e sem vegetacao chegaram a cerca de 33 graus enquanto a borda de um parque linear ficava perto de 31; em Rio Claro e Manaus, transectos cruzaram bairros de perfis diferentes e acharam os picos de calor longe do verde. O recado se repete: onde falta arvore, sobra calor, e da para provar." },
        { tipo: "video", titulo: "Ilhas de calor (Geobrasil, Prof. Rodrigo Rodrigues)", youtube: "tzj7rYTRqmg" },
      ],
    },
    {
      id: "caso-cidades-campanhas",
      titulo: "Caso: de metropoles a cidades pequenas",
      blocos: [
        { tipo: "texto", texto: "A ilha de calor nao e so das grandes capitais. Estudos recentes mostram que municipios de poucos milhares de habitantes ja registram aumento de temperatura comparavel ao de grandes metropoles, o que amplia o publico deste caderno: qualquer cidade com asfalto e pouca arvore pode medir e agir. E as campanhas comunitarias, como a Heat Watch nos EUA, provam que voluntarios treinados produzem mapas que entram em politicas de saude e de arborizacao." },
        { tipo: "fontes", titulo: "Estudos de caso e reportagens", itens: [
          { titulo: "Avaliacao da ilha de calor na zona norte de Sao Paulo: Jardim Peri (Revista Brasileira de Climatologia)", url: "https://revistas.ufpr.br/revistaabclima/article/view/69933", tipo: "artigo", nota: "Estudo de caso com transectos moveis, temperatura do ar e uso do solo." },
          { titulo: "eCycle — aumento de temperatura em municipios pequenos equivale ao de metropoles", url: "https://www.ecycle.com.br/aumento-de-temperatura-em-municipios-com-poucos-milhares-de-habitantes-e-equivalente-ao-observado-em-grandes-metropoles-do-brasil-e-do-mundo/", tipo: "site", nota: "Panorama: a ilha de calor atinge tambem cidades pequenas." },
          { titulo: "NC State — Urban Heat Island Temperature Mapping Campaign (Heat Watch)", url: "https://climate.ncsu.edu/research/uhi/", tipo: "site", nota: "Exemplo de campanha de ciencia cidada com relatorios publicos por cidade." },
        ] },
        {
          tipo: "licao",
          pergunta: "O que os casos brasileiros e as campanhas comunitarias tem em comum?",
          alternativas: [
            "Mostram que so capitais tem ilha de calor",
            "Confirmam, com metodo, que areas sem vegetacao sao mais quentes, e que da para medir isso em cidades de qualquer porte",
            "Provam que medir nao adianta",
          ],
          correta: 1,
          explicacao: "De Sao Paulo a cidades pequenas e as campanhas Heat Watch, o padrao se repete: menos verde significa mais calor, e o metodo (transecto, estacao, satelite) torna isso demonstravel e acionavel.",
        },
      ],
    },

    // ===================== CAPITULO 9 — RECURSOS + SINTESE =====================
    {
      id: "recursos-finais",
      titulo: "Recursos para continuar: normas, dados e guias",
      blocos: [
        { tipo: "texto", texto: "Reuna aqui a caixa de ferramentas da comparacao termica entre bairros: o guia que padroniza a medicao, a classificacao que descreve cada lugar, os datasets onde comparar e os guias de mitigacao. Tudo o que este caderno afirmou se verifica nestes enderecos." },
        { tipo: "fontes", titulo: "Normas, dados e guias de referencia", itens: [
          { titulo: "WMO-No. 1292 (2023) — CL-UHI guidance", url: "https://www.preventionweb.net/quick/80339", tipo: "norma", nota: "Guia da OMM para medir, modelar e monitorar a ilha de calor do dossel." },
          { titulo: "Stewart & Oke (2012) — Local Climate Zones (BAMS)", url: "https://doi.org/10.1175/BAMS-D-11-00019.1", tipo: "artigo", nota: "As 17 Zonas Climaticas Locais; base para comparar bairros." },
          { titulo: "WUDAPT — LCZ e LCZ Generator", url: "https://www.wudapt.org/lcz/", tipo: "site", nota: "Mapear as LCZ da sua cidade a partir de imagens de satelite." },
          { titulo: "US EPA — Heat Island Effect", url: "https://www.epa.gov/heat-islands", tipo: "site", nota: "Causas, impactos e as quatro estrategias de reducao." },
          { titulo: "INMET — BDMEP", url: "https://portal.inmet.gov.br/servicos/bdmep-dados-historicos", tipo: "dataset", nota: "Series historicas de temperatura e umidade das estacoes brasileiras." },
          { titulo: "Landsat Level-2 Surface Temperature (USGS/NASA)", url: "https://catalog.data.gov/dataset/landsat-level-2-surface-temperature-collection-2", tipo: "dataset", nota: "Temperatura de superficie corrigida, aberta, pixel 30 m." },
          { titulo: "MapBiomas — cobertura e uso do solo", url: "https://brasil.mapbiomas.org", tipo: "dataset", nota: "Verde x impermeavel por ano; a causa junto do efeito." },
        ] },
        { tipo: "video", titulo: "ClimateBits: Urban Heat Islands (visao geral)", youtube: "V2Cf6ahbAus" },
      ],
    },
    {
      id: "compilado",
      titulo: "Prancha de sintese",
      blocos: [
        { tipo: "texto", texto: "Voce percorreu o caminho inteiro: entendeu por que a cidade esquenta (balanco de energia, albedo, geometria e falta de verde) e a diferenca entre a ilha de calor de superficie e a do ar; escolheu entre estacao fixa, transecto movel e satelite; mediu com abrigo contra radiacao e sensores calibrados; corrigiu a deriva de tempo e calculou a intensidade da ilha bairro a bairro; desenhou uma campanha, inclusive de ciencia cidada, e virou os pontos num mapa de calor; executou com seguranca e controle de qualidade e explicou a diferenca cruzando com arvore e uso do solo; projetou a mitigacao com arvore, telhado frio, telhado verde e pavimento; e viu casos reais, de Sao Paulo a cidades pequenas e as campanhas Heat Watch. A regra que fica: meca com abrigo e calibracao, compare na mesma hora, corrija o tempo, registre tudo e leve o mapa a quem decide onde plantar. Calor urbano e desigual; prova e o que transforma a lista de bairros quentes em sombra onde falta. Quando a etapa exigir calibracao metrologica ou responsavel tecnico, mobilize o profissional certo, foi assinalado em cada ponto do caderno." },
        { tipo: "compilado" },
      ],
    },
  ],
};
