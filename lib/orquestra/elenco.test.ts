import { describe, it, expect } from "vitest";
import { montarElenco, usoDe, type LinhaLedgerAgente } from "@/lib/orquestra/elenco";

const l = (agentKey: string, extra: Partial<LinhaLedgerAgente> = {}): LinhaLedgerAgente => ({
  at: "2026-11-09T05:00:00Z", agentKey, model: "gemini-2.5-flash", surface: "estudos", ok: true, ms: 1000, totalTokens: 100, estimatedCostUsd: 0.001, taskId: "t1", ...extra,
});

describe("elenco · os agentes da casa", () => {
  it("lista personas, os 17 mentores e o Octa, sem os orq-*", () => {
    const e = montarElenco({});
    const ids = e.map((a) => a.id);
    expect(ids).toEqual(expect.arrayContaining(["aura", "zaeon", "nina", "zenita", "eiffel", "octa", "medicina", "dados-ia"]));
    expect(e.filter((a) => a.tipo === "mentor")).toHaveLength(17);
    expect(ids.some((i) => i.startsWith("orq-"))).toBe(false);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it("capacidades vêm do cargo: Zenita tem anatomia e a base de medicina; Octa vive na IDE e na Loja", () => {
    const e = montarElenco({});
    const zenita = e.find((a) => a.id === "zenita")!;
    expect(zenita.habilidades).toContain("anatomia");
    expect(zenita.datasets).toEqual(["rag:area:medicina", "rag:area:geral"]);
    expect(zenita.prompt.length).toBeGreaterThan(100);
    const octa = e.find((a) => a.id === "octa")!;
    expect(octa.ondeTrabalha).toEqual(["IDE do lab", "Loja (octa-code)"]);
    const civil = e.find((a) => a.id === "eng-civil")!;
    expect(civil.tipo).toBe("mentor");
    expect(civil.datasets[0]).toBe("rag:area:eng-civil");
    expect(civil.prompt).toContain("MENTOR da Zaeon");
  });
  it("o uso vem do ledger, por chave; chave órfã aparece como sistema (não some gasto)", () => {
    const e = montarElenco({
      ledger: [l("aura"), l("aura", { ok: false, erro: "timeout", taskId: "t2" }), l("medicina", { model: "x" }), l("sistema"), l("sistema")],
    });
    const aura = e.find((a) => a.id === "aura")!;
    expect(aura.uso).toMatchObject({ chamadas: 2, falhas: 1, taxaFalha: 0.5, turnos: 2, erros: [{ erro: "timeout", chamadas: 1 }] });
    expect(e.find((a) => a.id === "medicina")!.uso.modelos).toEqual([{ modelo: "x", chamadas: 1 }]);
    const sis = e.find((a) => a.id === "sistema")!;
    expect(sis).toMatchObject({ tipo: "sistema", uso: { chamadas: 2 } });
  });
  it("perfil do admin renomeia e desativa; agente criado no admin entra como custom", () => {
    const e = montarElenco({ perfis: [{ agentKey: "nina", nome: "Nina 2", ativo: false }, { agentKey: "novo", tipo: "persona", nome: "Novo" }] });
    expect(e.find((a) => a.id === "nina")).toMatchObject({ nome: "Nina 2", ativo: false });
    expect(e.find((a) => a.id === "novo")).toMatchObject({ tipo: "custom", nome: "Novo" });
  });
  it("usoDe: p50 só das que deram certo, por dia, vazio = zeros", () => {
    const u = usoDe([l("a", { ms: 100 }), l("a", { ms: 300, at: "2026-11-08T05:00:00Z" }), l("a", { ok: false, ms: 99_999 })], 7);
    expect(u.msP50).toBe(300);
    expect(u.porDia).toEqual([{ dia: "2026-11-08", chamadas: 1, falhas: 0 }, { dia: "2026-11-09", chamadas: 2, falhas: 1 }]);
    expect(usoDe([], 7)).toMatchObject({ chamadas: 0, ultimo: null, taxaFalha: 0 });
  });
});
