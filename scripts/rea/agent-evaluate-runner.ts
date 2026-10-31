/** Actual model experiment. Gabarito is loaded only after both agent sessions. */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import { randomUUID, randomInt } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { ProofStore } from "../../lib/octa/android/store";
import {
  EvidenceVault,
  canonical,
  sha256,
} from "../../lib/octa/android/evidence";
import { PINNED_ENGINE } from "../../lib/octa/android/verifier";
import { AndroidBridge } from "../../lib/octa/android/client";
import { scopeKey } from "../../lib/octa/android/service";
import { SuccessMemory } from "../../lib/agent/learning/rea-success";
import {
  freezeAgentProtocol,
  runAgentTrial,
  gradeAgentTrial,
  compareAgentTrials,
  type ProcedureSnapshot,
  type Condition,
} from "../../lib/agent/learning/rea-agent-eval";
import {
  agentEvalConfig,
  openAgentModel,
} from "../../lib/agent/learning/rea-agent-gateway";
import {
  AgentExperimentJournal,
  runAgentConditions,
} from "../../lib/agent/learning/rea-agent-journal";
async function main() {
  if (
    !process.argv.includes("--compare-agent") ||
    process.argv.includes("--compare-memory") ||
    process.argv.includes("--backend")
  )
    throw Error("explicit_agent_comparison_required");
  const value = (key: string, fallback: string) =>
    process.argv.includes(key)
      ? process.argv[process.argv.indexOf(key) + 1]
      : fallback;
  if (value("--fixture", "B").toUpperCase() !== "B")
    throw Error("fixture_b_holdout_required");
  const id = value("--experiment-id", randomUUID());
  if (!/^[a-f0-9-]{36}$/.test(id)) throw Error("invalid_experiment_id");
  const output = resolve(
    process.env.REA_PROOF_OUTPUT || ".superpowers/rea-results",
  );
  const root = join(output, "agent-experiments");
  await mkdir(root, { recursive: true, mode: 0o700 });
  const dir = join(root, id);
  // Never restart a paid experiment implicitly after a lost response/crash.
  await mkdir(dir, { mode: 0o700 });
  const publish = async (report: object) => {
    await writeFile(join(dir, "report.json"), JSON.stringify(report, null, 2), {
      flag: "wx",
      mode: 0o600,
    });
    await writeFile(
      join(output, "agent-comparison.json"),
      JSON.stringify({ experimentId: id, ...report }, null, 2),
      { mode: 0o600 },
    );
  };
  const config = agentEvalConfig();
  if (!config.ok) {
    const report = {
      kind: "agent_comparison_attempt",
      status: "pending",
      stage: "model",
      code: config.code,
      executedModelCalls: 0,
      protocolFrozen: false,
    };
    await publish(report);
    console.log(JSON.stringify(report));
    process.exitCode = 2;
    return;
  }
  const databaseUrl = process.env.REA_TEST_DATABASE_URL;
  if (!databaseUrl || !process.env.REA_EVIDENCE_DIR)
    throw Error("isolated_database_and_evidence_dir_required");
  const dbUrl = new URL(databaseUrl);
  if (
    !["127.0.0.1", "localhost"].includes(dbUrl.hostname) ||
    !dbUrl.pathname.startsWith("/rea_test")
  )
    throw Error("isolated_local_test_database_required");
  const fixture = resolve(
    process.env.REA_FIXTURE_DIR || "tests/fixtures/rea-android/frozen",
  );
  const lockA = JSON.parse(
    await readFile(join(fixture, "a/fixture.lock.json"), "utf8"),
  );
  const lockB = JSON.parse(
    await readFile(join(fixture, "b/fixture.lock.json"), "utf8"),
  );
  const bytes = await readFile(join(fixture, "b/fixture.apk"));
  if (
    sha256(bytes) !== lockB.artifactSha256 ||
    lockA.artifactSha256 === lockB.artifactSha256
  )
    throw Error("fixture_seal_mismatch");
  const db = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
  const journal = new AgentExperimentJournal(dir);
  let protocolSha256: string | undefined,
    attemptedModelCalls = 0,
    completedModelCalls = 0,
    stage = "memory";
  try {
    const store = new ProofStore(db),
      vault = new EvidenceVault(process.env.REA_EVIDENCE_DIR),
      memory = new SuccessMemory(store, vault),
      bridge = new AndroidBridge();
    const access = {
      userId: "rea-synthetic-pilot",
      projectId: "rea-fixture-pilot",
      identityVerified: true,
      runId: randomUUID(),
      leaseId: randomUUID(),
    };
    const lessons = await memory.recall(access, PINNED_ENGINE);
    const source = lessons.find(
      (r) =>
        r.applicability === "valid" &&
        r.lesson.artifactSha256 === lockA.artifactSha256,
    )?.lesson;
    if (!source) throw Error("verified_procedure_a_required");
    const snapshot = (l: typeof source): ProcedureSnapshot => ({
      id: l.id,
      revision: l.revision,
      procedure: l.procedure,
      limitations: l.limitations,
      engineFingerprint: l.engineFingerprint,
    });
    const sourceLesson = snapshot(source),
      order: Condition[] = randomInt(2)
        ? ["without_memory", "with_verified_procedure"]
        : ["with_verified_procedure", "without_memory"];
    const protocol = freezeAgentProtocol({
      artifactSha256: lockB.artifactSha256,
      sourceLesson,
      model: config.model,
      backend: "litellm",
      maxModelCalls: 8,
      maxToolCalls: 8,
      maxOutputTokens: 2000,
      maxTotalTokens: 16000,
      maxBudgetUsd: config.totalBudgetUsd / 2,
      order,
    });
    protocolSha256 = protocol.sha256;
    const protocolRef = await vault.save(
      access,
      Buffer.from(canonical(protocol)),
    );
    await writeFile(
      join(dir, "protocol.json"),
      JSON.stringify({ protocol, protocolRef }, null, 2),
      { flag: "wx", mode: 0o600 },
    );
    stage = "engine";
    const artifact = await store.createArtifact(access, {
      sha256: lockB.artifactSha256,
      name: "held-out-synthetic.apk",
      bytes: bytes.length,
      handle: await bridge.upload(bytes, scopeKey(access)),
      synthetic: true,
    });
    const trials = await runAgentConditions({
      conditions: order,
      journal,
      open: async (condition) => {
        stage = "model";
        return openAgentModel({
          userId: access.userId,
          sessionId: `rea-agent-${id}-${condition}`,
          model: protocol.model,
          maxBudgetUsd: protocol.maxBudgetUsd,
          maxOutputTokens: protocol.maxOutputTokens,
        });
      },
      run: async (condition, session) => {
        const trialAccess = {
          ...access,
          runId: randomUUID(),
          leaseId: randomUUID(),
        };
        return runAgentTrial({
          access: trialAccess,
          protocol,
          condition,
          vault,
          driver: {
            kind: session.driver.kind,
            async invoke(messages, signal) {
              attemptedModelCalls++;
              const reply = await session.driver.invoke(messages, signal);
              completedModelCalls++;
              return reply;
            },
          },
          revalidateProcedure: async () => {
            const current = (
              await memory.recall(trialAccess, PINNED_ENGINE)
            ).find(
              (r) => r.applicability === "valid" && r.lesson.id === source.id,
            );
            return current ? snapshot(current.lesson) : null;
          },
          execute: async (request, signal) => {
            const current = await store.artifact(trialAccess, artifact.id);
            return bridge.analyze(
              current.handle,
              scopeKey(trialAccess),
              request,
              signal,
            );
          },
        });
      },
      save: async (condition, trial) => {
        const ref = await vault.save(
          trial.access,
          Buffer.from(canonical(trial)),
        );
        await writeFile(
          join(dir, condition + ".json"),
          JSON.stringify({ trial, ref }, null, 2),
          { flag: "wx", mode: 0o600 },
        );
        return ref;
      },
    });
    // Neither model receives an oracle or grading feedback. Only now load B's
    // reference and run deterministic grading on the durable tool/final blobs.
    stage = "verification";
    const oracle = JSON.parse(
      await readFile(join(fixture, "b/oracle.json"), "utf8"),
    );
    if (
      sha256(JSON.stringify(oracle)) !== lockB.oracleHash ||
      oracle.artifactSha256 !== protocol.artifactSha256
    )
      throw Error("oracle_seal_mismatch");
    const graded = [];
    for (const trial of trials)
      graded.push(
        await gradeAgentTrial(trial, oracle, lockB.oracleHash, vault),
      );
    const comparison = compareAgentTrials(protocol, graded);
    const report = {
      kind: comparison.kind,
      status: comparison.valid ? "completed" : "inconclusive",
      experimentId: id,
      protocolSha256,
      protocolRef,
      comparison,
      trials: graded,
      ...journal.snapshot(),
      attemptedModelCalls,
      completedModelCalls,
      executedModelCalls:
        attemptedModelCalls === completedModelCalls
          ? completedModelCalls
          : null,
      targetExecuted: false,
      holdoutPromoted: false,
    };
    const reportRef = await vault.save(access, Buffer.from(canonical(report)));
    stage = "persistence";
    await db.reaLearningOutbox.upsert({
      where: {
        lessonId_lessonRevision_destination: {
          lessonId: source.id,
          lessonRevision: source.revision,
          destination: `agent-eval:${id}`,
        },
      },
      update: {},
      create: {
        lessonId: source.id,
        lessonRevision: source.revision,
        destination: `agent-eval:${id}`,
        state: comparison.valid ? "delivered" : "failed",
        payload: JSON.parse(
          JSON.stringify({
            experimentId: id,
            protocolSha256,
            reportRef,
            kind: report.kind,
            status: report.status,
          }),
        ),
      },
    });
    await publish({ ...report, reportRef });
    console.log(
      JSON.stringify({
        kind: report.kind,
        status: report.status,
        experimentId: id,
        protocolSha256,
        passDelta: comparison.passDelta,
        toolCallDelta: comparison.toolCallDelta,
        tokenDelta: comparison.tokenDelta,
        costDeltaUsd: comparison.costDeltaUsd,
        trials: graded.map((t) => ({
          condition: t.condition,
          pass: t.pass,
          modelCalls: t.modelCalls,
          toolCalls: t.toolCalls,
          status: t.status,
          receiptId: t.receipt.id,
        })),
        cleanup: journal.snapshot().cleanup,
        targetExecuted: false,
        holdoutPromoted: false,
      }),
    );
    if (!comparison.valid || journal.snapshot().cleanup.some((c) => !c.revoked))
      process.exitCode = 1;
  } catch {
    const report = {
      kind: "agent_comparison_attempt",
      status: "failed",
      stage,
      code: "agent_comparison_failed",
      ...journal.snapshot(),
      unresolvedModelCalls: attemptedModelCalls - completedModelCalls,
      protocolSha256,
      attemptedModelCalls,
      completedModelCalls,
      executedModelCalls:
        attemptedModelCalls === completedModelCalls
          ? completedModelCalls
          : null,
    };
    await publish(report);
    console.log(JSON.stringify(report));
    process.exitCode = 1;
  } finally {
    await db.$disconnect();
  }
}
main().catch((e) => {
  console.error(
    [
      "explicit_agent_comparison_required",
      "fixture_b_holdout_required",
      "invalid_experiment_id",
      "isolated_database_and_evidence_dir_required",
      "isolated_local_test_database_required",
      "fixture_seal_mismatch",
    ].includes(e.message)
      ? e.message
      : "agent_experiment_preflight_failed",
  );
  process.exitCode = 1;
});
