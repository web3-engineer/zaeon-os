/**
 * scripts/paper-orquestra/fontes-da-rodada.ts — as fontes INCLUÍDAS numa rodada (evidencias.json + biblioteca.json do
 * gerar-local), com a citação e a referência ABNT que o gerador usaria. É a lista com que a versão de referência é escrita.
 *
 *   npx tsx scripts/paper-orquestra/fontes-da-rodada.ts <pasta-da-rodada/caso> <saida.json>
 */
import { readFileSync, writeFileSync } from "node:fs";
import { criarRegistro } from "@/lib/paper-orquestra/texto";
const [dir, saida] = process.argv.slice(2);
const evs = JSON.parse(readFileSync(`${dir}/evidencias.json`, "utf8"));
const bib = JSON.parse(readFileSync(`${dir}/biblioteca.json`, "utf8"));
const norm = (t: string) => t.toLowerCase().replace(/[^a-z0-9]/g, "");
const incluidos = new Set(evs.map((e: any) => norm(e.titulo)));
const reg = criarRegistro(80);
for (const p of bib.papers) if (incluidos.has(norm(p.title ?? ""))) {
  // o resumo pode ter vindo do enrichment: usa o da evidência
  const ev = evs.find((e: any) => norm(e.titulo) === norm(p.title));
  reg.registrar({ ...p, abstract: ev?.resumo || p.abstract }, p.secao);
}
const out = reg.itens().map((e) => ({ citacao: e.fonte.citacao, abnt: e.fonte.abnt, titulo: e.fonte.titulo, resumo: e.resumo }));
writeFileSync(saida, JSON.stringify(out, null, 2));
console.log(out.length, "fontes");
