import { describe, it, expect } from "vitest";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { EvidenceVault } from "./evidence";
const access = {
  userId: "u1",
  projectId: "p1",
  runId: "run",
  leaseId: "lease",
  identityVerified: true,
};
describe("durable Android evidence", () => {
  it("survives a new vault instance and detects tampering/cross-project access", async () => {
    const dir = await mkdtemp(tmpdir() + "/rea-proof-");
    try {
      const vault = new EvidenceVault(dir);
      const ref = await vault.save(access, Buffer.from("complete evidence"));
      expect((await new EvidenceVault(dir).read(access, ref)).toString()).toBe(
        "complete evidence",
      );
      await expect(
        vault.read({ ...access, projectId: "other" }, ref),
      ).rejects.toThrow();
      await writeFile(dir + "/" + ref.locator, "tampered");
      await expect(vault.read(access, ref)).rejects.toThrow(/integrity/);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
  it("refuses unverified identities and traversal locators", async () => {
    const vault = new EvidenceVault("/tmp/no-write-for-denial");
    await expect(
      vault.save({ ...access, identityVerified: false }, Buffer.from("x")),
    ).rejects.toThrow(/identity/);
    await expect(
      vault.read(access, {
        id: "x",
        sha256: "x",
        bytes: 1,
        locator: "../../etc/passwd",
        coverage: "complete",
      }),
    ).rejects.toThrow();
  });
});
