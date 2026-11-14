/**
 * scripts/forja-ua-gerar.mjs — PRÉ-GERA o cache do understand-anything (.ua/knowledge-graph.json) por repo,
 * chamando a ponte da box (engine=understand). É offline/em lote DE PROPÓSITO: cada repo é um run de LLM de
 * minutos, então nunca roda no caminho da requisição — o app só LÊ este cache (lib/forja/understandLocal).
 *
 * Rode ONDE A PONTE EXISTE (a box do app). Aponte FORJA_UA_CACHE pro mesmo volume que o app lê.
 *   FORJA_BRIDGE_URL=http://127.0.0.1:8800 FORJA_BRIDGE_TOKEN=... FORJA_UA_CACHE=/vol/forja-ua \
 *     node scripts/forja-ua-gerar.mjs --todos            # todos os cursos com repo
 *   ... node scripts/forja-ua-gerar.mjs karpathy/micrograd owner/outro   # repos específicos
 */
import { readFile, readdir, mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const CACHE = process.env.FORJA_UA_CACHE || join(tmpdir(), "forja-ua-cache");
const URL_PONTE = (process.env.FORJA_BRIDGE_URL || "").replace(/\/$/, "");
const TOKEN = process.env.FORJA_BRIDGE_TOKEN || "";
const REPO_RE = /^[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?\/[A-Za-z0-9._-]+$/;

/** Lê os repos dos catálogos curados + skill-cursos (zaeon-repo), igual ao arvore-cursos.mjs. */
async function reposDaVitrine() {
  const repos = new Set();
  for (const arq of ["lib/forja/catalogoIniciantes.ts", "lib/forja/catalogoAvancado.ts"]) {
    const txt = await readFile(join(RAIZ, arq), "utf8");
    for (const m of txt.matchAll(/\brepo:\s*"([^"]+)"/g)) if (m[1] !== "owner/exemplo") repos.add(m[1]);
  }
  const skillsDir = join(RAIZ, ".claude/skills");
  for (const nome of await readdir(skillsDir).catch(() => [])) {
    const md = await readFile(join(skillsDir, nome, "SKILL.md"), "utf8").catch(() => "");
    const m = md.match(/^---\s*\n([\s\S]*?)\n---/);
    const rr = m && m[1].match(/zaeon-repo:\s*(.+)/);
    if (rr) repos.add(rr[1].trim().replace(/^["']|["']$/g, ""));
  }
  return [...repos].filter((r) => REPO_RE.test(r));
}

async function gerar(repo) {
  const r = await fetch(`${URL_PONTE}/forja`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ token: TOKEN, engine: "understand", repoUrl: `https://github.com/${repo}` }),
  });
  const j = await r.json().catch(() => ({}));
  if (!j.ok || !j.grafo) throw new Error(j.erro || `sem grafo (HTTP ${r.status})`);
  const dir = join(CACHE, repo.replace(/\//g, "__"));
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, "knowledge-graph.json"), JSON.stringify(j.grafo));
  const g = j.grafo;
  return { nos: (g.nodes || []).length, camadas: (g.layers || []).length, tour: (g.tour || []).length };
}

async function main() {
  if (!URL_PONTE || !TOKEN) { console.error("✗ defina FORJA_BRIDGE_URL e FORJA_BRIDGE_TOKEN (a ponte da box)."); process.exit(1); }
  const argv = process.argv.slice(2);
  const repos = argv.includes("--todos") ? await reposDaVitrine() : argv.filter((a) => REPO_RE.test(a));
  if (!repos.length) { console.error("uso: node scripts/forja-ua-gerar.mjs --todos | <owner/repo> ..."); process.exit(1); }
  console.log(`\n🧠 pré-gerando .ua para ${repos.length} repo(s) → cache ${CACHE}\n`);
  let ok = 0, falhou = 0;
  for (const repo of repos) {
    process.stdout.write(`  … ${repo} `);
    try { const s = await gerar(repo); console.log(`✓ ${s.nos} nós · ${s.camadas} camadas · ${s.tour} passos`); ok++; }
    catch (e) { console.log(`✗ ${String(e.message || e).slice(0, 120)}`); falhou++; }
  }
  console.log(`\n${ok} ok · ${falhou} falha(s). Cache em ${CACHE} — aponte FORJA_UA_CACHE do app pra cá.`);
  process.exit(falhou && !ok ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(1); });
