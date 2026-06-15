export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import connectToDatabase from "@/src/lib/db"; 
import User from "@/src/models/User"; 
import { authOptions } from "@/src/lib/auth";
import { grantStudentTrial } from "@/lib/plans";

// --- LISTA DE EMAILS COM PODER DIVINO (Adicione outros se precisar) ---
const ADMIN_EMAILS = ["zaeondao@gmail.com"];

// Função auxiliar para verificar admin
const checkIsAdmin = (email: string | null | undefined) => {
    return email && ADMIN_EMAILS.includes(email.toLowerCase());
};

// --- GET: LISTAR TODOS OS NODES ---
export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectToDatabase();

        const users = await User.find({
            email: { $ne: session?.user?.email }
        }).sort({ createdAt: -1 });

        const formattedRequests = users.map((user) => ({
            id: user._id.toString(),
            name: user.name || "Usuário Zaeon",
            email: user.email,
            phone: user.phone || "Não informado",
            course: user.course || "Undeclared",
            age: user.age || 0,
            gender: user.gender || "Não informado",
            countryCode: user.countryCode || "br",
            role: user.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : "Student",
            kycStatus: user.kycStatus || "pending",
            deepThinkEnabled: !!user.deepThinkEnabled,
            institution: user.institution || "",
            verificationDoc: user.verificationDoc || null,
            inviteCodeUsed: user.inviteCodeUsed || null,
            submittedAt: user.createdAt ? new Date(user.createdAt).toISOString() : new Date().toISOString(),
        }));

        return NextResponse.json(formattedRequests);

    } catch (error) {
        console.error("ERRO ADMIN GET:", error);
        return NextResponse.json({ error: "Falha ao carregar usuários" }, { status: 500 });
    }
}

// --- PATCH: APROVAR OU REPROVAR (Mudar kycStatus) ---
export async function PATCH(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        
        // NOVA TRAVA DE SEGURANÇA À PROVA DE FALHAS
        if (!checkIsAdmin(session?.user?.email)) {
            return NextResponse.json({ error: "Acesso Negado: Privilégios insuficientes." }, { status: 403 });
        }

        await connectToDatabase();
        const { userId, status, academicLevel, deepThinkEnabled } = await req.json();

        // Toggle do modo econômico: admin liga/desliga o pensamento profundo por usuário.
        // (atualização isolada — não exige mexer no kycStatus)
        if (typeof deepThinkEnabled === "boolean") {
            const u = await User.findByIdAndUpdate(userId, { deepThinkEnabled }, { new: true });
            if (!u) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
            return NextResponse.json({ success: true, deepThinkEnabled: !!u.deepThinkEnabled });
        }

        const update: Record<string, unknown> = { kycStatus: status };
        if (academicLevel) update.academicLevel = academicLevel;
        // Aprovar (verified) = conceder o Plano Plus de estudante (30 dias).
        if (status === "verified") {
            const grant = grantStudentTrial({ plan: "free", plusUntil: null, trialGranted: false });
            update.plan = grant.plan;
            update.plusUntil = grant.plusUntil;
            update.trialGranted = true;
            update.eduVerified = true;
        }

        const updatedUser = await User.findByIdAndUpdate(userId, update, { new: true });

        if (!updatedUser) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });

        return NextResponse.json({ success: true, status: updatedUser.kycStatus, plan: updatedUser.plan ?? "free" });
    } catch (error) {
        return NextResponse.json({ error: "Falha ao atualizar status" }, { status: 500 });
    }
}

// --- DELETE: PURGA TOTAL (Apagar do MongoDB) ---
export async function DELETE(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        
        // NOVA TRAVA DE SEGURANÇA À PROVA DE FALHAS
        if (!checkIsAdmin(session?.user?.email)) {
            return NextResponse.json({ error: "Acesso Negado: Privilégios insuficientes." }, { status: 403 });
        }

        const { searchParams } = new URL(req.url);
        const userId = searchParams.get('id');

        if (!userId) return NextResponse.json({ error: "ID Inválido" }, { status: 400 });

        await connectToDatabase();
        
        const deletedUser = await User.findByIdAndDelete(userId);

        if (!deletedUser) {
            return NextResponse.json({ error: "Nó não encontrado no banco" }, { status: 404 });
        }

        return NextResponse.json({ success: true, message: "Nó desintegrado com sucesso" });
    } catch (error) {
        console.error("ERRO NA PURGA:", error);
        return NextResponse.json({ error: "Erro interno ao deletar" }, { status: 500 });
    }
}