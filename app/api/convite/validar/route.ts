import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { buildValidationError, normaliseCode } from "@/lib/convite/validate";

export async function POST(req: Request) {
  let rawCode: string;
  try {
    const body = await req.json();
    rawCode = body?.code ?? "";
  } catch {
    return NextResponse.json({ error: "Corpo da requisição inválido." }, { status: 400 });
  }

  const shapeError = buildValidationError(rawCode);
  if (shapeError) {
    return NextResponse.json({ error: shapeError }, { status: 400 });
  }

  const code = normaliseCode(rawCode);

  const inviteCode = await prisma.inviteCode.findUnique({
    where: { code },
    include: { owner: { select: { name: true } } },
  });
  if (!inviteCode) {
    return NextResponse.json({ error: "Código não encontrado." }, { status: 404 });
  }
  if (inviteCode.usedCount >= inviteCode.maxUses) {
    return NextResponse.json(
      { error: "Este código já atingiu o limite de usos." },
      { status: 410 }
    );
  }

  // Primeiro nome de quem convidou (para personalizar o cartão).
  const inviterName = inviteCode.owner?.name?.trim().split(/\s+/)[0] ?? null;

  const sessionToken = crypto.randomUUID();

  const response = NextResponse.json({ ok: true, sessionToken, inviteCode: code, inviterName });
  response.cookies.set("convite_session", sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 3600,
    path: "/",
  });

  return response;
}
