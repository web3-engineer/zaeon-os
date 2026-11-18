/**
 * lib/chat/geometria.ts — a construção de geometria dinâmica que o MODELO escreve. PURO.
 *
 * A skill `geometria-jsxgraph` responde um array JSON, um elemento por item
 * (`{nome, tipo, pais, papel}`), e a página desenha com o JSXGraph (components/chat/
 * GeometriaDinamica). Este módulo é o portão entre os dois: nada do que o modelo mandou chega à
 * biblioteca sem passar por aqui.
 *
 *   · vocabulário fechado de tipos (a mesma tabela do SKILL.md);
 *   · `nome` só com letra, dígito, `_` e `'` — ele vira rótulo na figura, então não pode carregar
 *     marcação;
 *   · dependência em ordem: um elemento só cita quem veio ANTES, e do tipo certo (reta por dois
 *     PONTOS, perpendicular a uma RETA por um PONTO…);
 *   · função: a expressão passa pelo parser fechado de lib/chat/expr (sem eval) — a string do
 *     modelo NUNCA é entregue ao JSXGraph, que a interpretaria.
 *
 * Devolve a construção normalizada ou um motivo curto. Nunca lança.
 */
import { compilarExpr } from "@/lib/chat/expr";

export const TIPOS_GEOMETRIA = [
  "point", "segment", "line", "midpoint", "perpendicular", "parallel",
  "bisector", "intersection", "circle", "polygon", "functiongraph",
] as const;
export type TipoGeometria = (typeof TIPOS_GEOMETRIA)[number];

/** A classe do elemento decide onde ele pode ser citado como pai. */
export type ClasseGeometria = "ponto" | "reta" | "circulo" | "poligono" | "curva";

const CLASSE: Record<TipoGeometria, ClasseGeometria> = {
  point: "ponto", midpoint: "ponto", intersection: "ponto",
  segment: "reta", line: "reta", perpendicular: "reta", parallel: "reta", bisector: "reta",
  circle: "circulo", polygon: "poligono", functiongraph: "curva",
};
export const classeDoTipo = (t: TipoGeometria): ClasseGeometria => CLASSE[t];

export type ElementoGeometria = {
  nome: string;
  tipo: TipoGeometria;
  /** point: [x, y]; functiongraph: [expressão]; intersection: [a, b, índice]; resto: nomes. */
  pais: (string | number)[];
  papel: string;
};

export type ResultadoGeometria =
  | { ok: true; elementos: ElementoGeometria[] }
  | { ok: false; erro: string };

export const MAX_ELEMENTOS = 30;
const MAX_COORD = 1000;
const NOME_RE = /^[A-Za-z][A-Za-z0-9_']{0,11}$/;

/** Tira a cerca de markdown que o modelo às vezes põe em volta do JSON. */
const semCerca = (s: string): string =>
  s.trim().replace(/^```[\w-]*[ \t]*\n?/, "").replace(/\n?```\s*$/, "").trim();

export function parseGeometria(texto: string): ResultadoGeometria {
  let cru: unknown;
  try { cru = JSON.parse(semCerca(String(texto ?? ""))); } catch { return { ok: false, erro: "JSON inválido" }; }
  if (!Array.isArray(cru) || cru.length === 0) return { ok: false, erro: "a construção tem de ser uma lista de elementos" };
  if (cru.length > MAX_ELEMENTOS) return { ok: false, erro: `elementos demais (máximo ${MAX_ELEMENTOS})` };

  const vistos = new Map<string, ClasseGeometria>();
  const elementos: ElementoGeometria[] = [];

  for (let i = 0; i < cru.length; i++) {
    const o = cru[i] as Record<string, unknown> | null;
    const onde = `elemento ${i + 1}`;
    if (!o || typeof o !== "object" || Array.isArray(o)) return { ok: false, erro: `${onde}: não é um objeto` };

    const nome = typeof o.nome === "string" ? o.nome.trim() : "";
    if (!NOME_RE.test(nome)) return { ok: false, erro: `${onde}: nome inválido` };
    if (vistos.has(nome)) return { ok: false, erro: `${onde}: nome "${nome}" repetido` };

    const tipo = (typeof o.tipo === "string" ? o.tipo.trim().toLowerCase() : "") as TipoGeometria;
    if (!(TIPOS_GEOMETRIA as readonly string[]).includes(tipo)) return { ok: false, erro: `${onde} (${nome}): tipo desconhecido` };
    if (!Array.isArray(o.pais)) return { ok: false, erro: `${onde} (${nome}): falta a lista "pais"` };

    const r = paisDoTipo(tipo, o.pais, vistos);
    if (typeof r === "string") return { ok: false, erro: `${onde} (${nome}): ${r}` };

    vistos.set(nome, CLASSE[tipo]);
    elementos.push({ nome, tipo, pais: r, papel: typeof o.papel === "string" ? o.papel.trim().slice(0, 80) : "" });
  }
  return { ok: true, elementos };
}

/** Os pais normalizados do elemento, ou o motivo (string) de não servirem. */
function paisDoTipo(
  tipo: TipoGeometria, pais: unknown[], vistos: Map<string, ClasseGeometria>,
): (string | number)[] | string {
  const classe = (p: unknown): ClasseGeometria | null => (typeof p === "string" ? vistos.get(p.trim()) ?? null : null);
  const nomes = (lista: unknown[], aceita: ClasseGeometria[], oQue: string): string[] | string => {
    const out: string[] = [];
    for (const p of lista) {
      const c = classe(p);
      if (!c) return `cita "${String(p).slice(0, 20)}", que não foi construído antes`;
      if (!aceita.includes(c)) return `"${String(p).trim()}" não é ${oQue}`;
      out.push((p as string).trim());
    }
    return out;
  };

  switch (tipo) {
    case "point": {
      if (pais.length !== 2 || !pais.every((v) => typeof v === "number" && Number.isFinite(v) && Math.abs(v) <= MAX_COORD)) {
        return "ponto livre pede [x, y] numéricos";
      }
      return pais as number[];
    }
    case "functiongraph": {
      if (pais.length !== 1 || typeof pais[0] !== "string") return "gráfico de função pede uma expressão em x";
      try { compilarExpr(pais[0]); } catch (e) { return `expressão inválida (${(e as Error).message})`; }
      return [pais[0]];
    }
    case "segment": case "line": case "midpoint": case "circle":
      return pais.length === 2 ? nomes(pais, ["ponto"], "um ponto") : "pede dois pontos";
    case "bisector":
      return pais.length === 3 ? nomes(pais, ["ponto"], "um ponto") : "pede três pontos (o do meio é o vértice)";
    case "polygon":
      return pais.length >= 3 && pais.length <= 12 ? nomes(pais, ["ponto"], "um ponto") : "pede de 3 a 12 pontos";
    case "perpendicular": case "parallel": {
      if (pais.length !== 2) return "pede uma reta e um ponto";
      // a ordem que o modelo manda varia; normaliza para [reta, ponto]
      const ordenado = classe(pais[0]) === "ponto" ? [pais[1], pais[0]] : pais;
      const reta = nomes([ordenado[0]], ["reta"], "uma reta ou segmento");
      if (typeof reta === "string") return reta;
      const ponto = nomes([ordenado[1]], ["ponto"], "um ponto");
      return typeof ponto === "string" ? ponto : [...reta, ...ponto];
    }
    case "intersection": {
      if (pais.length < 2 || pais.length > 3) return "pede duas retas ou círculos e, opcionalmente, o índice 0 ou 1";
      const curvas = nomes(pais.slice(0, 2), ["reta", "circulo"], "uma reta ou círculo");
      if (typeof curvas === "string") return curvas;
      const idx = pais.length === 3 ? pais[2] : 0;
      if (idx !== 0 && idx !== 1) return "o índice da interseção é 0 ou 1";
      return [...curvas, idx];
    }
  }
}

/** O texto é uma construção válida? Usado pelo chat para decidir se um bloco JSON vira figura. */
export const ehGeometria = (texto: string): boolean => parseGeometria(texto).ok;

/** Os pontos que o aluno pode arrastar. */
export const pontosLivres = (els: ElementoGeometria[]): ElementoGeometria[] => els.filter((e) => e.tipo === "point");

/**
 * A janela da figura, no formato do JSXGraph: [x esquerda, y topo, x direita, y base].
 * Quadrada (o círculo sai redondo), centrada nos pontos livres, com folga para arrastar; sem
 * ponto livre (só gráfico de função), a janela padrão −8..8.
 */
export function caixaDaConstrucao(els: ElementoGeometria[]): [number, number, number, number] {
  const ps = pontosLivres(els).map((e) => e.pais as number[]);
  if (!ps.length) return [-8, 8, 8, -8];
  const xs = ps.map((p) => p[0]), ys = ps.map((p) => p[1]);
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2, cy = (Math.min(...ys) + Math.max(...ys)) / 2;
  const meio = Math.max(4, (Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)) / 2) * 1.8);
  return [cx - meio, cy + meio, cx + meio, cy - meio];
}
