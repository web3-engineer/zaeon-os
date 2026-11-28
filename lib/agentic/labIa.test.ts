/**
 * #883 (parte 3a) · os laboratórios agênticos (BioSim 3D, CodeLab, QuantumLab) sem depender do Google.
 */
import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { iaDoLaboratorio, idDoAluno, PRAZOS_LAB } from "@/lib/agentic/labIa";

const ler = (p: string) => readFileSync(path.resolve(__dirname, "../..", p), "utf8");
const respostaHf = (texto: string) =>
  new Response(JSON.stringify({ model: "openai/gpt-oss-120b", choices: [{ message: { content: texto }, finish_reason: "stop" }], usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 } }), { status: 200, headers: { "content-type": "application/json" } });

describe("#883 · iaDoLaboratorio pelo envelope", () => {
  it("com o HF na frente, a resposta vem do Hugging Face e o Vertex nem é chamado; o ledger leva lab:<laboratório>", async () => {
    const fetchImpl = vi.fn(async () => respostaHf('{"response":"oi"}'));
    const vertex = vi.fn();
    const registrar = vi.fn(async () => true);
    const texto = await iaDoLaboratorio("codelab", "sistema", "pergunta", { temperature: 0.4, maxOutputTokens: 1024, userId: "u1" }, {
      env: { HF_TOKEN: "hf_teste", LLM_PRIMARIO: "hf" }, fetchImpl: fetchImpl as unknown as typeof fetch, vertex: vertex as never, registrar: registrar as never,
    });
    expect(texto).toBe('{"response":"oi"}');
    expect(String((fetchImpl.mock.calls[0] as unknown[])[0])).toContain("router.huggingface.co");
    expect(vertex).not.toHaveBeenCalled();
    expect(registrar).toHaveBeenCalledWith(expect.objectContaining({ agentKey: "lab:codelab", surface: "estudos", userId: "u1", provedor: "huggingface", ok: true }));
  });

  it("o Google fora do ar (403) não derruba o laboratório: o HF de reserva responde", async () => {
    const fetchImpl = vi.fn(async () => respostaHf('{"vizMode":"blochSphere","title":"Qubit"}'));
    const vertex = vi.fn(async () => { throw Object.assign(new Error("403 requires billing"), { status: 403 }); });
    const texto = await iaDoLaboratorio("quantum", "sistema", "um qubit", { temperature: 0.3, maxOutputTokens: 512, userId: null }, {
      env: { HF_TOKEN: "hf_teste" }, fetchImpl: fetchImpl as unknown as typeof fetch, vertex: vertex as never, registrar: (async () => true) as never,
    });
    expect(JSON.parse(texto).vizMode).toBe("blochSphere");
    expect(vertex).toHaveBeenCalled();   // o Google foi tentado ANTES e falhou; só aí o HF respondeu
  });
});

describe("#883 · os 3 laboratórios usam a IA nova", () => {
  it("CodeLab e QuantumLab não chamam mais o SDK do Vertex", () => {
    for (const p of ["app/api/agentic/codelab/route.ts", "app/api/agentic/quantum/route.ts"]) {
      const s = ler(p);
      expect(s, p).toMatch(/iaDoLaboratorio\('(codelab|quantum)'/);
      expect(s, p).not.toMatch(/@google-cloud\/vertexai|generateContent|vertexCredentials/);
    }
  });

  it("BioSim: sem foto vai pela IA nova; só a foto continua no Gemini (parte 4, visão)", () => {
    const s = ler("app/api/agentic/biosim/route.ts");
    expect(s).toMatch(/if \(!imagePart\) return iaDoLaboratorio\('biosim'/);
  });
});

describe("#883 (revisão) · tempo, aluno e ledger", () => {
  it("o prazo do pedido inteiro fica abaixo do maxDuration de cada rota, e cabem pelo menos 2 tentativas", () => {
    for (const [lab, prazo] of Object.entries(PRAZOS_LAB)) {
      const maxDuration = Number(/export const maxDuration\s*=\s*(\d+)/.exec(ler(`app/api/agentic/${lab}/route.ts`))![1]) * 1000;
      expect(prazo.totalMs, lab).toBeLessThan(maxDuration);
      expect(prazo.totalMs, lab).toBeGreaterThanOrEqual(2 * prazo.tentativaMs);
    }
  });

  it("passou do prazo total → erro claro (a rota responde antes de ser cortada)", async () => {
    vi.useFakeTimers();
    try {
      const pendurado = vi.fn(() => new Promise<never>(() => {}));
      const p = iaDoLaboratorio("codelab", "s", "u", { temperature: 0, maxOutputTokens: 10, userId: null }, { env: {}, vertex: pendurado as never, registrar: (async () => true) as never });
      const erro = p.catch((e: Error) => e.message);
      await vi.advanceTimersByTimeAsync(PRAZOS_LAB.codelab.totalMs + 10);
      expect(await erro).toMatch(/passou de 25 s/);
    } finally { vi.useRealTimers(); }
  });

  it("o uso vai para o aluno: as 3 rotas passam o id da sessão; sem id, fica null", () => {
    expect(idDoAluno({ user: { id: "abc", email: "a@b.c" } })).toBe("abc");
    expect(idDoAluno({ user: { email: "a@b.c" } })).toBeNull();
    expect(idDoAluno(null)).toBeNull();
    for (const lab of ["codelab", "quantum", "biosim"]) expect(ler(`app/api/agentic/${lab}/route.ts`), lab).toMatch(/idDoAluno\(session\)/);
  });

  it("a foto do BioSim (ainda no Gemini) também entra no ledger como lab:biosim", () => {
    const s = ler("app/api/agentic/biosim/route.ts");
    expect(s).toMatch(/agentKey: .lab:biosim./);
    expect(s).toMatch(/registrarTokens\(\{ \.\.\.ctx, model: modelo, provedor: .vertex./);
  });
});
