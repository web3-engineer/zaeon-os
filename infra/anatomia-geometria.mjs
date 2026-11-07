/**
 * infra/anatomia-geometria.mjs — põe a GEOMETRIA do Atlas do Corpo no volume, uma vez.
 *
 * Roda DENTRO do contêiner web, pelo mesmo caminho do recibo:
 *     docker compose exec -T web node < infra/anatomia-geometria.mjs
 * (canalizado por STDIN, então o arquivo nem precisa estar na imagem — e não precisa de curl nem
 * de sha256sum instalados: `fetch` e `node:crypto` já vêm no node 20.)
 *
 * ──────────────── Por que a geometria NÃO está no repositório ────────────────
 * São 31,4 MB em 15 pedaços. Versioná-los engordaria todo clone, todo build e todo checkout do CI
 * para sempre, por um dado que NUNCA muda. O manifesto (1,3 MB) esse sim é versionado, porque é o
 * que a busca e a inspeção do mentor usam — e é por isso que a habilidade de anatomia do Osler
 * funciona mesmo com a geometria ausente. As duas metades falham separado e o /api/health as
 * publica separado.
 *
 * ──────────────── Por que sha256 e não tamanho ────────────────
 * Tamanho não distingue "baixou certo" de "baixou uma página de erro de 2 MB" nem de "o proxy
 * cortou e o disco ficou com lixo do tamanho certo". E a origem é um repositório de TERCEIRO: o
 * commit está PRESO (não é `main`), mas mesmo assim cada arquivo é conferido contra o hash que eu
 * medi dos arquivos reais. Hash errado = arquivo apagado e contado como falha, nunca aceito.
 *
 * ──────────────── Por que ele não derruba o deploy ────────────────
 * Sem geometria, o site inteiro funciona: só o visualizador 3D fica vazio e a busca anatômica
 * segue de pé. Então a falha é RELATADA (saída ≠ 0 e linhas explícitas) e quem decide se isso
 * interrompe o deploy é o workflow, não este script. O que ele nunca faz é ficar calado.
 */
import { createHash } from "node:crypto";
import { mkdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";

const RAIZ = process.env.ATLAS_RAIZ || "/app";
const DESTINO = process.env.ATLAS_GEOMETRIA_DIR || join(RAIZ, "public/models/body");
const MANIFESTO = join(RAIZ, "public/models/geometria.sha256.json");
/** Dá para apontar para um espelho próprio sem mexer no código — ver nota de terceiro acima. */
const BASE_ENV = process.env.ATLAS_GEOMETRIA_BASE;
const TENTATIVAS = 3;

const mb = (n) => (n / 1048576).toFixed(1);
const hashDe = (buf) => createHash("sha256").update(buf).digest("hex");

async function confere(caminho, esperado) {
  try {
    const info = await stat(caminho);
    if (info.size !== esperado.bytes) return false;
    return hashDe(await readFile(caminho)) === esperado.sha256;
  } catch {
    return false;
  }
}

async function baixar(url, esperado) {
  let ultimo = "";
  for (let t = 1; t <= TENTATIVAS; t++) {
    try {
      const r = await fetch(url, { redirect: "follow" });
      if (!r.ok) { ultimo = `HTTP ${r.status}`; continue; }
      const buf = Buffer.from(await r.arrayBuffer());
      if (buf.length !== esperado.bytes) { ultimo = `${buf.length} bytes em vez de ${esperado.bytes}`; continue; }
      const h = hashDe(buf);
      if (h !== esperado.sha256) { ultimo = `sha256 ${h.slice(0, 12)}… não é o esperado`; continue; }
      return buf;
    } catch (e) {
      ultimo = e instanceof Error ? e.message : String(e);
    }
    if (t < TENTATIVAS) await new Promise((r) => setTimeout(r, 1000 * 2 ** t));
  }
  throw new Error(ultimo || "falha desconhecida");
}

async function principal() {
  let manifesto;
  try {
    manifesto = JSON.parse(await readFile(MANIFESTO, "utf8"));
  } catch {
    console.log(`→ Atlas(geometria): SEM manifesto de integridade em ${MANIFESTO} — nada a fazer`);
    process.exit(1);
  }
  const base = BASE_ENV || manifesto.origem;
  const nomes = Object.keys(manifesto.arquivos ?? {});
  if (!nomes.length) { console.log("→ Atlas(geometria): manifesto vazio"); process.exit(1); }

  await mkdir(DESTINO, { recursive: true });

  let jaEstavam = 0, baixados = 0, bytesBaixados = 0;
  const falhas = [];

  for (const nome of nomes) {
    const esperado = manifesto.arquivos[nome];
    const caminho = join(DESTINO, nome);
    if (await confere(caminho, esperado)) { jaEstavam++; continue; }

    const temp = `${caminho}.parcial`;
    try {
      const buf = await baixar(base + nome, esperado);
      await writeFile(temp, buf);
      await rename(temp, caminho);          // troca ATÔMICA: nunca existe arquivo meio escrito
      baixados++; bytesBaixados += buf.length;
    } catch (e) {
      await rm(temp, { force: true }).catch(() => {});
      await rm(caminho, { force: true }).catch(() => {});   // nada pela metade fica no volume
      falhas.push(`${nome}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  const total = nomes.length;
  if (jaEstavam === total) {
    console.log(`→ Atlas(geometria): ${total}/${total} já no volume (${mb(manifesto.totalBytes)} MB) — nada a baixar`);
  } else {
    console.log(`→ Atlas(geometria): ${jaEstavam + baixados}/${total} prontos · ${baixados} baixados (${mb(bytesBaixados)} MB)`);
  }
  if (falhas.length) {
    console.log(`→ Atlas(geometria): ${falhas.length} FALHARAM — o visualizador 3D fica vazio, a busca do mentor NÃO`);
    for (const f of falhas.slice(0, 5)) console.log(`   · ${f}`);
    process.exit(1);
  }
  process.exit(0);
}

principal().catch((e) => {
  console.log(`→ Atlas(geometria): erro inesperado — ${e instanceof Error ? e.message : String(e)}`);
  process.exit(1);
});
