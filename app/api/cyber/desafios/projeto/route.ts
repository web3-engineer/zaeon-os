import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { eu } from "@/lib/lounge3d/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const campos = { texto: true, passos: true, feito: true, revisao: true } as const;
const responder = (dados: object, status = 200) => NextResponse.json(dados, {
  status, headers: { "Cache-Control": "private, no-store" },
});

export async function GET() {
  const me = await eu();
  if (!me) return responder({ erro: "Entre na sua conta." }, 401);
  const projeto = await prisma.desafioDaNave.findUnique({ where: { userId: me.id }, select: campos });
  return responder({ projeto });
}

export async function PUT(req: Request) {
  const me = await eu();
  if (!me) return responder({ erro: "Entre na sua conta." }, 401);
  const body = await req.json().catch(() => null);
  const revisao = body?.revisao;
  if (!Number.isSafeInteger(revisao) || revisao < 0) return responder({ erro: "Revisão inválida." }, 400);

  const atual = await prisma.desafioDaNave.findUnique({ where: { userId: me.id }, select: campos });
  const conflito = async () => responder({
    erro: "O desafio mudou em outro dispositivo. O painel foi atualizado.",
    projeto: await prisma.desafioDaNave.findUnique({ where: { userId: me.id }, select: campos }),
  }, 409);
  if ((atual?.revisao ?? 0) !== revisao) return conflito();

  if (body.acao === "concluir") {
    if (!atual) return conflito();
    if (atual.feito) return responder({ projeto: atual });
    const data = { feito: true, revisao: revisao + 1 };
    const { count } = await prisma.desafioDaNave.updateMany({ where: { userId: me.id, revisao }, data });
    return count ? responder({ projeto: { ...atual, ...data } }) : conflito();
  }

  const texto = typeof body.texto === "string" ? body.texto.trim() : "";
  const passos = body.passos;
  if ((body.acao !== "aceitar" && body.acao !== "importar") || !texto || texto.length > 1800
    || !Array.isArray(passos) || passos.length > 3 || !passos.every((p: unknown) => typeof p === "string" && p.length <= 220)) {
    return responder({ erro: "Proposta inválida." }, 400);
  }
  if (atual && (!atual.feito || body.acao === "importar")) return conflito();

  const data = { texto, passos: passos as string[], feito: body.acao === "importar" && body.feito === true, revisao: revisao + 1 };
  if (atual) {
    const { count } = await prisma.desafioDaNave.updateMany({ where: { userId: me.id, revisao, feito: true }, data });
    return count ? responder({ projeto: data }) : conflito();
  }
  try {
    const projeto = await prisma.desafioDaNave.create({ data: { userId: me.id, ...data }, select: campos });
    return responder({ projeto }, 201);
  } catch (erro) {
    if (typeof erro === "object" && erro !== null && "code" in erro && erro.code === "P2002") return conflito();
    throw erro;
  }
}
