/**
 * Converte o `meta` de um artefato de TEXTO do Studio em texto legível (pt-BR) —
 * usado para "salvar na biblioteca" como nota e para o botão de baixar. PURO.
 */
import type { TextKind } from "@/lib/studio/transformations";

function guideText(d: any): string {
  const out: string[] = [];
  if (d?.resumo) out.push(`Resumo\n${d.resumo}`);
  if (d?.conceitos?.length) {
    out.push("Conceitos\n" + d.conceitos.map((c: any) => `• ${c.termo}: ${c.definicao}`).join("\n"));
  }
  if (d?.revisao?.length) {
    out.push("Revisão\n" + d.revisao.map((r: string) => `• ${r}`).join("\n"));
  }
  return out.join("\n\n");
}

function faqText(d: any): string {
  return (d?.faq || []).map((f: any) => `P: ${f.q}\nR: ${f.a}`).join("\n\n");
}

function flashcardsText(d: any): string {
  return (d?.cards || []).map((c: any) => `${c.front}\n→ ${c.back}`).join("\n\n");
}

function timelineText(d: any): string {
  return (d?.events || [])
    .map((e: any) => `${e.when ? e.when + " — " : ""}${e.title}${e.detail ? "\n" + e.detail : ""}`)
    .join("\n\n");
}

function mindmapText(d: any): string {
  const nodes = d?.nodes || [];
  const byParent = new Map<string | null, any[]>();
  for (const n of nodes) {
    const k = n.parent ?? null;
    if (!byParent.has(k)) byParent.set(k, []);
    byParent.get(k)!.push(n);
  }
  const lines: string[] = [];
  const walk = (parent: string | null, depth: number, seen: Set<string>) => {
    for (const n of byParent.get(parent) || []) {
      if (seen.has(n.id)) continue;
      seen.add(n.id);
      lines.push(`${"  ".repeat(depth)}• ${n.label}`);
      walk(n.id, depth + 1, seen);
    }
  };
  walk(null, 0, new Set());
  return lines.join("\n");
}

export function artifactToText(kind: TextKind, data: any): string {
  switch (kind) {
    case "guide":
      return guideText(data);
    case "faq":
      return faqText(data);
    case "flashcards":
      return flashcardsText(data);
    case "timeline":
      return timelineText(data);
    case "mindmap":
      return mindmapText(data);
    default:
      return "";
  }
}
