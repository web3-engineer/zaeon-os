// RAG por turma/aluno — regras de permissão (PURO, sem I/O).
// Um trecho é visível sse `turmaIds ∩ turmasDaPessoa ≠ ∅` OU `donoIds ∋ pessoa`.
// No Postgres a regra roda no `WHERE` dos dois ramos da busca (lib/rag/busca.ts `montarSql`, nunca depois);
// `podeVer` abaixo é a 2ª checagem, em memória. Os ids de permissão são strings (turma/usuário).

export type EscopoRag = { userId: string; turmaIds: string[] };

/** Há alguma base para consultar (pessoal ou de turma)? */
export function temBase(_e: EscopoRag, contagem: { pessoais: number; deTurma: number }): boolean {
  return contagem.pessoais > 0 || contagem.deTurma > 0;
}

/** Mesma regra, em memória (defesa em profundidade e testes). */
export function podeVer(trecho: { turmaIds: string[]; donoIds: string[] }, e: EscopoRag): boolean {
  return trecho.donoIds.includes(e.userId) || trecho.turmaIds.some((t) => e.turmaIds.includes(t));
}
