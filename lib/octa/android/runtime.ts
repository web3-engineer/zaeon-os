import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { prisma } from "@/src/lib/prisma";
import { lerProjeto } from "../projetos";
import { reaBridgeConfigurado } from "../rea";
import { ProofStore } from "./store";
import { EvidenceVault, canonical } from "./evidence";
import { ProofService, readVerified } from "./service";
import { AndroidBridge } from "./client";
import { proofEnabled } from "./policy";
import { accessForProject } from "./access";
import { PINNED_ENGINE, normalizeEvidence } from "./verifier";
import { SuccessMemory } from "../../agent/learning/rea-success";
import { publicProof } from "./http";
import type { Access, Observation } from "./types";
import { experimentState } from "../../agent/learning/rea-experiment";
let projectionPromise: Promise<
  import("../../agent/learning/rea-success").ReaProjection
> | null = null;
async function projection() {
  if (process.env.MEMORY_L3 !== "1" || !process.env.DATABASE_URL) return null;
  if (!projectionPromise)
    projectionPromise = (async () => {
      const { MongoClient } = await import("mongodb");
      const { embedGemini } = await import("../../rag/embed");
      const { createReaProjection } = await import(
        "../../agent/learning/rea-projection"
      );
      const client = new MongoClient(process.env.DATABASE_URL!, {
        maxPoolSize: 2,
        serverSelectionTimeoutMS: 5000,
      });
      await client.connect();
      return createReaProjection(
        client.db().collection("rea_success_drawers"),
        (texts, dim) => embedGemini(texts, { dim: dim ?? 1536 }),
      );
    })().catch((e) => {
      projectionPromise = null;
      throw e;
    });
  return projectionPromise;
}
export async function flushProofProjections() {
  const sink = await projection();
  if (!sink) return;
  const { store, memory } = proofRuntime();
  const pending = await store.db.reaLearningOutbox.findMany({
    where: { destination: "l3", state: "pending" },
    take: 20,
  });
  for (const event of pending) {
    const row = await store.db.reaSuccessLesson.findFirst({
      where: {
        id: event.lessonId,
        state: "verified_project",
        revision: event.lessonRevision,
      },
    });
    if (!row) continue;
    let owns = await lerProjeto(store.db as any, row.ownerId, row.projectId);
    if (!owns && /^[a-f0-9]{24}$/i.test(row.ownerId)) {
      const user = await store.db.user.findUnique({
        where: { id: row.ownerId },
        select: { email: true },
      });
      if (user?.email)
        owns = await lerProjeto(store.db as any, user.email, row.projectId);
    }
    if (!owns) continue;
    const a = {
      userId: row.ownerId,
      projectId: row.projectId,
      runId: crypto.randomUUID(),
      leaseId: crypto.randomUUID(),
      identityVerified: true,
    };
    await memory.flush(a, sink);
  }
}
export function assertProofConfigured() {
  if (!proofEnabled()) throw Error("proof_disabled");
  if (!reaBridgeConfigurado() || !process.env.REA_EVIDENCE_DIR)
    throw Error("proof_not_configured");
}
export async function requestAccess(session: unknown, projectId: string) {
  assertProofConfigured();
  return accessForProject(session, projectId, (owner, id) =>
    lerProjeto(prisma as any, owner, id),
  );
}
export function proofRuntime() {
  assertProofConfigured();
  const store = new ProofStore(prisma),
    vault = new EvidenceVault(process.env.REA_EVIDENCE_DIR!);
  const bridge = new AndroidBridge();
  const memory = new SuccessMemory(store, vault);
  const service = new ProofService(store, vault, bridge, async (hash) => {
    const root = process.env.REA_FIXTURE_REGISTRY;
    if (!root) return null;
    for (const fixture of ["a", "b"]) {
      const oracle = JSON.parse(
        await readFile(join(root, fixture, "oracle.json"), "utf8"),
      );
      const lock = JSON.parse(
        await readFile(join(root, fixture, "fixture.lock.json"), "utf8"),
      );
      if (oracle.artifactSha256 === hash && lock.artifactSha256 === hash)
        return { oracle, oracleHash: lock.oracleHash };
    }
    return null;
  });
  return { store, vault, bridge, memory, service };
}
export async function proofView(a: Access, id: string) {
  const { store, vault, memory } = proofRuntime();
  let run = await store.getRun(a, id);
  if (!run) throw Error("not_found");
  let observation: Observation | null = null,
    receipt = null;
  try {
    if (run.state === "verified")
      ({ observation, receipt } = await readVerified(store, vault, a, id));
    else if (run.observation) {
      const prior = run.observation as unknown as Observation;
      const actual = normalizeEvidence(
        await vault.read(a, prior.evidence[0]),
        prior.evidence,
      );
      if (canonical(actual) !== canonical(prior))
        throw Error("evidence_integrity");
      observation = actual;
      const row = await store.db.reaVerificationReceipt.findFirst({
        where: { proofRunId: id, ownerId: a.userId, projectId: a.projectId },
      });
      receipt = row?.payload as any;
    }
  } catch {
    run = { ...run, state: "evidence_unavailable" };
  }
  const recalled = await memory.recall(a, PINNED_ENGINE);
  const lessons = recalled
    .filter((r) => r.applicability === "valid")
    .map((r) => r.lesson);
  const lesson = lessons.find((l) => l.proofRunIds.includes(id));
  const remote = lesson
    ? await store.db.reaLearningOutbox.findFirst({
        where: {
          lessonId: lesson.id,
          lessonRevision: lesson.revision,
          destination: "overmind",
        },
      })
    : null;
  // Only a server-recorded completed remote receipt can display completion.
  const remoteState = experimentState(remote);
  return publicProof(run, observation, receipt, lessons, remoteState);
}
