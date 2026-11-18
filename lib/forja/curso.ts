/**
 * lib/forja/curso.ts — monta o BOARD de cards-módulo conectados (estilo n8n) de um estudo de repo. PURO.
 *
 * Curso (hiper-detalhado): entender → espelho → entregar, os três ATIVOS.
 * Entregável (eng. reversa, app, MCP): entregar é o foco; entender e espelho ficam como BASE PASSIVA
 * (menos intrusivos, como o dono pediu). A ordem define as conexões do fluxo (o card N liga no N-1).
 */
import type { ModoEstudo, ModuloBoard } from "./tipos";

/** Os módulos padrão do board para um modo de estudo, já ordenados e com o passivo marcado. */
export function modulosPadrao(modo: ModoEstudo): ModuloBoard[] {
  if (modo === "entregavel") {
    return [
      { id: "entregar", papel: "entregar", titulo: "Entregar (Octa)", ordem: 0 },
      { id: "entender", papel: "entender", titulo: "Entender o código", ordem: 1, passivo: true },
      { id: "espelho", papel: "espelho", titulo: "Espelho do repositório", ordem: 2, passivo: true },
    ];
  }
  return [
    { id: "entender", papel: "entender", titulo: "Entender o código", ordem: 0 },
    { id: "espelho", papel: "espelho", titulo: "Espelho do repositório", ordem: 1 },
    { id: "entregar", papel: "entregar", titulo: "Entregar (Octa)", ordem: 2 },
  ];
}

/** As conexões do fluxo: cada módulo (ordem N>0) liga no de ordem N-1. */
export function conexoesDoBoard(modulos: ModuloBoard[]): { de: string; para: string }[] {
  const porOrdem = [...modulos].sort((a, b) => a.ordem - b.ordem);
  const arestas: { de: string; para: string }[] = [];
  for (let i = 1; i < porOrdem.length; i++) arestas.push({ de: porOrdem[i - 1].id, para: porOrdem[i].id });
  return arestas;
}
