/**
 * infra/rea-engine/politica.mjs — o que uma SESSÃO do REA (o `rea mcp`, ~255 ferramentas) pode chamar pela ponte.
 *
 * Três níveis:
 *  - "estatica": leitura/análise de artefatos e da própria sessão (open_binary, search_strings, analyze_javascript_
 *    application, recover_javascript_sources, inspect_analysis_view…). Livre — os CAMINHOS ficam presos na pasta da
 *    sessão e nos artefatos enviados (`handle://<32hex>`).
 *  - "web": runtime de página (inspect_web_page, observe_web_session, capture_browser_scenario…). SÓ com domínio
 *    declarado sob o Termo de Uso (lib/rea/termo.ts, gravado no app): com o aceite, essas ferramentas ficam liberadas
 *    para aquele domínio, como no REA local. O navegador é SEMPRE o da sessão (atrás do proxy de saída): o
 *    `cdp_endpoint` é reescrito, `allowed_origins` fica dentro dos domínios declarados e a URL inicial também.
 *  - "negada": mexe no HOST ou em device (adb, frida, gdb/rizin, cutter, jeb, computador de build, processos/UI
 *    nativos, Electron/Node locais). Nenhum termo libera — é a máquina da Zaeon, não o alvo da pessoa.
 *
 * As anotações do próprio REA (readOnlyHint/destructiveHint) são grossas demais pra isso (open_binary sai como
 * "destrutiva" porque muda a sessão), então a régua é por família, conferida contra o catálogo real nos testes.
 */
import { isIP } from "node:net";

const NEGADAS = [
  /adb/, /frida/, /gdb/, /rizin/, /cutter/, /jeb/,
  /build_computer/, /build_capture/, /build_task/, /build_environment/, /build_consent/, /build_checkpoint/,
  /^capture_process_scenario$/, /^capture_native_ui_scenario$/, /^observe_native_ui$/, /^trace_native_ui_action$/, /^observe_native_calls$/,
  /^capture_electron_scenario$/, /^list_electron_targets$/, /^inspect_electron_page$/,
  /^list_javascript_runtime_targets$/, /^observe_javascript_runtime$/,
  /^load_frida_script$/, /^instrument_with_frida$/, /^execute_rizin_command$/, /^cutter_command$/,
];
export const FERRAMENTAS_WEB = new Set([
  "list_browser_targets", "inspect_web_page", "analyze_web_bundle", "observe_web_session", "observe_web_execution",
  "discover_webmcp_tools", "capture_web_screenshot", "inspect_web_event_listeners", "trace_web_module_imports",
  "trace_web_source_location", "capture_browser_scenario",
]);

/** "estatica" | "web" | "negada" */
export function classificar(nome) {
  const n = String(nome || "");
  if (!/^[a-z][a-z0-9_]{1,60}$/.test(n)) return "negada";
  if (NEGADAS.some((r) => r.test(n))) return "negada";
  if (FERRAMENTAS_WEB.has(n)) return "web";
  return "estatica";
}

// ─── domínios ────────────────────────────────────────────────────────────────────────────────────────────────────
/** o domínio como o Termo grava: host em minúsculas, sem www., sem porta; nada de IP, localhost ou nome interno. */
export function normalizarDominio(bruto) {
  let s = String(bruto || "").trim().toLowerCase();
  if (!s) throw new Error("dominio_vazio");
  if (!/^[a-z]+:\/\//.test(s)) s = "https://" + s;
  let u; try { u = new URL(s); } catch { throw new Error("dominio_invalido"); }
  const host = u.hostname.replace(/^www\./, "").replace(/\.$/, "");
  if (isIP(host.replace(/^\[|\]$/g, ""))) throw new Error("dominio_ip");
  if (!/^(?=.{4,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(host)) throw new Error("dominio_invalido");
  if (/\.(local|localhost|internal|lan|home|corp|ts\.net|test|example|invalid)$/.test(host)) throw new Error("dominio_interno");
  return host;
}

/** a URL/origem cai dentro de algum domínio declarado (o próprio ou um subdomínio)? Só http(s). */
export function dentroDosDominios(urlOuOrigem, dominios) {
  let u; try { u = new URL(String(urlOuOrigem)); } catch { return false; }
  if (u.protocol !== "https:" && u.protocol !== "http:") return false;
  if (u.username || u.password) return false;
  const host = u.hostname.toLowerCase().replace(/\.$/, "");
  return dominios.some((d) => host === d || host.endsWith("." + d));
}

// ─── caminhos ────────────────────────────────────────────────────────────────────────────────────────────────────
const CHAVE_DE_CAMINHO = /(^|_)(path|paths|directory|dir|file|files|output|snapshot|evidence_output)$|^(path|capture_path|output_directory|snapshot_path|additional_paths|source_paths_json)$/;
const HANDLE = /^handle:\/\/([0-9a-f]{32})(\/[A-Za-z0-9._-]+)?$/;

/**
 * Prende todo argumento de CAMINHO na pasta da sessão ou num artefato enviado. `handle://<h>` vira o caminho do
 * artefato (o 1º arquivo do handle, ou `handle://<h>/<nome>`). Relativo = dentro da sessão. Qualquer outro absoluto,
 * `..`, `~` ou NUL → erro. `resolverHandle(h, nome?)` devolve o caminho real (ou null).
 */
export function prenderCaminhos(args, { raiz, resolverHandle }) {
  const fora = (p) => { throw new Error(`caminho_fora_da_sessao: ${String(p).slice(0, 120)}`); };
  const um = (v) => {
    if (typeof v !== "string") return v;
    if (v.includes("\0") || v.startsWith("~")) fora(v);
    const h = v.match(HANDLE);
    if (h) { const real = resolverHandle(h[1], h[2]?.slice(1)); if (!real) throw new Error("handle_inexistente"); return real; }
    if (v.split(/[\\/]/).includes("..")) fora(v);
    if (!v.startsWith("/")) return `${raiz}/${v.replace(/^\.\//, "")}`;
    if (v === raiz || v.startsWith(raiz + "/")) return v;
    return fora(v);
  };
  const andar = (x, chaveDeCaminho) => {
    if (Array.isArray(x)) return x.map((y) => andar(y, chaveDeCaminho));
    if (x && typeof x === "object") return Object.fromEntries(Object.entries(x).map(([k, y]) => [k, andar(y, CHAVE_DE_CAMINHO.test(k))]));
    return chaveDeCaminho ? um(x) : x;
  };
  return andar(args ?? {}, false);
}

// ─── web ─────────────────────────────────────────────────────────────────────────────────────────────────────────
/**
 * Reescreve os argumentos de uma ferramenta "web" para o navegador DA SESSÃO e os domínios declarados:
 *  - `cdp_endpoint` (e `browser` do capture_browser_scenario) → o CDP da sessão, sempre `connect` (nunca `launch`:
 *    um navegador lançado pelo REA sairia sem o proxy de saída);
 *  - `allowed_origins` → só origens dentro dos domínios (vazio = as origens https dos domínios);
 *  - `start_url.url` / `url` → precisa estar dentro dos domínios.
 */
export function reescreverWeb(nome, args, { cdp, dominios, props = null, origensAbertas = [] }) {
  if (!dominios.length) throw new Error("dominio_nao_declarado");
  const aceita = (k) => !props || props.has(k);
  const a = { ...(args ?? {}) };
  // origens padrão: as páginas que a sessão abriu (app.x.com) + a raiz https de cada domínio
  const origens = [...new Set([...origensAbertas.filter((o) => dentroDosDominios(o, dominios)), ...dominios.map((d) => `https://${d}`)])];
  if (nome === "capture_browser_scenario") {
    const alvo = a.browser?.target_id;
    if (!alvo) throw new Error("capture_browser_scenario: informe browser.target_id (use zaeon_abrir_pagina)");
    a.browser = { mode: "connect", cdp_endpoint: cdp, target_id: String(alvo) };
    const url = a.start_url?.url;
    if (!url || !dentroDosDominios(url, dominios)) throw new Error("start_url fora dos domínios declarados");
  } else if (aceita("cdp_endpoint")) {
    a.cdp_endpoint = cdp;
  }
  if (Array.isArray(a.allowed_origins) && a.allowed_origins.length) {
    const ok = a.allowed_origins.filter((o) => dentroDosDominios(o, dominios));
    if (!ok.length) throw new Error("allowed_origins fora dos domínios declarados");
    a.allowed_origins = ok;
  } else if (nome !== "capture_browser_scenario" && aceita("allowed_origins")) {
    a.allowed_origins = origens;
  }
  if (typeof a.url === "string" && !dentroDosDominios(a.url, dominios)) throw new Error("url fora dos domínios declarados");
  return a;
}
