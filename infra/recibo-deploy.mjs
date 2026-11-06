/**
 * infra/recibo-deploy.mjs — O RECIBO DO HARNESS que o deploy imprime depois do health-gate.
 *
 * POR QUE É UM ARQUIVO, e não `node -e "…"` dentro do deploy.yml como era até aqui: o escalar
 * `script:` de um workflow tem um TETO DE 21.000 BYTES, e ultrapassá-lo faz o GitHub recusar o
 * arquivo inteiro — startup failure, zero jobs, `name` degradando pro caminho do arquivo. Foi o que
 * aconteceu nos deploys 572–578 desta semana, e a medição está no `agenteCompose.test.ts`:
 * 20.581 bytes passa, 21.010 falha. Este blob custava 3.573 bytes de um orçamento que já estava em
 * 19.881 — ou seja, quase TODO o espaço livre estava preso aqui.
 *
 * É invocado por STDIN (`docker compose exec -T web node < infra/recibo-deploy.mjs`), e não por
 * `-e "$(cat …)"`, de propósito: por stdin não existe questão de aspas nem de expansão do shell.
 * Roda DENTRO do container `web` porque o /api/health só escuta na rede interna.
 *
 * Nada aqui imprime VALOR de segredo — só nomes, booleanos e domínios de allowlist (que são
 * públicos por definição: são o que a casa declara que lê).
 */
fetch('http://localhost:3000/api/health').then(r=>r.json()).then(h=>{
  const c = h.capacidades || {};
  const sn = (v) => (v === true ? 'ON' : v === false ? 'off' : String(v));
  console.log('   cardapio=' + sn(c.cardapio) + '  acao=' + sn(c.acao) + '(' + sn(c.voltas) + ' voltas)' +
              '  anexo=' + sn(c.anexo) + '  sintese=' + sn(c.sintese) + '  doc_por_secao=' + sn(c.docPorSecao) + '  grafico=' + sn(c.grafico));
  console.log('   abrir_url=' + sn(c.abrirUrl) + '  baixar_para_base=' + sn(c.baixarParaBase) +
              '  leitor=' + h.leitor + '  mcp=' + h.mcp + '  commit=' + String(h.commit).slice(0,12));
  // F6 · o teto de voltas é POR TAREFA. A linha de cima mostra o padrão de quem não
  // passa tarefa (2); sem esta, o recibo diria '2 voltas' enquanto um pedido de
  // trabalho roda 5 — recibo que mente (§8.4b).
  const vt = c.voltasPorTarefa || {};
  if (Object.keys(vt).length) console.log('   voltas por tarefa: ' + Object.keys(vt).map(k => k + '=' + vt[k]).join('  '));
  const m = h.modelo || {};
  if (m.flash) console.log('   modelo: flash=' + m.flash + '  pro=' + m.pro +
              '  pro_nas_pesadas=' + sn(m.proPesadas) + (m.proSoPlusEPro ? ' (só plus/pro)' : ''));
  // o tempo real do documento: 'on', ou os NOMES das envs que faltam (nunca os valores)
  const tr = h.tempoReal;
  if (tr) console.log('   tempo_real(pusher): ' + (tr === 'on' ? 'on' : 'off — faltam ' + (tr.faltando || []).join(', ')));
  // O TRILHO DO DOCUMENTO, nas duas metades: servidor (pode nascer) e cliente (aparece).
  // Divergência aqui é a falha invisível — documento que nasce e ninguém vê.
  const d = h.documento;
  if (d) console.log('   documento: servidor=' + sn(d.servidor) + '  cliente=' + sn(d.cliente) +
              '  chat_unico=' + sn(d.chatUnico) + (d.servidor !== d.cliente ? '   ⚠ METADES DIVERGENTES' : ''));
  // F8 · o agente de navegador: 'on' ou os NOMES do que falta. Três condições de
  // naturezas diferentes (flag, allowlist, binário) — ver a nota no /api/health.
  const ag = h.agente;
  if (ag) {
    if (ag.faltando) console.log('   agente_navegador: off — faltam ' + ag.faltando.join(', '));
    else console.log('   agente_navegador: on (admin, somente leitura) · onde=' + ag.onde +
                (ag.onde === 'container' && !ag.alcancavel ? '   ⚠ CONTAINER INALCANÇÁVEL (sobe o serviço)' : ''));
  }
  // dominios + contabo: ver a nota 2 acima do `script:`
  const dm = h.dominios || {};
  if (dm.leitor) console.log('   dominios(leitor, ' + dm.leitor.length + '): ' + dm.leitor.join(', '));
  if (dm.agente) console.log('   dominios(agente): ' + (dm.agente === 'aberto' ? 'INTERNET ABERTA' : dm.agente.join(', ')));
  const cb = h.contabo;
  if (cb) console.log('   contabo(2o servidor): rag=' + cb.rag + '  modelos=' + cb.modelos +
              (cb.rag === 'degraded' || cb.modelos === 'degraded' ? '   ⚠ tailnet ou serviço fora' : ''));
}).catch(e=>{ console.log('   (não deu pra ler: ' + e.message + ')'); });
