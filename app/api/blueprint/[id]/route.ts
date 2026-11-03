/**
 * GET   /api/blueprint/:id → { blueprint } (só quem tem papel nele)
 * PATCH /api/blueprint/:id { fixos?: { set?, remove? }, reorganizar?, notas?: { upsert?, remove? }, titulo? } → { blueprint }
 *   — só o arranjo e as notas (lib/blueprint/patch); críticos, provas e fases são do servidor.
 * DELETE /api/blueprint/:id → { ok } (só o dono; a conversa de onde ele nasceu fica e não cria outro — #681)
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { aplicarPatchCliente } from "@/lib/blueprint/patch";
import { blueprintDoUsuario, excluirBlueprint, gravarDoc } from "@/lib/blueprint/server";
import { blueprintOn } from "@/lib/blueprint/tipos";
import { entrarNoBoard, falhaBoard } from "@/lib/estudos/rota";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  if (!blueprintOn()) return falhaBoard("not_found");
  const a = await entrarNoBoard(req, "blueprint-get"); if ("response" in a) return a.response;
  const blueprint = await blueprintDoUsuario(params.id, a.userId);
  return blueprint ? NextResponse.json({ blueprint }) : falhaBoard("not_found");
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  if (!blueprintOn()) return falhaBoard("not_found");
  const a = await entrarNoBoard(req, "blueprint-patch"); if ("response" in a) return a.response;
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return falhaBoard("invalid");
  const r = await gravarDoc(params.id, a.userId, (d) => aplicarPatchCliente(d, body, a.userId));
  return r.ok ? NextResponse.json({ blueprint: r.view }) : falhaBoard(r.motivo);
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  if (!blueprintOn()) return falhaBoard("not_found");
  const a = await entrarNoBoard(req, "blueprint-delete"); if ("response" in a) return a.response;
  const r = await excluirBlueprint(params.id, a.userId);
  return r.ok ? NextResponse.json({ ok: true }) : falhaBoard(r.motivo);
}
