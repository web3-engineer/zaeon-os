/**
 * BLUEPRINT PRÁTICO — o que o CLIENTE pode mudar (PURO). Só o arranjo e as notas dele: arrastar um módulo fixa a
 * posição (`fixos`), "reorganizar" solta tudo, notas próprias entram/saem, e o título. Críticos, provas, fases e
 * avaliações são do SERVIDOR (a prova é conferida lá) — vindos daqui são ignorados.
 */
import type { StructuredAnswer } from "@/lib/agent/contracts";
import { MAX_NOTAS, idOk, sanitizarNota, type DocBlueprint } from "./tipos";

const obj = (v: unknown): Record<string, unknown> | null => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null);
const fin = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const ID_MODULO = /^[\w:.-]{1,80}$/;

export function aplicarPatchCliente(doc: DocBlueprint, body: unknown, autor: string): DocBlueprint {
  const b = obj(body); if (!b) return doc;
  const out: DocBlueprint = { ...doc, fixos: { ...doc.fixos }, notas: [...doc.notas] };
  if (b.reorganizar === true) out.fixos = {};
  const fixos = obj(b.fixos);
  for (const [id, v] of Object.entries(obj(fixos?.set) ?? {})) {
    const p = obj(v); if (ID_MODULO.test(id) && p && fin(p.x) && fin(p.y)) out.fixos[id] = { x: p.x, y: p.y };
  }
  for (const id of Array.isArray(fixos?.remove) ? fixos.remove : []) if (typeof id === "string") delete out.fixos[id];
  const notas = obj(b.notas);
  const remover = new Set((Array.isArray(notas?.remove) ? notas.remove : []).filter(idOk));
  out.notas = out.notas.filter((n) => !remover.has(n.id));
  for (const raw of Array.isArray(notas?.upsert) ? notas.upsert : []) {
    const n = sanitizarNota({ ...(obj(raw) ?? {}), autor }); if (!n) continue;
    const i = out.notas.findIndex((x) => x.id === n.id);
    if (i >= 0) out.notas[i] = n; else if (out.notas.length < MAX_NOTAS) out.notas.push(n);
  }
  // #681: o nome dado pela pessoa fica: a Zaeon não troca quando refaz o blueprint
  if (typeof b.titulo === "string" && b.titulo.trim()) { out.titulo = b.titulo.trim().slice(0, 200); out.tituloFixo = true; }
  return out;
}

/** o texto da resposta da Aura que a composição lê (núcleo, conceitos, evidências com a fonte, próximos passos) */
export function textoDaResposta(a: Partial<StructuredAnswer> | null | undefined): string {
  if (!a) return "";
  const partes = [
    a.nucleo, a.desenvolvimento,
    a.conceitos?.length ? `Conceitos: ${a.conceitos.join(", ")}` : "",
    ...(a.evidencia ?? []).map((e) => `Evidência: ${e.claim} — fonte: ${[e.source?.title, e.source?.url].filter(Boolean).join(" ")}`),
    a.proximos_passos?.length ? `Próximos passos: ${a.proximos_passos.join("; ")}` : "",
  ];
  return partes.filter(Boolean).join("\n").slice(0, 4000);
}
