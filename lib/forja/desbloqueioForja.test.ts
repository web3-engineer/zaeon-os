import { describe, it, expect } from "vitest";
import { forjaDoItem } from "./desbloqueioForja";
import { ITENS_FORJA_INICIANTES } from "@/lib/estudos/vitrine";
import { INICIANTES } from "./catalogoIniciantes";

describe("desbloqueioForja — card da vitrine → curso da Forja", () => {
  it("forjaDoItem mapeia id `forja:<cursoId>` existente; ignora o resto", () => {
    expect(forjaDoItem({ id: "forja:quiz" })).toBe("quiz");
    expect(forjaDoItem({ id: "forja:lista-de-tarefas" })).toBe("lista-de-tarefas");
    expect(forjaDoItem({ id: "forja:nao-existe" })).toBeNull(); // curso inexistente não abre
    expect(forjaDoItem({ id: "octa-code" })).toBeNull(); // não é da forja
    expect(forjaDoItem(null)).toBeNull();
  });
});

describe("vitrine — os 10 cursos OSS da Forja", () => {
  it("são 10, grátis, do tipo curso, com id forja:<cursoId> que o desbloqueio resolve", () => {
    expect(ITENS_FORJA_INICIANTES).toHaveLength(INICIANTES.length);
    for (const it of ITENS_FORJA_INICIANTES) {
      expect(it.preco).toBe(0);                 // código aberto não cobra
      expect(it.tipo).toBe("curso");
      expect(it.execucao).toBe("dyom");
      expect(it.id.startsWith("forja:")).toBe(true);
      expect(it.tags).toContain("grátis");
      expect(it.tags).toContain("forja");
      expect(forjaDoItem(it)).toBe(it.id.slice("forja:".length)); // cada card abre o curso certo
    }
  });
});
