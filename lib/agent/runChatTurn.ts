/**
 * lib/agent/runChatTurn.ts — UM turno do harness da Aura, extraído do /api/ai/chat pra
 * rodar em DOIS lugares (espelha lib/scholar/pipeline.ts):
 *   - inline no request (hoje, e fallback de CHAT_BG): turnId = null, `emit` → stream;
 *   - no WORKER da fila "chat" (CHAT_BG=1): turnId = o ChatTurn, `emit` → parcial no banco.
 *
 * O laço é o de sempre — buildHarnessDeps + runTrajectoryTraced. Nada foi reimplementado:
 * este arquivo é o bloco que vivia dentro do ReadableStream do route, com as dependências
 * da REQUISIÇÃO trocadas por parâmetros. A troca que importa é o dono do turno: no worker
 * não existe sessão NextAuth, então o `userId` chega pronto (o route o derivou da sessão).
 *
 * Contrato do `emit`: recebe pedaços de PROTOCOLO (eventos @@PROGRESS@@\n). O payload final
 * NÃO passa por ele — volta como retorno (HarnessOutput), e quem chamou decide onde escrever
 * (outputToWire no stream; `answer` no ChatTurn). Assim o parcial persistido nunca contém
 * a resposta pela metade — EXCETO no modelo local (lib/agent/turnoLocal): lá a resposta vem em
 * streaming pelo próprio `emit` (o aluno a vê nascer) e o payload final é texto vazio; quem
 * reengata recebe `partial + wire`, que é a resposta inteira.
 *
 * Modelo escolhido pelo aluno (`modelo`, id de lib/chat/modelos): Google → o harness inteiro com
 * esse modelo; Zaeon (local) → o caminho enxuto, e se o local não começar a responder, o Google
 * responde. No fim sai um evento "quem respondeu" (serializarModelo) com o que o SERVIDOR usou.
 */
import { buildHarnessDeps, resolveHarnessOutput, type HarnessOutput } from "@/lib/agent/aura-harness";
import { surfaceLedger } from "@/lib/llm/ledger";
import { orquestrarTurno } from "@/lib/orquestra/orquestrador";
import { novoIdDeTarefa } from "@/lib/orquestra/contrato";
import * as mem from "@/lib/agent/memory-provider";
import { serializarProgresso, serializarModelo, serializarPrevia } from "@/lib/agent/progresso";
import { criarEmissorPrevia } from "@/lib/agent/previa";
import { blocoFonteColada, objetivoComFonte, pedidoParaTitulo, separarFonteColada } from "@/lib/agent/fonteColada";
import { blocoDosAnexos } from "@/lib/agent/anexos";
import { sinteseLigada } from "@/lib/agent/sintese-flag";
import { graficoLigado } from "@/lib/agent/graficosDoTurno";
import { MODELO_PADRAO, modeloDoId, nomeDoModeloServido } from "@/lib/chat/modelos";
import { podeProNasPesadas } from "@/lib/ai/proNasPesadas";
import { markRunning, saveDone, saveError } from "@/lib/agent/chat-turn-store";
import type { Wing } from "@/lib/agent/memory";
import { mentorBySlug } from "@/lib/agent/mentors";
import { blocoDeEntregaveis, lerBriefing } from "@/lib/tcc/briefing";
import { capacidadeDe, habilidadesDoTurno, toolsPermitidas } from "@/lib/agents/capacidades";
import { agenteChat, type AgenteChatId } from "@/lib/agents/chatAgentes";
import { vozDoTurno } from "@/lib/agents/voz";

export type ChatTurnParams = {
  prompt: string;
  /** Superfície crua do cliente ("sala-de-estudos", "pesquisa"…) — o harness decide o modo por ela. */
  surface: string | null;
  /** Dono do turno, derivado da SESSÃO pelo route. null = anônimo (sem memória). */
  userId: string | null;
  /** systemContext já com o mentor na frente (o route resolve, como sempre fez). */
  systemContext?: string;
  history: Array<{ role: string; text: string }>;
  /** World-state do cliente (AgentContext). Só JSON: atravessa a fila. */
  agentContext?: Record<string, unknown> | null;
  mentor?: { slug: string; wing: Wing } | null;
  /** Modelo escolhido no composer (id de lib/chat/modelos; o route já validou). Ausente = padrão. */
  modelo?: string;
  /**
   * QUEM o aluno escolheu no seletor (lib/agents/chatAgentes). Atravessa a fila como string.
   *
   * Antes deste campo o turno era SEMPRE a Aura — a escolha morria no localStorage do lab. É daqui
   * que saem três coisas: a voz (`transformarSystem`), as habilidades (o portão de tools) e a base
   * por área do RAG. Ausente = "aura", que é o comportamento de antes, byte a byte.
   */
  agente?: AgenteChatId;
  /**
   * F3 · os ARQUIVOS anexados, com o TEXTO já extraído pela rota (lib/agent/anexos-server). Vêm
   * prontos, e não como bytes, por dois motivos: as chamadas do harness vão pelo envelope, que é
   * texto; e assim o turno atravessa a fila do CHAT_BG como JSON. Vazio/ausente = turno sem anexo.
   */
  anexos?: import("@/lib/agent/anexos").AnexoDoTurno[];
  /**
   * O MOTOR que o aluno escolheu ao plugar um agente da orquestra na Loja (lib/orquestra/catalogo). O turno
   * continua sendo da Aura; a orquestra confere plano e chave e, se puder, entrega o trabalho a esse motor.
   */
  motorPedido?: string;
};

export async function runChatTurn(
  turnId: string | null,
  params: ChatTurnParams,
  emit: (chunk: string) => void,
): Promise<HarnessOutput> {
  const { userId, surface, mentor } = params;
  const prompt = String(params.prompt || "");
  // A AGENTE DESTE TURNO. O mentor ativo ACRESCENTA habilidade (ele é a Aura parametrizada), nunca
  // tira — ver habilidadesDoTurno.
  const agente: AgenteChatId = params.agente ?? "aura";
  const cap = capacidadeDe(agente);
  const nomeDaAgente = agenteChat(agente).nome;
  const habilidades = habilidadesDoTurno({
    agente,
    habilidadesDoMentor: mentor?.slug ? mentorBySlug(mentor.slug)?.enabledSkills ?? null : null,
  });
  // "escreva um artigo com base neste: <artigo colado>": o PEDIDO (curto) é o objetivo do turno — roteador, buscas,
  // título; o texto colado vira bloco de contexto (lib/agent/fonteColada). Sem texto colado, tudo igual a antes.
  const colada = separarFonteColada(prompt);
  const objetivo = colada.fonte ? objetivoComFonte(colada) : prompt;
  // Tudo que o turno narrou até aqui — vai junto com a resposta pro banco, pra quem
  // reengatar depois ver as mesmas fases que quem ficou na sala viu.
  let narrado = "";
  const narrar = (chunk: string) => {
    narrado += chunk;
    try { emit(chunk); } catch { /* canal fechado/abortado: o turno segue, progresso é enfeite */ }
  };

  if (turnId) await markRunning(turnId);
  try {
    // RAG F2: base da turma + pessoal. Dispara já, em paralelo com memória/cartolina/TCC/árvore
    // (não soma latência); import lazy pra o load do módulo nunca tocar o pg. O módulo já não
    // rejeita, mas se rejeitar (ou o import falhar) loga e vira null — a base nunca derruba o turno.
    const basePromise = import("@/lib/rag/turno")
      // + as bases por área (lib/rag/areas): a do mentor ativo e a geral (ENEM, conceitos)
      // F4: com a flag, a consulta é LARGA (K_AMPLO) pra todo documento aparecer no agrupamento por
      // documento. O bloco de citação do prompt continua recebendo só o top-k — ver `baseCurta`.
      .then(async (m) => m.baseParaTurno({
        userId, pergunta: objetivo,
        // A ÁREA DA AGENTE vem antes da do mentor: a Zenita é a da medicina por ser quem é, não por
        // haver um mentor de medicina ativo (é lá que moram os datasets de saúde do HF).
        areas: (await import("@/lib/rag/areas")).areasDoTurno(cap.area ?? mentor?.slug),
        // o gráfico de cobertura por documento (G3) precisa do MESMO agrupamento, então ele também
        // pede a consulta larga — senão `HARNESS_GRAFICO=1` com `HARNESS_SINTESE=0` produziria um
        // gráfico silenciosamente ausente, que é a dependência não declarada de sempre.
        ...(sinteseLigada() || graficoLigado() ? { k: (await import("@/lib/rag/porDocumento")).K_AMPLO } : {}),
      }))
      .catch((e) => {
        console.error("[rag/chat] base do turno falhou:", (e as Error)?.message ?? String(e));
        return null;
      });
    const ac: any = params.agentContext && typeof params.agentContext === "object" ? params.agentContext : {};
    const hctx: any = {
      ...ac,
      userId: userId || undefined,
      activeTab: surface || ac.activeTab || "sala-de-estudos", // academicMode vem daqui (pesquisa→enforced)
      plan: "free",     // memória/studio/research = free; gate de plano é só compute pesado (PR03)
      execMode: "auto", // HITL "guiado" entra no PR07
      currentGoal: ac.currentGoal || objetivo.slice(0, 200),
      // Mentor ativo: andar de memória "<slug>/<userId>" (isola por mentor E por usuário).
      mentor: mentor?.slug,
      wing: mentor?.wing.label,
      // F3: os anexos viajam no ToolContext — é dele que `ler_anexo`/`listar_anexos` os tiram, e é
      // ele que o `disponivelNoTurno` consulta pra decidir se as tools existem neste turno.
      ...(params.anexos?.length ? { anexos: params.anexos } : {}),
      // O PORTÃO DE HABILIDADE (lib/agent/runtime ToolContext.toolsDoAgente): a base inteira pra
      // todas + as tools das habilidades desta. É o que faz `enabledSkills` deixar de ser rótulo.
      toolsDoAgente: toolsPermitidas(habilidades),
    };
    const escolhido = modeloDoId(params.modelo);
    // `taskId` = o TURNO: todas as chamadas de modelo deste turno ficam ligadas no TokenLedger (o console Zaeon Hermes
    // agrupa por ele pra medir a saúde do chat — quantos turnos caíram na reserva, quanto cada fase levou).
    const ledgerTurno = { agentKey: mentor?.slug ?? agente, mentorSlug: mentor?.slug ?? null, userId: userId ?? null, surface: surfaceLedger(surface ?? hctx.activeTab), scopeId: typeof ac.cartolinaScopeId === "string" ? ac.cartolinaScopeId : null, taskId: turnId ?? novoIdDeTarefa() };
    // MODELO LOCAL (Zaeon/Contabo): caminho enxuto em streaming. Não começou → segue pelo Google, abaixo.
    if (escolhido?.provedor === "zaeon" && escolhido.grupo) {
      narrar(serializarProgresso({ fase: "draft", rotulo: `${escolhido.nome} pensando no servidor Zaeon` }));
      try {
        const [{ turnoLocal }, { blocoDaBase }] = await Promise.all([import("@/lib/agent/turnoLocal"), import("@/lib/rag/citar")]);
        const s = await turnoLocal({
          prompt, history: params.history, systemContext: params.systemContext,
          base: blocoDaBase(await basePromise) || undefined, grupo: escolhido.grupo, ctx: ledgerTurno,
        }, (pedaco) => narrar(pedaco));
        if (s.interrompido) narrar("\n\n_(a resposta local foi interrompida aqui)_");
        narrar(serializarModelo(nomeDoModeloServido(escolhido.grupo, "contabo")));
        const outLocal: HarnessOutput = { mode: "text", text: "" };
        if (userId) {
          void Promise.all([import("@/lib/canal/usage"), import("@/src/lib/prisma")])
            .then(([u, { prisma }]) => u.registrarUso(prisma as any, mentor?.slug ?? "aura", userId)).catch(() => null);
        }
        if (turnId) await saveDone(turnId, outLocal, narrado);
        return outLocal;
      } catch (e: any) {
        console.warn("[chat] modelo local não respondeu — Google responde:", String(e?.message ?? e).slice(0, 160));
        narrar(serializarProgresso({ fase: "draft", rotulo: "Servidor local ocupado — respondendo pelo Google" }));
      }
    }
    // O CACHE DE RESPOSTAS (lib/rag/cacheRespostas, CACHE_RESPOSTAS=1): pergunta de conceito já respondida volta sem
    // modelo. Consulta EM PARALELO com o preparo abaixo, com o mesmo vetor da pergunta que o RAG da turma usa. Só no
    // modelo padrão (quem escolheu outro no composer quer aquele modelo), sem texto colado, pergunta autocontida e
    // impessoal. Qualquer falha = "não achou": o turno segue normal.
    const cache = await import("@/lib/rag/cacheRespostas");
    const escopoCache = cache.escopoDoCache(surfaceLedger(surface ?? hctx.activeTab), mentor?.slug);
    const usaCache = cache.cacheLigado() && !colada.fonte && (!escolhido || escolhido.id === MODELO_PADRAO) && cache.perguntaCacheavel(prompt);
    const cacheP = usaCache
      ? Promise.all([import("@/lib/rag/pg"), import("@/lib/rag/embed")])
        .then(async ([{ ragPg }, { embedPerguntaCompartilhado }]) => cache.consultarCache(ragPg(), { pergunta: prompt, vetor: await embedPerguntaCompartilhado(objetivo), escopo: escopoCache }))
        .catch(() => null)
      : Promise.resolve(null);
    // Só anuncia quando é verdade: sem dono do turno não há memória pra reler.
    if (userId) narrar(serializarProgresso({ fase: "memoria", rotulo: "Retomando a conversa" }));
    // O PREPARO do turno, em PARALELO (out/2026, "as respostas estão lentas"): memória L3, bússola da cartolina,
    // trabalhos/TCC e árvore de habilidades não dependem um do outro — antes eram 4 awaits em fila e o turno pagava a
    // SOMA; agora paga o mais lento. Cada um continua best-effort do jeito que era.
    // CHAT ÚNICO (o cliente manda `chatUnico`): a conversa pode ter VÁRIOS trabalhos — a Aura vê todos, com o
    // aberto no editor marcado, e o roteador sabe que "agora outro sobre Y" é pedido de trabalho.
    const multi = ac.chatUnico === true;
    // Árvore de habilidades: posição do aluno no tópico + guardrail pedagógico. Best-effort.
    const skillTopic = typeof ac.skillTopic === "string" && ac.skillTopic.trim() ? String(ac.skillTopic).trim() : null;
    const skillNodeId = typeof ac.skillNodeId === "string" && ac.skillNodeId.trim() ? String(ac.skillNodeId).trim() : null;
    const tccModP = import("@/lib/tcc/turno"), cartolinaP = import("@/lib/map/memoria-turno");
    const [memBlock, cartolinaBlock, tccMod, cartolina, trabalhos, tccBlocoUnico, skillBlock] = await Promise.all([
      // wakeUp (L3, A8): recall + perfil pinado → systemContext. Best-effort; "" se o L3 não ligou.
      userId ? mem.wakeUpContext({ userId, surface: hctx.activeTab, hint: prompt, wingLabel: mentor?.wing.label }).catch(() => "") : Promise.resolve(""),
      // Memória do estudo → agente (a "bússola"): o que já foi estudado nesta conversa e o que está
      // em aberto. Com MAP_HARNESS o grafo (cérebro) é a fonte; senão a cartolina. "" sem nada.
      cartolinaP.then((m) => m.bussolaParaTurno(userId, ac.cartolinaScopeId, objetivo)),
      // TCC cross-sala: se a conversa já tem TCC, a Aura sabe (e edita por seção). "" com TCC_CROSS
      // off / sem TCC. O scope é o mesmo da cartolina (a aba do chat).
      tccModP,
      cartolinaP,
      multi ? tccModP.then((m) => m.trabalhosParaTurno(userId, ac.cartolinaScopeId, ac.trabalhoAbertoId)) : Promise.resolve(null),
      multi ? Promise.resolve("") : tccModP.then((m) => m.tccContextoParaTurno(userId, ac.cartolinaScopeId)),
      userId && skillTopic
        ? import("@/lib/skilltree/progress").then((m) => m.treeContextBlock(userId, skillTopic, skillNodeId)).catch(() => "")
        : Promise.resolve(""),
    ]);
    if (trabalhos?.total) hctx.trabalhos = { total: trabalhos.total, kind: trabalhos.kind };
    const tccBlock = multi ? trabalhos!.bloco : tccBlocoUnico;
    /**
     * O BURACO DE ROTEAMENTO (ver lib/tcc/briefing.ts): um pedido pode trazer duas entregas — o
     * documento E algo que é da resposta ("ao final, forneça uma lista dos dados que eu preciso
     * fornecer"). O turno é binário: tudo virava documento, e a segunda entrega sumia sem aviso.
     * Este bloco diz ao modelo, no system, o que tem de sair NESTA mensagem. Puro e barato: sai
     * vazio em pedido simples, então nenhum turno de hoje ganha texto novo no prompt.
     */
    const entregaveisBlock = blocoDeEntregaveis(lerBriefing(prompt).entregaveis);
    // Quem serviu (o envelope pode cair na reserva): fica o da resposta (draft) se houver, senão o último.
    let servido: { modelo: string; alvo?: string; phase?: string } | null = null;
    // F4 · COBERTURA POR DOCUMENTO. `baseCurta` é o que vai pro prompt e pras citações: `blocoDaBase`
    // numera [B1]..[Bn] por POSIÇÃO e o modelo devolve `citacoes_base: [n]`, então mandar a lista
    // larga desalinharia toda citação. O agrupamento viaja à parte, no ctx, pra síntese cruzada.
    const baseDoTurno = await basePromise;
    const baseCurta = baseDoTurno && sinteseLigada()
      ? { ...baseDoTurno, trechos: (await import("@/lib/rag/porDocumento")).trechosParaCitar(baseDoTurno.trechos) }
      : baseDoTurno;
    // o agrupamento serve a DUAS coisas: a síntese cruzada (F4) e o gráfico de cobertura (G3).
    // Qualquer uma das duas ligada já justifica montá-lo — é barato e é puro.
    if (baseDoTurno && (sinteseLigada() || graficoLigado()) && baseDoTurno.status === "ok") {
      const { agruparPorDocumento } = await import("@/lib/rag/porDocumento");
      const grupos = agruparPorDocumento(baseDoTurno.trechos);
      if (grupos.length) hctx.docsDaBase = grupos;
    }
    // F7 · O PRO NAS FASES PESADAS (plan/síntese/draft), só pra quem paga. Resolvido AQUI e não no
    // adaptador: é uma leitura de banco, e o adaptador é a camada que não sabe de plano nem de
    // conta. Falha fechado (erro = Flash) e tem memo de 60 s, pra não consultar a cada turno.
    const proPesadas = await podeProNasPesadas(userId);
    // o contexto do turno numa variável só: o harness da Aura E os motores da orquestra leem o MESMO
    const systemContextDoTurno = [params.systemContext, memBlock, cartolinaBlock, tccBlock, entregaveisBlock, skillBlock, blocoDosAnexos(params.anexos ?? []), colada.fonte ? blocoFonteColada(colada.fonte) : ""].filter(Boolean).join("\n\n") || undefined;
    const deps = buildHarnessDeps(hctx, {
      modelo: escolhido?.provedor === "google" ? escolhido.vertex : undefined,
      modeloEhPadrao: escolhido?.id === MODELO_PADRAO,
      proNasPesadas: proPesadas,
      onModelo(m) { if (!servido || servido.phase !== "draft" || m.phase === "draft") servido = m; },
      // a PRÉVIA da resposta: o texto do rascunho enquanto nasce, em PEDAÇOS (lib/agent/previa criarEmissorPrevia)
      onPrevia: criarEmissorPrevia((pedaco) => narrar(serializarPrevia(pedaco))),
      // A VOZ: troca "Você é a Aura" pelo nome da agente nos prompts do harness (lib/agents/voz).
      // undefined pra Aura — o caminho dela fica idêntico ao de antes.
      transformarSystem: vozDoTurno(nomeDaAgente),
      systemContext: systemContextDoTurno,
      history: params.history,
      baseConhecimento: baseCurta,
      // C5: cada chamada do turno grava no TokenLedger com quem/onde (mentor em agentKey E mentorSlug, como o registrarUso).
      ledger: ledgerTurno,
      // O CANAL DE PROGRESSO: cada fase do trajectory (plan → reason → draft…) vira um
      // evento. Uma falha do canal nunca derruba a resposta.
      onStep(step) {
        if (step?.kind !== "say") return;
        const rotulo = String(step.label ?? "").trim();
        if (!rotulo) return;
        narrar(serializarProgresso({ fase: String(step.detail ?? ""), rotulo }));
      },
    });
    // ACHOU no cache: a resposta guardada entra no lugar do motor (e segue pelo mesmo pós-processamento: memória,
    // cartolina, uso…). Não achou: o motor de sempre — e a resposta boa vai pro cache depois (fire-and-forget).
    const doCache = await cacheP;
    if (doCache) narrar(serializarProgresso({ fase: "finalize", rotulo: "Já respondi isso antes" }));
    // A ORQUESTRA (lib/orquestra, flag ORQUESTRA): decide QUEM trabalha — a Aura, um agente profundo
    // (DeepSeek/Tongyi) ou um enxame (Kimi/misto) — pelo plano da conta × formato do pedido. Com a flag
    // desligada é o `runTrajectoryTraced` de sempre, byte a byte.
    const orq = doCache ? null : await orquestrarTurno({
      objetivo, hctx, deps, userId,
      emSegundoPlano: !!turnId,
      trabalhoGeradoNoCliente: surface === "pesquisa" && !multi,
      systemContext: systemContextDoTurno,
      history: params.history,
      ledger: ledgerTurno,
      narrar,
      motorPedido: params.motorPedido,
      // as MESMAS bases por área do RAG do turno (a da agente antes da do mentor) — viram a tool dos motores
      areas: (await import("@/lib/rag/areas")).areasDoTurno(cap.area ?? mentor?.slug),
    });
    const { answer, state } = doCache
      ? { answer: doCache.answer as any, state: { intent: doCache.intent, kind: doCache.kind, artifacts: [], degraded: false } as any }
      : orq!;
    if (!doCache && usaCache && cache.respostaGuardavel(answer as any, state.intent, !!state.degraded)) {
      void Promise.all([import("@/lib/rag/pg"), import("@/lib/rag/embed")])
        .then(async ([{ ragPg }, { embedPerguntaCompartilhado }]) => cache.guardarNoCache(ragPg(), {
          pergunta: prompt, vetor: await embedPerguntaCompartilhado(objetivo), escopo: escopoCache,
          answer: answer as any, intent: state.intent, kind: state.kind, modelo: (servido as { modelo: string } | null)?.modelo ?? null,
        }))
        .catch((e) => console.error("[cache] guardar falhou:", String((e as Error)?.message ?? e).slice(0, 160)));
    }
    const out = resolveHarnessOutput(state, answer, surface, objetivo, { trabalhoNoEditor: multi });
    // TCC cross-sala: "crie um TCC sobre X" cria o TCC da conversa; nos turnos seguintes
    // `work.sections` vira operação por seção. AGUARDADO (é só banco, sem modelo) porque o cliente
    // precisa do workId pra abrir a aba — e best-effort: null nunca derruba o turno.
    const tcc = await tccMod.tccDoTurno({ userId, scopeId: ac.cartolinaScopeId, surface, intent: state.intent, kind: state.kind, prompt: colada.fonte ? pedidoParaTitulo(colada) : prompt, answer, multi, abertoId: ac.trabalhoAbertoId });
    // O texto das seções mora na ABA do TCC (e a Aura relê as seções pela bússola do TCC): a bolha
    // do chat leva só o núcleo + o aviso `tcc`, sem repetir o documento.
    if (tcc && out.mode === "structured") out.answer = { ...out.answer, work: undefined, tcc };
    // VÍDEO DO DOCUMENTO pedido no chat ("faz um vídeo desse artigo" — lib/videodoc): AGUARDADO (só banco; a geração
    // corre em segundo plano) porque o card com ▶ vai NESTA resposta. Best-effort: falhou, a resposta segue sem ele.
    if (userId && out.mode === "structured") {
      const vd = await import("@/lib/videodoc/server");
      if (vd.videoDocOn() && (await import("@/lib/videodoc/pedido")).pedidoDeVideo(prompt)) {
        const videoDoc = await (await import("@/lib/videodoc/chat-server")).videoDoChat({ userId, scopeId: typeof ac.cartolinaScopeId === "string" ? ac.cartolinaScopeId : null, prompt, answer: tcc ? { ...answer, tcc } : answer }).catch(() => null);
        if (videoDoc) out.answer = { ...out.answer, videoDoc };
      }
    }
    // BLUEPRINT REA (engenharia reversa): "faz a engenharia reversa de X" / "como X funciona por dentro" cria o
    // blueprint da conversa — um MÓDULO próprio no chat (estilo REA: achados por proveniência + reconstrução).
    // AGUARDADO só o `iniciarRea` (cria o id, pra o card ir NESTA resposta); a composição corre em 2º plano.
    if (userId && out.mode === "structured") {
      const reaT = await import("@/lib/rea-blueprint/tipos");
      const scopeIdRea = typeof ac.cartolinaScopeId === "string" ? ac.cartolinaScopeId : null;
      if (reaT.reaBlueprintOn() && scopeIdRea && (await import("@/lib/agent/aprender")).pedeEngenhariaReversa(prompt)) {
        const srv = await import("@/lib/rea-blueprint/server");
        const { textoDaResposta } = await import("@/lib/blueprint/patch");
        const titulo = String(out.answer.nucleo || prompt).replace(/\s+/g, " ").trim().slice(0, 120) || "Engenharia reversa";
        const id = await srv.iniciarRea(userId, scopeIdRea, titulo).catch(() => null);
        if (id) {
          out.answer = { ...out.answer, reaBlueprint: { id, titulo, gerando: true } };
          void srv.reaBlueprintDoTurno({ userId, scopeId: scopeIdRea, titulo, prompt, answerTexto: textoDaResposta(out.answer), history: params.history }).catch(() => null);
        }
      }
    }
    // Chat → memória: o turno entra no grafo do estudo (e a cartolina recebe a projeção) — ÚNICO
    // ponto de escrita por turno. Fire-and-forget. Seções que foram pro TCC não viram notas soltas.
    if (userId) void cartolina.fixarTurno({ userId, scopeId: ac.cartolinaScopeId, prompt, answer: tcc ? { ...answer, work: undefined } : answer, msgId: ac.cartolinaMsgId });
    // GATEKEEPER do cérebro (§2): barato, decide se a conversa é estudável (bolinha azul). Fire-and-forget.
    // Em seguida o BLUEPRINT PRÁTICO (lib/blueprint): conversa válida cria o estudo na Sala de Estudos e cada turno
    // seguinte o recompõe (flag BLUEPRINT_PRATICO; também fire-and-forget).
    if (userId) {
      const scopeId = typeof ac.cartolinaScopeId === "string" ? ac.cartolinaScopeId : null;
      void import("@/lib/map/gatekeeper")
        .then((g) => g.gatekeeperDoTurno({ userId, scopeId, prompt, history: params.history, answer }))
        .catch(() => null)
        .then(async (sinal) => {
          const [{ blueprintOn }, { textoDaResposta }] = await Promise.all([import("@/lib/blueprint/tipos"), import("@/lib/blueprint/patch")]);
          if (!blueprintOn()) return;
          const { blueprintDoTurno } = await import("@/lib/blueprint/server");
          await blueprintDoTurno({ userId, scopeId, sinal, prompt, answerTexto: textoDaResposta(answer), history: params.history, answer: tcc ? { ...answer, tcc } : answer });
        })
        .catch(() => null);
    }
    // L3 write (A7, fire-and-forget): deriva o turno em drawers verbatim. Nunca bloqueia.
    if (userId) {
      void mem.writeTurnMemory({
        userId, surface: hctx.activeTab, scopeId: ac.currentStudyId ?? ac.currentResearchId ?? null,
        prompt, answer, wing: mentor?.wing,
      });
    }
    // Moderação: fora do chat (decisão do dono, 2026-10-22); o llama-guard saiu da Contabo.
    // Uso do agente (card founder): +1 em (mentor|aura, userId). Fire-and-forget; nunca derruba o turno.
    if (userId) {
      void Promise.all([import("@/lib/canal/usage"), import("@/src/lib/prisma")])
        .then(([u, { prisma }]) => u.registrarUso(prisma as any, mentor?.slug ?? "aura", userId))
        .catch(() => null);
    }
    // Árvore: o mentor SOBE a maestria quando o aluno demonstra domínio do nó em foco.
    if (userId && skillTopic && skillNodeId) {
      void import("@/lib/skilltree/assess")
        .then((m) => m.assessAndUpdate({ userId, topicSlug: skillTopic, nodeId: skillNodeId, message: prompt }))
        .catch(() => null);
    }
    const quem = servido as { modelo: string; alvo?: string } | null;
    if (doCache) narrar(serializarModelo("Aura · resposta guardada"));
    else if (orq?.servidoPor) narrar(serializarModelo(orq.servidoPor));
    else if (quem) narrar(serializarModelo(nomeDoModeloServido(quem.modelo, quem.alvo)));
    if (turnId) await saveDone(turnId, out, narrado);
    return out;
  } catch (e: any) {
    // O erro CRU vai pro banco (diagnóstico); quem mostra ao aluno passa por messageForError.
    if (turnId) await saveError(turnId, String(e?.message ?? e)).catch(() => {});
    throw e;
  }
}
