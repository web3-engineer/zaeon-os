import type {
  Access,
  DatasetBundle,
  ExperimentOutcome,
} from "../../octa/android/types";
import type { ProofStore } from "../../octa/android/store";
import { requireAccess } from "../../octa/android/policy";
/** Operator-only adapter result persistence; no HTTP endpoint accepts a remote verdict. */
export async function recordOvermindOutcome(
  store: ProofStore,
  a: Access,
  lessonId: string,
  revision: number,
  bundle: DatasetBundle,
  outcome: ExperimentOutcome,
) {
  requireAccess(a);
  const row = await store.db.reaSuccessLesson.findFirst({
    where: { id: lessonId, ownerId: a.userId, projectId: a.projectId },
  });
  if (
    !row ||
    !Number.isInteger(revision) ||
    revision < 1 ||
    row.revision < revision
  )
    throw Error("not_found");
  const lesson = store.lesson(row);
  if (
    !bundle.synthetic ||
    bundle.purpose !== "eval" ||
    !bundle.proofRunIds.length ||
    bundle.proofRunIds.some((id) => !lesson.proofRunIds.includes(id))
  )
    throw Error("incompatible_dataset");
  if (
    outcome.status === "completed" &&
    outcome.manifestSha256 !== bundle.manifestSha256
  )
    throw Error("manifest_mismatch");
  const state = outcome.status === "completed" ? "delivered" : outcome.status;
  const payload = {
    manifestSha256: bundle.manifestSha256,
    rowHashes: bundle.rowHashes,
    proofRunIds: bundle.proofRunIds,
    outcome,
  };
  const key = { lessonId, lessonRevision: revision, destination: "overmind" };
  return store.db.$transaction(async (tx) => {
    const previous = await tx.reaLearningOutbox.findUnique({
      where: { lessonId_lessonRevision_destination: key },
    });
    // A later configuration/transport failure must not erase a completed receipt
    // for the same frozen manifest. This pilot has one experiment per revision.
    if (previous && experimentState(previous) === "completed") {
      if ((previous.payload as any).manifestSha256 !== bundle.manifestSha256)
        throw Error("experiment_revision_already_frozen");
      return previous;
    }
    return tx.reaLearningOutbox.upsert({
      where: {
        lessonId_lessonRevision_destination: {
          lessonId,
          lessonRevision: revision,
          destination: "overmind",
        },
      },
      create: {
        lessonId,
        lessonRevision: revision,
        destination: "overmind",
        state,
        payload: JSON.parse(JSON.stringify(payload)),
      },
      update: {
        state,
        payload: JSON.parse(JSON.stringify(payload)),
        attempts: { increment: 1 },
      },
    });
  });
}
export function experimentState(
  row: { state: string; payload: unknown } | null,
): "not_evaluated" | "pending" | "failed" | "completed" {
  if (!row) return "not_evaluated";
  const payload = row.payload as any,
    outcome = payload?.outcome;
  if (outcome?.status === "failed") return "failed";
  if (
    row.state === "delivered" &&
    outcome?.backend === "overmind" &&
    outcome.status === "completed" &&
    outcome.datasetId &&
    outcome.datasetVersion &&
    outcome.evaluationId &&
    outcome.manifestSha256 === payload.manifestSha256
  )
    return "completed";
  return "pending";
}
