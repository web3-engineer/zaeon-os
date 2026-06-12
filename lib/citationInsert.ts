/**
 * Inserção de citações no editor de pesquisa.
 *
 * Duas operações puras (sem React, testáveis):
 *   - insertQuoteAtCursor: a FRASE da citação entra exatamente onde o cursor estava.
 *   - appendReference: a REFERÊNCIA bibliográfica (ABNT) vai pro fim da seção "# REFERÊNCIAS".
 *
 * applyCitationDrop combina as duas — é o que o editor chama no onDrop.
 */

/** Acha um cabeçalho de Referências (com/sem #, com/sem acento). */
const REF_HEADING_RE = /^#{0,6}\s*REFER[ÊE]NCIAS\s*$/i;

/** Insere `quote` na posição `cursor` dentro de `doc`, com espaçamento limpo. */
export function insertQuoteAtCursor(doc: string, cursor: number, quote: string): string {
  const q = (quote ?? "").trim();
  if (!q) return doc;
  const pos = Math.max(0, Math.min(Number.isFinite(cursor) ? cursor : doc.length, doc.length));
  const before = doc.slice(0, pos);
  const after = doc.slice(pos);
  const lead = before.length > 0 && !/\s$/.test(before) ? " " : "";
  const trail = after.length > 0 && !/^\s/.test(after) ? " " : "";
  return before + lead + q + trail + after;
}

/**
 * Acrescenta `reference` à seção de Referências (deduplicado).
 * Se a seção não existir, cria "# REFERÊNCIAS" no fim do documento.
 * Mantém as referências separadas por uma linha em branco (leitura ABNT).
 */
export function appendReference(doc: string, reference: string): string {
  const ref = (reference ?? "").trim();
  if (!ref) return doc;
  if (doc.includes(ref)) return doc; // já está lá → não duplica

  const lines = doc.split("\n");
  const idx = lines.findIndex((l) => REF_HEADING_RE.test(l.trim()));

  // Sem seção de referências → cria no fim.
  if (idx === -1) {
    const base = doc.replace(/\s+$/, "");
    return `${base}\n\n# REFERÊNCIAS\n\n${ref}\n`;
  }

  // Limita a seção até o próximo cabeçalho `#`.
  let end = lines.length;
  for (let i = idx + 1; i < lines.length; i++) {
    if (/^#{1,6}\s+\S/.test(lines[i])) {
      end = i;
      break;
    }
  }

  const existing = lines
    .slice(idx + 1, end)
    .map((l) => l.trim())
    .filter(Boolean);
  const block = [...existing, ref].join("\n\n");

  const out = [...lines.slice(0, idx + 1), "", block, "", ...lines.slice(end)];
  return out.join("\n");
}

export interface CitationDrop {
  /** A frase a colar onde o cursor estava (citação inline). */
  quote: string;
  /** A referência bibliográfica completa (ABNT) — vai pra seção Referências. */
  abnt: string;
}

/**
 * Aplica o drop de uma citação: frase no cursor + referência nas Referências.
 * Só acrescenta a referência se ela for distinta da frase (cita legada guarda só a frase).
 */
export function applyCitationDrop(doc: string, cursor: number, cit: CitationDrop): string {
  const quote = (cit.quote ?? "").trim();
  const abnt = (cit.abnt ?? "").trim();
  let next = insertQuoteAtCursor(doc, cursor, quote);
  if (abnt && abnt !== quote) {
    next = appendReference(next, abnt);
  }
  return next;
}

/** Remove a primeira ocorrência da FRASE (citação inline) do documento, limpando espaços. */
export function removeQuoteFromDoc(doc: string, quote: string): string {
  const q = (quote ?? "").trim();
  if (!q) return doc;
  const idx = doc.indexOf(q);
  if (idx === -1) return doc;
  const before = doc.slice(0, idx);
  const after = doc.slice(idx + q.length);
  // junta e limpa espaço duplo / espaço antes de quebra deixado pra trás
  return (before + after).replace(/[ \t]{2,}/g, " ").replace(/[ \t]+\n/g, "\n");
}

/** Remove a linha da REFERÊNCIA da seção de Referências (e uma linha em branco órfã, se sobrar). */
export function removeReference(doc: string, reference: string): string {
  const ref = (reference ?? "").trim();
  if (!ref) return doc;
  const lines = doc.split("\n");
  const i = lines.findIndex((l) => l.trim() === ref);
  if (i === -1) return doc;
  lines.splice(i, 1);
  // se ficaram duas linhas em branco coladas onde estava a referência, remove uma
  if (i > 0 && i < lines.length && lines[i].trim() === "" && lines[i - 1].trim() === "") {
    lines.splice(i, 1);
  }
  return lines.join("\n");
}

/** Aplica a remoção completa de uma citação (frase + referência) — usado ao apagar a nota. */
export function applyCitationRemoval(doc: string, cit: { quote?: string; abnt?: string }): string {
  let next = doc;
  if (cit.quote) next = removeQuoteFromDoc(next, cit.quote);
  if (cit.abnt) next = removeReference(next, cit.abnt);
  return next;
}
