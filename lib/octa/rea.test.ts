import { describe, it, expect, vi } from "vitest";
import { chamarRea, comandoRea, reaBridgeConfigurado, resumirRea, uploadRea } from "./rea";
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
  // rea-agents 6.9.0 (v62, 255 tools): famílias com EFEITO COLATERAL que escapavam dos prefixos antigos.
  it("recusa as famílias de efeito colateral do 6.9 (instrumentação, runtime, build de ambiente)", () => {
    for (const c of ["frida-trace", "spawn-process", "attach-process", "launch-browser", "instrument-app",
      "interact-with-target", "run-scenario", "extract-firmware", "environment-build", "agent-env-run"]) {
      expect(comandoRea(c), c).toBe(false);
    }
  });
  // os ALVOS ESTÁTICOS novos do 6.9 continuam liberados (análise/leitura, sem efeito colateral)
  it("libera os alvos estáticos novos do 6.9 (EVM, Rust, modelos de IA, WASM, SQLite…)", () => {
    for (const c of ["inspect-evm-interface", "inspect-rust-binary", "inspect-model-artifact", "inspect-wasm-artifact",
      "inspect-sqlite-database", "inspect-kernel-module", "audit-release-exposure", "decode-signal-recording"]) {
      expect(comandoRea(c), c).toBe(true);
    }
  });
  // as duas cópias da deny-list (app + motor) são mantidas à mão; discordar é defeito de segurança
  it("a deny-list do app e a do motor (bridge.mjs) são idênticas", () => {
    const { readFileSync } = require("node:fs") as typeof import("node:fs");
    const extrai = (txt: string) => {
      const m = /DENY_(?:REA_)?PREFIXOS\s*=\s*\[([^\]]*)\]/.exec(txt);
      return m ? m[1].match(/"[^"]+"/g)!.join(",") : "NAO_ACHOU";
    };
    const app = extrai(readFileSync("lib/octa/rea.ts", "utf8"));
    const motor = extrai(readFileSync("infra/rea-engine/bridge.mjs", "utf8"));
    expect(app).not.toBe("NAO_ACHOU");
    expect(motor).toBe(app);
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

  it("upload: manda o binário (base64) e recebe handle; depois analisa pelo handle", async () => {
    const up = vi.fn(async () => new Response(JSON.stringify({ ok: true, handle: "a".repeat(32), name: "alvo.bin", bytes: 4 }), { status: 200 }));
    const r = await uploadRea({ nome: "alvo.bin", conteudo: Buffer.from([1, 2, 3, 4]) }, env, up as any);
    expect(r).toMatchObject({ ok: true, handle: "a".repeat(32) });
    expect((up.mock.calls[0] as any)[0]).toBe("http://100.113.137.74:8799/upload");
    // analisar pelo handle: vai `handle`, não artifactBase64
    const an = vi.fn(async () => new Response(JSON.stringify({ ok: true, evidence: { entry: "0x1000" } }), { status: 200 }));
    await chamarRea({ command: "analyze", args: ["--provider", "ghidra"], handle: "a".repeat(32) }, env, an as any);
    const body = JSON.parse((an.mock.calls[0] as any)[1].body);
    expect(body.handle).toBe("a".repeat(32));
    expect(body.artifactBase64).toBeUndefined();
  });
});
