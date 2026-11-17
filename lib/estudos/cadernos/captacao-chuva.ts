import type { CadernoEstudo } from "../cadernosEstudo";

/**
 * Caderno de campo: Dimensionamento de uma cisterna para água da chuva.
 * Conteúdo com lastro: ABNT NBR 15527:2019 (aproveitamento de água de chuva, usos não potáveis),
 * NBR 10844 (instalações prediais de águas pluviais), NBR 16783 e NBR 5626, Portaria GM/MS 888/2021
 * (padrão de potabilidade), dados do INMET (Normais Climatológicas) e da ANA, e artigos revisados
 * (Ambiente & Água, Revista de Engenharia e Tecnologia/UEPG, CONTECC/CONFEA, TCC UNILAB).
 * Os seis métodos de dimensionamento (Rippl, Simulação, Azevedo Netto, Prático Alemão, Inglês e
 * Australiano) vêm do Anexo da norma. As etapas que a lei exige de profissional habilitado
 * (projeto com ART, ligação elétrica da bomba, análise de água, estrutura de grande reservatório)
 * viram blocos de mobilização. Todos os vídeos têm id de 11 caracteres de vídeo real verificado.
 */
export const caderno: CadernoEstudo = {
  id: "captacao-chuva",
  titulo: "Dimensionamento de uma cisterna para água da chuva",
  resumo:
    "Da leitura da chuva do seu local ao reservatório certo: como medir a área de captação, levantar a demanda, aplicar os seis métodos da NBR 15527, escolher o volume, projetar, executar e manter uma cisterna de água da chuva — sempre com norma, dado e o profissional certo na hora certa.",
  paginas: [
    // ===================== CAPÍTULO 1 — CONTEXTO E VISÃO =====================
    {
      id: "abertura",
      titulo: "Como usar este caderno de campo",
      blocos: [
        { tipo: "texto", texto: "Este caderno acompanha quem quer dimensionar e instalar uma cisterna para água da chuva, de uma casa a um galpão ou uma escola. Cada página tem leitura curta, um desenho ou diagrama, tarefas práticas e a fonte que sustenta a afirmação. Nada aqui é regra de bolso solta: quando um número ou uma fórmula aparece, ele vem de norma, dataset ou artigo citado na própria página." },
        { tipo: "texto", texto: "A regra do caderno é simples: antes de comprar o reservatório, meça a chuva e a área; antes de furar parede, calcule; e onde a lei exige um profissional habilitado, a página mostra um campo de mobilização que abre a vaga e acompanha até ficar pronto. Você vai ler, medir, calcular e anotar; o profissional assina o que precisa de assinatura." },
        { tipo: "diagrama", titulo: "O percurso do caderno", codigo: `flowchart TD
  A["Por que captar água da chuva"] --> B["Normas e marco legal"]
  B --> C["Ler o local: chuva, area e demanda"]
  C --> D["Volume captavel (P x A x C)"]
  D --> E["Os 6 metodos da NBR 15527"]
  E --> F["Escolher o volume do reservatorio"]
  F --> G["Projeto: calha, descarte, filtro, bomba"]
  G --> H["Execucao da obra"]
  H --> I["Operacao e manutencao"]
  I --> J["Casos reais e economia"]
  J --> K["Prancha de sintese"]` },
      ],
    },
    {
      id: "por-que-agua-chuva",
      titulo: "Por que captar água da chuva",
      blocos: [
        { tipo: "texto", texto: "Captar água da chuva tira carga da rede pública e do bolso: a água que cairia no telhado e iria para a sarjeta passa a atender usos que não exigem água potável, como descarga sanitária, rega de jardim, lavagem de piso e de carro. Em muitos imóveis, esses usos somam de 30% a 50% do consumo total. Trocar água tratada por água da chuva nesses pontos reduz a conta e a demanda sobre o sistema de abastecimento." },
        { tipo: "texto", texto: "Há também o ganho de drenagem urbana: reter parte da chuva no reservatório e liberar devagar diminui o pico que chega às galerias e ajuda a conter alagamentos. Por isso várias cidades passaram a exigir reservatório de retenção ou de aproveitamento em novas construções. Captar bem é, ao mesmo tempo, economia e cidade mais seca por dentro da casa e mais segura na rua." },
        {
          tipo: "licao",
          pergunta: "Qual é a vantagem dupla de uma cisterna de água da chuva bem dimensionada?",
          alternativas: [
            "Deixa o telhado mais bonito",
            "Reduz a conta de água em usos não potáveis e amortece o pico de chuva na drenagem",
            "Substitui totalmente a água potável da casa",
          ],
          correta: 1,
          explicacao: "A água da chuva atende usos não potáveis (descarga, rega, lavagem) e, ao reter parte do volume, reduz o pico que chega à rede de drenagem. Ela não substitui a água potável: beber e cozinhar continuam na rede tratada.",
        },
      ],
    },
    {
      id: "onde-faz-sentido",
      titulo: "Onde faz sentido (e onde não)",
      blocos: [
        { tipo: "texto", texto: "A cisterna rende quando há três coisas juntas: chuva suficiente ao longo do ano, área de telhado para captar e demanda não potável constante para consumir a água. Telhado grande com pouca demanda enche e transborda; demanda grande com telhado pequeno esvazia o reservatório na primeira semana sem chuva. O projeto é justamente equilibrar esses três fatores." },
        { tipo: "texto", texto: "Onde a chuva é muito concentrada em poucos meses, o reservatório teria que ser enorme para atravessar a seca, e o custo não fecha: ali vale captar para os meses chuvosos e assumir a rede nos secos. Onde chove o ano todo de forma distribuída, um reservatório médio já garante autonomia alta. Medir antes evita comprar caixa grande demais (dinheiro parado) ou pequena demais (transborda sempre)." },
        {
          tipo: "prancha",
          titulo: "O triângulo do dimensionamento",
          desenho: {
            legenda: "A cisterna só rende quando chuva, área de captação e demanda estão equilibradas. O volume fica no centro.",
            primitivas: [
              { t: "linha", de: [151, 24], ate: [40, 168], cor: "tinta" },
              { t: "linha", de: [151, 24], ate: [262, 168], cor: "tinta" },
              { t: "linha", de: [40, 168], ate: [262, 168], cor: "tinta" },
              { t: "rotulo", p: [120, 16], texto: "Chuva (mm/ano)" },
              { t: "rotulo", p: [8, 178], texto: "Área de telhado" },
              { t: "rotulo", p: [210, 178], texto: "Demanda não potável" },
              { t: "circulo", c: [151, 120], r: 30, cor: "destaque" },
              { t: "rotulo", p: [132, 123], texto: "Volume" },
            ],
          },
        },
        { tipo: "tarefas", itens: [
          { id: "tri-local", titulo: "Avalie o seu triângulo", entrega: "Em uma frase para cada vértice, descreva a chuva do seu local, a área de telhado disponível e os usos não potáveis que pretende atender. Marque qual vértice é o mais fraco." },
        ] },
      ],
    },
    {
      id: "usos-permitidos",
      titulo: "O que a água da chuva pode atender",
      blocos: [
        { tipo: "texto", texto: "A ABNT NBR 15527 trata do aproveitamento de água de chuva de coberturas para usos não potáveis. É isso que ela cobre: descarga de bacia sanitária, irrigação e rega de jardim, lavagem de pisos, de veículos, de calçadas, usos ornamentais (espelhos d'água, fontes) e reserva técnica de incêndio. Beber, cozinhar, escovar os dentes e banho ficam fora: para isso vale o padrão de potabilidade, que a água de chuva captada de telhado não atende sem tratamento específico." },
        { tipo: "texto", texto: "Separar os usos muda o projeto: a rede de água da chuva é independente da rede potável, com tubulação e torneiras identificadas, para que ninguém ligue por engano uma à outra. Essa separação não é capricho, é segurança sanitária e exigência das normas de instalações prediais." },
        { tipo: "diagrama", titulo: "Usos potáveis x não potáveis", codigo: `flowchart LR
  P["Rede potavel"] --> P1["Beber e cozinhar"]
  P --> P2["Banho e higiene"]
  C["Cisterna de chuva"] --> C1["Descarga sanitaria"]
  C --> C2["Rega e jardim"]
  C --> C3["Lavagem de piso e carro"]
  C --> C4["Reserva de incendio"]` },
        {
          tipo: "licao",
          pergunta: "Segundo a NBR 15527, a água de chuva captada de telhado é indicada para:",
          alternativas: ["Beber, desde que filtrada", "Usos não potáveis: descarga, rega, lavagem", "Qualquer uso, igual à da rede"],
          correta: 1,
          explicacao: "A norma é de usos não potáveis. Consumo humano direto exige o padrão de potabilidade da Portaria GM/MS 888/2021, que a água de chuva de telhado não atende sem tratamento e controle próprios.",
        },
      ],
    },
    {
      id: "video-nbr-2019",
      titulo: "A norma por quem a aplica",
      blocos: [
        { tipo: "texto", texto: "Antes de calcular, ouça quem lida com a norma no dia a dia. O vídeo abaixo trata da atualização da NBR 15527 publicada em abril de 2019 e do que ela significa para a captação em meio urbano. Ao assistir, anote três exigências que a norma faz e que você ainda não tinha considerado no seu projeto." },
        { tipo: "video", titulo: "Captação de água da chuva em meio urbano – Atualização da NBR 15527 (abril/2019)", youtube: "d0Dj089IASY" },
        { tipo: "tarefas", itens: [
          { id: "nota-nbr", titulo: "Registre três exigências da norma", entrega: "Liste três pontos do vídeo que mudam o seu projeto e diga, ao lado de cada um, o que você precisará medir ou providenciar." },
        ] },
      ],
    },
    {
      id: "anatomia-sistema",
      titulo: "Anatomia de um sistema de captação",
      blocos: [
        { tipo: "texto", texto: "Um sistema de aproveitamento de água de chuva tem partes que se encadeiam, e cada uma tem uma função que não dá para pular. A água cai na cobertura (área de captação), escorre pela calha e pelos condutores, passa por uma grade que barra folhas, segue para o dispositivo que descarta a primeira água suja do telhado, atravessa um filtro e só então entra no reservatório. Dali, uma bomba ou a gravidade leva a água aos pontos de uso, e um extravasor (ladrão) devolve o excesso à drenagem." },
        {
          tipo: "prancha",
          titulo: "Esquema do sistema, da cobertura ao uso",
          desenho: {
            legenda: "Cobertura, calha, grade, descarte da primeira chuva, filtro, reservatório, bomba, uso e extravasor.",
            primitivas: [
              { t: "linha", de: [20, 40], ate: [90, 22], cor: "tinta" },
              { t: "linha", de: [90, 22], ate: [160, 40], cor: "tinta" },
              { t: "rotulo", p: [60, 18], texto: "Cobertura" },
              { t: "linha", de: [160, 40], ate: [160, 150], cor: "tinta" },
              { t: "rotulo", p: [163, 60], texto: "Condutor" },
              { t: "retangulo", p: [150, 48], w: 22, h: 12, hachura: true },
              { t: "rotulo", p: [176, 52], texto: "Grade" },
              { t: "retangulo", p: [150, 90], w: 22, h: 26 },
              { t: "rotulo", p: [176, 100], texto: "Descarte 1a" },
              { t: "retangulo", p: [150, 130], w: 22, h: 14, hachura: true },
              { t: "rotulo", p: [176, 134], texto: "Filtro" },
              { t: "retangulo", p: [40, 150], w: 110, h: 40, cor: "destaque" },
              { t: "rotulo", p: [70, 168], texto: "Reservatorio" },
              { t: "circulo", c: [36, 178], r: 7 },
              { t: "rotulo", p: [16, 192], texto: "Bomba" },
              { t: "seta", de: [36, 170], ate: [36, 120], cor: "suave" },
              { t: "rotulo", p: [12, 112], texto: "Uso" },
              { t: "seta", de: [150, 156], ate: [120, 156], cor: "suave" },
              { t: "rotulo", p: [92, 150], texto: "Extravasor" },
            ],
          },
        },
        { tipo: "texto", texto: "Guarde a ordem: captação, condução, pré-tratamento (grade, descarte, filtro), armazenamento e distribuição. O caderno vai percorrer exatamente essa sequência. Se qualquer etapa de pré-tratamento falhar, a água chega suja ao reservatório e a manutenção vira pesadelo; por isso a grade, o descarte e o filtro não são opcionais." },
      ],
    },
    {
      id: "fontes-contexto",
      titulo: "Fontes: contexto e definições",
      blocos: [
        { tipo: "texto", texto: "Estes endereços sustentam o capítulo e são a porta de entrada para aprofundar. Confirme sempre a edição vigente de cada norma na ABNT, porque normas são revisadas." },
        { tipo: "fontes", titulo: "Referências do contexto", itens: [
          { titulo: "ABNT NBR 15527 — Aproveitamento de água de chuva de coberturas (catálogo ABNT)", url: "https://www.abntcatalogo.com.br/", tipo: "norma", nota: "Norma brasileira para usos não potáveis; edição 2019. Busque pelo número 15527." },
          { titulo: "Agência Nacional de Águas e Saneamento Básico (ANA)", url: "https://www.gov.br/ana/pt-br", tipo: "site", nota: "Órgão federal; dados, manuais e conjuntura dos recursos hídricos." },
          { titulo: "Orientações técnicas para sistemas de captação e aproveitamento de água (Prefeitura de Londrina)", url: "https://repositorio.londrina.pr.gov.br/index.php/menu-ambiente/dca/captacao-e-aproveitamento-de-agua-1/76316-orientacoes-tecnicas-scaac/file", tipo: "artigo", nota: "Guia municipal que detalha a equação de captação da NBR 15527:2019." },
        ] },
        {
          tipo: "licao",
          pergunta: "Qual componente do sistema tem a função de jogar fora a água mais suja, que lava o telhado no começo da chuva?",
          alternativas: ["O extravasor (ladrão)", "O dispositivo de descarte da primeira água (first flush)", "A bomba de recalque"],
          correta: 1,
          explicacao: "O descarte da primeira água (first flush) desvia o volume inicial, que arrasta poeira, fezes de aves e folhas do telhado. O extravasor descarta o excesso quando o reservatório enche.",
        },
      ],
    },

    // ===================== CAPÍTULO 2 — NORMAS E MARCO LEGAL =====================
    {
      id: "nbr-15527",
      titulo: "A NBR 15527 e o que ela exige",
      blocos: [
        { tipo: "texto", texto: "A ABNT NBR 15527 estabelece os requisitos para o aproveitamento da água de chuva de coberturas em áreas urbanas, para fins não potáveis. Ela trata das partes do sistema, dos cuidados de qualidade da água, da identificação das tubulações e, no seu anexo, dos métodos para dimensionar o reservatório. É a referência central deste caderno: sempre que falarmos de método de cálculo, estamos dentro dela." },
        { tipo: "texto", texto: "A norma não impõe um único método nem um volume fixo: ela oferece caminhos de cálculo e deixa a escolha justificada a cargo do projetista, de acordo com a chuva, a área e a demanda do caso. Isso significa que dimensionar bem é comparar métodos e decidir com critério, não aplicar uma fórmula única e aceitar o número que sair." },
        { tipo: "diagrama", titulo: "O que a NBR 15527 cobre", codigo: `flowchart TD
  N["NBR 15527"] --> A["Partes do sistema"]
  N --> B["Qualidade da agua (nao potavel)"]
  N --> C["Identificacao das tubulacoes"]
  N --> D["Anexo: 6 metodos de dimensionamento"]
  D --> D1["Rippl"]
  D --> D2["Simulacao"]
  D --> D3["Azevedo Netto"]
  D --> D4["Pratico Alemao"]
  D --> D5["Pratico Ingles"]
  D --> D6["Pratico Australiano"]` },
      ],
    },
    {
      id: "video-nbr-definicoes",
      titulo: "Definições e condições gerais da norma",
      blocos: [
        { tipo: "texto", texto: "Este segundo vídeo da mesma série percorre as definições e condições gerais da NBR 15527:2019. Vale para fixar o vocabulário que o caderno usa: área de captação, coeficiente de escoamento, descarte da primeira água, reservatório e os termos que vão aparecer nas fórmulas." },
        { tipo: "video", titulo: "Captação de água da chuva em meio urbano – NBR 15527:2019 Definições e Condições Gerais", youtube: "3b39wnIRV7I" },
        { tipo: "tarefas", itens: [
          { id: "glossario", titulo: "Monte seu glossário", entrega: "Anote a definição, com suas palavras, de: área de captação, coeficiente de escoamento, descarte da primeira água e reservatório. Volte a ele quando bater dúvida nas fórmulas." },
        ] },
      ],
    },
    {
      id: "normas-vizinhas",
      titulo: "As normas que andam juntas",
      blocos: [
        { tipo: "texto", texto: "A NBR 15527 não trabalha sozinha. A NBR 10844 cuida das instalações prediais de águas pluviais: é ela que dá o método para dimensionar calhas, condutores verticais e horizontais a partir da intensidade de chuva do local. A NBR 16783 trata do uso de fontes alternativas de água não potável em edificações. E a NBR 5626 rege as instalações de água potável — importante para garantir que as duas redes jamais se cruzem." },
        { tipo: "texto", texto: "Do lado da saúde pública, a Portaria GM/MS 888/2021 define o padrão de potabilidade da água para consumo humano. Ela não se aplica à água da chuva de usos não potáveis, mas delimita a fronteira: tudo que estiver abaixo desse padrão não pode chegar a uma torneira de beber. Conhecer as duas pontas evita o erro mais perigoso do projeto, que é misturar as redes." },
        {
          tipo: "prancha",
          titulo: "Mapa das normas do projeto",
          desenho: {
            legenda: "Cada norma cobre uma parte. A NBR 15527 é o centro; as vizinhas resolvem calha, redes e potabilidade.",
            primitivas: [
              { t: "circulo", c: [151, 98], r: 40, cor: "destaque" },
              { t: "rotulo", p: [128, 100], texto: "NBR 15527" },
              { t: "retangulo", p: [18, 22], w: 84, h: 30 },
              { t: "rotulo", p: [24, 40], texto: "NBR 10844 calha" },
              { t: "retangulo", p: [200, 22], w: 90, h: 30 },
              { t: "rotulo", p: [206, 40], texto: "NBR 16783 nao pot." },
              { t: "retangulo", p: [18, 150], w: 84, h: 30 },
              { t: "rotulo", p: [24, 168], texto: "NBR 5626 pot." },
              { t: "retangulo", p: [200, 150], w: 90, h: 30 },
              { t: "rotulo", p: [206, 168], texto: "Port. 888 potab." },
              { t: "seta", de: [100, 45], ate: [128, 78], cor: "suave" },
              { t: "seta", de: [205, 45], ate: [176, 78], cor: "suave" },
              { t: "seta", de: [100, 158], ate: [128, 120], cor: "suave" },
              { t: "seta", de: [205, 158], ate: [176, 120], cor: "suave" },
            ],
          },
        },
      ],
    },
    {
      id: "potabilidade",
      titulo: "Por que a chuva não vira água de beber",
      blocos: [
        { tipo: "texto", texto: "A água que escorre de um telhado carrega poeira, fuligem, fezes de aves, folhas e micro-organismos. Mesmo depois de descartar a primeira água e filtrar, ela não atende, sem tratamento dedicado, aos limites da Portaria GM/MS 888/2021 para coliformes, turbidez e outros parâmetros. Por isso o caminho honesto é destiná-la a usos não potáveis e deixar o consumo humano na rede tratada." },
        { tipo: "texto", texto: "Transformar água de chuva em potável exige tratamento completo e controle de qualidade de verdade, com análises periódicas, o que foge do escopo de uma cisterna doméstica comum. Afirmar que uma fonte é potável não é opinião: depende de laudo laboratorial. Onde a potabilidade entra no projeto, este caderno aciona um laboratório acreditado em bloco de mobilização." },
        {
          tipo: "mobilizacao",
          papel: "Laboratório de análise de água (acreditado)",
          porque: "Afirmar que qualquer água é potável, ou avaliar se a água da cisterna atende a um uso específico mais exigente, exige ensaio laboratorial com parâmetros microbiológicos e físico-químicos. Estimativa visual não atende a norma de potabilidade.",
          entregaEsperada: "Laudo com coliformes totais e termotolerantes, turbidez, pH, cor e, se aplicável, metais, comparado aos limites da Portaria GM/MS 888/2021, com parecer sobre o uso pretendido.",
          gerenciadoPor: "zaeon",
        },
      ],
    },
    {
      id: "licencas-municipais",
      titulo: "As regras da sua cidade",
      blocos: [
        { tipo: "texto", texto: "Além da ABNT, muitos municípios têm leis próprias que obrigam reservatório de retenção ou de aproveitamento de água da chuva em certas construções, com volume mínimo ligado à área impermeabilizada do lote. Algumas condicionam o alvará ou o habite-se a esse reservatório. Antes de dimensionar pela NBR, descubra se a sua cidade exige um volume mínimo: às vezes a lei local manda um reservatório maior do que o cálculo de aproveitamento sugeriria." },
        { tipo: "texto", texto: "Guias técnicos municipais, como as orientações da Prefeitura de Londrina, mostram como a regra local se combina com a norma nacional. O caminho seguro é somar as duas exigências: dimensionar o aproveitamento pela NBR 15527 e checar se o volume atende também ao mínimo de retenção que a cidade pede. O maior dos dois valores manda." },
        { tipo: "tarefas", itens: [
          { id: "lei-local", titulo: "Levante a exigência do seu município", entrega: "Procure, no site da prefeitura ou da secretaria de meio ambiente, se há lei de reservatório de água da chuva. Anote o volume mínimo exigido (em litros ou em função da área) e a condição (alvará, habite-se)." },
        ] },
      ],
    },
    {
      id: "fontes-normas",
      titulo: "Fontes: normas e marco legal",
      blocos: [
        { tipo: "texto", texto: "As referências normativas do projeto. Elas são a base jurídica e técnica do que vem a seguir." },
        { tipo: "fontes", titulo: "Normas e legislação", itens: [
          { titulo: "ABNT NBR 15527:2019 — Aproveitamento de água de chuva de coberturas (catálogo ABNT)", url: "https://www.abntcatalogo.com.br/", tipo: "norma", nota: "Usos não potáveis; traz os métodos de dimensionamento no anexo." },
          { titulo: "Portaria GM/MS nº 888, de 4 de maio de 2021 (padrão de potabilidade)", url: "https://ses.sp.bvs.br/wp-content/uploads/2021/05/U_PT-MS-GM-888_040521.pdf", tipo: "norma", nota: "Altera o Anexo XX da Portaria de Consolidação nº 5/2017; define o que é água potável." },
          { titulo: "Orientações técnicas SCAAC (Prefeitura de Londrina)", url: "https://repositorio.londrina.pr.gov.br/index.php/menu-ambiente/dca/captacao-e-aproveitamento-de-agua-1/76316-orientacoes-tecnicas-scaac/file", tipo: "artigo", nota: "Como a regra municipal se combina com a NBR; equação de captação." },
        ] },
        {
          tipo: "licao",
          pergunta: "Quando a lei municipal exige um reservatório maior que o cálculo de aproveitamento pela NBR, o que fazer?",
          alternativas: ["Seguir só a NBR", "Seguir só a lei municipal", "Atender o maior dos dois volumes"],
          correta: 2,
          explicacao: "As exigências se somam. O reservatório precisa satisfazer tanto o aproveitamento da NBR quanto o mínimo de retenção do município: na prática, o maior dos dois volumes.",
        },
      ],
    },

    // ===================== CAPÍTULO 3 — LER O LOCAL E O CLIMA =====================
    {
      id: "clima-manda",
      titulo: "O clima manda no projeto",
      blocos: [
        { tipo: "texto", texto: "Não existe cisterna padrão para o Brasil. O que entra no reservatório depende de quanto chove e de como a chuva se distribui ao longo do ano no seu ponto exato. Dois lotes vizinhos com o mesmo telhado podem precisar de reservatórios bem diferentes se um fica num clima de chuva o ano todo e o outro num clima com seca longa. Por isso o primeiro trabalho técnico é ler o clima com dado, não com memória." },
        { tipo: "texto", texto: "A variável mais importante é a precipitação: a altura de chuva, em milímetros, acumulada por mês e por ano. Um milímetro de chuva sobre um metro quadrado de telhado é, aproximadamente, um litro de água. Essa equivalência simples (1 mm × 1 m² ≈ 1 L) é a base de tudo que vem a seguir. Guarde-a." },
        {
          tipo: "licao",
          pergunta: "Quantos litros, aproximadamente, 1 mm de chuva deposita sobre 1 m² de telhado?",
          alternativas: ["0,1 litro", "1 litro", "10 litros"],
          correta: 1,
          explicacao: "1 mm equivale a 1 litro por metro quadrado. Por isso, área (m²) × precipitação (mm) dá o volume bruto captado em litros, antes de aplicar perdas.",
        },
      ],
    },
    {
      id: "precipitacao-dados",
      titulo: "Onde pegar os dados de chuva",
      blocos: [
        { tipo: "texto", texto: "A fonte oficial de dados climáticos no Brasil é o INMET (Instituto Nacional de Meteorologia). Suas Normais Climatológicas trazem, para cada estação, a média de chuva mês a mês calculada sobre um período longo (décadas). Para projeto de cisterna, use a estação mais próxima e representativa do seu local, e prefira as Normais ou uma série histórica longa a um único ano, que pode ser atípico." },
        { tipo: "texto", texto: "A ANA e o portal HidroWeb/SNIRH também disponibilizam séries de postos pluviométricos, úteis quando você quer a chuva diária para os métodos mais detalhados. Baixe os dados, confira o período de medição e descarte estações com muitas falhas. Esse arquivo de chuva será o insumo de todas as contas do caderno." },
        { tipo: "diagrama", titulo: "De onde vêm os dados de chuva", codigo: `flowchart LR
  L["Seu local"] --> E["Estacao mais proxima"]
  E --> I["INMET Normais Climatologicas"]
  E --> A["ANA HidroWeb/SNIRH (serie diaria)"]
  I --> D["Chuva mensal media"]
  A --> D2["Chuva diaria"]
  D --> P["Entra nos metodos"]
  D2 --> P` },
        { tipo: "tarefas", itens: [
          { id: "baixar-chuva", titulo: "Baixe a chuva do seu ponto", entrega: "Salve a Normal Climatológica da estação INMET mais próxima (chuva de janeiro a dezembro) e anote a precipitação média anual. Guarde o arquivo: ele será usado em quase todas as páginas de cálculo." },
        ] },
      ],
    },
    {
      id: "serie-historica",
      titulo: "Ano médio, ano seco e por que importa",
      blocos: [
        { tipo: "texto", texto: "A média esconde os extremos. Dimensionar pela chuva média dá um reservatório que funciona num ano típico, mas pode secar num ano abaixo da média. Por isso, projetos cuidadosos olham também um ano seco de referência (por exemplo, o ano mais seco da série ou um percentil baixo). Quanto maior a autonomia que você quer garantir, mais perto do ano seco deve estar o dimensionamento, e maior fica o reservatório." },
        { tipo: "texto", texto: "Esse é um dos motivos pelos quais os métodos da NBR dão resultados diferentes: alguns usam a média, outros simulam a série real dia a dia e revelam os períodos críticos. Tenha claro desde já: o número final não é só da fórmula, é também da sua escolha de quanto risco de faltar água você aceita." },
        {
          tipo: "prancha",
          titulo: "Média esconde a seca",
          desenho: {
            legenda: "A linha de chuva média não mostra o vale do ano seco, onde o reservatório é testado.",
            primitivas: [
              { t: "linha", de: [20, 170], ate: [285, 170], cor: "tinta" },
              { t: "linha", de: [20, 170], ate: [20, 20], cor: "tinta" },
              { t: "rotulo", p: [24, 14], texto: "Chuva" },
              { t: "rotulo", p: [250, 182], texto: "meses" },
              { t: "curva", pts: [[30, 60], [70, 55], [110, 90], [150, 140], [190, 150], [230, 110], [275, 70]], cor: "destaque" },
              { t: "linha", de: [20, 95], ate: [285, 95], cor: "suave" },
              { t: "rotulo", p: [200, 88], texto: "media" },
              { t: "rotulo", p: [150, 158], texto: "vale (seca)" },
            ],
          },
        },
      ],
    },
    {
      id: "distribuicao-mensal",
      titulo: "A distribuição mensal e os meses secos",
      blocos: [
        { tipo: "texto", texto: "Não basta o total anual: o que dimensiona o reservatório é como a chuva se reparte. Uma cidade com 1.400 mm bem distribuídos o ano todo precisa de reservatório menor do que outra com os mesmos 1.400 mm concentrados em quatro meses. O reservatório tem que guardar água dos meses cheios para atravessar os meses secos — quanto mais longa a estiagem, maior ele é." },
        { tipo: "texto", texto: "Monte a tabela de chuva mês a mês e identifique quantos meses são de pouca chuva ou seca: esse número, que chamaremos de T, entra direto em um dos métodos de cálculo (Azevedo Netto). Observar a distribuição também ajuda a decidir se vale mesmo buscar autonomia total ou se é mais barato captar nos meses chuvosos e usar a rede nos secos." },
        { tipo: "diagrama", titulo: "Guardar do cheio para o seco", codigo: `flowchart LR
  C["Meses chuvosos"] -->|enche| R["Reservatorio"]
  R -->|esvazia devagar| S["Meses secos"]
  S -->|se faltar| Rede["Rede publica (reforco)"]` },
        { tipo: "tarefas", itens: [
          { id: "contar-secos", titulo: "Conte os meses secos", entrega: "Na sua tabela mensal, marque os meses com chuva bem abaixo da média. Anote o número de meses secos (T) — você vai usá-lo no método de Azevedo Netto." },
        ] },
      ],
    },
    {
      id: "area-captacao",
      titulo: "Medir a área de captação",
      blocos: [
        { tipo: "texto", texto: "A área de captação é a área do telhado medida em projeção horizontal, ou seja, a sombra que o telhado faz no chão ao meio-dia, não a área inclinada da telha. Para um telhado retangular, é comprimento × largura da projeção. Isso porque é a projeção horizontal que recebe a chuva vertical; a inclinação muda a telha, não o volume de chuva que cai sobre aquele retângulo." },
        { tipo: "texto", texto: "Some apenas as águas de telhado que realmente vão ser canalizadas até a cisterna. Se só metade do telhado tem calha ligada ao sistema, a área de captação é metade. Pátios e lajes também podem captar, mas costumam trazer mais sujeira; o caderno foca em cobertura, como a norma." },
        {
          tipo: "prancha",
          titulo: "Projeção horizontal, não a telha inclinada",
          desenho: {
            legenda: "A área de captação é a projeção no plano horizontal (base), não o comprimento da água inclinada.",
            primitivas: [
              { t: "linha", de: [40, 110], ate: [151, 50], cor: "tinta" },
              { t: "linha", de: [151, 50], ate: [262, 110], cor: "tinta" },
              { t: "linha", de: [40, 110], ate: [262, 110], cor: "destaque" },
              { t: "rotulo", p: [120, 122], texto: "area de captacao (projecao)" },
              { t: "seta", de: [90, 30], ate: [90, 75], cor: "suave" },
              { t: "seta", de: [151, 25], ate: [151, 50], cor: "suave" },
              { t: "seta", de: [212, 30], ate: [212, 75], cor: "suave" },
              { t: "rotulo", p: [120, 20], texto: "chuva vertical" },
            ],
          },
        },
        { tipo: "tarefas", itens: [
          { id: "medir-area", titulo: "Meça sua área de captação", entrega: "Meça comprimento e largura da projeção do telhado que será canalizado à cisterna e calcule a área em m². Se houver mais de uma água ligada, some as áreas." },
        ] },
      ],
    },
    {
      id: "material-telhado",
      titulo: "O coeficiente de escoamento do telhado",
      blocos: [
        { tipo: "texto", texto: "Nem toda a chuva que cai no telhado chega ao reservatório: parte molha a superfície, evapora e fica retida. O coeficiente de escoamento superficial (C) representa essa fração aproveitável e depende do material da cobertura. Telhas cerâmicas e metálicas, lisas, escoam bem; superfícies rugosas ou porosas retêm mais. Na falta de dado específico, os estudos e guias técnicos costumam adotar C em torno de 0,8, e a NBR 15527:2019 recomenda um fator de captação da ordem de 0,85 quando não há informação melhor." },
        { tipo: "texto", texto: "Além do C do material, há o fator de captação (eficiência do sistema), que desconta a água perdida no descarte da primeira chuva e no desvio de sólidos. Os dois juntos transformam a chuva bruta na água que de fato entra na cisterna. Usar um C realista evita superdimensionar (achar que capta mais do que capta)." },
        {
          tipo: "licao",
          pergunta: "O coeficiente de escoamento (C) de um telhado serve para:",
          alternativas: [
            "Aumentar a chuva medida",
            "Descontar a fração de chuva que não chega ao reservatório (retenção, evaporação)",
            "Medir a inclinação da telha",
          ],
          correta: 1,
          explicacao: "C é a fração aproveitável da chuva, tipicamente em torno de 0,8 para telhados comuns. Ele desconta o que molha, evapora e fica retido na superfície.",
        },
      ],
    },
    {
      id: "demanda-nao-potavel",
      titulo: "Levantar a demanda não potável",
      blocos: [
        { tipo: "texto", texto: "Do lado do consumo, o que importa é a demanda não potável: quanta água por dia os usos que a cisterna vai atender consomem. Some descarga sanitária (número de pessoas × acionamentos × volume por descarga), rega (área de jardim × lâmina de irrigação), lavagens e outros. Esse total, em litros por dia, é tão decisivo quanto a chuva: é ele que esvazia o reservatório." },
        { tipo: "texto", texto: "Monte a demanda realista, não a otimista. Uma descarga moderna usa cerca de 6 litros; uma antiga, bem mais. A rega varia com estação e clima. Com a demanda diária em mãos e a chuva do local, você tem os dois lados da balança que todos os métodos vão pesar." },
        {
          tipo: "prancha",
          titulo: "A balança do reservatório",
          desenho: {
            legenda: "De um lado a chuva captada que enche; do outro a demanda que esvazia. O reservatório equilibra no tempo.",
            primitivas: [
              { t: "linha", de: [151, 40], ate: [151, 70], cor: "tinta" },
              { t: "linha", de: [60, 70], ate: [242, 70], cor: "tinta" },
              { t: "retangulo", p: [30, 72], w: 60, h: 34, cor: "destaque" },
              { t: "rotulo", p: [34, 90], texto: "Chuva capta" },
              { t: "retangulo", p: [212, 72], w: 60, h: 34, hachura: true },
              { t: "rotulo", p: [216, 90], texto: "Demanda" },
              { t: "circulo", c: [151, 150], r: 26 },
              { t: "rotulo", p: [128, 153], texto: "Reservat." },
              { t: "seta", de: [60, 106], ate: [140, 140], cor: "suave" },
              { t: "seta", de: [162, 140], ate: [230, 106], cor: "suave" },
            ],
          },
        },
        { tipo: "tarefas", itens: [
          { id: "demanda-dia", titulo: "Calcule sua demanda diária não potável", entrega: "Some, em litros por dia, descarga sanitária, rega e lavagens que a cisterna vai atender. Registre o valor diário e o mensal (× 30)." },
        ] },
      ],
    },
    {
      id: "fontes-clima",
      titulo: "Fontes: dados de chuva e demanda",
      blocos: [
        { tipo: "texto", texto: "Datasets e referências para ler o clima e estimar o consumo do seu local." },
        { tipo: "fontes", titulo: "Dados abertos de clima e água", itens: [
          { titulo: "INMET — Normais Climatológicas do Brasil", url: "https://portal.inmet.gov.br/normais", tipo: "dataset", nota: "Chuva média mês a mês por estação; base do dimensionamento." },
          { titulo: "ANA — Agência Nacional de Águas e Saneamento Básico", url: "https://www.gov.br/ana/pt-br", tipo: "site", nota: "Portal de recursos hídricos; acesso a séries pluviométricas (HidroWeb/SNIRH)." },
          { titulo: "SNIRH — Metadados e séries hidrológicas", url: "https://metadados.snirh.gov.br/geonetwork/srv/api/records", tipo: "dataset", nota: "Catálogo de dados de postos pluviométricos e fluviométricos." },
          { titulo: "Aproveitamento de água de chuva: análise comparativa (Ambiente & Água / SciELO)", url: "https://www.scielo.br/j/ac/a/qG5FpFbhNVjccQxRgHb9G3B/?format=pdf", tipo: "artigo", nota: "Artigo revisado que aplica os métodos da NBR 15527 a dados reais." },
        ] },
        { tipo: "tarefas", itens: [
          { id: "pasta-dados", titulo: "Monte a pasta de dados do projeto", entrega: "Reúna num só lugar: chuva mensal, precipitação anual, número de meses secos (T), área de captação (m²), coeficiente C e demanda diária. Essa pasta alimenta todo o Capítulo 5." },
        ] },
      ],
    },

    // ===================== CAPÍTULO 4 — MÉTODO: O VOLUME CAPTÁVEL =====================
    {
      id: "volume-captavel",
      titulo: "A equação do volume captável",
      blocos: [
        { tipo: "texto", texto: "Antes de dimensionar o reservatório, calcule quanta água o telhado realmente oferece. A NBR 15527 dá a equação do volume aproveitável: V = P × A × C × η. Onde P é a precipitação (anual, mensal ou diária), A é a área de captação em projeção, C é o coeficiente de escoamento da cobertura e η (fator de captação) é a eficiência do sistema, que inclui o descarte da primeira água e o desvio de sólidos." },
        { tipo: "texto", texto: "Perceba que você pode rodar essa conta no passo que quiser: anual para ter o total do ano, mensal para ver cheios e secos, ou diária para os métodos detalhados. Quanto mais fino o passo, mais fiel ao comportamento real, porém mais dados são necessários. Comece pela conta anual para ter a ordem de grandeza." },
        { tipo: "diagrama", titulo: "V = P x A x C x η", codigo: `flowchart LR
  P["P: precipitacao (mm)"] --> V["Volume captavel (L)"]
  A["A: area de captacao (m2)"] --> V
  C["C: coef. escoamento (~0,8)"] --> V
  E["eta: fator de captacao (~0,85)"] --> V` },
      ],
    },
    {
      id: "coef-escoamento",
      titulo: "C e η sem confundir",
      blocos: [
        { tipo: "texto", texto: "Dois fatores parecidos, funções diferentes. O coeficiente de escoamento (C) é da cobertura: quanto da chuva escorre da telha, em geral perto de 0,8. O fator de captação (η) é do sistema: quanto sobra depois de descartar a primeira água e barrar sólidos, recomendado em torno de 0,85 na falta de dados. Multiplicar os dois (ou usar um fator combinado) evita contar como aproveitada a água que na verdade foi descartada no pré-tratamento." },
        { tipo: "texto", texto: "Na prática de muitos estudos, adota-se C em torno de 0,8 e um fator de sistema separado para o descarte. O importante é não usar 1,0: nenhum sistema aproveita 100% da chuva do telhado. Ser conservador aqui protege o projeto de prometer mais água do que a cisterna vai de fato guardar." },
        {
          tipo: "licao",
          pergunta: "Por que não se deve usar coeficiente de aproveitamento igual a 1,0?",
          alternativas: [
            "Porque a norma proíbe qualquer valor acima de 0,5",
            "Porque sempre há perdas: retenção na telha, evaporação e descarte da primeira água",
            "Porque 1,0 deixaria o reservatório pequeno demais",
          ],
          correta: 1,
          explicacao: "Parte da chuva molha a superfície, evapora e é descartada no first flush. Usar 1,0 superestima a água captada e leva a prometer o que a cisterna não entrega.",
        },
      ],
    },
    {
      id: "first-flush",
      titulo: "O descarte da primeira água",
      blocos: [
        { tipo: "texto", texto: "A primeira água que lava o telhado no começo de uma chuva é a mais suja: arrasta poeira, fuligem, fezes de aves e folhas acumuladas na estiagem. Descartá-la melhora muito a qualidade do que entra no reservatório. Na falta de dado específico, adota-se comumente o descarte de cerca de 2 mm de chuva por metro quadrado de telhado — ou seja, cerca de 2 litros por m² de área de captação a cada evento." },
        { tipo: "texto", texto: "Esse descarte pode ser feito por um dispositivo automático: um tubo ou câmara que enche primeiro, retém a água suja e, cheio, deixa a água seguinte, mais limpa, passar ao filtro e ao reservatório. O volume desse dispositivo é dimensionado pela área do telhado (área × 2 mm, aproximadamente). Depois da chuva, ele esvazia devagar por um pequeno furo e se prepara para o próximo evento." },
        {
          tipo: "prancha",
          titulo: "Dispositivo de descarte da primeira água",
          desenho: {
            legenda: "A câmara enche com a água suja do início; cheia, desvia a água limpa ao filtro. Esvazia por um furo.",
            primitivas: [
              { t: "linha", de: [60, 30], ate: [60, 150], cor: "tinta" },
              { t: "rotulo", p: [30, 24], texto: "do telhado" },
              { t: "retangulo", p: [48, 90], w: 24, h: 70, hachura: true },
              { t: "rotulo", p: [20, 170], texto: "camara (agua suja)" },
              { t: "circulo", c: [60, 158], r: 3 },
              { t: "rotulo", p: [66, 162], texto: "furo (esvazia)" },
              { t: "seta", de: [60, 90], ate: [150, 90], cor: "destaque" },
              { t: "rotulo", p: [120, 82], texto: "agua limpa" },
              { t: "retangulo", p: [150, 80], w: 26, h: 18, hachura: true },
              { t: "rotulo", p: [182, 88], texto: "filtro" },
              { t: "seta", de: [176, 89], ate: [230, 89], cor: "suave" },
              { t: "rotulo", p: [200, 104], texto: "reservatorio" },
            ],
          },
        },
        { tipo: "tarefas", itens: [
          { id: "dim-descarte", titulo: "Dimensione o descarte da primeira água", entrega: "Multiplique sua área de captação (m²) por 2 litros/m². O resultado é o volume aproximado do dispositivo de first flush. Anote-o para o projeto." },
        ] },
      ],
    },
    {
      id: "exemplo-captavel",
      titulo: "Exemplo numérico: quanto o telhado oferece",
      blocos: [
        { tipo: "texto", texto: "Vamos fixar um exemplo que percorre o caderno inteiro. Suponha: telhado com área de captação A = 100 m²; cidade com precipitação média anual P = 1.400 mm; coeficiente de escoamento C = 0,8; e demanda não potável D = 300 litros/dia (9 m³/mês). Esses números são um exemplo didático — no seu projeto, troque pelos dados que você levantou no Capítulo 3." },
        { tipo: "texto", texto: "Volume captável anual bruto: V = P × A × C = 1.400 × 100 × 0,8 = 112.000 litros/ano, ou seja, 112 m³/ano. Dividido por 12, dá cerca de 9,3 m³/mês de oferta média — pertinho da demanda de 9 m³/mês. Isso sugere que há água suficiente no ano, mas que a distribuição mensal (meses secos) vai definir o tamanho do reservatório. É o que os métodos do próximo capítulo resolvem." },
        { tipo: "diagrama", titulo: "O exemplo do caderno", codigo: `flowchart TD
  A["A = 100 m2"] --> V["V = 1400 x 100 x 0,8"]
  P["P = 1400 mm/ano"] --> V
  C["C = 0,8"] --> V
  V --> R["112.000 L/ano = 112 m3"]
  R --> M["~9,3 m3/mes de oferta media"]
  D["Demanda 9 m3/mes"] --> Comp["Comparar: cabe, mas depende dos meses secos"]
  M --> Comp` },
        {
          tipo: "licao",
          pergunta: "No exemplo (A=100 m², P=1.400 mm, C=0,8), qual é o volume captável anual bruto?",
          alternativas: ["11.200 litros", "112.000 litros", "1.120.000 litros"],
          correta: 1,
          explicacao: "1.400 × 100 × 0,8 = 112.000 litros por ano (112 m³). A média mensal fica em torno de 9,3 m³, mas a distribuição ao longo do ano define o reservatório.",
        },
      ],
    },
    {
      id: "video-vazao",
      titulo: "Vídeo: calcular a vazão de chuva",
      blocos: [
        { tipo: "texto", texto: "Para quem vai dimensionar também as calhas, vale ver o cálculo da vazão de chuva, que parte da intensidade pluviométrica e da área de captação. É a mesma lógica de área × chuva, agora aplicada ao pico instantâneo que a calha precisa dar conta. Observe como a intensidade (mm/h) de projeto muda o resultado." },
        { tipo: "video", titulo: "Cálculo da vazão de chuva (Instalações de Águas Pluviais)", youtube: "TalnNcC7rDo" },
        { tipo: "tarefas", itens: [
          { id: "nota-vazao", titulo: "Separe os dois cálculos", entrega: "Anote a diferença entre o volume captável (para o reservatório, usa chuva acumulada) e a vazão de pico (para a calha, usa intensidade instantânea). São contas distintas com insumos distintos." },
        ] },
      ],
    },

    // ===================== CAPÍTULO 5 — OS SEIS MÉTODOS DA NBR 15527 =====================
    {
      id: "seis-metodos",
      titulo: "Os seis métodos do anexo da norma",
      blocos: [
        { tipo: "texto", texto: "O anexo da NBR 15527 apresenta seis métodos para dimensionar o volume do reservatório: Rippl, Simulação, Azevedo Netto (chamado método brasileiro), e os métodos práticos Alemão, Inglês e Australiano. Eles vão de simples (uma fórmula de bolso) a detalhados (balanço diário da série de chuva). A norma deixa a escolha, justificada, ao projetista: o bom projeto roda vários e compara." },
        { tipo: "texto", texto: "Um ponto importante, repetido na literatura: os métodos dão volumes bem diferentes para o mesmo caso. O de Rippl tende a resultar nos maiores reservatórios; os práticos, nos menores. Nenhum é o certo absoluto — cada um responde a uma pergunta. O caderno vai percorrer os seis com o mesmo exemplo e, no fim, mostrar como reconciliar." },
        { tipo: "diagrama", titulo: "Do simples ao detalhado", codigo: `flowchart LR
  S["Praticos (Alemao, Ingles): formula rapida"] --> M["Azevedo Netto: empirico"]
  M --> R["Rippl: balanco de massa"]
  R --> Sim["Simulacao / Australiano: balanco no tempo + confiabilidade"]` },
      ],
    },
    {
      id: "metodo-rippl",
      titulo: "Método de Rippl (balanço de massa)",
      blocos: [
        { tipo: "texto", texto: "O método de Rippl vem da regularização de vazão em barragens. A ideia: em cada passo de tempo t, calcule o quanto a demanda supera a chuva aproveitável. S(t) = D(t) − Q(t), sendo Q(t) = C × precipitação(t) × área. Quando a demanda é maior que a chuva (S positivo), o reservatório precisa ter guardado água; o volume do reservatório é a soma desses déficits acumulados: V = Σ S(t), só para os S(t) positivos — válido quando, no total do ano, a chuva aproveitável supera a demanda (ΣD < ΣQ)." },
        { tipo: "texto", texto: "Na prática, Rippl mede o maior rombo acumulado entre o que entra e o que sai. Por isso ele tende a dar o reservatório que garante não faltar água em nenhum momento da série usada — e, por isso mesmo, costuma resultar nos maiores volumes, muitas vezes caros demais. É excelente como limite superior e como referência de autonomia total." },
        { tipo: "diagrama", titulo: "Lógica do Rippl", codigo: `flowchart TD
  Q["Q(t) = C x P(t) x A (chuva aproveitavel)"] --> S["S(t) = D(t) - Q(t)"]
  D["D(t): demanda no mes"] --> S
  S --> P{"S(t) > 0 (deficit)?"}
  P -->|sim| Soma["acumula no volume"]
  P -->|nao| Ign["ignora (mes com sobra)"]
  Soma --> V["V = soma dos deficits"]` },
      ],
    },
    {
      id: "rippl-exemplo",
      titulo: "Rippl na prática: o diagrama de massa",
      blocos: [
        { tipo: "texto", texto: "Monte uma tabela com 12 linhas (meses). Em cada mês: chuva do mês, Q(t) = C × chuva × área, demanda D(t) do mês, e a diferença S(t) = D(t) − Q(t). Some os S(t) positivos de uma sequência seca: é a água que o reservatório teve que estocar. No exemplo do caderno (A=100 m², C=0,8, D=9 m³/mês), os meses secos acumulam o déficit que define o volume de Rippl." },
        { tipo: "texto", texto: "Visualmente, o diagrama de massa acumula a entrada (chuva) e a saída (demanda) ao longo do ano; a maior distância vertical entre as curvas, no período crítico, é o volume do reservatório. Esse desenho deixa claro por que Rippl responde à pergunta: qual reservatório nunca deixaria faltar, nesta série?" },
        {
          tipo: "prancha",
          titulo: "Diagrama de massa de Rippl",
          desenho: {
            legenda: "Curvas acumuladas de chuva captada e de demanda. A maior distância no trecho crítico é o volume do reservatório.",
            primitivas: [
              { t: "linha", de: [24, 170], ate: [285, 170], cor: "tinta" },
              { t: "linha", de: [24, 170], ate: [24, 18], cor: "tinta" },
              { t: "rotulo", p: [28, 12], texto: "acumulado" },
              { t: "curva", pts: [[24, 165], [70, 120], [120, 100], [170, 95], [220, 60], [275, 30]], cor: "destaque" },
              { t: "rotulo", p: [230, 44], texto: "chuva acum." },
              { t: "curva", pts: [[24, 165], [70, 140], [120, 118], [170, 96], [220, 74], [275, 52]], cor: "suave" },
              { t: "rotulo", p: [200, 92], texto: "demanda acum." },
              { t: "linha", de: [120, 100], ate: [120, 118], cor: "tinta" },
              { t: "rotulo", p: [122, 130], texto: "volume = maior gap" },
            ],
          },
        },
        { tipo: "tarefas", itens: [
          { id: "tabela-rippl", titulo: "Rode o Rippl com seus dados", entrega: "Monte a tabela mensal (chuva, Q, D, S) e some os déficits do período seco. Registre o volume de Rippl do seu caso, em litros e em m³." },
        ] },
      ],
    },
    {
      id: "metodo-simulacao",
      titulo: "Método da Simulação (balanço no tempo)",
      blocos: [
        { tipo: "texto", texto: "A Simulação fixa um volume de reservatório e verifica como ele se comporta passo a passo, pela equação da continuidade: S(t) = Q(t) + S(t−1) − D(t), respeitando os limites 0 ≤ S(t) ≤ V. Ou seja, o nível do reservatório hoje é o de ontem, mais a chuva que entrou, menos o consumo; se passar da capacidade, transborda; se chegar a zero, falta água e a rede entra. Despreza-se a evaporação." },
        { tipo: "texto", texto: "Diferente de Rippl, a Simulação não devolve um único volume: ela testa vários volumes e mede, para cada um, a confiabilidade (percentual do tempo em que o reservatório atendeu a demanda). Você escolhe o volume que atinge a confiabilidade desejada. É o método que melhor revela o custo-benefício: ver que dobrar o reservatório sobe a garantia só de 85% para 90% ajuda a decidir com dinheiro na mão." },
        { tipo: "diagrama", titulo: "Equação da continuidade", codigo: `flowchart LR
  Ont["S(t-1): nivel de ontem"] --> Hoje["S(t) = Q(t) + S(t-1) - D(t)"]
  Q["Q(t): chuva que entrou"] --> Hoje
  D["D(t): consumo"] --> Hoje
  Hoje --> Lim{"dentro de 0..V?"}
  Lim -->|acima| Trans["transborda (extravasor)"]
  Lim -->|zero| Falta["falta: usa a rede"]` },
      ],
    },
    {
      id: "simulacao-exemplo",
      titulo: "Simulação e confiabilidade",
      blocos: [
        { tipo: "texto", texto: "Confiabilidade é a fração do tempo em que o reservatório conseguiu entregar a água pedida. Um reservatório de 5 m³ no exemplo pode garantir, digamos, 80% dos dias; um de 10 m³, 92%; um de 20 m³, 97%. A curva é sempre de retorno decrescente: cada metro cúbico extra agrega menos garantia. Dimensionar pela Simulação é parar onde a garantia já é boa e o custo ainda faz sentido." },
        { tipo: "texto", texto: "Rode a simulação começando com o reservatório vazio (condição conservadora) e sobre uma série longa, de preferência diária. Teste uma faixa de volumes e plote volume × confiabilidade. O joelho da curva — onde ela achata — costuma ser a melhor escolha. Guarde: não existe 100%; buscar garantia total leva de volta ao reservatório gigante de Rippl." },
        {
          tipo: "prancha",
          titulo: "Volume x confiabilidade",
          desenho: {
            legenda: "A confiabilidade sobe com o volume, mas cada m³ extra rende menos. O joelho da curva é a boa escolha.",
            primitivas: [
              { t: "linha", de: [28, 168], ate: [285, 168], cor: "tinta" },
              { t: "linha", de: [28, 168], ate: [28, 20], cor: "tinta" },
              { t: "rotulo", p: [30, 14], texto: "confiab. %" },
              { t: "rotulo", p: [240, 180], texto: "volume" },
              { t: "curva", pts: [[28, 160], [70, 110], [120, 70], [170, 52], [220, 44], [275, 40]], cor: "destaque" },
              { t: "circulo", c: [120, 70], r: 5, cor: "tinta" },
              { t: "rotulo", p: [126, 64], texto: "joelho" },
            ],
          },
        },
        { tipo: "tarefas", itens: [
          { id: "curva-conf", titulo: "Levante sua curva de confiabilidade", entrega: "Com planilha, simule 3 a 5 volumes (ex.: 5, 10, 15, 20 m³) e anote a confiabilidade de cada um. Marque o joelho da curva como candidato a volume final." },
        ] },
      ],
    },
    {
      id: "metodo-azevedo",
      titulo: "Método de Azevedo Netto (brasileiro)",
      blocos: [
        { tipo: "texto", texto: "O método brasileiro, ou de Azevedo Netto, é empírico e rápido: V = 0,042 × P × A × T. Onde P é a precipitação média anual em mm, A é a área de captação em m², T é o número de meses de pouca chuva ou seca, e V sai em litros. Ele embute, no coeficiente 0,042 e no fator T, a necessidade de atravessar a estiagem: quanto mais longos os meses secos, maior o reservatório." },
        { tipo: "texto", texto: "No exemplo do caderno (P=1.400 mm, A=100 m², e supondo T=4 meses secos): V = 0,042 × 1.400 × 100 × 4 = 23.520 litros, cerca de 23,5 m³. É um valor intermediário, maior que os práticos e menor que Rippl. A força do método é a simplicidade; a fraqueza é não olhar a distribuição real da chuva, só o total e o número de meses secos." },
        {
          tipo: "licao",
          pergunta: "Na fórmula de Azevedo Netto V = 0,042 × P × A × T, o que é T?",
          alternativas: [
            "A temperatura média anual",
            "O número de meses de pouca chuva ou seca",
            "O tempo de retorno da chuva de projeto",
          ],
          correta: 1,
          explicacao: "T é o número de meses secos. Ele faz o reservatório crescer onde a estiagem é mais longa, embutindo a autonomia necessária no cálculo empírico.",
        },
      ],
    },
    {
      id: "metodo-alemao",
      titulo: "Método prático alemão",
      blocos: [
        { tipo: "texto", texto: "O método prático alemão é uma regra de bolso conservadora: o volume adotado é 6% do menor valor entre o volume anual de chuva aproveitável e o volume anual de demanda não potável. Em fórmula: V_adotado = mín(V_aproveitável_anual; D_anual) × 0,06. Ele parte da ideia de que não adianta reservatório maior do que a oferta ou a demanda de um ano justificam, e fica com uma fração pequena disso." },
        { tipo: "texto", texto: "No exemplo: chuva aproveitável anual = 112.000 L; demanda anual = 300 L/dia × 365 ≈ 109.500 L. O menor é 109.500 L; vezes 0,06 dá cerca de 6.570 litros, ou 6,6 m³. É um reservatório pequeno, que não busca autonomia na seca — atende bem onde a chuva é distribuída e o objetivo é economia no dia a dia, não independência total." },
        { tipo: "diagrama", titulo: "Método alemão", codigo: `flowchart LR
  V1["Chuva aproveitavel anual"] --> MIN["menor dos dois"]
  V2["Demanda anual"] --> MIN
  MIN --> X["x 0,06"]
  X --> R["Volume adotado"]` },
      ],
    },
    {
      id: "metodo-ingles",
      titulo: "Método prático inglês",
      blocos: [
        { tipo: "texto", texto: "O método prático inglês é ainda mais direto: V = 0,05 × P × A, com P em mm (precipitação média anual) e A em m² (área de captação), resultando o volume em litros. Ele ignora a demanda por completo: olha só a oferta de chuva e fica com 5% do volume anual que o telhado capta. É uma estimativa de partida, útil para ter rapidamente uma ordem de grandeza." },
        { tipo: "texto", texto: "No exemplo: V = 0,05 × 1.400 × 100 = 7.000 litros, cerca de 7 m³. Note que inglês e alemão deram valores próximos (7 e 6,6 m³) e bem menores que Azevedo Netto (23,5 m³) e que Rippl (tende a ser o maior). Essa dispersão é exatamente o motivo de não confiar em um método só: eles respondem a perguntas diferentes." },
        {
          tipo: "licao",
          pergunta: "O que o método prático inglês (V = 0,05 × P × A) ignora?",
          alternativas: [
            "A área de captação",
            "A precipitação",
            "A demanda não potável (só olha a oferta de chuva)",
          ],
          correta: 2,
          explicacao: "O inglês dimensiona só pela oferta (chuva × área × 5%), sem considerar o consumo. Por isso é uma estimativa inicial, não um dimensionamento que garanta atender a demanda.",
        },
      ],
    },
    {
      id: "metodo-australiano",
      titulo: "Método prático australiano",
      blocos: [
        { tipo: "texto", texto: "O australiano é um método de simulação que trabalha com confiabilidade como critério de projeto, com valores recomendados de 90% a 99%. A chuva efetivamente captada em cada passo desconta a primeira água: Q(t) = C × A × (P(t) − first flush), tipicamente com first flush de 2 mm. O balanço do reservatório é feito mês a mês, acumulando entrada e saída, e verifica-se em que fração do tempo ele atendeu a demanda." },
        { tipo: "texto", texto: "Vários estudos brasileiros apontam bom desempenho do método australiano: em uma comparação em Santa Catarina, ele se sobressaiu em cerca de 81,5% dos casos simulados. A ideia prática: escolha a confiabilidade-alvo (por exemplo, 90%) e ache o menor reservatório que a entrega. É parente próximo do método da Simulação, com foco na falha e na primeira água descartada." },
        { tipo: "diagrama", titulo: "Australiano: captação com first flush", codigo: `flowchart TD
  P["P(t): chuva do mes"] --> Q["Q(t) = C x A x (P(t) - 2 mm)"]
  FF["descarte 2 mm (first flush)"] --> Q
  Q --> B["Balanco mensal do reservatorio"]
  B --> Conf["Confiabilidade (alvo 90-99%)"]
  Conf --> Esc["Menor volume que atende o alvo"]` },
        { tipo: "tarefas", itens: [
          { id: "alvo-conf", titulo: "Defina sua confiabilidade-alvo", entrega: "Escolha a confiabilidade que você quer garantir (ex.: 90%). Anote a justificativa: é residência, comércio, uso crítico? Quanto mais crítico, mais alta a meta e maior o reservatório." },
        ] },
      ],
    },
    {
      id: "comparar-metodos",
      titulo: "Comparar os métodos e decidir",
      blocos: [
        { tipo: "texto", texto: "Reunindo o exemplo do caderno: inglês ≈ 7 m³, alemão ≈ 6,6 m³, Azevedo Netto ≈ 23,5 m³, Rippl tende ao maior (autonomia total na série), e a Simulação/australiano dão uma faixa conforme a confiabilidade escolhida. A diferença não é erro: cada método responde a uma pergunta. Práticos: economia barata no dia a dia. Azevedo Netto: estimativa intermediária com meses secos. Rippl: nunca faltar. Simulação: o melhor custo-garantia." },
        { tipo: "texto", texto: "A decisão madura: use os práticos e Azevedo Netto para delimitar a faixa, rode a Simulação (ou australiano) para ver volume × confiabilidade, e escolha o volume no joelho da curva que também respeite o mínimo legal do município. Documente a escolha — a NBR exige justificativa. Nunca entregue só o número de um método isolado." },
        {
          tipo: "prancha",
          titulo: "A dispersão dos métodos (exemplo do caderno)",
          desenho: {
            legenda: "Volumes do mesmo caso por método. A escolha final fica na faixa útil, com confiabilidade adequada.",
            primitivas: [
              { t: "linha", de: [24, 170], ate: [290, 170], cor: "tinta" },
              { t: "linha", de: [24, 170], ate: [24, 20], cor: "tinta" },
              { t: "rotulo", p: [28, 14], texto: "volume m3" },
              { t: "retangulo", p: [40, 140], w: 24, h: 30, hachura: true },
              { t: "rotulo", p: [36, 182], texto: "Alemao" },
              { t: "retangulo", p: [90, 135], w: 24, h: 35, hachura: true },
              { t: "rotulo", p: [90, 182], texto: "Ingles" },
              { t: "retangulo", p: [140, 70], w: 24, h: 100, cor: "destaque" },
              { t: "rotulo", p: [134, 182], texto: "Azevedo" },
              { t: "retangulo", p: [190, 40], w: 24, h: 130, cor: "tinta" },
              { t: "rotulo", p: [194, 182], texto: "Rippl" },
              { t: "retangulo", p: [240, 95], w: 24, h: 75, cor: "suave" },
              { t: "rotulo", p: [236, 182], texto: "Simul." },
            ],
          },
        },
        {
          tipo: "licao",
          pergunta: "Por que a NBR 15527 pede que o projetista justifique o método escolhido?",
          alternativas: [
            "Porque só um método é válido por lei",
            "Porque os métodos dão volumes diferentes e a escolha deve caber ao objetivo (economia, autonomia, confiabilidade)",
            "Porque é preciso usar os seis sempre e somar os volumes",
          ],
          correta: 1,
          explicacao: "Cada método responde a uma pergunta e resulta em volumes distintos. A norma exige justificar a escolha porque ela depende do objetivo e das condições do caso.",
        },
      ],
    },
    {
      id: "video-dimensionamento",
      titulo: "Vídeo: dimensionar o reservatório",
      blocos: [
        { tipo: "texto", texto: "Para consolidar o capítulo, veja uma aula que dimensiona o reservatório de aproveitamento de água de chuva aplicando os métodos da norma com um exemplo. Acompanhe de planilha aberta e repita as contas com os seus dados — é assim que o método sai do papel." },
        { tipo: "video", titulo: "Aula: dimensionamento de reservatório para aproveitamento de água de chuva", youtube: "otipgrId5ns" },
        { tipo: "video", titulo: "Aula: Captação de Água de Chuva (SPANP) – Parte 3: Dimensionamento de Reservatórios", youtube: "nq83fvYokcY" },
        { tipo: "tarefas", itens: [
          { id: "refazer", titulo: "Refaça o cálculo com seus dados", entrega: "Acompanhando o vídeo, rode ao menos três métodos (um prático, Azevedo Netto e a Simulação) com os números do seu projeto. Monte a tabela comparativa de volumes." },
        ] },
      ],
    },
    {
      id: "escolher-volume",
      titulo: "Escolher o volume final",
      blocos: [
        { tipo: "texto", texto: "Com a faixa de volumes e a curva de confiabilidade em mãos, escolha o volume final observando quatro filtros: a confiabilidade-alvo (o joelho da curva da Simulação), o mínimo legal do município, os volumes comerciais disponíveis (caixas de polietileno vêm em tamanhos padrão) e o espaço físico onde o reservatório vai caber. O número que satisfaz os quatro é o seu volume de projeto." },
        { tipo: "texto", texto: "Arredonde para cima até o volume comercial mais próximo — é mais barato comprar uma caixa de 10.000 L pronta do que mandar fazer uma de 9.300 L. E reserve uma folga para o descarte e para a borda livre (o reservatório não trabalha 100% cheio por causa do extravasor). Registre o volume escolhido e a justificativa: ela acompanha o projeto." },
        { tipo: "diagrama", titulo: "Os quatro filtros da escolha", codigo: `flowchart TD
  F1["Confiabilidade-alvo (Simulacao)"] --> V["Volume final"]
  F2["Minimo legal do municipio"] --> V
  F3["Volume comercial disponivel"] --> V
  F4["Espaco fisico no terreno"] --> V
  V --> J["Justificativa documentada"]` },
        { tipo: "tarefas", itens: [
          { id: "vol-final", titulo: "Defina e justifique o volume", entrega: "Escreva o volume final escolhido (em litros), o método/garantia que o embasou, o mínimo legal consultado e o modelo comercial pretendido. Esse é o coração do projeto." },
        ] },
      ],
    },

    // ===================== CAPÍTULO 6 — PROJETO DO SISTEMA =====================
    {
      id: "calhas-condutores",
      titulo: "Calhas e condutores (NBR 10844)",
      blocos: [
        { tipo: "texto", texto: "A água só chega ao reservatório se as calhas e os condutores derem conta do pico de chuva. A NBR 10844 dá o método: a vazão de projeto vem da intensidade pluviométrica (mm/h, para uma duração e um período de retorno) multiplicada pela área de contribuição. Com a vazão, dimensiona-se a seção da calha e o diâmetro dos condutores verticais e horizontais. Calha subdimensionada transborda e perde água justamente na chuva forte." },
        { tipo: "texto", texto: "Atenção à inclinação mínima da calha (para escoar sem empoçar) e ao número e posição dos condutores verticais. Um telhado grande pede mais de uma descida. Esse dimensionamento é de pico instantâneo — diferente do volume captável, que usa chuva acumulada. São duas contas, lembra? Aqui é a do pico." },
        {
          tipo: "prancha",
          titulo: "Calha, condutor vertical e horizontal",
          desenho: {
            legenda: "A água do telhado cai na calha (inclinada), desce pelo condutor vertical e segue pelo horizontal ao sistema.",
            primitivas: [
              { t: "linha", de: [30, 60], ate: [150, 40], cor: "tinta" },
              { t: "rotulo", p: [60, 34], texto: "telhado" },
              { t: "linha", de: [28, 66], ate: [160, 80], cor: "destaque" },
              { t: "rotulo", p: [40, 90], texto: "calha (inclinada)" },
              { t: "linha", de: [160, 80], ate: [160, 160], cor: "tinta" },
              { t: "rotulo", p: [163, 120], texto: "condutor vertical" },
              { t: "linha", de: [160, 160], ate: [270, 168], cor: "tinta" },
              { t: "rotulo", p: [180, 178], texto: "condutor horizontal" },
            ],
          },
        },
      ],
    },
    {
      id: "video-calha",
      titulo: "Vídeo: dimensionar a calha",
      blocos: [
        { tipo: "texto", texto: "Veja um exemplo prático de dimensionamento de calha pela NBR 10844: da intensidade de chuva e da área à seção necessária. Repare como a escolha do período de retorno e da intensidade de projeto altera o tamanho da calha." },
        { tipo: "video", titulo: "Exemplo – Dimensionamento de calha (águas pluviais)", youtube: "8hPiCrRKR1Q" },
        { tipo: "tarefas", itens: [
          { id: "calc-calha", titulo: "Estime a vazão de pico", entrega: "Com a intensidade de chuva da sua região e a área de captação, calcule a vazão de projeto da calha. Anote o resultado para discutir com o profissional que assinará o projeto." },
        ] },
      ],
    },
    {
      id: "video-condutores",
      titulo: "Vídeo: condutores horizontais",
      blocos: [
        { tipo: "texto", texto: "Complementando, este vídeo trata do dimensionamento dos condutores horizontais, que levam a água das descidas até o reservatório ou a rede. Inclinação e diâmetro definem se a água corre ou empoça." },
        { tipo: "video", titulo: "Dimensionamento de condutores horizontais (águas pluviais)", youtube: "6fwvLojloao" },
        { tipo: "tarefas", itens: [
          { id: "nota-cond", titulo: "Planeje o caminho da água", entrega: "Desenhe, em planta, o percurso da água do telhado até o reservatório: calhas, descidas e condutores horizontais com inclinação. Marque onde entra o descarte e o filtro." },
        ] },
      ],
    },
    {
      id: "filtro-grades",
      titulo: "Grades e filtros antes do reservatório",
      blocos: [
        { tipo: "texto", texto: "Entre o telhado e o reservatório, dois pré-tratamentos protegem a água: a grade (ou tela) que barra folhas e detritos grandes na calha e na entrada dos condutores, e o filtro que retém partículas finas antes do armazenamento. Sem eles, o reservatório acumula matéria orgânica, apodrece e exige limpezas frequentes. É o investimento mais barato que mais reduz manutenção." },
        { tipo: "texto", texto: "Há filtros comerciais específicos para água de chuva (autolimpantes, de tela fina) e soluções simples com camadas de brita e tela. O essencial é que o filtro seja acessível para limpeza: um filtro que não dá para abrir e lavar vira entupimento garantido. Posicione-o depois do descarte da primeira água e antes da entrada do reservatório." },
        {
          tipo: "licao",
          pergunta: "Qual é a ordem correta do pré-tratamento, do telhado ao reservatório?",
          alternativas: [
            "Filtro, grade, descarte da primeira água",
            "Grade (folhas), descarte da primeira água, filtro",
            "Descarte da primeira água, bomba, grade",
          ],
          correta: 1,
          explicacao: "Primeiro a grade barra folhas, depois o descarte joga fora a água mais suja do início e, por fim, o filtro retém partículas finas antes de a água entrar no reservatório.",
        },
      ],
    },
    {
      id: "dispositivo-descarte",
      titulo: "O dispositivo de descarte, em detalhe",
      blocos: [
        { tipo: "texto", texto: "Retomando o first flush do Capítulo 4, agora como peça física. O dispositivo pode ser de volume fixo (uma câmara que enche e, cheia, desvia a água limpa) ou de fluxo (uma bóia que fecha a passagem suja). O de volume é o mais comum em residências: dimensione-o pela área do telhado × ~2 mm. Ele precisa de um dreno pequeno no fundo para esvaziar entre chuvas e ficar pronto para o próximo evento." },
        { tipo: "texto", texto: "Um erro frequente é esquecer o dreno ou fazê-lo grande demais: se esvazia rápido, não descarta nada na chuva seguinte; se não esvazia, enche e deixa de funcionar. Um furo pequeno, calibrado para esvaziar em algumas horas, resolve. Preveja acesso para limpar o fundo, onde o sedimento se acumula." },
        {
          tipo: "prancha",
          titulo: "Descarte de volume fixo com dreno",
          desenho: {
            legenda: "A câmara retém o volume de first flush; o dreno no fundo a esvazia devagar entre as chuvas.",
            primitivas: [
              { t: "retangulo", p: [110, 40], w: 40, h: 110, cor: "tinta" },
              { t: "seta", de: [130, 24], ate: [130, 42], cor: "suave" },
              { t: "rotulo", p: [98, 20], texto: "do telhado" },
              { t: "retangulo", p: [112, 90], w: 36, h: 58, hachura: true },
              { t: "rotulo", p: [60, 120], texto: "agua suja retida" },
              { t: "seta", de: [150, 55], ate: [210, 55], cor: "destaque" },
              { t: "rotulo", p: [160, 46], texto: "agua limpa segue" },
              { t: "circulo", c: [130, 150], r: 3 },
              { t: "rotulo", p: [136, 158], texto: "dreno (furo pequeno)" },
            ],
          },
        },
      ],
    },
    {
      id: "video-filtro",
      titulo: "Vídeo: filtrar a primeira água",
      blocos: [
        { tipo: "texto", texto: "Dois vídeos mostram, na prática, como montar filtro e descarte da primeira água com materiais acessíveis. São soluções caseiras que ilustram o princípio; no seu projeto, dimensione o descarte pela conta do Capítulo 4 e garanta acesso para limpeza." },
        { tipo: "video", titulo: "Como fazer filtro para captar água da chuva", youtube: "-56HEkE9cO8" },
        { tipo: "video", titulo: "Como filtrar a primeira água de chuva", youtube: "wZ8trGD5mGY" },
        { tipo: "tarefas", itens: [
          { id: "esboco-filtro", titulo: "Esboce seu pré-tratamento", entrega: "Desenhe a sequência grade → descarte → filtro do seu sistema, com o volume do descarte calculado e um ponto de acesso para limpeza em cada peça." },
        ] },
      ],
    },
    {
      id: "tipos-reservatorio",
      titulo: "Tipos de reservatório",
      blocos: [
        { tipo: "texto", texto: "O reservatório pode ser de polietileno (as caixas e cisternas prontas, baratas e rápidas de instalar), de fibra de vidro, de concreto moldado no local (para grandes volumes) ou de anéis/placas pré-moldadas. Polietileno resolve a maioria das residências; concreto compensa em volumes grandes ou quando se quer enterrar sob área de tráfego. Cada material tem exigências de base, impermeabilização e proteção contra luz (para não criar algas)." },
        { tipo: "texto", texto: "Reservatório enterrado economiza espaço e mantém a água fresca e no escuro (menos algas), mas exige bomba para recalque e cuidado contra infiltração e flutuação quando vazio. Apoiado ou elevado pode usar gravidade, mas ocupa área e fica exposto ao sol. A escolha equilibra volume, espaço, orçamento e se há como aproveitar a gravidade." },
        { tipo: "diagrama", titulo: "Escolha do reservatório", codigo: `flowchart TD
  Vol{"Volume?"} -->|ate ~10 m3| Poli["Polietileno / fibra (pronto)"]
  Vol -->|grande| Conc["Concreto moldado / pre-moldado"]
  Pos{"Posicao?"} -->|enterrado| Bomba["Precisa bomba; agua fresca e escura"]
  Pos -->|apoiado/elevado| Grav["Pode usar gravidade; ocupa area"]` },
      ],
    },
    {
      id: "local-reservatorio",
      titulo: "Onde instalar o reservatório",
      blocos: [
        { tipo: "texto", texto: "A posição do reservatório decide metade do sistema. O ideal é ficar perto da maior descida de água do telhado (menos tubulação) e em cota que facilite a distribuição. Enterrado ganha em temperatura e estética, mas obriga bomba. Em cota alta (laje, torre), a gravidade pode alimentar as descargas sem bomba — ótimo, se houver altura e espaço. Avalie também o acesso para manutenção: reservatório impossível de abrir não se limpa." },
        { tipo: "texto", texto: "Cuidados do enterrado: base firme, proteção contra a flutuação (quando vazio, o lençol pode empurrá-lo para cima), e vedação contra infiltração de água do solo e de raízes. Cuidados do elevado: estrutura que aguente o peso (1 m³ de água pesa 1 tonelada) e proteção contra o sol. O peso da água cheia é um ponto sério de projeto estrutural." },
        {
          tipo: "mobilizacao",
          papel: "Engenheiro civil/estrutural (para reservatório elevado ou enterrado de grande porte)",
          porque: "Água pesa cerca de 1 tonelada por metro cúbico. Um reservatório elevado ou um reservatório enterrado grande impõe cargas e esforços que exigem verificação estrutural; estimar a olho arrisca a segurança.",
          entregaEsperada: "Verificação estrutural da base/estrutura de apoio (ou do reservatório enterrado) com memorial de cálculo e ART, dimensionando cargas de água cheia, empuxo e flutuação.",
          gerenciadoPor: "zaeon",
        },
      ],
    },
    {
      id: "recalque-bomba",
      titulo: "Bomba, rede dupla e identificação",
      blocos: [
        { tipo: "texto", texto: "Reservatório enterrado ou baixo precisa de bomba para levar a água aos pontos de uso, ou para um reservatório superior que distribui por gravidade. A bomba é dimensionada pela vazão necessária e pela altura manométrica (altura a vencer mais as perdas na tubulação). Bomba grande demais gasta energia à toa; pequena demais não entrega pressão. O ponto de operação casa a curva da bomba com a da instalação." },
        { tipo: "texto", texto: "A rede de água da chuva é independente da rede potável e tem que ser inconfundível: tubulações e torneiras identificadas com a inscrição de água não potável, cores ou etiquetas, para que ninguém faça uma ligação cruzada. Essa identificação é exigência das normas e a principal barreira contra alguém beber, por engano, água de uso não potável." },
        {
          tipo: "prancha",
          titulo: "Duas redes que nunca se cruzam",
          desenho: {
            legenda: "A rede potável (tinta) e a de água de chuva (destaque) são separadas e identificadas em todo o percurso.",
            primitivas: [
              { t: "retangulo", p: [20, 40], w: 60, h: 36 },
              { t: "rotulo", p: [24, 60], texto: "Rede potavel" },
              { t: "linha", de: [80, 58], ate: [200, 58], cor: "tinta" },
              { t: "rotulo", p: [120, 50], texto: "beber / cozinhar" },
              { t: "retangulo", p: [20, 120], w: 60, h: 36, cor: "destaque" },
              { t: "rotulo", p: [24, 140], texto: "Cisterna" },
              { t: "linha", de: [80, 138], ate: [200, 138], cor: "destaque" },
              { t: "rotulo", p: [100, 160], texto: "descarga / rega (identificada)" },
              { t: "circulo", c: [95, 138], r: 6 },
              { t: "rotulo", p: [86, 118], texto: "bomba" },
            ],
          },
        },
      ],
    },
    {
      id: "extravasor-ladrao",
      titulo: "Extravasor, ventilação e anti-mosquito",
      blocos: [
        { tipo: "texto", texto: "Quando o reservatório enche, o excesso precisa sair com segurança: é o extravasor (ladrão), um tubo que devolve a sobra à drenagem, dimensionado para dar conta da entrada máxima sem transbordar por cima. Ele deve ter a mesma capacidade ou mais que a entrada e descarregar em local adequado — nunca criar poça junto à fundação." },
        { tipo: "texto", texto: "Todas as aberturas (extravasor, respiro, entrada) precisam de tela anti-inseto: reservatório de água parada é criadouro potencial do Aedes aegypti. Ventilação evita odor e pressão; a tela impede a postura de ovos. Tampar bem, telar as aberturas e manter o reservatório no escuro são medidas de saúde pública, não só de engenharia." },
        {
          tipo: "licao",
          pergunta: "Por que todas as aberturas do reservatório devem ter tela fina?",
          alternativas: [
            "Para filtrar a água que entra",
            "Para impedir que o Aedes aegypti e outros insetos usem a água parada como criadouro",
            "Para aumentar a pressão da bomba",
          ],
          correta: 1,
          explicacao: "Água parada é criadouro de mosquitos. Telar extravasor, respiro e entradas impede a postura de ovos. É medida de saúde pública obrigatória em reservatórios.",
        },
      ],
    },

    // ===================== CAPÍTULO 7 — CÁLCULO E PROJETO DETALHADO =====================
    {
      id: "prancha-isometrico",
      titulo: "A prancha do sistema completo",
      blocos: [
        { tipo: "texto", texto: "Antes de executar, consolide tudo numa prancha: telhado e área de captação, calhas e condutores com inclinação, grade, descarte da primeira água, filtro, reservatório com volume definido, bomba, rede de distribuição identificada e extravasor. É esse desenho que o instalador vai seguir e que o profissional responsável vai revisar e assinar. Projeto sem prancha vira improviso na obra." },
        {
          tipo: "prancha",
          titulo: "Isométrico esquemático do sistema",
          desenho: {
            legenda: "Visão geral: da cobertura ao uso, com todos os componentes dimensionados nos capítulos anteriores.",
            primitivas: [
              { t: "linha", de: [24, 54], ate: [96, 34], cor: "tinta" },
              { t: "linha", de: [96, 34], ate: [168, 54], cor: "tinta" },
              { t: "rotulo", p: [70, 28], texto: "cobertura (A)" },
              { t: "linha", de: [168, 54], ate: [168, 96], cor: "tinta" },
              { t: "retangulo", p: [158, 60], w: 20, h: 10, hachura: true },
              { t: "rotulo", p: [182, 62], texto: "grade" },
              { t: "retangulo", p: [158, 96], w: 20, h: 24 },
              { t: "rotulo", p: [182, 104], texto: "descarte" },
              { t: "retangulo", p: [158, 128], w: 20, h: 12, hachura: true },
              { t: "rotulo", p: [182, 132], texto: "filtro" },
              { t: "retangulo", p: [44, 140], w: 110, h: 46, cor: "destaque" },
              { t: "rotulo", p: [70, 165], texto: "reservatorio V" },
              { t: "circulo", c: [40, 176], r: 7 },
              { t: "rotulo", p: [14, 192], texto: "bomba" },
              { t: "seta", de: [40, 169], ate: [40, 120], cor: "suave" },
              { t: "rotulo", p: [12, 112], texto: "uso" },
              { t: "seta", de: [154, 146], ate: [120, 146], cor: "tinta" },
              { t: "rotulo", p: [96, 138], texto: "extravasor" },
            ],
          },
        },
        { tipo: "tarefas", itens: [
          { id: "prancha-propria", titulo: "Desenhe a sua prancha", entrega: "Produza o desenho do seu sistema com cotas: área, volume, diâmetros de condutores, volume do descarte e percurso das redes. Leve-o à revisão do profissional responsável." },
        ] },
      ],
    },
    {
      id: "dimensionar-bomba",
      titulo: "Dimensionar a bomba",
      blocos: [
        { tipo: "texto", texto: "A bomba é escolhida por dois números: a vazão que os pontos de uso pedem e a altura manométrica total, que soma a altura geométrica (diferença de nível entre o reservatório e o ponto mais alto/distante) com as perdas de carga da tubulação e das conexões. Com esses dois valores, você entra na curva do fabricante e escolhe o modelo cujo ponto de operação atende sem sobrar demais." },
        { tipo: "texto", texto: "Para residências, uma bomba pequena costuma bastar; o erro comum é superdimensionar, o que gasta energia e dá golpe de aríete. Pense também no acionamento: pressostato com reservatório pressurizado, ou bomba que enche um reservatório superior em cota alta, de onde a gravidade distribui. A segunda opção é robusta e simples." },
        { tipo: "diagrama", titulo: "Ponto de operação da bomba", codigo: `flowchart LR
  Q["Vazao necessaria"] --> PO["Ponto de operacao"]
  H["Altura manometrica = geometrica + perdas"] --> PO
  PO --> M["Modelo na curva do fabricante"]` },
      ],
    },
    {
      id: "rede-distribuicao",
      titulo: "A rede de distribuição não potável",
      blocos: [
        { tipo: "texto", texto: "A rede que leva a água da chuva aos pontos de uso é independente e identificada. Dimensione os ramais pela vazão de cada ponto (descargas, torneiras de jardim) e garanta que a pressão chegue adequada ao ponto mais desfavorável. Use material compatível e preveja registros para isolar trechos em manutenção. Em edificações, a NBR 16783 orienta o uso de fontes alternativas não potáveis — vale consultá-la." },
        { tipo: "texto", texto: "A regra de ouro, de novo: jamais interligar com a rede potável. Nem uma conexão de emergência direta. Se for preciso completar a cisterna com água da rede em seca prolongada, faça por dispositivo com separação atmosférica (a água cai no reservatório por cima, sem contato de tubos), para impedir qualquer retorno. Ligação cruzada é o acidente mais grave desse tipo de sistema." },
        {
          tipo: "licao",
          pergunta: "Se for preciso completar a cisterna com água da rede na seca, como fazer com segurança?",
          alternativas: [
            "Conectar os dois tubos diretamente com um registro",
            "Com separação atmosférica: a água da rede cai por cima no reservatório, sem conexão direta de tubos",
            "Não há problema em interligar as redes",
          ],
          correta: 1,
          explicacao: "A separação atmosférica (air gap) impede qualquer retorno da água não potável para a rede potável. Conexão direta, mesmo com registro, é ligação cruzada e é proibida.",
        },
      ],
    },
    {
      id: "sinalizacao",
      titulo: "Sinalização obrigatória",
      blocos: [
        { tipo: "texto", texto: "Toda tubulação, registro, torneira e reservatório da água de chuva deve ser identificado como água não potável, com placas, etiquetas ou cor padronizada, em local visível e de forma durável. A sinalização é exigência normativa e serve para o presente e para o futuro: quem fizer uma reforma daqui a dez anos precisa saber, de imediato, que aquela água não é de beber." },
        { tipo: "texto", texto: "Inclua a identificação já no projeto e confira na entrega da obra. Torneiras de jardim e pontos acessíveis a crianças merecem destaque extra. É a barreira de informação que acompanha o sistema por toda a sua vida útil — barata de instalar, cara de esquecer." },
        {
          tipo: "prancha",
          titulo: "Identificação água não potável",
          desenho: {
            legenda: "Placas e etiquetas em reservatório, registros e torneiras; mensagem clara e durável.",
            primitivas: [
              { t: "retangulo", p: [40, 60], w: 90, h: 60, cor: "destaque" },
              { t: "rotulo", p: [48, 50], texto: "AGUA NAO POTAVEL" },
              { t: "rotulo", p: [60, 92], texto: "reservatorio" },
              { t: "circulo", c: [200, 80], r: 16 },
              { t: "rotulo", p: [178, 108], texto: "torneira etiquetada" },
              { t: "rotulo", p: [178, 64], texto: "!" },
              { t: "retangulo", p: [150, 140], w: 110, h: 24, hachura: true },
              { t: "rotulo", p: [156, 156], texto: "registro identificado" },
            ],
          },
        },
      ],
    },
    {
      id: "mobilizacao-engenheiro",
      titulo: "Quem assina o projeto",
      blocos: [
        { tipo: "texto", texto: "Reunindo o capítulo: há um ponto em que o projeto deixa de ser estudo e vira responsabilidade técnica. O projeto hidráulico do sistema, a verificação de que as redes não se cruzam, o dimensionamento da bomba e da estrutura, e, quando exigido, o aproveitamento para fins regulados, pedem um profissional habilitado com ART (Anotação de Responsabilidade Técnica). É ele quem responde, legalmente, pela segurança do sistema." },
        {
          tipo: "mobilizacao",
          papel: "Engenheiro responsável pelo projeto hidrossanitário (com ART)",
          porque: "Dimensionar as instalações, garantir a separação entre rede potável e não potável e assinar o projeto são atos de responsabilidade técnica. Executar sem projeto assinado arrisca saúde (ligação cruzada) e descumpre as normas.",
          entregaEsperada: "Projeto hidrossanitário do sistema de aproveitamento (plantas, memorial de cálculo com o método de dimensionamento justificado, detalhes de separação de redes e sinalização) com ART emitida.",
          gerenciadoPor: "zaeon",
        },
        {
          tipo: "licao",
          pergunta: "O que é a ART no contexto do projeto?",
          alternativas: [
            "Uma marca comercial de reservatórios",
            "A Anotação de Responsabilidade Técnica, pela qual o profissional habilitado responde pelo projeto",
            "Um tipo de filtro de água",
          ],
          correta: 1,
          explicacao: "A ART registra a responsabilidade técnica do profissional pelo projeto ou obra. É ela que formaliza quem responde pela segurança e conformidade do sistema.",
        },
      ],
    },

    // ===================== CAPÍTULO 8 — EXECUÇÃO DA OBRA =====================
    {
      id: "planejar-obra",
      titulo: "Planejar a execução",
      blocos: [
        { tipo: "texto", texto: "Com o projeto assinado, planeje a obra na ordem que evita retrabalho: primeiro a base e o reservatório (a peça maior), depois calhas e condutores, em seguida descarte e filtro, por fim a bomba e a rede de distribuição com a sinalização. Liste materiais pelo projeto, separe as ferramentas e combine quem faz o quê. Uma obra pequena some dias quando falta um material no meio do caminho." },
        { tipo: "texto", texto: "Reserve um momento de verificação ao fim de cada etapa: a base está nivelada? a calha tem a inclinação certa? o descarte esvazia? É mais barato corrigir cada peça na hora do que depois de tudo montado. Fotografe o antes de fechar valas e paredes — esse registro vale ouro em manutenção futura." },
        { tipo: "diagrama", titulo: "Sequência da obra", codigo: `flowchart LR
  B["Base + reservatorio"] --> C["Calhas + condutores"]
  C --> D["Descarte + filtro"]
  D --> E["Bomba + rede + sinalizacao"]
  E --> T["Teste e comissionamento"]` },
        { tipo: "tarefas", itens: [
          { id: "lista-obra", titulo: "Monte a lista e o cronograma", entrega: "Liste os materiais pelo projeto e organize a obra em etapas com um ponto de verificação ao fim de cada uma. Defina quem executa cada parte." },
        ] },
      ],
    },
    {
      id: "instalar-calhas",
      titulo: "Instalar calhas e condutores",
      blocos: [
        { tipo: "texto", texto: "Fixe a calha com a inclinação de projeto rumo às descidas, sem barrigas que empocem água. Os condutores verticais descem alinhados e os horizontais seguem com caimento até o descarte. Na entrada dos condutores, instale a grade ou tela contra folhas. Vede bem as emendas: vazamento de calha é perda de água captada e mancha na fachada." },
        { tipo: "texto", texto: "Confira o percurso completo jogando água no telhado ou na calha e observando se ela corre sem transbordar e chega ao ponto previsto. Esse teste simples, feito antes de ligar ao reservatório, revela erros de inclinação enquanto ainda é fácil corrigir." },
        { tipo: "tarefas", itens: [
          { id: "teste-calha", titulo: "Teste o escoamento da calha", entrega: "Despeje água na calha e observe: ela escorre para a descida sem empoçar? chega ao condutor? Corrija inclinações antes de seguir." },
        ] },
      ],
    },
    {
      id: "construir-reservatorio-concreto",
      titulo: "Reservatório de concreto e impermeabilização",
      blocos: [
        { tipo: "texto", texto: "Para grandes volumes, o reservatório de concreto (moldado no local ou pré-moldado) exige base bem compactada, armadura e impermeabilização interna cuidadosa — é ela que impede a água de vazar e o solo de infiltrar. A cura do concreto e a estanqueidade são pontos críticos: concreto mal curado trinca e vaza. A execução estrutural de um reservatório grande não é tarefa amadora." },
        { tipo: "texto", texto: "Antes do primeiro uso, lave bem o interior para retirar resíduos de obra e verifique a estanqueidade (próxima página). A impermeabilização deve ser compatível com contato com água e, para usos mais exigentes, atóxica. Registre o traço do concreto e o produto impermeabilizante usados, para manutenção futura." },
        {
          tipo: "mobilizacao",
          papel: "Equipe/pedreiro especializado em reservatório de concreto e impermeabilização",
          porque: "A estanqueidade e a segurança de um reservatório de concreto de grande volume dependem de armadura, cura e impermeabilização corretas. Falha aqui causa vazamento estrutural, infiltração e risco à edificação.",
          entregaEsperada: "Reservatório executado conforme projeto estrutural, com impermeabilização aplicada, cura adequada e teste de estanqueidade aprovado, com registro do traço e dos materiais.",
          gerenciadoPor: "zaeon",
        },
      ],
    },
    {
      id: "instalar-polietileno",
      titulo: "Instalar reservatório pronto (polietileno)",
      blocos: [
        { tipo: "texto", texto: "A cisterna de polietileno pronta é o caminho mais rápido para residências. Para a enterrada, abra a cava com folga, faça base de concreto nivelada e reaterre com material adequado, em camadas, para não amassar as paredes; proteja contra a flutuação quando vazia. Para a apoiada, garanta base plana e firme que suporte o peso cheio. Siga as instruções do fabricante — elas definem a garantia." },
        { tipo: "texto", texto: "Posicione as conexões (entrada, extravasor, saída, respiro) conforme o projeto e coloque tela em todas as aberturas contra insetos. A cisterna enterrada precisa de tampa de inspeção acessível e segura, que impeça queda de pessoas e animais e a entrada de luz. Nunca enterre sem deixar como abrir para limpar." },
        {
          tipo: "prancha",
          titulo: "Cisterna enterrada: base, reaterro e tampa",
          desenho: {
            legenda: "Base de concreto nivelada, reaterro em camadas, proteção contra flutuação e tampa de inspeção acessível.",
            primitivas: [
              { t: "linha", de: [20, 70], ate: [285, 70], cor: "tinta" },
              { t: "rotulo", p: [24, 62], texto: "nivel do solo" },
              { t: "retangulo", p: [90, 80], w: 120, h: 90, cor: "destaque" },
              { t: "rotulo", p: [120, 128], texto: "cisterna" },
              { t: "retangulo", p: [80, 170], w: 140, h: 14, hachura: true },
              { t: "rotulo", p: [100, 192], texto: "base de concreto" },
              { t: "retangulo", p: [130, 64], w: 40, h: 16 },
              { t: "rotulo", p: [174, 74], texto: "tampa de inspecao" },
              { t: "rotulo", p: [40, 110], texto: "reaterro" },
              { t: "rotulo", p: [220, 110], texto: "em camadas" },
            ],
          },
        },
      ],
    },
    {
      id: "ligar-descarte-filtro",
      titulo: "Montar descarte e filtro",
      blocos: [
        { tipo: "texto", texto: "Instale o dispositivo de descarte da primeira água no ponto previsto, com o volume calculado e o dreno calibrado para esvaziar em algumas horas. Em seguida, o filtro, acessível para limpeza. Teste: na primeira chuva (ou simulando com mangueira), confira se o descarte enche e só então a água segue limpa ao filtro e ao reservatório. Ajuste o dreno se ele esvaziar rápido demais ou de menos." },
        { tipo: "texto", texto: "Marque no sistema, com etiqueta, a periodicidade de limpeza de cada peça. Deixe o caminho da água visível e desmontável nos pontos de manutenção. Um pré-tratamento bem montado é o que faz a diferença entre uma cisterna que se cuida sozinha quase o ano todo e uma que vive suja." },
        { tipo: "tarefas", itens: [
          { id: "teste-descarte", titulo: "Comissione o descarte", entrega: "Simule uma chuva e verifique: o descarte enche com o volume previsto? desvia a água limpa depois? o dreno esvazia em algumas horas? Ajuste e registre." },
        ] },
      ],
    },
    {
      id: "teste-estanqueidade",
      titulo: "Teste de estanqueidade e comissionamento",
      blocos: [
        { tipo: "texto", texto: "Antes de colocar o sistema para valer, teste a estanqueidade: encha o reservatório e observe por alguns dias se o nível cai além da evaporação — queda indica vazamento. Verifique todas as conexões, o extravasor (jogando água até transbordar, para ver se o ladrão dá conta) e a bomba (vazão e pressão nos pontos de uso). Esse comissionamento é a prova real do projeto." },
        { tipo: "texto", texto: "Documente o comissionamento: o que foi testado, o resultado e as correções. É o atestado de que o sistema entrega o que o projeto prometeu. Só depois de aprovado, libere para uso e inicie o calendário de manutenção. Entregar sem testar é terceirizar a descoberta dos defeitos para o usuário." },
        {
          tipo: "licao",
          pergunta: "No teste de estanqueidade, o que indica um vazamento?",
          alternativas: [
            "O reservatório transbordar na chuva",
            "O nível cair além do esperado pela evaporação, com o sistema fechado",
            "A bomba fazer barulho",
          ],
          correta: 1,
          explicacao: "Com o reservatório cheio e fechado, uma queda de nível maior que a evaporação revela vazamento em parede ou conexão. É o teste a fazer antes de liberar o uso.",
        },
      ],
    },
    {
      id: "video-construir",
      titulo: "Vídeo: construir a cisterna",
      blocos: [
        { tipo: "texto", texto: "Para ver a montagem de ponta a ponta, acompanhe um vídeo que mostra a construção de uma cisterna para armazenar água da chuva. Observe as etapas de base, instalação e ligações, e compare com a sequência que planejamos — o que o vídeo faz igual e o que você faria diferente no seu caso." },
        { tipo: "video", titulo: "Como construir uma cisterna para armazenar água da chuva", youtube: "AJ8uKAOqRao" },
        { tipo: "tarefas", itens: [
          { id: "comparar-obra", titulo: "Compare com o seu plano", entrega: "Liste três coisas que o vídeo faz e que você vai adotar, e uma que faria diferente por causa do seu projeto (volume, espaço ou material)." },
        ] },
      ],
    },
    {
      id: "mobilizacao-eletricista",
      titulo: "A ligação elétrica da bomba",
      blocos: [
        { tipo: "texto", texto: "A bomba precisa de ligação elétrica segura: circuito dimensionado, proteção (disjuntor e DR), aterramento e, idealmente, comando automático. Água e eletricidade juntas exigem cuidado redobrado — instalação elétrica malfeita perto de reservatório é risco de choque. Essa é uma etapa de profissional habilitado, não de improviso com extensão." },
        {
          tipo: "mobilizacao",
          papel: "Eletricista habilitado",
          porque: "A ligação elétrica da bomba envolve circuito dedicado, proteções (disjuntor, dispositivo DR), aterramento e, muitas vezes, comando automático, em ambiente úmido. Executar por conta própria arrisca choque, incêndio e queima do equipamento.",
          entregaEsperada: "Circuito da bomba instalado com proteção e aterramento adequados, comando de acionamento funcional e teste de operação, conforme as normas de instalações elétricas de baixa tensão.",
          gerenciadoPor: "zaeon",
        },
        {
          tipo: "licao",
          pergunta: "Por que a ligação elétrica da bomba deve ser feita por eletricista habilitado?",
          alternativas: [
            "Para economizar energia",
            "Porque envolve proteções, aterramento e ambiente úmido, com risco de choque e incêndio se malfeita",
            "Porque a bomba não funciona sem autorização",
          ],
          correta: 1,
          explicacao: "Eletricidade perto de água exige circuito protegido e aterrado, feito com segurança. Instalação amadora arrisca choque, incêndio e dano ao equipamento.",
        },
      ],
    },

    // ===================== CAPÍTULO 9 — OPERAÇÃO E MANUTENÇÃO =====================
    {
      id: "plano-manutencao",
      titulo: "O plano de manutenção",
      blocos: [
        { tipo: "texto", texto: "Cisterna é sistema vivo: sem manutenção, entope, suja e perde qualidade. Monte um calendário simples com periodicidades: grade e calhas, inspeção frequente (e sempre após tempestade com muita folha); filtro e descarte, limpeza periódica; reservatório, limpeza completa a cada seis meses (ou conforme a sujeira observada). Anote cada manutenção feita — o histórico mostra se algo está sujando rápido demais e por quê." },
        { tipo: "diagrama", titulo: "Calendário de manutenção", codigo: `flowchart TD
  F["Frequente: grade e calhas (e pos-tempestade)"] --> M["Periodico: filtro e descarte"]
  M --> S["Semestral: limpeza do reservatorio"]
  S --> R["Registro de cada manutencao"]
  R --> A["Ajuste do calendario pela sujeira observada"]` },
        { tipo: "tarefas", itens: [
          { id: "calendario", titulo: "Crie seu calendário", entrega: "Monte a tabela de manutenção com item, o que fazer e a periodicidade. Cole-a perto do reservatório e deixe espaço para anotar a data de cada serviço." },
        ] },
      ],
    },
    {
      id: "limpeza-calhas",
      titulo: "Limpeza de calhas, grade e filtro",
      blocos: [
        { tipo: "texto", texto: "Calha e grade entopem com folhas, principalmente em épocas de vento e queda de folhagem. Remova os detritos, confira se a água volta a correr e cheque as emendas. O filtro deve ser aberto e lavado conforme o calendário; filtro saturado reduz a vazão e deixa passar sujeira. O descarte da primeira água acumula sedimento no fundo: limpe-o para que continue funcionando." },
        { tipo: "texto", texto: "Essas limpezas, frequentes e rápidas, são o que mantém o reservatório limpo por mais tempo. A lógica é simples: sujeira barrada na calha e no filtro é sujeira que não chega ao reservatório. Pouco esforço aqui poupa a limpeza pesada lá dentro." },
        { tipo: "tarefas", itens: [
          { id: "limpar-pre", titulo: "Faça a ronda do pré-tratamento", entrega: "Limpe grade, filtro e o fundo do descarte. Anote a data e observe se algum item sujou mais rápido que o esperado — isso aponta um problema a corrigir." },
        ] },
      ],
    },
    {
      id: "limpeza-reservatorio",
      titulo: "Limpeza do reservatório",
      blocos: [
        { tipo: "texto", texto: "A limpeza completa do reservatório (em geral a cada seis meses) remove o lodo que se deposita no fundo. O procedimento: esvaziar, remover o sedimento, lavar as paredes, enxaguar e, se for o caso, desinfetar antes de voltar a encher. Em reservatórios enterrados ou grandes, atenção à segurança do espaço confinado — falta de oxigênio e gases exigem cuidado; nunca entre sozinho sem ventilar e sem alguém acompanhando." },
        { tipo: "texto", texto: "Aproveite a limpeza para inspecionar: paredes íntegras? telas das aberturas inteiras? conexões sem vazamento? É o momento de pegar problemas cedo. Registre o que encontrou. Água armazenada por muito tempo sem renovação pode ganhar qualidade pior — se a cisterna fica cheia e parada, considere destinar um uso que a mantenha circulando." },
        {
          tipo: "prancha",
          titulo: "Rotina de limpeza do reservatório",
          desenho: {
            legenda: "Esvaziar, remover o lodo do fundo, lavar paredes, inspecionar telas e conexões, enxaguar e reabastecer.",
            primitivas: [
              { t: "circulo", c: [40, 60], r: 18, cor: "destaque" },
              { t: "rotulo", p: [28, 92], texto: "1 esvaziar" },
              { t: "circulo", c: [110, 60], r: 18, cor: "destaque" },
              { t: "rotulo", p: [92, 92], texto: "2 remover lodo" },
              { t: "circulo", c: [180, 60], r: 18, cor: "destaque" },
              { t: "rotulo", p: [166, 92], texto: "3 lavar" },
              { t: "circulo", c: [250, 60], r: 18, cor: "destaque" },
              { t: "rotulo", p: [230, 92], texto: "4 inspecionar" },
              { t: "seta", de: [58, 60], ate: [92, 60], cor: "suave" },
              { t: "seta", de: [128, 60], ate: [162, 60], cor: "suave" },
              { t: "seta", de: [198, 60], ate: [232, 60], cor: "suave" },
              { t: "rotulo", p: [90, 150], texto: "5 enxaguar e reabastecer" },
            ],
          },
        },
      ],
    },
    {
      id: "video-limpeza",
      titulo: "Vídeo: limpar a cisterna",
      blocos: [
        { tipo: "texto", texto: "Veja na prática a limpeza e higienização de uma cisterna. Observe os cuidados de segurança, a remoção do sedimento e a inspeção das paredes. Atenção redobrada a reservatórios enterrados: são espaço confinado, com risco real; nunca improvise." },
        { tipo: "video", titulo: "Limpeza e higienização de cisterna subterrânea", youtube: "bZDLkX3vjag" },
        { tipo: "video", titulo: "Limpeza e impermeabilização de cisterna", youtube: "lkuBuogY4BQ" },
        { tipo: "tarefas", itens: [
          { id: "seguranca-limpeza", titulo: "Liste seus cuidados de segurança", entrega: "Anote os cuidados que você vai adotar na limpeza do seu reservatório, em especial se for enterrado: ventilação, acompanhamento de outra pessoa e proibição de entrar sozinho." },
        ] },
      ],
    },
    {
      id: "qualidade-agua",
      titulo: "Monitorar a qualidade da água",
      blocos: [
        { tipo: "texto", texto: "Mesmo para usos não potáveis, vale acompanhar a qualidade: água límpida, sem cheiro ruim, sem crescimento visível. Sinais de alerta são turbidez persistente, odor e proliferação de algas (indica entrada de luz). Para certos usos (lavagem de roupa, por exemplo, ou onde haja contato), pode-se fazer uma desinfecção simples, como cloração controlada, conforme orientação técnica. Nada disso torna a água potável — é higiene do uso não potável." },
        { tipo: "texto", texto: "Se surgir dúvida sobre a adequação da água a um uso mais sensível, a resposta honesta é a análise laboratorial, não o palpite. O bloco de mobilização do laboratório, lá no capítulo de normas, atende exatamente a isso. Monitorar é barato; adoecer alguém por água malcuidada, caríssimo." },
        {
          tipo: "licao",
          pergunta: "Água da cisterna com algas verdes indica, mais provavelmente:",
          alternativas: [
            "Que a água virou potável",
            "Entrada de luz no reservatório — é preciso vedar contra luminosidade",
            "Que a bomba está forte demais",
          ],
          correta: 1,
          explicacao: "Algas precisam de luz. Crescimento verde aponta entrada de luminosidade no reservatório; a correção é vedar contra a luz e limpar. Reservatório no escuro previne o problema.",
        },
      ],
    },
    {
      id: "seguranca-mosquito",
      titulo: "Segurança: dengue e afogamento",
      blocos: [
        { tipo: "texto", texto: "Dois riscos exigem vigilância permanente. O primeiro é o Aedes aegypti: reservatório e qualquer recipiente de água parada podem virar criadouro. Mantenha tudo tampado e telado, sem poças ao redor, sem calha empoçada. O segundo é o afogamento: reservatórios e cisternas abertas são risco grave para crianças e animais. Tampa segura, que não dá para abrir sozinha nem cair dentro, é obrigatória." },
        { tipo: "texto", texto: "Esses cuidados não são extras: são parte do sistema. Uma cisterna bem feita, mas destampada, troca a economia de água por um problema de saúde pública e um risco de acidente. Inclua a inspeção de tampas e telas na ronda de manutenção, toda vez." },
        {
          tipo: "prancha",
          titulo: "Tampado, telado, sem poça",
          desenho: {
            legenda: "Tampa segura contra queda, tela anti-mosquito em todas as aberturas e entorno sem água parada.",
            primitivas: [
              { t: "retangulo", p: [90, 80], w: 120, h: 80, cor: "destaque" },
              { t: "rotulo", p: [120, 124], texto: "reservatorio" },
              { t: "linha", de: [86, 80], ate: [214, 80], cor: "tinta" },
              { t: "rotulo", p: [110, 70], texto: "tampa segura" },
              { t: "retangulo", p: [130, 66], w: 40, h: 14, hachura: true },
              { t: "rotulo", p: [174, 74], texto: "tela anti-mosquito" },
              { t: "linha", de: [20, 170], ate: [285, 170], cor: "suave" },
              { t: "rotulo", p: [24, 184], texto: "entorno seco, sem pocas" },
            ],
          },
        },
      ],
    },
    {
      id: "registro-operacao",
      titulo: "Registro e indicadores",
      blocos: [
        { tipo: "texto", texto: "Mantenha um caderno (ou planilha) de operação: nível do reservatório ao longo do tempo, quantas vezes faltou água e precisou recorrer à rede, manutenções feitas e problemas observados. Esses registros viram indicadores: se o reservatório vive cheio e transbordando, ele é grande demais ou há demanda a aproveitar; se vive seco, é pequeno demais ou a chuva foi atípica." },
        { tipo: "texto", texto: "Com um ano de dados, você pode calcular quanto de água potável foi economizada e comparar com a previsão de projeto. O sistema real quase sempre ensina ajustes: mudar um uso para a cisterna, aumentar o descarte, melhorar o filtro. Operar com registro é o que transforma a cisterna de instalação em ferramenta afinada." },
        { tipo: "tarefas", itens: [
          { id: "indicadores", titulo: "Abra seu registro de operação", entrega: "Crie a planilha de operação com colunas para data, nível aproximado, uso de reforço da rede e manutenção. Depois de alguns meses, calcule a economia de água e compare com o projeto." },
        ] },
      ],
    },

    // ===================== CAPÍTULO 10 — CASOS REAIS E ECONOMIA =====================
    {
      id: "caso-semiarido",
      titulo: "Caso: cisternas do semiárido",
      blocos: [
        { tipo: "texto", texto: "O maior programa de captação de água de chuva do Brasil nasceu no semiárido. O Programa Um Milhão de Cisternas (P1MC), articulado pela ASA (Articulação Semiárido Brasileiro), levou cisternas de placas de concreto (em torno de 16 mil litros) a famílias rurais, captando a água do telhado para a estiagem. O dimensionamento ali parte da chuva curta e concentrada e da demanda de uma família — exatamente o triângulo deste caderno, num clima duro." },
        { tipo: "texto", texto: "A lição do semiárido é potente: onde chove pouco e concentrado, o reservatório é a diferença entre ter e não ter água no período seco. Mostra também que tecnologia social, barata e replicável, resolve em escala. E reforça a importância da manutenção e da gestão comunitária para o sistema durar. Vale estudar o modelo mesmo em climas mais chuvosos." },
        { tipo: "diagrama", titulo: "Lógica da cisterna do semiárido", codigo: `flowchart LR
  Ch["Chuva curta e concentrada"] --> Cap["Capta no telhado"]
  Cap --> Res["Cisterna ~16 mil L"]
  Res --> Seca["Atravessa a estiagem"]
  Seca --> Fam["Agua para a familia"]` },
      ],
    },
    {
      id: "caso-urbano",
      titulo: "Caso: aproveitamento urbano",
      blocos: [
        { tipo: "texto", texto: "Na cidade, o aproveitamento costuma mirar descarga sanitária e áreas comuns de prédios, escolas e indústrias, onde a demanda não potável é grande e constante. Nesses casos, a conta fecha mais rápido: muita descarga por dia, telhado grande, e a economia aparece na fatura. Muitos municípios, por lei, já exigem reservatório de aproveitamento ou retenção nessas construções, somando economia e controle de enchente." },
        { tipo: "texto", texto: "O desafio urbano é a qualidade (telhado na cidade pega mais poluição) e a separação rigorosa das redes, com muita gente usando o sistema. Por isso o projeto urbano investe pesado em pré-tratamento, sinalização e manutenção programada. É o terreno onde o profissional responsável e o registro de operação mais importam." },
        {
          tipo: "licao",
          pergunta: "Por que o aproveitamento de água de chuva costuma ter melhor retorno em prédios, escolas e indústrias?",
          alternativas: [
            "Porque a água da chuva é mais limpa na cidade",
            "Porque há grande demanda não potável constante (muitas descargas) e telhado grande",
            "Porque não precisam de manutenção",
          ],
          correta: 1,
          explicacao: "Demanda não potável alta e constante, com área de captação grande, faz o reservatório trabalhar cheio e a economia aparecer rápido. A manutenção continua essencial.",
        },
      ],
    },
    {
      id: "economia-payback",
      titulo: "Economia e tempo de retorno",
      blocos: [
        { tipo: "texto", texto: "Para avaliar se vale a pena, calcule a economia anual: volume de água da chuva efetivamente usado por ano × tarifa de água (e esgoto, quando cobrado sobre o consumo) que você deixa de pagar. Divida o custo total do sistema por essa economia anual e você tem o tempo de retorno (payback) em anos. Inclua no custo a bomba, a energia e a manutenção — são despesas reais que esticam o retorno." },
        { tipo: "texto", texto: "No exemplo do caderno, se a cisterna substitui cerca de 100 m³/ano de água tarifada, a economia é 100 × (tarifa de água + esgoto evitados). Sistemas simples, com telhado e demanda bem casados, costumam ter retorno de poucos anos; sistemas com bomba e muita obra demoram mais. O payback é a régua honesta: mostra quando a economia paga o investimento." },
        {
          tipo: "prancha",
          titulo: "Custo acumulado x economia acumulada",
          desenho: {
            legenda: "A economia acumulada sobe com o tempo; onde cruza o custo do sistema está o payback.",
            primitivas: [
              { t: "linha", de: [28, 170], ate: [285, 170], cor: "tinta" },
              { t: "linha", de: [28, 170], ate: [28, 20], cor: "tinta" },
              { t: "rotulo", p: [30, 14], texto: "R$" },
              { t: "rotulo", p: [250, 182], texto: "anos" },
              { t: "linha", de: [28, 70], ate: [285, 70], cor: "suave" },
              { t: "rotulo", p: [210, 62], texto: "custo do sistema" },
              { t: "linha", de: [28, 168], ate: [240, 40], cor: "destaque" },
              { t: "rotulo", p: [180, 44], texto: "economia acum." },
              { t: "circulo", c: [150, 70], r: 5, cor: "tinta" },
              { t: "rotulo", p: [128, 84], texto: "payback" },
            ],
          },
        },
        { tipo: "tarefas", itens: [
          { id: "calc-payback", titulo: "Calcule seu payback", entrega: "Estime a economia anual (volume usado × tarifa evitada) e divida o custo do sistema por ela. Anote o tempo de retorno e diga se, para você, ele justifica o investimento." },
        ] },
      ],
    },
    {
      id: "erros-comuns",
      titulo: "Erros comuns (e como evitar)",
      blocos: [
        { tipo: "texto", texto: "Os tropeços se repetem. Superdimensionar por usar coeficiente de aproveitamento 1,0 ou só o método de Rippl: dinheiro parado numa caixa grande demais. Subdimensionar ignorando os meses secos: cisterna que seca sempre. Esquecer o descarte da primeira água: reservatório sujo e manutenção pesada. Não telar as aberturas: dengue. E o mais grave, interligar as redes potável e não potável: risco sanitário sério." },
        { tipo: "texto", texto: "A prevenção é tudo o que o caderno defendeu: medir a chuva e a demanda, comparar métodos e escolher pela confiabilidade, caprichar no pré-tratamento, telar e tampar, separar e sinalizar as redes, e chamar o profissional onde a lei exige. Cada erro acima tem uma página antes que o previne." },
        {
          tipo: "licao",
          pergunta: "Qual é o erro mais grave de um sistema de água de chuva?",
          alternativas: [
            "Usar reservatório um pouco maior que o necessário",
            "Interligar a rede não potável com a rede de água potável (ligação cruzada)",
            "Limpar o filtro com frequência",
          ],
          correta: 1,
          explicacao: "A ligação cruzada pode levar água não potável à torneira de beber — risco sanitário sério. Por isso as redes são separadas, identificadas e, se houver reforço da rede, feito com separação atmosférica.",
        },
      ],
    },
    {
      id: "video-projeto",
      titulo: "Vídeo: projetar o reaproveitamento",
      blocos: [
        { tipo: "texto", texto: "Para fechar com uma visão de conjunto, veja um vídeo sobre como projetar o reaproveitamento de água da chuva, costurando captação, armazenamento e uso. Use-o para revisar se o seu projeto cobriu todas as etapas que percorremos." },
        { tipo: "video", titulo: "Como projetar reaproveitamento de água da chuva?", youtube: "d9MHrg6ppQQ" },
        { tipo: "tarefas", itens: [
          { id: "revisar-projeto", titulo: "Revise seu projeto inteiro", entrega: "Confira, item a item, se o seu projeto tem: dados de chuva, área, demanda, volume justificado, calhas, descarte, filtro, reservatório, bomba, redes separadas e sinalizadas, e plano de manutenção. Marque o que ainda falta." },
        ] },
      ],
    },

    // ===================== CAPÍTULO 11 — RECURSOS E SÍNTESE =====================
    {
      id: "checklist-final",
      titulo: "Checklist do projeto",
      blocos: [
        { tipo: "texto", texto: "Antes de dar o projeto por pronto, passe por este checklist. Ele reúne, em forma de verificação, tudo o que o caderno pediu — do dado de chuva à sinalização. Um item em aberto é um risco adiado; resolva-o agora, enquanto ainda é projeto, e não depois, quando virou obra." },
        { tipo: "tarefas", itens: [
          { id: "ck-dados", titulo: "Dados do local reunidos", entrega: "Chuva mensal e anual, meses secos (T), área de captação, coeficiente C e demanda diária, todos registrados e com fonte." },
          { id: "ck-volume", titulo: "Volume justificado", entrega: "Volume final definido por comparação de métodos e confiabilidade, respeitando o mínimo legal do município, com justificativa escrita." },
          { id: "ck-componentes", titulo: "Componentes dimensionados", entrega: "Calhas e condutores (NBR 10844), grade, descarte da primeira água, filtro, reservatório, bomba e extravasor, todos no projeto." },
          { id: "ck-seguranca", titulo: "Segurança e redes", entrega: "Redes potável e não potável separadas e sinalizadas, aberturas teladas, tampas seguras, e eventual reforço da rede por separação atmosférica." },
          { id: "ck-profissional", titulo: "Responsáveis mobilizados", entrega: "Profissionais habilitados acionados onde a lei exige: projeto com ART, estrutura, elétrica da bomba e, se necessário, análise de água." },
          { id: "ck-manutencao", titulo: "Plano de manutenção pronto", entrega: "Calendário de manutenção e registro de operação definidos antes da entrega do sistema." },
        ] },
      ],
    },
    {
      id: "recursos-abertos",
      titulo: "Caixa de ferramentas aberta",
      blocos: [
        { tipo: "texto", texto: "Para seguir além deste caderno, guarde estes recursos abertos: normas, datasets, órgãos oficiais e estudos revisados. Antes de projetar de verdade, baixe os dados do seu local e confirme sempre a edição vigente de cada norma na ABNT, na ANA e na sua prefeitura, porque normas e leis são atualizadas." },
        { tipo: "fontes", titulo: "Recursos para continuar", itens: [
          { titulo: "ABNT — Catálogo de normas (NBR 15527, 10844, 16783, 5626)", url: "https://www.abntcatalogo.com.br/", tipo: "norma", nota: "Textos oficiais das normas de água de chuva, pluviais e potável." },
          { titulo: "INMET — Normais Climatológicas", url: "https://portal.inmet.gov.br/normais", tipo: "dataset", nota: "Chuva média mensal e anual por estação." },
          { titulo: "ANA — Agência Nacional de Águas e Saneamento Básico", url: "https://www.gov.br/ana/pt-br", tipo: "site", nota: "Recursos hídricos, manuais e dados (HidroWeb/SNIRH)." },
          { titulo: "SNIRH — Séries e metadados hidrológicos", url: "https://metadados.snirh.gov.br/geonetwork/srv/api/records", tipo: "dataset", nota: "Postos pluviométricos com séries diárias." },
          { titulo: "Portaria GM/MS 888/2021 — padrão de potabilidade", url: "https://ses.sp.bvs.br/wp-content/uploads/2021/05/U_PT-MS-GM-888_040521.pdf", tipo: "norma", nota: "Define a fronteira do que é água potável." },
          { titulo: "Orientações técnicas SCAAC (Prefeitura de Londrina)", url: "https://repositorio.londrina.pr.gov.br/index.php/menu-ambiente/dca/captacao-e-aproveitamento-de-agua-1/76316-orientacoes-tecnicas-scaac/file", tipo: "artigo", nota: "Guia municipal com a equação de captação e requisitos." },
        ] },
        { tipo: "tarefas", itens: [
          { id: "baixar-local", titulo: "Baixe os dados do seu local", entrega: "Salve a chuva da estação INMET mais próxima e verifique a lei de água de chuva da sua cidade. Anexe ambos ao seu projeto." },
        ] },
      ],
    },
    {
      id: "fontes-metodos",
      titulo: "Fontes: os métodos de cálculo",
      blocos: [
        { tipo: "texto", texto: "As referências que sustentam as fórmulas dos seis métodos e as comparações entre eles. Elas aplicam a NBR 15527 a dados reais e mostram a dispersão dos resultados discutida no Capítulo 5." },
        { tipo: "fontes", titulo: "Estudos sobre os métodos", itens: [
          { titulo: "Dimensionamento de reservatórios pelos métodos da NBR 15527 (Revista de Engenharia e Tecnologia, UEPG)", url: "https://revistas.uepg.br/index.php/ret/article/download/11440/209209209413/209209209982", tipo: "artigo", nota: "Traz as equações de Rippl, Azevedo Netto, alemão, inglês e simulação com exemplo." },
          { titulo: "O método de Rippl para dimensionamento de reservatórios (CONTECC/CONFEA)", url: "https://confea.org.br/midias/uploads-imce/contecc2016/civil/o%20m%C3%A9todo%20de%20rippl%20para%20dimensionamento%20de%20reservat%C3%B3rios%20de%20sistemas%20de%20aproveitamento%20da%20%C3%A1gua%20de%20chuva.pdf", tipo: "artigo", nota: "Discute por que Rippl tende a resultar nos maiores volumes." },
          { titulo: "Aproveitamento de água de chuva: análise comparativa de métodos (Ambiente & Água / SciELO)", url: "https://www.scielo.br/j/ac/a/qG5FpFbhNVjccQxRgHb9G3B/?format=pdf", tipo: "artigo", nota: "Compara os métodos e mostra a dispersão de volumes." },
          { titulo: "Aproveitamento de água de chuva: estudo de caso (TCC, UNILAB)", url: "https://repositorio.unilab.edu.br/jspui/bitstream/123456789/3307/1/FILIPE%20JOSE%20DE%20FARIAS%20E%20FREITAS%20TCC.pdf", tipo: "artigo", nota: "Aplica os seis métodos a um caso real e compara resultados." },
        ] },
        {
          tipo: "licao",
          pergunta: "Qual método tende a resultar nos maiores reservatórios, segundo os estudos?",
          alternativas: ["O método prático inglês", "O método de Rippl", "O método prático alemão"],
          correta: 1,
          explicacao: "Rippl dimensiona para nunca faltar água na série usada, somando o maior déficit acumulado. Por isso costuma dar os maiores volumes; os práticos (inglês e alemão) dão os menores.",
        },
      ],
    },
    {
      id: "compilado",
      titulo: "Prancha de síntese",
      blocos: [
        { tipo: "texto", texto: "Você percorreu o caminho inteiro: entendeu por que captar e o que a água da chuva pode atender, dominou as normas, leu a chuva e a demanda do seu local, calculou o volume captável, aplicou os seis métodos da NBR 15527 e escolheu o volume pela confiabilidade, projetou calhas, descarte, filtro, reservatório e bomba, executou com teste e comissionamento, montou a manutenção e avaliou a economia. Arraste os cards pelo carimbo para montar o projeto da sua cisterna na ordem que fizer sentido para o seu caso; abaixo da prancha, suas anotações e imagens aparecem na ordem das páginas. Lembre a regra do caderno: medir a chuva antes de comprar a caixa, comparar métodos antes de fixar o volume, caprichar no pré-tratamento, separar e sinalizar as redes, e chamar o profissional habilitado onde a lei e a segurança exigem." },
        { tipo: "compilado" },
      ],
    },
  ],
};
