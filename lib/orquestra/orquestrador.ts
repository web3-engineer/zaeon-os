/**
 * lib/orquestra/orquestrador.ts — a ZAEON COMO ORQUESTRADORA. Entra onde o turno chamava o motor único.
 *
 * Antes: todo pedido caía no mesmo harness (`runTrajectoryTraced`), do "oi" ao TCC de quem paga MAX.
 * Agora: o pedido é entendido (o mesmo classify do harness, chamado UMA vez), o roteador decide QUEM
 * trabalha (plano × formato da tarefa), e a saída de qualquer motor passa pelo mesmo portão de
 * qualidade e volta no mesmo formato. Motor caiu → a Aura assume, com aviso no progresso.
 *
 * Flag `ORQUESTRA`: `off` (padrão) = byte a byte o caminho de antes; `sombra` = decide e LOGA a
 * decisão sem trocar o motor (pra ver em prod o que mudaria antes de ligar); `on` = orquestra.
 */
import type { HarnessDeps, TrajectoryState } from "@/lib/agent/trajectory";
import { runTrajectoryTraced } from "@/lib/agent/trajectory";
import type { StructuredAnswer } from "@/lib/agent/contracts";
import type { RouterResult } from "@/lib/agent/router";
import type { ToolContext } from "@/lib/agent/runtime";
import { serializarProgresso } from "@/lib/agent/progresso";
import { novoIdDeTarefa, type LedgerBase, type Motor, type Tarefa } from "@/lib/orquestra/contrato";
import { criarPrazo } from "@/lib/orquestra/prazo";
import { criarCaixa } from "@/lib/orquestra/ferramentas";
import { chamarModeloPadrao, modeloDisponivel, type ChamarModelo, type ModeloId } from "@/lib/orquestra/provedores";
import { decidir, modoOrquestra, type Decisao } from "@/lib/orquestra/roteador";
import { todosOsMotores } from "@/lib/orquestra/motores";
import { planoDaConta } from "@/lib/orquestra/plano";
import { revisarGlobal, verificarCitacoes, type Veredito } from "@/lib/orquestra/verificador";
import { paraStructuredAnswer } from "@/lib/orquestra/formatar";
import { baseConhecimentoDef } from "@/lib/orquestra/datasets";
import { areasDoTurno } from "@/lib/rag/areas";
import { criarTrilha, type Trilha } from "@/lib/orquestra/trilha";
import type { Plan } from "@/lib/plans";

type Env = Record<string, string | undefined>;

export type EntradaOrquestra = {
  objetivo: string;
  hctx: ToolContext & Record<string, unknown>;
  deps: HarnessDeps;
  userId: string | null;
  emSegundoPlano: boolean;
  trabalhoGeradoNoCliente: boolean;
  systemContext?: string;
  history: Array<{ role: string; text: string }>;
  ledger: LedgerBase;
  narrar(chunk: string): void;
  /** as bases por área do RAG que este turno consulta (lib/rag/areas areasDoTurno) — viram a tool `base_conhecimento` */
  areas?: string[];
  /** quem gerou a tarefa (o console separa o chat da arena) */
  origem?: "chat" | "arena";
  /** o motor do agente que o aluno plugou na Loja (lib/orquestra/catalogo) — o roteador confere plano e chave */
  motorPedido?: string | null;
  /** injetável (teste); default = a trilha no Mongo (lib/orquestra/trilha) */
  trilha?: Trilha;
  /** id da tarefa já reservado por quem chamou (a arena devolve o id antes de rodar) */
  tarefaId?: string;
  /** o cancelamento de quem chamou (aluno fechou a aba, worker desligando) */
  signal?: AbortSignal;
  /** injeções (teste/arena) */
  env?: Env;
  motores?: Motor[];
  chamar?: ChamarModelo;
  plano?: Plan;
  caixa?: ReturnType<typeof criarCaixa>;
};

export type RelatorioOrquestra = {
  tarefaId: string;
  motor: string;
  nome: string;
  decisao: Decisao;
  ms: number;
  uso: { promptTokens: number; completionTokens: number; chamadas: number; custoUsd: number };
  passos: number;
  subagentes: number;
  evidencias: number;
  citadas: number;
  invalidas: number;
  cobertura: number;
  aprovado: boolean | null;
  degradado: boolean;
};

export type SaidaOrquestra = {
  answer: StructuredAnswer;
  state: Pick<TrajectoryState, "intent" | "kind" | "mode" | "artifacts" | "degraded">;
  /** quem respondeu (pro evento "modelo" do turno); ausente = a Aura (o turno usa o `servido` dela) */
  servidoPor?: string;
  relatorio?: RelatorioOrquestra;
};

function modeloDoVerificador(env: Env): ModeloId | null {
  const pedidos = (env.ORQ_MODELO_VERIFICADOR || "deepseek-v4-flash,kimi-k2.6,deepseek-v4-pro,qwen").split(",").map((s) => s.trim()) as ModeloId[];
  return pedidos.find((m) => { try { return modeloDisponivel(m, env); } catch { return false; } }) ?? null;
}

export async function orquestrarTurno(e: EntradaOrquestra): Promise<SaidaOrquestra> {
  const env = e.env ?? process.env;
  const modo = modoOrquestra(env);
  if (modo === "off") return runTrajectoryTraced(e.objetivo, e.hctx, e.deps);

  // o classify do harness, UMA vez: a decisão usa, e a trajetória da Aura reaproveita
  let rota: RouterResult | null = null;
  const depsMemo: HarnessDeps = { ...e.deps, classify: async (o, c) => (rota ??= await e.deps.classify(o, c)) };

  const plano = e.plano ?? (await planoDaConta(e.userId));
  // plano abaixo do mínimo e sem motor forçado: nem classifica de novo — vai direto pra Aura
  if (!env.ORQ_MOTOR && plano !== "pro" && plano !== "max" && !env.ORQ_PLANO_MINIMO) {
    return runTrajectoryTraced(e.objetivo, e.hctx, e.deps);
  }

  const r = await depsMemo.classify(e.objetivo, e.hctx);
  const motores = e.motores ?? todosOsMotores(env);
  const decisao = decidir({
    plano, intent: r.intent, mode: r.mode, emSegundoPlano: e.emSegundoPlano, trabalhoGeradoNoCliente: e.trabalhoGeradoNoCliente,
    pedido: e.motorPedido ?? null,
  }, env, motores);
  console.info("[orquestra]", JSON.stringify({ modo, plano, intent: r.intent, motor: decisao.motor, motivo: decisao.motivo }));

  if (modo === "sombra" || decisao.motor === "aura") return runTrajectoryTraced(e.objetivo, e.hctx, depsMemo);

  // TETO DE MOTORES LONGOS POR PROCESSO. Um enxame segura um slot do worker do chat por minutos
  // (CHAT_WORKER_CONCURRENCY, padrão 4): sem teto, quatro pedidos MAX ao mesmo tempo parariam o chat
  // de TODO mundo. Lotado → a Aura responde agora, que é melhor do que a fila parada.
  const maxSimultaneas = Number(env.ORQ_MAX_SIMULTANEAS) > 0 ? Number(env.ORQ_MAX_SIMULTANEAS) : 2;
  if (emVoo >= maxSimultaneas) {
    console.info("[orquestra] lotada — a Aura responde", JSON.stringify({ emVoo, maxSimultaneas, motor: decisao.motor }));
    return runTrajectoryTraced(e.objetivo, e.hctx, depsMemo);
  }
  emVoo++;
  try {
    return await rodarMotor(e, env, motores, decisao, r, plano, depsMemo);
  } finally {
    emVoo--;
  }
}

let emVoo = 0;
/** só pra teste */
export const motoresEmVoo = () => emVoo;

async function rodarMotor(
  e: EntradaOrquestra, env: Env, motores: Motor[], decisao: Decisao, r: RouterResult, plano: Plan, depsMemo: HarnessDeps,
): Promise<SaidaOrquestra> {
  const motor = motores.find((m) => m.id === decisao.motor)!;
  const tarefa: Tarefa = {
    id: e.tarefaId ?? novoIdDeTarefa(), objetivo: e.objetivo, intent: r.intent, kind: r.kind,
    contexto: e.systemContext, historico: e.history, plano,
  };
  const trilha = e.trilha ?? criarTrilha({ env });
  trilha.iniciar({
    id: tarefa.id, origem: e.origem ?? "chat", motor: motor.id, nomeMotor: motor.nome, formato: motor.formato,
    intent: r.intent, plano, objetivo: e.objetivo, userId: e.userId, decisao,
  });
  const emitirProgresso = (fase: string, rotulo: string, agente?: string) => {
    trilha.evento(fase, rotulo, agente);
    try { e.narrar(serializarProgresso({ fase, rotulo })); } catch { /* progresso é enfeite */ }
  };
  const extra = decisao.formato === "enxame" ? ` · até ${decisao.maxSubagentes} subagentes` : "";
  emitirProgresso("orquestra", `${motor.nome} assumiu este pedido (${decisao.formato}${extra})`);

  const t0 = Date.now();
  const prazo = criarPrazo(decisao.prazoMs, e.signal ?? null, `motor ${motor.id}`);
  const caixa = e.caixa ?? criarCaixa(e.hctx, {
    maxChamadas: Number(env.ORQ_MAX_FERRAMENTAS) > 0 ? Number(env.ORQ_MAX_FERRAMENTAS) : 80,
    // os DATASETS da casa pros motores de fora (sem RAG configurado, a tool não existe — não promete o que não tem)
    extras: env.RAG_PG_URL?.trim() ? [baseConhecimentoDef({ userId: e.userId, areas: e.areas ?? areasDoTurno(null) })] : [],
  });
  const x = {
    prazo, caixa, env, ledger: e.ledger,
    chamar: e.chamar ?? chamarModeloPadrao,
    maxSubagentes: decisao.maxSubagentes,
    emitir: (ev: { fase: string; rotulo: string; agente?: string }) =>
      emitirProgresso(ev.fase, ev.agente && !ev.rotulo.startsWith(ev.agente) ? `${ev.agente} · ${ev.rotulo}` : ev.rotulo, ev.agente),
  };

  try {
    const res = await motor.rodar(tarefa, x);
    if (!res.texto.trim()) throw new Error(`motor ${motor.id} devolveu texto vazio`);

    emitirProgresso("verificador", "Conferindo as citações contra as fontes");
    let veredito: Veredito;
    let aprovado: boolean | null = null;
    let uso = res.uso;
    const verificador = decisao.verificadorGlobal ? modeloDoVerificador(env) : null;
    if (verificador) {
      const g = await revisarGlobal(res.texto, res.evidencias, x, { modelo: verificador, taskId: tarefa.id, objetivo: e.objetivo });
      veredito = g.veredito;
      aprovado = g.aprovado;
      uso = { ...uso, promptTokens: uso.promptTokens + g.uso.promptTokens, completionTokens: uso.completionTokens + g.uso.completionTokens, chamadas: uso.chamadas + g.uso.chamadas, custoUsd: uso.custoUsd + g.uso.custoUsd };
    } else {
      veredito = verificarCitacoes(res.texto, res.evidencias);
    }

    const answer = paraStructuredAnswer(veredito.texto, res.evidencias, tarefa, { motor: motor.id, modelos: res.modelos });
    const semEvidencia = res.evidencias.length === 0 || veredito.citadas.length === 0;
    const degradado = res.degradado || semEvidencia;
    const relatorio: RelatorioOrquestra = {
      tarefaId: tarefa.id, motor: motor.id, nome: motor.nome, decisao, ms: Date.now() - t0, uso,
      passos: res.passos, subagentes: res.subagentes, evidencias: res.evidencias.length,
      citadas: veredito.citadas.length, invalidas: veredito.invalidas.length, cobertura: Math.round(veredito.cobertura * 100) / 100,
      aprovado, degradado,
    };
    console.info("[orquestra] concluído", JSON.stringify(relatorio));
    void trilha.concluir({ status: "concluida", evidencias: res.evidencias, texto: veredito.texto, relatorio: { ...relatorio, motivo: res.motivo ?? null, modelos: res.modelos } });
    return {
      answer,
      state: { intent: r.intent, kind: r.kind, mode: r.mode, artifacts: [], degraded: degradado },
      servidoPor: `${motor.nome}${res.subagentes ? ` + ${res.subagentes} subagentes` : ""} · Zaeon Orquestra`,
      relatorio,
    };
  } catch (err) {
    // o aluno não fica sem resposta: a Aura assume. Se foi o PRÓPRIO aluno que cancelou, não.
    const erro = String((err as Error)?.message ?? err).slice(0, 2_000);
    if (e.signal?.aborted) {
      void trilha.concluir({ status: "falhou", evidencias: caixa.evidencias(), erro: `cancelado: ${erro}`, relatorio: { ms: Date.now() - t0 } });
      throw err;
    }
    void trilha.concluir({ status: "fallback", evidencias: caixa.evidencias(), erro, relatorio: { ms: Date.now() - t0 } });
    console.warn(`[orquestra] motor ${motor.id} falhou — a Aura assume:`, String((err as Error)?.message ?? err).slice(0, 240));
    emitirProgresso("orquestra", `${motor.nome} não concluiu — a Aura assume`);
    return runTrajectoryTraced(e.objetivo, e.hctx, depsMemo);
  } finally {
    prazo.liberar();
  }
}
