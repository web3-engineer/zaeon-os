/**
 * lib/map/grafo.ts — o grafo do cérebro, PURO (sem banco, sem modelo). Testável no terminal.
 *
 *  - nosFromStructured: a resposta estruturada do turno vira nós. Ids DETERMINÍSTICOS pelo
 *    conteúdo e IGUAIS aos da cartolina (`k_…`, `e_…`, `p_…`, `w_…`, `a_…` — mesmo djb2 de
 *    lib/cartolina/fromStructured): é isso que faz card.id === nó.id sem tabela de mapeamento.
 *  - arestasDoTurno: as relações dentro do turno (evidência sustenta conceito, conceito leva a passo…).
 *  - fundirNoGrafo: o turno entra no grafo existente — nó repetido só acumula msgIds, o estado
 *    NUNCA regride (a trilha é monotônica).
 *  - projetarCards: grafo → cartolina. Card que já existe fica como está (posição, texto que o
 *    aluno editou, desenho); nó novo vira card novo na grade. Nada é removido pela projeção.
 *  - bussolaDoGrafo: o que o grafo diz ao agente (vai pro prompt a cada turno).
 */
import type { StructuredAnswer } from "@/lib/agent/contracts";
import type { CartolinaCard, CardTipo } from "@/lib/caderno/cartolina-tipos";
import { MAX_DRAWERS_POR_NO, MAX_DRAWER_CHARS, MAX_RESUMO_CHARS, ORDEM_ESTADO, isEstadoNo, tipoVisualDe, type Drawer, type EstadoNo, type MapaAresta, type MapaNo, type TipoNo } from "@/lib/map/tipos";

export const MAX_NOS_POR_TURNO = 8;
export const MAX_NOS = 400;
export const MAX_ARESTAS = 1600;
const MAX_MSG_IDS = 20;

// Mesmos parâmetros de grade da cartolina (fromStructured): a projeção não pode "pular" o layout.
const COL_W = 330, GAP_X = 40, GAP_Y = 40, COLS = 3, X0 = 120, ALTURA_LINHA = 240;

/** Hash curto estável (djb2) — idêntico ao da cartolina; só pra id, não é segurança. */
export function hashId(s: string): string {
  let x = 5381;
  for (let i = 0; i < s.length; i++) x = ((x << 5) + x + s.charCodeAt(i)) | 0;
  return (x >>> 0).toString(36);
}
export const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim();
const corta = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + "…" : s);

const PREFIXO: Record<TipoNo, string> = { conceito: "k", evidencia: "e", passo: "p", secao: "w", artefato: "a", experimento: "x", entrega: "d", conclusao: "z" };
export const idDeNo = (tipo: TipoNo, chave: string) => `${PREFIXO[tipo]}_${hashId(norm(chave))}`;

/** Estado inicial por tipo: o que a Aura explicou conta como aprendido; passo é o que falta. */
const ESTADO_INICIAL: Record<TipoNo, EstadoNo> = {
  conceito: "aprendido", evidencia: "aprendido", secao: "aprendido", artefato: "aprendido",
  passo: "a_conquistar", experimento: "a_conquistar", entrega: "a_conquistar", conclusao: "a_conquistar",
};
const PESO: Record<TipoNo, number> = { conceito: 0.6, evidencia: 0.5, passo: 0.4, secao: 0.7, artefato: 0.3, experimento: 0.9, entrega: 0.9, conclusao: 1 };

export type NoRascunho = Omit<MapaNo, "msgIds"> & { msgIds?: string[] };

/** O trecho VERBATIM do turno que vai pra gaveta (pergunta + núcleo), sem LLM. */
export function textoDaGaveta(prompt: string, a: Pick<StructuredAnswer, "nucleo">): string {
  const p = (prompt || "").replace(/\s+/g, " ").trim(), n = (a.nucleo || "").replace(/\s+/g, " ").trim();
  const t = (p ? `Aluno: ${p}\n` : "") + (n ? `Aura: ${n}` : "");
  return t.length > MAX_DRAWER_CHARS ? t.slice(0, MAX_DRAWER_CHARS - 1) + "…" : t;
}

/**
 * Nós que a resposta gera. Sem resposta estruturada (só núcleo) → nenhum: o grafo não é histórico.
 * Com `verbatim` (pergunta + resposta do turno), cada nó nasce com UMA gaveta (memória verbatim-first,
 * MemPalace) e o closet = seu corpo/label.
 */
export function nosFromStructured(a: StructuredAnswer, msgId?: string, verbatim?: { prompt: string; ts?: number }): MapaNo[] {
  const out: MapaNo[] = [];
  const ts = verbatim?.ts ?? Date.now();
  const gaveta: Drawer | null = verbatim ? { msgIds: msgId ? [msgId] : [], texto: textoDaGaveta(verbatim.prompt, a), ts } : null;
  const no = (tipo: TipoNo, chave: string, label: string, extra: Partial<MapaNo> = {}): MapaNo => ({
    id: idDeNo(tipo, chave), label, tipo, estado: ESTADO_INICIAL[tipo], peso: PESO[tipo], msgIds: msgId ? [msgId] : [],
    ...(gaveta && gaveta.texto ? { drawers: [gaveta], tLast: ts } : {}),
    ...extra,
  });
  for (const c of a.conceitos ?? []) {
    const t = (c ?? "").trim();
    if (t) out.push(no("conceito", t, corta(t, 80)));
  }
  for (const e of a.evidencia ?? []) {
    const claim = (e?.claim ?? "").trim();
    if (!claim) continue;
    const fonte = (e.source as any)?.title ?? (e.source as any)?.name;
    out.push(no("evidencia", claim, "Evidência", { corpo: corta(claim, 400), ...(fonte ? { legenda: corta(String(fonte), 120) } : {}) }));
  }
  for (const p of a.proximos_passos ?? []) {
    const t = (p ?? "").trim();
    if (t) out.push(no("passo", t, "Próximo passo", { corpo: corta(t, 300) }));
  }
  for (const s of a.work?.sections ?? []) {
    const t = (s?.title ?? "").trim();
    if (t) out.push(no("secao", t, corta(t, 80), { corpo: corta((s.body ?? "").trim(), 400) || undefined }));
  }
  for (const art of a.artifacts ?? []) {
    const kind = String((art as any)?.studioKind ?? "");
    const topic = String((art as any)?.topic ?? (art as any)?.title ?? kind).trim();
    if (!kind) continue;
    out.push(no("artefato", kind + "|" + topic, corta(topic, 80), { legenda: kind }));
  }
  const vistos = new Set<string>();
  return out
    .filter((n) => (vistos.has(n.id) ? false : (vistos.add(n.id), true)))
    .slice(0, MAX_NOS_POR_TURNO)
    .map((n) => (n.drawers ? { ...n, closet: closetDe(n) } : n));
}

/** Closet (resumo curto, sem LLM): corpo quando há, senão o label — até 160 chars. */
export function closetDe(n: Pick<MapaNo, "label" | "corpo" | "legenda">): string {
  const base = (n.corpo || n.label || "").replace(/\s+/g, " ").trim();
  const t = n.legenda && n.corpo ? `${base} (${n.legenda})` : base;
  return t.length > 160 ? t.slice(0, 159) + "…" : t;
}

/** Funde gavetas: dedupe por msgId (ou texto), mais recentes no fim, teto por nó. */
export function fundirGavetas(a: Drawer[] = [], b: Drawer[] = []): Drawer[] {
  const vistos = new Set<string>();
  const chave = (d: Drawer) => (d.msgIds.length ? "m:" + d.msgIds.join(",") : "t:" + d.texto.slice(0, 80));
  const out: Drawer[] = [];
  for (const d of [...a, ...b]) { const k = chave(d); if (!d.texto || vistos.has(k)) continue; vistos.add(k); out.push(d); }
  return out.sort((x, y) => x.ts - y.ts).slice(-MAX_DRAWERS_POR_NO);
}

/** Relações DENTRO do turno. Conceitos do turno são a âncora; o resto se liga a eles (até 3). */
export function arestasDoTurno(nos: MapaNo[]): MapaAresta[] {
  const conceitos = nos.filter((n) => n.tipo === "conceito").slice(0, 3);
  const out: MapaAresta[] = [];
  const push = (de: string, para: string, relacao: MapaAresta["relacao"]) => out.push({ de, para, relacao, tipoVisual: tipoVisualDe(relacao), peso: 0.6 });
  for (let i = 1; i < conceitos.length; i++) push(conceitos[i - 1]!.id, conceitos[i]!.id, "relacionado");
  for (const n of nos) {
    if (n.tipo === "conceito") continue;
    for (const c of conceitos) {
      if (n.tipo === "evidencia") push(n.id, c.id, "sustenta");
      else if (n.tipo === "passo") push(c.id, n.id, "leva_a");
      else if (n.tipo === "secao") push(n.id, c.id, "trata");
      else if (n.tipo === "artefato") push(n.id, c.id, "ilustra");
    }
  }
  return out;
}

const uniq = (xs: string[]) => [...new Set(xs)];

/** Estado mais avançado vence: a trilha nunca regride por um turno novo. */
export function avancaEstado(atual: EstadoNo, novo: EstadoNo): EstadoNo {
  return ORDEM_ESTADO[novo] > ORDEM_ESTADO[atual] ? novo : atual;
}

/**
 * Funde nós/arestas do turno no grafo. Nó que já existe: acumula msgIds, mantém estado (ou avança),
 * perde a marca `planejado` (o turno o realizou — merge planejado × realizado). Teto de nós/arestas.
 */
export function fundirNoGrafo(
  grafo: { nos: MapaNo[]; arestas: MapaAresta[] },
  turno: { nos: MapaNo[]; arestas: MapaAresta[] },
): { nos: MapaNo[]; arestas: MapaAresta[]; novos: string[]; tocados: string[]; /** nós do plano que este turno realizou (planejado → aprendido) */ realizados: string[] } {
  const porId = new Map(grafo.nos.map((n) => [n.id, n]));
  const nos = [...grafo.nos];
  const novos: string[] = [], tocados: string[] = [], realizados: string[] = [];
  for (const n of turno.nos) {
    const ja = porId.get(n.id);
    if (ja) {
      const i = nos.findIndex((x) => x.id === n.id);
      const drawers = fundirGavetas(ja.drawers, n.drawers);
      const fundido: MapaNo = {
        ...ja,
        estado: avancaEstado(ja.estado, n.estado),
        msgIds: uniq([...ja.msgIds, ...n.msgIds]).slice(-MAX_MSG_IDS),
        corpo: ja.corpo ?? n.corpo, legenda: ja.legenda ?? n.legenda,
        ...((ja.resumo ?? n.resumo) ? { resumo: ja.resumo ?? n.resumo } : {}), ...((ja.req ?? n.req) ? { req: ja.req ?? n.req } : {}),
        ...(drawers.length ? { drawers, closet: ja.closet ?? n.closet ?? closetDe(ja), tLast: Math.max(ja.tLast ?? 0, n.tLast ?? 0) || undefined } : {}),
      };
      if (ja.planejado && fundido.estado !== "a_conquistar") realizados.push(n.id);
      delete fundido.planejado;
      nos[i] = fundido;
      tocados.push(n.id);
      continue;
    }
    if (nos.length >= MAX_NOS) continue;
    nos.push({ ...n, msgIds: n.msgIds.slice(-MAX_MSG_IDS) });
    porId.set(n.id, n);
    novos.push(n.id);
  }
  const ids = new Set(nos.map((n) => n.id));
  const chave = (a: MapaAresta) => `${a.de}>${a.para}:${a.relacao}`;
  const vistas = new Set(grafo.arestas.map(chave));
  const arestas = [...grafo.arestas];
  for (const a of turno.arestas) {
    if (arestas.length >= MAX_ARESTAS) break;
    if (!ids.has(a.de) || !ids.has(a.para) || a.de === a.para || vistas.has(chave(a))) continue;
    vistas.add(chave(a)); arestas.push({ ...a, tipoVisual: a.tipoVisual ?? tipoVisualDe(a.relacao) });
  }
  return { nos, arestas, novos, tocados, realizados };
}

/** Muda o estado de um nó (só pra frente, salvo `forcar` — usado pela rejeição da validação). */
export function setEstado(nos: MapaNo[], noId: string, estado: EstadoNo, forcar = false): MapaNo[] | null {
  const i = nos.findIndex((n) => n.id === noId);
  if (i < 0) return null;
  const atual = nos[i]!;
  const proximo = forcar ? estado : avancaEstado(atual.estado, estado);
  if (proximo === atual.estado) return nos;
  const out = [...nos]; out[i] = { ...atual, estado: proximo };
  return out;
}

// ───────────────────────────── projeção: grafo → cartolina ─────────────────────────────

const CARD_TIPO: Record<TipoNo, CardTipo> = {
  conceito: "nota", evidencia: "nota", secao: "nota", passo: "pergunta",
  artefato: "prancha", experimento: "exercicio", entrega: "exercicio", conclusao: "nota",
};

/** Um nó como card SEM posição (a posição vem do board, se já existe, ou da grade). */
export function cardDeNo(n: MapaNo): Omit<CartolinaCard, "x" | "y" | "w" | "rot"> {
  const tipo: CardTipo = n.tipo === "artefato" && n.legenda === "video" ? "video" : CARD_TIPO[n.tipo];
  const c: Omit<CartolinaCard, "x" | "y" | "w" | "rot"> = { id: n.id, tipo, titulo: n.label };
  if (n.corpo) c.corpo = n.corpo;
  if (n.legenda) c.legenda = n.legenda;
  if (n.msgIds.length) c.msgIds = n.msgIds;
  return c;
}

/**
 * Projeta o grafo no board. Cards existentes são preservados INTEIROS (o aluno pode ter movido,
 * reescrito, desenhado) — só acumulam msgIds. Nós planejados (sem turno) NÃO viram card: a
 * cartolina mostra o que foi estudado, o percurso mora no painel do cérebro.
 */
export function projetarCards(nos: MapaNo[], atual: CartolinaCard[]): CartolinaCard[] {
  const porId = new Map(atual.map((c) => [c.id, c]));
  const out = [...atual];
  const baseY = atual.length ? Math.max(...atual.map((c) => c.y)) + ALTURA_LINHA + GAP_Y : 60;
  let k = 0;
  for (const n of nos) {
    if (n.planejado) continue;
    const ja = porId.get(n.id);
    if (ja) {
      const ids = uniq([...(ja.msgIds ?? []), ...n.msgIds]).slice(-MAX_MSG_IDS);
      if (ids.length !== (ja.msgIds?.length ?? 0)) { const i = out.findIndex((c) => c.id === n.id); out[i] = { ...ja, msgIds: ids }; }
      continue;
    }
    const col = k % COLS, row = Math.floor(k / COLS);
    out.push({ ...cardDeNo(n), x: X0 + col * (COL_W + GAP_X), y: baseY + row * (ALTURA_LINHA + GAP_Y), w: COL_W, rot: (((atual.length + k) * 37) % 40) / 10 - 2 });
    k++;
  }
  return out;
}

/** Só os cards que mudaram em relação ao board atual (o que vai no upsert). */
export function cardsAlterados(antes: CartolinaCard[], depois: CartolinaCard[]): CartolinaCard[] {
  const a = new Map(antes.map((c) => [c.id, JSON.stringify(c)]));
  return depois.filter((c) => a.get(c.id) !== JSON.stringify(c));
}

// ───────────────────────────── bússola: grafo → agente ─────────────────────────────

/**
 * O que o grafo diz ao agente. Curta (vai pro prompt a cada turno): o que já acendeu, o que
 * está em aberto, o que foi validado. Recuperação seletiva: nós mais pesados/recentes primeiro.
 */
export function bussolaDoGrafo(nos: MapaNo[], opts: { maxChars?: number; objetivo?: string; maxPorGrupo?: number } = {}): string {
  if (!nos.length) return "";
  const maxChars = opts.maxChars ?? 1200, maxPorGrupo = opts.maxPorGrupo ?? 12;
  const t = (n: MapaNo) => (n.tipo === "evidencia" || n.tipo === "passo" ? n.corpo ?? n.label : n.label).replace(/\s+/g, " ").trim().slice(0, 70);
  const ordenado = [...nos].sort((a, b) => b.peso - a.peso);
  const grupo = (f: (n: MapaNo) => boolean) => ordenado.filter(f).map(t).filter(Boolean).slice(0, maxPorGrupo);
  const partes: string[] = [];
  if (opts.objetivo) partes.push(`Objetivo do estudo: ${opts.objetivo.slice(0, 160)}`);
  const validados = grupo((n) => n.estado === "validado"); if (validados.length) partes.push(`Validado: ${validados.join("; ")}`);
  const aplicados = grupo((n) => n.estado === "aplicado"); if (aplicados.length) partes.push(`Aplicado (aguarda validação): ${aplicados.join("; ")}`);
  const aprendidos = grupo((n) => n.estado === "aprendido" && n.tipo !== "artefato"); if (aprendidos.length) partes.push(`Já estudado: ${aprendidos.join("; ")}`);
  const abertos = grupo((n) => n.estado === "a_conquistar"); if (abertos.length) partes.push(`Em aberto / a conquistar: ${abertos.join("; ")}`);
  const material = grupo((n) => n.tipo === "artefato"); if (material.length) partes.push(`Material criado: ${material.join("; ")}`);
  const txt = "=== CÉREBRO DO ALUNO (memória do estudo nesta conversa) ===\n" + partes.join("\n") +
    "\nUse isto pra não repetir o que ele já viu e pra conduzir ao que falta.";
  return txt.length > maxChars ? txt.slice(0, maxChars - 1) + "…" : txt;
}

// ───────────────────────────── leitura segura do Json ─────────────────────────────

const ID_RE = /^[\w:.-]{1,64}$/;
const TIPOS_NO = new Set<string>(["conceito", "evidencia", "passo", "secao", "artefato", "experimento", "entrega", "conclusao"]);
const RELACOES = new Set<string>(["pre_requisito", "sustenta", "leva_a", "trata", "ilustra", "relacionado"]);

export function readNos(json: unknown): MapaNo[] {
  if (!Array.isArray(json)) return [];
  const out: MapaNo[] = [];
  for (const raw of json) {
    if (!raw || typeof raw !== "object") continue;
    const r = raw as Record<string, unknown>;
    if (typeof r.id !== "string" || !ID_RE.test(r.id) || typeof r.label !== "string" || !TIPOS_NO.has(String(r.tipo))) continue;
    const n: MapaNo = {
      id: r.id, label: r.label.slice(0, 200), tipo: r.tipo as TipoNo,
      estado: isEstadoNo(r.estado) ? r.estado : "a_conquistar",
      peso: typeof r.peso === "number" && Number.isFinite(r.peso) ? Math.min(1, Math.max(0, r.peso)) : 0.5,
      msgIds: Array.isArray(r.msgIds) ? r.msgIds.filter((m): m is string => typeof m === "string" && ID_RE.test(m)).slice(0, MAX_MSG_IDS) : [],
    };
    if (typeof r.corpo === "string" && r.corpo.trim()) n.corpo = r.corpo.slice(0, 4000);
    if (typeof r.legenda === "string" && r.legenda.trim()) n.legenda = r.legenda.slice(0, 400);
    if (typeof r.regiao === "string" && r.regiao.trim()) n.regiao = r.regiao.slice(0, 80);
    if (r.planejado === true) n.planejado = true;
    if (Array.isArray(r.drawers)) {
      const ds = r.drawers.filter((d): d is Record<string, unknown> => !!d && typeof d === "object")
        .map((d) => ({ msgIds: Array.isArray(d.msgIds) ? d.msgIds.filter((m): m is string => typeof m === "string" && ID_RE.test(m)).slice(0, 5) : [], texto: typeof d.texto === "string" ? d.texto.slice(0, MAX_DRAWER_CHARS) : "", ts: typeof d.ts === "number" && Number.isFinite(d.ts) ? d.ts : 0 }))
        .filter((d) => d.texto).slice(-MAX_DRAWERS_POR_NO);
      if (ds.length) n.drawers = ds;
    }
    if (typeof r.closet === "string" && r.closet.trim()) n.closet = r.closet.slice(0, 200);
    if (typeof r.resumo === "string" && r.resumo.trim()) n.resumo = r.resumo.trim().slice(0, MAX_RESUMO_CHARS);
    if (typeof r.req === "string" && r.req.trim()) n.req = r.req.trim().slice(0, MAX_RESUMO_CHARS);
    if (typeof r.tLast === "number" && Number.isFinite(r.tLast)) n.tLast = r.tLast;
    out.push(n);
    if (out.length >= MAX_NOS) break;
  }
  return out;
}

export function readArestas(json: unknown, nos?: MapaNo[]): MapaAresta[] {
  if (!Array.isArray(json)) return [];
  const ids = nos ? new Set(nos.map((n) => n.id)) : null;
  const out: MapaAresta[] = [];
  for (const raw of json) {
    if (!raw || typeof raw !== "object") continue;
    const r = raw as Record<string, unknown>;
    if (typeof r.de !== "string" || typeof r.para !== "string" || !RELACOES.has(String(r.relacao))) continue;
    if (ids && (!ids.has(r.de) || !ids.has(r.para))) continue;
    const a: MapaAresta = { de: r.de, para: r.para, relacao: r.relacao as MapaAresta["relacao"], tipoVisual: r.tipoVisual === "percurso" || r.tipoVisual === "memoria" ? r.tipoVisual : tipoVisualDe(r.relacao as MapaAresta["relacao"]) };
    if (typeof r.peso === "number" && Number.isFinite(r.peso)) a.peso = Math.min(1, Math.max(0, r.peso));
    out.push(a);
    if (out.length >= MAX_ARESTAS) break;
  }
  return out;
}
