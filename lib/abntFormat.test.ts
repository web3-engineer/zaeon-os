import { describe, it, expect } from "vitest";
import {
  buildAbnt,
  buildInline,
  hasEnoughMeta,
  missingMeta,
  normalizeAuthors,
  type CiteMeta,
} from "./abntFormat";

const A = (s: string[]) => normalizeAuthors(s);

describe("buildAbnt (NBR 6023:2018)", () => {
  it("monografia: AUTOR. Título. ano.", () => {
    const m: CiteMeta = { authors: A(["Maria Silva Santos"]), title: "A história do Brasil", year: 2020 };
    expect(buildAbnt(m)).toBe("SANTOS, Maria Silva. A história do Brasil. 2020.");
  });

  it("4+ autores → primeiro + et al.", () => {
    const m: CiteMeta = { authors: A(["Ana Alves", "B Costa", "C Dias", "D Reis"]), title: "Obra", year: 2022 };
    expect(buildAbnt(m)).toContain("ALVES, Ana et al.");
    expect(buildAbnt(m)).not.toContain("COSTA");
  });

  it("artigo de periódico inclui o veículo e o ano", () => {
    const m: CiteMeta = { authors: A(["João Pereira"]), title: "Um estudo", year: 2021, container: "Revista X" };
    const out = buildAbnt(m);
    expect(out).toContain("Revista X");
    expect(out).toContain("2021");
  });

  it("online com DOI usa DOI (não duplica com Disponível em)", () => {
    const m: CiteMeta = { authors: A(["Carlos Souza"]), title: "Página", year: 2019, doi: "10.1/x", url: "https://e.com/x" };
    const out = buildAbnt(m);
    expect(out).toContain("DOI: 10.1/x.");
    expect(out).not.toContain("Disponível em:");
  });

  it("online só com URL usa Disponível em / Acesso em", () => {
    const m: CiteMeta = { authors: A(["Carlos Souza"]), title: "Página", year: 2019, url: "https://e.com/x" };
    const out = buildAbnt(m);
    expect(out).toContain("Disponível em: https://e.com/x.");
    expect(out).toContain("Acesso em:");
  });
});

describe("buildInline (NBR 10520)", () => {
  it("trecho entre aspas + (SOBRENOME, ano, p. X)", () => {
    const m: CiteMeta = { authors: A(["Maria Santos"]), year: 2020 };
    expect(buildInline("um trecho", m, 5)).toBe('"um trecho" (SANTOS, 2020, p. 5)');
  });
});

describe("validação", () => {
  it("hasEnoughMeta exige autor + título + ano", () => {
    expect(hasEnoughMeta({ authors: A(["X Y"]), title: "T", year: 2020 })).toBe(true);
    expect(hasEnoughMeta({ title: "T", year: 2020 })).toBe(false);
    expect(hasEnoughMeta({ authors: A(["X Y"]), year: 2020 })).toBe(false);
  });
  it("missingMeta lista o que falta", () => {
    expect(missingMeta({})).toEqual(["autores", "título", "ano"]);
  });
});
