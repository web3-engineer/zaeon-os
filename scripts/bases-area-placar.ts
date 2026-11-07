/**
 * scripts/bases-area-placar.ts — QUANTO tem em cada base por área do RAG, na VPS.
 *
 *   docker exec -w /app zaeon_web npx tsx scripts/bases-area-placar.ts
 *   docker exec -w /app zaeon_web npx tsx scripts/bases-area-placar.ts --area medicina
 *
 * POR QUE ESTE SCRIPT EXISTE: o dono perguntou "verifique se tem na vps os datasets" e a resposta
 * não era obtível. Os datasets de saúde (rhaymison/medicine-*, Hugging Face) entram pelo
 * `scripts/ingerir-bases-area.ts --fontes medicina`, que é MANUAL (docker exec) e nunca entrou no
 * deploy; o `/api/health` mostra `contabo.rag: on|off|degraded` e nenhuma contagem; e
 * `/api/admin/rag?turmaId=` pede sessão de admin. Ou seja: o dado estava lá (ou não) e ninguém
 * tinha como dizer qual dos dois. Isto diz, em um comando.
 *
 * Lê o MESMO Postgres do RAG (`RAG_PG_URL`, na tailnet) pelas mesmas tabelas da ingestão, e só LÊ.
 * Fora da VPS não roda: a tailnet não alcança daqui, e é por isso que precisa ser `docker exec`.
 */
import { AREAS, AREA_GERAL, idArea } from "../lib/rag/areas";

const args = process.argv.slice(2);
const opt = (k: string, d = "") => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] ?? d : d; };
const SO_AREA = opt("--area");

type Linha = { area: string; documentos: number; trechos: number; comVetor: number; porFonte: Record<string, number> };

async function main() {
  const { ragPg } = await import("../lib/rag/pg");
  const db = ragPg();
  const slugs = SO_AREA ? [SO_AREA] : [...AREAS.map((a) => a.slug), AREA_GERAL];
  const linhas: Linha[] = [];

  for (const slug of slugs) {
    const turma = idArea(slug);
    // documentos da área + trechos + quantos já têm embedding (o worker rag-index vetoriza depois:
    // sem vetor a busca por palavra já acha, então "0 com vetor" não é "base vazia")
    const d = await db.query<{ documentos: string; trechos: string; com_vetor: string }>(
      `SELECT count(DISTINCT d.id) AS documentos,
              count(t.id)         AS trechos,
              count(t.id) FILTER (WHERE t.embedding IS NOT NULL) AS com_vetor
         FROM rag_documentos d
         LEFT JOIN rag_trechos t ON t.documento_id = d.id
        WHERE $1 = ANY(d.turma_ids) AND d.status <> 'erro'`,
      [turma],
    );
    // DE ONDE veio cada um: `criadoPor` é "dataset:<fonte>" na ingestão por área (ingerir-bases-area)
    const f = await db.query<{ criado_por: string; n: string }>(
      `SELECT coalesce(criado_por, '(sem origem)') AS criado_por, count(*) AS n
         FROM rag_documentos WHERE $1 = ANY(turma_ids) AND status <> 'erro'
        GROUP BY 1 ORDER BY 2 DESC`,
      [turma],
    );
    linhas.push({
      area: slug,
      documentos: Number(d.rows[0]?.documentos ?? 0),
      trechos: Number(d.rows[0]?.trechos ?? 0),
      comVetor: Number(d.rows[0]?.com_vetor ?? 0),
      porFonte: Object.fromEntries(f.rows.map((r) => [r.criado_por, Number(r.n)])),
    });
  }

  console.log("área".padEnd(16), "documentos".padStart(11), "trechos".padStart(9), "com vetor".padStart(10));
  for (const l of linhas) {
    console.log(l.area.padEnd(16), String(l.documentos).padStart(11), String(l.trechos).padStart(9), String(l.comVetor).padStart(10));
    for (const [fonte, n] of Object.entries(l.porFonte)) console.log(`${" ".repeat(18)}${fonte}: ${n}`);
  }
  const total = linhas.reduce((s, l) => s + l.documentos, 0);
  console.log(`\ntotal de documentos nas bases por área: ${total}`);
  if (!total) {
    console.log("NENHUM. As bases por área estão vazias — os datasets não foram ingeridos nesta VPS.");
    console.log("Pra encher: scripts/ingerir-bases-area.ts (o cabeçalho dele tem os comandos).");
  }
}
main().then(() => process.exit(0), (e) => { console.error(String(e?.message ?? e)); process.exit(1); });
