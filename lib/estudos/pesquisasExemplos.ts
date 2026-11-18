/**
 * lib/estudos/pesquisasExemplos.ts — SEMENTE de pesquisas abertas a apoio (financiamento em SOL) pra popular a vitrine
 * no admin e dar o que testar na tela formal. São EXEMPLOS: autores e coletivos fictícios, no mesmo espírito do
 * catálogo embutido (lib/estudos/vitrine). Honestos de propósito — dados abertos, ferramentas, protocolos, hipóteses —,
 * sem promessa de cura nem de resultado, sem conselho médico e sem apontar pra captação externa. A arrecadação é número
 * SEMENTE: igual ao resto da vitrine, a liquidação on-chain ainda é "em breve" (MOEDA.ativa=false).
 *
 * O admin usa `POST /api/admin/vitrine/pesquisas` pra inserir cada um (entra publicado, origem console/admin).
 */

/** uma pesquisa de exemplo no formato do corpo do POST do admin */
export type PesquisaExemplo = {
  titulo: string; resumo: string; nicho: string; autor: string; tags: string[]; raridade: string;
  apoioAtivo: true; metaSol: number; arrecadadoSol: number; apoiadores: number; validadores: number;
  partes: { tipo: "artigo" | "dados" | "protocolo" | "revisao" | "codigo" | "anexo"; titulo: string; conteudo?: string; url?: string }[];
};

const NOTA_BIO = "Material de pesquisa, aberto à comunidade. Não é diagnóstico, tratamento nem recomendação clínica.";

export const PESQUISAS_EXEMPLO: readonly PesquisaExemplo[] = [
  {
    titulo: "Atlas aberto de RNA de tumores raros",
    resumo: "Juntar e abrir, de forma colaborativa, o sequenciamento de RNA de tumores raros — já de-identificado — para a comunidade de pesquisa.",
    autor: "Núcleo Oncogenômica Aberta",
    nicho: "Oncogenômica",
    tags: ["RNA-seq", "dados abertos", "tumores raros", "oncologia"],
    raridade: "lendaria",
    apoioAtivo: true, metaSol: 120, arrecadadoSol: 74.5, apoiadores: 212, validadores: 31,
    partes: [
      { tipo: "artigo", titulo: "Visão geral", conteudo:
`Tumores raros ficam de fora dos grandes bancos de dados porque cada tipo tem poucas amostras. A ideia aqui é juntar, de forma colaborativa, o sequenciamento de RNA (RNA-seq) de tumores raros e abrir esses dados, já de-identificados, para quem pesquisa.

O que o apoio sustenta: o custo de sequenciamento de novas amostras doadas por biobancos parceiros, a curadoria e a de-identificação, e a manutenção do repositório aberto.

O que NÃO é: isto não é um tratamento, não é um teste diagnóstico e não dá recomendação para nenhum caso individual. É infraestrutura de dados para a comunidade de pesquisa.

${NOTA_BIO}` },
      { tipo: "protocolo", titulo: "Protocolo de de-identificação", conteudo:
`Antes de qualquer dado entrar no repositório: remoção de identificadores diretos, agregação de datas em faixas, e revisão por um segundo curador. Amostras só entram com consentimento documentado do biobanco de origem. O pipeline de de-identificação é aberto e auditável.` },
      { tipo: "dados", titulo: "Amostra do conjunto (10 casos)", url: "https://zenodo.org" },
    ],
  },
  {
    titulo: "Microbioma do solo do semiárido — dados abertos",
    resumo: "Sequenciar e abrir o microbioma do solo do semiárido: dados brutos e metadados de seis municípios.",
    autor: "Coletivo Raiz Viva",
    nicho: "Ecologia do solo",
    tags: ["microbioma", "semiárido", "dados abertos", "agroecologia"],
    raridade: "epica",
    apoioAtivo: true, metaSol: 40, arrecadadoSol: 28.2, apoiadores: 96, validadores: 18,
    partes: [
      { tipo: "artigo", titulo: "Por que o solo do semiárido", conteudo:
`O solo do semiárido guarda uma comunidade microbiana que responde à seca de um jeito pouco descrito na literatura. Este projeto coleta amostras em seis municípios, sequencia a região 16S e abre os dados brutos e a planilha de metadados.

O apoio cobre reagentes de sequenciamento, o transporte das coletas e o tempo de curadoria dos dados. Tudo publicado com licença aberta.` },
      { tipo: "protocolo", titulo: "Protocolo de coleta", conteudo:
`Amostragem em transectos de 50 m, três réplicas por ponto, armazenamento a frio em até 6 h. Cada ponto registra umidade, profundidade e cobertura vegetal.` },
      { tipo: "dados", titulo: "Metadados das coletas (CSV)", conteudo: "municipio,ponto,umidade,profundidade_cm,cobertura\nJuazeiro,A1,0.12,10,caatinga\nJuazeiro,A2,0.09,10,solo exposto\n…" },
    ],
  },
  {
    titulo: "Sensor aberto de qualidade do ar de baixo custo",
    resumo: "Um medidor de PM2.5 de baixo custo e aberto, para bairros montarem a própria rede de monitoramento do ar.",
    autor: "Oficina Ar Livre",
    nicho: "Instrumentação ambiental",
    tags: ["open hardware", "qualidade do ar", "PM2.5", "cidades"],
    raridade: "rara",
    apoioAtivo: true, metaSol: 18, arrecadadoSol: 18, apoiadores: 140, validadores: 22,
    partes: [
      { tipo: "artigo", titulo: "O projeto", conteudo:
`Um medidor de material particulado (PM2.5) que custa uma fração dos equipamentos de referência, para bairros montarem a própria rede de monitoramento. Esquema elétrico, lista de peças e firmware são abertos.

A meta foi batida: o apoio agora vira kits enviados a escolas públicas que quiserem montar o sensor em aula.` },
      { tipo: "codigo", titulo: "Firmware", url: "https://github.com" },
      { tipo: "anexo", titulo: "Lista de peças e esquema", conteudo: "Sensor óptico de partículas, microcontrolador, fonte, caixa impressa em 3D. BOM completa com preços no anexo." },
    ],
  },
  {
    titulo: "Escuta de abelhas nativas — bioacústica aberta",
    resumo: "Gravar colmeias de abelhas sem ferrão e treinar um classificador aberto que ajuda a perceber estresse e enxameação cedo.",
    autor: "Rede Meliponário",
    nicho: "Bioacústica",
    tags: ["abelhas nativas", "bioacústica", "biodiversidade", "aprendizado de máquina"],
    raridade: "epica",
    apoioAtivo: true, metaSol: 22, arrecadadoSol: 9.8, apoiadores: 54, validadores: 11,
    partes: [
      { tipo: "artigo", titulo: "Ouvir a colmeia", conteudo:
`O zumbido de uma colônia carrega informação sobre o estado dela. Este projeto grava colmeias de abelhas sem ferrão, anota os trechos e treina um classificador aberto que ajuda meliponicultores a perceber enxameação e estresse cedo.

O apoio paga os gravadores de campo e o tempo de anotação do conjunto de áudio.` },
      { tipo: "dados", titulo: "Trechos anotados (amostra)", url: "https://zenodo.org" },
      { tipo: "codigo", titulo: "Classificador", url: "https://github.com" },
    ],
  },
  {
    titulo: "Previsão aberta de enchentes em bacias pequenas",
    resumo: "Sensores baratos de nível e um modelo aberto de previsão de curto prazo, para dar horas de aviso em bacias urbanas pequenas.",
    autor: "Hidrologia Comunitária",
    nicho: "Hidrologia",
    tags: ["enchentes", "modelo aberto", "clima", "alerta"],
    raridade: "epica",
    apoioAtivo: true, metaSol: 30, arrecadadoSol: 12.4, apoiadores: 61, validadores: 14,
    partes: [
      { tipo: "artigo", titulo: "O problema das bacias pequenas", conteudo:
`Bacias urbanas pequenas enchem rápido e quase não têm previsão. Este projeto instala réguas e sensores baratos de nível, publica os dados em tempo quase real e treina um modelo aberto de previsão de curto prazo para dar algumas horas de aviso.

O apoio cobre os sensores de nível, a hospedagem dos dados e a calibração do modelo.` },
      { tipo: "protocolo", titulo: "Instalação dos sensores", conteudo: "Posição, referência de nível, telemetria e manutenção. Cada sensor é cadastrado com foto e coordenada." },
      { tipo: "dados", titulo: "Série de nível (amostra)", conteudo: "data,hora,nivel_cm\n2027-01-10,14:00,32\n2027-01-10,14:15,41\n…" },
    ],
  },
  {
    titulo: "Corpus aberto de uma língua em risco",
    resumo: "Documentação comunitária de uma língua com poucos falantes: gravações, transcrição e um corpus aberto, com autoria da comunidade.",
    autor: "Mutirão Linguístico",
    nicho: "Linguística",
    tags: ["documentação linguística", "corpus aberto", "cultura"],
    raridade: "rara",
    apoioAtivo: true, metaSol: 15, arrecadadoSol: 6.1, apoiadores: 38, validadores: 9,
    partes: [
      { tipo: "artigo", titulo: "Documentar enquanto há tempo", conteudo:
`Um projeto comunitário de documentação de uma língua com poucos falantes: gravação de histórias e conversas, transcrição feita com a própria comunidade e um corpus aberto com as autorizações necessárias.

O apoio paga as viagens de gravação, os equipamentos e o tempo de transcrição. As decisões sobre o que fica público são da comunidade.` },
      { tipo: "protocolo", titulo: "Consentimento e autoria", conteudo: "Cada gravação tem autorização assinada; a comunidade decide o que é aberto e o que fica restrito. Os falantes são creditados como autores." },
    ],
  },
  {
    titulo: "Prótese de mão impressa em 3D — open hardware",
    resumo: "Uma prótese de mão mecânica impressa em 3D, de baixo custo e open hardware, que qualquer makerspace monta.",
    autor: "Mãos Livres",
    nicho: "Tecnologia assistiva",
    tags: ["open hardware", "impressão 3D", "prótese", "acessibilidade"],
    raridade: "epica",
    apoioAtivo: true, metaSol: 12, arrecadadoSol: 11.3, apoiadores: 158, validadores: 20,
    partes: [
      { tipo: "artigo", titulo: "Uma mão que qualquer makerspace monta", conteudo:
`Um projeto aberto de prótese de mão mecânica (sem motor) impressa em 3D, de baixo custo, pensada para quem tem pulso funcional. Arquivos, guia de montagem e de ajuste são abertos.

O apoio banca os protótipos de teste e a documentação. O desenho é mecânico e ajustável; adaptação e acompanhamento devem ser feitos com profissional de reabilitação.` },
      { tipo: "anexo", titulo: "Arquivos e guia de montagem", url: "https://github.com" },
    ],
  },
  {
    titulo: "Imagens de retina de-identificadas — dataset aberto",
    resumo: "Um conjunto aberto e de-identificado de imagens de fundo de olho, para pesquisa e ensino. Não é diagnóstico.",
    autor: "Olhar Aberto",
    nicho: "Imagem médica",
    tags: ["imagem médica", "dados abertos", "retina", "oftalmologia"],
    raridade: "lendaria",
    apoioAtivo: true, metaSol: 35, arrecadadoSol: 15.9, apoiadores: 72, validadores: 16,
    partes: [
      { tipo: "artigo", titulo: "Dados para quem pesquisa a retina", conteudo:
`Um conjunto aberto de imagens de fundo de olho, de-identificadas e com consentimento, para a comunidade que estuda a retina e desenvolve métodos de análise.

O apoio cobre a captação com retinógrafos parceiros, a de-identificação e a hospedagem. Serve para pesquisa e para ensino.

${NOTA_BIO}` },
      { tipo: "protocolo", titulo: "De-identificação e consentimento", conteudo: "Remoção de metadados, revisão por dois curadores e consentimento documentado. Nenhuma imagem entra sem autorização." },
      { tipo: "dados", titulo: "Amostra do conjunto", url: "https://zenodo.org" },
    ],
  },
  {
    titulo: "Restauração com semeadura aérea — método e dados",
    resumo: "Testar e documentar a semeadura aérea de sementes nativas em áreas degradadas, com dados abertos de germinação e sobrevivência.",
    autor: "Semente no Vento",
    nicho: "Restauração ecológica",
    tags: ["reflorestamento", "sementes nativas", "dados abertos", "clima"],
    raridade: "epica",
    apoioAtivo: true, metaSol: 28, arrecadadoSol: 20.6, apoiadores: 83, validadores: 13,
    partes: [
      { tipo: "artigo", titulo: "Semear áreas que caminhão não alcança", conteudo:
`Testar e documentar a semeadura aérea de sementes nativas em áreas degradadas de difícil acesso: que misturas germinam, com que taxa de sobrevivência, em que época.

O apoio compra sementes nativas de coletores locais e cobre o monitoramento das parcelas. Os dados de germinação e sobrevivência são abertos.` },
      { tipo: "dados", titulo: "Sobrevivência por parcela", conteudo: "parcela,especie,germinou,sobreviveu_6m\nP1,aroeira,sim,sim\nP1,ipê,sim,não\n…" },
      { tipo: "protocolo", titulo: "Preparo das bolotas de semente", conteudo: "Mistura de argila, substrato e sementes; secagem; densidade de lançamento por hectare." },
    ],
  },
  {
    titulo: "Monitor aberto de qualidade da água de rios",
    resumo: "Um kit simples e um painel aberto para a comunidade medir e acompanhar a qualidade da água de um rio ao longo do tempo.",
    autor: "Rio Vivo",
    nicho: "Ciência cidadã",
    tags: ["qualidade da água", "ciência cidadã", "open hardware", "rios"],
    raridade: "rara",
    apoioAtivo: true, metaSol: 20, arrecadadoSol: 4.7, apoiadores: 29, validadores: 8,
    partes: [
      { tipo: "artigo", titulo: "A rede que a comunidade mantém", conteudo:
`Um kit simples para medir turbidez, pH e temperatura de rios, e um painel aberto onde a comunidade registra as medições ao longo do tempo. Serve para flagrar poluição e acompanhar a recuperação de um trecho.

O apoio produz os kits e mantém o painel. Os dados são abertos e exportáveis.` },
      { tipo: "codigo", titulo: "Painel e app de registro", url: "https://github.com" },
      { tipo: "protocolo", titulo: "Como medir", conteudo: "Ponto fixo, mesmo horário, três leituras. Calibração mensal do sensor de pH." },
    ],
  },
] as const;
