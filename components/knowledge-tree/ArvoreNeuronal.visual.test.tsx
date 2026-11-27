// @vitest-environment jsdom
/**
 * Snapshot VISUAL (markup SVG determinística): a raiz e um axônio concluído × pendente. Qualquer mudança no
 * desenho (cor, largura, fibras, colaterais, anel) aparece no diff do snapshot — revisar antes de aceitar.
 */
import { cleanup, render } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import ArvoreNeuronal from "./ArvoreNeuronal";
import { corEnergia } from "@/lib/knowledge-tree/cores";
import type { NoArvore } from "@/lib/knowledge-tree/tipos";

const ARVORE: NoArvore = { id: "r", titulo: "Raiz", tipo: "raiz", filhos: [
  { id: "feito", titulo: "Concluída", tipo: "codigo", filhos: [] },
  { id: "pend", titulo: "Pendente", tipo: "codigo", filhos: [] },
] };
const desenhar = () => render(<ArvoreNeuronal arvore={ARVORE} concluidas={["feito"]} onConcluir={() => {}} onReiniciar={() => {}} semMovimento />);
afterEach(cleanup);

it("raiz: só brilho + corpo com o gradiente próprio", () => {
  desenhar();
  expect(document.querySelector('[data-no="r"]')!.outerHTML).toMatchSnapshot();
  const g = document.getElementById("an-raiz")!;
  expect([...g.querySelectorAll("stop")].map((s) => s.getAttribute("stop-color"))).toEqual(["#ffffff", "#fde68a", "#f472b6", "#7c3aed"]);
});

it("axônio concluído (azul) × pendente (violeta), mesma energia de tipo", () => {
  desenhar();
  const feito = document.querySelector('[data-aresta="feito"]')!, pend = document.querySelector('[data-aresta="pend"]')!;
  expect(feito.outerHTML).toMatchSnapshot("axonio-concluido");
  expect(pend.outerHTML).toMatchSnapshot("axonio-pendente");
  const e = (a: Element) => Number(a.getAttribute("data-energia"));
  expect(feito.querySelector("path")!.getAttribute("fill")).toBe(corEnergia(e(feito), true));
  expect(pend.querySelector("path")!.getAttribute("fill")).toBe(corEnergia(e(pend), false));
});
