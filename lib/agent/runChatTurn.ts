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
import { runTrajectoryTraced } from "@/lib/agent/trajectory";
import * as mem from "@/lib/agent/memory-provider";
import { serializarProgresso, serializarModelo } from "@/lib/agent/progresso";
import { modeloDoId, nomeDoModeloServido } from "@/lib/chat/modelos";
import { markRunning, saveDone, saveError } from "@/lib/agent/chat-turn-store";
import type { Wing } from "@/lib/agent/memory";

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
};

export async function runChatTurn(
  turnId: string | null,
  params: ChatTurnParams,
  emit: (chunk: string) => void,
): Promise<HarnessOutput> {
  const { userId, surface, mentor } = params;
  const prompt = String(params.prompt || "");
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
      .then((m) => m.baseParaTurno({ userId, pergunta: prompt }))
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
      currentGoal: ac.currentGoal || prompt.slice(0, 200),
      // Mentor ativo: andar de memória "<slug>/<userId>" (isola por mentor E por usuário).
      mentor: mentor?.slug,
      wing: mentor?.wing.label,
    };
    const escolhido = modeloDoId(params.modelo);
    const ledgerTurno = { agentKey: mentor?.slug ?? "aura", mentorSlug: mentor?.slug ?? null, userId: userId ?? null, surface: surfaceLedger(surface ?? hctx.activeTab), scopeId: typeof ac.cartolinaScopeId === "string" ? ac.cartolinaScopeId : null };
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
    // Só anuncia quando é verdade: sem dono do turno não há memória pra reler.
    if (userId) narrar(serializarProgresso({ fase: "memoria", rotulo: "Retomando a conversa" }));
    // wakeUp (L3, A8): recall + perfil pinado → systemContext. Best-effort; "" se o L3 não ligou.
    const memBlock = userId
      ? await mem.wakeUpContext({ userId, surface: hctx.activeTab, hint: prompt, wingLabel: mentor?.wing.label }).catch(() => "")
      : "";
    // Memória do estudo → agente (a "bússola"): o que já foi estudado nesta conversa e o que está
    // em aberto. Com MAP_HARNESS o grafo (cérebro) é a fonte; senão a cartolina. "" sem nada.
    const cartolina = await import("@/lib/map/memoria-turno");
    const cartolinaBlock = await cartolina.bussolaParaTurno(userId, ac.cartolinaScopeId, prompt);
    // TCC cross-sala: se a conversa já tem TCC, a Aura sabe (e edita por seção). "" com TCC_CROSS
    // off / sem TCC. O scope é o mesmo da cartolina (a aba do chat).
    const tccMod = await import("@/lib/tcc/turno");
    // CHAT ÚNICO (o cliente manda `chatUnico`): a conversa pode ter VÁRIOS trabalhos — a Aura vê todos, com o
    // aberto no editor marcado, e o roteador sabe que "agora outro sobre Y" é pedido de trabalho.
    const multi = ac.chatUnico === true;
    const trabalhos = multi ? await tccMod.trabalhosParaTurno(userId, ac.cartolinaScopeId, ac.trabalhoAbertoId) : null;
    if (trabalhos?.total) hctx.trabalhos = { total: trabalhos.total, kind: trabalhos.kind };
    const tccBlock = multi ? trabalhos!.bloco : await tccMod.tccContextoParaTurno(userId, ac.cartolinaScopeId);
    // Árvore de habilidades: posição do aluno no tópico + guardrail pedagógico. Best-effort.
    const skillTopic = typeof ac.skillTopic === "string" && ac.skillTopic.trim() ? String(ac.skillTopic).trim() : null;
    const skillNodeId = typeof ac.skillNodeId === "string" && ac.skillNodeId.trim() ? String(ac.skillNodeId).trim() : null;
    const skillBlock = userId && skillTopic
      ? await import("@/lib/skilltree/progress").then((m) => m.treeContextBlock(userId, skillTopic, skillNodeId)).catch(() => "")
      : "";
    // Quem serviu (o envelope pode cair na reserva): fica o da resposta (draft) se houver, senão o último.
    let servido: { modelo: string; alvo?: string; phase?: string } | null = null;
    const deps = buildHarnessDeps(hctx, {
      modelo: escolhido?.provedor === "google" ? escolhido.vertex : undefined,
      onModelo(m) { if (!servido || servido.phase !== "draft" || m.phase === "draft") servido = m; },
      systemContext: [params.systemContext, memBlock, cartolinaBlock, tccBlock, skillBlock].filter(Boolean).join("\n\n") || undefined,
      history: params.history,
      baseConhecimento: await basePromise,
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
    const { answer, state } = await runTrajectoryTraced(prompt, hctx, deps);
    const out = resolveHarnessOutput(state, answer, surface, prompt, { trabalhoNoEditor: multi });
    // TCC cross-sala: "crie um TCC sobre X" cria o TCC da conversa; nos turnos seguintes
    // `work.sections` vira operação por seção. AGUARDADO (é só banco, sem modelo) porque o cliente
    // precisa do workId pra abrir a aba — e best-effort: null nunca derruba o turno.
    const tcc = await tccMod.tccDoTurno({ userId, scopeId: ac.cartolinaScopeId, surface, intent: state.intent, kind: state.kind, prompt, answer, multi, abertoId: ac.trabalhoAbertoId });
    // O texto das seções mora na ABA do TCC (e a Aura relê as seções pela bússola do TCC): a bolha
    // do chat leva só o núcleo + o aviso `tcc`, sem repetir o documento.
    if (tcc && out.mode === "structured") out.answer = { ...out.answer, work: undefined, tcc };
    // Chat → memória: o turno entra no grafo do estudo (e a cartolina recebe a projeção) — ÚNICO
    // ponto de escrita por turno. Fire-and-forget. Seções que foram pro TCC não viram notas soltas.
    if (userId) void cartolina.fixarTurno({ userId, scopeId: ac.cartolinaScopeId, prompt, answer: tcc ? { ...answer, work: undefined } : answer, msgId: ac.cartolinaMsgId });
    // GATEKEEPER do cérebro (§2): barato, decide se a conversa é estudável (bolinha azul). Fire-and-forget.
    if (userId) {
      void import("@/lib/map/gatekeeper")
        .then((g) => g.gatekeeperDoTurno({ userId, scopeId: typeof ac.cartolinaScopeId === "string" ? ac.cartolinaScopeId : null, prompt, history: params.history, answer }))
        .catch(() => null);
    }
    // L3 write (A7, fire-and-forget): deriva o turno em drawers verbatim. Nunca bloqueia.
    if (userId) {
      void mem.writeTurnMemory({
        userId, surface: hctx.activeTab, scopeId: ac.currentStudyId ?? ac.currentResearchId ?? null,
        prompt, answer, wing: mentor?.wing,
      });
    }
    // Moderação: DESLIGADA no chat (decisão do dono, 2026-10-22). lib/llm/guarda continua pronto, sem chamador.
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
    if (quem) narrar(serializarModelo(nomeDoModeloServido(quem.modelo, quem.alvo)));
    if (turnId) await saveDone(turnId, out, narrado);
    return out;
  } catch (e: any) {
    // O erro CRU vai pro banco (diagnóstico); quem mostra ao aluno passa por messageForError.
    if (turnId) await saveError(turnId, String(e?.message ?? e)).catch(() => {});
    throw e;
  }
}
