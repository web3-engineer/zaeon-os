/**
 * POST /api/octa/agente — um turno do agente Octa Code sobre o workspace da IDE (lib/octa/agente).
 * Modelo: o REAL do app, via gateway LiteLLM com VIRTUAL KEY por pessoa (budget curto, reaproveitada até vencer) —
 * a master key nunca sai do servidor e nunca chega ao modelo. Sem gateway configurado = 503 explícito.
 * Qual modelo: lib/octa/modelo (OCTA_MODELO_LOCAL=1 → qwen3-coder da Contabo com o Google de reserva; sem a env = só Google).
 */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth";
import { guard } from "@/src/lib/ratelimit";
import { rodarAgenteOcta, FERRAMENTAS_GATEWAY, type Workspace } from "@/lib/octa/agente";
import { emitirVirtualKey, classificarRespostaGateway, octaGatewayConfigurado, gatewayCfg } from "@/lib/octa/litellm";
import { criarChamadorOcta, nomeDoModelo, type ChamarGateway } from "@/lib/octa/modelo";

export const runtime = "nodejs";
export const maxDuration = 300; // turno no local (CPU) pode levar até OCTA_LOCAL_ORCAMENTO_MS + a reserva

const MAX_ARQUIVOS = 200;
const MAX_BYTES = 1_500_000;
const BUDGET_USD = 1;          // por pessoa, por janela da key
const DURACAO = "2h";

// virtual key por pessoa, reaproveitada até perto de vencer (não cria uma key por turno no banco do gateway)
const chaves = new Map<string, { key: string; ate: number }>();
async function chaveDe(userId: string, sessionId: string): Promise<string> {
  const c = chaves.get(userId);
  if (c && c.ate > Date.now() + 60_000) return c.key;
  const r = await emitirVirtualKey({ userId, sessionId, maxBudgetUsd: BUDGET_USD, duracao: DURACAO });
  if (!r.ok) throw new Error(r.error);
  chaves.set(userId, { key: r.vk.key, ate: Date.now() + 2 * 3600_000 });
  return r.vk.key;
}

function lerWorkspace(v: unknown): Workspace | null {
  if (!v || typeof v !== "object") return null;
  const out: Workspace = {};
  let bytes = 0;
  for (const [p, c] of Object.entries(v as Record<string, unknown>)) {
    if (typeof c !== "string") continue;
    bytes += c.length + p.length;
    out[p] = c;
  }
  return Object.keys(out).length <= MAX_ARQUIVOS && bytes <= MAX_BYTES ? out : null;
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!octaGatewayConfigurado()) return NextResponse.json({ error: "gateway_off", detalhe: "O gateway de modelo (LiteLLM) não está ligado neste servidor." }, { status: 503 });
  const rl = await guard(req, "octa-agente", "ai-heavy");
  if (!rl.ok) return rl.response;

  const body = await req.json().catch(() => ({} as any));
  const pedido = typeof body.pedido === "string" ? body.pedido.trim().slice(0, 8000) : "";
  const workspace = lerWorkspace(body.workspace);
  if (!pedido) return NextResponse.json({ error: "pedido vazio" }, { status: 400 });
  if (!workspace) return NextResponse.json({ error: `projeto grande demais (máx. ${MAX_ARQUIVOS} arquivos / 1,5 MB)` }, { status: 413 });
  const modo = body.modo === "change" ? "change" : "review";
  const liberados = Array.isArray(body.liberados) ? body.liberados.filter((x: unknown) => typeof x === "string").slice(0, 50) : [];
  const historico = Array.isArray(body.historico)
    ? body.historico.filter((m: any) => (m?.role === "user" || m?.role === "assistant") && typeof m.content === "string").slice(-12).map((m: any) => ({ role: m.role, content: m.content.slice(0, 6000) }))
    : [];
  const userId = (session.user as any).id ?? email;
  const sessionId = `octa-${Date.now().toString(36)}`;

  try {
    const key = await chaveDe(userId, sessionId);
    const gateway: ChamarGateway = async (model, msgs, signal) => {
      const r = await fetch(`${gatewayCfg().url}/chat/completions`, {
        method: "POST", signal,
        headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
        body: JSON.stringify({ model, messages: msgs, tools: FERRAMENTAS_GATEWAY, temperature: 0.2 }),
      });
      const cls = await classificarRespostaGateway(r.clone());
      if (!cls.ok) { if (cls.code === "budget_exceeded") chaves.delete(userId); throw new Error(cls.error); }
      const j: any = await r.json();
      const m = j.choices?.[0]?.message ?? {};
      return { content: m.content ?? null, tool_calls: m.tool_calls, usage: j.usage, modeloId: r.headers.get("x-litellm-model-id") };
    };
    const chamar = criarChamadorOcta(gateway);
    const r = await rodarAgenteOcta({ historico, pedido, workspace, modo, liberados, arquivoAtivo: typeof body.arquivoAtivo === "string" ? body.arquivoAtivo : undefined }, chamar, { sessionId, userId });
    const servidos = chamar.servidos;
    console.info(`[octa] ${sessionId} ${servidos.map((x) => `${x.modelo}(${x.modeloId ?? "?"}) ${x.ms}ms${x.motivo ? ` ←${x.motivo}` : ""}`).join(" · ")}`);
    const ultimo = servidos.at(-1)?.modelo;
    return NextResponse.json({
      resposta: r.resposta, edicoes: r.edicoes, apagados: r.apagados, negados: r.negados,
      sinais: r.sinais, passos: r.passos, modelo: ultimo && nomeDoModelo(ultimo),
      servidoPor: servidos.map((x) => ({ modelo: nomeDoModelo(x.modelo), ms: x.ms, motivo: x.motivo })),
      custo: { tokensEntrada: r.custo.tokensEntrada, tokensSaida: r.custo.tokensSaida },
    });
  } catch (e: any) {
    const msg = String(e?.message ?? e);
    return NextResponse.json({ error: /orçamento/.test(msg) ? "budget" : "falha_modelo", detalhe: msg }, { status: /orçamento/.test(msg) ? 402 : 502 });
  }
}
