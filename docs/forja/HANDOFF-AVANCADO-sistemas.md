# Handoff avançado — ⚙️ SISTEMAS & BAIXO NÍVEL

Curadoria verificada de repos "build-your-own-X" pesados. Leia [`HANDOFF-AVANCADO.md`](./HANDOFF-AVANCADO.md)
e [`HANDOFF-NOVOS-CURSOS.md`](./HANDOFF-NOVOS-CURSOS.md) antes. Linhas de `gh api` real.
Tamanho: ✅ &lt;30 MB · ⚠️ 30–150 MB · ⛔ &gt;150 MB.

> **Ótimo tema pro motor:** quase todos são **enxutos** (código didático em C/Rust/Python), então o board
> enche lindo. É o tier avançado mais "plug-and-play" da Forja.

| owner/repo | ⭐ | tamanho | licença | lang | sub-área | por que é um bom curso difícil |
|---|---|---|---|---|---|---|
| `antirez/kilo` | 9221 | ✅ 24 KB | BSD-2-Clause | C | Editor de texto | Editor estilo vi em ~1000 linhas de C, sem dependências — o clássico "editor do zero". |
| `nlsandler/write_a_c_compiler` | 915 | ✅ 44 KB | MIT | C | Compilador | Suíte de testes do livro: você escreve um compilador C real em etapas (lexer → codegen). |
| `cstack/db_tutorial` | 10538 | ✅ 1.1 MB | MIT | C | Banco de dados | Clone do SQLite do zero, passo a passo: REPL, B-tree, paginação e persistência em disco. |
| `ekzhang/graphics-workshop` | 2184 | ✅ 0.9 MB | MIT | GLSL | Ray / path tracer | Ray marching e path tracing escritos à mão em shaders — computação gráfica na raiz. |
| `Fewbytes/rubber-docker` | 3252 | ✅ 1.3 MB | MIT | Python | Container runtime | "Docker from scratch": namespaces, cgroups e chroot pra construir um runtime de containers. |
| `s-matyukevich/raspberry-pi-os` | 13964 | ✅ 2 MB | MIT | C | SO / kernel | Escreve um SO didático p/ Raspberry Pi: boot, exceções, memória virtual e escalonamento em ARM64. |
| `skyzh/mini-lsm` | 4214 | ✅ 2.2 MB | Apache-2.0 | Rust | Storage engine | Constrói um motor LSM-tree em Rust semana a semana (memtable, SST, compaction). |
| `marcobambini/gravity` | 4593 | ✅ 3 MB | MIT | C | Interpretador | Linguagem embeddable: compilador + VM com garbage collector num código enxuto em C. |
| `fjall-rs/fjall` | 2439 | ✅ 4.6 MB | Apache-2.0 | Rust | Storage engine | Engine LSM idiomático em Rust — ver como a teoria vira projeto de produção. |
| `wren-lang/wren` | 8175 | ✅ 8 MB | MIT | Wren/C | Interpretador | Linguagem de script pequena, classe-based, com VM compacta e legível. |
| `theseus-os/Theseus` | 3225 | ⚠️ 135 MB | MIT | Rust | SO / kernel | SO experimental em Rust que repensa isolamento por safe-language — design de kernel avançado. |

## Sugestão de registro (exemplos)
```ts
{ id: "banco-do-zero", conceito: "banco de dados do zero (avançado)", modo: "curso",
  repo: "cstack/db_tutorial", titulo: "Construa um banco de dados (clone do SQLite)",
  resumo: "REPL, B-tree, paginação e persistência: como um banco guarda e acha dados de verdade.",
  licenca: { spdx: "MIT", titular: "cstack", url: "https://github.com/cstack/db_tutorial/blob/HEAD/LICENSE" } },
{ id: "compilador-c", conceito: "compilador (avançado)", modo: "curso",
  repo: "nlsandler/write_a_c_compiler", titulo: "Escreva um compilador C",
  resumo: "Do lexer ao codegen, em etapas testáveis — o que acontece entre o seu código e a máquina.",
  licenca: { spdx: "MIT", titular: "Nora Sandler", url: "https://github.com/nlsandler/write_a_c_compiler/blob/HEAD/LICENSE" } },
```

## Copyleft notáveis — FORA
As buscas já filtraram por permissivo, então nenhum GPL/AGPL entrou nos resultados. Para o tema, muitos clones
didáticos de **Redis** e **regex engines** populares vêm sob GPL-3.0/AGPL — ficam de fora por licença.
(`antirez/kilo` e `db_tutorial`, por exemplo, já cobrem "editor" e "banco" com licença permissiva.)
