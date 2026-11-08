// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { CATALOGO, filtrarVitrine } from "@/lib/estudos/vitrine";

afterEach(() => { vi.unstubAllGlobals(); });

describe("Vitrine · os agentes da orquestra aparecem como o Octa", () => {
  it("estão no catálogo, plugáveis, e no filtro 'Um agente faz'", () => {
    const ids = CATALOGO.filter((i) => i.plugavel?.startsWith("orq-")).map((i) => i.id);
    expect(ids).toEqual(["orq-deepseek", "orq-tongyi", "orq-qwen", "orq-kimi", "orq-enxame"]);
    expect(filtrarVitrine(CATALOGO, "agente").map((i) => i.id)).toEqual(expect.arrayContaining(ids));
    expect(filtrarVitrine(CATALOGO, "todos", "kimi").map((i) => i.id)).toContain("orq-kimi");
  });
});
