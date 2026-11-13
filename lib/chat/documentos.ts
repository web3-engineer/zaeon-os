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
export const KINDS_EM_ABA = new Set(["diagram", "aula", "caderno"]);

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
};

export const ROTULO_DOC: Record<string, { emoji: string; nome: string }> = {
  diagram: { emoji: "🧭", nome: "Diagrama" },
  aula: { emoji: "🎓", nome: "Aula" },
  caderno: { emoji: "📓", nome: "Caderno" },
  pdf: { emoji: "📕", nome: "Livro" },   // livro achado pelo buscar_livro, aberto no leitor (data.file = LibraryFile)
};

export function abrirDocumento(d: DocArtefato): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<DocArtefato>(EVT_ABRIR_DOC, { detail: d }));
}
