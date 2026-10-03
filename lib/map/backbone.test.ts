import { describe, it, expect } from "vitest";
import { normalizarBackbone, backboneValido, completudes, proximoDoBackbone, quantoFaltaConcluir, estadoGate, MIN_PASSOS } from "@/lib/map/backbone";
import { nosFromStructured, idDeNo, setEstado } from "@/lib/map/grafo";
import type { MapaNo } from "@/lib/map/tipos";

const passos = (...labels: string[]) => ({ passos: labels.map((label) => ({ label, tipo: "passo", corpo: "fazer " + label })) });

describe("normalizarBackbone", () => {
  it("vira nós planejados + cadeia pre_requisito + lista ordenada; último passo = nó de conclusão do arquétipo", () => {
    const r = normalizarBackbone(passos("Fundamentos", "Medir", "Comprovar"), "aplicavel", [])!;
    expect(r.backbone).toHaveLength(3);
    expect(r.nos.every((n) => n.planejado && n.estado === "a_conquistar")).toBe(true);
    expect(r.nos[2]!.tipo).toBe("experimento");
    expect(r.arestas).toEqual([{ de: r.backbone[0], para: r.backbone[1], relacao: "pre_requisito" }, { de: r.backbone[1], para: r.backbone[2], relacao: "pre_requisito" }]);
    expect(backboneValido(r.backbone, r.nos, r.arestas)).toBe(true);
  });
  it("poucos passos / lixo → null", () => {
    expect(normalizarBackbone(passos("a", "b"), "conceitual", [])).toBeNull();
    expect(normalizarBackbone({ passos: [null, 3, {}] }, "conceitual", [])).toBeNull();
    expect(normalizarBackbone("x", "conceitual", [])).toBeNull();
  });
  it("passo repetido não cria ciclo nem id duplicado; aceita lista crua de strings", () => {
    const r = normalizarBackbone(["A", "B", "A", "C"], "exploratorio", [])!;
    expect(r.backbone).toHaveLength(3);
    expect(new Set(r.backbone).size).toBe(3);
  });
  it("reaproveita um conceito já estudado com o mesmo nome (merge planejado × realizado)", () => {
    const estudados = nosFromStructured({ nucleo: "n", conceitos: ["Fotossíntese"] } as any, "m1");
    const r = normalizarBackbone(passos("Fotossíntese", "Ciclo de Calvin", "Explicar"), "conceitual", estudados)!;
    expect(r.backbone[0]).toBe(idDeNo("conceito", "Fotossíntese"));
    expect(r.nos[0]!.planejado).toBeUndefined();
    expect(r.nos[0]!.estado).toBe("aprendido");
  });
  it("backboneValido rejeita id inexistente, repetição e cadeia quebrada", () => {
    const r = normalizarBackbone(passos("a", "b", "c"), "conceitual", [])!;
    expect(backboneValido([...r.backbone, "zz"], r.nos, r.arestas)).toBe(false);
    expect(backboneValido([r.backbone[0]!, r.backbone[0]!], r.nos, r.arestas)).toBe(false);
    expect(backboneValido(r.backbone, r.nos, [])).toBe(false);
    expect(backboneValido([], r.nos, r.arestas)).toBe(false);
  });
});

describe("completudes / quantoFaltaConcluir", () => {
  const base = normalizarBackbone(passos("a", "b", "c", "d"), "aplicavel", [])!;
  const mapa = (nos: MapaNo[], modo: any = "humana", tipo: any = "aplicavel") => ({ nos, backbone: base.backbone, modoValidacao: modo, tipoTopico: tipo, criterioCompletude: "", objetivo: "Obj" });

  it("gate por modo: humana=validado; rubrica/quiz/peer=aplicado; cobertura/nenhuma=aprendido", () => {
    expect(estadoGate("humana")).toBe("validado");
    expect(estadoGate("quiz")).toBe("aplicado");
    expect(estadoGate("cobertura")).toBe("aprendido");
  });
  it("duas barras independentes: aprendizado sobe com nós acesos; conclusão só com o gate", () => {
    let nos = base.nos;
    expect(completudes(mapa(nos))).toMatchObject({ aprendizado: 0, conclusao: 0, backboneTotal: 4 });
    nos = setEstado(nos, base.backbone[0]!, "aprendido")!; nos = setEstado(nos, base.backbone[1]!, "aprendido")!;
    expect(completudes(mapa(nos))).toMatchObject({ aprendizado: 0.5, conclusao: 0 });
    expect(completudes(mapa(nos, "cobertura", "exploratorio"))).toMatchObject({ conclusao: 0.5 }); // mesmo grafo, outro gate
    nos = setEstado(nos, base.backbone[0]!, "validado")!;
    expect(completudes(mapa(nos))).toMatchObject({ conclusao: 0.25, backboneNoGate: 1 });
  });
  it("próximo do backbone = 1º que não passou o gate; null quando concluído", () => {
    let nos = base.nos;
    expect(proximoDoBackbone(mapa(nos))!.id).toBe(base.backbone[0]);
    for (const id of base.backbone) nos = setEstado(nos, id, "validado")!;
    expect(proximoDoBackbone(mapa(nos))).toBeNull();
  });
  it("texto adaptado ao arquétipo e ao critério", () => {
    const t = quantoFaltaConcluir(mapa(base.nos));
    expect(t).toMatch(/Faltam 4 de 4/); expect(t).toMatch(/validação humana/); expect(t).toMatch(/aplicar e comprovar/);
    const semBb = quantoFaltaConcluir({ ...mapa(base.nos), backbone: [] });
    expect(semBb).toMatch(/Percurso ainda não traçado/);
    let nos = base.nos; for (const id of base.backbone) nos = setEstado(nos, id, "validado")!;
    expect(quantoFaltaConcluir({ ...mapa(nos), criterioCompletude: "Laudo" })).toMatch(/concluído: Laudo/);
    expect(quantoFaltaConcluir(mapa(base.nos, "quiz", "conceitual"))).toMatch(/fechar a rede de conceitos/);
  });
  it("MIN_PASSOS é o contrato do normalizador", () => expect(MIN_PASSOS).toBe(3));
});
