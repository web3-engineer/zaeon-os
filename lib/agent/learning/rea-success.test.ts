import { it, expect, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { SuccessMemory } from "./rea-success";
import { ProofStore } from "../../octa/android/store";
import { EvidenceVault, sha256 } from "../../octa/android/evidence";
import { PINNED_ENGINE } from "../../octa/android/verifier";
import { ProofService } from "../../octa/android/service";
import { documents, oracle } from "../../octa/android/test-fixtures";
import { eligibleRows } from "./rea-dataset";
const url = process.env.REA_TEST_DATABASE_URL;
const db = url ? new PrismaClient({ datasources: { db: { url } } }) : null;
afterAll(async () => {
  await db?.$disconnect();
});
it.skipIf(!url)(
  "only promotes repeated verified runs, survives restart and rejects retired/tampered proofs",
  async () => {
    const root = await mkdtemp(join(tmpdir(), "rea-memory-"));
    const a = {
      userId: randomUUID(),
      projectId: randomUUID(),
      runId: randomUUID(),
      leaseId: randomUUID(),
      identityVerified: true,
    };
    const store = new ProofStore(db!),
      vault = new EvidenceVault(root);
    const artifact = await store.createArtifact(a, {
      sha256: oracle.artifactSha256,
      name: "synthetic.apk",
      bytes: 10,
      handle: "a".repeat(32),
      synthetic: true,
    });
    const executor = {
      analyze: async (_h: string, _s: string, r: any) =>
        documents()[r.goal === "overview" ? 0 : r.goal === "search" ? 1 : 2],
    };
    const service = new ProofService(store, vault, executor, async () => ({
      oracle,
      oracleHash: sha256(JSON.stringify(oracle)),
    }));
    const ids: string[] = [];
    try {
      for (let i = 0; i < 2; i++) {
        const access = { ...a, runId: randomUUID(), leaseId: randomUUID() };
        await service.analyze(access, artifact.id);
        ids.push(access.runId);
      }
      const memory = new SuccessMemory(store, vault);
      await expect(memory.promote(a, [ids[0], ids[0]])).rejects.toThrow(/two/);
      await expect(
        memory.promote({ ...a, projectId: "other" }, ids),
      ).rejects.toThrow();
      const lesson = await memory.promote(a, ids);
      expect((await memory.promote(a, ids)).id).toBe(lesson.id);
      expect(
        await store.db.reaLearningOutbox.count({
          where: { lessonId: lesson.id },
        }),
      ).toBe(1);
      const fresh = new SuccessMemory(
        new ProofStore(db!),
        new EvidenceVault(root),
      );
      expect((await fresh.recall(a, PINNED_ENGINE))[0].applicability).toBe(
        "valid",
      );
      expect(
        (await fresh.recall(a, { ...PINNED_ENGINE, jadx: "new" }))[0]
          .applicability,
      ).toBe("needs_revalidation");
      const failing = {
        write: async () => {
          throw Error("embedding unavailable");
        },
        search: async () => [],
        wakeUp: async () => [],
      };
      await memory.flush(a, failing);
      expect(
        (
          await store.db.reaLearningOutbox.findFirst({
            where: { lessonId: lesson.id },
          })
        )?.state,
      ).toBe("pending");
      expect((await fresh.recall(a, PINNED_ENGINE)).length).toBe(1);
      const sealed = { oracle, oracleHash: sha256(JSON.stringify(oracle)) };
      const rows = await eligibleRows(store, vault, a, ids, sealed);
      expect(JSON.stringify(rows)).not.toContain(root);
      expect(JSON.stringify(rows)).not.toContain(a.userId);
      await store.db.reaArtifact.update({
        where: { id: artifact.id },
        data: { synthetic: false },
      });
      await expect(eligibleRows(store, vault, a, ids, sealed)).rejects.toThrow(
        "synthetic_fixture_only",
      );
      await store.db.reaArtifact.update({
        where: { id: artifact.id },
        data: { synthetic: true },
      });
      const row = await store.getRun(a, ids[0]);
      const ref = (row!.observation as any).evidence[0];
      await writeFile(join(root, ref.locator), "tampered");
      expect(await fresh.recall(a, PINNED_ENGINE)).toEqual([]);
      await expect(memory.promote(a, ids)).rejects.toThrow();
      await memory.retire(a, lesson.id);
      await expect(eligibleRows(store, vault, a, ids, sealed)).rejects.toThrow(
        "active_verified_lesson_required",
      );
      expect(await fresh.recall(a, PINNED_ENGINE)).toEqual([]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  },
  30_000,
);
