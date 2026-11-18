# Handoff — Cursos da Forja: conteúdo real, "digita o código" e board com progressão

> Documento de passagem de bastão. Cobre o que esta sessão construiu, o estado atual, a arquitetura, as
> decisões tomadas e o que falta — para outra pessoa (ou agente) assumir a continuação sem reconstruir o
> contexto. Datas de referência: nov/2026.

## 0. TL;DR

O curso de código da Forja tem **duas camadas de conteúdo**, e as duas ensinam de verdade:

1. **Camada conceitual** (`curso.json`): módulos em progressão com `estudo` (lição), `prova` (quiz com
   gabarito), `desafio` e `sandbox`. Já existe para **21 cursos** (10 do catálogo iniciante + 11 skills de
   código).
2. **Camada "digita o código"** (tutorial de arquivo): o aluno **digita o código real** (sem colar),
   guiado por snippets, e o programa **roda no navegador**; com o teste verde, ele **publica o projeto no
   GitHub dele**. Existe para **6 cursos** (ver §4).

O board (a árvore/jornada do curso) foi redesenhado: **progressão real** (trilha conectada 1→2→3, botão
"continuar"), **título animado**, **nós azuis/energéticos** e **fundo que respeita claro/escuro**.

## 1. O que entrou (PRs)

- **#812** (merged): fim do curso vazio/oco. Base curada (camada 0) + board renderiza o conteúdo REAL
  (sem fabricar quiz/código). Roteamento consistente; enriquecimento não-destrutivo. Autorados os 11
  `curso.json` das skills de código.
- **#814** (merged): 10 cursos do catálogo iniciante com conteúdo real + o pipeline "digita o código"
  F1–F5 + `algoritmos-classicos` completo (3 cards).
- **#815** (esta sessão): redesign do board + mais 5 cursos "digita o código" (JS). **Merge nesta sessão.**

## 2. Arquitetura — como o conteúdo chega à tela

```
cursoId ──> resolverEsqueleto (esqueletoResolver.ts)
              ├─ esqueletoPorId  (cursoRepo.ts: ESQUELETOS = catálogo iniciante + avançado)
              └─ esqueletoDaSkill (skills com zaeon-repo + módulo "board")
        ──> /api/studio/forja (route.ts)
              ├─ meta.arvore + meta.licoesPorNo  ← conteudoCuradoDoCurso (camada 0)
              └─ cards  ← cardsCacheados(repo) [gerado]  ||  tutoriaisDoCurso(id) [bundlado]
        ──> SalaCurso.tsx
              ├─ CursoArvoreView.tsx   (board: árvore + board da lição, camada conceitual)
              └─ CardArquivo.tsx       (tutorial "digita o código", quando há cards)
```

### Camada 0 — conceitual (sempre ensina, sem motor)
- `lib/forja/licaoCurada.ts` (PURO): normaliza o `curso.json` cru → `ArvoreEntendimento` (módulos → nós,
  `estudo` → resumo) + `licoesPorNo` (prova/sandbox por nó `mod:N`). Invariante: cada módulo = um nó.
- `lib/forja/conteudoCurado.ts` (SERVER): resolve a base curada na ordem: (1) `.claude/skills/<id>/curso.json`
  → (1b) `CATALOGO_CURSOS[<id>]` → (2) corpo do `SKILL.md` em seções.
- `lib/forja/cursosCatalogo.ts`: `CATALOGO_CURSOS`, registry **bundlado** (import de JSON, não lê disco).
- `lib/forja/cursos/*.json`: os 10 cursos do catálogo iniciante.
- `.claude/skills/<id>/curso.json`: os 11 cursos das skills de código.

> **Por que bundlar o JSON (não ler do disco):** `.dockerignore` exclui `*.md` com exceção
> `!.claude/skills/**`. Um JSON solto em `lib/` não tem garantia no runtime do Next standalone. Importado
> como módulo, o bundler o inclui — sempre existe. **Regra:** conteúdo fora de `.claude/skills` entra por
> `import`, nunca por `fs` em runtime.

### Camada "digita o código" — o tutorial de arquivo
- `lib/forja/tutorialArquivo.ts` (PURO): os tipos (`CardDeArquivo`/`AbaDoCard`/`Snippet`) + **a INVARIANTE
  DA HARMONIA**: concatenar os `codigo` dos snippets de um card (com `\n`) = **o arquivo real executável**.
  Funções: `montarArquivo`, `validarDigitado` (exato, tolera só espaço no fim), `estaCompleto`,
  `programaDeTeste`.
- `components/study/CardArquivo.tsx`: o card à esquerda (função + sub-abas horizontais + snippets + quiz +
  input de dúvida) + o **editor à direita** (`EditorDoCard.tsx`, Monaco com **paste bloqueado**). "Rodar
  testes" executa no navegador (`useCodeRunner`); verde só quando o digitado roda. Com o teste verde,
  aparece "subir pro meu GitHub".
- `lib/forja/tutoriais.ts`: `TUTORIAIS` (registry bundlado, por cursoId) + `tutoriaisDoCurso`.
- `lib/forja/tutoriais/*.json`: os cards prontos (ver §4).
- `lib/forja/tutoriais.test.ts`: **trava a harmonia de TODO card bundlado** (concatenação reconstrói o
  arquivo; cada snippet valida contra si e recusa vazio; exige `teste`).

### Geração em escala (F2) — repo arbitrário → cards (OPS-GATED)
Só é necessária para gerar cards de **repos arbitrários sob demanda** — os cursos conhecidos já vêm
bundlados (§4) e **não dependem disto**.
- `lib/forja/cardsDoRepo.ts` (PURO): o LLM só decide ONDE cortar (`PlanoDeArquivo`); o split do arquivo
  REAL é determinístico (`cardDoPlano`) e `cardsValidados` **descarta o que quebra a harmonia**.
- `lib/forja/cardsLocal.ts`: cache (`FORJA_CARDS_CACHE`, volume em prod).
- `scripts/forja-cards-gerar.mjs`: job em lote (aplica planos aos arquivos reais → cache validado).
- **Pendência:** a metade 1 (planos via LLM) roda na box, como o `understand-anything` — precisa de
  provisionamento (ops). Sem isso, o curso usa os cards bundlados.

### Publicar no GitHub do aluno (F3) + residual (F4) + QA (F5)
- `lib/forja/projetoDoCurso.ts` (PURO): `arquivosDoProjeto(cards, {titulo, repo, extras})` monta os
  arquivos do projeto (cada card não-residual → seu arquivo via `montarArquivo`; + README; + `extras`);
  `nomeRepoDoCurso` (1 repo por curso); `caminhosResiduais`; `qaDoProjeto` (gate estrutural).
- `app/api/studio/forja/publicar/route.ts` (POST `{cursoId}`): monta os arquivos **no servidor** a partir
  dos cards (nunca do cliente), usa o token do **próprio aluno** (`getUserOctokit`), cria o repo privado
  se não existe e dá `commitFiles`. Roda `qaDoProjeto` → 422 se reprovar. 409 se o GitHub não está conectado.
- `lib/forja/residualDoRepo.ts` (F4): puxa do repo-fonte só os arquivos marcados `residual` (teto de 40).
  Hoje normalmente no-op (sem F2 marcando residual); a máquina está pronta.
- **F5:** dois portões — o leve no cliente (botão só com teste verde) e o estrutural no servidor
  (`qaDoProjeto`). Um engine de QA mais fundo (rodar o projeto pronto na box) fica ops-gated.
- Reuso: `lib/projects/github-user.ts` (OAuth user-to-server) + `lib/projects/github-service.ts`
  (`createRepo`/`commitFiles`/`repoExiste`).

**Invariantes de segurança (preservar):** arquivos montados server-side a partir dos cards (cliente manda
só `cursoId`); push só na conta do próprio aluno; ação disparada por ele; 1 repo por curso.

## 3. O board (`components/studio/CursoArvoreView.tsx`)

Motor imperativo (SVG + requestAnimationFrame + viewBox). `montarBoardHtml` é **puro e exportado**
(testado em `CursoArvoreView.board.test.tsx`) — monta o HTML da lição (Aprendizado = `estudo` real,
sandbox real, prova real). Nunca fabrica conteúdo.

Redesign desta sessão:
- **Progressão real:** `place()` tem caso especial para depth 0 — os módulos SOBEM numa trilha conectada
  (`Math.sin(i*1.1)*120`), ligada em sequência (raiz → mod0 → mod1 → …, gradiente `av-flow` com traço
  animado). Selo de passo (N) nos rótulos.
- **"continuar":** `montarBoardHtml` aceita `prox`/`passo`; o board mostra "continuar: ‹próximo› ▸" (avança
  de verdade pelo `.av-continuar`) e só o último módulo mostra "concluir ✓".
- **Título animado:** overlay `.av-intro` com o título entrando/saindo.
- **Cores azuis/energéticas:** gradientes `av-grad`/`av-wire`/`av-nodeGrad`/`av-flow` (azul elétrico → ciano).
- **Tema:** CSS com variáveis — claro como base, `.dark .av-root` sobrescreve (o app usa `next-themes`
  com `attribute="class"`, `.dark` no `<html>`).

## 4. Cursos com "digita o código" (6, todos verificados rodando)

| cursoId | arquivo(s) | linguagem | runner |
|---|---|---|---|
| `algoritmos-classicos` | binary_search, insertion_sort, greatest_common_divisor | Python | Pyodide |
| `calculadora` | calculadora.js | JavaScript | iframe |
| `jogo-da-velha` | jogo-da-velha.js | JavaScript | iframe |
| `quiz` | quiz.js | JavaScript | iframe |
| `markdown-para-html` | markdown-para-html.js | JavaScript | iframe |
| `lista-de-tarefas` | lista-de-tarefas.js | JavaScript | iframe |

Cada arquivo foi **autorado, rodado de fato** (python3/node) e cortado em snippets cujo concatenado = o
arquivo que passou.

## 5. Receita — adicionar um novo curso "digita o código"

1. **Autore o arquivo real + um teste** e rode (`python3 x.py` / `node x.js`) até passar. O teste é um
   bloco de `assert`/`throw` que prova o arquivo ponta-a-ponta.
2. Crie `lib/forja/tutoriais/<id>.json`: `abas[].snippets[]` cujos `codigo` juntados por `\n` = o arquivo;
   `quiz` (opcional) no shape `QuestaoProva` normalizado (`{tipo:"escolha", enunciado, opcoes:[{texto,correta,explicacao}], pontos}`);
   `teste` = o bloco que prova.
3. **Confira a harmonia:** `node -e "const c=require('./lib/forja/tutoriais/<id>.json'); new Function(c.abas.flatMap(a=>a.snippets).map(s=>s.codigo).join('\n')+'\n\n'+c.teste)()"`
   (para Python, monte o programa e rode com `python3`).
4. Registre em `lib/forja/tutoriais.ts` (`TUTORIAIS[<cursoId>] = [card(<id>)]`).
5. `lib/forja/tutoriais.test.ts` cobre automaticamente (itera `TUTORIAIS`).
6. **Gate:** `tsc --noEmit` · `npx vitest run lib/forja` · `npx next lint` · `node scripts/compose-check.mjs`.

## 6. Decisões tomadas (forks resolvidos)

- **Cursos de DOM/async/backend** (`app-de-clima`, `portfolio`, `encurtador-de-url`, `pomodoro`) **NÃO
  ganham "digita o código"**: o resultado é visual/rede, não um `assert` verificável — forçar seria o
  "teatro" que a gente matou. Ficam com a camada conceitual.
- **Cursos de biblioteca científica** (`pandas`, `astropy`, `biopython`, `rdkit`): adiados. `pandas`
  carrega no Pyodide; `astropy/biopython/rdkit` **não** são garantidos sem testar em prod. Só entram se
  alguém validar o pacote no runner do navegador primeiro.
- **O gerador dos cards somos nós** (não uma LLM provisionada em runtime): autorar + rodar + cortar. A box
  só serve pra escala de repos arbitrários (F2), que não é pré-requisito pros cursos conhecidos.

## 7. Pendências / próximos passos

- [ ] **Verificação visual em prod** do board novo (animação, azul, claro vs escuro, a trilha no SVG) e do
      fluxo do editor (Monaco/Pyodide + botão de publicar). Só dá pra confirmar num deploy rodando.
- [ ] **Reabrir `api-rest-crud`** pós-deploy pra confirmar que enche (o conteúdo está correto no código; um
      relato de "vazio" foi timing de deploy).
- [ ] **F2 em escala:** provisionar a geração de planos por LLM na box (ponte da Forja, como o `understand`).
- [ ] **F4 residual via Octa:** ligar o Octa pra montar os arquivos `residual` no background (a máquina
      `residualDoProjeto` já existe; falta a integração).
- [ ] **Cursos DOM/ciência:** se quiser cobri-los, desenhar um **card de outro tipo** (ex.: "monte o HTML e
      veja renderizar" para DOM; validar pacotes Pyodide para ciência) — não force o modelo atual.

## 8. Restrições do ambiente (não esqueça)

- **Runner do navegador** (`app/agentic-modules/codelab/useCodeRunner.ts`): só **Python (Pyodide, via CDN)**
  e **JavaScript (iframe)** executam. É o limite do que pode ser "digita e roda".
- **`.dockerignore`**: conteúdo fora de `.claude/skills` entra por `import` (bundle), não por `fs`.
- **CI** (`.github/workflows/ci.yml`): **pula PRs em rascunho** (draft) pra economizar minutos; roda ao
  marcar "Ready for review". Gate local = os mesmos passos (tsc, vitest, lint, compose) + build pesado no CI.
- **Deploy** (`.github/workflows/deploy.yml`): push na `main` dispara `up -d --build` — **merge quebrado
  quebra prod**. Sempre com CI verde (inclui `next build`).
- **Branch de desenvolvimento:** `claude/fable-overhaul-skills`. Após um PR mergear, reinicie a branch a
  partir da `main`.
