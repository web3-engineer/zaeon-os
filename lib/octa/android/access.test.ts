import { it, expect } from "vitest";
import { loginAssurance, accessForProject } from "./access";
it("only trusts verified Google sign-in, never email-only credentials or a client claim", async () => {
  expect(
    loginAssurance({ provider: "credentials" }, { email_verified: true }),
  ).toBe("unverified");
  expect(
    loginAssurance({ provider: "google" }, { email_verified: false }),
  ).toBe("unverified");
  expect(loginAssurance({ provider: "google" }, { email_verified: true })).toBe(
    "google_verified",
  );
  const session = {
    user: {
      id: "a".repeat(24),
      email: "a@example.org",
      reaIdentity: "unverified",
    },
  };
  await expect(
    accessForProject(session, "b".repeat(24), async () => ({})),
  ).rejects.toThrow("verified_identity_required");
  const verified = {
    user: { ...session.user, reaIdentity: "google_verified" },
  };
  await expect(
    accessForProject(verified, "b".repeat(24), async () => null),
  ).rejects.toThrow("not_found");
  const access = await accessForProject(
    verified,
    "b".repeat(24),
    async (owner, project) => ({ id: project, userId: owner }),
  );
  expect(access.identityVerified).toBe(true);
  expect(access.userId).toBe(session.user.id);
});
