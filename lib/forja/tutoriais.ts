/**
 * lib/forja/tutoriais.ts — cards de TUTORIAL DE ARQUIVO prontos (bundlados na imagem), por cursoId. O
 * curso é o repo real, ensinado arquivo por arquivo; estes cards são o conteúdo FINAL servido quando não
 * há cache gerado. A harmonia (snippets concatenados = o arquivo real executável) é conferida por teste.
 * Client-safe: só importa JSON, sem fs.
 */
import type { CardDeArquivo } from "./tutorialArquivo";
import binarySearch from "./tutoriais/binary-search.json";
import insertionSort from "./tutoriais/insertion-sort.json";
import euclidesMdc from "./tutoriais/euclides-mdc.json";

// cast via unknown (padrão do understand.sample.json): o JSON tem tipos literais que o import alarga.
const card = (j: unknown) => j as unknown as CardDeArquivo;

export const TUTORIAIS: Record<string, CardDeArquivo[]> = {
  // Algoritmos clássicos: os três que a skill promete — busca, ordenação e MDC — cada um um arquivo real.
  "algoritmos-classicos": [card(binarySearch), card(insertionSort), card(euclidesMdc)],
};

/** Os cards de tutorial de arquivo de um curso (vazio se ainda não houver). PURA. */
export function tutoriaisDoCurso(cursoId: string): CardDeArquivo[] {
  return TUTORIAIS[cursoId] ?? [];
}
