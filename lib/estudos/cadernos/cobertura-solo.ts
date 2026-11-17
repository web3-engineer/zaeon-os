import type { CadernoEstudo } from "../cadernosEstudo";

/**
 * Caderno de campo: "Cobertura do solo para reduzir perda de água no cultivo".
 * Agronomia da água no solo: do caminho que a água faz (evaporação, transpiração,
 * escoamento, percolação) ao canteiro coberto que mantém o solo úmido por mais tempo.
 * Palha (cobertura morta), plantas de cobertura (cobertura viva) e plantio direto —
 * a tríade da Agricultura de Conservação da FAO (manter >= 30% do solo coberto).
 * Todo número, técnica, norma e desenho tem lastro em fonte real (ver páginas "fontes").
 */
export const caderno: CadernoEstudo = {
  id: "cobertura-solo",
  titulo: "Cobertura do solo para reduzir perda de água no cultivo",
  resumo:
    "A água que some do solo nu pode ficar. Este caderno mostra por onde ela foge, como a palha e as plantas de cobertura cortam a evaporação e o escoamento, quanto de cobertura é preciso e como medir o resultado — com FAO, Embrapa, datasets abertos e casos reais de plantio direto e seca.",
  paginas: [
    // ===================== CONTEXTO =====================
    {
      id: "abertura",
      titulo: "Por que a água foge do solo nu",
      blocos: [
        { tipo: "texto", texto: "Num solo descoberto, o sol e o vento puxam a água de dentro da terra para o ar o dia inteiro. É evaporação pura: água que a planta não bebeu, que só esfriou o ar por um instante e sumiu. Quando chove, o problema inverte — a gota bate no solo nu, desmancha os torrões, sela a superfície e boa parte da chuva escorre em vez de entrar. O solo nu perde nas duas pontas: seca rápido e aproveita pouco a chuva." },
        { tipo: "texto", texto: "A cobertura do solo é a resposta mais antiga e mais barata para isso. Uma camada de palha, ou um tapete vivo de plantas de cobertura, faz sombra, segura o vento rente ao chão, amortece a gota de chuva e devolve matéria orgânica. O resultado é solo que fica úmido por mais dias depois de cada rega ou chuva, com a mesma quantidade de água. Este caderno leva você do porquê físico até o canteiro coberto, medido e mantido." },
        { tipo: "diagrama", titulo: "O que a cobertura muda", codigo: `flowchart LR
  N["Solo nu"] -->|"sol e vento"| E1["Evapora muito"]
  N -->|"gota de chuva"| S1["Sela e escorre"]
  C["Solo coberto"] -->|"sombra e barreira"| E2["Evapora pouco"]
  C -->|"amortece a gota"| S2["Infiltra mais"]` },
      ],
    },
    {
      id: "caminhos-da-agua",
      titulo: "Os quatro caminhos da água",
      blocos: [
        { tipo: "texto", texto: "Toda a água que chega ao seu cultivo — pela chuva ou pela rega — sai por quatro caminhos. TRANSPIRAÇÃO: a planta puxa pela raiz e solta pela folha; é o caminho útil, o que vira crescimento. EVAPORAÇÃO: a água sobe direto da superfície do solo para o ar, sem passar pela planta. ESCOAMENTO: a água corre por cima do solo e vai embora pela declividade. PERCOLAÇÃO PROFUNDA: a água desce abaixo das raízes e some para o lençol." },
        { tipo: "texto", texto: "A cobertura ataca três dos quatro: corta a EVAPORAÇÃO (faz sombra e barreira), reduz o ESCOAMENTO (amortece a chuva e aumenta a infiltração) e, ao manter o solo poroso, equilibra a PERCOLAÇÃO. A transpiração — a parte boa — ela preserva. O ganho central é transformar perda inútil (evaporação e escoamento) em água guardada no solo, à disposição da raiz." },
        {
          tipo: "prancha",
          titulo: "Os quatro destinos da agua no cultivo",
          desenho: {
            legenda: "Transpiracao e o caminho util. A cobertura corta evaporacao e escoamento e guarda agua para a raiz.",
            primitivas: [
              { t: "retangulo", p: [20, 95], w: 265, h: 85, cor: "tinta" },
              { t: "linha", de: [20, 95], ate: [285, 95], cor: "tinta" },
              { t: "circulo", c: [90, 70], r: 16, cor: "suave" },
              { t: "linha", de: [90, 86], ate: [90, 140], cor: "tinta" },
              { t: "seta", de: [90, 60], ate: [90, 28], cor: "destaque" },
              { t: "rotulo", p: [98, 24], texto: "Transpiracao (util)" },
              { t: "seta", de: [180, 92], ate: [180, 30], cor: "destaque" },
              { t: "rotulo", p: [188, 28], texto: "Evaporacao" },
              { t: "seta", de: [275, 98], ate: [300, 110], cor: "destaque" },
              { t: "rotulo", p: [230, 90], texto: "Escoamento" },
              { t: "seta", de: [140, 150], ate: [140, 178], cor: "suave" },
              { t: "rotulo", p: [150, 172], texto: "Percolacao profunda" },
            ],
          },
        },
        {
          tipo: "licao",
          pergunta: "Qual caminho da água a cobertura do solo NÃO quer reduzir?",
          alternativas: [
            "A evaporação da superfície do solo",
            "A transpiração da planta",
            "O escoamento superficial",
          ],
          correta: 1,
          explicacao: "A transpiração é o caminho útil — é a água virando crescimento. A cobertura corta a evaporação e o escoamento (perdas) e preserva a transpiração.",
        },
      ],
    },
    {
      id: "evaporacao-no-solo",
      titulo: "A evaporação do solo nu, em dois estágios",
      blocos: [
        { tipo: "texto", texto: "A evaporação do solo não é constante: acontece em dois estágios. ESTÁGIO 1 (taxa alta): logo depois da chuva ou rega, a superfície está molhada e a evaporação é limitada só pela energia disponível (sol e vento) — perde-se muita água por dia. ESTÁGIO 2 (taxa baixa): quando a superfície seca, a água passa a vir de baixo, lentamente, e a evaporação cai. O grande desperdício está no estágio 1, nos primeiros dias úmidos." },
        { tipo: "texto", texto: "É aí que a cobertura brilha: ela encurta e enfraquece o estágio 1. A sombra reduz a energia que chega à superfície; a barreira física corta a troca de vapor com o vento. Na prática, cada evento de água (chuva ou rega) perde menos nos primeiros dias — e, somado ao longo do ciclo, isso é muita água guardada. A FAO modela isso separando o coeficiente de evaporação do solo (Ke) do coeficiente basal da planta (Kcb) no Paper 56." },
        { tipo: "diagrama", titulo: "Dois estagios da evaporacao", codigo: `flowchart TD
  R["Chuva ou rega: solo molhado"] --> E1["Estagio 1: taxa alta limitada pela energia"]
  E1 --> SEC["Superficie seca"]
  SEC --> E2["Estagio 2: taxa baixa limitada pela conducao"]
  E1 -->|"cobertura encurta"| G["Menos perda no estagio 1"]` },
      ],
    },
    {
      id: "cobertura-como-funciona",
      titulo: "Como a cobertura corta a perda: o balanço de energia",
      blocos: [
        { tipo: "texto", texto: "Evaporar água custa energia (calor). Essa energia vem da radiação solar que chega à superfície. Num solo nu, quase toda essa energia bate direto na água da superfície e a evapora. A cobertura intercepta a radiação antes de ela chegar ao solo: parte é refletida (a palha clara tem albedo maior que o solo escuro), parte aquece a própria palha. Chega menos energia na água — logo, menos evaporação." },
        { tipo: "texto", texto: "Há um segundo efeito, tão importante quanto: a BARREIRA AO VAPOR E AO VENTO. A evaporação precisa que o vapor saia da superfície e seja levado pelo ar. A camada de palha cria um ar parado e úmido rente ao solo, com baixo gradiente de vapor, e ainda bloqueia o vento que removeria esse vapor. Menos energia + ar parado e úmido = a superfície do solo fica mais fria e mais úmida por muito mais tempo." },
        {
          tipo: "prancha",
          titulo: "Balanco de energia: solo nu x solo coberto",
          desenho: {
            legenda: "A cobertura reflete parte da radiacao, aquece a palha e deixa um ar parado e umido sobre o solo.",
            primitivas: [
              { t: "seta", de: [50, 20], ate: [50, 70], cor: "destaque" },
              { t: "seta", de: [80, 20], ate: [80, 70], cor: "destaque" },
              { t: "rotulo", p: [40, 14], texto: "Sol (radiacao)" },
              { t: "retangulo", p: [25, 75], w: 90, h: 60, cor: "tinta" },
              { t: "rotulo", p: [35, 150], texto: "Solo NU: evapora" },
              { t: "seta", de: [70, 75], ate: [70, 40], cor: "destaque" },
              { t: "seta", de: [200, 20], ate: [200, 58], cor: "destaque" },
              { t: "seta", de: [200, 58], ate: [185, 38], cor: "suave" },
              { t: "rotulo", p: [205, 40], texto: "parte reflete" },
              { t: "retangulo", p: [175, 60], w: 90, h: 10, hachura: true, cor: "suave" },
              { t: "rotulo", p: [175, 55], texto: "palha" },
              { t: "retangulo", p: [175, 75], w: 90, h: 60, cor: "tinta" },
              { t: "rotulo", p: [180, 150], texto: "Solo COBERTO: guarda" },
            ],
          },
        },
        {
          tipo: "licao",
          pergunta: "Além de fazer sombra, qual é o outro efeito-chave da cobertura contra a evaporação?",
          alternativas: [
            "Aumenta o vento sobre o solo para secar mais rápido",
            "Cria um ar parado e úmido rente ao solo e bloqueia o vento, reduzindo a saída de vapor",
            "Esquenta a superfície do solo",
          ],
          correta: 1,
          explicacao: "A cobertura corta energia (sombra/reflexão) E forma uma barreira ao vapor e ao vento. Ar parado e úmido sobre o solo tem baixo gradiente de vapor, então evapora menos.",
        },
      ],
    },
    {
      id: "tipos-de-cobertura",
      titulo: "O mapa das coberturas",
      blocos: [
        { tipo: "texto", texto: "Existem quatro famílias de cobertura. COBERTURA MORTA (mulch orgânico): palha, restos de cultura, folhas, casca, maravalha — a mais comum na horta. COBERTURA VIVA / PLANTAS DE COBERTURA: milheto, braquiária, aveia, crotalária, feijão-de-porco plantados para cobrir o solo entre safras. PLANTIO DIRETO: a palhada da cultura anterior fica no lugar e se semeia por cima, sem revolver o solo. FILME PLÁSTICO (mulching plástico): usado em morango, melão e hortaliças de valor, impermeável e caro." },
        { tipo: "texto", texto: "Cada uma tem seu lugar. A palha é imediata e barata, mas precisa ser reposta. A cobertura viva constrói raiz e matéria orgânica, mas compete por água enquanto está viva — por isso é terminada (rolada ou dessecada) antes da cultura principal. O plantio direto junta as duas lógicas e é o sistema que a Agricultura de Conservação da FAO recomenda, com a regra prática de manter pelo menos 30% do solo coberto o tempo todo." },
        { tipo: "diagrama", titulo: "Familias de cobertura e quando usar", codigo: `flowchart LR
  M["Cobertura morta (palha)"] --> Mn["Imediata, barata, repor"]
  V["Cobertura viva (plantas)"] --> Vn["Constroi solo, terminar antes"]
  PD["Plantio direto (palhada)"] --> PDn["Sistema FAO, >= 30% coberto"]
  P["Filme plastico"] --> Pn["Cultivo de valor, impermeavel"]` },
        {
          tipo: "fontes",
          titulo: "Fontes desta etapa",
          itens: [
            { titulo: "FAO — Conservation Agriculture (os três princípios: cobertura permanente, revolvimento mínimo, diversificação)", url: "https://www.fao.org/conservation-agriculture/en/", tipo: "site", nota: "Define a regra de manter >= 30% do solo coberto com resíduos e/ou plantas de cobertura." },
            { titulo: "Embrapa Solos — unidade de pesquisa de solos", url: "https://www.embrapa.br/solos", tipo: "site", nota: "Referência brasileira em manejo e conservação de solo." },
          ],
        },
      ],
    },
    // ===================== LEITURA DO TEMA / LOCAL =====================
    {
      id: "agua-disponivel",
      titulo: "O tanque do solo: CC, PMP e água disponível",
      blocos: [
        { tipo: "texto", texto: "O solo guarda água como um tanque. Depois de uma chuva forte, o excesso escorre por gravidade; quando para de escorrer, o solo está na CAPACIDADE DE CAMPO (CC) — cheio, mas drenado. Conforme a planta e a evaporação retiram água, chega-se ao PONTO DE MURCHA PERMANENTE (PMP): a água que resta está tão presa às partículas que a raiz não consegue puxar. A diferença CC − PMP é a ÁGUA DISPONÍVEL, o volume útil do tanque." },
        { tipo: "texto", texto: "A cobertura não aumenta o tamanho do tanque de uma hora para outra, mas faz ele esvaziar mais devagar: ao cortar a evaporação, a água fica para a planta em vez de ir para o ar. Com o tempo, a matéria orgânica trazida pela palha também aumenta a capacidade de retenção. Manter a umidade dentro da faixa útil, sem deixar passar do limite seguro, é o que a FAO chama de manejo pelo balanço de água no solo." },
        {
          tipo: "prancha",
          titulo: "O reservatorio do solo e a faixa util",
          desenho: {
            legenda: "A agua disponivel fica entre a capacidade de campo (topo) e o ponto de murcha (base). A cobertura faz o nivel cair mais devagar.",
            primitivas: [
              { t: "retangulo", p: [45, 20], w: 110, h: 150, cor: "tinta" },
              { t: "retangulo", p: [45, 55], w: 110, h: 85, hachura: true, cor: "suave" },
              { t: "linha", de: [45, 55], ate: [155, 55], cor: "destaque" },
              { t: "linha", de: [45, 140], ate: [155, 140], cor: "destaque" },
              { t: "rotulo", p: [160, 28], texto: "Saturacao (encharcado)" },
              { t: "rotulo", p: [160, 57], texto: "Capacidade de campo" },
              { t: "rotulo", p: [160, 100], texto: "AGUA DISPONIVEL" },
              { t: "rotulo", p: [160, 142], texto: "Ponto de murcha" },
              { t: "seta", de: [100, 140], ate: [100, 57], cor: "destaque" },
              { t: "rotulo", p: [55, 185], texto: "a cobertura esvazia devagar" },
            ],
          },
        },
        {
          tipo: "fontes",
          itens: [
            { titulo: "FAO Irrigation and Drainage Paper 56 — Crop evapotranspiration (Allen, Pereira, Raes & Smith, 1998)", url: "https://www.fao.org/4/x0490e/x0490e00.htm", tipo: "livro", nota: "Referência mundial de CC, PMP, água disponível (TAW/RAW) e do coeficiente de evaporação do solo (Ke)." },
          ],
        },
      ],
    },
    {
      id: "textura-e-solo",
      titulo: "Textura e estrutura: por que um mesmo % significa coisas diferentes",
      blocos: [
        { tipo: "texto", texto: "A mesma umidade em percentual significa coisas diferentes em areia e em argila. Solo ARENOSO tem poros grandes: segura pouca água e seca rápido — cobrir é quase obrigatório. Solo ARGILOSO tem poros finos: segura muita água, mas boa parte fica presa abaixo do ponto de murcha. A ESTRUTURA (como as partículas se agregam) e a MATÉRIA ORGÂNICA mudam tudo: solo bem agregado e rico em matéria orgânica infiltra e retém muito mais." },
        { tipo: "texto", texto: "É por isso que a cobertura é um investimento composto: além do efeito imediato (menos evaporação), a palha e as raízes das plantas de cobertura alimentam a vida do solo, que cola as partículas em agregados estáveis. Com o tempo, o solo coberto retém mais água por si só. Para saber onde seu solo está, uma análise física (textura, densidade, retenção) feita em laboratório é o ponto de partida." },
        { tipo: "diagrama", titulo: "Textura x comportamento da agua", codigo: `flowchart TD
  A["Arenoso: poros grandes"] --> A2["Infiltra rapido, retem pouco, seca rapido"]
  G["Argiloso: poros finos"] --> G2["Retem muito, parte presa, infiltra devagar"]
  MO["Materia organica da cobertura"] --> MO2["Agrega, infiltra e retem mais"]` },
        {
          tipo: "licao",
          pergunta: "Em qual solo a cobertura tende a fazer a diferença mais imediata contra a seca?",
          alternativas: [
            "Arenoso, que seca rápido e retém pouca água",
            "Qualquer solo já saturado de água",
            "Argiloso encharcado",
          ],
          correta: 0,
          explicacao: "O arenoso tem pouca água disponível e seca depressa; cortar a evaporação com cobertura estica o intervalo entre regas de forma visível. Em todo solo a cobertura ajuda, mas no arenoso o efeito aparece mais rápido.",
        },
      ],
    },
    {
      id: "crosta-e-infiltracao",
      titulo: "A gota que sela o solo: crosta e infiltração",
      blocos: [
        { tipo: "texto", texto: "A gota de chuva chega ao solo nu com energia. Ela bate, desmancha os agregados da superfície e as partículas finas entopem os poros — forma-se uma CROSTA (encrostamento ou selamento superficial) de poucos milímetros. Essa crosta é quase impermeável: a chuva seguinte não entra, escorre. Resultado perverso: justo quando mais chove, menos água infiltra, e ainda leva o solo embora (erosão)." },
        { tipo: "texto", texto: "A cobertura resolve na raiz do problema: ela AMORTECE a gota antes de bater no solo. Sem impacto direto, não há selamento; os poros ficam abertos e a água entra. A palha ainda cria caminhos para a água descer e segura o fluxo na superfície, dando tempo de infiltrar. É o mesmo princípio que reduz o fator de cobertura (fator C) na Equação Universal de Perda de Solo (USLE)." },
        {
          tipo: "prancha",
          titulo: "Gota no solo nu x gota na cobertura",
          desenho: {
            legenda: "No solo nu a gota sela a superficie e a agua escorre. Na cobertura a gota e amortecida e a agua infiltra.",
            primitivas: [
              { t: "seta", de: [55, 20], ate: [55, 70], cor: "destaque" },
              { t: "rotulo", p: [25, 14], texto: "gota" },
              { t: "retangulo", p: [25, 72], w: 90, h: 55, cor: "tinta" },
              { t: "linha", de: [25, 72], ate: [115, 72], cor: "destaque" },
              { t: "rotulo", p: [22, 140], texto: "NU: sela e escorre" },
              { t: "seta", de: [115, 72], ate: [135, 82], cor: "destaque" },
              { t: "seta", de: [205, 20], ate: [205, 60], cor: "destaque" },
              { t: "retangulo", p: [175, 62], w: 90, h: 8, hachura: true, cor: "suave" },
              { t: "rotulo", p: [175, 57], texto: "palha amortece" },
              { t: "retangulo", p: [175, 72], w: 90, h: 55, cor: "tinta" },
              { t: "seta", de: [205, 72], ate: [205, 115], cor: "suave" },
              { t: "rotulo", p: [175, 140], texto: "COBERTA: infiltra" },
            ],
          },
        },
        { tipo: "video", titulo: "Qualidade física do solo e o manejo (FEBRAPDP)", youtube: "Jkph-Svkg3s" },
      ],
    },
    {
      id: "ler-o-terreno",
      titulo: "Ler o seu terreno antes de cobrir",
      blocos: [
        { tipo: "texto", texto: "Cobrir bem começa por ler o lugar. CLIMA: quanto mais sol, vento e calor, maior a evaporação e maior o ganho da cobertura; em região chuvosa, a cobertura foca em infiltração e anti-erosão. DECLIVE: terreno inclinado escorre mais — cobertura e plantio em nível são prioridade. CULTURA: hortaliça de raiz rasa sofre mais com solo seco na superfície; fruteira perene se beneficia de cobertura permanente na linha." },
        { tipo: "texto", texto: "Levante também a origem da água (chuva, rega manual, gotejamento) e os materiais que você tem perto e de graça (palha de capim, folhas, maravalha de serraria, resto de poda). O melhor projeto de cobertura é o que usa o que sobra ali do lado. Anote tudo num croqui: onde bate mais sol, por onde a água corre quando chove forte, onde o solo seca primeiro." },
        {
          tipo: "tarefas",
          itens: [
            { id: "ler-1", titulo: "Desenhar o croqui do terreno", entrega: "Mapa simples do canteiro/área com norte, sol, declive e por onde a água escorre na chuva forte." },
            { id: "ler-2", titulo: "Listar materiais de cobertura disponíveis de graça num raio de 2 km", entrega: "Lista com material, fonte, distância e quantidade aproximada (palha, folhas, maravalha, poda)." },
            { id: "ler-3", titulo: "Marcar o ponto que seca primeiro", entrega: "Foto do local onde o solo racha/seca antes dos outros — é ali que a cobertura deve começar." },
          ],
        },
      ],
    },
    {
      id: "balanco-hidrico",
      titulo: "O balanço hídrico simplificado",
      blocos: [
        { tipo: "texto", texto: "Para decidir quando e quanto regar — e para enxergar o ganho da cobertura — usa-se um balanço hídrico simples, como um extrato bancário da água no solo. ENTRADAS: chuva + irrigação. SAÍDAS: evapotranspiração (ET = evaporação do solo + transpiração da planta) + escoamento + percolação. O saldo é a água armazenada no solo. A regra: nunca deixar o saldo cair abaixo do limite de reposição (uma fração p da água disponível, tipicamente perto da metade)." },
        { tipo: "texto", texto: "A cobertura entra no balanço reduzindo a parcela de EVAPORAÇÃO da ET e reduzindo o ESCOAMENTO. Mantendo tudo o mais igual, o saldo cai mais devagar: o intervalo entre regas aumenta e cada chuva rende mais. A FAO calcula a ET de referência (ET0) a partir do clima e multiplica pelo coeficiente da cultura (Kc); no método dual, separa o Kc em transpiração (Kcb) e evaporação do solo (Ke) — e é o Ke que a cobertura derruba." },
        { tipo: "diagrama", titulo: "Balanco hidrico do solo", codigo: `flowchart LR
  CH["Chuva"] --> S["Agua no solo"]
  IR["Irrigacao"] --> S
  S --> ET["Evapotranspiracao (ET)"]
  S --> ES["Escoamento"]
  S --> PE["Percolacao"]
  COB["Cobertura"] -->|"reduz Ke e escoamento"| ET` },
        {
          tipo: "licao",
          pergunta: "No método dual de coeficiente de cultura da FAO 56, qual parcela a cobertura do solo reduz diretamente?",
          alternativas: [
            "O coeficiente basal de transpiração da planta (Kcb)",
            "O coeficiente de evaporação do solo (Ke)",
            "A evapotranspiração de referência climática (ET0)",
          ],
          correta: 1,
          explicacao: "A cobertura age sobre a evaporação da superfície do solo — o Ke. A transpiração (Kcb) é preservada e o ET0, que depende do clima, não muda.",
        },
      ],
    },
    {
      id: "fontes-fundamentos",
      titulo: "Fontes — os fundamentos",
      blocos: [
        { tipo: "texto", texto: "Os conceitos deste caderno não são opinião: estão em referências primárias de agronomia e conservação de solo. Guarde estes links — são a base de tudo o que vem a seguir." },
        {
          tipo: "fontes",
          titulo: "Fundamentos (água no solo e conservação)",
          itens: [
            { titulo: "FAO IDP 56 — Crop evapotranspiration (Allen et al., 1998)", url: "https://www.fao.org/4/x0490e/x0490e00.htm", tipo: "livro", nota: "ET0, Kc dual (Kcb + Ke), CC, PMP, água disponível e fração de depleção p." },
            { titulo: "FAO — Conservation Agriculture", url: "https://www.fao.org/conservation-agriculture/en/", tipo: "site", nota: "Três princípios e a regra de >= 30% de cobertura permanente." },
            { titulo: "FAO AQUASTAT — Global Information System on Water and Agriculture", url: "https://www.fao.org/aquastat/en/", tipo: "dataset", nota: "Dados oficiais de uso da água; a agricultura responde pela maior fatia das retiradas de água doce." },
            { titulo: "Embrapa Hortaliças", url: "https://www.embrapa.br/hortalicas", tipo: "site", nota: "Manejo de água e cobertura em hortaliças, contexto brasileiro." },
          ],
        },
      ],
    },
    // ===================== METODO / MEDICAO =====================
    {
      id: "medir-umidade",
      titulo: "Medir a umidade do solo de verdade",
      blocos: [
        { tipo: "texto", texto: "Para provar que a cobertura funciona, meça. Há três jeitos práticos. GRAVIMETRIA (padrão-ouro): pesa-se uma amostra úmida, seca-se em estufa a 105 °C até peso constante e pesa-se de novo; a diferença é a água. É exato, mas demora. TENSIÔMETRO: mede a tensão (com que força o solo segura a água, em kPa) — consagrado pela Embrapa no manejo de hortaliças, lê bem a faixa úmida. SENSOR CAPACITIVO: estima o conteúdo em tempo real, barato, precisa calibrar." },
        { tipo: "texto", texto: "O protocolo mais simples para o seu caso: meça a umidade em dois pontos lado a lado — um coberto e um nu — no mesmo dia, à mesma profundidade (por exemplo, 0–10 cm, onde a evaporação pega). Repita alguns dias depois de uma chuva. O ponto coberto deve manter-se mais úmido por mais tempo. Esse é o experimento que transforma a teoria em número seu." },
        {
          tipo: "mobilizacao",
          papel: "Laboratório de análise de solo",
          porque: "Textura, densidade, curva de retenção e matéria orgânica não se medem no olho — exigem equipamento de laboratório (estufa, mesa de tensão/placa de pressão, peneiras). Esses números calibram todo o manejo de água e dizem o ponto de partida do seu solo.",
          entregaEsperada: "Laudo com textura (areia/silte/argila), densidade do solo, teor de matéria orgânica e, se possível, capacidade de campo e ponto de murcha da amostra coletada.",
          gerenciadoPor: "zaeon",
        },
      ],
    },
    {
      id: "medir-cobertura",
      titulo: "Medir quanto do solo está coberto",
      blocos: [
        { tipo: "texto", texto: "A regra da FAO fala em pelo menos 30% de cobertura — mas como medir isso no chão? O método mais usado é o da LINHA-TRANSECTO: estica-se uma trena ou corda com marcas a cada intervalo (por exemplo, a cada 10 cm) sobre o canteiro e conta-se em quantas marcas há palha/resíduo embaixo. A fração de marcas cobertas é a porcentagem de cobertura. Repita em algumas linhas e tire a média." },
        { tipo: "texto", texto: "Alternativa moderna: FOTO VERTICAL. Fotografe o solo de cima (sempre à mesma altura) e estime, em um app ou numa grade impressa sobre a foto, a fração verde/palha versus solo exposto. Para reduzir só a evaporação, quanto mais cobertura, melhor — perto de 100% quase zera a evaporação direta. Para anti-erosão, 30% já reduz bastante o escoamento e a perda de solo." },
        {
          tipo: "prancha",
          titulo: "Metodo da linha-transecto",
          desenho: {
            legenda: "Conte em quantas marcas da trena ha palha embaixo. Marcas cobertas / total = porcentagem de cobertura.",
            primitivas: [
              { t: "linha", de: [20, 60], ate: [285, 60], cor: "tinta" },
              { t: "linha", de: [40, 55], ate: [40, 65], cor: "tinta" },
              { t: "linha", de: [80, 55], ate: [80, 65], cor: "tinta" },
              { t: "linha", de: [120, 55], ate: [120, 65], cor: "tinta" },
              { t: "linha", de: [160, 55], ate: [160, 65], cor: "tinta" },
              { t: "linha", de: [200, 55], ate: [200, 65], cor: "tinta" },
              { t: "linha", de: [240, 55], ate: [240, 65], cor: "tinta" },
              { t: "retangulo", p: [32, 70], w: 24, h: 18, hachura: true, cor: "suave" },
              { t: "retangulo", p: [112, 70], w: 24, h: 18, hachura: true, cor: "suave" },
              { t: "retangulo", p: [152, 70], w: 24, h: 18, hachura: true, cor: "suave" },
              { t: "retangulo", p: [232, 70], w: 24, h: 18, hachura: true, cor: "suave" },
              { t: "rotulo", p: [20, 48], texto: "trena com marcas" },
              { t: "rotulo", p: [60, 110], texto: "palha nas marcas 1,3,4,6 de 6 = 67%" },
            ],
          },
        },
        {
          tipo: "tarefas",
          itens: [
            { id: "cob-1", titulo: "Medir a cobertura por linha-transecto", entrega: "Três linhas medidas e a % média de cobertura do canteiro antes e depois de aplicar a palha." },
            { id: "cob-2", titulo: "Registrar foto vertical padronizada", entrega: "Foto de cima do mesmo ponto, sempre à mesma altura, para comparar ao longo das semanas." },
          ],
        },
      ],
    },
    {
      id: "medir-evaporacao",
      titulo: "Microlisímetro: medir a evaporação que você evitou",
      blocos: [
        { tipo: "texto", texto: "Dá para medir a evaporação do solo de forma caseira com um MICROLISÍMETRO: um tubo (cano de PVC curto, uns 10 cm de diâmetro e 10–15 cm de altura) cheio de solo, fechado embaixo, pesado todos os dias numa balança. A perda de peso de um dia para o outro é a água que evaporou (1 g de água perdida por cm² equivale a 1 mm de evaporação). Monte dois: um exposto e um sob cobertura." },
        { tipo: "texto", texto: "Faça o teste depois de molhar os dois até escorrer (capacidade de campo). Pese de manhã, todo dia, por uma semana seca. O microlisímetro coberto perde bem menos nos primeiros dias — e a soma da semana é a água que a cobertura guardou para você. É um experimento de feira de ciências, mas o princípio é o mesmo dos lisímetros de pesquisa que calibram a FAO 56." },
        { tipo: "diagrama", titulo: "Microlisimetro passo a passo", codigo: `flowchart TD
  M["Encher dois tubos com solo"] --> W["Molhar ate escorrer (CC)"]
  W --> P1["Pesar os dois de manha"]
  P1 --> D["Esperar 24h"]
  D --> P2["Pesar de novo"]
  P2 --> R["Diferenca = evaporacao do dia"]
  R --> P1` },
        {
          tipo: "licao",
          pergunta: "No microlisímetro, o que representa a diferença de peso entre dois dias?",
          alternativas: [
            "O crescimento das raízes dentro do tubo",
            "A água que evaporou do solo naquele período",
            "A quantidade de chuva que caiu",
          ],
          correta: 1,
          explicacao: "O tubo é fechado embaixo (sem drenagem) e sem planta, então a única saída de água é a evaporação. A perda de peso é exatamente a evaporação — e o tubo coberto perde menos.",
        },
      ],
    },
    {
      id: "calcular-palha",
      titulo: "Quanto de palha preciso?",
      blocos: [
        { tipo: "texto", texto: "Duas contas ajudam a dimensionar a cobertura morta. Pela ESPESSURA: uma camada de 5 a 10 cm de palha solta cobre bem e dura uma estação; menos que isso deixa o sol passar, mais que isso pode travar a emergência de sementes pequenas. Pela MASSA: para boa supressão de evaporação e de plantas daninhas, mira-se tipicamente em torno de 4 a 6 toneladas de matéria seca por hectare — o equivalente a cerca de 0,4 a 0,6 kg de palha seca por metro quadrado." },
        { tipo: "texto", texto: "Converta para a sua horta: um canteiro de 1 m × 5 m (5 m²) pede, nessa faixa, cerca de 2 a 3 kg de palha seca para uma boa camada. Se o material é fofo (capim seco), vai pouco peso e muito volume; se é denso (maravalha), o contrário. Comece pela espessura visível (o solo não aparece) e ajuste. Lembre: a regra dos 30% da FAO é o mínimo anti-erosão; para cortar evaporação de verdade, mire cobertura quase total." },
        {
          tipo: "prancha",
          titulo: "Espessura e massa de cobertura morta",
          desenho: {
            legenda: "Camada de 5 a 10 cm; cerca de 0,4 a 0,6 kg de palha seca por metro quadrado para boa supressao.",
            primitivas: [
              { t: "retangulo", p: [40, 110], w: 220, h: 50, cor: "tinta" },
              { t: "retangulo", p: [40, 80], w: 220, h: 30, hachura: true, cor: "suave" },
              { t: "linha", de: [40, 80], ate: [260, 80], cor: "destaque" },
              { t: "seta", de: [25, 110], ate: [25, 80], cor: "destaque" },
              { t: "rotulo", p: [28, 95], texto: "5-10 cm" },
              { t: "rotulo", p: [95, 70], texto: "palha (sombra total)" },
              { t: "rotulo", p: [95, 140], texto: "solo umido" },
              { t: "rotulo", p: [40, 180], texto: "~0,4-0,6 kg seco / m2" },
            ],
          },
        },
        {
          tipo: "licao",
          pergunta: "Por que uma camada de palha fina demais falha em segurar a água?",
          alternativas: [
            "Porque deixa o sol e o vento atingirem o solo, mantendo a evaporação alta",
            "Porque pesa demais sobre as sementes",
            "Porque aumenta a transpiração da planta",
          ],
          correta: 0,
          explicacao: "A cobertura só corta a evaporação se de fato interceptar a radiação e barrar o vento. Palha rala deixa o solo exposto em boa parte, e por ali a água continua fugindo.",
        },
      ],
    },
    {
      id: "calcular-economia",
      titulo: "Estimar a água que a cobertura economiza",
      blocos: [
        { tipo: "texto", texto: "Uma estimativa de ordem de grandeza ajuda a decidir. Num cultivo de ciclo curto, a evaporação direta do solo pode representar uma parcela importante da evapotranspiração total — especialmente no início, quando a planta ainda é pequena e o solo fica muito exposto entre as linhas. Cobrir esse solo exposto reduz justamente essa parcela. A FAO 56 trata isso pelo Ke, que cai quando a fração de solo molhado e exposto diminui." },
        { tipo: "texto", texto: "Monte a sua estimativa com os números que você mesmo mediu: se o microlisímetro coberto perdeu, digamos, 1,5 mm/dia contra 4 mm/dia do exposto, a cobertura poupou 2,5 mm por dia naquele solo. Multiplique pelos dias de ciclo e pela área: 2,5 mm/dia × 30 dias = 75 mm = 75 litros por m². Numa horta de 50 m², são cerca de 3.750 litros guardados num mês. Números seus, do seu solo — não de folheto." },
        { tipo: "diagrama", titulo: "Da medida a economia", codigo: `flowchart LR
  A["Evaporacao solo nu (mm/dia)"] --> C["Diferenca = economia diaria"]
  B["Evaporacao solo coberto (mm/dia)"] --> C
  C --> D["x dias de ciclo"]
  D --> E["x area (m2)"]
  E --> F["Litros guardados"]` },
        {
          tipo: "fontes",
          titulo: "Fontes de método e dados",
          itens: [
            { titulo: "FAO IDP 56 — Capítulo do coeficiente dual (Ke e evaporação do solo)", url: "https://www.fao.org/4/x0490e/x0490e00.htm", tipo: "livro", nota: "Como a evaporação do solo é calculada e por que cai com cobertura/sombreamento." },
            { titulo: "INMET — Instituto Nacional de Meteorologia", url: "https://portal.inmet.gov.br/", tipo: "dataset", nota: "Dados climáticos oficiais (temperatura, vento, radiação, chuva) para estimar a demanda evaporativa local." },
          ],
        },
      ],
    },
    {
      id: "relacao-cn",
      titulo: "Relação C/N: a palha que amarra o nitrogênio",
      blocos: [
        { tipo: "texto", texto: "Nem toda palha se comporta igual na terra. O que decide é a RELAÇÃO CARBONO/NITROGÊNIO (C/N) do material. Palhas secas e ricas em carbono (capim, palha de arroz, serragem) têm C/N alto — algo como 60 a 80 para 1 ou mais. Os micro-organismos que as decompõem precisam de nitrogênio para trabalhar e o puxam do solo, causando IMOBILIZAÇÃO temporária: por algumas semanas, sobra menos nitrogênio para a cultura." },
        { tipo: "texto", texto: "Materiais verdes e tenros (leguminosas como crotalária e feijão-de-porco, grama recém-cortada) têm C/N baixo (perto de 15–25 para 1): decompõem rápido e liberam nitrogênio. Estratégia prática: use palha grosseira (C/N alto) por cima, como cobertura que dura e segura água; e deixe o material verde e as raízes das plantas de cobertura para alimentar o solo. Se usar muita palha de C/N alto perto do plantio, complemente com uma fonte de nitrogênio para a planta não amarelar." },
        {
          tipo: "prancha",
          titulo: "C/N alto x C/N baixo",
          desenho: {
            legenda: "C/N alto (palha seca) dura e imobiliza N temporariamente. C/N baixo (verde/leguminosa) decompoe rapido e libera N.",
            primitivas: [
              { t: "retangulo", p: [25, 40], w: 110, h: 110, cor: "tinta" },
              { t: "rotulo", p: [35, 32], texto: "C/N ALTO (60-80)" },
              { t: "rotulo", p: [35, 75], texto: "palha seca, capim" },
              { t: "rotulo", p: [35, 100], texto: "dura, segura agua" },
              { t: "rotulo", p: [35, 125], texto: "imobiliza N" },
              { t: "retangulo", p: [170, 40], w: 110, h: 110, hachura: true, cor: "suave" },
              { t: "rotulo", p: [180, 32], texto: "C/N BAIXO (15-25)" },
              { t: "rotulo", p: [180, 75], texto: "verde, leguminosa" },
              { t: "rotulo", p: [180, 100], texto: "decompoe rapido" },
              { t: "rotulo", p: [180, 125], texto: "libera N" },
            ],
          },
        },
        {
          tipo: "licao",
          pergunta: "Por que muita palha seca (C/N alto) logo no plantio pode deixar a planta amarelada?",
          alternativas: [
            "Porque a palha envenena a raiz",
            "Porque os micro-organismos que decompõem a palha puxam nitrogênio do solo (imobilização), sobrando menos para a cultura",
            "Porque a palha bloqueia toda a luz da planta adulta",
          ],
          correta: 1,
          explicacao: "Decompor carbono exige nitrogênio; os micróbios o tomam do solo temporariamente. Daí a imobilização. Passa quando a decomposição avança, mas no início convém complementar o N da cultura.",
        },
      ],
    },
    {
      id: "fontes-metodo",
      titulo: "Fontes — dados e mapas para o seu projeto",
      blocos: [
        { tipo: "texto", texto: "Antes de projetar, vale conhecer o seu solo e o seu clima por dados abertos. Estes serviços dão textura, propriedades do solo e clima sem custo, úteis para estimar retenção de água e demanda evaporativa." },
        {
          tipo: "fontes",
          titulo: "Datasets e mapas abertos",
          itens: [
            { titulo: "SoilGrids — mapa global de propriedades do solo (ISRIC)", url: "https://soilgrids.org/", tipo: "dataset", nota: "Textura, carbono orgânico, argila/areia/silte a 250 m de resolução, licença CC-BY 4.0." },
            { titulo: "ISRIC — SoilGrids (documentação e metodologia)", url: "https://www.isric.org/explore/soilgrids", tipo: "site", nota: "Explica as 14 propriedades mapeadas e as faixas de profundidade padrão." },
            { titulo: "FAO AQUASTAT — água e agricultura", url: "https://www.fao.org/aquastat/en/", tipo: "dataset", nota: "Perfis por país do uso da água na agricultura." },
            { titulo: "INMET — dados meteorológicos do Brasil", url: "https://portal.inmet.gov.br/", tipo: "dataset", nota: "Estações e normais climatológicas para estimar ET0 local." },
          ],
        },
      ],
    },
    // ===================== COBERTURA VIVA / PLANTAS DE COBERTURA =====================
    {
      id: "plantas-cobertura",
      titulo: "Plantas de cobertura: quem planta o quê",
      blocos: [
        { tipo: "texto", texto: "A cobertura viva é um cultivo plantado para cobrir e cuidar do solo, não para colher. Três famílias dominam. GRAMÍNEAS (milheto, aveia-preta, braquiária, sorgo): produzem muita palha de C/N alto, cobertura durável e raízes que furam a compactação. LEGUMINOSAS (crotalária, feijão-de-porco, mucuna, ervilhaca): fixam nitrogênio do ar e decompõem rápido. CRUCÍFERAS (nabo forrageiro): raiz pivotante que descompacta e recicla nutrientes." },
        { tipo: "texto", texto: "A escolha segue o objetivo e a estação. Quer muita palha para segurar água no verão seco? Milheto ou braquiária. Quer adubar e cobrir no inverno? Aveia + ervilhaca. Quer quebrar camada compactada? Nabo forrageiro. O mais comum é o CONSÓRCIO: misturar gramínea + leguminosa para ter palha durável E nitrogênio. A Embrapa e a FEBRAPDP mantêm recomendações por região e época." },
        { tipo: "diagrama", titulo: "Familias de plantas de cobertura", codigo: `flowchart LR
  GR["Gramineas: milheto, aveia, braquiaria"] --> GRn["Muita palha (C/N alto), raiz fasciculada"]
  LE["Leguminosas: crotalaria, mucuna, ervilhaca"] --> LEn["Fixam N, decompoem rapido"]
  CR["Cruciferas: nabo forrageiro"] --> CRn["Raiz pivotante descompacta"]
  CO["Consorcio graminea + leguminosa"] --> COn["Palha duravel E nitrogenio"]` },
        {
          tipo: "licao",
          pergunta: "Por que se consorcia uma gramínea com uma leguminosa na cobertura?",
          alternativas: [
            "Para colher dois grãos ao mesmo tempo",
            "Para unir a palha durável e abundante da gramínea com o nitrogênio fixado pela leguminosa",
            "Porque leguminosas não cobrem o solo sozinhas",
          ],
          correta: 1,
          explicacao: "A gramínea dá cobertura durável (C/N alto) que segura água; a leguminosa adiciona nitrogênio e acelera a vida do solo. Juntas, cobrem melhor e adubam.",
        },
      ],
    },
    {
      id: "calendario-cobertura",
      titulo: "Calendário e rotação da cobertura",
      blocos: [
        { tipo: "texto", texto: "A cobertura viva se encaixa nas janelas vazias do calendário: entressafra, pousio, entrelinhas de pomar. A ideia da Agricultura de Conservação é não deixar o solo nunca nu — sempre há uma palha protegendo ou uma planta de cobertura crescendo. Planeje a semeadura da cobertura para que ela cresça no período em que o solo ficaria exposto e seja terminada pouco antes do plantio da cultura principal." },
        { tipo: "texto", texto: "Monte um calendário anual simples: marque as janelas de cada canteiro, escolha a cobertura para cada janela conforme a estação (verão: milheto/crotalária; inverno: aveia/ervilhaca) e defina a data de terminação. A ROTAÇÃO entre famílias também quebra ciclos de pragas e doenças — outro princípio da FAO (diversificar com pelo menos três culturas na sequência)." },
        {
          tipo: "prancha",
          titulo: "Calendario: solo nunca nu",
          desenho: {
            legenda: "Em cada janela do ano ha cobertura viva ou palha. A cultura principal entra sobre a palha da cobertura terminada.",
            primitivas: [
              { t: "linha", de: [20, 100], ate: [290, 100], cor: "tinta" },
              { t: "seta", de: [20, 100], ate: [290, 100], cor: "tinta" },
              { t: "rotulo", p: [20, 112], texto: "jan ---- jun ---- dez" },
              { t: "retangulo", p: [30, 70], w: 70, h: 25, hachura: true, cor: "suave" },
              { t: "rotulo", p: [32, 62], texto: "cobertura verao" },
              { t: "retangulo", p: [110, 70], w: 70, h: 25, cor: "destaque" },
              { t: "rotulo", p: [112, 62], texto: "cultura principal" },
              { t: "retangulo", p: [190, 70], w: 80, h: 25, hachura: true, cor: "suave" },
              { t: "rotulo", p: [192, 62], texto: "cobertura inverno" },
              { t: "rotulo", p: [60, 140], texto: "o solo nunca fica nu" },
            ],
          },
        },
        {
          tipo: "tarefas",
          itens: [
            { id: "cal-1", titulo: "Mapear as janelas vazias de cada canteiro no ano", entrega: "Calendário com os períodos em que cada canteiro ficaria sem cultura principal." },
            { id: "cal-2", titulo: "Escolher a cobertura de cada janela", entrega: "Espécie (ou consórcio) definida por janela, com data de semeadura e de terminação." },
          ],
        },
      ],
    },
    {
      id: "terminacao",
      titulo: "Terminação: transformar a cobertura viva em palha",
      blocos: [
        { tipo: "texto", texto: "A cobertura viva precisa ser encerrada (terminada) antes de a cultura principal entrar — senão ela compete por água e luz. Terminar é matar ou deitar a planta no ponto certo (geralmente no florescimento, quando produziu máxima biomassa) para que vire palha no lugar. Três métodos. ROLO-FACA (rolo-crimper): um cilindro com facas que amassa e quebra o caule sem cortar, deitando a cobertura num tapete; mecânico, sem herbicida." },
        { tipo: "texto", texto: "ROÇADA/CORTE: passar a roçadeira e deixar o material no chão — simples, mas rebrota mais. DESSECAÇÃO QUÍMICA: herbicida que seca a planta em pé, usada no plantio direto em escala; exige produto registrado e aplicação responsável. Na horta familiar, o rolo manual ou a roçada bastam. O ponto de terminação é crítico: cedo demais, pouca palha; tarde demais, a cobertura semeia e vira invasora." },
        { tipo: "diagrama", titulo: "Metodos de terminacao", codigo: `flowchart TD
  F["Cobertura no florescimento"] --> RF["Rolo-faca: amassa e deita"]
  F --> RO["Rocada: corta e deixa no chao"]
  F --> DE["Dessecacao quimica: seca em pe"]
  RF --> PA["Tapete de palha no lugar"]
  RO --> PA
  DE --> PA` },
        {
          tipo: "licao",
          pergunta: "Qual é o momento ideal para terminar a cobertura viva e ter mais palha?",
          alternativas: [
            "Logo que germina, para não competir",
            "Por volta do florescimento, quando atingiu a máxima biomassa e ainda não semeou",
            "Depois de produzir sementes maduras",
          ],
          correta: 1,
          explicacao: "No florescimento a planta já acumulou o máximo de biomassa (palha) e ainda não formou sementes viáveis — o que evita que a cobertura vire invasora na cultura seguinte.",
        },
      ],
    },
    {
      id: "plantio-direto",
      titulo: "Plantio direto: cobertura permanente como sistema",
      blocos: [
        { tipo: "texto", texto: "O plantio direto é a forma mais consagrada de manter o solo coberto: a palhada da cultura anterior (ou da planta de cobertura terminada) fica no lugar, e a semente da cultura seguinte é colocada direto nessa palha, por uma máquina que abre só um risco estreito, sem arar nem gradear. O solo nunca é revolvido e nunca fica nu. No Brasil, o sistema transformou a agricultura do Cerrado e do Sul a partir dos anos 1970–1990." },
        { tipo: "texto", texto: "Os três pilares (da Agricultura de Conservação da FAO) andam juntos: revolvimento mínimo, cobertura permanente (>= 30%) e rotação/diversificação de culturas. Os ganhos de água são enormes: menos evaporação, muito mais infiltração, menos erosão e solo que segura a chuva do veranico. A horta de quintal pode copiar o princípio: não revolver à toa, cobrir sempre, rodar as espécies." },
        {
          tipo: "prancha",
          titulo: "Plantio direto: semear sobre a palha",
          desenho: {
            legenda: "A semeadora abre so um risco estreito na palhada e deposita a semente; o resto do solo segue coberto.",
            primitivas: [
              { t: "retangulo", p: [20, 90], w: 270, h: 70, cor: "tinta" },
              { t: "retangulo", p: [20, 78], w: 270, h: 12, hachura: true, cor: "suave" },
              { t: "rotulo", p: [25, 72], texto: "palhada no lugar" },
              { t: "linha", de: [150, 78], ate: [150, 130], cor: "destaque" },
              { t: "circulo", c: [150, 120], r: 5, cor: "destaque" },
              { t: "rotulo", p: [158, 118], texto: "semente no risco" },
              { t: "seta", de: [150, 55], ate: [150, 76], cor: "destaque" },
              { t: "rotulo", p: [120, 48], texto: "disco de corte" },
              { t: "rotulo", p: [25, 178], texto: "solo nunca revolvido, nunca nu" },
            ],
          },
        },
        {
          tipo: "fontes",
          titulo: "Fontes — plantio direto e cobertura permanente",
          itens: [
            { titulo: "FEBRAPDP — Federação Brasileira do Sistema Plantio Direto", url: "https://plantiodireto.org.br/", tipo: "site", nota: "Entidade nacional do plantio direto na palha; material técnico e eventos." },
            { titulo: "FAO — Conservation Agriculture (princípios e cobertura permanente)", url: "https://www.fao.org/conservation-agriculture/en/", tipo: "site", nota: "Base conceitual do sistema de cobertura permanente." },
          ],
        },
      ],
    },
    {
      id: "video-manejo",
      titulo: "Vídeo: manejo das plantas de cobertura",
      blocos: [
        { tipo: "texto", texto: "Veja na prática como se manejam as plantas de cobertura dentro do sistema plantio direto — escolha de espécies, consórcio e terminação — neste vídeo da Federação Brasileira do Sistema Plantio Direto." },
        { tipo: "video", titulo: "Manejo das plantas de cobertura no sistema plantio direto (FEBRAPDP)", youtube: "c3Pex9Mtuvg" },
        {
          tipo: "licao",
          pergunta: "No sistema plantio direto, qual é o papel das plantas de cobertura em relação à água?",
          alternativas: [
            "Secar o solo antes do plantio",
            "Produzir a palhada que cobre o solo, reduz a evaporação e aumenta a infiltração da chuva",
            "Substituir a irrigação por completo em qualquer clima",
          ],
          correta: 1,
          explicacao: "As plantas de cobertura geram a palha que mantém o solo coberto o ano todo; essa palha corta a evaporação, protege contra o selamento e melhora a infiltração — não eliminam a irrigação, mas fazem cada gota render mais.",
        },
      ],
    },
    // ===================== PROJETO =====================
    {
      id: "escolher-cobertura",
      titulo: "Escolher a cobertura para o seu caso",
      blocos: [
        { tipo: "texto", texto: "Não existe cobertura única: existe a certa para o seu objetivo, solo e clima. Use uma árvore de decisão simples. Objetivo é só segurar água já, numa horta pequena? Cobertura morta (palha), aplicada agora. Tem janela de tempo e quer construir solo? Planta de cobertura, semeada e terminada depois. É pomar ou fruteira perene? Cobertura permanente na linha, reposta. É cultivo de alto valor em fileira (morango, melão)? Filme plástico pode compensar." },
        { tipo: "texto", texto: "Cruze com o material disponível e o custo: palha de graça do vizinho vence maravalha comprada; semente de milheto é barata e cobre muito. Anote a decisão e o porquê — isso vira o seu protocolo, que você ajusta a cada ciclo com o que mediu. Decisão registrada é decisão que melhora." },
        { tipo: "diagrama", titulo: "Arvore de decisao da cobertura", codigo: `flowchart TD
  Q1["Preciso segurar agua JA?"] -->|"sim"| MM["Cobertura morta (palha agora)"]
  Q1 -->|"tenho tempo"| Q2["Quero construir solo?"]
  Q2 -->|"sim"| PV["Planta de cobertura"]
  Q3["E perene / pomar?"] -->|"sim"| PERM["Cobertura permanente na linha"]
  Q4["Cultivo de alto valor em fileira?"] -->|"sim"| PL["Filme plastico"]` },
        {
          tipo: "tarefas",
          itens: [
            { id: "esc-1", titulo: "Rodar a árvore de decisão para o seu canteiro", entrega: "Decisão registrada: tipo de cobertura escolhido, material, quantidade e o porquê." },
          ],
        },
      ],
    },
    {
      id: "projeto-canteiro",
      titulo: "Projeto de um canteiro coberto",
      blocos: [
        { tipo: "texto", texto: "Vamos projetar um canteiro-modelo de 1,0 m de largura por 5,0 m (5 m²) para hortaliça de folha. Camada: 5–8 cm de palha, deixando uma pequena coroa livre de 2–3 cm em volta do caule de cada muda (palha encostada no caule retém umidade demais e favorece podridão). Irrigação por gotejamento por baixo da palha é o par perfeito: a água vai direto à raiz e a palha segura a evaporação." },
        { tipo: "texto", texto: "Quantidades do modelo: ~2 a 3 kg de palha seca para o canteiro (faixa de 0,4–0,6 kg/m²), uma fita de gotejo por linha de plantio, e mudas no espaçamento da cultura. Reserve 10–15% de palha extra para repor onde ela se decompuser primeiro. Esse projeto é o tijolo: repita-o e você tem uma horta inteira coberta, com consumo de água muito menor." },
        {
          tipo: "prancha",
          titulo: "Canteiro coberto 1 x 5 m com gotejo sob a palha",
          desenho: {
            legenda: "Palha de 5-8 cm, coroa livre no caule, fita de gotejo por baixo. Agua na raiz, palha contra a evaporacao.",
            primitivas: [
              { t: "retangulo", p: [30, 60], w: 240, h: 90, cor: "tinta" },
              { t: "retangulo", p: [30, 48], w: 240, h: 12, hachura: true, cor: "suave" },
              { t: "rotulo", p: [34, 42], texto: "palha 5-8 cm" },
              { t: "circulo", c: [80, 60], r: 7, cor: "destaque" },
              { t: "circulo", c: [150, 60], r: 7, cor: "destaque" },
              { t: "circulo", c: [220, 60], r: 7, cor: "destaque" },
              { t: "rotulo", p: [70, 32], texto: "mudas (coroa livre)" },
              { t: "linha", de: [30, 95], ate: [270, 95], cor: "destaque" },
              { t: "rotulo", p: [95, 108], texto: "fita de gotejo sob a palha" },
              { t: "rotulo", p: [34, 170], texto: "1,0 m x 5,0 m = 5 m2" },
            ],
          },
        },
        {
          tipo: "licao",
          pergunta: "Por que deixar uma coroa livre de palha em volta do caule da muda?",
          alternativas: [
            "Para economizar palha",
            "Porque palha encostada no caule retém umidade demais ali e favorece podridão do colo",
            "Para a planta receber mais sol no caule",
          ],
          correta: 1,
          explicacao: "A cobertura é ótima sobre o solo, mas grudada no caule cria um microclima úmido demais no colo da planta, convidando fungos. Uma folga de 2–3 cm evita a podridão.",
        },
      ],
    },
    {
      id: "sourcing-materiais",
      titulo: "De onde vem a palha",
      blocos: [
        { tipo: "texto", texto: "A cobertura morta vive de material orgânico seco, e quase sempre ele está perto e de graça. Fontes comuns: capim seco e feno de roçada, palha de cereais (arroz, trigo, milho), folhas secas de varrição, maravalha e serragem de serraria (sem verniz/tinta), casca de arroz, bagaço, restos de poda triturados, aparas de grama curada. Evite: material com semente de invasora madura, resto de planta doente, e madeira tratada." },
        { tipo: "texto", texto: "Monte uma rede de fornecedores locais: a serraria do bairro, o jardineiro que poda, a feira que descarta folhas, o sítio que fardou capim. Combine coleta regular — é resíduo para eles, recurso para você. Guarde a palha seca e ao abrigo da chuva para não apodrecer antes da hora. Esse é o lado circular da cobertura: o que seria lixo orgânico de um vira água guardada no solo de outro." },
        {
          tipo: "tarefas",
          itens: [
            { id: "src-1", titulo: "Fechar duas fontes regulares de material de cobertura", entrega: "Dois fornecedores locais confirmados (ex.: serraria, poda, feira) com material, volume e periodicidade." },
            { id: "src-2", titulo: "Montar um estoque seco de palha", entrega: "Local coberto com palha seca armazenada, suficiente para cobrir a área planejada mais 15% de reposição." },
          ],
        },
      ],
    },
    {
      id: "mobilizacao-agronomo",
      titulo: "Quando chamar o agrônomo",
      blocos: [
        { tipo: "texto", texto: "Para a horta de quintal, este caderno basta. Mas ao escalar — uma lavoura, um pomar comercial, uma área com erosão instalada ou com dúvida sobre dessecação química — a recomendação precisa de um profissional habilitado. A escolha de espécies de cobertura por região, a correção do solo, a prescrição de herbicida para dessecação e a Anotação de Responsabilidade Técnica (ART) são atos de engenharia agronômica." },
        {
          tipo: "mobilizacao",
          papel: "Engenheiro(a) agrônomo(a)",
          porque: "Recomendação de espécies de cobertura e rotação por região e época, interpretação do laudo de solo, plano de correção e, quando houver dessecação química, prescrição de produto registrado com receituário agronômico. Em área comercial, exige responsável técnico com ART.",
          entregaEsperada: "Plano de manejo de cobertura assinado: espécies/consórcios por janela, densidade de semeadura, método de terminação, correção do solo e, se aplicável, receituário agronômico da dessecação.",
          gerenciadoPor: "zaeon",
        },
        {
          tipo: "licao",
          pergunta: "Qual destas tarefas exige um profissional habilitado (agrônomo), e não deve ser decidida no olho?",
          alternativas: [
            "Espalhar palha seca sobre um canteiro de horta",
            "Prescrever herbicida para dessecação química e emitir o receituário agronômico",
            "Medir a cobertura com uma trena",
          ],
          correta: 1,
          explicacao: "Aplicar palha e medir cobertura são tarefas do dia a dia. Já prescrever defensivo e emitir receituário são atos regulados, de responsabilidade do engenheiro agrônomo.",
        },
      ],
    },
    // ===================== EXECUCAO =====================
    {
      id: "aplicar-mulch",
      titulo: "Aplicar a cobertura morta, passo a passo",
      blocos: [
        { tipo: "texto", texto: "Aplicar palha parece trivial, mas a ordem importa. 1) Prepare o canteiro e tire as invasoras existentes — a palha suprime novas, não mata as já crescidas. 2) Regue bem o solo antes de cobrir (a palha segura a umidade que estiver lá; cobrir solo seco guarda a secura). 3) Espalhe a camada de 5–8 cm uniforme, sem deixar o solo aparecer. 4) Abra a coroa livre em volta de cada planta. 5) Regue de leve por cima para assentar a palha." },
        { tipo: "texto", texto: "Em cultura já plantada, aplique a palha entre as linhas e ao redor das plantas, mantendo a folga no colo. Em área nova, cubra e depois faça o plantio abrindo buracos na palha. Se usar gotejo, instale a fita antes da palha. Em dia de vento, umedeça a palha para não voar. Simples, mas feito nessa ordem, rende o dobro." },
        { tipo: "diagrama", titulo: "Sequencia de aplicacao da palha", codigo: `flowchart TD
  P1["Capinar invasoras existentes"] --> P2["Regar bem o solo"]
  P2 --> P3["Espalhar 5-8 cm de palha"]
  P3 --> P4["Abrir coroa livre no caule"]
  P4 --> P5["Regar de leve para assentar"]` },
        {
          tipo: "tarefas",
          itens: [
            { id: "apl-1", titulo: "Cobrir o canteiro-modelo seguindo a sequência", entrega: "Canteiro coberto com camada uniforme de 5–8 cm, coroa livre e solo úmido por baixo (foto antes/depois)." },
            { id: "apl-2", titulo: "Medir a umidade coberto x nu no 3º dia sem chuva", entrega: "Duas leituras comparadas (gravimetria ou sensor) mostrando o solo coberto mais úmido." },
          ],
        },
      ],
    },
    {
      id: "semear-cobertura",
      titulo: "Semear a cobertura viva",
      blocos: [
        { tipo: "texto", texto: "Semear planta de cobertura é barato e tolerante a erro. A lanço (jogando a semente à mão) é o jeito mais simples: distribua uniforme, passe um rastelo leve ou uma fina camada de terra/palha para o contato com o solo e regue. Densidades típicas por metro quadrado variam por espécie — milheto e aveia pedem mais sementes; crotalária e feijão-de-porco, menos, por serem maiores. Siga a recomendação da semente/da Embrapa para a espécie." },
        { tipo: "texto", texto: "O segredo é o CONTATO semente-solo e a umidade na germinação. Semeie antes de um período com chuva prevista, ou regue nos primeiros dias. Em consórcio, misture as sementes na proporção recomendada e semeie junto. Deixe a cobertura fechar o solo (cobrir quase 100%) antes de pensar em terminar — é a biomassa acumulada que vira a sua palha protetora." },
        {
          tipo: "prancha",
          titulo: "Semeadura a lanco da cobertura viva",
          desenho: {
            legenda: "Distribuir a semente uniforme, cobrir levemente para contato com o solo e manter umido ate germinar.",
            primitivas: [
              { t: "retangulo", p: [30, 95], w: 240, h: 65, cor: "tinta" },
              { t: "circulo", c: [70, 85], r: 3, cor: "destaque" },
              { t: "circulo", c: [110, 80], r: 3, cor: "destaque" },
              { t: "circulo", c: [150, 86], r: 3, cor: "destaque" },
              { t: "circulo", c: [195, 82], r: 3, cor: "destaque" },
              { t: "circulo", c: [235, 86], r: 3, cor: "destaque" },
              { t: "seta", de: [100, 45], ate: [120, 75], cor: "suave" },
              { t: "rotulo", p: [80, 38], texto: "semeia a lanco" },
              { t: "rotulo", p: [35, 125], texto: "rastelo leve = contato semente-solo" },
              { t: "rotulo", p: [35, 180], texto: "manter umido ate germinar" },
            ],
          },
        },
        {
          tipo: "tarefas",
          itens: [
            { id: "sem-1", titulo: "Semear a cobertura escolhida numa janela vazia", entrega: "Área semeada a lanço, levemente coberta e irrigada; registro da espécie/consórcio e densidade usada." },
          ],
        },
      ],
    },
    {
      id: "erros-comuns",
      titulo: "Os erros que fazem a cobertura falhar",
      blocos: [
        { tipo: "texto", texto: "A cobertura é simples, mas alguns erros anulam o ganho de água. CAMADA FINA: palha rala deixa o sol e o vento chegarem ao solo — evapora quase como solo nu. PALHA NO CAULE: encostada no colo, apodrece a planta. COBRIR SOLO SECO: a palha mantém a umidade que houver; cobrir seco guarda seca. SEMENTE PEQUENA SOB PALHA GROSSA: cenoura, alface semeadas direto não vencem camada grossa — semeie e cubra só depois de emergir, ou transplante mudas." },
        { tipo: "texto", texto: "Mais armadilhas: MUITA PALHA DE C/N ALTO no plantio sem complementar nitrogênio (planta amarela por imobilização); PALHA COM SEMENTE DE INVASORA (vira infestação); e esquecer de REPOR a palha que se decompõe. Conhecer os erros é meio caminho: quase todos se evitam com ordem e observação. Anote o que deu errado — cada falha vira regra do seu protocolo." },
        {
          tipo: "licao",
          pergunta: "Você cobriu o solo seco com uma bela camada de palha e a planta continua murchando. O que aconteceu?",
          alternativas: [
            "A palha evaporou a água da planta",
            "A cobertura preserva a umidade que já existe; cobrindo solo seco, guardou-se a secura — era preciso regar bem antes de cobrir",
            "Palha sempre prejudica a planta",
          ],
          correta: 1,
          explicacao: "A cobertura reduz a perda, não cria água. Se o solo estava seco na hora de cobrir, a palha apenas mantém esse estado seco. Regue até a capacidade de campo e só então cubra.",
        },
      ],
    },
    {
      id: "video-conservacao",
      titulo: "Vídeo: conservação do solo na prática",
      blocos: [
        { tipo: "texto", texto: "A cobertura é a peça central dos programas públicos de conservação de solo. Veja como um programa estadual (PROSOLO, Paraná) organiza práticas de cobertura e manejo para proteger o solo e a água." },
        { tipo: "video", titulo: "PROSOLO — Programa de Conservação do Solo do Paraná (FEBRAPDP)", youtube: "LYwJEjwykFE" },
        { tipo: "texto", texto: "Repare como o discurso do programa junta cobertura permanente, revolvimento mínimo e trabalho em microbacia — a mesma lógica da Agricultura de Conservação da FAO, levada à escala da paisagem. O que você faz no canteiro é a versão miniatura do que uma bacia inteira faz para segurar a água da chuva." },
      ],
    },
    // ===================== MANUTENCAO =====================
    {
      id: "manutencao",
      titulo: "Manter a cobertura viva ao longo do tempo",
      blocos: [
        { tipo: "texto", texto: "A cobertura morta não é eterna: ela se decompõe (é essa a graça — vira matéria orgânica) e precisa de REPOSIÇÃO. Inspecione a cada poucas semanas e onde o solo começar a aparecer, acrescente palha para manter a camada. Em clima quente e úmido, a decomposição é rápida; em clima seco, dura mais. A regra visual é constante: o solo não deve aparecer." },
        { tipo: "texto", texto: "Fique de olho nas PRAGAS QUE GOSTAM DE PALHA: lesmas e caracóis se abrigam na cobertura úmida e atacam mudas tenras — controle com armadilhas e manejo. Roedores também podem se abrigar. Nada disso tira o valor da cobertura, mas exige observação. E cuidado com excesso em época muito chuvosa: solo encharcado sob palha grossa pode faltar ar à raiz — nesses picos, afrouxe a camada." },
        {
          tipo: "prancha",
          titulo: "Ciclo de manutencao da cobertura",
          desenho: {
            legenda: "A palha se decompoe e vira materia organica; repor onde o solo aparecer mantem a protecao continua.",
            primitivas: [
              { t: "circulo", c: [150, 95], r: 60, cor: "tinta" },
              { t: "seta", de: [150, 35], ate: [205, 70], cor: "destaque" },
              { t: "seta", de: [210, 95], ate: [185, 150], cor: "destaque" },
              { t: "seta", de: [150, 155], ate: [95, 120], cor: "destaque" },
              { t: "seta", de: [90, 95], ate: [115, 45], cor: "destaque" },
              { t: "rotulo", p: [120, 25], texto: "aplicar palha" },
              { t: "rotulo", p: [205, 75], texto: "decompoe" },
              { t: "rotulo", p: [150, 165], texto: "vira materia organica" },
              { t: "rotulo", p: [30, 100], texto: "repor onde falta" },
            ],
          },
        },
        {
          tipo: "tarefas",
          itens: [
            { id: "man-1", titulo: "Rotina quinzenal de inspeção e reposição", entrega: "Registro das inspeções com data, % de cobertura estimada e palha reposta quando necessário." },
            { id: "man-2", titulo: "Monitorar pragas de abrigo (lesmas/caracóis)", entrega: "Observação registrada; armadilha instalada se houver ataque a mudas." },
          ],
        },
      ],
    },
    {
      id: "monitorar-resultados",
      titulo: "Monitorar o resultado: a cobertura está valendo?",
      blocos: [
        { tipo: "texto", texto: "Para saber se a cobertura paga, acompanhe três indicadores ao longo dos ciclos. ÁGUA: intervalo entre regas (deve aumentar) e umidade coberto x nu (deve ficar maior sob cobertura). INFILTRAÇÃO: teste do anel/garrafa — meça o tempo que um volume de água leva para infiltrar no coberto versus no nu (o coberto costuma infiltrar mais rápido e selar menos). SOLO: matéria orgânica subindo nos laudos anuais, mais minhocas, agregados mais estáveis." },
        { tipo: "texto", texto: "Feche com o indicador que importa para você: produtividade e resiliência ao veranico (dias sem chuva sem a planta murchar). Anote tudo num caderno de campo — literal. Comparar o ano coberto com o ano nu, com números seus, é o que transforma a prática em convicção e permite ajustar: mais palha aqui, outra espécie ali. Medir é o que separa jardinagem de agronomia." },
        { tipo: "diagrama", titulo: "Painel de monitoramento da cobertura", codigo: `flowchart LR
  AG["Agua: intervalo entre regas"] --> OK["A cobertura vale?"]
  UM["Umidade coberto x nu"] --> OK
  IN["Infiltracao (teste do anel)"] --> OK
  MO["Materia organica anual"] --> OK
  PR["Produtividade e resiliencia ao veranico"] --> OK` },
        {
          tipo: "licao",
          pergunta: "Qual teste simples mostra que a cobertura melhorou a entrada de água no solo?",
          alternativas: [
            "Pesar a palha seca",
            "Medir o tempo de infiltração de um volume de água no solo coberto versus no solo nu",
            "Contar as folhas da planta",
          ],
          correta: 1,
          explicacao: "O teste de infiltração (anel ou garrafa) cronometra quanto a água leva para entrar. No solo coberto, sem crosta, ela entra mais rápido — prova direta de melhor infiltração.",
        },
      ],
    },
    // ===================== CASOS REAIS =====================
    {
      id: "casos-brasil",
      titulo: "Caso real: plantio direto no Brasil",
      blocos: [
        { tipo: "texto", texto: "O maior experimento de cobertura do mundo aconteceu no Brasil. A partir dos anos 1970 no Sul e nos anos 1980–1990 no Cerrado, o plantio direto na palha substituiu a aração que deixava o solo nu e erodindo. Com cobertura permanente e rotação, milhões de hectares passaram a reter melhor a água da chuva, reduzir drasticamente a erosão e atravessar veranicos. Hoje o país é referência mundial no sistema, organizado por entidades como a FEBRAPDP." },
        { tipo: "texto", texto: "A lição que escala para o quintal: o segredo não foi uma tecnologia cara, mas um princípio — não revolver e não descobrir o solo. A palhada sobre o solo e as raízes das plantas de cobertura fizeram o trabalho de segurar água que o arado desfazia. O mesmo vale no seu canteiro: cobrir sempre, mexer pouco, rodar as espécies." },
        { tipo: "video", titulo: "Adaptação a chuvas extremas e seca (A-Frame Farm, SARE)", youtube: "CXsBVHGSyw0" },
        {
          tipo: "fontes",
          titulo: "Fontes do caso",
          itens: [
            { titulo: "FEBRAPDP — Federação Brasileira do Sistema Plantio Direto", url: "https://plantiodireto.org.br/", tipo: "site", nota: "História e dados do plantio direto na palha no Brasil." },
            { titulo: "SARE — Cover Crops (recursos sobre plantas de cobertura, EUA)", url: "https://www.sare.org/resources/cover-crops/", tipo: "site", nota: "Casos e manuais de cobertura e resiliência a seca/chuva extrema." },
          ],
        },
      ],
    },
    {
      id: "casos-seca",
      titulo: "Caso real: cobertura contra a seca",
      blocos: [
        { tipo: "texto", texto: "Agricultores em regiões de clima extremo têm usado cobertura e plantas de cobertura como seguro contra a seca e contra a chuva torrencial. A ideia é a mesma dos dois lados: o solo coberto guarda a pouca água nos períodos secos e absorve a enxurrada nos períodos de chuva forte, em vez de deixá-la escorrer. A série de casos da SARE (EUA) documenta fazendas que adaptaram o manejo a essas duas pontas do clima." },
        { tipo: "video", titulo: "Adaptação a enchente e seca (Hurricane Flats Farm, SARE)", youtube: "c8soKBkaYzs" },
        { tipo: "texto", texto: "O fio comum desses casos: quem mantém o solo coberto sofre menos nos extremos. A cobertura não faz chover, mas muda o destino de cada gota — mais fica no solo, menos escorre ou evapora. Para o pequeno produtor e o horteleiro, é a tecnologia de resiliência de menor custo que existe." },
        {
          tipo: "fontes",
          itens: [
            { titulo: "SARE — Sustainable Agriculture Research & Education (cobertura e resiliência)", url: "https://www.sare.org/resources/cover-crops/", tipo: "site", nota: "Casos de fazendas adaptando-se a seca e chuva extrema com cobertura." },
            { titulo: "FAO AQUASTAT — água e agricultura", url: "https://www.fao.org/aquastat/en/", tipo: "dataset", nota: "Contexto de escassez hídrica e uso agrícola da água." },
          ],
        },
      ],
    },
    // ===================== RECURSOS + SINTESE =====================
    {
      id: "recursos",
      titulo: "Recursos para continuar",
      blocos: [
        { tipo: "texto", texto: "Reúna o essencial num só lugar. Estes recursos cobrem fundamentos (água no solo), sistema (plantio direto e Agricultura de Conservação), dados abertos (solo e clima) e casos reais. São o kit para aprofundar e para defender cada escolha do seu projeto com fonte." },
        {
          tipo: "fontes",
          titulo: "Biblioteca do caderno",
          itens: [
            { titulo: "FAO IDP 56 — Crop evapotranspiration (Allen et al., 1998)", url: "https://www.fao.org/4/x0490e/x0490e00.htm", tipo: "livro", nota: "A referência de ET, CC, PMP, água disponível e evaporação do solo (Ke)." },
            { titulo: "FAO — Conservation Agriculture", url: "https://www.fao.org/conservation-agriculture/en/", tipo: "site", nota: "Os três princípios e a cobertura permanente (>= 30%)." },
            { titulo: "FEBRAPDP — Sistema Plantio Direto", url: "https://plantiodireto.org.br/", tipo: "site", nota: "Entidade e material técnico do plantio direto na palha." },
            { titulo: "Embrapa Solos", url: "https://www.embrapa.br/solos", tipo: "site", nota: "Pesquisa brasileira em solos e conservação." },
            { titulo: "Embrapa Hortaliças", url: "https://www.embrapa.br/hortalicas", tipo: "site", nota: "Cobertura e manejo de água em hortaliças." },
            { titulo: "SoilGrids (ISRIC) — mapa global de solo", url: "https://soilgrids.org/", tipo: "dataset", nota: "Propriedades do solo do seu local, grátis." },
            { titulo: "INMET — dados climáticos do Brasil", url: "https://portal.inmet.gov.br/", tipo: "dataset", nota: "Clima para estimar a demanda evaporativa." },
            { titulo: "SARE — Cover Crops", url: "https://www.sare.org/resources/cover-crops/", tipo: "site", nota: "Manuais e casos de plantas de cobertura." },
          ],
        },
      ],
    },
    {
      id: "compilado",
      titulo: "Prancha de síntese",
      blocos: [
        { tipo: "texto", texto: "Síntese do caderno. A água foge do solo nu por evaporação (sol e vento puxam) e por escoamento (a gota sela a superfície e a chuva corre). A cobertura do solo corta as duas perdas: faz sombra e barreira ao vapor, amortece a gota e aumenta a infiltração — preservando a transpiração, que é a parte útil. As ferramentas são palha (cobertura morta), plantas de cobertura (cobertura viva) e plantio direto, com a regra FAO de manter pelo menos 30% do solo sempre coberto. Dimensione pela espessura (5–8 cm) e pela massa (~0,4–0,6 kg seco/m²), cuide da relação C/N para não imobilizar nitrogênio, deixe coroa livre no caule, cubra solo já úmido, reponha a palha e monitore com números seus (umidade coberto x nu, infiltração, intervalo entre regas). Meça com gravimetria, tensiômetro, sensor capacitivo e microlisímetro caseiro; conheça seu solo por laudo de laboratório e por SoilGrids; e chame o agrônomo quando escalar ou quando houver dessecação química. Tudo neste caderno tem lastro em FAO, Embrapa, FEBRAPDP, ISRIC e casos reais de plantio direto e de adaptação à seca — nada de folheto, tudo medível no seu terreno." },
        { tipo: "compilado" },
      ],
    },
  ],
};
