export const dynamic = "force-dynamic";
export const runtime = "nodejs";
import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth";
import {
  requestAccess,
  proofRuntime,
  proofView,
} from "@/lib/octa/android/runtime";
import { proofError } from "@/lib/octa/android/http";
async function access(req: Request) {
  return requestAccess(
    await getServerSession(authOptions),
    new URL(req.url).searchParams.get("projectId") ?? "",
  );
}
export async function GET(
  req: Request,
  { params }: { params: { id: string } },
) {
  try {
    return Response.json(await proofView(await access(req), params.id));
  } catch (e) {
    return proofError(e);
  }
}
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const a = await access(req);
    const { store } = proofRuntime();
    if (!(await store.getRun(a, params.id))) throw Error("not_found");
    await store.cancel(a, params.id);
    return Response.json({ ok: true });
  } catch (e) {
    return proofError(e);
  }
}
