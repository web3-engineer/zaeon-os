import type { CadernoEstudo } from "../cadernosEstudo";

/**
 * Caderno de campo: como o coração e os vasos mantêm a circulação.
 * Fisiologia cardiovascular acionável — anatomia, ciclo cardíaco, eletricidade (ECG),
 * hemodinâmica, aferição de pressão, regulação, exercício e casos reais.
 * Todo número e técnica tem lastro em fonte real (OpenStax, AHA, SBC, WHO, NHLBI).
 */
export const caderno: CadernoEstudo = {
  id: "cardiovascular",
  titulo: "Como coração e vasos mantêm a circulação",
  resumo:
    "Um caderno de campo de fisiologia cardiovascular: ler o coração e os vasos, medir pressão e pulso com técnica, calcular débito e resistência, e montar um diário e uma triagem comunitária com apoio de profissionais.",
  paginas: [
    // ───────────────────────── CAPÍTULO 1 — CONTEXTO ─────────────────────────
    {
      id: "abertura",
      titulo: "Por que a circulação é um problema de engenharia",
      blocos: [
        { tipo: "texto", texto: "O corpo tem cerca de 100 mil km de vasos e aproximadamente 5 litros de sangue. Nenhuma célula vive longe de um capilar: o oxigênio do pulmão, a glicose do intestino e o calor da pele só chegam porque uma bomba muscular pressuriza esse circuito o tempo todo. Este caderno trata o coração e os vasos como um sistema de bombeamento e distribuição que você pode ler, medir e acompanhar." },
        { tipo: "texto", texto: "As doenças cardiovasculares são a principal causa de morte no mundo: a Organização Mundial da Saúde estima cerca de 17,9 milhões de óbitos por ano, a maioria por infarto e AVC, e boa parte ligada à pressão arterial não controlada. Entender a mecânica é o primeiro passo para medir e cuidar." },
        { tipo: "fontes", titulo: "Ponto de partida", itens: [
          { titulo: "Cardiovascular diseases (CVDs) — Fact sheet (WHO)", url: "https://www.who.int/news-room/fact-sheets/detail/cardiovascular-diseases-(cvds)", tipo: "site", nota: "Carga global: ~17,9 milhões de mortes/ano." },
          { titulo: "How the Heart Works (NHLBI, NIH)", url: "https://www.nhlbi.nih.gov/health/heart/anatomy", tipo: "site", nota: "Visão geral oficial da anatomia e função." },
        ] },
      ],
    },
    {
      id: "circuito-duplo",
      titulo: "Leia o circuito: duas bombas, dois caminhos",
      blocos: [
        { tipo: "texto", texto: "O coração é uma bomba dupla em série. O lado direito recebe sangue venoso e o manda para o pulmão (circulação pulmonar, baixa pressão). O lado esquerdo recebe o sangue oxigenado e o empurra para o corpo (circulação sistêmica, alta pressão). Os dois lados ejetam o mesmo volume por batimento — se não o fizessem, o sangue se acumularia de um lado." },
        { tipo: "prancha", titulo: "Circuito pulmonar e sistêmico", desenho: {
          legenda: "Esquema conceitual. As setas seguem o sangue: azul (pobre em O2) ao pulmão, destaque (rico em O2) ao corpo.",
          primitivas: [
            { t: "retangulo", p: [120, 70], w: 64, h: 70, cor: "tinta" },
            { t: "linha", de: [152, 70], ate: [152, 140] },
            { t: "rotulo", p: [128, 64], texto: "Coração" },
            { t: "rotulo", p: [126, 158], texto: "D      E" },
            { t: "circulo", c: [60, 40], r: 24 },
            { t: "rotulo", p: [44, 38], texto: "Pulmão" },
            { t: "seta", de: [120, 90], ate: [70, 58], cor: "suave" },
            { t: "seta", de: [78, 56], ate: [128, 86], cor: "destaque" },
            { t: "circulo", c: [244, 105], r: 26 },
            { t: "rotulo", p: [232, 103], texto: "Corpo" },
            { t: "seta", de: [184, 112], ate: [220, 110], cor: "destaque" },
            { t: "seta", de: [220, 124], ate: [184, 126], cor: "suave" },
            { t: "rotulo", p: [16, 180], texto: "Pressão baixa" },
            { t: "rotulo", p: [214, 180], texto: "Pressão alta" },
          ],
        } },
        { tipo: "video", titulo: "Cardiovascular System Overview (Alila Medical Media)", youtube: "28CYhgjrBLA" },
      ],
    },
    {
      id: "numeros-ancora",
      titulo: "Os números que ancoram tudo",
      blocos: [
        { tipo: "texto", texto: "Decore uma faixa de referência em repouso de um adulto: frequência cardíaca 60–100 batimentos por minuto, volume sistólico por volta de 70 mL, débito cardíaco cerca de 5 L/min, e pressão arterial de referência abaixo de 120/80 mmHg. Esses valores são âncoras — todo cálculo deste caderno parte deles e você compara o caso real com a âncora." },
        { tipo: "texto", texto: "Um batimento em repouso a ~75 bpm dura cerca de 0,8 segundo: aproximadamente 0,3 s de contração (sístole) e 0,5 s de relaxamento e enchimento (diástole). Quanto mais rápido o coração bate, mais a diástole encolhe — e é na diástole que o músculo descansa e se enche." },
        { tipo: "licao", pergunta: "Em repouso, qual é a ordem de grandeza do débito cardíaco de um adulto saudável?", alternativas: ["Cerca de 0,5 L/min", "Cerca de 5 L/min", "Cerca de 50 L/min"], correta: 1, explicacao: "Débito cardíaco em repouso gira em torno de 5 L/min (≈70 mL por batimento × ~70 bpm). Pode subir várias vezes no exercício, mas a âncora de repouso é ~5 L/min." },
      ],
    },
    {
      id: "glossario",
      titulo: "Glossário do agente de campo",
      blocos: [
        { tipo: "texto", texto: "Antes de medir, fixe o vocabulário. Sístole: fase de contração/ejeção. Diástole: fase de relaxamento/enchimento. Pré-carga: quanto o ventrículo se enche antes de contrair. Pós-carga: a resistência contra a qual ele ejeta. Contratilidade: a força intrínseca do músculo. Débito cardíaco (DC): volume bombeado por minuto. Resistência vascular periférica (RVP): o atrito do sangue nos vasos." },
        { tipo: "diagrama", titulo: "Como os termos se encaixam", codigo: `flowchart TD
  PRE["Pré-carga (enchimento)"] --> VS["Volume sistólico"]
  CONTR["Contratilidade"] --> VS
  POS["Pós-carga (resistência)"] --> VS
  VS --> DC["Débito = VS x FC"]
  FC["Frequência cardíaca"] --> DC
  DC --> PA["Pressão = DC x RVP"]
  RVP["Resistência periférica"] --> PA` },
        { tipo: "tarefas", itens: [
          { id: "flashcards", titulo: "Monte 7 flashcards de termos", entrega: "Escreva um cartão por termo (sístole, diástole, pré-carga, pós-carga, contratilidade, DC, RVP) com a definição em uma frase e um exemplo do dia a dia." },
          { id: "ancoras", titulo: "Cole a tabela de âncoras", entrega: "Registre FC 60–100 bpm, VS ~70 mL, DC ~5 L/min e PA <120/80 mmHg numa página que você consulta ao medir." },
        ] },
      ],
    },
    // ───────────────── CAPÍTULO 2 — LEITURA DO TEMA: ANATOMIA ─────────────────
    {
      id: "anatomia-cameras",
      titulo: "As quatro câmaras e o caminho do sangue",
      blocos: [
        { tipo: "texto", texto: "O coração tem quatro câmaras: dois átrios (recebem) e dois ventrículos (ejetam). O sangue venoso chega pelas veias cavas ao átrio direito, passa ao ventrículo direito e vai ao pulmão pela artéria pulmonar. Volta oxigenado pelas veias pulmonares ao átrio esquerdo, desce ao ventrículo esquerdo e sai pela aorta. O ventrículo esquerdo tem a parede mais espessa porque enfrenta a pressão sistêmica." },
        { tipo: "prancha", titulo: "As quatro câmaras", desenho: {
          legenda: "Corte frontal esquemático. AD/VD à direita anatômica (sua esquerda ao olhar); AE/VE do outro lado.",
          primitivas: [
            { t: "retangulo", p: [60, 30], w: 90, h: 50 },
            { t: "retangulo", p: [153, 30], w: 90, h: 50 },
            { t: "retangulo", p: [60, 83], w: 90, h: 86 },
            { t: "retangulo", p: [153, 83], w: 90, h: 86, hachura: true },
            { t: "linha", de: [151, 30], ate: [151, 169], cor: "tinta" },
            { t: "rotulo", p: [92, 52], texto: "AD" },
            { t: "rotulo", p: [188, 52], texto: "AE" },
            { t: "rotulo", p: [92, 122], texto: "VD" },
            { t: "rotulo", p: [182, 122], texto: "VE (grosso)" },
            { t: "seta", de: [40, 55], ate: [60, 55], cor: "suave" },
            { t: "rotulo", p: [6, 52], texto: "Cavas" },
            { t: "seta", de: [105, 30], ate: [105, 12], cor: "suave" },
            { t: "rotulo", p: [86, 10], texto: "A. pulmonar" },
            { t: "seta", de: [198, 30], ate: [198, 12], cor: "destaque" },
            { t: "rotulo", p: [226, 12], texto: "Aorta" },
            { t: "seta", de: [243, 55], ate: [262, 55], cor: "destaque" },
            { t: "rotulo", p: [250, 50], texto: "V. pulm." },
          ],
        } },
        { tipo: "video", titulo: "Meet the heart! (Khan Academy)", youtube: "Vi1JK6IYVt8" },
      ],
    },
    {
      id: "valvulas",
      titulo: "As válvulas: portas de mão única",
      blocos: [
        { tipo: "texto", texto: "Quatro válvulas garantem fluxo em sentido único. As atrioventriculares separam átrio e ventrículo: tricúspide à direita, mitral à esquerda. As semilunares guardam as saídas: pulmonar e aórtica. Elas abrem e fecham de forma passiva, por diferença de pressão — quando o ventrículo gera mais pressão que o átrio, a válvula AV fecha; quando supera a artéria, a semilunar abre." },
        { tipo: "prancha", titulo: "As quatro válvulas em planta", desenho: {
          legenda: "Vista superior esquemática (a base do coração). AV à frente, semilunares atrás.",
          primitivas: [
            { t: "circulo", c: [100, 120], r: 30 },
            { t: "rotulo", p: [78, 122], texto: "Tricúspide" },
            { t: "circulo", c: [205, 120], r: 30, hachura: true },
            { t: "rotulo", p: [190, 122], texto: "Mitral" },
            { t: "circulo", c: [120, 60], r: 20 },
            { t: "rotulo", p: [98, 40], texto: "Pulmonar" },
            { t: "circulo", c: [190, 60], r: 20, hachura: true },
            { t: "rotulo", p: [176, 40], texto: "Aórtica" },
            { t: "rotulo", p: [120, 180], texto: "DIR" },
            { t: "rotulo", p: [190, 180], texto: "ESQ" },
          ],
        } },
        { tipo: "licao", pergunta: "O que faz uma válvula cardíaca abrir ou fechar?", alternativas: ["Um músculo que puxa a válvula no momento certo", "A diferença de pressão entre as câmaras", "Um impulso elétrico direto na válvula"], correta: 1, explicacao: "As válvulas são passivas: abrem e fecham conforme a pressão de um lado supera a do outro. Não há músculo abrindo a válvula nem nervo mandando ela fechar." },
      ],
    },
    {
      id: "vasos",
      titulo: "Artéria, veia e capilar: três tubos, três funções",
      blocos: [
        { tipo: "texto", texto: "As artérias levam sangue para longe do coração sob alta pressão; têm parede elástica e muscular que amortece a pulsação. As arteríolas são as torneiras: músculo liso ajusta o calibre e controla a resistência e a distribuição. Os capilares são tubos de uma célula de espessura onde ocorre a troca. As veias retornam o sangue, guardam cerca de dois terços do volume e usam válvulas e a musculatura esquelética para vencer a gravidade." },
        { tipo: "prancha", titulo: "Parede dos vasos em corte", desenho: {
          legenda: "Compare a espessura da parede e o calibre. A arteríola é a válvula de ajuste do sistema.",
          primitivas: [
            { t: "circulo", c: [55, 70], r: 34, cor: "tinta" },
            { t: "circulo", c: [55, 70], r: 16 },
            { t: "rotulo", p: [34, 118], texto: "Artéria" },
            { t: "circulo", c: [152, 70], r: 20 },
            { t: "circulo", c: [152, 70], r: 12 },
            { t: "rotulo", p: [128, 118], texto: "Arteríola" },
            { t: "circulo", c: [245, 70], r: 30 },
            { t: "circulo", c: [245, 70], r: 26 },
            { t: "rotulo", p: [230, 118], texto: "Veia" },
            { t: "linha", de: [16, 150], ate: [287, 150], cor: "suave" },
            { t: "rotulo", p: [60, 160], texto: "Capilar: 1 célula de parede" },
            { t: "circulo", c: [40, 155], r: 4, hachura: true },
          ],
        } },
        { tipo: "fontes", titulo: "Vasos e pressão", itens: [
          { titulo: "OpenStax Anatomy & Physiology 2e — 20.2 Blood Flow, Blood Pressure, and Resistance", url: "https://openstax.org/books/anatomy-and-physiology-2e/pages/20-2-blood-flow-blood-pressure-and-resistance", tipo: "livro", nota: "Livre e aberto; base de resistência e fluxo." },
          { titulo: "BHF — How your heart works", url: "https://www.bhf.org.uk/informationsupport/how-a-healthy-heart-works", tipo: "site", nota: "Explicação ilustrada do coração e circulação." },
        ] },
      ],
    },
    {
      id: "coronarias",
      titulo: "O coração também precisa ser irrigado",
      blocos: [
        { tipo: "texto", texto: "O miocárdio não se nutre do sangue que passa pelas câmaras: ele tem sua própria rede, as artérias coronárias, que saem da raiz da aorta. Detalhe importante: o ventrículo esquerdo recebe a maior parte do seu fluxo coronário durante a diástole, porque na sístole o próprio músculo comprime os vasos. Por isso uma frequência muito alta, que encurta a diástole, pode prejudicar a oferta de oxigênio ao coração." },
        { tipo: "prancha", titulo: "Coronárias na superfície", desenho: {
          legenda: "Esquema de superfície. A descendente anterior desce pelo sulco entre os ventrículos.",
          primitivas: [
            { t: "curva", pts: [[70, 20], [60, 80], [90, 140], [150, 175]] },
            { t: "curva", pts: [[150, 30], [160, 60], [150, 110], [120, 150]] },
            { t: "curva", pts: [[150, 36], [210, 50], [245, 90], [240, 140]] },
            { t: "rotulo", p: [150, 20], texto: "Raiz da aorta" },
            { t: "rotulo", p: [40, 110], texto: "Coronária D" },
            { t: "rotulo", p: [92, 132], texto: "Descendente ant." },
            { t: "rotulo", p: [230, 75], texto: "Circunflexa" },
            { t: "circulo", c: [150, 30], r: 6, hachura: true },
          ],
        } },
        { tipo: "licao", pergunta: "Por que o ventrículo esquerdo é irrigado principalmente na diástole?", alternativas: ["Porque na diástole a pressão na aorta é zero", "Porque na sístole o músculo comprime suas próprias coronárias", "Porque as coronárias só abrem à noite"], correta: 1, explicacao: "Na sístole o miocárdio do VE se contrai com força e aperta os vasos intramurais. O fluxo coronário esquerdo acontece sobretudo quando o músculo relaxa, na diástole." },
      ],
    },
    {
      id: "miocardio",
      titulo: "O músculo que não cansa",
      blocos: [
        { tipo: "texto", texto: "O músculo cardíaco é estriado como o esquelético, mas as células se conectam por discos intercalares com junções comunicantes. Isso faz o coração se comportar como um sincício: quando uma região despolariza, a onda passa de célula para célula e o conjunto contrai junto. Diferente do esquelético, o miocárdio não entra em tétano — tem um período refratário longo que protege o ritmo." },
        { tipo: "diagrama", titulo: "Do sinal à contração (acoplamento)", codigo: `flowchart LR
  A["Potencial de ação chega"] --> B["Entra Ca2+ pela membrana"]
  B --> C["Ca2+ libera mais Ca2+ do retículo"]
  C --> D["Ca2+ liga na troponina"]
  D --> E["Actina e miosina deslizam"]
  E --> F["Contração (sístole)"]
  F --> G["Ca2+ recaptado -> relaxa (diástole)"]` },
        { tipo: "tarefas", itens: [
          { id: "sincicio", titulo: "Explique o sincício com uma analogia", entrega: "Escreva um parágrafo comparando a propagação célula a célula do coração com algo cotidiano (uma fila de dominós, a plateia fazendo a ola). Diga por que isso garante um batimento unificado." },
        ] },
      ],
    },
    {
      id: "pulsos",
      titulo: "Campo: onde palpar o pulso no corpo",
      blocos: [
        { tipo: "texto", texto: "Onde uma artéria passa perto da pele e sobre um osso, você sente o pulso — a onda de pressão de cada ejeção. Os pontos úteis: radial (punho), carótida (pescoço, com cuidado e nunca os dois lados juntos), braquial (dobra do cotovelo, usado na aferição de pressão), femoral, poplítea, tibial posterior e pediosa. Comparar pulsos dos dois lados e de membros diferentes já é um exame." },
        { tipo: "prancha", titulo: "Mapa de pulsos", desenho: {
          legenda: "Silhueta esquemática. Marque e nomeie cada ponto antes de ir a campo.",
          primitivas: [
            { t: "circulo", c: [150, 24], r: 14 },
            { t: "linha", de: [150, 38], ate: [150, 120] },
            { t: "linha", de: [150, 55], ate: [110, 95] },
            { t: "linha", de: [150, 55], ate: [190, 95] },
            { t: "linha", de: [150, 120], ate: [128, 185] },
            { t: "linha", de: [150, 120], ate: [172, 185] },
            { t: "circulo", c: [140, 42], r: 3, hachura: true },
            { t: "rotulo", p: [96, 40], texto: "Carótida" },
            { t: "circulo", c: [110, 95], r: 3, hachura: true },
            { t: "rotulo", p: [66, 96], texto: "Radial" },
            { t: "circulo", c: [178, 72], r: 3, hachura: true },
            { t: "rotulo", p: [186, 70], texto: "Braquial" },
            { t: "circulo", c: [136, 130], r: 3, hachura: true },
            { t: "rotulo", p: [150, 132], texto: "Femoral" },
            { t: "circulo", c: [128, 182], r: 3, hachura: true },
            { t: "rotulo", p: [92, 186], texto: "Pediosa" },
          ],
        } },
        { tipo: "tarefas", itens: [
          { id: "achar-pulso", titulo: "Localize e conte 4 pulsos", entrega: "Ache radial, braquial, carótida (um lado só) e pediosa. Conte os batimentos em 30 s e multiplique por 2. Anote a FC e se o ritmo é regular ou irregular." },
          { id: "simetria", titulo: "Teste a simetria", entrega: "Compare o pulso radial direito e esquerdo ao mesmo tempo. Registre se têm a mesma força e chegam juntos." },
        ] },
      ],
    },
    // ─────────────── CAPÍTULO 3 — MÉTODO: CICLO E ELETRICIDADE ───────────────
    {
      id: "sistole-diastole",
      titulo: "Sístole e diástole: a batida em duas metades",
      blocos: [
        { tipo: "texto", texto: "Cada batimento é um ciclo. Na diástole o ventrículo relaxa e se enche: primeiro de forma passiva, depois a contração do átrio dá o empurrão final (a 'chute atrial', ~20% do enchimento). Na sístole o ventrículo contrai: há uma fase de contração isovolumétrica (todas as válvulas fechadas, pressão subindo sem ejetar), depois a válvula de saída abre e o sangue é ejetado. Relaxa de novo e o ciclo recomeça." },
        { tipo: "prancha", titulo: "Pressão e volume ao longo do ciclo", desenho: {
          legenda: "Wiggers simplificado: curva de pressão do VE (destaque) e volume do VE (suave). Tempo no eixo horizontal.",
          primitivas: [
            { t: "linha", de: [30, 20], ate: [30, 120], cor: "tinta" },
            { t: "linha", de: [30, 120], ate: [292, 120], cor: "tinta" },
            { t: "curva", pts: [[30, 112], [70, 110], [95, 40], [150, 36], [175, 108], [240, 112], [292, 112]], cor: "destaque" },
            { t: "curva", pts: [[30, 150], [70, 140], [95, 142], [150, 180], [175, 150], [240, 138], [292, 140]], cor: "suave" },
            { t: "rotulo", p: [2, 60], texto: "P" },
            { t: "rotulo", p: [2, 160], texto: "V" },
            { t: "rotulo", p: [96, 28], texto: "Sístole" },
            { t: "rotulo", p: [210, 100], texto: "Diástole" },
            { t: "rotulo", p: [250, 132], texto: "Enchimento" },
          ],
        } },
        { tipo: "video", titulo: "The Cardiac Cycle, Animation (Alila Medical Media)", youtube: "IS9TD9fHFv0" },
      ],
    },
    {
      id: "wiggers",
      titulo: "O diagrama de Wiggers é o seu mapa-mestre",
      blocos: [
        { tipo: "texto", texto: "O diagrama de Wiggers alinha, no mesmo tempo, a pressão da aorta, do ventrículo e do átrio, o volume ventricular, o ECG e as bulhas. Dele saem as definições que você vai calcular: volume diastólico final (EDV, ~120–130 mL), volume sistólico final (ESV, ~50–60 mL), volume sistólico (VS = EDV − ESV, ~70 mL) e fração de ejeção (FE = VS/EDV, ~55–70%)." },
        { tipo: "prancha", titulo: "Pontos-chave do Wiggers", desenho: {
          legenda: "As válvulas abrem e fecham quando as curvas de pressão se cruzam. Marque esses cruzamentos.",
          primitivas: [
            { t: "linha", de: [28, 18], ate: [28, 130], cor: "tinta" },
            { t: "linha", de: [28, 130], ate: [290, 130], cor: "tinta" },
            { t: "curva", pts: [[28, 70], [80, 68], [100, 44], [180, 46], [200, 70], [290, 72]], cor: "destaque" },
            { t: "curva", pts: [[28, 122], [95, 120], [102, 44], [178, 48], [186, 120], [290, 122]], cor: "tinta" },
            { t: "seta", de: [102, 100], ate: [102, 86], cor: "suave" },
            { t: "rotulo", p: [88, 108], texto: "Abre saída" },
            { t: "seta", de: [184, 86], ate: [184, 100], cor: "suave" },
            { t: "rotulo", p: [174, 108], texto: "Fecha saída" },
            { t: "rotulo", p: [40, 30], texto: "Aorta" },
            { t: "rotulo", p: [120, 30], texto: "Ventrículo" },
          ],
        } },
        { tipo: "fontes", titulo: "O ciclo em detalhe", itens: [
          { titulo: "OpenStax Anatomy & Physiology 2e — 19.3 Cardiac Cycle", url: "https://openstax.org/books/anatomy-and-physiology-2e/pages/19-3-cardiac-cycle", tipo: "livro", nota: "Fases, pressões e bulhas do ciclo." },
        ] },
      ],
    },
    {
      id: "bulhas",
      titulo: "As bulhas: o que o estetoscópio ouve",
      blocos: [
        { tipo: "texto", texto: "O som do coração vem do fechamento das válvulas. A primeira bulha (B1, o 'tum') é o fechamento das válvulas atrioventriculares no início da sístole. A segunda (B2, o 'tá') é o fechamento das semilunares no fim da sístole. Entre B1 e B2 está a sístole; de B2 até a próxima B1, a diástole. Sopros são turbulências extras — nem todo sopro é doença, mas todo sopro novo merece avaliação." },
        { tipo: "diagrama", titulo: "Quando cada bulha acontece", codigo: `flowchart LR
  D["Diástole: ventrículo enche"] --> B1["B1 fecham mitral e tricúspide"]
  B1 --> S["Sístole: ventrículo ejeta"]
  S --> B2["B2 fecham aórtica e pulmonar"]
  B2 --> D` },
        { tipo: "licao", pergunta: "O intervalo entre a primeira bulha (B1) e a segunda (B2) corresponde a quê?", alternativas: ["À diástole (enchimento)", "À sístole (ejeção)", "Ao repouso entre batimentos"], correta: 1, explicacao: "B1 marca o início da sístole (fecham as AV) e B2 o fim (fecham as semilunares). O que está entre elas é a sístole ventricular; a diástole vem depois de B2." },
      ],
    },
    {
      id: "conducao",
      titulo: "O sistema elétrico que marca o compasso",
      blocos: [
        { tipo: "texto", texto: "O ritmo nasce no nó sinoatrial (SA), o marca-passo natural, no átrio direito, disparando em repouso 60–100 vezes por minuto. A onda despolariza os átrios, chega ao nó atrioventricular (AV), que segura o sinal por ~0,1 s para o átrio terminar de encher o ventrículo. Depois desce rápido pelo feixe de His, ramos direito e esquerdo, e pelas fibras de Purkinje, que ativam os ventrículos de baixo para cima." },
        { tipo: "prancha", titulo: "Caminho do impulso", desenho: {
          legenda: "A ordem importa: SA, AV (atraso), His, ramos, Purkinje. O atraso no AV protege o enchimento.",
          primitivas: [
            { t: "retangulo", p: [60, 24], w: 180, h: 150, cor: "tinta" },
            { t: "circulo", c: [95, 55], r: 9, hachura: true },
            { t: "rotulo", p: [30, 50], texto: "Nó SA" },
            { t: "circulo", c: [150, 92], r: 8, hachura: true },
            { t: "rotulo", p: [158, 86], texto: "Nó AV" },
            { t: "linha", de: [150, 100], ate: [150, 130] },
            { t: "linha", de: [150, 130], ate: [110, 165] },
            { t: "linha", de: [150, 130], ate: [190, 165] },
            { t: "rotulo", p: [128, 150], texto: "His" },
            { t: "rotulo", p: [76, 168], texto: "Purkinje" },
            { t: "seta", de: [95, 60], ate: [142, 88], cor: "destaque" },
          ],
        } },
        { tipo: "fontes", titulo: "Eletricidade do coração", itens: [
          { titulo: "OpenStax Anatomy & Physiology 2e — 19.2 Cardiac Muscle and Electrical Activity", url: "https://openstax.org/books/anatomy-and-physiology-2e/pages/19-2-cardiac-muscle-and-electrical-activity", tipo: "livro", nota: "Condução, potencial de ação e ECG." },
        ] },
      ],
    },
    {
      id: "potencial-acao",
      titulo: "Por que o batimento não vira tétano",
      blocos: [
        { tipo: "texto", texto: "A célula ventricular tem um potencial de ação longo, com um platô sustentado pela entrada de cálcio. Esse platô mantém a célula refratária durante quase toda a contração: enquanto o músculo está encurtado, ele não aceita um novo estímulo. É o que impede o coração de travar em contração contínua (tétano) — ao contrário do músculo esquelético, que pode ser somado. Esse período refratário é a trava de segurança do ritmo." },
        { tipo: "prancha", titulo: "Potencial de ação ventricular", desenho: {
          legenda: "Fase 0 subida rápida (Na+), platô (Ca2+), fase 3 repolarização (K+). A linha suave marca o repouso ~ -90 mV.",
          primitivas: [
            { t: "linha", de: [28, 20], ate: [28, 150], cor: "tinta" },
            { t: "linha", de: [28, 150], ate: [290, 150], cor: "tinta" },
            { t: "linha", de: [28, 135], ate: [290, 135], cor: "suave" },
            { t: "linha", de: [60, 135], ate: [66, 30] },
            { t: "curva", pts: [[66, 30], [90, 42], [170, 46], [200, 60]] },
            { t: "curva", pts: [[200, 60], [220, 120], [250, 135]] },
            { t: "rotulo", p: [52, 60], texto: "0" },
            { t: "rotulo", p: [120, 36], texto: "Platô (Ca2+)" },
            { t: "rotulo", p: [214, 95], texto: "3 (K+)" },
            { t: "rotulo", p: [6, 128], texto: "-90mV" },
          ],
        } },
        { tipo: "licao", pergunta: "O longo período refratário do miocárdio serve para quê?", alternativas: ["Deixar o coração bater mais rápido", "Impedir contração contínua (tétano) e proteger o ritmo", "Aumentar a força de cada batimento"], correta: 1, explicacao: "O platô de cálcio prolonga a refratariedade: enquanto a célula está contraída, não aceita novo estímulo. Isso evita o tétano e mantém o ciclo contrai-relaxa que enche e esvazia o coração." },
      ],
    },
    {
      id: "ecg-ondas",
      titulo: "Ler o ECG: P, QRS e T",
      blocos: [
        { tipo: "texto", texto: "O eletrocardiograma registra, da superfície da pele, a soma da atividade elétrica do coração. A onda P é a despolarização atrial. O complexo QRS é a despolarização ventricular (grande, porque o músculo é grande; esconde a repolarização atrial). A onda T é a repolarização ventricular. Intervalos de referência: PR 0,12–0,20 s (120–200 ms) e QRS abaixo de 0,12 s. Em papel padrão, 1 quadrado pequeno = 0,04 s." },
        { tipo: "prancha", titulo: "Traçado de uma batida", desenho: {
          legenda: "P (átrios), QRS (ventrículos), T (repolarização). Meça PR do início do P ao início do QRS.",
          primitivas: [
            { t: "linha", de: [20, 100], ate: [60, 100], cor: "tinta" },
            { t: "curva", pts: [[60, 100], [72, 82], [84, 100]], cor: "tinta" },
            { t: "linha", de: [84, 100], ate: [110, 100], cor: "tinta" },
            { t: "linha", de: [110, 100], ate: [116, 112], cor: "tinta" },
            { t: "linha", de: [116, 112], ate: [124, 40], cor: "tinta" },
            { t: "linha", de: [124, 40], ate: [132, 120], cor: "tinta" },
            { t: "linha", de: [132, 120], ate: [140, 100], cor: "tinta" },
            { t: "linha", de: [140, 100], ate: [176, 100], cor: "tinta" },
            { t: "curva", pts: [[176, 100], [196, 78], [216, 100]], cor: "tinta" },
            { t: "linha", de: [216, 100], ate: [288, 100], cor: "tinta" },
            { t: "rotulo", p: [64, 74], texto: "P" },
            { t: "rotulo", p: [120, 30], texto: "QRS" },
            { t: "rotulo", p: [190, 70], texto: "T" },
            { t: "rotulo", p: [78, 118], texto: "PR" },
          ],
        } },
        { tipo: "video", titulo: "Cardiac Conduction System and Understanding ECG (Alila Medical Media)", youtube: "RYZ4daFwMa8" },
      ],
    },
    {
      id: "ler-ritmo",
      titulo: "Campo: um método para olhar qualquer ritmo",
      blocos: [
        { tipo: "texto", texto: "Mesmo sem ser cardiologista, você pode treinar um checklist de leitura: 1) Há onda P antes de cada QRS? 2) O ritmo é regular? 3) Qual a frequência (300 dividido pelo número de quadrados grandes entre dois QRS)? 4) O PR está entre 0,12 e 0,20 s? 5) O QRS é estreito (<0,12 s)? Esse roteiro organiza a observação — mas o laudo é ato de profissional." },
        { tipo: "diagrama", titulo: "Checklist de ritmo", codigo: `flowchart TD
  A["Tem onda P antes de cada QRS?"] --> B{"Ritmo regular?"}
  B -->|Sim| C["Calcule a frequência (300 / quadrados grandes)"]
  B -->|Nao| D["Registre a irregularidade"]
  C --> E["Confira PR (0,12-0,20 s) e QRS (<0,12 s)"]
  D --> E
  E --> F["Anote o achado e leve ao profissional"]` },
        { tipo: "mobilizacao", papel: "Médico(a) cardiologista ou clínico habilitado", porque: "Interpretar e laudar um ECG é um ato médico. Um traçado alterado (arritmia, bloqueio, sinais de isquemia) precisa de diagnóstico e conduta por profissional habilitado — o checklist de campo organiza a observação, não substitui o laudo.", entregaEsperada: "Laudo do ECG com ritmo, frequência, intervalos e conclusão, e orientação sobre próximos passos.", gerenciadoPor: "zaeon" },
        { tipo: "tarefas", itens: [
          { id: "treino-ritmo", titulo: "Aplique o checklist em 3 traçados", entrega: "Use 3 ECGs de bancos educacionais abertos, rode o checklist e anote frequência, PR e QRS. Marque o que você não soube avaliar para perguntar ao profissional." },
        ] },
      ],
    },
    // ─────────────── CAPÍTULO 4 — CÁLCULO: HEMODINÂMICA ───────────────
    {
      id: "debito-cardiaco",
      titulo: "A equação central: DC = VS × FC",
      blocos: [
        { tipo: "texto", texto: "O débito cardíaco é o volume de sangue que o coração bombeia por minuto, e é o produto do volume sistólico (quanto sai por batimento) pela frequência cardíaca (quantos batimentos por minuto). Exemplo da âncora: 70 mL × 70 bpm = 4.900 mL/min, cerca de 5 L/min. No exercício intenso, o DC pode subir para 20 L/min ou mais, somando mais frequência e mais volume por batida." },
        { tipo: "diagrama", titulo: "O que move o débito", codigo: `flowchart TD
  VS["Volume sistólico (mL/batida)"] --> DC["Débito cardíaco (L/min)"]
  FC["Frequência cardíaca (bpm)"] --> DC
  DC --> OBS["Ajuste o índice cardíaco dividindo pela superfície corporal"]` },
        { tipo: "licao", pergunta: "Se o volume sistólico é 80 mL e a frequência é 60 bpm, qual o débito cardíaco?", alternativas: ["4,8 L/min", "48 L/min", "0,48 L/min"], correta: 0, explicacao: "DC = VS × FC = 80 mL × 60 = 4.800 mL/min = 4,8 L/min. É a conta central da hemodinâmica — pratique até virar automática." },
      ],
    },
    {
      id: "pre-pos-carga",
      titulo: "Pré-carga, pós-carga e contratilidade",
      blocos: [
        { tipo: "texto", texto: "Três alavancas mudam o volume sistólico. Pré-carga: quanto o ventrículo se enche antes de contrair (depende do retorno venoso); mais enchimento tende a mais ejeção. Pós-carga: a pressão que o ventrículo precisa vencer para abrir a válvula e ejetar (pressão arterial, resistência); mais pós-carga dificulta a ejeção. Contratilidade: a força intrínseca do músculo, aumentada por adrenalina e pelo sistema simpático." },
        { tipo: "prancha", titulo: "As três alavancas do volume sistólico", desenho: {
          legenda: "Pré-carga empurra para cima; pós-carga empurra para baixo; contratilidade é o ganho do músculo.",
          primitivas: [
            { t: "retangulo", p: [110, 70], w: 84, h: 60, cor: "tinta" },
            { t: "rotulo", p: [118, 96], texto: "Volume sist." },
            { t: "seta", de: [60, 150], ate: [120, 120], cor: "destaque" },
            { t: "rotulo", p: [20, 160], texto: "Pré-carga +" },
            { t: "seta", de: [240, 40], ate: [186, 72], cor: "suave" },
            { t: "rotulo", p: [214, 28], texto: "Pós-carga -" },
            { t: "seta", de: [152, 40], ate: [152, 68], cor: "destaque" },
            { t: "rotulo", p: [110, 30], texto: "Contratilidade +" },
          ],
        } },
        { tipo: "tarefas", itens: [
          { id: "alavancas", titulo: "Classifique 6 situações", entrega: "Para cada item (hemorragia, soro na veia, susto com adrenalina, hipertensão não tratada, levantar rápido, atleta em repouso) diga qual alavanca muda e para onde vai o volume sistólico." },
        ] },
      ],
    },
    {
      id: "frank-starling",
      titulo: "Frank-Starling: o coração ejeta o que recebe",
      blocos: [
        { tipo: "texto", texto: "A lei de Frank-Starling diz que, dentro de um limite, quanto mais o ventrículo se enche (maior pré-carga, mais estiramento das fibras), com mais força ele contrai e maior o volume ejetado. É o mecanismo que iguala automaticamente o débito dos dois lados do coração e ajusta a ejeção ao retorno venoso, batimento a batimento, sem precisar de nenhum nervo. Acima do limite, o estiramento excessivo passa a reduzir a força." },
        { tipo: "prancha", titulo: "Curva de Frank-Starling", desenho: {
          legenda: "Eixo horizontal: enchimento (pré-carga). Vertical: volume/força ejetados. Sobe e depois satura.",
          primitivas: [
            { t: "linha", de: [30, 20], ate: [30, 150], cor: "tinta" },
            { t: "linha", de: [30, 150], ate: [290, 150], cor: "tinta" },
            { t: "curva", pts: [[30, 148], [80, 120], [140, 70], [210, 46], [285, 42]], cor: "destaque" },
            { t: "rotulo", p: [2, 70], texto: "VS" },
            { t: "rotulo", p: [200, 165], texto: "Pré-carga (enchimento)" },
            { t: "seta", de: [120, 110], ate: [160, 72], cor: "suave" },
            { t: "rotulo", p: [96, 110], texto: "mais enche, mais ejeta" },
          ],
        } },
        { tipo: "fontes", titulo: "Fisiologia da bomba", itens: [
          { titulo: "OpenStax Anatomy & Physiology 2e — 19.4 Cardiac Physiology", url: "https://openstax.org/books/anatomy-and-physiology-2e/pages/19-4-cardiac-physiology", tipo: "livro", nota: "Débito, Frank-Starling e regulação." },
        ] },
      ],
    },
    {
      id: "pressao-arterial",
      titulo: "De onde vem a pressão arterial",
      blocos: [
        { tipo: "texto", texto: "A pressão arterial média (PAM) é, em boa aproximação, o produto do débito cardíaco pela resistência vascular periférica (PAM ≈ DC × RVP). Ou seja: a pressão sobe se o coração bombeia mais ou se os vasos apertam. A PAM não é a média aritmética de sistólica e diastólica, porque a diástole dura mais: uma estimativa útil é PAM ≈ diastólica + um terço da pressão de pulso (sistólica menos diastólica)." },
        { tipo: "prancha", titulo: "Dois fatores, uma pressão", desenho: {
          legenda: "A pressão é o resultado de quanto se bombeia (DC) contra quanto os vasos resistem (RVP).",
          primitivas: [
            { t: "retangulo", p: [30, 80], w: 70, h: 40, hachura: true },
            { t: "rotulo", p: [48, 104], texto: "DC" },
            { t: "rotulo", p: [108, 96], texto: "x" },
            { t: "retangulo", p: [128, 80], w: 70, h: 40, hachura: true },
            { t: "rotulo", p: [146, 104], texto: "RVP" },
            { t: "seta", de: [200, 100], ate: [232, 100], cor: "destaque" },
            { t: "retangulo", p: [234, 80], w: 56, h: 40, cor: "tinta" },
            { t: "rotulo", p: [244, 104], texto: "PAM" },
            { t: "rotulo", p: [40, 150], texto: "PAM = diastólica + 1/3 (sist - diast)" },
          ],
        } },
        { tipo: "licao", pergunta: "Com pressão 120/90 mmHg, qual a estimativa da PAM?", alternativas: ["105 mmHg", "100 mmHg", "90 mmHg"], correta: 1, explicacao: "Pressão de pulso = 120 − 90 = 30. PAM ≈ 90 + (30/3) = 90 + 10 = 100 mmHg. A diástole pesa mais na média porque dura mais." },
      ],
    },
    {
      id: "pressao-pulso",
      titulo: "Pressão de pulso e a onda que viaja",
      blocos: [
        { tipo: "texto", texto: "A pressão de pulso é a diferença entre sistólica e diastólica. Ela depende do volume ejetado e da rigidez das artérias: com a idade e a aterosclerose, as artérias enrijecem, a onda reflete mais rápido e a pressão de pulso tende a aumentar (sistólica alta com diastólica normal ou baixa). A elasticidade da aorta é um amortecedor — ela se estica na sístole e devolve energia na diástole, mantendo o fluxo mesmo entre as batidas." },
        { tipo: "prancha", titulo: "Vaso elástico x vaso rígido", desenho: {
          legenda: "O vaso elástico amortece a onda; o rígido transmite o pico direto, elevando a pressão de pulso.",
          primitivas: [
            { t: "curva", pts: [[20, 60], [60, 40], [100, 60], [140, 60]], cor: "destaque" },
            { t: "rotulo", p: [22, 90], texto: "Elástico: onda suave" },
            { t: "linha", de: [160, 60], ate: [185, 60], cor: "tinta" },
            { t: "linha", de: [185, 60], ate: [192, 24], cor: "tinta" },
            { t: "linha", de: [192, 24], ate: [199, 60], cor: "tinta" },
            { t: "linha", de: [199, 60], ate: [285, 60], cor: "tinta" },
            { t: "rotulo", p: [170, 90], texto: "Rígido: pico alto" },
            { t: "linha", de: [16, 140], ate: [288, 140], cor: "suave" },
            { t: "rotulo", p: [40, 150], texto: "Pressão de pulso = sistólica - diastólica" },
          ],
        } },
        { tipo: "tarefas", itens: [
          { id: "pulso-calc", titulo: "Calcule a pressão de pulso de 5 leituras", entrega: "Pegue 5 aferições (suas ou de banco de dados) e calcule sistólica menos diastólica. Note quais têm pressão de pulso acima de 60 mmHg e levante hipóteses." },
        ] },
      ],
    },
    {
      id: "fluxo-resistencia",
      titulo: "Fluxo e resistência: por que o raio manda",
      blocos: [
        { tipo: "texto", texto: "O fluxo por um vaso aumenta com a diferença de pressão e cai com a resistência. A resistência depende do comprimento, da viscosidade e, sobretudo, do raio: na lei de Poiseuille, a resistência varia com o raio elevado à quarta potência. Em termos práticos, reduzir o raio pela metade multiplica a resistência por dezesseis. É por isso que as arteríolas, ajustando um pouco o calibre, controlam para onde o sangue vai e a pressão geral." },
        { tipo: "diagrama", titulo: "O que muda o fluxo", codigo: `flowchart TD
  DP["Diferença de pressão"] --> Q["Fluxo"]
  R["Resistência"] --> Q
  RAIO["Raio do vaso (eleva a 4a potencia)"] --> R
  VISC["Viscosidade do sangue"] --> R
  COMP["Comprimento do vaso"] --> R
  Q --> NOTA["Pequeno ajuste no raio = grande efeito na resistência"]` },
        { tipo: "tarefas", itens: [
          { id: "raio4", titulo: "Demonstre a 4ª potência", entrega: "Monte uma tabela: raio relativo 1; 0,75; 0,5 e a resistência relativa (1/raio^4). Escreva em uma frase por que a vasoconstrição é tão poderosa na pressão." },
        ] },
      ],
    },
    {
      id: "troca-capilar",
      titulo: "O destino da circulação: a troca no capilar",
      blocos: [
        { tipo: "texto", texto: "Toda essa pressão existe para um fim: a troca nos capilares. Ali, a pressão hidrostática do sangue tende a empurrar líquido para fora (filtração, mais forte no início do capilar) e a pressão oncótica das proteínas tende a puxar líquido de volta (reabsorção, perto do final). O excesso que não volta é recolhido pelos vasos linfáticos. Quando esse balanço se desregula (pressão alta, proteína baixa, obstrução linfática), aparece o edema." },
        { tipo: "prancha", titulo: "Forças de Starling no capilar", desenho: {
          legenda: "Início: pressão empurra para fora (filtra). Fim: proteínas puxam para dentro (reabsorve).",
          primitivas: [
            { t: "linha", de: [20, 70], ate: [288, 70], cor: "tinta" },
            { t: "linha", de: [20, 110], ate: [288, 110], cor: "tinta" },
            { t: "seta", de: [70, 72], ate: [70, 44], cor: "destaque" },
            { t: "rotulo", p: [40, 36], texto: "Filtra (saída)" },
            { t: "seta", de: [230, 44], ate: [230, 72], cor: "suave" },
            { t: "rotulo", p: [200, 36], texto: "Reabsorve" },
            { t: "seta", de: [20, 90], ate: [288, 90], cor: "tinta" },
            { t: "circulo", c: [150, 150], r: 10, hachura: true },
            { t: "rotulo", p: [160, 148], texto: "Linfático recolhe o excesso" },
          ],
        } },
        { tipo: "fontes", titulo: "Troca e edema", itens: [
          { titulo: "OpenStax Anatomy & Physiology 2e — 20.3 Capillary Exchange", url: "https://openstax.org/books/anatomy-and-physiology-2e/pages/20-3-capillary-exchange", tipo: "livro", nota: "Filtração, reabsorção e forças de Starling." },
        ] },
      ],
    },
    // ─────────────── CAPÍTULO 5 — MEDIR: ESTAÇÃO DE AFERIÇÃO ───────────────
    {
      id: "medir-pressao",
      titulo: "Medir a pressão com técnica",
      blocos: [
        { tipo: "texto", texto: "A medida da pressão não é só apertar um botão. Preparo: a pessoa sentada, em repouso por 3–5 minutos, costas e pés apoiados, pernas descruzadas, braço apoiado na altura do coração, sem falar. O manguito precisa ter a câmara cobrindo cerca de 80% da circunferência do braço — manguito pequeno superestima a pressão. Infle, desinsufle devagar e, no método auscultatório, ouça os sons de Korotkoff: o primeiro som é a sistólica, o desaparecimento é a diastólica." },
        { tipo: "diagrama", titulo: "Passo a passo da aferição", codigo: `flowchart TD
  A["Repouso 3-5 min, sentado e apoiado"] --> B["Manguito do tamanho certo, braço na altura do coracao"]
  B --> C["Insufla acima da sistolica estimada"]
  C --> D["Desinsufla devagar (2-3 mmHg/s)"]
  D --> E["1o som de Korotkoff = sistolica"]
  E --> F["Desaparece o som = diastolica"]
  F --> G["Repita e faca a media de 2-3 medidas"]` },
        { tipo: "video", titulo: "Blood Pressure Measurement: How to Check Manually (RegisteredNurseRN)", youtube: "UGOoeqSo_ws" },
      ],
    },
    {
      id: "erros-aferição",
      titulo: "Os erros que falseiam a leitura",
      blocos: [
        { tipo: "texto", texto: "Medidas erradas levam a condutas erradas. Erros comuns que aumentam a pressão registrada: manguito pequeno demais, braço pendurado abaixo do coração, costas ou pés sem apoio, pernas cruzadas, bexiga cheia, conversar durante a medida, e a reação do jaleco branco (pressão sobe no consultório). Uma única leitura alta não fecha diagnóstico: confirma-se com repetições e, muitas vezes, medida fora do consultório (residencial ou de 24 horas)." },
        { tipo: "prancha", titulo: "Postura certa x errada", desenho: {
          legenda: "À esquerda, a postura correta. À direita, os erros que elevam a leitura.",
          primitivas: [
            { t: "retangulo", p: [26, 60], w: 40, h: 60, cor: "tinta" },
            { t: "linha", de: [66, 90], ate: [100, 90] },
            { t: "circulo", c: [100, 90], r: 4, hachura: true },
            { t: "rotulo", p: [20, 130], texto: "Apoiado, braço no nível" },
            { t: "rotulo", p: [26, 142], texto: "do coração" },
            { t: "retangulo", p: [196, 60], w: 40, h: 60 },
            { t: "linha", de: [236, 90], ate: [262, 130], cor: "suave" },
            { t: "circulo", c: [262, 130], r: 4, hachura: true },
            { t: "rotulo", p: [182, 146], texto: "Braço caído = leitura alta" },
          ],
        } },
        { tipo: "fontes", titulo: "Como medir certo", itens: [
          { titulo: "Measurement of Blood Pressure in Humans — AHA Scientific Statement (Muntner et al., Hypertension 2019)", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC8109470/", tipo: "artigo", nota: "Protocolo de aferição e fontes de erro." },
          { titulo: "Blood pressure measurement (MedlinePlus, NIH)", url: "https://medlineplus.gov/ency/article/007490.htm", tipo: "site", nota: "Guia de paciente, passo a passo." },
        ] },
        { tipo: "licao", pergunta: "Qual erro tende a SUPERESTIMAR a pressão medida?", alternativas: ["Manguito grande demais", "Braço apoiado na altura do coração", "Manguito pequeno demais para o braço"], correta: 2, explicacao: "Um manguito estreito para a circunferência do braço precisa de mais pressão para comprimir a artéria e registra valores falsamente altos. Escolher o tamanho certo é parte da técnica." },
      ],
    },
    {
      id: "classificacao-pa",
      titulo: "Classificar a pressão: dois mapas úteis",
      blocos: [
        { tipo: "texto", texto: "Há mais de um sistema de classificação, e vale conhecer os dois. A Diretriz Brasileira de Hipertensão Arterial (2020) chama de ótima <120/80, normal 120–129/80–84, pré-hipertensão 130–139/85–89 e hipertensão a partir de 140/90 mmHg (estágios 1 a 3). A diretriz americana de 2017 (ACC/AHA) usa cortes mais baixos: normal <120/80, elevada 120–129/<80 e hipertensão a partir de 130/80. Saiba qual referência está usando antes de rotular alguém." },
        { tipo: "prancha", titulo: "Faixas de pressão (tabela)", desenho: {
          legenda: "Classificação pela diretriz brasileira (SBC 2020). Valores em mmHg (sistólica / diastólica).",
          primitivas: [
            { t: "retangulo", p: [20, 24], w: 264, h: 150, cor: "tinta" },
            { t: "linha", de: [20, 54], ate: [284, 54], cor: "suave" },
            { t: "linha", de: [20, 84], ate: [284, 84], cor: "suave" },
            { t: "linha", de: [20, 114], ate: [284, 114], cor: "suave" },
            { t: "linha", de: [20, 144], ate: [284, 144], cor: "suave" },
            { t: "rotulo", p: [28, 44], texto: "Ótima      < 120 / 80" },
            { t: "rotulo", p: [28, 74], texto: "Normal     120-129 / 80-84" },
            { t: "rotulo", p: [28, 104], texto: "Pré-HAS    130-139 / 85-89" },
            { t: "rotulo", p: [28, 134], texto: "HAS 1      140-159 / 90-99" },
            { t: "rotulo", p: [28, 164], texto: "HAS 2/3    >= 160 / 100" },
          ],
        } },
        { tipo: "fontes", titulo: "Normas de classificação", itens: [
          { titulo: "Diretrizes Brasileiras de Hipertensão Arterial — 2020 (SBC/SBH/SBN)", url: "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC9949730/", tipo: "norma", nota: "Classificação e metas no Brasil. DOI 10.36660/abc.20201238." },
          { titulo: "Understanding Blood Pressure Readings (American Heart Association)", url: "https://www.heart.org/en/health-topics/high-blood-pressure/understanding-blood-pressure-readings", tipo: "site", nota: "Faixas da diretriz ACC/AHA 2017." },
        ] },
      ],
    },
    {
      id: "medir-pulso",
      titulo: "Medir o pulso e a frequência com qualidade",
      blocos: [
        { tipo: "texto", texto: "Além do número, o pulso conta história: frequência (bpm), ritmo (regular ou irregular), amplitude (cheio ou fino) e simetria entre os lados. Conte por 30 segundos e multiplique por 2 se for regular; se for irregular, conte o minuto inteiro. Um pulso irregularmente irregular pode sugerir fibrilação atrial e merece ECG. Registre sempre em que situação mediu: repouso, após esforço, deitado ou em pé." },
        { tipo: "prancha", titulo: "Ficha de registro do pulso", desenho: {
          legenda: "Um formato simples para padronizar a coleta em campo.",
          primitivas: [
            { t: "retangulo", p: [24, 28], w: 256, h: 140, cor: "tinta" },
            { t: "linha", de: [24, 62], ate: [280, 62], cor: "suave" },
            { t: "linha", de: [24, 96], ate: [280, 96], cor: "suave" },
            { t: "linha", de: [24, 130], ate: [280, 130], cor: "suave" },
            { t: "rotulo", p: [32, 50], texto: "FC (bpm): ____   Situação: ______" },
            { t: "rotulo", p: [32, 84], texto: "Ritmo:  regular / irregular" },
            { t: "rotulo", p: [32, 118], texto: "Amplitude: cheio / fino" },
            { t: "rotulo", p: [32, 152], texto: "Simetria D x E: igual / diferente" },
          ],
        } },
        { tipo: "tarefas", itens: [
          { id: "serie-fc", titulo: "Faça uma série de FC em 3 posturas", entrega: "Meça a FC deitado, sentado e em pé (1 min em cada postura antes de contar). Registre os três valores e comente a variação." },
        ] },
      ],
    },
    {
      id: "fc-recuperacao",
      titulo: "Campo: teste de degrau e FC de recuperação",
      blocos: [
        { tipo: "texto", texto: "A velocidade com que o coração desacelera depois do esforço (a frequência cardíaca de recuperação) é um sinal de saúde autonômica: quanto maior a queda no primeiro minuto após parar, melhor. Um teste simples e seguro de campo é o teste de degrau: subir e descer um degrau padronizado por alguns minutos num ritmo marcado, depois medir a FC na recuperação. É educacional, não diagnóstico — pare ao sentir dor no peito, falta de ar desproporcional ou tontura." },
        { tipo: "diagrama", titulo: "Protocolo do teste de degrau", codigo: `flowchart TD
  A["Mede FC de repouso"] --> B["Sobe e desce o degrau em ritmo marcado (3 min)"]
  B --> C["Para e mede FC imediatamente"]
  C --> D["Mede FC de novo apos 1 minuto"]
  D --> E["Recuperacao = FC do fim menos FC em 1 min"]
  E --> F["Para na hora se dor no peito, falta de ar ou tontura"]` },
        { tipo: "video", titulo: "Nursing Skills: Assessing Blood Pressure (Open RN)", youtube: "VvLtwcpa7GA" },
        { tipo: "tarefas", itens: [
          { id: "degrau", titulo: "Rode o teste de degrau com segurança", entrega: "Registre FC de repouso, FC ao parar e FC após 1 minuto. Calcule a recuperação. Combine antes um critério de parada e tenha companhia por perto." },
        ] },
      ],
    },
    {
      id: "calibracao",
      titulo: "O instrumento também é medido",
      blocos: [
        { tipo: "texto", texto: "Um esfigmomanômetro descalibrado transforma todo o esforço de técnica em lixo: ele pode ler consistentemente alto ou baixo sem você perceber. Aparelhos automáticos devem ser validados por protocolos reconhecidos, e todos precisam de verificação metrológica periódica. No Brasil, esfigmomanômetros são instrumentos sujeitos ao controle metrológico legal do Inmetro, com verificação regular — não é opcional para uso em serviço de saúde." },
        { tipo: "mobilizacao", papel: "Técnico(a) de metrologia / laboratório acreditado (rede Inmetro)", porque: "A verificação e a calibração de esfigmomanômetros exigem padrões rastreáveis e laboratório habilitado. Sem calibração válida, as medidas não têm confiabilidade metrológica e não servem para decisão clínica.", entregaEsperada: "Certificado de verificação/calibração válido do aparelho, com erro dentro da tolerância e data da próxima verificação.", gerenciadoPor: "zaeon" },
        { tipo: "tarefas", itens: [
          { id: "inventario-aparelho", titulo: "Faça o inventário do seu aparelho", entrega: "Anote marca, modelo, tipo (manual/automático), se o modelo é validado e a data da última verificação. Marque se está dentro do prazo." },
        ] },
      ],
    },
    // ─────────────── CAPÍTULO 6 — REGULAÇÃO ───────────────
    {
      id: "barorreflexo",
      titulo: "O barorreflexo: o termostato da pressão",
      blocos: [
        { tipo: "texto", texto: "A pressão muda a cada segundo e o corpo corrige em tempo real. Sensores de estiramento (barorreceptores) na carótida e na aorta avisam o tronco cerebral sobre a pressão. Se a pressão cai (ao levantar, por exemplo), o reflexo reduz o freio parassimpático e aumenta o simpático: o coração acelera, contrai mais forte e os vasos apertam, elevando a pressão de volta. Se a pressão sobe demais, o reflexo faz o oposto." },
        { tipo: "diagrama", titulo: "Alça do barorreflexo", codigo: `sequenceDiagram
  participant V as Vaso (barorreceptor)
  participant C as Tronco cerebral
  participant H as Coracao e vasos
  V->>C: Pressao caiu (menos estiramento)
  C->>H: Mais simpatico, menos vagal
  H->>H: FC sobe, contracao e vasos apertam
  H-->>V: Pressao volta ao alvo` },
        { tipo: "fontes", titulo: "Regulação em tempo real", itens: [
          { titulo: "How the Heart Works — Blood Flow & Control (NHLBI, NIH)", url: "https://www.nhlbi.nih.gov/health/heart/anatomy", tipo: "site", nota: "Visão oficial da regulação cardiovascular." },
        ] },
      ],
    },
    {
      id: "autonomo",
      titulo: "Simpático e parassimpático no coração",
      blocos: [
        { tipo: "texto", texto: "O sistema nervoso autônomo é o acelerador e o freio. O parassimpático (nervo vago) predomina em repouso e segura a frequência; por isso atletas treinados têm FC baixa. O simpático acelera a frequência, aumenta a contratilidade e aperta os vasos — é a resposta de esforço e susto, mediada por noradrenalina e adrenalina. Em repouso, o coração 'quer' bater mais rápido que o observado: é o tônus vagal que o mantém por volta de 60–80 bpm." },
        { tipo: "prancha", titulo: "Acelerador e freio", desenho: {
          legenda: "Vago freia (em repouso); simpático acelera (no esforço). O ponto de equilíbrio é a FC em repouso.",
          primitivas: [
            { t: "circulo", c: [152, 95], r: 34, cor: "tinta" },
            { t: "rotulo", p: [138, 98], texto: "Coração" },
            { t: "seta", de: [60, 95], ate: [116, 95], cor: "suave" },
            { t: "rotulo", p: [18, 92], texto: "Vago -" },
            { t: "seta", de: [244, 95], ate: [188, 95], cor: "destaque" },
            { t: "rotulo", p: [212, 92], texto: "Simpático +" },
            { t: "rotulo", p: [96, 165], texto: "Repouso = tônus vagal predomina" },
          ],
        } },
        { tipo: "licao", pergunta: "Por que um atleta bem treinado costuma ter frequência cardíaca baixa em repouso?", alternativas: ["Porque o coração está fraco", "Por forte tônus vagal (parassimpático) e maior volume por batida", "Porque o simpático está sempre ativado"], correta: 1, explicacao: "O treino aumenta o tônus vagal de repouso e o volume sistólico. Com mais volume por batida e mais freio vagal, o coração mantém o débito batendo menos vezes." },
      ],
    },
    {
      id: "raas",
      titulo: "Volume e sal: o eixo renina-angiotensina",
      blocos: [
        { tipo: "texto", texto: "O ajuste de minuto a minuto é nervoso; o ajuste de horas a dias é hormonal e renal. Quando a pressão ou o fluxo ao rim caem, libera-se renina, que inicia a cascata até a angiotensina II — um potente vasoconstritor que também estimula a aldosterona, retendo sódio e água e aumentando o volume. É por isso que sal e volume importam tanto na pressão de longo prazo, e por que vários remédios anti-hipertensivos agem exatamente nesse eixo." },
        { tipo: "diagrama", titulo: "Eixo renina-angiotensina-aldosterona", codigo: `flowchart TD
  A["Pressao/fluxo renal cai"] --> B["Rim libera renina"]
  B --> C["Angiotensina I"]
  C --> D["ECA converte em Angiotensina II"]
  D --> E["Vasos apertam (mais resistencia)"]
  D --> F["Aldosterona retem sodio e agua"]
  E --> G["Pressao sobe"]
  F --> G` },
        { tipo: "tarefas", itens: [
          { id: "sal", titulo: "Audite o sódio de um dia", entrega: "Some o sódio dos rótulos do que você comeu em um dia e compare com a referência de até cerca de 2 g de sódio/dia (≈5 g de sal). Liste 3 fontes escondidas que te surpreenderam." },
        ] },
      ],
    },
    {
      id: "exercicio",
      titulo: "O que muda no exercício",
      blocos: [
        { tipo: "texto", texto: "No esforço, tudo se reorganiza. A frequência sobe de forma quase linear com a intensidade; o volume sistólico aumenta até um ponto e depois estabiliza; juntos elevam o débito cardíaco de ~5 para 20 L/min ou mais. Os vasos do músculo ativo dilatam (a demanda local manda) enquanto outros territórios constringem, redirecionando o fluxo. A pressão sistólica sobe com o débito, mas a diastólica tende a ficar estável porque a resistência total cai com a vasodilatação muscular." },
        { tipo: "prancha", titulo: "FC e volume sistólico com a intensidade", desenho: {
          legenda: "FC (destaque) sobe linear; volume sistólico (suave) sobe e satura. O débito acompanha os dois.",
          primitivas: [
            { t: "linha", de: [30, 20], ate: [30, 150], cor: "tinta" },
            { t: "linha", de: [30, 150], ate: [290, 150], cor: "tinta" },
            { t: "linha", de: [30, 150], ate: [285, 40], cor: "destaque" },
            { t: "curva", pts: [[30, 140], [90, 100], [150, 78], [220, 72], [285, 70]], cor: "suave" },
            { t: "rotulo", p: [252, 34], texto: "FC" },
            { t: "rotulo", p: [240, 62], texto: "Vol. sist." },
            { t: "rotulo", p: [150, 165], texto: "Intensidade do exercício" },
          ],
        } },
        { tipo: "licao", pergunta: "Em exercício crescente, o que acontece com o volume sistólico?", alternativas: ["Cresce sem limite junto com a intensidade", "Aumenta até um ponto e depois estabiliza", "Cai desde o começo do esforço"], correta: 1, explicacao: "O volume sistólico sobe no esforço leve a moderado e satura; em intensidades altas, o ganho de débito passa a depender mais da frequência, já que o tempo de enchimento diminui." },
      ],
    },
    {
      id: "ortostase",
      titulo: "Ficar de pé é um desafio hidráulico",
      blocos: [
        { tipo: "texto", texto: "Ao levantar, a gravidade puxa cerca de meio litro de sangue para as pernas, o retorno venoso cai e a pressão tende a despencar. O barorreflexo responde em segundos acelerando o coração e apertando os vasos. Quando essa resposta falha ou atrasa, vem a hipotensão ortostática: tontura ou escurecimento ao levantar. Por isso a 'bomba muscular' da panturrilha e levantar devagar importam — e por isso medimos a pressão deitado e em pé em certos casos." },
        { tipo: "tarefas", itens: [
          { id: "ortostatico", titulo: "Faça um teste ortostático básico", entrega: "Meça pressão e FC deitado (após 5 min) e 1 e 3 minutos após ficar em pé. Uma queda ≥20 na sistólica ou ≥10 na diastólica sugere hipotensão ortostática — registre e, se sintomática, leve ao profissional." },
        ] },
      ],
    },
    // ─────────────── CAPÍTULO 7 — PROJETO ───────────────
    {
      id: "projeto-diario",
      titulo: "Projeto 1: diário de pressão domiciliar",
      blocos: [
        { tipo: "texto", texto: "A medida fora do consultório é hoje peça central do diagnóstico e do acompanhamento da hipertensão. Um bom diário domiciliar segue um protocolo: medir de manhã e à noite, por alguns dias, duas medidas em cada vez com um minuto de intervalo, sempre em repouso e com técnica. Descarta-se o primeiro dia e faz-se a média dos demais. O diário revela o jaleco branco, o efeito de remédios e os padrões ao longo da semana." },
        { tipo: "diagrama", titulo: "Rotina do diário domiciliar", codigo: `flowchart TD
  A["Manha e noite, por 5-7 dias"] --> B["2 medidas por vez, 1 min entre elas"]
  B --> C["Repouso, postura e manguito corretos"]
  C --> D["Anota data, hora, valores e sintomas"]
  D --> E["Descarta o 1o dia, calcula a media"]
  E --> F["Leva o diario ao profissional"]` },
        { tipo: "tarefas", itens: [
          { id: "diario7", titulo: "Monte e preencha 7 dias de diário", entrega: "Crie a planilha (data, hora, sistólica, diastólica, FC, observações) e registre manhã e noite por uma semana. Calcule a média descartando o primeiro dia." },
        ] },
      ],
    },
    {
      id: "projeto-triagem",
      titulo: "Projeto 2: estação de triagem comunitária",
      blocos: [
        { tipo: "texto", texto: "Uma estação de triagem leva a medida a quem não procura o serviço. O desenho importa: fila com cadeira de espera (repouso), posto de medida com braço apoiado e manguitos de tamanhos diferentes, e uma mesa de orientação e encaminhamento. A triagem rastreia e orienta — não diagnostica nem prescreve. Toda leitura alterada precisa de um caminho claro de encaminhamento a um profissional de saúde." },
        { tipo: "prancha", titulo: "Planta da estação de triagem", desenho: {
          legenda: "Fluxo em U: espera (repouso), medida, orientação e encaminhamento.",
          primitivas: [
            { t: "retangulo", p: [18, 24], w: 268, h: 150, cor: "tinta" },
            { t: "retangulo", p: [34, 44], w: 70, h: 44, hachura: true },
            { t: "rotulo", p: [40, 68], texto: "Espera" },
            { t: "retangulo", p: [118, 44], w: 70, h: 44 },
            { t: "rotulo", p: [128, 68], texto: "Medida" },
            { t: "retangulo", p: [202, 44], w: 68, h: 44, hachura: true },
            { t: "rotulo", p: [206, 68], texto: "Orientação" },
            { t: "seta", de: [104, 66], ate: [118, 66], cor: "destaque" },
            { t: "seta", de: [188, 66], ate: [202, 66], cor: "destaque" },
            { t: "rotulo", p: [40, 140], texto: "Encaminhamento ao serviço de saúde" },
          ],
        } },
        { tipo: "mobilizacao", papel: "Enfermeiro(a) ou profissional de saúde responsável pela estação", porque: "Aferir pressão em população, orientar e, principalmente, definir encaminhamentos e condutas diante de leituras alteradas é responsabilidade de profissional de saúde habilitado. O agente de campo organiza e coleta; o profissional supervisiona e decide.", entregaEsperada: "Protocolo da estação assinado, critérios de encaminhamento definidos e supervisão das medidas e orientações.", gerenciadoPor: "zaeon" },
      ],
    },
    {
      id: "projeto-atividade",
      titulo: "Projeto 3: plano de atividade física",
      blocos: [
        { tipo: "texto", texto: "Movimento é remédio para o sistema cardiovascular. A recomendação de referência para adultos é de pelo menos 150 a 300 minutos semanais de atividade aeróbica moderada (ou 75 a 150 minutos de intensidade vigorosa), mais fortalecimento muscular em dois dias. Um plano de campo começa de onde a pessoa está, progride aos poucos e usa a FC e a percepção de esforço como régua. Antes de iniciar esforço vigoroso, pessoas com risco precisam de avaliação." },
        { tipo: "tarefas", itens: [
          { id: "plano-semana", titulo: "Rascunhe um plano semanal", entrega: "Distribua os 150 min de aeróbico moderado na semana, marque 2 dias de força e defina como vai medir o esforço (FC-alvo ou escala de percepção). Preveja progressão em 4 semanas." },
        ] },
        { tipo: "mobilizacao", papel: "Profissional de educação física e/ou médico(a)", porque: "Prescrição individualizada de exercício e liberação para esforço vigoroso em quem tem fatores de risco (hipertensão, doença cardíaca, sedentarismo com idade avançada) exigem avaliação e orientação profissional para ser seguro e eficaz.", entregaEsperada: "Plano de exercício individualizado com intensidade, progressão e liberação/condução clínica quando indicado.", gerenciadoPor: "zaeon" },
        { tipo: "fontes", titulo: "Atividade física", itens: [
          { titulo: "AHA Recommendations for Physical Activity in Adults and Kids", url: "https://www.heart.org/en/healthy-living/fitness/fitness-basics/aha-recs-for-physical-activity-in-adults", tipo: "site", nota: "Metas de 150–300 min/semana e força 2x." },
        ] },
      ],
    },
    {
      id: "quando-encaminhar",
      titulo: "Quando parar de medir e encaminhar",
      blocos: [
        { tipo: "texto", texto: "O agente de campo precisa saber a hora de encaminhar. Sinais de alarme que pedem avaliação imediata: dor ou aperto no peito, falta de ar em repouso, desmaio, pressão muito alta com sintomas (dor de cabeça intensa, alterações visuais, confusão), pulso muito irregular novo. Leitura muito alta sem sintomas também precisa de reavaliação, mas o caminho é agendar e confirmar, não entrar em pânico. Na dúvida sobre urgência, acione o serviço de emergência." },
        { tipo: "diagrama", titulo: "Triângulo de decisão", codigo: `flowchart TD
  A["Leitura ou sintoma preocupante"] --> B{"Tem sinal de alarme agora?"}
  B -->|Sim| C["Emergencia / avaliacao imediata"]
  B -->|Nao| D{"Leitura alterada repetida?"}
  D -->|Sim| E["Agendar avaliacao com profissional"]
  D -->|Nao| F["Seguir monitorando e registrando"]` },
        { tipo: "licao", pergunta: "Qual situação exige avaliação imediata (emergência), e não apenas agendamento?", alternativas: ["Uma leitura 138/88 sem sintomas", "Dor no peito com falta de ar e suor", "FC de repouso de 58 bpm em atleta"], correta: 1, explicacao: "Dor torácica com falta de ar e sudorese é um quadro de alarme que pode ser infarto e exige avaliação imediata. As outras são situações para acompanhar ou agendar com calma." },
      ],
    },
    {
      id: "etica-dados",
      titulo: "Registro, privacidade e ética dos dados",
      blocos: [
        { tipo: "texto", texto: "Medir pressão e pulso gera dado de saúde — dado sensível. Quem faz triagem assume responsabilidade: consentir a coleta, explicar que é rastreamento e não diagnóstico, guardar os registros com segurança e não expor identidades. No Brasil, dados de saúde são dados pessoais sensíveis sob a Lei Geral de Proteção de Dados. Um bom projeto de campo define desde o início quem acessa, por quanto tempo guarda e como anonimiza antes de qualquer análise agregada." },
        { tipo: "tarefas", itens: [
          { id: "consentimento", titulo: "Escreva um termo de consentimento curto", entrega: "Em até 8 linhas, explique o que é a triagem, o que será medido, que não é diagnóstico, como o dado será guardado e como a pessoa pode pedir para apagar. Deixe espaço para data e assinatura." },
        ] },
      ],
    },
    // ─────────────── CAPÍTULO 8 — EXECUÇÃO E CASOS REAIS ───────────────
    {
      id: "caso-hipertensao",
      titulo: "Caso: a hipertensão que não dói",
      blocos: [
        { tipo: "texto", texto: "A hipertensão é chamada de assassina silenciosa porque costuma não dar sintomas enquanto, por anos, sobrecarrega o coração, enrijece as artérias e danifica rim, olhos e cérebro. A pessoa se sente bem, não trata, e o primeiro 'sintoma' pode ser um AVC ou um infarto. Daí a lógica do rastreamento: medir quem não tem queixa. O tratamento combina mudança de hábitos (sal, peso, movimento, álcool, sono) e, quando indicado, remédios — sempre com acompanhamento." },
        { tipo: "video", titulo: "Hypertension - High Blood Pressure, Animation (Alila Medical Media)", youtube: "JtBtk00EiVM" },
        { tipo: "licao", pergunta: "Por que a hipertensão é chamada de 'assassina silenciosa'?", alternativas: ["Porque dói muito e some", "Porque costuma não dar sintomas enquanto causa dano a órgãos", "Porque só aparece em idosos"], correta: 1, explicacao: "Ela geralmente é assintomática por anos, mesmo lesando coração, vasos, rins e cérebro. Sem sintoma que alerte, o rastreamento por medida regular é o que permite detectar e tratar a tempo." },
      ],
    },
    {
      id: "caso-sincope",
      titulo: "Caso: o desmaio no show (síncope vasovagal)",
      blocos: [
        { tipo: "texto", texto: "Uma pessoa em pé por muito tempo, num ambiente quente e abafado, de repente fica pálida, sua frio e desmaia por alguns segundos, recuperando-se ao deitar. É o padrão clássico da síncope vasovagal: um reflexo exagerado derruba de uma vez a frequência e a resistência vascular, a pressão cai e o cérebro fica momentaneamente sem fluxo. Deitar a pessoa e elevar as pernas resolve o episódio ao restaurar o retorno venoso. É comum e geralmente benigno — mas um primeiro desmaio merece avaliação." },
        { tipo: "diagrama", titulo: "A cadeia da síncope vasovagal", codigo: `flowchart TD
  A["Em pe, calor, sangue acumula nas pernas"] --> B["Reflexo exagerado"]
  B --> C["FC cai e vasos relaxam ao mesmo tempo"]
  C --> D["Pressao despenca"]
  D --> E["Fluxo cerebral cai -> desmaio"]
  E --> F["Deitar e elevar pernas restaura o fluxo"]` },
        { tipo: "tarefas", itens: [
          { id: "primeiros-passos", titulo: "Escreva a conduta de primeiros cuidados", entrega: "Liste, em passos, o que fazer diante de alguém que desmaiou brevemente e já acordou: posição, o que observar, quando chamar ajuda e quando encaminhar." },
        ] },
      ],
    },
    {
      id: "caso-insuficiencia",
      titulo: "Caso: quando a bomba falha (insuficiência cardíaca)",
      blocos: [
        { tipo: "texto", texto: "Na insuficiência cardíaca, o coração não consegue bombear o suficiente para a demanda. O corpo tenta compensar: retém líquido (mais pré-carga) e ativa o simpático. No começo, a lei de Frank-Starling ajuda — mais enchimento, mais força. Mas o coração doente opera numa curva mais baixa, e o estiramento excessivo passa a piorar a ejeção e a congestionar os pulmões e as pernas (falta de ar e edema). Entender a curva explica por que remédios que tiram volume e reduzem a pós-carga aliviam." },
        { tipo: "prancha", titulo: "Curva normal x insuficiência", desenho: {
          legenda: "A curva do coração insuficiente (suave) fica abaixo da normal (destaque): mais enchimento rende menos ejeção.",
          primitivas: [
            { t: "linha", de: [30, 20], ate: [30, 150], cor: "tinta" },
            { t: "linha", de: [30, 150], ate: [290, 150], cor: "tinta" },
            { t: "curva", pts: [[30, 148], [90, 100], [160, 58], [240, 44], [285, 42]], cor: "destaque" },
            { t: "curva", pts: [[30, 150], [100, 134], [180, 118], [260, 112], [285, 112]], cor: "suave" },
            { t: "rotulo", p: [214, 36], texto: "Normal" },
            { t: "rotulo", p: [210, 124], texto: "Insuficiência" },
            { t: "rotulo", p: [150, 165], texto: "Pré-carga (enchimento)" },
          ],
        } },
        { tipo: "licao", pergunta: "Por que reduzir o volume (diuréticos) costuma aliviar sintomas na insuficiência cardíaca?", alternativas: ["Porque aumenta ainda mais a pré-carga", "Porque diminui a congestão sem exigir mais do coração já sobrecarregado", "Porque acelera a frequência cardíaca"], correta: 1, explicacao: "O coração insuficiente já está na parte alta e desfavorável da curva. Tirar volume reduz a congestão nos pulmões e pernas e alivia a sobrecarga, melhorando os sintomas." },
      ],
    },
    {
      id: "caso-aterosclerose",
      titulo: "Caso: a placa que fecha a estrada (aterosclerose)",
      blocos: [
        { tipo: "texto", texto: "A aterosclerose é o acúmulo lento de gordura, células e cálcio na parede das artérias, formando placas que estreitam o lúmen e endurecem o vaso. Numa coronária, a placa pode limitar o fluxo e causar angina no esforço; se a placa rompe, forma-se um coágulo que fecha a artéria de vez — é o infarto. Os mesmos fatores de risco aparecem sempre: pressão alta, tabagismo, colesterol elevado, diabetes, sedentarismo. Controlar esses fatores é agir na causa." },
        { tipo: "prancha", titulo: "Artéria normal, com placa e ocluída", desenho: {
          legenda: "Da esquerda para a direita: lúmen amplo, placa estreitando, trombo fechando o vaso.",
          primitivas: [
            { t: "circulo", c: [55, 90], r: 34, cor: "tinta" },
            { t: "circulo", c: [55, 90], r: 22 },
            { t: "rotulo", p: [36, 140], texto: "Normal" },
            { t: "circulo", c: [152, 90], r: 34, cor: "tinta" },
            { t: "circulo", c: [152, 90], r: 12 },
            { t: "circulo", c: [158, 98], r: 10, hachura: true },
            { t: "rotulo", p: [128, 140], texto: "Placa estreita" },
            { t: "circulo", c: [248, 90], r: 34, cor: "tinta" },
            { t: "circulo", c: [248, 90], r: 28, hachura: true },
            { t: "rotulo", p: [224, 140], texto: "Trombo oclui" },
          ],
        } },
        { tipo: "fontes", titulo: "Fatores de risco e prevenção", itens: [
          { titulo: "Cardiovascular diseases (CVDs) — risk factors (WHO)", url: "https://www.who.int/news-room/fact-sheets/detail/cardiovascular-diseases-(cvds)", tipo: "site", nota: "Fatores de risco comportamentais e prevenção." },
          { titulo: "How the Heart Works (NHLBI, NIH)", url: "https://www.nhlbi.nih.gov/health/heart/anatomy", tipo: "site", nota: "Coronárias, isquemia e saúde do coração." },
        ] },
      ],
    },
    {
      id: "manutencao-habitos",
      titulo: "Manutenção: o que o coração agradece",
      blocos: [
        { tipo: "texto", texto: "A manutenção do sistema cardiovascular é feita de hábitos sustentados, não de heroísmos pontuais. Movimento regular, alimentação com menos sal e ultraprocessados, peso saudável, não fumar, álcool com moderação, sono suficiente e manejo do estresse — cada um age em uma alavanca que você já estudou (pré-carga, resistência, contratilidade, volume). Somados, reduzem pressão, melhoram a elasticidade dos vasos e baixam o risco de eventos. Medir com regularidade fecha o ciclo: ajusta o plano com dado, não com achismo." },
        { tipo: "tarefas", itens: [
          { id: "plano-manutencao", titulo: "Escreva seu plano de manutenção de 90 dias", entrega: "Escolha 3 hábitos (ex.: 150 min/semana de caminhada, reduzir sal, dormir 7 h), defina como vai medir cada um e marque uma reaferição de pressão no fim do período." },
        ] },
        { tipo: "licao", pergunta: "Qual conjunto de hábitos tem efeito direto na pressão e na saúde dos vasos?", alternativas: ["Menos sal, movimento regular, não fumar e peso saudável", "Só tomar remédio quando sentir algo", "Medir a pressão uma vez na vida"], correta: 0, explicacao: "Hábitos sustentados agem nas mesmas alavancas da fisiologia (volume, resistência, elasticidade) e reduzem pressão e risco. Remédio pode ser necessário, mas não dispensa hábito nem monitoramento." },
      ],
    },
    // ─────────────── CAPÍTULO 9 — RECURSOS E SÍNTESE ───────────────
    {
      id: "biblioteca",
      titulo: "Biblioteca do caderno: tudo em um lugar",
      blocos: [
        { tipo: "texto", texto: "Reúna aqui as fontes que sustentam este caderno. São materiais abertos e oficiais — livros-texto livres, diretrizes e órgãos de saúde. Use-os para aprofundar cada página e para checar qualquer número antes de repetir em campo." },
        { tipo: "fontes", titulo: "Livros e materiais de base", itens: [
          { titulo: "OpenStax — Anatomy and Physiology 2e (livro aberto completo)", url: "https://openstax.org/books/anatomy-and-physiology-2e/pages/19-1-heart-anatomy", tipo: "livro", nota: "Capítulos 19 e 20 cobrem coração e circulação." },
          { titulo: "OpenStax 2e — 19.3 Cardiac Cycle", url: "https://openstax.org/books/anatomy-and-physiology-2e/pages/19-3-cardiac-cycle", tipo: "livro" },
          { titulo: "OpenStax 2e — 19.4 Cardiac Physiology", url: "https://openstax.org/books/anatomy-and-physiology-2e/pages/19-4-cardiac-physiology", tipo: "livro" },
          { titulo: "OpenStax 2e — 20.2 Blood Flow, Blood Pressure, and Resistance", url: "https://openstax.org/books/anatomy-and-physiology-2e/pages/20-2-blood-flow-blood-pressure-and-resistance", tipo: "livro" },
        ] },
        { tipo: "fontes", titulo: "Diretrizes, órgãos e guias", itens: [
          { titulo: "Diretrizes Brasileiras de Hipertensão Arterial 2020 (SBC/SBH/SBN)", url: "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC9949730/", tipo: "norma", nota: "DOI 10.36660/abc.20201238." },
          { titulo: "AHA Scientific Statement — Measurement of Blood Pressure in Humans (2019)", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC8109470/", tipo: "artigo" },
          { titulo: "Understanding Blood Pressure Readings (American Heart Association)", url: "https://www.heart.org/en/health-topics/high-blood-pressure/understanding-blood-pressure-readings", tipo: "site" },
          { titulo: "Cardiovascular diseases — Fact sheet (WHO)", url: "https://www.who.int/news-room/fact-sheets/detail/cardiovascular-diseases-(cvds)", tipo: "site" },
          { titulo: "How the Heart Works (NHLBI, NIH)", url: "https://www.nhlbi.nih.gov/health/heart/anatomy", tipo: "site" },
          { titulo: "Blood pressure measurement (MedlinePlus, NIH)", url: "https://medlineplus.gov/ency/article/007490.htm", tipo: "site" },
        ] },
      ],
    },
    {
      id: "checklist-agente",
      titulo: "Checklist do agente de campo cardiovascular",
      blocos: [
        { tipo: "texto", texto: "Antes de ir a campo, rode este checklist. Ele junta técnica, segurança e limites de atuação. Lembre sempre: você rastreia, organiza e educa; diagnóstico, laudo e prescrição são de profissional de saúde." },
        { tipo: "diagrama", titulo: "Antes, durante e depois", codigo: `flowchart TD
  A["Antes: aparelho verificado, manguitos de 3 tamanhos, ficha e termo"] --> B["Durante: repouso, postura, tecnica, 2-3 medidas"]
  B --> C["Registra valor, ritmo, situacao e sintomas"]
  C --> D["Leitura alterada ou alarme? -> encaminha"]
  D --> E["Depois: media, guarda segura dos dados, feedback a pessoa"]` },
        { tipo: "mobilizacao", papel: "Médico(a) ou enfermeiro(a) supervisor(a) do projeto", porque: "Qualquer iniciativa de aferição em pessoas precisa de responsável técnico de saúde que valide o protocolo, defina critérios de encaminhamento e responda pelas condutas. Isso protege as pessoas atendidas e dá respaldo ao trabalho de campo.", entregaEsperada: "Protocolo validado e assinado pelo responsável técnico, com fluxo de encaminhamento e supervisão combinada.", gerenciadoPor: "zaeon" },
        { tipo: "tarefas", itens: [
          { id: "checklist-final", titulo: "Transforme o checklist em uma folha", entrega: "Escreva uma folha de uma página com os itens de antes/durante/depois em caixas de marcar, pronta para imprimir e usar na próxima ação de campo." },
        ] },
      ],
    },
    {
      id: "compilado",
      titulo: "Prancha de síntese",
      blocos: [
        { tipo: "texto", texto: "Arraste os cards pelo carimbo para reorganizar o estudo na ordem que faz sentido para o seu próximo passo. Abaixo da prancha, as suas anotações, medidas e imagens aparecem na sequência das páginas. Releia a equação central (débito = volume sistólico × frequência; pressão = débito × resistência): quase tudo que você mediu e desenhou se encaixa nela." },
        { tipo: "compilado" },
      ],
    },
  ],
};
