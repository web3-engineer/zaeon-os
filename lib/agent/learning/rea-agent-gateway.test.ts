import { it, expect, vi } from "vitest";
import { agentEvalConfig, openAgentModel } from "./rea-agent-gateway";
const env = {
  REA_AGENT_EVAL: "1",
  GATEWAY_URL: "https://gateway.example.org",
  GATEWAY_MASTER_KEY: "private-master",
  REA_AGENT_EVAL_MODEL: "configured-model",
  REA_AGENT_EVAL_MAX_USD: "0.2",
};
const params = {
  userId: "synthetic-pilot",
  sessionId: "trial",
  model: "configured-model",
  maxBudgetUsd: 0.1,
  maxOutputTokens: 1000,
};
it("requires an enabled gateway, an explicit model and a bounded budget", async () => {
  const fetcher = vi.fn();
  expect(agentEvalConfig({}).ok).toBe(false);
  await expect(openAgentModel(params, {}, fetcher)).rejects.toThrow(
    "model_gateway_not_configured",
  );
  expect(fetcher).not.toHaveBeenCalled();
  expect(agentEvalConfig({ ...env, REA_AGENT_EVAL_MAX_USD: "100" }).ok).toBe(
    false,
  );
});
it("uses an isolated virtual key, records reported usage/cost and revokes it", async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(
      new Response(JSON.stringify({ key: "private-virtual" })),
    )
    .mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          model: "actual-model",
          choices: [{ message: { content: "{}" } }],
          usage: { prompt_tokens: 10, completion_tokens: 2 },
        }),
        {
          headers: {
            "x-litellm-response-cost": "0.002",
            "x-litellm-model-id": "deployment",
          },
        },
      ),
    )
    .mockResolvedValueOnce(new Response("{}"));
  const session = await openAgentModel(params, env, fetcher);
  const messages = [
    { role: "user" as const, content: "Analyze this synthetic APK." },
  ];
  const reply = await session.driver.invoke(
    messages,
    new AbortController().signal,
  );
  expect(reply.costUsd).toBe(0.002);
  expect(reply.inputTokens).toBe(10);
  expect(reply.deploymentId).toBe("deployment");
  const body = JSON.parse(fetcher.mock.calls[1][1].body);
  expect(body.model).toBe(params.model);
  expect(JSON.stringify(body)).not.toContain("private-");
  expect(fetcher.mock.calls[1][1].headers.authorization).toBe(
    "Bearer private-virtual",
  );
  expect(await session.close()).toBe(true);
  expect(fetcher.mock.calls[2][0]).toContain("/key/delete");
});
it("does not retry a depleted key, expose provider errors or invent missing cost", async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(
      new Response(JSON.stringify({ key: "private-virtual" })),
    )
    .mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          error: { message: "Budget has been exceeded private-master" },
        }),
        { status: 429 },
      ),
    )
    .mockResolvedValueOnce(new Response("{}"));
  const session = await openAgentModel(params, env, fetcher);
  await expect(
    session.driver.invoke([], new AbortController().signal),
  ).rejects.toThrow("model_budget_exhausted");
  await session.close();
  expect(fetcher).toHaveBeenCalledTimes(3);
  const noCost = vi
    .fn()
    .mockResolvedValueOnce(new Response(JSON.stringify({ key: "vk" })))
    .mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          model: "actual",
          choices: [{ message: { content: "{}" } }],
          usage: { prompt_tokens: 1, completion_tokens: 1 },
        }),
      ),
    );
  const second = await openAgentModel(params, env, noCost);
  expect(
    (await second.driver.invoke([], new AbortController().signal)).costUsd,
  ).toBeNull();
});
