/**
 * #883 (parte 3a) · os laboratórios agênticos (BioSim 3D, CodeLab, QuantumLab) sem depender do Google.
 */
import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { iaDoLaboratorio } from "@/lib/agentic/labIa";

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
    const texto = await iaDoLaboratorio("quantum", "sistema", "um qubit", { temperature: 0.3, maxOutputTokens: 512 }, {
      env: { HF_TOKEN: "hf_teste" }, fetchImpl: fetchImpl as unknown as typeof fetch, vertex: vertex as never, registrar: (async () => true) as never,
    });
    expect(JSON.parse(texto).vizMode).toBe("blochSphere");
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
