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
/** acima do prazo da voz (PRAZO_MS) com folga, pra a reserva e o 503 terminarem */
export const maxDuration = 30;
import { NextResponse } from "next/server";
import { guard } from "@/src/lib/ratelimit";
import { eu, salaDoMembro } from "@/lib/lounge3d/server";
import { sintetizarVoz } from "@/lib/voice/sintetizar";
import { hfVozDisponivel } from "@/lib/voice/hf-voz";
import { registrarTokens } from "@/lib/llm/ledger";
import { usageDoVertex, USAGE_VAZIO, type Usage } from "@/lib/llm/usage";
import { VOZ_ZAEON, falasEmCacheNoServidor, textoDaVoz } from "@/lib/cyber/vozZaeon";

type Audio = { audio_base64: string; mime: string };
const FIXAS = new Set(falasEmCacheNoServidor());   // (o tutorial + as frases da capela)
/** (no globalThis: o servidor de dev reavalia o módulo da rota — o cache sobrevive, como o do prisma) */
const cacheFixas = ((globalThis as { __cyberVozFixas?: Map<string, Audio> }).__cyberVozFixas ??= new Map<string, Audio>());
/** a síntese EM ANDAMENTO de cada fala fixa: quem pede a mesma fala ao mesmo tempo espera essa, e não paga de novo */
const emVoo = ((globalThis as { __cyberVozEmVoo?: Map<string, Promise<Audio | null>> }).__cyberVozEmVoo ??= new Map<string, Promise<Audio | null>>());
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

  // (depois do await do limite: daqui até o emVoo.set não tem await, então só um pedido inicia a síntese)
  const andando = fixa ? emVoo.get(texto) : undefined;
  if (andando) return responder(await andando);
  const jaPronta = fixa ? cacheFixas.get(texto) : undefined;
  if (jaPronta) return NextResponse.json(jaPronta);

  if (!fixa) return responder(await sintetizar(texto, userId));
  const p = sintetizar(texto, userId);
  emVoo.set(texto, p);
  try {
    const out = await p;
    if (out) cacheFixas.set(texto, out);
    return responder(out);
  } finally { emVoo.delete(texto); }
}

const responder = (out: Audio | null) => (out ? NextResponse.json(out) : NextResponse.json({ error: "voz indisponível" }, { status: 503 }));

/** sintetiza pela voz única e registra no ledger quem COBROU: o HF quando falou (ou falhou ligado) e o Google SEMPRE que
 *  ele gastou (mesmo se o áudio dele veio ilegível e o Piper falou no fim). O Piper é local e de graça: não entra. */
async function sintetizar(texto: string, userId: string | null): Promise<Audio | null> {
  const ini = Date.now(); let usage: Usage | null = null, modeloGoogle = "gemini-tts";
  const ctx = { agentKey: "cyber:zaeon-voz", surface: "outro" as const, userId, phase: "cyberespaco", jsonValido: null };
  type Erro = "timeout" | "outro" | null;
  const hf = (ok: boolean, erro: Erro) => void registrarTokens({ ...ctx, model: MODELO_VOZ_HF, provedor: "huggingface", rota: "direta", usage: USAGE_VAZIO, ms: Date.now() - ini, ok, erro, alvo: "hf-voz" }).catch(() => undefined);
  const google = (ok: boolean, erro: Erro) => void registrarTokens({ ...ctx, model: modeloGoogle, provedor: "vertex", rota: "vertex", usage: usage ?? USAGE_VAZIO, ms: Date.now() - ini, ok, erro, alvo: "vertex-tts" }).catch(() => undefined);
  try {
    const voz = await sintetizarVoz(texto, VOZ_ZAEON, PRAZO_MS, (meta, m) => { usage = usageDoVertex(meta); modeloGoogle = m; });
    if (voz.provedor === "hf") hf(true, null);
    else if (hfVozDisponivel()) hf(false, "outro");   // o HF tentou antes e falhou
    if (usage || voz.provedor === "google") google(voz.provedor === "google", voz.provedor === "google" ? null : "outro");
    return { audio_base64: voz.audio_base64, mime: voz.mime };
  } catch (e) {
    const msg = String((e as Error)?.message ?? e);
    console.warn("[cyber/zaeon-voz] sem voz:", msg.slice(0, 300));
    const erro = /timeout|abort/i.test(msg) ? "timeout" : "outro";
    if (hfVozDisponivel()) hf(false, erro);
    if (usage) google(false, erro);
    return null;
  }
}
