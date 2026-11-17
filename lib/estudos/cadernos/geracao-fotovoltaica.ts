import type { CadernoEstudo } from "../cadernosEstudo";

/**
 * Caderno de campo: Geração fotovoltaica ao longo do ano em dados abertos.
 * Lastro real: datasets abertos (NSRDB/NREL, PVGIS/JRC, NASA POWER, Atlas Brasileiro de
 * Energia Solar do LABREN/INPE, ONS e ANEEL dados abertos, INMET, Global Solar Atlas),
 * bibliotecas (pvlib-python, pandas, statsmodels), normas (IEC 61724-1, ISO 9060,
 * ABNT NBR 16274/16690, WMO CIMO) e literatura (Pfenninger & Staffell, Hyndman &
 * Athanasopoulos). As etapas que exigem instrumentar uma usina real ou validar geração
 * medida viram blocos de mobilização de engenheiro/responsável técnico. Vídeos conferidos
 * um a um por oEmbed antes de entrar (id de 11 caracteres de vídeo existente).
 */
export const caderno: CadernoEstudo = {
  id: "geracao-fotovoltaica",
  titulo: "Geração fotovoltaica ao longo do ano em dados abertos",
  resumo:
    "Do fóton ao gráfico: como baixar, limpar, medir e ler a série temporal da geração solar de um lugar usando só dados abertos — sempre com fonte, cálculo reprodutível e o profissional certo quando o dado precisa sair do satélite e ir pro telhado.",
  paginas: [
    // ===================== CAPÍTULO 1 — CONTEXTO E VISÃO =====================
    {
      id: "abertura",
      titulo: "Como usar este caderno de campo",
      blocos: [
        { tipo: "texto", texto: "Este caderno acompanha quem quer responder, com dado aberto e análise reprodutível, a uma pergunta simples e teimosa: quanta energia um painel solar gera num lugar, mês a mês, ao longo do ano? Cada página traz leitura curta, um desenho ou diagrama, tarefas práticas e a fonte que sustenta a afirmação. Quando aparece um número, ele vem de dataset, norma ou artigo citado na mesma página." },
        { tipo: "texto", texto: "A disciplina do caderno é a de um cientista de dados de energia: primeiro a pergunta, depois a fonte aberta, depois o cálculo que qualquer pessoa pode refazer, e só então o gráfico. Quando a análise precisar sair do satélite e tocar uma usina de verdade — instalar um piranômetro, medir a geração real, certificar o desempenho — a página mostra um campo de mobilização que chama um engenheiro responsável e acompanha até ficar pronto." },
        { tipo: "diagrama", titulo: "O percurso do caderno", codigo: `flowchart TD
  A["Contexto: por que a serie anual importa"] --> B["Recurso solar: GHI, DNI, DHI, POA"]
  B --> C["Metodo: datasets abertos"]
  C --> D["Calculo: do recurso a energia, PR, fator de capacidade"]
  D --> E["Projeto: o pipeline de analise"]
  E --> F["Execucao: baixar, limpar, decompor, plotar"]
  F --> G["Manutencao: incerteza e validacao"]
  G --> H["Casos reais"]
  H --> I["Recursos"]
  I --> J["Prancha de sintese"]` },
      ],
    },
    {
      id: "por-que-analisar",
      titulo: "Por que olhar o ano inteiro, e não um dia",
      blocos: [
        { tipo: "texto", texto: "Um painel não gera igual o ano todo. A altura do Sol muda com as estações, a nebulosidade tem ciclos, e a chuva e a poeira deixam marca. Quem olha só um dia ensolarado superestima; quem olha só um dia nublado desiste. A verdade útil está na série anual: a soma e a forma da geração ao longo dos doze meses, que é o que paga a conta e dimensiona o sistema." },
        { tipo: "texto", texto: "Analisar o ano inteiro revela três coisas que o olho não vê: a sazonalidade (o padrão que se repete a cada ano), a tendência (a usina está degradando?) e a variabilidade (quanto um ano difere do outro). São exatamente os componentes que a análise de séries temporais sabe separar. Este caderno usa dados abertos para medir cada um deles sem precisar de um único sensor no começo." },
        { tipo: "video", titulo: "Produção de energia solar cresce no Brasil e vira a 2ª maior fonte", youtube: "d06KQa680g4" },
        {
          tipo: "licao",
          pergunta: "Por que a série anual é melhor do que um dia típico para dimensionar geração?",
          alternativas: [
            "Porque um dia tem mais horas de sol",
            "Porque só a série anual mostra sazonalidade, tendência e variabilidade entre anos",
            "Porque o inversor só funciona com dados anuais",
          ],
          correta: 1,
          explicacao: "A energia que paga a conta é a soma do ano. Sazonalidade, tendência e variabilidade interanual só aparecem quando se olha a série completa, não um instante.",
        },
      ],
    },
    {
      id: "dados-abertos-promessa",
      titulo: "A promessa dos dados abertos",
      blocos: [
        { tipo: "texto", texto: "Vinte anos atrás, medir o recurso solar de um lugar exigia uma estação com piranômetro rodando por anos. Hoje, agências públicas publicam séries horárias modeladas por satélite, de graça, para quase qualquer coordenada do planeta: a NSRDB do NREL (EUA e lista crescente de países), o PVGIS da Comissão Europeia, o NASA POWER (cobertura global) e, no Brasil, o Atlas Brasileiro de Energia Solar do LABREN/INPE." },
        { tipo: "texto", texto: "Dado aberto não é dado perfeito: cada fonte tem resolução, período e incerteza próprios, e vem com licença (muitas pedem citação). Mas a promessa é real: com uma coordenada e uma linha de código, você baixa anos de irradiância e temperatura e começa a análise. O caderno vai mostrar de onde vem cada número e como cruzar fontes para não confiar cego em uma só." },
        { tipo: "diagrama", titulo: "O ecossistema de dados abertos", codigo: `flowchart LR
  SAT["Satelite + modelo"] --> NSRDB["NSRDB / NREL"]
  SAT --> PVGIS["PVGIS / JRC"]
  SAT --> POWER["NASA POWER"]
  SAT --> ATLAS["Atlas Brasil / LABREN"]
  SOLO["Estacoes de solo"] --> INMET["INMET"]
  MEDIDO["Geracao medida"] --> ONS["ONS dados abertos"]
  MEDIDO --> ANEEL["ANEEL GD"]
  NSRDB --> AN["Sua analise"]
  PVGIS --> AN
  POWER --> AN
  ATLAS --> AN
  INMET --> AN
  ONS --> AN
  ANEEL --> AN` },
      ],
    },
    {
      id: "pergunta-certa",
      titulo: "A pergunta que este caderno responde",
      blocos: [
        { tipo: "texto", texto: "Toda boa análise começa por uma pergunta bem feita. A nossa: para um lugar e uma configuração de painel (potência, inclinação, orientação), como será a geração mensal esperada ao longo de um ano típico, com que incerteza, e quanto um ano ruim difere de um ano bom? Responder isso bem exige recurso solar, um modelo de conversão e estatística de série temporal." },
        { tipo: "texto", texto: "Perguntas derivadas que o caderno também ataca: qual mês gera menos (o mês de projeto)? Qual o fator de capacidade do sistema? A geração medida de uma usina real bate com o modelo? Há degradação ano a ano? Cada pergunta vira um pedaço do pipeline. Anote a sua antes de baixar qualquer dado: a pergunta decide a fonte, a resolução e a métrica." },
        {
          tipo: "tarefas",
          itens: [
            { id: "t-perg-1", titulo: "Escolher um lugar", entrega: "Latitude e longitude de um telhado ou terreno real, anotadas com 4 casas decimais." },
            { id: "t-perg-2", titulo: "Definir o sistema", entrega: "Potência (kWp), inclinação e azimute do painel que você quer analisar, escritos em uma linha." },
            { id: "t-perg-3", titulo: "Escrever a pergunta", entrega: "Uma frase única no formato: quanto gera por mês em [lugar] um sistema de [kWp] inclinado a [graus] voltado para [direção]?" },
          ],
        },
      ],
    },
    {
      id: "retrato-brasil",
      titulo: "O retrato do Brasil: muito sol, pouca sazonalidade",
      blocos: [
        { tipo: "texto", texto: "O Brasil tem um recurso solar invejável: o Atlas Brasileiro de Energia Solar (2ª ed., LABREN/INPE, 2017) mostra irradiação diária média no plano inclinado que, em boa parte do país, fica entre 4,5 e 6,0 kWh/m² por dia, com o Nordeste semiárido no topo. Por estar perto do Equador, a sazonalidade anual é mais suave que na Europa: a razão entre o mês melhor e o pior raramente passa de 1,5, contra 3 ou mais em latitudes altas." },
        { tipo: "texto", texto: "Isso tem consequência prática na análise: no Brasil, o fator que mais mexe a série mês a mês costuma ser a nebulosidade e a estação chuvosa, não a geometria solar pura. Em Manaus o vilão é a chuva; no semiárido, o céu limpo quase o ano todo deixa a curva anual bem chata. Saber o regime do lugar antes de abrir o dado evita conclusão errada." },
        { tipo: "video", titulo: "Geração de energia solar no Brasil cresce 38% e bate recorde", youtube: "Zj37yaFxUBI" },
        {
          tipo: "prancha",
          titulo: "Sazonalidade: Equador x latitude alta",
          desenho: {
            legenda: "Geração mensal esquemática. Perto do Equador (linha cheia) a curva anual é quase plana; em latitude alta (linha pontilhada) o verão gera muito mais que o inverno.",
            primitivas: [
              { t: "linha", de: [20, 170], ate: [290, 170], cor: "tinta" },
              { t: "linha", de: [20, 20], ate: [20, 170], cor: "tinta" },
              { t: "rotulo", p: [4, 95], texto: "kWh" },
              { t: "rotulo", p: [250, 178], texto: "mes" },
              { t: "curva", pts: [[20, 70], [65, 62], [110, 60], [155, 66], [200, 64], [245, 60], [290, 68]], cor: "destaque" },
              { t: "rotulo", p: [120, 50], texto: "Equador (chata)" },
              { t: "curva", pts: [[20, 150], [65, 120], [110, 70], [155, 40], [200, 55], [245, 110], [290, 150]], cor: "suave" },
              { t: "rotulo", p: [150, 34], texto: "Latitude alta (verao)" },
            ],
          },
        },
      ],
    },
    {
      id: "serie-temporal-def",
      titulo: "O que é uma série temporal de geração",
      blocos: [
        { tipo: "texto", texto: "Uma série temporal é uma sequência de valores indexada pelo tempo em passos regulares: irradiância a cada hora, energia a cada dia, geração a cada mês. O que a torna especial é que a ordem importa e os valores vizinhos se parecem (autocorrelação). A geração solar é um caso clássico, com dois ciclos encaixados: o diário (nasce e põe o Sol) e o anual (as estações)." },
        { tipo: "texto", texto: "Analisar a série é separar o que nela é padrão do que é ruído. O arcabouço clássico decompõe a série em tendência (movimento lento de fundo), sazonalidade (o padrão que se repete a cada período) e resíduo (o que sobra, ligado a nuvens e eventos). Guarde esses três nomes: o caderno volta a eles no cálculo e os calcula de verdade na execução." },
        { tipo: "diagrama", titulo: "Decomposição de uma série", codigo: `flowchart TD
  Y["Serie observada (geracao)"] --> T["Tendencia: degradacao, crescimento"]
  Y --> S["Sazonalidade: ciclo diario e anual"]
  Y --> R["Residuo: nuvens, eventos, ruido"]
  T --> M["Y = T + S + R (aditivo)"]
  S --> M
  R --> M` },
        {
          tipo: "licao",
          pergunta: "Na decomposição clássica de uma série temporal, a repetição previsível a cada ano é chamada de:",
          alternativas: ["Tendência", "Sazonalidade", "Resíduo"],
          correta: 1,
          explicacao: "Tendência é o movimento lento de fundo; resíduo é o que sobra sem padrão; sazonalidade é justamente o ciclo que se repete a cada período fixo, como o ano.",
        },
      ],
    },
    {
      id: "fontes-contexto",
      titulo: "Fontes: contexto e panorama",
      blocos: [
        { tipo: "texto", texto: "Estes endereços sustentam o capítulo e servem de porta de entrada para o recurso solar brasileiro e mundial. Guarde-os: o caderno volta a eles no método e no cálculo." },
        { tipo: "fontes", titulo: "Panorama e atlas", itens: [
          { titulo: "Atlas Brasileiro de Energia Solar, 2ª edição (LABREN/INPE, 2017)", url: "https://labren.ccst.inpe.br/atlas_2017-en.html", tipo: "livro", nota: "Irradiação por satélite (modelo BRASIL-SR) para todo o país; base do recurso solar nacional. DOI 10.34024/978851700089." },
          { titulo: "Atlas Brasileiro de Energia Solar — PDF (2ª ed.)", url: "https://www.absolar.org.br/wp-content/uploads/2021/02/Atlas_Brasileiro_Energia_Solar_2a_Edicao.pdf", tipo: "livro", nota: "Documento completo, 80 p., com mapas de GHI, DNI e plano inclinado por mês." },
          { titulo: "Global Solar Atlas (World Bank / Solargis)", url: "https://globalsolaratlas.info/", tipo: "site", nota: "Mapa interativo global de GHI, DNI e potencial fotovoltaico; download de dados por ponto." },
          { titulo: "ANEEL — Geração Distribuída (painel e dados abertos)", url: "https://www.gov.br/aneel/pt-br/assuntos/geracao-distribuida", tipo: "site", nota: "Evolução da micro e minigeração distribuída no Brasil, por estado e classe." },
        ] },
        {
          tipo: "licao",
          pergunta: "Por que a sazonalidade da geração solar é mais suave no Brasil do que na Europa?",
          alternativas: ["Porque o Brasil tem painéis melhores", "Porque está mais perto do Equador, onde a altura do Sol varia menos ao longo do ano", "Porque chove menos no Brasil"],
          correta: 1,
          explicacao: "A baixa latitude faz a declinação solar variar pouco entre verão e inverno, achatando a curva anual. A nebulosidade passa a ser o fator sazonal dominante.",
        },
      ],
    },
    // ===================== CAPÍTULO 2 — LEITURA DO TEMA: O RECURSO SOLAR =====================
    {
      id: "recurso-solar",
      titulo: "Recurso solar: irradiância e irradiação",
      blocos: [
        { tipo: "texto", texto: "Duas palavras parecidas, sentidos diferentes. Irradiância é potência por área, em watts por metro quadrado (W/m²): quanto de sol chega naquele instante. Irradiação é energia por área, em watt-hora por metro quadrado (Wh/m² ou kWh/m²): a irradiância acumulada ao longo do tempo. A geração do painel segue a irradiância instante a instante; a energia do dia segue a irradiação." },
        { tipo: "texto", texto: "A referência de topo é a constante solar, cerca de 1361 W/m² no topo da atmosfera. No solo, num dia limpo ao meio-dia, chega-se perto de 1000 W/m² — valor, não por acaso, usado como condição padrão de teste (STC) dos painéis. Toda a análise do recurso é entender quanto desses 1000 W/m² chega de fato, hora a hora, no seu lugar e no seu plano." },
        { tipo: "video", titulo: "How Solar Panels Turn Sunlight into Electricity (efeito fotovoltaico)", youtube: "9o4xWVoVNvY" },
        {
          tipo: "licao",
          pergunta: "Qual é a diferença entre irradiância e irradiação?",
          alternativas: [
            "São sinônimos exatos",
            "Irradiância é potência por área (W/m²); irradiação é energia por área acumulada no tempo (Wh/m²)",
            "Irradiância é no inverno e irradiação é no verão",
          ],
          correta: 1,
          explicacao: "Irradiância é a taxa instantânea (W/m²); integrada no tempo vira irradiação (Wh/m²). A primeira move a potência do painel; a segunda, a energia do dia.",
        },
      ],
    },
    {
      id: "ghi-dni-dhi",
      titulo: "GHI, DNI e DHI: as três componentes",
      blocos: [
        { tipo: "texto", texto: "A luz que chega ao solo tem três formas. DNI (Direct Normal Irradiance) é o feixe direto do Sol, medido num plano perpendicular a ele. DHI (Diffuse Horizontal Irradiance) é a luz espalhada pela atmosfera e pelas nuvens, que chega de todas as direções. GHI (Global Horizontal Irradiance) é o total que atinge uma superfície horizontal. As três são a base de qualquer dataset solar." },
        { tipo: "texto", texto: "Elas se ligam por uma equação exata: GHI = DHI + DNI × cos(θz), onde θz é o ângulo zenital (o quanto o Sol está longe do ponto a pino). Num dia limpo, o DNI domina; num dia nublado, quase tudo é DHI e o GHI despenca. Datasets como NSRDB e PVGIS entregam as três componentes separadas justamente porque o painel inclinado precisa recombiná-las." },
        {
          tipo: "prancha",
          titulo: "As três componentes da irradiância",
          desenho: {
            legenda: "DNI é o feixe direto; DHI é a luz difusa do céu; GHI é o total no plano horizontal. GHI = DHI + DNI x cos(theta_z).",
            primitivas: [
              { t: "circulo", c: [250, 40], r: 16, cor: "destaque" },
              { t: "rotulo", p: [236, 20], texto: "Sol" },
              { t: "seta", de: [240, 52], ate: [150, 150], cor: "tinta" },
              { t: "rotulo", p: [195, 95], texto: "DNI (direto)" },
              { t: "seta", de: [120, 30], ate: [150, 150], cor: "suave" },
              { t: "seta", de: [60, 50], ate: [150, 150], cor: "suave" },
              { t: "rotulo", p: [40, 40], texto: "DHI (difuso)" },
              { t: "linha", de: [40, 150], ate: [270, 150], cor: "tinta" },
              { t: "rotulo", p: [110, 160], texto: "plano horizontal = GHI" },
              { t: "linha", de: [150, 150], ate: [150, 100], cor: "suave" },
              { t: "rotulo", p: [152, 120], texto: "theta_z" },
            ],
          },
        },
        {
          tipo: "licao",
          pergunta: "Em um dia totalmente nublado, qual componente domina a irradiância que chega ao solo?",
          alternativas: ["DNI (feixe direto)", "DHI (difusa)", "A constante solar"],
          correta: 1,
          explicacao: "As nuvens bloqueiam o feixe direto (DNI cai muito) e espalham a luz: quase toda a irradiância passa a ser difusa (DHI).",
        },
      ],
    },
    {
      id: "angulo-solar",
      titulo: "Geometria solar: zênite, azimute e declinação",
      blocos: [
        { tipo: "texto", texto: "Para saber quanta luz cai no painel, é preciso saber onde o Sol está. Três ângulos bastam. O zenital (θz) mede o quanto o Sol está afastado do ponto a pino: 0° ao meio-dia solar no Equador, 90° no nascer e no pôr. O azimute diz a direção na bússola. A declinação (δ) é a inclinação do eixo da Terra projetada no dia do ano: varia de -23,45° a +23,45° e é a raiz da sazonalidade." },
        { tipo: "texto", texto: "A boa notícia: essas posições são pura astronomia, calculáveis com precisão de segundos para qualquer data e lugar pelo algoritmo SPA do NREL (implementado no pvlib como pvlib.solarposition). Ou seja, a parte geométrica da série nunca é incerteza — ela é determinística. O que resta incerto é a atmosfera (nuvens, aerossóis), e é aí que mora o trabalho estatístico." },
        { tipo: "diagrama", titulo: "O que é determinístico e o que é incerto", codigo: `flowchart LR
  DATA["Data e hora"] --> POS["Posicao do Sol (SPA/NREL)"]
  LOCAL["Lat/Lon"] --> POS
  POS --> DET["Deterministico: zenite, azimute, declinacao"]
  ATM["Atmosfera: nuvens, aerossol, vapor"] --> INC["Incerto: quanto do feixe passa"]
  DET --> GER["Geracao"]
  INC --> GER` },
        {
          tipo: "tarefas",
          itens: [
            { id: "t-geo-1", titulo: "Marcar o meio-dia solar", entrega: "Para o seu lugar, descobrir a que hora (local) o Sol fica mais alto hoje, usando um app ou pvlib.solarposition." },
            { id: "t-geo-2", titulo: "Anotar a declinação de hoje", entrega: "Valor aproximado da declinação solar na data de hoje (entre -23,45 e +23,45 graus)." },
          ],
        },
      ],
    },
    {
      id: "poa-transposicao",
      titulo: "A irradiância no plano do painel (POA)",
      blocos: [
        { tipo: "texto", texto: "O painel quase nunca está deitado no chão: ele é inclinado para captar mais Sol. Por isso o que importa para a geração não é o GHI horizontal, e sim a irradiância no plano do arranjo (POA, plane-of-array). Transformar GHI em POA é a transposição: um modelo que projeta as componentes direta e difusa para o plano inclinado, somando ainda a parcela refletida do chão (albedo)." },
        { tipo: "texto", texto: "Modelos de transposição têm nome: isotrópico simples, Hay-Davies, Reindl, Perez. O pvlib traz todos (pvlib.irradiance.get_total_irradiance), com o Hay-Davies como padrão do ModelChain. Regra de ouro no Brasil: inclinar o painel num ângulo próximo à latitude do lugar, voltado para o Norte geográfico, maximiza a irradiação anual. É a primeira decisão de projeto que a análise confirma com dado." },
        {
          tipo: "prancha",
          titulo: "Transposição: do horizontal ao plano inclinado",
          desenho: {
            legenda: "O painel inclinado a um angulo beta (proximo da latitude) recebe mais feixe direto no inverno do que um painel deitado. POA = direto no plano + difuso + refletido.",
            primitivas: [
              { t: "linha", de: [20, 150], ate: [150, 150], cor: "tinta" },
              { t: "rotulo", p: [40, 160], texto: "horizontal (GHI)" },
              { t: "linha", de: [170, 150], ate: [260, 100], cor: "destaque" },
              { t: "rotulo", p: [200, 150], texto: "beta" },
              { t: "rotulo", p: [230, 90], texto: "painel (POA)" },
              { t: "seta", de: [250, 30], ate: [215, 120], cor: "suave" },
              { t: "rotulo", p: [240, 20], texto: "Sol" },
              { t: "linha", de: [170, 150], ate: [200, 150], cor: "tinta" },
            ],
          },
        },
        {
          tipo: "licao",
          pergunta: "Para a maior geração anual no Brasil (Hemisfério Sul), o painel fixo deve apontar para:",
          alternativas: ["O Sul geográfico", "O Norte geográfico, inclinado perto da latitude do local", "Sempre para o Leste"],
          correta: 1,
          explicacao: "No Hemisfério Sul o Sol passa ao Norte na média do ano. Apontar ao Norte e inclinar perto da latitude maximiza a irradiação anual captada.",
        },
      ],
    },
    {
      id: "sazonalidade-anual",
      titulo: "A sazonalidade anual",
      blocos: [
        { tipo: "texto", texto: "A sazonalidade anual nasce de dois fatores encaixados. O primeiro é geométrico: a declinação muda o comprimento do dia e a altura máxima do Sol, então até um céu sempre limpo geraria mais no verão do que no inverno (efeito forte em latitude alta, fraco perto do Equador). O segundo é climático: a estação chuvosa e a nebulosidade recortam a irradiância em meses específicos do ano." },
        { tipo: "texto", texto: "Na série de geração, os dois aparecem como um padrão que se repete a cada 12 meses. É esse padrão que a decomposição vai isolar como componente sazonal. Entender a origem física ajuda a ler o resultado: se o mês mais fraco é junho num lugar de latitude alta, é geometria; se é a estação das águas, é clima. Nomear a causa evita tratar ruído como tendência." },
        { tipo: "video", titulo: "But what is a Fourier series? (base matemática da sazonalidade)", youtube: "r6sGWTCMz2k" },
        { tipo: "diagrama", titulo: "Duas raízes da sazonalidade", codigo: `flowchart TD
  DEC["Declinacao solar (eixo da Terra)"] --> GEO["Sazonalidade geometrica"]
  LAT["Latitude do lugar"] --> GEO
  CHUVA["Estacao chuvosa / nuvens"] --> CLIM["Sazonalidade climatica"]
  AEROSOL["Aerossol e umidade"] --> CLIM
  GEO --> SAZ["Padrao anual na serie"]
  CLIM --> SAZ` },
      ],
    },
    {
      id: "ciclo-diario",
      titulo: "O ciclo diário: a curva de sino",
      blocos: [
        { tipo: "texto", texto: "Dentro de cada dia, a geração desenha uma curva de sino: zero antes do nascer, subindo até um pico perto do meio-dia solar, caindo até zerar no pôr. A largura do sino é o comprimento do dia (maior no verão); a altura é a irradiância de pico (menor sob nuvem). Essa é a sazonalidade de período 24 h, a mais forte e regular da série." },
        { tipo: "texto", texto: "A curva diária importa para três coisas: casar geração com consumo (o pico solar raramente coincide com o pico de uso noturno, origem da famosa 'duck curve'), dimensionar inversor (que satura num teto) e escolher a resolução da análise. Para a série anual, agregamos o dia em energia; para operação, guardamos a curva horária. Decida cedo qual resolução a pergunta exige." },
        {
          tipo: "prancha",
          titulo: "A curva diária em verão e inverno",
          desenho: {
            legenda: "Potencia ao longo do dia. No verao (linha cheia) o sino e mais largo e alto; no inverno (pontilhado) e mais estreito e baixo.",
            primitivas: [
              { t: "linha", de: [20, 160], ate: [290, 160], cor: "tinta" },
              { t: "linha", de: [20, 20], ate: [20, 160], cor: "tinta" },
              { t: "rotulo", p: [2, 90], texto: "kW" },
              { t: "rotulo", p: [150, 168], texto: "hora do dia" },
              { t: "curva", pts: [[40, 160], [80, 90], [120, 45], [155, 35], [190, 45], [230, 90], [270, 160]], cor: "destaque" },
              { t: "rotulo", p: [130, 28], texto: "verao" },
              { t: "curva", pts: [[70, 160], [100, 115], [130, 90], [155, 82], [180, 90], [210, 115], [240, 160]], cor: "suave" },
              { t: "rotulo", p: [195, 120], texto: "inverno" },
            ],
          },
        },
        {
          tipo: "licao",
          pergunta: "Qual é o período (comprimento do ciclo) da sazonalidade mais forte na série de geração solar?",
          alternativas: ["24 horas (ciclo diário)", "7 dias (semana)", "28 dias (lua)"],
          correta: 0,
          explicacao: "O ciclo diário, de 24 h, é a sazonalidade mais forte e regular: o Sol nasce e se põe todo dia. O ciclo anual, de ~365 dias, é a segunda.",
        },
      ],
    },
    {
      id: "variabilidade-nuvens",
      titulo: "Variabilidade: nuvens e intermitência",
      blocos: [
        { tipo: "texto", texto: "Entre a geometria limpa e a geração real está a atmosfera. Nuvens passando cortam a irradiância em segundos e a devolvem logo depois; num minuto a potência de uma usina pode cair pela metade e voltar. Essa variabilidade de curto prazo é o resíduo da série depois de tirar os ciclos diário e anual, e é ela que torna a energia solar uma fonte intermitente que o sistema elétrico precisa gerenciar." },
        { tipo: "texto", texto: "Para a série anual, a variabilidade de minuto importa menos: ela se dilui quando agregamos em energia diária e mensal. Mas a variabilidade interanual (um ano mais nublado que outro) é central: ela define a incerteza da previsão de geração. Datasets de vários anos permitem medir o quanto um ano típico pode variar — tipicamente alguns por cento no Brasil, mais em climas instáveis." },
        { tipo: "diagrama", titulo: "Escalas de variabilidade", codigo: `flowchart LR
  SEG["Segundos/minutos: nuvens passando"] --> CURTO["Intermitencia (operacao, rede)"]
  DIA["Dia a dia: tempo meteorologico"] --> MEDIO["Variabilidade mensal"]
  ANO["Ano a ano: clima"] --> LONGO["Variabilidade interanual (incerteza do projeto)"]` },
        {
          tipo: "licao",
          pergunta: "Ao agregar a série de potência por minuto em energia mensal, o que acontece com a variabilidade causada por nuvens passando?",
          alternativas: ["Aumenta muito", "Dilui-se, porque picos e quedas se compensam na soma", "Vira tendência"],
          correta: 1,
          explicacao: "A agregação soma muitos instantes; flutuações rápidas de nuvens se compensam e quase somem na energia mensal. Sobra a variabilidade de escalas mais longas.",
        },
      ],
    },
    {
      id: "clearsky",
      titulo: "O céu limpo como régua",
      blocos: [
        { tipo: "texto", texto: "Para medir o quanto a atmosfera recorta a irradiância, precisamos de uma régua: quanto chegaria num céu perfeitamente limpo. Modelos de clear-sky (Ineichen-Perez, Simplified Solis, Haurwitz) calculam essa referência só com geometria solar e um parâmetro de turbidez. O pvlib traz todos em pvlib.clearsky, e o ModelChain usa o Ineichen por padrão." },
        { tipo: "texto", texto: "Dividir a irradiância medida pela do céu limpo dá o índice de céu limpo (clear-sky index, kt*), um número entre 0 (totalmente encoberto) e ~1 (limpo), às vezes passando de 1 em bordas de nuvem. Esse índice é lindo para análise porque remove a sazonalidade geométrica: o que sobra é só o efeito do tempo. Muitos métodos de limpeza e de preenchimento de lacuna trabalham sobre ele." },
        {
          tipo: "prancha",
          titulo: "Céu limpo x medido, e o índice",
          desenho: {
            legenda: "A curva de ceu limpo (suave) e o teto geometrico; a medida (destaque) fica abaixo quando passa nuvem. O indice kt* = medido / ceu limpo.",
            primitivas: [
              { t: "linha", de: [20, 160], ate: [290, 160], cor: "tinta" },
              { t: "linha", de: [20, 20], ate: [20, 160], cor: "tinta" },
              { t: "curva", pts: [[30, 160], [80, 80], [130, 45], [160, 40], [190, 45], [240, 80], [285, 160]], cor: "suave" },
              { t: "rotulo", p: [150, 28], texto: "ceu limpo" },
              { t: "curva", pts: [[30, 160], [80, 85], [110, 60], [130, 110], [150, 70], [175, 95], [200, 55], [240, 90], [285, 160]], cor: "destaque" },
              { t: "rotulo", p: [95, 125], texto: "medido (nuvens)" },
              { t: "rotulo", p: [150, 172], texto: "hora" },
            ],
          },
        },
      ],
    },
    {
      id: "variaveis-meteo",
      titulo: "As variáveis meteorológicas que entram no modelo",
      blocos: [
        { tipo: "texto", texto: "A irradiância é a estrela, mas não gera sozinha. A temperatura ambiente e a velocidade do vento definem a temperatura da célula, e painel quente gera menos (o coeficiente típico do silício é cerca de -0,35 a -0,45 %/°C). O vapor de água e os aerossóis atenuam o feixe. A poeira depositada (soiling) reduz a captação. Um bom dataset entrega irradiância, temperatura e vento na mesma série." },
        { tipo: "texto", texto: "Por isso datasets como NSRDB trazem, além de GHI/DNI/DHI, temperatura, ponto de orvalho, pressão, umidade, albedo, tipo de nuvem e água precipitável — tudo no mesmo passo de tempo. Na análise, a temperatura é a segunda variável mais importante depois da irradiância: ignorá-la superestima a geração de verão, justo quando o painel está mais quente." },
        {
          tipo: "licao",
          pergunta: "Por que incluir a temperatura ambiente melhora a estimativa de geração?",
          alternativas: [
            "Porque o inversor desliga no frio",
            "Porque o painel quente perde eficiência (coeficiente negativo), reduzindo a potência em dias quentes",
            "Porque a temperatura muda a irradiância",
          ],
          correta: 1,
          explicacao: "O silício tem coeficiente de potência negativo com a temperatura (~-0,4 %/°C). Em dias quentes a célula esquenta e gera menos do que a irradiância sozinha sugeriria.",
        },
      ],
    },
    {
      id: "fontes-recurso",
      titulo: "Fontes: o recurso solar e a física",
      blocos: [
        { tipo: "texto", texto: "Definições e modelos deste capítulo têm lastro em normas de radiometria e na literatura técnica. Guarde para consultar na hora de escolher o dataset e o modelo." },
        { tipo: "fontes", titulo: "Radiometria, geometria e modelos", itens: [
          { titulo: "ISO 9060:2018 — Classificação de instrumentos de radiação solar", url: "https://www.iso.org/standard/67464.html", tipo: "norma", nota: "Define classes de piranômetros e pireliômetros; base para a qualidade de dados de solo." },
          { titulo: "WMO — Guide to Instruments and Methods of Observation (CIMO Guide), cap. 7 Radiação", url: "https://library.wmo.int/idurl/4/68695", tipo: "norma", nota: "Padrão internacional de medição de radiação solar em superfície." },
          { titulo: "pvlib-python — documentação (solarposition, irradiance, clearsky)", url: "https://pvlib-python.readthedocs.io/en/stable/", tipo: "site", nota: "Implementa SPA, transposição (Hay-Davies/Perez) e clear-sky (Ineichen). Código aberto, revisado." },
          { titulo: "CRESESB/CEPEL — Centro de Referência para Energia Solar e Eólica", url: "http://www.cresesb.cepel.br/", tipo: "site", nota: "Potencial solar por município no Brasil e material didático em português." },
        ] },
        {
          tipo: "licao",
          pergunta: "O índice de céu limpo (clear-sky index) é útil na análise porque:",
          alternativas: ["Aumenta a geração", "Remove a sazonalidade geométrica, deixando só o efeito do tempo", "Substitui a temperatura"],
          correta: 1,
          explicacao: "Dividir o medido pelo céu limpo tira a parte determinística (geometria), isolando o efeito das nuvens — ideal para limpeza e preenchimento.",
        },
      ],
    },
    // ===================== CAPÍTULO 3 — MÉTODO: FONTES DE DADOS ABERTOS =====================
    {
      id: "mapa-fontes",
      titulo: "Mapa das fontes de dados abertos",
      blocos: [
        { tipo: "texto", texto: "Há três famílias de dado aberto úteis aqui. Recurso solar modelado por satélite (NSRDB, PVGIS, NASA POWER, Atlas Brasileiro, Global Solar Atlas): cobre quase qualquer coordenada, em série histórica, e é a base para estimar geração. Medição de solo (INMET, redes de piranômetros): precisa onde existe estação, serve de referência. E geração medida real (ONS, ANEEL GD): a verdade do que as usinas entregaram." },
        { tipo: "texto", texto: "A escolha depende da pergunta. Para estimar a geração futura de um telhado sem sensor, use satélite. Para validar o modelo, cruze com solo e com geração medida. Nenhuma fonte é a verdade absoluta: satélite tem viés e resolução espacial grosseira; solo tem furos e cobre poucos pontos; geração medida mistura o recurso com o desempenho do sistema. O método é triangular." },
        { tipo: "diagrama", titulo: "Qual fonte para qual pergunta", codigo: `flowchart TD
  Q1["Estimar geracao de um lugar sem sensor"] --> SAT["Satelite: PVGIS, NSRDB, POWER, Atlas"]
  Q2["Validar o recurso localmente"] --> SOLO["Solo: INMET, redes de piranometro"]
  Q3["Saber o que as usinas geraram"] --> GER["Medido: ONS, ANEEL GD"]
  SAT --> TRI["Triangular (cruzar fontes)"]
  SOLO --> TRI
  GER --> TRI` },
      ],
    },
    {
      id: "nsrdb",
      titulo: "NSRDB — a base do NREL",
      blocos: [
        { tipo: "texto", texto: "A National Solar Radiation Database (NSRDB), do NREL, é uma das maiores bases públicas de recurso solar. O modelo físico PSM v3 produz GHI, DNI e DHI em passo de 30 minutos, em células de cerca de 4 km, para os EUA e uma lista crescente de países (incluindo partes da América do Sul). Traz também temperatura, vento, albedo, tipo de nuvem e água precipitável — tudo na mesma série." },
        { tipo: "texto", texto: "O acesso é por API (chave gratuita de desenvolvedor) ou por download, e também por cópias em nuvem (AWS/Azure) em formato HDF5. A qualidade é documentada: o viés médio do GHI fica tipicamente dentro de poucos por cento contra estações de referência. É a fonte certa quando você quer uma série horária longa e consistente para modelar geração com pvlib." },
        { tipo: "diagrama", titulo: "Caminho até a série NSRDB", codigo: `flowchart LR
  KEY["Chave de API (gratuita)"] --> REQ["Requisicao: lat, lon, ano"]
  REQ --> CSV["CSV/HDF5: GHI, DNI, DHI, T, vento"]
  CSV --> PV["pvlib: modelo de geracao"]
  PV --> SERIE["Serie horaria de potencia"]` },
        {
          tipo: "tarefas",
          itens: [
            { id: "t-nsrdb-1", titulo: "Pedir a chave de API", entrega: "Chave de desenvolvedor do NREL solicitada (gratuita) e guardada fora do código, numa variável de ambiente." },
            { id: "t-nsrdb-2", titulo: "Baixar um ano", entrega: "Um CSV de um ano para a coordenada escolhida, com as colunas GHI, DNI, DHI e temperatura." },
          ],
        },
      ],
    },
    {
      id: "pvgis",
      titulo: "PVGIS — a calculadora aberta da Europa",
      blocos: [
        { tipo: "texto", texto: "O PVGIS, do Joint Research Centre da Comissão Europeia, é talvez a fonte mais prática para começar: cobre Europa, África, boa parte da Ásia e das Américas, e entrega não só irradiância, mas a geração fotovoltaica já calculada. O endpoint seriescalc devolve a série horária de potência dado lat/lon, potência de pico e perdas; o endpoint tmy devolve um ano meteorológico típico." },
        { tipo: "texto", texto: "A versão atual é a 5.3, acessível sem interface pela API web, com saída em CSV, JSON ou EPW. É gratuito e sem chave. O pvlib embrulha isso em pvlib.iotools.get_pvgis_tmy e get_pvgis_hourly, o que torna trivial trazer a série para o pandas. Atenção a um detalhe: o TMY da API usa todos os anos disponíveis, enquanto o do site usa 10 — podem diferir." },
        { tipo: "fontes", titulo: "PVGIS", itens: [
          { titulo: "PVGIS — página oficial (JRC, Comissão Europeia)", url: "https://joint-research-centre.ec.europa.eu/photovoltaic-geographical-information-system-pvgis_en", tipo: "site", nota: "Ferramenta interativa e documentação; dados de irradiância e geração PV." },
          { titulo: "PVGIS — API não interativa (seriescalc, tmy)", url: "https://joint-research-centre.ec.europa.eu/photovoltaic-geographical-information-system-pvgis/getting-started-pvgis/api-non-interactive-service_en", tipo: "site", nota: "Endpoints, parâmetros e exemplos de URL para baixar série horária e TMY." },
          { titulo: "pvlib.iotools.get_pvgis_tmy — documentação", url: "https://pvlib-python.readthedocs.io/en/stable/reference/generated/pvlib.iotools.get_pvgis_tmy.html", tipo: "site", nota: "Função Python que baixa o TMY do PVGIS direto para um DataFrame." },
        ] },
      ],
    },
    {
      id: "nasa-power",
      titulo: "NASA POWER — cobertura global",
      blocos: [
        { tipo: "texto", texto: "O NASA POWER (Prediction Of Worldwide Energy Resources) serve séries de irradiância e meteorologia para qualquer ponto do planeta, derivadas de satélite e reanálise, de graça e por API. A resolução espacial é mais grosseira que a do NSRDB (cerca de 0,5°, dezenas de quilômetros), mas a cobertura é global e a série é longa (décadas), o que o torna ótimo para variabilidade interanual e para lugares sem outra fonte." },
        { tipo: "texto", texto: "Para o Brasil, o POWER é um bom complemento ao Atlas: onde o Atlas dá a climatologia mensal consolidada, o POWER dá a série horária/diária ano a ano, que a análise de tendência e de anos atípicos exige. O pvlib também o embrulha (pvlib.iotools.get_nasa_power). Use-o para medir o quão fora da média foi um ano específico." },
        { tipo: "fontes", titulo: "NASA POWER", itens: [
          { titulo: "NASA POWER — portal e documentação", url: "https://power.larc.nasa.gov/", tipo: "dataset", nota: "Irradiância e meteorologia global por API; comunidades de energia, agro e edificações." },
          { titulo: "NASA POWER — documentação da API de dados", url: "https://power.larc.nasa.gov/docs/services/api/", tipo: "site", nota: "Endpoints temporal/point, parâmetros (ALLSKY_SFC_SW_DWN etc.) e formatos de saída." },
        ] },
        {
          tipo: "licao",
          pergunta: "Entre NSRDB (~4 km) e NASA POWER (~0,5°), qual é a vantagem do POWER para analisar variabilidade entre anos?",
          alternativas: ["Maior resolução espacial", "Cobertura global e séries muito longas (décadas)", "Já entrega a geração calculada"],
          correta: 1,
          explicacao: "O POWER tem resolução espacial mais grosseira, mas cobre o planeta inteiro com séries de décadas — ideal para medir quanto um ano difere da média.",
        },
      ],
    },
    {
      id: "atlas-brasil",
      titulo: "Atlas Brasileiro de Energia Solar (LABREN/INPE)",
      blocos: [
        { tipo: "texto", texto: "A referência nacional é o Atlas Brasileiro de Energia Solar, 2ª edição (LABREN, divisão do INPE, 2017), construído com mais de 17 anos de dados de satélite pelo modelo de transferência radiativa BRASIL-SR. Ele publica a climatologia da irradiação (GHI, DNI, difusa e plano inclinado), com média anual e mês a mês, para qualquer ponto do território — exatamente o que fecha a sazonalidade de um projeto no Brasil." },
        { tipo: "texto", texto: "Os dados são baixáveis pelo serviço gov.br em CSV, SHP ou NetCDF (potencial mensal por ponto) e por estado no site do LABREN. A licença é CC BY-NC-ND: uso livre como entrada de análise, desde que se cite a fonte e sem reprodução comercial da base. É a primeira parada para quem analisa geração no Brasil, e a régua contra a qual se checa NSRDB, PVGIS e POWER." },
        { tipo: "video", titulo: "São Paulo lidera a geração solar distribuída no Brasil (CNN)", youtube: "6JSIuVb43z4" },
        { tipo: "fontes", titulo: "Atlas e dados brasileiros", itens: [
          { titulo: "LABREN/INPE — Atlas Brasileiro de Energia Solar (dados por ponto e estado)", url: "https://labren.ccst.inpe.br/atlas_2017-en.html", tipo: "dataset", nota: "Download de irradiação mensal/anual; modelo BRASIL-SR. Citar a fonte (CC BY-NC-ND)." },
          { titulo: "gov.br — Obter dados do Atlas Brasileiro de Energia Solar", url: "https://www.gov.br/pt-br/servicos/obter-dados-do-atlas-brasileiro-de-energia-solar-atlas-solar", tipo: "dataset", nota: "Serviço oficial com CSV, SHP e NetCDF do potencial solar por coordenada." },
        ] },
      ],
    },
    {
      id: "inmet",
      titulo: "INMET — a verdade do solo",
      blocos: [
        { tipo: "texto", texto: "O Instituto Nacional de Meteorologia (INMET) opera uma rede de estações automáticas que medem, entre outras variáveis, a radiação global horária e a temperatura, com histórico disponível no Banco de Dados Meteorológicos (BDMEP). São medidas de solo: onde existe estação, são a referência mais direta do recurso real, sem o intermédio do modelo de satélite." },
        { tipo: "texto", texto: "O preço da medida de solo é a imperfeição: estações têm furos, sensores desalinham e descalibram, e a cobertura espacial é esparsa. Por isso o INMET entra na análise como validação pontual, não como fonte primária de série contínua. Comparar a radiação do INMET com a do satélite no mesmo ponto revela o viés da fonte modelada — passo essencial antes de confiar nela." },
        { tipo: "fontes", titulo: "Dados de solo", itens: [
          { titulo: "INMET — BDMEP (Banco de Dados Meteorológicos)", url: "https://bdmep.inmet.gov.br/", tipo: "dataset", nota: "Série horária de estações automáticas, incluindo radiação global e temperatura." },
          { titulo: "INMET — Portal de dados e estações automáticas", url: "https://portal.inmet.gov.br/dadoshistoricos", tipo: "dataset", nota: "Downloads históricos por estação; use para validar o recurso de satélite localmente." },
        ] },
        {
          tipo: "licao",
          pergunta: "Qual é o papel natural do dado de radiação do INMET numa análise baseada em satélite?",
          alternativas: [
            "Substituir completamente o satélite",
            "Servir de referência de solo para validar e medir o viés da fonte de satélite no ponto",
            "Calcular a posição do Sol",
          ],
          correta: 1,
          explicacao: "A medida de solo é esparsa e tem furos, mas onde existe serve de verdade local: comparar com o satélite revela o viés da fonte modelada.",
        },
      ],
    },
    {
      id: "ons-aneel",
      titulo: "ONS e ANEEL — a geração que de fato aconteceu",
      blocos: [
        { tipo: "texto", texto: "Recurso solar é potencial; geração é o que a usina entregou. O Operador Nacional do Sistema (ONS) publica, no seu portal de dados abertos, a geração horária por fonte e por usina do Sistema Interligado Nacional, incluindo a solar centralizada — a série real de MW que o país produziu. É ouro para validar modelos em escala de usina e de sistema, e para estudar o padrão sazonal agregado." },
        { tipo: "texto", texto: "A ANEEL, por sua vez, abre os dados da geração distribuída (telhados): capacidade instalada por município, classe e data de conexão. Atenção à fronteira: o ONS não enxerga a maior parte da geração distribuída (atrás do medidor), então a solar de telhado é estimada a partir da capacidade da ANEEL com fatores de capacidade típicos. Para o retrato completo, cruze as duas bases." },
        { tipo: "fontes", titulo: "Geração medida e capacidade", itens: [
          { titulo: "ONS — Portal de Dados Abertos (geração por usina e fonte)", url: "https://dados.ons.org.br/", tipo: "dataset", nota: "Série horária do SIN: geração, carga, intercâmbio; solar centralizada medida." },
          { titulo: "ONS Open Data Portal (registro AWS)", url: "https://registry.opendata.aws/ons-opendata-portal/", tipo: "dataset", nota: "Mesmos dados espelhados na nuvem para acesso programático." },
          { titulo: "ANEEL — Portal de Dados Abertos", url: "https://dadosabertos.aneel.gov.br/", tipo: "dataset", nota: "Geração distribuída (micro e minigeração): capacidade por município e classe." },
        ] },
      ],
    },
    {
      id: "global-solar-atlas",
      titulo: "Global Solar Atlas e renewables.ninja",
      blocos: [
        { tipo: "texto", texto: "Duas ferramentas fecham o conjunto. O Global Solar Atlas (Banco Mundial, com dados Solargis) é um mapa global interativo de GHI, DNI e potencial fotovoltaico; serve para um primeiro número rápido e para comparar lugares, com download por ponto. É a fonte ideal para a conversa inicial de viabilidade, antes de descer ao detalhe horário." },
        { tipo: "texto", texto: "O renewables.ninja, dos pesquisadores Stefan Pfenninger e Iain Staffell, converte reanálise (MERRA-2) e satélite (CM-SAF SARAH) em séries horárias de geração fotovoltaica e eólica para qualquer ponto, com metodologia publicada e validada em artigo revisado. É muito usado em estudos de sistema elétrico porque entrega a série pronta e reprodutível — um exemplo de dado aberto com ciência por trás." },
        { tipo: "fontes", titulo: "Mapas e séries prontas", itens: [
          { titulo: "Global Solar Atlas (ESMAP/Banco Mundial, dados Solargis)", url: "https://globalsolaratlas.info/", tipo: "dataset", nota: "GHI, DNI, PVOUT por ponto; comparação rápida entre locais." },
          { titulo: "renewables.ninja — séries horárias de geração PV/eólica", url: "https://www.renewables.ninja/", tipo: "dataset", nota: "Série pronta por ponto; baseada em MERRA-2 e SARAH, metodologia publicada." },
          { titulo: "Pfenninger & Staffell (2016), Energy — validação do método PV", url: "https://doi.org/10.1016/j.energy.2016.08.060", tipo: "artigo", nota: "Artigo que valida a conversão de irradiância em geração usada no renewables.ninja." },
        ] },
      ],
    },
    {
      id: "tmy",
      titulo: "O ano meteorológico típico (TMY)",
      blocos: [
        { tipo: "texto", texto: "Projetar com os 8760 valores de cada ano de uma década é pesado. O Ano Meteorológico Típico (TMY) resolve isso: monta um ano sintético de 8760 horas escolhendo, para cada mês, o mês real mais representativo de uma longa série. O resultado é um ano único que resume a climatologia do lugar — padrão em simulação de energia (PVGIS, NSRDB e software como SAM entregam TMY)." },
        { tipo: "texto", texto: "O TMY é ótimo para a geração esperada média e para o perfil mensal, mas cuidado: por construção, ele suaviza os extremos. Não use TMY para dimensionar o pior ano, nem para estudar variabilidade interanual — para isso é preciso a série multianual real. Regra: TMY responde 'quanto gera num ano típico?'; a série longa responde 'quão ruim pode ser um ano?'." },
        {
          tipo: "prancha",
          titulo: "Como o TMY é montado",
          desenho: {
            legenda: "De varios anos reais, escolhe-se para cada mes o mes mais tipico; a colagem vira um ano sintetico de 8760 horas.",
            primitivas: [
              { t: "retangulo", p: [20, 30], w: 260, h: 24, cor: "suave" },
              { t: "rotulo", p: [24, 20], texto: "Ano 1 ... Ano N (reais)" },
              { t: "seta", de: [150, 56], ate: [150, 90], cor: "tinta" },
              { t: "rotulo", p: [60, 70], texto: "escolhe o mes tipico de cada mes" },
              { t: "retangulo", p: [20, 95], w: 20, h: 40, hachura: true },
              { t: "retangulo", p: [42, 95], w: 20, h: 40, hachura: true },
              { t: "retangulo", p: [64, 95], w: 20, h: 40, hachura: true },
              { t: "retangulo", p: [86, 95], w: 20, h: 40, hachura: true },
              { t: "retangulo", p: [108, 95], w: 20, h: 40, hachura: true },
              { t: "retangulo", p: [130, 95], w: 20, h: 40, hachura: true },
              { t: "rotulo", p: [60, 150], texto: "TMY: 12 meses colados = 1 ano" },
            ],
          },
        },
        {
          tipo: "licao",
          pergunta: "Para que NÃO se deve usar um TMY?",
          alternativas: [
            "Para estimar a geração média de um ano típico",
            "Para dimensionar o pior ano ou estudar a variabilidade entre anos",
            "Para desenhar o perfil mensal médio",
          ],
          correta: 1,
          explicacao: "O TMY, por construção, suaviza extremos. Ele dá o ano típico; para o pior caso e a variabilidade interanual é preciso a série multianual real.",
        },
      ],
    },
    {
      id: "satelite-vs-solo",
      titulo: "Satélite x estação de solo: viés e resolução",
      blocos: [
        { tipo: "texto", texto: "Satélite e solo medem a mesma grandeza por caminhos opostos. O satélite estima a irradiância pela radiância das nuvens vista do espaço, num modelo que cobre tudo mas com resolução de quilômetros e viés de poucos por cento. A estação mede diretamente num ponto, com baixa incerteza, mas só ali e com furos. Nenhum é 'certo' absoluto: são instrumentos com erros de naturezas diferentes." },
        { tipo: "texto", texto: "Na prática, o satélite é melhor para cobertura e consistência espacial; o solo, para exatidão pontual. Estudos de datasets europeus mostram que o fator de capacidade de PV muda de forma perceptível conforme a fonte (reanálise x satélite). Conclusão metodológica: declare qual fonte usou, reporte a incerteza dela, e quando possível ancore o satélite num ponto de solo." },
        { tipo: "diagrama", titulo: "Erros de naturezas diferentes", codigo: `flowchart TD
  SAT["Satelite: cobre tudo"] --> ES["+ consistencia espacial"]
  SAT --> EV["- vies e resolucao de km"]
  SOLO["Estacao: ponto exato"] --> PV2["+ baixa incerteza local"]
  SOLO --> PF["- furos e cobertura esparsa"]
  ES --> USO["Ancorar satelite no solo"]
  PV2 --> USO` },
      ],
    },
    {
      id: "licenca-citacao",
      titulo: "Licença, citação e reprodutibilidade",
      blocos: [
        { tipo: "texto", texto: "Dado aberto não é dado sem regra. O Atlas Brasileiro é CC BY-NC-ND (cite e não use a base para fins comerciais nem a redistribua modificada); o NSRDB e o NASA POWER pedem atribuição; o PVGIS pede citação do JRC; o renewables.ninja tem termos próprios de uso acadêmico. Ignorar a licença é erro técnico e ético, e pode invalidar o uso do seu resultado." },
        { tipo: "texto", texto: "A contrapartida da reprodutibilidade é anotar a proveniência: qual fonte, qual versão/modelo (PSM v3, BRASIL-SR, SARAH), qual período, qual coordenada, quando baixou. Quem repetir a análise tem que chegar ao mesmo número. Guarde o arquivo bruto baixado e um pequeno README de proveniência junto do código — é o que separa uma análise séria de um gráfico bonito sem lastro." },
        {
          tipo: "tarefas",
          itens: [
            { id: "t-lic-1", titulo: "Ler a licença da fonte", entrega: "Uma frase anotada com a licença e a citação exigida de cada dataset que você baixou." },
            { id: "t-lic-2", titulo: "Escrever a proveniência", entrega: "Um README curto: fonte, versão do modelo, período, coordenada e data do download." },
          ],
        },
      ],
    },
    {
      id: "fontes-dados",
      titulo: "Fontes: o mapa completo dos datasets",
      blocos: [
        { tipo: "texto", texto: "A lista-mestra dos datasets abertos citados no capítulo, reunida para consulta rápida na hora de montar o pipeline." },
        { tipo: "fontes", titulo: "Datasets de recurso e geração", itens: [
          { titulo: "NSRDB — National Solar Radiation Database (NREL)", url: "https://nsrdb.nrel.gov/", tipo: "dataset", nota: "GHI/DNI/DHI + meteorologia, 30 min, PSM v3; API e nuvem. EUA e países." },
          { titulo: "NSRDB — catálogo data.gov", url: "https://catalog.data.gov/dataset/national-solar-radiation-database-nsrdb", tipo: "dataset", nota: "Metadados e rotas de acesso ao NSRDB." },
          { titulo: "PVGIS (JRC, Comissão Europeia)", url: "https://joint-research-centre.ec.europa.eu/photovoltaic-geographical-information-system-pvgis_en", tipo: "dataset", nota: "Irradiância e geração PV por ponto; API seriescalc/tmy sem chave." },
          { titulo: "NASA POWER", url: "https://power.larc.nasa.gov/", tipo: "dataset", nota: "Irradiância e meteorologia global, séries de décadas, por API." },
          { titulo: "Atlas Brasileiro de Energia Solar (LABREN/INPE)", url: "https://labren.ccst.inpe.br/atlas_2017-en.html", tipo: "dataset", nota: "Climatologia de irradiação do Brasil (CSV/SHP/NetCDF)." },
          { titulo: "ONS — Dados Abertos (geração do SIN)", url: "https://dados.ons.org.br/", tipo: "dataset", nota: "Geração horária medida por fonte/usina, incl. solar centralizada." },
          { titulo: "ANEEL — Dados Abertos (geração distribuída)", url: "https://dadosabertos.aneel.gov.br/", tipo: "dataset", nota: "Capacidade de GD por município e classe." },
          { titulo: "INMET — BDMEP", url: "https://bdmep.inmet.gov.br/", tipo: "dataset", nota: "Radiação e meteorologia de solo por estação." },
        ] },
      ],
    },
    // ===================== CAPÍTULO 4 — CÁLCULO E MEDIÇÃO =====================
    {
      id: "do-recurso-a-geracao",
      titulo: "Do recurso à geração: a cadeia de conversão",
      blocos: [
        { tipo: "texto", texto: "Entre a irradiância e os quilowatt-hora no medidor há uma cadeia de etapas, cada uma com uma perda. GHI/DNI/DHI viram POA pela transposição; a POA vira potência contínua no painel, descontada a eficiência e a temperatura; a contínua vira alternada no inversor, com sua eficiência; e perdas de cabo, sujeira, sombreamento e disponibilidade comem o resto. O produto de todas essas eficiências é o fio que liga recurso e energia." },
        { tipo: "texto", texto: "Modelar essa cadeia é o coração da análise de geração. Há duas estratégias: a física detalhada (modelo de diodo único, SAPM), que exige muitos parâmetros do módulo, e a simplificada (PVWatts), que resume o sistema em potência de pico e um fator de perdas. Para análise com dado aberto e muitos lugares, o PVWatts é o cavalo de batalha — simples, documentado e suficiente." },
        { tipo: "diagrama", titulo: "A cadeia de conversão", codigo: `flowchart LR
  GHI["GHI/DNI/DHI"] --> POA["Transposicao -> POA"]
  POA --> DC["Potencia DC (eff + temperatura)"]
  DC --> AC["Inversor -> AC"]
  AC --> PERDAS["- cabo, sujeira, sombra, disponibilidade"]
  PERDAS --> KWH["Energia entregue (kWh)"]` },
      ],
    },
    {
      id: "modelo-pvwatts",
      titulo: "O modelo PVWatts",
      blocos: [
        { tipo: "texto", texto: "O PVWatts, do NREL, é o modelo aberto mais usado para estimar geração. A ideia: a potência contínua é a potência nominal (pdc0, em kWp) multiplicada pela razão POA/1000 W/m² e corrigida pela temperatura da célula (coeficiente gamma_pdc, tipicamente -0,0035 a -0,0045 por °C). Depois, um inversor simples e um fator de perdas global (padrão de 14%) levam à energia AC." },
        { tipo: "texto", texto: "No pvlib, o PVWatts vive em pvlib.pvsystem.pvwatts_dc e no atalho ModelChain.with_pvwatts: você informa coordenada, inclinação, azimute, pdc0 e perdas, e recebe a série horária de potência. Com poucos parâmetros e documentação pública, é ideal para rodar muitos lugares e anos — a ferramenta certa para uma análise de dados abertos em escala." },
        {
          tipo: "prancha",
          titulo: "PVWatts: entradas e saídas",
          desenho: {
            legenda: "O PVWatts resume o sistema em poucos numeros: potencia de pico, coeficiente de temperatura e perdas; a saida e a serie de potencia AC.",
            primitivas: [
              { t: "retangulo", p: [10, 40], w: 90, h: 110, cor: "suave" },
              { t: "rotulo", p: [16, 30], texto: "Entradas" },
              { t: "rotulo", p: [16, 60], texto: "POA (W/m2)" },
              { t: "rotulo", p: [16, 80], texto: "T ambiente" },
              { t: "rotulo", p: [16, 100], texto: "pdc0 (kWp)" },
              { t: "rotulo", p: [16, 120], texto: "gamma, perdas" },
              { t: "seta", de: [100, 95], ate: [150, 95], cor: "tinta" },
              { t: "retangulo", p: [150, 60], w: 70, h: 70, cor: "destaque" },
              { t: "rotulo", p: [158, 92], texto: "PVWatts" },
              { t: "seta", de: [220, 95], ate: [265, 95], cor: "tinta" },
              { t: "rotulo", p: [250, 80], texto: "P_AC(t)" },
            ],
          },
        },
        {
          tipo: "licao",
          pergunta: "O que o fator de perdas do PVWatts (padrão 14%) representa?",
          alternativas: [
            "A eficiência do inversor apenas",
            "O conjunto de perdas do sistema: cabo, sujeira, sombreamento, descasamento, disponibilidade",
            "O coeficiente de temperatura",
          ],
          correta: 1,
          explicacao: "É um fator global que agrupa as perdas do sistema além da temperatura e do inversor. O PVWatts documenta cada parcela que soma esses ~14%.",
        },
      ],
    },
    {
      id: "performance-ratio",
      titulo: "Performance ratio (PR): a nota do sistema",
      blocos: [
        { tipo: "texto", texto: "A Performance Ratio (PR) é a métrica que diz quão bem o sistema aproveita o recurso, independente do tamanho e do lugar. Em palavras: é a energia realmente entregue dividida pela energia que o sistema entregaria se operasse na eficiência nominal sob a irradiância recebida. Um PR de 0,80 significa que 80% do potencial virou energia útil; o resto foram perdas por temperatura, sujeira, cabo e inversor." },
        { tipo: "texto", texto: "A norma IEC 61724-1 define como medir PR de forma comparável, inclusive versões corrigidas por temperatura. Sistemas bem projetados no Brasil ficam tipicamente entre 0,75 e 0,85. O PR é a ponte entre a análise de recurso e o mundo real: se o seu modelo de recurso está bom mas a usina entrega menos, o PR baixo aponta onde procurar o problema." },
        { tipo: "diagrama", titulo: "PR como razão de energias", codigo: `flowchart LR
  REC["Recurso (POA recebida)"] --> IDEAL["Energia ideal (eff nominal)"]
  REAL["Energia medida"] --> PR["PR = medida / ideal"]
  IDEAL --> PR
  PR --> DIAG["< 0,75? investigar temperatura, sujeira, falhas"]` },
        {
          tipo: "licao",
          pergunta: "Um sistema com PR = 0,80 significa que:",
          alternativas: [
            "O painel tem 80% de eficiência",
            "80% da energia potencial sob a irradiância recebida virou energia útil entregue",
            "O inversor perde 80%",
          ],
          correta: 1,
          explicacao: "PR compara a energia entregue com a que o sistema entregaria na eficiência nominal sob o mesmo recurso. 0,80 = 20% perdido por temperatura, sujeira, cabo, inversor.",
        },
      ],
    },
    {
      id: "fator-capacidade",
      titulo: "Fator de capacidade",
      blocos: [
        { tipo: "texto", texto: "O fator de capacidade (CF) responde a outra pergunta: quanto da potência instalada o sistema usa na média? É a energia gerada num período dividida pela energia que geraria se operasse na potência nominal o tempo todo. Para PV no Brasil, o CF típico fica entre 15% e 25% — baixo não por falha, mas porque o Sol só brilha parte do dia e com intensidade variável." },
        { tipo: "texto", texto: "Não confunda PR com CF. O PR mede qualidade (quão bem aproveita o recurso disponível); o CF mede intensidade de uso (quanto do nominal, considerando que de noite não há Sol). Um sistema pode ter PR excelente e CF baixo, simplesmente por estar num lugar de menos Sol. Na análise de série anual, o CF é a forma padrão de comparar lugares e tecnologias." },
        {
          tipo: "prancha",
          titulo: "Fator de capacidade: área sob a curva",
          desenho: {
            legenda: "A energia gerada (area sob a curva diaria) frente ao retangulo de potencia nominal x 24 h. O CF e a razao entre as duas areas.",
            primitivas: [
              { t: "linha", de: [20, 160], ate: [290, 160], cor: "tinta" },
              { t: "linha", de: [20, 20], ate: [20, 160], cor: "tinta" },
              { t: "linha", de: [20, 40], ate: [290, 40], cor: "suave" },
              { t: "rotulo", p: [150, 32], texto: "potencia nominal" },
              { t: "curva", pts: [[40, 160], [90, 90], [140, 50], [160, 45], [190, 55], [240, 100], [275, 160]], cor: "destaque" },
              { t: "rotulo", p: [120, 120], texto: "energia gerada" },
              { t: "rotulo", p: [150, 168], texto: "24 h" },
            ],
          },
        },
        {
          tipo: "licao",
          pergunta: "Qual métrica compara melhor a intensidade de uso da potência instalada entre dois lugares?",
          alternativas: ["Performance ratio (PR)", "Fator de capacidade (CF)", "A potência de pico (kWp)"],
          correta: 1,
          explicacao: "O CF normaliza a energia pela potência instalada e pelo tempo, revelando quanto do nominal cada lugar aproveita. PR mede qualidade, não intensidade de recurso.",
        },
      ],
    },
    {
      id: "temperatura-perdas",
      titulo: "Temperatura e o modelo de célula",
      blocos: [
        { tipo: "texto", texto: "A temperatura da célula, não a do ar, é o que reduz a potência. Ela sobe com a irradiância e cai com o vento. Modelos simples estimam-na: o modelo SAPM da Sandia e o modelo PVsyst dão a temperatura da célula a partir de POA, temperatura ambiente e vento, com coeficientes tabelados por tipo de montagem (telhado colado esquenta mais que estrutura ventilada)." },
        { tipo: "texto", texto: "No pvlib, isso é pvlib.temperature.sapm_cell. A consequência na série anual é sutil mas real: o verão tem mais irradiância, mas também células mais quentes, então o ganho sazonal de energia é menor do que a irradiância sozinha sugeriria. Esquecer a temperatura é o erro número um de quem estima geração só com GHI." },
        {
          tipo: "licao",
          pergunta: "Por que uma estrutura de montagem ventilada gera mais que um painel colado no telhado, com a mesma irradiância?",
          alternativas: [
            "Porque recebe mais Sol",
            "Porque dissipa calor melhor, mantendo a célula mais fria e a eficiência mais alta",
            "Porque o inversor é diferente",
          ],
          correta: 1,
          explicacao: "O ar circulando resfria a célula; célula mais fria tem coeficiente de temperatura a seu favor e entrega mais potência sob a mesma irradiância.",
        },
      ],
    },
    {
      id: "energia-integral",
      titulo: "De potência a energia: a integral no tempo",
      blocos: [
        { tipo: "texto", texto: "Potência é taxa; energia é potência acumulada no tempo. A energia de um período é a integral da potência, que na prática de dados vira uma soma: para uma série horária de potência média em kW, a energia em kWh do dia é a soma das 24 potências (porque cada passo dura 1 hora). Para passos de 15 minutos, multiplica-se cada potência por 0,25 h antes de somar." },
        { tipo: "texto", texto: "Esse detalhe do passo de tempo é fonte clássica de erro de fator. Sempre confira a unidade e a duração do intervalo antes de somar: kW em passo de 1 h somam direto em kWh; kW em passo de 30 min pedem o fator 0,5. A série de energia diária e mensal, obtida assim, é a base de tudo o que vem depois — decomposição, sazonalidade, comparação entre anos." },
        {
          tipo: "prancha",
          titulo: "Soma de retângulos horários",
          desenho: {
            legenda: "A energia do dia e a soma das areas: cada barra e a potencia media da hora vezes 1 h. Passo diferente de 1 h muda o fator.",
            primitivas: [
              { t: "linha", de: [20, 160], ate: [290, 160], cor: "tinta" },
              { t: "linha", de: [20, 20], ate: [20, 160], cor: "tinta" },
              { t: "retangulo", p: [60, 130], w: 20, h: 30, hachura: true },
              { t: "retangulo", p: [82, 95], w: 20, h: 65, hachura: true },
              { t: "retangulo", p: [104, 60], w: 20, h: 100, hachura: true },
              { t: "retangulo", p: [126, 50], w: 20, h: 110, hachura: true },
              { t: "retangulo", p: [148, 60], w: 20, h: 100, hachura: true },
              { t: "retangulo", p: [170, 95], w: 20, h: 65, hachura: true },
              { t: "retangulo", p: [192, 130], w: 20, h: 30, hachura: true },
              { t: "rotulo", p: [90, 172], texto: "soma das horas = kWh do dia" },
            ],
          },
        },
      ],
    },
    {
      id: "mobilizacao-medicao",
      titulo: "Quando o número precisa virar medida real",
      blocos: [
        { tipo: "texto", texto: "Até aqui tudo foi estimativa com dado aberto, e isso basta para dimensionar e analisar. Mas há um momento em que a análise precisa de verdade de campo: instalar um piranômetro de referência para medir a irradiância no local, ou ler a geração real do inversor conforme a norma IEC 61724-1 para calcular o PR medido. Essas etapas tocam instalação elétrica e instrumentação calibrada — terreno de profissional habilitado." },
        { tipo: "texto", texto: "Mexer no arranjo fotovoltaico e no ponto de conexão é regulado: no Brasil, as ABNT NBR 16690 (instalações de arranjos fotovoltaicos) e NBR 16274 (requisitos de documentação e comissionamento) definem o que exige responsável técnico. A análise de dados não substitui isso; ela prepara o terreno e consome o dado que o profissional produz." },
        { tipo: "mobilizacao", papel: "Engenheiro eletricista / responsável técnico (CREA)", porque: "Instalar instrumentação de referência (piranômetro classe conforme ISO 9060) e medir a geração real conforme IEC 61724-1 e ABNT NBR 16690/16274 exige habilitação e ART; envolve o arranjo energizado e o ponto de conexão.", entregaEsperada: "Relatório de comissionamento com irradiância medida no plano do arranjo e geração real registrada, pronto para calcular o PR medido e validar o modelo.", gerenciadoPor: "zaeon" },
      ],
    },
    {
      id: "resample-agregacao",
      titulo: "Reamostragem e agregação temporal",
      blocos: [
        { tipo: "texto", texto: "A série nasce horária (ou de 15 min), mas as perguntas vivem em escalas diferentes: energia diária para ver tempo, mensal para ver sazonalidade, anual para ver tendência. Passar de uma escala para outra é reamostrar (resample). Downsampling agrega (soma a energia do mês); upsampling interpola (preenche um passo mais fino). A regra de ouro: energia se soma, potência e irradiância se promediam." },
        { tipo: "texto", texto: "No pandas, isso é uma linha: serie.resample('D').sum() para energia diária, serie.resample('M').sum() para mensal, desde que o índice seja um DatetimeIndex com fuso correto. Trocar soma por média sem pensar é erro comum: somar irradiância média dá um número sem sentido físico. Antes de reamostrar, pergunte: esta grandeza é um fluxo que se acumula (soma) ou um estado que se promedia (média)?" },
        { tipo: "video", titulo: "Master Time Series Resampling in Pandas (with Examples)", youtube: "6DAiE8gpE98" },
        {
          tipo: "licao",
          pergunta: "Ao reamostrar de horário para mensal, qual operação é correta para a energia (kWh) e qual para a irradiância média (W/m²)?",
          alternativas: [
            "Soma para as duas",
            "Soma para a energia; média para a irradiância",
            "Média para as duas",
          ],
          correta: 1,
          explicacao: "Energia é um acumulado: soma-se. Irradiância é um fluxo instantâneo médio: promedia-se (ou soma-se como irradiação, que é outra grandeza). Confundir gera erro de fator.",
        },
      ],
    },
    {
      id: "decomposicao",
      titulo: "Decomposição: tendência, sazonalidade e resíduo",
      blocos: [
        { tipo: "texto", texto: "A decomposição separa a série em três partes: tendência (movimento lento, ligado a degradação ou crescimento da frota), sazonalidade (o padrão que se repete a cada período) e resíduo (o que sobra, ligado a nuvens e eventos). O modelo aditivo (Y = T + S + R) serve quando a amplitude sazonal é estável; o multiplicativo (Y = T × S × R), quando ela cresce com o nível da série." },
        { tipo: "texto", texto: "Ferramentas prontas: statsmodels.tsa.seasonal.seasonal_decompose (clássico, por médias móveis) e STL (Seasonal-Trend decomposition using Loess), mais robusto a outliers e a sazonalidade que muda. Para geração solar, com seus dois períodos (diário e anual), a STL ou a MSTL (múltiplas sazonalidades) costumam ler melhor. O cuidado: informar o período certo (24 para horária diária, 12 para mensal anual)." },
        { tipo: "video", titulo: "Decompose Time Series | Python | Statsmodels", youtube: "DAliigYvEY8" },
        { tipo: "diagrama", titulo: "Escolher o modelo e o período", codigo: `flowchart TD
  SERIE["Serie de geracao"] --> AMP{"Amplitude sazonal cresce com o nivel?"}
  AMP -->|Sim| MULT["Multiplicativo (ou log + aditivo)"]
  AMP -->|Nao| ADIT["Aditivo"]
  ADIT --> PER["Definir periodo: 24 (diario) ou 12 (mensal)"]
  MULT --> PER
  PER --> STL["seasonal_decompose ou STL"]` },
      ],
    },
    {
      id: "media-movel",
      titulo: "Médias móveis e suavização",
      blocos: [
        { tipo: "texto", texto: "A média móvel é a ferramenta mais simples para enxergar a tendência por baixo do ruído: substitui cada ponto pela média de uma janela ao seu redor. Uma janela de 30 dias na energia diária apaga o barulho das nuvens e revela a onda anual; uma janela de 365 dias apaga até a sazonalidade e deixa só a tendência de longo prazo — útil para flagrar degradação." },
        { tipo: "texto", texto: "A escolha da janela é um compromisso: curta demais, ainda há ruído; longa demais, suaviza o que importa. No pandas é serie.rolling(window=30).mean(). Lembre que a média móvel centrada 'come' as bordas da série (não há dado antes do início) e introduz atraso se não for centrada. É um filtro, não mágica: entenda o que ela remove antes de confiar na curva lisa." },
        {
          tipo: "prancha",
          titulo: "Média móvel sobre a série diária",
          desenho: {
            legenda: "A serie diaria (pontilhada, ruidosa) e a media movel de 30 dias (cheia) que revela a onda anual sob o ruido das nuvens.",
            primitivas: [
              { t: "linha", de: [20, 160], ate: [290, 160], cor: "tinta" },
              { t: "linha", de: [20, 20], ate: [20, 160], cor: "tinta" },
              { t: "curva", pts: [[25, 110], [45, 70], [65, 130], [85, 60], [105, 120], [125, 55], [145, 115], [165, 70], [185, 125], [205, 60], [225, 115], [245, 80], [270, 120]], cor: "suave" },
              { t: "curva", pts: [[25, 105], [70, 92], [115, 80], [160, 78], [205, 85], [270, 100]], cor: "destaque" },
              { t: "rotulo", p: [150, 36], texto: "media movel (tendencia+sazonal)" },
              { t: "rotulo", p: [150, 170], texto: "dias do ano" },
            ],
          },
        },
      ],
    },
    {
      id: "fourier-sazonalidade",
      titulo: "Fourier: ver a sazonalidade no espectro",
      blocos: [
        { tipo: "texto", texto: "Há outra forma de enxergar a sazonalidade: no domínio da frequência. A transformada de Fourier decompõe a série numa soma de senoides de frequências diferentes; no espectro resultante, cada ciclo vira um pico. Na geração solar, aparecem dois picos nítidos: um na frequência de 1 ciclo por dia e outro em 1 ciclo por ano. É a sazonalidade medida com régua, sem supor o período de antemão." },
        { tipo: "texto", texto: "Isso é útil para descobrir periodicidades que não se conhecia e para confirmar as que se supõe. Também é a base de modelos que representam a sazonalidade por termos de Fourier (senos e cossenos), como o Prophet e os SARIMAX com regressores harmônicos. Ver o espectro antes de modelar evita escolher o período errado na decomposição." },
        { tipo: "video", titulo: "But what is the Fourier Transform? A visual introduction (3Blue1Brown)", youtube: "spUNpyF58BY" },
        {
          tipo: "prancha",
          titulo: "O espectro da geração: dois picos",
          desenho: {
            legenda: "No dominio da frequencia, a geracao mostra um pico em 1 ciclo/dia e outro em 1 ciclo/ano: suas duas sazonalidades.",
            primitivas: [
              { t: "linha", de: [20, 160], ate: [290, 160], cor: "tinta" },
              { t: "linha", de: [20, 20], ate: [20, 160], cor: "tinta" },
              { t: "rotulo", p: [2, 90], texto: "amp" },
              { t: "linha", de: [70, 160], ate: [70, 60], cor: "destaque" },
              { t: "rotulo", p: [45, 50], texto: "1/ano" },
              { t: "linha", de: [200, 160], ate: [200, 40], cor: "destaque" },
              { t: "rotulo", p: [180, 30], texto: "1/dia" },
              { t: "rotulo", p: [150, 170], texto: "frequencia" },
            ],
          },
        },
      ],
    },
    {
      id: "normalizacao",
      titulo: "Normalização: comparar o incomparável",
      blocos: [
        { tipo: "texto", texto: "Para comparar sistemas, lugares e anos, é preciso normalizar. A métrica mais usada é o yield específico: energia por potência instalada, em kWh/kWp (às vezes expresso como horas de Sol pleno equivalentes). Ela remove o tamanho do sistema: um telhado de 3 kWp e uma usina de 3 MW no mesmo lugar têm yield parecido, o que permite comparar diretamente a qualidade do recurso e do projeto." },
        { tipo: "texto", texto: "Outras normalizações úteis: energia por área (kWh/m²) para comparar tecnologias, e o fator de capacidade para comparar com outras fontes. A regra metodológica: antes de comparar dois números de geração, pergunte se estão na mesma base. Comparar kWh absolutos de sistemas de tamanhos diferentes é o erro que faz telhado parecer pior que usina sem motivo." },
        {
          tipo: "licao",
          pergunta: "Por que o yield específico (kWh/kWp) é bom para comparar sistemas de tamanhos diferentes?",
          alternativas: [
            "Porque soma a energia total",
            "Porque remove o tamanho do sistema, isolando a qualidade do recurso e do projeto",
            "Porque usa a área em vez da potência",
          ],
          correta: 1,
          explicacao: "Dividir a energia pela potência instalada tira o efeito do tamanho: sobra a performance por kWp, comparável entre um telhado e uma usina no mesmo lugar.",
        },
      ],
    },
    {
      id: "fontes-calculo",
      titulo: "Fontes: cálculo, métricas e normas",
      blocos: [
        { tipo: "texto", texto: "As fórmulas e métricas do capítulo têm lastro em normas de desempenho e na documentação das bibliotecas. Reúna para citar no relatório." },
        { tipo: "fontes", titulo: "Modelos, métricas e normas", itens: [
          { titulo: "NREL — PVWatts Calculator e documentação do modelo", url: "https://pvwatts.nrel.gov/", tipo: "site", nota: "Modelo aberto de estimativa de geração; base do pvlib.pvwatts." },
          { titulo: "pvlib — ModelChain (with_pvwatts) na documentação", url: "https://pvlib-python.readthedocs.io/en/stable/user_guide/modelchain.html", tipo: "site", nota: "Como encadear recurso, transposição, temperatura e PVWatts em uma série." },
          { titulo: "IEC 61724-1 — Photovoltaic system performance (monitoring)", url: "https://webstore.iec.ch/publication/65561", tipo: "norma", nota: "Define Performance Ratio e como medir desempenho de forma comparável." },
          { titulo: "ABNT NBR 16274 — Sistemas FV conectados à rede: requisitos de documentação e comissionamento", url: "https://www.abntcatalogo.com.br/norma.aspx?ID=322380", tipo: "norma", nota: "Comissionamento e verificação de desempenho de sistemas fotovoltaicos no Brasil." },
        ] },
        {
          tipo: "licao",
          pergunta: "Ao somar uma série de potência de passo de 30 minutos para obter energia, qual fator aplicar a cada valor em kW?",
          alternativas: ["1 (somar direto)", "0,5 (meia hora)", "2"],
          correta: 1,
          explicacao: "Cada passo dura 0,5 h; energia = potência × tempo, então multiplica-se cada kW por 0,5 antes de somar para chegar a kWh.",
        },
      ],
    },
    // ===================== CAPÍTULO 5 — PROJETO: O PIPELINE =====================
    {
      id: "anatomia-pipeline",
      titulo: "Anatomia do pipeline de análise",
      blocos: [
        { tipo: "texto", texto: "Um pipeline de análise de geração tem estágios claros: ingestão (baixar da fonte), limpeza (tratar furos e erros), modelagem (recurso para geração), agregação (reamostrar para a escala da pergunta), análise (decompor, comparar, detectar) e saída (relatório ou dashboard). Cada estágio consome o anterior e tem um teste de sanidade próprio. Pensar em estágios torna o trabalho reprodutível e depurável." },
        { tipo: "texto", texto: "O princípio que amarra tudo é a reprodutibilidade: dado o mesmo código, a mesma fonte e a mesma versão, qualquer um chega ao mesmo resultado. Isso exige salvar o dado bruto, fixar versões das bibliotecas e registrar a proveniência. Um pipeline não é um notebook bagunçado: é uma sequência de passos nomeados, cada um com entrada e saída documentadas." },
        { tipo: "diagrama", titulo: "Os estágios do pipeline", codigo: `flowchart LR
  ING["Ingestao (API/CSV)"] --> LIMP["Limpeza (furos, erros)"]
  LIMP --> MOD["Modelagem (pvlib)"]
  MOD --> AGR["Agregacao (resample)"]
  AGR --> ANA["Analise (decompor, comparar)"]
  ANA --> OUT["Saida (relatorio/dashboard)"]` },
      ],
    },
    {
      id: "ambiente-ferramentas",
      titulo: "O ambiente: Python, pandas, pvlib",
      blocos: [
        { tipo: "texto", texto: "A caixa de ferramentas padrão da análise de geração é o ecossistema científico do Python. O pandas cuida da série temporal (índice de tempo, reamostragem, janelas). O pvlib traz a física solar (posição do Sol, transposição, PVWatts, leitura de PVGIS/NSRDB). O statsmodels faz a decomposição e os modelos. matplotlib e seaborn desenham. numpy sustenta tudo por baixo." },
        { tipo: "texto", texto: "Montar o ambiente com versões fixas (um requirements.txt ou um environment.yml) é parte da reprodutibilidade: a API do pvlib e do statsmodels muda entre versões, e um gráfico que não reproduz é um gráfico sem valor científico. Comece simples: Python, pandas, pvlib, statsmodels, matplotlib. O resto se acrescenta quando a pergunta pedir." },
        {
          tipo: "tarefas",
          itens: [
            { id: "t-amb-1", titulo: "Criar o ambiente", entrega: "Um ambiente virtual com pandas, pvlib, statsmodels e matplotlib instalados, e um requirements.txt com as versões." },
            { id: "t-amb-2", titulo: "Testar o pvlib", entrega: "Um script curto que calcula a posição do Sol para o seu lugar hoje ao meio-dia e imprime o ângulo zenital." },
          ],
        },
        {
          tipo: "licao",
          pergunta: "Por que fixar as versões das bibliotecas (requirements.txt) importa na análise?",
          alternativas: [
            "Para o código rodar mais rápido",
            "Porque a API muda entre versões; sem fixar, o resultado pode não reproduzir",
            "Porque economiza memória",
          ],
          correta: 1,
          explicacao: "Reprodutibilidade exige que o mesmo código e as mesmas versões gerem o mesmo número. APIs de pvlib/statsmodels evoluem; versões soltas quebram a reprodução.",
        },
      ],
    },
    {
      id: "ingestao-api",
      titulo: "Ingestão: trazer o dado para dentro",
      blocos: [
        { tipo: "texto", texto: "A ingestão é o primeiro contato com a fonte. Três padrões: API direta (requisição HTTP com parâmetros lat/lon/ano, resposta em CSV ou JSON), wrapper de biblioteca (pvlib.iotools.get_pvgis_hourly, get_pvgis_tmy, get_nasa_power) e download manual (arquivos do Atlas ou do ONS). Sempre que possível, prefira o wrapper: ele já devolve um DataFrame com índice de tempo e unidades conhecidas." },
        { tipo: "texto", texto: "Duas disciplinas na ingestão: guardar o dado bruto como veio (para reprodutibilidade e para não bater na API de novo) e esconder segredos. Chaves de API nunca entram no código nem no repositório — vão em variáveis de ambiente. Quem comita uma chave num repositório público acorda com a cota estourada. Baixe uma vez, salve em disco, e trabalhe sobre a cópia local." },
        {
          tipo: "prancha",
          titulo: "Fluxo de ingestão com cache local",
          desenho: {
            legenda: "A requisicao a API passa por um cache: se o arquivo bruto ja existe em disco, nao chama a rede de novo. Reprodutivel e gentil com a cota.",
            primitivas: [
              { t: "retangulo", p: [10, 70], w: 60, h: 40, cor: "suave" },
              { t: "rotulo", p: [16, 65], texto: "pedido" },
              { t: "seta", de: [70, 90], ate: [110, 90], cor: "tinta" },
              { t: "retangulo", p: [110, 70], w: 60, h: 40, cor: "destaque" },
              { t: "rotulo", p: [116, 88], texto: "cache?" },
              { t: "seta", de: [140, 110], ate: [140, 150], cor: "tinta" },
              { t: "rotulo", p: [145, 135], texto: "nao: chama API" },
              { t: "seta", de: [170, 90], ate: [230, 90], cor: "tinta" },
              { t: "rotulo", p: [185, 80], texto: "sim" },
              { t: "retangulo", p: [230, 70], w: 60, h: 40, cor: "suave" },
              { t: "rotulo", p: [236, 88], texto: "DataFrame" },
            ],
          },
        },
      ],
    },
    {
      id: "esquema-dados",
      titulo: "O esquema dos dados: tidy e tipado",
      blocos: [
        { tipo: "texto", texto: "Antes de analisar, dê forma ao dado. O formato tidy é a convenção: cada linha é uma observação no tempo, cada coluna é uma variável (ghi, dni, dhi, temp_air, wind_speed, p_ac), o índice é um DatetimeIndex com fuso. Tipos corretos importam: tempo como datetime, valores como float, flags como categoria. Um esquema explícito evita metade dos bugs da análise." },
        { tipo: "texto", texto: "Documente o esquema: nome, unidade e significado de cada coluna, numa tabela ou num dicionário de dados. Quando a série vem de fontes diferentes (NSRDB em W/m², PVGIS às vezes em outra convenção), harmonizar unidades no ponto de entrada é o que impede somar maçã com laranja lá na frente. O esquema é o contrato do pipeline." },
        {
          tipo: "diagrama", titulo: "Formato tidy da série", codigo: `flowchart TD
  IDX["Index: timestamp (tz-aware)"] --> ROW["Cada linha = um instante"]
  ROW --> C1["ghi (W/m2)"]
  ROW --> C2["temp_air (C)"]
  ROW --> C3["wind_speed (m/s)"]
  ROW --> C4["p_ac (kW)"]
  ROW --> C5["flag_qualidade"]` },
      ],
    },
    {
      id: "limpeza-qualidade",
      titulo: "Limpeza e controle de qualidade",
      blocos: [
        { tipo: "texto", texto: "Dado real vem sujo: valores negativos de irradiância à noite que não são zero exato, picos impossíveis maiores que o céu limpo, zeros travados quando o sensor congela, saltos no relógio. O controle de qualidade aplica testes físicos: irradiância entre 0 e um teto (um pouco acima do céu limpo), temperatura em faixa plausível, e o teste de fechamento GHI ≈ DHI + DNI·cos(θz). O que falha vira flag, não lixo silencioso." },
        { tipo: "texto", texto: "O princípio: marcar, não apagar. Em vez de jogar fora o ponto suspeito, acrescente uma coluna de flag dizendo por que ele é suspeito; a análise decide depois se o exclui. Procedimentos de QC para irradiância têm padrão (os testes BSRN são a referência). Limpeza malfeita é a origem silenciosa de conclusões erradas — um zero travado vira 'dia nublado' que nunca houve." },
        {
          tipo: "licao",
          pergunta: "Qual é a boa prática ao encontrar um valor de irradiância fisicamente impossível?",
          alternativas: [
            "Apagar a linha inteira sem registro",
            "Marcar o ponto com uma flag de qualidade e decidir o tratamento depois, de forma documentada",
            "Substituir pela média sem anotar",
          ],
          correta: 1,
          explicacao: "Marcar em vez de apagar preserva a rastreabilidade: a análise decide o tratamento, e qualquer um audita o que foi excluído e por quê.",
        },
      ],
    },
    {
      id: "fuso-horario",
      titulo: "A armadilha do fuso horário",
      blocos: [
        { tipo: "texto", texto: "O erro mais traiçoeiro da análise solar é o fuso. A posição do Sol depende da hora local verdadeira; o dado vem às vezes em UTC, às vezes em hora local, às vezes sem dizer. Se o timestamp estiver deslocado, o pico de geração ao meio-dia cai às 10h ou às 14h no gráfico, e a comparação com o céu limpo desanda. Um erro de fuso não dá erro de código — dá número errado que parece certo." },
        { tipo: "texto", texto: "A disciplina: trabalhar sempre com timestamps cientes de fuso (tz-aware) no pandas, saber em que fuso a fonte entrega (PVGIS costuma ser UTC), e converter explicitamente. Confira sempre com um teste visual: plote um dia e veja se o pico cai perto do meio-dia solar. Se não cair, é fuso. Esse checkpoint de cinco minutos salva análises inteiras." },
        {
          tipo: "prancha",
          titulo: "Teste visual do meio-dia",
          desenho: {
            legenda: "Com fuso certo (cheia) o pico cai perto do meio-dia solar; com fuso errado (pontilhada) o sino desloca. Sempre plote um dia para conferir.",
            primitivas: [
              { t: "linha", de: [20, 160], ate: [290, 160], cor: "tinta" },
              { t: "linha", de: [20, 20], ate: [20, 160], cor: "tinta" },
              { t: "linha", de: [155, 20], ate: [155, 160], cor: "suave" },
              { t: "rotulo", p: [135, 14], texto: "meio-dia" },
              { t: "curva", pts: [[70, 160], [110, 90], [150, 45], [155, 42], [200, 90], [240, 160]], cor: "destaque" },
              { t: "curva", pts: [[30, 160], [70, 90], [105, 45], [110, 42], [150, 90], [190, 160]], cor: "suave" },
              { t: "rotulo", p: [40, 120], texto: "fuso errado" },
            ],
          },
        },
      ],
    },
    {
      id: "gaps-interpolacao",
      titulo: "Lacunas e interpolação",
      blocos: [
        { tipo: "texto", texto: "Toda série real tem furos: a estação caiu, a API falhou, um sensor ficou off. Como preencher depende do tamanho do furo. Lacunas curtas (uma ou duas horas) podem ser interpoladas linearmente ou pelo índice de céu limpo (preencher o kt* e reconstruir a irradiância). Lacunas longas (dias) não se inventa: preenche-se com outra fonte (satélite cobrindo o furo do solo) ou deixa-se marcado como ausente." },
        { tipo: "texto", texto: "A regra de ouro: nunca preencher furo sem marcar o que foi preenchido. Uma coluna de flag separa o dado medido do imputado, para que a análise saiba o que é real. E cuidado ao somar: um mês com muitos furos tem energia subestimada se os furos viraram zero. Trate o furo como ausente (NaN), não como zero, até decidir conscientemente o preenchimento." },
        {
          tipo: "licao",
          pergunta: "Por que uma lacuna não tratada vira energia mensal subestimada se os furos forem lidos como zero?",
          alternativas: [
            "Porque zero aumenta a média",
            "Porque somar zeros no lugar de valores ausentes reduz o total do mês sem aviso",
            "Porque o pandas ignora zeros",
          ],
          correta: 1,
          explicacao: "Zero conta como 'não gerou', baixando a soma. Furos devem ser NaN (ausente) até um preenchimento consciente; só assim a soma mensal não é enganosa.",
        },
      ],
    },
    {
      id: "validacao-cruzada-fontes",
      titulo: "Validação cruzada entre fontes",
      blocos: [
        { tipo: "texto", texto: "Confiar em uma só fonte é apostar cega. A validação cruzada baixa a mesma coordenada em duas ou três fontes (PVGIS, NSRDB, POWER, Atlas) e compara: a irradiação anual bate? O perfil mensal tem a mesma forma? Diferenças de poucos por cento são normais (modelos diferentes); diferenças grandes acusam um problema — fuso, unidade, ou um ponto caindo no mar no grid grosseiro." },
        { tipo: "texto", texto: "As métricas de comparação são padrão: viés (MBE, erro médio), erro absoluto médio (MAE) e raiz do erro quadrático médio (RMSE). Reportá-las dá à estimativa uma barra de erro honesta. A triangulação não busca a fonte 'certa': busca o intervalo em que a verdade provavelmente está, e flagra quando uma fonte está claramente fora." },
        { tipo: "diagrama", titulo: "Triangular três fontes", codigo: `flowchart TD
  LL["Mesma lat/lon"] --> F1["PVGIS"]
  LL --> F2["NSRDB"]
  LL --> F3["NASA POWER"]
  F1 --> CMP["Comparar: MBE, MAE, RMSE"]
  F2 --> CMP
  F3 --> CMP
  CMP --> OUT["Intervalo + flag de outlier"]` },
      ],
    },
    {
      id: "versionamento",
      titulo: "Versionamento e reprodutibilidade",
      blocos: [
        { tipo: "texto", texto: "A análise só vale se outra pessoa (ou você daqui a um ano) chegar ao mesmo número. Isso pede três coisas versionadas: o código (git), o dado bruto (guardado ou com script de download determinístico) e o ambiente (versões fixas). Some a isso um registro de proveniência — qual fonte, qual modelo, qual período — e a análise vira um experimento repetível, não um palpite ilustrado." },
        { tipo: "texto", texto: "Na prática: um repositório com código, um requirements.txt, uma pasta data/raw com o bruto (ou o script que o baixa), uma pasta data/processed gerada pelo pipeline, e um README que diz como rodar do zero. Notebooks são ótimos para explorar, mas o resultado final deve sair de um script que roda de ponta a ponta. Reprodutibilidade é a diferença entre ciência e ilustração." },
        {
          tipo: "tarefas",
          itens: [
            { id: "t-ver-1", titulo: "Versionar o projeto", entrega: "Um repositório git com código, requirements.txt e README de como rodar do zero." },
            { id: "t-ver-2", titulo: "Separar bruto e processado", entrega: "Pastas data/raw (intocado) e data/processed (gerado pelo pipeline), com o bruto nunca editado à mão." },
          ],
        },
      ],
    },
    {
      id: "fontes-projeto",
      titulo: "Fontes: ferramentas e método",
      blocos: [
        { tipo: "texto", texto: "A documentação das ferramentas e os guias de método que sustentam o pipeline. Guarde como manual de bancada." },
        { tipo: "fontes", titulo: "Bibliotecas e guias", itens: [
          { titulo: "pandas — guia de séries temporais (time series)", url: "https://pandas.pydata.org/docs/user_guide/timeseries.html", tipo: "site", nota: "DatetimeIndex, resample, rolling, fusos: a base do manuseio da série." },
          { titulo: "statsmodels — seasonal_decompose", url: "https://www.statsmodels.org/stable/generated/statsmodels.tsa.seasonal.seasonal_decompose.html", tipo: "site", nota: "Decomposição clássica em tendência, sazonalidade e resíduo." },
          { titulo: "statsmodels — STL", url: "https://www.statsmodels.org/stable/generated/statsmodels.tsa.seasonal.STL.html", tipo: "site", nota: "Decomposição por Loess, robusta a outliers e sazonalidade variável." },
          { titulo: "Hyndman & Athanasopoulos — Forecasting: Principles and Practice (3ª ed., aberto)", url: "https://otexts.com/fpp3/", tipo: "livro", nota: "Livro-texto aberto de séries temporais: decomposição, sazonalidade, previsão." },
        ] },
        {
          tipo: "licao",
          pergunta: "Qual é o papel de uma pasta data/raw que nunca se edita à mão?",
          alternativas: [
            "Economizar espaço",
            "Guardar o dado bruto original intocado, para que o pipeline sempre reproduza a partir da mesma base",
            "Acelerar o código",
          ],
          correta: 1,
          explicacao: "O bruto intocado é a âncora da reprodutibilidade: todo processamento deriva dele por código, e qualquer um pode refazer a análise do zero.",
        },
      ],
    },
    // ===================== CAPÍTULO 6 — EXECUÇÃO: A ANÁLISE PASSO A PASSO =====================
    {
      id: "baixar-serie",
      titulo: "Passo 1: baixar a série",
      blocos: [
        { tipo: "texto", texto: "Mãos à obra. O caminho mais rápido para uma série de geração pronta é o PVGIS seriescalc: informe latitude, longitude, potência de pico (peakpower), perdas (loss) e o intervalo de anos, e receba a série horária de potência já convertida. Um exemplo documentado de chamada é seriescalc com lat, lon, startyear, pvcalculation=1, peakpower=1 e loss=14 — um sistema de 1 kWp com 14% de perdas." },
        { tipo: "texto", texto: "Se preferir controlar o modelo você mesmo, baixe só o recurso (o TMY do PVGIS ou um ano do NSRDB) e rode o PVWatts no pvlib. A primeira via dá a geração pronta e boa para começar; a segunda dá controle sobre inclinação, azimute e perdas. Em ambos os casos: salve o bruto em disco e anote a proveniência antes de seguir." },
        { tipo: "video", titulo: "How Solar Panels Work Explained Simply", youtube: "LTC22ciYlyo" },
        {
          tipo: "tarefas",
          itens: [
            { id: "t-exe1-1", titulo: "Baixar uma série", entrega: "Um CSV com a série horária de potência (ou de GHI/temp) de pelo menos um ano para o seu lugar, via PVGIS ou NSRDB." },
            { id: "t-exe1-2", titulo: "Registrar proveniência", entrega: "Linha anotada: fonte, parâmetros usados (lat, lon, kWp, perdas), período e data do download." },
          ],
        },
      ],
    },
    {
      id: "carregar-pandas",
      titulo: "Passo 2: carregar no pandas",
      blocos: [
        { tipo: "texto", texto: "Com o CSV em mãos, o carregamento tem cuidados: ler a coluna de tempo como datetime, defini-la como índice, declarar o fuso e conferir as unidades. Um bom primeiro olhar: ver as primeiras linhas, checar o tipo do índice, plotar um dia para o teste do meio-dia, e olhar as estatísticas básicas (mínimo não pode ser negativo na irradiância, máximo não pode passar muito do céu limpo)." },
        { tipo: "texto", texto: "Esse é o momento de aplicar o esquema tidy e o QC do capítulo anterior: renomear colunas para nomes padrão, converter unidades, marcar os suspeitos. Ao fim do passo 2, você tem um DataFrame limpo, tipado e com fuso certo — a matéria-prima de toda análise seguinte. Não pule a inspeção: cinco minutos olhando o dado bruto evitam horas depurando um gráfico errado." },
        {
          tipo: "diagrama", titulo: "Carregamento e primeira inspeção", codigo: `flowchart LR
  CSV["CSV bruto"] --> READ["ler: parse_dates, index"]
  READ --> TZ["definir fuso (tz)"]
  TZ --> INSPEC["head(), info(), plot de 1 dia"]
  INSPEC --> QC["QC: faixas, fechamento"]
  QC --> DF["DataFrame limpo e tipado"]` },
      ],
    },
    {
      id: "perfil-mensal",
      titulo: "Passo 3: o perfil mensal de geração",
      blocos: [
        { tipo: "texto", texto: "O primeiro resultado de valor é o perfil mensal: a energia gerada em cada mês do ano. Reamostre a potência para energia diária (soma) e depois para mensal (soma), e plote as doze barras. É aqui que a sazonalidade do lugar aparece em números: o mês de pico, o mês de vale, e a razão entre eles. No Brasil, essa curva costuma ser mais chata que a europeia — confirme com o seu dado." },
        { tipo: "texto", texto: "O mês de vale tem nome de projeto: é o mês crítico, o que o sistema precisa atender no pior caso de um dimensionamento conservador. Comparar o perfil mensal medido com o do Atlas Brasileiro para a mesma coordenada é um ótimo teste de sanidade: se a forma bate, sua série está coerente com a climatologia oficial." },
        {
          tipo: "prancha",
          titulo: "Perfil mensal: as doze barras",
          desenho: {
            legenda: "Energia por mes. O mes mais baixo (vale) e o mes critico do projeto; o pico mostra o teto. A razao pico/vale e a amplitude sazonal.",
            primitivas: [
              { t: "linha", de: [20, 160], ate: [290, 160], cor: "tinta" },
              { t: "linha", de: [20, 20], ate: [20, 160], cor: "tinta" },
              { t: "retangulo", p: [28, 70], w: 16, h: 90, hachura: true },
              { t: "retangulo", p: [48, 60], w: 16, h: 100, hachura: true },
              { t: "retangulo", p: [68, 75], w: 16, h: 85, hachura: true },
              { t: "retangulo", p: [88, 95], w: 16, h: 65, hachura: true },
              { t: "retangulo", p: [108, 110], w: 16, h: 50, hachura: true },
              { t: "retangulo", p: [128, 120], w: 16, h: 40, cor: "destaque" },
              { t: "retangulo", p: [148, 115], w: 16, h: 45, hachura: true },
              { t: "retangulo", p: [168, 100], w: 16, h: 60, hachura: true },
              { t: "retangulo", p: [188, 85], w: 16, h: 75, hachura: true },
              { t: "retangulo", p: [208, 70], w: 16, h: 90, hachura: true },
              { t: "retangulo", p: [228, 62], w: 16, h: 98, hachura: true },
              { t: "retangulo", p: [248, 66], w: 16, h: 94, hachura: true },
              { t: "rotulo", p: [120, 172], texto: "vale (mes critico)" },
            ],
          },
        },
      ],
    },
    {
      id: "heatmap-hora-mes",
      titulo: "Passo 4: o heatmap hora × mês",
      blocos: [
        { tipo: "texto", texto: "Uma figura condensa o ano inteiro: o heatmap com a hora do dia nas linhas e o mês nas colunas, a cor sendo a geração média naquela hora e mês. De um olhar, vê-se o alargamento do dia no verão, o deslocamento do nascer e do pôr, e os meses de céu fechado como colunas mais frias. É o retrato mais rico da sazonalidade dupla (diária e anual) numa imagem só." },
        { tipo: "texto", texto: "Construí-lo é agrupar a série por hora e por mês e tirar a média. No pandas, um groupby pela hora e pelo mês do índice, depois um pivot para a matriz, e um imshow ou heatmap. O heatmap é também um detector de erro: se o calor não estiver centrado perto do meio-dia, é fuso; se houver uma faixa estranha, é um sensor com problema num período. Leia a imagem antes de confiar nos números." },
        {
          tipo: "prancha",
          titulo: "Heatmap hora x mês",
          desenho: {
            legenda: "Hora (vertical) x mes (horizontal). O miolo quente (meio-dia, verao) e a geracao alta; as bordas frias sao amanhecer/anoitecer e meses nublados.",
            primitivas: [
              { t: "retangulo", p: [40, 30], w: 220, h: 130, cor: "suave" },
              { t: "rotulo", p: [2, 90], texto: "hora" },
              { t: "rotulo", p: [140, 172], texto: "mes" },
              { t: "circulo", c: [150, 95], r: 34, cor: "destaque", hachura: true },
              { t: "rotulo", p: [120, 92], texto: "miolo quente" },
              { t: "rotulo", p: [50, 40], texto: "amanhecer (frio)" },
              { t: "rotulo", p: [180, 150], texto: "anoitecer" },
            ],
          },
        },
        {
          tipo: "licao",
          pergunta: "No heatmap hora × mês, o que denuncia um erro de fuso horário?",
          alternativas: [
            "Cores muito vivas",
            "O miolo quente deslocado para longe do meio-dia",
            "Colunas todas iguais",
          ],
          correta: 1,
          explicacao: "A geração máxima deve estar perto do meio-dia solar. Se o calor aparece deslocado para cedo ou tarde, o timestamp está em fuso errado.",
        },
      ],
    },
    {
      id: "curva-duracao",
      titulo: "Passo 5: a curva de duração",
      blocos: [
        { tipo: "texto", texto: "A curva de duração ordena toda a série de potência do maior para o menor valor, sem olhar quando cada um ocorreu. O eixo horizontal vira 'percentual do tempo', e a curva mostra por quanto tempo a geração ficou acima de cada nível. Para PV, ela começa alta e cai rápido, com um longo trecho em zero (a noite) — o retrato da intermitência numa curva só." },
        { tipo: "texto", texto: "Ela responde a perguntas de operação: quanto tempo a usina passou acima de 80% da potência? Qual o nível que ela superou em 25% das horas? É a mesma ferramenta que engenheiros usam para carga (load duration curve), aplicada à geração. Para dimensionar inversor e armazenamento, a curva de duração diz mais que a média — mostra a forma da distribuição, não só o centro." },
        {
          tipo: "prancha",
          titulo: "Curva de duração da geração",
          desenho: {
            legenda: "Potencia ordenada do maior ao menor. Cai rapido e tem um longo trecho em zero (noite). O eixo e o percentual do tempo, nao o relogio.",
            primitivas: [
              { t: "linha", de: [20, 160], ate: [290, 160], cor: "tinta" },
              { t: "linha", de: [20, 20], ate: [20, 160], cor: "tinta" },
              { t: "rotulo", p: [2, 90], texto: "kW" },
              { t: "curva", pts: [[20, 35], [60, 55], [100, 85], [140, 115], [180, 145], [210, 158], [290, 160]], cor: "destaque" },
              { t: "rotulo", p: [150, 60], texto: "cai rapido" },
              { t: "rotulo", p: [220, 150], texto: "noite (zero)" },
              { t: "rotulo", p: [120, 172], texto: "% do tempo" },
            ],
          },
        },
      ],
    },
    {
      id: "ano-vs-ano",
      titulo: "Passo 6: comparar ano a ano",
      blocos: [
        { tipo: "texto", texto: "Com vários anos na mesma série, a comparação interanual mede a variabilidade do recurso. Sobreponha o perfil mensal de cada ano, ou plote a energia anual total de cada ano em barras. A dispersão entre os anos é a incerteza natural: um ano mais nublado gera alguns por cento a menos que a média. No Brasil, essa variabilidade costuma ser modesta; em climas instáveis, maior." },
        { tipo: "texto", texto: "Aqui vive uma decisão de projeto: usar a média dos anos (o caso esperado) ou um ano ruim (P90, o valor superado em 90% dos anos) para um dimensionamento conservador. Financiadores de usina pedem o P90 justamente porque a média esconde o risco do ano ruim. A análise ano a ano é o que transforma 'quanto gera' em 'quanto gera, com que risco'." },
        { tipo: "video", titulo: "CNN: produção de energia solar cresce 83% no Brasil", youtube: "d06KQa680g4" },
        {
          tipo: "licao",
          pergunta: "Por que financiadores de usinas pedem o P90 em vez da geração média?",
          alternativas: [
            "Porque o P90 é maior",
            "Porque o P90 (valor superado em 90% dos anos) reflete o risco do ano ruim, que a média esconde",
            "Porque é mais fácil de calcular",
          ],
          correta: 1,
          explicacao: "A média é o caso esperado; o P90 é um caso conservador que a geração supera em 90% dos anos. Ele quantifica o risco do ano ruim para o financiamento.",
        },
      ],
    },
    {
      id: "anomalias",
      titulo: "Passo 7: detecção de anomalias",
      blocos: [
        { tipo: "texto", texto: "Depois de separar tendência e sazonalidade, o que sobra é o resíduo — e nele moram as anomalias. Um resíduo muito negativo e persistente pode ser um problema real: um inversor que caiu, um painel sujo, uma sombra nova. A detecção compara o resíduo com sua dispersão típica e marca o que foge demais (por exemplo, além de três desvios), virando um alerta a investigar." },
        { tipo: "texto", texto: "O cuidado é não confundir clima com falha: uma semana de chuva é resíduo negativo legítimo, não defeito. Por isso métodos robustos (STL robusta, que resiste a outliers) funcionam melhor que a decomposição clássica para isolar o que é verdadeiramente anômalo. A anomalia bem detectada é a ponte entre análise de série e manutenção da usina real." },
        { tipo: "video", titulo: "Robust Anomaly Detection + Seasonal-Trend Decomposition (ritvikmath)", youtube: "1NXryMoU7Ho" },
        {
          tipo: "diagrama", titulo: "Da série ao alerta", codigo: `flowchart LR
  Y["Serie"] --> DEC["STL robusta"]
  DEC --> RES["Residuo"]
  RES --> LIM["Fora de +-3 desvios?"]
  LIM -->|Sim| AL["Anomalia: investigar"]
  LIM -->|Nao| OK["Dentro do esperado (clima)"]` },
      ],
    },
    {
      id: "relatorio",
      titulo: "Passo 8: montar o relatório",
      blocos: [
        { tipo: "texto", texto: "A análise só vale quando vira decisão. O relatório final reúne: o perfil mensal com o mês crítico, o fator de capacidade e o yield específico, a comparação entre fontes com as barras de erro, a variabilidade ano a ano (média e P90) e as anomalias encontradas. Cada número com sua fonte e sua incerteza. Um gráfico sem fonte e sem barra de erro é uma opinião ilustrada." },
        { tipo: "texto", texto: "A forma pode ser um documento, um notebook limpo ou um dashboard interativo, mas o conteúdo obedece à mesma regra do caderno: toda afirmação com lastro. Feche o relatório com as premissas (qual fonte, qual modelo, qual período) e as limitações (o que não foi validado em campo). Honestidade sobre a incerteza é o que faz a análise ser levada a sério." },
        { tipo: "video", titulo: "Time Series Analysis Crash Course: Predict the Future with Python", youtube: "eKiXtGzEjos" },
        {
          tipo: "tarefas",
          itens: [
            { id: "t-rel-1", titulo: "Reunir os indicadores", entrega: "Uma página com perfil mensal, fator de capacidade, yield (kWh/kWp) e variabilidade ano a ano do seu lugar." },
            { id: "t-rel-2", titulo: "Declarar premissas e limites", entrega: "Um parágrafo de proveniência (fonte, modelo, período) e de limitações (o que não foi validado em campo)." },
          ],
        },
      ],
    },
    // ===================== CAPÍTULO 7 — MANUTENÇÃO E VALIDAÇÃO =====================
    {
      id: "incerteza",
      titulo: "Incerteza: a barra de erro honesta",
      blocos: [
        { tipo: "texto", texto: "Todo número de geração estimada carrega incerteza, e ignorá-la é desonestidade técnica. As fontes somam: a incerteza do recurso (o satélite tem viés de alguns por cento), a do modelo de conversão (transposição, temperatura, perdas) e a da variabilidade interanual. Estudos de projeto tipicamente chegam a uma incerteza total da ordem de alguns por cento no ano típico, mais no mês isolado." },
        { tipo: "texto", texto: "A prática: reportar a geração não como um número cravado, mas como uma faixa (P50/P90) ou um valor com desvio. Propagar a incerteza pelas etapas (cada passo contribui com uma parcela) dá a barra de erro final. Uma estimativa com barra de erro é mais útil e mais confiável que um número exato falso — e protege quem decide com base nela." },
        {
          tipo: "licao",
          pergunta: "Quais são as três grandes fontes de incerteza numa estimativa de geração por dado aberto?",
          alternativas: [
            "Só o preço da energia",
            "O recurso (viés do satélite), o modelo de conversão e a variabilidade entre anos",
            "Apenas o inversor",
          ],
          correta: 1,
          explicacao: "A incerteza total soma a do recurso (satélite), a do modelo (transposição, temperatura, perdas) e a interanual (um ano difere do outro). Todas devem entrar na barra de erro.",
        },
      ],
    },
    {
      id: "soiling-degradacao",
      titulo: "Sujeira e degradação",
      blocos: [
        { tipo: "texto", texto: "Dois efeitos lentos corroem a geração ao longo do tempo. A sujeira (soiling) é o acúmulo de poeira e poluição na superfície, que reduz a captação; é reversível com limpeza e sazonal (pior na seca, limpa pela chuva). A degradação é a perda permanente de eficiência do módulo com os anos, tipicamente 0,5% a 0,8% ao ano para silício cristalino — pequena, mas acumulada em 25 anos de operação." },
        { tipo: "texto", texto: "Na série, a sujeira aparece como queda gradual entre chuvas e recuperação após a limpeza; a degradação, como uma tendência negativa lenta ao longo dos anos, visível na média móvel de 365 dias depois de remover a sazonalidade. Separar os dois exige série longa e cuidado: um ano mais nublado pode disfarçar de degradação o que é só clima." },
        {
          tipo: "prancha",
          titulo: "Sujeira (dente de serra) e degradação (rampa)",
          desenho: {
            legenda: "A sujeira faz queda gradual e recuperacao apos a chuva (dente de serra); a degradacao e a rampa lenta e permanente ao fundo.",
            primitivas: [
              { t: "linha", de: [20, 160], ate: [290, 160], cor: "tinta" },
              { t: "linha", de: [20, 20], ate: [20, 160], cor: "tinta" },
              { t: "linha", de: [20, 50], ate: [290, 90], cor: "suave" },
              { t: "rotulo", p: [210, 70], texto: "degradacao" },
              { t: "curva", pts: [[25, 52], [55, 72], [57, 54], [90, 76], [92, 58], [125, 80], [127, 62], [160, 82], [162, 64], [200, 86], [202, 68], [240, 90], [242, 72], [285, 94]], cor: "destaque" },
              { t: "rotulo", p: [60, 100], texto: "sujeira (limpa na chuva)" },
            ],
          },
        },
      ],
    },
    {
      id: "validar-contra-medido",
      titulo: "Validar o modelo contra geração medida",
      blocos: [
        { tipo: "texto", texto: "O teste final de uma estimativa é batê-la contra a realidade. Se existe uma usina real no lugar (ou perto) com geração medida publicada — o ONS entrega a das usinas centralizadas —, compare: o perfil mensal modelado bate com o medido? A diferença sistemática revela o erro do seu modelo de recurso ou das suas premissas de perda (o PR que você supôs)." },
        { tipo: "texto", texto: "Essa validação é um loop de aprendizado: se o medido é consistentemente menor, talvez o PR real seja pior que o suposto (sujeira, sombreamento, indisponibilidade); se a forma sazonal difere, talvez a fonte de recurso tenha viés naquele regime climático. Ajustar o modelo até ele reproduzir o medido é o que calibra a estimativa para os próximos lugares." },
        { tipo: "diagrama", titulo: "O loop de validação", codigo: `flowchart LR
  MOD["Geracao modelada"] --> CMP["Comparar"]
  MED["Geracao medida (ONS)"] --> CMP
  CMP --> DIF{"Diferenca sistematica?"}
  DIF -->|Sim| AJU["Ajustar PR, perdas, fonte"]
  AJU --> MOD
  DIF -->|Nao| VAL["Modelo validado"]` },
      ],
    },
    {
      id: "recalibrar",
      titulo: "Recalibrar com dado de campo",
      blocos: [
        { tipo: "texto", texto: "Quando a análise precisa de precisão de usina — para um contrato de energia, um financiamento, uma garantia de desempenho —, a estimativa de satélite não basta: entra medição de campo. Um piranômetro de referência calibrado mede a irradiância real no plano do arranjo por um período, e os dados do inversor dão a geração real. Com isso, o PR medido e o viés da fonte de satélite no ponto ficam conhecidos, e o modelo se recalibra para aquele sítio." },
        { tipo: "texto", texto: "Instrumentar um sítio assim não é tarefa de análise de dados: é instrumentação e instalação elétrica, com piranômetro de classe adequada (ISO 9060), montagem, aterramento e aquisição conforme a IEC 61724-1. Isso exige profissional habilitado — a etapa seguinte é uma mobilização explícita, porque mexe com o arranjo e com instrumentação metrológica." },
        { tipo: "mobilizacao", papel: "Técnico de instrumentação / engenheiro de O&M fotovoltaico", porque: "Instalar e calibrar piranômetro de referência no plano do arranjo e montar a aquisição de dados conforme ISO 9060 e IEC 61724-1 exige instrumentação metrológica e acesso ao arranjo energizado — fora do escopo de análise de dados.", entregaEsperada: "Campanha de medição com irradiância de referência calibrada e geração registrada por um período, para recalibrar o modelo e medir o viés da fonte de satélite no sítio.", gerenciadoPor: "zaeon" },
      ],
    },
    {
      id: "documentar-premissas",
      titulo: "Documentar premissas e limitações",
      blocos: [
        { tipo: "texto", texto: "A análise honesta termina dizendo o que assumiu e o que não sabe. Premissas a declarar sempre: qual fonte de recurso e sua versão, qual modelo de conversão e seus parâmetros (inclinação, azimute, PR ou perdas), qual período, qual coordenada. Limitações a confessar: o que não foi validado em campo, a resolução espacial da fonte, os furos preenchidos, a incerteza estimada." },
        { tipo: "texto", texto: "Esse registro não é burocracia: é o que permite a outra pessoa confiar, auditar e reaproveitar. Uma análise de geração sem a seção de premissas e limitações é como um remédio sem bula. Guarde-a junto do relatório e do código. No fim, a credibilidade de um cientista de dados mora menos no gráfico bonito e mais na clareza sobre o que o gráfico não mostra." },
        {
          tipo: "tarefas",
          itens: [
            { id: "t-doc-1", titulo: "Escrever a bula da análise", entrega: "Uma seção de premissas (fonte, modelo, parâmetros, período) e limitações (não validado, resolução, furos, incerteza)." },
            { id: "t-doc-2", titulo: "Anexar ao entregável", entrega: "A bula salva junto do relatório e do repositório, versionada com o resto." },
          ],
        },
      ],
    },
    {
      id: "fontes-validacao",
      titulo: "Fontes: validação, desempenho e campo",
      blocos: [
        { tipo: "texto", texto: "As referências de desempenho, degradação e medição de campo que sustentam o capítulo de manutenção e validação." },
        { tipo: "fontes", titulo: "Desempenho e medição", itens: [
          { titulo: "IEC 61724-1 — Photovoltaic system performance: monitoring", url: "https://webstore.iec.ch/publication/65561", tipo: "norma", nota: "Medição de desempenho e Performance Ratio de forma comparável e auditável." },
          { titulo: "ABNT NBR 16690 — Instalações elétricas de arranjos fotovoltaicos", url: "https://www.abntcatalogo.com.br/norma.aspx?ID=360035", tipo: "norma", nota: "Requisitos de projeto e instalação do arranjo FV no Brasil; exige responsável técnico." },
          { titulo: "NREL — PV Degradation Rates (Jordan & Kurtz)", url: "https://www.nrel.gov/pv/degradation-rates", tipo: "artigo", nota: "Síntese de taxas de degradação medidas: silício cristalino tipicamente 0,5-0,8%/ano." },
          { titulo: "IEA PVPS — relatórios técnicos (Task 13, desempenho e confiabilidade)", url: "https://iea-pvps.org/", tipo: "site", nota: "Boas práticas internacionais de monitoramento, soiling e análise de desempenho." },
        ] },
        {
          tipo: "licao",
          pergunta: "Qual é a taxa de degradação anual típica de módulos de silício cristalino?",
          alternativas: ["Cerca de 5% ao ano", "Cerca de 0,5% a 0,8% ao ano", "Zero, não degradam"],
          correta: 1,
          explicacao: "Sínteses de campo (NREL) apontam tipicamente 0,5-0,8%/ano para silício cristalino — pequena por ano, mas relevante ao longo de 25 anos de operação.",
        },
      ],
    },
    // ===================== CAPÍTULO 8 — CASOS REAIS =====================
    {
      id: "caso-renewables-ninja",
      titulo: "Caso: renewables.ninja e a ciência aberta",
      blocos: [
        { tipo: "texto", texto: "Em 2016, os pesquisadores Stefan Pfenninger e Iain Staffell publicaram, na revista Energy, o método que vira irradiância de satélite e reanálise em séries horárias de geração fotovoltaica, validado contra geração medida em vários países europeus. Desse trabalho nasceu o renewables.ninja, uma ferramenta aberta que hoje é usada em centenas de estudos de sistema elétrico no mundo todo." },
        { tipo: "texto", texto: "A lição do caso é dupla. Primeira: dado aberto com método publicado e validado é confiável e reutilizável — exatamente o oposto do número sem fonte. Segunda: a validação contra geração medida (o que este caderno prega) foi o que deu credibilidade ao método. É o modelo de como se faz análise de geração séria: aberto, validado, reproduzível." },
        {
          tipo: "licao",
          pergunta: "O que deu credibilidade científica ao método do renewables.ninja?",
          alternativas: [
            "Ser pago",
            "Ter método publicado e ser validado contra geração medida real em vários países",
            "Usar só um ano de dados",
          ],
          correta: 1,
          explicacao: "Publicar o método e validá-lo contra geração medida tornou a série reutilizável e confiável — o padrão-ouro da análise aberta.",
        },
      ],
    },
    {
      id: "caso-atlas-brasil",
      titulo: "Caso: o Atlas Brasileiro como infraestrutura",
      blocos: [
        { tipo: "texto", texto: "O Atlas Brasileiro de Energia Solar é mais que um mapa: é infraestrutura de dado público. Construído pelo LABREN/INPE com o modelo BRASIL-SR e mais de 17 anos de satélite, ele deu a milhares de projetos, teses e políticas uma base comum de recurso solar. Quando um integrador dimensiona um telhado em Fortaleza ou um pesquisador estima o potencial do semiárido, é o Atlas que fala." },
        { tipo: "texto", texto: "O caso mostra o valor de uma fonte oficial, citável e mantida: ela vira a régua contra a qual tudo se compara, reduz retrabalho e dá autoridade às análises. A contrapartida é a responsabilidade de citar e respeitar a licença (CC BY-NC-ND). Para quem analisa geração no Brasil, começar pelo Atlas não é só conveniente — é a boa prática metodológica." },
        { tipo: "video", titulo: "São Paulo lidera a geração solar distribuída (CNN Energia)", youtube: "6JSIuVb43z4" },
      ],
    },
    {
      id: "caso-curtailment",
      titulo: "Caso: o corte de geração e os dados do ONS",
      blocos: [
        { tipo: "texto", texto: "Com a solar e a eólica crescendo rápido, o Brasil passou a cortar geração renovável em horários e regiões onde a rede não dá conta de escoar — o chamado curtailment ou constrained-off. Os dados abertos do ONS registram esses cortes, e análises independentes mostraram volumes expressivos de energia renovável não gerada por restrição, da ordem de dezenas de TWh em meses recentes." },
        { tipo: "texto", texto: "O caso é um lembrete metodológico importante: a geração medida (o que a usina de fato entregou) pode ser menor que a geração possível (o que o recurso permitiria), por decisão de operação, não por falta de sol. Ao validar um modelo de recurso contra geração medida, é preciso saber se houve corte — senão o 'erro' do modelo é, na verdade, o operador segurando a usina. Dado aberto do ONS permite flagrar isso." },
        {
          tipo: "licao",
          pergunta: "Ao validar um modelo de recurso contra a geração medida de uma usina, por que é importante saber se houve curtailment?",
          alternativas: [
            "Porque o curtailment aumenta a irradiância",
            "Porque a usina pode ter gerado menos por restrição da rede, não por falta de sol, o que não é erro do modelo",
            "Porque o ONS não mede solar",
          ],
          correta: 1,
          explicacao: "Curtailment faz a geração medida ficar abaixo do possível por decisão de operação. Sem saber disso, atribui-se ao modelo um erro que é, na verdade, corte de rede.",
        },
      ],
    },
    {
      id: "caso-telhado",
      titulo: "Caso: dimensionar um telhado só com dado aberto",
      blocos: [
        { tipo: "texto", texto: "Um caso cotidiano: uma família quer saber quanto um sistema de 4 kWp geraria no telhado dela, voltado ao Norte e inclinado na latitude. Sem comprar nada, o integrador pega lat/lon no mapa, roda o PVGIS seriescalc com peakpower=4 e loss=14, obtém a série horária de um ano típico, soma por mês e apresenta o perfil mensal e a energia anual esperada — com a incerteza da fonte." },
        { tipo: "texto", texto: "Cruzando com a conta de luz (o consumo mensal), decide-se o tamanho ideal e o mês crítico. É a democratização que os dados abertos trouxeram: uma análise que há 20 anos exigiria uma estação de medição por anos, hoje sai em minutos, de graça e reproduzível. O caderno inteiro cabe neste caso — e ele termina num número que a família usa para decidir." },
        {
          tipo: "tarefas",
          itens: [
            { id: "t-tel-1", titulo: "Rodar o caso completo", entrega: "Para um telhado real, a energia mensal e anual esperada de um sistema de 4 kWp, obtida via PVGIS, com o mês crítico identificado." },
            { id: "t-tel-2", titulo: "Comparar com o consumo", entrega: "Sobreposição do perfil de geração estimado com o consumo mensal da conta de luz, indicando o tamanho adequado." },
          ],
        },
      ],
    },
    {
      id: "caso-nacional",
      titulo: "Caso: a série solar nacional pelo ONS",
      blocos: [
        { tipo: "texto", texto: "Subindo de escala, dá para analisar a geração solar centralizada do país inteiro. Baixando do ONS a série horária de geração solar do SIN e reamostrando, enxerga-se a curva diária média nacional (o grande sino que empurra a demanda líquida para baixo durante o dia), o crescimento acelerado ano a ano e a sazonalidade agregada de todo o parque — um retrato macro do que, no telhado, era micro." },
        { tipo: "texto", texto: "O mesmo ferramental — pandas, resample, decomposição — serve do telhado ao país. Muda a escala, não o método. E a mesma disciplina vale: a série do ONS cobre a geração centralizada supervisionada, mas não a distribuída atrás do medidor, que precisa ser estimada a partir da ANEEL. Saber a fronteira de cada dado é o que impede conclusões furadas sobre 'a solar do Brasil'." },
        {
          tipo: "diagrama", titulo: "Do telhado ao país, mesmo método", codigo: `flowchart LR
  T["Telhado (4 kWp)"] --> M["pandas: resample, decompor"]
  U["Usina (MW)"] --> M
  P["Pais (SIN, ONS)"] --> M
  M --> R["Perfil, sazonalidade, tendencia"]` },
      ],
    },
    {
      id: "licoes-casos",
      titulo: "As lições dos casos",
      blocos: [
        { tipo: "texto", texto: "Os casos convergem em poucos princípios duros. Um: dado aberto com método publicado e validado é confiável; sem isso, é palpite. Dois: validar contra geração medida é o que dá credibilidade — e exige saber da fronteira dos dados (curtailment, distribuída fora do ONS). Três: o mesmo ferramental escala do telhado ao país. Quatro: toda análise termina em incerteza declarada e fonte citada." },
        { tipo: "texto", texto: "Juntando tudo, o cientista de dados de energia não é quem faz o gráfico mais bonito, e sim quem sabe de onde veio cada número, quanto ele erra e por quê. Os dados abertos de recurso solar são hoje abundantes e gratuitos; o diferencial é o rigor de quem os usa. Esse rigor, página a página, foi o que este caderno tentou passar." },
        {
          tipo: "licao",
          pergunta: "Qual princípio aparece em todos os casos deste capítulo?",
          alternativas: [
            "Usar sempre a fonte mais cara",
            "Validar contra a realidade e declarar fonte e incerteza de cada número",
            "Evitar dados abertos",
          ],
          correta: 1,
          explicacao: "Método publicado, validação contra o medido, mesmo ferramental em qualquer escala e, acima de tudo, fonte e incerteza declaradas: o fio que une todos os casos.",
        },
      ],
    },
    // ===================== CAPÍTULO 9 — RECURSOS =====================
    {
      id: "biblioteca",
      titulo: "Biblioteca de recursos",
      blocos: [
        { tipo: "texto", texto: "A estante reunida do caderno: datasets, ferramentas, normas e literatura, para voltar quando a análise pedir. Tudo com lastro real e citável." },
        { tipo: "fontes", titulo: "Datasets e ferramentas", itens: [
          { titulo: "NSRDB (NREL)", url: "https://nsrdb.nrel.gov/", tipo: "dataset", nota: "Recurso solar horário por satélite, EUA e países." },
          { titulo: "PVGIS (JRC/Comissão Europeia)", url: "https://joint-research-centre.ec.europa.eu/photovoltaic-geographical-information-system-pvgis_en", tipo: "dataset", nota: "Irradiância e geração PV por ponto, com API." },
          { titulo: "NASA POWER", url: "https://power.larc.nasa.gov/", tipo: "dataset", nota: "Irradiância e meteorologia global, séries longas." },
          { titulo: "Atlas Brasileiro de Energia Solar (LABREN/INPE)", url: "https://labren.ccst.inpe.br/atlas_2017-en.html", tipo: "dataset", nota: "Climatologia solar oficial do Brasil." },
          { titulo: "pvlib-python", url: "https://pvlib-python.readthedocs.io/en/stable/", tipo: "site", nota: "Biblioteca de física solar e modelagem de geração." },
          { titulo: "renewables.ninja", url: "https://www.renewables.ninja/", tipo: "dataset", nota: "Séries horárias de geração PV/eólica prontas." },
        ] },
        { tipo: "fontes", titulo: "Normas e literatura", itens: [
          { titulo: "IEC 61724-1 — desempenho de sistemas FV", url: "https://webstore.iec.ch/publication/65561", tipo: "norma", nota: "Performance Ratio e monitoramento." },
          { titulo: "ABNT NBR 16690 — arranjos fotovoltaicos", url: "https://www.abntcatalogo.com.br/norma.aspx?ID=360035", tipo: "norma", nota: "Instalação do arranjo FV no Brasil." },
          { titulo: "Hyndman & Athanasopoulos — Forecasting (FPP3, aberto)", url: "https://otexts.com/fpp3/", tipo: "livro", nota: "Séries temporais: decomposição e previsão." },
          { titulo: "Pfenninger & Staffell (2016), Energy", url: "https://doi.org/10.1016/j.energy.2016.08.060", tipo: "artigo", nota: "Validação de geração PV a partir de dados abertos." },
        ] },
      ],
    },
    {
      id: "glossario",
      titulo: "Glossário do analista",
      blocos: [
        { tipo: "texto", texto: "Os termos que o caderno usou, em uma linha cada. GHI/DNI/DHI: componentes global, direta e difusa da irradiância. POA: irradiância no plano do painel inclinado. Irradiância (W/m²) x irradiação (Wh/m²): potência x energia por área. Clear-sky: o céu limpo de referência. kt*: índice de céu limpo, medido sobre o limpo." },
        { tipo: "texto", texto: "PR: performance ratio, a nota de aproveitamento do recurso. CF: fator de capacidade, fração do nominal usada. Yield (kWh/kWp): energia por potência instalada. TMY: ano meteorológico típico. Decomposição: separar tendência, sazonalidade e resíduo. P50/P90: geração mediana e conservadora. Curtailment: corte de geração por restrição de rede. Soiling: perda por sujeira." },
        {
          tipo: "licao",
          pergunta: "Em uma linha: qual a diferença entre PR e CF?",
          alternativas: [
            "São o mesmo",
            "PR mede o aproveitamento do recurso disponível; CF mede a fração da potência nominal usada na média",
            "PR é anual e CF é diário",
          ],
          correta: 1,
          explicacao: "PR é qualidade (quão bem aproveita o recurso que chegou); CF é intensidade (quanto do nominal, contando que de noite não há sol). Conceitos distintos.",
        },
      ],
    },
    {
      id: "checklist",
      titulo: "Checklist do analista de geração",
      blocos: [
        { tipo: "texto", texto: "Antes de entregar qualquer análise de geração fotovoltaica, passe por esta lista. Ela condensa o caderno num procedimento que impede os erros mais comuns — de fuso a licença." },
        {
          tipo: "tarefas",
          itens: [
            { id: "t-chk-1", titulo: "Pergunta e lugar definidos", entrega: "Pergunta em uma frase, coordenada com 4 casas, sistema (kWp, inclinação, azimute) anotados." },
            { id: "t-chk-2", titulo: "Fonte e proveniência", entrega: "Fonte escolhida com justificativa, licença lida, proveniência registrada (modelo, período, data)." },
            { id: "t-chk-3", titulo: "Fuso conferido", entrega: "Teste visual do meio-dia feito: o pico diário cai perto do meio-dia solar." },
            { id: "t-chk-4", titulo: "QC e furos tratados", entrega: "Faixas físicas checadas, fechamento GHI testado, furos marcados como ausentes, não zero." },
            { id: "t-chk-5", titulo: "Métricas calculadas", entrega: "Perfil mensal, fator de capacidade, yield (kWh/kWp) e mês crítico calculados." },
            { id: "t-chk-6", titulo: "Validação e incerteza", entrega: "Comparação entre fontes (ou contra medido), barra de erro P50/P90 e premissas/limitações escritas." },
          ],
        },
      ],
    },
    {
      id: "proximos-passos",
      titulo: "Próximos passos",
      blocos: [
        { tipo: "texto", texto: "O caderno parou na análise descritiva: medir e ler a série. O passo natural adiante é a previsão. Com a sazonalidade e a tendência já separadas, modelos como SARIMA (ARIMA sazonal), Prophet ou aprendizado de máquina estimam a geração futura de horas a dias — o que operadores e comercializadores de energia precisam. A decomposição deste caderno é o alicerce desses modelos." },
        { tipo: "texto", texto: "Outras trilhas: combinar geração solar com consumo para dimensionar armazenamento; cruzar com preço de energia para estudar viabilidade; subir para previsão de nuvens por satélite em tempo real (nowcasting). Em todas, o alicerce é o mesmo que você construiu aqui: dado aberto, série limpa, sazonalidade entendida e incerteza declarada. Daqui, a estrada é só mais longa." },
        { tipo: "video", titulo: "Seasonal ARIMA and SARIMAX in Python: Time Series Forecasting", youtube: "GMcjIzIT0QU" },
        {
          tipo: "licao",
          pergunta: "Por que a decomposição feita neste caderno é um bom alicerce para previsão (SARIMA, Prophet)?",
          alternativas: [
            "Porque previsão não usa sazonalidade",
            "Porque esses modelos representam explicitamente tendência e sazonalidade, que a decomposição já isolou e entendeu",
            "Porque elimina a necessidade de dado",
          ],
          correta: 1,
          explicacao: "SARIMA e Prophet modelam tendência e sazonalidade de forma explícita. Tê-las separadas e compreendidas é exatamente o ponto de partida para prever bem.",
        },
      ],
    },
    {
      id: "compilado",
      titulo: "Prancha de síntese",
      blocos: [
        { tipo: "texto", texto: "O caderno inteiro em um fôlego: a geração fotovoltaica de um lugar é uma série temporal com duas sazonalidades encaixadas (diária e anual), uma tendência lenta (degradação) e um resíduo ligado ao tempo (nuvens). Para medi-la sem um único sensor no começo, há dados abertos abundantes — NSRDB, PVGIS, NASA POWER, Atlas Brasileiro, ONS, ANEEL, INMET — cada um com cobertura, resolução e incerteza próprias, a serem triangulados, nunca crentes num só." },
        { tipo: "texto", texto: "O método é uma cadeia: baixar com proveniência, limpar com QC e cuidado de fuso, converter o recurso em geração com PVWatts no pvlib, agregar na escala da pergunta, decompor para separar sazonalidade de tendência, comparar ano a ano e detectar anomalias, e fechar com incerteza declarada e fonte citada. As métricas-régua são o yield (kWh/kWp), o fator de capacidade e o performance ratio." },
        { tipo: "texto", texto: "E a fronteira do analista: quando o número precisa virar verdade de usina — medir irradiância de referência, calcular PR medido, validar com rigor metrológico —, entra o engenheiro habilitado, porque aí se mexe no arranjo energizado e em instrumentação calibrada, sob ABNT NBR 16690/16274, ISO 9060 e IEC 61724-1. O cientista de dados prepara, modela e lê; o profissional de campo mede e assina. Cada número, do fóton ao gráfico, com fonte." },
        { tipo: "compilado" },
      ],
    },
  ],
};
