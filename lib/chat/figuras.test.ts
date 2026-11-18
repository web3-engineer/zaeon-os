import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { MAX_PASSOS, ehPassos, parsePassos } from "@/lib/chat/passos";
import { MAX_MERMAID, TIPOS_DIAGRAMA, ehDiagrama, parseDiagrama, validarMermaid } from "@/lib/chat/diagrama";
import { figuraDoBloco, figuraDoJson } from "@/lib/chat/figuras";

const j = (v: unknown) => JSON.stringify(v);
const exemploDoCard = (skill: string): string => {
  const md = readFileSync(`.claude/skills/${skill}/SKILL.md`, "utf8");
  return [...md.matchAll(/```\n([[{][\s\S]*?)\n```/g)].pop()![1];
};
const PASSOS = [{ passo: 1, latex: "2x + 6 = 10", explicacao: "Equação original." }, { passo: 2, latex: "2x = 4", explicacao: "Subtrai 6." }];
const GEO = [{ nome: "A", tipo: "point", pais: [0, 0], papel: "ponto livre" }];
const DIAG = { titulo: "Login", tipo: "flowchart", mermaid: "flowchart TD\n  A[\"Entrar\"] --> B{\"Ok?\"}", leitura: "De cima para baixo." };
const PART = { titulo: "Escala de Dó", tom: "C", abc: "X:1\nK:C\nC D E F | G A B c |]", conceito: "Graus conjuntos." };

describe("parsePassos — a resolução da skill formulas-katex", () => {
  it("aceita o exemplo do SKILL.md e a tarefa canônica", () => {
    expect(ehPassos(exemploDoCard("formulas-katex"))).toBe(true);
    const r = parsePassos(j(PASSOS));
    expect(r.ok && r.passos.map((p) => p.latex)).toEqual(["2x + 6 = 10", "2x = 4"]);
  });

  it("tira o delimitador que o modelo põe apesar de a skill pedir sem", () => {
    const r = parsePassos(j([{ passo: 1, latex: "$x = 2$", explicacao: "" }, { passo: 2, latex: "$$x^2$$", explicacao: "" }, { passo: 3, latex: "\\[a+b\\]", explicacao: "" }]));
    expect(r.ok && r.passos.map((p) => p.latex)).toEqual(["x = 2", "x^2", "a+b"]);
  });

  it("a numeração é a da ordem, mesmo que o modelo repita ou pule", () => {
    const r = parsePassos(j([{ passo: 7, latex: "a", explicacao: "" }, { passo: 7, latex: "b", explicacao: "" }]));
    expect(r.ok && r.passos.map((p) => p.passo)).toEqual([1, 2]);
  });

  it("as três chaves em TODO item — lista de outra skill não é resolução", () => {
    expect(ehPassos(j([{ titulo: "Slide", conteudo: "x" }]))).toBe(false);
    expect(ehPassos(j([{ latex: "x" }]))).toBe(false);
    expect(ehPassos(j([...PASSOS, { passo: 3, latex: "x" }]))).toBe(false);
    expect(ehPassos(j(GEO))).toBe(false);
    expect(ehPassos(j([{ passo: 1, latex: 42, explicacao: "" }]))).toBe(false);
    expect(ehPassos(j([{ passo: 1, latex: "  ", explicacao: "" }]))).toBe(false);
  });

  it("limites, e nunca lança", () => {
    expect(ehPassos(j(Array.from({ length: MAX_PASSOS + 1 }, (_, i) => ({ passo: i, latex: "x", explicacao: "" }))))).toBe(false);
    expect(ehPassos(j([{ passo: 1, latex: "x".repeat(601), explicacao: "" }]))).toBe(false);
    for (const lixo of ["", "null", "[]", "[null]", "{", undefined as unknown as string]) {
      expect(() => parsePassos(lixo)).not.toThrow();
      expect(parsePassos(lixo).ok).toBe(false);
    }
  });
});

describe("parseDiagrama — o diagrama da skill diagrama-mermaid", () => {
  it("aceita o exemplo do SKILL.md, e os tipos do card são os do validador", () => {
    const r = parseDiagrama(exemploDoCard("diagrama-mermaid"));
    expect(r.ok && r.diagrama.tipo).toBe("flowchart");
    const md = readFileSync(".claude/skills/diagrama-mermaid/SKILL.md", "utf8");
    const linha = md.split("\n").find((l) => l.startsWith("- `tipo`"))!;
    expect([...linha.matchAll(/`([a-z]+)`/g)].map((m) => m[1]).filter((t) => t !== "tipo").sort()).toEqual([...TIPOS_DIAGRAMA].sort());
  });

  it("o tipo é o do CÓDIGO, não o que o modelo declarou", () => {
    const r = parseDiagrama(j({ ...DIAG, tipo: "er", mermaid: "sequenceDiagram\n  A->>B: oi" }));
    expect(r.ok && r.diagrama.tipo).toBe("sequence");
  });

  it("os cinco tipos da skill entram; o resto do Mermaid não", () => {
    for (const c of ["flowchart LR\n A-->B", "graph TD\n A-->B", "sequenceDiagram\n A->>B: x", "classDiagram\n class A", "stateDiagram-v2\n [*] --> A", "erDiagram\n A ||--o{ B : tem"]) {
      expect(validarMermaid(c).ok, c).toBe(true);
    }
    for (const c of ["gantt\n title x", "pie\n \"a\": 1", "mindmap\n root", "gitGraph\n commit", "texto qualquer", ""]) {
      expect(validarMermaid(c).ok, c).toBe(false);
    }
  });

  it("diretiva de configuração é recusada — quem configura o Mermaid é a página", () => {
    const init = '%%{init: {"securityLevel": "loose"}}%%\nflowchart TD\n A-->B';
    expect(validarMermaid(init)).toEqual({ ok: false, erro: "diretiva de configuração não é aceita" });
    expect(validarMermaid('flowchart TD\n %%{ init: {"theme":"dark"} }%%\n A-->B').ok).toBe(false);
    expect(validarMermaid("flowchart TD\n %% comentário comum\n A-->B").ok).toBe(true);
  });

  it("tira a cerca ```mermaid que o modelo põe dentro do campo, e limita o tamanho", () => {
    const r = parseDiagrama(j({ ...DIAG, mermaid: "```mermaid\nflowchart TD\n A-->B\n```" }));
    expect(r.ok && r.diagrama.mermaid).toBe("flowchart TD\n A-->B");
    expect(validarMermaid("flowchart TD\n" + "A-->B\n".repeat(MAX_MERMAID)).ok).toBe(false);
  });

  it("objeto de outra coisa não é diagrama, e nunca lança", () => {
    expect(ehDiagrama(j({ titulo: "x", tom: "C", abc: "X:1", conceito: "y" }))).toBe(false);
    expect(ehDiagrama(j({ mermaid: "flowchart TD\n A-->B" }))).toBe(false);
    expect(ehDiagrama(j([DIAG]))).toBe(false);
    for (const lixo of ["", "null", "{", "[]", undefined as unknown as string]) expect(parseDiagrama(lixo).ok).toBe(false);
  });
});

describe("figuras — qual desenho um JSON do modelo é", () => {
  it("pela forma: cada skill cai na sua figura, e só nela", () => {
    expect(figuraDoJson(j(GEO))).toBe("geometria");
    expect(figuraDoJson(j(PASSOS))).toBe("passos");
    expect(figuraDoJson(j(DIAG))).toBe("diagrama");
    expect(figuraDoJson(j(PART))).toBe("partitura");
    expect(figuraDoJson(exemploDoCard("geometria-jsxgraph"))).toBe("geometria");
    expect(figuraDoJson(exemploDoCard("formulas-katex"))).toBe("passos");
    expect(figuraDoJson(exemploDoCard("diagrama-mermaid"))).toBe("diagrama");
    expect(figuraDoJson(exemploDoCard("partitura-abc"))).toBe("partitura");
  });

  it("a partitura (objeto com `abc`) não colide com o diagrama (objeto com `mermaid`)", () => {
    expect(figuraDoJson(j(PART))).toBe("partitura");
    expect(figuraDoJson(j(DIAG))).toBe("diagrama");
  });

  it("as outras skills agentic da casa NÃO viram figura", () => {
    for (const skill of ["lgpd-scan"]) {
      expect(figuraDoJson(exemploDoCard(skill)), skill).toBeNull();
    }
    expect(figuraDoJson(j([{ titulo: "Slide 1", conteudo: "abertura" }]))).toBeNull();   // slides-agente
    expect(figuraDoJson("um texto [com colchetes]")).toBeNull();
    expect(figuraDoJson("[1,2,3]")).toBeNull();
    expect(figuraDoJson("{}")).toBeNull();
  });

  it("bloco com a linguagem da figura é explícito; ```json e sem linguagem dependem da forma", () => {
    expect(figuraDoBloco("geometria", "lixo")).toBe("geometria");
    expect(figuraDoBloco("passos", "lixo")).toBe("passos");
    expect(figuraDoBloco("diagrama", "lixo")).toBe("diagrama");
    expect(figuraDoBloco("mermaid", "flowchart TD\n A-->B")).toBe("mermaid");
    expect(figuraDoBloco("partitura", "lixo")).toBe("partitura");
    expect(figuraDoBloco("json", j(PASSOS))).toBe("passos");
    expect(figuraDoBloco("", j(DIAG))).toBe("diagrama");
    expect(figuraDoBloco("json", j(PART))).toBe("partitura");
    expect(figuraDoBloco("json", '{"a":1}')).toBeNull();
    expect(figuraDoBloco("python", j(PASSOS))).toBeNull();   // código de verdade não é sequestrado
  });
});
