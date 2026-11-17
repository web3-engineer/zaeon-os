import type { CadernoEstudo } from "../cadernosEstudo";

/**
 * Caderno de campo: "Como surgiram as cooperativas de trabalho no Brasil".
 * Humanas — história e economia do cooperativismo. Todo dado, data, número e norma
 * tem lastro em fonte real (ver páginas "fontes" ao longo do caderno).
 */
export const caderno: CadernoEstudo = {
  id: "cooperativas",
  titulo: "Como surgiram as cooperativas de trabalho no Brasil",
  resumo:
    "Da loja de Rochdale (1844) à Lei 12.690/2012: a história, a economia e o passo a passo de uma cooperativa de trabalho — com fontes, casos reais e o que fazer na prática.",
  paginas: [
    // ===================== CONTEXTO =====================
    {
      id: "abertura",
      titulo: "O que é uma cooperativa de trabalho",
      blocos: [
        { tipo: "texto", texto: "Uma cooperativa é uma associação autônoma de pessoas que se unem voluntariamente para atender necessidades comuns por meio de uma empresa de propriedade coletiva e gestão democrática (definição da Aliança Cooperativa Internacional, 1995). A cooperativa de TRABALHO é a espécie em que os próprios trabalhadores são os donos: não há patrão de um lado e empregado do outro — os sócios organizam o próprio trabalho e repartem o resultado." },
        { tipo: "texto", texto: "No Brasil ela tem lei própria desde 2012 (Lei 12.690). Antes disso, a história é longa: passa pela Inglaterra de 1844, pela Ouro Preto de 1889 e pelas fraudes dos anos 1990. Este caderno percorre esse caminho e termina com o passo a passo para montar uma de verdade." },
        { tipo: "diagrama", titulo: "Empresa comum x cooperativa de trabalho", codigo: `flowchart TD
  subgraph Empresa["Empresa comum"]
    A["Dono/capital"] --> B["Contrata empregados"]
    B --> C["Lucro vai ao dono"]
  end
  subgraph Coop["Cooperativa de trabalho"]
    D["Trabalhadores = sócios"] --> E["Gestão democrática: 1 voto cada"]
    E --> F["Sobras repartidas entre sócios"]
  end` },
      ],
    },
    {
      id: "porque",
      titulo: "Por que elas surgiram: a questão social",
      blocos: [
        { tipo: "texto", texto: "O cooperativismo nasce como resposta à Revolução Industrial. No século XIX, teares a vapor jogaram artesãos no desemprego, jornadas passavam de 14 horas e salários mal pagavam o pão. Pensadores como Robert Owen e Charles Fourier propuseram a autogestão: se o trabalhador não controla a fábrica, que controle ao menos a própria organização econômica. Dessa ideia vieram as primeiras cooperativas." },
        { tipo: "texto", texto: "A lógica é simples e continua atual: juntando compras, crédito ou mão de obra, muitas pessoas pequenas conseguem o que nenhuma delas conseguiria sozinha — preço melhor, acesso a mercado e renda mais justa, sem um intermediário ficando com a maior fatia." },
        { tipo: "video", titulo: "Como surgiu o cooperativismo?", youtube: "9K2bLJ0OV2M" },
        {
          tipo: "licao",
          pergunta: "Qual problema histórico o cooperativismo veio enfrentar?",
          alternativas: [
            "A falta de bancos na Idade Média",
            "A precarização do trabalho e a concentração de renda na Revolução Industrial",
            "O excesso de impostos no Império Romano",
          ],
          correta: 1,
          explicacao: "As primeiras cooperativas respondem à miséria operária do século XIX: unir-se para comprar, produzir e ter renda sem depender só do patrão.",
        },
      ],
    },
    {
      id: "rochdale",
      titulo: "Rochdale, 1844: a semente do movimento",
      blocos: [
        { tipo: "texto", texto: "Em 24 de outubro de 1844, 28 tecelões fundaram em Rochdale (Inglaterra) a Sociedade dos Probos Pioneiros de Rochdale. Com uma cota de 1 libra cada, abriram um pequeno armazém de consumo vendendo farinha, açúcar, manteiga e aveia a preço justo e com peso honesto. Não foram os primeiros (a Sociedade de Tecelões de Fenwick, na Escócia, é de 1761), mas foram os que escreveram regras claras — e por isso viraram o marco mundial." },
        {
          tipo: "prancha",
          titulo: "O armazém dos Pioneiros de Rochdale",
          desenho: {
            legenda: "Esquema da primeira loja cooperativa: prateleiras à vista, balança honesta e livro de sócios.",
            primitivas: [
              { t: "retangulo", p: [20, 30], w: 260, h: 140, cor: "tinta" },
              { t: "linha", de: [20, 55], ate: [280, 55], cor: "tinta" },
              { t: "rotulo", p: [95, 46], texto: "PIONEIROS DE ROCHDALE" },
              { t: "retangulo", p: [35, 70], w: 90, h: 80, hachura: true },
              { t: "linha", de: [35, 96], ate: [125, 96], cor: "suave" },
              { t: "linha", de: [35, 122], ate: [125, 122], cor: "suave" },
              { t: "rotulo", p: [40, 160], texto: "Prateleiras (farinha, acucar)" },
              { t: "retangulo", p: [165, 110], w: 95, h: 40 },
              { t: "rotulo", p: [178, 133], texto: "Balcao e balanca" },
              { t: "circulo", c: [212, 85], r: 16, cor: "destaque" },
              { t: "rotulo", p: [185, 86], texto: "1 socio" },
              { t: "seta", de: [212, 101], ate: [212, 110], cor: "destaque" },
            ],
          },
        },
        { tipo: "video", titulo: "A primeira cooperativa moderna: os Pioneiros de Rochdale", youtube: "5vy9u9Lpeoo" },
      ],
    },
    {
      id: "principios",
      titulo: "Os princípios que Rochdale inventou",
      blocos: [
        { tipo: "texto", texto: "A grande contribuição de Rochdale foram as REGRAS. Revisadas pela Aliança Cooperativa Internacional (declaração de 1995), hoje são sete princípios universais. Eles valem para qualquer cooperativa, inclusive as de trabalho, e são a prova de que uma coop é coop de verdade — não uma empresa disfarçada." },
        { tipo: "diagrama", titulo: "Os 7 princípios cooperativistas (ACI)", codigo: `flowchart TD
  P1["1. Adesao voluntaria e livre"] --> P2["2. Gestao democratica: 1 pessoa, 1 voto"]
  P2 --> P3["3. Participacao economica dos membros"]
  P3 --> P4["4. Autonomia e independencia"]
  P4 --> P5["5. Educacao, formacao e informacao"]
  P5 --> P6["6. Intercooperacao"]
  P6 --> P7["7. Interesse pela comunidade"]` },
        {
          tipo: "licao",
          pergunta: "O que diferencia a votação numa cooperativa da de uma S.A.?",
          alternativas: [
            "Quem tem mais cotas tem mais votos",
            "Cada sócio vale um voto, independente de quanto investiu",
            "Só o conselho vota",
          ],
          correta: 1,
          explicacao: "Gestão democrática (2º princípio): nas cooperativas singulares vale 'uma pessoa, um voto', não 'uma cota, um voto' como nas sociedades de capital.",
        },
      ],
    },
    // ===================== LEITURA DO TEMA (BRASIL) =====================
    {
      id: "brasil-origem",
      titulo: "O Brasil entra na história: Ouro Preto, 1889",
      blocos: [
        { tipo: "texto", texto: "A primeira cooperativa brasileira registrada é a Sociedade Cooperativa Econômica dos Funcionários Públicos de Ouro Preto (MG), fundada em 27 de outubro de 1889 — poucos dias antes da Proclamação da República. Era de CONSUMO (comprava gêneros em conjunto) e chegou a criar uma caixa de auxílio a viúvas. Logo o modelo se espalhou por Minas, Pernambuco, Rio, São Paulo e Rio Grande do Sul." },
        {
          tipo: "prancha",
          titulo: "Linha do tempo do cooperativismo no Brasil",
          desenho: {
            legenda: "Marcos legais e fundadores. Cada traço vertical é uma data-chave.",
            primitivas: [
              { t: "linha", de: [15, 100], ate: [300, 100], cor: "tinta" },
              { t: "linha", de: [30, 92], ate: [30, 108], cor: "tinta" },
              { t: "rotulo", p: [16, 85], texto: "1889 Ouro Preto" },
              { t: "linha", de: [80, 92], ate: [80, 108], cor: "tinta" },
              { t: "rotulo", p: [66, 125], texto: "1902 credito RS" },
              { t: "linha", de: [140, 92], ate: [140, 108], cor: "destaque" },
              { t: "rotulo", p: [122, 85], texto: "1971 Lei 5.764" },
              { t: "linha", de: [195, 92], ate: [195, 108], cor: "tinta" },
              { t: "rotulo", p: [180, 125], texto: "1988 Constituicao" },
              { t: "linha", de: [245, 92], ate: [245, 108], cor: "tinta" },
              { t: "rotulo", p: [232, 85], texto: "1994 art.442" },
              { t: "linha", de: [290, 92], ate: [290, 108], cor: "destaque" },
              { t: "rotulo", p: [250, 125], texto: "2012 Lei 12.690" },
            ],
          },
        },
        { tipo: "video", titulo: "Conheça o cooperativismo: a história do movimento", youtube: "dUXBUhfhrVI" },
      ],
    },
    {
      id: "credito-rs",
      titulo: "Nova Petrópolis, 1902: o crédito dá o tom",
      blocos: [
        { tipo: "texto", texto: "Em 1902, o padre suíço Theodor Amstad fundou em Nova Petrópolis (RS) a primeira cooperativa de crédito do Brasil, no modelo de caixa rural (Raiffeisen). Ela existe até hoje e deu origem ao sistema Sicredi. O crédito mostrou a força do cooperativismo no país e preparou terreno para os outros ramos — inclusive o de trabalho." },
        { tipo: "video", titulo: "A história do Sicredi e do cooperativismo de crédito no Brasil", youtube: "b3VkCHYnldQ" },
        {
          tipo: "fontes",
          titulo: "Fontes desta etapa",
          itens: [
            { titulo: "Lei nº 5.764/1971 — Política Nacional de Cooperativismo (Planalto)", url: "https://www.planalto.gov.br/ccivil_03/leis/l5764.htm", tipo: "norma", nota: "Marco legal geral que ainda rege o que a Lei 12.690 não trata." },
            { titulo: "Statement on the Cooperative Identity — ICA (1995)", url: "https://ica.coop/en/cooperatives/cooperative-identity", tipo: "site", nota: "Definição e os 7 princípios, em fonte primária internacional." },
          ],
        },
      ],
    },
    {
      id: "ramos",
      titulo: "De onde a 'cooperativa de trabalho' se encaixa",
      blocos: [
        { tipo: "texto", texto: "O cooperativismo brasileiro se organiza em ramos. Na classificação atual do Sistema OCB são sete: Agropecuário, Consumo, Crédito, Infraestrutura, Saúde, Transporte e Trabalho/Produção de bens e serviços. A cooperativa de trabalho é justamente esse último ramo: pessoas que vendem seu trabalho ou produzem em comum, sem patrão." },
        { tipo: "diagrama", titulo: "Os ramos e onde entra o trabalho", codigo: `flowchart TD
  COOP["Cooperativismo brasileiro"] --> AG["Agropecuario"]
  COOP --> CR["Credito"]
  COOP --> SA["Saude"]
  COOP --> TR["Transporte"]
  COOP --> IN["Infraestrutura"]
  COOP --> CO["Consumo"]
  COOP --> TB["Trabalho, producao de bens e servicos"]
  TB --> FOCO["FOCO DESTE CADERNO"]` },
      ],
    },
    {
      id: "definicao-legal",
      titulo: "A cooperativa de trabalho na lei",
      blocos: [
        { tipo: "texto", texto: "A Lei 12.690/2012, no art. 2º, define a cooperativa de trabalho como a sociedade constituída por trabalhadores para o exercício de suas atividades laborativas ou profissionais com proveito comum, autonomia e autogestão. Duas palavras são o coração da lei: AUTONOMIA (ninguém manda no sócio como um chefe) e AUTOGESTÃO (os sócios decidem juntos). Sem isso, não é cooperativa — é fraude." },
        {
          tipo: "licao",
          pergunta: "Segundo a Lei 12.690/2012, o que caracteriza a cooperativa de trabalho?",
          alternativas: [
            "Terceirização barata de mão de obra",
            "Autonomia e autogestão dos trabalhadores-sócios, com proveito comum",
            "Uma ONG sem fins econômicos",
          ],
          correta: 1,
          explicacao: "Art. 2º da Lei 12.690/2012: proveito comum, autonomia e autogestão. A ausência desses elementos é o sinal clássico de fraude.",
        },
      ],
    },
    // ===================== MÉTODO (ARCABOUÇO LEGAL) =====================
    {
      id: "lei5764",
      titulo: "1971: a Lei 5.764 organiza tudo",
      blocos: [
        { tipo: "texto", texto: "Até 1971 o cooperativismo brasileiro vivia de decretos esparsos e de forte tutela do Estado. A Lei 5.764, de 16 de dezembro de 1971, definiu a Política Nacional de Cooperativismo e o regime jurídico das sociedades cooperativas: como se constituem, assembleias, conselhos, fundos obrigatórios e o conceito de 'ato cooperativo'. Ela continua em vigor e é a base supletiva da Lei 12.690." },
        { tipo: "texto", texto: "Conceito-chave que vem daqui: o ATO COOPERATIVO (art. 79) é o praticado entre a cooperativa e seus associados para alcançar os objetivos sociais — e não é operação de mercado comum. Isso tem efeito até na tributação, como veremos adiante." },
        {
          tipo: "fontes",
          itens: [
            { titulo: "Lei nº 5.764, de 16/12/1971 (texto oficial, Planalto)", url: "https://www.planalto.gov.br/ccivil_03/leis/l5764.htm", tipo: "norma", nota: "Ato cooperativo: art. 79; fundos obrigatórios: arts. 28 e 87." },
          ],
        },
      ],
    },
    {
      id: "constituicao",
      titulo: "1988: a Constituição liberta o cooperativismo",
      blocos: [
        { tipo: "texto", texto: "A Constituição de 1988 foi um divisor de águas. O art. 5º, XVIII, garante que a criação de cooperativas independe de autorização do Estado, vedada a interferência do poder público em seu funcionamento. E o art. 174, §2º, determina que a lei apoiará e estimulará o cooperativismo. Em resumo: o Estado saiu de cima e passou a ser fomentador — abrindo espaço para o boom das cooperativas de trabalho na década seguinte." },
        {
          tipo: "licao",
          pergunta: "O que o art. 5º, XVIII da Constituição de 1988 trouxe para o setor?",
          alternativas: [
            "Proibiu novas cooperativas",
            "Liberou a criação de cooperativas sem autorização e vedou a interferência estatal",
            "Transformou toda cooperativa em órgão público",
          ],
          correta: 1,
          explicacao: "A criação passou a independer de autorização; o Estado deixou a tutela e assumiu o papel de estímulo (art. 174, §2º).",
        },
      ],
    },
    {
      id: "art442",
      titulo: "1994: o parágrafo que abriu a porta da fraude",
      blocos: [
        { tipo: "texto", texto: "Aqui mora a parte sombria da história. A Lei 8.949, de 9 de dezembro de 1994, acrescentou um parágrafo único ao art. 442 da CLT dizendo que, qualquer que seja o ramo, não há vínculo empregatício entre a cooperativa e seus associados, nem entre estes e os tomadores de serviço. A intenção era proteger o cooperativismo verdadeiro." },
        { tipo: "texto", texto: "O efeito, porém, foi um surto de 'cooperativas' de fachada — apelidadas de coopergatos ou pejotização coletiva. Empresas demitiam empregados e os readmitiam como 'cooperados' para fugir de direitos trabalhistas. A autogestão não existia: havia chefe, horário e subordinação, só que sem carteira assinada. Foi essa distorção que a Lei 12.690/2012 veio corrigir." },
        {
          tipo: "prancha",
          titulo: "A fraude do coopergato",
          desenho: {
            legenda: "Na fraude, a 'cooperativa' é só um intermediário: o tomador manda, mas finge que não há emprego.",
            primitivas: [
              { t: "retangulo", p: [20, 30], w: 90, h: 40 },
              { t: "rotulo", p: [36, 54], texto: "Tomador (empresa)" },
              { t: "retangulo", p: [115, 120], w: 90, h: 40, hachura: true },
              { t: "rotulo", p: [120, 144], texto: "Coop de fachada" },
              { t: "retangulo", p: [210, 30], w: 90, h: 40 },
              { t: "rotulo", p: [220, 54], texto: "Trabalhador" },
              { t: "seta", de: [65, 70], ate: [150, 120], cor: "suave" },
              { t: "seta", de: [255, 70], ate: [185, 120], cor: "suave" },
              { t: "seta", de: [110, 50], ate: [210, 50], cor: "destaque" },
              { t: "rotulo", p: [120, 42], texto: "ORDENS (subordinacao real)" },
              { t: "rotulo", p: [95, 185], texto: "Direitos escondidos = fraude" },
            ],
          },
        },
        {
          tipo: "fontes",
          titulo: "Fontes sobre a fraude e a correção",
          itens: [
            { titulo: "Lei nº 8.949/1994 — acrescenta parágrafo único ao art. 442 da CLT (Planalto)", url: "https://www.planalto.gov.br/ccivil_03/leis/l8949.htm", tipo: "norma" },
            { titulo: "Lei nº 12.690/2012 — Cooperativas de Trabalho e PRONACOOP (Planalto)", url: "https://www.planalto.gov.br/ccivil_03/_Ato2011-2014/2012/Lei/L12690.htm", tipo: "norma", nota: "Revogou o parágrafo único do art. 442 da CLT e criou regras antifraude." },
            { titulo: "A nova lei das cooperativas de trabalho: como evitar e coibir fraudes (Jus.com.br)", url: "https://jus.com.br/artigos/23686/a-nova-lei-das-cooperativas-de-trabalho-como-evitar-e-coibir-fraudes", tipo: "artigo" },
          ],
        },
      ],
    },
    {
      id: "lei12690",
      titulo: "2012: a Lei 12.690 reorganiza o ramo",
      blocos: [
        { tipo: "texto", texto: "A Lei 12.690/2012 é a certidão de nascimento jurídica das cooperativas de trabalho. Ela define tipos, exige número mínimo de sócios, lista direitos mínimos (o art. 7º), proíbe o uso da cooperativa para intermediar mão de obra subordinada (art. 5º) e cria o PRONACOOP — Programa Nacional de Fomento às Cooperativas de Trabalho. É a lei que separa a coop verdadeira do coopergato." },
        { tipo: "diagrama", titulo: "O que a Lei 12.690/2012 exige", codigo: `flowchart TD
  L["Lei 12.690/2012"] --> A["Art. 2: autonomia + autogestao"]
  L --> B["Art. 4: tipos producao ou servico"]
  L --> C["Art. 6: minimo 7 socios"]
  L --> D["Art. 7: direitos minimos do socio"]
  L --> E["Art. 5: proibe mao de obra subordinada"]
  L --> F["PRONACOOP: fomento do Estado"]` },
      ],
    },
    {
      id: "tipos",
      titulo: "Produção x Serviço: os dois tipos",
      blocos: [
        { tipo: "texto", texto: "O art. 4º da Lei 12.690 cria dois tipos. Na cooperativa de PRODUÇÃO, os sócios contribuem com trabalho e a cooperativa detém, a qualquer título, os meios de produção (a fábrica, a oficina, o maquinário são do coletivo). Na de SERVIÇO, os sócios prestam serviços especializados a terceiros, sem os pressupostos da relação de emprego (ex.: coop de guias de turismo, de médicos, de TI)." },
        {
          tipo: "prancha",
          titulo: "Os dois tipos lado a lado",
          desenho: {
            legenda: "Produção: meios de produção coletivos. Serviço: trabalho especializado a terceiros.",
            primitivas: [
              { t: "retangulo", p: [18, 40], w: 125, h: 120, cor: "tinta" },
              { t: "rotulo", p: [45, 56], texto: "PRODUCAO" },
              { t: "circulo", c: [80, 95], r: 22, hachura: true },
              { t: "rotulo", p: [40, 130], texto: "Meios de producao do coletivo" },
              { t: "retangulo", p: [163, 40], w: 125, h: 120, cor: "tinta" },
              { t: "rotulo", p: [195, 56], texto: "SERVICO" },
              { t: "seta", de: [185, 95], ate: [265, 95], cor: "destaque" },
              { t: "rotulo", p: [182, 130], texto: "Servico a terceiros" },
            ],
          },
        },
        {
          tipo: "licao",
          pergunta: "Numa cooperativa de PRODUÇÃO, de quem são os meios de produção?",
          alternativas: ["De um sócio majoritário", "Da própria cooperativa (coletivo)", "Do tomador do serviço"],
          correta: 1,
          explicacao: "Art. 4º, I: na produção a cooperativa detém, a qualquer título, os meios de produção — eles são do coletivo.",
        },
      ],
    },
    {
      id: "garantias",
      titulo: "Os direitos mínimos do sócio (art. 7º)",
      blocos: [
        { tipo: "texto", texto: "Para que 'autonomia' não vire pretexto para explorar, o art. 7º garante um piso de direitos a cada sócio: retiradas não inferiores ao piso da categoria (ou ao salário mínimo); jornada de até 8h diárias e 44h semanais; repouso semanal remunerado; repouso anual remunerado (equivale a férias); adicional noturno; adicional de insalubridade/periculosidade; e seguro de acidente de trabalho. Esses direitos aproximam a coop verdadeira do padrão trabalhista." },
        {
          tipo: "tarefas",
          itens: [
            { id: "checklist-art7", titulo: "Monte o checklist do art. 7º", entrega: "Liste os 7 direitos do art. 7º e, ao lado de cada um, escreva como a cooperativa comprovaria que cumpre (documento, registro ou cálculo)." },
            { id: "piso", titulo: "Pesquise o piso da sua categoria", entrega: "Escolha uma ocupação real, encontre o piso ou convenção coletiva vigente e anote o valor que seria a retirada mínima mensal." },
          ],
        },
      ],
    },
    // ===================== CÁLCULO / MEDIÇÃO =====================
    {
      id: "retirada",
      titulo: "Como se calcula a retirada do sócio",
      blocos: [
        { tipo: "texto", texto: "Diferente do salário, o sócio recebe RETIRADAS (ou 'pró-labore cooperativo'), proporcionais às horas trabalhadas ou às atividades realizadas, nunca abaixo do piso (art. 7º, I). A cooperativa fatura o serviço, desconta custos e fundos obrigatórios, e o restante é distribuído. Entender essa conta é o que separa um cooperado consciente de alguém que só assina papéis." },
        {
          tipo: "prancha",
          titulo: "Da receita à retirada",
          desenho: {
            legenda: "O faturamento desce por descontos até virar a retirada. Valores são exemplo didático.",
            primitivas: [
              { t: "retangulo", p: [25, 30], w: 250, h: 26, cor: "tinta" },
              { t: "rotulo", p: [60, 47], texto: "Receita do servico (100%)" },
              { t: "seta", de: [150, 56], ate: [150, 74], cor: "destaque" },
              { t: "retangulo", p: [60, 74], w: 180, h: 24, hachura: true },
              { t: "rotulo", p: [70, 90], texto: "- custos e taxa de administracao" },
              { t: "seta", de: [150, 98], ate: [150, 114], cor: "destaque" },
              { t: "retangulo", p: [80, 114], w: 140, h: 24, hachura: true },
              { t: "rotulo", p: [92, 130], texto: "- fundos (Reserva + FATES)" },
              { t: "seta", de: [150, 138], ate: [150, 154], cor: "destaque" },
              { t: "retangulo", p: [95, 154], w: 110, h: 26, cor: "destaque" },
              { t: "rotulo", p: [110, 171], texto: "= RETIRADA do socio" },
            ],
          },
        },
        {
          tipo: "tarefas",
          itens: [
            { id: "simular-retirada", titulo: "Simule uma retirada", entrega: "Com uma receita mensal fictícia, desconte 10% de administração, separe 10% para Reserva e 5% para o FATES e calcule a retirada final. Confira se fica acima do piso que você pesquisou." },
          ],
        },
      ],
    },
    {
      id: "rateio",
      titulo: "Sobras, rateio e os fundos obrigatórios",
      blocos: [
        { tipo: "texto", texto: "Cooperativa não dá 'lucro', dá SOBRAS — o que resta depois de pagar tudo. Por lei (Lei 5.764, arts. 28 e 87), parte das sobras vai para fundos obrigatórios antes de qualquer distribuição: o Fundo de Reserva (reparar perdas, mínimo 10% das sobras) e o FATES — Fundo de Assistência Técnica, Educacional e Social (mínimo 5%). O que sobra é rateado entre os sócios na proporção das operações de cada um, não do capital." },
        { tipo: "diagrama", titulo: "O caminho das sobras", codigo: `flowchart TD
  S["Sobras do exercicio"] --> R["Fundo de Reserva (>= 10%)"]
  S --> F["FATES (>= 5%)"]
  S --> D["Rateio aos socios"]
  D --> P["Proporcional as operacoes de cada socio, nao ao capital"]` },
        {
          tipo: "licao",
          pergunta: "As sobras de uma cooperativa são divididas conforme...",
          alternativas: ["o número de cotas de cada sócio", "as operações (trabalho) que cada sócio realizou", "a antiguidade apenas"],
          correta: 1,
          explicacao: "O rateio segue a participação de cada sócio nas operações, não o capital investido — coerente com o princípio da participação econômica.",
        },
      ],
    },
    {
      id: "numeros",
      titulo: "O tamanho do setor hoje",
      blocos: [
        { tipo: "texto", texto: "O cooperativismo brasileiro é enorme e cresce. Segundo o AnuárioCoop do Sistema OCB: na edição de 2024 (dados de 2023) eram cerca de 4.500 cooperativas e 23,4 milhões de cooperados; na edição de 2025 (dados de 2024) o número de cooperados subiu para 25,8 milhões — cerca de 12% da população brasileira. O ramo trabalho/produção de serviços é um dos mais numerosos em quantidade de cooperativas." },
        {
          tipo: "prancha",
          titulo: "Cooperados no Brasil (milhões)",
          desenho: {
            legenda: "Crescimento recente de cooperados, em milhões, conforme o AnuárioCoop/OCB.",
            primitivas: [
              { t: "linha", de: [40, 30], ate: [40, 165], cor: "tinta" },
              { t: "linha", de: [40, 165], ate: [295, 165], cor: "tinta" },
              { t: "retangulo", p: [70, 95], w: 45, h: 70, hachura: true },
              { t: "rotulo", p: [66, 88], texto: "2023: 23,4" },
              { t: "retangulo", p: [160, 70], w: 45, h: 95, hachura: true, cor: "destaque" },
              { t: "rotulo", p: [156, 63], texto: "2024: 25,8" },
              { t: "rotulo", p: [95, 180], texto: "Fonte: AnuarioCoop OCB" },
            ],
          },
        },
        {
          tipo: "fontes",
          itens: [
            { titulo: "AnuárioCoop — Anuário do Cooperativismo Brasileiro (Sistema OCB)", url: "https://somoscooperativismo.coop.br/anuario", tipo: "dataset", nota: "Base oficial de números do setor, atualizada a cada ano." },
            { titulo: "Somos Cooperativismo (Sistema OCB) — institucional e dados", url: "https://somoscooperativismo.coop.br/institucional/ocb", tipo: "site" },
          ],
        },
      ],
    },
    {
      id: "viabilidade",
      titulo: "Medir se a cooperativa 'fecha a conta'",
      blocos: [
        { tipo: "texto", texto: "Antes de fundar, faça o balanço econômico: quanto o grupo consegue faturar por mês, quais os custos fixos (sede, contador, impostos), e se a retirada resultante fica acima do piso. Uma coop que distribui retiradas abaixo do mínimo não é só inviável — é ilegal. Medir antes evita frustração depois." },
        {
          tipo: "tarefas",
          itens: [
            { id: "viabilidade", titulo: "Teste de viabilidade", entrega: "Para uma ideia de coop de serviço, estime receita mensal, custos fixos e número de sócios. Divida a sobra pelos sócios e verifique se passa do piso. Registre o resultado." },
            { id: "cenarios-coop", titulo: "Compare dois cenários", entrega: "Refaça o cálculo com metade da demanda. Anote qual custo fixo pesaria mais num mês fraco e o que o grupo faria." },
          ],
        },
      ],
    },
    // ===================== PROJETO =====================
    {
      id: "formar",
      titulo: "Como se forma uma cooperativa (o 1º passo)",
      blocos: [
        { tipo: "texto", texto: "Para constituir uma cooperativa de trabalho são necessários no mínimo 7 sócios (art. 6º da Lei 12.690 — bem menos que os 20 exigidos para outras cooperativas). O caminho: reunir o grupo, discutir o objeto social, convocar a assembleia geral de constituição, aprovar o estatuto e eleger os conselhos. Tudo começa por pessoas que querem trabalhar juntas e dividir o resultado." },
        { tipo: "video", titulo: "Como formar uma cooperativa (Sistema OCB)", youtube: "x_t_CjEBc1o" },
        { tipo: "diagrama", titulo: "Da ideia à cooperativa registrada", codigo: `flowchart TD
  A["Grupo de 7+ pessoas"] --> B["Definir objeto e tipo"]
  B --> C["Assembleia de constituicao"]
  C --> D["Aprovar estatuto + eleger conselhos"]
  D --> E["Registro na Junta Comercial"]
  E --> F["CNPJ, OCB e inicio das atividades"]` },
      ],
    },
    {
      id: "estatuto",
      titulo: "O estatuto e a ata de fundação",
      blocos: [
        { tipo: "texto", texto: "O estatuto é a 'constituição' da cooperativa: nome, sede, objeto, como se entra e se sai, direitos e deveres, como se decide, como se dividem sobras e fundos. A ata da assembleia de constituição registra quem fundou e o que foi aprovado. São os documentos que a Junta Comercial vai exigir — e que protegem o grupo de conflitos futuros." },
        {
          tipo: "tarefas",
          itens: [
            { id: "esqueleto-estatuto", titulo: "Rascunhe o esqueleto do estatuto", entrega: "Escreva os títulos das seções que um estatuto precisa ter (objeto, sócios, assembleia, conselhos, fundos, dissolução) e uma frase sobre o que cada seção decide." },
          ],
        },
      ],
    },
    {
      id: "assembleia",
      titulo: "A assembleia: onde o poder mora",
      blocos: [
        { tipo: "texto", texto: "A Assembleia Geral é o órgão máximo: aprova contas, elege conselhos, decide sobre sobras e muda o estatuto. A Lei 12.690 remete à Lei 5.764 para os temas das assembleias ordinárias e extraordinárias. Aqui vale a regra de ouro do cooperativismo: cada sócio, um voto — tenha ele muito ou pouco capital integralizado." },
        {
          tipo: "prancha",
          titulo: "Um sócio, um voto",
          desenho: {
            legenda: "Na assembleia, todos os sócios ao redor da mesa pesam igual na decisão.",
            primitivas: [
              { t: "retangulo", p: [110, 85], w: 90, h: 36, hachura: true },
              { t: "rotulo", p: [120, 107], texto: "Assembleia" },
              { t: "circulo", c: [60, 50], r: 14 },
              { t: "circulo", c: [150, 35], r: 14 },
              { t: "circulo", c: [240, 50], r: 14 },
              { t: "circulo", c: [260, 120], r: 14 },
              { t: "circulo", c: [150, 165], r: 14 },
              { t: "circulo", c: [50, 120], r: 14 },
              { t: "seta", de: [70, 60], ate: [115, 90], cor: "suave" },
              { t: "seta", de: [240, 64], ate: [195, 90], cor: "suave" },
              { t: "rotulo", p: [95, 150], texto: "cada circulo = 1 voto" },
            ],
          },
        },
        {
          tipo: "licao",
          pergunta: "Qual é o órgão máximo de decisão de uma cooperativa?",
          alternativas: ["O conselho fiscal", "A Assembleia Geral dos sócios", "O presidente"],
          correta: 1,
          explicacao: "A Assembleia Geral decide o mais importante; conselhos administram e fiscalizam dentro do que ela delibera.",
        },
      ],
    },
    {
      id: "governanca",
      titulo: "Os conselhos: administrar e fiscalizar",
      blocos: [
        { tipo: "texto", texto: "Entre as assembleias, a cooperativa é tocada por dois órgãos. O Conselho de Administração (ou Diretoria) executa as decisões e representa a coop. O Conselho Fiscal — com no mínimo 3 membros efetivos, por remissão ao art. 56 da Lei 5.764 — vigia as contas e protege os sócios contra desvios. Separar quem administra de quem fiscaliza é uma defesa contra abusos." },
        { tipo: "diagrama", titulo: "Estrutura de governança", codigo: `flowchart TD
  AG["Assembleia Geral (todos os socios)"] --> CA["Conselho de Administracao"]
  AG --> CF["Conselho Fiscal (>= 3 membros)"]
  CA --> OP["Operacao do dia a dia"]
  CF --> VI["Vigia contas e atos"]` },
      ],
    },
    {
      id: "registro",
      titulo: "Registro: a hora de chamar profissionais",
      blocos: [
        { tipo: "texto", texto: "Depois da assembleia, a cooperativa precisa de registro na Junta Comercial, CNPJ na Receita, inscrições e, para funcionar bem, filiação ao Sistema OCB do estado. Erros no estatuto ou no enquadramento podem travar tudo ou, pior, abrir brecha para a coop ser acusada de fraude. Esta é uma etapa que pede gente habilitada." },
        {
          tipo: "mobilizacao",
          papel: "Advogado(a) e contador(a) com experiência em cooperativas",
          porque: "O registro na Junta Comercial, o enquadramento tributário do ato cooperativo e a redação do estatuto exigem responsabilidade técnica. Um estatuto mal feito trava o registro ou expõe a coop a autuações trabalhistas.",
          entregaEsperada: "Estatuto e ata revisados, cooperativa registrada na Junta Comercial, CNPJ ativo e enquadramento tributário definido por escrito.",
          gerenciadoPor: "zaeon",
        },
        {
          tipo: "tarefas",
          itens: [
            { id: "dossie-registro", titulo: "Monte o dossiê de registro", entrega: "Liste os documentos que a Junta Comercial e a Receita vão pedir (ata, estatuto, lista de sócios, etc.) e o que ainda falta ao seu grupo fictício." },
          ],
        },
      ],
    },
    // ===================== EXECUÇÃO =====================
    {
      id: "autogestao",
      titulo: "Autogestão no dia a dia",
      blocos: [
        { tipo: "texto", texto: "Registrada a coop, o desafio vira cultural: fazer a autogestão funcionar sem virar bagunça nem virar 'patrão disfarçado'. Isso significa reuniões periódicas, prestação de contas transparente, rodízio de funções e decisões coletivas sobre o que aceitar, quanto cobrar e como repartir. Autogestão é músculo que se treina." },
        { tipo: "diagrama", titulo: "O ciclo da autogestão", codigo: `flowchart TD
  A["Captar trabalho/contratos"] --> B["Distribuir tarefas em acordo"]
  B --> C["Executar com autonomia"]
  C --> D["Prestar contas na reuniao"]
  D --> E["Decidir sobras e melhorias"]
  E --> A` },
      ],
    },
    {
      id: "contabil",
      titulo: "A escrita contábil e o ato cooperativo",
      blocos: [
        { tipo: "texto", texto: "A cooperativa precisa separar o que é ato cooperativo (operação com os sócios para cumprir o objeto) do que é ato não cooperativo (negócio com não sócios). A contabilidade registra isso em contas distintas — e o enquadramento correto influencia os tributos. É trabalho técnico e contínuo, não um favor de fim de ano." },
        {
          tipo: "mobilizacao",
          papel: "Contador(a) responsável pela escrituração",
          porque: "A separação entre ato cooperativo e não cooperativo, a apuração de sobras e os fundos obrigatórios exigem escrituração técnica mensal e responsabilidade perante o conselho fiscal e o fisco.",
          entregaEsperada: "Plano de contas cooperativo, balancetes mensais separando ato cooperativo e não cooperativo, e demonstração de sobras ao fim do exercício.",
          gerenciadoPor: "zaeon",
        },
        {
          tipo: "licao",
          pergunta: "Por que separar ato cooperativo de ato não cooperativo?",
          alternativas: [
            "Só por burocracia, não muda nada",
            "Porque têm tratamento contábil e tributário diferentes",
            "Para esconder sobras dos sócios",
          ],
          correta: 1,
          explicacao: "O ato cooperativo (com os sócios) tem natureza e tributação distintas do negócio com terceiros; misturar gera risco fiscal.",
        },
      ],
    },
    {
      id: "tributos",
      titulo: "Tributação do ato cooperativo",
      blocos: [
        { tipo: "texto", texto: "A Lei 5.764 (arts. 79 e 87) estabelece que o ato cooperativo não implica operação de mercado nem contrato de compra e venda — o que embasa um tratamento tributário próprio. Na prática, parte dos resultados do ato cooperativo recebe tratamento diferenciado, enquanto os atos com não sócios são tributados normalmente. É área técnica e muda com a jurisprudência: consulte sempre a norma e um especialista." },
        {
          tipo: "fontes",
          itens: [
            { titulo: "Lei nº 5.764/1971 — ato cooperativo (arts. 79 e 87), Planalto", url: "https://www.planalto.gov.br/ccivil_03/leis/l5764.htm", tipo: "norma" },
            { titulo: "Constituição Federal de 1988 — arts. 5º, XVIII e 174, §2º (Planalto)", url: "https://www.planalto.gov.br/ccivil_03/constituicao/constituicao.htm", tipo: "norma", nota: "Liberdade de criação e dever de estímulo ao cooperativismo." },
          ],
        },
      ],
    },
    {
      id: "nao-precarizar",
      titulo: "Não virar fraude: os sinais de alerta",
      blocos: [
        { tipo: "texto", texto: "A fronteira entre cooperativa e fraude é fina. A Justiça do Trabalho reconhece vínculo empregatício quando aparecem os pressupostos do art. 3º da CLT: pessoalidade, habitualidade, onerosidade e, principalmente, SUBORDINAÇÃO. Se há um chefe mandando, horário imposto de fora e nenhuma autogestão real, é emprego disfarçado — não importa o nome 'cooperativa' na porta." },
        {
          tipo: "prancha",
          titulo: "Coop verdadeira x coopergato",
          desenho: {
            legenda: "À esquerda, os sinais de cooperativa real; à direita, os sinais de fraude.",
            primitivas: [
              { t: "linha", de: [150, 25], ate: [150, 175], cor: "tinta" },
              { t: "rotulo", p: [30, 40], texto: "COOP REAL" },
              { t: "rotulo", p: [180, 40], texto: "FRAUDE" },
              { t: "rotulo", p: [20, 70], texto: "Autogestao" },
              { t: "rotulo", p: [20, 95], texto: "1 socio 1 voto" },
              { t: "rotulo", p: [20, 120], texto: "Sobras rateadas" },
              { t: "rotulo", p: [20, 145], texto: "Direitos do art.7" },
              { t: "rotulo", p: [175, 70], texto: "Chefe manda" },
              { t: "rotulo", p: [175, 95], texto: "Horario imposto" },
              { t: "rotulo", p: [175, 120], texto: "Sem voz nas contas" },
              { t: "rotulo", p: [175, 145], texto: "Direitos escondidos" },
              { t: "retangulo", p: [14, 55], w: 125, h: 110, cor: "destaque" },
            ],
          },
        },
        {
          tipo: "licao",
          pergunta: "Qual elemento, se presente, mais indica emprego disfarçado?",
          alternativas: ["Autonomia do sócio", "Subordinação a um chefe externo", "Divisão democrática das sobras"],
          correta: 1,
          explicacao: "Subordinação é o pressuposto central do vínculo (art. 3º da CLT). Com chefe mandando e sem autogestão, a 'coop' é fraude.",
        },
      ],
    },
    // ===================== MANUTENÇÃO =====================
    {
      id: "educacao",
      titulo: "5º princípio: educar sempre (o papel do Sescoop)",
      blocos: [
        { tipo: "texto", texto: "Cooperativa que não educa seus sócios definha. O 5º princípio — educação, formação e informação — é mantido vivo no Brasil pelo Sescoop (Serviço Nacional de Aprendizagem do Cooperativismo), criado em 1998, financiado pelo próprio setor via FATES e contribuição. Formação em autogestão e cooperativismo é manutenção preventiva: reduz conflito e evita que a coop escorregue para a fraude." },
        { tipo: "video", titulo: "Introdução ao Cooperativismo — Aula 1 (IFRO)", youtube: "9OGE2sYS1p4" },
        {
          tipo: "tarefas",
          itens: [
            { id: "plano-formacao", titulo: "Desenhe um plano de formação", entrega: "Liste 3 temas que todo novo sócio deveria aprender no primeiro mês (ex.: como lê um balancete, o que é ato cooperativo) e quem ensinaria cada um." },
          ],
        },
      ],
    },
    {
      id: "intercooperacao",
      titulo: "6º princípio: cooperativas entre cooperativas",
      blocos: [
        { tipo: "texto", texto: "Sozinha, uma coop pequena é frágil. O 6º princípio — intercooperação — propõe que cooperativas se unam em centrais, federações e confederações para ganhar escala: compras conjuntas, crédito, assistência técnica e representação política. No Brasil isso aparece na estrutura OCB (nacional), nas OCEs (estaduais) e nos sistemas de cada ramo." },
        { tipo: "diagrama", titulo: "A pirâmide da intercooperação", codigo: `flowchart TD
  S["Cooperativas singulares"] --> C["Centrais e federacoes"]
  C --> F["Confederacoes"]
  F --> R["Representacao nacional (OCB) e internacional (ICA)"]` },
      ],
    },
    {
      id: "saude-fiscal",
      titulo: "Saúde da cooperativa: indicadores para acompanhar",
      blocos: [
        { tipo: "texto", texto: "Manter a coop viva é acompanhar poucos números com disciplina: faturamento por sócio, retirada média frente ao piso, inadimplência dos tomadores, saldo dos fundos e presença nas assembleias. Quando a retirada cai perto do piso ou a presença some, é sinal de alerta — hora de agir antes da crise." },
        {
          tipo: "tarefas",
          itens: [
            { id: "painel-saude", titulo: "Crie um painel de saúde", entrega: "Escolha 5 indicadores, defina a frequência de medição e qual valor dispararia um alerta. Explique quem olharia o painel e com que periodicidade." },
          ],
        },
      ],
    },
    // ===================== CASOS REAIS =====================
    {
      id: "caso-catadores",
      titulo: "Caso real: catadores e a Política de Resíduos (2010)",
      blocos: [
        { tipo: "texto", texto: "Um dos usos mais transformadores das cooperativas de trabalho é entre catadores de materiais recicláveis. A Lei 12.305/2010, que criou a Política Nacional de Resíduos Sólidos, reconhece as cooperativas e associações de catadores como parceiras prioritárias da coleta seletiva e da logística reversa. Milhares de pessoas saíram do lixão para a renda organizada coletivamente — cooperativismo de trabalho resolvendo um problema social e ambiental ao mesmo tempo." },
        {
          tipo: "fontes",
          itens: [
            { titulo: "Lei nº 12.305/2010 — Política Nacional de Resíduos Sólidos (Planalto)", url: "https://www.planalto.gov.br/ccivil_03/_ato2007-2010/2010/lei/l12305.htm", tipo: "norma", nota: "Reconhece cooperativas de catadores na coleta seletiva e logística reversa." },
            { titulo: "Movimento Nacional dos Catadores de Materiais Recicláveis (MNCR)", url: "https://www.mncr.org.br/", tipo: "site" },
          ],
        },
        {
          tipo: "licao",
          pergunta: "Como a Lei 12.305/2010 trata as cooperativas de catadores?",
          alternativas: ["Proíbe o trabalho de catação", "Reconhece-as como parceiras prioritárias na coleta seletiva", "Transforma-as em órgãos públicos"],
          correta: 1,
          explicacao: "A PNRS prioriza a participação de cooperativas e associações de catadores — um caso concreto de cooperativismo de trabalho com política pública.",
        },
      ],
    },
    {
      id: "caso-economia-solidaria",
      titulo: "Caso real: economia solidária e as incubadoras",
      blocos: [
        { tipo: "texto", texto: "A partir dos anos 1990, universidades criaram Incubadoras Tecnológicas de Cooperativas Populares (ITCPs) para apoiar grupos de baixa renda a se organizarem em cooperativas de trabalho — com assessoria jurídica, contábil e de gestão. Junto com redes como Unisol e a antiga Secretaria Nacional de Economia Solidária, formaram o campo da 'economia solidária', que vê a cooperativa como ferramenta de inclusão, não só de negócio." },
        { tipo: "video", titulo: "Uma breve história do cooperativismo", youtube: "lg397aJmmuM" },
        {
          tipo: "fontes",
          itens: [
            { titulo: "A primeira cooperativa moderna do mundo! Os Pioneiros de Rochdale (vídeo)", url: "https://www.youtube.com/watch?v=wNDDYDhK4uQ", tipo: "video", nota: "Contexto histórico para comparar com as incubadoras de hoje." },
            { titulo: "E-book Cooperativismo: de onde vem e para onde vai (Sebrae)", url: "https://sebrae.com.br/Sebrae/Portal%20Sebrae/Arquivos/E-book_Cooperativismo_de_onde_vem_e_para_onde_vai.v2.pdf", tipo: "livro" },
          ],
        },
      ],
    },
    {
      id: "caso-fraude",
      titulo: "Caso real: a fraude que a lei combateu",
      blocos: [
        { tipo: "texto", texto: "Nos anos 1990 e 2000, a Justiça do Trabalho foi inundada por ações contra falsas cooperativas: empresas de limpeza, call centers e frigoríficos que 'cooperativizaram' empregados para cortar custos. Os tribunais, reconhecendo subordinação, declaravam o vínculo e condenavam tomador e 'cooperativa' a pagar verbas trabalhistas. Esse acúmulo de casos pressionou o Congresso e desaguou na Lei 12.690/2012, que amarrou direitos mínimos e proibiu a intermediação de mão de obra subordinada." },
        {
          tipo: "prancha",
          titulo: "A linha que vai da fraude à lei",
          desenho: {
            legenda: "A fraude gera ações judiciais; a jurisprudência pressiona; nasce a lei protetiva.",
            primitivas: [
              { t: "retangulo", p: [15, 80], w: 70, h: 40, hachura: true },
              { t: "rotulo", p: [22, 104], texto: "Coopergatos" },
              { t: "seta", de: [85, 100], ate: [120, 100], cor: "destaque" },
              { t: "retangulo", p: [120, 80], w: 70, h: 40 },
              { t: "rotulo", p: [126, 104], texto: "Acoes na JT" },
              { t: "seta", de: [190, 100], ate: [225, 100], cor: "destaque" },
              { t: "retangulo", p: [225, 80], w: 70, h: 40, cor: "destaque" },
              { t: "rotulo", p: [231, 104], texto: "Lei 12.690" },
              { t: "rotulo", p: [90, 150], texto: "Jurisprudencia vira lei" },
            ],
          },
        },
        {
          tipo: "licao",
          pergunta: "O que a Lei 12.690/2012 proibiu expressamente para coibir fraudes?",
          alternativas: [
            "O rateio de sobras",
            "O uso da cooperativa para intermediar mão de obra subordinada",
            "A realização de assembleias",
          ],
          correta: 1,
          explicacao: "Art. 5º: a cooperativa de trabalho não pode ser usada para intermediação de mão de obra subordinada — o cerne do coopergato.",
        },
      ],
    },
    // ===================== RECURSOS =====================
    {
      id: "recursos",
      titulo: "Onde pesquisar: as fontes oficiais",
      blocos: [
        { tipo: "texto", texto: "Para seguir estudando ou montar sua cooperativa, vá sempre às fontes primárias. As leis estão no Planalto; os números e a formação, no Sistema OCB e no Sescoop; os princípios, na ICA. Guarde esta página como ponto de partida — tudo aqui foi verificado e existe de verdade." },
        {
          tipo: "fontes",
          titulo: "Biblioteca do cooperativismo de trabalho",
          itens: [
            { titulo: "Lei nº 12.690/2012 — Cooperativas de Trabalho (Planalto)", url: "https://www.planalto.gov.br/ccivil_03/_Ato2011-2014/2012/Lei/L12690.htm", tipo: "norma" },
            { titulo: "Lei nº 5.764/1971 — Política Nacional de Cooperativismo (Planalto)", url: "https://www.planalto.gov.br/ccivil_03/leis/l5764.htm", tipo: "norma" },
            { titulo: "Lei nº 8.949/1994 — parágrafo único do art. 442 da CLT (Planalto)", url: "https://www.planalto.gov.br/ccivil_03/leis/l8949.htm", tipo: "norma" },
            { titulo: "Constituição Federal de 1988 (Planalto)", url: "https://www.planalto.gov.br/ccivil_03/constituicao/constituicao.htm", tipo: "norma" },
            { titulo: "Statement on the Cooperative Identity — ICA", url: "https://ica.coop/en/cooperatives/cooperative-identity", tipo: "site" },
            { titulo: "Sistema OCB — Somos Cooperativismo", url: "https://somoscooperativismo.coop.br/institucional/ocb", tipo: "site" },
            { titulo: "AnuárioCoop — dados do cooperativismo brasileiro", url: "https://somoscooperativismo.coop.br/anuario", tipo: "dataset" },
            { titulo: "E-book Cooperativismo: de onde vem e para onde vai (Sebrae)", url: "https://sebrae.com.br/Sebrae/Portal%20Sebrae/Arquivos/E-book_Cooperativismo_de_onde_vem_e_para_onde_vai.v2.pdf", tipo: "livro" },
          ],
        },
      ],
    },
    {
      id: "plano",
      titulo: "Monte o seu plano de cooperativa",
      blocos: [
        { tipo: "texto", texto: "Hora de juntar tudo. Pegue uma ideia real de cooperativa de trabalho no seu contexto e passe por todo o caminho do caderno: por que ela faz sentido, que tipo é (produção ou serviço), quantos sócios, como se decide, quanto rende, quem registra. Um plano honesto já mostra se vale a pena — e protege o grupo de virar mais um coopergato." },
        {
          tipo: "tarefas",
          itens: [
            { id: "plano-coop", titulo: "Escreva o plano em uma página", entrega: "Objeto, tipo (art. 4º), nº de sócios, retirada estimada frente ao piso, os 2 conselhos e os profissionais a mobilizar. Cole o resultado nesta página." },
            { id: "autoavaliacao", titulo: "Teste antifraude", entrega: "Responda com sim/não: há autogestão real? Um sócio, um voto? Direitos do art. 7º garantidos? Se algum for 'não', escreva como corrigir." },
          ],
        },
        {
          tipo: "licao",
          pergunta: "Qual é o número mínimo de sócios para uma cooperativa de trabalho?",
          alternativas: ["3 sócios", "7 sócios", "20 sócios"],
          correta: 1,
          explicacao: "Art. 6º da Lei 12.690/2012: mínimo de 7 sócios — menor que os 20 exigidos para outros tipos de cooperativa.",
        },
      ],
    },
    // ===================== SÍNTESE =====================
    {
      id: "compilado",
      titulo: "Prancha de síntese",
      blocos: [
        { tipo: "texto", texto: "Arraste os cards pelo carimbo para reorganizar sua jornada — de Rochdale (1844) à Lei 12.690 (2012), da teoria ao plano prático. Abaixo da prancha, suas anotações e imagens aparecem na ordem das páginas, prontas para virar o rascunho da sua cooperativa." },
        { tipo: "compilado" },
      ],
    },
  ],
};
