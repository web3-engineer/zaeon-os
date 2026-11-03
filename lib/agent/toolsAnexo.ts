/**
 * lib/agent/toolsAnexo.ts — `listar_anexos` e `ler_anexo` (F3). O arquivo da pessoa deixa de ser
 * um parágrafo colado no prompt e passa a ser algo que o agente CONSULTA.
 *
 * DISPONIBILIDADE POR TURNO — o conceito novo que esta fase precisou. Até aqui toda tool era
 * `registrada` ou `ausente`, decidido por CONFIGURAÇÃO no boot (`abrir_url` depende do Leitor,
 * `baixar_para_base` do Leitor + base). Um anexo não é configuração: ele existe neste turno e não no
 * próximo. Daí `ToolDef.disponivelNoTurno(ctx)`, que o `permit()` consulta — e com ele o cardápio da
 * F0 e o menu da F2 param de anunciar "leio seu anexo" num turno em que não há anexo nenhum.
 *
 * Os anexos viajam no `ToolContext`, que já é o carregador por-turno (é de lá que `memory_search`
 * tira o `userId`).
 */
import {
  MAX_CHARS_TRECHO,
  acharAnexo,
  claimDoTrecho,
  inventarioDosAnexos,
  trechoDoAnexo,
  type AnexoDoTurno,
} from "@/lib/agent/anexos";
// SÓ TIPOS do runtime (é ele que importa este módulo pra registrar): um import de valor fecharia ciclo.
import type { ToolDef, ToolResult } from "@/lib/agent/runtime";

const falha = (error: string, code: string): ToolResult => ({ ok: false, error, code, provenance: {} });
const agora = () => new Date().toISOString();

/** Os anexos deste turno (vazio quando não há). */
export function anexosDoCtx(ctx: unknown): AnexoDoTurno[] {
  const a = (ctx as { anexos?: unknown })?.anexos;
  return Array.isArray(a) ? (a as AnexoDoTurno[]).filter((x) => x && typeof x.texto === "string") : [];
}

const temAnexo = (ctx: unknown) => anexosDoCtx(ctx).length > 0;

/**
 * `listar_anexos` — o inventário. Barata e sem argumento: existe pra o modelo saber que há um
 * SEGUNDO arquivo (e o id dele) sem ter de ler os dois inteiros.
 */
export const listarAnexosDef: ToolDef = {
  name: "listar_anexos",
  runtime: "ts",
  risk: "read",
  minPlan: "free",
  disponivelNoTurno: temAnexo,
  schema: {
    name: "listar_anexos",
    description: "Lista os arquivos que a pessoa anexou a esta conversa, com id, nome e tamanho.",
    parameters: { type: "OBJECT" as any, properties: {}, required: [] },
  },
  async run(_args, ctx) {
    const anexos = anexosDoCtx(ctx);
    if (!anexos.length) return falha("nenhum arquivo anexado a esta conversa", "sem_anexo");
    return {
      ok: true,
      findings: [{ claim: `Arquivos anexados:\n${inventarioDosAnexos(anexos)}`, confidence: "alta" }],
      provenance: { toolsUsed: ["listar_anexos"], at: agora() },
    };
  },
};

/**
 * `ler_anexo` — o conteúdo, em recorte. `de` permite continuar de onde parou, e é por isso que o
 * `claim` avisa quando SOBROU documento: sem esse aviso o modelo trata um terço do artigo como o
 * artigo e afirma que "o texto não menciona X".
 */
export const lerAnexoDef: ToolDef = {
  name: "ler_anexo",
  runtime: "ts",
  risk: "read",
  minPlan: "free",
  disponivelNoTurno: temAnexo,
  schema: {
    name: "ler_anexo",
    description: `Lê o texto de um arquivo anexado à conversa. Devolve até ${MAX_CHARS_TRECHO} caracteres por chamada; use "de" para continuar de onde parou.`,
    parameters: {
      type: "OBJECT" as any,
      properties: {
        anexo: { type: "STRING" as any, description: "o id (a1, a2…) ou o nome do arquivo; vazio = o primeiro" },
        de: { type: "INTEGER" as any, description: "posição em caracteres de onde continuar (0 = começo)" },
      },
      required: [],
    },
  },
  async run(args, ctx) {
    const anexos = anexosDoCtx(ctx);
    if (!anexos.length) return falha("nenhum arquivo anexado a esta conversa", "sem_anexo");
    const ref = typeof args?.anexo === "string" ? args.anexo : "";
    const a = acharAnexo(anexos, ref);
    // id inventado NÃO cai no primeiro arquivo em silêncio: responder sobre o documento errado é
    // pior que dizer que não achou (o modelo tem o inventário e pode corrigir).
    if (!a) return falha(`não há anexo "${ref}" nesta conversa`, "anexo_desconhecido");
    const de = Number(args?.de);
    const t = trechoDoAnexo(a, { de: Number.isFinite(de) ? de : 0 });
    if (!t.texto.trim()) return falha(`o anexo "${a.nome}" não tem texto nessa posição`, "sem_texto");
    return {
      ok: true,
      findings: [{ claim: claimDoTrecho(a, t), source: { title: a.nome }, confidence: "alta" }],
      provenance: { toolsUsed: ["ler_anexo"], at: agora() },
    };
  },
};
