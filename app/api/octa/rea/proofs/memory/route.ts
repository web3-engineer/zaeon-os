export const dynamic = "force-dynamic";
export const runtime = "nodejs";
import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth";
import { requestAccess, proofRuntime } from "@/lib/octa/android/runtime";
import { proofError, readLimited } from "@/lib/octa/android/http";
import { PINNED_ENGINE } from "@/lib/octa/android/verifier";
export async function GET(req: Request) {
  try {
    const a = await requestAccess(
      await getServerSession(authOptions),
      new URL(req.url).searchParams.get("projectId") ?? "",
    );
    return Response.json({
      lessons: await proofRuntime().memory.recall(a, PINNED_ENGINE),
    });
  } catch (e) {
    return proofError(e);
  }
}
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) throw Error("unauthorized");
    const body = JSON.parse((await readLimited(req, 4096)).toString("utf8"));
    if (
      Object.keys(body).some(
        (k) => !["projectId", "proofRunIds"].includes(k),
      ) ||
      !Array.isArray(body.proofRunIds) ||
      body.proofRunIds.length < 2 ||
      body.proofRunIds.length > 10 ||
      body.proofRunIds.some(
        (id: unknown) => typeof id !== "string" || id.length > 100,
      )
    )
      throw Error("invalid_request");
    const a = await requestAccess(session, body.projectId);
    const lesson = await proofRuntime().memory.promote(a, body.proofRunIds);
    return Response.json({ lessonId: lesson.id, state: lesson.state });
  } catch (e) {
    return proofError(e);
  }
}
export async function DELETE(req: Request) {
  try {
    const params = new URL(req.url).searchParams;
    const a = await requestAccess(
      await getServerSession(authOptions),
      params.get("projectId") ?? "",
    );
    const id = params.get("lessonId");
    if (!id || id.length > 100) throw Error("invalid_request");
    const { store, memory } = proofRuntime();
    if (
      !(await store.db.reaSuccessLesson.findFirst({
        where: { id, ownerId: a.userId, projectId: a.projectId },
      }))
    )
      throw Error("not_found");
    await memory.retire(a, id);
    return Response.json({ ok: true });
  } catch (e) {
    return proofError(e);
  }
}
