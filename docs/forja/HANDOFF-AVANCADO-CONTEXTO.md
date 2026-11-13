# 📎 CONTEXTO — leia isto junto com os handoffs da Forja (p/ o Claude executor)

Você (Claude de um dev parceiro) vai **forjar cursos open source avançados** numa plataforma de estudos chamada
**Zaeon**. Este arquivo é a **cola** que amarra os outros handoffs e te dá o contexto que você não tem. Leia-o
primeiro; depois os handoffs temáticos.

## 1. O que é a Forja (em 30 segundos)
A Forja é um motor **repositório → curso interativo**, JÁ NO AR em produção. Quando um curso é registrado, o
aluno abre um **board** na Sala de Estudos que **enche com o mapa real do código** do repo (gerado por um
analisador estático chamado `graphify`, sem LLM), com lições e níveis de dificuldade. Seu trabalho **não é mexer
no motor** — é **curar bons repositórios e registrá-los** para virarem cursos. O motor em prod faz o resto.

## 2. Os arquivos que você recebeu (ordem de leitura)
1. **ESTE** (`HANDOFF-AVANCADO-CONTEXTO.md`) — o contexto e as regras.
2. `HANDOFF-NOVOS-CURSOS.md` — a **mecânica** de registrar um curso (a fonte da verdade; tem a §7 "Para quem executa").
3. `HANDOFF-AVANCADO.md` — o **índice** da trilha avançada e as regras de tamanho/licença.
4. Os 4 temáticos (as **tabelas curadas e verificadas** de repos reais):
   `HANDOFF-AVANCADO-robotica.md`, `-sistemas.md`, `-ia-do-zero.md`, `-graficos-jogos-distribuido.md`.

Repo: **`web3-engineer/zaeon-os`**, branch `main` (o motor da Forja já está mergeado lá).

## 3. Seu loop (o que você faz, de ponta a ponta)
1. Escolha repos das tabelas (comece pelos **✅ enxutos**, &lt;30 MB).
2. **Fume LOCAL** cada um (confirma que gera grafo — §6 abaixo).
3. **Registre** num catálogo avançado novo (§5 abaixo).
4. **Portão** (os 4 comandos — §4).
5. **PR draft** no seu branch. **Avise o dono** (Martinez). Ele mergeia; o motor em prod enche os boards.

## 4. Convenções INQUEBRÁVEIS
- **Branch SEU** (ex.: `claude/forja-cursos-avancados`). NÃO use `claude/forja-repo-curso` (já tem PR aberta de outra pessoa).
- **Portão antes de cada commit**, da raiz do repo:
  ```bash
  NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit -p .   # 0
  npx next lint                                                  # 0
  npx vitest run lib/ app/ components/                           # verde
  node scripts/compose-check.mjs                                 # 0
  ```
- **PR draft. NUNCA mergeie nem faça deploy.** Prod é do dono.
- **Atribuição SUA** nos commits — não copie trailer de sessão de ninguém.
- **Só licença permissiva** (MIT/Apache-2.0/BSD/ISC/MPL). **Nada de GPL/AGPL.** As tabelas já filtram; **reconfirme
  a licença** na hora de registrar (repos mudam): `gh api repos/<owner>/<repo> --jq .license.spdx_id`.
- **Nunca invente `owner/repo`.** Use só o que está nas tabelas ou o que uma busca real retornar.

## 5. Como registrar (tier avançado = catálogo próprio, 3 pontos)
Não jogue cursos avançados no `lib/forja/catalogoIniciantes.ts` (o nome/tag "iniciante" engana o aluno). Crie um irmão:
1. **`lib/forja/catalogoAvancado.ts`** — `export const AVANCADOS: EsqueletoRepo[] = [...]`. Cada item:
   ```ts
   { id: "slam-lidar", conceito: "SLAM LiDAR (avançado)", modo: "curso",
     repo: "koide3/glim", titulo: "SLAM LiDAR-inercial (GLIM)",
     resumo: "Como um robô se localiza e mapeia o mundo em 3D fundindo LiDAR e IMU.",
     licenca: { spdx: "MIT", titular: "koide3", url: "https://github.com/koide3/glim/blob/HEAD/LICENSE" } }
   ```
2. **`lib/forja/cursoRepo.ts`** — no array `ESQUELETOS`, acrescente `...AVANCADOS` (assim as rotas acham os cursos).
3. **`lib/estudos/vitrine.ts`** — gere itens grátis como o `ITENS_FORJA_INICIANTES` faz (`AVANCADOS.map(...)` →
   `preco:0, tipo:"curso", id:"forja:<id>"`) e dê `...` no `CATALOGO`.
   Crie `lib/forja/catalogoAvancado.test.ts` espelhando `catalogoIniciantes.test.ts` (ids únicos, licença permissiva, `repo` = `owner/name`).
O desbloqueio e o board já são genéricos — abrem qualquer `forja:<id>` do catálogo. O tipo `EsqueletoRepo` está em
`lib/forja/tipos.ts`. **Entregável desses cursos = estudar/rodar/simular** (não "publicar no GitHub"); use `modo:"curso"`.

## 6. Fumaça LOCAL (sem a infra do dono)
Você NÃO precisa da box de prod nem de token. Rode o MESMO engine na sua máquina:
```bash
uv tool install graphifyy            # Python 3.10+ (ou: pipx install graphifyy)
git clone --depth 1 https://github.com/<owner>/<repo> /tmp/smoke && cd /tmp/smoke
graphify update . --force
python3 -c "import json;d=json.load(open('graphify-out/graph.json'));print('nós:',len(d['nodes']),'links:',len(d['links']))"
```
`nós > 0` → o board vai encher em prod. `0`/erro/muito lento → troque o repo ou aponte um subdiretório. Repos
**⛔ gigantes** (ex. PX4 ~600 MB) provavelmente não valem o esforço — prefira os ✅/⚠️.

## 7. O que você NÃO faz
Não sobe nada em servidor, não toca na box `75.119.140.97`, não configura motor, não mergeia, não deploya. Só:
**curar → fumar local → registrar → portão → PR draft → avisar o dono.** Simples e seguro.
