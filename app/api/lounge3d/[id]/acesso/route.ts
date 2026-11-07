/**
 * POST /api/lounge3d/[id]/acesso { alvo: "topo" | "ceu" | "nave" | "dj" | "ritual" } — AÇÕES PRIVILEGIADAS do dono no cyberespaço:
 * subir ao topo da Recepção, pilotar a nave e atravessar o PAR de buracos negros nave ↔ cabine do DJ (a única entrada
 * da cabine). Só o fundador (isSuperAdmin pela SESSÃO, nunca por flag do cliente) recebe
 * 200; o resto 403 — exceto a NAVE, que a TRIPULAÇÃO também pilota (lib/lounge3d/corposDeUsuario
 * `ehTripulacaoDaNave`, por ENV `NAVE_TRIPULACAO`). O cliente só age depois do OK. A ZAEON (portal
 * do buraco negro → "ceu") é ABERTA a qualquer membro.
 *
 * Este cabeçalho citava uma `TRIPULACAO_DA_NAVE` que NÃO EXISTIA no código: a tripulação havia sido
 * abolida em out/2026 e o comentário ficou. Agora ela existe de novo, e o nome aqui é o nome real.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { guard } from "@/src/lib/ratelimit";
import { eu, exigirFlag, salaDoMembro } from "@/lib/lounge3d/server";

const ALVOS = new Set(["topo", "ceu", "nave", "dj", "ritual"]);
const NEGADO: Record<string, string> = {
  topo: "Só o dono da Zaeon sobe ao topo.",
  nave: "Só o dono pilota a nave.",
  dj: "Só o dono atravessa este buraco negro.",
  ritual: "Só o dono inicia o ritual.",
};

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const off = exigirFlag(); if (off) return off;
  const rl = await guard(req, "lounge3d-acesso"); if (!rl.ok) return rl.response;
  const me = await eu(); if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const s = await salaDoMembro(params.id, me.id); if (!s) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const b = await req.json().catch(() => ({}));
  const alvo = String((b as { alvo?: unknown })?.alvo ?? "");
  if (!ALVOS.has(alvo)) return NextResponse.json({ error: "alvo inválido" }, { status: 400 });
  if (alvo === "nave" ? !me.nave : !me.fundador && alvo !== "ceu") return NextResponse.json({ error: NEGADO[alvo] }, { status: 403 });   // a nave: SÓ o dono (pilotaANave)
  return NextResponse.json({ ok: true, alvo });
}
