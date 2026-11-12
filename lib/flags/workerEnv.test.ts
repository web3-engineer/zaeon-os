import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * O WORKER RODA O TURNO DO CHAT (CHAT_BG=1 é o default do deploy). Toda variável que o código do
 * servidor lê e que o `web` recebe pelo compose tem de chegar também ao `worker` — ou o recurso
 * funciona no turno inline e some no turno em 2º plano, sem erro nenhum. Foi assim que o cartão do
 * REA e a busca na web "se perderam".
 */
const compose = readFileSync("docker-compose.beta.yml", "utf8");

function ambiente(svc: string): Map<string, string> {
  const i = compose.indexOf(`\n  ${svc}:\n`);
  expect(i, `serviço ${svc}`).toBeGreaterThan(-1);
  const resto = compose.slice(i + 1);
  const fim = resto.slice(1).search(/\n  [a-z][a-z0-9-]*:\n/);
  const bloco = fim < 0 ? resto : resto.slice(0, fim + 1);
  const linhas = bloco.slice(bloco.indexOf("    environment:")).split("\n").slice(1);
  const out = new Map<string, string>();
  for (const l of linhas) {
    if (/^    [a-z_]+:/.test(l)) break;
    const m = /^      ([A-Z0-9_]+):\s*(.*?)\s*(?:#.*)?$/.exec(l);
    if (m) out.set(m[1], m[2].trim());
  }
  return out;
}

/** Só do `web`, de propósito — cada uma com o motivo. */
const SO_NO_WEB: Record<string, string> = {
  VOICE_ENGINE_URL: "proxy de voz: é rota HTTP do web, o turno não chama",
  CHAT_BG: "decide QUEM roda o turno; o worker só consome a fila",
  CEREBRO_BG: "liga o produtor da fila do cérebro, que é o web",
  // decisão anterior da casa, pinada em lib/agent/agenteCompose.test.ts: o worker não leva o agente de navegador
  AGENTIC_MODE: "agente de navegador: só o web o aciona",
  AGENTE_URL: "agente de navegador: só o web o aciona",
  AGENTE_ALLOW: "agente de navegador: só o web o aciona",
  AGENTE_TOKEN: "agente de navegador: só o web o aciona",
};

function arquivosTs(dir: string, out: string[] = []): string[] {
  for (const nome of readdirSync(dir)) {
    const p = join(dir, nome);
    if (statSync(p).isDirectory()) arquivosTs(p, out);
    else if (/\.tsx?$/.test(nome) && !/\.test\.tsx?$/.test(nome)) out.push(p);
  }
  return out;
}

describe("compose · o worker recebe o que o turno do chat lê", () => {
  const web = ambiente("web"), worker = ambiente("worker");

  it("toda variável de servidor do web está no worker, ou tem motivo escrito pra não estar", () => {
    const faltam = [...web.keys()].filter((k) => !k.startsWith("NEXT_PUBLIC_") && !worker.has(k) && !(k in SO_NO_WEB));
    expect(faltam).toEqual([]);
  });

  it("as exceções continuam sendo exceções (nada de motivo sobrando pra chave que já está nos dois)", () => {
    for (const k of Object.keys(SO_NO_WEB)) expect(worker.has(k), k).toBe(false);
  });

  it.each(["SEARXNG_URL", "REA_BLUEPRINT", "VIDEO_DOC", "BLUEPRINT_PRATICO", "MAP_HARNESS", "ESTUDO_GATEKEEPER", "AURA_ECONOMY", "GATEWAY_URL"])(
    "%s: a MESMA expressão nos dois (default diferente seria o mesmo defeito, mais difícil de ver)", (k) => {
      expect(worker.get(k)).toBe(web.get(k));
    });

  it("as chaves espelhadas são lidas por código de servidor de verdade (lista não vira enfeite)", () => {
    const fonte = arquivosTs("lib").map((f) => readFileSync(f, "utf8")).join("\n");
    for (const k of ["SEARXNG_URL", "REA_BLUEPRINT", "VIDEO_DOC", "BLUEPRINT_PRATICO", "MAP_HARNESS", "ESTUDO_GATEKEEPER", "AURA_ECONOMY", "GATEWAY_URL"]) {
      expect(new RegExp(`env\\.${k}\\b`).test(fonte), k).toBe(true);
    }
  });
});
