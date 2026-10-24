import { describe, it, expect, vi } from "vitest";
import { chamarRea, comandoRea, reaBridgeConfigurado, resumirRea } from "./rea";
import { ferramentasGateway } from "./agente";

const env = { OCTA_REA: "1", REA_BRIDGE_URL: "http://100.113.137.74:8799/", REA_BRIDGE_TOKEN: "tk" };

describe("octa · REA bridge (fatia 2)", () => {
  it("dois portões: OCTA_REA E a bridge; faltando um, não configura", () => {
    expect(reaBridgeConfigurado({})).toBe(false);
    expect(reaBridgeConfigurado({ OCTA_REA: "1" })).toBe(false);
    expect(reaBridgeConfigurado({ REA_BRIDGE_URL: "x", REA_BRIDGE_TOKEN: "y" })).toBe(false);
    expect(reaBridgeConfigurado(env)).toBe(true);
  });
  it("a tool octa_rea só aparece com o motor ligado", () => {
    const semRea = ferramentasGateway().map((t) => t.function.name);
    expect(semRea).not.toContain("octa_rea");
  });
  it("comando fora da allowlist é recusado sem tocar na rede", async () => {
    const f = vi.fn();
    expect(comandoRea("capture-process")).toBe(false);
    expect(comandoRea("debug-with-gdb")).toBe(false);
    expect(comandoRea("setup")).toBe(false);
    expect(comandoRea("decompile")).toBe(true);
    expect(comandoRea("analyze-javascript-application")).toBe(true);
    expect(await chamarRea({ command: "capture-process" }, env, f as any)).toMatchObject({ ok: false });
    expect(f).not.toHaveBeenCalled();
  });
  it("manda comando + artefato (base64) + token; devolve a Evidence", async () => {
    const f = vi.fn(async () => new Response(JSON.stringify({ ok: true, evidence: { modules: 3 } }), { status: 200 }));
    const r = await chamarRea({ command: "analyze-javascript-application", args: ["--deep"], artifact: { nome: "app.js", conteudo: "console.log(1)" } }, env, f as any);
    expect(r.ok).toBe(true);
    const [url, init] = f.mock.calls[0] as any;
    expect(url).toBe("http://100.113.137.74:8799/rea");
    const body = JSON.parse(init.body);
    expect(body).toMatchObject({ token: "tk", command: "analyze-javascript-application", args: ["--deep"], json: true, artifactName: "app.js" });
    expect(Buffer.from(body.artifactBase64, "base64").toString()).toBe("console.log(1)");
    expect(resumirRea(r)).toContain("modules");
  });
  it("motor fora do ar vira erro legível (não exceção)", async () => {
    const r = await chamarRea({ command: "capabilities" }, env, (async () => { throw new Error("ECONNREFUSED"); }) as any);
    expect(r.ok).toBe(false);
    expect(resumirRea(r)).toMatch(/fora do ar|REA falhou/);
  });
});
