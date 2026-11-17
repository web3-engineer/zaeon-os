import type { CadernoEstudo } from "../cadernosEstudo";

/**
 * Caderno de campo: "Placas solares: raspagem, riscos e alternativas para recuperar rendimento".
 * Engenharia de energia solar fotovoltaica. Todo numero, norma, tecnica e desenho tem lastro
 * em fonte real (ver paginas "fontes" ao longo do caderno). A raspagem do vidro quase nunca e a
 * resposta certa: o caminho e diagnosticar a causa da perda e so entao agir.
 */
export const caderno: CadernoEstudo = {
  id: "reaproveitamento-solar",
  titulo: "Placas solares: raspagem, riscos e alternativas para recuperar rendimento",
  resumo:
    "Quando o painel gera menos, a tentacao e pegar a espatula. Este caderno mostra por que raspar o vidro arruina o modulo, como descobrir a verdadeira causa da perda (sujidade, PID, hot spot, trinca) e o que de fato recupera rendimento - com normas, dados reais, casos e o passo a passo seguro.",
  paginas: [
    // ===================== CONTEXTO =====================
    {
      id: "abertura",
      titulo: "A tentacao de raspar",
      blocos: [
        { tipo: "texto", texto: "Seu sistema gerava 30 kWh/dia e agora entrega 22. O primeiro impulso de muita gente e subir no telhado com uma espatula, uma palha de aco ou uma lavadora de alta pressao e 'raspar' a sujeira grudada. Quase sempre isso piora tudo: risca o vidro, destroi o revestimento antirreflexo, abre microtrincas nas celulas e ainda cancela a garantia. A queda de rendimento tem muitas causas - e na maioria das vezes a solucao nao e esfregar com forca." },
        { tipo: "texto", texto: "Este caderno trata a placa solar como um equipamento de engenharia, nao como uma janela suja. O caminho honesto tem tres passos: (1) medir e diagnosticar por que o rendimento caiu; (2) escolher a acao certa para aquela causa; (3) executar com seguranca eletrica e de altura. Raspar e o ultimo recurso - e, feito errado, nem e recurso: e prejuizo." },
        { tipo: "diagrama", titulo: "O reflexo errado x o metodo certo", codigo: `flowchart TD
  A["Gerou menos que o esperado"] --> B{"Reflexo comum"}
  B --> C["Raspar / esfregar / alta pressao"]
  C --> D["Vidro riscado, trinca, garantia perdida"]
  A --> E{"Metodo de engenharia"}
  E --> F["Medir e diagnosticar a causa"]
  F --> G["Acao certa para a causa"]
  G --> H["Rendimento recuperado com seguranca"]` },
      ],
    },
    {
      id: "anatomia",
      titulo: "Anatomia de um modulo (o que voce arranha)",
      blocos: [
        { tipo: "texto", texto: "Um modulo fotovoltaico nao e uma chapa unica. De cima para baixo ele tem: vidro temperado com revestimento antirreflexo, uma camada de encapsulante (EVA ou POE) que sela tudo, as celulas de silicio com suas trilhas finissimas de prata, outra camada de encapsulante, o backsheet (ou um segundo vidro, nos bifaciais), a moldura de aluminio e a caixa de juncao com os diodos de bypass. O que o rodo encosta e so o vidro - mas o estrago de uma raspagem atravessa todas as camadas." },
        {
          tipo: "prancha",
          titulo: "Corte de um modulo c-Si (camadas)",
          desenho: {
            legenda: "As camadas, de cima (sol) para baixo. A espatula so toca o vidro, mas a trinca desce ate a celula.",
            primitivas: [
              { t: "retangulo", p: [30, 30], w: 240, h: 16, cor: "destaque" },
              { t: "rotulo", p: [275, 42], texto: "vidro + antirreflexo" },
              { t: "retangulo", p: [30, 46], w: 240, h: 12, hachura: true },
              { t: "rotulo", p: [275, 56], texto: "EVA (cola)" },
              { t: "retangulo", p: [30, 58], w: 240, h: 24, cor: "tinta" },
              { t: "rotulo", p: [275, 72], texto: "celula de silicio" },
              { t: "retangulo", p: [30, 82], w: 240, h: 12, hachura: true },
              { t: "rotulo", p: [275, 92], texto: "EVA (cola)" },
              { t: "retangulo", p: [30, 94], w: 240, h: 14, cor: "suave" },
              { t: "rotulo", p: [275, 104], texto: "backsheet" },
              { t: "retangulo", p: [24, 28], w: 8, h: 86, cor: "tinta" },
              { t: "retangulo", p: [268, 28], w: 8, h: 86, cor: "tinta" },
              { t: "rotulo", p: [60, 128], texto: "moldura de aluminio nas bordas" },
              { t: "seta", de: [150, 20], ate: [150, 30], cor: "destaque" },
              { t: "rotulo", p: [120, 16], texto: "sol" },
              { t: "linha", de: [90, 30], ate: [96, 82], cor: "destaque" },
              { t: "rotulo", p: [40, 160], texto: "trinca aberta pela raspagem desce ate a celula" },
            ],
          },
        },
        {
          tipo: "licao",
          pergunta: "Ao raspar o vidro com forca, qual e o pior dano possivel?",
          alternativas: [
            "Apenas deixar o vidro mais limpo",
            "Abrir microtrincas que atingem a celula de silicio sob o vidro",
            "Aumentar a tensao de circuito aberto",
          ],
          correta: 1,
          explicacao: "A pressao mecanica no vidro se transmite as celulas: microtrincas nascem ali e viram pontos quentes (hot spots) com o tempo. O vidro 'limpo' sai caro.",
        },
      ],
    },
    {
      id: "rendimento-stc",
      titulo: "O que e 'rendimento' e por que ele cai",
      blocos: [
        { tipo: "texto", texto: "A potencia de pico (Wp) impressa no modulo e medida em laboratorio nas STC (Standard Test Conditions): 1000 W/m2 de irradiancia, 25 C de celula e espectro AM1.5. No telhado, quase nunca estamos nas STC. O rendimento real cai por fatores reversiveis (sujidade, sombra, temperatura alta) e irreversiveis (degradacao do material). Separar um do outro e a chave: sujidade voce limpa; degradacao voce nao 'limpa' de jeito nenhum." },
        { tipo: "texto", texto: "Alem disso, todo modulo degrada um pouco ao longo da vida: os fabricantes costumam garantir cerca de 80% a 87% da potencia inicial apos 25 anos, com uma queda anual tipica da ordem de 0,5% a 0,7%. Se o seu caiu 25% em dois anos, o problema nao e 'o tempo' - e algo diagnosticavel: sujidade pesada, PID, hot spot, conector ruim ou sombra nova." },
        {
          tipo: "prancha",
          titulo: "Curva de degradacao esperada x queda anormal",
          desenho: {
            legenda: "Linha suave = degradacao normal garantida. Degrau = perda anormal que pede diagnostico, nao espatula.",
            primitivas: [
              { t: "linha", de: [30, 30], ate: [30, 170], cor: "tinta" },
              { t: "linha", de: [30, 170], ate: [290, 170], cor: "tinta" },
              { t: "rotulo", p: [2, 34], texto: "100%" },
              { t: "rotulo", p: [6, 150], texto: "80%" },
              { t: "rotulo", p: [250, 182], texto: "25 anos" },
              { t: "linha", de: [30, 40], ate: [280, 150], cor: "suave" },
              { t: "rotulo", p: [150, 96], texto: "degradacao normal" },
              { t: "linha", de: [30, 40], ate: [110, 70], cor: "destaque" },
              { t: "linha", de: [110, 70], ate: [112, 120], cor: "destaque" },
              { t: "linha", de: [112, 120], ate: [180, 135], cor: "destaque" },
              { t: "rotulo", p: [96, 60], texto: "queda anormal (ano 2)" },
              { t: "seta", de: [140, 118], ate: [120, 122], cor: "destaque" },
            ],
          },
        },
      ],
    },
    {
      id: "soiling-custa",
      titulo: "Quanto a sujidade custa (os numeros)",
      blocos: [
        { tipo: "texto", texto: "'Soiling' e o nome tecnico do acumulo de poeira, poluicao, polen e fezes de passaro sobre o vidro. Segundo a IEA-PVPS (Programa de Sistemas Fotovoltaicos da Agencia Internacional de Energia), a sujidade responde por algo entre 4% e 7% das perdas globais de energia solar, com perdas anuais tipicas de 3% a 5% por sistema. Nao e pouco: em escala mundial, isso representa bilhoes de dolares por ano em energia nao gerada." },
        { tipo: "texto", texto: "No Brasil ha medidas locais. Um estudo de modulos sobre um estadio em Minas Gerais mediu queda de cerca de 16,5% na geracao em periodo seco, caindo para cerca de 8% logo apos a chuva. Um estudo do IFB, em Brasilia, apontou a sujidade como principal fator de perda e sugeriu limpeza a cada 30 dias em ambiente urbano. A licao: parte enorme da 'perda' some com chuva ou uma limpeza suave - sem raspar nada." },
        { tipo: "video", titulo: "Como calcular a perda por sujidade (soiling) numa usina", youtube: "xqwvWN_P9zc" },
        {
          tipo: "fontes",
          titulo: "Fontes: quanto a sujidade pesa",
          itens: [
            { titulo: "IEA-PVPS - Soiling losses (pagina do topico)", url: "https://iea-pvps.org/key-topics/soiling-losses/", tipo: "site", nota: "4% a 7% das perdas globais; mitigacao depende do local." },
            { titulo: "IEA-PVPS warns soiling costs solar industry billions per year (pv magazine)", url: "https://www.pv-magazine.com/2025/10/01/iea-pvps-warns-soiling-costs-solar-industry-billions-per-year/", tipo: "artigo" },
            { titulo: "Impacto da sujidade na geracao - estudo IFB (repositorio)", url: "https://repositorio.ifb.edu.br/bitstreams/ea23560a-7a75-466b-8b4d-3379e630c3be/download", tipo: "artigo", nota: "Sugere limpeza a cada 30 dias." },
            { titulo: "Limpeza dos modulos e seu impacto na geracao (Canal Solar)", url: "https://canalsolar.com.br/limpeza-dos-modulos-fotovoltaicos-e-o-seu-impacto-na-geracao-de-energia/", tipo: "artigo" },
          ],
        },
      ],
    },
    // ===================== LEITURA DO TEMA =====================
    {
      id: "tipos-sujeira",
      titulo: "Nem toda sujeira e igual",
      blocos: [
        { tipo: "texto", texto: "Antes de pensar em como limpar, identifique O QUE esta grudado. Poeira fina e polen saem com agua. Fezes de passaro e seiva pegajosa precisam amolecer antes. Cimento, cal, respingo de tinta e liquen (aquele musgo que cresce na borda) sao os que fazem a pessoa pegar a espatula - e justamente os que mais arriscam o vidro. Cada tipo tem um tratamento, e nenhum deles e 'raspar seco'." },
        {
          tipo: "prancha",
          titulo: "Mapa de sujidades e o risco de cada uma",
          desenho: {
            legenda: "Da esquerda (facil, agua resolve) para a direita (dura, tentacao de raspar = perigo).",
            primitivas: [
              { t: "linha", de: [20, 100], ate: [290, 100], cor: "tinta" },
              { t: "circulo", c: [50, 100], r: 10, cor: "suave" },
              { t: "rotulo", p: [30, 128], texto: "poeira/polen" },
              { t: "circulo", c: [120, 100], r: 12, hachura: true },
              { t: "rotulo", p: [96, 128], texto: "fezes/seiva" },
              { t: "circulo", c: [195, 100], r: 14, cor: "tinta" },
              { t: "rotulo", p: [168, 72], texto: "cimento/cal" },
              { t: "circulo", c: [265, 100], r: 16, cor: "destaque" },
              { t: "rotulo", p: [240, 72], texto: "liquen/tinta" },
              { t: "seta", de: [20, 60], ate: [285, 60], cor: "destaque" },
              { t: "rotulo", p: [96, 50], texto: "risco de querer raspar cresce ->" },
            ],
          },
        },
        {
          tipo: "licao",
          pergunta: "Qual o jeito certo de lidar com fezes de passaro ressecadas no vidro?",
          alternativas: [
            "Raspar a seco com espatula de metal",
            "Umedecer e deixar amolecer, depois remover com esponja macia",
            "Jogar agua fervente para dissolver rapido",
          ],
          correta: 1,
          explicacao: "Amolecer com agua (temperatura ambiente) e remover sem forca preserva o vidro e o revestimento. Raspar a seco risca; agua fervente provoca choque termico.",
        },
      ],
    },
    {
      id: "raspagem-tentacao",
      titulo: "A raspagem: o que acontece de verdade",
      blocos: [
        { tipo: "texto", texto: "'Raspar' e qualquer acao abrasiva no vidro: espatula, laminada, palha de aco, escova dura, esponja do lado verde, po de limpeza arenoso ou lavadora de alta pressao mirando de perto. Todas deixam microrriscos. Esses riscos espalham a luz (reduzem a transmitancia), viram ninho para nova sujeira grudar e, se houver impacto, propagam trincas ate as celulas. O vidro fotovoltaico e temperado e tem textura e revestimento calculados - nao e para ser lixado." },
        { tipo: "texto", texto: "A alta pressao merece um alerta a parte: fabricantes como Risen e ZNShine limitam a pressao da agua sobre o vidro a no maximo 700 kPa; a JA Solar recomenda abaixo de 690 kPa. Uma lavadora domestica comum passa facil disso e pode forcar agua pelas vedacoes, abrir caminho para umidade no laminado e causar falha eletrica. 'Limpar com forca' e, muitas vezes, a origem do proximo defeito." },
        {
          tipo: "prancha",
          titulo: "O que a espatula faz com a luz",
          desenho: {
            legenda: "Vidro liso: luz entra. Vidro riscado: parte da luz espalha e volta - menos corrente na celula.",
            primitivas: [
              { t: "retangulo", p: [25, 70], w: 110, h: 60, cor: "suave" },
              { t: "rotulo", p: [45, 148], texto: "vidro intacto" },
              { t: "seta", de: [60, 30], ate: [70, 70], cor: "destaque" },
              { t: "seta", de: [70, 70], ate: [80, 128], cor: "destaque" },
              { t: "rotulo", p: [74, 52], texto: "luz entra" },
              { t: "retangulo", p: [170, 70], w: 110, h: 60, cor: "suave" },
              { t: "linha", de: [185, 70], ate: [192, 76], cor: "tinta" },
              { t: "linha", de: [205, 70], ate: [212, 76], cor: "tinta" },
              { t: "linha", de: [230, 70], ate: [237, 76], cor: "tinta" },
              { t: "rotulo", p: [182, 148], texto: "vidro riscado" },
              { t: "seta", de: [205, 30], ate: [214, 72], cor: "destaque" },
              { t: "seta", de: [214, 72], ate: [240, 48], cor: "tinta" },
              { t: "rotulo", p: [226, 40], texto: "espalha" },
            ],
          },
        },
        { tipo: "video", titulo: "Como lavar sua placa solar: como fazer e os cuidados necessarios", youtube: "innFZ7Jpil4" },
      ],
    },
    {
      id: "revestimento-ar",
      titulo: "O revestimento antirreflexo e sua fragilidade",
      blocos: [
        { tipo: "texto", texto: "O vidro de um modulo moderno tem uma camada antirreflexo (AR), em geral de silica porosa, com poucos nanometros a centenas de nanometros de espessura. Ela aumenta a transmitancia da luz em cerca de 2% a 3% - o suficiente para mudar o retorno do sistema ao longo de 25 anos. Essa camada e finissima e sacrificavel: abrasao, detergente agressivo e produtos acidos ou alcalinos a desgastam. Uma vez removida, nao volta com limpeza; o ganho dela se perde para sempre." },
        { tipo: "texto", texto: "Por isso os manuais pedem agua ou limpa-vidros neutro e nao abrasivo, com esponja ou escova macia, e orientam conferir na ficha tecnica do fabricante a compatibilidade quimica dos produtos. Pesquisas em revestimentos (inclusive camadas antiaderentes e autolimpantes) existem justamente para reduzir a sujidade SEM esfregar - a direcao da engenharia e menos atrito, nao mais." },
        {
          tipo: "fontes",
          titulo: "Fontes: limpeza correta e revestimentos",
          itens: [
            { titulo: "Manutencao de paineis solares: como fazer (Repsol)", url: "https://www.repsol.pt/particulares/assessoramento/manutencao-paineis-solares-como-fazer/", tipo: "site", nota: "Agua ou limpa-vidros nao abrasivo; conferir ficha tecnica." },
            { titulo: "Como deve ser realizada a limpeza dos paineis solares (Canal Solar)", url: "https://canalsolar.com.br/como-deve-ser-realizada-a-limpeza-dos-paineis-solares/", tipo: "artigo", nota: "Limites de pressao de agua por fabricante." },
            { titulo: "Revestimentos antiaderentes na eficiencia de paineis FV - tese (Univ. Coimbra)", url: "https://estudogeral.uc.pt/handle/10316/98235", tipo: "artigo" },
          ],
        },
      ],
    },
    {
      id: "microtrincas",
      titulo: "Microtrincas e hot spots: o dano invisivel",
      blocos: [
        { tipo: "texto", texto: "Microtrincas (microcracks) sao rachaduras finissimas nas celulas, invisiveis a olho nu. Nascem no transporte, na instalacao, de granizo - e de pressao mecanica, como pisar no modulo ou raspar com forca. Sozinhas podem nao fazer nada; mas quando isolam um pedaco da celula, aquela regiao para de gerar e passa a dissipar calor: vira um 'hot spot' (ponto quente). Um estudo de campo encontrou microtrincas na celula afetada de TODO modulo que apresentou hot spot na inspecao termografica de verao." },
        { tipo: "texto", texto: "Hot spot nao e so perda de energia: e risco. O ponto pode passar de 100 C, queimar o backsheet, degradar o encapsulante e, em casos extremos, iniciar incendio. Por isso a deteccao se faz com camera termografica (infravermelho) e com eletroluminescencia (EL), que 'fotografa' as celulas no escuro e revela as trincas. O ensaio de hot spot faz parte da IEC 61215 (qualificacao de modulos), e a especificacao IEC TS 60904-13 trata da imagem por eletroluminescencia." },
        { tipo: "diagrama", titulo: "Da trinca ao incendio", codigo: `flowchart LR
  A["Pressao / raspagem / granizo"] --> B["Microtrinca na celula"]
  B --> C["Regiao isolada para de gerar"]
  C --> D["Corrente forca a passagem: aquece"]
  D --> E["Hot spot > 100 C"]
  E --> F["Queima backsheet / risco de incendio"]` },
        {
          tipo: "fontes",
          titulo: "Fontes: hot spots, microtrincas e inspecao",
          itens: [
            { titulo: "Dealing in practice with hot-spots (arXiv)", url: "https://arxiv.org/pdf/1411.0621", tipo: "artigo", nota: "Hot spot em campo x microtrinca na celula." },
            { titulo: "Electroluminescence inspection: the hidden side of a PV module (PV-Tech)", url: "https://www.pv-tech.org/wp-content/uploads/legacy-publication-pdfs/f35fb94535-electroluminescence-inspection-revisiting-the-hidden-side-of-a-pv-module.pdf", tipo: "artigo" },
            { titulo: "Seguranca em sistemas fotovoltaicos - NT 44/2025 (CBM-GO)", url: "https://www.bombeiros.go.gov.br/wp-content/uploads/2025/02/NT-44-2025_-_Seguranca_em_sistemas_fotovoltaicos.pdf", tipo: "norma", nota: "Riscos termicos e de incendio em FV." },
          ],
        },
      ],
    },
    {
      id: "garantia",
      titulo: "A garantia que voce rasga junto",
      blocos: [
        { tipo: "texto", texto: "Modulos tem duas garantias: a de produto (defeito de fabricacao, 10 a 15 anos tipicos) e a de desempenho (a potencia nao cai abaixo de uma curva, ate 25-30 anos). Quase todo manual condiciona a garantia a limpeza conforme as instrucoes do fabricante. Usar abrasivo, alta pressao acima do limite, produto quimico incompativel ou raspar o vidro e, na pratica, dar ao fabricante o direito de negar o reparo - o dano passa a ser 'mau uso'." },
        { tipo: "texto", texto: "O calculo e cruel: economizar uma visita tecnica raspando por conta propria pode custar um modulo inteiro (ou a string) sem cobertura. Antes de qualquer limpeza fora do trivial, leia o manual do SEU modulo e fotografe o estado atual - essas fotos valem ouro se precisar acionar a garantia depois." },
        {
          tipo: "tarefas",
          itens: [
            { id: "achar-manual", titulo: "Ache o manual do seu modulo", entrega: "Pelo modelo impresso na etiqueta traseira, baixe o manual do fabricante e copie aqui o trecho sobre limpeza (produtos permitidos e pressao maxima de agua)." },
            { id: "foto-estado", titulo: "Registro fotografico", entrega: "Fotografe 3 modulos de perto (vidro, borda, caixa de juncao) em dia nublado. Guarde com data - e sua prova de estado antes de qualquer intervencao." },
          ],
        },
      ],
    },
    // ===================== METODO: DIAGNOSTICO =====================
    {
      id: "diagnostico",
      titulo: "Antes de limpar, diagnostique",
      blocos: [
        { tipo: "texto", texto: "A pergunta de engenharia nao e 'como limpo?', e 'por que caiu?'. Sujidade e so uma das causas. A queda pode ser sombra nova (uma arvore que cresceu, uma antena), um conector MC4 oxidado, um diodo de bypass queimado, PID, degradacao LID/LeTID, inversor limitando (clipping) ou um simples dia mais quente. Limpar um painel que caiu por PID nao recupera nada - e voce ainda arrisca o vidro a toa." },
        { tipo: "diagrama", titulo: "Fluxo de diagnostico", codigo: `flowchart TD
  A["Gerou menos que o esperado"] --> B["Compara com dias de sol parecidos / string vizinha"]
  B --> C{"Queda uniforme em tudo?"}
  C -->|Sim| D["Sujidade geral, temperatura, inversor"]
  C -->|Nao, so parte| E["Sombra, hot spot, PID, conector, diodo"]
  D --> F["Inspecao visual + limpeza teste"]
  E --> G["Termografia + curva I-V + EL"]` },
        {
          tipo: "licao",
          pergunta: "O rendimento caiu so em UMA parte do sistema. O que isso sugere primeiro?",
          alternativas: [
            "Sujidade uniforme em todos os modulos",
            "Um problema localizado: sombra, hot spot, conector ou diodo",
            "Que o sol esta mais fraco este mes",
          ],
          correta: 1,
          explicacao: "Perda localizada aponta para causa localizada. Sujidade costuma ser mais homogenea; queda em uma string ou um modulo pede termografia e curva I-V, nao limpeza.",
        },
      ],
    },
    {
      id: "termografia",
      titulo: "Inspecao visual e termografica",
      blocos: [
        { tipo: "texto", texto: "A primeira ferramenta e o olho: vidro trincado, delaminacao (bolhas no laminado), 'snail trails' (trilhas escuras), caixa de juncao derretida, conector folgado. Depois vem a camera termografica - idealmente num drone, com o sistema gerando e sob boa irradiancia. Celulas e strings com problema aparecem mais quentes. Um padrao de 'tabuleiro de xadrez' quente e assinatura classica de PID; um ponto isolado muito quente e hot spot." },
        { tipo: "texto", texto: "Termografia diz ONDE esta o problema; nem sempre diz o QUANTO. Para quantificar, usa-se a curva I-V (proxima pagina). E a inspecao termografica tem um detalhe fino: a resistencia de contato numa trinca muda com a temperatura, entao uma imagem de eletroluminescencia tirada a noite (celula fria) pode nao prever exatamente quais trincas viram hot spot sob sol forte. Por isso se combinam os metodos." },
        { tipo: "video", titulo: "Limpeza e manutencao preventiva dos paineis solares", youtube: "ivfTErgM9Rg" },
      ],
    },
    {
      id: "curva-iv",
      titulo: "A curva I-V: o eletrocardiograma do modulo",
      blocos: [
        { tipo: "texto", texto: "A curva I-V (corrente x tensao) e o exame mais rico de um modulo ou string. Um tracador de curvas percorre do curto-circuito (Isc, corrente maxima) ao circuito aberto (Voc, tensao maxima) e mostra o ponto de maxima potencia (Pmp). A FORMA da curva denuncia a causa: um degrau no meio = sombra ou celula com hot spot (diodo de bypass atuando); Isc baixa = sujidade ou perda otica; Voc baixa = problema de PID ou celulas; 'joelho' arredondado (fill factor baixo) = resistencia serie, conector ou solda ruim." },
        {
          tipo: "prancha",
          titulo: "Lendo a curva I-V",
          desenho: {
            legenda: "Curva saudavel (cheia) x com degrau (sombra/hot spot). Isc no topo, Voc na direita, Pmp no joelho.",
            primitivas: [
              { t: "linha", de: [30, 30], ate: [30, 160], cor: "tinta" },
              { t: "linha", de: [30, 160], ate: [285, 160], cor: "tinta" },
              { t: "rotulo", p: [2, 34], texto: "I" },
              { t: "rotulo", p: [270, 178], texto: "V" },
              { t: "rotulo", p: [2, 48], texto: "Isc" },
              { t: "curva", pts: [[30, 44], [120, 46], [180, 52], [215, 70], [235, 110], [245, 160]], cor: "destaque" },
              { t: "rotulo", p: [200, 40], texto: "saudavel" },
              { t: "circulo", c: [215, 70], r: 4, cor: "tinta" },
              { t: "rotulo", p: [222, 70], texto: "Pmp" },
              { t: "rotulo", p: [240, 172], texto: "Voc" },
              { t: "curva", pts: [[30, 92], [90, 94], [120, 96], [122, 120], [150, 124], [180, 128], [205, 140], [220, 160]], cor: "tinta" },
              { t: "rotulo", p: [60, 108], texto: "com degrau = sombra / hot spot" },
            ],
          },
        },
        { tipo: "video", titulo: "Entendendo a curva I-V dos modulos fotovoltaicos", youtube: "RJD3Dok7tMw" },
        {
          tipo: "fontes",
          titulo: "Fontes: curva I-V e comissionamento",
          itens: [
            { titulo: "Entendendo o tracador de curva I-V para comissionamento (Canal Solar)", url: "https://canalsolar.com.br/entendendo-o-tracador-de-curva-i-v-para-comissionamento-de-sistemas-fv-2/", tipo: "artigo", nota: "A NBR 16274 trata do ensaio em sistemas de maior complexidade." },
            { titulo: "PV String I-V Curve Testing (Keentel Engineering)", url: "https://www.youtube.com/watch?v=ltpZE6fcWF0", tipo: "video" },
          ],
        },
      ],
    },
    {
      id: "pid",
      titulo: "PID: quando a queda NAO e sujeira",
      blocos: [
        { tipo: "texto", texto: "PID (Potential-Induced Degradation, degradacao induzida por potencial) e uma das causas mais confundidas com 'sujeira'. Em strings com tensao alta, os modulos no extremo negativo ficam com potencial muito negativo em relacao a moldura aterrada; isso empurra ions de sodio do vidro para dentro da celula, criando fugas de corrente. O resultado e queda de potencia que pode chegar a 30% - e, em casos severos relatados em campo, ate cerca de 50% em um ano. Umidade e temperatura altas aceleram." },
        { tipo: "texto", texto: "O ponto crucial: NENHUMA limpeza resolve PID. Esfregar o vidro de um modulo com PID e esforco perdido e risco de dano. PID se identifica por termografia (padrao xadrez), curva I-V (Voc e fill factor baixos) e eletroluminescencia (celulas escuras nas bordas). A boa noticia e que, detectado cedo, parte do PID e reversivel - assunto que retomamos na parte de recuperacao." },
        { tipo: "video", titulo: "Defeating Potential-Induced Degradation (PID) - guia", youtube: "xVQs4Llt1OM" },
        {
          tipo: "fontes",
          titulo: "Fontes: PID",
          itens: [
            { titulo: "Expert Talk: Potential-induced degradation in PV modules (EnergyVille)", url: "https://energyville.be/en/news/expert-talk-potential-induced-degradation-photovoltaic-modules", tipo: "artigo" },
            { titulo: "Potential-Induced Degradation (Kiwa PVEL)", url: "https://www.kiwa.com/pvel/pqp/Pid", tipo: "site", nota: "PID severo pode reduzir a geracao em ate 30%." },
            { titulo: "Potential-induced degradation (Wikipedia)", url: "https://en.wikipedia.org/wiki/Potential-induced_degradation", tipo: "site" },
          ],
        },
      ],
    },
    {
      id: "lid-letid",
      titulo: "LID e LeTID: a degradacao do material",
      blocos: [
        { tipo: "texto", texto: "Alem do PID, ha degradacoes ligadas ao proprio silicio. A LID (Light-Induced Degradation) acontece nas primeiras horas de exposicao ao sol: em celulas de silicio dopado com boro, pares boro-oxigenio reduzem a potencia em tipicamente 1% a 3% logo no inicio, e depois estabiliza. A LeTID (Light and elevated Temperature Induced Degradation) e mais lenta e aparece sob calor e luz ao longo de meses ou anos, podendo ser parcialmente reversivel em temperaturas mais baixas." },
        { tipo: "texto", texto: "Para o dono do sistema, a mensagem e a mesma do PID: isso e fisica do material, nao poeira. Voce nao 'limpa' LID nem LeTID. O que se faz e comprar modulos com baixa suscetibilidade (dado de ensaio do fabricante) e, no diagnostico, nao confundir essa queda esperada com sujidade - de novo, a curva I-V e a termografia separam as causas." },
        { tipo: "diagrama", titulo: "Reversivel x irreversivel", codigo: `flowchart TD
  A["Queda de rendimento"] --> B{"A causa sai com limpeza?"}
  B -->|Sim| C["Sujidade / sombra removivel"]
  B -->|Parcial| D["PID / LeTID: as vezes recupera com tratamento"]
  B -->|Nao| E["LID inicial / trinca / degradacao: nao limpa"]` },
      ],
    },
    {
      id: "arvore-causas",
      titulo: "Arvore de decisao: por que caiu?",
      blocos: [
        { tipo: "texto", texto: "Junte tudo numa arvore unica. Ela te impede de 'ir raspando' e te leva a acao certa. A regra de ouro: so se toca no vidro depois de descartar as causas que limpeza nenhuma resolve, e sempre com o metodo suave. Guarde este fluxo - ele e o coracao do caderno." },
        { tipo: "diagrama", titulo: "Decidindo a acao pela causa", codigo: `flowchart TD
  A["Perda confirmada por medicao"] --> B{"Uniforme ou localizada?"}
  B -->|Uniforme| C{"Sai com uma limpeza teste?"}
  C -->|Sim| D["Era sujidade: limpeza suave periodica"]
  C -->|Nao| E["Temperatura / inversor / LID: ajustar expectativa ou projeto"]
  B -->|Localizada| F["Termografia + curva I-V"]
  F --> G{"Padrao xadrez / Voc baixa?"}
  G -->|Sim| H["PID: tratar reversao (tecnico)"]
  G -->|Nao| I{"Ponto quente isolado?"}
  I -->|Sim| J["Hot spot / trinca: avaliar troca"]
  I -->|Nao| K["Conector / diodo / solda: reparo tecnico"]` },
        {
          tipo: "licao",
          pergunta: "Qual e a UNICA causa, entre estas, que uma limpeza de vidro resolve?",
          alternativas: ["PID", "Sujidade (soiling)", "Microtrinca com hot spot"],
          correta: 1,
          explicacao: "Limpeza so resolve sujidade. PID exige tratamento eletrico; trinca/hot spot exige avaliacao e eventual troca. Por isso diagnosticar vem antes de limpar.",
        },
      ],
    },
    // ===================== CALCULO / MEDICAO =====================
    {
      id: "medir-soiling",
      titulo: "Medir a perda por sujidade (soiling ratio)",
      blocos: [
        { tipo: "texto", texto: "Para saber se vale limpar, meca. O 'soiling ratio' (SR) compara a geracao de um modulo sujo com a de um modulo limpo de referencia sob a mesma irradiancia: SR = Psujo / Plimpo. Um SR de 0,95 significa 5% de perda por sujidade. Da para estimar de forma simples mantendo um modulo pequeno de referencia limpo, ou comparando a geracao atual com a de logo apos a ultima chuva/limpeza, sempre em dias de sol semelhantes." },
        { tipo: "texto", texto: "Cuidado com uma armadilha classica: se o sensor de irradiancia (a celula de referencia) estiver tao sujo quanto os modulos, a perda parece menor do que e. Por isso o sensor de referencia precisa estar limpo. Estacoes de soiling comerciais automatizam isso com um par de celulas (uma limpa, uma exposta)." },
        {
          tipo: "prancha",
          titulo: "Estacao de soiling: par limpo x exposto",
          desenho: {
            legenda: "Duas celulas identicas; uma e mantida limpa. A diferenca de corrente e a perda por sujidade.",
            primitivas: [
              { t: "retangulo", p: [40, 60], w: 80, h: 55, cor: "suave" },
              { t: "rotulo", p: [52, 128], texto: "celula LIMPA" },
              { t: "retangulo", p: [185, 60], w: 80, h: 55, hachura: true },
              { t: "rotulo", p: [194, 128], texto: "celula EXPOSTA" },
              { t: "seta", de: [120, 88], ate: [185, 88], cor: "destaque" },
              { t: "rotulo", p: [128, 78], texto: "SR = exposta/limpa" },
              { t: "seta", de: [70, 40], ate: [78, 60], cor: "destaque" },
              { t: "seta", de: [215, 40], ate: [223, 60], cor: "destaque" },
              { t: "rotulo", p: [120, 150], texto: "mesmo sol nas duas" },
            ],
          },
        },
        {
          tipo: "tarefas",
          itens: [
            { id: "estimar-sr", titulo: "Estime seu soiling ratio", entrega: "Anote a geracao (kWh) de um dia ensolarado antes da limpeza e de um dia ensolarado logo depois. Calcule a diferenca percentual e registre aqui como sua perda por sujidade estimada." },
          ],
        },
      ],
    },
    {
      id: "quando-limpar",
      titulo: "Quando limpar compensa (e quando nao)",
      blocos: [
        { tipo: "texto", texto: "Limpar tem custo (agua, mao de obra, risco de altura) e beneficio (energia recuperada). Limpa-se quando o valor da energia perdida pela sujidade supera, com folga, o custo da limpeza - e nao antes. Limpar demais e desperdicio, e, pior, cada limpeza e uma chance de arranhar o vidro. A IEA-PVPS e explicita: nao existe solucao unica, a estrategia depende do local (poeira, chuva, preco da agua, tarifa)." },
        { tipo: "texto", texto: "Em muitos telhados residenciais, a chuva ja faz 80% do servico e 1 a 2 limpezas suaves por ano bastam. Em regioes aridas, perto de obras, estradas de terra, aviarios ou industrias, a frequencia sobe. A conta e local: compare a perda medida (pagina anterior) com o custo real da limpeza no seu caso." },
        {
          tipo: "licao",
          pergunta: "Qual a melhor base para decidir a frequencia de limpeza?",
          alternativas: [
            "Um calendario fixo igual para todo lugar",
            "A perda medida no local versus o custo e o risco de limpar",
            "Sempre que o painel 'parecer' sujo de longe",
          ],
          correta: 1,
          explicacao: "A decisao e economica e local: energia recuperada x custo/risco. Calendario fixo erra para os dois lados; aparencia de longe engana.",
        },
      ],
    },
    {
      id: "frequencia",
      titulo: "Frequencia por ambiente",
      blocos: [
        { tipo: "texto", texto: "Alguns marcadores praticos (sempre ajustados pela medicao): telhado urbano com chuva regular costuma pedir 1 a 2 limpezas/ano; perto de obra, estrada de terra ou industria, a cada poucos meses; aviario ou muito po, mensal (como sugeriu o estudo do IFB em Brasilia). Inclinacao ajuda: modulos mais inclinados se autolimpam melhor com a chuva; quase deitados acumulam poeira na borda inferior e viram candidatos a soiling localizado - e a hot spot." },
        {
          tipo: "prancha",
          titulo: "Inclinacao e autolimpeza",
          desenho: {
            legenda: "Modulo inclinado: chuva leva a sujeira. Modulo quase deitado: poeira fica na borda de baixo.",
            primitivas: [
              { t: "linha", de: [30, 120], ate: [120, 60], cor: "tinta" },
              { t: "rotulo", p: [40, 140], texto: "inclinado: chuva limpa" },
              { t: "seta", de: [100, 50], ate: [70, 110], cor: "destaque" },
              { t: "linha", de: [180, 100], ate: [280, 92], cor: "tinta" },
              { t: "rotulo", p: [188, 140], texto: "quase deitado: acumula" },
              { t: "circulo", c: [272, 92], r: 6, hachura: true },
              { t: "rotulo", p: [232, 78], texto: "poeira na borda" },
            ],
          },
        },
        { tipo: "video", titulo: "Veja como e feita a limpeza do painel solar", youtube: "1d9X5_VgzlE" },
      ],
    },
    {
      id: "fontes-diagnostico",
      titulo: "Fontes do bloco de diagnostico",
      blocos: [
        { tipo: "texto", texto: "Reuniao das referencias que sustentam o metodo de diagnostico e medicao deste caderno - para voce conferir cada numero na fonte." },
        {
          tipo: "fontes",
          titulo: "Diagnostico, medicao e falhas",
          itens: [
            { titulo: "Soiling losses (IEA-PVPS)", url: "https://iea-pvps.org/key-topics/soiling-losses/", tipo: "site" },
            { titulo: "Dealing in practice with hot-spots (arXiv)", url: "https://arxiv.org/pdf/1411.0621", tipo: "artigo" },
            { titulo: "Electroluminescence inspection (PV-Tech)", url: "https://www.pv-tech.org/wp-content/uploads/legacy-publication-pdfs/f35fb94535-electroluminescence-inspection-revisiting-the-hidden-side-of-a-pv-module.pdf", tipo: "artigo" },
            { titulo: "Multiple effects of PID on solar module performance (pv magazine)", url: "https://www.pv-magazine.com/2022/02/04/multiple-effects-of-potential-induced-degradation-on-solar-module-performance/", tipo: "artigo" },
            { titulo: "Usando tracador de curva I-V - ensaios categoria 2 (video)", url: "https://www.youtube.com/watch?v=jj-IBuF_DRc", tipo: "video" },
          ],
        },
      ],
    },
    // ===================== PROJETO DA LIMPEZA CORRETA =====================
    {
      id: "agua-certa",
      titulo: "A agua certa",
      blocos: [
        { tipo: "texto", texto: "Agua parece trivial, mas nao e. Agua 'dura' (muito calcio e magnesio) seca e deixa manchas minerais que viram nova sombra - as vezes piora a aparencia. O ideal para acabamento e agua desmineralizada/deionizada ou de baixa condutividade, que seca sem deixar residuo. E a temperatura importa: jogar agua fria num vidro quente de meio-dia provoca choque termico e pode trincar o vidro. Lave de manha cedo, fim de tarde ou em dia nublado, com o modulo frio." },
        { tipo: "texto", texto: "Pressao: respeite o limite do fabricante (tipicamente <= 700 kPa sobre o vidro). Mangueira comum com bico aberto resolve a maioria dos casos; lavadora de alta pressao so com bico leque, longe (mais de 30-40 cm) e nunca mirando bordas, conectores ou caixa de juncao - e a forca que empurra agua pelas vedacoes." },
        {
          tipo: "licao",
          pergunta: "Por que evitar lavar o modulo ao meio-dia de sol forte?",
          alternativas: [
            "Porque a energia solar e perigosa de olhar",
            "Porque agua fria no vidro quente causa choque termico e pode trincar",
            "Porque a agua evapora e nao limpa nada",
          ],
          correta: 1,
          explicacao: "O choque termico entre agua fria e vidro quente gera tensao que pode trincar o vidro e as celulas. Lave com o modulo frio (manha, tarde ou dia nublado).",
        },
      ],
    },
    {
      id: "ferramentas",
      titulo: "Ferramentas certas",
      blocos: [
        { tipo: "texto", texto: "O kit seguro e simples e barato: escova macia de cerdas naturais ou microfibra, rodo com borracha macia, cabo telescopico para alcancar sem subir no telhado, balde com agua limpa e, para acabamento, agua desmineralizada. Nada de metal, nada de lado verde de esponja, nada de po abrasivo. O cabo telescopico nao e so conforto: e seguranca - mantem voce longe da borda e do modulo (nao se pisa em modulo)." },
        {
          tipo: "prancha",
          titulo: "Kit de limpeza seguro",
          desenho: {
            legenda: "Tudo macio e com cabo longo. O X marca o que nunca entra no telhado.",
            primitivas: [
              { t: "linha", de: [40, 150], ate: [120, 40], cor: "tinta" },
              { t: "retangulo", p: [110, 32], w: 30, h: 12, cor: "suave" },
              { t: "rotulo", p: [36, 168], texto: "rodo macio + cabo telescopico" },
              { t: "circulo", c: [200, 60], r: 16, hachura: true },
              { t: "rotulo", p: [182, 92], texto: "escova microfibra" },
              { t: "retangulo", p: [240, 120], w: 40, h: 40, cor: "suave" },
              { t: "rotulo", p: [236, 172], texto: "agua limpa" },
              { t: "circulo", c: [60, 70], r: 14, cor: "destaque" },
              { t: "linha", de: [50, 60], ate: [70, 80], cor: "destaque" },
              { t: "linha", de: [70, 60], ate: [50, 80], cor: "destaque" },
              { t: "rotulo", p: [30, 100], texto: "metal/palha de aco: NAO" },
            ],
          },
        },
        { tipo: "video", titulo: "Limpeza de usinas com escovas giratorias (equipamento profissional)", youtube: "hVyy0bWLi1o" },
      ],
    },
    {
      id: "quimica-proibida",
      titulo: "Quimica: o que NUNCA usar",
      blocos: [
        { tipo: "texto", texto: "A lista de proibidos existe para proteger o revestimento antirreflexo e as vedacoes: nada de detergente domestico comum em excesso (deixa filme que atrai sujeira), nada de solventes (alcool em alta concentracao, thinner, acetona), nada de produtos acidos ou alcalinos fortes, nada de abrasivos em po. Em caso de mancha dificil, use agua + sabao neutro bem diluido, enxague bem, e sempre confira a compatibilidade na ficha tecnica do fabricante. A regra: o mais neutro possivel, a menor quantidade possivel." },
        { tipo: "diagrama", titulo: "Permitido x proibido", codigo: `flowchart LR
  subgraph OK["Pode"]
    A["Agua (de preferencia desmineralizada)"]
    B["Sabao neutro bem diluido"]
    C["Escova macia / microfibra / rodo"]
  end
  subgraph NAO["Nunca"]
    D["Espatula / palha de aco / lado verde"]
    E["Solvente, acido, alcalino forte"]
    F["Alta pressao acima do limite"]
  end` },
        {
          tipo: "licao",
          pergunta: "Qual produto e aceitavel para uma mancha dificil no vidro?",
          alternativas: [
            "Thinner puro com pano",
            "Sabao neutro bem diluido em agua, com enxague",
            "Po de limpeza abrasivo",
          ],
          correta: 1,
          explicacao: "Sabao neutro bem diluido e enxague preserva o revestimento. Solventes e abrasivos atacam a camada antirreflexo e as vedacoes.",
        },
      ],
    },
    {
      id: "procedimento",
      titulo: "Procedimento de limpeza, passo a passo",
      blocos: [
        { tipo: "texto", texto: "Com causa diagnosticada (era mesmo sujidade), modulo frio e kit certo, o procedimento e suave e ordenado. A sequencia abaixo vale para quem pode limpar do solo ou de passarela segura. Se exige subir no telhado ou mexer em string energizada, pule para as paginas de seguranca e mobilize profissional." },
        { tipo: "diagrama", titulo: "Sequencia segura de limpeza", codigo: `flowchart TD
  A["Modulo frio: manha, tarde ou dia nublado"] --> B["Molhar e deixar amolecer a sujeira"]
  B --> C["Remover sem forca: escova macia / rodo"]
  C --> D["Enxaguar com agua de baixo residuo"]
  D --> E["Deixar secar sozinho (sem esfregar seco)"]
  E --> F["Conferir geracao depois: medir o ganho"]` },
        {
          tipo: "tarefas",
          itens: [
            { id: "checklist-limpeza", titulo: "Monte seu checklist de limpeza", entrega: "Escreva os passos adaptados ao seu telhado, marcando onde comeca o risco de altura (e portanto onde entra profissional)." },
            { id: "medir-ganho", titulo: "Meca o ganho", entrega: "Compare a geracao de um dia de sol antes e depois da limpeza. Registre o percentual recuperado - e seu retorno real da limpeza." },
          ],
        },
      ],
    },
    // ===================== EXECUCAO / SEGURANCA =====================
    {
      id: "altura",
      titulo: "Trabalho em altura: nao e opcional",
      blocos: [
        { tipo: "texto", texto: "A maioria dos acidentes com limpeza de placas nao e eletrica: e queda. No Brasil, trabalho acima de 2 metros com risco de queda e regido pela NR-35 (Trabalho em Altura): exige analise de risco, cinto de seguranca tipo paraquedista com ponto de ancoragem, capacitacao e, em telhados frageis, medidas contra queda por ruptura. Telhado molhado e escorregadio fica ainda pior. Nenhuma economia de energia paga uma queda." },
        {
          tipo: "mobilizacao",
          papel: "Equipe de limpeza/manutencao habilitada em trabalho em altura (NR-35)",
          porque: "Limpeza em telhado acima de 2 m com risco de queda exige capacitacao NR-35, ancoragem e EPI adequados. Fazer sozinho e sem protecao e a principal causa de acidente grave nesse servico.",
          entregaEsperada: "Limpeza executada com plano de trabalho em altura, ancoragem e EPI conforme NR-35, e registro fotografico do antes/depois e da geracao recuperada.",
          gerenciadoPor: "zaeon",
        },
        {
          tipo: "fontes",
          titulo: "Fontes: trabalho em altura",
          itens: [
            { titulo: "Cartilha de Trabalho em Altura (MTE / gov.br)", url: "https://www.gov.br/trabalho-e-emprego/pt-br/assuntos/inspecao-do-trabalho/manuais-e-publicacoes/cartilha_trabalho_em_altura.pdf", tipo: "norma", nota: "NR-35 aplica-se acima de 2,0 m com risco de queda." },
            { titulo: "Seguranca em sistemas fotovoltaicos - NT 44/2025 (CBM-GO)", url: "https://www.bombeiros.go.gov.br/wp-content/uploads/2025/02/NT-44-2025_-_Seguranca_em_sistemas_fotovoltaicos.pdf", tipo: "norma" },
          ],
        },
      ],
    },
    {
      id: "risco-eletrico",
      titulo: "Risco eletrico: o sol nao tem botao de desligar",
      blocos: [
        { tipo: "texto", texto: "O lado CC de um sistema fotovoltaico e perigoso de um jeito traicoeiro: enquanto houver luz, os modulos geram tensao - nao da para 'desligar o sol'. Uma string pode ter centenas de volts em corrente continua, que nao cruza zero e por isso mantem arco eletrico com facilidade. Mexer em conectores, caixa de juncao, diodos ou qualquer parte energizada e servico de profissional habilitado, sob a NR-10 (seguranca em instalacoes e servicos em eletricidade) e os procedimentos de projeto da NBR 16690." },
        { tipo: "texto", texto: "Para o leigo, a regra e simples: limpeza do VIDRO, do lado de fora, com o modulo intacto, e aceitavel com os cuidados ja vistos. Qualquer coisa que envolva abrir, desconectar, medir energizado ou reparar e para eletricista/engenheiro habilitado - inclusive porque a NBR 16690 exige dispositivos como a seccionadora CC, que precisam ser operados corretamente." },
        {
          tipo: "mobilizacao",
          papel: "Eletricista/engenheiro eletricista habilitado (NR-10) para o lado CC",
          porque: "Strings fotovoltaicas permanecem energizadas sob luz, com tensao CC alta e risco de arco. Inspecao com curva I-V, manuseio de conectores, caixa de juncao e diodos exigem habilitacao NR-10 e seguem a NBR 16690/16274.",
          entregaEsperada: "Laudo de inspecao (visual, termografico e, se preciso, curva I-V) com a causa da perda identificada e a recomendacao tecnica, executado por profissional habilitado.",
          gerenciadoPor: "zaeon",
        },
      ],
    },
    {
      id: "horario-termico",
      titulo: "Horario, clima e choque termico",
      blocos: [
        { tipo: "texto", texto: "Juntando seguranca e tecnica: o melhor horario para qualquer intervencao e com o modulo frio e a irradiancia baixa - comeco da manha ou fim de tarde. Isso reduz choque termico (agua fria x vidro quente), diminui a tensao e a corrente no circuito e deixa o telhado menos quente para quem trabalha. Dia nublado e otimo para limpar; dia de vento forte ou telhado molhado, nao suba." },
        {
          tipo: "prancha",
          titulo: "Janela boa do dia",
          desenho: {
            legenda: "Sol ao meio-dia = vidro quente e tensao alta. Manha/tarde = janela segura para intervir.",
            primitivas: [
              { t: "curva", pts: [[30, 150], [90, 90], [150, 50], [210, 90], [280, 150]], cor: "tinta" },
              { t: "rotulo", p: [128, 40], texto: "pico de sol" },
              { t: "circulo", c: [70, 118], r: 10, cor: "destaque" },
              { t: "rotulo", p: [40, 170], texto: "manha: OK" },
              { t: "circulo", c: [235, 118], r: 10, cor: "destaque" },
              { t: "rotulo", p: [214, 170], texto: "tarde: OK" },
              { t: "circulo", c: [150, 60], r: 8, cor: "suave" },
              { t: "linha", de: [144, 54], ate: [156, 66], cor: "destaque" },
              { t: "linha", de: [156, 54], ate: [144, 66], cor: "destaque" },
            ],
          },
        },
      ],
    },
    {
      id: "caso-raspagem",
      titulo: "Caso real: o telhado que virou prejuizo",
      blocos: [
        { tipo: "texto", texto: "Historia tipica reportada por instaladores: um proprietario notou manchas brancas de respingo de obra e fezes de passaro ressecadas. Pegou uma espatula de pintor e uma lavadora de alta pressao domestica. Removeu as manchas - e deixou o vidro coberto de microrriscos finos, visiveis contra o sol. Semanas depois, dois modulos apareceram mais quentes na termografia: a alta pressao tinha forcado umidade pela vedacao e a pressao da espatula abriu microtrincas. Resultado: geracao pior que antes e garantia negada por 'mau uso'." },
        { tipo: "texto", texto: "O contraste e a licao do caderno: a mesma sujeira sairia com agua morna para amolecer, escova macia e enxague - custo baixo, risco zero para o vidro. A pressa de 'raspar logo' transformou um problema de 5% de perda (reversivel) em dano permanente de dois modulos. Diagnosticar, escolher o metodo suave e, quando preciso, chamar quem tem NR-35/NR-10 teria saido muito mais barato." },
        {
          tipo: "licao",
          pergunta: "O que o proprietario deveria ter feito com a sujeira ressecada?",
          alternativas: [
            "Exatamente o que fez, so que com mais forca",
            "Amolecer com agua, remover com escova macia e enxaguar - sem alta pressao nem espatula",
            "Deixar como estava para sempre",
          ],
          correta: 1,
          explicacao: "Amolecer e remover suave resolve a sujidade sem arranhar. A alta pressao e a espatula criaram o dano permanente e custaram a garantia.",
        },
      ],
    },
    {
      id: "fontes-execucao",
      titulo: "Fontes do bloco de execucao",
      blocos: [
        { tipo: "texto", texto: "As referencias de limpeza correta, pressao de agua e seguranca que embasam as paginas de projeto e execucao." },
        {
          tipo: "fontes",
          titulo: "Limpeza correta e seguranca",
          itens: [
            { titulo: "Manutencao de paineis solares: como fazer (Repsol)", url: "https://www.repsol.pt/particulares/assessoramento/manutencao-paineis-solares-como-fazer/", tipo: "site" },
            { titulo: "Como deve ser realizada a limpeza dos paineis solares (Canal Solar)", url: "https://canalsolar.com.br/como-deve-ser-realizada-a-limpeza-dos-paineis-solares/", tipo: "artigo", nota: "Risen/ZNShine <= 700 kPa; JA Solar < 690 kPa." },
            { titulo: "Reciclagem de paineis solares (Iberdrola)", url: "https://www.iberdrola.com/quem-somos/nossa-atividade/energia-solar-fotovoltaica/reciclagem-paineis-solares", tipo: "site" },
            { titulo: "Cartilha de Trabalho em Altura (MTE / gov.br)", url: "https://www.gov.br/trabalho-e-emprego/pt-br/assuntos/inspecao-do-trabalho/manuais-e-publicacoes/cartilha_trabalho_em_altura.pdf", tipo: "norma" },
          ],
        },
      ],
    },
    // ===================== RECUPERACAO / MANUTENCAO AVANCADA =====================
    {
      id: "recuperar-pid",
      titulo: "Recuperar rendimento: reversao de PID",
      blocos: [
        { tipo: "texto", texto: "Aqui esta a alternativa que de fato 'recupera rendimento' sem tocar no vidro. Quando o diagnostico aponta PID, existem equipamentos que aplicam uma tensao reversa nos modulos durante a noite (quando nao geram), empurrando os ions de sodio de volta e revertendo parte da degradacao. Em plantas severamente afetadas, a ENGIE Laborelec relatou ganho de cerca de 30% de rendimento com esse tratamento; estudos indicam recuperacao em 15 dias ou menos sob certas condicoes." },
        { tipo: "texto", texto: "A ressalva honesta: a recuperacao costuma ser PARCIAL e nem sempre completa - a resistencia de derivacao (shunt) e o fill factor voltam so em parte, e se o PID avancou demais pode nao haver volta. Por isso detectar cedo importa tanto. E, por envolver tensao reversa e o lado CC energizado, e servico de profissional, nunca improviso." },
        {
          tipo: "mobilizacao",
          papel: "Tecnico/engenheiro de O&M com equipamento de reversao de PID",
          porque: "A aplicacao de tensao reversa controlada exige equipamento especifico e manuseio seguro do lado CC. Feito errado, nao recupera e ainda expoe a arco eletrico.",
          entregaEsperada: "Modulos tratados com reversao de PID, com medicao de curva I-V antes e depois comprovando o rendimento recuperado, e relatorio tecnico.",
          gerenciadoPor: "zaeon",
        },
        {
          tipo: "fontes",
          titulo: "Fontes: reversao de PID",
          itens: [
            { titulo: "Expert Talk: PID in PV modules (EnergyVille)", url: "https://energyville.be/en/news/expert-talk-potential-induced-degradation-photovoltaic-modules", tipo: "artigo", nota: "Reversao noturna por tensao reversa; recuperacao parcial." },
            { titulo: "Potential-Induced Degradation (Kiwa PVEL)", url: "https://www.kiwa.com/pvel/pqp/Pid", tipo: "site" },
          ],
        },
      ],
    },
    {
      id: "reparos",
      titulo: "Reparos que recuperam geracao",
      blocos: [
        { tipo: "texto", texto: "Muita perda 'misteriosa' esta fora do vidro e some com reparo simples - feito por profissional. Conectores MC4 mal crimpados ou oxidados criam resistencia e aquecem (as vezes derretem); um diodo de bypass queimado na caixa de juncao derruba um terco do modulo; uma solda fria interna aparece como fill factor baixo na curva I-V. Trocar um conector, um diodo ou uma string problematica costuma recuperar mais energia, com menos risco, do que qualquer limpeza." },
        { tipo: "diagrama", titulo: "Onde o reparo recupera energia", codigo: `flowchart TD
  A["Perda localizada"] --> B["Conector MC4 oxidado -> trocar"]
  A --> C["Diodo de bypass queimado -> substituir"]
  A --> D["Solda fria / resistencia serie -> avaliar modulo"]
  A --> E["String inteira fora -> fusivel / cabeamento"]
  B --> F["Geracao recuperada sem tocar no vidro"]
  C --> F
  D --> F
  E --> F` },
        {
          tipo: "mobilizacao",
          papel: "Tecnico eletricista habilitado para reparo de conectores, diodos e caixa de juncao",
          porque: "Esses reparos sao no lado CC energizado sob luz e envolvem componentes especificos (MC4, diodos de bypass). Exigem habilitacao NR-10 e ferramenta de crimpagem correta.",
          entregaEsperada: "Componentes defeituosos substituidos e geracao conferida por medicao, com registro do antes/depois.",
          gerenciadoPor: "zaeon",
        },
      ],
    },
    {
      id: "repotenciacao",
      titulo: "Repotenciacao: devolver a potencia original",
      blocos: [
        { tipo: "texto", texto: "Quando a degradacao e real e espalhada (sistema antigo, modulos no fim da curva de garantia), a alternativa de engenharia nao e raspar nem remendar: e repotenciar. Repotenciacao (repowering) e trocar modulos antigos por novos, mais eficientes, ou acrescentar modulos para recuperar - ou superar - a potencia original. A ABSOLAR aponta isso como caminho para sistemas que perderam capacidade. Exige reprojeto: compatibilidade de tensao/corrente com o inversor, estrutura, cabeamento e, as vezes, troca do proprio inversor." },
        { tipo: "texto", texto: "Repotenciar nao e 'comprar placa e parafusar'. Misturar modulos de potencias diferentes na mesma string gera mismatch (a string anda na pior celula) e pode criar hot spot. Por isso e projeto de engenheiro: define o arranjo, o ponto de operacao e o aproveitamento do que ainda e bom. Bem feito, um sistema volta a gerar como novo - sem nunca ter encostado uma espatula no vidro." },
        {
          tipo: "mobilizacao",
          papel: "Engenheiro(a) responsavel pelo projeto de repotenciacao",
          porque: "Trocar ou adicionar modulos muda tensao, corrente e compatibilidade com o inversor e a estrutura. Sem reprojeto ha risco de mismatch, hot spot e sobrecarga - e de perder a ART/garantia.",
          entregaEsperada: "Projeto de repotenciacao com ART, arranjo definido, compatibilidade com inversor/estrutura e estimativa de geracao recuperada.",
          gerenciadoPor: "zaeon",
        },
      ],
    },
    {
      id: "reciclagem",
      titulo: "Fim de vida: reciclar, nao raspar",
      blocos: [
        { tipo: "texto", texto: "Quando o modulo realmente chega ao fim (dano irreversivel, degradacao severa), a alternativa certa nao e tentar 'salvar' um vidro arruinado - e reciclar. Vidro e aluminio somam cerca de 90% da massa de um modulo e sao altamente recuperaveis (o vidro em ate ~95%); ha ainda prata, cobre e silicio de valor. Estima-se que o Brasil possa gerar da ordem de 750 mil toneladas de residuos fotovoltaicos ate 2050. Um estudo da Scatec citado pelo setor estimou retorno de cerca de R$3,18 para cada R$1 investido em reciclagem no pais." },
        { tipo: "texto", texto: "No Brasil ainda nao ha norma especifica para descarte de modulos; eles costumam ser enquadrados como residuo eletronico sob a Politica Nacional de Residuos Solidos (Lei 12.305/2010), que institui a logistica reversa. Na pratica, poucos sao reciclados hoje - mas e para la que o setor caminha, inclusive por economia circular. Moral: raspar um modulo morto e inutil; encaminhar para reciclagem recupera material e evita passivo ambiental." },
        { tipo: "video", titulo: "Reciclagem de paineis solares: como e feita?", youtube: "1m33Qje0MQ8" },
        {
          tipo: "mobilizacao",
          papel: "Empresa de logistica reversa / reciclagem de modulos fotovoltaicos",
          porque: "Modulos no fim de vida sao residuo com vidro laminado, metais e tracos de materiais que exigem destinacao correta sob a Lei 12.305/2010. Descarte comum e ilegal e perde material recuperavel.",
          entregaEsperada: "Modulos encaminhados a reciclador licenciado, com comprovante de destinacao (logistica reversa) e, quando aplicavel, recuperacao de vidro, aluminio e metais.",
          gerenciadoPor: "zaeon",
        },
        {
          tipo: "fontes",
          titulo: "Fontes: fim de vida e reciclagem",
          itens: [
            { titulo: "Reciclagem de painel solar: como e feita? (eCycle)", url: "https://www.ecycle.com.br/reciclagem-de-painel-solar/", tipo: "artigo" },
            { titulo: "O destino dos paineis solares ao fim da vida util (Pesquisa FAPESP)", url: "https://revistapesquisa.fapesp.br/o-destino-dos-paineis-solares-ao-fim-da-vida-util/", tipo: "artigo" },
            { titulo: "Reciclagem de paineis: retorno financeiro (Canal Solar)", url: "https://canalsolar.com.br/reciclagem-paineis-solares-retorno-financeiro/", tipo: "artigo", nota: "Estudo Scatec: ~R$3,18 por R$1 investido." },
            { titulo: "Lei 12.305/2010 - Politica Nacional de Residuos Solidos (Planalto)", url: "https://www.planalto.gov.br/ccivil_03/_ato2007-2010/2010/lei/l12305.htm", tipo: "norma" },
          ],
        },
      ],
    },
    // ===================== CASOS / RECURSOS =====================
    {
      id: "caso-usina",
      titulo: "Caso real: O&M de usina e o soiling que volta",
      blocos: [
        { tipo: "texto", texto: "Em usinas, a limpeza vira operacao industrial com conta fechada. Operadores medem o soiling com estacoes dedicadas e so acionam a limpeza quando a perda acumulada paga o servico. Em regioes aridas usam robos com escova macia (muitos sem agua, a seco controlado) ou tratores com escova giratoria - sempre materiais macios, nunca abrasivos, exatamente pelo mesmo motivo do telhado de casa: proteger vidro e revestimento. Um estudo do PI Berlin alertou que ate o estresse do proprio procedimento de limpeza pode afetar o desempenho ao longo da vida - ou seja, limpar e necessario, mas limpar errado cobra caro em qualquer escala." },
        { tipo: "video", titulo: "Limpador de placas solares automatico (prototipo)", youtube: "lY8LrQXktdo" },
        {
          tipo: "licao",
          pergunta: "Por que usinas em deserto preferem robos com escova macia e pouca/nenhuma agua?",
          alternativas: [
            "Para arranhar o vidro e 'renovar' a superficie",
            "Para remover poeira protegendo o revestimento e economizando agua escassa",
            "Porque agua aumenta a sujeira",
          ],
          correta: 1,
          explicacao: "Em deserto a agua e cara e a poeira constante. Escova macia a seco remove o po sem abrasao e sem gastar agua - o mesmo principio de 'nada abrasivo' do telhado residencial.",
        },
      ],
    },
    {
      id: "plano-om",
      titulo: "Monte seu plano de O&M",
      blocos: [
        { tipo: "texto", texto: "Hora de transformar o caderno em rotina. Um bom plano de Operacao e Manutencao (O&M) para o seu sistema cabe em uma pagina: como voce monitora a geracao, como diagnostica uma queda, quando e como limpa (com o metodo suave), e quando aciona profissional (altura, lado CC, PID, reparo, repotenciacao). Com isso, voce nunca mais sobe no telhado 'no impulso' com uma espatula na mao." },
        {
          tipo: "tarefas",
          itens: [
            { id: "plano-monitor", titulo: "Defina seu monitoramento", entrega: "Escreva como vai acompanhar a geracao (app do inversor, leitura mensal) e qual queda percentual dispara uma investigacao." },
            { id: "plano-arvore", titulo: "Cole sua arvore de diagnostico", entrega: "Adapte a arvore de decisao do caderno ao seu sistema: o que voce checa sozinho e onde chama profissional (NR-35/NR-10)." },
            { id: "plano-limpeza", titulo: "Protocolo de limpeza", entrega: "Registre frequencia estimada, metodo suave, horario seguro e os produtos permitidos pelo manual do seu modulo." },
          ],
        },
        {
          tipo: "licao",
          pergunta: "Qual item NAO pertence a um plano de O&M responsavel?",
          alternativas: [
            "Monitorar a geracao e investigar quedas",
            "Ter um protocolo de limpeza suave com produtos do manual",
            "Raspar o vidro com espatula sempre que parecer sujo",
          ],
          correta: 2,
          explicacao: "Raspar com espatula contraria todo o caderno: arranha o vidro, arrisca trincas e cancela garantia. O plano e monitorar, diagnosticar, limpar suave e mobilizar profissional quando preciso.",
        },
      ],
    },
    {
      id: "biblioteca-fontes",
      titulo: "Biblioteca de fontes",
      blocos: [
        { tipo: "texto", texto: "Todas as fontes primarias e de referencia do caderno, reunidas para consulta. Normas, orgaos oficiais, artigos tecnicos, estudos academicos e materiais de fabricantes - cada numero e tecnica deste caderno tem lastro aqui." },
        {
          tipo: "fontes",
          titulo: "Normas e orgaos oficiais",
          itens: [
            { titulo: "Lei 12.305/2010 - Politica Nacional de Residuos Solidos (Planalto)", url: "https://www.planalto.gov.br/ccivil_03/_ato2007-2010/2010/lei/l12305.htm", tipo: "norma" },
            { titulo: "Cartilha de Trabalho em Altura - NR-35 (MTE / gov.br)", url: "https://www.gov.br/trabalho-e-emprego/pt-br/assuntos/inspecao-do-trabalho/manuais-e-publicacoes/cartilha_trabalho_em_altura.pdf", tipo: "norma" },
            { titulo: "Seguranca em sistemas fotovoltaicos - NT 44/2025 (CBM-GO)", url: "https://www.bombeiros.go.gov.br/wp-content/uploads/2025/02/NT-44-2025_-_Seguranca_em_sistemas_fotovoltaicos.pdf", tipo: "norma" },
            { titulo: "ANEEL - Agencia Nacional de Energia Eletrica (geracao distribuida)", url: "https://www.gov.br/aneel/pt-br", tipo: "site" },
            { titulo: "ABSOLAR - Associacao Brasileira de Energia Solar Fotovoltaica", url: "https://www.absolar.org.br/", tipo: "site", nota: "Repotenciacao de sistemas." },
          ],
        },
        {
          tipo: "fontes",
          titulo: "Artigos, estudos e datasets",
          itens: [
            { titulo: "Soiling losses (IEA-PVPS)", url: "https://iea-pvps.org/key-topics/soiling-losses/", tipo: "dataset", nota: "4% a 7% das perdas globais de energia FV." },
            { titulo: "Impacto da sujidade na geracao - estudo IFB", url: "https://repositorio.ifb.edu.br/bitstreams/ea23560a-7a75-466b-8b4d-3379e630c3be/download", tipo: "artigo" },
            { titulo: "Dealing in practice with hot-spots (arXiv)", url: "https://arxiv.org/pdf/1411.0621", tipo: "artigo" },
            { titulo: "Electroluminescence inspection: hidden side of a PV module (PV-Tech)", url: "https://www.pv-tech.org/wp-content/uploads/legacy-publication-pdfs/f35fb94535-electroluminescence-inspection-revisiting-the-hidden-side-of-a-pv-module.pdf", tipo: "artigo" },
            { titulo: "Revestimentos antiaderentes na eficiencia de paineis FV (tese, Univ. Coimbra)", url: "https://estudogeral.uc.pt/handle/10316/98235", tipo: "artigo" },
            { titulo: "Entendendo o tracador de curva I-V (Canal Solar)", url: "https://canalsolar.com.br/entendendo-o-tracador-de-curva-i-v-para-comissionamento-de-sistemas-fv-2/", tipo: "artigo" },
          ],
        },
      ],
    },
    // ===================== SINTESE =====================
    {
      id: "compilado",
      titulo: "Prancha de sintese",
      blocos: [
        { tipo: "texto", texto: "Arraste os cards pelo carimbo para montar sua jornada - da tentacao de raspar ao plano de O&M. O fio e sempre o mesmo: medir, diagnosticar a causa, agir com o metodo certo e mobilizar profissional onde ha risco de altura, risco eletrico, PID, reparo ou repotenciacao. Raspar o vidro quase nunca entra - e, quando o modulo morre, o destino e reciclar, nao esfregar. Abaixo da prancha, suas anotacoes e medicoes aparecem na ordem das paginas, prontas para virar o plano de manutencao do seu sistema." },
        { tipo: "compilado" },
      ],
    },
  ],
};
