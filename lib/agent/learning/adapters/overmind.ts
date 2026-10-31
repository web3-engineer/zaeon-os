import type {
  DatasetBundle,
  ExperimentOutcome,
} from "../../../octa/android/types";
import { canonical, sha256 } from "../../../octa/android/evidence";
export const OVERMIND_SOURCE = "16db2447dcf1fa96e29251cfe6c6cd63c4a72132";
export type RemoteResult = {
  datasetId?: string;
  datasetVersion?: string;
  cellId?: string;
  returnedRows?: unknown[];
  evaluationId?: string;
  evaluationStatus?: string;
  evaluatedRowCount?: number;
  evaluatedDatasetId?: string;
  evaluatedCellId?: string;
  result?: unknown;
};
type Options = {
  env: Record<string, string | undefined>;
  eligible: () => Promise<unknown>;
  transport: (
    phase: "import" | "evaluate",
    context: {
      bundle: DatasetBundle;
      requestKey: string;
      imported?: RemoteResult;
    },
  ) => Promise<RemoteResult>;
};
/** A dataset upload is not an evaluation. No remote success is inferred from a
 * local verifier's pass column or a mock transport in a unit test. */
export async function evaluateOvermind(
  bundle: DatasetBundle,
  { env, eligible, transport }: Options,
): Promise<ExperimentOutcome> {
  const pending: ExperimentOutcome = {
    backend: "overmind",
    status: "pending",
    stage: "import",
    code: "overmind_not_configured",
  };
  const required = [
    "OVERMIND_API_KEY",
    "OVERMIND_API_URL",
    "OVERMIND_PROJECT_ID",
    "REA_OVERMIND_EVAL_SET",
    "REA_OVERMIND_PYTHON",
  ];
  if (env.REA_OVERMIND_EVAL !== "1" || required.some((k) => !env[k]))
    return pending;
  const max = Number(env.REA_OVERMIND_MAX_ITEMS);
  if (
    !Number.isInteger(max) ||
    max < 1 ||
    max > 10 ||
    bundle.rowHashes.length > max ||
    !bundle.synthetic ||
    bundle.purpose !== "eval"
  )
    return { ...pending, code: "explicit_bounded_eval_budget_required" };
  let stage: "import" | "evaluation" = "import",
    imported: RemoteResult | undefined;
  try {
    await eligible();
    const requestKey =
      "rea-eval-" +
      sha256(env.OVERMIND_PROJECT_ID + "\0" + bundle.manifestSha256);
    imported = await transport("import", { bundle, requestKey });
    const hashes = imported.returnedRows
      ?.map((r) => sha256(canonical(r)))
      .sort();
    if (
      !imported.datasetId ||
      !imported.datasetVersion ||
      !imported.cellId ||
      canonical(hashes) !== canonical([...bundle.rowHashes].sort())
    )
      throw Error("dataset_roundtrip_mismatch");
    stage = "evaluation";
    await eligible();
    const result = await transport("evaluate", {
      bundle,
      requestKey,
      imported,
    });
    if (
      result.evaluationStatus === "running" ||
      result.evaluationStatus === "pending"
    )
      return {
        backend: "overmind",
        status: "pending",
        stage,
        code: "evaluation_pending",
        datasetId: imported.datasetId,
      };
    if (
      result.evaluationStatus !== "completed" ||
      !result.evaluationId ||
      result.evaluatedDatasetId !== imported.datasetId ||
      result.evaluatedCellId !== imported.cellId ||
      result.evaluatedRowCount !== bundle.rowHashes.length ||
      !result.result
    )
      throw Error("evaluation_receipt_incomplete");
    return {
      backend: "overmind",
      status: "completed",
      projectId: env.OVERMIND_PROJECT_ID!,
      datasetId: imported.datasetId,
      datasetVersion: imported.datasetVersion,
      evaluationId: result.evaluationId,
      manifestSha256: bundle.manifestSha256,
      returnedRowHashes: hashes!,
      resultRef: "eval-runs/" + result.evaluationId,
    };
  } catch (e) {
    const safeCodes = [
      "dataset_roundtrip_mismatch",
      "evaluation_receipt_incomplete",
    ];
    return {
      backend: "overmind",
      status: "failed",
      stage,
      code: safeCodes.includes((e as Error).message)
        ? (e as Error).message
        : "overmind_or_eligibility_failed",
      ...(imported?.datasetId ? { datasetId: imported.datasetId } : {}),
    };
  }
}
