# Handoff — forjar MAIS cursos OSS e expor na vitrine

Guia prático pra outro agente **adicionar cursos open source** à Forja: achar um repo real, registrá-lo, e
pronto — ele aparece **grátis na vitrine** e abre como board interativo na Sala de Estudos, com o **mapa real
do código** sendo gerado pelo motor em prod. Já há 10 cursos no ar; este doc é a receita pra somar mais.

> **A boa notícia:** o encanamento todo já existe e é genérico. Pra um curso novo você edita **um arquivo**
> (`lib/forja/catalogoIniciantes.ts`). Rota, vitrine, desbloqueio, board e a análise pelo motor são automáticos.

---

## 1. Como funciona (o fluxo, ponta a ponta)

```
Você adiciona um EsqueletoRepo em lib/forja/catalogoIniciantes.ts  (id, repo, título, resumo, licença)
        │
        ├─► lib/estudos/vitrine.ts  → ITENS_FORJA_INICIANTES.map(...)  → vira item GRÁTIS na vitrine (id "forja:<id>")
        │
aluno pega o card na vitrine (VitrineEstudos) → marcarForjaPendente(forjaDoItem) → desbloqueioForja
        │
Sala de Estudos (StudyCoworkChat) consome o pendente → runStudioAction("forja", <id>)
        │
/api/studio/forja  → esqueleto curado (board + lições + 🌡️ temperatura) na hora
        │
ForjaView monta → chama /api/studio/forja/mapa { cursoId } (lazy)
        │
engineClient → http://zaeon_forja_engine:8800/forja (rede do app) → `graphify update <repo>` (estático, SEM LLM)
        │
graph.json → adaptadores (lib/forja/adaptadores) → GrafoConhecimento → o board ENCHE com os nós centrais
```

Sem a ponte configurada (`FORJA_BRIDGE_URL`/`TOKEN` no `.env` do app), tudo degrada pro **esqueleto curado**
(board + lições), sem erro. Com a ponte (prod atual), o mapa real aparece.

### Onde cada peça vive
| Peça | Arquivo | Mexe pra curso novo? |
|------|---------|----------------------|
| **Catálogo dos cursos** | `lib/forja/catalogoIniciantes.ts` (`INICIANTES`) | **SIM — é só isto** |
| Vitrine (itens grátis) | `lib/estudos/vitrine.ts` (`ITENS_FORJA_INICIANTES`) | não (gera do catálogo) |
| Desbloqueio card→board | `lib/forja/desbloqueioForja.ts` | não |
| Rota do esqueleto | `app/api/studio/forja/route.ts` | não |
| Rota do mapa (motor) | `app/api/studio/forja/mapa/route.ts` | não |
| Cliente do motor | `lib/forja/engineClient.ts` | não |
| Board (UI) | `components/studio/ForjaView.tsx` | não |
| Adaptadores da saída | `lib/forja/adaptadores/` | não |
| Motor (na box) | `infra/forja-engine/` | não (já no ar) |

---

## 2. Receita (adicionar um curso)

### Passo 1 — ache um repo REAL e permissivo (NUNCA invente URL)
Busque no índice AO VIVO do GitHub e confira `full_name`, licença e tamanho. Pequeno, um conceito, didático:
```bash
gh api -X GET search/repositories \
  -f q='<tema> language:javascript license:mit stars:20..800 size:<3000' -f sort=stars -f per_page=6 \
  --jq '.items[] | "\(.full_name)\t\(.stargazers_count)★\t\(.size)KB\t\(.license.spdx_id)\t\(.language)"'
```
Critérios: **licença permissiva** (MIT/Apache-2.0/BSD/ISC/Unlicense — **nada de GPL/AGPL**: é copyleft e o
aluno vai publicar o próprio projeto); **pequeno** (size baixo = board legível); **host na allowlist do bridge**
(github.com, gitlab.com, codeberg.org, bitbucket.org); **um conceito claro** que um iniciante entende.

### Passo 2 — registre no catálogo
Em `lib/forja/catalogoIniciantes.ts`, adicione um item ao array `INICIANTES` (use o helper `mit(...)` ou crie
a `licenca` à mão pra Apache/BSD):
```ts
{
  id: "conversor-de-temperatura",          // único, kebab-case; vira o card "forja:conversor-de-temperatura"
  conceito: "conversor de unidades",       // o arquétipo (aparece nas tags)
  modo: "curso",                           // "curso" (board com os 3 cards ativos)
  repo: "<owner>/<repo>",                  // o repo REAL verificado no passo 1
  titulo: "Conversor de temperatura",
  resumo: "Entrada, cálculo e saída: a lógica mais limpa pra treinar funções e eventos.",
  licenca: mit("<owner>/<repo>", "<autor real do repo>"),   // atribuição preservada e exibida no board
},
```
> Para licença não-MIT: `licenca: { spdx: "Apache-2.0", titular: "<autor>", url: "https://github.com/<owner>/<repo>/blob/HEAD/LICENSE" }`.

(Opcional) em `lib/estudos/vitrine.ts`, mapeie um ícone 3D pro card em `MODELO_INICIANTE` (`id → Modelo3D`).
Sem isso, cai no padrão `"chip"`. Nada mais é preciso: o item grátis, o desbloqueio e o board saem de graça.

### Passo 3 — portão (SEMPRE antes do commit)
```bash
NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit -p .   # 0 erros
npx next lint                                                  # 0 erros
npx vitest run lib/ app/ components/                           # verde
node scripts/compose-check.mjs                                 # 0
```
O teste `lib/forja/catalogoIniciantes.test.ts` aceita `≥10` cursos e qualquer licença permissiva — adicionar
não quebra nada, desde que o item tenha `repo` no formato `owner/name`, `conceito/titulo/resumo` e `licenca`
permissiva com `url` contendo o repo.

### Passo 4 — commit + PR draft (prod é do dono)
Branch `claude/forja-*`, commit com o trailer da sessão, **PR draft**. Nunca mergeie na `main` nem faça deploy:
o dono mergeia (→ deploy automático). Ao mergear, o card novo entra na vitrine de prod sozinho.

---

## 3. (Recomendado) fume o repo no motor antes de confiar
Nem todo repo gera um grafo bonito (linguagem que o tree-sitter do graphify não cobre bem, repo grande demais).
Confirme que o board vai encher — na box do app server (`75.119.140.97`), pela rede interna:
```bash
TOKEN=$(grep '^FORJA_BRIDGE_TOKEN=' /opt/forja-engine/.env | cut -d= -f2)
curl -s -m 180 http://127.0.0.1:8800/forja -H 'content-type: application/json' \
  -d "{\"token\":\"$TOKEN\",\"engine\":\"graphify\",\"repoUrl\":\"https://github.com/<owner>/<repo>\"}" \
  | python3 -c "import sys,json;d=json.load(sys.stdin);g=d.get('grafo');print('ok' if g else d.get('erro'),'nós:',len(g['nodes']) if g else 0)"
```
`nós > 0` → o board vai encher. `0` ou erro → troque o repo (ou abra como curso, que degrada pro esqueleto).

---

## 4. Invariantes (NUNCA quebre)
1. **Repo real, verificado.** Nunca invente `owner/repo`. Confirme existência + licença + tamanho pela busca.
2. **Licença permissiva + atribuição.** MIT/Apache/BSD/ISC/Unlicense. Autor e licença do repo vão no `licenca`
   e aparecem no rodapé do board. Sem copyleft (GPL/AGPL) num starter. A Forja consome só a SAÍDA (grafo),
   nunca copia o código do repo.
3. **Portão antes de cada commit** (os 4 comandos). Vermelho = conserta antes.
4. **Prod é do dono.** PR draft; nunca auto-merge/deploy.
5. **Um conceito por curso.** Pequeno, didático, publicável pelo aluno no fim (via Octa, o card "entregar").

## 5. Referência rápida — `EsqueletoRepo` (lib/forja/tipos.ts)
```ts
type EsqueletoRepo = {
  id: string;        // único, kebab-case → card "forja:<id>"
  repo: string;      // "owner/name" real, host da allowlist
  titulo: string;
  resumo: string;    // uma frase: o que o aluno aprende
  modo: "curso" | "entregavel";   // use "curso"
  licenca?: Licenca; // { spdx, titular, url } do repo estudado
  conceito?: string; // o arquétipo (tag)
};
```

## 6. Marcha 2 (opcional, melhora os cursos de TODOS de uma vez)
Ligar o engine `understand` (a *tour* guiada, a `ArvoreEntendimento`) dá mais profundidade a **todo** curso,
sem mexer em catálogo. Precisa do wrapper Claude Code na box (`FORJA_UNDERSTAND_CMD`) — ver
`RUNBOOK-FORJA-ENGINE.md §5`. Enquanto não houver, o graphify sozinho já entrega o mapa.
