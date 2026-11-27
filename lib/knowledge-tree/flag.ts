/**
 * lib/knowledge-tree/flag.ts — a chave da Árvore Neuronal. LIGADA por padrão.
 *
 * Lida no SERVIDOR em tempo de execução (process.env.ARVORE_NEURONAL), não no build: desligar é pôr
 * ARVORE_NEURONAL=0 no .env da VPS e rodar de novo o último deploy (gh run rerun), sem código novo.
 * (Uma NEXT_PUBLIC_* seria embutida no bundle no build e exigiria rebuild.) A rota /api/studio/forja
 * devolve o valor no campo `arvoreNeuronal`; a SalaCurso escolhe o componente por ele.
 */
const DESLIGADO = new Set(["0", "false", "off", "nao", "não", "no"]);

export function arvoreNeuronalLigada(env: Record<string, string | undefined> = process.env): boolean {
  const v = String(env["ARVORE_NEURONAL"] ?? "").trim().toLowerCase();
  return !DESLIGADO.has(v);
}
