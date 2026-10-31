# HANDOFF — APK + REA com memória de sucesso verificável e Overmind

Data: 29/10/2026. Estado: handoff pronto para implementação; nenhuma análise real de APK, prova, memória promovida ou avaliação Overmind foi executada nesta preparação.
Snapshot Zaeon revalidado: `494840328fc680522d708fc43bcbcc60fcd7016a`.
[Plano executável](superpowers/plans/2026-10-29-apk-rea-success-memory.md).
Antecedentes: pesquisas APK + REA e Overmind de 2026-10-29. Este recorte conserva os contratos e as referências técnicas necessários à implementação; os demais planos de produto ficam fora desta PR.

## 1. Objetivo e interpretação da prioridade

Começar pelas duas frentes juntas usando análise Android como primeiro caso de aprendizagem baseada em evidência: receber um APK de teste, analisar pelo REA real, conferir um objetivo conhecido com verificador independente, guardar provas duráveis, recuperar o caso em nova sessão e medir o procedimento com Overmind.

“Memória de sucesso” significa um registro de resultado verificado com condições e limitações. Não significa que um modelo declarou sucesso, que o APK é seguro, que sua execução foi observada ou que os pesos do agente foram treinados.

A leitura adotada de “APK reverse como teste” é usar a tarefa de engenharia reversa Android como caso inicial. O script ReverseAPK não é requisito do piloto e não será copiado/executado: a licença não comercial declarada permanece registrada no plano anterior. O caminho inicial usa REA/JADX já existente.

## 2. Entregas e estados honestos

| Marco | O que precisa existir | O que ainda não permite afirmar |
|---|---|---|
| M1 — motor qualificado | REA/JADX configurado e fixture analisada no ambiente alvo | Que a conclusão da análise está correta |
| M2 — prova verificada | Checks independentes, dois runs reais e pacote de provas persistido | Que qualquer APK terá o mesmo resultado |
| M3 — memória recuperável | Registro canônico e procedimento recuperados após reinício/nova sessão | Que houve melhoria causal ou fine-tuning |
| M4 — Overmind real | Dataset importado/conferido e avaliação real com recibos/IDs/versionamento | Que importar dados treina um modelo |
| M5 — transferência medida | Fixture B mantida fora da aprendizagem inicial e avaliada com/sem procedimento | Generalização estatística a todo Android |

O objetivo completo deste handoff inclui M1–M5. Se Overmind não estiver configurado, M1–M3 podem ser entregues, mas o estado conjunto deve ser `overmind_pending`; não declarar integração concluída. Exportação JSONL sozinha não satisfaz M4.

## 3. Primeiro caso: fixture própria e gabarito independente

Criar uma fixture mínima original, sem segredos ou dados pessoais, em `tests/fixtures/rea-android/source/`. Assim o gabarito vem do código-fonte anterior à análise, não da resposta do mesmo modelo/decompilador.

Contrato da fixture A:
- pacote `space.zaeon.rea.fixturea`;
- versionCode 1;
- Activity `MainActivity` declarada no manifest;
- classe `ProofMarker`, método estático `String marker()`, com retorno literal `ZAEON_REA_FIXTURE_A`;
- sem declaração de permissão INTERNET;
- comportamento de execução e autenticidade da assinatura fora da prova estática.

Fixture B, separada por artefato/família de caso:
- pacote `space.zaeon.rea.fixtureb`, versionCode 2;
- classe `TransferMarker`, método `marker()`, literal `ZAEON_REA_FIXTURE_B`;
- INTERNET declarada, para detectar cópia indevida da ausência observada em A;
- gabarito não incluído no prompt/contexto da tarefa nem na lição sobre A.

O construtor roda fora da imagem de análise. Fixar SDK/build tools/JDK e dependências no lock da fixture, registrar origem/licença e digests; o executor seleciona uma cadeia compatível e a congela antes do teste. O script gera o APK, calcula SHA-256 dos bytes efetivos e sela `fixture.lock.json` com sourceRevision, toolchain, artifactSha256 e oracleHash. Não inserir hash fictício ou aceitar checksum preenchido pelo modelo.

Não exigir rebuild byte a byte idêntico entre hosts: assinatura e metadados podem variar. Cada APK realmente produzido precisa de seu próprio hash; uma mudança de bytes gera outro artefato. A fonte e o gabarito devem permanecer auditáveis.

O executor sob teste recebe o APK e a pergunta. O verificador recebe separadamente gabarito e provas. A pergunta é: “Identifique pacote, versão e Activity, encontre o método de marcação e mostre o literal retornado; diga se INTERNET está declarada.” Não fornecer a resposta no contexto.

## 4. O que constitui prova

Sucesso exige todos os itens abaixo, sem compensação por nota de juiz:
1. Hash do upload, do artefato analisado e das Evidence concordam.
2. Versões REA/JADX, digest do JAR, versão de verificador e objetivo estão registrados.
3. Pacote, versão, declaração de Activity e permissão batem com o manifest esperado.
4. Classe/método são os selecionados; o literal é retornado pelo método inspecionado. Encontrar a string em outro recurso não basta.
5. Cada afirmação obrigatória aponta para evidenceId e localizador do trecho completo.
6. Saída parcial, ambígua, truncada ou erro de provedor não é promovida como prova completa.
7. Dois runs de análise reais, em contextos limpos, repetem os fatos normalizados. Replay de um trace não conta como segunda execução.
8. Pacote de provas persistido pode ser relido por hash e continua acessível após reinício.

A conclusão permitida é “este objetivo de análise estática deste APK foi verificado”. Omitir uma declaração INTERNET não demonstra impossibilidade de rede, e presença de uma permissão não prova que ela foi utilizada. Código decompilado é representação derivada; não afirmar que o método foi executado.

O checker existente `checkGroundedness` confere presença de fonte/trecho, não inferência semântica completa. Acrescentar verificações estruturadas para este objetivo. A repetibilidade compara fatos canônicos e cobertura, não prosa exata ou JSON com timestamps.

## 5. Fluxo conjunto

```text
APK com dono e hash
  -> REA/JADX real
  -> Evidence integral persistida
  -> verificador independente + repetição real
  -> recibo verificável
  -> episódio de sucesso e lição no escopo do projeto
  -> nova sessão recupera com referências
  -> dataset elegível + Overmind eval
  -> teste de transferência na fixture B
```

Salvar a Evidence integral ANTES de `resumirRea`, que hoje limita a informação fornecida ao laço. O resumo serve ao contexto; o pacote persistido serve à auditoria. Não tentar reconstruir prova original a partir do resumo de 8.000 caracteres.

O código de promoção é determinístico, separado do modelo que responde. O agente pode propor uma lição, mas não escrever pass=true, mudar gabarito ou aprovar sua própria publicação.

## 6. Persistência e confiança

Adicionar coleções pelo Prisma/Mongo, usando o armazenamento protegido existente para blobs:
- `ReaArtifact`: proprietário/projeto, hash, nome/tamanho, origem, handle interno e expiração.
- `ReaProofRun`: tentativa, runId/lease, objetivo, versões, estado, referências de evidência e resultado de análise.
- `ReaVerificationReceipt`: append-only, hashes de entrada/oracle/evidências, checks e assinatura lógica do verificador (versão e digest de configuração; não alegar assinatura criptográfica se não houver).
- `ReaSuccessLesson`: episódio canônico, recipe/limites, escopo, receiptIds e estado.
- `ReaLearningOutbox`: projeção de memória e exportação Overmind, deduplicadas e com tentativas registradas.

Blobs de prova devem ser publicados atomicamente e ter digest/tamanho registrados. Leitura de arquivo parcial, ausência ou checksum inválido impede promoção. Os metadados só avançam para evidência pronta após durabilidade confirmada. A promoção usa precondição de versão/estado e unicidade, não uma sequência de best-effort que possa perder a prova.

Cada tentativa real tem runId distinto. Deduplicar entrega repetida de uma tentativa não a conta como outro suporte independente. O registro de aprendizagem usa chave estável por dono/projeto/APK/objetivo/engine/verificador; repetições não geram inúmeras lições iguais.

Estado da lição: `candidate -> verified_project -> retired`. Um procedimento candidato à transferência referencia resultados de B; compartilhar fora do projeto é decisão separada, nunca consequência automática de uma análise.

## 7. O que guardar como memória

Guardar dois registros relacionados:
- **Episódio:** pergunta, hash do APK, fatos conferidos, referências, limites, data/versões e recibos.
- **Procedimento:** como selecionar capacidade, localizar método, consultar Evidence, verificar objetivo e reconhecer ausência/erro. Descrever parâmetros, não comandos shell arbitrários ou resposta copiada de A.

A lição informa que vale para o provedor/versão e tipo de tarefa verificados. Mudança relevante de ferramenta, prova invalidada ou revogação resulta em `needs_revalidation` na recuperação; um histórico de sucesso não autoriza burlar o guard.

O store canônico de lições não depende de embedding. Uma projeção na L3 pode usar sourceRef exato e meta com lessonId/receiptId/versão; falha de embedding fica em outbox e não apaga o sucesso verificado. Ao recuperar, revalidar estado/ACL da lição canônica, evitando que uma gaveta antiga aposentada continue parecendo válida.

A nova sessão deve encontrar o caso sem reenvio do histórico pelo navegador, mostrar fontes e preservar os limites da conclusão. Não fazer bump de confiança só porque a lembrança foi consultada.

## 8. Overmind entra nesta entrega

Usar projeto/capacidade de teste isolados, dataset com `intent=eval`, exemplos sintéticos e registros redigidos. Não usar conversas privadas, segredos ou dados Google. A transferência B fica fora de exportações que possam otimizar o agente antes da medição.

O adaptador deve:
1. Exportar manifest + JSONL canônico com hashes por linha, referência do episódio e versão da métrica.
2. Usar a interface real do SDK/CLI/API pinados e registrar requestKey, projectId, datasetId, versão/cell e status.
3. Aguardar importação efetiva; exportar novamente e comparar campos/hashes normalizados. Preparação que reescreve o dado esperado deve ser detectada.
4. Executar uma avaliação real no Overmind sobre a capacidade definida, correlacionando o dataset exato e suas saídas; persistir evaluationId e recibos. O verificador local permanece a autoridade sobre os fatos estáticos.
5. Comparar resultados, linhas faltantes e divergências. Importar ou executar um juiz não atualiza automaticamente a memória nem os pesos.

A documentação da versão examinada não oferece instrumentação TS nesse onboarding; começar por dataset e bridge de experimento. Não acoplar a imagem Next à plataforma Python. Se as credenciais/endpoints ou orçamento do ambiente não existirem, retornar erro estruturado/estado pendente, preservando o pacote local. Nenhum adaptador fake satisfaz M4.

Não iniciar fine-tuning neste handoff. Um APK é primeiro caso funcional, não corpus suficiente para demonstrar aprendizagem geral. O passo posterior exige vários casos, holdout privado, comparação com baseline, custo e release de modelo separados.

## 9. Interface e autoria

Reusar Octa, upload REA e blueprint, com o mesmo padrão visual. Mostrar estados:
- “Analisando APK”;
- “Conferindo evidências”;
- “Verificado para este objetivo”;
- “Memória de sucesso registrada”;
- “Avaliação Overmind pendente/concluída”.

O badge de verificado vem do recibo no servidor, nunca de uma palavra no texto do agente. O modal permite abrir objetivo/checks, referências, versões e limitações. Nenhum log bruto sensível entra automaticamente no chat.

O login por simples email identificado no plano Google também afeta esta capacidade: antes de habilitar memória/provas para contas reais, comprovar identidade e autorização por projeto. Um piloto sintético fechado não resolve a prontidão multiusuário.

## 10. Aceite global e relatório final de implementação

Entregar:
- comandos e ambiente reais do build/teste;
- hashes reais dos APKs A/B e fonte/toolchain;
- dois runIds reais de A, checks e Evidence integrais;
- prova de persistência e recuperação em outra sessão;
- um caso negativo recusado, um caso com erro de ferramenta e um caso com permissão negada;
- datasetId/evaluationId reais do Overmind, ou status pendente explícito;
- comparação B com/sem procedimento e limitações amostrais;
- teste de invalidação: lição retirada não aparece como sucesso válido;
- PR/diff, riscos remanescentes e rollback por flags.

A memória pode registrar o sucesso local após M2–M3 mesmo que Overmind esteja indisponível; o estado global continua indicando o marco incompleto. Nunca substituir ausência de prova por confiança do modelo.

## 11. Escopo do executor

Implementar e testar em branch de desenvolvimento a partir da main revalidada, preservando mudanças locais. A pasta deste chat é incompleta; os arquivos de handoff devem ser levados ao checkout completo atualizado antes da implementação. Não construir o runtime a partir dessa pasta parcial nem de cópia antiga sem verificar divergências.

Reutilizar fila/runId/locks/ledger/evals e os modelos de acesso existentes. Não instalar ReverseAPK, não abrir shell genérico ao agente e não executar o APK. Análise dinâmica, emulador, serviços públicos de upload, fine-tuning e deploy de produção são fases separadas.

## 12. Fontes e pontos revalidados

- [Zaeon main 4948403](https://github.com/web3-engineer/zaeon-os/commit/494840328fc680522d708fc43bcbcc60fcd7016a).
- [Cliente REA, resumo e upload](https://github.com/web3-engineer/zaeon-os/blob/494840328fc680522d708fc43bcbcc60fcd7016a/lib/octa/rea.ts).
- [Bridge e cache](https://github.com/web3-engineer/zaeon-os/blob/494840328fc680522d708fc43bcbcc60fcd7016a/infra/rea-engine/bridge.mjs).
- [Docker do motor](https://github.com/web3-engineer/zaeon-os/blob/494840328fc680522d708fc43bcbcc60fcd7016a/infra/rea-engine/Dockerfile).
- [Trace/replay](https://github.com/web3-engineer/zaeon-os/blob/494840328fc680522d708fc43bcbcc60fcd7016a/lib/octa/trace.ts) e [checks atuais](https://github.com/web3-engineer/zaeon-os/blob/494840328fc680522d708fc43bcbcc60fcd7016a/lib/octa/evals/core.ts).
- [REA 6.5.0 Android](https://github.com/morluto/rea/blob/rea-agents-6.5.0/docs/android-analysis.md).
- [Overmind TS](https://github.com/overmind-core/overmind/blob/16db2447dcf1fa96e29251cfe6c6cd63c4a72132/overmind/skills/overmind/references/javascript.md).
- [CLI de datasets Overmind](https://github.com/overmind-core/overmind/blob/16db2447dcf1fa96e29251cfe6c6cd63c4a72132/overmind/overmind/dataset_cmd.py) e [API](https://github.com/overmind-core/overmind/blob/16db2447dcf1fa96e29251cfe6c6cd63c4a72132/overbae/api/datasets.py).

