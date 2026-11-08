/**
 * scripts/dataset-montar.mjs — monta o DATASET dos agentes a partir das origens FIXADAS.
 *
 *   node scripts/dataset-montar.mjs --saida /tmp/dataset           # tudo
 *   node scripts/dataset-montar.mjs --fontes mdn,k8s --saida /tmp/dataset
 *   node scripts/dataset-montar.mjs --seco                         # só diz o que faria
 *
 * POR QUE ESTE SCRIPT EXISTE: o corpus dos agentes são 66 MB de JSONL e PDF, grandes demais pro git
 * e impossíveis de versionar como blob. Então o repositório guarda o CAMINHO (este arquivo, com os
 * commits fixados) e a VPS refaz o dado. É o mesmo padrão da geometria do atlas
 * (infra/anatomia-geometria.mjs): trabalho caro no deploy, barato no turno.
 *
 * ORIGENS FIXADAS POR COMMIT — e isso não é zelo: um manifesto sha256 de dado DERIVADO de fonte que
 * muda falharia na próxima execução, e aí ninguém mais confiaria nele.
 *
 * AS LICENÇAS, conferidas na fonte (docs/AGENTES_DO_CHAT.md):
 *   · legislacao-br   CC0-1.0 — e o texto de lei não é objeto de proteção (Lei 9.610/98, art. 8º IV)
 *   · kubernetes/website  CC BY 4.0
 *   · mdn/content     CC BY-SA 2.5 (li o LICENSE.md do repo), atribuição a "Mozilla Contributors"
 *   · CWE e ATT&CK    MITRE: uso livre para pesquisa, desenvolvimento e fins COMERCIAIS, mantido o
 *                     aviso de copyright — que vai no fim de cada documento
 *   · REA-MECC        CC BY-SA 3.0 (li dentro dos repositórios)
 *
 * CADA DOCUMENTO sai no contrato de `lib/rag/ingerir`: { chave, titulo, texto, area }, com a linha
 * de licença no fim do texto. Um documento = uma coisa que o aluno perguntaria: um artigo de lei,
 * uma página de doc, uma entrada de CWE, uma técnica do ATT&CK. Nunca um livro inteiro num
 * documento — a busca devolve o documento, e um livro afoga o prompt.
 */
import { execFileSync } from "node:child_process";
import { appendFileSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, relative } from "node:path";

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? (args[i + 1] ?? d) : d; };
const SECO = args.includes("--seco");
const SAIDA = opt("--saida", "/tmp/dataset");
const FONTES = opt("--fontes", "constituicao,k8s,mdn,seguranca,matematica").split(",").map((x) => x.trim());

/** As origens, FIXADAS. Trocar um commit aqui é uma decisão, não um acidente. */
const PINS = {
  legislacao: { repo: "https://github.com/Evaldoes/legislacao-br.git", commit: "9dbcbd37dcf2cdd76479bea53eb0e41f52590cf1" },
  k8s:        { repo: "https://github.com/kubernetes/website.git",     commit: "09b7af0f1d82bc812ad51b8b6033956fbaf73415", sparse: "content/en/docs" },
  mdn:        { repo: "https://github.com/mdn/content.git",            commit: "288e644117c29285df2acf37a2ac97f57546a146", sparse: "files/en-us" },
  attack:     { url: "https://raw.githubusercontent.com/mitre-attack/attack-stix-data/master/enterprise-attack/enterprise-attack.json" },
  // A URL do CWE é "latest" e NÃO é pinável. O número da versão fica no manifesto pra dar rastro.
  cwe:        { url: "https://cwe.mitre.org/data/csv/1000.csv.zip" },
  reaMecc:    { acervo: "https://rea-mecc.github.io/acervo.html" },
};

const LIC = {
  constituicao: "Fonte: Constituição da República Federativa do Brasil de 1988 — texto oficial do Planalto. Textos de lei não são objeto de proteção autoral (Lei 9.610/98, art. 8º, IV).",
  k8s: "Fonte: documentação do Kubernetes (kubernetes.io) — licença CC BY 4.0.",
  mdn: (url) => `Fonte: MDN Web Docs, por Mozilla Contributors (${url}) — licença CC BY-SA 2.5.`,
  cwe: "Fonte: CWE (The MITRE Corporation) — uso livre para pesquisa, desenvolvimento e fins comerciais, mantido o aviso de copyright do MITRE.",
  attack: "Fonte: MITRE ATT&CK® — uso livre para pesquisa, desenvolvimento e fins comerciais, mantido o aviso de copyright do MITRE.",
};

const log = (...a) => console.log(...a);
const sh = (cmd, cmdArgs, cwd) => execFileSync(cmd, cmdArgs, { cwd, stdio: ["ignore", "pipe", "pipe"], encoding: "utf8" });

/** Clone raso e FIXADO. `sparse` traz só uma subárvore — o mdn inteiro são 202 MB. */
function clonar(nome, { repo, commit, sparse }) {
  // `git fetch --depth 1 origin <sha>` exige o hash COMPLETO de 40 caracteres. Com um abreviado o
  // git responde "couldn't find remote ref", que parece erro de rede e não é — então falha aqui,
  // com o nome do pin, em vez de lá no meio do fetch.
  if (!/^[0-9a-f]{40}$/.test(commit)) throw new Error(`pin de ${nome} precisa do sha completo de 40: "${commit}"`);
  const dir = join(SAIDA, ".fontes", nome);
  if (existsSync(join(dir, ".git"))) { log(`  ${nome}: já clonado`); return dir; }
  mkdirSync(dir, { recursive: true });
  sh("git", ["init", "-q"], dir);
  sh("git", ["remote", "add", "origin", repo], dir);
  if (sparse) {
    sh("git", ["config", "core.sparseCheckout", "true"], dir);
    writeFileSync(join(dir, ".git", "info", "sparse-checkout"), `${sparse}/*\n`);
  }
  sh("git", ["fetch", "--depth", "1", "origin", commit], dir);
  sh("git", ["checkout", "-q", "FETCH_HEAD"], dir);
  const real = sh("git", ["rev-parse", "HEAD"], dir).trim();
  log(`  ${nome}: ${real.slice(0, 12)} ${real === commit ? "✓ fixado" : "⚠ DIFERENTE do pin"}`);
  return dir;
}

async function baixar(url, destino) {
  const r = await fetch(url, { headers: { "User-Agent": "ZaeonBot/1.0 (bases de estudo; +https://zaeon.com.br)" } });
  if (!r.ok) throw new Error(`HTTP ${r.status} em ${url}`);
  const b = Buffer.from(await r.arrayBuffer());
  mkdirSync(join(destino, ".."), { recursive: true });
  writeFileSync(destino, b);
  return b;
}

/** YAML frontmatter → objeto. Só o que precisamos: chave: valor numa linha. */
function frontmatter(texto) {
  const m = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(texto);
  if (!m) return [{}, texto];
  const meta = {};
  for (const linha of m[1].split("\n")) {
    const i = linha.indexOf(":");
    if (i > 0) meta[linha.slice(0, i).trim()] = linha.slice(i + 1).trim().replace(/^["']|["']$/g, "");
  }
  return [meta, m[2]];
}

const arquivos = (dir, filtro, fora = []) => {
  for (const nome of readdirSync(dir)) {
    const p = join(dir, nome);
    if (statSync(p).isDirectory()) arquivos(p, filtro, fora);
    else if (filtro(p)) fora.push(p);
  }
  return fora;
};

function escrever(nome, docs) {
  const destino = join(SAIDA, nome);
  mkdirSync(join(destino, ".."), { recursive: true });
  // SÍNCRONO de propósito: createWriteStream abre o arquivo de forma assíncrona, e o manifesto —
  // que roda logo depois — não via nada no disco. O maior arquivo são ~40 MB de MDN, que caberia
  // numa string sem aperto, mas escrevo em lotes pra não montar os 40 MB de uma vez.
  writeFileSync(destino, "");
  const LOTE = 500;
  for (let i = 0; i < docs.length; i += LOTE) {
    appendFileSync(destino, docs.slice(i, i + LOTE).map((d) => `${JSON.stringify(d)}\n`).join(""));
  }
  log(`  → ${nome}: ${docs.length} documentos`);
  return docs.length;
}

// ─────────────────────────────── as fontes ───────────────────────────────

/** A Constituição: um artigo = um documento. `revogado: true` fica FORA — artigo revogado no RAG
 *  faz o agente citar lei que não vale, que é pior que não citar. */
function fonteConstituicao() {
  const dir = clonar("legislacao", PINS.legislacao);
  const base = join(dir, "normas", "constituicao-1988");
  if (!existsSync(base)) throw new Error("normas/constituicao-1988 não existe neste commit");
  const docs = [];
  let revogados = 0;
  for (const p of arquivos(base, (x) => x.endsWith(".md")).sort()) {
    const [meta, corpo] = frontmatter(readFileSync(p, "utf8"));
    if (String(meta.revogado).toLowerCase() === "true") { revogados++; continue; }
    const texto = corpo.trim();
    if (!meta.id || !texto) continue;
    docs.push({ chave: meta.id, titulo: meta.rotulo || `Art. ${meta.artigo}`, texto: `${texto}\n\n${LIC.constituicao}`, area: "direito" });
  }
  log(`  (${revogados} artigos revogados filtrados)`);
  return escrever("constituicao/constituicao.jsonl", docs);
}

/** Kubernetes: uma página = um documento. Shortcodes do Hugo são marcação, não conteúdo. */
function fonteK8s() {
  const dir = clonar("k8s", PINS.k8s);
  const base = join(dir, "content", "en", "docs");
  const docs = [];
  let curtas = 0;
  for (const p of arquivos(base, (x) => x.endsWith(".md")).sort()) {
    const [meta, bruto] = frontmatter(readFileSync(p, "utf8"));
    const corpo = bruto.replace(/\{\{[%<][\s\S]*?[%>]\}\}/g, " ").replace(/\n{3,}/g, "\n\n").trim();
    if (corpo.length < 400) { curtas++; continue; }
    const rel = relative(base, p).replace(/[/\\]/g, "-").replace(/\.md$/, "");
    const titulo = meta.title || rel;
    docs.push({ chave: `k8s-${rel}`, titulo: `${titulo} (Kubernetes)`, texto: `# ${titulo}\n\n${corpo.slice(0, 20000)}\n\n${LIC.k8s}`, area: "infra" });
  }
  log(`  (${curtas} páginas curtas/índice puladas)`);
  return escrever("infra/kubernetes.jsonl", docs);
}

/** MDN: uma página = um documento. As macros `{{jsxref(...)}}` são marcação. */
function fonteMdn() {
  const dir = clonar("mdn", PINS.mdn);
  const base = join(dir, "files", "en-us");
  const alvos = ["web/javascript", "web/api", "web/css", "web/html", "web/http", "learn_web_development", "webassembly"];
  const docs = [];
  let curtas = 0;
  for (const alvo of alvos) {
    const raiz = join(base, ...alvo.split("/"));
    if (!existsSync(raiz)) { log(`  aviso: ${alvo} não existe neste commit`); continue; }
    for (const p of arquivos(raiz, (x) => x.endsWith("index.md")).sort()) {
      const [meta, bruto] = frontmatter(readFileSync(p, "utf8"));
      const corpo = bruto.replace(/\{\{[^}]*\}\}/g, " ").replace(/\n{3,}/g, "\n\n").trim();
      if (corpo.length < 600) { curtas++; continue; }
      const relDir = relative(base, join(p, ".."));
      const titulo = meta.title || relDir;
      docs.push({
        chave: `mdn-${relDir.replace(/[/\\]/g, "-")}`,
        titulo: `${titulo} (MDN)`,
        texto: `# ${titulo}\n\n${corpo.slice(0, 20000)}\n\n${LIC.mdn(`https://developer.mozilla.org/en-US/docs/${relDir.replace(/\\/g, "/")}`)}`,
        area: "software",
      });
    }
  }
  log(`  (${curtas} stubs curtos pulados)`);
  return escrever("software/mdn.jsonl", docs);
}

/** CWE: uma fraqueza = um documento. ATT&CK: uma técnica = um documento, com as mitigações ligadas
 *  pelas relações `mitigates` — é o que transforma uma lista de ataques em material de ensino. */
async function fonteSeguranca() {
  const tmp = join(SAIDA, ".fontes", "seguranca");
  mkdirSync(tmp, { recursive: true });
  let total = 0;

  const zip = join(tmp, "cwe.csv.zip");
  if (!existsSync(zip)) await baixar(PINS.cwe.url, zip);
  sh("unzip", ["-o", "-q", zip, "-d", tmp]);
  const csv = readdirSync(tmp).find((f) => f.endsWith(".csv"));
  if (!csv) throw new Error("o zip do CWE não trouxe .csv");
  const linhas = readFileSync(join(tmp, csv), "utf8");
  // CSV do CWE tem campo com vírgula e quebra de linha dentro de aspas: parser próprio, curto.
  const campos = (linha) => {
    const out = []; let cur = ""; let q = false;
    for (let i = 0; i < linha.length; i++) {
      const c = linha[i];
      if (c === '"') { if (q && linha[i + 1] === '"') { cur += '"'; i++; } else q = !q; }
      else if (c === "," && !q) { out.push(cur); cur = ""; }
      else cur += c;
    }
    out.push(cur); return out;
  };
  const registros = [];
  { let cur = ""; let q = false;
    for (const ch of linhas) {
      if (ch === '"') q = !q;
      if (ch === "\n" && !q) { registros.push(cur); cur = ""; } else cur += ch;
    }
    if (cur.trim()) registros.push(cur);
  }
  const cab = campos(registros[0]).map((x) => x.trim());
  const col = (r, nome) => r[cab.indexOf(nome)] ?? "";
  const cwe = [];
  for (const linha of registros.slice(1)) {
    const r = campos(linha);
    const id = col(r, "CWE-ID").trim(), nome = col(r, "Name").trim(), desc = col(r, "Description").trim();
    if (!id || !nome || !desc) continue;
    const ext = col(r, "Extended Description").trim(), mit = col(r, "Potential Mitigations").trim();
    let corpo = `# CWE-${id}: ${nome}\n\n${desc}`;
    if (ext) corpo += `\n\n${ext}`;
    if (mit) corpo += `\n\n## Mitigações\n${mit.slice(0, 4000)}`;
    cwe.push({ chave: `cwe-${id}`, titulo: `CWE-${id}: ${nome}`, texto: `${corpo}\n\n${LIC.cwe}`, area: "seguranca" });
  }
  total += escrever("seguranca/cwe.jsonl", cwe);

  const stix = join(tmp, "attack.json");
  if (!existsSync(stix)) await baixar(PINS.attack.url, stix);
  const d = JSON.parse(readFileSync(stix, "utf8"));
  const objs = d.objects ?? [];
  const porId = new Map(objs.map((o) => [o.id, o]));
  const mitiga = new Map();
  for (const o of objs) {
    if (o.type === "relationship" && o.relationship_type === "mitigates") {
      const alvo = o.target_ref;
      mitiga.set(alvo, [...(mitiga.get(alvo) ?? []), o.source_ref]);
    }
  }
  const atk = [];
  for (const o of objs) {
    if (o.type !== "attack-pattern" || o.revoked || o.x_mitre_deprecated) continue;
    const ext = (o.external_references ?? []).find((e) => e.source_name === "mitre-attack");
    const tid = ext?.external_id;
    if (!tid) continue;
    let corpo = `# ${tid}: ${o.name}\n\n${o.description ?? ""}`;
    const fases = (o.kill_chain_phases ?? []).map((f) => f.phase_name).filter(Boolean).join(", ");
    if (fases) corpo += `\n\nFases: ${fases}.`;
    const ms = (mitiga.get(o.id) ?? []).map((ref) => porId.get(ref)).filter((m) => m?.name)
      .slice(0, 8).map((m) => `- ${m.name}: ${(m.description ?? "").slice(0, 500)}`);
    if (ms.length) corpo += `\n\n## Mitigações\n${ms.join("\n")}`;
    atk.push({ chave: `attack-${tid}`, titulo: `${tid}: ${o.name}`, texto: `${corpo}\n\n${LIC.attack}`, area: "seguranca" });
  }
  total += escrever("seguranca/attack.jsonl", atk);
  return total;
}

/** REA-MECC: os PDFs, em PORTUGUÊS, CC BY-SA 3.0. Vão como PDF e não como texto extraído, porque
 *  `ingerirPdf` preserva o número de página — que a citação ao aluno usa. */
async function fonteMatematica() {
  const html = await (await fetch(PINS.reaMecc.acervo, { headers: { "User-Agent": "ZaeonBot/1.0" } })).text();
  const urls = [...new Set([...html.matchAll(/href="([^"]+\.pdf)"/g)].map((m) => m[1]))]
    .filter((u) => /^https?:\/\//.test(u))   // href relativo não tem host; descartado
    .filter((u) => !u.includes("ufrgs.br")); // o site do UFRGS está fora (HTTP 000/503 em nov/2026)
  let ok = 0, bytes = 0;
  for (const u of urls) {
    const nome = `${u.split("//")[1].replace(/[^a-zA-Z0-9]+/g, "-").slice(0, 70)}.pdf`;
    const destino = join(SAIDA, "matematica", nome);
    if (existsSync(destino)) { ok++; continue; }
    try {
      const b = await baixar(u, destino);
      if (b.subarray(0, 4).toString() !== "%PDF") { log(`  NÃO-PDF: ${u.split("/").pop()}`); continue; }
      ok++; bytes += b.length;
    } catch (e) { log(`  falhou ${u.split("/").pop()}: ${String(e.message).slice(0, 60)}`); }
  }
  log(`  → matematica/: ${ok}/${urls.length} PDFs (${(bytes / 1048576).toFixed(1)} MB baixados agora)`);
  return ok;
}

// ─────────────────────────────── o manifesto ───────────────────────────────

function manifesto() {
  const itens = [];
  for (const p of arquivos(SAIDA, (x) => !x.includes("/.fontes/") && !x.endsWith("manifesto.json"))) {
    const b = readFileSync(p);
    itens.push({ caminho: relative(SAIDA, p), bytes: b.length, sha256: createHash("sha256").update(b).digest("hex") });
  }
  const docs = itens.filter((i) => i.caminho.endsWith(".jsonl"))
    .reduce((n, i) => n + readFileSync(join(SAIDA, i.caminho), "utf8").split("\n").filter(Boolean).length, 0);
  const m = {
    nome: "zaeon-dataset", versao: "1", gerado_em: new Date().toISOString().slice(0, 10),
    documentos_jsonl: docs, pdfs: itens.filter((i) => i.caminho.endsWith(".pdf")).length,
    totalBytes: itens.reduce((n, i) => n + i.bytes, 0), pins: PINS, arquivos: itens,
  };
  writeFileSync(join(SAIDA, "manifesto.json"), JSON.stringify(m, null, 1));
  return m;
}

async function main() {
  log(`DATASET → ${SAIDA}${SECO ? "  (SECO: nada é escrito)" : ""}`);
  log(`fontes: ${FONTES.join(", ")}\n`);
  if (SECO) {
    for (const f of FONTES) log(`  ${f}: rodaria`);
    log("\n(--seco: nada foi baixado nem escrito)");
    return;
  }
  mkdirSync(SAIDA, { recursive: true });
  const feito = {};
  if (FONTES.includes("constituicao")) { log("constituicao:"); feito.constituicao = fonteConstituicao(); }
  if (FONTES.includes("k8s"))          { log("k8s:");          feito.k8s = fonteK8s(); }
  if (FONTES.includes("mdn"))          { log("mdn:");          feito.mdn = fonteMdn(); }
  if (FONTES.includes("seguranca"))    { log("seguranca:");    feito.seguranca = await fonteSeguranca(); }
  if (FONTES.includes("matematica"))   { log("matematica:");   feito.matematica = await fonteMatematica(); }
  const m = manifesto();
  log(`\nmanifesto: ${m.arquivos.length} arquivos · ${(m.totalBytes / 1048576).toFixed(1)} MB`);
  log(`documentos JSONL: ${m.documentos_jsonl} · PDFs: ${m.pdfs}`);
  log("\nREFERÊNCIA (o que eu medi em 2026-11-08, pra conferir):");
  log("  constituicao 412 · infra 1113 · seguranca 1662 (cwe 956 + attack 706) · software 10654 · 14 PDFs");
}
main().then(() => process.exit(0), (e) => { console.error(String(e?.stack ?? e)); process.exit(1); });
