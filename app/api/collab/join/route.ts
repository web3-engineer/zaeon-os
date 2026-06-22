/**
 * POST /api/collab/join — aceitar um convite de colaboração.
 *   body: { token }
 *   - adiciona o usuário atual aos membros do CollabDoc (idempotente)
 *   - notifica o DONO no chat (Message + Pusher new-message) → "fulano aceitou"
 *   - devolve { id } pra abrir o doc no Lounge
 * O doc é uma CÓPIA compartilhada: o estudo/pesquisa original de cada um fica intacto.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";
import { triggerSafe } from "@/lib/collab/realtime";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const u = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, name: true },
  });
  if (!u) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { token } = await req.json().catch(() => ({} as any));
  if (!token || typeof token !== "string") return NextResponse.json({ error: "Token ausente" }, { status: 400 });

  const doc = await prisma.collabDoc.findUnique({ where: { token } });
  if (!doc) return NextResponse.json({ error: "Convite inválido" }, { status: 404 });

  // Já é membro (ou é o dono) → só abre.
  if (doc.members.includes(u.id)) return NextResponse.json({ id: doc.id, already: true });

  await prisma.collabDoc.update({
    where: { id: doc.id },
    data: { members: { push: u.id } },
  });

  // ESTUDO colaborativo: dá acesso REAL ao espaço (co-edição no componente da própria sala).
  if (doc.sourceType === "study" && doc.sourceId) {
    try { await prisma.studySpace.update({ where: { id: doc.sourceId }, data: { members: { push: u.id } } }); }
    catch { /* o espaço pode ter sido apagado — ignora */ }
  }

  // CONEXÃO MÚTUA: aceitar o convite os torna COLEGAS no chat (os dois se veem e
  // podem conversar). Colegas = ConnectionRequest ACCEPTED em qualquer direção.
  if (doc.ownerId !== u.id) {
    try {
      const existing = await prisma.connectionRequest.findFirst({
        where: {
          OR: [
            { senderId: doc.ownerId, receiverId: u.id },
            { senderId: u.id, receiverId: doc.ownerId },
          ],
        },
        select: { id: true, status: true },
      });
      if (!existing) {
        await prisma.connectionRequest.create({
          data: { senderId: doc.ownerId, receiverId: u.id, status: "ACCEPTED", message: `Colaboração no Lounge: ${doc.title}` },
        });
      } else if (existing.status !== "ACCEPTED") {
        await prisma.connectionRequest.update({ where: { id: existing.id }, data: { status: "ACCEPTED" } });
      }
    } catch (e) {
      console.error("[collab] conexão mútua falhou:", e);
    }
  }

  // Notifica os DOIS: mensagem persistida pro dono + aviso da Zaeon em tempo real
  // pros dois + member-joined (pra foto aparecer na hora no editor).
  try {
    const owner = await prisma.user.findUnique({ where: { id: doc.ownerId }, select: { name: true } });
    const text = `🤝 ${u.name || "Alguém"} aceitou seu convite e agora co-cria “${doc.title}” com você no Lounge.`;
    const msg = await prisma.message.create({ data: { senderId: u.id, receiverId: doc.ownerId, text } });
    await triggerSafe(`user_${doc.ownerId}`, "new-message", msg);
    await triggerSafe(`collab-${doc.id}`, "member-joined", { userId: u.id, name: u.name, ts: Date.now() });
    await triggerSafe(`user_${doc.ownerId}`, "zaeon-notice", { text: `${u.name || "Um colega"} aceitou seu convite e entrou no Lounge com você em “${doc.title}”. Vocês já são colegas — é só conversar por aqui.` });
    await triggerSafe(`user_${u.id}`, "zaeon-notice", { text: `Você entrou no Lounge com ${owner?.name || "o anfitrião"} em “${doc.title}”. Vocês já são colegas — é só conversar por aqui.` });
  } catch (e) {
    console.error("[collab] notificação de aceite falhou:", e);
  }

  return NextResponse.json({ id: doc.id });
}
