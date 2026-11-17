import type { CadernoEstudo } from "../cadernosEstudo";

/**
 * Caderno de campo: "Sono e aprendizagem: uma revisão da literatura".
 * Neurociência e educação. Cada afirmação, número, estágio de sono e norma tem
 * lastro em fonte real (ver as páginas "fontes" ao longo do caderno). Os vídeos
 * têm id de 11 caracteres de vídeos verificados no YouTube.
 */
export const caderno: CadernoEstudo = {
  id: "sono-aprendizagem",
  titulo: "Sono e aprendizagem: uma revisão da literatura",
  resumo:
    "O que a ciência já sabe sobre dormir para aprender — da arquitetura do sono (NREM/REM) à consolidação da memória, com método, medição, um protocolo prático e casos reais. Tudo com fonte.",
  paginas: [
    // ===================== CONTEXTO =====================
    {
      id: "abertura",
      titulo: "O que este caderno responde",
      blocos: [
        { tipo: "texto", texto: "A pergunta deste caderno é prática: por que quem dorme bem aprende mais, e o que fazer com isso? A resposta não é opinião — é uma literatura científica de mais de um século. O sono não é uma pausa passiva: é um estado ativo em que o cérebro reorganiza e fixa o que foi estudado durante o dia. Aprender e esquecer começam antes de você fechar os olhos, mas boa parte da fixação acontece enquanto você dorme." },
        { tipo: "texto", texto: "Este é um caderno de campo, não um resumo de prova. Ele percorre a literatura (contexto, arquitetura do sono, método de pesquisa, como medir, como projetar e executar um protocolo seu, manutenção e casos reais) e termina com fontes para você conferir cada ponto. A regra aqui é dura: nada é afirmado sem lastro." },
        { tipo: "diagrama", titulo: "O ciclo aprender → dormir → lembrar", codigo: `flowchart LR
  A["Codificacao: voce estuda (acordado)"] --> B["Sono: consolidacao"]
  B --> C["Evocacao: voce lembra na prova/na vida"]
  C --> D["Reconsolidacao: revisar fortalece"]
  D --> A` },
      ],
    },
    {
      id: "por-que-importa",
      titulo: "Por que o sono decide o que você aprende",
      blocos: [
        { tipo: "texto", texto: "A consolidação da memória é descrita por Walker e Stickgold como um conjunto de processos que pega uma memória recém-formada e instável e a converte em algo mais estável e mais útil. O ponto central da revisão deles é que muitos desses passos acontecem preferencialmente, às vezes exclusivamente, durante o sono. Em outras palavras: sem sono, o estudo da véspera fica por acabar." },
        { tipo: "texto", texto: "Isso tem consequência direta para quem estuda. Cortar sono para estudar mais é um mau negócio: você ganha horas acordado e perde a janela em que o cérebro fixaria aquilo. A privação de sono prejudica tanto a codificação (aprender de início) quanto a consolidação (guardar o que aprendeu)." },
        { tipo: "video", titulo: "The benefits of a good night's sleep — TED-Ed (Shai Marcu)", youtube: "gedoSfZvBgE" },
        {
          tipo: "licao",
          pergunta: "Segundo a literatura de consolidação, por que varar a noite estudando é um mau negócio?",
          alternativas: [
            "Porque o cérebro não aprende de madrugada",
            "Porque você perde o sono, que é quando boa parte da fixação da memória acontece",
            "Porque estudar cansado queima neurônios",
          ],
          correta: 1,
          explicacao: "O sono não é tempo perdido: é quando a memória instável é estabilizada. Trocar sono por mais horas de estudo sacrifica justamente a etapa que guardaria o conteúdo.",
        },
      ],
    },
    {
      id: "mito-dormir",
      titulo: "Dormir não é tempo perdido",
      blocos: [
        { tipo: "texto", texto: "Em 1885, Hermann Ebbinghaus descreveu a curva do esquecimento: logo após aprender, a retenção despenca, e segue caindo com o tempo se nada for feito. A curva é o pano de fundo de toda a literatura de memória. O sono e a revisão espaçada são as duas alavancas que achatam essa curva — o sono atua na mesma noite; a revisão, nos dias seguintes." },
        {
          tipo: "prancha",
          titulo: "Curva do esquecimento de Ebbinghaus",
          desenho: {
            legenda: "Retenção cai rápido sem intervenção (linha cheia). Dormir e revisar elevam e achatam a curva (linha de destaque).",
            primitivas: [
              { t: "linha", de: [30, 20], ate: [30, 170], cor: "tinta" },
              { t: "linha", de: [30, 170], ate: [285, 170], cor: "tinta" },
              { t: "rotulo", p: [8, 95], texto: "retencao" },
              { t: "rotulo", p: [150, 185], texto: "tempo" },
              { t: "curva", pts: [[30, 30], [60, 95], [110, 130], [180, 150], [285, 160]], cor: "tinta" },
              { t: "curva", pts: [[30, 30], [70, 55], [130, 70], [200, 80], [285, 88]], cor: "destaque" },
              { t: "rotulo", p: [150, 60], texto: "com sono + revisao" },
              { t: "rotulo", p: [120, 145], texto: "sem nada" },
            ],
          },
        },
        {
          tipo: "licao",
          pergunta: "O que a curva de Ebbinghaus mostra?",
          alternativas: [
            "Que a memória é perfeita nas primeiras 24h",
            "Que a retenção cai rápido logo após aprender, a menos que algo (sono, revisão) a reforce",
            "Que só se esquece o que não interessa",
          ],
          correta: 1,
          explicacao: "Ebbinghaus (1885) mediu em si mesmo a queda acentuada da retenção com o tempo. Sono e repetição espaçada são as intervenções que atenuam essa queda.",
        },
      ],
    },
    {
      id: "tres-fases-memoria",
      titulo: "Codificar, consolidar, evocar",
      blocos: [
        { tipo: "texto", texto: "A memória tem três momentos que a literatura separa bem. Codificação: a entrada da informação (você estuda). Consolidação: a estabilização ao longo de horas e dias, com papel grande do sono. Evocação: trazer de volta quando precisa. Dormir atua sobretudo na consolidação — e também protege a próxima codificação, porque o hipocampo 'esvazia' durante o sono e volta pronto para aprender de novo." },
        { tipo: "diagrama", titulo: "As três etapas e onde o sono entra", codigo: `flowchart TD
  E["CODIFICACAO (acordado): hipocampo registra"] --> C["CONSOLIDACAO (sono): dialogo hipocampo-cortex"]
  C --> R["EVOCACAO (acordado): resgate do cortex"]
  C -. "limpa o hipocampo para o dia seguinte" .-> E` },
        { tipo: "video", titulo: "How memories form and how we lose them — TED-Ed (Catharine Young)", youtube: "yOgAbKJGrTA" },
        {
          tipo: "licao",
          pergunta: "Em qual etapa o sono tem o papel mais estudado?",
          alternativas: ["Codificação", "Consolidação", "Nenhuma: o sono não afeta memória"],
          correta: 1,
          explicacao: "O sono é central na consolidação — a estabilização da memória após o aprendizado. Também favorece a codificação do dia seguinte ao restaurar o hipocampo.",
        },
      ],
    },
    {
      id: "historia-pesquisa",
      titulo: "De Ebbinghaus a Walker: a literatura",
      blocos: [
        { tipo: "texto", texto: "A ideia de que o sono ajuda a lembrar é antiga. Em 1924, Jenkins e Dallenbach mostraram que pessoas esqueciam menos sílabas quando dormiam no intervalo do que quando ficavam acordadas. Nas décadas seguintes, a polissonografia (medir o sono com EEG) permitiu ligar estágios específicos do sono a tipos de memória. Nos anos 2000, revisões de Stickgold, Walker, Diekelmann e Born consolidaram o campo." },
        {
          tipo: "prancha",
          titulo: "Linha do tempo da pesquisa sono-memória",
          desenho: {
            legenda: "Marcos. Cada traço vertical é um estudo ou revisão de referência.",
            primitivas: [
              { t: "linha", de: [15, 100], ate: [295, 100], cor: "tinta" },
              { t: "linha", de: [35, 92], ate: [35, 108], cor: "tinta" },
              { t: "rotulo", p: [16, 86], texto: "1885 Ebbinghaus" },
              { t: "linha", de: [105, 92], ate: [105, 108], cor: "tinta" },
              { t: "rotulo", p: [86, 120], texto: "1924 Jenkins" },
              { t: "linha", de: [175, 92], ate: [175, 108], cor: "tinta" },
              { t: "rotulo", p: [150, 86], texto: "1953 REM (Aserinsky)" },
              { t: "linha", de: [250, 92], ate: [250, 108], cor: "destaque" },
              { t: "rotulo", p: [225, 120], texto: "2010 Diekelmann & Born" },
            ],
          },
        },
        { tipo: "fontes", titulo: "Referências-chave do campo", itens: [
          { titulo: "Diekelmann & Born — The memory function of sleep (Nature Reviews Neuroscience, 2010)", url: "https://www.nature.com/articles/nrn2762", tipo: "artigo", nota: "Revisão canônica: SWS favorece memória declarativa; REM, procedural/emocional." },
          { titulo: "Stickgold & Walker — Sleep-dependent memory consolidation and reconsolidation (reprint, 2007)", url: "https://walkerlab.berkeley.edu/reprints/Stickgold&Walker_Sleep%20Medicine_2007.pdf", tipo: "artigo", nota: "Consolidação como cascata de estabilização, realce e integração." },
          { titulo: "Sleep, memory and plasticity (revisão, PMC)", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC2680680", tipo: "artigo", nota: "Codificação, consolidação, plasticidade e reconsolidação." },
        ] },
      ],
    },
    // ===================== LEITURA DO TEMA (ARQUITETURA DO SONO) =====================
    {
      id: "arquitetura-sono",
      titulo: "A noite em ciclos: NREM e REM",
      blocos: [
        { tipo: "texto", texto: "Uma noite não é um bloco uniforme de sono. Ela é feita de ciclos de cerca de 90 minutos que se repetem 4 a 6 vezes. Cada ciclo passa por NREM (sono sem movimento rápido dos olhos, dividido nos estágios N1, N2 e N3) e por REM (movimento rápido dos olhos, onde estão os sonhos mais vívidos). O estágio N3 é o sono de ondas lentas (SWS), profundo. Na primeira metade da noite predomina o SWS; na segunda, o REM aumenta." },
        {
          tipo: "prancha",
          titulo: "Hipnograma: a arquitetura de uma noite",
          desenho: {
            legenda: "Degraus de profundidade ao longo da noite. SWS (N3) concentra-se no início; REM cresce no fim.",
            primitivas: [
              { t: "linha", de: [25, 20], ate: [25, 165], cor: "tinta" },
              { t: "linha", de: [25, 165], ate: [290, 165], cor: "tinta" },
              { t: "rotulo", p: [2, 30], texto: "REM" },
              { t: "rotulo", p: [2, 60], texto: "N1" },
              { t: "rotulo", p: [2, 90], texto: "N2" },
              { t: "rotulo", p: [2, 125], texto: "N3/SWS" },
              { t: "curva", pts: [[30, 40], [55, 120], [80, 125], [110, 90], [125, 35], [150, 95], [175, 120], [200, 90], [220, 35], [250, 90], [275, 35]], cor: "tinta" },
              { t: "rotulo", p: [45, 150], texto: "ciclo ~90 min" },
              { t: "seta", de: [250, 48], ate: [275, 42], cor: "destaque" },
              { t: "rotulo", p: [215, 182], texto: "REM aumenta de madrugada" },
            ],
          },
        },
        { tipo: "diagrama", titulo: "Um ciclo de sono", codigo: `flowchart LR
  N1["N1 (transicao)"] --> N2["N2 (fusos do sono)"]
  N2 --> N3["N3 / SWS (ondas lentas)"]
  N3 --> N2b["N2"]
  N2b --> REM["REM (sonhos, memoria procedural)"]
  REM --> N1` },
      ],
    },
    {
      id: "ondas-lentas",
      titulo: "Sono de ondas lentas e memória declarativa",
      blocos: [
        { tipo: "texto", texto: "A memória declarativa é a dos fatos e eventos: nomes, datas, conceitos, o que você lê no livro. A literatura liga a consolidação desse tipo de memória ao sono de ondas lentas (SWS, o N3). Durante o SWS, o cérebro faz um 'diálogo' entre o hipocampo (memória recente) e o córtex (memória duradoura): o conteúdo do dia é reativado e transferido para armazenamento de longo prazo. É a consolidação sistêmica ativa." },
        { tipo: "texto", texto: "Consequência prática: as primeiras horas da noite, ricas em SWS, importam muito para o que você estudou de fatos e conceitos. Dormir tarde e acordar cedo corta sobretudo o REM do fim da noite, mas encurtar demais a noite também rouba SWS — e com ele, parte da fixação dos fatos." },
        {
          tipo: "licao",
          pergunta: "Qual estágio é mais associado à consolidação da memória declarativa (fatos)?",
          alternativas: ["Sono REM", "Sono de ondas lentas (N3/SWS)", "Estágio N1"],
          correta: 1,
          explicacao: "Diekelmann & Born (2010): o SWS favorece particularmente a memória declarativa, via reativação hipocampo-cortical durante as ondas lentas.",
        },
      ],
    },
    {
      id: "rem-emocao",
      titulo: "REM: memória procedural e emoção",
      blocos: [
        { tipo: "texto", texto: "Se o SWS cuida dos fatos, o sono REM está mais ligado à memória procedural (habilidades: tocar, digitar, pedalar, resolver um tipo de problema) e à memória emocional. Por isso REM e SWS não competem: eles cuidam de coisas diferentes. Quem treina uma habilidade motora e dorme melhora na tarefa no dia seguinte sem treinar de novo — um efeito atribuído em parte ao REM e aos fusos do sono." },
        { tipo: "video", titulo: "How sleep affects your emotions — TED (Matt Walker)", youtube: "6F8wFkScnME" },
        {
          tipo: "licao",
          pergunta: "Aprender uma sequência no teclado e dormir tende a melhorar o desempenho no dia seguinte. Por quê?",
          alternativas: [
            "Porque os dedos descansam",
            "Porque o sono (REM e fusos do N2) consolida a memória procedural da habilidade",
            "Porque de manhã estamos mais motivados",
          ],
          correta: 1,
          explicacao: "A consolidação de habilidades motoras durante o sono produz ganho sem treino adicional. REM e os fusos do sono têm papel destacado nessa memória procedural.",
        },
      ],
    },
    {
      id: "fusos-sono",
      titulo: "Fusos e ripples: o mecanismo da consolidação",
      blocos: [
        { tipo: "texto", texto: "A consolidação tem assinaturas elétricas. No estágio N2 surgem os fusos do sono (sleep spindles): rajadas curtas de ~11–16 Hz. No hipocampo ocorrem as sharp-wave ripples, e no córtex as ondas lentas. A teoria da consolidação ativa diz que esses três eventos se acoplam: a onda lenta orquestra, a ripple reativa a memória, e o fuso ajuda a 'gravá-la' no córtex. Estudos mostram que mais fusos correlacionam-se com melhor memória verbal." },
        {
          tipo: "prancha",
          titulo: "Acoplamento: onda lenta + fuso + ripple",
          desenho: {
            legenda: "Durante o SWS/N2, a onda lenta cortical, o fuso e a ripple hipocampal se alinham no tempo.",
            primitivas: [
              { t: "rotulo", p: [5, 28], texto: "Cortex: onda lenta" },
              { t: "curva", pts: [[20, 45], [70, 20], [120, 70], [170, 20], [220, 70], [270, 45]], cor: "tinta" },
              { t: "rotulo", p: [5, 95], texto: "N2: fuso (spindle)" },
              { t: "curva", pts: [[120, 110], [128, 95], [136, 115], [144, 95], [152, 115], [160, 95], [168, 115], [176, 110]], cor: "destaque" },
              { t: "rotulo", p: [5, 150], texto: "Hipocampo: ripple" },
              { t: "curva", pts: [[128, 160], [133, 150], [138, 165], [143, 150], [148, 165], [153, 152], [158, 160]], cor: "destaque" },
              { t: "linha", de: [120, 18], ate: [120, 170], cor: "suave" },
              { t: "linha", de: [176, 18], ate: [176, 170], cor: "suave" },
              { t: "rotulo", p: [128, 182], texto: "mesma janela de tempo" },
            ],
          },
        },
        { tipo: "diagrama", titulo: "Consolidação ativa (replay)", codigo: `flowchart LR
  D["Dia: experiencia codificada no hipocampo"] --> S["SWS: replay da atividade"]
  S --> T["Transferencia para o cortex"]
  T --> L["Memoria de longo prazo, menos dependente do hipocampo"]` },
      ],
    },
    {
      id: "tipos-memoria",
      titulo: "Declarativa x procedural: o que o sono favorece",
      blocos: [
        { tipo: "texto", texto: "Juntando as peças: o sono não ajuda 'a memória' em bloco — ele ajuda tipos de memória por vias diferentes. Fatos e conceitos (declarativa) ganham mais com o SWS; habilidades e emoções (procedural/emocional) ganham mais com o REM e os fusos. Isso explica por que uma noite completa importa: cortar o fim da noite (mais REM) prejudica habilidade; cortar o começo (mais SWS) prejudica conteúdo." },
        { tipo: "diagrama", titulo: "Mapa: estágio → tipo de memória", codigo: `flowchart TD
  SWS["SWS / N3 (inicio da noite)"] --> DEC["Memoria DECLARATIVA (fatos, conceitos)"]
  REM["REM (fim da noite)"] --> PROC["Memoria PROCEDURAL (habilidades)"]
  REM --> EMO["Memoria EMOCIONAL"]
  N2["N2 (fusos)"] --> DEC
  N2 --> PROC` },
        {
          tipo: "licao",
          pergunta: "Você estudou um idioma (vocabulário) e treinou violão no mesmo dia. Qual afirmação é a mais correta?",
          alternativas: [
            "Só o SWS importa para os dois",
            "O vocabulário se beneficia mais do SWS e o violão mais do REM/fusos — a noite inteira conta",
            "Nada disso tem base; é folclore",
          ],
          correta: 1,
          explicacao: "Vocabulário é memória declarativa (SWS); habilidade motora é procedural (REM/fusos). Por isso a arquitetura completa da noite é relevante.",
        },
      ],
    },
    {
      id: "fontes-arquitetura",
      titulo: "Fontes: arquitetura do sono e mecanismo",
      blocos: [
        { tipo: "texto", texto: "Referências do capítulo de arquitetura e mecanismos. Confira os termos (SWS, fusos, ripples) nas próprias fontes." },
        { tipo: "fontes", titulo: "Mecanismo da consolidação", itens: [
          { titulo: "Diekelmann & Born — The memory function of sleep (Nat Rev Neurosci, 2010)", url: "https://www.nature.com/articles/nrn2762", tipo: "artigo", nota: "Base para o mapa estágio → tipo de memória." },
          { titulo: "Borbély et al. — The two-process model of sleep regulation: a reappraisal (J Sleep Res, 2016)", url: "https://onlinelibrary.wiley.com/doi/10.1111/jsr.12371", tipo: "artigo", nota: "Processo S (homeostático) + Processo C (circadiano): por que e quando dormimos." },
          { titulo: "Stickgold & Walker — reprint (2007)", url: "https://walkerlab.berkeley.edu/reprints/Stickgold&Walker_Sleep%20Medicine_2007.pdf", tipo: "artigo", nota: "Estabilização, realce e integração da memória pelo sono." },
        ] },
      ],
    },
    // ===================== MÉTODO (COMO A LITERATURA DESCOBRE) =====================
    {
      id: "desenho-experimental",
      titulo: "O desenho sleep x wake",
      blocos: [
        { tipo: "texto", texto: "Como se prova que o sono (e não só o tempo) consolida a memória? O desenho clássico é o 'sleep versus wake'. Dois grupos aprendem a mesma tarefa; um dorme no intervalo e o outro fica acordado o mesmo número de horas; depois os dois são testados. Para controlar o horário do dia, usa-se também um desenho de 12h com retenção de dia (acordado) comparada a 12h com uma noite de sono no meio." },
        { tipo: "diagrama", titulo: "Desenho sleep x wake", codigo: `flowchart TD
  A["Aprendizado (mesma tarefa, mesma hora)"] --> B{"Intervalo de retencao"}
  B --> C["Grupo SONO: dorme a noite"]
  B --> D["Grupo VIGILIA: fica acordado"]
  C --> E["Teste: compara desempenho"]
  D --> E` },
        {
          tipo: "licao",
          pergunta: "Por que o desenho compara 'dormir' com 'ficar acordado o mesmo tempo'?",
          alternativas: [
            "Para o estudo ficar mais barato",
            "Para isolar o efeito do sono do simples passar do tempo",
            "Porque ninguém consegue dormir em laboratório",
          ],
          correta: 1,
          explicacao: "Igualando o intervalo e a hora do aprendizado, a diferença no teste é atribuível ao sono — não apenas ao tempo decorrido.",
        },
      ],
    },
    {
      id: "polissonografia",
      titulo: "Medir o sono: PSG, EEG e estágios",
      blocos: [
        { tipo: "texto", texto: "Para saber em que estágio a pessoa estava, a pesquisa usa a polissonografia (PSG): eletrodos de EEG (atividade elétrica cerebral), EOG (movimento dos olhos, que marca o REM) e EMG (tônus muscular do queixo). Técnicos treinados classificam o sono em épocas de 30 segundos, seguindo um manual padrão (hoje, o manual da AASM; antes, o de Rechtschaffen & Kales). É assim que se constrói o hipnograma." },
        {
          tipo: "prancha",
          titulo: "Montagem de PSG (esquema)",
          desenho: {
            legenda: "Canais mínimos de uma PSG: EEG no couro cabeludo, EOG nos cantos dos olhos, EMG no queixo.",
            primitivas: [
              { t: "circulo", c: [150, 90], r: 55, cor: "tinta" },
              { t: "rotulo", p: [135, 25], texto: "EEG" },
              { t: "circulo", c: [150, 42], r: 4, hachura: true },
              { t: "circulo", c: [128, 80], r: 4, hachura: true },
              { t: "circulo", c: [172, 80], r: 4, hachura: true },
              { t: "rotulo", p: [95, 78], texto: "EOG" },
              { t: "rotulo", p: [170, 78], texto: "EOG" },
              { t: "circulo", c: [150, 120], r: 4, cor: "destaque" },
              { t: "rotulo", p: [158, 123], texto: "EMG (queixo)" },
              { t: "seta", de: [210, 90], ate: [255, 90], cor: "tinta" },
              { t: "rotulo", p: [228, 80], texto: "hipnograma" },
              { t: "curva", pts: [[255, 70], [262, 100], [270, 75], [278, 105], [286, 80]], cor: "destaque" },
            ],
          },
        },
        { tipo: "mobilizacao", papel: "Técnico(a) em polissonografia / laboratório do sono", porque: "Classificar estágios de sono e diagnosticar distúrbios (apneia, insônia) exige equipamento calibrado e laudo de profissional habilitado. Um app de pulso NÃO substitui PSG.", entregaEsperada: "Registro de PSG de uma noite com hipnograma pontuado por época e laudo técnico dos estágios e eventos respiratórios.", gerenciadoPor: "zaeon" },
      ],
    },
    {
      id: "revisao-sistematica",
      titulo: "Como ler (e fazer) uma revisão da literatura",
      blocos: [
        { tipo: "texto", texto: "Uma 'revisão da literatura' não é um apanhado de opiniões: é um método. A revisão sistemática define uma pergunta, busca em bases (PubMed, SciELO), aplica critérios de inclusão/exclusão, avalia o risco de viés de cada estudo e sintetiza. O fluxo PRISMA documenta quantos artigos entraram, quantos foram excluídos e por quê — para que qualquer pessoa possa reproduzir a busca." },
        { tipo: "diagrama", titulo: "Fluxo de uma revisão (estilo PRISMA)", codigo: `flowchart TD
  I["Identificacao: busca nas bases (PubMed, SciELO)"] --> T["Triagem: le titulo e resumo"]
  T --> E["Elegibilidade: le texto completo"]
  E --> V["Avalia risco de vies"]
  V --> S["Sintese: o que a evidencia diz"]` },
        { tipo: "tarefas", itens: [
          { id: "busca-base", titulo: "Rode uma busca de verdade", entrega: "No PubMed, busque 'sleep AND memory consolidation review'. Anote quantos resultados apareceram e escolha 3 revisões dos últimos 10 anos. Registre título, ano e revista de cada uma." },
        ] },
      ],
    },
    {
      id: "privacao-sono",
      titulo: "O experimento da privação",
      blocos: [
        { tipo: "texto", texto: "O outro lado da moeda é a privação de sono: o que se perde quando o sono falta. Revisões recentes em português e inglês convergem: a privação reduz a retenção de informação nova, piora a atenção e a tomada de decisão e aumenta a propensão a falsas memórias. É por isso que a 'virada' antes da prova costuma sair pela culatra — você chega com menos atenção e menos conteúdo fixado." },
        { tipo: "video", titulo: "What would happen if you didn't sleep? — TED-Ed (Claudia Aguirre)", youtube: "dqONk48l5vY" },
        {
          tipo: "licao",
          pergunta: "Qual é um efeito documentado da privação de sono sobre a memória?",
          alternativas: [
            "Melhora a memória de longo prazo",
            "Aumenta a propensão a falsas memórias e reduz a retenção do que foi estudado",
            "Não tem efeito nenhum",
          ],
          correta: 1,
          explicacao: "A literatura associa a privação a pior retenção de informação nova, atenção prejudicada e maior chance de falsas memórias.",
        },
      ],
    },
    {
      id: "fontes-metodo",
      titulo: "Fontes: método e privação",
      blocos: [
        { tipo: "texto", texto: "Referências de método (como a literatura estuda o tema) e de privação de sono." },
        { tipo: "fontes", titulo: "Método e evidência", itens: [
          { titulo: "PRISMA 2020 — diretriz para revisões sistemáticas", url: "https://www.prisma-statement.org/", tipo: "norma", nota: "Como documentar uma revisão de forma reproduzível." },
          { titulo: "Revisão (pt-BR): privação de sono, memória e aprendizado (RSD Journal)", url: "https://rsdjournal.org/index.php/rsd/article/download/45114/36073", tipo: "artigo", nota: "Síntese de estudos 2020–2024 sobre privação e desempenho." },
          { titulo: "Revista Neurociências (UNIFESP) — sono e memória", url: "https://periodicos.unifesp.br/index.php/neurociencias/article/download/19702/13376/85458", tipo: "artigo", nota: "Fonte nacional revisada por pares." },
        ] },
      ],
    },
    // ===================== CÁLCULO / MEDIÇÃO (NO SEU CASO) =====================
    {
      id: "quanto-dormir",
      titulo: "Quanto dormir por idade (consenso)",
      blocos: [
        { tipo: "texto", texto: "Quanto é 'sono suficiente'? O consenso da National Sleep Foundation (Hirshkowitz et al., 2015), produzido por um painel de 18 especialistas de 12 organizações, dá faixas recomendadas por idade. Para adultos (18–64): 7 a 9 horas. Jovens adultos: 7 a 9h. Adolescentes (14–17): 8 a 10h. Idade escolar (6–13): 9 a 11h. Idosos (65+): 7 a 8h. São faixas populacionais — o seu número ótimo está dentro delas, não fora." },
        {
          tipo: "prancha",
          titulo: "Faixas recomendadas de sono por idade (NSF, 2015)",
          desenho: {
            legenda: "Barras = faixa recomendada de horas por noite. Quanto mais jovem, mais sono.",
            primitivas: [
              { t: "linha", de: [95, 20], ate: [95, 165], cor: "tinta" },
              { t: "linha", de: [95, 165], ate: [290, 165], cor: "tinta" },
              { t: "rotulo", p: [4, 38], texto: "Escolar 6-13" },
              { t: "retangulo", p: [95, 32], w: 130, h: 14, cor: "destaque" },
              { t: "rotulo", p: [228, 42], texto: "9-11h" },
              { t: "rotulo", p: [4, 70], texto: "Adolesc 14-17" },
              { t: "retangulo", p: [95, 64], w: 118, h: 14, hachura: true },
              { t: "rotulo", p: [216, 74], texto: "8-10h" },
              { t: "rotulo", p: [4, 102], texto: "Adulto 18-64" },
              { t: "retangulo", p: [95, 96], w: 106, h: 14, cor: "tinta" },
              { t: "rotulo", p: [204, 106], texto: "7-9h" },
              { t: "rotulo", p: [4, 134], texto: "Idoso 65+" },
              { t: "retangulo", p: [95, 128], w: 94, h: 14, hachura: true },
              { t: "rotulo", p: [192, 138], texto: "7-8h" },
            ],
          },
        },
        {
          tipo: "licao",
          pergunta: "Segundo o consenso da NSF (2015), qual a faixa recomendada para um adulto de 25 anos?",
          alternativas: ["5 a 6 horas", "7 a 9 horas", "10 a 12 horas"],
          correta: 1,
          explicacao: "Jovens adultos e adultos: 7 a 9 horas por noite. Dormir pouco cronicamente cria 'débito de sono' que prejudica memória e atenção.",
        },
      ],
    },
    {
      id: "diario-sono",
      titulo: "Diário de sono e eficiência",
      blocos: [
        { tipo: "texto", texto: "Antes de mudar o sono, meça o seu. O instrumento mais barato e validado é o diário de sono: por 1 a 2 semanas, anote a hora de deitar, quanto demorou para pegar no sono (latência), despertares, hora de acordar e como se sentiu. Dele sai a eficiência do sono = tempo dormindo ÷ tempo na cama, em %. Acima de ~85% é considerado bom. É o mesmo diário que clínicas usam para avaliar insônia." },
        { tipo: "tarefas", itens: [
          { id: "diario-7dias", titulo: "Preencha 7 dias de diário de sono", entrega: "Por uma semana, registre hora de deitar, latência (min até dormir), nº de despertares, hora de acordar e nota de disposição (0–10). No fim, calcule a eficiência média de uma noite." },
        ] },
        {
          tipo: "prancha",
          titulo: "Linha do diário (uma noite)",
          desenho: {
            legenda: "Tempo na cama vs. tempo dormindo. Eficiência = dormido / na cama.",
            primitivas: [
              { t: "retangulo", p: [30, 60], w: 240, h: 24, cor: "suave" },
              { t: "rotulo", p: [32, 52], texto: "tempo na cama (23h -> 7h)" },
              { t: "retangulo", p: [55, 60], w: 185, h: 24, cor: "destaque" },
              { t: "rotulo", p: [95, 100], texto: "tempo realmente dormindo" },
              { t: "seta", de: [30, 130], ate: [55, 130], cor: "tinta" },
              { t: "rotulo", p: [12, 150], texto: "latencia" },
              { t: "rotulo", p: [120, 150], texto: "eficiencia ~ 85%+ e boa" },
            ],
          },
        },
      ],
    },
    {
      id: "actigrafia-apps",
      titulo: "Actigrafia e apps: o que confiar",
      blocos: [
        { tipo: "texto", texto: "Relógios e apps estimam o sono pelo movimento (actigrafia) e pela frequência cardíaca. Eles são bons para tendência de duração e horário, mas erram ao classificar estágios (quanto de REM, quanto de N3) — isso só a PSG mede com confiança. Use o wearable como termômetro de rotina (está dormindo mais ou menos? mais regular?), não como diagnóstico. Para dúvida clínica, procure um laboratório do sono." },
        { tipo: "diagrama", titulo: "O que cada método mede bem", codigo: `flowchart TD
  DIARIO["Diario de sono"] --> DUR["Horario e duracao: bom"]
  ACTI["Wearable / actigrafia"] --> DUR
  ACTI --> EST["Estagios (REM/N3): impreciso"]
  PSG["Polissonografia (laboratorio)"] --> EST2["Estagios e eventos: padrao-ouro"]` },
        {
          tipo: "licao",
          pergunta: "Seu relógio diz '1h30 de REM'. Como tratar esse número?",
          alternativas: [
            "Como verdade absoluta",
            "Como estimativa útil para tendência, mas imprecisa para estágios — só a PSG mede isso bem",
            "Como prova de que você tem um distúrbio",
          ],
          correta: 1,
          explicacao: "Wearables acertam melhor duração/horário do que a divisão em estágios. Para estágios e diagnóstico, o padrão é a PSG.",
        },
      ],
    },
    {
      id: "debito-sono",
      titulo: "Débito de sono e cronotipo",
      blocos: [
        { tipo: "texto", texto: "Dois conceitos fecham a medição. Débito de sono: a soma do sono que faltou em relação à sua necessidade; ele se acumula e cobra em atenção e memória, e não se 'quita' só com um fim de semana. Cronotipo: se você é mais matutino ou vespertino — regulado pelos ritmos circadianos. Adolescentes tendem ao vespertino (dormem e acordam mais tarde), o que choca com o horário escolar e gera débito crônico." },
        {
          tipo: "prancha",
          titulo: "Débito de sono acumulando na semana",
          desenho: {
            legenda: "Cada noite curta soma ao débito. Barra para cima = horas devidas.",
            primitivas: [
              { t: "linha", de: [25, 20], ate: [25, 150], cor: "tinta" },
              { t: "linha", de: [25, 150], ate: [290, 150], cor: "tinta" },
              { t: "rotulo", p: [2, 80], texto: "debito (h)" },
              { t: "retangulo", p: [45, 130], w: 20, h: 20, cor: "suave" },
              { t: "retangulo", p: [85, 112], w: 20, h: 38, hachura: true },
              { t: "retangulo", p: [125, 95], w: 20, h: 55, cor: "destaque" },
              { t: "retangulo", p: [165, 80], w: 20, h: 70, cor: "destaque" },
              { t: "retangulo", p: [205, 65], w: 20, h: 85, cor: "destaque" },
              { t: "rotulo", p: [40, 165], texto: "seg ter qua qui sex" },
            ],
          },
        },
        {
          tipo: "licao",
          pergunta: "O débito de sono da semana some com uma dormida longa no sábado?",
          alternativas: [
            "Sim, zera tudo",
            "Não totalmente: parte se recupera, mas a melhor estratégia é regularidade, não compensar no fim de semana",
            "O débito não existe",
          ],
          correta: 1,
          explicacao: "Compensar no fim de semana recupera só em parte e bagunça o ritmo circadiano (jet lag social). Regularidade de horário é mais eficaz.",
        },
      ],
    },
    // ===================== PROJETO (DESENHE SEU PROTOCOLO) =====================
    {
      id: "janela-estudo-sono",
      titulo: "Estude, durma, revise: a janela",
      blocos: [
        { tipo: "texto", texto: "O projeto começa pela sequência. A literatura sugere estudar, dormir dentro das horas seguintes e revisar no dia posterior: o sono consolida, a revisão reconsolida. Estudar material novo pesado logo antes de dormir pode ajudar a fixá-lo (menos interferência até a noite). Virar a noite faz o contrário — chega à prova sem consolidação e sem atenção." },
        { tipo: "diagrama", titulo: "Janela de uma matéria", codigo: `flowchart LR
  D1["Dia 1: estuda o bloco novo"] --> N1["Noite 1: sono consolida"]
  N1 --> D2["Dia 2: revisa rapido (reconsolida)"]
  D2 --> N7["... repete espacado ate a prova"]` },
        { tipo: "tarefas", itens: [
          { id: "mapa-janela", titulo: "Desenhe a janela de uma matéria sua", entrega: "Escolha um tema da próxima prova. Marque o dia de estudo, a noite de sono planejada (horas) e os dias de revisão. Entregue como uma linha do tempo de 7 dias." },
        ] },
      ],
    },
    {
      id: "cochilo-estrategico",
      titulo: "O cochilo estratégico (nap)",
      blocos: [
        { tipo: "texto", texto: "O cochilo diurno é uma ferramenta real, com evidência. Um estudo de 2020 (revista Sleep) mostrou que um cochilo de ~90 minutos à tarde, além da noite normal, melhorou a codificação de pares de palavras frente a ficar acordado, com aumento da ativação hipocampal — os autores falam em 'restaurar a função do hipocampo'. Cochilos com mais fusos foram ligados a melhor memória verbal. Para não atrapalhar a noite, cochilos curtos (10–20 min) ou um ciclo completo (~90 min) no começo da tarde funcionam melhor que cochilos longos no fim do dia." },
        {
          tipo: "prancha",
          titulo: "Dois cochilos úteis",
          desenho: {
            legenda: "Power nap (10-20 min, sem entrar em SWS) x cochilo de 1 ciclo (~90 min).",
            primitivas: [
              { t: "rotulo", p: [10, 25], texto: "Power nap 10-20 min" },
              { t: "retangulo", p: [20, 40], w: 40, h: 20, cor: "destaque" },
              { t: "rotulo", p: [20, 80], texto: "acorda leve, sem ressaca" },
              { t: "rotulo", p: [10, 115], texto: "Ciclo ~90 min" },
              { t: "retangulo", p: [20, 130], w: 180, h: 20, cor: "suave" },
              { t: "curva", pts: [[25, 148], [70, 132], [120, 148], [165, 134], [200, 140]], cor: "tinta" },
              { t: "rotulo", p: [205, 145], texto: "passa por SWS e REM" },
            ],
          },
        },
        {
          tipo: "licao",
          pergunta: "Qual cochilo tende a deixar você mais grogue (inércia do sono)?",
          alternativas: [
            "10 a 20 minutos no início da tarde",
            "Um cochilo longo que o acorda no meio do sono profundo (SWS)",
            "Nenhum cochilo causa isso",
          ],
          correta: 1,
          explicacao: "Acordar no meio do SWS causa inércia do sono (grogue). Por isso power naps curtos ou um ciclo completo (~90 min) são preferíveis.",
        },
      ],
    },
    {
      id: "higiene-sono",
      titulo: "Projeto de higiene do sono",
      blocos: [
        { tipo: "texto", texto: "Higiene do sono é o conjunto de hábitos e ambiente que facilitam dormir. Os pilares com melhor suporte: horário regular (dormir e acordar perto da mesma hora, inclusive no fim de semana), quarto escuro, silencioso e fresco (~18–20 °C), luz forte de manhã e luz fraca à noite, e cortar cafeína à tarde. Não é mágica — é remover os obstáculos ao sono que o corpo já sabe fazer." },
        {
          tipo: "prancha",
          titulo: "O quarto que ajuda a dormir",
          desenho: {
            legenda: "Escuro, silencioso, fresco; sem tela na cama; luz da manhã entrando.",
            primitivas: [
              { t: "retangulo", p: [30, 40], w: 240, h: 120, cor: "tinta" },
              { t: "retangulo", p: [45, 95], w: 110, h: 50, hachura: true },
              { t: "rotulo", p: [60, 125], texto: "cama" },
              { t: "retangulo", p: [210, 55], w: 45, h: 45 },
              { t: "rotulo", p: [206, 115], texto: "janela (luz AM)" },
              { t: "circulo", c: [232, 77], r: 10, cor: "destaque" },
              { t: "rotulo", p: [40, 180], texto: "escuro | silencioso | fresco ~18-20C | sem telas" },
            ],
          },
        },
        { tipo: "tarefas", itens: [
          { id: "checklist-higiene", titulo: "Monte seu checklist de higiene do sono", entrega: "Liste 5 mudanças concretas no seu quarto e na sua rotina (horário, luz, cafeína, telas, temperatura). Marque quais você consegue começar hoje." },
        ] },
      ],
    },
    {
      id: "plano-vespera-prova",
      titulo: "Véspera de prova: o anti-virada",
      blocos: [
        { tipo: "texto", texto: "O projeto precisa de uma regra para a véspera. A literatura é consistente: dormir a noite antes da prova vale mais do que as 2–3 horas extras de estudo que a virada ofereceria. O plano anti-virada: terminar o grosso do estudo com dias de antecedência (revisão espaçada), fazer uma revisão leve na véspera e dormir a noite recomendada. Você chega com conteúdo consolidado E atenção para raciocinar." },
        {
          tipo: "licao",
          pergunta: "Faltam 2 dias para a prova e você ainda não revisou tudo. Qual plano a literatura apoia?",
          alternativas: [
            "Virar a noite da véspera para cobrir tudo",
            "Revisar de forma espaçada nos 2 dias e dormir a noite completa na véspera",
            "Dormir o dia todo e não revisar",
          ],
          correta: 1,
          explicacao: "Sono na véspera protege atenção e consolidação; a virada troca fixação e foco por mais horas de leitura passiva. Revisão espaçada + noite completa rende mais.",
        },
        { tipo: "tarefas", itens: [
          { id: "plano-prova", titulo: "Escreva seu plano anti-virada", entrega: "Para a próxima avaliação, defina a data de 'fechar o conteúdo', o que será só revisão na véspera e a hora de dormir. Comprometa-se com a hora de deitar." },
        ] },
      ],
    },
    // ===================== EXECUÇÃO =====================
    {
      id: "rotina-semana",
      titulo: "Montando a semana de estudos + sono",
      blocos: [
        { tipo: "texto", texto: "Executar é encaixar estudo e sono na mesma agenda, sem um roubar o outro. Reserve os blocos de estudo mais exigentes para seus horários de pico (que dependem do cronotipo) e proteja a hora de dormir como um compromisso fixo. Regularidade vence intensidade: sete noites de 7–8h rendem mais do que cinco de 5h e duas de 11h." },
        { tipo: "diagrama", titulo: "Blocos protegidos na semana", codigo: `flowchart LR
  M["Manha: luz forte + estudo pesado (se matutino)"] --> T["Tarde: cochilo curto opcional"]
  T --> N["Noite: revisao leve + rotina de desligar"]
  N --> S["Hora de dormir FIXA (compromisso)"]` },
        { tipo: "tarefas", itens: [
          { id: "agenda-semana", titulo: "Monte sua semana real", entrega: "Em uma grade de 7 dias, marque blocos de estudo, hora de dormir e hora de acordar. Destaque a hora de dormir como inegociável e aponte 1 conflito a resolver." },
        ] },
      ],
    },
    {
      id: "ancora-despertar",
      titulo: "Âncora de despertar e luz",
      blocos: [
        { tipo: "texto", texto: "O regulador mais forte do ritmo circadiano é a luz. Uma hora de acordar constante, seguida de exposição à luz da manhã (janela, rua, ou luz forte no inverno), 'ancora' o relógio biológico e torna o sono da noite mais previsível. É mais fácil controlar a hora de acordar do que a de pegar no sono — por isso a âncora é o despertar, não o deitar." },
        {
          tipo: "prancha",
          titulo: "A luz da manhã ancora o relógio",
          desenho: {
            legenda: "Luz forte ao acordar adianta o relógio; luz forte à noite atrasa. Use isso a favor.",
            primitivas: [
              { t: "circulo", c: [60, 70], r: 22, cor: "destaque" },
              { t: "rotulo", p: [40, 110], texto: "luz AM" },
              { t: "seta", de: [85, 70], ate: [150, 70], cor: "tinta" },
              { t: "rotulo", p: [95, 60], texto: "adianta" },
              { t: "circulo", c: [200, 70], r: 14, cor: "suave" },
              { t: "rotulo", p: [178, 110], texto: "relogio biologico" },
              { t: "rotulo", p: [30, 150], texto: "acordar sempre na mesma hora = ancora" },
            ],
          },
        },
        {
          tipo: "licao",
          pergunta: "Qual é a melhor 'âncora' para regular o ritmo circadiano?",
          alternativas: [
            "A hora em que você consegue pegar no sono",
            "Uma hora de acordar fixa, com luz da manhã",
            "Tomar café a qualquer hora",
          ],
          correta: 1,
          explicacao: "A luz da manhã após um despertar constante sincroniza o relógio. A hora de acordar é mais controlável que a de adormecer.",
        },
      ],
    },
    {
      id: "cafeina-telas",
      titulo: "Cafeína, álcool e telas",
      blocos: [
        { tipo: "texto", texto: "Três sabotadores comuns. Cafeína: bloqueia os receptores de adenosina (a molécula que gera a 'pressão de sono'); como sua meia-vida é de ~5–6 horas, um café às 17h ainda age à meia-noite. Álcool: ajuda a 'apagar', mas fragmenta o sono e suprime o REM, prejudicando a memória procedural. Telas à noite: a luz e o engajamento atrasam o adormecer. Nenhum é proibido — é questão de horário e dose." },
        { tipo: "diagrama", titulo: "Pressão de sono e cafeína", codigo: `flowchart TD
  A["Adenosina sobe durante o dia -> da sono"] --> P["Pressao de sono aumenta"]
  CAF["Cafeina bloqueia receptores de adenosina"] --> MASK["Mascara o sono (nao apaga a divida)"]
  P --> SONO["Deitou: pressao alta = dorme mais rapido"]` },
        {
          tipo: "licao",
          pergunta: "Por que um café às 17h pode atrapalhar o sono à noite?",
          alternativas: [
            "Porque café tem açúcar",
            "Porque a cafeína bloqueia receptores de adenosina e tem meia-vida de ~5–6h, agindo ainda de madrugada",
            "Porque café só faz efeito à noite",
          ],
          correta: 1,
          explicacao: "A cafeína antagoniza a adenosina (que gera pressão de sono). Com meia-vida longa, metade ainda circula horas depois — logo, café tarde tira sono.",
        },
      ],
    },
    {
      id: "quando-procurar",
      titulo: "Quando o problema é clínico",
      blocos: [
        { tipo: "texto", texto: "Higiene do sono resolve maus hábitos, não doenças. Se há ronco alto com pausas na respiração e sono não reparador (sinais de apneia), insônia que persiste por semanas apesar da higiene, sonolência diurna perigosa (dirigir, estudar) ou suspeita de outro distúrbio, isso é terreno clínico. A insônia crônica, por exemplo, tem tratamento de primeira linha baseado em evidência (a TCC-I, terapia cognitivo-comportamental para insônia) — conduzida por profissional." },
        { tipo: "mobilizacao", papel: "Médico(a) do sono / especialista em medicina do sono", porque: "Apneia, insônia crônica, narcolepsia e sonolência diurna excessiva exigem diagnóstico (muitas vezes com PSG) e tratamento médico. Automedicação e apps não substituem avaliação clínica.", entregaEsperada: "Avaliação clínica com hipótese diagnóstica, exames indicados (ex.: PSG) e plano de tratamento (ex.: TCC-I para insônia, CPAP para apneia, quando indicado).", gerenciadoPor: "zaeon" },
        {
          tipo: "licao",
          pergunta: "Qual é o tratamento de primeira linha, com base em evidência, para insônia crônica?",
          alternativas: [
            "Remédio para dormir, indefinidamente",
            "Terapia cognitivo-comportamental para insônia (TCC-I), conduzida por profissional",
            "Dormir mais no fim de semana",
          ],
          correta: 1,
          explicacao: "Diretrizes apontam a TCC-I como primeira linha para insônia crônica, acima do uso prolongado de medicação. Requer acompanhamento profissional.",
        },
      ],
    },
    // ===================== MANUTENÇÃO =====================
    {
      id: "monitorar-resultado",
      titulo: "Medir se funcionou",
      blocos: [
        { tipo: "texto", texto: "Manutenção começa por medir o resultado, não só a intenção. Compare dois números antes e depois de 3–4 semanas do protocolo: sono (duração e eficiência médias do diário) e aprendizado (acertos em simulados, retenção em revisões). Se o sono subiu mas o estudo não, ajuste a parte de estudo; se o sono não subiu, volte à higiene e à hora de dormir." },
        { tipo: "tarefas", itens: [
          { id: "painel-antes-depois", titulo: "Monte um painel antes/depois", entrega: "Registre sono médio e desempenho (ex.: % de acertos) na semana 0 e na semana 4. Anote a maior diferença e a provável causa." },
        ] },
        {
          tipo: "prancha",
          titulo: "Painel de 4 semanas",
          desenho: {
            legenda: "Duas linhas: horas de sono e desempenho. A meta é as duas subindo juntas.",
            primitivas: [
              { t: "linha", de: [25, 20], ate: [25, 150], cor: "tinta" },
              { t: "linha", de: [25, 150], ate: [290, 150], cor: "tinta" },
              { t: "curva", pts: [[30, 120], [100, 100], [170, 80], [280, 65]], cor: "tinta" },
              { t: "rotulo", p: [200, 60], texto: "sono (h)" },
              { t: "curva", pts: [[30, 135], [100, 118], [170, 95], [280, 72]], cor: "destaque" },
              { t: "rotulo", p: [200, 90], texto: "desempenho" },
              { t: "rotulo", p: [40, 165], texto: "sem 1   sem 2   sem 3   sem 4" },
            ],
          },
        },
      ],
    },
    {
      id: "ajustar-iterar",
      titulo: "Ajuste fino por 4 semanas",
      blocos: [
        { tipo: "texto", texto: "Protocolo de sono é iterativo: mude uma variável por vez e observe. Semana 1: fixe a hora de acordar. Semana 2: adiante a hora de deitar em 20–30 min. Semana 3: corte a cafeína após as 15h. Semana 4: ajuste o ambiente (escuro/temperatura). Mudar tudo de uma vez impede saber o que funcionou — e costuma não durar." },
        { tipo: "diagrama", titulo: "Ciclo de ajuste (uma variável por semana)", codigo: `flowchart LR
  MED["Mede (diario + desempenho)"] --> MUDA["Muda 1 variavel"]
  MUDA --> ESP["Espera 1 semana"]
  ESP --> AVAL["Avalia: melhorou?"]
  AVAL --> MED` },
        {
          tipo: "licao",
          pergunta: "Por que mudar uma variável por vez?",
          alternativas: [
            "Para o protocolo durar mais tempo no papel",
            "Para saber qual mudança causou qual efeito (atribuição) e sustentar o hábito",
            "Não faz diferença mudar tudo junto",
          ],
          correta: 1,
          explicacao: "Mudança isolada permite atribuir causa e cria hábitos sustentáveis. É a mesma lógica de um experimento controlado, aplicada à sua rotina.",
        },
      ],
    },
    {
      id: "fontes-pratica",
      titulo: "Fontes: prática e recomendações",
      blocos: [
        { tipo: "texto", texto: "Normas e guias para a parte prática (quanto dormir, higiene, insônia)." },
        { tipo: "fontes", titulo: "Guias e consensos", itens: [
          { titulo: "Hirshkowitz et al. — NSF sleep time duration recommendations (Sleep Health, 2015)", url: "https://pubmed.ncbi.nlm.nih.gov/29073412/", tipo: "norma", nota: "Faixas de sono por idade (consenso de painel de especialistas)." },
          { titulo: "CDC — Sleep and Sleep Disorders (higiene do sono e dados)", url: "https://www.cdc.gov/sleep/", tipo: "site", nota: "Órgão oficial dos EUA: recomendações e estatísticas de sono." },
          { titulo: "Dissertação (UFPB) — cronotipo, ritmos circadianos e aprendizagem", url: "https://repositorio.ufpb.br/jspui/bitstream/123456789/14973/1/PELM03072019.pdf", tipo: "artigo", nota: "Como o cronotipo modula o horário ótimo de consolidação." },
        ] },
      ],
    },
    // ===================== CASOS REAIS =====================
    {
      id: "randy-gardner",
      titulo: "Randy Gardner: 264 horas acordado",
      blocos: [
        { tipo: "texto", texto: "Em 1963–1964, o estudante Randy Gardner, de 17 anos, ficou 264 horas (11 dias) sem dormir para uma feira de ciências em San Diego, acompanhado pelo pesquisador William Dement. Ao longo do experimento surgiram problemas de atenção, memória, humor, fala e até alucinações. É o caso emblemático de que a privação extrema degrada funções cognitivas — e de que o cérebro cobra o sono perdido. (Importante: é um caso-limite, não um protocolo a imitar.)" },
        {
          tipo: "prancha",
          titulo: "11 dias: a cognição em queda",
          desenho: {
            legenda: "Ao longo dos dias sem sono, atenção e memória caem; sintomas aumentam.",
            primitivas: [
              { t: "linha", de: [25, 20], ate: [25, 150], cor: "tinta" },
              { t: "linha", de: [25, 150], ate: [290, 150], cor: "tinta" },
              { t: "rotulo", p: [2, 80], texto: "cognicao" },
              { t: "curva", pts: [[30, 40], [90, 60], [150, 95], [210, 120], [280, 138]], cor: "tinta" },
              { t: "rotulo", p: [40, 165], texto: "dia 1 -> dia 11 (264 h)" },
              { t: "seta", de: [270, 120], ate: [282, 136], cor: "destaque" },
            ],
          },
        },
        {
          tipo: "licao",
          pergunta: "O que o caso Randy Gardner ilustra?",
          alternativas: [
            "Que dá para viver bem sem dormir",
            "Que a privação prolongada degrada atenção, memória, humor e fala",
            "Que 11 dias acordado melhora a criatividade",
          ],
          correta: 1,
          explicacao: "O caso é um marco histórico da deterioração cognitiva pela privação. Serve de evidência extrema, não de receita.",
        },
      ],
    },
    {
      id: "estudantes-notas",
      titulo: "Estudantes: sono e desempenho",
      blocos: [
        { tipo: "texto", texto: "Além dos casos-limite, há evidência em populações de estudantes. Revisões associam sono regular e suficiente a melhor desempenho acadêmico, e privação/irregularidade a piora. Em adolescentes, o atraso natural do cronotipo contra o horário escolar cedo gera débito crônico; experiências de atrasar o início das aulas mostraram ganhos em sono e indicadores escolares. A mensagem para quem estuda: o sono é parte do método de estudo, não o oposto dele." },
        { tipo: "video", titulo: "Sleep Is Your Superpower — TED (Matt Walker)", youtube: "5MuIMqhT8DM" },
        {
          tipo: "licao",
          pergunta: "Qual relação a literatura descreve entre sono e desempenho escolar?",
          alternativas: [
            "Quanto menos sono, melhores as notas",
            "Sono regular e suficiente associa-se a melhor desempenho; privação e irregularidade, a pior",
            "Sono não tem relação com notas",
          ],
          correta: 1,
          explicacao: "Revisões ligam sono adequado a melhor desempenho acadêmico; privação prejudica atenção, memória e consolidação do estudado.",
        },
      ],
    },
    {
      id: "atletas-musicos",
      titulo: "Atletas e músicos: memória procedural",
      blocos: [
        { tipo: "texto", texto: "A memória procedural (habilidade motora) é onde o 'ganho pelo sono' aparece de forma marcante. Estudos de aprendizagem motora mostram que, após treinar uma sequência, dormir melhora a velocidade e a precisão no dia seguinte — ganho ligado ao REM e aos fusos do sono. Por isso músicos, atletas e cirurgiões em treinamento se beneficiam de dormir entre sessões de prática: parte do aperfeiçoamento acontece offline, enquanto dormem." },
        {
          tipo: "licao",
          pergunta: "Um pianista treina uma passagem difícil, dorme e no dia seguinte toca melhor sem ter treinado de novo. A explicação mais apoiada é:",
          alternativas: [
            "Sorte",
            "Consolidação da memória procedural durante o sono (REM/fusos)",
            "Os dedos ficaram mais fortes dormindo",
          ],
          correta: 1,
          explicacao: "O ganho offline em habilidades motoras é um achado clássico da literatura, atribuído à consolidação durante o sono (REM e fusos do N2).",
        },
      ],
    },
    // ===================== RECURSOS =====================
    {
      id: "recursos-dados",
      titulo: "Dados abertos e para aprofundar",
      blocos: [
        { tipo: "texto", texto: "Para ir além do caderno: há dados abertos de sono para quem quer analisar de verdade. A base Sleep-EDF (PhysioNet) traz 197 registros de polissonografia de noite inteira, com EEG/EOG/EMG e hipnogramas pontuados por técnicos — ótima para entender na prática o que é um estágio de sono. E há livros e revisões para fundamentar. Nada aqui é opinião solta: cada ponto deste caderno aponta para uma fonte." },
        { tipo: "fontes", titulo: "Dados, livros e revisões", itens: [
          { titulo: "Sleep-EDF Database Expanded (PhysioNet) — polissonografia aberta", url: "https://physionet.org/content/sleep-edfx/", tipo: "dataset", nota: "197 PSGs de noite inteira com hipnogramas pontuados. Licença aberta (ODC-By)." },
          { titulo: "Walker & Stickgold — reprint de revisão (Walker Lab)", url: "https://walkerlab.berkeley.edu/reprints/Stickgold&Walker_Sleep%20Medicine_2007.pdf", tipo: "artigo", nota: "Boa porta de entrada para a literatura de consolidação." },
          { titulo: "The benefits of a good night's sleep — lição TED-Ed (página da aula)", url: "https://www.ted.com/talks/shai_marcu_the_benefits_of_a_good_night_s_sleep", tipo: "video", nota: "Resumo acessível da relação sono-memória." },
          { titulo: "Revisão (pt-BR) sono, memória e desempenho (RSD Journal)", url: "https://rsdjournal.org/index.php/rsd/article/download/45114/36073", tipo: "artigo", nota: "Fonte nacional para contexto brasileiro." },
        ] },
        { tipo: "tarefas", itens: [
          { id: "baixar-hipnograma", titulo: "Explore um hipnograma real", entrega: "Acesse a Sleep-EDF no PhysioNet, abra a descrição de um registro e identifique quais sinais (EEG/EOG/EMG) foram gravados. Escreva como cada um ajuda a marcar o estágio." },
        ] },
      ],
    },
    // ===================== COMPILADO =====================
    {
      id: "compilado",
      titulo: "Prancha de síntese",
      blocos: [
        { tipo: "texto", texto: "Síntese do caderno. O sono é parte do aprendizado, não o seu oposto: o SWS consolida fatos (declarativa), o REM e os fusos consolidam habilidades (procedural) e emoções, e tudo isso acontece em ciclos de ~90 min ao longo de uma noite completa. Na prática: durma a faixa recomendada para a sua idade (adulto 7–9h), mantenha horário regular ancorado na luz da manhã, estude-durma-revise, use cochilos curtos com critério, corte cafeína à tarde e meça seu sono por 1–2 semanas antes de ajustar uma variável por vez. Quando houver sinal de doença (apneia, insônia persistente), isso é terreno de profissional. E a regra de ouro que atravessa todo o caderno: nada foi afirmado sem fonte — confira cada ponto nas páginas de referências e nos dados abertos." },
        { tipo: "compilado" },
      ],
    },
  ],
};
