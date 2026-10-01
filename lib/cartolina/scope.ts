/** scopeId vem do cliente: só id curto e sem espaço. PURO (usado por rota, harness e worker). */
export function sanitizeScopeId(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  return /^[\w:.-]{1,128}$/.test(s) ? s : null;
}
