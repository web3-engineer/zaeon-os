import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth";

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const { postId, content } = await req.json();

        // Gate social por curso: só é permitido COMENTAR em posts de colegas do
        // mesmo curso. Murais de outros cursos → apenas curtir/visualizar.
        const me = await prisma.user.findUnique({
            where: { email: session.user.email },
            select: { id: true, course: true },
        });
        const post = await prisma.post.findUnique({
            where: { id: postId },
            select: { room: true, author: { select: { course: true } } },
        });
        if (!post) return NextResponse.json({ error: "Post não encontrado" }, { status: 404 });

        const postCourse = (post.author?.course || post.room || "").toLowerCase();
        const myCourse = (me?.course || "").toLowerCase();
        // Bloqueia apenas quando ambos têm curso definido e são diferentes.
        if (postCourse && myCourse && postCourse !== myCourse) {
            return NextResponse.json(
                { error: "Comentários liberados apenas para colegas do mesmo curso. Você ainda pode curtir e visualizar." },
                { status: 403 },
            );
        }

        const newComment = await prisma.comment.create({
            data: {
                content,
                user: session.user?.name || "Agente Zaeon",
                ...(me?.id ? { author: { connect: { id: me.id } } } : {}),
                post: {
                    connect: { id: postId }
                }
            }
        });

        return NextResponse.json(newComment);
    } catch (error) {
        console.error("Erro ao comentar:", error);
        return NextResponse.json({ error: "Erro ao comentar" }, { status: 500 });
    }
}