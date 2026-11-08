/**
 * lib/cad/mcp.ts — A POLÍTICA DO SOLIDCRAFT (CAD, agente Eiffel), num arquivo só.
 *
 * O SolidCraft (tangency-labs/solidcraft, MIT OU Apache-2.0, 0.40.0-rc.3) é um servidor MCP de CAD
 * paramétrico. Ele entra no harness como QUALQUER conector: pela entrada do catálogo (lib/agent/mcp)
 * e por `MCP_CONECTORES=solidcraft`. O que é PRÓPRIO dele mora aqui, não espalhado no catálogo:
 *   1. o teto de risco e a reclassificação de `execute`/`batch` (a decisão de segurança, aprovada
 *      pelo dono em 2026-11-08, estreita e por conector — ver RECLASSIFICACAO_SOLIDCRAFT);
 *   2. o `--allow-path` e o confinamento por conversa (`confinarEmCad`).
 *
 * IMPORTS SÓ DE TIPO de lib/agent/* de propósito: lib/agent/mcp importa o VALOR `SOLIDCRAFT_ENTRY`
 * daqui, e tipo é erasado no runtime — então não há ciclo de módulo.
 */
import type { CatalogEntry } from "@/lib/agent/mcp";
import type { ToolRisk } from "@/lib/agent/runtime";
import type { ToolContext } from "@/lib/agent/runtime";

/** O slug do conector. Tem de bater com `CONECTOR_CAD` de lib/agents/capacidades (um teste afirma). */
export const CONECTOR_CAD = "solidcraft";

/** O binário, no caminho ABSOLUTO que o Dockerfile instala. Uma fonte só: o endpoint vem daqui. */
export const CAMINHO_BIN_SOLIDCRAFT = "/usr/local/bin/solidcraft-cli";

/** O entry do bundle WASM (modo edição, FALTA step 5), servido estático. Relativo ao cwd. */
export const CAMINHO_WASM_CAD = "public/cad/index.html";

/**
 * A versão PINADA — tem de acompanhar o `SOLIDCRAFT_TAG` do Dockerfile (lá `v0.40.0-rc.3`, a tag;
 * aqui o semver, sem o `v`). É o que o `/api/health` reporta: a versão que a imagem COMPILA, não uma
 * sonda do binário (o health é liveness, não spawna processo).
 */
export const VERSAO_SOLIDCRAFT = "0.40.0-rc.3";

/**
 * A raiz do sandbox de arquivos. É o `--allow-path` que vai pro servidor: o SolidCraft confina as
 * próprias tools de arquivo a esta pasta (recusa `/etc`, dotfiles, `..` e symlink que sai — ver
 * docs/HANDOFF_EIFFEL_CAD.md §2). A separação ENTRE CONVERSAS, abaixo desta raiz, é NOSSA, não do
 * SolidCraft: o catálogo é estático, então o `--allow-path` é fixo, e `confinarEmCad` é quem força o
 * `/app/cad/<escopo>` de cada conversa. Quem ler só o sandbox do SolidCraft vai supor mais isolamento
 * do que esta configuração dá — por isso está escrito.
 */
export const RAIZ_CAD = "/app/cad";

/**
 * A RECLASSIFICAÇÃO — a exceção de segurança, estreita e com o motivo no código.
 *
 * MEDIDO (handoff §E2): o SolidCraft anota as 21 tools; `execute` e `batch` — as duas que modelam —
 * vêm `destructiveHint:true`. Com o teto global `read` (RISCO_MAXIMO_CHAT) e o segundo portão do
 * `permit` (destructive ⇒ REQUIRE_APPROVAL, que o chat em `auto` não resolve), o Eiffel poderia
 * MEDIR e INSPECIONAR, e não poderia modelar NADA.
 *
 * Por que `write` descreve a verdade melhor que `destructive` AQUI, e só aqui: `destructiveHint:true`
 * significa "pode alterar o design" — e o design é um arquivo DESCARTÁVEL dentro de `--allow-path
 * /app/cad/<escopo>`. Não há dado de usuário, não há repositório, não há mundo externo. O sandbox do
 * SolidCraft mais o confinamento por conversa fazem o raio de alcance ser um design descartável. Não
 * é afrouxar a política: é dizer que, neste conector e dentro deste confinamento, `write` é o risco
 * fiel. `RISCO_MAXIMO_CHAT` continua `read`; esta exceção não vaza para nenhum outro conector, e
 * lib/cad/mcp.test.ts afirma essa não-contaminação.
 */
export const RECLASSIFICACAO_SOLIDCRAFT: Readonly<Record<string, ToolRisk>> = {
  execute: "write",
  batch: "write",
};

/**
 * A entrada do catálogo. `experimental` porque o binário vem de um release candidate pinado por
 * commit no Dockerfile (nunca `main`). O endpoint é o binário ABSOLUTO (vem da imagem, não do
 * node_modules). `--headless` força a sessão sem janela; `--allow-path` é o sandbox.
 */
export const SOLIDCRAFT_ENTRY: CatalogEntry = {
  name: CONECTOR_CAD,
  label: "SolidCraft (CAD)",
  transport: "stdio",
  endpoint: `${CAMINHO_BIN_SOLIDCRAFT} mcp --headless --allow-path ${RAIZ_CAD}`,
  note: `${VERSAO_SOLIDCRAFT} · 21/21 tools anotadas · execute/batch reclassificadas destructive→write SÓ aqui (design descartável em --allow-path); teto write por conector, RISCO_MAXIMO_CHAT intacto`,
  experimental: true,
  riscoMaximo: "write",
  reclassificar: RECLASSIFICACAO_SOLIDCRAFT,
};

// ───────────────────────────── confinamento por conversa ─────────────────────────────

/** Só o que é seguro num nome de pasta: o resto cai, pra o próprio escopo não escapar da raiz. */
function escopoSeguro(bruto: string): string {
  const s = bruto.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64);
  return s || "anon";
}

/**
 * O ESCOPO da conversa — a chave de isolamento abaixo de `/app/cad`. A ordem vai do mais específico
 * ao mais estável: um estudo/pesquisa/projeto aberto é o escopo natural; sem nenhum, o dono do turno.
 * `anon` é o piso (turno sem identidade): confina, mas não separa — melhor que escrever na raiz.
 *
 * NOTA: cross-conversa é NOSSO (ver RAIZ_CAD). Esta função é a chave; `confinarEmCad` é quem a aplica.
 */
export function escopoDeContexto(ctx: ToolContext): string {
  const bruto = ctx.currentStudyId ?? ctx.currentResearchId ?? ctx.currentProjectId ?? ctx.userId ?? "anon";
  return escopoSeguro(String(bruto));
}

/**
 * Força um caminho para dentro de `/app/cad/<escopo>`, resolvendo `..` ANTES de comparar. LANÇA
 * quando o caminho sairia do confinamento — é um portão, não um conserto silencioso:
 *   · relativo → vira filho do escopo (`x.step` ⇒ `/app/cad/<escopo>/x.step`);
 *   · `..` que sobe demais → recusado (`../fora.step`);
 *   · absoluto fora da raiz → recusado (`/etc/x`);
 *   · absoluto em OUTRO escopo → recusado (`/app/cad/outra/x`) — é o isolamento entre conversas.
 *
 * Puro de propósito: recebe o escopo pronto (não o ctx), pra o teste exercer cada negação sem montar
 * um turno. O `pathPosix` é injetável só pra teste determinístico; o default é o do runtime.
 */
export function confinarEmCad(
  escopo: string,
  caminho: string,
  pathPosix: { resolve: (...p: string[]) => string; isAbsolute: (p: string) => boolean } = posixPath(),
): string {
  const base = `${RAIZ_CAD}/${escopoSeguro(escopo)}`;
  const alvo = pathPosix.isAbsolute(caminho)
    ? pathPosix.resolve(caminho)
    : pathPosix.resolve(base, caminho);
  // `base` exato também vale (a própria pasta do escopo); abaixo dela, exige a barra pra não casar
  // `/app/cad/escopo-maligno` com base `/app/cad/escopo`.
  if (alvo !== base && !alvo.startsWith(base + "/")) {
    throw new Error(`caminho fora do confinamento do CAD: ${caminho} não cai em ${base}`);
  }
  return alvo;
}

// ───────────────────────────── recibo do /api/health ─────────────────────────────

/**
 * O RECIBO do CAD pro `/api/health`, no molde do `atlasDeAnatomia`: estado LIDO DO DISCO, nunca uma
 * constante. `cli` = o binário está na imagem; `wasm` = o bundle do modo edição está servido. Os dois
 * são fatos de ambiente, e afirmá-los como invariante quebra em produção (a lição do recibo do atlas).
 *
 * `existe` é injetável só pra o teste exercer cada estado sem montar uma imagem; o default do runtime
 * é `existsSync`. `versao` só sai quando o binário está lá, e é a versão PINADA (ver VERSAO_SOLIDCRAFT).
 */
export function reciboCad(
  existe: (caminho: string) => boolean,
  cwd: string = process.cwd(),
): { cli: "on" | "off"; wasm: "on" | "off"; versao?: string } {
  const path = require("node:path") as typeof import("node:path");
  const cli = existe(CAMINHO_BIN_SOLIDCRAFT) ? "on" : "off";
  const wasm = existe(path.join(cwd, CAMINHO_WASM_CAD)) ? "on" : "off";
  return cli === "on" ? { cli, wasm, versao: VERSAO_SOLIDCRAFT } : { cli, wasm };
}

/** O `path.posix` do runtime, carregado tarde (evita puxar `node:path` no bundle do cliente). */
function posixPath(): { resolve: (...p: string[]) => string; isAbsolute: (p: string) => boolean } {
  const p = (require("node:path") as typeof import("node:path")).posix;
  return { resolve: (...parts: string[]) => p.resolve(...parts), isAbsolute: (x: string) => p.isAbsolute(x) };
}
