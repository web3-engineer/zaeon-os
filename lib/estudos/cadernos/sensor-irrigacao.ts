import type { CadernoEstudo } from "../cadernosEstudo";

/**
 * Caderno de campo: "Sensor de umidade para irrigação de pequenos cultivos".
 * Eletrônica embarcada + agronomia da água no solo. Do conceito de capacidade de campo
 * (FAO) ao ESP32 que liga a bomba sozinho, com calibração real por gravimetria.
 * Todo número, técnica, norma e desenho tem lastro em fonte real (ver páginas "fontes").
 */
export const caderno: CadernoEstudo = {
  id: "sensor-irrigacao",
  titulo: "Sensor de umidade para irrigação de pequenos cultivos",
  resumo:
    "Do solo ao firmware: medir a água que a planta pode beber, calibrar o sensor por gravimetria e deixar um ESP32 regar a horta na hora certa — com normas, datasets e casos reais.",
  paginas: [
    // ===================== CONTEXTO =====================
    {
      id: "abertura",
      titulo: "Por que medir a umidade do solo",
      blocos: [
        { tipo: "texto", texto: "Regar no olho desperdiça água e estressa a planta. Regar demais expulsa o ar das raízes e lava o adubo para baixo; regar de menos trava o crescimento. Um sensor de umidade transforma a dúvida 'será que preciso molhar?' em um número, e esse número pode ligar a bomba sozinho. Este caderno leva você do conceito agronômico de 'água disponível' até um irrigador automático de baixo custo, calibrado de verdade." },
        { tipo: "texto", texto: "O foco é o pequeno cultivo: horta de quintal, canteiro de hortaliças, viveiro, estufa familiar, agricultura urbana. Nessa escala, um sistema de poucas dezenas de reais (sensor capacitivo + microcontrolador + bomba) já paga o investimento em água economizada e em safra que não murcha num fim de semana sem ninguém para molhar." },
        { tipo: "diagrama", titulo: "O ciclo que o sensor fecha", codigo: `flowchart LR
  S["Sensor le a umidade"] --> C["Controlador compara com o gatilho"]
  C -->|"seco demais"| B["Liga a bomba"]
  C -->|"umido o bastante"| E["Espera"]
  B --> S
  E --> S` },
      ],
    },
    {
      id: "problema",
      titulo: "O desperdício que a gente não vê",
      blocos: [
        { tipo: "texto", texto: "A agricultura responde pela maior fatia do uso de água doce no mundo, e boa parte se perde por irrigação mal programada. Em pequena escala o padrão é o mesmo: molha-se por hábito (toda manhã, tempo fixo) e não por necessidade. Quando chove, rega-se igual; quando esquenta, rega-se igual. O solo acaba ora encharcado, ora ressecado." },
        { tipo: "texto", texto: "A ideia central do manejo por sensor é simples: manter a umidade entre a 'capacidade de campo' (solo cheio, mas drenado) e um limite inferior de segurança, sem deixar a planta passar sede nem afogar. Mantendo a umidade nessa faixa evita-se o estresse hídrico e colhe-se o potencial da cultura — é isso que a FAO chama de manejo pelo balanço de água no solo." },
        {
          tipo: "licao",
          pergunta: "Qual é a vantagem central de irrigar por sensor em vez de por horário fixo?",
          alternativas: [
            "Gasta mais energia, mas é mais moderno",
            "Rega conforme a necessidade real do solo, poupando água e evitando encharcar",
            "Dispensa qualquer conhecimento sobre o solo",
          ],
          correta: 1,
          explicacao: "O sensor substitui o palpite por medida: só rega quando o solo seca abaixo do gatilho, mantendo a faixa saudável entre capacidade de campo e o limite de reposição.",
        },
      ],
    },
    {
      id: "agua-no-solo",
      titulo: "A água que a planta realmente bebe",
      blocos: [
        { tipo: "texto", texto: "Nem toda água no solo serve à planta. Logo depois de uma chuva forte, o excesso escorre por gravidade; quando esse escorrimento para, o solo está na CAPACIDADE DE CAMPO (CC). Conforme a planta e a evaporação retiram água, chega-se ao PONTO DE MURCHA PERMANENTE (PMP): a água que resta está tão presa às partículas que as raízes não conseguem puxar. A diferença entre CC e PMP é a ÁGUA DISPONÍVEL — o 'tanque' útil do solo." },
        {
          tipo: "prancha",
          titulo: "O reservatorio do solo: CC, PMP e agua disponivel",
          desenho: {
            legenda: "A faixa util fica entre a capacidade de campo (topo) e o ponto de murcha (base). O sensor mede onde o nivel esta.",
            primitivas: [
              { t: "retangulo", p: [40, 20], w: 120, h: 150, cor: "tinta" },
              { t: "retangulo", p: [40, 60], w: 120, h: 80, hachura: true, cor: "suave" },
              { t: "linha", de: [40, 60], ate: [160, 60], cor: "destaque" },
              { t: "linha", de: [40, 140], ate: [160, 140], cor: "destaque" },
              { t: "rotulo", p: [165, 30], texto: "Saturacao (encharcado)" },
              { t: "rotulo", p: [165, 62], texto: "Capacidade de campo (CC)" },
              { t: "rotulo", p: [165, 103], texto: "AGUA DISPONIVEL" },
              { t: "rotulo", p: [165, 142], texto: "Ponto de murcha (PMP)" },
              { t: "seta", de: [100, 140], ate: [100, 60], cor: "destaque" },
              { t: "rotulo", p: [48, 185], texto: "o tanque util da planta" },
            ],
          },
        },
        {
          tipo: "fontes",
          titulo: "Fontes desta etapa",
          itens: [
            { titulo: "FAO Irrigation and Drainage Paper 56 — Crop evapotranspiration (Allen et al., 1998)", url: "https://www.fao.org/4/x0490e/x0490e00.htm", tipo: "livro", nota: "Referência mundial de CC, PMP, água disponível e fração de depleção (p)." },
            { titulo: "FAO — Applicability and limitations of irrigation scheduling methods (Water Report 8)", url: "https://www.fao.org/4/W4367E/w4367e04.htm", tipo: "artigo", nota: "Define a faixa útil entre CC e PMP e o ponto de depleção que aciona a rega." },
          ],
        },
      ],
    },
    {
      id: "tensao-vs-conteudo",
      titulo: "Dois jeitos de medir: conteúdo e tensão",
      blocos: [
        { tipo: "texto", texto: "Existem duas grandezas para falar de umidade. O CONTEÚDO VOLUMÉTRICO (θ, em m³/m³ ou %) diz quanta água há num volume de solo — é o que sensores capacitivos e resistivos estimam. A TENSÃO (ou potencial matricial, em kPa) diz com que força o solo segura essa água — é o que o tensiômetro mede. Planta sente tensão: quanto maior a tensão, mais 'cara' fica cada gota para a raiz." },
        { tipo: "texto", texto: "As duas se ligam pela CURVA DE RETENÇÃO de cada solo (quanto conteúdo corresponde a quanta tensão). Por isso um mesmo valor de % significa coisas diferentes em areia e em argila. O ponto de murcha costuma ficar perto de -1500 kPa (-1,5 MPa); o tensiômetro, por limite físico, lê bem só até cerca de -80 kPa (-0,8 bar) — ótimo para a faixa úmida onde a maioria das hortaliças deve ficar." },
        { tipo: "diagrama", titulo: "Conteudo x tensao: quem mede o que", codigo: `flowchart TD
  U["Umidade do solo"] --> CV["Conteudo volumetrico θ (m3/m3)"]
  U --> T["Tensao matricial (kPa)"]
  CV --> CAP["Sensor capacitivo / resistivo / FDR"]
  T --> TEN["Tensiometro"]
  CV -->|"curva de retencao"| T` },
        {
          tipo: "licao",
          pergunta: "O que o tensiômetro mede, que o sensor capacitivo não mede diretamente?",
          alternativas: [
            "A temperatura do solo",
            "A força (tensão) com que o solo retém a água, em kPa",
            "O pH da solução do solo",
          ],
          correta: 1,
          explicacao: "O capacitivo estima o conteúdo (quanta água); o tensiômetro mede a tensão (com que força o solo segura a água) — o que a raiz de fato 'sente'.",
        },
      ],
    },
    // ===================== LEITURA DO TEMA: OS SENSORES =====================
    {
      id: "tipos-de-sensor",
      titulo: "O mapa dos sensores de umidade",
      blocos: [
        { tipo: "texto", texto: "Para pequeno cultivo, quatro famílias importam. RESISTIVO (dois eletrodos, mede resistência): barato, mas corrói. CAPACITIVO (mede a constante dielétrica do solo, sem corrente entre eletrodos): mais estável e sem corrosão, o preferido para instalação que fica meses no chão. FDR/TDR (capacitância/tempo de reflexão em alta frequência): preciso e caro, usado em sondas profissionais. TENSIÔMETRO: mede tensão, consagrado pela Embrapa no manejo de hortaliças." },
        { tipo: "diagrama", titulo: "Familias de sensor por custo e durabilidade", codigo: `flowchart LR
  R["Resistivo HL-69 / YL-69"] --> Rn["Barato, corroi, so para aprender"]
  C["Capacitivo SEN0193 v1.2/v2"] --> Cn["Estavel, sem corrosao, bom para a horta"]
  F["FDR / TDR (sonda)"] --> Fn["Preciso e caro, uso profissional"]
  T["Tensiometro"] --> Tn["Mede tensao, padrao Embrapa em hortalicas"]` },
        {
          tipo: "licao",
          pergunta: "Por que o sensor capacitivo é preferido ao resistivo numa instalação de longa duração?",
          alternativas: [
            "Porque é sempre o mais barato",
            "Porque mede a constante dielétrica sem passar corrente entre eletrodos, evitando a corrosão",
            "Porque não precisa de calibração",
          ],
          correta: 1,
          explicacao: "No resistivo passa corrente entre dois metais expostos, que corroem em semanas. O capacitivo sela os eletrodos e lê a permissividade do meio, durando muito mais.",
        },
      ],
    },
    {
      id: "capacitivo-dentro",
      titulo: "Por dentro do sensor capacitivo",
      blocos: [
        { tipo: "texto", texto: "O capacitivo barato (tipo SEN0193 / 'v1.2' e 'v2') é uma placa onde duas trilhas formam um capacitor. A água tem constante dielétrica altíssima (~80) perto do solo seco (~4), então quanto mais úmido o solo, maior a capacitância e menor a tensão de saída analógica. A placa já traz um oscilador e um regulador: você lê um valor analógico (0–3,3 V) que cai quando molha." },
        {
          tipo: "prancha",
          titulo: "Anatomia do sensor capacitivo de insercao",
          desenho: {
            legenda: "A parte eletronica fica ACIMA da linha do solo; so a lamina dielectrica entra na terra.",
            primitivas: [
              { t: "retangulo", p: [120, 20], w: 40, h: 150, cor: "tinta" },
              { t: "retangulo", p: [128, 30], w: 24, h: 18, cor: "destaque" },
              { t: "rotulo", p: [165, 40], texto: "Oscilador + regulador" },
              { t: "linha", de: [130, 48], ate: [130, 160], cor: "suave" },
              { t: "linha", de: [150, 48], ate: [150, 160], cor: "suave" },
              { t: "rotulo", p: [165, 95], texto: "Trilhas = capacitor" },
              { t: "linha", de: [20, 120], ate: [280, 120], cor: "tinta" },
              { t: "rotulo", p: [22, 114], texto: "linha do solo" },
              { t: "rotulo", p: [165, 150], texto: "lamina na terra" },
              { t: "rotulo", p: [118, 185], texto: "NAO enterrar a eletronica" },
            ],
          },
        },
        { tipo: "video", titulo: "Ligando e lendo o sensor capacitivo v1.2/v2 no Arduino", youtube: "9h3JKwUsn2A" },
      ],
    },
    {
      id: "tensiometro",
      titulo: "O tensiômetro e a escola da Embrapa",
      blocos: [
        { tipo: "texto", texto: "O tensiômetro é um tubo cheio de água com uma cápsula porosa na ponta e um vacuômetro no topo. Enterrado, ele troca água com o solo pela cápsula: quando o solo seca, puxa água de dentro do tubo e o vácuo medido sobe. É o sensor de umidade mais usado no mundo para manejo e a base das cartilhas da Embrapa Hortaliças. Lê bem a faixa úmida (0 a ~80 kPa), exatamente onde hortaliças devem ser mantidas." },
        {
          tipo: "prancha",
          titulo: "Tensiometro: como funciona",
          desenho: {
            legenda: "Vacuometro (topo), coluna de agua (tubo) e capsula porosa (base, no solo).",
            primitivas: [
              { t: "circulo", c: [90, 35], r: 18, cor: "tinta" },
              { t: "rotulo", p: [115, 35], texto: "Vacuometro (kPa)" },
              { t: "retangulo", p: [82, 50], w: 16, h: 100, cor: "tinta", hachura: true },
              { t: "rotulo", p: [105, 100], texto: "Coluna de agua" },
              { t: "circulo", c: [90, 158], r: 10, cor: "destaque", hachura: true },
              { t: "rotulo", p: [105, 158], texto: "Capsula porosa" },
              { t: "linha", de: [20, 140], ate: [260, 140], cor: "suave" },
              { t: "rotulo", p: [22, 134], texto: "solo" },
            ],
          },
        },
        {
          tipo: "fontes",
          titulo: "Fontes desta etapa",
          itens: [
            { titulo: "Embrapa Hortaliças — Controle da irrigação de hortaliças", url: "https://www.infoteca.cnptia.embrapa.br/bitstream/doc/939283/1/5ControledaIrrigacaodeHortalicas.pdf", tipo: "livro", nota: "Instalação e leitura do tensiômetro no manejo de hortaliças." },
            { titulo: "Embrapa — Manejo da irrigação com o sensor Irrigas (livro, 2015)", url: "https://www.infoteca.cnptia.embrapa.br/infoteca/bitstream/doc/1017645/1/LivroIRRIGASVersaoFinal2015Internet.pdf", tipo: "livro", nota: "Tecnologia nacional de tensiometria gasosa; alternativa de baixo custo." },
          ],
        },
      ],
    },
    {
      id: "ler-o-terreno",
      titulo: "Ler o terreno antes do sensor",
      blocos: [
        { tipo: "texto", texto: "A mesma leitura de '% umidade' vale pouco sem saber a TEXTURA do solo. Areia segura pouca água e seca rápido; argila segura muita e demora. A FAO ensina o teste da fita (ribbon test) de campo: umedeça uma bola de ~3 cm de solo e tente rolar uma fita entre os dedos. Se não forma bola, é arenoso; fita que quebra até 2,5 cm indica franco (loam); 2,5 a 5 cm, franco-argiloso; acima de 5 cm, argiloso." },
        {
          tipo: "tarefas",
          itens: [
            { id: "textura-fita", titulo: "Faça o teste da fita no seu canteiro", entrega: "Umedeça a terra, role a fita e meça o comprimento antes de quebrar. Registre: arenoso / franco / franco-argiloso / argiloso. Tire foto." },
            { id: "amostra-local", titulo: "Marque 2 pontos de amostragem", entrega: "Escolha dois locais representativos do cultivo (ex.: começo e fim do canteiro) para instalar sensores e repetir o teste." },
          ],
        },
        {
          tipo: "fontes",
          titulo: "Fontes desta etapa",
          itens: [
            { titulo: "FAO GSP — Soil texture by the ribbon test (field exercise)", url: "https://www.fao.org/fileadmin/user_upload/GSP/GSDP/Field_exercises/New_format_EN/P01b-Texture-Ribbon-EN.pdf", tipo: "artigo", nota: "Passo a passo oficial do teste da fita para classificar a textura." },
            { titulo: "MSU / USDA — Estimating Soil Moisture by Feel and Appearance", url: "https://www.canr.msu.edu/irrigation/upoads/files/FeelSoil.pdf", tipo: "artigo", nota: "Estimar umidade pelo tato, por classe de textura, sem instrumento." },
          ],
        },
      ],
    },
    // ===================== MÉTODO =====================
    {
      id: "conteudo-volumetrico",
      titulo: "A medida-padrão: conteúdo volumétrico",
      blocos: [
        { tipo: "texto", texto: "A referência contra a qual todo sensor se calibra é o método GRAVIMÉTRICO, feito com balança e estufa. Pesa-se o solo úmido, seca-se até massa constante e pesa-se de novo. A umidade gravimétrica é θg = (massa úmida − massa seca) / massa seca. Multiplicando pela densidade do solo (g/cm³) obtém-se a umidade VOLUMÉTRICA θv, em cm³/cm³. É o 'padrão-ouro' de campo: nenhum sensor é confiável sem comparar com ela." },
        { tipo: "diagrama", titulo: "Do solo umido ao numero verdadeiro", codigo: `flowchart LR
  A["Coleta amostra (anel de volume conhecido)"] --> B["Pesa umido (m_u)"]
  B --> C["Seca em estufa 105 C ate massa constante"]
  C --> D["Pesa seco (m_s)"]
  D --> E["θg = (m_u - m_s) / m_s"]
  E --> F["θv = θg x densidade do solo"]` },
      ],
    },
    {
      id: "gravimetrico-passo",
      titulo: "Gravimetria passo a passo",
      blocos: [
        { tipo: "texto", texto: "Você consegue fazer uma versão caseira com balança de 0,1 g e forno/estufa a 105 °C, secando até o peso parar de cair (normalmente 24 h). Mas para transformar a gravimetria em CALIBRAÇÃO CONFIÁVEL — e para medir densidade, textura e a curva de retenção — o ideal é um laboratório de solos. É esse resultado que ancora o sensor na realidade do seu terreno." },
        {
          tipo: "prancha",
          titulo: "Bancada da gravimetria",
          desenho: {
            legenda: "Anel volumetrico, balanca de precisao e estufa a 105 C.",
            primitivas: [
              { t: "retangulo", p: [25, 70], w: 50, h: 30, cor: "tinta" },
              { t: "rotulo", p: [22, 115], texto: "Anel de solo" },
              { t: "retangulo", p: [120, 60], w: 60, h: 45, cor: "tinta", hachura: true },
              { t: "circulo", c: [150, 50], r: 8, cor: "destaque" },
              { t: "rotulo", p: [118, 120], texto: "Balanca 0,1 g" },
              { t: "retangulo", p: [215, 55], w: 60, h: 55, cor: "tinta" },
              { t: "linha", de: [215, 82], ate: [275, 82], cor: "suave" },
              { t: "rotulo", p: [212, 125], texto: "Estufa 105 C" },
            ],
          },
        },
        {
          tipo: "mobilizacao",
          papel: "Laboratório de análise de solos (ou técnico agrícola)",
          porque: "Densidade, textura e curva de retenção pedem estufa calibrada, balança analítica e método padronizado. É o ensaio que ancora toda a calibração do sensor ao solo real do cultivo.",
          entregaEsperada: "Laudo com densidade (g/cm³), classe textural, umidade na capacidade de campo e no ponto de murcha, para o solo de cada ponto de amostragem.",
          gerenciadoPor: "zaeon",
        },
      ],
    },
    {
      id: "calibracao-conceito",
      titulo: "Por que calibrar (e o que é calibrar)",
      blocos: [
        { tipo: "texto", texto: "O sensor não entrega '%'. Ele entrega um número de ADC (ex.: 0–4095 no ESP32) que depende do solo, do sal, da temperatura e até da própria placa. Calibrar é criar a tabela que traduz esse número cru para umidade real. Sem isso, '1800' não quer dizer nada. Com dois pontos conhecidos (bem seco e saturado) já dá para interpolar; com gravimetria no solo verdadeiro, a tradução fica honesta." },
        {
          tipo: "licao",
          pergunta: "O valor analógico bruto do sensor é uma porcentagem universal de umidade?",
          alternativas: [
            "Sim, 500 significa 50% em qualquer solo",
            "Não, é um número cru que só vira umidade depois de calibrado para aquele solo/placa",
            "Sim, desde que o sensor seja capacitivo",
          ],
          correta: 1,
          explicacao: "O bruto depende de solo, sal, temperatura e da placa. Calibração mapeia bruto→umidade; sem ela o número não tem significado físico.",
        },
      ],
    },
    {
      id: "calibracao-2-pontos",
      titulo: "Calibração de 2 pontos: seco e molhado",
      blocos: [
        { tipo: "texto", texto: "A calibração mínima: leia o sensor no AR SECO (ou solo seco em estufa) e dentro da ÁGUA. Esses extremos definem 'seco' (valor alto) e 'saturado' (valor baixo). Num capacitivo típico isso costuma ficar perto de ~520 (seco) e ~260 (na água) — mas MEÇA os seus, pois cada placa varia. Depois, mapeie linearmente: umidade% = (seco − leitura) / (seco − molhado) × 100." },
        {
          tipo: "prancha",
          titulo: "Reta de calibracao: ADC x umidade",
          desenho: {
            legenda: "Dois pontos ancora (seco alto, molhado baixo) e a reta que traduz o bruto em umidade.",
            primitivas: [
              { t: "linha", de: [40, 170], ate: [40, 30], cor: "tinta" },
              { t: "linha", de: [40, 170], ate: [280, 170], cor: "tinta" },
              { t: "rotulo", p: [8, 95], texto: "umid%" },
              { t: "rotulo", p: [220, 185], texto: "valor ADC" },
              { t: "circulo", c: [70, 150], r: 4, cor: "destaque" },
              { t: "rotulo", p: [55, 140], texto: "molhado ~260" },
              { t: "circulo", c: [250, 55], r: 4, cor: "destaque" },
              { t: "rotulo", p: [205, 48], texto: "seco ~520" },
              { t: "linha", de: [70, 150], ate: [250, 55], cor: "destaque" },
            ],
          },
        },
        {
          tipo: "tarefas",
          itens: [
            { id: "cal-ar", titulo: "Leia o sensor no ar seco", entrega: "Anote a média de 10 leituras com o sensor limpo e seco, fora do solo. Esse é o ponto 'seco'." },
            { id: "cal-agua", titulo: "Leia o sensor na água", entrega: "Mergulhe até a linha máxima permitida (não afogue a eletrônica) e anote a média. Esse é o ponto 'molhado'. Calcule a reta." },
          ],
        },
      ],
    },
    {
      id: "calibracao-solo",
      titulo: "Calibração no solo real (a que vale)",
      blocos: [
        { tipo: "texto", texto: "A reta de 2 pontos erra no meio, porque o solo não é ar nem água livre. A calibração séria coleta VÁRIOS pares (leitura do sensor, umidade gravimétrica) em umidades diferentes do seu próprio solo e ajusta uma curva. Estudos recentes com sensores capacitivos de baixo custo mostram que uma calibração específica do solo reduz muito o erro frente à calibração de fábrica — e publicam os dados para você reproduzir." },
        { tipo: "diagrama", titulo: "Fluxo da calibracao especifica do solo", codigo: `flowchart TD
  P["Prepara amostras do solo em varias umidades"] --> L["Le o sensor em cada amostra"]
  L --> G["Mede θ por gravimetria na mesma amostra"]
  G --> A["Ajusta curva sensor->θ (regressao)"]
  A --> V["Valida com amostras novas"]
  V --> U["Usa a curva no firmware"]` },
        {
          tipo: "fontes",
          titulo: "Fontes desta etapa",
          itens: [
            { titulo: "Strypsteen et al. — Field Performance and Calibration Strategies for Low-Cost Capacitive Soil Moisture Sensors (dados)", url: "https://zenodo.org/records/16911016", tipo: "dataset", nota: "Dataset aberto (Arduino + 4 sondas capacitivas): planilhas de laboratório e campo para reproduzir a calibração." },
            { titulo: "DFRobot — Capacitive Soil Moisture Sensor SEN0193 (código e calibração)", url: "https://wiki.dfrobot.com/sen0193/docs/18036", tipo: "site", nota: "Exemplo oficial com faixas seco/úmido/água e sketch de leitura." },
          ],
        },
      ],
    },
    // ===================== CÁLCULO / MEDIÇÃO =====================
    {
      id: "quanto-regar",
      titulo: "Quanto regar: a lâmina de água",
      blocos: [
        { tipo: "texto", texto: "Saber QUANDO (gatilho) não basta; é preciso saber QUANTO repor. A FAO-56 trabalha com a 'fração de depleção' (p, também chamada MAD): a parte da água disponível que a cultura pode gastar antes de sofrer. Rega-se quando a depleção atinge p, repondo até a capacidade de campo. Assim o solo oscila numa faixa segura, sem encharcar nem secar demais." },
        { tipo: "diagrama", titulo: "O balanco de agua que o sensor fecha", codigo: `flowchart LR
  CC["Capacidade de campo"] -->|"planta consome / evapora"| D["Depleção sobe"]
  D -->|"atinge a fracao p (gatilho)"| IRR["Rega repoe a lamina"]
  IRR --> CC` },
        {
          tipo: "fontes",
          titulo: "Fontes desta etapa",
          itens: [
            { titulo: "FAO-56 — fração de depleção p (Tabela 22) e balanço de água no solo", url: "https://www.fao.org/4/x0490e/x0490e00.htm", tipo: "livro", nota: "Valores de p por cultura e o método de reposição até a capacidade de campo." },
          ],
        },
      ],
    },
    {
      id: "formula-lamina",
      titulo: "A conta da lâmina, com exemplo",
      blocos: [
        { tipo: "texto", texto: "Água prontamente disponível: RAW = AD × p × Zr, onde AD é a água disponível por profundidade (mm/m), p a fração de depleção e Zr a profundidade efetiva de raízes (m). Exemplo: solo franco com AD ≈ 120 mm/m, hortaliça de raízes Zr = 0,30 m, p = 0,5. RAW = 120 × 0,30 × 0,5 = 18 mm. Ou seja: deixe a planta consumir ~18 mm, então reponha ~18 mm (ou um pouco mais para compensar perdas) para voltar à capacidade de campo." },
        {
          tipo: "prancha",
          titulo: "Lamina de reposicao (exemplo franco, Zr 0,30 m)",
          desenho: {
            legenda: "Barra da agua disponivel na zona radicular; a fatia p e o que se gasta antes de regar.",
            primitivas: [
              { t: "retangulo", p: [40, 50], w: 220, h: 40, cor: "tinta" },
              { t: "retangulo", p: [40, 50], w: 110, h: 40, hachura: true, cor: "destaque" },
              { t: "rotulo", p: [45, 45], texto: "gasta antes de regar (p=0,5)" },
              { t: "rotulo", p: [170, 45], texto: "reserva" },
              { t: "rotulo", p: [40, 110], texto: "AD = 120 mm/m" },
              { t: "rotulo", p: [40, 130], texto: "Zr = 0,30 m  =>  AD util = 36 mm" },
              { t: "rotulo", p: [40, 150], texto: "RAW = 36 x 0,5 = 18 mm (lamina)" },
              { t: "seta", de: [40, 95], ate: [150, 95], cor: "destaque" },
            ],
          },
        },
        {
          tipo: "licao",
          pergunta: "Com AD útil de 36 mm na zona de raízes e p = 0,5, qual a lâmina de reposição?",
          alternativas: ["36 mm", "18 mm", "72 mm"],
          correta: 1,
          explicacao: "RAW = AD útil × p = 36 × 0,5 = 18 mm. Deixa-se consumir 18 mm e repõe-se 18 mm para voltar à capacidade de campo.",
        },
      ],
    },
    {
      id: "gatilho-setpoint",
      titulo: "Definindo o gatilho do sensor",
      blocos: [
        { tipo: "texto", texto: "No firmware, o gatilho é um valor de umidade (ou de ADC calibrado) abaixo do qual a bomba liga. Ele sai da conta anterior: o ponto em que a depleção chega a p. Em solo arenoso, o gatilho é mais 'alto' (seca rápido, rega mais cedo); em argiloso, mais 'baixo'. Centros de pesquisa publicam tabelas de gatilho por tipo de solo tanto em conteúdo quanto em tensão — use-as como ponto de partida e ajuste no campo." },
        {
          tipo: "licao",
          pergunta: "Em areia, em relação à argila, o gatilho de rega deve ser ajustado como?",
          alternativas: [
            "Igual: o tipo de solo não muda o gatilho",
            "A areia seca e esgota a reserva mais rápido, então aciona a rega mais cedo (gatilho mais conservador)",
            "A areia nunca precisa de gatilho",
          ],
          correta: 1,
          explicacao: "Areia tem pouca água disponível e drena rápido; o limite de depleção chega antes, então rega-se com mais frequência e lâminas menores.",
        },
        {
          tipo: "mobilizacao",
          papel: "Agrônomo ou engenheiro agrônomo",
          porque: "Definir a fração de depleção p, a profundidade efetiva de raízes e a lâmina por cultura/fase exige leitura agronômica do cultivo — é o que converte a física do solo em um gatilho correto.",
          entregaEsperada: "Gatilho de umidade/tensão recomendado por cultura e fase, com a lâmina-alvo de reposição e a frequência esperada.",
          gerenciadoPor: "zaeon",
        },
      ],
    },
    {
      id: "profundidade-sensor",
      titulo: "Onde enterrar o sensor",
      blocos: [
        { tipo: "texto", texto: "O sensor deve ler a zona onde estão as raízes ativas, não a superfície que seca ao sol nem o fundo encharcado. Para hortaliças, uma profundidade típica é 10–20 cm; culturas de raiz mais profunda pedem um segundo sensor mais fundo. A Embrapa recomenda instalar uma 'bateria' de sensores em profundidades diferentes e pelo menos uma por área de textura distinta. Garanta contato firme com o solo, sem bolsa de ar." },
        {
          tipo: "prancha",
          titulo: "Perfil: onde o sensor le",
          desenho: {
            legenda: "Superficie seca (topo), zona de raizes (sensor) e fundo saturado.",
            primitivas: [
              { t: "retangulo", p: [40, 30], w: 200, h: 30, hachura: true, cor: "suave" },
              { t: "rotulo", p: [45, 50], texto: "0-5 cm: superficie seca" },
              { t: "retangulo", p: [40, 60], w: 200, h: 55, cor: "tinta" },
              { t: "rotulo", p: [45, 90], texto: "10-20 cm: raizes ativas" },
              { t: "retangulo", p: [128, 70], w: 10, h: 40, cor: "destaque" },
              { t: "rotulo", p: [145, 100], texto: "sensor aqui" },
              { t: "retangulo", p: [40, 115], w: 200, h: 40, hachura: true, cor: "suave" },
              { t: "rotulo", p: [45, 140], texto: "fundo: pode saturar" },
            ],
          },
        },
        {
          tipo: "tarefas",
          itens: [
            { id: "prof-def", titulo: "Defina a profundidade de instalação", entrega: "Com base nas raízes da sua cultura, escolha a(s) profundidade(s). Anote e justifique (ex.: alface 10 cm, tomate 20 e 40 cm)." },
          ],
        },
      ],
    },
    {
      id: "registro-dados",
      titulo: "Registrar e enxergar os dados",
      blocos: [
        { tipo: "texto", texto: "Um sensor que só liga a bomba já ajuda, mas registrar as leituras (cartão SD, nuvem, painel) revela o ritmo do solo: quanto seca por dia, como a chuva responde, se o gatilho está bom. Com histórico você afina o setpoint e pega defeitos (sensor solto, bomba que não desarma). Projetos de IoT com ESP32/ESP8266 enviam os dados a dashboards gratuitos; comece simples e evolua." },
        { tipo: "video", titulo: "Horta com IoT: sensores de umidade e rega automática", youtube: "pgGpuws7f9o" },
        {
          tipo: "licao",
          pergunta: "Por que registrar o histórico das leituras, além de só acionar a bomba?",
          alternativas: [
            "Só por estética do painel",
            "Para afinar o gatilho, entender o ritmo de secagem e detectar falhas (sensor solto, bomba travada)",
            "Porque a bomba exige internet",
          ],
          correta: 1,
          explicacao: "O histórico mostra o comportamento real do solo e expõe falhas, permitindo ajustar o setpoint com evidência em vez de palpite.",
        },
      ],
    },
    // ===================== PROJETO =====================
    {
      id: "arquitetura",
      titulo: "A arquitetura do irrigador",
      blocos: [
        { tipo: "texto", texto: "O sistema mínimo tem quatro blocos: SENSOR (capacitivo), CONTROLADOR (ESP32 ou Arduino), ATUADOR (módulo relé acionando bomba ou válvula solenoide) e ALIMENTAÇÃO. O controlador lê o sensor, compara com o gatilho e liga o relé. O ESP32 ainda traz Wi-Fi para enviar dados. Mantenha a lógica de potência (bomba) isolada da lógica de sinal (sensor) — isso evita ruído e protege o microcontrolador." },
        { tipo: "diagrama", titulo: "Blocos do sistema", codigo: `flowchart LR
  SEN["Sensor capacitivo"] -->|"analogico"| MCU["ESP32 / Arduino"]
  MCU -->|"GPIO"| REL["Modulo rele"]
  REL -->|"liga/desliga"| BOMBA["Bomba ou valvula"]
  FONTE["Fonte / bateria / solar"] --> MCU
  FONTE --> BOMBA
  MCU -.->|"Wi-Fi (opcional)"| NUVEM["Painel / nuvem"]` },
      ],
    },
    {
      id: "lista-materiais",
      titulo: "Lista de materiais (BOM)",
      blocos: [
        { tipo: "texto", texto: "Para um canteiro: 1 sensor capacitivo (SEN0193 ou similar), 1 ESP32 (ou Arduino Uno/Nano), 1 módulo relé 1 canal (ou MOSFET para bomba DC), 1 mini bomba d'água 3–12 V ou válvula solenoide, fios, borne, caixa vedada e uma fonte adequada. Prefira o capacitivo 3,3 V-compatível para casar com o ESP32. Some um cartão SD/RTC se quiser registro offline." },
        {
          tipo: "tarefas",
          itens: [
            { id: "bom-lista", titulo: "Monte sua lista de compras", entrega: "Liste cada item com tensão e corrente. Confira se a bomba cabe na fonte e se o relé suporta a carga. Cole a lista aqui." },
            { id: "bom-sensor", titulo: "Escolha o sensor certo", entrega: "Decida capacitivo x tensiômetro para seu caso e justifique (durabilidade, custo, faixa de leitura)." },
          ],
        },
        {
          tipo: "fontes",
          titulo: "Fontes desta etapa",
          itens: [
            { titulo: "DFRobot — SEN0193 Capacitive Soil Moisture Sensor (docs)", url: "https://wiki.dfrobot.com/sen0193/docs/18036", tipo: "site", nota: "Pinagem, alimentação e exemplo de leitura do sensor mais comum." },
            { titulo: "DroneBot Workshop — Soil Moisture Sensors (guia e sketch)", url: "https://dronebotworkshop.com/soil-moisture/", tipo: "site", nota: "Guia detalhado de sensores resistivo/capacitivo e código de calibração." },
          ],
        },
      ],
    },
    {
      id: "eletronica-ligacao",
      titulo: "O esquema de ligação",
      blocos: [
        { tipo: "texto", texto: "Ligação típica no ESP32: VCC do sensor no 3V3, GND no GND, saída analógica (AOUT) num pino ADC (ex.: GPIO34). O relé recebe VCC/GND e um sinal de GPIO (ex.: GPIO26). A bomba fica no lado comutado do relé, com sua própria fonte. NUNCA alimente a bomba pelo pino do microcontrolador: ele entrega miliampères, a bomba quer ampères. Um diodo de roda-livre protege contra o pico quando a bomba desliga." },
        {
          tipo: "prancha",
          titulo: "Ligacao sensor-ESP32-rele-bomba",
          desenho: {
            legenda: "Sinal (sensor->ESP32) separado da potencia (fonte->rele->bomba).",
            primitivas: [
              { t: "retangulo", p: [20, 70], w: 45, h: 40, cor: "tinta" },
              { t: "rotulo", p: [22, 125], texto: "Sensor" },
              { t: "retangulo", p: [110, 60], w: 55, h: 60, cor: "tinta" },
              { t: "rotulo", p: [112, 135], texto: "ESP32" },
              { t: "seta", de: [65, 90], ate: [110, 90], cor: "destaque" },
              { t: "rotulo", p: [66, 82], texto: "AOUT->GPIO34" },
              { t: "retangulo", p: [210, 55], w: 45, h: 35, cor: "tinta" },
              { t: "rotulo", p: [210, 105], texto: "Rele" },
              { t: "seta", de: [165, 80], ate: [210, 75], cor: "destaque" },
              { t: "rotulo", p: [165, 65], texto: "GPIO26" },
              { t: "retangulo", p: [210, 120], w: 45, h: 30, cor: "destaque" },
              { t: "rotulo", p: [210, 165], texto: "Bomba + fonte" },
              { t: "seta", de: [232, 90], ate: [232, 120], cor: "tinta" },
            ],
          },
        },
        {
          tipo: "licao",
          pergunta: "Por que a bomba não pode ser ligada direto num pino GPIO do ESP32?",
          alternativas: [
            "Porque o GPIO é digital e a bomba é analógica",
            "Porque o pino fornece só miliampères e a bomba exige ampères; precisa de relé/MOSFET e fonte própria",
            "Porque o ESP32 não tem pinos de saída",
          ],
          correta: 1,
          explicacao: "O GPIO entrega corrente baixíssima. A bomba é comutada por relé ou MOSFET, com fonte dedicada e diodo de roda-livre para o pico indutivo.",
        },
      ],
    },
    {
      id: "alimentacao-energia",
      titulo: "Alimentação, ADC e precisão",
      blocos: [
        { tipo: "texto", texto: "Dois detalhes salvam o projeto. 1) O ADC do ESP32 é menos linear e mais ruidoso que o do Arduino; para leitura fina, use média de várias amostras ou um conversor externo tipo ADS1115. 2) O sensor capacitivo é 3,3 V-compatível — alimente-o em 3V3 para casar a escala com o ADC do ESP32. Em campo sem tomada, uma bateria com painel solar e um modo de sono profundo (deep sleep) entre leituras fazem o sistema durar." },
        { tipo: "diagrama", titulo: "Cadeia de leitura e energia", codigo: `flowchart LR
  SOL["Painel solar"] --> BAT["Bateria + carga"]
  BAT --> REG["Regulador 3V3"]
  REG --> ESP["ESP32 (deep sleep entre leituras)"]
  SEN["Sensor 3V3"] --> ADS["Media / ADS1115"]
  ADS --> ESP` },
      ],
    },
    {
      id: "protecao-agua",
      titulo: "Proteger do que mais mata: a água",
      blocos: [
        { tipo: "texto", texto: "Ironia do sensor de umidade: a umidade é o que o destrói. A falha nº 1 dos capacitivos baratos é a água subir pela placa e corroer a eletrônica no topo. Proteja: aplique verniz/epóxi nos contatos expostos e no conector, nunca enterre acima da linha indicada, e guarde o microcontrolador e o relé numa caixa vedada. Para componentes externos, mire grau de proteção IP67 (imersão temporária) conforme a norma IEC 60529." },
        {
          tipo: "prancha",
          titulo: "Vedacao do sistema",
          desenho: {
            legenda: "Caixa IP vedada para a eletronica; verniz no sensor; so a lamina na terra.",
            primitivas: [
              { t: "retangulo", p: [30, 40], w: 90, h: 60, cor: "tinta" },
              { t: "rotulo", p: [32, 115], texto: "Caixa IP67 (ESP32+rele)" },
              { t: "circulo", c: [75, 70], r: 10, cor: "destaque" },
              { t: "retangulo", p: [190, 30], w: 16, h: 110, cor: "tinta" },
              { t: "rotulo", p: [160, 25], texto: "verniz nos contatos" },
              { t: "linha", de: [150, 110], ate: [280, 110], cor: "suave" },
              { t: "rotulo", p: [210, 104], texto: "linha do solo" },
              { t: "rotulo", p: [185, 150], texto: "lamina na terra" },
            ],
          },
        },
        {
          tipo: "fontes",
          titulo: "Fontes desta etapa",
          itens: [
            { titulo: "IEC 60529 — Degrees of protection provided by enclosures (IP Code)", url: "https://webstore.iec.ch/publication/2452", tipo: "norma", nota: "Define os graus IP (ex.: IP67) para proteção contra pó e água de caixas e conectores." },
            { titulo: "Hackaday — Comparing cheap capacitive soil moisture sensors with commercial sensors", url: "https://hackaday.com/2023/02/01/comparing-cheap-capacitative-soil-moisture-sensors-with-commercial-sensors/", tipo: "artigo", nota: "Mostra a fragilidade dos capacitivos baratos e a importância de vedar a eletrônica." },
          ],
        },
      ],
    },
    {
      id: "firmware",
      titulo: "A lógica do firmware (com histerese)",
      blocos: [
        { tipo: "texto", texto: "O coração do software é um controle com HISTERESE: liga a bomba quando a umidade cai abaixo de LIGA e só desliga quando sobe acima de DESLIGA (DESLIGA > LIGA). Sem essa folga, a bomba ficaria 'tremendo' (liga-desliga) em torno de um único limite. Some um tempo máximo de rega (segurança contra sensor solto) e um intervalo entre leituras. Em pseudocódigo: leia, calibre, compare, atue, registre, durma." },
        { tipo: "diagrama", titulo: "Laco de controle com histerese", codigo: `flowchart TD
  I["Le sensor e aplica calibracao"] --> Q{"umidade < LIGA ?"}
  Q -->|"sim"| ON["Liga bomba (ate DESLIGA ou tempo max)"]
  Q -->|"nao"| R{"umidade > DESLIGA ?"}
  R -->|"sim"| OFF["Desliga bomba"]
  R -->|"nao"| M["Mantem estado"]
  ON --> LOG["Registra"]
  OFF --> LOG
  M --> LOG
  LOG --> SLEEP["Espera / deep sleep"]
  SLEEP --> I` },
        {
          tipo: "licao",
          pergunta: "Para que serve a histerese (dois limites, LIGA e DESLIGA) no firmware?",
          alternativas: [
            "Para economizar memória",
            "Para a bomba não ficar ligando e desligando sem parar em torno de um único valor",
            "Para dispensar a calibração",
          ],
          correta: 1,
          explicacao: "Com uma folga entre ligar e desligar, a bomba completa um ciclo útil em vez de oscilar rápido (chattering) no limiar — mais vida útil e rega estável.",
        },
      ],
    },
    // ===================== EXECUÇÃO =====================
    {
      id: "montagem-bancada",
      titulo: "Montagem e teste de bancada",
      blocos: [
        { tipo: "texto", texto: "Antes do campo, monte tudo na bancada em protoboard. Teste cada bloco isolado: leia o sensor no ar e num copo de terra úmida; acione o relé por software com a bomba desconectada (ouça o clique); só então ligue a bomba numa bacia. Confirme a calibração e os limites LIGA/DESLIGA com terra de verdade, não só ar e água." },
        {
          tipo: "prancha",
          titulo: "Bancada de teste",
          desenho: {
            legenda: "Protoboard com ESP32 e rele; copo de terra umida para aferir leitura.",
            primitivas: [
              { t: "retangulo", p: [30, 50], w: 120, h: 70, cor: "tinta", hachura: true },
              { t: "rotulo", p: [32, 135], texto: "Protoboard + ESP32 + rele" },
              { t: "circulo", c: [220, 90], r: 28, cor: "tinta" },
              { t: "rotulo", p: [195, 135], texto: "Copo de terra umida" },
              { t: "retangulo", p: [214, 55], w: 8, h: 40, cor: "destaque" },
              { t: "seta", de: [150, 85], ate: [190, 85], cor: "suave" },
            ],
          },
        },
        {
          tipo: "tarefas",
          itens: [
            { id: "banc-rele", titulo: "Teste o relé sem a bomba", entrega: "Rode o código acionando o relé; confirme o clique e o LED. Só depois conecte a bomba. Relate o resultado." },
            { id: "banc-cal", titulo: "Confirme a calibração com terra", entrega: "Compare leituras em terra seca, úmida e encharcada com os limites definidos. Ajuste LIGA/DESLIGA se preciso." },
          ],
        },
      ],
    },
    {
      id: "instalacao-campo",
      titulo: "Instalação no campo",
      blocos: [
        { tipo: "texto", texto: "No canteiro, abra o furo na profundidade escolhida, insira o sensor garantindo contato pleno com o solo (aperte a terra em volta, elimine bolsas de ar) e deixe a eletrônica acima da superfície. Posicione a caixa vedada à sombra e protegida de respingos. Instale o emissor de água (gotejador/mangueira) de modo que a água chegue à zona que o sensor lê — senão o sistema 'não enxerga' a própria rega." },
        {
          tipo: "prancha",
          titulo: "Sensor instalado no canteiro",
          desenho: {
            legenda: "Furo na profundidade certa, contato firme, eletronica fora da terra e gotejo na zona lida.",
            primitivas: [
              { t: "linha", de: [20, 70], ate: [290, 70], cor: "tinta" },
              { t: "rotulo", p: [22, 64], texto: "superficie" },
              { t: "retangulo", p: [120, 40], w: 12, h: 80, cor: "tinta" },
              { t: "rotulo", p: [136, 95], texto: "sensor na zona de raizes" },
              { t: "circulo", c: [126, 35], r: 8, cor: "destaque" },
              { t: "rotulo", p: [95, 25], texto: "eletronica fora da terra" },
              { t: "seta", de: [200, 50], ate: [200, 70], cor: "suave" },
              { t: "rotulo", p: [205, 55], texto: "gotejo" },
            ],
          },
        },
        {
          tipo: "tarefas",
          itens: [
            { id: "inst-contato", titulo: "Instale com contato pleno", entrega: "Enterre o sensor, firme a terra e confirme que a leitura muda ao regar um pouco à mão. Foto do antes/depois." },
          ],
        },
      ],
    },
    {
      id: "ligar-bomba",
      titulo: "A bomba e a segurança elétrica",
      blocos: [
        { tipo: "texto", texto: "Se a sua bomba é de baixa tensão (3–12 V DC), você mesmo faz a ligação com relé/MOSFET e fonte adequada. Mas se o sistema usa bomba ou tomada em 127/220 V (rede elétrica), aí entra risco de choque e incêndio: fiação, aterramento, disjuntor e DR seguem a NBR 5410, e a execução é de ELETRICISTA HABILITADO. Não improvise mains. Prefira manter tudo em baixa tensão quando possível." },
        {
          tipo: "mobilizacao",
          papel: "Eletricista habilitado (instalação em 127/220 V)",
          porque: "Qualquer trecho ligado à rede elétrica (bomba AC, tomada, quadro) envolve risco de choque e incêndio e deve seguir a ABNT NBR 5410, com aterramento, disjuntor e DR — serviço de profissional habilitado, não de improviso.",
          entregaEsperada: "Ponto de energia seguro e aterrado para a bomba/fonte, conforme NBR 5410, com proteção (disjuntor/DR) e laudo do serviço.",
          gerenciadoPor: "zaeon",
        },
        {
          tipo: "fontes",
          itens: [
            { titulo: "ABNT NBR 5410 — Instalações elétricas de baixa tensão", url: "https://www.target.com.br/produtos/normas-tecnicas/28721/nbr5410-instalacoes-eletricas-de-baixa-tensao", tipo: "norma", nota: "Norma brasileira para instalações de baixa tensão: aterramento, proteção e segurança da parte em rede." },
          ],
        },
      ],
    },
    {
      id: "teste-irrigacao",
      titulo: "O primeiro ciclo de irrigação",
      blocos: [
        { tipo: "texto", texto: "Com tudo instalado, rode o primeiro ciclo observando: a bomba liga quando a umidade cai abaixo de LIGA? Desliga ao subir acima de DESLIGA? A lâmina aplicada bate com a conta (18 mm no exemplo)? Ajuste o tempo de bomba para entregar a lâmina certa e refine os limites olhando o solo um dia depois (nem poça na superfície, nem murcha). Documente os valores que funcionaram." },
        {
          tipo: "licao",
          pergunta: "No primeiro ciclo, a bomba liga mas não desliga nunca. Qual a causa mais provável?",
          alternativas: [
            "O limite DESLIGA está inalcançável ou o sensor perdeu contato/água não chega à zona lida",
            "O ESP32 é lento demais",
            "Falta Wi-Fi",
          ],
          correta: 0,
          explicacao: "Se a umidade nunca atinge DESLIGA, ou a água não chega ao sensor (emissor mal posicionado / sensor solto), ou o limite foi mal definido. Revise contato, posição do gotejo e setpoints.",
        },
      ],
    },
    {
      id: "validacao-campo",
      titulo: "Validar contra a realidade",
      blocos: [
        { tipo: "texto", texto: "Confiar cegamente no sensor é perigoso. Valide periodicamente: colha uma amostra ao lado do sensor, meça a umidade por gravimetria e compare com o que o sensor indicou no mesmo instante. Desvios revelam drift, perda de contato ou necessidade de recalibrar. Datasets de campo de sensores de baixo custo mostram exatamente esse exercício de comparação sensor-versus-gravimetria ao longo das semanas." },
        { tipo: "diagrama", titulo: "Loop de validacao de campo", codigo: `flowchart LR
  LE["Le o sensor"] --> AM["Coleta amostra ao lado"]
  AM --> GR["Gravimetria (θ real)"]
  GR --> CMP{"desvio aceitavel ?"}
  CMP -->|"sim"| OK["Segue"]
  CMP -->|"nao"| RE["Recalibra / revisa contato"]` },
        {
          tipo: "fontes",
          itens: [
            { titulo: "Strypsteen et al. (2026) — Field Performance and Calibration of Low-Cost Capacitive Sensors (dataset, Zenodo)", url: "https://zenodo.org/records/16911016", tipo: "dataset", nota: "Planilhas de campo comparando sensor e referência — modelo do exercício de validação." },
          ],
        },
      ],
    },
    // ===================== MANUTENÇÃO =====================
    {
      id: "manutencao-rotina",
      titulo: "Manutenção de rotina",
      blocos: [
        { tipo: "texto", texto: "Um sistema de irrigação é vivo: precisa de cuidado. Mensalmente, limpe o sensor (terra incrustada muda a leitura), cheque corrosão e o verniz, confira a carga da bateria/painel, teste o acionamento do relé e verifique vazamentos no gotejo. A cada estação, recalibre — solos e sensores mudam com o tempo. O tensiômetro, em especial, exige manutenção frequente (completar a água, checar o vácuo)." },
        {
          tipo: "prancha",
          titulo: "Checklist mensal (visual)",
          desenho: {
            legenda: "Cinco pontos de verificacao recorrentes do sistema.",
            primitivas: [
              { t: "retangulo", p: [30, 30], w: 240, h: 130, cor: "tinta" },
              { t: "circulo", c: [50, 55], r: 5, cor: "destaque" },
              { t: "rotulo", p: [62, 55], texto: "Limpar o sensor" },
              { t: "circulo", c: [50, 80], r: 5, cor: "destaque" },
              { t: "rotulo", p: [62, 80], texto: "Checar corrosao / verniz" },
              { t: "circulo", c: [50, 105], r: 5, cor: "destaque" },
              { t: "rotulo", p: [62, 105], texto: "Bateria / painel solar" },
              { t: "circulo", c: [50, 130], r: 5, cor: "destaque" },
              { t: "rotulo", p: [62, 130], texto: "Testar rele e bomba" },
              { t: "circulo", c: [50, 150], r: 5, cor: "destaque" },
              { t: "rotulo", p: [62, 150], texto: "Vazamentos no gotejo" },
            ],
          },
        },
        {
          tipo: "tarefas",
          itens: [
            { id: "manut-cal", titulo: "Agende a recalibração sazonal", entrega: "Marque no calendário a recalibração a cada estação e registre as novas curvas. Compare com a anterior." },
          ],
        },
      ],
    },
    {
      id: "problemas-comuns",
      titulo: "Problemas comuns e como resolver",
      blocos: [
        { tipo: "texto", texto: "Leitura pulando: ruído do ADC — use média e cabo curto/blindado. Leitura 'travada' em seco: sensor sem contato, cabo rompido ou eletrônica molhada. Bomba não desarma: limite DESLIGA inatingível ou água não chega ao sensor. Valores diferentes entre dois sensores iguais: cada placa varia — calibre individualmente. Corrosão rápida: sensor resistivo ou verniz falho. Quase todo problema cai numa destas famílias." },
        { tipo: "diagrama", titulo: "Arvore de diagnostico", codigo: `flowchart TD
  P{"Sintoma?"} -->|"leitura pula"| R1["Media de amostras, cabo curto/blindado"]
  P -->|"travada em seco"| R2["Checar contato, cabo e vedacao"]
  P -->|"bomba nao desarma"| R3["Rever DESLIGA e posicao do gotejo"]
  P -->|"2 sensores discordam"| R4["Calibrar cada placa"]
  P -->|"corrosao"| R5["Trocar por capacitivo, revernizar"]` },
        {
          tipo: "licao",
          pergunta: "Dois sensores idênticos, no mesmo solo, dão valores brutos diferentes. O que fazer?",
          alternativas: [
            "Descartar um deles, está com defeito",
            "Calibrar cada placa separadamente — variação entre unidades é normal",
            "Usar a média bruta sem calibrar",
          ],
          correta: 1,
          explicacao: "Variação de fabricação faz cada placa ter sua própria escala. A calibração individual (seco/molhado + gravimetria) é o que torna as leituras comparáveis.",
        },
      ],
    },
    {
      id: "durabilidade",
      titulo: "Durabilidade e deriva (drift)",
      blocos: [
        { tipo: "texto", texto: "Sensores baratos envelhecem: a leitura pode 'derivar' com o tempo (drift) por desgaste do verniz, oxidação de contatos e variação da eletrônica. O capacitivo selado dura muito mais que o resistivo, mas nenhum é eterno. Comparações independentes mostram que os capacitivos de poucos reais funcionam para hortas e aprendizado, porém ficam atrás de sondas comerciais em estabilidade — por isso a recalibração periódica e a validação por gravimetria não são opcionais." },
        {
          tipo: "fontes",
          itens: [
            { titulo: "Hackaday — Comparing cheap capacitive soil moisture sensors with commercial sensors", url: "https://hackaday.com/2023/02/01/comparing-cheap-capacitative-soil-moisture-sensors-with-commercial-sensors/", tipo: "artigo", nota: "Avalia estabilidade e limites dos sensores de baixo custo frente a comerciais." },
            { titulo: "DFRobot — SEN0193 (observações de uso e calibração)", url: "https://wiki.dfrobot.com/sen0193/docs/18036", tipo: "site", nota: "Faixas de referência e necessidade de recalibrar por solo." },
          ],
        },
      ],
    },
    // ===================== CASOS REAIS =====================
    {
      id: "caso-horta",
      titulo: "Caso real: horta urbana automatizada",
      blocos: [
        { tipo: "texto", texto: "Monografias e trabalhos de conclusão brasileiros (IFs, Etecs, universidades) descrevem o mesmo arranjo que este caderno ensina: Arduino/ESP + sensor de umidade acionando bomba ou válvula solenoide para manter a horta na umidade ideal, sem depender de alguém molhar. Vários partem de um projeto simples popularizado em vídeo e evoluem para monitoramento remoto (ESP8266 + nuvem). O padrão funciona — e a parte que mais falha é sempre a calibração e a vedação." },
        { tipo: "video", titulo: "Rega automática da horta com sensor e IoT (passo a passo)", youtube: "pgGpuws7f9o" },
        {
          tipo: "licao",
          pergunta: "Segundo os relatos de projetos reais, qual é o ponto que mais falha nesses sistemas?",
          alternativas: [
            "A cor do fio",
            "A calibração do sensor e a vedação contra água",
            "A marca do microcontrolador",
          ],
          correta: 1,
          explicacao: "O hardware básico é robusto; o que derruba os projetos é sensor mal calibrado (leitura sem significado) e água entrando na eletrônica.",
        },
      ],
    },
    {
      id: "caso-pesquisa",
      titulo: "Caso real: ciência de sensor barato",
      blocos: [
        { tipo: "texto", texto: "Na pesquisa, Strypsteen e colegas publicaram um estudo de desempenho de campo e estratégias de calibração para sensores capacitivos de baixo custo, com um logger Arduino de quatro sondas e os dados abertos (laboratório + campo). É a prova de que o mesmo princípio da sua horta sustenta trabalho científico: medir, calibrar contra referência e validar ao longo do tempo. O dataset está disponível para qualquer um reproduzir as contas." },
        {
          tipo: "fontes",
          titulo: "Fontes deste caso",
          itens: [
            { titulo: "Strypsteen, Persson, Rakonjac & Miroshnychenko — dados do artigo em Sensors (Zenodo)", url: "https://zenodo.org/records/16911016", tipo: "dataset", nota: "Código, documentação e planilhas de laboratório e campo do logger capacitivo." },
            { titulo: "FAO — Irrigation scheduling: from theory to practice (métodos e limitações)", url: "https://www.fao.org/4/W4367E/w4367e04.htm", tipo: "artigo", nota: "Contexto científico do manejo por umidade/tensão e suas limitações no campo." },
          ],
        },
      ],
    },
    // ===================== RECURSOS =====================
    {
      id: "recursos",
      titulo: "Recursos para ir além",
      blocos: [
        { tipo: "texto", texto: "Reúna aqui o que ancora cada decisão do seu projeto. As fontes abaixo cobrem a física do solo (FAO), o manejo nacional (Embrapa), a eletrônica do sensor (DFRobot, DroneBot), a segurança (IEC) e dados reais para calibrar (Zenodo, UNL). Volte a elas sempre que precisar justificar um número — a regra do caderno é: nada se afirma sem lastro." },
        {
          tipo: "fontes",
          titulo: "Biblioteca do caderno",
          itens: [
            { titulo: "FAO-56 — Crop evapotranspiration (Allen et al., 1998)", url: "https://www.fao.org/4/x0490e/x0490e00.htm", tipo: "livro", nota: "CC, PMP, água disponível, fração de depleção p e lâmina." },
            { titulo: "FAO — Irrigation scheduling methods and techniques (Water Report 8)", url: "https://www.fao.org/4/W4367E/w4367e04.htm", tipo: "artigo", nota: "Métodos de manejo por umidade e tensão e seus limites." },
            { titulo: "FAO GSP — Soil texture by the ribbon test", url: "https://www.fao.org/fileadmin/user_upload/GSP/GSDP/Field_exercises/New_format_EN/P01b-Texture-Ribbon-EN.pdf", tipo: "artigo", nota: "Classificar a textura do solo em campo, sem instrumento." },
            { titulo: "Embrapa — Controle da irrigação de hortaliças (tensiômetro)", url: "https://www.infoteca.cnptia.embrapa.br/bitstream/doc/939283/1/5ControledaIrrigacaodeHortalicas.pdf", tipo: "livro", nota: "Manejo nacional por tensiometria em hortaliças." },
            { titulo: "Embrapa — Manejo da irrigação com o sensor Irrigas", url: "https://www.infoteca.cnptia.embrapa.br/infoteca/bitstream/doc/1017645/1/LivroIRRIGASVersaoFinal2015Internet.pdf", tipo: "livro", nota: "Tensiometria gasosa de baixo custo, tecnologia brasileira." },
            { titulo: "UNL CropWatch — Soil water content and matric potential irrigation trigger values", url: "https://cropwatch.unl.edu/2019/SWC-SMP-irrigation-trigger-values/", tipo: "artigo", nota: "Valores de gatilho por tipo de solo, em conteúdo e em tensão." },
            { titulo: "DFRobot — Capacitive Soil Moisture Sensor SEN0193", url: "https://wiki.dfrobot.com/sen0193/docs/18036", tipo: "site", nota: "Documentação, pinagem e código de referência." },
            { titulo: "DroneBot Workshop — Soil Moisture Sensors", url: "https://dronebotworkshop.com/soil-moisture/", tipo: "site", nota: "Guia prático de sensores e calibração para maker." },
            { titulo: "IEC 60529 — IP Code (proteção de invólucros)", url: "https://webstore.iec.ch/publication/2452", tipo: "norma", nota: "Graus IP para vedar a eletrônica em campo." },
            { titulo: "Strypsteen et al. — dataset de sensores capacitivos de baixo custo", url: "https://zenodo.org/records/16911016", tipo: "dataset", nota: "Dados abertos para praticar calibração e validação." },
          ],
        },
        {
          tipo: "tarefas",
          itens: [
            { id: "plano-projeto", titulo: "Escreva o plano do seu irrigador", entrega: "Em uma página: cultura e solo (textura), sensor escolhido, calibração feita, gatilho e lâmina, arquitetura elétrica, vedação e plano de manutenção. Cole aqui." },
          ],
        },
      ],
    },
    // ===================== SÍNTESE =====================
    {
      id: "compilado",
      titulo: "Prancha de síntese",
      blocos: [
        { tipo: "texto", texto: "Arraste os cards pelo carimbo para montar a sua jornada — do reservatório de água no solo (FAO) à calibração por gravimetria, do esquema elétrico do ESP32 à bomba que desarma sozinha, da instalação à manutenção. Abaixo da prancha, suas anotações, fotos e laudos aparecem na ordem das páginas, prontos para virar o projeto do seu irrigador real." },
        { tipo: "compilado" },
      ],
    },
  ],
};
