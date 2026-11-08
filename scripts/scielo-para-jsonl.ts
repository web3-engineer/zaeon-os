/**
 * scripts/scielo-para-jsonl.ts — `dataseek/ptbr-scielo` (2,7 GB em parquet) → JSONL leve por área.
 *
 *   npx tsx scripts/scielo-para-jsonl.ts --seco --linhas 20000      # classifica e conta, não grava
 *   npx tsx scripts/scielo-para-jsonl.ts --saida /opt/zaeon/dataset/scielo/scielo.jsonl
 *   npx tsx scripts/scielo-para-jsonl.ts --grupos 1                 # só o grupo pequeno
 *
 * SUBSTITUI o scripts/scielo-para-jsonl.py. O que muda, e por quê:
 *   · sem Python e sem pyarrow — lê o parquet com `hyparquet`, que já é dependência daqui;
 *   · usa o `tituloEResumo` de lib/rag/areas, o MESMO que o classificador usa. O .py tinha uma
 *     reimplementação em Python da mesma regra, e duas cópias de uma regra divergem sozinhas;
 *   · a saída NÃO é mais /tmp. A base morreu assim: 7.292 documentos ingeridos, o /tmp limpo, e a
 *     execução não pôde ser retomada porque o JSONL tinha sumido. O padrão agora é a pasta do
 *     DATASET, que é durável.
 *
 * O CUSTO DE MEMÓRIA É REAL, MEDIDO, E ALTO:
 *
 *     grupo 0 (122.491 linhas)  →  pico 10.983 MB,  68 s
 *     grupo 1  (31.727 linhas)  →  pico  3.858 MB,  26 s   (medido rodando sozinho)
 *     os dois juntos            →  pico 10.983 MB,  84 s  ·  saída de 408 MB
 *
 * Não é falha nossa nem conserto possível no leitor — o arquivo tem 2 grupos de linha (o maior com
 * 4 GB descomprimidos), páginas de dados gigantes e NENHUM índice de página. Medi as três coisas:
 * ler 50 linhas custa o mesmo que ler 20 mil, e `onPage` devolveu UMA página com 20.557 valores.
 * Ou seja: não existe ler um pedaço, e fatiar só multiplicaria o tempo.
 *
 * SE A MÁQUINA NÃO TEM ~12 GB LIVRES, use `--grupos 1`: são 31.727 artigos num pico de 3,9 GB, e
 * ainda assim caem nas 17 áreas (agronomia 285, eng-civil 187, farmacia 160, veterinaria 56).
 * O grupo 0 não tem versão barata: ou cabe, ou fica de fora.
 *
 * POR ISSO, NÃO RODE DENTRO DO zaeon_web. O contêiner web não tem limite de memória declarado no
 * compose, então um pico de 11 GB disputa RAM com o servidor e o OOM killer do host pode escolher o
 * node do servidor. Rode num contêiner descartável, e só depois ingira (que é barato):
 *
 *   docker run --rm -m 12g -v /opt/zaeon/dataset:/saida -v $PWD:/app -w /app node:20-slim \
 *     sh -c "npm i -s hyparquet tsx && npx tsx scripts/scielo-para-jsonl.ts --saida /saida/scielo/scielo.jsonl"
 *   docker exec -w /app zaeon_web npx tsx scripts/ingerir-bases-area.ts --fontes scielo --dir /opt/zaeon/dataset/scielo
 *
 * Licença: CC BY 4.0 (lida do cardData do dataset). A atribuição entra no texto de cada documento
 * na ingestão, não aqui — aqui só sai título e resumo.
 */
import { appendFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { classificarArea, tituloEResumo } from "../lib/rag/areas";

export const SCIELO_PARQUET =
  "https://huggingface.co/datasets/dataseek/ptbr-scielo/resolve/main/data/data_0.parquet";

const args = process.argv.slice(2);
const opt = (k: string, d: string) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] ?? d : d; };
const SECO = args.includes("--seco");
const SAIDA = opt("--saida", "/opt/zaeon/dataset/scielo/scielo.jsonl");
const PARQUET = opt("--parquet", SCIELO_PARQUET);
const LINHAS = Number(opt("--linhas", String(Number.MAX_SAFE_INTEGER)));
const GRUPOS = opt("--grupos", "");   // "" = todos; "1" = só o grupo 1; "0,1" = ambos

/** O mesmo mínimo da fonte `scielo` na ingestão: resumo curto não ensina e não classifica. */
const MIN_RESUMO = 400;

async function main() {
  const { asyncBufferFromUrl, parquetMetadataAsync, parquetReadObjects } = await import("hyparquet").catch((e: unknown) => {
    throw new Error(`o pacote \`hyparquet\` não está aqui. Instale com \`npm i hyparquet\`. Erro: ${(e as Error)?.message ?? e}`);
  });

  const file = await asyncBufferFromUrl({ url: PARQUET });
  const metadata = await parquetMetadataAsync(file);
  const grupos = metadata.row_groups.map((g, i) => ({ i, linhas: Number(g.num_rows), bytes: Number(g.total_byte_size) }));
  const escolhidos = GRUPOS ? GRUPOS.split(",").map(Number) : grupos.map((g) => g.i);

  console.log(`fonte: ${PARQUET}`);
  console.log(`  ${(file.byteLength / 1048576).toFixed(0)} MB · ${Number(metadata.num_rows).toLocaleString("pt-BR")} artigos · ${grupos.length} grupos de linha`);
  for (const g of grupos) {
    console.log(`  grupo ${g.i}: ${g.linhas.toLocaleString("pt-BR")} linhas, ${(g.bytes / 1048576).toFixed(0)} MB descomprimidos${escolhidos.includes(g.i) ? "  ← vai ler" : "  (pulado)"}`);
  }
  console.log(SECO ? "\n[seco] nada será gravado\n" : `\nsaída: ${SAIDA}\n`);

  if (!SECO) { mkdirSync(dirname(SAIDA), { recursive: true }); writeFileSync(SAIDA, ""); }

  const porArea: Record<string, number> = {};
  let lidas = 0, escritas = 0, curtos = 0, semArea = 0, pico = 0;
  const marcarPico = () => { pico = Math.max(pico, process.memoryUsage().rss); };
  const relogio = setInterval(marcarPico, 500);

  let inicio = 0;
  for (const g of grupos) {
    if (!escolhidos.includes(g.i)) { inicio += g.linhas; continue; }
    const fim = Math.min(inicio + g.linhas, LINHAS);
    if (fim <= inicio) break;
    const t0 = Date.now();
    console.log(`[grupo ${g.i}] lendo ${(fim - inicio).toLocaleString("pt-BR")} linhas — isto é a parte cara`);
    // Um grupo inteiro de uma vez: medi que ler 50 linhas custa o mesmo que ler o grupo todo,
    // então fatiar só multiplicaria o tempo sem baixar o pico.
    const linhas = await parquetReadObjects({
      file, metadata, rowStart: inicio, rowEnd: fim, columns: ["doc_id", "year", "text"],
    }) as { doc_id?: unknown; year?: unknown; text?: unknown }[];
    marcarPico();
    console.log(`[grupo ${g.i}] ${linhas.length.toLocaleString("pt-BR")} linhas em ${((Date.now() - t0) / 1000).toFixed(0)}s · rss ${(process.memoryUsage().rss / 1048576).toFixed(0)} MB`);

    const lote: string[] = [];
    for (const r of linhas) {
      lidas++;
      const { titulo, resumo } = tituloEResumo(String(r.text ?? ""));
      if (!titulo || resumo.length < MIN_RESUMO) { curtos++; continue; }
      const c = classificarArea(titulo, resumo);
      if (c) porArea[c.slug] = (porArea[c.slug] ?? 0) + 1; else semArea++;
      escritas++;
      if (!SECO) {
        lote.push(JSON.stringify({ doc_id: String(r.doc_id ?? ""), year: Number(r.year ?? 0), titulo, resumo }));
        if (lote.length >= 2000) { appendFileSync(SAIDA, `${lote.join("\n")}\n`); lote.length = 0; }
      }
    }
    if (!SECO && lote.length) appendFileSync(SAIDA, `${lote.join("\n")}\n`);
    inicio += g.linhas;
    if (lidas >= LINHAS) break;
  }
  clearInterval(relogio);
  marcarPico();

  console.log(`\nlidas ${lidas.toLocaleString("pt-BR")} · aproveitadas ${escritas.toLocaleString("pt-BR")} · resumo curto ${curtos.toLocaleString("pt-BR")} · sem área ${semArea.toLocaleString("pt-BR")}`);
  console.log(`pico de memória: ${(pico / 1048576).toFixed(0)} MB`);
  console.log("\nclassificação por área (é ela que decide quem é coberto):");
  for (const [a, n] of Object.entries(porArea).sort((x, y) => y[1] - x[1])) {
    console.log(`  ${a.padEnd(16)} ${String(n).padStart(6)}  ${"█".repeat(Math.min(34, Math.round(n / Math.max(1, Math.max(...Object.values(porArea))) * 34)))}`);
  }
  if (!SECO) console.log(`\npronto: ${escritas.toLocaleString("pt-BR")} artigos em ${SAIDA}`);
}
main().then(() => process.exit(0), (e) => { console.error(String(e?.stack ?? e)); process.exit(1); });
