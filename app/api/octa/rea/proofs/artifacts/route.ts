export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;
import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth";
import { requestAccess, proofRuntime } from "@/lib/octa/android/runtime";
import { proofError, readLimited } from "@/lib/octa/android/http";
import { APK_MAX_BYTES } from "@/lib/octa/android/policy";
import { scopeKey } from "@/lib/octa/android/service";
import { sha256 } from "@/lib/octa/android/evidence";
import { guard } from "@/src/lib/ratelimit";
export async function POST(req: Request) {
  try {
    const access = await requestAccess(
      await getServerSession(authOptions),
      new URL(req.url).searchParams.get("projectId") ?? "",
    );
    const rate = await guard(req, "rea-proof-upload", "ai-heavy");
    if (!rate.ok) return rate.response;
    const bytes = await readLimited(req, APK_MAX_BYTES);
    if (
      bytes.length < 4 ||
      !bytes.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04]))
    )
      throw Error("invalid_apk");
    const { store, bridge } = proofRuntime();
    const handle = await bridge.upload(bytes, scopeKey(access));
    const artifact = await store.createArtifact(access, {
      sha256: sha256(bytes),
      bytes: bytes.length,
      name: "artifact.apk",
      handle,
      synthetic: false,
    });
    return Response.json({
      artifactId: artifact.id,
      sha256: artifact.sha256,
      bytes: artifact.bytes,
      expiresAt: artifact.expiresAt,
    });
  } catch (e) {
    return proofError(e);
  }
}
