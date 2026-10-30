# APK + REA + memória de sucesso — piloto

Esta implementação acrescenta um objetivo estático verificável ao Octa: identificar pacote, versão, única activity, classe/método `marker`, literal retornado e declaração de INTERNET. Não é um analisador universal de APKs. O REA legado continua disponível no seu fluxo anterior. ReverseAPK não foi instalado nem executado; APKs, ADB e emuladores não são executados pelo novo fluxo.

## Autoridade e persistência

O navegador agenda apenas `android-marker-v1` com um artifactId. O servidor resolve identidade e projeto, guarda o handle internamente, descobre a classe no APK, executa três comandos tipados e persiste a Evidence integral antes de normalizar. O verificador compara fatos e fontes ao oracle selado, fora do contexto do modelo. Só APK com hash exatamente registrado no diretório privado de fixtures pode obter recibo verificado; qualquer outro permanece observado/sem gabarito ou falha no objetivo.

Dois proofRuns compatíveis, com recibos distintos e blobs íntegros, permitem promover um procedimento. A chave única inclui dono, projeto, APK, objetivo, engine e verificador. Replay não duplica a lição nem a outbox e não reativa uma lição retirada. A recuperação relê provas, checa ACL/estado e distingue engine atual de `needs_revalidation`. Um processo novo pode recuperar o caso sem histórico do cliente.

Mongo mantém artefatos, tentativas, recibos, lições e outbox. Evidence fica em volume persistente privado, com publicação atômica, hash e tamanho. Web e worker precisam montar **o mesmo volume** em `REA_EVIDENCE_DIR`. Não usar disco efêmero de uma função serverless. A perda do blob invalida o sucesso recuperável; metadados não substituem evidência.

Uploads de usuário no motor expiram em duas horas; é necessário novo upload para reexecutar. Evidências/recibos permanecem no volume e no projeto para auditoria do piloto; retirar uma lição impede uso futuro, sem apagar seu histórico. Limpeza/exclusão operacional do piloto deve remover os blobs e registros correspondentes. Não há promessa de reexecução após expiração do binário.

L3 é uma projeção opcional, com retry pela outbox. Usa `MemoryAPI` sobre a coleção separada `rea_success_drawers`, com `_id` determinístico, para resistir a crash entre escrita e ack. Essas projeções não aparecem na memória genérica de sessões antigas. A recuperação canônica funciona sem embedding/Atlas e nunca depende da projeção para autorizar uma lição. Índices vetorial/textual dessa coleção são opcionais no piloto; sua ausência não elimina o caso canônico.

## Habilitação controlada

Flags continuam desligadas por padrão. O deployment não faz parte desta PR. Schema aditivo: gerar o Prisma e aplicar `prisma db push` ao Mongo de desenvolvimento/ambiente alvo antes de habilitar.

```dotenv
OCTA_REA=1
REA_SUCCESS_MEMORY=1
NEXT_PUBLIC_OCTA_REA=1
NEXT_PUBLIC_REA_SUCCESS_MEMORY=1
REA_BRIDGE_URL=http://ENGINE_PRIVADO:8799
REA_BRIDGE_TOKEN=SECRET_IN_SERVER_VAULT
REA_EVIDENCE_DIR=/persistent/rea-evidence
REA_FIXTURE_REGISTRY=/private/rea-fixtures
REDIS_URL=redis://PRIVATE_REDIS:6379
REA_WORKER=1
# Projeção opcional (falha não perde a lição canônica):
MEMORY_L3=1
```

As flags `NEXT_PUBLIC_*` são de build. O worker BullMQ usa concorrência global 1, timeout de 10 min, lease/CAS, cancelamento propagado ao grupo de processos e reaper de tentativas abandonadas. Não há fallback silencioso para executar um job em um servidor sem fila. Limite APK: 64 MiB; ingress para bridge deve aceitar o envelope base64 (`4 * ceil(64 MiB / 3) + 65536`). O upload web novo usa binário limitado por streaming, sem confiar só em Content-Length.

**Identidade:** as novas rotas exigem claim de login Google verificado, estabelecido no callback JWT do servidor; e-mail sem senha não o obtém. Sessões anteriores precisam novo login. OAuth passa a exigir PKCE/state. Turnos com capacidade de recuperar memória REA guardam essa garantia, e seu histórico/eventos/retomada não são entregues a uma sessão sem essa identidade. A autorização do projeto é reconfirmada no servidor. O campo `identityVerified` enviado por cliente/modelo não tem autoridade. O login legado por e-mail continua uma limitação de segurança do produto; não habilitar este piloto para contas reais sem revisar os demais caminhos legados de acesso a dados.

O painel usa a paleta e a coluna do chat do Octa, separado em análise, verificação, memória e Overmind. Os badges vêm do servidor. A tool somente de leitura `octa_rea_success` recebe callback fechado ao dono/projeto do turno e devolve procedimento, recibos referenciados e limites; não aceita comandos, verdict ou oracle do modelo.

## Reprodução local

Requer Android SDK platform 35/build-tools 35.0.0 para construir as fixtures originais, um Mongo replica set de teste, volume local persistente e REA/JADX qualificado. O build sela A e B antes da análise e não passa o oracle para descoberta de classe.

```sh
ANDROID_HOME=/path/to/android-sdk node scripts/rea/build-fixtures.mjs --output .superpowers/rea-fixtures
docker build --platform linux/amd64 -t zaeon-rea-proof:dev infra/rea-engine
node --test infra/rea-engine/android-capabilities.test.mjs infra/rea-engine/android-request.test.mjs
# No ambiente do motor: REA_JADX_MCP_JAR=/opt/rea-android/jadx.jar
node scripts/rea/qualify.mjs
```

Definir em ambiente privado `OCTA_REA`, `REA_BRIDGE_URL/TOKEN`, `REA_TEST_DATABASE_URL` e `REA_EVIDENCE_DIR`. Os scripts de prova usam explicitamente o banco de teste, nunca escolhem o banco do produto por fallback.

```sh
node scripts/rea/prove.mjs --fixture A --fresh-runs 2
node scripts/rea/recall.mjs --fixture A --promote
node scripts/rea/recall.mjs --fixture A --new-session
node scripts/rea/evaluate.mjs --fixture B --compare-memory
node scripts/rea/evaluate.mjs --backend overmind --fixture A
```

Resultados privados ficam em `.superpowers/rea-results`, fora do Git. O relatório versionado em `docs/rea-proof/qualification.json` contém apenas hashes/IDs/recibos sintéticos e resultados sanitizados; não contém tokens, handles, locators ou caminhos do host. Builds de APK com timestamp ZIP diferente podem mudar o digest: cada reprodução deve selar e verificar seu próprio artefato; o hash do APK não é prometido como reproduzível byte a byte entre ambientes.

## Overmind: importação não equivale a avaliação

Adapter para SDK/CLI MIT pinado no commit `16db2447dcf1fa96e29251cfe6c6cd63c4a72132` (0.1.112), em processo Python isolado. Nenhum código do servidor AGPL é vendorizado. Contratos examinados: `overmind/dataset_cmd.py`, `overbae/api/dataset_serializers.py`, `eval_views.py` e `eval_serializers.py` nesse commit.

O export só aceita provas sintéticas de A que ainda sustentem lição ativa. B fica fora do dataset de A. Linhas são allowlisted, com resposta observada, referência exclusiva do avaliador e vínculos de prova; sem usuário, sessão, raw Evidence ou segredos. O adapter usa `intent=eval`, request-key estável, roundtrip **exato** dos hashes normalizados, cell/versão congeladas e avaliação `recorded` com conjunto determinístico explícito. Não cria treino ou targets de geração. Mudança de schema ou linhas alteradas/faltantes falha fechada.

```sh
python3 -m venv .superpowers/overmind-venv
.superpowers/overmind-venv/bin/pip install -r scripts/rea/overmind-requirements.txt
.superpowers/overmind-venv/bin/overmind dataset upload --help
.superpowers/overmind-venv/bin/overmind dataset export --help
```

Execução remota exige `REA_OVERMIND_EVAL=1`, `OVERMIND_API_URL/KEY/PROJECT_ID`, `REA_OVERMIND_EVAL_SET`, `REA_OVERMIND_PYTHON` e `REA_OVERMIND_MAX_ITEMS` (1–10, suficiente para as linhas congeladas). Configurar o conjunto no Overmind com métrica determinística que compare os fatos observados à referência; revisar a semântica antes de dar o ID ao adapter. Credencial passa só pelo ambiente privado do filho, nunca por argumento de CLI.

O journal local impede relançamento automático de uma avaliação de resultado ambíguo: reconciliar no Overmind antes de repetir. Importação usa o request-key recuperável do SDK. O resultado fica associado à lição/revisão/manifest na outbox canônica e alimenta o painel como pending, failed ou completed; retry não duplica nem apaga recibo concluído do mesmo manifest. Sem configuração, `evaluate` retorna `pending / overmind_not_configured` e exit 2. A CLI pinada foi instalada em venv e seus comandos upload/export --help foram exercitados; falta ainda executar importação, roundtrip e avaliação **reais** com IDs de dataset/cell/evaluation. Mocks não concluem M4. O script não instala ou sobe toda a plataforma como fallback.

## Estado dos marcos e limites

- **M1:** engine nativo e imagem Docker JDK21 qualificados; hash do JADX conferido.
- **M2:** análises reais independentes e recibos determinísticos de A; detalhe no relatório.
- **M3:** promoção, leitura em processo novo, drift de engine, outbox, aposentadoria e evidência adulterada exercitados. O embedding externo não foi qualificado neste ambiente.
- **M4:** adapter implementado e testes de contrato mock; avaliação Overmind remota pendente por ausência de configuração.
- **M5:** B foi reobservado, INTERNET presente, resposta de A copiada rejeitada, APK inválido recusado. Os dois controles usam o mesmo workflow determinístico de três ferramentas; houve recuperação de procedimento, mas **nenhuma melhora de agente LLM, custo de modelo ou ganho estatístico foi medida**. Esse experimento permanece pendente.

A continuação implementa o [comparador com agente real](rea-proof/agent-comparison.md), acionado por `--compare-agent`. Ele usa sessões e virtual keys separadas, protocolo congelado, ferramentas do runner em modo leitura e verificação de fatos/fontes fora do modelo. A tentativa atual retorna `pending / model_gateway_not_configured`, com zero chamadas: gateway, modelo e orçamento precisam ser carregados pelo executor. Os testes com driver simulado não concluem M5.

O smoke HTTP/worker usa identidade **simulada e assinada apenas no ambiente local de teste**. Exercita sessão do servidor, ACL, fila, REA real, recibos e memória; não demonstra login OAuth real. Nenhum deploy, conta de aluno, treino ou upload remoto foi executado.

O smoke completou duas provas com `android-marker-v1.0.1`, promoveu a lição `23d208f0-5098-4a89-b02d-afd1635242d6` e a recuperou pela API. Uma tentativa intermediária falhou e continua no relatório; não foi convertida em sucesso. O polling inicial expirou e foi retomado pelos registros duráveis do servidor. O painel foi inspecionado com Playwright em largura de celular; a rota de prévia e a identidade simulada não fazem parte do produto.

## Decisões e revisão

- O sourceRoot nativo do aplicativo não aceitou o checkout completo: usado worktree Git comum dentro deste projeto, preservando o checkout original sujo. Custo: sem gerenciamento nativo desse worktree; a PR é anexada ao chat.
- Base atualizada para `8ed7dc3`, em vez da base antiga do handoff. Custo: interfaces novas precisaram ser reconfirmadas.
- Primeiro teste nativo usou JDK24 instalado; a imagem alvo permaneceu JDK21 e também foi provada. Custo: são ambientes separados, identificados no relatório.
- Projeção L3 isolada da memória genérica para exigir revalidação canônica e identidade no acesso. Custo: índices Atlas separados; fallback canônico no piloto.
- A/B medem segurança da transferência de procedimento, sem experimento de agente LLM. Custo: M5 de qualidade/custo permanece aberto; não se afirma melhora.
- O formato real de método do provedor pode abrir uma classe sem fechar seu wrapper. Normalização aceita esse excerpt completo, mantendo rejeição de comentários/outra classe. As tentativas que reprovaram durante a correção continuam registradas.

Uma revisão independente do branch apontou troca indevida da identidade legada de projetos, falta de persistência do estado Overmind e seleção incorreta de grupo para promoção. As três foram corrigidas com regressões RED→GREEN. O terceiro achado foi elevado de Minor a Important porque impedia a ação válida do aluno. O ID verificado agora vive em `reaUserId`, sem mudar o contrato global de `session.user.id`; acesso a projetos legados por e-mail continua compatível.

Escopos explicitamente não qualificados pela revisão: avaliação remota/semântica da métrica real, ganho LLM, OAuth Google real, deploy, resistência geral a APK hostil e segurança global legada. Permanecem fora das alegações da entrega, com custo de exigir qualificação antes de habilitação real. Os quatro arquivos auxiliares Android formatados depois do snapshot da revisão só tiveram formatação; os testes Node foram repetidos. O worktree e os volumes de teste são preservados para inspeção das evidências; custo: espaço local até limpeza explícita. Não há minors de revisão deixados sem tratamento.

A continuação mantém o mesmo worktree/PR e o escopo aprovado, com custo de uma nova rodada de verificações. Uma revisão independente do comparador identificou fontes anteriores rejeitadas após consultas repetidas e perda do estado de limpeza/custos em falhas posteriores. Ambos os achados Important foram corrigidos com regressões RED→GREEN; não houve achados Critical ou Minor. Cada fonte citada passa por verificação independente, e o journal incremental preserva provas, custo conhecido/desconhecido e resultado de revogação. A revisão não qualifica comportamento real do provedor, limite de gasto ou revogação real sem gateway configurado; custo: M4/M5 permanecem pendentes. Código anterior, identidade de produção e UI não mudaram nesta continuação e mantêm os limites da revisão anterior.

## Verificação da entrega — 2026-10-30

- Vitest completo após a revisão da continuação: **583 arquivos, 5.160 testes aprovados**, com Mongo7 replica set, Postgres/pgvector e Chromium real; `--maxWorkers=2 --minWorkers=1` neste Mac de 8 GiB. Uma tentativa usou a porta antiga do Mongo após seu reinício; as duas falhas de conexão foram repetidas na porta atual e a suíte integral acima passou.
- Captura Chromium isolada: 18/18 aprovados. Execuções anteriores sob carga tiveram timeouts em testes legados; a repetição completa acima passou, sem alterar esses testes.
- `tsc --noEmit` aprovado com `NODE_OPTIONS=--max-old-space-size=4096`; o heap padrão de 2 GiB havia esgotado memória numa tentativa inicial.
- Prisma validate/generate, vet-deps, vet-audit, paridade i18n e três testes Node do provider/allowlist aprovados. Sem mudança no lockfile de dependências da aplicação.
- SDK/CLI Overmind pinado: instalação em venv, upload/export --help e compilação Python aprovados. Tentativa remota real: exit 2, pending, sem credenciais/configuração.
- Comparador de agente: 31 testes focados aprovados, incluindo repetição/exploração de fontes e falha de revogação seguida de erro ao criar outra chave. Drivers de teste permanecem rotulados mock. Tentativa CLI real: `pending / model_gateway_not_configured`, exit 2, zero chamadas. Recall após reiniciar Mongo recuperou a lição `f0229344-e6a7-48c6-bdc5-a8994b87c187` em processo novo, sem histórico; drift de engine exigiu revalidação.
- Smoke real HTTP/fila/engine e recibos finais estão em `qualification.json`; login nele é simulado. Build e demais checks de CI são executados na PR, sem deploy.

Rollback: desligar as flags, parar novos jobs/exports, cancelar leases pendentes e preservar recibos. Retirar lições impede recall futuro; excluir dados segue a retenção do piloto. Não apagar evidências para transformar falhas em sucessos históricos.
