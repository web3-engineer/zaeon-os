# RAG por turma e por aluno, dentro do chat — design

**Data:** 2026-10-21 · **Dono:** Martinez · **Status:** aprovado pelo dono em 2026-10-21 (revisado após a leitura de um revisor independente)

## 1. Intenção

Professores e alunos alimentam a Zaeon com PDFs **pelo próprio chat**, e a Aura passa a responder
**com base neles, citando documento e página**. Hoje a Sala de Pesquisa não lê documento nenhum de
verdade: o chat usa só título + resumo de artigos, o PDF anexado vai inteiro pro Gemini a cada
conversa (ou num cache de 45 min) e nada é buscado por significado (mapeamento de 2026-10-21).

O chat passa boa parte do tempo **processando e criando documentos** (trabalhos, resumos, provas,
ABNT). O RAG tem que alimentar tanto as respostas quanto essa escrita.

## 2. Metas

1. **Professor** sobe 1 ou mais PDFs no chat e escolhe a **turma** de destino (ou "só pra mim").
   Todos os alunos da turma passam a ter respostas baseadas nesse material.
2. **Aluno** sobe 1 ou mais PDFs no chat; eles vão **só para a base dele**.
3. **Admin** tem uma aba **Base de conhecimento** no dashboard: lista por turma, status, subir e remover.
   **Professor** vê e remove os documentos das turmas dele; **aluno** vê e remove os da base pessoal —
   numa lista **"Minha base"** dentro do próprio chat (decisão do dono).
4. Ao perguntar, a Aura busca nas **turmas da pessoa + na base pessoal dela**, responde com os melhores
   trechos e **cita "Documento, p. N"**. Sem trecho relevante → responde como hoje, **sem inventar citação**.
5. Quando o chat **cria um documento**, em **qualquer sala**, a mesma busca alimenta a escrita, e o
   documento entra na **base pessoal** de quem pediu **no momento em que passa a existir** — não quando a
   pessoa salva ou exporta (decisão do dono).
6. O documento fica **buscável em segundos** depois do upload.

## 3. Não-metas

- PDFs da **biblioteca do navegador** (IndexedDB) indexados automaticamente — só entra o que a pessoa
  sobe pelo chat/admin (fase futura).
- Reordenar trechos com reranker no CPU (medido: ~10 s pra 10 trechos — inviável com o aluno esperando).
- Claude: a cota no Vertex não saiu (decisão do dono: seguir só com Google + modelos próprios).
- OCR de PDF escaneado (o leitor atual não faz; PDF sem texto vira erro claro na tela).
- Formatos além de PDF (Word, slides, imagens) — fase futura.

## 4. Anti-metas (falhou mesmo "funcionando")

- **Um aluno ver material de outra turma ou a base pessoal de outro aluno.** Permissão é requisito, não detalhe.
- Citação inventada: página/documento que não veio da busca.
- O chat ficar mais lento pra quem **não** tem nenhum documento na base.
- Indexação travar o `web` (o PDF é processado fora da requisição do chat).
- Material de aluno passar pelo **plano grátis** do AI Studio (que treina com o conteúdo) — tudo vai pelo
  **Vertex pago** (projeto do app, não treina).

## 5. Restrições e fatos medidos (2026-10-20/21)

- **Embedder: Google `gemini-embedding-001` no Vertex** (decisão do dono). 32 páginas em ~2 s, pelo gateway
  da VPS. Os vetores de um modelo não conversam com os de outro: **a base nasce com um embedder só**.
  Dimensão: **1024** (`output_dimensionality`; testado).
- **Banco:** MongoDB Atlas, **8.0**, com Atlas Search ativo; **`$rankFusion` funciona** (testado). `$search`
  textual respondeu em ~100 ms.
- **Leitor de PDF:** `pdf-loader` da VPS (opendataloader-pdf, modo FAST) já devolve `{ markdown,
  paragraphs[], blocks[] }`, com **tipo de bloco** (título/parágrafo/tabela/lista) e **página** em cada
  bloco. Teto de **25 MB** por arquivo.
- **Filas:** BullMQ funciona no `web` desde o #474 (instrumentation sempre compilado).
- **Gerador:** gemini-3.5-flash (texto, `global`); documentos longos podem usar gemini-2.5-pro.
- **Código pronto a reaproveitar:** `lib/agent/memory.ts` (pipelines `$vectorSearch` / `$search` /
  `$rankFusion` com filtro, nunca ligado), `lib/agent/memory-provider.ts` (embed `gemini-embedding-001`),
  `scripts/atlas-memory-indexes.mongo.js` (molde dos índices, rodado no Atlas pelo dono).
- **Papéis:** `User.role` ∈ {teacher, professor} = professor (`lib/aulas/roles.ts`); `Turma.professorId`;
  aluno ↔ turma por `TurmaMember`.

## 6. Como funciona (decidido)

### 6.1 Entrada (chat e admin)

- O 📎 do chat (`components/chat/useAnexoChat.tsx`, hoje 1 PDF) passa a aceitar **vários PDFs de uma vez**.
- **Professor** (role teacher/professor): ao anexar, aparece **"Pra qual turma?"** com as turmas dele
  (`Turma.professorId`) + "só pra mim". **Aluno:** vai direto pra base pessoal, sem pergunta.
- A Aura confirma no chat por documento: *"Guardei **Apostila 3** na base de **Cálculo I** — 42 páginas,
  já dá pra perguntar."* Erros também por documento (sem texto, grande demais, falhou a leitura).
- **Conversa atual** (decisão minha): com **vários PDFs**, a resposta daquele turno já vem da base,
  priorizando os documentos recém-enviados (os trechos ficam buscáveis por palavra-chave em segundos).
  **Um PDF pequeno sozinho** continua indo inteiro pro Gemini, como hoje.
- **PDF da biblioteca** do navegador posto no chat (▶ / arrastar / `EVT_ANEXAR`) **conta como envio** e
  entra na base pessoal (decisão minha: "anexou no chat → entra na base"; o mesmo arquivo não conta duas
  vezes, pelo hash).
- O chat do **professor na área do professor** (`app/workstation/teacher/AgenticAreaContent.tsx`) ganha o
  mesmo 📎 com "pra qual turma?" (decisão minha).
- **Admin → Base de conhecimento:** escolhe a turma, sobe PDFs, vê status (pronto / indexando / erro)
  e remove. Mesma rota de ingestão do chat. (O Admin hoje é só do dono — `assertAdmin`.)
- **"Minha base" no chat:** professor lista/remove documentos das turmas dele (por turma); aluno
  lista/remove os da base pessoal. **Remover de uma turma tira só aquela permissão**; o documento só
  some de vez quando nenhuma permissão sobra.

### 6.2 Ingestão (fora da requisição do chat)

1. Recebe o PDF → **hash SHA-256 do arquivo**. Se já existe documento com o mesmo hash, **não reprocessa**:
   só acrescenta a nova permissão (turma ou dono) ao documento existente.
2. `pdf-loader` → `markdown` + `blocks[]` (tipo + página).
3. **Corte por estrutura:** trechos de até ~1 página de texto, **fechando em títulos**; **tabela nunca é
   partida**; cada trecho guarda a **página inicial e final** e o **caminho de títulos**
   ("Apostila 3 › Cap. 2 › Derivadas"), que vai no começo do texto do trecho.
4. Trechos gravados **na hora** → já buscáveis por palavra-chave (`$search`).
5. Fila `rag-index` (BullMQ): gera os vetores em lote (`gemini-embedding-001`, 1024) e grava no trecho.
   **Embeddings chamam o Vertex direto do app** (como o chat; `lib/agent/memory-provider.ts`), **não** pelo
   gateway. O grupo `zaeon-local-embed` (Qwen3, também 1024) é **proibido** pra esta base: misturaria vetores
   incompatíveis sem erro nenhum (decisão minha).
   Documento passa a **pronto** quando todos os trechos têm vetor.
6. O **Markdown completo** do documento é guardado (re-cortar sem reler o PDF; documento pequeno pode ser
   lido inteiro). O **PDF original não é guardado.**

### 6.3 Dados (MongoDB)

- `rag_documentos`: título, nome do arquivo, hash, páginas, markdown, status, erro, quem subiu, quando,
  **permissões** (`turmaIds[]`, `donoIds[]`), origem (chat/admin/gerado-pelo-chat).
- `rag_trechos`: documento, texto (com o caminho de títulos), páginas, ordem, **cópia das permissões**
  (`turmaIds[]`, `donoIds[]` — pra filtrar dentro da busca), `embedding[1024]` (ausente até a fila rodar).
- Índices no Atlas (script versionado, rodado pelo dono como o de memória): **vetorial** em `embedding`
  (cosine, 1024, campos de filtro `turmaIds` e `donoIds`) e **textual** em `texto` (com os mesmos filtros).
- Mudou permissão de um documento → atualiza os trechos dele.

### 6.4 Busca (na hora da pergunta)

1. Se a pessoa **não tem nada na base** (nenhuma turma com documento, nada pessoal) → **pula tudo**
   (anti-meta: não deixar mais lento quem não usa).
2. Vetor da pergunta (`gemini-embedding-001`) com prazo curto. Falhou/estourou → segue só por palavra-chave.
3. **`$rankFusion`**: `$vectorSearch` + `$search`, **ambos com o filtro**
   `turmaIds ∈ turmas da pessoa OU donoIds ∋ pessoa`. Trechos ainda sem vetor entram pela palavra-chave.
4. Top **~8 trechos** vão pro gerador como bloco delimitado (dado, não instrução), cada um com
   documento + páginas. **Sem reranker** no caminho.
5. Abaixo de um corte de relevância → nenhum trecho entra (a Aura responde como hoje).

### 6.5 Resposta e criação de documento

- **Resposta no chat:** gemini-3.5-flash recebe os trechos e a instrução de citar **"Documento, p. N"** só a
  partir dos trechos recebidos. A interface mostra as fontes citadas.
- **Criar documento** (trabalho, resumo, prova): a mesma busca, com mais trechos, alimenta a escrita.
- **Entra na base quando passa a existir** (decisão do dono), em qualquer sala: gerador de tarefa/prova
  (`app/api/ai/generate-document`), rascunho de trabalho (`research-draft`), exportação ABNT, artefatos do
  Studio, documentos do chat. Vai pra **base pessoal** de quem pediu (origem "gerado-pelo-chat").
  **Revisão do mesmo documento substitui** a versão indexada (re-indexa), não cria outra.
- **Prova/tarefa com gabarito nunca entra em base de turma** — só na pessoal de quem criou (o professor).

### 6.6 Onde funciona

Todas as superfícies de chat da Aura **para usuário logado** (Sala de Pesquisa e Sala de Estudos).
Anônimo: sem base.

## 7. Limites (escolhas minhas — ajustáveis)

- 25 MB por PDF (teto do leitor atual); até **10 PDFs por envio**.
- Base pessoal: até **50 documentos enviados**; no limite, **recusa e avisa** (nada é apagado sozinho).
- **Documentos gerados pelo chat têm teto próprio** (decisão minha, pra não travar envios: entram
  automaticamente): até **200**; acima disso, o **mais antigo gerado sai da base** (só o índice — o documento
  continua existindo no app).
- Base de turma: sem limite inicial.
- Remover documento apaga trechos e vetores; o hash some quando nenhuma permissão sobra.

## 8. Fases (um PR por fase)

- **F1 — Ingestão + Admin:** coleções, índices (script), `pdf-loader` → corte por estrutura → trechos →
  fila de vetores; aba Base de conhecimento no Admin; rota de busca interna. Já testável pelo Admin.
- **F2 — Chat usa a base:** busca híbrida com permissão no turno da Aura; citações na resposta e na tela.
- **F3 — Chat alimenta a base:** 📎 com vários PDFs (Salas de Pesquisa e Estudos + chat do professor),
  "pra qual turma?" do professor, base pessoal do aluno, PDF da biblioteca conta como envio, confirmação por
  documento, lista **"Minha base"** (ver/remover por papel).
- **F4 — Documentos criados pelo chat:** busca alimenta a escrita; todo documento criado entra na base
  pessoal quando passa a existir; revisão substitui; gabarito nunca em base de turma; teto com saída do mais antigo.

## 9. Fica com quem constrói

- Tamanho exato dos trechos, corte de relevância, número de trechos (medir com material real).
- Formato visual das fontes na tela (seguir o padrão de citação que a sala já usa).
- Pesos do `$rankFusion` e prazos de cada chamada.
- Como a rota de ingestão autentica professor/aluno/admin (seguir `assertAdmin` e os gates de turma existentes).
- Testes: permissões (aluno A não vê base de B nem de turma alheia) são **obrigatórios** e vêm primeiro.

## 10. Revisão 2026-10-21 — banco do RAG sai do Atlas e vai pro Postgres da Contabo (decisão do dono)

Na ida pra produção (F1), o Atlas recusou os índices de busca: **o plano do cluster tem limite de índices de busca**, e as vagas estão com os 2 índices da memória da Aura (MemPalace nativo — construída, nunca ligada: `configureMemory()` não é chamado; coleção vazia). Em vez de apagar a memória da Aura ou pagar plano maior, **os trechos, vetores e permissões do RAG passam pro Postgres 16 + pgvector 0.8.7 que já roda na Contabo** (`zaeon_pgvector`, a <1 ms da VPS — mesmo datacenter). Sem limite de índices; a memória da Aura pode morar lá depois. **Atlas continua com todo o resto** (usuários, turmas, conversas).

- **Muda:** armazenamento (`rag_documentos`, `rag_trechos` viram tabelas SQL) e busca (uma consulta só: vetor HNSW cosine + texto `tsvector` português, fundidos por RRF na própria SQL). A permissão é condição `WHERE` nos dois ramos. Adicionar/remover turma é **atômico** (`array_append`/`array_remove`) — resolve a corrida de permissões que estava anotada pra antes da F3.
- **Não muda:** leitor de PDF, corte por estrutura, embedding `gemini-embedding-001` (Vertex), fila `rag-index`, aba do Admin, regras de permissão e limites.
- **Rede:** Postgres só na tailnet (porta 5432 via `tailscale serve`), papel próprio `rag_app` com permissão só nas tabelas do RAG.
- **Backup:** dump diário pro servidor de storage (kvm4000, InterServer/EUA) — obrigatório, porque passa a ter dado de aluno. Depende de acesso SSH a ele.
- As coleções Mongo `rag_documentos`/`rag_trechos` (vazias) e o script dos índices do Atlas saem.
