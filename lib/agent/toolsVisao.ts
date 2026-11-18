/**
 * lib/agent/toolsVisao.ts — `descrever_imagem` (F-visão): "be my eyes". Dá ao agente a capacidade de
 * OLHAR uma imagem que a pessoa anexou e descrevê-la / responder sobre ela — acessibilidade e
 * entendimento visual, como um assistente geral (Claude, DeepSeek) tem.
 *
 * ──────────────────────── por que uma TOOL, e não o passthrough legado ────────────────────────
 * Hoje uma imagem anexada desvia do harness pro caminho multimodal legado (route.ts): o modelo vê a
 * imagem UMA vez, no turno, e pronto — sem laço, sem RAG, sem memória, e sem o agente poder VOLTAR a
 * olhar a imagem com uma pergunta específica no meio do raciocínio. Como tool, a imagem entra no
 * turno do harness (campo `imagens` do ctx, igual aos `anexos` da F3) e o agente a consulta quando
 * precisa — e ganha tudo o mais do harness no mesmo turno.
 *
 * DISPONIBILIDADE POR TURNO (mesmo conceito da F3): a tool existe quando HÁ imagem neste turno —
 * `disponivelNoTurno` devolve false sem imagem, então o cardápio não promete "eu vejo" num turno sem
 * nada pra ver. O registro (runtime) é condicional à credencial Vertex E à flag `VISAO_HARNESS`.
 */
import { descreverImagem, type ImagemParaVisao } from "@/lib/ai/descreverImagem";
// SÓ TIPOS do runtime (é ele que importa este módulo pra registrar): um import de valor fecharia ciclo.
import type { Finding, ToolDef, ToolResult } from "@/lib/agent/runtime";

const falha = (error: string, code: string): ToolResult => ({ ok: false, error, code, provenance: {} });

/** Uma imagem que a pessoa anexou a este turno. Viaja no ToolContext, como os `anexos` da F3. */
export type ImagemDoTurno = { id: string; nome: string; mime: string; dataB64: string };

/** As imagens deste turno (vazio quando não há). Lê o ctx como `unknown`, igual ao `anexosDoCtx`. */
export function imagensDoCtx(ctx: unknown): ImagemDoTurno[] {
  const v = (ctx as { imagens?: unknown })?.imagens;
  return Array.isArray(v)
    ? (v as ImagemDoTurno[]).filter((x) => x && typeof x.dataB64 === "string" && typeof x.mime === "string")
    : [];
}

const temImagem = (ctx: unknown) => imagensDoCtx(ctx).length > 0;

/** A flag do roteamento de imagem pro harness (hot-path do chat). Default DESLIGADA: prod não muda. */
export function visaoNoHarnessLigado(env: Record<string, string | undefined> = process.env): boolean {
  return ["1", "true", "on"].includes(String(env.VISAO_HARNESS ?? "").trim().toLowerCase());
}

/** Acha a imagem referida (id ou nome), ou a primeira se nada foi dito. */
function acharImagem(imagens: ImagemDoTurno[], ref?: string): ImagemDoTurno | undefined {
  const r = String(ref ?? "").trim().toLowerCase();
  if (!r) return imagens[0];
  return imagens.find((i) => i.id.toLowerCase() === r || i.nome.toLowerCase() === r) ?? imagens[0];
}

/**
 * `descrever_imagem` — olha uma imagem do turno e responde sobre ela. A pergunta é OPCIONAL: sem ela,
 * descreve a imagem. Com ela ("que diz a placa?", "quantos itens há na mesa?"), responde o que foi
 * pedido. NUNCA lança.
 */
export const descreverImagemDef: ToolDef = {
  name: "descrever_imagem",
  runtime: "ts",
  risk: "read",
  minPlan: "free",
  timeoutMs: 30_000,
  disponivelNoTurno: temImagem,
  schema: {
    name: "descrever_imagem",
    description:
      "Olha uma imagem que a pessoa anexou e a descreve ou responde uma pergunta sobre ela (ler texto na imagem, contar objetos, descrever uma cena, ler um gráfico). Use sempre que o pedido depender do que ESTÁ numa imagem anexada.",
    parameters: {
      type: "OBJECT" as any,
      properties: {
        pergunta: { type: "STRING" as any, description: "o que olhar na imagem; vazio = descreva a imagem" },
        imagem: { type: "STRING" as any, description: "id ou nome da imagem (quando há mais de uma); vazio = a primeira" },
      },
      required: [],
    },
  },
  async run(args, ctx) {
    const imagens = imagensDoCtx(ctx);
    if (!imagens.length) return falha("nenhuma imagem anexada a esta conversa", "sem_imagem");
    const img = acharImagem(imagens, args?.imagem ? String(args.imagem) : undefined);
    if (!img) return falha("imagem não encontrada", "sem_imagem");
    const r = await descreverImagem({ dataB64: img.dataB64, mime: img.mime } as ImagemParaVisao, args?.pergunta ? String(args.pergunta) : undefined);
    if (!r.ok) return falha(`não consegui ver a imagem: ${r.erro}`, "visao_falhou");
    return {
      ok: true,
      findings: [{ claim: r.texto, source: { title: `imagem: ${img.nome}` }, confidence: "alta" } as Finding],
      provenance: { toolsUsed: ["descrever_imagem"], at: new Date().toISOString() },
    };
  },
};
