/**
 * lib/orquestra/hermesApp.ts — a ÚLTIMA VERSÃO do app Zaeon Hermes, servida pelo próprio servidor (atualização
 * automática do console; docs/HERMES_ZAEON.md · GET /app e /app/baixar).
 *
 * Quem publica é o workflow do app (.github/workflows/zaeon-hermes-mac.yml): a cada push na main que mexe em
 * apps/zaeon-hermes-mac, o runner macOS compila, assina e manda `ZaeonHermes.app.zip` + `manifesto.json` por SSH
 * para `<DEPLOY_PATH>/hermes-dist` — montado (só leitura) no container web em HERMES_DIST_DIR. O repositório é
 * privado: o app não tem como baixar do GitHub; daqui ele baixa com a MESMA chave do console.
 */
import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import { join } from "node:path";

export type ManifestoApp = {
  build: number;
  versao: string;
  sha: string | null;
  criadoEm: string | null;
  sha256: string;
  tamanho: number;
  arquivo: string;
};

export const dirDaDistribuicao = (env: Record<string, string | undefined> = process.env) => env.HERMES_DIST_DIR?.trim() || "/app/.hermes-dist";

/** PURA: valida o manifesto escrito pelo workflow. Inválido → null (o app só vê "sem atualização"). */
export function lerManifesto(bruto: unknown): ManifestoApp | null {
  const m = bruto as Record<string, unknown> | null;
  if (!m || typeof m !== "object") return null;
  const build = Number(m.build);
  const sha256 = String(m.sha256 ?? "").toLowerCase();
  const arquivo = String(m.arquivo ?? "ZaeonHermes.app.zip");
  if (!Number.isInteger(build) || build < 1 || !/^[a-f0-9]{64}$/.test(sha256)) return null;
  // o arquivo é um nome, nunca um caminho (nada de ../ saindo da pasta)
  if (!/^[A-Za-z0-9._-]+\.zip$/.test(arquivo)) return null;
  return {
    build, sha256, arquivo,
    versao: String(m.versao ?? "0.1.0").slice(0, 32),
    sha: typeof m.sha === "string" ? m.sha.slice(0, 40) : null,
    criadoEm: typeof m.criadoEm === "string" ? m.criadoEm : null,
    tamanho: Number(m.tamanho) > 0 ? Number(m.tamanho) : 0,
  };
}

export async function manifestoAtual(dir = dirDaDistribuicao()): Promise<ManifestoApp | null> {
  try {
    return lerManifesto(JSON.parse(await readFile(join(dir, "manifesto.json"), "utf8")));
  } catch {
    return null;
  }
}

/** O zip, conferido contra o sha256 do manifesto (upload pela metade nunca vai pro Mac). */
export async function pacoteAtual(dir = dirDaDistribuicao()): Promise<{ manifesto: ManifestoApp; dados: Buffer } | null> {
  const manifesto = await manifestoAtual(dir);
  if (!manifesto) return null;
  try {
    const caminho = join(dir, manifesto.arquivo);
    if (!(await stat(caminho)).isFile()) return null;
    const dados = await readFile(caminho);
    if (createHash("sha256").update(dados).digest("hex") !== manifesto.sha256) return null;
    return { manifesto: { ...manifesto, tamanho: dados.length }, dados };
  } catch {
    return null;
  }
}
