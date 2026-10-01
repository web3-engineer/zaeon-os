/**
 * Tipos + lista de tipos da cartolina — módulo CLIENT-SAFE (zero import de servidor).
 *
 * Existe separado de cartolina.ts porque aquele importa (dinamicamente) o cliente Gemini/
 * Vertex; qualquer VALOR importado de lá por um componente cliente arrastava o SDK do
 * Google pro bundle do navegador e quebrava o build ("Can't resolve 'child_process'").
 */
export type CardTipo = "titulo" | "nota" | "pergunta" | "exercicio" | "prancha" | "video";

export interface CartolinaCard {
  id: string;
  tipo: CardTipo;
  titulo?: string;
  corpo?: string;
  resposta?: string;   // só exercicio
  legenda?: string;    // prancha/vídeo
  x: number; y: number; w: number; rot?: number;
  /** Memória por região: as mensagens do chat que geraram este card (tap → abre a conversa). */
  msgIds?: string[];
  /** Prancha desenhada pela Aura: PRIMITIVAS validadas (o SVG é recompilado no cliente). */
  desenho?: import("@/lib/harness/caderno/compile").Desenho;
  /** Fallback da prancha: StudioArtifact de imagem (servido por /api/cartolina/:id/imagem/:artId). */
  imagemId?: string;
}

/** O que a Aura devolve (antes do layout). */
export interface AuraCartolina {
  titulo: string;
  itens: Array<{ tipo: CardTipo; titulo?: string; corpo?: string; resposta?: string; legenda?: string }>;
}

export const TIPOS: CardTipo[] = ["titulo", "nota", "pergunta", "exercicio", "prancha", "video"];
