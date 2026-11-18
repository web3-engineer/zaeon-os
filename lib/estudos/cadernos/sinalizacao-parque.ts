import type { CadernoEstudo } from "../cadernosEstudo";

/**
 * Caderno de campo: "Sinalização acessível para um parque público".
 * Design de acessibilidade + wayfinding. Todo número, técnica e norma tem lastro
 * em fonte real (ver páginas "fontes" ao longo do caderno): ABNT NBR 9050:2020,
 * ABNT NBR 16537:2024, LBI 13.146/2015, ADA 2010 (US Access Board §703/§216),
 * ISO 7001, WCAG 2.1 e casos reais (Orla do Guaíba/POA, Royal Parks, Bioparque).
 */
export const caderno: CadernoEstudo = {
  id: "sinalizacao-parque",
  titulo: "Sinalização acessível para um parque público",
  resumo:
    "Do diagnóstico ao parafuso: como projetar, calcular, fabricar e manter a sinalização de um parque para que cego, pessoa com baixa visão, cadeirante, idoso, criança e estrangeiro cheguem sozinhos onde querem — com normas (NBR 9050/16537, ADA, ISO, WCAG), pranchas, casos reais e fontes.",
  paginas: [
    // ===================== CONTEXTO =====================
    {
      id: "abertura",
      titulo: "O que é sinalização acessível (e o que é wayfinding)",
      blocos: [
        { tipo: "texto", texto: "Wayfinding é o sistema que ajuda uma pessoa a responder quatro perguntas em qualquer lugar: onde estou, para onde quero ir, qual é o caminho e quando cheguei. Num parque isso acontece sem paredes, corredores ou portas para guiar — só caminhos, vegetação e céu aberto. A sinalização é a parte visível desse sistema: placas, mapas, pisos e sons que carregam a informação." },
        { tipo: "texto", texto: "Sinalização ACESSÍVEL é a que funciona para quem não enxerga, para quem enxerga pouco, para quem usa cadeira de rodas, para o idoso, para a criança, para a pessoa autista e para o estrangeiro que não fala a língua — ao mesmo tempo. A regra de ouro é a redundância sensorial: a mesma informação chega pela visão, pelo tato e pela audição. Quem perde um canal recebe pelo outro." },
        { tipo: "diagrama", titulo: "As quatro perguntas do wayfinding", codigo: `flowchart TD
  U["Visitante chega ao parque"] --> Q1["Onde estou?"]
  Q1 --> Q2["Para onde quero ir?"]
  Q2 --> Q3["Qual e o caminho?"]
  Q3 --> Q4["Ja cheguei?"]
  Q1 -.responde.-> M["Mapa Voce esta aqui"]
  Q2 -.responde.-> D["Diretorio de destinos"]
  Q3 -.responde.-> S["Placas direcionais + piso tatil"]
  Q4 -.responde.-> I["Placa de identificacao do local"]` },
      ],
    },
    {
      id: "quem-usa",
      titulo: "Quem usa o parque: projetar para o corpo real",
      blocos: [
        { tipo: "texto", texto: "Acessibilidade não é 'uma rampa para cadeirante'. É um leque de corpos e sentidos. No Brasil, o Censo 2022 (IBGE) contou cerca de 18,6 milhões de pessoas com deficiência a partir dos 2 anos — e a deficiência visual é a mais frequente. Além dela, pense em quem envelhece (perda de contraste e de audição), em quem empurra um carrinho de bebê, em quem tem baixa visão e precisa chegar perto para ler, e em quem processa melhor um símbolo do que um texto." },
        { tipo: "diagrama", titulo: "Perfis e a informação de que cada um precisa", codigo: `flowchart LR
  P["Visitantes"] --> C["Pessoa cega"]
  P --> B["Baixa visao"]
  P --> R["Cadeira de rodas"]
  P --> I["Idoso"]
  P --> A["Autista / TEA"]
  P --> E["Estrangeiro"]
  C --> C1["Tato: braille, relevo, piso tatil, som"]
  B --> B1["Alto contraste, letra grande, chegar perto"]
  R --> R1["Altura de leitura sentado, sem degrau"]
  I --> I1["Contraste, letra legivel, menos ruido visual"]
  A --> A1["Pictograma claro, rota previsivel"]
  E --> E1["Pictograma universal, nao so texto"]` },
        {
          tipo: "licao",
          pergunta: "Por que 'uma placa bonita só com texto em letra fina' falha num parque público?",
          alternativas: [
            "Porque custa caro imprimir texto",
            "Porque exclui quem não enxerga, quem tem baixa visão e quem não lê aquela língua — a informação só chega por um canal",
            "Porque texto é proibido em parques",
          ],
          correta: 1,
          explicacao: "A informação precisa ser redundante: visão + tato + audição, e símbolo + palavra. Texto fino e sem contraste chega a poucos. É o princípio do desenho universal.",
        },
      ],
    },
    {
      id: "por-que-parque",
      titulo: "Por que o parque é um caso difícil",
      blocos: [
        { tipo: "texto", texto: "Um prédio guia pela arquitetura: paredes, portas e corredores já dizem para onde ir, e a placa fica no batente da porta, onde a mão procura. O parque não tem nada disso. As distâncias são grandes, a luz muda ao longo do dia (sol a pino some com o contraste; sombra escurece a placa), a chuva e o vandalismo atacam os materiais, e a vegetação cresce e esconde a sinalização. Projetar aqui é desenhar as próprias referências que o prédio daria de graça." },
        {
          tipo: "prancha",
          titulo: "O parque sem referências x com rede de sinalização",
          desenho: {
            legenda: "A esquerda: visitante perdido entre caminhos. A direita: pontos de decisao sinalizados formam uma rede legivel.",
            primitivas: [
              { t: "retangulo", p: [14, 24], w: 128, h: 150, cor: "suave" },
              { t: "rotulo", p: [26, 18], texto: "SEM sistema" },
              { t: "curva", pts: [[30, 60], [70, 90], [50, 130], [110, 150]], cor: "tinta" },
              { t: "curva", pts: [[30, 150], [60, 110], [100, 100], [120, 60]], cor: "tinta" },
              { t: "circulo", c: [72, 100], r: 9, cor: "destaque" },
              { t: "rotulo", p: [60, 118], texto: "? perdido" },
              { t: "retangulo", p: [160, 24], w: 128, h: 150 },
              { t: "rotulo", p: [172, 18], texto: "COM sistema" },
              { t: "linha", de: [176, 150], ate: [210, 110], cor: "tinta" },
              { t: "linha", de: [210, 110], ate: [250, 110], cor: "tinta" },
              { t: "linha", de: [250, 110], ate: [272, 70], cor: "tinta" },
              { t: "circulo", c: [210, 110], r: 5, cor: "destaque" },
              { t: "circulo", c: [250, 110], r: 5, cor: "destaque" },
              { t: "rotulo", p: [182, 164], texto: "pontos de decisao sinalizados" },
            ],
          },
        },
        { tipo: "texto", texto: "A boa notícia: por não herdar referências, o parque é também o lugar onde um sistema bem desenhado faz a maior diferença. Quem resolve o wayfinding do parque resolve a autonomia de milhares de visitas." },
      ],
    },
    {
      id: "principios",
      titulo: "Desenho universal e os sete princípios",
      blocos: [
        { tipo: "texto", texto: "Desenho universal (termo cunhado por Ronald Mace, arquiteto cadeirante, nos anos 1980) é projetar para o maior número de pessoas possível, sem precisar de adaptação depois. A base são sete princípios: uso equitativo, flexibilidade, uso simples e intuitivo, informação perceptível, tolerância ao erro, baixo esforço físico e espaço suficiente para aproximação e uso. A LBI (Lei 13.146/2015) adota esse conceito no Brasil." },
        { tipo: "texto", texto: "Para sinalização, o princípio que mais pesa é o da informação perceptível: 'comunicar a informação de modo eficaz, qualquer que seja a condição sensorial do usuário'. Na prática, isso vira a regra dos três canais — ver, tocar e ouvir — que estrutura todo este caderno." },
        { tipo: "diagrama", titulo: "Um dado, tres canais (redundancia sensorial)", codigo: `flowchart TD
  INFO["Informacao: BANHEIRO a 30 m a direita"] --> VER["VER: pictograma + seta + alto contraste"]
  INFO --> TOCAR["TOCAR: braille + relevo + piso direcional"]
  INFO --> OUVIR["OUVIR: beacon sonoro / QR audiodescricao"]` },
        {
          tipo: "licao",
          pergunta: "O que diz o princípio da 'informação perceptível' do desenho universal?",
          alternativas: [
            "A informação deve ser bonita",
            "A informação deve chegar de modo eficaz qualquer que seja a condição sensorial do usuário",
            "A informação deve estar em inglês",
          ],
          correta: 1,
          explicacao: "É a base da redundância sensorial: usar meios diferentes (pictórico, verbal, tátil) para que a mensagem não dependa de um único sentido.",
        },
      ],
    },
    // ===================== BASE NORMATIVA =====================
    {
      id: "normas-br",
      titulo: "O que a lei brasileira exige",
      blocos: [
        { tipo: "texto", texto: "No Brasil, três documentos mandam na sinalização de um parque público. A LBI (Lei Brasileira de Inclusão, 13.146/2015) torna a acessibilidade obrigatória em espaços públicos e inclui a 'comunicação acessível'. A ABNT NBR 9050:2020 é a norma técnica de acessibilidade a edificações, mobiliário, espaços e equipamentos urbanos — define sinalização visual, tátil e sonora. A ABNT NBR 16537:2024 trata especificamente da sinalização tátil no piso (o piso de alerta e o direcional)." },
        { tipo: "diagrama", titulo: "A pilha legal/normativa no Brasil", codigo: `flowchart TD
  LBI["LBI - Lei 13.146/2015 (o que e obrigatorio)"] --> N9050["ABNT NBR 9050:2020 (como fazer: sinalizacao visual/tatil/sonora)"]
  N9050 --> N16537["ABNT NBR 16537:2024 (piso tatil: alerta e direcional)"]
  N9050 --> SIA["Simbolo Internacional de Acesso (SIA)"]` },
        {
          tipo: "fontes",
          titulo: "Fontes — marco legal e normas brasileiras",
          itens: [
            { titulo: "Lei nº 13.146/2015 — Lei Brasileira de Inclusão (Planalto)", url: "https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2015/lei/l13146.htm", tipo: "norma", nota: "Art. 2º (desenho universal) e capítulo da acessibilidade e da comunicação." },
            { titulo: "ABNT NBR 16537:2024 — Sinalização tátil no piso (texto em PDF, Prefeitura de Macaé)", url: "https://www.macae.rj.gov.br/midia/uploads/NBR-16537-2024.pdf", tipo: "norma", nota: "Critérios de piso tátil de alerta e direcional, contraste e instalação." },
            { titulo: "ABNT NBR 9050:2015/2020 — Acessibilidade (nota da Prefeitura de Canoas)", url: "https://canoas.rs.gov.br/norma-abnt-nbr-9050-2015-emenda-1-2020", tipo: "site", nota: "Referência à vigência da NBR 9050 e sua Emenda 1 de 2020." },
          ],
        },
      ],
    },
    {
      id: "normas-int",
      titulo: "Referências internacionais: ADA, ISO e WCAG",
      blocos: [
        { tipo: "texto", texto: "Fora do Brasil, a referência mais detalhada em números é a ADA (Americans with Disabilities Act). As ADA 2010 Standards, seção 703, definem caracteres visuais e táteis, braille, contraste e altura de montagem; a seção 216 diz quais placas precisam ser táteis. A ISO 7001 padroniza os pictogramas de informação ao público (o bonequinho do banheiro, a seta, etc.). A ISO 21542 trata da acessibilidade do ambiente construído. E a WCAG 2.1, embora seja de conteúdo digital, dá os limiares de contraste que todo mundo usa também em placa." },
        {
          tipo: "licao",
          pergunta: "Para que serve a ISO 7001 num projeto de sinalização?",
          alternativas: [
            "Define a cor das placas de trânsito",
            "Padroniza os pictogramas de informação ao público, para que sejam entendidos sem depender de idioma",
            "É a norma de iluminação de parques",
          ],
          correta: 1,
          explicacao: "Pictograma padronizado é entendido por estrangeiros, crianças e pessoas com TEA. ISO 7001 é a biblioteca internacional desses símbolos.",
        },
        {
          tipo: "fontes",
          titulo: "Fontes — normas internacionais",
          itens: [
            { titulo: "Guide to the ADA Standards — Chapter 7: Signs (US Access Board)", url: "https://www.access-board.gov/ada/guides/chapter-7-signs/", tipo: "norma", nota: "Explica §703 (caracteres visuais/táteis, braille, contraste) e §216." },
            { titulo: "Signs (PDF ilustrado) — US Access Board", url: "https://www.access-board.gov/files/ada/guides/signs-ADA.pdf", tipo: "norma", nota: "Guia visual com as medidas de montagem, relevo e pictograma." },
            { titulo: "ISO 7001 — Public information symbols (ISO)", url: "https://www.iso.org/standard/41081.html", tipo: "norma", nota: "Catálogo internacional de pictogramas de informação ao público." },
            { titulo: "WCAG 2.1 — Understanding Contrast (Minimum), 1.4.3 (W3C)", url: "https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html", tipo: "norma", nota: "Limiar 4.5:1 (texto normal) e 3:1 (texto grande)." },
          ],
        },
      ],
    },
    {
      id: "tipos-sinalizacao",
      titulo: "A tipologia da sinalização",
      blocos: [
        { tipo: "texto", texto: "Antes de desenhar qualquer placa, classifique-a. Toda sinalização cai em quatro famílias, e cada uma aparece num momento diferente do percurso. Misturar as funções numa placa só é um erro clássico — confunde todo mundo, e principalmente quem tem TEA ou baixa visão." },
        { tipo: "diagrama", titulo: "As quatro familias e onde cada uma entra", codigo: `flowchart LR
  A["Orientacao: mapa Voce esta aqui, diretorio"] --> B["Direcional: setas ao longo do caminho"]
  B --> C["Identificacao: Aqui e o Lago / Banheiro"]
  C --> D["Regulamentacao: proibido, cuidado, horario"]` },
        { tipo: "texto", texto: "A orientação concentra o mapa geral (fica na entrada e em cruzamentos importantes). A direcional é a seta que mantém a pessoa na rota entre dois pontos. A identificação confirma a chegada ('você está no Mirante'). A regulamentação avisa de regras e perigos (margem do lago, área de obras). Cada família tem seu lugar, sua altura e seu nível de detalhe." },
      ],
    },
    {
      id: "piso-tatil",
      titulo: "Piso tátil: a sinalização que se lê com os pés",
      blocos: [
        { tipo: "texto", texto: "O piso tátil é a espinha dorsal da sinalização para quem não enxerga. São dois tipos (ABNT NBR 16537). O piso de ALERTA tem relevo de tronco de cone (bolinhas) e significa 'pare e preste atenção': beira de lago, topo e base de escada, obstáculo, mudança de direção, início de travessia. O piso DIRECIONAL tem relevo de linhas paralelas e significa 'siga nesta direção' — a pessoa acompanha as linhas com a bengala ou com a sola do pé. Ambos precisam contrastar em cor e em textura com o piso ao redor." },
        {
          tipo: "prancha",
          titulo: "Piso de alerta x piso direcional",
          desenho: {
            legenda: "Alerta = tronco de cone (pare). Direcional = linhas (siga). Sempre com cor contrastante com o piso vizinho.",
            primitivas: [
              { t: "retangulo", p: [18, 40], w: 110, h: 110, cor: "tinta" },
              { t: "rotulo", p: [30, 32], texto: "ALERTA (pare)" },
              { t: "circulo", c: [40, 62], r: 5, hachura: true },
              { t: "circulo", c: [62, 62], r: 5, hachura: true },
              { t: "circulo", c: [84, 62], r: 5, hachura: true },
              { t: "circulo", c: [106, 62], r: 5, hachura: true },
              { t: "circulo", c: [40, 90], r: 5, hachura: true },
              { t: "circulo", c: [62, 90], r: 5, hachura: true },
              { t: "circulo", c: [84, 90], r: 5, hachura: true },
              { t: "circulo", c: [106, 90], r: 5, hachura: true },
              { t: "circulo", c: [40, 118], r: 5, hachura: true },
              { t: "circulo", c: [62, 118], r: 5, hachura: true },
              { t: "circulo", c: [84, 118], r: 5, hachura: true },
              { t: "circulo", c: [106, 118], r: 5, hachura: true },
              { t: "retangulo", p: [176, 40], w: 110, h: 110, cor: "tinta" },
              { t: "rotulo", p: [188, 32], texto: "DIRECIONAL (siga)" },
              { t: "linha", de: [196, 52], ate: [196, 140], cor: "destaque" },
              { t: "linha", de: [214, 52], ate: [214, 140], cor: "destaque" },
              { t: "linha", de: [232, 52], ate: [232, 140], cor: "destaque" },
              { t: "linha", de: [250, 52], ate: [250, 140], cor: "destaque" },
              { t: "linha", de: [268, 52], ate: [268, 140], cor: "destaque" },
              { t: "seta", de: [232, 150], ate: [232, 168], cor: "destaque" },
            ],
          },
        },
        { tipo: "video", titulo: "Os padrões no piso que salvam vidas (Tom Scott, legendas em PT disponíveis)", youtube: "cdPymLgfXSY" },
        {
          tipo: "licao",
          pergunta: "Você está projetando a beira de um lago sem guarda-corpo. Que piso tátil usar?",
          alternativas: [
            "Direcional, para a pessoa seguir a margem",
            "De alerta (tronco de cone), porque sinaliza 'pare, perigo à frente'",
            "Nenhum, basta uma placa escrita",
          ],
          correta: 1,
          explicacao: "Piso de alerta marca risco e mudança: beira d'água, escada, obstáculo. O direcional só conduz em percurso seguro. A placa escrita não alcança quem não enxerga.",
        },
      ],
    },
    // ===================== MÉTODO (DIAGNÓSTICO) =====================
    {
      id: "diagnostico",
      titulo: "Método 1: auditar o parque a pé",
      blocos: [
        { tipo: "texto", texto: "Nenhum projeto de sinalização começa na prancheta — começa caminhando. A auditoria de acessibilidade é percorrer o parque fingindo não conhecê-lo: da entrada ao banheiro, da entrada ao lago, de cada atração à saída. Você anota onde se perdeu, onde faltou informação, onde o piso é ruim, onde a luz some. Idealmente faça isso em horários diferentes (manhã, meio-dia, fim de tarde) porque a luz muda tudo." },
        {
          tipo: "tarefas",
          itens: [
            { id: "d1", titulo: "Levantar a planta do parque (ou desenhar uma à mão) com entradas, caminhos e atrações", entrega: "Planta base com a rede de caminhos marcada" },
            { id: "d2", titulo: "Caminhar as 5 rotas mais usadas e cronometrar/fotografar cada ponto de confusão", entrega: "Lista de pontos de confusão com foto e horário" },
            { id: "d3", titulo: "Medir larguras de caminho, degraus e inclinações com trena e nível", entrega: "Tabela de larguras e desníveis por trecho" },
            { id: "d4", titulo: "Registrar a iluminação e o contraste do piso em 3 horários do dia", entrega: "Fotos comparativas manhã/meio-dia/tarde" },
          ],
        },
      ],
    },
    {
      id: "rota-acessivel",
      titulo: "Método 2: definir a rota acessível",
      blocos: [
        { tipo: "texto", texto: "Num parque grande, nem todo caminho será acessível de imediato — e tudo bem. O que a norma e o bom senso pedem é uma ROTA ACESSÍVEL contínua: um percurso sem degraus, com largura suficiente, inclinação suave e piso firme, que ligue a entrada aos principais destinos. A sinalização se apoia nessa rota. Marcar uma rota que não existe fisicamente é enganar o visitante; por isso a rota vem antes da placa." },
        {
          tipo: "prancha",
          titulo: "Rede de caminhos e a rota acessivel destacada",
          desenho: {
            legenda: "Linha grossa = rota acessivel continua. Circulos = destinos. A sinalizacao segue essa linha.",
            primitivas: [
              { t: "rotulo", p: [16, 20], texto: "Entrada" },
              { t: "circulo", c: [30, 40], r: 6, cor: "destaque" },
              { t: "linha", de: [30, 46], ate: [90, 90], cor: "tinta" },
              { t: "linha", de: [90, 90], ate: [170, 90], cor: "tinta" },
              { t: "linha", de: [170, 90], ate: [240, 60], cor: "tinta" },
              { t: "linha", de: [170, 90], ate: [210, 150], cor: "tinta" },
              { t: "circulo", c: [90, 90], r: 7, cor: "destaque" },
              { t: "rotulo", p: [70, 112], texto: "Lago" },
              { t: "circulo", c: [170, 90], r: 7, cor: "destaque" },
              { t: "rotulo", p: [150, 112], texto: "Praca central" },
              { t: "circulo", c: [240, 60], r: 7, cor: "destaque" },
              { t: "rotulo", p: [224, 48], texto: "Mirante" },
              { t: "circulo", c: [210, 150], r: 7, cor: "destaque" },
              { t: "rotulo", p: [190, 170], texto: "Banheiro" },
              { t: "curva", pts: [[30, 60], [60, 130], [120, 150], [150, 120]], cor: "suave" },
              { t: "rotulo", p: [40, 150], texto: "trilha nao acessivel (suave)" },
            ],
          },
        },
        { tipo: "diagrama", titulo: "Do caminho a placa: a ordem certa", codigo: `flowchart LR
  F["Caminho fisico acessivel existe?"] -->|Sim| R["Define a rota acessivel"]
  F -->|Nao| OBRA["Corrige o caminho primeiro"]
  R --> SIN["Sinaliza a rota (placas + piso + mapa)"]
  OBRA --> R` },
      ],
    },
    {
      id: "pontos-decisao",
      titulo: "Método 3: mapear os pontos de decisão",
      blocos: [
        { tipo: "texto", texto: "Placa não se espalha a esmo: ela mora nos pontos de decisão. Ponto de decisão é todo lugar onde o visitante pode se perguntar 'e agora, por onde?': a entrada, cada bifurcação, cada cruzamento, a chegada a uma atração. Entre dois pontos de decisão, basta a seta de reforço. Sinalizar demais polui; de menos, perde. O mapa de pontos de decisão é o esqueleto do projeto." },
        {
          tipo: "prancha",
          titulo: "Marcando os pontos de decisao numa bifurcacao",
          desenho: {
            legenda: "Em cada bifurcacao, uma placa direcional. No trecho reto, so reforco. Estrela = ponto de decisao.",
            primitivas: [
              { t: "linha", de: [30, 150], ate: [120, 150], cor: "tinta" },
              { t: "linha", de: [120, 150], ate: [200, 90], cor: "tinta" },
              { t: "linha", de: [120, 150], ate: [200, 160], cor: "tinta" },
              { t: "circulo", c: [120, 150], r: 10, cor: "destaque" },
              { t: "rotulo", p: [96, 174], texto: "PONTO DE DECISAO -> placa" },
              { t: "seta", de: [140, 125], ate: [175, 100], cor: "tinta" },
              { t: "rotulo", p: [150, 92], texto: "Mirante" },
              { t: "seta", de: [150, 156], ate: [185, 158], cor: "tinta" },
              { t: "rotulo", p: [150, 150], texto: "Banheiro" },
              { t: "rotulo", p: [40, 138], texto: "trecho reto: so reforco" },
            ],
          },
        },
        {
          tipo: "licao",
          pergunta: "Onde a placa direcional é mais necessária?",
          alternativas: [
            "No meio de um trecho reto e longo",
            "Em cada bifurcação e cruzamento (ponto de decisão)",
            "Só na saída do parque",
          ],
          correta: 1,
          explicacao: "A informação direcional deve estar onde há escolha de caminho. Trecho reto só precisa de reforço ocasional para dar segurança.",
        },
      ],
    },
    {
      id: "walk-through",
      titulo: "Método 4: percorrer com um usuário real",
      blocos: [
        { tipo: "texto", texto: "A prova dos nove do método é o percurso acompanhado: fazer o trajeto ao lado de uma pessoa cega, de uma pessoa com baixa visão e de um usuário de cadeira de rodas, e observar onde o sistema falha de verdade. O projetista vidente sempre superestima o próprio sistema. Só quem depende dele enxerga (ou sente) o buraco. Isso não é 'ouvir opinião' no fim — é parte do método, no começo e no fim." },
        {
          tipo: "mobilizacao",
          papel: "Consultor(a) em acessibilidade com deficiência visual (preferencialmente usuário de bengala/braille)",
          porque: "O desenho universal exige validação por quem usa o canal tátil e sonoro; nenhum projetista vidente consegue auditar sozinho a leiturabilidade do braille, do piso tátil e dos sons em campo.",
          entregaEsperada: "Relatório do percurso acompanhado com os pontos de falha, priorizados, e recomendações de ajuste antes da fabricação.",
          gerenciadoPor: "zaeon",
        },
        {
          tipo: "tarefas",
          itens: [
            { id: "w1", titulo: "Convidar 1 pessoa cega, 1 com baixa visão e 1 cadeirante para o percurso guiado", entrega: "Agenda dos três percursos marcada" },
            { id: "w2", titulo: "Gravar em áudio/vídeo os comentários em cada ponto de decisão (com consentimento)", entrega: "Registro dos percursos" },
            { id: "w3", titulo: "Transformar as falhas em uma lista priorizada (crítico / importante / desejável)", entrega: "Backlog de correções priorizado" },
          ],
        },
      ],
    },
    // ===================== CÁLCULO / MEDIÇÃO =====================
    {
      id: "contraste",
      titulo: "Cálculo 1: contraste que a baixa visão enxerga",
      blocos: [
        { tipo: "texto", texto: "Contraste é o que separa uma placa legível de uma inútil para quem tem baixa visão ou olhos envelhecidos. Dois jeitos de medir. Na WCAG (digital, mas útil aqui) o alvo é 4,5:1 para texto normal e 3:1 para texto grande. No mundo físico das placas usa-se o LRV (Light Reflectance Value, de 0 preto a 100 branco): a boa prática pede uma diferença de pelo menos 30 pontos de LRV entre o caractere e o fundo, e também entre a placa e a parede/poste atrás dela. Letra escura em fundo claro (ou o inverso), nunca tom sobre tom." },
        {
          tipo: "prancha",
          titulo: "Contraste bom x ruim (a mesma palavra)",
          desenho: {
            legenda: "Esquerda: alto contraste (le-se longe). Direita: tom sobre tom (some com o sol).",
            primitivas: [
              { t: "retangulo", p: [18, 50], w: 120, h: 80, cor: "tinta", hachura: true },
              { t: "rotulo", p: [40, 95], texto: "LAGO" },
              { t: "rotulo", p: [30, 142], texto: "contraste alto: OK" },
              { t: "retangulo", p: [168, 50], w: 120, h: 80, cor: "suave" },
              { t: "rotulo", p: [190, 95], texto: "LAGO" },
              { t: "rotulo", p: [176, 142], texto: "tom sobre tom: falha" },
              { t: "seta", de: [228, 40], ate: [210, 52], cor: "destaque" },
              { t: "rotulo", p: [214, 34], texto: "sol apaga" },
            ],
          },
        },
        {
          tipo: "licao",
          pergunta: "Qual diferença mínima de LRV é boa prática entre caractere e fundo da placa?",
          alternativas: ["5 pontos", "Pelo menos 30 pontos", "100 pontos obrigatórios"],
          correta: 1,
          explicacao: "ΔLRV ≥ 30 é a recomendação corrente para legibilidade por baixa visão; abaixo disso, com sol forte ou sombra, o texto desaparece.",
        },
        {
          tipo: "fontes",
          titulo: "Fontes — contraste",
          itens: [
            { titulo: "The Importance of Color Contrast for Signage Accessibility (Identity Group)", url: "https://identitygroup.com/blogs/resources/the-importance-of-color-contrast-for-signage-accessibility", tipo: "artigo", nota: "Boa prática de LRV e contraste para placas físicas." },
            { titulo: "WCAG 2.1 — Non-text Contrast 1.4.11 (W3C)", url: "https://www.w3.org/WAI/WCAG21/Understanding/non-text-contrast.html", tipo: "norma", nota: "Limiar 3:1 para elementos gráficos e pictogramas." },
          ],
        },
      ],
    },
    {
      id: "tipografia",
      titulo: "Cálculo 2: tipografia legível",
      blocos: [
        { tipo: "texto", texto: "A letra certa para placa é sem serifa (sans-serif), com traço de espessura uniforme, boa altura de 'x' (a parte minúscula) e espaçamento generoso. Evite tudo em CAIXA ALTA em textos longos — a palavra perde o formato que o olho reconhece; caixa alta serve para rótulos curtos. Há fontes desenhadas para isso: a Atkinson Hyperlegible, criada pelo Braille Institute, diferencia letras parecidas (o 0 do O, o I do l) e é gratuita. A ADA pede, para caracteres táteis, formato sem serifa e sem itálico, em caixa alta." },
        {
          tipo: "prancha",
          titulo: "Anatomia de uma letra legivel",
          desenho: {
            legenda: "Sem serifa, traco uniforme, altura de x generosa. O olho reconhece a forma da palavra.",
            primitivas: [
              { t: "linha", de: [40, 60], ate: [260, 60], cor: "suave" },
              { t: "linha", de: [40, 110], ate: [260, 110], cor: "suave" },
              { t: "linha", de: [40, 140], ate: [260, 140], cor: "suave" },
              { t: "rotulo", p: [36, 56], texto: "topo" },
              { t: "rotulo", p: [36, 108], texto: "altura de x" },
              { t: "rotulo", p: [36, 138], texto: "base" },
              { t: "rotulo", p: [120, 100], texto: "Rg" },
              { t: "seta", de: [170, 90], ate: [150, 100], cor: "destaque" },
              { t: "rotulo", p: [172, 86], texto: "sem serifa" },
            ],
          },
        },
        {
          tipo: "fontes",
          titulo: "Fontes — tipografia",
          itens: [
            { titulo: "Atkinson Hyperlegible Font (Braille Institute) — fonte gratuita para baixa visão", url: "https://www.brailleinstitute.org/freefont/", tipo: "site", nota: "Projetada para diferenciar caracteres parecidos; uso livre." },
            { titulo: "Guide to the ADA Standards — Chapter 7: Signs (US Access Board)", url: "https://www.access-board.gov/ada/guides/chapter-7-signs/", tipo: "norma", nota: "§703.2.3: caracteres táteis sem serifa, caixa alta, sem itálico." },
          ],
        },
      ],
    },
    {
      id: "tamanho-letra",
      titulo: "Cálculo 3: tamanho da letra pela distância",
      blocos: [
        { tipo: "texto", texto: "O tamanho da letra depende de quão longe ela será lida. A regra prática mais usada: altura da letra ≈ distância de leitura ÷ 200. Lê a 5 m de distância? Letra de ~25 mm. A 10 m? ~50 mm. Para baixa visão, suba uma margem. A ADA (§703.5) traz uma tabela crescente: quanto mais alta a placa e mais longe o leitor, maior o caractere. O erro clássico é projetar a letra no computador (perto dos olhos) e esquecer que no parque ela será lida a metros de distância." },
        {
          tipo: "prancha",
          titulo: "A mesma placa, lida a 2 m e a 10 m",
          desenho: {
            legenda: "Dobrou a distancia, dobra a altura da letra. Regra: altura (mm) = distancia (mm) / 200.",
            primitivas: [
              { t: "retangulo", p: [30, 60], w: 40, h: 26, cor: "tinta" },
              { t: "rotulo", p: [36, 78], texto: "ABC" },
              { t: "rotulo", p: [26, 100], texto: "2 m -> 10 mm" },
              { t: "retangulo", p: [150, 50], w: 90, h: 50, cor: "tinta" },
              { t: "rotulo", p: [166, 82], texto: "ABC" },
              { t: "rotulo", p: [150, 118], texto: "10 m -> 50 mm" },
              { t: "seta", de: [80, 140], ate: [250, 140], cor: "suave" },
              { t: "rotulo", p: [120, 160], texto: "distancia de leitura" },
            ],
          },
        },
        {
          tipo: "licao",
          pergunta: "Uma placa de identificação será lida a cerca de 6 m. Qual altura de letra, pela regra prática?",
          alternativas: ["Cerca de 6 mm", "Cerca de 30 mm", "Cerca de 300 mm"],
          correta: 1,
          explicacao: "6 m = 6000 mm; 6000 ÷ 200 = 30 mm. A regra 'distância ÷ 200' dá um piso confortável; some margem para baixa visão.",
        },
      ],
    },
    {
      id: "altura-montagem",
      titulo: "Cálculo 4: altura de montagem",
      blocos: [
        { tipo: "texto", texto: "A altura resolve dois corpos ao mesmo tempo. Para LEITURA TÁTIL (braille e relevo), a mão precisa alcançar sem esforço: a ADA pede a base do caractere entre 1,22 m (48 in) e 1,52 m (60 in) do piso; a NBR 9050 trabalha faixas semelhantes para informação tátil de parede. Para PLACA SUSPENSA sobre o caminho, deixe no mínimo 2,10 m de altura livre embaixo, para ninguém bater a cabeça. E atenção ao cadeirante: um mapa ou diretório para toque deve ter a superfície a uma altura e inclinação que a pessoa sentada alcance." },
        {
          tipo: "prancha",
          titulo: "Tres alturas que convivem",
          desenho: {
            legenda: "Leitura tatil ~1,25-1,52 m; placa suspensa >=2,10 m livre; mapa inclinado ao alcance sentado.",
            primitivas: [
              { t: "linha", de: [20, 175], ate: [290, 175], cor: "tinta" },
              { t: "retangulo", p: [40, 60], w: 44, h: 30, cor: "tinta" },
              { t: "rotulo", p: [46, 78], texto: "tatil" },
              { t: "linha", de: [62, 90], ate: [62, 175], cor: "suave" },
              { t: "rotulo", p: [86, 130], texto: "1,25-1,52 m" },
              { t: "retangulo", p: [150, 20], w: 70, h: 24, cor: "destaque" },
              { t: "rotulo", p: [158, 37], texto: "suspensa" },
              { t: "linha", de: [185, 44], ate: [185, 175], cor: "suave" },
              { t: "rotulo", p: [196, 110], texto: ">= 2,10 m livre" },
              { t: "linha", de: [250, 120], ate: [280, 100], cor: "tinta" },
              { t: "rotulo", p: [238, 140], texto: "mapa inclinado" },
            ],
          },
        },
        {
          tipo: "licao",
          pergunta: "Qual a altura livre mínima embaixo de uma placa suspensa sobre o caminho?",
          alternativas: ["1,50 m", "2,10 m", "3,00 m"],
          correta: 1,
          explicacao: "A NBR 9050 adota 2,10 m como altura livre mínima sob obstáculos/sinalização suspensa, para não ferir a cabeça de quem passa.",
        },
      ],
    },
    {
      id: "braille-relevo",
      titulo: "Cálculo 5: braille e caracteres em relevo",
      blocos: [
        { tipo: "texto", texto: "A informação tátil tem duas camadas que convivem na mesma placa: o caractere em RELEVO (letra elevada, lida com a ponta do dedo por quem perdeu a visão tarde e não lê braille) e o BRAILLE (para quem lê braille). A ADA especifica caracteres táteis com relevo de pelo menos 0,8 mm, altura de 16 a 51 mm, sem serifa e em caixa alta; o braille deve ser grau 2 (contraído), com pontos em forma de cúpula e espaçamento padronizado, posicionado abaixo do texto correspondente. O braille fica à esquerda e embaixo, onde a mão espera encontrá-lo." },
        {
          tipo: "prancha",
          titulo: "Placa tatil: relevo em cima, braille embaixo",
          desenho: {
            legenda: "Caractere em relevo (toque) + braille grau 2 logo abaixo. Acabamento fosco (sem brilho).",
            primitivas: [
              { t: "retangulo", p: [60, 40], w: 180, h: 110, cor: "tinta" },
              { t: "rotulo", p: [96, 78], texto: "BANHEIRO" },
              { t: "rotulo", p: [78, 96], texto: "(letra em relevo)" },
              { t: "circulo", c: [88, 120], r: 2, cor: "destaque" },
              { t: "circulo", c: [96, 120], r: 2, cor: "destaque" },
              { t: "circulo", c: [88, 128], r: 2, cor: "destaque" },
              { t: "circulo", c: [112, 120], r: 2, cor: "destaque" },
              { t: "circulo", c: [120, 128], r: 2, cor: "destaque" },
              { t: "circulo", c: [112, 128], r: 2, cor: "destaque" },
              { t: "rotulo", p: [140, 128], texto: "braille grau 2" },
              { t: "seta", de: [255, 60], ate: [240, 70], cor: "suave" },
              { t: "rotulo", p: [250, 54], texto: "relevo >= 0,8 mm" },
            ],
          },
        },
        { tipo: "video", titulo: "Como pessoas cegas encontram as placas em braille (Tommy Edison)", youtube: "fYLdlO96uaM" },
      ],
    },
    {
      id: "pictogramas",
      titulo: "Cálculo 6: pictogramas que todos leem",
      blocos: [
        { tipo: "texto", texto: "O pictograma é o canal que atravessa idioma, idade e alfabetização. Use a biblioteca ISO 7001 (o bonequinho padronizado de banheiro, lanchonete, informação, etc.) e o Símbolo Internacional de Acesso (SIA) — a figura branca em fundo azul que marca rota e serviço acessíveis. A ADA pede que o pictograma ocupe um campo de pelo menos 152 mm (6 in) de altura, com o texto descritivo logo abaixo (fora do campo do símbolo). Pictograma e fundo também precisam de contraste de 3:1." },
        {
          tipo: "prancha",
          titulo: "Campo do pictograma + descritor",
          desenho: {
            legenda: "Pictograma num campo >= 152 mm; texto descritivo abaixo do campo, nao dentro.",
            primitivas: [
              { t: "retangulo", p: [100, 34], w: 100, h: 100, cor: "tinta" },
              { t: "circulo", c: [150, 64], r: 10, cor: "tinta" },
              { t: "linha", de: [150, 74], ate: [150, 104], cor: "tinta" },
              { t: "linha", de: [150, 84], ate: [134, 98], cor: "tinta" },
              { t: "linha", de: [150, 84], ate: [166, 98], cor: "tinta" },
              { t: "linha", de: [150, 104], ate: [138, 124], cor: "tinta" },
              { t: "linha", de: [150, 104], ate: [162, 124], cor: "tinta" },
              { t: "rotulo", p: [204, 84], texto: "campo >= 152 mm" },
              { t: "rotulo", p: [118, 152], texto: "INFORMACAO (descritor)" },
              { t: "linha", de: [100, 140], ate: [200, 140], cor: "suave" },
            ],
          },
        },
        {
          tipo: "licao",
          pergunta: "O que é o Símbolo Internacional de Acesso (SIA)?",
          alternativas: [
            "Uma logomarca comercial de cadeiras de rodas",
            "A figura branca em fundo azul que indica rota/serviço acessível, padronizada internacionalmente",
            "Um símbolo opcional de decoração",
          ],
          correta: 1,
          explicacao: "O SIA marca acessos, sanitários e rotas acessíveis. É reconhecido mundialmente e padronizado pela NBR 9050 e pela ISO.",
        },
      ],
    },
    // ===================== PROJETO =====================
    {
      id: "mapa-voce-esta-aqui",
      titulo: "Projeto 1: o mapa 'Você está aqui'",
      blocos: [
        { tipo: "texto", texto: "O mapa de orientação é o coração da entrada. Duas regras salvam qualquer mapa. Primeira: 'heading up' (alinhado ao olhar) — o que está à sua frente no mundo real deve estar para cima no mapa, não o norte geográfico. Segunda: o ponto 'VOCÊ ESTÁ AQUI' em destaque, grande e coerente com a sua posição física. Acrescente uma legenda curta, pictogramas, e, na versão tátil, relevo e braille. Um mapa 'norte para cima' obriga a pessoa a girar o mapa na cabeça — e a maioria erra." },
        {
          tipo: "prancha",
          titulo: "Mapa de orientacao heading-up",
          desenho: {
            legenda: "O caminho a frente aponta para cima; VOCE ESTA AQUI em destaque; legenda com pictogramas.",
            primitivas: [
              { t: "retangulo", p: [24, 26], w: 200, h: 150, cor: "tinta" },
              { t: "circulo", c: [70, 150], r: 8, cor: "destaque" },
              { t: "rotulo", p: [40, 170], texto: "VOCE ESTA AQUI" },
              { t: "seta", de: [70, 142], ate: [70, 60], cor: "tinta" },
              { t: "linha", de: [70, 60], ate: [160, 60], cor: "tinta" },
              { t: "circulo", c: [160, 60], r: 6 },
              { t: "rotulo", p: [150, 50], texto: "Lago" },
              { t: "rotulo", p: [140, 150], texto: "frente = cima" },
              { t: "retangulo", p: [238, 26], w: 50, h: 150, cor: "suave" },
              { t: "rotulo", p: [244, 40], texto: "Legenda" },
              { t: "circulo", c: [252, 60], r: 3 },
              { t: "rotulo", p: [258, 62], texto: "WC" },
              { t: "circulo", c: [252, 80], r: 3 },
              { t: "rotulo", p: [258, 82], texto: "agua" },
            ],
          },
        },
        {
          tipo: "fontes",
          titulo: "Fontes — mapas e orientação",
          itens: [
            { titulo: "CAN-ASC-2.4 Wayfinding and Signage — Signage (Accessibility Standards Canada)", url: "https://accessible.canada.ca/creating-accessibility-standards/can-asc-24-wayfinding-and-signage/12-signage", tipo: "norma", nota: "Padrão sobre painéis de orientação, 'you are here' e diretórios." },
            { titulo: "Reading the Room — Principles for Tactile Map Design (Entro)", url: "https://entro.com/insights/reading-the-room-principles-for-tactile-map-design/", tipo: "artigo", nota: "Boas práticas de mapa tátil: simplificação, relevo, legenda." },
          ],
        },
      ],
    },
    {
      id: "mapa-tatil-fab",
      titulo: "Projeto 2: o mapa tátil",
      blocos: [
        { tipo: "texto", texto: "O mapa tátil não é o mapa visual com relevo por cima — é um redesenho. A mão 'lê' bem menos informação que o olho, então simplifique: poucos caminhos, poucas texturas distinguíveis (lago = uma textura, caminho = outra, área verde = outra), legenda em braille e relevo, e um ponto de partida tátil claro. Materiais: superfícies foscas (sem brilho que ofusca a baixa visão), resistentes ao tempo e ao toque constante. A inclinação da bancada (uns 15 a 30 graus) aproxima a leitura tátil e a visual ao mesmo tempo." },
        {
          tipo: "diagrama", titulo: "Camadas de informacao do mapa tatil", codigo: `flowchart TD
  BASE["Base simplificada (poucos caminhos)"] --> TEX["Texturas distintas: lago, caminho, area verde"]
  TEX --> PR["Pontos em relevo: destinos"]
  PR --> LEG["Legenda em relevo + braille"]
  LEG --> VE["VOCE ESTA AQUI tatil"]` },
        {
          tipo: "mobilizacao",
          papel: "Designer/produtor de material tátil (mapas e maquetes táteis)",
          porque: "A conversão de um mapa visual em mapa tátil legível exige técnica específica (simplificação, escolha de texturas, revisão de braille) e equipamento de produção (relevo, termoformagem ou impressão 3D) que não é de prateleira.",
          entregaEsperada: "Protótipo físico do mapa tátil validado por leitor de braille, com legenda conferida e materiais especificados para instalação externa.",
          gerenciadoPor: "zaeon",
        },
      ],
    },
    {
      id: "totem-entrada",
      titulo: "Projeto 3: o totem de entrada",
      blocos: [
        { tipo: "texto", texto: "A entrada concentra tudo: mapa de orientação, diretório de destinos com distâncias, horário de funcionamento, telefone de emergência e o início do piso tátil que conduz à rota acessível. Pense no totem como a 'recepção' do parque — mesmo quando não há recepcionista. Posicione-o logo após a entrada, fora do fluxo de passagem (para a pessoa poder parar e ler sem ser atropelada), bem iluminado e com piso de alerta na frente para quem chega pela guia tátil saber que ali há informação." },
        {
          tipo: "prancha",
          titulo: "Totem de entrada: zonas de informacao",
          desenho: {
            legenda: "Topo: identificacao do parque. Meio: mapa heading-up. Base: diretorio + horario. Frente: piso de alerta.",
            primitivas: [
              { t: "retangulo", p: [100, 20], w: 110, h: 150, cor: "tinta" },
              { t: "linha", de: [100, 44], ate: [210, 44], cor: "tinta" },
              { t: "rotulo", p: [118, 38], texto: "PARQUE X" },
              { t: "retangulo", p: [112, 54], w: 86, h: 60, cor: "suave" },
              { t: "rotulo", p: [130, 86], texto: "MAPA" },
              { t: "linha", de: [100, 122], ate: [210, 122], cor: "tinta" },
              { t: "rotulo", p: [112, 134], texto: "Diretorio" },
              { t: "rotulo", p: [112, 150], texto: "Horario / SOS" },
              { t: "circulo", c: [130, 184], r: 3, hachura: true },
              { t: "circulo", c: [150, 184], r: 3, hachura: true },
              { t: "circulo", c: [170, 184], r: 3, hachura: true },
              { t: "rotulo", p: [180, 186], texto: "piso de alerta" },
            ],
          },
        },
        { tipo: "diagrama", titulo: "O que o totem precisa conter", codigo: `flowchart LR
  T["Totem de entrada"] --> ID["Identificacao do parque"]
  T --> MP["Mapa heading-up (visual + tatil)"]
  T --> DI["Diretorio com distancias"]
  T --> HR["Horario e telefone SOS"]
  T --> PT["Inicio do piso tatil direcional"]` },
      ],
    },
    {
      id: "sinal-direcional",
      titulo: "Projeto 4: placas direcionais na trilha",
      blocos: [
        { tipo: "texto", texto: "Entre os destinos, a placa direcional mantém a pessoa na rota. Boas práticas: seta + pictograma + nome + distância, nessa ordem de peso; no máximo 3 a 4 destinos por placa (mais que isso vira parede de texto); consistência total de cor, fonte e posição ao longo de todo o parque (o cérebro aprende o padrão e relaxa). A distância ('Lago 150 m') é ouro para quem tem baixa visão ou mobilidade reduzida: ajuda a decidir se vale a pena ir." },
        {
          tipo: "prancha",
          titulo: "Placa direcional bem resolvida",
          desenho: {
            legenda: "Seta + pictograma + nome + distancia. Poucos destinos. Padrao repetido no parque todo.",
            primitivas: [
              { t: "retangulo", p: [40, 50], w: 220, h: 90, cor: "tinta" },
              { t: "seta", de: [60, 74], ate: [92, 74], cor: "destaque" },
              { t: "circulo", c: [108, 74], r: 7 },
              { t: "rotulo", p: [124, 76], texto: "Lago      150 m" },
              { t: "seta", de: [60, 112], ate: [92, 112], cor: "destaque" },
              { t: "circulo", c: [108, 112], r: 7 },
              { t: "rotulo", p: [124, 114], texto: "Banheiro   80 m" },
              { t: "linha", de: [40, 92], ate: [260, 92], cor: "suave" },
              { t: "rotulo", p: [150, 36], texto: "max. 3-4 destinos" },
            ],
          },
        },
        {
          tipo: "licao",
          pergunta: "Por que incluir a distância ('Lago 150 m') na placa direcional ajuda a acessibilidade?",
          alternativas: [
            "Deixa a placa mais cheia",
            "Permite a quem tem mobilidade reduzida ou baixa visão decidir e se planejar antes de caminhar",
            "É exigência de cor",
          ],
          correta: 1,
          explicacao: "Saber a distância é informação de decisão: quem se cansa rápido ou precisa de pausa se organiza. Pequeno dado, grande autonomia.",
        },
      ],
    },
    {
      id: "recursos-sonoros",
      titulo: "Projeto 5: o canal sonoro e digital",
      blocos: [
        { tipo: "texto", texto: "O terceiro canal — ouvir — fecha o sistema. Opções, da mais simples à mais tecnológica: QR Code na placa que abre um áudio com audiodescrição do local e das rotas; balizas sonoras (beacons Bluetooth) que um app lê e anuncia ('você está na praça central, banheiro à direita'); e sinais sonoros em travessias e pontos de risco. O digital complementa, não substitui, o físico: celular descarrega, não há sinal, nem todo mundo tem o app. Piso tátil e braille continuam sendo a base." },
        { tipo: "diagrama", titulo: "Camadas do canal sonoro/digital", codigo: `flowchart TD
  FIS["Base fisica: piso tatil + braille + relevo"] --> QR["QR na placa -> audiodescricao"]
  FIS --> BEA["Beacons BLE -> app anuncia o local"]
  FIS --> SOM["Sinal sonoro em travessia/risco"]
  QR --> NOTA["Digital COMPLEMENTA, nunca substitui o fisico"]
  BEA --> NOTA` },
        {
          tipo: "licao",
          pergunta: "Qual é o papel certo do QR Code com audiodescrição num parque?",
          alternativas: [
            "Substituir o braille e o piso tátil, que ficam desnecessários",
            "Complementar a base física, oferecendo mais informação a quem tem celular e app",
            "Decorar a placa",
          ],
          correta: 1,
          explicacao: "O digital é camada extra. Quem não tem celular, sinal ou bateria precisa do piso tátil e do braille funcionando sozinhos.",
        },
      ],
    },
    {
      id: "materiais",
      titulo: "Projeto 6: materiais que aguentam o parque",
      blocos: [
        { tipo: "texto", texto: "Parque é sol, chuva, maresia, poeira, mão passando e, às vezes, vandalismo. A placa bonita de showroom derrete em seis meses ao ar livre. Escolha acabamento FOSCO (anti-reflexo: o brilho ofusca justamente a baixa visão), materiais resistentes a UV e umidade (alumínio, aço, compósitos, acrílico UV), fixação robusta, e relevo/braille em material que não descola nem desgasta com o toque. Pense na manutenção desde o projeto: peças moduladas, fáceis de trocar, com cor e textura que o tempo não apague." },
        {
          tipo: "prancha",
          titulo: "Camadas de uma placa externa duravel",
          desenho: {
            legenda: "Acabamento fosco anti-reflexo; nucleo resistente; relevo/braille integrado; fixacao robusta.",
            primitivas: [
              { t: "retangulo", p: [70, 40], w: 160, h: 26, cor: "suave" },
              { t: "rotulo", p: [78, 58], texto: "acabamento fosco (anti-reflexo)" },
              { t: "retangulo", p: [70, 66], w: 160, h: 30, cor: "tinta" },
              { t: "rotulo", p: [98, 85], texto: "nucleo resistente UV" },
              { t: "retangulo", p: [70, 96], w: 160, h: 22, hachura: true },
              { t: "rotulo", p: [92, 112], texto: "relevo + braille integrado" },
              { t: "linha", de: [150, 118], ate: [150, 170], cor: "tinta" },
              { t: "rotulo", p: [156, 150], texto: "fixacao robusta" },
            ],
          },
        },
        {
          tipo: "licao",
          pergunta: "Por que o acabamento da placa deve ser fosco, e não brilhante?",
          alternativas: [
            "Fosco é mais barato sempre",
            "O brilho reflete o sol e ofusca, prejudicando justamente quem tem baixa visão",
            "Placas brilhantes são proibidas por lei federal",
          ],
          correta: 1,
          explicacao: "Superfície brilhante gera reflexo e véu de luz que apaga o contraste. Acabamento fosco mantém a leitura sob sol forte.",
        },
      ],
    },
    {
      id: "iluminacao",
      titulo: "Projeto 7: enxergar a placa à noite",
      blocos: [
        { tipo: "texto", texto: "Se o parque abre ao entardecer ou à noite, a sinalização precisa continuar legível no escuro. Três abordagens combináveis: iluminação dedicada que banha a placa sem criar ofuscamento nem sombra dura; materiais retrorrefletivos (devolvem a luz da lanterna/farol); e, para marcação de borda e rota, elementos fotoluminescentes que brilham depois de carregar com a luz do dia. Cuidado com luminária mal posicionada: luz na cara do leitor cega; luz rasante na placa cria sombra que engole o texto." },
        {
          tipo: "prancha",
          titulo: "Iluminar a placa sem ofuscar",
          desenho: {
            legenda: "Luz vem de cima e levemente a frente, banhando a placa. Evite luz rasante (sombra) e luz na cara.",
            primitivas: [
              { t: "retangulo", p: [110, 80], w: 90, h: 60, cor: "tinta" },
              { t: "rotulo", p: [130, 114], texto: "PLACA" },
              { t: "circulo", c: [155, 34], r: 8, cor: "destaque" },
              { t: "rotulo", p: [168, 32], texto: "luminaria" },
              { t: "seta", de: [155, 42], ate: [150, 78], cor: "destaque" },
              { t: "seta", de: [155, 42], ate: [170, 78], cor: "destaque" },
              { t: "linha", de: [60, 150], ate: [250, 150], cor: "suave" },
              { t: "rotulo", p: [66, 166], texto: "luz de cima e a frente = sem sombra dura" },
            ],
          },
        },
        { tipo: "texto", texto: "Teste no escuro, no local, com os próprios olhos e com a câmera do celular (que mostra bem o reflexo). O que parece ótimo na maquete 3D pode virar um borrão com a luminária errada." },
      ],
    },
    // ===================== EXECUÇÃO =====================
    {
      id: "projeto-executivo",
      titulo: "Execução 1: projeto executivo e responsável técnico",
      blocos: [
        { tipo: "texto", texto: "O desenho conceitual vira obra quando ganha projeto executivo: pranchas com medidas exatas, especificação de materiais, detalhes de fundação e fixação, plano de locação das placas e do piso tátil no mapa, e memorial descritivo apontando as normas atendidas (NBR 9050, NBR 16537). Em obra pública, isso exige um responsável técnico (arquiteto ou engenheiro) que assina ART/RRT e responde pelo atendimento à norma. Sem responsável técnico, o projeto não passa na aprovação nem na fiscalização." },
        {
          tipo: "mobilizacao",
          papel: "Arquiteto(a) ou Engenheiro(a) responsável técnico (com ART/RRT)",
          porque: "A implantação de sinalização e piso tátil em espaço público é obra que exige responsabilidade técnica legal, compatibilização com a NBR 9050/16537 e emissão de ART/RRT para aprovação e fiscalização.",
          entregaEsperada: "Projeto executivo completo (pranchas cotadas, memorial, especificações) com ART/RRT emitida, pronto para licitação/execução.",
          gerenciadoPor: "zaeon",
        },
        {
          tipo: "tarefas",
          itens: [
            { id: "e1", titulo: "Consolidar o mapa de locação das placas e do piso tátil sobre a planta do parque", entrega: "Planta de locação da sinalização" },
            { id: "e2", titulo: "Montar o caderno de especificações (materiais, acabamentos, dimensões, braille)", entrega: "Memorial descritivo e especificações" },
            { id: "e3", titulo: "Listar as normas atendidas item a item (checklist NBR 9050 / NBR 16537)", entrega: "Checklist de conformidade assinado" },
          ],
        },
      ],
    },
    {
      id: "fabricacao",
      titulo: "Execução 2: fabricação das peças",
      blocos: [
        { tipo: "texto", texto: "Fabricar placa acessível é diferente de imprimir banner. O braille precisa ser gravado/aplicado com altura e espaçamento corretos (um braille 'bonito' mas fora de padrão não se lê); o relevo dos caracteres tem de ter a altura mínima; as cores precisam bater com o LRV especificado; o acabamento tem de ser fosco. Peça sempre uma amostra-piloto e confira o braille com um leitor cego ANTES de produzir o lote. Erro de braille multiplicado por 50 placas é prejuízo e exclusão." },
        { tipo: "diagrama", titulo: "Da especificacao a peca aprovada", codigo: `flowchart LR
  ESP["Especificacao"] --> AM["Amostra-piloto (1 peca)"]
  AM --> CONF["Conferencia do braille por leitor cego"]
  CONF -->|OK| LOTE["Producao do lote"]
  CONF -->|erro| AJ["Ajuste e nova amostra"]
  AJ --> AM` },
        {
          tipo: "mobilizacao",
          papel: "Fabricante de sinalização tátil/braille",
          porque: "A gravação de braille em padrão, o relevo dos caracteres e o acabamento externo fosco exigem maquinário e técnica de fabricação específicos; a qualidade do braille só se garante com fornecedor especializado.",
          entregaEsperada: "Amostra-piloto aprovada (braille conferido por leitor cego) e, depois, o lote completo dentro da especificação.",
          gerenciadoPor: "zaeon",
        },
      ],
    },
    {
      id: "instalacao",
      titulo: "Execução 3: instalação em campo",
      blocos: [
        { tipo: "texto", texto: "A instalação define se tudo funciona. A placa tem de ficar no prumo e na altura especificada; o totem precisa de fundação que aguente vento e esbarrão; o piso tátil tem de ser assentado contínuo, bem nivelado (degrau no piso tátil vira tropeço), e ligando de fato a entrada aos destinos. O erro mais comum em obra é o piso tátil 'solto' — um pedaço aqui, outro ali, sem continuidade — que confunde mais do que ajuda. Confira a locação real contra o mapa de projeto, metro na mão." },
        {
          tipo: "prancha",
          titulo: "O que conferir na instalacao",
          desenho: {
            legenda: "Prumo e altura da placa; fundacao do totem; piso tatil continuo e nivelado ate o destino.",
            primitivas: [
              { t: "linha", de: [20, 170], ate: [290, 170], cor: "tinta" },
              { t: "linha", de: [60, 60], ate: [60, 170], cor: "tinta" },
              { t: "retangulo", p: [40, 40], w: 44, h: 22, cor: "tinta" },
              { t: "rotulo", p: [16, 100], texto: "prumo + altura" },
              { t: "retangulo", p: [52, 170], w: 16, h: 10, hachura: true },
              { t: "rotulo", p: [44, 192], texto: "fundacao" },
              { t: "circulo", c: [140, 170], r: 3, hachura: true },
              { t: "circulo", c: [160, 170], r: 3, hachura: true },
              { t: "circulo", c: [180, 170], r: 3, hachura: true },
              { t: "circulo", c: [200, 170], r: 3, hachura: true },
              { t: "circulo", c: [220, 170], r: 3, hachura: true },
              { t: "rotulo", p: [150, 158], texto: "piso tatil continuo" },
              { t: "seta", de: [140, 170], ate: [240, 170], cor: "destaque" },
            ],
          },
        },
        {
          tipo: "mobilizacao",
          papel: "Equipe de instalação / assentamento de piso tátil",
          porque: "Fundação, prumo, nivelamento e continuidade do piso tátil são serviços de campo que, mal executados, invalidam o projeto (piso desnivelado vira tropeço; placa torta ou baixa fica ilegível).",
          entregaEsperada: "Sinalização instalada conforme o projeto, com piso tátil contínuo e nivelado, conferida contra a planta de locação.",
          gerenciadoPor: "zaeon",
        },
        {
          tipo: "licao",
          pergunta: "Qual é o erro de instalação mais comum e perigoso no piso tátil?",
          alternativas: [
            "Usar a cor amarela",
            "Instalar em trechos soltos e desnivelados, sem continuidade entre entrada e destinos",
            "Instalar piso de alerta em escada",
          ],
          correta: 1,
          explicacao: "Piso tátil só funciona contínuo e nivelado. Pedaços soltos confundem a rota, e desnível vira risco de queda.",
        },
      ],
    },
    {
      id: "validacao",
      titulo: "Execução 4: validar antes de abrir",
      blocos: [
        { tipo: "texto", texto: "Antes do corte de fita, faça o teste de usabilidade com usuários reais percorrendo o sistema instalado — os mesmos perfis do método (cego, baixa visão, cadeirante) mais, se der, idoso e família com criança. Dê uma tarefa ('chegue ao banheiro sozinho a partir da entrada') e observe sem ajudar. Onde eles travam, o sistema falhou — e é muito mais barato corrigir agora do que depois de inaugurado. Documente, ajuste, e só então abra." },
        {
          tipo: "mobilizacao",
          papel: "Usuários-avaliadores com deficiência (cego, baixa visão, mobilidade reduzida)",
          porque: "A conformidade com a norma não garante usabilidade real; só o teste com quem depende do sistema revela falhas de leiturabilidade, continuidade e lógica antes da inauguração.",
          entregaEsperada: "Relatório do teste de usabilidade com taxa de sucesso por tarefa e lista de correções finais.",
          gerenciadoPor: "zaeon",
        },
        {
          tipo: "tarefas",
          itens: [
            { id: "v1", titulo: "Definir 4 tarefas de percurso (entrada->banheiro, entrada->lago, etc.)", entrega: "Roteiro de teste de usabilidade" },
            { id: "v2", titulo: "Rodar o teste com ao menos 5 usuários de perfis diferentes, sem intervir", entrega: "Registros de sucesso/falha por tarefa" },
            { id: "v3", titulo: "Priorizar e executar as correções críticas antes da abertura", entrega: "Correções concluídas e reteste" },
          ],
        },
      ],
    },
    // ===================== MANUTENÇÃO =====================
    {
      id: "manutencao",
      titulo: "Manutenção: o sistema que não se mantém, morre",
      blocos: [
        { tipo: "texto", texto: "Sinalização de parque é um organismo vivo que o tempo ataca: a vegetação cresce e esconde a placa, a folha e o barro cobrem o piso tátil, o sol desbota a cor (e mata o contraste), o vandalismo arranca o braille, bancos e quiosques novos bloqueiam a rota. Um sistema acessível sem plano de manutenção vira, em um ano, um sistema inacessível com aparência de acessível — o pior dos mundos, porque a pessoa confia e se machuca." },
        {
          tipo: "tarefas",
          itens: [
            { id: "m1", titulo: "Rotina mensal: limpar o piso tátil e podar a vegetação que cobre placas", entrega: "Checklist mensal assinado" },
            { id: "m2", titulo: "Rotina trimestral: medir o contraste/estado das placas e repintar/trocar o que desbotou", entrega: "Relatório trimestral de estado" },
            { id: "m3", titulo: "Verificar o braille e o relevo ao toque (descolamento, desgaste)", entrega: "Lista de peças táteis a reparar" },
            { id: "m4", titulo: "Checar que nenhum mobiliário novo bloqueia a rota ou o piso tátil", entrega: "Confirmação de rota livre" },
          ],
        },
        {
          tipo: "prancha",
          titulo: "Inimigos do tempo (e a ronda)",
          desenho: {
            legenda: "Vegetacao, folhas no piso tatil, desbotamento e obstrucao: a ronda de manutencao combate os quatro.",
            primitivas: [
              { t: "retangulo", p: [30, 40], w: 60, h: 36, cor: "tinta" },
              { t: "rotulo", p: [40, 88], texto: "placa coberta" },
              { t: "curva", pts: [[26, 76], [50, 50], [70, 70], [94, 46]], cor: "suave" },
              { t: "rotulo", p: [150, 50], texto: "piso com folhas" },
              { t: "circulo", c: [160, 70], r: 3, hachura: true },
              { t: "circulo", c: [172, 70], r: 3, hachura: true },
              { t: "circulo", c: [184, 70], r: 3, hachura: true },
              { t: "curva", pts: [[150, 78], [170, 74], [188, 80]], cor: "suave" },
              { t: "rotulo", p: [40, 140], texto: "RONDA: limpar, podar, medir contraste, liberar rota" },
              { t: "linha", de: [30, 150], ate: [280, 150], cor: "destaque" },
            ],
          },
        },
      ],
    },
    {
      id: "gestao-continua",
      titulo: "Gestão: feedback e atualização",
      blocos: [
        { tipo: "texto", texto: "Além da ronda física, o sistema precisa de um canal de feedback (QR na entrada, telefone, e-mail) para o visitante avisar o que não funcionou — quem usa encontra falhas que o gestor nunca veria. E precisa de atualização: toda vez que o parque muda (nova atração, caminho interditado, reforma), o mapa e as placas têm de acompanhar na mesma semana. Mapa desatualizado é pior que mapa nenhum, porque gera confiança e depois trai." },
        { tipo: "diagrama", titulo: "O ciclo de gestao da sinalizacao", codigo: `flowchart TD
  USO["Visitantes usam"] --> FB["Canal de feedback (QR/tel/e-mail)"]
  FB --> AVAL["Gestor avalia falhas e mudancas do parque"]
  AVAL --> ATU["Atualiza mapa e placas"]
  ATU --> RONDA["Ronda de manutencao"]
  RONDA --> USO` },
        {
          tipo: "licao",
          pergunta: "Por que um mapa desatualizado pode ser 'pior que mapa nenhum'?",
          alternativas: [
            "Porque ocupa espaço",
            "Porque a pessoa confia na informação e é levada ao caminho errado ou a um risco",
            "Porque mapas custam caro",
          ],
          correta: 1,
          explicacao: "A sinalização cria confiança. Se ela mente (caminho interditado ainda marcado como rota), direciona a pessoa ao erro — especialmente grave para quem não pode conferir com a visão.",
        },
      ],
    },
    // ===================== CASOS REAIS =====================
    {
      id: "caso-poa",
      titulo: "Caso real: Orla do Guaíba, Porto Alegre",
      blocos: [
        { tipo: "texto", texto: "Em 2021, a Prefeitura de Porto Alegre implantou no Trecho 3 da Orla do Guaíba o primeiro parque da capital com mapas táteis para acessibilidade, combinados com piso podotátil dos dois tipos (direcional e de alerta). O caso mostra o sistema completo na prática: a guia tátil leva a pessoa cega até o mapa tátil na entrada, onde ela 'lê' o parque com as mãos antes de percorrê-lo. É exatamente a sequência deste caderno — piso + mapa + rota — num espaço público brasileiro real." },
        {
          tipo: "fontes",
          titulo: "Fontes — caso Porto Alegre",
          itens: [
            { titulo: "Trecho 3 da Orla é o primeiro parque da Capital com mapas táteis (Prefeitura de Porto Alegre)", url: "https://prefeitura.poa.br/smoi/noticias/trecho-3-da-orla-e-o-primeiro-parque-da-capital-contar-com-mapas-tateis-para", tipo: "site", nota: "Mapas táteis + piso podotátil direcional e de alerta em parque público." },
          ],
        },
      ],
    },
    {
      id: "caso-intl",
      titulo: "Casos reais: tato, som e pisos pelo mundo",
      blocos: [
        { tipo: "texto", texto: "Olhe para fora para calibrar o padrão. No Reino Unido, a RNIB publica estudos e guias sobre como pessoas cegas e com baixa visão navegam a cidade (relatório 'In My Way', 2025), base para muita diretriz de calçada e travessia. No Japão, o piso tátil nasceu — foi inventado por Seiichi Miyake em 1965 e instalado pela primeira vez em 1967, antes de se espalhar pelo mundo. E museus/bioparques brasileiros já combinam audiodescrição e experiência tátil para visitantes cegos, mostrando que o canal sonoro escala bem." },
        {
          tipo: "fontes",
          titulo: "Fontes — casos e referências internacionais",
          itens: [
            { titulo: "In My Way — Navigating pedestrian journeys with sight loss, 2025 (RNIB)", url: "https://media.rnib.org.uk/documents/In_My_Way_-_Navigating_pedestrian_journeys_with_sight_loss_2025_PDF.pdf", tipo: "artigo", nota: "Barreiras reais na navegação de pedestres com perda de visão." },
            { titulo: "Tactile Paving: Improving Accessibility Through Design (CityChangers)", url: "https://citychangers.org/tactile-paving/", tipo: "artigo", nota: "História (Japão, 1967) e boas práticas de piso tátil." },
            { titulo: "Wayfinding guidance for parks (Los Angeles City Parks Needs Assessment)", url: "https://needs.parks.lacity.gov/?p=1917", tipo: "site", nota: "Recomenda elementos táteis, braille, pistas sonoras, alto contraste e altura adequada em parques." },
          ],
        },
      ],
    },
    {
      id: "erros-comuns",
      titulo: "Os erros que repetem (e como fugir deles)",
      blocos: [
        { tipo: "texto", texto: "Seis erros aparecem em quase todo parque: (1) piso tátil bonito mas interrompido por mesa, banco ou lixeira em cima dele; (2) baixo contraste 'elegante' (cinza no cinza) que some ao sol; (3) braille fora de padrão, decorativo, ilegível; (4) mapa 'norte para cima' que obriga a girar na cabeça; (5) placa suspensa baixa, que bate na testa; (6) sistema inaugurado lindo e nunca mantido. Todos têm a mesma raiz: projetar para a maquete, não para o corpo que vai usar." },
        {
          tipo: "licao",
          pergunta: "Um restaurante do parque pôs mesas sobre a faixa de piso tátil direcional. Qual o problema?",
          alternativas: [
            "Nenhum, o piso é decorativo",
            "Interrompe a guia que a pessoa cega segue, podendo causar colisão e perda da rota",
            "Só atrapalha a limpeza",
          ],
          correta: 1,
          explicacao: "O piso tátil é a rota física de quem não enxerga. Obstruí-lo é como murar um corredor: tira a continuidade e vira risco. Manter a rota livre é parte da gestão.",
        },
      ],
    },
    // ===================== RECURSOS =====================
    {
      id: "kit-recursos",
      titulo: "Kit de recursos para levar a campo",
      blocos: [
        { tipo: "texto", texto: "Guarde este bloco: são as fontes primárias e ferramentas que sustentam todo o caderno. Normas (o que fazer), guias ilustrados (como medir) e ferramentas (para conferir contraste e tipografia). Com elas, qualquer afirmação deste caderno pode ser checada — que é a regra da casa: nada se afirma sem lastro." },
        {
          tipo: "fontes",
          titulo: "Normas e guias oficiais",
          itens: [
            { titulo: "Lei nº 13.146/2015 — Lei Brasileira de Inclusão (Planalto)", url: "https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2015/lei/l13146.htm", tipo: "norma", nota: "Base legal da acessibilidade e da comunicação acessível no Brasil." },
            { titulo: "ABNT NBR 16537:2024 — Sinalização tátil no piso (PDF, Prefeitura de Macaé)", url: "https://www.macae.rj.gov.br/midia/uploads/NBR-16537-2024.pdf", tipo: "norma", nota: "Piso tátil de alerta e direcional: critérios e instalação." },
            { titulo: "Guide to the ADA Standards — Chapter 7: Signs (US Access Board)", url: "https://www.access-board.gov/ada/guides/chapter-7-signs/", tipo: "norma", nota: "Medidas de caracteres, braille, contraste e montagem (§703/§216)." },
            { titulo: "CAN-ASC-2.4 Wayfinding and Signage (Accessibility Standards Canada)", url: "https://accessible.canada.ca/creating-accessibility-standards/can-asc-24-wayfinding-and-signage/12-signage", tipo: "norma", nota: "Padrão recente dedicado a orientação e sinalização, inclusive em áreas abertas." },
          ],
        },
        {
          tipo: "fontes",
          titulo: "Ferramentas e tipografia",
          itens: [
            { titulo: "WCAG 2.1 — Contrast (Minimum) 1.4.3 (W3C)", url: "https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html", tipo: "norma", nota: "Limiares de contraste 4.5:1 e 3:1 para texto." },
            { titulo: "Atkinson Hyperlegible Font (Braille Institute)", url: "https://www.brailleinstitute.org/freefont/", tipo: "site", nota: "Fonte gratuita desenhada para baixa visão." },
            { titulo: "ISO 7001 — Public information symbols (ISO)", url: "https://www.iso.org/standard/41081.html", tipo: "norma", nota: "Pictogramas padronizados de informação ao público." },
          ],
        },
      ],
    },
    {
      id: "compilado",
      titulo: "Prancha de síntese",
      blocos: [
        { tipo: "texto", texto: "O caminho inteiro em uma frase: diagnostique o parque a pé, defina a rota acessível, marque os pontos de decisão, e em cada um entregue a informação por três canais — ver (alto contraste, pictograma ISO, letra sem serifa dimensionada pela distância), tocar (piso tátil contínuo, braille grau 2, relevo, mapa tátil heading-up) e ouvir (QR com audiodescrição, beacons, som em travessias). Fabrique com braille conferido, instale no prumo e nivelado, valide com usuários reais antes de abrir, e mantenha para sempre — porque sinalização não mantida vira armadilha. Tudo isto tem norma e caso real por trás: NBR 9050/16537, LBI, ADA §703, ISO 7001, WCAG, e a Orla do Guaíba provando na prática." },
        { tipo: "compilado" },
      ],
    },
  ],
};
