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
  const subject = user.reaUserId ?? user.id;
  if (
    user.reaIdentity !== "google_verified" ||
    !/^[a-f0-9]{24}$/i.test(subject ?? "")
  )
    throw Error("verified_identity_required");
  if (!/^[a-f0-9]{24}$/i.test(projectId)) throw Error("not_found");
  // Preserve legacy email ownership without changing session.user.id globally.
  const owners = [...new Set([String(subject), String(user.id ?? user.email)])];
  let project: any = null;
  for (const owner of owners) {
    const candidate = await load(owner, projectId);
    if (candidate?.id === projectId && candidate.userId === owner) {
      project = candidate;
      break;
    }
  }
  if (!project) throw Error("not_found");
  return {
    userId: subject,
    projectOwnerId: project.userId,
    projectId,
    runId: randomUUID(),
    leaseId: randomUUID(),
    identityVerified: true,
  };
}
