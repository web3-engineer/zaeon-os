import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/src/lib/auth';
import { prisma } from '@/src/lib/prisma';
import { redis } from '@/src/lib/redis';
import Pusher from 'pusher';

// 🔥 BLINDAGEM CONTRA CACHE NA VERCEL 🔥
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

// INICIALIZAÇÃO DO PUSHER SERVER
const pusher = new Pusher({
    appId: process.env.PUSHER_APP_ID!,
    key: process.env.NEXT_PUBLIC_PUSHER_KEY!,
    secret: process.env.PUSHER_SECRET!,
    cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
    useTLS: true,
});

const getRoomKey = (id1: string, id2: string) => {
    const sortedIds = [id1, id2].sort();
    return `chat_${sortedIds[0]}_${sortedIds[1]}`;
};

// Headers padrão para forçar o navegador e CDN a não guardarem cache
const noCacheHeaders = {
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
};

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: noCacheHeaders });

        const user = await prisma.user.findUnique({ where: { email: session.user.email } });
        if (!user) return NextResponse.json({ error: "User not found" }, { status: 404, headers: noCacheHeaders });

        const { searchParams } = new URL(req.url);
        const targetId = searchParams.get('targetId');
        if (!targetId) return NextResponse.json({ error: "Target missing" }, { status: 400, headers: noCacheHeaders });

        const roomKey = getRoomKey(user.id, targetId);

        // Try/Catch para proteger o JSON.parse do Redis
        try {
            const cachedMessages = await redis.get(roomKey);
            if (cachedMessages) {
                const parsed = typeof cachedMessages === 'string' ? JSON.parse(cachedMessages) : cachedMessages;
                if (Array.isArray(parsed)) {
                    // Retorna do Redis, mas avisa para não fazer cache no navegador
                    return NextResponse.json(parsed, { headers: noCacheHeaders });
                }
            }
        } catch (cacheError) {
            console.log("Cache Redis vazio ou inválido. Buscando do banco de dados...");
        }

        const messages = await prisma.message.findMany({
            where: {
                OR: [
                    { senderId: user.id, receiverId: targetId },
                    { senderId: targetId, receiverId: user.id }
                ]
            },
            orderBy: { createdAt: 'asc' },
            take: 100
        });

        await redis.set(roomKey, JSON.stringify(messages), { ex: 15 });

        // Retorna do Banco, garantindo que a resposta seja fresca
        return NextResponse.json(messages, { headers: noCacheHeaders });
    } catch (error) {
        console.error("Erro interno:", error);
        return NextResponse.json({ error: "Erro interno" }, { status: 500, headers: noCacheHeaders });
    }
}

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { targetId, text, clientMsgId } = await req.json();
        if (!targetId || !text) return NextResponse.json({ error: "Invalid data" }, { status: 400 });

        const user = await prisma.user.findUnique({ where: { email: session.user.email } });
        if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

        const newMessage = await prisma.message.create({
            data: {
                senderId: user.id,
                receiverId: targetId,
                text: text
            }
        });

        // Limpa o cache do Redis para a próxima busca vir atualizada
        const roomKey = getRoomKey(user.id, targetId);
        await redis.del(roomKey);

        // Dispara o evento 'new-message' para o canal exclusivo do destinatário e do próprio remetente (sync)
        const pusherPayload = { ...newMessage, clientMsgId };
        try {
            await pusher.trigger(`user_${targetId}`, 'new-message', pusherPayload);
            await pusher.trigger(`user_${user.id}`, 'new-message', pusherPayload);
        } catch (pusherError) {
            console.error("Erro ao disparar evento no Pusher:", pusherError);
        }

        return NextResponse.json(pusherPayload);
    } catch (error) {
        console.error("Erro interno:", error);
        return NextResponse.json({ error: "Erro interno" }, { status: 500 });
    }
}