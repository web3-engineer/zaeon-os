/**
 * lib/forja/tutoriaisDemo.ts — cards de TUTORIAL DE ARQUIVO feitos à mão (F1), pra provar a interação
 * (card + editor digitado, ponta-a-ponta). A GERAÇÃO dos cards a partir do repo real é a F2 (na box).
 * Client-safe: só importa JSON, sem fs. Chave = cursoId.
 */
import type { CardDeArquivo } from "./tutorialArquivo";
import binarySearch from "./tutoriais/binary-search.json";

export const TUTORIAIS_DEMO: Record<string, CardDeArquivo[]> = {
  // cast via unknown (padrão do understand.sample.json): o JSON tem tipos literais que o import alarga.
  "algoritmos-classicos": [binarySearch as unknown as CardDeArquivo],
};

/** Os cards de tutorial de arquivo de um curso (vazio se ainda não houver). PURA. */
export function tutorialDemoDoCurso(cursoId: string): CardDeArquivo[] {
  return TUTORIAIS_DEMO[cursoId] ?? [];
}
