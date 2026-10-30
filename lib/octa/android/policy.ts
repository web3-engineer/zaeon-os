import type { Access, AndroidRequest } from "./types";
export const APK_MAX_BYTES = 64 * 1024 * 1024;
export const APK_BODY_MAX_BYTES = 4 * Math.ceil(APK_MAX_BYTES / 3) + 65536;
export const proofEnabled = (env: NodeJS.ProcessEnv = process.env) =>
  env.REA_SUCCESS_MEMORY === "1";
export function requireAccess(a: Access): void {
  if (!a.identityVerified) throw Error("verified_identity_required");
  if (!a.userId || !a.projectId || !a.runId || !a.leaseId)
    throw Error("invalid_access");
}
export function assertArtifactOwner(
  a: Access,
  r: { ownerId: string; projectId: string; expiresAt: Date | null },
): void {
  requireAccess(a);
  if (r.ownerId !== a.userId || r.projectId !== a.projectId)
    throw Error("not_found");
  if (r.expiresAt && r.expiresAt.getTime() <= Date.now())
    throw Error("artifact_expired");
}
export function androidCommand(r: AndroidRequest): string[] {
  if (r.goal === "overview") return ["inspect-android-package"];
  if (r.goal === "search") {
    if (
      typeof r.query !== "string" ||
      !r.query ||
      r.query.length > 100 ||
      r.query.startsWith("-")
    )
      throw Error("invalid_query");
    return ["search-android-classes", r.query];
  }
  if (!/^[A-Za-z_$][\w$]*(\.[A-Za-z_$][\w$]*)+$/.test(r.className ?? ""))
    throw Error("invalid_class");
  if (r.goal === "class") return ["inspect-android-class", r.className!];
  if (r.goal === "references")
    return ["trace-android-references", r.className!];
  if (r.goal !== "method" || !/^[A-Za-z_$][\w$]*$/.test(r.methodName ?? ""))
    throw Error("invalid_method");
  return ["inspect-android-method", r.className!, r.methodName!];
}
