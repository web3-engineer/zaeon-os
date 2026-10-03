/**
 * lib/map/backbone.ts — o PERCURSO do cérebro (HANDOFF_CEREBRO_AURA §5), PURO.
 *
 *  - normalizarBackbone: a saída do modelo (passos ordenados) vira nós PLANEJADOS + arestas
 *    `pre_requisito` + a lista `backbone` (DAG linear: sem ciclo, sem repetição, ids existentes).
 *    Passo que coincide com um nó já estudado reaproveita o nó (merge planejado × realizado).
 *  - completudes: aprendizado (quanto do grafo acendeu) × conclusão (quanto do backbone passou
 *    pelo gate do arquétipo).
 *  - quantoFaltaConcluir: "o que falta" no vocabulário do arquétipo, ciente do critério.
 */
import { ARQUETIPOS } from "@/lib/map/arquetipo";
import { idDeNo } from "@/lib/map/grafo";
import { ORDEM_ESTADO, type EstadoNo, type MapaAresta, type MapaNo, type MapaView, type ModoValidacao, type TipoNo, type TipoTopico } from "@/lib/map/tipos";

export const MIN_PASSOS = 3;
export const MAX_PASSOS = 12;

export type PassoRaw = { label: string; tipo?: TipoNo; corpo?: string };

const TIPOS_PASSO = new Set<TipoNo>(["conceito", "passo", "experimento", "entrega", "conclusao", "secao"]);

/** Estado em que um nó do backbone conta como "atingiu o gate" do modo de validação. */
export function estadoGate(modo: ModoValidacao): EstadoNo {
  switch (modo) {
    case "humana": return "validado";
    case "rubrica": case "quiz": case "peer": return "aplicado";
    case "cobertura": case "nenhuma": return "aprendido";
  }
}

/**
 * Normaliza os passos do modelo. Devolve null se não dá pra usar (poucos passos). O último passo é
 * forçado ao tipo de conclusão do arquétipo (é o nó que fecha o estudo).
 */
export function normalizarBackbone(raw: unknown, tipoTopico: TipoTopico, nosExistentes: MapaNo[]): { nos: MapaNo[]; arestas: MapaAresta[]; backbone: string[] } | null {
  const lista: unknown[] = Array.isArray((raw as any)?.passos) ? (raw as any).passos : Array.isArray(raw) ? raw : [];
  const existentes = new Map(nosExistentes.map((n) => [n.id, n]));
  const vistos = new Set<string>();
  const nos: MapaNo[] = [];
  const backbone: string[] = [];
  const passos: PassoRaw[] = [];
  for (const p of lista) {
    const label = typeof p === "string" ? p : typeof (p as any)?.label === "string" ? (p as any).label : typeof (p as any)?.title === "string" ? (p as any).title : "";
    const l = label.replace(/\s+/g, " ").trim();
    if (!l) continue;
    const tipoRaw = String((p as any)?.tipo ?? "").toLowerCase();
    const tipo = (TIPOS_PASSO.has(tipoRaw as TipoNo) ? tipoRaw : "passo") as TipoNo;
    const corpo = typeof (p as any)?.corpo === "string" ? (p as any).corpo.trim().slice(0, 300) : undefined;
    passos.push({ label: l.slice(0, 120), tipo, corpo });
    if (passos.length >= MAX_PASSOS) break;
  }
  if (passos.length < MIN_PASSOS) return null;
  const ultimo = passos.length - 1;
  passos[ultimo]!.tipo = ARQUETIPOS[tipoTopico].noConclusao;
  const arestas: MapaAresta[] = [];
  let anterior: string | null = null;
  for (const p of passos) {
    // Conceito já estudado com o mesmo nome? Reaproveita (mesmo id do turno). Senão nó planejado.
    const idConceito = idDeNo("conceito", p.label);
    const idTipo = idDeNo(p.tipo!, p.label);
    const id = existentes.has(idConceito) ? idConceito : idTipo;
    if (vistos.has(id)) continue; // repetição no plano → ignora (sem ciclo por construção)
    vistos.add(id);
    const ja = existentes.get(id);
    if (ja) nos.push(ja);
    else nos.push({ id, label: p.label, tipo: p.tipo!, estado: "a_conquistar", peso: p.tipo === ARQUETIPOS[tipoTopico].noConclusao ? 1 : 0.8, msgIds: [], planejado: true, ...(p.corpo ? { corpo: p.corpo } : {}) });
    if (anterior) arestas.push({ de: anterior, para: id, relacao: "pre_requisito" });
    backbone.push(id);
    anterior = id;
  }
  return backbone.length >= MIN_PASSOS ? { nos, arestas, backbone } : null;
}

/** Backbone válido? (ids existentes, sem repetição, cadeia linear de pre_requisito). */
export function backboneValido(backbone: string[], nos: MapaNo[], arestas: MapaAresta[]): boolean {
  if (!backbone.length || new Set(backbone).size !== backbone.length) return false;
  const ids = new Set(nos.map((n) => n.id));
  if (!backbone.every((id) => ids.has(id))) return false;
  const pre = new Set(arestas.filter((a) => a.relacao === "pre_requisito").map((a) => `${a.de}>${a.para}`));
  for (let i = 1; i < backbone.length; i++) if (!pre.has(`${backbone[i - 1]}>${backbone[i]}`)) return false;
  return true;
}

export type Completudes = { aprendizado: number; conclusao: number; backboneTotal: number; backboneNoGate: number };

/** Duas barras: aprendizado (nós acesos / nós) × conclusão (backbone no gate / backbone). */
export function completudes(m: Pick<MapaView, "nos" | "backbone" | "modoValidacao">): Completudes {
  const nos = m.nos;
  const acesos = nos.filter((n) => ORDEM_ESTADO[n.estado] >= ORDEM_ESTADO.aprendido).length;
  const aprendizado = nos.length ? acesos / nos.length : 0;
  const gate = estadoGate(m.modoValidacao);
  const porId = new Map(nos.map((n) => [n.id, n]));
  const bb = m.backbone.filter((id) => porId.has(id));
  const noGate = bb.filter((id) => ORDEM_ESTADO[porId.get(id)!.estado] >= ORDEM_ESTADO[gate]).length;
  const conclusao = bb.length ? noGate / bb.length : 0;
  return { aprendizado: round3(aprendizado), conclusao: round3(conclusao), backboneTotal: bb.length, backboneNoGate: noGate };
}
const round3 = (x: number) => Math.round(x * 1000) / 1000;

/** Próximo nó do backbone que ainda não passou pelo gate (null = concluído / sem backbone). */
export function proximoDoBackbone(m: Pick<MapaView, "nos" | "backbone" | "modoValidacao">): MapaNo | null {
  const gate = estadoGate(m.modoValidacao);
  const porId = new Map(m.nos.map((n) => [n.id, n]));
  for (const id of m.backbone) {
    const n = porId.get(id);
    if (n && ORDEM_ESTADO[n.estado] < ORDEM_ESTADO[gate]) return n;
  }
  return null;
}

/** "O que falta" no vocabulário do arquétipo, ciente do critério de completude. */
export function quantoFaltaConcluir(m: Pick<MapaView, "nos" | "backbone" | "modoValidacao" | "tipoTopico" | "criterioCompletude" | "objetivo">): string {
  const a = ARQUETIPOS[m.tipoTopico];
  const c = completudes(m);
  if (!m.backbone.length) return `Percurso ainda não traçado. Objetivo: ${m.objetivo || "a definir"}.`;
  if (c.backboneNoGate >= c.backboneTotal) return `Estudo concluído: ${m.criterioCompletude || a.criterioCompletude}.`;
  const prox = proximoDoBackbone(m);
  const faltam = c.backboneTotal - c.backboneNoGate;
  const gateTxt = m.modoValidacao === "humana" ? "validação humana" : m.modoValidacao;
  return `Faltam ${faltam} de ${c.backboneTotal} passos do percurso (${Math.round(c.conclusao * 100)}% concluído; gate: ${gateTxt} — ${a.vocabulario.gate}). ` +
    `Próximo: "${prox?.label ?? "?"}" — ${a.vocabulario.falta}. Critério: ${m.criterioCompletude || a.criterioCompletude}.`;
}
