/**
 * lib/chat/documentos.ts — artefatos que são DOCUMENTO (abrem numa aba da sala), não bolha de chat.
 *
 * Diagrama interativo e aula são páginas inteiras (zoom, caminhos, player com perguntas): espremidos
 * dentro da resposta ficavam estranhos. Agora o chat mostra só um CARTÃO ("Abrir") e o documento
 * abre nas abas de "Documentos" da sala — a da Pesquisa (barra do topo) ou a da Sala de Estudos
 * (linha de documentos acima da conversa). Conversa e documento seguem eixos separados.
 */
export const EVT_ABRIR_DOC = "zaeon:doc:abrir";
/** Kinds do Studio que viram documento em aba. */
export const KINDS_EM_ABA = new Set(["diagram", "aula", "caderno", "forja"]);

export type DocArtefato = {
  sala: "estudos" | "pesquisa";
  studioKind: string;
  artifactId: string;
  titulo: string;
  /** dados que já vieram no polling (a aula traz o roteiro) — evita buscar de novo */
  data?: any;
  /** true = além de abrir a aba, mostra ela agora (pedido explícito, clique no cartão) */
  focar?: boolean;
  /** a conversa de onde o documento saiu (a aba entra SÓ nela); ausente = a conversa na tela */
  scopeId?: string;
  /** auto-abertura (desbloqueio de card: forja/caderno) — NÃO nasceu de uma conversa, então entra na aba ATIVA
   *  de agora e foca, ignorando o scopeId capturado cedo no mount (que pode ter virado uma aba fantasma pós-sync). */
  autoAbrir?: boolean;
};

export const ROTULO_DOC: Record<string, { emoji: string; nome: string }> = {
  diagram: { emoji: "🧭", nome: "Diagrama" },
  aula: { emoji: "🎓", nome: "Aula" },
  caderno: { emoji: "📓", nome: "Caderno" },
  forja: { emoji: "🛠️", nome: "Repositório" },   // estudo de repo (Forja): board n8n + temperatura
  pdf: { emoji: "📕", nome: "Livro" },   // livro achado pelo buscar_livro, aberto no leitor (data.file = LibraryFile)
};

export function abrirDocumento(d: DocArtefato): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<DocArtefato>(EVT_ABRIR_DOC, { detail: d }));
}

/**
 * Em qual aba o documento entra, e se ele deve ser focado AGORA. PURA (testável sem o componente).
 *  - auto-abertura (card de forja/caderno): entra na aba ATIVA de agora e foca — ignora o scopeId capturado
 *    cedo no mount, que a sincronização de conversas pode ter deixado para trás (aba fantasma → board some).
 *  - caso normal: a conversa de origem (scopeId), e só foca se ela ainda é a que está na tela (não rouba a
 *    tela de uma conversa para a qual a pessoa trocou durante a geração).
 */
export function destinoDoDoc(d: DocArtefato, abaAtiva: string | null): { aba: string | null; foca: boolean } {
  const aba = d.autoAbrir ? abaAtiva : (d.scopeId ?? abaAtiva);
  const foca = !!d.focar && !!aba && (!!d.autoAbrir || aba === abaAtiva);
  return { aba, foca };
}
