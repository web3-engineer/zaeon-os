/**
 * infra/rea-engine/audit-denylist.mjs — a PROVA de que nada perigoso escapou da deny-list.
 *
 * Roda NA CONTABO (onde o binário `rea` existe), depois de reconstruir o motor:
 *     node infra/rea-engine/audit-denylist.mjs
 *
 * O catálogo real de comandos muda a cada versão do rea-agents. A deny-list da ponte é por PREFIXO —
 * então um comando NOVO com efeito colateral, cujo nome não casa com nenhum prefixo, passaria. Este
 * script cruza o catálogo do `rea --help` com a deny-list REAL (lida do próprio bridge.mjs, sem
 * duplicar) e grita os comandos que PARECEM ter efeito colateral mas estão LIBERADOS — pra um humano
 * decidir, em vez de confiar na minha palavra.
 *
 * Saída: contagem total/liberados/negados, a lista de suspeitos liberados (o que importa), rc=1 se
 * houver suspeito (pra travar um CI, se um dia rodar lá).
 */
import { readFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const AQUI = dirname(fileURLToPath(import.meta.url));

/** Extrai um array literal de strings (DENY_PREFIXOS / DENY_EXATOS) do código do bridge. PURA. */
export function extrairLista(fonte, nome) {
  const m = new RegExp(`${nome}\\s*=\\s*(?:new Set\\()?\\[([^\\]]*)\\]`).exec(fonte);
  if (!m) return null;
  return (m[1].match(/"[^"]+"|'[^']+'/g) || []).map((s) => s.slice(1, -1));
}

/** O catálogo do texto do `rea --help` — a MESMA regex do bridge. PURA. */
export function catalogoDoHelp(texto) {
  const set = new Set();
  for (const m of String(texto).matchAll(/^\s{2,}([a-z][a-z0-9-]+)\s{2,}/gm)) set.add(m[1]);
  return set;
}

/** Um comando é liberado? (mesma lógica do bridge) PURA. */
export const permitido = (cmd, prefixos, exatos) =>
  !exatos.includes(cmd) && !prefixos.some((p) => cmd.startsWith(p));

/**
 * O nome do comando CHEIRA a efeito colateral? Heurística ampla de propósito: é melhor um falso
 * positivo que um humano descarta num segundo do que um comando perigoso silencioso. PURA.
 */
export const PALAVRAS_EFEITO = [
  "capture", "observe", "trace", "debug", "adb", "spawn", "attach", "launch", "instrument",
  "interact", "frida", "exec", "execute", "push", "pull", "install", "uninstall", "write",
  "delete", "remove", "start", "stop", "record", "hook", "annotate", "patch", "modify",
  "inject", "upload", "download", "extract", "mount", "run", "reset", "set-", "send", "kill",
];
export const parecePerigoso = (cmd) => PALAVRAS_EFEITO.some((w) => cmd.includes(w));

/**
 * Suspeitos já REVISADOS e considerados seguros: leitura estática de um ARQUIVO gravado (captura,
 * trace, pcap, crash), não ação em alvo/host vivo. Ficam fora da lista de suspeitos pra o audit só
 * gritar escapada NOVA. Rever esta lista quando o catálogo do REA mudar (ela é afirmação, não fé).
 */
export const REVISADOS_OK = new Set([
  "compare-process-captures", "compare-static-and-observed-endpoints", "compare-web-captures",
  "decode-signal-recording", "inspect-native-dispatch-metadata", "inspect-packet-capture",
  "inspect-pcap-capture", "inspect-playwright-trace", "inspect-recorded-crash", "inspect-web-network-capture",
]);

/** Cruza catálogo × deny-list e devolve o laudo. PURA (o IO fica no main). */
export function auditar(catalogo, prefixos, exatos) {
  const cmds = [...catalogo].sort();
  const liberados = cmds.filter((c) => permitido(c, prefixos, exatos));
  const negados = cmds.filter((c) => !permitido(c, prefixos, exatos));
  const suspeitos = liberados.filter((c) => parecePerigoso(c) && !REVISADOS_OK.has(c)); // liberados que cheiram a efeito colateral e ainda não revisados
  return { total: cmds.length, liberados, negados, suspeitos };
}

function rodarHelp() {
  return new Promise((ok) => {
    const p = spawn("rea", ["--help"]);
    let out = "";
    p.stdout.on("data", (d) => { out += d; });
    p.stderr.on("data", (d) => { out += d; });
    p.on("close", () => ok(out));
    p.on("error", (e) => { console.error("não consegui rodar `rea --help`:", e.message); process.exit(2); });
  });
}

async function main() {
  const bridge = readFileSync(join(AQUI, "bridge.mjs"), "utf8");
  const prefixos = extrairLista(bridge, "DENY_PREFIXOS");
  const exatos = extrairLista(bridge, "DENY_EXATOS");
  if (!prefixos || !exatos) { console.error("não achei a deny-list em bridge.mjs"); process.exit(2); }

  const help = await rodarHelp();
  const r = auditar(catalogoDoHelp(help), prefixos, exatos);

  console.log(`catálogo: ${r.total} comandos · liberados: ${r.liberados.length} · negados: ${r.negados.length}`);
  console.log(`\nnegados (efeito colateral, por política):\n  ${r.negados.join(", ") || "(nenhum)"}`);
  if (r.suspeitos.length) {
    console.log(`\n⚠️  LIBERADOS que PARECEM ter efeito colateral — revise cada um:\n  ${r.suspeitos.join("\n  ")}`);
    console.log(`\nSe algum destes mexe no alvo/host, acrescente o prefixo em DENY_PREFIXOS (bridge.mjs E lib/octa/rea.ts) e reconstrua.`);
    process.exit(1);
  }
  console.log(`\n✅ nenhum comando liberado cheira a efeito colateral.`);
}

// só roda o main quando chamado direto (não quando o teste importa as funções puras)
if (process.argv[1] && process.argv[1].endsWith("audit-denylist.mjs")) main();
