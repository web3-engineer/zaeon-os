import type { Lesson, Observation, Receipt } from "./types";
export function proofBody(body: any): {
  projectId: string;
  artifactId: string;
  objective: "android-marker-v1";
} {
  if (
    !body ||
    Array.isArray(body) ||
    Object.keys(body).some(
      (k) => !["projectId", "artifactId", "objective"].includes(k),
    ) ||
    typeof body.projectId !== "string" ||
    typeof body.artifactId !== "string" ||
    body.artifactId.length > 100 ||
    body.objective !== "android-marker-v1"
  )
    throw Error("invalid_request");
  return {
    projectId: body.projectId,
    artifactId: body.artifactId,
    objective: body.objective,
  };
}
export async function readLimited(req: Request, max: number): Promise<Buffer> {
  if (Number(req.headers.get("content-length")) > max)
    throw Error("body_too_large");
  const reader = req.body?.getReader();
  if (!reader) throw Error("empty_body");
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  try {
    for (;;) {
      const part = await reader.read();
      if (part.done) break;
      bytes += part.value.length;
      if (bytes > max) {
        await reader.cancel();
        throw Error("body_too_large");
      }
      chunks.push(part.value);
    }
  } finally {
    reader.releaseLock();
  }
  if (!bytes) throw Error("empty_body");
  return Buffer.concat(chunks);
}
export function publicProof(
  run: {
    id: string;
    state: string;
    artifactSha256: string;
    [key: string]: unknown;
  },
  observation: Observation | null,
  receipt: Receipt | null,
  lessons: Lesson[],
  overmind = "not_evaluated",
) {
  const verified =
    run.state === "verified" &&
    receipt?.pass === true &&
    observation?.complete === true;
  const lesson = verified
    ? lessons.find(
        (l) => l.state === "verified_project" && l.proofRunIds.includes(run.id),
      )
    : undefined;
  return {
    id: run.id,
    state: run.state,
    artifactSha256: run.artifactSha256,
    verified: !!verified,
    memory: lesson ? { id: lesson.id, revision: lesson.revision } : null,
    overmind,
    facts: observation?.facts ?? {},
    evidence:
      observation?.evidence.map((r) => ({
        id: r.id,
        sha256: r.sha256,
        bytes: r.bytes,
        coverage: r.coverage,
      })) ?? [],
    checks: receipt?.checks ?? [],
    limitations: [
      "Análise estática; APK não executado.",
      "Assinatura do APK e segurança não verificadas.",
      ...(receipt
        ? []
        : [
            "Sem gabarito independente registrado para este APK; não é memória de sucesso.",
          ]),
    ],
  };
}
export type PublicProof = ReturnType<typeof publicProof>;
export function proofError(e: unknown) {
  const code =
    e instanceof SyntaxError ? "invalid_request" : (e as Error)?.message;
  const status =
    code === "unauthorized"
      ? 401
      : code === "verified_identity_required"
        ? 403
        : code === "not_found"
          ? 404
          : code === "proof_already_running"
            ? 409
            : code === "body_too_large"
              ? 413
              : code === "invalid_request" ||
                  code === "empty_body" ||
                  code === "invalid_apk"
                ? 400
                : code === "proof_disabled" ||
                    code === "proof_not_configured" ||
                    code === "queue_unavailable"
                  ? 503
                  : 500;
  return Response.json(
    { error: status === 500 ? "proof_failed" : code },
    { status },
  );
}
