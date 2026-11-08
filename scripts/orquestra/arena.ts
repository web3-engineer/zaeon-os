/**
 * scripts/orquestra/arena.ts — a ARENA DOS MOTORES: a mesma tarefa em cada arquitetura, com as MESMAS
 * ferramentas da casa, medida pelo MESMO portão. É o que transforma "testar tudo do open source" em
 * número em vez de achismo (docs/ORQUESTRA.md §arena).
 *
 *   docker exec -w /app zaeon_web npx tsx scripts/orquestra/arena.ts                  # todos os motores com chave
 *   ARENA_MOTORES=kimi-enxame,deepseek-v4-profundo docker exec … npx tsx scripts/orquestra/arena.ts
 *   ARENA_AURA=1  …   # inclui a Aura (harness de hoje) como linha de base — precisa do Vertex
 *   ARENA_N=2     …   # só as 2 primeiras tarefas
 *   npx tsx --env-file=.env scripts/orquestra/arena.ts                                # local (o tsx não lê o .env sozinho)
 *
 * Mede por motor: tempo, custo estimado, nº de evidências, citações válidas/inventadas, cobertura de
 * fonte por parágrafo, subagentes. Qualidade: JUIZ CEGO POR PARES contra a linha de base (a Aura, ou
 * o primeiro motor), ordem sorteada, juiz de OUTRA família (Gemini, pelo envelope) pra não premiar
 * o próprio estilo. NÃO grava no TokenLedger nem cria conversa.
 */
import { buildHarnessDeps } from "@/lib/agent/aura-harness";
import type { IntentId, StructuredAnswer, WorkKind } from "@/lib/agent/contracts";
import "@/lib/agent/runtime"; // registra literature_search / web_search / memory_search no registry
import { orquestrarTurno } from "@/lib/orquestra/orquestrador";
import { todosOsMotores } from "@/lib/orquestra/motores";
import { criarChamarModelo } from "@/lib/orquestra/provedores";

type TarefaArena = { objetivo: string; intent: IntentId; kind?: WorkKind };
const TAREFAS: TarefaArena[] = [
  { objetivo: "Faça um levantamento das principais fontes científicas sobre o uso de CRISPR para resistência à seca em culturas agrícolas, apontando lacunas.", intent: "pesquisar_fontes" },
  { objetivo: "Escreva um artigo acadêmico curto sobre os efeitos do uso de redes sociais na saúde mental de adolescentes.", intent: "criar_trabalho", kind: "artigo" },
  { objetivo: "Quais são as evidências atuais sobre a eficácia de vacinas de mRNA contra variantes do SARS-CoV-2? Compare estudos.", intent: "pesquisar_fontes" },
  { objetivo: "Escreva um relatório sobre o impacto da inteligência artificial no mercado de trabalho brasileiro.", intent: "criar_trabalho", kind: "relatorio" },
];

const textoDe = (a: StructuredAnswer): string =>
  [a.nucleo, a.desenvolvimento ?? "", ...(a.work?.sections ?? []).map((s) => `## ${s.title}\n${s.body}`)].filter(Boolean).join("\n\n");

type Linha = { motor: string; tarefa: number; ms: number; custoUsd: number; evidencias: number; citadas: number; invalidas: number; cobertura: number; subagentes: number; erro?: string; texto: string };

async function main() {
  const n = Number(process.env.ARENA_N) || TAREFAS.length;
  const tarefas = TAREFAS.slice(0, n);
  const pedidos = process.env.ARENA_MOTORES?.split(",").map((s) => s.trim()).filter(Boolean);
  const motores = todosOsMotores().filter((m) => m.disponivel(process.env) && (!pedidos || pedidos.includes(m.id)));
  const ids = [...(process.env.ARENA_AURA === "1" ? ["aura"] : []), ...motores.map((m) => m.id)];
  if (ids.length < 1) { console.error("[arena] nenhum motor disponível (faltam chaves: DEEPSEEK_API_KEY, MOONSHOT_API_KEY, OPENROUTER_API_KEY…)"); process.exit(2); }
  console.error(`[arena] motores: ${ids.join(", ")} · tarefas: ${tarefas.length}`);

  const semLedger = criarChamarModelo({}); // sem `registrar`: a arena não suja o TokenLedger
  const linhas: Linha[] = [];
  for (const [ti, t] of tarefas.entries()) {
    for (const id of ids) {
      const hctx: any = { plan: "free", execMode: "auto", activeTab: "sala-de-estudos" };
      const deps = { ...buildHarnessDeps(hctx, { ledger: { agentKey: "arena", surface: "estudos" } as any }), classify: async () => ({ intent: t.intent, mode: "research" as const, academicMode: "enforced" as any, kind: t.kind }) };
      const t0 = Date.now();
      try {
        const env = id === "aura" ? { ...process.env, ORQUESTRA: "off" } : { ...process.env, ORQUESTRA: "on", ORQ_MOTOR: id };
        const r = await orquestrarTurno({
          objetivo: t.objetivo, hctx, deps, userId: null, emSegundoPlano: true, trabalhoGeradoNoCliente: false,
          history: [], ledger: { agentKey: "arena", surface: "estudos" }, narrar: () => undefined, env, plano: "max", chamar: semLedger,
        });
        const rel = (r as any).relatorio;
        linhas.push({
          motor: id, tarefa: ti, ms: Date.now() - t0, custoUsd: rel?.uso?.custoUsd ?? 0,
          evidencias: rel?.evidencias ?? (r.answer.evidencia?.length ?? 0), citadas: rel?.citadas ?? 0, invalidas: rel?.invalidas ?? 0,
          cobertura: rel?.cobertura ?? 0, subagentes: rel?.subagentes ?? 0, texto: textoDe(r.answer),
          ...(id !== "aura" && !rel ? { erro: "o motor falhou e a Aura respondeu" } : {}),
        });
      } catch (e) {
        linhas.push({ motor: id, tarefa: ti, ms: Date.now() - t0, custoUsd: 0, evidencias: 0, citadas: 0, invalidas: 0, cobertura: 0, subagentes: 0, erro: String((e as Error)?.message ?? e).slice(0, 200), texto: "" });
      }
      console.error(`[arena] tarefa ${ti + 1}/${tarefas.length} · ${id} · ${Math.round((Date.now() - t0) / 1000)} s`);
    }
  }

  // juiz cego por pares contra a linha de base
  const envelope = await import("@/lib/llm/envelope");
  const semLedgerEnv = { registrar: (async () => undefined) as any };
  const base = ids[0]!;
  const placar: Record<string, { vence: number; empata: number; perde: number }> = {};
  for (const id of ids.slice(1)) {
    placar[id] = { vence: 0, empata: 0, perde: 0 };
    for (const [ti, t] of tarefas.entries()) {
      const a = linhas.find((l) => l.motor === base && l.tarefa === ti)?.texto ?? "";
      const b = linhas.find((l) => l.motor === id && l.tarefa === ti)?.texto ?? "";
      if (!a || !b) continue;
      const trocar = Math.random() < 0.5;
      const [A, B] = trocar ? [b, a] : [a, b];
      try {
        const { valor } = await envelope.gerarJsonRes<{ melhor?: string }>({
          system: "Você é um professor universitário exigente avaliando entregas acadêmicas para um aluno. Critérios, nesta ordem: correção factual, uso de fontes reais e pertinentes, profundidade adequada ao pedido, estrutura e clareza. Não premie tamanho por si só. Responda JSON {\"melhor\":\"A\"|\"B\"|\"empate\"}.",
          user: `Pedido: ${t.objetivo}\n\n=== ENTREGA A ===\n${A.slice(0, 20_000)}\n\n=== ENTREGA B ===\n${B.slice(0, 20_000)}`,
          json: true, temperature: 0, pensar: "high", ctx: { agentKey: "arena", surface: "estudos", phase: "juiz" },
        }, semLedgerEnv);
        const m = String(valor?.melhor ?? "empate").trim().toUpperCase();
        if (m === "EMPATE") placar[id]!.empata++;
        else if ((m === "B") !== trocar) placar[id]!.vence++;
        else placar[id]!.perde++;
      } catch (e) {
        console.error(`[arena] juiz falhou: ${String((e as Error)?.message ?? e).slice(0, 160)}`);
      }
    }
  }

  const resumo = Object.fromEntries(ids.map((id) => {
    const ls = linhas.filter((l) => l.motor === id);
    const ok = ls.filter((l) => !l.erro);
    const media = (f: (l: Linha) => number) => (ok.length ? Math.round((ok.reduce((s, l) => s + f(l), 0) / ok.length) * 100) / 100 : 0);
    return [id, {
      concluidas: `${ok.length}/${ls.length}`, tempo_medio_s: Math.round(media((l) => l.ms) / 1000), custo_medio_usd: media((l) => l.custoUsd),
      evidencias_media: media((l) => l.evidencias), citacoes_inventadas_total: ok.reduce((s, l) => s + l.invalidas, 0),
      cobertura_media: media((l) => l.cobertura), subagentes_media: media((l) => l.subagentes),
      ...(placar[id] ? { vs_base: placar[id] } : {}), erros: ls.filter((l) => l.erro).map((l) => l.erro),
    }];
  }));
  console.log(JSON.stringify({ base, tarefas: tarefas.length, motores: resumo }, null, 1));
  process.exit(0);
}
main().catch((e) => { console.error("FALHOU", String(e?.stack ?? e).slice(0, 500)); process.exit(1); });
