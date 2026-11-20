/**
 * scripts/paper-orquestra/gerar-local.ts — gera UM documento com o pipeline do PaperOrchestra, fora do app: modelo
 * pelo envelope (Vertex), literatura pelas bases acadêmicas (retrievePapers), documento em memória (sem Mongo).
 * Grava em <saida>/<caso>/: zaeon.md (o documento), evidencias.json (a biblioteca de fontes), relatorio.json.
 *
 *   npx tsx scripts/paper-orquestra/gerar-local.ts <caso> <saida> [biblioteca.json]
 *   (com biblioteca: não busca — reusa as consultas e os candidatos de uma rodada anterior; tria e escreve igual)
 *   casos: revisao | dados | tcc
 *
 * Precisa das credenciais do Vertex no ambiente (GOOGLE_CREDENTIALS ou GOOGLE_PROJECT_ID/CLIENT_EMAIL/PRIVATE_KEY),
 * de GEMINI_TEXT_LOCATION/GEMINI_MODEL se o padrão da região não servir o modelo.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { rodarPaperOrquestra } from "@/lib/paper-orquestra/pipeline";
import { ESQUELETO_ARTIGO, ESQUELETO_TCC } from "@/lib/tcc/secoes";
import { markdownDoDocumento } from "@/lib/paper-orquestra/avaliar";

export const CASOS = {
  revisao: {
    tipo: "Artigo", esqueleto: ESQUELETO_ARTIGO,
    tema: "inteligência artificial generativa na educação básica",
    pedido: "Escreva um artigo científico de revisão sobre o uso de inteligência artificial generativa (como o ChatGPT) na educação básica: benefícios para a aprendizagem, riscos (plágio, desinformação, dependência), o papel do professor e recomendações para escolas.",
  },
  dados: {
    tipo: "Artigo", esqueleto: ESQUELETO_ARTIGO,
    tema: "hábitos de estudo e desempenho em matemática no ensino médio",
    pedido: [
      "Escreva um artigo científico com os dados da pesquisa que fiz com 40 estudantes do 2º ano do ensino médio de uma escola pública,",
      "sobre a relação entre horas de estudo semanais, uso de celular durante o estudo e a nota na avaliação bimestral de matemática (0 a 10).",
      "Dados (questionário + nota):",
      "| Grupo de horas de estudo por semana | n | Nota média | Desvio padrão | % que usa celular ao estudar |",
      "|---|---|---|---|---|",
      "| até 2 h | 14 | 5,1 | 1,6 | 86% |",
      "| 2 a 5 h | 17 | 6,4 | 1,4 | 65% |",
      "| mais de 5 h | 9 | 7,8 | 1,1 | 33% |",
      "Correlação de Pearson entre horas de estudo e nota: r = 0,58 (p < 0,001).",
      "Entre os que usam celular ao estudar (n = 26) a nota média foi 5,8; entre os que não usam (n = 14), 7,2.",
      "Metodologia: questionário online anônimo aplicado em setembro, notas fornecidas pela coordenação com consentimento dos responsáveis.",
    ].join("\n"),
  },
  tcc: {
    tipo: "TCC", esqueleto: ESQUELETO_TCC,
    tema: "saúde mental de estudantes universitários após a pandemia de COVID-19",
    pedido: "Faça um TCC de revisão de literatura sobre a saúde mental de estudantes universitários após a pandemia de COVID-19: prevalência de ansiedade e depressão, fatores de risco e de proteção, e intervenções que as universidades podem adotar.",
  },
} as const;

async function main() {
  const [caso, saida, bibArq] = process.argv.slice(2) as [keyof typeof CASOS, string, string | undefined];
  const bibliotecaFixa = bibArq && existsSync(bibArq) ? JSON.parse(readFileSync(bibArq, "utf8")) : undefined;
  const c = CASOS[caso];
  if (!c || !saida) throw new Error("uso: gerar-local.ts <revisao|dados|tcc> <saida>");
  const { gerar } = await import("@/lib/llm/envelope");
  const { retrievePapers } = await import("@/lib/scholar/retrieve");
  const modelo = process.env.PAPER_ORQ_MODELO_ESCRITOR || process.env.GEMINI_MODEL || "gemini-3.5-flash";
  const doc = new Map<string, string>();
  let titulo: string = c.tema;
  const t0 = Date.now();
  const r = await rodarPaperOrquestra(
    { tema: c.tema, pedido: c.pedido, tipo: c.tipo, esqueleto: [...c.esqueleto], reflexoes: Number(process.env.PAPER_ORQ_REFLEXOES ?? 2), ...(bibliotecaFixa ? { bibliotecaFixa } : {}) },
    {
      llm: async (p) => (await gerar({
        system: p.system, user: p.user, json: p.json, rota: "vertex", model: modelo,
        temperature: p.temperatura ?? 0.4, timeoutMs: p.longo ? 240_000 : 90_000, ...(p.longo ? { maxOutputTokens: 32_768 } : {}),
        ctx: { agentKey: "zaeon", surface: "estudos", phase: `avaliacao-${p.fase}` },
      })).texto,
      buscar: async (consulta, area) => {
        const x = await retrievePapers(consulta, { domain: area, minResults: 6 }).catch(() => null);
        return (x?.papers ?? []).map((p) => ({ title: p.title, authors: p.authors, year: p.year, url: p.url, doi: p.doi, abstract: p.abstract, venue: p.venue }));
      },
      completarResumos: async (dois) => (await import("@/lib/scholar/sources/openalex")).resumosPorDoi(dois),
      salvarSecao: async (t, corpo) => { doc.set(t, corpo); return true; },
      definirTitulo: async (t) => { titulo = t; },
      progresso: (rot) => console.log(`[${caso}] ${Math.round((Date.now() - t0) / 1000)}s · ${rot}`),
    },
  );
  const refs = c.esqueleto.find((t) => /^REFER[ÊE]NCIAS/.test(t))!;
  const secoes = c.esqueleto.map((t) => ({ titulo: t, corpo: t === refs ? r.referencias.map((x) => x.abnt).join("\n\n") : (doc.get(t) ?? "") }));
  const dir = join(saida, caso);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "zaeon.md"), markdownDoDocumento({ titulo, secoes }));
  writeFileSync(join(dir, "evidencias.json"), JSON.stringify(r.evidencias, null, 2));
  writeFileSync(join(dir, "relatorio.json"), JSON.stringify({ modelo, ...r.relatorio, registroDeBusca: r.registroDeBusca }, null, 2));
  writeFileSync(join(dir, "biblioteca.json"), JSON.stringify(r.biblioteca, null, 2));
  console.log(`[${caso}] pronto em ${Math.round((Date.now() - t0) / 1000)}s`, JSON.stringify(r.relatorio));
}

main().catch((e) => { console.error(e); process.exit(1); });
