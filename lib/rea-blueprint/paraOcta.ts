/**
 * BLUEPRINT REA → PROJETO OCTA. A ponte: lê o blueprint da pessoa, monta o scaffold (site estático)
 * e cria um projeto na Octa com esses arquivos. O aluno então abre a IDE e usa o botão "Publicar"
 * que já existe (repo + GitHub Pages na conta dele).
 *
 * As dependências são INJETADAS (ler o blueprint, criar o projeto, salvar os arquivos) — assim esta
 * lógica é testável sem Prisma, e a rota só liga os fios com as implementações reais.
 */
import { scaffoldDoBlueprint, nomeDoProjeto } from "./scaffold";
import type { DocReaBlueprint } from "./tipos";
import type { Arquivos, Projeto } from "@/lib/octa/projetos";

export type DepsParaOcta = {
  /** o blueprint da pessoa (reaDoUsuario) — null = não existe ou não é dela */
  lerBlueprint: (reaId: string, userId: string) => Promise<{ doc: DocReaBlueprint } | null>;
  /** cria o projeto Octa vazio (criarProjeto) */
  criarProjeto: (userId: string, nome: string) => Promise<Projeto>;
  /** grava os arquivos no projeto (salvarArquivos) — null = projeto sumiu */
  salvarArquivos: (userId: string, projetoId: string, arquivos: Arquivos) => Promise<Projeto | null>;
};

export type ResultadoParaOcta =
  | { ok: true; projetoId: string; slug: string; nome: string; arquivos: string[] }
  | { ok: false; motivo: "nao_encontrado" | "vazio" | "falhou" };

/** O blueprint tem conteúdo que valha um projeto? (o cartão só aparece depois de compor, mas guardamos a borda.) */
export function temConteudo(doc: DocReaBlueprint): boolean {
  return !!(doc.comoFunciona?.trim() || doc.achados.length || doc.reconstrucao.length || doc.resumo?.trim());
}

export async function blueprintParaOcta(deps: DepsParaOcta, reaId: string, userId: string): Promise<ResultadoParaOcta> {
  const encontrado = await deps.lerBlueprint(reaId, userId);
  if (!encontrado) return { ok: false, motivo: "nao_encontrado" };
  const { doc } = encontrado;
  // um blueprint ainda em branco (0 turnos) não vira site: não há o que mostrar nem o que publicar
  if (!temConteudo(doc)) return { ok: false, motivo: "vazio" };

  const projeto = await deps.criarProjeto(userId, nomeDoProjeto(doc));
  const arquivos = scaffoldDoBlueprint(doc);
  const salvo = await deps.salvarArquivos(userId, projeto.id, arquivos);
  if (!salvo) return { ok: false, motivo: "falhou" };

  return { ok: true, projetoId: projeto.id, slug: salvo.slug, nome: salvo.nome, arquivos: Object.keys(arquivos) };
}
