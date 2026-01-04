// 1. FORÇA A ROTA A SER DINÂMICA (Resolve o erro da Vercel)
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import connectToDatabase from '@/src/lib/db';
import Workspace from '@/src/models/Workspace';

export async function POST(req: Request) {
    try {
        await connectToDatabase();
        const body = await req.json();

        // userId pode ser o Email do Google ou Endereço da Carteira
        const { userId, title, content, agent, chatHistory, terminalLogs } = body;

        if (!userId) {
            return NextResponse.json({ error: 'Usuário não identificado' }, { status: 400 });
        }

        // Upsert: Atualiza se existir (baseado no userId), cria se não existir
        const workspace = await Workspace.findOneAndUpdate(
            { userId },
            {
                title,
                content,
                agent,
                chatHistory,
                terminalLogs,
                lastModified: new Date()
            },
            { new: true, upsert: true }
        );

        return NextResponse.json({ success: true, data: workspace });

    } catch (error: any) {
        console.error("❌ Erro MongoDB POST:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function GET(req: Request) {
    try {
        await connectToDatabase();
        const { searchParams } = new URL(req.url);
        const userId = searchParams.get('userId');

        if (!userId) {
            return NextResponse.json({ error: 'UserId required' }, { status: 400 });
        }

        const workspace = await Workspace.findOne({ userId });

        // Se não tiver nada salvo, retorna um objeto padrão limpo para o frontend não quebrar
        if (!workspace) {
            return NextResponse.json({
                data: {
                    title: "Untitled_Research.txt",
                    content: "",
                    chatHistory: [],
                    agent: "zenita",
                    terminalLogs: ["System initialized."]
                }
            });
        }

        return NextResponse.json({ data: workspace });

    } catch (error: any) {
        console.error("❌ Erro MongoDB GET:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}