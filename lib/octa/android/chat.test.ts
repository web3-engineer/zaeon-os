import { it, expect, vi, afterEach } from "vitest";
import { FERRAMENTAS_REA_SUCCESS, ferramentasGateway } from "../agente";
afterEach(() => vi.unstubAllEnvs());
it("keeps success recall behind the feature flag and a server-bound access callback", async () => {
  vi.stubEnv("REA_SUCCESS_MEMORY", "0");
  expect(
    ferramentasGateway().some((t) => t.function.name === "octa_rea_success"),
  ).toBe(false);
  const tool = FERRAMENTAS_REA_SUCCESS[0];
  expect((await tool.run({ query: "APK" }, {} as any)).ok).toBe(false);
  const callback = vi
    .fn()
    .mockResolvedValue([
      { lessonId: "verified", procedure: "Observe permissions anew" },
    ]);
  const result = await tool.run(
    { query: "APK", projectId: "foreign", identityVerified: true },
    { octaReaRecall: callback } as any,
  );
  expect(result.ok).toBe(true);
  expect(callback).toHaveBeenCalledWith("APK");
});
