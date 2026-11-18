import type { CadernoEstudo } from "../cadernosEstudo";

/**
 * Caderno de campo: Monitor de consumo elétrico para uma casa.
 * Conteúdo com lastro: regulação ANEEL (REN 1.000/2021, PRODIST Módulo 5, bandeiras tarifárias),
 * EPE/Balanço Energético Nacional, segurança NR-10 e projeto NBR 5410, e engenharia de medição
 * do projeto OpenEnergyMonitor (EmonLib/CT SCT-013), ESPHome (ct_clamp, pulse_meter) e módulos
 * prontos (PZEM/ATM90E). As etapas que exigem mexer no padrão de entrada e no quadro viram
 * blocos de mobilização de eletricista habilitado. Vídeos conferidos um a um antes de entrar.
 */
export const caderno: CadernoEstudo = {
  id: "monitor-energia",
  titulo: "Monitor de consumo elétrico para uma casa",
  resumo:
    "Do relógio da concessionária ao painel na palma da mão: como ler, medir, calcular e instalar um monitor de energia residencial com sensor não invasivo, sempre com norma, cálculo e o eletricista certo na hora certa.",
  paginas: [
    // ===================== CAPÍTULO 1 — CONTEXTO E VISÃO =====================
    {
      id: "abertura",
      titulo: "Como usar este caderno de campo",
      blocos: [
        { tipo: "texto", texto: "Este caderno acompanha quem quer saber, em tempo real, quanto a própria casa gasta de energia e onde esse gasto se esconde. Cada página traz leitura curta, um desenho ou diagrama, tarefas práticas e a fonte que sustenta a afirmação. Nada aqui é chute: quando aparece um número, ele vem de norma, dataset ou tutorial citado na mesma página." },
        { tipo: "texto", texto: "Regra do caderno: antes de instalar, meça com segurança; antes de confiar no número, calibre; e quando o trabalho exigir abrir o padrão ou mexer no quadro energizado, a página mostra um campo de mobilização que chama um eletricista habilitado e acompanha até ficar pronto. Você lê, desenha, programa e valida; o profissional assina e executa o que a NR-10 reserva a ele." },
        { tipo: "diagrama", titulo: "O percurso do caderno", codigo: `flowchart TD
  A["Contexto: por que medir"] --> B["Grandezas: V, I, P, fp, kWh"]
  B --> C["Método: 3 formas de medir"]
  C --> D["Cálculo: burden, calibração, RMS"]
  D --> E["Projeto: ESP32, firmware, segurança"]
  E --> F["Execução: bancada e quadro"]
  F --> G["Manutenção e validação"]
  G --> H["Casos reais: caçar o vilão"]
  H --> I["Recursos"]
  I --> J["Prancha de síntese"]` },
      ],
    },
    {
      id: "por-que-medir",
      titulo: "Por que medir muda o comportamento",
      blocos: [
        { tipo: "texto", texto: "No Brasil, a classe residencial responde por cerca de um quarto de todo o consumo final de eletricidade (EPE, Balanço Energético Nacional). Dentro da casa, poucos aparelhos dominam a conta: chuveiro, geladeira, ar-condicionado, iluminação e eletrônicos de uso contínuo. O problema é que a conta chega uma vez por mês, somada, e esconde quem gastou o quê." },
        { tipo: "texto", texto: "Um monitor de consumo quebra esse silêncio: ele mostra o watt subindo quando o chuveiro liga e o ciclo da geladeira ao longo do dia. Estudos de feedback de energia mostram que só o ato de ver o consumo em tempo real já reduz o gasto, porque o morador passa a associar hábito e custo. Medir não é um fim: é o primeiro passo para decidir com dado em vez de palpite." },
        {
          tipo: "licao",
          pergunta: "Por que a conta mensal única dificulta economizar energia?",
          alternativas: [
            "Porque o preço do kWh muda todo dia",
            "Porque ela soma tudo e esconde qual hábito e qual aparelho puxam o gasto",
            "Porque a concessionária não mede corretamente",
          ],
          correta: 1,
          explicacao: "A fatura agrega o mês inteiro. Sem ver o consumo instantâneo por aparelho, o morador não liga causa (um banho longo) a efeito (reais na conta).",
        },
      ],
    },
    {
      id: "relogio-da-casa",
      titulo: "O relógio da casa: o que a concessionária mede",
      blocos: [
        { tipo: "texto", texto: "O ponto de partida é o medidor oficial, o relógio de luz, instalado no padrão de entrada. Ele integra potência ao longo do tempo e registra energia em quilowatt-hora (kWh). É esse número, lido pela distribuidora, que vira a fatura. Seu monitor caseiro nunca substitui o medidor oficial: ele espelha, em tempo real, a mesma grandeza que o relógio acumula devagar." },
        { tipo: "texto", texto: "Medidores modernos são eletrônicos e costumam ter um LED que pisca a cada pequena quantidade de energia (por exemplo, 1000 pulsos por kWh, impresso na placa como imp/kWh). Esse LED é, de graça, um ponto de medida: contar piscadas é contar energia. Guarde esse detalhe, porque é a forma mais segura de medir a casa inteira sem tocar em fio vivo." },
        { tipo: "video", titulo: "Medidores de energia elétrica: modelos e ligações", youtube: "kHsMhF-Y17U" },
        {
          tipo: "prancha",
          titulo: "Padrão de entrada e o ponto de medida",
          desenho: {
            legenda: "Da rede ao quadro. O medidor registra kWh; o LED imp/kWh e o cabo do quadro são os pontos onde o monitor observa, sem interromper o fornecimento.",
            primitivas: [
              { t: "linha", de: [8, 40], ate: [60, 40], cor: "tinta" },
              { t: "rotulo", p: [6, 30], texto: "Rede" },
              { t: "retangulo", p: [60, 22], w: 60, h: 46, cor: "tinta" },
              { t: "rotulo", p: [64, 16], texto: "Medidor kWh" },
              { t: "circulo", c: [112, 60], r: 4, cor: "destaque" },
              { t: "rotulo", p: [100, 80], texto: "LED imp/kWh" },
              { t: "linha", de: [120, 45], ate: [170, 45], cor: "tinta" },
              { t: "retangulo", p: [170, 20], w: 70, h: 60, cor: "tinta" },
              { t: "rotulo", p: [176, 14], texto: "Quadro/disjuntor" },
              { t: "seta", de: [205, 80], ate: [205, 120] },
              { t: "rotulo", p: [150, 128], texto: "Circuitos da casa" },
              { t: "retangulo", p: [120, 140], w: 60, h: 36, hachura: true },
              { t: "retangulo", p: [200, 140], w: 60, h: 36, hachura: true },
            ],
          },
        },
      ],
    },
    {
      id: "fontes-contexto",
      titulo: "Fontes: contexto e regulação",
      blocos: [
        { tipo: "texto", texto: "Estes endereços sustentam o capítulo e servem de porta de entrada. Guarde-os: o caderno volta a eles no cálculo e no projeto." },
        { tipo: "fontes", titulo: "Regulação e dados oficiais", itens: [
          { titulo: "EPE — Balanço Energético Nacional (BEN)", url: "https://www.epe.gov.br/pt/publicacoes-dados-abertos/publicacoes/balanco-energetico-nacional-ben", tipo: "dataset", nota: "Série anual oficial de oferta e consumo; participação residencial e séries abertas." },
          { titulo: "ANEEL — Bandeiras Tarifárias", url: "https://www.gov.br/aneel/pt-br/assuntos/tarifas/bandeiras-tarifarias", tipo: "norma", nota: "Verde sem acréscimo; amarela e vermelha (P1/P2) com adicional por kWh." },
          { titulo: "ANEEL — REN nº 1.000/2021 (regras do serviço de distribuição)", url: "https://www.legisweb.com.br/legislacao/?id=490988", tipo: "norma", nota: "Define medição, classe residencial (subgrupo B1) e remete ao PRODIST." },
        ] },
        {
          tipo: "licao",
          pergunta: "O monitor caseiro serve para:",
          alternativas: ["Substituir o medidor oficial da conta", "Espelhar em tempo real a mesma energia que o relógio acumula", "Reduzir a tarifa cobrada pela distribuidora"],
          correta: 1,
          explicacao: "O faturamento é do medidor oficial. O monitor dá visibilidade instantânea; quem decide a tarifa é a regulação, não o aparelho.",
        },
      ],
    },
    // ===================== CAPÍTULO 2 — LEITURA DO TEMA: AS GRANDEZAS =====================
    {
      id: "tensao-corrente-potencia",
      titulo: "Tensão, corrente e potência",
      blocos: [
        { tipo: "texto", texto: "Três grandezas sustentam tudo. Tensão (V), a força que empurra os elétrons, é fixada pela rede: 127 V ou 220 V eficazes, em 60 Hz no Brasil. Corrente (I), em ampères, é quanto de carga passa; ela sobe conforme o aparelho puxa energia. Potência instantânea (P), em watts, é tensão vezes corrente: é a taxa com que a casa consome energia naquele instante." },
        { tipo: "texto", texto: "Em corrente alternada, tensão e corrente oscilam como senoides 60 vezes por segundo. Por isso não se usa o pico, e sim o valor eficaz (RMS), que é o valor contínuo equivalente em aquecimento. Todo o trabalho do monitor é amostrar essas senoides rápido o bastante para calcular o RMS e, daí, a potência." },
        {
          tipo: "prancha",
          titulo: "Senoide de 60 Hz: pico e RMS",
          desenho: {
            legenda: "Tensão alternada. O valor eficaz (RMS) é o pico dividido por raiz de 2; é ele que importa para potência e para a conta.",
            primitivas: [
              { t: "linha", de: [12, 100], ate: [300, 100], cor: "tinta" },
              { t: "linha", de: [16, 20], ate: [16, 180], cor: "tinta" },
              { t: "curva", pts: [[16, 100], [50, 40], [84, 100], [118, 160], [152, 100], [186, 40], [220, 100], [254, 160], [288, 100]], cor: "destaque" },
              { t: "linha", de: [16, 40], ate: [300, 40], cor: "suave" },
              { t: "rotulo", p: [220, 34], texto: "Pico" },
              { t: "linha", de: [16, 58], ate: [300, 58], cor: "suave" },
              { t: "rotulo", p: [220, 52], texto: "RMS" },
              { t: "rotulo", p: [260, 108], texto: "tempo" },
            ],
          },
        },
      ],
    },
    {
      id: "potencia-fp",
      titulo: "Potência ativa, aparente e fator de potência",
      blocos: [
        { tipo: "texto", texto: "Nem toda corrente vira trabalho. Cargas com motor ou bobina (geladeira, ar-condicionado, bomba) defasam a corrente em relação à tensão. Surgem três potências: ativa (W), que faz trabalho e é cobrada na residência; aparente (VA), que é tensão RMS vezes corrente RMS; e reativa (VAr), que vai e volta sem trabalho útil. O fator de potência (fp) é a razão ativa/aparente, de 0 a 1." },
        { tipo: "texto", texto: "Isso tem consequência prática no monitor. Se você só mede corrente e multiplica por uma tensão fixa, obtém potência aparente (VA), que superestima o gasto de cargas indutivas. Para potência ativa real (W) é preciso medir tensão e corrente juntas, no mesmo instante, e multiplicar amostra a amostra. Decida cedo: estimativa barata (só corrente) ou medida fiel (tensão + corrente)." },
        { tipo: "diagrama", titulo: "Triângulo das potências", codigo: `flowchart LR
  I["Corrente RMS x Tensão RMS"] --> S["Potência aparente (VA)"]
  S --> P["Ativa (W): faz trabalho, e cobrada"]
  S --> Q["Reativa (VAr): vai e volta"]
  P --> FP["Fator de potencia = W / VA"]
  Q --> FP` },
        {
          tipo: "licao",
          pergunta: "Medir só corrente e multiplicar por uma tensão fixa dá qual potência?",
          alternativas: ["Ativa (W) exata", "Aparente (VA), que superestima cargas indutivas", "Reativa (VAr)"],
          correta: 1,
          explicacao: "Sem medir a tensão em fase com a corrente, você obtém VA. Para W reais é preciso o produto instantâneo de tensão e corrente.",
        },
      ],
    },
    {
      id: "energia-kwh",
      titulo: "De potência a energia: o quilowatt-hora",
      blocos: [
        { tipo: "texto", texto: "Potência é taxa; energia é potência acumulada no tempo. A unidade da conta é o quilowatt-hora: 1 kWh é manter 1000 W ligados por uma hora. Em fórmula, energia (kWh) = potência (kW) x tempo (h). Um chuveiro de 5500 W ligado por 1 hora gasta 5,5 kWh; em 10 minutos, gasta 5,5 x (10/60) = 0,92 kWh." },
        { tipo: "texto", texto: "O monitor acumula energia somando potência a cada intervalo de medida. É por isso que ele precisa de um contador que não zere ao reiniciar: energia é um total que só cresce. Guarde a cadeia que o caderno vai percorrer: corrente medida, potência calculada, energia acumulada, reais estimados pela tarifa mais a bandeira." },
        { tipo: "video", titulo: "Consumo residencial medido em quilowatt-hora (ENEM)", youtube: "hFMM_2cAoLk" },
        {
          tipo: "licao",
          pergunta: "Um aparelho de 2000 W ligado por 30 minutos consome:",
          alternativas: ["2 kWh", "1 kWh", "60 kWh"],
          correta: 1,
          explicacao: "Energia = 2 kW x 0,5 h = 1 kWh. Watts dizem a taxa; é o tempo que transforma potência em energia faturável.",
        },
      ],
    },
    {
      id: "mapa-de-cargas",
      titulo: "Ler o local: o inventário de cargas",
      blocos: [
        { tipo: "texto", texto: "Antes de qualquer sensor, faça a leitura do tema que todo projetista faz: o inventário de cargas. Liste cada aparelho relevante, sua potência de placa (W), quantas horas por dia ele fica ligado e estime o kWh mensal. Esse mapa diz onde vale a pena medir com detalhe e serve de gabarito para conferir o monitor depois." },
        { tipo: "texto", texto: "Padrões típicos ajudam a priorizar: chuveiro e ar-condicionado têm potência alta e uso concentrado; geladeira tem potência baixa, mas liga o dia inteiro, somando muito no fim do mês; stand-by de eletrônicos é pequeno, mas contínuo. O monitor vai confirmar ou derrubar cada estimativa com número real." },
        {
          tipo: "prancha",
          titulo: "Quem pesa na conta: potência x tempo",
          desenho: {
            legenda: "Dois caminhos para um gasto alto: potência alta e uso curto (chuveiro) ou potência baixa e uso contínuo (geladeira). O mapa de cargas revela ambos.",
            primitivas: [
              { t: "linha", de: [20, 170], ate: [300, 170], cor: "tinta" },
              { t: "linha", de: [20, 20], ate: [20, 170], cor: "tinta" },
              { t: "rotulo", p: [2, 90], texto: "kWh/mes" },
              { t: "retangulo", p: [40, 60], w: 34, h: 110, hachura: true, cor: "destaque" },
              { t: "rotulo", p: [36, 178], texto: "Chuveiro" },
              { t: "retangulo", p: [100, 70], w: 34, h: 100, hachura: true },
              { t: "rotulo", p: [96, 178], texto: "Geladeira" },
              { t: "retangulo", p: [160, 95], w: 34, h: 75, hachura: true },
              { t: "rotulo", p: [156, 178], texto: "Ar-cond." },
              { t: "retangulo", p: [220, 140], w: 34, h: 30, hachura: true },
              { t: "rotulo", p: [220, 178], texto: "Standby" },
            ],
          },
        },
        { tipo: "tarefas", itens: [
          { id: "inventario", titulo: "Monte o inventário de cargas da sua casa", entrega: "Numa tabela, liste 8 a 12 aparelhos com potência de placa (W), horas/dia e kWh/mês estimado (W x h/dia x 30 / 1000). Marque os 3 maiores: são seus alvos de medição." },
        ] },
      ],
    },
    {
      id: "fontes-grandezas",
      titulo: "Fontes: grandezas e consumo residencial",
      blocos: [
        { tipo: "fontes", titulo: "Fundamentos e dados de uso", itens: [
          { titulo: "OpenEnergyMonitor — AC Power Theory", url: "https://docs.openenergymonitor.org/electricity-monitoring/ac-power-theory/introduction.html", tipo: "artigo", nota: "RMS, potência ativa/aparente e fator de potência, com a matemática do monitor." },
          { titulo: "PROCEL Info — Eletrobras (eficiência e selo)", url: "http://www.procelinfo.com.br/", tipo: "site", nota: "Programa de conservação de energia; etiquetas e consumo típico de eletrodomésticos." },
          { titulo: "EPE — Anuário Estatístico de Energia Elétrica", url: "https://www.epe.gov.br/pt/publicacoes-dados-abertos/publicacoes/anuario-estatistico-de-energia-eletrica", tipo: "dataset", nota: "Consumo por classe e por região, útil para calibrar expectativas." },
        ] },
      ],
    },
    // ===================== CAPÍTULO 3 — MÉTODO: FORMAS DE MEDIR =====================
    {
      id: "tres-maneiras",
      titulo: "Três formas de medir uma casa",
      blocos: [
        { tipo: "texto", texto: "Existem três arquiteturas, da mais simples à mais completa. Uma: medir um aparelho pela tomada, com um medidor de plugue ou um módulo intercalado; bom para o alvo, inútil para o todo. Duas: ler a casa inteira contando os pulsos do LED do medidor; seguro, barato e exato em energia. Três: medir no quadro com um sensor de corrente não invasivo (CT) abraçando o cabo da entrada; dá potência em tempo real, mas exige abrir o quadro." },
        { tipo: "texto", texto: "A escolha não é só técnica, é de risco. Pulso do LED e medidor de plugue não tocam em fio energizado. O CT no quadro abraça o condutor sem cortá-lo, mas instalar exige abrir o padrão, e aí entra o eletricista habilitado. Muitos projetos combinam: pulso para o total fiel e CT para ver a forma do consumo." },
        { tipo: "diagrama", titulo: "Escolher a arquitetura", codigo: `flowchart TD
  Q["O que voce quer ver?"] --> A["Um aparelho"]
  Q --> B["A casa inteira"]
  A --> A1["Medidor de plugue na tomada"]
  B --> C["Prioridade: energia exata e zero risco?"]
  C -->|Sim| D["Contar pulsos do LED do medidor"]
  C -->|Potencia em tempo real| E["CT nao invasivo no quadro"]
  E --> F["Exige eletricista habilitado"]` },
      ],
    },
    {
      id: "ct-nao-invasivo",
      titulo: "O sensor de corrente não invasivo (CT)",
      blocos: [
        { tipo: "texto", texto: "O sensor estrela do monitor caseiro é o transformador de corrente de núcleo bipartido, o split-core CT, como o YHDC SCT-013. Ele se abre como uma pinça e abraça um único condutor (fase ou neutro), sem cortar nada. O campo magnético da corrente induz, no secundário, uma corrente proporcional e muito menor, que o circuito converte em tensão lida pelo microcontrolador." },
        { tipo: "texto", texto: "Há duas famílias. O SCT-013-000 é um CT de saída em corrente (razão 100 A : 50 mA): precisa de um resistor de carga (burden) externo para virar tensão. Já o SCT-013-030 já traz o burden interno e entrega tensão (1 V para 30 A). Para o -000, o burden é seu primeiro cálculo de projeto; o caderno chega lá no capítulo de cálculo." },
        { tipo: "video", titulo: "Arduino Home Energy Monitor com CT Clamp e ZMPT101B", youtube: "193DiCxWhkY" },
        {
          tipo: "prancha",
          titulo: "CT abraçando um condutor",
          desenho: {
            legenda: "O split-core abre e fecha sobre UM condutor. Abraçar fase e neutro juntos daria campo nulo: o CT leria zero.",
            primitivas: [
              { t: "linha", de: [16, 100], ate: [300, 100], cor: "destaque" },
              { t: "rotulo", p: [12, 86], texto: "Cabo da fase" },
              { t: "circulo", c: [150, 100], r: 40, cor: "tinta" },
              { t: "circulo", c: [150, 100], r: 20, cor: "suave" },
              { t: "rotulo", p: [120, 150], texto: "Nucleo bipartido" },
              { t: "linha", de: [184, 118], ate: [230, 150], cor: "tinta" },
              { t: "linha", de: [184, 122], ate: [230, 158], cor: "tinta" },
              { t: "retangulo", p: [230, 140], w: 60, h: 34, cor: "tinta" },
              { t: "rotulo", p: [236, 134], texto: "Burden + ADC" },
            ],
          },
        },
      ],
    },
    {
      id: "tensao-zmpt",
      titulo: "Medir a tensão com segurança: ZMPT101B",
      blocos: [
        { tipo: "texto", texto: "Para potência ativa real é preciso a tensão instantânea, em fase com a corrente. O módulo ZMPT101B é um pequeno transformador de tensão que reduz os 127/220 V da rede a um sinal de poucos volts, com isolamento galvânico entre a rede e a eletrônica de baixa tensão. Esse isolamento é o que permite ao microcontrolador ver a forma da tensão sem estar referenciado ao perigo da rede." },
        { tipo: "texto", texto: "Atenção: a primária do ZMPT101B é ligada na rede, e isso é trabalho energizado. O caderno trata esse ponto como mobilização de eletricista no capítulo de execução. Muitos monitores caseiros abrem mão de medir tensão e assumem 127 V ou 220 V fixos, aceitando a imprecisão em cargas indutivas em troca de não tocar na rede." },
        {
          tipo: "prancha",
          titulo: "Condicionamento do sinal para o ADC",
          desenho: {
            legenda: "O ADC só lê de 0 a 3,3 V. Um divisor cria o nível médio (offset) e o sinal CA oscila em torno dele, sem passar de negativo nem estourar o teto.",
            primitivas: [
              { t: "linha", de: [16, 30], ate: [16, 170], cor: "tinta" },
              { t: "linha", de: [16, 170], ate: [300, 170], cor: "tinta" },
              { t: "linha", de: [16, 100], ate: [300, 100], cor: "suave" },
              { t: "rotulo", p: [230, 94], texto: "Offset 1,65 V" },
              { t: "curva", pts: [[16, 100], [60, 50], [104, 100], [148, 150], [192, 100], [236, 50], [280, 100]], cor: "destaque" },
              { t: "rotulo", p: [20, 24], texto: "3,3 V" },
              { t: "rotulo", p: [20, 160], texto: "0 V" },
              { t: "rotulo", p: [120, 180], texto: "sinal CA centrado no offset" },
            ],
          },
        },
      ],
    },
    {
      id: "leitura-por-pulso",
      titulo: "A via segura: contar os pulsos do medidor",
      blocos: [
        { tipo: "texto", texto: "A forma mais segura de medir a casa inteira não toca em fio nenhum: lê o LED do medidor oficial. A placa informa a constante, por exemplo 1000 imp/kWh. Um sensor óptico (fototransistor) vê cada piscada; o microcontrolador conta. Cada pulso é uma fração exata de kWh (1/1000 kWh no exemplo). Frequência de pulsos vira potência; soma de pulsos vira energia acumulada, perfeitamente alinhada com a conta." },
        { tipo: "texto", texto: "No ESPHome isso é o componente pulse_meter (potência instantânea a partir do intervalo entre pulsos) ou pulse_counter (contagem por janela). A vantagem é a fidelidade: você mede exatamente o que a distribuidora fatura. A limitação é que vê só o total da casa, não aparelho por aparelho. Por isso ele casa bem com um CT para enxergar a forma do consumo." },
        { tipo: "diagrama", titulo: "Do LED ao kWh", codigo: `flowchart LR
  L["LED do medidor: 1000 imp/kWh"] --> S["Fototransistor"]
  S --> M["ESP conta pulsos"]
  M --> P["Intervalo entre pulsos = potencia (W)"]
  M --> E["Total de pulsos / 1000 = energia (kWh)"]` },
      ],
    },
    {
      id: "pronto-vs-diy",
      titulo: "Módulo pronto ou faça-você-mesmo?",
      blocos: [
        { tipo: "texto", texto: "Nem todo monitor é soldado do zero. Módulos como o PZEM-004T medem tensão, corrente, potência, fp e energia num chip dedicado e entregam tudo por serial; guardam o acumulado mesmo após reiniciar. Chips como o ATM90E26/ATM90E32 são medidores de energia de precisão, usados quando se quer exatidão próxima de comercial. O preço é instalar em série com a carga, o que, na entrada da casa, de novo pede eletricista." },
        { tipo: "texto", texto: "A régua de decisão: CT não invasivo quando o valor é não cortar o circuito e ver em tempo real; módulo pronto quando o valor é precisão e energia persistente; pulso do medidor quando o valor é fidelidade à conta com risco mínimo. Não existe o melhor absoluto, existe o melhor para o seu objetivo e o seu nível de acesso ao quadro." },
        {
          tipo: "licao",
          pergunta: "Qual opção mede a casa inteira sem tocar em condutor energizado?",
          alternativas: ["CT no cabo da entrada", "PZEM em série com a carga", "Contar os pulsos do LED do medidor oficial"],
          correta: 2,
          explicacao: "CT exige abrir o quadro e o PZEM entra em série. Ler o LED é óptico e não invasivo: nenhum contato elétrico com a rede.",
        },
      ],
    },
    {
      id: "fontes-metodo",
      titulo: "Fontes: métodos de medição",
      blocos: [
        { tipo: "fontes", titulo: "Engenharia de medição", itens: [
          { titulo: "OpenEnergyMonitor — CT Sensors (visão geral)", url: "https://docs.openenergymonitor.org/electricity-monitoring/ct-sensors/introduction.html", tipo: "artigo", nota: "Como funciona o split-core CT, variantes do SCT-013 e cuidados." },
          { titulo: "ESPHome — CT Clamp Current Sensor (ct_clamp)", url: "https://esphome.io/components/sensor/ct_clamp.html", tipo: "site", nota: "Componente que lê RMS a partir de um ADC; sample_duration e calibração." },
          { titulo: "ESPHome — Pulse Meter Sensor (pulse_meter)", url: "https://esphome.io/components/sensor/pulse_meter.html", tipo: "site", nota: "Potência e energia a partir dos pulsos do medidor; a via não invasiva." },
          { titulo: "Digi-Key / Maker.io — DIY Whole-Home Energy Monitor com ESPHome", url: "https://www.digikey.com/en/maker/projects/build-a-diy-whole-home-energy-monitor-with-esphome-and-home-assistant/be84610c06894f87a0f75bd443de7992", tipo: "artigo", nota: "Projeto completo com CT, ESP32 e painel no Home Assistant." },
        ] },
      ],
    },
    // ===================== CAPÍTULO 4 — CÁLCULO E MEDIÇÃO =====================
    {
      id: "burden-resistor",
      titulo: "Cálculo: o resistor de carga (burden)",
      blocos: [
        { tipo: "texto", texto: "Para o SCT-013-000, o burden converte a corrente do secundário em tensão para o ADC. A ideia: dimensione o burden para que o pico de tensão fique logo abaixo de metade da alimentação do ADC, porque o sinal CA oscila em torno de um offset no meio da faixa. Para 100 A no primário, o secundário dá 50 mA eficazes, cujo pico é 50 mA x raiz de 2 = 70,7 mA." },
        { tipo: "texto", texto: "Com alimentação de 3,3 V, a metade é 1,65 V; dividindo por 70,7 mA chega-se a cerca de 23 ohms, e escolhe-se o valor comercial abaixo, 22 ohms. A documentação do OpenEnergyMonitor adota 18 ohms para 3,3 V e 33 ohms para 5 V como valores de referência seguros. Não ultrapasse o burden calculado: tensão acima da faixa satura o ADC e distorce a leitura." },
        {
          tipo: "prancha",
          titulo: "Dimensionar o burden",
          desenho: {
            legenda: "Burden = (Vcc/2) / (pico da corrente do secundario). Alvo: pico logo abaixo da meia-escala, com folga.",
            primitivas: [
              { t: "retangulo", p: [20, 30], w: 120, h: 50, cor: "tinta" },
              { t: "rotulo", p: [26, 24], texto: "Vcc/2 = 1,65 V" },
              { t: "retangulo", p: [20, 100], w: 120, h: 50, cor: "tinta" },
              { t: "rotulo", p: [26, 94], texto: "Ipico = 70,7 mA" },
              { t: "seta", de: [150, 90], ate: [200, 90], cor: "destaque" },
              { t: "retangulo", p: [205, 65], w: 95, h: 50, cor: "destaque" },
              { t: "rotulo", p: [210, 58], texto: "Burden ~22 ohm" },
              { t: "rotulo", p: [205, 128], texto: "Ref. OEM: 18R@3V3 / 33R@5V" },
            ],
          },
        },
        { tipo: "tarefas", itens: [
          { id: "calc-burden", titulo: "Calcule o burden do seu CT", entrega: "Com a razão do seu CT e a sua alimentação (3,3 V ou 5 V), calcule o burden ideal e escolha o valor comercial abaixo. Compare com 18 e 33 ohms da referência e anote a diferença." },
        ] },
      ],
    },
    {
      id: "calibracao",
      titulo: "Calibração: do valor cru ao ampère verdadeiro",
      blocos: [
        { tipo: "texto", texto: "O ADC entrega um número cru; calibrar é mapeá-lo para ampères reais. Na biblioteca EmonLib, a chamada emon1.current(pino, 111.1) usa uma constante de calibração: 111.1 é o valor de referência para o SCT-013-030 com burden de 33 ohms. Essa constante traduz a leitura em corrente, e emon1.calcIrms(1480) calcula o valor eficaz amostrando 1480 pontos." },
        { tipo: "texto", texto: "No ESPHome o caminho é o filtro calibrate_linear: ligue uma carga de corrente conhecida (por exemplo, uma lâmpada que puxa 4,0 A), leia o valor que o ct_clamp reporta no log (digamos 0,1333) e mapeie 0 para 0 e 0,1333 para 4,0. Calibração sem referência rastreável serve para hobby; para decisão que precise de exatidão metrológica, a referência tem que ser um instrumento calibrado." },
        { tipo: "diagrama", titulo: "Laço de calibração", codigo: `flowchart LR
  A["Carga de corrente conhecida"] --> B["Ler valor cru no log"]
  B --> C["Mapear cru -> ampere (calibrate_linear ou constante)"]
  C --> D["Conferir com segunda carga"]
  D -->|Erro grande| B
  D -->|Dentro da tolerancia| E["Calibrado"]` },
        { tipo: "mobilizacao", papel: "Laboratório/técnico de metrologia (rede acreditada Inmetro)", porque: "Afirmar exatidão de medida exige referência rastreável. Uma calibração caseira usa uma carga estimada; para que o número do monitor tenha valor metrológico (e não só indicativo), a referência precisa de instrumento com certificado válido.", entregaEsperada: "Certificado de calibração do instrumento de referência (ou do monitor), com erro dentro da tolerância e data da próxima calibração.", gerenciadoPor: "zaeon" },
        {
          tipo: "licao",
          pergunta: "No EmonLib, para que serve a constante 111.1 em emon1.current(1, 111.1)?",
          alternativas: ["É a frequência da rede", "É a constante de calibração que converte a leitura em corrente", "É a tensão da rede"],
          correta: 1,
          explicacao: "111.1 é a constante de calibração de referência do SCT-013-030 com burden de 33 ohms; ela traduz o valor amostrado em ampères.",
        },
      ],
    },
    {
      id: "amostragem-rms",
      titulo: "Amostragem e cálculo do RMS",
      blocos: [
        { tipo: "texto", texto: "Para capturar uma senoide de 60 Hz é preciso amostrar muitas vezes por ciclo. O RMS é a raiz da média dos quadrados das amostras: eleva cada amostra ao quadrado, tira a média sobre um número inteiro de ciclos e extrai a raiz. Amostrar ciclos inteiros evita viés; por isso o ESPHome usa sample_duration de 200 ms, que são 10 ciclos completos em 50 Hz (12 ciclos em 60 Hz), e só então reporta." },
        { tipo: "texto", texto: "Dois erros comuns: janela curta demais, que pega um pedaço de ciclo e enviesa o RMS; e offset mal ajustado, que soma um nível DC falso ao quadrado das amostras. O remédio é medir sobre vários ciclos e remover o offset antes de elevar ao quadrado, exatamente o que EmonLib e ct_clamp fazem por dentro." },
        {
          tipo: "prancha",
          titulo: "Amostrar sobre ciclos inteiros",
          desenho: {
            legenda: "Pontos = amostras do ADC sobre a senoide. A média dos quadrados, em ciclos inteiros, dá o RMS.",
            primitivas: [
              { t: "linha", de: [12, 100], ate: [300, 100], cor: "tinta" },
              { t: "curva", pts: [[16, 100], [50, 50], [84, 100], [118, 150], [152, 100], [186, 50], [220, 100], [254, 150], [288, 100]], cor: "suave" },
              { t: "circulo", c: [33, 75], r: 3, cor: "destaque" },
              { t: "circulo", c: [50, 50], r: 3, cor: "destaque" },
              { t: "circulo", c: [67, 75], r: 3, cor: "destaque" },
              { t: "circulo", c: [101, 125], r: 3, cor: "destaque" },
              { t: "circulo", c: [118, 150], r: 3, cor: "destaque" },
              { t: "circulo", c: [135, 125], r: 3, cor: "destaque" },
              { t: "circulo", c: [169, 75], r: 3, cor: "destaque" },
              { t: "circulo", c: [186, 50], r: 3, cor: "destaque" },
              { t: "circulo", c: [203, 75], r: 3, cor: "destaque" },
              { t: "rotulo", p: [60, 180], texto: "janela = N ciclos inteiros" },
            ],
          },
        },
      ],
    },
    {
      id: "de-corrente-a-reais",
      titulo: "De ampères a reais: fechar a conta",
      blocos: [
        { tipo: "texto", texto: "Agora a cadeia completa com um exemplo. Suponha corrente medida de 25 A em 220 V com fp 0,95: potência ativa = 220 x 25 x 0,95 = 5225 W, ou 5,2 kW. Se essa carga roda 1 hora por dia, são 5,2 kWh/dia, cerca de 157 kWh no mês. É assim que o número do sensor vira energia e, depois, dinheiro." },
        { tipo: "texto", texto: "Para reais, multiplique kWh pela tarifa da sua distribuidora e some a bandeira. A bandeira verde não acrescenta nada; a amarela adiciona cerca de R$ 1,885 a cada 100 kWh; a vermelha, de R$ 4,463 (patamar 1) a R$ 7,877 (patamar 2) por 100 kWh, conforme a ANEEL. O monitor que conhece a tarifa e a bandeira do mês converte consumo em custo em tempo real, o que torna o gasto palpável." },
        { tipo: "tarefas", itens: [
          { id: "fechar-conta", titulo: "Transforme consumo em reais", entrega: "Pegue um aparelho do seu inventário, calcule o kWh/mês e multiplique pela sua tarifa (está na fatura) somando a bandeira do mês. Compare com sua estimativa inicial." },
        ] },
        {
          tipo: "licao",
          pergunta: "Para estimar o custo mensal de uma carga, o que falta além do kWh?",
          alternativas: ["A cor do fio", "A tarifa da distribuidora mais a bandeira tarifária", "A marca do aparelho"],
          correta: 1,
          explicacao: "kWh é quantidade; o custo depende da tarifa local e do adicional de bandeira (verde, amarela ou vermelha P1/P2) do mês.",
        },
      ],
    },
    {
      id: "fontes-calculo",
      titulo: "Fontes: cálculo e calibração",
      blocos: [
        { tipo: "fontes", titulo: "Dimensionamento e calibração", itens: [
          { titulo: "OpenEnergyMonitor — Energy Monitor medindo só corrente (burden e 111.1)", url: "https://docs.openenergymonitor.org/electricity-monitoring/ct-sensors/how-to-build-an-arduino-energy-monitor-measuring-current-only.html", tipo: "artigo", nota: "Burden 18R@3V3 / 33R@5V e constante de calibração 111.1 no EmonLib." },
          { titulo: "OpenEnergyMonitor — EmonLib (biblioteca Arduino)", url: "https://github.com/openenergymonitor/EmonLib", tipo: "site", nota: "calcIrms, current() e o cálculo de potência ativa e aparente." },
          { titulo: "ANEEL — Bandeiras Tarifárias (valores por patamar)", url: "https://www.gov.br/aneel/pt-br/assuntos/tarifas/bandeiras-tarifarias", tipo: "norma", nota: "Adicional por kWh: amarela, vermelha P1 e P2; verde sem acréscimo." },
        ] },
      ],
    },
    // ===================== CAPÍTULO 5 — PROJETO =====================
    {
      id: "escolha-hardware",
      titulo: "Projeto: escolher o cérebro e os pinos",
      blocos: [
        { tipo: "texto", texto: "O ESP32 é a escolha natural: tem Wi-Fi, bom ADC e potência de sobra para amostrar senoides. Um cuidado concreto: use pinos do ADC1 (por exemplo GPIO32 a GPIO39) para os sensores analógicos, porque o ADC2 fica indisponível quando o Wi-Fi está ligado. Reserve um pino digital com interrupção para o fototransistor do pulso, se for usar a via não invasiva." },
        { tipo: "texto", texto: "Monte o circuito de offset (divisor resistivo que fixa a meia-escala) para cada entrada analógica e um capacitor de desacoplamento para estabilizar essa referência. Decida se vai medir tensão (ZMPT101B, mais fiação e mais risco) ou assumir tensão fixa. O projeto no papel, com pinos nomeados, evita o erro mais comum: ligar o CT num pino do ADC2 e ver a leitura morrer quando o Wi-Fi sobe." },
        {
          tipo: "prancha",
          titulo: "Mapa de pinos do ESP32",
          desenho: {
            legenda: "ADC1 para os analógicos (CT e tensão), pino com interrupção para o pulso, 3,3 V e GND comuns. ADC2 não convive com Wi-Fi.",
            primitivas: [
              { t: "retangulo", p: [110, 30], w: 100, h: 150, cor: "tinta" },
              { t: "rotulo", p: [135, 22], texto: "ESP32" },
              { t: "linha", de: [60, 55], ate: [110, 55], cor: "destaque" },
              { t: "rotulo", p: [8, 48], texto: "CT -> GPIO34" },
              { t: "linha", de: [60, 90], ate: [110, 90], cor: "destaque" },
              { t: "rotulo", p: [6, 83], texto: "ZMPT -> GPIO35" },
              { t: "linha", de: [60, 125], ate: [110, 125], cor: "tinta" },
              { t: "rotulo", p: [10, 118], texto: "Pulso -> GPIO27" },
              { t: "linha", de: [210, 70], ate: [270, 70], cor: "suave" },
              { t: "rotulo", p: [214, 63], texto: "3,3 V" },
              { t: "linha", de: [210, 120], ate: [270, 120], cor: "suave" },
              { t: "rotulo", p: [214, 113], texto: "GND" },
              { t: "rotulo", p: [112, 190], texto: "Evite ADC2 com Wi-Fi" },
            ],
          },
        },
      ],
    },
    {
      id: "arquitetura-firmware",
      titulo: "Projeto: ESPHome ou EmonLib?",
      blocos: [
        { tipo: "texto", texto: "Dois caminhos de firmware. ESPHome é declarativo: você escreve um YAML que já traz ct_clamp, pulse_meter e integração pronta com o Home Assistant; rápido de subir e fácil de manter. EmonLib/Arduino é imperativo: você controla cada amostra e o cálculo de potência ativa e aparente, útil quando quer algo sob medida ou sem o ecossistema Home Assistant." },
        { tipo: "texto", texto: "Para a maioria das casas, ESPHome entrega mais com menos: calibração por filtro, publicação automática e painéis prontos. EmonLib brilha quando você precisa de controle fino do algoritmo. Em ambos, o monitor publica potência e energia; a diferença é quanto do encanamento você escreve à mão." },
        { tipo: "diagrama", titulo: "Fluxo de uma leitura publicada", codigo: `sequenceDiagram
  participant CT as CT/ADC
  participant ESP as ESP32
  participant HA as Home Assistant
  CT->>ESP: amostras da senoide (200 ms)
  ESP->>ESP: calcula RMS e potencia
  ESP->>ESP: acumula energia (kWh)
  ESP->>HA: publica W e kWh (MQTT/API)
  HA->>HA: dashboard e alertas` },
      ],
    },
    {
      id: "seguranca-eletrica",
      titulo: "Projeto: segurança elétrica é projeto, não detalhe",
      blocos: [
        { tipo: "texto", texto: "Aqui mora o risco de verdade. Instalar um CT no quadro exige abrir o padrão de entrada, onde há tensão e corrente capazes de matar. A NR-10 define que serviços em instalações elétricas são de profissional habilitado e autorizado, com análise de risco, desenergização quando possível e equipamentos de proteção. A NBR 5410 rege o projeto da instalação de baixa tensão: seções de condutor, proteção e aterramento." },
        { tipo: "texto", texto: "A regra deste caderno: tudo que não toca a rede (bancada de protótipo, LED do pulso por fora, programação, calibração com carga isolada) você faz. Abrir o quadro, passar o cabo pelo CT na entrada e ligar a primária do ZMPT101B na rede é trabalho de eletricista habilitado. Não é burocracia: é a fronteira entre um projeto e um acidente." },
        { tipo: "mobilizacao", papel: "Eletricista habilitado (NR-10) para instalação no quadro", porque: "Abrir o quadro/padrão de entrada e instalar o CT no condutor da entrada é trabalho energizado de baixa tensão. A NR-10 reserva isso a profissional habilitado e autorizado, com análise de risco e EPIs; o agente de campo projeta e programa, mas não executa dentro do quadro vivo.", entregaEsperada: "Instalação do CT (e, se houver, da tomada de tensão) executada e testada por eletricista habilitado, com a instalação conforme NBR 5410 e registro do serviço.", gerenciadoPor: "zaeon" },
      ],
    },
    {
      id: "caixa-e-montagem",
      titulo: "Projeto: caixa, alimentação e aterramento",
      blocos: [
        { tipo: "texto", texto: "A eletrônica mora numa caixa própria, separada da parte de potência. Alimente o ESP32 por uma fonte isolada de qualidade (5 V estável); ruído de fonte barata vira ruído na medida. Leve para dentro da caixa só os sinais de baixa tensão: a saída do CT e, se houver, a saída de baixa tensão do ZMPT101B, nunca a rede crua para perto do microcontrolador." },
        { tipo: "texto", texto: "Aterramento e separação física importam: mantenha a fiação de sinal longe dos cabos de potência para reduzir indução, e respeite a NBR 5410 para a parte que fica no quadro. Uma montagem caprichada é o que diferencia um monitor que lê 2 % de erro de um que oscila sozinho sem carga nenhuma." },
        {
          tipo: "prancha",
          titulo: "Dois mundos, uma fronteira",
          desenho: {
            legenda: "Caixa de potência (quadro, eletricista) separada da caixa de eletrônica (sinais de baixa tensão, você). Só sinais cruzam a fronteira.",
            primitivas: [
              { t: "retangulo", p: [16, 40], w: 120, h: 120, cor: "tinta" },
              { t: "rotulo", p: [26, 32], texto: "Quadro (potencia)" },
              { t: "circulo", c: [76, 100], r: 26, cor: "suave" },
              { t: "rotulo", p: [60, 100], texto: "CT" },
              { t: "retangulo", p: [184, 40], w: 120, h: 120, cor: "tinta" },
              { t: "rotulo", p: [194, 32], texto: "Eletronica (BT)" },
              { t: "retangulo", p: [214, 80], w: 60, h: 40, cor: "destaque" },
              { t: "rotulo", p: [220, 100], texto: "ESP32" },
              { t: "seta", de: [136, 100], ate: [184, 100], cor: "destaque" },
              { t: "rotulo", p: [138, 80], texto: "so sinal" },
            ],
          },
        },
      ],
    },
    {
      id: "fontes-projeto",
      titulo: "Fontes: projeto e segurança",
      blocos: [
        { tipo: "fontes", titulo: "Normas e segurança", itens: [
          { titulo: "NR-10 — Segurança em Instalações e Serviços em Eletricidade (MTE)", url: "https://www.gov.br/trabalho-e-emprego/pt-br/acesso-a-informacao/participacao-social/conselhos-e-orgaos-colegiados/comissao-tripartite-partitaria-permanente/arquivos/normas-regulamentadoras/nr-10.pdf", tipo: "norma", nota: "Profissional habilitado/autorizado, análise de risco e trabalho energizado." },
          { titulo: "ABNT NBR 5410 — Instalações elétricas de baixa tensão", url: "https://www.abntcatalogo.com.br/norma.aspx?ID=37190", tipo: "norma", nota: "Projeto e execução: condutores, proteção e aterramento na BT." },
          { titulo: "ESP32 ADC — documentação Espressif (ADC2 x Wi-Fi)", url: "https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-reference/peripherals/adc_oneshot.html", tipo: "site", nota: "Por que usar ADC1 para os sensores quando o Wi-Fi está ativo." },
        ] },
      ],
    },
    // ===================== CAPÍTULO 6 — EXECUÇÃO =====================
    {
      id: "bancada-protoboard",
      titulo: "Execução: primeiro na bancada, sem a rede",
      blocos: [
        { tipo: "texto", texto: "Nunca estreie no quadro. Monte tudo na protoboard e teste com uma carga segura e conhecida: uma lâmpada incandescente ou um aquecedor pequeno, ligados por uma extensão onde você possa passar o CT por fora de um único condutor. Confira que a leitura reage quando a carga liga e desliga, e que o zero é estável com a carga desligada." },
        { tipo: "texto", texto: "Use esta fase para calibrar (capítulo de cálculo) e para achar bugs de software em terra firme: offset mal ajustado, pino do ADC2 com Wi-Fi, janela de amostragem curta. Só suba para o quadro quando o protótipo medir sua carga de teste com erro pequeno e repetível. Pressa na bancada vira acidente no padrão." },
        { tipo: "tarefas", itens: [
          { id: "bancada", titulo: "Valide o protótipo com carga conhecida", entrega: "Com uma carga de potência conhecida, registre a leitura do monitor ligado e desligado. Anote o erro percentual e se o zero é estável. Só avance se o erro for pequeno e repetível." },
        ] },
      ],
    },
    {
      id: "instalar-no-quadro",
      titulo: "Execução: a instalação no quadro",
      blocos: [
        { tipo: "texto", texto: "Chega o momento que exige o profissional. O CT é instalado abraçando um único condutor da entrada (a fase, ou cada fase se for bifásico/trifásico), com o quadro trabalhado segundo a NR-10. O sinal do CT sai para a caixa de eletrônica por um par de fios de baixa tensão. Se houver medida de tensão, a primária do ZMPT101B é conectada à rede dentro do quadro, também pelo eletricista." },
        { tipo: "texto", texto: "Seu papel aqui é de projetista e supervisor técnico: entregar o diagrama, dizer qual condutor o CT deve abraçar, a orientação do sensor (seta no sentido da carga) e onde os sinais entram. A execução dentro do quadro energizado é do eletricista. Depois da instalação, você retoma: liga a eletrônica e confere as primeiras leituras." },
        { tipo: "mobilizacao", papel: "Eletricista habilitado para passar o CT e fechar o quadro", porque: "Posicionar o CT no condutor da entrada e reenergizar o quadro envolve risco de choque e arco. É serviço habilitado sob NR-10, com desenergização/análise de risco; o agente de campo entrega o projeto e acompanha, o profissional executa e testa.", entregaEsperada: "CT instalado no condutor correto, com sentido e sinal verificados, quadro fechado conforme NBR 5410 e teste de leitura com carga real registrado.", gerenciadoPor: "zaeon" },
        {
          tipo: "prancha",
          titulo: "O CT na entrada da casa",
          desenho: {
            legenda: "O CT abraça a fase da entrada; o par de sinal desce para a caixa de eletrônica fora do quadro.",
            primitivas: [
              { t: "retangulo", p: [20, 20], w: 150, h: 160, cor: "tinta" },
              { t: "rotulo", p: [26, 14], texto: "Quadro de entrada" },
              { t: "linha", de: [95, 20], ate: [95, 180], cor: "destaque" },
              { t: "rotulo", p: [100, 30], texto: "Fase" },
              { t: "circulo", c: [95, 90], r: 22, cor: "tinta" },
              { t: "rotulo", p: [60, 120], texto: "CT" },
              { t: "linha", de: [117, 90], ate: [200, 130], cor: "suave" },
              { t: "retangulo", p: [200, 120], w: 90, h: 50, cor: "destaque" },
              { t: "rotulo", p: [206, 114], texto: "Caixa eletronica" },
            ],
          },
        },
      ],
    },
    {
      id: "subir-firmware",
      titulo: "Execução: subir o firmware e ler o primeiro log",
      blocos: [
        { tipo: "texto", texto: "Com o hardware pronto, grave o firmware. No ESPHome, o ciclo é editar o YAML, compilar e enviar por Wi-Fi (OTA) ou USB na primeira vez; o log mostra os valores crus do ct_clamp, que você usa para o calibrate_linear. No EmonLib, o monitor serial imprime Irms e potência a cada ciclo. Esse primeiro log é ouro: é onde se vê se o sensor responde e qual o valor cru a mapear." },
        { tipo: "texto", texto: "Confira três coisas no log: o zero com a casa no mínimo (não deve ser grande), a reação quando uma carga liga e a estabilidade do número. Se o valor pula sem carga, suspeite do offset ou do pino do ADC2 com Wi-Fi. Só depois de o cru estar coerente é que a calibração faz sentido." },
        { tipo: "video", titulo: "Monitor com ESP32, ZMPT101B, SCT-013 e ESPHome no Home Assistant", youtube: "cxdBHR9kitQ" },
        { tipo: "tarefas", itens: [
          { id: "primeiro-log", titulo: "Capture e leia seu primeiro log", entrega: "Grave o firmware e copie 10 linhas do log com e sem carga. Marque o valor cru usado na calibração e qualquer instabilidade no zero." },
        ] },
      ],
    },
    {
      id: "validar-contra-relogio",
      titulo: "Execução: validar contra o medidor oficial",
      blocos: [
        { tipo: "texto", texto: "O veredito final não é o seu log: é o relógio da concessionária. Escolha uma janela (uma hora, um dia), anote o kWh do medidor oficial no início e no fim e compare com o quanto seu monitor acumulou no mesmo período. Para uma leitura ainda mais fina, conte os pulsos do LED do medidor e compare com os watts do seu CT em tempo real." },
        { tipo: "texto", texto: "Diferença pequena e constante (poucos por cento) é esperada e se corrige na calibração. Diferença grande ou que cresce aponta erro de fp (medindo VA em vez de W), CT no condutor errado ou janela de amostragem ruim. Validar contra o oficial é o que transforma um gráfico bonito num número em que você pode confiar para decidir." },
        {
          tipo: "licao",
          pergunta: "Qual é a melhor referência para validar a energia do seu monitor?",
          alternativas: ["O gráfico do próprio monitor", "O medidor oficial da concessionária (kWh ou pulsos do LED)", "A potência de placa dos aparelhos"],
          correta: 1,
          explicacao: "O medidor oficial é a verdade faturada. Comparar kWh acumulado (ou pulsos do LED) no mesmo período revela erros reais de medida.",
        },
      ],
    },
    // ===================== CAPÍTULO 7 — MANUTENÇÃO =====================
    {
      id: "manutencao-rotina",
      titulo: "Manutenção: deriva, reinício e contador que não zera",
      blocos: [
        { tipo: "texto", texto: "Monitor é infraestrutura: precisa de rotina. A calibração pode derivar com temperatura e tempo; revalide contra o medidor oficial a cada alguns meses. Guarde o contador de energia de forma persistente (na flash do ESP32 ou num módulo como o PZEM, que mantém o acumulado): energia é um total que não pode voltar a zero quando falta luz e o ESP reinicia." },
        { tipo: "texto", texto: "Monitore a saúde do próprio aparelho: queda de Wi-Fi, leituras travadas, zero que subiu. Um bom firmware publica também o tempo ligado e a qualidade do sinal. Documente a constante de calibração e a data da última validação num arquivo, para que qualquer manutenção futura parta de um estado conhecido." },
        { tipo: "tarefas", itens: [
          { id: "rotina", titulo: "Defina a rotina de manutenção", entrega: "Escreva um checklist: periodicidade da revalidação contra o medidor, onde o contador é persistido, e como você percebe uma queda de leitura. Anote a constante atual de calibração e a data." },
        ] },
      ],
    },
    {
      id: "seguranca-manutencao",
      titulo: "Manutenção: mexer de novo é abrir o quadro de novo",
      blocos: [
        { tipo: "texto", texto: "Toda manutenção que toque o CT, a tomada de tensão ou qualquer parte dentro do quadro é, de novo, trabalho energizado: volta a ser do eletricista habilitado, sob NR-10. Trocar a caixa de eletrônica, atualizar firmware ou recalibrar com carga isolada você faz; reposicionar o CT ou mexer na fiação de potência, não." },
        { tipo: "texto", texto: "Mantenha a fronteira sempre nítida, inclusive meses depois, quando a familiaridade tenta encurtar o caminho. O acidente elétrico costuma acontecer justamente na manutenção de rotina, feita com pressa por quem já se acostumou com o risco. O caderno insiste: a parte da rede é do profissional, sempre." },
        {
          tipo: "licao",
          pergunta: "Recalibrar o monitor com uma lâmpada na bancada exige eletricista?",
          alternativas: ["Sim, sempre", "Não, se não tocar o quadro nem a rede: é carga isolada de baixa tensão", "Só se o aparelho for caro"],
          correta: 1,
          explicacao: "Calibrar com carga isolada na bancada não é trabalho energizado na instalação. Mexer dentro do quadro ou na tomada de tensão, sim, volta a ser do habilitado.",
        },
      ],
    },
    // ===================== CAPÍTULO 8 — CASOS REAIS =====================
    {
      id: "caso-geladeira",
      titulo: "Caso real: caçar o vilão do mês",
      blocos: [
        { tipo: "texto", texto: "Caso típico: a conta subiu e ninguém sabe por quê. Com o monitor, observe a curva ao longo de um dia. Degraus altos e curtos denunciam o chuveiro; um dente-de-serra constante, ligando e desligando a cada 20 ou 30 minutos, é a geladeira. Uma geladeira velha ou com borracha ressecada liga mais vezes e, somando o mês, pesa tanto quanto banhos longos." },
        { tipo: "texto", texto: "Com dado, a decisão fica objetiva: medir o antes e o depois de trocar a borracha, de ajustar o termostato ou de trocar o aparelho pelo etiquetado A do PROCEL. O monitor transforma a caça ao vilão de palpite em experimento: muda-se uma coisa, mede-se o efeito, decide-se pelo número." },
        {
          tipo: "prancha",
          titulo: "A assinatura de cada carga no tempo",
          desenho: {
            legenda: "No eixo do tempo, o chuveiro é um degrau alto e curto; a geladeira, um dente-de-serra baixo e repetido.",
            primitivas: [
              { t: "linha", de: [16, 170], ate: [300, 170], cor: "tinta" },
              { t: "linha", de: [16, 20], ate: [16, 170], cor: "tinta" },
              { t: "rotulo", p: [2, 90], texto: "W" },
              { t: "linha", de: [40, 150], ate: [60, 150], cor: "suave" },
              { t: "linha", de: [60, 150], ate: [60, 50], cor: "destaque" },
              { t: "linha", de: [60, 50], ate: [95, 50], cor: "destaque" },
              { t: "linha", de: [95, 50], ate: [95, 150], cor: "destaque" },
              { t: "rotulo", p: [58, 42], texto: "Chuveiro" },
              { t: "curva", pts: [[120, 150], [135, 130], [150, 150], [170, 130], [190, 150], [210, 130], [230, 150], [250, 130], [270, 150]], cor: "tinta" },
              { t: "rotulo", p: [180, 160], texto: "Geladeira (ciclos)" },
              { t: "rotulo", p: [220, 120], texto: "tempo" },
            ],
          },
        },
        { tipo: "fontes", titulo: "Consumo de eletrodomésticos", itens: [
          { titulo: "PROCEL Info — consumo e etiquetagem de eletrodomésticos", url: "http://www.procelinfo.com.br/", tipo: "site", nota: "Base para estimar o consumo típico de geladeira, chuveiro e ar-condicionado." },
          { titulo: "INMETRO — Programa Brasileiro de Etiquetagem (PBE)", url: "https://www.gov.br/inmetro/pt-br/assuntos/avaliacao-da-conformidade/programa-brasileiro-de-etiquetagem", tipo: "norma", nota: "Etiqueta de eficiência que classifica aparelhos de A a E." },
        ] },
      ],
    },
    {
      id: "caso-bidirecional",
      titulo: "Caso real: casa com energia solar",
      blocos: [
        { tipo: "texto", texto: "Quando a casa gera solar, a energia vai nos dois sentidos: da rede para a casa e da casa para a rede. O medidor da concessionária vira bidirecional e registra consumo e injeção separadamente, sob as regras de geração distribuída. Para o monitor, isso muda o CT: ele precisa distinguir o sentido da corrente, o que exige medir também a tensão (para saber o sinal da potência), não só o módulo da corrente." },
        { tipo: "texto", texto: "Um monitor que mede só corrente não sabe se a casa está importando ou exportando: ele vê o mesmo módulo nos dois casos. Por isso, em casa com solar, vale a pena medir tensão (ZMPT101B) ou usar um chip de energia que já entregue potência com sinal. Assim o painel mostra, em tempo real, quanto você está mandando de volta para a rede." },
        { tipo: "video", titulo: "Como funciona um medidor bidirecional de energia solar", youtube: "-SQm0_WOgkE" },
      ],
    },
    {
      id: "caso-dashboard",
      titulo: "Caso real: do número ao painel e ao alerta",
      blocos: [
        { tipo: "texto", texto: "Medir é meio; agir é fim. Com os dados no Home Assistant (ou num painel próprio), monte três visões: potência agora, energia do dia e custo acumulado do mês com tarifa e bandeira. Em cima disso, crie alertas: avisar quando a potência passar de um limite (dois chuveiros juntos), quando o consumo do dia estourar a meta, ou quando a leitura travar (sinal de falha do sensor)." },
        { tipo: "texto", texto: "É o painel que fecha o ciclo de feedback que reduz consumo: o morador vê o custo subir em tempo real e muda o hábito. Guarde o histórico para comparar meses, provar o efeito de uma troca de aparelho e separar o que é sazonal (ar-condicionado no verão) do que é desperdício contínuo." },
        { tipo: "diagrama", titulo: "Do sensor à decisão", codigo: `flowchart LR
  S["Monitor publica W e kWh"] --> D["Dashboard: agora, dia, mes"]
  D --> C["Custo = kWh x tarifa + bandeira"]
  D --> A["Alertas: pico, meta, falha"]
  C --> H["Mudar habito ou aparelho"]
  A --> H
  H --> M["Medir o efeito"]
  M --> S` },
      ],
    },
    // ===================== CAPÍTULO 9 — RECURSOS =====================
    {
      id: "recursos-finais",
      titulo: "Recursos: a estante do projeto",
      blocos: [
        { tipo: "texto", texto: "Reúna aqui a estante que sustenta o monitor, da teoria ao projeto pronto. Quando bater dúvida, volte a estas fontes antes de inventar: quase todo problema de CT, burden, calibração ou segurança já foi resolvido e documentado por alguém." },
        { tipo: "fontes", titulo: "Estante do monitor de energia", itens: [
          { titulo: "OpenEnergyMonitor — documentação de monitoramento elétrico", url: "https://docs.openenergymonitor.org/electricity-monitoring/index.html", tipo: "site", nota: "Guia de referência: CT, tensão, potência, calibração e arquiteturas." },
          { titulo: "ESPHome — sensores de energia (ct_clamp, pulse_meter, ATM90E32)", url: "https://esphome.io/components/sensor/index.html", tipo: "site", nota: "Catálogo de componentes de medição prontos para o ESP32." },
          { titulo: "Home Assistant — Home Energy Management (painel de energia)", url: "https://www.home-assistant.io/docs/energy/", tipo: "site", nota: "Como montar o dashboard de energia e custo a partir dos sensores." },
          { titulo: "ANEEL — PRODIST (procedimentos de distribuição; medição no Módulo 5)", url: "https://www.gov.br/aneel/pt-br/centrais-de-conteudos/procedimentos-regulatorios/prodist", tipo: "norma", nota: "Regras oficiais de medição da distribuidora." },
        ] },
        { tipo: "video", titulo: "Smart Power Meter com SCT-013 e ZMPT101B (projeto completo)", youtube: "L7hx-do06Ps" },
      ],
    },
    // ===================== SÍNTESE =====================
    {
      id: "compilado",
      titulo: "Prancha de síntese",
      blocos: [
        { tipo: "texto", texto: "Arraste os cards pelo carimbo para reorganizar sua jornada, do relógio da concessionária ao painel na palma da mão. O percurso foi: entender por que medir, dominar as grandezas (V, I, P, fp, kWh), escolher a arquitetura (plugue, pulso do LED ou CT no quadro), calcular burden e calibração, projetar com segurança, executar primeiro na bancada e só depois no quadro com o eletricista, validar contra o medidor oficial e, enfim, agir pelo número. Abaixo da prancha, suas anotações e imagens aparecem na ordem das páginas, prontas para virar o caderno de bordo do seu monitor." },
        { tipo: "compilado" },
      ],
    },
  ],
};
