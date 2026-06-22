/**
 * Menu "/" do caderno (editor B1.3): opções + filtro PUROS (testável).
 * Estrutura transforma o bloco atual; "studio" gera e encaixa um módulo no cursor.
 */
export type SlashKind = "struct" | "studio";

export interface SlashOption {
  key: string; // h1|h2|text (estrutura) ou guide|mindmap|… (studio)
  label: string;
  emoji: string;
  kind: SlashKind;
}

export const SLASH_OPTIONS: SlashOption[] = [
  { key: "h1", label: "Título", emoji: "🔠", kind: "struct" },
  { key: "h2", label: "Subtítulo", emoji: "🔡", kind: "struct" },
  { key: "text", label: "Texto", emoji: "📝", kind: "struct" },
  { key: "guide", label: "Guia", emoji: "📘", kind: "studio" },
  { key: "mindmap", label: "Mapa mental", emoji: "🧠", kind: "studio" },
  { key: "timeline", label: "Linha do tempo", emoji: "🕒", kind: "studio" },
  { key: "flashcards", label: "Flashcards", emoji: "🃏", kind: "studio" },
  { key: "faq", label: "FAQ", emoji: "❓", kind: "studio" },
  { key: "podcast", label: "Podcast", emoji: "🎙️", kind: "studio" },
  { key: "image", label: "Imagem", emoji: "🖼️", kind: "studio" },
  { key: "video", label: "Vídeo", emoji: "🎬", kind: "studio" },
];

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Filtra as opções pelo texto digitado após a "/" (sem acento, case-insensitive). */
export function filterSlash(query: string): SlashOption[] {
  const q = norm((query || "").trim());
  if (!q) return SLASH_OPTIONS;
  return SLASH_OPTIONS.filter((o) => norm(o.label).includes(q) || o.key.includes(q));
}
