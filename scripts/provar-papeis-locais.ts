/**
 * scripts/provar-papeis-locais.ts — mede os modelos da Contabo pelo gateway e prova os papéis (lib/llm/papeis).
 *
 *   docker exec zaeon_web npx tsx scripts/provar-papeis-locais.ts --medir          # latência crua (stream) por modelo
 *   docker exec zaeon_web npx tsx scripts/provar-papeis-locais.ts --papeis         # código do app: guarda + gatekeeper + juiz da árvore
 *   docker exec zaeon_web npx tsx scripts/provar-papeis-locais.ts --papeis --forcar-falha   # key local inválida → fallback Google
 *
 * --medir: 2 chamadas seguidas por modelo (a 1ª pode ser fria): TTFT, total, tokens de saída, tok/s de geração.
 * --papeis: chama as funções REAIS (envelope → ledger) e relê as linhas do TokenLedger desta execução (alvo contabo|vertex).
 * Nunca imprime key nem texto de aluno (os prompts aqui são fixos, sintéticos).
 */
import { readFileSync, existsSync } from "node:fs";

for (const f of [".env", ".env.secrets", ".env.local"]) {
  if (!existsSync(f)) continue;
  for (const linha of readFileSync(f, "utf8").split("\n")) {
    const m = /^\s*(?:export\s+)?([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(linha);
    if (!m || m[1] in process.env) continue;
    process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, "$2");
  }
}
const args = process.argv.slice(2);
const FORCAR_FALHA = args.includes("--forcar-falha");

const PROMPTS: Record<string, { messages: { role: string; content: string }[]; max: number }> = {
  "zaeon-local-mini": {
    messages: [
      { role: "system", content: 'Você é a Aura decidindo se uma conversa é um ESTUDO. Responda SOMENTE JSON: {"estudavel":true|false,"titulo":"2–6 palavras"}' },
      { role: "user", content: "Aluno: quero entender como funciona a fotossíntese nas plantas C4 /no_think" },
    ],
    max: 60,
  },
  "zaeon-local-guard": { messages: [{ role: "user", content: "Como eu explico a Segunda Guerra Mundial para uma prova de história?" }], max: 10 },
  "zaeon-local-geral": {
    messages: [{ role: "user", content: "Resuma em 3 frases o que é a fotossíntese." }],
    max: 200,
  },
};

async function medirUm(url: string, key: string, model: string): Promise<string> {
  const p = PROMPTS[model]!;
  const ini = Date.now();
  let ttft = 0, texto = "", usage: any = null;
  const r = await fetch(`${url}/v1/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model, messages: p.messages, max_tokens: p.max, temperature: 0, stream: true, stream_options: { include_usage: true },
      ...(model === "zaeon-local-mini" ? { reasoning_effort: "none" } : {}),
    }),
    signal: AbortSignal.timeout(300_000),
  });
  if (!r.ok || !r.body) return `${model}: HTTP ${r.status} ${(await r.text()).slice(0, 120)}`;
  const dec = new TextDecoder();
  let buf = "";
  for await (const chunk of r.body as any) {
    buf += dec.decode(chunk, { stream: true });
    let i;
    while ((i = buf.indexOf("\n")) >= 0) {
      const linha = buf.slice(0, i).trim(); buf = buf.slice(i + 1);
      if (!linha.startsWith("data:") || linha === "data: [DONE]") continue;
      try {
        const j = JSON.parse(linha.slice(5));
        const d = j?.choices?.[0]?.delta;
        const pedaco = (d?.content ?? "") + (d?.reasoning_content ?? "");
        if (pedaco && !ttft) ttft = Date.now() - ini;
        texto += d?.content ?? "";
        if (j?.usage) usage = j.usage;
      } catch { /* keep-alive */ }
    }
  }
  const total = Date.now() - ini;
  const saida = Number(usage?.completion_tokens ?? 0);
  const geracaoS = Math.max(0.001, (total - ttft) / 1000);
  return `${model.padEnd(18)} ttft=${(ttft / 1000).toFixed(1)}s total=${(total / 1000).toFixed(1)}s prompt=${usage?.prompt_tokens ?? "?"} saida=${saida} tok/s=${saida ? (saida / geracaoS).toFixed(1) : "?"} → ${JSON.stringify(texto.trim().slice(0, 60))}`;
}

async function medir() {
  const { chaveLocal } = await import("../lib/llm/papeis");
  const url = (process.env.GATEWAY_URL ?? "").replace(/\/+$/, "");
  const key = chaveLocal();
  if (!url || !key) { console.error("sem GATEWAY_URL / GATEWAY_KEY_LOCAL|GATEWAY_MASTER_KEY"); process.exit(2); }
  for (const model of Object.keys(PROMPTS)) {
    for (const rodada of ["1ª", "2ª"]) console.log(`[medir] ${rodada} ${await medirUm(url, key, model).catch((e) => `${model}: ${e?.message ?? e}`)}`);
  }
}

async function papeis() {
  if (FORCAR_FALHA) process.env.GATEWAY_KEY_LOCAL = "sk-invalida-prova-fallback";
  const { papelLocalLigado } = await import("../lib/llm/papeis");
  const { moderar } = await import("../lib/llm/guarda");
  const { avaliarEstudavel } = await import("../lib/map/gatekeeper");
  const { assessMastery } = await import("../lib/skilltree/assess");
  const { gerarPapelJson } = await import("../lib/llm/papeis");
  console.log(`[papeis] guarda ligado=${papelLocalLigado("guarda")} mini ligado=${papelLocalLigado("mini")} forcarFalha=${FORCAR_FALHA}`);
  const desde = new Date();

  const m1 = await moderar("Como eu explico a Segunda Guerra Mundial para uma prova de história?", { surface: "estudos" });
  console.log(`[papeis] guarda   seguro=${m1.seguro} cat=${m1.categorias.join(",") || "-"} alvo=${m1.alvo} fallback=${m1.fallback ?? "-"} ms=${m1.ms}`);

  let infoMini = "";
  const gen = async <T,>(system: string, user: string, o?: { temperature?: number; timeoutMs?: number }) => {
    const { valor, res } = await gerarPapelJson<T>("mini", { system, user, temperature: o?.temperature, timeoutMs: o?.timeoutMs, ctx: { agentKey: "aura", surface: "estudos", phase: "gatekeeper" } });
    infoMini = `alvo=${res.alvo} fallback=${res.fallback ?? "-"} ms=${res.ms}`;
    return valor;
  };
  // score 0.35 (intenção de aprender, 1º turno) = zona cinzenta → o modelo decide.
  const s = await avaliarEstudavel({ prompt: "quero entender a fotossíntese", history: [], answer: null }, gen);
  console.log(`[papeis] gatekeeper estudavel=${s.estudavel} titulo=${JSON.stringify(s.tituloSugerido)} motivos=${s.motivos.join("|")} ${infoMini}`);

  const a = await assessMastery({
    node: { id: "n1", title: "Fase clara da fotossíntese", branch: "biologia", level: 1, summary: "Luz quebra a água, gera ATP e NADPH." } as any,
    topicLabel: "Fotossíntese",
    message: "Na fase clara a luz excita a clorofila, a água é quebrada liberando O2, e a energia vira ATP e NADPH que vão pro ciclo de Calvin.",
  });
  console.log(`[papeis] juiz      score=${a.score} note=${JSON.stringify(a.note ?? "")}`);

  await new Promise((r) => setTimeout(r, 1500)); // o ledger é fire-and-forget
  const { prisma } = await import("../src/lib/prisma");
  const linhas = await (prisma as any).tokenLedger.findMany({
    where: { at: { gte: desde }, phase: { in: ["guarda", "gatekeeper", "assess"] } },
    orderBy: { at: "asc" },
    select: { phase: true, model: true, alvo: true, ok: true, erro: true, ms: true, totalTokens: true, estimatedCostUsd: true },
  });
  for (const l of linhas) console.log(`[ledger] ${String(l.phase).padEnd(10)} ${String(l.model).padEnd(24)} alvo=${l.alvo} ok=${l.ok} erro=${l.erro ?? "-"} ms=${l.ms} tokens=${l.totalTokens} custo=${l.estimatedCostUsd}`);
  await (prisma as any).$disconnect?.();
}

if (args.includes("--medir")) await medir();
if (args.includes("--papeis")) await papeis();
if (!args.includes("--medir") && !args.includes("--papeis")) console.log("use --medir e/ou --papeis [--forcar-falha]");
process.exit(0);
