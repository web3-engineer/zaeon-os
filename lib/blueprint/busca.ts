/** #683: a busca da Sala de Estudos pelo nome do blueprint — sem acento, sem maiúscula, cada palavra em qualquer ordem. */
import type { ResumoBlueprint } from "./server";

const normal = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

export function filtrarBlueprints<T extends Pick<ResumoBlueprint, "titulo">>(lista: readonly T[], busca: string): T[] {
  const palavras = normal(busca).split(/\s+/).filter(Boolean);
  if (!palavras.length) return [...lista];
  return lista.filter((b) => { const t = normal(b.titulo); return palavras.every((p) => t.includes(p)); });
}
