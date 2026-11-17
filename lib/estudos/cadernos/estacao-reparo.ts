import type { CadernoEstudo } from "../cadernosEstudo";

/**
 * Caderno de campo: "Projeto de uma oficina comunitária de reparo".
 * Design de serviço + economia circular. Do Repair Café de Amsterdã (2009) à bancada
 * de solda do bairro: por que reparar, como ler a comunidade, montar as estações,
 * medir o impacto e manter o grupo vivo. Todo dado, número, norma e desenho tem
 * lastro em fonte real — ver as páginas "fontes" ao longo do caderno.
 */
export const caderno: CadernoEstudo = {
  id: "estacao-reparo",
  titulo: "Projeto de uma oficina comunitária de reparo",
  resumo:
    "Como desenhar, montar e manter uma oficina comunitária de reparo (estilo Repair Café): do diagnóstico do bairro à bancada de solda, com segurança, medição de impacto, casos reais e fontes verificadas.",
  paginas: [
    // ============================== CONTEXTO ==============================
    {
      id: "abertura",
      titulo: "O que é uma oficina comunitária de reparo",
      blocos: [
        { tipo: "texto", texto: "Uma oficina comunitária de reparo é um ponto de encontro gratuito onde pessoas levam objetos quebrados de casa — um ventilador, um casaco rasgado, uma torradeira, uma bicicleta — e consertam JUNTO com voluntários que têm a mão. Não é uma assistência técnica: o dono do objeto participa do conserto e aprende. O modelo mais conhecido é o Repair Café, criado em Amsterdã em 2009, hoje presente em mais de 2.500 locais no mundo." },
        { tipo: "texto", texto: "A ideia resolve três problemas de uma vez: reduz lixo (o objeto não vira resíduo), mantém viva a habilidade de consertar (que estava se perdendo) e fortalece o laço do bairro (as pessoas se encontram e se ajudam). É economia circular na prática — manter o produto em uso o maior tempo possível, em vez de descartar e comprar outro." },
        { tipo: "diagrama", titulo: "Economia linear x oficina de reparo", codigo: `flowchart TD
  subgraph Linear["Modelo linear (descartar)"]
    A["Comprar"] --> B["Usar"]
    B --> C["Quebrou"]
    C --> D["Lixo + comprar outro"]
  end
  subgraph Circular["Oficina de reparo (circular)"]
    E["Usar"] --> F["Quebrou"]
    F --> G["Diagnostico na oficina"]
    G --> H["Conserto com o dono"]
    H --> E
  end` },
      ],
    },
    {
      id: "porque",
      titulo: "Por que reparar: a montanha de lixo eletrônico",
      blocos: [
        { tipo: "texto", texto: "O mundo gerou cerca de 62 milhões de toneladas de lixo eletrônico em 2022, e apenas 22,3% desse peso foi formalmente coletado e reciclado (Global E-waste Monitor 2024, da ONU/ITU/UNITAR). O resto virou aterro, queima ou garagem entulhada. Cada objeto reparado é lixo que não acontece — e metal, plástico e energia que não precisam ser extraídos de novo para fabricar um substituto." },
        { tipo: "texto", texto: "No Brasil, a Política Nacional de Resíduos Sólidos (Lei 12.305/2010) estabeleceu a hierarquia que toda oficina de reparo encarna: primeiro NÃO gerar resíduo, depois reduzir, REUTILIZAR, reciclar, tratar e só por último dispor no aterro. Reparar está no topo dessa pirâmide — antes mesmo de reciclar." },
        { tipo: "video", titulo: "Descarte de lixo eletrônico ainda é um desafio no Brasil (SBT News)", youtube: "jPAz-m9CGWc" },
        {
          tipo: "prancha",
          titulo: "A hierarquia dos resíduos (Lei 12.305/2010)",
          desenho: {
            legenda: "A pirâmide invertida: o topo largo é o que mais importa. Reparar = não gerar + reutilizar.",
            primitivas: [
              { t: "linha", de: [30, 35], ate: [275, 35], cor: "tinta" },
              { t: "linha", de: [30, 35], ate: [150, 170], cor: "tinta" },
              { t: "linha", de: [275, 35], ate: [150, 170], cor: "tinta" },
              { t: "linha", de: [55, 62], ate: [250, 62], cor: "suave" },
              { t: "linha", de: [80, 95], ate: [220, 95], cor: "suave" },
              { t: "linha", de: [105, 128], ate: [195, 128], cor: "suave" },
              { t: "rotulo", p: [95, 52], texto: "NAO gerar + REUTILIZAR (reparar)" },
              { t: "rotulo", p: [120, 82], texto: "Reduzir" },
              { t: "rotulo", p: [118, 115], texto: "Reciclar" },
              { t: "rotulo", p: [110, 150], texto: "Aterro (ultimo)" },
              { t: "seta", de: [285, 45], ate: [285, 160], cor: "destaque" },
              { t: "rotulo", p: [230, 165], texto: "menos prioridade" },
            ],
          },
        },
        {
          tipo: "fontes",
          titulo: "Fontes desta etapa",
          itens: [
            { titulo: "The Global E-waste Monitor 2024 (ONU / ITU / UNITAR)", url: "https://ewastemonitor.info/the-global-e-waste-monitor-2024/", tipo: "dataset", nota: "62 Mt de lixo eletrônico em 2022; só 22,3% coletado e reciclado." },
            { titulo: "Lei nº 12.305/2010 — Política Nacional de Resíduos Sólidos (Planalto)", url: "https://www.planalto.gov.br/ccivil_03/_ato2007-2010/2010/lei/l12305.htm", tipo: "norma", nota: "Art. 9º: hierarquia não geração, redução, reutilização, reciclagem, tratamento, disposição." },
          ],
        },
      ],
    },
    {
      id: "historia",
      titulo: "A origem: o Repair Café de Amsterdã (2009)",
      blocos: [
        { tipo: "texto", texto: "A jornalista holandesa Martine Postma, incomodada com quanta coisa consertável as pessoas jogavam fora, organizou o primeiro Repair Café em Amsterdã em outubro de 2009. Deu tão certo que ela criou a Repair Café Foundation (por volta de 2010) para ajudar grupos a abrir os seus, com um kit de partida. O que começou num teatro do bairro virou uma rede mundial." },
        { tipo: "texto", texto: "A fórmula é simples e replicável: um espaço emprestado, algumas mesas, ferramentas, café, voluntários que sabem consertar e um dia marcado. Não abre todo dia — é um evento periódico (um sábado por mês, por exemplo). A entrada é gratuita; aceitam-se doações para cobrir custos. Entender essa fórmula é o ponto de partida para desenhar a sua." },
        { tipo: "video", titulo: "O que é um Repair Café? (What is a Repair Cafe?)", youtube: "vMOncmeHzwk" },
        {
          tipo: "fontes",
          itens: [
            { titulo: "Repair Café — About (site oficial da fundação)", url: "https://www.repaircafe.org/en/about/", tipo: "site", nota: "Definição, papel dos voluntários e a rede com mais de 2.500 locais." },
            { titulo: "Repair Café — página inicial e kit para começar um", url: "https://www.repaircafe.org/en/", tipo: "site" },
          ],
        },
      ],
    },
    {
      id: "manifesto",
      titulo: "A cultura do reparo: o manifesto",
      blocos: [
        { tipo: "texto", texto: "Por trás da oficina há uma ideia: 'se você não consegue consertar, você não é dono de verdade'. O Self-Repair Manifesto, lançado pela iFixit em 2010, defende que consertar é um direito e uma forma de autonomia — e que o medo de abrir e mexer é exagerado. A iFixit resume: habilidade de reparo é como músculo, cresce com a prática. Uma oficina comunitária é a academia desse músculo coletivo." },
        { tipo: "texto", texto: "Esse espírito muda o papel do voluntário: ele não conserta PARA a pessoa, ele conserta COM a pessoa, explicando cada passo. O objetivo não é só devolver o objeto funcionando — é a pessoa sair sabendo um pouco mais e olhando o próprio armário de tralhas com outros olhos." },
        {
          tipo: "licao",
          pergunta: "Qual é o papel do voluntário numa oficina de reparo comunitária?",
          alternativas: [
            "Consertar sozinho e entregar pronto, como uma assistência técnica",
            "Consertar junto com o dono, ensinando enquanto repara",
            "Vender peças novas para o visitante",
          ],
          correta: 1,
          explicacao: "O reparo é feito COM o dono: transferir habilidade é tão importante quanto consertar o objeto. É o que diferencia a oficina de uma assistência paga.",
        },
        {
          tipo: "fontes",
          itens: [
            { titulo: "iFixit — Self-Repair Manifesto / Promise to Repair (pledge)", url: "https://www.ifixit.com/pledge", tipo: "site", nota: "Manifesto de 2010 sob licença CC BY-NC-SA; pôster para pendurar na oficina." },
          ],
        },
      ],
    },
    {
      id: "obsolescencia",
      titulo: "Obsolescência programada e o direito ao reparo",
      blocos: [
        { tipo: "texto", texto: "Reparar nem sempre é fácil de propósito. 'Obsolescência programada' é o encurtamento deliberado da vida útil de um produto — bateria colada, peça que não se vende avulsa, parafuso proprietário, software que trava o modelo antigo. Contra isso cresce o movimento do 'direito ao reparo': leis que obrigam fabricantes a fornecer peças, ferramentas e manuais por um tempo mínimo." },
        { tipo: "texto", texto: "Na Europa, a Diretiva (UE) 2024/1799 — a diretiva do direito ao reparo — passou a vigorar em 2026 e obriga fabricantes de várias categorias a reparar seus produtos. No Brasil, o PL 805/2024 (Senado) quer alterar o Código de Defesa do Consumidor para vedar a obsolescência programada, garantir ao consumidor escolher onde consertar e exigir peças/manuais por pelo menos 5 anos. O CDC (Lei 8.078/1990) já ampara o consumidor subsidiariamente hoje." },
        { tipo: "video", titulo: "Comprar, jogar fora, comprar — a história secreta da obsolescência programada (legendado)", youtube: "ZSuWRTBmMaU" },
        {
          tipo: "fontes",
          titulo: "Fontes sobre direito ao reparo",
          itens: [
            { titulo: "PL 805/2024 — obsolescência programada e direito ao reparo (Senado)", url: "https://www25.senado.leg.br/web/atividade/materias/-/materia/162652", tipo: "norma", nota: "Altera o CDC; exige peças/ferramentas/manuais por 5 anos; multas por descumprimento." },
            { titulo: "Senado — projeto permite escolher onde consertar produto na garantia", url: "https://www12.senado.leg.br/noticias/materias/2024/05/03/projeto-permite-que-consumidor-escolha-onde-consertar-produto-na-garantia", tipo: "artigo" },
            { titulo: "Diretiva (UE) 2024/1799 — direito à reparação (EUR-Lex)", url: "https://eur-lex.europa.eu/eli/dir/2024/1799/oj", tipo: "norma", nota: "Marco europeu que obriga fabricantes a reparar várias categorias de produtos." },
            { titulo: "Lei nº 8.078/1990 — Código de Defesa do Consumidor (Planalto)", url: "https://www.planalto.gov.br/ccivil_03/leis/l8078compilado.htm", tipo: "norma" },
          ],
        },
      ],
    },
    // ======================= LEITURA DO LOCAL / TEMA =======================
    {
      id: "mapear-comunidade",
      titulo: "Ler a comunidade: o que quebra por aqui",
      blocos: [
        { tipo: "texto", texto: "Antes de montar qualquer bancada, leia o seu território. Uma oficina de reparo não é genérica: ela serve a pessoas específicas, com objetos específicos. Num bairro de prédios, dominam eletroportáteis e eletrônicos; numa área rural, ferramentas e motores; perto de uma facultade, bicicletas e notebooks. O design de serviço começa por entender quem usa e o que precisa." },
        { tipo: "diagrama", titulo: "Mapa de escuta do bairro", codigo: `flowchart TD
  C["Quem e a comunidade?"] --> O["Que objetos mais quebram?"]
  C --> S["Que saberes existem (quem conserta)?"]
  C --> E["Que espacos cedem sala?"]
  O --> P["Prioridade das estacoes"]
  S --> P
  E --> P
  P --> D["Desenho da oficina"]` },
        {
          tipo: "tarefas",
          itens: [
            { id: "escuta", titulo: "Faça uma escuta de bairro", entrega: "Converse com 8 vizinhos e anote: qual foi o último objeto que jogaram fora por estar quebrado e por que não consertaram. Agrupe as respostas por tipo de objeto." },
            { id: "top5", titulo: "Monte o top 5 do bairro", entrega: "A partir da escuta, liste os 5 tipos de objeto que mais aparecem. Esse ranking vai definir quais estações sua oficina precisa primeiro." },
          ],
        },
      ],
    },
    {
      id: "dados-reparo",
      titulo: "O que os dados abertos de reparo revelam",
      blocos: [
        { tipo: "texto", texto: "Você não precisa adivinhar: há dados abertos de centenas de milhares de reparos reais. A Open Repair Alliance publica, sob o Open Repair Data Standard (ORDS), uma base com mais de 300 mil itens levados a eventos de reparo pelo mundo — com categoria do produto, problema, se foi consertado e barreiras encontradas (falta de peça, falta de informação, etc.). É o mapa de onde o reparo trava." },
        { tipo: "texto", texto: "Esses dados mostram padrões úteis para o seu projeto: categorias campeãs (iluminação, pequenos eletros, áudio), e que a falta de peça de reposição é uma das maiores razões de um conserto falhar. Registrar os SEUS reparos no mesmo padrão deixa sua oficina comparável e ajuda a pressionar por leis de direito ao reparo." },
        {
          tipo: "fontes",
          titulo: "Dados abertos de reparo",
          itens: [
            { titulo: "Open Repair Alliance — datasets de reparo (GitHub openrepair/data)", url: "https://github.com/openrepair/data", tipo: "dataset", nota: "300 mil+ itens de eventos de reparo; atualizado a cada ~6 meses." },
            { titulo: "Open Repair Data Standard (ORDS) — especificação v0.3", url: "https://standard.openrepair.org/", tipo: "site", nota: "Padrão para registrar e comparar dados de reparo entre grupos." },
          ],
        },
      ],
    },
    {
      id: "espaco",
      titulo: "Ler o espaço: o que uma sala precisa ter",
      blocos: [
        { tipo: "texto", texto: "A oficina pede pouco, mas pede certo: tomadas suficientes e aterradas, luz boa sobre as bancadas, mesas firmes, circulação para cadeirantes, um ponto de água por perto (café e limpeza) e uma área de espera onde o visitante não fica em cima da ferramenta. Igrejas, bibliotecas, escolas, associações de moradores e CRAS costumam ceder salão em dia de folga." },
        {
          tipo: "prancha",
          titulo: "Planta baixa de uma oficina de 1 sala",
          desenho: {
            legenda: "Fluxo em U: entrada, recepção/triagem, estações encostadas nas paredes (perto das tomadas) e café ao centro.",
            primitivas: [
              { t: "retangulo", p: [20, 25], w: 265, h: 150, cor: "tinta" },
              { t: "rotulo", p: [25, 20], texto: "Sala cedida" },
              { t: "retangulo", p: [30, 35], w: 55, h: 24, hachura: true },
              { t: "rotulo", p: [34, 51], texto: "Recepcao" },
              { t: "seta", de: [25, 47], ate: [30, 47], cor: "destaque" },
              { t: "rotulo", p: [6, 44], texto: "entra" },
              { t: "retangulo", p: [30, 130], w: 55, h: 30 },
              { t: "rotulo", p: [34, 149], texto: "Eletrica" },
              { t: "retangulo", p: [120, 130], w: 55, h: 30 },
              { t: "rotulo", p: [126, 149], texto: "Costura" },
              { t: "retangulo", p: [210, 130], w: 60, h: 30 },
              { t: "rotulo", p: [216, 149], texto: "Eletronica" },
              { t: "retangulo", p: [210, 35], w: 60, h: 30 },
              { t: "rotulo", p: [222, 54], texto: "Madeira" },
              { t: "circulo", c: [150, 90], r: 22, cor: "suave" },
              { t: "rotulo", p: [133, 92], texto: "Cafe" },
              { t: "rotulo", p: [95, 40], texto: "T = tomada aterrada" },
              { t: "circulo", c: [35, 128], r: 3, cor: "destaque" },
              { t: "circulo", c: [125, 128], r: 3, cor: "destaque" },
              { t: "circulo", c: [215, 128], r: 3, cor: "destaque" },
              { t: "circulo", c: [215, 66], r: 3, cor: "destaque" },
            ],
          },
        },
        {
          tipo: "tarefas",
          itens: [
            { id: "planta", titulo: "Desenhe a planta do seu espaço", entrega: "Meça a sala candidata, marque as tomadas e a luz e desenhe onde ficaria cada estação. Confira se há caminho livre de pelo menos 90 cm entre as mesas." },
          ],
        },
      ],
    },
    {
      id: "voluntarios",
      titulo: "Quem repara: mapear saberes e vagas",
      blocos: [
        { tipo: "texto", texto: "A oficina é feita de gente. Você precisa de 'reparadores' (quem põe a mão), de recepção/triagem, de alguém no café e de um coordenador do dia. Nem todo reparador precisa ser técnico formado — muita costureira, marceneiro aposentado e entusiasta de eletrônica tem a mão. Mas estações de risco (elétrica/eletrônica) exigem gente qualificada, como veremos." },
        { tipo: "diagrama", titulo: "Os papéis de um dia de oficina", codigo: `flowchart TD
  COORD["Coordenador do dia"] --> REC["Recepcao e triagem"]
  COORD --> REP["Reparadores por estacao"]
  COORD --> CAFE["Cafe e acolhimento"]
  REC --> FICHA["Preenche a ficha do objeto"]
  REP --> ELE["Eletrica/eletronica (qualificado)"]
  REP --> COS["Costura"]
  REP --> MAD["Madeira/mecanica"]` },
        {
          tipo: "tarefas",
          itens: [
            { id: "roster", titulo: "Monte o quadro de voluntários", entrega: "Liste as pessoas que toparam ajudar e marque o que cada uma sabe consertar e quando pode. Aponte onde faltam mãos — essa é a sua lista de recrutamento." },
          ],
        },
      ],
    },
    // ============================== MÉTODO ==============================
    {
      id: "modelo",
      titulo: "O modelo Repair Café e as regras da casa",
      blocos: [
        { tipo: "texto", texto: "O formato testado em milhares de locais tem regras que protegem todo mundo. As principais 'regras da casa': o reparo é gratuito (doação é opcional); feito por conta e risco do dono, que assina um termo; o dono fica junto e participa; não se garante o conserto (é melhor-esforço); e peças de reposição, quando necessárias, são pagas pelo dono. Essas regras evitam que a oficina vire assistência técnica informal e se exponha juridicamente." },
        { tipo: "video", titulo: "Como montar um Repair Café (How to Set up a Repair Cafe — CAG Oxfordshire)", youtube: "hAIfemHBJKM" },
        { tipo: "diagrama", titulo: "A jornada do visitante", codigo: `flowchart TD
  A["Chega com o objeto"] --> B["Recepcao: ficha + termo de risco"]
  B --> C["Fila da estacao certa"]
  C --> D["Diagnostico junto ao reparador"]
  D --> E{Da pra consertar hoje?}
  E -->|Sim| F["Conserta com o dono"]
  E -->|Peca faltando| G["Orienta onde achar a peca"]
  E -->|Nao| H["Explica e encaminha a um profissional"]
  F --> I["Registra o resultado"]
  G --> I
  H --> I` },
      ],
    },
    {
      id: "governanca",
      titulo: "Como se organiza o coletivo",
      blocos: [
        { tipo: "texto", texto: "Uma oficina pode ser um grupo informal de vizinhos, um projeto de uma associação, de uma biblioteca ou de uma igreja. Para durar, convém ter: um coletivo que decide junto (quem faz o quê, quando acontece), um caixa transparente das doações e despesas, e um ponto de contato (um e-mail, um WhatsApp) para o público. Formalizar como associação só é necessário quando há dinheiro, contrato de cessão de espaço ou editais a captar." },
        {
          tipo: "licao",
          pergunta: "Quando faz sentido formalizar a oficina como associação (CNPJ)?",
          alternativas: [
            "Sempre, antes do primeiro evento",
            "Quando há caixa, contratos ou editais a captar que exigem pessoa jurídica",
            "Nunca, é proibido ter CNPJ",
          ],
          correta: 1,
          explicacao: "Grupos pequenos rodam informais; a formalização entra quando há movimentação de recursos, cessão formal de espaço ou captação que pede CNPJ.",
        },
        {
          tipo: "mobilizacao",
          papel: "Contador(a) ou advogado(a) do terceiro setor",
          porque: "Decidir entre coletivo informal e associação, redigir estatuto, cuidar da cessão do espaço e do enquadramento de doações exige responsabilidade técnica — um passo em falso trava editais e cria risco jurídico.",
          entregaEsperada: "Parecer sobre o formato jurídico ideal, modelo de termo de cessão do espaço e, se for o caso, estatuto e CNPJ ativos.",
          gerenciadoPor: "zaeon",
        },
      ],
    },
    {
      id: "estacoes",
      titulo: "As estações de reparo",
      blocos: [
        { tipo: "texto", texto: "A oficina se organiza em estações, cada uma com seu kit e seu reparador. As quatro clássicas: ELÉTRICA/ELETRÔNICA (eletroportáteis, cabos, placas), COSTURA (roupas, bolsas, estofados), MADEIRA/MECÂNICA (móveis, brinquedos, ferramentas) e BICICLETAS. Comece pelas que o seu 'top 5 do bairro' pediu e para as quais você tem reparador — não adianta montar bancada sem quem a opere." },
        {
          tipo: "prancha",
          titulo: "As quatro estações e seus objetos",
          desenho: {
            legenda: "Cada quadrante é uma estação; abaixo, o tipo de objeto que ela recebe.",
            primitivas: [
              { t: "linha", de: [150, 20], ate: [150, 175], cor: "tinta" },
              { t: "linha", de: [20, 97], ate: [285, 97], cor: "tinta" },
              { t: "rotulo", p: [35, 40], texto: "ELETRICA/ELETRONICA" },
              { t: "rotulo", p: [40, 60], texto: "ventilador, radio, cabo" },
              { t: "rotulo", p: [185, 40], texto: "COSTURA" },
              { t: "rotulo", p: [170, 60], texto: "roupa, bolsa, ziper" },
              { t: "rotulo", p: [35, 120], texto: "MADEIRA/MECANICA" },
              { t: "rotulo", p: [40, 140], texto: "movel, brinquedo" },
              { t: "rotulo", p: [185, 120], texto: "BICICLETAS" },
              { t: "rotulo", p: [185, 140], texto: "freio, camara, corrente" },
            ],
          },
        },
        {
          tipo: "licao",
          pergunta: "Qual é o critério para decidir quais estações abrir primeiro?",
          alternativas: [
            "Abrir todas de uma vez, sempre",
            "As que o bairro mais pediu E para as quais há reparador disponível",
            "A que tem a ferramenta mais cara",
          ],
          correta: 1,
          explicacao: "Demanda (top 5 do bairro) cruzada com oferta (reparador que sabe operar). Bancada sem reparador fica parada.",
        },
      ],
    },
    {
      id: "seguranca-geral",
      titulo: "Segurança: a regra de ouro",
      blocos: [
        { tipo: "texto", texto: "Reparo mal feito machuca. A regra de ouro antes de abrir qualquer aparelho elétrico: TIRE DA TOMADA e confirme que está desenergizado. Capacitores (de micro-ondas, fontes, ventiladores) guardam carga perigosa mesmo desligados — podem dar choque fatal; precisam ser descarregados por quem sabe. A iFixit lembra: use óculos ao soldar (o estanho 'estala'), e cuidado com baterias de lítio, que não podem ser perfuradas nem dobradas." },
        { tipo: "texto", texto: "No Brasil, serviços em eletricidade são regidos pela NR-10 (Norma Regulamentadora nº 10). Ela exige que quem trabalha em instalações elétricas seja qualificado, capacitado ou habilitado conforme o risco. Para uma oficina comunitária isso significa: tarefas de baixo risco (trocar um plugue, testar continuidade com o aparelho desligado) podem ser ensinadas; já mexer em rede elétrica da sala, em micro-ondas ou em alta tensão exige profissional." },
        {
          tipo: "prancha",
          titulo: "Checklist de segurança da bancada",
          desenho: {
            legenda: "Pendure na parede. Nenhum aparelho é aberto antes de todos os itens estarem marcados.",
            primitivas: [
              { t: "retangulo", p: [25, 25], w: 255, h: 150, cor: "tinta" },
              { t: "rotulo", p: [95, 20], texto: "ANTES DE ABRIR" },
              { t: "retangulo", p: [38, 45], w: 12, h: 12 },
              { t: "rotulo", p: [58, 55], texto: "Tirar da tomada" },
              { t: "retangulo", p: [38, 70], w: 12, h: 12 },
              { t: "rotulo", p: [58, 80], texto: "Confirmar desenergizado" },
              { t: "retangulo", p: [38, 95], w: 12, h: 12 },
              { t: "rotulo", p: [58, 105], texto: "Descarregar capacitores (qualif.)" },
              { t: "retangulo", p: [38, 120], w: 12, h: 12 },
              { t: "rotulo", p: [58, 130], texto: "Oculos / sem anel / sem metal" },
              { t: "retangulo", p: [38, 145], w: 12, h: 12 },
              { t: "rotulo", p: [58, 155], texto: "Bateria de litio: nao furar/dobrar" },
            ],
          },
        },
        {
          tipo: "fontes",
          titulo: "Fontes de segurança",
          itens: [
            { titulo: "NR-10 — Segurança em Instalações e Serviços em Eletricidade (gov.br, PDF)", url: "https://www.gov.br/trabalho-e-emprego/pt-br/acesso-a-informacao/participacao-social/conselhos-e-orgaos-colegiados/comissao-tripartite-partitaria-permanente/arquivos/normas-regulamentadoras/nr-10.pdf", tipo: "norma", nota: "Define trabalhador qualificado, capacitado e habilitado; medidas de controle de risco elétrico." },
            { titulo: "iFixit — Project Safety (bateria, elétrica, solda)", url: "https://edu.ifixit.com/project-safety", tipo: "site", nota: "Descarregar capacitores, óculos ao soldar, cuidados com lítio." },
          ],
        },
      ],
    },
    {
      id: "ferramentas",
      titulo: "A caixa de ferramentas essencial",
      blocos: [
        { tipo: "texto", texto: "Uma oficina não começa cara. O kit básico, por estação, resolve 80% dos casos: chaves (fenda, Phillips, as de precisão para eletrônicos, e um jogo de bits de segurança para parafusos proprietários), alicates (bico, corte, universal), multímetro, ferro de solda com estanho e sugador, cola quente, fita isolante, lubrificante, kit de costura e agulhas, e lixa. Peça doações: muita gente tem ferramenta parada em casa." },
        {
          tipo: "prancha",
          titulo: "Kit básico de uma estação eletrônica",
          desenho: {
            legenda: "O mínimo para diagnosticar e consertar eletroportáteis com segurança.",
            primitivas: [
              { t: "retangulo", p: [25, 40], w: 255, h: 110, cor: "tinta" },
              { t: "rotulo", p: [95, 32], texto: "ESTACAO ELETRONICA" },
              { t: "retangulo", p: [40, 60], w: 40, h: 16, hachura: true },
              { t: "rotulo", p: [42, 88], texto: "Chaves precisao" },
              { t: "circulo", c: [130, 68], r: 15 },
              { t: "rotulo", p: [108, 95], texto: "Multimetro" },
              { t: "linha", de: [180, 55], ate: [210, 80], cor: "tinta" },
              { t: "rotulo", p: [175, 95], texto: "Ferro de solda" },
              { t: "retangulo", p: [235, 58], w: 28, h: 20 },
              { t: "rotulo", p: [228, 95], texto: "Alicates" },
              { t: "rotulo", p: [40, 125], texto: "Estanho + sugador + fita + lubrificante" },
            ],
          },
        },
        {
          tipo: "tarefas",
          itens: [
            { id: "kit", titulo: "Faça a lista de doação de ferramentas", entrega: "Para a primeira estação do seu top 5, liste o kit mínimo e marque o que você já tem e o que falta. Transforme o que falta num pedido curto de doação para divulgar." },
          ],
        },
      ],
    },
    {
      id: "triagem",
      titulo: "Triagem: receber o objeto e decidir",
      blocos: [
        { tipo: "texto", texto: "A recepção é o coração do serviço. Ali o visitante preenche a ficha (nome, objeto, defeito relatado) e assina o termo de responsabilidade. A triagem decide a estação certa e já filtra o impossível: aparelho recall perigoso, item grande demais, ou algo que claramente exige profissional. Uma boa triagem evita fila errada e frustração — é design de serviço puro." },
        { tipo: "diagrama", titulo: "Decisão da triagem", codigo: `flowchart TD
  A["Objeto na recepcao"] --> B["Ficha + termo de risco"]
  B --> C{Classe do objeto}
  C -->|Eletrico| D["Estacao eletrica"]
  C -->|Tecido| E["Estacao costura"]
  C -->|Madeira/metal| F["Estacao madeira"]
  C -->|Risco alto / grande| G["Encaminhar a profissional"]
  D --> H["Fila por ordem de chegada"]
  E --> H
  F --> H` },
        {
          tipo: "tarefas",
          itens: [
            { id: "ficha", titulo: "Crie a ficha do objeto", entrega: "Desenhe uma ficha de 1 página com: dados do dono, objeto, defeito relatado, estação, resultado (consertado / parcial / não) e a barreira (falta de peça, falta de info). Ela vira seu registro de dados." },
          ],
        },
      ],
    },
    {
      id: "diagnostico",
      titulo: "Método de diagnóstico: do sintoma à causa",
      blocos: [
        { tipo: "texto", texto: "Consertar bem é investigar, não chutar. O método: 1) reproduza o sintoma (liga? faz barulho? esquenta?); 2) do mais simples ao mais complexo (primeiro o cabo e o fusível, depois a placa); 3) teste, não suponha (use o multímetro); 4) uma mudança por vez; 5) saiba a hora de parar. Ensinar esse raciocínio ao dono é o maior presente da oficina — vale mais que o conserto." },
        { tipo: "video", titulo: "Como soldar componentes com ferro de solda (para iniciantes)", youtube: "la0DTgGYcwI" },
        {
          tipo: "licao",
          pergunta: "Qual é a ordem correta ao diagnosticar um aparelho que não liga?",
          alternativas: [
            "Trocar a placa primeiro, que é o mais provável",
            "Do mais simples ao mais complexo: tomada, cabo e fusível antes da placa",
            "Abrir tudo de uma vez e trocar várias peças juntas",
          ],
          correta: 1,
          explicacao: "Comece pelo barato e provável (cabo, plugue, fusível) e só então avance. Uma mudança por vez permite saber o que resolveu.",
        },
      ],
    },
    // ========================= CÁLCULO / MEDIÇÃO =========================
    {
      id: "multimetro",
      titulo: "O multímetro: a ferramenta de medir",
      blocos: [
        { tipo: "texto", texto: "O multímetro é o estetoscópio do reparador. Ele mede tensão (volts), resistência (ohms) e testa continuidade (se a corrente passa). Com ele você descobre, sem adivinhar, se um cabo está rompido, um fusível queimado ou uma resistência aberta. Todo reparador de eletro precisa saber usá-lo — e é fácil de aprender." },
        { tipo: "video", titulo: "Multímetro: teste de continuidade (Tutorial #17 — JPEdu TV)", youtube: "F09f_KTXYms" },
        {
          tipo: "prancha",
          titulo: "O mostrador do multímetro",
          desenho: {
            legenda: "As escalas que o reparador mais usa: continuidade (som), tensão (V) e resistência (ohm).",
            primitivas: [
              { t: "retangulo", p: [60, 30], w: 180, h: 140, cor: "tinta" },
              { t: "retangulo", p: [80, 42], w: 140, h: 34, hachura: true },
              { t: "rotulo", p: [120, 63], texto: "0 0 0 . 0" },
              { t: "circulo", c: [150, 115], r: 38, cor: "tinta" },
              { t: "linha", de: [150, 115], ate: [150, 82], cor: "destaque" },
              { t: "rotulo", p: [120, 160], texto: "seletor de escala" },
              { t: "rotulo", p: [95, 95], texto: "V" },
              { t: "rotulo", p: [195, 95], texto: "ohm" },
              { t: "rotulo", p: [138, 150], texto: "som)) continuidade" },
              { t: "circulo", c: [95, 182], r: 4, cor: "tinta" },
              { t: "circulo", c: [205, 182], r: 4, cor: "destaque" },
              { t: "rotulo", p: [78, 194], texto: "COM" },
              { t: "rotulo", p: [196, 194], texto: "V/ohm" },
            ],
          },
        },
      ],
    },
    {
      id: "continuidade",
      titulo: "Teste de continuidade e tensão na prática",
      blocos: [
        { tipo: "texto", texto: "Continuidade é o teste mais usado na oficina e DEVE ser feito com o aparelho desligado da tomada. Põe-se o seletor no símbolo de som; se as pontas tocam um caminho fechado, o multímetro apita. Assim você testa um cabo (ponta em cada extremidade: apitou = cabo bom), um fusível, um interruptor. Já a tensão é medida com o aparelho ligado — tarefa de maior risco, para mãos qualificadas." },
        { tipo: "video", titulo: "Como testar continuidade com multímetro — curso grátis, aula 01", youtube: "CWe3CsuwDFU" },
        {
          tipo: "licao",
          pergunta: "O teste de continuidade deve ser feito com o aparelho...",
          alternativas: [
            "ligado na tomada, para ter corrente",
            "desligado da tomada e desenergizado",
            "molhado, para conduzir melhor",
          ],
          correta: 1,
          explicacao: "Continuidade mede um caminho fechado sem energia externa; testar energizado é perigoso e dá leitura errada. Tensão, sim, mede-se energizado — e com cautela.",
        },
      ],
    },
    {
      id: "indicadores",
      titulo: "Medir o impacto: taxa de reparo e peso evitado",
      blocos: [
        { tipo: "texto", texto: "O que não se mede não se melhora — nem se mostra a parceiros e editais. Os indicadores básicos de uma oficina: TAXA DE REPARO (quantos objetos saíram funcionando / total), PESO desviado do lixo (some a massa estimada dos itens salvos) e a BARREIRA mais comum (falta de peça? falta de manual?). A rede internacional registra taxas de reparo tipicamente em torno de 55-65% dos itens levados." },
        {
          tipo: "prancha",
          titulo: "Painel de impacto de um evento",
          desenho: {
            legenda: "Três números que contam a história do dia. Barras ilustrativas de um evento fictício.",
            primitivas: [
              { t: "linha", de: [35, 30], ate: [35, 160], cor: "tinta" },
              { t: "linha", de: [35, 160], ate: [285, 160], cor: "tinta" },
              { t: "retangulo", p: [55, 70], w: 40, h: 90, hachura: true, cor: "destaque" },
              { t: "rotulo", p: [48, 60], texto: "60% reparado" },
              { t: "retangulo", p: [130, 95], w: 40, h: 65, hachura: true },
              { t: "rotulo", p: [120, 85], texto: "28 itens" },
              { t: "retangulo", p: [205, 110], w: 40, h: 50, hachura: true },
              { t: "rotulo", p: [198, 100], texto: "41 kg salvos" },
              { t: "rotulo", p: [90, 175], texto: "cada barra = 1 indicador do evento" },
            ],
          },
        },
        {
          tipo: "fontes",
          titulo: "Referências de medição",
          itens: [
            { titulo: "Open Repair Alliance — datasets (base para taxa de reparo e barreiras)", url: "https://github.com/openrepair/data", tipo: "dataset", nota: "Permite comparar sua taxa de reparo com milhares de eventos." },
            { titulo: "EEA — dados sobre o índice de reparabilidade francês", url: "https://www.eea.europa.eu/en/circularity/thematic-metrics/business/data-on-products-evaluated-against-the-french-repairability-index", tipo: "dataset", nota: "Como um índice de reparabilidade pontua produtos de 0 a 10." },
          ],
        },
      ],
    },
    {
      id: "custos",
      titulo: "A conta da oficina: custos e doações",
      blocos: [
        { tipo: "texto", texto: "Uma oficina roda com pouco dinheiro, mas não com zero. Custos típicos: aluguel/cessão do espaço (idealmente doado), consumíveis (estanho, cola, agulhas, café), reposição de ferramentas, divulgação e um seguro simples, se houver. A receita vem de doações do dia, apoio da instituição-sede, editais de cultura/meio ambiente e parcerias. Transparência no caixa é o que mantém a confiança do grupo." },
        { tipo: "diagrama", titulo: "Fluxo de caixa de um evento", codigo: `flowchart TD
  R["Receitas"] --> R1["Doacoes do dia"]
  R --> R2["Apoio da sede / edital"]
  D["Despesas"] --> D1["Consumiveis (estanho, cola, cafe)"]
  D --> D2["Reposicao de ferramentas"]
  D --> D3["Divulgacao"]
  R1 --> S["Saldo do evento"]
  R2 --> S
  D1 --> S
  D2 --> S
  D3 --> S` },
        {
          tipo: "tarefas",
          itens: [
            { id: "orcamento", titulo: "Monte o orçamento do 1º evento", entrega: "Estime despesas (consumíveis, divulgação) e receitas (doação média por visitante x nº esperado). Veja se fecha; se faltar, aponte qual apoio buscar." },
          ],
        },
      ],
    },
    {
      id: "viabilidade",
      titulo: "A oficina fecha a conta?",
      blocos: [
        { tipo: "texto", texto: "Viabilidade aqui não é lucro — é sustentar-se. Uma oficina é viável quando: tem espaço garantido, tem reparadores suficientes para a demanda, cobre os consumíveis e não depende de uma única pessoa (que um dia cansa). Medir antes de prometer evita a frustração de um projeto que brilha num evento e morre no segundo. O segredo quase nunca é dinheiro — é organização e rodízio de gente." },
        {
          tipo: "tarefas",
          itens: [
            { id: "teste-viab", titulo: "Teste de viabilidade", entrega: "Responda com sim/não: espaço garantido por 6 meses? ao menos 2 reparadores por estação? consumíveis cobertos? mais de 1 coordenador? Para cada 'não', escreva a ação que resolve." },
            { id: "cenario-fraco", titulo: "Simule um mês fraco", entrega: "Imagine metade dos voluntários faltando. Quais estações você mantém abertas e o que comunica ao público? Registre o plano B." },
          ],
        },
      ],
    },
    // ============================== PROJETO ==============================
    {
      id: "estacao-eletrica",
      titulo: "Projeto da estação elétrica/eletrônica",
      blocos: [
        { tipo: "texto", texto: "É a estação de maior demanda e maior risco. Ela recebe ventiladores, torradeiras, rádios, carregadores, luminárias. O projeto: bancada firme perto de tomadas aterradas, régua com disjuntor/DR, boa iluminação, multímetro, ferro de solda, kit de chaves e um aviso visível com a regra de ouro (tirar da tomada, descarregar capacitor). Casos campeões: cabo/plugue rompido, fusível, mau contato, capacitor de partida estufado (como em ventiladores)." },
        { tipo: "video", titulo: "Ventilador não funciona: como trocar o capacitor queimado", youtube: "dZ4_pWwsB_g" },
        {
          tipo: "mobilizacao",
          papel: "Eletricista habilitado / capacitado conforme a NR-10",
          porque: "Descarga de capacitores, medição em aparelhos energizados, reparo de micro-ondas e qualquer intervenção na rede elétrica da sala envolvem risco de choque e exigem profissional qualificado pela NR-10. Voluntário entusiasta não substitui habilitação.",
          entregaEsperada: "Profissional presente na estação elétrica nos dias de evento (ou de plantão), responsável pelas tarefas de risco e pela validação da régua/DR da bancada.",
          gerenciadoPor: "zaeon",
        },
        {
          tipo: "prancha",
          titulo: "Bancada elétrica segura",
          desenho: {
            legenda: "Régua com DR, aterramento, luz dirigida e o cartaz da regra de ouro sempre à vista.",
            primitivas: [
              { t: "retangulo", p: [30, 95], w: 240, h: 20, cor: "tinta" },
              { t: "rotulo", p: [110, 109], texto: "bancada firme" },
              { t: "retangulo", p: [40, 60], w: 55, h: 30, hachura: true },
              { t: "rotulo", p: [42, 55], texto: "cartaz regra de ouro" },
              { t: "retangulo", p: [210, 70], w: 45, h: 22 },
              { t: "rotulo", p: [205, 66], texto: "regua + DR" },
              { t: "seta", de: [232, 92], ate: [232, 115], cor: "destaque" },
              { t: "circulo", c: [150, 55], r: 10, cor: "destaque" },
              { t: "rotulo", p: [135, 44], texto: "luz dirigida" },
              { t: "linha", de: [232, 150], ate: [232, 165], cor: "tinta" },
              { t: "rotulo", p: [215, 178], texto: "aterramento" },
              { t: "linha", de: [220, 165], ate: [245, 165], cor: "tinta" },
            ],
          },
        },
      ],
    },
    {
      id: "estacao-costura",
      titulo: "Projeto da estação de costura",
      blocos: [
        { tipo: "texto", texto: "A costura é a estação mais acolhedora e de baixíssimo risco — ótima porta de entrada para novos voluntários. Ela conserta bainhas, zíperes, botões, bolsas e estofados, e abre espaço para o 'visible mending': remendos bordados que viram enfeite em vez de esconder o rasgo (técnica sashiko). Kit: máquina de costura (se houver), agulhas, linhas variadas, alfinetes, tesoura boa, fita métrica, retalhos e botões doados." },
        { tipo: "video", titulo: "Visible mending: reparo em jeans com bordado sashiko", youtube: "LwqBuhoyugo" },
        {
          tipo: "tarefas",
          itens: [
            { id: "kit-costura", titulo: "Monte o kit de costura", entrega: "Liste o kit mínimo da estação e organize uma 'caixa de botões e retalhos' com doações. Treine um remendo visível num tecido velho e cole uma foto do antes/depois." },
          ],
        },
      ],
    },
    {
      id: "solda",
      titulo: "A bancada de solda",
      blocos: [
        { tipo: "texto", texto: "Soldar é reconectar o que se rompeu numa placa ou num fio. O ferro aquece a junta (a perna do componente E a ilha da placa) e só então encosta-se o estanho, que escorre e forma uma gota lisa e brilhante. Junta opaca e fosca é 'solda fria' — vai falhar. Regras de segurança: óculos (o estanho estala), ventilação (fumos), ferro sempre no suporte e cuidado com a ponta a 350°C." },
        { tipo: "video", titulo: "Curso de soldagem eletrônica: soldar em 3 passos (Eletrônica Fácil)", youtube: "LweU1XTxFUk" },
        {
          tipo: "prancha",
          titulo: "Solda boa x solda fria",
          desenho: {
            legenda: "À esquerda, a gota lisa e cônica que abraça a ilha; à direita, a bola fosca que não gruda.",
            primitivas: [
              { t: "linha", de: [150, 25], ate: [150, 170], cor: "tinta" },
              { t: "rotulo", p: [45, 35], texto: "SOLDA BOA" },
              { t: "rotulo", p: [185, 35], texto: "SOLDA FRIA" },
              { t: "linha", de: [40, 130], ate: [120, 130], cor: "tinta" },
              { t: "linha", de: [80, 130], ate: [80, 70], cor: "tinta" },
              { t: "curva", pts: [[62, 130], [80, 108], [98, 130]], cor: "destaque" },
              { t: "rotulo", p: [48, 150], texto: "cone liso e brilhante" },
              { t: "linha", de: [180, 130], ate: [260, 130], cor: "tinta" },
              { t: "linha", de: [220, 130], ate: [220, 70], cor: "tinta" },
              { t: "circulo", c: [220, 112], r: 15, hachura: true },
              { t: "rotulo", p: [185, 150], texto: "bola fosca, nao gruda" },
            ],
          },
        },
        {
          tipo: "licao",
          pergunta: "Como se reconhece uma boa solda?",
          alternativas: [
            "Uma bola grande, fosca e redonda sobre a ilha",
            "Um cone liso e brilhante que abraça a ilha e o componente",
            "Muito estanho cobrindo tudo",
          ],
          correta: 1,
          explicacao: "Aqueça a junta e deixe o estanho escorrer: forma-se um cone liso e brilhante. Opaco e em bola é solda fria, que falha com o tempo.",
        },
      ],
    },
    {
      id: "sinalizacao",
      titulo: "Fichas, termo de responsabilidade e sinalização",
      blocos: [
        { tipo: "texto", texto: "O que protege a oficina juridicamente é o papel certo no lugar certo. O TERMO DE RESPONSABILIDADE, assinado na recepção, deixa claro que o reparo é voluntário, gratuito, por conta e risco do dono, sem garantia. A sinalização orienta o fluxo (onde é cada estação, onde esperar) e lembra as regras de segurança. Fichas padronizadas viram, no fim do dia, os seus dados de impacto." },
        {
          tipo: "diagrama", titulo: "Os papéis de um evento", codigo: `flowchart TD
  T["Termo de responsabilidade"] --> A["Protege a oficina e informa o dono"]
  F["Ficha do objeto"] --> B["Registra defeito e resultado"]
  S["Placas de sinalizacao"] --> C["Orientam fluxo e seguranca"]
  B --> D["Viram dados de impacto no padrao ORDS"]` },
        {
          tipo: "tarefas",
          itens: [
            { id: "termo", titulo: "Redija o termo de responsabilidade", entrega: "Escreva um termo curto (meia página) cobrindo: voluntário, gratuito, por conta e risco do dono, sem garantia, peças por conta do dono. Peça a um profissional para revisar antes de usar." },
          ],
        },
      ],
    },
    {
      id: "agenda-local",
      titulo: "Escolher data, local e parceria",
      blocos: [
        { tipo: "texto", texto: "Agora junta-se tudo num evento. Escolha um dia (fins de semana funcionam melhor), um local com a infraestrutura lida na página do espaço, e um parceiro-sede que empreste a sala e ajude a divulgar (biblioteca, escola, associação, igreja, CRAS). Divulgue com antecedência e peça para as pessoas trazerem UM objeto por vez, para a fila fluir. Comece pequeno: um evento piloto com 2-3 estações ensina mais que mil reuniões." },
        {
          tipo: "licao",
          pergunta: "Qual é a melhor forma de começar uma oficina de reparo?",
          alternativas: [
            "Esperar ter sede própria, CNPJ e todas as estações",
            "Fazer um evento piloto pequeno, com poucas estações, e aprender fazendo",
            "Montar sozinho, sem parceiros nem voluntários",
          ],
          correta: 1,
          explicacao: "O modelo Repair Café é replicável justamente por começar simples: espaço emprestado, poucas estações, um dia marcado. O piloto revela o que ajustar.",
        },
        {
          tipo: "tarefas",
          itens: [
            { id: "piloto", titulo: "Planeje o evento piloto", entrega: "Defina data, local, parceiro-sede, as 2-3 estações de estreia e como vai divulgar. Liste quem fica em cada papel. Esse é o plano do seu primeiro dia." },
          ],
        },
      ],
    },
    // ============================== EXECUÇÃO ==============================
    {
      id: "dia-do-evento",
      titulo: "O dia do evento: do setup ao fechamento",
      blocos: [
        { tipo: "texto", texto: "O dia tem um ritmo. Antes: montar bancadas, testar tomadas, pendurar sinalização e o cartaz da regra de ouro, abrir a recepção. Durante: triar, encaixar nas filas, consertar com os donos, manter o café. Perto do fim: avisar o horário de corte da recepção (para dar tempo de terminar), registrar cada ficha. Depois: guardar tudo, somar os indicadores e marcar a conversa de avaliação do grupo." },
        { tipo: "diagrama", titulo: "Linha do tempo do evento", codigo: `flowchart TD
  M["-1h: montagem e teste de tomadas"] --> A["Abertura: recepcao ligada"]
  A --> O["Operacao: triagem -> estacoes -> conserto"]
  O --> K["-1h do fim: corta nova recepcao"]
  K --> F["Fechamento: registro das fichas"]
  F --> B["Desmontagem + soma dos indicadores"]
  B --> V["Roda de avaliacao do grupo"]` },
      ],
    },
    {
      id: "acolhimento",
      titulo: "Acolher e ensinar: o reparo é com o dono",
      blocos: [
        { tipo: "texto", texto: "A experiência do visitante é o produto. Um bom acolhimento transforma uma pessoa frustrada com um aparelho morto em alguém que aprendeu algo e voltará. O voluntário explica o que está fazendo, deixa o dono segurar a ferramenta quando seguro, e celebra o conserto. Mesmo quando não dá para consertar, a pessoa sai com um diagnóstico honesto e um caminho — isso também é sucesso." },
        { tipo: "video", titulo: "Repair Café ensina a arte perdida de consertar objetos de casa", youtube: "IATpR6v40v4" },
        {
          tipo: "licao",
          pergunta: "Quando um objeto NÃO pode ser consertado no dia, o evento falhou?",
          alternativas: [
            "Sim, só conta se sair funcionando",
            "Não: um diagnóstico honesto e um encaminhamento também são entregas de valor",
            "Sim, e o dono deve pagar pela tentativa",
          ],
          correta: 1,
          explicacao: "A oficina entrega aprendizado e orientação, não só o conserto. Saber a causa e para onde ir já evita descarte por desinformação.",
        },
      ],
    },
    {
      id: "registro",
      titulo: "Registrar cada reparo (e virar dado)",
      blocos: [
        { tipo: "texto", texto: "Cada ficha preenchida é um tijolo de evidência. Registre: tipo de objeto, marca, defeito, resultado (consertado / parcial / não consertado) e a BARREIRA quando falhou (falta de peça, falta de manual, defeito complexo). Se você usar as categorias do Open Repair Data Standard, seus dados somam-se aos de milhares de grupos — virando argumento para políticas de direito ao reparo. Medir também é militância." },
        {
          tipo: "tarefas",
          itens: [
            { id: "planilha", titulo: "Monte a planilha de registro", entrega: "Crie uma planilha com uma linha por objeto e colunas no espírito do ORDS (categoria, marca, problema, resultado, barreira). Preencha-a com 5 casos fictícios e calcule a taxa de reparo." },
          ],
        },
        {
          tipo: "fontes",
          itens: [
            { titulo: "Open Repair Data Standard (ORDS) — como registrar reparos", url: "https://standard.openrepair.org/", tipo: "site", nota: "Campos e categorias para o seu registro ficar comparável." },
          ],
        },
      ],
    },
    {
      id: "casos-dificeis",
      titulo: "Casos difíceis e quando parar",
      blocos: [
        { tipo: "texto", texto: "Nem tudo se conserta, e insistir pode ser perigoso ou caro demais. Pare e encaminhe quando: o reparo exige peça indisponível ou cara demais perto de um aparelho novo; há risco de segurança além da estação (gás, alta tensão, pressão); ou o tempo investido tiraria a vez de muitos outros. Encaminhar a um profissional ou a um serviço de reciclagem responsável é parte do serviço — não é desistir, é cuidar." },
        {
          tipo: "mobilizacao",
          papel: "Técnico(a)/assistência especializada e ponto de logística reversa",
          porque: "Aparelhos com peça proprietária, placas complexas ou risco (micro-ondas, aparelhos a gás) ultrapassam o escopo seguro da oficina. E o que não tem conserto precisa de descarte correto conforme a Política Nacional de Resíduos Sólidos, não do lixo comum.",
          entregaEsperada: "Lista de parceiros de encaminhamento (técnicos de confiança e pontos de coleta/logística reversa de eletroeletrônicos) para entregar ao visitante quando o conserto não for possível na oficina.",
          gerenciadoPor: "zaeon",
        },
      ],
    },
    // ============================== MANUTENÇÃO ==============================
    {
      id: "continuidade-grupo",
      titulo: "Manter o grupo vivo",
      blocos: [
        { tipo: "texto", texto: "A ameaça número um de uma oficina não é falta de dinheiro — é o grupo cansar. Antídotos: rodízio de funções (ninguém carrega tudo), formação contínua (um reparador ensina o outro entre eventos), celebrar os números e as histórias, e acolher novatos sem exigir que já saibam consertar. Uma oficina que forma gente nova a cada evento se renova; uma que depende de um herói, acaba." },
        { tipo: "diagrama", titulo: "O ciclo que mantém a oficina viva", codigo: `flowchart TD
  E["Evento"] --> R["Registro + avaliacao"]
  R --> F["Formacao entre eventos"]
  F --> N["Acolhe novos voluntarios"]
  N --> C["Rodizio de funcoes"]
  C --> E` },
        {
          tipo: "tarefas",
          itens: [
            { id: "formacao", titulo: "Planeje a formação do grupo", entrega: "Escolha 3 temas que todo novo voluntário deveria aprender no primeiro mês (regra de ouro de segurança, uso do multímetro, acolhimento) e quem ensinaria cada um." },
          ],
        },
      ],
    },
    {
      id: "rede",
      titulo: "Entrar na rede: não reinventar a roda",
      blocos: [
        { tipo: "texto", texto: "Você não está sozinho. Registrar sua oficina na rede Repair Café dá acesso a um kit de partida, materiais, seguro em alguns países e à troca com milhares de grupos. Conectar-se à Open Repair Alliance padroniza seus dados. E parcerias locais — universidades, Sebrae, secretarias de meio ambiente, fab labs — trazem espaço, formação e verba. Intercooperar multiplica o que um grupo pequeno consegue sozinho." },
        {
          tipo: "fontes",
          titulo: "Redes para se conectar",
          itens: [
            { titulo: "Repair Café — rede internacional e kit para começar", url: "https://www.repaircafe.org/en/", tipo: "site" },
            { titulo: "Open Repair Alliance — dados e comunidade de reparo", url: "https://github.com/openrepair/data", tipo: "site" },
          ],
        },
      ],
    },
    // ============================== CASOS REAIS ==============================
    {
      id: "caso-repaircafe",
      titulo: "Caso real: a rede global Repair Café",
      blocos: [
        { tipo: "texto", texto: "O que começou com uma jornalista e algumas mesas em Amsterdã (2009) virou mais de 2.500 locais em dezenas de países, do interior da Holanda a cidades dos EUA, da Europa e do Brasil. O segredo da escala não foi tecnologia cara: foi um método simples e documentado, aberto para qualquer comunidade copiar. É a prova de que uma oficina de bairro bem desenhada é replicável — e que já existe quem fez e documentou cada passo." },
        {
          tipo: "fontes",
          itens: [
            { titulo: "Repair Café — About (história, Martine Postma, a rede)", url: "https://www.repaircafe.org/en/about/", tipo: "site" },
            { titulo: "iFixit — Promise to Repair / manifesto do reparo", url: "https://www.ifixit.com/pledge", tipo: "site" },
          ],
        },
        {
          tipo: "licao",
          pergunta: "Por que o modelo Repair Café conseguiu se espalhar pelo mundo?",
          alternativas: [
            "Porque usa equipamentos caros e patenteados",
            "Porque é um método simples, documentado e aberto para qualquer comunidade replicar",
            "Porque é administrado por uma única empresa global",
          ],
          correta: 1,
          explicacao: "A escala veio da simplicidade e da documentação aberta: espaço emprestado, estações, voluntários, um dia marcado — qualquer bairro consegue montar.",
        },
      ],
    },
    {
      id: "caso-dados",
      titulo: "Caso real: dados de reparo viram política",
      blocos: [
        { tipo: "texto", texto: "Grupos de reparo perceberam que cada conserto frustrado por falta de peça ou manual era uma evidência. Reunindo esses registros sob o Open Repair Data Standard, a Open Repair Alliance construiu uma base de centenas de milhares de itens — e usou-a para mostrar a legisladores onde o reparo trava. Esse acúmulo de dados ajudou a sustentar leis de direito ao reparo, como a diretiva europeia de 2024. Sua ficha de bairro faz parte dessa engrenagem." },
        { tipo: "video", titulo: "Você merece o direito de consertar suas coisas — Gay Gordon-Byrne (TED)", youtube: "s6SFUepv3jg" },
        {
          tipo: "fontes",
          itens: [
            { titulo: "Open Repair Alliance — datasets de reparo (GitHub)", url: "https://github.com/openrepair/data", tipo: "dataset" },
            { titulo: "Diretiva (UE) 2024/1799 — direito à reparação (EUR-Lex)", url: "https://eur-lex.europa.eu/eli/dir/2024/1799/oj", tipo: "norma" },
            { titulo: "EEA — dados do índice de reparabilidade francês", url: "https://www.eea.europa.eu/en/circularity/thematic-metrics/business/data-on-products-evaluated-against-the-french-repairability-index", tipo: "dataset" },
          ],
        },
      ],
    },
    // ============================== RECURSOS ==============================
    {
      id: "recursos",
      titulo: "A biblioteca do reparo",
      blocos: [
        { tipo: "texto", texto: "Para seguir montando e estudando, vá sempre às fontes primárias. Guarde esta página: leis no Planalto e no Senado, segurança na NR-10, método e segurança de reparo na iFixit, o modelo na rede Repair Café e os dados na Open Repair Alliance. Tudo aqui foi verificado e existe de verdade — a regra do caderno é que nada se afirma sem lastro." },
        {
          tipo: "fontes",
          titulo: "Biblioteca da oficina de reparo",
          itens: [
            { titulo: "Repair Café — site oficial e kit para começar", url: "https://www.repaircafe.org/en/", tipo: "site" },
            { titulo: "iFixit — Project Safety (segurança no reparo)", url: "https://edu.ifixit.com/project-safety", tipo: "site" },
            { titulo: "iFixit — Self-Repair Manifesto / pledge", url: "https://www.ifixit.com/pledge", tipo: "site" },
            { titulo: "Open Repair Alliance — datasets (GitHub)", url: "https://github.com/openrepair/data", tipo: "dataset" },
            { titulo: "Open Repair Data Standard (ORDS)", url: "https://standard.openrepair.org/", tipo: "site" },
            { titulo: "The Global E-waste Monitor 2024 (ONU/ITU/UNITAR)", url: "https://ewastemonitor.info/the-global-e-waste-monitor-2024/", tipo: "dataset" },
            { titulo: "NR-10 — Segurança em instalações e serviços em eletricidade (gov.br)", url: "https://www.gov.br/trabalho-e-emprego/pt-br/acesso-a-informacao/participacao-social/conselhos-e-orgaos-colegiados/comissao-tripartite-partitaria-permanente/arquivos/normas-regulamentadoras/nr-10.pdf", tipo: "norma" },
            { titulo: "Lei nº 12.305/2010 — Política Nacional de Resíduos Sólidos (Planalto)", url: "https://www.planalto.gov.br/ccivil_03/_ato2007-2010/2010/lei/l12305.htm", tipo: "norma" },
            { titulo: "Lei nº 8.078/1990 — Código de Defesa do Consumidor (Planalto)", url: "https://www.planalto.gov.br/ccivil_03/leis/l8078compilado.htm", tipo: "norma" },
            { titulo: "PL 805/2024 — direito ao reparo e obsolescência (Senado)", url: "https://www25.senado.leg.br/web/atividade/materias/-/materia/162652", tipo: "norma" },
            { titulo: "Diretiva (UE) 2024/1799 — direito à reparação (EUR-Lex)", url: "https://eur-lex.europa.eu/eli/dir/2024/1799/oj", tipo: "norma" },
          ],
        },
      ],
    },
    {
      id: "plano",
      titulo: "Monte o seu projeto de oficina",
      blocos: [
        { tipo: "texto", texto: "Hora de juntar tudo. Pegue o seu bairro e passe por todo o caderno: por que a oficina faz sentido aqui, que estações o top 5 pediu, que espaço e parceiro-sede, quais voluntários, qual segurança, como vai medir o impacto e quando é o evento piloto. Um projeto honesto já mostra o que falta — e o primeiro evento ensina o resto." },
        {
          tipo: "tarefas",
          itens: [
            { id: "projeto-final", titulo: "Escreva o projeto em uma página", entrega: "Objetivo, estações de estreia, espaço e parceiro, voluntários por papel, plano de segurança, indicadores que vai medir e a data do piloto. Cole o resultado aqui." },
            { id: "checklist-seguranca", titulo: "Checklist de segurança assinado", entrega: "Liste as tarefas que exigem profissional (NR-10) e confirme quem as cobrirá. Sem esse nome definido, a estação elétrica não abre." },
          ],
        },
      ],
    },
    // ============================== SÍNTESE ==============================
    {
      id: "compilado",
      titulo: "Prancha de síntese",
      blocos: [
        { tipo: "texto", texto: "Arraste os cards pelo carimbo para reorganizar sua jornada — da montanha de lixo eletrônico ao evento piloto do seu bairro, do diagnóstico com multímetro à rede global. Abaixo da prancha, suas anotações, fichas e desenhos aparecem na ordem das páginas, prontos para virar o projeto da sua oficina comunitária de reparo." },
        { tipo: "compilado" },
      ],
    },
  ],
};
