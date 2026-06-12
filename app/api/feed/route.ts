import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma"; // Verifique se o caminho do prisma está correto
import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth"; // Verifique se o caminho do authOptions está correto

export async function GET() {
    const session = await getServerSession(authOptions);
    const currentUserEmail = session?.user?.email || "";

    try {
        const posts = await prisma.post.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                comments: { orderBy: { createdAt: 'asc' } },
                author: true // <--- Busca a imagem e dados do autor no banco
            }
        });

        // Curso do usuário atual para o gate social (comentar só no mesmo curso).
        const me = currentUserEmail
            ? await prisma.user.findUnique({ where: { email: currentUserEmail }, select: { course: true } })
            : null;
        const myCourse = (me?.course || "").toLowerCase();

        const formattedPosts = posts.map((post: any) => {
            const postCourse = post.author?.course || post.room || null;
            const pc = (postCourse || "").toLowerCase();
            return {
            id: post.id,
            user: post.user,
            userImage: post.author?.image || null, // <--- Foto dinâmica para o frontend
            content: post.content,
            course: postCourse,
            // Murais de outros cursos: apenas curtir/visualizar (sem comentar).
            canComment: !pc || !myCourse || pc === myCourse,
            time: new Date(post.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            likes: post.likes || [],
            isLiked: (post.likes || []).includes(currentUserEmail),
            comments: post.comments.map((c: any) => ({
                id: c.id,
                user: c.user,
                content: c.content,
                time: new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }))
            };
        });

        return NextResponse.json(formattedPosts);
    } catch (error) {
        console.error("Erro no GET Feed:", error);
        return NextResponse.json({ error: "Erro ao carregar feed" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
        return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    try {
        const { content } = await req.json();

        // Buscamos o ID do usuário para criar o vínculo (relação)
        const dbUser = await prisma.user.findUnique({
            where: { email: session.user.email }
        });

        const newPost = await prisma.post.create({
            data: {
                user: session.user.name || "Agente",
                content: content,
                userId: dbUser?.id, // <--- Vincula o post ao perfil para puxar a foto depois
                likes: []
            }
        });

        return NextResponse.json(newPost);
    } catch (error) {
        console.error("Erro no POST Feed:", error);
        return NextResponse.json({ error: "Erro ao postar" }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) return NextResponse.json({ error: "ID necessário" }, { status: 400 });

    try {
        const post = await prisma.post.findUnique({ where: { id } });

        // Só permite deletar se o nome do usuário bater com o autor
        if (post?.user !== session.user?.name) {
            return NextResponse.json({ error: "Proibido" }, { status: 403 });
        }

        await prisma.post.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: "Erro ao deletar" }, { status: 500 });
    }
}