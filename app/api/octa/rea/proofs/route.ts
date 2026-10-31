export const dynamic = "force-dynamic";
export const runtime = "nodejs";
import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth";
import {
  requestAccess,
  proofRuntime,
  proofView,
} from "@/lib/octa/android/runtime";
import { proofBody, proofError, readLimited } from "@/lib/octa/android/http";
import { scheduleProof } from "@/lib/octa/android/queue";
import { guard } from "@/src/lib/ratelimit";
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) throw Error("unauthorized");
    const body = proofBody(
      JSON.parse((await readLimited(req, 2048)).toString("utf8")),
    );
    const access = await requestAccess(session, body.projectId);
    const rate = await guard(req, "rea-proof", "ai-heavy");
    if (!rate.ok) return rate.response;
    const id = await scheduleProof(access, body.artifactId);
    return Response.json({ id, state: "queued" }, { status: 202 });
  } catch (e) {
    return proofError(e);
  }
}
export async function GET(req: Request) {
  try {
    const access = await requestAccess(
      await getServerSession(authOptions),
      new URL(req.url).searchParams.get("projectId") ?? "",
    );
    const { store } = proofRuntime();
    const rows = await store.db.reaProofRun.findMany({
      where: { ownerId: access.userId, projectId: access.projectId },
      orderBy: { createdAt: "desc" },
      take: 5,
    });
    return Response.json({
      proofs: await Promise.all(rows.map((r) => proofView(access, r.id))),
    });
  } catch (e) {
    return proofError(e);
  }
}
