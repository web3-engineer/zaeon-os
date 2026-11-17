import type { CadernoEstudo } from "../cadernosEstudo";

/**
 * Caderno de campo: "Biogás de resíduos orgânicos: viabilidade e usos na comunidade".
 * Engenharia ambiental + bioquímica da digestão anaeróbia. Todo número, técnica, norma,
 * desenho e vídeo tem lastro em fonte real (ver páginas "fontes" ao longo do caderno).
 * Faixas numéricas são apresentadas como estimativas de literatura (Embrapa, CIBiogás,
 * Probiogás, Sebrae) e devem ser confirmadas com análise e projeto no local.
 */
export const caderno: CadernoEstudo = {
  id: "biogas-local",
  titulo: "Biogás de resíduos orgânicos: viabilidade e usos na comunidade",
  resumo:
    "Da bioquímica da digestão anaeróbia ao biodigestor que acende o fogão: ciência, cálculo, projeto, obra, operação, usos (gás, energia, biometano, biofertilizante) e casos reais do Brasil — com fontes, normas e os profissionais a mobilizar.",
  paginas: [
    // ===================== CONTEXTO =====================
    {
      id: "abertura",
      titulo: "O resíduo que vira energia",
      blocos: [
        { tipo: "texto", texto: "Metade do que vai para o lixo numa comunidade é matéria orgânica: restos de comida, cascas, poda, esterco. Fechado sem ar dentro de um biodigestor, esse mesmo material é digerido por bactérias e vira duas coisas úteis ao mesmo tempo — biogás (combustível) e biofertilizante (adubo). Nada de novo: é o processo que acontece no pântano, no rúmen da vaca e no aterro sanitário, só que controlado." },
        { tipo: "texto", texto: "Este caderno percorre o caminho inteiro, na ordem de quem vai fazer: entender a química, ler os resíduos do seu lugar, escolher e dimensionar o biodigestor, projetar com segurança, construir, dar a partida, operar e usar o gás e o adubo. Cada afirmação tem fonte, e cada etapa que exige um profissional está marcada." },
        { tipo: "diagrama", titulo: "A conta do biodigestor", codigo: `flowchart LR
  A["Residuo organico"] --> B["Biodigestor (sem ar)"]
  B --> C["Biogas: energia"]
  B --> D["Biofertilizante: adubo"]
  C --> E["Fogao, luz, calor"]
  D --> F["Horta, lavoura"]` },
        { tipo: "video", titulo: "O que é biodigestão, biogás e biometano?", youtube: "0k7PjuEnJ5k" },
      ],
    },
    {
      id: "problema-residuos",
      titulo: "O problema que o biogás resolve",
      blocos: [
        { tipo: "texto", texto: "No Brasil, a matéria orgânica é a maior fração do resíduo domiciliar e, no aterro, ela apodrece gerando chorume e metano — um gás de efeito estufa cerca de 28 vezes mais potente que o CO2 em 100 anos (IPCC). A Política Nacional de Resíduos Sólidos (Lei 12.305/2010) manda, na ordem: não gerar, reduzir, reutilizar, reciclar, tratar e só então dispor. Digerir o orgânico perto de onde ele nasce atende essa lógica e ainda devolve energia." },
        { tipo: "diagrama", titulo: "Dois destinos para a mesma casca", codigo: `flowchart TD
  R["Resto de comida"] --> L["Lixo comum -> aterro"]
  R --> B["Biodigestor da comunidade"]
  L --> M["Metano solto + chorume"]
  B --> G["Metano queimado = energia"]
  B --> A["Adubo de volta ao solo"]` },
        {
          tipo: "licao",
          pergunta: "Por que capturar e queimar o metano do resíduo é melhor para o clima do que deixá-lo escapar do aterro?",
          alternativas: [
            "Porque queimar não muda nada no clima",
            "Porque o metano é um gás de efeito estufa muito mais potente que o CO2, e queimá-lo vira CO2 (menos agressivo) e ainda gera energia",
            "Porque o aterro não produz metano",
          ],
          correta: 1,
          explicacao: "O metano (CH4) aquece muito mais que o CO2 por unidade de massa. Capturar e queimar converte CH4 em CO2 e substitui combustível fóssil — ganho duplo.",
        },
      ],
    },
    {
      id: "por-que-biogas",
      titulo: "Por que vale a pena para a comunidade",
      blocos: [
        { tipo: "texto", texto: "Biogás não é só ambiental, é economia local: substitui botijão de GLP na cozinha, pode gerar eletricidade e transforma um custo (recolher e dar destino ao lixo orgânico) em insumo. O biofertilizante que sobra devolve nutrientes ao solo e reduz a compra de adubo. Para uma escola, uma horta comunitária, uma pequena granja ou um assentamento, isso fecha um ciclo que hoje é só despesa." },
        {
          tipo: "prancha",
          titulo: "O ciclo fechado da comunidade",
          desenho: {
            legenda: "Comida gera resto; resto gera gás e adubo; adubo gera comida. Um laço que não precisa de insumo de fora.",
            primitivas: [
              { t: "circulo", c: [150, 100], r: 70, cor: "tinta" },
              { t: "seta", de: [150, 30], ate: [210, 70], cor: "destaque" },
              { t: "seta", de: [218, 120], ate: [170, 168], cor: "destaque" },
              { t: "seta", de: [130, 168], ate: [82, 120], cor: "destaque" },
              { t: "seta", de: [90, 70], ate: [150, 30], cor: "destaque" },
              { t: "rotulo", p: [120, 24], texto: "Cozinha/horta" },
              { t: "rotulo", p: [215, 70], texto: "Restos" },
              { t: "rotulo", p: [150, 182], texto: "Biodigestor" },
              { t: "rotulo", p: [20, 115], texto: "Gas + adubo" },
            ],
          },
        },
        {
          tipo: "licao",
          pergunta: "Qual o ganho econômico mais direto do biogás numa casa ou escola?",
          alternativas: [
            "Vender gás para a distribuidora no primeiro mês",
            "Substituir parte do botijão de GLP no fogão e reduzir a compra de adubo",
            "Nenhum, biogás não serve para cozinhar",
          ],
          correta: 1,
          explicacao: "O uso mais simples e imediato é térmico (cozinhar). Eletricidade e venda de gás exigem mais escala e investimento.",
        },
      ],
    },
    {
      id: "o-que-e-biogas",
      titulo: "O que é, afinal, o biogás",
      blocos: [
        { tipo: "texto", texto: "Biogás é uma mistura. O que interessa é o metano (CH4), que queima; o resto é principalmente dióxido de carbono (CO2), que não queima e dilui a chama. Composição típica da digestão de resíduos: 50 a 70% de CH4, 30 a 45% de CO2, mais traços de gás sulfídrico (H2S), vapor d'água, nitrogênio e amônia. Quanto mais metano, mais 'forte' o gás." },
        {
          tipo: "prancha",
          titulo: "Do que o biogás é feito",
          desenho: {
            legenda: "Barra de composição aproximada do biogás bruto. CH4 é a parte que queima; H2S e umidade precisam ser removidos.",
            primitivas: [
              { t: "retangulo", p: [20, 70], w: 160, h: 40, cor: "destaque", hachura: true },
              { t: "retangulo", p: [180, 70], w: 90, h: 40, cor: "tinta" },
              { t: "retangulo", p: [270, 70], w: 14, h: 40, cor: "suave" },
              { t: "rotulo", p: [60, 60], texto: "CH4 55-65%" },
              { t: "rotulo", p: [190, 60], texto: "CO2 ~35%" },
              { t: "rotulo", p: [230, 130], texto: "H2S/umidade" },
              { t: "seta", de: [277, 115], ate: [270, 125], cor: "suave" },
            ],
          },
        },
        { tipo: "texto", texto: "O H2S é o vilão: é tóxico, cheira a ovo podre e, junto com a umidade, forma ácido que corrói motores e tubulações. Por isso quase todo projeto sério tem um passo de remoção de H2S e de secagem antes de usar o gás em equipamento mais sensível." },
      ],
    },
    {
      id: "energia-escondida",
      titulo: "Quanta energia cabe num metro cúbico",
      blocos: [
        { tipo: "texto", texto: "O poder calorífico do biogás depende do teor de metano. Com ~60% de CH4, 1 m3 de biogás carrega por volta de 5.000 a 6.000 kcal (cerca de 21 a 25 MJ), um pouco mais da metade do gás natural. Em equivalências práticas de literatura (Embrapa/CENBIO): 1 m3 de biogás faz aproximadamente o serviço de 0,45 a 0,6 kg de GLP, 0,6 L de diesel, ou gera cerca de 1,2 a 1,6 kWh de eletricidade num grupo gerador." },
        {
          tipo: "licao",
          pergunta: "Um fogão comum de 2 bocas gasta algo como 0,3 a 0,45 m3 de biogás por hora de chama. Cerca de quantas horas de fogão rendem 2 m3 de biogás por dia?",
          alternativas: ["Menos de 1 hora", "Entre 4 e 6 horas", "Mais de 20 horas"],
          correta: 1,
          explicacao: "2 m3 / ~0,4 m3 por hora ≈ 5 horas de chama. Dá para cozinhar as refeições de uma família. Valores variam com o queimador e a pressão.",
        },
        { tipo: "texto", texto: "Guarde a regra de bolso, mas desconfie dela: tudo muda com o teor de metano, a pressão, o estado do queimador e a temperatura. Mais adiante o caderno ensina a medir, não a chutar." },
      ],
    },
    {
      id: "quem-ja-fez",
      titulo: "Isto já foi feito, e em escala",
      blocos: [
        { tipo: "texto", texto: "Biogás não é promessa: é parque instalado. Pelo Panorama do Biogás no Brasil (CIBiogás), o país saltou de poucas centenas para quase mil plantas em operação na década de 2020, com a agropecuária e os aterros/esgoto como maiores fontes, e o biometano (biogás purificado) crescendo para abastecer indústria e frota. O potencial teórico estimado pela ABiogás chega a dezenas de bilhões de m3 por ano — a maior parte ainda não aproveitada." },
        {
          tipo: "fontes",
          titulo: "Dados e panorama (fontes primárias)",
          itens: [
            { titulo: "Panorama do Biogás no Brasil 2023 — CIBiogás", url: "https://materiais.cibiogas.org/panorama-do-biogas-2023", tipo: "dataset", nota: "Levantamento anual de plantas, produção e potencial." },
            { titulo: "Panorama do Biogás no Brasil 2022 (PDF) — CIBiogás", url: "https://cibiogas.org/wp-content/uploads/2023/12/Panorama_do_Biogs_no_Brasil_2022.pdf", tipo: "dataset" },
            { titulo: "ABiogás — Associação Brasileira do Biogás", url: "https://abiogas.org.br/", tipo: "site", nota: "Estimativas de potencial e defesa setorial." },
            { titulo: "IEA Bioenergy — Task 37 (biogás e digestão anaeróbia)", url: "https://www.ieabioenergy.com/", tipo: "site" },
          ],
        },
      ],
    },
    {
      id: "seguranca-visao",
      titulo: "Antes de tudo: respeito ao gás",
      blocos: [
        { tipo: "texto", texto: "O metano é inflamável e, misturado ao ar na faixa de cerca de 5 a 15% de concentração, forma mistura explosiva. O H2S é tóxico mesmo em concentração baixa e, em espaço confinado, pode matar. Regras inegociáveis deste caderno: nunca entrar num biodigestor ou poço sem procedimento de espaço confinado; nada de chama ou faísca perto de vazamento; tudo ventilado; e instalação de uso final seguindo norma e, quando for o caso, profissional habilitado." },
        {
          tipo: "licao",
          pergunta: "Por que não se deve 'dar uma olhada' dentro de um biodigestor abrindo e entrando?",
          alternativas: [
            "Porque suja a roupa",
            "Porque é espaço confinado: pode faltar oxigênio e haver H2S e metano, com risco de asfixia e explosão",
            "Porque atrapalha a produção de gás",
          ],
          correta: 1,
          explicacao: "Espaço confinado exige medição de atmosfera, ventilação, vigia externo e procedimento próprio (base da NR-33). Entrar sem isso mata.",
        },
      ],
    },
    // ===================== LEITURA DO TEMA: A CIÊNCIA =====================
    {
      id: "microbiologia",
      titulo: "Quem faz o trabalho: as bactérias",
      blocos: [
        { tipo: "texto", texto: "Na digestão anaeróbia, quem transforma resíduo em gás são microrganismos que vivem sem oxigênio. É um consórcio: um grupo quebra as moléculas grandes, outro produz ácidos, outro produz acetato, e no fim as arqueas metanogênicas liberam o metano. Se qualquer grupo for prejudicado (ar, veneno, choque de temperatura, acidez), a corrente se rompe e a produção cai." },
        { tipo: "video", titulo: "Fundamentos da Digestão Anaeróbica (aula)", youtube: "R0WAm9CSb8s" },
      ],
    },
    {
      id: "quatro-fases",
      titulo: "As quatro fases da digestão anaeróbia",
      blocos: [
        { tipo: "texto", texto: "O processo tem quatro etapas encadeadas. Hidrólise: enzimas quebram proteínas, gorduras e carboidratos em moléculas menores. Acidogênese: formam-se ácidos orgânicos. Acetogênese: esses ácidos viram acetato, H2 e CO2. Metanogênese: as arqueas transformam acetato e H2/CO2 em metano. O gargalo costuma ser a metanogênese — é a etapa mais lenta e sensível." },
        { tipo: "diagrama", titulo: "Rota bioquímica resíduo -> metano", codigo: `flowchart LR
  A["Materia organica complexa"] --> B["1. Hidrolise: acucares, aminoacidos, acidos graxos"]
  B --> C["2. Acidogenese: acidos organicos"]
  C --> D["3. Acetogenese: acetato + H2 + CO2"]
  D --> E["4. Metanogenese: CH4 + CO2"]` },
        {
          tipo: "licao",
          pergunta: "Qual fase costuma ser o 'gargalo' mais sensível do processo?",
          alternativas: ["Hidrólise", "Acidogênese", "Metanogênese"],
          correta: 2,
          explicacao: "As arqueas metanogênicas crescem devagar e são sensíveis a pH baixo, oxigênio e variação de temperatura — por isso a sobrecarga 'azeda' o reator.",
        },
      ],
    },
    {
      id: "temperatura",
      titulo: "Temperatura: a alavanca principal",
      blocos: [
        { tipo: "texto", texto: "A velocidade do processo depende muito do calor. Três faixas: psicrofílica (abaixo de ~20 C, lenta), mesofílica (em torno de 30 a 40 C, a mais usada e estável) e termofílica (50 a 57 C, rápida mas instável e cara de manter). A maioria dos biodigestores rurais no Brasil opera na faixa mesofílica, aproveitando o clima. O que a bactéria odeia é o choque: variações bruscas derrubam a produção." },
        {
          tipo: "prancha",
          titulo: "Produção de gás x temperatura",
          desenho: {
            legenda: "A produção sobe com a temperatura até a faixa termofílica e depois despenca. A faixa mesofílica (verde) é a mais prática.",
            primitivas: [
              { t: "linha", de: [30, 170], ate: [285, 170], cor: "tinta" },
              { t: "linha", de: [30, 170], ate: [30, 20], cor: "tinta" },
              { t: "curva", pts: [[30, 160], [90, 150], [150, 110], [210, 55], [240, 45], [255, 120], [270, 165]], cor: "destaque" },
              { t: "retangulo", p: [120, 25], w: 70, h: 145, cor: "suave", hachura: true },
              { t: "rotulo", p: [120, 185], texto: "meso 30-40C" },
              { t: "rotulo", p: [230, 185], texto: "termo" },
              { t: "rotulo", p: [36, 22], texto: "Producao" },
            ],
          },
        },
      ],
    },
    {
      id: "ph-alcalinidade",
      titulo: "pH e alcalinidade: o freio de mão",
      blocos: [
        { tipo: "texto", texto: "A metanogênese quer pH perto do neutro (cerca de 6,8 a 7,4). Se o reator recebe carga demais, os ácidos acumulam, o pH cai e a produção morre — o reator 'azeda'. A alcalinidade (capacidade de tampão, dada por bicarbonato) é o colchão que segura o pH. Medir pH é barato e salva o processo: queda de pH é o primeiro sinal de sobrecarga." },
        {
          tipo: "licao",
          pergunta: "O que significa um biodigestor que 'azedou'?",
          alternativas: [
            "O gás ficou com cheiro bom",
            "Houve sobrecarga, os ácidos se acumularam, o pH caiu e as metanogênicas pararam de produzir metano",
            "A temperatura subiu demais de propósito",
          ],
          correta: 1,
          explicacao: "Excesso de alimento ou substrato muito rico acidifica o meio. A correção é parar de alimentar, às vezes adicionar alcalinizante (cal ou bicarbonato) com cautela, e esperar recuperar.",
        },
      ],
    },
    {
      id: "relacao-cn",
      titulo: "Relação carbono/nitrogênio (C/N)",
      blocos: [
        { tipo: "texto", texto: "As bactérias comem carbono como energia e nitrogênio para construir corpo. A proporção que elas gostam fica na faixa de C/N entre ~20 e 30 para 1. Carbono demais (muita palha, serragem): processo lento. Nitrogênio demais (muito esterco de ave, muita proteína): excesso de amônia, que inibe o processo. A saída prática é misturar substratos para equilibrar." },
        { tipo: "diagrama", titulo: "Equilíbrio C/N por mistura", codigo: `flowchart TD
  A["Rico em carbono: palha, poda, serragem"] --> C["Mistura C/N ~25:1"]
  B["Rico em nitrogenio: esterco, restos de comida"] --> C
  C --> D["Digestao estavel"]` },
        {
          tipo: "licao",
          pergunta: "Você só tem muita palha seca (muito carbono). O que acontece e como corrigir?",
          alternativas: [
            "Produz rápido demais; adicionar mais palha",
            "Processo fica lento por falta de nitrogênio; misturar esterco ou restos de comida",
            "Nada muda, C/N é irrelevante",
          ],
          correta: 1,
          explicacao: "C/N muito alto trava o processo. Adicionar fonte de nitrogênio (esterco, restos verdes) traz a relação para a faixa boa.",
        },
      ],
    },
    {
      id: "substratos-panorama",
      titulo: "Ler os resíduos do seu lugar",
      blocos: [
        { tipo: "texto", texto: "Antes de escolher equipamento, faça o inventário do que sobra na comunidade e com que regularidade. Boas matérias-primas: esterco (bovino, suíno, aves), restos de cozinha e hortifruti, poda e capim picado, resíduo de agroindústria (bagaço, soro de leite, borra). O que define o projeto é quantidade estável por dia e teor de sólidos — não o pico de uma festa." },
        {
          tipo: "tarefas",
          itens: [
            { id: "inventario-residuos", titulo: "Inventário de resíduos orgânicos", entrega: "Liste cada fonte (cozinha, esterco, poda...), quanto gera por dia em kg e se é constante ou sazonal. Cole a tabela nesta página." },
            { id: "amostra-foto", titulo: "Registre com foto", entrega: "Fotografe os resíduos típicos de um dia. Anote o que é fibroso (precisa triturar) e o que é líquido." },
          ],
        },
      ],
    },
    {
      id: "restos-cozinha",
      titulo: "Restos de cozinha: ricos, mas exigentes",
      blocos: [
        { tipo: "texto", texto: "Resíduo de comida tem rendimento alto de biogás por quilo, porque é muito digestível. O preço disso é que acidifica rápido: sozinho e em excesso, 'azeda' o reator. A prática é triturar, alimentar aos poucos e, de preferência, co-digerir com esterco, que traz estabilidade e alcalinidade. Evite jogar tudo de uma vez." },
        {
          tipo: "licao",
          pergunta: "Por que resto de comida costuma ser co-digerido com esterco, e não usado sozinho?",
          alternativas: [
            "Porque esterco não produz gás",
            "Porque a comida acidifica rápido; o esterco traz estabilidade e alcalinidade, equilibrando o processo",
            "Porque é proibido usar comida",
          ],
          correta: 1,
          explicacao: "Co-digestão equilibra C/N, diluição e tampão. Comida dá rendimento; esterco dá estabilidade.",
        },
      ],
    },
    {
      id: "esterco-animal",
      titulo: "Esterco animal: o substrato clássico",
      blocos: [
        { tipo: "texto", texto: "O esterco é a base histórica dos biodigestores rurais porque já vem com as bactérias certas (vem do intestino do animal) e tem boa alcalinidade. Rendimentos variam: dejeto bovino rende menos por quilo (animal digere muito antes), suíno rende bem, e cama de aviário é rica mas exige cuidado com amônia. A regra é conhecer o seu animal e a dieta dele." },
        { tipo: "video", titulo: "Dejetos de vacas para gás e biofertilizante", youtube: "q6U3nkuX6R8" },
      ],
    },
    {
      id: "o-que-nao-por",
      titulo: "O que NÃO colocar no biodigestor",
      blocos: [
        { tipo: "texto", texto: "Alguns materiais matam o processo ou não digerem. Fora da lista: desinfetantes, cloro, água sanitária, antibióticos e sabão em excesso (matam as bactérias); plástico, vidro, metal, ossos grandes e material lenhoso (não digerem e entopem); e grandes volumes de óleo/gordura ou cítricos ácidos de uma vez, que desregulam. Na dúvida, menos é mais: carga pequena e estável." },
        {
          tipo: "licao",
          pergunta: "Qual destes NÃO deve entrar num biodigestor doméstico?",
          alternativas: [
            "Restos de verduras picados",
            "Esterco de curral",
            "Água sanitária e sobras de desinfetante",
          ],
          correta: 2,
          explicacao: "Produtos de limpeza com cloro ou amônia e antibióticos são bactericidas — matam a microbiota e param a produção de gás.",
        },
      ],
    },
    {
      id: "solidos-totais",
      titulo: "Sólidos totais e diluição",
      blocos: [
        { tipo: "texto", texto: "Dois conceitos guiam a mistura: sólidos totais (ST, o que sobra se secar a amostra) e sólidos voláteis (SV, a parte orgânica dos ST — o que vira gás). Biodigestores de mistura simples costumam operar bem com ST entre ~6 e 12%. Resíduo muito seco precisa de água; muito líquido, de mais sólido. A diluição clássica de esterco é cerca de 1 parte de esterco para 1 a 2 de água, ajustando para uma pasta que escorra." },
        {
          tipo: "prancha",
          titulo: "Ajuste da pasta (ST)",
          desenho: {
            legenda: "Muito seco entope; muito aguado produz pouco por litro. O alvo é uma pasta homogênea que escorre devagar.",
            primitivas: [
              { t: "retangulo", p: [25, 60], w: 70, h: 90, cor: "tinta" },
              { t: "retangulo", p: [120, 60], w: 70, h: 90, cor: "destaque" },
              { t: "retangulo", p: [215, 60], w: 70, h: 90, cor: "suave" },
              { t: "rotulo", p: [30, 165], texto: "Seco demais" },
              { t: "rotulo", p: [128, 165], texto: "Pasta (bom)" },
              { t: "rotulo", p: [222, 165], texto: "Aguado" },
              { t: "rotulo", p: [40, 50], texto: "entope" },
              { t: "rotulo", p: [220, 50], texto: "diluido" },
            ],
          },
        },
      ],
    },
    {
      id: "codigestao",
      titulo: "Co-digestão: somar para estabilizar",
      blocos: [
        { tipo: "texto", texto: "Co-digestão é alimentar o reator com mais de um substrato ao mesmo tempo. Bem feita, equilibra C/N, dilui inibidores e aumenta o rendimento por litro de reator. Combinações comuns: esterco + restos de comida, esterco + poda picada, dejeto + soro de leite. A chave é constância: manter a receita parecida todo dia para não dar choque na microbiota." },
        { tipo: "diagrama", titulo: "Receita diária estável", codigo: `flowchart LR
  A["Esterco (estabilidade)"] --> R["Mistura do dia"]
  B["Restos de comida (rendimento)"] --> R
  C["Agua (ajuste de ST)"] --> R
  R --> D["Alimentacao constante"]` },
      ],
    },
    // ===================== MÉTODO: TIPOS E PROCESSO =====================
    {
      id: "tipos-visao",
      titulo: "Os tipos de biodigestor",
      blocos: [
        { tipo: "texto", texto: "Há três famílias que cobrem quase tudo no campo: o modelo indiano (campânula/gasômetro móvel que sobe e desce), o modelo chinês (cúpula fixa de alvenaria, pressão variável) e o modelo canadense/de lona (tubular horizontal coberto por manta plástica, hoje o mais usado em propriedade rural). A escolha depende de material disponível, mão de obra, clima e de querer mais gás ou mais biofertilizante." },
        { tipo: "video", titulo: "Biodigestor para tratamento de resíduos agrícolas (TV Embrapa)", youtube: "WABSKzkT3B8" },
      ],
    },
    {
      id: "modelo-indiano",
      titulo: "Modelo indiano: a campânula que sobe",
      blocos: [
        { tipo: "texto", texto: "No modelo indiano, uma campânula (gasômetro) flutua sobre a massa em digestão e sobe conforme o gás se acumula. A grande vantagem é a pressão quase constante: a chama no fogão fica estável. É de operação contínua (entra carga, sai efluente) e simples de entender. A campânula de metal pode encarecer e enferrujar; hoje há versões em fibra ou plástico." },
        {
          tipo: "prancha",
          titulo: "Corte do biodigestor modelo indiano",
          desenho: {
            legenda: "Tanque cilíndrico com parede divisória; campânula flutuante sobe com o gás e mantém a pressão.",
            primitivas: [
              { t: "retangulo", p: [40, 80], w: 220, h: 100, cor: "tinta" },
              { t: "linha", de: [150, 80], ate: [150, 160], cor: "tinta" },
              { t: "retangulo", p: [60, 50], w: 180, h: 40, cor: "destaque" },
              { t: "seta", de: [150, 50], ate: [150, 30], cor: "destaque" },
              { t: "rotulo", p: [160, 24], texto: "Gas (sobe)" },
              { t: "rotulo", p: [95, 70], texto: "Campanula" },
              { t: "seta", de: [20, 110], ate: [40, 110], cor: "suave" },
              { t: "rotulo", p: [8, 100], texto: "Entra" },
              { t: "seta", de: [260, 150], ate: [280, 150], cor: "suave" },
              { t: "rotulo", p: [262, 140], texto: "Sai" },
            ],
          },
        },
      ],
    },
    {
      id: "modelo-chines",
      titulo: "Modelo chinês: cúpula fixa de alvenaria",
      blocos: [
        { tipo: "texto", texto: "O modelo chinês é todo em alvenaria enterrada, com uma cúpula fixa que armazena o gás. Como o volume é fixo, a pressão varia bastante conforme enche e esvazia — o fogão sente isso. Em compensação, não tem peça metálica para enferrujar e é robusto e durável. Costuma ser a escolha de quem quer mais biofertilizante e tem boa mão de obra de pedreiro." },
        {
          tipo: "prancha",
          titulo: "Corte do biodigestor modelo chinês",
          desenho: {
            legenda: "Câmara enterrada de alvenaria com cúpula fixa; o gás se acumula sob a cúpula e empurra o nível da massa.",
            primitivas: [
              { t: "retangulo", p: [50, 90], w: 200, h: 90, cor: "tinta", hachura: true },
              { t: "curva", pts: [[50, 90], [150, 45], [250, 90]], cor: "tinta" },
              { t: "rotulo", p: [118, 70], texto: "Gas (cupula)" },
              { t: "linha", de: [70, 150], ate: [230, 150], cor: "suave" },
              { t: "rotulo", p: [110, 165], texto: "Massa em digestao" },
              { t: "seta", de: [30, 110], ate: [50, 110], cor: "destaque" },
              { t: "rotulo", p: [8, 100], texto: "Carga" },
            ],
          },
        },
      ],
    },
    {
      id: "modelo-lona",
      titulo: "Modelo canadense (lona): o mais comum hoje",
      blocos: [
        { tipo: "texto", texto: "O biodigestor de lona é uma lagoa ou vala impermeabilizada, coberta por uma manta plástica (geomembrana) que infla como um balão e armazena o gás. É o mais barato por metro cúbico, rápido de instalar e domina as propriedades rurais brasileiras. Pontos de atenção: a manta exige proteção contra sol e perfuração, e o controle de temperatura é menor que nos modelos enterrados." },
        {
          tipo: "prancha",
          titulo: "Corte do biodigestor de lona (canadense)",
          desenho: {
            legenda: "Vala impermeabilizada com manta inferior; lona superior infla com o gás. Entrada e saída nas pontas.",
            primitivas: [
              { t: "curva", pts: [[40, 150], [70, 170], [230, 170], [260, 150]], cor: "tinta" },
              { t: "curva", pts: [[40, 150], [150, 70], [260, 150]], cor: "destaque" },
              { t: "rotulo", p: [120, 95], texto: "Gas (lona infla)" },
              { t: "rotulo", p: [120, 165], texto: "Massa" },
              { t: "seta", de: [20, 150], ate: [45, 150], cor: "suave" },
              { t: "rotulo", p: [6, 140], texto: "Entra" },
              { t: "seta", de: [258, 150], ate: [282, 150], cor: "suave" },
              { t: "rotulo", p: [262, 140], texto: "Sai" },
            ],
          },
        },
      ],
    },
    {
      id: "batelada-continuo",
      titulo: "Batelada x contínuo",
      blocos: [
        { tipo: "texto", texto: "Dois regimes de operação. Batelada: enche tudo de uma vez, veda, espera a digestão terminar (semanas), esvazia e recomeça. Simples, bom para resíduo que chega de vez em quando (poda, safra). Contínuo (ou semi-contínuo): alimenta um pouco todo dia e retira o mesmo volume de efluente. Produz gás de forma estável e é o padrão para quem tem resíduo diário, como cozinha e curral." },
        { tipo: "diagrama", titulo: "Qual regime para qual resíduo", codigo: `flowchart TD
  A["Residuo chega todo dia?"] -->|Sim| C["Continuo: alimenta diario"]
  A -->|Nao, em lotes| B["Batelada: enche, espera, esvazia"]` },
        {
          tipo: "licao",
          pergunta: "Uma cozinha comunitária gera restos todos os dias. Qual regime combina melhor?",
          alternativas: ["Batelada, enchendo uma vez por mês", "Contínuo/semi-contínuo, alimentando um pouco por dia", "Nenhum, cozinha não serve"],
          correta: 1,
          explicacao: "Fluxo diário pede operação contínua: produção estável e dimensionamento previsível. Batelada combina com resíduo que chega em lotes.",
        },
      ],
    },
    {
      id: "como-funciona-passo",
      titulo: "O caminho do resíduo dentro do reator",
      blocos: [
        { tipo: "texto", texto: "Juntando tudo: o resíduo entra pela caixa de carga, misturado com água na proporção certa; dentro, sem ar e no calor, passa pelas quatro fases bioquímicas; o gás sobe e é armazenado (campânula, cúpula ou lona); o material já digerido sai pela saída como biofertilizante. O tempo que a massa passa dentro é o tempo de retenção hidráulica (TRH), tipicamente 20 a 50 dias na faixa mesofílica." },
        { tipo: "video", titulo: "Como um biodigestor funciona?", youtube: "tQhwuEhaq_Y" },
      ],
    },
    {
      id: "escolher-modelo",
      titulo: "Escolher o modelo certo",
      blocos: [
        { tipo: "texto", texto: "Decisão prática: quer mais gás com pressão estável e tem como pagar a campânula? Indiano. Tem bom pedreiro, quer durabilidade e mais biofertilizante? Chinês. Quer o menor custo e instalação rápida numa propriedade? Lona/canadense. Recebe resíduo em lotes? Batelada. Em todos, o sucesso depende mais da operação diária do que do modelo." },
        {
          tipo: "licao",
          pergunta: "Qual modelo entrega pressão de gás mais constante no fogão?",
          alternativas: ["Chinês (cúpula fixa)", "Indiano (campânula flutuante)", "Nenhum mantém pressão"],
          correta: 1,
          explicacao: "A campânula do modelo indiano sobe e desce mantendo a pressão quase constante; na cúpula fixa chinesa a pressão varia com o enchimento.",
        },
        {
          tipo: "tarefas",
          itens: [
            { id: "escolha-modelo", titulo: "Justifique sua escolha de modelo", entrega: "Escreva qual modelo e regime você escolheu e por quê, citando material disponível, mão de obra, clima e objetivo (gás ou adubo)." },
          ],
        },
      ],
    },
    // ===================== CÁLCULO / MEDIÇÃO =====================
    {
      id: "quanto-residuo",
      titulo: "Quanto resíduo você tem de verdade",
      blocos: [
        { tipo: "texto", texto: "O projeto começa pela matéria-prima, não pelo tanque. Meça por alguns dias a massa diária de cada resíduo (balança de cozinha serve) e tire a média. Para esterco, use referências por animal: literatura cita, por exemplo, da ordem de 2 a 2,5 kg de dejeto por suíno por dia e 10 a 15 kg por bovino por dia, mas o seu número manda — confirme pesando." },
        {
          tipo: "tarefas",
          itens: [
            { id: "pesagem-7dias", titulo: "Pese 7 dias seguidos", entrega: "Anote a massa diária total de resíduo orgânico por 7 dias e calcule a média. Esse número é a base de todo o dimensionamento." },
            { id: "estimar-animais", titulo: "Estime o esterco (se houver)", entrega: "Multiplique número de animais pela geração diária de referência e some ao resíduo de cozinha." },
          ],
        },
      ],
    },
    {
      id: "rendimento-biogas",
      titulo: "Quanto gás cada resíduo rende",
      blocos: [
        { tipo: "texto", texto: "O rendimento é dado em metros cúbicos de biogás por quilo de sólidos voláteis (m3/kg SV) ou por quilo de resíduo. Faixas típicas de literatura: esterco bovino ~0,2 a 0,3; esterco suíno ~0,3 a 0,5; restos de comida ~0,4 a 0,6 (alto, mas instável). São estimativas — o valor real depende do substrato, da temperatura e do TRH. Use faixas para dimensionar e meça depois." },
        {
          tipo: "prancha",
          titulo: "Rendimento aproximado por substrato",
          desenho: {
            legenda: "Barras comparativas (m3 de biogas por kg de SV, ordem de grandeza). Restos de comida rendem mais, mas pedem controle.",
            primitivas: [
              { t: "linha", de: [30, 170], ate: [285, 170], cor: "tinta" },
              { t: "retangulo", p: [50, 120], w: 30, h: 50, cor: "suave" },
              { t: "retangulo", p: [120, 90], w: 30, h: 80, cor: "tinta" },
              { t: "retangulo", p: [190, 55], w: 30, h: 115, cor: "destaque" },
              { t: "rotulo", p: [40, 182], texto: "Bovino" },
              { t: "rotulo", p: [112, 182], texto: "Suino" },
              { t: "rotulo", p: [182, 182], texto: "Comida" },
              { t: "rotulo", p: [36, 40], texto: "m3/kg SV" },
            ],
          },
        },
        {
          tipo: "licao",
          pergunta: "Por que os números de rendimento devem ser tratados como faixa, e não como verdade fixa?",
          alternativas: [
            "Porque são inventados",
            "Porque dependem do substrato real, da temperatura, do teor de sólidos e do tempo de retenção — variam de caso a caso",
            "Porque biogás não rende nada",
          ],
          correta: 1,
          explicacao: "Rendimento é resultado de biologia e operação. A literatura dá faixas para projetar; a medição no local dá o número verdadeiro.",
        },
      ],
    },
    {
      id: "dimensionar-reator",
      titulo: "Dimensionar o volume do reator",
      blocos: [
        { tipo: "texto", texto: "Regra base: o volume útil do reator é o volume de alimentação diária multiplicado pelo tempo de retenção. Se você alimenta 100 litros de pasta por dia e quer 30 dias de retenção, precisa de ~3.000 litros (3 m3) de volume útil, mais folga para o gás. Menos retenção que o mínimo = resíduo sai cru e produz pouco; muito mais = tanque grande e caro à toa." },
        { tipo: "diagrama", titulo: "Fórmula do volume útil", codigo: `flowchart LR
  A["Alimentacao diaria (L/dia)"] --> C["x TRH (dias)"]
  B["TRH alvo: 20-40 dias"] --> C
  C --> D["= Volume util do reator (L)"]
  D --> E["+ folga para o gasometro"]` },
      ],
    },
    {
      id: "exemplo-calculo",
      titulo: "Exemplo: biodigestor de uma família/escola",
      blocos: [
        { tipo: "texto", texto: "Exemplo ilustrativo. Uma cozinha gera ~8 kg de resíduo por dia; diluindo 1:2 com água dá ~24 L de pasta/dia. Com TRH de 30 dias: volume útil ~720 L. Se esse resíduo rende na ordem de 0,3 m3 de biogás por kg, seriam ~2,4 m3 de biogás/dia — perto de 5 a 6 horas de fogão. Números para planejar; confirme medindo após a partida." },
        {
          tipo: "prancha",
          titulo: "Da pasta ao fogão (balanço do exemplo)",
          desenho: {
            legenda: "8 kg de resto -> ~24 L de pasta/dia -> reator de ~720 L (TRH 30 d) -> ~2,4 m3 de gas/dia -> horas de fogao.",
            primitivas: [
              { t: "retangulo", p: [20, 80], w: 55, h: 45, cor: "suave" },
              { t: "seta", de: [75, 100], ate: [100, 100], cor: "tinta" },
              { t: "circulo", c: [130, 100], r: 30, cor: "tinta" },
              { t: "seta", de: [160, 100], ate: [185, 100], cor: "tinta" },
              { t: "retangulo", p: [185, 70], w: 50, h: 60, cor: "destaque" },
              { t: "seta", de: [235, 100], ate: [260, 100], cor: "tinta" },
              { t: "rotulo", p: [20, 70], texto: "Pasta 24L" },
              { t: "rotulo", p: [108, 100], texto: "Reator" },
              { t: "rotulo", p: [185, 60], texto: "Gas 2,4m3" },
              { t: "rotulo", p: [255, 90], texto: "Fogao" },
            ],
          },
        },
      ],
    },
    {
      id: "energia-util",
      titulo: "Converter gás em serviço útil",
      blocos: [
        { tipo: "texto", texto: "Depois de saber quantos m3/dia você produz, converta para o uso: para cozinhar, divida pelo consumo do fogão (ordem de 0,3 a 0,45 m3/h por boca em uso); para eletricidade, conte ~1,2 a 1,6 kWh por m3 num grupo gerador (lembrando que boa parte da energia vira calor, não luz). A eficiência elétrica de motores pequenos é baixa — gás a gás, cozinhar aproveita melhor." },
        {
          tipo: "licao",
          pergunta: "Para a maioria das comunidades pequenas, qual uso aproveita melhor o biogás?",
          alternativas: [
            "Gerar eletricidade com motor pequeno",
            "Uso térmico direto (cozinhar, aquecer), que aproveita quase toda a energia do gás",
            "Guardar em botijão para vender",
          ],
          correta: 1,
          explicacao: "Motores pequenos jogam grande parte da energia fora como calor. O uso térmico direto é o mais eficiente e barato de implantar.",
        },
      ],
    },
    {
      id: "medir-producao",
      titulo: "Medir quanto gás sai",
      blocos: [
        { tipo: "texto", texto: "Sem medir, você opera no escuro. Dá para instalar um medidor de gás doméstico (tipo diafragma) na saída, ou estimar pelo volume do gasômetro (lona/campânula) acompanhando o quanto ele enche por dia. Meça também a pressão com um manômetro simples em U (coluna d'água): isso diz se há gás e se a tubulação está livre." },
        {
          tipo: "prancha",
          titulo: "Manômetro em U (coluna d'água)",
          desenho: {
            legenda: "Tubo transparente em U com água; a diferença de altura entre os dois lados mede a pressão do gás.",
            primitivas: [
              { t: "curva", pts: [[90, 60], [90, 150], [120, 170], [150, 150], [150, 60]], cor: "tinta" },
              { t: "linha", de: [90, 110], ate: [150, 130], cor: "destaque" },
              { t: "seta", de: [60, 80], ate: [90, 80], cor: "suave" },
              { t: "rotulo", p: [20, 72], texto: "Gas" },
              { t: "rotulo", p: [160, 110], texto: "Agua" },
              { t: "rotulo", p: [95, 185], texto: "Diferenca = pressao" },
            ],
          },
        },
      ],
    },
    {
      id: "medir-qualidade",
      titulo: "Medir a qualidade do gás",
      blocos: [
        { tipo: "texto", texto: "Para usar o gás em motor, vender ou virar biometano, é preciso conhecer o teor de metano, de CO2 e, principalmente, de H2S. Isso se faz com analisador de biogás (portátil) ou enviando amostra a laboratório, usando métodos normalizados (p. ex. ABNT NBR 16562, que trata de determinação de parâmetros de biogás e biometano). Sem esse dado, você não dimensiona filtro nem garante segurança do equipamento." },
        { tipo: "mobilizacao", papel: "Laboratório de análise de gases / técnico em instrumentação", porque: "Medir com precisão o teor de CH4, CO2 e H2S exige instrumento calibrado e método normalizado — decisão de projeto do filtro, do motor e da segurança depende disso.", entregaEsperada: "Laudo com composição do biogás (percentual de CH4, CO2 e concentração de H2S) e recomendação de tratamento, por método reconhecido (ex.: ABNT NBR 16562).", gerenciadoPor: "zaeon" },
      ],
    },
    // ===================== PROJETO =====================
    {
      id: "escolher-local",
      titulo: "Onde instalar: leitura do terreno",
      blocos: [
        { tipo: "texto", texto: "O lugar certo economiza obra e evita acidente. Procure: perto da fonte do resíduo (menos transporte), com sol (ajuda a aquecer), longe de poço e nascente (proteger a água), em cota que permita a pasta escoar por gravidade da carga para a saída, e com espaço livre e ventilado ao redor do gasômetro. Fuja de áreas de alagamento e de raízes grandes." },
        {
          tipo: "prancha",
          titulo: "Planta de implantação",
          desenho: {
            legenda: "Fonte do resíduo em cota mais alta; carga -> reator -> saída de biofertilizante por gravidade. Gasômetro ventilado.",
            primitivas: [
              { t: "retangulo", p: [20, 40], w: 60, h: 35, cor: "suave" },
              { t: "rotulo", p: [22, 32], texto: "Cozinha/curral" },
              { t: "seta", de: [80, 70], ate: [120, 95], cor: "tinta" },
              { t: "circulo", c: [150, 110], r: 32, cor: "tinta" },
              { t: "rotulo", p: [132, 110], texto: "Reator" },
              { t: "seta", de: [182, 120], ate: [220, 140], cor: "tinta" },
              { t: "retangulo", p: [220, 135], w: 55, h: 30, cor: "destaque" },
              { t: "rotulo", p: [222, 155], texto: "Biofertil." },
            ],
          },
        },
        {
          tipo: "tarefas",
          itens: [
            { id: "croqui-local", titulo: "Desenhe o croqui do local", entrega: "Marque fonte do resíduo, caminho da pasta por gravidade, posição do reator e do gasômetro, e distância de poços/nascentes. Cole aqui." },
          ],
        },
      ],
    },
    {
      id: "materiais",
      titulo: "Lista de materiais",
      blocos: [
        { tipo: "texto", texto: "Para um biodigestor doméstico de lona ou tambor, o kit básico costuma incluir: o corpo (manta/geomembrana ou tambores/manilhas), tubos de carga e descarga, registro e conexões, mangueira própria para gás, um gasômetro (lona ou campânula), filtro de H2S, dreno de umidade e um queimador/fogão adaptado. Prefira materiais resistentes ao gás e ao ácido; PVC comum não é indicado para contato prolongado com H2S úmido." },
        {
          tipo: "tarefas",
          itens: [
            { id: "lista-materiais", titulo: "Monte sua lista de materiais com preços", entrega: "Liste cada item, quantidade e preço cotado na sua região. Some o investimento total e cole aqui." },
          ],
        },
      ],
    },
    {
      id: "projeto-indiano-desenho",
      titulo: "Projeto detalhado (exemplo modelo indiano)",
      blocos: [
        { tipo: "texto", texto: "Num projeto indiano de pequeno porte: câmara cilíndrica com parede divisória central, caixa de carga de um lado e caixa de saída do outro (em nível para o efluente transbordar). A campânula se encaixa como um copo invertido e sobe guiada por um tubo central. A saída de gás fica no topo da campânula, com registro. Todas as medidas saem do volume útil que você calculou." },
        {
          tipo: "prancha",
          titulo: "Projeto cotado (esquema)",
          desenho: {
            legenda: "Caixa de carga (esq.), câmara com divisória, campânula guiada por tubo central, saída de gás no topo e saída de efluente por transbordo (dir.).",
            primitivas: [
              { t: "retangulo", p: [15, 95], w: 35, h: 40, cor: "suave" },
              { t: "rotulo", p: [10, 145], texto: "Carga" },
              { t: "retangulo", p: [60, 85], w: 180, h: 70, cor: "tinta" },
              { t: "linha", de: [150, 85], ate: [150, 140], cor: "tinta" },
              { t: "retangulo", p: [80, 55], w: 150, h: 35, cor: "destaque" },
              { t: "linha", de: [150, 30], ate: [150, 55], cor: "tinta" },
              { t: "seta", de: [150, 30], ate: [150, 18], cor: "destaque" },
              { t: "rotulo", p: [158, 20], texto: "Gas" },
              { t: "retangulo", p: [250, 100], w: 35, h: 35, cor: "suave" },
              { t: "rotulo", p: [250, 145], texto: "Saida" },
            ],
          },
        },
      ],
    },
    {
      id: "tubulacao-gas",
      titulo: "A linha de gás",
      blocos: [
        { tipo: "texto", texto: "Do gasômetro ao ponto de uso, use mangueira/tubo próprios para gás, o mais retos e curtos possível, com caimento para drenar a água que condensa. Instale registro na saída do reator e perto do ponto de uso. A pressão do biogás é baixa (centímetros de coluna d'água): perdas em tubo fino e longo apagam a chama. Teste vazamento com água e sabão — nunca com chama." },
        {
          tipo: "prancha",
          titulo: "Linha de gás com dreno",
          desenho: {
            legenda: "Caimento leva a água condensada ao ponto baixo, onde um dreno/purgador a remove. Registros no início e no fim.",
            primitivas: [
              { t: "linha", de: [30, 60], ate: [130, 90], cor: "tinta" },
              { t: "linha", de: [130, 90], ate: [230, 60], cor: "tinta" },
              { t: "circulo", c: [130, 100], r: 8, cor: "destaque" },
              { t: "rotulo", p: [100, 120], texto: "Dreno (ponto baixo)" },
              { t: "circulo", c: [30, 60], r: 6, cor: "suave" },
              { t: "circulo", c: [230, 60], r: 6, cor: "suave" },
              { t: "rotulo", p: [10, 48], texto: "Registro" },
              { t: "rotulo", p: [205, 48], texto: "Ao fogao" },
            ],
          },
        },
        {
          tipo: "licao",
          pergunta: "Como se procura vazamento numa linha de biogás?",
          alternativas: [
            "Acendendo um fósforo perto das conexões",
            "Passando água com sabão e observando bolhas, com o gás pressurizado",
            "Cheirando de perto",
          ],
          correta: 1,
          explicacao: "Água e sabão formam bolhas no vazamento. Chama perto de gás é risco de explosão; cheirar não localiza e expõe ao H2S.",
        },
      ],
    },
    {
      id: "remocao-h2s",
      titulo: "Tirar o H2S (dessulfurização)",
      blocos: [
        { tipo: "texto", texto: "O H2S corrói e envenena. O filtro mais acessível usa material à base de ferro (palha de aço/lã de aço ou limalha/óxido de ferro, às vezes com terra rica em ferro) dentro de um tubo pelo qual o gás passa: o enxofre reage e fica retido. O meio satura e precisa ser trocado ou regenerado. Para cozinhar, um filtro simples já ajuda muito; para motor, o controle de H2S é obrigatório." },
        {
          tipo: "prancha",
          titulo: "Filtro de H2S de leito de ferro",
          desenho: {
            legenda: "Coluna preenchida com material ferroso; o gás entra por baixo, sobe pelo leito e sai dessulfurizado por cima.",
            primitivas: [
              { t: "retangulo", p: [110, 40], w: 60, h: 120, cor: "tinta", hachura: true },
              { t: "seta", de: [140, 175], ate: [140, 160], cor: "destaque" },
              { t: "rotulo", p: [95, 185], texto: "Gas bruto entra" },
              { t: "seta", de: [140, 40], ate: [140, 25], cor: "destaque" },
              { t: "rotulo", p: [95, 20], texto: "Gas limpo sai" },
              { t: "rotulo", p: [175, 100], texto: "Leito de ferro" },
            ],
          },
        },
      ],
    },
    {
      id: "remocao-umidade",
      titulo: "Tirar a umidade",
      blocos: [
        { tipo: "texto", texto: "O biogás sai saturado de vapor. Essa água condensa na tubulação, bloqueia o fluxo e, com H2S, vira ácido. Solução simples: dar caimento à tubulação e colocar um purgador/dreno no ponto mais baixo para esvaziar a água periodicamente. Em instalações maiores, usa-se um pote separador (knock-out). Sem dreno, a linha 'engasga' e a chama falha." },
        {
          tipo: "prancha",
          titulo: "Purgador no ponto baixo",
          desenho: {
            legenda: "A água desce pelo caimento e se acumula no pote; abrir o registro inferior esvazia sem perder gás.",
            primitivas: [
              { t: "linha", de: [40, 70], ate: [150, 110], cor: "tinta" },
              { t: "linha", de: [150, 110], ate: [260, 70], cor: "tinta" },
              { t: "retangulo", p: [135, 110], w: 30, h: 45, cor: "destaque" },
              { t: "circulo", c: [150, 165], r: 6, cor: "suave" },
              { t: "rotulo", p: [120, 185], texto: "Dreno" },
              { t: "rotulo", p: [170, 130], texto: "Pote de agua" },
            ],
          },
        },
      ],
    },
    {
      id: "gasometro-armazenagem",
      titulo: "Armazenar o gás com segurança",
      blocos: [
        { tipo: "texto", texto: "O gasômetro guarda o gás produzido para você usar quando quiser. Na lona, é a própria manta que infla; no indiano, a campânula. NUNCA comprima biogás em botijão de GLP comum ou vasilha improvisada: pressão alta com gás inflamável e sem válvula adequada é bomba. Mantenha o gasômetro em área ventilada, sinalizada, longe de chama e sem peso sobre a lona além do previsto." },
        {
          tipo: "licao",
          pergunta: "Por que não se deve 'engarrafar' biogás num botijão de GLP comum em casa?",
          alternativas: [
            "Porque o gás escapa do metal",
            "Porque comprimir gás inflamável sem equipamento e válvulas adequadas cria risco altíssimo de explosão",
            "Porque é proibido guardar gás",
          ],
          correta: 1,
          explicacao: "Compressão segura de gases exige compressor, vaso e válvulas certificados. Improviso com inflamável é acidente grave esperando acontecer.",
        },
      ],
    },
    {
      id: "seguranca-projeto",
      titulo: "Segurança embutida no projeto",
      blocos: [
        { tipo: "texto", texto: "Três dispositivos salvam vidas e equipamentos. Válvula de alívio/selo d'água: libera o excesso de pressão para a atmosfera antes que algo rompa. Corta-chama (flame arrestor): impede que uma chama no fogão volte pela mangueira até o gasômetro. Registros: isolam trechos para manutenção. Mais sinalização, ventilação e nada de fumar ou soldar perto. Projeto bom é projeto que falha seguro." },
        {
          tipo: "prancha",
          titulo: "Selo d'água de alívio de pressão",
          desenho: {
            legenda: "Tubo mergulhado numa coluna d'água: se a pressão passa da altura da água, o gás borbulha e escapa, protegendo o sistema.",
            primitivas: [
              { t: "retangulo", p: [110, 70], w: 70, h: 90, cor: "tinta" },
              { t: "linha", de: [145, 40], ate: [145, 140], cor: "destaque" },
              { t: "linha", de: [110, 110], ate: [180, 110], cor: "suave" },
              { t: "rotulo", p: [182, 108], texto: "Nivel d'agua" },
              { t: "seta", de: [145, 40], ate: [145, 28], cor: "destaque" },
              { t: "rotulo", p: [120, 20], texto: "Gas (alivio)" },
            ],
          },
        },
        {
          tipo: "licao",
          pergunta: "Para que serve o corta-chama (flame arrestor) na linha de gás?",
          alternativas: [
            "Aumentar a pressão do gás",
            "Impedir que uma chama no ponto de uso retorne pela mangueira até o gasômetro",
            "Filtrar o CO2",
          ],
          correta: 1,
          explicacao: "Ele barra o retrocesso de chama, evitando que o fogo chegue ao volume de gás armazenado e cause explosão.",
        },
      ],
    },
    {
      id: "licenciamento",
      titulo: "Licenciamento e responsabilidade técnica",
      blocos: [
        { tipo: "texto", texto: "Projeto pequeno e familiar costuma ter exigências menores, mas qualquer instalação que trate resíduo, gere energia ou injete gás pode precisar de licenciamento ambiental, anotação de responsabilidade técnica (ART) e atendimento a normas. Isso protege a comunidade e viabiliza crédito e conexão. Antes de construir algo além do doméstico simples, consulte o órgão ambiental local e um responsável técnico." },
        { tipo: "mobilizacao", papel: "Engenheiro(a) responsável técnico (ambiental/agrícola/mecânico)", porque: "Dimensionamento estrutural, licenciamento ambiental e emissão de ART/laudo exigem profissional habilitado com registro no conselho — é o que dá respaldo legal e segurança à obra.", entregaEsperada: "Projeto assinado com ART, orientação sobre licenciamento junto ao órgão ambiental e memorial de segurança do sistema de gás.", gerenciadoPor: "zaeon" },
        {
          tipo: "fontes",
          titulo: "Marcos legais (normas reais)",
          itens: [
            { titulo: "Lei 12.305/2010 — Política Nacional de Resíduos Sólidos", url: "http://www.planalto.gov.br/ccivil_03/_ato2007-2010/2010/lei/l12305.htm", tipo: "norma" },
            { titulo: "Lei 11.445/2007 — Diretrizes do Saneamento Básico", url: "http://www.planalto.gov.br/ccivil_03/_ato2007-2010/2007/lei/l11445.htm", tipo: "norma" },
            { titulo: "Lei 14.300/2022 — Marco legal da microgeração e minigeração distribuída", url: "http://www.planalto.gov.br/ccivil_03/_ato2019-2022/2022/lei/l14300.htm", tipo: "norma" },
            { titulo: "Resolução ANP nº 886/2022 — especificação do biometano", url: "https://www.lex.com.br/resolucao-anp-no-886-de-29-de-setembro-de-2022", tipo: "norma", nota: "Biometano de aterro e ETE; ver também a Res. 906/2022 e consolidações posteriores no site da ANP." },
            { titulo: "Catálogo ABNT — NBR 16562 (métodos para biogás/biometano) e NBR 15526 (instalações de gases combustíveis)", url: "https://www.abntcatalogo.com.br/", tipo: "norma", nota: "Normas técnicas (acesso pago); confirmar a versão vigente." },
          ],
        },
      ],
    },
    // ===================== EXECUÇÃO =====================
    {
      id: "obra-fundacao",
      titulo: "A obra: base e corpo",
      blocos: [
        { tipo: "texto", texto: "Independente do modelo, a base precisa ser nivelada, firme e, nos modelos enterrados, impermeável — vazamento de pasta contamina solo e água. Em alvenaria, a estanqueidade da câmara é tudo; em lona, a preparação da vala (sem pedra pontuda, com proteção da manta) evita furos. Esta é a etapa em que vale a mão de obra certa: pedreiro para alvenaria, soldador para campânula metálica." },
        {
          tipo: "prancha",
          titulo: "Base impermeável e nivelada",
          desenho: {
            legenda: "Vala/câmara com fundo impermeabilizado e paredes seladas; nível conferido antes de prosseguir.",
            primitivas: [
              { t: "curva", pts: [[40, 80], [60, 150], [240, 150], [260, 80]], cor: "tinta" },
              { t: "linha", de: [55, 150], ate: [245, 150], cor: "destaque" },
              { t: "rotulo", p: [90, 165], texto: "Fundo impermeavel" },
              { t: "linha", de: [40, 80], ate: [260, 80], cor: "suave" },
              { t: "rotulo", p: [110, 70], texto: "Nivel conferido" },
            ],
          },
        },
        { tipo: "mobilizacao", papel: "Pedreiro / soldador (conforme o modelo)", porque: "Alvenaria estanque (modelos chinês/indiano) e campânula metálica exigem execução técnica; falha de estanqueidade vaza pasta e gás e inviabiliza o sistema.", entregaEsperada: "Câmara estanque e nivelada (teste de estanqueidade aprovado) ou campânula bem vedada, conforme o projeto assinado.", gerenciadoPor: "zaeon" },
      ],
    },
    {
      id: "montagem-campanula",
      titulo: "Montar gasômetro e tubulações",
      blocos: [
        { tipo: "texto", texto: "Com o corpo pronto, monta-se a campânula/lona, a guia, a saída de gás com registro, o filtro de H2S e o dreno. Aperte bem as conexões, mas sem forçar e rachar. Deixe a saída de gás acessível para manutenção. Antes de colocar carga, confira que registros abrem e fecham e que não há peso ou objeto apoiado onde a lona vai inflar." },
        {
          tipo: "tarefas",
          itens: [
            { id: "montagem-check", titulo: "Checklist de montagem", entrega: "Confira e marque: campânula/lona livre, saída de gás com registro, filtro de H2S instalado, dreno no ponto baixo, caixas de carga e saída niveladas." },
          ],
        },
      ],
    },
    {
      id: "teste-estanqueidade",
      titulo: "Teste de estanqueidade (antes de ligar)",
      blocos: [
        { tipo: "texto", texto: "Nunca dê a partida sem testar vazamento. Pressurize o sistema com ar (bomba) até a pressão de trabalho e verifique com água e sabão todas as conexões, ou acompanhe a pressão num manômetro: se cair sozinha, há vazamento. Só avance quando segurar a pressão. Esse teste é o que separa um sistema seguro de um risco." },
        {
          tipo: "tarefas",
          itens: [
            { id: "teste-pressao", titulo: "Faça o teste de pressão", entrega: "Pressurize com ar, marque a pressão e o horário, e confira depois de 30 min a 1 h. Registre se manteve ou caiu, e onde encontrou bolhas." },
          ],
        },
        {
          tipo: "licao",
          pergunta: "Por que o teste de estanqueidade é feito com ar/água e sabão, e não dando a partida direto?",
          alternativas: [
            "Para economizar resíduo",
            "Para achar vazamentos sem gás inflamável no sistema, com segurança, antes de haver metano",
            "Porque o ar produz mais gás",
          ],
          correta: 1,
          explicacao: "Testar com ar elimina o risco de explosão durante a busca de vazamentos. Só depois de estanque se introduz o substrato.",
        },
      ],
    },
    {
      id: "inoculo-partida",
      titulo: "A partida: inóculo e paciência",
      blocos: [
        { tipo: "texto", texto: "Um reator novo está 'vazio' de bactérias. A partida acelera muito se você colocar um inóculo: esterco fresco de bovino ou, melhor ainda, lodo de outro biodigestor já em funcionamento. Encha com a mistura, vede e espere. Nas primeiras semanas, o gás vem fraco e com muito CO2/ar — é normal. A produção estável chega quando a microbiota se estabelece, o que leva de algumas semanas a dois meses." },
        { tipo: "video", titulo: "Uso do biodigestor (operação na prática)", youtube: "SbrI6DvaoBI" },
      ],
    },
    {
      id: "primeiras-semanas",
      titulo: "As primeiras queimas",
      blocos: [
        { tipo: "texto", texto: "O primeiro gás é majoritariamente ar e CO2 e NÃO queima bem — pode até não acender. Purgue (libere) essas primeiras cargas de gás com segurança, longe de chama, até o metano dominar. Quando a chama acender azul e estável, a partida deu certo. Chama amarela e fraca indica pouco metano, ar na linha ou umidade." },
        {
          tipo: "licao",
          pergunta: "Nas primeiras semanas a chama não acende ou fica fraca. O que provavelmente está acontecendo?",
          alternativas: [
            "O biodigestor está perfeito",
            "O gás inicial ainda tem muito ar e CO2 e pouco metano; é preciso purgar e esperar a microbiota se estabelecer",
            "Faltou colocar água sanitária",
          ],
          correta: 1,
          explicacao: "No começo o metano é baixo. Purgar o gás inicial e aguardar a estabilização resolve. Água sanitária mataria as bactérias.",
        },
      ],
    },
    {
      id: "registro-diario",
      titulo: "Caderno de bordo do reator",
      blocos: [
        { tipo: "texto", texto: "Quem anota, controla. Mantenha um registro diário: quanto alimentou, temperatura (ambiente e, se possível, da massa), pressão/enchimento do gasômetro, quanto gás usou e qualquer anormalidade (cheiro, chama, cor). Em duas semanas esse diário já mostra o ritmo normal do seu reator — e qualquer desvio salta aos olhos." },
        {
          tipo: "tarefas",
          itens: [
            { id: "diario-reator", titulo: "Crie o diário de operação", entrega: "Monte uma tabela com colunas: data, alimentação (kg/L), temperatura, pressão/enchimento, gás usado, observações. Preencha por 14 dias e cole aqui." },
          ],
        },
      ],
    },
    // ===================== MANUTENÇÃO =====================
    {
      id: "rotina-alimentacao",
      titulo: "Rotina de alimentação",
      blocos: [
        { tipo: "texto", texto: "A regra de ouro da operação é constância: alimentar mais ou menos a mesma quantidade, da mesma receita, no mesmo horário. Mudança brusca (dobrar a carga, trocar o substrato de repente) dá choque na microbiota e derruba a produção. Triture o que for fibroso, mantenha a diluição e retire o efluente na mesma medida que alimenta, nos sistemas contínuos." },
        {
          tipo: "tarefas",
          itens: [
            { id: "rotina-semana", titulo: "Defina sua rotina semanal", entrega: "Escreva a receita diária (quantidade e mistura), o horário e quem é responsável. Combine como reduzir carga em férias/baixa de resíduo." },
          ],
        },
      ],
    },
    {
      id: "controle-operacao",
      titulo: "Manter a temperatura e o ritmo",
      blocos: [
        { tipo: "texto", texto: "Na faixa mesofílica, oscilações de alguns graus são toleráveis, mas quedas grandes (noite fria, inverno) reduzem a produção. Ajuda: cobrir/isolar o reator, usar o sol, enterrar parte do corpo e evitar alimentar com água muito fria. Em regiões frias, a produção cai no inverno — planeje o uso do gás contando com isso, sem forçar a carga para compensar." },
        {
          tipo: "licao",
          pergunta: "No inverno a produção caiu. Qual é a resposta errada?",
          alternativas: [
            "Isolar/cobrir o reator e usar água menos fria",
            "Dobrar a alimentação para 'compensar' o frio",
            "Aceitar menos gás e planejar o uso",
          ],
          correta: 1,
          explicacao: "Mais carga com bactérias lentas pelo frio acidifica e piora tudo. Trata-se de aquecer/isolar, não de sobrecarregar.",
        },
      ],
    },
    {
      id: "problemas-comuns",
      titulo: "Diagnóstico de problemas",
      blocos: [
        { tipo: "texto", texto: "A maioria das falhas tem poucas causas. Pouco gás: frio, sobrecarga/acidez, vazamento ou substrato ruim. Chama amarela/fraca: pouco metano, ar ou umidade na linha. Cheiro forte de ovo podre: H2S alto, filtro saturado. Gasômetro não enche: vazamento ou reator parado. Use o diagrama abaixo como roteiro antes de mexer em tudo ao mesmo tempo." },
        { tipo: "diagrama", titulo: "Árvore de diagnóstico", codigo: `flowchart TD
  A["Problema?"] --> B["Pouco gas"]
  A --> C["Chama fraca/amarela"]
  A --> D["Cheiro de ovo podre"]
  B --> B1["Checar: frio, sobrecarga/pH, vazamento"]
  C --> C1["Checar: metano baixo, ar, umidade na linha"]
  D --> D1["Checar: filtro de H2S saturado -> trocar"]` },
      ],
    },
    {
      id: "azedou-reator",
      titulo: "Quando o reator 'azeda'",
      blocos: [
        { tipo: "texto", texto: "Sinal clássico de sobrecarga: a produção cai, o pH baixa e o cheiro muda. O erro é continuar alimentando. O certo é PARAR de alimentar por alguns dias, deixar as metanogênicas consumirem o ácido acumulado, e só então retomar com carga menor. Em casos mais sérios, adiciona-se alcalinizante (cal hidratada ou bicarbonato) com muita cautela e pouco de cada vez, medindo o pH." },
        {
          tipo: "licao",
          pergunta: "A produção despencou e o pH caiu depois de você aumentar muito a carga. Primeira providência?",
          alternativas: [
            "Alimentar ainda mais para forçar produção",
            "Parar de alimentar, deixar o reator consumir o ácido e retomar com carga menor",
            "Jogar água sanitária para limpar",
          ],
          correta: 1,
          explicacao: "Sobrecarga se corrige aliviando a carga, não aumentando. Água sanitária mataria a microbiota.",
        },
      ],
    },
    {
      id: "limpeza-lodo",
      titulo: "Retirada de lodo e areia",
      blocos: [
        { tipo: "texto", texto: "Com o tempo, material pesado (areia, terra, fibras não digeridas) acumula no fundo e reduz o volume útil. Dependendo do substrato, de tempos em tempos é preciso remover esse lodo. Planeje a limpeza como operação de espaço confinado (nunca entrar sem procedimento) e aproveite o lodo retirado, que ainda é bom biofertilizante. Evitar areia na carga (lavar bem o resíduo) reduz a frequência." },
        {
          tipo: "tarefas",
          itens: [
            { id: "plano-limpeza", titulo: "Planeje a limpeza periódica", entrega: "Defina a cada quanto tempo e como fará a retirada de lodo, com as regras de espaço confinado e o destino do lodo. Escreva aqui." },
          ],
        },
      ],
    },
    {
      id: "inverno-frio",
      titulo: "Operar em clima frio",
      blocos: [
        { tipo: "texto", texto: "Onde esfria, isolar vale ouro: enterrar o reator, cobrir com estufa plástica para aquecer com o sol, isolar a lona e proteger do vento. Alguns sistemas aquecem a massa com parte do próprio biogás ou com a água quente do motor-gerador. Para o pequeno produtor, aproveitar o sol e isolar já segura boa parte da queda de inverno." },
        {
          tipo: "prancha",
          titulo: "Estufa sobre o biodigestor de lona",
          desenho: {
            legenda: "Cobertura plástica em arco cria efeito estufa e protege a lona do vento, segurando a temperatura.",
            primitivas: [
              { t: "curva", pts: [[40, 150], [70, 170], [230, 170], [260, 150]], cor: "tinta" },
              { t: "curva", pts: [[40, 150], [150, 80], [260, 150]], cor: "destaque" },
              { t: "curva", pts: [[25, 160], [150, 40], [275, 160]], cor: "suave" },
              { t: "rotulo", p: [110, 60], texto: "Estufa plastica" },
              { t: "rotulo", p: [120, 160], texto: "Lona do gas" },
            ],
          },
        },
      ],
    },
    // ===================== USOS =====================
    {
      id: "cozinhar",
      titulo: "Uso 1: cozinhar",
      blocos: [
        { tipo: "texto", texto: "O uso mais direto e eficiente é o fogão. O biogás substitui parte ou todo o GLP da cozinha, especialmente em propriedade com esterco ou numa cozinha comunitária. A chama boa é azul e estável. Como a pressão e o poder calorífico são menores que os do GLP, o fogão precisa de pequeno ajuste no queimador para render bem." },
        { tipo: "video", titulo: "Adaptação de fogões a biogás", youtube: "OHXVMzxPM9Y" },
      ],
    },
    {
      id: "adaptar-fogao",
      titulo: "Adaptar o fogão ao biogás",
      blocos: [
        { tipo: "texto", texto: "O fogão de GLP tem furos (injetores) calculados para gás mais 'forte' e sob pressão maior. Com biogás, abre-se um pouco o injetor (furo maior) e ajusta-se a entrada de ar para pegar a chama azul. É um ajuste simples, mas que muda o rendimento. Faça com o gás já filtrado de H2S e teste a chama antes do uso rotineiro." },
        {
          tipo: "prancha",
          titulo: "Queimador: ar + gás = chama azul",
          desenho: {
            legenda: "O gás passa pelo injetor, arrasta ar pela entrada regulável e queima no queimador; ajuste de ar define a cor da chama.",
            primitivas: [
              { t: "linha", de: [40, 130], ate: [150, 130], cor: "tinta" },
              { t: "circulo", c: [60, 130], r: 5, cor: "destaque" },
              { t: "rotulo", p: [30, 150], texto: "Injetor" },
              { t: "seta", de: [90, 150], ate: [90, 135], cor: "suave" },
              { t: "rotulo", p: [78, 165], texto: "Ar" },
              { t: "retangulo", p: [150, 115], w: 40, h: 30, cor: "tinta" },
              { t: "curva", pts: [[160, 115], [170, 90], [180, 115]], cor: "destaque" },
              { t: "rotulo", p: [195, 95], texto: "Chama azul" },
            ],
          },
        },
        {
          tipo: "licao",
          pergunta: "Por que um fogão de GLP precisa de ajuste para usar biogás?",
          alternativas: [
            "Porque o biogás é mais forte que o GLP",
            "Porque o biogás tem menor poder calorífico e pressão; é preciso ajustar injetor e ar para a chama ficar azul e eficiente",
            "Porque biogás não acende em fogão",
          ],
          correta: 1,
          explicacao: "Injetores de GLP são calibrados para gás mais denso e sob mais pressão. O biogás, mais 'fraco', pede furo maior e ajuste de ar.",
        },
      ],
    },
    {
      id: "eletricidade",
      titulo: "Uso 2: eletricidade",
      blocos: [
        { tipo: "texto", texto: "Com volume maior de gás, dá para gerar eletricidade num grupo motor-gerador adaptado a biogás. É mais complexo: o motor exige gás limpo (H2S controlado) e manutenção, e boa parte da energia vira calor (que pode ser aproveitado para aquecer o reator — cogeração). Para a maioria das comunidades pequenas, faz sentido só quando há bastante substrato e necessidade real de energia no local." },
        { tipo: "diagrama", titulo: "Do gás à tomada", codigo: `flowchart LR
  A["Biogas limpo (sem H2S)"] --> B["Motor-gerador a gas"]
  B --> C["Eletricidade"]
  B --> D["Calor -> aquecer reator (cogeracao)"]` },
        { tipo: "mobilizacao", papel: "Eletricista habilitado (NR-10) / técnico em eletrotécnica", porque: "Instalar e conectar grupo gerador, quadros e proteções envolve risco elétrico e exige profissional habilitado conforme a NR-10 — improviso elétrico mata e anula seguro.", entregaEsperada: "Instalação elétrica do gerador com aterramento e proteções, laudo/ART elétrica, e pré-requisitos atendidos para eventual conexão à rede.", gerenciadoPor: "zaeon" },
      ],
    },
    {
      id: "conexao-rede",
      titulo: "Conectar à rede (geração distribuída)",
      blocos: [
        { tipo: "texto", texto: "Gerou mais do que consome? O marco legal da geração distribuída (Lei 14.300/2022, regulada pela ANEEL) permite, em tese, compensar energia injetada na rede, inclusive de fontes como o biogás, dentro das regras da distribuidora. Isso exige projeto, medidor bidirecional, homologação e profissional habilitado. É viável em escala, não no biodigestor de um tambor." },
        {
          tipo: "licao",
          pergunta: "O que a Lei 14.300/2022 regula, em relação ao biogás?",
          alternativas: [
            "Proíbe gerar energia com biogás",
            "Estabelece o marco da micro/minigeração distribuída, que pode permitir compensar na rede a energia gerada (inclusive por biogás), sob regras",
            "Obriga toda casa a ter biodigestor",
          ],
          correta: 1,
          explicacao: "Ela é o marco legal da geração distribuída. A conexão e compensação seguem as regras da ANEEL e da distribuidora, com projeto e homologação.",
        },
        {
          tipo: "fontes",
          titulo: "Energia e conexão (fontes)",
          itens: [
            { titulo: "ANEEL — Geração Distribuída", url: "https://www.gov.br/aneel/pt-br/assuntos/geracao-distribuida", tipo: "site" },
            { titulo: "Lei 14.300/2022 — marco da geração distribuída", url: "http://www.planalto.gov.br/ccivil_03/_ato2019-2022/2022/lei/l14300.htm", tipo: "norma" },
          ],
        },
      ],
    },
    {
      id: "aquecimento-secagem",
      titulo: "Uso 3: calor de processo",
      blocos: [
        { tipo: "texto", texto: "Além do fogão e da luz, o biogás serve para qualquer necessidade de calor: aquecer água, aquecer aviário/leitão, secar grãos ou frutas, aquecer o próprio reator. Como o uso térmico aproveita quase toda a energia do gás, costuma ser a aplicação de melhor custo-benefício depois de cozinhar — vale listar as demandas de calor da comunidade antes de pensar em eletricidade." },
      ],
    },
    {
      id: "biometano",
      titulo: "Uso 4: biometano (biogás purificado)",
      blocos: [
        { tipo: "texto", texto: "Biometano é o biogás 'limpo': retira-se o CO2, a umidade e o H2S até o teor de metano ficar alto (acima de ~90-96%), equivalente ao gás natural. Aí ele pode substituir GNV em veículos, ser injetado na rede de gás ou engarrafado. A especificação é regulada pela ANP. É um salto de escala e custo frente ao biogás bruto — território de usina, não de quintal." },
        { tipo: "video", titulo: "Biometano em aterro sanitário funciona? (caso GNR Dois Arcos)", youtube: "57ihO_52jC0" },
      ],
    },
    {
      id: "purificacao-biometano",
      titulo: "Como se purifica o biogás",
      blocos: [
        { tipo: "texto", texto: "O 'upgrade' para biometano separa o metano do CO2 por tecnologias como lavagem com água/solvente (absorção), peneira molecular (PSA) ou membranas, sempre após remover H2S e umidade. Cada rota tem custo, consumo de energia e perda de metano diferentes. É engenharia de processo que se paga só com volume relevante e demanda garantida de biometano." },
        { tipo: "video", titulo: "Purificação de biogás para valorização energética (biometano)", youtube: "myNBVB_bK9s" },
        {
          tipo: "prancha",
          titulo: "Linha de upgrade (visão geral)",
          desenho: {
            legenda: "Biogás bruto passa por remoção de H2S, secagem e separação de CO2, saindo biometano de alto teor de metano.",
            primitivas: [
              { t: "retangulo", p: [15, 85], w: 55, h: 35, cor: "suave" },
              { t: "rotulo", p: [18, 78], texto: "Biogas bruto" },
              { t: "seta", de: [70, 102], ate: [90, 102], cor: "tinta" },
              { t: "retangulo", p: [90, 85], w: 50, h: 35, cor: "tinta" },
              { t: "rotulo", p: [95, 105], texto: "H2S/seca" },
              { t: "seta", de: [140, 102], ate: [160, 102], cor: "tinta" },
              { t: "retangulo", p: [160, 85], w: 50, h: 35, cor: "tinta" },
              { t: "rotulo", p: [168, 105], texto: "tira CO2" },
              { t: "seta", de: [210, 102], ate: [230, 102], cor: "destaque" },
              { t: "rotulo", p: [228, 95], texto: "Biometano" },
            ],
          },
        },
      ],
    },
    {
      id: "biofertilizante",
      titulo: "Uso 5: o biofertilizante (digestato)",
      blocos: [
        { tipo: "texto", texto: "O que sai do reator (digestato ou biofertilizante) não é lixo: é adubo. A digestão preserva nutrientes como nitrogênio, fósforo e potássio em forma mais disponível à planta, reduz odor e, pelo tempo de retenção, diminui patógenos frente ao esterco cru. É um dos maiores valores do sistema — às vezes vale mais que o gás." },
        {
          tipo: "prancha",
          titulo: "Dois produtos de um reator",
          desenho: {
            legenda: "O mesmo reator entrega gás por cima (energia) e biofertilizante por baixo/saída (adubo).",
            primitivas: [
              { t: "circulo", c: [150, 110], r: 55, cor: "tinta" },
              { t: "seta", de: [150, 55], ate: [150, 30], cor: "destaque" },
              { t: "rotulo", p: [160, 28], texto: "Gas (energia)" },
              { t: "seta", de: [205, 130], ate: [235, 145], cor: "suave" },
              { t: "rotulo", p: [225, 160], texto: "Biofertilizante" },
              { t: "rotulo", p: [128, 108], texto: "Reator" },
            ],
          },
        },
        { tipo: "mobilizacao", papel: "Agrônomo(a) / técnico agrícola", porque: "A dose certa, o momento de aplicação e a segurança sanitária do biofertilizante dependem de análise do material e do solo; aplicação errada queima a planta, contamina água ou dissemina patógeno.", entregaEsperada: "Recomendação de dose e manejo por cultura, com base em análise do biofertilizante e do solo, e orientação sanitária de aplicação.", gerenciadoPor: "zaeon" },
      ],
    },
    {
      id: "aplicar-biofertilizante",
      titulo: "Aplicar o biofertilizante com segurança",
      blocos: [
        { tipo: "texto", texto: "Cuidados práticos: respeite a dose recomendada (excesso salga e queima a planta e polui a água), aplique no solo e não sobre a parte comestível que se come crua, observe carência sanitária e evite aplicar antes de chuva forte (escorre para o rio). O digestato líquido pode ir na fertirrigação; o mais sólido, incorporado ao solo. Analisar antes de aplicar evita erro." },
        {
          tipo: "licao",
          pergunta: "Qual prática é segura ao usar biofertilizante numa horta?",
          alternativas: [
            "Aplicar o máximo possível para crescer mais rápido",
            "Respeitar a dose recomendada, aplicar no solo e evitar contato com partes comestíveis cruas e com cursos d'água",
            "Despejar o excedente no riacho ao lado",
          ],
          correta: 1,
          explicacao: "Dose e manejo corretos dão nutrição sem salinizar, queimar nem contaminar. Despejar em rio é crime ambiental e risco à saúde.",
        },
        {
          tipo: "tarefas",
          itens: [
            { id: "plano-biofert", titulo: "Plano de uso do biofertilizante", entrega: "Defina onde aplicar (quais canteiros/cultura), com que dose e frequência, e como vai registrar os resultados. Cole aqui." },
          ],
        },
      ],
    },
    // ===================== CASOS REAIS =====================
    {
      id: "caso-aterro",
      titulo: "Caso: biogás de aterro sanitário",
      blocos: [
        { tipo: "texto", texto: "Aterros são grandes biodigestores a céu fechado: o lixo orgânico enterrado gera metano por anos. Em vez de deixar escapar ou só queimar (flare), vários aterros brasileiros captam o gás por poços e o transformam em energia elétrica ou biometano. É a prova em grande escala de que resíduo orgânico é fonte de energia — e um lembrete do potencial que se perde quando não se capta." },
        { tipo: "video", titulo: "Biogás pode ser gerado em aterros (Jornal Futura)", youtube: "hvJhip3FzH8" },
      ],
    },
    {
      id: "caso-dois-arcos",
      titulo: "Caso: biometano comercial (GNR Dois Arcos)",
      blocos: [
        { tipo: "texto", texto: "A usina de Dois Arcos (São Pedro da Aldeia, RJ) é citada como pioneira na produção de biometano em escala comercial no Brasil, purificando biogás de aterro até padrão de gás natural para substituir combustível fóssil. Mostra a cadeia completa funcionando: resíduo, captação, purificação e venda — e o papel da regulação da ANP na especificação do produto." },
        {
          tipo: "fontes",
          titulo: "Casos e setor (fontes)",
          itens: [
            { titulo: "CIBiogás — publicações e notícias do setor", url: "https://cibiogas.org/", tipo: "site" },
            { titulo: "eCycle — O que é e como funciona o biodigestor", url: "https://www.ecycle.com.br/biodigestor/", tipo: "site", nota: "Material introdutório de divulgação." },
          ],
        },
      ],
    },
    {
      id: "caso-rs-caminhoes",
      titulo: "Caso: lixo que vira combustível de caminhão",
      blocos: [
        { tipo: "texto", texto: "Usinas de biometano já abastecem frotas: transformam resíduo em combustível veicular (substituto do GNV/diesel) que roda em caminhões. É o ciclo urbano fechando — o lixo da cidade move os caminhões que recolhem o lixo. Para a comunidade, o recado é de direção: começar pequeno (cozinhar) e, com escala e parceria, caminhar para usos maiores." },
        { tipo: "video", titulo: "Usina transforma lixo em biometano e abastece caminhões", youtube: "7fIXAjQgnkc" },
      ],
    },
    {
      id: "caso-suino",
      titulo: "Caso: granja suína e o problema que virou solução",
      blocos: [
        { tipo: "texto", texto: "Na suinocultura, o dejeto era passivo ambiental e foco de multa. Com biodigestor (hoje tipicamente de lona), a mesma propriedade trata o efluente, reduz o cheiro, gera biogás para aquecer leitões e produzir energia, e usa o biofertilizante na lavoura. É o caso brasileiro mais consolidado de biogás rural — e a inspiração para o modelo comunitário com esterco." },
      ],
    },
    {
      id: "caso-comunidade",
      titulo: "Caso: biodigestor em escola e comunidade",
      blocos: [
        { tipo: "texto", texto: "Projetos de educação ambiental instalam biodigestores de pequeno porte em escolas e associações: a merenda e a poda alimentam o reator, o gás ajuda na cozinha e o biofertilizante vai para a horta pedagógica. O valor não é só energético — é mostrar na prática o ciclo do resíduo. Esses projetos funcionam quando há alguém responsável pela operação diária." },
        {
          tipo: "licao",
          pergunta: "Qual o fator que mais decide o sucesso de um biodigestor comunitário?",
          alternativas: [
            "A marca do equipamento",
            "Haver responsável por operar e alimentar com constância, e manutenção combinada",
            "Ter o maior reator possível",
          ],
          correta: 1,
          explicacao: "Tecnologia resolvida, o que falha é a operação. Constância de alimentação e um responsável claro valem mais que tamanho ou marca.",
        },
      ],
    },
    {
      id: "caso-internacional",
      titulo: "Caso: biodigestores domésticos pelo mundo",
      blocos: [
        { tipo: "texto", texto: "Programas na Índia, China, Nepal, Vietnã e vários países africanos já instalaram milhões de biodigestores domésticos simples, substituindo lenha e querosene por biogás de esterco para cozinhar e iluminar. Mostram que a tecnologia de pequeno porte funciona e escala socialmente — com assistência técnica, treinamento e acompanhamento, não só o tanque." },
      ],
    },
    // ===================== RECURSOS / MOBILIZAÇÃO =====================
    {
      id: "mapa-profissionais",
      titulo: "Quem chamar e quando",
      blocos: [
        { tipo: "texto", texto: "Boa parte do caderno você faz com a comunidade. Mas quatro momentos pedem profissional: análise do gás/efluente (laboratório), projeto e licença (engenheiro com ART), obra estrutural e campânula (pedreiro/soldador), e qualquer parte elétrica ou conexão à rede (eletricista habilitado). O agrônomo entra para o uso seguro do biofertilizante. Mobilizar certo evita acidente e retrabalho." },
        { tipo: "diagrama", titulo: "Mapa de mobilização", codigo: `flowchart TD
  P["Etapa do projeto"] --> A["Analise de gas/efluente -> Laboratorio"]
  P --> B["Projeto + licenca -> Engenheiro (ART)"]
  P --> C["Obra/campanula -> Pedreiro/Soldador"]
  P --> D["Eletrica/rede -> Eletricista (NR-10)"]
  P --> E["Biofertilizante -> Agronomo"]` },
      ],
    },
    {
      id: "normas-resumo",
      titulo: "As normas que importam",
      blocos: [
        { tipo: "texto", texto: "Resumo do arcabouço: a PNRS (Lei 12.305/2010) e o saneamento (Lei 11.445/2007) enquadram o tratamento do resíduo; a Lei 14.300/2022 e a regulação da ANEEL tratam da energia gerada; as resoluções da ANP especificam o biometano; e normas ABNT cobrem métodos de análise do gás e instalações de gases combustíveis. Para uso doméstico simples, foque em segurança e boas práticas; a partir de escala, o arcabouço completo entra em cena." },
        {
          tipo: "fontes",
          titulo: "Normas e regulação (consolidado)",
          itens: [
            { titulo: "Lei 12.305/2010 — PNRS", url: "http://www.planalto.gov.br/ccivil_03/_ato2007-2010/2010/lei/l12305.htm", tipo: "norma" },
            { titulo: "Lei 11.445/2007 — Saneamento Básico", url: "http://www.planalto.gov.br/ccivil_03/_ato2007-2010/2007/lei/l11445.htm", tipo: "norma" },
            { titulo: "Lei 14.300/2022 — Geração Distribuída", url: "http://www.planalto.gov.br/ccivil_03/_ato2019-2022/2022/lei/l14300.htm", tipo: "norma" },
            { titulo: "ANP — Biometano (resoluções e regulação)", url: "https://www.gov.br/anp/pt-br", tipo: "site" },
            { titulo: "Catálogo ABNT (NBR 16562, NBR 15526 e correlatas)", url: "https://www.abntcatalogo.com.br/", tipo: "norma" },
          ],
        },
      ],
    },
    {
      id: "dados-abertos",
      titulo: "Dados e materiais técnicos abertos",
      blocos: [
        { tipo: "texto", texto: "Para calcular, comparar e defender o projeto, vale buscar material de fontes sérias e gratuitas: a Embrapa tem circulares de construção e operação de biodigestores; a ANP mantém página oficial sobre biometano e sua regulação; o CIBiogás publica o Panorama anual; o Probiogás (cooperação Brasil-Alemanha) produziu guias técnicos; e a IEA Bioenergy reúne referência internacional. Leia antes de comprar qualquer coisa." },
        {
          tipo: "fontes",
          titulo: "Material técnico (fontes primárias)",
          itens: [
            { titulo: "Embrapa Infoteca — Circular Técnica sobre biodigestor (PDF)", url: "https://www.infoteca.cnptia.embrapa.br/infoteca/bitstream/doc/476075/1/circ3.pdf", tipo: "artigo" },
            { titulo: "ANP — Biometano (biocombustível a partir do biogás)", url: "https://www.gov.br/anp/pt-br/assuntos/producao-e-fornecimento-de-biocombustiveis/biometano", tipo: "norma", nota: "Página oficial da ANP: define biometano e remete à Resolução ANP de especificação." },
            { titulo: "Revista Energia na Agricultura (UNESP) — artigos sobre biodigestores", url: "https://revistas.fca.unesp.br/index.php/energia", tipo: "artigo" },
            { titulo: "IEA Bioenergy — digestão anaeróbia e biogás", url: "https://www.ieabioenergy.com/", tipo: "site" },
            { titulo: "CIBiogás — centro de referência em biogás", url: "https://cibiogas.org/", tipo: "site" },
          ],
        },
      ],
    },
    {
      id: "financiamento",
      titulo: "Como pagar o projeto",
      blocos: [
        { tipo: "texto", texto: "O investimento varia muito: um biodigestor doméstico de tambor/lona é barato; uma usina é milionária. Caminhos de financiamento no Brasil incluem linhas de crédito rural (como as do Pronaf para agricultura familiar), programas estaduais e editais de meio ambiente/energia, além de modelos de parceria e cooperativa. Um projeto bem feito, com números e fontes (como os deste caderno), é o que abre a porta do crédito." },
      ],
    },
    {
      id: "comunidade-gestao",
      titulo: "Gestão coletiva: quem cuida",
      blocos: [
        { tipo: "texto", texto: "Num projeto comunitário, a parte social é tão crítica quanto a técnica. Defina desde o início: quem alimenta e quando, quem faz manutenção, como se dividem o gás e o biofertilizante, e como se cobre o custo de operação. Modelos de associação ou cooperativa ajudam a formalizar isso. Projeto sem dono definido vira sucata — não por falha técnica, mas por falta de gestão." },
        {
          tipo: "tarefas",
          itens: [
            { id: "acordo-gestao", titulo: "Escreva o acordo de gestão", entrega: "Defina responsáveis pela alimentação e manutenção, divisão do gás e do adubo, e rateio de custos. Registre como combinado da comunidade e cole aqui." },
          ],
        },
      ],
    },
    {
      id: "erros-a-evitar",
      titulo: "Os erros que afundam projetos",
      blocos: [
        { tipo: "texto", texto: "Os tropeços se repetem: superdimensionar (tanque grande demais para o resíduo real), ignorar o H2S e corroer tudo, operar sem medir, dar choque de carga, improvisar armazenagem de gás sob pressão, esquecer a segurança (corta-chama, alívio, espaço confinado) e não combinar quem opera. Quase todo fracasso cai em um desses — e todos são evitáveis com o que está neste caderno." },
        {
          tipo: "licao",
          pergunta: "Qual destes é o erro mais perigoso para a segurança das pessoas?",
          alternativas: [
            "Superdimensionar o tanque",
            "Improvisar armazenagem de gás sob pressão e dispensar dispositivos de segurança (corta-chama, alívio)",
            "Operar sem medir a produção",
          ],
          correta: 1,
          explicacao: "Superdimensionar e não medir custam dinheiro e eficiência; improvisar pressão sem segurança custa vidas. A segurança não é opcional.",
        },
      ],
    },
    {
      id: "plano-de-acao",
      titulo: "Monte o seu projeto",
      blocos: [
        { tipo: "texto", texto: "Hora de juntar tudo num plano de uma página, na ordem do caderno: qual resíduo e quanto, qual modelo e regime, volume do reator, uso pretendido do gás e do biofertilizante, dispositivos de segurança, profissionais a mobilizar e quem cuida. Um plano honesto já mostra se o projeto fecha — e protege a comunidade de comprar algo que não vai operar." },
        {
          tipo: "tarefas",
          itens: [
            { id: "plano-biogas", titulo: "Plano de biogás da comunidade", entrega: "Em uma página: resíduo (kg/dia), modelo, volume, TRH, uso do gás, uso do biofertilizante, itens de segurança e profissionais a mobilizar. Cole o resultado aqui." },
            { id: "metas-medicao", titulo: "Defina o que vai medir", entrega: "Liste os indicadores que vai acompanhar (gás/dia, temperatura, pH, horas de fogão, economia de GLP) e como vai registrar." },
          ],
        },
      ],
    },
    {
      id: "glossario",
      titulo: "Glossário de campo",
      blocos: [
        { tipo: "texto", texto: "Digestão anaeróbia: decomposição da matéria orgânica sem oxigênio. Biogás: mistura de CH4 + CO2 + traços gerada nessa decomposição. Biometano: biogás purificado, rico em metano. Digestato/biofertilizante: material digerido que sai do reator. TRH: tempo de retenção hidráulica (dias dentro do reator). ST/SV: sólidos totais/voláteis. C/N: relação carbono-nitrogênio. Metanogênese: fase final que produz metano. Inóculo: 'semente' de bactérias para a partida." },
      ],
    },
    {
      id: "checklist-final",
      titulo: "Checklist antes de dar a partida",
      blocos: [
        { tipo: "texto", texto: "Revise tudo antes de introduzir o substrato: resíduo e receita definidos, reator dimensionado, base impermeável e nivelada, teste de estanqueidade aprovado, filtro de H2S e dreno instalados, dispositivos de segurança no lugar, inóculo pronto, diário de operação criado, responsáveis combinados e profissionais mobilizados onde o caderno marcou. Risco controlado é projeto que dura." },
        {
          tipo: "tarefas",
          itens: [
            { id: "checklist-partida", titulo: "Checklist de partida assinado", entrega: "Marque cada item (resíduo, dimensionamento, estanqueidade, H2S, segurança, inóculo, diário, responsáveis, profissionais) e só dê a partida com todos ok. Cole o checklist preenchido." },
          ],
        },
      ],
    },
    // ===================== SÍNTESE =====================
    {
      id: "compilado",
      titulo: "Prancha de síntese",
      blocos: [
        { tipo: "texto", texto: "Arraste os cards pelo carimbo para montar a jornada do seu projeto — da bioquímica das quatro fases ao fogão aceso, passando por cálculo, obra, segurança e uso do biofertilizante. Abaixo da prancha, suas anotações, inventários, croquis e checklists aparecem na ordem das páginas, prontos para virar o projeto real de biogás da sua comunidade." },
        { tipo: "compilado" },
      ],
    },
  ],
};
