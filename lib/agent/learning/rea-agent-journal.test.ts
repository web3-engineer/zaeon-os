import { it, expect } from "vitest";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  AgentExperimentJournal,
  runAgentConditions,
} from "./rea-agent-journal";

it("persists partial trial costs and failed revocation before the next key creation fails", async () => {
  const dir = await mkdtemp(join(tmpdir(), "rea-journal-"));
  try {
    const journal = new AgentExperimentJournal(dir);
    let opened = 0;
    await expect(
      runAgentConditions({
        conditions: ["without_memory", "with_verified_procedure"],
        journal,
        open: async () => {
          if (++opened === 2) throw Error("second_key_failed");
          return { close: async () => false };
        },
        run: async () => ({
          id: "trial",
          costUsd: null,
          knownCostUsd: 0.01,
          unknownCostModelCalls: 1,
        }),
        save: async () => ({ id: "durable-trial-ref" }),
      }),
    ).rejects.toThrow("second_key_failed");
    const state = JSON.parse(
      await readFile(join(dir, "progress.json"), "utf8"),
    );
    expect(state).toEqual(journal.snapshot());
    expect(state.cleanup).toEqual([
      { condition: "without_memory", revoked: false },
    ]);
    expect(state.trialResults[0]).toMatchObject({
      condition: "without_memory",
      trialId: "trial",
      ref: { id: "durable-trial-ref" },
    });
    expect(state.costs).toEqual({
      knownCostUsd: 0.01,
      unknownCostModelCalls: 1,
    });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
