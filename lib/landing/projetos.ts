/**
 * PROJETOS — os projetos REAIS que as pessoas constroem na Zaeon, pra seção "Aqui você vale o que você constrói." da
 * landing. Nada de ficção: são projetos de engenharia, eletrônica, elétrica, programação e mecatrônica com um pé na
 * realidade (o que de fato dá pra fazer e levar pra bancada). Cada um tem a área, um ícone e um resumo do entregável.
 */
export type AreaProjeto =
  | "Eletrônica"
  | "Elétrica"
  | "Programação"
  | "Mecatrônica"
  | "Embarcados"
  | "Mecânica";

export type Projeto = {
  id: string;
  titulo: string;
  /** o entregável, em uma linha — concreto, do jeito que vai pra bancada */
  resumo: string;
  area: AreaProjeto;
  icone: string;
};

export const PROJETOS: readonly Projeto[] = [
  { id: "fonte-bancada", titulo: "Fonte de bancada 30 V / 5 A", resumo: "PCB de 4 camadas, firmware do display e proteção contra curto e sobrecorrente.", area: "Eletrônica", icone: "⚡" },
  { id: "bms-18650", titulo: "BMS para pack 18650 (13S)", resumo: "Balanceamento das células, proteção e telemetria da bateria por CAN.", area: "Elétrica", icone: "🔋" },
  { id: "braco-robotico", titulo: "Braço robótico de 6 eixos", resumo: "Cinemática inversa, servos com torque real e peças impressas em 3D.", area: "Mecatrônica", icone: "🦾" },
  { id: "estacao-lora", titulo: "Estação meteorológica LoRa", resumo: "ESP32, sensores calibrados e um painel com os dados em tempo real.", area: "Embarcados", icone: "🌦️" },
  { id: "compilador", titulo: "Compilador de uma linguagem sua", resumo: "Lexer, parser e geração de bytecode rodando numa máquina virtual.", area: "Programação", icone: "💻" },
  { id: "inversor-solar", titulo: "Inversor solar grid-tie de 2 kW", resumo: "Topologia de potência, MPPT e sincronismo seguro com a rede.", area: "Elétrica", icone: "☀️" },
  { id: "quadricoptero-pid", titulo: "Quadricóptero com controle PID", resumo: "Flight controller próprio, leitura da IMU e malha de estabilização.", area: "Mecatrônica", icone: "🚁" },
  { id: "amp-classe-d", titulo: "Amplificador classe D de 100 W", resumo: "Modulação PWM, filtro de saída e layout pensado pra baixa EMI.", area: "Eletrônica", icone: "🔊" },
  { id: "cnc-grbl", titulo: "CNC caseira com GRBL", resumo: "Estrutura mecânica, drivers de passo e o G-code que corta de verdade.", area: "Mecânica", icone: "⚙️" },
  { id: "tinyml", titulo: "Rede neural num microcontrolador", resumo: "Modelo quantizado (TinyML) rodando em 256 KB de RAM, sem nuvem.", area: "Embarcados", icone: "🧠" },
  { id: "estoque-mei", titulo: "App de estoque pra um MEI", resumo: "API, banco de dados e um PWA que continua funcionando offline.", area: "Programação", icone: "📦" },
  { id: "casa-local-first", titulo: "Casa automatizada local-first", resumo: "Home Assistant, Zigbee e automações que rodam sem depender da internet.", area: "Eletrônica", icone: "🏠" },
];
