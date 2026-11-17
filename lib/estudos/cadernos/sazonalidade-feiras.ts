import type { CadernoEstudo } from "../cadernosEstudo";

/**
 * Caderno de campo: Sazonalidade e preços em feiras livres.
 * Conteúdo com lastro: dados oficiais de preço (CONAB/PROHORT nas CEASAs, CEAGESP, CEPEA/ESALQ-Hortifruti),
 * estatística agrícola do IBGE (PAM, POF, IPCA via SIDRA) e índice internacional da FAO; método do índice
 * estacional por média móvel centrada de 12 meses (Barros, Economia da Comercialização Agrícola, CEPEA/ESALQ;
 * anais da UFPel; repositório da UFC sobre a Ceasa-CE; tutorial de decomposição de séries da DataCamp);
 * e evidência de campo sobre feiras da agricultura familiar (estudo da FAF de Seropédica na SciELO/RESR,
 * feira de São Francisco-MG). As etapas que pedem um profissional — validar o modelo estatístico e aferir
 * o calendário agrícola local — viram blocos de mobilização. Vídeos conferidos um a um antes de entrar.
 */
export const caderno: CadernoEstudo = {
  id: "sazonalidade-feiras",
  titulo: "Sazonalidade e preços em feiras livres",
  resumo:
    "Por que o tomate custa metade em um mês e o dobro em outro na mesma banca? Este caderno ensina a ler o calendário da safra, coletar preço com rigor, calcular o índice estacional por média móvel e virar isso em decisão para quem compra, vende ou planeja numa feira livre — sempre com dado oficial e fonte na mesma página.",
  paginas: [
    // ===================== CAPÍTULO 1 — CONTEXTO E VISÃO =====================
    {
      id: "abertura",
      titulo: "Como usar este caderno de campo",
      blocos: [
        { tipo: "texto", texto: "Este caderno acompanha quem quer entender, com número na mão, por que os preços de frutas, legumes e verduras sobem e descem ao longo do ano na feira livre — e como usar esse ritmo a favor de quem compra, de quem vende e de quem planeja o abastecimento. Cada página traz leitura curta, um desenho ou diagrama, tarefas práticas e a fonte que sustenta a afirmação. Nada aqui é chute: quando aparece um número, ele vem de um dataset oficial, de uma norma ou de um estudo citado na mesma página." },
        { tipo: "texto", texto: "A regra do caderno é simples: primeiro observe e registre o preço com método; depois separe o que é inflação do que é sazonalidade; só então calcule o índice estacional e decida. E quando o trabalho exigir validar um modelo estatístico ou aferir o calendário agrícola de uma região, a página mostra um campo de mobilização que chama o profissional certo — um economista agrícola, um estatístico ou um agrônomo — e acompanha até ficar pronto. Você lê, coleta, calcula e interpreta; o especialista confere o que precisa de carimbo técnico." },
        { tipo: "diagrama", titulo: "O percurso do caderno", codigo: `flowchart TD
  A["Contexto: por que o preço oscila"] --> B["Leitura do tema: safra, cadeia, oferta e demanda"]
  B --> C["Método: o que e como coletar"]
  C --> D["Cálculo: média móvel e índice estacional"]
  D --> E["Projeto: planilha e painel de decisão"]
  E --> F["Execução: ida a campo na feira"]
  F --> G["Manutenção: manter a série viva"]
  G --> H["Casos reais: tomate, feira familiar, leite"]
  H --> I["Recursos"]
  I --> J["Prancha de síntese"]` },
      ],
    },
    {
      id: "por-que-importa",
      titulo: "Por que o preço da feira oscila (e por que isso importa)",
      blocos: [
        { tipo: "texto", texto: "O preço de um hortifruti na feira não é um número aleatório: ele responde, mês a mês, a um calendário biológico. A planta tem época de plantio e de colheita, e isso faz a oferta inchar na safra e minguar na entressafra. Quando muita gente colhe ao mesmo tempo, o produto sobra e o preço cai; fora da época, falta oferta e o preço sobe. Esse vai e vem que se repete todo ano, no mesmo compasso, é a sazonalidade — o objeto deste caderno." },
        { tipo: "texto", texto: "Entender esse ritmo muda decisões reais. O consumidor que conhece a época da fruta compra mais barato e mais gostoso. O feirante que antecipa a entressafra ajusta compra e margem sem ser pego de surpresa. A cooperativa que lê a sazonalidade planeja plantio escalonado para não derrubar o próprio preço. E o gestor público que acompanha as CEASAs sabe quando um pico é só sazonal — e quando é um choque que merece atenção. Medir a sazonalidade é transformar um palpite de feirante experiente em dado que qualquer um pode repetir." },
        {
          tipo: "licao",
          pergunta: "O que caracteriza a sazonalidade de preços, e não um choque pontual?",
          alternativas: [
            "Uma alta isolada causada por uma geada que não se repete no mesmo mês todo ano",
            "Um padrão que se repete aproximadamente no mesmo período a cada ano, ligado ao ciclo de produção",
            "Qualquer variação de preço de um dia para o outro na banca",
          ],
          correta: 1,
          explicacao: "Sazonalidade é o componente que se repete em período fixo (geralmente anual), ligado ao calendário de safra e de consumo. Uma geada é um evento aleatório; a variação diária é ruído de curtíssimo prazo.",
        },
      ],
    },
    {
      id: "feira-livre-brasil",
      titulo: "A feira livre: onde a sazonalidade aparece na rua",
      blocos: [
        { tipo: "texto", texto: "A feira livre é o ponto em que o calendário da roça encontra a mesa da cidade. Em muitas feiras, sobretudo as da agricultura familiar, o produto é colhido na véspera ou na madrugada e vendido no mesmo dia. Isso faz da feira um termômetro sensível: quando um item entra na safra, ele aparece em abundância e barato nas bancas; quando sai, some ou encarece. A feira mostra à população urbana, de forma concreta, o efeito da entressafra — algo que estudos de caso em cidades do interior já documentaram." },
        { tipo: "texto", texto: "Mas a feira tem uma particularidade: o feirante não é um simples tomador de preço. Pesquisas sobre feiras da agricultura familiar mostram que ele define o preço olhando o mercado de referência (a CEASA), a concorrência da própria feira e a qualidade do que traz. Por isso, a sazonalidade na feira é um pouco mais amortecida que no atacado: a volatilidade de preços tende a ser menor, e o que mais varia com a estação costuma ser o faturamento — quanto se vende — mais do que o preço unitário." },
        { tipo: "video", titulo: "Feiras livres e a renda da agricultura familiar (Minas Gerais)", youtube: "TO5951x75k8" },
      ],
    },
    {
      id: "quem-usa",
      titulo: "Quem ganha ao ler a sazonalidade",
      blocos: [
        { tipo: "texto", texto: "Antes de medir, vale saber para quem o número serve. Cada papel usa o índice estacional de um jeito, e isso orienta o que você vai coletar e com que detalhe." },
        {
          tipo: "prancha",
          titulo: "Quatro olhares sobre o mesmo índice",
          desenho: {
            legenda: "O mesmo ritmo sazonal vira decisão diferente conforme quem lê: consumidor, feirante, cooperativa e gestor.",
            primitivas: [
              { t: "circulo", c: [60, 50], r: 26, cor: "tinta" },
              { t: "rotulo", p: [40, 52], texto: "Consumidor" },
              { t: "circulo", c: [180, 50], r: 26, cor: "tinta" },
              { t: "rotulo", p: [164, 52], texto: "Feirante" },
              { t: "circulo", c: [60, 140], r: 26, cor: "tinta" },
              { t: "rotulo", p: [42, 142], texto: "Cooperativa" },
              { t: "circulo", c: [180, 140], r: 26, cor: "tinta" },
              { t: "rotulo", p: [166, 142], texto: "Gestor" },
              { t: "retangulo", p: [230, 70], w: 66, h: 56, cor: "destaque" },
              { t: "rotulo", p: [236, 64], texto: "Índice" },
              { t: "rotulo", p: [236, 100], texto: "estacional" },
              { t: "seta", de: [86, 56], ate: [230, 86] },
              { t: "seta", de: [206, 58], ate: [232, 82] },
              { t: "seta", de: [86, 134], ate: [230, 110] },
              { t: "seta", de: [206, 132], ate: [232, 114] },
            ],
          },
        },
        {
          tipo: "tarefas",
          itens: [
            { id: "quem-1", titulo: "Defina seu papel", entrega: "Escreva em uma frase se você lê este caderno como consumidor, feirante, cooperativa ou gestor — isso define a decisão-alvo." },
            { id: "quem-2", titulo: "Escolha 3 produtos-foco", entrega: "Liste três hortifrútis que você observa na sua feira e quer entender (ex.: tomate, alface, banana)." },
            { id: "quem-3", titulo: "Escreva a pergunta de decisão", entrega: "Formule a pergunta que o índice vai responder (ex.: em que meses o tomate fica mais barato?)." },
          ],
        },
      ],
    },
    {
      id: "fontes-contexto",
      titulo: "Fontes: contexto e dados oficiais",
      blocos: [
        { tipo: "texto", texto: "Estes endereços sustentam o capítulo e servem de porta de entrada. Guarde-os: o caderno volta a eles no método e no cálculo. Todos são públicos e gratuitos." },
        { tipo: "fontes", titulo: "Panorama e estatística oficial", itens: [
          { titulo: "IBGE — Produção Agrícola Municipal (PAM)", url: "https://www.ibge.gov.br/estatisticas/economicas/agricultura-e-pecuaria/9117-producao-agricola-municipal-culturas-temporarias-e-permanentes.html", tipo: "dataset", nota: "Área, produção e valor por cultura e município: mostra onde e quando cada produto é produzido." },
          { titulo: "CONAB — PROHORT (Programa Brasileiro de Modernização do Mercado Hortigranjeiro)", url: "https://www.gov.br/conab/pt-br/atuacao/informacoes-agropecuarias/hortigranjeiros-prohort", tipo: "site", nota: "Preços diários e séries históricas das CEASAs; base nacional de hortigranjeiros." },
          { titulo: "FAO — Food Price Index (FFPI)", url: "https://www.fao.org/worldfoodsituation/foodpricesindex/en/", tipo: "dataset", nota: "Índice mensal internacional desde 1990 (nominal e real): referência de como se monta um índice de preços." },
          { titulo: "IBGE — Inflação / IPCA (Explica)", url: "https://www.ibge.gov.br/explica/inflacao.php", tipo: "site", nota: "O índice oficial de inflação; usado para deflacionar a série antes de medir sazonalidade." },
        ] },
        {
          tipo: "licao",
          pergunta: "Por que começar pelos dados da CEASA, e não só pela sua feira?",
          alternativas: [
            "Porque a feira não tem preço",
            "Porque a CEASA é o mercado de referência que o feirante usa para formar o preço, e tem série histórica longa e pública",
            "Porque o preço da CEASA é igual ao da feira",
          ],
          correta: 1,
          explicacao: "A CEASA (atacado) é a referência de precificação e oferece séries longas e abertas pelo PROHORT. A feira reflete essa referência com defasagem e margem, mas raramente tem histórico organizado.",
        },
      ],
    },
    // ===================== CAPÍTULO 2 — LEITURA DO TEMA =====================
    {
      id: "calendario-agricola",
      titulo: "O calendário da safra e da entressafra",
      blocos: [
        { tipo: "texto", texto: "A raiz da sazonalidade está na biologia da planta. Cada cultura tem uma janela de plantio e, meses depois, uma janela de colheita concentrada: a safra. Quando a colheita de uma região inteira coincide, o produto chega em volume às centrais e o preço cede. Passada a safra, vem a entressafra, quando a oferta vem só de regiões de clima diferente, de produção protegida (estufa) ou de estoque — e o preço reage para cima. A principal fonte de sazonalidade nos produtos agrícolas vem do lado da oferta, do comportamento biológico da produção." },
        { tipo: "texto", texto: "No Brasil, a diversidade de climas suaviza, mas não elimina, esse padrão: um mesmo produto pode ter safra no Sul em um mês e no Nordeste em outro, escalonando a oferta nacional. Por isso o calendário não é único — ele depende do produto e da praça. Montar o calendário da sua região, produto a produto, é o primeiro passo técnico deste caderno, e é exatamente o que um agrônomo ou extensionista local pode confirmar." },
        {
          tipo: "prancha",
          titulo: "Curva típica de oferta e preço ao longo do ano",
          desenho: {
            legenda: "Na safra, a oferta sobe e o preço desce; na entressafra, o inverso. As duas curvas tendem a ser espelhadas.",
            primitivas: [
              { t: "linha", de: [16, 170], ate: [292, 170], cor: "tinta" },
              { t: "linha", de: [16, 20], ate: [16, 170], cor: "tinta" },
              { t: "rotulo", p: [20, 12], texto: "oferta / preço" },
              { t: "rotulo", p: [250, 182], texto: "jan..dez" },
              { t: "curva", pts: [[20, 120], [70, 60], [120, 50], [170, 70], [220, 120], [288, 140]], cor: "destaque" },
              { t: "rotulo", p: [96, 40], texto: "oferta (safra)" },
              { t: "curva", pts: [[20, 70], [70, 120], [120, 140], [170, 120], [220, 70], [288, 55]], cor: "tinta" },
              { t: "rotulo", p: [200, 48], texto: "preço" },
            ],
          },
        },
      ],
    },
    {
      id: "safra-entressafra",
      titulo: "Safra, entressafra e o pico de preço",
      blocos: [
        { tipo: "texto", texto: "O índice estacional vai transformar essa curva em números: quanto, em média, o preço de cada mês fica acima ou abaixo do nível normal do ano. Um exemplo clássico ajuda a fixar: em estudos de preços de grãos, o milho no Rio Grande do Sul costuma ter os maiores preços em dezembro (plena entressafra) e os menores em março (auge da colheita). Para o leite, os preços tendem a cair na safra das águas e subir na entressafra seca. O produto muda, o mecanismo é o mesmo." },
        { tipo: "texto", texto: "Repare que safra e entressafra não são sinônimo de 'barato' e 'caro' para sempre: são posições relativas dentro do ano. O que o índice estacional entrega é o mapa desses meses, limpo da inflação e da tendência de longo prazo. Com ele, você deixa de dizer 'tomate costuma ser caro no inverno' e passa a dizer 'em julho o tomate fica, em média, 30% acima da média anual'." },
        {
          tipo: "licao",
          pergunta: "Em geral, quando o preço de um hortifruti atinge o pico sazonal?",
          alternativas: [
            "No auge da safra, quando há mais oferta",
            "Na entressafra, quando a oferta é menor",
            "O preço não tem relação com a época",
          ],
          correta: 1,
          explicacao: "Com menos oferta na entressafra e demanda relativamente estável, o preço tende ao pico. Na safra, o excesso de oferta puxa o preço para baixo.",
        },
      ],
    },
    {
      id: "cadeia-abastecimento",
      titulo: "Da roça à banca: a cadeia de abastecimento",
      blocos: [
        { tipo: "texto", texto: "Entre o pé de alface e a sacola do consumidor existe uma cadeia, e cada elo deixa marca no preço. O produtor colhe; muitas vezes o produto passa por uma CEASA (Central de Abastecimento), que concentra a oferta regional, forma o preço de atacado e abastece varejo e feirantes; daí vai para a banca da feira, onde ganha a margem do feirante. As CEASAs funcionam como hubs logísticos e são a principal porta de saída de hortaliças e frutas no país." },
        { tipo: "texto", texto: "Por que isso importa para a sazonalidade? Porque o sinal de preço nasce no atacado e chega à feira com defasagem e suavização. Quando a safra derruba o preço na CEASA, a feira acompanha dias depois; quando a entressafra aperta, a feira sente por último. Entender a cadeia evita um erro comum: atribuir à feira uma variação que, na verdade, veio do campo e do atacado." },
        { tipo: "diagrama", titulo: "A cadeia e onde o preço se forma", codigo: `flowchart LR
  P["Produtor / agricultura familiar"] --> C["CEASA (atacado): forma o preço de referência"]
  C --> V["Varejo / sacolão"]
  C --> F["Feirante"]
  P --> F
  F --> M["Mesa do consumidor"]
  V --> M` },
        { tipo: "video", titulo: "CEASA: como funciona uma central de abastecimento", youtube: "DMEWKqftxRk" },
      ],
    },
    {
      id: "oferta-demanda",
      titulo: "Oferta, demanda e a formação do preço",
      blocos: [
        { tipo: "texto", texto: "O preço de equilíbrio é o encontro entre o que os vendedores oferecem e o que os compradores querem a cada preço. Na feira, a oferta de um hortifruti é muito elástica ao longo do ano (varia com a safra), enquanto a demanda é relativamente estável de semana a semana. Resultado: o preço se move principalmente puxado pela oferta. Quando a safra empurra a curva de oferta para a direita, o ponto de equilíbrio desce; na entressafra, a curva recua e o equilíbrio sobe." },
        { tipo: "texto", texto: "Há exceções do lado da demanda que também são sazonais: alguns produtos sobem de procura em datas específicas (bacalhau e pescados na Semana Santa, uva e frutas secas no fim de ano). Essa é a sazonalidade de demanda, mais rara em hortifrúti comum, mas real. O caderno trata as duas, porque ambas aparecem como um mesmo padrão repetido no índice estacional." },
        {
          tipo: "prancha",
          titulo: "Deslocamento da oferta entre safra e entressafra",
          desenho: {
            legenda: "A demanda (D) quase não se move; a oferta desloca de O-safra para O-entressafra, e o preço de equilíbrio sobe de P1 para P2.",
            primitivas: [
              { t: "linha", de: [30, 175], ate: [290, 175], cor: "tinta" },
              { t: "linha", de: [30, 15], ate: [30, 175], cor: "tinta" },
              { t: "rotulo", p: [255, 182], texto: "quantidade" },
              { t: "linha", de: [40, 30], ate: [250, 160], cor: "tinta" },
              { t: "rotulo", p: [236, 150], texto: "D" },
              { t: "linha", de: [60, 160], ate: [250, 40], cor: "suave" },
              { t: "rotulo", p: [200, 36], texto: "O-safra" },
              { t: "linha", de: [120, 160], ate: [290, 60], cor: "destaque" },
              { t: "rotulo", p: [250, 58], texto: "O-entressafra" },
              { t: "rotulo", p: [8, 120], texto: "P1" },
              { t: "rotulo", p: [8, 78], texto: "P2" },
              { t: "linha", de: [30, 120], ate: [150, 120], cor: "suave" },
              { t: "linha", de: [30, 80], ate: [170, 80], cor: "destaque" },
            ],
          },
        },
      ],
    },
    {
      id: "tres-sazonalidades",
      titulo: "Três sazonalidades: oferta, demanda e clima",
      blocos: [
        { tipo: "texto", texto: "É útil separar as origens do padrão. A sazonalidade de oferta vem do ciclo de produção (plantio e colheita). A de demanda vem do calendário de consumo (datas, estações, hábitos). E há o componente climático recorrente: a estação chuvosa que atrasa a colheita e reduz a qualidade, o frio que concentra certas folhosas. Esses efeitos, quando se repetem todo ano no mesmo mês, entram no índice estacional; quando são anômalos (uma geada fora de hora), são choques, tratados mais adiante." },
        { tipo: "diagrama", titulo: "De onde vem o padrão anual", codigo: `flowchart TD
  S["Sazonalidade observada no preço"] --> O["Oferta: ciclo de plantio e colheita"]
  S --> D["Demanda: datas e hábitos de consumo"]
  S --> K["Clima recorrente: chuva, frio, calor por estação"]
  O --> I["Índice estacional (padrão que se repete)"]
  D --> I
  K --> I` },
      ],
    },
    {
      id: "choques-vs-sazonal",
      titulo: "Choque não é sazonalidade",
      blocos: [
        { tipo: "texto", texto: "O erro mais caro na análise é confundir um choque com o padrão sazonal. Uma geada que queima a lavoura, uma greve de caminhoneiros, uma disparada do dólar que encarece insumos — tudo isso move o preço, mas não se repete no mesmo mês todo ano. Se você jogar um ano de geada na média sem cuidado, vai contaminar o índice e prever um pico que não existe. O método deste caderno separa justamente o que se repete (sazonal e tendência) do que é irregular (aleatório)." },
        { tipo: "texto", texto: "A prática é dupla: use vários anos (três, de preferência mais) para que um evento isolado dilua na média; e marque os meses anômalos no seu diário de coleta, para poder tratá-los como outliers. Especialistas lembram que variedades agrícolas mais resilientes ao clima têm atenuado o efeito sazonal sobre a inflação de alimentos — ou seja, o padrão existe, mas não é imutável: ele muda com tecnologia, clima e logística." },
        {
          tipo: "licao",
          pergunta: "Você tem 4 anos de preço de alface e um deles teve uma enchente que dobrou o preço em março. O que fazer?",
          alternativas: [
            "Usar só esse ano, porque foi o mais marcante",
            "Marcar março daquele ano como outlier e apoiar o índice nos anos típicos, ou em mais anos para diluir o evento",
            "Descartar a alface da análise",
          ],
          correta: 1,
          explicacao: "Um evento irregular não deve virar padrão. Marca-se o outlier e usam-se vários anos para que o choque não distorça o índice estacional.",
        },
      ],
    },
    // ===================== CAPÍTULO 3 — MÉTODO: O QUE E COMO COLETAR =====================
    {
      id: "o-que-medir",
      titulo: "O que medir: preço, unidade e qualidade",
      blocos: [
        { tipo: "texto", texto: "Um preço sem contexto não serve. Para cada observação, registre quatro coisas: o produto (e a variedade, se houver — tomate salada não é tomate italiano), o preço, a unidade (por quilo, por maço, por dúzia, por bandeja) e a qualidade/classificação. Um mesmo R$ 5,00 vira informação só quando sabemos que é 'por quilo de tomate salada extra'. Sem padronizar unidade e qualidade, você compara maçãs com bananas — literalmente." },
        { tipo: "texto", texto: "Registre também a data, a feira/banca e, se possível, a origem do produto. A origem explica muita coisa: na entressafra local, o produto que aparece costuma vir de longe, mais caro pelo frete. Esses metadados são o que vai permitir, depois, deflacionar, comparar praças e identificar de onde veio um pico." },
        {
          tipo: "tarefas",
          itens: [
            { id: "med-1", titulo: "Defina a unidade-padrão", entrega: "Para cada produto-foco, fixe uma unidade única (preferir R$/kg) e uma regra de conversão (ex.: maço de ~300 g)." },
            { id: "med-2", titulo: "Defina a classe de qualidade", entrega: "Escolha uma classe de referência por produto (ex.: 'extra', 'graúdo') e colete sempre a mesma." },
            { id: "med-3", titulo: "Monte o cabeçalho da coleta", entrega: "Crie as colunas: data, feira, produto, variedade, classe, unidade, preço, origem, observação." },
          ],
        },
      ],
    },
    {
      id: "caderneta-campo",
      titulo: "A caderneta de preços de campo",
      blocos: [
        { tipo: "texto", texto: "A coleta boa é a repetível. Use sempre a mesma ficha, no mesmo dia da semana, nas mesmas bancas de referência. A ideia é simples: visite três a cinco bancas, anote o preço mais comum (a moda) de cada produto-foco e registre o menor e o maior para ter a faixa. Isso espelha o que a própria CEAGESP publica no atacado — preço mínimo, mais comum e máximo — e dá robustez contra a banca que está em promoção ou em fim de estoque." },
        {
          tipo: "prancha",
          titulo: "Ficha de coleta na banca",
          desenho: {
            legenda: "Uma linha por produto e por visita. O preço 'mais comum' é o que entra na série; mínimo e máximo dão a faixa.",
            primitivas: [
              { t: "retangulo", p: [12, 20], w: 280, h: 150, cor: "tinta" },
              { t: "linha", de: [12, 48], ate: [292, 48], cor: "tinta" },
              { t: "linha", de: [12, 86], ate: [292, 86], cor: "suave" },
              { t: "linha", de: [12, 124], ate: [292, 124], cor: "suave" },
              { t: "linha", de: [96, 20], ate: [96, 170], cor: "suave" },
              { t: "linha", de: [150, 20], ate: [150, 170], cor: "suave" },
              { t: "linha", de: [204, 20], ate: [204, 170], cor: "suave" },
              { t: "linha", de: [248, 20], ate: [248, 170], cor: "suave" },
              { t: "rotulo", p: [16, 40], texto: "produto" },
              { t: "rotulo", p: [100, 40], texto: "classe" },
              { t: "rotulo", p: [154, 40], texto: "mín" },
              { t: "rotulo", p: [208, 40], texto: "comum" },
              { t: "rotulo", p: [252, 40], texto: "máx" },
              { t: "rotulo", p: [16, 78], texto: "tomate" },
              { t: "rotulo", p: [100, 78], texto: "extra" },
              { t: "rotulo", p: [16, 116], texto: "alface" },
              { t: "rotulo", p: [100, 116], texto: "crespa" },
              { t: "rotulo", p: [16, 154], texto: "banana" },
              { t: "rotulo", p: [100, 154], texto: "prata" },
            ],
          },
        },
      ],
    },
    {
      id: "fontes-de-dados",
      titulo: "Fontes: de onde tirar preço confiável",
      blocos: [
        { tipo: "texto", texto: "Você não precisa coletar tudo do zero: há séries oficiais longas e gratuitas que dão a referência de atacado e permitem calcular a sazonalidade mesmo antes da sua primeira ida a campo. Use as oficiais para o esqueleto histórico e a sua coleta para calibrar o preço da feira local." },
        { tipo: "fontes", titulo: "Bases de preço de hortifrúti", itens: [
          { titulo: "CONAB — PROHORT: preços diários e séries das CEASAs", url: "https://www.gov.br/conab/pt-br/atuacao/informacoes-agropecuarias/hortigranjeiros-prohort", tipo: "dataset", nota: "Monitoramento de preços, comparação de ofertas e origens, séries históricas por produto e central." },
          { titulo: "CONAB — Boletim Hortigranjeiro (mensal)", url: "https://www.gov.br/conab/pt-br/atuacao/informacoes-agropecuarias/hortigranjeiros-prohort/boletim-hortigranjeiro", tipo: "artigo", nota: "Análise mensal de preços e oferta; ótimo para entender o contexto de cada movimento." },
          { titulo: "CEPEA/ESALQ — Hortifruti (Hortifruti Brasil)", url: "https://www.hfbrasil.org.br", tipo: "site", nota: "Indicadores e análises de preços de frutas e hortaliças da ESALQ/USP; séries por produto e região." },
          { titulo: "CEAGESP — Cotações do Entreposto (atacado SP)", url: "https://ceagesp.gov.br/cotacoes/", tipo: "dataset", nota: "Preço mínimo, mais comum e máximo de frutas, legumes e verduras; boletim 3x por semana." },
          { titulo: "IBGE — SIDRA (banco de tabelas: PAM, IPCA, POF)", url: "https://sidra.ibge.gov.br", tipo: "dataset", nota: "Baixe tabelas de produção, inflação e consumo para cruzar com a série de preços." },
        ] },
      ],
    },
    {
      id: "padronizar",
      titulo: "Padronizar: unidade, variedade e classe",
      blocos: [
        { tipo: "texto", texto: "Antes de calcular qualquer coisa, a série precisa ser homogênea. Converta tudo para a unidade-padrão (R$/kg resolve a maioria dos casos). Separe variedades que têm mercados distintos: banana prata e banana nanica têm sazonalidades diferentes. E fixe a classe de qualidade — o Programa Brasileiro para a Modernização da Horticultura e os programas de classificação das CEASAs definem padrões (calibre, cor, defeitos) que permitem comparar o mesmo 'extra' ao longo do tempo." },
        { tipo: "texto", texto: "Um descuido frequente: misturar o preço de banca de promoção com o de banca premium. Para a série, escolha um nível e seja fiel a ele. A padronização não é burocracia — é o que garante que a variação que você vai medir seja de verdade a sazonalidade, e não uma troca disfarçada de produto ou de classe." },
        { tipo: "diagrama", titulo: "Pipeline de padronização do dado bruto", codigo: `flowchart LR
  A["Preço bruto da banca"] --> B["Converter para R$/kg"]
  B --> C["Separar por variedade"]
  C --> D["Fixar a classe de qualidade"]
  D --> E["Série homogênea pronta para deflacionar"]` },
      ],
    },
    {
      id: "deflacionar",
      titulo: "Deflacionar: separar inflação de sazonalidade",
      blocos: [
        { tipo: "texto", texto: "Preço em reais correntes mistura dois movimentos: a inflação geral (tudo subindo ao longo dos anos) e a sazonalidade (o vai e vem dentro do ano). Se você medir a sazonalidade sem tirar a inflação, dezembro sempre parecerá 'mais caro' só porque é mais recente. A solução é deflacionar: transformar todos os preços para a moeda de um mês-base, usando um índice de preços — tipicamente o IPCA (IBGE) ou o IGP-DI. Estudos de sazonalidade na Ceasa-CE, por exemplo, deflacionaram a série pelo IGP-DI antes de calcular o índice." },
        { tipo: "texto", texto: "A conta é direta: preço real = preço nominal × (índice do mês-base ÷ índice do mês da observação). Com a série em preços reais, a tendência de longo prazo some da inflação e o que resta de movimento intra-anual é, de fato, candidato a sazonalidade. Só depois de deflacionar é que o cálculo do índice estacional faz sentido." },
        {
          tipo: "licao",
          pergunta: "Por que deflacionar antes de medir a sazonalidade?",
          alternativas: [
            "Para deixar os números menores e mais fáceis de somar",
            "Para remover o efeito da inflação geral, de modo que a variação restante reflita o padrão sazonal, não a perda do poder de compra da moeda",
            "Porque a lei exige",
          ],
          correta: 1,
          explicacao: "Sem deflacionar, a inflação se confunde com tendência e contamina a comparação entre meses de anos diferentes. Em preços reais, o movimento intra-anual fica limpo para o índice estacional.",
        },
      ],
    },
    {
      id: "video-series",
      titulo: "Vídeo: séries temporais no Excel (base do método)",
      blocos: [
        { tipo: "texto", texto: "Antes de entrar no cálculo, vale ver o ferramental em ação. Este vídeo introduz séries temporais com exemplos no Excel — média móvel, suavização e tratamento de dados com sazonalidade — exatamente a caixa de ferramentas que o próximo capítulo usa. Assista com a sua planilha aberta." },
        { tipo: "video", titulo: "Séries temporais: introdução com exemplos no Excel", youtube: "XDBoLQDUeUA" },
      ],
    },
    // ===================== CAPÍTULO 4 — CÁLCULO: ÍNDICE ESTACIONAL =====================
    {
      id: "decompor-serie",
      titulo: "Decompor a série: tendência, ciclo, sazonal e aleatório",
      blocos: [
        { tipo: "texto", texto: "Uma série de preços mensais pode ser lida como a soma (ou o produto) de quatro componentes: tendência (o rumo de longo prazo), ciclo (ondas plurianuais ligadas à economia), sazonalidade (o padrão que se repete dentro do ano) e o componente aleatório (choques e ruído). Medir sazonalidade é, no fundo, isolar o terceiro componente dos demais. A decomposição clássica faz isso em etapas: estima a tendência com média móvel, remove-a da série e, do que sobra, extrai o padrão médio de cada mês." },
        { tipo: "texto", texto: "Há dois esquemas: o aditivo (série = tendência + sazonal + resíduo), quando a amplitude sazonal é mais ou menos constante, e o multiplicativo (série = tendência × sazonal × resíduo), quando a oscilação cresce junto com o nível de preço. Em hortifrúti, o multiplicativo costuma encaixar melhor, e é dele que sai o índice estacional expresso em base 100." },
        { tipo: "diagrama", titulo: "Decomposição de uma série de preços", codigo: `flowchart TD
  Y["Série de preço mensal (deflacionada)"] --> T["Tendência-ciclo (média móvel 12m)"]
  Y --> S["Sazonalidade (padrão anual)"]
  Y --> R["Aleatório (choques, ruído)"]
  S --> IE["Índice estacional em base 100"]` },
      ],
    },
    {
      id: "media-movel-12",
      titulo: "A média móvel centrada de 12 meses",
      blocos: [
        { tipo: "texto", texto: "O coração do método é a média móvel centrada de 12 meses. Por que 12? Porque uma média de doze meses consecutivos contém exatamente uma volta do calendário — logo, a sazonalidade se cancela e sobra a tendência. 'Centrada' significa posicionar essa média no meio do intervalo. Como 12 é par, usa-se a média móvel 2×12: faz-se a média de 12 meses, desloca-se um mês, faz-se de novo, e tira-se a média das duas para centralizar exatamente no mês." },
        { tipo: "texto", texto: "Com a média móvel pronta, cada mês observado é dividido pela sua média móvel: isso dá o fator sazonal daquele mês (quanto ele está acima ou abaixo da tendência local). Depois, agrupam-se todos os janeiros, todos os fevereiros, etc., e tira-se a média de cada grupo. O resultado é o índice estacional de cada mês. Esse é o procedimento usado em dezenas de estudos brasileiros de preços agrícolas." },
        { tipo: "video", titulo: "Média móvel no Excel (passo a passo)", youtube: "iYjLOBfeIqc" },
      ],
    },
    {
      id: "indice-estacional",
      titulo: "O índice estacional: do fator à base 100",
      blocos: [
        { tipo: "texto", texto: "O índice estacional médio (IEM) de um mês é a média dos fatores sazonais daquele mês ao longo dos anos. Para expressá-lo em base 100 (onde 100 = média do ano), normaliza-se: a soma dos 12 índices deve dar 1200 (ou média 100). Quando a soma não fecha em 1200, multiplica-se cada índice pela razão entre 1200 e a soma obtida — o resultado é o índice estacional verdadeiro (IEV), já sem o resíduo aleatório remanescente." },
        { tipo: "texto", texto: "A leitura fica intuitiva: um índice de 130 em julho significa que, naquele mês, o preço real fica em média 30% acima do nível médio do ano; um índice de 80 em março significa 20% abaixo. É um mapa de bolso: onde comprar barato, onde a margem aperta, quando a oferta inunda a feira." },
        {
          tipo: "prancha",
          titulo: "Os três passos do índice estacional",
          desenho: {
            legenda: "1) média móvel 12m centrada; 2) observado ÷ média móvel = fator; 3) média dos fatores por mês, normalizada para somar 1200.",
            primitivas: [
              { t: "retangulo", p: [10, 40], w: 78, h: 60, cor: "tinta" },
              { t: "rotulo", p: [16, 34], texto: "1 Média móvel" },
              { t: "rotulo", p: [20, 74], texto: "12m centrada" },
              { t: "seta", de: [88, 70], ate: [112, 70] },
              { t: "retangulo", p: [112, 40], w: 78, h: 60, cor: "tinta" },
              { t: "rotulo", p: [118, 34], texto: "2 Fator" },
              { t: "rotulo", p: [118, 74], texto: "obs ÷ média" },
              { t: "seta", de: [190, 70], ate: [214, 70] },
              { t: "retangulo", p: [214, 40], w: 80, h: 60, cor: "destaque" },
              { t: "rotulo", p: [220, 34], texto: "3 Índice" },
              { t: "rotulo", p: [220, 74], texto: "média/mês" },
              { t: "rotulo", p: [60, 130], texto: "normalizar: soma dos 12 = 1200 (média = 100)" },
              { t: "linha", de: [30, 145], ate: [280, 145], cor: "suave" },
            ],
          },
        },
      ],
    },
    {
      id: "exemplo-tomate",
      titulo: "Exemplo passo a passo: o índice do tomate",
      blocos: [
        { tipo: "texto", texto: "Imagine três anos de preço real do tomate salada (R$/kg) coletados na sua feira ou baixados do PROHORT. Monte uma coluna com os 36 meses em ordem. Calcule a média móvel centrada de 12 meses (a primeira só aparece no 7º mês, porque precisa de 6 meses de cada lado). Divida cada preço pela sua média móvel: nos meses de inverno você verá fatores acima de 1,2; na safra de verão, abaixo de 0,85. Agrupe por mês e tire a média: nasce o perfil sazonal." },
        { tipo: "texto", texto: "Para o tomate, o padrão típico mostra preços mais altos no inverno (geadas e chuvas reduzem a oferta do Sudeste) e mais baixos no fim da safra de verão. Boletins da CONAB atribuem quedas fortes do tomate justamente ao aumento de oferta em várias CEASAs, e o CEPEA registra altas quando a oferta recua nas praças produtoras. O seu índice, calculado em casa, deve reproduzir esse desenho — e, se não reproduzir, é sinal de que falta ano ou de que há um outlier escondido." },
        {
          tipo: "prancha",
          titulo: "Perfil estacional ilustrativo do tomate (base 100)",
          desenho: {
            legenda: "Índice por mês: acima de 100 = acima da média anual. Vales na safra de verão, picos no inverno. Valores ilustrativos do padrão típico.",
            primitivas: [
              { t: "linha", de: [16, 150], ate: [292, 150], cor: "tinta" },
              { t: "linha", de: [16, 20], ate: [16, 150], cor: "tinta" },
              { t: "linha", de: [16, 85], ate: [292, 85], cor: "suave" },
              { t: "rotulo", p: [0, 86], texto: "100" },
              { t: "curva", pts: [[24, 110], [46, 120], [70, 108], [92, 92], [116, 70], [140, 55], [164, 52], [188, 62], [212, 80], [236, 100], [260, 112], [284, 116]], cor: "destaque" },
              { t: "rotulo", p: [20, 160], texto: "J F M A M J J A S O N D" },
              { t: "rotulo", p: [150, 44], texto: "pico inverno" },
              { t: "rotulo", p: [30, 128], texto: "safra verão" },
            ],
          },
        },
        {
          tipo: "tarefas",
          itens: [
            { id: "tom-1", titulo: "Monte 36 meses", entrega: "Planilha com 3 anos de preço real de um produto, em R$/kg, coluna única em ordem cronológica." },
            { id: "tom-2", titulo: "Calcule a média móvel 2x12", entrega: "Coluna de média móvel centrada; confira que a primeira aparece no 7º mês." },
            { id: "tom-3", titulo: "Gere o índice", entrega: "Fatores (obs ÷ média), média por mês e normalização para somar 1200. Guarde o gráfico." },
          ],
        },
      ],
    },
    {
      id: "normalizar-1200",
      titulo: "Normalizar e limpar o ruído (IEV)",
      blocos: [
        { tipo: "texto", texto: "O índice estacional médio ainda carrega um resto de variação aleatória — anos atípicos não se cancelam perfeitamente. Por isso, autores distinguem o índice estacional médio (IEM) do índice estacional verdadeiro (IEV). O IEV sai de uma correção: se a soma dos 12 índices médios não dá 1200, multiplica-se cada um pela razão 1200 ÷ soma. Essa normalização força a média anual a 100 e redistribui o pequeno resíduo, deixando o perfil comparável entre produtos." },
        { tipo: "texto", texto: "Existe uma variante geométrica (programas como o Sazonal usam média geométrica móvel centralizada de 12 meses), que lida melhor com séries muito assimétricas. Para a feira, a versão aritmética multiplicativa já entrega um índice claro e defensável. O importante é documentar qual método usou — um mesmo produto pode ter índices ligeiramente diferentes conforme a escolha." },
        {
          tipo: "licao",
          pergunta: "Seu índice estacional somou 1180, não 1200. O que fazer?",
          alternativas: [
            "Nada, 1180 está perto o bastante",
            "Multiplicar cada índice mensal por 1200 ÷ 1180 para normalizar e obter o IEV",
            "Recalcular tudo do zero com outro produto",
          ],
          correta: 1,
          explicacao: "A normalização ajusta a soma para 1200 (média 100) multiplicando cada índice pela razão entre 1200 e a soma obtida. Isso remove o resíduo e torna o índice comparável.",
        },
      ],
    },
    {
      id: "amplitude-sazonal",
      titulo: "Amplitude sazonal e previsibilidade",
      blocos: [
        { tipo: "texto", texto: "Dois produtos podem ter o mesmo mês de pico, mas amplitudes muito diferentes — e é a amplitude que diz se vale a pena agir. Uma medida usada no Instituto de Economia Agrícola é a amplitude percentual: C.A.% = (índice máximo − índice mínimo) × 2 × 100 ÷ (índice máximo + índice mínimo). Quanto maior, mais o preço balança no ano e maior o prêmio de quem compra na época certa. Folhosas perecíveis tendem a amplitudes altas; produtos armazenáveis (batata, cebola), mais suaves." },
        { tipo: "texto", texto: "A amplitude, porém, só é útil se o padrão for confiável. Um índice construído com poucos anos, ou dominado por um choque, tem amplitude instável. Por isso o par 'amplitude + número de anos' deve andar junto: anote quantos anos sustentam cada índice. Esse é o tipo de decisão metodológica que um economista agrícola ou estatístico ajuda a calibrar — e que a mobilização das próximas páginas cobre." },
        {
          tipo: "prancha",
          titulo: "Amplitude sazonal: alta vs. baixa",
          desenho: {
            legenda: "Dois produtos, mesmo mês de pico. O de amplitude alta (A) premia muito a compra na safra; o de amplitude baixa (B) quase não varia.",
            primitivas: [
              { t: "linha", de: [16, 150], ate: [292, 150], cor: "tinta" },
              { t: "linha", de: [16, 20], ate: [16, 150], cor: "tinta" },
              { t: "linha", de: [16, 90], ate: [292, 90], cor: "suave" },
              { t: "rotulo", p: [0, 90], texto: "100" },
              { t: "curva", pts: [[24, 135], [70, 110], [116, 60], [162, 35], [208, 70], [260, 130]], cor: "destaque" },
              { t: "rotulo", p: [150, 28], texto: "A (alta)" },
              { t: "curva", pts: [[24, 104], [70, 98], [116, 86], [162, 80], [208, 92], [260, 102]], cor: "tinta" },
              { t: "rotulo", p: [150, 112], texto: "B (baixa)" },
            ],
          },
        },
      ],
    },
    {
      id: "video-decomposicao",
      titulo: "Vídeo: dessazonalizar no Excel",
      blocos: [
        { tipo: "texto", texto: "Para ver o método de decomposição aplicado numa planilha — obter a média móvel, calcular os índices sazonais e gerar a série dessazonalizada — este vídeo faz o passo a passo. É o espelho prático do que fizemos com o tomate." },
        { tipo: "video", titulo: "Método da decomposição: série dessazonalizada no Excel", youtube: "bnHcHcODhG8" },
      ],
    },
    {
      id: "fontes-metodo",
      titulo: "Fontes: método e estatística",
      blocos: [
        { tipo: "texto", texto: "A metodologia do índice estacional por média móvel é padrão na economia agrícola brasileira. Estas referências trazem a teoria, as fórmulas e exemplos aplicados a preços reais." },
        { tipo: "fontes", titulo: "Método do índice estacional", itens: [
          { titulo: "BARROS, G. S. C. — Economia da Comercialização Agrícola (CEPEA/ESALQ-USP, 2006)", url: "https://cepea.org.br/br/documentos/texto/economia-da-comercializacao-agricola-em-pdf.aspx", tipo: "livro", nota: "Texto de referência sobre formação de preços, margens e sazonalidade no mercado à vista; PDF gratuito." },
          { titulo: "Anais UFPel — análise de sazonalidade de preços (média móvel 12 meses)", url: "https://www2.ufpel.edu.br/cic/2011/anais/pdf/CA/CA_00899.pdf", tipo: "artigo", nota: "Exemplo aplicado do cálculo do índice estacional com média móvel centrada." },
          { titulo: "Repositório UFC — sazonalidade de frutas e hortaliças na Ceasa-CE", url: "https://repositorio.ufc.br/ri/bitstream/riufc/5328/1/2004_eve_rmsales.pdf", tipo: "artigo", nota: "Série deflacionada pelo IGP-DI e índice estacional por produto; método documentado." },
          { titulo: "DataCamp — Decomposição de séries temporais (em português)", url: "https://www.datacamp.com/pt/tutorial/time-series-decomposition", tipo: "site", nota: "Explica tendência, sazonalidade e resíduo, e os esquemas aditivo e multiplicativo." },
          { titulo: "IEA-SP — Instituto de Economia Agrícola (Informações Econômicas)", url: "https://iea.agricultura.sp.gov.br", tipo: "site", nota: "Fonte da fórmula de amplitude sazonal e de séries e estudos de preços agrícolas de São Paulo." },
        ] },
      ],
    },
    // ===================== CAPÍTULO 5 — PROJETO: PLANILHA E PAINEL =====================
    {
      id: "planilha-sazonalidade",
      titulo: "Projeto: a planilha de sazonalidade",
      blocos: [
        { tipo: "texto", texto: "Agora o método vira ferramenta. A planilha tem quatro abas em cadeia: Coleta (dado bruto da feira), Deflator (IPCA/IGP para converter em preço real), Cálculo (média móvel, fatores e índice) e Painel (gráfico do índice e a decisão). Separar as abas evita misturar dado bruto com conta — e permite recalcular tudo quando entra um mês novo. Cada aba herda da anterior por fórmula; você só digita na aba Coleta." },
        { tipo: "diagrama", titulo: "Arquitetura da planilha", codigo: `flowchart LR
  A["Aba Coleta: data, produto, classe, preço, origem"] --> B["Aba Deflator: preço real = nominal x base/IPCA"]
  B --> C["Aba Cálculo: média móvel 12m, fator, índice"]
  C --> D["Aba Painel: gráfico do índice + decisão"]` },
        {
          tipo: "tarefas",
          itens: [
            { id: "plan-1", titulo: "Crie as 4 abas", entrega: "Planilha com Coleta, Deflator, Cálculo e Painel, ligadas por fórmula (só Coleta recebe digitação)." },
            { id: "plan-2", titulo: "Cole o deflator", entrega: "Baixe a série do IPCA no SIDRA e monte a coluna de fator de deflação para o mês-base escolhido." },
            { id: "plan-3", titulo: "Automatize o índice", entrega: "Fórmulas de média móvel, fator e média por mês, com a normalização para 1200 na própria aba Cálculo." },
          ],
        },
      ],
    },
    {
      id: "painel-decisao",
      titulo: "O painel de decisão",
      blocos: [
        { tipo: "texto", texto: "O índice só vale se virar decisão. O painel traduz o perfil sazonal em três leituras diretas: os meses verdes (índice bem abaixo de 100 — época de comprar/estocar/promover), os meses vermelhos (índice bem acima de 100 — preço apertado, margem exige atenção) e a amplitude (o tamanho do prêmio de agir). Para o feirante, isso orienta o calendário de compras; para o consumidor, o cardápio da estação; para a cooperativa, o escalonamento de plantio." },
        { tipo: "texto", texto: "Um cuidado de honestidade: o painel mostra o padrão médio, não uma profecia. Ele diz 'em geral, julho é caro', não 'este julho será caro'. Por isso o painel traz sempre o número de anos por trás do índice e um espaço para anotar o contexto do mês corrente (uma seca, um feriado). Decisão boa combina o padrão sazonal com a notícia do dia — o boletim da CONAB ou do CEPEA fecha essa ponte." },
        {
          tipo: "prancha",
          titulo: "Painel: meses verdes, vermelhos e amplitude",
          desenho: {
            legenda: "Barras por mês em torno da linha 100. Abaixo (verde) = comprar; acima (vermelho) = cautela. A faixa total é a amplitude.",
            primitivas: [
              { t: "linha", de: [16, 95], ate: [292, 95], cor: "tinta" },
              { t: "rotulo", p: [0, 95], texto: "100" },
              { t: "retangulo", p: [26, 95], w: 14, h: 24, hachura: true },
              { t: "retangulo", p: [48, 95], w: 14, h: 30, hachura: true },
              { t: "retangulo", p: [70, 95], w: 14, h: 14, hachura: true },
              { t: "retangulo", p: [92, 70], w: 14, h: 25, cor: "destaque" },
              { t: "retangulo", p: [114, 55], w: 14, h: 40, cor: "destaque" },
              { t: "retangulo", p: [136, 48], w: 14, h: 47, cor: "destaque" },
              { t: "retangulo", p: [158, 50], w: 14, h: 45, cor: "destaque" },
              { t: "retangulo", p: [180, 64], w: 14, h: 31, cor: "destaque" },
              { t: "retangulo", p: [202, 95], w: 14, h: 12, hachura: true },
              { t: "retangulo", p: [224, 95], w: 14, h: 22, hachura: true },
              { t: "retangulo", p: [246, 95], w: 14, h: 28, hachura: true },
              { t: "retangulo", p: [268, 95], w: 14, h: 20, hachura: true },
              { t: "rotulo", p: [20, 150], texto: "J F M A M J J A S O N D" },
            ],
          },
        },
      ],
    },
    {
      id: "mobilizacao-estatistico",
      titulo: "Hora do especialista: validar o modelo",
      blocos: [
        { tipo: "texto", texto: "Você montou a série, deflacionou e calculou o índice. Antes de publicar ou de basear uma decisão de compra em dinheiro real, o modelo precisa de uma revisão técnica: a escolha entre esquema aditivo e multiplicativo, o tratamento de outliers, o número mínimo de anos e o teste de significância da sazonalidade são decisões que um profissional confirma. Esta é uma etapa de mobilização." },
        { tipo: "mobilizacao", papel: "Economista agrícola ou estatístico", porque: "Validar a metodologia do índice estacional (esquema aditivo/multiplicativo, tratamento de outliers, nº de anos, significância) exige julgamento técnico que dá robustez à decisão e evita confundir choque com padrão.", entregaEsperada: "Parecer curto confirmando o método, apontando ajustes (ex.: trocar para multiplicativo, remover um ano atípico) e validando o índice final por produto, com ressalvas de confiabilidade.", gerenciadoPor: "zaeon" },
      ],
    },
    // ===================== CAPÍTULO 6 — EXECUÇÃO: IDA A CAMPO =====================
    {
      id: "protocolo-coleta",
      titulo: "Protocolo de coleta na feira",
      blocos: [
        { tipo: "texto", texto: "A ida a campo tem que ser padronizada para a série não enviesar. Vá sempre no mesmo dia e horário (o preço muda do início para o fim da feira), percorra as mesmas bancas de referência, registre o preço mais comum de cada produto-foco e anote a origem e a qualidade. Leve a ficha impressa ou no celular, e fotografe o produto quando houver dúvida de classe. Repetição é o que transforma visitas soltas em série temporal." },
        {
          tipo: "tarefas",
          itens: [
            { id: "col-1", titulo: "Fixe o momento", entrega: "Escolha dia e horário fixos de coleta e registre a regra (ex.: sábado, 8h-9h)." },
            { id: "col-2", titulo: "Defina a rota de bancas", entrega: "Liste 3 a 5 bancas de referência e sempre colete nelas, na mesma ordem." },
            { id: "col-3", titulo: "Faça a primeira coleta real", entrega: "Uma ficha preenchida com os produtos-foco: preço comum, mín, máx, origem e classe." },
          ],
        },
      ],
    },
    {
      id: "ir-a-feira",
      titulo: "Ler a feira: o mapa e o fluxo",
      blocos: [
        { tipo: "texto", texto: "A feira tem geografia e ela conta história. Bancas de produtor (agricultura familiar) costumam ter produto fresco, de origem local e com sazonalidade mais nítida; bancas de atravessador trazem itens de fora, que seguram a oferta na entressafra, mas a preço de frete. Mapear quem é quem ajuda a interpretar um preço fora de padrão: um tomate caríssimo em plena safra local pode ser um tomate 'importado' de outra região numa banca de revenda." },
        { tipo: "texto", texto: "Observe também o fluxo do dia: no início, preço cheio e produto no ponto; no fim, descontos para não levar de volta o perecível. Se você coletar sempre no mesmo momento, esse efeito se anula na série. Se não puder, registre o horário — ele explica parte da variação e evita conclusão errada." },
        {
          tipo: "prancha",
          titulo: "Mapa de uma feira e os pontos de coleta",
          desenho: {
            legenda: "Produtor (P) e revenda (R) ao longo do corredor. Colete sempre nas mesmas bancas de referência (marcadas).",
            primitivas: [
              { t: "retangulo", p: [20, 40], w: 260, h: 30, cor: "suave" },
              { t: "retangulo", p: [20, 120], w: 260, h: 30, cor: "suave" },
              { t: "rotulo", p: [120, 100], texto: "corredor da feira" },
              { t: "seta", de: [30, 95], ate: [270, 95] },
              { t: "circulo", c: [50, 55], r: 8, cor: "destaque" },
              { t: "rotulo", p: [44, 34], texto: "P" },
              { t: "circulo", c: [110, 55], r: 8, cor: "tinta" },
              { t: "rotulo", p: [104, 34], texto: "R" },
              { t: "circulo", c: [170, 55], r: 8, cor: "destaque" },
              { t: "rotulo", p: [164, 34], texto: "P" },
              { t: "circulo", c: [230, 55], r: 8, cor: "tinta" },
              { t: "rotulo", p: [224, 34], texto: "R" },
              { t: "circulo", c: [80, 135], r: 8, cor: "destaque" },
              { t: "rotulo", p: [74, 165], texto: "P*" },
              { t: "circulo", c: [200, 135], r: 8, cor: "destaque" },
              { t: "rotulo", p: [194, 165], texto: "P*" },
            ],
          },
        },
      ],
    },
    {
      id: "entrevistar-feirante",
      titulo: "Conversar com o feirante (com ética)",
      blocos: [
        { tipo: "texto", texto: "O feirante é a maior fonte de conhecimento sobre a sazonalidade local — ele vive o calendário há anos. Uma conversa curta e respeitosa rende ouro: pergunte qual mês ele considera o mais caro e o mais barato de cada produto, de onde vem a mercadoria na entressafra, e o que mais atrapalha (chuva, frete, feriado). Mas há ética: apresente-se, explique o propósito, peça permissão para anotar, não atrapalhe a venda e não exponha preços de concorrentes de forma que gere conflito." },
        { tipo: "texto", texto: "Esse relato qualitativo complementa o número. Pesquisas em feiras mostram que boa parte dos feirantes não mantém controle formal de custos e define preço pela referência de mercado e pela concorrência — ou seja, o 'modelo mental' deles é a sua melhor hipótese inicial sobre o calendário. Confirme com dado, mas comece ouvindo." },
        { tipo: "diagrama", titulo: "Roteiro da conversa na banca", codigo: `sequenceDiagram
  participant V as Você
  participant F as Feirante
  V->>F: Apresentação e propósito
  V->>F: Pede permissão para anotar
  F-->>V: Aceita
  V->>F: Qual mês mais caro/barato deste produto?
  F-->>V: Relato do calendário
  V->>F: De onde vem na entressafra?
  F-->>V: Origem e frete
  V->>V: Registra e agradece` },
        {
          tipo: "licao",
          pergunta: "Qual é a melhor prática ao coletar o relato do feirante?",
          alternativas: [
            "Anotar sem avisar, para não enviesar",
            "Apresentar-se, explicar o propósito, pedir permissão e não atrapalhar a venda",
            "Oferecer dinheiro pela informação",
          ],
          correta: 1,
          explicacao: "Transparência e consentimento são o mínimo ético em pesquisa de campo. Atrapalhar a venda ou pagar pela informação compromete a relação e a qualidade do dado.",
        },
      ],
    },
    {
      id: "mobilizacao-agronomo",
      titulo: "Hora do especialista: aferir o calendário local",
      blocos: [
        { tipo: "texto", texto: "A sazonalidade de preço é consequência do calendário agronômico, e esse calendário é regional: a janela de colheita do tomate no cinturão verde de São Paulo não é a mesma do Nordeste. Para amarrar o seu índice à realidade produtiva — e explicar por que um pico cai em certo mês — vale confirmar o calendário de plantio e colheita dos seus produtos-foco com quem conhece o campo da sua região. Esta é a segunda etapa de mobilização." },
        { tipo: "mobilizacao", papel: "Engenheiro agrônomo ou extensionista rural (ATER)", porque: "O calendário de safra/entressafra por produto e região é conhecimento agronômico local; aferi-lo com um profissional garante que a interpretação do índice (por que o pico cai neste mês) corresponda à produção real, e não a um palpite.", entregaEsperada: "Tabela do calendário de plantio e colheita dos produtos-foco na região, com as janelas de safra e entressafra e as regiões de origem que abastecem na entressafra.", gerenciadoPor: "zaeon" },
      ],
    },
    // ===================== CAPÍTULO 7 — MANUTENÇÃO =====================
    {
      id: "manter-serie",
      titulo: "Manter a série viva, mês a mês",
      blocos: [
        { tipo: "texto", texto: "Um índice estacional não é obra única: ele melhora a cada ano de dado novo. A disciplina é mensal — a mesma coleta, o mesmo deflator atualizado, o mesmo recálculo. Quanto mais anos, mais estável o índice e mais confiável a amplitude. A recomendação prática é não descartar meses antigos: a série longa é o ativo. Faça backup da planilha e versione (um arquivo por ano ou controle de versão), para nunca perder histórico." },
        { tipo: "texto", texto: "Atualize também os deflatores: o IPCA sai todo mês no IBGE, e a sua aba Deflator precisa receber o número novo para que o preço real do mês corrente seja comparável. Um erro comum é esquecer o deflator e, sem perceber, deixar a inflação recente vazar para dentro do índice. Rotina mata esse bug." },
        {
          tipo: "tarefas",
          itens: [
            { id: "man-1", titulo: "Agende a coleta mensal", entrega: "Lembrete recorrente para a coleta e o recálculo no mesmo dia do mês." },
            { id: "man-2", titulo: "Atualize o deflator", entrega: "Rotina de baixar o IPCA novo no SIDRA e inserir na aba Deflator antes de recalcular." },
            { id: "man-3", titulo: "Faça backup versionado", entrega: "Cópia da planilha com data no nome (ou repositório), preservando o histórico completo." },
          ],
        },
      ],
    },
    {
      id: "revisar-outliers",
      titulo: "Revisar o índice: outliers e mudança de padrão",
      blocos: [
        { tipo: "texto", texto: "Todo ano, ao fechar 12 meses, revise o índice. Procure outliers: um mês que destoa muito do padrão (uma geada, uma enchente, uma crise de frete) deve ser sinalizado e, se for o caso, tratado — reduzindo seu peso ou substituindo por uma estimativa robusta. Mas cuidado com o oposto: se um 'outlier' passa a se repetir, não é outlier, é mudança de padrão. Mudanças climáticas, novas variedades e irrigação têm, de fato, atenuado efeitos sazonais em vários alimentos." },
        { tipo: "texto", texto: "Documente cada revisão: o que mudou, por quê, qual mês foi ajustado. Essa trilha é o que separa uma análise séria de um número mágico. E quando a dúvida for estrutural (o padrão realmente mudou?), vale acionar de novo o especialista — a sazonalidade é viva, não um carimbo eterno." },
        { tipo: "diagrama", titulo: "Ciclo anual de revisão", codigo: `flowchart TD
  A["Fecha 12 meses"] --> B["Detecta outliers"]
  B --> C{"Repete todo ano?"}
  C -->|Não| D["Trata como choque: sinaliza e reduz peso"]
  C -->|Sim| E["Mudança de padrão: incorpora ao índice"]
  D --> F["Recalcula e documenta"]
  E --> F
  F --> A` },
        {
          tipo: "licao",
          pergunta: "Um mês atípico apareceu três anos seguidos no mesmo período. Como tratá-lo?",
          alternativas: [
            "Continuar removendo como outlier todo ano",
            "Reconhecer que virou padrão e incorporá-lo ao índice estacional",
            "Ignorar a série inteira",
          ],
          correta: 1,
          explicacao: "Um evento que se repete no mesmo período deixa de ser aleatório e passa a ser sazonalidade (ou mudança estrutural). Removê-lo sempre esconderia um padrão real.",
        },
      ],
    },
    // ===================== CAPÍTULO 8 — CASOS REAIS =====================
    {
      id: "caso-tomate",
      titulo: "Caso: o tomate nas CEASAs",
      blocos: [
        { tipo: "texto", texto: "O tomate é o exemplo didático perfeito de sazonalidade com choques por cima. O padrão base: oferta forte e preço baixo na safra de verão do Sudeste, aperto no inverno. Mas o tomate é sensível a clima e pragas, então sobre o padrão se somam choques frequentes. Boletins da CONAB registram quedas acentuadas quando a oferta sobe em várias CEASAs ao mesmo tempo; o CEPEA registra altas quando a produção recua nas praças produtoras. É por isso que o tomate tem uma das maiores amplitudes sazonais entre os hortifrútis." },
        { tipo: "texto", texto: "Para o analista de feira, o tomate ensina a lição central do caderno: use vários anos para enxergar o padrão por baixo do ruído. Um único ano de preço de tomate é quase inútil para prever — pode ter sido um ano de geada ou de superprodução. Três ou mais anos revelam o esqueleto sazonal; os boletins mensais explicam o mês específico." },
        { tipo: "video", titulo: "Preço do tomate no atacado registra alta, diz CEPEA", youtube: "xXmGHGSohBM" },
      ],
    },
    {
      id: "caso-faf-seropedica",
      titulo: "Caso: a Feira da Agricultura Familiar",
      blocos: [
        { tipo: "texto", texto: "Um estudo sobre a Feira da Agricultura Familiar (FAF) de Seropédica (RJ), publicado na Revista de Economia e Sociologia Rural, trouxe um achado contraintuitivo: nessas feiras, os efeitos sazonais afetam bastante as vendas (o faturamento), mas a volatilidade de preços é baixa. Ou seja, o que muda com a estação é mais o quanto se vende do que o preço unitário — e os agricultores, longe de serem simples tomadores de preço, administram a precificação ao longo do ano." },
        { tipo: "texto", texto: "Isso tem uma consequência prática: numa feira da agricultura familiar, a sazonalidade pode aparecer menos no preço e mais no sortimento (quais produtos existem) e no volume. Por isso o seu diário de campo deve registrar também a presença/ausência de cada item, não só o preço. Em cidades do interior, estudos associam a oferta reduzida na feira às dificuldades das famílias na entressafra — a feira é a vitrine mais honesta do calendário agrícola." },
        { tipo: "video", titulo: "A feira livre como espaço do campo na cidade", youtube: "TdFQ0Pc_QJM" },
      ],
    },
    {
      id: "caso-leite-boi",
      titulo: "Caso: entressafra do leite e do boi",
      blocos: [
        { tipo: "texto", texto: "A sazonalidade não é só de hortifrúti. No leite, a safra das águas (chuvas, pasto abundante) derruba o preço no campo; na entressafra seca, a oferta cai e o preço ao produtor sobe. No boi gordo, a entressafra no Brasil Central vai de julho a novembro, quando a oferta de animais prontos diminui e a arroba se valoriza. São calendários diferentes, mas o mesmo método do índice estacional descreve os dois — prova de que a ferramenta deste caderno é geral." },
        { tipo: "texto", texto: "Para quem vende na feira produtos de origem animal (queijo, ovos, frango caipira), conhecer essas sazonalidades de insumo ajuda a antecipar custo: a entressafra do leite encarece o queijo; a do milho pressiona ração e, com ela, ovos e frango. O índice que você aprendeu a calcular serve para o insumo tanto quanto para o produto final." },
        { tipo: "video", titulo: "Entressafra do leite faz preços aumentarem", youtube: "3RB4pE6vu3s" },
      ],
    },
    // ===================== CAPÍTULO 9 — RECURSOS =====================
    {
      id: "recursos",
      titulo: "Recursos: para ir além",
      blocos: [
        { tipo: "texto", texto: "Para aprofundar, reunimos os estudos de campo e as bases que sustentam este caderno. Os artigos mostram como a academia aplica o método a produtos e praças específicas; as bases permitem refazer qualquer cálculo com dado atual." },
        { tipo: "fontes", titulo: "Estudos de caso e bases para aprofundar", itens: [
          { titulo: "Feira da Agricultura Familiar: sazonalidade e preços (RESR/SciELO)", url: "https://scielo.br/j/resr/a/qpPgmC8Hqs3n4zWLB8LzPdg/?lang=en", tipo: "artigo", nota: "Efeitos sazonais nas vendas com baixa volatilidade de preço; FAF de Seropédica." },
          { titulo: "Feirantes não são meros tomadores de preço (RESR, 2023)", url: "https://app.periodikos.com.br/article/10.1590/1806-9479.2023.270700pt/pdf/resr-62-4-e270700.pdf", tipo: "artigo", nota: "Formação de preço na feira da agricultura familiar; comportamento estratégico do feirante." },
          { titulo: "Feira livre e entressafra em São Francisco-MG (AgEcon Search)", url: "https://ageconsearch.umn.edu/record/109674/files/737.pdf", tipo: "artigo", nota: "A feira como vitrine do efeito sazonal; oferta reduzida na entressafra." },
          { titulo: "Comportamento dos preços da raiz de mandioca na Bahia (Embrapa)", url: "https://www.alice.cnptia.embrapa.br/alice/bitstream/doc/1166293/1/Comportamento-dos-precos-da-raiz-de-mandioca-no-Estado-da-Bahia..pdf", tipo: "artigo", nota: "Aplicação do índice estacional a um produto; método replicável." },
          { titulo: "CONAB — Centrais de abastecimento: comercialização de frutas e hortaliças (2025)", url: "https://www.gov.br/conab/pt-br/atuacao/informacoes-agropecuarias/hortigranjeiros-prohort/centrais-de-abastecimento-comercializacao-de-frutas-e-hortalicas-2025.pdf", tipo: "artigo", nota: "Panorama anual de volumes e preços nas CEASAs." },
          { titulo: "IBGE — Pesquisa de Orçamentos Familiares (POF)", url: "https://www.ibge.gov.br/estatisticas/sociais/saude/9050-pesquisa-de-orcamentos-familiares.html", tipo: "dataset", nota: "Consumo e peso de cada alimento na cesta: pondera a importância de cada sazonalidade." },
        ] },
        { tipo: "video", titulo: "Decompondo e prevendo uma série temporal no Excel (parte IV)", youtube: "DcFYV_xh3fg" },
      ],
    },
    // ===================== PÁGINA FINAL — PRANCHA DE SÍNTESE =====================
    {
      id: "compilado",
      titulo: "Prancha de síntese",
      blocos: [
        { tipo: "texto", texto: "O caderno inteiro cabe em uma frase: deflacione, calcule a média móvel centrada de 12 meses, divida o observado pela média, tire a média por mês e normalize para 100 — e você terá o mapa de quando cada produto fica barato ou caro na feira. O resto é disciplina de coleta, honestidade com os choques e a humildade de chamar o especialista quando o modelo ou o calendário agronômico pedem carimbo. A sazonalidade é um padrão real, mas vivo: medir é só o começo de decidir melhor." },
        { tipo: "compilado" },
      ],
    },
  ],
};
