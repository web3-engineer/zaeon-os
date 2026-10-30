import type { Access, Engine, RecalledLesson } from "../../octa/android/types";
import type { MemoryAPI } from "../memory";
import { ProofStore } from "../../octa/android/store";
import { EvidenceVault, canonical, sha256 } from "../../octa/android/evidence";
import { readVerified } from "../../octa/android/service";
export type ReaProjection = MemoryAPI & {
  invalidate(userId: string, lessonId: string): Promise<void>;
};
/** Canonical success memory works without an embedding service or a client history. */
export class SuccessMemory {
  constructor(
    private store: ProofStore,
    private vault: EvidenceVault,
  ) {}
  async promote(a: Access, ids: string[]) {
    if (new Set(ids).size < 2) throw Error("two_independent_runs_required");
    for (const id of new Set(ids))
      await readVerified(this.store, this.vault, a, id);
    return this.store.promote(a, ids);
  }
  async recall(
    a: Access,
    engine: Engine,
    query = "Android marker procedure",
    projection?: MemoryAPI,
  ): Promise<RecalledLesson[]> {
    const lessons = await this.store.lessons(a);
    const result: RecalledLesson[] = [];
    const hits = projection
      ? await projection
          .search(query, {
            userId: a.userId,
            wingKind: "projeto",
            wingLabel: a.projectId,
          })
          .catch(() => [])
      : [];
    const rank = new Map(hits.map((h, i) => [h.meta?.reaLessonId, i]));
    for (const lesson of lessons) {
      try {
        for (const id of lesson.proofRunIds)
          await readVerified(this.store, this.vault, a, id);
        // A projection/cache can rank candidates; it cannot revive a retired lesson.
        const current = await this.store.db.reaSuccessLesson.findFirst({
          where: {
            id: lesson.id,
            ownerId: a.userId,
            projectId: a.projectId,
            state: "verified_project",
            revision: lesson.revision,
          },
        });
        if (current)
          result.push({
            lesson,
            applicability:
              lesson.engineFingerprint === sha256(canonical(engine))
                ? "valid"
                : "needs_revalidation",
          });
      } catch {
        /* Missing/removed/corrupt evidence makes the lesson ineligible. */
      }
    }
    return result.sort(
      (x, y) => (rank.get(x.lesson.id) ?? 100) - (rank.get(y.lesson.id) ?? 100),
    );
  }
  async flush(a: Access, projection: MemoryAPI) {
    const lessons = await this.store.lessons(a);
    const events = await this.store.db.reaLearningOutbox.findMany({
      where: {
        lessonId: { in: lessons.map((l) => l.id) },
        destination: "l3",
        state: "pending",
      },
    });
    for (const event of events) {
      const lesson = lessons.find(
        (l) => l.id === event.lessonId && l.revision === event.lessonRevision,
      );
      if (!lesson) continue;
      try {
        for (const id of lesson.proofRunIds)
          await readVerified(this.store, this.vault, a, id);
        await projection.write([
          {
            userId: a.userId,
            wing: { kind: "projeto", label: a.projectId },
            room: "rea-success",
            kind: "artefato",
            text: lesson.procedure,
            sourceRef: `rea:${lesson.id}:${lesson.revision}`,
            meta: {
              reaLessonId: lesson.id,
              revision: lesson.revision,
              requiresCanonicalRevalidation: true,
            },
            at: new Date().toISOString(),
          },
        ]);
        await this.store.db.reaLearningOutbox.update({
          where: { id: event.id },
          data: {
            state: "delivered",
            errorCode: null,
            attempts: { increment: 1 },
          },
        });
      } catch {
        await this.store.db.reaLearningOutbox.update({
          where: { id: event.id },
          data: {
            state: "pending",
            errorCode: "projection_unavailable",
            attempts: { increment: 1 },
          },
        });
      }
    }
  }
  async retire(a: Access, id: string, projection?: ReaProjection) {
    await this.store.retire(a, id);
    // Dedicated REA projections never enter generic memory wake-up. Canonical
    // recall checks retirement even if this best-effort invalidation fails.
    if (projection) await projection.invalidate(a.userId, id).catch(() => {});
  }
}
