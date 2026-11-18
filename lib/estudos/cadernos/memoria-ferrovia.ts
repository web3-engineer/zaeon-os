import type { CadernoEstudo } from "../cadernosEstudo";

/**
 * Caderno de campo: Memória de uma ferrovia a partir de mapas e fotografias.
 * Conteúdo com lastro: Lei 11.483/2007 e Portaria IPHAN 407/2010 (patrimônio ferroviário/RFFSA),
 * Carta de Nizhny Tagil (TICCIH, 2003) sobre patrimônio industrial, método de georreferenciamento
 * de mapas históricos (QGIS, National Library of Scotland, Harvard Library), história oral
 * (ABHO e CPDOC/FGV), acervos reais (Biblioteca Nacional Digital, IBGE, David Rumsey,
 * Estações Ferroviárias do Brasil, Memória Ferroviária/UNESP) e vídeos verificados.
 * As etapas que exigem um profissional habilitado viram blocos de mobilização.
 */
export const caderno: CadernoEstudo = {
  id: "memoria-ferrovia",
  titulo: "Memória de uma ferrovia a partir de mapas e fotografias",
  resumo:
    "Como um grupo reconstrói a história de uma ferrovia usando mapas antigos e fotografias como documentos: ler a fonte, criticar, georreferenciar o traçado, caminhar o leito, entrevistar quem viveu e preservar o acervo. Sempre com fonte, norma e o profissional certo na hora certa.",
  paginas: [
    // ===================== CAPÍTULO 1 — CONTEXTO E VISÃO =====================
    {
      id: "abertura",
      titulo: "Como usar este caderno de campo",
      blocos: [
        { tipo: "texto", texto: "Este caderno acompanha um grupo que quer reconstruir a memória de uma ferrovia, mesmo que os trilhos já tenham sido arrancados. A matéria-prima são mapas antigos e fotografias, tratados aqui como documentos: coisas que informam, mas que também mentem, omitem e precisam de crítica. Cada página tem leitura curta, um desenho ou diagrama, tarefas práticas e a fonte que sustenta a afirmação." },
        { tipo: "texto", texto: "Regra do caderno: nada se afirma sem lastro. Quando aparece uma data, uma lei ou um procedimento, ele vem de norma, acervo público ou estudo citado na própria página. E quando a etapa exige um profissional habilitado, um arquivista, um conservador-restaurador ou um topógrafo, a página mostra um campo de mobilização que abre a vaga e acompanha até ficar pronto." },
        { tipo: "diagrama", titulo: "O percurso do caderno", codigo: `flowchart TD
  A["Contexto: por que a memória de uma ferrovia"] --> B["Ler a fonte: mapa e foto como documento"]
  B --> C["Método: pesquisa documental e história oral"]
  C --> D["Medição: escala e georreferenciamento"]
  D --> E["Projeto: desenhar o inventário"]
  E --> F["Execução: arquivo, campo e entrevistas"]
  F --> G["Preservação do acervo"]
  G --> H["Casos reais"]
  H --> I["Recursos e síntese"]` },
      ],
    },
    {
      id: "o-que-e-reconstituir",
      titulo: "O que é reconstituir a memória de uma ferrovia",
      blocos: [
        { tipo: "texto", texto: "Uma ferrovia não é só a linha de trilhos. É um sistema de estações, pátios, oficinas, pontes, túneis, caixas-d água, casas de turma, tudo amarrado a um traçado desenhado no terreno. Quando a linha é desativada, esse sistema some aos poucos do mapa e da lembrança. Reconstituir a sua memória é remontar esse conjunto a partir do que sobrou: papéis, imagens e testemunhos." },
        { tipo: "texto", texto: "O patrimônio ferroviário é um caso de patrimônio industrial. A Carta de Nizhny Tagil, aprovada pelo TICCIH em 2003, define esse patrimônio como os vestígios da cultura industrial com valor histórico, tecnológico, social, arquitetônico ou científico, e inclui explicitamente a infraestrutura de transporte. Ela orienta a documentar antes que se perca: o registro é a primeira forma de preservação." },
        {
          tipo: "prancha",
          titulo: "A ferrovia como sistema a remontar",
          desenho: {
            legenda: "O traçado liga estações, pátios e obras de arte. A memória se reconstrói amarrando o mapa (onde) às fotos (como era) e aos relatos (o que se viveu).",
            primitivas: [
              { t: "linha", de: [20, 150], ate: [285, 150], cor: "tinta" },
              { t: "linha", de: [20, 158], ate: [285, 158], cor: "tinta" },
              { t: "retangulo", p: [30, 120], w: 34, h: 24, hachura: true },
              { t: "rotulo", p: [28, 114], texto: "Estação A" },
              { t: "retangulo", p: [140, 120], w: 34, h: 24, hachura: true },
              { t: "rotulo", p: [134, 114], texto: "Pátio" },
              { t: "retangulo", p: [240, 120], w: 34, h: 24, hachura: true },
              { t: "rotulo", p: [236, 114], texto: "Estação B" },
              { t: "curva", pts: [[95, 150], [110, 132], [125, 150]], cor: "suave" },
              { t: "rotulo", p: [92, 128], texto: "Ponte" },
              { t: "circulo", c: [150, 60], r: 22, cor: "destaque" },
              { t: "rotulo", p: [132, 62], texto: "Memória" },
              { t: "seta", de: [47, 120], ate: [140, 72], cor: "suave" },
              { t: "seta", de: [157, 120], ate: [151, 84], cor: "suave" },
              { t: "seta", de: [257, 120], ate: [162, 72], cor: "suave" },
            ],
          },
        },
      ],
    },
    {
      id: "por-que-mapas-fotos",
      titulo: "Por que mapas e fotografias",
      blocos: [
        { tipo: "texto", texto: "Mapas e fotografias têm uma qualidade rara entre as fontes: eles prendem o espaço. Um texto diz que a estação ficava perto do rio; o mapa diz a que distância e em que margem; a foto diz como era a fachada e se já havia a segunda plataforma. Juntos, eles permitem localizar no terreno de hoje algo que não existe mais, e datar mudanças pela presença ou ausência de elementos." },
        { tipo: "texto", texto: "Mas nenhuma das duas fontes é neutra. Um mapa tem autor, encomendante e finalidade: um mapa de companhia mostra o que interessa à companhia. Uma foto tem enquadramento, pose e recorte: mostra o que o fotógrafo quis mostrar. Por isso o caderno nunca lê uma imagem sozinha. Sempre cruza mapa com foto, foto com texto e tudo com o terreno." },
        {
          tipo: "licao",
          pergunta: "Qual é a vantagem específica do mapa e da foto frente a uma fonte só textual?",
          alternativas: [
            "São sempre mais verdadeiros que um texto",
            "Prendem o espaço: permitem localizar e datar o que não existe mais",
            "Dispensam a crítica das fontes, por serem imagens",
          ],
          correta: 1,
          explicacao: "Imagem e mapa fixam posição e aparência, o que ajuda a localizar e datar. Verdade não é garantida: toda fonte tem autor e finalidade e precisa de crítica.",
        },
      ],
    },
    {
      id: "ferrovias-brasil",
      titulo: "As ferrovias no Brasil: o pano de fundo",
      blocos: [
        { tipo: "texto", texto: "A primeira ferrovia brasileira foi a de Mauá, inaugurada em 1854 no Rio de Janeiro. A malha cresceu no século XIX amarrada à exportação, sobretudo do café no Sudeste, e à mineração. No século XX, o rodoviarismo e a crise do transporte sobre trilhos levaram ao fechamento de centenas de ramais. Cada ramal fechado é uma memória em risco, e é exatamente aí que este caderno atua." },
        { tipo: "texto", texto: "Entender o pano de fundo evita erros de leitura. Saber que uma linha servia ao café ajuda a interpretar por que ela passava por certas fazendas; saber a bitola em uso na região ajuda a datar fotos de material rodante. Assista ao panorama abaixo com um caderno ao lado, anotando nomes de companhias e datas que apareçam." },
        { tipo: "video", titulo: "Globo Repórter — História das Ferrovias no Brasil", youtube: "j-5uOoJ9QVk" },
        { tipo: "tarefas", itens: [
          { id: "linha-tempo", titulo: "Monte uma linha do tempo da sua ferrovia", entrega: "Em uma folha, registre inauguração, trocas de companhia, pico de tráfego e data de desativação da linha que você vai estudar, com a fonte de cada data." },
        ] },
      ],
    },
    {
      id: "patrimonio-ferroviario-lei",
      titulo: "Patrimônio ferroviário: o que diz a lei",
      blocos: [
        { tipo: "texto", texto: "No Brasil, a Lei 11.483/2007 extinguiu a RFFSA (Rede Ferroviária Federal S.A.) e atribuiu ao IPHAN receber e administrar os bens móveis e imóveis de valor artístico, histórico e cultural da antiga rede, zelando por sua guarda e manutenção. Foi a partir dela que o patrimônio ferroviário federal ganhou um guardião explícito." },
        { tipo: "texto", texto: "Para operar isso, a Portaria IPHAN 407/2010 criou a Lista do Patrimônio Cultural Ferroviário, onde bens valorados são inscritos após publicação no Diário Oficial. Saber se a sua estação está na lista muda o seu trabalho: define quem é o responsável legal e a quem pedir acesso a plantas e documentos. Comece sempre verificando o status legal do bem." },
        { tipo: "fontes", titulo: "Marco legal do patrimônio ferroviário", itens: [
          { titulo: "Lei 11.483/2007 (texto compilado)", url: "https://www.planalto.gov.br/ccivil_03/_ato2007-2010/2007/lei/l11483compilado.htm", tipo: "norma", nota: "Extingue a RFFSA e dá ao IPHAN a guarda do acervo (art. 9º)." },
          { titulo: "Portaria IPHAN nº 407/2010", url: "https://www.normasbrasil.com.br/norma/portaria-407-2010_224943.html", tipo: "norma", nota: "Cria a Lista do Patrimônio Cultural Ferroviário." },
          { titulo: "IPHAN — Patrimônio Ferroviário (Minas Gerais)", url: "https://www.gov.br/iphan/pt-br/superintendencias/minas-gerais/Patrimonio_Ferroviario_MG.pdf", tipo: "site", nota: "Panorama do tema e de como os bens são tratados." },
        ] },
        {
          tipo: "licao",
          pergunta: "Qual é o primeiro passo recomendado ao começar o estudo de uma estação?",
          alternativas: [
            "Arrancar uma amostra de trilho para datar o aço",
            "Verificar o status legal do bem (se consta na Lista do Patrimônio Cultural Ferroviário)",
            "Publicar as fotos antigas nas redes sociais",
          ],
          correta: 1,
          explicacao: "O status legal define o responsável e a quem pedir acesso a documentos. Coletar amostras ou expor material sem checagem vem muito depois, e com autorização.",
        },
      ],
    },

    // ===================== CAPÍTULO 2 — LER A FONTE =====================
    {
      id: "o-mapa-como-documento",
      titulo: "O mapa como documento",
      blocos: [
        { tipo: "texto", texto: "Antes de usar um mapa, leia o mapa. Todo mapa tem elementos que contam sua procedência e seus limites: título, autor e data, escala, orientação (norte), legenda e projeção. Esses dados dizem o quanto você pode confiar e para quê. Um mapa de 1900 sem escala declarada serve para ver relações, não para medir distâncias com precisão." },
        {
          tipo: "prancha",
          titulo: "Anatomia de um mapa",
          desenho: {
            legenda: "Localize sempre estes elementos antes de extrair qualquer informação do mapa.",
            primitivas: [
              { t: "retangulo", p: [18, 20], w: 267, h: 160, cor: "tinta" },
              { t: "rotulo", p: [26, 16], texto: "Título / autor / data" },
              { t: "curva", pts: [[40, 90], [120, 70], [200, 100], [260, 85]], cor: "suave" },
              { t: "rotulo", p: [120, 62], texto: "Traçado" },
              { t: "circulo", c: [248, 48], r: 14 },
              { t: "seta", de: [248, 58], ate: [248, 36], cor: "destaque" },
              { t: "rotulo", p: [242, 30], texto: "N" },
              { t: "retangulo", p: [28, 150], w: 70, h: 22, hachura: true },
              { t: "rotulo", p: [30, 144], texto: "Legenda" },
              { t: "linha", de: [150, 162], ate: [200, 162], cor: "tinta" },
              { t: "rotulo", p: [150, 168], texto: "Escala (barra)" },
            ],
          },
        },
        { tipo: "texto", texto: "Guarde uma pergunta para cada mapa: quem fez, quando, para quem e com que método. Um mapa de companhia ferroviária exagera a própria linha; um mapa militar prioriza o relevo; um mapa cadastral prioriza lotes e limites. A finalidade molda o que está em destaque e o que foi deixado de fora." },
      ],
    },
    {
      id: "tipos-de-mapas",
      titulo: "Tipos de documento cartográfico da ferrovia",
      blocos: [
        { tipo: "texto", texto: "A ferrovia produziu tipos distintos de desenho, e cada um responde a uma pergunta diferente. A planta de situação mostra onde a linha passa no território. A planta de pátio detalha estação, desvios e armazéns. O perfil longitudinal mostra as rampas e cotas ao longo do leito. O projeto de obra de arte detalha pontes e túneis. Reunir os quatro dá quase a ferrovia inteira." },
        { tipo: "diagrama", titulo: "Que documento responde a quê", codigo: `flowchart LR
  P["Onde a linha passa?"] --> A["Planta de situação"]
  Q["Como era a estação e o pátio?"] --> B["Planta de pátio"]
  R["Quanto sobe e desce o leito?"] --> C["Perfil longitudinal"]
  S["Como era a ponte ou o túnel?"] --> D["Projeto de obra de arte"]` },
        { tipo: "tarefas", itens: [
          { id: "inventario-mapas", titulo: "Liste os documentos cartográficos que procura", entrega: "Para a sua linha, anote qual dos quatro tipos você já tem, qual falta e em que acervo cada um pode estar." },
        ] },
      ],
    },
    {
      id: "a-foto-como-documento",
      titulo: "A fotografia como documento",
      blocos: [
        { tipo: "texto", texto: "A fotografia parece dizer a verdade porque parece capturar o real. Mas ela é uma construção: alguém escolheu o ângulo, o momento, o que entra e o que fica fora do quadro. Uma foto oficial de inauguração mostra autoridades e faixas; não mostra o acampamento dos trabalhadores. Ler uma foto é perguntar também pelo que não está nela." },
        { tipo: "texto", texto: "Mesmo assim, a foto é riquíssima em detalhe material. Dela se extrai a arquitetura da estação, o tipo de locomotiva e vagão, a bitola aparente, a vegetação, as roupas (que ajudam a datar) e a sinalização. O método é olhar por partes, de canto a canto do quadro, e anotar cada elemento como uma pista datável e localizável." },
        {
          tipo: "licao",
          pergunta: "Por que a fotografia não deve ser tratada como registro neutro do real?",
          alternativas: [
            "Porque fotos antigas são sempre falsificadas",
            "Porque há escolha de ângulo, momento e recorte: ela mostra o que o autor quis mostrar",
            "Porque imagem não serve como fonte histórica",
          ],
          correta: 1,
          explicacao: "A foto é construída pelo enquadramento e pelo recorte. Isso não a invalida como fonte riquíssima; só exige perguntar pelo que ficou de fora.",
        },
      ],
    },
    {
      id: "ler-foto-ferroviaria",
      titulo: "Ler uma foto ferroviária por partes",
      blocos: [
        { tipo: "texto", texto: "Divida mentalmente a foto em zonas e leia cada uma. No primeiro plano, trilhos e bitola: dá para estimar a distância entre trilhos pela proporção com os dormentes? No plano médio, o material rodante: locomotiva a vapor ou diesel, número de eixos, letreiro da companhia. Ao fundo, a arquitetura: estação, caixa-d água, galpão. Nas bordas, pistas de data: postes, fios, veículos, roupas." },
        {
          tipo: "prancha",
          titulo: "Zonas de leitura de uma foto ferroviária",
          desenho: {
            legenda: "Leia da frente para o fundo e das bordas para o centro. Cada zona entrega um tipo de pista.",
            primitivas: [
              { t: "retangulo", p: [18, 22], w: 267, h: 150, cor: "tinta" },
              { t: "linha", de: [60, 170], ate: [150, 110], cor: "tinta" },
              { t: "linha", de: [240, 170], ate: [152, 110], cor: "tinta" },
              { t: "rotulo", p: [30, 164], texto: "Bitola (1o plano)" },
              { t: "retangulo", p: [120, 92], w: 56, h: 24, hachura: true },
              { t: "rotulo", p: [118, 86], texto: "Locomotiva" },
              { t: "retangulo", p: [196, 70], w: 60, h: 40 },
              { t: "rotulo", p: [198, 64], texto: "Estação (fundo)" },
              { t: "circulo", c: [60, 60], r: 10 },
              { t: "rotulo", p: [44, 44], texto: "Caixa-d água" },
              { t: "rotulo", p: [30, 34], texto: "Bordas: datar (roupas, postes)" },
            ],
          },
        },
        { tipo: "texto", texto: "A bitola é uma pista forte de contexto no Brasil: a bitola métrica (1,00 m) foi a mais comum em ramais, enquanto a bitola larga (1,60 m) marcou linhas-tronco como a Central do Brasil. Uma foto que sugere bitola larga já orienta a família de linhas a que a imagem pode pertencer." },
      ],
    },
    {
      id: "datar-localizar-foto",
      titulo: "Datar e localizar uma fotografia",
      blocos: [
        { tipo: "texto", texto: "Datar é cercar a imagem entre um limite mais antigo e um mais recente. O elemento mais novo que aparece define o limite antigo (a foto não pode ser anterior a ele): um automóvel de 1930 impede datar a foto antes de 1930. O elemento mais velho que já sumiu em outra foto datada ajuda no limite recente. Junte roupas, veículos, postes, sinalização e estado das obras." },
        { tipo: "texto", texto: "Localizar é casar a foto com o mapa e com o terreno. Procure um ponto fixo que ainda exista: o alinhamento de uma serra ao fundo, a curva do rio, uma torre. Esses invariantes permitem, mais tarde, voltar ao mesmo lugar e refotografar. Anote a direção provável da câmera (para onde ela aponta) usando o norte do mapa." },
        { tipo: "tarefas", itens: [
          { id: "ficha-foto", titulo: "Faça a ficha de uma foto", entrega: "Escolha uma foto e preencha: elemento mais recente visível (limite de data antiga), três pistas de datação, provável local no mapa e direção da câmera." },
        ] },
      ],
    },
    {
      id: "onde-encontrar",
      titulo: "Onde encontrar mapas e fotos",
      blocos: [
        { tipo: "texto", texto: "Boa parte do acervo já está digitalizada e aberta. A Biblioteca Nacional Digital e sua Hemeroteca reúnem periódicos e iconografia; o IBGE guarda cartas topográficas e mapas históricos; o David Rumsey Map Collection tem mapas do Brasil do século XIX e XX; o site Estações Ferroviárias do Brasil cataloga milhares de estações com fotos antigas e atuais; e o acervo Memória Ferroviária da UNESP reúne documentação da RFFSA." },
        { tipo: "fontes", titulo: "Acervos de mapas e fotografias", itens: [
          { titulo: "Biblioteca Nacional Digital Brasil", url: "https://bndigital.bn.gov.br/", tipo: "site", nota: "Iconografia, cartografia e periódicos digitalizados." },
          { titulo: "IBGE — Biblioteca (mapas e cartas)", url: "https://biblioteca.ibge.gov.br/", tipo: "dataset", nota: "Cartas topográficas e mapas históricos do território." },
          { titulo: "David Rumsey Map Collection", url: "https://www.davidrumsey.com/", tipo: "dataset", nota: "Mais de 150 mil mapas, muitos do Brasil, com visualizador e georreferência." },
          { titulo: "Estações Ferroviárias do Brasil", url: "http://www.estacoesferroviarias.com.br/", tipo: "site", nota: "Catálogo de estações por estado, com fotos antigas e atuais (R. M. Giesbrecht)." },
          { titulo: "Memória Ferroviária — UNESP Assis", url: "https://memoriaferroviaria.assis.unesp.br/", tipo: "site", nota: "Centro de documentação com acervo da ferrovia." },
        ] },
        { tipo: "tarefas", itens: [
          { id: "varredura-acervos", titulo: "Faça uma varredura inicial nos acervos", entrega: "Busque o nome da sua linha e das estações nos cinco acervos acima e salve os links e as referências de tudo que encontrar." },
        ] },
      ],
    },

    // ===================== CAPÍTULO 3 — MÉTODO =====================
    {
      id: "metodo-pesquisa-documental",
      titulo: "O método da pesquisa documental",
      blocos: [
        { tipo: "texto", texto: "A pesquisa documental tem um fluxo. Primeiro, levantar as fontes (onde estão e o que existe). Depois, selecionar e descrever cada documento. Em seguida, criticar (ele é autêntico? o que afirma é confiável?). Então interpretar, cruzando fontes. Por fim, sintetizar numa narrativa que mostra as evidências. Pular a crítica é o erro mais comum e o mais caro." },
        { tipo: "diagrama", titulo: "Fluxo da pesquisa documental", codigo: `flowchart TD
  A["Levantar fontes"] --> B["Selecionar e descrever"]
  B --> C["Criticar: externa e interna"]
  C --> D["Interpretar cruzando fontes"]
  D --> E["Sintetizar a narrativa com evidências"]
  E --> F{"Há lacuna ou contradição?"}
  F -->|"sim"| A
  F -->|"não"| G["Registrar e publicar"]` },
        { tipo: "texto", texto: "Repare que o fluxo é um ciclo. Quando a interpretação revela uma contradição (o mapa diz uma coisa, a foto diz outra), você volta a levantar fontes para resolver. A memória bem feita nunca é linear: ela avança, bate numa dúvida e recua para confirmar." },
      ],
    },
    {
      id: "critica-das-fontes",
      titulo: "Crítica das fontes: externa e interna",
      blocos: [
        { tipo: "texto", texto: "A crítica externa pergunta se o documento é o que diz ser: é original ou cópia? A data e a autoria conferem? O suporte (papel, processo fotográfico) é compatível com a época alegada? A crítica interna pergunta sobre o conteúdo: quem afirma isso tinha como saber? Havia interesse em distorcer? Outras fontes confirmam? Toda afirmação forte precisa passar pelas duas." },
        { tipo: "texto", texto: "Na prática ferroviária isso aparece o tempo todo. Uma planta de companhia pode mostrar um ramal projetado que nunca foi construído; tratá-lo como existente é um erro de crítica interna. Uma foto legendada com o ano errado por quem a arquivou é um erro que a crítica externa (processo fotográfico, elementos datáveis) ajuda a corrigir." },
        {
          tipo: "licao",
          pergunta: "Uma planta da companhia mostra um ramal que você não encontra em foto nem no terreno. O que a crítica interna sugere?",
          alternativas: [
            "Que o ramal certamente existiu e foi demolido sem deixar traço",
            "Que pode ser um ramal apenas projetado; é preciso confirmar com outra fonte antes de afirmar que existiu",
            "Que a planta é falsa e deve ser descartada",
          ],
          correta: 1,
          explicacao: "Plantas registram projetos, nem sempre o construído. A crítica interna manda suspender o juízo e buscar confirmação independente antes de afirmar existência.",
        },
      ],
    },
    {
      id: "historia-oral",
      titulo: "História oral: a memória viva",
      blocos: [
        { tipo: "texto", texto: "Quem trabalhou na ferrovia, maquinistas, telegrafistas, agentes de estação, moradores, carrega informação que nenhum mapa tem: o som do apito, o horário real dos trens, o apelido de uma curva, por que um ramal fechou. A história oral é o método que transforma esses relatos em fonte, com rigor: roteiro, gravação, transcrição e, principalmente, consentimento e cessão de direitos." },
        { tipo: "texto", texto: "Há tipos de entrevista, e escolher o certo muda o resultado. A entrevista temática foca um assunto (o trabalho na oficina); a de história de vida acompanha a trajetória inteira da pessoa. O vídeo abaixo, de um grupo de pesquisa, explica essas diferenças. Lembre: a memória individual reconstrói o passado no presente, por isso cruza-se também o relato com documento e terreno." },
        { tipo: "video", titulo: "Tipos de entrevista de história oral", youtube: "9DHhz0SzWTs" },
        { tipo: "fontes", titulo: "Método de história oral", itens: [
          { titulo: "Associação Brasileira de História Oral (ABHO)", url: "https://www.historiaoral.org.br/", tipo: "site", nota: "Entidade de referência, com revista e eventos sobre o método." },
          { titulo: "CPDOC/FGV — Programa de História Oral", url: "https://cpdoc.fgv.br/", tipo: "site", nota: "Acervo e produção metodológica (Verena Alberti e equipe)." },
        ] },
      ],
    },
    {
      id: "etica-direitos",
      titulo: "Ética, consentimento e direitos",
      blocos: [
        { tipo: "texto", texto: "Documentar memória é lidar com pessoas e com imagens de terceiros. Antes de gravar uma entrevista, explique o projeto e colha o consentimento por escrito, dizendo onde o relato poderá ser usado. Antes de publicar uma foto de acervo, verifique a titularidade e os direitos: muita imagem antiga tem autor e detentor, e usar sem autorização é problema legal, não só ético." },
        { tipo: "texto", texto: "A regra prática é simples: registre a procedência de tudo. De onde veio cada foto, quem autorizou cada entrevista, qual a licença de cada mapa. Um acervo sem procedência rastreável perde valor de prova e vira passivo. A procedência é o que separa memória de boato." },
        { tipo: "tarefas", itens: [
          { id: "termo-consentimento", titulo: "Prepare o termo de consentimento", entrega: "Escreva um termo curto que informe o objetivo do projeto, como a entrevista será guardada e onde poderá ser divulgada, com espaço para assinatura e data." },
        ] },
      ],
    },
    {
      id: "ficha-catalografica",
      titulo: "A ficha de catalogação do acervo",
      blocos: [
        { tipo: "texto", texto: "Cada documento que entra no projeto ganha uma ficha com os mesmos campos, sempre. Sem padronização, o acervo cresce e vira um amontoado em que nada se acha. Campos mínimos: código, tipo (mapa, foto, entrevista), título ou descrição, autor, data (ou estimativa), local, procedência/acervo de origem, direitos e observações de crítica. É o esqueleto de um inventário sério." },
        {
          tipo: "prancha",
          titulo: "Campos mínimos de uma ficha",
          desenho: {
            legenda: "Repita a mesma estrutura para cada item. A uniformidade é o que torna o acervo pesquisável.",
            primitivas: [
              { t: "retangulo", p: [20, 24], w: 263, h: 150, cor: "tinta" },
              { t: "linha", de: [20, 54], ate: [283, 54], cor: "suave" },
              { t: "linha", de: [20, 84], ate: [283, 84], cor: "suave" },
              { t: "linha", de: [20, 114], ate: [283, 114], cor: "suave" },
              { t: "linha", de: [20, 144], ate: [283, 144], cor: "suave" },
              { t: "linha", de: [150, 24], ate: [150, 174], cor: "suave" },
              { t: "rotulo", p: [26, 40], texto: "Código" },
              { t: "rotulo", p: [156, 40], texto: "Tipo" },
              { t: "rotulo", p: [26, 70], texto: "Autor" },
              { t: "rotulo", p: [156, 70], texto: "Data / estimativa" },
              { t: "rotulo", p: [26, 100], texto: "Local" },
              { t: "rotulo", p: [156, 100], texto: "Procedência" },
              { t: "rotulo", p: [26, 130], texto: "Direitos" },
              { t: "rotulo", p: [156, 130], texto: "Crítica / notas" },
              { t: "rotulo", p: [26, 160], texto: "Link do arquivo digital" },
            ],
          },
        },
        { tipo: "tarefas", itens: [
          { id: "primeira-ficha", titulo: "Catalogue os três primeiros itens", entrega: "Crie uma planilha com as colunas da ficha e preencha completamente três documentos que você já reuniu." },
        ] },
      ],
    },

    // ===================== CAPÍTULO 4 — CÁLCULO E MEDIÇÃO =====================
    {
      id: "escala-do-mapa",
      titulo: "A escala: ler e calcular",
      blocos: [
        { tipo: "texto", texto: "A escala relaciona o mapa ao terreno. Uma escala 1:50.000 significa que 1 unidade no mapa vale 50.000 no mundo: 1 cm no papel são 50.000 cm, ou seja, 500 m reais. Saber converter é o que permite estimar distâncias entre estações, comprimento de um ramal ou largura de um pátio sem ir a campo. Prefira a escala gráfica (a barra), porque ela continua válida mesmo se o mapa for ampliado ou reduzido." },
        {
          tipo: "prancha",
          titulo: "Escala gráfica",
          desenho: {
            legenda: "A barra traduz distância do papel em distância real e sobrevive a ampliações.",
            primitivas: [
              { t: "linha", de: [40, 90], ate: [250, 90], cor: "tinta" },
              { t: "linha", de: [40, 84], ate: [40, 96], cor: "tinta" },
              { t: "linha", de: [110, 84], ate: [110, 96], cor: "tinta" },
              { t: "linha", de: [180, 84], ate: [180, 96], cor: "tinta" },
              { t: "linha", de: [250, 84], ate: [250, 96], cor: "tinta" },
              { t: "rotulo", p: [34, 110], texto: "0" },
              { t: "rotulo", p: [100, 110], texto: "500 m" },
              { t: "rotulo", p: [168, 110], texto: "1 km" },
              { t: "rotulo", p: [236, 110], texto: "1,5 km" },
              { t: "rotulo", p: [96, 70], texto: "1:50.000" },
            ],
          },
        },
        {
          tipo: "licao",
          pergunta: "Num mapa 1:50.000, duas estações estão a 4 cm uma da outra no papel. Qual a distância real aproximada?",
          alternativas: ["200 metros", "2 quilômetros", "20 quilômetros"],
          correta: 1,
          explicacao: "1 cm equivale a 500 m nessa escala, então 4 cm equivalem a 2.000 m, isto é, 2 km.",
        },
      ],
    },
    {
      id: "georreferenciamento-conceito",
      titulo: "Georreferenciamento: o conceito",
      blocos: [
        { tipo: "texto", texto: "Georreferenciar é dar coordenadas reais a um mapa ou foto aérea que não as tem. Na prática, você sobrepõe o documento antigo a uma base atual (imagem de satélite, OpenStreetMap) e amarra os dois por pontos de controle: lugares que existem nas duas imagens (um cruzamento, a esquina de uma igreja, a confluência de rios). Feito isso, o mapa antigo passa a conversar com o GPS de hoje." },
        { tipo: "diagrama", titulo: "A ideia do georreferenciamento", codigo: `flowchart LR
  A["Mapa antigo sem coordenadas"] --> C["Pontos de controle comuns"]
  B["Base atual com coordenadas"] --> C
  C --> D["Transformação"]
  D --> E["Mapa antigo com coordenadas reais"]
  E --> F["Comparar com o terreno de hoje"]` },
        { tipo: "texto", texto: "Isso resolve a pergunta central da memória espacial: onde, exatamente, no mundo de hoje, ficava a estação que só existe na foto? Com o mapa georreferenciado, você lê a coordenada do ponto antigo e vai até lá. O documento vira guia de campo." },
      ],
    },
    {
      id: "qgis-passo-a-passo",
      titulo: "Georreferenciar no QGIS",
      blocos: [
        { tipo: "texto", texto: "O QGIS é um SIG livre e gratuito, e traz o Georreferenciador já instalado nas versões recentes. O fluxo típico: defina o sistema de coordenadas do projeto, abra o Georreferenciador, carregue o mapa antigo, adicione pontos de controle clicando no mesmo lugar no documento e na base, escolha a transformação, confira o erro e rode. O vídeo abaixo mostra o passo a passo com um raster real." },
        { tipo: "video", titulo: "Como georreferenciar um raster (PDF/JPEG/TIFF) no QGIS", youtube: "r4jgYXIzQ4U" },
        { tipo: "tarefas", itens: [
          { id: "qgis-instalar", titulo: "Instale o QGIS e abra o Georreferenciador", entrega: "Baixe o QGIS, crie um projeto em WGS 84 e localize o menu do Georreferenciador. Registre a versão instalada." },
          { id: "qgis-primeiro", titulo: "Georreferencie um mapa da sua linha", entrega: "Carregue um mapa antigo e adicione ao menos 4 pontos de controle sobre feições que ainda existem." },
        ] },
        { tipo: "fontes", titulo: "Guias de georreferenciamento", itens: [
          { titulo: "QGIS — Georeferencer (manual oficial)", url: "https://docs.qgis.org/3.34/en/docs/user_manual/working_with_raster/georeferencer.html", tipo: "site", nota: "Documentação do recurso, transformações e opções." },
          { titulo: "National Library of Scotland — Georeferencing workflow", url: "https://geo.nls.uk/urbhist/guides_georeferencing.html", tipo: "artigo", nota: "Fluxo aplicado a mapas históricos urbanos." },
          { titulo: "Harvard Library — Accessing Maps for Georeferencing", url: "https://mapping.share.library.harvard.edu/tutorials/data-curation/accessing-maps-for-georeferencing/", tipo: "artigo", nota: "Guia de biblioteca universitária para obter e preparar mapas para georreferência." },
        ] },
      ],
    },
    {
      id: "pontos-de-controle",
      titulo: "Pontos de controle e erro (RMS)",
      blocos: [
        { tipo: "texto", texto: "A qualidade do georreferenciamento depende dos pontos de controle: quantos, onde e quão confiáveis. Escolha feições estáveis e bem distribuídas, nunca todas num canto. O programa calcula o erro residual de cada ponto e um erro médio (RMS, raiz do erro quadrático médio): quanto menor, melhor o ajuste. Um ponto com resíduo muito maior que os outros costuma estar mal marcado; reveja-o." },
        {
          tipo: "prancha",
          titulo: "Distribuição de pontos de controle",
          desenho: {
            legenda: "À esquerda, pontos amontoados num canto (ajuste ruim). À direita, bem distribuídos (ajuste confiável).",
            primitivas: [
              { t: "retangulo", p: [20, 40], w: 110, h: 110, cor: "tinta" },
              { t: "circulo", c: [38, 58], r: 4, cor: "destaque" },
              { t: "circulo", c: [52, 62], r: 4, cor: "destaque" },
              { t: "circulo", c: [46, 74], r: 4, cor: "destaque" },
              { t: "rotulo", p: [34, 160], texto: "Amontoados" },
              { t: "retangulo", p: [170, 40], w: 110, h: 110, cor: "tinta" },
              { t: "circulo", c: [184, 54], r: 4, cor: "destaque" },
              { t: "circulo", c: [266, 56], r: 4, cor: "destaque" },
              { t: "circulo", c: [182, 138], r: 4, cor: "destaque" },
              { t: "circulo", c: [264, 136], r: 4, cor: "destaque" },
              { t: "circulo", c: [224, 96], r: 4, cor: "destaque" },
              { t: "rotulo", p: [180, 160], texto: "Bem distribuídos" },
            ],
          },
        },
        {
          tipo: "licao",
          pergunta: "O que indica um ponto de controle com resíduo muito maior que os demais?",
          alternativas: [
            "Que o mapa antigo é inútil",
            "Que esse ponto provavelmente foi mal marcado e deve ser revisto",
            "Que o erro RMS não importa",
          ],
          correta: 1,
          explicacao: "Um resíduo discrepante denuncia um ponto mal posicionado. Corrigir ou remover esse ponto costuma baixar o RMS e melhorar o ajuste geral.",
        },
      ],
    },
    {
      id: "vetorizar-tracado",
      titulo: "Vetorizar o traçado da linha",
      blocos: [
        { tipo: "texto", texto: "Com o mapa já georreferenciado, desenha-se por cima dele uma camada vetorial: uma linha que segue o leito e pontos que marcam estações, pontes e desvios. Isso transforma a imagem em dado consultável: comprimento do trecho, quantas estações, onde o leito foi apagado pela cidade. É o equivalente digital de passar a limpo o traçado, mas agora com coordenadas." },
        {
          tipo: "prancha",
          titulo: "Traçado vetorizado sobre a base",
          desenho: {
            legenda: "A linha segue o leito; os pontos marcam estações. Tudo herda coordenadas da base atual.",
            primitivas: [
              { t: "retangulo", p: [18, 24], w: 267, h: 150, hachura: true },
              { t: "curva", pts: [[30, 140], [90, 110], [150, 120], [210, 80], [270, 70]], cor: "destaque" },
              { t: "circulo", c: [30, 140], r: 5, cor: "tinta" },
              { t: "rotulo", p: [24, 156], texto: "Est. 1" },
              { t: "circulo", c: [150, 120], r: 5, cor: "tinta" },
              { t: "rotulo", p: [142, 136], texto: "Est. 2" },
              { t: "circulo", c: [270, 70], r: 5, cor: "tinta" },
              { t: "rotulo", p: [250, 58], texto: "Est. 3" },
              { t: "rotulo", p: [96, 96], texto: "Leito (linha)" },
            ],
          },
        },
        { tipo: "tarefas", itens: [
          { id: "vetor-linha", titulo: "Vetorize um trecho", entrega: "No QGIS, crie uma camada de linha e desenhe o leito de um trecho da sua ferrovia sobre o mapa georreferenciado. Marque as estações como pontos." },
        ] },
      ],
    },
    {
      id: "perfil-rampa-bitola",
      titulo: "Perfil, rampa e bitola: medir o leito",
      blocos: [
        { tipo: "texto", texto: "O perfil longitudinal mostra como o leito sobe e desce. A rampa (ou greide) é a inclinação, dada em porcentagem ou em metros por quilômetro: uma rampa de 2% sobe 2 m a cada 100 m. A rampa limita o peso que a locomotiva puxa e explica traçados sinuosos que buscam ganhar altura sem exagerar a inclinação. Dos documentos de perfil você extrai esses números." },
        {
          tipo: "prancha",
          titulo: "Rampa: subida sobre distância",
          desenho: {
            legenda: "Rampa em porcentagem = (desnível ÷ distância horizontal) × 100. Aqui, 4 m em 100 m = 4%.",
            primitivas: [
              { t: "linha", de: [40, 150], ate: [240, 90], cor: "tinta" },
              { t: "linha", de: [40, 150], ate: [240, 150], cor: "suave" },
              { t: "linha", de: [240, 150], ate: [240, 90], cor: "suave" },
              { t: "rotulo", p: [120, 160], texto: "Distância horizontal (100 m)" },
              { t: "rotulo", p: [246, 116], texto: "Desnível (4 m)" },
              { t: "rotulo", p: [110, 104], texto: "Leito (rampa 4%)" },
            ],
          },
        },
        {
          tipo: "licao",
          pergunta: "Um trecho sobe 15 metros ao longo de 1.000 metros de distância horizontal. Qual a rampa?",
          alternativas: ["0,15%", "1,5%", "15%"],
          correta: 1,
          explicacao: "Rampa = (15 ÷ 1.000) × 100 = 1,5%. É uma inclinação comum em ferrovias; rampas muito acima disso exigem artifícios como laços e cremalheira.",
        },
      ],
    },

    // ===================== CAPÍTULO 5 — PROJETO =====================
    {
      id: "projeto-inventario",
      titulo: "Desenhar o projeto de inventário",
      blocos: [
        { tipo: "texto", texto: "Reconstituir memória sem projeto vira colecionismo. O projeto define o objeto (qual linha, quais estações), a pergunta (o que você quer saber e mostrar), as fontes a reunir, os produtos (um mapa, um álbum comentado, um acervo catalogado) e o prazo. Um projeto bem desenhado cabe no tempo e na equipe que você tem, e deixa claro quando está pronto." },
        { tipo: "diagrama", titulo: "Peças do projeto de inventário", codigo: `flowchart TD
  A["Objeto: qual linha e recorte"] --> B["Pergunta: o que quero mostrar"]
  B --> C["Fontes: mapas, fotos, relatos"]
  C --> D["Método: catalogar, georreferenciar, entrevistar"]
  D --> E["Produtos: mapa, álbum, acervo"]
  E --> F["Prazo e equipe"]` },
        { tipo: "texto", texto: "A Carta de Nizhny Tagil reforça que inventariar é um dever anterior a qualquer intervenção: antes de restaurar ou interpretar, registra-se o que existe. O inventário é, ao mesmo tempo, o primeiro produto e a base para todos os outros." },
      ],
    },
    {
      id: "recorte-cronologico",
      titulo: "Recorte: espaço e tempo",
      blocos: [
        { tipo: "texto", texto: "Delimite o recorte antes de começar a reunir material, ou o projeto vira um poço sem fundo. No espaço: a linha inteira, um ramal, um trecho entre duas estações? No tempo: da inauguração ao fechamento, ou só o auge? Um recorte honesto cabe nos recursos e permite profundidade. É melhor esgotar um trecho de 20 km do que raspar superficialmente 300 km." },
        { tipo: "tarefas", itens: [
          { id: "definir-recorte", titulo: "Escreva o recorte em uma frase", entrega: "Complete: 'Vou documentar o trecho ___ da linha ___, entre as estações ___ e ___, no período de ___ a ___, para mostrar ___.'" },
        ] },
      ],
    },
    {
      id: "plano-de-trabalho",
      titulo: "Plano de trabalho e cronograma",
      blocos: [
        { tipo: "texto", texto: "O plano traduz o projeto em etapas com prazo. Uma sequência que funciona: (1) levantamento em acervos; (2) catalogação e crítica; (3) georreferenciamento; (4) campo e entrevistas; (5) montagem dos produtos. Etapas se sobrepõem um pouco, mas têm ordem: não adianta ir a campo sem o mapa georreferenciado que diz onde procurar." },
        {
          tipo: "prancha",
          titulo: "Cronograma em barras",
          desenho: {
            legenda: "Cada barra é uma etapa ao longo do tempo (esquerda para a direita). As etapas se encadeiam e se sobrepõem.",
            primitivas: [
              { t: "linha", de: [95, 28], ate: [95, 168], cor: "suave" },
              { t: "retangulo", p: [95, 34], w: 90, h: 16, cor: "destaque" },
              { t: "rotulo", p: [20, 44], texto: "Acervos" },
              { t: "retangulo", p: [140, 58], w: 90, h: 16, cor: "destaque" },
              { t: "rotulo", p: [20, 68], texto: "Catalogar" },
              { t: "retangulo", p: [150, 82], w: 70, h: 16, cor: "destaque" },
              { t: "rotulo", p: [20, 92], texto: "Georref." },
              { t: "retangulo", p: [185, 106], w: 85, h: 16, cor: "destaque" },
              { t: "rotulo", p: [20, 116], texto: "Campo" },
              { t: "retangulo", p: [210, 130], w: 70, h: 16, cor: "destaque" },
              { t: "rotulo", p: [20, 140], texto: "Produtos" },
            ],
          },
        },
        { tipo: "tarefas", itens: [
          { id: "cronograma", titulo: "Monte seu cronograma", entrega: "Distribua as cinco etapas em semanas ou meses, marcando onde elas se sobrepõem e qual é a dependência de cada uma." },
        ] },
      ],
    },
    {
      id: "mobilizar-arquivista",
      titulo: "Quando o acervo exige um arquivista",
      blocos: [
        { tipo: "texto", texto: "Acervos ferroviários costumam estar sob guarda de instituições (IPHAN, arquivos públicos, museus). Acessar originais frágeis, pedir reprodução de plantas ou organizar um acervo doado exige quem conheça as normas de descrição arquivística e de manuseio. Tentar manipular documentos centenários por conta própria danifica o que se quer preservar. Esta é uma etapa de mobilização." },
        { tipo: "mobilizacao", papel: "Arquivista (ou museólogo) habilitado", porque: "O acesso, a descrição normalizada e o manuseio de documentos originais e frágeis exigem formação específica e seguem normas que protegem o acervo e garantem valor de prova.", entregaEsperada: "Plano de acesso e reprodução dos documentos, descrição arquivística dos itens originais e orientação de manuseio e acondicionamento.", gerenciadoPor: "zaeon" },
        { tipo: "tarefas", itens: [
          { id: "mapear-guardioes", titulo: "Mapeie quem guarda o quê", entrega: "Liste as instituições que podem ter documentos da sua linha e o contato de cada setor de acervo, antes de pedir a mobilização." },
        ] },
      ],
    },

    // ===================== CAPÍTULO 6 — EXECUÇÃO =====================
    {
      id: "no-arquivo",
      titulo: "No arquivo: do pedido à consulta",
      blocos: [
        { tipo: "texto", texto: "Visita a arquivo se prepara. Leve a lista do que procura (linha, estações, período), identifique-se e explique o projeto. Respeite as regras: muitos acervos não permitem caneta, flash ou manuseio direto de originais. Anote sempre a referência completa de cada documento (fundo, série, código), porque sem ela a foto que você tirou não serve como fonte citável depois." },
        { tipo: "tarefas", itens: [
          { id: "preparar-visita", titulo: "Prepare a visita ao arquivo", entrega: "Monte a lista de busca, confirme horário e regras da instituição e prepare uma ficha de campo para anotar a referência de cada item consultado." },
        ] },
      ],
    },
    {
      id: "digitalizacao",
      titulo: "Digitalizar com qualidade",
      blocos: [
        { tipo: "texto", texto: "Uma digitalização malfeita obriga a voltar ao arquivo. Fotografe ou escaneie de frente, sem distorção, com luz uniforme e sem sombra da própria câmera. Para documentos que você vai medir ou georreferenciar, quanto maior a resolução melhor (300 dpi é um piso comum para texto; mapas que serão ampliados pedem mais). Inclua no quadro uma régua ou escala quando possível e capture o documento inteiro, bordas e legendas." },
        { tipo: "texto", texto: "Guarde o arquivo original sem edição (o chamado arquivo de preservação) e trabalhe sobre cópias. Nomeie os arquivos com um padrão que inclua o código da ficha. Cada imagem deve carregar seus metadados: o que é, de onde veio, data da captura. Imagem sem metadado é imagem perdida no primeiro backup." },
        {
          tipo: "licao",
          pergunta: "Por que incluir uma régua ou escala no quadro ao digitalizar um mapa?",
          alternativas: [
            "Para deixar a foto mais bonita",
            "Para permitir recuperar medidas reais mesmo que a escala gráfica do mapa esteja apagada",
            "Porque o arquivo exige",
          ],
          correta: 1,
          explicacao: "A régua no quadro dá uma referência métrica própria, útil para medir e georreferenciar se a escala original estiver ilegível ou ausente.",
        },
      ],
    },
    {
      id: "campo-leito",
      titulo: "Em campo: caminhar o leito antigo",
      blocos: [
        { tipo: "texto", texto: "Mesmo apagada, a ferrovia deixa marcas no terreno: o leito como uma faixa plana e reta demais para ser natural, cortes e aterros, restos de pontes, dormentes, a plataforma de uma estação sumida. Com o mapa georreferenciado no celular, você caminha até a coordenada e procura o vestígio. O que o papel prometeu, o campo confirma ou corrige." },
        {
          tipo: "prancha",
          titulo: "Seção do leito: o que procurar",
          desenho: {
            legenda: "O leito é uma faixa aplainada; nas laterais, valetas e, às vezes, aterro ou corte. Dormentes e brita podem persistir.",
            primitivas: [
              { t: "linha", de: [20, 120], ate: [90, 120], cor: "tinta" },
              { t: "linha", de: [90, 120], ate: [110, 100], cor: "tinta" },
              { t: "linha", de: [110, 100], ate: [200, 100], cor: "tinta" },
              { t: "linha", de: [200, 100], ate: [220, 120], cor: "tinta" },
              { t: "linha", de: [220, 120], ate: [285, 120], cor: "tinta" },
              { t: "rotulo", p: [128, 92], texto: "Leito aplainado" },
              { t: "rotulo", p: [60, 132], texto: "Valeta" },
              { t: "rotulo", p: [228, 132], texto: "Corte/talude" },
              { t: "retangulo", p: [130, 102], w: 10, h: 4, hachura: true },
              { t: "retangulo", p: [160, 102], w: 10, h: 4, hachura: true },
              { t: "rotulo", p: [120, 118], texto: "Restos de dormente" },
            ],
          },
        },
        { tipo: "tarefas", itens: [
          { id: "caminhada-leito", titulo: "Caminhe um trecho do leito", entrega: "Vá a uma coordenada do traçado vetorizado e registre com foto e descrição o que encontrou: leito, corte, aterro, ponte, dormentes ou nada." },
        ] },
      ],
    },
    {
      id: "gps-marcar-vestigios",
      titulo: "Marcar vestígios com GPS",
      blocos: [
        { tipo: "texto", texto: "Cada vestígio achado em campo vira um ponto com coordenada, foto e descrição, que depois entra na mesma camada do traçado no QGIS. Assim o acervo digital cresce com dados de campo verificados, não só com o que o mapa antigo dizia. O conjunto final mostra, lado a lado, o traçado histórico e o que ainda existe hoje, com a prova fotográfica de cada ponto." },
        { tipo: "video", titulo: "Curso QGIS — Georreferenciador (fluxo completo)", youtube: "Ta7UlZTn-Dg" },
        { tipo: "tarefas", itens: [
          { id: "pontos-campo", titulo: "Registre os pontos de campo no SIG", entrega: "Importe para o QGIS os pontos de GPS coletados, com foto e descrição em cada um, sobre o traçado já vetorizado." },
        ] },
      ],
    },
    {
      id: "entrevistas-campo",
      titulo: "Realizar as entrevistas",
      blocos: [
        { tipo: "texto", texto: "Com documentos e campo na mão, a entrevista rende muito mais: você mostra uma foto e pergunta 'onde é isso? quem é essa pessoa? o que acontecia aqui?'. A foto destrava a memória. Prepare um roteiro com temas, mas deixe a pessoa conduzir; grave com boa captação de áudio; colha o consentimento antes; e transcreva logo, enquanto você ainda lembra do contexto." },
        { tipo: "texto", texto: "Cruze sempre o relato com as outras fontes. Se o maquinista diz que o trem cruzava o rio numa ponte de ferro e a foto mostra ponte de madeira, não é mentira: pode ser que a ponte tenha mudado, e aí você achou uma data de reforma. A contradição, bem tratada, é descoberta." },
        { tipo: "tarefas", itens: [
          { id: "entrevista-foto", titulo: "Entreviste com fotos na mão", entrega: "Leve de 5 a 10 fotos impressas a uma entrevista e registre, para cada uma, o que a pessoa identificou: lugar, gente, função e época." },
        ] },
      ],
    },
    {
      id: "rephotography",
      titulo: "Refotografia: a mesma cena, hoje",
      blocos: [
        { tipo: "texto", texto: "A refotografia (rephotography) é voltar ao ponto exato de uma foto antiga e fotografar de novo, com o mesmo enquadramento. O par antigo-atual mostra, num relance, o que permaneceu e o que se perdeu: a estação virou terreno baldio, mas a serra ao fundo é a mesma. Para acertar o ponto, use os invariantes que você já identificou (relevo, rios, construções antigas remanescentes) e o mapa georreferenciado." },
        {
          tipo: "prancha",
          titulo: "Par refotográfico: antes e agora",
          desenho: {
            legenda: "Mesmo enquadramento, décadas de distância. O invariante (a serra) alinha os dois quadros.",
            primitivas: [
              { t: "retangulo", p: [20, 50], w: 120, h: 90, cor: "tinta" },
              { t: "curva", pts: [[28, 90], [70, 70], [132, 86]], cor: "suave" },
              { t: "retangulo", p: [50, 96], w: 40, h: 24, hachura: true },
              { t: "rotulo", p: [48, 146], texto: "Foto antiga (estação)" },
              { t: "retangulo", p: [164, 50], w: 120, h: 90, cor: "tinta" },
              { t: "curva", pts: [[172, 90], [214, 70], [276, 86]], cor: "suave" },
              { t: "rotulo", p: [190, 146], texto: "Hoje (vazio + mesma serra)" },
              { t: "seta", de: [142, 95], ate: [162, 95], cor: "destaque" },
            ],
          },
        },
        { tipo: "tarefas", itens: [
          { id: "par-refoto", titulo: "Produza um par refotográfico", entrega: "Escolha uma foto antiga localizável, vá ao ponto e refotografe no mesmo enquadramento. Apresente os dois lado a lado com a data de cada um." },
        ] },
      ],
    },

    // ===================== CAPÍTULO 7 — PRESERVAÇÃO =====================
    {
      id: "conservar-acervo",
      titulo: "Conservar o acervo físico",
      blocos: [
        { tipo: "texto", texto: "Se o projeto recebe originais (uma caixa de fotos de família, plantas doadas), eles precisam de conservação. Papel e fotografia sofrem com umidade, calor, luz e manuseio. O básico: ambiente seco e estável, guarda em materiais de qualidade de arquivo (livres de ácido), sem fita adesiva nem clipe metálico, e manuseio com mãos limpas. Dano em original é irreversível, por isso digitalize cedo e manuseie pouco." },
        { tipo: "mobilizacao", papel: "Conservador-restaurador de papel e fotografia", porque: "A estabilização, higienização e eventual restauro de documentos e fotografias originais danificados exigem técnica especializada; intervenção amadora acelera a perda do bem.", entregaEsperada: "Diagnóstico de conservação dos originais, higienização e acondicionamento adequados e recomendações de guarda de longo prazo.", gerenciadoPor: "zaeon" },
        {
          tipo: "licao",
          pergunta: "Qual prática ajuda a preservar fotografias e papéis originais?",
          alternativas: [
            "Guardar com fita adesiva em álbum plástico comum, ao sol",
            "Ambiente seco e estável, materiais livres de ácido, manuseio mínimo e digitalização cedo",
            "Plastificar cada documento para sempre",
          ],
          correta: 1,
          explicacao: "Estabilidade climática, materiais de qualidade de arquivo e pouco manuseio prolongam a vida do original; a digitalização reduz a necessidade de tocá-lo.",
        },
      ],
    },
    {
      id: "preservacao-digital",
      titulo: "Preservação digital: backup e metadados",
      blocos: [
        { tipo: "texto", texto: "O acervo digital também se perde: HD queima, serviço fecha, formato fica obsoleto. A regra prática mais citada é 3-2-1: três cópias dos dados, em dois tipos de mídia diferentes, com uma cópia fora do local. Some a isso metadados consistentes (o que é cada arquivo, de onde veio) e formatos abertos e duráveis (TIFF para imagem de preservação, por exemplo). Sem isso, você fez todo o trabalho para perder depois." },
        { tipo: "diagrama", titulo: "Regra 3-2-1 de backup", codigo: `flowchart TD
  A["Acervo digital catalogado"] --> B["3 cópias dos dados"]
  B --> C["2 tipos de mídia diferentes"]
  C --> D["1 cópia fora do local"]
  D --> E["Checagem periódica e migração de formato"]` },
        { tipo: "tarefas", itens: [
          { id: "plano-backup", titulo: "Escreva seu plano 3-2-1", entrega: "Defina onde ficam as três cópias do acervo, em que mídias e qual é a cópia externa, e marque uma data para a primeira verificação de integridade." },
        ] },
      ],
    },

    // ===================== CAPÍTULO 8 — CASOS REAIS =====================
    {
      id: "caso-madeira-mamore",
      titulo: "Caso: a Estrada de Ferro Madeira-Mamoré",
      blocos: [
        { tipo: "texto", texto: "A Madeira-Mamoré, em Rondônia, concluída em 1912 e desativada em 1972, é um dos casos mais estudados de memória ferroviária no Brasil. Construída em condições brutais na Amazônia, ganhou o apelido de 'ferrovia do diabo' pela altíssima mortalidade entre os trabalhadores. Seu complexo em Porto Velho, com estação, oficinas, locomotivas e museu, é protegido como patrimônio, e a cidade nasceu do canteiro da obra." },
        { tipo: "texto", texto: "O caso mostra o valor das fotografias: fotógrafos como Dana Merrill registraram a construção, e esse acervo é hoje fonte central para reconstituir o traçado, as pontes e o cotidiano da obra. Repare, ao assistir, como a mesma ferrovia é narrada ora como façanha de engenharia, ora como tragédia humana, um lembrete de que toda memória tem ponto de vista." },
        { tipo: "video", titulo: "Madeira-Mamoré — documentário", youtube: "t6X9QetRYuo" },
        { tipo: "fontes", titulo: "Para aprofundar no caso", itens: [
          { titulo: "Os 110 anos da estrada de ferro Madeira-Mamoré (vídeo)", url: "https://www.youtube.com/watch?v=SuUdiw4Jbcs", tipo: "video", nota: "Panorama da construção e do legado da linha." },
          { titulo: "Estações Ferroviárias — Madeira-Mamoré", url: "http://www.estacoesferroviarias.com.br/", tipo: "site", nota: "Fichas e fotos das estações do complexo (buscar por Porto Velho / Madeira-Mamoré)." },
        ] },
      ],
    },
    {
      id: "caso-cafe-paranapiacaba",
      titulo: "Caso: o café, a serra e Paranapiacaba",
      blocos: [
        { tipo: "texto", texto: "No Sudeste, a expansão ferroviária foi movida pelo café. A São Paulo Railway, inaugurada em 1867, venceu a Serra do Mar com um sistema de planos inclinados e teve em Paranapiacaba, no alto da serra, sua vila operária. Tombada nas três esferas (municipal, estadual e federal) e integrada à lista indicativa brasileira ao patrimônio da UNESCO, Paranapiacaba é exemplo de patrimônio industrial ferroviário preservado como conjunto urbano." },
        { tipo: "texto", texto: "O caso ensina a cruzar economia e território: entender o ciclo do café explica por que os trilhos subiram a serra e por onde passaram. O vídeo abaixo acompanha a expansão ferroviária ligada ao café na antiga Central do Brasil, útil para ver como a lógica da exportação desenha o traçado que depois estudamos nos mapas." },
        { tipo: "video", titulo: "A expansão ferroviária do café — Central do Brasil", youtube: "hMsDz8oweR8" },
        { tipo: "tarefas", itens: [
          { id: "economia-tracado", titulo: "Relacione economia e traçado", entrega: "Para a sua linha, escreva um parágrafo explicando que atividade econômica a justificou e como isso aparece no traçado (por onde passa, o que serve)." },
        ] },
      ],
    },

    // ===================== CAPÍTULO 9 — RECURSOS E SÍNTESE =====================
    {
      id: "recursos-gerais",
      titulo: "Recursos: normas, acervos e método",
      blocos: [
        { tipo: "texto", texto: "Reúna aqui os endereços que sustentam o caderno inteiro. São a porta de entrada para aprofundar e a prova de que cada afirmação tem lastro. Guarde-os junto com o seu acervo." },
        { tipo: "fontes", titulo: "Normas e patrimônio", itens: [
          { titulo: "Lei 11.483/2007 (RFFSA e IPHAN)", url: "https://www.planalto.gov.br/ccivil_03/_ato2007-2010/2007/lei/l11483compilado.htm", tipo: "norma", nota: "Base legal do patrimônio ferroviário federal." },
          { titulo: "Portaria IPHAN nº 407/2010", url: "https://www.normasbrasil.com.br/norma/portaria-407-2010_224943.html", tipo: "norma", nota: "Lista do Patrimônio Cultural Ferroviário." },
          { titulo: "Carta de Nizhny Tagil (TICCIH, 2003)", url: "https://ticcih.org/about/charter/", tipo: "norma", nota: "Referência internacional sobre patrimônio industrial." },
        ] },
        { tipo: "fontes", titulo: "Acervos de mapas e fotos", itens: [
          { titulo: "Biblioteca Nacional Digital", url: "https://bndigital.bn.gov.br/", tipo: "site", nota: "Cartografia, iconografia e hemeroteca." },
          { titulo: "IBGE — Biblioteca", url: "https://biblioteca.ibge.gov.br/", tipo: "dataset", nota: "Cartas topográficas e mapas históricos." },
          { titulo: "David Rumsey Map Collection", url: "https://www.davidrumsey.com/", tipo: "dataset", nota: "Mapas históricos com visualizador e georreferência." },
          { titulo: "Estações Ferroviárias do Brasil", url: "http://www.estacoesferroviarias.com.br/", tipo: "site", nota: "Catálogo nacional de estações com fotos." },
          { titulo: "Memória Ferroviária — UNESP Assis", url: "https://memoriaferroviaria.assis.unesp.br/", tipo: "site", nota: "Acervo documental da ferrovia." },
        ] },
        { tipo: "fontes", titulo: "Método: SIG e história oral", itens: [
          { titulo: "QGIS — Georeferencer (manual)", url: "https://docs.qgis.org/3.34/en/docs/user_manual/working_with_raster/georeferencer.html", tipo: "site", nota: "Georreferenciamento no SIG livre." },
          { titulo: "National Library of Scotland — Georeferencing", url: "https://geo.nls.uk/urbhist/guides_georeferencing.html", tipo: "artigo", nota: "Fluxo para mapas históricos." },
          { titulo: "Spatial information of old maps in current digital images (USP/RDG)", url: "https://revistas.usp.br/rdg/article/view/75187", tipo: "artigo", nota: "Georreferenciamento de mapas antigos como método." },
          { titulo: "Associação Brasileira de História Oral", url: "https://www.historiaoral.org.br/", tipo: "site", nota: "Método, ética e referências de história oral." },
        ] },
      ],
    },
    {
      id: "autoavaliacao",
      titulo: "Autoavaliação: você está pronto para montar o acervo?",
      blocos: [
        { tipo: "texto", texto: "Antes de fechar o caderno, teste se o método virou prática. As perguntas abaixo retomam os pilares: ler a fonte, criticar, medir, preservar. Se alguma travar, volte ao capítulo correspondente." },
        {
          tipo: "licao",
          pergunta: "Você encontra uma foto linda de uma estação, sem data nem local. Qual é o encaminhamento correto?",
          alternativas: [
            "Publicar imediatamente como registro histórico da sua linha",
            "Catalogar, datar por elementos internos, tentar localizar cruzando com mapa e terreno, e só afirmar o que as fontes sustentarem",
            "Descartar, porque foto sem legenda não serve",
          ],
          correta: 1,
          explicacao: "Uma foto sem legenda é fonte valiosa: cataloga-se, data-se por pistas internas e localiza-se por cruzamento. A afirmação acompanha a evidência, nunca a vontade.",
        },
        { tipo: "tarefas", itens: [
          { id: "dossie-final", titulo: "Monte o dossiê de um ponto", entrega: "Escolha uma estação e reúna num só documento: a ficha, o mapa georreferenciado com o ponto, uma foto antiga datada, o par refotográfico e um trecho de entrevista que fale dela." },
        ] },
      ],
    },
    {
      id: "compilado",
      titulo: "Prancha de síntese",
      blocos: [
        { tipo: "texto", texto: "A memória de uma ferrovia se reconstrói em camadas que se sustentam. Ler a fonte: mapa e foto são documentos, com autor e finalidade, e pedem crítica. Medir: a escala converte papel em terreno e o georreferenciamento dá coordenadas reais ao traçado antigo, levando você ao ponto exato onde algo existiu. Executar: arquivo, campo, GPS, entrevistas com foto na mão e refotografia transformam promessa de papel em prova verificada. Preservar: original conservado, digitalização cedo, metadados e backup 3-2-1. E, onde a lei e a técnica exigem, mobiliza-se o profissional certo: arquivista para o acervo, conservador-restaurador para o original. Tudo com fonte, porque o que separa memória de boato é a procedência." },
        { tipo: "compilado" },
      ],
    },
  ],
};
