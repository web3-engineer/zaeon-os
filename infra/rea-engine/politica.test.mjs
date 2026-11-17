import { test } from "node:test";
import assert from "node:assert/strict";
import { classificar, normalizarDominio, dentroDosDominios, prenderCaminhos, reescreverWeb } from "./politica.mjs";

test("níveis: estático livre, web pede domínio, host/device negado", () => {
  for (const n of ["open_binary", "search_strings", "inspect_analysis_view", "analyze_javascript_application", "recover_javascript_sources",
    "export_web_scripts", "trace_javascript_semantics", "trace_application_feature", "inspect_artifact", "decompile_all", "binary_session"]) assert.equal(classificar(n), "estatica", n);
  for (const n of ["inspect_web_page", "observe_web_session", "capture_browser_scenario", "analyze_web_bundle", "list_browser_targets", "trace_web_module_imports"]) assert.equal(classificar(n), "web", n);
  for (const n of ["start_frida_session", "install_adb_package", "list_adb_devices", "gdb_console", "start_rizin_debug_session", "execute_rizin_command", "cutter_command",
    "open_jeb_project", "start_build_computer", "act_on_build_computer", "capture_process_scenario", "capture_native_ui_scenario", "observe_native_calls",
    "capture_electron_scenario", "observe_javascript_runtime", "list_javascript_runtime_targets", "Nome-Invalido", ""]) assert.equal(classificar(n), "negada", n);
});

test("domínio: normaliza e recusa IP/interno", () => {
  assert.equal(normalizarDominio("https://www.LeonaFlow.com/pt-BR/"), "leonaflow.com");
  assert.equal(normalizarDominio("app.leonasolutions.io"), "app.leonasolutions.io");
  for (const d of ["127.0.0.1", "http://[::1]/", "intranet", "x.local", "vmi.tail08b6ee.ts.net", "", "a.test"]) assert.throws(() => normalizarDominio(d), undefined, d);
  assert.ok(dentroDosDominios("https://app.leonasolutions.io/login", ["leonasolutions.io"]));
  assert.ok(!dentroDosDominios("https://leonasolutions.io.evil.com/", ["leonasolutions.io"]));
  assert.ok(!dentroDosDominios("https://evilleonasolutions.io/", ["leonasolutions.io"]));
  assert.ok(!dentroDosDominios("file:///etc/passwd", ["leonasolutions.io"]));
});

test("caminhos: presos na sessão; handle:// vira o artefato; o resto é recusado", () => {
  const raiz = "/tmp/rea-sessao-x";
  const resolverHandle = (h, nome) => (nome ? `/work/cache/${h}/${nome}` : { base: `/work/cache/${h}` });
  const h = "a".repeat(32);
  const r = prenderCaminhos({ path: `handle://${h}/app.js`, output_directory: "recuperado", query: "/rest/v1/fluxos", nested: [{ capture_path: `${raiz}/cap.json` }] }, { raiz, resolverHandle });
  assert.equal(r.path, `/work/cache/${h}/app.js`);
  assert.equal(r.output_directory, `${raiz}/recuperado`);
  assert.equal(r.query, "/rest/v1/fluxos");                     // não é chave de caminho: fica como está
  assert.equal(r.nested[0].capture_path, `${raiz}/cap.json`);
  assert.deepEqual(prenderCaminhos({ path: `handle://${h}` }, { raiz, resolverHandle }).path, { base: `/work/cache/${h}` });
  for (const ruim of ["/proc/1/environ", "/app/bridge.mjs", `${raiz}/../x`, "../x", "~/x", "/work/cache/" + h + "/a", `${raiz}-outra/x`])
    assert.throws(() => prenderCaminhos({ path: ruim }, { raiz, resolverHandle }), /caminho_fora/, ruim);
  assert.throws(() => prenderCaminhos({ snapshot_path: "/etc/shadow" }, { raiz, resolverHandle }), /caminho_fora/);
});

test("web: sempre o navegador da sessão, só nos domínios declarados", () => {
  const ctx = { cdp: "http://127.0.0.1:4444", dominios: ["leonasolutions.io"], props: new Set(["cdp_endpoint", "target_id", "allowed_origins"]), origensAbertas: ["https://app.leonasolutions.io"] };
  const a = reescreverWeb("inspect_web_page", { cdp_endpoint: "http://127.0.0.1:9999", target_id: "T" }, ctx);
  assert.equal(a.cdp_endpoint, ctx.cdp);
  assert.deepEqual(a.allowed_origins, ["https://app.leonasolutions.io", "https://leonasolutions.io"]);
  assert.throws(() => reescreverWeb("inspect_web_page", { target_id: "T", allowed_origins: ["https://evil.com"] }, ctx), /fora dos domínios/);
  const c = reescreverWeb("capture_browser_scenario", { browser: { mode: "launch", executable_path: "/x", target_id: "T" }, start_url: { url: "https://app.leonasolutions.io/" }, actions: [] }, ctx);
  assert.deepEqual(c.browser, { mode: "connect", cdp_endpoint: ctx.cdp, target_id: "T" });
  assert.throws(() => reescreverWeb("capture_browser_scenario", { browser: { target_id: "T" }, start_url: { url: "https://evil.com/" } }, ctx), /fora dos domínios/);
  assert.throws(() => reescreverWeb("inspect_web_page", {}, { ...ctx, dominios: [] }), /dominio_nao_declarado/);
  // ferramenta sem allowed_origins no schema: não injeta
  assert.equal(reescreverWeb("list_browser_targets", {}, { ...ctx, props: new Set(["cdp_endpoint"]) }).allowed_origins, undefined);
});
