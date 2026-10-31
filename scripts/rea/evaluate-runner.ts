import { readFile, writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { PrismaClient } from "@prisma/client";
import {
  EvidenceVault,
  canonical,
  sha256,
} from "../../lib/octa/android/evidence";
import { ProofStore } from "../../lib/octa/android/store";
import {
  exportReaEval,
  eligibleRows,
} from "../../lib/agent/learning/rea-dataset";
import { evaluateOvermind } from "../../lib/agent/learning/adapters/overmind";
import { recordOvermindOutcome } from "../../lib/agent/learning/rea-experiment";
async function main() {
  if (!process.env.REA_TEST_DATABASE_URL || !process.env.REA_EVIDENCE_DIR)
    throw Error("isolated_database_and_evidence_dir_required");
  if (
    !process.argv.includes("--backend") ||
    process.argv[process.argv.indexOf("--backend") + 1] !== "overmind"
  )
    throw Error("explicit_backend_overmind_required");
  const output = resolve(
    process.env.REA_PROOF_OUTPUT || ".superpowers/rea-results",
  );
  const prior = JSON.parse(await readFile(join(output, "a.json"), "utf8"));
  const fixture = resolve(
    process.env.REA_FIXTURE_DIR || ".superpowers/rea-fixtures",
    "a",
  );
  const oracle = JSON.parse(
    await readFile(join(fixture, "oracle.json"), "utf8"),
  );
  const lock = JSON.parse(
    await readFile(join(fixture, "fixture.lock.json"), "utf8"),
  );
  const sealed = { oracle, oracleHash: lock.oracleHash };
  const a = {
    ...prior.access,
    runId: randomUUID(),
    leaseId: randomUUID(),
    identityVerified: true,
  };
  const ids = prior.results.map((r: any) => r.observation.proofRunId);
  const db = new PrismaClient({
    datasources: { db: { url: process.env.REA_TEST_DATABASE_URL } },
  });
  try {
    const store = new ProofStore(db),
      vault = new EvidenceVault(process.env.REA_EVIDENCE_DIR);
    const bundle = await exportReaEval(
      store,
      vault,
      a,
      ids,
      sealed,
      join(output, "datasets"),
    );
    const lesson = (await store.lessons(a)).find((l) =>
      ids.every((id: string) => l.proofRunIds.includes(id)),
    );
    if (!lesson) throw Error("active_verified_lesson_required");
    const outcome = await evaluateOvermind(bundle, {
      env: process.env,
      eligible: async () => {
        const rows = await eligibleRows(store, vault, a, ids, sealed);
        if (
          canonical(rows.map((r) => sha256(canonical(r)))) !==
          canonical(bundle.rowHashes)
        )
          throw Error("source_changed");
      },
      transport: async (phase, context) => {
        const rows = (await readFile(bundle.jsonlRef, "utf8"))
          .trim()
          .split("\n")
          .map((line) => JSON.parse(line));
        if (
          canonical(rows.map((r) => sha256(canonical(r)))) !==
          canonical(bundle.rowHashes)
        )
          throw Error("local_export_changed");
        return new Promise((ok, fail) => {
          const allow = [
            "PATH",
            "HOME",
            "SSL_CERT_FILE",
            "SSL_CERT_DIR",
            "OVERMIND_API_KEY",
            "OVERMIND_API_URL",
            "OVERMIND_PROJECT_ID",
            "REA_OVERMIND_EVAL_SET",
          ];
          const env: NodeJS.ProcessEnv = {
            NODE_ENV: "production",
            ...Object.fromEntries(
              Object.entries(process.env).filter(([k]) => allow.includes(k)),
            ),
          };
          const p = spawn(
            process.env.REA_OVERMIND_PYTHON!,
            [resolve("scripts/rea/overmind-transport.py")],
            { env, stdio: ["pipe", "pipe", "pipe"], timeout: 600_000 },
          );
          let data = "";
          p.stdout.on("data", (d) => {
            data += d;
            if (data.length > 2_000_000) p.kill("SIGKILL");
          });
          p.stderr.resume();
          p.on("error", () => fail(Error("transport_failed")));
          p.on("close", (code) => {
            try {
              if (code !== 0) throw Error();
              ok(JSON.parse(data));
            } catch {
              fail(Error("transport_failed"));
            }
          });
          p.stdin.end(JSON.stringify({ phase, ...context }));
        });
      },
    });
    await recordOvermindOutcome(
      store,
      a,
      lesson.id,
      lesson.revision,
      bundle,
      outcome,
    );
    await writeFile(
      join(output, "overmind.json"),
      JSON.stringify(
        { kind: "real_remote_evaluation_attempt", bundle, outcome },
        null,
        2,
      ),
      { mode: 0o600 },
    );
    console.log(JSON.stringify(outcome));
    if (outcome.status !== "completed") process.exitCode = 2;
  } finally {
    await db.$disconnect();
  }
}
main().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
