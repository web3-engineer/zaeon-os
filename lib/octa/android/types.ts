/** Server-owned proof contracts. A successful static task is not a runtime/security verdict. */
export type Access = {
  projectOwnerId?: string;
  userId: string;
  projectId: string;
  runId: string;
  leaseId: string;
  identityVerified: boolean;
};
export type EvidenceRef = {
  id: string;
  sha256: string;
  bytes: number;
  locator: string;
  coverage: "complete" | "partial" | "unknown";
};
export type Facts = {
  packageName: string;
  versionCode: number;
  activity: string;
  className: string;
  methodSignature: string;
  returnedLiteral: string;
  internetDeclared: boolean;
};
export type Oracle = {
  fixtureId: "A" | "B";
  artifactSha256: string;
  sourceHash: string;
  facts: Facts;
};
export type Engine = { rea: string; jadx: string; jarSha256: string };
export type Observation = {
  proofRunId: string;
  artifactSha256: string;
  engine: Engine;
  evidence: EvidenceRef[];
  facts: Partial<Facts>;
  factSources: Partial<Record<keyof Facts, string[]>>;
  complete: boolean;
};
export type Check = { id: string; pass: boolean; detail: string };
export type Receipt = {
  id: string;
  proofRunId: string;
  inputHash: string;
  oracleHash: string;
  evidenceHashes: string[];
  verifierVersion: string;
  checks: Check[];
  pass: boolean;
  createdAt: string;
};
export type Lesson = {
  id: string;
  ownerId: string;
  projectId: string;
  proofRunIds: string[];
  receiptIds: string[];
  artifactSha256: string;
  objective: string;
  procedure: string;
  limitations: string[];
  engineFingerprint: string;
  revision: number;
  state: "candidate" | "verified_project" | "retired";
};
export type RecalledLesson = {
  lesson: Lesson;
  applicability: "valid" | "needs_revalidation";
};
export type DatasetBundle = {
  id: string;
  version: string;
  manifestSha256: string;
  jsonlRef: string;
  rowHashes: string[];
  proofRunIds: string[];
  purpose: "eval";
  synthetic: true;
};
export type ExperimentOutcome =
  | {
      backend: "overmind";
      projectId: string;
      datasetId: string;
      datasetVersion: string;
      evaluationId: string;
      manifestSha256: string;
      returnedRowHashes: string[];
      status: "completed";
      resultRef: string;
    }
  | {
      backend: "overmind";
      status: "failed" | "pending";
      stage: "import" | "evaluation";
      code: string;
      datasetId?: string;
    };
export type AndroidRequest = {
  goal: "overview" | "search" | "class" | "method" | "references";
  className?: string;
  methodName?: string;
  query?: string;
};
