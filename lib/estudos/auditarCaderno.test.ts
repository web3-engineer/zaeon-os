import { describe, it, expect } from "vitest";
import { auditarCaderno } from "./auditarCaderno";
import type { CadernoEstudo } from "./cadernosEstudo";

const pag = (id: string, blocos: any[]) => ({ id, titulo: id, blocos });
const fonteOk = { tipo: "fontes", itens: [{ titulo: "IPCC AR6", url: "https://ipcc.ch", tipo: "artigo" }] };

const bom: CadernoEstudo = {
  id: "t", titulo: "T", resumo: "r",
  paginas: [pag("a", [{ tipo: "texto", texto: "x" }, fonteOk]), pag("b", [{ tipo: "video", titulo: "v", youtube: "nVLFJofvn4E" }]), pag("c", [{ tipo: "texto", texto: "y" }])],
};

describe("auditarCaderno", () => {
  it("caderno bom e com páginas suficientes passa", () => {
    expect(auditarCaderno(bom, 3)).toEqual([]);
  });
  it("páginas de menos reprova", () => {
    expect(auditarCaderno(bom, 36).some((x) => x.startsWith("poucas_paginas"))).toBe(true);
  });
  it("sem fontes reprova", () => {
    const c = { ...bom, paginas: [pag("a", [{ tipo: "texto", texto: "x" }])] };
    expect(auditarCaderno(c as any, 1)).toContain("sem_fontes");
  });
  it("vídeo com id placeholder/curto reprova", () => {
    const c = { ...bom, paginas: [pag("a", [fonteOk, { tipo: "video", titulo: "v", youtube: "xxxx" }])] };
    expect(auditarCaderno(c as any, 1).some((x) => x.startsWith("video_invalido"))).toBe(true);
  });
  it("mobilização sem papel/entrega reprova", () => {
    const c = { ...bom, paginas: [pag("a", [fonteOk, { tipo: "mobilizacao", papel: "", porque: "p", entregaEsperada: "" }])] };
    expect(auditarCaderno(c as any, 1)).toContain("mobilizacao_incompleta");
  });
  it("lição com índice fora reprova", () => {
    const c = { ...bom, paginas: [pag("a", [fonteOk, { tipo: "licao", pergunta: "?", alternativas: ["a", "b"], correta: 5, explicacao: "e" }])] };
    expect(auditarCaderno(c as any, 1)).toContain("licao_invalida");
  });
});
