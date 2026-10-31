import { it, expect, vi } from "vitest";
const m = vi.hoisted(() => ({ find: vi.fn() }));
vi.mock("@/src/lib/db", () => ({
  clientPromise: Promise.resolve({
    db: () => ({ collection: () => ({ findOne: m.find }) }),
  }),
}));
import { authOptions } from "@/src/lib/auth";
import { accessForProject } from "./access";
it("preserves legacy email ownership while adding server-verified assurance", async () => {
  const id = "a".repeat(24),
    projectId = "b".repeat(24),
    email = "owner@example.org";
  m.find.mockResolvedValue({
    _id: { toString: () => id },
    email,
    name: "Owner",
  });
  const result: any = await authOptions.callbacks!.session!({
    session: { user: { email } },
    token: { id, email, reaIdentity: "google_verified" },
  } as any);
  expect(result.user.id).toBeUndefined();
  expect(result.user.reaIdentity).toBe("google_verified");
  const load = vi
    .fn()
    .mockImplementation(async (owner) =>
      owner === email ? { id: projectId, userId: email } : null,
    );
  expect((await accessForProject(result, projectId, load)).userId).toBe(id);
  expect(load).toHaveBeenCalledWith(email, projectId);
  expect(result.user.reaUserId).toBe(id);
});
