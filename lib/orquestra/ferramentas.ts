/**
 * lib/orquestra/ferramentas.ts — a CAIXA DE FERRAMENTAS que todo motor recebe.
 *
 * O motor é dos outros; as ferramentas são da Zaeon. É assim que um DeepSeek ou um Kimi passa a
 * buscar nas MESMAS 8 bases acadêmicas do Scholar, na web da casa e na memória do aluno — e é
 * assim que a resposta deles continua auditável.
 *
 * O REGISTRO DE EVIDÊNCIA (o portão de citação, desenho do PaperQA2): cada achado de ferramenta
 * ganha uma chave estável [E1], [E2]… e a observação devolvida ao modelo já vem com as chaves. O
 * modelo só pode citar chave que existe; o verificador (lib/orquestra/verificador) corta o resto.
 * Fonte repetida (mesma URL/título) reusa a chave — dez subagentes achando o mesmo paper não viram
 * dez referências.
 *
 * Só ferramentas de LEITURA entram (risk "read" + permit ALLOW). Motor de fora não escreve nada
 * na casa — mesma regra do MCP (lib/agent/mcp.ts RISCO_MAXIMO_CHAT).
 */
import { permit, runToolByName, toolsDoTurno, type ToolContext, type ToolDef, type ToolResult } from "@/lib/agent/runtime";
import { FORA_DO_MENU } from "@/lib/agent/acao";
import type { CaixaDeFerramentas, Evidencia, FerramentaVisivel } from "@/lib/orquestra/contrato";
import { correrContraPrazo, ehPrazo, type Prazo } from "@/lib/orquestra/prazo";

/** Schema do Gemini (type "OBJECT"/"STRING") → JSON Schema (minúsculo), que é o que a API OpenAI-compatível lê. */
export function paraJsonSchema(s: unknown): Record<string, unknown> {
  if (!s || typeof s !== "object") return { type: "object", properties: {} };
  const conv = (v: any): any => {
    if (Array.isArray(v)) return v.map(conv);
    if (!v || typeof v !== "object") return v;
    const out: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(v)) {
      out[k] = k === "type" && typeof val === "string" ? val.toLowerCase() : conv(val);
    }
    return out;
  };
  const r = conv(s);
  if (!r.type) r.type = "object";
  if (r.type === "object" && !r.properties) r.properties = {};
  return r;
}

const SO_ORQUESTRA = new Set([...FORA_DO_MENU, "examiner"]);
const MAX_OBSERVACAO = 3_500;

function chaveDaFonte(e: { claim: string; source?: { title?: string; url?: string } }): string {
  const url = e.source?.url?.trim().toLowerCase().replace(/[#?].*$/, "").replace(/\/+$/, "");
  if (url) return `u:${url}`;
  const t = e.source?.title?.trim().toLowerCase().replace(/\s+/g, " ");
  return t ? `t:${t}` : `c:${e.claim.trim().toLowerCase().slice(0, 160)}`;
}

function linhaDaEvidencia(e: Evidencia): string {
  const s = e.source;
  const ref = s ? ` — ${s.title ?? ""}${s.year ? ` (${s.year})` : ""}${s.url ? ` ${s.url}` : ""}` : "";
  return `[${e.chave}] ${e.claim.replace(/\s+/g, " ").slice(0, 600)}${ref}`;
}

export type OpcoesCaixa = {
  /** teto de chamadas de ferramenta por TAREFA (soma de todos os subagentes) */
  maxChamadas?: number;
  /** injetável (teste): executa a tool. Default = runToolByName do registry da casa */
  executarTool?: (nome: string, args: unknown, ctx: ToolContext) => Promise<ToolResult>;
  /** injetável (teste): as tools do turno. Default = toolsDoTurno(ctx) */
  ferramentasDoTurno?: (ctx: ToolContext) => ToolDef[];
};

export function criarCaixa(ctx: ToolContext, opts: OpcoesCaixa = {}): CaixaDeFerramentas & { chamadas(): number } {
  const executarTool = opts.executarTool ?? ((n, a, c) => runToolByName(n, a, c));
  const defs = (opts.ferramentasDoTurno ?? toolsDoTurno)(ctx).filter(
    (d) => d.risk === "read" && !SO_ORQUESTRA.has(d.name) && permit(d, ctx) === "ALLOW",
  );
  const porNome = new Map(defs.map((d) => [d.name, d]));
  const visiveis: FerramentaVisivel[] = defs.map((d) => ({
    name: d.name,
    description: String(d.schema?.description ?? d.name).slice(0, 600),
    parameters: paraJsonSchema(d.schema?.parameters),
  }));

  const registro: Evidencia[] = [];
  const porFonte = new Map<string, Evidencia>();
  const feitas = new Map<string, Promise<string>>();
  const maxChamadas = opts.maxChamadas ?? 80;
  let chamadas = 0;

  const registrar = (claim: string, source: Evidencia["source"], ferramenta: string, agente: string): Evidencia => {
    const k = chaveDaFonte({ claim, source });
    const ja = porFonte.get(k);
    if (ja) return ja;
    const e: Evidencia = { chave: `E${registro.length + 1}`, claim, source, ferramenta, agente };
    registro.push(e);
    porFonte.set(k, e);
    return e;
  };

  const observar = (nome: string, r: ToolResult, agente: string): string => {
    if (!r.ok) {
      // ERRO COMO OBSERVAÇÃO (smolagents/OpenHands): a falha volta pro modelo decidir, não derruba o laço.
      return `A ferramenta ${nome} falhou (${r.code ?? "erro"}): ${String(r.error ?? "").slice(0, 200)}. Tente outra consulta ou outra ferramenta.`;
    }
    const novas: Evidencia[] = [];
    for (const f of r.findings ?? []) {
      if (!f?.claim) continue;
      novas.push(registrar(f.claim, f.source, nome, agente));
    }
    for (const l of r.livros ?? []) {
      const titulo = String((l as any)?.titulo ?? "").trim();
      if (!titulo) continue;
      novas.push(registrar(`Livro: ${titulo}`, { title: titulo, url: (l as any)?.paginaUrl ?? undefined, year: (l as any)?.ano ?? undefined }, nome, agente));
    }
    if (!novas.length) return `A ferramenta ${nome} não encontrou nada útil para esta consulta.`;
    let txt = `Resultados de ${nome} (cite pela chave entre colchetes):\n`;
    for (const e of novas) {
      const linha = linhaDaEvidencia(e) + "\n";
      if (txt.length + linha.length > MAX_OBSERVACAO) { txt += "…(resultados cortados)\n"; break; }
      txt += linha;
    }
    return txt.trim();
  };

  return {
    visiveis: () => visiveis,
    evidencias: () => [...registro],
    existe: (chave) => registro.some((e) => e.chave === chave),
    importar: (extras) => {
      const mapa = new Map<string, string>();
      for (const e of extras) {
        if (!e?.claim) continue;
        mapa.set(e.chave, registrar(e.claim, e.source, e.ferramenta, e.agente).chave);
      }
      return mapa;
    },
    chamadas: () => chamadas,
    async executar(nome, args, agente, prazo: Prazo) {
      const def = porNome.get(nome);
      if (!def) return `A ferramenta ${nome} não existe aqui. Use apenas: ${visiveis.map((v) => v.name).join(", ") || "(nenhuma)"}.`;
      const chave = `${nome}:${JSON.stringify(args ?? {})}`;
      const repetida = feitas.get(chave);
      if (repetida) return `(consulta repetida — mesmos resultados de antes)\n${await repetida}`;
      if (chamadas >= maxChamadas) return `Limite de ${maxChamadas} chamadas de ferramenta desta tarefa atingido. Escreva com a evidência que já tem.`;
      chamadas++;
      const p = (async () => {
        const prazoTool = prazo.filho(def.timeoutMs ?? 30_000, `tool ${nome}`);
        try {
          const r = await correrContraPrazo(executarTool(nome, args, ctx), prazoTool);
          return observar(nome, r, agente);
        } catch (e) {
          if (prazo.expirou()) throw e;
          return ehPrazo(e)
            ? `A ferramenta ${nome} demorou demais e foi interrompida. Tente uma consulta mais específica.`
            : `A ferramenta ${nome} falhou: ${String((e as Error)?.message ?? e).slice(0, 200)}.`;
        } finally {
          prazoTool.liberar();
        }
      })();
      feitas.set(chave, p);
      return p;
    },
  };
}
