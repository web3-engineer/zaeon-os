/**
 * lib/rag/ingerir.ts — PDF → documento + trechos na base RAG (sem vetor ainda; `enfileirar` cuida da indexação).
 *
 * Dedupe por SHA-256 dos bytes: o mesmo arquivo em outra turma/aluno só acrescenta a permissão ao documento
 * existente (não reextrai, não reindexa). Documento em status "erro" não conta como existente: é apagado e o
 * arquivo é processado como novo (re-upload é a forma de tentar de novo).
 */
import { createHash } from "node:crypto";
import type { extractPdfStructured } from "@/lib/scholar/pdf";
import type { Block } from "@/lib/scholar/types";
import { cortarEmTrechos } from "./corte";
import {
  acrescentarPermissao, apagarDocumento, buscarPorHash, criarDocumento, gravarTrechos, marcarErro,
  type Permissao, type RagDocumentoRow,
} from "./store";
import { ehBancoIndisponivel, type RagDb } from "./pg";

export const MAX_BYTES = 25 * 1024 * 1024;

export type IngerirDeps = {
  db: RagDb;
  extrair: typeof extractPdfStructured;
  /** Agenda a indexação (vetores) do documento. O retorno é ignorado. */
  enfileirar: (documentoId: string) => Promise<unknown>;
};

export type IngerirEntrada = {
  bytes: Uint8Array;
  nomeArquivo: string;
  titulo?: string;
  origem: "admin" | "chat" | "gerado";
  criadoPor: string;
  permissao: Permissao;
};

export type IngerirResultado = {
  documentoId: string;
  status: "novo" | "reaproveitado" | "erro";
  erro?: "grande_demais" | "sem_texto" | "leitura_falhou" | "indexacao_falhou" | "banco_indisponivel";
  trechos: number;
  paginas: number;
};

const sha256 = (b: Uint8Array) => createHash("sha256").update(b).digest("hex");
const semPdf = (nome: string) => nome.replace(/\.pdf$/i, "");
const maiorPagina = (blocks: Block[]) => blocks.reduce((m, b) => (typeof b.page === "number" && b.page > m ? b.page : m), 0);

/**
 * `reenfileirar`: documento já existente que ficou "indexando" (job perdido, Redis limpo, worker caiu) é re-agendado —
 * `enfileirar` é idempotente (jobId fixo; `indexarDocumento` só manda o que falta), então re-upload é a forma de destravar.
 */
async function reaproveitar(deps: IngerirDeps, doc: RagDocumentoRow, perm: Permissao, reenfileirar = true): Promise<IngerirResultado> {
  await acrescentarPermissao(deps.db, doc.id, perm);
  if (reenfileirar && doc.status === "indexando") {
    try {
      await deps.enfileirar(doc.id);
    } catch (err) {
      console.warn("[rag] reaproveitar: não consegui re-agendar a indexação", doc.id, (err as Error)?.message ?? err);
    }
  }
  return { documentoId: doc.id, status: "reaproveitado", trechos: doc.totalTrechos, paginas: doc.paginas };
}

/**
 * Postgres fora do ar (tailnet caída, reiniciando, RAG_PG_URL ausente) em QUALQUER ponto da ingestão ⇒ `banco_indisponivel`:
 * erro legível para o admin, nunca "PDF sem texto"/"não consegui ler" (o arquivo não tem culpa). Outros erros propagam.
 */
export async function ingerirPdf(deps: IngerirDeps, e: IngerirEntrada): Promise<IngerirResultado> {
  try {
    return await ingerir(deps, e);
  } catch (err) {
    if (!ehBancoIndisponivel(err)) throw err;
    console.error("[rag] ingestão: banco indisponível:", (err as Error)?.message ?? err);
    return { documentoId: "", status: "erro", erro: "banco_indisponivel", trechos: 0, paginas: 0 };
  }
}

/** Queda do banco depois de o documento existir: tenta (best-effort) tirá-lo de "indexando" — o reenvio o reprocessa — e propaga. */
async function propagarQuedaDoBanco(db: RagDb, documentoId: string, err: unknown): Promise<never> {
  await marcarErro(db, documentoId, "indexacao_falhou").catch(() => {});
  throw err;
}

async function ingerir(deps: IngerirDeps, e: IngerirEntrada): Promise<IngerirResultado> {
  const { db } = deps;
  if (e.bytes.byteLength > MAX_BYTES) return { documentoId: "", status: "erro", erro: "grande_demais", trechos: 0, paginas: 0 };

  const hash = sha256(e.bytes);
  const existente = await buscarPorHash(db, hash);
  // Permissões do documento em "erro" que vai ser apagado: outras turmas/donos que o tinham por dedupe não perdem acesso.
  let herdadas: Permissao[] = [];
  if (existente) {
    if (existente.status !== "erro") return reaproveitar(deps, existente, e.permissao);
    herdadas = [
      ...(existente.turmaIds ?? []).map((turmaId: string) => ({ turmaId })),
      ...(existente.donoIds ?? []).map((donoId: string) => ({ donoId })),
    ];
    await apagarDocumento(db, existente.id); // tentativa anterior falhou: reprocessa
  }

  const titulo = e.titulo?.trim() || semPdf(e.nomeArquivo);

  // Extração + corte. Qualquer falha de leitura vira documento em "erro" (aparece na lista do admin).
  let blocks: Block[] = [];
  let markdown = "";
  let erro: "sem_texto" | "leitura_falhou" | null = null;
  let trechosCortados: ReturnType<typeof cortarEmTrechos> = [];
  try {
    const r = await deps.extrair(e.bytes);
    if (r == null) {
      // extractPdfStructured nunca lança: devolve null com PDF_LOADER_URL ausente, HTTP != 2xx ou timeout.
      // É falha do leitor (queda/config), não PDF escaneado — não induzir o admin a culpar o arquivo.
      erro = "leitura_falhou";
    } else {
      blocks = r.blocks ?? [];
      markdown = r.markdown ?? blocks.map((b) => b.text).join("\n\n");
      trechosCortados = blocks.length ? cortarEmTrechos(blocks, titulo) : [];
      if (trechosCortados.length === 0) erro = "sem_texto";
    }
  } catch {
    erro = "leitura_falhou";
  }
  const paginas = maiorPagina(blocks);

  let doc: RagDocumentoRow;
  try {
    doc = await criarDocumento(db, {
      hash, titulo, nomeArquivo: e.nomeArquivo, paginas, markdown, origem: e.origem, criadoPor: e.criadoPor, permissao: e.permissao,
    });
  } catch (err) {
    // Upload concorrente do mesmo arquivo: o hash é único, o outro ganhou — reaproveita o dele.
    // "23505" = violação de unicidade do Postgres.
    if ((err as { code?: string })?.code === "23505") {
      const vencedor = await buscarPorHash(db, hash);
      if (vencedor) return reaproveitar(deps, vencedor, e.permissao, false); // o vencedor já agenda a própria indexação
    }
    throw err;
  }

  // Re-upload sobre "erro": o documento novo herda as permissões do apagado, além da de quem subiu.
  if (herdadas.length > 0) {
    try {
      for (const p of herdadas) await acrescentarPermissao(db, doc.id, p);
      doc = (await buscarPorHash(db, hash)) ?? doc; // arrays de permissão atualizados para copiar nos trechos
    } catch (err) {
      if (ehBancoIndisponivel(err)) return propagarQuedaDoBanco(db, doc.id, err);
      console.warn("[rag] ingestão: falha ao herdar permissões", doc.id, (err as Error)?.message ?? err);
      await marcarErro(db, doc.id, "indexacao_falhou");
      return { documentoId: doc.id, status: "erro", erro: "indexacao_falhou", trechos: 0, paginas };
    }
  }

  if (erro) {
    await marcarErro(db, doc.id, erro);
    return { documentoId: doc.id, status: "erro", erro, trechos: 0, paginas };
  }

  try {
    const total = await gravarTrechos(db, doc.id, trechosCortados, { turmaIds: doc.turmaIds, donoIds: doc.donoIds });
    await deps.enfileirar(doc.id);
    return { documentoId: doc.id, status: "novo", trechos: total, paginas };
  } catch (err) {
    if (ehBancoIndisponivel(err)) return propagarQuedaDoBanco(db, doc.id, err);
    // Sem isto o documento ficaria "indexando" para sempre e um re-upload viraria "reaproveitado".
    // Em "erro", o re-upload apaga e reprocessa (dedupe ignora documento em erro).
    console.warn("[rag] ingestão: falha após criar o documento", doc.id, (err as Error)?.message ?? err);
    await marcarErro(db, doc.id, "indexacao_falhou");
    return { documentoId: doc.id, status: "erro", erro: "indexacao_falhou", trechos: 0, paginas };
  }
}
