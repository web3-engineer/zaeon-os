import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const m = vi.hoisted(() => ({ session: vi.fn(), userFind: vi.fn(), docFind: vi.fn(), guard: vi.fn(), tts: vi.fn(), ledger: vi.fn(), hfOn: vi.fn() }));
vi.mock("next-auth", () => ({ getServerSession: m.session }));
vi.mock("@/src/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/src/lib/ratelimit", () => ({ guard: m.guard }));
vi.mock("@/src/lib/prisma", () => ({ prisma: { user: { findUnique: m.userFind }, collabDoc: { findUnique: m.docFind } } }));
vi.mock("@/lib/voice/sintetizar", () => ({ sintetizarVoz: m.tts }));
vi.mock("@/lib/llm/ledger", () => ({ registrarTokens: m.ledger }));
vi.mock("@/lib/voice/hf-voz", () => ({ hfVozDisponivel: m.hfOn }));

import { POST } from "./[id]/zaeon/voz/route";
import { PERGUNTAS } from "@/lib/cyber/conversaZaeon";
import { readFileSync } from "node:fs";
import path from "node:path";

const ID = "0123456789abcdef01234567", ME = "aaaaaaaaaaaaaaaaaaaaaaaa";
const req = (b: unknown) => new Request("http://x/", { method: "POST", body: JSON.stringify(b), headers: { "Content-Type": "application/json" } });
const doc = (members = [ME]) => ({ id: ID, ownerId: ME, title: "Sala", kind: "lounge_canvas", content: "{}", members, token: "t", updatedAt: new Date() });
const WAV = { audio_base64: "UklGRg==", mime: "audio/wav" };

describe("POST /api/lounge3d/[id]/zaeon/voz", () => {
  const env = process.env.NODE_ENV;
  beforeEach(() => {
    Object.values(m).forEach((f) => f.mockReset());
    m.guard.mockResolvedValue({ ok: true });
    m.session.mockResolvedValue({ user: { email: "a@b.c" } });
    m.userFind.mockResolvedValue({ id: ME, name: "Ana", image: null, role: null, cyberNasceuEm: null });
    m.docFind.mockResolvedValue(doc());
    m.ledger.mockResolvedValue(true);
    m.hfOn.mockReturnValue(true);
    (globalThis as { __cyberVozFixas?: Map<string, unknown> }).__cyberVozFixas?.clear();
    m.tts.mockImplementation(async (_t: string, _v: string, _ms: number, onUsage?: (u: unknown, mo: string) => void) => { onUsage?.({ promptTokenCount: 10, candidatesTokenCount: 50, totalTokenCount: 60 }, "gemini-2.5-flash-tts"); return { ...WAV, provedor: "google" }; });
  });
  afterEach(() => { (process.env as Record<string, string | undefined>).NODE_ENV = env; });

  it("sem sessão → 401; não-membro → 404; texto vazio → 400; limite próprio do cyberespaço", async () => {
    m.session.mockResolvedValueOnce(null);
    expect((await POST(req({ texto: "oi" }), { params: { id: ID } })).status).toBe(401);
    m.docFind.mockResolvedValueOnce(doc(["bbbbbbbbbbbbbbbbbbbbbbbb"]));
    expect((await POST(req({ texto: "oi" }), { params: { id: ID } })).status).toBe(404);
    expect((await POST(req({ texto: " ✦ " }), { params: { id: ID } })).status).toBe(400);
    expect(m.tts).not.toHaveBeenCalled();
    m.guard.mockResolvedValueOnce({ ok: false, response: new Response("", { status: 429 }) });
    expect((await POST(req({ texto: "outra fala" }), { params: { id: ID } })).status).toBe(429);
    expect(m.guard).toHaveBeenCalledWith(expect.anything(), "lounge3d-zaeon-voz", "cyber-voz");
    expect(m.tts).not.toHaveBeenCalled();
  });

  it("#883: sintetiza pela voz única (sintetizarVoz) com a voz da Zaeon, sem o ✦; Google de reserva registra o custo como cyber:zaeon-voz", async () => {
    const r = await POST(req({ texto: "Prazer, Ana! ✦", voz: "charon" }), { params: { id: ID } });
    expect(r.status).toBe(200); expect(await r.json()).toEqual(WAV);
    expect(m.tts).toHaveBeenCalledWith("Prazer, Ana!", "leda", expect.any(Number), expect.any(Function));
    const linhas = m.ledger.mock.calls.map((c) => c[0]);
    expect(linhas.find((l) => l.provedor === "huggingface")).toMatchObject({ ok: false });   // o HF tentou antes e falhou
    const linha = linhas.find((l) => l.provedor === "vertex")!;
    expect(linha).toMatchObject({ agentKey: "cyber:zaeon-voz", userId: ME, ok: true, model: "gemini-2.5-flash-tts" });
    expect(linha.usage.completionTokens).toBe(50);
  });

  it("#883: voz pelo Hugging Face → ledger huggingface/kokoro sem custo de token; Piper (local) nem entra no ledger", async () => {
    m.tts.mockResolvedValueOnce({ ...WAV, provedor: "hf" });
    const r = await POST(req({ texto: "Oi, Ana." }), { params: { id: ID } });
    expect(await r.json()).toEqual(WAV);   // o cliente não recebe o provedor
    expect(m.ledger.mock.calls[0]![0]).toMatchObject({ agentKey: "cyber:zaeon-voz", provedor: "huggingface", model: "kokoro-pt-br", alvo: "hf-voz", ok: true });
    expect(m.ledger.mock.calls[0]![0].usage.completionTokens).toBe(0);
    m.ledger.mockClear(); m.hfOn.mockReturnValue(false);
    m.tts.mockResolvedValueOnce({ ...WAV, provedor: "piper" });
    expect((await POST(req({ texto: "Oi de novo." }), { params: { id: ID } })).status).toBe(200);
    expect(m.ledger).not.toHaveBeenCalled();
  });

  it("#883 (revisão): o Google gastou mas o Piper falou no fim → o gasto do Google entra no ledger", async () => {
    m.hfOn.mockReturnValue(false);
    m.tts.mockImplementationOnce(async (_t: string, _v: string, _ms: number, onUsage?: (u: unknown, mo: string) => void) => { onUsage?.({ promptTokenCount: 10, candidatesTokenCount: 50, totalTokenCount: 60 }, "gemini-2.5-flash-tts"); return { ...WAV, provedor: "piper" }; });
    expect((await POST(req({ texto: "Fala que o Piper disse." }), { params: { id: ID } })).status).toBe(200);
    expect(m.ledger).toHaveBeenCalledTimes(1);
    expect(m.ledger.mock.calls[0]![0]).toMatchObject({ provedor: "vertex", ok: false, model: "gemini-2.5-flash-tts" });
    expect(m.ledger.mock.calls[0]![0].usage.completionTokens).toBe(50);
  });

  it("#883 (revisão): a mesma fala fixa pedida ao mesmo tempo sintetiza UMA vez", async () => {
    const fixa = PERGUNTAS[0]!.fala + " ";   // (o textoDaVoz tira o espaço: é a mesma fala)
    (globalThis as { __cyberVozFixas?: Map<string, unknown> }).__cyberVozFixas?.clear();
    let soltar!: () => void;
    m.tts.mockImplementationOnce(() => new Promise((ok) => { soltar = () => ok({ ...WAV, provedor: "hf" }); }));
    const a = POST(req({ texto: fixa }), { params: { id: ID } }), b = POST(req({ texto: fixa }), { params: { id: ID } });
    await new Promise((r) => setTimeout(r, 20)); soltar();
    const [ra, rb] = await Promise.all([a, b]);
    expect(await ra.json()).toEqual(WAV); expect(await rb.json()).toEqual(WAV);
    expect(m.tts).toHaveBeenCalledTimes(1);
  });

  it("#883 (revisão): a rota tem maxDuration acima do prazo da voz", async () => {
    const mod = await import("./[id]/zaeon/voz/route");
    expect(mod.maxDuration).toBeGreaterThanOrEqual(20);
  });

  it("#883: a rota não chama mais o Gemini-TTS direto", () => {
    const fonte = readFileSync(path.resolve(__dirname, "[id]/zaeon/voz/route.ts"), "utf8");
    expect(fonte).toMatch(/sintetizarVoz/);
    expect(fonte).not.toMatch(/synthGeminiTTS|@\/lib\/voice\/gemini-tts/);
  });

  it("as falas fixas ficam em cache (a 2ª pessoa não paga); a gerativa não", async () => {
    const fixa = PERGUNTAS[0]!.fala;
    await POST(req({ texto: fixa }), { params: { id: ID } });
    m.guard.mockClear();
    expect((await POST(req({ texto: fixa }), { params: { id: ID } })).status).toBe(200);
    expect(m.tts).toHaveBeenCalledTimes(1);
    expect(m.guard).not.toHaveBeenCalled();   // do cache: nem conta no limite
    await POST(req({ texto: "Que legal, Direito!" }), { params: { id: ID } });
    await POST(req({ texto: "Que legal, Direito!" }), { params: { id: ID } });
    expect(m.tts).toHaveBeenCalledTimes(3);
  });

  it("nenhum provedor de voz respondeu → 503 (o cliente segue sem voz) e o erro vai pro ledger", async () => {
    m.tts.mockRejectedValueOnce(new Error("voz indisponível (hf caiu | google: gemini_tts_http_403 | piper: fetch failed)"));
    expect((await POST(req({ texto: "uma fala nova" }), { params: { id: ID } })).status).toBe(503);
    expect(m.ledger.mock.calls[0]![0]).toMatchObject({ ok: false, erro: "outro", provedor: "huggingface" });
  });

  it("a sala 'dev' dispensa sessão SÓ em desenvolvimento", async () => {
    m.session.mockResolvedValue(null);
    (process.env as Record<string, string | undefined>).NODE_ENV = "production";
    expect((await POST(req({ texto: "oi dev" }), { params: { id: "dev" } })).status).toBe(401);
    (process.env as Record<string, string | undefined>).NODE_ENV = "development";
    expect((await POST(req({ texto: "oi dev" }), { params: { id: "dev" } })).status).toBe(200);
  });
});
