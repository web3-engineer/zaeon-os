/**
 * lib/forja/catalogoAvancado.ts — a trilha AVANÇADA da Forja (card #793): os 28 repos ✅ enxutos (< ~30 MB)
 * curados em docs/forja/HANDOFF-AVANCADO-*.md (robótica, sistemas, IA do zero, gráficos/jogos, redes/distribuído).
 *
 * Catálogo IRMÃO do de iniciantes (não misturar: o nome/tag "iniciante" enganaria o aluno). Cada repo foi
 * RECONFERIDO no registro (2026-11-13): existência, licença e tamanho pela busca do GitHub; titular pela linha
 * de copyright do próprio arquivo de licença; e fumado LOCAL com `graphify update . --force` (todos geraram
 * grafo com nós > 0 — ver docs/TESTES_FORJA_793.md). Os ⚠️ grandes e ⛔ gigantes ficam FORA deste card.
 *
 * Entregável destes cursos = estudar + rodar/simular/treinar (não "publique seu primeiro projeto"); por isso
 * `modo: "curso"` e o `conceito` sempre marcado "(avançado)". Só licença permissiva — nada de GPL/AGPL.
 */
import type { EsqueletoRepo, Licenca } from "./tipos";

/** Os temas da trilha (os 4 handoffs; o de gráficos/distribuído vira dois). */
export type TemaAvancado = "robotica" | "sistemas" | "ia" | "graficos-jogos" | "redes-distribuido";

const lic = (spdx: string, repo: string, titular: string, arquivo = "LICENSE"): Licenca => ({
  spdx, titular, url: `https://github.com/${repo}/blob/HEAD/${arquivo}`,
});

type Entrada = EsqueletoRepo & { tema: TemaAvancado };

const ENTRADAS: Entrada[] = [
  // ── 🤖 Robótica (HANDOFF-AVANCADO-robotica.md) ──
  {
    tema: "robotica", id: "robotica-algoritmos", conceito: "algoritmos de robótica (avançado)", modo: "curso",
    repo: "onlytailei/CppRobotics", titulo: "Algoritmos de robótica em C++",
    resumo: "EKF, MPC, LQR, DWA e path planning — os clássicos que todo robô usa, na unha.",
    licenca: lic("MIT", "onlytailei/CppRobotics", "Lei Tai", "LICENSE.md"),
  },
  {
    tema: "robotica", id: "slam-lidar", conceito: "SLAM LiDAR (avançado)", modo: "curso",
    repo: "koide3/glim", titulo: "SLAM LiDAR-inercial (GLIM)",
    resumo: "Como um robô se localiza e mapeia o mundo em 3D fundindo LiDAR e IMU.",
    licenca: lic("MIT", "koide3/glim", "koide3"),
  },
  {
    tema: "robotica", id: "odometria-lidar-inercial", conceito: "odometria LiDAR-inercial (avançado)", modo: "curso",
    repo: "vectr-ucla/direct_lidar_inertial_odometry", titulo: "Odometria LiDAR + IMU (DLIO)",
    resumo: "Fusão de LiDAR e IMU em tempo real: como o robô estima o próprio movimento sem GPS.",
    licenca: lic("MIT", "vectr-ucla/direct_lidar_inertial_odometry", "Kenny J. Chen, Ryan Nemiroff e Brett T. Lopez"),
  },

  // ── ⚙️ Sistemas & baixo nível (HANDOFF-AVANCADO-sistemas.md) ──
  {
    tema: "sistemas", id: "editor-de-texto-c", conceito: "editor de texto do zero (avançado)", modo: "curso",
    repo: "antirez/kilo", titulo: "Um editor de texto em ~1000 linhas de C (kilo)",
    resumo: "Terminal em modo raw, buffer de linhas e busca: um editor estilo vi sem dependências.",
    licenca: lic("BSD-2-Clause", "antirez/kilo", "Salvatore Sanfilippo"),
  },
  {
    tema: "sistemas", id: "compilador-c", conceito: "compilador (avançado)", modo: "curso",
    repo: "nlsandler/write_a_c_compiler", titulo: "Escreva um compilador C",
    resumo: "Do lexer ao codegen, em etapas testáveis — o que acontece entre o seu código e a máquina.",
    licenca: lic("MIT", "nlsandler/write_a_c_compiler", "Nora Sandler"),
  },
  {
    tema: "sistemas", id: "banco-do-zero", conceito: "banco de dados do zero (avançado)", modo: "curso",
    repo: "cstack/db_tutorial", titulo: "Construa um banco de dados (clone do SQLite)",
    resumo: "REPL, B-tree, paginação e persistência: como um banco guarda e acha dados de verdade.",
    licenca: lic("MIT", "cstack/db_tutorial", "Connor Stack"),
  },
  {
    tema: "sistemas", id: "ray-tracer-shaders", conceito: "ray/path tracing em shaders (avançado)", modo: "curso",
    repo: "ekzhang/graphics-workshop", titulo: "Ray marching e path tracing à mão",
    resumo: "Computação gráfica na raiz: luz, sombra e reflexo escritos direto em shaders GLSL.",
    licenca: lic("MIT", "ekzhang/graphics-workshop", "Eric Zhang"),
  },
  {
    tema: "sistemas", id: "container-do-zero", conceito: "runtime de containers (avançado)", modo: "curso",
    repo: "Fewbytes/rubber-docker", titulo: "Docker do zero (rubber-docker)",
    resumo: "Namespaces, cgroups e chroot: monte um runtime de containers e veja o que o Docker esconde.",
    licenca: lic("MIT", "Fewbytes/rubber-docker", "Fewbytes"),
  },
  {
    tema: "sistemas", id: "so-raspberry-pi", conceito: "sistema operacional / kernel (avançado)", modo: "curso",
    repo: "s-matyukevich/raspberry-pi-os", titulo: "Escreva um SO para o Raspberry Pi",
    resumo: "Boot, exceções, memória virtual e escalonamento em ARM64 — um kernel didático rodando no QEMU.",
    licenca: lic("MIT", "s-matyukevich/raspberry-pi-os", "Sergey Matyukevich"),
  },
  {
    tema: "sistemas", id: "lsm-tree-rust", conceito: "storage engine LSM (avançado)", modo: "curso",
    repo: "skyzh/mini-lsm", titulo: "Motor LSM-tree em Rust (mini-lsm)",
    resumo: "Memtable, SST e compaction, semana a semana: como bancos modernos escrevem rápido em disco.",
    licenca: lic("Apache-2.0", "skyzh/mini-lsm", "Alex Chi Z"),
  },
  {
    tema: "sistemas", id: "linguagem-gravity", conceito: "interpretador / VM (avançado)", modo: "curso",
    repo: "marcobambini/gravity", titulo: "Uma linguagem com compilador e VM (Gravity)",
    resumo: "Parser, bytecode, máquina virtual e garbage collector num código enxuto em C.",
    licenca: lic("MIT", "marcobambini/gravity", "Marco Bambini"),
  },
  {
    tema: "sistemas", id: "storage-fjall", conceito: "storage engine LSM em produção (avançado)", modo: "curso",
    repo: "fjall-rs/fjall", titulo: "Storage engine LSM de produção (fjall)",
    resumo: "A teoria da LSM-tree virando biblioteca de verdade em Rust idiomático — keyspaces, journal e compaction.",
    licenca: lic("Apache-2.0", "fjall-rs/fjall", "fjall-rs", "LICENSE-APACHE"),
  },
  {
    tema: "sistemas", id: "linguagem-wren", conceito: "linguagem de script / VM (avançado)", modo: "curso",
    repo: "wren-lang/wren", titulo: "Por dentro de uma linguagem de script (Wren)",
    resumo: "Classes, fibers e uma VM compacta e legível — como uma linguagem pequena roda o seu código.",
    licenca: lic("MIT", "wren-lang/wren", "Robert Nystrom e contribuidores do Wren"),
  },

  // ── 🧠 IA / ML do zero (HANDOFF-AVANCADO-ia-do-zero.md) ──
  {
    tema: "ia", id: "autograd-micrograd", conceito: "autograd do zero (avançado)", modo: "curso",
    repo: "karpathy/micrograd", titulo: "Autograd do zero (micrograd)",
    resumo: "Em ~100 linhas você reconstrói o motor de backprop que sustenta toda rede neural.",
    licenca: lic("MIT", "karpathy/micrograd", "Andrej Karpathy"),
  },
  {
    tema: "ia", id: "rl-minimo", conceito: "aprendizado por reforço (avançado)", modo: "curso",
    repo: "seungeunrho/minimalRL", titulo: "Aprendizado por reforço mínimo (minimalRL)",
    resumo: "DQN, PPO, A3C e outros, cada um num arquivo curto — RL sem abstração escondida.",
    licenca: lic("MIT", "seungeunrho/minimalRL", "seungeunrho"),
  },
  {
    tema: "ia", id: "difusao-mnist", conceito: "modelo de difusão (avançado)", modo: "curso",
    repo: "bot66/MNISTDiffusion", titulo: "Modelo de difusão mínimo (DDPM no MNIST)",
    resumo: "Ruído, denoise e a U-Net: como uma IA gera imagens, sem o peso das bibliotecas.",
    licenca: lic("MIT", "bot66/MNISTDiffusion", "Guocheng Tan", "LICENSE.md"),
  },
  {
    tema: "ia", id: "rede-neural-numpy", conceito: "rede neural em numpy (avançado)", modo: "curso",
    repo: "lionelmessi6410/Neural-Networks-from-Scratch", titulo: "Rede neural só com numpy",
    resumo: "MLP e backprop derivados à mão — entenda o gradiente antes de confiar num framework.",
    licenca: lic("Apache-2.0", "lionelmessi6410/Neural-Networks-from-Scratch", "Chia-Hung Yuan e DataLab (NTHU)"),
  },
  {
    tema: "ia", id: "agente-do-zero", conceito: "agente de IA do zero (avançado)", modo: "curso",
    repo: "pguso/agents-from-scratch", titulo: "Um agente de IA do zero",
    resumo: "O loop do agente — ferramentas, planejamento e memória — na mão, sem framework escondendo nada.",
    licenca: lic("MIT", "pguso/agents-from-scratch", "contribuidores do AI Agents from Scratch"),
  },
  {
    tema: "ia", id: "gpt-do-zero", conceito: "GPT/transformer do zero (avançado)", modo: "curso",
    repo: "karpathy/nanoGPT", titulo: "Treine um GPT do zero (nanoGPT)",
    resumo: "Atenção, tokenização e loop de treino — um GPT de ponta a ponta em código legível.",
    licenca: lic("MIT", "karpathy/nanoGPT", "Andrej Karpathy"),
  },
  {
    tema: "ia", id: "rag-do-zero", conceito: "RAG do zero (avançado)", modo: "curso",
    repo: "pguso/rag-from-scratch", titulo: "RAG peça por peça",
    resumo: "Embeddings, índice e recuperação montados à mão: como a IA consulta documentos antes de responder.",
    licenca: lic("MIT", "pguso/rag-from-scratch", "Patric Gutersohn"),
  },
  {
    tema: "ia", id: "llama-do-zero", conceito: "LLM (LLaMA) do zero (avançado)", modo: "curso",
    repo: "Lightning-AI/lit-llama", titulo: "Um LLaMA legível (lit-llama)",
    resumo: "A arquitetura de um LLM moderno, LoRA e quantização, lendo código limpo de produção.",
    licenca: lic("Apache-2.0", "Lightning-AI/lit-llama", "Lightning AI"),
  },

  // ── 🎮 Gráficos & Jogos (HANDOFF-AVANCADO-graficos-jogos-distribuido.md) ──
  {
    tema: "graficos-jogos", id: "emulador-nes", conceito: "emulador de console (avançado)", modo: "curso",
    repo: "bfirsh/jsnes", titulo: "Um emulador de NES em JavaScript (jsnes)",
    resumo: "CPU 6502, PPU e timing: como um console antigo vira software que roda no navegador.",
    licenca: lic("Apache-2.0", "bfirsh/jsnes", "Ben Firshman"),
  },
  {
    tema: "graficos-jogos", id: "fisica-box2d", conceito: "engine de física 2D em C (avançado)", modo: "curso",
    repo: "erincatto/box2d", titulo: "A referência de física 2D (Box2D)",
    resumo: "Corpos rígidos, detecção e resolução de colisão e integradores — a física por trás dos jogos 2D.",
    licenca: lic("MIT", "erincatto/box2d", "Erin Catto"),
  },
  {
    tema: "graficos-jogos", id: "fisica-2d", conceito: "engine de física 2D (avançado)", modo: "curso",
    repo: "liabru/matter-js", titulo: "Como funciona uma engine de física 2D",
    resumo: "Corpos rígidos, colisão e restrições — a matemática de um motor de física, legível e ao vivo.",
    licenca: lic("MIT", "liabru/matter-js", "Liam Brummitt e contribuidores"),
  },

  // ── 🌐 Redes & Distribuído (HANDOFF-AVANCADO-graficos-jogos-distribuido.md) ──
  {
    tema: "redes-distribuido", id: "raft-go", conceito: "consenso Raft (avançado)", modo: "curso",
    repo: "goraft/raft", titulo: "O protocolo Raft por dentro (goraft)",
    resumo: "Eleição de líder, replicação de log e commit: o algoritmo de consenso lido linha a linha (repo arquivado, para estudo).",
    licenca: lic("MIT", "goraft/raft", "contribuidores do go-raft"),
  },
  {
    tema: "redes-distribuido", id: "kv-distribuido", conceito: "KV distribuído com Raft (avançado)", modo: "curso",
    repo: "otoolep/hraftd", titulo: "Um KV distribuído mínimo (hraftd)",
    resumo: "Um armazenamento chave-valor replicado sobre o Raft da HashiCorp — consenso aplicado, em pouco código.",
    licenca: lic("MIT", "otoolep/hraftd", "Philip O'Toole"),
  },
  {
    tema: "redes-distribuido", id: "proxy-http", conceito: "proxy / servidor HTTP (avançado)", modo: "curso",
    repo: "abhinavsingh/proxy.py", titulo: "Proxy e servidor HTTP do zero (proxy.py)",
    resumo: "Sockets, pipeline HTTP e plugins: como um proxy real intercepta e encaminha tráfego.",
    licenca: lic("BSD-3-Clause", "abhinavsingh/proxy.py", "Abhinav Singh e contribuidores"),
  },
  {
    tema: "redes-distribuido", id: "consenso-raft", conceito: "banco distribuído (avançado)", modo: "curso",
    repo: "rqlite/rqlite", titulo: "Banco distribuído com Raft (rqlite)",
    resumo: "Como várias máquinas concordam e sobrevivem a falhas — consenso Raft sobre SQLite.",
    licenca: lic("MIT", "rqlite/rqlite", "Philip O'Toole"),
  },
];

/** Os 28 cursos avançados, na forma de EsqueletoRepo (o que o cursoRepo e a vitrine consomem). */
export const AVANCADOS: EsqueletoRepo[] = ENTRADAS.map(({ tema: _tema, ...esq }) => esq);

/** O tema de cada curso avançado (id → tema) — a vitrine usa para escolher o ícone 3D do card. */
export const TEMA_AVANCADO: Readonly<Record<string, TemaAvancado>> = Object.fromEntries(
  ENTRADAS.map((e) => [e.id, e.tema]),
);
