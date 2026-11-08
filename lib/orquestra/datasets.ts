/**
 * lib/orquestra/datasets.ts — os DATASETS da Zaeon ligados aos motores (e listados no console).
 *
 * O buraco que isto fecha: as bases do RAG (áreas — SciELO pt, Wikipédia pt, medicina, ENEM —, a base da
 * turma e a pessoal) só chegavam à Aura, injetadas no prompt pelo runChatTurn (`baseConhecimento`). Um
 * DeepSeek, um Kimi ou um Tongyi chamados pela orquestra pesquisavam na web e nas bases acadêmicas, mas
 * NÃO no que é da casa. Agora eles recebem `base_conhecimento`: a MESMA busca do turno (lib/rag/turno,
 * com permissão, corte de similaridade e disjuntor), como ferramenta de leitura, com as áreas da agente
 * e do mentor do turno. O trecho vira evidência [E#] como qualquer outro achado.
 *
 * Não entra no registry global de propósito: lá ela apareceria no menu de ação da Aura, que já recebe a
 * base pelo prompt — seria a mesma busca duas vezes.
 */
import type { ToolDef, ToolResult } from "@/lib/agent/runtime";
import { AREAS, AREA_GERAL, idArea } from "@/lib/rag/areas";

/** dono neutro (ObjectId zero): sem usuário (arena), só as bases públicas por área respondem */
export const DONO_NEUTRO = "0".repeat(24);

const agora = () => new Date().toISOString();

export function baseConhecimentoDef(o: { userId: string | null; areas: string[] }, buscar?: typeof import("@/lib/rag/turno").baseParaTurno): ToolDef {
  return {
    name: "base_conhecimento",
    runtime: "ts",
    risk: "read",
    minPlan: "free",
    timeoutMs: 8_000,
    schema: {
      name: "base_conhecimento",
      description: "Busca na BASE DA ZAEON: material da turma e do aluno, e as bases públicas por área (SciELO em português, Wikipédia em português, " +
        "medicina/enfermagem/farmácia, questões do ENEM). Use para conceitos em português e para o que o aluno ou a turma já têm.",
      parameters: {
        type: "OBJECT" as any,
        properties: { query: { type: "STRING" as any, description: "a pergunta ou o tema, em português" } },
        required: ["query"],
      },
    },
    async run(args): Promise<ToolResult> {
      const query = String(args?.query ?? "").trim();
      if (!query) return { ok: false, error: "consulta vazia", code: "bad_args", provenance: {} };
      const fn = buscar ?? (await import("@/lib/rag/turno")).baseParaTurno;
      const r = await fn({ userId: o.userId || DONO_NEUTRO, pergunta: query, areas: o.areas });
      if (r.status === "indisponivel") return { ok: false, error: "base da Zaeon indisponível agora", code: "skill_offline", provenance: {} };
      if (r.status !== "ok" || !r.trechos.length) return { ok: true, findings: [], provenance: { toolsUsed: ["base_conhecimento"], at: agora() } };
      const findings = r.trechos.map((t) => ({
        claim: t.texto.replace(/\s+/g, " ").slice(0, 700),
        source: { title: t.publico || !t.paginaIni ? t.titulo : `${t.titulo} (p. ${t.paginaIni}${t.paginaFim > t.paginaIni ? `–${t.paginaFim}` : ""})` },
        confidence: (t.similaridade ?? 0) >= 0.75 ? ("alta" as const) : ("média" as const),
      }));
      return { ok: true, findings, provenance: { toolsUsed: ["base_conhecimento"], at: agora(), sources: findings.map((f) => f.source) } };
    },
  };
}

// ───────────────────────────── o catálogo (pro console) ─────────────────────────────
export type TipoDataset = "rag-area" | "rag-turma" | "rag-pessoal" | "hf-dataset";
export type DatasetPainel = {
  id: string; nome: string; tipo: TipoDataset; fonte: string; licenca: string; descricao: string;
  documentos: number | null; trechos: number | null; conectado: boolean;
};

const FONTE_AREA: Record<string, { fonte: string; licenca: string }> = {
  medicina: { fonte: "SciELO pt + Wikipédia pt + rhaymison/medicine-*", licenca: "CC-BY-4.0 · CC-BY-SA · Apache-2.0" },
  enfermagem: { fonte: "SciELO pt + Wikipédia pt + rhaymison/medicine-*", licenca: "CC-BY-4.0 · CC-BY-SA · Apache-2.0" },
  farmacia: { fonte: "SciELO pt + Wikipédia pt + rhaymison/medicine-*", licenca: "CC-BY-4.0 · CC-BY-SA · Apache-2.0" },
  [AREA_GERAL]: { fonte: "maritaca-ai/enem + Wikipédia pt", licenca: "Apache-2.0 · CC-BY-SA" },
};
const FONTE_PADRAO = { fonte: "SciELO pt (dataseek/ptbr-scielo) + Wikipédia pt", licenca: "CC-BY-4.0 · CC-BY-SA" };

type Contagem = Map<string, { documentos: number; trechos: number }>;

/** contagem por turma_id `area:*` direto no Postgres do RAG; null = banco fora (o painel mostra "—") */
export async function contarPorArea(db?: import("@/lib/rag/pg").RagDb): Promise<Contagem | null> {
  try {
    const pg = db ?? (await import("@/lib/rag/pg")).ragPg();
    const [docs, trechos] = await Promise.all([
      pg.query<{ area: string; n: string }>(`SELECT t AS area, count(*) AS n FROM rag_documentos, unnest(turma_ids) t WHERE t LIKE 'area:%' AND status = 'pronto' GROUP BY t`),
      pg.query<{ area: string; n: string }>(`SELECT t AS area, count(*) AS n FROM rag_trechos, unnest(turma_ids) t WHERE t LIKE 'area:%' GROUP BY t`),
    ]);
    const m: Contagem = new Map();
    for (const r of docs.rows) m.set(r.area, { documentos: Number(r.n), trechos: 0 });
    for (const r of trechos.rows) m.set(r.area, { documentos: m.get(r.area)?.documentos ?? 0, trechos: Number(r.n) });
    return m;
  } catch {
    return null;
  }
}

export function catalogoDeDatasets(contagem: Contagem | null, env: Record<string, string | undefined> = process.env): DatasetPainel[] {
  const ragLigado = !!env.RAG_PG_URL?.trim();
  const areas = [...AREAS.map((a) => a.slug), AREA_GERAL];
  const daArea = areas.map((slug): DatasetPainel => {
    const f = FONTE_AREA[slug] ?? FONTE_PADRAO;
    const c = contagem?.get(idArea(slug));
    return {
      id: `rag:${idArea(slug)}`, nome: `Área · ${slug}`, tipo: "rag-area", ...f,
      descricao: slug === AREA_GERAL ? "Base geral (ENEM, conceitos centrais) — entra em todo turno." : `Base pública da área ${slug} — entra quando a agente ou o mentor é dessa área.`,
      documentos: contagem ? c?.documentos ?? 0 : null, trechos: contagem ? c?.trechos ?? 0 : null,
      conectado: ragLigado && (contagem ? (c?.trechos ?? 0) > 0 : false),
    };
  });
  const org = env.HF_DATASETS_ORG?.trim();
  const hf = !!(env.HF_DATASETS_TOKEN?.trim() && org);
  return [
    ...daArea,
    { id: "rag:turma", nome: "Base da turma", tipo: "rag-turma", fonte: "material enviado pelo professor", licenca: "privado (da turma)", descricao: "Só para quem está na turma (permissão por turma_ids).", documentos: null, trechos: null, conectado: ragLigado },
    { id: "rag:pessoal", nome: "Minha base", tipo: "rag-pessoal", fonte: "material enviado pelo aluno", licenca: "privado (do aluno)", descricao: "Só para o dono (dono_ids). Na arena, sem aluno, não entra.", documentos: null, trechos: null, conectado: ragLigado },
    { id: "hf:zaeon-feedback-chat", nome: "Feedback do chat (👍/👎)", tipo: "hf-dataset", fonte: org ? `${org}/zaeon-feedback-chat` : "—", licenca: "privado", descricao: "Votos anonimizados, a cada 6 h (lib/hf/exportarFeedback).", documentos: null, trechos: null, conectado: hf },
    { id: "hf:zaeon-orquestra-trajetorias", nome: "Trajetórias da orquestra", tipo: "hf-dataset", fonte: org ? `${org}/zaeon-orquestra-trajetorias` : "—", licenca: "privado", descricao: "Tarefas da orquestra (pedido, motor, eventos, evidências, texto, métricas) para treino e avaliação. Exportado pelo console.", documentos: null, trechos: null, conectado: hf },
  ];
}
