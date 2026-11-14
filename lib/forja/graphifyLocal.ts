/**
 * lib/forja/graphifyLocal.ts — o MOTOR GRAPHIFY rodando LOCALMENTE (clone + `graphify update`, tree-sitter
 * estático, SEM LLM), como FALLBACK do /api/studio/forja/mapa quando a ponte da box (FORJA_BRIDGE) não
 * está configurada. É o que permite ANÁLISE REAL de repositório em DEV, sem depender da Contabo.
 *
 * SÓ SERVIDOR, SÓ DEV: ligado pela flag `FORJA_LOCAL_ENGINE=1`. Clona e analisa um repo público do GitHub
 * (owner/name), cacheia o grafo por repo. NUNCA em produção sem a flag (clonar+rodar binário é custo e risco).
 */
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdir, readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { graphifyParaGrafo } from "./adaptadores";
import type { GrafoConhecimento } from "./tipos";

const run = promisify(execFile);
const GRAPHIFY = process.env.FORJA_GRAPHIFY_BIN || "graphify";
const CACHE = process.env.FORJA_LOCAL_CACHE || join(tmpdir(), "forja-graphify-cache");

/** O motor local está ligado? (flag de DEV; em prod o normal é a ponte da box). */
export function engineLocalLigado(): boolean {
  return process.env.FORJA_LOCAL_ENGINE === "1";
}

/** Clona `owner/name` (público, GitHub), roda o graphify e devolve o grafo REAL. Cacheado. null em falha. */
export async function grafoLocalDoRepo(repo: string): Promise<GrafoConhecimento | null> {
  if (!engineLocalLigado()) return null;
  if (!/^[\w.-]+\/[\w.-]+$/.test(repo) || repo === "owner/exemplo") return null;
  const dir = join(CACHE, repo.replace(/\//g, "__"));
  const repoDir = join(dir, "repo");
  const graphJson = join(repoDir, "graphify-out", "graph.json");
  try {
    try {
      await stat(graphJson); // cache quente: reusa a análise já feita
    } catch {
      await mkdir(dir, { recursive: true });
      await run("git", ["clone", "--depth", "1", "--no-tags", "--single-branch", `https://github.com/${repo}`, repoDir], { timeout: 180_000 });
      await run(GRAPHIFY, ["update", repoDir, "--force"], { timeout: 280_000, maxBuffer: 48 * 1024 * 1024, env: { ...process.env, GEMINI_API_KEY: "", GOOGLE_API_KEY: "" } });
    }
    const raw = JSON.parse(await readFile(graphJson, "utf8"));
    return graphifyParaGrafo(raw);
  } catch {
    return null; // rede, timeout, binário ausente: degrada pro esqueleto, sem travar
  }
}
