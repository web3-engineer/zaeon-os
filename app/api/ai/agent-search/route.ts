import { vertexCredentials } from "@/lib/ai/vertex-credentials";
import { NextResponse } from 'next/server';
import { VertexAI, FunctionDeclarationSchemaType } from '@google-cloud/vertexai';
import type { FunctionDeclaration } from '@google-cloud/vertexai';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 1. DECLARAÇÃO DA FERRAMENTA (Ensinamos a IA como buscar no nosso banco)
const searchStudentsTool: FunctionDeclaration = {
    name: "search_students",
    description: "Busca alunos no banco de dados da instituição com base em nome, curso ou ambos.",
    parameters: {
        type: FunctionDeclarationSchemaType.OBJECT,
        properties: {
            name: { 
                type: FunctionDeclarationSchemaType.STRING, 
                description: "O nome ou fragmento do nome do aluno (ex: 'Ana', 'Ana Lívia')" 
            },
            course: { 
                type: FunctionDeclarationSchemaType.STRING, 
                description: "O nome do curso ou área de estudo (ex: 'engenharia', 'computação')" 
            }
        }
    }
};

export async function POST(req: Request) {
    try {
        const { prompt } = await req.json();

        // 2. INICIALIZA O VERTEX AI
        const credentials = (() => { const __v = vertexCredentials(); return { project_id: __v.project, client_email: __v.client_email, private_key: __v.private_key }; })(); // robust parse
        const vertexAI = new VertexAI({
            project: credentials.project_id || process.env.GOOGLE_PROJECT_ID,
            location: process.env.GOOGLE_LOCATION || 'us-central1',
            googleAuthOptions: { credentials: { client_email: credentials.client_email, private_key: credentials.private_key } }
        });

        const generativeModel = vertexAI.getGenerativeModel({
            model: 'gemini-2.0-flash-001',
            generationConfig: { temperature: 0.1 }, // Baixa temperatura para ele ser analítico e focar em extrair os dados
            tools: [{ functionDeclarations: [searchStudentsTool] }]
        });

        // 3. PASSA A FRASE DO PROFESSOR PARA A IA
        const chat = generativeModel.startChat({
            systemInstruction: { 
                role: 'system', 
                parts: [{ text: "Você é um agente de banco de dados. Sua única função é usar a ferramenta 'search_students' quando o usuário pedir para buscar alguém. Nunca responda com texto puro se for um pedido de busca." }] 
            }
        });

        const result = await chat.sendMessage([{ text: prompt }]);
        const response = result.response;

        // 4. VERIFICA SE A IA DECIDIU USAR A FERRAMENTA
        const functionCall = response.candidates?.[0]?.content?.parts?.[0]?.functionCall;

        if (functionCall && functionCall.name === "search_students") {
            const args = functionCall.args as any;
            
            // 5. EXECUTA A BUSCA REAL NO MONGODB VIA PRISMA
            // Montamos a query dinamicamente com base no que a IA extraiu
            const whereClause: any = { role: "student" }; // Garante que só busca alunos
            
            if (args.name) {
                whereClause.name = { contains: args.name, mode: "insensitive" };
            }
            if (args.course) {
                whereClause.course = { contains: args.course, mode: "insensitive" };
            }

            const students = await prisma.user.findMany({
                where: whereClause,
                select: {
                    id: true,
                    name: true,
                    course: true,
                    image: true,
                },
                take: 5 // Limita a 5 resultados para não estourar a interface
            });

            // 6. DEVOLVE OS DADOS REAIS PARA O FRONTEND
            return NextResponse.json({ 
                success: true, 
                type: 'student_results',
                data: students,
                message: students.length > 0 
                    ? `Aqui estão os resultados da base de dados para sua busca.` 
                    : `Não encontrei nenhum aluno correspondente a esses critérios na base.`
            });
        }

        // Se a IA não usou a ferramenta, apenas devolve o texto (ex: "Bom dia, professor!")
        const textResponse = response.candidates?.[0]?.content?.parts?.[0]?.text || "Erro de processamento.";
        return NextResponse.json({ success: true, type: 'text', message: textResponse });

    } catch (error: any) {
        console.error("Erro na API Agent Search:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}