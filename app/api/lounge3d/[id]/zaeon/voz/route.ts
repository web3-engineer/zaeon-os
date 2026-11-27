/**
 * POST /api/lounge3d/[id]/zaeon/voz { texto } → { audio_base64, mime: "audio/wav" } — a VOZ da Zaeon no holograma do
 * tutorial (lib/cyber/vozZaeon). #883 (parte 2b): é a mesma voz do resto da Zaeon (lib/voice/sintetizar — Hugging Face
 * primeiro, o Gemini-TTS só de reserva enquanto a credencial existir, o Piper por último), mas pelo caminho do
 * CYBERESPAÇO, separado do laboratório (/api/ai/voice):
 *  - limite próprio ("cyber-voz"), pra o tutorial não comer o "ai-heavy" do laboratório;
 *  - custo no ledger como agente "cyber:zaeon-voz" (o mesmo jeito de lib/cyber/ia/motor), com o provedor que falou;
 *  - só a voz da Zaeon (o cliente não escolhe voz): sem voz, o balão sai mudo e a boca mexe sozinha (a conversa
 *    nunca trava);
 *  - as falas FIXAS (iguais pra todo mundo) ficam num cache em memória: depois da 1ª pessoa, saem na hora, sem custo
 *    e sem contar no limite.
 * Membro da sala (IDOR → 404). Em DESENVOLVIMENTO, a sala "dev" dispensa sessão (a prévia /zz-cyber não tem login).
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { guard } from "@/src/lib/ratelimit";
import { eu, salaDoMembro } from "@/lib/lounge3d/server";
import { sintetizarVoz } from "@/lib/voice/sintetizar";
import { registrarTokens } from "@/lib/llm/ledger";
import { usageDoVertex, USAGE_VAZIO, type Usage } from "@/lib/llm/usage";
import { VOZ_ZAEON, falasEmCacheNoServidor, textoDaVoz } from "@/lib/cyber/vozZaeon";

type Audio = { audio_base64: string; mime: string };
const FIXAS = new Set(falasEmCacheNoServidor());   // (o tutorial + as frases da capela)
/** (no globalThis: o servidor de dev reavalia o módulo da rota — o cache sobrevive, como o do prisma) */
const cacheFixas = ((globalThis as { __cyberVozFixas?: Map<string, Audio> }).__cyberVozFixas ??= new Map<string, Audio>());
const PRAZO_MS = 12_000;
/** o modelo que vai pro ledger quando a voz sai do Hugging Face (cobrado na conta do HF, não por token) */
export const MODELO_VOZ_HF = "kokoro-pt-br";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const dev = process.env.NODE_ENV === "development" && params.id === "dev";
  let userId: string | null = null;
  if (!dev) {
    const me = await eu(); if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const s = await salaDoMembro(params.id, me.id); if (!s) return NextResponse.json({ error: "Not found" }, { status: 404 });
    userId = me.id;
  }
  const b = (await req.json().catch(() => ({}))) as { texto?: unknown };
  const texto = textoDaVoz(typeof b.texto === "string" ? b.texto : "");
  if (!texto) return NextResponse.json({ error: "texto vazio" }, { status: 400 });

  // fala fixa já sintetizada: sai do cache (sem custo — nem conta no limite)
  const fixa = FIXAS.has(texto), pronta = fixa ? cacheFixas.get(texto) : undefined;
  if (pronta) return NextResponse.json(pronta);
  const rl = await guard(req, "lounge3d-zaeon-voz", "cyber-voz"); if (!rl.ok) return rl.response;

  const ini = Date.now(); let usage: Usage = USAGE_VAZIO, modeloGoogle = "gemini-tts";
  const ctx = { agentKey: "cyber:zaeon-voz", surface: "outro" as const, userId, phase: "cyberespaco", jsonValido: null };
  try {
    const voz = await sintetizarVoz(texto, VOZ_ZAEON, PRAZO_MS, (meta, m) => { usage = usageDoVertex(meta); modeloGoogle = m; });
    const out: Audio = { audio_base64: voz.audio_base64, mime: voz.mime };
    // o Piper é local e de graça: não entra no ledger
    if (voz.provedor === "google") {
      void registrarTokens({ ...ctx, model: modeloGoogle, provedor: "vertex", rota: "vertex", usage, ms: Date.now() - ini, ok: true, erro: null, alvo: "vertex-tts" }).catch(() => undefined);
    } else if (voz.provedor === "hf") {
      void registrarTokens({ ...ctx, model: MODELO_VOZ_HF, provedor: "huggingface", rota: "direta", usage: USAGE_VAZIO, ms: Date.now() - ini, ok: true, erro: null, alvo: "hf-voz" }).catch(() => undefined);
    }
    if (fixa) cacheFixas.set(texto, out);
    return NextResponse.json(out);
  } catch (e) {
    const msg = String((e as Error)?.message ?? e);
    console.warn("[cyber/zaeon-voz] sem voz:", msg.slice(0, 300));
    void registrarTokens({ ...ctx, model: MODELO_VOZ_HF, provedor: "huggingface", rota: "direta", usage: USAGE_VAZIO, ms: Date.now() - ini, ok: false, erro: /timeout|abort/i.test(msg) ? "timeout" : "outro", alvo: "hf-voz" }).catch(() => undefined);
    return NextResponse.json({ error: "voz indisponível" }, { status: 503 });
  }
}
