# APK + REA + memória de sucesso — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** provar uma análise Android real, guardar um sucesso verificável e recuperável e avaliar o caso via Overmind, mantendo transferência para outro APK como medição separada.

**Architecture:** REA/JADX produz Evidence integral; verificador determinístico compara ao gabarito independente; stores duráveis mantêm tentativas, recibos e lição. A L3 é projeção com outbox. Overmind recebe somente dataset sintético de avaliação e devolve recibos; o chat/Octa atual continua sendo a interface e a autoridade de permissões.

**Tech Stack:** Next14/React18/TypeScript, Prisma/Mongo, filas Octa/BullMQ existentes, Node22/JDK21/REA6.5.0 no motor, JADX headless MCP0.7.1 pinado, CLI Overmind Python isolado.

**Spec:** [HANDOFF_APK_REA_OVERMIND.md](../../HANDOFF_APK_REA_OVERMIND.md). Este handoff é a especificação de produto. O estado efetivamente entregue e as pendências estão em [APK_REA_SUCCESS_MEMORY.md](../../APK_REA_SUCCESS_MEMORY.md).

## Global Constraints

- Base revalidada: Zaeon `494840328fc680522d708fc43bcbcc60fcd7016a`; buscar e revisar main antes de editar. Nunca restaurar ou sobrescrever mudanças locais para fazer o plano caber.
- A pasta deste chat é parcial; levar documentação ao checkout completo atualizado e seguir o AGENTS aplicável.
- Manter coerência visual; reutilizar Octa/upload/blueprint, sem criar uma segunda IDE.
- REA6.5.0 e JDK21; fornecer `REA_JADX_MCP_JAR` explicitamente, conferir SHA-256 `6e5eacf500b64292bfb73c49797c1958f6ee44646e43e868039ae7feb573ff75`.
- Análise estática primeiro; não executar APK, script ReverseAPK, ADB, emulador ou fine-tuning.
- Gabarito separado do agente; nenhum pass=true vindo do modelo é autoridade.
- M1–M5 do handoff são marcos separados. Overmind ausente não equivale a M4 concluído.
- Novas superfícies com `REA_SUCCESS_MEMORY=1` no servidor e `NEXT_PUBLIC_REA_SUCCESS_MEMORY=1` na UI; os portões REA existentes continuam necessários. Exportação remota exige `REA_OVERMIND_EVAL=1`, configuração e orçamento de experimento.
- Credenciais reais só no executor/cofre; não em arquivos de prova exportados, CLI args, frontend ou contexto do modelo.
- Testes falsos e replay não são prova de execução real; registrar separadamente o tipo de cada run.

## Review Focus

1. Outro aluno ou sessão sem identidade verificada usa artifactId/proofId/lessonId: conferir dono/projeto no servidor em cada leitura/ação.
2. Evidência truncada, hash trocado, literal em outro método ou gabarito alterado: falha de verificação não pode virar memória de sucesso.
3. Reinício entre blob e metadados, entrega repetida e worker cancelado: nada de prova parcial publicada, promoção duplicada ou efeito tardio.
4. Embedding, Overmind ou credencial indisponíveis: preservar resultado local e mostrar o marco realmente alcançado.
5. Caso A volta em B, ou lição revogada continua em cache: sucesso histórico não autoriza resposta copiada nem supera estado/ACL atual.

## Estrutura e interfaces compartilhadas

Novos arquivos são propostas; confirmar inexistência e fundir com módulos equivalentes surgidos depois da base.

| Caminho | Responsabilidade |
|---|---|
| `lib/octa/android/types.ts` | Contratos comuns e estados |
| `lib/octa/android/policy.ts` | Objetivos, parâmetros, acesso e limites |
| `lib/octa/android/store.ts` | Artefatos/tentativas/recibos/lições/outbox via Prisma |
| `lib/octa/android/evidence.ts` | Persistência atômica e leitura de Evidence integral |
| `lib/octa/android/verifier.ts` | Normalização/checks independentes deste objetivo |
| `lib/octa/android/service.ts` | Pipeline usando fila/runId/lease existentes |
| `lib/agent/learning/rea-success.ts` | Promoção e recuperação do caso/procedimento |
| `lib/agent/learning/rea-dataset.ts` | Manifest e dataset sintético |
| `lib/agent/learning/adapters/overmind.ts` | Importação, roundtrip e avaliação real |
| `scripts/rea/{build-fixtures,qualify,prove,recall,evaluate}.mjs` | Qualificações/execuções reproduzíveis e saída legível por máquina |
| `tests/fixtures/rea-android/` | Fontes A/B, lock, gabaritos fora do contexto do agente |

Contratos completos mínimos em `types.ts`:

```ts
type Hash = string;
type Access = {
  userId: string; projectId: string; runId: string; leaseId: string;
  identityVerified: boolean;
};
type EvidenceRef = {
  id: string; sha256: Hash; bytes: number; locator: string;
  coverage: "complete" | "partial" | "unknown";
};
type Facts = {
  packageName: string; versionCode: number; activity: string;
  className: string; methodSignature: string; returnedLiteral: string;
  internetDeclared: boolean;
};
type Oracle = { fixtureId: "A" | "B"; artifactSha256: Hash; sourceHash: Hash; facts: Facts };
type Observation = {
  proofRunId: string; artifactSha256: Hash;
  engine: { rea: string; jadx: string; jarSha256: Hash };
  evidence: EvidenceRef[]; facts: Partial<Facts>;
  factSources: Partial<Record<keyof Facts, string[]>>;
  complete: boolean;
};
type Check = { id: string; pass: boolean; detail: string };
type RawAnalysisResult = {
  proofRunId: string; artifactSha256: Hash;
  engine: Observation["engine"]; evidence: EvidenceRef[];
  complete: boolean;
};
type Receipt = {
  id: string; proofRunId: string; inputHash: Hash; oracleHash: Hash;
  evidenceHashes: Hash[]; verifierVersion: string; checks: Check[];
  pass: boolean; createdAt: string;
};
type Lesson = {
  id: string; ownerId: string; projectId: string; proofRunIds: string[];
  receiptIds: string[]; artifactSha256: Hash; objective: string;
  procedure: string; limitations: string[];
  engineFingerprint: Hash; revision: number;
  state: "candidate" | "verified_project" | "retired";
};
type DatasetBundle = {
  id: string; version: string; manifestSha256: Hash;
  jsonlRef: string; rowHashes: Hash[]; proofRunIds: string[];
  purpose: "eval"; synthetic: true;
};
type CompletedExperimentReceipt = {
  backend: "overmind"; projectId: string; datasetId: string;
  datasetVersion: string; evaluationId: string;
  manifestSha256: Hash; returnedRowHashes: Hash[];
  status: "completed";
  resultRef: string;
};
type ExperimentOutcome = CompletedExperimentReceipt | {
  backend: "overmind"; status: "failed" | "pending";
  stage: "import" | "evaluation"; code: string;
  datasetId?: string;
};
type RecalledLesson = {
  lesson: Lesson; applicability: "valid" | "needs_revalidation";
};
```

Access é montado a partir da sessão/projeto/lease; o serviço reconfirma permissão e estado no banco. `identityVerified` do cliente ou do modelo não tem validade. A allowlist de fontes de fatos e o tipo Oracle ficam no runner/verificador, fora das tools oferecidas ao modelo.

## Task 1: qualificar motor e congelar fixtures

**Files:** modificar `infra/rea-engine/Dockerfile`; criar scripts build-fixtures/qualify, fontes/locks A/B e `infra/rea-engine/android-capabilities.test.mjs`; atualizar vetting/NOTICE.

**Consumes:** REA6.5.0 e contrato A/B do handoff.
**Produces:** APKs e oracles efetivos selados; resultado de qualificação com versões/digests/precondições.

- [ ] Escrever teste que exige JAR presente, checksum correto, JDK compiler e `ps`; ausência dá diagnóstico explícito e não pass.
- [ ] Rodar `node --test infra/rea-engine/android-capabilities.test.mjs`; confirmar falha antes do fornecimento das precondições.
- [ ] Incluir JAR/checksum/JDK/procps com origem e pinagem, sem download oportunista durante análise.
- [ ] Implementar `build-fixtures.mjs`: construir A/B fora do motor, calcular lock/gabarito antes do agente e separar os arquivos que entram no seu contexto.
- [ ] Executar build da imagem e `node scripts/rea/qualify.mjs`; saída deve distinguir disponibilidade de engine de prova de objetivo.
- [ ] Commit da qualificação/fixtures. Não comitar segredos, caches, ferramentas baixadas ou binários grandes; registrar fontes e armazenamento de fixtures.

## Task 2: evidência integral e recibos duráveis

**Files:** criar types/store/evidence; alterar Prisma schema, bridge/client e integrar trace no runner real; testes store/evidence.

**Consumes:** Observation e Evidence bruta recebida do engine.
**Produces:** `saveEvidence(access: Access, raw: Uint8Array): Promise<EvidenceRef>` e stores Prisma de ReaArtifact/ReaProofRun/ReaVerificationReceipt/ReaSuccessLesson/ReaLearningOutbox.

- [ ] Escrever testes para restart, blob incompleto, checksum inválido, callbacks com lease antiga, duplicação de evento e acesso cruzado.
- [ ] Rodar `npx vitest run lib/octa/android/evidence.test.ts lib/octa/android/store.test.ts` antes de implementar.
- [ ] Tipos de integração e métodos do store entram primeiro, usando outputs falsos rotulados para os testes de persistência; conectar ao motor real na Task 3.
- [ ] Salvar raw Evidence antes de resumir; blobs fora do documento Mongo, metadados com hash/tamanho e dono/projeto. Publicação atômica e CAS para estado `evidence_ready`.
- [ ] Cada tentativa usa runId único; receipt único por `(proofRunId, verifierVersion, oracleHash)`; lição única por `(ownerId, projectId, artifactSha256, objectiveHash, engineFingerprint, verifierVersion)`; outbox única por `(lessonId, lessonRevision, destination)`. Todos os métodos de leitura recebem Access e conferem projeto/dono.
- [ ] Dados de fixture sintética e recibos duram até exclusão explícita do piloto. APK de usuário permanece temporário (TTL 2 h já existente); expirou o binário, não prometer reexecução sem novo upload do mesmo hash.
- [ ] Para outros uploads, aplicar retenção explicitada no recurso; prova removida/expirada fica inelegível a sucesso ativo. Metadado não simula disponibilidade do blob.
- [ ] Testar novo processo lendo do banco/storage de integração; MemoryTraceStore não satisfaz persistência de produção.
- [ ] Commit da persistência e schema aditivo.

## Task 3: acesso, artefatos e execução Android tipada

**Files:** criar policy/service, alterar upload, `lib/octa/rea.ts`, `lib/octa/agente.ts`, `infra/rea-engine/bridge.mjs`; testes policy/rea e bridge.

**Consumes:** Access, fixture lock e catálogo pinado.
**Produces:** `analyzeAndroid(access: Access, artifactId: string): Promise<RawAnalysisResult>` e artifactId vinculado ao projeto. Facts só serão produzidos pela normalização independente da Task 4.

- [ ] Escrever testes: aluno B não usa artefato A; identidade não verificada falha; parâmetros/path livre não entram no comando; modo review não altera projeto.
- [ ] Rodar `npx vitest run lib/octa/android/policy.test.ts lib/octa/rea.test.ts`; observar os novos testes falharem.
- [ ] Substituir, para a capacidade nova, raw handle + argumentos livres por artifactId validado e objetivos tipados. Liberar somente comandos Android necessários e seus parâmetros conhecidos; referências estáticas não habilitam runtime tracing.
- [ ] Preservar fluxo legado com flag off. Com a flag on, resolver projeto e dono antes do upload/uso; credencial interna não substitui ACL.
- [ ] Piloto: concorrência 1 e teto binário 64 MiB para esta capacidade. Limite JSON base64 = `4 * ceil(binaryMax/3) + 65536`; alinhar proxy/Next/bridge e limitar metadados. Tempo de worker 10 min, cliente 12 min, respeitando cancelamento da lease.
- [ ] Rodar testes e `node --test infra/rea-engine/android-capabilities.test.mjs`; confirmar filhos cancelados/isolados e sem herança das chaves do app.
- [ ] Commit da fronteira de análise.

## Task 4: verificador independente e primeira prova real

**Files:** criar verifier e testes; script prove; adaptar eval sem alterar o gabarito para satisfazer o modelo.

**Consumes:** Oracle congelado e Observation integral de cada tentativa.
**Produces:** `verifyProof(oracle: Oracle, actual: Observation): Receipt`.

- [ ] Testes mínimos:
```ts
expect(verifyProof(oracleA, observationWithWrongApkHash).pass).toBe(false);
expect(verifyProof(oracleA, observationWithPartialEvidence).pass).toBe(false);
expect(verifyProof(oracleA, observationWithLiteralInAnotherMethod).pass).toBe(false);
expect(verifyProof(oracleA, completeMatchingObservation).pass).toBe(true);
```
- [ ] Rodar `npx vitest run lib/octa/android/verifier.test.ts`, incluindo fontes inexistentes, INTERNET divergente e hash do oracle alterado.
- [ ] Implementar `normalizeEvidence(raw: Uint8Array, refs: EvidenceRef[]): Observation` a partir de campos/trechos documentados do provedor; somente o serviço interno chama o verificador após reler blobs e conferir seus hashes. Não aceitar Facts ou verdict produzidos pelo cliente/modelo; não usar um LLM para preencher o que faltou. Cada fato recebe factSources.
- [ ] Reutilizar checks existentes de fonte/tool-truth; acrescentar validação de objetivo e integridade. Comparar fatos normalizados entre runs, mantendo prosa fora do critério de repetibilidade.
- [ ] Executar `node scripts/rea/prove.mjs --fixture A --fresh-runs 2`; dois runs reais, recibos distintos, mesma conclusão limitada e versões/digests conferidos. Falha parcial é resultado real a reportar, não fixture a reescrever.
- [ ] Commit do verificador/runner; guardar os recibos efetivos no pacote de entrega, não em snapshots falsificados.

## Task 5: promover e recuperar memória de sucesso

**Files:** criar `lib/agent/learning/rea-success.ts` e teste, outbox no store; integrar leitura no contexto/tools Octa e projeção L3 via MemoryAPI.

**Consumes:** recibos duráveis e repetição real aprovada.
**Produces:** `promoteSuccess(access: Access, proofRunIds: string[]): Promise<Lesson>`; `recallSuccess(access: Access, query: string): Promise<RecalledLesson[]>`.

- [ ] Testes de promoção sem recibo, pass falso do modelo, proofs de outro projeto e receipt duplicado devem falhar/não elevar suporte.
- [ ] Testar que falha de embedding não perde lição nem prova e cria retry de projeção; entregue duas vezes não duplica memória.
- [ ] Implementar promoção com CAS/unicidade; episódio e procedimento com referências, limites, versão e escopo `verified_project`. Texto gerado é proposta, não fonte de autoridade.
- [ ] Recuperação consulta store canônico e revalida ACL/estado/engine; L3 ajuda a localizar, mas não tem poder de reabilitar lição retirada.
- [ ] Executar `node scripts/rea/recall.mjs --fixture A --new-session`: novo processo/sessão sem history do cliente encontra lição e recibos; engine alterado devolve needs_revalidation, não sucesso corrente.
- [ ] Testar `retired` com cache já preenchido; a recuperação seguinte deve excluir o registro válido e preservar histórico auditável conforme política.
- [ ] Commit da memória e outbox.

## Task 6: Overmind real por dataset e avaliação

**Files:** criar rea-dataset, adapters/overmind e testes; script evaluate; template de configuração sem credenciais.

**Consumes:** lições/recibos sintéticos elegíveis e DatasetBundle.
**Produces:** `exportReaEval(access: Access, proofRunIds: string[]): Promise<DatasetBundle>`; `evaluateOvermind(bundle: DatasetBundle): Promise<ExperimentOutcome>`.

- [ ] Testar eligibility, redaction, request-key estável, remoção/revogação antes do envio, linhas faltantes e importação que modifica dados.
- [ ] Rodar testes mock; seus resultados ficam explicitamente `mock` e não satisfazem M4.
- [ ] Implementar processo Python separado/API contratada; usar CLI pinado e conferir `overmind dataset upload --help`, `dataset export --help` e contrato de avaliação antes de invocar. Não inventar endpoint.
- [ ] O código fonte examinado oferece `dataset upload`, `--intent eval`, `--request-key`, `--wait` e export JSONL. Fixar SDK/CLI e schema reais; tokens só por ambiente privado do filho/cofre, sem argumento de processo.
- [ ] Dataset contém campos observados, resposta e referência de prova; gabarito vai só ao lado avaliador. Reimportar/exportar com comparação de hashes normalizados e rowCount.
- [ ] Avaliação real precisa consumir exatamente o dataset congelado e emitir evaluationId/versão/receipt. Precomputed pass armazenado como coluna não conta como avaliação remota.
- [ ] Rodar `node scripts/rea/evaluate.mjs --backend overmind --fixture A` em ambiente com config e budget. Sem config, código de saída não zero e estado pending; com config, IDs reais e recibo completo.
- [ ] Commit do adapter/contratos. Não self-hostar toda a plataforma por padrão e não iniciar treinamento.

## Task 7: transferência com fixture B e controles

**Files:** script evaluate, fixtures de negativas e testes de learning/eval.

**Consumes:** procedimento de A, Oracle B oculto e dois modos de contexto.
**Produces:** relatório comparável `without_memory` / `with_verified_procedure`.

- [ ] Congelar B e prompts antes de medir; não incluir B em ajuste/treino/otimização a partir de A.
- [ ] Executar mesma tarefa/engine/budget com e sem procedimento; separar memória do procedimento da evidência observada em B.
- [ ] Teste obrigatório: memória de A diz ausência de INTERNET; a prova real em B deve declarar presença. Copiar A precisa reprovar.
- [ ] Adicionar APK inválido, engine indisponível, evidência adulterada e permissão negada. Esses resultados permanecem falhas/recusas; não viram sucessos “recuperados”.
- [ ] Rodar `node scripts/rea/evaluate.mjs --fixture B --compare-memory`; relatório registra todos os resultados, latência/custo e limites amostrais, sem alegar ganho estatístico com duas fixtures.
- [ ] Commit de casos e relatório reproduzível.

## Task 8: integração no chat e entrega revisável

**Files:** alterar `components/octa/OctaIDE.tsx`, tool catalog e `lib/rea-blueprint/{tipos,server}.ts`; criar handlers `app/api/octa/rea/proofs/route.ts` e `[id]/route.ts`, teste de API/visual. Reusar viewer atual do blueprint.

**Consumes:** estado real do proofRun/lesson/experiment.
**Produces:** painel do caso com referências de prova e marcos M1–M5.

- [ ] Testar endpoints com sessão ausente, identidade não verificada, projeto de outro aluno e receipt manipulado; GET sem acesso usa resposta não enumerável consistente com a aplicação.
- [ ] POST só agenda objetivo tipado; não aceita verdict/pass/oracle customizado. Verificação roda no worker privado; o navegador nunca “aprova prova”.
- [ ] Mostrar análise, verificação, memória registrada e estado Overmind; abrir checks/fontes/limites. Badge calculado pelo servidor, sem depender de texto livre.
- [ ] Preservar foco, teclado, mobile e estilos Octa/REA. Flag off não quebra análise/blueprints existentes.
- [ ] Executar testes focados de todos os módulos, `npm run typecheck`, checks exigidos pelo repo e prova de integração no ambiente alvo. Distinguir testes unitários, mock, replay, análise real e avaliação real no relatório.
- [ ] Entregar PR/diff + comandos + hashes/runIds/receiptIds/lessonIds/datasetId/evaluationId reais + estado de cada marco. Registar o que não foi executado sem inventar resultados.

## Conclusão operacional e rollback

A implementação só satisfaz o conjunto quando os marcos e provas definidos no handoff estiverem presentes. Ausência de configuração Overmind é bloqueio apenas do marco remoto; continuar trabalho local útil e reportar o estado exato.

Rollback: desligar flags de UI/servidor, suspender novos exports e cancelar leases pendentes, preservar provas/recibos; retirar projeções de memória por referência, sem apagar o histórico como se nunca tivesse ocorrido. Exclusão solicitada segue a retenção/ACL e invalida uso futuro.

O executor deve levar o handoff e este plano ao checkout completo, implementar em desenvolvimento e devolver uma entrega revisável. Deploy, treinar pesos, publicar dados ou habilitar contas reais não são marcos implícitos deste documento.

