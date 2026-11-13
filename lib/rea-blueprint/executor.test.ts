import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { executarReaReal, type DepsExecutor } from "./executor";
import type { AlvoReal } from "./alvoReal";

const envOn = { OCTA_REA: "1", REA_BRIDGE_URL: "http://motor.local:8799/", REA_BRIDGE_TOKEN: "tk" };

/** deps falsas: o motor é simulado — provamos o CONTRATO (orquestração), não o Ghidra real. */
function deps(over: Partial<DepsExecutor> = {}): DepsExecutor {
  return {
    chamarRea: vi.fn(async (o: any) => ({ ok: true, evidence: { command: o.command, args: o.args, handle: o.handle, achou: ["AndroidManifest.xml", "classes.dex"] } })),
    uploadRea: vi.fn(async () => ({ ok: true, handle: "a".repeat(32), name: "exemplo.apk", bytes: 22 })),
    ...over,
  };
}

describe("rea · executor (camada executora real)", () => {
  it("motor desligado → motivo motor-off (sem chamar nada)", async () => {
    const d = deps();
    const r = await executarReaReal({ tipo: "url", url: "https://exemplo.com", comando: "analyze-web-bundle" }, d, {});
    expect(r.ok).toBe(false);
    expect(r).toMatchObject({ motivo: "motor-off" });
    expect(d.chamarRea).not.toHaveBeenCalled();
  });

  it("comando com efeito colateral é barrado antes da rede", async () => {
    const d = deps();
    const alvo = { tipo: "url", url: "https://exemplo.com", comando: "frida-spawn" } as unknown as AlvoReal;
    const r = await executarReaReal(alvo, d, envOn);
    expect(r).toMatchObject({ ok: false, motivo: "comando-barrado" });
    expect(d.chamarRea).not.toHaveBeenCalled();
  });

  it("alvo URL (site): roda o comando no motor com a url como arg e resume a evidência", async () => {
    const d = deps();
    const r = await executarReaReal({ tipo: "url", url: "https://exemplo.com/app", comando: "analyze-web-bundle" }, d, envOn);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.ferramentas).toEqual(["analyze-web-bundle"]);
      expect(r.evidencia).toContain("AndroidManifest.xml");
    }
    expect(d.chamarRea).toHaveBeenCalledWith({ command: "analyze-web-bundle", args: ["https://exemplo.com/app"] }, envOn);
    expect(d.uploadRea).not.toHaveBeenCalled(); // URL não faz upload (o motor busca)
  });

  it("alvo ARTEFATO (APK real do fixture): upload → handle → inspect-android-package → evidência", async () => {
    const bytes = readFileSync(join(__dirname, "fixtures", "exemplo.apk"));
    expect(bytes.slice(0, 2).toString("ascii")).toBe("PK"); // é mesmo um container zip/apk
    const lerArtefato = vi.fn(async (nome: string) => ({ nome, conteudo: bytes }));
    const d = deps({ lerArtefato });
    const alvo: AlvoReal = { tipo: "artefato", nome: "exemplo.apk", comando: "inspect-android-package" };
    const r = await executarReaReal(alvo, d, envOn);

    expect(lerArtefato).toHaveBeenCalledWith("exemplo.apk");
    expect(d.uploadRea).toHaveBeenCalledWith({ nome: "exemplo.apk", conteudo: bytes }, envOn);
    expect(d.chamarRea).toHaveBeenCalledWith({ command: "inspect-android-package", handle: "a".repeat(32) }, envOn);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.comando).toBe("inspect-android-package");
  });

  it("artefato sem leitor de bytes → sem-bytes (não chama upload)", async () => {
    const d = deps({ lerArtefato: undefined });
    const r = await executarReaReal({ tipo: "artefato", nome: "x.apk", comando: "inspect-android-package" }, d, envOn);
    expect(r).toMatchObject({ ok: false, motivo: "sem-bytes" });
    expect(d.uploadRea).not.toHaveBeenCalled();
  });

  it("upload falha → falhou (não chama o comando)", async () => {
    const lerArtefato = vi.fn(async (nome: string) => ({ nome, conteudo: Buffer.from("x") }));
    const d = deps({ lerArtefato, uploadRea: vi.fn(async () => ({ ok: false, erro: "motor fora do ar" })) });
    const r = await executarReaReal({ tipo: "artefato", nome: "x.apk", comando: "inspect-android-package" }, d, envOn);
    expect(r).toMatchObject({ ok: false, motivo: "falhou" });
    expect(d.chamarRea).not.toHaveBeenCalled();
  });

  it("o motor retorna erro no comando → falhou com a mensagem do motor", async () => {
    const d = deps({ chamarRea: vi.fn(async () => ({ ok: false, erro: "formato não reconhecido" })) });
    const r = await executarReaReal({ tipo: "url", url: "https://exemplo.com", comando: "analyze-web-bundle" }, d, envOn);
    expect(r).toMatchObject({ ok: false, motivo: "falhou", erro: "formato não reconhecido" });
  });
});
