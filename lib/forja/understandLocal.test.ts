import { describe, it, expect, beforeAll } from "vitest";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sample from "./understand.sample.json";
import type { UAGrafo } from "./understand";

// o módulo lê FORJA_UA_CACHE no import → define um tmpdir ANTES de importar (import dinâmico).
let mod: typeof import("./understandLocal");

beforeAll(async () => {
  const dir = await mkdtemp(join(tmpdir(), "ua-cache-test-"));
  process.env.FORJA_UA_CACHE = dir;
  mod = await import("./understandLocal");
});

describe("understandLocal — cache do understand lido pelo curso", () => {
  const ua = sample as unknown as UAGrafo;

  it("repo não cacheado → null (nunca gera na hora)", async () => {
    expect(await mod.uaCacheado("quem/nao-existe")).toBeNull();
    expect(await mod.arvoreUACacheada("quem/nao-existe")).toBeNull();
  });

  it("depois de gravar o cache, lê o grafo e deriva a árvore (micrograd real)", async () => {
    await mod.gravarUACache("karpathy/micrograd", ua);
    const lido = await mod.uaCacheado("karpathy/micrograd");
    expect(lido?.nodes?.length).toBe(ua.nodes!.length);
    const arv = await mod.arvoreUACacheada("karpathy/micrograd");
    expect(arv?.raiz.titulo).toBe("micrograd");
    expect(arv?.raiz.filhos[0].titulo).toBe("Autograd engine"); // ordenado pelo tour
  });
});
