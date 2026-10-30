import { it, expect, vi } from "vitest";
import { AndroidBridge } from "./client";
const env = {
  OCTA_REA: "1",
  REA_BRIDGE_URL: "http://bridge",
  REA_BRIDGE_TOKEN: "private",
};
it("sends only scoped typed commands and handles unavailable or malformed evidence", async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValue(
      new Response(
        JSON.stringify({
          ok: true,
          evidence: { operation: "inspect_android_package" },
        }),
      ),
    );
  const bridge = new AndroidBridge(env, fetcher);
  await bridge.analyze("a".repeat(32), "b".repeat(64), { goal: "overview" });
  expect(JSON.parse(fetcher.mock.calls[0][1].body)).toEqual({
    token: "private",
    handle: "a".repeat(32),
    scopeKey: "b".repeat(64),
    goal: "overview",
  });
  await expect(
    bridge.analyze("../../etc", "b".repeat(64), { goal: "overview" }),
  ).rejects.toThrow("invalid_handle");
  fetcher.mockResolvedValue(
    new Response(JSON.stringify({ ok: true }), { status: 200 }),
  );
  await expect(
    bridge.analyze("a".repeat(32), "b".repeat(64), { goal: "overview" }),
  ).rejects.toThrow("invalid_evidence");
});
