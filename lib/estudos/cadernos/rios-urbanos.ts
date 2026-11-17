import type { CadernoEstudo } from "../cadernosEstudo";

/**
 * Caderno de campo: Qualidade da água em rios urbanos (monitoramento).
 * Conteúdo com lastro: Resolução CONAMA 357/2005 e 430/2011, Lei 9.433/1997 (Política
 * Nacional de Recursos Hídricos), Portaria GM/MS 888/2021 (potabilidade), metodologia do
 * IQA da CETESB (adaptada da NSF), ABNT NBR 9897/9898 e Guia de Coleta, dados abertos de
 * ANA/SNIRH (HidroWeb), relatórios da CETESB e o programa Observando os Rios (SOS Mata
 * Atlântica), além de vídeos reais verificados. As etapas que exigem laboratório acreditado
 * ou responsável técnico viram blocos de mobilização.
 */
export const caderno: CadernoEstudo = {
  id: "rios-urbanos",
  titulo: "Qualidade da água em rios urbanos: ler, medir e monitorar",
  resumo:
    "Da bacia ao laudo: como uma pessoa ou um coletivo aprende a ler um rio de cidade, escolher os parâmetros certos, medir em campo e laboratório, calcular o IQA, comparar com a norma e manter um monitoramento que gera prova e decisão. Cada número tem fonte, norma e o profissional certo na hora certa.",
  paginas: [
    // ===================== CAPÍTULO 1 — CONTEXTO =====================
    {
      id: "abertura",
      titulo: "Como usar este caderno de campo",
      blocos: [
        { tipo: "texto", texto: "Este caderno acompanha quem quer saber, com prova, se o rio que corta a cidade está vivo ou doente. Cada página traz leitura curta, um desenho ou diagrama, tarefas de campo e a fonte que sustenta a afirmação. Nada aqui é opinião: quando aparece um número, ele vem de norma, dataset público ou estudo citado na própria página." },
        { tipo: "texto", texto: "Regra do caderno: antes de concluir, meça; antes de medir, planeje; e antes de declarar uma água própria ou imprópria, compare com a norma certa. Quando a etapa exigir laboratório acreditado ou responsável técnico, a página mostra um campo de mobilização que abre a vaga e acompanha até ficar pronto. Você observa, coleta e registra; o profissional assina o que precisa de assinatura." },
        { tipo: "diagrama", titulo: "O percurso do caderno", codigo: `flowchart TD
  A["Contexto: por que o rio adoece"] --> B["Ler a bacia e as fontes de poluicao"]
  B --> C["Metodo: os parametros que contam"]
  C --> D["Calculo: IQA e classes CONAMA"]
  D --> E["Projeto: plano de monitoramento"]
  E --> F["Execucao: coleta, sonda e laboratorio"]
  F --> G["Manutencao: dados, QA/QC e tendencia"]
  G --> H["Casos reais"]
  H --> I["Prancha de sintese"]` },
      ],
    },
    {
      id: "por-que-importa",
      titulo: "Por que rios urbanos adoecem",
      blocos: [
        { tipo: "texto", texto: "Rio urbano recebe o que a cidade não trata: esgoto doméstico sem coleta, ligações clandestinas, resíduo sólido, óleo da rua lavado pela chuva e, às vezes, efluente industrial. Em grande parte do Brasil o esgoto ainda chega cru ao corpo d'água. O resultado típico é oxigênio no fundo, coliformes nas alturas e vida aquática sumindo justamente nos trechos dentro da mancha urbana." },
        { tipo: "texto", texto: "A boa notícia é que isso é mensurável. Qualidade da água não é cheiro nem cor a olho: é um conjunto de variáveis que se mede, se compara com padrões legais e se acompanha no tempo. Medir é o primeiro passo para cobrar saneamento, defender um enquadramento e provar melhora ou piora com dado, não com achismo." },
        {
          tipo: "licao",
          pergunta: "Qual é a principal carga que degrada a maioria dos rios urbanos brasileiros?",
          alternativas: [
            "Apenas a chuva ácida",
            "Esgoto doméstico lançado sem tratamento",
            "O próprio fluxo natural do rio",
          ],
          correta: 1,
          explicacao: "O lançamento de esgoto doméstico sem tratamento é a causa dominante da degradação de rios urbanos no Brasil, elevando coliformes e DBO e derrubando o oxigênio dissolvido.",
        },
      ],
    },
    {
      id: "o-que-e-qualidade",
      titulo: "O que é, de fato, qualidade da água",
      blocos: [
        { tipo: "texto", texto: "Qualidade da água é o grau em que ela serve a um uso: abastecer depois de tratada, banhar, pescar, preservar a vida aquática ou apenas navegar. Não existe água boa em abstrato; existe água adequada ou inadequada a um uso. É por isso que a norma brasileira classifica os rios por classes de uso, e não por uma nota única de pureza." },
        {
          tipo: "prancha",
          titulo: "O espectro: do uso mais exigente ao menos exigente",
          desenho: {
            legenda: "Quanto mais exigente o uso (beber, banhar), mais limpa a água precisa estar. A classe do rio cresce conforme a qualidade exigida cai.",
            primitivas: [
              { t: "linha", de: [20, 100], ate: [288, 100], cor: "tinta" },
              { t: "seta", de: [20, 100], ate: [20, 40], cor: "destaque" },
              { t: "rotulo", p: [26, 34], texto: "Mais exigente" },
              { t: "circulo", c: [50, 100], r: 10, cor: "destaque" },
              { t: "rotulo", p: [30, 120], texto: "Classe 1" },
              { t: "rotulo", p: [34, 132], texto: "Abastec." },
              { t: "circulo", c: [120, 100], r: 10, cor: "tinta" },
              { t: "rotulo", p: [100, 120], texto: "Classe 2" },
              { t: "rotulo", p: [104, 132], texto: "Banho" },
              { t: "circulo", c: [195, 100], r: 10, cor: "suave" },
              { t: "rotulo", p: [176, 120], texto: "Classe 3" },
              { t: "rotulo", p: [178, 132], texto: "Irrigacao" },
              { t: "circulo", c: [265, 100], r: 10, hachura: true },
              { t: "rotulo", p: [246, 120], texto: "Classe 4" },
              { t: "rotulo", p: [244, 132], texto: "Navegacao" },
            ],
          },
        },
        { tipo: "texto", texto: "Guarde a distinção: qualidade medida é o que a água está hoje; enquadramento é a classe que a sociedade decide que aquele trecho deve atingir. Monitorar serve para comparar os dois e mostrar a distância entre o rio real e a meta legal." },
      ],
    },
    {
      id: "fontes-contexto",
      titulo: "Fontes: marco legal e panorama",
      blocos: [
        { tipo: "texto", texto: "Estes endereços sustentam o capítulo e são a porta de entrada do monitoramento no Brasil. A água é um bem público (Lei 9.433/1997), e sua classificação por uso vem da Resolução CONAMA 357/2005." },
        { tipo: "fontes", titulo: "Base legal e institucional", itens: [
          { titulo: "Lei 9.433/1997 — Política Nacional de Recursos Hídricos", url: "https://www.planalto.gov.br/ccivil_03/leis/l9433.htm", tipo: "norma", nota: "Água como bem público, bacia como unidade de gestão, enquadramento." },
          { titulo: "Resolução CONAMA 357/2005 (texto integral)", url: "https://faolex.fao.org/docs/pdf/bra173548.pdf", tipo: "norma", nota: "Classificação dos corpos d'água e padrões por classe de uso." },
          { titulo: "ANA — Monitoramento e qualidade da água", url: "https://www.gov.br/ana/pt-br/assuntos/monitoramento-e-eventos-criticos/qualidade-da-agua", tipo: "site", nota: "Programa Nacional de Qualidade da Água (PNQA) e indicadores." },
        ] },
        {
          tipo: "licao",
          pergunta: "O que a Resolução CONAMA 357/2005 faz?",
          alternativas: ["Define o preço da água tratada", "Classifica os corpos d'água por classes de uso e fixa padrões de qualidade", "Proíbe qualquer uso de rio urbano"],
          correta: 1,
          explicacao: "A CONAMA 357/2005 classifica águas doces, salobras e salinas em classes conforme os usos preponderantes e estabelece os padrões de qualidade de cada classe.",
        },
      ],
    },

    // ===================== CAPÍTULO 2 — LER O RIO E A BACIA =====================
    {
      id: "bacia-hidrografica",
      titulo: "A bacia manda: tudo o que cai, escorre pro rio",
      blocos: [
        { tipo: "texto", texto: "O rio é o ponto baixo de uma bacia: toda a chuva que cai na área drenada escorre para ele, carregando o que encontra no caminho. Por isso a unidade de análise nunca é só o ponto da coleta, e sim a bacia que o alimenta. Telhado, rua, posto de combustível, lavoura e estação de esgoto a montante entram todos na conta do que o rio recebe." },
        {
          tipo: "prancha",
          titulo: "Bacia de drenagem e o ponto de coleta",
          desenho: {
            legenda: "Os afluentes drenam a área da bacia; a qualidade no ponto de coleta soma tudo o que entrou a montante.",
            primitivas: [
              { t: "curva", pts: [[20, 30], [60, 60], [90, 100], [130, 150], [180, 175]], cor: "tinta" },
              { t: "curva", pts: [[90, 100], [120, 90], [160, 95]], cor: "suave" },
              { t: "curva", pts: [[60, 60], [100, 55], [130, 70]], cor: "suave" },
              { t: "rotulo", p: [150, 88], texto: "Afluentes" },
              { t: "circulo", c: [180, 175], r: 8, cor: "destaque" },
              { t: "rotulo", p: [190, 178], texto: "Ponto de coleta" },
              { t: "seta", de: [240, 40], ate: [200, 70], cor: "suave" },
              { t: "rotulo", p: [230, 30], texto: "Area da bacia" },
              { t: "rotulo", p: [24, 20], texto: "Nascentes" },
            ],
          },
        },
        { tipo: "tarefas", itens: [
          { id: "delimitar-bacia", titulo: "Delimite a bacia do seu ponto", entrega: "Num mapa (HidroWeb ou Google Earth), marque o ponto de coleta e trace, por cima dos divisores de água, a área que drena para ele. Liste os usos do solo que vê dentro dela." },
        ] },
      ],
    },
    {
      id: "fontes-poluicao",
      titulo: "Fontes pontuais e fontes difusas",
      blocos: [
        { tipo: "texto", texto: "Poluição tem dois endereços. Fonte pontual sai por um ponto identificável: um tubo de esgoto, uma galeria, um emissário industrial. Dá para fotografar, georreferenciar e cobrar. Fonte difusa chega espalhada: a chuva lava a cidade inteira e arrasta óleo, fezes de animais, sedimento e lixo para o rio sem um cano único de origem." },
        { tipo: "diagrama", titulo: "De onde vem a carga", codigo: `flowchart LR
  P1["Tubo de esgoto"] --> R["Rio"]
  P2["Galeria pluvial com esgoto"] --> R
  P3["Efluente industrial"] --> R
  D1["Escoamento da rua na chuva"] --> R
  D2["Residuo solido e erosao"] --> R
  P1 -.pontual.-> R
  D1 -.difusa.-> R` },
        {
          tipo: "licao",
          pergunta: "Por que a fonte difusa é mais difícil de controlar que a pontual?",
          alternativas: ["Porque é sempre maior", "Porque chega espalhada, lavada pela chuva, sem um único ponto de lançamento", "Porque não causa dano"],
          correta: 1,
          explicacao: "A fonte difusa (escoamento urbano, erosão) não tem um ponto único de descarga; é carregada pela chuva de toda a bacia, o que exige controle no uso do solo, e não só fiscalizar um tubo.",
        },
      ],
    },
    {
      id: "caminhar-o-rio",
      titulo: "Caminhar o rio: a inspeção de campo",
      blocos: [
        { tipo: "texto", texto: "Antes de qualquer frasco, caminhe o trecho. Muita informação está à vista: espuma persistente, óleo iridescente, cor anormal, cheiro de esgoto, lixo preso na vegetação, tubos lançando, assoreamento e ausência de peixe ou de mata ciliar. Esse diagnóstico visual orienta onde colocar os pontos e o que esperar das análises." },
        { tipo: "texto", texto: "Registre com método: data, hora, clima dos últimos dias (chuva muda tudo), coordenada de GPS e foto. Um ponto inspecionado depois de três dias secos conta uma história; o mesmo ponto após chuva forte conta outra. Anote sempre a condição de tempo." },
        { tipo: "tarefas", itens: [
          { id: "ficha-inspecao", titulo: "Monte a ficha de inspeção visual", entrega: "Percorra 300 m do rio e preencha, para cada achado (espuma, tubo, lixo, cor, cheiro), uma linha com coordenada de GPS, foto e a condição de chuva dos últimos três dias." },
        ] },
      ],
    },
    {
      id: "mapa-lancamentos",
      titulo: "Mapear lançamentos, outorgas e usuários",
      blocos: [
        { tipo: "texto", texto: "Quem usa a água e quem lança efluente precisa de autorização do poder público: a outorga de direito de uso (Lei 9.433/1997) e, para lançar, o licenciamento com padrões da CONAMA 430/2011. Esses cadastros são públicos. Cruzar o que você vê no campo com o que está outorgado revela lançamentos irregulares e dá nome aos responsáveis." },
        { tipo: "tarefas", itens: [
          { id: "cruzar-outorgas", titulo: "Cruze campo e cadastro", entrega: "Liste os lançamentos que você mapeou e procure, no portal do órgão gestor estadual ou da ANA, se existe outorga para cada um. Marque os que não aparecem." },
        ] },
        { tipo: "fontes", titulo: "Lançamento e uso da água", itens: [
          { titulo: "Resolução CONAMA 430/2011 — lançamento de efluentes", url: "https://conama.mma.gov.br/?option=com_sisconama&task=arquivo.download&id=646", tipo: "norma", nota: "Padrões e condições para lançamento de efluentes, complementa a 357/2005." },
          { titulo: "SNIRH — HidroWeb (dados de recursos hídricos)", url: "https://www.snirh.gov.br/hidroweb/apresentacao", tipo: "dataset", nota: "Estações, séries e localização de pontos de monitoramento." },
        ] },
      ],
    },
    {
      id: "video-esgoto",
      titulo: "Ver o problema: esgoto que chega ao rio",
      blocos: [
        { tipo: "texto", texto: "O diagnóstico do saneamento brasileiro está mapeado. Assista aos dois vídeos pensando no seu rio: quanto do esgoto da sua cidade é coletado e tratado, e o que acontece com o resto. É esse resto que você vai medir na água." },
        { tipo: "video", titulo: "Atlas do Esgoto mostra a situação do saneamento brasileiro", youtube: "DUFc3nJSX0E" },
        { tipo: "video", titulo: "Principais etapas do processo de tratamento de esgoto (ETE)", youtube: "1NG6DIgo1Ks" },
        { tipo: "tarefas", itens: [
          { id: "saneamento-cidade", titulo: "Levante o saneamento da sua cidade", entrega: "No Painel do Saneamento (SNIS), anote os índices de coleta e de tratamento de esgoto do seu município e relacione-os com o que você observou no rio." },
        ] },
      ],
    },

    // ===================== CAPÍTULO 3 — MÉTODO: OS PARÂMETROS =====================
    {
      id: "parametros-basicos",
      titulo: "Os parâmetros que contam",
      blocos: [
        { tipo: "texto", texto: "Qualidade da água se descreve por três famílias de parâmetros. Físicos: temperatura, turbidez, cor, sólidos. Químicos: pH, oxigênio dissolvido, DBO, nutrientes (nitrogênio e fósforo), metais. Biológicos: coliformes, clorofila, comunidade de organismos. O monitoramento escolhe um conjunto que responda à pergunta, não mede tudo às cegas." },
        { tipo: "diagrama", titulo: "Três famílias de parâmetros", codigo: `flowchart TD
  Q["Qualidade da agua"] --> F["Fisicos: temperatura, turbidez, solidos"]
  Q --> C["Quimicos: pH, OD, DBO, N, P, metais"]
  Q --> B["Biologicos: coliformes, bioindicadores"]
  F --> U["Indice e enquadramento"]
  C --> U
  B --> U` },
        { tipo: "texto", texto: "Para rio urbano, um núcleo quase obrigatório é oxigênio dissolvido, DBO, coliformes termotolerantes, pH, turbidez, nitrogênio e fósforo, temperatura e sólidos. Não por acaso, são justamente os nove parâmetros do IQA, que vamos calcular adiante." },
      ],
    },
    {
      id: "od-temperatura",
      titulo: "Oxigênio dissolvido e temperatura",
      blocos: [
        { tipo: "texto", texto: "Oxigênio dissolvido (OD) é o parâmetro mais revelador de um rio urbano. Peixe e microvida aeróbia dependem dele; matéria orgânica do esgoto o consome. Um rio saudável fica perto da saturação; um rio tomado por esgoto despenca para perto de zero. A CONAMA 357 pede OD acima de 5 mg/L na classe 2 e acima de 6 mg/L na classe 1." },
        { tipo: "texto", texto: "Temperatura comanda o OD: água mais quente dissolve menos oxigênio. Por isso se mede os dois juntos e se anota a hora do dia. OD e temperatura mudam rápido ao sair da água, então são medidos in situ, na própria margem, não no laboratório horas depois." },
        {
          tipo: "prancha",
          titulo: "OD cai a jusante do lançamento (curva de depleção)",
          desenho: {
            legenda: "Logo abaixo do esgoto o oxigênio despenca; rio abaixo, se não houver nova carga, ele se recupera. É a curva de depleção/recuperação.",
            primitivas: [
              { t: "linha", de: [24, 24], ate: [24, 170], cor: "suave" },
              { t: "linha", de: [24, 170], ate: [290, 170], cor: "suave" },
              { t: "rotulo", p: [0, 20], texto: "OD" },
              { t: "rotulo", p: [250, 182], texto: "Rio abaixo" },
              { t: "curva", pts: [[30, 50], [70, 55], [110, 130], [160, 150], [220, 90], [284, 65]], cor: "destaque" },
              { t: "seta", de: [95, 30], ate: [95, 70], cor: "tinta" },
              { t: "rotulo", p: [78, 24], texto: "Lancamento" },
              { t: "rotulo", p: [120, 162], texto: "Zona critica" },
            ],
          },
        },
        {
          tipo: "licao",
          pergunta: "Por que OD e temperatura são medidos in situ, na margem?",
          alternativas: ["Para economizar frasco", "Porque mudam rápido ao sair da água e perderiam o valor real no laboratório", "Porque a norma proíbe levar água ao laboratório"],
          correta: 1,
          explicacao: "OD e temperatura variam rapidamente com a exposição ao ar e ao calor; só a medição no local, no momento da coleta, dá o valor representativo.",
        },
      ],
    },
    {
      id: "ph-condutividade",
      titulo: "pH e condutividade elétrica",
      blocos: [
        { tipo: "texto", texto: "pH mede o quão ácida ou básica está a água, de 0 a 14. A vida aquática e a CONAMA 357 pedem pH entre 6,0 e 9,0 para águas doces de classe 2. Valores fora dessa janela sinalizam lançamento industrial, drenagem ácida ou descontrole. Condutividade elétrica mede os sais dissolvidos: sobe com esgoto e com despejos, e é um alarme barato e rápido de contaminação." },
        {
          tipo: "prancha",
          titulo: "Escala de pH e a faixa aceitável",
          desenho: {
            legenda: "A faixa 6,0 a 9,0 (CONAMA 357, classe 2) é a janela segura para a vida aquática em água doce.",
            primitivas: [
              { t: "retangulo", p: [20, 80], w: 264, h: 26, cor: "tinta" },
              { t: "retangulo", p: [128, 80], w: 79, h: 26, hachura: true },
              { t: "rotulo", p: [16, 120], texto: "0 acido" },
              { t: "rotulo", p: [140, 70], texto: "6,0" },
              { t: "rotulo", p: [196, 70], texto: "9,0" },
              { t: "rotulo", p: [250, 120], texto: "14 basico" },
              { t: "rotulo", p: [128, 128], texto: "Faixa aceitavel" },
              { t: "seta", de: [167, 134], ate: [167, 108], cor: "destaque" },
            ],
          },
        },
        { tipo: "tarefas", itens: [
          { id: "medir-ph-cond", titulo: "Meça pH e condutividade no ponto", entrega: "Com fita/sonda de pH e condutivímetro, registre os dois valores no ponto e repita a jusante de um lançamento suspeito. Compare com a faixa 6,0 a 9,0." },
        ] },
      ],
    },
    {
      id: "turbidez-solidos",
      titulo: "Turbidez e sólidos",
      blocos: [
        { tipo: "texto", texto: "Turbidez mede quanto a água está turva por partículas em suspensão, em unidades nefelométricas (UNT/NTU). Sobe com erosão, obra, chuva e lançamento. Água turva bloqueia luz, prejudica a fotossíntese e abriga patógenos. A CONAMA 357 limita turbidez a 100 UNT na classe 2. Sólidos totais somam tudo o que está dissolvido e em suspensão." },
        {
          tipo: "prancha",
          titulo: "O que a turbidez enxerga",
          desenho: {
            legenda: "A luz atravessa a água limpa e se espalha na turva; o turbidímetro mede essa dispersão.",
            primitivas: [
              { t: "retangulo", p: [30, 50], w: 90, h: 100, cor: "suave" },
              { t: "rotulo", p: [40, 160], texto: "Limpa" },
              { t: "seta", de: [10, 100], ate: [30, 100], cor: "destaque" },
              { t: "seta", de: [120, 100], ate: [140, 100], cor: "destaque" },
              { t: "retangulo", p: [180, 50], w: 90, h: 100, hachura: true },
              { t: "rotulo", p: [190, 160], texto: "Turva" },
              { t: "seta", de: [160, 100], ate: [180, 100], cor: "destaque" },
              { t: "seta", de: [225, 100], ate: [245, 70], cor: "tinta" },
              { t: "seta", de: [225, 100], ate: [245, 130], cor: "tinta" },
              { t: "rotulo", p: [250, 60], texto: "Dispersa" },
            ],
          },
        },
        {
          tipo: "licao",
          pergunta: "Qual é o limite de turbidez para água doce de classe 2 na CONAMA 357?",
          alternativas: ["10 UNT", "100 UNT", "1000 UNT"],
          correta: 1,
          explicacao: "A CONAMA 357/2005 fixa turbidez de até 100 UNT para águas doces de classe 2. Valores acima indicam carga de sedimento ou lançamento.",
        },
      ],
    },
    {
      id: "coliformes-dbo",
      titulo: "Coliformes e DBO: a marca do esgoto",
      blocos: [
        { tipo: "texto", texto: "Dois parâmetros denunciam esgoto doméstico. Coliformes termotolerantes (fecais) indicam contaminação por fezes e risco de doença; a CONAMA 357 admite até 1000 NMP/100 mL para contato primário em classe 2. DBO (demanda bioquímica de oxigênio) mede quanta matéria orgânica há, pela quantidade de oxigênio que os micro-organismos gastam para degradá-la. DBO alta significa esgoto e é o que suga o OD do rio." },
        { tipo: "diagrama", titulo: "Esgoto, DBO e a morte do oxigênio", codigo: `flowchart LR
  E["Esgoto domestico"] --> M["Materia organica"]
  M --> B["Microrganismos degradam"]
  B --> O["Consomem oxigenio dissolvido"]
  O --> D["OD cai, vida aquatica morre"]
  E --> C["Coliformes termotolerantes sobem"]` },
        { tipo: "mobilizacao", papel: "Laboratório de microbiologia / físico-química de águas (acreditado ISO/IEC 17025)", porque: "Coliformes termotolerantes e DBO exigem ensaio laboratorial com meio de cultura, incubação e método validado; não há leitura visual confiável em campo.", entregaEsperada: "Laudo com coliformes termotolerantes (NMP/100 mL) e DBO5,20 (mg/L), método e limite de quantificação, comparado aos limites da CONAMA 357 para a classe pretendida.", gerenciadoPor: "zaeon" },
      ],
    },
    {
      id: "nutrientes-eutrofizacao",
      titulo: "Nutrientes e eutrofização",
      blocos: [
        { tipo: "texto", texto: "Nitrogênio e fósforo são adubo. Em excesso, vindos de esgoto, detergente e fertilizante, disparam o crescimento de algas e aguapés: é a eutrofização. A água fica verde, forma florações, e quando as algas morrem e se decompõem o oxigênio despenca de novo. Fósforo total costuma ser o fator que limita, e por isso é alvo de controle." },
        { tipo: "texto", texto: "Em rio urbano parado ou represado, a eutrofização é visível: lâmina verde, mau cheiro, mortandade de peixe no calor. Medir nitrogênio e fósforo mostra se o rio está sendo adubado e por quem, cruzando com as fontes mapeadas no capítulo anterior." },
        { tipo: "video", titulo: "Como usar a DBO e a DQO para calcular a eficiência da ETE", youtube: "NCZ9UWAnw2c" },
      ],
    },

    // ===================== CAPÍTULO 4 — CÁLCULO: IQA E CLASSES =====================
    {
      id: "iqa-o-que-e",
      titulo: "O IQA: uma nota de 0 a 100",
      blocos: [
        { tipo: "texto", texto: "O Índice de Qualidade das Águas (IQA) resume nove parâmetros numa única nota de 0 a 100. Foi criado pela National Sanitation Foundation (NSF) dos EUA nos anos 1970 e adaptado no Brasil pela CETESB desde 1975. Serve para comunicar: em vez de nove números, uma nota que todo mundo entende e que permite comparar pontos e anos." },
        { tipo: "video", titulo: "Conheça o IQA - Índice de Qualidade das Águas", youtube: "M9Fq6VSpzrc" },
        { tipo: "texto", texto: "O IQA foi pensado para avaliar água bruta destinada a abastecimento público, com foco em contaminação por esgoto. Ele não enxerga metais pesados nem compostos orgânicos industriais, então não substitui a análise completa; para isso a CETESB usa índices complementares (IAP, IVA). O IQA é o retrato rápido, não o laudo final." },
      ],
    },
    {
      id: "iqa-pesos",
      titulo: "Os nove parâmetros e seus pesos",
      blocos: [
        { tipo: "texto", texto: "Cada um dos nove parâmetros entra no IQA com um peso que reflete sua importância. Na metodologia da CETESB os pesos são: oxigênio dissolvido 0,17; coliformes termotolerantes 0,15; pH 0,12; DBO 0,10; temperatura 0,10; nitrogênio total 0,10; fósforo total 0,10; turbidez 0,08; e resíduo (sólidos) total 0,08. Somados, dão exatamente 1,00." },
        {
          tipo: "prancha",
          titulo: "Peso de cada parâmetro no IQA",
          desenho: {
            legenda: "A barra é proporcional ao peso. OD e coliformes pesam mais porque traduzem direto a contaminação por esgoto.",
            primitivas: [
              { t: "rotulo", p: [10, 18], texto: "OD 0,17" },
              { t: "retangulo", p: [96, 12], w: 170, h: 12, cor: "destaque" },
              { t: "rotulo", p: [10, 36], texto: "Colif. 0,15" },
              { t: "retangulo", p: [96, 30], w: 150, h: 12, cor: "destaque" },
              { t: "rotulo", p: [10, 54], texto: "pH 0,12" },
              { t: "retangulo", p: [96, 48], w: 120, h: 12, cor: "tinta" },
              { t: "rotulo", p: [10, 72], texto: "DBO 0,10" },
              { t: "retangulo", p: [96, 66], w: 100, h: 12, cor: "tinta" },
              { t: "rotulo", p: [10, 90], texto: "Temp. 0,10" },
              { t: "retangulo", p: [96, 84], w: 100, h: 12, cor: "tinta" },
              { t: "rotulo", p: [10, 108], texto: "N tot. 0,10" },
              { t: "retangulo", p: [96, 102], w: 100, h: 12, cor: "tinta" },
              { t: "rotulo", p: [10, 126], texto: "P tot. 0,10" },
              { t: "retangulo", p: [96, 120], w: 100, h: 12, cor: "tinta" },
              { t: "rotulo", p: [10, 144], texto: "Turb. 0,08" },
              { t: "retangulo", p: [96, 138], w: 80, h: 12, cor: "suave" },
              { t: "rotulo", p: [10, 162], texto: "Solidos 0,08" },
              { t: "retangulo", p: [96, 156], w: 80, h: 12, cor: "suave" },
            ],
          },
        },
        {
          tipo: "licao",
          pergunta: "Qual parâmetro tem o maior peso no IQA e por quê?",
          alternativas: ["Turbidez, porque é fácil de medir", "Oxigênio dissolvido (0,17), porque traduz direto a saúde do rio e o efeito do esgoto", "pH, porque varia menos"],
          correta: 1,
          explicacao: "O oxigênio dissolvido tem o maior peso (0,17): é o parâmetro que melhor resume a capacidade do rio de sustentar vida e o impacto da carga orgânica.",
        },
      ],
    },
    {
      id: "iqa-formula",
      titulo: "A fórmula: um produtório ponderado",
      blocos: [
        { tipo: "texto", texto: "O IQA é um produtório: multiplica-se a qualidade de cada parâmetro elevada ao seu peso. IQA = produto de qi elevado a wi, para os nove parâmetros, onde qi é a qualidade do parâmetro (0 a 100, lida em curvas-padrão) e wi é o peso. Como é produto, e não média, um único parâmetro muito ruim derruba a nota inteira, o que é proposital: basta um veneno para a água ficar imprópria." },
        { tipo: "texto", texto: "Cada qi sai de uma curva de qualidade específica, publicada pela CETESB, que converte o valor medido (ex.: 4 mg/L de OD) numa nota de 0 a 100. Você não inventa o qi: lê na curva. O cálculo final é o produtório desses nove qi ponderados." },
        { tipo: "diagrama", titulo: "Do valor medido à nota IQA", codigo: `flowchart TD
  A["Medir 9 parametros"] --> B["Ler qi na curva de qualidade de cada um"]
  B --> C["Elevar cada qi ao seu peso wi"]
  C --> D["Multiplicar os 9 resultados"]
  D --> E["IQA de 0 a 100"]
  E --> F["Classificar: otima a pessima"]` },
        { tipo: "tarefas", itens: [
          { id: "montar-planilha-iqa", titulo: "Monte a planilha do IQA", entrega: "Numa planilha, crie uma linha por parâmetro com valor medido, qi (da curva CETESB) e peso. Implemente o produtório e teste com um conjunto de dados de exemplo." },
        ] },
      ],
    },
    {
      id: "iqa-exemplo",
      titulo: "Classificar o resultado: de ótima a péssima",
      blocos: [
        { tipo: "texto", texto: "Com o IQA calculado, a CETESB classifica o ponto em cinco faixas (padrão de São Paulo): ótima de 79 a 100; boa de 51 a 79; regular de 36 a 51; ruim de 19 a 36; e péssima abaixo de 19. Trechos urbanos de rios muito poluídos caem com frequência em ruim ou péssima, sobretudo na estiagem, quando o esgoto não é diluído." },
        {
          tipo: "prancha",
          titulo: "Faixas de classificação do IQA (CETESB)",
          desenho: {
            legenda: "A nota de 0 a 100 cai numa das cinco faixas. Rio urbano poluído costuma ficar à esquerda.",
            primitivas: [
              { t: "retangulo", p: [20, 70], w: 264, h: 28, cor: "tinta" },
              { t: "linha", de: [70, 66], ate: [70, 102], cor: "suave" },
              { t: "linha", de: [115, 66], ate: [115, 102], cor: "suave" },
              { t: "linha", de: [155, 66], ate: [155, 102], cor: "suave" },
              { t: "linha", de: [229, 66], ate: [229, 102], cor: "suave" },
              { t: "rotulo", p: [30, 88], texto: "Pessima" },
              { t: "rotulo", p: [76, 88], texto: "Ruim" },
              { t: "rotulo", p: [118, 88], texto: "Reg." },
              { t: "rotulo", p: [175, 88], texto: "Boa" },
              { t: "rotulo", p: [236, 88], texto: "Otima" },
              { t: "rotulo", p: [14, 112], texto: "0" },
              { t: "rotulo", p: [60, 112], texto: "19" },
              { t: "rotulo", p: [106, 112], texto: "36" },
              { t: "rotulo", p: [146, 112], texto: "51" },
              { t: "rotulo", p: [222, 112], texto: "79" },
              { t: "rotulo", p: [276, 112], texto: "100" },
            ],
          },
        },
        {
          tipo: "licao",
          pergunta: "Por que o IQA é um produtório, e não uma média simples?",
          alternativas: ["Por tradição", "Para que um único parâmetro muito ruim derrube a nota, sem ser mascarado pelos bons", "Para dar sempre nota alta"],
          correta: 1,
          explicacao: "No produtório ponderado, um parâmetro péssimo puxa a nota para baixo e não é compensado pelos outros, refletindo que basta uma variável crítica para a água ficar imprópria.",
        },
      ],
    },
    {
      id: "conama-enquadramento",
      titulo: "Classes CONAMA e enquadramento",
      blocos: [
        { tipo: "texto", texto: "O IQA dá a nota; a CONAMA 357 dá o padrão legal. Para águas doces há classe especial e classes 1 a 4. Alguns limites de classe 2 (banho e abastecimento após tratamento convencional): OD acima de 5 mg/L, DBO até 5 mg/L, pH de 6 a 9, turbidez até 100 UNT, coliformes termotolerantes até 1000 NMP/100 mL. Comparar o medido com esses limites diz se o rio cumpre a classe." },
        {
          tipo: "prancha",
          titulo: "OD e DBO por classe (CONAMA 357, água doce)",
          desenho: {
            legenda: "OD minimo cai e DBO maxima sobe conforme a classe piora. Classe 1 e a mais exigente.",
            primitivas: [
              { t: "rotulo", p: [12, 20], texto: "Classe" },
              { t: "rotulo", p: [90, 20], texto: "OD min" },
              { t: "rotulo", p: [180, 20], texto: "DBO max" },
              { t: "linha", de: [10, 30], ate: [280, 30], cor: "suave" },
              { t: "rotulo", p: [12, 48], texto: "1" },
              { t: "rotulo", p: [90, 48], texto: "6 mg/L" },
              { t: "rotulo", p: [180, 48], texto: "3 mg/L" },
              { t: "rotulo", p: [12, 72], texto: "2" },
              { t: "rotulo", p: [90, 72], texto: "5 mg/L" },
              { t: "rotulo", p: [180, 72], texto: "5 mg/L" },
              { t: "rotulo", p: [12, 96], texto: "3" },
              { t: "rotulo", p: [90, 96], texto: "4 mg/L" },
              { t: "rotulo", p: [180, 96], texto: "10 mg/L" },
              { t: "rotulo", p: [12, 120], texto: "4" },
              { t: "rotulo", p: [90, 120], texto: "2 mg/L" },
              { t: "rotulo", p: [180, 120], texto: "sem limite" },
              { t: "seta", de: [40, 40], ate: [40, 128], cor: "destaque" },
              { t: "rotulo", p: [46, 150], texto: "qualidade exigida cai" },
            ],
          },
        },
        { tipo: "fontes", titulo: "Padrões de qualidade e índice", itens: [
          { titulo: "Resolução CONAMA 357/2005 (texto integral)", url: "https://faolex.fao.org/docs/pdf/bra173548.pdf", tipo: "norma", nota: "Limites por classe: OD, DBO, pH, turbidez, coliformes, nutrientes." },
          { titulo: "CETESB — Águas interiores (metodologia e relatórios)", url: "https://cetesb.sp.gov.br/aguas-interiores/", tipo: "site", nota: "Apêndice de metodologia do IQA, curvas de qualidade e pesos." },
          { titulo: "CETESB — Publicações e relatórios de qualidade das águas", url: "https://cetesb.sp.gov.br/aguas-interiores/publicacoes-e-relatorios/", tipo: "dataset", nota: "Relatórios anuais com IQA por ponto nos rios paulistas." },
        ] },
      ],
    },

    // ===================== CAPÍTULO 5 — PROJETO DO MONITORAMENTO =====================
    {
      id: "plano-monitoramento",
      titulo: "Desenhar o plano de monitoramento",
      blocos: [
        { tipo: "texto", texto: "Monitorar não é coletar quando dá. Começa por uma pergunta clara: o esgoto da rua X piora o rio? A estação de tratamento melhora a jusante? O trecho cumpre a classe 2? A pergunta define os parâmetros, os pontos, a frequência e o critério de comparação. Sem pergunta, você gera números que não respondem nada." },
        { tipo: "diagrama", titulo: "Da pergunta ao dado útil", codigo: `flowchart TD
  P["Pergunta do monitoramento"] --> Q["Quais parametros respondem?"]
  Q --> O["Onde amostrar (pontos)"]
  O --> F["Quando e com que frequencia"]
  F --> E["Executar coleta e analise"]
  E --> C["Comparar com norma e com o historico"]
  C --> D["Decisao / comunicacao"]
  D -->|novo ciclo| P` },
        { tipo: "tarefas", itens: [
          { id: "escrever-pergunta", titulo: "Escreva a pergunta do seu monitoramento", entrega: "Em uma frase, defina o que você quer provar ou descobrir no rio. Liste os parâmetros mínimos que respondem a essa pergunta e o padrão (classe CONAMA) com que vai comparar." },
        ] },
      ],
    },
    {
      id: "pontos-amostragem",
      titulo: "Onde amostrar: montante e jusante",
      blocos: [
        { tipo: "texto", texto: "A regra de ouro para flagrar um impacto é o par montante/jusante: um ponto antes do lançamento (controle) e um depois (efeito). A diferença entre eles isola o que aquela fonte faz ao rio. Para um panorama de bacia, distribuem-se pontos em afluentes, antes e depois das cidades e perto de captações, sempre em locais seguros e de acesso repetível." },
        {
          tipo: "prancha",
          titulo: "Par montante/jusante de um lançamento",
          desenho: {
            legenda: "P1 a montante é o controle; P2 a jusante capta o efeito do lançamento. A diferença mede o impacto.",
            primitivas: [
              { t: "linha", de: [20, 110], ate: [288, 110], cor: "tinta" },
              { t: "linha", de: [20, 128], ate: [288, 128], cor: "tinta" },
              { t: "seta", de: [250, 119], ate: [280, 119], cor: "suave" },
              { t: "rotulo", p: [255, 100], texto: "fluxo" },
              { t: "circulo", c: [70, 119], r: 7, cor: "destaque" },
              { t: "rotulo", p: [52, 150], texto: "P1 montante" },
              { t: "seta", de: [150, 60], ate: [150, 108], cor: "tinta" },
              { t: "rotulo", p: [128, 50], texto: "Lancamento" },
              { t: "circulo", c: [210, 119], r: 7, cor: "destaque" },
              { t: "rotulo", p: [192, 150], texto: "P2 jusante" },
            ],
          },
        },
        {
          tipo: "licao",
          pergunta: "Para medir o impacto de um lançamento, onde ficam os pontos?",
          alternativas: ["Dois pontos na mesma margem", "Um a montante (controle) e outro a jusante do lançamento", "Só um ponto, em cima do tubo"],
          correta: 1,
          explicacao: "O par montante/jusante isola o efeito da fonte: o ponto de montante é o controle e o de jusante capta a alteração causada pelo lançamento.",
        },
      ],
    },
    {
      id: "frequencia-sazonalidade",
      titulo: "Quando amostrar: a chuva muda tudo",
      blocos: [
        { tipo: "texto", texto: "Um rio tem dois regimes. Na estiagem, o esgoto é pouco diluído e a concentração de poluentes sobe: é o pior caso para OD e coliformes. Na chuva, a vazão cresce e dilui, mas a enxurrada traz carga difusa e turbidez. Amostrar só num regime engana. O plano define frequência (mensal, por exemplo) e coletas específicas em seca e em cheia." },
        {
          tipo: "prancha",
          titulo: "Vazão ao longo do ano e janelas de coleta",
          desenho: {
            legenda: "A vazão sobe na estação chuvosa e cai na seca; convém amostrar nos dois extremos, não só num.",
            primitivas: [
              { t: "linha", de: [24, 24], ate: [24, 160], cor: "suave" },
              { t: "linha", de: [24, 160], ate: [290, 160], cor: "suave" },
              { t: "rotulo", p: [0, 20], texto: "Vazao" },
              { t: "curva", pts: [[30, 60], [80, 45], [130, 70], [180, 130], [230, 140], [284, 95]], cor: "destaque" },
              { t: "circulo", c: [80, 45], r: 5, cor: "tinta" },
              { t: "rotulo", p: [60, 32], texto: "Cheia" },
              { t: "circulo", c: [210, 138], r: 5, cor: "tinta" },
              { t: "rotulo", p: [196, 150], texto: "Seca" },
              { t: "rotulo", p: [120, 172], texto: "meses" },
            ],
          },
        },
        { tipo: "tarefas", itens: [
          { id: "calendario-coleta", titulo: "Monte o calendário de coleta", entrega: "Defina a frequência (ex.: mensal) e marque, no calendário climático da sua região, uma coleta no auge da seca e uma após chuva forte. Anote o critério de 'chuva forte' em mm." },
        ] },
      ],
    },
    {
      id: "seguranca-campo",
      titulo: "Segurança, ética e responsabilidade técnica",
      blocos: [
        { tipo: "texto", texto: "Água de rio urbano pode conter patógenos e produtos tóxicos. Trabalhe com luvas, evite contato com a boca, higienize-se depois e nunca entre em correnteza ou margem instável sozinho. Água parada e contaminada transmite doença: a coleta é com equipamento, não com a mão nua. Segurança vem antes de qualquer dado." },
        { tipo: "texto", texto: "Monitoramento com valor legal, para embasar auto de infração, outorga, enquadramento ou ação judicial, precisa de método rastreável e, muitas vezes, de um responsável técnico que assine. O dado de ciência cidadã é poderoso para mobilizar e triar, mas o laudo oficial tem exigências formais." },
        { tipo: "mobilizacao", papel: "Responsável técnico (engenheiro ambiental/sanitarista ou químico, com ART)", porque: "Monitoramento destinado a licenciamento, outorga, enquadramento ou prova judicial exige plano e laudo assinados por profissional habilitado, com Anotação de Responsabilidade Técnica.", entregaEsperada: "Plano de amostragem e relatório técnico assinados, com ART, método, pontos georreferenciados e comparação com a CONAMA 357.", gerenciadoPor: "zaeon" },
      ],
    },

    // ===================== CAPÍTULO 6 — EXECUÇÃO =====================
    {
      id: "coleta-preservacao",
      titulo: "Coletar e preservar a amostra",
      blocos: [
        { tipo: "texto", texto: "A coleta decide o resultado. Frasco certo para cada análise (estéril para microbiologia, âmbar para alguns químicos), enxágue quando a norma pede, preenchimento sem bolha para OD, identificação clara e, acima de tudo, conservação: gelo a cerca de 4 graus e análise dentro do prazo de cada parâmetro. Amostra mal conservada vira número falso. A ABNT NBR 9897/9898 e o Guia de Coleta padronizam isso." },
        { tipo: "diagrama", titulo: "Da margem ao laboratório", codigo: `flowchart LR
  C["Coleta no frasco certo"] --> I["Identificar e anotar hora"]
  I --> P["Preservar: gelo ~4C"]
  P --> T["Transportar em caixa termica"]
  T --> L["Laboratorio dentro do prazo"]
  L --> R["Resultado confiavel"]` },
        { tipo: "video", titulo: "Coleta de amostras de águas (passo a passo)", youtube: "gI4XXIqgOCA" },
      ],
    },
    {
      id: "medicao-in-situ",
      titulo: "Medir in situ com sonda multiparâmetro",
      blocos: [
        { tipo: "texto", texto: "Alguns parâmetros só valem medidos na hora, na água: oxigênio dissolvido, temperatura, pH e condutividade. A sonda multiparâmetro faz isso de uma vez, com eletrodos imersos. Antes de ir a campo, calibre os sensores (pH com soluções-tampão, OD na saturação); sem calibração, a sonda mente com confiança. Registre também a profundidade e o ponto exato." },
        {
          tipo: "prancha",
          titulo: "Sonda multiparâmetro na coluna d'água",
          desenho: {
            legenda: "A sonda desce com eletrodos de OD, pH, temperatura e condutividade; o leitor registra os valores no local.",
            primitivas: [
              { t: "retangulo", p: [40, 20], w: 56, h: 34 },
              { t: "rotulo", p: [48, 16], texto: "Leitor" },
              { t: "linha", de: [68, 54], ate: [68, 120], cor: "tinta" },
              { t: "retangulo", p: [58, 120], w: 20, h: 44, hachura: true },
              { t: "rotulo", p: [84, 138], texto: "Sonda" },
              { t: "curva", pts: [[20, 90], [100, 86], [180, 92], [284, 88]], cor: "suave" },
              { t: "rotulo", p: [200, 76], texto: "Superficie" },
              { t: "retangulo", p: [20, 92], w: 268, h: 84, cor: "suave" },
              { t: "rotulo", p: [210, 150], texto: "Coluna d'agua" },
            ],
          },
        },
        { tipo: "tarefas", itens: [
          { id: "calibrar-sonda", titulo: "Calibre e registre in situ", entrega: "Calibre pH e OD antes da saída. No ponto, registre OD, temperatura, pH e condutividade, com hora e profundidade. Anote a data da última calibração de cada sensor." },
        ] },
      ],
    },
    {
      id: "cadeia-custodia",
      titulo: "Cadeia de custódia e o laboratório",
      blocos: [
        { tipo: "texto", texto: "Cadeia de custódia é o rastro documental da amostra: quem coletou, quando, quais frascos, quem transportou, quem recebeu no laboratório e a que horas. Sem esse registro, a amostra não tem valor probatório: ninguém garante que o resultado é daquela água, naquele dia. Cada troca de mãos é assinada." },
        { tipo: "diagrama", titulo: "A corrente que não pode quebrar", codigo: `flowchart LR
  A["Coletor assina"] --> B["Lacra e identifica"]
  B --> C["Transportador recebe e assina"]
  C --> D["Laboratorio recebe e confere"]
  D --> E["Analise e laudo"]
  E --> F["Rastro completo preservado"]` },
        { tipo: "mobilizacao", papel: "Laboratório acreditado (ISO/IEC 17025) para análises físico-químicas e microbiológicas", porque: "Parâmetros como DBO, nutrientes, metais e coliformes exigem métodos validados, equipamento calibrado e laudo rastreável que a medição de campo não substitui.", entregaEsperada: "Laudo acreditado com métodos (ex.: Standard Methods), limites de quantificação, incerteza e comparação com os padrões da CONAMA 357.", gerenciadoPor: "zaeon" },
      ],
    },
    {
      id: "bioindicadores",
      titulo: "Bioindicadores: ler os insetos do rio",
      blocos: [
        { tipo: "texto", texto: "Além de frasco e sonda, o próprio rio tem laudo vivo. Macroinvertebrados bentônicos, larvas de insetos e pequenos animais do fundo, reagem à poluição: alguns só vivem em água limpa, outros toleram esgoto. A presença de larvas de Ephemeroptera, Plecoptera e Trichoptera (o grupo EPT) indica água boa; a dominância de poucos grupos tolerantes indica degradação. Índices como o BMWP traduzem isso em nota." },
        {
          tipo: "prancha",
          titulo: "Sensíveis x tolerantes",
          desenho: {
            legenda: "Grupos sensiveis (EPT) exigem agua limpa; tolerantes resistem ao esgoto. A proporcao entre eles indica a qualidade.",
            primitivas: [
              { t: "retangulo", p: [20, 40], w: 120, h: 110, cor: "suave" },
              { t: "rotulo", p: [40, 32], texto: "Agua limpa" },
              { t: "circulo", c: [50, 80], r: 8, cor: "destaque" },
              { t: "circulo", c: [85, 100], r: 8, cor: "destaque" },
              { t: "circulo", c: [110, 70], r: 8, cor: "destaque" },
              { t: "rotulo", p: [44, 160], texto: "EPT sensiveis" },
              { t: "retangulo", p: [165, 40], w: 120, h: 110, hachura: true },
              { t: "rotulo", p: [185, 32], texto: "Agua poluida" },
              { t: "circulo", c: [210, 95], r: 8, cor: "tinta" },
              { t: "rotulo", p: [176, 160], texto: "Poucos tolerantes" },
              { t: "seta", de: [142, 95], ate: [163, 95], cor: "tinta" },
            ],
          },
        },
        { tipo: "video", titulo: "Bioindicadores de qualidade de água: os macroinvertebrados bentônicos", youtube: "oNpnqrUgSgE" },
      ],
    },
    {
      id: "video-coleta",
      titulo: "Ver a coleta e o biomonitoramento na prática",
      blocos: [
        { tipo: "texto", texto: "Compare as etapas que você estudou com execuções reais. Nos vídeos, observe a sequência de coleta e conservação e, no biomonitoramento, como se lê a qualidade pelos organismos. Anote o que faria diferente no seu rio." },
        { tipo: "video", titulo: "Etapas de amostragem, coleta, conservação e processamento", youtube: "_5B98TUkj0A" },
        { tipo: "video", titulo: "Como se mede a qualidade da água... com insetos", youtube: "WTXb8VwhXVM" },
      ],
    },

    // ===================== CAPÍTULO 7 — MANUTENÇÃO: DADOS E TENDÊNCIA =====================
    {
      id: "registro-dados",
      titulo: "Registrar e versionar os dados",
      blocos: [
        { tipo: "texto", texto: "Dado perdido é coleta jogada fora. Cada medição vira uma linha com: ponto, coordenada, data, hora, condição de chuva, parâmetro, valor, unidade, método e quem coletou. Uma planilha estruturada já basta para começar, desde que cada campo seja preenchido sempre igual. A padronização é o que permite comparar meses e anos depois." },
        { tipo: "diagrama", titulo: "Estrutura mínima do registro", codigo: `flowchart TD
  A["Ponto e coordenada"] --> R["Linha de dado"]
  B["Data, hora, chuva"] --> R
  C["Parametro, valor, unidade"] --> R
  D["Metodo e coletor"] --> R
  R --> S["Serie historica comparavel"]` },
        { tipo: "tarefas", itens: [
          { id: "modelo-planilha", titulo: "Crie o modelo de planilha", entrega: "Monte a tabela com as colunas de ponto, coordenada, data, hora, chuva, parâmetro, valor, unidade, método e coletor. Preencha com os dados da sua primeira coleta." },
        ] },
      ],
    },
    {
      id: "qa-qc",
      titulo: "Controle de qualidade: brancos e duplicatas",
      blocos: [
        { tipo: "texto", texto: "Como saber se o número é real e não contaminação do próprio processo? Com controles. O branco de campo é água pura que passa por todo o procedimento: se der positivo, a contaminação veio do frasco ou da manipulação, não do rio. A duplicata repete a coleta no mesmo ponto para medir a dispersão. QA/QC é o que separa dado confiável de ruído." },
        {
          tipo: "prancha",
          titulo: "Branco e duplicata no lote de amostras",
          desenho: {
            legenda: "No lote vão amostras reais, um branco (agua pura) e uma duplicata; eles validam o resultado.",
            primitivas: [
              { t: "retangulo", p: [30, 70], w: 30, h: 60, hachura: true },
              { t: "rotulo", p: [28, 140], texto: "Real" },
              { t: "retangulo", p: [75, 70], w: 30, h: 60, hachura: true },
              { t: "rotulo", p: [73, 140], texto: "Real" },
              { t: "retangulo", p: [140, 70], w: 30, h: 60, cor: "suave" },
              { t: "rotulo", p: [134, 140], texto: "Branco" },
              { t: "retangulo", p: [205, 70], w: 30, h: 60, cor: "destaque" },
              { t: "rotulo", p: [198, 140], texto: "Duplicata" },
              { t: "rotulo", p: [30, 52], texto: "Lote de amostras" },
            ],
          },
        },
        {
          tipo: "licao",
          pergunta: "Para que serve o branco de campo?",
          alternativas: ["Para encher o lote", "Para detectar contaminação vinda do frasco ou da manipulação, não do rio", "Para medir a temperatura"],
          correta: 1,
          explicacao: "O branco é água pura que passa por todo o processo; se acusar o parâmetro, a contaminação está no procedimento, o que invalidaria atribuir o resultado ao rio.",
        },
      ],
    },
    {
      id: "tendencias-series",
      titulo: "Ler tendências e séries temporais",
      blocos: [
        { tipo: "texto", texto: "O valor de um monitoramento aparece no tempo. Um ponto isolado diz pouco; uma série de meses mostra se o rio melhora, piora ou oscila com a estação. Separe o sinal (uma ETE nova que elevou o OD) do ruído sazonal (OD que sempre cai na seca). Gráfico de linha por parâmetro, com os extremos de seca e cheia marcados, é a ferramenta central." },
        {
          tipo: "prancha",
          titulo: "Série temporal de OD com meta da classe 2",
          desenho: {
            legenda: "A linha tracejada e a meta (OD 5 mg/L, classe 2); a serie mostra se o ponto cumpre e se melhora no tempo.",
            primitivas: [
              { t: "linha", de: [24, 24], ate: [24, 160], cor: "suave" },
              { t: "linha", de: [24, 160], ate: [290, 160], cor: "suave" },
              { t: "rotulo", p: [0, 20], texto: "OD" },
              { t: "linha", de: [24, 100], ate: [290, 100], cor: "tinta" },
              { t: "rotulo", p: [228, 92], texto: "Meta 5 mg/L" },
              { t: "curva", pts: [[30, 140], [80, 130], [130, 120], [180, 95], [230, 85], [284, 70]], cor: "destaque" },
              { t: "rotulo", p: [40, 150], texto: "antes" },
              { t: "rotulo", p: [244, 60], texto: "depois" },
            ],
          },
        },
        { tipo: "tarefas", itens: [
          { id: "grafico-serie", titulo: "Faça o gráfico da sua série", entrega: "Com pelo menos três coletas, plote um parâmetro no tempo e trace a linha do limite CONAMA da classe pretendida. Escreva se o ponto cumpre e se há tendência." },
        ] },
      ],
    },
    {
      id: "comunicar-mobilizar",
      titulo: "Comunicar o resultado e mobilizar quem decide",
      blocos: [
        { tipo: "texto", texto: "Dado que fica na gaveta não despolui rio. O resultado precisa chegar a quem decide: companhia de saneamento, órgão ambiental estadual, comitê de bacia, ministério público e a própria comunidade. Um boletim simples, com o IQA do ponto, a comparação com a classe e as fotos dos lançamentos, transforma medição em pressão por saneamento." },
        { tipo: "mobilizacao", papel: "Órgão gestor de recursos hídricos / ambiental e comitê de bacia", porque: "Autuar lançamentos irregulares, exigir tratamento, revisar outorgas e conduzir o enquadramento são atribuições do poder público e do comitê de bacia, não do coletor.", entregaEsperada: "Protocolo junto ao órgão ambiental ou comitê de bacia com os dados, denúncia formal dos lançamentos e pedido de providência, acompanhado até a resposta.", gerenciadoPor: "zaeon" },
        { tipo: "fontes", titulo: "Onde levar o dado", itens: [
          { titulo: "ANA — Qualidade da água e PNQA", url: "https://www.gov.br/ana/pt-br/assuntos/monitoramento-e-eventos-criticos/qualidade-da-agua", tipo: "site", nota: "Rede nacional e indicadores; referência para comparar seu ponto." },
          { titulo: "SNIS — Sistema Nacional de Informações sobre Saneamento", url: "http://www.snis.gov.br/", tipo: "dataset", nota: "Índices de coleta e tratamento de esgoto por município." },
        ] },
      ],
    },

    // ===================== CAPÍTULO 8 — CASOS REAIS =====================
    {
      id: "caso-tiete",
      titulo: "Caso: o Rio Tietê e a mancha de poluição",
      blocos: [
        { tipo: "texto", texto: "O Tietê é o retrato do rio urbano brasileiro. Nasce limpo em Salesópolis, atravessa a Região Metropolitana de São Paulo e sai de lá carregando o esgoto de milhões de pessoas. O monitoramento de longo prazo mede uma mancha de poluição, o trecho onde a água fica imprópria, que encolhe e cresce conforme avança o saneamento e conforme a chuva dilui ou a seca concentra." },
        { tipo: "texto", texto: "A lição metodológica é dupla. Primeiro, só uma série longa e padronizada permite afirmar melhora ou piora com credibilidade. Segundo, o rio responde ao saneamento: onde a coleta e o tratamento avançam, OD sobe e coliformes caem. Medir é o que sustenta cobrar, e cobrar é o que move o investimento." },
        { tipo: "fontes", titulo: "Monitoramento de longo prazo do Tietê", itens: [
          { titulo: "SOS Mata Atlântica — Observando os Rios", url: "https://www.sosma.org.br/causas/observando-os-rios/", tipo: "site", nota: "Relatórios anuais com IQA de dezenas de pontos, inclusive no Tietê." },
          { titulo: "CETESB — Relatórios de qualidade das águas interiores", url: "https://cetesb.sp.gov.br/aguas-interiores/publicacoes-e-relatorios/", tipo: "dataset", nota: "Série oficial de IQA e enquadramento dos rios paulistas." },
        ] },
      ],
    },
    {
      id: "caso-ciencia-cidada",
      titulo: "Caso: ciência cidadã no monitoramento",
      blocos: [
        { tipo: "texto", texto: "Monitorar não é monopólio de laboratório. O programa Observando os Rios, da SOS Mata Atlântica, treina voluntários para medir parâmetros com kits padronizados e calcular o IQA em dezenas de pontos, ano após ano. É ciência cidadã: dado em escala que nenhum órgão faria sozinho, e que serve para triar, alertar e mobilizar, desde que o método seja sempre o mesmo." },
        { tipo: "video", titulo: "Curso do Índice de Qualidade da Água - Observando os Rios (Parte 1)", youtube: "Vc5fWF6vmM4" },
        {
          tipo: "licao",
          pergunta: "Qual é a força e o limite da ciência cidadã no monitoramento?",
          alternativas: [
            "Substitui qualquer laboratório e vale como laudo oficial",
            "Gera dado em escala para triar e mobilizar, mas não substitui o laudo acreditado para fins legais",
            "Não serve para nada sem um doutorado",
          ],
          correta: 1,
          explicacao: "A ciência cidadã cobre muitos pontos e cria pressão social com método padronizado, mas decisões legais (autuação, enquadramento) ainda pedem laudo acreditado e responsável técnico.",
        },
      ],
    },

    // ===================== CAPÍTULO 9 — RECURSOS + SÍNTESE =====================
    {
      id: "recursos-finais",
      titulo: "Recursos para continuar: dados e normas abertas",
      blocos: [
        { tipo: "texto", texto: "Reúna aqui a caixa de ferramentas do monitoramento: os dados abertos onde comparar seu ponto, as normas que definem os limites e os procedimentos de coleta. Tudo o que este caderno afirmou se verifica nestes endereços." },
        { tipo: "fontes", titulo: "Dados, normas e procedimentos", itens: [
          { titulo: "SNIRH — HidroWeb", url: "https://www.snirh.gov.br/hidroweb/apresentacao", tipo: "dataset", nota: "Séries históricas e estações de monitoramento de recursos hídricos." },
          { titulo: "ANA — Monitoramento e qualidade da água", url: "https://www.gov.br/ana/pt-br/assuntos/monitoramento-e-eventos-criticos/qualidade-da-agua", tipo: "site", nota: "PNQA, Índice de Qualidade das Águas e rede nacional." },
          { titulo: "Resolução CONAMA 357/2005", url: "https://faolex.fao.org/docs/pdf/bra173548.pdf", tipo: "norma", nota: "Classificação e padrões por classe de uso." },
          { titulo: "Resolução CONAMA 430/2011", url: "https://conama.mma.gov.br/?option=com_sisconama&task=arquivo.download&id=646", tipo: "norma", nota: "Condições e padrões de lançamento de efluentes." },
          { titulo: "Portaria GM/MS 888/2021 — potabilidade", url: "https://bvsms.saude.gov.br/bvs/saudelegis/gm/2021/prt0888_07_05_2021.html", tipo: "norma", nota: "Padrão de potabilidade: só para água destinada a consumo humano." },
          { titulo: "ABNT NBR 9897 — planejamento de amostragem (catálogo)", url: "https://www.normas.com.br/visualizar/abnt-nbr-nm/2882/abnt-nbr9897-planejamento-de-amostragem-de-efluentes-liquidos-e-corpos-receptores", tipo: "norma", nota: "Planejamento de amostragem de efluentes e corpos receptores." },
          { titulo: "Engenharia Sanitária e Ambiental (SciELO)", url: "https://www.scielo.br/j/esa/", tipo: "artigo", nota: "Periódico com estudos de caso de qualidade de rios brasileiros." },
        ] },
        { tipo: "video", titulo: "Cálculo do IQA no portal Infoáguas da CETESB", youtube: "TSlFJBZacMw" },
      ],
    },
    {
      id: "compilado",
      titulo: "Prancha de síntese",
      blocos: [
        { tipo: "texto", texto: "Você percorreu o caminho inteiro: entendeu por que o rio urbano adoece, leu a bacia e as fontes de poluição, dominou os parâmetros, calculou o IQA e comparou com as classes da CONAMA 357, projetou um plano com pares montante/jusante e janelas de seca e cheia, executou coleta, sonda e laboratório com cadeia de custódia, manteve os dados com QA/QC e leu a tendência no tempo, e viu casos reais do Tietê à ciência cidadã. A regra que fica: meça com método, compare com a norma, registre tudo e leve o dado a quem decide. Água de rio é bem público; prova é o que transforma indignação em saneamento. Quando a etapa exigir laboratório acreditado ou responsável técnico, mobilize o profissional certo, foi assinalado em cada ponto do caderno." },
        { tipo: "compilado" },
      ],
    },
  ],
};
