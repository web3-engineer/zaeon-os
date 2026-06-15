import { vertexCredentials } from "@/lib/ai/vertex-credentials";
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/src/lib/auth';
import { VertexAI } from '@google-cloud/vertexai';
import { guard } from '@/src/lib/ratelimit';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Allow up to 60s for AI generation

// Structured question type the AI must output
interface GeneratedQuestion {
    number: number;
    statement: string;
    type: 'multiple_choice' | 'open_ended' | 'true_false';
    options?: string[];
    answer?: string;
}

// System prompt that gives the AI full awareness of its capabilities and task
const buildSystemPrompt = (docType: 'tarefa' | 'prova') => {
    const docName = docType === 'tarefa' ? 'tarefa (homework assignment)' : 'prova (exam)';
    return `Você é um assistente educacional avançado especializado em criar ${docName}s acadêmicas de alta qualidade.

## SUAS CAPACIDADES
- Você tem acesso à BUSCA NA INTERNET (Google Search). Use-a ativamente para pesquisar conteúdos atualizados, artigos científicos, dados recentes e informações relevantes ao tema solicitado.
- Você pode gerar questões de múltipla escolha, verdadeiro/falso e dissertativas.
- Você entende contextos pedagógicos de ensino fundamental, médio e superior.

## REGRAS DE GERAÇÃO
1. Sempre estruture as questões com numeração sequencial (1, 2, 3...).
2. Para questões de múltipla escolha, forneça sempre 4 alternativas (a, b, c, d).
3. Para questões dissertativas, forneça uma resposta modelo.
4. Para questões verdadeiro/falso, indique claramente a resposta correta.
5. Misture os tipos de questão para diversificar a avaliação.
6. Use linguagem acadêmica clara e objetiva em português brasileiro.
7. Quando o professor fornecer links ou textos de referência, baseie as questões nesse material.
8. Se o tema exigir dados atualizados, USE SUA CAPACIDADE DE BUSCA NA INTERNET para pesquisar.

## FORMATO DE SAÍDA (OBRIGATÓRIO)
Responda EXCLUSIVAMENTE com um JSON array válido. Nenhum texto fora do JSON.
Cada elemento deve seguir esta estrutura:
[
  {
    "number": 1,
    "statement": "Texto da questão aqui...",
    "type": "multiple_choice",
    "options": ["a) Opção A", "b) Opção B", "c) Opção C", "d) Opção D"],
    "answer": "a) Opção A"
  },
  {
    "number": 2,
    "statement": "Explique detalhadamente...",
    "type": "open_ended",
    "answer": "Resposta modelo aqui..."
  },
  {
    "number": 3,
    "statement": "A Terra é plana.",
    "type": "true_false",
    "answer": "Falso. A Terra possui formato geoide..."
  }
]

IMPORTANTE: Retorne APENAS o JSON array. Sem markdown, sem explicações, sem backticks.`;
};

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const rl = await guard(req, "ai-generate-document", "ai-heavy");
        if (!rl.ok) return rl.response;

        const body = await req.json();
        const {
            type = 'tarefa',          // 'tarefa' | 'prova'
            prompt,                    // User's instruction
            context,                   // Optional: pasted text, link content
            regenerateQuestion,        // Optional: number of question to regenerate
            existingQuestions,         // Optional: current questions array (for regeneration)
            questionCount = 5,         // Default number of questions
        } = body;

        if (!prompt) {
            return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
        }

        // Initialize Vertex AI
        const credentials = (() => { const __v = vertexCredentials(); return { project_id: __v.project, client_email: __v.client_email, private_key: __v.private_key }; })(); // robust parse
        const vertexAI = new VertexAI({
            project: credentials.project_id || process.env.GOOGLE_PROJECT_ID,
            location: process.env.GOOGLE_LOCATION || 'us-central1',
            googleAuthOptions: {
                credentials: {
                    client_email: credentials.client_email,
                    private_key: credentials.private_key,
                }
            }
        });

        const generativeModel = vertexAI.getGenerativeModel({
            model: (process.env.GEMINI_MODEL || 'gemini-2.5-flash'),
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 8192,
                responseMimeType: 'application/json',
            },
            // Enable Google Search grounding for internet access
            tools: [{ googleSearchRetrieval: {} }],
        });

        // Build the user message based on whether we're generating fresh or regenerating
        let userMessage: string;

        if (regenerateQuestion && existingQuestions) {
            // Regeneration mode: only generate ONE specific question
            const existingQ = existingQuestions.find((q: GeneratedQuestion) => q.number === regenerateQuestion);
            userMessage = `Regenere APENAS a questão número ${regenerateQuestion} da seguinte ${type === 'tarefa' ? 'tarefa' : 'prova'}.

Contexto original: ${prompt}
${context ? `\nMaterial de referência:\n${context}` : ''}

A questão atual é:
${JSON.stringify(existingQ, null, 2)}

Gere uma NOVA versão desta questão com o mesmo número (${regenerateQuestion}) mas com conteúdo diferente.
O tipo pode ser: multiple_choice, open_ended, ou true_false.
Retorne um JSON array com APENAS essa questão: [{ number: ${regenerateQuestion}, ... }]`;
        } else {
            // Full generation mode
            userMessage = `Gere uma ${type === 'tarefa' ? 'tarefa (homework) completa' : 'prova (exam) completa'} com ${questionCount} questões sobre o seguinte tema:

${prompt}

${context ? `\nMATERIAL DE REFERÊNCIA fornecido pelo professor:\n${context}\n\nBaseie as questões prioritariamente neste material, complementando com pesquisa na internet quando necessário.` : 'Use sua capacidade de busca na internet para pesquisar informações atualizadas sobre o tema.'}

Gere exatamente ${questionCount} questões diversificadas (misture múltipla escolha, dissertativas e verdadeiro/falso).`;
        }

        // Send to Gemini
        const result = await generativeModel.generateContent({
            systemInstruction: {
                role: 'system',
                parts: [{ text: buildSystemPrompt(type) }]
            },
            contents: [{ role: 'user', parts: [{ text: userMessage }] }],
        });

        const responseText = result.response?.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!responseText) {
            return NextResponse.json({ error: "Empty AI response" }, { status: 500 });
        }

        // Parse the JSON response
        let questions: GeneratedQuestion[];
        try {
            // Clean potential markdown wrapper
            const cleaned = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            questions = JSON.parse(cleaned);

            // Validate structure
            if (!Array.isArray(questions)) {
                throw new Error("Response is not an array");
            }
        } catch (parseError) {
            console.error("Failed to parse AI response:", responseText);
            return NextResponse.json({
                error: "Failed to parse AI response",
                raw: responseText
            }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            questions,
            type,
        });

    } catch (error: any) {
        console.error("Error in generate-document:", error);
        return NextResponse.json({
            error: error.message || "Internal Server Error"
        }, { status: 500 });
    }
}
