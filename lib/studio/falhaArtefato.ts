/**
 * lib/studio/falhaArtefato.ts — #745: o que o ALUNO lê quando um artefato pedido não sai. PURO.
 *
 * Antes, o chat colava o motivo cru da API: "Não consegui gerar esse artefato: Diagrama reprovado no validador: Node
 * "esofago" exceeds the horizontal bounds of the viewBox — reduce node.width… | Node "esofago" exceeds…" — técnico, em
 * inglês e repetido. O motivo técnico continua existindo (vai para o console, para diagnosticar); o aluno lê uma frase
 * simples e ganha o botão "tentar de novo". Motivo que já é para gente (em português, sem jargão — ex.: limite do plano)
 * continua aparecendo.
 */

const NOME: Record<string, string> = {
  diagram: "esse diagrama", mindmap: "esse mapa mental", timeline: "essa linha do tempo", flashcards: "esses flashcards",
  faq: "esse FAQ", guide: "esse guia", image: "essa imagem", podcast: "esse podcast", video: "esse vídeo",
  molecule: "essa molécula", aula: "essa aula",
};
const VERBO: Record<string, string> = { diagram: "desenhar", mindmap: "desenhar", image: "desenhar", molecule: "montar", aula: "montar" };

/** cara de erro de máquina: inglês de programa, nomes de campo, códigos, pilha */
const TECNICO = /viewBox|validador|reprovad|\bnode\b|\bstate\b|exceeds|bounds|render|schema|json|undefined|null\b|TypeError|Error:|ECONN|fetch failed|timeout|timed out|status \d{3}|\b[45]\d\d\b|\bat \S+ \(|modelo não respondeu|não descreveu|\bmeta\.|\.width|stack/i;

/** junta "A | A | B" em "A | B" (o validador repete o mesmo diagnóstico) */
export function semRepetir(motivo: string): string {
  const partes = motivo.split(/\s*\|\s*/).map((p) => p.trim()).filter(Boolean);
  // a 1ª parte costuma vir com um prefixo ("Diagrama reprovado no validador: …"): compara sem ele
  const chave = (p: string) => p.replace(/^[^:|"]{0,60}:\s+/, "");
  const vistos = new Set<string>();
  return partes.filter((p) => { const k = chave(p); if (vistos.has(k)) return false; vistos.add(k); return true; }).join(" | ");
}

export function mensagemDeFalha(kind: string, motivo?: string): { texto: string; tecnico: string | null } {
  const bruto = (motivo || "").trim();
  const oQue = NOME[kind] ?? "esse material";
  const verbo = VERBO[kind] ?? "gerar";
  const padrao = `Não consegui ${verbo} ${oQue} agora. Pode tentar de novo.`;
  if (!bruto) return { texto: padrao, tecnico: null };
  const limpo = semRepetir(bruto);
  if (TECNICO.test(limpo) || limpo.length > 220) return { texto: padrao, tecnico: limpo };
  // motivo para gente (limite do plano, assunto vazio…): mostra, sem o prefixo técnico
  return { texto: `Não consegui ${verbo} ${oQue}: ${limpo.replace(/[.\s]+$/, "")}.`, tecnico: null };
}
