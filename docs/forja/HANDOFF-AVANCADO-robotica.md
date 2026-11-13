# Handoff avançado — 🤖 ROBÓTICA

Curadoria verificada de repos OSS de robótica pra forjar cursos pesados. Leia primeiro
[`HANDOFF-AVANCADO.md`](./HANDOFF-AVANCADO.md) (regras do nível) e [`HANDOFF-NOVOS-CURSOS.md`](./HANDOFF-NOVOS-CURSOS.md)
(mecânica de registro). Todas as linhas vieram de `gh api search/repositories` real. Tamanho: ✅ &lt;30 MB · ⚠️ 30–150 MB · ⛔ &gt;150 MB.

> **Atenção robótica:** vários destes são **enormes** (PX4 ~600 MB, dial-mpc/AV ~280 MB). Fume no motor antes
> (ver handoff do nível). Os **enxutos** (`glim`, `CppRobotics`, `direct_lidar_inertial_odometry`) são os que
> enchem o board na boa; os gigantes entram melhor como **referência** ou apontando um subdiretório.

| owner/repo | ⭐ | tamanho | licença | lang | sub-área | por que é um bom curso difícil |
|---|---|---|---|---|---|---|
| `onlytailei/CppRobotics` | 2244 | ✅ 6.7 MB | MIT | C++ | Algoritmos de robótica | EKF, MPC, LQR, DWA e path planning em C++ — domina os clássicos na língua da robótica embarcada. |
| `koide3/glim` | 1934 | ✅ 3.5 MB | MIT | C++ | LiDAR SLAM | SLAM LiDAR-inercial 3D com otimização por fatores; back-end de SLAM moderno em código enxuto. |
| `vectr-ucla/direct_lidar_inertial_odometry` | 1071 | ✅ 24 MB | MIT | C++ | LiDAR-inercial SLAM | Odometria LiDAR+IMU rápida (UCLA); fusão sensorial e otimização em tempo real. |
| `moveit/moveit` | 2098 | ⚠️ 71 MB | BSD-3-Clause | C++ | ROS / braço robótico | A base clássica do MoveIt (ROS 1): cinemática, colisão e planejadores de manipulação. |
| `moveit/moveit2` | 2114 | ⚠️ 95 MB | BSD-3-Clause | C++ | ROS 2 / braço robótico | Stack de planejamento de movimento em ROS 2 moderno — a evolução do MoveIt. |
| `vectr-ucla/direct_lidar_odometry` | 1057 | ⚠️ 115 MB | MIT | C++ | LiDAR SLAM | Odometria LiDAR direta e leve; contraste com a versão inercial p/ entender registro de nuvens. |
| `LeCAR-Lab/dial-mpc` | 1015 | ⛔ 282 MB | Apache-2.0 | Python | Locomoção legged | MPC por amostragem p/ robô com pernas, sincronizado a sim — controle ótimo + aprendizado. |
| `ShisatoYano/AutonomousVehicleControlBeginnersGuide` | 1942 | ⛔ 287 MB | MIT | Python | Veículo autônomo / sim | Pilha de controle de VA com simulação: percepção, localização, path tracking e Kalman do zero. |
| `PX4/PX4-Autopilot` | 13024 | ⛔ 601 MB | BSD-3-Clause | C++ | Drone / autopiloto | Firmware de autopiloto de referência mundial: estimação de estado, controle de voo, arquitetura embarcada. |

## Sugestão de registro (exemplos)
```ts
// lib/forja/catalogoAvancado.ts (ou o catálogo que você escolher), modo "curso"
{ id: "robotica-algoritmos", conceito: "algoritmos de robótica (avançado)", modo: "curso",
  repo: "onlytailei/CppRobotics", titulo: "Algoritmos de robótica em C++",
  resumo: "EKF, MPC, LQR, DWA e path planning — os clássicos que todo robô usa, na unha.",
  licenca: { spdx: "MIT", titular: "onlytailei", url: "https://github.com/onlytailei/CppRobotics/blob/HEAD/LICENSE" } },
{ id: "slam-lidar", conceito: "SLAM LiDAR (avançado)", modo: "curso",
  repo: "koide3/glim", titulo: "SLAM LiDAR-inercial (GLIM)",
  resumo: "Como um robô se localiza e mapeia o mundo em 3D fundindo LiDAR e IMU.",
  licenca: { spdx: "MIT", titular: "koide3", url: "https://github.com/koide3/glim/blob/HEAD/LICENSE" } },
```
Entregável = **rodar/simular** (não publicar no GitHub). Comece pelos ✅ enxutos; fume os ⚠️/⛔ antes.

## Copyleft notáveis — FORA (decisão de licença)
- **ORB-SLAM3** (UZ-SLAMLab) — referência em Visual-Inertial SLAM, mas **GPL-3.0**.
- **ArduPilot** — autopiloto maduríssimo (rival do PX4), **GPL-3.0**.
- **Betaflight / INAV** — firmwares de controladora de voo FPV, **GPL-3.0**.

São excelentes, mas copyleft → não entram como curso (o aluno derivaria obra GPL). PX4 (BSD) cobre o eixo de voo.
