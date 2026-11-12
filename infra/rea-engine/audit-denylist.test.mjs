import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { auditar, catalogoDoHelp, extrairLista, parecePerigoso, permitido } from "./audit-denylist.mjs";

const AQUI = dirname(fileURLToPath(import.meta.url));

test("extrai a deny-list REAL do bridge.mjs", () => {
  const bridge = readFileSync(join(AQUI, "bridge.mjs"), "utf8");
  const prefixos = extrairLista(bridge, "DENY_PREFIXOS");
  const exatos = extrairLista(bridge, "DENY_EXATOS");
  assert.ok(prefixos.includes("frida"), "frida deve estar na deny-list");
  assert.ok(prefixos.includes("capture-"));
  assert.ok(exatos.includes("setup"));
});

test("a deny-list do bridge e a do app (lib/octa/rea.ts) são idênticas", () => {
  const bridge = readFileSync(join(AQUI, "bridge.mjs"), "utf8");
  const app = readFileSync(join(AQUI, "..", "..", "lib", "octa", "rea.ts"), "utf8");
  assert.deepEqual(extrairLista(bridge, "DENY_PREFIXOS"), extrairLista(app, "DENY_REA_PREFIXOS"));
  assert.deepEqual(extrairLista(bridge, "DENY_EXATOS"), extrairLista(app, "DENY_REA_EXATOS"));
});

test("catalogoDoHelp parseia a saída de `rea --help` como o bridge", () => {
  const help = [
    "Commands:",
    "  analyze            analyze something",
    "  inspect-evm-interface   read EVM",
    "  frida-trace        dynamic instrumentation",
    "  not a command line",
  ].join("\n");
  const cat = catalogoDoHelp(help);
  assert.ok(cat.has("analyze"));
  assert.ok(cat.has("inspect-evm-interface"));
  assert.ok(cat.has("frida-trace"));
});

test("auditar: estáticos liberados, efeito colateral negado, e o ESCAPE é apontado", () => {
  const prefixos = ["frida", "capture-"]; // deny-list mínima: deixa "spawn-proc" ESCAPAR de propósito
  const exatos = ["setup"];
  const cat = new Set(["analyze", "inspect-evm-interface", "frida-trace", "capture-screen", "setup", "spawn-proc"]);
  const r = auditar(cat, prefixos, exatos);
  assert.equal(r.total, 6);
  assert.ok(r.liberados.includes("analyze"));
  assert.ok(r.liberados.includes("inspect-evm-interface"));
  assert.ok(r.negados.includes("frida-trace"));
  assert.ok(r.negados.includes("capture-screen"));
  assert.ok(r.negados.includes("setup"));
  // spawn-proc está LIBERADO (não casa prefixo) mas cheira a efeito colateral → vira suspeito
  assert.ok(r.liberados.includes("spawn-proc"));
  assert.ok(r.suspeitos.includes("spawn-proc"), "o escape tem de ser apontado");
});

test("com a deny-list REAL, os exemplos de efeito colateral do 6.9 não escapam", () => {
  const bridge = readFileSync(join(AQUI, "bridge.mjs"), "utf8");
  const prefixos = extrairLista(bridge, "DENY_PREFIXOS");
  const exatos = extrairLista(bridge, "DENY_EXATOS");
  for (const c of ["frida-trace", "spawn-process", "attach-process", "launch-browser", "extract-firmware", "environment-build"]) {
    assert.equal(permitido(c, prefixos, exatos), false, c);
  }
  // e os estáticos novos seguem liberados
  for (const c of ["inspect-evm-interface", "inspect-rust-binary", "inspect-wasm-artifact"]) {
    assert.equal(permitido(c, prefixos, exatos), true, c);
  }
});

test("parecePerigoso é a heurística ampla (falso positivo é aceitável)", () => {
  assert.ok(parecePerigoso("spawn-proc"));
  assert.ok(parecePerigoso("do-capture"));
  assert.ok(!parecePerigoso("inspect-sqlite-database"));
  assert.ok(!parecePerigoso("analyze"));
});

test("as famílias device/frida/runtime (família no meio do nome) agora são negadas", () => {
  const bridge = readFileSync(join(AQUI, "bridge.mjs"), "utf8");
  const prefixos = extrairLista(bridge, "DENY_PREFIXOS");
  const exatos = extrairLista(bridge, "DENY_EXATOS");
  for (const c of ["install-adb-package", "list-adb-devices", "list-frida-processes", "list-javascript-runtime-targets"]) {
    assert.equal(permitido(c, prefixos, exatos), false, c);
  }
});

test("os suspeitos REVISADOS (leitura estática de arquivo) não são mais apontados", async () => {
  const { REVISADOS_OK } = await import("./audit-denylist.mjs");
  // um catálogo com um revisado-ok (lê pcap) e um suspeito NOVO (spawn) → só o novo é apontado
  const cat = new Set(["analyze", "inspect-pcap-capture", "spawn-proc-novo"]);
  const r = auditar(cat, [], []); // sem deny, pra testar só o filtro de revisados
  assert.ok(REVISADOS_OK.has("inspect-pcap-capture"));
  assert.ok(!r.suspeitos.includes("inspect-pcap-capture"), "revisado-ok não é suspeito");
  assert.ok(r.suspeitos.includes("spawn-proc-novo"), "escapada nova ainda é apontada");
});
