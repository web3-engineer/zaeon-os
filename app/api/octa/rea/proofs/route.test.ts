import { it, expect, vi, beforeEach } from "vitest";
import { accessForProject } from "@/lib/octa/android/access";
const m = vi.hoisted(() => ({
  session: vi.fn(),
  project: vi.fn(),
  schedule: vi.fn(),
  view: vi.fn(),
}));
vi.mock("next-auth", () => ({ getServerSession: m.session }));
vi.mock("@/src/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/src/lib/ratelimit", () => ({ guard: async () => ({ ok: true }) }));
vi.mock("@/lib/octa/android/queue", () => ({ scheduleProof: m.schedule }));
vi.mock("@/lib/octa/android/runtime", () => ({
  requestAccess: (session: unknown, id: string) =>
    accessForProject(session, id, m.project),
  proofRuntime: () => ({ store: {} }),
  proofView: m.view,
}));
import { POST } from "./route";
import { GET } from "./[id]/route";
const owner = "a".repeat(24),
  project = "b".repeat(24);
const post = (body: object) =>
  new Request("http://app/api/octa/rea/proofs", {
    method: "POST",
    body: JSON.stringify(body),
  });
beforeEach(() => {
  vi.resetAllMocks();
  m.session.mockResolvedValue({
    user: { id: owner, email: "a@example.org", reaIdentity: "google_verified" },
  });
  m.project.mockResolvedValue({ id: project, userId: owner });
  m.schedule.mockResolvedValue("server-run");
});
it("denies missing and unverified identities even if the body supplies a verified claim", async () => {
  m.session.mockResolvedValue(null);
  expect((await POST(post({}))).status).toBe(401);
  m.session.mockResolvedValue({
    user: { id: owner, email: "a@example.org", reaIdentity: "unverified" },
  });
  expect(
    (
      await POST(
        post({
          projectId: project,
          artifactId: "artifact",
          objective: "android-marker-v1",
        }),
      )
    ).status,
  ).toBe(403);
  expect(m.schedule).not.toHaveBeenCalled();
});
it("only schedules the typed objective and refuses an injected successful receipt", async () => {
  const body = {
    projectId: project,
    artifactId: "artifact",
    objective: "android-marker-v1",
  };
  expect((await POST(post({ ...body, receipt: { pass: true } }))).status).toBe(
    400,
  );
  expect((await POST(post(body))).status).toBe(202);
  expect(m.schedule.mock.calls[0][0]).toMatchObject({
    userId: owner,
    projectId: project,
    identityVerified: true,
  });
});
it("uses a non-enumerable 404 for another project and an inaccessible proof", async () => {
  const req = new Request(`http://app/proofs/run?projectId=${project}`),
    ctx = { params: { id: "run" } };
  m.project.mockResolvedValue(null);
  expect((await GET(req, ctx)).status).toBe(404);
  expect(m.view).not.toHaveBeenCalled();
  m.project.mockResolvedValue({ id: project, userId: owner });
  m.view.mockRejectedValue(Error("not_found"));
  expect((await GET(req, ctx)).status).toBe(404);
});
