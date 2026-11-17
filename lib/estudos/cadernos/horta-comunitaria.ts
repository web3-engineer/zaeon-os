import type { CadernoEstudo } from "../cadernosEstudo";

/**
 * Caderno de campo: Planejamento de uma horta comunitária com irrigação por gotejamento.
 * Conteúdo com lastro: FAO Irrigation and Drainage Papers 56 (evapotranspiração), 29 (qualidade
 * da água) e Training Manual 5 (métodos de irrigação); Embrapa Hortaliças (controle da irrigação
 * e sensor Irrigas); normas ABNT NBR 5410 e NBR 15527; IEC 60529 (IP); Portaria GM/MS 888/2021;
 * datasets INMET e Zenodo; American Community Gardening Association; e vídeos reais verificados.
 * As etapas que exigem profissional habilitado viram blocos de mobilização gerenciados pela Zaeon.
 */
export const caderno: CadernoEstudo = {
  id: "horta-comunitaria",
  titulo: "Horta comunitária com irrigação por gotejamento",
  resumo:
    "Da leitura do terreno à rega do dia a dia: como um grupo projeta, calcula, instala e cuida de uma horta coletiva que economiza água com gotejamento, sempre com fonte, norma e o profissional certo na hora certa.",
  paginas: [
    // ===================== CAPÍTULO 1 — CONTEXTO E VISÃO =====================
    {
      id: "abertura",
      titulo: "Como usar este caderno de campo",
      blocos: [
        { tipo: "texto", texto: "Este caderno acompanha um grupo que quer montar uma horta comunitária regada por gotejamento. Cada página traz leitura curta, um desenho ou diagrama, tarefas práticas e a fonte que sustenta a afirmação. Nada aqui é palpite: quando um número aparece, ele vem de norma, manual técnico ou dataset citado na própria página." },
        { tipo: "texto", texto: "A regra do caderno é simples: antes de decidir, meça; antes de instalar, calcule. E onde a lei ou a segurança exigem um profissional habilitado, a página mostra um campo de mobilização que abre a vaga no Escritório e acompanha até ficar pronto. Você vai ler, desenhar, medir e anotar; o profissional assina o que precisa de assinatura." },
        { tipo: "diagrama", titulo: "O percurso do caderno", codigo: `flowchart TD
  A["Contexto e grupo"] --> B["Ler o local e a água"]
  B --> C["Como o gotejamento funciona"]
  C --> D["Calcular lâmina, vazão e tempo"]
  D --> E["Projetar o sistema"]
  E --> F["Executar e testar"]
  F --> G["Operar e manter"]
  G --> H["Casos reais e governança"]
  H --> I["Recursos e síntese"]` },
      ],
    },
    {
      id: "o-que-e-horta-comunitaria",
      titulo: "O que é uma horta comunitária",
      blocos: [
        { tipo: "texto", texto: "Uma horta comunitária é um pedaço de terra cultivado coletivamente por um grupo de vizinhos, escola, igreja ou associação. A American Community Gardening Association descreve hortas que vão de canteiros individuais alugados a plantios totalmente coletivos, sempre com decisão local sobre o que plantar, quem rega e como se divide a colheita." },
        { tipo: "texto", texto: "Para a engenharia da água isso muda tudo. Em vez de cada pessoa regar seu vaso com mangueira, a horta tem uma infraestrutura comum: fonte de água, cabeçal de controle e uma rede de gotejamento que atende todos os canteiros. É mais barato por canteiro e gasta muito menos água, mas exige acordo de uso e manutenção combinada." },
        {
          tipo: "prancha",
          titulo: "A horta e suas partes",
          desenho: {
            legenda: "Esquema conceitual: a fonte de água alimenta o cabeçal, que distribui para os canteiros por linhas de gotejamento.",
            primitivas: [
              { t: "retangulo", p: [12, 14], w: 280, h: 170, cor: "tinta" },
              { t: "retangulo", p: [26, 30], w: 44, h: 26, cor: "destaque" },
              { t: "rotulo", p: [26, 26], texto: "Água" },
              { t: "retangulo", p: [92, 30], w: 44, h: 26, hachura: true },
              { t: "rotulo", p: [92, 26], texto: "Cabeçal" },
              { t: "seta", de: [70, 43], ate: [92, 43], cor: "suave" },
              { t: "linha", de: [114, 56], ate: [114, 150], cor: "tinta" },
              { t: "retangulo", p: [40, 96], w: 60, h: 20 },
              { t: "retangulo", p: [40, 126], w: 60, h: 20 },
              { t: "retangulo", p: [150, 96], w: 60, h: 20 },
              { t: "retangulo", p: [150, 126], w: 60, h: 20 },
              { t: "rotulo", p: [40, 92], texto: "Canteiros" },
              { t: "seta", de: [114, 106], ate: [150, 106], cor: "suave" },
              { t: "seta", de: [114, 136], ate: [150, 136], cor: "suave" },
            ],
          },
        },
      ],
    },
    {
      id: "por-que-gotejamento",
      titulo: "Por que gotejamento, e não mangueira",
      blocos: [
        { tipo: "texto", texto: "O gotejamento entrega água gota a gota, direto na zona das raízes, com baixa pressão. A FAO classifica a irrigação localizada entre os métodos de maior eficiência de aplicação, porque quase não há perda por evaporação do ar nem molhamento das folhas e dos corredores. Em hortaliças, isso significa regar o pé da planta, não o caminho." },
        { tipo: "texto", texto: "Além de economizar água, o gotejamento molha só a faixa do canteiro: nasce menos mato entre as linhas, a folha seca inibe doenças e dá para fazer fertirrigação (adubar junto com a água). O custo é um sistema com filtro e emissores que entopem se a água for suja, por isso a manutenção entra no projeto desde o começo." },
        {
          tipo: "licao",
          pergunta: "Qual é a principal vantagem técnica do gotejamento frente à rega por mangueira ou aspersão?",
          alternativas: [
            "Deixa a horta mais bonita para fotos",
            "Aplica água na zona das raízes com alta eficiência e pouca perda por evaporação",
            "Elimina qualquer necessidade de manutenção",
          ],
          correta: 1,
          explicacao: "A irrigação localizada tem das maiores eficiências de aplicação porque leva a água direto às raízes. A manutenção continua existindo: filtros e emissores precisam de limpeza.",
        },
      ],
    },
    {
      id: "quem-faz-acontecer",
      titulo: "O grupo: quem rega, quem decide",
      blocos: [
        { tipo: "texto", texto: "Horta comunitária que não combina quem rega morre de sede no primeiro feriado. Antes de desenhar canos, desenhe papéis: quem abre e fecha o sistema, quem limpa o filtro, quem registra a leitura do hidrômetro, quem compra reposição. A ACGA recomenda um acordo escrito de horta (regras, taxas, escala) assinado por todos." },
        { tipo: "texto", texto: "Decisões coletivas precisam de um método. A sociocracia por consentimento é uma forma simples: uma proposta avança quando ninguém tem objeção fundamentada, em vez de exigir unanimidade entusiasmada. Serve para decidir rateio da conta de água, horários de rega e investimento em equipamento." },
        { tipo: "video", titulo: "Sociocracy 3.0 - Consent Decision Making Demonstration", youtube: "uJG5f4EBGGQ" },
        { tipo: "tarefas", itens: [
          { id: "papeis-horta", titulo: "Monte o quadro de papéis", entrega: "Liste as tarefas recorrentes da horta (regar, limpar filtro, registrar hidrômetro, repor peças) e, ao lado de cada uma, o nome do responsável e o suplente." },
        ] },
      ],
    },
    {
      id: "video-referencia",
      titulo: "Observe quem já faz",
      blocos: [
        { tipo: "texto", texto: "Antes de projetar, observe uma experiência real de cultivo integrado e de uso consciente de recursos. Ao assistir, procure três coisas: como a água chega até a planta, como o grupo divide o trabalho e qual manutenção aparece. Anote o que mudaria no seu terreno e no seu clima." },
        { tipo: "video", titulo: "Conheça as criações sustentáveis da Ecovila do Ipec", youtube: "nVLFJofvn4E" },
        { tipo: "tarefas", itens: [
          { id: "nota-referencia", titulo: "Registre três decisões do vídeo", entrega: "Liste três soluções mostradas e, ao lado de cada uma, escreva qual recurso local ela aproveita e se caberia na sua horta." },
        ] },
      ],
    },
    {
      id: "fontes-contexto",
      titulo: "Fontes: contexto e organização",
      blocos: [
        { tipo: "texto", texto: "Guarde estes endereços. Eles sustentam as afirmações deste capítulo sobre o que é uma horta comunitária, como organizá-la e por que o gotejamento economiza água." },
        { tipo: "fontes", titulo: "Referências do contexto", itens: [
          { titulo: "American Community Gardening Association — Resources", url: "https://www.communitygarden.org/resources", tipo: "site", nota: "Guias de como começar e manter uma horta comunitária, acordos e governança." },
          { titulo: "FAO — Irrigation Water Management: Irrigation Methods (Training Manual 5)", url: "https://www.fao.org/4/s8684e/s8684e00.htm", tipo: "livro", nota: "Compara superfície, aspersão e gotejamento e orienta a escolha do método." },
          { titulo: "Embrapa Hortaliças — Controle da irrigação de hortaliças", url: "https://www.infoteca.cnptia.embrapa.br/bitstream/doc/939283/1/5ControledaIrrigacaodeHortalicas.pdf", tipo: "livro", nota: "Base nacional sobre manejo de irrigação em hortaliças." },
        ] },
        {
          tipo: "licao",
          pergunta: "Segundo a ACGA, o que costura uma horta comunitária que dura?",
          alternativas: ["Um equipamento caro", "Um acordo escrito com regras, taxas e escala de trabalho", "Plantar sempre a mesma hortaliça"],
          correta: 1,
          explicacao: "A infraestrutura importa, mas o que mantém a horta viva é o acordo coletivo que define quem faz o quê e como se divide custo e colheita.",
        },
      ],
    },

    // ===================== CAPÍTULO 2 — LER O LOCAL E A ÁGUA =====================
    {
      id: "ler-o-terreno",
      titulo: "Ler o terreno: sol, sombra e declive",
      blocos: [
        { tipo: "texto", texto: "A maioria das hortaliças quer pelo menos 6 horas de sol direto. Antes de marcar canteiros, observe o terreno em três horários (manhã, meio-dia, tarde) e anote onde bate sol e onde há sombra de muro, árvore ou prédio. Hortaliça de folha tolera meia-sombra; fruto (tomate, pimentão) exige sol pleno." },
        { tipo: "texto", texto: "O declive manda na água. Um caimento suave ajuda a drenar a chuva, mas declive forte exige canteiros em nível (curvas de nível) para a água do gotejamento não escorrer antes de infiltrar. Meça a inclinação com nível de mangueira ou nível de bolha e uma régua; anote em porcentagem (cm de desnível por metro)." },
        {
          tipo: "prancha",
          titulo: "Leitura de sol e declive",
          desenho: {
            legenda: "Marque a trajetória do sol e o sentido do caimento do terreno antes de posicionar os canteiros.",
            primitivas: [
              { t: "retangulo", p: [14, 20], w: 275, h: 160, cor: "tinta" },
              { t: "curva", pts: [[30, 60], [90, 34], [150, 28], [210, 36], [270, 62]], cor: "destaque" },
              { t: "rotulo", p: [128, 20], texto: "Trajetória do sol" },
              { t: "seta", de: [40, 150], ate: [250, 160], cor: "suave" },
              { t: "rotulo", p: [100, 150], texto: "Caimento da água" },
              { t: "circulo", c: [230, 110], r: 16, hachura: true },
              { t: "rotulo", p: [206, 134], texto: "Sombra" },
            ],
          },
        },
        { tipo: "tarefas", itens: [
          { id: "mapa-sol", titulo: "Mapeie o sol da horta", entrega: "Desenhe a planta do terreno e pinte as áreas de sol pleno, meia-sombra e sombra, com base em observação em três horários do mesmo dia." },
        ] },
      ],
    },
    {
      id: "agua-disponivel",
      titulo: "De onde vem a água",
      blocos: [
        { tipo: "texto", texto: "Gotejamento precisa de água limpa e de pressão mínima. Levante as fontes possíveis: rede pública (com hidrômetro), poço, água de chuva captada ou reúso tratado. Para cada uma, anote três coisas: vazão disponível (quanto sai por hora), pressão (altura de uma caixa ou da rede) e qualidade (limpa, com ferro, salobra)." },
        { tipo: "texto", texto: "A pressão é a chave do custo. Se houver uma caixa d'água elevada, a gravidade pode bastar para gotejadores de baixa pressão, sem bomba. Sem desnível, será preciso bombear. Mida a altura da caixa em relação aos canteiros: cada 10 metros de coluna d'água equivalem a cerca de 1 bar (1 kgf/cm²)." },
        {
          tipo: "diagrama",
          titulo: "Escolher a fonte de água",
          codigo: `flowchart TD
  A["Tem caixa elevada?"] -->|Sim| B["Pressão por gravidade"]
  A -->|Não| C["Precisa de bomba"]
  B --> D["Água limpa?"]
  C --> D
  D -->|Sim| E["Filtro de tela + gotejamento"]
  D -->|Não| F["Decantar/filtrar antes + ensaio"]`,
        },
        { tipo: "tarefas", itens: [
          { id: "ficha-agua", titulo: "Monte a ficha da água", entrega: "Para cada fonte possível, registre vazão (L/h), pressão ou altura da caixa (m) e uma nota sobre a qualidade visível da água." },
        ] },
      ],
    },
    {
      id: "qualidade-da-agua",
      titulo: "A água serve para gotejar?",
      blocos: [
        { tipo: "texto", texto: "Água boa para beber nem sempre é a questão; para gotejamento o que mata o sistema é o entupimento. A FAO (Paper 29) avalia a água de irrigação por salinidade, risco de sódio, toxicidade de íons e risco de obstrução por sólidos, ferro e bicarbonatos. Água com muito ferro ou carbonato precisa de tratamento antes de entrar nos emissores." },
        { tipo: "texto", texto: "Se a horta vai produzir alimento consumido cru, a segurança sanitária da água importa. Afirmar que uma água é segura exige ensaio de laboratório, não inspeção visual. A Portaria GM/MS 888/2021 define os parâmetros de potabilidade usados como referência quando há contato com a parte comestível." },
        { tipo: "mobilizacao", papel: "Laboratório de análise de água (acreditado)", porque: "Dizer que a água serve para irrigar hortaliça consumida crua, e que não vai entupir o gotejamento, exige ensaio físico-químico e microbiológico; estimativa visual não atende norma nem protege a saúde.", entregaEsperada: "Laudo com pH, condutividade elétrica, ferro, dureza (carbonatos), sólidos suspensos e coliformes, comparado aos limites da FAO 29 e da Portaria GM/MS 888/2021.", gerenciadoPor: "zaeon" },
        { tipo: "fontes", titulo: "Qualidade da água", itens: [
          { titulo: "FAO — Water quality for agriculture (Irrigation and Drainage Paper 29 Rev.1)", url: "https://www.fao.org/4/t0234e/t0234e00.htm", tipo: "livro", nota: "Guia clássico de aptidão da água para irrigação: salinidade, sódio, toxicidade e obstrução." },
          { titulo: "Portaria GM/MS 888/2021 — potabilidade da água", url: "https://bvsms.saude.gov.br/bvs/saudelegis/gm/2021/prt0888_07_05_2021.html", tipo: "norma", nota: "Padrão de potabilidade usado como referência sanitária." },
        ] },
      ],
    },
    {
      id: "solo-textura",
      titulo: "O solo: textura pelo teste da fita",
      blocos: [
        { tipo: "texto", texto: "A textura do solo decide como a água se espalha embaixo do gotejador. Solo arenoso infiltra rápido e o bulbo molhado fica estreito e profundo; solo argiloso infiltra devagar e o bulbo fica largo e raso. Isso muda o espaçamento dos emissores: em areia, emissores mais próximos; em argila, mais afastados." },
        { tipo: "texto", texto: "Dá para classificar a textura no campo, sem laboratório, com o teste da fita (ribbon test) da FAO: umedeça um punhado de terra e tente formar uma fita entre o polegar e o indicador. Fita curta e quebradiça indica areia; fita longa e flexível indica argila. É um método oficial de campo, bom o bastante para o projeto inicial." },
        {
          tipo: "prancha",
          titulo: "Bulbo molhado por textura",
          desenho: {
            legenda: "Mesmo emissor, solos diferentes: em areia o bulbo é estreito e fundo; em argila é largo e raso.",
            primitivas: [
              { t: "retangulo", p: [20, 24], w: 120, h: 150, cor: "tinta" },
              { t: "rotulo", p: [52, 20], texto: "Areia" },
              { t: "circulo", c: [80, 40], r: 6, cor: "destaque" },
              { t: "curva", pts: [[70, 46], [66, 100], [80, 150], [94, 100], [90, 46]], cor: "suave" },
              { t: "retangulo", p: [165, 24], w: 120, h: 150, cor: "tinta" },
              { t: "rotulo", p: [200, 20], texto: "Argila" },
              { t: "circulo", c: [225, 40], r: 6, cor: "destaque" },
              { t: "curva", pts: [[200, 52], [185, 85], [225, 108], [265, 85], [250, 52]], cor: "suave" },
            ],
          },
        },
        { tipo: "tarefas", itens: [
          { id: "teste-fita", titulo: "Faça o teste da fita", entrega: "Colete terra de três pontos da horta, faça o teste da fita em cada um e anote a classe (arenoso, médio, argiloso) por ponto." },
        ] },
      ],
    },
    {
      id: "solo-cc-pmp",
      titulo: "Quanta água o solo guarda",
      blocos: [
        { tipo: "texto", texto: "O solo é uma esponja com dois limites. Capacidade de campo (CC) é a água que o solo retém depois de drenar o excesso; ponto de murcha permanente (PMP) é o ponto em que a raiz já não consegue puxar água. A faixa entre CC e PMP é a água disponível, e é dela que a planta bebe entre uma rega e outra." },
        { tipo: "texto", texto: "A FAO-56 traz valores de CC, PMP e água disponível por textura, além da fração de depleção p: a parte da água disponível que se pode gastar antes de regar de novo sem estressar a cultura. Para hortaliças, p costuma ficar em torno de 0,3 a 0,5. Regar quando a reserva chega nesse ponto evita tanto o desperdício quanto o estresse." },
        {
          tipo: "diagrama",
          titulo: "A reserva de água no solo",
          codigo: `flowchart LR
  A["Saturação (encharcado)"] --> B["Capacidade de campo (CC)"]
  B --> C["Água disponível para a planta"]
  C --> D["Ponto de depleção p (hora de regar)"]
  D --> E["Ponto de murcha (PMP)"]`,
        },
        { tipo: "fontes", titulo: "Água no solo", itens: [
          { titulo: "FAO — Crop evapotranspiration (Irrigation and Drainage Paper 56, Allen et al., 1998)", url: "https://www.fao.org/4/x0490e/x0490e00.htm", tipo: "livro", nota: "Referência mundial de CC, PMP, água disponível e fração de depleção p." },
          { titulo: "UNL CropWatch — Soil water content and matric potential trigger values", url: "https://cropwatch.unl.edu/2019/SWC-SMP-irrigation-trigger-values/", tipo: "artigo", nota: "Valores de gatilho de rega por tipo de solo, em conteúdo e em tensão." },
        ] },
      ],
    },
    {
      id: "clima-eto",
      titulo: "O clima e a sede da horta",
      blocos: [
        { tipo: "texto", texto: "Quanto a horta bebe por dia depende do clima. A evapotranspiração de referência (ETo) resume sol, temperatura, umidade e vento num único número de milímetros por dia. Em dia quente e seco a ETo sobe; em dia nublado e úmido ela cai. É a ETo que diz quanta água repor." },
        { tipo: "texto", texto: "Dados de clima são públicos. O INMET disponibiliza normais climatológicas e séries por estação, de onde se tira a temperatura, a umidade e a estimativa de ETo da sua região, mês a mês. Monte uma ficha climática: ela será consultada no cálculo da rega de quase todas as páginas seguintes." },
        { tipo: "tarefas", itens: [
          { id: "ficha-clima", titulo: "Monte a ficha climática", entrega: "Baixe a normal climatológica da estação INMET mais próxima e registre, por mês, temperatura média, umidade e uma estimativa de ETo (mm/dia)." },
        ] },
        { tipo: "fontes", titulo: "Dados de clima", itens: [
          { titulo: "INMET — Normais Climatológicas", url: "https://portal.inmet.gov.br/normais", tipo: "dataset", nota: "Médias mensais de temperatura, umidade e chuva por estação." },
          { titulo: "FAO-56 — método de cálculo da ETo (Penman-Monteith)", url: "https://www.fao.org/4/x0490e/x0490e00.htm", tipo: "livro", nota: "Como estimar ETo a partir de dados meteorológicos." },
        ] },
      ],
    },
    {
      id: "canteiros-e-culturas",
      titulo: "Canteiros, culturas e espaçamento",
      blocos: [
        { tipo: "texto", texto: "Antes de dimensionar a rega, defina o que vai plantar e como. Hortaliças de folha (alface, rúcula) ficam em canteiros densos; de fruto (tomate, pimentão) em linhas espaçadas; raízes (cenoura, beterraba) em canteiros de solo solto. Cada grupo tem uma profundidade de raiz e um espaçamento que definem onde o gotejador precisa molhar." },
        { tipo: "texto", texto: "Padronize o canteiro. Um canteiro de 1,0 a 1,2 m de largura permite alcançar o centro dos dois lados sem pisar na terra, o que mantém o solo solto e o bulbo molhado intacto. O comprimento segue o terreno, mas lembre: linha de gotejamento muito longa perde pressão na ponta, então 20 a 30 m por linha é um ponto de partida seguro." },
        {
          tipo: "licao",
          pergunta: "Por que o canteiro costuma ter cerca de 1,0 a 1,2 m de largura?",
          alternativas: [
            "Para caber mais plantas por metro quadrado",
            "Para alcançar o centro dos dois lados sem pisar na terra e compactar o solo",
            "Porque é a largura do rolo de fita gotejadora",
          ],
          correta: 1,
          explicacao: "Pisar no canteiro compacta o solo e deforma o bulbo molhado. A largura é limitada pelo alcance dos braços a partir dos corredores.",
        },
      ],
    },
    {
      id: "fontes-leitura",
      titulo: "Fontes: leitura do local",
      blocos: [
        { tipo: "texto", texto: "Reúna aqui os endereços que sustentam a leitura de solo, clima e água deste capítulo. São métodos de campo oficiais e datasets abertos, de graça." },
        { tipo: "fontes", titulo: "Leitura do local", itens: [
          { titulo: "FAO GSP — Soil texture by the ribbon test (field exercise)", url: "https://www.fao.org/fileadmin/user_upload/GSP/GSDP/Field_exercises/New_format_EN/P01b-Texture-Ribbon-EN.pdf", tipo: "artigo", nota: "Passo a passo oficial do teste da fita para classificar textura em campo." },
          { titulo: "MSU/USDA — Estimating Soil Moisture by Feel and Appearance", url: "https://www.canr.msu.edu/irrigation/uploads/files/FeelSoil.pdf", tipo: "artigo", nota: "Estimar a umidade do solo pelo tato, por classe de textura, sem instrumento." },
          { titulo: "FAO — Irrigation scheduling methods and techniques (Water Report 8)", url: "https://www.fao.org/4/W4367E/w4367e04.htm", tipo: "artigo", nota: "Define a faixa útil entre CC e PMP e o ponto de depleção que aciona a rega." },
        ] },
      ],
    },

    // ===================== CAPÍTULO 3 — COMO O GOTEJAMENTO FUNCIONA =====================
    {
      id: "como-funciona-gotejamento",
      titulo: "O bulbo molhado",
      blocos: [
        { tipo: "texto", texto: "Cada gotejador cria no solo um bulbo molhado: a água desce por gravidade e se espalha para os lados por capilaridade. O formato do bulbo depende da textura (visto antes) e da vazão do emissor. O objetivo do projeto é que os bulbos dos emissores vizinhos se encontrem, formando uma faixa úmida contínua sob a linha de plantio." },
        { tipo: "texto", texto: "Se os emissores ficam longe demais, sobram zonas secas entre eles e as raízes ficam de fora. Se ficam perto demais, gasta-se tubo e água à toa. O espaçamento certo molha a linha inteira sem encharcar: por isso ele vem depois de saber a textura do solo e a cultura." },
        {
          tipo: "prancha",
          titulo: "Bulbos que se encontram",
          desenho: {
            legenda: "Emissores bem espaçados: os bulbos se sobrepõem e formam uma faixa úmida contínua sob a linha.",
            primitivas: [
              { t: "linha", de: [20, 40], ate: [285, 40], cor: "tinta" },
              { t: "circulo", c: [60, 40], r: 5, cor: "destaque" },
              { t: "circulo", c: [130, 40], r: 5, cor: "destaque" },
              { t: "circulo", c: [200, 40], r: 5, cor: "destaque" },
              { t: "circulo", c: [270, 40], r: 5, cor: "destaque" },
              { t: "curva", pts: [[42, 46], [38, 100], [60, 140], [82, 100], [78, 46]], cor: "suave" },
              { t: "curva", pts: [[112, 46], [108, 100], [130, 140], [152, 100], [148, 46]], cor: "suave" },
              { t: "curva", pts: [[182, 46], [178, 100], [200, 140], [222, 100], [218, 46]], cor: "suave" },
              { t: "rotulo", p: [100, 20], texto: "Linha de gotejamento" },
            ],
          },
        },
      ],
    },
    {
      id: "componentes-do-sistema",
      titulo: "As partes de um sistema de gotejamento",
      blocos: [
        { tipo: "texto", texto: "Todo sistema de gotejamento tem a mesma espinha dorsal, da fonte ao emissor. Da água vem para o cabeçal de controle (registro, filtro, manômetro e, se houver, injetor de fertilizante); do cabeçal sai a linha principal; dela saem as linhas de derivação; e nelas se conectam as linhas laterais com os emissores. Entender essa cadeia é entender onde medir pressão e onde a sujeira para." },
        { tipo: "diagrama", titulo: "Da fonte ao emissor", codigo: `flowchart LR
  F["Fonte de água"] --> R["Registro geral"]
  R --> FL["Filtro de tela/disco"]
  FL --> M["Manômetro"]
  M --> LP["Linha principal"]
  LP --> LD["Linhas de derivação"]
  LD --> LL["Linhas laterais"]
  LL --> E["Emissores/gotejadores"]` },
        { tipo: "tarefas", itens: [
          { id: "inventario-partes", titulo: "Liste as partes da sua horta", entrega: "Com base no diagrama, escreva quais componentes você já tem e quais faltam comprar para formar a cadeia completa." },
        ] },
      ],
    },
    {
      id: "tipos-de-emissor",
      titulo: "Tipos de emissor: gotejador, fita e autocompensante",
      blocos: [
        { tipo: "texto", texto: "Há três escolhas comuns. O gotejador pontual (botão ou integrado ao tubo) solta uma vazão fixa, de 1 a 4 litros por hora, e serve para plantas espaçadas como tomate. A fita gotejadora (drip tape) tem saídas a cada 10 a 30 cm e é barata para canteiros densos de folha. Ambos pedem pressão de trabalho baixa, em geral entre 0,5 e 1,5 bar." },
        { tipo: "texto", texto: "O emissor autocompensante (PC) mantém a mesma vazão mesmo com variação de pressão ao longo da linha. Ele custa mais, mas é o que salva linhas longas ou terrenos com declive, onde o emissor comum entregaria muito no começo e pouco na ponta. A escolha equilibra preço, comprimento de linha e desnível." },
        {
          tipo: "licao",
          pergunta: "Quando o emissor autocompensante (PC) compensa o custo maior?",
          alternativas: [
            "Em canteiro curto e plano, onde a pressão quase não varia",
            "Em linha longa ou terreno em declive, onde a pressão varia muito",
            "Sempre, porque é o mais moderno",
          ],
          correta: 1,
          explicacao: "O autocompensante mantém a vazão constante apesar da variação de pressão, exatamente o problema de linhas longas e terrenos inclinados.",
        },
      ],
    },
    {
      id: "uniformidade",
      titulo: "Uniformidade: todos os pés bebem igual",
      blocos: [
        { tipo: "texto", texto: "Um bom sistema rega todos os pés quase igual. Mede-se isso pela uniformidade de emissão: coleta-se a vazão de vários emissores (começo, meio e fim da linha) e compara-se. Projetos de irrigação localizada miram uniformidade alta, acima de 90 por cento; abaixo disso, umas plantas afogam e outras passam sede no mesmo turno." },
        { tipo: "texto", texto: "A uniformidade cai por três motivos: variação de pressão ao longo da linha, variação de fabricação dos emissores e, com o tempo, entupimento parcial. O projeto controla o primeiro (limitando o comprimento da linha), a compra controla o segundo (emissor de qualidade) e a manutenção controla o terceiro (limpeza)." },
        { tipo: "tarefas", itens: [
          { id: "teste-copos", titulo: "Planeje o teste dos copinhos", entrega: "Escreva o protocolo: pegar a vazão de um emissor no início, no meio e no fim de uma linha, por 5 minutos, e comparar os volumes. Guarde para usar na execução." },
        ] },
      ],
    },
    {
      id: "filtragem",
      titulo: "Filtragem: o que entope o gotejador",
      blocos: [
        { tipo: "texto", texto: "O furo de um gotejador é minúsculo, então qualquer sujeira o fecha. Entupimento tem três causas: física (areia, silte, resto de folha), química (carbonato e ferro que precipitam) e biológica (algas e limo). A primeira defesa é o filtro no cabeçal: tela ou disco de malha fina, tipicamente 120 a 150 mesh para gotejamento." },
        { tipo: "texto", texto: "Filtro não é opcional nem eterno. Ele precisa de limpeza periódica, e quanto mais suja a água, mais frequente. Água de poço com ferro ou de açude com algas pede, além do filtro, tratamento químico controlado. Dimensionar e escolher o filtro certo faz parte do projeto, não um detalhe comprado na pressa." },
        { tipo: "fontes", titulo: "Filtragem e obstrução", itens: [
          { titulo: "FAO — Water quality for agriculture (risco de obstrução, Tabela 1)", url: "https://www.fao.org/4/t0234e/t0234e00.htm", tipo: "livro", nota: "Classifica o risco de entupimento por sólidos, ferro, manganês e bactérias." },
          { titulo: "FAO — Irrigation Methods (Training Manual 5), capítulo de gotejamento", url: "https://www.fao.org/4/s8684e/s8684e00.htm", tipo: "livro", nota: "Componentes do sistema localizado, incluindo filtragem e manutenção." },
        ] },
      ],
    },
    {
      id: "pressao-e-vazao",
      titulo: "Pressão e vazão sem susto",
      blocos: [
        { tipo: "texto", texto: "Dois números governam o gotejamento: vazão (quanto de água passa por tempo, em litros por hora) e pressão (a força que empurra a água, em bar ou metros de coluna d'água). Emissor de gotejamento trabalha com pouca pressão: cerca de 1 bar basta, o que equivale a uma caixa d'água 10 metros acima do canteiro." },
        { tipo: "texto", texto: "A vazão total do sistema é a soma das vazões de todos os emissores abertos ao mesmo tempo. Se cada gotejador solta 2 L/h e a horta tem 400 deles ligados juntos, são 800 L/h. Esse número define o tamanho do cano, do filtro e, se houver, da bomba. Por isso o cálculo vem antes da compra." },
        {
          tipo: "prancha",
          titulo: "Pressão por altura de caixa",
          desenho: {
            legenda: "Cada 10 m de altura da caixa d'água em relação ao canteiro equivalem a cerca de 1 bar de pressão.",
            primitivas: [
              { t: "retangulo", p: [30, 24], w: 54, h: 30, cor: "destaque" },
              { t: "rotulo", p: [30, 20], texto: "Caixa" },
              { t: "linha", de: [57, 54], ate: [57, 160], cor: "tinta" },
              { t: "linha", de: [57, 160], ate: [250, 160], cor: "tinta" },
              { t: "seta", de: [100, 60], ate: [100, 158], cor: "suave" },
              { t: "rotulo", p: [104, 100], texto: "Altura = pressão" },
              { t: "retangulo", p: [210, 150], w: 40, h: 12, hachura: true },
              { t: "rotulo", p: [206, 170], texto: "Canteiro" },
            ],
          },
        },
      ],
    },
    {
      id: "video-gotejamento",
      titulo: "Veja o manejo por sensor na prática",
      blocos: [
        { tipo: "texto", texto: "A rega por gotejamento combina muito bem com um sensor de umidade: ele diz quando o solo chegou ao ponto de regar, evitando regar por hábito. Assista observando como o sensor é instalado na zona das raízes e como a leitura vira decisão de ligar ou não a água." },
        { tipo: "video", titulo: "Water Your Garden with IoT - Soil Moisture Sensors", youtube: "pgGpuws7f9o" },
        { tipo: "tarefas", itens: [
          { id: "nota-sensor", titulo: "Anote o ciclo do sensor", entrega: "Descreva em três passos o ciclo que o vídeo mostra: medir a umidade, comparar com o limite e decidir regar." },
        ] },
      ],
    },
    {
      id: "fontes-metodo",
      titulo: "Fontes: fundamentos do gotejamento",
      blocos: [
        { tipo: "texto", texto: "Os endereços abaixo sustentam o funcionamento do gotejamento: bulbo molhado, componentes, emissores, uniformidade e filtragem." },
        { tipo: "fontes", titulo: "Fundamentos do método", itens: [
          { titulo: "FAO — Irrigation Methods (Training Manual 5)", url: "https://www.fao.org/4/s8684e/s8684e00.htm", tipo: "livro", nota: "Capítulos sobre o método localizado, componentes e aplicação." },
          { titulo: "Embrapa Hortaliças — Controle da irrigação de hortaliças", url: "https://www.infoteca.cnptia.embrapa.br/bitstream/doc/939283/1/5ControledaIrrigacaodeHortalicas.pdf", tipo: "livro", nota: "Manejo nacional aplicado a hortaliças, incluindo gotejamento." },
          { titulo: "FAO-56 — balanço de água e reposição até a capacidade de campo", url: "https://www.fao.org/4/x0490e/x0490e00.htm", tipo: "livro", nota: "Como a lâmina aplicada se relaciona com a reserva do solo." },
        ] },
      ],
    },

    // ===================== CAPÍTULO 4 — CALCULAR LÂMINA, VAZÃO E TEMPO =====================
    {
      id: "demanda-hidrica",
      titulo: "Quanta água a cultura pede (ETc)",
      blocos: [
        { tipo: "texto", texto: "A sede de cada cultura sai de uma conta simples da FAO-56: ETc = Kc × ETo. A ETo é a sede do clima (do capítulo anterior); o Kc é o coeficiente da cultura, que varia com o estágio. Alface no início tem Kc baixo (cerca de 0,7); no pico de folhas sobe para perto de 1,0. Multiplicando, sai a água que a planta realmente consome por dia, em milímetros." },
        { tipo: "texto", texto: "Milímetro é litro por metro quadrado: 1 mm de ETc em 1 m² de canteiro são 1 litro por dia. Se o tomate consome 5 mm/dia num canteiro de 10 m², são 50 litros por dia para repor. Essa é a base de tudo: tempo de rega, número de emissores e tamanho da fonte saem daqui." },
        {
          tipo: "diagrama",
          titulo: "A conta da água da cultura",
          codigo: `flowchart LR
  A["ETo (clima, mm/dia)"] --> C["ETc = Kc x ETo"]
  B["Kc (cultura e estágio)"] --> C
  C --> D["Litros/dia = ETc x area do canteiro"]`,
        },
        { tipo: "fontes", titulo: "Demanda hídrica", itens: [
          { titulo: "FAO-56 — coeficientes de cultura Kc (Capítulo 6)", url: "https://www.fao.org/4/x0490e/x0490e00.htm", tipo: "livro", nota: "Tabelas de Kc por cultura e estágio e o cálculo de ETc." },
          { titulo: "Embrapa Hortaliças — Controle da irrigação de hortaliças", url: "https://www.infoteca.cnptia.embrapa.br/bitstream/doc/939283/1/5ControledaIrrigacaodeHortalicas.pdf", tipo: "livro", nota: "Necessidade hídrica aplicada a hortaliças brasileiras." },
        ] },
      ],
    },
    {
      id: "lamina-e-tempo",
      titulo: "Lâmina e tempo de rega",
      blocos: [
        { tipo: "texto", texto: "Saber os litros por dia é metade; a outra metade é por quanto tempo abrir a água. O tempo de rega é a lâmina a repor dividida pela taxa de aplicação do sistema. Como o gotejamento molha só uma faixa do canteiro, trabalha-se com a vazão dos emissores por metro de linha, não com a área toda." },
        { tipo: "texto", texto: "Exemplo: uma fita que aplica 1,5 litro por metro por hora, numa linha que precisa repor 3 litros por metro naquele dia, roda 2 horas. Dividir a rega em turnos curtos (pulsos) ajuda solo arenoso a não perder água por percolação. O número vem da conta, não do relógio no chute." },
        {
          tipo: "licao",
          pergunta: "Como se obtém o tempo de rega de um turno?",
          alternativas: [
            "Pela cor das folhas no fim da tarde",
            "Dividindo a lâmina a repor pela taxa de aplicação do sistema",
            "É sempre 30 minutos para qualquer cultura",
          ],
          correta: 1,
          explicacao: "Tempo de rega é lâmina (o que precisa repor) dividida pela taxa de aplicação (quanto o sistema entrega por hora). Depende da cultura, do clima e do emissor.",
        },
      ],
    },
    {
      id: "emissores-por-planta",
      titulo: "Quantos emissores por planta",
      blocos: [
        { tipo: "texto", texto: "Planta de fruto espaçada (tomate, pimentão, abobrinha) costuma ter um ou dois gotejadores por pé, posicionados junto ao colo. Canteiro denso de folha usa fita com saídas contínuas, de modo que a linha inteira fica úmida. A regra é o bulbo molhado cobrir a zona de raízes efetiva da cultura, nem mais, nem menos." },
        { tipo: "texto", texto: "Para raiz profunda (quiabo, mandioquinha) vale aumentar a vazão por pé ou o tempo de rega, para o bulbo descer mais. Para raiz rasa e densa (alface, cebolinha) vale espaçar menos os emissores, para a faixa úmida ser larga e contínua. Essa decisão fecha o número de emissores do canteiro, insumo do cálculo de vazão total." },
        {
          tipo: "prancha",
          titulo: "Emissores conforme a cultura",
          desenho: {
            legenda: "Fruto espaçado: 1 a 2 gotejadores por pé. Folha densa: fita com saídas contínuas.",
            primitivas: [
              { t: "retangulo", p: [18, 30], w: 120, h: 140, cor: "tinta" },
              { t: "rotulo", p: [44, 24], texto: "Fruto" },
              { t: "circulo", c: [48, 70], r: 10, hachura: true },
              { t: "circulo", c: [48, 70], r: 3, cor: "destaque" },
              { t: "circulo", c: [100, 70], r: 10, hachura: true },
              { t: "circulo", c: [100, 70], r: 3, cor: "destaque" },
              { t: "circulo", c: [48, 130], r: 10, hachura: true },
              { t: "circulo", c: [48, 130], r: 3, cor: "destaque" },
              { t: "retangulo", p: [165, 30], w: 120, h: 140, cor: "tinta" },
              { t: "rotulo", p: [196, 24], texto: "Folha" },
              { t: "linha", de: [175, 70], ate: [275, 70], cor: "destaque" },
              { t: "linha", de: [175, 110], ate: [275, 110], cor: "destaque" },
              { t: "linha", de: [175, 150], ate: [275, 150], cor: "destaque" },
            ],
          },
        },
      ],
    },
    {
      id: "vazao-total",
      titulo: "A vazão total do sistema",
      blocos: [
        { tipo: "texto", texto: "A vazão total é a soma das vazões de todos os emissores que ficam abertos ao mesmo tempo num turno. Esse é o número mais importante do projeto hidráulico: dele dependem o diâmetro dos canos, o tamanho do filtro e a capacidade da fonte ou da bomba. Se a fonte não entrega essa vazão, divide-se a horta em setores que regam em horários diferentes." },
        { tipo: "texto", texto: "Monte uma tabela: para cada canteiro, número de emissores vezes a vazão de cada um. Some os canteiros que regam juntos. Se o total passa da vazão da fonte, você tem duas saídas: reduzir o número de emissores simultâneos (setorizar) ou aumentar a fonte (reservatório, bomba maior). Setorizar quase sempre é mais barato." },
        { tipo: "tarefas", itens: [
          { id: "tabela-vazao", titulo: "Calcule a vazão total", entrega: "Monte a tabela canteiro a canteiro (número de emissores x vazão unitária) e some. Compare com a vazão que sua fonte entrega por hora." },
        ] },
      ],
    },
    {
      id: "perda-de-carga",
      titulo: "Perda de carga: a pressão que o cano come",
      blocos: [
        { tipo: "texto", texto: "A água perde pressão ao atritar com a parede do cano; quanto mais longo e mais fino o cano, e maior a vazão, maior a perda. Essa perda de carga faz o emissor da ponta receber menos pressão (e menos água) que o do começo. O projeto hidráulico existe para manter essa diferença pequena, dentro do que a uniformidade exige." },
        { tipo: "texto", texto: "Engenheiros estimam a perda de carga com fórmulas como Hazen-Williams. Na prática da horta, a regra que resolve a maioria dos casos é: cano mais grosso na linha principal, linhas laterais curtas (20 a 30 m) e, em terreno inclinado, emissor autocompensante. Quando o sistema cresce ou o terreno é difícil, o cálculo preciso é tarefa de profissional." },
        {
          tipo: "diagrama",
          titulo: "Onde a pressão cai",
          codigo: `flowchart LR
  A["Cabeçal (pressão cheia)"] --> B["Linha principal (perda pequena se grossa)"]
  B --> C["Lateral comeco (quase cheia)"]
  C --> D["Lateral meio"]
  D --> E["Lateral ponta (pressão menor)"]`,
        },
      ],
    },
    {
      id: "dimensionar-lateral",
      titulo: "Dimensionar a linha lateral",
      blocos: [
        { tipo: "texto", texto: "A linha lateral é a que tem os emissores. O comprimento máximo dela depende do diâmetro do tubo, da vazão dos emissores, do espaçamento e do desnível. Fabricantes publicam tabelas de comprimento máximo por modelo de fita ou tubo gotejador, para manter a variação de vazão dentro do limite de uniformidade. Comece por essas tabelas." },
        { tipo: "texto", texto: "Regra de bolso para começar: lateral de 16 mm com gotejadores comuns costuma ir bem até 20 a 30 m em terreno plano; com autocompensante, bem mais. Se o canteiro é mais longo, alimente a lateral pelo meio (entrada central), o que divide o comprimento pela metade e salva a uniformidade sem trocar o tubo." },
        {
          tipo: "licao",
          pergunta: "Como ganhar comprimento de canteiro sem perder uniformidade, sem trocar o tubo?",
          alternativas: [
            "Alimentar a lateral pelo meio, dividindo o comprimento efetivo pela metade",
            "Aumentar muito a pressão na entrada",
            "Colocar emissores mais afastados na ponta",
          ],
          correta: 0,
          explicacao: "Entrada central faz a água correr para os dois lados, reduzindo pela metade o comprimento que cada trecho precisa vencer, logo a perda de carga cai.",
        },
      ],
    },
    {
      id: "dimensionar-principal",
      titulo: "Dimensionar a linha principal e o conjunto",
      blocos: [
        { tipo: "texto", texto: "A linha principal leva toda a vazão do turno até as derivações, então é a mais grossa. Subdimensioná-la mata a pressão de todo o sistema; superdimensioná-la joga dinheiro fora. A escolha do diâmetro depende da vazão total, do comprimento e da perda de carga aceitável, e já entra no território do cálculo de engenharia." },
        { tipo: "texto", texto: "Quando a horta passa de alguns canteiros, tem bomba, declive acentuado ou água difícil, o dimensionamento deixa de ser regra de bolso. Um projeto mal calculado desperdiça água, estressa planta e queima bomba. Essa é a hora de mobilizar quem calcula e assume responsabilidade técnica pelo sistema." },
        { tipo: "mobilizacao", papel: "Engenheiro agrônomo ou técnico em irrigação", porque: "Dimensionar linha principal, perda de carga, setorização e conjunto motobomba de forma que o sistema seja uniforme e eficiente exige cálculo hidráulico e responsabilidade técnica; regra de bolso não cobre horta grande, declive ou água difícil.", entregaEsperada: "Projeto de irrigação com memorial de cálculo (vazão, pressão, diâmetros, perda de carga e uniformidade estimada), planta do sistema e lista de materiais, com ART quando aplicável.", gerenciadoPor: "zaeon" },
      ],
    },
    {
      id: "bomba-e-pressurizacao",
      titulo: "Bomba e pressurização",
      blocos: [
        { tipo: "texto", texto: "Sem caixa elevada, a água precisa de bomba. A bomba é escolhida por dois números: a vazão que precisa entregar (a vazão total do turno) e a altura manométrica (a pressão que precisa vencer, somando desnível e perdas de carga). Bomba grande demais gasta energia e estoura emissor; pequena demais não chega à ponta." },
        { tipo: "texto", texto: "Toda bomba elétrica é uma instalação elétrica: precisa de aterramento, disjuntor e proteção contra choque, e perto da água o risco é sério. A ABNT NBR 5410 rege instalações de baixa tensão. Ligar bomba por conta própria, com emenda improvisada, é causa comum de acidente. A parte elétrica é de profissional habilitado." },
        { tipo: "mobilizacao", papel: "Eletricista ou engenheiro eletricista habilitado", porque: "A ligação elétrica da motobomba, próxima da água, exige aterramento, proteção diferencial e disjuntor corretos conforme a NBR 5410; execução improvisada gera risco de choque e incêndio.", entregaEsperada: "Instalação elétrica da bomba conforme NBR 5410 (aterramento, DR, disjuntor e eletroduto estanque), testada e, quando exigido, com ART.", gerenciadoPor: "zaeon" },
        { tipo: "fontes", titulo: "Bomba e eletricidade", itens: [
          { titulo: "ABNT NBR 5410 — Instalações elétricas de baixa tensão", url: "https://www.target.com.br/produtos/normas-tecnicas/28721/nbr5410-instalacoes-eletricas-de-baixa-tensao", tipo: "norma", nota: "Norma brasileira de instalações de baixa tensão: aterramento, proteção e segurança." },
        ] },
      ],
    },
    {
      id: "setorizacao",
      titulo: "Setorização: regar em turnos",
      blocos: [
        { tipo: "texto", texto: "Quando a fonte não dá vazão para regar a horta inteira de uma vez, divide-se em setores que regam em horários diferentes. Cada setor é um grupo de canteiros com um registro próprio. Um temporizador ou a própria escala do grupo abre um setor de cada vez, encaixando a vazão disponível. Setorizar é mais barato que trocar a fonte." },
        { tipo: "texto", texto: "A regra: a soma da vazão dos emissores de um setor deve caber na vazão da fonte, com folga. Agrupe canteiros com necessidade parecida (mesma cultura, mesmo estágio) no mesmo setor, assim o tempo de rega vale para todos. Isso também facilita o manejo: cada setor tem seu horário e seu responsável." },
        {
          tipo: "prancha",
          titulo: "Dois setores, um registro cada",
          desenho: {
            legenda: "A fonte alimenta o cabeçal; dois setores com registros próprios regam em horários diferentes.",
            primitivas: [
              { t: "retangulo", p: [120, 18], w: 60, h: 24, hachura: true },
              { t: "rotulo", p: [122, 14], texto: "Cabeçal" },
              { t: "linha", de: [150, 42], ate: [150, 70], cor: "tinta" },
              { t: "linha", de: [60, 70], ate: [240, 70], cor: "tinta" },
              { t: "circulo", c: [60, 70], r: 6, cor: "destaque" },
              { t: "circulo", c: [240, 70], r: 6, cor: "destaque" },
              { t: "rotulo", p: [36, 60], texto: "Reg. 1" },
              { t: "rotulo", p: [220, 60], texto: "Reg. 2" },
              { t: "retangulo", p: [30, 100], w: 70, h: 60, cor: "tinta" },
              { t: "rotulo", p: [40, 125], texto: "Setor A" },
              { t: "retangulo", p: [200, 100], w: 70, h: 60, cor: "tinta" },
              { t: "rotulo", p: [210, 125], texto: "Setor B" },
              { t: "linha", de: [60, 70], ate: [60, 100], cor: "suave" },
              { t: "linha", de: [240, 70], ate: [240, 100], cor: "suave" },
            ],
          },
        },
      ],
    },
    {
      id: "fontes-calculo",
      titulo: "Fontes: cálculo e dimensionamento",
      blocos: [
        { tipo: "texto", texto: "Os endereços abaixo sustentam as contas deste capítulo: ETc, lâmina, uniformidade e hidráulica do gotejamento." },
        { tipo: "fontes", titulo: "Cálculo do sistema", itens: [
          { titulo: "FAO-56 — Crop evapotranspiration (Allen et al., 1998)", url: "https://www.fao.org/4/x0490e/x0490e00.htm", tipo: "livro", nota: "ETo, Kc, ETc, lâmina e balanço de água no solo." },
          { titulo: "FAO — Irrigation scheduling (Water Report 8)", url: "https://www.fao.org/4/W4367E/w4367e04.htm", tipo: "artigo", nota: "Métodos e limites do agendamento da rega." },
          { titulo: "FAO — Irrigation Methods (Training Manual 5)", url: "https://www.fao.org/4/s8684e/s8684e00.htm", tipo: "livro", nota: "Vazão, pressão e componentes do método localizado." },
        ] },
      ],
    },

    // ===================== CAPÍTULO 5 — PROJETAR O SISTEMA =====================
    {
      id: "croqui-do-sistema",
      titulo: "O croqui do sistema",
      blocos: [
        { tipo: "texto", texto: "Projetar é desenhar antes de comprar. Faça um croqui em escala com: posição da fonte e do cabeçal, traçado da linha principal, derivações, canteiros, linhas laterais e registros de setor. É esse desenho que vira lista de materiais e evita descobrir no meio da obra que faltou tubo ou que o registro ficou longe demais." },
        { tipo: "texto", texto: "Marque no croqui o sentido do caimento do terreno e o Norte (para o sol), porque os dois já apareceram na leitura do local e condicionam o traçado. Anote ao lado de cada trecho a vazão que ele carrega: isso mostra onde o cano precisa ser mais grosso e onde pode afinar." },
        {
          tipo: "prancha",
          titulo: "Croqui do sistema completo",
          desenho: {
            legenda: "Fonte, cabeçal, linha principal, derivações e canteiros com laterais. Setas indicam o fluxo.",
            primitivas: [
              { t: "retangulo", p: [16, 24], w: 40, h: 24, cor: "destaque" },
              { t: "rotulo", p: [16, 20], texto: "Fonte" },
              { t: "retangulo", p: [70, 24], w: 40, h: 24, hachura: true },
              { t: "rotulo", p: [70, 20], texto: "Cabeçal" },
              { t: "seta", de: [56, 36], ate: [70, 36], cor: "suave" },
              { t: "linha", de: [90, 48], ate: [90, 165], cor: "tinta" },
              { t: "rotulo", p: [60, 150], texto: "Principal" },
              { t: "linha", de: [90, 70], ate: [270, 70], cor: "tinta" },
              { t: "linha", de: [90, 120], ate: [270, 120], cor: "tinta" },
              { t: "retangulo", p: [140, 58], w: 120, h: 18 },
              { t: "retangulo", p: [140, 108], w: 120, h: 18 },
              { t: "rotulo", p: [150, 92], texto: "Canteiros" },
              { t: "seta", de: [90, 70], ate: [140, 67], cor: "suave" },
              { t: "seta", de: [90, 120], ate: [140, 117], cor: "suave" },
            ],
          },
        },
      ],
    },
    {
      id: "layout-canteiros",
      titulo: "Layout dos canteiros e corredores",
      blocos: [
        { tipo: "texto", texto: "O desenho dos canteiros equilibra produção e circulação. Canteiros padronizados (largura e comprimento) facilitam comprar fita no tamanho certo e girar culturas. Entre eles, corredores de 40 a 60 cm permitem passar com carrinho e trabalhar sem pisar na terra plantada. Em horta comunitária, corredor largo também é acessibilidade." },
        { tipo: "texto", texto: "Se a horta terá canteiros individuais (cada família cuida do seu), o layout precisa deixar claro onde começa e termina cada lote e como a água chega a todos de forma justa. Um registro por lote, ou por fileira de lotes, evita briga sobre quem regou mais. O projeto da água e o acordo social andam juntos." },
        {
          tipo: "prancha",
          titulo: "Malha de canteiros e corredores",
          desenho: {
            legenda: "Canteiros padronizados separados por corredores; a linha principal passa num dos lados.",
            primitivas: [
              { t: "linha", de: [24, 20], ate: [24, 178], cor: "tinta" },
              { t: "rotulo", p: [8, 96], texto: "Principal" },
              { t: "retangulo", p: [44, 24], w: 100, h: 26 },
              { t: "retangulo", p: [44, 64], w: 100, h: 26 },
              { t: "retangulo", p: [44, 104], w: 100, h: 26 },
              { t: "retangulo", p: [44, 144], w: 100, h: 26 },
              { t: "retangulo", p: [164, 24], w: 100, h: 26 },
              { t: "retangulo", p: [164, 64], w: 100, h: 26 },
              { t: "retangulo", p: [164, 104], w: 100, h: 26 },
              { t: "retangulo", p: [164, 144], w: 100, h: 26 },
              { t: "rotulo", p: [150, 96], texto: "Corredor" },
            ],
          },
        },
      ],
    },
    {
      id: "posicao-cabecal",
      titulo: "O cabeçal de controle",
      blocos: [
        { tipo: "texto", texto: "O cabeçal é o cérebro do sistema, e fica logo depois da fonte: registro geral, filtro, manômetro (para ler a pressão), válvula ou temporizador e, quando há adubação líquida, o injetor de fertilizante. Reuni-los num ponto abrigado e de fácil acesso faz a manutenção acontecer; escondido ou exposto ao sol, vira abandono." },
        { tipo: "texto", texto: "Instale o manômetro antes e depois do filtro: a diferença de pressão entre os dois mostra quando o filtro está sujo e pede limpeza. É o jeito mais barato de saber a hora de limpar, sem abrir nada. Um registro de drenagem no ponto mais baixo permite esvaziar o sistema para manutenção e para o inverno." },
        {
          tipo: "diagrama",
          titulo: "Sequência do cabeçal",
          codigo: `flowchart LR
  A["Fonte"] --> B["Registro geral"]
  B --> C["Manometro 1"]
  C --> D["Filtro"]
  D --> E["Manometro 2"]
  E --> F["Valvula/temporizador"]
  F --> G["Injetor de fertilizante (opcional)"]
  G --> H["Linha principal"]` },
      ],
    },
    {
      id: "reservatorio-e-adutora",
      titulo: "Reservatório e adutora",
      blocos: [
        { tipo: "texto", texto: "Um reservatório entre a fonte e o cabeçal dá folga ao sistema: acumula água fora do horário de pico, permite decantar sólidos (ajudando o filtro) e, se for elevado, gera pressão por gravidade. Dimensione-o pela maior demanda de um turno mais uma reserva para o dia sem água, não pelo tamanho do bolso." },
        { tipo: "texto", texto: "A adutora é o cano que leva a água da fonte ao reservatório ou ao cabeçal. Ela carrega a vazão cheia, então segue a mesma lógica da linha principal: grossa o suficiente para não comer pressão. Se a água de chuva vai compor a fonte, a captação entra aqui, e vale conhecer a norma que rege o aproveitamento." },
        { tipo: "fontes", titulo: "Reservatório e água de chuva", itens: [
          { titulo: "ABNT NBR 15527 — Aproveitamento de água de chuva de coberturas (catálogo ABNT)", url: "https://www.abntcatalogo.com.br/", tipo: "norma", nota: "Requisitos para captação e uso de água de chuva para fins não potáveis, como irrigação; edição 2019. Busque pelo número 15527." },
          { titulo: "INMET — Normais Climatológicas (chuva mensal)", url: "https://portal.inmet.gov.br/normais", tipo: "dataset", nota: "Chuva média por mês para dimensionar a reserva e o complemento de irrigação." },
        ] },
      ],
    },
    {
      id: "automacao-timer",
      titulo: "Automação: do timer ao sensor",
      blocos: [
        { tipo: "texto", texto: "A forma mais simples de automatizar é um temporizador na torneira: abre e fecha a água em horários fixos. Resolve o esquecimento, mas rega por relógio, chova ou faça sol. O passo seguinte é condicionar a rega à umidade real do solo, com um sensor que só libera a água quando o solo chega ao ponto de depleção." },
        { tipo: "texto", texto: "Um sensor de umidade capacitivo barato, ligado a um microcontrolador (Arduino/ESP), consegue medir a faixa seco a úmido e acionar uma válvula. É um projeto de maker acessível, mas que precisa de calibração por solo e de eletrônica bem vedada para o campo. O vídeo e as fontes a seguir mostram o caminho." },
        { tipo: "video", titulo: "Interfacing Capacitive Soil Moisture Sensor v1.2/v2 with Arduino & Monitoring on Display", youtube: "9h3JKwUsn2A" },
        { tipo: "tarefas", itens: [
          { id: "plano-automacao", titulo: "Escolha o nível de automação", entrega: "Decida entre temporizador simples e sensor de umidade, e justifique em duas linhas com base no orçamento e em quem vai manter o sistema." },
        ] },
      ],
    },
    {
      id: "sensor-manejo",
      titulo: "Manejo por sensor de umidade",
      blocos: [
        { tipo: "texto", texto: "O sensor transforma a rega de hábito em decisão com dado. Instalado na zona das raízes, ele lê a umidade; quando a leitura cruza o limite definido (o ponto de depleção p da FAO-56), o sistema rega. Isso evita tanto o excesso (que afoga a raiz e lava o nutriente) quanto a falta (que estressa e reduz a colheita)." },
        { tipo: "texto", texto: "Sensores capacitivos baratos funcionam, mas exigem calibração e vedação: cada solo tem sua curva, e a eletrônica exposta à umidade corrói. Vale confirmar a leitura com o tato e a aparência do solo no começo, e proteger a parte eletrônica com invólucro de grau IP adequado. Datasets abertos ajudam a calibrar." },
        { tipo: "fontes", titulo: "Sensor de umidade", itens: [
          { titulo: "Embrapa — Manejo da irrigação com o sensor Irrigas", url: "https://www.infoteca.cnptia.embrapa.br/infoteca/bitstream/doc/1017645/1/LivroIRRIGASVersaoFinal2015Internet.pdf", tipo: "livro", nota: "Tensiometria gasosa de baixo custo, tecnologia brasileira para manejo da rega." },
          { titulo: "DFRobot — Capacitive Soil Moisture Sensor SEN0193 (docs)", url: "https://wiki.dfrobot.com/sen0193/docs/18036", tipo: "site", nota: "Pinagem, alimentação e código de referência do sensor capacitivo mais comum." },
          { titulo: "Strypsteen et al. — calibração de sensores capacitivos de baixo custo (dataset)", url: "https://zenodo.org/records/16911016", tipo: "dataset", nota: "Dados abertos de laboratório e campo para reproduzir a calibração." },
          { titulo: "IEC 60529 — Degrees of protection (IP Code)", url: "https://webstore.iec.ch/publication/2452", tipo: "norma", nota: "Graus IP para vedar a eletrônica no campo (ex.: IP67)." },
        ] },
      ],
    },
    {
      id: "fertirrigacao",
      titulo: "Fertirrigação: adubar pela água",
      blocos: [
        { tipo: "texto", texto: "O gotejamento permite entregar nutriente dissolvido direto na raiz, em pequenas doses frequentes: é a fertirrigação. Bem feita, aumenta a eficiência do adubo e a produção; mal feita, saliniza o solo, entope o emissor com sais e pode contaminar a água. Não é só abrir um balde de adubo no sistema." },
        { tipo: "texto", texto: "A dose, a solução, a frequência e a compatibilidade entre fertilizantes dependem da cultura, do estágio e da análise de solo e água. Errar a concentração queima a planta ou precipita sal dentro da tubulação. Definir o plano de fertirrigação com segurança é tarefa de quem entende de nutrição de plantas." },
        { tipo: "mobilizacao", papel: "Engenheiro agrônomo (nutrição de plantas e fertirrigação)", porque: "Definir solução nutritiva, dose, frequência e compatibilidade de fertilizantes na água de irrigação afeta a saúde da planta, a vida do sistema e a segurança do alimento; erro de concentração queima a cultura ou entope os emissores.", entregaEsperada: "Plano de fertirrigação com recomendação de adubos, concentrações, calendário por estágio e cuidados de compatibilidade e limpeza da linha, baseado em análise de solo e de água.", gerenciadoPor: "zaeon" },
      ],
    },
    {
      id: "captacao-chuva-integrada",
      titulo: "Integrar a água de chuva",
      blocos: [
        { tipo: "texto", texto: "Telhados de galpão, escola ou sede captam muita água que, em vez de ir para o bueiro, pode encher a cisterna da horta. A conta é simples: área de telhado vezes a chuva do mês vezes um coeficiente de perda dá o volume captável. Em meses secos, essa reserva reduz a conta de água e a dependência da rede." },
        { tipo: "texto", texto: "Água de chuva para irrigação é uso não potável, regido pela NBR 15527. O sistema pede descarte da primeira água (que lava a sujeira do telhado), filtragem e reservatório fechado para não virar criadouro de mosquito. Integrada ao cabeçal, a chuva captada passa pelo mesmo filtro antes dos emissores." },
        {
          tipo: "diagrama",
          titulo: "Chuva integrada à horta",
          codigo: `flowchart LR
  A["Telhado"] --> B["Descarte da primeira agua"]
  B --> C["Filtro/grade"]
  C --> D["Cisterna fechada"]
  D --> E["Cabecal da horta"]
  E --> F["Gotejamento"]` },
      ],
    },
    {
      id: "orcamento-materiais",
      titulo: "Orçamento e lista de materiais",
      blocos: [
        { tipo: "texto", texto: "O croqui vira lista de compras. Agrupe por função: cabeçal (registro, filtro, manômetros, válvula, conexões), rede (linha principal, derivações, laterais, emissores ou fita), fixação (estacas, grampos) e, se houver, bomba e automação. Some metragens com 10 a 15 por cento de folga para perdas e emendas." },
        { tipo: "texto", texto: "Para horta comunitária, orce também a manutenção: filtros reserva, emissores de reposição e o produto de limpeza (cloro, ácido). E registre o custo por canteiro, porque é esse número que o grupo usa no rateio. Um projeto que só orça a instalação e esquece a manutenção quebra na primeira entressafra." },
        { tipo: "tarefas", itens: [
          { id: "lista-materiais", titulo: "Monte a lista de materiais", entrega: "A partir do croqui, liste todos os itens por função com quantidade e folga, e calcule o custo total e o custo por canteiro." },
        ] },
      ],
    },
    {
      id: "fontes-projeto",
      titulo: "Fontes: projeto do sistema",
      blocos: [
        { tipo: "texto", texto: "Os endereços abaixo sustentam as decisões de projeto: componentes, automação, fertirrigação e integração da água de chuva." },
        { tipo: "fontes", titulo: "Projeto", itens: [
          { titulo: "FAO — Irrigation Methods (Training Manual 5)", url: "https://www.fao.org/4/s8684e/s8684e00.htm", tipo: "livro", nota: "Componentes e layout do sistema localizado." },
          { titulo: "Embrapa Hortaliças — Controle da irrigação de hortaliças", url: "https://www.infoteca.cnptia.embrapa.br/bitstream/doc/939283/1/5ControledaIrrigacaodeHortalicas.pdf", tipo: "livro", nota: "Manejo e automação aplicados a hortaliças." },
          { titulo: "ABNT NBR 15527 — Água de chuva de coberturas (catálogo ABNT)", url: "https://www.abntcatalogo.com.br/", tipo: "norma", nota: "Requisitos para aproveitamento de água de chuva não potável. Busque pelo número 15527." },
        ] },
      ],
    },

    // ===================== CAPÍTULO 6 — EXECUTAR E TESTAR =====================
    {
      id: "marcacao-terreno",
      titulo: "Marcação e preparo do terreno",
      blocos: [
        { tipo: "texto", texto: "A obra começa transferindo o croqui para o chão. Com estacas e barbante, marque os canteiros, os corredores e o traçado da linha principal. Confira os ângulos e as distâncias contra o desenho: é muito mais barato corrigir uma estaca do que um cano já enterrado. Marque também onde ficam os registros de setor." },
        { tipo: "texto", texto: "Prepare o solo dos canteiros antes de assentar a tubulação: descompacte, incorpore matéria orgânica e nivele a superfície. Em declive, abra os canteiros em nível (acompanhando as curvas), para o bulbo molhado não escorrer. Só depois do solo pronto entra a rede, para não pisar sobre o que já foi instalado." },
        { tipo: "tarefas", itens: [
          { id: "marcar-horta", titulo: "Marque a horta no chão", entrega: "Transfira o croqui para o terreno com estacas e barbante e confira três medidas principais contra o desenho antes de qualquer escavação." },
        ] },
      ],
    },
    {
      id: "instalacao-cabecal",
      titulo: "Instalar o cabeçal",
      blocos: [
        { tipo: "texto", texto: "Monte o cabeçal na ordem do fluxo: registro geral, primeiro manômetro, filtro, segundo manômetro, válvula ou temporizador e, por último, o injetor de fertilizante, se houver. Deixe folga e uniões rosqueadas para abrir e limpar sem cortar cano. Abrigue o conjunto do sol e da chuva, mas com acesso livre." },
        { tipo: "texto", texto: "Instale o filtro na altura dos olhos e o dreno no ponto mais baixo. Teste cada rosca contra vazamento antes de seguir. Um cabeçal bem montado é o que torna a manutenção uma tarefa de cinco minutos; um cabeçal apertado e escondido é o que faz o grupo adiar a limpeza até o sistema entupir." },
        {
          tipo: "prancha",
          titulo: "Montagem do cabeçal",
          desenho: {
            legenda: "Ordem do fluxo com manômetros antes e depois do filtro e dreno no ponto baixo.",
            primitivas: [
              { t: "linha", de: [20, 90], ate: [285, 90], cor: "tinta" },
              { t: "circulo", c: [45, 90], r: 7, cor: "destaque" },
              { t: "rotulo", p: [28, 112], texto: "Registro" },
              { t: "circulo", c: [95, 70], r: 6, hachura: true },
              { t: "rotulo", p: [80, 56], texto: "Man.1" },
              { t: "retangulo", p: [120, 74], w: 36, h: 32, hachura: true },
              { t: "rotulo", p: [122, 112], texto: "Filtro" },
              { t: "circulo", c: [185, 70], r: 6, hachura: true },
              { t: "rotulo", p: [170, 56], texto: "Man.2" },
              { t: "circulo", c: [235, 90], r: 7, cor: "destaque" },
              { t: "rotulo", p: [214, 112], texto: "Valvula" },
              { t: "seta", de: [138, 106], ate: [138, 140], cor: "suave" },
              { t: "rotulo", p: [120, 150], texto: "Dreno" },
            ],
          },
        },
      ],
    },
    {
      id: "assentamento-linhas",
      titulo: "Assentar as linhas",
      blocos: [
        { tipo: "texto", texto: "Estenda a linha principal e as derivações primeiro, conferindo que a bitola bate com o projeto (grossa onde carrega muita vazão). Fixe-as e deixe pontas para as laterais. Em PVC, cole as juntas com primer e limpe a rebarba dos cortes, que são origem de entupimento quando o sistema enche pela primeira vez." },
        { tipo: "texto", texto: "Role as linhas laterais sobre os canteiros no sentido do comprimento, dentro do limite calculado (20 a 30 m, ou entrada central se for mais longo). Deixe a fita ou o tubo gotejador com as saídas para cima, para o furo não encostar na terra e sugar lama. Fixe com grampos a cada poucos metros para o vento não deslocar." },
        { tipo: "tarefas", itens: [
          { id: "conferir-bitola", titulo: "Confira a bitola de cada trecho", entrega: "Antes de colar, confira no projeto a bitola de principal, derivação e lateral, e anote onde cada diâmetro começa e termina." },
        ] },
      ],
    },
    {
      id: "instalacao-emissores",
      titulo: "Instalar emissores e gotejadores",
      blocos: [
        { tipo: "texto", texto: "Em tubo com gotejador de botão, fure a parede com a ferramenta correta e encaixe o emissor junto ao colo de cada planta, respeitando o número por pé definido no cálculo. Em fita, as saídas já vêm prontas no espaçamento de fábrica; basta posicioná-la na linha de plantio. Não force o furo: furo errado vira vazamento permanente." },
        { tipo: "texto", texto: "Posicione o emissor onde a raiz vai estar, não onde a muda está hoje: plantas crescem e a raiz se espalha. Em cultura de fruto, o gotejador fica a poucos centímetros do colo; conforme a planta cresce, pode-se afastar um pouco para acompanhar o bulbo. Anote o padrão para repetir em cada canteiro." },
        {
          tipo: "licao",
          pergunta: "Por que as saídas da fita gotejadora devem ficar voltadas para cima?",
          alternativas: [
            "Para a água evaporar mais rápido",
            "Para o furo não encostar na terra e sugar lama, entupindo",
            "Porque fica mais bonito no canteiro",
          ],
          correta: 1,
          explicacao: "Saída voltada para o solo entra em contato com lama e partículas, que são sugadas e entopem o emissor. Para cima, o furo fica protegido.",
        },
      ],
    },
    {
      id: "conexoes-vedacao",
      titulo: "Conexões e vedação",
      blocos: [
        { tipo: "texto", texto: "Cada conexão é um ponto potencial de vazamento e de perda de pressão. Use conectores do mesmo sistema (iniciais, luvas, finais), aperte com a mão na medida certa (apertar demais racha, de menos vaza) e feche as pontas das laterais com tampão ou dobra travada. Vazamento invisível na junta rouba pressão da ponta da linha." },
        { tipo: "texto", texto: "Nas roscas do cabeçal, use fita veda-rosca; nas uniões de encaixe, confira o anel de vedação. Deixe um registro de descarga na ponta de cada linha principal: é por ali que se faz a lavagem (flush) periódica que arrasta a sujeira acumulada no fundo do tubo, prolongando a vida dos emissores." },
        { tipo: "tarefas", itens: [
          { id: "mapa-conexoes", titulo: "Liste os pontos de vedação", entrega: "Percorra a rede e marque no croqui cada conexão e ponta a vedar, mais a posição dos registros de descarga para o flush." },
        ] },
      ],
    },
    {
      id: "teste-pressao",
      titulo: "Teste de pressão e vazamento",
      blocos: [
        { tipo: "texto", texto: "Antes de plugar os emissores finais, encha o sistema com os finais das laterais abertos e deixe correr: a água empurra para fora a rebarba e a terra que entraram na montagem. Depois feche as pontas e pressurize, lendo o manômetro. A pressão deve estabilizar e ficar; se cai sozinha, há vazamento a caçar." },
        { tipo: "texto", texto: "Caminhe a rede com o sistema sob pressão procurando poças, chiados e emissores que esguicham em vez de gotejar (sinal de pressão alta demais ou emissor defeituoso). Corrija antes de plantar: achar e consertar vazamento com o canteiro vazio é fácil; com a planta instalada, é pisar onde não devia." },
        { tipo: "tarefas", itens: [
          { id: "flush-inicial", titulo: "Faça a lavagem e o teste de pressão", entrega: "Registre a leitura do manômetro ao pressurizar, confirme que estabiliza e anote cada vazamento encontrado e corrigido." },
        ] },
      ],
    },
    {
      id: "teste-uniformidade",
      titulo: "Teste de uniformidade em campo",
      blocos: [
        { tipo: "texto", texto: "Agora vale o protocolo dos copinhos planejado no capítulo do método. Com o sistema no tempo normal de rega, colete em copos iguais a vazão de emissores no início, no meio e no fim de uma linha, por um tempo fixo (por exemplo, 5 minutos). Compare os volumes: iguais entre si indicam boa uniformidade." },
        { tipo: "texto", texto: "Se a ponta entrega bem menos que o começo, a linha está longa demais ou a pressão está baixa: encurte, use entrada central ou troque por emissor autocompensante. Se um emissor isolado destoa, provavelmente está entupido ou defeituoso: limpe ou troque. Repita o teste depois de cada correção até os copos baterem." },
        {
          tipo: "prancha",
          titulo: "Protocolo dos copinhos",
          desenho: {
            legenda: "Copos iguais sob emissores do início, meio e fim da linha; volumes parecidos indicam uniformidade.",
            primitivas: [
              { t: "linha", de: [20, 50], ate: [285, 50], cor: "tinta" },
              { t: "circulo", c: [55, 50], r: 4, cor: "destaque" },
              { t: "circulo", c: [150, 50], r: 4, cor: "destaque" },
              { t: "circulo", c: [250, 50], r: 4, cor: "destaque" },
              { t: "retangulo", p: [44, 95], w: 24, h: 40 },
              { t: "retangulo", p: [138, 98], w: 24, h: 37 },
              { t: "retangulo", p: [238, 100], w: 24, h: 35 },
              { t: "rotulo", p: [44, 150], texto: "Inicio" },
              { t: "rotulo", p: [140, 150], texto: "Meio" },
              { t: "rotulo", p: [242, 150], texto: "Fim" },
            ],
          },
        },
      ],
    },
    {
      id: "instalacao-eletrica",
      titulo: "A parte elétrica da bomba",
      blocos: [
        { tipo: "texto", texto: "Se a horta tem motobomba, chegou a etapa que não é de mutirão: a ligação elétrica. Perto da água, uma instalação sem aterramento e sem dispositivo diferencial residual (DR) é risco de morte por choque. A NBR 5410 define como fazer, e é por isso que esta etapa é de profissional habilitado, com proteção e, quando exigido, ART." },
        { tipo: "texto", texto: "Enquanto o profissional não executa e libera, não energize nada por conta própria, nem com extensão provisória. O grupo pode adiantar a parte civil (abrigo da bomba, eletroduto embutido, ponto de dreno), mas a conexão elétrica final espera. Segurança coletiva vale mais que pressa." },
        { tipo: "mobilizacao", papel: "Eletricista habilitado (instalação da motobomba)", porque: "Energizar bomba junto à água exige aterramento, DR e disjuntor conforme a NBR 5410; ligação improvisada por leigo é causa frequente de choque e incêndio em áreas molhadas.", entregaEsperada: "Ponto elétrico da bomba executado e testado conforme NBR 5410 (aterramento, DR, disjuntor, eletroduto estanque), liberado para uso.", gerenciadoPor: "zaeon" },
        { tipo: "fontes", titulo: "Segurança elétrica", itens: [
          { titulo: "ABNT NBR 5410 — Instalações elétricas de baixa tensão", url: "https://www.target.com.br/produtos/normas-tecnicas/28721/nbr5410-instalacoes-eletricas-de-baixa-tensao", tipo: "norma", nota: "Aterramento, proteção diferencial e segurança em áreas molhadas." },
        ] },
      ],
    },
    {
      id: "primeira-rega",
      titulo: "Primeira rega e comissionamento",
      blocos: [
        { tipo: "texto", texto: "Comissionar é ligar o sistema completo pela primeira vez, setor a setor, conferindo tudo junto: pressão no manômetro, uniformidade nos copos, ausência de vazamento e o tempo de rega real batendo com o calculado. Anote os números dessa primeira rega: eles viram a linha de base para perceber, no futuro, quando algo mudou." },
        { tipo: "texto", texto: "Aproveite para treinar o grupo no comissionamento: cada responsável abre o seu setor, lê o manômetro, confere o filtro e fecha ao fim. O sistema só está pronto quando mais de uma pessoa sabe operá-lo. Documente o procedimento num cartão simples fixado no cabeçal." },
        { tipo: "tarefas", itens: [
          { id: "linha-base", titulo: "Registre a linha de base", entrega: "Na primeira rega de cada setor, anote pressão, volume médio dos copos, tempo real e qualquer ajuste. Fixe o cartão de operação no cabeçal." },
        ] },
      ],
    },
    {
      id: "fontes-execucao",
      titulo: "Fontes: execução e testes",
      blocos: [
        { tipo: "texto", texto: "Os endereços abaixo sustentam a instalação, os testes de pressão e uniformidade e a segurança da parte elétrica." },
        { tipo: "fontes", titulo: "Execução", itens: [
          { titulo: "FAO — Irrigation Methods (Training Manual 5)", url: "https://www.fao.org/4/s8684e/s8684e00.htm", tipo: "livro", nota: "Instalação e operação do sistema localizado, uniformidade e manutenção." },
          { titulo: "ABNT NBR 5410 — Instalações elétricas de baixa tensão", url: "https://www.target.com.br/produtos/normas-tecnicas/28721/nbr5410-instalacoes-eletricas-de-baixa-tensao", tipo: "norma", nota: "Segurança elétrica da motobomba." },
          { titulo: "Embrapa Hortaliças — Controle da irrigação de hortaliças", url: "https://www.infoteca.cnptia.embrapa.br/bitstream/doc/939283/1/5ControledaIrrigacaodeHortalicas.pdf", tipo: "livro", nota: "Boas práticas de manejo e verificação da rega." },
        ] },
      ],
    },

    // ===================== CAPÍTULO 7 — OPERAR E MANTER =====================
    {
      id: "calendario-rega",
      titulo: "Calendário de rega por estação",
      blocos: [
        { tipo: "texto", texto: "A sede da horta muda com a estação: no verão seco a ETo sobe e rega-se mais; no inverno úmido, menos. Monte um calendário que ajusta o tempo e a frequência de rega por mês, partindo da ficha climática e do ETc da cultura dominante. Não é fixar um horário e esquecer: é revisar a cada troca de estação ou de cultura." },
        { tipo: "texto", texto: "Em dia de chuva, a rega programada deve ser suspensa: regar sobre solo já cheio desperdiça água e afoga a raiz. Por isso o calendário é um ponto de partida, e o sensor (ou a observação do solo) é o ajuste fino. Deixe no cartão de operação a regra clara: choveu bem, não rega." },
        {
          tipo: "diagrama",
          titulo: "Decisão diária de rega",
          codigo: `flowchart TD
  A["Choveu bem ontem/hoje?"] -->|Sim| B["Nao rega"]
  A -->|Nao| C["Solo no ponto de depleção?"]
  C -->|Sim| D["Rega o tempo do calendario"]
  C -->|Nao| E["Espera e checa amanha"]` },
      ],
    },
    {
      id: "manejo-sensor-calendario",
      titulo: "Sensor ou calendário: o melhor é os dois",
      blocos: [
        { tipo: "texto", texto: "Calendário é a regra padrão, prática para quem opera; sensor é a verificação que evita regar no automático. O manejo maduro usa os dois: o calendário diz o tempo provável, o sensor (ou o tato) confirma se naquele dia a horta realmente precisa. Com o tempo, o grupo aprende a ler o solo e depende menos do relógio." },
        { tipo: "texto", texto: "A FAO alerta que todo método de agendamento tem limites: sensor descalibrado engana, calendário ignora o clima do dia, estimativa de ETo tem erro. Por isso a decisão cruza fontes: dado do sensor, aparência do solo e o bom senso de quem está no canteiro. Nenhuma régua sozinha substitui a observação." },
        { tipo: "fontes", titulo: "Manejo da rega", itens: [
          { titulo: "FAO — Irrigation scheduling: from theory to practice (Water Report 8)", url: "https://www.fao.org/4/W4367E/w4367e04.htm", tipo: "artigo", nota: "Métodos de agendamento por umidade e tensão e suas limitações." },
          { titulo: "MSU/USDA — Estimating Soil Moisture by Feel and Appearance", url: "https://www.canr.msu.edu/irrigation/uploads/files/FeelSoil.pdf", tipo: "artigo", nota: "Confirmar a rega pelo tato, como checagem do sensor e do calendário." },
        ] },
      ],
    },
    {
      id: "limpeza-filtros",
      titulo: "Limpeza de filtros",
      blocos: [
        { tipo: "texto", texto: "O filtro é a peça que mais pede atenção. A diferença de pressão entre os dois manômetros (antes e depois) é o sinal: quando a queda cresce além do normal, o filtro está sujo e precisa de limpeza. Sem manômetros, estabeleça uma rotina por tempo, mais frequente quanto mais suja for a água." },
        { tipo: "texto", texto: "Limpar é simples: feche o registro, abra o filtro, lave a tela ou os discos com água corrente e escova macia, recoloque e reabra. Tenha um elemento filtrante reserva para não parar a rega enquanto o sujo seca. Filtro de disco entope mais fino que o de tela; escolha conforme a água e mantenha os dois reservas no estoque." },
        { tipo: "tarefas", itens: [
          { id: "rotina-filtro", titulo: "Defina a rotina do filtro", entrega: "Escreva quando limpar (queda de pressão ou intervalo de tempo) e quem é o responsável por semana. Deixe um elemento reserva no cabeçal." },
        ] },
      ],
    },
    {
      id: "desentupimento",
      titulo: "Desentupir emissores",
      blocos: [
        { tipo: "texto", texto: "Mesmo com filtro, emissores entopem com o tempo. Entupimento físico (partículas) se combate com a lavagem periódica das linhas (flush): abrir os registros de ponta e deixar a água correr forte, arrastando o sedimento do fundo. Faça isso em rotina, não só quando o problema aparece." },
        { tipo: "texto", texto: "Entupimento químico (carbonato, ferro) pede tratamento com ácido diluído; o biológico (algas, limo) pede cloração controlada. Ambos usam produto químico e dose certa: em excesso, danificam a tubulação e a planta; de menos, não resolvem. Para água difícil, o protocolo de limpeza química deve ser definido com orientação técnica e EPI adequado." },
        {
          tipo: "diagrama",
          titulo: "Tipo de entupimento e resposta",
          codigo: `flowchart TD
  A["Emissor fraco ou seco"] --> B["Partículas/sedimento?"]
  B -->|Sim| C["Flush das linhas"]
  A --> D["Crosta branca (carbonato)?"]
  D -->|Sim| E["Tratamento acido controlado"]
  A --> F["Limo/alga?"]
  F -->|Sim| G["Cloracao controlada"]` },
      ],
    },
    {
      id: "inspecao-semanal",
      titulo: "Inspeção semanal: o checklist",
      blocos: [
        { tipo: "texto", texto: "A manutenção que funciona é a de rotina curta. Uma inspeção semanal de dez minutos pega o problema pequeno antes de virar grande: olhar a pressão no manômetro, conferir o filtro, caminhar a rede procurando vazamento, ver se algum trecho de canteiro ficou seco (emissor entupido) ou encharcado (emissor aberto demais)." },
        { tipo: "texto", texto: "Transforme a inspeção num checklist fixo no cabeçal, com data e assinatura de quem fez. O registro semanal revela tendências: filtro que suja cada vez mais rápido indica piora da água; trecho que seca sempre no mesmo lugar indica problema de projeto a corrigir. Papel barato previne conserto caro." },
        { tipo: "tarefas", itens: [
          { id: "checklist-semanal", titulo: "Crie o checklist semanal", entrega: "Monte uma lista de 5 a 7 itens de verificação (pressão, filtro, vazamentos, trechos secos/encharcados) com espaço para data e responsável, e fixe no cabeçal." },
        ] },
      ],
    },
    {
      id: "manutencao-bomba",
      titulo: "Manutenção da bomba e do cabeçal",
      blocos: [
        { tipo: "texto", texto: "Se há bomba, ela entra na rotina: ouvir ruído estranho, sentir aquecimento anormal, conferir se escorva e mantém pressão. Vedações e rotor se desgastam; a bomba que começa a entregar menos pressão avisa com antecedência. A parte elétrica, porém, continua sendo território de profissional: o grupo observa e relata, não mexe na fiação." },
        { tipo: "texto", texto: "No cabeçal, verifique periodicamente as roscas (afrouxam com vibração e temperatura), o estado dos manômetros (vidro embaçado ou ponteiro preso enganam a leitura) e o injetor de fertilizante (resíduo cristalizado trava). Manter o cérebro do sistema em dia é o que mantém a rega previsível." },
        {
          tipo: "licao",
          pergunta: "Na manutenção da bomba por um grupo comunitário, o que o grupo faz por conta própria?",
          alternativas: [
            "Refazer a ligação elétrica quando entender que é simples",
            "Observar ruído, aquecimento e pressão e relatar, deixando a parte elétrica para o profissional",
            "Trocar a fiação para economizar a visita técnica",
          ],
          correta: 1,
          explicacao: "A observação e o relato são do grupo; qualquer intervenção na parte elétrica continua sendo de profissional habilitado, por segurança e por norma.",
        },
      ],
    },
    {
      id: "drenagem-entressafra",
      titulo: "Entressafra, frio e drenagem",
      blocos: [
        { tipo: "texto", texto: "Na pausa entre ciclos, o sistema não deve ficar cheio e parado: água parada favorece limo e precipitação de sais dentro do tubo. Drene as linhas pelos registros de ponta e deixe o cabeçal despressurizado. Em regiões com risco de geada, drenar evita que a água congele e rache tubos e emissores." },
        { tipo: "texto", texto: "Aproveite a entressafra para a manutenção pesada que não dá para fazer com a horta em plena produção: lavagem química das linhas se necessário, troca de emissores gastos, revisão da bomba e recalibração dos sensores. Volte da pausa com o sistema como novo, não com os problemas acumulados do ciclo anterior." },
        { tipo: "tarefas", itens: [
          { id: "rotina-entressafra", titulo: "Planeje a entressafra", entrega: "Liste as tarefas de manutenção pesada a fazer na pausa (drenagem, lavagem, troca de emissores, revisão de bomba e sensores) e quem conduz cada uma." },
        ] },
      ],
    },
    {
      id: "registro-dados",
      titulo: "Registro e dados da horta",
      blocos: [
        { tipo: "texto", texto: "O que não se registra, não se melhora. Uma planilha simples com data, setor, tempo de rega, leitura do hidrômetro e observações transforma a horta num sistema que aprende. Com meses de dados dá para ver quanto de água cada cultura gastou, quando o consumo saltou (vazamento?) e se a conta bate com o calculado." },
        { tipo: "texto", texto: "Dados também ancoram o rateio justo: a conta de água dividida por consumo registrado é mais justa que dividida no palpite. E viram prova para captar apoio: uma horta que mostra litros economizados com gotejamento convence prefeitura, escola e patrocinador melhor que uma promessa. Guarde os números." },
        { tipo: "fontes", titulo: "Dados e eficiência", itens: [
          { titulo: "Strypsteen et al. — dados de sensores de umidade (Zenodo)", url: "https://zenodo.org/records/16911016", tipo: "dataset", nota: "Exemplo de planilha de campo e laboratório para organizar os próprios registros." },
          { titulo: "FAO-56 — balanço de água como base do registro", url: "https://www.fao.org/4/x0490e/x0490e00.htm", tipo: "livro", nota: "Estrutura de contabilidade da água que o registro da horta reproduz." },
        ] },
      ],
    },
    {
      id: "problemas-comuns",
      titulo: "Diagnóstico de problemas comuns",
      blocos: [
        { tipo: "texto", texto: "Quase todo problema de gotejamento cai em poucas famílias: pressão baixa (bomba, vazamento, filtro sujo), uniformidade ruim (linha longa, emissor entupido), encharcamento (emissor defeituoso, rega longa demais) e seca localizada (entupimento, furo mal feito). Saber a família encurta o conserto: trata-se a causa, não o sintoma." },
        { tipo: "texto", texto: "Use o diagrama abaixo como primeiro filtro quando algo estiver errado. Ele leva da observação ao provável culpado. Depois de resolver, anote no registro: um problema que volta sempre no mesmo lugar não é azar, é projeto ou operação a corrigir de vez." },
        {
          tipo: "diagrama",
          titulo: "Árvore de diagnóstico",
          codigo: `flowchart TD
  A["Problema na rega"] --> B["Pressão baixa em tudo?"]
  B -->|Sim| C["Filtro sujo / vazamento / bomba"]
  A --> D["So a ponta rega mal?"]
  D -->|Sim| E["Linha longa / pressão insuficiente"]
  A --> F["Um ponto seco isolado?"]
  F -->|Sim| G["Emissor entupido ou furo errado"]
  A --> H["Um ponto encharcado?"]
  H -->|Sim| I["Emissor defeituoso ou rega longa"]` },
      ],
    },
    {
      id: "fontes-manutencao",
      titulo: "Fontes: operação e manutenção",
      blocos: [
        { tipo: "texto", texto: "Os endereços abaixo sustentam o manejo da rega, a limpeza de filtros, o desentupimento e o registro de dados." },
        { tipo: "fontes", titulo: "Operação e manutenção", itens: [
          { titulo: "FAO — Irrigation Methods (Training Manual 5)", url: "https://www.fao.org/4/s8684e/s8684e00.htm", tipo: "livro", nota: "Operação e manutenção do sistema localizado, filtragem e limpeza." },
          { titulo: "FAO — Water quality for agriculture (obstrução e tratamento)", url: "https://www.fao.org/4/t0234e/t0234e00.htm", tipo: "livro", nota: "Causas de obstrução química e biológica e manejo da água." },
          { titulo: "Embrapa Hortaliças — Controle da irrigação de hortaliças", url: "https://www.infoteca.cnptia.embrapa.br/bitstream/doc/939283/1/5ControledaIrrigacaodeHortalicas.pdf", tipo: "livro", nota: "Manejo prático da rega em hortaliças." },
        ] },
      ],
    },

    // ===================== CAPÍTULO 8 — CASOS REAIS E GOVERNANÇA =====================
    {
      id: "caso-horta-urbana",
      titulo: "Caso: horta urbana em terreno emprestado",
      blocos: [
        { tipo: "texto", texto: "Um grupo de bairro consegue um terreno ocioso emprestado pela prefeitura. Começa com rega por mangueira e desiste no primeiro verão, porque ninguém dava conta de regar todo dia. Ao trocar por gotejamento com temporizador, a tarefa diária de regar some: o sistema rega sozinho no horário e o grupo foca no plantio e na colheita." },
        { tipo: "texto", texto: "A lição que se repete nesses casos: o gargalo da horta comunitária raramente é plantar, é regar com constância. Automatizar a rega é o que mantém o projeto vivo quando o entusiasmo inicial passa. E terreno emprestado pede sistema desmontável, pensado para sair sem perda se o empréstimo acabar." },
        { tipo: "video", titulo: "O que é Permacultura? | Princípios", youtube: "hgfCFfV8YUo" },
      ],
    },
    {
      id: "caso-escola",
      titulo: "Caso: horta de escola e aprendizado",
      blocos: [
        { tipo: "texto", texto: "Uma escola monta a horta como laboratório vivo: os alunos medem a umidade, calculam o tempo de rega e leem o hidrômetro. O gotejamento vira conteúdo de matemática (vazão, lâmina), ciências (solo, planta, água) e cidadania (rateio, decisão coletiva). A água economizada e os números reais ensinam mais que o livro." },
        { tipo: "texto", texto: "O desafio da horta escolar é a continuidade nas férias e a troca de turmas. A solução costuma ser automação confiável mais um responsável adulto fixo, com o cartão de operação no cabeçal para qualquer professor conseguir operar. Documentação simples é o que atravessa a rotatividade de pessoas." },
        { tipo: "tarefas", itens: [
          { id: "plano-continuidade", titulo: "Planeje a continuidade", entrega: "Escreva como a sua horta sobrevive a férias, mudança de pessoas e feriados: automação, responsável fixo e documento de operação acessível." },
        ] },
      ],
    },
    {
      id: "governanca-rateio",
      titulo: "Governança e rateio da água",
      blocos: [
        { tipo: "texto", texto: "Água custa, e em horta comunitária isso precisa de regra clara. Três modelos comuns: rateio igual (todos dividem a conta por igual), rateio por consumo (quem mede mais, paga mais) e rateio por lote (cada lote paga uma taxa fixa). O registro do hidrômetro por setor é o que permite o rateio por consumo, o mais justo onde há diferença grande de uso." },
        { tipo: "texto", texto: "Decidir o modelo é decisão coletiva, e método ajuda. Pela sociocracia por consentimento, a proposta de rateio avança quando ninguém tem objeção fundamentada, o que costuma produzir regra mais aceita que votação apertada. Reveja o modelo quando a horta crescer ou a conta mudar: regra boa hoje pode ficar injusta amanhã." },
        {
          tipo: "licao",
          pergunta: "O que torna possível o rateio da água por consumo em vez de por igual?",
          alternativas: [
            "A boa vontade de cada um",
            "O registro do hidrômetro por setor, que mede quanto cada parte usou",
            "Uma planilha bonita, independente de medir",
          ],
          correta: 1,
          explicacao: "Sem medição não há rateio por consumo. O hidrômetro por setor converte uso real em números, base de um rateio justo.",
        },
      ],
    },
    {
      id: "mutirao-escala",
      titulo: "Mutirão e escala de trabalho",
      blocos: [
        { tipo: "texto", texto: "A instalação e a manutenção pesada cabem bem no mutirão: muita gente num dia resolve o que um sozinho levaria semanas. Mas a operação diária (abrir setor, checar filtro) precisa de escala fixa com responsável e suplente, não de mutirão. Confundir os dois é receita para o sistema ficar sem dono no dia a dia." },
        { tipo: "texto", texto: "Monte duas listas separadas: a agenda de mutirões (datas pontuais, tarefa definida, convite amplo) e a escala rotativa de operação (quem cuida em cada semana). A escala rotativa espalha o conhecimento: quando mais pessoas já operaram o sistema, a horta não depende de uma única pessoa e sobrevive a ausências." },
        { tipo: "tarefas", itens: [
          { id: "escala-operacao", titulo: "Monte a escala de operação", entrega: "Crie uma escala rotativa semanal com responsável e suplente para operar e inspecionar o sistema, separada da agenda de mutirões." },
        ] },
      ],
    },
    {
      id: "agua-licenciamento",
      titulo: "Água, outorga e licenciamento",
      blocos: [
        { tipo: "texto", texto: "Usar água da rede com hidrômetro é direto. Mas captar de poço, rio, nascente ou açude pode exigir outorga de direito de uso da água, concedida pelo órgão gestor (estadual ou a ANA, conforme o corpo hídrico). Captar sem outorga onde ela é exigida é irregular e pode gerar multa e embargo, além de conflito com outros usuários." },
        { tipo: "texto", texto: "As regras variam por estado e por volume captado; usos insignificantes costumam ser dispensados, mas é o órgão que define o limite. Antes de furar poço ou puxar de um curso d'água para a horta, confirme a exigência e, quando necessário, mobilize quem elabora e protocola o pedido. Legalizar a água protege o projeto a longo prazo." },
        { tipo: "mobilizacao", papel: "Engenheiro ou técnico ambiental (outorga de uso da água)", porque: "Captar de poço, rio ou nascente pode exigir outorga do órgão gestor; definir enquadramento, elaborar e protocolar o pedido é atribuição técnica, e captar sem outorga onde ela é exigida gera multa e embargo.", entregaEsperada: "Verificação da exigência de outorga para a fonte pretendida e, quando necessário, requerimento protocolado no órgão gestor com os estudos exigidos.", gerenciadoPor: "zaeon" },
        { tipo: "fontes", titulo: "Marco da água", itens: [
          { titulo: "FAO — Water quality for agriculture", url: "https://www.fao.org/4/t0234e/t0234e00.htm", tipo: "livro", nota: "Critérios técnicos de aptidão da água captada para irrigação." },
          { titulo: "Portaria GM/MS 888/2021 — potabilidade (referência sanitária)", url: "https://bvsms.saude.gov.br/bvs/saudelegis/gm/2021/prt0888_07_05_2021.html", tipo: "norma", nota: "Parâmetros sanitários de referência quando há contato com a parte comestível." },
        ] },
      ],
    },
    {
      id: "seguranca-primeiros-socorros",
      titulo: "Segurança no trabalho da horta",
      blocos: [
        { tipo: "texto", texto: "Horta comunitária reúne gente de todas as idades, então a segurança é parte do projeto. Os riscos comuns: elétrico (bomba e tomadas perto da água), químico (cloro e ácido da limpeza, fertilizantes), ferramenta cortante e sol excessivo. Cada um tem prevenção simples: instalação elétrica correta, EPI e armazenamento trancado dos químicos, ferramentas guardadas e sombra para pausas." },
        { tipo: "texto", texto: "Produtos de limpeza do sistema (cloro, ácido) e fertilizantes devem ficar em local trancado, longe de crianças e identificados. Quem manuseia química usa luva e óculos, e nunca mistura produtos por conta própria. Tenha um kit de primeiros socorros e os telefones de emergência fixados no mesmo cartão da operação." },
        { tipo: "tarefas", itens: [
          { id: "plano-seguranca", titulo: "Monte o plano de segurança", entrega: "Liste os riscos da sua horta (elétrico, químico, cortante, sol) e a medida de prevenção de cada um; defina onde ficam trancados os químicos e o kit de primeiros socorros." },
        ] },
      ],
    },
    {
      id: "licao-revisao",
      titulo: "Revisão: o caminho inteiro",
      blocos: [
        { tipo: "texto", texto: "Antes de fechar, uma revisão do percurso. Você leu o local (sol, água, solo, clima), entendeu como o gotejamento funciona, calculou a água da cultura e a vazão do sistema, projetou, instalou, testou e organizou a operação, a manutenção e a governança. Cada etapa teve fonte e, onde a lei pediu, o profissional certo." },
        {
          tipo: "licao",
          pergunta: "Qual é a ordem correta e segura de trabalho deste caderno?",
          alternativas: [
            "Comprar materiais, instalar e depois ver se funciona",
            "Ler o local e medir, calcular, projetar, instalar e testar, depois operar e manter",
            "Instalar rápido e ajustar com o tempo conforme a planta reclama",
          ],
          correta: 1,
          explicacao: "Medir antes de decidir e calcular antes de instalar é a espinha do caderno. Pular a leitura e o cálculo é o que faz sistema desperdiçar água e quebrar cedo.",
        },
      ],
    },
    {
      id: "fontes-casos",
      titulo: "Fontes: casos e governança",
      blocos: [
        { tipo: "texto", texto: "Os endereços abaixo sustentam as experiências reais, a organização coletiva e o marco de uso da água." },
        { tipo: "fontes", titulo: "Casos e governança", itens: [
          { titulo: "American Community Gardening Association — Resources", url: "https://www.communitygarden.org/resources", tipo: "site", nota: "Guias de organização, acordos e exemplos de hortas comunitárias." },
          { titulo: "FAO — Irrigation scheduling (manejo na prática)", url: "https://www.fao.org/4/W4367E/w4367e04.htm", tipo: "artigo", nota: "Contexto técnico do manejo da rega em operação real." },
        ] },
      ],
    },

    // ===================== CAPÍTULO 9 — RECURSOS E SÍNTESE =====================
    {
      id: "caixa-ferramentas",
      titulo: "Caixa de ferramentas aberta",
      blocos: [
        { tipo: "texto", texto: "Este caderno é um ponto de partida com lastro. Para ir além, guarde estes recursos abertos: manuais, normas e cartilhas públicas. Antes de projetar de verdade, baixe os dados do seu local e confirme sempre a versão vigente de cada norma na ABNT e no seu município, porque normas são revisadas." },
        { tipo: "fontes", titulo: "Manuais e guias", itens: [
          { titulo: "FAO — Crop evapotranspiration (Paper 56)", url: "https://www.fao.org/4/x0490e/x0490e00.htm", tipo: "livro", nota: "ETo, Kc, ETc, água no solo e agendamento." },
          { titulo: "FAO — Irrigation Methods (Training Manual 5)", url: "https://www.fao.org/4/s8684e/s8684e00.htm", tipo: "livro", nota: "Métodos de irrigação, com o capítulo de gotejamento." },
          { titulo: "FAO — Water quality for agriculture (Paper 29)", url: "https://www.fao.org/4/t0234e/t0234e00.htm", tipo: "livro", nota: "Aptidão da água de irrigação e risco de obstrução." },
          { titulo: "Embrapa Hortaliças — Controle da irrigação de hortaliças", url: "https://www.infoteca.cnptia.embrapa.br/bitstream/doc/939283/1/5ControledaIrrigacaodeHortalicas.pdf", tipo: "livro", nota: "Manejo nacional de irrigação em hortaliças." },
          { titulo: "Embrapa — Manejo da irrigação com o sensor Irrigas", url: "https://www.infoteca.cnptia.embrapa.br/infoteca/bitstream/doc/1017645/1/LivroIRRIGASVersaoFinal2015Internet.pdf", tipo: "livro", nota: "Tensiometria de baixo custo, tecnologia brasileira." },
          { titulo: "American Community Gardening Association — Resources", url: "https://www.communitygarden.org/resources", tipo: "site", nota: "Como começar e governar uma horta comunitária." },
        ] },
      ],
    },
    {
      id: "datasets-normas",
      titulo: "Datasets e normas",
      blocos: [
        { tipo: "texto", texto: "Para calcular e para calibrar, use dados abertos e as normas vigentes. Os datasets dão os números do seu local; as normas dizem o que a lei exige de qualidade da água, de instalação elétrica e de aproveitamento de chuva." },
        { tipo: "fontes", titulo: "Dados e normas", itens: [
          { titulo: "INMET — Normais Climatológicas", url: "https://portal.inmet.gov.br/normais", tipo: "dataset", nota: "Temperatura, umidade e chuva por estação, base da ETo e da reserva de chuva." },
          { titulo: "Strypsteen et al. — sensores capacitivos de baixo custo (Zenodo)", url: "https://zenodo.org/records/16911016", tipo: "dataset", nota: "Dados abertos para praticar calibração e validação de sensores." },
          { titulo: "ABNT NBR 5410 — Instalações elétricas de baixa tensão", url: "https://www.target.com.br/produtos/normas-tecnicas/28721/nbr5410-instalacoes-eletricas-de-baixa-tensao", tipo: "norma", nota: "Segurança elétrica da motobomba e dos pontos de energia." },
          { titulo: "ABNT NBR 15527 — Água de chuva de coberturas (catálogo ABNT)", url: "https://www.abntcatalogo.com.br/", tipo: "norma", nota: "Aproveitamento de água de chuva não potável para irrigação. Busque pelo número 15527." },
          { titulo: "IEC 60529 — Degrees of protection (IP Code)", url: "https://webstore.iec.ch/publication/2452", tipo: "norma", nota: "Graus de proteção IP para vedar eletrônica e conexões no campo." },
        ] },
      ],
    },
    {
      id: "videos-aprofundar",
      titulo: "Vídeos para aprofundar",
      blocos: [
        { tipo: "texto", texto: "Para ver na prática o que o caderno descreve, volte a estes vídeos reais. O primeiro mostra o manejo por sensor de umidade; o segundo, a lógica da agrofloresta e do cultivo integrado, útil para pensar a sucessão de culturas na horta." },
        { tipo: "video", titulo: "Water Your Garden with IoT - Soil Moisture Sensors", youtube: "pgGpuws7f9o" },
        { tipo: "video", titulo: "A INTELIGÊNCIA DA FLORESTA - Ernst Götsch | FRUTO 2018", youtube: "kYKf8f_KByI" },
      ],
    },
    {
      id: "glossario",
      titulo: "Glossário de campo",
      blocos: [
        { tipo: "texto", texto: "ETo: evapotranspiração de referência, a sede do clima em mm/dia. Kc: coeficiente da cultura, que ajusta a ETo à planta e ao estágio. ETc: evapotranspiração da cultura (Kc x ETo), a água que a planta consome. Lâmina: altura de água aplicada, em mm; 1 mm é 1 litro por metro quadrado." },
        { tipo: "texto", texto: "Capacidade de campo (CC): água que o solo retém após drenar. Ponto de murcha (PMP): limite em que a raiz não puxa mais água. Fração de depleção (p): parte da água disponível gasta antes de regar. Bulbo molhado: volume de solo úmido sob o emissor. Uniformidade: quão igual todos os emissores aplicam. Perda de carga: pressão que o atrito do cano consome." },
        { tipo: "tarefas", itens: [
          { id: "glossario-proprio", titulo: "Faça seu glossário", entrega: "Escreva com suas palavras a definição de ETc, lâmina, bulbo molhado e uniformidade, usando um exemplo da sua própria horta." },
        ] },
      ],
    },
    {
      id: "erros-comuns",
      titulo: "Os erros mais comuns",
      blocos: [
        { tipo: "texto", texto: "Os tropeços se repetem de horta em horta. Instalar sem filtro (emissor entope em semanas). Linha lateral longa demais (a ponta passa sede). Regar por relógio ignorando a chuva (desperdício e raiz afogada). Esquecer a manutenção do filtro (pressão cai e ninguém entende por quê). Ligar bomba por conta própria (risco de choque)." },
        { tipo: "texto", texto: "Outro clássico: projetar a instalação e esquecer a operação. A horta que não define quem rega, quem limpa e quem registra morre quando o entusiasmo inicial passa, por melhor que seja o equipamento. Este caderno insiste no acordo coletivo justamente porque a técnica sozinha não rega." },
        {
          tipo: "licao",
          pergunta: "Qual destes é o erro que mais mata hortas comunitárias, mesmo com bom equipamento?",
          alternativas: [
            "Escolher a cor errada da fita",
            "Não definir quem opera e mantém o sistema no dia a dia",
            "Plantar hortaliça demais de uma vez",
          ],
          correta: 1,
          explicacao: "A infraestrutura não se cuida sozinha. Sem acordo de quem opera e mantém, o melhor sistema para de funcionar quando o ânimo inicial passa.",
        },
      ],
    },
    {
      id: "recursos-aprofundar",
      titulo: "Recursos para continuar",
      blocos: [
        { tipo: "texto", texto: "Guarde esta última caixa e feche o caderno com o próximo passo: baixar os dados do seu local e confirmar as normas vigentes. A partir daqui, o projeto é seu, com lastro em quem já estudou e documentou cada etapa." },
        { tipo: "fontes", titulo: "Para continuar", itens: [
          { titulo: "FAO — Irrigation scheduling (Water Report 8)", url: "https://www.fao.org/4/W4367E/w4367e04.htm", tipo: "artigo", nota: "Aprofundar o agendamento da rega e seus limites." },
          { titulo: "FAO GSP — Soil texture by the ribbon test", url: "https://www.fao.org/fileadmin/user_upload/GSP/GSDP/Field_exercises/New_format_EN/P01b-Texture-Ribbon-EN.pdf", tipo: "artigo", nota: "Reforçar a classificação de textura do solo em campo." },
          { titulo: "DFRobot — Capacitive Soil Moisture Sensor SEN0193", url: "https://wiki.dfrobot.com/sen0193/docs/18036", tipo: "site", nota: "Documentação e código do sensor capacitivo para automatizar a rega." },
          { titulo: "INMET — Normais Climatológicas", url: "https://portal.inmet.gov.br/normais", tipo: "dataset", nota: "Baixe os dados climáticos do seu município antes de projetar." },
        ] },
        { tipo: "tarefas", itens: [
          { id: "baixar-dados", titulo: "Baixe os dados do seu local", entrega: "Salve a normal climatológica da estação INMET mais próxima e anote a textura do solo de três pontos da sua horta. Anexe ao projeto." },
        ] },
      ],
    },
    {
      id: "compilado",
      titulo: "Prancha de síntese",
      blocos: [
        { tipo: "texto", texto: "Você percorreu o caminho inteiro: leu o local, entendeu o gotejamento, calculou a água da cultura e a vazão do sistema, projetou, instalou, testou e organizou operação, manutenção e governança. Arraste os cards pelo carimbo para montar o projeto da sua horta na ordem que fizer sentido para o seu grupo; abaixo da prancha, suas anotações e imagens aparecem na ordem das páginas. Lembre a regra do caderno: medir antes de decidir, calcular antes de instalar, e chamar o profissional habilitado onde a lei e a segurança exigem." },
        { tipo: "compilado" },
      ],
    },
  ],
};
