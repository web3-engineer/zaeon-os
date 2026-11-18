/**
 * lib/forja/residualDoRepo.ts — SÓ SERVIDOR. O RESIDUAL (F4): os arquivos que o aluno NÃO digita, montados
 * a partir do source pro projeto rodar inteiro. O dono definiu que o residual vem do Octa (copiando/
 * adaptando do source), nunca do agente QA. Esta é a peça que PEGA esses arquivos do repo-fonte.
 *
 * Escopo (a harmonia): só os caminhos que os cards marcam `residual` (boilerplate/config que o F2 marca ao
 * gerar). NUNCA o repo inteiro — isso copiaria o source todo e quebraria a ideia de "o aluno digita o que
 * importa". Hoje, sem F2, o demo não marca nada → no-op; a máquina fica pronta pro F2.
 */
import { caminhosResiduais } from "./projetoDoCurso";
import type { ArquivoProjeto } from "./projetoDoCurso";
import type { CardDeArquivo } from "./tutorialArquivo";
import { readFile } from "@/lib/projects/github-service";

type AnyOctokit = any;

/** Teto de segurança: nunca puxa um repo inteiro como "residual". */
const MAX_RESIDUAIS = 40;

/**
 * Lê do repo-fonte os arquivos marcados residuais e devolve como ArquivoProjeto[] (pra virar `extras` de
 * `arquivosDoProjeto`). Um arquivo que não dá pra ler é pulado — o residual é best-effort; o que trava a
 * publicação é o QA estrutural, não um residual faltando.
 */
export async function residualDoProjeto(
  octokit: AnyOctokit,
  refRepo: string,
  cards: CardDeArquivo[],
): Promise<ArquivoProjeto[]> {
  const caminhos = caminhosResiduais(cards).slice(0, MAX_RESIDUAIS);
  if (!caminhos.length) return [];
  const lidos = await Promise.all(
    caminhos.map(async (path) => {
      try {
        const f = await readFile(octokit, { repo: refRepo }, path);
        return { path, content: f.body } as ArquivoProjeto;
      } catch {
        return null;
      }
    }),
  );
  return lidos.filter((x): x is ArquivoProjeto => x !== null);
}
