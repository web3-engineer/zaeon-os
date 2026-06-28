import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// --- MÉTODO GET: LER PLUGINS DA STORE ---
export async function GET() {
    try {
        const plugins = await prisma.plugin.findMany({
            orderBy: { createdAt: 'desc' }
        });
        return NextResponse.json(plugins);
    } catch (error) {
        console.error("ZAEON DB ERROR (GET):", error);
        return NextResponse.json({ error: "Falha ao ler banco de dados." }, { status: 500 });
    }
}

// --- MÉTODO POST: CRIAR OU ATUALIZAR PLUGIN ---
export async function POST(req: Request) {
    try {
        const body = await req.json();
        
        const {
            id, name, author, description, category,
            tag, imageUrl, price, actionUrl, isLocked, unlockRequirement
        } = body;

        // 1. Validação de Segurança (Campos Obrigatórios do Schema)
        if (!name || !description || !category) {
            return NextResponse.json({ error: "Nome, descrição e categoria são obrigatórios." }, { status: 400 });
        }

        // 2. Sintonização de Tipos com o Prisma Schema
        const pluginData = {
            name: String(name),
            author: author ? String(author) : "Zaeon Core", // Default do schema
            description: String(description),
            category: String(category),
            tag: tag ? String(tag) : null, // Opcional no schema
            imageUrl: imageUrl ? String(imageUrl) : null, // capa do plugin (opcional)
            price: parseFloat(price) || 0, // Força a ser Float
            actionUrl: actionUrl ? String(actionUrl) : "#",
            isLocked: Boolean(isLocked), // Força a ser Boolean
            unlockRequirement: unlockRequirement ? String(unlockRequirement) : null // Opcional no schema
        };

        let plugin;

        // 3. Lógica de Upsert (Se o ID tiver 24 caracteres, é MongoDB válido, então atualiza)
        if (id && id.length === 24) {
            plugin = await prisma.plugin.update({
                where: { id: String(id) },
                data: pluginData
            });
        } else {
            // Se não tem ID ou é inválido, cria um novo (o Mongo gera o ObjectId)
            plugin = await prisma.plugin.create({
                data: pluginData
            });
        }

        return NextResponse.json(plugin, { status: 200 });

    } catch (error: any) {
        console.error("ZAEON DB ERROR (POST):", error);
        return NextResponse.json({ 
            error: "Erro ao salvar no MongoDB.", 
            details: error.message 
        }, { status: 500 });
    }
}

// --- MÉTODO DELETE: DELETAR PLUGIN ---
export async function DELETE(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");

        if (!id || id.length !== 24) {
            return NextResponse.json({ error: "ID inválido para deleção." }, { status: 400 });
        }

        await prisma.plugin.delete({
            where: { id: String(id) }
        });

        return NextResponse.json({ success: true }, { status: 200 });
    } catch (error: any) {
        console.error("ZAEON DB ERROR (DELETE):", error);
        return NextResponse.json({ error: "Erro ao deletar do MongoDB." }, { status: 500 });
    }
}