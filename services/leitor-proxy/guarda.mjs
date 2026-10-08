/**
 * services/leitor-proxy/guarda.mjs — as regras PURAS do Leitor (Fatia 7, G6). Zero dependência.
 * Importável pelo vitest (lib/leitor/guarda.test.ts). O servidor (server.mjs) só orquestra.
 *
 *  - urlPermitida: só http/https, porta 80/443/implícita, host na allowlist (vazia = nega tudo),
 *    host nunca IP literal, sem usuário/senha na URL.
 *  - ipBloqueado: privados, loopback, link-local (169.254 = METADATA da nuvem), CGNAT, ULA, mapeados.
 *  - extrairTexto: HTML → texto (sem script/style/noscript/comentários/tags), entidades básicas.
 */
import net from "node:net";

/** "a.gov.br, *.edu.br" → ["a.gov.br", "*.edu.br"] (minúsculo, sem vazios). */
export function parseAllow(s) {
  return String(s ?? "").split(",").map((x) => x.trim().toLowerCase()).filter(Boolean);
}

/** host casa a allowlist? `*.dominio` casa o próprio domínio e qualquer subdomínio. */
export function hostNaLista(host, allow) {
  const h = String(host ?? "").toLowerCase().replace(/\.$/, "");
  if (!h) return false;
  return allow.some((padrao) => {
    if (padrao.startsWith("*.")) { const base = padrao.slice(2); return h === base || h.endsWith("." + base); }
    return h === padrao;
  });
}

/** → { ok: true, url: URL } | { ok: false, erro, status } */
export function urlPermitida(entrada, allow) {
  let u;
  try { u = new URL(String(entrada ?? "").trim()); } catch { return { ok: false, erro: "url_invalida", status: 400 }; }
  if (u.protocol !== "http:" && u.protocol !== "https:") return { ok: false, erro: "esquema_proibido", status: 400 };
  if (u.username || u.password) return { ok: false, erro: "credencial_na_url", status: 400 };
  if (u.port && u.port !== "80" && u.port !== "443") return { ok: false, erro: "porta_proibida", status: 400 };
  const host = u.hostname.replace(/^\[|\]$/g, "");
  if (net.isIP(host)) return { ok: false, erro: "ip_literal", status: 400 };
  if (!allow.length || !hostNaLista(host, allow)) return { ok: false, erro: "dominio_fora_da_lista", status: 403 };
  u.hash = "";
  return { ok: true, url: u };
}

function v4ParaInt(ip) {
  const p = ip.split(".").map(Number);
  if (p.length !== 4 || p.some((x) => !Number.isInteger(x) || x < 0 || x > 255)) return null;
  return ((p[0] << 24) >>> 0) + (p[1] << 16) + (p[2] << 8) + p[3];
}
const V4_BLOQ = [
  ["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10], ["127.0.0.0", 8], ["169.254.0.0", 16],
  ["172.16.0.0", 12], ["192.0.0.0", 24], ["192.0.2.0", 24], ["192.168.0.0", 16], ["198.18.0.0", 15],
  ["198.51.100.0", 24], ["203.0.113.0", 24], ["224.0.0.0", 4], ["240.0.0.0", 4],
].map(([base, bits]) => [v4ParaInt(base), bits]);

function v4Bloqueado(ip) {
  const n = v4ParaInt(ip);
  if (n == null) return true;
  return V4_BLOQ.some(([base, bits]) => (bits === 0 ? true : (n >>> (32 - bits)) === (base >>> (32 - bits))));
}

/** Expande IPv6 para 8 grupos de 16 bits (aceita "::" e sufixo IPv4). */
function v6Grupos(ip) {
  let s = ip.toLowerCase().split("%")[0];
  let v4 = null;
  const m = /(\d+\.\d+\.\d+\.\d+)$/.exec(s);
  if (m) { v4 = m[1]; const n = v4ParaInt(v4); if (n == null) return null; s = s.slice(0, -v4.length) + ((n >>> 16).toString(16)) + ":" + ((n & 0xffff).toString(16)); }
  const [esq, dir] = s.split("::");
  if (s.split("::").length > 2) return null;
  const a = esq ? esq.split(":") : [];
  const b = dir != null ? (dir ? dir.split(":") : []) : null;
  const grupos = b == null ? a : [...a, ...Array(8 - a.length - b.length).fill("0"), ...b];
  if (grupos.length !== 8) return null;
  const nums = grupos.map((g) => parseInt(g || "0", 16));
  return nums.some((x) => !Number.isInteger(x) || x < 0 || x > 0xffff) ? null : nums;
}

/** true = NÃO conectar. Em dúvida (não parseia), bloqueia. */
export function ipBloqueado(ip) {
  const s = String(ip ?? "").trim().replace(/^\[|\]$/g, "");
  const tipo = net.isIP(s);
  if (tipo === 4) return v4Bloqueado(s);
  if (tipo !== 6) return true;
  const g = v6Grupos(s);
  if (!g) return true;
  const todosZero = (arr) => arr.every((x) => x === 0);
  if (todosZero(g)) return true;                                        // ::
  if (todosZero(g.slice(0, 7)) && g[7] === 1) return true;              // ::1
  if (todosZero(g.slice(0, 5)) && g[5] === 0xffff) return v4Bloqueado(`${g[6] >> 8}.${g[6] & 255}.${g[7] >> 8}.${g[7] & 255}`); // ::ffff:v4
  if (todosZero(g.slice(0, 6))) return true;                            // ::v4 (compat, obsoleto)
  if (g[0] === 0x64 && g[1] === 0xff9b && todosZero(g.slice(2, 6))) return true; // 64:ff9b::/96 (NAT64)
  if ((g[0] & 0xfe00) === 0xfc00) return true;                          // fc00::/7 (ULA)
  if ((g[0] & 0xffc0) === 0xfe80) return true;                          // fe80::/10 (link-local)
  if ((g[0] & 0xff00) === 0xff00) return true;                          // ff00::/8 (multicast)
  if (g[0] === 0x2001 && g[1] === 0x0db8) return true;                  // documentação
  return false;
}

export function mesmoHost(a, b) {
  try { return new URL(a).hostname.toLowerCase() === new URL(b).hostname.toLowerCase(); } catch { return false; }
}

const ENTIDADES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", ndash: "–", mdash: "—", hellip: "…", laquo: "«", raquo: "»", ccedil: "ç", atilde: "ã", otilde: "õ", aacute: "á", eacute: "é", iacute: "í", oacute: "ó", uacute: "ú", acirc: "â", ecirc: "ê", ocirc: "ô", agrave: "à", middot: "·", bull: "•", copy: "©", reg: "®", trade: "™", lsquo: "‘", rsquo: "’", ldquo: "“", rdquo: "”", deg: "°", ordm: "º", ordf: "ª", euro: "€", uuml: "ü", Aacute: "Á", Eacute: "É", Oacute: "Ó", Ccedil: "Ç", Atilde: "Ã" };
function decodificar(s) {
  return s
    .replace(/&#(\d+);/g, (_, n) => { const c = Number(n); return c > 0 && c < 0x110000 ? String.fromCodePoint(c) : ""; })
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => { const c = parseInt(h, 16); return c > 0 && c < 0x110000 ? String.fromCodePoint(c) : ""; })
    .replace(/&([a-z]+);/gi, (m, n) => ENTIDADES[n] ?? ENTIDADES[n.toLowerCase()] ?? m);
}

/** HTML/XML → texto legível. Blocos viram quebra de linha; o resto, espaço. */
export function extrairTexto(html) {
  let t = String(html ?? "");
  t = t.replace(/<!--[\s\S]*?-->/g, " ");
  t = t.replace(/<(script|style|noscript|template|svg|iframe|object)\b[\s\S]*?<\/\1\s*>/gi, " ");
  t = t.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1");
  t = t.replace(/<\/?(p|div|br|li|ul|ol|h[1-6]|tr|table|section|article|header|footer|item|entry|title)\b[^>]*>/gi, "\n");
  t = t.replace(/<[^>]+>/g, " ");
  t = decodificar(t);
  return t.split("\n").map((l) => l.replace(/[ \t\f\v\r]+/g, " ").trim()).filter(Boolean).join("\n");
}

/** Content-Types que o Leitor aceita. */
export const TIPOS_ACEITOS = ["text/html", "text/plain", "application/json", "application/xml", "text/xml", "application/rss+xml", "application/atom+xml", "application/xhtml+xml"];
export function tipoAceito(contentType) {
  const base = String(contentType ?? "").split(";")[0].trim().toLowerCase();
  return TIPOS_ACEITOS.includes(base) ? base : null;
}
