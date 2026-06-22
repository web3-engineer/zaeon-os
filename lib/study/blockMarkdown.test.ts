import { describe, it, expect } from "vitest";
import { detectHeadingShortcut } from "@/lib/study/blockMarkdown";

describe("detectHeadingShortcut", () => {
  it("'# ' vira h1 e tira o prefixo", () => {
    expect(detectHeadingShortcut("# Título")).toEqual({ variant: "h1", text: "Título" });
    expect(detectHeadingShortcut("# ")).toEqual({ variant: "h1", text: "" });
  });

  it("'## '/'### ' viram h2 (h2 é o máximo do modelo)", () => {
    expect(detectHeadingShortcut("## Sub")).toEqual({ variant: "h2", text: "Sub" });
    expect(detectHeadingShortcut("### Profundo")).toEqual({ variant: "h2", text: "Profundo" });
  });

  it("sem espaço após os # NÃO converte", () => {
    expect(detectHeadingShortcut("#semespaco")).toBeNull();
    expect(detectHeadingShortcut("#Hello mundo")).toBeNull();
  });

  it("texto normal e vazio → null", () => {
    expect(detectHeadingShortcut("texto comum")).toBeNull();
    expect(detectHeadingShortcut("")).toBeNull();
    expect(detectHeadingShortcut(undefined as any)).toBeNull();
  });

  it("preserva o resto, inclusive múltiplas linhas", () => {
    expect(detectHeadingShortcut("# Linha 1\nLinha 2")).toEqual({ variant: "h1", text: "Linha 1\nLinha 2" });
    expect(detectHeadingShortcut("#  dois espaços")).toEqual({ variant: "h1", text: "dois espaços" });
  });
});
