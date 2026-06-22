/**
 * Imagen (Vertex `:predict`) — geração de imagem didática, no crédito GenAI do Google.
 *
 * Auth reusa o service account do Vertex (igual ao resto da IA). Modelo via env
 * IMAGEN_MODEL (default imagen-4.0-generate-001 — CONFIRMAR o id no Model Garden do
 * projeto). Sem credencial → retorna null (a rota reporta erro tratado).
 */
import { GoogleAuth } from "google-auth-library";
import { vertexCredentials } from "@/lib/ai/vertex-credentials";
import { buildImagenBody, parseImagenResponse, type ImagenOptions } from "@/lib/studio/imagen-request";

const IMAGEN_MODEL = process.env.IMAGEN_MODEL || "imagen-4.0-generate-001";

export interface GeneratedImage {
  data: string; // base64
  mimeType: string; // image/png
}

/** Há credencial Google → o caminho Imagen está disponível. */
export function imagenAvailable(): boolean {
  const c = vertexCredentials();
  return !!(c.project && c.client_email && c.private_key);
}

export async function generateImage(
  prompt: string,
  opts?: ImagenOptions,
  timeoutMs = 60_000,
): Promise<GeneratedImage | null> {
  const clean = (prompt || "").trim();
  if (!clean) return null;
  const { project, client_email, private_key, location } = vertexCredentials();
  if (!project || !client_email || !private_key) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const auth = new GoogleAuth({
      credentials: { client_email, private_key },
      scopes: ["https://www.googleapis.com/auth/cloud-platform"],
    });
    const token = await auth.getAccessToken();
    if (!token) return null;

    const url =
      `https://${location}-aiplatform.googleapis.com/v1/projects/${project}` +
      `/locations/${location}/publishers/google/models/${IMAGEN_MODEL}:predict`;

    const res = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(buildImagenBody(clean.slice(0, 1500), opts)),
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const json = await res.json().catch(() => null);
    return parseImagenResponse(json);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
