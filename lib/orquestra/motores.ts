/**
 * lib/orquestra/motores.ts — o REGISTRO de motores. Arquiteturas diferentes convivendo:
 *
 *  | motor                 | origem   | formato  | arquitetura                                                     |
 *  |-----------------------|----------|----------|-----------------------------------------------------------------|
 *  | (aura)                | zaeon    | unico    | o harness de hoje — fica no orquestrador, não aqui (ver lá)     |
 *  | deepseek-v4-profundo  | deepseek | profundo | DeepSeek V4 Pro, ReAct nativo, raciocínio entre as chamadas     |
 *  | tongyi-deepresearch   | alibaba  | profundo | Tongyi DeepResearch 30B-A3B (RL pra pesquisa longa)             |
 *  | kimi-enxame           | moonshot | enxame   | Kimi K2.6 orquestrando subagentes Kimi (o desenho do PARL)      |
 *  | enxame-misto          | zaeon    | enxame   | orquestrador + subagentes de laboratórios DIFERENTES em rodízio |
 *  | http:<id>             | (env)    | (env)    | serviço Python que fala o contrato (research-engine)            |
 *
 * Motor novo = um objeto aqui + uma linha no array. O roteador escolhe pelo formato e pela
 * preferência do env; a arena (scripts/orquestra/arena.ts) compara todos na mesma tarefa.
 */
import type { Evidencia, Execucao, Formato, Motor, Origem, ResultadoMotor, Tarefa } from "@/lib/orquestra/contrato";
import { rodarAgente } from "@/lib/orquestra/react";
import { rodarEnxame } from "@/lib/orquestra/enxame";
import { MODELOS, modeloDisponivel, type ModeloId } from "@/lib/orquestra/provedores";
import { pedidoDaTarefa, sistemaDoPesquisador } from "@/lib/orquestra/prompts";

type Env = Record<string, string | undefined>;

function motorProfundo(id: string, origem: Origem, modelo: ModeloId, descricao: string, opts: { passos: number; temperatura: number }): Motor {
  return {
    id, nome: MODELOS[modelo].nome, origem, formato: "profundo", descricao,
    disponivel: (env) => modeloDisponivel(modelo, env),
    async rodar(t: Tarefa, x: Execucao): Promise<ResultadoMotor> {
      const passos = Number(x.env.ORQ_PASSOS_PROFUNDO) > 0 ? Number(x.env.ORQ_PASSOS_PROFUNDO) : opts.passos;
      const r = await rodarAgente({
        nome: MODELOS[modelo].nome, modelo, fase: "orquestra", taskId: t.id,
        sistema: sistemaDoPesquisador(t, `o agente de pesquisa ${MODELOS[modelo].nome}`),
        pedido: pedidoDaTarefa(t),
        maxPassos: passos, maxTokensResposta: 8_000, temperatura: opts.temperatura,
      }, x);
      return {
        texto: r.texto, evidencias: x.caixa.evidencias(), uso: r.uso, modelos: r.modelos,
        passos: r.passos, subagentes: 0, degradado: r.forcado,
        motivo: r.forcado ? "concluído à força (prazo ou teto de passos)" : undefined,
      };
    },
  };
}

export const deepseekProfundo = motorProfundo(
  "deepseek-v4-profundo", "deepseek", "deepseek-v4-pro",
  "DeepSeek V4 Pro em laço ReAct longo, com function-calling nativo e o raciocínio mantido entre as chamadas.",
  { passos: 30, temperatura: 0.4 },
);

export const tongyiDeepResearch = motorProfundo(
  "tongyi-deepresearch", "alibaba", "tongyi-deepresearch",
  "Tongyi DeepResearch 30B-A3B (Alibaba, Apache-2.0), treinado por RL para pesquisa de horizonte longo.",
  // 0.6 é o que o repositório do Tongyi recomenda para inferência
  { passos: 40, temperatura: 0.6 },
);

export const kimiEnxame: Motor = {
  id: "kimi-enxame", nome: "Kimi K2.6 · enxame", origem: "moonshot", formato: "enxame",
  descricao: "Kimi K2.6 como orquestrador criando subagentes Kimi em paralelo, no runtime de enxame da Zaeon.",
  disponivel: (env) => modeloDisponivel("kimi-k2.6", env),
  rodar: (t, x) => rodarEnxame(t, x, { nome: "Kimi K2.6", orquestrador: "kimi-k2.6", trabalhadores: ["kimi-k2.6"] }),
};

/** os trabalhadores do enxame misto: um de cada laboratório disponível, na ordem do env */
export function trabalhadoresMistos(env: Env): ModeloId[] {
  const pedidos = (env.ORQ_TRABALHADORES_MISTOS || "deepseek-v4-flash,kimi-k2.6,tongyi-deepresearch,qwen")
    .split(",").map((s) => s.trim()).filter((s): s is ModeloId => s in MODELOS);
  return pedidos.filter((m) => modeloDisponivel(m, env));
}

export function orquestradorMisto(env: Env): ModeloId | null {
  const pedidos = (env.ORQ_ORQUESTRADOR_MISTO || "kimi-k2.6,deepseek-v4-pro").split(",").map((s) => s.trim()).filter((s): s is ModeloId => s in MODELOS);
  return pedidos.find((m) => modeloDisponivel(m, env)) ?? null;
}

export const enxameMisto: Motor = {
  id: "enxame-misto", nome: "Enxame misto", origem: "zaeon", formato: "enxame",
  descricao: "Orquestrador (Kimi ou DeepSeek) com subagentes de laboratórios diferentes em rodízio — arquiteturas distintas na mesma tarefa.",
  disponivel: (env) => !!orquestradorMisto(env) && trabalhadoresMistos(env).length >= 2,
  rodar: (t, x) => {
    const orq = orquestradorMisto(x.env)!;
    return rodarEnxame(t, x, { nome: `Enxame misto (${MODELOS[orq].nome})`, orquestrador: orq, trabalhadores: trabalhadoresMistos(x.env) });
  },
};

// ───────────────────────────── motor HTTP (serviços Python: research-engine) ─────────────────────────────
type MotorHttpSpec = { id: string; nome: string; origem: Origem; formato: Formato; url: string; token?: string };

/** "zaeon-sugestao:unico:zaeon,storm:profundo:outro" + RESEARCH_ENGINE_URL → specs. Vazio = nenhum. */
export function motoresHttpDoEnv(env: Env): MotorHttpSpec[] {
  const url = env.RESEARCH_ENGINE_URL?.trim();
  const lista = env.ORQ_MOTORES_HTTP?.trim();
  if (!url || !lista) return [];
  const formatos: Formato[] = ["unico", "profundo", "enxame"];
  const origens: Origem[] = ["zaeon", "alibaba", "deepseek", "moonshot", "outro"];
  return lista.split(",").map((s) => s.trim()).filter(Boolean).map((item) => {
    const [id, f, o] = item.split(":");
    return {
      id: `http:${id}`, nome: id, url,
      formato: (formatos as string[]).includes(f) ? (f as Formato) : "unico",
      origem: (origens as string[]).includes(o) ? (o as Origem) : "outro",
      token: env.MOTOR_TOKEN?.trim() || undefined,
    };
  });
}

export function motorHttp(spec: MotorHttpSpec, fetchImpl: typeof fetch = fetch): Motor {
  return {
    id: spec.id, nome: spec.nome, origem: spec.origem, formato: spec.formato,
    descricao: `Serviço Python (${spec.url}) que fala o contrato de motor da Zaeon.`,
    disponivel: () => true,
    async rodar(t, x) {
      // o serviço não tem as nossas ferramentas: a Zaeon junta a evidência ANTES e manda junto
      if (x.caixa.visiveis().some((f) => f.name === "literature_search")) {
        x.emitir({ fase: "ferramenta", rotulo: `literature_search: ${t.objetivo.slice(0, 80)}`, agente: "Zaeon" });
        await x.caixa.executar("literature_search", { query: t.objetivo.slice(0, 300) }, "Zaeon", x.prazo);
      }
      const enviadas = x.caixa.evidencias();
      const res = await fetchImpl(`${spec.url.replace(/\/+$/, "")}/motor/v1/tarefas`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(spec.token ? { Authorization: `Bearer ${spec.token}` } : {}) },
        body: JSON.stringify({
          id: t.id, motor: spec.id.replace(/^http:/, ""), objetivo: t.objetivo, intent: t.intent, contexto: t.contexto ?? null,
          prazo_ms: Math.max(10_000, x.prazo.restante() - 5_000),
          evidencias: enviadas.map((e) => ({ chave: e.chave, claim: e.claim, source: { title: e.source?.title ?? e.claim.slice(0, 120), url: e.source?.url ?? null, authors: e.source?.authors ?? null, year: e.source?.year ?? null } })),
        }),
        signal: x.prazo.signal,
      });
      if (!res.ok) throw new Error(`motor http ${spec.id} respondeu ${res.status}`);
      const d: any = await res.json();
      // evidência NOVA do serviço entra no registro com chave nossa; o texto é remapeado
      const extras: Evidencia[] = (Array.isArray(d?.evidencias) ? d.evidencias : [])
        .filter((e: any) => e?.chave && !x.caixa.existe(String(e.chave)))
        .map((e: any) => ({ chave: String(e.chave), claim: String(e.claim ?? ""), source: e.source ? { title: String(e.source.title ?? ""), url: e.source.url ?? undefined, authors: e.source.authors ?? undefined, year: e.source.year ?? undefined } : undefined, ferramenta: spec.id, agente: spec.nome }));
      const mapa = x.caixa.importar(extras);
      const texto = String(d?.texto ?? "").replace(/\[(E\d+)\]/g, (m, k: string) => (mapa.has(k) ? `[${mapa.get(k)}]` : m));
      return {
        texto, evidencias: x.caixa.evidencias(),
        uso: { promptTokens: Number(d?.uso?.prompt_tokens) || 0, completionTokens: Number(d?.uso?.completion_tokens) || 0, chamadas: Number(d?.uso?.chamadas) || 0, custoUsd: 0 },
        modelos: Array.isArray(d?.modelos) ? d.modelos.map(String) : [], passos: Number(d?.passos) || 0, subagentes: 0, degradado: !!d?.degradado,
      };
    },
  };
}

export const MOTORES_NATIVOS: readonly Motor[] = [deepseekProfundo, tongyiDeepResearch, kimiEnxame, enxameMisto];

export function todosOsMotores(env: Env = process.env): Motor[] {
  return [...MOTORES_NATIVOS, ...motoresHttpDoEnv(env).map((s) => motorHttp(s))];
}

export function motorPorId(id: string, env: Env = process.env): Motor | undefined {
  return todosOsMotores(env).find((m) => m.id === id);
}
