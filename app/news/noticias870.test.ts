/** #870 · Notícias: título abaixo da barra, imagem quebrada da Hedera fora, títulos sem corte no celular, letras ≥ 11 px. */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

const lista = readFileSync("app/news/page.tsx", "utf8");
const hedera = readFileSync("app/news/hedera-hackathon-2025/page.tsx", "utf8");
const hederaAntiga = readFileSync("app/news/hedera-hackathon/page.tsx", "utf8");

describe("#870 · Notícias", () => {
  it("a página começa abaixo da barra de cima (antes o título virava borrão atrás do logo)", () => {
    expect(lista).toMatch(/flex flex-col lg:flex-row gap-8 p-4 md:p-6 lg:p-8 pt-20 md:pt-24 lg:pt-24/);
  });

  it("a foto do Unsplash que dá 404 saiu das duas telas da Hedera", () => {
    expect(lista).not.toMatch(/photo-1639762681485-074b7f4ec651/);
    expect(hedera).not.toMatch(/photo-1639762681485-074b7f4ec651/);
  });

  it("no celular os títulos quebram linha (só no computador ficam numa linha)", () => {
    expect(lista).not.toMatch(/relative overflow-hidden whitespace-nowrap/);
    expect(lista).toMatch(/relative overflow-hidden lg:whitespace-nowrap/);
    expect(lista).toMatch(/line-clamp-2 lg:line-clamp-none lg:truncate/);
    expect(lista).toMatch(/items-center relative z-10 lg:whitespace-nowrap/);
  });

  it("nenhuma letra abaixo de 11 px nas telas de notícias", () => {
    for (const src of [lista, hedera, hederaAntiga]) expect(src).not.toMatch(/text-\[(7|8|9|10)px\]/);
  });
});
