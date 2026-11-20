/**
 * scripts/paper-orquestra/comparar.ts — compara um documento gerado com a versão de referência (lib/paper-orquestra/avaliar).
 * Monta a REFERÊNCIAS da referência só com as fontes que ela cita e grava a tabela métrica por métrica.
 *
 *   npx tsx scripts/paper-orquestra/comparar.ts <zaeon.md> <referencia.corpo.md> <fontes.json> <referencia-saida.md> <comparacao-saida.md>
 */
import { readFileSync, writeFileSync } from "node:fs";
import { comparar, documentoDoMarkdown, tabelaDaComparacao } from "@/lib/paper-orquestra/avaliar";
const [zaeonArq, corpoArq, fontesArq, refSaida, relSaida] = process.argv.slice(2);
if (!relSaida) throw new Error("uso: comparar.ts <zaeon.md> <referencia.corpo.md> <fontes.json> <referencia-saida.md> <comparacao-saida.md>");
const fontes: Array<{ citacao: string; abnt: string }> = JSON.parse(readFileSync(fontesArq, "utf8"));
const corpo = readFileSync(corpoArq, "utf8");
// a referência cita (A; B, 2020) dentro de grupos (A, 2020; B, 2021): procura o "miolo" de cada citação
const citadas = fontes.filter((f) => corpo.includes(f.citacao.replace(/^\(|\)$/g, "")));
const refMd = `${corpo.trimEnd()}\n\n## REFERÊNCIAS\n\n${citadas.map((f) => f.abnt).sort((a, b) => a.localeCompare(b, "pt")).join("\n\n")}\n`;
writeFileSync(refSaida, refMd);
const c = comparar(documentoDoMarkdown(readFileSync(zaeonArq, "utf8")), documentoDoMarkdown(refMd));
const txt = `similares: ${c.similares ? "SIM" : "NÃO"}\n\n${tabelaDaComparacao(c)}\n`;
writeFileSync(relSaida, txt);
console.log(txt);
