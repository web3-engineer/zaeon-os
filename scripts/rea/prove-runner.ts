import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve, join } from "node:path";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { EvidenceVault, sha256 } from "../../lib/octa/android/evidence";
import { ProofStore } from "../../lib/octa/android/store";
import { ProofService, scopeKey } from "../../lib/octa/android/service";
import { AndroidBridge } from "../../lib/octa/android/client";
async function main() {
  const value = (key: string, fallback: string) =>
    process.argv.includes(key)
      ? process.argv[process.argv.indexOf(key) + 1]
      : fallback;
  const fixture = value("--fixture", "A").toLowerCase();
  if (!["a", "b"].includes(fixture)) throw Error("invalid_fixture");
  const count = Number(value("--fresh-runs", "2"));
  if (!Number.isInteger(count) || count < 1 || count > 4)
    throw Error("invalid_runs");
  const dir = resolve(
    process.env.REA_FIXTURE_DIR || ".superpowers/rea-fixtures",
    fixture,
  );
  const output = resolve(
    process.env.REA_PROOF_OUTPUT || ".superpowers/rea-results",
  );
  await mkdir(output, { recursive: true, mode: 0o700 });
  if (!process.env.REA_TEST_DATABASE_URL || !process.env.REA_EVIDENCE_DIR)
    throw Error("isolated_database_and_evidence_dir_required");
  const db = new PrismaClient({
    datasources: { db: { url: process.env.REA_TEST_DATABASE_URL } },
  });
  try {
    const oracle = JSON.parse(await readFile(join(dir, "oracle.json"), "utf8"));
    const lock = JSON.parse(
      await readFile(join(dir, "fixture.lock.json"), "utf8"),
    );
    const bytes = await readFile(join(dir, "fixture.apk"));
    if (
      sha256(bytes) !== lock.artifactSha256 ||
      sha256(JSON.stringify(oracle)) !== lock.oracleHash
    )
      throw Error("fixture_seal_mismatch");
    const a = {
      userId: "rea-synthetic-pilot",
      projectId: "rea-fixture-pilot",
      identityVerified: true,
      runId: randomUUID(),
      leaseId: randomUUID(),
    };
    const bridge = new AndroidBridge();
    const store = new ProofStore(db);
    const vault = new EvidenceVault(process.env.REA_EVIDENCE_DIR);
    const handle = await bridge.upload(bytes, scopeKey(a));
    const artifact = await store.createArtifact(a, {
      sha256: sha256(bytes),
      name: "fixture-" + fixture + ".apk",
      bytes: bytes.length,
      handle,
      synthetic: true,
    });
    const service = new ProofService(store, vault, bridge, async (hash) =>
      hash === oracle.artifactSha256
        ? { oracle, oracleHash: lock.oracleHash }
        : null,
    );
    const results = [];
    for (let i = 0; i < count; i++) {
      const access = { ...a, runId: randomUUID(), leaseId: randomUUID() };
      const start = Date.now();
      const result = await service.analyze(access, artifact.id);
      results.push({ ...result, durationMs: Date.now() - start });
    }
    const report = {
      kind: "real_static_analysis",
      fixture: fixture.toUpperCase(),
      artifactSha256: artifact.sha256,
      artifactId: artifact.id,
      access: { userId: a.userId, projectId: a.projectId },
      results,
      targetExecuted: false,
      signatureVerified: false,
    };
    await writeFile(
      join(output, fixture + ".json"),
      JSON.stringify(report, null, 2),
      { mode: 0o600 },
    );
    console.log(
      JSON.stringify({
        kind: report.kind,
        fixture: report.fixture,
        artifactSha256: artifact.sha256,
        proofRunIds: results.map((r) => r.observation.proofRunId),
        receiptIds: results.map((r) => r.receipt?.id),
        pass: results.every((r) => r.receipt?.pass),
        targetExecuted: false,
      }),
    );
    if (!results.every((r) => r.receipt?.pass)) process.exitCode = 1;
  } finally {
    await db.$disconnect();
  }
}
main().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
