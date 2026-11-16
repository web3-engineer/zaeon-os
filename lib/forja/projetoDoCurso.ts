/**
 * lib/forja/projetoDoCurso.ts — monta os ARQUIVOS do projeto do aluno a partir dos cards do curso, pra
 * subir no GitHub dele (F3). PURO. Os arquivos saem dos CARDS (conteúdo canônico = o arquivo real, pela
 * invariante da harmonia), NÃO de texto arbitrário do cliente — o aluno reconstrói digitando, e o que
 * sobe é o projeto correto e executável. O residual (arquivos que o aluno não digita) entra por `extras`.
 */
import { montarArquivo, type CardDeArquivo } from "./tutorialArquivo";

export type ArquivoProjeto = { path: string; content: string };

/** README do projeto do aluno — o cartão de visitas do repo. PURA. */
export function readmeDoProjeto(titulo: string, repo: string, arquivos: string[], executar?: string): string {
  const lista = arquivos.map((a) => `- \`${a}\``).join("\n");
  return [
    `# ${titulo}`,
    "",
    "Projeto construído passo a passo na **Zaeon**, digitando o código arquivo por arquivo.",
    "",
    `Baseado no repositório de referência **${repo}**.`,
    "",
    ...(executar ? ["## Como executar", executar, ""] : []),
    "## Arquivos",
    lista || "- (em construção)",
    "",
    "---",
    "_Feito com a Zaeon._",
  ].join("\n");
}

/**
 * Os arquivos do projeto: cada card vira seu arquivo (conteúdo = o arquivo real montado dos snippets),
 * mais os `extras` (residual do Octa) e um README. Dedup por path (o último vence). PURA.
 */
export function arquivosDoProjeto(
  cards: CardDeArquivo[],
  opts: { titulo: string; repo: string; extras?: ArquivoProjeto[]; executar?: string },
): ArquivoProjeto[] {
  const porPath = new Map<string, string>();
  for (const card of cards) {
    if (card.residual) continue; // residual vem do Octa (extras), não dos snippets digitáveis
    porPath.set(card.arquivo, montarArquivo(card));
  }
  for (const e of opts.extras ?? []) porPath.set(e.path, e.content);

  const arquivos: ArquivoProjeto[] = [...porPath.entries()].map(([path, content]) => ({ path, content }));
  arquivos.unshift({ path: "README.md", content: readmeDoProjeto(opts.titulo, opts.repo, [...porPath.keys()], opts.executar) });
  return arquivos;
}

/** Nome do repo do aluno pra um curso: um repo por curso, prefixado e saneado. PURA. */
export function nomeRepoDoCurso(cursoId: string): string {
  const limpo = String(cursoId || "curso").toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
  return `zaeon-${limpo || "curso"}`;
}

/** Os caminhos dos arquivos RESIDUAIS (que o aluno não digita; o Octa monta a partir do source). PURA. */
export function caminhosResiduais(cards: CardDeArquivo[]): string[] {
  const vistos = new Set<string>();
  for (const c of cards) if (c.residual && c.arquivo) vistos.add(c.arquivo);
  return [...vistos];
}

/**
 * QA do projeto montado (F5, server-side — além do portão leve do navegador). PURA. Carimba "pronto pra
 * publicação" só se: tem README não-trivial, pelo menos um arquivo de código (fora o README), e nenhum
 * arquivo vazio. Não executa nada; é a checagem estrutural que roda ANTES do push, no servidor.
 */
export function qaDoProjeto(arquivos: ArquivoProjeto[]): { pronto: boolean; motivos: string[] } {
  const motivos: string[] = [];
  const readme = arquivos.find((a) => a.path.toLowerCase() === "readme.md");
  if (!readme || readme.content.trim().length < 20) motivos.push("README ausente ou vazio.");
  const codigo = arquivos.filter((a) => a.path.toLowerCase() !== "readme.md");
  if (!codigo.length) motivos.push("Nenhum arquivo de código no projeto.");
  const vazio = codigo.find((a) => !a.content.trim());
  if (vazio) motivos.push(`Arquivo vazio: ${vazio.path}.`);
  return { pronto: motivos.length === 0, motivos };
}
