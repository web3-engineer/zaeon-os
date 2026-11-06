import { describe, it, expect } from "vitest";
import { motivoDoErro, resumoDoEnvio, type ResultadoEnvio } from "./minhaBase";

const ok = (nome: string, paginas: number, status: "novo" | "reaproveitado" = "novo"): ResultadoEnvio =>
  ({ nomeArquivo: nome, documentoId: "d", status, trechos: 1, paginas });
const ruim = (nome: string, erro: ResultadoEnvio["erro"]): ResultadoEnvio =>
  ({ nomeArquivo: nome, documentoId: "", status: "erro", erro, trechos: 0, paginas: 0 });

describe("resumoDoEnvio", () => {
  it("um documento", () => {
    expect(resumoDoEnvio([ok("Apostila 3.pdf", 42)])).toBe("Guardei **Apostila 3** na sua base — 42 páginas. Já dá pra perguntar.");
    expect(resumoDoEnvio([ok("a.pdf", 1)])).toContain("— 1 página.");
  });
  it("vários, reaproveitado conta como guardado, e os que falharam com o motivo", () => {
    const s = resumoDoEnvio([ok("A.pdf", 2), ok("B.pdf", 5, "reaproveitado"), ruim("C.pdf", "sem_texto")]);
    expect(s).toBe([
      "Guardei 2 documentos na sua base. Já dá pra perguntar sobre eles:",
      "- **A** — 2 páginas",
      "- **B** — 5 páginas",
      "",
      "Um arquivo ficou de fora:",
      "- **C**: não tem texto que dê pra ler (PDF escaneado, ou um .docx só de imagem?)",
    ].join("\n"));
  });
  it("só falhas; vazio ⇒ ''", () => {
    expect(resumoDoEnvio([ruim("x.pdf", "limite_base"), ruim("y.pdf", "rede")])).toMatch(/^2 arquivos ficaram de fora:/);
    expect(resumoDoEnvio([])).toBe("");
  });
});

describe("motivoDoErro", () => {
  it("cobre todos e tem um padrão", () => {
    expect(motivoDoErro("grande_demais")).toContain("25 MB");
    expect(motivoDoErro("limite_base")).toContain("50");
    expect(motivoDoErro(undefined)).toContain("tente de novo");
  });
});
