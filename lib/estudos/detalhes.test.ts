import { describe, it, expect } from "vitest";
import { CATALOGO, type ItemVitrine } from "@/lib/estudos/vitrine";
import { descricaoDe, destinoDe, handleDe, nichoDe, publicadorDe, validadoresDe } from "@/lib/estudos/detalhes";

const base = CATALOGO.find((i) => i.id === "ps5-rev")!;
const com = (x: Partial<ItemVitrine>): ItemVitrine => ({ ...base, ...x });

describe("detalhes · quem publicou", () => {
  it("handle sem acento, sem parênteses e sem espaço", () => {
    expect(handleDe("Dra. Iracema Lopes")).toBe("@drairacemalopes");
    expect(handleDe("Agente Deploy (Zaeon)")).toBe("@agentedeploy");
    expect(handleDe("   ")).toBe("@conta");
  });
  it("a conta ligada manda; sem conta, o autor (verificada só a Zaeon)", () => {
    expect(publicadorDe(com({ conta: { id: "u1", nome: "Lia", handle: "lia", verificada: true } }))).toMatchObject({ nome: "Lia", handle: "@lia", verificada: true, contaId: "u1" });
    expect(publicadorDe(com({}))).toMatchObject({ nome: base.autor, verificada: false, contaId: null });
    expect(publicadorDe(com({ autor: "Prof. Estouro" })).inicial).toBe("E");
  });
  it("os agentes da orquestra são publicados pela Zaeon", () => {
    for (const it of CATALOGO.filter((i) => i.id.startsWith("orq-"))) expect(publicadorDe(it)).toMatchObject({ nome: "Zaeon", verificada: true });
  });
});

describe("detalhes · nicho, validadores, descrição", () => {
  it("nicho cai no tipo; validadores ausentes = null (nunca inventa)", () => {
    expect(nichoDe(com({ nicho: "Aeroespacial" }))).toBe("Aeroespacial");
    expect(nichoDe(com({}))).toBe("Curso");
    expect(validadoresDe(com({}))).toBeNull();
    expect(validadoresDe(com({ validadores: 12.7 }))).toBe(12);
  });
  it("a descrição de quem publicou vem primeiro, em parágrafos; o resto sai dos campos do card", () => {
    const d = descricaoDe(com({ descricao: "Primeiro.\n\nSegundo." }));
    expect(d[0]).toEqual({ tipo: "paragrafos", itens: ["Primeiro.", "Segundo."] });
    expect(d.map((s) => s.titulo)).toEqual([undefined, "O QUE VEM", "COMO FUNCIONA", "VALIDAÇÃO", "FRAÇÕES", "TAGS"]);
    expect(descricaoDe(com({}))[0]).toEqual({ tipo: "paragrafos", itens: [base.subtitulo] });
  });
  it("destino de cada tipo", () => {
    expect(destinoDe(com({ tipo: "agente" })).aba).toBe("chat");
    expect(destinoDe(com({ tipo: "rwa" })).aba).toBe("escritorio");
    expect(destinoDe(com({ tipo: "curso" }))).toEqual({ texto: "na Sala de Estudos", aba: "estudos" });
    // skill-curso (id skill:*) e curso da Forja (id forja:*) abrem como DOCUMENTO na aba do chat —
    // NÃO na vista "estudos", que o StudyRoomContent remapeia pro feed (a estética blueprint).
    expect(destinoDe(com({ id: "skill:astropy-astronomia", tipo: "skill" }))).toEqual({ texto: "na Sala de Estudos", aba: "chat" });
    expect(destinoDe(com({ id: "forja:pomodoro", tipo: "curso" }))).toEqual({ texto: "na Sala de Estudos", aba: "chat" });
  });
});
