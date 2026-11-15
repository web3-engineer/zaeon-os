# Tutorial de arquivo — o curso é o repo real, digitado pelo aluno

O curso de código é o **repositório real**, ensinado **arquivo por arquivo**. O aluno **digita o código**
(sem colar), guiado por snippets, e o programa roda. O que o aluno não digita é **residual** (montado pelo
Octa). Este doc descreve o modelo e a geração dos cards.

## Modelo (`lib/forja/tutorialArquivo.ts`)
- `CardDeArquivo` = um arquivo do repo: `funcao` (o que faz no projeto), `ordem` (complexidade), `abas`
  (sub-abas horizontais, pra ficar compacto), `teste` (ponta-a-ponta), `residual?`.
- `AbaDoCard` = `{ titulo, snippets, quiz? }`. `Snippet` = `{ explicacao, codigo }`.
- **Invariante da harmonia:** concatenar os `codigo` dos snippets de um card = o arquivo real executável.
  `montarArquivo`, `validarDigitado`, `estaCompleto`, `programaDeTeste` são puros e testados.

## UI (`components/study/CardArquivo.tsx` + `EditorDoCard.tsx`)
Card à esquerda (função + sub-abas + snippets + quiz + input de dúvida), editor Monaco à direita com
**paste bloqueado**. "Rodar testes" executa no navegador (Pyodide/iframe via `useCodeRunner`) — verde só
quando o código digitado de fato roda. Aberto pelo botão "praticar: digite o código" no `SalaCurso`.

## Geração dos cards (F2) — repo → cards
Duas metades, para **garantir a harmonia**:

1. **PLANOS (LLM, na box).** Um passo de modelo lê cada arquivo do repo clonado e produz um
   `PlanoDeArquivo` (`lib/forja/cardsDoRepo.ts`): `funcao`, `ordem`, e `cortes` — ONDE cortar (linha) e o
   que ENSINAR por trecho (+ quiz, teste, marcação de residual). **O LLM NÃO reproduz o código**; só decide
   cortes e pedagogia. É isto que faz o nº de cards acompanhar a complexidade do repo (graphify ordena os
   arquivos por centralidade; o LLM corta cada um).
   - Prompt (resumo): "Para o arquivo X, dê a função dele no projeto, e uma lista de cortes (linha inicial +
     explicação + sub-aba) que o aluno vai digitar trecho a trecho. Cubra o arquivo do começo ao fim. Marque
     como `residual` os arquivos de boilerplate/config que o aluno NÃO precisa digitar. Dê o teste que prova
     o arquivo. NUNCA reescreva o código — só diga onde cortar."

2. **MONTAGEM (determinística, no app/box).** `cardsValidados(planos, conteudos)` fatia cada arquivo REAL
   nos cortes do plano e **descarta** qualquer card cujos snippets não reconstroem o arquivo (harmonia à
   prova de erro). O script `scripts/forja-cards-gerar.mjs` faz isso e grava no cache.

## Cache e entrega
- `lib/forja/cardsLocal.ts`: `cardsCacheados(repo)` lê o cache (`FORJA_CARDS_CACHE`, volume em prod);
  `gravarCardsCache(repo, cards)` grava (usado pelo job).
- `app/api/studio/forja/route.ts` serve `cards`: os gerados por repo (cache) primeiro; senão os **cards
  bundlados** (`lib/forja/tutoriais.ts`, por curso). `components/study/SalaCurso.tsx` consome `j.cards`.

## Duas vias de conteúdo (nenhuma exige provisionar pra ter curso pronto)
1. **Bundlado (cursos conhecidos, a via padrão).** Os cards dos cursos finitos já vêm prontos na imagem
   (`lib/forja/tutoriais.ts` → `lib/forja/tutoriais/*.json`). São autorados com o arquivo real cortado em
   snippets; a harmonia é travada por teste (`tutoriais.test.ts`) e cada arquivo foi rodado de fato. Hoje:
   `algoritmos-classicos` → `binary_search.py`, `insertion_sort.py`, `greatest_common_divisor.py`.
2. **Gerado em escala (repos arbitrários).** A metade 1 (planos via LLM) roda na box — mesma pegada do
   understand-anything — pra cobrir QUALQUER repo sob demanda; o resultado validado vai pro cache.
   Rodar em lote: `FORJA_CARDS_CACHE=/vol npx tsx scripts/forja-cards-gerar.mjs --repo o/n --dir <clone> --planos planos.json`.
   É a única parte que depende de provisionamento — e só pra escala, não pra entregar os cursos conhecidos.

## F3 — GitHub + auto-push (ENTREGUE)
O projeto do aluno (os arquivos que ele digitou nos cards) sobe no GitHub DELE. **1 repo por curso.**
- `lib/forja/projetoDoCurso.ts` (PURO, +test): `arquivosDoProjeto(cards, {titulo, repo, extras?})` monta os
  arquivos a partir dos cards (cada card não-residual → seu arquivo, `montarArquivo`; + README; + `extras`
  = residual do Octa). `nomeRepoDoCurso(cursoId)` → `zaeon-<slug>`.
- `POST /api/studio/forja/publicar` ({cursoId}): auth por e-mail; `getUserOctokit` (token do aluno) → sem
  conexão devolve 409 "conecte seu GitHub"; monta os arquivos NO SERVIDOR (nunca do cliente); cria o repo
  (privado) se não existe, senão reusa; `commitFiles` no branch default. Reuso de `github-service.ts`.
- `components/study/CardArquivo.tsx`: botão **"subir pro meu GitHub"** que só aparece com o teste VERDE
  (portão QA leve, F5-lite), checa a conexão em `/api/octa/github` e chama a rota.

**Invariante de segurança:** os arquivos são montados no servidor a partir dos cards (conteúdo canônico =
o arquivo real), o cliente manda só o `cursoId`; push só na conta do próprio aluno; ação disparada por ele.

## Fases seguintes
- **F4 — residual via Octa (background):** o Octa monta os arquivos marcados `residual` (copiados/adaptados
  do source) e os passa como `extras` pra `arquivosDoProjeto`, pro projeto rodar inteiro. (molde:
  `lib/rea-blueprint/paraOcta.ts` + `scaffold.ts`.) Hoje o push leva os arquivos digitados + README.
- **F5 — agente QA (pré-push, engine):** além do portão leve (teste verde no navegador), um engine na ponte
  da Forja que roda o projeto PRONTO (executável? README?) e carimba "pronto pra publicação". Ops-gated.
