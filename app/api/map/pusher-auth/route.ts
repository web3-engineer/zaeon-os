/**
 * POST /api/map/pusher-auth — autoriza `private-cerebro-<mapaId>` (pusher-js, body form-urlencoded:
 * socket_id, channel_name). Só dono/membro do estudo (getMapaForUser) entra no canal.
 */
import { NextResponse } from "next/server";
import { entrar } from "@/lib/map/route-auth";
import { getMapaForUser } from "@/lib/map/store";
import { mapaIdDeCanal } from "@/lib/map/realtime";
import { getPusher } from "@/lib/collab/realtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const a = await entrar(req, "map-pusher-auth");
  if ("response" in a) return a.response;
  let socketId = "", channel = "";
  const ct = req.headers.get("content-type") || "";
  if (ct.includes("application/json")) {
    const b = await req.json().catch(() => ({}));
    socketId = String(b?.socket_id ?? ""); channel = String(b?.channel_name ?? "");
  } else {
    const p = new URLSearchParams(await req.text().catch(() => ""));
    socketId = p.get("socket_id") ?? ""; channel = p.get("channel_name") ?? "";
  }
  if (!/^[\d.]+$/.test(socketId)) return NextResponse.json({ error: "socket_id inválido" }, { status: 400 });
  const mapaId = mapaIdDeCanal(channel);
  if (!mapaId) return NextResponse.json({ error: "canal inválido" }, { status: 400 });
  const acesso = await getMapaForUser(mapaId, a.userId);
  if (!acesso) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const pusher = getPusher();
  if (!pusher) return NextResponse.json({ error: "realtime desligado" }, { status: 503 });
  return NextResponse.json(pusher.authorizeChannel(socketId, channel));
}
