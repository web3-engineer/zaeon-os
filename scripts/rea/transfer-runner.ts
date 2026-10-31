import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve, join } from "node:path";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { ProofStore } from "../../lib/octa/android/store";
import { EvidenceVault, sha256 } from "../../lib/octa/android/evidence";
import { ProofService, scopeKey } from "../../lib/octa/android/service";
import { AndroidBridge } from "../../lib/octa/android/client";
import { SuccessMemory } from "../../lib/agent/learning/rea-success";
import { PINNED_ENGINE, verifyProof } from "../../lib/octa/android/verifier";
async function main() {
  if (!process.env.REA_TEST_DATABASE_URL || !process.env.REA_EVIDENCE_DIR)
    throw Error("isolated_database_and_evidence_dir_required");
  const output = resolve(
    process.env.REA_PROOF_OUTPUT || ".superpowers/rea-results",
  );
  await mkdir(output, { recursive: true });
  const fixture = resolve(
    process.env.REA_FIXTURE_DIR || ".superpowers/rea-fixtures",
    "b",
  );
  const oracle = JSON.parse(
    await readFile(join(fixture, "oracle.json"), "utf8"),
  );
  const lock = JSON.parse(
    await readFile(join(fixture, "fixture.lock.json"), "utf8"),
  );
  const bytes = await readFile(join(fixture, "fixture.apk"));
  if (
    sha256(bytes) !== lock.artifactSha256 ||
    sha256(JSON.stringify(oracle)) !== lock.oracleHash
  )
    throw Error("fixture_seal_mismatch");
  const db = new PrismaClient({
    datasources: { db: { url: process.env.REA_TEST_DATABASE_URL } },
  });
  try {
    const store = new ProofStore(db),
      vault = new EvidenceVault(process.env.REA_EVIDENCE_DIR),
      bridge = new AndroidBridge();
    const memory = new SuccessMemory(store, vault);
    const a = {
      userId: "rea-synthetic-pilot",
      projectId: "rea-fixture-pilot",
      identityVerified: true,
      runId: randomUUID(),
      leaseId: randomUUID(),
    };
    const recalled = await memory.recall(a, PINNED_ENGINE);
    const lesson = recalled.find((r) => r.applicability === "valid");
    if (!lesson) throw Error("verified_procedure_a_required");
    const artifact = await store.createArtifact(a, {
      sha256: sha256(bytes),
      name: "fixture-b.apk",
      bytes: bytes.length,
      handle: await bridge.upload(bytes, scopeKey(a)),
      synthetic: true,
    });
    const service = new ProofService(store, vault, bridge, async (hash) =>
      hash === oracle.artifactSha256
        ? { oracle, oracleHash: lock.oracleHash }
        : null,
    );
    const conditions = [];
    for (const condition of ["without_memory", "with_verified_procedure"]) {
      // Both controls deliberately use the same deterministic workflow and budget.
      // The second first recovers and validates the A procedure; it never supplies A
      // facts to normalization. This measures transfer safety, not LLM improvement.
      if (
        condition === "with_verified_procedure" &&
        !lesson.lesson.procedure.includes("Observe permissions anew")
      )
        throw Error("unsupported_procedure");
      const access = { ...a, runId: randomUUID(), leaseId: randomUUID() };
      const start = Date.now();
      const result = await service.analyze(access, artifact.id);
      conditions.push({
        condition,
        ...result,
        durationMs: Date.now() - start,
        staticToolCalls: 3,
        modelCalls: 0,
        modelCostUsd: 0,
        procedureRecovered:
          condition === "with_verified_procedure" ? lesson.lesson.id : null,
      });
    }
    const copiedA = {
      ...conditions[1].observation,
      facts: {
        ...conditions[1].observation.facts,
        internetDeclared: false,
        returnedLiteral: "ZAEON_REA_FIXTURE_A",
      },
    };
    const negative = verifyProof(oracle, copiedA, lock.oracleHash);
    const invalidBytes = Buffer.from("not an APK");
    const invalidAccess = { ...a, runId: randomUUID(), leaseId: randomUUID() };
    const invalid = await store.createArtifact(invalidAccess, {
      sha256: sha256(invalidBytes),
      name: "invalid.apk",
      bytes: invalidBytes.length,
      handle: await bridge.upload(invalidBytes, scopeKey(a)),
      synthetic: true,
    });
    let invalidRejected = false;
    try {
      await service.analyze(invalidAccess, invalid.id);
    } catch {
      invalidRejected = true;
    }
    const report = {
      kind: "real_static_transfer_safety_control",
      artifactSha256: artifact.sha256,
      conditions,
      copiedARejected: !negative.pass,
      invalidApkRejected: invalidRejected,
      withheldFixtureB: true,
      targetExecuted: false,
      agentQualityComparison: "pending_model_experiment",
      limitations: [
        "Same deterministic three-tool workflow in both conditions.",
        "Procedure recovery and fresh evidence were exercised; no LLM behavior, quality gain or statistical improvement was measured.",
      ],
    };
    await writeFile(
      join(output, "transfer-b.json"),
      JSON.stringify(report, null, 2),
      { mode: 0o600 },
    );
    console.log(
      JSON.stringify({
        kind: report.kind,
        artifactSha256: artifact.sha256,
        conditions: conditions.map((r) => ({
          condition: r.condition,
          runId: r.observation.proofRunId,
          receiptId: r.receipt?.id,
          pass: r.receipt?.pass,
          internetDeclared: r.observation.facts.internetDeclared,
          durationMs: r.durationMs,
        })),
        copiedARejected: report.copiedARejected,
        invalidApkRejected: invalidRejected,
        agentQualityComparison: report.agentQualityComparison,
      }),
    );
    if (
      negative.pass ||
      !invalidRejected ||
      conditions.some((r) => !r.receipt?.pass)
    )
      process.exitCode = 1;
  } finally {
    await db.$disconnect();
  }
}
main().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
