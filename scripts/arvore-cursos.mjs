/**
 * scripts/arvore-cursos.mjs — aplica/garante a ÁRVORE DA VIDA em TODO curso com repositório da vitrine.
 *
 * Não há "aplicar um a um": a renderização é centralizada. Todo curso/skill com repo resolve por
 * resolverEsqueleto → /api/studio/forja/mapa → graphify → arvoreDoGrafo → <CursoArvoreView> (a árvore).
 * Então "aplicar em todos" = (1) o funil é o CursoArvoreView, e (2) todo curso-com-repo tem um repo válido.
 *
 * Este script:
 *   - enumera os cursos com repo: esqueletos curados (exemplo + INICIANTES + AVANCADOS) e skill-cursos
 *     de código (frontmatter zaeon-repo);
 *   - confere que cada um tem um repo owner/name válido;
 *   - GARANTE o funil: SalaCurso (sala de estudos) e o preview /dev/curso renderizam <CursoArvoreView>.
 * Sai 1 se algum curso-com-repo não tiver repo, ou se o funil não apontar pra Árvore da Vida.
 */
import { readFile, readdir, mkdir, stat } from "node:fs/promises";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const run = promisify(execFile);
const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const REPO_RE = /^[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?\/[A-Za-z0-9._-]+$/;
const GRAPHIFY = process.env.FORJA_GRAPHIFY_BIN || "graphify";
const CACHE = process.env.FORJA_LOCAL_CACHE || join(tmpdir(), "forja-graphify-cache");

/** Deriva a árvore do graph.json do graphify — MESMA lógica de graphifyParaGrafo + arvoreDoGrafo:
 *  grau = grau das arestas; módulos = arquivos (source_file) por peso; símbolos = nós de maior grau. */
function derivarArvore(graphJson) {
  const nodes = Array.isArray(graphJson?.nodes) ? graphJson.nodes : [];
  const links = Array.isArray(graphJson?.links) ? graphJson.links : [];
  const grau = new Map();
  for (const l of links) {
    if (!l || typeof l.source !== "string" || typeof l.target !== "string") continue;
    grau.set(l.source, (grau.get(l.source) || 0) + 1);
    grau.set(l.target, (grau.get(l.target) || 0) + 1);
  }
  const nos = nodes.filter((n) => n && typeof n.id === "string")
    .map((n) => ({ nome: n.label || n.source_file || n.id, caminho: n.source_file, grau: grau.get(n.id) || 0 }));
  const baseno = (c) => (c || "").split("/").pop() || c || "módulo";
  const porArq = new Map();
  for (const n of nos) { const k = (n.caminho || n.nome).trim(); if (!porArq.has(k)) porArq.set(k, []); porArq.get(k).push(n); }
  const modulos = [...porArq.entries()]
    .map(([arquivo, ns]) => ({ arquivo, ns, peso: ns.reduce((s, x) => s + x.grau, 0) + ns.length }))
    .sort((a, b) => b.peso - a.peso).slice(0, 6)
    .map((m) => ({ titulo: baseno(m.arquivo), simbolos: [...m.ns].sort((a, b) => b.grau - a.grau).slice(0, 3).filter((s) => s.nome && s.nome !== baseno(m.arquivo)).map((s) => s.nome) }));
  return { nNos: nos.length, nArestas: links.length, modulos };
}

/** SMOKE: roda o graphify DE VERDADE num repo e imprime a árvore real derivada. Falha se vier vazia
 *  (sem graphify → árvore genérica/vazia, que é exatamente o que não queremos). Reusa o cache local. */
async function smoke(repos) {
  console.log(`\n🔬 SMOKE graphify — indexação REAL por repositório (bin: ${GRAPHIFY})\n`);
  let falhou = false;
  const resumo = [];
  for (const repo of repos) {
    if (!REPO_RE.test(repo)) { console.error(`  ✗ ${repo}: formato inválido`); falhou = true; continue; }
    const dir = join(CACHE, repo.replace(/\//g, "__"), "repo");
    const graphJson = join(dir, "graphify-out", "graph.json");
    try {
      try { await stat(graphJson); }
      catch {
        await mkdir(dir, { recursive: true });
        process.stdout.write(`  … clonando ${repo}\n`);
        await run("git", ["clone", "--depth", "1", "--no-tags", "--single-branch", `https://github.com/${repo}`, dir], { timeout: 180_000 });
        process.stdout.write(`  … indexando ${repo} com o graphify\n`);
        await run(GRAPHIFY, ["update", dir, "--force"], { timeout: 280_000, maxBuffer: 48 * 1024 * 1024, env: { ...process.env, GEMINI_API_KEY: "", GOOGLE_API_KEY: "" } });
      }
      const arv = derivarArvore(JSON.parse(await readFile(graphJson, "utf8")));
      if (arv.nNos === 0 || arv.modulos.length === 0) { console.error(`  ✗ ${repo}: graphify não indexou nada (árvore vazia)`); falhou = true; continue; }
      console.log(`  ✓ ${repo} → ${arv.nNos} nós · ${arv.nArestas} arestas · ${arv.modulos.length} ramos`);
      for (const m of arv.modulos) console.log(`       ${m.titulo}${m.simbolos.length ? "  ·  " + m.simbolos.join(", ") : ""}`);
      resumo.push({ repo, ...arv });
    } catch (e) {
      console.error(`  ✗ ${repo}: ${e.message?.split("\n")[0] || e}`); falhou = true;
    }
  }
  // prova de que NÃO é genérico: árvores de repos diferentes têm módulos diferentes
  if (resumo.length >= 2) {
    const a = resumo[0].modulos.map((m) => m.titulo).join("|");
    const b = resumo[1].modulos.map((m) => m.titulo).join("|");
    console.log(`\n  ${a === b ? "✗ árvores IGUAIS (suspeito de genérico!)" : "✓ árvores DISTINTAS por repo (não é genérico)"}`);
    if (a === b) falhou = true;
  }
  process.exit(falhou ? 1 : 0);
}

/** Extrai {id, repo, titulo} de um catálogo TS, pareando cada `repo:` ao `id:` imediatamente anterior. */
function esqueletosDoCatalogo(texto, fonte) {
  const ids = [...texto.matchAll(/\bid:\s*"([^"]+)"/g)].map((m) => ({ v: m[1], i: m.index }));
  const titulos = [...texto.matchAll(/\btitulo:\s*"([^"]+)"/g)].map((m) => ({ v: m[1], i: m.index }));
  const antes = (arr, idx) => arr.filter((x) => x.i < idx).sort((a, b) => b.i - a.i)[0]?.v;
  const depois = (arr, idx) => arr.filter((x) => x.i > idx).sort((a, b) => a.i - b.i)[0]?.v;
  return [...texto.matchAll(/\brepo:\s*"([^"]+)"/g)].map((m) => ({
    fonte, id: antes(ids, m.index) || "?", repo: m[1], titulo: depois(titulos, m.index) || "",
  }));
}

/** Lê o frontmatter simples (chave: valor) do topo de um SKILL.md. */
function frontmatter(md) {
  const m = md.match(/^---\s*\n([\s\S]*?)\n---/);
  const campos = {};
  if (m) for (const linha of m[1].split("\n")) {
    const mm = linha.match(/^\s*([\w-]+):\s*(.+?)\s*$/);
    if (mm) campos[mm[1]] = mm[2].replace(/^["']|["']$/g, "");
  }
  return campos;
}

async function main() {
  const cursos = [];

  // 1. esqueletos curados
  for (const [arq, fonte] of [
    ["lib/forja/cursoRepo.ts", "forja:exemplo"],
    ["lib/forja/catalogoIniciantes.ts", "forja:iniciantes"],
    ["lib/forja/catalogoAvancado.ts", "forja:avancado"],
  ]) {
    const txt = await readFile(join(RAIZ, arq), "utf8");
    cursos.push(...esqueletosDoCatalogo(txt, fonte));
  }

  // 2. skill-cursos de código (zaeon-repo no frontmatter)
  const skillsDir = join(RAIZ, ".claude/skills");
  for (const nome of await readdir(skillsDir)) {
    try {
      const md = await readFile(join(skillsDir, nome, "SKILL.md"), "utf8");
      const fm = frontmatter(md);
      const repo = fm["zaeon-repo"];
      if (repo) cursos.push({ fonte: "skill", id: nome, repo, titulo: fm["zaeon-titulo"] || nome });
    } catch { /* pasta sem SKILL.md */ }
  }

  // 3. valida repos (o placeholder genérico "owner/exemplo" é esperado e não conta como curso real)
  const reais = cursos.filter((c) => c.repo !== "owner/exemplo");
  const invalidos = reais.filter((c) => !REPO_RE.test(c.repo));

  // 4. garante o FUNIL: todos renderizam <CursoArvoreView>
  const funis = [
    ["components/study/SalaCurso.tsx", "sala de estudos"],
    ["app/dev/curso/CursoRealPreview.tsx", "preview /dev/curso"],
  ];
  const funilQuebrado = [];
  for (const [arq, label] of funis) {
    const txt = await readFile(join(RAIZ, arq), "utf8").catch(() => "");
    if (!/CursoArvoreView/.test(txt) || !/<CursoArvoreView/.test(txt)) funilQuebrado.push(`${label} (${arq})`);
  }

  // relatório
  console.log(`\n🌳 Árvore da Vida — cobertura dos cursos com repositório na vitrine\n`);
  const porFonte = new Map();
  for (const c of reais) porFonte.set(c.fonte, (porFonte.get(c.fonte) || 0) + 1);
  for (const [f, n] of porFonte) console.log(`  · ${f.padEnd(18)} ${n} curso(s)`);
  console.log(`\n  ${reais.length} cursos com repo → todos renderizam <CursoArvoreView> (a Árvore da Vida)\n`);

  for (const c of reais.slice().sort((a, b) => a.fonte.localeCompare(b.fonte))) {
    const ok = REPO_RE.test(c.repo) ? "✓" : "✗";
    console.log(`  ${ok} ${c.fonte.padEnd(18)} ${String(c.id).padEnd(30)} ${c.repo}`);
  }

  console.log("");
  let falhou = false;
  if (invalidos.length) {
    falhou = true;
    console.error(`✗ ${invalidos.length} curso(s) com repo inválido (precisa ser owner/name):`);
    for (const c of invalidos) console.error(`    ${c.fonte} ${c.id} → "${c.repo}"`);
  }
  if (funilQuebrado.length) {
    falhou = true;
    console.error(`✗ funil NÃO aponta pra <CursoArvoreView> em: ${funilQuebrado.join(", ")}`);
  }
  if (falhou) process.exit(1);

  console.log(`✓ funil ok (SalaCurso + /dev/curso) e todos os ${reais.length} cursos com repo caem na Árvore da Vida.`);
}

const argv = process.argv.slice(2);
if (argv[0] === "--smoke") {
  const repos = argv.slice(1);
  smoke(repos.length ? repos : ["biopython/biopython"]).catch((e) => { console.error(e); process.exit(1); });
} else {
  main().catch((e) => { console.error(e); process.exit(1); });
}
