import type { CadernoEstudo } from "../cadernosEstudo";

/**
 * Caderno de campo: "A história dos mercados municipais e das feiras livres".
 * Humanas — história urbana e social do abastecimento. Da ágora grega ao macellum romano,
 * dos mercados de ferro do século XIX ao Mercadão (1933) e às feiras livres de São Paulo (1914).
 * Todo dado, data, número e norma tem lastro em fonte real (ver páginas "fontes" ao longo do caderno).
 */
export const caderno: CadernoEstudo = {
  id: "mercados-municipais",
  titulo: "A história dos mercados municipais e das feiras livres",
  resumo:
    "Da ágora grega e do macellum romano aos mercados de ferro do século XIX, ao Mercadão de SP (1933) e à feira livre (1914): como a cidade se alimenta — com fontes, casos reais e um roteiro de pesquisa de campo.",
  paginas: [
    // ===================== CONTEXTO =====================
    {
      id: "abertura",
      titulo: "O que é um mercado municipal e uma feira livre",
      blocos: [
        { tipo: "texto", texto: "Toda cidade precisa resolver um problema básico todo dia: como levar comida do campo até a mesa de quem mora apertado, sem roça por perto. O mercado municipal e a feira livre são duas respostas antigas a essa pergunta. O MERCADO MUNICIPAL é um edifício fixo, público, onde bancas vendem alimentos e gêneros o ano inteiro. A FEIRA LIVRE é o mercado itinerante: monta de manhã na rua, vende e desmonta à tarde, mudando de bairro conforme o dia da semana." },
        { tipo: "texto", texto: "Os dois são parentes. Na maioria das cidades, a feira veio primeiro — gente vendendo na praça — e, quando o movimento virou permanente, o poder público construiu um prédio para abrigar e organizar o comércio. Este caderno percorre essa história, da Grécia antiga ao Ver-o-Peso de Belém, e termina com um roteiro para você pesquisar o mercado da sua própria cidade." },
        { tipo: "diagrama", titulo: "Mercado municipal x feira livre", codigo: `flowchart TD
  ABA["Como a cidade se abastece"] --> M["Mercado municipal"]
  ABA --> F["Feira livre"]
  M --> M1["Edificio fixo e publico"]
  M --> M2["Abre o ano inteiro"]
  F --> F1["Itinerante: monta e desmonta"]
  F --> F2["Gira pelos bairros por dia da semana"]` },
      ],
    },
    {
      id: "porque",
      titulo: "Por que as cidades inventaram o mercado",
      blocos: [
        { tipo: "texto", texto: "Enquanto quase todo mundo plantava o próprio alimento, não havia mercado: cada família se bastava. O mercado nasce com a CIDADE — o lugar onde muita gente vive sem produzir comida e precisa comprá-la. Quanto maior a cidade, mais central fica a pergunta do abastecimento: onde vender, quem fiscaliza o peso, como garantir que o preço não exploda numa seca. O mercado é a instituição que a humanidade criou para dar conta disso." },
        { tipo: "texto", texto: "Por isso a história do mercado é também a história do poder urbano. Quem controla o abastecimento controla a paz da cidade: a fome vira revolta. Reis, câmaras e prefeituras sempre meteram a mão no comércio de alimentos — fixando locais, cobrando taxas, pesando a balança do feirante. Estudar mercados é estudar como a cidade se governa pela barriga." },
        {
          tipo: "licao",
          pergunta: "Por que o mercado só surge junto com a cidade?",
          alternativas: [
            "Porque a cidade tem mais terra para plantar",
            "Porque na cidade muita gente vive sem produzir o próprio alimento e precisa comprá-lo",
            "Porque o campo não tem comida",
          ],
          correta: 1,
          explicacao: "O mercado resolve o abastecimento de quem não planta. Onde cada família produz o que consome, não há necessidade de comprar — logo, não há mercado.",
        },
      ],
    },
    {
      id: "agora",
      titulo: "A ágora grega: comprar e ser cidadão no mesmo lugar",
      blocos: [
        { tipo: "texto", texto: "Na Grécia antiga, a palavra ÁGORA começou designando o espaço onde os cidadãos livres se reuniam para política e assuntos da cidade — e passou a significar também o mercado ao ar livre. Na Atenas clássica, a mesma praça tinha templos, estátuas e bancas: você discutia a democracia e comprava azeite no mesmo lugar. Comércio e cidadania dividiam o chão." },
        { tipo: "texto", texto: "A ágora já tinha fiscais: os AGORANOMOI cuidavam da ordem, dos pesos e das medidas. E tinha padroeiro: Hermes era o deus dos mercados, dos caminhos e dos limites — protetor de quem vendia e de quem viajava para vender. Ou seja, 2.500 anos atrás, as peças centrais de qualquer feira já estavam lá: um lugar, um fiscal e uma régua de confiança." },
        {
          tipo: "prancha",
          titulo: "A ágora de Atenas",
          desenho: {
            legenda: "Praça central cercada por colunas (stoá), com bancas, templo e os fiscais (agoranomoi).",
            primitivas: [
              { t: "retangulo", p: [30, 50], w: 260, h: 110, cor: "tinta" },
              { t: "rotulo", p: [120, 42], texto: "AGORA" },
              { t: "linha", de: [30, 70], ate: [290, 70], cor: "suave" },
              { t: "rotulo", p: [36, 66], texto: "stoa (colunata)" },
              { t: "circulo", c: [70, 110], r: 10, hachura: true },
              { t: "circulo", c: [105, 120], r: 10, hachura: true },
              { t: "circulo", c: [140, 110], r: 10, hachura: true },
              { t: "rotulo", p: [60, 150], texto: "bancas" },
              { t: "retangulo", p: [205, 95], w: 55, h: 45 },
              { t: "rotulo", p: [210, 120], texto: "templo" },
              { t: "seta", de: [175, 90], ate: [175, 108], cor: "destaque" },
              { t: "rotulo", p: [150, 86], texto: "agoranomos (fiscal)" },
            ],
          },
        },
      ],
    },
    {
      id: "roma",
      titulo: "Roma: o mercado vira edifício (o macellum)",
      blocos: [
        { tipo: "texto", texto: "Roma deu o passo seguinte: tirou o mercado do descampado e colocou num prédio próprio. O FÓRUM era a praça pública cercada por arquitetura planejada; e, para o comércio de alimentos, os romanos criaram o MACELLUM — um edifício de mercado, em geral com um pátio central cercado de lojas (tabernae), onde se vendiam carne, peixe e hortaliças. É o ancestral direto do nosso mercado municipal coberto." },
        { tipo: "texto", texto: "O macellum herdou a forma das ágoras comerciais gregas e se espalhou por todo o Império — conhecem-se cerca de 130 deles, da Itália à Península Ibérica. Repare no salto: da praça aberta e provisória para um edifício fixo, com planta pensada, destinado só a vender comida. Essa é exatamente a ideia que ressurge com força no século XIX." },
        {
          tipo: "prancha",
          titulo: "Planta de um macellum romano",
          desenho: {
            legenda: "Pátio central com fonte (tholos) cercado por lojas (tabernae) em todos os lados.",
            primitivas: [
              { t: "retangulo", p: [40, 35], w: 220, h: 130, cor: "tinta" },
              { t: "circulo", c: [150, 100], r: 24, cor: "destaque" },
              { t: "rotulo", p: [128, 103], texto: "fonte" },
              { t: "retangulo", p: [50, 45], w: 40, h: 28, hachura: true },
              { t: "retangulo", p: [95, 45], w: 40, h: 28, hachura: true },
              { t: "retangulo", p: [165, 45], w: 40, h: 28, hachura: true },
              { t: "retangulo", p: [210, 45], w: 40, h: 28, hachura: true },
              { t: "retangulo", p: [50, 127], w: 40, h: 28, hachura: true },
              { t: "retangulo", p: [210, 127], w: 40, h: 28, hachura: true },
              { t: "rotulo", p: [95, 185], texto: "tabernae = lojas em volta" },
            ],
          },
        },
        {
          tipo: "licao",
          pergunta: "O que o macellum romano representa na história do mercado?",
          alternativas: [
            "A volta da feira itinerante",
            "A passagem da praça aberta para um edifício fixo dedicado a vender alimentos",
            "O fim do comércio de comida",
          ],
          correta: 1,
          explicacao: "O macellum é o mercado virado arquitetura: pátio e lojas pensados só para o comércio de gêneros. É o avô do mercado municipal coberto.",
        },
        {
          tipo: "fontes",
          titulo: "Fontes da Antiguidade",
          itens: [
            { titulo: "Ágora — World History Encyclopedia (em português)", url: "https://www.worldhistory.org/trans/pt/1-512/agora", tipo: "artigo", nota: "Ágora como espaço cívico e comercial; agoranomoi e Hermes protetor dos mercados." },
            { titulo: "El macellum: origen y difusión del mercado romano (SPAL / Univ. de Sevilla)", url: "https://revistascientificas.us.es/index.php/spal/article/download/23150/21530/112044", tipo: "artigo", nota: "Origem do macellum na ágora helenística; cerca de 130 exemplares no Império." },
          ],
        },
      ],
    },
    {
      id: "medieval",
      titulo: "A Idade Média: a praça de mercado e a carta de feira",
      blocos: [
        { tipo: "texto", texto: "Com a queda de Roma, as grandes cidades minguaram e o comércio encolheu. Mas, do século XI em diante, a vida urbana renasceu na Europa em torno de um ponto fixo: a PRAÇA DE MERCADO. Quase toda cidade medieval tinha a sua, muitas vezes do lado da igreja — Deus e o pão perto um do outro. Ali ficava o cruzeiro, a balança pública e a casa do conselho que cobrava a taxa." },
        { tipo: "texto", texto: "Para funcionar, a feira precisava de autorização: o rei ou o senhor concedia uma CARTA DE FEIRA (market charter), um documento que dava à cidade o direito de realizar mercado em dias certos e cobrar por isso. Era a licença medieval do abastecimento. Daí nascem duas marcas que chegam até hoje: o mercado acontece em local e dia definidos, e alguém de fora — a autoridade — regula e taxa." },
        { tipo: "diagrama", titulo: "Como a feira medieval era autorizada", codigo: `flowchart TD
  C["Cidade quer mercado"] --> R["Pede ao rei ou senhor"]
  R --> CA["Carta de feira concedida"]
  CA --> D["Define dias e local fixos"]
  CA --> T["Autoriza cobranca de taxa"]
  D --> P["Praca de mercado ao lado da igreja"]` },
      ],
    },
    // ===================== LEITURA DO TEMA (séc. XIX e Brasil) =====================
    {
      id: "ferro",
      titulo: "O século XIX e a revolução do ferro: Les Halles",
      blocos: [
        { tipo: "texto", texto: "A Revolução Industrial inchou as cidades e trouxe um material novo: o ferro fundido. Pela primeira vez foi possível cobrir grandes vãos com estruturas leves, cheias de luz e ar — perfeito para um mercado higiênico, longe da lama da rua. O marco mundial é Les Halles, de Paris: entre 1852 e 1870, os arquitetos Victor Baltard e Félix Callet ergueram pavilhões de ferro e vidro que viraram referência." },
        { tipo: "texto", texto: "A sacada de Baltard foi organizar os pavilhões por tipo de mercadoria, ligados por passagens cobertas. Les Halles era tão central na vida parisiense que Émile Zola a chamou de 'o ventre de Paris'. O mercado funcionou por mais de um século; foi demolido em 1971 e o atacado mudou para o subúrbio de Rungis. O modelo de ferro, porém, se espalhou pela Europa e cruzou o Atlântico — inclusive para o Brasil." },
        {
          tipo: "prancha",
          titulo: "O pavilhão de ferro e vidro",
          desenho: {
            legenda: "Estrutura leve: colunas de ferro, telhado em duas águas e lanternim de vidro para luz e ventilação.",
            primitivas: [
              { t: "linha", de: [30, 150], ate: [290, 150], cor: "tinta" },
              { t: "linha", de: [50, 150], ate: [50, 90], cor: "tinta" },
              { t: "linha", de: [270, 150], ate: [270, 90], cor: "tinta" },
              { t: "linha", de: [150, 150], ate: [150, 90], cor: "suave" },
              { t: "linha", de: [50, 90], ate: [150, 55], cor: "tinta" },
              { t: "linha", de: [150, 55], ate: [270, 90], cor: "tinta" },
              { t: "retangulo", p: [120, 40], w: 60, h: 18, cor: "destaque" },
              { t: "rotulo", p: [122, 35], texto: "lanternim (vidro)" },
              { t: "rotulo", p: [35, 175], texto: "colunas de ferro fundido" },
              { t: "seta", de: [90, 70], ate: [110, 60], cor: "destaque" },
            ],
          },
        },
        {
          tipo: "fontes",
          titulo: "Fontes do mercado de ferro",
          itens: [
            { titulo: "Les Halles — Wikipedia (inglês)", url: "https://en.wikipedia.org/wiki/Les_Halles", tipo: "site", nota: "Baltard e Callet (1852-1870); pavilhões por mercadoria; demolição em 1971 e mudança para Rungis." },
            { titulo: "L'architecture métallique sous le Second Empire (Fondation Napoléon)", url: "https://www.napoleon.org/histoire-des-2-empires/articles/larchitecture-metallique-sous-le-second-empire/", tipo: "artigo", nota: "O ferro na arquitetura do Segundo Império e o papel de Les Halles." },
          ],
        },
        {
          tipo: "licao",
          pergunta: "Qual foi a grande novidade construtiva de Les Halles?",
          alternativas: [
            "Usar pedra e taipa como na Antiguidade",
            "Estruturas de ferro e vidro, com pavilhões organizados por tipo de mercadoria",
            "Vender apenas ao ar livre, sem cobertura",
          ],
          correta: 1,
          explicacao: "O ferro fundido permitiu grandes coberturas iluminadas; Baltard separou os pavilhões por mercadoria e os ligou por passagens — o modelo que o mundo copiou.",
        },
      ],
    },
    {
      id: "brasil-colonia",
      titulo: "O Brasil: feiras que vieram de Portugal",
      blocos: [
        { tipo: "texto", texto: "No Brasil, o costume de feira chegou com os colonizadores portugueses, que já traziam a tradição das feiras e mercados ibéricos. Desde a época colonial há registros de gente vendendo gêneros em largos, adros de igreja e portos. Em cidades como Salvador, Recife e Rio de Janeiro, o abastecimento acontecia em pontos de rua, com forte presença de vendedoras negras — as quitandeiras e ganhadeiras — que foram, por séculos, a espinha dorsal do comércio de comida de rua." },
        { tipo: "texto", texto: "Nessas feiras coloniais já aparecia a tensão que atravessa todo o caderno: de um lado, o vendedor que precisa de um ponto para ganhar a vida; de outro, a Câmara que quer organizar, higienizar e tributar. O mercado municipal de alvenaria, mais tarde, será a tentativa de resolver essa tensão metendo todo mundo sob um teto controlado." },
      ],
    },
    {
      id: "brasil-mercados",
      titulo: "Os mercados municipais no Brasil (fim do século XIX)",
      blocos: [
        { tipo: "texto", texto: "É no fim do século XIX e começo do XX que os mercados municipais brasileiros ganham corpo. Muitos nasceram justamente das feiras de rua: quando o vaivém virou permanente, a Câmara construiu um edifício para abrigar e regular o comércio. Vários desses prédios usaram estrutura de ferro, às vezes pré-fabricada na Europa e montada aqui — a moda que vinha de Les Halles. O Mercado Municipal de Jacareí (SP), por exemplo, teve sua primeira construção em 1876." },
        { tipo: "texto", texto: "A lógica era sempre parecida: tirar a comida do barro da rua, concentrar os vendedores num lugar fiscalizável, cobrar aluguel das bancas e oferecer à cidade um ponto de abastecimento digno de uma capital moderna. O mercado municipal virou, assim, cartão-postal e símbolo de progresso — tanto quanto a estação de trem ou o teatro." },
        { tipo: "video", titulo: "Mercado Municipal de São Paulo: conheça a história do ponto turístico", youtube: "qOc4sQe_Bfc" },
        { tipo: "diagrama", titulo: "Da feira de rua ao mercado de alvenaria", codigo: `flowchart TD
  F["Feira na rua"] --> P["Movimento vira permanente"]
  P --> N["Camara ve bagunca e sujeira"]
  N --> E["Constroi edificio fixo"]
  E --> R["Regula, fiscaliza e cobra aluguel das bancas"]
  R --> S["Mercado vira cartao-postal da cidade"]` },
      ],
    },
    {
      id: "veropeso",
      titulo: "Ver-o-Peso: o ferro inglês e o Ciclo da Borracha",
      blocos: [
        { tipo: "texto", texto: "O exemplo mais famoso de mercado de ferro no Brasil é o Ver-o-Peso, em Belém do Pará. O nome vem do tempo da Coroa portuguesa, quando havia ali a 'Casa de Ver-o-Peso', onde se conferia o peso das mercadorias para cobrar imposto — o fisco batizou o lugar. O célebre Mercado de Ferro foi pré-fabricado na Europa e montado em Belém, inaugurado em 1901, no auge do Ciclo da Borracha, quando a cidade nadava em dinheiro e queria luxo europeu." },
        { tipo: "texto", texto: "Hoje o complexo do Ver-o-Peso é considerado a maior feira a céu aberto das Américas e reúne o Mercado de Ferro, o Mercado de Carne, a pedra do peixe, as erveiras com seus cheiros amazônicos e as docas. É patrimônio: o Iphan inventariou suas referências culturais. Ver-o-Peso mostra o mercado em três camadas de uma vez — fisco colonial, arquitetura de ferro e cultura popular viva." },
        {
          tipo: "prancha",
          titulo: "O complexo do Ver-o-Peso",
          desenho: {
            legenda: "A baía, as docas, o Mercado de Ferro com suas torres e a feira a céu aberto ao redor.",
            primitivas: [
              { t: "curva", pts: [[20, 60], [90, 50], [160, 58], [230, 48], [295, 58]], cor: "suave" },
              { t: "rotulo", p: [24, 45], texto: "baia do Guajara" },
              { t: "retangulo", p: [110, 95], w: 90, h: 55, cor: "tinta" },
              { t: "linha", de: [120, 95], ate: [120, 75], cor: "tinta" },
              { t: "linha", de: [190, 95], ate: [190, 75], cor: "tinta" },
              { t: "circulo", c: [120, 72], r: 5, cor: "destaque" },
              { t: "circulo", c: [190, 72], r: 5, cor: "destaque" },
              { t: "rotulo", p: [112, 125], texto: "Mercado de Ferro" },
              { t: "circulo", c: [60, 130], r: 8, hachura: true },
              { t: "circulo", c: [240, 130], r: 8, hachura: true },
              { t: "rotulo", p: [40, 165], texto: "feira a ceu aberto (erveiras, peixe)" },
            ],
          },
        },
        {
          tipo: "fontes",
          titulo: "Fontes do Ver-o-Peso",
          itens: [
            { titulo: "Ver-o-Peso: o maior mercado a céu aberto das Américas (Portal Amazônia)", url: "https://portalamazonia.com/navegador-da-amazonia/vero-o-peso-o-maior-mercado-a-ceu-aberto-das-americas", tipo: "artigo", nota: "Origem do nome no fisco colonial; Mercado de Ferro e a feira amazônica." },
            { titulo: "Ver-o-Peso, Belém — estudo de caso (Cities Alliance, PDF em inglês)", url: "https://www.citiesalliance.org/sites/default/files/2024-11/lavil_casestudy_ver-o-peso_brazil_online_en_lowres.pdf", tipo: "artigo", nota: "O complexo, seu valor patrimonial e os desafios urbanos atuais." },
          ],
        },
      ],
    },
    {
      id: "mercadao",
      titulo: "O Mercadão de São Paulo (1933)",
      blocos: [
        { tipo: "texto", texto: "O Mercado Municipal de São Paulo — o Mercadão — foi inaugurado em 25 de janeiro de 1933, projetado pelo escritório de Ramos de Azevedo, com o arquiteto Felisberto Ranzini à frente do desenho. Pensado como grande entreposto de atacado e varejo, virou símbolo da capital. Seus famosos vitrais, com dezenas de janelas em painéis que retratam a produção de alimentos (lavoura, pesca, pecuária), dão ao prédio o apelido de 'catedral do comércio'." },
        { tipo: "texto", texto: "Uma curiosidade conta a história do país pela história do prédio: terminado às vésperas da Revolução Constitucionalista de 1932, o Mercadão chegou a servir de depósito de armas e munição antes de abrir como mercado. Hoje é parada obrigatória de turismo gastronômico — do sanduíche de mortadela ao pastel de bacalhau — mas segue, no andar de baixo, sendo um entreposto de frutas, cereais e temperos." },
        { tipo: "video", titulo: "Mercadão de SP completa 90 anos com muita história", youtube: "oDSVZxqHkNI" },
        { tipo: "video", titulo: "São Paulo de A a Z — Mercado Municipal (parte 1/3)", youtube: "h8-i6jddYV8" },
        {
          tipo: "fontes",
          titulo: "Fontes do Mercadão",
          itens: [
            { titulo: "Mercado Municipal de São Paulo (São Paulo Secreto)", url: "https://saopaulosecreto.com/mercado-municipal-de-sao-paulo/", tipo: "site", nota: "Inauguração em 1933, projeto de Ramos de Azevedo e Felisberto Ranzini." },
            { titulo: "Vitrais do Mercadão (Sesc São Paulo)", url: "https://portal.sescsp.org.br/online/artigo/compartilhar/12334_VITRAIS+DO+MERCADAO", tipo: "artigo", nota: "Os vitrais e suas cenas de produção de alimentos." },
            { titulo: "Você sabia que o Mercadão já foi depósito de armas? (Gazeta SP)", url: "https://www.gazetasp.com.br/cotidiano/memoria-voce-sabia-que-o-mercadao-ja-foi-um-deposito-de-armas/1106402", tipo: "artigo", nota: "O uso militar do prédio na Revolução de 1932, antes da abertura." },
          ],
        },
      ],
    },
    {
      id: "feiras-sp",
      titulo: "1914: a feira livre vira oficial em São Paulo",
      blocos: [
        { tipo: "texto", texto: "A feira livre paulistana, como instituição regulada, nasce em 1914, por ato do prefeito Washington Luís — um reconhecimento oficial de uma prática que já existia há tempos na cidade. A primeira feira oficial reuniu poucas dezenas de feirantes, e o modelo pegou: a feira que gira pelos bairros, dia a dia, perto de casa. Por isso o Dia do Feirante é celebrado em 25 de agosto, lembrando essa regulamentação." },
        { tipo: "texto", texto: "Há quem recue a data: alguns registros falam de uma regulamentação já em 1909, por decreto de um vereador. O número exato do ato de 1914 também varia entre as fontes. O importante é a virada: a partir dali, vender na feira deixou de ser só um costume tolerado e passou a ser um direito regulado — com local, dia, licença e fiscalização, herdeiros diretos da carta de feira medieval." },
        { tipo: "video", titulo: "Há 100 anos, feiras livres ocupam ruas da Capital", youtube: "c7tiUR8czCI" },
        {
          tipo: "licao",
          pergunta: "O que mudou com o ato de 1914 em São Paulo?",
          alternativas: [
            "A feira foi proibida na cidade",
            "A feira livre passou de costume tolerado a prática oficialmente regulada (local, dia, licença)",
            "Todos os mercados de alvenaria foram demolidos",
          ],
          correta: 1,
          explicacao: "1914 oficializou a feira livre: o poder público reconheceu e regulou a prática. Daí o Dia do Feirante, 25 de agosto.",
        },
        {
          tipo: "fontes",
          titulo: "Fontes da feira livre paulistana",
          itens: [
            { titulo: "Entenda como surgiram as feiras livres (Gazeta SP)", url: "https://www.gazetasp.com.br/estilo-de-vida/entenda-como-surgiu-as-feiras-livres-desde-o-surgimento-ate-os-dias/", tipo: "artigo", nota: "O ato de 1914 do prefeito Washington Luís e a história da feira." },
            { titulo: "Feiras livres de SP completam 100 anos em 2014 (Câmara Municipal de SP)", url: "https://www.saopaulo.sp.leg.br/blog/feiras-livres-de-sp-completam-100-anos-em-2014/", tipo: "site", nota: "Centenário da regulamentação e sua história institucional." },
            { titulo: "Feiras livres completam 111 anos na capital (Prefeitura de São Paulo)", url: "https://prefeitura.sp.gov.br/w/feiras-livres-completam-111-anos-de-funcionamento-na-capital", tipo: "site", nota: "Números atuais da rede de feiras e o marco de 1914." },
          ],
        },
      ],
    },
    {
      id: "greve-1917",
      titulo: "1917: a greve que garantiu a feira",
      blocos: [
        { tipo: "texto", texto: "A feira livre não sobreviveu só por decreto — também por luta. Na Greve Geral de 1917 em São Paulo, momento decisivo da história operária brasileira, a feira livre entrou na pauta: o acesso popular a alimentos baratos, sem o intermediário que encarecia tudo, era bandeira dos trabalhadores. A pressão social ajudou a firmar a feira como política de abastecimento a favor de quem ganha pouco." },
        { tipo: "texto", texto: "Esse episódio ensina algo que vale para qualquer mercado: ele nunca é só comércio. É arena de disputa entre quem produz, quem revende e quem come. A feira barata é uma conquista política tanto quanto um arranjo econômico — e pode ser perdida se ninguém a defender." },
        {
          tipo: "fontes",
          itens: [
            { titulo: "1917: a história da greve que garantiu as feiras livres em SP (Brasil de Fato)", url: "https://www.brasildefato.com.br/2020/02/21/1917-a-historia-da-greve-que-garantiu-as-feiras-livres-na-cidade-de-sao-paulo", tipo: "artigo", nota: "A feira livre como pauta da Greve Geral de 1917." },
          ],
        },
      ],
    },
    // ===================== MÉTODO (pesquisa de campo) =====================
    {
      id: "metodo",
      titulo: "Como estudar um mercado de verdade",
      blocos: [
        { tipo: "texto", texto: "Agora o caderno vira roteiro. Para pesquisar o mercado da sua cidade, trabalhe como um historiador urbano: cruze três tipos de evidência. OBSERVAÇÃO (ir lá, olhar, mapear), DOCUMENTO (decretos, plantas, jornais antigos) e TESTEMUNHO (ouvir feirantes e fregueses). Nenhuma fonte sozinha conta a história toda; a verdade aparece no cruzamento delas." },
        { tipo: "diagrama", titulo: "O tripé da pesquisa de campo", codigo: `flowchart TD
  M["Entender um mercado"] --> O["Observacao: ir, olhar, mapear"]
  M --> D["Documento: decreto, planta, jornal"]
  M --> T["Testemunho: feirantes e fregueses"]
  O --> X["Cruzar as tres"]
  D --> X
  T --> X
  X --> H["Historia bem fundamentada"]` },
        {
          tipo: "tarefas",
          itens: [
            { id: "escolher-mercado", titulo: "Escolha seu mercado", entrega: "Escolha um mercado municipal ou feira livre da sua cidade. Anote nome, endereço, dia(s) de funcionamento e uma primeira pergunta que você quer responder sobre ele." },
            { id: "primeira-visita", titulo: "Faça a primeira visita", entrega: "Vá ao local em horário de movimento. Registre em meia página: o que te chamou atenção, cheiros, sons, quem são os vendedores e quem são os compradores." },
          ],
        },
      ],
    },
    {
      id: "fontes-primarias",
      titulo: "Onde está a memória: arquivo, decreto e jornal",
      blocos: [
        { tipo: "texto", texto: "A história documental de um mercado costuma estar em quatro lugares: o ARQUIVO da Câmara ou Prefeitura (atas, decretos de criação, plantas); o DIÁRIO OFICIAL do município (a norma que regula a feira); os JORNAIS ANTIGOS, hoje digitalizados em hemerotecas (inaugurações, brigas, incêndios); e os ESTUDOS ACADÊMICOS (teses e artigos que já reuniram essa papelada). Comece pelos estudos: alguém provavelmente já fez parte do trabalho por você." },
        { tipo: "texto", texto: "Regra de ouro do caderno: não afirme sem lastro. Toda data, todo número, todo 'dizem que' precisa de uma fonte que você possa mostrar. Se encontrar duas fontes que discordam — como vimos no ato de 1914 ou no ano de Les Halles — registre as duas e diga qual é mais confiável, em vez de escolher uma e esconder a outra." },
        {
          tipo: "fontes",
          titulo: "Fontes acadêmicas de partida",
          itens: [
            { titulo: "Os mercados públicos: história e abastecimento urbano (Labore / Unicamp)", url: "https://periodicos.sbu.unicamp.br/ojs/index.php/labore/article/download/8668207/30047/132483", tipo: "artigo", nota: "Panorama acadêmico dos mercados públicos como instituição de abastecimento." },
            { titulo: "Mercados públicos e feiras: estudo de caso (INIC / Univap, PDF)", url: "https://www.inicepg.univap.br/cd/INIC_2023/anais/arquivos/RE_0792_0464_01.pdf", tipo: "artigo", nota: "Mercados municipais do Vale do Paraíba; cita Jacareí (1876)." },
          ],
        },
      ],
    },
    {
      id: "historia-oral",
      titulo: "A voz do feirante: história oral",
      blocos: [
        { tipo: "texto", texto: "Documento não guarda cheiro, nem rotina, nem a briga de 1980 que só o seu Zé lembra. Isso está na memória de quem viveu o mercado. A HISTÓRIA ORAL é o método de registrar esses testemunhos com rigor: entrevista planejada, gravada com autorização, transcrita e cruzada com os documentos. É a fonte que dá carne à cronologia seca dos decretos." },
        { tipo: "texto", texto: "Uma boa entrevista não começa em 'conte sua vida', mas em perguntas concretas e abertas: 'Como era o mercado quando o senhor começou?', 'O que mudou na freguesia?', 'Qual foi o pior dia aqui?'. Deixe a pessoa falar, não corrija a memória dela na hora — contradições são dados, não erros." },
        {
          tipo: "mobilizacao",
          papel: "Historiador(a) ou arquivista com experiência em história oral",
          porque: "Transformar depoimentos em fonte confiável exige método: roteiro, termo de consentimento, guarda ética das gravações e cruzamento com documentos. Feito sem rigor, vira anedota sem valor de prova; feito com rigor, vira patrimônio.",
          entregaEsperada: "Roteiro de entrevista, termo de consentimento, pelo menos 2 depoimentos gravados e transcritos, e uma nota cruzando o que foi dito com o que os documentos confirmam ou contradizem.",
          gerenciadoPor: "zaeon",
        },
        {
          tipo: "tarefas",
          itens: [
            { id: "roteiro-entrevista", titulo: "Monte um roteiro", entrega: "Escreva 6 perguntas abertas para entrevistar um feirante antigo. Nenhuma pode ser respondida só com sim ou não." },
          ],
        },
      ],
    },
    {
      id: "cartografia",
      titulo: "Mapear o mercado: planta e fluxo",
      blocos: [
        { tipo: "texto", texto: "Desenhar a planta do mercado revela coisas que o olho solto não vê: por que a peixaria fica perto da água e do esgoto, por que o açougue tem câmara fria, por que a entrada principal dá para o ponto de ônibus. O mercado é uma máquina de fluxo — mercadoria entra pela doca, sobe para as bancas, sai na sacola do freguês. Mapear é entender essa engrenagem." },
        {
          tipo: "prancha",
          titulo: "Planta esquemática de um mercado municipal",
          desenho: {
            legenda: "Doca de carga nos fundos; corredores com bancas por setor; praça de alimentação; entrada para a rua.",
            primitivas: [
              { t: "retangulo", p: [30, 30], w: 250, h: 140, cor: "tinta" },
              { t: "retangulo", p: [30, 30], w: 250, h: 22, hachura: true },
              { t: "rotulo", p: [95, 45], texto: "doca de carga (fundos)" },
              { t: "linha", de: [95, 60], ate: [95, 150], cor: "suave" },
              { t: "linha", de: [160, 60], ate: [160, 150], cor: "suave" },
              { t: "linha", de: [220, 60], ate: [220, 150], cor: "suave" },
              { t: "rotulo", p: [52, 110], texto: "hortifruti" },
              { t: "rotulo", p: [112, 110], texto: "acougue" },
              { t: "rotulo", p: [172, 110], texto: "peixe" },
              { t: "rotulo", p: [228, 110], texto: "praca" },
              { t: "seta", de: [155, 180], ate: [155, 170], cor: "destaque" },
              { t: "rotulo", p: [120, 193], texto: "entrada (rua)" },
            ],
          },
        },
        {
          tipo: "tarefas",
          itens: [
            { id: "planta-mercado", titulo: "Desenhe a planta", entrega: "Faça um croqui do seu mercado com as entradas, os setores (hortifruti, carnes, etc.) e por onde a mercadoria chega. Marque o caminho que um freguês faz da porta até a compra." },
          ],
        },
      ],
    },
    // ===================== CÁLCULO / MEDIÇÃO =====================
    {
      id: "numeros-feira",
      titulo: "Medir a feira: feirantes, metros e giro",
      blocos: [
        { tipo: "texto", texto: "Quem quer entender ou defender um mercado precisa de números. Numa feira livre, os básicos são: quantas BANCAS (feirantes autorizados), quantos METROS de rua ela ocupa, qual o horário de montagem e desmontagem, e quantos FREGUESES passam por hora de pico. Em São Paulo, por exemplo, a rede municipal passa de 900 feiras — um sistema de abastecimento gigante e pouco percebido." },
        {
          tipo: "prancha",
          titulo: "Contagem simples de fluxo",
          desenho: {
            legenda: "Conte fregueses por faixa de horário: o pico revela quando a feira mais serve a cidade.",
            primitivas: [
              { t: "linha", de: [40, 30], ate: [40, 160], cor: "tinta" },
              { t: "linha", de: [40, 160], ate: [295, 160], cor: "tinta" },
              { t: "retangulo", p: [60, 120], w: 30, h: 40, hachura: true },
              { t: "rotulo", p: [58, 175], texto: "7h" },
              { t: "retangulo", p: [110, 70], w: 30, h: 90, hachura: true, cor: "destaque" },
              { t: "rotulo", p: [108, 175], texto: "9h" },
              { t: "retangulo", p: [160, 95], w: 30, h: 65, hachura: true },
              { t: "rotulo", p: [158, 175], texto: "11h" },
              { t: "retangulo", p: [210, 140], w: 30, h: 20, hachura: true },
              { t: "rotulo", p: [205, 175], texto: "13h" },
              { t: "rotulo", p: [100, 60], texto: "pico" },
            ],
          },
        },
        {
          tipo: "tarefas",
          itens: [
            { id: "contagem", titulo: "Faça a contagem", entrega: "No seu mercado, conte as bancas e meça (a passos) quantos metros ocupa. Se der, conte fregueses por 10 minutos em dois horários diferentes e compare." },
          ],
        },
      ],
    },
    {
      id: "economia",
      titulo: "A economia do abastecimento: atacado x varejo",
      blocos: [
        { tipo: "texto", texto: "Siga um tomate até a banca e você entende a cidade. Ele sai do produtor, passa por um ATACADISTA (que compra em grande quantidade), chega ao VAREJISTA (o feirante, que vende unidade a unidade) e termina na sua sacola. Cada elo põe seu preço. O mercado municipal clássico junta atacado e varejo no mesmo prédio; a feira livre é quase só varejo. Entender essa cadeia explica por que a feira às vezes é mais barata — ela corta intermediários." },
        { tipo: "diagrama", titulo: "A cadeia do abastecimento", codigo: `flowchart TD
  PR["Produtor rural"] --> AT["Atacadista / entreposto (CEASA)"]
  AT --> VA["Varejista: feirante ou banca do mercado"]
  VA --> FR["Freguesia (quem cozinha)"]
  PR -. venda direta na feira .-> VA` },
        {
          tipo: "licao",
          pergunta: "Por que a feira livre costuma cortar preço em relação ao supermercado?",
          alternativas: [
            "Porque vende comida pior",
            "Porque encurta a cadeia, com menos intermediários entre produtor e freguês",
            "Porque não paga nenhum imposto",
          ],
          correta: 1,
          explicacao: "Quanto menos elos entre a roça e a sacola, menor a soma das margens. A feira aproxima produtor e varejo do consumidor.",
        },
      ],
    },
    {
      id: "ceasa",
      titulo: "A CEASA e a modernização do abastecimento",
      blocos: [
        { tipo: "texto", texto: "A partir dos anos 1960 e 1970, o Brasil criou as CEASAs (Centrais de Abastecimento), grandes entrepostos atacadistas nas bordas das cidades, para onde a mercadoria do campo passa a convergir antes de se espalhar por feiras, mercados e sacolões. Com isso, o velho mercado municipal do centro perdeu a função de atacado — virou mais varejo, turismo e gastronomia — enquanto o 'músculo' do abastecimento foi para a CEASA." },
        { tipo: "texto", texto: "Essa mudança explica por que tantos mercados históricos entraram em crise no fim do século XX: esvaziados da função original, muitos ficaram abandonados ou foram requalificados como pontos turísticos. Entender a CEASA é entender por que o mercado do seu centro hoje vende mais pastel e queijo especial do que caixa de tomate no atacado." },
        {
          tipo: "fontes",
          itens: [
            { titulo: "Mercados municipais: cultura e territorialidade no Brasil (Gaia / UFPB)", url: "https://periodicos.ufpb.br/index.php/gaia/article/download/52758/32649?inline=1", tipo: "artigo", nota: "O deslocamento do atacado para as CEASAs e os novos papéis do mercado municipal." },
          ],
        },
      ],
    },
    // ===================== PROJETO =====================
    {
      id: "tipologia",
      titulo: "Tipologias: mercado, feira, sacolão, box",
      blocos: [
        { tipo: "texto", texto: "Antes de projetar ou organizar, é preciso nomear. O abastecimento popular tem várias formas: o MERCADO MUNICIPAL (edifício fixo com bancas permanentes); a FEIRA LIVRE (itinerante, na rua, por dias); o SACOLÃO ou varejão (loja de hortifruti a preço popular, muitas vezes municipal); e o MERCADO DE PRODUTOR (venda direta de quem planta). Cada tipo tem um arranjo de espaço, de licença e de público — e escolher o tipo certo é metade do projeto." },
        { tipo: "diagrama", titulo: "As formas do abastecimento popular", codigo: `flowchart TD
  AB["Abastecimento popular"] --> MM["Mercado municipal: fixo, bancas"]
  AB --> FL["Feira livre: itinerante, na rua"]
  AB --> SA["Sacolao/varejao: hortifruti popular"]
  AB --> MP["Mercado do produtor: venda direta"]` },
      ],
    },
    {
      id: "patrimonio",
      titulo: "Patrimônio: quando o mercado vira monumento",
      blocos: [
        { tipo: "texto", texto: "Muitos mercados viraram PATRIMÔNIO — tombados por seu valor histórico e arquitetônico. O tombamento (pelo Iphan no nível federal, ou por órgãos estaduais e municipais) protege o prédio contra demolição e descaracterização: não se pode mudar a fachada, derrubar a estrutura de ferro ou fechar os vitrais sem autorização técnica. É o que mantém de pé joias como o Ver-o-Peso e o Mercadão." },
        { tipo: "texto", texto: "Mas tombar traz um dilema: o prédio precisa continuar vivo e útil, não virar peça de museu vazia. Conservar a estrutura e, ao mesmo tempo, deixar o mercado funcionar exige projeto de restauro feito por quem entende de patrimônio — não dá para resolver com reforma de pedreiro comum." },
        {
          tipo: "mobilizacao",
          papel: "Arquiteto(a) de restauro / técnico de órgão de patrimônio (Iphan, Condephaat, Conpresp)",
          porque: "Intervir em um mercado tombado exige projeto aprovado pelo órgão de patrimônio, respeitando materiais originais (ferro fundido, vitrais, alvenaria). Obra irregular em bem tombado é crime e descaracteriza o monumento para sempre.",
          entregaEsperada: "Parecer sobre o grau de proteção do bem, diretrizes de intervenção aprovadas pelo órgão competente e projeto de restauro compatível com o uso de mercado.",
          gerenciadoPor: "zaeon",
        },
        {
          tipo: "fontes",
          itens: [
            { titulo: "Mercado Central de Montes Claros: história e patrimônio (dissertação, UFMG)", url: "https://repositorio.ufmg.br/bitstream/1843/31929/1/dissertacao%20com%20ficha.pdf", tipo: "livro", nota: "Caso brasileiro de mercado como patrimônio e disputa pelo espaço." },
            { titulo: "Ver-o-Peso: valor patrimonial e desafios (Cities Alliance, PDF)", url: "https://www.citiesalliance.org/sites/default/files/2024-11/lavil_casestudy_ver-o-peso_brazil_online_en_lowres.pdf", tipo: "artigo", nota: "Patrimônio do Ver-o-Peso e tensão entre preservar e manter vivo." },
          ],
        },
      ],
    },
    {
      id: "requalificacao",
      titulo: "Requalificar sem expulsar: o risco da gentrificação",
      blocos: [
        { tipo: "texto", texto: "Reformar um mercado degradado parece só bom — mas há uma armadilha. Quando a requalificação transforma o mercado popular em polo gourmet caríssimo, os antigos fregueses e feirantes são empurrados para fora: os preços sobem, as bancas de feijão viram cafeterias, e quem sempre comprou ali não cabe mais. Isso se chama GENTRIFICAÇÃO. Um bom projeto moderniza o prédio sem apagar sua função social de alimentar a cidade de baixa renda." },
        {
          tipo: "licao",
          pergunta: "O que caracteriza a gentrificação de um mercado popular?",
          alternativas: [
            "Baixar os preços para todos",
            "Reformar de um jeito que encarece tudo e expulsa os fregueses e feirantes originais",
            "Aumentar o número de bancas de feijão e arroz",
          ],
          correta: 1,
          explicacao: "Gentrificar é valorizar o espaço a ponto de expulsar quem o usava. Requalificar bem é modernizar mantendo o acesso popular.",
        },
      ],
    },
    {
      id: "acessibilidade",
      titulo: "Acessibilidade e circulação para todos",
      blocos: [
        { tipo: "texto", texto: "Mercado é lugar de todo mundo: idoso com carrinho, cadeirante, mãe com bebê, entregador com caixas. Projeto que esquece isso exclui. A norma brasileira de acessibilidade é a ABNT NBR 9050, que define rampas, larguras de corredor, pisos táteis, banheiros adaptados e sinalização. Um corredor onde dois carrinhos não se cruzam, ou uma única escada sem rampa, já basta para travar meia freguesia." },
        {
          tipo: "prancha",
          titulo: "Corredor acessível x corredor travado",
          desenho: {
            legenda: "À esquerda, corredor largo com rampa; à direita, estreito com degrau — barreira para carrinhos e cadeiras.",
            primitivas: [
              { t: "linha", de: [150, 25], ate: [150, 175], cor: "suave" },
              { t: "retangulo", p: [25, 40], w: 100, h: 120, cor: "destaque" },
              { t: "rotulo", p: [40, 34], texto: "ACESSIVEL" },
              { t: "linha", de: [45, 150], ate: [105, 150], cor: "tinta" },
              { t: "linha", de: [45, 150], ate: [75, 120], cor: "tinta" },
              { t: "rotulo", p: [48, 170], texto: "rampa + largura" },
              { t: "retangulo", p: [175, 40], w: 100, h: 120, cor: "tinta" },
              { t: "rotulo", p: [195, 34], texto: "TRAVADO" },
              { t: "retangulo", p: [205, 135], w: 40, h: 15, hachura: true },
              { t: "rotulo", p: [185, 170], texto: "degrau, corredor estreito" },
            ],
          },
        },
        {
          tipo: "tarefas",
          itens: [
            { id: "auditoria-acesso", titulo: "Audite o acesso", entrega: "No seu mercado, teste: um carrinho de feira passa por todos os corredores? Há rampa nas entradas? Banheiro adaptado? Liste as 3 piores barreiras que encontrar." },
          ],
        },
      ],
    },
    // ===================== EXECUÇÃO =====================
    {
      id: "montar-feira",
      titulo: "Como se organiza uma feira livre hoje",
      blocos: [
        { tipo: "texto", texto: "Montar uma feira não é só chegar e abrir a barraca. Na maioria das cidades, a feira é regulada por lei municipal (em São Paulo, por exemplo, há legislação específica de feiras livres). O município define o trajeto, os dias, a metragem de cada banca, o tipo de produto por setor e as taxas. O feirante precisa de uma PERMISSÃO para ocupar o ponto — ele não é dono da rua, é permissionário de um espaço público." },
        { tipo: "diagrama", titulo: "Quem faz a feira acontecer", codigo: `flowchart TD
  PM["Prefeitura: lei e trajeto"] --> FI["Fiscal da feira"]
  PM --> PE["Permissao ao feirante (ponto)"]
  PE --> FE["Feirante monta a banca"]
  FI --> OR["Ordem: setor, metragem, horario"]
  FE --> FR["Freguesia"]` },
        {
          tipo: "fontes",
          itens: [
            { titulo: "Justificativa do projeto sobre o centenário das feiras (Câmara Municipal de SP, PDF)", url: "https://www.saopaulo.sp.leg.br/iah/fulltext/justificativa/JPL0025-2014.pdf", tipo: "norma", nota: "Base legislativa e histórica da regulação das feiras em São Paulo." },
            { titulo: "Feiras livres completam 111 anos na capital (Prefeitura de SP)", url: "https://prefeitura.sp.gov.br/w/feiras-livres-completam-111-anos-de-funcionamento-na-capital", tipo: "site", nota: "Como a rede de feiras é organizada hoje pelo município." },
          ],
        },
      ],
    },
    {
      id: "vigilancia",
      titulo: "Vigilância sanitária: comida segura",
      blocos: [
        { tipo: "texto", texto: "Vender comida é lidar com saúde pública. Carne fora da refrigeração, peixe velho, água sem higiene — tudo isso pode adoecer a cidade. Por isso a VIGILÂNCIA SANITÁRIA fiscaliza mercados e feiras: temperatura das câmaras frias, origem dos produtos, higiene das bancas, validade. No Brasil, a Anvisa dá as diretrizes nacionais, e os serviços municipais de vigilância aplicam na ponta." },
        {
          tipo: "mobilizacao",
          papel: "Fiscal de vigilância sanitária / nutricionista responsável",
          porque: "Avaliar risco sanitário (cadeia do frio, manipulação de alimentos, controle de pragas) e emitir laudos exige formação técnica e poder legal de fiscalização. Um surto de intoxicação numa feira é responsabilidade sanitária, não detalhe.",
          entregaEsperada: "Checklist sanitário aplicado às bancas, laudo apontando não conformidades e um plano de correção com prazos para o mercado ou a feira.",
          gerenciadoPor: "zaeon",
        },
        {
          tipo: "licao",
          pergunta: "Por que a vigilância sanitária é essencial num mercado?",
          alternativas: [
            "Para cobrar mais impostos dos feirantes",
            "Para garantir que o alimento vendido não adoeça a população (frio, higiene, validade)",
            "Para decidir o preço dos produtos",
          ],
          correta: 1,
          explicacao: "A vigilância protege a saúde pública: controla temperatura, higiene e procedência para evitar intoxicações e doenças transmitidas por alimentos.",
        },
      ],
    },
    {
      id: "licenca",
      titulo: "Licença, permissão e o box do feirante",
      blocos: [
        { tipo: "texto", texto: "O ponto de venda é o patrimônio do feirante — mas ele não é dono do chão. Num mercado municipal, a banca (ou BOX) é cedida por permissão ou concessão: o feirante paga ao município e segue regras de uso. Na feira livre, a MATRÍCULA de feirante dá o direito de ocupar um ponto no trajeto. Esses vínculos podem ser transferidos ou herdados dentro das regras — e é por isso que tantas bancas passam de pai para filho." },
        {
          tipo: "tarefas",
          itens: [
            { id: "mapa-licenca", titulo: "Mapeie as regras de licença", entrega: "Descubra como alguém consegue um ponto no seu mercado ou feira: é permissão, concessão, matrícula? Quanto custa? Pode ser transferido? Anote as respostas e a fonte de cada uma." },
          ],
        },
      ],
    },
    {
      id: "logistica",
      titulo: "A logística invisível do dia de feira",
      blocos: [
        { tipo: "texto", texto: "Para você comprar tomate às 9h, uma engrenagem já girou de madrugada. O feirante buscou mercadoria na CEASA pela noite, carregou o caminhão, chegou ao trajeto antes do amanhecer, montou a estrutura de ferro e lona, arrumou a banca por cor e preço, vendeu, e à tarde desmontou tudo e limpou a rua. A feira é um prédio que nasce e morre todo dia. Entender essa logística é respeitar o trabalho que sustenta o abastecimento barato." },
        {
          tipo: "prancha",
          titulo: "O ciclo de um dia de feira",
          desenho: {
            legenda: "Da CEASA de madrugada à rua limpa à tarde: a feira monta e desmonta em um único dia.",
            primitivas: [
              { t: "circulo", c: [55, 60], r: 26, cor: "tinta" },
              { t: "rotulo", p: [40, 62], texto: "4h CEASA" },
              { t: "seta", de: [81, 60], ate: [120, 60], cor: "destaque" },
              { t: "circulo", c: [150, 60], r: 26, cor: "tinta" },
              { t: "rotulo", p: [133, 62], texto: "6h monta" },
              { t: "seta", de: [176, 60], ate: [215, 60], cor: "destaque" },
              { t: "circulo", c: [245, 60], r: 26, cor: "destaque" },
              { t: "rotulo", p: [228, 62], texto: "9h vende" },
              { t: "seta", de: [245, 86], ate: [245, 115], cor: "destaque" },
              { t: "circulo", c: [150, 140], r: 26, cor: "tinta" },
              { t: "rotulo", p: [128, 142], texto: "14h limpa" },
              { t: "seta", de: [222, 128], ate: [176, 138], cor: "suave" },
            ],
          },
        },
        {
          tipo: "tarefas",
          itens: [
            { id: "cronometrar", titulo: "Reconstrua o dia", entrega: "Pergunte a um feirante a que horas ele acorda, onde compra, quanto tempo leva para montar e desmontar. Monte uma linha do tempo do dia dele, da madrugada à tarde." },
          ],
        },
      ],
    },
    // ===================== MANUTENÇÃO =====================
    {
      id: "conservacao",
      titulo: "Conservar o ferro: manutenção do prédio histórico",
      blocos: [
        { tipo: "texto", texto: "Os mercados de ferro do século XIX têm um inimigo constante: a FERRUGEM. Umidade, maresia (como em Belém) e falta de pintura corroem a estrutura que segura o telhado. Conservar exige rotina — inspeção, remoção de corrosão, pintura protetora, troca de peças idênticas às originais — e não pode ser improviso: uma viga comprometida pode ceder sobre a feira cheia. Manutenção preventiva é mais barata e segura do que restauro de emergência." },
        {
          tipo: "mobilizacao",
          papel: "Engenheiro(a) estrutural / restaurador(a) de estruturas metálicas",
          porque: "Avaliar a integridade de uma estrutura de ferro fundido centenária e especificar o reforço ou a substituição de peças exige responsabilidade técnica (ART/RRT). Erro aqui é risco de colapso com gente embaixo.",
          entregaEsperada: "Laudo estrutural da cobertura e das colunas, plano de manutenção preventiva (periodicidade de inspeção e pintura) e especificação de reparos compatíveis com o bem.",
          gerenciadoPor: "zaeon",
        },
        {
          tipo: "licao",
          pergunta: "Qual é o maior inimigo de um mercado de ferro e como combatê-lo?",
          alternativas: [
            "O sol, com mais vidros",
            "A ferrugem, com inspeção e pintura protetora de rotina",
            "O vento, fechando todas as aberturas",
          ],
          correta: 1,
          explicacao: "A corrosão do ferro é o risco central. Manutenção preventiva (inspeção e pintura periódicas) evita que a estrutura ceda.",
        },
      ],
    },
    {
      id: "residuos",
      titulo: "Resíduos, limpeza e o pós-feira",
      blocos: [
        { tipo: "texto", texto: "Toda feira produz montanha de resíduo: caixas, folhas, restos de hortaliça. Deixada na rua, vira foco de mosca, rato e mau cheiro — e inimiga da vizinhança. Feiras bem geridas têm coleta programada logo após a desmontagem, e as melhores separam o orgânico para COMPOSTAGEM, devolvendo ao solo o que era 'lixo'. O destino do resto é parte da reputação do mercado tanto quanto a qualidade do que ele vende." },
        {
          tipo: "tarefas",
          itens: [
            { id: "destino-residuo", titulo: "Siga o lixo", entrega: "Descubra o que acontece com os resíduos do seu mercado ou feira depois do expediente: quem recolhe, para onde vai, há separação ou compostagem? Proponha uma melhoria realista." },
          ],
        },
      ],
    },
    {
      id: "sucessao",
      titulo: "Sucessão: quem herda a banca",
      blocos: [
        { tipo: "texto", texto: "Um desafio silencioso ameaça feiras e mercados tradicionais: o envelhecimento dos feirantes e a falta de sucessores. Os filhos muitas vezes estudaram para sair da banca, não para ficar. Quando o feirante antigo para, se não há quem assuma, a banca fecha e o mercado encolhe. Pensar a continuidade — formação de novos feirantes, atração de jovens produtores, regras de transferência justas — é manutenção tão importante quanto consertar o telhado." },
        { tipo: "texto", texto: "Alguns mercados reagem com estratégias novas: incubadoras de pequenos produtores, bancas de agricultura familiar, feiras temáticas que atraem público jovem. A história mostra que o mercado que não se renova morre — e o que se renova demais, sem cuidado, pode se descaracterizar. O equilíbrio é o ofício de quem gere o abastecimento." },
      ],
    },
    // ===================== CASOS REAIS =====================
    {
      id: "caso-mundo",
      titulo: "Caso real: os mercados-ícone do mundo",
      blocos: [
        { tipo: "texto", texto: "A fórmula do mercado de ferro e da feira tradicional deu certo mundo afora, e vários viraram ícones: La Boqueria, em Barcelona, com raízes medievais na Rambla; o Borough Market, em Londres, com séculos de história; o Mercado de San Miguel, em Madri, todo em ferro e vidro. Todos enfrentam hoje o mesmo dilema do Mercadão e do Ver-o-Peso: equilibrar o freguês do bairro com a enxurrada de turistas. Comparar casos ajuda a enxergar o que é universal e o que é específico de cada cidade." },
        {
          tipo: "fontes",
          itens: [
            { titulo: "Les Halles — Wikipedia (referência comparativa)", url: "https://en.wikipedia.org/wiki/Les_Halles", tipo: "site", nota: "O arquétipo europeu de mercado de ferro com que comparar os brasileiros." },
            { titulo: "Mercados públicos na história (Labore / Unicamp)", url: "https://periodicos.sbu.unicamp.br/ojs/index.php/labore/article/download/8668207/30047/132483", tipo: "artigo", nota: "Base para comparar tipologias e funções entre países." },
          ],
        },
      ],
    },
    {
      id: "caso-feiras-centenarias",
      titulo: "Caso real: as feiras centenárias do Brasil",
      blocos: [
        { tipo: "texto", texto: "Brasil afora, há feiras com mais de um século — às vezes mais de dois — que resistiram a reformas urbanas, shoppings e supermercados. Em muitas cidades do interior, especialmente no Nordeste, a feira semanal ainda é O evento econômico e social da semana: é onde se compra, se encontra gente, se fecha negócio, se ouve música e se come. Essas feiras longevas são laboratórios vivos de tudo que este caderno descreveu: abastecimento, regulação, cultura e disputa pelo espaço." },
        { tipo: "video", titulo: "Uma feira livre com mais de 200 anos de existência", youtube: "2em6oWidkMo" },
        {
          tipo: "licao",
          pergunta: "O que explica a longevidade de uma feira centenária no interior?",
          alternativas: [
            "Ela é só nostalgia, sem função real",
            "Ela concentra abastecimento, encontro social e cultura num só evento semanal",
            "Ela substituiu completamente a agricultura",
          ],
          correta: 1,
          explicacao: "A feira resiste porque é econômica E social: abastece, mas também é o ponto de encontro e de cultura da cidade.",
        },
      ],
    },
    {
      id: "caso-rio",
      titulo: "Caso real: as feiras do Rio de Janeiro",
      blocos: [
        { tipo: "texto", texto: "O Rio de Janeiro guarda uma das tradições de feira mais vivas do país: as feiras de rua que giram pelos bairros, da Zona Sul à Baixada, com seus pregões cantados, a barraca do pastel e a pechincha do fim da manhã. Elas são, ao mesmo tempo, abastecimento popular e patrimônio imaterial da cidade — modo de falar, de vender e de conviver que não cabe em prateleira de supermercado. É um ótimo caso para observar o mercado como cultura, não só como comércio." },
        { tipo: "video", titulo: "Feiras do Rio: história, cultura e pechinchas (reportagem especial)", youtube: "5aQeRlUKpXQ" },
      ],
    },
    // ===================== RECURSOS =====================
    {
      id: "linha-tempo",
      titulo: "A linha do tempo do mercado",
      blocos: [
        { tipo: "texto", texto: "Antes dos recursos, um panorama para fixar a cronologia. A história do mercado não é uma sucessão de modas, mas a mesma ideia — dar à cidade um lugar regulado para se abastecer — reinventada com novos materiais e novas leis. Da ágora de terra batida ao pavilhão de ferro e vidro, da carta de feira medieval ao decreto de 1914, cada época resolveu o mesmo problema à sua maneira." },
        {
          tipo: "prancha",
          titulo: "Dos gregos à feira livre",
          desenho: {
            legenda: "Marcos do caderno. Os traços em destaque são as viradas brasileiras: Mercadão (1933) e feira livre (1914).",
            primitivas: [
              { t: "linha", de: [15, 100], ate: [305, 100], cor: "tinta" },
              { t: "linha", de: [30, 92], ate: [30, 108], cor: "tinta" },
              { t: "rotulo", p: [16, 85], texto: "Agora grega" },
              { t: "linha", de: [80, 92], ate: [80, 108], cor: "tinta" },
              { t: "rotulo", p: [66, 125], texto: "Macellum romano" },
              { t: "linha", de: [135, 92], ate: [135, 108], cor: "tinta" },
              { t: "rotulo", p: [118, 85], texto: "Carta de feira" },
              { t: "linha", de: [195, 92], ate: [195, 108], cor: "tinta" },
              { t: "rotulo", p: [176, 125], texto: "1852 Les Halles" },
              { t: "linha", de: [250, 90], ate: [250, 110], cor: "destaque" },
              { t: "rotulo", p: [230, 85], texto: "1914 feira livre" },
              { t: "linha", de: [290, 90], ate: [290, 110], cor: "destaque" },
              { t: "rotulo", p: [258, 128], texto: "1933 Mercadao" },
            ],
          },
        },
        {
          tipo: "licao",
          pergunta: "Qual é o fio que liga a ágora, o macellum e a feira livre?",
          alternativas: [
            "São todos invenções do século XX",
            "São respostas, em épocas diferentes, ao mesmo problema: abastecer a cidade de forma regulada",
            "Nunca tiveram relação entre si",
          ],
          correta: 1,
          explicacao: "A forma muda (praça, edifício de pedra, pavilhão de ferro, feira na rua), mas a função é a mesma: um lugar regulado onde a cidade se alimenta.",
        },
      ],
    },
    {
      id: "recursos",
      titulo: "Biblioteca: onde continuar pesquisando",
      blocos: [
        { tipo: "texto", texto: "Guarde esta página como ponto de partida. Reuni aqui as fontes mais sólidas do caderno — da ágora ao Mercadão — todas verificadas e existentes. Para a sua cidade, some a elas o arquivo municipal, o Diário Oficial e a hemeroteca local. Lembre: fonte primária (a norma, o documento, o depoimento) vale mais que qualquer resumo, este caderno incluído." },
        {
          tipo: "fontes",
          titulo: "Biblioteca do abastecimento urbano",
          itens: [
            { titulo: "Ágora — World History Encyclopedia (pt)", url: "https://www.worldhistory.org/trans/pt/1-512/agora", tipo: "artigo" },
            { titulo: "El macellum: el mercado romano (SPAL, Univ. de Sevilla)", url: "https://revistascientificas.us.es/index.php/spal/article/download/23150/21530/112044", tipo: "artigo" },
            { titulo: "Les Halles — Wikipedia", url: "https://en.wikipedia.org/wiki/Les_Halles", tipo: "site" },
            { titulo: "L'architecture métallique sous le Second Empire (Fondation Napoléon)", url: "https://www.napoleon.org/histoire-des-2-empires/articles/larchitecture-metallique-sous-le-second-empire/", tipo: "artigo" },
            { titulo: "Ver-o-Peso: maior mercado a céu aberto das Américas (Portal Amazônia)", url: "https://portalamazonia.com/navegador-da-amazonia/vero-o-peso-o-maior-mercado-a-ceu-aberto-das-americas", tipo: "artigo" },
            { titulo: "Ver-o-Peso: estudo de caso (Cities Alliance, PDF)", url: "https://www.citiesalliance.org/sites/default/files/2024-11/lavil_casestudy_ver-o-peso_brazil_online_en_lowres.pdf", tipo: "artigo" },
            { titulo: "Mercado Municipal de São Paulo (São Paulo Secreto)", url: "https://saopaulosecreto.com/mercado-municipal-de-sao-paulo/", tipo: "site" },
            { titulo: "Vitrais do Mercadão (Sesc SP)", url: "https://portal.sescsp.org.br/online/artigo/compartilhar/12334_VITRAIS+DO+MERCADAO", tipo: "artigo" },
            { titulo: "Entenda como surgiram as feiras livres (Gazeta SP)", url: "https://www.gazetasp.com.br/estilo-de-vida/entenda-como-surgiu-as-feiras-livres-desde-o-surgimento-ate-os-dias/", tipo: "artigo" },
            { titulo: "Feiras livres de SP completam 100 anos (Câmara Municipal de SP)", url: "https://www.saopaulo.sp.leg.br/blog/feiras-livres-de-sp-completam-100-anos-em-2014/", tipo: "site" },
            { titulo: "1917: a greve que garantiu as feiras livres (Brasil de Fato)", url: "https://www.brasildefato.com.br/2020/02/21/1917-a-historia-da-greve-que-garantiu-as-feiras-livres-na-cidade-de-sao-paulo", tipo: "artigo" },
            { titulo: "Mercados públicos na história (Labore / Unicamp)", url: "https://periodicos.sbu.unicamp.br/ojs/index.php/labore/article/download/8668207/30047/132483", tipo: "artigo" },
            { titulo: "Mercados municipais: cultura e territorialidade (Gaia / UFPB)", url: "https://periodicos.ufpb.br/index.php/gaia/article/download/52758/32649?inline=1", tipo: "artigo" },
          ],
        },
        {
          tipo: "tarefas",
          itens: [
            { id: "dossie-final", titulo: "Monte o dossiê do seu mercado", entrega: "Junte tudo: a planta, a contagem, os depoimentos, os documentos e as fotos. Organize numa página de abertura com nome, origem (data e fonte), função hoje e o maior desafio do mercado que você estudou." },
          ],
        },
      ],
    },
    // ===================== SÍNTESE =====================
    {
      id: "compilado",
      titulo: "Prancha de síntese",
      blocos: [
        { tipo: "texto", texto: "Arraste os cards pelo carimbo para montar a sua jornada — da ágora grega e do macellum romano aos mercados de ferro, ao Mercadão (1933) e à feira livre (1914), e daí ao roteiro de campo da sua própria cidade. Abaixo da prancha, suas anotações, plantas e fotos aparecem na ordem das páginas, prontas para virar o dossiê do mercado que você pesquisou." },
        { tipo: "compilado" },
      ],
    },
  ],
};
