import { VertexAI } from "@google-cloud/vertexai";
import { NextResponse } from "next/server";

// Inicializa o cliente Vertex AI
// Documentação: https://cloud.google.com/vertex-ai/docs/start/client-libraries-node
const vertex_ai = new VertexAI({
    project: "bright-task-474414-h3",
    location: "us-central1", // Obrigatório para bater no endpoint certo
});

export async function POST(req: Request) {
    try {
        const { prompt, agent } = await req.json();

        // Configuração do Agente
        let systemInstruction = "You are a helpful assistant.";
        if (agent === "zenita") systemInstruction = "You are Zenita, a technical expert.";
        if (agent === "ballena") systemInstruction = "You are Ballena, a biology expert.";
        if (agent === "ethernaut") systemInstruction = "You are Ethernaut, a math expert.";

        console.log("📡 Vertex AI: Solicitando modelo gemini-1.5-flash-001...");

        // Instancia o modelo GENERICO (Preview)
        // Se o Flash falhar, a doc sugere tentar o Pro ou o Flash-001 explícito
        const model = vertex_ai.getGenerativeModel({
            model: "gemini-2.5-flash", // ID exato da documentação "Latest Stable"
        });

        const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: `${systemInstruction}\n\nUser: ${prompt}` }] }],
        });

        const text = result.response?.candidates?.[0]?.content?.parts?.[0]?.text || "⚠️ No response from AI.";        console.log("✅ Sucesso Vertex AI!");

        return NextResponse.json({ text });

    } catch (error: any) {
        console.error("🔥 FALHA VERTEX AI:", error.message);

        return NextResponse.json({
            error: "Erro de Acesso ao Modelo",
            details: error.message,
            help: "Verifique se o modelo está HABILITADO no Model Garden."
        }, { status: 500 });
    }
}