// Detecta uma citação proposta pela Aura no chat, demarcada por ⟦CITACAO⟧…⟦/CITACAO⟧.
// Puro (testado): separa o texto "limpo" (sem marcadores, pra exibir) da citação.

const BLOCK_RE = /⟦CITACAO⟧([\s\S]*?)⟦\/CITACAO⟧/;
const BLOCK_RE_G = /⟦CITACAO⟧[\s\S]*?⟦\/CITACAO⟧/g;

export interface CitationBlock {
  clean: string;        // texto visível, sem os marcadores/bloco
  citation: string | null; // conteúdo da citação (trim) ou null se não houver
}

export function extractCitationBlock(text: string): CitationBlock {
  if (typeof text !== "string" || !text) return { clean: text ?? "", citation: null };
  const m = text.match(BLOCK_RE);
  if (!m) return { clean: text, citation: null };
  const citation = m[1].trim();
  const clean = text.replace(BLOCK_RE_G, "").replace(/\n{3,}/g, "\n\n").trim();
  return { clean, citation: citation || null };
}
