/**
 * GET /api/health/abnt — readiness do MOTOR ABNT (container abnt-service).
 * Faz um ping em ${ABNT_SERVICE_URL}/health e reporta up/down — assim dá pra ver de
 * fora (sem SSH) se o formatador está vivo antes de tentar exportar.
 */
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const base = process.env.ABNT_SERVICE_URL || "http://localhost:8001";
  try {
    const r = await fetch(`${base}/health`, { signal: AbortSignal.timeout(5000) });
    if (r.ok) {
      const body = await r.json().catch(() => ({}));
      return NextResponse.json({ status: "up", service: "abnt", target: base, upstream: body });
    }
    return NextResponse.json({ status: "down", service: "abnt", target: base, code: r.status }, { status: 503 });
  } catch (e: any) {
    return NextResponse.json({ status: "down", service: "abnt", target: base, error: e?.name || "unreachable" }, { status: 503 });
  }
}
