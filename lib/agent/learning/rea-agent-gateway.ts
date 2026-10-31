import { emitirVirtualKey, revogarVirtualKey } from "../../octa/litellm";
import {
  REA_AGENT_TOOLS,
  type AgentModelDriver,
  type ModelReply,
} from "./rea-agent-eval";
type Env = Record<string, string | undefined>;
export function agentEvalConfig(
  env: Env = process.env,
):
  | { ok: true; model: string; totalBudgetUsd: number }
  | { ok: false; code: string } {
  if (
    env.REA_AGENT_EVAL !== "1" ||
    !env.GATEWAY_URL ||
    !env.GATEWAY_MASTER_KEY ||
    !env.REA_AGENT_EVAL_MODEL
  )
    return { ok: false, code: "model_gateway_not_configured" };
  let url: URL;
  try {
    url = new URL(env.GATEWAY_URL);
  } catch {
    return { ok: false, code: "invalid_gateway_url" };
  }
  if (
    url.protocol !== "https:" &&
    !(
      url.protocol === "http:" &&
      ["127.0.0.1", "localhost"].includes(url.hostname)
    )
  )
    return { ok: false, code: "invalid_gateway_url" };
  const totalBudgetUsd = Number(env.REA_AGENT_EVAL_MAX_USD);
  if (
    !Number.isFinite(totalBudgetUsd) ||
    totalBudgetUsd <= 0 ||
    totalBudgetUsd > 5 ||
    env.REA_AGENT_EVAL_MODEL.length > 200
  )
    return { ok: false, code: "explicit_agent_budget_required" };
  return { ok: true, model: env.REA_AGENT_EVAL_MODEL, totalBudgetUsd };
}
async function jsonBounded(response: Response) {
  const reader = response.body?.getReader();
  if (!reader) throw Error("model_response_invalid");
  const chunks: Uint8Array[] = [];
  let n = 0;
  try {
    for (;;) {
      const part = await reader.read();
      if (part.done) break;
      n += part.value.length;
      if (n > 512_000) {
        await reader.cancel();
        throw Error("model_response_invalid");
      }
      chunks.push(part.value);
    }
  } finally {
    reader.releaseLock();
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw Error("model_response_invalid");
  }
}
export async function openAgentModel(
  params: {
    userId: string;
    sessionId: string;
    model: string;
    maxBudgetUsd: number;
    maxOutputTokens: number;
  },
  env: Env = process.env,
  fetcher: typeof fetch = fetch,
): Promise<{ driver: AgentModelDriver; close: () => Promise<boolean> }> {
  const config = agentEvalConfig(env);
  if (!config.ok) throw Error(config.code);
  if (
    params.model !== config.model ||
    params.maxBudgetUsd <= 0 ||
    params.maxBudgetUsd > config.totalBudgetUsd / 2 ||
    !Number.isInteger(params.maxOutputTokens) ||
    params.maxOutputTokens < 1 ||
    params.maxOutputTokens > 4000
  )
    throw Error("protocol_budget_mismatch");
  const privateEnv: NodeJS.ProcessEnv = {
    NODE_ENV: "production",
    GATEWAY_URL: env.GATEWAY_URL,
    GATEWAY_MASTER_KEY: env.GATEWAY_MASTER_KEY,
  };
  const boundedFetch: typeof fetch = (input, init) =>
    fetcher(input, {
      ...init,
      redirect: "error",
      signal: init?.signal ?? AbortSignal.timeout(30_000),
    });
  const issued = await emitirVirtualKey(
    { ...params, modelos: [params.model], duracao: "30m" },
    boundedFetch,
    privateEnv,
  );
  if (
    !issued.ok ||
    typeof issued.vk.key !== "string" ||
    !issued.vk.key ||
    issued.vk.key.length > 2048
  )
    throw Error("model_gateway_unavailable");
  const key = issued.vk.key;
  let closed = false,
    closeResult = false;
  const driver: AgentModelDriver = {
    kind: "litellm",
    async invoke(messages, signal): Promise<ModelReply> {
      if (closed) throw Error("model_session_closed");
      let response: Response;
      try {
        response = await boundedFetch(
          env.GATEWAY_URL!.replace(/\/+$/, "") + "/chat/completions",
          {
            method: "POST",
            headers: {
              authorization: `Bearer ${key}`,
              "content-type": "application/json",
            },
            body: JSON.stringify({
              model: params.model,
              messages,
              tools: REA_AGENT_TOOLS,
              temperature: 0,
              max_tokens: params.maxOutputTokens,
              stream: false,
            }),
            signal: AbortSignal.any([signal, AbortSignal.timeout(90_000)]),
          },
        );
      } catch {
        throw Error("model_gateway_unavailable");
      }
      const data = await jsonBounded(response);
      if (!response.ok) {
        const detail = JSON.stringify(data.error ?? "");
        throw Error(
          [400, 429].includes(response.status) &&
            /budget/i.test(detail) &&
            /exceed/i.test(detail)
            ? "model_budget_exhausted"
            : "model_gateway_failed",
        );
      }
      const message =
        data.choices?.length === 1 ? data.choices[0]?.message : null;
      const inputTokens = data.usage?.prompt_tokens,
        outputTokens = data.usage?.completion_tokens;
      if (
        !message ||
        !Number.isSafeInteger(inputTokens) ||
        inputTokens < 0 ||
        !Number.isSafeInteger(outputTokens) ||
        outputTokens < 0 ||
        typeof data.model !== "string" ||
        !data.model ||
        data.model.length > 200
      )
        throw Error("model_response_invalid");
      const calls = message.tool_calls ?? [];
      if (
        !Array.isArray(calls) ||
        calls.length > 10 ||
        new Set(calls.map((c: any) => c?.id)).size !== calls.length ||
        calls.some(
          (c: any) =>
            typeof c?.id !== "string" ||
            !c.id ||
            c.id.length > 100 ||
            c.type !== "function" ||
            typeof c.function?.name !== "string" ||
            c.function.name.length > 100 ||
            typeof c.function?.arguments !== "string" ||
            c.function.arguments.length > 16000,
        ) ||
        !(
          message.content === null ||
          message.content === undefined ||
          (typeof message.content === "string" &&
            message.content.length <= 16000)
        )
      )
        throw Error("model_response_invalid");
      const costHeader = response.headers.get("x-litellm-response-cost"),
        reportedCost = costHeader === null ? NaN : Number(costHeader);
      return {
        content: message.content ?? null,
        toolCalls: calls.map((c: any) => ({
          id: c.id,
          name: c.function.name,
          arguments: c.function.arguments,
        })),
        inputTokens,
        outputTokens,
        costUsd:
          Number.isFinite(reportedCost) && reportedCost >= 0
            ? reportedCost
            : null,
        providerModel: data.model,
        deploymentId: response.headers.get("x-litellm-model-id") ?? undefined,
      };
    },
  };
  return {
    driver,
    async close() {
      if (closed) return closeResult;
      closed = true;
      closeResult = await revogarVirtualKey(key, boundedFetch, privateEnv);
      return closeResult;
    },
  };
}
