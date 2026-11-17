import type { CadernoEstudo } from "../cadernosEstudo";

/**
 * Caderno de campo: "Comedouros para animais: ergonomia, higiene e desperdício".
 * Do cocho de concreto ao prato automático: por que o comedouro decide quanto o
 * animal come, quanto adoece e quanto se perde no chão. Leitura do rebanho,
 * ergonomia (altura, borda, espaço linear), higiene (contaminação e micotoxinas),
 * medição do desperdício, projeto por espécie, execução, manutenção e casos reais.
 * Todo número, técnica, norma e desenho tem lastro em fonte verificada — ver as
 * páginas "fontes" ao longo do caderno (Embrapa, MAPA, FAO, WOAH, legislação).
 */
export const caderno: CadernoEstudo = {
  id: "comedouros",
  titulo: "Comedouros para animais: ergonomia, higiene e desperdício",
  resumo:
    "Como projetar, construir e manter comedouros que fazem o animal comer bem, sem sujeira e sem desperdício: ergonomia por espécie, higiene contra micotoxinas, medição da sobra, projeto de cocho/prato/tubular, execução, manutenção e casos reais — com fontes verificadas.",
  paginas: [
    // ============================== CONTEXTO ==============================
    {
      id: "abertura",
      titulo: "O comedouro decide a fazenda",
      blocos: [
        { tipo: "texto", texto: "O comedouro parece um detalhe: uma calha, um tambor cortado, um prato de plástico. Mas é nele que se decide quase tudo. É ali que o animal transforma (ou não) ração em carne, leite e ovo; é ali que uma sujeira entra na boca de cem animais ao mesmo tempo; e é ali, no chão em volta, que o dinheiro escorre em forma de ração pisada. Um comedouro mal pensado não aparece numa foto — aparece no fim do mês, no custo e na sanidade do lote." },
        { tipo: "texto", texto: "Este caderno trata o comedouro por três eixos inseparáveis. ERGONOMIA: o animal alcança, não se machuca, não briga, come na postura certa. HIGIENE: não cai fezes dentro, a ração não mofa, a limpeza é possível. DESPERDÍCIO: o que entra no comedouro vira alimento, não lixo no barro. Mexer num eixo mexe nos outros — borda baixa demais poupa o pescoço (ergonomia) mas deixa a ração espalhar (desperdício) e sujar (higiene). O projeto é um equilíbrio, e este caderno ensina a encontrá-lo." },
        { tipo: "video", titulo: "Comedouro na fase adulta — Embrapa Suínos e Aves", youtube: "dHPOpSFcqWo" },
        {
          tipo: "prancha",
          titulo: "Anatomia de um cocho: o que cada medida resolve",
          desenho: {
            legenda: "Corte de um cocho. Borda (B), profundidade (P), fundo arredondado (F), altura do piso ao fundo (A). Cada cota resolve um eixo.",
            primitivas: [
              { t: "linha", de: [40, 70], ate: [40, 130], cor: "tinta" },
              { t: "linha", de: [40, 130], ate: [90, 155], cor: "tinta" },
              { t: "curva", pts: [[90, 155], [150, 165], [210, 155]], cor: "tinta" },
              { t: "linha", de: [210, 155], ate: [260, 130], cor: "tinta" },
              { t: "linha", de: [260, 70], ate: [260, 130], cor: "tinta" },
              { t: "linha", de: [40, 130], ate: [260, 130], cor: "suave" },
              { t: "rotulo", p: [30, 95], texto: "B borda" },
              { t: "rotulo", p: [150, 120], texto: "P prof." },
              { t: "rotulo", p: [135, 172], texto: "F fundo arredondado" },
              { t: "linha", de: [285, 130], ate: [285, 185], cor: "destaque" },
              { t: "rotulo", p: [255, 185], texto: "A altura ao piso" },
              { t: "linha", de: [40, 185], ate: [260, 185], cor: "suave" },
            ],
          },
        },
      ],
    },
    {
      id: "tres-eixos",
      titulo: "Os três eixos e como eles brigam entre si",
      blocos: [
        { tipo: "texto", texto: "Antes de desenhar qualquer coisa, grave o mapa das tensões. Toda decisão de comedouro empurra os três eixos ao mesmo tempo, e quase sempre em direções opostas. O bom projeto não 'resolve' um eixo — ele acha o ponto em que os três ficam aceitáveis para a sua espécie, categoria e bolso." },
        { tipo: "diagrama", titulo: "Os três eixos do comedouro", codigo: `flowchart TD
  C["Decisao de projeto"] --> E["Ergonomia: alcanca? postura? briga?"]
  C --> H["Higiene: suja? mofa? da pra limpar?"]
  C --> D["Desperdicio: cai no chao? seleciona? fermenta?"]
  E --> B["Equilibrio para a especie"]
  H --> B
  D --> B
  B --> R["Mais consumo, menos doenca, menos perda"]` },
        { tipo: "texto", texto: "Exemplo da briga: aumentar a borda do cocho segura a ração (menos desperdício) mas força o pescoço do animal e reduz o consumo (pior ergonomia). Abrir o fundo deixa limpar fácil (higiene) mas espalha a ração (desperdício). Elevar o comedouro do chão impede a contaminação por fezes (higiene) mas pode deixar o filhote sem alcance (ergonomia). Você vai ver esse trio o caderno inteiro." },
        {
          tipo: "licao",
          pergunta: "Por que não existe 'o comedouro perfeito' universal?",
          alternativas: [
            "Porque todo comedouro é igual, só muda a cor",
            "Porque ergonomia, higiene e desperdício se puxam em direções opostas e o equilíbrio muda com espécie, idade e manejo",
            "Porque o animal não liga para o comedouro",
          ],
          correta: 1,
          explicacao: "Os três eixos são conflitantes. O projeto certo é o que equilibra os três para aquela espécie, categoria e sistema — não há um número único que sirva para tudo.",
        },
      ],
    },
    {
      id: "bem-estar",
      titulo: "Alimento é bem-estar (e é lei)",
      blocos: [
        { tipo: "texto", texto: "O acesso adequado ao alimento não é só economia: é bem-estar animal, e no Brasil tem respaldo legal. A referência internacional são as 'cinco liberdades', e a primeira delas é 'livre de fome, sede e má nutrição' — ou seja, acesso pronto à água fresca e a uma dieta que mantenha saúde e vigor. A WOAH (Organização Mundial da Saúde Animal) consolida padrões de bem-estar que os países adotam, inclusive o acesso ao alimento como um dos pilares." },
        { tipo: "texto", texto: "No Brasil, maus-tratos a animais é crime: a Lei 9.605/1998 (crimes ambientais), no Art. 32, pune abuso e maus-tratos a animais domésticos ou domesticados. Privar de alimento ou água, ou manter o animal em condição que impeça a alimentação, pode se enquadrar. Um comedouro que não dá acesso — porque é alto demais, briga demais, ou está sempre vazio e sujo — não é apenas um erro técnico: é um risco de bem-estar e legal." },
        {
          tipo: "fontes",
          titulo: "Bem-estar e base legal",
          itens: [
            { titulo: "WOAH — Codes and Manuals (padrões de saúde e bem-estar animal)", url: "https://www.woah.org/en/what-we-do/standards/codes-and-manuals/terrestrial-code-online-access/", tipo: "norma", nota: "O Terrestrial Animal Health Code traz os capítulos de bem-estar animal adotados globalmente." },
            { titulo: "Lei nº 9.605/1998 — crimes ambientais (Art. 32, maus-tratos)", url: "https://www.planalto.gov.br/ccivil_03/leis/l9605.htm", tipo: "norma", nota: "Pune abuso e maus-tratos a animais domésticos/domesticados; detenção + multa." },
            { titulo: "FAO — Animal Production (nutrição e alimentação animal)", url: "https://www.fao.org/animal-production/en/", tipo: "site", nota: "Órgão da ONU para sistemas de produção animal sustentáveis, inclui nutrição e alimentação." },
          ],
        },
      ],
    },
    {
      id: "custo-desperdicio",
      titulo: "O custo invisível: ração no chão",
      blocos: [
        { tipo: "texto", texto: "A alimentação costuma ser o maior custo da produção animal — na pecuária intensiva e na avicultura/suinocultura, a dieta responde por uma fatia que vai de cerca de 60% a 80% do custo total. Isso muda a conta do desperdício: cada 5% de ração que o comedouro deixa cair, mofar ou o animal selecionar e jogar fora não é '5% de uma despesa pequena' — é 5% da MAIOR despesa da fazenda. Em um lote grande, isso paga o comedouro novo em poucos meses." },
        { tipo: "texto", texto: "O desperdício tem quatro bocas: (1) RESPINGO — ração que salta para fora quando o animal mergulha a cabeça ou empurra; (2) SELEÇÃO — o animal fuça e joga para o lado o que não quer, e o que cai no chão vira perda; (3) VARREDURA — sobra velha que precisa ser retirada e descartada; (4) FERMENTAÇÃO/MOFO — ração molhada ou acumulada que estraga. Projeto e manejo atacam as quatro." },
        { tipo: "diagrama", titulo: "As quatro bocas do desperdício", codigo: `flowchart LR
  R["Racao no comedouro"] --> S["Respingo para fora"]
  R --> SE["Selecao / fuca e descarta"]
  R --> V["Varredura / sobra velha"]
  R --> F["Fermentacao / mofo"]
  S --> P["Perda de dinheiro + sujeira"]
  SE --> P
  V --> P
  F --> P` },
        {
          tipo: "fontes",
          titulo: "Resíduo e aproveitamento",
          itens: [
            { titulo: "Lei nº 12.305/2010 — Política Nacional de Resíduos Sólidos", url: "https://www.planalto.gov.br/ccivil_03/_ato2007-2010/2010/lei/l12305.htm", tipo: "norma", nota: "Hierarquia: não geração e redução vêm antes de tudo. Ração desperdiçada é resíduo evitável." },
          ],
        },
      ],
    },
    // ======================= LEITURA DO LOCAL / TEMA =======================
    {
      id: "quem-come",
      titulo: "Ler o rebanho: quem vai comer aqui",
      blocos: [
        { tipo: "texto", texto: "Não existe comedouro 'de animal'. Existe comedouro de vaca adulta, de bezerro, de porca em gestação, de leitão desmamado, de frango de corte com 7 dias, de galinha poedeira, de ovelha, de cabrito. Cada um tem boca, altura, força e jeito de comer diferentes. O primeiro trabalho de campo é ler o rebanho: espécie, categoria (idade/fase), número de animais e como estão agrupados." },
        { tipo: "texto", texto: "Anote quatro coisas por grupo: quantos animais vão comer no mesmo comedouro; qual a altura do ombro/cernelha (define a altura da borda); se comem todos juntos (trato racionado, exige espaço para todos) ou ao longo do dia (ad libitum, exige menos espaço mas comida sempre presente); e qual o alimento (volumoso, concentrado, ração farelada, peletizada, úmida). Esses quatro dados comandam o projeto inteiro." },
        {
          tipo: "tarefas",
          itens: [
            { id: "censo", titulo: "Faça o censo do comedouro", entrega: "Para cada grupo de animais, anote: espécie, categoria, número de cabeças, altura aproximada do ombro e tipo de alimento. Uma linha por grupo." },
            { id: "regime", titulo: "Classifique o regime de trato", entrega: "Marque cada grupo como 'todos comem juntos' (racionado) ou 'comida sempre disponível' (ad libitum). Esse dado define quanto espaço linear você precisa." },
          ],
        },
      ],
    },
    {
      id: "comportamento",
      titulo: "Como cada espécie come",
      blocos: [
        { tipo: "texto", texto: "O comedouro tem que respeitar o gesto natural de comer. O BOVINO envolve o alimento com a língua e puxa — precisa de espaço para a língua e de uma borda que não corte o movimento. O SUÍNO fuça: empurra o focinho e revolve, o que espalha ração seca; por isso comedouros de suíno costumam ser fundos, com anteparo, ou do tipo seco-úmido. A AVE bica de cima para baixo, com movimento rápido e repetido; perde muito se o comedouro estiver cheio até a borda (a bicada joga para fora)." },
        { tipo: "texto", texto: "Há também a hierarquia social. Em bovinos e suínos, animais dominantes expulsam os submissos do comedouro. Se não há espaço (ou boca) para todos, os dominados comem menos, crescem desigual e o lote fica desuniforme. Divisórias entre lugares (headlocks, baias de alimentação, comedouro privativo) reduzem a briga e uniformizam o consumo. Em aves, o problema não é briga de um a um, mas acesso: comedouro de menos faz as últimas aves nunca alcançarem." },
        { tipo: "video", titulo: "Esta es la manera correcta de tener comederos para tu ganado", youtube: "s3wZ80R3R-Q" },
        {
          tipo: "licao",
          pergunta: "Por que comedouro de ave NÃO deve ficar cheio até a borda?",
          alternativas: [
            "Porque a ave come pouco",
            "Porque a bicada de cima para baixo joga a ração para fora quando o nível está alto; encher só até ~1/3 reduz muito o desperdício",
            "Porque encher gasta mais tempo",
          ],
          correta: 1,
          explicacao: "A ave bica para baixo. Com o comedouro muito cheio, cada bicada ejeta grão para fora. Regular o nível para cerca de um terço da altura do prato corta o desperdício sem faltar comida.",
        },
      ],
    },
    {
      id: "diagnostico-atual",
      titulo: "Diagnóstico do comedouro que você já tem",
      blocos: [
        { tipo: "texto", texto: "Antes de construir, audite o que existe. A maioria das fazendas tem comedouros — o problema raramente é 'não ter', é 'ter errado'. Faça uma volta com os olhos nos três eixos. Ergonomia: o menor animal alcança? O maior cabe sem se machucar? Todos comem ao mesmo tempo sem briga? Higiene: há fezes dentro? A ração do fundo está mofada? Dá para esvaziar e lavar? Desperdício: tem ração no chão em volta? Sobra velha endurecida? Chuva entra?" },
        {
          tipo: "prancha",
          titulo: "Rota de inspeção dos 3 eixos",
          desenho: {
            legenda: "Ande em volta do comedouro e marque os três eixos. Um X em qualquer um já justifica a intervenção.",
            primitivas: [
              { t: "retangulo", p: [100, 80], w: 100, h: 40, cor: "tinta" },
              { t: "rotulo", p: [118, 104], texto: "COMEDOURO" },
              { t: "circulo", c: [60, 50], r: 16, cor: "destaque" },
              { t: "rotulo", p: [45, 54], texto: "ERGO" },
              { t: "circulo", c: [240, 50], r: 16, cor: "destaque" },
              { t: "rotulo", p: [228, 54], texto: "HIGI" },
              { t: "circulo", c: [150, 160], r: 16, cor: "destaque" },
              { t: "rotulo", p: [137, 164], texto: "DESP" },
              { t: "seta", de: [60, 66], ate: [110, 85], cor: "suave" },
              { t: "seta", de: [240, 66], ate: [190, 85], cor: "suave" },
              { t: "seta", de: [150, 144], ate: [150, 122], cor: "suave" },
            ],
          },
        },
        {
          tipo: "tarefas",
          itens: [
            { id: "foto-chao", titulo: "Fotografe o chão em volta", entrega: "Tire uma foto do solo ao redor do comedouro antes do trato e outra 2 h depois. Ração visível no chão = desperdício medível. Guarde como linha de base." },
            { id: "cheirar-fundo", titulo: "Cheire e revolva o fundo", entrega: "Com luva, revolva o fundo do comedouro. Cheiro de mofo, bolor ou crosta endurecida = problema de higiene e de manejo de sobra. Anote em quantos comedouros isso aparece." },
          ],
        },
      ],
    },
    {
      id: "dados-sinais",
      titulo: "Os sinais que o lote e a sobra dão",
      blocos: [
        { tipo: "texto", texto: "O comedouro fala. Aprenda a ler dois sinais baratos. O primeiro é a SOBRA (leitura de cocho / bunk score): quanto alimento restou antes do próximo trato. Pouca ou nenhuma sobra pode significar que faltou (animal com fome, ou dominados sem acesso); muita sobra significa trato em excesso, alimento ruim, ou comedouro com problema. Em confinamento, zootecnistas usam uma escala de escore de cocho (de 0 = limpo a 4 = quase cheio) para ajustar a quantidade do dia seguinte." },
        { tipo: "texto", texto: "O segundo sinal é a UNIFORMIDADE do lote. Animais de tamanhos muito diferentes dentro do mesmo grupo denunciam acesso desigual ao comedouro: os dominantes comem, os dominados não. Pese ou avalie por escore corporal uma amostra; se a variação é grande, falta espaço linear ou boca de comedouro. Esses dois sinais, anotados toda semana, valem mais que qualquer palpite." },
        { tipo: "diagrama", titulo: "Leitura de cocho decide o trato", codigo: `flowchart TD
  M["Manha: ler a sobra do cocho"] --> E{"Escore?"}
  E -->|"0 limpo / lambeu"| A["Pode faltar: subir um pouco"]
  E -->|"1 a 2 fino"| B["Ideal: manter"]
  E -->|"3 a 4 sobra alta"| C["Excesso ou problema: baixar / investigar"]
  A --> T["Ajusta trato do dia"]
  B --> T
  C --> T` },
        {
          tipo: "fontes",
          titulo: "Ler consumo e comedouro",
          itens: [
            { titulo: "Embrapa — Evaluation of an automatic feed bunk for measuring starter intake in calves", url: "https://www.embrapa.br/busca-de-publicacoes/-/publicacao/1172208/evaluation-of-an-automatic-feed-bunk-for-measuring-starter-intake-in-days-calves", tipo: "artigo", nota: "Cocho automático que mede o consumo individual — a tecnologia de ler o comedouro." },
          ],
        },
      ],
    },
    // ===================== MÉTODO / PRINCÍPIOS =====================
    {
      id: "ergonomia-principios",
      titulo: "Ergonomia: altura, borda, profundidade",
      blocos: [
        { tipo: "texto", texto: "Ergonomia de comedouro é geometria do pescoço. Quatro medidas mandam. ALTURA DO FUNDO AO PISO: alta demais e o animal baixo não alcança; baixa demais e vira depósito de sujeira. Regra geral: o animal come confortável quando a borda fica na altura do peito/escápula, não acima da cabeça. BORDA (altura da parede do comedouro): segura a ração, mas se for alta demais corta o movimento e reduz consumo. PROFUNDIDADE: fundo raso espalha, fundo fundo demais faz o animal bater o focinho. LARGURA/ESPAÇO LINEAR: o lugar que cada cabeça ocupa." },
        { tipo: "texto", texto: "O fundo arredondado (em U, não em V nem quadrado) é um truque que resolve dois eixos: o animal alcança a última porção (menos desperdício) e não fica canto parado para acumular sujeira e mofo (melhor higiene). Bordas lisas, sem quina viva, evitam ferir a boca e são mais fáceis de lavar. Uma aba interna virada para dentro, no topo da borda, devolve para o cocho a ração que o animal empurraria para fora." },
        {
          tipo: "prancha",
          titulo: "Três perfis de fundo: U vence",
          desenho: {
            legenda: "Fundo em V (bate o focinho), quadrado (acumula canto) e em U (alcança tudo, limpa fácil). O U equilibra os três eixos.",
            primitivas: [
              { t: "rotulo", p: [35, 45], texto: "V" },
              { t: "linha", de: [30, 60], ate: [55, 110], cor: "tinta" },
              { t: "linha", de: [80, 60], ate: [55, 110], cor: "tinta" },
              { t: "rotulo", p: [128, 45], texto: "Quadrado" },
              { t: "linha", de: [120, 60], ate: [120, 110], cor: "tinta" },
              { t: "linha", de: [120, 110], ate: [170, 110], cor: "tinta" },
              { t: "linha", de: [170, 60], ate: [170, 110], cor: "tinta" },
              { t: "rotulo", p: [228, 45], texto: "U (melhor)" },
              { t: "linha", de: [215, 60], ate: [215, 90], cor: "destaque" },
              { t: "curva", pts: [[215, 90], [245, 112], [275, 90]], cor: "destaque" },
              { t: "linha", de: [275, 60], ate: [275, 90], cor: "destaque" },
              { t: "rotulo", p: [95, 135], texto: "bate focinho / acumula canto / alcanca e limpa" },
            ],
          },
        },
      ],
    },
    {
      id: "espaco-linear",
      titulo: "Espaço linear e boca por cabeça",
      blocos: [
        { tipo: "texto", texto: "Aqui mora o erro mais caro: comedouro de menos. O espaço necessário depende do regime. Se TODOS comem ao mesmo tempo (trato racionado, uma vez ao dia), cada animal precisa do seu lugar inteiro na linha — para bovino adulto de corte isso fica tipicamente na faixa de 50 a 70 cm de cocho por cabeça; vaca de leite em cocho com trava individual (headlock), em torno de 60 a 70 cm. Se a comida fica SEMPRE disponível (ad libitum), os animais se revezam e o espaço por cabeça cai bastante (em confinamento de corte, costuma-se trabalhar com faixas bem menores, por rodízio)." },
        { tipo: "texto", texto: "Em AVES e SUÍNOS, pensa-se em 'boca' ou 'lugar' por número de animais, não em centímetros por cabeça. Frango de corte com comedouro tubular: cada prato tubular costuma atender algumas dezenas de aves (a referência de manejo fica na casa de uma unidade para cada 40 a 70 aves, conforme idade e o manual da linhagem); em comedouro linear, pensa-se em poucos centímetros de calha por ave. Suíno em terminação com comedouro à vontade: cada boca/espaço atende tipicamente de 10 a 15 animais. Sempre confira o manual da linhagem/genética — ele traz o número oficial." },
        { tipo: "video", titulo: "Cómo hacer comederos eficientes para el ganado", youtube: "iza_3FFGTTo" },
        {
          tipo: "licao",
          pergunta: "No trato racionado (todos comem juntos, uma vez ao dia), por que o espaço por cabeça é MAIOR que no ad libitum?",
          alternativas: [
            "Porque o animal come mais rápido",
            "Porque todos chegam ao comedouro ao mesmo tempo e cada um precisa do seu lugar; no ad libitum eles se revezam ao longo do dia",
            "Porque a ração é diferente",
          ],
          correta: 1,
          explicacao: "No racionado não há revezamento: todos comem na mesma janela. Falta de espaço aí deixa os dominados de fora. No ad libitum, com comida sempre presente, o rodízio reduz o espaço necessário por cabeça.",
        },
      ],
    },
    {
      id: "higiene-principios",
      titulo: "Higiene: o comedouro como porta de doença",
      blocos: [
        { tipo: "texto", texto: "O comedouro é um ponto de contato coletivo: cem bocas no mesmo lugar. Se entra fezes, saliva doente, ou roedor, ele vira rota de contágio. Três inimigos: CONTAMINAÇÃO FECAL (animal sobe, defeca dentro, ou fezes respingam de um comedouro baixo demais) — espalha verminose, coccidiose, salmonela; MOFO E MICOTOXINAS (ração úmida e sobra parada criam fungos que produzem toxinas, como aflatoxina, que intoxicam e derrubam o desempenho); PRAGAS (ratos, pássaros e insetos atraídos pela sobra, que comem, sujam e contaminam)." },
        { tipo: "texto", texto: "O projeto higiênico ataca na origem: elevar o comedouro do chão o bastante para fezes não entrarem; fundo arredondado e material liso (concreto polido, PEAD, inox) para esvaziar e lavar sem canto; cobertura para a chuva não molhar a ração; e dimensionar a sobra para que ela seja pequena e rotativa — ração parada é ração que mofa. Comedouro que não dá para limpar é comedouro que adoece o lote, não importa quão bonito seja." },
        {
          tipo: "fontes",
          titulo: "Sanidade e alimentação animal",
          itens: [
            { titulo: "MAPA — Produtos para Alimentação Animal (registro, aditivos, fiscalização)", url: "https://www.gov.br/agricultura/pt-br/assuntos/insumos-agropecuarios/insumos-pecuarios/alimentacao-animal", tipo: "norma", nota: "Marco regulatório de rações, aditivos e boas práticas de fabricação/manuseio no Brasil." },
            { titulo: "Embrapa Suínos e Aves — unidade de referência em sanidade", url: "https://www.embrapa.br/suinos-e-aves", tipo: "site", nota: "Pesquisa em manejo, instalações e sanidade de suínos e aves." },
          ],
        },
      ],
    },
    {
      id: "desperdicio-fisica",
      titulo: "A física do desperdício",
      blocos: [
        { tipo: "texto", texto: "Desperdício não é azar, é física — e por isso se controla. RESPINGO: quanto mais cheio e mais alto o nível no comedouro, mais ração salta quando o animal mergulha a cabeça ou a ave bica. Solução: regular o nível baixo (ex.: 1/3 do prato) e usar aba interna. SELEÇÃO: ração farelada deixa o animal separar o que quer do que não quer, jogando o fino para o lado; peletizar ou umedecer reduz a seleção. VARREDURA: dimensionar a porção para sobrar pouco, e retirar a sobra antes de mofar." },
        { tipo: "texto", texto: "Há um número que vale ouro: a 'altura de ração' no comedouro. Comedouros tubulares de aves e tolvas de suíno têm regulagem; apertar essa regulagem para que caia MENOS ração por vez (lâmina fina no prato) derruba o desperdício sem passar fome ao animal, porque repõe sozinho conforme come. Muitos produtores perdem porcentos de ração só por deixar a tolva aberta demais 'para não faltar' — e o que não falta é ração no chão." },
        { tipo: "video", titulo: "Cocho comedouro automático (CCA) — reposição controlada", youtube: "l0fSV5eyWbo" },
        {
          tipo: "prancha",
          titulo: "Nível baixo vence nível cheio",
          desenho: {
            legenda: "Mesmo prato, dois níveis. Cheio ejeta na bicada/mergulho; nível a ~1/3 segura a ração dentro.",
            primitivas: [
              { t: "curva", pts: [[40, 90], [75, 120], [110, 90]], cor: "tinta" },
              { t: "linha", de: [40, 70], ate: [40, 92], cor: "tinta" },
              { t: "linha", de: [110, 70], ate: [110, 92], cor: "tinta" },
              { t: "linha", de: [45, 78], ate: [105, 78], cor: "destaque" },
              { t: "rotulo", p: [48, 140], texto: "CHEIO: respinga" },
              { t: "seta", de: [75, 75], ate: [120, 60], cor: "destaque" },
              { t: "curva", pts: [[190, 90], [225, 120], [260, 90]], cor: "tinta" },
              { t: "linha", de: [190, 70], ate: [190, 92], cor: "tinta" },
              { t: "linha", de: [260, 70], ate: [260, 92], cor: "tinta" },
              { t: "linha", de: [198, 108], ate: [252, 108], cor: "suave" },
              { t: "rotulo", p: [196, 140], texto: "1/3: segura" },
            ],
          },
        },
      ],
    },
    // ===================== CÁLCULO / MEDIÇÃO =====================
    {
      id: "medir-espaco",
      titulo: "Calcular o espaço de cocho que você precisa",
      blocos: [
        { tipo: "texto", texto: "A conta do espaço linear, para trato racionado (todos comem juntos), é direta: COMPRIMENTO DE COCHO = número de cabeças x espaço por cabeça. Se você tem 40 novilhas de corte e usa a referência de 0,60 m por cabeça, precisa de 40 x 0,60 = 24 m de cocho — podendo ser dos dois lados de uma linha central (12 m de linha, acesso duplo). Se o cocho é de um lado só, precisa dos 24 m lineares. Subdimensionar aqui é a causa número um de lote desuniforme." },
        { tipo: "diagrama", titulo: "Fluxo do dimensionamento", codigo: `flowchart TD
  N["Numero de cabecas no grupo"] --> R{"Regime de trato"}
  R -->|"Racionado: todos juntos"| E["Espaco/cabeca cheio (ex.: bovino 0,5 a 0,7 m)"]
  R -->|"Ad libitum: comida sempre"| A["Espaco/cabeca menor (rodizio)"]
  E --> C["Comprimento = cabecas x espaco"]
  A --> C
  C --> L{"Acesso de 1 ou 2 lados?"}
  L -->|"2 lados"| D["Linha = comprimento / 2"]
  L -->|"1 lado"| U["Linha = comprimento"]` },
        {
          tipo: "tarefas",
          itens: [
            { id: "calc-cocho", titulo: "Calcule o seu cocho", entrega: "Pegue o maior grupo que come junto. Multiplique nº de cabeças pela referência de espaço/cabeça da sua espécie. Compare com o cocho que existe hoje. Anote o déficit (ou a folga) em metros." },
            { id: "boca-aves", titulo: "Conte as bocas (aves/suínos)", entrega: "Para aviário/baia, divida o número de animais pela referência de animais por prato/boca do manual da linhagem. Veja se o número de comedouros instalados bate. Anote quantos faltam." },
          ],
        },
      ],
    },
    {
      id: "medir-desperdicio",
      titulo: "Medir o desperdício (sem isso, é achismo)",
      blocos: [
        { tipo: "texto", texto: "Você não melhora o que não mede. Há um teste de campo simples para o desperdício de comedouro: durante um dia, pese tudo que entra no comedouro (ração ofertada) e, no dia seguinte antes do novo trato, recolha e pese a sobra de dentro MAIS o que caiu no chão em volta (estenda uma lona embaixo para capturar). DESPERDÍCIO (%) = (ração no chão + sobra estragada) dividido pela ração ofertada, vezes 100. Faça antes e depois de qualquer mudança — é a prova de que valeu a pena." },
        { tipo: "texto", texto: "Guarde também a sobra APROVEITÁVEL separada da PERDIDA. Sobra limpa e seca pode voltar ao trato; sobra molhada, mofada ou misturada com fezes é perda e risco — vai fora. Registrar as duas em planilha, por semana, transforma 'acho que está melhor' em número. Uma queda de desperdício de, digamos, 8% para 3% numa fazenda onde a ração é 70% do custo é uma economia que se enxerga no caixa." },
        {
          tipo: "prancha",
          titulo: "Teste da lona: capturar o que cai",
          desenho: {
            legenda: "Lona sob o comedouro captura o respingo e a varredura. Pesar a lona + sobra interna = desperdício do dia.",
            primitivas: [
              { t: "retangulo", p: [110, 60], w: 90, h: 30, cor: "tinta" },
              { t: "rotulo", p: [128, 80], texto: "COMEDOURO" },
              { t: "linha", de: [60, 150], ate: [250, 150], cor: "destaque" },
              { t: "curva", pts: [[60, 150], [155, 165], [250, 150]], cor: "destaque" },
              { t: "rotulo", p: [95, 180], texto: "LONA (pesa o que caiu)" },
              { t: "seta", de: [130, 92], ate: [120, 148], cor: "suave" },
              { t: "seta", de: [180, 92], ate: [190, 148], cor: "suave" },
            ],
          },
        },
      ],
    },
    {
      id: "medir-altura",
      titulo: "Medir e ajustar a altura por categoria",
      blocos: [
        { tipo: "texto", texto: "A altura do comedouro não é fixa: muda com o animal. Um comedouro ótimo para a vaca adulta é alto demais para o bezerro; a tolva regulada para o frango adulto afoga o pintinho. Por isso dois princípios: ou o comedouro é regulável em altura (cordas/correntes nos tubulares de aves que sobem conforme o lote cresce), ou cada categoria tem seu comedouro. Meça a altura do PEITO/ombro do menor animal do grupo: a borda do comedouro deve ficar por ali, nunca acima da linha das costas." },
        { tipo: "texto", texto: "Nos aviários, a regra de ouro dos comedouros e bebedouros tubulares/nipple é 'na linha do dorso': a altura sobe junto com o lote, a cada poucos dias, para a ave comer e beber na postura reta, sem respingar e sem precisar esticar. Deixar o comedouro baixo 'porque dá menos trabalho' enche a cama de ração e de água — desperdício e cama úmida (que gera amônia e doença de pata). Regular altura é trabalho barato que paga alto." },
        { tipo: "video", titulo: "Cocho automático para bovinos — regulagem", youtube: "wWzJraS5x9s" },
        {
          tipo: "licao",
          pergunta: "Qual a referência prática para a altura da borda do comedouro?",
          alternativas: [
            "Sempre 1 metro do chão, para qualquer animal",
            "Na altura do peito/ombro do menor animal do grupo, nunca acima da linha das costas",
            "O mais alto possível, para não sujar",
          ],
          correta: 1,
          explicacao: "A borda deve permitir comer na postura natural: altura do peito/ombro do menor animal. Acima da linha do dorso, o animal precisa esticar, come menos e respinga mais.",
        },
      ],
    },
    {
      id: "agua-junto",
      titulo: "Água: o comedouro do líquido",
      blocos: [
        { tipo: "texto", texto: "Não dá para falar de comedouro sem falar de bebedouro — o animal que não bebe não come. A água tem a mesma lógica dos três eixos: espaço/acesso para todos (ergonomia), limpeza frequente contra lodo e contaminação (higiene) e nível/regulagem contra transbordar e molhar a cama (desperdício). Um erro clássico: posicionar o bebedouro de modo que a água respingue ou escorra para dentro do comedouro de ração — isso cria exatamente o mofo que você quer evitar." },
        { tipo: "texto", texto: "Regras de campo: água fresca sempre disponível e perto do alimento, mas nunca de forma que contamine a ração; bebedouro na altura certa (como o comedouro, na linha do peito/dorso); e limpeza do bebedouro tão rotineira quanto a do comedouro — biofilme e algas no bebedouro reduzem o consumo de água e, por tabela, o de ração. Em bovinos a pasto, o posicionamento da água em relação ao cocho de sal/suplemento define se o animal usa bem o suplemento." },
        { tipo: "video", titulo: "Manejo da água para bovinos de corte e de leite — Dia de Campo na TV (Embrapa)", youtube: "p-2xbYexFaE" },
        {
          tipo: "fontes",
          titulo: "Água e consumo",
          itens: [
            { titulo: "Embrapa Gado de Leite — manejo e instalações", url: "https://www.embrapa.br/gado-de-leite", tipo: "site", nota: "Unidade de referência em produção leiteira, inclui manejo de alimentação e água." },
          ],
        },
      ],
    },
    // ============================== PROJETO ==============================
    {
      id: "tipos-comedouro",
      titulo: "O catálogo: tipos de comedouro",
      blocos: [
        { tipo: "texto", texto: "Antes de projetar, conheça o catálogo e para que serve cada um. COCHO LINEAR (concreto/madeira): bovinos, ovinos; volumoso e concentrado; acesso de um ou dois lados. CANOA/MEIA-MANILHA ou TAMBOR CORTADO: barato, bovinos no pasto; cuidado com borda cortante e fundo que acumula. TOLVA / SELF-FEEDER (autoconsumo): reservatório que repõe sozinho; ração seca para bovinos, suínos e aves; ótimo para ad libitum, exige regulagem fina contra desperdício." },
        { tipo: "texto", texto: "COMEDOURO SECO-ÚMIDO (suínos): combina ração seca e água no ponto de consumo, reduz pó e desperdício. PRATO/TUBULAR (aves e suínos): reservatório central que cai num prato; regulável em altura e em vazão. LINEAR AUTOMÁTICO COM CORRENTE/ROSCA (aviários): distribui ração por toda a linha. COMEDOURO SELETIVO/PRIVATIVO (creep feeding): abertura que só o filhote (cordeiro, leitão, bezerro) passa, para suplementar sem a mãe comer junto. Cada um tem o seu ponto ideal — e o seu jeito de desperdiçar." },
        { tipo: "diagrama", titulo: "Escolher o tipo pelo uso", codigo: `flowchart TD
  Q["O que preciso?"] --> V{"Alimento e regime"}
  V -->|"Volumoso, racionado, bovino"| C["Cocho linear"]
  V -->|"Concentrado ad libitum"| T["Tolva / self-feeder"]
  V -->|"Suino, menos po"| SU["Seco-umido"]
  V -->|"Aves em galpao"| P["Prato tubular ou linear automatico"]
  V -->|"So o filhote deve comer"| S["Comedouro seletivo / privativo"]` },
        {
          tipo: "fontes",
          titulo: "Soluções de comedouro (Embrapa)",
          itens: [
            { titulo: "Embrapa — Cocho móvel para volumoso 'tipo trenó': prático e resistente", url: "https://www.embrapa.br/busca-de-publicacoes/-/publicacao/47199/cocho-movel-para-volumoso-tipo-treno-pratico-e-resistente", tipo: "artigo", nota: "Folder com esquema de montagem de um cocho-trenó durável para bovinos." },
          ],
        },
      ],
    },
    {
      id: "cocho-bovino",
      titulo: "Projeto: cocho para bovinos",
      blocos: [
        { tipo: "texto", texto: "O cocho de bovino clássico é uma calha de concreto (ou pré-moldado) com fundo em U, borda lisa, levemente elevada do piso para não entrar fezes, e com uma plataforma de concreto na área de alimentação (o animal pisa em piso firme, não em lama, e o cocho não afunda). Dimensões típicas de trabalho: borda externa (lado do animal) na altura do peito; profundidade suficiente para o volumoso; fundo arredondado. A aba superior virada para dentro devolve a ração empurrada." },
        {
          tipo: "prancha",
          titulo: "Cocho de bovino em corte (cotas)",
          desenho: {
            legenda: "Cocho de concreto, fundo em U, borda na linha do peito, piso firme na área de alimentação e leve caimento para drenar a lavagem.",
            primitivas: [
              { t: "linha", de: [50, 70], ate: [50, 120], cor: "tinta" },
              { t: "linha", de: [50, 120], ate: [95, 145], cor: "tinta" },
              { t: "curva", pts: [[95, 145], [150, 155], [205, 145]], cor: "tinta" },
              { t: "linha", de: [205, 145], ate: [250, 120], cor: "tinta" },
              { t: "linha", de: [250, 70], ate: [250, 120], cor: "tinta" },
              { t: "curva", pts: [[50, 70], [58, 64], [66, 72]], cor: "destaque" },
              { t: "rotulo", p: [20, 95], texto: "borda" },
              { t: "rotulo", p: [70, 60], texto: "aba p/ dentro" },
              { t: "linha", de: [250, 145], ate: [295, 145], cor: "suave" },
              { t: "rotulo", p: [255, 160], texto: "piso firme" },
              { t: "rotulo", p: [128, 135], texto: "fundo U" },
              { t: "seta", de: [300, 120], ate: [300, 150], cor: "suave" },
              { t: "rotulo", p: [262, 115], texto: "caimento" },
            ],
          },
        },
        { tipo: "video", titulo: "Conheça o cocho-trenó", youtube: "Vc-dlV_eZ6U" },
      ],
    },
    {
      id: "comedouro-suino",
      titulo: "Projeto: comedouro para suínos",
      blocos: [
        { tipo: "texto", texto: "O suíno fuça — esse é o fato que comanda o projeto. Comedouro de suíno à vontade usa tolva com reservatório e bocas na frente; a regulagem da abertura define quanto grão cai (apertada contra desperdício). O comedouro SECO-ÚMIDO, com um nipple de água junto do ponto de ração, é hoje referência para reduzir pó e desperdício e melhorar consumo. Divisórias entre bocas reduzem a briga e deixam o dominado comer. Material liso (inox, PEAD, concreto polido) para limpar." },
        { tipo: "texto", texto: "Dimensionamento por 'boca': cada espaço de alimentação atende um número de suínos conforme a fase (em terminação, à vontade, tipicamente de 10 a 15 animais por boca — confira o manual da genética e a recomendação do seu técnico). Bordas e anteparos impedem o animal de 'varrer' a ração para fora com o focinho. Altura da boca ajustada à fase: leitão recém-desmamado precisa de comedouro raso e baixo; terminação, mais robusto." },
        { tipo: "video", titulo: "Comedouro na fase adulta — Embrapa Suínos e Aves", youtube: "dHPOpSFcqWo" },
        {
          tipo: "licao",
          pergunta: "Por que o comedouro seco-úmido reduz desperdício em suínos?",
          alternativas: [
            "Porque é mais bonito",
            "Porque junta ração e água no ponto de consumo, reduzindo pó e o espalhamento da ração seca pelo focinho",
            "Porque o suíno come menos",
          ],
          correta: 1,
          explicacao: "No seco-úmido o animal umedece a ração ali mesmo: menos pó, menos seleção e menos ração varrida para fora — com bom consumo. A água, porém, precisa ser controlada para não transbordar.",
        },
      ],
    },
    {
      id: "comedouro-ave",
      titulo: "Projeto: comedouro para aves",
      blocos: [
        { tipo: "texto", texto: "Na avicultura o comedouro é sistema, não peça. Os mais usados: TUBULAR (reservatório central cai num prato circular; regulável em altura por corrente e em vazão por rosca na base) e LINEAR AUTOMÁTICO (corrente ou rosca que leva ração por toda a linha, com prato em cada ponto). Dois controles mandam no desperdício: a ALTURA (sobe com o lote, borda na linha do dorso) e a GRADE/REGULAGEM DE NÍVEL (lâmina fina de ração no prato, ~1/3, nunca cheio)." },
        { tipo: "texto", texto: "Na primeira semana (pintinho), usam-se comedouros tipo bandeja/prato infantil rasos e próximos do calor, depois se faz a transição para os tubulares/lineares à medida que o lote cresce — sempre subindo a altura. O número de comedouros por mil aves vem do manual da linhagem; subdimensionar faz as aves mais fracas não alcançarem e cria desuniformidade. Limpeza entre lotes é parte do vazio sanitário." },
        {
          tipo: "prancha",
          titulo: "Comedouro tubular de ave: os dois controles",
          desenho: {
            legenda: "Reservatório, prato circular, corrente de altura e regulagem de vazão. Altura na linha do dorso; nível a ~1/3.",
            primitivas: [
              { t: "retangulo", p: [120, 40], w: 60, h: 45, cor: "tinta" },
              { t: "rotulo", p: [132, 66], texto: "reserv." },
              { t: "linha", de: [150, 40], ate: [150, 20], cor: "destaque" },
              { t: "rotulo", p: [158, 26], texto: "corrente (altura)" },
              { t: "curva", pts: [[100, 120], [150, 140], [200, 120]], cor: "tinta" },
              { t: "linha", de: [100, 100], ate: [100, 122], cor: "tinta" },
              { t: "linha", de: [200, 100], ate: [200, 122], cor: "tinta" },
              { t: "linha", de: [130, 85], ate: [170, 85], cor: "suave" },
              { t: "rotulo", p: [205, 100], texto: "regulagem vazao" },
              { t: "linha", de: [112, 131], ate: [188, 131], cor: "destaque" },
              { t: "rotulo", p: [120, 160], texto: "nivel ~1/3 do prato" },
            ],
          },
        },
      ],
    },
    {
      id: "cocho-ovino-caprino",
      titulo: "Projeto: comedouro seletivo (creep feeding)",
      blocos: [
        { tipo: "texto", texto: "Uma das ideias mais elegantes de comedouro é o SELETIVO ou PRIVATIVO: uma cerca com aberturas calibradas que só o filhote atravessa, dando acesso a um comedouro de concentrado que a mãe não alcança. Em ovinos e caprinos isso é o 'creep feeding' — suplementar o cordeiro/cabrito antes do desmame, acelerando o ganho sem gastar concentrado com a mãe. A pesquisa da Embrapa mediu o efeito: cordeiros Santa Inês com acesso ao concentrado à vontade ganharam cerca de 384 g/dia, bem acima dos demais tratamentos." },
        { tipo: "texto", texto: "O projeto do seletivo é geometria de acesso: a largura/altura das aberturas (o 'portãozinho') tem que deixar o filhote passar e barrar a mãe — calibrada ao tamanho dos animais. O comedouro interno fica protegido (coberto, limpo), com concentrado fresco e pouca sobra. É também um caso de HIGIENE premiada: como só o filhote entra, há menos contaminação e a sobra é pequena e controlada." },
        { tipo: "video", titulo: "Cocho automático para bovinos parte 2", youtube: "CnSQ_fHmQ3k" },
        {
          tipo: "fontes",
          titulo: "Comedouro seletivo / creep feeding (Embrapa)",
          itens: [
            { titulo: "Embrapa — Desempenho de cordeiros Santa Inês em comedouros seletivos com níveis de concentrado", url: "https://www.embrapa.br/busca-de-publicacoes/-/publicacao/1174837/desempenho-de-cordeiros-da-raca-santa-ines-alimentos-em-sistemas-de-comedouros-seletivos-com-diferentes-niveis-de-concentrado", tipo: "artigo", nota: "Creep feeding ad libitum: ganho de ~384 g/dia nos cordeiros." },
            { titulo: "Embrapa — Cordeiros em comedouro privativo suplementados com glicerina", url: "https://www.embrapa.br/busca-de-publicacoes/-/publicacao/1000052/qualidade-da-carne-de-cordeiros-lactentes-suplementados-com-teores-de-glicerina-bruta-em-comedouro-privativo", tipo: "artigo", nota: "Uso de comedouro privativo para suplementar cordeiros lactentes." },
            { titulo: "Embrapa — Cordeiros Santa Inês (parto simples/duplo) em comedouro seletivo no pré-desmame", url: "https://www.embrapa.br/busca-de-publicacoes/-/publicacao/1068278/desempenho-de-cordeiros-santa-ines-oriundos-de-parto-simples-e-duplos-submetidos-a-comedouro-seletivo-na-fase-de-pre-desmame", tipo: "artigo" },
          ],
        },
      ],
    },
    {
      id: "materiais",
      titulo: "Materiais: higiene x custo x durabilidade",
      blocos: [
        { tipo: "texto", texto: "O material do comedouro é uma escolha dos três eixos de novo. CONCRETO: durável, estável, barato de fazer; mas se for poroso/bruto acumula sujeira — precisa de acabamento liso (desempenado/queimado) para limpar bem. MADEIRA: barata e fácil, mas absorve umidade, mofa, lasca e dura menos; serve para soluções móveis e provisórias. PLÁSTICO PEAD/POLIETILENO: liso, leve, fácil de higienizar, não enferruja; custo maior e pode trincar no sol/frio. METAL GALVANIZADO/INOX: durável e higiênico (inox é o padrão-ouro de limpeza), mas caro e pode ter borda cortante se mal-acabado." },
        { tipo: "texto", texto: "Regra de decisão: quanto mais crítico o eixo HIGIENE (leitão, pintinho, leite, confinamento denso), mais vale pagar por superfície lisa e não-porosa (inox, PEAD, concreto queimado). Quanto mais importa CUSTO e mobilidade (pasto extensivo, solução temporária), concreto simples ou madeira resolvem. Em qualquer material: borda sem quina viva (não ferir a boca) e fundo que se esvazia (não acumular canto)." },
        {
          tipo: "prancha",
          titulo: "Matriz material x eixo",
          desenho: {
            legenda: "Quatro materiais ordenados: concreto, madeira, PEAD, inox. Setas indicam o que cada um favorece.",
            primitivas: [
              { t: "rotulo", p: [30, 40], texto: "Concreto" },
              { t: "rotulo", p: [95, 40], texto: "Madeira" },
              { t: "rotulo", p: [160, 40], texto: "PEAD" },
              { t: "rotulo", p: [220, 40], texto: "Inox" },
              { t: "linha", de: [20, 55], ate: [280, 55], cor: "suave" },
              { t: "seta", de: [40, 70], ate: [250, 70], cor: "destaque" },
              { t: "rotulo", p: [95, 85], texto: "mais higiene / mais custo" },
              { t: "seta", de: [250, 110], ate: [40, 110], cor: "tinta" },
              { t: "rotulo", p: [70, 125], texto: "mais barato / menos duravel" },
              { t: "rotulo", p: [40, 160], texto: "escolha pelo eixo mais critico do seu caso" },
            ],
          },
        },
      ],
    },
    // ============================== EXECUÇÃO ==============================
    {
      id: "construir-cocho",
      titulo: "Construir o cocho, passo a passo",
      blocos: [
        { tipo: "texto", texto: "Para um cocho de concreto simples, a sequência é: (1) definir comprimento pelo cálculo de espaço linear e marcar o local (perto da água, longe de encosta que escorre enxurrada); (2) preparar base e piso firme na área de alimentação; (3) montar a fôrma com o fundo em U e a aba interna; (4) concretar com acabamento liso (queimar a superfície com a desempenadeira); (5) curar o concreto; (6) arredondar/lixar qualquer borda viva; (7) dar o leve caimento para a água de lavagem escorrer por um ralo/ponta baixa." },
        {
          tipo: "tarefas",
          itens: [
            { id: "marcar", titulo: "Marque o comprimento e o local", entrega: "Com o cálculo em mãos, estaquê o comprimento do cocho no local. Confira: perto de água, piso que não alaga, acesso para abastecer e para limpar." },
            { id: "forma-u", titulo: "Monte a fôrma com fundo em U", entrega: "Prepare a fôrma garantindo fundo arredondado, aba interna no topo e espessura de parede adequada. Registre as cotas usadas." },
            { id: "acabamento", titulo: "Acabamento liso e borda sem quina", entrega: "Queime a superfície interna e arredonde as bordas. Teste passando a mão (de luva): não pode ter ponto que corte ou acumule." },
          ],
        },
        { tipo: "video", titulo: "Cocho automático para bovinos", youtube: "wWzJraS5x9s" },
      ],
    },
    {
      id: "cobertura-piso",
      titulo: "Cobertura, piso e drenagem",
      blocos: [
        { tipo: "texto", texto: "Três obras em volta do comedouro valem tanto quanto ele. COBERTURA: um telhado simples sobre o comedouro impede a chuva de molhar a ração (que mofaria) e protege o animal do sol na hora de comer — em regiões chuvosas, isso sozinho derruba o desperdício por fermentação. PISO: a área de alimentação precisa de piso firme (concreto ou brita compactada) para não virar lamaçal — lama é desperdício (ração pisada) e doença de casco. DRENAGEM: caimento leve e um ponto de saída para a água de lavagem e de chuva não empoçar." },
        { tipo: "texto", texto: "O detalhe que separa o bom do ruim: a água tem que SAIR, nunca entrar na ração. Cobertura com beiral suficiente para a chuva de vento não molhar o cocho; piso com caimento para longe do comedouro; e, se houver bebedouro perto, posicioná-lo de modo que o respingo caia no piso drenado, não no comedouro. Uma fazenda que cobre e drena os comedouros resolve metade dos problemas de higiene sem gastar com desinfetante." },
        {
          tipo: "prancha",
          titulo: "Comedouro coberto, piso drenado",
          desenho: {
            legenda: "Telhado com beiral, cocho embaixo, piso firme com caimento para fora e ponto de drenagem.",
            primitivas: [
              { t: "linha", de: [40, 45], ate: [150, 25], cor: "tinta" },
              { t: "linha", de: [150, 25], ate: [260, 45], cor: "tinta" },
              { t: "rotulo", p: [120, 20], texto: "telhado (beiral)" },
              { t: "retangulo", p: [110, 95], w: 80, h: 25, cor: "tinta" },
              { t: "rotulo", p: [128, 112], texto: "cocho" },
              { t: "linha", de: [40, 150], ate: [260, 158], cor: "suave" },
              { t: "rotulo", p: [95, 172], texto: "piso firme, caimento p/ fora" },
              { t: "seta", de: [230, 150], ate: [275, 162], cor: "destaque" },
              { t: "rotulo", p: [250, 140], texto: "dreno" },
            ],
          },
        },
      ],
    },
    {
      id: "instalar-regulagem",
      titulo: "Instalar e regular: o ajuste fino",
      blocos: [
        { tipo: "texto", texto: "Comedouro instalado não é comedouro pronto: falta a regulagem, que é onde o desperdício realmente se define. Em tolvas e tubulares, ajuste a ABERTURA para a ração cair em lâmina fina (prato a ~1/3, nunca transbordando). Em comedouros automáticos, calibre a vazão e os sensores. Ajuste a ALTURA à categoria (linha do peito/dorso do menor animal) e preveja como vai subir conforme o lote cresce. Nivele o comedouro: um cocho torto concentra ração e água num canto e esvazia o outro." },
        { tipo: "texto", texto: "Faça o 'teste do primeiro dia': ofereça uma quantidade conhecida, observe os animais comendo (todos alcançam? brigam? respinga?) e meça a sobra e o chão no dia seguinte. Ajuste a abertura/altura e repita até estabilizar num nível de sobra pequeno e baixo desperdício. Anote a regulagem que funcionou — ela é o 'setup' daquele comedouro para aquela categoria." },
        {
          tipo: "diagrama", titulo: "Ciclo de regulagem", codigo: `flowchart LR
  I["Instalar"] --> A["Ajustar abertura e altura"]
  A --> O["Observar 1o trato"]
  O --> M["Medir sobra + chao"]
  M --> D{"Desperdicio ok?"}
  D -->|"Nao"| A
  D -->|"Sim"| S["Registrar setup"]` },
        {
          tipo: "licao",
          pergunta: "Qual o objetivo do 'teste do primeiro dia' após instalar?",
          alternativas: [
            "Só encher o comedouro e ir embora",
            "Observar acesso e respingo e medir a sobra para calibrar abertura e altura até o desperdício ficar baixo",
            "Mostrar o comedouro para os vizinhos",
          ],
          correta: 1,
          explicacao: "A instalação define a estrutura; a regulagem define o desperdício. O teste do primeiro dia calibra abertura e altura com base no que se observa e se mede, até achar o setup certo.",
        },
      ],
    },
    {
      id: "seguranca-obra",
      titulo: "Segurança da obra e quem chamar",
      blocos: [
        { tipo: "texto", texto: "Construir comedouro é obra, e obra tem risco. Concreto, fôrmas, ferramentas de corte, estrutura de cobertura (trabalho em altura) e, nos comedouros automáticos, parte elétrica. Duas regras: use EPI (luva, óculos, botina) e não improvise na parte estrutural e elétrica. Uma cobertura mal feita cai; uma instalação elétrica improvisada num galpão úmido, com ração e poeira, é risco de incêndio e choque. Saber o limite do 'faça você mesmo' é parte do ofício." },
        { tipo: "texto", texto: "Também há um limite técnico no projeto da DIETA e do manejo alimentar: quanto e o que cada categoria come, balanceamento, e a decisão de suplementar são competência de zootecnista/veterinário. O comedouro perfeito com dieta errada não produz. Por isso, nas etapas que exigem responsabilidade técnica, mobilize o profissional certo — e registre a recomendação dele." },
        {
          tipo: "mobilizacao",
          papel: "Zootecnista ou Médico(a) Veterinário(a)",
          porque: "O dimensionamento do comedouro serve a uma dieta: quantidade por categoria, balanceamento, regime (racionado/ad libitum) e decisão de suplementar (ex.: creep feeding) são responsabilidade técnica. Erro aqui anula o melhor comedouro.",
          entregaEsperada: "Plano alimentar por categoria (quantidade, tipo de alimento, nº de tratos e espaço/boca recomendado) assinado, com a referência de espaço linear/boca por cabeça para o seu rebanho.",
          gerenciadoPor: "zaeon",
        },
        {
          tipo: "mobilizacao",
          papel: "Eletricista habilitado (NR-10) — comedouros automáticos",
          porque: "Comedouros automáticos com motor, rosca, balança ou sensores exigem instalação elétrica segura em ambiente úmido e empoeirado. Improviso aqui é risco de choque e incêndio no galpão.",
          entregaEsperada: "Instalação elétrica do comedouro automático executada e aterrada conforme norma, com proteção (disjuntor/DR) e laudo/ART do responsável.",
          gerenciadoPor: "zaeon",
        },
      ],
    },
    // ============================== MANUTENÇÃO ==============================
    {
      id: "rotina-limpeza",
      titulo: "Rotina de limpeza e desinfecção",
      blocos: [
        { tipo: "texto", texto: "Higiene não é faxina eventual, é rotina com frequência definida. O básico diário: retirar a sobra antes do novo trato (não empilhar ração nova sobre velha), tirar fezes e corpos estranhos, e manter a área seca. O periódico: esvaziar completamente, raspar crostas, lavar com água (e detergente/desinfetante quando indicado) e deixar secar antes de reabastecer — fundo liso e em U tornam isso rápido. Nos sistemas confinados (aves/suínos), a limpeza e desinfecção profunda entra no VAZIO SANITÁRIO entre lotes." },
        { tipo: "diagrama", titulo: "Frequências de limpeza", codigo: `flowchart TD
  D["Diario: tirar sobra, fezes, manter seco"] --> S["Semanal: esvaziar e raspar crostas"]
  S --> P["Periodico: lavar + desinfetar + secar"]
  P --> L["Entre lotes: vazio sanitario (confinados)"]
  L --> D` },
        {
          tipo: "tarefas",
          itens: [
            { id: "calendario", titulo: "Monte o calendário de limpeza", entrega: "Defina a frequência diária, semanal e periódica de cada comedouro e quem é o responsável. Pendure o calendário no local. Registre a execução." },
            { id: "sobra-nova", titulo: "Proíba 'ração nova sobre velha'", entrega: "Estabeleça a regra: nunca abastecer sem retirar a sobra. Treine a equipe e verifique por uma semana se está sendo cumprido." },
          ],
        },
      ],
    },
    {
      id: "controle-micotoxina",
      titulo: "Mofo e micotoxinas: o inimigo invisível",
      blocos: [
        { tipo: "texto", texto: "A micotoxina é o dano que não se vê. Fungos (Aspergillus, Fusarium, Penicillium) crescem em ração úmida, parada e quente e produzem toxinas (aflatoxina, fumonisina, zearalenona, DON) que, mesmo sem o animal recusar a ração, reduzem consumo e ganho, afetam fígado, imunidade e reprodução. O comedouro é um ponto crítico: sobra acumulada no canto, ração molhada por chuva ou respingo, e crosta velha no fundo são fábricas de fungo. Controlar aqui é prevenção direta." },
        { tipo: "texto", texto: "As barreiras: manter a ração SECA (cobertura, não molhar); girar a sobra (pouca sobra, retirada antes de estragar); fundo sem canto para não haver 'esquina do mofo'; e armazenar o alimento bem antes do comedouro (silo/depósito seco, ventilado, sem contato com o chão). A fiscalização de qualidade de ração e aditivos no Brasil passa pelo MAPA; na fazenda, a defesa prática é a higiene do comedouro e do depósito. Ração suspeita (cheiro, bolor, aglomerado) sai de circulação." },
        {
          tipo: "licao",
          pergunta: "Por que a micotoxina é perigosa mesmo quando o animal 'come normal'?",
          alternativas: [
            "Ela não é perigosa",
            "Porque a toxina age sem necessariamente mudar o sabor: o animal come, mas perde desempenho, imunidade e reprodução",
            "Porque muda a cor da ração",
          ],
          correta: 1,
          explicacao: "Micotoxinas atuam de forma subclínica: o animal pode comer sem recusar, mas o fígado, a imunidade, o ganho e a reprodução caem. Por isso a prevenção (ração seca, pouca sobra, fundo limpo) é tão importante.",
        },
        {
          tipo: "fontes",
          titulo: "Qualidade e fiscalização de ração",
          itens: [
            { titulo: "MAPA — Produtos para Alimentação Animal (aditivos, fiscalização, boas práticas)", url: "https://www.gov.br/agricultura/pt-br/assuntos/insumos-agropecuarios/insumos-pecuarios/alimentacao-animal", tipo: "norma", nota: "Regula fabricação, aditivos e controle de qualidade das rações no Brasil." },
          ],
        },
      ],
    },
    {
      id: "manejo-abastecimento",
      titulo: "Manejo de abastecimento: horário e quantidade",
      blocos: [
        { tipo: "texto", texto: "Mesmo o comedouro perfeito desperdiça com manejo ruim. Princípios de abastecimento: HORÁRIO regular (o animal aprende a hora, come melhor, reduz estresse e briga); QUANTIDADE guiada pela leitura de cocho (ajustar o trato de hoje pela sobra de ontem); e FRACIONAMENTO quando faz sentido (dar em mais vezes reduz a sobra parada e o respingo de comedouro cheio). Em ad libitum/tolva, o manejo é manter a vazão regulada e a sobra girando, não 'encher até a boca para não faltar'." },
        { tipo: "texto", texto: "A disciplina de anotar a sobra e o desperdício transforma o abastecimento em ciência. Semana a semana, você vê qual horário e qual fracionamento dão menos sobra e menos chão sujo para o mesmo ganho. Em confinamento, a leitura de cocho diária (escore 0 a 4) é o instrumento que evita tanto a falta (dominados sem acesso) quanto o excesso (ração parada que mofa)." },
        { tipo: "video", titulo: "Cocho comedouro automático (CCA) — reposição automática", youtube: "l0fSV5eyWbo" },
        {
          tipo: "tarefas",
          itens: [
            { id: "planilha-sobra", titulo: "Mantenha a planilha de sobra", entrega: "Anote por uma semana: ração ofertada, sobra aproveitável, sobra perdida e escore de cocho por trato. No fim, decida o ajuste de quantidade/horário." },
          ],
        },
      ],
    },
    {
      id: "manutencao-preventiva",
      titulo: "Manutenção preventiva da estrutura",
      blocos: [
        { tipo: "texto", texto: "O comedouro se degrada e, quando degrada, volta a desperdiçar e a sujar. Inspeção preventiva periódica: TRINCAS no concreto (vazam, acumulam e são ninho de fungo); BORDAS lascadas ou enferrujadas (ferem a boca); FUNDO com crosta incrustada que não sai na limpeza comum; REGULAGEM de tolvas/tubulares que afrouxou (abertura abrindo sozinha = desperdício voltando); CORRENTES/ROSCAS dos automáticos; e a COBERTURA (telha solta, calha entupida que joga água na ração)." },
        { tipo: "texto", texto: "Transforme a inspeção em checklist mensal e conserte cedo: uma trinca selada a tempo custa pouco; um fundo que virou ninho de mofo contamina o lote. Registre as manutenções — o histórico mostra qual comedouro dá mais problema (candidato a troca de material ou projeto). Manutenção é o elo que mantém os três eixos funcionando ao longo do tempo." },
        {
          tipo: "prancha",
          titulo: "Checklist de inspeção da estrutura",
          desenho: {
            legenda: "Pontos de inspeção: trinca, borda, fundo, regulagem e cobertura. Um check por mês.",
            primitivas: [
              { t: "retangulo", p: [90, 80], w: 120, h: 40, cor: "tinta" },
              { t: "rotulo", p: [118, 104], texto: "COMEDOURO" },
              { t: "rotulo", p: [25, 60], texto: "trinca?" },
              { t: "seta", de: [60, 66], ate: [95, 82], cor: "suave" },
              { t: "rotulo", p: [230, 60], texto: "borda?" },
              { t: "seta", de: [245, 66], ate: [205, 82], cor: "suave" },
              { t: "rotulo", p: [30, 140], texto: "fundo?" },
              { t: "seta", de: [60, 138], ate: [100, 120], cor: "suave" },
              { t: "rotulo", p: [150, 150], texto: "regulagem?" },
              { t: "seta", de: [170, 145], ate: [160, 122], cor: "suave" },
              { t: "rotulo", p: [228, 140], texto: "cobertura?" },
              { t: "seta", de: [245, 138], ate: [205, 120], cor: "suave" },
            ],
          },
        },
      ],
    },
    // ============================== CASOS REAIS ==============================
    {
      id: "caso-confinamento",
      titulo: "Caso: leitura de cocho no confinamento",
      blocos: [
        { tipo: "texto", texto: "Num confinamento de bovinos de corte, o desafio é fazer um lote inteiro comer muito e uniforme sem acidose nem desperdício. A ferramenta de manejo que organiza isso é a LEITURA DE COCHO: toda manhã, antes do trato, um avaliador percorre os cochos e dá um escore (de 0, cocho lambido, a 4, sobra alta). Esse escore ajusta a quantidade do dia: cocho limpo demais, sobe um pouco; sobra alta, baixa e investiga (comida ruim? clima? problema de saúde?)." },
        { tipo: "texto", texto: "O que esse caso ensina sobre comedouro: a estrutura (espaço linear suficiente, fundo em U, piso firme, cobertura) é o pré-requisito, mas o MANEJO diário é o que extrai o resultado. Sem espaço linear, os dominados não comem e o lote desuniformiza por mais que se leia o cocho. Com espaço e leitura juntos, consegue-se alta ingestão com sobra mínima — exatamente o ponto de equilíbrio dos três eixos. Tecnologias de cocho automático que pesam o consumo individual (como a estudada pela Embrapa) levam essa leitura ao nível do animal." },
        { tipo: "video", titulo: "Manejo da água para bovinos de corte e de leite — Dia de Campo na TV", youtube: "p-2xbYexFaE" },
        {
          tipo: "fontes",
          titulo: "Consumo e cocho em confinamento",
          itens: [
            { titulo: "Embrapa — Evaluation of an automatic feed bunk for measuring starter intake in calves", url: "https://www.embrapa.br/busca-de-publicacoes/-/publicacao/1172208/evaluation-of-an-automatic-feed-bunk-for-measuring-starter-intake-in-days-calves", tipo: "artigo", nota: "Cocho que mede o consumo individual — leitura de cocho levada ao nível do animal." },
          ],
        },
      ],
    },
    {
      id: "caso-suino-ave",
      titulo: "Caso: a regulagem que corta o desperdício",
      blocos: [
        { tipo: "texto", texto: "Em aviários e granjas de suínos, a história se repete: comedouros instalados, mas regulados 'para não faltar' — tolvas e pratos abertos demais, cheios até a borda. O resultado é ração na cama/baia, cama úmida (amônia, problema de pata em aves) e um desperdício que ninguém nota porque está diluído no dia a dia. A intervenção é barata: apertar a regulagem de vazão (lâmina fina, prato a ~1/3), ajustar a altura à linha do dorso e girar a sobra. Produtores que fazem isso enxergam a queda no consumo de ração sem perda de desempenho." },
        { tipo: "texto", texto: "O que esse caso ensina: o maior ganho de desperdício em sistemas intensivos quase nunca é 'comprar comedouro novo' — é REGULAR o que já existe e DISCIPLINAR o manejo (altura sobe com o lote, nível baixo, limpeza entre lotes). É o lembrete de que os três eixos se ganham mais no ajuste fino e na rotina do que no concreto. Comparar a medição de desperdício antes/depois do ajuste prova o ganho e convence a equipe." },
        { tipo: "video", titulo: "Comedouro na fase adulta — Embrapa Suínos e Aves", youtube: "dHPOpSFcqWo" },
        {
          tipo: "licao",
          pergunta: "Em sistemas intensivos, qual costuma ser o maior ganho contra desperdício?",
          alternativas: [
            "Trocar todos os comedouros por novos",
            "Regular o que já existe (vazão baixa, altura na linha do dorso) e disciplinar o manejo",
            "Dar mais ração para compensar",
          ],
          correta: 1,
          explicacao: "Na maioria dos casos, a estrutura existe e está mal regulada. Apertar a vazão, acertar a altura e girar a sobra corta o desperdício a custo quase zero — bem antes de pensar em comprar comedouro novo.",
        },
      ],
    },
    {
      id: "caso-creep",
      titulo: "Caso: creep feeding que mediu o ganho",
      blocos: [
        { tipo: "texto", texto: "Um caso com número publicado: a Embrapa avaliou comedouros SELETIVOS (creep feeding) para cordeiros Santa Inês, variando o nível de concentrado que o filhote acessava — enquanto a mãe, em confinamento, não alcançava esse concentrado. O grupo com acesso ao concentrado À VONTADE no comedouro privativo teve o maior ganho médio diário, por volta de 384 g/dia, significativamente acima dos demais. É a prova de que o DESENHO DE ACESSO do comedouro (quem come o quê) vira desempenho." },
        { tipo: "texto", texto: "O que esse caso ensina sobre os três eixos: ERGONOMIA/ACESSO — a abertura calibrada deixa só o cordeiro entrar, resolvendo a competição com a mãe; HIGIENE — como o comedouro é protegido e só o filhote usa, a contaminação e a sobra são baixas; DESPERDÍCIO — o concentrado caro vai só para quem converte melhor (o filhote em crescimento), não é 'dividido' com a mãe. Um comedouro inteligente não é só um recipiente: é uma regra de quem come o quê, e isso se mede no ganho." },
        { tipo: "video", titulo: "Cocho automático para bovinos parte 2", youtube: "CnSQ_fHmQ3k" },
        {
          tipo: "fontes",
          titulo: "O caso, na fonte",
          itens: [
            { titulo: "Embrapa — Desempenho de cordeiros Santa Inês em comedouros seletivos com níveis de concentrado", url: "https://www.embrapa.br/busca-de-publicacoes/-/publicacao/1174837/desempenho-de-cordeiros-da-raca-santa-ines-alimentos-em-sistemas-de-comedouros-seletivos-com-diferentes-niveis-de-concentrado", tipo: "artigo", nota: "Ganho de ~384 g/dia no tratamento com concentrado ad libitum no comedouro seletivo." },
          ],
        },
      ],
    },
    // ============================== RECURSOS ==============================
    {
      id: "normas-recursos",
      titulo: "Normas, órgãos e onde estudar",
      blocos: [
        { tipo: "texto", texto: "Reúna as referências que sustentam o comedouro bem feito. Bem-estar e acesso ao alimento: WOAH (padrões internacionais) e a legislação brasileira de proteção animal (Lei 9.605/1998). Qualidade e segurança do alimento: MAPA (registro, aditivos e fiscalização de rações). Pesquisa aplicada brasileira: Embrapa (unidades de Suínos e Aves, Gado de Leite, e as publicações sobre cochos e comedouros seletivos). Referência global de sistemas de produção e nutrição: FAO. Resíduo e desperdício: Lei 12.305/2010." },
        {
          tipo: "fontes",
          titulo: "Biblioteca do comedouro (consolidado)",
          itens: [
            { titulo: "WOAH — Codes and Manuals (bem-estar animal)", url: "https://www.woah.org/en/what-we-do/standards/codes-and-manuals/terrestrial-code-online-access/", tipo: "norma" },
            { titulo: "Lei nº 9.605/1998 — crimes ambientais (maus-tratos, Art. 32)", url: "https://www.planalto.gov.br/ccivil_03/leis/l9605.htm", tipo: "norma" },
            { titulo: "MAPA — Produtos para Alimentação Animal", url: "https://www.gov.br/agricultura/pt-br/assuntos/insumos-agropecuarios/insumos-pecuarios/alimentacao-animal", tipo: "norma" },
            { titulo: "FAO — Animal Production", url: "https://www.fao.org/animal-production/en/", tipo: "site" },
            { titulo: "Embrapa Suínos e Aves", url: "https://www.embrapa.br/suinos-e-aves", tipo: "site" },
            { titulo: "Embrapa Gado de Leite", url: "https://www.embrapa.br/gado-de-leite", tipo: "site" },
            { titulo: "Embrapa — Cocho móvel 'tipo trenó'", url: "https://www.embrapa.br/busca-de-publicacoes/-/publicacao/47199/cocho-movel-para-volumoso-tipo-treno-pratico-e-resistente", tipo: "artigo" },
            { titulo: "Lei nº 12.305/2010 — Política Nacional de Resíduos Sólidos", url: "https://www.planalto.gov.br/ccivil_03/_ato2007-2010/2010/lei/l12305.htm", tipo: "norma" },
          ],
        },
      ],
    },
    {
      id: "kit-ferramentas",
      titulo: "Kit de ferramentas e planilha",
      blocos: [
        { tipo: "texto", texto: "O kit de campo do comedouro é barato: fita métrica (medir altura, borda, comprimento e espaço linear), balança (pesar oferta e sobra), lona (capturar o que cai no teste de desperdício), luvas (revolver o fundo e sentir borda/mofo), caderneta ou planilha (sobra, escore de cocho, desperdício %), e uma câmera (fotos antes/depois do chão). Com isso você faz diagnóstico, mede, ajusta e prova — sem equipamento caro." },
        { tipo: "texto", texto: "A planilha mínima tem, por comedouro e por semana: espaço linear ofertado x calculado (déficit?), ração ofertada, sobra aproveitável, sobra perdida, desperdício %, escore de cocho, e observações (mofo? fezes? respingo? briga?). Essa tabela é o que transforma o comedouro de 'palpite' em gestão: você vê qual comedouro, qual regulagem e qual horário dão menos perda e lote mais uniforme." },
        {
          tipo: "diagrama", titulo: "O ciclo que fecha o caderno", codigo: `flowchart LR
  L["Ler rebanho e local"] --> P["Projetar pelos 3 eixos"]
  P --> E["Executar: construir, cobrir, drenar"]
  E --> R["Regular: altura, vazao, nivel"]
  R --> M["Medir: sobra, chao, escore"]
  M --> MA["Manter: limpar, inspecionar"]
  MA --> L` },
        {
          tipo: "tarefas",
          itens: [
            { id: "montar-kit", titulo: "Monte o kit e a planilha", entrega: "Reúna fita, balança, lona, luva e caderneta. Crie a planilha semanal por comedouro (espaço, oferta, sobra, desperdício %, escore, observações) e comece a preencher." },
            { id: "primeiro-ajuste", titulo: "Faça o primeiro ciclo completo", entrega: "Escolha um comedouro problemático: meça o desperdício atual, faça UMA mudança (altura, vazão, cobertura ou espaço), meça de novo e registre o ganho. É a prova do método." },
          ],
        },
      ],
    },
    // ============================== SÍNTESE ==============================
    {
      id: "compilado",
      titulo: "Prancha de síntese",
      blocos: [
        { tipo: "texto", texto: "O comedouro decide a fazenda por três eixos que brigam entre si — ergonomia, higiene e desperdício — e o ofício é equilibrá-los para a sua espécie, categoria e bolso. O caminho: LER o rebanho e o local (quem come, como come, em que regime); PROJETAR pelos três eixos (altura na linha do peito/dorso, fundo em U, borda lisa com aba, espaço linear calculado, material pelo eixo crítico); EXECUTAR com cobertura, piso firme e drenagem; REGULAR fino (altura que sobe com o lote, vazão em lâmina fina, nível a ~1/3); MEDIR sempre (sobra, chão na lona, desperdício %, escore de cocho); e MANTER (limpeza rotineira, controle de micotoxina, inspeção da estrutura). Chame o zootecnista/veterinário para a dieta e o eletricista habilitado para o automático. Tudo com lastro: WOAH, MAPA, FAO, Embrapa e a legislação. O comedouro inteligente não é um recipiente — é uma regra de quem come o quê, e ela se mede no ganho, na sanidade e no caixa." },
        { tipo: "compilado" },
      ],
    },
  ],
};
