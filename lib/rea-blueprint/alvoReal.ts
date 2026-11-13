/**
 * lib/rea-blueprint/alvoReal.ts — DECIDE se um pedido de engenharia reversa tem um ALVO REAL e ANALISÁVEL
 * (um site/URL público, ou um artefato anexado: APK, binário, bundle), e qual comando do motor do REA serve.
 *
 * Só isto (puro, client-safe, sem IO) separa "explica como o Shazam funciona" (fica no modo leve, didático)
 * de "faz a engenharia reversa DESTE site/APK" — que, com o motor ligado, dispara o executor real em paralelo.
 * A camada executora (executor.ts) é quem chama o motor; aqui é só a decisão + os guardas de alvo.
 */

/** um alvo que o motor do REA consegue analisar de verdade */
export type AlvoReal =
  | { tipo: "url"; url: string; comando: string }
  | { tipo: "artefato"; nome: string; comando: string };

/** acha a primeira URL http(s) no texto (o "site" que o aluno mandou analisar) */
export function extrairUrl(texto: string): string | null {
  const m = (texto || "").match(/\bhttps?:\/\/[^\s<>"')\]]+/i);
  if (!m) return null;
  return m[0].replace(/[.,;:!?)]+$/, ""); // tira pontuação colada no fim
}

const RESERVADOS_SUFIXO = [".local", ".localhost", ".internal", ".lan", ".home.arpa", ".intranet", ".corp"];

/** host claramente PRIVADO/interno (defesa em profundidade contra SSRF — o motor na Contabo é a autoridade final) */
export function hostPrivado(host: string): boolean {
  const h = (host || "").toLowerCase().replace(/\.$/, "");
  if (!h || h === "localhost") return true;
  if (RESERVADOS_SUFIXO.some((s) => h.endsWith(s))) return true;
  if (h === "0.0.0.0" || h === "::1" || h === "[::1]") return true;
  // IPv6 privado/link-local (fc00::/7, fe80::/10) — simplificado
  if (/^\[?f[cde]/i.test(h) && h.includes(":")) return true;
  // IPv4: faixas privadas/reservadas
  const ip = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ip) {
    const [a, b] = [Number(ip[1]), Number(ip[2])];
    if (a === 10 || a === 127 || a === 0) return true;
    if (a === 169 && b === 254) return true;           // link-local + metadata (169.254.169.254)
    if (a === 192 && b === 168) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a >= 224) return true;                           // multicast/reservado
  }
  return false;
}

/** URL pública e segura o suficiente pra pedir ao motor analisar (http/https, sem credencial embutida, host público) */
export function urlPublicaSegura(url: string): boolean {
  let u: URL;
  try { u = new URL(url); } catch { return false; }
  if (u.protocol !== "http:" && u.protocol !== "https:") return false;
  if (u.username || u.password) return false;
  if (hostPrivado(u.hostname)) return false;
  // porta: só padrão ou 80/443/8080/8443 (evita varrer portas internas incomuns)
  if (u.port && !["80", "443", "8080", "8443"].includes(u.port)) return false;
  return true;
}

/** extensão → comando do motor pra artefato anexado (APK, binário, bundle, …) */
export function comandoParaArtefato(nome: string): string {
  const n = (nome || "").toLowerCase();
  if (n.endsWith(".apk") || n.endsWith(".aab") || n.endsWith(".xapk")) return "inspect-android-package";
  if (n.endsWith(".ipa")) return "inspect-macho";
  if (n.endsWith(".wasm")) return "inspect-wasm-artifact";
  if (n.endsWith(".pcap") || n.endsWith(".pcapng")) return "inspect-packet-capture";
  if (n.endsWith(".sqlite") || n.endsWith(".db")) return "inspect-sqlite";
  if (n.endsWith(".js") || n.endsWith(".mjs") || n.endsWith(".js.map")) return "analyze-javascript-application";
  if (/\.(zip|jar|war|bundle)$/.test(n)) return "analyze-web-bundle";
  return "analyze"; // genérico: o motor detecta o formato
}

export type Anexo = { nome: string; bytes?: number };

/**
 * O pedido tem um alvo REAL pra o motor? (chamado só quando pedeEngenhariaReversa já é verdade.)
 *  - um artefato anexado (APK/binário/bundle) ganha prioridade — é o caso mais limpo (o aluno deu os bytes);
 *  - senão, uma URL pública e segura no texto vira alvo de site.
 * null = sem alvo analisável → fica no modo leve (explicação), como hoje.
 */
export function detectarAlvoReal(prompt: string, anexos: Anexo[] = []): AlvoReal | null {
  const art = anexos.find((a) => /\.(apk|aab|xapk|ipa|wasm|pcap|pcapng|sqlite|db|js|mjs|zip|jar|war|bundle)$/i.test(a.nome || ""));
  if (art) return { tipo: "artefato", nome: art.nome, comando: comandoParaArtefato(art.nome) };
  const url = extrairUrl(prompt);
  if (url && urlPublicaSegura(url)) return { tipo: "url", url, comando: "analyze-web-bundle" };
  return null;
}
