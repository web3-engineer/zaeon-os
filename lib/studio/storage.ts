/**
 * Armazenamento de arquivos do Studio em disco — .studio/<id>.<ext>.
 *
 * No container do VPS o WORKDIR é /app, então process.cwd()===/app → /app/.studio
 * (igual ao que o prompt-mestre pede). Localmente cai em <repo>/.studio (gitignored).
 * Conteúdo textual/JSON NÃO usa isto — fica no campo `meta` do StudioArtifact.
 *
 * As funções de caminho (studioFilePath/sanitizeId) são puras → testáveis sem fs.
 */
import fs from "fs/promises";
import path from "path";

const DIR = process.env.STUDIO_DIR || path.join(process.cwd(), ".studio");

export function studioDir(): string {
  return DIR;
}

/** Só [a-zA-Z0-9_-] — evita path traversal vindo de um id de artifact. */
export function sanitizeId(id: string): string {
  return String(id || "").replace(/[^a-zA-Z0-9_-]/g, "");
}

function sanitizeExt(ext: string): string {
  return String(ext || "bin").replace(/[^a-z0-9]/gi, "").toLowerCase() || "bin";
}

export function studioFilePath(id: string, ext: string): string {
  return path.join(DIR, `${sanitizeId(id)}.${sanitizeExt(ext)}`);
}

export async function writeStudioFile(id: string, ext: string, data: Buffer): Promise<string> {
  await fs.mkdir(DIR, { recursive: true });
  const p = studioFilePath(id, ext);
  await fs.writeFile(p, data);
  return p;
}

export async function readStudioFile(id: string, ext: string): Promise<Buffer> {
  return fs.readFile(studioFilePath(id, ext));
}

export async function studioFileExists(id: string, ext: string): Promise<boolean> {
  try {
    await fs.access(studioFilePath(id, ext));
    return true;
  } catch {
    return false;
  }
}

export async function deleteStudioFile(id: string, ext: string): Promise<void> {
  try {
    await fs.unlink(studioFilePath(id, ext));
  } catch {
    /* já não existe → ok */
  }
}
