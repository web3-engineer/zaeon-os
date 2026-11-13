# Handoff avançado — 🎮 GRÁFICOS·JOGOS & 🌐 REDES·DISTRIBUÍDO

Curadoria verificada, dois temas num handoff. Leia [`HANDOFF-AVANCADO.md`](./HANDOFF-AVANCADO.md) e
[`HANDOFF-NOVOS-CURSOS.md`](./HANDOFF-NOVOS-CURSOS.md) antes. Linhas de `gh api` real.
Tamanho: ✅ &lt;30 MB · ⚠️ 30–150 MB · ⛔ &gt;150 MB.

## 🎮 Gráficos & Jogos

| owner/repo | ⭐ | tamanho | licença | lang | sub-área | por que é um bom curso difícil |
|---|---|---|---|---|---|---|
| `bfirsh/jsnes` | 6437 | ✅ 5 MB | Apache-2.0 | JavaScript | Emulador NES | Emulador de NES compacto: CPU 6502, PPU e timing num código enxuto o bastante pra ler inteiro. |
| `erincatto/box2d` | 10492 | ✅ 18 MB | MIT | C | Física 2D | A referência de física 2D rígida pra jogos; resolução de colisão e integradores. |
| `liabru/matter-js` | 18623 | ✅ 23 MB | MIT | JavaScript | Física 2D (web) | Motor de corpos rígidos legível no navegador — dá pra ler e depurar a matemática de restrições ao vivo. |
| `cadenji/foolrenderer` | 1131 | ⚠️ 37 MB | MIT | C | Software renderer | Rasterizador minúsculo sem API gráfica: o que uma GPU faz (pipeline, shading, z-buffer) na unha. |
| `matrixcascade/PainterEngine` | 3335 | ⚠️ 83 MB | MIT | C | Game engine + renderer | Engine completa em C puro, portável — renderer, áudio e loop de jogo do zero. |
| `Zylann/godot_voxel` | 4132 | ⚠️ 84 MB | MIT | C++ | Voxel engine | Módulo de voxels p/ Godot: terreno infinito, LOD e meshing — mundos tipo Minecraft, sério. |

> Bônus verificado (permissivo, não coube acima): **`skywind3000/mini3d`** (MIT, C) — renderer 3D em ~700 linhas, joia didática.

## 🌐 Redes & Distribuído

| owner/repo | ⭐ | tamanho | licença | lang | sub-área | por que é um bom curso difícil |
|---|---|---|---|---|---|---|
| `goraft/raft` | 2429 | ✅ 2 MB | MIT | Go | Consenso Raft | Implementação do protocolo Raft em Go pra ler o algoritmo por dentro (estudo, não produção). |
| `otoolep/hraftd` | 1103 | ✅ 2.5 MB | MIT | Go | KV distribuído (Raft) | KV distribuído mínimo sobre o Raft do Hashicorp — aprende a biblioteca linha a linha. |
| `abhinavsingh/proxy.py` | 3559 | ✅ 7 MB | BSD-3-Clause | Python | Proxy / servidor HTTP | Proxy e servidor web sem dependências: sockets, pipeline HTTP e plugins de um proxy real. |
| `rqlite/rqlite` | 17946 | ✅ 13.5 MB | MIT | Go | Banco distribuído (Raft+SQLite) | Banco tolerante a falhas sobre SQLite com Raft real — consenso, snapshot e alta disponibilidade. |

## Sugestão de registro (exemplos)
```ts
{ id: "fisica-2d", conceito: "engine de física 2D (avançado)", modo: "curso",
  repo: "liabru/matter-js", titulo: "Como funciona uma engine de física 2D",
  resumo: "Corpos rígidos, colisão e restrições — a matemática de um motor de física, legível e ao vivo.",
  licenca: { spdx: "MIT", titular: "Liam Brummitt", url: "https://github.com/liabru/matter-js/blob/HEAD/LICENSE" } },
{ id: "consenso-raft", conceito: "consenso distribuído (avançado)", modo: "curso",
  repo: "rqlite/rqlite", titulo: "Banco distribuído com Raft (rqlite)",
  resumo: "Como várias máquinas concordam e sobrevivem a falhas — consenso Raft sobre SQLite.",
  licenca: { spdx: "MIT", titular: "Philip O'Toole", url: "https://github.com/rqlite/rqlite/blob/HEAD/LICENSE" } },
```

## Copyleft notáveis — FORA
As buscas já filtraram por permissivo (os clássicos aqui — Godot, Box2D — já são MIT). Nenhum GPL/AGPL concreto
surgiu nos resultados; clones didáticos copyleft de Redis/Kafka, se aparecerem, ficam de fora por licença.

> **Honestidade:** não apareceu um "mini-kafka" nem um load-balancer dedicado limpo dentro dos filtros antes do
> rate limit — preferimos **não inventar linha**. `proxy.py` cobre proxy/HTTP; os 3 Raft + rqlite cobrem consenso/KV.
