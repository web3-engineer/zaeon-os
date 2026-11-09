import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { lerManifesto, manifestoAtual, pacoteAtual } from "@/lib/orquestra/hermesApp";

const ZIP = Buffer.from("PK\u0003\u0004 app de verdade");
const SHA = createHash("sha256").update(ZIP).digest("hex");
const TOKEN = "t".repeat(40);
let dir: string;

beforeEach(() => { dir = mkdtempSync(join(tmpdir(), "hermes-")); });
afterEach(() => { rmSync(dir, { recursive: true, force: true }); vi.unstubAllEnvs(); });

const publicar = (m: object, zip: Buffer = ZIP) => {
  writeFileSync(join(dir, "ZaeonHermes.app.zip"), zip);
  writeFileSync(join(dir, "manifesto.json"), JSON.stringify(m));
};

describe("hermesApp · manifesto", () => {
  it("valida build, sha256 e nome do arquivo (nada de caminho)", () => {
    expect(lerManifesto({ build: 12, sha256: SHA, versao: "0.1.0", sha: "abc" })).toMatchObject({ build: 12, arquivo: "ZaeonHermes.app.zip" });
    expect(lerManifesto({ build: 0, sha256: SHA })).toBeNull();
    expect(lerManifesto({ build: 3, sha256: "xyz" })).toBeNull();
    expect(lerManifesto({ build: 3, sha256: SHA, arquivo: "../../etc/passwd.zip" })).toBeNull();
    expect(lerManifesto(null)).toBeNull();
  });
  it("pacote só sai se o zip bate com o sha256 (upload pela metade nunca chega ao Mac)", async () => {
    publicar({ build: 7, sha256: SHA });
    expect((await pacoteAtual(dir))?.dados.equals(ZIP)).toBe(true);
    publicar({ build: 7, sha256: SHA }, Buffer.from("PK cortado"));
    expect(await pacoteAtual(dir)).toBeNull();
    expect(await manifestoAtual(join(dir, "nao-existe"))).toBeNull();
  });
});

describe("rotas /api/admin/orquestra/app", () => {
  it("401 sem chave; 404 sem build; manifesto e zip com a chave", async () => {
    vi.stubEnv("ORQUESTRA_CONSOLE_TOKEN", TOKEN);
    vi.stubEnv("HERMES_DIST_DIR", dir);
    const com = (u: string) => new Request(u, { headers: { authorization: `Bearer ${TOKEN}` } });
    const rota = await import("@/app/api/admin/orquestra/app/route");
    const baixar = await import("@/app/api/admin/orquestra/app/baixar/route");
    expect((await rota.GET(new Request("http://x/app"))).status).toBe(401);
    expect((await rota.GET(com("http://x/app"))).status).toBe(404);
    publicar({ build: 9, sha256: SHA, versao: "0.1.0" });
    const r = await rota.GET(com("http://x/app"));
    expect(await r.json()).toMatchObject({ build: 9, sha256: SHA });
    const z = await baixar.GET(com("http://x/app/baixar"));
    expect(z.status).toBe(200);
    expect(z.headers.get("X-Hermes-Build")).toBe("9");
    expect(Buffer.from(await z.arrayBuffer()).equals(ZIP)).toBe(true);
  });
});
