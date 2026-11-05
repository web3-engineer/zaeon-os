/**
 * scripts/eval-chat/chamadas.ts — QUANTAS CHAMADAS SEQUENCIAIS AO MODELO POR TURNO, sem Vertex.
 *
 * Por que existe: `rascunho.ts` e `fases.ts` medem SEGUNDOS, e por isso exigem Vertex real, crédito e
 * o container de prod (`docker exec -w /app zaeon_web`). Quando a pergunta é "por que ficou mais
 * lento?", o que manda não é o segundo de cada chamada — é QUANTAS chamadas o turno enfileira uma
 * atrás da outra. Isso é estrutura, e estrutura se mede com um modelo falso: cada chamada dorme
 * ATRASO_MS, então o relógio de parede divide pelo atraso e revela a PROFUNDIDADE do caminho
 * (sequencial), separada da largura (as tools que vão em Promise.all).
 *
 *   npx tsx scripts/eval-chat/chamadas.ts
 *   ATRASO_MS=500 npx tsx scripts/eval-chat/chamadas.ts
 *
 * Não toca em rede, banco, nem ledger: `genJson` e `runTool` são injetados.
 */
import { buildHarnessDeps } from "@/lib/agent/aura-harness";
import { runTrajectoryTraced } from "@/lib/agent/trajectory";
import { GEMINI_MODEL_FLASH, GEMINI_MODEL_PRO } from "@/lib/ai/model";
import { proNasPesadasLigado } from "@/lib/ai/proNasPesadas";
import type { ToolContext } from "@/lib/agent/runtime";

const ATRASO_MS = Number(process.env.ATRASO_MS) || 300;
const dormir = (n: number) => new Promise((r) => setTimeout(r, n));

/** os três roteamentos que cobrem o chat: o papo, a explicação (o caso comum) e o trabalho */
const ROTAS = [
  { nome: "quick · 'oi, tudo bem?'", pergunta: "oi, tudo bem?", rota: { intent: "conversa", mode: "quick", academicMode: "flexible" } },
  { nome: "elaborated · 'explique a fotossíntese'", pergunta: "explique a fundo como funciona a fotossíntese", rota: { intent: "explicar_conceito", mode: "elaborated", academicMode: "flexible" } },
  { nome: "research · 'escreva um artigo'", pergunta: "escreva um artigo sobre a guerra fria", rota: { intent: "criar_trabalho", mode: "research", academicMode: "flexible", kind: "artigo" } },
] as const;

/**
 * Os dois estados que a pergunta do dono compara. `hoje` é o que o deploy.yml de hoje produz:
 * RACIOCINIO_ELABORADO=1 (linha 115) e todo HARNESS_* vazio, que o código lê como LIGADO
 * (decisão de 03/nov). `out24` é o que o perf de 24/out deixou no ar: a fase `reason` pulada no
 * elaborated e o harness F2–F7 ainda não existindo.
 */
const CENARIOS: Record<string, Record<string, string | undefined>> = {
  "out/24 (como o perf deixou)": { RACIOCINIO_ELABORADO: undefined, HARNESS_ACAO: "0", HARNESS_VOLTAS_ACAO: "0", HARNESS_SINTESE: "0", HARNESS_GRAFICO: "0", HARNESS_ANEXO: "0", PRO_PESADAS: "0", MCP_CONECTORES: "" },
  "hoje (deploy.yml atual)":     { RACIOCINIO_ELABORADO: "1", HARNESS_ACAO: undefined, HARNESS_VOLTAS_ACAO: undefined, HARNESS_SINTESE: undefined, HARNESS_GRAFICO: undefined, HARNESS_ANEXO: undefined, PRO_PESADAS: undefined, MCP_CONECTORES: "scholar" },
};

type Medida = { chamadas: number; fases: string[]; modelos: Record<string, string>; tools: number; parede: number };

async function medir(rota: any, pergunta: string): Promise<Medida> {
  const fases: string[] = [];
  const modelos: Record<string, string> = {};
  let tools = 0;

  const genJson = async (system: string, _user?: string, o?: any): Promise<any> => {
    if (o?.phase) { fases.push(o.phase); if (o?.model) modelos[o.phase] = o.model; }
    await dormir(ATRASO_MS);
    if (/Você decide se FALTA/.test(system)) return { pronto: true };     // F2 `acao`: "já basta"
    if (/subquestions/i.test(system)) return { subquestions: ["q1"] };    // `plan`
    if (/reasoning/i.test(system)) return { reasoning: "R" };             // `reason`
    return { nucleo: "N", work: { titulo: "T" }, proximos_passos: ["p"], evidencia: [{ claim: "c" }] };
  };

  const runToolImpl = async () => { tools++; await dormir(ATRASO_MS); return { ok: true, findings: [{ claim: "c", source: { title: "P" }, confidence: "média" }], provenance: {} } as any; };

  const ctx: ToolContext = { activeTab: "estudos", plan: "pro", execMode: "auto" };
  const deps = buildHarnessDeps(ctx, {
    genJson: genJson as any, runToolImpl, retryDelayMs: 0,
    modelo: GEMINI_MODEL_FLASH, modeloEhPadrao: true, proNasPesadas: proNasPesadasLigado(),
  } as any);
  (deps as any).classify = async () => ({ ...rota });

  const t = performance.now();
  await runTrajectoryTraced(pergunta, ctx, deps);
  return { chamadas: fases.length, fases, modelos, tools, parede: Math.round(performance.now() - t) };
}

function aplicar(cfg: Record<string, string | undefined>) {
  for (const [k, v] of Object.entries(cfg)) { if (v === undefined) delete process.env[k]; else process.env[k] = v; }
}

async function main() {
  console.log(`\nMEDIÇÃO: chamadas sequenciais ao modelo por turno (atraso falso de ${ATRASO_MS} ms por chamada)`);
  console.log(`Flash=${GEMINI_MODEL_FLASH} · Pro=${GEMINI_MODEL_PRO}\n`);
  const tabela: any[] = [];
  for (const [nome, cfg] of Object.entries(CENARIOS)) {
    aplicar(cfg);
    for (const r of ROTAS) {
      const m = await medir(r.rota, r.pergunta);
      tabela.push({ cenario: nome, turno: r.nome, chamadas: m.chamadas, tools: m.tools, "parede(ms)": m.parede, "profundidade≈": +(m.parede / ATRASO_MS).toFixed(1) });
      console.log(`[${nome}] ${r.nome}`);
      console.log(`   chamadas=${m.chamadas}  fases=${m.fases.join(" → ")}`);
      console.log(`   tools=${m.tools}  parede=${m.parede} ms  (≈${(m.parede / ATRASO_MS).toFixed(1)} chamadas de profundidade)`);
      const pro = Object.entries(m.modelos).filter(([, v]) => v === GEMINI_MODEL_PRO).map(([k]) => k);
      console.log(`   no PRO: ${pro.length ? pro.join(", ") : "nenhuma"}\n`);
    }
  }
  console.table(tabela);

  // ───────── ISOLAÇÃO: qual flag custa qual chamada ─────────
  // Por que existe: a primeira leitura desta medição atribuiu a chamada `acao` à HARNESS_ACAO
  // sozinha, e estava ERRADO — `HARNESS_ACAO` ligada com `HARNESS_VOLTAS_ACAO=0` não chama nada. A
  // `acao` exige o PAR. Mudar várias flags juntas e repartir o resultado é chute; isolar é medir.
  console.log("\nISOLAÇÃO (turno elaborated, uma flag por vez a partir da base de out/24):\n");
  const BASE = { ...CENARIOS["out/24 (como o perf deixou)"] };
  const iso: any[] = [];
  for (const [nome, mud] of [
    ["base out/24", {}],
    ["+ HARNESS_ACAO (só ela)", { HARNESS_ACAO: undefined }],
    ["+ HARNESS_VOLTAS_ACAO (só ela)", { HARNESS_VOLTAS_ACAO: undefined }],
    ["+ as DUAS da F2 (o par)", { HARNESS_ACAO: undefined, HARNESS_VOLTAS_ACAO: undefined }],
    ["+ RACIOCINIO_ELABORADO=1 (só ela)", { RACIOCINIO_ELABORADO: "1" }],
    ["o par + RACIOCINIO=1 (= HOJE)", { HARNESS_ACAO: undefined, HARNESS_VOLTAS_ACAO: undefined, RACIOCINIO_ELABORADO: "1" }],
  ] as [string, Record<string, string | undefined>][]) {
    aplicar(BASE); aplicar(mud);
    const m = await medir(ROTAS[1].rota, ROTAS[1].pergunta);
    iso.push({ config: nome, chamadas: m.chamadas, fases: m.fases.join(" → ") });
  }
  console.table(iso);
}
main().catch((e) => { console.error(e); process.exit(1); });
