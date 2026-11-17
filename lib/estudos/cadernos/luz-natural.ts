import type { CadernoEstudo } from "../cadernosEstudo";

/**
 * Caderno de campo: "Luz natural e ventilação no projeto de uma residência".
 * Conforto ambiental aplicado ao projeto: da geometria solar e do clima local
 * ao dimensionamento de janelas, ventilação cruzada, efeito chaminé e proteção
 * solar — com normas (NBR 15575, NBR 15220, NBR ISO/CIE 8995-1), dados abertos
 * (EPW, INMET, NOAA) e casos reais. Todo número, técnica, norma e desenho tem
 * lastro em fonte real (ver páginas "fontes").
 */
export const caderno: CadernoEstudo = {
  id: "luz-natural",
  titulo: "Luz natural e ventilação no projeto de uma residência",
  resumo:
    "Projetar a casa para o sol e o vento certos: ler a geometria solar e o clima do terreno, dimensionar janelas e aberturas, resolver ventilação cruzada, efeito chaminé e proteção solar — com normas brasileiras, dados climáticos abertos e casos reais.",
  paginas: [
    // ===================== CONTEXTO =====================
    {
      id: "abertura",
      titulo: "A casa começa no sol e no vento",
      blocos: [
        { tipo: "texto", texto: "Antes de desenhar uma parede, o projeto já decidiu se a casa vai ser clara ou escura, abafada ou arejada. Isso é escolhido na implantação: para onde a casa se vira, onde ficam as janelas, que altura tem o pé-direito, por onde o ar entra e por onde sai. Luz natural e ventilação não são 'acabamentos' — são o partido. Depois de pronta, pouca coisa conserta uma casa que nasceu de costas para o sol e sem caminho para o vento." },
        { tipo: "texto", texto: "Este caderno trata do que o projetista de uma residência precisa resolver para que a luz do dia ilumine sem ofuscar nem esquentar, e para que o ar troque sozinho, sem depender de ar-condicionado. O caminho vai da leitura do céu e do clima do lugar até o dimensionamento de cada abertura, a proteção solar e a maneira de morar a casa. Cada decisão aqui tem fonte: norma, dado climático aberto ou literatura técnica." },
        { tipo: "diagrama", titulo: "As quatro decisoes que definem luz e ar", codigo: `flowchart LR
  I["Implantacao e orientacao"] --> A["Aberturas: tamanho, altura, posicao"]
  A --> P["Protecao solar e luz difusa"]
  P --> V["Caminho do ar: cruzada e chamine"]
  V --> C["Casa clara, fresca e de baixa conta"]` },
      ],
    },
    {
      id: "o-que-esta-em-jogo",
      titulo: "O que está em jogo: saúde, energia e conforto",
      blocos: [
        { tipo: "texto", texto: "Luz e ar não são luxo. A Organização Mundial da Saúde, nas suas diretrizes de moradia e saúde (2018), associa a qualidade da habitação — incluindo iluminação, temperatura interna e ventilação — à saúde dos moradores. Luz natural regula o relógio biológico (ritmo circadiano) e reduz o uso de energia; ventilação renova o ar, controla umidade e dilui poluentes de dentro de casa (cozinhar, mofo, produtos de limpeza)." },
        { tipo: "texto", texto: "Do lado da energia: iluminação e climatização estão entre os maiores consumos de uma residência. Uma casa bem orientada, com janelas bem dimensionadas e proteção solar correta, acende menos lâmpadas de dia e liga menos o ar-condicionado. No Brasil, a NBR 15575 (Edificações Habitacionais — Desempenho) trata a iluminação natural e o desempenho térmico como requisitos mínimos de uma habitação, não como opcionais." },
        {
          tipo: "fontes",
          titulo: "Fontes desta etapa",
          itens: [
            { titulo: "WHO Housing and health guidelines (OMS, 2018)", url: "https://www.who.int/publications/i/item/9789241550376", tipo: "norma", nota: "Diretrizes que ligam qualidade da moradia (luz, temperatura, ventilação) à saúde." },
            { titulo: "LabEEE/UFSC — Nota técnica sobre a NBR 15575 (desempenho de edificações)", url: "https://labeee.ufsc.br/sites/default/files/publicacoes/notas_tecnicas/NT_15575_FINAL.pdf", tipo: "norma", nota: "Interpretação técnica dos requisitos de desempenho térmico e lumínico da NBR 15575." },
          ],
        },
        {
          tipo: "licao",
          pergunta: "Por que luz natural e ventilação são tratadas como requisitos de projeto, e não como acabamento?",
          alternativas: [
            "Porque deixam a casa mais bonita nas fotos",
            "Porque dependem de implantação, forma e aberturas — decisões iniciais que afetam saúde, energia e conforto e são caras de corrigir depois",
            "Porque a norma proíbe ar-condicionado",
          ],
          correta: 1,
          explicacao: "Orientação, forma e posição das aberturas se decidem no partido. Erradas, condenam a casa a ser escura ou abafada, e quase nada conserta isso sem obra pesada.",
        },
      ],
    },
    {
      id: "vocabulario",
      titulo: "O vocabulário mínimo",
      blocos: [
        { tipo: "texto", texto: "Para falar de luz e ar com precisão, cinco palavras bastam no começo. ILUMINÂNCIA (lux, lx): quanta luz chega a um plano de trabalho — 300 lx para tarefas gerais, 500 lx para leitura/escritório (NBR ISO/CIE 8995-1). FATOR DE LUZ DIURNA (FLD, %): a razão entre a luz interna e a luz externa sob céu encoberto — quanto do céu 'entra' naquele ponto. OFUSCAMENTO: excesso de contraste que incomoda a vista (sol direto na tela, janela 'estourada')." },
        { tipo: "texto", texto: "Do lado do ar: VENTILAÇÃO CRUZADA é o ar entrando por uma abertura e saindo por outra, empurrado pela diferença de pressão do vento. EFEITO CHAMINÉ (stack effect) é o ar quente, mais leve, subindo e saindo por uma abertura alta enquanto o ar fresco entra por baixo — funciona mesmo sem vento, pela diferença de temperatura. TROCAS DE AR POR HORA (ACH) medem quantas vezes por hora o volume de ar do cômodo é renovado." },
        { tipo: "diagrama", titulo: "Mapa das grandezas", codigo: `flowchart TD
  L["LUZ"] --> IL["Iluminancia (lux)"]
  L --> FLD["Fator de Luz Diurna (%)"]
  L --> OF["Ofuscamento (contraste)"]
  AR["AR"] --> VC["Ventilacao cruzada (pressao do vento)"]
  AR --> EC["Efeito chamine (diferenca de temperatura)"]
  AR --> ACH["Trocas de ar por hora (ACH)"]` },
        {
          tipo: "fontes",
          titulo: "Referências de iluminação e ventilação",
          itens: [
            { titulo: "Daylighting (architecture) — fundamentos e fator de luz diurna", url: "https://en.wikipedia.org/wiki/Daylighting_(architecture)", tipo: "site", nota: "Panorama de métricas de luz natural, incluindo daylight factor." },
            { titulo: "Natural ventilation — conceitos e tipos", url: "https://en.wikipedia.org/wiki/Natural_ventilation", tipo: "site", nota: "Ventilação cruzada, efeito chaminé e diferenças de pressão." },
          ],
        },
      ],
    },
    {
      id: "luz-e-ar-sao-partido",
      titulo: "Luz e ar se decidem cedo (e barato)",
      blocos: [
        { tipo: "texto", texto: "Existe uma hierarquia de custo. No começo do projeto, girar a casa no terreno, mudar a posição de um cômodo ou abrir uma janela para outro lado custa um traço. Depois da fundação, isso custa obra; depois de pronta, custa quebra-quebra ou ar-condicionado para sempre. Por isso a leitura do sol e do vento vem ANTES da planta, não depois. A planta se acomoda ao clima, e não o contrário." },
        {
          tipo: "prancha",
          titulo: "A curva do custo de decidir luz e ar",
          desenho: {
            legenda: "Decidir cedo (concepcao) custa um traco. Decidir tarde (obra pronta) custa quebra e energia para sempre.",
            primitivas: [
              { t: "linha", de: [30, 170], ate: [285, 170], cor: "tinta" },
              { t: "linha", de: [30, 170], ate: [30, 20], cor: "tinta" },
              { t: "curva", pts: [[30, 160], [90, 150], [150, 120], [210, 70], [270, 25]], cor: "destaque" },
              { t: "rotulo", p: [40, 150], texto: "concepcao" },
              { t: "rotulo", p: [120, 120], texto: "projeto" },
              { t: "rotulo", p: [185, 70], texto: "obra" },
              { t: "rotulo", p: [215, 40], texto: "pronta" },
              { t: "rotulo", p: [8, 95], texto: "custo" },
              { t: "rotulo", p: [95, 182], texto: "tempo do projeto" },
            ],
          },
        },
        { tipo: "texto", texto: "Isto não é teoria: a arquitetura bioclimática parte exatamente daí — projetar respondendo ao clima do lugar para alcançar conforto gastando o mínimo de energia. O ponto de partida é sempre o mesmo par de perguntas: de onde vem o sol em cada estação, e de onde sopra o vento predominante aqui?" },
        {
          tipo: "mobilizacao",
          papel: "Arquiteto(a) ou engenheiro(a) civil responsável pelo projeto",
          porque: "O projeto arquitetônico de uma residência exige um profissional habilitado que assine a Anotação/Registro de Responsabilidade Técnica (ART do CREA ou RRT do CAU) e responda legalmente pela solução adotada, inclusive pelo atendimento à NBR 15575 e ao código de obras do município.",
          entregaEsperada: "Projeto arquitetônico aprovável, com implantação orientada ao sol e ao vento, plantas, cortes, quadro de esquadrias e ART/RRT emitida.",
          gerenciadoPor: "zaeon",
        },
      ],
    },
    // ===================== LEITURA DO LOCAL / TEMA =====================
    {
      id: "geometria-solar",
      titulo: "O caminho do sol sobre o terreno",
      blocos: [
        { tipo: "texto", texto: "O sol nasce a leste e se põe a oeste, mas a altura que ele alcança ao meio-dia muda com a estação por causa da inclinação da Terra (declinação solar, que varia de +23,45° a -23,45° ao longo do ano). No hemisfério sul, ao meio-dia solar o sol fica ao NORTE do observador na maior parte do ano. A altura máxima do sol ao meio-dia é, aproximadamente, 90° menos a diferença entre a latitude do lugar e a declinação do dia." },
        { tipo: "texto", texto: "A consequência para o projeto é direta: no hemisfério sul, a fachada NORTE recebe sol o ano inteiro — alto no verão, baixo e penetrante no inverno. A fachada SUL quase não recebe sol direto. Leste pega sol da manhã (mais ameno); oeste pega sol da tarde (o mais quente e difícil de barrar, porque chega baixo). Saber isso para a latitude exata do terreno é o primeiro dado de projeto." },
        {
          tipo: "prancha",
          titulo: "Altura do sol ao meio-dia: verao x inverno (hemisferio sul)",
          desenho: {
            legenda: "No inverno o sol do meio-dia fica mais baixo e entra fundo pela fachada norte; no verao fica alto.",
            primitivas: [
              { t: "linha", de: [20, 165], ate: [285, 165], cor: "tinta" },
              { t: "retangulo", p: [120, 95], w: 70, h: 70, cor: "tinta" },
              { t: "rotulo", p: [135, 135], texto: "casa" },
              { t: "circulo", c: [70, 45], r: 10, cor: "destaque" },
              { t: "seta", de: [70, 55], ate: [118, 110], cor: "destaque" },
              { t: "rotulo", p: [40, 38], texto: "verao (alto)" },
              { t: "circulo", c: [40, 110], r: 10, cor: "suave" },
              { t: "seta", de: [50, 112], ate: [118, 135], cor: "suave" },
              { t: "rotulo", p: [18, 100], texto: "inverno (baixo)" },
              { t: "rotulo", p: [205, 120], texto: "Norte" },
              { t: "seta", de: [195, 125], ate: [230, 125], cor: "tinta" },
            ],
          },
        },
        {
          tipo: "fontes",
          titulo: "Ferramentas de posição solar",
          itens: [
            { titulo: "NOAA Global Monitoring Laboratory — Solar Calculator", url: "https://gml.noaa.gov/grad/solcalc/", tipo: "site", nota: "Calcula azimute e altura do sol para qualquer latitude, data e hora." },
            { titulo: "Andrew Marsh — Sun-Path 3D (ferramenta interativa)", url: "https://drajmarsh.bitbucket.io/sunpath3d.html", tipo: "site", nota: "Carta solar 3D interativa para visualizar o percurso do sol no terreno." },
          ],
        },
      ],
    },
    {
      id: "carta-solar",
      titulo: "A carta solar: o céu numa folha",
      blocos: [
        { tipo: "texto", texto: "A CARTA SOLAR (ou diagrama de trajetória solar) é a projeção, numa folha, de todos os caminhos que o sol faz no céu daquele lugar ao longo do ano. Cada curva é um dia (solstícios e equinócios); as linhas que cruzam marcam as horas. Com a carta da latitude certa você lê, para qualquer momento, de onde vem o sol (azimute) e quão alto ele está (altura). É o instrumento clássico do conforto ambiental." },
        { tipo: "texto", texto: "A carta serve para duas coisas no projeto: decidir a orientação (onde colocar cada cômodo e abertura) e projetar a proteção solar. Sobre a carta se desenha a MÁSCARA DE SOMBRA — a região do céu que um beiral, um brise ou o vizinho bloqueiam. Onde a máscara cobre a trajetória do sol, há sombra naquele horário; onde não cobre, entra sol. Primeiro passo prático: corte a carta na metade correspondente à fachada que você está estudando." },
        {
          tipo: "prancha",
          titulo: "Leitura da carta solar (esquema)",
          desenho: {
            legenda: "Curvas = dias do ano (solsticios/equinocio). Linhas cruzadas = horas. O ponto diz azimute e altura do sol.",
            primitivas: [
              { t: "circulo", c: [150, 100], r: 80, cor: "tinta" },
              { t: "circulo", c: [150, 100], r: 52, cor: "suave" },
              { t: "circulo", c: [150, 100], r: 26, cor: "suave" },
              { t: "curva", pts: [[75, 105], [150, 55], [225, 105]], cor: "destaque" },
              { t: "curva", pts: [[80, 110], [150, 85], [220, 110]], cor: "suave" },
              { t: "linha", de: [95, 140], ate: [205, 60], cor: "suave" },
              { t: "rotulo", p: [150, 15], texto: "N" },
              { t: "rotulo", p: [233, 100], texto: "L" },
              { t: "rotulo", p: [60, 100], texto: "O" },
              { t: "rotulo", p: [150, 190], texto: "S" },
              { t: "rotulo", p: [158, 55], texto: "verao" },
              { t: "rotulo", p: [158, 88], texto: "inverno" },
            ],
          },
        },
        { tipo: "video", titulo: "Energy 101: Daylighting (U.S. Department of Energy)", youtube: "-7EG4d-W4W8" },
      ],
    },
    {
      id: "orientacao",
      titulo: "Orientar os cômodos pelo sol",
      blocos: [
        { tipo: "texto", texto: "Com o caminho do sol em mãos, cada cômodo pede uma face. No hemisfério sul, a regra prática: quartos e salas de estar ganham com a face NORTE (sol generoso no inverno, fácil de sombrear no verão com beiral). Áreas de serviço, despensas e garagens aceitam o SUL (pouco sol, pouco ganho de calor). Cozinhas e salas de almoço vão bem a LESTE (sol da manhã). O OESTE é o lado a evitar para ambientes de longa permanência — o sol da tarde é baixo, quente e difícil de barrar." },
        { tipo: "diagrama", titulo: "Que comodo vai para cada face (hemisferio sul)", codigo: `flowchart TD
  N["NORTE: sol o ano todo, facil de sombrear"] --> Q["Quartos, sala de estar"]
  L["LESTE: sol da manha, ameno"] --> C["Cozinha, sala de almoco"]
  S["SUL: pouco sol direto"] --> AS["Servico, despensa, garagem"]
  O["OESTE: sol da tarde, quente e baixo"] --> EV["Evitar permanencia; proteger muito"]` },
        {
          tipo: "licao",
          pergunta: "No hemisfério sul, qual fachada costuma receber sol direto o ano inteiro e é a mais fácil de sombrear com beiral?",
          alternativas: ["Sul", "Oeste", "Norte"],
          correta: 2,
          explicacao: "No hemisfério sul o sol do meio-dia fica ao norte. A fachada norte recebe sol alto no verão (barrado por um beiral curto) e baixo no inverno (entra e aquece) — o melhor dos dois mundos.",
        },
        {
          tipo: "tarefas",
          itens: [
            { id: "orient-1", titulo: "Marque o Norte real no terreno", entrega: "Foto do terreno com a seta do norte geográfico (bússola/app) e a indicação de leste e oeste." },
            { id: "orient-2", titulo: "Distribua os cômodos por face", entrega: "Croqui de implantação com cada ambiente na face recomendada e a justificativa em uma linha por cômodo." },
          ],
        },
      ],
    },
    {
      id: "clima-local",
      titulo: "O clima do lugar manda no partido",
      blocos: [
        { tipo: "texto", texto: "A mesma casa que é ótima em Curitiba é um forno em Teresina. Por isso o Brasil tem um ZONEAMENTO BIOCLIMÁTICO: a NBR 15220-3 divide o território em 8 zonas e, para cada uma, recomenda estratégias construtivas (tamanho de abertura, necessidade de sombreamento, ventilação, inércia térmica). A zona bioclimática do terreno é um dado de projeto tão básico quanto a latitude." },
        { tipo: "texto", texto: "Para ir além da zona, use dados climáticos reais da cidade: temperatura, umidade, radiação e vento mês a mês. Há arquivos climáticos abertos (formato EPW, usado em simulação) e as normais climatológicas do INMET. Com esses dados você sabe se o problema dominante é calor (ventilar e sombrear) ou frio (ganhar e guardar sol), e em que meses." },
        {
          tipo: "fontes",
          titulo: "Dados climáticos e zoneamento",
          itens: [
            { titulo: "Climate.OneBuilding.Org — arquivos climáticos EPW por cidade", url: "https://climate.onebuilding.org/", tipo: "dataset", nota: "Repositório aberto de arquivos EPW (temperatura, radiação, vento) para simulação." },
            { titulo: "INMET — Instituto Nacional de Meteorologia (portal e normais)", url: "https://portal.inmet.gov.br/", tipo: "dataset", nota: "Dados observados e normais climatológicas das cidades brasileiras." },
            { titulo: "LabEEE/UFSC — laboratório de eficiência energética em edificações", url: "https://labeee.ufsc.br/", tipo: "site", nota: "Base brasileira sobre zoneamento bioclimático (NBR 15220) e desempenho." },
          ],
        },
        {
          tipo: "licao",
          pergunta: "Para que serve saber a zona bioclimática (NBR 15220-3) do terreno?",
          alternativas: [
            "Para calcular o IPTU",
            "Para escolher estratégias construtivas adequadas ao clima: tamanho de abertura, sombreamento, ventilação e inércia térmica",
            "Para definir a cor da fachada",
          ],
          correta: 1,
          explicacao: "Cada uma das 8 zonas tem recomendações próprias. A estratégia certa para clima quente-úmido (ventilar muito) é o oposto da de clima frio (vedar e aquecer).",
        },
      ],
    },
    {
      id: "ventos",
      titulo: "De onde sopra o vento",
      blocos: [
        { tipo: "texto", texto: "Ventilação cruzada só existe se o ar tiver de onde entrar e para onde ir, e isso depende da direção do vento dominante do lugar. Essa informação vem da ROSA DOS VENTOS da cidade (frequência e velocidade por direção), disponível nos dados do INMET e nos arquivos EPW. Com ela você decide por qual fachada o ar deve entrar (a barlavento, de frente para o vento) e por qual deve sair (a sotavento, no lado oposto)." },
        {
          tipo: "prancha",
          titulo: "Rosa dos ventos: direcao e frequencia",
          desenho: {
            legenda: "Cada raio aponta uma direcao; o comprimento indica quantas horas o vento sopra dali. O maior manda na entrada de ar.",
            primitivas: [
              { t: "circulo", c: [150, 100], r: 70, cor: "suave" },
              { t: "seta", de: [150, 100], ate: [150, 35], cor: "tinta" },
              { t: "seta", de: [150, 100], ate: [215, 100], cor: "tinta" },
              { t: "seta", de: [150, 100], ate: [150, 165], cor: "tinta" },
              { t: "seta", de: [150, 100], ate: [85, 100], cor: "tinta" },
              { t: "seta", de: [150, 100], ate: [200, 150], cor: "destaque" },
              { t: "rotulo", p: [150, 22], texto: "N" },
              { t: "rotulo", p: [220, 100], texto: "L" },
              { t: "rotulo", p: [150, 182], texto: "S" },
              { t: "rotulo", p: [70, 100], texto: "O" },
              { t: "rotulo", p: [202, 158], texto: "vento dominante SE" },
            ],
          },
        },
        { tipo: "texto", texto: "Atenção ao entorno: o vento 'de catálogo' é o do aeroporto, em campo aberto. No lote real, muros, vizinhos e vegetação desviam e freiam o ar. Em cidade densa, a ventilação cruzada pode ficar fraca — e aí o efeito chaminé (que não depende do vento) ganha importância. Observe também o conforto: vento forte e frio no inverno deve ser barrado; brisa fresca no verão deve ser captada." },
        {
          tipo: "fontes",
          titulo: "Vento e ventilação natural",
          itens: [
            { titulo: "ArchDaily — Ventilação cruzada, efeito chaminé e outros conceitos de ventilação natural", url: "https://www.archdaily.com/887460", tipo: "artigo", nota: "Explica como pressão do vento e temperatura movem o ar na edificação." },
          ],
        },
      ],
    },
    {
      id: "entorno",
      titulo: "O entorno: vizinhos, árvores e obstruções",
      blocos: [
        { tipo: "texto", texto: "Sol e vento chegam ao terreno filtrados pelo que está em volta. Um prédio a norte pode roubar o sol de inverno; uma árvore caduca (que perde folhas) a noroeste pode ser perfeita — sombra no verão, sol no inverno. Levante a altura e a posição dos obstáculos e teste na carta solar quais horários do céu eles bloqueiam em cada fachada. O recuo entre casas, exigido pelo código de obras, é também um corredor de luz e de vento." },
        { tipo: "diagrama", titulo: "O que o entorno faz com sol e vento", codigo: `flowchart LR
  E["Entorno do lote"] --> V["Vizinho alto: sombra e bloqueio de vento"]
  E --> A["Arvore caduca: sombra no verao, sol no inverno"]
  E --> M["Muro: barra vento e luz baixa"]
  E --> R["Recuos: corredor de luz e ventilacao"]` },
        {
          tipo: "prancha",
          titulo: "Arvore caduca a noroeste: a protecao que escolhe a estacao",
          desenho: {
            legenda: "No verao a copa cheia barra o sol baixo da tarde; no inverno, sem folhas, deixa o sol passar.",
            primitivas: [
              { t: "retangulo", p: [160, 90], w: 70, h: 75, cor: "tinta" },
              { t: "rotulo", p: [175, 130], texto: "casa" },
              { t: "linha", de: [70, 165], ate: [70, 110], cor: "tinta" },
              { t: "circulo", c: [70, 90], r: 28, hachura: true, cor: "destaque" },
              { t: "rotulo", p: [30, 55], texto: "copa (verao)" },
              { t: "circulo", c: [245, 40], r: 9, cor: "suave" },
              { t: "seta", de: [240, 48], ate: [100, 95], cor: "suave" },
              { t: "rotulo", p: [215, 25], texto: "sol tarde" },
              { t: "linha", de: [20, 165], ate: [285, 165], cor: "tinta" },
            ],
          },
        },
        {
          tipo: "tarefas",
          itens: [
            { id: "ent-1", titulo: "Mapeie as obstruções", entrega: "Planta do entorno com altura aproximada de muros, vizinhos e árvores nas quatro faces." },
            { id: "ent-2", titulo: "Teste o bloqueio na carta solar", entrega: "Carta solar da fachada crítica com a máscara dos obstáculos marcada e os horários perdidos listados." },
          ],
        },
      ],
    },
    // ===================== METODO =====================
    {
      id: "carta-bioclimatica",
      titulo: "A carta bioclimática de Givoni",
      blocos: [
        { tipo: "texto", texto: "A CARTA BIOCLIMÁTICA (Baruch Givoni, 1992, adaptada no Brasil pela NBR 15220) é um gráfico de temperatura por umidade onde se plotam os dados do clima local. A posição da nuvem de pontos diz qual estratégia resolve cada situação: zona de conforto (nada a fazer), ventilação (calor com umidade), massa térmica e resfriamento evaporativo (calor seco), aquecimento solar e inércia (frio). É o método para transformar o clima medido em decisão de projeto." },
        { tipo: "diagrama", titulo: "Da carta bioclimatica a estrategia", codigo: `flowchart TD
  D["Dados do clima (T e umidade, mes a mes)"] --> P["Plotar na carta de Givoni"]
  P --> Z{"Onde caem os pontos?"}
  Z -->|"calor umido"| VN["Ventilacao natural"]
  Z -->|"calor seco"| ME["Massa termica + evaporativo"]
  Z -->|"frio"| AS["Aquecimento solar passivo + inercia"]
  Z -->|"faixa central"| CF["Conforto: manter"]` },
        { tipo: "texto", texto: "Para o Brasil, o resultado típico da maior parte do território é claro: ventilação natural é a estratégia de verão mais frequente, e ganho solar com massa térmica resolve o frio onde ele aparece. Em cidades de clima quente-úmido (zona bioclimática 8, boa parte do litoral e do Norte), a ventilação cruzada é quase a única carta na mesa, porque o resfriamento evaporativo não funciona com umidade alta." },
        {
          tipo: "licao",
          pergunta: "Por que resfriamento evaporativo (borrifar água, espelho d'água) ajuda pouco no litoral quente-úmido?",
          alternativas: [
            "Porque a água é cara na praia",
            "Porque com umidade do ar já alta, evaporar mais água esfria pouco — a estratégia que sobra é ventilar",
            "Porque evaporação só funciona de noite",
          ],
          correta: 1,
          explicacao: "O resfriamento evaporativo depende de o ar estar seco para 'puxar' a evaporação. No ar já úmido ele satura rápido e esfria pouco; por isso o clima quente-úmido pede ventilação.",
        },
      ],
    },
    {
      id: "estrategias-passivas",
      titulo: "O leque de estratégias passivas",
      blocos: [
        { tipo: "texto", texto: "Estratégias passivas são as que trabalham sem motor, só com a forma da casa e os materiais. Para calor: ventilar (cruzada e chaminé), sombrear (beiral, brise, vegetação), refletir (cores claras, telhado claro) e isolar a cobertura. Para frio: captar sol pelo norte, guardar calor em paredes e pisos pesados (inércia), vedar frestas e isolar. Toda casa combina algumas; o clima diz a dose." },
        {
          tipo: "prancha",
          titulo: "Secao esquematica: estrategias de calor e de frio na mesma casa",
          desenho: {
            legenda: "Beiral que sombreia no verao e deixa entrar o sol de inverno; ar entra baixo e sai alto; cobertura isolada.",
            primitivas: [
              { t: "linha", de: [20, 170], ate: [285, 170], cor: "tinta" },
              { t: "retangulo", p: [70, 90], w: 150, h: 80, cor: "tinta" },
              { t: "linha", de: [55, 90], ate: [150, 50], cor: "tinta" },
              { t: "linha", de: [150, 50], ate: [235, 90], cor: "tinta" },
              { t: "linha", de: [220, 90], ate: [250, 90], cor: "destaque" },
              { t: "rotulo", p: [245, 84], texto: "beiral" },
              { t: "seta", de: [40, 150], ate: [78, 150], cor: "suave" },
              { t: "rotulo", p: [20, 160], texto: "ar entra baixo" },
              { t: "seta", de: [150, 88], ate: [150, 58], cor: "destaque" },
              { t: "rotulo", p: [155, 70], texto: "ar quente sobe e sai" },
              { t: "rotulo", p: [90, 45], texto: "cobertura isolada" },
            ],
          },
        },
        {
          tipo: "fontes",
          titulo: "Estratégias de ventilação natural",
          itens: [
            { titulo: "ArchDaily — De volta ao básico: ventilação natural e seus usos em diferentes contextos", url: "https://www.archdaily.com/963706/back-to-basics-natural-ventilation-and-its-use-in-different-contexts", tipo: "artigo", nota: "Quando usar cada tipo de ventilação natural conforme o contexto." },
            { titulo: "Stack effect (efeito chaminé) — princípio físico", url: "https://en.wikipedia.org/wiki/Stack_effect", tipo: "site", nota: "Como a diferença de temperatura e a altura geram tiragem sem vento." },
          ],
        },
      ],
    },
    {
      id: "ferramentas",
      titulo: "As ferramentas de análise",
      blocos: [
        { tipo: "texto", texto: "Da conta de guardanapo à simulação, há uma escada de ferramentas. GRÁTIS e rápidas: carta solar e sun-path 3D (altura e azimute do sol), calculadora solar da NOAA, e o teste de máscara de sombra. MÉDIAS: Climate Consultant (plota o clima na carta bioclimática e sugere estratégias) e estudos de insolação no modelo 3D (SketchUp, Revit). AVANÇADAS: simulação de luz (Radiance/DIALux) e de energia (EnergyPlus) para quantificar sDA, ASE e consumo." },
        { tipo: "diagrama", titulo: "Escada de ferramentas por esforco", codigo: `flowchart LR
  G["Gratis/rapido: carta solar, sun-path, NOAA"] --> M["Medio: Climate Consultant, estudo de sombra 3D"]
  M --> A["Avancado: Radiance/DIALux (luz), EnergyPlus (energia)"]` },
        { tipo: "texto", texto: "Regra de bom senso: comece pela ferramenta mais simples que responde à pergunta. A carta solar já resolve 'esta janela pega sol às 15h de janeiro?'. A simulação só se paga quando a decisão é cara (uma fachada inteira de vidro, uma certificação, o nível superior da NBR 15575). Não se simula o que um beiral bem desenhado já resolve." },
        {
          tipo: "fontes",
          titulo: "Dados e simulação",
          itens: [
            { titulo: "Climate.OneBuilding.Org — EPW para simulação energética", url: "https://climate.onebuilding.org/", tipo: "dataset", nota: "Arquivos de entrada para EnergyPlus, DesignBuilder, Climate Consultant." },
            { titulo: "NOAA Solar Calculator — posição do sol", url: "https://gml.noaa.gov/grad/solcalc/", tipo: "site", nota: "Confere azimute/altura para validar estudos de insolação." },
          ],
        },
      ],
    },
    {
      id: "como-medir",
      titulo: "Medir é diferente de achar",
      blocos: [
        { tipo: "texto", texto: "Antes de reformar ou para validar um projeto entregue, meça. LUXÍMETRO: mede iluminância (lux) no plano de trabalho, em vários pontos e horários — é como se verifica se um cômodo bate os 300 ou 500 lx exigidos. ANEMÔMETRO: mede a velocidade do ar nas aberturas, para saber se a ventilação cruzada realmente acontece. DATA LOGGER de temperatura e umidade: registra o ambiente por dias, revelando as horas de desconforto que uma medição pontual esconde." },
        {
          tipo: "prancha",
          titulo: "Malha de medicao de iluminancia no comodo",
          desenho: {
            legenda: "Mede-se em uma grade de pontos no plano de trabalho (0,75 m do piso), nao so no centro.",
            primitivas: [
              { t: "retangulo", p: [60, 40], w: 180, h: 120, cor: "tinta" },
              { t: "retangulo", p: [60, 40], w: 30, h: 120, hachura: true, cor: "destaque" },
              { t: "rotulo", p: [62, 32], texto: "janela" },
              { t: "circulo", c: [110, 70], r: 4, cor: "tinta" },
              { t: "circulo", c: [150, 70], r: 4, cor: "tinta" },
              { t: "circulo", c: [190, 70], r: 4, cor: "tinta" },
              { t: "circulo", c: [110, 110], r: 4, cor: "tinta" },
              { t: "circulo", c: [150, 110], r: 4, cor: "tinta" },
              { t: "circulo", c: [190, 110], r: 4, cor: "tinta" },
              { t: "circulo", c: [110, 145], r: 4, cor: "tinta" },
              { t: "circulo", c: [150, 145], r: 4, cor: "tinta" },
              { t: "circulo", c: [190, 145], r: 4, cor: "tinta" },
              { t: "rotulo", p: [95, 185], texto: "pontos de leitura (lux)" },
            ],
          },
        },
        {
          tipo: "mobilizacao",
          papel: "Técnico ou laboratório com instrumentos calibrados",
          porque: "Para medições que viram laudo (comprovação de desempenho lumínico/térmico da NBR 15575, perícia, certificação), os aparelhos precisam de calibração rastreável e o procedimento precisa seguir protocolo — o que exige técnico habilitado e instrumento com certificado de calibração válido.",
          entregaEsperada: "Relatório de medição de iluminância (grade de pontos, horários), velocidade do ar nas aberturas e registro de temperatura/umidade, com instrumentos calibrados identificados.",
          gerenciadoPor: "zaeon",
        },
      ],
    },
    // ===================== CALCULO / MEDICAO =====================
    {
      id: "iluminancia-niveis",
      titulo: "Quanta luz cada tarefa pede",
      blocos: [
        { tipo: "texto", texto: "Luz se mede pela tarefa, não pelo cômodo. A NBR ISO/CIE 8995-1 (iluminação de ambientes de trabalho) fixa os níveis de referência: circulação e áreas de passagem perto de 100 lx; ambientes gerais e sociais em torno de 150 a 200 lx; tarefas comuns (cozinhar, refeições) 300 lx; leitura, estudo e trabalho fino 500 lx. Esses valores podem ser atendidos por luz natural, artificial ou pela soma das duas." },
        {
          tipo: "prancha",
          titulo: "Escada de iluminancia por tarefa (lux)",
          desenho: {
            legenda: "Quanto mais fina a tarefa, mais lux. A luz natural deve mirar esses alvos de dia.",
            primitivas: [
              { t: "linha", de: [30, 170], ate: [30, 20], cor: "tinta" },
              { t: "linha", de: [30, 170], ate: [285, 170], cor: "tinta" },
              { t: "retangulo", p: [45, 150], w: 35, h: 20, cor: "suave" },
              { t: "rotulo", p: [45, 145], texto: "100 circulacao" },
              { t: "retangulo", p: [100, 120], w: 35, h: 50, cor: "suave" },
              { t: "rotulo", p: [95, 115], texto: "200 estar" },
              { t: "retangulo", p: [155, 95], w: 35, h: 75, cor: "destaque" },
              { t: "rotulo", p: [150, 90], texto: "300 cozinha" },
              { t: "retangulo", p: [210, 55], w: 35, h: 115, cor: "destaque" },
              { t: "rotulo", p: [205, 50], texto: "500 leitura" },
            ],
          },
        },
        { tipo: "texto", texto: "Para a luz natural, a NBR 15575-5 estabelece critérios de desempenho lumínico das habitações (métodos de avaliação e níveis mínimos). Um parâmetro citado para ambientes de permanência é um fator de luz diurna mínimo da ordem de 0,5%. A mensagem de projeto: não basta 'ter janela' — a janela tem de entregar o nível da tarefa no ponto onde a tarefa acontece, e não só junto ao vidro." },
        {
          tipo: "fontes",
          titulo: "Normas de iluminação",
          itens: [
            { titulo: "LabEEE/UFSC — Nota técnica sobre a NBR 15575 (desempenho, inclui iluminação natural)", url: "https://labeee.ufsc.br/sites/default/files/publicacoes/notas_tecnicas/NT_15575_FINAL.pdf", tipo: "norma", nota: "Critérios de desempenho lumínico e térmico da habitação." },
            { titulo: "Daylighting (architecture) — níveis e métricas de luz", url: "https://en.wikipedia.org/wiki/Daylighting_(architecture)", tipo: "site", nota: "Contexto internacional de iluminância e fator de luz diurna." },
          ],
        },
      ],
    },
    {
      id: "fator-luz-diurna",
      titulo: "Fator de luz diurna: o céu que entra",
      blocos: [
        { tipo: "texto", texto: "O FATOR DE LUZ DIURNA (FLD) é a razão, em porcentagem, entre a iluminância num ponto interno e a iluminância que haveria ao ar livre sob céu encoberto padrão, no mesmo instante. Um FLD de 2% num ponto significa que ele recebe 2% da luz externa: se lá fora há 10.000 lx de céu encoberto, aquele ponto tem 200 lx. É uma medida que não depende do dia específico — descreve a 'geometria' de luz do cômodo." },
        { tipo: "texto", texto: "O FLD tem três parcelas: a componente do céu (quanto de céu a janela 'vê' daquele ponto), a componente refletida externa (luz que vem de superfícies de fora) e a componente refletida interna (luz que ricocheteia em paredes e teto claros). Daí duas lições de projeto: janela alta 'enxerga' mais céu e leva luz mais fundo; e paredes e teto claros multiplicam a luz que já entrou. Valores de referência úteis: cômodos de estar costumam mirar FLD médio de 2% a 5%." },
        {
          tipo: "prancha",
          titulo: "As tres componentes do fator de luz diurna",
          desenho: {
            legenda: "Ceu direto pela janela, reflexao externa (chao/vizinho) e reflexao interna (paredes e teto claros).",
            primitivas: [
              { t: "retangulo", p: [60, 50], w: 170, h: 110, cor: "tinta" },
              { t: "retangulo", p: [60, 55], w: 12, h: 60, hachura: true, cor: "destaque" },
              { t: "rotulo", p: [30, 52], texto: "janela" },
              { t: "seta", de: [45, 45], ate: [160, 120], cor: "destaque" },
              { t: "rotulo", p: [120, 70], texto: "ceu direto" },
              { t: "seta", de: [50, 150], ate: [150, 130], cor: "suave" },
              { t: "rotulo", p: [60, 160], texto: "reflexao externa" },
              { t: "seta", de: [200, 60], ate: [150, 120], cor: "suave" },
              { t: "rotulo", p: [150, 55], texto: "reflexao interna (teto claro)" },
            ],
          },
        },
        {
          tipo: "licao",
          pergunta: "Um ponto tem FLD de 2% e o céu encoberto externo marca 15.000 lx. Qual a iluminância aproximada nesse ponto?",
          alternativas: ["30 lx", "300 lx", "3.000 lx"],
          correta: 1,
          explicacao: "FLD é a fração da luz externa que chega: 2% de 15.000 lx = 300 lx. Por isso o FLD liga a geometria do cômodo ao nível real de iluminância sob céu nublado.",
        },
      ],
    },
    {
      id: "metricas-dinamicas",
      titulo: "Métricas que olham o ano inteiro",
      blocos: [
        { tipo: "texto", texto: "O FLD assume céu encoberto e um instante. As MÉTRICAS DINÂMICAS usam o clima real do ano, hora a hora. sDA (Spatial Daylight Autonomy): a fração da área do cômodo que recebe um nível-alvo de luz natural (tipicamente 300 lx) em pelo menos metade das horas ocupadas do ano. ASE (Annual Sunlight Exposure): a fração da área que recebe sol direto demais (acima de 1.000 lx por muitas horas) — ou seja, risco de ofuscamento e calor. Boa luz natural é sDA alto com ASE baixo." },
        { tipo: "diagrama", titulo: "sDA x ASE: a luz boa e o excesso", codigo: `flowchart TD
  M["Simulacao anual de luz"] --> SDA["sDA: % da area com luz suficiente o ano todo"]
  M --> ASE["ASE: % da area com sol direto em excesso"]
  SDA --> OBJ["Objetivo: sDA alto"]
  ASE --> OBJ2["Objetivo: ASE baixo (pouco ofuscamento)"]` },
        { tipo: "texto", texto: "A referência internacional mais citada (IES LM-83, usada pelo LEED) pede, para ambientes bem iluminados, sDA de pelo menos 55% da área e ASE de no máximo 10%. Traduzindo para o projeto: uma janela generosa a oeste pode ter sDA ótimo e ASE péssimo — muita luz, mas sol direto na cara à tarde. A solução raramente é fechar a janela; é protegê-la e redistribuir a luz (próximas páginas)." },
        {
          tipo: "mobilizacao",
          papel: "Consultor(a) de conforto ambiental / especialista em simulação de desempenho",
          porque: "Calcular sDA, ASE e desempenho térmico para comprovar o nível intermediário ou superior da NBR 15575, ou uma certificação, exige modelagem em ferramenta validada (EnergyPlus, Radiance/DIALux) e interpretação técnica — fora do alcance de uma estimativa manual.",
          entregaEsperada: "Relatório de simulação com sDA, ASE e/ou graus-hora de desconforto por ambiente, apontando ajustes de aberturas e proteção solar.",
          gerenciadoPor: "zaeon",
        },
      ],
    },
    {
      id: "dimensionar-janela",
      titulo: "Dimensionar a janela para luz",
      blocos: [
        { tipo: "texto", texto: "A primeira régua vem do código de obras. A maioria dos códigos municipais brasileiros exige, para ambientes de permanência prolongada, uma área mínima de ILUMINAÇÃO (vão de janela) de 1/6 da área do piso do cômodo (há municípios com 1/5 ou 1/8 — confira o seu). Exemplo: um quarto de 12 m² pede, por 1/6, pelo menos 2,0 m² de janela. É o piso legal, não o ideal de conforto." },
        { tipo: "texto", texto: "A segunda régua é a razão janela-parede (WWR, window-to-wall ratio): a área de vidro dividida pela área da fachada. Valores entre 20% e 40% costumam equilibrar luz e carga térmica na maioria dos climas brasileiros; acima disso, sem proteção solar, o ganho de calor e o ofuscamento disparam. E lembre do que a página do FLD ensinou: janela ALTA leva luz mais fundo que janela larga e baixa, para a mesma área de vidro." },
        {
          tipo: "prancha",
          titulo: "Mesma area de vidro, alcances diferentes",
          desenho: {
            legenda: "A janela alta (verga proxima ao teto) ilumina o fundo do comodo; a baixa e larga ilumina so a frente.",
            primitivas: [
              { t: "retangulo", p: [40, 55], w: 100, h: 110, cor: "tinta" },
              { t: "retangulo", p: [40, 60], w: 10, h: 35, hachura: true, cor: "destaque" },
              { t: "seta", de: [50, 70], ate: [135, 150], cor: "destaque" },
              { t: "rotulo", p: [55, 175], texto: "janela alta: entra fundo" },
              { t: "retangulo", p: [175, 55], w: 100, h: 110, cor: "tinta" },
              { t: "retangulo", p: [175, 120], w: 10, h: 35, hachura: true, cor: "suave" },
              { t: "seta", de: [185, 130], ate: [220, 158], cor: "suave" },
              { t: "rotulo", p: [185, 175], texto: "janela baixa: so a frente" },
            ],
          },
        },
        {
          tipo: "licao",
          pergunta: "Pela regra comum de 1/6, qual a área mínima de janela para uma sala de 18 m²?",
          alternativas: ["1,0 m²", "3,0 m²", "6,0 m²"],
          correta: 1,
          explicacao: "18 m² dividido por 6 = 3,0 m² de vão de iluminação. É o mínimo legal típico; o conforto pode pedir mais, bem distribuído e protegido do sol.",
        },
      ],
    },
    {
      id: "dimensionar-ventilacao",
      titulo: "Dimensionar a abertura para o ar",
      blocos: [
        { tipo: "texto", texto: "Ventilação tem sua própria régua no código: a área efetiva de VENTILAÇÃO (a parte que realmente abre) costuma ser exigida como pelo menos metade da área de iluminação — ou seja, por volta de 1/12 da área do piso em muitos municípios. Cuidado com a pegadinha: uma janela de correr abre só metade do vão; uma basculante ou maxim-ar abre quase tudo. A área que conta é a que o ar atravessa, não a do vidro." },
        { tipo: "texto", texto: "Para ventilação cruzada, o par de aberturas importa mais que o tamanho isolado. A vazão depende da MENOR das duas (entrada e saída), então aberturas desequilibradas desperdiçam. Regra prática consagrada: quando a saída é um pouco maior que a entrada, a velocidade do ar sobre as pessoas aumenta — útil no calor. Em residência, mira-se renovar o ar várias vezes por hora; em clima quente-úmido, quanto mais e mais constante, melhor." },
        {
          tipo: "prancha",
          titulo: "Entrada e saida: o ar segue o caminho aberto",
          desenho: {
            legenda: "Ar entra a barlavento (baixo), cruza o comodo e sai a sotavento. A menor abertura limita a vazao.",
            primitivas: [
              { t: "retangulo", p: [50, 60], w: 200, h: 90, cor: "tinta" },
              { t: "retangulo", p: [50, 95], w: 10, h: 30, hachura: true, cor: "destaque" },
              { t: "retangulo", p: [240, 80], w: 10, h: 45, hachura: true, cor: "destaque" },
              { t: "seta", de: [25, 110], ate: [58, 110], cor: "suave" },
              { t: "rotulo", p: [15, 135], texto: "entrada (menor)" },
              { t: "curva", pts: [[62, 110], [130, 100], [200, 102], [238, 100]], cor: "tinta" },
              { t: "seta", de: [250, 100], ate: [280, 100], cor: "suave" },
              { t: "rotulo", p: [215, 135], texto: "saida (maior)" },
              { t: "rotulo", p: [95, 50], texto: "barlavento" },
              { t: "rotulo", p: [205, 50], texto: "sotavento" },
            ],
          },
        },
        {
          tipo: "mobilizacao",
          papel: "Engenheiro(a) civil/estrutural para vãos grandes",
          porque: "Aberturas amplas para luz e ventilação (panos de vidro, janelas rasgadas, vãos sem pilar) alteram o caminho das cargas e exigem dimensionamento de vergas, lintéis ou pórticos por profissional habilitado, com a respectiva ART.",
          entregaEsperada: "Dimensionamento estrutural das vergas/vãos das grandes aberturas e detalhamento compatível com o projeto arquitetônico.",
          gerenciadoPor: "zaeon",
        },
      ],
    },
    // ===================== PROJETO =====================
    {
      id: "partido",
      titulo: "O partido: forma que respira",
      blocos: [
        { tipo: "texto", texto: "A forma da casa é a primeira ferramenta de luz e ar. Uma planta ESTREITA (profundidade pequena entre as duas fachadas) deixa a luz atravessar e o ar cruzar; uma planta profunda cria um miolo escuro e abafado. Pé-direito mais alto ajuda o ar quente a subir e se afastar das pessoas, e deixa espaço para janelas altas. Pátios e poços de luz trazem céu para o centro de plantas grandes." },
        { tipo: "diagrama", titulo: "Decisoes de forma que definem luz e ar", codigo: `flowchart LR
  F["Forma da casa"] --> E["Planta estreita: luz atravessa, ar cruza"]
  F --> PD["Pe-direito alto: ar quente sobe, cabe janela alta"]
  F --> PA["Patio/poco de luz: ceu no centro da planta"]
  F --> OR["Eixo maior no sentido leste-oeste: menos fachada oeste"]` },
        { tipo: "texto", texto: "Uma orientação de implantação vale ouro no Brasil: alongar a casa no eixo leste-oeste, deixando as fachadas maiores voltadas para norte e sul. Assim a fachada norte (sol controlável) e a sul (fresca) ficam grandes, e as fachadas leste e, sobretudo, oeste (sol baixo e quente) ficam pequenas e fáceis de proteger. É a mesma lógica que a página de orientação usou, agora aplicada ao volume inteiro." },
        {
          tipo: "prancha",
          titulo: "Planta estreita x planta profunda",
          desenho: {
            legenda: "Na planta estreita a luz e o ar atravessam; na profunda sobra um miolo escuro e parado.",
            primitivas: [
              { t: "retangulo", p: [30, 60], w: 90, h: 50, cor: "tinta" },
              { t: "seta", de: [20, 85], ate: [128, 85], cor: "destaque" },
              { t: "rotulo", p: [40, 125], texto: "estreita: atravessa" },
              { t: "retangulo", p: [175, 45], w: 95, h: 100, cor: "tinta" },
              { t: "circulo", c: [222, 95], r: 20, hachura: true, cor: "suave" },
              { t: "rotulo", p: [195, 95], texto: "miolo" },
              { t: "rotulo", p: [180, 160], texto: "profunda: centro escuro" },
            ],
          },
        },
      ],
    },
    {
      id: "aberturas",
      titulo: "As aberturas: tamanho, altura e posição",
      blocos: [
        { tipo: "texto", texto: "Uma abertura tem três cotas de projeto. PEITORIL (altura da base): baixo (0,9 m) para ver o jardim sentado; mais alto para privacidade e para liberar parede. VERGA (altura do topo): quanto mais alta, mais fundo a luz entra — por isso vale aproximar a verga do teto. LARGURA: distribui a luz lateralmente. Para ventilação, a altura muda o papel: abertura baixa é entrada de ar fresco; abertura alta é saída de ar quente." },
        {
          tipo: "prancha",
          titulo: "Peitoril, verga e os dois papeis da altura",
          desenho: {
            legenda: "Abertura alta (perto da verga) = saida de ar quente e luz profunda; abertura baixa = entrada de ar fresco.",
            primitivas: [
              { t: "retangulo", p: [80, 30], w: 140, h: 135, cor: "tinta" },
              { t: "retangulo", p: [95, 40], w: 110, h: 22, hachura: true, cor: "destaque" },
              { t: "rotulo", p: [210, 50], texto: "verga (alta): sai ar quente" },
              { t: "retangulo", p: [95, 120], w: 110, h: 22, hachura: true, cor: "suave" },
              { t: "rotulo", p: [210, 130], texto: "peitoril (baixo): entra ar" },
              { t: "linha", de: [80, 165], ate: [220, 165], cor: "tinta" },
              { t: "rotulo", p: [120, 180], texto: "piso" },
            ],
          },
        },
        { tipo: "texto", texto: "Combine as duas alturas no mesmo cômodo e você tem ventilação cruzada mais efeito chaminé juntos: o ar fresco entra pela abertura baixa a barlavento, varre o ambiente e o ar aquecido escapa pela abertura alta. Esse par alto-baixo é o truque mais barato de conforto térmico passivo — e não aparece na conta de luz." },
        {
          tipo: "tarefas",
          itens: [
            { id: "ab-1", titulo: "Defina peitoril e verga de cada ambiente", entrega: "Quadro de esquadrias com peitoril, verga e largura por janela, justificando pela função (luz profunda, entrada ou saída de ar, privacidade)." },
            { id: "ab-2", titulo: "Garanta um par alto-baixo nos cômodos de permanência", entrega: "Planta/corte mostrando, em cada quarto e sala, uma abertura baixa de entrada e uma alta de saída de ar." },
          ],
        },
      ],
    },
    {
      id: "ventilacao-cruzada",
      titulo: "Ventilação cruzada na planta",
      blocos: [
        { tipo: "texto", texto: "Ventilação cruzada é o ar entrando de um lado e saindo do outro. Para funcionar, três coisas: aberturas em fachadas opostas ou adjacentes (nunca só numa parede), um caminho desobstruído entre elas (portas internas alinhadas, vãos livres) e a entrada virada para o vento dominante. Uma parede cega ou um armário no meio do caminho mata o fluxo. Pense no ar como água: ele só corre se houver entrada, canal e saída." },
        {
          tipo: "prancha",
          titulo: "Caminho do ar na planta: aberto x bloqueado",
          desenho: {
            legenda: "A esquerda o ar cruza porque o caminho esta livre; a direita uma parede interna interrompe o fluxo.",
            primitivas: [
              { t: "retangulo", p: [25, 50], w: 110, h: 90, cor: "tinta" },
              { t: "seta", de: [15, 95], ate: [140, 95], cor: "destaque" },
              { t: "rotulo", p: [45, 150], texto: "livre: cruza" },
              { t: "retangulo", p: [170, 50], w: 110, h: 90, cor: "tinta" },
              { t: "linha", de: [225, 50], ate: [225, 120], cor: "tinta" },
              { t: "seta", de: [160, 95], ate: [220, 95], cor: "suave" },
              { t: "rotulo", p: [228, 100], texto: "parede" },
              { t: "rotulo", p: [185, 150], texto: "bloqueado: para" },
            ],
          },
        },
        { tipo: "texto", texto: "Quando a cidade é densa e o vento é fraco, a ventilação cruzada pura perde força — observação recorrente na literatura técnica. Aí entram dois recursos: captar o vento por onde ele ainda existe (peitoril alto, aberturas na direção certa) e apostar na ventilação vertical (efeito chaminé, próxima página), que dispensa vento. Em projeto, teste a ventilação com a rosa dos ventos do lugar, não com o vento que você imagina." },
        { tipo: "video", titulo: "Energy 101: Daylighting (U.S. Department of Energy)", youtube: "-7EG4d-W4W8" },
        {
          tipo: "fontes",
          titulo: "Ventilação cruzada",
          itens: [
            { titulo: "ArchDaily — Ventilação cruzada, efeito chaminé e outros conceitos", url: "https://www.archdaily.com/887460", tipo: "artigo", nota: "Aberturas opostas/adjacentes e o caminho do ar." },
            { titulo: "Natural ventilation — princípios de pressão do vento", url: "https://en.wikipedia.org/wiki/Natural_ventilation", tipo: "site", nota: "Barlavento, sotavento e diferença de pressão." },
          ],
        },
      ],
    },
    {
      id: "efeito-chamine",
      titulo: "Efeito chaminé: ventilar sem vento",
      blocos: [
        { tipo: "texto", texto: "O EFEITO CHAMINÉ usa física, não vento. O ar quente de dentro de casa é menos denso e sobe; se houver uma abertura no alto, ele escapa, e isso suga ar mais fresco por uma abertura baixa. A força da tiragem cresce com a ALTURA entre as duas aberturas e com a DIFERENÇA DE TEMPERATURA entre dentro e fora. Por isso funciona bem em dias quentes e parados, e em cidade densa, onde a ventilação cruzada falha." },
        {
          tipo: "prancha",
          titulo: "Corte: a tiragem do efeito chamine",
          desenho: {
            legenda: "Ar fresco entra embaixo, aquece, sobe e sai por uma abertura alta (lanternim, shed, claraboia ventilada).",
            primitivas: [
              { t: "retangulo", p: [70, 70], w: 140, h: 95, cor: "tinta" },
              { t: "retangulo", p: [120, 40], w: 45, h: 30, cor: "tinta" },
              { t: "retangulo", p: [128, 45], w: 28, h: 18, hachura: true, cor: "destaque" },
              { t: "rotulo", p: [168, 45], texto: "lanternim" },
              { t: "seta", de: [50, 150], ate: [78, 150], cor: "suave" },
              { t: "rotulo", p: [25, 162], texto: "ar fresco" },
              { t: "seta", de: [140, 140], ate: [140, 65], cor: "destaque" },
              { t: "rotulo", p: [145, 105], texto: "ar quente sobe" },
              { t: "linha", de: [40, 165], ate: [240, 165], cor: "tinta" },
            ],
          },
        },
        { tipo: "texto", texto: "Instrumentos de projeto para a saída alta: LANTERNIM (a 'casinha' sobre o telhado com aberturas laterais), SHED (telhado em dente-de-serra com janelas), ÁTRIO ou poço vertical, e claraboias que abrem. A entrada baixa pode ser a própria janela do piso. Quanto maior o 'cano' (pé-direito duplo, átrio de dois pavimentos), mais forte a tiragem. Um átrio central vira, ao mesmo tempo, poço de luz e chaminé de ar." },
        {
          tipo: "licao",
          pergunta: "O que faz o efeito chaminé funcionar mesmo num dia sem vento?",
          alternativas: [
            "A pressão do vento nas fachadas",
            "A diferença de temperatura entre dentro e fora e a altura entre as aberturas baixa e alta",
            "A umidade relativa do ar",
          ],
          correta: 1,
          explicacao: "A tiragem nasce da flutuação térmica: ar quente é mais leve e sobe. Quanto maior o ΔT e a distância vertical entre entrada e saída, mais forte o fluxo — independente de haver vento.",
        },
      ],
    },
    {
      id: "protecao-solar",
      titulo: "Proteção solar: deixar a luz, barrar o calor",
      blocos: [
        { tipo: "texto", texto: "A meta da proteção solar é paradoxal e exata: barrar o SOL DIRETO (calor e ofuscamento) sem matar a LUZ do dia (o céu difuso). A ferramenta muda com a orientação, porque o sol chega de ângulos diferentes. Para a fachada NORTE (hemisfério sul), o sol vem alto: um BEIRAL ou brise HORIZONTAL resolve, porque corta o sol alto do verão e deixa passar o sol baixo do inverno. Para LESTE e OESTE, o sol é baixo: só brise VERTICAL (ou móvel) segura." },
        { tipo: "diagrama", titulo: "Que protecao para cada orientacao (hemisferio sul)", codigo: `flowchart TD
  N["Norte: sol alto"] --> H["Beiral / brise horizontal"]
  LO["Leste e Oeste: sol baixo"] --> V["Brise vertical ou movel"]
  S["Sul: pouco sol direto"] --> P["Protecao leve, priorizar luz"]
  OBS["Copiar o mesmo brise em tudo"] --> ERRO["Erro: sombra demais em uns, de menos em outros"]` },
        {
          tipo: "prancha",
          titulo: "O beiral que escolhe a estacao (fachada norte)",
          desenho: {
            legenda: "Dimensione o beiral para cortar o sol alto do verao e deixar entrar o sol baixo do inverno.",
            primitivas: [
              { t: "retangulo", p: [120, 70], w: 90, h: 95, cor: "tinta" },
              { t: "retangulo", p: [128, 80], w: 20, h: 55, hachura: true, cor: "suave" },
              { t: "linha", de: [120, 70], ate: [175, 70], cor: "destaque" },
              { t: "rotulo", p: [150, 62], texto: "beiral" },
              { t: "circulo", c: [95, 30], r: 8, cor: "destaque" },
              { t: "seta", de: [98, 38], ate: [128, 72], cor: "destaque" },
              { t: "rotulo", p: [55, 25], texto: "sol verao (barrado)" },
              { t: "circulo", c: [40, 95], r: 8, cor: "suave" },
              { t: "seta", de: [48, 98], ate: [130, 120], cor: "suave" },
              { t: "rotulo", p: [20, 115], texto: "sol inverno (entra)" },
              { t: "linha", de: [30, 165], ate: [230, 165], cor: "tinta" },
            ],
          },
        },
        { tipo: "texto", texto: "Dimensiona-se o sombreamento pela carta solar: desenha-se a máscara de sombra do brise e confere-se se ela cobre o sol nos horários quentes de cada abertura. Erro clássico, apontado na literatura: repetir o mesmo brise em todas as janelas — ele sobra sombra numa orientação e falta em outra. Cada fachada pede seu ângulo. Vegetação e beiral entram como proteção 'de graça' quando bem posicionados." },
        {
          tipo: "fontes",
          titulo: "Proteção e insolação",
          itens: [
            { titulo: "Brise soleil — princípio e aplicação", url: "https://en.wikipedia.org/wiki/Brise_soleil", tipo: "site", nota: "Origem e lógica dos dispositivos de quebra-sol." },
            { titulo: "Andrew Marsh — Sun-Path 3D para máscara de sombra", url: "https://drajmarsh.bitbucket.io/sunpath3d.html", tipo: "site", nota: "Visualiza se o brise cobre o sol nos horários críticos." },
          ],
        },
      ],
    },
    {
      id: "luz-de-qualidade",
      titulo: "Luz de qualidade: difusa, profunda, sem ofuscar",
      blocos: [
        { tipo: "texto", texto: "Muita luz não é boa luz. O problema de conforto visual é o CONTRASTE: uma janela 'estourada' ao lado de uma parede escura cansa a vista e faz a pessoa fechar a cortina — e aí acende a lâmpada de dia. Luz de qualidade é difusa e bem distribuída. Recursos: iluminar por mais de um lado do cômodo (bilateral), trazer luz do alto (claraboia, lanternim), usar superfícies internas claras e evitar sol direto sobre telas e mesas de trabalho." },
        { tipo: "texto", texto: "A PRATELEIRA DE LUZ (light shelf) é um clássico: uma aba horizontal clara presa na parte alta da janela. Ela bloqueia o sol direto que entraria por cima e, ao mesmo tempo, reflete essa luz no teto, que a espalha para o fundo do cômodo. Resultado: menos ofuscamento perto da janela e mais luz lá no fundo — justamente o ponto que costuma ficar escuro." },
        {
          tipo: "prancha",
          titulo: "Prateleira de luz: sombra na frente, luz no fundo",
          desenho: {
            legenda: "A aba corta o sol direto alto e joga a luz no teto, que a reflete ate o fundo do comodo.",
            primitivas: [
              { t: "retangulo", p: [50, 45], w: 190, h: 120, cor: "tinta" },
              { t: "retangulo", p: [50, 55], w: 12, h: 90, hachura: true, cor: "destaque" },
              { t: "linha", de: [62, 85], ate: [120, 85], cor: "destaque" },
              { t: "rotulo", p: [75, 78], texto: "prateleira" },
              { t: "seta", de: [35, 55], ate: [118, 85], cor: "suave" },
              { t: "rotulo", p: [25, 48], texto: "sol alto" },
              { t: "seta", de: [118, 85], ate: [210, 60], cor: "destaque" },
              { t: "seta", de: [210, 62], ate: [210, 150], cor: "destaque" },
              { t: "rotulo", p: [150, 55], texto: "reflete no teto" },
              { t: "rotulo", p: [185, 160], texto: "luz chega ao fundo" },
            ],
          },
        },
        {
          tipo: "licao",
          pergunta: "Qual é a principal queixa de conforto visual numa casa com janela grande e sem proteção?",
          alternativas: [
            "Falta de luz no cômodo",
            "Ofuscamento por contraste (janela 'estourada' e sol direto), que faz fechar a cortina e acender a luz de dia",
            "A luz natural não tem cor",
          ],
          correta: 1,
          explicacao: "Luz demais concentrada e mal distribuída gera contraste e ofuscamento. A pessoa reage fechando a cortina — e perde justamente a luz natural. A saída é difundir e proteger, não apenas aumentar.",
        },
      ],
    },
    // ===================== EXECUCAO =====================
    {
      id: "esquadrias",
      titulo: "Esquadrias: a janela que você compra",
      blocos: [
        { tipo: "texto", texto: "No papel a janela é um retângulo; na obra é uma esquadria com um jeito de abrir, e isso muda tudo para a ventilação. DE CORRER: prática, mas só metade do vão abre (área efetiva de ventilação ~50%). DE ABRIR (giro/folha): abre quase 100%. MAXIM-AR e BASCULANTE: abrem bastante e protegem da chuva — ótimas para a abertura alta do efeito chaminé. VENEZIANA/postigo: ventila com privacidade e barra sol. Escolha pela função que a página de aberturas definiu." },
        { tipo: "diagrama", titulo: "Tipo de esquadria x area efetiva de ventilacao", codigo: `flowchart LR
  C["De correr"] --> C2["~50% do vao abre"]
  G["De abrir (folha/giro)"] --> G2["~100% do vao abre"]
  M["Maxim-ar / basculante"] --> M2["Alta abertura + protege de chuva"]
  VE["Veneziana / postigo"] --> VE2["Ventila com privacidade, barra sol"]` },
        {
          tipo: "prancha",
          titulo: "De correr x maxim-ar: o que realmente abre",
          desenho: {
            legenda: "Na de correr uma folha cobre a outra (so metade ventila); a maxim-ar bascula e libera quase todo o vao.",
            primitivas: [
              { t: "retangulo", p: [35, 55], w: 100, h: 80, cor: "tinta" },
              { t: "linha", de: [85, 55], ate: [85, 135], cor: "tinta" },
              { t: "retangulo", p: [85, 55], w: 50, h: 80, hachura: true, cor: "suave" },
              { t: "rotulo", p: [40, 150], texto: "de correr: ~50%" },
              { t: "retangulo", p: [175, 55], w: 100, h: 80, cor: "tinta" },
              { t: "linha", de: [175, 95], ate: [275, 80], cor: "destaque" },
              { t: "seta", de: [225, 110], ate: [225, 90], cor: "destaque" },
              { t: "rotulo", p: [185, 150], texto: "maxim-ar: quase 100%" },
            ],
          },
        },
        { tipo: "texto", texto: "Detalhe que muita gente esquece: segurança e insetos não podem anular a ventilação. Telas (mosquiteiros) reduzem um pouco a vazão, então compense no tamanho; grades de segurança devem ser vazadas; e janelas que precisam ficar abertas à noite (para o ar fresco) pedem fechaduras e venezianas que permitam abrir o vidro mantendo a casa segura." },
      ],
    },
    {
      id: "materiais-vidro",
      titulo: "Vidros, cores e superfícies",
      blocos: [
        { tipo: "texto", texto: "O vidro decide quanto do sol vira luz e quanto vira calor. Duas grandezas: TRANSMISSÃO LUMINOSA (quanta luz visível passa — você quer alta) e FATOR SOLAR (quanta energia térmica total passa — no calor você quer baixo). Vidro comum incolor deixa passar luz e calor juntos; vidros de controle solar (refletivos, de baixo emissivo/low-e) separam os dois: mantêm a luz e cortam parte do calor. Em clima quente, controle solar no oeste e norte paga-se rápido." },
        { tipo: "texto", texto: "As cores internas são 'vidro de graça'. Teto branco e paredes claras refletem a luz que entrou e a espalham, aumentando o fator de luz diurna no fundo do cômodo sem gastar mais um centímetro de janela. Pisos e móveis muito escuros 'engolem' luz. Do lado de fora, pisos claros no entorno da janela mandam luz refletida para dentro — mas cuidado para não virar ofuscamento." },
        {
          tipo: "prancha",
          titulo: "Vidro: separa luz de calor; superficies claras espalham a luz",
          desenho: {
            legenda: "Controle solar deixa a luz e corta parte do calor; teto e paredes claras refletem a luz ao fundo.",
            primitivas: [
              { t: "retangulo", p: [55, 45], w: 190, h: 120, cor: "tinta" },
              { t: "retangulo", p: [55, 55], w: 10, h: 90, hachura: true, cor: "destaque" },
              { t: "seta", de: [35, 70], ate: [70, 80], cor: "destaque" },
              { t: "rotulo", p: [10, 62], texto: "sol" },
              { t: "seta", de: [70, 80], ate: [200, 75], cor: "suave" },
              { t: "rotulo", p: [90, 65], texto: "luz passa" },
              { t: "linha", de: [66, 78], ate: [80, 70], cor: "tinta" },
              { t: "rotulo", p: [95, 95], texto: "calor refletido" },
              { t: "seta", de: [200, 60], ate: [200, 150], cor: "suave" },
              { t: "rotulo", p: [150, 160], texto: "teto claro espalha a luz" },
            ],
          },
        },
        {
          tipo: "mobilizacao",
          papel: "Vidraceiro / fornecedor de esquadrias com vidro de segurança",
          porque: "Portas, panos de vidro e janelas baixas de grande área exigem vidro de segurança (temperado ou laminado) conforme a NBR 7199 (vidros na construção civil), com especificação e instalação por fornecedor habilitado — é requisito de segurança, não só de desempenho.",
          entregaEsperada: "Especificação e instalação das esquadrias com o tipo de vidro correto (segurança e controle solar onde exigido), conforme a NBR 7199 e o quadro de esquadrias.",
          gerenciadoPor: "zaeon",
        },
      ],
    },
    {
      id: "detalhes-construtivos",
      titulo: "Detalhes que fazem a abertura durar",
      blocos: [
        { tipo: "texto", texto: "Uma abertura mal detalhada vira infiltração, mofo e corrente de ar indesejada. PINGADEIRA (ou rufo) no topo e nos peitoris externos joga a água para longe do vidro e da parede. VERGA bem dimensionada evita trinca sobre a janela. VEDAÇÃO (borrachas, calafetagem) impede frestas que, no inverno, trazem frio, e no verão, calor. E a ESTANQUEIDADE à chuva de vento é requisito de desempenho da NBR 15575 para as fachadas." },
        {
          tipo: "prancha",
          titulo: "Detalhe do peitoril: pingadeira e caimento",
          desenho: {
            legenda: "O peitoril externo tem caimento para fora e pingadeira na borda, afastando a agua do vidro e da parede.",
            primitivas: [
              { t: "retangulo", p: [60, 40], w: 60, h: 80, cor: "tinta" },
              { t: "rotulo", p: [72, 80], texto: "vidro" },
              { t: "linha", de: [60, 120], ate: [180, 130], cor: "tinta" },
              { t: "rotulo", p: [120, 118], texto: "caimento p/ fora" },
              { t: "linha", de: [180, 130], ate: [180, 142], cor: "destaque" },
              { t: "rotulo", p: [185, 140], texto: "pingadeira" },
              { t: "seta", de: [185, 148], ate: [185, 162], cor: "suave" },
              { t: "rotulo", p: [150, 170], texto: "agua cai longe da parede" },
            ],
          },
        },
        {
          tipo: "tarefas",
          itens: [
            { id: "det-1", titulo: "Detalhe cada peitoril e verga crítica", entrega: "Detalhes construtivos (escala 1:10 ou 1:5) de peitoril com pingadeira e caimento, e de verga, nas aberturas expostas à chuva." },
            { id: "det-2", titulo: "Especifique vedação e estanqueidade", entrega: "Especificação de borrachas/calafetação das esquadrias e nota remetendo ao requisito de estanqueidade da NBR 15575." },
          ],
        },
      ],
    },
    // ===================== MANUTENCAO / OPERACAO =====================
    {
      id: "operacao",
      titulo: "Morar a casa: a rotina que ventila",
      blocos: [
        { tipo: "texto", texto: "A casa mais bem projetada precisa ser OPERADA. Luz e ar passivos dependem de gestos simples do morador ao longo do dia. De manhã e à noite, nos dias quentes: abrir as janelas baixas a barlavento e as altas a sotavento para o ar cruzar e o calor escapar. No meio do dia quente de sol: fechar persianas e venezianas das fachadas que recebem sol direto, mantendo a casa na penumbra fresca. No inverno: abrir as cortinas do norte de dia (ganhar sol) e fechar tudo à noite (guardar calor)." },
        { tipo: "diagrama", titulo: "Rotina de operacao dia quente x dia frio", codigo: `flowchart TD
  Q["Dia QUENTE"] --> QM["Manha/noite: abrir tudo, ventilar"]
  Q --> QT["Meio-dia: fechar persianas do sol, penumbra fresca"]
  F["Dia FRIO"] --> FD["Dia: abrir cortinas do norte, ganhar sol"]
  F --> FN["Noite: fechar cortinas e janelas, guardar calor"]` },
        { tipo: "texto", texto: "Projetar pensando na operação significa deixar os controles ao alcance: comandos de persiana acessíveis, janelas altas com haste ou motor para abrir, e um 'modo noturno' seguro (venezianas que ventilam com a casa trancada). Uma boa entrega de projeto inclui um pequeno manual: como a casa quer ser aberta e fechada em cada estação." },
        {
          tipo: "licao",
          pergunta: "Num dia muito quente e ensolarado, qual é a operação correta ao meio-dia?",
          alternativas: [
            "Abrir todas as janelas ensolaradas para 'arejar'",
            "Fechar persianas/venezianas das fachadas com sol direto e manter a casa na penumbra, ventilando mais cedo e à noite",
            "Ligar o ar-condicionado com as janelas abertas",
          ],
          correta: 1,
          explicacao: "No pico de calor e sol, abrir janela ensolarada traz ar quente e radiação. Fecha-se contra o sol (penumbra fresca) e ventila-se nos horários amenos — manhã e noite, quando o ar externo está mais frio.",
        },
      ],
    },
    {
      id: "manutencao",
      titulo: "Manutenção: o que apaga a luz com o tempo",
      blocos: [
        { tipo: "texto", texto: "Luz e ar se perdem aos poucos se ninguém cuidar. Vidro sujo pode cortar uma fatia grande da luz que entra — limpar vidros e claraboias é manutenção de iluminação, não só de estética. Telas de mosquiteiro empoeiradas reduzem a ventilação. Venezianas e brises móveis emperram se não forem lubrificados e revisados. E a vegetação cresce: a árvore que sombreava na medida certa pode, em poucos anos, fechar o sol de inverno inteiro ou bloquear o vento." },
        {
          tipo: "prancha",
          titulo: "Vidro limpo x vidro sujo: a luz que desaparece",
          desenho: {
            legenda: "Poeira e fuligem no vidro e na claraboia cortam parte da luz; limpeza periodica recupera o projeto.",
            primitivas: [
              { t: "retangulo", p: [40, 55], w: 90, h: 100, cor: "tinta" },
              { t: "retangulo", p: [50, 65], w: 10, h: 70, hachura: true, cor: "destaque" },
              { t: "seta", de: [55, 75], ate: [120, 120], cor: "destaque" },
              { t: "rotulo", p: [55, 170], texto: "vidro limpo: luz cheia" },
              { t: "retangulo", p: [175, 55], w: 90, h: 100, cor: "tinta" },
              { t: "retangulo", p: [185, 65], w: 10, h: 70, hachura: true, cor: "suave" },
              { t: "seta", de: [190, 80], ate: [225, 110], cor: "suave" },
              { t: "rotulo", p: [180, 170], texto: "vidro sujo: luz fraca" },
            ],
          },
        },
        {
          tipo: "tarefas",
          itens: [
            { id: "man-1", titulo: "Monte um calendário de manutenção de luz e ar", entrega: "Lista com periodicidade: limpeza de vidros/claraboias, revisão de brises e venezianas móveis, limpeza de telas e poda da vegetação de sombreamento." },
            { id: "man-2", titulo: "Preveja a árvore crescida", entrega: "Nota no projeto paisagístico indicando a altura/copa final das árvores de sombreamento e o corte de poda para preservar sol de inverno e vento." },
          ],
        },
      ],
    },
    // ===================== CASOS REAIS =====================
    {
      id: "caso-patio",
      titulo: "Caso real: a casa-pátio",
      blocos: [
        { tipo: "texto", texto: "A CASA-PÁTIO é uma das respostas mais antigas e eficazes ao problema de luz e ar — do pátio romano e árabe às casas coloniais brasileiras de planta profunda. O pátio é um vazio no meio da casa que traz céu (luz) e funciona como poço de ventilação (chaminé). Cômodos que, numa planta profunda, ficariam escuros e abafados, passam a ter uma segunda fachada voltada para o pátio. É a estratégia de 'planta estreita' obtida sem afinar o volume." },
        {
          tipo: "prancha",
          titulo: "Planta com patio central: segunda fachada para o miolo",
          desenho: {
            legenda: "O patio abre um vazio central: cada comodo ganha janela para o patio, levando luz e ar ao miolo.",
            primitivas: [
              { t: "retangulo", p: [60, 40], w: 180, h: 130, cor: "tinta" },
              { t: "retangulo", p: [120, 80], w: 60, h: 50, cor: "destaque" },
              { t: "rotulo", p: [130, 108], texto: "patio" },
              { t: "seta", de: [150, 60], ate: [150, 78], cor: "suave" },
              { t: "rotulo", p: [155, 55], texto: "ceu" },
              { t: "rotulo", p: [75, 60], texto: "quarto" },
              { t: "rotulo", p: [195, 60], texto: "sala" },
              { t: "rotulo", p: [75, 150], texto: "cozinha" },
              { t: "rotulo", p: [195, 150], texto: "estar" },
            ],
          },
        },
        { tipo: "texto", texto: "No clima quente, o pátio sombreado e com vegetação cria uma bolsa de ar mais fresco que alimenta a ventilação dos cômodos; com uma abertura alta no lado oposto, vira chaminé. Cuidado de projeto: um pátio pequeno e todo envidraçado pode virar estufa — ele precisa de sombreamento e de saída para o ar quente. O pátio é poço de luz E de ar; se só for de luz, aquece." },
        {
          tipo: "fontes",
          titulo: "Referências de ventilação aplicada",
          itens: [
            { titulo: "ArchDaily — De volta ao básico: ventilação natural em diferentes contextos", url: "https://www.archdaily.com/963706/back-to-basics-natural-ventilation-and-its-use-in-different-contexts", tipo: "artigo", nota: "Pátios e poços como estratégia de ventilação em plantas profundas." },
          ],
        },
      ],
    },
    {
      id: "caso-quente-umido",
      titulo: "Caso real: clima quente-úmido (ZB8)",
      blocos: [
        { tipo: "texto", texto: "No litoral e no Norte do Brasil (zona bioclimática 8), o inimigo é o calor com umidade alta, quase o ano inteiro. A estratégia dominante da NBR 15220 para essa zona é VENTILAR MUITO: aberturas grandes e permanentes, casa 'solta' e permeável ao vento, pé-direito alto, cobertura bem isolada e ventilada, e sombreamento total das aberturas (o sol direto é sempre vilão). Massa térmica pesada ajuda pouco aqui, porque as noites também são quentes — não há frescor noturno para 'carregar' a parede." },
        { tipo: "diagrama", titulo: "ZB8 quente-umido: o que priorizar", codigo: `flowchart TD
  ZB8["Clima quente-umido (ZB8)"] --> V["Ventilacao cruzada permanente e generosa"]
  ZB8 --> S["Sombrear todas as aberturas"]
  ZB8 --> C["Cobertura isolada e ventilada (sotao/atico)"]
  ZB8 --> L["Casa leve e permeavel, pe-direito alto"]
  ZB8 --> E["Evitar vidro exposto e massa pesada"]` },
        { tipo: "texto", texto: "Projeto típico de sucesso: casa alongada no eixo leste-oeste, com as faces longas (norte e sul) rasgadas de janelas e brises, cômodos em uma única fileira (planta estreita para o ar cruzar), varandas que sombreiam, e beiral largo. Terreiros e varandas sombreadas são a sala de estar real nesse clima. A conta de energia desaba porque o ar-condicionado vira exceção, não regra." },
        {
          tipo: "licao",
          pergunta: "Por que a massa térmica pesada ajuda pouco no clima quente-úmido?",
          alternativas: [
            "Porque paredes pesadas são caras",
            "Porque as noites também são quentes: não há frescor noturno para resfriar a massa que foi aquecida de dia",
            "Porque a umidade estraga o concreto",
          ],
          correta: 1,
          explicacao: "Massa térmica funciona quando o dia é quente e a noite é fria (a parede descarrega o calor à noite). No quente-úmido a noite é quente, a massa não descarrega e acaba irradiando calor para dentro — por isso se prefere casa leve e muito ventilada.",
        },
      ],
    },
    {
      id: "caso-frio",
      titulo: "Caso real: clima frio do Sul",
      blocos: [
        { tipo: "texto", texto: "No Sul e nas serras (zonas bioclimáticas 1 e 2), o problema inverte: o frio é o desafio em boa parte do ano. A estratégia vira CAPTAR e GUARDAR o sol. Aberturas maiores voltadas ao NORTE recebem o sol baixo do inverno; paredes e pisos pesados (alta inércia térmica) guardam esse calor e o devolvem à noite; a casa é mais 'fechada' e vedada contra frestas; o isolamento da cobertura segura o calor dentro. A ventilação continua necessária (ar e umidade), mas controlada, não permanente." },
        {
          tipo: "prancha",
          titulo: "Ganho solar de inverno + inercia termica (corte)",
          desenho: {
            legenda: "O sol baixo do inverno entra pelo norte e aquece o piso/parede pesados, que devolvem calor a noite.",
            primitivas: [
              { t: "retangulo", p: [90, 70], w: 140, h: 95, cor: "tinta" },
              { t: "retangulo", p: [90, 150], w: 140, h: 15, hachura: true, cor: "destaque" },
              { t: "rotulo", p: [120, 160], texto: "piso pesado (inercia)" },
              { t: "circulo", c: [50, 90], r: 9, cor: "suave" },
              { t: "seta", de: [58, 93], ate: [160, 148], cor: "suave" },
              { t: "rotulo", p: [20, 80], texto: "sol inverno (norte)" },
              { t: "seta", de: [160, 148], ate: [160, 110], cor: "destaque" },
              { t: "rotulo", p: [165, 125], texto: "calor devolvido a noite" },
              { t: "linha", de: [60, 165], ate: [250, 165], cor: "tinta" },
            ],
          },
        },
        { tipo: "texto", texto: "O equilíbrio do Sul é fino: a mesma janela grande ao norte que aquece no inverno pode superaquecer no verão. A solução é o beiral/brise horizontal dimensionado para a latitude — barra o sol alto de verão e deixa entrar o sol baixo de inverno (exatamente a página de proteção solar). Vedação contra vento frio e isolamento são tão importantes quanto o tamanho da janela." },
        {
          tipo: "fontes",
          titulo: "Zoneamento e desempenho",
          itens: [
            { titulo: "LabEEE/UFSC — base sobre zoneamento bioclimático e desempenho térmico", url: "https://labeee.ufsc.br/", tipo: "site", nota: "Estratégias por zona bioclimática (NBR 15220) e aquecimento solar passivo." },
            { titulo: "LabEEE/UFSC — Nota técnica NBR 15575 (desempenho térmico)", url: "https://labeee.ufsc.br/sites/default/files/publicacoes/notas_tecnicas/NT_15575_FINAL.pdf", tipo: "norma", nota: "Critérios de desempenho térmico para verão e inverno." },
          ],
        },
      ],
    },
    // ===================== RECURSOS =====================
    {
      id: "checklist",
      titulo: "Checklist do projeto de luz e ar",
      blocos: [
        { tipo: "texto", texto: "Antes de fechar o projeto, passe por esta lista. Ela reúne, em ordem de projeto, as decisões que este caderno destrinchou — da leitura do terreno à operação da casa. Nenhum item é opcional; o que muda é a dose, conforme o clima." },
        { tipo: "diagrama", titulo: "Fluxo de verificacao do projeto", codigo: `flowchart TD
  A["1. Norte, latitude e carta solar levantados"] --> B["2. Zona bioclimatica e clima local (EPW/INMET)"]
  B --> C["3. Rosa dos ventos e entorno mapeados"]
  C --> D["4. Comodos orientados por face"]
  D --> E["5. Volume no eixo leste-oeste, planta que atravessa"]
  E --> F["6. Janelas dimensionadas (codigo + WWR + altura)"]
  F --> G["7. Par alto-baixo para cruzada e chamine"]
  G --> H["8. Protecao solar por orientacao (carta solar)"]
  H --> I["9. Esquadrias e vidros por funcao"]
  I --> J["10. Detalhes, manutencao e manual de operacao"]` },
        {
          tipo: "tarefas",
          itens: [
            { id: "chk-1", titulo: "Rode o checklist na sua planta", entrega: "Os 10 itens marcados como resolvidos na planta/corte, com uma frase por item dizendo onde a solução aparece no desenho." },
            { id: "chk-2", titulo: "Liste as pendências que exigem profissional", entrega: "Relação dos pontos que precisam de arquiteto/engenheiro, consultor de simulação, estrutural, elétrica ou vidraceiro, conforme as etapas de mobilização do caderno." },
          ],
        },
      ],
    },
    {
      id: "biblioteca-fontes",
      titulo: "Biblioteca de fontes",
      blocos: [
        { tipo: "texto", texto: "As referências reais usadas ao longo do caderno, reunidas. Normas dão o piso legal e os critérios; os dados climáticos ancoram as decisões no clima do lugar; as ferramentas de posição solar validam insolação e sombreamento; a literatura técnica explica os princípios." },
        {
          tipo: "fontes",
          titulo: "Normas e desempenho",
          itens: [
            { titulo: "LabEEE/UFSC — Nota técnica sobre a NBR 15575 (Edificações Habitacionais — Desempenho)", url: "https://labeee.ufsc.br/sites/default/files/publicacoes/notas_tecnicas/NT_15575_FINAL.pdf", tipo: "norma", nota: "Desempenho térmico e lumínico da habitação (iluminação natural e conforto)." },
            { titulo: "LabEEE/UFSC — laboratório de referência (NBR 15220, zoneamento bioclimático)", url: "https://labeee.ufsc.br/", tipo: "site", nota: "Estratégias construtivas por zona bioclimática brasileira." },
            { titulo: "WHO Housing and health guidelines (OMS, 2018)", url: "https://www.who.int/publications/i/item/9789241550376", tipo: "norma", nota: "Moradia e saúde: luz, temperatura e ventilação." },
          ],
        },
        {
          tipo: "fontes",
          titulo: "Dados climáticos abertos",
          itens: [
            { titulo: "Climate.OneBuilding.Org — arquivos climáticos EPW", url: "https://climate.onebuilding.org/", tipo: "dataset", nota: "Temperatura, radiação e vento por cidade, para simulação." },
            { titulo: "INMET — Instituto Nacional de Meteorologia", url: "https://portal.inmet.gov.br/", tipo: "dataset", nota: "Dados observados e normais climatológicas do Brasil." },
          ],
        },
        {
          tipo: "fontes",
          titulo: "Posição solar e ferramentas",
          itens: [
            { titulo: "NOAA Global Monitoring Laboratory — Solar Calculator", url: "https://gml.noaa.gov/grad/solcalc/", tipo: "site", nota: "Azimute e altura do sol por data, hora e latitude." },
            { titulo: "Andrew Marsh — Sun-Path 3D (carta solar interativa)", url: "https://drajmarsh.bitbucket.io/sunpath3d.html", tipo: "site", nota: "Trajetória solar e máscara de sombra no modelo." },
          ],
        },
        {
          tipo: "fontes",
          titulo: "Literatura técnica e conceitos",
          itens: [
            { titulo: "ArchDaily — Ventilação cruzada, efeito chaminé e conceitos de ventilação natural", url: "https://www.archdaily.com/887460", tipo: "artigo", nota: "Princípios de ventilação natural aplicados ao projeto." },
            { titulo: "ArchDaily — De volta ao básico: ventilação natural em diferentes contextos", url: "https://www.archdaily.com/963706/back-to-basics-natural-ventilation-and-its-use-in-different-contexts", tipo: "artigo", nota: "Quando usar cada tipo de ventilação." },
            { titulo: "Daylighting (architecture) — métricas de luz natural", url: "https://en.wikipedia.org/wiki/Daylighting_(architecture)", tipo: "site", nota: "Fator de luz diurna, sDA, ASE e estratégias." },
            { titulo: "Stack effect (efeito chaminé)", url: "https://en.wikipedia.org/wiki/Stack_effect", tipo: "site", nota: "Física da tiragem por diferença de temperatura." },
            { titulo: "Brise soleil (quebra-sol)", url: "https://en.wikipedia.org/wiki/Brise_soleil", tipo: "site", nota: "Dispositivos de proteção solar." },
            { titulo: "Energy 101: Daylighting (U.S. Department of Energy)", url: "https://www.youtube.com/watch?v=-7EG4d-W4W8", tipo: "video", nota: "Vídeo introdutório sobre iluminação natural em edifícios." },
          ],
        },
      ],
    },
    // ===================== SINTESE =====================
    {
      id: "compilado",
      titulo: "Prancha de síntese",
      blocos: [
        { tipo: "texto", texto: "Fim do caderno. O essencial em cinco movimentos: (1) LEIA o céu e o clima — carta solar da latitude, zona bioclimática, dados do EPW/INMET e a rosa dos ventos do lugar. (2) ORIENTE — alongue a casa no eixo leste-oeste, ponha quartos e salas ao norte, serviços ao sul, e evite permanência a oeste. (3) ABRA com critério — janela alta para luz profunda, par alto-baixo para cruzada e chaminé, área mínima do código mais o WWR de 20% a 40%. (4) PROTEJA — beiral/brise horizontal ao norte, vertical a leste/oeste, dimensionados pela carta solar; difunda a luz com superfícies claras e prateleira de luz. (5) OPERE e MANTENHA — rotina de abrir e fechar por estação, vidros limpos e brises revisados. E mobilize o profissional certo em cada etapa que a vida real exige: projeto com ART/RRT, estrutural dos vãos, simulação de desempenho, elétrica e vidro de segurança. Luz e ar de graça são, no fim, projeto bem feito." },
        { tipo: "compilado" },
      ],
    },
  ],
};
