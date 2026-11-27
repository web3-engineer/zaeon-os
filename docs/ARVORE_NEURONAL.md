# Árvore Neuronal

A árvore de lições do curso desenhada como tecido neuronal. A raiz fica no centro. Cada aresta é um axônio afilado e preenchido, na "energia" (desafio de 1 a 5) do filho. O sinal nasce na raiz e desce em cascata. O progresso do aluno fica salvo por usuário e por curso.

## Onde está

| Peça | Arquivo |
|---|---|
| Componente único, orientado a dados | `components/knowledge-tree/ArvoreNeuronal.tsx` |
| Lógica pura (testável, sem DOM) | `lib/knowledge-tree/{tipos,rng,progresso,energia,cores,geometria,pulsos}.ts` |
| Curso da Forja → `NoArvore` | `lib/knowledge-tree/adaptadorCurso.ts` |
| Tela do curso (miolo da lição + prática + progresso) | `components/studio/CursoArvoreNeuronal.tsx` |
| Progresso no servidor | `app/api/studio/forja/progresso/route.ts` + `lib/knowledge-tree/progressoServidor.ts` |
| Progresso no cliente (reserva offline) | `lib/knowledge-tree/persistencia.ts` |
| Flag | `lib/knowledge-tree/flag.ts` (`ARVORE_NEURONAL`) |
| Prévia sem login (só em dev) | `/dev/arvore-neuronal?curso=<id>`, `?ua=1`, `?n=80` |
| E2E + desempenho | `scripts/e2e-arvore-neuronal.mjs` |

## Superfícies

**Muda:**
- **A tela do curso na Sala de Estudos.** O caminho é `StudyRoomContent` → `SalaCurso` → `CursoArvoreNeuronal`. Todo curso da vitrine com repositório passa por aqui, do catálogo curado e das skill-cursos (47 cursos, conferido por `scripts/arvore-cursos.mjs`). É uma tela só, então a mudança vale para todos os cursos.

**Não muda:**
- **O Cérebro / mapa probabilístico** (`components/cerebro/*`, `lib/map/*`). Ele tem convenção própria: amarelo = percurso até o objetivo, ciano = gavetas de memória. Isso não tem a semântica de "lição concluída", e misturar o azul/violeta da árvore com o amarelo/ciano dele confundiria as duas leituras.
- **A Árvore de Habilidades generativa** (`components/study/SkillTreePanel.tsx`, React Flow). Ela é um DAG com pré-requisitos e travas, não uma árvore. O "dominado" dela é maestria validada (limiar 0,8), que espelha rank e AURA e dispara credencial Solana. Um botão "concluir" em um clique furaria esse portão.
- **ForjaView** dentro de um documento (lista de módulos, não um mapa), **ClassesView** (não tem árvore), **CursoCodigoView** (sem uso), os ramos decorativos da sidebar do laboratório e a NaturezaAquario.
- **A marca ⟁ e o resto do layout** do laboratório não foram tocados.
- **`CursoArvoreView` (a árvore anterior)** continua inteira. É o fallback quando a flag está desligada e é o que as prévias `/dev/ua` e `/dev/curso` usam. A única mudança nela é que o miolo da lição foi extraído para `montarConteudoLicaoHtml`, com o mesmo HTML de antes. Os testes antigos passam sem alteração.

## Comportamento

- **Ordem das lições:** pré-ordem da árvore, raiz primeiro.
- **Botões da lição:** "‹ voltar à árvore", "concluir ✓" (marca a lição e volta) e "próxima lição ▸". A próxima marca a lição atual, abre só o caminho até a próxima pendente e recolhe o resto. Depois mostra a árvore por cerca de 1,3 s e abre a lição seguinte. Na raiz, o botão vira "começar a jornada ▸".
- **`proximaDe(r)`:** devolve a primeira lição pendente depois de `r`. Se não houver, a primeira pendente de todas (menos `r`). Com tudo concluído, devolve `null` e a tela mostra o aviso de árvore completa.
- **Painel de progresso:** contagem, porcentagem, barra azul e o botão "começar ▸" ou "continuar ▸". "Visão geral" expande todo nó com progresso e enquadra a câmera. "Reiniciar progresso" pede 2 cliques; o primeiro expira em 4 s. O painel some enquanto uma lição está aberta.
- **Energia:**
  - Folha com `grau` no grafo do motor: deriva do grau (log, normalizado pelo maior grau da árvore) mais a profundidade.
  - Folha sem grau: reserva pelo tipo da lição real. Sandbox = "no código" (4.2), desafio = "na prática" (3.2), prova = "relações" (2.4), só texto = "ideia" (1.2). Soma-se uma variação estável de ±0.4 por hash do id.
  - Nó com filhos: média dos filhos. Raiz = 3.
  - Sempre dentro de [1, 5], memoizada por índice e arredondada em 3 casas (servidor e navegador desenham igual).
- **Desenho:**
  - Axônio = polígono afilado preenchido (bézier cúbica, 26 amostras, ondulação senoidal leve), com núcleo claro e um brilho borrado.
  - Fibras: 1 se e < 2.5, 2 se e < 4, 3 acima disso. Colaterais = round(e·0.8), terminando em botão sináptico. O brilho crepita quando e ≥ 4.
  - Arborização terminal = 2+round(e/2) ramos. Dendritos = 3+round(e·0.8), dois deles com sub-ramo.
  - Não há `stroke-dasharray` em lugar nenhum, e um teste de regressão garante isso.
- **Cores:**
  - Pendente: violeta → magenta → rosa-branco.
  - Concluída: azul → ciano → quase branco.
  - Ambas interpoladas pela energia.
- **Raiz:** r=21, gradiente branco → dourado → rosa → violeta e brilho com batimento de 3,15 s. Sem anel, sem tracejado e sem rotação.
- **Pulsos:**
  - Bolha radial que corre por `animateMotion` e começa com `opacity 0`; um `<set>` acende no `begin`.
  - `begin = svg.getCurrentTime() + inicio + q·dur/n`.
  - `inicio(c) = 0` para os filhos da raiz; nos outros, `inicio(pai) + dur(pai)`.
  - `dur = 1.7 + (5 − e)·0.6` s.
  - Quantidade ≈ e: 100% nas concluídas e na próxima, 60% nas pendentes, metade com mais de 40 nós visíveis, metade de novo no celular.
- **Celular** (largura < 560 px): 1 fibra, sem colaterais e sem dendritos, menos pulsos, rótulo curto embaixo do nó e painel no rodapé.
- **`prefers-reduced-motion`:** sem pulsos, sem crepitar, sem batimento.
- **Acessibilidade:** nós com `role=button`, `tabIndex=0` e `aria-label` (título, estado, x/y dentro, desafio). Enter ou espaço abre a lição; Esc volta para a árvore. O foco vai ao título da lição e, na volta, ao nó.

## Persistência

- **Servidor (fonte da verdade):** a coleção `skill_progress` (model `SkillProgress`) já existente, com `topicSlug = "curso:<cursoId>"` e `status = "concluida"`. Não há coleção nova nem migração: o banco é Mongo via Prisma e o model já tem `@@unique(userId, topicSlug, nodeId)`.
  - Sem colisão com a skill-tree: `topicSlug()` dela nunca gera ":".
  - O espelho de rank/AURA conta só `status = "mastered"`, então lição de curso não infla rank nem dispara credencial.
- **Sem IDOR:** a rota usa sempre o usuário da sessão (`studioUid`) e ignora qualquer `userId` vindo do cliente. O `cursoId` tem que existir no catálogo (`resolverEsqueleto`). O progresso é pessoal; não há escopo de estudo compartilhado nesta tela.
- **Reserva offline:** `localStorage` com a chave `zaeon.arvore.v1:<userId>:<cursoId>`. Uma gravação que falhou fica `pendente` e vai inteira (op `definir`) na próxima vez que o servidor responder.

## Flag e rollback

- **`ARVORE_NEURONAL`** é uma variável de servidor, lida em tempo de execução, e vem **ligada por padrão**.
  - A rota `/api/studio/forja` devolve `arvoreNeuronal` e a `SalaCurso` escolhe o componente por esse campo.
  - Não é `NEXT_PUBLIC_*` de propósito: essas são embutidas no bundle no build, e desligar exigiria um build novo.
- **Rollback 1 (sem código novo):** ponha `ARVORE_NEURONAL=0` no `.env` da VPS (o web lê o `env_file` `.env` na criação) e rode de novo o último deploy com `gh run rerun <id do último run do deploy.yml>`. **Não** recrie o web à mão: o compose pega da shell do deploy o `NEXTAUTH_URL`, o `GIT_SHA` e ~25 flags, e um `docker compose up web` manual já derrubou o login. A tela volta para `CursoArvoreView`. O progresso salvo continua no banco e reaparece quando a flag for religada (tirar a linha ou pôr `1`, e rodar o deploy de novo).
  - Não foi preciso mexer no `deploy.yml`: sem a variável, a flag vem ligada. Assim o script do deploy, que já está perto do teto de tamanho do ssh-action, não cresceu.
- **Rollback 2:** `git revert -m 1 <merge commit>` no `main` e novo deploy pelo workflow.

## Testes

- `lib/knowledge-tree/arvore.test.ts`: rng, ordem, `proximaDe`, `frac`, visão geral, energia, cores, taper, geometria e pulsos.
- `lib/knowledge-tree/persistencia.test.ts`: localStorage por usuário+curso, sincronização pendente, servidor (A × B), flag e adaptador.
- `app/api/studio/forja/progresso/route.test.ts`: 401, curso inexistente, IDOR e ops.
- `components/knowledge-tree/ArvoreNeuronal.test.tsx`: fluxo, painel, reinício em 2 cliques, aviso de árvore completa, sem tracejado, raiz sem anel, teclado e reduced-motion.
- `components/knowledge-tree/ArvoreNeuronal.visual.test.tsx`: snapshots da raiz e de um axônio concluído × pendente.
- `components/studio/CursoArvoreNeuronal.test.tsx` e `components/study/SalaCurso.test.tsx`: integração e flag.
- `scripts/e2e-arvore-neuronal.mjs`: 2 cursos × desktop/celular e 80 nós a 60 fps.
