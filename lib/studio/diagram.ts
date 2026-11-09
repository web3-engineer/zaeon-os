/**
 * lib/studio/diagram.ts — diagrama/visualização INTERATIVA de um assunto (kind "diagram").
 *
 * Motor: archify (MIT, vendor/archify — ver vendor/archify/ZAEON.md). O padrão é o dele:
 * JSON-IR tipado → VALIDA (schema + layout) → renderiza um HTML standalone, autocontido, com
 * SVG interativo (busca, caminho, legenda, tema, exportar PNG/SVG). Aqui o "agente" que escreve
 * o IR é o Gemini; o resto é o archify, rodando num processo Node SEPARADO (isola o motor do
 * servidor do Next e não deixa um bug de layout derrubar a rota).
 *
 *   tema (+ a explicação da Aura) → Gemini escreve o IR → normalizarIR (o código preenche o
 *   mecânico e poda o que o schema não aceita) → archify validate → [reparo com os
 *   diagnósticos, até 2×] → archify render → HTML.
 *
 * Divisão de trabalho (a mesma do `substancias` → molécula): o modelo decide o CONTEÚDO
 * (quais conceitos, quais ligações, que tipo de diagrama); a geometria e o formato são do
 * código e do archify. Diagrama inválido nunca chega ao aluno.
 */
import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { ARCHIFY_PT } from "@/lib/studio/archify-pt";

export type TipoDiagrama = "architecture" | "workflow" | "sequence" | "dataflow" | "lifecycle";
export const TIPOS: TipoDiagrama[] = ["workflow", "sequence", "architecture", "lifecycle", "dataflow"];
export const isTipo = (v: unknown): v is TipoDiagrama => typeof v === "string" && (TIPOS as string[]).includes(v);

/** "mapa" = mapa mental / mapa de estudo (substitui o mindmap estático) → prefere o mapa de conceitos. */
export type FormatoDiagrama = "auto" | "mapa";

export const ARCHIFY_DIR = process.env.ARCHIFY_DIR || path.join(process.cwd(), "vendor", "archify");
const BIN = () => path.join(ARCHIFY_DIR, "bin", "archify.mjs");

/**
 * O `type` de cada nó no archify nasceu pra software (frontend, backend…). Aqui cada um tem um
 * PAPEL DIDÁTICO fixo — é isto que o modelo lê, e é o que a legenda em PT (archify-pt.ts) mostra.
 */
export const PAPEIS_DIDATICOS: Record<string, string> = {
  frontend: "ponto de partida / quem inicia / entrada",
  backend: "etapa ou conceito central",
  database: "reserva, memória, armazenamento, produto acumulado",
  security: "regra, condição, controle, limite",
  messagebus: "transformação, troca, reação",
  cloud: "meio ou ambiente onde acontece",
  external: "agente ou fonte externa",
};
const TIPOS_NO = Object.keys(PAPEIS_DIDATICOS);
const ESTADOS_LIFECYCLE = ["start", "active", "waiting", "decision", "success", "failure", "neutral", "external"];
const VARIANTES = ["default", "emphasis", "security", "dashed"];
const PONTOS_CARD = ["cyan", "emerald", "violet", "amber", "rose", "orange", "slate"];

// ───────────────────────────── normalização (pura) ─────────────────────────────

/** Propriedades aceitas por coleção, lidas do schema do archify (a fonte da verdade). */
type Permitidas = { topo: Set<string>; meta: Set<string>; itens: Record<string, Set<string>> };
const cachePermitidas = new Map<TipoDiagrama, Permitidas>();

async function permitidas(tipo: TipoDiagrama): Promise<Permitidas> {
  const c = cachePermitidas.get(tipo);
  if (c) return c;
  const schema = JSON.parse(await fs.readFile(path.join(ARCHIFY_DIR, "schemas", `${tipo}.schema.json`), "utf8"));
  const itens: Record<string, Set<string>> = {};
  for (const [k, v] of Object.entries<any>(schema.properties ?? {})) {
    const props = v?.items?.properties;
    if (props) itens[k] = new Set(Object.keys(props));
  }
  const p: Permitidas = {
    topo: new Set(Object.keys(schema.properties ?? {})),
    meta: new Set(Object.keys(schema.properties?.meta?.properties ?? {})),
    itens,
  };
  cachePermitidas.set(tipo, p);
  return p;
}

/** id do archify: começa com letra, só [a-zA-Z0-9_-]. "Fixação do CO₂" → "fixacao_do_co". */
export function idSeguro(bruto: unknown, i = 0): string {
  const base = String(bruto ?? "")
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "_").replace(/^[^a-zA-Z]+/, "").replace(/_+$/, "")
    .slice(0, 40);
  return base || `n${i}`;
}

const texto = (v: unknown, max: number) => {
  const s = String(v ?? "").replace(/\s+/g, " ").trim();
  return s.length > max ? s.slice(0, max - 1).trimEnd() + "…" : s;
};
/**
 * Largura que um nó precisa pro rótulo caber: o archify mede ~6,8px por letra no rótulo (negrito)
 * e ~5,4px no sublabel (9px). Calcular aqui evita a reprovação "label is wider than node".
 */
export function larguraDoNo(label: string, sublabel = "", minimo = 132): number {
  const w = Math.max(minimo, Math.ceil(label.length * 6.8 + 36), Math.ceil(sublabel.length * 5.4 + 28));
  return Math.min(260, w);
}
const inteiro = (v: unknown, min: number, max: number, padrao: number) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : padrao;
};

/** Coleções de NÓS por tipo (os ids que as ligações referenciam) e de LIGAÇÕES. */
const NOS: Record<TipoDiagrama, string> = {
  workflow: "nodes", sequence: "participants", architecture: "components", dataflow: "nodes", lifecycle: "states",
};
const LIGACOES: Record<TipoDiagrama, string> = {
  workflow: "edges", sequence: "messages", architecture: "connections", dataflow: "flows", lifecycle: "transitions",
};
const VERSAO: Record<TipoDiagrama, number> = { workflow: 2, lifecycle: 2, sequence: 1, architecture: 1, dataflow: 1 };

/**
 * O IR que o modelo escreveu → um IR que o archify aceita. Preenche o mecânico (versão, saída,
 * idioma, y das mensagens), conserta ids, poda propriedades que o schema não conhece, prende
 * colunas no intervalo e descarta ligações pra nós que não existem. Não inventa conteúdo.
 */
export async function normalizarIR(tipo: TipoDiagrama, bruto: any): Promise<any> {
  const p = await permitidas(tipo);
  const src = bruto && typeof bruto === "object" ? bruto : {};
  const ir: any = {};
  for (const k of Object.keys(src)) if (p.topo.has(k)) ir[k] = src[k];
  ir.schema_version = VERSAO[tipo];
  ir.diagram_type = tipo;

  const metaSrc = src.meta && typeof src.meta === "object" ? src.meta : {};
  ir.meta = {
    title: texto(metaSrc.title || src.title || "Diagrama", 90) || "Diagrama",
    ...(metaSrc.subtitle && p.meta.has("subtitle") ? { subtitle: texto(metaSrc.subtitle, 120) } : {}),
    output: "diagrama.html",
    quality_profile: "standard",
    locale: "pt-BR",
    translations: ARCHIFY_PT,
  };

  // Poda por coleção (o schema diz o que cada item aceita).
  for (const [col, aceitas] of Object.entries(p.itens)) {
    if (!Array.isArray(ir[col])) { delete ir[col]; continue; }
    ir[col] = ir[col]
      .filter((x: any) => x && typeof x === "object")
      .map((x: any) => Object.fromEntries(Object.entries(x).filter(([k]) => aceitas.has(k))));
  }

  // ids estáveis e únicos nos NÓS + mapa velho→novo pras referências.
  const mapa = new Map<string, string>();
  const usados = new Set<string>();
  const nos: any[] = Array.isArray(ir[NOS[tipo]]) ? ir[NOS[tipo]] : [];
  nos.forEach((n, i) => {
    let id = idSeguro(n.id ?? n.label, i);
    while (usados.has(id)) id = `${id}_${i}`;
    usados.add(id);
    if (n.id !== undefined) mapa.set(String(n.id), id);
    n.id = id;
    n.label = texto(n.label || id, 40) || id;
    if (n.sublabel !== undefined) n.sublabel = texto(n.sublabel, 44);
    if (n.tag !== undefined) n.tag = texto(n.tag, 24);
    if (tipo === "lifecycle") n.type = ESTADOS_LIFECYCLE.includes(n.type) ? n.type : "active";
    else n.type = TIPOS_NO.includes(n.type) ? n.type : "backend";
    delete n.sources; delete n.brand; delete n.pos; delete n.size; delete n.width; delete n.height; delete n.yOffset;
    if (tipo === "workflow" || tipo === "dataflow" || tipo === "lifecycle") n.width = larguraDoNo(n.label, n.sublabel);
    if (tipo === "architecture") {
      const w = larguraDoNo(n.label, n.sublabel, 120);
      if (w > 120) n.size = [w, 60];
    }
  });
  const ref = (v: unknown) => (v === undefined ? undefined : mapa.get(String(v)) ?? idSeguro(v));
  ir[NOS[tipo]] = nos;

  // Faixas (workflow/lifecycle) com id seguro; nó com faixa desconhecida cai na primeira.
  if (tipo === "workflow" || tipo === "lifecycle") {
    const lanes: any[] = (Array.isArray(ir.lanes) ? ir.lanes : []).slice(0, 4);
    const mapaLane = new Map<string, string>();
    lanes.forEach((l, i) => {
      const id = idSeguro(l.id ?? l.label, i);
      mapaLane.set(String(l.id), id);
      l.id = id;
      l.label = texto(l.label || id, 40);
    });
    if (tipo === "lifecycle" && lanes.length && lanes[0].id !== "main") {
      // lifecycle v2: a primeira faixa é a principal; o archify espera o id "main".
      for (const [k, v] of mapaLane) if (v === lanes[0].id) mapaLane.set(k, "main");
      lanes[0].id = "main";
    }
    if (!lanes.length) lanes.push({ id: "main", label: "Etapas" });
    ir.lanes = lanes;
    const ids = new Set(lanes.map((l) => l.id));
    const maxCol = tipo === "workflow" ? 5 : 4;
    for (const n of nos) {
      const l = mapaLane.get(String(n.lane)) ?? idSeguro(n.lane);
      n.lane = ids.has(l) ? l : lanes[0].id;
      n.col = inteiro(n.col, 0, maxCol, 0);
    }
    if (Array.isArray(ir.phases)) ir.phases = ir.phases.slice(0, 4).map((f: any, i: number) => ({
      ...f, id: idSeguro(f.id ?? f.label, i), label: texto(f.label, 30),
      fromCol: inteiro(f.fromCol, 0, maxCol, 0), toCol: inteiro(f.toCol, 0, maxCol, maxCol),
    }));
    if (Array.isArray(ir.groups)) delete ir.groups;      // grupos exigem geometria fina — o código não arrisca
    if (Array.isArray(ir.mainPath)) ir.mainPath = ir.mainPath.map(ref).filter((x: string) => usados.has(x));
    delete ir.semanticChecks;
  }
  if (tipo === "architecture") {
    // Grade com célula do tamanho do MAIOR nó e corredores largos: o rótulo da ligação mora
    // no corredor entre dois nós vizinhos (o padrão do archify, 30px, não cabe "envia RNAm").
    const largura = Math.max(130, ...nos.map((n) => (Array.isArray(n.size) ? n.size[0] : 120)));
    ir.layout = { mode: "grid", cols: inteiro(src.layout?.cols, 1, 4, 3), cellW: largura, cellH: 64, gapX: 96, gapY: 72 };
    for (const n of nos) { n.row = inteiro(n.row, 0, 8, 0); n.col = inteiro(n.col, 0, 3, 0); }
    if (Array.isArray(ir.boundaries)) {
      ir.boundaries = ir.boundaries
        .map((b: any) => ({ kind: b.kind === "security-group" ? "security-group" : "region", label: texto(b.label, 30), wraps: (Array.isArray(b.wraps) ? b.wraps : []).map(ref).filter((x: string) => usados.has(x)) }))
        .filter((b: any) => b.label && b.wraps.length >= 2)
        .slice(0, 3);
      if (!ir.boundaries.length) delete ir.boundaries;
    }
  }
  if (tipo === "dataflow") {
    const stages: any[] = (Array.isArray(ir.stages) ? ir.stages : []).slice(0, 6).map((s: any) => ({ label: texto(s?.label ?? s, 24) || "Etapa" }));
    if (!stages.length) stages.push({ label: "Fluxo" });
    ir.stages = stages;
    for (const n of nos) { n.stage = inteiro(n.stage, 0, stages.length - 1, 0); n.row = inteiro(n.row, 0, 5, 0); }
  }
  if (tipo === "sequence") {
    delete ir.segments; delete ir.activations;           // exigem coordenadas y — o código não arrisca
    ir.meta.column_fit = "spread";                        // caixas acompanham a largura (a fixa tem 86px)
  }

  // Ligações: referências reescritas, só entre nós que existem, rótulo curto, sem geometria.
  const lig: any[] = Array.isArray(ir[LIGACOES[tipo]]) ? ir[LIGACOES[tipo]] : [];
  const vistos = new Set<string>();
  ir[LIGACOES[tipo]] = lig
    .map((e, i) => {
      const o: any = { ...e, from: ref(e.from), to: ref(e.to) };
      for (const k of ["via", "channelX", "channelY", "labelAt", "labelDx", "labelSegment", "bias", "fromSide", "toSide", "route", "width", "classification", "note", "cornerRadius"]) delete o[k];
      // labelDy fica se for número razoável: é o conserto que o próprio archify sugere (autoReparo).
      if (o.labelDy !== undefined && !(typeof o.labelDy === "number" && Math.abs(o.labelDy) <= 200)) delete o.labelDy;
      if (o.id !== undefined || tipo === "sequence") {
        let id = idSeguro(o.id ?? `${o.from}-${o.to}`, i);
        while (vistos.has(id)) id = `${id}_${i}`;
        vistos.add(id);
        o.id = id;
      }
      if (o.label !== undefined) o.label = texto(o.label, 36);
      if (tipo === "sequence") {
        o.variant = ["default", "emphasis", "security", "dashed", "return"].includes(o.variant) ? o.variant : "default";
        o.label = o.label || "…";
        o.y = 170 + i * 40;                              // ordem de leitura = ordem das mensagens (o archify exige y ≥ 160)
      } else if (o.variant !== undefined && !VARIANTES.includes(o.variant)) delete o.variant;
      if (tipo === "dataflow") o.label = o.label || "→";
      if (tipo === "workflow" && o.role !== undefined && !["main", "branch", "async", "return", "error"].includes(o.role)) delete o.role;
      return o;
    })
    .filter((o) => usados.has(o.from) && usados.has(o.to) && (tipo === "sequence" || o.from !== o.to))
    .slice(0, 24);

  if (Array.isArray(ir.cards)) {
    ir.cards = ir.cards.slice(0, 2).map((c: any, i: number) => ({
      dot: PONTOS_CARD.includes(c?.dot) ? c.dot : ["emerald", "cyan"][i % 2],
      title: texto(c?.title || "Ideia central", 40) || "Ideia central",
      items: (Array.isArray(c?.items) ? c.items : []).map((x: unknown) => texto(x, 90)).filter(Boolean).slice(0, 4),
    })).filter((c: any) => c.items.length);
    if (!ir.cards.length) delete ir.cards;
  }
  return ir;
}

// ───────────────────────────── archify (processo separado) ─────────────────────────────

export type Diagnostico = { code?: string; message: string; fixes?: string[] };
/** `texto` = a saída crua do render reprovado (onde moram as sugestões de conserto do archify). */
export type ResultadoArchify = { ok: true; html?: string } | { ok: false; diagnosticos: Diagnostico[]; estagio?: string; texto?: string };
export type RodarArchify = (cmd: "validate" | "render", tipo: TipoDiagrama, ir: unknown) => Promise<ResultadoArchify>;

function exec(args: string[], cwd: string): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    execFile(process.execPath, args, { cwd, timeout: 30_000, maxBuffer: 16 * 1024 * 1024 }, (err: any, stdout, stderr) => {
      resolve({ code: err ? (typeof err.code === "number" ? err.code : 1) : 0, stdout: String(stdout), stderr: String(stderr) });
    });
  });
}

/** Lê os diagnósticos do `validate --json` (ou, sem JSON, do texto de erro do `render`). */
export function lerDiagnosticos(stdout: string, stderr = ""): { diagnosticos: Diagnostico[]; estagio?: string } {
  try {
    const j = JSON.parse(stdout);
    const ds: Diagnostico[] = (Array.isArray(j?.diagnostics) ? j.diagnostics : [])
      .filter((d: any) => d?.severity !== "warning")
      .map((d: any) => ({ code: d.code, message: String(d.message || ""), fixes: Array.isArray(d.supportedFixes) ? d.supportedFixes.map(String) : undefined }));
    // composição (cruzamentos, rótulos colados) vem num bloco à parte quando o check reprova
    for (const c of Array.isArray(j?.checks) ? j.checks : []) {
      if (c && c.ok === false) ds.push({ code: `check/${c.name}`, message: (c.details || []).slice(0, 3).join("; ") || String(c.name) });
    }
    if (!ds.length && j?.error) ds.push({ message: String(j.error) });
    return { diagnosticos: ds.slice(0, 12), estagio: j?.stage };
  } catch {
    // Texto do render: cada problema começa com "[codigo/x] ..." (ou "- ..."), as linhas
    // indentadas seguintes (retângulos, "Suggested fix") pertencem a ele.
    const ds: Diagnostico[] = [];
    for (const linha of `${stderr}\n${stdout}`.split("\n")) {
      const t = linha.trim();
      if (!t || /^archify: meta\.translations/.test(t)) continue;
      const m = t.match(/^\[([\w/-]+)\]\s*(.*)$/);
      if (m) ds.push({ code: m[1], message: m[2] });
      else if (/^\s/.test(linha) && ds.length) ds[ds.length - 1].message += ` ${t}`;
      else if (!ds.some((d) => d.message.startsWith(t.replace(/^- /, "")))) ds.push({ message: t.replace(/^- /, "") });
    }
    return { diagnosticos: ds.filter((d) => d.code || !/failed:$/.test(d.message)).slice(0, 12) };
  }
}

/**
 * Conserto DETERMINÍSTICO (sem modelo) do que o archify reprova com sugestão exata:
 * rótulo maior que o nó → alarga o nó; rótulo de seta em cima de um nó → aplica o `labelDy`
 * sugerido; dois rótulos colados → afasta o segundo; participante largo demais → encurta.
 * Devolve um IR novo ou null quando não há o que aplicar (aí o laço chama o modelo).
 */
export function autoReparo(tipo: TipoDiagrama, ir: any, saida: string): any | null {
  const novo = JSON.parse(JSON.stringify(ir));
  const nos: any[] = novo[NOS[tipo]] ?? [];
  const lig: any[] = novo[LIGACOES[tipo]] ?? [];
  let mudou = false;
  const t = String(saida || "");
  for (const m of t.matchAll(/Label "([^"]+)" \(~(\d+)px\) is wider than (?:node|state|component) "([^"]+)"/g)) {
    const n = nos.find((x) => x.id === m[3]);
    if (!n) continue;
    const w = Math.min(320, Number(m[2]) + 28);
    if (tipo === "architecture") n.size = [w, 60]; else n.width = Math.max(Number(n.width) || 0, w);
    mudou = true;
  }
  for (const m of t.matchAll(/Label "([^"]+)" \(~\d+px\) is wider than the (\d+)px participant box/g)) {
    const n = nos.find((x) => x.label === m[1]);
    if (!n) continue;
    n.label = texto(n.label, Math.max(6, Math.floor((Number(m[2]) - 24) / 6.8)));
    mudou = true;
  }
  for (const m of t.matchAll(/Sublabel "([^"]+)" needs ~(\d+)px[^"]*"([^"]+)" provides (\d+)px/g)) {
    const n = nos.find((x) => x.id === m[3]);
    if (!n) continue;
    if (tipo === "sequence" || (tipo === "dataflow" && (Number(n.width) || 112) >= Math.min(168, 2 * (100 + (Number(n.stage) || 0) * 215 - 24)))) n.sublabel = texto(n.sublabel, Math.max(6, Math.floor(Number(m[4]) / 5.6)));
    else if (tipo === "architecture") n.size = [Math.min(320, (Array.isArray(n.size) ? n.size[0] : 120) + Number(m[2]) - Number(m[4]) + 12), 60];
    else n.width = Math.min(320, (Number(n.width) || 132) + Number(m[2]) - Number(m[4]) + 12);
    mudou = true;
  }
  if (tipo === "architecture" && /less than 8px apart/.test(t) && novo.layout) {
    novo.layout.gapX = Math.min(240, (Number(novo.layout.gapX) || 30) + 40);
    novo.layout.gapY = Math.min(200, (Number(novo.layout.gapY) || 40) + 24);
    mudou = true;
  }
  const corrigidos = new Set<any>();
  for (const m of t.matchAll(/Label "([^"]+)" overlaps (?:node|state|component|participant) "[^"]+"[\s\S]*?set labelDy (-?\d+)/g)) {
    const e = lig.find((x) => x.label === m[1] && !corrigidos.has(x));
    if (!e) continue;
    e.labelDy = (Number(e.labelDy) || 0) + Number(m[2]);
    corrigidos.add(e);
    mudou = true;
  }
  for (const m of t.matchAll(/Labels "([^"]+)" and "([^"]+)" overlap/g)) {
    const e = lig.find((x) => x.label === m[2] && !corrigidos.has(x));
    if (!e) continue;
    e.labelDy = (Number(e.labelDy) || 0) + 20;
    corrigidos.add(e);
    mudou = true;
  }
  // #745: a peça saiu da ÁREA do desenho. O archify manda "aumentar meta.viewBox", mas o prompt proíbe a IA de mexer no
  // viewBox — então ela tentava 2 vezes e o diagrama não saía (no ar: "Node "esofago" exceeds the horizontal bounds of
  // the viewBox"). Quem aumenta a área é o código.
  const area = (): [number, number] | null => {
    const v = novo.meta?.viewBox;
    if (Array.isArray(v) && v.length === 2 && v.every((n: unknown) => Number.isFinite(Number(n)))) return [Number(v[0]), Number(v[1])];
    return VIEWBOX_PADRAO[tipo] ? [...VIEWBOX_PADRAO[tipo]!] : null;
  };
  const gravarArea = (v: [number, number]) => { novo.meta = { ...(novo.meta ?? {}), viewBox: v }; mudou = true; };
  // o archify às vezes já diz o tamanho certo: "set meta.viewBox[0] to at least N" (largura) / "[1]" (altura)
  const pede = (i: 0 | 1) => Math.max(0, ...[...t.matchAll(new RegExp(`set meta\\.viewBox\\[${i}\\] to at least (\\d+)`, "g"))].map((m) => Number(m[1])));
  // (architecture: "increase meta.viewBox to at least [L, A] for right/bottom overflow" — moldura que passou da borda)
  const pedeAmbos = [...t.matchAll(/increase meta\.viewBox to at least \[(\d+), (\d+)\]/g)];
  const [pedeL, pedeA] = [Math.max(pede(0), ...pedeAmbos.map((m) => Number(m[1]))), Math.max(pede(1), ...pedeAmbos.map((m) => Number(m[2])))];
  // "Component X falls outside the viewBox 900x600 — … set a larger meta.viewBox" (architecture)
  const fora = /falls outside the viewBox (\d+)x(\d+)/.exec(t);
  const cresceL = /exceeds the horizontal bounds of the (?:viewBox|diagram)/.test(t) || !!fora;
  const cresceA = /exceeds the (?:readable diagram area|vertical lifecycle area)/.test(t) || !!fora;
  // dataflow: as etapas têm lugar FIXO (centro em 100 + etapa × 215 px, 168 px de largura), então crescer a área não salva o nó da 1ª etapa
  // que passou da borda esquerda, nem os vizinhos que se encostam. Ali o nó fica com a largura que cabe na etapa, e o
  // rótulo/sublabel encurtam (com "…") — um nome encurtado é melhor que diagrama nenhum.
  let pedeDataflow = 0;
  if (tipo === "dataflow" && /exceeds the horizontal bounds|less than 10px apart|is wider than node|Sublabel "/.test(t)) {
    for (const n of nos) {
      const cx = 100 + (Number(n.stage) || 0) * 215;
      const max = Math.max(80, Math.min(168, 2 * (cx - 24)));
      if ((Number(n.width) || 112) > max) {
        n.width = max;
        n.label = texto(n.label, Math.max(6, Math.floor((max - 10) / 6.8)));
        if (n.sublabel) n.sublabel = texto(n.sublabel, Math.max(6, Math.floor((max - 16) / 5.6)));
        mudou = true;
      }
      pedeDataflow = Math.max(pedeDataflow, Math.ceil(cx + (Number(n.width) || 112) / 2 + 24));
    }
  }
  if (pedeDataflow && (area()?.[0] ?? 0) < pedeDataflow) gravarArea([Math.min(VIEWBOX_MAX[0], pedeDataflow), area()?.[1] ?? 720]);
  else if (pedeL || pedeA || cresceL || cresceA) {
    const v = area() ?? (fora ? [Number(fora[1]), Number(fora[2])] as [number, number] : null);
    if (v) {
      const l = Math.min(VIEWBOX_MAX[0], Math.max(v[0] + (cresceL ? 160 : 0), pedeL ? pedeL + 24 : 0));
      const a = Math.min(VIEWBOX_MAX[1], Math.max(v[1] + (cresceA ? 120 : 0), pedeA ? pedeA + 24 : 0));
      if (l !== v[0] || a !== v[1]) gravarArea([l, a]);
    }
  }
  return mudou ? novo : null;
}

/** #745: a área padrão de cada renderer do archify quando o diagrama não diz a sua (vendor/archify/renderers/*) */
const VIEWBOX_PADRAO: Partial<Record<TipoDiagrama, [number, number]>> = { dataflow: [940, 720], lifecycle: [980, 660], sequence: [920, 760] };
/** o teto: crescer mais que isso vira um diagrama ilegível de tão pequeno na tela */
const VIEWBOX_MAX: [number, number] = [2400, 1800];

export const rodarArchify: RodarArchify = async (cmd, tipo, ir) => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "zaeon-archify-"));
  try {
    const entrada = path.join(dir, "candidate.json");
    await fs.writeFile(entrada, JSON.stringify(ir));
    if (cmd === "validate") {
      const r = await exec([BIN(), "validate", tipo, entrada, "--json"], dir);
      if (r.code === 0) return { ok: true };
      return { ok: false, ...lerDiagnosticos(r.stdout, r.stderr) };
    }
    const saida = path.join(dir, "diagrama.html");
    const r = await exec([BIN(), "render", tipo, entrada, saida], dir);
    if (r.code !== 0) return { ok: false, ...lerDiagnosticos(r.stdout, r.stderr), texto: `${r.stderr}\n${r.stdout}` };
    return { ok: true, html: await fs.readFile(saida, "utf8") };
  } finally {
    await fs.rm(dir, { recursive: true, force: true }).catch(() => {});
  }
};

// ───────────────────────────── o modelo escreve o IR ─────────────────────────────

export type GerarJson = <T>(system: string, user: string, opts?: { temperature?: number; timeoutMs?: number }) => Promise<T>;

export function promptSistema(exemplos: Record<TipoDiagrama, object>, formato: FormatoDiagrama = "auto"): string {
  return [
    "Você desenha DIAGRAMAS DIDÁTICOS INTERATIVOS pra um aluno entender um assunto (motor archify).",
    "Responda SOMENTE um objeto JSON (o IR do diagrama), sem comentários.",
    "",
    "1) Escolha `diagram_type` pela FORMA do assunto:",
    "- workflow: processo em etapas / como algo funciona passo a passo (faixas `lanes` = fases ou lugares; `col` 0..5 da esquerda pra direita).",
    "- sequence: troca entre participantes ao longo do tempo (quem pergunta/responde, sinal que vai e volta). Mensagens na ORDEM em que acontecem; NÃO escreva `y`.",
    "- architecture: mapa de conceitos / partes de um todo e como se relacionam (layout em grade: `row`, `col` 0..3).",
    "- lifecycle: estados e transições (ciclo de vida, fases que se sucedem). `lanes`: a primeira é a principal, a última o destino final; `col` 0..4 é a mesma posição em todas as faixas.",
    "- dataflow: algo que FLUI (energia, matéria, dinheiro, informação) por estágios (`stages` em ordem; nó com `stage` = índice e `row`).",
    formato === "mapa"
      ? "PEDIDO DE MAPA MENTAL / MAPA DE ESTUDO: use architecture (conceito central no meio do topo, ramos ao redor), salvo se o assunto for claramente um processo."
      : "Na dúvida entre processo e mapa, prefira workflow para 'como funciona' e architecture para 'o que é / do que é feito'.",
    "",
    "2) `type` de cada nó é um PAPEL DIDÁTICO (não é software):",
    ...Object.entries(PAPEIS_DIDATICOS).map(([k, v]) => `- ${k}: ${v}`),
    "Em lifecycle os estados usam: start, active, waiting, decision, success, failure, neutral, external.",
    "",
    "3) Regras de conteúdo:",
    "- PT-BR. Fiel à explicação dada (quando houver) e ao conhecimento estabelecido; nunca invente fato, número ou nome.",
    "- 4 a 9 nós. `label` curto (até ~28 letras); `sublabel` opcional com o detalhe essencial (até ~32).",
    "- Toda ligação com `label` curto, de preferência um verbo ('gera', 'envia', 'transforma em').",
    "- ids em snake_case sem acento, únicos.",
    "- `cards` opcional: até 2, com 2–3 frases curtas de ideias-chave pra fixar.",
    "- `meta.title`: o assunto em poucas palavras (ex.: 'Como a fotossíntese acontece').",
    "- Não use campos de geometria fina (via, channelX, labelDx, width, pos, viewBox).",
    "",
    "Exemplos (copie a FORMA, não os fatos):",
    ...TIPOS.map((t) => `${t}: ${JSON.stringify(exemplos[t])}`),
  ].join("\n");
}

export function promptUsuario(o: { topic: string; contexto?: string; sala?: string }): string {
  return [
    `Assunto que o aluno quer entender: ${o.topic}`,
    o.contexto ? `Explicação que ele acabou de receber (o diagrama deve refletir ISTO):\n${o.contexto.slice(0, 3500)}` : "",
    o.sala === "pesquisa" ? "Sala de Pesquisa: rigor acadêmico, termos técnicos corretos." : "",
  ].filter(Boolean).join("\n\n");
}

function promptReparo(tipo: TipoDiagrama, ir: unknown, ds: Diagnostico[]): string {
  return [
    `O IR do diagrama (${tipo}) abaixo foi REPROVADO pelo validador. Corrija SÓ o necessário e devolva o JSON inteiro corrigido.`,
    "Problemas:",
    ...ds.map((d) => `- ${d.message}${d.fixes?.length ? ` (correção sugerida: ${d.fixes.join("; ")})` : ""}`),
    "Se houver cruzamento de linhas ou rótulo sem espaço: reposicione os nós (col/row/lane), separe ramos em faixas/linhas diferentes ou encurte rótulos.",
    "IR atual:",
    JSON.stringify(ir),
  ].join("\n");
}

export type DiagramaGerado = { ok: true; tipo: TipoDiagrama; titulo: string; ir: any; html: string; tentativas: number } | { ok: false; motivo: string };

/**
 * O pipeline inteiro. `deps` existe pros testes (modelo e archify falsos); em produção os padrões
 * são o Gemini (via lib/scholar/gemini) e o archify vendorizado.
 */
export async function gerarDiagrama(
  o: { topic: string; contexto?: string; sala?: string; formato?: FormatoDiagrama },
  deps: { gerarJson?: GerarJson; archify?: RodarArchify; exemplos?: Record<TipoDiagrama, object>; maxReparos?: number } = {},
): Promise<DiagramaGerado> {
  const topic = (o.topic || "").trim();
  if (!topic) return { ok: false, motivo: "Sem assunto pra diagramar." };
  const gerarJson: GerarJson = deps.gerarJson ?? (async (s, u, op) => {
    const { geminiJson } = await import("@/lib/scholar/gemini");
    return geminiJson(s, u, op);
  });
  const archify = deps.archify ?? rodarArchify;
  const exemplos = deps.exemplos ?? (await import("@/lib/studio/diagram-exemplos")).EXEMPLOS;
  const maxReparos = deps.maxReparos ?? 2;

  const sys = promptSistema(exemplos, o.formato ?? "auto");
  let bruto: any;
  try {
    bruto = await gerarJson<any>(sys, promptUsuario(o), { temperature: 0.3, timeoutMs: 45_000 });
  } catch (e: any) {
    return { ok: false, motivo: `O modelo não respondeu: ${String(e?.message || e).slice(0, 160)}` };
  }
  const tipo: TipoDiagrama = isTipo(bruto?.diagram_type) ? bruto.diagram_type : o.formato === "mapa" ? "architecture" : "workflow";
  let ir = await normalizarIR(tipo, bruto);
  if (!ir[NOS[tipo]]?.length) return { ok: false, motivo: "O modelo não descreveu nenhum elemento." };

  let ultimo: Diagnostico[] = [];
  let melhor: { ir: any; html: string } | null = null;   // o 1º desenho que renderizou fica de reserva
  for (let tentativa = 0; tentativa <= maxReparos; tentativa++) {
    // 1) render, aplicando os consertos que o próprio archify sugere (sem gastar modelo)
    let r = await archify("render", tipo, ir);
    for (let k = 0; !r.ok && k < 5; k++) {
      const fix = autoReparo(tipo, ir, r.texto ?? r.diagnosticos.map((d) => d.message).join("\n"));
      if (!fix) break;
      ir = fix;
      r = await archify("render", tipo, ir);
    }
    if (r.ok && r.html) {
      // 2) renderizou: o validate mede a composição (cruzamentos, corredores). Passou → entrega.
      const v = await archify("validate", tipo, ir);
      if (v.ok) return { ok: true, tipo, titulo: ir.meta.title, ir, html: r.html, tentativas: tentativa + 1 };
      melhor ??= { ir, html: r.html };
      ultimo = v.diagnosticos;
    } else {
      ultimo = r.ok ? [{ message: "render sem saída" }] : r.diagnosticos;
    }
    if (tentativa === maxReparos) break;
    // 3) o modelo conserta com os diagnósticos na mão
    try {
      const corrigido = await gerarJson<any>(sys, promptReparo(tipo, ir, ultimo), { temperature: 0.2, timeoutMs: 45_000 });
      ir = await normalizarIR(tipo, { ...corrigido, diagram_type: tipo });
    } catch { break; }
  }
  // Renderizou mas a composição não ficou perfeita (cruzamento, rótulo apertado): o schema passou
  // e o desenho é legível — melhor um diagrama imperfeito que nenhum. Sem render, nada sai.
  if (melhor) return { ok: true, tipo, titulo: melhor.ir.meta.title, ir: melhor.ir, html: melhor.html, tentativas: maxReparos + 1 };
  // #745: cada diagnóstico uma vez só (o archify repete o mesmo no render e no relatório)
  return { ok: false, motivo: `Diagrama reprovado no validador: ${[...new Set(ultimo.map((d) => d.message))].join(" | ").slice(0, 300)}` };
}
