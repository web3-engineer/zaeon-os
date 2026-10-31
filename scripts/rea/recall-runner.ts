import { readFile, writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { EvidenceVault } from "../../lib/octa/android/evidence";
import { ProofStore } from "../../lib/octa/android/store";
import { SuccessMemory } from "../../lib/agent/learning/rea-success";
import { PINNED_ENGINE } from "../../lib/octa/android/verifier";
async function main() {
  if (!process.env.REA_TEST_DATABASE_URL || !process.env.REA_EVIDENCE_DIR)
    throw Error("isolated_database_and_evidence_dir_required");
  const output = resolve(
    process.env.REA_PROOF_OUTPUT || ".superpowers/rea-results",
  );
  const fixture = process.argv.includes("--fixture")
    ? process.argv[process.argv.indexOf("--fixture") + 1].toLowerCase()
    : "a";
  if (!["a", "b"].includes(fixture)) throw Error("invalid_fixture");
  const prior = JSON.parse(
    await readFile(join(output, fixture + ".json"), "utf8"),
  );
  const db = new PrismaClient({
    datasources: { db: { url: process.env.REA_TEST_DATABASE_URL } },
  });
  try {
    const a = {
      ...prior.access,
      runId: randomUUID(),
      leaseId: randomUUID(),
      identityVerified: true,
    };
    const memory = new SuccessMemory(
      new ProofStore(db),
      new EvidenceVault(process.env.REA_EVIDENCE_DIR),
    );
    // Promotion and later recall can be invoked in entirely separate processes.
    const lesson = process.argv.includes("--promote")
      ? await memory.promote(
          a,
          prior.results.map((r: any) => r.observation.proofRunId),
        )
      : null;
    const recalled = await memory.recall(a, PINNED_ENGINE);
    const drifted = await memory.recall(a, {
      ...PINNED_ENGINE,
      jadx: "different-engine",
    });
    const report = {
      kind: "new_process_canonical_recall",
      fixture: fixture.toUpperCase(),
      lessonId: lesson?.id ?? recalled[0]?.lesson.id,
      recalled,
      engineDrift: drifted.map((r) => ({
        lessonId: r.lesson.id,
        applicability: r.applicability,
      })),
      clientHistoryUsed: false,
    };
    await writeFile(
      join(output, fixture + "-recall.json"),
      JSON.stringify(report, null, 2),
      { mode: 0o600 },
    );
    console.log(
      JSON.stringify({
        kind: report.kind,
        lessonId: report.lessonId,
        clientHistoryUsed: false,
        count: recalled.length,
        valid: recalled.some((r) => r.applicability === "valid"),
        engineDrift: report.engineDrift,
      }),
    );
    if (!recalled.length) process.exitCode = 1;
  } finally {
    await db.$disconnect();
  }
}
main().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
