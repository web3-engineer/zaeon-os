/**
 * lib/agent/grafico.ts — GRÁFICO NA RESPOSTA, em SVG puro (G3 de docs/PLANO_RESPOSTA_GRAFICA.md).
 * PURO: sem dependência, sem React, sem DOM. Roda no servidor, no worker e no teste.
 *
 * POR QUE SVG À MÃO (decisão do dono, 2026-11-03): o projeto não tem NENHUMA biblioteca de gráfico
 * (nem recharts, nem vega, nem d3), e o archify já desenha diagrama à mão. Em SVG o mesmo desenho
 * serve a bolha da resposta e, depois, a figura do documento ABNT — uma biblioteca de cliente não
 * serviria ao segundo caso.
 *
 * ────────────────── A LEI DESTE MÓDULO: o número não vem do modelo ──────────────────
 * Nas ferramentas acadêmicas sérias (Consensus, Elicit) o valor do gráfico sai do acervo da
 * ferramenta, não do texto do modelo. E a literatura de geração com LLM é direta: deixar o modelo
 * ver os números E decidir a apresentação produz "gráficos que parecem certos, com valores
 * plausíveis que não batem com os dados".
 *
 * Então aqui só entra série COM RECIBO — contagem que o próprio turno apurou (ver
 * lib/agent/graficosDoTurno.ts). É o contrato da F0 aplicado a gráfico: não desenhe número que você
 * não sabe de onde veio.
 *
 * ────────────────── Desenho (as regras vieram da referência de dataviz) ──────────────────
 *  - SÉRIE ÚNICA: nenhuma legenda. O título nomeia a série.
 *  - COR: `#0891b2`, uma só, validada por script nas DUAS superfícies (clara e escura): passa banda
 *    de luminosidade, piso de croma e contraste ≥ 3:1 nos dois casos. Não é escolha de gosto.
 *  - TINTA do texto/eixo: `currentColor` com opacidade — herda a cor da bolha, então o tema escuro
 *    não precisa de um segundo desenho nem de media query (que aqui não valeria: o app troca tema
 *    por classe, não por `prefers-color-scheme`).
 *  - MARCAS finas, ponta arredondada 4px ancorada na linha de base, 2px de vão entre barras.
 *  - RÓTULO SELETIVO: valor na barra máxima sempre; em todas só quando são poucas. Número em toda
 *    barra é anti-padrão.
 *  - ACESSIBILIDADE: `role="img"`, `<title>` e um `<desc>` com a série inteira em texto — é a "table
 *    view" possível dentro de uma bolha de chat; leitor de tela recebe todo valor.
 *  - HOVER: `<title>` por barra, que o navegador mostra sozinho. Zero JS.
 */

/** A cor da série. Uma só, e validada — ver o cabeçalho. */
export const COR_SERIE = "#0891b2";

/** Barras numa resposta: acima disso o desenho vira cerca. */
export const MAX_PONTOS = 12;

/** Até aqui, toda barra ganha rótulo; acima, só a máxima (anti-padrão: número em todo ponto). */
export const MAX_ROTULOS_TODOS = 4;

/**
 * Rótulo de categoria mais longo que isto é cortado. 24 não é chute: a faixa reserva 170px pro
 * rótulo e sobra 162 depois do respiro; a 10.5px, caractere médio ~5.8px → 24 × 5.8 ≈ 139px, com
 * folga pra letra larga. Com 28 o texto VAZAVA pela esquerda do SVG — visto no print, não no teste.
 */
export const MAX_LABEL = 24;

export type PontoGrafico = {
  /** a categoria (ano, título do documento) */
  label: string;
  /** o valor — SEMPRE apurado por código */
  valor: number;
};

export type Grafico = {
  /** `barras` = vertical (categoria curta, ordem natural: ano). `faixas` = horizontal (rótulo longo). */
  forma: "barras" | "faixas";
  /** o título nomeia a série (é o que dispensa legenda) */
  titulo: string;
  /** de onde o número veio, em PT — o RECIBO, e ele aparece embaixo do gráfico */
  fonte: string;
  pontos: PontoGrafico[];
  /** sufixo da unidade no rótulo ("", " papers") */
  unidade?: string;
};

/** Escapa texto pra SVG. Rótulo vem de título de documento — ou seja, de conteúdo. */
export function escaparSvg(s: string): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function cortar(s: string, max = MAX_LABEL): string {
  const t = String(s ?? "").replace(/\s+/g, " ").trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

/** Os pontos usáveis: valor finito e ≥ 0, label não vazio, no teto. */
export function pontosValidos(pontos: readonly PontoGrafico[]): PontoGrafico[] {
  return pontos
    .filter((p) => p && String(p.label ?? "").trim() && Number.isFinite(p.valor) && p.valor >= 0)
    .slice(0, MAX_PONTOS)
    .map((p) => ({ label: String(p.label).trim(), valor: Math.round(p.valor * 100) / 100 }));
}

const num = (v: number): string => (Number.isInteger(v) ? String(v) : v.toFixed(1).replace(".", ","));

/** O texto do `<desc>`: a série inteira, que é a "table view" dentro da bolha. */
export function descricaoDaSerie(g: Grafico, pontos: readonly PontoGrafico[]): string {
  const u = g.unidade ?? "";
  return `${g.titulo}. ${pontos.map((p) => `${p.label}: ${num(p.valor)}${u}`).join("; ")}. Fonte: ${g.fonte}.`;
}

/**
 * O gráfico → SVG (string). `null` quando não há o que desenhar — e desenhar nada é resposta
 * legítima: um gráfico de um ponto só não informa nada que a frase já não diga.
 */
export function svgDoGrafico(g: Grafico): string | null {
  const pontos = pontosValidos(g.pontos ?? []);
  if (pontos.length < 2) return null;
  const max = Math.max(...pontos.map((p) => p.valor));
  if (max <= 0) return null;
  const u = g.unidade ?? "";
  const titulo = escaparSvg(cortar(g.titulo, 80));
  const desc = escaparSvg(descricaoDaSerie(g, pontos));
  const todos = pontos.length <= MAX_ROTULOS_TODOS;
  const iMax = pontos.reduce((best, p, i) => (p.valor > pontos[best]!.valor ? i : best), 0);
  // tinta recessiva: eixo e rótulo herdam a cor do texto da bolha (serve tema claro e escuro)
  const EIXO = `stroke="currentColor" stroke-opacity="0.18"`;
  const ROTULO = `fill="currentColor" fill-opacity="0.62" font-size="10.5"`;
  const VALOR = `fill="currentColor" fill-opacity="0.85" font-size="10.5" font-weight="600"`;
  const abre = (w: number, h: number) =>
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="100%" height="auto" ` +
    `role="img" aria-label="${titulo}" style="max-width:${w}px;font-family:ui-sans-serif,system-ui,sans-serif">` +
    `<title>${titulo}</title><desc>${desc}</desc>`;

  if (g.forma === "faixas") {
    // HORIZONTAL: rótulo longo (título de documento) cabe à esquerda sem girar texto
    const LAB = 170, BARRA = 16, VAO = 8, TOPO = 4, DIR = 40;
    const w = 480, h = TOPO + pontos.length * (BARRA + VAO);
    const larg = w - LAB - DIR;
    const corpo = pontos.map((p, i) => {
      const y = TOPO + i * (BARRA + VAO);
      const l = p.valor > 0 ? Math.max(2, Math.round((p.valor / max) * larg)) : 0;
      const r = Math.min(4, l / 2);
      return (
        `<g><title>${escaparSvg(p.label)}: ${num(p.valor)}${escaparSvg(u)}</title>` +
        `<text x="${LAB - 8}" y="${y + BARRA / 2 + 3.5}" text-anchor="end" ${ROTULO}>${escaparSvg(cortar(p.label))}</text>` +
        // ponta arredondada só do lado do dado; a base (esquerda) fica reta, ancorada no eixo
        (l > 0 ? `<path d="M${LAB} ${y}h${l - r}a${r} ${r} 0 0 1 ${r} ${r}v${BARRA - 2 * r}a${r} ${r} 0 0 1 -${r} ${r}H${LAB}z" fill="${COR_SERIE}"/>` : "") +
        // o VALOR vai sem unidade: ela já está no título, e repetida em toda barra ela estourava
        // a margem direita (o "3 trech…" cortado que apareceu no print)
        (todos || i === iMax
          ? `<text x="${LAB + l + 6}" y="${y + BARRA / 2 + 3.5}" ${VALOR}>${num(p.valor)}</text>`
          : "") +
        `</g>`
      );
    }).join("");
    return `${abre(w, h)}<line x1="${LAB}" y1="0" x2="${LAB}" y2="${h}" ${EIXO}/>${corpo}</svg>`;
  }

  // VERTICAL: categoria curta (ano) na ordem natural
  const TOPO = 18, BASE = 18, ALT = 96;
  const w = 480, h = TOPO + ALT + BASE;
  const passo = w / pontos.length;
  const larg = Math.max(6, Math.min(44, passo - 2)); // o -2 é o VÃO de superfície entre barras
  const corpo = pontos.map((p, i) => {
    const cx = i * passo + passo / 2;
    // ZERO não desenha barra: um toco de 2px faz "nenhum paper neste ano" parecer "quase um", que é
    // exatamente a leitura errada que o preenchimento com zero existe pra evitar. O rótulo do ano
    // fica, e o vazio embaixo dele é a informação.
    const a = p.valor > 0 ? Math.max(2, Math.round((p.valor / max) * ALT)) : 0;
    const y = TOPO + (ALT - a);
    const r = Math.min(4, larg / 2, a / 2);
    const x = cx - larg / 2;
    return (
      `<g><title>${escaparSvg(p.label)}: ${num(p.valor)}${escaparSvg(u)}</title>` +
      // ponta arredondada no topo (o dado), base reta na linha de base
      (a > 0 ? `<path d="M${x} ${TOPO + ALT}V${y + r}a${r} ${r} 0 0 1 ${r} -${r}h${larg - 2 * r}a${r} ${r} 0 0 1 ${r} ${r}v${a - r}z" fill="${COR_SERIE}"/>` : "") +
      (todos || i === iMax ? `<text x="${cx}" y="${y - 5}" text-anchor="middle" ${VALOR}>${num(p.valor)}</text>` : "") +
      `<text x="${cx}" y="${TOPO + ALT + 13}" text-anchor="middle" ${ROTULO}>${escaparSvg(cortar(p.label, 9))}</text>` +
      `</g>`
    );
  }).join("");
  return `${abre(w, h)}<line x1="0" y1="${TOPO + ALT}" x2="${w}" y2="${TOPO + ALT}" ${EIXO}/>${corpo}</svg>`;
}
