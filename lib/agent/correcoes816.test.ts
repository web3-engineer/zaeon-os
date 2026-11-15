/**
 * #816 · o cartão de anatomia na cópia do navegador (comportamento, por `blocoLeve`) e a amarração da cena 3D, que só
 * se vê no código-fonte (ela precisa de WebGL para rodar — o enquadramento em si foi conferido no navegador).
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { blocoLeve, KINDS_LEVES } from "@/lib/chat/blocoLeve";

const ler = (p: string) => readFileSync(path.resolve(__dirname, "../..", p), "utf8");

describe("#816 · o cartão de anatomia volta ao recarregar", () => {
  it("a anatomia fica na cópia do navegador só com o número (o cartão busca o resto no servidor)", () => {
    const b = blocoLeve({ studioKind: "anatomia", artifactId: "6af8", title: "Anatomia — coração", data: { estado: { pesado: true } } });
    expect(b).toEqual({ studioKind: "anatomia", artifactId: "6af8", title: "Anatomia — coração", data: null, dataUrl: undefined });
  });
  it("imagem e diagrama continuam; sem número ou de outro tipo, fica só na sessão", () => {
    expect(blocoLeve({ studioKind: "image", artifactId: "i1", dataUrl: "data:image/png;base64,AAAA" })?.dataUrl).toBeUndefined();
    expect(blocoLeve({ studioKind: "diagram", artifactId: "d1" })?.artifactId).toBe("d1");
    expect(blocoLeve({ studioKind: "anatomia" })).toBeUndefined();
    expect(blocoLeve({ studioKind: "mindmap", artifactId: "m1" })).toBeUndefined();
    expect(blocoLeve(undefined)).toBeUndefined();
    expect([...KINDS_LEVES]).toEqual(expect.arrayContaining(["diagram", "aula", "image", "anatomia"]));
  });
  it("o chat usa o blocoLeve na cópia do navegador", () => {
    expect(ler("components/study/StudyCoworkChat.tsx")).toMatch(/const leve = \(b\?: StudioBlockData\) => blocoLeve\(b\)/);
  });
});

describe("#816 · a cena 3D ao mudar de tamanho", () => {
  const cena = ler("lib/anatomia/cena.ts");
  const redimensionar = cena.slice(cena.indexOf("const redimensionar = () => {"), cena.indexOf("const observador = new ResizeObserver"));
  it("refaz o enquadramento da estrutura isolada (o coração virava um ponto)", () => {
    expect(redimensionar).toMatch(/if \(ultimoIsolar\) \{ camera\.clearViewOffset\(\); ultimoIsolar = ""; \}/);
    expect(redimensionar).toMatch(/enquadrarCamera\(/);
  });
  it("o recorte do isolamento sai junto (sem isso, sair do isolamento deixava a cena cortada)", () => {
    // o ramo do quadro que limpa o recorte depende de `ultimoIsolar`: zerá-lo sem limpar o recorte o pularia
    expect(cena).toMatch(/\} else if \(ultimoIsolar\) \{\s*camera\.clearViewOffset\(\);/);
  });
});
