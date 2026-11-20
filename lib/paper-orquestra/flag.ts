/** A flag do PaperOrchestra (docs/PAPER_ORQUESTRA.md). Módulo próprio pra quem só precisa da flag não puxar o pipeline. */
export function paperOrquestraLigada(env: Record<string, string | undefined> = process.env): boolean {
  const v = String(env.PAPER_ORQUESTRA ?? "").trim().toLowerCase();
  return v === "1" || v === "on" || v === "true";
}
