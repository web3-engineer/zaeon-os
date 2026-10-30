import { randomUUID } from "node:crypto";
import type { Access } from "./types";
import { proofRuntime, flushProofProjections } from "./runtime";
import { lerProjeto } from "../projetos";
const NAME = "rea-android-proof";
async function bull() {
  return import("bullmq");
}
let queue: any, worker: any;
async function getQueue() {
  if (!process.env.REDIS_URL) throw Error("queue_unavailable");
  if (!queue) {
    const { Queue } = await bull();
    const { getRedisConnection } = await import("@/lib/queue/scholar");
    queue = new Queue(NAME, {
      connection: getRedisConnection() as any,
      defaultJobOptions: {
        attempts: 1,
        removeOnComplete: 100,
        removeOnFail: 100,
      },
    });
    await queue.setGlobalConcurrency(1);
  }
  return queue;
}
export async function scheduleProof(a: Access, artifactId: string) {
  const q = await getQueue();
  const { store } = proofRuntime();
  await store.artifact(a, artifactId);
  await reapProofs();
  const active = await store.db.reaProofRun.count({
    where: { ownerId: a.userId, state: { in: ["queued", "running"] } },
  });
  if (active > 0) throw Error("proof_already_running");
  await store.begin(a, artifactId, "queued");
  try {
    await q.add("analyze", { access: a, artifactId }, { jobId: a.runId });
  } catch {
    await store.fail(a, a.runId);
    throw Error("queue_unavailable");
  }
  return a.runId;
}
async function reapProofs() {
  const { store } = proofRuntime();
  await store.db.reaProofRun.updateMany({
    where: {
      state: { in: ["queued", "running", "evidence_ready"] },
      updatedAt: { lt: new Date(Date.now() - 12 * 60_000) },
    },
    data: { state: "failed", leaseId: randomUUID() },
  });
}
export async function startProofWorker() {
  if (worker || process.env.REA_WORKER !== "1") return;
  await getQueue();
  await reapProofs();
  const { Worker } = await bull();
  const { getRedisConnection } = await import("@/lib/queue/scholar");
  worker = new Worker(
    NAME,
    async (job) => {
      const { access: a, artifactId } = job.data as {
        access: Access;
        artifactId: string;
      };
      const { store, service } = proofRuntime();
      if (!(await lerProjeto(store.db as any, a.userId, a.projectId))) {
        await store.fail(a, a.runId);
        return;
      }
      const claimed = await store.db.reaProofRun.updateMany({
        where: {
          id: a.runId,
          ownerId: a.userId,
          projectId: a.projectId,
          leaseId: a.leaseId,
          state: "queued",
        },
        data: { state: "running" },
      });
      if (claimed.count !== 1) return;
      const abort = new AbortController();
      const timer = setInterval(
        () =>
          void store
            .getRun(a, a.runId)
            .then((r) => {
              if (
                !r ||
                r.leaseId !== a.leaseId ||
                !["running", "evidence_ready"].includes(r.state)
              )
                abort.abort();
            })
            .catch(() => abort.abort()),
        1000,
      );
      try {
        await service.analyze(a, artifactId, {
          existingRun: true,
          signal: abort.signal,
        });
      } finally {
        clearInterval(timer);
      }
    },
    {
      connection: getRedisConnection() as any,
      concurrency: 1,
      maxStalledCount: 0,
      lockDuration: 660_000,
    },
  );
  worker.on("error", () => console.warn("[rea-proof] worker unavailable"));
  setInterval(
    () =>
      void reapProofs()
        .then(flushProofProjections)
        .catch(() => {}),
    60_000,
  ).unref();
}
