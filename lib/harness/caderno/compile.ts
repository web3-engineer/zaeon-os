/**
 * Prancha Caderno: o LLM DESCREVE (JSON de primitivas), aqui a gente VALIDA e DESENHA (SVG).
 *
 * Esta é a fronteira de segurança entre texto de modelo e o DOM do navegador. Regras:
 *  - Whitelist de primitivas e de campos. Campo desconhecido é ignorado; primitiva
 *    desconhecida é descartada; nada do LLM vira atributo ou tag por interpolação livre.
 *  - Todo número é finito e preso ao viewBox; cor é um NOME do tema (não um valor CSS).
 *  - Texto (rótulos) é escapado e cortado. Não existe <script>, <foreignObject>, href,
 *    on*, style livre — o compile simplesmente não sabe emitir isso.
 * Resultado: o SVG é seguro pra `dangerouslySetInnerHTML` POR CONSTRUÇÃO, e o teste prova.
 *
 * MÓDULO PURO e client-safe (o cliente recompila a partir das primitivas guardadas no card).
 */
import { CADERNO, CORES, type Cor } from "@/lib/harness/caderno/tokens";

export const VB_W = 320, VB_H = 200;
export const MAX_PRIMITIVAS = 40;
const MAX_ROTULO = 40;

export type Ponto = [number, number];
export type Primitiva =
  | { t: "linha"; de: Ponto; ate: Ponto; cor?: Cor }
  | { t: "seta"; de: Ponto; ate: Ponto; cor?: Cor }
  | { t: "circulo"; c: Ponto; r: number; cor?: Cor; hachura?: boolean }
  | { t: "retangulo"; p: Ponto; w: number; h: number; cor?: Cor; hachura?: boolean }
  | { t: "curva"; pts: Ponto[]; cor?: Cor }
  | { t: "rotulo"; p: Ponto; texto: string; cor?: Cor };

export type Desenho = { primitivas: Primitiva[]; legenda?: string };

const fin = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const clampX = (v: number) => Math.min(VB_W, Math.max(0, v));
const clampY = (v: number) => Math.min(VB_H, Math.max(0, v));
const ponto = (v: unknown): Ponto | null =>
  Array.isArray(v) && v.length === 2 && fin(v[0]) && fin(v[1]) ? [clampX(v[0]), clampY(v[1])] : null;
const cor = (v: unknown): Cor | undefined => (typeof v === "string" && v in CORES ? (v as Cor) : undefined);
const tamanho = (v: unknown, max: number): number | null => (fin(v) && v > 0 ? Math.min(max, v) : null);

/** Uma primitiva crua → validada (ou null). Só os campos conhecidos sobrevivem. */
function validarUma(raw: unknown): Primitiva | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const k = cor(o.cor);
  const comCor = <T extends object>(p: T): T => (k ? { ...p, cor: k } : p);
  switch (o.t) {
    case "linha": case "seta": {
      const de = ponto(o.de), ate = ponto(o.ate);
      return de && ate ? comCor({ t: o.t as "linha" | "seta", de, ate }) : null;
    }
    case "circulo": {
      const c = ponto(o.c), r = tamanho(o.r, 100);
      return c && r ? comCor({ t: "circulo" as const, c, r, ...(o.hachura === true ? { hachura: true } : {}) }) : null;
    }
    case "retangulo": {
      const p = ponto(o.p), w = tamanho(o.w, VB_W), h = tamanho(o.h, VB_H);
      return p && w && h ? comCor({ t: "retangulo" as const, p, w, h, ...(o.hachura === true ? { hachura: true } : {}) }) : null;
    }
    case "curva": {
      if (!Array.isArray(o.pts)) return null;
      const pts = o.pts.map(ponto).filter((x): x is Ponto => x !== null).slice(0, 12);
      return pts.length >= 2 ? comCor({ t: "curva" as const, pts }) : null;
    }
    case "rotulo": {
      const p = ponto(o.p);
      const texto = typeof o.texto === "string" ? o.texto.replace(/[\u0000-\u001f]/g, " ").trim().slice(0, MAX_ROTULO) : "";
      return p && texto ? comCor({ t: "rotulo" as const, p, texto }) : null;
    }
    default:
      return null;
  }
}

/**
 * Valida o desenho inteiro. null = imprestável (o chamador cai no fallback de imagem).
 * "Imprestável" = sem traço de verdade: só rótulos, ou menos de 3 primitivas válidas.
 */
export function validarDesenho(raw: unknown): Desenho | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (!Array.isArray(o.primitivas)) return null;
  const primitivas = o.primitivas.slice(0, MAX_PRIMITIVAS * 2).map(validarUma).filter((p): p is Primitiva => p !== null).slice(0, MAX_PRIMITIVAS);
  const tracos = primitivas.filter((p) => p.t !== "rotulo").length;
  if (primitivas.length < 3 || tracos < 2) return null;
  const legenda = typeof o.legenda === "string" && o.legenda.trim() ? o.legenda.trim().slice(0, 120) : undefined;
  return legenda ? { primitivas, legenda } : { primitivas };
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
const n = (v: number) => (Math.round(v * 10) / 10).toString();
const stroke = (c?: Cor) => CORES[c ?? "tinta"];

/** Desenho JÁ VALIDADO → string SVG. `animar` = "tinta surgindo" (stroke-dashoffset por CSS). */
export function compilarSvg(d: Desenho, opts: { animar?: boolean; idHachura?: string } = {}): string {
  const hid = (opts.idHachura ?? "hach").replace(/[^\w-]/g, "");
  const anim = opts.animar ? ' class="tinta"' : "";
  const partes: string[] = [];
  partes.push(`<defs><pattern id="${hid}" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="6" stroke="${CADERNO.tintaSuave}" stroke-width="0.8" stroke-opacity="0.55"/></pattern>` +
    `<marker id="${hid}-ponta" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="${CADERNO.tinta}"/></marker></defs>`);
  for (const p of d.primitivas) {
    switch (p.t) {
      case "linha":
        partes.push(`<line${anim} x1="${n(p.de[0])}" y1="${n(p.de[1])}" x2="${n(p.ate[0])}" y2="${n(p.ate[1])}" stroke="${stroke(p.cor)}" stroke-width="1.5" stroke-linecap="round"/>`);
        break;
      case "seta":
        partes.push(`<line${anim} x1="${n(p.de[0])}" y1="${n(p.de[1])}" x2="${n(p.ate[0])}" y2="${n(p.ate[1])}" stroke="${stroke(p.cor)}" stroke-width="1.5" stroke-linecap="round" marker-end="url(#${hid}-ponta)"/>`);
        break;
      case "circulo":
        partes.push(`<circle${anim} cx="${n(p.c[0])}" cy="${n(p.c[1])}" r="${n(p.r)}" fill="${p.hachura ? `url(#${hid})` : "none"}" stroke="${stroke(p.cor)}" stroke-width="1.5"/>`);
        break;
      case "retangulo":
        partes.push(`<rect${anim} x="${n(p.p[0])}" y="${n(p.p[1])}" width="${n(p.w)}" height="${n(p.h)}" rx="3" fill="${p.hachura ? `url(#${hid})` : "none"}" stroke="${stroke(p.cor)}" stroke-width="1.5"/>`);
        break;
      case "curva": {
        const [a, ...resto] = p.pts;
        // Catmull-Rom simplificada → quadráticas pelo ponto médio: traço "à mão", sem bico.
        let dd = `M${n(a[0])} ${n(a[1])}`;
        for (let i = 0; i < resto.length; i++) {
          const prev = i === 0 ? a : resto[i - 1];
          const cur = resto[i];
          dd += i === resto.length - 1 ? ` Q${n(prev[0])} ${n(prev[1])} ${n(cur[0])} ${n(cur[1])}` : ` Q${n(prev[0])} ${n(prev[1])} ${n((prev[0] + cur[0]) / 2)} ${n((prev[1] + cur[1]) / 2)}`;
        }
        partes.push(`<path${anim} d="${dd}" fill="none" stroke="${stroke(p.cor)}" stroke-width="1.5" stroke-linecap="round"/>`);
        break;
      }
      case "rotulo":
        partes.push(`<text x="${n(p.p[0])}" y="${n(p.p[1])}" fill="${stroke(p.cor)}" font-size="12" font-family="${esc(CADERNO.fonteCaligrafia)}">${esc(p.texto)}</text>`);
        break;
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VB_W} ${VB_H}" width="100%" role="img" aria-label="${esc(d.legenda ?? "prancha")}">${partes.join("")}</svg>`;
}

export const PRANCHA_SYSTEM = [
  "Você descreve um DESENHO DIDÁTICO simples (prancha de caderno, estilo esboço a tinta) como JSON.",
  `Canvas ${VB_W}x${VB_H}, origem no canto superior esquerdo. Responda SOMENTE JSON:`,
  '{"desenhavel": boolean, "primitivas": [...], "legenda": string, "promptImagem"?: string}',
  "Primitivas permitidas (e só estas):",
  '{"t":"linha","de":[x,y],"ate":[x,y]} · {"t":"seta","de":[x,y],"ate":[x,y]} ·',
  '{"t":"circulo","c":[x,y],"r":n,"hachura"?:bool} · {"t":"retangulo","p":[x,y],"w":n,"h":n,"hachura"?:bool} ·',
  '{"t":"curva","pts":[[x,y],...]} · {"t":"rotulo","p":[x,y],"texto":"até 40 letras"}.',
  'Cada uma aceita "cor": "tinta"|"suave"|"destaque". De 6 a 30 primitivas; rótulos curtos em português.',
  "Desenhe a ESTRUTURA do assunto (partes + relações com setas), não arte. Se o assunto não for",
  'desenhável como esquema (ex.: um retrato, uma paisagem real), responda {"desenhavel": false,',
  '"promptImagem": "<prompt em inglês para ilustração didática, sem texto na imagem>"}.',
].join(" ");

export type GenFn = (system: string, user: string, opts?: any) => Promise<any>;
export type ResultadoPrancha = { tipo: "desenho"; desenho: Desenho } | { tipo: "imagem"; promptImagem: string } | { tipo: "erro" };

/**
 * Pede a prancha ao LLM e valida. Nunca lança: LLM caiu → "erro"; desenho ruim ou
 * "não desenhável" → "imagem" (com um prompt — o do LLM ou um derivado do tema).
 */
export async function gerarPrancha(tema: string, gen: GenFn): Promise<ResultadoPrancha> {
  const t = (tema || "").trim().slice(0, 200);
  if (!t) return { tipo: "erro" };
  let raw: any;
  try {
    raw = await gen(PRANCHA_SYSTEM, `Assunto da prancha: ${t}`, { temperature: 0.3 });
  } catch {
    return { tipo: "erro" };
  }
  const fallback = (): ResultadoPrancha => ({
    tipo: "imagem",
    promptImagem: typeof raw?.promptImagem === "string" && raw.promptImagem.trim()
      ? raw.promptImagem.trim().slice(0, 400)
      : `Didactic notebook-style scientific illustration of: ${t}. Ink sketch on paper, no text.`,
  });
  if (raw?.desenhavel === false) return fallback();
  const d = validarDesenho({ primitivas: raw?.primitivas, legenda: raw?.legenda ?? t });
  return d ? { tipo: "desenho", desenho: d } : fallback();
}
