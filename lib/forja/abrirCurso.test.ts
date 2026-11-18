import { describe, it, expect } from "vitest";
import { cursoIdDoItem } from "./abrirCurso";

describe("cursoIdDoItem — item da vitrine → cursoId de código", () => {
  it("curso da Forja (forja:*) vira cursoId", () => {
    expect(cursoIdDoItem({ id: "forja:pomodoro" })).toBe("pomodoro");
  });
  it("skill:* de módulo board vira cursoId; device/agente não", () => {
    expect(cursoIdDoItem({ id: "skill:biopython-bioinformatica", modulo: "board" })).toBe("biopython-bioinformatica");
    expect(cursoIdDoItem({ id: "skill:musescore-partituras", modulo: "device" })).toBeNull();
    expect(cursoIdDoItem({ id: "skill:diagrama-mermaid", modulo: "agente" })).toBeNull();
    expect(cursoIdDoItem({ id: "skill:x" })).toBeNull(); // sem módulo board
  });
  it("outros ids e nulos → null", () => {
    expect(cursoIdDoItem({ id: "orq-noether" })).toBeNull();
    expect(cursoIdDoItem({ id: "forja:" })).toBeNull();
    expect(cursoIdDoItem(null)).toBeNull();
  });
});
