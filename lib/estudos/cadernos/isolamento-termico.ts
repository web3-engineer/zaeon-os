import type { CadernoEstudo } from "../cadernosEstudo";

/**
 * Caderno de campo: Comparação de materiais para isolamento térmico.
 * Conteúdo com lastro: normas ABNT (NBR 15220 partes 1 a 5, NBR 15575),
 * ISO 10456 e EN 12667 (valores de projeto e ensaio de λ), zoneamento
 * bioclimático da NBR 15220-3, fichas técnicas de fabricante (Rockwool),
 * material técnico do LabEEE/UFSC, guias do US DOE e revisões científicas.
 * As etapas que exigem profissional habilitado (laboratório, responsável
 * técnico com ART/RRT, segurança do trabalho, termografista) viram blocos
 * de mobilização. Todos os vídeos foram verificados como existentes.
 */
export const caderno: CadernoEstudo = {
  id: "isolamento-termico",
  titulo: "Comparação de materiais para isolamento térmico",
  resumo:
    "Da física do calor ao canteiro: como ler a condutividade de cada material, comparar lã mineral, EPS, poliuretano e avançados com critério, calcular a transmitância de um fechamento, dimensionar espessura pela zona bioclimática e executar sem pontes térmicas, sempre com norma, número e o profissional certo na hora certa.",
  paginas: [
    // ===================== CAPÍTULO 1 — CONTEXTO E VISÃO =====================
    {
      id: "abertura",
      titulo: "Como usar este caderno de campo",
      blocos: [
        { tipo: "texto", texto: "Este caderno acompanha quem precisa escolher, comparar e aplicar material de isolamento térmico com critério técnico. Cada página tem leitura curta, um desenho ou diagrama, tarefas práticas e a fonte que sustenta a afirmação. Nada aqui é opinião solta: quando um número de condutividade, transmitância ou limite de norma aparece, ele vem de norma ABNT, ficha técnica de fabricante ou estudo citado na própria página." },
        { tipo: "texto", texto: "Regra do caderno: antes de decidir, meça; antes de comparar, use o mesmo critério e a mesma condição; e antes de afirmar que um material isola melhor, cite o lambda ensaiado. Quando a norma exigir um profissional habilitado (laboratório de ensaio, engenheiro ou arquiteto responsável, técnico de segurança, termografista), a página mostra um campo de mobilização que abre a vaga e acompanha até ficar pronto." },
        { tipo: "diagrama", titulo: "O percurso do caderno", codigo: `flowchart TD
  A["Contexto: por que isolar"] --> B["Fisica do calor"]
  B --> C["Catalogo de materiais"]
  C --> D["Metodo: criterios de comparacao"]
  D --> E["Calculo e medicao"]
  E --> F["Projeto"]
  F --> G["Execucao"]
  G --> H["Manutencao e verificacao"]
  H --> I["Casos reais e recursos"]
  I --> J["Prancha de sintese"]` },
      ],
    },
    {
      id: "por-que-isolar",
      titulo: "Por que o isolamento importa",
      blocos: [
        { tipo: "texto", texto: "Isolar não é luxo estético: é controlar o fluxo de calor que atravessa paredes, cobertura e piso. Esse fluxo decide três coisas ao mesmo tempo: o conforto de quem usa o espaço, a conta de energia de climatização e o risco de condensação e mofo nas superfícies frias. Um envelope mal isolado perde no inverno e ganha no verão o calor que o sistema de climatização gasta dinheiro para compensar." },
        { tipo: "texto", texto: "No Brasil a cobertura costuma ser o ponto mais crítico: é a superfície que mais recebe radiação solar direta e, em muitas construções, a que menos recebe isolamento. O US DOE resume a lógica geral: reduzir a transferência de calor pelo envelope é a forma mais barata por real investido de melhorar conforto e eficiência, e o material certo depende do clima, do local de aplicação e do orçamento." },
        {
          tipo: "prancha",
          titulo: "O que o isolamento controla",
          desenho: {
            legenda: "Sem isolamento (esq.) o calor atravessa livre; com isolamento (dir.) o fluxo cai e a superfície interna fica mais próxima do conforto.",
            primitivas: [
              { t: "retangulo", p: [20, 40], w: 26, h: 120, cor: "tinta" },
              { t: "rotulo", p: [10, 30], texto: "Sem isolar" },
              { t: "seta", de: [50, 70], ate: [120, 70], cor: "destaque" },
              { t: "seta", de: [50, 100], ate: [120, 100], cor: "destaque" },
              { t: "seta", de: [50, 130], ate: [120, 130], cor: "destaque" },
              { t: "retangulo", p: [210, 40], w: 14, h: 120, cor: "tinta" },
              { t: "retangulo", p: [224, 40], w: 20, h: 120, hachura: true },
              { t: "rotulo", p: [205, 30], texto: "Isolado" },
              { t: "seta", de: [250, 100], ate: [275, 100], cor: "suave" },
              { t: "rotulo", p: [250, 120], texto: "fluxo baixo" },
            ],
          },
        },
      ],
    },
    {
      id: "modos-de-calor",
      titulo: "Os três modos de transferência de calor",
      blocos: [
        { tipo: "texto", texto: "O calor se move de três jeitos, e um bom projeto trata os três. Condução: calor caminha pela matéria sólida, de molécula em molécula (é o que a condutividade térmica λ mede). Convecção: calor viaja no ar ou na água em movimento (correntes dentro de uma cavidade, ar quente subindo). Radiação: calor viaja como onda eletromagnética e não precisa de meio (é por isso que o sol aquece o telhado mesmo com ar frio em volta)." },
        { tipo: "texto", texto: "Isolantes fibrosos e celulares vencem principalmente a condução e a convecção: eles prendem ar parado em poros minúsculos, e ar parado conduz muito mal (cerca de 0,025 W/(m·K)). Barreiras reflexivas e superfícies de baixa emissividade atacam a radiação. Entender qual modo domina no seu caso evita gastar com a solução errada: num ático ensolarado a radiação pesa; dentro de uma parede fechada, a condução." },
        { tipo: "video", titulo: "Condução térmica: a propagação do calor pela matéria", youtube: "PKXCx48Au5k" },
        { tipo: "tarefas", itens: [
          { id: "mapa-modos", titulo: "Classifique as perdas do seu caso", entrega: "Escolha um ambiente real e escreva, para cobertura, parede e piso, qual modo de calor você acha que domina e por quê." },
        ] },
      ],
    },
    {
      id: "fontes-contexto",
      titulo: "Fontes: contexto e normas de base",
      blocos: [
        { tipo: "texto", texto: "A base normativa brasileira de desempenho térmico está na NBR 15220 (métodos e propriedades) e na NBR 15575 (desempenho de edificações habitacionais). Guarde estes endereços: você vai voltar a eles ao longo do caderno." },
        { tipo: "fontes", titulo: "Referências de contexto", itens: [
          { titulo: "ABNT NBR 15220-3: Zoneamento bioclimático brasileiro (texto de referência, USP)", url: "https://edisciplinas.usp.br/pluginfile.php/5660736/mod_folder/content/0/NBR%2015220/NBR15220-3.pdf", tipo: "norma", nota: "Zonas bioclimáticas e diretrizes construtivas." },
          { titulo: "US DOE Energy Saver — guia de economia de energia no lar (2022)", url: "https://www.energy.gov/sites/default/files/2022-08/energy-saver-guide-2022.pdf", tipo: "livro", nota: "Capítulo de isolamento: tipos, onde isolar, R-value." },
          { titulo: "US DOE — Types of Insulation", url: "https://bsesc.energy.gov/energy-basics/types-insulation-0", tipo: "site", nota: "Famílias de isolante e aplicações típicas." },
          { titulo: "ABNT — catálogo de normas (busca por NBR 15220 e NBR 15575)", url: "https://www.abntcatalogo.com.br/norma.aspx?ID=86691", tipo: "norma", nota: "Para comprar e conferir o status vigente de cada parte." },
        ] },
      ],
    },

    // ===================== CAPÍTULO 2 — FÍSICA E LEITURA DO TEMA =====================
    {
      id: "condutividade-lambda",
      titulo: "Condutividade térmica (λ): o número que compara materiais",
      blocos: [
        { tipo: "texto", texto: "Condutividade térmica, símbolo λ (lambda), unidade W/(m·K), é a propriedade que diz quanto calor um material deixa passar por condução. Quanto menor o λ, melhor o isolante. É o único número que compara materiais na mesma régua, independente da espessura — por isso ele é o ponto de partida de toda comparação honesta. Um ar parado ideal fica perto de 0,025 W/(m·K); bons isolantes chegam a 0,030–0,040; o concreto passa de 1,7; o aço passa de 50." },
        { tipo: "texto", texto: "Cuidado com duas armadilhas. Primeira: λ não é fixo — sobe com a temperatura e com a umidade. A ficha da Rockwool para uma lã de rocha de lamela mostra λ de 0,037 a 10 °C subindo para 0,041 a 30 °C e 0,053 a 100 °C. Segunda: compare sempre materiais na mesma condição (mesma temperatura média e material seco) e prefira o valor de projeto (λD), declarado conforme ISO 10456, e não um número de folheto." },
        {
          tipo: "licao",
          pergunta: "Dois materiais têm λ = 0,035 e λ = 0,045 W/(m·K). Qual isola melhor, mantendo tudo igual?",
          alternativas: [
            "O de 0,045, porque o número é maior",
            "O de 0,035, porque menor λ significa menos calor conduzido",
            "São iguais, λ não influencia o isolamento",
          ],
          correta: 1,
          explicacao: "Menor λ = menos condução de calor para a mesma espessura e condição. Com λ = 0,035 você atinge a mesma resistência com menos espessura do que com 0,045.",
        },
      ],
    },
    {
      id: "resistencia-transmitancia",
      titulo: "Resistência (R) e transmitância (U): do material à parede",
      blocos: [
        { tipo: "texto", texto: "λ descreve o material; R e U descrevem o fechamento inteiro. Resistência térmica de uma camada é R = espessura ÷ λ, em (m²·K)/W: quanto maior, mais a camada atrasa o calor. Some as resistências de todas as camadas, mais as resistências superficiais interna (Rsi) e externa (Rse) tabeladas na NBR 15220-2, e você tem a resistência total do fechamento (RT)." },
        { tipo: "texto", texto: "Transmitância térmica U é o inverso da resistência total: U = 1 ÷ RT, em W/(m²·K). É o número que a NBR 15575 usa para exigir desempenho de paredes e coberturas. Quanto menor o U, menos calor o fechamento deixa passar. A lógica prática: dobrar a espessura do isolante quase dobra o R daquela camada e puxa o U para baixo — mas com retorno decrescente, porque as outras camadas e as resistências superficiais não mudam." },
        {
          tipo: "prancha",
          titulo: "Da camada ao U do fechamento",
          desenho: {
            legenda: "Cada camada tem R = e/λ. RT soma as camadas e as resistências superficiais. U = 1/RT.",
            primitivas: [
              { t: "retangulo", p: [30, 50], w: 30, h: 90, cor: "tinta" },
              { t: "rotulo", p: [28, 42], texto: "reboco" },
              { t: "retangulo", p: [60, 50], w: 60, h: 90, hachura: true },
              { t: "rotulo", p: [66, 42], texto: "isolante" },
              { t: "retangulo", p: [120, 50], w: 30, h: 90, cor: "tinta" },
              { t: "rotulo", p: [118, 42], texto: "bloco" },
              { t: "seta", de: [10, 95], ate: [30, 95], cor: "destaque" },
              { t: "rotulo", p: [2, 110], texto: "Rsi" },
              { t: "seta", de: [150, 95], ate: [172, 95], cor: "destaque" },
              { t: "rotulo", p: [165, 110], texto: "Rse" },
              { t: "rotulo", p: [185, 70], texto: "RT = Rsi + R1 + R2 +" },
              { t: "rotulo", p: [185, 88], texto: "R3 + Rse" },
              { t: "rotulo", p: [185, 118], texto: "U = 1 / RT" },
            ],
          },
        },
      ],
    },
    {
      id: "lei-fourier",
      titulo: "A lei de Fourier: o fluxo que você está combatendo",
      blocos: [
        { tipo: "texto", texto: "A condução obedece à lei de Fourier: o fluxo de calor é proporcional à área, ao gradiente de temperatura e à condutividade, e inversamente proporcional à espessura. Em regime permanente por uma camada plana: Q = λ·A·ΔT ÷ e. Em termos de U, para o fechamento: Q = U·A·ΔT. É a conta que transforma um U de projeto em watts reais de perda que o ar-condicionado terá de repor." },
        { tipo: "texto", texto: "Leia a fórmula como engenheiro de materiais: você não muda a área nem o ΔT do clima, mas controla λ (escolhendo o material) e e (escolhendo a espessura). Baixar λ ou aumentar e reduz Q na mesma proporção. Por isso a comparação de materiais sempre termina num par: qual λ, em qual espessura, por qual custo." },
        { tipo: "video", titulo: "Fluxo de calor e lei de Fourier, com exercícios resolvidos", youtube: "aea-ZR_US4E" },
        { tipo: "tarefas", itens: [
          { id: "conta-fourier", titulo: "Estime uma perda", entrega: "Para uma parede de 10 m² com U = 2,0 W/(m²·K) e ΔT = 10 °C, calcule Q = U·A·ΔT em watts. Depois refaça com U = 0,8 e compare." },
        ] },
      ],
    },
    {
      id: "ponte-termica",
      titulo: "Pontes térmicas: onde o calor fura o isolamento",
      blocos: [
        { tipo: "texto", texto: "Ponte térmica é um caminho onde o calor atravessa o envelope muito mais rápido do que pelo isolante ao redor: um pilar de concreto, uma viga, o perfil metálico de uma estrutura, a laje da varanda. O material da ponte tem λ alto e curto-circuita a camada isolante. O resultado é uma parede que perde mais calor do que o R nominal promete e, pior, uma superfície interna fria onde a umidade condensa e o mofo aparece." },
        { tipo: "texto", texto: "Em building science, a regra de ouro é a camada contínua: envolver a estrutura por fora com isolamento (isolamento contínuo) para manter a estrutura quente e cortar a ponte. Em estrutura de madeira ou steel frame, os montantes podem representar mais de um quarto da área da parede — por isso uma tira de isolante sobre os perfis (quebra térmica) muda muito o desempenho real." },
        {
          tipo: "prancha",
          titulo: "A ponte térmica e a quebra térmica",
          desenho: {
            legenda: "O pilar (λ alto) atravessa o isolante e vira ponte. A camada contínua por fora religa o isolamento.",
            primitivas: [
              { t: "retangulo", p: [24, 40], w: 120, h: 110, hachura: true },
              { t: "rotulo", p: [40, 32], texto: "isolante" },
              { t: "retangulo", p: [72, 40], w: 24, h: 110, cor: "tinta" },
              { t: "rotulo", p: [66, 165], texto: "pilar = ponte" },
              { t: "seta", de: [84, 150], ate: [84, 175], cor: "destaque" },
              { t: "retangulo", p: [180, 40], w: 90, h: 110, cor: "tinta" },
              { t: "retangulo", p: [270, 40], w: 18, h: 110, hachura: true },
              { t: "rotulo", p: [250, 32], texto: "camada continua" },
              { t: "rotulo", p: [185, 165], texto: "estrutura quente" },
            ],
          },
        },
        { tipo: "video", titulo: "Termografia revela pontes e falhas no envelope da construção", youtube: "oi4MEtGWKvo" },
      ],
    },
    {
      id: "fontes-fisica",
      titulo: "Fontes: física do calor e grandezas",
      blocos: [
        { tipo: "fontes", titulo: "Condução, R, U e lei de Fourier", itens: [
          { titulo: "LabEEE/UFSC — Transmitância térmica: método de cálculo (material técnico)", url: "https://labeee.ufsc.br/sites/default/files/documents/transmitancia_site.pdf", tipo: "artigo", nota: "RT, Rsi, Rse e U passo a passo pela NBR 15220-2." },
          { titulo: "LabEEE/UFSC — NBR 15220 parte 4: medição de resistência e condutividade", url: "https://labeee.ufsc.br/sites/default/files/projetos/normalizacao/Termica_parte4_SET2004.pdf", tipo: "norma", nota: "Base do ensaio de λ (placa quente protegida)." },
          { titulo: "Alex Amorim — Condução térmica (propagação do calor)", url: "https://www.youtube.com/watch?v=PKXCx48Au5k", tipo: "video" },
          { titulo: "Física e Exercício — Lei de Fourier + 3 exercícios clássicos", url: "https://www.youtube.com/watch?v=WKipUV4-3Xo", tipo: "video" },
        ] },
      ],
    },

    // ===================== CAPÍTULO 3 — O CATÁLOGO DE MATERIAIS =====================
    {
      id: "familias-materiais",
      titulo: "As famílias de isolante térmico",
      blocos: [
        { tipo: "texto", texto: "Isolantes se organizam em famílias pela forma como prendem o ar. Fibrosos minerais: lã de rocha e lã de vidro — fibras que seguram ar parado, incombustíveis, bons na acústica. Celulares plásticos: EPS, XPS, poliuretano/PIR — espumas de células cheias de gás, leves, muito usados. Naturais e reciclados: celulose, cortiça, fibra de madeira, lã de PET, lã de ovelha. Reflexivos e avançados: barreiras de baixa emissividade, aerogéis e painéis a vácuo (PIV)." },
        { tipo: "texto", texto: "Cada família ganha em um eixo e perde em outro. Os plásticos celulares têm λ baixo e são leves, mas são combustíveis e sensíveis ao calor. Os fibrosos minerais resistem ao fogo e isolam som, mas pesam mais e precisam de proteção contra a água. Os avançados têm λ imbatível, mas custam caro. Não existe campeão absoluto: existe o certo para aquele clima, aquela aplicação e aquele orçamento." },
        { tipo: "diagrama", titulo: "Mapa das famílias", codigo: `flowchart TD
  I["Isolantes termicos"] --> F["Fibrosos minerais"]
  I --> C["Celulares plasticos"]
  I --> N["Naturais e reciclados"]
  I --> A["Reflexivos e avancados"]
  F --> F1["La de rocha"]
  F --> F2["La de vidro"]
  C --> C1["EPS"]
  C --> C2["XPS"]
  C --> C3["PUR / PIR"]
  N --> N1["Celulose"]
  N --> N2["Cortica"]
  N --> N3["La de PET / madeira"]
  A --> A1["Barreira reflexiva"]
  A --> A2["Aerogel"]
  A --> A3["Painel a vacuo (PIV)"]` },
      ],
    },
    {
      id: "la-mineral",
      titulo: "Lã mineral: lã de rocha e lã de vidro",
      blocos: [
        { tipo: "texto", texto: "Lãs minerais são fibras obtidas pela fusão de rocha basáltica (lã de rocha) ou de areia e vidro reciclado (lã de vidro) a mais de 1000 °C, depois fiadas e ligadas em mantas e painéis. O λ típico fica em 0,033–0,044 W/(m·K), dependendo da densidade — a ficha da Rockwool de uma lamela traz 0,037 a 10 °C. A densidade manda: mais densa, melhor na acústica e com λ ligeiramente menor, mas mais pesada e cara." },
        { tipo: "texto", texto: "Forças da lã mineral: incombustível (a de rocha suporta temperaturas muito altas, usada até em caldeiras), excelente no isolamento acústico e estável no tempo. Fraquezas: absorve água se exposta, e a umidade dispara o λ (um estudo mostra o λ saltando de 0,037 para 0,055 quando a umidade sobe de 0 para 10%). Por isso ela pede barreira contra a água e instalação sem compressão, que esmaga os poros e piora o isolamento." },
        { tipo: "video", titulo: "Lã de vidro, de rocha ou PET? Comparando isolantes fibrosos", youtube: "vCSfgdEAdgY" },
        {
          tipo: "prancha",
          titulo: "Densidade e desempenho da lã mineral",
          desenho: {
            legenda: "Mesma espessura: mais densidade segura mais ar nas fibras e melhora acústica; λ cai um pouco e o peso sobe.",
            primitivas: [
              { t: "retangulo", p: [30, 50], w: 60, h: 90, cor: "suave" },
              { t: "rotulo", p: [28, 42], texto: "baixa dens." },
              { t: "rotulo", p: [36, 155], texto: "leve / forro" },
              { t: "retangulo", p: [130, 50], w: 60, h: 90, hachura: true },
              { t: "rotulo", p: [128, 42], texto: "alta dens." },
              { t: "rotulo", p: [128, 155], texto: "acustica / fachada" },
              { t: "seta", de: [100, 95], ate: [122, 95], cor: "destaque" },
              { t: "rotulo", p: [210, 70], texto: "+ densidade" },
              { t: "rotulo", p: [210, 88], texto: "- lambda" },
              { t: "rotulo", p: [210, 106], texto: "+ peso e custo" },
            ],
          },
        },
      ],
    },
    {
      id: "eps-xps",
      titulo: "Poliestireno: EPS e XPS",
      blocos: [
        { tipo: "texto", texto: "O poliestireno expandido (EPS, o popular isopor) é feito de pérolas de estireno expandidas com mais de 95% de ar; o poliestireno extrudado (XPS) é uma espuma de célula fechada, mais densa e contínua. λ do EPS fica em 0,031–0,040 W/(m·K) (sobe quanto menor a densidade); o XPS, por ter célula fechada, chega a 0,029–0,035. São leves, baratos, fáceis de cortar e muito usados em EIFS, lajes, forros e contrapisos." },
        { tipo: "texto", texto: "A grande diferença entre eles é a água. O XPS, de célula fechada, quase não absorve umidade, o que o torna o preferido em contato com o solo, contrapiso e cobertura invertida. O EPS absorve mais e perde desempenho molhado. Ambos são combustíveis: queimam e liberam fumaça, por isso a norma exige revestimento de proteção (reboco, placa) e cuidado com a reação ao fogo — nunca deixe EPS/XPS expostos como acabamento final." },
        { tipo: "video", titulo: "Isolamento térmico com EPS na construção: aplicação prática", youtube: "qqEqsiQNurs" },
        {
          tipo: "licao",
          pergunta: "Para isolar um contrapiso em contato com o solo úmido, entre EPS e XPS, qual é a escolha mais segura?",
          alternativas: [
            "EPS, porque é mais barato",
            "XPS, porque a célula fechada quase não absorve água e mantém o λ",
            "Tanto faz, os dois se comportam igual com umidade",
          ],
          correta: 1,
          explicacao: "XPS tem célula fechada e baixa absorção de água, mantendo o desempenho em ambiente úmido. EPS absorve mais e perde isolamento quando molha.",
        },
      ],
    },
    {
      id: "pur-pir",
      titulo: "Poliuretano e PIR: λ baixo em pouca espessura",
      blocos: [
        { tipo: "texto", texto: "Espumas rígidas de poliuretano (PUR) e poliisocianurato (PIR) têm o menor λ entre os isolantes comuns: 0,022–0,028 W/(m·K). Isso significa atingir o mesmo R com menos espessura — decisivo quando o espaço é curto (telha sanduíche, painel frigorífico, laje fina). Vêm em placas rígidas, painéis metálicos tipo sanduíche ou aplicadas por projeção (spray) que veda frestas e cria camada contínua sem emendas." },
        { tipo: "texto", texto: "Pontos de atenção: o λ anunciado melhora com o gás de expansão novo e piora um pouco ao longo do tempo (envelhecimento), então use o valor de projeto declarado. Combustível como todo plástico celular, o PIR resiste melhor ao fogo que o PUR puro. A espuma projetada exige aplicador treinado e controle de espessura e cura — fora de especificação, perde desempenho e adesão." },
        { tipo: "video", titulo: "Telha sanduíche e lã de rocha: isolamento aplicado em painéis", youtube: "UDOt_ofLLDs" },
        { tipo: "tarefas", itens: [
          { id: "comparar-espessura", titulo: "Compare espessura para o mesmo R", entrega: "Para R = 2,0 (m²·K)/W, calcule a espessura necessária (e = R·λ) com PIR (λ=0,024), EPS (λ=0,037) e lã de rocha (λ=0,040). Anote as três." },
        ] },
      ],
    },
    {
      id: "avancados",
      titulo: "Avançados: aerogel, painel a vácuo e reflexivos",
      blocos: [
        { tipo: "texto", texto: "Quando o espaço é precioso, entram os avançados. Mantas de aerogel têm λ de 0,013–0,020 W/(m·K), as mais baixas do mercado corrente, isolando o dobro da lã mineral na mesma espessura — usadas em reforma onde não há onde engrossar a parede. Painéis isolantes a vácuo (PIV) chegam a λ aparente ainda menor, mas são frágeis: furou, perdeu o vácuo e o desempenho despenca." },
        { tipo: "texto", texto: "Barreiras reflexivas (folhas de baixa emissividade) atacam a radiação, não a condução: só funcionam de verdade voltadas para uma câmara de ar (um colchão de ar ao lado do brilho). Isoladas, sem câmara, rendem pouco. São ótimas sob telhado quente, combinadas com um isolante de massa. Em todos os avançados, o custo por m² é alto — reserve-os para onde a restrição de espessura ou o ganho justifica o preço." },
        { tipo: "diagrama", titulo: "Quando pagar pelo avançado", codigo: `flowchart TD
  P{"Tenho espaco para engrossar?"} -->|Sim| M["Isolante comum e mais barato"]
  P -->|Nao| Q{"O ganho justifica o custo?"}
  Q -->|Sim| AV["Aerogel ou PIV"]
  Q -->|Nao| M
  R{"O problema e radiacao no telhado?"} -->|Sim| REF["Barreira reflexiva + camada de ar"]
  R -->|Nao| MASSA["Isolante de massa (fibra/espuma)"]` },
      ],
    },
    {
      id: "fontes-materiais",
      titulo: "Fontes: catálogo e valores de λ",
      blocos: [
        { tipo: "texto", texto: "Os valores de λ abaixo têm lastro em fichas de fabricante, tabela nacional de órgão oficial e revisão científica. Use-os para ordenar os candidatos, mas feche o projeto com o valor de projeto (λD) da ficha do produto específico." },
        { tipo: "fontes", titulo: "Propriedades e comparação de materiais", itens: [
          { titulo: "Rockwool — ficha técnica de lã de rocha (λ a 10/30/100 °C)", url: "https://www.rockwool.com/siteassets/rw-es/herramientas/fichas-tecnicas/climatizacion/ft_rockwool-prolit-lamella-mat_pt.pdf", tipo: "dataset", nota: "λ = 0,037 a 10 °C; mostra a variação com a temperatura." },
          { titulo: "SEAI (Irlanda) — tabela de condutividade térmica de materiais", url: "https://deapguide.seai.ie/fabric/heat-loss-u-value/thermal-conductivity", tipo: "dataset", nota: "λ de EPS, XPS, PUR, lã mineral e outros." },
          { titulo: "Linseis — wiki de isolamento térmico e materiais (faixas de λ)", url: "https://www.linseis.com/en/wiki/thermal-insulation-and-thermal-insulation-materials", tipo: "site", nota: "Aerogel 0,013–0,020; EPS 0,030–0,040." },
          { titulo: "Encyclopedia.pub — revisão de materiais isolantes inorgânicos", url: "https://encyclopedia.pub/entry/39938", tipo: "artigo", nota: "Faixas de λ por família e efeito da umidade." },
          { titulo: "LabEEE/UFSC — Biblioteca de componentes construtivos", url: "https://labeee.ufsc.br/sites/default/files/publicacoes/relatorios_pesquisa/Biblioteca_ComponentesConstrutivos_0.pdf", tipo: "dataset", nota: "Propriedades tabeladas conforme NBR 15220." },
        ] },
      ],
    },

    // ===================== CAPÍTULO 4 — MÉTODO: COMPARAR COM CRITÉRIO =====================
    {
      id: "criterios-comparacao",
      titulo: "A matriz de decisão: comparar por eixos, não por fama",
      blocos: [
        { tipo: "texto", texto: "Comparar material de isolamento é um problema de múltiplos critérios. Reduzir tudo ao λ é o erro mais comum. Monte uma matriz com seis eixos: (1) desempenho térmico (λ e R na espessura disponível), (2) reação ao fogo, (3) comportamento à umidade/vapor, (4) desempenho acústico, (5) impacto ambiental e durabilidade, (6) custo total instalado. Dê peso a cada eixo conforme o seu caso e só então pontue os candidatos." },
        { tipo: "texto", texto: "A matriz obriga a explicitar o que importa. Numa câmara fria, fogo e umidade pesam muito; numa divisória de escritório, a acústica domina; numa cobertura exposta, térmico e reação ao fogo lideram. O mesmo material pode ser o melhor numa linha e o pior noutra — e é exatamente isso que a matriz revela, evitando a decisão por catálogo bonito ou preço de etiqueta." },
        { tipo: "diagrama", titulo: "Os seis eixos da comparação", codigo: `flowchart LR
  T["Termico: lambda e R"] --- Fg["Reacao ao fogo"]
  Fg --- U["Umidade e vapor"]
  U --- Ac["Acustica"]
  Ac --- Am["Ambiental e durabilidade"]
  Am --- Cu["Custo instalado"]
  Cu --- T` },
      ],
    },
    {
      id: "fogo-reacao",
      titulo: "Reação ao fogo: o eixo que a segurança impõe",
      blocos: [
        { tipo: "texto", texto: "A reação ao fogo classifica como o material contribui para o incêndio: se é incombustível, se propaga chama, quanta fumaça e gotas libera. As lãs minerais são incombustíveis (classe A, melhor desempenho) e ainda funcionam como barreira de fogo. Os plásticos celulares (EPS, XPS, PUR) são combustíveis: queimam, derretem e geram fumaça — por isso a norma exige revestimento de proteção e limita onde podem ser usados." },
        { tipo: "texto", texto: "Em edifícios altos, rota de fuga, fachada e ambientes de risco, a classe de reação ao fogo deixa de ser preferência e vira exigência legal. Incêndios de fachada em vários países foram agravados por isolante combustível mal protegido. Regra de campo: se o fogo é crítico no seu caso, comece pela lã mineral; se escolher plástico celular, trate a proteção passiva como parte inseparável do sistema, não como detalhe." },
        { tipo: "video", titulo: "Lã de rocha incombustível aplicada em caldeiras (alta temperatura)", youtube: "MUisa_q9G6U" },
      ],
    },
    {
      id: "umidade-vapor",
      titulo: "Umidade e vapor: o inimigo silencioso do isolante",
      blocos: [
        { tipo: "texto", texto: "Isolante molhado isola mal: a água ocupa os poros que deveriam ter ar e o λ dispara. Dois comportamentos contam: a absorção de água líquida (XPS quase não absorve; EPS e lã mineral absorvem mais) e a resistência à difusão de vapor (fator μ). Em clima e uso úmidos, errar aqui condena o sistema: a água entra, não sai, e o isolante vira esponja." },
        { tipo: "texto", texto: "O controle de vapor exige entender o ponto de orvalho: onde, dentro da parede, o vapor esfria o bastante para condensar. A barreira de vapor vai no lado quente e úmido (no inverno, o interior); invertê-la aprisiona água dentro da parede. Em muitas montagens modernas prefere-se a estratégia de parede que seca para fora, com membrana permeável do lado externo. Projetar isso sem análise higrotérmica é apostar." },
        {
          tipo: "prancha",
          titulo: "Ponto de orvalho e barreira de vapor",
          desenho: {
            legenda: "Barreira de vapor no lado quente; o ponto de orvalho deve cair fora do isolante para a parede secar.",
            primitivas: [
              { t: "retangulo", p: [30, 45], w: 20, h: 110, cor: "tinta" },
              { t: "rotulo", p: [18, 37], texto: "interior" },
              { t: "linha", de: [52, 45], ate: [52, 155], cor: "destaque" },
              { t: "rotulo", p: [55, 165], texto: "barreira vapor" },
              { t: "retangulo", p: [54, 45], w: 90, h: 110, hachura: true },
              { t: "rotulo", p: [78, 37], texto: "isolante" },
              { t: "retangulo", p: [144, 45], w: 20, h: 110, cor: "tinta" },
              { t: "rotulo", p: [150, 37], texto: "exterior" },
              { t: "circulo", c: [140, 100], r: 6, cor: "destaque" },
              { t: "rotulo", p: [175, 96], texto: "ponto de orvalho" },
              { t: "seta", de: [100, 120], ate: [164, 120], cor: "suave" },
              { t: "rotulo", p: [100, 135], texto: "seca para fora" },
            ],
          },
        },
      ],
    },
    {
      id: "acustica-ambiental",
      titulo: "Acústica, ciclo de vida e custo real",
      blocos: [
        { tipo: "texto", texto: "Dois eixos que decidem empates. Acústica: isolantes fibrosos (lã de rocha e de vidro) absorvem som dentro de paredes e forros muito melhor que espumas rígidas — se o projeto quer térmico e acústico de uma vez, a lã mineral entrega os dois. Ambiental: olhe o ciclo de vida (energia de fabricação, origem, reciclabilidade, fim de vida). Materiais naturais (celulose, cortiça, PET) pontuam bem aqui; os plásticos derivam de petróleo." },
        { tipo: "texto", texto: "Por fim, o custo que importa é o instalado e por desempenho, não o preço do saco. Compare materiais pelo custo para atingir o mesmo R (ou o mesmo U de projeto), incluindo mão de obra, fixação e proteção. Um material com λ menor pode sair mais caro por m², mas resolver em menos espessura e menos estrutura — e às vezes é o espaço, não o dinheiro, a restrição que decide." },
        {
          tipo: "licao",
          pergunta: "Num projeto que precisa isolar termicamente E reduzir ruído entre ambientes, qual família tende a resolver os dois de uma vez?",
          alternativas: [
            "Espuma rígida de poliuretano",
            "Lã mineral (rocha ou vidro), fibrosa e densa",
            "Barreira reflexiva isolada",
          ],
          correta: 1,
          explicacao: "Isolantes fibrosos minerais absorvem som além de isolar calor. Espumas rígidas e barreiras reflexivas têm desempenho acústico fraco.",
        },
      ],
    },

    // ===================== CAPÍTULO 5 — CÁLCULO E MEDIÇÃO =====================
    {
      id: "calcular-u-parede",
      titulo: "Cálculo passo a passo: o U de uma parede",
      blocos: [
        { tipo: "texto", texto: "Vamos calcular o U de uma parede real pela NBR 15220-2. Camadas, de dentro para fora: reboco 2,5 cm (λ≈1,15), bloco cerâmico com equivalente λ≈0,90 e 14 cm, isolante de lã de rocha 5 cm (λ=0,040), reboco externo 2,5 cm. Resistência de cada camada: R = e/λ. Reboco: 0,025/1,15 ≈ 0,022. Bloco: 0,14/0,90 ≈ 0,156. Isolante: 0,05/0,040 = 1,25. Reboco externo: 0,022." },
        { tipo: "texto", texto: "Some as camadas: 0,022 + 0,156 + 1,25 + 0,022 = 1,45. Acrescente as resistências superficiais da NBR 15220-2 (parede, fluxo horizontal): Rsi = 0,13 e Rse = 0,04. RT = 1,45 + 0,13 + 0,04 = 1,62 (m²·K)/W. U = 1/RT = 0,62 W/(m²·K). Repare quem domina: só o isolante de 5 cm responde por 1,25 dos 1,62 — tirar o isolante levaria o U para cima de 2,7. É a prova numérica de por que o material isolante decide o desempenho." },
        {
          tipo: "prancha",
          titulo: "Peso de cada camada na resistência total",
          desenho: {
            legenda: "A barra do isolante (1,25) domina a soma. As demais camadas e as superfícies contribuem pouco.",
            primitivas: [
              { t: "linha", de: [20, 160], ate: [285, 160], cor: "tinta" },
              { t: "linha", de: [20, 30], ate: [20, 160], cor: "tinta" },
              { t: "retangulo", p: [35, 150], w: 26, h: 10, hachura: true },
              { t: "rotulo", p: [30, 172], texto: "reboco" },
              { t: "retangulo", p: [80, 128], w: 26, h: 32 },
              { t: "rotulo", p: [78, 172], texto: "bloco" },
              { t: "retangulo", p: [125, 35], w: 26, h: 125, cor: "destaque" },
              { t: "rotulo", p: [120, 172], texto: "isolante" },
              { t: "retangulo", p: [170, 150], w: 26, h: 10, hachura: true },
              { t: "rotulo", p: [165, 172], texto: "reboco" },
              { t: "retangulo", p: [215, 142], w: 26, h: 18 },
              { t: "rotulo", p: [214, 172], texto: "Rsi+Rse" },
              { t: "rotulo", p: [120, 24], texto: "R = 1,25" },
            ],
          },
        },
      ],
    },
    {
      id: "espessura-necessaria",
      titulo: "Dimensionar a espessura para um U alvo",
      blocos: [
        { tipo: "texto", texto: "Projeto costuma vir ao contrário: a norma ou a meta de conforto fixa um U alvo, e você descobre quanta espessura de isolante precisa. Caminho: defina U alvo e inverta para RT = 1/U. Subtraia o que a parede já oferece sem o isolante (camadas + Rsi + Rse) para achar o R que falta. A espessura do isolante é e = R_que_falta × λ. Pronto: você transformou uma meta de desempenho em centímetros de material." },
        { tipo: "texto", texto: "Exemplo: U alvo 0,5 → RT = 2,0. A parede sem isolante dá RT ≈ 0,37. Falta R = 1,63. Com lã de rocha (λ=0,040): e = 1,63×0,040 = 0,065 → 6,5 cm. Com PIR (λ=0,024): e = 0,039 → 3,9 cm. Mesmo alvo, metades de espessura diferentes — é assim que λ vira decisão de projeto e, às vezes, de estrutura (quanto a parede engrossa)." },
        { tipo: "tarefas", itens: [
          { id: "dimensionar", titulo: "Dimensione para o seu U alvo", entrega: "Escolha um U alvo (ex.: 0,8). Calcule RT=1/U, suponha a parede base com R≈0,37, ache o R que falta e a espessura com λ=0,037 e com λ=0,024. Registre as duas espessuras." },
        ] },
      ],
    },
    {
      id: "zona-bioclimatica",
      titulo: "Zona bioclimática: quanto a norma exige de você",
      blocos: [
        { tipo: "texto", texto: "No Brasil, quanto isolar depende de onde você está. A NBR 15220-3 divide o país em zonas bioclimáticas (atualizadas em 2024) e a NBR 15575 fixa, por zona, limites de transmitância e capacidade térmica para paredes e coberturas. Em linhas gerais: paredes externas com Upar ≤ 2,5 W/(m²·K) nas zonas 1 e 2, e limite dependente da cor/absortância nas zonas 3 a 8; coberturas com Ucob ≤ 2,3 W/(m²·K) em boa parte das zonas, mais exigente quanto mais quente o clima." },
        { tipo: "texto", texto: "A absortância solar (a cor) entra no jogo: superfície clara (absortância baixa) afrouxa o limite de U porque reflete calor; superfície escura aperta a exigência. Por isso telhado claro + isolante é uma dupla eficiente. Confira sempre a zona do seu município e a tabela vigente da NBR 15575, porque os limites mudam por zona e por emitância comprovada em laudo." },
        {
          tipo: "prancha",
          titulo: "Zona define a meta; cor ajusta o limite",
          desenho: {
            legenda: "Clima mais quente e cor mais escura apertam o U exigido; telhado claro afrouxa.",
            primitivas: [
              { t: "retangulo", p: [20, 40], w: 120, h: 50, cor: "suave" },
              { t: "rotulo", p: [26, 62], texto: "zona fria -> U folgado" },
              { t: "retangulo", p: [20, 110], w: 120, h: 50, hachura: true },
              { t: "rotulo", p: [26, 132], texto: "zona quente -> U apertado" },
              { t: "linha", de: [170, 40], ate: [170, 160], cor: "tinta" },
              { t: "circulo", c: [210, 70], r: 16, cor: "suave" },
              { t: "rotulo", p: [230, 68], texto: "claro: reflete" },
              { t: "circulo", c: [210, 130], r: 16, cor: "destaque", hachura: true },
              { t: "rotulo", p: [230, 128], texto: "escuro: absorve" },
            ],
          },
        },
      ],
    },
    {
      id: "medir-laboratorio",
      titulo: "Medir λ de verdade: o ensaio em laboratório",
      blocos: [
        { tipo: "texto", texto: "Número de folheto não substitui ensaio. O λ é medido por métodos padronizados: placa quente protegida (NBR 15220-4 / EN 12667) e fluxímetro (NBR 15220-5), que impõem um fluxo de calor conhecido pela amostra e medem o gradiente. O resultado é o λ na condição declarada (temperatura média, amostra seca) — a base do valor de projeto λD conforme ISO 10456, que já inclui margem para umidade e envelhecimento." },
        { tipo: "texto", texto: "Para afirmar desempenho em projeto, laudo ou disputa técnica, você precisa do ensaio de um laboratório acreditado, não de uma estimativa. Isso vale sobretudo para material alternativo, reciclado ou de fornecedor sem ficha confiável: sem o λ medido, não há como calcular R e U com segurança nem comprovar atendimento à NBR 15575." },
        { tipo: "mobilizacao", papel: "Laboratório de ensaio térmico (acreditado)", porque: "Afirmar o λ de um material exige ensaio padronizado (placa quente protegida ou fluxímetro); estimativa de catálogo não serve para projeto, laudo ou comprovação de norma.", entregaEsperada: "Relatório de ensaio com λ na condição declarada, método (NBR 15220-4/5 ou EN 12667) e incerteza, pronto para o cálculo de U.", gerenciadoPor: "zaeon" },
        { tipo: "fontes", titulo: "Métodos de medição e valores de projeto", itens: [
          { titulo: "LabEEE/UFSC — NBR 15220 parte 4 (placa quente protegida)", url: "https://labeee.ufsc.br/sites/default/files/projetos/normalizacao/Termica_parte4_SET2004.pdf", tipo: "norma" },
          { titulo: "ISO 10456 — propriedades higrotérmicas e valores de projeto (λD)", url: "https://www.iso.org/standard/40966.html", tipo: "norma", nota: "Converte λ medido em valor de projeto com correções." },
        ] },
      ],
    },
    {
      id: "fontes-calculo",
      titulo: "Fontes: cálculo e desempenho exigido",
      blocos: [
        { tipo: "fontes", titulo: "Transmitância, zona e desempenho", itens: [
          { titulo: "LabEEE/UFSC — Transmitância térmica: cálculo (NBR 15220-2)", url: "https://labeee.ufsc.br/sites/default/files/documents/transmitancia_site.pdf", tipo: "artigo" },
          { titulo: "ABNT NBR 15220-3 — zoneamento bioclimático (referência USP)", url: "https://edisciplinas.usp.br/pluginfile.php/5660736/mod_folder/content/0/NBR%2015220/NBR15220-3.pdf", tipo: "norma" },
          { titulo: "LabEEE/UFSC — NBR 15575-4 emenda, seção 11 (desempenho térmico)", url: "https://labeee.ufsc.br/sites/default/files/projetos/normalizacao/Emenda_NBR15575-4_Secao11.pdf", tipo: "norma", nota: "Limites de U de paredes por zona e absortância." },
          { titulo: "LabEEE/UFSC — documento técnico NBR 15575-4 (out/2020)", url: "https://labeee.ufsc.br/sites/default/files/documents/DT_NBR-15575-4_Emenda_Out2020.pdf", tipo: "artigo" },
        ] },
      ],
    },

    // ===================== CAPÍTULO 6 — PROJETO =====================
    {
      id: "onde-isolar",
      titulo: "Onde isolar primeiro: prioridade por superfície",
      blocos: [
        { tipo: "texto", texto: "Isolar tudo de uma vez raramente é possível — priorize por onde mais se perde. No clima brasileiro, a cobertura lidera: recebe o sol direto e, numa casa térrea, é a maior área de ganho de calor. Depois vêm as paredes expostas (sobretudo oeste e norte, que pegam sol da tarde), e por último pisos sobre espaços não climatizados. O US DOE recomenda tratar o ático como fronteira: isolar o forro ou o próprio deck do telhado." },
        { tipo: "texto", texto: "A ordem de ataque muda com o uso: numa câmara fria, todas as seis faces contam; num galpão, a cobertura e a ventilação dominam; num apartamento, a parede de fachada e a laje de cobertura. Decida com a conta de Q = U·A·ΔT: a superfície com maior produto A×ΔE de perda é por onde começar. Prioridade é sempre onde o retorno por real investido é maior." },
        { tipo: "diagrama", titulo: "Prioridade típica em clima quente", codigo: `flowchart TD
  C["Cobertura: sol direto, maior ganho"] --> P["Paredes oeste e norte"]
  P --> Pi["Piso sobre area nao climatizada"]
  C --> AC{"Tem atico?"}
  AC -->|Sim| F["Isolar o forro"]
  AC -->|Nao| D["Isolar o deck do telhado"]` },
      ],
    },
    {
      id: "detalhes-projeto",
      titulo: "Detalhes de projeto: continuidade antes de espessura",
      blocos: [
        { tipo: "texto", texto: "Um isolamento vale pela sua pior parte. De nada adianta 10 cm de lã se há uma faixa descoberta, uma emenda aberta ou um pilar atravessando a camada. O princípio de projeto é a continuidade: desenhar a camada isolante contornando a estrutura sem interrupção, resolver encontros (parede-laje, janela, platibanda) com detalhe explícito e prever o controle de ar, que às vezes importa mais que o próprio R." },
        { tipo: "texto", texto: "Projete junto: isolamento, barreira de ar e controle de vapor são um sistema. Defina o lado da barreira de vapor pelo clima, a membrana que deixa a parede secar, a fixação que não comprime o isolante e a proteção contra fogo e água. Um bom detalhe de canto economiza mais energia que centímetros extras no meio da parede — porque é no canto, no encontro e na emenda que o calor foge." },
        {
          tipo: "prancha",
          titulo: "Continuidade no encontro parede-cobertura",
          desenho: {
            legenda: "A camada isolante (hachura) deve ser contínua da parede à cobertura, sem abrir no encontro.",
            primitivas: [
              { t: "linha", de: [40, 150], ate: [40, 60], cor: "tinta" },
              { t: "linha", de: [40, 60], ate: [160, 30], cor: "tinta" },
              { t: "retangulo", p: [48, 70], w: 16, h: 80, hachura: true },
              { t: "curva", pts: [[56, 70], [90, 52], [150, 40]], cor: "destaque" },
              { t: "rotulo", p: [70, 95], texto: "camada continua" },
              { t: "circulo", c: [56, 62], r: 7, cor: "destaque" },
              { t: "rotulo", p: [66, 56], texto: "ponto critico" },
              { t: "seta", de: [200, 60], ate: [168, 44], cor: "suave" },
              { t: "rotulo", p: [205, 58], texto: "nao abrir aqui" },
            ],
          },
        },
      ],
    },
    {
      id: "mobilizacao-projeto",
      titulo: "Quem assina o projeto térmico",
      blocos: [
        { tipo: "texto", texto: "Escolher material e estimar espessura é trabalho de estudo; emitir o projeto que será construído e comprovar atendimento à NBR 15575 é ato de profissional habilitado. A análise higrotérmica (risco de condensação intersticial), a compatibilização com estrutura e a responsabilidade técnica pela solução exigem engenheiro ou arquiteto com ART ou RRT. É a assinatura que responde legalmente pelo desempenho e pela segurança." },
        { tipo: "mobilizacao", papel: "Engenheiro civil ou arquiteto (responsável técnico, ART/RRT)", porque: "O projeto térmico-construtivo, a verificação de condensação e a comprovação da NBR 15575 precisam de responsável habilitado; execução sem ART fica irregular e sem garantia de desempenho.", entregaEsperada: "Projeto com especificação do isolante (material, λD, espessura), detalhes de continuidade e barreira de vapor, memorial de cálculo de U e ART/RRT.", gerenciadoPor: "zaeon" },
        { tipo: "fontes", titulo: "Projeto e desempenho", itens: [
          { titulo: "US DOE — Types of Insulation (onde e como isolar)", url: "https://bsesc.energy.gov/energy-basics/types-insulation-0", tipo: "site" },
          { titulo: "LabEEE/UFSC — NBR 15575-4 emenda, seção 11", url: "https://labeee.ufsc.br/sites/default/files/projetos/normalizacao/Emenda_NBR15575-4_Secao11.pdf", tipo: "norma" },
        ] },
      ],
    },

    // ===================== CAPÍTULO 7 — EXECUÇÃO =====================
    {
      id: "instalacao-boas-praticas",
      titulo: "Instalação: o desempenho se ganha ou se perde aqui",
      blocos: [
        { tipo: "texto", texto: "O melhor material mal instalado rende como um material medíocre. Regras de ouro na aplicação de fibrosos e mantas: não comprima o isolante (comprimir esmaga o ar dos poros e aumenta o λ), preencha toda a cavidade sem deixar frestas, encoste bem nas bordas e contorne tubulações e caixas sem deixar vazios. Em placas rígidas, corte justo e vede as juntas; em espuma projetada, controle a espessura e a cura." },
        { tipo: "texto", texto: "Frestas e vazios são pontes de convecção: o ar circula pelo buraco e carrega calor, anulando o R local. Estudos de campo mostram quedas grandes de desempenho por instalação desleixada, mesmo com o material certo. Confira a continuidade antes de fechar: um forro ou drywall esconde para sempre o erro que você não corrigiu agora. Documente com foto cada trecho antes do fechamento." },
        { tipo: "video", titulo: "Como executar isolamento termoacústico com lã de rocha", youtube: "bYuRv3EL3Sg" },
        { tipo: "tarefas", itens: [
          { id: "checklist-instalacao", titulo: "Monte o checklist de aplicação", entrega: "Liste 6 itens para conferir antes de fechar o forro ou o drywall (sem compressão, sem fresta, bordas, tubulações, barreira de vapor no lado certo, proteção)." },
        ] },
      ],
    },
    {
      id: "seguranca-epi",
      titulo: "Segurança na obra: fibras, EPI e NR",
      blocos: [
        { tipo: "texto", texto: "Manusear lã mineral solta fibras que irritam pele, olhos e vias respiratórias; espuma projetada envolve produtos químicos reativos. A instalação segura exige EPI adequado (luvas, óculos, máscara/respirador compatível, roupa de manga longa), ventilação do ambiente e limpeza correta dos resíduos. As Normas Regulamentadoras brasileiras (NR-6 de EPI, NR-18 de construção, NR-35 de trabalho em altura quando houver telhado) enquadram esses cuidados." },
        { tipo: "texto", texto: "Não trate segurança como opcional de obra pequena: telhado e forro envolvem altura e espaço confinado, onde o acidente é grave. Trabalho em altura, montagem e uso de EPI têm exigências legais que extrapolam o bom senso e pedem orientação de quem responde por segurança do trabalho, inclusive a análise de risco da tarefa específica." },
        { tipo: "mobilizacao", papel: "Técnico ou engenheiro de segurança do trabalho", porque: "Aplicação de isolante em altura e em espaço confinado, com fibras e químicos, exige análise de risco e EPI conforme NR-6, NR-18 e NR-35; improvisar expõe a obra a acidente e autuação.", entregaEsperada: "Análise de risco da tarefa, lista de EPI por função e procedimento de trabalho seguro (altura, confinado, manuseio de fibras).", gerenciadoPor: "zaeon" },
      ],
    },
    {
      id: "erros-execucao",
      titulo: "Os erros de campo que mais custam caro",
      blocos: [
        { tipo: "texto", texto: "Erros recorrentes que apagam o desempenho projetado: comprimir a manta para caber; deixar frestas e trechos sem isolar; esquecer o isolamento das pontes térmicas (pilares, vigas, perfis); instalar a barreira de vapor no lado errado e aprisionar umidade; deixar EPS/XPS exposto sem proteção contra fogo; e molhar o material antes ou durante a instalação. Cada um desses sozinho pode dobrar a perda de calor do trecho." },
        { tipo: "texto", texto: "O antídoto é verificação em etapas: conferir e fotografar antes de cada fechamento, testar a continuidade do ar e, quando possível, inspecionar com termografia após a obra. O erro que você acha agora custa minutos; o mesmo erro descoberto pela conta de energia ou pelo mofo custa a reabertura do forro." },
        {
          tipo: "licao",
          pergunta: "Por que comprimir a lã mineral para ela caber num vão apertado piora o isolamento?",
          alternativas: [
            "Porque muda a cor do material",
            "Porque esmaga o ar parado dos poros, aumentando o λ e reduzindo o R",
            "Não piora, comprimir melhora o contato",
          ],
          correta: 1,
          explicacao: "O isolamento vem do ar parado nos poros. Comprimir expulsa esse ar, eleva a condutividade efetiva e derruba a resistência térmica daquele trecho.",
        },
      ],
    },

    // ===================== CAPÍTULO 8 — MANUTENÇÃO E VERIFICAÇÃO =====================
    {
      id: "inspecao-termografia",
      titulo: "Verificar com termografia: enxergar o calor que foge",
      blocos: [
        { tipo: "texto", texto: "A câmera termográfica transforma temperatura de superfície em imagem e revela o que o olho não vê: faixas quentes onde o isolante falta, pontes térmicas, frestas por onde o ar vaza e áreas úmidas. É a ferramenta de diagnóstico padrão para auditar um envelope depois da obra ou antes de uma reforma, comparando regiões que deveriam estar na mesma temperatura." },
        { tipo: "texto", texto: "A leitura tem técnica: funciona melhor com diferença de temperatura entre dentro e fora, exige cuidado com reflexos e emissividade das superfícies e deve seguir método (a ISO 6781 trata da detecção qualitativa de irregularidades térmicas em edifícios). Interpretar a imagem e emitir laudo é trabalho de termografista — uma mancha quente pode ser falta de isolante, umidade ou ponte, e a conduta muda com o diagnóstico." },
        { tipo: "video", titulo: "Termografia para detectar falhas e infiltrações em fachadas (estudo de caso)", youtube: "Qgb74x6UuqA" },
        {
          tipo: "prancha",
          titulo: "O que a termografia mostra numa fachada",
          desenho: {
            legenda: "Faixas quentes (destaque) denunciam ponte térmica no pilar e fresta na junta; o campo frio é o isolante íntegro.",
            primitivas: [
              { t: "retangulo", p: [30, 35], w: 240, h: 130, cor: "suave" },
              { t: "retangulo", p: [120, 35], w: 20, h: 130, cor: "destaque", hachura: true },
              { t: "rotulo", p: [100, 180], texto: "ponte (pilar)" },
              { t: "linha", de: [30, 95], ate: [270, 95], cor: "destaque" },
              { t: "rotulo", p: [200, 88], texto: "fresta na junta" },
              { t: "rotulo", p: [45, 55], texto: "campo frio = ok" },
            ],
          },
        },
      ],
    },
    {
      id: "manutencao-vida-util",
      titulo: "Manutenção e vida útil do isolamento",
      blocos: [
        { tipo: "texto", texto: "Isolamento não é eterno. Os inimigos ao longo do tempo: infiltração de água (que dispara o λ e pode apodrecer a estrutura), assentamento de material solto que abre vazios no topo, danos de roedores e pássaros, degradação de barreiras de vapor e envelhecimento do gás em espumas. Uma rotina simples de manutenção protege o investimento: checar telhado e calhas, procurar manchas de umidade no forro e refazer vedações que se soltam." },
        { tipo: "texto", texto: "Projete para durar: priorize materiais estáveis onde o acesso é difícil, proteja o isolante da água e do sol, e deixe registrado o que foi instalado (material, λD, espessura, local) para quem fizer manutenção no futuro. Um envelope bem cuidado mantém o desempenho por décadas; um negligenciado perde silenciosamente, e a conta de energia é quem avisa." },
        { tipo: "tarefas", itens: [
          { id: "plano-manutencao", titulo: "Escreva um plano de inspeção anual", entrega: "Defina 5 pontos para checar uma vez por ano (telhado, calhas, manchas no forro, vedações, sinais de roedor) e onde registrar o resultado." },
        ] },
      ],
    },

    // ===================== CAPÍTULO 9 — CASOS REAIS E RECURSOS =====================
    {
      id: "casos-reais",
      titulo: "Casos reais: a escolha muda com a aplicação",
      blocos: [
        { tipo: "texto", texto: "Caso 1 — Retrofit de cobertura de galpão exposto ao sol: o problema é térmico e de fogo. Solução típica: telha sanduíche ou manta sob a telha com lã de rocha (incombustível) e telha clara para baixar a absortância. Caso 2 — Câmara frigorífica: espessura é dinheiro e o alvo é λ mínimo com barreira de vapor impecável; painéis de PIR/PUR de célula fechada dominam, com atenção redobrada à reação ao fogo e à vedação das juntas." },
        { tipo: "texto", texto: "Caso 3 — Reforma de apartamento onde não dá para engrossar a parede: a restrição é espessura, e manta de aerogel resolve onde a lã mineral não cabe, apesar do custo. Caso 4 — Divisória de escritório que precisa de silêncio e algum conforto térmico: lã mineral densa entrega acústica e térmico juntos. A lição se repete: o vencedor muda com o eixo que aperta — fogo, umidade, espaço, acústica ou custo." },
        { tipo: "video", titulo: "Isolamento térmico e acústico de container com lã de rocha (caso prático)", youtube: "hbxvMKVtLO8" },
      ],
    },
    {
      id: "recursos",
      titulo: "Caixa de ferramentas: recursos para consultar",
      blocos: [
        { tipo: "texto", texto: "Reúna seus endereços de confiança. Para comprar e conferir o status das normas, o catálogo ABNT; para valores e método, o LabEEE/UFSC; para fichas de produto, os fabricantes; para enquadramento e acreditação de ensaio, órgãos oficiais. Volte a estas fontes sempre que precisar de um número com lastro." },
        { tipo: "fontes", titulo: "Recursos de consulta permanente", itens: [
          { titulo: "ABNT — catálogo de normas (NBR 15220, NBR 15575)", url: "https://www.abntcatalogo.com.br/norma.aspx?ID=86691", tipo: "norma" },
          { titulo: "LabEEE/UFSC — publicações e normalização de desempenho térmico", url: "https://labeee.ufsc.br/sites/default/files/documents/transmitancia_site.pdf", tipo: "site" },
          { titulo: "INMETRO — portal (acreditação de laboratórios e etiquetagem)", url: "https://www.gov.br/inmetro/pt-br", tipo: "site" },
          { titulo: "Rockwool Brasil — fichas e aplicações de lã de rocha", url: "https://www.rockwool.com/pt/", tipo: "site" },
          { titulo: "US DOE — Energy Saver (guia de isolamento 2022)", url: "https://www.energy.gov/sites/default/files/2022-08/energy-saver-guide-2022.pdf", tipo: "livro" },
          { titulo: "Linseis — wiki de materiais isolantes (faixas de λ)", url: "https://www.linseis.com/en/wiki/thermal-insulation-and-thermal-insulation-materials", tipo: "site" },
        ] },
      ],
    },
    {
      id: "checklist-final",
      titulo: "Checklist do comparador de materiais",
      blocos: [
        { tipo: "texto", texto: "Antes de fechar a escolha, passe por este roteiro: (1) qual é a zona bioclimática e o U alvo da norma? (2) qual eixo aperta neste caso — térmico, fogo, umidade, acústica, espaço ou custo? (3) qual o λD de projeto de cada candidato, na condição real? (4) qual espessura cada um exige para o U alvo? (5) a reação ao fogo e o comportamento à umidade atendem a aplicação? (6) o custo instalado por desempenho fecha? (7) os detalhes de continuidade e barreira estão resolvidos?" },
        { tipo: "diagrama", titulo: "Fluxo de decisão enxuto", codigo: `flowchart TD
  A["Zona e U alvo"] --> B["Qual eixo aperta?"]
  B --> C["Levantar lambda_D dos candidatos"]
  C --> D["Calcular espessura para o U alvo"]
  D --> E{"Fogo e umidade atendem?"}
  E -->|Nao| C
  E -->|Sim| F["Custo instalado por desempenho"]
  F --> G["Detalhar continuidade e barreira"]
  G --> H["Especificar e mobilizar RT"]` },
        {
          tipo: "licao",
          pergunta: "Qual afirmação resume a comparação honesta de isolantes?",
          alternativas: [
            "O material com menor λ é sempre o melhor, em qualquer caso",
            "A escolha é sempre a mais barata por m²",
            "O melhor material depende da zona, do eixo que aperta, do λD, da espessura possível e do custo instalado",
          ],
          correta: 2,
          explicacao: "Não há campeão absoluto. A decisão sai de uma matriz: desempenho térmico (λD e espessura), fogo, umidade, acústica, ambiental e custo instalado, pesados conforme o caso.",
        },
      ],
    },
    {
      id: "compilado",
      titulo: "Prancha de síntese",
      blocos: [
        { tipo: "texto", texto: "Você percorreu o caminho inteiro: entendeu os modos de calor e a lei de Fourier, aprendeu a ler λ, R e U, montou o catálogo das famílias de isolante, comparou por seis eixos em vez de fama, calculou o U de uma parede e dimensionou espessura pela zona bioclimática, projetou pela continuidade, executou sem comprimir nem deixar frestas, verificou com termografia e cuidou da vida útil. Arraste os cards pelo carimbo para montar a sua comparação na ordem que fizer sentido para o seu caso; abaixo da prancha, suas anotações e imagens aparecem na ordem das páginas. Lembre a regra do caderno: comparar na mesma condição, citar o λD ensaiado, e chamar o laboratório, o responsável técnico, a segurança e o termografista onde a norma e a segurança exigem." },
        { tipo: "compilado" },
      ],
    },
  ],
};
