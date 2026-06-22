/**
 * Montadores/parsers PUROS da requisição do Imagen (Vertex `:predict`). Sem rede —
 * o wrapper com auth+fetch fica em lib/studio/imagen.ts.
 *
 * Imagem didática dentro do crédito GenAI do Google (Imagen 4). Saída:
 * predictions[0].bytesBase64Encoded (+ mimeType, geralmente image/png).
 */

export interface ImagenOptions {
  count?: number; // nº de imagens (default 1)
  aspectRatio?: string; // "1:1" | "16:9" | "9:16" | "4:3" | "3:4"
}

export interface ImagenBody {
  instances: { prompt: string }[];
  parameters: { sampleCount: number; aspectRatio: string };
}

export function buildImagenBody(prompt: string, opts?: ImagenOptions): ImagenBody {
  return {
    instances: [{ prompt }],
    parameters: {
      sampleCount: Math.max(1, Math.min(4, opts?.count ?? 1)),
      aspectRatio: opts?.aspectRatio || "1:1",
    },
  };
}

/** Extrai a 1ª imagem (base64 + mime). Aceita camelCase e snake_case. */
export function parseImagenResponse(json: any): { data: string; mimeType: string } | null {
  const p = json?.predictions?.[0];
  if (!p) return null;
  const data = p.bytesBase64Encoded ?? p.bytes_base64_encoded;
  if (!data) return null;
  return { data, mimeType: p.mimeType || p.mime_type || "image/png" };
}
