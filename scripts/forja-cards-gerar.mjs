#!/usr/bin/env -S npx tsx
/**
 * scripts/forja-cards-gerar.mjs — gera os CARDS de tutorial de um repo (F2) e popula o cache.
 *
 * A geração tem duas metades:
 *   1) PLANOS (LLM, na box): um passo de modelo lê cada arquivo do repo clonado e decide ONDE cortar e o
 *      que ensinar — produz um `planos.json` (PlanoDeArquivo[]). NÃO reproduz o código. Ver docs.
 *   2) MONTAGEM (determinística, aqui): este script lê os arquivos REAIS do repo e aplica `cardsValidados`,
 *      que fatia cada arquivo nos cortes do plano e DESCARTA o que não reconstrói o arquivo (garante a
 *      harmonia). O resultado validado vai pro cache (FORJA_CARDS_CACHE), que o curso lê.
 *
 * Uso:  FORJA_CARDS_CACHE=/vol/cards npx tsx scripts/forja-cards-gerar.mjs \
 *         --repo owner/name --dir /caminho/do/repo/clonado --planos /caminho/planos.json
 */
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { cardsValidados } from "../lib/forja/cardsDoRepo.ts";
import { gravarCardsCache, CAMINHO_CACHE_CARDS } from "../lib/forja/cardsLocal.ts";

function arg(nome) {
  const i = process.argv.indexOf(`--${nome}`);
  return i !== -1 ? process.argv[i + 1] : undefined;
}

async function main() {
  const repo = arg("repo"), dir = arg("dir"), planosPath = arg("planos");
  if (!repo || !dir || !planosPath) {
    console.error("uso: --repo owner/name --dir <repo-clonado> --planos <planos.json>");
    process.exit(2);
  }
  const planos = JSON.parse(await readFile(planosPath, "utf8"));
  if (!Array.isArray(planos)) { console.error("planos.json deve ser um array de PlanoDeArquivo"); process.exit(2); }

  // lê o conteúdo REAL de cada arquivo citado nos planos.
  const conteudos = {};
  for (const p of planos) {
    try { conteudos[p.arquivo] = await readFile(join(dir, p.arquivo), "utf8"); }
    catch { console.warn(`  (pulando ${p.arquivo}: não achei no repo)`); }
  }

  const cards = cardsValidados(planos, conteudos);
  const descartados = planos.length - cards.length;
  await gravarCardsCache(repo, cards);
  console.log(`✓ ${repo}: ${cards.length} card(s) validado(s)${descartados > 0 ? ` (${descartados} descartado(s) por quebrar a harmonia)` : ""} → ${CAMINHO_CACHE_CARDS}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
