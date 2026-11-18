/**
 * lib/agent/toolsVideo.ts — `descrever_video`: título, canal e (com chave) descrição, duração e
 * data de um vídeo do YouTube que a pessoa colou.
 *
 * ⟦DE ONDE VÊM OS DADOS⟧ De duas APIs públicas do próprio YouTube, nunca da página do vídeo:
 *   · oEmbed (`youtube.com/oembed`) — sem chave: título e canal. É o piso, sempre disponível.
 *   · YouTube Data API v3 (`googleapis.com/youtube/v3/videos`) — com `YOUTUBE_API_KEY`: descrição
 *     inteira, duração, data e tags. A mesma chave que /api/study/youtube já usa.
 * A página `watch?v=` NÃO é raspada: de IP de datacenter o Google responde com a página de
 * verificação ("sorry"), então dependeria de sorte — e legenda idem. Por isso a tool diz, na
 * própria evidência, que o conteúdo falado não foi lido (lib/agent/video).
 *
 * ⟦POR QUE NÃO VAI PELO LEITOR⟧ A lei do Leitor é sobre ENDEREÇO QUE VEM DA CONVERSA: quem escolhe
 * o host é um estranho, então quem sai pra rede é o container sem credencial. Aqui o host é fixo no
 * código e a única coisa que vem da conversa é o ID, validado contra `[A-Za-z0-9_-]{11}` antes de
 * entrar na URL — é chamada de API de terceiro, como `literature_search` e /api/study/youtube.
 * Redirecionamento é recusado (`redirect: "error"`): o destino é sempre o que está escrito aqui.
 */
import type { Finding, ToolDef, ToolResult } from "@/lib/agent/runtime";
import { duracaoLegivel, evidenciaDoVideo, idDoYoutube, urlDoVideo, type MetaDoVideo } from "@/lib/agent/video";

const TIMEOUT_MS = 8_000;
type Env = Record<string, string | undefined>;

/** A descrição completa depende da chave; sem ela, só título e canal. Vai pro /api/health. */
export const nivelDoVideo = (env: Env = process.env): "completo" | "basico" =>
  env.YOUTUBE_API_KEY?.trim() ? "completo" : "basico";

type Motivo = "video_nao_encontrado" | "video_privado" | "video_indisponivel";
const FRASE: Record<Motivo, string> = {
  video_nao_encontrado: "esse vídeo não existe (ou foi removido)",
  video_privado: "esse vídeo é privado ou não permite consulta",
  video_indisponivel: "o YouTube não respondeu agora",
};

async function pegarJson(f: typeof fetch, url: string): Promise<{ status: number; j: any }> {
  const r = await f(url, { cache: "no-store", redirect: "error", signal: AbortSignal.timeout(TIMEOUT_MS), headers: { Accept: "application/json" } });
  let j: any = null;
  try { j = await r.json(); } catch { /* corpo não-JSON */ }
  return { status: r.status, j };
}

/**
 * Busca o que der do vídeo. Nunca lança. A chave nunca entra em mensagem de erro nem em log.
 * A API de dados falhar (cota, chave inválida) NÃO derruba a resposta: cai no oEmbed.
 */
export async function buscarVideo(
  id: string, opts: { fetchImpl?: typeof fetch; env?: Env } = {},
): Promise<{ ok: true; meta: MetaDoVideo } | { ok: false; motivo: Motivo }> {
  const f = opts.fetchImpl ?? fetch;
  const chave = (opts.env ?? process.env).YOUTUBE_API_KEY?.trim();

  if (chave) {
    try {
      const { status, j } = await pegarJson(f, `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${id}&key=${encodeURIComponent(chave)}`);
      if (status === 200 && Array.isArray(j?.items)) {
        const it = j.items[0];
        // 200 com lista vazia = o vídeo não existe ou é privado; o oEmbed abaixo diz qual dos dois
        if (it?.snippet?.title) {
          return {
            ok: true,
            meta: {
              id,
              titulo: String(it.snippet.title).slice(0, 300),
              canal: String(it.snippet.channelTitle ?? "").slice(0, 200),
              descricao: String(it.snippet.description ?? ""),
              duracao: duracaoLegivel(it.contentDetails?.duration) || undefined,
              publicadoEm: /^\d{4}-\d{2}-\d{2}/.exec(String(it.snippet.publishedAt ?? ""))?.[0],
              tags: Array.isArray(it.snippet.tags) ? it.snippet.tags.filter((t: unknown) => typeof t === "string").map((t: string) => t.slice(0, 60)) : undefined,
            },
          };
        }
      }
    } catch { /* cai no oEmbed */ }
  }

  try {
    const { status, j } = await pegarJson(f, `https://www.youtube.com/oembed?url=${encodeURIComponent(urlDoVideo(id))}&format=json`);
    if (status === 200 && typeof j?.title === "string" && j.title.trim()) {
      return { ok: true, meta: { id, titulo: j.title.trim().slice(0, 300), canal: String(j.author_name ?? "").trim().slice(0, 200) } };
    }
    if (status === 401 || status === 403) return { ok: false, motivo: "video_privado" };
    if (status === 400 || status === 404) return { ok: false, motivo: "video_nao_encontrado" };
    return { ok: false, motivo: "video_indisponivel" };
  } catch {
    return { ok: false, motivo: "video_indisponivel" };
  }
}

export const descreverVideoDef: ToolDef = {
  name: "descrever_video",
  runtime: "ts",
  risk: "read",
  minPlan: "free",
  timeoutMs: 20_000,
  schema: {
    name: "descrever_video",
    description: "Consulta um vídeo do YouTube pelo endereço e devolve título, canal e, quando disponível, descrição, duração e data. NÃO assiste ao vídeo nem lê a legenda.",
    parameters: {
      type: "OBJECT" as any,
      properties: { url: { type: "STRING" as any, description: "o endereço do vídeo (youtube.com/watch?v=…, youtu.be/…, /shorts/…)" } },
      required: ["url"],
    },
  },
  async run(args): Promise<ToolResult> {
    const at = new Date().toISOString();
    const id = idDoYoutube(String(args?.url ?? ""));
    if (!id) return { ok: false, error: "não é um endereço de vídeo do YouTube", code: "bad_args", provenance: {} };
    const r = await buscarVideo(id);
    if (!r.ok) return { ok: false, error: FRASE[r.motivo], code: r.motivo, provenance: { toolsUsed: ["descrever_video"], at } };
    const fonte = { title: `${r.meta.titulo}${r.meta.canal ? ` — ${r.meta.canal}` : ""} (YouTube)`, url: urlDoVideo(id) };
    // "baixa" é o rótulo de fonte WEB (ver toolsWeb): descrição de vídeo não é artigo acadêmico
    const finding: Finding = { claim: evidenciaDoVideo(r.meta), source: fonte, confidence: "baixa" };
    return { ok: true, findings: [finding], provenance: { toolsUsed: ["descrever_video"], at, sources: [fonte] } };
  },
};
