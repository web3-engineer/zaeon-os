import { NextResponse } from "next/server";
import { json, negado } from "../../_comum";
import { pacoteAtual } from "@/lib/orquestra/hermesApp";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET — o ZaeonHermes.app.zip da última versão, já conferido contra o sha256 do manifesto. */
export async function GET(req: Request) {
  const n = await negado(req);
  if (n) return n;
  const p = await pacoteAtual();
  if (!p) return json({ erro: "sem_build" }, 404);
  return new NextResponse(new Uint8Array(p.dados), {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Length": String(p.dados.length),
      "Content-Disposition": `attachment; filename="ZaeonHermes-${p.manifesto.build}.app.zip"`,
      "X-Hermes-Build": String(p.manifesto.build),
      "X-Hermes-Sha256": p.manifesto.sha256,
      "Cache-Control": "no-store",
    },
  });
}
