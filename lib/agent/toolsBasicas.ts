/**
 * lib/agent/toolsBasicas.ts — as tools BÁSICAS do dia a dia que todo assistente sério tem e que o
 * harness não tinha: CALCULAR, CONVERTER unidade e DATA/HORA. Puras (zero rede, determinísticas),
 * então entram em `TOOLS_BASE` (lib/agents/capacidades) e são registradas SEM condição no runtime —
 * não há configuração de servidor de que dependam, ao contrário do `abrir_url`/`web_search`.
 *
 * ────────────────────────── por que um avaliador PRÓPRIO, e não `eval` ──────────────────────────
 * `eval`/`new Function` sobre texto que vem de uma CONVERSA é execução de código arbitrário do
 * modelo (ou de quem injetou na conversa) dentro do processo web, perto de credencial. Então o
 * `calcular` tem um PARSER recursivo-descendente próprio: tokeniza só número/operador/parêntese/nome
 * de função, e um nome que não está na tabela de funções é ERRO, não uma propriedade de `globalThis`.
 * Não há `[`, `.`, `(` de chamada livre — não há superfície pra alcançar nada além de aritmética.
 *
 * SÓ TIPOS do runtime (como `toolsWeb`): é o runtime que importa este módulo pra registrar, e um
 * import de VALOR fecharia o ciclo.
 */
import type { Finding, ToolDef, ToolResult } from "@/lib/agent/runtime";

const ok = (claim: string): ToolResult => ({
  ok: true,
  findings: [{ claim, source: { title: "cálculo local" }, confidence: "alta" } as Finding],
  provenance: { at: new Date().toISOString() },
});
const falha = (error: string, code: string): ToolResult => ({ ok: false, error, code, provenance: {} });

// ───────────────────────────── 1. avaliador aritmético seguro ─────────────────────────────

/** As funções permitidas — a tabela fechada. Nome fora daqui é erro, nunca busca em objeto. */
const FUNCOES: Record<string, (...a: number[]) => number> = {
  sqrt: Math.sqrt, abs: Math.abs, round: Math.round, floor: Math.floor, ceil: Math.ceil,
  ln: Math.log, log: Math.log10, log2: Math.log2, exp: Math.exp,
  sin: Math.sin, cos: Math.cos, tan: Math.tan, asin: Math.asin, acos: Math.acos, atan: Math.atan,
  min: Math.min, max: Math.max, pow: Math.pow, sign: Math.sign, cbrt: Math.cbrt,
};
const CONSTANTES: Record<string, number> = { pi: Math.PI, e: Math.E, tau: Math.PI * 2 };

type Tok = { t: "num"; v: number } | { t: "op"; v: string } | { t: "par"; v: "(" | ")" } | { t: "virg" } | { t: "nome"; v: string };

/** Tokeniza. NUNCA aceita caractere fora do alfabeto da aritmética — símbolo estranho é erro. */
function tokenizar(s: string): Tok[] | null {
  const toks: Tok[] = [];
  let i = 0;
  const str = s.trim();
  while (i < str.length) {
    const c = str[i];
    if (c === " " || c === "\t" || c === "\n") { i++; continue; }
    if (c >= "0" && c <= "9" || c === ".") {
      const m = /^(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/.exec(str.slice(i));
      if (!m) return null;
      toks.push({ t: "num", v: Number(m[0]) });
      i += m[0].length;
      continue;
    }
    if (/[a-zA-Z_]/.test(c)) {
      const m = /^[a-zA-Z_]\w*/.exec(str.slice(i))!;
      toks.push({ t: "nome", v: m[0].toLowerCase() });
      i += m[0].length;
      continue;
    }
    if ("+-*/%^".includes(c)) { toks.push({ t: "op", v: c }); i++; continue; }
    if (c === "(") { toks.push({ t: "par", v: "(" }); i++; continue; }
    if (c === ")") { toks.push({ t: "par", v: ")" }); i++; continue; }
    if (c === ",") { toks.push({ t: "virg" }); i++; continue; }
    return null; // caractere fora do alfabeto → recusa (não tenta adivinhar)
  }
  return toks;
}

/**
 * Parser recursivo-descendente. Gramática (precedência crescente):
 *   expr   → term (('+'|'-') term)*
 *   term   → unar (('*'|'/'|'%') unar)*
 *   unar   → ('+'|'-') unar | pot
 *   pot    → prim ('^' unar)?          (associativa à direita)
 *   prim   → num | nome | nome '(' args ')' | '(' expr ')'
 */
class Parser {
  private p = 0;
  constructor(private toks: Tok[]) {}
  private peek(): Tok | undefined { return this.toks[this.p]; }
  private next(): Tok | undefined { return this.toks[this.p++]; }

  parse(): number {
    const v = this.expr();
    if (this.p !== this.toks.length) throw new Error("sobra_na_expressao");
    return v;
  }
  private expr(): number {
    let v = this.term();
    for (let t = this.peek(); t && t.t === "op" && (t.v === "+" || t.v === "-"); t = this.peek()) {
      this.next(); const r = this.term(); v = t.v === "+" ? v + r : v - r;
    }
    return v;
  }
  private term(): number {
    let v = this.unar();
    for (let t = this.peek(); t && t.t === "op" && (t.v === "*" || t.v === "/" || t.v === "%"); t = this.peek()) {
      this.next(); const r = this.unar();
      if ((t.v === "/" || t.v === "%") && r === 0) throw new Error("divisao_por_zero");
      v = t.v === "*" ? v * r : t.v === "/" ? v / r : v % r;
    }
    return v;
  }
  private unar(): number {
    const t = this.peek();
    if (t && t.t === "op" && (t.v === "+" || t.v === "-")) { this.next(); const r = this.unar(); return t.v === "-" ? -r : r; }
    return this.pot();
  }
  private pot(): number {
    const b = this.prim();
    const t = this.peek();
    if (t && t.t === "op" && t.v === "^") { this.next(); const e = this.unar(); return Math.pow(b, e); }
    return b;
  }
  private prim(): number {
    const t = this.next();
    if (!t) throw new Error("fim_inesperado");
    if (t.t === "num") return t.v;
    if (t.t === "par" && t.v === "(") { const v = this.expr(); const c = this.next(); if (!(c && c.t === "par" && c.v === ")")) throw new Error("parentese_aberto"); return v; }
    if (t.t === "nome") {
      const prox = this.peek();
      if (prox && prox.t === "par" && prox.v === "(") {
        this.next(); // consome '('
        const args: number[] = [];
        if (!(this.peek()?.t === "par" && (this.peek() as any).v === ")")) {
          args.push(this.expr());
          while (this.peek()?.t === "virg") { this.next(); args.push(this.expr()); }
        }
        const c = this.next(); if (!(c && c.t === "par" && c.v === ")")) throw new Error("parentese_aberto");
        const fn = FUNCOES[t.v];
        if (!fn) throw new Error(`funcao_desconhecida:${t.v}`);
        return fn(...args);
      }
      if (t.v in CONSTANTES) return CONSTANTES[t.v];
      throw new Error(`nome_desconhecido:${t.v}`);
    }
    throw new Error("token_inesperado");
  }
}

/** Avalia uma expressão aritmética. { ok, valor } | { ok:false, erro }. NUNCA lança. */
export function avaliar(expr: string): { ok: true; valor: number } | { ok: false; erro: string } {
  const toks = tokenizar(String(expr ?? ""));
  if (!toks || !toks.length) return { ok: false, erro: "expressao_vazia_ou_invalida" };
  try {
    const v = new Parser(toks).parse();
    if (!Number.isFinite(v)) return { ok: false, erro: "resultado_nao_finito" };
    return { ok: true, valor: v };
  } catch (e: unknown) {
    return { ok: false, erro: (e as Error)?.message ?? "erro_de_parse" };
  }
}

// ───────────────────────────── 2. conversão de unidade (fatores puros) ─────────────────────────────

/** Fator para a unidade BASE da dimensão. Temperatura é à parte (não é fator). */
const FATORES: Record<string, { dim: string; fator: number }> = {
  // comprimento (base: metro)
  m: { dim: "comprimento", fator: 1 }, metro: { dim: "comprimento", fator: 1 }, metros: { dim: "comprimento", fator: 1 },
  km: { dim: "comprimento", fator: 1000 }, cm: { dim: "comprimento", fator: 0.01 }, mm: { dim: "comprimento", fator: 0.001 },
  mi: { dim: "comprimento", fator: 1609.344 }, milha: { dim: "comprimento", fator: 1609.344 }, milhas: { dim: "comprimento", fator: 1609.344 },
  yd: { dim: "comprimento", fator: 0.9144 }, ft: { dim: "comprimento", fator: 0.3048 }, pe: { dim: "comprimento", fator: 0.3048 },
  in: { dim: "comprimento", fator: 0.0254 }, pol: { dim: "comprimento", fator: 0.0254 }, polegada: { dim: "comprimento", fator: 0.0254 },
  // massa (base: grama)
  g: { dim: "massa", fator: 1 }, grama: { dim: "massa", fator: 1 }, gramas: { dim: "massa", fator: 1 },
  kg: { dim: "massa", fator: 1000 }, mg: { dim: "massa", fator: 0.001 }, t: { dim: "massa", fator: 1e6 }, tonelada: { dim: "massa", fator: 1e6 },
  lb: { dim: "massa", fator: 453.59237 }, libra: { dim: "massa", fator: 453.59237 }, oz: { dim: "massa", fator: 28.349523125 },
  // volume (base: litro)
  l: { dim: "volume", fator: 1 }, litro: { dim: "volume", fator: 1 }, litros: { dim: "volume", fator: 1 },
  ml: { dim: "volume", fator: 0.001 }, gal: { dim: "volume", fator: 3.785411784 }, galao: { dim: "volume", fator: 3.785411784 },
  // tempo (base: segundo)
  s: { dim: "tempo", fator: 1 }, seg: { dim: "tempo", fator: 1 }, segundo: { dim: "tempo", fator: 1 }, segundos: { dim: "tempo", fator: 1 },
  min: { dim: "tempo", fator: 60 }, minuto: { dim: "tempo", fator: 60 }, minutos: { dim: "tempo", fator: 60 },
  h: { dim: "tempo", fator: 3600 }, hora: { dim: "tempo", fator: 3600 }, horas: { dim: "tempo", fator: 3600 },
  dia: { dim: "tempo", fator: 86400 }, dias: { dim: "tempo", fator: 86400 },
  // dados (base: byte) — decimal (SI), o que a maioria das perguntas quer
  b: { dim: "dados", fator: 1 }, byte: { dim: "dados", fator: 1 }, bytes: { dim: "dados", fator: 1 },
  kb: { dim: "dados", fator: 1e3 }, mb: { dim: "dados", fator: 1e6 }, gb: { dim: "dados", fator: 1e9 }, tb: { dim: "dados", fator: 1e12 },
  // área (base: metro quadrado)
  m2: { dim: "area", fator: 1 }, km2: { dim: "area", fator: 1e6 }, ha: { dim: "area", fator: 1e4 }, hectare: { dim: "area", fator: 1e4 },
};
const TEMP = new Set(["c", "celsius", "f", "fahrenheit", "k", "kelvin"]);
const normUnidade = (u: string) => String(u ?? "").trim().toLowerCase().replace(/²/g, "2").replace(/°/g, "");

function paraCelsius(v: number, u: string): number | null {
  if (u === "c" || u === "celsius") return v;
  if (u === "f" || u === "fahrenheit") return (v - 32) * 5 / 9;
  if (u === "k" || u === "kelvin") return v - 273.15;
  return null;
}
function deCelsius(c: number, u: string): number | null {
  if (u === "c" || u === "celsius") return c;
  if (u === "f" || u === "fahrenheit") return c * 9 / 5 + 32;
  if (u === "k" || u === "kelvin") return c + 273.15;
  return null;
}

/** Converte `valor` de `de` para `para`. { ok, valor } | { ok:false, erro }. */
export function converter(valor: number, de: string, para: string): { ok: true; valor: number } | { ok: false; erro: string } {
  if (!Number.isFinite(valor)) return { ok: false, erro: "valor_invalido" };
  const a = normUnidade(de), b = normUnidade(para);
  if (TEMP.has(a) || TEMP.has(b)) {
    if (!(TEMP.has(a) && TEMP.has(b))) return { ok: false, erro: "dimensoes_incompativeis" };
    const c = paraCelsius(valor, a); if (c === null) return { ok: false, erro: "unidade_desconhecida" };
    const r = deCelsius(c, b); if (r === null) return { ok: false, erro: "unidade_desconhecida" };
    return { ok: true, valor: r };
  }
  const fa = FATORES[a], fb = FATORES[b];
  if (!fa || !fb) return { ok: false, erro: "unidade_desconhecida" };
  if (fa.dim !== fb.dim) return { ok: false, erro: "dimensoes_incompativeis" };
  return { ok: true, valor: valor * fa.fator / fb.fator };
}

// ───────────────────────────── 3. data / hora ─────────────────────────────

/** Formata o instante atual num fuso IANA. { ok, texto } | { ok:false, erro }. */
export function agoraEm(fuso?: string): { ok: true; texto: string } | { ok: false; erro: string } {
  const tz = String(fuso ?? "America/Sao_Paulo").trim() || "America/Sao_Paulo";
  try {
    const d = new Date();
    const fmt = new Intl.DateTimeFormat("pt-BR", {
      timeZone: tz, dateStyle: "full", timeStyle: "long",
    });
    return { ok: true, texto: `${fmt.format(d)} (fuso ${tz}; ISO UTC ${d.toISOString()})` };
  } catch {
    return { ok: false, erro: "fuso_invalido" };
  }
}

// ───────────────────────────── as ToolDef ─────────────────────────────

const esquema = (name: string, description: string, props: Record<string, unknown>, required: string[]) => ({
  name, description,
  parameters: { type: "OBJECT" as any, properties: props as any, required },
});

export const calcularDef: ToolDef = {
  name: "calcular",
  runtime: "ts",
  risk: "read",
  minPlan: "free",
  schema: esquema(
    "calcular",
    "Calcula uma expressão aritmética com precisão (+ - * / % ^, parênteses, funções sqrt/abs/round/floor/ceil/ln/log/sin/cos/tan/min/max/pow, constantes pi/e). Use para qualquer conta — nunca estime de cabeça.",
    { expressao: { type: "STRING" as any, description: "a expressão, ex.: '(1234*56.7)/3 + sqrt(2)'" } },
    ["expressao"],
  ),
  async run(args) {
    const expr = String(args?.expressao ?? "").trim();
    if (!expr) return falha("expressão vazia", "bad_args");
    const r = avaliar(expr);
    return r.ok ? ok(`${expr} = ${r.valor}`) : falha(`não consegui calcular: ${r.erro}`, "calc_error");
  },
};

export const converterDef: ToolDef = {
  name: "converter",
  runtime: "ts",
  risk: "read",
  minPlan: "free",
  schema: esquema(
    "converter",
    "Converte um valor entre unidades (comprimento, massa, volume, tempo, dados, área e temperatura). Ex.: 10 km → milhas, 100 F → C, 2 GB → MB.",
    {
      valor: { type: "NUMBER" as any, description: "o número a converter" },
      de: { type: "STRING" as any, description: "unidade de origem, ex.: 'km', 'F', 'GB'" },
      para: { type: "STRING" as any, description: "unidade de destino, ex.: 'mi', 'C', 'MB'" },
    },
    ["valor", "de", "para"],
  ),
  async run(args) {
    const valor = Number(args?.valor);
    const de = String(args?.de ?? "").trim(), para = String(args?.para ?? "").trim();
    if (!Number.isFinite(valor) || !de || !para) return falha("argumentos inválidos", "bad_args");
    const r = converter(valor, de, para);
    return r.ok ? ok(`${valor} ${de} = ${r.valor} ${para}`) : falha(`não consegui converter: ${r.erro}`, "convert_error");
  },
};

export const dataHoraDef: ToolDef = {
  name: "data_hora",
  runtime: "ts",
  risk: "read",
  minPlan: "free",
  schema: esquema(
    "data_hora",
    "Diz a data e a hora atuais num fuso (IANA, ex.: 'America/Sao_Paulo', 'Europe/Lisbon'). Use quando o pedido depender de 'hoje', 'agora', 'que horas são' ou do dia da semana.",
    { fuso: { type: "STRING" as any, description: "fuso IANA; padrão America/Sao_Paulo" } },
    [],
  ),
  async run(args) {
    const r = agoraEm(args?.fuso ? String(args.fuso) : undefined);
    return r.ok ? ok(r.texto) : falha(`fuso inválido: ${String(args?.fuso ?? "")}`, "bad_args");
  },
};

/** As três, para o runtime registrar de uma vez. */
export const TOOLS_BASICAS: readonly ToolDef[] = [calcularDef, converterDef, dataHoraDef];
