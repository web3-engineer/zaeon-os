import type { CadernoEstudo } from "../cadernosEstudo";

/**
 * Caderno de campo: Tempo de acesso ao transporte público por bairro.
 * Conteúdo com lastro real: Lei 12.587/2012 (Política Nacional de Mobilidade Urbana) e
 * Lei 10.257/2001 (Estatuto da Cidade); Secretaria Nacional de Mobilidade Urbana (SEMOB /
 * Ministério das Cidades); Projeto Acesso a Oportunidades do IPEA e seus pacotes aopdata e
 * r5r; especificação GTFS (gtfs.org / Google Transit) e OpenStreetMap; ferramentas abertas
 * OpenTripPlanner e QGIS; indicadores de proximidade ao transporte do ITDP; malhas de
 * setores censitários e PNAD Contínua do IBGE; dados abertos (data.rio) e literatura
 * revisada por pares (revista urbe, SciELO). As etapas que exigem geoprocessamento validado,
 * estatística, engenharia/urbanismo ou pesquisa de campo estruturada viram blocos de
 * mobilização. Não há bloco de vídeo porque nenhum id foi confirmado em verificação direta.
 */
export const caderno: CadernoEstudo = {
  id: "acesso-transporte",
  titulo: "Tempo de acesso ao transporte público por bairro: ler, medir e provar a desigualdade",
  resumo:
    "Do portão de casa ao ônibus que passa: como uma pessoa ou um coletivo aprende a medir, com método e fonte, quanto tempo cada bairro gasta para chegar ao transporte público e ao que a cidade oferece. Caminhada até a parada, espera pela frequência, viagem, baldeação e egresso viram número; o número vira isócrona, mapa de calor e painel; o painel vira argumento no conselho de mobilidade. Cada afirmação tem norma, dataset aberto ou estudo citado na própria página, e cada etapa que exige um profissional abre a vaga certa.",
  paginas: [
    // ===================== CAPÍTULO 1 — CONTEXTO =====================
    {
      id: "abertura",
      titulo: "Como usar este caderno de campo",
      blocos: [
        { tipo: "texto", texto: "Este caderno acompanha quem quer saber, com prova, quanto tempo cada bairro leva para alcançar o transporte público e, por ele, os empregos, a escola e o posto de saúde. A pergunta não é só \"tem ônibus?\", e sim \"quanto custa, em minutos, sair daqui?\". Cada página traz leitura curta, um desenho ou diagrama, tarefas de campo e a fonte que sustenta a afirmação. Nada aqui é opinião: quando aparece um número ou uma norma, ele vem de lei, dataset público ou estudo citado na própria página." },
        { tipo: "texto", texto: "A regra do caderno: antes de concluir, meça; antes de medir, delimite o bairro e a rede; e antes de declarar um bairro bem ou mal servido, compare com um padrão. O tempo de acesso tem partes (caminhar até a parada, esperar, viajar, baldear, caminhar até o destino), e cada parte se mede de um jeito. Quando a etapa exigir geoprocessamento validado, estatística, engenharia/urbanismo ou pesquisa estruturada, a página mostra um campo de mobilização que abre a vaga e acompanha até ficar pronto. Você observa, cronometra e registra; o profissional assina o que precisa de assinatura." },
        { tipo: "diagrama", titulo: "O percurso do caderno", codigo: `flowchart TD
  A["Contexto: por que o acesso e desigual"] --> B["Ler o bairro, a parada e a rede"]
  B --> C["Metodo: distancia, tempo e acessibilidade"]
  C --> D["Calculo: isocrona e tempo porta a porta"]
  D --> E["Projeto: diagnostico e painel por bairro"]
  E --> F["Execucao: coleta, survey e levar ao poder publico"]
  F --> G["Manutencao: atualizar GTFS e seguir a tendencia"]
  G --> H["Casos reais"]
  H --> I["Prancha de sintese"]` },
      ],
    },
    {
      id: "por-que-importa",
      titulo: "Por que o acesso ao transporte é desigual",
      blocos: [
        { tipo: "texto", texto: "Na cidade brasileira típica, quem mora longe do centro paga duas vezes: mora longe porque o chão é mais barato, e porque é longe gasta mais tempo e dinheiro para chegar a tudo. O transporte público deveria encurtar essa distância, mas quando a linha é rara, o itinerário é tortuoso e a parada fica a vários quarteirões, o bairro periférico acumula minutos que o bairro central não gasta. Esse tempo perdido é regressivo: pesa mais sobre quem tem menos." },
        { tipo: "texto", texto: "A boa notícia é que isso é mensurável e, portanto, discutível com dado. Acesso ao transporte não é cheiro nem impressão: é distância que se mede no mapa, tempo que se cronometra no ponto e oportunidade que se conta (quantos empregos, escolas e hospitais este bairro alcança em até 30, 60 ou 90 minutos). Medir é o primeiro passo para cobrar uma linha nova, um itinerário melhor ou uma parada mais perto, com número no lugar de reclamação." },
        {
          tipo: "licao",
          pergunta: "Por que o tempo de acesso ao transporte costuma ser chamado de custo regressivo?",
          alternativas: [
            "Porque diminui com o tempo sozinho",
            "Porque pesa proporcionalmente mais sobre quem tem menor renda e mora mais longe",
            "Porque só afeta quem tem carro",
          ],
          correta: 1,
          explicacao: "Famílias de menor renda tendem a morar em áreas periféricas com transporte mais escasso, logo gastam mais tempo e dinheiro no deslocamento; o custo recai proporcionalmente mais sobre elas, por isso é regressivo.",
        },
      ],
    },
    {
      id: "acessibilidade-vs-mobilidade",
      titulo: "Acessibilidade não é mobilidade",
      blocos: [
        { tipo: "texto", texto: "Mobilidade é a facilidade de se mover: quilômetros rodados, velocidade, quantidade de viagens. Acessibilidade é a facilidade de alcançar o que importa: empregos, saúde, educação, lazer. Uma avenida larga aumenta a mobilidade dos carros, mas um bairro pode ter muita mobilidade e pouca acessibilidade se a rede não leva a lugar nenhum útil em tempo razoável. Este caderno mede acessibilidade pelo transporte público, que é o que decide a vida de quem não dirige." },
        {
          tipo: "prancha",
          titulo: "Dois bairros, mesma distância, acesso diferente",
          desenho: {
            legenda: "Mesma distância até o centro; o bairro A tem parada perto e linha frequente, o bairro B tem parada longe e linha rara. O tempo de acesso (não a distância) separa os dois.",
            primitivas: [
              { t: "retangulo", p: [230, 80], w: 50, h: 40, cor: "destaque" },
              { t: "rotulo", p: [236, 104], texto: "Centro" },
              { t: "circulo", c: [40, 50], r: 10, cor: "tinta" },
              { t: "rotulo", p: [20, 32], texto: "Bairro A" },
              { t: "circulo", c: [55, 55], r: 4, cor: "destaque" },
              { t: "rotulo", p: [60, 52], texto: "parada perto" },
              { t: "linha", de: [55, 55], ate: [230, 95], cor: "destaque" },
              { t: "circulo", c: [40, 150], r: 10, cor: "tinta" },
              { t: "rotulo", p: [20, 172], texto: "Bairro B" },
              { t: "circulo", c: [95, 140], r: 4, cor: "suave" },
              { t: "rotulo", p: [100, 158], texto: "parada longe" },
              { t: "curva", pts: [[40, 150], [95, 140]], cor: "suave" },
              { t: "curva", pts: [[95, 140], [140, 165], [185, 120], [230, 110]], cor: "suave" },
            ],
          },
        },
        { tipo: "texto", texto: "Guarde a distinção: distância reta no mapa engana. O que a pessoa sente é o tempo porta a porta, que soma a caminhada até a parada, a espera que depende da frequência, a viagem, as baldeações e a caminhada final. Dois bairros a 8 km do centro podem viver realidades opostas conforme a rede e a oferta." },
      ],
    },
    {
      id: "direito-a-cidade",
      titulo: "O direito à cidade e a lei que ampara",
      blocos: [
        { tipo: "texto", texto: "Acesso ao transporte não é favor: é política pública com lei. A Política Nacional de Mobilidade Urbana (Lei 12.587/2012) tem como princípios a acessibilidade universal (art. 5º, I) e a equidade no acesso dos cidadãos ao transporte público coletivo (art. 5º, III), e como diretriz a prioridade do transporte coletivo e dos modos não motorizados sobre o automóvel (art. 6º, II). O objetivo declarado é contribuir para o acesso universal à cidade." },
        { tipo: "texto", texto: "A mesma lei torna obrigatório o Plano de Mobilidade Urbana para municípios acima de certo porte, e o Estatuto da Cidade (Lei 10.257/2001) prevê plano de transporte urbano integrado e plano de rotas acessíveis como instrumentos do planejamento. Ou seja: medir o tempo de acesso por bairro é produzir exatamente a informação que esses planos deveriam usar. Quando o coletivo mede, ele ocupa um espaço que a lei já abriu." },
        { tipo: "fontes", titulo: "Marco legal e institucional", itens: [
          { titulo: "Lei 12.587/2012 — Política Nacional de Mobilidade Urbana", url: "https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2012/lei/l12587.htm", tipo: "norma", nota: "Princípios (acessibilidade universal, equidade), prioridade do coletivo e obrigação do plano de mobilidade." },
          { titulo: "Lei 10.257/2001 — Estatuto da Cidade", url: "https://www.planalto.gov.br/ccivil_03/leis/leis_2001/l10257.htm", tipo: "norma", nota: "Plano diretor, plano de transporte urbano integrado (art. 41) e plano de rotas acessíveis." },
          { titulo: "Ministério das Cidades — Mobilidade Urbana (SEMOB)", url: "https://www.gov.br/cidades/pt-br/assuntos/mobilidade-urbana", tipo: "site", nota: "Secretaria Nacional de Mobilidade Urbana: apoio a planos, Pemob e SIMU." },
          { titulo: "urbe — Revista Brasileira de Gestão Urbana (SciELO)", url: "https://www.scielo.br/j/urbe/", tipo: "artigo", nota: "Periódico revisado por pares com estudos de acessibilidade e mobilidade urbana no Brasil." },
        ] },
        {
          tipo: "licao",
          pergunta: "Segundo a Lei 12.587/2012, qual é a prioridade na mobilidade urbana?",
          alternativas: [
            "O transporte individual motorizado",
            "O transporte coletivo e os modos não motorizados sobre o automóvel",
            "Apenas o transporte de cargas",
          ],
          correta: 1,
          explicacao: "A diretriz do art. 6º, II da PNMU dá prioridade aos modos não motorizados sobre os motorizados e ao transporte público coletivo sobre o transporte individual motorizado.",
        },
      ],
    },
    {
      id: "desigualdade-territorial",
      titulo: "Tempo, periferia e segregação",
      blocos: [
        { tipo: "texto", texto: "A geografia do acesso reproduz a geografia da renda. Estudos do Projeto Acesso a Oportunidades do IPEA mostram que, nas grandes cidades brasileiras, a quantidade de empregos que uma pessoa alcança de transporte público em até 60 minutos é muito maior nos bairros centrais e de renda alta do que nas periferias de renda baixa. O mesmo bairro que concentra necessidade concentra a pior oferta de transporte: é a desigualdade de acesso." },
        {
          tipo: "prancha",
          titulo: "Curva do acesso por faixa de renda",
          desenho: {
            legenda: "Empregos alcançáveis em 60 min de transporte público tendem a crescer com a renda do bairro: periferia pobre no pé da curva, centro rico no topo.",
            primitivas: [
              { t: "linha", de: [40, 170], ate: [280, 170], cor: "tinta" },
              { t: "linha", de: [40, 170], ate: [40, 30], cor: "tinta" },
              { t: "rotulo", p: [44, 20], texto: "Empregos em 60 min" },
              { t: "rotulo", p: [150, 182], texto: "Renda do bairro" },
              { t: "curva", pts: [[50, 160], [110, 140], [170, 95], [230, 55], [270, 42]], cor: "destaque" },
              { t: "circulo", c: [60, 157], r: 4, cor: "suave" },
              { t: "rotulo", p: [64, 150], texto: "periferia" },
              { t: "circulo", c: [258, 46], r: 4, cor: "tinta" },
              { t: "rotulo", p: [210, 40], texto: "centro" },
            ],
          },
        },
        { tipo: "texto", texto: "Medir o tempo de acesso por bairro expõe essa curva com dado local. Não é para repetir o óbvio, e sim para dar número ao óbvio: quanto exatamente este bairro perde, onde a linha falta, quantas pessoas isso afeta. É esse número que entra numa audiência pública e que um gestor não consegue ignorar." },
      ],
    },

    // ===================== CAPÍTULO 2 — LER O BAIRRO, A PARADA E A REDE =====================
    {
      id: "bairro-unidade",
      titulo: "O bairro como unidade: onde ele começa e acaba",
      blocos: [
        { tipo: "texto", texto: "Antes de medir, defina o recorte. \"Bairro\" na linguagem comum nem sempre coincide com a divisão oficial. Para análise séria use uma malha que tenha dado associado: setores censitários do IBGE (as menores unidades do Censo, com população, renda e domicílios), bairros oficiais da prefeitura, ou uma grade hexagonal regular como a usada pelo IPEA. A escolha muda o resultado, então declare-a." },
        {
          tipo: "prancha",
          titulo: "Três recortes do mesmo território",
          desenho: {
            legenda: "O mesmo chão pode ser lido por bairro oficial (linha), setor censitário (retângulos) ou hexágonos regulares. Cada recorte carrega dados diferentes.",
            primitivas: [
              { t: "curva", pts: [[30, 40], [120, 30], [150, 90], [90, 140], [30, 110], [30, 40]], cor: "tinta" },
              { t: "rotulo", p: [40, 60], texto: "bairro" },
              { t: "retangulo", p: [170, 30], w: 40, h: 35, cor: "suave" },
              { t: "retangulo", p: [210, 30], w: 40, h: 35, cor: "suave" },
              { t: "retangulo", p: [170, 65], w: 40, h: 35, cor: "suave" },
              { t: "rotulo", p: [172, 120], texto: "setores" },
              { t: "circulo", c: [230, 130], r: 14, hachura: true },
              { t: "circulo", c: [258, 145], r: 14, hachura: true },
              { t: "rotulo", p: [214, 175], texto: "hexagonos" },
            ],
          },
        },
        { tipo: "tarefas", itens: [
          { id: "delimitar-bairro", titulo: "Delimite o seu bairro num mapa", entrega: "Num mapa (QGIS, Google My Maps ou papel sobre imagem de satélite), trace o contorno do bairro que vai estudar e anote qual recorte usou (bairro oficial, setor censitário ou grade). Registre a fonte da divisa." },
        ] },
      ],
    },
    {
      id: "parada-e-caminhada",
      titulo: "A parada e o pé de acesso",
      blocos: [
        { tipo: "texto", texto: "O acesso ao transporte começa a pé. A distância de caminhada aceitável até uma parada é um padrão de planejamento: tradicionalmente usa-se cerca de 400 metros (uns 5 minutos a pé) para pontos de ônibus e cerca de 800 metros (uns 10 minutos) para estações de trem, metrô ou BRT, porque a viagem mais longa justifica caminhar mais. Fora desse raio, o bairro é considerado descoberto, mesmo que a linha exista." },
        {
          tipo: "prancha",
          titulo: "Raio de cobertura de uma parada",
          desenho: {
            legenda: "A área de influência de uma parada é o círculo de caminhada ao redor dela (cerca de 400 m para ônibus). Casas fora do raio estão descobertas.",
            primitivas: [
              { t: "circulo", c: [150, 100], r: 70, cor: "suave" },
              { t: "circulo", c: [150, 100], r: 4, cor: "destaque" },
              { t: "rotulo", p: [156, 98], texto: "parada" },
              { t: "rotulo", p: [120, 100], texto: "~400 m" },
              { t: "linha", de: [150, 100], ate: [220, 100], cor: "destaque" },
              { t: "retangulo", p: [120, 70], w: 12, h: 12, cor: "tinta" },
              { t: "retangulo", p: [175, 120], w: 12, h: 12, cor: "tinta" },
              { t: "retangulo", p: [250, 40], w: 12, h: 12, hachura: true },
              { t: "rotulo", p: [236, 32], texto: "descoberta" },
            ],
          },
        },
        { tipo: "texto", texto: "Atenção: o raio não é um círculo perfeito na vida real. Um muro, um rio, uma avenida sem faixa ou uma favela sem rua contínua encurtam o alcance real. Por isso a medição boa usa a distância pela rede de ruas (quanto se anda de fato), e não a linha reta. Volte a isso quando montar a isócrona." },
      ],
    },
    {
      id: "frequencia-importa",
      titulo: "Ter parada não basta: a frequência decide",
      blocos: [
        { tipo: "texto", texto: "Uma parada com um ônibus por hora não resolve a vida de ninguém. O que importa é o intervalo entre veículos (o headway). Para o passageiro que chega sem olhar horário, a espera média é cerca da metade do intervalo: linha de 10 em 10 minutos gera espera média de 5; linha de 40 em 40 gera 20 minutos parado no ponto. É por isso que indicadores sérios, como os do ITDP, só contam como \"servido\" quem está perto de transporte frequente, não de qualquer linha." },
        {
          tipo: "prancha",
          titulo: "Headway e espera média",
          desenho: {
            legenda: "Quanto maior o intervalo entre veículos, maior a espera média (cerca da metade do intervalo). Frequência alta encurta o tempo total.",
            primitivas: [
              { t: "linha", de: [30, 60], ate: [280, 60], cor: "tinta" },
              { t: "rotulo", p: [30, 44], texto: "linha frequente (10 min)" },
              { t: "circulo", c: [60, 60], r: 4, cor: "destaque" },
              { t: "circulo", c: [110, 60], r: 4, cor: "destaque" },
              { t: "circulo", c: [160, 60], r: 4, cor: "destaque" },
              { t: "circulo", c: [210, 60], r: 4, cor: "destaque" },
              { t: "circulo", c: [260, 60], r: 4, cor: "destaque" },
              { t: "linha", de: [30, 140], ate: [280, 140], cor: "tinta" },
              { t: "rotulo", p: [30, 124], texto: "linha rara (40 min)" },
              { t: "circulo", c: [60, 140], r: 4, cor: "suave" },
              { t: "circulo", c: [260, 140], r: 4, cor: "suave" },
              { t: "rotulo", p: [120, 160], texto: "espera media ~ intervalo / 2" },
            ],
          },
        },
        {
          tipo: "licao",
          pergunta: "Uma linha passa a cada 30 minutos. Qual a espera média de quem chega ao ponto sem consultar horário?",
          alternativas: ["30 minutos", "Cerca de 15 minutos", "Cerca de 5 minutos"],
          correta: 1,
          explicacao: "Para chegadas aleatórias ao ponto, a espera média é aproximadamente metade do intervalo entre veículos; 30 minutos de headway resultam em cerca de 15 minutos de espera média.",
        },
      ],
    },
    {
      id: "rede-e-conexoes",
      titulo: "A rede: linhas isoladas versus rede conectada",
      blocos: [
        { tipo: "texto", texto: "Acesso não é uma linha: é uma rede. Um bairro pode ter uma linha boa que só vai a um lugar, e continuar preso. O que destrava a cidade é a conexão: linhas que se cruzam, terminais onde se baldeia sem pagar de novo, integração entre ônibus, metrô e trem. A PNMU trata integração física, tarifária e operacional como diretriz justamente porque uma baldeação bem feita vale mais que um itinerário longo e direto." },
        { tipo: "diagrama", titulo: "De linha isolada a rede integrada", codigo: `flowchart LR
  A["Bairro"] --> B["Linha unica longa"]
  B --> C["Centro"]
  A2["Bairro"] --> T["Terminal de integracao"]
  T --> L1["Metro"]
  T --> L2["Linha troncal"]
  L1 --> D["Emprego"]
  L2 --> E["Hospital"]` },
        { tipo: "texto", texto: "Na medição, isso aparece como número de baldeações e tempo de transferência. Cada troca de veículo soma caminhada no terminal mais nova espera. Uma rede bem desenhada reduz baldeações e sincroniza horários; uma rede ruim empilha esperas. Conte as baldeações do seu bairro aos principais destinos: é um indicador simples e revelador." },
      ],
    },
    {
      id: "ler-territorio-campo",
      titulo: "Ler o território com os pés",
      blocos: [
        { tipo: "texto", texto: "Antes do computador, o campo. Caminhe do ponto mais afastado do bairro até a parada mais próxima e sinta o percurso: tem calçada? É contínua? Tem travessia segura? Tem iluminação, sombra, rampa? O tempo de acesso real não é só distância: uma calçada quebrada, um barranco ou uma avenida sem faixa fazem a pessoa desviar, desistir ou se arriscar. Esse levantamento qualitativo ancora os números que você vai calcular depois." },
        { tipo: "tarefas", itens: [
          { id: "caminhada-diagnostico", titulo: "Faça a caminhada-diagnóstico até a parada", entrega: "Escolha 3 pontos de partida no bairro, caminhe até a parada mais próxima de cada um e registre para cada trecho: tempo cronometrado, existência de calçada, travessias, obstáculos e uma foto. Monte uma tabela com as 3 linhas." },
          { id: "inventario-paradas", titulo: "Inventarie as paradas do bairro", entrega: "Marque num mapa todas as paradas dentro do bairro, com coordenada de GPS e as linhas que param em cada uma. Anote onde há abrigo, banco e informação de horário." },
        ] },
      ],
    },

    // ===================== CAPÍTULO 3 — MÉTODO =====================
    {
      id: "tres-medidas",
      titulo: "Três formas de medir acesso",
      blocos: [
        { tipo: "texto", texto: "Há três medidas, do simples ao completo. A primeira é a distância até a parada (proximidade): quantos metros, quantas pessoas dentro do raio de cobertura. A segunda é o tempo de viagem a um destino (ex.: ao centro, ao hospital de referência). A terceira, a mais poderosa, é a acessibilidade a oportunidades: quantos empregos, escolas ou unidades de saúde o bairro alcança dentro de um tempo-limite. As três se somam num bom diagnóstico." },
        {
          tipo: "prancha",
          titulo: "Da proximidade à acessibilidade",
          desenho: {
            legenda: "Proximidade mede a parada; tempo de viagem mede um destino; acessibilidade conta tudo o que se alcança no tempo-limite.",
            primitivas: [
              { t: "circulo", c: [55, 60], r: 20, cor: "suave" },
              { t: "circulo", c: [55, 60], r: 3, cor: "destaque" },
              { t: "rotulo", p: [30, 95], texto: "1 proximidade" },
              { t: "circulo", c: [150, 60], r: 3, cor: "tinta" },
              { t: "seta", de: [150, 60], ate: [190, 60], cor: "destaque" },
              { t: "circulo", c: [195, 60], r: 6, cor: "tinta" },
              { t: "rotulo", p: [128, 95], texto: "2 tempo a 1 destino" },
              { t: "circulo", c: [255, 60], r: 3, cor: "tinta" },
              { t: "circulo", c: [230, 130], r: 5, hachura: true },
              { t: "circulo", c: [255, 125], r: 5, hachura: true },
              { t: "circulo", c: [280, 135], r: 5, hachura: true },
              { t: "seta", de: [255, 65], ate: [250, 118], cor: "suave" },
              { t: "rotulo", p: [205, 170], texto: "3 acessibilidade (conta destinos)" },
            ],
          },
        },
        { tipo: "texto", texto: "Para \"tempo de acesso por bairro\", a medida-chave é o tempo porta a porta e a acessibilidade a oportunidades. A proximidade é o começo; sozinha, esconde a frequência ruim e os itinerários longos. Use as três camadas e deixe claro qual número está mostrando em cada mapa." },
      ],
    },
    {
      id: "isocrona",
      titulo: "A isócrona: o mapa do alcançável",
      blocos: [
        { tipo: "texto", texto: "Isócrona é a linha que une todos os pontos alcançáveis a partir de um lugar dentro de um mesmo tempo. A isócrona de 30 minutos de transporte público saindo do seu bairro é o contorno de tudo que dá para alcançar em meia hora. Bairro bem servido tem isócronas largas; bairro mal servido tem isócronas murchas, que mal saem do próprio contorno. A isócrona é a imagem mais direta do tempo de acesso." },
        {
          tipo: "prancha",
          titulo: "Isócronas de 15, 30 e 45 minutos",
          desenho: {
            legenda: "A partir de um ponto, cada anel reúne o que se alcança em 15, 30 e 45 min. Quanto melhor a rede, mais longe chega cada anel.",
            primitivas: [
              { t: "circulo", c: [150, 100], r: 25, cor: "destaque" },
              { t: "circulo", c: [150, 100], r: 50, cor: "tinta" },
              { t: "circulo", c: [150, 100], r: 78, cor: "suave" },
              { t: "circulo", c: [150, 100], r: 3, cor: "destaque" },
              { t: "rotulo", p: [156, 98], texto: "casa" },
              { t: "rotulo", p: [140, 70], texto: "15" },
              { t: "rotulo", p: [140, 45], texto: "30" },
              { t: "rotulo", p: [140, 18], texto: "45 min" },
            ],
          },
        },
        {
          tipo: "licao",
          pergunta: "O que mostra uma isócrona de 30 minutos a partir de um bairro?",
          alternativas: [
            "A distância em linha reta até o centro",
            "Toda a área que se alcança em até 30 minutos a partir daquele ponto",
            "O número de habitantes do bairro",
          ],
          correta: 1,
          explicacao: "A isócrona delimita o conjunto de locais alcançáveis dentro de um tempo-limite a partir de uma origem; a de 30 minutos cobre tudo o que se alcança em meia hora.",
        },
      ],
    },
    {
      id: "gtfs",
      titulo: "GTFS: o dado que descreve a rede",
      blocos: [
        { tipo: "texto", texto: "Para calcular tempo por transporte público é preciso descrever a rede num formato que o computador entenda. Esse formato é o GTFS (General Transit Feed Specification): um pacote de tabelas que diz onde ficam as paradas, por onde passam as linhas, quais viagens existem e a que horas cada veículo passa em cada parada. Muitas cidades publicam seu GTFS como dado aberto; é a matéria-prima de todo cálculo de acessibilidade por transporte." },
        { tipo: "diagrama", titulo: "Os arquivos centrais do GTFS", codigo: `flowchart TD
  S["stops.txt: paradas (id, lat, lon)"] --> ST["stop_times.txt: horario em cada parada"]
  R["routes.txt: linhas"] --> TR["trips.txt: viagens de cada linha"]
  TR --> ST
  C["calendar.txt: dias de operacao"] --> TR
  F["frequencies.txt: intervalos (headway)"] --> TR` },
        { tipo: "texto", texto: "Entenda a lógica: routes.txt lista as linhas; trips.txt, cada viagem; stop_times.txt amarra a viagem às paradas com horário; calendar.txt diz em que dias ela roda; frequencies.txt pode descrever o intervalo em vez de cada horário. Com isso, um roteador reconstrói a rede no tempo e responde \"saindo às 7h desta parada, quando chego lá?\"." },
        { tipo: "fontes", titulo: "O formato da rede e a base do mapa", itens: [
          { titulo: "GTFS — especificação (gtfs.org)", url: "https://gtfs.org", tipo: "norma", nota: "Especificação aberta do formato de dados de transporte público (Schedule e Realtime)." },
          { titulo: "GTFS Reference — Google Transit", url: "https://developers.google.com/transit/gtfs/reference", tipo: "site", nota: "Referência detalhada de cada arquivo e campo do GTFS." },
          { titulo: "OpenStreetMap", url: "https://www.openstreetmap.org/", tipo: "dataset", nota: "Base aberta de ruas e calçadas usada para a rede de caminhada até as paradas." },
        ] },
      ],
    },
    {
      id: "rede-a-pe-osm",
      titulo: "A rede de caminhada vem do mapa",
      blocos: [
        { tipo: "texto", texto: "A primeira e a última parte da viagem são a pé, e andar segue as ruas, não a linha reta. Para medir a caminhada real até a parada usa-se a rede viária do OpenStreetMap: ruas, calçadas, travessias e atalhos de pedestre. Assim a distância de acesso respeita muros, rios e quarteirões. É essa rede, somada ao GTFS, que permite calcular o tempo porta a porta de verdade." },
        {
          tipo: "prancha",
          titulo: "Distância reta versus distância pela rede",
          desenho: {
            legenda: "A linha reta (tracejada) subestima; o caminho pela rede (cheio) é o que a pessoa realmente anda até a parada.",
            primitivas: [
              { t: "circulo", c: [50, 150], r: 5, cor: "tinta" },
              { t: "rotulo", p: [30, 170], texto: "casa" },
              { t: "circulo", c: [250, 50], r: 5, cor: "destaque" },
              { t: "rotulo", p: [230, 38], texto: "parada" },
              { t: "linha", de: [50, 150], ate: [250, 50], cor: "suave" },
              { t: "rotulo", p: [120, 90], texto: "reta (engana)" },
              { t: "linha", de: [50, 150], ate: [50, 80], cor: "tinta" },
              { t: "linha", de: [50, 80], ate: [160, 80], cor: "tinta" },
              { t: "linha", de: [160, 80], ate: [160, 50], cor: "tinta" },
              { t: "linha", de: [160, 50], ate: [250, 50], cor: "tinta" },
              { t: "rotulo", p: [90, 68], texto: "pela rede (real)" },
            ],
          },
        },
        { tipo: "texto", texto: "A diferença entre a linha reta e o caminho pela rede é o fator de desvio. Em malha urbana regular ele costuma passar de 1,3; em bairros com ruas sem saída, barreiras ou favelas sem viário contínuo, pode ser muito maior. Ignorar isso superestima a cobertura das paradas. Boa medição sempre anda pela rede." },
      ],
    },
    {
      id: "roteamento",
      titulo: "Roteamento: do dado ao tempo de viagem",
      blocos: [
        { tipo: "texto", texto: "Juntando GTFS (a rede de transporte no tempo) e OpenStreetMap (a rede de caminhada), um motor de roteamento calcula o tempo porta a porta entre milhares de pares origem-destino. Ferramentas abertas fazem isso: o OpenTripPlanner e o motor R5 (usado pelo pacote r5r, em R) montam a rede e geram matrizes de tempo de viagem e isócronas. É assim que se produz, de uma vez, o tempo de acesso de cada bairro a cada destino." },
        { tipo: "diagrama", titulo: "Pipeline do cálculo de acesso", codigo: `flowchart LR
  G["GTFS: transporte"] --> M["Motor de roteamento (OTP / R5)"]
  O["OSM: caminhada"] --> M
  M --> MT["Matriz de tempo origem-destino"]
  MT --> I["Isocronas por bairro"]
  MT --> AC["Acessibilidade: oportunidades no tempo-limite"]` },
        { tipo: "texto", texto: "O motor considera a hora de partida (a rede das 7h é diferente da rede das 23h), a espera pela frequência, as baldeações e a caminhada. O resultado é uma matriz: para cada origem, o tempo até cada destino. Dela saem as isócronas e os indicadores de acessibilidade. Montar esse pipeline exige um pouco de técnica, mas as ferramentas são livres e documentadas." },
        { tipo: "fontes", titulo: "Motores de roteamento abertos", itens: [
          { titulo: "OpenTripPlanner", url: "https://www.opentripplanner.org/", tipo: "site", nota: "Roteador multimodal de código aberto que usa GTFS e OSM; gera itinerários e isócronas." },
          { titulo: "r5r — roteamento rápido em R (ipeaGIT)", url: "https://github.com/ipeaGIT/r5r", tipo: "site", nota: "Interface em R para o motor R5: matrizes de tempo de viagem e acessibilidade a partir de GTFS e OSM." },
          { titulo: "QGIS — Sistema de Informação Geográfica livre", url: "https://qgis.org/", tipo: "site", nota: "SIG aberto para montar mapas, buffers e visualizar isócronas e indicadores por bairro." },
        ] },
      ],
    },
    {
      id: "indicadores",
      titulo: "Os indicadores que você vai calcular",
      blocos: [
        { tipo: "texto", texto: "Para falar a mesma língua de planejadores, use indicadores reconhecidos. Proximidade: percentual da população do bairro dentro do raio de caminhada de uma parada de transporte frequente (base dos indicadores de pessoas perto do transporte, do ITDP). Acessibilidade cumulativa: número de empregos/serviços alcançáveis em 30, 60 ou 90 minutos. Tempo ao mais próximo: minutos até o hospital, a escola ou o emprego mais perto. Cada um responde a uma pergunta distinta." },
        {
          tipo: "prancha",
          titulo: "Painel de três indicadores por bairro",
          desenho: {
            legenda: "Um diagnóstico forte combina proximidade (% coberto), acessibilidade (quantos alcança) e tempo ao destino essencial mais próximo.",
            primitivas: [
              { t: "retangulo", p: [20, 40], w: 80, h: 110, cor: "tinta" },
              { t: "rotulo", p: [26, 34], texto: "% coberto" },
              { t: "retangulo", p: [28, 90], w: 64, h: 55, cor: "destaque" },
              { t: "retangulo", p: [112, 40], w: 80, h: 110, cor: "tinta" },
              { t: "rotulo", p: [118, 34], texto: "empregos 60min" },
              { t: "retangulo", p: [120, 70], w: 64, h: 75, cor: "suave" },
              { t: "retangulo", p: [204, 40], w: 80, h: 110, cor: "tinta" },
              { t: "rotulo", p: [210, 34], texto: "min ao posto" },
              { t: "linha", de: [212, 120], ate: [276, 70], cor: "destaque" },
            ],
          },
        },
        {
          tipo: "licao",
          pergunta: "Qual indicador mede \"quantos empregos este bairro alcança de ônibus em até 60 minutos\"?",
          alternativas: ["Proximidade à parada", "Acessibilidade cumulativa a oportunidades", "Fator de desvio da rede"],
          correta: 1,
          explicacao: "A acessibilidade cumulativa conta o número de oportunidades (empregos, escolas, saúde) alcançáveis dentro de um tempo-limite; é a medida central do Projeto Acesso a Oportunidades.",
        },
      ],
    },

    // ===================== CAPÍTULO 4 — CÁLCULO / MEDIÇÃO =====================
    {
      id: "medir-a-pe",
      titulo: "Medir a caminhada em campo",
      blocos: [
        { tipo: "texto", texto: "O jeito mais barato e honesto de começar é cronometrar. Pegue um celular com GPS e um cronômetro, caminhe do ponto escolhido até a parada em passo normal e anote o tempo e a distância. Repita em vários pontos do bairro. Esses tempos reais calibram o modelo: se o roteador diz 6 minutos e você anda 9 por causa de um desvio, você descobriu uma barreira que o mapa não via." },
        {
          tipo: "prancha",
          titulo: "Ficha de caminhada cronometrada",
          desenho: {
            legenda: "Para cada ponto: origem, parada, tempo cronometrado e distância do GPS. A diferença para o modelo revela barreiras.",
            primitivas: [
              { t: "retangulo", p: [30, 40], w: 240, h: 120, cor: "tinta" },
              { t: "linha", de: [30, 70], ate: [270, 70], cor: "suave" },
              { t: "linha", de: [30, 100], ate: [270, 100], cor: "suave" },
              { t: "linha", de: [30, 130], ate: [270, 130], cor: "suave" },
              { t: "linha", de: [110, 40], ate: [110, 160], cor: "suave" },
              { t: "linha", de: [190, 40], ate: [190, 160], cor: "suave" },
              { t: "rotulo", p: [40, 58], texto: "ponto" },
              { t: "rotulo", p: [120, 58], texto: "tempo" },
              { t: "rotulo", p: [200, 58], texto: "metros" },
            ],
          },
        },
        { tipo: "tarefas", itens: [
          { id: "cronometrar-acesso", titulo: "Cronometre 5 acessos à parada", entrega: "Em 5 pontos distintos do bairro, caminhe até a parada mais próxima e registre tempo cronometrado, distância do GPS e obstáculos. Calcule o tempo médio de acesso a pé do bairro." },
        ] },
      ],
    },
    {
      id: "cobertura-paradas",
      titulo: "Mapear a cobertura das paradas",
      blocos: [
        { tipo: "texto", texto: "Com as paradas marcadas, calcule a cobertura num SIG. O método básico é o buffer: desenhe o raio de caminhada (por exemplo 400 m) ao redor de cada parada e veja quanta população do bairro cai dentro. O método bom usa área de serviço pela rede de ruas, não o círculo reto. Cruzando com a população por setor censitário do IBGE, você obtém o percentual de pessoas cobertas, o primeiro número forte do diagnóstico." },
        { tipo: "diagrama", titulo: "Passos da análise de cobertura", codigo: `flowchart TD
  P["Paradas (pontos)"] --> B["Buffer / area de servico pela rede"]
  B --> U["Uniao das areas cobertas"]
  POP["Populacao por setor (IBGE)"] --> X["Cruzar populacao x area coberta"]
  U --> X
  X --> R["% do bairro coberto por transporte"]` },
        {
          tipo: "prancha",
          titulo: "Vazios de cobertura",
          desenho: {
            legenda: "Onde os círculos de parada não se tocam, há vazio de cobertura: pessoas fora do alcance de qualquer ponto.",
            primitivas: [
              { t: "retangulo", p: [20, 30], w: 260, h: 140, cor: "tinta" },
              { t: "circulo", c: [70, 70], r: 30, cor: "suave" },
              { t: "circulo", c: [130, 80], r: 30, cor: "suave" },
              { t: "circulo", c: [220, 120], r: 30, cor: "suave" },
              { t: "rotulo", p: [170, 70], texto: "vazio" },
              { t: "circulo", c: [185, 60], r: 3, hachura: true },
            ],
          },
        },
      ],
    },
    {
      id: "montar-isocrona",
      titulo: "Montar a isócrona passo a passo",
      blocos: [
        { tipo: "texto", texto: "Com GTFS da cidade e OSM da região, monte a isócrona no OpenTripPlanner (ou no r5r). Carregue as duas redes, escolha a origem (um ponto central do bairro), a hora de partida (ex.: 7h de um dia útil) e os tempos-limite (15, 30, 45 min). O motor devolve os polígonos. Importe no QGIS, sobreponha aos empregos e serviços e já se vê o tamanho do mundo que o bairro alcança." },
        { tipo: "tarefas", itens: [
          { id: "baixar-gtfs", titulo: "Baixe o GTFS da sua cidade", entrega: "Procure o GTFS aberto da operadora ou prefeitura (ex.: portais de dados abertos municipais). Baixe o arquivo .zip e confirme que tem stops.txt, routes.txt, trips.txt e stop_times.txt." },
          { id: "gerar-isocrona", titulo: "Gere a isócrona de 30 min do bairro", entrega: "No OpenTripPlanner ou r5r, com GTFS + OSM, gere a isócrona de 30 minutos de transporte público saindo de um ponto do bairro às 7h de dia útil. Exporte o polígono e anote a área aproximada alcançada." },
        ] },
      ],
    },
    {
      id: "tempo-porta-a-porta",
      titulo: "Somar o tempo porta a porta",
      blocos: [
        { tipo: "texto", texto: "O tempo que a pessoa sente é a soma: acesso a pé até a parada, espera (cerca de metade do headway), viagem dentro do veículo, tempo de baldeação (caminhada no terminal mais nova espera) e egresso a pé até o destino. Decompor assim mostra onde está o gargalo do bairro: às vezes é a caminhada, às vezes a espera, às vezes a baldeação. Cada parte pede uma solução diferente." },
        {
          tipo: "prancha",
          titulo: "As parcelas do tempo porta a porta",
          desenho: {
            legenda: "A barra total é a soma das parcelas. Identificar a maior parcela aponta a intervenção certa.",
            primitivas: [
              { t: "retangulo", p: [20, 80], w: 40, h: 30, cor: "suave" },
              { t: "rotulo", p: [22, 125], texto: "acesso" },
              { t: "retangulo", p: [60, 80], w: 55, h: 30, cor: "destaque" },
              { t: "rotulo", p: [66, 125], texto: "espera" },
              { t: "retangulo", p: [115, 80], w: 90, h: 30, cor: "tinta" },
              { t: "rotulo", p: [140, 125], texto: "viagem" },
              { t: "retangulo", p: [205, 80], w: 35, h: 30, cor: "destaque" },
              { t: "rotulo", p: [200, 140], texto: "baldeacao" },
              { t: "retangulo", p: [240, 80], w: 35, h: 30, cor: "suave" },
              { t: "rotulo", p: [244, 125], texto: "egresso" },
              { t: "seta", de: [20, 65], ate: [275, 65], cor: "tinta" },
              { t: "rotulo", p: [120, 52], texto: "tempo total" },
            ],
          },
        },
        {
          tipo: "licao",
          pergunta: "O tempo porta a porta de um bairro é alto, mas a viagem no veículo é curta. Onde provavelmente está o gargalo?",
          alternativas: [
            "Na velocidade máxima do ônibus",
            "No acesso a pé, na espera (frequência) ou na baldeação",
            "No número de passageiros sentados",
          ],
          correta: 1,
          explicacao: "Se a viagem é curta mas o total é alto, o tempo se perde nas parcelas de acesso a pé, espera por baixa frequência e baldeação; são essas que a intervenção deve atacar.",
        },
      ],
    },
    {
      id: "acesso-oportunidades",
      titulo: "Contar oportunidades: o método do IPEA",
      blocos: [
        { tipo: "texto", texto: "O Projeto Acesso a Oportunidades do IPEA calcula, para as maiores cidades brasileiras, quantos empregos, escolas e serviços de saúde cada pedaço da cidade alcança por modo e por tempo. A base técnica é a mesma deste caderno: grade hexagonal regular, GTFS, OSM e o motor R5. O projeto publica dados e código abertos (pacotes aopdata e r5r), então dá para baixar o resultado pronto da sua cidade e comparar com a sua medição local." },
        {
          tipo: "prancha",
          titulo: "Oportunidades alcançadas crescem com o tempo-limite",
          desenho: {
            legenda: "Para um mesmo bairro, o número de empregos alcançados sobe conforme o tempo-limite; a inclinação da curva é a qualidade do acesso.",
            primitivas: [
              { t: "linha", de: [40, 160], ate: [280, 160], cor: "tinta" },
              { t: "linha", de: [40, 160], ate: [40, 30], cor: "tinta" },
              { t: "rotulo", p: [44, 22], texto: "empregos" },
              { t: "rotulo", p: [210, 172], texto: "tempo (min)" },
              { t: "curva", pts: [[40, 158], [90, 145], [140, 115], [200, 70], [270, 45]], cor: "destaque" },
              { t: "rotulo", p: [60, 170], texto: "30" },
              { t: "rotulo", p: [135, 170], texto: "60" },
              { t: "rotulo", p: [255, 170], texto: "90" },
            ],
          },
        },
        { tipo: "fontes", titulo: "Acesso a oportunidades e dados de base", itens: [
          { titulo: "IPEA — Projeto Acesso a Oportunidades (AOP)", url: "https://www.ipea.gov.br/acessooportunidades/", tipo: "site", nota: "Estimativas de acesso a empregos, saúde e educação por transporte nas maiores cidades do Brasil." },
          { titulo: "aopdata — dados do AOP em R (ipeaGIT)", url: "https://github.com/ipeaGIT/aopdata", tipo: "dataset", nota: "Acessibilidade, uso do solo e população por grade hexagonal H3; dados e código abertos." },
          { titulo: "IBGE — Malhas de setores censitários", url: "https://www.ibge.gov.br/geociencias/organizacao-do-territorio/malhas-territoriais/26565-malhas-de-setores-censitarios-divisoes-intramunicipais.html", tipo: "dataset", nota: "Menores unidades do Censo; base para população por bairro e cruzamento espacial." },
          { titulo: "IBGE — PNAD Contínua", url: "https://www.ibge.gov.br/estatisticas/sociais/trabalho/17270-pnad-continua.html", tipo: "dataset", nota: "Pesquisa Nacional por Amostra de Domicílios Contínua; subsídio sobre trabalho e deslocamento." },
        ] },
      ],
    },
    {
      id: "mobilizacao-geoprocessamento",
      titulo: "Quando chamar o geoprocessamento",
      blocos: [
        { tipo: "texto", texto: "Montar o roteamento com GTFS e OSM, rodar o R5, validar os polígonos e cruzar com a população exige domínio de SIG e, muitas vezes, de estatística. Dá para aprender o básico, mas um diagnóstico que vai a audiência pública ou a edital precisa de método defensável. Esta é a hora de mobilizar quem faz isso com rigor." },
        { tipo: "mobilizacao", papel: "Analista de geoprocessamento / cientista de dados espaciais (SIG, GTFS, r5r/OTP)", porque: "O cálculo de matrizes de tempo, isócronas e acessibilidade cumulativa com dados reais exige montagem correta da rede, validação do GTFS e tratamento estatístico que não se improvisa; erros silenciosos distorcem o resultado.", entregaEsperada: "Matriz de tempo origem-destino por bairro, isócronas (15/30/45 min) e indicadores de acessibilidade documentados, com metadados, data do GTFS e método reproduzível.", gerenciadoPor: "zaeon" },
      ],
    },

    // ===================== CAPÍTULO 5 — PROJETO =====================
    {
      id: "desenhar-diagnostico",
      titulo: "Desenhar o diagnóstico: o mapa de calor",
      blocos: [
        { tipo: "texto", texto: "O diagnóstico vira imagem num mapa de calor (coroplético): cada bairro ou hexágono pintado conforme o indicador, do verde (bom acesso) ao vermelho (ruim). Um mapa de tempo médio ao emprego mais próximo, outro de empregos alcançáveis em 60 minutos, outro de percentual coberto. Lado a lado, eles contam a história do acesso na cidade e mostram, sem texto, onde a rede falha." },
        {
          tipo: "prancha",
          titulo: "Mapa de calor do acesso por bairro",
          desenho: {
            legenda: "Cada célula recebe uma cor conforme o indicador. O olho encontra na hora o cluster de bairros mal servidos.",
            primitivas: [
              { t: "retangulo", p: [30, 30], w: 45, h: 45, cor: "suave" },
              { t: "retangulo", p: [75, 30], w: 45, h: 45, cor: "suave" },
              { t: "retangulo", p: [120, 30], w: 45, h: 45, cor: "destaque" },
              { t: "retangulo", p: [165, 30], w: 45, h: 45, cor: "tinta" },
              { t: "retangulo", p: [30, 75], w: 45, h: 45, cor: "suave" },
              { t: "retangulo", p: [75, 75], w: 45, h: 45, cor: "destaque" },
              { t: "retangulo", p: [120, 75], w: 45, h: 45, hachura: true },
              { t: "retangulo", p: [165, 75], w: 45, h: 45, hachura: true },
              { t: "retangulo", p: [30, 120], w: 45, h: 45, cor: "destaque" },
              { t: "retangulo", p: [75, 120], w: 45, h: 45, hachura: true },
              { t: "retangulo", p: [120, 120], w: 45, h: 45, hachura: true },
              { t: "retangulo", p: [165, 120], w: 45, h: 45, cor: "destaque" },
              { t: "rotulo", p: [225, 70], texto: "hachura = pior acesso" },
            ],
          },
        },
        { tipo: "texto", texto: "Regra de honestidade cartográfica: declare o método de classes (quantis, intervalos iguais), a data do dado e o indicador exato. Um mapa bonito com classe escolhida a dedo mente. O objetivo é que qualquer pessoa reproduza o mapa a partir dos seus dados e chegue à mesma figura." },
      ],
    },
    {
      id: "indicadores-painel",
      titulo: "Escolher os indicadores do painel",
      blocos: [
        { tipo: "texto", texto: "Um painel não precisa de vinte números; precisa de três ou quatro que digam a verdade. Escolha um de proximidade (percentual coberto por transporte frequente), um de acessibilidade (empregos em 60 min), um de tempo (minutos ao serviço de saúde mais próximo) e um de equidade (a diferença entre o bairro mais rico e o mais pobre). Juntos, eles respondem \"quão bem servido\", \"para alcançar o quê\" e \"para quem\"." },
        { tipo: "diagrama", titulo: "A árvore de decisão do indicador", codigo: `flowchart TD
  Q["O que quero mostrar?"] --> A["Tem parada perto?"]
  Q --> B["Alcanca empregos/servicos?"]
  Q --> C["Quanto tempo gasta?"]
  Q --> D["E justo entre bairros?"]
  A --> A1["% populacao coberta"]
  B --> B1["oportunidades em 30/60/90 min"]
  C --> C1["minutos ao destino mais proximo"]
  D --> D1["razao entre bairro rico e pobre"]` },
        {
          tipo: "licao",
          pergunta: "Por que incluir um indicador de equidade no painel?",
          alternativas: [
            "Para deixar o painel maior",
            "Para mostrar a diferença de acesso entre bairros de rendas distintas, não só a média",
            "Porque a lei proíbe médias",
          ],
          correta: 1,
          explicacao: "A média esconde a desigualdade; um indicador de equidade (ex.: razão de acesso entre o bairro mais rico e o mais pobre) revela a quem o sistema serve mal, que é o cerne da PNMU.",
        },
      ],
    },
    {
      id: "coleta-participativa",
      titulo: "Coleta participativa: muita gente, muitos pontos",
      blocos: [
        { tipo: "texto", texto: "O modelo calcula; o campo confere. Uma rede de moradores cobre mais paradas, mais horários e mais percursos do que qualquer equipe pequena. Com um formulário simples (app de coleta ou planilha no celular), cada pessoa registra a parada, a hora que o ônibus passou, quanto esperou e o estado da calçada. Padronize o formulário para que os dados somem; esse é o segredo da ciência cidadã útil." },
        { tipo: "tarefas", itens: [
          { id: "formulario-padrao", titulo: "Monte o formulário de coleta participativa", entrega: "Crie um formulário (Google Forms, KoboToolbox ou planilha) com campos fixos: parada (GPS), linha, horário previsto, horário real, espera, calçada (ok/ruim), foto. Teste com 3 pessoas antes de soltar." },
          { id: "mutirao-coleta", titulo: "Organize um mutirão de uma semana", entrega: "Recrute moradores para registrar, por uma semana, as passagens reais nas principais paradas do bairro em horários de pico e fora-pico. Consolide numa planilha única com data e autor de cada registro." },
        ] },
      ],
    },
    {
      id: "equidade-recorte",
      titulo: "Cruzar acesso com quem mora ali",
      blocos: [
        { tipo: "texto", texto: "O número de acesso só ganha força política quando cruza com o perfil de quem o vive. Some ao tempo de acesso os dados de renda, raça, sexo e idade por setor censitário (IBGE) ou pela base do AOP. A pergunta vira concreta: os bairros com pior acesso são também os de menor renda e maior população negra? Em geral, sim, e provar isso com dado transforma um mapa técnico num argumento de justiça." },
        {
          tipo: "prancha",
          titulo: "Cruzamento acesso x renda x população",
          desenho: {
            legenda: "Cada bolha é um bairro: eixo horizontal é renda, vertical é tempo de acesso, tamanho é população. O canto pior-servido e mais pobre é o alvo.",
            primitivas: [
              { t: "linha", de: [40, 165], ate: [285, 165], cor: "tinta" },
              { t: "linha", de: [40, 165], ate: [40, 25], cor: "tinta" },
              { t: "rotulo", p: [44, 20], texto: "tempo de acesso" },
              { t: "rotulo", p: [215, 177], texto: "renda" },
              { t: "circulo", c: [75, 55], r: 16, hachura: true },
              { t: "rotulo", p: [58, 80], texto: "pobre+lento" },
              { t: "circulo", c: [160, 110], r: 10, cor: "destaque" },
              { t: "circulo", c: [245, 140], r: 7, cor: "suave" },
              { t: "rotulo", p: [220, 128], texto: "rico+rapido" },
            ],
          },
        },
        { tipo: "fontes", titulo: "Equidade e dados abertos locais", itens: [
          { titulo: "ITDP — Institute for Transportation and Development Policy", url: "https://itdp.org/", tipo: "site", nota: "Indicadores de pessoas próximas ao transporte e padrões de desenvolvimento orientado ao transporte (DOTS)." },
          { titulo: "data.rio — dados abertos da Prefeitura do Rio de Janeiro", url: "https://www.data.rio/", tipo: "dataset", nota: "Exemplo de portal municipal com dados de transporte e divisões por bairro para cruzamento espacial." },
        ] },
      ],
    },
    {
      id: "mobilizacao-urbanista",
      titulo: "Da medição à proposta: chamar o urbanismo",
      blocos: [
        { tipo: "texto", texto: "Diagnóstico não é projeto. Propor uma linha nova, um itinerário redesenhado, uma faixa exclusiva ou a realocação de uma parada envolve viabilidade operacional, custo, segurança viária e norma técnica. Para que a proposta saia do desejo e vire algo que a prefeitura possa executar, mobilize o profissional habilitado." },
        { tipo: "mobilizacao", papel: "Engenheiro de transportes ou urbanista (com registro profissional)", porque: "Desenhar ou alterar linhas, faixas e paradas exige análise de viabilidade, capacidade, segurança viária e conformidade com normas, com responsabilidade técnica que embasa a decisão pública.", entregaEsperada: "Proposta técnica de intervenção (nova linha, itinerário, faixa ou parada) com estimativa de ganho de acesso, custo e aderência à PNMU e ao plano de mobilidade, assinada por responsável técnico.", gerenciadoPor: "zaeon" },
      ],
    },

    // ===================== CAPÍTULO 6 — EXECUÇÃO =====================
    {
      id: "plano-coleta",
      titulo: "O plano de coleta de campo",
      blocos: [
        { tipo: "texto", texto: "Coleta sem plano vira dado inútil. Antes de ir a campo, defina: quais paradas (amostra representativa, não só as fáceis), quais horários (pico da manhã, entre-picos, pico da tarde e noite), quantos dias (dias úteis e fim de semana diferem) e o que medir em cada um (passagem real, espera, lotação, calçada). Um plano claro garante que os números de pontos diferentes possam ser comparados." },
        {
          tipo: "prancha",
          titulo: "Grade de amostragem de horários",
          desenho: {
            legenda: "Distribua a coleta por faixas de horário e dias, para não enxergar só o pico; a grade evita viés.",
            primitivas: [
              { t: "retangulo", p: [40, 40], w: 220, h: 110, cor: "tinta" },
              { t: "linha", de: [40, 77], ate: [260, 77], cor: "suave" },
              { t: "linha", de: [40, 114], ate: [260, 114], cor: "suave" },
              { t: "linha", de: [113, 40], ate: [113, 150], cor: "suave" },
              { t: "linha", de: [186, 40], ate: [186, 150], cor: "suave" },
              { t: "rotulo", p: [48, 60], texto: "pico manha" },
              { t: "rotulo", p: [48, 97], texto: "entre-pico" },
              { t: "rotulo", p: [48, 134], texto: "pico tarde" },
              { t: "rotulo", p: [120, 32], texto: "seg-sex / sab / dom" },
            ],
          },
        },
        { tipo: "tarefas", itens: [
          { id: "plano-amostral", titulo: "Escreva o plano de amostragem", entrega: "Defina em uma página: paradas escolhidas e por quê, faixas de horário, dias de coleta, variáveis medidas e quem coleta o quê. Esse plano é o combinado de todo o mutirão." },
        ] },
      ],
    },
    {
      id: "survey-usuarios",
      titulo: "Ouvir o usuário: survey e pesquisa OD",
      blocos: [
        { tipo: "texto", texto: "O dado quantitativo diz o quanto; o usuário diz o porquê. Uma pesquisa curta com quem está no ponto (de onde veio, para onde vai, quanto tempo levou, o que mais pesa) revela coisas que o modelo não capta: o medo à noite, o desvio por falta de calçada, a linha que \"existe\" mas some no fim de semana. Pesquisas de origem-destino (OD), como as de órgãos metropolitanos, fazem isso em larga escala e dão o retrato dos fluxos." },
        { tipo: "diagrama", titulo: "O que uma pesquisa OD captura", codigo: `flowchart LR
  O["Origem (bairro)"] --> M["Modo usado"]
  M --> T["Tempo porta a porta percebido"]
  T --> D["Destino (trabalho/estudo/saude)"]
  D --> MO["Motivo da viagem"]
  MO --> F["Frequencia semanal"]` },
        {
          tipo: "licao",
          pergunta: "Por que combinar medição de tempo com survey de usuários?",
          alternativas: [
            "Para ter mais papel",
            "Porque o número mostra o quanto e o usuário explica o porquê e o que pesa",
            "Porque survey substitui a medição",
          ],
          correta: 1,
          explicacao: "A medição dá a magnitude objetiva do tempo; o survey revela percepção, barreiras e motivos que o modelo não enxerga. Juntos, dão diagnóstico completo.",
        },
      ],
    },
    {
      id: "painel-publico",
      titulo: "Publicar o painel",
      blocos: [
        { tipo: "texto", texto: "Diagnóstico guardado na gaveta não muda nada. Transforme os mapas e indicadores num painel público: uma página web simples, um PDF bem diagramado ou um mapa interativo. Mostre o número, a fonte, a data e o método. Um painel que qualquer vereador, jornalista ou morador abre e entende em dois minutos é o que vira pauta. Clareza vence sofisticação." },
        { tipo: "tarefas", itens: [
          { id: "montar-painel", titulo: "Monte o painel de uma página", entrega: "Reúna num só lugar (página, PDF ou mapa online) os 3-4 indicadores por bairro, com legenda, fonte e data. Peça para alguém de fora ler em 2 minutos e dizer qual bairro é o pior servido; se acertou, o painel comunica." },
          { id: "nota-metodologica", titulo: "Escreva a nota metodológica", entrega: "Em meia página, descreva de onde vieram os dados (GTFS, OSM, IBGE), que ferramenta roteou, a data e os limites do estudo. É o que dá credibilidade e permite reprodução." },
        ] },
      ],
    },
    {
      id: "levar-ao-poder-publico",
      titulo: "Levar ao poder público",
      blocos: [
        { tipo: "texto", texto: "O destino do diagnóstico é a decisão. Os canais existem: o conselho municipal de mobilidade ou de cidade, as audiências do plano de mobilidade (obrigatório por lei), as consultas públicas, a câmara de vereadores e o Ministério Público quando há direito violado. Leve número, não indignação; proposta, não só queixa. Um dado reproduzível, com fonte e método, muda o tom de qualquer reunião." },
        { tipo: "texto", texto: "Quando a interlocução passa a envolver audiência formal, parecer técnico ou base para ação, o acompanhamento precisa de quem conhece o processo e responde por ele. A Zaeon abre a vaga e acompanha." },
        { tipo: "mobilizacao", papel: "Articulador institucional / assessoria técnica em políticas de mobilidade", porque: "Levar um diagnóstico a conselho de mobilidade, audiência do plano ou ao Ministério Público exige conhecer o rito, formatar a demanda e sustentá-la tecnicamente perante o poder público.", entregaEsperada: "Dossiê apresentável (diagnóstico + proposta + base legal da PNMU) e um plano de interlocução com o conselho/órgão competente, com registro das reuniões.", gerenciadoPor: "zaeon" },
      ],
    },

    // ===================== CAPÍTULO 7 — MANUTENÇÃO =====================
    {
      id: "atualizar-dados",
      titulo: "O dado envelhece: atualizar a medição",
      blocos: [
        { tipo: "texto", texto: "A rede muda. Linhas são criadas e extintas, itinerários mudam, frequências caem ou sobem. Um GTFS de dois anos atrás descreve uma cidade que já não existe. Por isso a medição de acesso não é foto única: é série. Refaça o cálculo periodicamente (a cada nova versão do GTFS ou ao menos uma vez por ano) e guarde a data de cada rodada. Só assim dá para dizer se o bairro melhorou ou piorou." },
        { tipo: "diagrama", titulo: "Ciclo de atualização", codigo: `flowchart LR
  G["Novo GTFS publicado"] --> R["Rodar roteamento de novo"]
  R --> I["Recalcular indicadores por bairro"]
  I --> C["Comparar com a rodada anterior"]
  C --> P["Publicar tendencia"]
  P --> G` },
        {
          tipo: "licao",
          pergunta: "Por que a medição de acesso deve ser refeita periodicamente?",
          alternativas: [
            "Porque o mapa muda de cor sozinho",
            "Porque a rede (linhas, itinerários, frequências) muda e o GTFS antigo descreve uma cidade que já mudou",
            "Porque a lei exige recalcular todo dia",
          ],
          correta: 1,
          explicacao: "Linhas, itinerários e frequências mudam; um GTFS desatualizado leva a conclusões erradas. Refazer a cada versão permite acompanhar a tendência real do acesso.",
        },
      ],
    },
    {
      id: "qa-qc-dados",
      titulo: "Controle de qualidade do dado",
      blocos: [
        { tipo: "texto", texto: "Lixo entra, lixo sai. Antes de confiar no resultado, valide o GTFS (ferramentas de validação apontam paradas sem coordenada, viagens sem horário, calendários vencidos) e confira a coleta de campo contra erros grosseiros (horário impossível, GPS fora da cidade, duplicatas). Uma parada com coordenada errada joga a isócrona longe; um headway mal lido inverte a conclusão. QA/QC não é burocracia: é o que separa diagnóstico de ficção." },
        {
          tipo: "prancha",
          titulo: "Checklist de validação",
          desenho: {
            legenda: "Antes de publicar, passe cada item: GTFS válido, coordenadas plausíveis, datas vigentes, coleta sem duplicata.",
            primitivas: [
              { t: "retangulo", p: [40, 35], w: 220, h: 130, cor: "tinta" },
              { t: "retangulo", p: [52, 50], w: 12, h: 12, cor: "destaque" },
              { t: "rotulo", p: [72, 60], texto: "GTFS passou no validador" },
              { t: "retangulo", p: [52, 78], w: 12, h: 12, cor: "destaque" },
              { t: "rotulo", p: [72, 88], texto: "coordenadas na cidade" },
              { t: "retangulo", p: [52, 106], w: 12, h: 12, cor: "destaque" },
              { t: "rotulo", p: [72, 116], texto: "calendario vigente" },
              { t: "retangulo", p: [52, 134], w: 12, h: 12, cor: "destaque" },
              { t: "rotulo", p: [72, 144], texto: "coleta sem duplicata" },
            ],
          },
        },
        { tipo: "tarefas", itens: [
          { id: "validar-gtfs", titulo: "Valide o GTFS antes de rodar", entrega: "Passe o GTFS por um validador (ex.: validador canônico do GTFS) e registre os erros/avisos. Corrija ou documente cada um antes de usar o arquivo no cálculo." },
        ] },
      ],
    },
    {
      id: "monitorar-tendencia",
      titulo: "Ler a tendência no tempo",
      blocos: [
        { tipo: "texto", texto: "Com duas ou mais rodadas, o indicador vira série temporal, e é aí que mora o poder político. \"O bairro melhorou 12% no acesso a empregos em 60 minutos desde a nova linha\" é uma frase que avalia uma política. \"Piorou 8% depois do corte de frequência\" é uma denúncia com prova. Monitorar transforma o diagnóstico de retrato em filme, e permite responsabilizar decisões concretas." },
        {
          tipo: "prancha",
          titulo: "Série temporal do acesso de um bairro",
          desenho: {
            legenda: "A linha mostra o indicador ano a ano; o degrau marca uma intervenção (linha nova, corte). A tendência conta a história.",
            primitivas: [
              { t: "linha", de: [40, 160], ate: [285, 160], cor: "tinta" },
              { t: "linha", de: [40, 160], ate: [40, 30], cor: "tinta" },
              { t: "rotulo", p: [44, 22], texto: "acesso" },
              { t: "rotulo", p: [250, 172], texto: "ano" },
              { t: "curva", pts: [[55, 140], [110, 132], [160, 95], [165, 92]], cor: "destaque" },
              { t: "rotulo", p: [120, 78], texto: "linha nova" },
              { t: "seta", de: [160, 110], ate: [162, 95], cor: "suave" },
              { t: "curva", pts: [[165, 92], [215, 88], [265, 120]], cor: "suave" },
              { t: "rotulo", p: [220, 128], texto: "corte" },
            ],
          },
        },
        { tipo: "texto", texto: "Guarde cada rodada com data, versão do GTFS e método idêntico, para que a comparação seja justa. Mudar o método no meio do caminho contamina a série. Consistência ao longo do tempo é o que dá autoridade ao número." },
      ],
    },

    // ===================== CAPÍTULO 8 — CASOS REAIS =====================
    {
      id: "caso-aop-sp",
      titulo: "Caso: São Paulo pelo Acesso a Oportunidades",
      blocos: [
        { tipo: "texto", texto: "O Projeto Acesso a Oportunidades do IPEA mapeou, para São Paulo e outras metrópoles, quantos empregos cada área alcança de transporte público em até 60 minutos. O retrato é duro e consistente: áreas centrais e de renda alta alcançam uma fração enorme dos empregos da cidade no mesmo tempo em que periferias de renda baixa alcançam pouquíssimos. A desigualdade de acesso espelha a desigualdade de renda, e está documentada com dado aberto e método reproduzível." },
        {
          tipo: "licao",
          pergunta: "O que o Projeto Acesso a Oportunidades evidenciou nas grandes cidades brasileiras?",
          alternativas: [
            "Que o acesso a empregos por transporte é igual em todos os bairros",
            "Que bairros centrais e ricos alcançam muito mais empregos no mesmo tempo que periferias pobres",
            "Que ninguém usa transporte público",
          ],
          correta: 1,
          explicacao: "Os dados do AOP mostram forte desigualdade: no mesmo tempo-limite, áreas centrais e de maior renda alcançam muito mais oportunidades de transporte público do que periferias de menor renda.",
        },
        { tipo: "fontes", titulo: "O caso em números abertos", itens: [
          { titulo: "IPEA — Projeto Acesso a Oportunidades", url: "https://www.ipea.gov.br/acessooportunidades/", tipo: "site", nota: "Mapas e dados de acesso a empregos, saúde e educação por cidade e modo." },
          { titulo: "aopdata (ipeaGIT)", url: "https://github.com/ipeaGIT/aopdata", tipo: "dataset", nota: "Baixe os dados da sua cidade e reproduza o caso com código aberto." },
        ] },
      ],
    },
    {
      id: "caso-rede-troncal",
      titulo: "Caso: corredores e o salto de acesso",
      blocos: [
        { tipo: "texto", texto: "Onde entram corredores de ônibus com faixa exclusiva, BRT ou metrô, o tempo de acesso dos bairros ao longo do eixo cai de forma mensurável, porque a velocidade comercial sobe e a frequência melhora. Mas o ganho só chega a quem está dentro do raio de caminhada da estação e consegue baldear sem perder tudo o que ganhou. Por isso corredor sem alimentação (linhas que levam o bairro até a estação) e sem integração tarifária concentra o benefício num corredor estreito e deixa o entorno de fora." },
        {
          tipo: "prancha",
          titulo: "Corredor troncal e sua área de influência",
          desenho: {
            legenda: "O eixo troncal (linha grossa) é rápido; o acesso real depende das estações e das linhas alimentadoras que trazem os bairros até elas.",
            primitivas: [
              { t: "linha", de: [30, 100], ate: [280, 100], cor: "tinta" },
              { t: "linha", de: [30, 103], ate: [280, 103], cor: "tinta" },
              { t: "circulo", c: [80, 101], r: 6, cor: "destaque" },
              { t: "circulo", c: [160, 101], r: 6, cor: "destaque" },
              { t: "circulo", c: [240, 101], r: 6, cor: "destaque" },
              { t: "rotulo", p: [60, 120], texto: "estacao" },
              { t: "curva", pts: [[160, 101], [140, 60], [110, 40]], cor: "suave" },
              { t: "curva", pts: [[160, 101], [185, 150], [215, 170]], cor: "suave" },
              { t: "rotulo", p: [95, 32], texto: "alimentadora" },
              { t: "rotulo", p: [200, 168], texto: "bairro" },
            ],
          },
        },
        { tipo: "texto", texto: "A lição para a medição: ao avaliar um corredor, não olhe só o eixo. Meça o acesso dos bairros do entorno às estações, as baldeações necessárias e se a tarifa é integrada. É comum um corredor brilhante no mapa deixar, a poucos quarteirões, bairros tão mal servidos quanto antes." },
      ],
    },
    {
      id: "caso-ciencia-cidada",
      titulo: "Caso: mapeamento comunitário",
      blocos: [
        { tipo: "texto", texto: "Coletivos de periferia pelo Brasil já usaram coleta participativa para provar, com planilha e GPS, que a linha anunciada no papel não passava no horário prometido, ou que a parada ficava longe demais para idosos. Com dado padronizado e mapa simples, levaram a reclamação à ouvidoria e ao conselho com força que a queixa isolada nunca teve. A ciência cidadã não substitui o laudo técnico, mas cria pressão e revela o que o dado oficial, sozinho, não mostra." },
        {
          tipo: "licao",
          pergunta: "Qual é a força e o limite da coleta participativa de dados de transporte?",
          alternativas: [
            "Substitui qualquer estudo técnico e vale como projeto de engenharia",
            "Gera dado em escala para revelar falhas e pressionar, mas não substitui o projeto técnico assinado",
            "Não serve para nada sem um doutorado",
          ],
          correta: 1,
          explicacao: "A ciência cidadã cobre muitos pontos e horários e cria pressão com método padronizado, mas intervenções na rede ainda exigem projeto técnico e responsável habilitado.",
        },
      ],
    },

    // ===================== CAPÍTULO 9 — RECURSOS + SÍNTESE =====================
    {
      id: "recursos-finais",
      titulo: "Recursos para continuar: dados, normas e ferramentas",
      blocos: [
        { tipo: "texto", texto: "Reúna aqui a caixa de ferramentas do tempo de acesso: a lei que ampara, os dados abertos onde comparar seu bairro, o formato da rede, os motores que calculam e o SIG que desenha. Tudo o que este caderno afirmou se verifica nestes endereços." },
        { tipo: "fontes", titulo: "Leis, dados, formatos e ferramentas", itens: [
          { titulo: "Lei 12.587/2012 — Política Nacional de Mobilidade Urbana", url: "https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2012/lei/l12587.htm", tipo: "norma", nota: "A lei que torna acesso e equidade princípios e obriga o plano de mobilidade." },
          { titulo: "Lei 10.257/2001 — Estatuto da Cidade", url: "https://www.planalto.gov.br/ccivil_03/leis/leis_2001/l10257.htm", tipo: "norma", nota: "Plano diretor e plano de transporte urbano integrado." },
          { titulo: "Ministério das Cidades — Mobilidade Urbana (SEMOB)", url: "https://www.gov.br/cidades/pt-br/assuntos/mobilidade-urbana", tipo: "site", nota: "Política, apoio a planos, Pemob e Sistema de Informações em Mobilidade Urbana (SIMU)." },
          { titulo: "IPEA — Projeto Acesso a Oportunidades", url: "https://www.ipea.gov.br/acessooportunidades/", tipo: "site", nota: "Acessibilidade por transporte nas maiores cidades; dados e código abertos." },
          { titulo: "aopdata — dados do AOP em R", url: "https://github.com/ipeaGIT/aopdata", tipo: "dataset", nota: "Acesso, população e uso do solo por hexágono H3." },
          { titulo: "r5r — roteamento multimodal em R", url: "https://github.com/ipeaGIT/r5r", tipo: "site", nota: "Matrizes de tempo e acessibilidade a partir de GTFS e OSM." },
          { titulo: "GTFS — especificação (gtfs.org)", url: "https://gtfs.org", tipo: "norma", nota: "Formato aberto que descreve a rede de transporte público." },
          { titulo: "GTFS Reference — Google Transit", url: "https://developers.google.com/transit/gtfs/reference", tipo: "site", nota: "Referência campo a campo dos arquivos GTFS." },
          { titulo: "OpenTripPlanner", url: "https://www.opentripplanner.org/", tipo: "site", nota: "Roteador multimodal aberto; itinerários e isócronas." },
          { titulo: "OpenStreetMap", url: "https://www.openstreetmap.org/", tipo: "dataset", nota: "Base aberta de ruas e calçadas para a rede de caminhada." },
          { titulo: "QGIS", url: "https://qgis.org/", tipo: "site", nota: "SIG livre para mapas, buffers e painéis por bairro." },
          { titulo: "IBGE — Malhas de setores censitários", url: "https://www.ibge.gov.br/geociencias/organizacao-do-territorio/malhas-territoriais/26565-malhas-de-setores-censitarios-divisoes-intramunicipais.html", tipo: "dataset", nota: "Unidades espaciais e população para análise intraurbana." },
          { titulo: "IBGE — PNAD Contínua", url: "https://www.ibge.gov.br/estatisticas/sociais/trabalho/17270-pnad-continua.html", tipo: "dataset", nota: "Indicadores de trabalho e deslocamento." },
          { titulo: "ITDP", url: "https://itdp.org/", tipo: "site", nota: "Indicadores de pessoas próximas ao transporte e padrões de DOTS." },
          { titulo: "urbe — Revista Brasileira de Gestão Urbana (SciELO)", url: "https://www.scielo.br/j/urbe/", tipo: "artigo", nota: "Literatura revisada por pares sobre acessibilidade urbana." },
        ] },
      ],
    },
    {
      id: "compilado",
      titulo: "Prancha de síntese",
      blocos: [
        { tipo: "texto", texto: "Você percorreu o caminho inteiro: entendeu por que o acesso ao transporte é desigual e regressivo, distinguiu acessibilidade de mobilidade e viu a lei que ampara (PNMU e Estatuto da Cidade); aprendeu a ler o bairro, a parada, a frequência e a rede; dominou o método (proximidade, tempo porta a porta e acessibilidade a oportunidades) com GTFS, OpenStreetMap e motores de roteamento; calculou isócronas, cobertura e acesso a empregos à maneira do IPEA; projetou um diagnóstico em mapa de calor e um painel de poucos indicadores, incluindo equidade; executou coleta de campo, survey e levou o resultado ao poder público; e manteve a medição viva como série temporal, com QA/QC e tendência. A regra que fica: meça pela rede e pelo tempo, não pela linha reta; compare bairros e rendas; registre fonte, data e método; e leve número, não indignação, a quem decide. Acesso à cidade é direito na lei; prova é o que transforma mapa em política. Quando a etapa exigir geoprocessamento validado, estatística, engenharia/urbanismo ou articulação institucional, mobilize o profissional certo, foi assinalado em cada ponto do caderno." },
        { tipo: "compilado" },
      ],
    },
  ],
};
