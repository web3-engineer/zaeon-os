import { describe, it, expect, vi } from "vitest";

// o motor de visão é mockado: este teste é da LÓGICA da tool (achar a imagem, mapear o resultado),
// não da chamada ao Vertex (essa é testada em lib/ai/descreverImagem.test.ts com gen injetável).
vi.mock("@/lib/ai/descreverImagem", () => ({
  descreverImagem: vi.fn(async (_img: unknown, pergunta?: string) => ({ ok: true, texto: `VISTO:${pergunta ?? "default"}` })),
}));

import { imagensDoCtx, visaoNoHarnessLigado, descreverImagemDef, type ImagemDoTurno } from "@/lib/agent/toolsVisao";

const img: ImagemDoTurno = { id: "img1", nome: "foto.png", mime: "image/png", dataB64: "AAAA" };
const comImg = { imagens: [img] } as unknown;
const semImg = {} as unknown;

describe("imagensDoCtx", () => {
  it("lê imagens válidas do ctx; lixo/ausente → vazio", () => {
    expect(imagensDoCtx(comImg)).toHaveLength(1);
    for (const c of [semImg, {}, null, undefined, { imagens: "x" }, { imagens: [null, { nome: "x" }] }]) {
      expect(imagensDoCtx(c)).toEqual([]);
    }
  });
});

describe("visaoNoHarnessLigado (flag default OFF)", () => {
  it("1/true/on liga; resto (inclusive ausente) desliga", () => {
    for (const v of ["1", "true", "on", "TRUE"]) expect(visaoNoHarnessLigado({ VISAO_HARNESS: v })).toBe(true);
    for (const v of ["0", "", "no", undefined]) expect(visaoNoHarnessLigado({ VISAO_HARNESS: v })).toBe(false);
  });
});

describe("descrever_imagem", () => {
  it("disponível no turno SÓ quando há imagem", () => {
    expect(descreverImagemDef.disponivelNoTurno!(comImg as never)).toBe(true);
    expect(descreverImagemDef.disponivelNoTurno!(semImg as never)).toBe(false);
  });
  it("é read/free/ts", () => {
    expect(descreverImagemDef.risk).toBe("read");
    expect(descreverImagemDef.minPlan).toBe("free");
    expect(descreverImagemDef.runtime).toBe("ts");
  });
  it("sem imagem → sem_imagem", async () => {
    expect(await descreverImagemDef.run({}, semImg as never)).toMatchObject({ ok: false, code: "sem_imagem" });
  });
  it("descreve a imagem e repassa a pergunta", async () => {
    const r = await descreverImagemDef.run({ pergunta: "que diz a placa?" }, comImg as never);
    expect(r.ok).toBe(true);
    expect(r.findings![0].claim).toBe("VISTO:que diz a placa?");
    expect(r.findings![0].source!.title).toContain("foto.png");
  });
  it("acha a imagem por id/nome quando há referência", async () => {
    const duas = { imagens: [img, { ...img, id: "img2", nome: "mapa.png" }] } as unknown;
    const r = await descreverImagemDef.run({ imagem: "mapa.png" }, duas as never);
    expect(r.findings![0].source!.title).toContain("mapa.png");
  });
});
