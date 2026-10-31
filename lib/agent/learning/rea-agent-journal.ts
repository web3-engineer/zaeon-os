import { open, rename } from "node:fs/promises";
import { join } from "node:path";
import type { Condition } from "./rea-agent-eval";
type TrialSummary = {
  id: string;
  costUsd: number | null;
  knownCostUsd: number;
  unknownCostModelCalls: number;
};

/** Private incremental journal, including cleanup when later stages fail. */
export class AgentExperimentJournal {
  private trialResults: {
    condition: Condition;
    trialId: string;
    ref: unknown;
    costUsd: number | null;
    knownCostUsd: number;
    unknownCostModelCalls: number;
  }[] = [];
  private cleanup: { condition: Condition; revoked: boolean }[] = [];
  constructor(private dir: string) {}
  snapshot() {
    return structuredClone({
      trialResults: this.trialResults,
      cleanup: this.cleanup,
      costs: {
        knownCostUsd: this.trialResults.reduce((n, t) => n + t.knownCostUsd, 0),
        unknownCostModelCalls: this.trialResults.reduce(
          (n, t) => n + t.unknownCostModelCalls,
          0,
        ),
      },
    });
  }
  private async flush() {
    const temp = join(this.dir, ".progress.tmp");
    const file = await open(temp, "w", 0o600);
    try {
      await file.writeFile(JSON.stringify(this.snapshot(), null, 2));
      await file.sync();
    } finally {
      await file.close();
    }
    await rename(temp, join(this.dir, "progress.json"));
    const dir = await open(this.dir, "r");
    try {
      await dir.sync();
    } finally {
      await dir.close();
    }
  }
  async recordTrial(condition: Condition, trial: TrialSummary, ref: unknown) {
    const value = {
      condition,
      trialId: trial.id,
      ref,
      costUsd: trial.costUsd,
      knownCostUsd: trial.knownCostUsd,
      unknownCostModelCalls: trial.unknownCostModelCalls,
    };
    const i = this.trialResults.findIndex((t) => t.trialId === trial.id);
    if (i === -1) this.trialResults.push(value);
    else this.trialResults[i] = value;
    await this.flush();
  }
  async recordCleanup(condition: Condition, revoked: boolean) {
    this.cleanup.push({ condition, revoked });
    await this.flush();
  }
}
export async function runAgentConditions<
  S extends { close(): Promise<boolean> },
  T extends TrialSummary,
>(o: {
  conditions: Condition[];
  journal: AgentExperimentJournal;
  open: (condition: Condition) => Promise<S>;
  run: (condition: Condition, session: S) => Promise<T>;
  save: (condition: Condition, trial: T) => Promise<unknown>;
}) {
  const trials: T[] = [];
  for (const condition of o.conditions) {
    const session = await o.open(condition);
    try {
      const trial = await o.run(condition, session);
      trials.push(trial);
      await o.journal.recordTrial(condition, trial, null);
      const ref = await o.save(condition, trial);
      await o.journal.recordTrial(condition, trial, ref);
    } finally {
      let revoked = false;
      try {
        revoked = await session.close();
      } finally {
        await o.journal.recordCleanup(condition, revoked);
      }
    }
  }
  return trials;
}
