import { describe, it, expect } from "vitest";
import { destinoDoDoc, type DocArtefato } from "./documentos";

const doc = (over: Partial<DocArtefato> = {}): DocArtefato => ({
  sala: "estudos", studioKind: "forja", artifactId: "a1", titulo: "Pomodoro", ...over,
});

describe("destinoDoDoc — em qual aba o documento entra e se foca", () => {
  describe("auto-abertura (card de forja/caderno)", () => {
    it("ignora o scopeId fantasma e entra na aba ATIVA de agora, focando (o bug do board invisível)", () => {
      // scopeId foi capturado como "A" no mount; a sincronização trocou a ativa para "B".
      const r = destinoDoDoc(doc({ autoAbrir: true, focar: true, scopeId: "A" }), "B");
      expect(r).toEqual({ aba: "B", foca: true });
    });
    it("sem scopeId também entra na ativa e foca", () => {
      expect(destinoDoDoc(doc({ autoAbrir: true, focar: true }), "B")).toEqual({ aba: "B", foca: true });
    });
    it("sem aba ativa ainda → não foca (nada para mostrar)", () => {
      expect(destinoDoDoc(doc({ autoAbrir: true, focar: true }), null)).toEqual({ aba: null, foca: false });
    });
  });

  describe("caso normal (gerado numa conversa)", () => {
    it("scopeId é a ativa → entra nela e foca", () => {
      expect(destinoDoDoc(doc({ focar: true, scopeId: "A" }), "A")).toEqual({ aba: "A", foca: true });
    });
    it("a pessoa trocou de conversa durante a geração → entra na de origem, mas NÃO rouba a tela", () => {
      expect(destinoDoDoc(doc({ focar: true, scopeId: "A" }), "B")).toEqual({ aba: "A", foca: false });
    });
    it("sem scopeId → cai na ativa e foca", () => {
      expect(destinoDoDoc(doc({ focar: true }), "A")).toEqual({ aba: "A", foca: true });
    });
    it("sem focar → abre em segundo plano (foca false)", () => {
      expect(destinoDoDoc(doc({ scopeId: "A" }), "A")).toEqual({ aba: "A", foca: false });
    });
  });
});
