#!/usr/bin/env node
/**
 * scripts/provas-reais-check.mjs — a TRAVA contra "subiu com fetch mockado como critério".
 *
 * Lê config/provas-reais.json e garante que todo motor PRÓPRIO (serviço de infra nossa) tem uma PROVA REAL
 * (um smoke/sonda/live test que bate no serviço de verdade) e que o arquivo dessa prova EXISTE no repo.
 * REPROVA (exit 1) se um motor próprio está sem prova ou aponta pra uma prova inexistente.
 *
 * Mock prova que o request está certo; só a prova real prova que o serviço responde. Ver docs/PROVAS_REAIS.md.
 * Roda no portão, junto de tsc/lint/vitest/compose-check.
 */
import { readFile } from "node:fs/promises";
import { access } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const existe = (p) => access(join(RAIZ, p)).then(() => true).catch(() => false);

const reg = JSON.parse(await readFile(join(RAIZ, "config/provas-reais.json"), "utf8"));
const motores = Array.isArray(reg?.motores) ? reg.motores : [];
if (!motores.length) { console.error("✗ config/provas-reais.json sem motores"); process.exit(1); }

let falhas = 0;
const linhas = [];
for (const m of motores) {
  const nome = m.nome ?? "(sem nome)";
  const proprio = m.tipo === "proprio";
  let veredito, detalhe = m.prova || "—";
  if (proprio) {
    if (m.status !== "coberto") { veredito = "✗ GAP"; detalhe = `status="${m.status}" (motor próprio PRECISA de prova)`; falhas++; }
    else if (!m.prova) { veredito = "✗ GAP"; detalhe = "sem prova apontada"; falhas++; }
    else if (!(await existe(m.prova))) { veredito = "✗ PROVA SUMIU"; detalhe = `${m.prova} não existe no repo`; falhas++; }
    else veredito = "✓ coberto";
  } else {
    // terceiro: só informativo (aceito como débito conhecido)
    veredito = m.status === "aceito" || m.status === "coberto" ? "· aceito (3º)" : "⚠ 3º sem decisão";
    if (m.prova && !(await existe(m.prova))) { veredito = "✗ PROVA SUMIU"; detalhe = `${m.prova} não existe`; falhas++; }
  }
  linhas.push(`  ${veredito.padEnd(16)} ${String(nome).padEnd(36)} ${detalhe}`);
}

console.log("\nProvas reais dos motores (config/provas-reais.json):\n");
console.log(linhas.join("\n"));
if (falhas) {
  console.error(`\n✗ ${falhas} motor(es) próprio(s) sem prova real. Mock NÃO é critério de pronto — crie o smoke/sonda e aponte no registro. Ver docs/PROVAS_REAIS.md.`);
  process.exit(1);
}
console.log(`\n✓ todos os motores próprios têm prova real registrada e presente.`);
