/**
 * lib/ai/descreverImagem.ts — o MOTOR de "be my eyes": dá ao agente a capacidade de OLHAR uma
 * imagem e descrevê-la / responder sobre ela. Server-only.
 *
 * ──────────────────────── por que FORA do gateway de texto ────────────────────────
 * As chamadas do harness vão pelo envelope (`lib/llm/envelope`), que monta `parts:[{text}]` e SÓ
 * texto — é o que dá Vertex + pool + reserva HF. Imagem não cabe ali. Então a visão fala DIRETO com
 * o Vertex multimodal, exatamente como o caminho legado do chat já faz (route.ts), reusando as mesmas
 * credenciais (`vertex-credentials`) e o mesmo Flash. É uma chamada à parte, de propósito — não uma
 * tentativa de enfiar imagem num canal que é de texto.
 *
 * `gen` é INJETÁVEL: o teste prova o motor (validação de mime/tamanho, extração do texto, erros) sem
 * rede e sem credencial — o mesmo padrão do `responderSemFontes` e do runner agentic.
 *
 * SEM SSRF aqui: os bytes vêm de um ANEXO do próprio usuário (base64), não de uma URL — não há
 * endereço para resolver nem rede interna a alcançar. A trava de rede é problema do leitor, não desta.
 */
import { GEMINI_MODEL_FLASH } from "@/lib/ai/model";

export type ImagemParaVisao = { dataB64: string; mime: string };
export type VisaoOut = { ok: true; texto: string } | { ok: false; erro: string };

/** Uma chamada multimodal: recebe system + parts (inlineData + text) e devolve o texto cru. */
export type GenMultimodal = (system: string, parts: unknown[]) => Promise<string>;

/** Os mimes de imagem que o Gemini Vision lê. Fora disto, recusa — não manda lixo pro modelo. */
export const MIMES_IMAGEM = ["image/png", "image/jpeg", "image/webp", "image/gif", "image/heic", "image/heif"];
/** Teto do base64 inline — o mesmo ~13,5 MB que a rota legada usa pro inline do Vertex. */
export const MAX_B64 = 18_000_000;

const SYSTEM_DESCREVER =
  "Você é os OLHOS do usuário (recurso de acessibilidade e descrição visual). Olhe a imagem e " +
  "responda à pergunta com precisão e objetividade, em PT-BR. Descreva o que ESTÁ na imagem — " +
  "texto legível, objetos, pessoas (sem identificar quem são), cenas, cores, layout, dados de " +
  "gráficos/tabelas. NÃO invente o que não dá para ver; se algo está ilegível ou cortado, diga. " +
  "Sem preâmbulo ('a imagem mostra…' é dispensável): vá direto ao que importa para a pergunta.";

/** A pergunta padrão quando o usuário só anexa a imagem sem dizer o que quer. */
export const PERGUNTA_PADRAO = "Descreva esta imagem.";

/**
 * Descreve uma imagem / responde uma pergunta sobre ela. NUNCA lança: erro vira `{ ok:false }`.
 * A `gen` default fala direto com o Vertex (Flash multimodal); o teste injeta a sua.
 */
export async function descreverImagem(
  img: ImagemParaVisao,
  pergunta?: string,
  gen: GenMultimodal = genVertexMultimodal,
): Promise<VisaoOut> {
  const mime = String(img?.mime ?? "").trim().toLowerCase();
  const data = String(img?.dataB64 ?? "").trim();
  if (!MIMES_IMAGEM.includes(mime)) return { ok: false, erro: "mime_nao_imagem" };
  if (!data) return { ok: false, erro: "imagem_vazia" };
  if (data.length > MAX_B64) return { ok: false, erro: "imagem_grande_demais" };

  const q = String(pergunta ?? "").trim() || PERGUNTA_PADRAO;
  const parts = [{ inlineData: { data, mimeType: mime } }, { text: q }];
  try {
    const texto = String(await gen(SYSTEM_DESCREVER, parts) ?? "").trim();
    return texto ? { ok: true, texto } : { ok: false, erro: "sem_resposta" };
  } catch (e: unknown) {
    return { ok: false, erro: `visao_falhou: ${(e as Error)?.message ?? e}` };
  }
}

/** Há credencial Vertex para a visão funcionar? (registro condicional + recibo honesto) */
export function visaoDisponivel(env: Record<string, string | undefined> = process.env): boolean {
  return !!(env.GOOGLE_CREDENTIALS?.trim() || (env.GOOGLE_PROJECT_ID?.trim() && env.GOOGLE_CLIENT_EMAIL?.trim() && env.GOOGLE_PRIVATE_KEY?.trim()));
}

/** A `gen` real: Vertex multimodal, montado como a rota legada do chat (mesmas credenciais, mesmo Flash). */
async function genVertexMultimodal(system: string, parts: unknown[]): Promise<string> {
  const { VertexAI } = await import("@google-cloud/vertexai");
  const { vertexCredentials, vertexTextClientOpts } = await import("@/lib/ai/vertex-credentials");
  const { project, client_email, private_key } = vertexCredentials();
  const vertexAI = new VertexAI({
    project,
    ...vertexTextClientOpts(),
    googleAuthOptions: { credentials: { client_email, private_key } },
  });
  const model = vertexAI.getGenerativeModel({
    model: GEMINI_MODEL_FLASH,
    generationConfig: { temperature: 0.3 },
    systemInstruction: { role: "system", parts: [{ text: system }] },
  });
  const res = await model.generateContent({ contents: [{ role: "user", parts: parts as never }] });
  const ps = res?.response?.candidates?.[0]?.content?.parts ?? [];
  return ps.map((p: { text?: string }) => (typeof p.text === "string" ? p.text : "")).join("").trim();
}
