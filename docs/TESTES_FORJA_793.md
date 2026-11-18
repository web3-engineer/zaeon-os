# Testes — card #793: trilha AVANÇADA da Forja (28 repos ✅)

Registro dos 28 repositórios **✅ enxutos** (< ~30 MB) curados em `docs/forja/HANDOFF-AVANCADO-*.md`,
num catálogo próprio. Os ⚠️ grandes e ⛔ gigantes ficaram **fora** deste card, como pedido.

> Base: a branch parte do `main` oficial (`web3-engineer/zaeon-os@2929ce7`). Os handoffs citados aqui e no
> catálogo (`docs/forja/HANDOFF-*.md`) vivem na branch `claude/forja-repo-curso` do oficial (PR de outra
> pessoa) e **não** fazem parte deste diff.

## O que mudou

| Arquivo | Mudança |
|---|---|
| `lib/forja/catalogoAvancado.ts` | **novo** — `AVANCADOS` (28 `EsqueletoRepo`, `modo: "curso"`, conceito marcado "(avançado)") + `TEMA_AVANCADO` (id → tema) |
| `lib/forja/cursoRepo.ts` | `...AVANCADOS` no array `ESQUELETOS` (rotas `/api/studio/forja[/mapa]` e `forjaDoItem` acham os cursos) |
| `lib/estudos/vitrine.ts` | `ITENS_FORJA_AVANCADOS` (grátis, `forja:<id>`, tag "avançado", entregável = rodar/simular/treinar) + spread no `CATALOGO` |
| `lib/forja/catalogoAvancado.test.ts` | **novo** — teste próprio (ver abaixo) |

Distribuição: robótica 3 · sistemas 10 · IA do zero 8 · gráficos/jogos 3 · redes/distribuído 4 = **28**.
(O bônus `skywind3000/mini3d` do handoff de gráficos não está em tabela com tamanho ✅ conferido, então não entrou.)

## Licença conferida (2026-11-13)

`gh api repos/<owner>/<repo>` está fora do escopo desta sessão de nuvem (só o fork é acessível pela API), então a
reconferência foi feita pela **busca** do GitHub, que devolve os mesmos campos:
`gh api -X GET search/repositories -f q='repo:<owner>/<repo> …' --jq '.items[] | "\(.full_name)\t\(.license.spdx_id)\t\(.size)KB\t\(.archived)"'`.

- **28/28 encontrados**, `full_name` idêntico ao da tabela, tamanho batendo com o ✅ (24 KB a 23,8 MB).
- **Todas permissivas**: MIT (21) · Apache-2.0 (5: mini-lsm, fjall, Neural-Networks-from-Scratch, lit-llama, jsnes) ·
  BSD-2-Clause (kilo) · BSD-3-Clause (proxy.py). Nenhuma GPL/AGPL.
- O **titular** de cada `licenca` foi tirado da linha de copyright do próprio arquivo de licença do clone (não decorado).
  Nos três Apache-2.0 sem linha de copyright no LICENSE, veio do cabeçalho dos fontes (`mini-lsm`: "Alex Chi Z";
  `lit-llama`: "Copyright Lightning AI") ou do README (`Neural-Networks-from-Scratch`: "Chia-Hung Yuan e DataLab (NTHU)").
- A `url` aponta para o arquivo de licença real: `LICENSE.md` em CppRobotics e MNISTDiffusion; `LICENSE-APACHE` em fjall
  (dupla licença MIT/Apache; registrado como Apache-2.0, que é o SPDX que o GitHub reporta); `LICENSE` nos demais.
- ⚠️ **`goraft/raft` está arquivado** no GitHub. Continua MIT e serve para estudo (o próprio handoff diz "estudo, não
  produção"); o resumo do curso avisa. Se o dono preferir, `otoolep/hraftd` e `rqlite/rqlite` cobrem Raft sem ele.

## Fumaça LOCAL com graphify (§6 do CONTEXTO) — ✅ rodou na nuvem

Instalação funcionou: `uv tool install graphifyy` → **graphify 0.9.108** (Python 3.13). Para cada repo:
`git clone --depth 1 https://github.com/<repo>` → `graphify update . --force` → contagem de `graphify-out/graph.json`.

| repo | rc | tempo | nós | links |
|---|---|---|---|---|
| onlytailei/CppRobotics | 0 | 3 s | 437 | 948 |
| koide3/glim | 0 | 3 s | 2798 | 4454 |
| vectr-ucla/direct_lidar_inertial_odometry | 0 | 3 s | 850 | 1202 |
| antirez/kilo | 0 | 2 s | 53 | 104 |
| nlsandler/write_a_c_compiler | 0 | 1 s | 394 | 246 |
| cstack/db_tutorial | 0 | 1 s | 133 | 328 |
| ekzhang/graphics-workshop | 0 | 1 s | 84 | 93 |
| Fewbytes/rubber-docker | 0 | 2 s | 313 | 481 |
| s-matyukevich/raspberry-pi-os | 0 | 7 s | 4467 | 6586 |
| skyzh/mini-lsm | 0 | 3 s | 2740 | 5017 |
| marcobambini/gravity | 0 | 3 s | 1849 | 5685 |
| fjall-rs/fjall | 0 | 3 s | 1476 | 2865 |
| wren-lang/wren | 0 | 2 s | 1455 | 3813 |
| karpathy/micrograd | 0 | 1 s | 58 | 72 |
| seungeunrho/minimalRL | 0 | 1 s | 151 | 308 |
| bot66/MNISTDiffusion | 0 | 2 s | 68 | 99 |
| lionelmessi6410/Neural-Networks-from-Scratch | 0 | 1 s | 42 | 59 |
| pguso/agents-from-scratch | 0 | 2 s | 600 | 806 |
| karpathy/nanoGPT | 0 | 1 s | 94 | 116 |
| pguso/rag-from-scratch | 0 | 3 s | 1610 | 2322 |
| Lightning-AI/lit-llama | 0 | 3 s | 747 | 1735 |
| bfirsh/jsnes | 0 | 6 s | 938 | 1580 |
| erincatto/box2d | 0 | 7 s | 5638 | 18114 |
| liabru/matter-js | 0 | 4 s | 509 | 835 |
| goraft/raft | 0 | 1 s | 582 | 1275 |
| otoolep/hraftd | 0 | 1 s | 125 | 192 |
| abhinavsingh/proxy.py | 0 | 5 s | 3121 | 6543 |
| rqlite/rqlite | 0 | 8 s | 7034 | 21775 |

**28/28 com `nós > 0`**, todos em ≤ 8 s (clone + análise). Os boards devem encher em prod. Os mais densos
(rqlite, box2d, raspberry-pi-os) passam de 4 mil nós — o board mostra os mais centrais, então escala.
Observação: os notebooks puros (micrograd, Neural-Networks-from-Scratch) dão grafos pequenos (≈ 40–60 nós),
porque o graphify lê sobretudo os `.py`; ainda assim são não-vazios.

## Teste próprio — `lib/forja/catalogoAvancado.test.ts`

1. Exatamente **28** itens; ids e repos únicos; id kebab-case; `repo` = `owner/name`; `modo: "curso"`;
   `conceito` contém "(avançado)"; licença na lista permissiva, com titular e `url` do próprio repo.
2. Nenhum id/repo colide com os iniciantes nem com o `exemplo`.
3. Cada um está em `ESQUELETOS`, é achado por `esqueletoPorId` e vira `CursoRepo` com os 3 módulos
   (entender → espelho → entregar) e 3 licenças (a do repo + as dos dois engines).
4. Vitrine: cada um aparece **uma** vez no `CATALOGO` como `forja:<id>`, grátis, `tipo: "curso"`, tag "avançado"
   (sem "iniciante"), entrega citando o repo e sem "primeiro projeto"; `forjaDoItem` abre o board certo.
5. Os 5 temas estão cobertos e todo curso tem tema.

## Portão (da raiz, após cada parte)

| Comando | Parte 1 (catálogo + cursoRepo) | Parte 2 (vitrine) |
|---|---|---|
| `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit -p .` | 0 | 0 |
| `npx next lint` | 0 (74 avisos, todos pré-existentes) | 0 (mesmos 74) |
| `npx vitest run lib/ app/ components/` | 766 arquivos ✓ · 7968 testes ✓ | 766 arquivos ✓ · 7969 testes ✓ |
| `node scripts/compose-check.mjs` | 0 | 0 |

Ambiente: dependências com `npm ci --ignore-scripts` (lockfile do repo é `package-lock.json`, intocado; nenhum
`yarn.lock` criado/commitado) + `npx prisma generate` para os tipos do Prisma Client (sem isso o tsc acusa
`PrismaClient` ausente em `scripts/rea/*` e `src/lib/prisma.ts` — não é regressão deste card).
