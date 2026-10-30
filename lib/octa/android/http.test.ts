import { it, expect, vi } from "vitest";
import { proofBody, readLimited, publicProof } from "./http";
it("never accepts a client verdict, oracle, lease, identity or arbitrary command", () => {
  const body = {
    projectId: "p",
    artifactId: "a",
    objective: "android-marker-v1",
  };
  expect(proofBody(body)).toEqual(body);
  for (const extra of [
    { pass: true },
    { oracle: {} },
    { identityVerified: true },
    { command: "execute" },
    { leaseId: "mine" },
  ])
    expect(() => proofBody({ ...body, ...extra })).toThrow();
});
it("bounds actual streamed body bytes even when content-length is absent or dishonest", async () => {
  await expect(
    readLimited(
      new Request("http://app", { method: "POST", body: "12345" }),
      4,
    ),
  ).rejects.toThrow("body_too_large");
  expect(
    (
      await readLimited(
        new Request("http://app", { method: "POST", body: "123" }),
        4,
      )
    ).length,
  ).toBe(3);
});
it("does not expose handles/leases/locators or turn an unverified model claim into a badge", () => {
  const result = publicProof(
    {
      id: "r",
      state: "observed",
      artifactSha256: "sha",
      leaseId: "private",
      evidence: { handle: "private" },
    },
    null,
    null,
    [],
  );
  expect(result.verified).toBe(false);
  expect(JSON.stringify(result)).not.toContain("private");
});
