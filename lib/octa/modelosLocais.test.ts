import { describe, it, expect } from "vitest";
import {
  MODELOS_LOCAIS, PLANO_LOCAL, modeloLocalPorId, locaisHabilitados,
  localLigadoOcta, localDisponivelOcta, podeUsarLocal,
} from "./modelosLocais";

describe("catálogo de modelos locais", () => {
  it("o coder aponta pro grupo do gateway e não é multimodal", () => {
    const coder = modeloLocalPorId("coder");
    expect(coder).toMatchObject({ id: "coder", grupo: "zaeon-local-coder", multimodal: false });
    expect(MODELOS_LOCAIS.every((m) => m.id && m.grupo && m.nome)).toBe(true);
  });
  it("modeloLocalPorId é case/espaço-insensível; id desconhecido → undefined", () => {
    expect(modeloLocalPorId("  CODER ")?.id).toBe("coder");
    expect(modeloLocalPorId("gemini")).toBeUndefined();
  });
});

describe("locaisHabilitados / localDisponivelOcta — flag do dono", () => {
  it("OCTA_MODELOS_LOCAIS lista os ligados; vazio/ausente = nenhum", () => {
    expect(locaisHabilitados({ OCTA_MODELOS_LOCAIS: "coder" }).map((m) => m.id)).toEqual(["coder"]);
    expect(locaisHabilitados({})).toEqual([]);
    expect(locaisHabilitados({ OCTA_MODELOS_LOCAIS: "" })).toEqual([]);
    expect(localLigadoOcta({ OCTA_MODELOS_LOCAIS: "coder" })).toBe(true);
    expect(localLigadoOcta({})).toBe(false);
  });
  it("id desconhecido na flag é ignorado", () => {
    expect(locaisHabilitados({ OCTA_MODELOS_LOCAIS: "coder,inventado" }).map((m) => m.id)).toEqual(["coder"]);
    expect(locaisHabilitados({ OCTA_MODELOS_LOCAIS: "inventado" })).toEqual([]);
  });
  it("localDisponivelOcta só devolve o que está ligado", () => {
    expect(localDisponivelOcta("coder", { OCTA_MODELOS_LOCAIS: "coder" })?.id).toBe("coder");
    expect(localDisponivelOcta("coder", {})).toBeUndefined();
    expect(localDisponivelOcta("gemini", { OCTA_MODELOS_LOCAIS: "coder" })).toBeUndefined();
  });
});

describe("podeUsarLocal — gate de plano plus+", () => {
  it("plus/pro/max ou super-admin podem; free não", () => {
    expect(PLANO_LOCAL).toBe("plus");
    expect(podeUsarLocal("plus")).toBe(true);
    expect(podeUsarLocal("pro")).toBe(true);
    expect(podeUsarLocal("max")).toBe(true);
    expect(podeUsarLocal("free")).toBe(false);
    expect(podeUsarLocal(null)).toBe(false);
    expect(podeUsarLocal("free", true)).toBe(true);   // super-admin override
  });
});
