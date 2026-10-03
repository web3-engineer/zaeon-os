/**
 * lib/map/gatekeeper.ts — o GATEKEEPER (HANDOFF_CEREBRO_AURA §2): barato, roda a cada turno,
 * decide se a conversa é "estudável" e sugere um título. NÃO gera grafo — só grava as flags na
 * Conversation (estudavel/tituloSugerido). O cérebro nasce quando o aluno clica (chain worker).
 *
 * Heurística primeiro (zero custo); 1 chamada CURTA de modelo só na zona cinzenta. Flag
 * ESTUDO_GATEKEEPER (off = não roda). Best-effort: nunca derruba o turno.
 */
import type { StructuredAnswer } from "@/lib/agent/contracts";

export const gatekeeperOn = (): boolean => process.env.ESTUDO_GATEKEEPER === "1";

export type SinalEstudo = { estudavel: boolean; score: number; tituloSugerido: string; motivos: string[] };

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const INTENCAO = /\b(aprender|entender|estudar|explica(r|)|como funciona|o que [eé]|me ensina|quero saber|preciso entender|dominar|revisar|resumo d[eo])\b/;
const PEDIDO_EXPLICITO = /\b(cri(a|e|ar) (um |uma )?(estudo|tcc|trabalho|pesquisa|plano de estudo)|monta (um|uma) (estudo|pesquisa))\b/;

/** Título curto a partir do prompt (1ª frase, sem artigo pendurado) — igual ao das conversas. */
export function tituloDe(texto: string, limite = 48): string {
  const limpo = (texto || "").replace(/\s+/g, " ").trim();
  if (!limpo) return "Estudo";
  const frase = limpo.split(/[.!?\n]/)[0]!.trim() || limpo;
  let base = frase.replace(/^(me |por favor,? |pode |poderia |quero |queria |gostaria de )+/i, "").replace(/^(explica(r)?|explique|ensina(r)?|ensine|entender|aprender|estudar|fala(r)? sobre|o que [eé])\s+/i, "");
  base = base.replace(/^(a|o|as|os|um|uma|de|do|da|sobre)\s+/i, "");
  if (base.length > limite) { const c = base.slice(0, limite); const e = c.lastIndexOf(" "); base = (e > limite * 0.6 ? c.slice(0, e) : c) + "…"; }
  return (base.charAt(0).toUpperCase() + base.slice(1)) || "Estudo";
}

/**
 * Sinais (§2): intenção de aprender/entender; mesmo tema por ≥2–3 turnos; a IA já gerou
 * conceito/artefato. score ≥ 0.6 = estudável; 0.35–0.6 = zona cinzenta (modelo decide).
 */
export function heuristicaEstudavel(input: { prompt: string; history: Array<{ role: string; text: string }>; answer?: Pick<StructuredAnswer, "conceitos" | "artifacts" | "proximos_passos" | "work"> | null }): SinalEstudo {
  const motivos: string[] = [];
  let score = 0;
  const p = norm(input.prompt);
  if (PEDIDO_EXPLICITO.test(p)) { score += 0.7; motivos.push("pedido explícito de estudo/trabalho"); }
  if (INTENCAO.test(p)) { score += 0.35; motivos.push("intenção de aprender"); }
  const turnosAluno = input.history.filter((m) => m.role === "user").length + 1;
  if (turnosAluno >= 3) { score += 0.35; motivos.push("≥3 turnos"); }
  else if (turnosAluno === 2) { score += 0.15; motivos.push("2 turnos"); }
  const a = input.answer;
  const conceitos = a?.conceitos?.filter(Boolean).length ?? 0;
  if (conceitos >= 2) { score += 0.25; motivos.push(`${conceitos} conceitos`); }
  if ((a?.artifacts?.length ?? 0) > 0 || a?.work) { score += 0.25; motivos.push("artefato/trabalho gerado"); }
  if ((a?.proximos_passos?.length ?? 0) > 0) { score += 0.1; motivos.push("próximos passos"); }
  // 1º turno curto e sem sinal de estudo (saudação, pergunta rápida): não é estudo.
  if (turnosAluno === 1 && p.split(/\s+/).length <= 3 && !INTENCAO.test(p)) score -= 0.3;
  score = Math.max(0, Math.min(1, score));
  // Título: o prompt mais antigo do aluno com intenção, senão o atual.
  const semente = [...input.history.filter((m) => m.role === "user").map((m) => m.text), input.prompt].find((t) => INTENCAO.test(norm(t)) || PEDIDO_EXPLICITO.test(norm(t))) ?? input.prompt;
  return { estudavel: score >= 0.6, score, tituloSugerido: tituloDe(semente), motivos };
}

export const ZONA_CINZENTA: [number, number] = [0.35, 0.6];

export const GATEKEEPER_SYSTEM =
  "Você é a Aura decidindo se uma conversa é um ESTUDO (a pessoa quer aprender/entender um tema e vale montar um percurso) " +
  "ou só uma conversa/pergunta pontual. Responda SOMENTE JSON: {\"estudavel\":true|false,\"titulo\":\"título curto do tema (2–6 palavras)\"}";

export type GenJson = <T>(system: string, user: string, opts?: { temperature?: number; model?: string; timeoutMs?: number }) => Promise<T>;

/** Heurística → (zona cinzenta) modelo. Sem modelo, a zona cinzenta fica NÃO estudável (conservador). */
export async function avaliarEstudavel(input: Parameters<typeof heuristicaEstudavel>[0], genJson?: GenJson | null): Promise<SinalEstudo> {
  const h = heuristicaEstudavel(input);
  if (h.score < ZONA_CINZENTA[0] || h.score >= ZONA_CINZENTA[1] || !genJson) return h;
  try {
    const ultimos = input.history.slice(-6).map((m) => `${m.role === "user" ? "Aluno" : "Aura"}: ${m.text.slice(0, 240)}`).join("\n");
    const raw = await genJson<{ estudavel?: unknown; titulo?: unknown }>(GATEKEEPER_SYSTEM, `${ultimos}\nAluno: ${input.prompt.slice(0, 400)}`, { temperature: 0, timeoutMs: 8_000 });
    const estudavel = raw?.estudavel === true;
    const titulo = typeof raw?.titulo === "string" && raw.titulo.trim().length >= 3 ? raw.titulo.trim().slice(0, 60) : h.tituloSugerido;
    return { estudavel, score: estudavel ? Math.max(h.score, 0.6) : h.score, tituloSugerido: titulo, motivos: [...h.motivos, "modelo"] };
  } catch { return h; }
}

// ───────────────────────────── persistência das flags ─────────────────────────────

export type GatekeeperDb = {
  conversation: {
    findFirst(a: { where: { userId: string; surface: string; scopeId: string }; select: { id: true; estudavel: true; mapaId: true } }): Promise<{ id: string; estudavel: boolean; mapaId: string | null } | null>;
    create(a: { data: { userId: string; surface: string; scopeId: string; title: string; estudavel: boolean; tituloSugerido: string } }): Promise<unknown>;
    update(a: { where: { id: string }; data: { estudavel?: boolean; tituloSugerido?: string; mapaId?: string } }): Promise<unknown>;
  };
};

export const SURFACE_CONVERSA = "estudos";

/** Grava as flags (só LIGA `estudavel`; nunca desliga — o aluno pode já ter clicado). Idempotente. */
export async function marcarConversa(db: GatekeeperDb, userId: string, scopeId: string, sinal: SinalEstudo): Promise<void> {
  const conv = await db.conversation.findFirst({ where: { userId, surface: SURFACE_CONVERSA, scopeId }, select: { id: true, estudavel: true, mapaId: true } });
  if (!conv) {
    if (!sinal.estudavel) return; // conversa comum: nem cria linha
    await db.conversation.create({ data: { userId, surface: SURFACE_CONVERSA, scopeId, title: sinal.tituloSugerido, estudavel: true, tituloSugerido: sinal.tituloSugerido } });
    return;
  }
  if (!sinal.estudavel || conv.estudavel || conv.mapaId) return;
  await db.conversation.update({ where: { id: conv.id }, data: { estudavel: true, tituloSugerido: sinal.tituloSugerido } });
}

/** Ponto de entrada do runChatTurn (fire-and-forget). */
export async function gatekeeperDoTurno(input: { userId: string | null; scopeId: string | null; prompt: string; history: Array<{ role: string; text: string }>; answer: StructuredAnswer; genJson?: GenJson | null; db?: GatekeeperDb }): Promise<SinalEstudo | null> {
  if (!gatekeeperOn() || !input.userId || !input.scopeId) return null;
  try {
    const gen = input.genJson === undefined ? await import("@/lib/scholar/gemini").then((m) => m.geminiJson as GenJson).catch(() => null) : input.genJson;
    const sinal = await avaliarEstudavel({ prompt: input.prompt, history: input.history, answer: input.answer }, gen);
    const db = input.db ?? (await import("@/src/lib/prisma")).prisma as unknown as GatekeeperDb;
    await marcarConversa(db, input.userId, input.scopeId, sinal);
    return sinal;
  } catch (e: any) {
    console.warn("[cerebro] gatekeeper falhou:", e?.message ?? e);
    return null;
  }
}
