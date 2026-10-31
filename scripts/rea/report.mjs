// Publish only synthetic allowlisted proof metadata; never copy raw engine blobs.
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve, join } from "node:path";
const root = resolve(".superpowers/rea-results");
const read = async (path) => {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch {
    return null;
  }
};
const clean = (result) => ({
  proofRunId: result.observation.proofRunId,
  artifactSha256: result.observation.artifactSha256,
  engine: result.observation.engine,
  facts: result.observation.facts,
  complete: result.observation.complete,
  evidence: result.observation.evidence.map(
    ({ id, sha256, bytes, coverage }) => ({ id, sha256, bytes, coverage }),
  ),
  receipt: result.receipt,
  durationMs: result.durationMs,
});
const runs = [];
for (const source of [
  "a.json",
  "docker/a.json",
  "final/a.json",
  "final-success/a.json",
]) {
  const report = await read(join(root, source));
  if (report)
    runs.push({
      source,
      kind: report.kind,
      fixture: report.fixture,
      results: report.results.map(clean),
    });
}
const qualification = [];
for (const [environment, path] of [
  ["native", ".superpowers/rea-qualification.json"],
  ["docker-amd64", ".superpowers/rea-docker-qualification.json"],
]) {
  const r = await read(path);
  if (r)
    qualification.push({
      environment,
      ok: r.ok,
      checks: r.checks,
      jarSha256: r.details?.jarSha256,
      rea: r.details?.rea,
      javaBase: r.details?.compiler?.match(/java\.base@[^\s]+/)?.[0],
      targetExecuted: false,
    });
}
const recalled = await read(join(root, "a-recall.json"));
const transfer = await read(join(root, "transfer-b.json"));
const remote = await read(join(root, "overmind.json"));
const web = await read(".superpowers/web-smoke/report.json");
const webRuns = await read(".superpowers/web-smoke/verified-runs.json");
const agent = await read(join(root, "agent-comparison.json"));
const report = {
  schema: "zaeon.rea.qualification.v1",
  qualification,
  runs,
  recall: recalled
    ? {
        kind: recalled.kind,
        lessonId: recalled.lessonId,
        clientHistoryUsed: recalled.clientHistoryUsed,
        engineDrift: recalled.engineDrift,
      }
    : null,
  transfer: transfer
    ? {
        kind: transfer.kind,
        artifactSha256: transfer.artifactSha256,
        conditions: transfer.conditions.map((r) => ({
          condition: r.condition,
          ...clean(r),
          modelCalls: r.modelCalls,
          procedureRecovered: r.procedureRecovered,
        })),
        copiedARejected: transfer.copiedARejected,
        invalidApkRejected: transfer.invalidApkRejected,
        agentQualityComparison: transfer.agentQualityComparison,
        limitations: transfer.limitations,
      }
    : null,
  overmind: remote
    ? {
        manifestSha256: remote.bundle.manifestSha256,
        rowHashes: remote.bundle.rowHashes,
        outcome: remote.outcome,
      }
    : null,
  webSmoke: web ? { ...web, results: webRuns?.map(clean) ?? [] } : null,
  agentComparison: agent
    ? {
        kind: agent.kind,
        status: agent.status,
        code: agent.code ?? null,
        experimentId: agent.experimentId,
        protocolSha256: agent.protocolSha256 ?? null,
        executedModelCalls: agent.executedModelCalls ?? null,
        comparison: agent.comparison
          ? {
              valid: agent.comparison.valid,
              passDelta: agent.comparison.passDelta,
              toolCallDelta: agent.comparison.toolCallDelta,
              tokenDelta: agent.comparison.tokenDelta,
              costDeltaUsd: agent.comparison.costDeltaUsd,
            }
          : null,
      }
    : null,
  limits: [
    "Static analysis only. No APK execution or signature/security certification.",
    "Overmind remote evaluation and LLM-quality improvement remain unqualified until an actual configured experiment completes.",
    "Native first proof used JDK24; target Docker proof used JDK21.",
    "A final/final-success absent result is not a success; failed receipts are retained.",
  ],
};
const destination = resolve("docs/rea-proof");
await mkdir(destination, { recursive: true });
await writeFile(
  join(destination, "qualification.json"),
  JSON.stringify(report, null, 2) + "\n",
);
console.log(
  JSON.stringify({
    runs: runs.length,
    transfer: !!transfer,
    webSmoke: !!web,
    overmind: remote?.outcome?.status ?? "not_run",
  }),
);
