import type { CadernoEstudo } from "../cadernosEstudo";

/**
 * Caderno de campo: Ecovila sustentável (moradia, água e energia compartilhadas).
 * Conteúdo com lastro: normas ABNT (NBR 15527, 16690, 7229/13969/17076), Lei 14.300/2022
 * e REN ANEEL 1.059/2023, Atlas Brasileiro de Energia Solar (INPE/LABREN), Global Solar Atlas,
 * Global Ecovillage Network, cartilhas ICMBio/Embrapa/Emater e vídeos reais verificados.
 * As etapas que a lei exige de um profissional habilitado viram blocos de mobilização.
 */
export const caderno: CadernoEstudo = {
  id: "ecovila",
  titulo: "Ecovila sustentável: moradia, água e energia compartilhadas",
  resumo:
    "Da leitura do terreno à operação do dia a dia: como um grupo projeta, calcula, constrói e cuida de moradia, água e energia em comum, sempre com fonte, norma e o profissional certo na hora certa.",
  paginas: [
    // ===================== CAPÍTULO 1 — CONTEXTO E VISÃO =====================
    {
      id: "abertura",
      titulo: "Como usar este caderno de campo",
      blocos: [
        { tipo: "texto", texto: "Este caderno acompanha um grupo que quer morar junto compartilhando casa, água e energia. Cada página tem leitura curta, um desenho ou diagrama, tarefas práticas e a fonte que sustenta a afirmação. Nada aqui é opinião solta: quando um número aparece, ele vem de norma, dataset ou estudo citado na própria página." },
        { tipo: "texto", texto: "Regra do caderno: antes de decidir, meça. Antes de construir, calcule. E quando a lei exigir um profissional habilitado, a página mostra um campo de mobilização que abre a vaga e acompanha até ficar pronto. Você vai ler, desenhar e anotar; o profissional assina o que precisa de assinatura." },
        { tipo: "diagrama", titulo: "O percurso do caderno", codigo: `flowchart TD
  A["Contexto e visão"] --> B["Ler o terreno e o clima"]
  B --> C["Método: permacultura e governança"]
  C --> D["Água: medir e dimensionar"]
  C --> E["Energia: demanda e geração"]
  C --> F["Saneamento ecológico"]
  C --> G["Bioconstrução"]
  D --> H["Execução da obra"]
  E --> H
  F --> H
  G --> H
  H --> I["Operação e manutenção"]
  I --> J["Governança e economia"]
  J --> K["Prancha de síntese"]` },
      ],
    },
    {
      id: "o-que-e-ecovila",
      titulo: "O que é, de fato, uma ecovila",
      blocos: [
        { tipo: "texto", texto: "A Global Ecovillage Network (GEN) define ecovila como uma comunidade, rural ou urbana, desenhada de forma consciente por processos participativos e de controle local, que busca regenerar o ambiente social e natural. Não é um condomínio verde de marketing: o compromisso é operar em quatro dimensões ao mesmo tempo, social, cultural, ecológica e econômica." },
        { tipo: "texto", texto: "Na prática isso muda o projeto de engenharia. Sistemas de água, energia e saneamento deixam de ser caixas que cada casa resolve sozinha e passam a ser infraestrutura comum, com responsáveis, calendário e registro de decisões. É mais barato por pessoa, mas exige acordo e manutenção combinada." },
        {
          tipo: "prancha",
          titulo: "Ecovila: partes e relações",
          desenho: {
            legenda: "Esquema conceitual. As moradias compartilham água, energia e saneamento com os espaços de uso comum.",
            primitivas: [
              { t: "retangulo", p: [12, 16], w: 280, h: 165, cor: "tinta" },
              { t: "retangulo", p: [28, 34], w: 48, h: 34, hachura: true },
              { t: "retangulo", p: [86, 34], w: 48, h: 34, hachura: true },
              { t: "retangulo", p: [144, 34], w: 48, h: 34, hachura: true },
              { t: "rotulo", p: [52, 28], texto: "Moradias" },
              { t: "circulo", c: [238, 52], r: 26, cor: "destaque" },
              { t: "rotulo", p: [214, 90], texto: "Uso comum" },
              { t: "seta", de: [100, 70], ate: [220, 60], cor: "suave" },
              { t: "retangulo", p: [28, 120], w: 70, h: 40 },
              { t: "rotulo", p: [34, 115], texto: "Água" },
              { t: "retangulo", p: [118, 120], w: 70, h: 40 },
              { t: "rotulo", p: [124, 115], texto: "Energia" },
              { t: "retangulo", p: [208, 120], w: 70, h: 40 },
              { t: "rotulo", p: [212, 115], texto: "Saneamento" },
              { t: "seta", de: [63, 120], ate: [63, 70], cor: "suave" },
              { t: "seta", de: [153, 120], ate: [110, 70], cor: "suave" },
            ],
          },
        },
      ],
    },
    {
      id: "por-que-compartilhar",
      titulo: "Por que compartilhar sai mais em conta",
      blocos: [
        { tipo: "texto", texto: "Compartilhar infraestrutura dilui custo fixo. Uma cisterna coletiva, um arranjo fotovoltaico comum ou um sistema de tratamento único atendem mais pessoas por real investido do que a mesma coisa replicada casa a casa. O ganho vem de escala e de ociosidade: nem todo mundo usa o pico ao mesmo tempo." },
        { tipo: "texto", texto: "O preço desse ganho é combinação. Infraestrutura comum precisa de regra de uso, rateio de custo e alguém responsável pela manutenção. Sem isso, o sistema mais barato no papel vira o mais caro na prática, porque quebra e ninguém conserta. Este caderno trata o acordo como parte do projeto, não como um detalhe." },
        {
          tipo: "licao",
          pergunta: "Qual é a principal vantagem técnica de compartilhar infraestrutura numa ecovila?",
          alternativas: [
            "Deixa a comunidade bonita para fotos",
            "Dilui o custo fixo por pessoa e aproveita a ociosidade dos picos",
            "Elimina a necessidade de manutenção",
          ],
          correta: 1,
          explicacao: "Escala reduz o custo por pessoa e picos não coincidentes reduzem o tamanho necessário. A manutenção continua existindo, só passa a ser combinada.",
        },
      ],
    },
    {
      id: "quatro-dimensoes",
      titulo: "As quatro dimensões da GEN",
      blocos: [
        { tipo: "texto", texto: "A GEN organiza o desenho de uma ecovila em quatro dimensões que se sustentam. Social: como as pessoas se relacionam e decidem. Cultural: valores, celebração e aprendizado. Ecológica: água, energia, solo, alimento e resíduo. Econômica: como circula o dinheiro e o trabalho. Um projeto que só olha para a dimensão ecológica costuma falhar na social." },
        { tipo: "diagrama", titulo: "Quatro dimensões que se amarram", codigo: `flowchart LR
  S["Social: decisão e convivência"] --- C["Cultural: valores e aprendizado"]
  C --- E["Ecológica: água, energia, solo"]
  E --- Ec["Econômica: trabalho e dinheiro"]
  Ec --- S` },
        { tipo: "tarefas", itens: [
          { id: "mapa-4d", titulo: "Mapeie as quatro dimensões do seu grupo", entrega: "Em uma folha, escreva uma frase para cada dimensão descrevendo o estado atual do grupo e um risco que você já enxerga." },
        ] },
      ],
    },
    {
      id: "video-ipec",
      titulo: "Observe uma ecovila brasileira",
      blocos: [
        { tipo: "texto", texto: "Antes de projetar, observe quem já fez. O Ecocentro IPEC, em Goiás, é referência brasileira em bioconstrução e sistemas integrados. Ao assistir, procure uma decisão que una um recurso local, uma necessidade dos moradores e uma rotina de manutenção, e anote o que mudaria na sua região." },
        { tipo: "video", titulo: "Conheça as criações sustentáveis da Ecovila do Ipec", youtube: "nVLFJofvn4E" },
        { tipo: "tarefas", itens: [
          { id: "nota-ipec", titulo: "Registre três decisões do vídeo", entrega: "Liste três soluções mostradas e, ao lado de cada uma, escreva qual recurso local ela aproveita." },
        ] },
      ],
    },
    {
      id: "fontes-contexto",
      titulo: "Fontes: contexto e definições",
      blocos: [
        { tipo: "texto", texto: "Guarde estes endereços. Eles sustentam as afirmações deste capítulo e servem de porta de entrada para aprofundar." },
        { tipo: "fontes", titulo: "Referências do contexto", itens: [
          { titulo: "Global Ecovillage Network — O que é uma ecovila", url: "https://ecovillage.org/about-ecovillages/", tipo: "site", nota: "Definição oficial e as quatro dimensões." },
          { titulo: "Ecovillage (verbete)", url: "https://en.wikipedia.org/wiki/Ecovillage", tipo: "site", nota: "Panorama histórico e exemplos no mundo." },
          { titulo: "Cartilha Bioconstruindo (ICMBio)", url: "https://www1.icmbio.gov.br/educacaoambiental/images/stories/biblioteca/permacultura/Cartilha_Bioconstruindo.pdf", tipo: "livro", nota: "Material público sobre permacultura e bioconstrução, cita o IPEC." },
        ] },
        {
          tipo: "licao",
          pergunta: "Segundo a GEN, uma ecovila pode ser:",
          alternativas: ["Apenas rural", "Apenas urbana", "Rural ou urbana, desde que desenhada por processo participativo local"],
          correta: 2,
          explicacao: "A definição da GEN é ampla: o que define não é o lugar, e sim o desenho consciente e participativo nas quatro dimensões.",
        },
      ],
    },

    // ===================== CAPÍTULO 2 — LER O TERRENO E O CLIMA =====================
    {
      id: "terreno-clima",
      titulo: "O clima manda no projeto",
      blocos: [
        { tipo: "texto", texto: "Antes de desenhar casas, leia o clima. Chuva mensal, meses secos, temperatura e vento dominante definem o tamanho da cisterna, a geração solar, o conforto térmico da moradia e até onde fica a horta. Dados climáticos públicos existem: o INMET disponibiliza normais e séries históricas das estações, e a CPRM mantém atlas pluviométricos regionais." },
        { tipo: "texto", texto: "Monte uma ficha climática do local: chuva média de cada mês, mês mais seco, mês mais chuvoso, temperatura média e amplitude, e direção do vento predominante. Essa ficha vai ser consultada em quase todas as páginas seguintes." },
        { tipo: "tarefas", itens: [
          { id: "ficha-clima", titulo: "Monte a ficha climática", entrega: "Baixe a normal climatológica da estação mais próxima (INMET) e preencha chuva mensal, mês seco, mês chuvoso e vento dominante." },
        ] },
        { tipo: "fontes", titulo: "Dados de clima", itens: [
          { titulo: "INMET — Normais Climatológicas", url: "https://portal.inmet.gov.br/normais", tipo: "dataset", nota: "Médias mensais de chuva e temperatura por estação." },
          { titulo: "Atlas comparativo de normas de água de chuva (análise)", url: "https://www.scielo.br/j/ac/a/qG5FpFbhNVjccQxRgHb9G3B/?format=pdf", tipo: "artigo", nota: "Discute dados pluviométricos no dimensionamento." },
        ] },
      ],
    },
    {
      id: "setores-permacultura",
      titulo: "Setores: de onde vêm sol, vento e água",
      blocos: [
        { tipo: "texto", texto: "Na leitura de permacultura, setores são as energias que entram no terreno de fora: a trajetória do sol no verão e no inverno, o vento dominante, o escoamento da água da chuva, o ruído e a vista. Marcar os setores antes de posicionar as construções evita erro caro, como pôr a captação solar na sombra ou a casa no corredor de vento frio." },
        {
          tipo: "prancha",
          titulo: "Diagrama de setores",
          desenho: {
            legenda: "O sol percorre de leste a oeste; o vento dominante e o escoamento da água entram por setores próprios.",
            primitivas: [
              { t: "circulo", c: [150, 100], r: 70, cor: "tinta" },
              { t: "rotulo", p: [140, 104], texto: "Terreno" },
              { t: "seta", de: [20, 100], ate: [78, 100], cor: "destaque" },
              { t: "rotulo", p: [14, 92], texto: "Sol (L)" },
              { t: "seta", de: [280, 100], ate: [222, 100], cor: "destaque" },
              { t: "rotulo", p: [250, 92], texto: "Poente (O)" },
              { t: "seta", de: [150, 20], ate: [150, 32], cor: "suave" },
              { t: "rotulo", p: [128, 16], texto: "Vento" },
              { t: "curva", pts: [[90, 170], [150, 158], [210, 172]], cor: "suave" },
              { t: "rotulo", p: [120, 188], texto: "Escoamento" },
            ],
          },
        },
        { tipo: "tarefas", itens: [
          { id: "setores", titulo: "Desenhe os setores do seu terreno", entrega: "Sobre um croqui, marque nascente, poente, vento dominante e para onde a água corre num dia de chuva forte." },
        ] },
      ],
    },
    {
      id: "zonas-permacultura",
      titulo: "Zonas: o que fica perto e o que fica longe",
      blocos: [
        { tipo: "texto", texto: "Zonas organizam o terreno pela frequência de uso. Zona 0 é a casa; zona 1, o que você visita todo dia (horta de tempero, galinheiro próximo); zona 5 é a área preservada, pouco tocada. A lógica é simples: quanto mais você mexe, mais perto fica, para gastar menos tempo e energia no caminho." },
        { tipo: "diagrama", titulo: "Zonas por frequência de uso", codigo: `flowchart TD
  Z0["Zona 0: moradia"] --> Z1["Zona 1: horta diária, uso comum"]
  Z1 --> Z2["Zona 2: pomar, pequenos animais"]
  Z2 --> Z3["Zona 3: cultivo maior, água"]
  Z3 --> Z4["Zona 4: manejo extensivo"]
  Z4 --> Z5["Zona 5: preservação"]` },
        {
          tipo: "licao",
          pergunta: "Onde deve ficar a horta de temperos que você colhe todo dia?",
          alternativas: ["Zona 5, junto da mata preservada", "Zona 1, bem perto da moradia", "Fora do terreno"],
          correta: 1,
          explicacao: "O que se usa diariamente fica na zona 1, perto da casa, para reduzir o tempo e o esforço de deslocamento.",
        },
      ],
    },
    {
      id: "topografia",
      titulo: "Topografia: a água obedece à inclinação",
      blocos: [
        { tipo: "texto", texto: "A topografia decide por onde a água anda, onde ela empoça e onde dá para plantar em nível. Curvas de nível são linhas que unem pontos de mesma altura: plantios e caminhos em nível seguram água e solo; construções acima da cota de cheia evitam alagamento. Para projeto real você precisa de um levantamento planialtimétrico com cotas." },
        {
          tipo: "prancha",
          titulo: "Curvas de nível e caminho da água",
          desenho: {
            legenda: "As curvas unem pontos de mesma altura; a água desce perpendicular a elas.",
            primitivas: [
              { t: "curva", pts: [[20, 40], [90, 50], [160, 44], [230, 54], [290, 46]], cor: "tinta" },
              { t: "curva", pts: [[20, 80], [90, 92], [160, 84], [230, 96], [290, 86]], cor: "tinta" },
              { t: "curva", pts: [[20, 120], [90, 134], [160, 124], [230, 138], [290, 126]], cor: "tinta" },
              { t: "seta", de: [150, 48], ate: [150, 128], cor: "destaque" },
              { t: "rotulo", p: [156, 92], texto: "Água desce" },
              { t: "rotulo", p: [24, 34], texto: "Cota +3" },
              { t: "rotulo", p: [24, 150], texto: "Cota 0" },
            ],
          },
        },
        { tipo: "mobilizacao", papel: "Topógrafo (levantamento planialtimétrico)", porque: "Posicionar moradias, reservatórios e saneamento exige cotas reais do terreno; estimativa a olho gera erro de nível e de drenagem.", entregaEsperada: "Planta planialtimétrica com curvas de nível, pontos cotados e amarração, em arquivo editável (DWG/PDF).", gerenciadoPor: "zaeon" },
      ],
    },
    {
      id: "agua-no-terreno",
      titulo: "Água no terreno: nascentes, APP e drenagem",
      blocos: [
        { tipo: "texto", texto: "Localize onde a água nasce, por onde escoa e onde se acumula. Nascentes e cursos d'água têm faixa de proteção (APP) definida pelo Código Florestal, e construir ou desmatar nessa faixa é infração. Mapear isso cedo evita projetar uma casa em área que a lei não deixa ocupar." },
        { tipo: "texto", texto: "Drenagem é projeto, não acaso. Caminhos de água bem conduzidos abastecem áreas de infiltração e evitam erosão; mal conduzidos, levam solo embora e alagam a parte baixa. Pense a água do telhado, do pátio e da estrada como um sistema único que termina infiltrando no solo." },
        { tipo: "fontes", titulo: "Água e proteção legal", itens: [
          { titulo: "Lei 12.651/2012 — Código Florestal (APP)", url: "http://www.planalto.gov.br/ccivil_03/_ato2011-2014/2012/lei/l12651.htm", tipo: "norma", nota: "Define faixas de preservação de nascentes e cursos d'água." },
        ] },
      ],
    },
    {
      id: "solo-e-vegetacao",
      titulo: "Solo e vegetação dizem o que o lugar aguenta",
      blocos: [
        { tipo: "texto", texto: "O solo define fundação, infiltração e o que cresce. Solo arenoso infiltra rápido e segura pouca água; argiloso segura água e incha. A vegetação espontânea é um laudo gratuito: indica se o solo é compactado, encharcado ou fértil. Antes de comprar insumo, leia o que já cresce ali." },
        { tipo: "texto", texto: "Para construir com terra (adobe, taipa, superadobe) você precisa saber a proporção de areia, silte e argila do solo local. Isso se testa em laboratório ou por ensaios de campo simples, e volta no capítulo de bioconstrução." },
        { tipo: "tarefas", itens: [
          { id: "teste-garrafa", titulo: "Faça o teste da garrafa", entrega: "Coloque solo e água numa garrafa, agite e deixe decantar 24 h. Meça as camadas de areia, silte e argila e anote a proporção aproximada." },
        ] },
      ],
    },
    {
      id: "legislacao-terreno",
      titulo: "O que a lei exige antes de ocupar",
      blocos: [
        { tipo: "texto", texto: "Antes de assentar casas você precisa saber o zoneamento (rural ou urbano), as regras do plano diretor municipal, as APPs e, se for captar muita água de fonte própria ou lançar efluente, a outorga e o licenciamento ambiental. Pular essa etapa é o jeito mais comum de ter a obra embargada." },
        { tipo: "diagrama", titulo: "Checagem legal do terreno", codigo: `flowchart TD
  A["Matricula e localizacao"] --> B{"Zona urbana ou rural?"}
  B -->|Urbana| C["Plano diretor e uso do solo"]
  B -->|Rural| D["Modulo rural e CAR"]
  C --> E["APP e restricoes ambientais"]
  D --> E
  E --> F["Outorga de agua / licenciamento se aplicavel"]` },
        {
          tipo: "licao",
          pergunta: "O que é APP no contexto do terreno?",
          alternativas: ["Um aplicativo de projeto", "Área de Preservação Permanente, como faixas de nascente e rio", "Um imposto rural"],
          correta: 1,
          explicacao: "APP é Área de Preservação Permanente, definida pelo Código Florestal; ocupar ou desmatar nela sem autorização é infração.",
        },
      ],
    },

    // ===================== CAPÍTULO 3 — MÉTODO: PERMACULTURA E GOVERNANÇA =====================
    {
      id: "permacultura-etica",
      titulo: "Permacultura: as três éticas",
      blocos: [
        { tipo: "texto", texto: "Permacultura é um método de design criado por Bill Mollison e David Holmgren para sistemas humanos duráveis. Ela se apoia em três éticas: cuidar da terra, cuidar das pessoas e repartir com justiça o excedente. Essas éticas não são decoração: elas decidem conflitos de projeto quando os números empatam." },
        { tipo: "video", titulo: "O que é Permacultura? | Princípios", youtube: "hgfCFfV8YUo" },
        { tipo: "tarefas", itens: [
          { id: "etica-aplicada", titulo: "Aplique uma ética a uma decisão real", entrega: "Escolha uma decisão do seu projeto e mostre como cada uma das três éticas a avaliaria." },
        ] },
      ],
    },
    {
      id: "principios-holmgren",
      titulo: "Os 12 princípios de Holmgren",
      blocos: [
        { tipo: "texto", texto: "Holmgren formulou 12 princípios de design. Entre eles: observe e interaja; capte e armazene energia; obtenha rendimento; use autorregulação e aceite feedback; não produza resíduo; integre em vez de segregar; use soluções pequenas e lentas. Eles funcionam como um checklist ao desenhar água, energia e alimento." },
        { tipo: "diagrama", titulo: "Princípios em uso no projeto", codigo: `flowchart LR
  A["Observe e interaja"] --> B["Capte e armazene energia"]
  B --> C["Obtenha rendimento"]
  C --> D["Aceite feedback"]
  D --> E["Nao produza residuo"]
  E --> F["Integre em vez de segregar"]` },
        { tipo: "fontes", titulo: "Princípios de permacultura", itens: [
          { titulo: "Permaculture Principles (Holmgren)", url: "https://permacultureprinciples.com/", tipo: "site", nota: "As três éticas e os 12 princípios, com material aberto." },
        ] },
      ],
    },
    {
      id: "design-por-camadas",
      titulo: "Projetar por camadas, do padrão ao detalhe",
      blocos: [
        { tipo: "texto", texto: "Bom projeto vai do grande para o pequeno: primeiro o padrão (água, acessos, setores e zonas), depois o detalhe (a parede, o cano, o painel). Decidir o detalhe antes do padrão é o erro clássico que leva a retrabalho. Este caderno segue essa ordem de propósito." },
        { tipo: "diagrama", titulo: "Do padrão ao detalhe", codigo: `flowchart TD
  P["Padrao: agua, acessos, zonas"] --> I["Infraestrutura comum"]
  I --> M["Moradia"]
  M --> D["Detalhe construtivo"]
  D --> O["Operacao e manutencao"]
  O -->|feedback| P` },
        { tipo: "tarefas", itens: [
          { id: "camadas", titulo: "Liste suas camadas de decisão", entrega: "Escreva, em ordem, as cinco decisões de maior impacto do seu projeto, do padrão ao detalhe." },
        ] },
      ],
    },
    {
      id: "governanca-intro",
      titulo: "Governança é infraestrutura invisível",
      blocos: [
        { tipo: "texto", texto: "Toda infraestrutura compartilhada precisa de uma estrutura de decisão. Quem autoriza um gasto comum? Como se resolve uma divergência sobre o uso da água na seca? Comunidades que não combinam isso cedo tendem a travar quando o primeiro conflito real aparece. Governança é tão parte do projeto quanto o cano e o fio." },
        { tipo: "texto", texto: "Três peças mínimas: um jeito de tomar decisão (consenso, consentimento, maioria qualificada), um jeito de registrar a decisão (ata, livro, repositório) e um jeito de revisar acordos que não funcionaram. Sem registro, a comunidade reabre as mesmas discussões para sempre." },
        {
          tipo: "licao",
          pergunta: "Por que registrar decisões é essencial numa ecovila?",
          alternativas: ["Para ter papel bonito", "Para não reabrir as mesmas discussões e saber quem assumiu o quê", "Porque a lei proíbe decisões verbais"],
          correta: 1,
          explicacao: "O registro evita repetir debates e deixa claro responsáveis e prazos. É o que transforma conversa em compromisso rastreável.",
        },
      ],
    },
    {
      id: "sociocracia",
      titulo: "Decisão por consentimento (sociocracia)",
      blocos: [
        { tipo: "texto", texto: "A sociocracia propõe decidir por consentimento, e não por unanimidade entusiasmada: uma proposta avança quando ninguém tem objeção fundamentada e séria. Isso costuma destravar grupos onde o consenso perfeito nunca chega. Decisões ficam em círculos com papéis definidos, e cada decisão tem data de revisão." },
        { tipo: "video", titulo: "Sociocracy 3.0 — Consent Decision Making Demonstration", youtube: "uJG5f4EBGGQ" },
        { tipo: "tarefas", itens: [
          { id: "objecao", titulo: "Treine o teste da objeção", entrega: "Pegue uma proposta real e escreva: há uma objeção séria e fundamentada? Se não, registre a decisão com data de revisão." },
        ] },
      ],
    },
    {
      id: "fontes-metodo",
      titulo: "Fontes: método e governança",
      blocos: [
        { tipo: "texto", texto: "Material de apoio para aprofundar design e tomada de decisão em grupo." },
        { tipo: "fontes", titulo: "Método e decisão coletiva", itens: [
          { titulo: "Permaculture: The Documentary (origem)", url: "https://www.youtube.com/watch?v=Syw1yfaWieQ", tipo: "video", nota: "Como Holmgren e Mollison chegaram à permacultura." },
          { titulo: "Sociocracy 3.0 — materiais abertos", url: "https://sociocracy30.org/", tipo: "site", nota: "Padrões de governança por consentimento, uso livre." },
          { titulo: "Cartilha Bioconstruindo (ICMBio)", url: "https://www1.icmbio.gov.br/educacaoambiental/images/stories/biblioteca/permacultura/Cartilha_Bioconstruindo.pdf", tipo: "livro", nota: "Liga permacultura e decisões comunitárias." },
        ] },
      ],
    },

    // ===================== CAPÍTULO 4 — ÁGUA =====================
    {
      id: "ciclo-agua-ecovila",
      titulo: "O ciclo da água na ecovila",
      blocos: [
        { tipo: "texto", texto: "Pense a água em ciclo, não em linha. Chuva no telhado abastece a cisterna; a cisterna atende usos não potáveis; o esgoto vira tratamento ecológico; a água tratada volta ao solo e às plantas. Cada etapa tem uma oferta, uma demanda e uma perda, e é isso que vamos calcular." },
        { tipo: "diagrama", titulo: "Ciclo da água", codigo: `flowchart LR
  C["Chuva no telhado"] --> F["Descarte inicial + filtro"]
  F --> R["Cisterna"]
  R --> U["Usos nao potaveis"]
  U --> E["Esgoto"]
  E --> T["Tratamento ecologico"]
  T --> S["Solo e plantas"]
  S --> C` },
        { tipo: "texto", texto: "Importante: água de chuva de telhado, no padrão da NBR 15527, é destinada a usos não potáveis (descarga, limpeza, irrigação). Água potável exige tratamento e controle de qualidade específicos, tratados adiante." },
      ],
    },
    {
      id: "balanco-hidrico",
      titulo: "Balanço hídrico: oferta contra demanda",
      blocos: [
        { tipo: "texto", texto: "O balanço hídrico compara, mês a mês, quanta água você capta e quanta consome. Se a oferta cobre a demanda inclusive no mês seco, o sistema fecha. Se não, você ajusta: aumenta a área de captação, amplia o reservatório ou reduz a demanda. Nunca dimensione uma cisterna sem esse balanço." },
        { tipo: "texto", texto: "Volume captável no mês = Área de telhado (m²) × Chuva do mês (mm) × Coeficiente de escoamento. A chuva em mm equivale a litros por metro quadrado. O coeficiente (runoff) desconta perdas; para telhado costuma-se usar entre 0,8 e 0,9." },
        {
          tipo: "prancha",
          titulo: "Oferta x demanda ao longo do ano",
          desenho: {
            legenda: "A linha de captação varia com a chuva; a demanda é mais constante. O vão no mês seco define o reservatório.",
            primitivas: [
              { t: "linha", de: [24, 170], ate: [290, 170], cor: "suave" },
              { t: "linha", de: [24, 20], ate: [24, 170], cor: "suave" },
              { t: "curva", pts: [[30, 60], [90, 40], [150, 120], [210, 150], [280, 70]], cor: "destaque" },
              { t: "linha", de: [30, 110], ate: [280, 110], cor: "tinta" },
              { t: "rotulo", p: [200, 104], texto: "Demanda" },
              { t: "rotulo", p: [40, 52], texto: "Captacao" },
              { t: "rotulo", p: [150, 164], texto: "Mes seco" },
              { t: "seta", de: [210, 148], ate: [210, 112], cor: "tinta" },
            ],
          },
        },
        { tipo: "tarefas", itens: [
          { id: "planilha-agua", titulo: "Monte a planilha de balanço", entrega: "Para cada mês, calcule captação (área × chuva × 0,85) e subtraia a demanda. Marque os meses em que o saldo fica negativo." },
        ] },
      ],
    },
    {
      id: "area-telhado-chuva",
      titulo: "Quanto o seu telhado capta",
      blocos: [
        { tipo: "texto", texto: "A área de captação é a projeção horizontal do telhado, não a área inclinada. Um telhado de 80 m² de projeção, num mês de 120 mm de chuva, com coeficiente 0,85, capta aproximadamente 80 × 120 × 0,85 = 8.160 litros. Troque pelos números da sua ficha climática e do seu telhado." },
        {
          tipo: "prancha",
          titulo: "Corte da captação",
          desenho: {
            legenda: "Da cobertura à cisterna: calha, descarte inicial, filtro e reservatório.",
            primitivas: [
              { t: "curva", pts: [[24, 80], [70, 40], [116, 80]], cor: "tinta" },
              { t: "rotulo", p: [52, 34], texto: "Telhado" },
              { t: "linha", de: [116, 80], ate: [128, 92], cor: "tinta" },
              { t: "seta", de: [128, 92], ate: [128, 120], cor: "destaque" },
              { t: "rotulo", p: [132, 108], texto: "Calha" },
              { t: "retangulo", p: [118, 120], w: 22, h: 40, hachura: true },
              { t: "rotulo", p: [100, 174], texto: "Descarte" },
              { t: "seta", de: [140, 130], ate: [178, 130], cor: "destaque" },
              { t: "retangulo", p: [180, 96], w: 96, h: 70, hachura: true },
              { t: "rotulo", p: [205, 90], texto: "Cisterna" },
            ],
          },
        },
        {
          tipo: "licao",
          pergunta: "O que entra no cálculo da água captável de um telhado?",
          alternativas: ["A cor da telha", "Área de projeção, chuva do mês e coeficiente de escoamento", "O número de moradores apenas"],
          correta: 1,
          explicacao: "Captável = área de projeção × chuva (mm = L/m²) × coeficiente de escoamento. A demanda entra depois, no balanço.",
        },
      ],
    },
    {
      id: "first-flush",
      titulo: "Descarte da primeira água (first flush)",
      blocos: [
        { tipo: "texto", texto: "A primeira água que lava o telhado carrega poeira, folhas, fezes de pássaro e fuligem. Por isso se instala um dispositivo de descarte inicial (first flush) que desvia esse primeiro volume antes de encher a cisterna. A NBR 15527 trata do descarte e de evitar conexão cruzada entre a rede de chuva e a de água potável." },
        { tipo: "texto", texto: "Regra prática comum: descartar da ordem de 1 a 2 litros por metro quadrado de telhado a cada chuva após estiagem. O dispositivo precisa de dreno e limpeza periódica, senão vira foco de mosquito." },
        { tipo: "tarefas", itens: [
          { id: "firstflush", titulo: "Dimensione o descarte inicial", entrega: "Multiplique a área do telhado por 1,5 L/m² e defina o volume do dispositivo de descarte. Anote como e com que frequência ele será limpo." },
        ] },
      ],
    },
    {
      id: "dimensionar-cisterna",
      titulo: "Dimensionar o reservatório (NBR 15527)",
      blocos: [
        { tipo: "texto", texto: "A NBR 15527 apresenta vários métodos para dimensionar o reservatório de água de chuva, entre eles Rippl, Azevedo Neto, Prático Alemão, Prático Inglês e Prático Australiano. Estudos de simulação em cidades brasileiras apontaram bom desempenho do método Prático Australiano em certos casos. O ponto não é decorar fórmula, e sim simular com a sua chuva real." },
        { tipo: "texto", texto: "O reservatório ideal é um compromisso: grande demais desperdiça dinheiro e deixa água parada; pequeno demais transborda na chuva e seca na estiagem. Simule o nível do reservatório mês a mês com a sua série de chuva e escolha o volume que atende o mês seco sem exagero." },
        { tipo: "diagrama", titulo: "Da medição ao volume", codigo: `flowchart TD
  A["Serie de chuva mensal"] --> B["Captacao por mes"]
  B --> C["Simular nivel do reservatorio"]
  C --> D{"Fecha no mes seco?"}
  D -->|Sim| E["Fixar volume e premissas"]
  D -->|Nao| F["Aumentar area, volume ou reduzir demanda"]
  F --> C` },
        { tipo: "fontes", titulo: "Norma e métodos", itens: [
          { titulo: "ABNT NBR 15527 (catálogo)", url: "https://www.normas.com.br/produto/normas-brasileiras-e-mercosul/pesquisar/cb-002/construcao-civil/palavra/9889/1", tipo: "norma", nota: "Aproveitamento de água de chuva de cobertura para fins não potáveis." },
          { titulo: "Comparação de métodos de dimensionamento (UTFPR)", url: "https://riut.utfpr.edu.br/jspui/bitstream/1/22598/3/MD_GAMUNI_VI_2014_2.pdf", tipo: "artigo", nota: "Simula Rippl, Azevedo Neto e Prático Australiano." },
        ] },
      ],
    },
    {
      id: "video-captacao",
      titulo: "Veja uma captação montada",
      blocos: [
        { tipo: "texto", texto: "Compare dois arranjos reais: cisterna enterrada e cisterna vertical. Observe no vídeo onde ficam o descarte inicial, o filtro e a saída, e como o sistema de chuva fica separado da água potável." },
        { tipo: "video", titulo: "Captação de Água da Chuva em cisterna enterrada", youtube: "M3MeJ3a5Dg0" },
        { tipo: "video", titulo: "Instalação da cisterna vertical de 1000 litros", youtube: "hz9VoWK0T2k" },
      ],
    },
    {
      id: "qualidade-potabilidade",
      titulo: "Água potável exige análise de laboratório",
      blocos: [
        { tipo: "texto", texto: "Água para beber e cozinhar é outra categoria. A potabilidade no Brasil é regida pelo anexo do Ministério da Saúde (hoje na Portaria GM/MS 888/2021, que consolidou a antiga 2.914/2011), com limites para bactérias, turbidez, metais e outros parâmetros. Não se declara água potável no olho: isso se prova em ensaio de laboratório acreditado." },
        { tipo: "mobilizacao", papel: "Laboratório de análise de água (acreditado)", porque: "Afirmar que uma fonte é potável exige ensaio laboratorial com parâmetros microbiológicos e físico-químicos; estimativa visual não atende a norma de potabilidade.", entregaEsperada: "Laudo de potabilidade com coliformes, turbidez, pH e metais, comparado aos limites da Portaria GM/MS 888/2021.", gerenciadoPor: "zaeon" },
        { tipo: "fontes", titulo: "Potabilidade", itens: [
          { titulo: "Portaria GM/MS 888/2021 — potabilidade da água", url: "https://bvsms.saude.gov.br/bvs/saudelegis/gm/2021/prt0888_07_05_2021.html", tipo: "norma", nota: "Padrão de potabilidade e plano de amostragem." },
        ] },
      ],
    },
    {
      id: "reuso-aguas-cinzas",
      titulo: "Reúso de águas cinzas",
      blocos: [
        { tipo: "texto", texto: "Águas cinzas são as de pia, chuveiro e lavanderia, sem contato com fezes. Tratadas de forma simples, servem para irrigação e descarga, cortando o consumo de água tratada. Mas reúso tem regra: água cinza não tratada não pode ficar exposta nem ser usada em contato direto com alimentos crus." },
        { tipo: "diagrama", titulo: "Separar para reusar", codigo: `flowchart LR
  P["Pia, chuveiro, lavanderia"] --> G["Caixa de gordura"]
  G --> T["Tratamento simples"]
  T --> I["Irrigacao / descarga"]
  N["Vaso sanitario"] --> S["Agua negra: tratamento proprio"]` },
        { tipo: "tarefas", itens: [
          { id: "separar-aguas", titulo: "Separe as redes no projeto", entrega: "No croqui hidráulico, desenhe redes distintas para água cinza e água negra e marque onde cada uma termina." },
        ] },
      ],
    },
    {
      id: "licao-agua",
      titulo: "Fixe: decisões de água",
      blocos: [
        { tipo: "texto", texto: "Antes de seguir para energia, confira se você já consegue defender as decisões de água com números e norma." },
        {
          tipo: "licao",
          pergunta: "Água de chuva de telhado, no padrão da NBR 15527, destina-se a:",
          alternativas: ["Beber diretamente sem tratamento", "Usos não potáveis, como descarga, limpeza e irrigação", "Qualquer uso, igual à da torneira"],
          correta: 1,
          explicacao: "A NBR 15527 trata de água de chuva para fins não potáveis. Tornar a água potável exige tratamento e controle de qualidade próprios.",
        },
        { tipo: "tarefas", itens: [
          { id: "defesa-agua", titulo: "Escreva a defesa do sistema de água", entrega: "Em um parágrafo, justifique o volume da cisterna citando a chuva do mês seco e a demanda não potável da comunidade." },
        ] },
      ],
    },
    {
      id: "fontes-agua",
      titulo: "Fontes: água",
      blocos: [
        { tipo: "texto", texto: "Reúna aqui a base normativa e de dados do capítulo de água." },
        { tipo: "fontes", titulo: "Referências de água", itens: [
          { titulo: "ABNT NBR 15527 (catálogo oficial)", url: "https://www.normas.com.br/produto/normas-brasileiras-e-mercosul/pesquisar/cb-002/construcao-civil/palavra/9889/1", tipo: "norma", nota: "Aproveitamento de água de chuva para fins não potáveis." },
          { titulo: "Portaria GM/MS 888/2021 (potabilidade)", url: "https://bvsms.saude.gov.br/bvs/saudelegis/gm/2021/prt0888_07_05_2021.html", tipo: "norma", nota: "Padrão brasileiro de potabilidade." },
          { titulo: "INMET — Normais Climatológicas", url: "https://portal.inmet.gov.br/normais", tipo: "dataset", nota: "Chuva mensal para o balanço hídrico." },
          { titulo: "Comparação de métodos de reservatório (UTFPR)", url: "https://riut.utfpr.edu.br/jspui/bitstream/1/22598/3/MD_GAMUNI_VI_2014_2.pdf", tipo: "artigo", nota: "Rippl, Azevedo Neto e Prático Australiano simulados." },
        ] },
      ],
    },

    // ===================== CAPÍTULO 5 — ENERGIA =====================
    {
      id: "demanda-energia",
      titulo: "Comece pela demanda, não pelo painel",
      blocos: [
        { tipo: "texto", texto: "O erro mais comum em energia é comprar painel antes de conhecer a demanda. Faça um inventário de cargas: cada equipamento, a potência em watts e as horas de uso por dia. Consumo diário (Wh) = potência × horas. Some tudo e você tem a demanda que o sistema precisa cobrir." },
        { tipo: "texto", texto: "Separe consumo diário de potência de pico. Dois chuveiros ligados ao mesmo tempo somam muitos watts por poucos minutos; uma geladeira consome pouco, mas 24 horas por dia. Esses dois números dimensionam coisas diferentes: energia e dimensionamento de inversor/condutores." },
        { tipo: "tarefas", itens: [
          { id: "inventario", titulo: "Monte o inventário de cargas", entrega: "Tabela com pelo menos oito equipamentos, potência (W), horas/dia e consumo (Wh). Some o consumo diário total." },
        ] },
      ],
    },
    {
      id: "irradiacao-hsp",
      titulo: "Quanto sol o local recebe (HSP)",
      blocos: [
        { tipo: "texto", texto: "A geração depende da irradiação solar local, resumida nas Horas de Sol Pleno (HSP): quantas horas por dia equivalem a 1.000 W/m². O Brasil tem HSP alto, mas varia por região e mês. O Atlas Brasileiro de Energia Solar (INPE/LABREN) e o Global Solar Atlas dão esse dado por local, de graça." },
        { tipo: "texto", texto: "Use a HSP média e também a do pior mês. Dimensionar pela média deixa a comunidade no escuro justamente no mês nublado; é por isso que se olha o mês crítico, sobretudo em sistema isolado." },
        { tipo: "fontes", titulo: "Dados solares", itens: [
          { titulo: "Atlas Brasileiro de Energia Solar (INPE/LABREN)", url: "http://labren.ccst.inpe.br/atlas_2017.html", tipo: "dataset", nota: "Irradiação por estado e município, download aberto." },
          { titulo: "Global Solar Atlas (ESMAP/Banco Mundial)", url: "https://globalsolaratlas.info/", tipo: "dataset", nota: "Irradiação e potencial FV por coordenada." },
        ] },
      ],
    },
    {
      id: "dimensionar-fv",
      titulo: "Dimensionar a potência fotovoltaica",
      blocos: [
        { tipo: "texto", texto: "Potência do arranjo (kWp) parte do consumo e da HSP: Geração diária ≈ kWp × HSP × PR, onde PR (performance ratio) desconta perdas por temperatura, cabos e inversor, tipicamente entre 0,75 e 0,80. Invertendo: kWp ≈ consumo diário (kWh) ÷ (HSP × PR)." },
        { tipo: "texto", texto: "Exemplo didático: 10 kWh/dia de consumo, HSP de 5,0 e PR de 0,78 pedem cerca de 10 ÷ (5,0 × 0,78) ≈ 2,56 kWp. Com módulos de 550 W, são 5 módulos aproximadamente. Troque pelos seus números e lembre: é estimativa; o projeto executivo é do profissional." },
        {
          tipo: "prancha",
          titulo: "Cadeia da geração ao uso",
          desenho: {
            legenda: "Módulos geram em corrente contínua; o inversor converte; o quadro distribui às cargas.",
            primitivas: [
              { t: "retangulo", p: [20, 40], w: 70, h: 44, hachura: true },
              { t: "rotulo", p: [30, 34], texto: "Modulos" },
              { t: "seta", de: [90, 62], ate: [120, 62], cor: "destaque" },
              { t: "retangulo", p: [122, 44], w: 46, h: 36 },
              { t: "rotulo", p: [126, 38], texto: "Inversor" },
              { t: "seta", de: [168, 62], ate: [198, 62], cor: "destaque" },
              { t: "retangulo", p: [200, 44], w: 46, h: 36 },
              { t: "rotulo", p: [204, 38], texto: "Quadro" },
              { t: "seta", de: [223, 80], ate: [223, 120], cor: "destaque" },
              { t: "rotulo", p: [196, 140], texto: "Cargas" },
            ],
          },
        },
        {
          tipo: "licao",
          pergunta: "Na fórmula geração ≈ kWp × HSP × PR, o que o PR representa?",
          alternativas: ["O preço do painel", "As perdas reais do sistema (temperatura, cabos, inversor)", "O número de moradores"],
          correta: 1,
          explicacao: "PR é a razão de desempenho, que desconta perdas; fica em torno de 0,75 a 0,80 em sistemas bem executados.",
        },
      ],
    },
    {
      id: "on-grid-off-grid",
      titulo: "Ligado à rede, isolado ou híbrido",
      blocos: [
        { tipo: "texto", texto: "Três arquiteturas. On-grid (conectado): usa a rede como bateria virtual via compensação, mais barato, mas não funciona na queda de energia sem equipamento extra. Off-grid (isolado): depende de baterias, independente, porém mais caro e exige gestão da autonomia. Híbrido: junta os dois, com backup em bateria." },
        { tipo: "diagrama", titulo: "Escolha da arquitetura", codigo: `flowchart TD
  A{"Tem rede da concessionaria?"} -->|Sim| B{"Precisa de energia na queda?"}
  A -->|Nao| C["Off-grid com baterias"]
  B -->|Nao| D["On-grid simples"]
  B -->|Sim| E["Hibrido com backup"]` },
        { tipo: "texto", texto: "Na ecovila, a decisão é coletiva e econômica: on-grid compartilhado pode usar autoconsumo remoto e geração compartilhada, previstos no marco legal da geração distribuída (Lei 14.300/2022)." },
      ],
    },
    {
      id: "baterias-autonomia",
      titulo: "Baterias e autonomia no sistema isolado",
      blocos: [
        { tipo: "texto", texto: "No sistema isolado, a bateria define por quantos dias nublados a comunidade aguenta. Autonomia típica de projeto fica entre 1 e 3 dias. O banco é dimensionado pelo consumo diário, pela autonomia desejada e pela profundidade de descarga admitida pela tecnologia (lítio admite descarga mais profunda que chumbo-ácido)." },
        { tipo: "texto", texto: "Baterias são o item mais caro e o que mais exige cuidado e descarte correto. Por isso muitas ecovilas priorizam reduzir demanda e usar on-grid antes de montar bancos grandes. Energia que você não gasta é a mais barata de todas." },
        { tipo: "tarefas", itens: [
          { id: "autonomia", titulo: "Calcule a energia do banco", entrega: "Multiplique consumo diário por 2 dias de autonomia e divida pela profundidade de descarga (ex.: 0,8 para lítio). Anote o resultado em kWh." },
        ] },
      ],
    },
    {
      id: "video-fv",
      titulo: "Veja o dimensionamento na prática",
      blocos: [
        { tipo: "texto", texto: "Acompanhe um passo a passo de dimensionamento de sistema fotovoltaico conectado à rede e confira se os números batem com a fórmula que você aprendeu." },
        { tipo: "video", titulo: "É muito simples dimensionar sistema de energia solar on grid", youtube: "9XAuV3QIrHM" },
      ],
    },
    {
      id: "ligacao-rede",
      titulo: "Ligar à rede exige profissional habilitado",
      blocos: [
        { tipo: "texto", texto: "Conectar geração à rede da concessionária não é tarefa de amador. O marco legal (Lei 14.300/2022) e a REN ANEEL 1.059/2023 definem o processo de acesso, medição e compensação. A concessionária exige projeto e ART (Anotação de Responsabilidade Técnica) de profissional habilitado, e a ligação final é feita por eletricista qualificado." },
        { tipo: "mobilizacao", papel: "Engenheiro eletricista habilitado (projeto e ART)", porque: "A ligação à rede, o parecer de acesso e a compensação de energia exigem projeto assinado e ART; executar por conta própria é ilegal e perigoso.", entregaEsperada: "Projeto elétrico com ART, parecer de acesso aprovado pela distribuidora e comissionamento do sistema.", gerenciadoPor: "zaeon" },
        { tipo: "fontes", titulo: "Marco legal da geração distribuída", itens: [
          { titulo: "Lei 14.300/2022 — marco legal da GD", url: "http://www.planalto.gov.br/ccivil_03/_ato2019-2022/2022/lei/L14300.htm", tipo: "norma", nota: "Micro e minigeração distribuída, autoconsumo e geração compartilhada." },
          { titulo: "REN ANEEL 1.059/2023", url: "https://www2.aneel.gov.br/cedoc/ren20231059.pdf", tipo: "norma", nota: "Regulamenta a Lei 14.300 (acesso, medição, compensação)." },
        ] },
      ],
    },
    {
      id: "seguranca-eletrica",
      titulo: "Segurança do arranjo fotovoltaico (NBR 16690)",
      blocos: [
        { tipo: "texto", texto: "A parte de corrente contínua do sistema solar tem riscos próprios: arco elétrico, falha de isolação e incêndio. A ABNT NBR 16690 define requisitos de projeto do arranjo fotovoltaico (condutores, proteção, aterramento), em conjunto com a NBR 5410 (baixa tensão) e a NBR 5419 (proteção contra descargas)." },
        { tipo: "texto", texto: "Para a comunidade, isso significa duas coisas: dispositivos de seccionamento e proteção bem especificados, e manutenção que não improvisa. Painel não desliga sozinho: enquanto houver sol, há tensão. Intervenção é com profissional." },
        { tipo: "fontes", titulo: "Norma elétrica FV", itens: [
          { titulo: "ABNT NBR 16690 (apresentação técnica)", url: "https://www.osetoreletrico.com.br/?p=169102", tipo: "norma", nota: "Instalações elétricas de arranjos fotovoltaicos: requisitos de projeto." },
        ] },
      ],
    },
    {
      id: "licao-energia",
      titulo: "Fixe: decisões de energia",
      blocos: [
        { tipo: "texto", texto: "Verifique se você consegue dimensionar e defender o sistema de energia." },
        {
          tipo: "licao",
          pergunta: "Qual é a ordem correta ao projetar energia?",
          alternativas: ["Comprar painel, depois ver a demanda", "Levantar a demanda, medir a HSP e então dimensionar a geração", "Instalar baterias primeiro"],
          correta: 1,
          explicacao: "Primeiro a demanda (inventário de cargas), depois a HSP local, e só então a potência do arranjo. Começar pelo equipamento leva a erro de tamanho.",
        },
        { tipo: "tarefas", itens: [
          { id: "defesa-energia", titulo: "Escreva a defesa do sistema de energia", entrega: "Em um parágrafo, justifique a potência escolhida citando consumo diário, HSP do pior mês e a arquitetura (on-grid, off-grid ou híbrido)." },
        ] },
      ],
    },
    {
      id: "fontes-energia",
      titulo: "Fontes: energia",
      blocos: [
        { tipo: "texto", texto: "Base normativa e de dados do capítulo de energia." },
        { tipo: "fontes", titulo: "Referências de energia", itens: [
          { titulo: "Lei 14.300/2022", url: "http://www.planalto.gov.br/ccivil_03/_ato2019-2022/2022/lei/L14300.htm", tipo: "norma", nota: "Marco legal da micro e minigeração distribuída." },
          { titulo: "REN ANEEL 1.059/2023", url: "https://www2.aneel.gov.br/cedoc/ren20231059.pdf", tipo: "norma", nota: "Regulamentação da Lei 14.300." },
          { titulo: "Atlas Brasileiro de Energia Solar (INPE/LABREN)", url: "http://labren.ccst.inpe.br/atlas_2017.html", tipo: "dataset", nota: "Irradiação solar nacional." },
          { titulo: "Global Solar Atlas", url: "https://globalsolaratlas.info/", tipo: "dataset", nota: "HSP e potencial FV por local." },
          { titulo: "ABNT NBR 16690 (requisitos de projeto FV)", url: "https://www.osetoreletrico.com.br/?p=169102", tipo: "norma", nota: "Segurança elétrica do arranjo." },
        ] },
      ],
    },

    // ===================== CAPÍTULO 6 — SANEAMENTO ECOLÓGICO =====================
    {
      id: "aguas-negras-cinzas",
      titulo: "Separe águas negras de águas cinzas",
      blocos: [
        { tipo: "texto", texto: "Saneamento ecológico começa por separar. Águas negras (do vaso, com fezes) exigem tratamento que elimine patógenos. Águas cinzas (pia, chuveiro, lavanderia) são bem menos contaminadas e aceitam soluções simples. Misturar as duas encarece e complica todo o tratamento." },
        { tipo: "diagrama", titulo: "Duas redes, dois destinos", codigo: `flowchart LR
  V["Vaso sanitario"] --> N["Agua negra"]
  P["Pia, chuveiro, lavanderia"] --> C["Agua cinza"]
  N --> TN["Tanque septico ou TEvap"]
  C --> TC["Circulo de bananeiras"]
  TN --> S["Solo"]
  TC --> S` },
        { tipo: "texto", texto: "Atenção: saneamento mexe com saúde pública e precisa seguir norma e licenciamento. As soluções ecológicas são reconhecidas, mas não dispensam projeto, dimensionamento e, dependendo do município, aprovação ambiental." },
      ],
    },
    {
      id: "tanque-septico",
      titulo: "Tanque séptico e tratamento complementar",
      blocos: [
        { tipo: "texto", texto: "O tanque séptico é a base do tratamento descentralizado: retém sólidos e inicia a digestão anaeróbia. O dimensionamento clássico vem da NBR 7229, com o volume útil em função do número de contribuintes, da contribuição de esgoto e do tempo de detenção. A NBR 13969 cobre o tratamento complementar e a disposição final; parte dessas normas vem sendo atualizada (NBR 17076, 2024)." },
        { tipo: "texto", texto: "Fórmula da NBR 7229 (forma geral): V = 1000 + N × (C × T + K × Lf), onde N é o número de pessoas, C a contribuição de esgoto por pessoa, T o tempo de detenção, K o fator de acumulação de lodo e Lf a contribuição de lodo. Os coeficientes saem de tabelas da própria norma, segundo o uso e o clima." },
        { tipo: "fontes", titulo: "Normas de esgoto", itens: [
          { titulo: "ABNT NBR 7229 (tanques sépticos)", url: "https://www.normas.com.br/produto/normas-brasileiras-e-mercosul/pesquisar/cb-002/construcao-civil/palavra/9889/1", tipo: "norma", nota: "Projeto, construção e operação de sistemas de tanques sépticos." },
          { titulo: "ABNT NBR 13969 (tratamento complementar)", url: "https://www.target.com.br/produtos/normas-tecnicas/27171/nbr13969-tanques-septicos-unidades-de-tratamento-complementar-e-disposicao-final-dos-efluentes-liquidos", tipo: "norma", nota: "Unidades complementares e disposição final do efluente." },
        ] },
      ],
    },
    {
      id: "tevap-bananeira",
      titulo: "Bacia de evapotranspiração (BET/TEvap)",
      blocos: [
        { tipo: "texto", texto: "A Bacia de Evapotranspiração, também chamada de TEvap (tanque de evapotranspiração) ou fossa de bananeiras, trata água negra em sistema fechado e impermeabilizado: o efluente entra numa câmara com entulho e brita, e plantas de folha larga (bananeira, mamão, taioba) evapotranspiram a água. Não há saída líquida para o solo." },
        { tipo: "texto", texto: "Dimensionamento prático difundido por Embrapa e Emater: da ordem de 2 m² por usuário, profundidade entre 1,0 e 1,4 m, com impermeabilização cuidadosa. É sistema que depende de manutenção da impermeabilização e da poda das plantas." },
        {
          tipo: "prancha",
          titulo: "Corte do TEvap",
          desenho: {
            legenda: "Câmara impermeabilizada: entulho e brita embaixo, solo e plantas em cima; a água sai por evapotranspiração.",
            primitivas: [
              { t: "retangulo", p: [24, 70], w: 256, h: 90, cor: "tinta" },
              { t: "curva", pts: [[24, 70], [150, 60], [280, 70]], cor: "suave" },
              { t: "circulo", c: [70, 44], r: 12, cor: "destaque" },
              { t: "circulo", c: [150, 40], r: 12, cor: "destaque" },
              { t: "circulo", c: [230, 44], r: 12, cor: "destaque" },
              { t: "rotulo", p: [96, 30], texto: "Bananeiras" },
              { t: "seta", de: [70, 60], ate: [70, 44], cor: "destaque" },
              { t: "seta", de: [10, 120], ate: [26, 120], cor: "tinta" },
              { t: "rotulo", p: [40, 150], texto: "Entulho + brita" },
              { t: "rotulo", p: [40, 110], texto: "Entrada" },
            ],
          },
        },
        { tipo: "mobilizacao", papel: "Engenheiro sanitarista ou ambiental", porque: "Dimensionar e licenciar o tratamento de esgoto afeta saúde pública e corpos d'água; a solução ecológica ainda exige projeto e, muitas vezes, aprovação do órgão ambiental.", entregaEsperada: "Memorial de cálculo do sistema, projeto executivo e, quando exigido, licença ou dispensa ambiental documentada.", gerenciadoPor: "zaeon" },
      ],
    },
    {
      id: "video-tevap",
      titulo: "Veja um TEvap sendo construído",
      blocos: [
        { tipo: "texto", texto: "Acompanhe a construção passo a passo de uma fossa por evapotranspiração e observe a impermeabilização, o enchimento com entulho e brita e o plantio das bananeiras." },
        { tipo: "video", titulo: "Projeto de Fossa por Evapotranspiração — passo a passo", youtube: "34Lmmt6aon0" },
        { tipo: "video", titulo: "Fossa Ecológica TEvap — Tanque de Evapotranspiração", youtube: "nCR9M9K4qsc" },
      ],
    },
    {
      id: "circulo-bananeiras-cinzas",
      titulo: "Círculo de bananeiras para águas cinzas",
      blocos: [
        { tipo: "texto", texto: "Para águas cinzas, o círculo de bananeiras é uma solução de baixo custo: uma cratera de cerca de 1,5 a 2,0 m de diâmetro e 0,8 m de profundidade, preenchida com material orgânico grosso (lenha, galhos) e cercada de bananeiras, que absorvem a água e os nutrientes. Antes dele, uma caixa de gordura retém óleo e evita entupimento." },
        { tipo: "texto", texto: "Cuidado importante: cerque o círculo para evitar acidentes com pessoas e animais, e não lance produtos químicos fortes (ácidos, cloro em excesso) nas águas cinzas, porque eles matam a vida que faz o sistema funcionar." },
        {
          tipo: "licao",
          pergunta: "O círculo de bananeiras é indicado para tratar:",
          alternativas: ["Água negra do vaso sanitário", "Águas cinzas de pia, chuveiro e lavanderia", "Água potável"],
          correta: 1,
          explicacao: "O círculo de bananeiras trata águas cinzas. Água negra pede sistema fechado como tanque séptico ou TEvap.",
        },
      ],
    },
    {
      id: "compostagem-banheiro-seco",
      titulo: "Banheiro seco e compostagem",
      blocos: [
        { tipo: "texto", texto: "O banheiro seco (compostável) separa a necessidade de água do tratamento de dejetos: cobre-se cada uso com material seco (serragem, folhas) e o conteúdo composta em câmara ventilada por tempo suficiente para eliminar patógenos. Bem operado, não tem cheiro e gera adubo; mal operado, vira problema sanitário." },
        { tipo: "texto", texto: "A regra de ouro é o tempo de maturação e a separação de urina. Composto humano exige maturação longa e, por segurança, costuma ser destinado a plantas não alimentícias, salvo protocolo técnico rigoroso. Trate como processo que precisa de disciplina coletiva." },
        { tipo: "tarefas", itens: [
          { id: "residuos-organicos", titulo: "Desenhe o fluxo de resíduo orgânico", entrega: "Mapeie de onde vem o resíduo orgânico da comunidade (cozinha, poda, banheiro seco) e onde cada fluxo composta e por quanto tempo." },
        ] },
      ],
    },
    {
      id: "licenciamento-saneamento",
      titulo: "Licenciamento e responsabilidade",
      blocos: [
        { tipo: "texto", texto: "Saneamento é a área onde improviso vira risco de saúde e multa. Mesmo soluções ecológicas podem exigir anuência do órgão ambiental e do município, e sempre exigem projeto dimensionado. Em alguns estados há normas específicas que proíbem fossas rudimentares, exatamente para empurrar as soluções para o lado técnico." },
        { tipo: "diagrama", titulo: "Caminho até operar legalmente", codigo: `flowchart TD
  A["Escolher tecnologia por tipo de agua"] --> B["Projeto dimensionado (norma)"]
  B --> C["Consultar orgao ambiental/municipio"]
  C --> D{"Exige licenca?"}
  D -->|Sim| E["Licenciar e registrar"]
  D -->|Nao| F["Dispensa documentada"]
  E --> G["Operar com manutencao"]
  F --> G` },
        { tipo: "fontes", titulo: "Saneamento descentralizado", itens: [
          { titulo: "Fossa Séptica Biodigestora e TEvap (Fundação Banco do Brasil)", url: "https://www.fbb.org.br/images/Editais/COPASA/2019/Fossa%20S%C3%A9ptica%20TEVAP.pdf", tipo: "livro", nota: "Guia público de tecnologia social de saneamento rural." },
        ] },
      ],
    },
    {
      id: "licao-saneamento",
      titulo: "Fixe: decisões de saneamento",
      blocos: [
        { tipo: "texto", texto: "Confira se você consegue separar as águas e escolher a tecnologia certa para cada uma." },
        {
          tipo: "licao",
          pergunta: "Qual combinação é tecnicamente coerente?",
          alternativas: [
            "Água negra no círculo de bananeiras e água cinza no TEvap",
            "Água negra no tanque séptico ou TEvap e água cinza no círculo de bananeiras",
            "Tudo misturado no mesmo buraco",
          ],
          correta: 1,
          explicacao: "Água negra pede sistema fechado (tanque séptico ou TEvap); água cinza aceita círculo de bananeiras. Misturar encarece e contamina.",
        },
        { tipo: "tarefas", itens: [
          { id: "defesa-saneamento", titulo: "Escreva a defesa do saneamento", entrega: "Em um parágrafo, justifique as tecnologias escolhidas e diga qual exige licenciamento na sua cidade." },
        ] },
      ],
    },
    {
      id: "fontes-saneamento",
      titulo: "Fontes: saneamento",
      blocos: [
        { tipo: "texto", texto: "Base normativa e guias do capítulo de saneamento." },
        { tipo: "fontes", titulo: "Referências de saneamento", itens: [
          { titulo: "ABNT NBR 7229 (tanques sépticos)", url: "https://www.target.com.br/produtos/normas-tecnicas/27476/nbr7229-projeto-construcao-e-operacao-de-sistemas-de-tanques-septicos", tipo: "norma", nota: "Dimensionamento do tanque séptico." },
          { titulo: "ABNT NBR 13969 (tratamento complementar)", url: "https://www.target.com.br/produtos/normas-tecnicas/27171/nbr13969-tanques-septicos-unidades-de-tratamento-complementar-e-disposicao-final-dos-efluentes-liquidos", tipo: "norma", nota: "Disposição final do efluente." },
          { titulo: "TEvap / Fossa de bananeiras (FBB)", url: "https://www.fbb.org.br/images/Editais/COPASA/2019/Fossa%20S%C3%A9ptica%20TEVAP.pdf", tipo: "livro", nota: "Tecnologia social de saneamento, com dimensionamento." },
        ] },
      ],
    },

    // ===================== CAPÍTULO 7 — BIOCONSTRUÇÃO =====================
    {
      id: "materiais-locais",
      titulo: "Construir com o que o lugar oferece",
      blocos: [
        { tipo: "texto", texto: "Bioconstrução é usar material local e de baixo impacto: terra, bambu, madeira de manejo, pedra, palha. A vantagem é econômica e térmica; a terra, abundante, tem boa inércia térmica. A desvantagem é exigir mão de obra, conhecimento e, muitas vezes, convencer a prefeitura, já que nem toda norma contempla essas técnicas." },
        { tipo: "diagrama", titulo: "Técnicas de terra crua", codigo: `flowchart TD
  T["Solo local"] --> A["Adobe: tijolo de terra seco ao sol"]
  T --> B["Taipa de pilao: terra compactada em forma"]
  T --> C["Superadobe: sacos de terra em fiadas"]
  T --> D["Cob: terra e palha modeladas a mao"]` },
        { tipo: "texto", texto: "A escolha da técnica depende do solo (proporção de areia e argila), do clima (chuva pede beiral e base protegida) e da mão de obra disponível. Não existe técnica melhor em abstrato: existe a certa para aquele solo, clima e equipe." },
      ],
    },
    {
      id: "adobe-taipa",
      titulo: "Adobe e taipa: terra que vira parede",
      blocos: [
        { tipo: "texto", texto: "Adobe é o tijolo de terra moldado e seco ao sol, assentado como alvenaria. Taipa de pilão é terra úmida compactada dentro de uma fôrma (taipal), camada por camada. Ambas pedem uma boa fundação de pedra ou concreto, bom beiral para proteger da chuva e, no Brasil sísmico baixo, cuidado estrutural com aberturas." },
        {
          tipo: "prancha",
          titulo: "Parede de terra protegida",
          desenho: {
            legenda: "A boa parede de terra tem chapéu (beiral) e botas (base elevada e impermeável).",
            primitivas: [
              { t: "retangulo", p: [90, 70], w: 120, h: 90, hachura: true },
              { t: "rotulo", p: [120, 120], texto: "Parede de terra" },
              { t: "retangulo", p: [84, 160], w: 132, h: 18, cor: "tinta" },
              { t: "rotulo", p: [96, 192], texto: "Base de pedra" },
              { t: "curva", pts: [[60, 50], [150, 30], [240, 50]], cor: "destaque" },
              { t: "rotulo", p: [128, 24], texto: "Beiral" },
              { t: "seta", de: [150, 30], ate: [150, 66], cor: "suave" },
            ],
          },
        },
        { tipo: "fontes", titulo: "Bioconstrução com terra", itens: [
          { titulo: "Cartilha Bioconstruindo (ICMBio)", url: "https://www1.icmbio.gov.br/educacaoambiental/images/stories/biblioteca/permacultura/Cartilha_Bioconstruindo.pdf", tipo: "livro", nota: "Capítulos de adobe, taipa, cob e superadobe." },
        ] },
      ],
    },
    {
      id: "superadobe",
      titulo: "Superadobe: terra ensacada",
      blocos: [
        { tipo: "texto", texto: "Superadobe, criado pelo arquiteto Nader Khalili (Cal-Earth), ergue paredes e cúpulas com sacos tubulares preenchidos de terra, empilhados em fiadas e travados com arame farpado entre as camadas. É rápido de aprender em mutirão e permite formas curvas. No Brasil, a variação hiperadobe usa tela em vez de saco fechado." },
        { tipo: "video", titulo: "Casas de Super Adobe passo a passo — documentário", youtube: "u31Ffd8ecIg" },
        { tipo: "tarefas", itens: [
          { id: "fiada-teste", titulo: "Planeje uma fiada de teste", entrega: "Defina a mistura de solo, a largura do saco e como vai travar as fiadas. Liste as ferramentas do mutirão." },
        ] },
      ],
    },
    {
      id: "teste-solo-construcao",
      titulo: "O solo serve para construir?",
      blocos: [
        { tipo: "texto", texto: "Construir com terra exige o solo certo: areia demais não liga, argila demais trinca ao secar. Testes de campo (garrafa, cordão, queda) dão uma primeira resposta, mas para projeto estrutural sério você precisa de ensaio de laboratório com granulometria e, dependendo da técnica, resistência." },
        { tipo: "mobilizacao", papel: "Laboratório de solos / geotecnia", porque: "A segurança estrutural de parede de terra depende da composição real do solo; testes caseiros indicam, mas não substituem a granulometria e os ensaios de laboratório.", entregaEsperada: "Laudo de granulometria e caracterização do solo, com recomendação de traço/estabilização adequado à técnica escolhida.", gerenciadoPor: "zaeon" },
        {
          tipo: "licao",
          pergunta: "Por que não basta o teste da garrafa para construir com terra?",
          alternativas: [
            "Porque o teste da garrafa é proibido",
            "Porque ele indica a proporção, mas segurança estrutural pede ensaio de laboratório",
            "Porque qualquer solo serve para qualquer técnica",
          ],
          correta: 1,
          explicacao: "Testes de campo orientam, mas o dimensionamento estrutural exige ensaio laboratorial de granulometria e, às vezes, de resistência.",
        },
      ],
    },
    {
      id: "telhado-e-agua",
      titulo: "Telhado: proteção e captação ao mesmo tempo",
      blocos: [
        { tipo: "texto", texto: "O telhado faz três trabalhos: protege a parede de terra da chuva, capta água para a cisterna e ajuda no conforto térmico. Beiral generoso é o seguro de vida da parede de terra. O telhado verde (cobertura vegetal) agrega inércia térmica, mas exige laje bem impermeabilizada, drenagem e avaliação de carga por um profissional." },
        { tipo: "video", titulo: "Como construir um Teto Verde — Bioconstrução", youtube: "_ZRHTxeB3XQ" },
        { tipo: "video", titulo: "Como fazer um telhado verde", youtube: "zT_bsoo5hT8" },
      ],
    },
    {
      id: "conforto-termico",
      titulo: "Conforto térmico sem gastar energia",
      blocos: [
        { tipo: "texto", texto: "Projeto bioclimático gasta menos energia porque resolve o conforto com a forma, não com a máquina. Orientação ao sol, ventilação cruzada, massa térmica (parede de terra), beiral que barra o sol do verão e deixa entrar o do inverno: tudo isso é projeto, e é de graça depois de construído." },
        { tipo: "diagrama", titulo: "Estratégias passivas", codigo: `flowchart LR
  O["Orientacao solar"] --> C["Conforto no inverno e verao"]
  V["Ventilacao cruzada"] --> C
  M["Massa termica da terra"] --> C
  B["Beiral e sombreamento"] --> C` },
        { tipo: "tarefas", itens: [
          { id: "bioclimatico", titulo: "Posicione a casa pelo sol", entrega: "No croqui, oriente a moradia para captar sol de inverno e barrar sol de verão, e marque as aberturas da ventilação cruzada." },
        ] },
      ],
    },
    {
      id: "projeto-estrutural",
      titulo: "Estrutura e responsável técnico",
      blocos: [
        { tipo: "texto", texto: "Casa é abrigo de gente: a estrutura não admite achismo. Mesmo em bioconstrução, fundação, dimensionamento de paredes, vãos, coberturas e esforços precisam de projeto e responsável técnico. É o que garante que a parede de terra bonita não vire risco em uma chuva forte ou com o tempo." },
        { tipo: "mobilizacao", papel: "Engenheiro civil ou arquiteto (responsável técnico, ART/RRT)", porque: "A segurança estrutural da edificação e a aprovação legal exigem projeto assinado por profissional habilitado, com ART ou RRT; bioconstrução não dispensa engenharia.", entregaEsperada: "Projeto estrutural e arquitetônico com ART/RRT, memorial e detalhes de fundação, paredes e cobertura.", gerenciadoPor: "zaeon" },
        { tipo: "texto", texto: "Dica de processo: envolva o responsável técnico desde o croqui, não só na hora de assinar. Projeto pensado junto com quem assina evita retrabalho e recusa na prefeitura." },
      ],
    },
    {
      id: "licao-bioconstrucao",
      titulo: "Fixe: decisões de bioconstrução",
      blocos: [
        { tipo: "texto", texto: "Verifique se você liga técnica, solo, clima e responsabilidade técnica." },
        {
          tipo: "licao",
          pergunta: "O que melhor protege uma parede de terra?",
          alternativas: ["Pintura cara", "Chapéu e botas: bom beiral e base elevada impermeável", "Nada, terra é impermeável"],
          correta: 1,
          explicacao: "A regra do chapéu e das botas: beiral generoso no topo e base de pedra ou concreto elevada protegem a parede de terra da chuva e da umidade do solo.",
        },
        { tipo: "tarefas", itens: [
          { id: "defesa-bio", titulo: "Escreva a defesa da moradia", entrega: "Em um parágrafo, justifique a técnica construtiva pelo solo, pelo clima e diga quem assina o projeto estrutural." },
        ] },
      ],
    },
    {
      id: "fontes-bioconstrucao",
      titulo: "Fontes: bioconstrução",
      blocos: [
        { tipo: "texto", texto: "Guias e referências do capítulo de bioconstrução." },
        { tipo: "fontes", titulo: "Referências de bioconstrução", itens: [
          { titulo: "Cartilha Bioconstruindo (ICMBio)", url: "https://www1.icmbio.gov.br/educacaoambiental/images/stories/biblioteca/permacultura/Cartilha_Bioconstruindo.pdf", tipo: "livro", nota: "Adobe, taipa, cob, superadobe e telhado verde." },
          { titulo: "Cal-Earth — Superadobe (Nader Khalili)", url: "https://www.calearth.org/", tipo: "site", nota: "Origem e técnica do superadobe." },
          { titulo: "Bioconstrução: alternativa de desenvolvimento sustentável (UTFPR)", url: "https://riut.utfpr.edu.br/jspui/bitstream/1/28502/1/bioconstrucaoalternativadesenvolvimentosustentavel.pdf", tipo: "artigo", nota: "Comparativo técnico de métodos com terra." },
        ] },
      ],
    },

    // ===================== CAPÍTULO 8 — EXECUÇÃO DA OBRA =====================
    {
      id: "canteiro-mutirao",
      titulo: "Mutirão: muita gente, pouca improvisação",
      blocos: [
        { tipo: "texto", texto: "O mutirão é a força da ecovila, mas só rende com organização. Antes do dia, defina tarefas, materiais separados, ferramentas suficientes, água e comida, e alguém coordenando cada frente. Mutirão desorganizado cansa a comunidade e desanima, que é o oposto do objetivo." },
        { tipo: "tarefas", itens: [
          { id: "plano-mutirao", titulo: "Planeje um dia de mutirão", entrega: "Liste as frentes de trabalho, quantas pessoas cada uma precisa, as ferramentas e quem coordena. Inclua pausa, água e comida." },
        ] },
        { tipo: "texto", texto: "Segurança não é opcional nem no mutirão: calçado fechado, proteção para olhos e mãos nas tarefas certas, e ninguém operando ferramenta sem saber. Um acidente num mutirão contamina a confiança do grupo inteiro." },
      ],
    },
    {
      id: "cronograma-fases",
      titulo: "Cronograma por fases",
      blocos: [
        { tipo: "texto", texto: "Obra de ecovila se faz por fases, não tudo de uma vez. Infraestrutura comum (água, acessos, energia, saneamento) costuma vir antes das moradias, porque sustenta a vida no canteiro. Um cronograma honesto reconhece dependências: não dá para rebocar a parede antes do telhado." },
        { tipo: "diagrama", titulo: "Ordem das fases", codigo: `flowchart LR
  A["Acessos e terraplanagem minima"] --> B["Agua e saneamento"]
  B --> C["Energia"]
  C --> D["Fundacoes"]
  D --> E["Paredes"]
  E --> F["Cobertura"]
  F --> G["Acabamento e instalacoes"]` },
        { tipo: "tarefas", itens: [
          { id: "cronograma", titulo: "Monte o cronograma de fases", entrega: "Ordene as fases da sua obra e marque as três maiores dependências (o que não pode começar antes de quê)." },
        ] },
      ],
    },
    {
      id: "aprovacao-prefeitura",
      titulo: "Aprovar na prefeitura e regularizar",
      blocos: [
        { tipo: "texto", texto: "Construção sem alvará é construção em risco: pode ser embargada, multada e impedida de regularizar depois. A aprovação exige projeto legal (arquitetônico), e às vezes complementares, protocolado na prefeitura. Em bioconstrução, o desafio extra é dialogar com um código de obras que nem sempre previu terra crua." },
        { tipo: "mobilizacao", papel: "Arquiteto ou engenheiro (projeto legal e aprovação)", porque: "A aprovação na prefeitura e a emissão de alvará exigem projeto legal assinado e compatível com o código de obras municipal; sem isso a obra fica irregular.", entregaEsperada: "Projeto legal aprovado, alvará de construção emitido e caminho de regularização (habite-se) definido.", gerenciadoPor: "zaeon" },
      ],
    },
    {
      id: "compras-coletivas",
      titulo: "Compras coletivas e logística",
      blocos: [
        { tipo: "texto", texto: "Comprar junto reduz preço e frete, mas exige caixa combinado, registro e alguém responsável. Material perecível (cimento, cal) estraga se comprado cedo demais; comprar na hora errada é desperdício. Logística de obra é parte do orçamento, não detalhe." },
        { tipo: "tarefas", itens: [
          { id: "compras", titulo: "Monte a lista de compras por fase", entrega: "Para cada fase do cronograma, liste os materiais, a quantidade estimada e quando comprar para não estragar nem faltar." },
        ] },
        { tipo: "texto", texto: "Registre tudo: nota, quem pagou, quanto, para qual fase. Esse registro alimenta o rateio de custos do capítulo de economia e evita o conflito clássico de quem pagou o quê." },
      ],
    },
    {
      id: "seguranca-obra",
      titulo: "Segurança e saúde no canteiro",
      blocos: [
        { tipo: "texto", texto: "Mesmo em autoconstrução, os princípios de segurança do trabalho valem: proteção contra queda em altura, cuidado com eletricidade, organização do canteiro, primeiros socorros à mão. Quando houver trabalhador contratado, a legislação trabalhista e as normas regulamentadoras passam a ser obrigação formal, não escolha." },
        { tipo: "diagrama", titulo: "Camadas de segurança", codigo: `flowchart TD
  A["Organizacao do canteiro"] --> B["Protecao individual"]
  B --> C["Procedimento por tarefa"]
  C --> D["Primeiros socorros e emergencia"]` },
        {
          tipo: "licao",
          pergunta: "Quando as normas trabalhistas de segurança se tornam obrigação formal?",
          alternativas: ["Nunca, em ecovila", "Quando há trabalhador contratado na obra", "Apenas em obras públicas"],
          correta: 1,
          explicacao: "Com trabalhador contratado, a legislação trabalhista e as normas regulamentadoras passam a ser obrigatórias. Em mutirão, os princípios continuam valendo por bom senso e cuidado.",
        },
      ],
    },
    {
      id: "licao-execucao",
      titulo: "Fixe: decisões de execução",
      blocos: [
        { tipo: "texto", texto: "Verifique se você sabe sequenciar a obra e regularizá-la." },
        {
          tipo: "licao",
          pergunta: "Por que a infraestrutura comum costuma vir antes das moradias?",
          alternativas: ["Por tradição", "Porque água, acesso e energia sustentam a vida no canteiro e as fases seguintes", "Porque é mais bonita"],
          correta: 1,
          explicacao: "Acessos, água, saneamento e energia sustentam o canteiro e são pré-requisito de muitas fases seguintes. Inverter a ordem trava a obra.",
        },
        { tipo: "tarefas", itens: [
          { id: "defesa-execucao", titulo: "Escreva a defesa do cronograma", entrega: "Em um parágrafo, justifique a ordem das fases e diga o que precisa de alvará antes de começar." },
        ] },
      ],
    },

    // ===================== CAPÍTULO 9 — OPERAÇÃO E MANUTENÇÃO =====================
    {
      id: "plano-manutencao",
      titulo: "Plano de manutenção: quem, o quê, quando",
      blocos: [
        { tipo: "texto", texto: "Sistema sem plano de manutenção é sistema que vai falhar sem ninguém perceber a tempo. Cada infraestrutura comum precisa de três respostas: quem é responsável, o que se inspeciona e com que frequência. Escreva isso antes de o sistema entrar em operação, não depois da primeira quebra." },
        { tipo: "diagrama", titulo: "Ciclo de manutenção", codigo: `flowchart TD
  A["Inspecao agendada"] --> B["Registrar observacao"]
  B --> C{"Ha falha?"}
  C -->|Nao| D["Agendar proxima inspecao"]
  C -->|Sim| E["Responsavel e prazo"]
  E --> F["Conferir reparo"]
  F --> D` },
        { tipo: "tarefas", itens: [
          { id: "plano-man", titulo: "Escreva o plano de um sistema", entrega: "Escolha um sistema (cisterna, FV ou saneamento), nomeie o responsável e defina o que inspecionar e a frequência." },
        ] },
      ],
    },
    {
      id: "calendario-inspecoes",
      titulo: "Calendário de inspeções",
      blocos: [
        { tipo: "texto", texto: "Transforme o plano em calendário. Alguns exemplos reais: limpar o descarte inicial e as calhas antes da estação chuvosa; verificar o nível e a limpeza da cisterna periodicamente; conferir conexões e sujeira dos módulos solares; inspecionar o TEvap e podar as bananeiras; limpar a caixa de gordura do círculo de bananeiras." },
        {
          tipo: "prancha",
          titulo: "Calendário anual de cuidados",
          desenho: {
            legenda: "Tarefas distribuídas no ano: cada marca é uma inspeção combinada.",
            primitivas: [
              { t: "linha", de: [20, 100], ate: [292, 100], cor: "tinta" },
              { t: "circulo", c: [50, 100], r: 6, cor: "destaque", hachura: true },
              { t: "circulo", c: [110, 100], r: 6, cor: "destaque", hachura: true },
              { t: "circulo", c: [170, 100], r: 6, cor: "destaque", hachura: true },
              { t: "circulo", c: [230, 100], r: 6, cor: "destaque", hachura: true },
              { t: "rotulo", p: [34, 130], texto: "Pre-chuva" },
              { t: "rotulo", p: [96, 80], texto: "Cisterna" },
              { t: "rotulo", p: [150, 130], texto: "Modulos FV" },
              { t: "rotulo", p: [210, 80], texto: "Saneamento" },
            ],
          },
        },
        { tipo: "tarefas", itens: [
          { id: "calendario-man", titulo: "Monte o calendário anual", entrega: "Distribua pelo ano as inspeções de água, energia e saneamento, com mês e responsável de cada uma." },
        ] },
      ],
    },
    {
      id: "monitoramento-consumo",
      titulo: "Medir para melhorar",
      blocos: [
        { tipo: "texto", texto: "O que não se mede, não se gerencia. Acompanhar consumo de água e energia mês a mês mostra vazamentos, desperdícios e tendências antes que virem crise. Um hidrômetro na entrada, a leitura do inversor e uma planilha simples já dão à comunidade um painel honesto do próprio consumo." },
        { tipo: "texto", texto: "Compare o medido com o projetado. Se o consumo real estourou a premissa, ou houve desperdício, ou a premissa estava errada; os dois casos pedem ação. Medição transforma discussão de opinião em discussão de número." },
        {
          tipo: "licao",
          pergunta: "Para que serve medir consumo mês a mês?",
          alternativas: [
            "Para encher planilha",
            "Para detectar vazamentos e desperdícios cedo e comparar com o projetado",
            "Não serve para nada depois da obra",
          ],
          correta: 1,
          explicacao: "A medição revela vazamentos, desperdícios e desvios do projeto a tempo de corrigir, e troca a discussão de opinião por dado.",
        },
      ],
    },
    {
      id: "registro-decisoes",
      titulo: "Registro vivo das decisões",
      blocos: [
        { tipo: "texto", texto: "A memória da comunidade precisa morar em algum lugar que não seja a cabeça de uma pessoa. Um livro de atas, um repositório ou um caderno compartilhado guarda decisões, acordos de manutenção e lições das falhas. Quando alguém sai, o conhecimento fica." },
        { tipo: "diagrama", titulo: "Do incidente ao aprendizado", codigo: `flowchart LR
  I["Incidente ou decisao"] --> R["Registrar: o que, quem, quando"]
  R --> A["Acordo de acao"]
  A --> V["Revisar na data marcada"]
  V --> M["Memoria da comunidade"]` },
        { tipo: "tarefas", itens: [
          { id: "livro-registro", titulo: "Abra o registro da comunidade", entrega: "Defina onde ficam as decisões, quem atualiza e em que formato. Registre a primeira decisão agora." },
        ] },
      ],
    },
    {
      id: "video-permacultura-doc",
      titulo: "Projetos que duram décadas",
      blocos: [
        { tipo: "texto", texto: "Sistemas de longo prazo ensinam mais que projetos novos. Veja como a permacultura nasceu e amadureceu ao longo de décadas, e observe o papel da observação paciente e do ajuste contínuo, que é exatamente o que mantém uma ecovila viva." },
        { tipo: "video", titulo: "Permaculture: The Documentary — How it started", youtube: "Syw1yfaWieQ" },
      ],
    },
    {
      id: "licao-manutencao",
      titulo: "Fixe: operação e manutenção",
      blocos: [
        { tipo: "texto", texto: "Confira se o seu projeto já nasce com plano de cuidado." },
        {
          tipo: "licao",
          pergunta: "O que todo sistema comum precisa ter antes de entrar em operação?",
          alternativas: [
            "Um nome bonito",
            "Responsável definido, o que inspecionar e com que frequência",
            "Garantia vitalícia do fabricante",
          ],
          correta: 1,
          explicacao: "Sem responsável, item de inspeção e frequência, a manutenção não acontece e o sistema falha em silêncio.",
        },
        { tipo: "tarefas", itens: [
          { id: "defesa-man", titulo: "Escreva a defesa da manutenção", entrega: "Em um parágrafo, descreva como a comunidade garante que os sistemas comuns serão cuidados e por quem." },
        ] },
      ],
    },

    // ===================== CAPÍTULO 10 — GOVERNANÇA JURÍDICA E ECONOMIA =====================
    {
      id: "forma-juridica",
      titulo: "Que roupa jurídica a ecovila veste",
      blocos: [
        { tipo: "texto", texto: "Uma ecovila precisa de uma forma jurídica para ter conta, assinar contratos, comprar terra e dividir custos com clareza: associação, cooperativa, condomínio, SPE ou combinações. A escolha muda impostos, responsabilidade dos membros, regras de entrada e saída e o que acontece com a terra se alguém deixar o grupo." },
        { tipo: "mobilizacao", papel: "Advogado (direito civil, imobiliário e societário)", porque: "A forma jurídica define responsabilidade, tributação, sucessão e a segurança da terra e dos aportes; errar aqui gera conflito grave e custoso depois.", entregaEsperada: "Parecer com a forma jurídica recomendada, estatuto/contrato social e regras de entrada, saída e uso da terra.", gerenciadoPor: "zaeon" },
        { tipo: "texto", texto: "Combine o jurídico com o acordo de convivência: o estatuto formal e o acordo interno precisam contar a mesma história. Documento bonito que contradiz a prática vira fonte de litígio." },
      ],
    },
    {
      id: "rateio-custos",
      titulo: "Rateio de custos comuns",
      blocos: [
        { tipo: "texto", texto: "Infraestrutura comum gera custo comum: manutenção, reposição, seguro, impostos. Defina cedo o critério de rateio (por pessoa, por moradia, por uso medido) e um fundo de reserva para trocar o que um dia quebra. Banco de bateria e bomba têm vida útil; o fundo evita a surpresa." },
        {
          tipo: "prancha",
          titulo: "Para onde vai o dinheiro comum",
          desenho: {
            legenda: "O caixa comum cobre operação, manutenção e um fundo de reserva para reposição.",
            primitivas: [
              { t: "circulo", c: [60, 100], r: 34, hachura: true },
              { t: "rotulo", p: [36, 104], texto: "Caixa comum" },
              { t: "seta", de: [94, 90], ate: [150, 60], cor: "destaque" },
              { t: "seta", de: [94, 100], ate: [150, 100], cor: "destaque" },
              { t: "seta", de: [94, 110], ate: [150, 150], cor: "destaque" },
              { t: "rotulo", p: [154, 58], texto: "Operacao" },
              { t: "rotulo", p: [154, 104], texto: "Manutencao" },
              { t: "rotulo", p: [154, 152], texto: "Fundo de reserva" },
            ],
          },
        },
        { tipo: "tarefas", itens: [
          { id: "rateio", titulo: "Defina o rateio e o fundo", entrega: "Escolha o critério de rateio de um custo comum e calcule quanto cada parte contribui por mês, incluindo o fundo de reserva." },
        ] },
      ],
    },
    {
      id: "trabalho-comum-pontos",
      titulo: "Trabalho comum: valorizar sem travar",
      blocos: [
        { tipo: "texto", texto: "Parte do que mantém a ecovila é trabalho, não dinheiro: mutirão, manutenção, coordenação. Comunidades experimentam formas de reconhecer esse trabalho (horas, pontos, turnos) sem transformar tudo em mercado nem deixar o peso cair sempre nos mesmos. O objetivo é justiça percebida, não contabilidade perfeita." },
        { tipo: "texto", texto: "Qualquer sistema de reconhecimento precisa ser simples e revisável. Se a planilha de pontos consome mais energia que o trabalho que mede, ela falhou. Comece simples, observe e ajuste, exatamente como manda o princípio do feedback." },
        {
          tipo: "licao",
          pergunta: "Qual é o maior risco de um sistema de pontos de trabalho?",
          alternativas: [
            "Ser simples demais",
            "Virar burocracia que custa mais energia do que o trabalho que mede",
            "Reconhecer o trabalho das pessoas",
          ],
          correta: 1,
          explicacao: "Se o controle vira burocracia pesada, ele consome mais do que mede. Melhor começar simples, observar e ajustar.",
        },
      ],
    },
    {
      id: "conflitos-acordos",
      titulo: "Conflito faz parte: tenha um caminho",
      blocos: [
        { tipo: "texto", texto: "Conflito não é sinal de fracasso, é inevitável. O que separa comunidades que duram das que racham é ter um caminho combinado para o conflito: escuta, mediação, e uma forma de decidir quando não há acordo. Defina esse caminho em tempo de paz, porque no calor da briga ninguém concorda com o método." },
        { tipo: "diagrama", titulo: "Caminho do conflito", codigo: `flowchart TD
  A["Divergencia"] --> B["Conversa direta"]
  B --> C{"Resolveu?"}
  C -->|Sim| D["Registrar acordo"]
  C -->|Nao| E["Mediacao por terceiro"]
  E --> F{"Resolveu?"}
  F -->|Sim| D
  F -->|Nao| G["Decisao pela regra combinada"]` },
        { tipo: "tarefas", itens: [
          { id: "caminho-conflito", titulo: "Combine o caminho do conflito", entrega: "Escreva as etapas que a sua comunidade seguirá diante de uma divergência séria, até a decisão final." },
        ] },
      ],
    },
    {
      id: "agrofloresta-alimento",
      titulo: "Alimento: agrofloresta e autonomia",
      blocos: [
        { tipo: "texto", texto: "Autonomia alimentar fecha o ciclo da ecovila. Sistemas agroflorestais (SAF), como os desenvolvidos por Ernst Götsch, combinam árvores, arbustos e hortaliças imitando a sucessão natural da floresta, produzindo alimento enquanto recuperam o solo. Exige conhecimento e manejo, mas transforma área degradada em abundância ao longo dos anos." },
        { tipo: "video", titulo: "A Inteligência da Floresta — Ernst Götsch", youtube: "kYKf8f_KByI" },
        { tipo: "mobilizacao", papel: "Engenheiro agrônomo ou técnico agroflorestal", porque: "Planejar um SAF produtivo, manejar sucessão e, se houver venda de alimento, atender à legislação sanitária exige acompanhamento técnico qualificado.", entregaEsperada: "Plano de manejo agroflorestal com espécies, consórcios, calendário de podas e orientação sanitária para eventual comercialização.", gerenciadoPor: "zaeon" },
      ],
    },

    // ===================== CAPÍTULO 11 — CASOS REAIS E SÍNTESE =====================
    {
      id: "casos-reais",
      titulo: "Casos reais para se inspirar e checar",
      blocos: [
        { tipo: "texto", texto: "Aprenda com quem já percorreu o caminho. Findhorn, na Escócia, é berço histórico da rede GEN. No Brasil, o Ecocentro IPEC (GO) é referência em bioconstrução e sistemas integrados. Sítios de agrofloresta de Ernst Götsch mostram recuperação de solo em escala. Visite, pergunte sobre as falhas, não só os acertos: é nelas que mora o aprendizado útil." },
        { tipo: "video", titulo: "Sistemas Agroflorestais — experiências de Ernst Götsch no Sul da Bahia", youtube: "pQkoC4Owqbg" },
        { tipo: "fontes", titulo: "Casos e redes", itens: [
          { titulo: "Global Ecovillage Network — mapa e comunidades", url: "https://ecovillage.org/", tipo: "site", nota: "Rede mundial de ecovilas, com casos reais." },
          { titulo: "Hiperadobe e o Ecocentro IPEC (Epagri)", url: "https://publicacoes.epagri.sc.gov.br/rac/issue/download/112/172", tipo: "artigo", nota: "Registro técnico citando o IPEC na difusão do hiperadobe." },
          { titulo: "Bioconstrução no desenvolvimento sustentável (UTFPR)", url: "https://riut.utfpr.edu.br/jspui/bitstream/1/28502/1/bioconstrucaoalternativadesenvolvimentosustentavel.pdf", tipo: "artigo", nota: "Casos e comparação de técnicas no Brasil." },
        ] },
        {
          tipo: "licao",
          pergunta: "Ao visitar uma ecovila de referência, o que mais ensina?",
          alternativas: ["Só os acertos e as fotos bonitas", "Perguntar também pelas falhas e pelo que mudariam", "Nada, cada caso é único"],
          correta: 1,
          explicacao: "As falhas e os ajustes são onde está o aprendizado transferível. Perguntar o que mudariam encurta a sua própria curva de erro.",
        },
      ],
    },
    {
      id: "recursos-aprofundar",
      titulo: "Recursos para continuar",
      blocos: [
        { tipo: "texto", texto: "Este caderno é um ponto de partida com lastro. Para ir além, guarde estes recursos abertos: redes, normas, datasets e cartilhas públicas. Antes de projetar de verdade, baixe os dados do seu local e confirme sempre a versão vigente de cada norma na ABNT, na ANEEL e no seu município, porque normas são revisadas." },
        { tipo: "fontes", titulo: "Caixa de ferramentas aberta", itens: [
          { titulo: "Global Ecovillage Network", url: "https://ecovillage.org/", tipo: "site", nota: "Rede mundial, mapa de comunidades e formação." },
          { titulo: "Gaia Education — currículo de sustentabilidade", url: "https://www.gaiaeducation.org/", tipo: "site", nota: "Base educacional ligada à GEN." },
          { titulo: "Permaculture Principles (Holmgren)", url: "https://permacultureprinciples.com/", tipo: "site", nota: "Éticas e 12 princípios." },
          { titulo: "Atlas Brasileiro de Energia Solar (INPE/LABREN)", url: "http://labren.ccst.inpe.br/atlas_2017.html", tipo: "dataset", nota: "Irradiação solar nacional." },
          { titulo: "INMET — Normais Climatológicas", url: "https://portal.inmet.gov.br/normais", tipo: "dataset", nota: "Chuva e temperatura por estação." },
          { titulo: "Cartilha Bioconstruindo (ICMBio)", url: "https://www1.icmbio.gov.br/educacaoambiental/images/stories/biblioteca/permacultura/Cartilha_Bioconstruindo.pdf", tipo: "livro", nota: "Técnicas de terra crua passo a passo." },
          { titulo: "TEvap / saneamento rural (Fundação Banco do Brasil)", url: "https://www.fbb.org.br/images/Editais/COPASA/2019/Fossa%20S%C3%A9ptica%20TEVAP.pdf", tipo: "livro", nota: "Tecnologia social de saneamento." },
        ] },
        { tipo: "tarefas", itens: [
          { id: "baixar-dados", titulo: "Baixe os dados do seu local", entrega: "Salve a normal climatológica da estação mais próxima e a irradiação (HSP) do seu ponto no Atlas Solar. Anexe-os ao projeto." },
        ] },
      ],
    },
    {
      id: "compilado",
      titulo: "Prancha de síntese",
      blocos: [
        { tipo: "texto", texto: "Você percorreu o caminho inteiro: leu o terreno, escolheu o método, calculou água e energia, projetou saneamento e moradia, planejou a obra, a manutenção e a governança. Arraste os cards pelo carimbo para montar o projeto da sua ecovila na ordem que fizer sentido para o seu grupo; abaixo da prancha, suas anotações e imagens aparecem na ordem das páginas. Lembre a regra do caderno: medir antes de decidir, calcular antes de construir, e chamar o profissional habilitado onde a lei e a segurança exigem." },
        { tipo: "compilado" },
      ],
    },
  ],
};
