import { describe, it, expect, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import { ProofStore } from "./store";
import { randomUUID } from "node:crypto";
const url = process.env.REA_TEST_DATABASE_URL;
const db = url ? new PrismaClient({ datasources: { db: { url } } }) : null;
afterAll(async () => {
  await db?.$disconnect();
});
describe.skipIf(!url)("REA proof persistence (real Mongo)", () => {
  it("fences late writes, isolates reads, and survives a new repository instance", async () => {
    const a = {
      userId: randomUUID(),
      projectId: randomUUID(),
      runId: randomUUID(),
      leaseId: randomUUID(),
      identityVerified: true,
    };
    const s = new ProofStore(db!);
    const artifact = await s.createArtifact(a, {
      sha256: "a".repeat(64),
      name: "fixture.apk",
      bytes: 123,
      handle: "b".repeat(32),
      synthetic: true,
    });
    const run = await s.begin(a, artifact.id);
    await expect(
      s.finish({ ...a, leaseId: "stale" }, run.id, {
        evidence: [],
        engine: { rea: "6.5.0", jadx: "0.7.1", jarSha256: "c".repeat(64) },
      }),
    ).rejects.toThrow(/lease/);
    await s.finish(a, run.id, {
      evidence: [],
      engine: { rea: "6.5.0", jadx: "0.7.1", jarSha256: "c".repeat(64) },
    });
    expect((await new ProofStore(db!).getRun(a, run.id))?.state).toBe(
      "evidence_ready",
    );
    expect(await s.getRun({ ...a, projectId: "other" }, run.id)).toBeNull();
  });
});
