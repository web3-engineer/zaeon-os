import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import type { Access, DatasetBundle, Oracle } from "../../octa/android/types";
import { ProofStore } from "../../octa/android/store";
import { EvidenceVault, sha256, canonical } from "../../octa/android/evidence";
import { readVerified } from "../../octa/android/service";
export async function eligibleRows(
  store: ProofStore,
  vault: EvidenceVault,
  a: Access,
  ids: string[],
  sealed: { oracle: Oracle; oracleHash: string },
) {
  if (new Set(ids).size !== ids.length || ids.length < 2 || ids.length > 10)
    throw Error("invalid_proof_set");
  if (
    sealed.oracle.fixtureId !== "A" ||
    sha256(JSON.stringify(sealed.oracle)) !== sealed.oracleHash
  )
    throw Error("sealed_fixture_a_only");
  const lessons = await store.lessons(a);
  if (!lessons.some((l) => ids.every((id) => l.proofRunIds.includes(id))))
    throw Error("active_verified_lesson_required");
  const rows = [];
  for (const id of [...ids].sort()) {
    const { run, observation, receipt } = await readVerified(
      store,
      vault,
      a,
      id,
    );
    const artifact = await store.artifact(a, run.artifactId);
    if (
      !artifact.synthetic ||
      artifact.sha256 !== sealed.oracle.artifactSha256 ||
      receipt.oracleHash !== sealed.oracleHash
    )
      throw Error("synthetic_fixture_only");
    // Allowlisted fields only. No owner, session, path, handle, raw provider output
    // or arbitrary model text can enter the export. Reference is evaluator-only:
    // this dataset is scored in recorded mode, never sent to a generation target.
    rows.push({
      input:
        "Identify the package, version, sole activity, marker method literal and declared INTERNET permission from static APK evidence.",
      output: JSON.stringify(observation.facts),
      reference: JSON.stringify(sealed.oracle.facts),
      metadata: {
        schema: "zaeon.rea.eval.v1",
        proofRunId: id,
        receiptId: receipt.id,
        artifactSha256: artifact.sha256,
        evidenceHashes: receipt.evidenceHashes,
        verifierVersion: receipt.verifierVersion,
      },
    });
  }
  return rows;
}
export async function exportReaEval(
  store: ProofStore,
  vault: EvidenceVault,
  a: Access,
  ids: string[],
  sealed: { oracle: Oracle; oracleHash: string },
  directory: string,
): Promise<DatasetBundle> {
  const rows = await eligibleRows(store, vault, a, ids, sealed);
  const rowHashes = rows.map((r) => sha256(canonical(r)));
  const manifest = {
    schema: "zaeon.rea.dataset.v1",
    purpose: "eval",
    synthetic: true,
    oracleHash: sealed.oracleHash,
    proofRunIds: [...ids].sort(),
    rowHashes,
  };
  const manifestSha256 = sha256(canonical(manifest));
  const dir = join(resolve(directory), manifestSha256);
  await mkdir(dir, { recursive: true, mode: 0o700 });
  const jsonlRef = join(dir, "rows.jsonl");
  const jsonl = rows.map((r) => canonical(r)).join("\n") + "\n";
  try {
    await writeFile(jsonlRef, jsonl, { flag: "wx", mode: 0o600 });
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "EEXIST") throw e;
  }
  await writeFile(
    join(dir, "manifest.json"),
    JSON.stringify(manifest, null, 2),
    { mode: 0o600 },
  );
  return {
    id: manifestSha256,
    version: "1",
    manifestSha256,
    jsonlRef,
    rowHashes,
    proofRunIds: manifest.proofRunIds,
    purpose: "eval",
    synthetic: true,
  };
}
