import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  ALLOW_HOSTS, ENGINES, resolverEngine, hostPermitido,
  argSeguro, argsSeguros, montarComando, caminhoSaida, FLAGS_PERIGOSAS,
} from "./vetting.mjs";

const AQUI = dirname(fileURLToPath(import.meta.url));

test("o catálogo é FECHADO: só graphify e understand", () => {
  assert.deepEqual(Object.keys(ENGINES).sort(), ["graphify", "understand"]);
  assert.throws(() => resolverEngine("rm"), /engine desconhecido/);
  assert.throws(() => resolverEngine("graphify; rm -rf"), /engine desconhecido/);
  assert.equal(resolverEngine("graphify").repo, "Graphify-Labs/graphify");
});

test("hostPermitido: só https, host na allowlist, sem credencial embutida", () => {
  assert.equal(hostPermitido("https://github.com/a/b").ok, true);
  assert.equal(hostPermitido("https://gitlab.com/a/b").ok, true);
  assert.equal(hostPermitido("http://github.com/a/b").erro, "só https");
  assert.equal(hostPermitido("https://evil.example.com/a/b").ok, false);
  assert.equal(hostPermitido("https://user:pass@github.com/a/b").erro, "url não pode trazer credencial");
  assert.equal(hostPermitido("não é url").ok, false);
  // todo host da allowlist é aceito
  for (const h of ALLOW_HOSTS) assert.equal(hostPermitido(`https://${h}/x/y`).ok, true, h);
});

test("argSeguro: nega metacaractere de shell, caminho absoluto, travessia e flag perigosa", () => {
  assert.ok(argSeguro("--language"));
  assert.ok(argSeguro("zh"));
  assert.ok(argSeguro("src/frontend"));
  assert.ok(!argSeguro("; rm -rf /"));
  assert.ok(!argSeguro("$(whoami)"));
  assert.ok(!argSeguro("a|b"));
  assert.ok(!argSeguro("/etc/passwd"));
  assert.ok(!argSeguro("../../etc"));
  assert.ok(!argSeguro("--exec=sh"));
  assert.ok(!argSeguro("-e"));
  assert.ok(!argSeguro("--config=/tmp/x"));
  assert.ok(!argSeguro("x".repeat(300))); // tamanho absurdo
  // toda flag perigosa é recusada, inclusive com =valor
  for (const f of FLAGS_PERIGOSAS) assert.ok(!argSeguro(`${f}=qualquer`), f);
});

test("argsSeguros filtra o perigoso e mantém o resto, em ordem", () => {
  assert.deepEqual(argsSeguros(["--language", "zh", "; rm", "src"]), ["--language", "zh", "src"]);
  assert.deepEqual(argsSeguros(undefined), []);
  assert.deepEqual(argsSeguros("não-array"), []);
});

test("montarComando: graphify usa `update <repo> --force` e só args seguros", () => {
  const { bin, argv } = montarComando("graphify", "/job/repo", ["--no-color", "; evil", "$(x)"]);
  assert.equal(bin, "graphify");
  assert.deepEqual(argv, ["update", "/job/repo", "--force", "--no-color"]);
});

test("montarComando: understand usa o wrapper e não vaza args perigosos", () => {
  const { bin, argv } = montarComando("understand", "/job/repo", ["--language", "zh", "`id`"]);
  assert.equal(bin, "__wrapper__"); // a ponte troca por FORJA_UNDERSTAND_CMD
  assert.deepEqual(argv, ["/job/repo", "--language", "zh"]);
});

test("caminhoSaida: graphify e understand escrevem relativo ao repo", () => {
  const g = caminhoSaida("graphify", { cwd: "/job", repoDir: "/job/repo" });
  assert.deepEqual(g, { base: "/job/repo", rel: "graphify-out/graph.json" });
  const u = caminhoSaida("understand", { cwd: "/job", repoDir: "/job/repo" });
  assert.deepEqual(u, { base: "/job/repo", rel: ".ua/knowledge-graph.json" });
});

test("a ponte usa o MESMO catálogo/funções puras (sem deny-list duplicada)", () => {
  const bridge = readFileSync(join(AQUI, "bridge.mjs"), "utf8");
  // a ponte importa de vetting.mjs em vez de reimplementar a allowlist/host-check
  assert.ok(/from "\.\/vetting\.mjs"/.test(bridge), "bridge importa vetting.mjs");
  assert.ok(/resolverEngine/.test(bridge) && /hostPermitido/.test(bridge) && /montarComando/.test(bridge));
});

test("o config vetado casa com o catálogo real do código (licença e saída)", () => {
  const cfg = JSON.parse(readFileSync(join(AQUI, "config", "vetting.json"), "utf8"));
  for (const [nome, e] of Object.entries(ENGINES)) {
    const c = cfg.engines[nome];
    assert.ok(c, `config descreve o engine ${nome}`);
    assert.equal(c.saida, e.saida, `saída de ${nome} casa`);
    assert.equal(c.licenca, e.licenca, `licença de ${nome} casa`);
    assert.equal(c.repo, e.repo, `repo de ${nome} casa`);
  }
});
