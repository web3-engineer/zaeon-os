import type { CadernoEstudo } from "../cadernosEstudo";

/**
 * Caderno de campo: "Fluxo de caixa de uma cooperativa de energia".
 * Administração e finanças (cooperativismo). Mistura dois domínios com lastro real:
 *  - o que é uma cooperativa de energia (eletrificação rural + geração distribuída / SCEE);
 *  - como se controla o caixa dela (DFC/CPC 03, regime de caixa x competência, projeção,
 *    capital de giro, rateio, sobras e FATES da Lei 5.764).
 * Todo número, norma e técnica aponta para fonte real (ver páginas "fontes"). Os valores
 * monetários dos exemplos são ILUSTRATIVOS de uma coop pequena e estão marcados como tal.
 */
export const caderno: CadernoEstudo = {
  id: "fluxo-caixa",
  titulo: "Fluxo de caixa de uma cooperativa de energia",
  resumo:
    "Do rateio do cooperado à parcela da usina: como ler, montar e projetar o caixa de uma cooperativa de energia (geração distribuída e eletrificação rural). DFC pela CPC 03, regime de caixa x competência, capital de giro, inadimplência, sobras e FATES — com fontes, normas, casos e o passo a passo da tesouraria.",
  paginas: [
    // ============================================================
    // CONTEXTO
    // ============================================================
    {
      id: "abertura",
      titulo: "Caixa: o oxigênio da cooperativa",
      blocos: [
        { tipo: "texto", texto: "Fluxo de caixa é o registro de todo dinheiro que ENTRA e SAI de verdade do bolso da cooperativa, em cada dia, semana ou mês. Não é o lucro contábil nem a receita do faturamento: é o saldo que pinga na conta. Uma cooperativa de energia pode ter contrato, usina e centenas de cooperados e ainda assim parar de funcionar se faltar caixa para pagar a conta de energia da distribuidora na data certa." },
        { tipo: "texto", texto: "A regra que atravessa este caderno: lucro é opinião, caixa é fato. A contabilidade distribui receitas e despesas pelo mês de 'competência'; o caixa só conhece a data em que o boleto do cooperado foi pago e a data em que a fatura da distribuidora venceu. Quem administra uma coop de energia administra esse descompasso." },
        { tipo: "diagrama", titulo: "A ideia em um quadro", codigo: `flowchart LR
  A["Cooperados pagam rateio"] --> C["CAIXA da cooperativa"]
  B["Venda de energia / creditos SCEE"] --> C
  C --> D["Paga distribuidora TUSD fio B"]
  C --> E["O&M da usina"]
  C --> F["Pessoal e tributos"]
  C --> G["Parcela do financiamento"]
  C --> H["Sobras e fundos FATES"]` },
      ],
    },
    {
      id: "o-que-e-coop-energia",
      titulo: "O que é uma cooperativa de energia",
      blocos: [
        { tipo: "texto", texto: "Cooperativa é uma associação de pessoas que se unem para atender uma necessidade comum por meio de uma empresa de propriedade coletiva e gestão democrática (definição da Aliança Cooperativa Internacional, 1995). Na energia, o Brasil tem dois grandes tipos: as cooperativas de INFRAESTRUTURA / eletrificação rural (que distribuem energia no campo desde os anos 1940-60, muitas hoje permissionárias ou distribuidoras reguladas pela ANEEL) e as cooperativas de GERAÇÃO DISTRIBUÍDA, que nascem depois de 2012 para gerar a própria energia (solar, biogás, PCH) e abater a conta dos cooperados." },
        { tipo: "texto", texto: "Este caderno foca na coop de geração distribuída (GD), o arranjo que mais cresce: um grupo se cotiza, instala uma usina solar e usa o Sistema de Compensação de Energia Elétrica (SCEE) para transformar a geração em créditos que reduzem a fatura de cada membro. O caixa dessa coop é curto e sensível — e por isso exige controle fino." },
        { tipo: "video", titulo: "Produção de energia solar cresce 83% e vira a 2ª maior fonte (CNN)", youtube: "d06KQa680g4" },
        {
          tipo: "licao",
          pergunta: "O que caracteriza uma cooperativa de geração distribuída de energia?",
          alternativas: [
            "É uma empresa com acionistas que vende energia pela Bolsa",
            "É um grupo de cooperados que gera a própria energia e divide os créditos para abater a conta de cada um",
            "É um órgão público que fiscaliza tarifas",
          ],
          correta: 1,
          explicacao: "Na GD cooperativa, os próprios membros são donos da usina; a energia vira crédito no SCEE e reduz a fatura de cada cooperado. Gestão democrática: uma pessoa, um voto.",
        },
      ],
    },
    {
      id: "porque-caixa-manda",
      titulo: "Por que o caixa manda (e o lucro não)",
      blocos: [
        { tipo: "texto", texto: "Empresas e cooperativas raramente fecham por prejuízo contábil: fecham por falta de caixa. Você pode ter 'sobras' no papel (o lucro da coop) e mesmo assim não ter dinheiro na conta, porque o cooperado paga o boleto no dia 10, mas a distribuidora cobra a TUSD no dia 5. Esse buraco de cinco dias, multiplicado por milhares de reais, é um problema de caixa, não de resultado." },
        {
          tipo: "prancha",
          titulo: "Resultado x Caixa: a defasagem",
          desenho: {
            legenda: "A curva de cima é o resultado contábil (sobras). A de baixo é o saldo de caixa. Elas não andam juntas; o vale do caixa é onde a coop quebra.",
            primitivas: [
              { t: "linha", de: [20, 20], ate: [20, 180], cor: "tinta" },
              { t: "linha", de: [20, 100], ate: [305, 100], cor: "tinta" },
              { t: "rotulo", p: [24, 16], texto: "R$" },
              { t: "curva", pts: [[20, 90], [70, 80], [120, 82], [170, 70], [220, 64], [270, 55], [300, 50]], cor: "suave" },
              { t: "rotulo", p: [235, 44], texto: "Sobras (competencia)" },
              { t: "curva", pts: [[20, 95], [55, 120], [95, 150], [130, 135], [170, 150], [210, 110], [260, 90], [300, 85]], cor: "destaque" },
              { t: "rotulo", p: [96, 168], texto: "Caixa (dinheiro real)" },
              { t: "seta", de: [120, 150], ate: [120, 108], cor: "destaque" },
              { t: "rotulo", p: [124, 150], texto: "aqui a coop quebra" },
              { t: "rotulo", p: [275, 112], texto: "tempo" },
            ],
          },
        },
        {
          tipo: "licao",
          pergunta: "Uma coop fecha o mês com sobras de R$ 10 mil, mas o saldo bancário zerou e há boleto da distribuidora vencendo. O que isso é?",
          alternativas: [
            "Um erro de contabilidade — sobras e saldo têm de ser iguais",
            "Um problema de caixa (timing de entradas e saídas), não de resultado",
            "Sinal de que a coop deve distribuir as sobras imediatamente",
          ],
          correta: 1,
          explicacao: "Sobras são apuradas por competência; o caixa depende das datas reais de recebimento e pagamento. Resultado positivo com caixa negativo é descompasso de timing — a doença mais comum.",
        },
      ],
    },
    {
      id: "regime-caixa-competencia",
      titulo: "Regime de caixa x regime de competência",
      blocos: [
        { tipo: "texto", texto: "Existem duas réguas para registrar um fato financeiro. No regime de COMPETÊNCIA, a receita e a despesa entram no mês a que se referem, independentemente do pagamento (é a régua da contabilidade oficial e do balanço). No regime de CAIXA, só entra quando o dinheiro efetivamente troca de mãos. O controle de fluxo de caixa usa a régua de caixa; o balanço e a DRE usam a de competência. As duas convivem — a DFC (Demonstração dos Fluxos de Caixa) é justamente a ponte entre elas." },
        { tipo: "diagrama", titulo: "A mesma conta nas duas réguas", codigo: `sequenceDiagram
  participant Co as Cooperado
  participant K as Caixa
  participant Ct as Contabilidade
  Note over Ct: Competencia: receita de marco
  Co->>K: paga boleto de marco so em abril
  Note over K: Caixa: entrada em abril
  K-->>Ct: DFC reconcilia marco x abril` },
        {
          tipo: "tarefas",
          itens: [
            { id: "rc1", titulo: "Pegue 10 lançamentos do extrato bancário do mês", entrega: "Marque ao lado de cada um a qual MÊS DE COMPETÊNCIA ele pertence (quando o fato ocorreu), além da data em que caiu no banco." },
            { id: "rc2", titulo: "Separe o que é 'de caixa' do que é 'de competência'", entrega: "Uma lista de 2 colunas mostrando quanto do faturado do mês ainda NÃO entrou no caixa (a receber) e quanto já saiu sem ter competência no mês." },
          ],
        },
      ],
    },
    {
      id: "mapa-do-caderno",
      titulo: "O caminho deste caderno",
      blocos: [
        { tipo: "texto", texto: "Vamos do concreto ao operacional: entender de onde vem e para onde vai o dinheiro de uma coop de energia; aprender a DFC (o método oficial, CPC 03); montar a planilha e projetar o caixa; dimensionar capital de giro, rateio e inadimplência; avaliar o investimento na usina; e rodar a rotina da tesouraria, o fechamento e a prestação de contas. Fecha com casos reais e uma caixa de ferramentas." },
        { tipo: "diagrama", titulo: "Mapa do caderno", codigo: `flowchart TD
  C1["Contexto: o que e caixa numa coop"] --> C2["Leitura: entradas e saidas"]
  C2 --> C3["Metodo: DFC CPC 03"]
  C3 --> C4["Calculo: planilha e projecao"]
  C4 --> C5["Projeto: orcamento, rateio, usina"]
  C5 --> C6["Execucao: tesouraria e cobranca"]
  C6 --> C7["Manutencao: fechamento e prestacao de contas"]
  C7 --> C8["Casos reais e recursos"]` },
        {
          tipo: "fontes",
          titulo: "Fontes de base (abrem o caderno)",
          itens: [
            { titulo: "Lei nº 5.764/1971 — Política Nacional de Cooperativismo (Planalto)", url: "https://www.planalto.gov.br/ccivil_03/leis/l5764.htm", tipo: "norma", nota: "Define cooperativa, ato cooperativo, sobras e os fundos obrigatórios (Reserva e FATES)." },
            { titulo: "Lei nº 14.300/2022 — Marco legal da microgeração e minigeração distribuída (Planalto)", url: "https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2022/lei/l14300.htm", tipo: "norma", nota: "Institui o SCEE e as regras de compensação que sustentam a receita da coop de GD." },
            { titulo: "CPC 03 (R2) — Demonstração dos Fluxos de Caixa (Comitê de Pronunciamentos Contábeis)", url: "http://www.cpc.org.br/CPC/Documentos-Emitidos/Pronunciamentos", tipo: "norma", nota: "A norma técnica que estrutura a DFC em três atividades. É o método oficial usado neste caderno." },
            { titulo: "Statement on the Cooperative Identity — ICA (1995)", url: "https://ica.coop/en/cooperatives/cooperative-identity", tipo: "site", nota: "Definição internacional de cooperativa e os 7 princípios." },
          ],
        },
      ],
    },
    // ============================================================
    // LEITURA DO TEMA: ENTRADAS E SAÍDAS
    // ============================================================
    {
      id: "de-onde-vem-o-dinheiro",
      titulo: "De onde vem o dinheiro",
      blocos: [
        { tipo: "texto", texto: "As ENTRADAS típicas de uma coop de energia de GD: (1) o rateio mensal dos cooperados — o valor que cada um paga pela energia/crédito que recebe, principal linha do caixa; (2) a taxa de adesão de novos cooperados; (3) a integralização de cota-capital (dinheiro que o novo membro aporta e que é patrimônio, não receita); (4) eventual venda de excedente ou prestação de serviço a não cooperados (ato não cooperativo, que tem tratamento tributário diferente); e (5) receitas financeiras de aplicação dos fundos." },
        {
          tipo: "prancha",
          titulo: "As torneiras que enchem o caixa",
          desenho: {
            legenda: "Cada torneira é uma fonte de entrada. A grossa (rateio) sustenta a coop; as finas são complementares.",
            primitivas: [
              { t: "retangulo", p: [110, 120], w: 100, h: 60, cor: "tinta", hachura: true },
              { t: "rotulo", p: [135, 155], texto: "CAIXA" },
              { t: "seta", de: [50, 40], ate: [120, 120], cor: "destaque" },
              { t: "rotulo", p: [18, 36], texto: "Rateio mensal" },
              { t: "seta", de: [120, 30], ate: [150, 120], cor: "tinta" },
              { t: "rotulo", p: [110, 24], texto: "Adesao" },
              { t: "seta", de: [200, 30], ate: [170, 120], cor: "tinta" },
              { t: "rotulo", p: [185, 24], texto: "Cota-capital" },
              { t: "seta", de: [275, 45], ate: [205, 122], cor: "suave" },
              { t: "rotulo", p: [240, 40], texto: "Receita financeira" },
              { t: "circulo", c: [50, 40], r: 5, cor: "destaque" },
            ],
          },
        },
        { tipo: "texto", texto: "Atenção ao que NÃO é receita: a cota-capital integralizada é aporte patrimonial do cooperado (entra no caixa como atividade de FINANCIAMENTO, não operacional) e pode ter de ser devolvida se ele sair. Tratar cota como receita é o erro que infla o resultado e esconde um passivo." },
      ],
    },
    {
      id: "para-onde-vai",
      titulo: "Para onde vai o dinheiro",
      blocos: [
        { tipo: "texto", texto: "As SAÍDAS de uma coop de GD: (1) o custo de disponibilidade e a TUSD 'fio B' — mesmo compensando a energia, o cooperado e a coop pagam à distribuidora pelo uso da rede, parcela que a Lei 14.300 passou a cobrar de forma crescente; (2) O&M da usina (limpeza dos módulos, seguro, monitoramento, troca de inversor); (3) pessoal e pró-labore; (4) serviços de contabilidade e jurídico; (5) tributos; (6) despesas administrativas (bancárias, software, cartório); e (7) a parcela do financiamento da usina, se houver." },
        { tipo: "diagrama", titulo: "Classificando cada saída", codigo: `flowchart TD
  S["Saida de caixa"] --> O["Operacional: TUSD, O&M, pessoal, tributos"]
  S --> I["Investimento: comprar modulos, expandir usina"]
  S --> F["Financiamento: parcela do emprestimo, devolver cota"]` },
        {
          tipo: "licao",
          pergunta: "A coop paga a parcela mensal do financiamento da usina. Em qual atividade da DFC isso entra?",
          alternativas: [
            "Operacional, porque é todo mês",
            "Investimento, porque é da usina",
            "Financiamento, porque é amortização de dívida",
          ],
          correta: 2,
          explicacao: "A amortização do principal de empréstimos é atividade de FINANCIAMENTO na DFC. Só os juros podem aparecer no operacional, conforme a política adotada (CPC 03).",
        },
      ],
    },
    {
      id: "ciclo-financeiro",
      titulo: "O ciclo: do medidor ao recebimento",
      blocos: [
        { tipo: "texto", texto: "O caixa de uma coop de energia segue um ciclo mensal com datas rígidas: a distribuidora lê o medidor e emite a fatura da coop; a coop calcula quanto de crédito cada cooperado recebeu; rateia os custos; emite o boleto/PIX de cada membro; e aguarda o recebimento. Entre o pagamento da distribuidora e o recebimento do cooperado há uma defasagem — o ciclo financeiro — que precisa ser financiada por capital de giro." },
        { tipo: "diagrama", titulo: "Linha do tempo do mês", codigo: `sequenceDiagram
  participant D as Distribuidora
  participant Coop as Cooperativa
  participant Cop as Cooperado
  D->>Coop: le medidor e fatura TUSD
  Coop->>Coop: rateia custo e credito
  Coop->>Cop: emite boleto/PIX
  Coop->>D: paga a fatura (saida)
  Cop->>Coop: paga o rateio (entrada, dias depois)` },
        { tipo: "texto", texto: "Quanto maior a distância entre 'pagar a distribuidora' e 'receber do cooperado', mais capital de giro a coop precisa manter parado. Encurtar esse ciclo — antecipando a cobrança, usando PIX, oferecendo débito automático — é uma das alavancas mais baratas de saúde do caixa." },
      ],
    },
    {
      id: "sazonalidade-energia",
      titulo: "Sazonalidade: geração e consumo não combinam",
      blocos: [
        { tipo: "texto", texto: "Duas sazonalidades batem no caixa. A da GERAÇÃO solar: mais energia no verão, menos no inverno e em meses nublados — a usina gera menos créditos, o que pode reduzir o valor que a coop fatura ou obrigar a comprar mais energia da rede. A do CONSUMO dos cooperados: ar-condicionado no verão, chuveiro no inverno. E a das BANDEIRAS tarifárias (verde, amarela, vermelha), que encarecem a energia da rede em períodos secos e pressionam a saída de caixa." },
        {
          tipo: "prancha",
          titulo: "Geração x consumo ao longo do ano",
          desenho: {
            legenda: "Barras: consumo dos cooperados. Curva: geração da usina. Onde a curva fica abaixo das barras, o caixa aperta.",
            primitivas: [
              { t: "linha", de: [20, 170], ate: [305, 170], cor: "tinta" },
              { t: "linha", de: [20, 30], ate: [20, 170], cor: "tinta" },
              { t: "retangulo", p: [35, 90], w: 18, h: 80, cor: "suave" },
              { t: "retangulo", p: [75, 100], w: 18, h: 70, cor: "suave" },
              { t: "retangulo", p: [115, 120], w: 18, h: 50, cor: "suave" },
              { t: "retangulo", p: [155, 110], w: 18, h: 60, cor: "suave" },
              { t: "retangulo", p: [195, 95], w: 18, h: 75, cor: "suave" },
              { t: "retangulo", p: [235, 80], w: 18, h: 90, cor: "suave" },
              { t: "curva", pts: [[44, 60], [84, 70], [124, 95], [164, 110], [204, 100], [244, 70], [280, 55]], cor: "destaque" },
              { t: "rotulo", p: [120, 150], texto: "inverno: gera menos" },
              { t: "rotulo", p: [30, 24], texto: "kWh" },
              { t: "rotulo", p: [250, 48], texto: "geracao" },
            ],
          },
        },
        { tipo: "video", titulo: "São Paulo lidera a geração solar distribuída no Brasil (CNN)", youtube: "6JSIuVb43z4" },
      ],
    },
    {
      id: "ato-cooperativo-sobras",
      titulo: "Ato cooperativo, sobras e os fundos obrigatórios",
      blocos: [
        { tipo: "texto", texto: "A Lei 5.764/1971 cria conceitos que mudam o caixa de uma coop. O ATO COOPERATIVO (operação entre a coop e seus próprios cooperados) não é faturamento de mercado e não gera lucro tributável da mesma forma — por isso a energia repassada aos cooperados tem tratamento diferente da venda a terceiros. O resultado positivo da coop chama-se SOBRAS (não lucro). E parte das sobras vai obrigatoriamente para fundos: o Fundo de Reserva (mínimo 10%) e o FATES — Fundo de Assistência Técnica, Educacional e Social (mínimo 5%)." },
        { tipo: "texto", texto: "Para o caixa isso significa: nem toda sobra pode ser devolvida aos cooperados. Uma fatia fica retida nos fundos (que podem e devem estar aplicados, virando reserva de liquidez). Planejar o caixa de fim de ano numa coop é decidir quanto das sobras retorna aos membros e quanto reforça os fundos — uma decisão de assembleia, não só de tesouraria." },
        { tipo: "diagrama", titulo: "O destino das sobras", codigo: `flowchart TD
  R["Sobras do exercicio"] --> FR["Fundo de Reserva min 10%"]
  R --> FA["FATES min 5%"]
  R --> D["Sobras a dispor da assembleia"]
  D --> Ret["Retorno aos cooperados"]
  D --> Cap["Reforco dos fundos / reinvestimento"]` },
        {
          tipo: "fontes",
          titulo: "Fontes: cooperativismo e resultado",
          itens: [
            { titulo: "Lei nº 5.764/1971, arts. 3º, 79, 87 e 28 (ato cooperativo, sobras, FATES e Reserva)", url: "https://www.planalto.gov.br/ccivil_03/leis/l5764.htm", tipo: "norma", nota: "Base legal dos fundos obrigatórios e da natureza do ato cooperativo." },
            { titulo: "Código Civil (Lei 10.406/2002), arts. 1.093 a 1.096 — Sociedade Cooperativa", url: "https://www.planalto.gov.br/ccivil_03/leis/2002/l10406compilada.htm", tipo: "norma", nota: "Regras civis das cooperativas, complementares à Lei 5.764." },
            { titulo: "Sistema OCB / SomosCoop — portal institucional do cooperativismo", url: "https://www.somoscooperativismo.coop.br/", tipo: "site", nota: "Orientações, ramos e dados do cooperativismo brasileiro, incluindo o ramo infraestrutura/energia." },
          ],
        },
      ],
    },
    // ============================================================
    // MÉTODO: A DFC (CPC 03)
    // ============================================================
    {
      id: "dfc-o-que-e",
      titulo: "A Demonstração dos Fluxos de Caixa (DFC)",
      blocos: [
        { tipo: "texto", texto: "A DFC é o relatório oficial que explica, para um período, de onde veio e para onde foi o caixa. Ela é exigida pela Lei 11.638/2007 (que a tornou obrigatória no Brasil) e normatizada pelo CPC 03 (R2). A DFC organiza todo movimento em TRÊS atividades: operacional (o dia a dia da coop), investimento (comprar/vender ativos de longo prazo, como a usina) e financiamento (captar e pagar dívidas e capital). Dominar essa divisão é o coração do controle de caixa." },
        {
          tipo: "prancha",
          titulo: "As três caixas da DFC",
          desenho: {
            legenda: "Todo real que entra ou sai cai em uma das três caixas. A soma das três é a variação do saldo no período.",
            primitivas: [
              { t: "retangulo", p: [20, 40], w: 80, h: 110, cor: "tinta" },
              { t: "rotulo", p: [30, 34], texto: "OPERACIONAL" },
              { t: "rotulo", p: [26, 90], texto: "rateio, TUSD," },
              { t: "rotulo", p: [26, 104], texto: "O&M, pessoal" },
              { t: "retangulo", p: [120, 40], w: 80, h: 110, cor: "tinta" },
              { t: "rotulo", p: [130, 34], texto: "INVESTIMENTO" },
              { t: "rotulo", p: [126, 90], texto: "comprar usina," },
              { t: "rotulo", p: [126, 104], texto: "modulos" },
              { t: "retangulo", p: [220, 40], w: 80, h: 110, cor: "tinta" },
              { t: "rotulo", p: [230, 34], texto: "FINANCIAMENTO" },
              { t: "rotulo", p: [226, 90], texto: "emprestimo," },
              { t: "rotulo", p: [226, 104], texto: "cota-capital" },
              { t: "seta", de: [20, 165], ate: [300, 165], cor: "destaque" },
              { t: "rotulo", p: [95, 182], texto: "soma = variacao do caixa" },
            ],
          },
        },
        { tipo: "video", titulo: "Introdução ao Cooperativismo — Aula 1 (IFRO)", youtube: "9OGE2sYS1p4" },
      ],
    },
    {
      id: "tres-atividades",
      titulo: "Operacional, investimento, financiamento",
      blocos: [
        { tipo: "texto", texto: "OPERACIONAL é o motor: deve ser positivo no longo prazo, senão a coop depende de dívida para existir. INVESTIMENTO costuma ser negativo quando a coop está crescendo (comprando a usina, expandindo) e isso é saudável — é dinheiro virando ativo. FINANCIAMENTO é positivo quando a coop capta (empréstimo, cota) e negativo quando paga. A leitura conjunta conta a história: operacional forte + investimento negativo + financiamento negativo = coop madura pagando suas dívidas com o próprio caixa." },
        {
          tipo: "licao",
          pergunta: "Uma coop tem fluxo operacional NEGATIVO há 12 meses e se mantém só com empréstimos novos. O que isso indica?",
          alternativas: [
            "Saúde: está investindo no futuro",
            "Alerta grave: o dia a dia não se paga e a coop vive de dívida",
            "Nada — é normal para cooperativa",
          ],
          correta: 1,
          explicacao: "Operacional cronicamente negativo coberto por financiamento é insustentável: a atividade-fim não gera caixa. É o sinal clássico de insolvência se formando.",
        },
        {
          tipo: "tarefas",
          itens: [
            { id: "ta1", titulo: "Classifique 15 lançamentos do extrato nas 3 atividades", entrega: "Planilha com a coluna 'atividade' (O/I/F) preenchida e o subtotal de cada uma." },
            { id: "ta2", titulo: "Escreva o 'enredo' do mês em 3 frases", entrega: "Um parágrafo dizendo o que o operacional, o investimento e o financiamento revelaram sobre a coop neste mês." },
          ],
        },
      ],
    },
    {
      id: "metodo-direto",
      titulo: "Método direto: entradas e saídas na cara",
      blocos: [
        { tipo: "texto", texto: "A DFC operacional pode ser montada de dois jeitos. No MÉTODO DIRETO, você lista diretamente os grandes recebimentos e pagamentos de caixa: recebido de cooperados, pago à distribuidora, pago a pessoal, pago de tributos. É o mais intuitivo e o mais útil para gestão — fala a língua do tesoureiro. O CPC 03 incentiva o método direto justamente por essa clareza." },
        { tipo: "diagrama", titulo: "DFC operacional — método direto", codigo: `flowchart TD
  A["(+) Recebido de cooperados (rateio)"] --> T["(=) Caixa gerado nas operacoes"]
  B["(-) Pago a distribuidora (TUSD)"] --> T
  C["(-) Pago a fornecedores de O&M"] --> T
  D["(-) Pago a pessoal e encargos"] --> T
  E["(-) Pago de tributos"] --> T` },
        { tipo: "texto", texto: "Vantagem do direto: qualquer conselheiro entende. Desvantagem: exige o controle de caixa bem organizado por natureza (categoria), porque você precisa somar os pagamentos reais de cada tipo. Por isso a planilha de fluxo de caixa deste caderno já nasce categorizada — ela alimenta a DFC direta quase sozinha." },
      ],
    },
    {
      id: "metodo-indireto",
      titulo: "Método indireto: do resultado ao caixa",
      blocos: [
        { tipo: "texto", texto: "No MÉTODO INDIRETO, você parte das SOBRAS (resultado do período) e faz ajustes para chegar ao caixa: soma de volta a depreciação (despesa que não é saída de caixa), e corrige as variações de contas a receber, contas a pagar e estoques. É o método que reconcilia a contabilidade (competência) com o caixa — e revela onde o dinheiro ficou preso: se o 'a receber' cresceu, foi caixa que não entrou." },
        {
          tipo: "prancha",
          titulo: "A ponte do método indireto",
          desenho: {
            legenda: "Sai das sobras, soma a depreciação, ajusta variações de capital de giro e chega ao caixa operacional.",
            primitivas: [
              { t: "retangulo", p: [15, 80], w: 70, h: 40, cor: "tinta" },
              { t: "rotulo", p: [26, 104], texto: "SOBRAS" },
              { t: "seta", de: [85, 100], ate: [120, 100], cor: "tinta" },
              { t: "rotulo", p: [92, 70], texto: "+ deprec." },
              { t: "retangulo", p: [120, 80], w: 70, h: 40, cor: "suave" },
              { t: "rotulo", p: [124, 104], texto: "+/- CDG" },
              { t: "seta", de: [190, 100], ate: [225, 100], cor: "tinta" },
              { t: "rotulo", p: [196, 70], texto: "ajustes" },
              { t: "retangulo", p: [225, 80], w: 80, h: 40, cor: "destaque" },
              { t: "rotulo", p: [230, 104], texto: "CAIXA OPER." },
              { t: "rotulo", p: [110, 150], texto: "CDG = capital de giro" },
            ],
          },
        },
        {
          tipo: "licao",
          pergunta: "No método indireto, por que a depreciação da usina é SOMADA de volta ao resultado?",
          alternativas: [
            "Porque gera entrada de caixa",
            "Porque é uma despesa que reduziu as sobras mas NÃO saiu do caixa",
            "Porque é um imposto",
          ],
          correta: 1,
          explicacao: "Depreciação é despesa contábil sem desembolso. Ela reduziu as sobras, mas nenhum real saiu por ela; por isso é estornada para reconstruir o caixa.",
        },
      ],
    },
    {
      id: "montando-dfc-exemplo",
      titulo: "Exemplo: a DFC de uma coop pequena",
      blocos: [
        { tipo: "texto", texto: "Exemplo ILUSTRATIVO de uma coop de GD com ~180 cooperados e uma usina de 500 kWp (valores fictícios, em R$, mês fechado). OPERACIONAL: recebido de cooperados +65.800; pago à distribuidora (TUSD) -14.000; O&M -6.000; pessoal/pró-labore -12.000; contábil+jurídico -2.500; tributos -1.500; administrativo -1.800. Caixa operacional = +28.000. INVESTIMENTO: compra de módulos para expansão -20.000. FINANCIAMENTO: parcela do financiamento da usina -9.000; integralização de cota-capital de novos cooperados +4.000. Caixa de financiamento = -5.000." },
        { tipo: "texto", texto: "Somando: +28.000 (operacional) -20.000 (investimento) -5.000 (financiamento) = +3.000 de variação do caixa no mês. Se o saldo inicial era 40.000, o saldo final é 43.000. Leitura: o operacional banca o dia a dia com folga, a coop está investindo na expansão e ainda assim fechou o mês positiva — saudável. Se a expansão fosse maior, o mês fecharia negativo e exigiria usar reserva ou adiar o investimento." },
        {
          tipo: "prancha",
          titulo: "Cascata do caixa do mês (R$ mil, ilustrativo)",
          desenho: {
            legenda: "Começa em 40, sobe 28 no operacional, cai 20 no investimento, cai 5 no financiamento, termina em 43.",
            primitivas: [
              { t: "linha", de: [15, 175], ate: [305, 175], cor: "tinta" },
              { t: "retangulo", p: [20, 115], w: 40, h: 60, cor: "suave" },
              { t: "rotulo", p: [26, 108], texto: "inicio 40" },
              { t: "retangulo", p: [75, 75], w: 40, h: 40, cor: "destaque" },
              { t: "rotulo", p: [80, 68], texto: "+28 oper" },
              { t: "retangulo", p: [130, 75], w: 40, h: 30, cor: "tinta", hachura: true },
              { t: "rotulo", p: [134, 68], texto: "-20 inv" },
              { t: "retangulo", p: [185, 105], w: 40, h: 12, cor: "tinta", hachura: true },
              { t: "rotulo", p: [190, 98], texto: "-5 fin" },
              { t: "retangulo", p: [240, 110], w: 40, h: 65, cor: "suave" },
              { t: "rotulo", p: [246, 103], texto: "fim 43" },
            ],
          },
        },
      ],
    },
    {
      id: "caixa-equivalentes",
      titulo: "Caixa, equivalentes e os fundos aplicados",
      blocos: [
        { tipo: "texto", texto: "Na DFC, 'caixa' não é só o dinheiro na conta corrente: inclui os EQUIVALENTES DE CAIXA — aplicações de altíssima liquidez e baixo risco, resgatáveis em até 90 dias (CDB de liquidez diária, fundos DI). Numa coop, o Fundo de Reserva e o FATES costumam estar aplicados; a parte líquida deles é equivalente de caixa e funciona como colchão. O que NÃO é equivalente: ações, imóveis, cotas de longo prazo — esses são investimento, não liquidez." },
        {
          tipo: "licao",
          pergunta: "O Fundo de Reserva está num CDB de liquidez diária. Para a DFC, esse saldo é:",
          alternativas: [
            "Investimento de longo prazo",
            "Equivalente de caixa (compõe o colchão de liquidez)",
            "Receita do mês",
          ],
          correta: 1,
          explicacao: "Aplicação de alta liquidez e baixo risco, resgatável rapidamente, é equivalente de caixa pelo CPC 03 — entra no saldo que a coop pode usar numa emergência.",
        },
        {
          tipo: "fontes",
          titulo: "Fontes: a norma da DFC",
          itens: [
            { titulo: "Lei nº 11.638/2007 — torna a DFC obrigatória (altera a Lei das S.A.)", url: "https://www.planalto.gov.br/ccivil_03/_ato2007-2010/2007/lei/l11638.htm", tipo: "norma", nota: "Base legal da obrigatoriedade da DFC no Brasil." },
            { titulo: "CPC 03 (R2) — Demonstração dos Fluxos de Caixa", url: "http://www.cpc.org.br/CPC/Documentos-Emitidos/Pronunciamentos", tipo: "norma", nota: "Define as 3 atividades, métodos direto/indireto e o conceito de equivalentes de caixa." },
          ],
        },
      ],
    },
    // ============================================================
    // CÁLCULO / MEDIÇÃO
    // ============================================================
    {
      id: "planilha-fluxo",
      titulo: "A planilha de fluxo de caixa",
      blocos: [
        { tipo: "texto", texto: "A ferramenta de trabalho da tesouraria é uma planilha simples: linhas são as categorias (entradas e saídas); colunas são os períodos (dias, semanas ou meses). Em cada célula, o valor PREVISTO e, quando o período chega, o valor REALIZADO. No pé de cada coluna: saldo inicial + entradas - saídas = saldo final, que vira o saldo inicial da coluna seguinte. É essa corrente de saldos que você projeta para o futuro." },
        { tipo: "diagrama", titulo: "Estrutura da planilha", codigo: `flowchart LR
  SI["Saldo inicial"] --> SF["Saldo final"]
  E["(+) Entradas do periodo"] --> SF
  S["(-) Saidas do periodo"] --> SF
  SF --> SI2["vira Saldo inicial do proximo periodo"]` },
        { tipo: "texto", texto: "Para uma coop pequena, a visão de 13 SEMANAS (um trimestre, semana a semana) é padrão ouro: enxerga longe o bastante para agir, perto o bastante para ser precisa. Para planejamento, a visão de 12 MESES. As duas convivem na mesma lógica de saldo encadeado." },
      ],
    },
    {
      id: "projecao-caixa",
      titulo: "Projetar o caixa: ver o buraco antes de cair",
      blocos: [
        { tipo: "texto", texto: "Projetar é preencher as colunas futuras com estimativas realistas: entradas pela base de cooperados ativos e pela inadimplência histórica; saídas pelos contratos conhecidos (TUSD, pessoal, parcela do financiamento) e pela sazonalidade. O objetivo não é acertar na vírgula — é descobrir COM ANTECEDÊNCIA a semana em que o saldo fica negativo, para agir enquanto dá: antecipar cobrança, adiar um investimento, negociar prazo." },
        {
          tipo: "prancha",
          titulo: "Projeção de saldo: 13 semanas",
          desenho: {
            legenda: "A linha do saldo projetado cruza o zero na semana 7. A descoberta antecipada dá tempo de corrigir.",
            primitivas: [
              { t: "linha", de: [20, 30], ate: [20, 175], cor: "tinta" },
              { t: "linha", de: [20, 100], ate: [305, 100], cor: "tinta" },
              { t: "rotulo", p: [286, 96], texto: "zero" },
              { t: "curva", pts: [[20, 60], [60, 72], [100, 85], [140, 104], [180, 120], [210, 112], [250, 90], [300, 70]], cor: "destaque" },
              { t: "circulo", c: [150, 108], r: 6, cor: "destaque" },
              { t: "seta", de: [150, 130], ate: [150, 112], cor: "destaque" },
              { t: "rotulo", p: [120, 145], texto: "semana 7: saldo negativo" },
              { t: "rotulo", p: [24, 26], texto: "saldo R$" },
              { t: "rotulo", p: [250, 190], texto: "semanas" },
            ],
          },
        },
        {
          tipo: "tarefas",
          itens: [
            { id: "pj1", titulo: "Monte a projeção de 13 semanas da sua coop (ou de uma fictícia)", entrega: "Planilha com saldo encadeado por semana, destacando a primeira semana de saldo negativo (se houver)." },
            { id: "pj2", titulo: "Proponha 2 ações para a semana crítica", entrega: "Ex.: antecipar débito automático de 30% da base; adiar compra de inversor reserva. Mostre o novo saldo com as ações." },
          ],
        },
      ],
    },
    {
      id: "capital-de-giro",
      titulo: "Capital de giro e a necessidade (NCG)",
      blocos: [
        { tipo: "texto", texto: "Capital de giro é o dinheiro que a coop precisa manter disponível para rodar entre pagar a distribuidora e receber dos cooperados. A NECESSIDADE de capital de giro (NCG) nasce dessa defasagem: quanto maior o prazo médio de recebimento e menor o prazo de pagamento, maior a NCG. Numa coop de energia, pagar a distribuidora no dia 5 e receber do cooperado no dia 15 cria uma NCG permanente de cerca de meio mês de custos." },
        { tipo: "texto", texto: "Reduzir a NCG é liberar dinheiro parado. Alavancas: antecipar a data de cobrança para antes do vencimento da distribuidora; incentivar débito automático e PIX (recebe na hora); negociar com a distribuidora/fornecedores prazos mais longos; manter um fundo de reserva que financie a NCG sem custo de empréstimo." },
        {
          tipo: "licao",
          pergunta: "A coop paga a distribuidora dia 5 e recebe dos cooperados dia 20. Qual a ação que MAIS reduz a necessidade de capital de giro?",
          alternativas: [
            "Comprar mais módulos solares",
            "Antecipar a cobrança dos cooperados para o dia 3 (antes de pagar a distribuidora)",
            "Aumentar o pró-labore",
          ],
          correta: 1,
          explicacao: "Receber ANTES de pagar fecha a defasagem e derruba a NCG. É a alavanca mais barata: não custa juros, só disciplina de cobrança.",
        },
      ],
    },
    {
      id: "inadimplencia",
      titulo: "Inadimplência: o furo silencioso",
      blocos: [
        { tipo: "texto", texto: "Inadimplência é o rombo que não aparece na DRE mas drena o caixa: o cooperado consumiu o crédito de energia, a coop já pagou a TUSD por ele, mas o boleto não foi pago. Cada inadimplente vira capital de giro extra que a coop precisa cobrir. Por isso se mede a TAXA de inadimplência (valor vencido e não pago / valor faturado) e se cria uma régua de cobrança e uma provisão para perdas." },
        { tipo: "diagrama", titulo: "O ciclo da inadimplência", codigo: `flowchart TD
  F["Boleto emitido"] --> V{"Pago no vencimento?"}
  V -->|Sim| OK["Caixa normal"]
  V -->|Nao| D1["D+3: lembrete amigavel"]
  D1 --> D2["D+10: cobranca formal"]
  D2 --> D3["D+30: notificacao e negociacao"]
  D3 --> D4["persistiu: medidas estatutarias"]` },
        { tipo: "texto", texto: "Numa cooperativa, o inadimplente é um DONO, não um cliente qualquer — a cobrança tem de ser firme mas respeitar o estatuto e o vínculo associativo. A assembleia e o conselho fiscal acompanham a inadimplência; casos extremos podem levar à exclusão do quadro social, conforme o estatuto. O caixa, porém, não espera: provisão e régua de cobrança são inegociáveis." },
      ],
    },
    {
      id: "indicadores",
      titulo: "Indicadores: medir a saúde do caixa",
      blocos: [
        { tipo: "texto", texto: "Poucos números, bem escolhidos, dizem como está o caixa. LIQUIDEZ CORRENTE (ativo circulante / passivo circulante): acima de 1 significa que o curto prazo se paga. MARGEM DE SOBRA (sobras / ingressos). COBERTURA DE CAIXA (caixa + equivalentes / saída média mensal): quantos meses a coop sobrevive sem receber nada — o 'runway'. E o CAIXA OPERACIONAL / SERVIÇO DA DÍVIDA: se o operacional cobre as parcelas do financiamento da usina." },
        {
          tipo: "prancha",
          titulo: "Painel de bordo do tesoureiro",
          desenho: {
            legenda: "Quatro mostradores: liquidez, runway em meses, inadimplência e cobertura da dívida.",
            primitivas: [
              { t: "circulo", c: [70, 70], r: 34, cor: "tinta" },
              { t: "seta", de: [70, 70], ate: [92, 52], cor: "destaque" },
              { t: "rotulo", p: [48, 118], texto: "Liquidez 1,4" },
              { t: "circulo", c: [230, 70], r: 34, cor: "tinta" },
              { t: "seta", de: [230, 70], ate: [250, 78], cor: "destaque" },
              { t: "rotulo", p: [205, 118], texto: "Runway 3 meses" },
              { t: "retangulo", p: [40, 140], w: 90, h: 24, cor: "suave" },
              { t: "rotulo", p: [46, 156], texto: "Inadimpl. 4%" },
              { t: "retangulo", p: [185, 140], w: 90, h: 24, cor: "suave" },
              { t: "rotulo", p: [191, 156], texto: "Cobertura 1,8x" },
            ],
          },
        },
        {
          tipo: "licao",
          pergunta: "A coop tem caixa+equivalentes de R$ 90 mil e saída média mensal de R$ 45 mil. Qual o 'runway'?",
          alternativas: ["Meio mês", "2 meses", "4 meses"],
          correta: 1,
          explicacao: "Runway = 90 / 45 = 2 meses. É quanto a coop sobreviveria pagando tudo sem nenhuma entrada. Abaixo de 1–2 meses, acende o alerta.",
        },
      ],
    },
    {
      id: "ponto-de-equilibrio",
      titulo: "Ponto de equilíbrio e rateio do custo fixo",
      blocos: [
        { tipo: "texto", texto: "O ponto de equilíbrio é quanto a coop precisa arrecadar para cobrir todos os custos (fixos + variáveis) e fechar no zero. Custos FIXOS (pessoal, contabilidade, seguro, parcela do financiamento) não mudam com o consumo; VARIÁVEIS (TUSD proporcional, parte do O&M) acompanham a energia. O rateio mensal de cada cooperado tem de cobrir a parte fixa que lhe cabe mais a energia que consumiu. Se a base de cooperados encolhe, o custo fixo se divide entre menos gente e o rateio sobe — risco clássico da coop." },
        { tipo: "diagrama", titulo: "Composição do rateio do cooperado", codigo: `flowchart TD
  R["Rateio mensal do cooperado"] --> A["Parte fixa: rateio dos custos fixos / num. cooperados"]
  R --> B["Parte variavel: TUSD e O&M proporcionais ao consumo"]
  R --> C["Contribuicao para fundos e reinvestimento"]` },
        {
          tipo: "fontes",
          titulo: "Fontes: finanças e geração distribuída",
          itens: [
            { titulo: "ANEEL — Micro e Minigeração Distribuída (página oficial)", url: "https://www.gov.br/aneel/pt-br/assuntos/geracao-distribuida", tipo: "site", nota: "Regras de compensação, custo de disponibilidade e TUSD fio B que entram no rateio." },
            { titulo: "ANEEL Dados Abertos — Relação de empreendimentos de GD (dataset)", url: "https://dadosabertos.aneel.gov.br/dataset/relacao-de-empreendimentos-de-geracao-distribuida", tipo: "dataset", nota: "Base aberta com potência, fonte e localização de cada usina de GD — útil para benchmark de porte." },
          ],
        },
      ],
    },
    // ============================================================
    // PROJETO
    // ============================================================
    {
      id: "orcamento-anual",
      titulo: "Orçamento anual e o fluxo projetado",
      blocos: [
        { tipo: "texto", texto: "O orçamento é o fluxo de caixa de 12 meses construído ANTES do ano começar. Projeta-se a base de cooperados (entradas e saídas crescem de acordo), a sazonalidade da geração e do consumo, os reajustes de TUSD e de pessoal, as parcelas do financiamento e os investimentos planejados. O orçamento vira a régua: todo mês compara-se o realizado com o previsto e explica-se a diferença. Sem orçamento, a tesouraria apaga incêndio; com ele, navega." },
        {
          tipo: "tarefas",
          itens: [
            { id: "or1", titulo: "Liste as premissas do orçamento do próximo ano", entrega: "Uma folha com: nº de cooperados previsto, reajuste da TUSD, reajuste de pessoal, meses de maior/menor geração e investimentos planejados." },
            { id: "or2", titulo: "Monte o fluxo projetado de 12 meses", entrega: "Planilha mês a mês com saldo encadeado, apontando os meses de aperto e a reserva mínima necessária." },
          ],
        },
        { tipo: "video", titulo: "Conheça o cooperativismo: a história do movimento (Aurora Coop)", youtube: "dUXBUhfhrVI" },
      ],
    },
    {
      id: "tarifa-rateio",
      titulo: "Calibrar o rateio para fechar o caixa",
      blocos: [
        { tipo: "texto", texto: "O valor do rateio é a alavanca que fecha o caixa — e é decisão de assembleia, não de tesouraria sozinha. Calcula-se partindo do orçamento: soma-se o custo total anual (fixo + variável + serviço da dívida + contribuição aos fundos + uma margem de segurança) e divide-se pela base de cooperados e pelo consumo. Um rateio baixo demais agrada no curto prazo e quebra a coop; alto demais afasta cooperados e também encolhe a base. O ponto certo cobre o custo e ainda recompõe a reserva." },
        {
          tipo: "prancha",
          titulo: "O rateio que equilibra",
          desenho: {
            legenda: "A barra da esquerda é o custo total; a da direita, a arrecadação pelo rateio. Elas têm de se igualar, com uma folga de reserva.",
            primitivas: [
              { t: "linha", de: [20, 175], ate: [305, 175], cor: "tinta" },
              { t: "retangulo", p: [45, 60], w: 60, h: 115, cor: "tinta", hachura: true },
              { t: "rotulo", p: [48, 50], texto: "CUSTO total" },
              { t: "retangulo", p: [200, 50], w: 60, h: 125, cor: "destaque" },
              { t: "rotulo", p: [196, 40], texto: "ARRECADACAO" },
              { t: "linha", de: [45, 60], ate: [260, 60], cor: "suave" },
              { t: "rotulo", p: [120, 100], texto: "folga = reserva" },
              { t: "seta", de: [150, 110], ate: [205, 70], cor: "destaque" },
            ],
          },
        },
        {
          tipo: "licao",
          pergunta: "Quem decide o valor do rateio/mensalidade numa cooperativa?",
          alternativas: [
            "O tesoureiro, sozinho, pelo orçamento",
            "A assembleia dos cooperados, a partir da proposta orçamentária",
            "A distribuidora de energia",
          ],
          correta: 1,
          explicacao: "Gestão democrática: a assembleia aprova o rateio com base no orçamento. A tesouraria propõe e executa; a soberania é do quadro social.",
        },
      ],
    },
    {
      id: "investimento-usina",
      titulo: "O fluxo de caixa do projeto da usina",
      blocos: [
        { tipo: "texto", texto: "Instalar ou expandir a usina é um projeto com fluxo de caixa próprio: um desembolso grande no começo (módulos, inversores, estrutura, projeto) e, depois, anos de economia/receita (os créditos de energia que a usina gera). Avalia-se com três ferramentas: PAYBACK (em quantos anos o investimento se paga — tipicamente 4 a 7 anos em solar no Brasil), VPL (valor presente líquido: traz os fluxos futuros a valor de hoje; positivo = cria valor) e TIR (a taxa de retorno do projeto, comparada ao custo do financiamento)." },
        { tipo: "diagrama", titulo: "Fluxo de caixa do projeto no tempo", codigo: `flowchart LR
  I["Ano 0: desembolso -R$"] --> A1["Ano 1: +economia"]
  A1 --> A2["Ano 2: +economia"]
  A2 --> A3["... payback ~5 anos ..."]
  A3 --> A4["Anos 6-25: +economia liquida"]` },
        { tipo: "texto", texto: "Cuidado de coop: o fluxo do projeto é de LONGO prazo (25 anos de vida dos módulos), mas o caixa operacional é de CURTO prazo. Um projeto com VPL positivo pode, ainda assim, estourar o caixa no ano 0 se não houver financiamento ou reserva. Por isso o projeto só vai à assembleia acompanhado do impacto no fluxo de caixa dos próximos 12 a 24 meses." },
      ],
    },
    {
      id: "financiamento",
      titulo: "Financiar a usina sem afogar o caixa",
      blocos: [
        { tipo: "texto", texto: "Para bancar o desembolso do ano 0, a coop tem opções: capital próprio (cota-capital dos cooperados e reservas), financiamento bancário (linhas de energia renovável, BNDES, cooperativas de crédito) ou uma combinação. A regra de ouro do caixa: a parcela mensal do financiamento deve caber no fluxo de caixa operacional projetado, de preferência ficando abaixo da economia mensal que a usina gera — assim o projeto se paga enquanto é pago." },
        {
          tipo: "mobilizacao",
          papel: "Engenheiro(a) eletricista com registro no CREA (responsável técnico do projeto da usina)",
          porque: "Dimensionar a usina, assinar a ART, garantir conformidade com as normas da distribuidora e da ANEEL e validar a estimativa de geração que alimenta o fluxo de caixa do projeto são atos privativos de engenheiro habilitado — não se improvisa nem se faz por conta própria.",
          entregaEsperada: "Projeto elétrico com ART, memorial de cálculo da geração anual estimada (kWh) e parecer de acesso aprovado pela distribuidora, para sustentar as premissas de receita do fluxo de caixa.",
          gerenciadoPor: "zaeon",
        },
        { tipo: "video", titulo: "Como funciona um medidor bidirecional de energia solar (Evosolar)", youtube: "-SQm0_WOgkE" },
      ],
    },
    // ============================================================
    // EXECUÇÃO
    // ============================================================
    {
      id: "rotina-tesouraria",
      titulo: "A rotina da tesouraria",
      blocos: [
        { tipo: "texto", texto: "Caixa saudável é resultado de rotina, não de talento. Diário: conferir o saldo bancário e os recebimentos do dia; liberar só os pagamentos previstos. Semanal: atualizar a projeção de 13 semanas com o realizado; rodar a régua de cobrança dos inadimplentes. Mensal: conciliar o banco, fechar a DFC, comparar realizado x orçado e reportar ao conselho. Anual: fechar o exercício, apurar sobras e propor o orçamento do ano seguinte à assembleia." },
        { tipo: "diagrama", titulo: "Cadência da tesouraria", codigo: `flowchart TD
  D["Diario: saldo, recebimentos, pagamentos previstos"] --> S["Semanal: projecao 13 semanas + cobranca"]
  S --> M["Mensal: conciliacao, DFC, realizado x orcado"]
  M --> A["Anual: fechamento, sobras, orcamento"]` },
        {
          tipo: "tarefas",
          itens: [
            { id: "rt1", titulo: "Escreva o checklist diário da sua tesouraria", entrega: "Lista de 5 a 7 itens que o tesoureiro confere todo dia antes de liberar qualquer pagamento." },
            { id: "rt2", titulo: "Defina o 'teto de alçada' de pagamento", entrega: "Regra escrita: até R$ X o tesoureiro paga sozinho; acima disso exige dupla assinatura (segregação de função)." },
          ],
        },
      ],
    },
    {
      id: "conciliacao-bancaria",
      titulo: "Conciliação bancária: a verdade do saldo",
      blocos: [
        { tipo: "texto", texto: "Conciliar é confrontar, lançamento a lançamento, o que a planilha diz com o que o extrato bancário mostra. Diferenças têm causa: um boleto que a planilha previu recebido mas não caiu; uma tarifa bancária não lançada; um PIX duplicado. A conciliação mensal (idealmente semanal) é o que impede a planilha de 'descolar' da realidade — e é a primeira barreira contra erro e fraude. Sem conciliação, todo o resto do controle é ficção." },
        {
          tipo: "licao",
          pergunta: "A planilha mostra saldo de R$ 50 mil; o extrato mostra R$ 47 mil. Qual o primeiro passo?",
          alternativas: [
            "Confiar na planilha e ignorar o banco",
            "Conciliar lançamento a lançamento para achar os R$ 3 mil de diferença",
            "Pedir empréstimo de R$ 3 mil",
          ],
          correta: 1,
          explicacao: "A conciliação localiza a origem da diferença (boleto não compensado, tarifa, duplicidade). O extrato é o fato; a planilha tem de ser ajustada à verdade do banco.",
        },
        { tipo: "video", titulo: "Como formar uma cooperativa (Sistema OCB)", youtube: "x_t_CjEBc1o" },
      ],
    },
    {
      id: "cobranca",
      titulo: "Régua de cobrança e meios de recebimento",
      blocos: [
        { tipo: "texto", texto: "A régua de cobrança é a sequência padronizada de ações quando um rateio atrasa: lembrete amigável antes do vencimento (reduz esquecimento), aviso no dia seguinte, cobrança formal em D+10, negociação em D+30 e, por fim, as medidas previstas no estatuto. Automatizar a régua (mensagem e boleto por e-mail/WhatsApp) é o que mantém a inadimplência baixa sem desgaste pessoal. O meio de recebimento importa: PIX e débito automático caem na hora; boleto demora e tem custo." },
        {
          tipo: "prancha",
          titulo: "A régua de cobrança no calendário",
          desenho: {
            legenda: "Linha do tempo a partir do vencimento: cada marca é um passo da régua.",
            primitivas: [
              { t: "linha", de: [20, 100], ate: [300, 100], cor: "tinta" },
              { t: "linha", de: [40, 92], ate: [40, 108], cor: "suave" },
              { t: "rotulo", p: [16, 84], texto: "D-2 lembrete" },
              { t: "linha", de: [110, 92], ate: [110, 108], cor: "destaque" },
              { t: "rotulo", p: [92, 120], texto: "D0 vencimento" },
              { t: "linha", de: [175, 92], ate: [175, 108], cor: "tinta" },
              { t: "rotulo", p: [158, 84], texto: "D+10 formal" },
              { t: "linha", de: [245, 92], ate: [245, 108], cor: "tinta" },
              { t: "rotulo", p: [222, 120], texto: "D+30 negociar" },
              { t: "seta", de: [290, 100], ate: [300, 100], cor: "tinta" },
            ],
          },
        },
        {
          tipo: "tarefas",
          itens: [
            { id: "cb1", titulo: "Redija os 4 textos da régua (D-2, D0, D+10, D+30)", entrega: "Quatro mensagens curtas, firmes e respeitosas, tratando o cooperado como dono — prontas para automatizar." },
          ],
        },
      ],
    },
    {
      id: "controles-internos",
      titulo: "Controles internos e segregação de função",
      blocos: [
        { tipo: "texto", texto: "Controle interno é o conjunto de travas que protege o caixa de erro e fraude: segregação de função (quem lança não é quem aprova nem quem concilia), dupla assinatura acima de um valor, alçadas claras, conta bancária única para a coop (nunca mistura com a conta pessoal de ninguém) e trilha de auditoria (todo pagamento com documento). Numa coop, soma-se a transparência associativa: os cooperados são donos e têm direito de ver as contas." },
        {
          tipo: "mobilizacao",
          papel: "Contador(a) ou técnico(a) em contabilidade com registro ativo no CRC",
          porque: "A escrituração da coop, a elaboração do balanço e da DFC oficiais, a apuração das sobras, o rateio contábil entre ato cooperativo e não cooperativo e as obrigações fiscais são atos técnicos privativos da contabilidade (exigência legal). O controle gerencial de caixa não substitui a contabilidade formal.",
          entregaEsperada: "Plano de contas da cooperativa, escrituração mensal, DFC e demais demonstrações do exercício, e orientação sobre a segregação tributária do ato cooperativo.",
          gerenciadoPor: "zaeon",
        },
        {
          tipo: "licao",
          pergunta: "Qual prática é a trava mais básica de controle interno de caixa?",
          alternativas: [
            "Deixar uma só pessoa lançar, aprovar e conciliar, por agilidade",
            "Segregar funções: quem lança não é quem aprova nem quem concilia",
            "Usar a conta pessoal do tesoureiro para adiantar pagamentos",
          ],
          correta: 1,
          explicacao: "Segregação de função é o pilar do controle: separar lançar, aprovar e conciliar impede que um erro ou desvio passe despercebido por uma única pessoa.",
        },
      ],
    },
    // ============================================================
    // MANUTENÇÃO
    // ============================================================
    {
      id: "fechamento-mensal",
      titulo: "Fechamento mensal: realizado x projetado",
      blocos: [
        { tipo: "texto", texto: "No fim do mês, o fechamento confronta o que foi PROJETADO com o que foi REALIZADO, categoria por categoria, e exige explicação para cada desvio relevante. A TUSD veio maior? Houve bandeira vermelha? A arrecadação veio menor? A inadimplência subiu? Esse ritual transforma a planilha em aprendizado: as premissas do mês seguinte ficam mais afiadas, e o conselho recebe um relatório que conta a história do caixa com números e causas." },
        {
          tipo: "prancha",
          titulo: "Projetado x realizado do mês",
          desenho: {
            legenda: "Para cada categoria, a barra clara é o previsto e a escura é o realizado. O desvio é o que se explica.",
            primitivas: [
              { t: "linha", de: [20, 175], ate: [305, 175], cor: "tinta" },
              { t: "retangulo", p: [35, 80], w: 20, h: 95, cor: "suave" },
              { t: "retangulo", p: [58, 70], w: 20, h: 105, cor: "destaque" },
              { t: "rotulo", p: [34, 190], texto: "Rateio" },
              { t: "retangulo", p: [130, 110], w: 20, h: 65, cor: "suave" },
              { t: "retangulo", p: [153, 100], w: 20, h: 75, cor: "destaque" },
              { t: "rotulo", p: [134, 190], texto: "TUSD" },
              { t: "retangulo", p: [225, 130], w: 20, h: 45, cor: "suave" },
              { t: "retangulo", p: [248, 135], w: 20, h: 40, cor: "destaque" },
              { t: "rotulo", p: [224, 190], texto: "O&M" },
              { t: "rotulo", p: [70, 40], texto: "claro=previsto escuro=real" },
            ],
          },
        },
        {
          tipo: "tarefas",
          itens: [
            { id: "fm1", titulo: "Faça o fechamento de um mês real (ou simulado)", entrega: "Tabela previsto x realizado por categoria, com a coluna 'desvio' e uma frase de causa em cada desvio acima de 10%." },
          ],
        },
      ],
    },
    {
      id: "prestacao-contas",
      titulo: "Prestação de contas: a coop é dos cooperados",
      blocos: [
        { tipo: "texto", texto: "Diferente de uma empresa, a cooperativa presta contas aos seus DONOS — os cooperados — em assembleia. Anualmente apresenta-se o balanço, a DFC, a demonstração de sobras ou perdas e o relatório da gestão. O CONSELHO FISCAL (eleito pelos cooperados) acompanha as contas ao longo do ano e emite parecer. Transparência não é cortesia: é princípio cooperativo (gestão democrática) e exigência da Lei 5.764. Um caixa bem controlado o ano inteiro torna a prestação de contas um evento tranquilo, não um susto." },
        {
          tipo: "mobilizacao",
          papel: "Conselho Fiscal da cooperativa (e, conforme porte/estatuto, auditoria independente)",
          porque: "A fiscalização das contas e a emissão de parecer sobre o balanço e a DFC são atribuições estatutárias do Conselho Fiscal, eleito pelos cooperados; cooperativas de maior porte podem precisar de auditoria independente. É uma função de controle que, por princípio, não pode ser exercida por quem executa a tesouraria.",
          entregaEsperada: "Parecer do Conselho Fiscal sobre as demonstrações do exercício e, quando exigido, relatório de auditoria independente, para aprovação em assembleia geral.",
          gerenciadoPor: "zaeon",
        },
        { tipo: "video", titulo: "A história do SICREDI e do cooperativismo de crédito no Brasil", youtube: "b3VkCHYnldQ" },
      ],
    },
    {
      id: "riscos-cenarios",
      titulo: "Gestão de risco: estressar o caixa",
      blocos: [
        { tipo: "texto", texto: "Projetar um cenário só (o provável) é apostar. A tesouraria madura roda três: BASE (o esperado), PESSIMISTA (inadimplência sobe, geração cai num inverno nublado, TUSD reajusta acima do previsto, um cooperado grande sai) e OTIMISTA (base cresce, geração forte). Para cada um, vê-se o saldo mínimo do ano. O planejamento de verdade garante que, mesmo no cenário pessimista, a reserva segura o caixa sem recorrer a empréstimo caro de emergência." },
        {
          tipo: "prancha",
          titulo: "Três cenários de saldo no ano",
          desenho: {
            legenda: "Três trajetórias do saldo. A pessimista encosta no zero: a reserva tem de cobrir esse vale.",
            primitivas: [
              { t: "linha", de: [20, 30], ate: [20, 175], cor: "tinta" },
              { t: "linha", de: [20, 150], ate: [305, 150], cor: "tinta" },
              { t: "rotulo", p: [284, 146], texto: "zero" },
              { t: "curva", pts: [[20, 110], [80, 95], [140, 80], [200, 65], [260, 50], [300, 42]], cor: "suave" },
              { t: "rotulo", p: [255, 36], texto: "otimista" },
              { t: "curva", pts: [[20, 110], [80, 105], [140, 100], [200, 95], [260, 88], [300, 85]], cor: "tinta" },
              { t: "rotulo", p: [255, 78], texto: "base" },
              { t: "curva", pts: [[20, 110], [70, 120], [120, 135], [170, 145], [210, 140], [260, 130], [300, 120]], cor: "destaque" },
              { t: "rotulo", p: [120, 165], texto: "pessimista encosta no zero" },
            ],
          },
        },
        {
          tipo: "licao",
          pergunta: "Qual o propósito principal de rodar um cenário pessimista no fluxo de caixa?",
          alternativas: [
            "Assustar os cooperados",
            "Dimensionar a reserva mínima para sobreviver ao pior caso sem crédito de emergência",
            "Aumentar o rateio todo mês",
          ],
          correta: 1,
          explicacao: "O cenário pessimista revela o vale mais fundo do saldo. A reserva é calibrada para cobrir esse vale — é assim que a coop evita o empréstimo caro de última hora.",
        },
      ],
    },
    // ============================================================
    // CASOS REAIS E RECURSOS
    // ============================================================
    {
      id: "casos",
      titulo: "Casos reais: o cooperativismo de energia funciona",
      blocos: [
        { tipo: "texto", texto: "O cooperativismo de energia tem décadas de caixa real no Brasil. As cooperativas de ELETRIFICAÇÃO RURAL do Sul e do Sudeste — como as gaúchas Certel, Coprel e Creral e várias no interior paulista e catarinense — levaram energia ao campo a partir dos anos 1940-60, quando nenhuma concessionária achava rentável, e muitas se tornaram distribuidoras ou permissionárias reguladas pela ANEEL, com balanço, DFC e assembleia. Mais recentemente, cooperativas e consórcios de GERAÇÃO DISTRIBUÍDA solar se multiplicaram após a REN 482/2012 e a Lei 14.300/2022, reunindo cooperados para dividir uma usina e a economia na conta." },
        { tipo: "texto", texto: "A lição de caixa comum a todos esses casos: a disciplina de arrecadar dos cooperados ANTES de pagar a rede, manter reserva para a sazonalidade e a inadimplência, e tratar a usina como projeto de longo prazo financiado sem sufocar o giro. Onde o caixa foi controlado com DFC e projeção, a coop atravessou reajustes e crises; onde se olhou só o resultado, faltou dinheiro em mês de sobra." },
        {
          tipo: "fontes",
          titulo: "Fontes: casos e marco regulatório",
          itens: [
            { titulo: "Lei nº 14.300/2022 — marco legal da GD e Sistema de Compensação (SCEE)", url: "https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2022/lei/l14300.htm", tipo: "norma", nota: "Regras atuais de compensação e da cobrança gradual da TUSD fio B." },
            { titulo: "Lei nº 12.690/2012 — Cooperativas de Trabalho (referência de organização cooperativa)", url: "https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2012/lei/l12690.htm", tipo: "norma", nota: "Modelo de organização e PRONACOOP; complementa a Lei 5.764 para o trabalho associado." },
            { titulo: "Sistema OCB / SomosCoop — ramo infraestrutura e dados do cooperativismo", url: "https://www.somoscooperativismo.coop.br/", tipo: "site", nota: "Panorama do ramo de energia/infraestrutura e orientação institucional." },
          ],
        },
      ],
    },
    {
      id: "recursos",
      titulo: "Caixa de ferramentas",
      blocos: [
        { tipo: "texto", texto: "Reúna o que sustenta a prática: as normas (Lei 5.764, Lei 14.300, Lei 11.638, Código Civil, CPC 03), os dados abertos da ANEEL para benchmark, o portal do Sistema OCB para orientação cooperativa, e uma planilha de fluxo de caixa de 13 semanas e de 12 meses que você mantém viva. A regra final: nenhuma decisão de caixa sem olhar a projeção, e nenhuma prestação de contas sem a DFC." },
        {
          tipo: "fontes",
          titulo: "Biblioteca do caderno (tudo verificado)",
          itens: [
            { titulo: "CPC 03 (R2) — Demonstração dos Fluxos de Caixa (CPC)", url: "http://www.cpc.org.br/CPC/Documentos-Emitidos/Pronunciamentos", tipo: "norma", nota: "A norma técnica da DFC: estrutura, métodos e equivalentes de caixa." },
            { titulo: "Lei nº 11.638/2007 (obrigatoriedade da DFC)", url: "https://www.planalto.gov.br/ccivil_03/_ato2007-2010/2007/lei/l11638.htm", tipo: "norma" },
            { titulo: "Lei nº 5.764/1971 (cooperativismo, sobras, FATES)", url: "https://www.planalto.gov.br/ccivil_03/leis/l5764.htm", tipo: "norma" },
            { titulo: "Código Civil, arts. 1.093–1.096 (sociedade cooperativa)", url: "https://www.planalto.gov.br/ccivil_03/leis/2002/l10406compilada.htm", tipo: "norma" },
            { titulo: "ANEEL — Micro e Minigeração Distribuída", url: "https://www.gov.br/aneel/pt-br/assuntos/geracao-distribuida", tipo: "site" },
            { titulo: "ANEEL Dados Abertos — Empreendimentos de GD", url: "https://dadosabertos.aneel.gov.br/dataset/relacao-de-empreendimentos-de-geracao-distribuida", tipo: "dataset", nota: "Para comparar o porte da sua usina com a média do país." },
          ],
        },
        {
          tipo: "licao",
          pergunta: "Qual a regra de ouro deste caderno?",
          alternativas: [
            "Maximizar as sobras contábeis a qualquer custo",
            "Nenhuma decisão de caixa sem olhar a projeção; nenhuma prestação de contas sem a DFC",
            "Guardar todo o dinheiro parado na conta corrente",
          ],
          correta: 1,
          explicacao: "Caixa se governa com projeção (olhar à frente) e com a DFC (prestar contas do passado). As duas juntas são o controle completo do fluxo de caixa de uma coop de energia.",
        },
      ],
    },
    // ============================================================
    // SÍNTESE
    // ============================================================
    {
      id: "compilado",
      titulo: "Prancha de síntese",
      blocos: [
        { tipo: "texto", texto: "Fecho do caderno. Fluxo de caixa é o oxigênio de uma cooperativa de energia: o rateio dos cooperados entra, a TUSD, o O&M, o pessoal, os tributos e a parcela da usina saem, e o que sobra vira reserva e sobras divididas em assembleia. Controle isso com a DFC (CPC 03) em três atividades — operacional, investimento, financiamento — e com a planilha de projeção de 13 semanas e 12 meses. Separe caixa de competência, dimensione o capital de giro, combata a inadimplência com régua de cobrança, calibre o rateio em assembleia e estresse três cenários para dimensionar a reserva. Chame o engenheiro para a usina, o contador para a escrituração e o conselho fiscal para a prestação de contas. Lucro é opinião; caixa é fato — e numa coop, o caixa é de todos." },
        { tipo: "compilado" },
      ],
    },
  ],
};
