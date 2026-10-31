import { createHash, randomUUID } from "node:crypto";
import { constants } from "node:fs";
import { mkdir, open, readFile, rename, unlink } from "node:fs/promises";
import { resolve, join } from "node:path";
import type { Access, EvidenceRef } from "./types";
import { requireAccess } from "./policy";
export const sha256 = (v: Uint8Array | string) =>
  createHash("sha256").update(v).digest("hex");
export function canonical(v: unknown): string {
  if (Array.isArray(v)) return "[" + v.map(canonical).join(",") + "]";
  if (v !== null && typeof v === "object")
    return (
      "{" +
      Object.keys(v)
        .sort()
        .map(
          (k) =>
            JSON.stringify(k) +
            ":" +
            canonical((v as Record<string, unknown>)[k]),
        )
        .join(",") +
      "}"
    );
  return JSON.stringify(v ?? null);
}
export class EvidenceVault {
  constructor(private root: string) {}
  private scope(a: Access) {
    requireAccess(a);
    return sha256(a.userId + "\0" + a.projectId);
  }
  async save(a: Access, raw: Uint8Array): Promise<EvidenceRef> {
    if (!raw.length || raw.length > 32 * 1024 * 1024)
      throw Error("evidence_size");
    const scope = this.scope(a),
      id = randomUUID(),
      locator = scope + "/" + id + ".json";
    const dir = join(resolve(this.root), scope);
    await mkdir(dir, { recursive: true, mode: 0o700 });
    const tmp = join(dir, "." + id + ".tmp"),
      dest = join(dir, id + ".json");
    const file = await open(tmp, "wx", 0o600);
    try {
      await file.writeFile(raw);
      await file.sync();
    } finally {
      await file.close();
    }
    try {
      await rename(tmp, dest);
      const d = await open(dir, "r");
      try {
        await d.sync();
      } finally {
        await d.close();
      }
    } catch (e) {
      await unlink(tmp).catch(() => {});
      throw e;
    }
    return {
      id,
      locator,
      sha256: sha256(raw),
      bytes: raw.length,
      coverage: "complete",
    };
  }
  async read(a: Access, ref: EvidenceRef): Promise<Buffer> {
    const scope = this.scope(a);
    if (
      !/^[a-f0-9]{64}\/[a-f0-9-]{36}\.json$/.test(ref.locator) ||
      !ref.locator.startsWith(scope + "/") ||
      ref.locator !== scope + "/" + ref.id + ".json"
    )
      throw Error("not_found");
    const file = await open(
      join(resolve(this.root), ref.locator),
      constants.O_RDONLY | constants.O_NOFOLLOW,
    );
    try {
      const bytes = await file.readFile();
      if (bytes.length !== ref.bytes || sha256(bytes) !== ref.sha256)
        throw Error("evidence_integrity");
      return bytes;
    } finally {
      await file.close();
    }
  }
}
