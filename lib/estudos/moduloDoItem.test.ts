import { describe, it, expect } from "vitest";
import { moduloDaSkill } from "./moduloDoItem";
import { itensDasSkillsDoDisco } from "./vitrineSkills";
import { repoDe } from "@/lib/agent/skills-dir";

describe("moduloDaSkill — card → módulo da Sala (puro)", () => {
  it("device sempre abre o painel device, nunca board/chat", () => {
    expect(moduloDaSkill({ familia: "device", repo: null })).toBe("device");
    expect(moduloDaSkill({ familia: "device", repo: "foo/bar" })).toBe("device"); // repo não muda device
  });
  it("curso autoral e procedimento-com-repo abrem o board de código", () => {
    expect(moduloDaSkill({ familia: "course", repo: null })).toBe("board");
    expect(moduloDaSkill({ familia: "course", repo: "a/b" })).toBe("board");
    expect(moduloDaSkill({ familia: "procedimento", repo: "astropy/astropy" })).toBe("board");
  });
  it("procedimento sem repo, agentic e pago caem no agente (saída focada), não no board", () => {
    expect(moduloDaSkill({ familia: "procedimento", repo: null })).toBe("agente");
    expect(moduloDaSkill({ familia: "agentic", repo: null })).toBe("agente");
    expect(moduloDaSkill({ familia: "agentic", repo: "x/y" })).toBe("agente"); // agentic não vira board
    expect(moduloDaSkill({ familia: "pago", repo: "x/y" })).toBe("agente");    // pago não vira board
  });
});

describe("repoDe — owner/name de campo cru ou URL", () => {
  it("aceita owner/name cru, URL, /tree/..., .git e pontuação", () => {
    expect(repoDe("astropy/astropy")).toBe("astropy/astropy");
    expect(repoDe("https://github.com/pandas-dev/pandas")).toBe("pandas-dev/pandas");
    expect(repoDe("https://github.com/JIN2-ASCII/-JIN2-ASCII/tree/main/BLACK-HOLE")).toBe("JIN2-ASCII/-JIN2-ASCII");
    expect(repoDe("biopython/biopython.")).toBe("biopython/biopython");
    expect(repoDe("https://github.com/foo/bar.git")).toBe("foo/bar");
  });
  it("null para lixo", () => {
    expect(repoDe("")).toBeNull();
    expect(repoDe("só-um-nome")).toBeNull();
    expect(repoDe(undefined)).toBeNull();
  });
});

describe("os itens REAIS da vitrine têm módulo coerente (o fio não vira enfeite)", () => {
  const itens = itensDasSkillsDoDisco();

  it("todo item skill:* carrega um módulo válido", () => {
    expect(itens.length).toBeGreaterThan(0);
    for (const it of itens) {
      expect(["board", "device", "agente"], it.id).toContain(it.modulo);
    }
  });

  it("board ⇒ tem repo; device ⇒ tem device; coerência por módulo", () => {
    for (const it of itens) {
      if (it.modulo === "board") expect(it.repo, `${it.id} board sem repo`).toBeTruthy();
      if (it.modulo === "device") expect(it.device, `${it.id} device sem device info`).toBeTruthy();
    }
  });

  it("os cursos de código conhecidos abrem board", () => {
    const board = new Set(itens.filter((i) => i.modulo === "board").map((i) => i.id));
    for (const id of ["skill:astropy-astronomia", "skill:pandas-analise-de-dados", "skill:algoritmos-classicos"]) {
      expect(board, `${id} deveria abrir board`).toContain(id);
    }
  });

  it("um device conhecido (musescore) abre o painel device, não o chat/board", () => {
    const mu = itens.find((i) => i.id === "skill:musescore-partituras");
    expect(mu, "musescore sumiu da vitrine").toBeTruthy();
    expect(mu!.modulo).toBe("device");
  });
});
