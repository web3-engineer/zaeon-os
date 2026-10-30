import { randomUUID } from "node:crypto";
import type { Access } from "./types";
/** Called only with NextAuth's provider/profile at the server sign-in callback. */
export function loginAssurance(
  account: { provider?: string } | null | undefined,
  profile: unknown,
): "google_verified" | "unverified" {
  return account?.provider === "google" &&
    (profile as { email_verified?: unknown } | undefined)?.email_verified ===
      true
    ? "google_verified"
    : "unverified";
}
/** The session is signed/server-resolved. No request body is passed as session. */
export async function accessForProject(
  session: any,
  projectId: string,
  load: (owner: string, project: string) => Promise<any>,
): Promise<Access> {
  if (!session?.user?.email) throw Error("unauthorized");
  const user = session.user;
  if (
    user.reaIdentity !== "google_verified" ||
    !/^[a-f0-9]{24}$/i.test(user.id ?? "")
  )
    throw Error("verified_identity_required");
  if (!/^[a-f0-9]{24}$/i.test(projectId)) throw Error("not_found");
  const project = await load(user.id, projectId);
  if (!project || project.id !== projectId || project.userId !== user.id)
    throw Error("not_found");
  return {
    userId: user.id,
    projectId,
    runId: randomUUID(),
    leaseId: randomUUID(),
    identityVerified: true,
  };
}
