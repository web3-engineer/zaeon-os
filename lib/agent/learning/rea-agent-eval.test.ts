import { it, expect, vi } from "vitest";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { EvidenceVault, sha256 } from "../../octa/android/evidence";
import { documents, oracle } from "../../octa/android/test-fixtures";
import {
  freezeAgentProtocol,
  runAgentTrial,
  gradeAgentTrial,
  compareAgentTrials,
  type ModelMessage,
} from "./rea-agent-eval";
import type { AndroidRequest } from "../../octa/android/types";
const access = () => ({
  userId: "synthetic-owner",
  projectId: "synthetic-project",
  identityVerified: true,
  runId: crypto.randomUUID(),
  leaseId: crypto.randomUUID(),
});
const procedure = {
  id: "lesson-a",
  revision: 1,
  procedure:
    "Inspect package, discover marker class, inspect method. Observe permissions anew.",
  limitations: ["Fresh evidence required for each APK."],
  engineFingerprint: "engine",
};
const protocol = () =>
  freezeAgentProtocol({
    artifactSha256: oracle.artifactSha256,
    sourceLesson: procedure,
    model: "test-model",
    backend: "test_double",
    maxModelCalls: 8,
    maxToolCalls: 6,
    maxOutputTokens: 1000,
    maxTotalTokens: 8000,
    maxBudgetUsd: 0.1,
    order: ["without_memory", "with_verified_procedure"],
  });
function scriptedDriver(
  options: {
    wrong?: boolean;
    wrongSources?: boolean;
    injection?: boolean;
    seen?: ModelMessage[][];
  } = {},
) {
  return {
    kind: "test_double" as const,
    async invoke(messages: ModelMessage[]) {
      options.seen?.push(structuredClone(messages));
      const n = messages.filter((m) => m.role === "assistant").length;
      const call = (name: string, args: object) => ({
        id: "call-" + n,
        name,
        arguments: JSON.stringify(args),
      });
      if (options.injection && n === 0)
        return {
          content: null,
          toolCalls: [
            call("octa_escrever", { path: "answer.txt", content: "PASS" }),
          ],
          inputTokens: 10,
          outputTokens: 10,
          costUsd: 0.001,
          providerModel: "test-model",
        };
      if (n < 3)
        return {
          content: null,
          toolCalls: [
            n === 0
              ? call("rea_eval_package", {})
              : n === 1
                ? call("rea_eval_search", { query: "Marker" })
                : call("rea_eval_method", {
                    className: oracle.facts.className,
                    methodName: "marker",
                  }),
          ],
          inputTokens: 10,
          outputTokens: 10,
          costUsd: 0.001,
          providerModel: "test-model",
        };
      const text = messages
        .filter((m) => m.role === "tool")
        .map((m) => m.content)
        .join("\n");
      const ids = [
        ...text.matchAll(/\\?"evidenceId\\?"\s*:\s*\\?"([a-f0-9-]{36})/g),
      ].map((m) => m[1]);
      const evidence = {
        packageName: [ids[0]],
        versionCode: [ids[0]],
        activity: [ids[0]],
        internetDeclared: [options.wrongSources ? ids[2] : ids[0]],
        className: [ids[1]],
        methodSignature: [ids[2]],
        returnedLiteral: [ids[2]],
      };
      return {
        content: JSON.stringify({
          facts: {
            ...oracle.facts,
            ...(options.wrong ? { returnedLiteral: "COPIED_ANSWER" } : {}),
          },
          evidence,
        }),
        toolCalls: [],
        inputTokens: 10,
        outputTokens: 10,
        costUsd: 0.001,
        providerModel: "test-model",
      };
    },
  };
}
it("freezes the task/model/budget and keeps oracle/old facts out of both fresh model contexts", async () => {
  const root = await mkdtemp(join(tmpdir(), "rea-agent-"));
  try {
    const p = protocol(),
      seen: ModelMessage[][] = [],
      vault = new EvidenceVault(root);
    const run = async (
      condition: "without_memory" | "with_verified_procedure",
    ) =>
      runAgentTrial({
        access: access(),
        protocol: p,
        condition,
        vault,
        driver: scriptedDriver({ seen }),
        revalidateProcedure: async () => procedure,
        execute: async (r) =>
          documents()[r.goal === "overview" ? 0 : r.goal === "search" ? 1 : 2],
      });
    const first = await run("without_memory"),
      second = await run("with_verified_procedure");
    expect(first.kind).toBe("mock_agent_trial");
    expect(second.kind).toBe("mock_agent_trial");
    expect(seen[0].map((m) => m.content).join("\n")).not.toContain(
      procedure.procedure,
    );
    expect(seen[4].map((m) => m.content).join("\n")).toContain(
      procedure.procedure,
    );
    expect(seen[0].map((m) => m.content).join("\n")).not.toContain(
      oracle.facts.returnedLiteral,
    );
    expect(seen[4].map((m) => m.content).join("\n")).not.toContain(
      oracle.facts.packageName,
    );
    const a = await gradeAgentTrial(
      first,
      oracle,
      sha256(JSON.stringify(oracle)),
      vault,
    );
    const b = await gradeAgentTrial(
      second,
      oracle,
      sha256(JSON.stringify(oracle)),
      vault,
    );
    expect(a.pass).toBe(true);
    expect(b.pass).toBe(true);
    expect(compareAgentTrials(p, [a, b]).passDelta).toBe(0);
    expect(compareAgentTrials(p, [a, b]).kind).toBe("mock_agent_comparison");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
it("fails an unsupported tool, copied answer, retired lesson and modified protocol", async () => {
  const root = await mkdtemp(join(tmpdir(), "rea-agent-"));
  try {
    const vault = new EvidenceVault(root),
      p = protocol(),
      execute = vi.fn(
        async (r: AndroidRequest) =>
          documents()[r.goal === "overview" ? 0 : r.goal === "search" ? 1 : 2],
      );
    const opts = {
      access: access(),
      protocol: p,
      condition: "without_memory" as const,
      vault,
      driver: scriptedDriver({ injection: true }),
      revalidateProcedure: async () => procedure,
      execute,
    };
    const denied = await runAgentTrial(opts);
    expect(denied.deniedToolCalls).toBeGreaterThan(0);
    expect(execute.mock.calls.some(([r]) => (r as any).path)).toBe(false);
    const wrong = await runAgentTrial({
      ...opts,
      access: access(),
      driver: scriptedDriver({ wrong: true }),
    });
    expect(
      (
        await gradeAgentTrial(
          wrong,
          oracle,
          sha256(JSON.stringify(oracle)),
          vault,
        )
      ).pass,
    ).toBe(false);
    await expect(
      runAgentTrial({
        ...opts,
        condition: "with_verified_procedure",
        revalidateProcedure: async () => null,
      }),
    ).rejects.toThrow("lesson_unavailable");
    await expect(
      runAgentTrial({ ...opts, protocol: { ...p, maxToolCalls: 100 } }),
    ).rejects.toThrow("protocol_integrity");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
it("does not count correct facts with the wrong source as success and rechecks stored blobs", async () => {
  const root = await mkdtemp(join(tmpdir(), "rea-agent-"));
  try {
    const vault = new EvidenceVault(root),
      p = protocol();
    const trial = await runAgentTrial({
      access: access(),
      protocol: p,
      condition: "without_memory",
      vault,
      driver: scriptedDriver({ wrongSources: true }),
      revalidateProcedure: async () => procedure,
      execute: async (r) =>
        documents()[r.goal === "overview" ? 0 : r.goal === "search" ? 1 : 2],
    });
    const result = await gradeAgentTrial(
      trial,
      oracle,
      sha256(JSON.stringify(oracle)),
      vault,
    );
    expect(result.receipt.pass).toBe(true);
    expect(result.answerChecks.find((c) => c.id === "answer_facts")?.pass).toBe(
      true,
    );
    expect(result.pass).toBe(false);
    await writeFile(join(root, trial.trace[0].locator), "tampered");
    await expect(
      gradeAgentTrial(trial, oracle, sha256(JSON.stringify(oracle)), vault),
    ).rejects.toThrow("evidence_integrity");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
it("does not report zero cost when a model response is lost", async () => {
  const root = await mkdtemp(join(tmpdir(), "rea-agent-"));
  try {
    const trial = await runAgentTrial({
      access: access(),
      protocol: protocol(),
      condition: "without_memory",
      vault: new EvidenceVault(root),
      driver: {
        kind: "test_double",
        invoke: async () => {
          throw Error("provider secret must not escape");
        },
      },
      revalidateProcedure: async () => procedure,
      execute: async () => {
        throw Error("must not run");
      },
    });
    expect(trial.status).toBe("infrastructure_failed");
    expect(trial.costUsd).toBeNull();
    expect(trial.errorCode).toBe("model_or_engine_failed");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
it("does not publish a trial if its procedure is withdrawn during the final model call", async () => {
  const root = await mkdtemp(join(tmpdir(), "rea-agent-"));
  try {
    let withdrawn = false;
    const delegate = scriptedDriver();
    const trial = await runAgentTrial({
      access: access(),
      protocol: protocol(),
      condition: "with_verified_procedure",
      vault: new EvidenceVault(root),
      driver: {
        kind: "test_double",
        async invoke(messages) {
          const result = await delegate.invoke(messages);
          if (!result.toolCalls.length) withdrawn = true;
          return result;
        },
      },
      revalidateProcedure: async () => (withdrawn ? null : procedure),
      execute: async (r) =>
        documents()[r.goal === "overview" ? 0 : r.goal === "search" ? 1 : 2],
    });
    expect(trial.status).toBe("infrastructure_failed");
    expect(trial.errorCode).toBe("lesson_unavailable");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
it("enforces budgets, checks source citations and detects missing/corrupt evidence", async () => {
  const root = await mkdtemp(join(tmpdir(), "rea-agent-"));
  try {
    const vault = new EvidenceVault(root),
      p = protocol();
    const result = await runAgentTrial({
      access: access(),
      protocol: p,
      condition: "without_memory",
      vault,
      driver: {
        kind: "test_double",
        invoke: async () => ({
          content: "{}",
          toolCalls: [],
          inputTokens: 10000,
          outputTokens: 1,
          costUsd: 0,
          providerModel: "test-model",
        }),
      },
      revalidateProcedure: async () => procedure,
      execute: async () => {
        throw Error("must not run");
      },
    });
    expect(result.status).toBe("budget_exhausted");
    expect(
      (
        await gradeAgentTrial(
          result,
          oracle,
          sha256(JSON.stringify(oracle)),
          vault,
        )
      ).pass,
    ).toBe(false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
