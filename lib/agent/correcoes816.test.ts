/**
 * #816 · as amarrações que só se veem no código-fonte (a cena 3D, o chat e a gaveta têm dependências pesadas demais
 * para montar aqui): o 3D isolado é enquadrado de novo a cada mudança de tamanho, o cartão de anatomia fica na cópia
 * do navegador e os títulos "Últimos 7 dias…" não fecham a gaveta do celular.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const ler = (p: string) => readFileSync(path.resolve(__dirname, "../..", p), "utf8");

describe("#816 · amarrações", () => {
  it("a mudança de tamanho do 3D refaz o enquadramento da estrutura isolada (o coração virava um ponto)", () => {
    const cena = ler("lib/anatomia/cena.ts");
    const redimensionar = cena.slice(cena.indexOf("const redimensionar = () => {"), cena.indexOf("const observador = new ResizeObserver"));
    expect(redimensionar).toMatch(/ultimoIsolar = ""/);
    expect(redimensionar).toMatch(/enquadrarCamera\(/);
  });
  it("o cartão de anatomia fica na cópia do navegador (sumia ao recarregar a conversa)", () => {
    const chat = ler("components/study/StudyCoworkChat.tsx");
    const leve = chat.split("\n").find((l) => l.includes("const leve = (b?: StudioBlockData)"))!;
    expect(leve).toContain('b.studioKind === "anatomia"');
    expect(leve).toContain("data: null");
  });
  it("o título do grupo de dias não fecha a gaveta do celular", () => {
    const barra = ler("components/chat/ConversasSidebar.tsx");
    expect(barra).toMatch(/onClick=\{\(\) => alternarGrupo\(grupo\)\}[\s\S]{0,200}data-gaveta-fica/);
    // a regra da gaveta continua a mesma: todo botão fecha, menos os marcados
    expect(ler("app/research-lab/page.tsx")).toMatch(/\[data-gaveta-fica\]/);
  });
});
