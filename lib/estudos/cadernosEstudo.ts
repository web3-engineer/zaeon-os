import type { Desenho } from "@/lib/harness/caderno/compile";

type BlocoEstudo =
  | { tipo: "texto"; texto: string }
  | { tipo: "prancha"; titulo: string; desenho: Desenho }
  | { tipo: "diagrama"; titulo: string; codigo: string }
  | { tipo: "tarefas"; itens: readonly { id: string; titulo: string; entrega: string }[] }
  | { tipo: "compilado" }
  | { tipo: "video"; titulo: string; youtube: string }
  | { tipo: "licao"; pergunta: string; alternativas: readonly string[]; correta: number; explicacao: string };

export type CadernoEstudo = {
  id: string;
  titulo: string;
  resumo: string;
  paginas: readonly { id: string; titulo: string; blocos: readonly BlocoEstudo[] }[];
};

const ecovila: CadernoEstudo = {
  id: "ecovila",
  titulo: "Ecovila sustentável",
  resumo: "Um caderno de estudo sobre moradia, água e energia compartilhadas.",
  paginas: [
    {
      id: "mapa",
      titulo: "Leia o terreno antes de desenhar",
      blocos: [
        { tipo: "texto", texto: "Uma ecovila combina moradias e espaços de uso comum. Antes de localizar as casas, marque o sol, os caminhos de água, os acessos existentes e as áreas que devem permanecer preservadas." },
        {
          tipo: "prancha",
          titulo: "Croqui de implantação",
          desenho: {
            legenda: "Esquema conceitual. As setas acompanham o caminho da água até a área de infiltração.",
            primitivas: [
              { t: "retangulo", p: [14, 20], w: 289, h: 157, cor: "tinta" },
              { t: "retangulo", p: [31, 37], w: 57, h: 43, hachura: true },
              { t: "retangulo", p: [103, 37], w: 57, h: 43, hachura: true },
              { t: "retangulo", p: [206, 36], w: 76, h: 48 },
              { t: "rotulo", p: [52, 31], texto: "Moradias" },
              { t: "rotulo", p: [208, 29], texto: "Horta comum" },
              { t: "linha", de: [216, 50], ate: [272, 50] },
              { t: "linha", de: [216, 62], ate: [272, 62] },
              { t: "linha", de: [216, 74], ate: [272, 74] },
              { t: "rotulo", p: [72, 112], texto: "Pátio comunitário" },
              { t: "curva", pts: [[14, 136], [71, 126], [129, 139], [165, 148], [203, 147]] },
              { t: "seta", de: [164, 149], ate: [210, 148] },
              { t: "circulo", c: [234, 144], r: 21, hachura: true },
              { t: "rotulo", p: [201, 172], texto: "Infiltração" },
            ],
          },
        },
      ],
    },
    {
      id: "caso",
      titulo: "Observe uma ecovila real",
      blocos: [
        { tipo: "texto", texto: "Ao assistir, procure uma decisão de projeto que combine um recurso local, uma necessidade dos moradores e uma rotina de manutenção. Registre no caderno o que seria diferente na sua região." },
        { tipo: "video", titulo: "Conheça as criações sustentáveis da Ecovila do Ipec", youtube: "nVLFJofvn4E" },
      ],
    },
    {
      id: "agua",
      titulo: "Siga o caminho da água",
      blocos: [
        { tipo: "texto", texto: "Monte um balanço: a área dos telhados e a chuva indicam a oferta. O consumo e os meses secos orientam a comparação entre cenários. Comece com um uso não potável bem definido." },
        { tipo: "prancha", titulo: "Corte do sistema de captação", desenho: {
          legenda: "O desenho mostra a sequência da captação ao uso. As alturas e volumes dependem das medições.",
          primitivas: [
            { t: "curva", pts: [[20, 79], [65, 38], [112, 79]] },
            { t: "linha", de: [30, 78], ate: [30, 146] },
            { t: "linha", de: [99, 78], ate: [99, 146] },
            { t: "seta", de: [113, 80], ate: [137, 101], cor: "destaque" },
            { t: "retangulo", p: [139, 103], w: 38, h: 24, hachura: true },
            { t: "seta", de: [178, 115], ate: [201, 115], cor: "destaque" },
            { t: "retangulo", p: [203, 83], w: 58, h: 63, hachura: true },
            { t: "seta", de: [262, 128], ate: [291, 128], cor: "destaque" },
            { t: "rotulo", p: [42, 34], texto: "Telhado" },
            { t: "rotulo", p: [136, 99], texto: "Filtro" },
            { t: "rotulo", p: [201, 77], texto: "Cisterna" },
            { t: "rotulo", p: [273, 145], texto: "Uso" },
            { t: "linha", de: [18, 149], ate: [302, 149], cor: "suave" },
          ],
        } },
        { tipo: "diagrama", titulo: "Da medição à decisão", codigo: `flowchart TD
  A["Área de telhado + chuva mensal"] --> B["Estimar volume captável"]
  B --> C["Comparar com a demanda não potável"]
  C --> D{"O mês seco fecha?"}
  D -->|Sim| E["Registrar premissas"]
  D -->|Não| F["Rever demanda e armazenamento"]
  F --> C` },
        { tipo: "texto", texto: "Exemplo didático: 60 m² × 45 mm × 0,8 = 2.160 L estimados no mês. Aqui, 0,8 é uma hipótese de eficiência. Troque os valores pelos do seu cenário." },
        { tipo: "tarefas", itens: [
          { id: "balanco", titulo: "Monte a planilha de água", entrega: "Registre área de telhado, chuva mensal, hipótese de eficiência e demanda. Teste um mês seco e outro chuvoso." },
          { id: "corte", titulo: "Desenhe a captação em corte", entrega: "Marque telhado, filtro, cisterna e ponto de uso. Indique qual elemento precisa ser inspecionado e por quem." },
        ] },
      ],
    },
    {
      id: "energia",
      titulo: "Compare demanda e geração",
      blocos: [
        { tipo: "texto", texto: "Liste os equipamentos essenciais, a potência e as horas de uso. Separe consumo diário de potência de pico. Ir além da média ajuda a enxergar a diferença entre um dia típico e um dia de pouca geração." },
        { tipo: "diagrama", titulo: "Orçamento de energia", codigo: `flowchart TD
  A["Inventário de cargas"] --> B["Potência × horas de uso"]
  B --> C["Consumo diário e cargas prioritárias"]
  C --> D["Comparar dia típico e dia de baixa geração"]
  D --> E["Decidir o que medir antes de dimensionar"]` },
        { tipo: "tarefas", itens: [
          { id: "cargas", titulo: "Faça um inventário de cargas", entrega: "Monte uma tabela com pelo menos cinco equipamentos, potência em watts, horas de uso e consumo em Wh." },
          { id: "cenarios", titulo: "Compare dois cenários", entrega: "Indique quais cargas seriam mantidas num dia de baixa geração e justifique uma escolha." },
        ] },
      ],
    },
    {
      id: "governanca",
      titulo: "Projete a rotina da comunidade",
      blocos: [
        { tipo: "texto", texto: "Um sistema de uso comum precisa de responsáveis, calendário e registro de decisões. Esboce o que acontece quando a rotina funciona e quando é preciso pedir apoio." },
        { tipo: "diagrama", titulo: "Um ciclo de manutenção", codigo: `flowchart TD
  A["Inspeção combinada"] --> B["Registrar observação"]
  B --> C{"Há falha?"}
  C -->|Não| D["Agendar próxima inspeção"]
  C -->|Sim| E["Definir responsável e prazo"]
  E --> F["Conferir o reparo"]
  F --> D` },
        { tipo: "tarefas", itens: [
          { id: "rotina", titulo: "Escreva uma rotina de manutenção", entrega: "Escolha um sistema, nomeie a função responsável e liste frequência, forma de registro e critério de revisão." },
        ] },
      ],
    },
    {
      id: "licao",
      titulo: "Planeje o próximo passo",
      blocos: [
        { tipo: "texto", texto: "Compare as necessidades de água e energia da comunidade antes de escolher tecnologias. Ao montar um plano, inclua quem cuida de cada sistema, com que frequência e como o grupo registra custos e falhas." },
        {
          tipo: "licao",
          pergunta: "Qual informação faz mais diferença antes de dimensionar a captação de chuva?",
          alternativas: ["A cor do reservatório", "A chuva local, a área de captação e a demanda", "A distância até a próxima ecovila"],
          correta: 1,
          explicacao: "A chuva e a área de captação estimam a oferta. A demanda mostra quanto a comunidade precisa e ajuda a avaliar períodos secos.",
        },
        { tipo: "tarefas", itens: [
          { id: "croqui-final", titulo: "Revise o croqui do terreno", entrega: "Anote uma hipótese que você precisaria medir antes de decidir onde captar água e cole o croqui revisado nesta página." },
        ] },
      ],
    },
    {
      id: "compilado",
      titulo: "Prancha de síntese",
      blocos: [
        { tipo: "texto", texto: "Arraste os cards pelo carimbo para reorganizar o projeto. Abaixo da prancha, as suas anotações e imagens aparecem na ordem das páginas." },
        { tipo: "compilado" },
      ],
    },
  ],
};

const cadernos: readonly CadernoEstudo[] = [ecovila];

export function cadernoEstudo(id: string) {
  return cadernos.find((caderno) => caderno.id === id);
}
