/**
 * lib/ui/versaoNova.ts — #756: a aba aberta ficou com a versão VELHA do site depois de um deploy. PURO.
 *
 * Dois sintomas nos testes do #749:
 *  - "Application error: a client-side exception" ao navegar: o pedaço de código (chunk) que a página velha pede não
 *    existe mais no servidor → ChunkLoadError. Aqui a página recarrega sozinha (uma vez por minuto, no máximo, para
 *    nunca entrar em laço se o erro for outro);
 *  - a página não quebra, mas roda o código velho (o gráfico de barras saía "gráfico sem funções"). Aqui o commit do ar
 *    (/api/versao) mudou desde que a aba abriu → aviso "Tem uma versão nova da Zaeon".
 */

/** o erro é de pedaço do site que sumiu (deploy novo)? Chrome/Edge/Firefox/Safari escrevem diferente. */
export function ehErroDeChunk(e: unknown): boolean {
  const o = e as { name?: unknown; message?: unknown } | null | undefined;
  const nome = typeof o?.name === "string" ? o.name : "";
  const msg = typeof e === "string" ? e : typeof o?.message === "string" ? o.message : "";
  if (nome === "ChunkLoadError") return true;
  return /Loading (CSS )?chunk [\w-]+ failed|Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed/i.test(msg);
}

/** recarregar de novo só depois de 60 s do último recarregamento automático (sem laço). */
export const INTERVALO_RECARGA_MS = 60_000;
export function podeRecarregar(agora: number, ultima: number | null): boolean {
  return ultima === null || !Number.isFinite(ultima) || agora - ultima >= INTERVALO_RECARGA_MS;
}

/** o commit do ar mudou desde que a aba abriu? "unknown"/vazio (dev, sem GIT_SHA) nunca avisa. */
export function versaoMudou(daAba: string | null, doAr: string | null): boolean {
  const ok = (c: string | null): c is string => !!c && c !== "unknown";
  return ok(daAba) && ok(doAr) && daAba !== doAr;
}
