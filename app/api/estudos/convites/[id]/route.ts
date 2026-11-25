import { NextResponse } from "next/server";
import { responderConviteBoard } from "@/lib/estudos/convites-board";
import { entrarNoBoard, falhaBoard } from "@/lib/estudos/rota";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const a = await entrarNoBoard(req, "estudos-convites-responder"); if ("response" in a) return a.response;
  const body = await req.json().catch(() => ({}));
  if (!/^[a-f0-9]{24}$/i.test(params.id) || typeof body.aceitar !== "boolean") return falhaBoard("invalid");
  const r = await responderConviteBoard(params.id, a.userId, body.aceitar);
  return r.ok ? NextResponse.json({ ok: true }) : falhaBoard(r.reason);
}
