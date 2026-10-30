import { it, expect, vi } from "vitest";
import { evaluateOvermind } from "./overmind";
import { canonical, sha256 } from "../../../octa/android/evidence";
const rows = [
  {
    input: "synthetic static task",
    output: { internetDeclared: false },
    reference: { internetDeclared: false },
    proofRunId: "r",
  },
];
const rowHashes = rows.map((r) => sha256(canonical(r)));
const bundle = {
  id: "bundle",
  version: "1",
  manifestSha256: "a".repeat(64),
  jsonlRef: "private.jsonl",
  rowHashes,
  proofRunIds: ["r"],
  purpose: "eval" as const,
  synthetic: true as const,
};
const env = {
  REA_OVERMIND_EVAL: "1",
  OVERMIND_API_KEY: "secret",
  OVERMIND_API_URL: "https://example.org",
  OVERMIND_PROJECT_ID: "project",
  REA_OVERMIND_EVAL_SET: "approved-set",
  REA_OVERMIND_PYTHON: "/private/python",
  REA_OVERMIND_MAX_ITEMS: "2",
};
it("does not send anything without the explicit evaluation gate/configuration", async () => {
  const transport = vi.fn();
  const eligible = vi.fn();
  expect(
    (await evaluateOvermind(bundle, { env: {}, transport, eligible })).status,
  ).toBe("pending");
  expect(transport).not.toHaveBeenCalled();
});
it("requires exact roundtrip, actual evaluation completion, dataset version and remote IDs", async () => {
  const transport = vi
    .fn()
    .mockResolvedValue({
      datasetId: "dataset",
      datasetVersion: "1.0",
      cellId: "cell",
      returnedRows: rows,
      evaluationId: "eval",
      evaluationStatus: "completed",
      evaluatedRowCount: 1,
      evaluatedDatasetId: "dataset",
      evaluatedCellId: "cell",
      result: { scores: [1] },
    });
  const eligible = vi.fn().mockResolvedValue(true);
  const outcome = await evaluateOvermind(bundle, { env, transport, eligible });
  expect(outcome.status).toBe("completed");
  expect(eligible).toHaveBeenCalledTimes(2);
  transport.mockResolvedValue({
    ...(await transport()),
    returnedRows: [{ ...rows[0], output: "changed" }],
  });
  expect(
    (await evaluateOvermind(bundle, { env, transport, eligible })).status,
  ).toBe("failed");
  transport.mockResolvedValue({ datasetId: "dataset", returnedRows: rows });
  expect(
    (await evaluateOvermind(bundle, { env, transport, eligible })).status,
  ).toBe("failed");
});
it("rechecks revocation before upload and before scoring, and rejects missing/duplicated rows", async () => {
  const transport = vi.fn();
  const eligible = vi.fn().mockRejectedValue(Error("retired"));
  expect(
    (await evaluateOvermind(bundle, { env, transport, eligible })).status,
  ).toBe("failed");
  expect(transport).not.toHaveBeenCalled();
  transport.mockResolvedValue({
    datasetId: "dataset",
    returnedRows: [rows[0], rows[0]],
  });
  eligible.mockResolvedValue(true);
  expect(
    (await evaluateOvermind(bundle, { env, transport, eligible })).status,
  ).toBe("failed");
});
