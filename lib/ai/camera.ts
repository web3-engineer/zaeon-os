/**
 * lib/ai/camera.ts — a CÂMERA AO VIVO ("be my eyes" ao vivo). O navegador captura frames
 * (`getUserMedia`) e os manda pra cá; aqui o motor de visão da PR-4 (`descreverImagem`) os descreve.
 *
 * ──────────────────────── por que FRAME-POLLING, e não streaming ────────────────────────
 * O aluno aponta a câmera, o cliente captura ~1 frame/s e pede a descrição. NÃO é um WebSocket
 * bidirecional: é o motor que já existe (request/response, Vertex) chamado em laço. Decisão do dono —
 * ~1 fps é o mesmo teto que o próprio Gemini Live aplica a vídeo, e reusar o motor evita uma infra de
 * streaming nova (e os IDs de modelo Live, que estão em fluxo). "Ao vivo" aqui = o laço de captura.
 *
 * Server-only. A câmera mora no DISPOSITIVO do aluno; aqui só chega o frame já em data URL.
 */
import { descreverImagem, type GenMultimodal, type VisaoOut } from "@/lib/ai/descreverImagem";

/** A flag da câmera ao vivo. Default DESLIGADA: o recurso só existe quando o dono liga. */
export function cameraAoVivoLigada(env: Record<string, string | undefined> = process.env): boolean {
  return ["1", "true", "on"].includes(String(env.VISAO_CAMERA ?? "").trim().toLowerCase());
}

/** Extrai {mime, dataB64} de um data URL `data:<mime>;base64,<b64>`. `null` se não casar. */
export function parseFrame(frame: string): { mime: string; dataB64: string } | null {
  const m = /^data:([^;]+);base64,(.*)$/s.exec(String(frame ?? "").trim());
  if (!m) return null;
  const mime = m[1].trim().toLowerCase();
  const dataB64 = m[2].trim();
  if (!mime || !dataB64) return null;
  return { mime, dataB64 };
}

/**
 * Descreve um frame da câmera. NUNCA lança. `gen` é injetável (teste sem rede). A validação de mime de
 * imagem e de tamanho é a do próprio `descreverImagem` — não há uma segunda definição aqui.
 */
export async function descreverFrame(frame: string, pergunta?: string, gen?: GenMultimodal): Promise<VisaoOut> {
  const f = parseFrame(frame);
  if (!f) return { ok: false, erro: "frame_invalido" };
  return descreverImagem({ dataB64: f.dataB64, mime: f.mime }, pergunta, gen);
}
