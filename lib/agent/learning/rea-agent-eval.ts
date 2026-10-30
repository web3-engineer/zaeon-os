import { randomUUID } from "node:crypto";
import { registerTool, err, type ToolContext, type ToolDef } from "../runtime";
import { novaSessao, runOctaTool } from "../../octa/runner";
import { REGRA_DADOS_NAO_COMANDOS } from "../../octa/untrusted";
import { androidCommand, requireAccess } from "../../octa/android/policy";
import { EvidenceVault, canonical, sha256 } from "../../octa/android/evidence";
import {
  normalizeEvidence,
  verifyProof,
  PINNED_ENGINE,
} from "../../octa/android/verifier";
import type {
  Access,
  AndroidRequest,
  EvidenceRef,
  Facts,
  Oracle,
} from "../../octa/android/types";

export type Condition = "without_memory" | "with_verified_procedure";
export type ProcedureSnapshot = {
  id: string;
  revision: number;
  procedure: string;
  limitations: string[];
  engineFingerprint: string;
};
export type ModelMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: {
    id: string;
    type: "function";
    function: { name: string; arguments: string };
  }[];
  tool_call_id?: string;
};
export type ModelReply = {
  content: string | null;
  toolCalls: { id: string; name: string; arguments: string }[];
  inputTokens: number;
  outputTokens: number;
  costUsd: number | null;
  providerModel: string;
  deploymentId?: string;
};
export interface AgentModelDriver {
  kind: "litellm" | "test_double";
  invoke(messages: ModelMessage[], signal: AbortSignal): Promise<ModelReply>;
}
const task =
  "Identifique pacote, versão e Activity do APK; encontre o método de marcação e seu literal retornado; diga se INTERNET está declarada. Use evidências novas do artefato desta sessão.";
const keys: ReadonlyArray<keyof Facts> = [
  "packageName",
  "versionCode",
  "activity",
  "className",
  "methodSignature",
  "returnedLiteral",
  "internetDeclared",
];
const toolSpecs = [
  {
    name: "rea_eval_package",
    description: "Lê manifesto e metadados do APK desta sessão.",
    props: {},
  },
  {
    name: "rea_eval_search",
    description: "Busca classes no APK desta sessão.",
    props: { query: "Texto para procurar no nome das classes" },
  },
  {
    name: "rea_eval_class",
    description: "Inspeciona uma classe selecionada no APK.",
    props: { className: "Nome completo de classe descoberta nas evidências" },
  },
  {
    name: "rea_eval_method",
    description: "Inspeciona o corpo de um método selecionado no APK.",
    props: {
      className: "Nome completo da classe descoberta",
      methodName: "Nome do método",
    },
  },
];
export const REA_AGENT_TOOLS = toolSpecs.map((t) => ({
  type: "function" as const,
  function: {
    name: t.name,
    description: t.description,
    parameters: {
      type: "object",
      properties: Object.fromEntries(
        Object.entries(t.props).map(([k, description]) => [
          k,
          { type: "string", description },
        ]),
      ),
      required: Object.keys(t.props),
      additionalProperties: false,
    },
  },
}));
const system = [
  "Você analisa um APK somente pelas ferramentas estáticas de leitura desta sessão.",
  REGRA_DADOS_NAO_COMANDOS,
  "Memória contém somente procedimento e limites; nunca copie fatos de outro APK.",
  "A verificação exige evidências do pacote, de uma busca de classes concluída e da inspeção do método escolhido; encontrar uma string na classe não basta.",
  "versionCode deve ser inteiro e internetDeclared booleano. Activity e className são nomes completos. methodSignature é a concatenação de method.name com method.dex_descriptor reportados pela ferramenta.",
  "Cite a evidência do pacote em packageName, versionCode, activity e internetDeclared; a busca ou método em className; o método em methodSignature e returnedLiteral.",
  `No final retorne exclusivamente JSON com duas chaves: facts e evidence. facts tem exatamente ${keys.join(", ")}. evidence mapeia cada uma dessas chaves a uma lista de evidenceId vistos nas ferramentas. Não inclua pass, verdict, oracle ou recibos.`,
].join("\n");
export type AgentProtocol = ReturnType<typeof freezeAgentProtocol>;
type ProtocolInput = {
  artifactSha256: string;
  sourceLesson: ProcedureSnapshot;
  model: string;
  backend: AgentModelDriver["kind"];
  maxModelCalls: number;
  maxToolCalls: number;
  maxOutputTokens: number;
  maxTotalTokens: number;
  maxBudgetUsd: number;
  order: Condition[];
};
export function freezeAgentProtocol(input: ProtocolInput) {
  if (
    !/^[a-f0-9]{64}$/.test(input.artifactSha256) ||
    !input.model ||
    input.model.length > 200 ||
    !["litellm", "test_double"].includes(input.backend)
  )
    throw Error("invalid_protocol");
  for (const [n, max] of [
    [input.maxModelCalls, 12],
    [input.maxToolCalls, 10],
    [input.maxOutputTokens, 4000],
    [input.maxTotalTokens, 32000],
  ])
    if (!Number.isInteger(n) || n < 1 || n > max) throw Error("invalid_budget");
  if (
    !Number.isFinite(input.maxBudgetUsd) ||
    input.maxBudgetUsd <= 0 ||
    input.maxBudgetUsd > 5 ||
    input.order.length !== 2 ||
    new Set(input.order).size !== 2 ||
    input.order.some(
      (c) => !["without_memory", "with_verified_procedure"].includes(c),
    )
  )
    throw Error("invalid_budget");
  const sourceLesson = {
    id: input.sourceLesson.id,
    revision: input.sourceLesson.revision,
    procedure: input.sourceLesson.procedure,
    limitations: [...input.sourceLesson.limitations],
    engineFingerprint: input.sourceLesson.engineFingerprint,
  };
  if (
    !sourceLesson.id ||
    !Number.isInteger(sourceLesson.revision) ||
    sourceLesson.revision < 1 ||
    sourceLesson.procedure.length > 4000
  )
    throw Error("invalid_procedure");
  const body = {
    schema: "zaeon.rea.agent-comparison.v1" as const,
    ...input,
    sourceLesson,
    order: [...input.order],
    task,
    system,
    engine: { ...PINNED_ENGINE },
    toolsSha256: sha256(canonical(REA_AGENT_TOOLS)),
    temperature: 0,
    maxPromptBytes: 100_000,
  };
  const frozen = { ...body, sha256: sha256(canonical(body)) };
  const freeze = (value: unknown) => {
    if (value && typeof value === "object") {
      Object.values(value).forEach(freeze);
      Object.freeze(value);
    }
  };
  freeze(frozen);
  return frozen;
}
function verifyProtocol(p: AgentProtocol) {
  const { sha256: digest, ...body } = p;
  if (
    sha256(canonical(body)) !== digest ||
    p.toolsSha256 !== sha256(canonical(REA_AGENT_TOOLS))
  )
    throw Error("protocol_integrity");
}
function typedRequest(name: string, args: unknown): AndroidRequest {
  const spec = toolSpecs.find((t) => t.name === name);
  if (
    !spec ||
    !args ||
    typeof args !== "object" ||
    Array.isArray(args) ||
    Object.keys(args).some((k) => !Object.hasOwn(spec.props, k)) ||
    Object.keys(spec.props).some((k) => typeof (args as any)[k] !== "string")
  )
    throw Error("invalid_parameters");
  const a = args as Record<string, string>;
  const request: AndroidRequest =
    name === "rea_eval_package"
      ? { goal: "overview" }
      : name === "rea_eval_search"
        ? { goal: "search", query: a.query }
        : name === "rea_eval_class"
          ? { goal: "class", className: a.className }
          : {
              goal: "method",
              className: a.className,
              methodName: a.methodName,
            };
  androidCommand(request);
  return request;
}
type EvalContext = ToolContext & {
  reaEvalCall?: (request: AndroidRequest) => Promise<unknown>;
};
for (const spec of toolSpecs) {
  const def: ToolDef = {
    name: spec.name,
    runtime: "ts",
    risk: "read",
    minPlan: "free",
    timeoutMs: 600_000,
    schema: {
      name: spec.name,
      description: spec.description,
      parameters: {
        type: "OBJECT" as any,
        properties: Object.fromEntries(
          Object.entries(spec.props).map(([k, description]) => [
            k,
            { type: "STRING" as any, description },
          ]),
        ),
        required: Object.keys(spec.props),
      },
    },
    async run(args, ctx) {
      const call = (ctx as EvalContext).reaEvalCall;
      if (!call) return err("experimento não autorizado", "permission_denied");
      let request: AndroidRequest;
      try {
        request = typedRequest(spec.name, args);
      } catch {
        return err("parâmetros inválidos", "bad_args");
      }
      const result = await call(request);
      return {
        ok: true,
        findings: [{ claim: JSON.stringify(result), confidence: "alta" }],
        provenance: {},
      };
    },
  };
  registerTool(def);
}
export type AgentTrial = {
  kind: "real_agent_trial" | "mock_agent_trial";
  id: string;
  access: Access;
  artifactSha256: string;
  protocolSha256: string;
  condition: Condition;
  status: "completed" | "budget_exhausted" | "infrastructure_failed";
  errorCode?: string;
  modelCalls: number;
  toolCalls: number;
  deniedToolCalls: number;
  inputTokens: number;
  outputTokens: number;
  costUsd: number | null;
  durationMs: number;
  providerModels: string[];
  deploymentIds: string[];
  trace: EvidenceRef[];
  finalRef: EvidenceRef;
  transcriptRef: EvidenceRef;
};
type TrialOptions = {
  access: Access;
  protocol: AgentProtocol;
  condition: Condition;
  vault: EvidenceVault;
  driver: AgentModelDriver;
  execute: (request: AndroidRequest, signal: AbortSignal) => Promise<unknown>;
  revalidateProcedure: () => Promise<ProcedureSnapshot | null>;
  signal?: AbortSignal;
};
export async function runAgentTrial(o: TrialOptions): Promise<AgentTrial> {
  requireAccess(o.access);
  verifyProtocol(o.protocol);
  const p = o.protocol;
  if (o.driver.kind !== p.backend || !p.order.includes(o.condition))
    throw Error("protocol_backend_mismatch");
  const revalidate = async () => {
    if (o.condition === "without_memory") return;
    const current = await o.revalidateProcedure();
    if (!current || canonical(current) !== canonical(p.sourceLesson))
      throw Error("lesson_unavailable");
  };
  await revalidate();
  const id = randomUUID(),
    controller = new AbortController(),
    timer = setTimeout(() => controller.abort(), 600_000);
  const signal = o.signal
    ? AbortSignal.any([o.signal, controller.signal])
    : controller.signal;
  const start = Date.now(),
    messages: ModelMessage[] = [
      { role: "system", content: p.system },
      { role: "user", content: p.task },
    ];
  if (o.condition === "with_verified_procedure")
    messages.splice(1, 0, {
      role: "system",
      content:
        "Procedimento verificado recuperado nesta sessão (não contém respostas do APK alvo):\n" +
        JSON.stringify({
          procedure: p.sourceLesson.procedure,
          limitations: p.sourceLesson.limitations,
        }),
    });
  const trace: EvidenceRef[] = [],
    models = new Set<string>(),
    deployments = new Set<string>();
  let modelCalls = 0,
    toolCalls = 0,
    deniedToolCalls = 0,
    inputTokens = 0,
    outputTokens = 0,
    cost: number | null = 0,
    status: AgentTrial["status"] = "completed",
    errorCode: string | undefined,
    finalText = "",
    modelInFlight = false;
  const metadata = {
    trialId: id,
    protocolSha256: p.sha256,
    condition: o.condition,
  };
  const session = novaSessao({
    sessionId: id,
    task: { id, mode: "review", fileLock: [], subagentBudget: 0 },
    ctx: {
      userId: o.access.userId,
      plan: "free",
      execMode: "auto",
      reaEvalCall: async (request: AndroidRequest) => {
        signal.throwIfAborted();
        await revalidate();
        if (toolCalls >= p.maxToolCalls) throw Error("tool_budget_exhausted");
        toolCalls++;
        const evidence: any = await o.execute(request, signal);
        signal.throwIfAborted();
        const ref = await o.vault.save(
          o.access,
          Buffer.from(JSON.stringify({ ...metadata, request, evidence })),
        );
        trace.push(ref);
        const delivered = {
          evidenceId: ref.id,
          operation: evidence?.operation,
          coverage: "complete",
          normalized_result: evidence?.normalized_result,
        };
        return Buffer.byteLength(JSON.stringify(delivered)) <= 32_000
          ? delivered
          : {
              evidenceId: ref.id,
              coverage: "partial",
              error: "context_limit_refine",
            };
      },
    } as EvalContext,
  });
  try {
    for (let turn = 0; turn < p.maxModelCalls; turn++) {
      signal.throwIfAborted();
      await revalidate();
      if (Buffer.byteLength(JSON.stringify(messages)) > p.maxPromptBytes)
        throw Error("context_budget_exhausted");
      modelCalls++;
      modelInFlight = true;
      const reply = await o.driver.invoke(structuredClone(messages), signal);
      modelInFlight = false;
      if (
        !Number.isSafeInteger(reply.inputTokens) ||
        reply.inputTokens < 0 ||
        !Number.isSafeInteger(reply.outputTokens) ||
        reply.outputTokens < 0 ||
        !reply.providerModel ||
        (reply.costUsd !== null &&
          (!Number.isFinite(reply.costUsd) || reply.costUsd < 0))
      )
        throw Error("model_usage_unavailable");
      inputTokens += reply.inputTokens;
      outputTokens += reply.outputTokens;
      cost =
        cost === null || reply.costUsd === null ? null : cost + reply.costUsd;
      models.add(reply.providerModel);
      if (reply.deploymentId) deployments.add(reply.deploymentId);
      if (
        inputTokens + outputTokens > p.maxTotalTokens ||
        reply.outputTokens > p.maxOutputTokens ||
        (cost !== null && cost > p.maxBudgetUsd)
      )
        throw Error("model_budget_exhausted");
      const calls = reply.toolCalls;
      if (!calls.length) {
        finalText = reply.content ?? "";
        messages.push({ role: "assistant", content: finalText });
        break;
      }
      messages.push({
        role: "assistant",
        content: reply.content,
        tool_calls: calls.map((c) => ({
          id: c.id,
          type: "function",
          function: { name: c.name, arguments: c.arguments },
        })),
      });
      for (const call of calls) {
        if (toolCalls >= p.maxToolCalls) throw Error("tool_budget_exhausted");
        if (!toolSpecs.some((t) => t.name === call.name)) {
          deniedToolCalls++;
          messages.push({
            role: "tool",
            tool_call_id: call.id,
            content:
              "NEGADO: ferramenta fora da allowlist estática do experimento.",
          });
          continue;
        }
        let args: unknown;
        try {
          args = JSON.parse(call.arguments);
        } catch {
          args = null;
        }
        const result = await runOctaTool(call.name, args, session);
        messages.push({
          role: "tool",
          tool_call_id: call.id,
          content: result.paraModelo,
        });
        if (!result.ok) {
          deniedToolCalls++;
          if (result.code !== "bad_args") throw Error("engine_or_guard_failed");
        }
      }
      if (turn === p.maxModelCalls - 1) throw Error("model_budget_exhausted");
    }
    await revalidate();
  } catch (e) {
    controller.abort();
    if (modelInFlight) cost = null;
    const code = (e as Error).message;
    status = /budget_exhausted/.test(code)
      ? "budget_exhausted"
      : "infrastructure_failed";
    errorCode = [
      "model_budget_exhausted",
      "tool_budget_exhausted",
      "context_budget_exhausted",
      "lesson_unavailable",
      "model_usage_unavailable",
    ].includes(code)
      ? code
      : "model_or_engine_failed";
  } finally {
    clearTimeout(timer);
  }
  const finalRef = await o.vault.save(
    o.access,
    Buffer.from(JSON.stringify({ ...metadata, text: finalText })),
  );
  const transcriptRef = await o.vault.save(
    o.access,
    Buffer.from(
      JSON.stringify({
        ...metadata,
        messages,
        trace: session.tracer.encerrar(),
      }),
    ),
  );
  return {
    kind: o.driver.kind === "litellm" ? "real_agent_trial" : "mock_agent_trial",
    id,
    access: o.access,
    artifactSha256: p.artifactSha256,
    protocolSha256: p.sha256,
    condition: o.condition,
    status,
    errorCode,
    modelCalls,
    toolCalls,
    deniedToolCalls,
    inputTokens,
    outputTokens,
    costUsd: cost,
    durationMs: Date.now() - start,
    providerModels: [...models],
    deploymentIds: [...deployments],
    trace,
    finalRef,
    transcriptRef,
  };
}
export async function gradeAgentTrial(
  trial: AgentTrial,
  oracle: Oracle,
  oracleHash: string,
  vault: EvidenceVault,
) {
  const read = async (ref: EvidenceRef) => {
    const value = JSON.parse(
      (await vault.read(trial.access, ref)).toString("utf8"),
    );
    if (
      value.trialId !== trial.id ||
      value.protocolSha256 !== trial.protocolSha256 ||
      value.condition !== trial.condition
    )
      throw Error("trial_evidence_mismatch");
    return value;
  };
  const final = await read(trial.finalRef);
  await read(trial.transcriptRef);
  const calls = await Promise.all(
    trial.trace.map(async (ref) => ({ ref, ...(await read(ref)) })),
  );
  const last = (op: string, predicate: (v: any) => boolean = () => true) =>
    calls
      .filter(
        (c) =>
          c.evidence?.operation === op &&
          predicate(c.evidence.normalized_result),
      )
      .at(-1);
  const method = last("inspect_android_method"),
    search = last("search_android_classes", (r) =>
      r.matches?.includes(method?.evidence?.normalized_result?.class_name),
    ),
    pkg = last("inspect_android_package");
  const selected = [pkg, search, method].filter(
    (c): c is NonNullable<typeof c> => !!c,
  );
  const raw = Buffer.from(
    JSON.stringify({
      proofRunId: trial.id,
      documents: selected.map((c) => c.evidence),
    }),
  );
  const ref = await vault.save(trial.access, raw),
    observation = normalizeEvidence(await vault.read(trial.access, ref), [ref]);
  const receipt = verifyProof(oracle, observation, oracleHash);
  let claim: any;
  try {
    claim = JSON.parse(final.text);
  } catch {
    claim = null;
  }
  const format =
    !!claim &&
    Object.keys(claim).sort().join(",") === "evidence,facts" &&
    claim.facts &&
    Object.keys(claim.facts).sort().join(",") === [...keys].sort().join(",") &&
    claim.evidence &&
    Object.keys(claim.evidence).sort().join(",") === [...keys].sort().join(",");
  const answer = !!format && canonical(claim.facts) === canonical(oracle.facts);
  const sources =
    !!format &&
    keys.every((key) => {
      const ids = claim.evidence?.[key];
      const valid =
        key === "className"
          ? [search?.ref.id, method?.ref.id]
          : [
              (["methodSignature", "returnedLiteral"] as string[]).includes(key)
                ? method?.ref.id
                : pkg?.ref.id,
            ];
      return (
        Array.isArray(ids) &&
        ids.length > 0 &&
        ids.length <= 2 &&
        ids.every((id) => typeof id === "string" && valid.includes(id))
      );
    });
  const target =
    trial.artifactSha256 === observation.artifactSha256 &&
    trial.artifactSha256 === oracle.artifactSha256;
  return {
    ...trial,
    receipt,
    observation,
    claimHash: sha256(canonical(claim)),
    answerChecks: [
      { id: "target_artifact", pass: target },
      { id: "answer_format", pass: !!format },
      { id: "answer_facts", pass: answer },
      { id: "answer_sources", pass: sources },
    ],
    pass:
      trial.status === "completed" &&
      receipt.pass &&
      answer &&
      sources &&
      target,
  };
}
export function compareAgentTrials(
  protocol: AgentProtocol,
  trials: Awaited<ReturnType<typeof gradeAgentTrial>>[],
) {
  verifyProtocol(protocol);
  const without = trials.find((t) => t.condition === "without_memory"),
    withMemory = trials.find((t) => t.condition === "with_verified_procedure");
  const valid =
    trials.length === 2 &&
    !!without &&
    !!withMemory &&
    trials.every(
      (t) =>
        t.protocolSha256 === protocol.sha256 &&
        t.artifactSha256 === protocol.artifactSha256 &&
        ["completed", "budget_exhausted"].includes(t.status) &&
        t.providerModels.length === 1 &&
        t.deploymentIds.length <= 1 &&
        (protocol.backend === "litellm"
          ? t.kind === "real_agent_trial"
          : t.kind === "mock_agent_trial"),
    ) &&
    canonical(without.providerModels) ===
      canonical(withMemory.providerModels) &&
    canonical(without.deploymentIds) === canonical(withMemory.deploymentIds);
  return {
    kind:
      protocol.backend === "litellm"
        ? "real_agent_comparison"
        : "mock_agent_comparison",
    protocolSha256: protocol.sha256,
    valid,
    passDelta: valid ? Number(withMemory!.pass) - Number(without!.pass) : null,
    toolCallDelta: valid ? withMemory!.toolCalls - without!.toolCalls : null,
    tokenDelta: valid
      ? withMemory!.inputTokens +
        withMemory!.outputTokens -
        without!.inputTokens -
        without!.outputTokens
      : null,
    costDeltaUsd:
      valid && withMemory!.costUsd !== null && without!.costUsd !== null
        ? withMemory!.costUsd - without!.costUsd
        : null,
    limitations: [
      "One synthetic paired case; no statistical or Android-wide generalization.",
      "No automatic lesson promotion, prompt optimization or training from fixture B.",
    ],
  };
}
