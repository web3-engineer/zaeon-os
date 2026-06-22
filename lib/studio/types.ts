/**
 * Tipos compartilhados do ZAEON Studio — as "formas mastigadas" geradas a partir
 * de cada estudo (podcast, vídeo, mapa mental, linha do tempo, guia, FAQ,
 * flashcards, imagem, trilha, narração). Cada uma vira um `StudioArtifact`
 * (ver prisma/schema.prisma → model StudioArtifact).
 */

export type StudioKind =
  | "podcast"
  | "video"
  | "mindmap"
  | "timeline"
  | "guide"
  | "faq"
  | "flashcards"
  | "image"
  | "soundtrack"
  | "narration";

export type StudioStatus = "queued" | "running" | "done" | "error";

export const STUDIO_KINDS: StudioKind[] = [
  "podcast",
  "video",
  "mindmap",
  "timeline",
  "guide",
  "faq",
  "flashcards",
  "image",
  "soundtrack",
  "narration",
];

export const STUDIO_STATUSES: StudioStatus[] = ["queued", "running", "done", "error"];

export function isStudioKind(v: unknown): v is StudioKind {
  return typeof v === "string" && (STUDIO_KINDS as string[]).includes(v);
}

export function isStudioStatus(v: unknown): v is StudioStatus {
  return typeof v === "string" && (STUDIO_STATUSES as string[]).includes(v);
}

/** Artefatos que guardam um arquivo binário em .studio/<id>.<ext> (vs. só JSON em `meta`). */
export const BINARY_KINDS: StudioKind[] = ["podcast", "video", "image", "soundtrack", "narration"];

export function isBinaryKind(kind: StudioKind): boolean {
  return BINARY_KINDS.includes(kind);
}
