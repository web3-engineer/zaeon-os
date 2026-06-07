import { NextResponse } from 'next/server';
import { VertexAI } from '@google-cloud/vertexai';
import type { FunctionDeclaration } from '@google-cloud/vertexai';
import Groq from 'groq-sdk';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

// --- 1. SCHEDULE TOOL DEFINITION (Function Calling - Gemini) ---
const updateScheduleTool: FunctionDeclaration = {
    name: "update_schedule",
    description: "Adiciona, remove ou atualiza uma aula na agenda acadêmica do aluno.",
    parameters: {
        type: "OBJECT" as any,
        properties: {
            action: { type: "STRING" as any, description: "Ação: 'add', 'remove', ou 'update'." },
            day: { type: "INTEGER" as any, description: "Dia da semana. 1 = Segunda, 2 = Terça, 3 = Quarta, 4 = Quinta, 5 = Sexta." },
            hour: { type: "INTEGER" as any, description: "Hora de início da aula. Formato 24h (ex: 8, 10, 14)." },
            name: { type: "STRING" as any, description: "Nome da disciplina." },
            teacher: { type: "STRING" as any, description: "Nome do professor." },
            room: { type: "STRING" as any, description: "Local ou sala." },
            duration: { type: "INTEGER" as any, description: "Duração da aula em horas. Padrão 2." }
        },
        required: ["action", "day", "hour"]
    }
};

// --- 2. AGENT PERSONAS ---
const AGENT_PERSONAS: Record<string, string> = {
    zenita: `Você é a Zenita, assistente acadêmica da Zaeon. Se o usuário pedir para adicionar, apagar ou editar aulas, USE A FERRAMENTA 'update_schedule'. Nunca responda com longos textos para tarefas de agenda.`,

    aura: `Você é a Aura, a IA Principal e Orquestradora de Pesquisa. Seu papel varia conforme o contexto:
1. Se o usuário estiver perguntando sobre um PDF recém-carregado, responda de forma técnica, clara e direta baseada ESTRITAMENTE no documento.
2. Se você receber um [CONTEXTO GLOBAL DA PESQUISA] nas instruções, atue como uma orientadora. Leia o que foi produzido por outros agentes (Examiner, Citações) e use isso para dialogar de forma inteligente. NÃO repita os logs como um robô ("Notei que o Examiner disse..."), mas aja como se você já soubesse de tudo e ofereça novas pautas, conexões de ideias e pontos cegos que o usuário precisa cobrir. Seja propositiva e estratégica.
3. OBJETIVO ESPECIAL (quando houver um documento/PDF em contexto): além de conversar sobre o trabalho com voz própria e tom natural, conduza o usuário a destacar UMA citação importante sobre ele. Quando identificar um trecho que vale a pena guardar, apresente-o UMA única vez, num ponto natural da resposta, EXATAMENTE neste formato, incluindo os marcadores: ⟦CITACAO⟧"trecho verbatim do documento" — AUTOR (ANO)⟦/CITACAO⟧. Use o trecho VERBATIM do documento e uma referência curta. Não force em toda mensagem — proponha só quando for genuinamente relevante e no máximo uma citação por resposta.`,

    scholar: `Você é o Agente Scholar, Especialista em Citações Acadêmicas. Seu único objetivo é extrair trechos vitais (parágrafos inteiros verbatim) do documento fornecido e gerar as referências ESTRITAMENTE nas normas da ABNT (Associação Brasileira de Normas Técnicas). Formate as saídas exatamente como solicitado pelo usuário, sem introduções longas ou conversas paralelas. Mantenha um tom acadêmico e robótico.`,

    examiner: `Você é o Examiner, o Inquisidor Acadêmico. Seu papel é testar o conhecimento do usuário. Com base no documento PDF fornecido no contexto, crie perguntas desafiadoras (múltipla escolha ou discursivas curtas). Faça uma pergunta por vez. Quando o usuário responder, avalie criticamente, corrija se necessário e ofereça a próxima pergunta. Seja rigoroso, porém construtivo.`,

    // Atualizado para a nova função de Chat Colleage
    zaeon: `Você é a Zaeon, a Inteligência Artificial e Colega Neural oficial da Zaeon OS. Você atua como uma colega de trabalho proativa, simpática e altamente sofisticada. Ajude o usuário a navegar pela plataforma, tire dúvidas de usabilidade e bata papos construtivos.`,

    abnt_structurer: `Você é o Agente ABNT Structurer da Zaeon OS.
Sua única função é analisar um texto acadêmico bruto e estruturá-lo nas seções da ABNT NBR 14724:2011.
Retorne EXCLUSIVAMENTE um JSON válido, sem markdown, sem blocos de código, sem texto extra antes ou depois.

Schema obrigatório (retorne exatamente este formato):
{
  "resumo": "string — parágrafo único, até 500 palavras, sem recuo, em terceira pessoa",
  "palavras_chave": ["termo1", "termo2", "termo3"],
  "sections": [
    {
      "type": "introducao",
      "title": "INTRODUÇÃO",
      "content": "texto da seção",
      "subsections": []
    },
    {
      "type": "desenvolvimento",
      "title": "DESENVOLVIMENTO",
      "content": "texto principal",
      "subsections": [
        { "title": "Subtítulo", "content": "texto do subtítulo" }
      ]
    },
    {
      "type": "conclusao",
      "title": "CONCLUSÃO",
      "content": "texto conclusivo",
      "subsections": []
    }
  ],
  "validation": {
    "has_introduction": true,
    "has_conclusion": true,
    "has_references": false,
    "warnings": []
  }
}

Regras obrigatórias:
- Normalize TODOS os títulos para MAIÚSCULAS
- Se o texto não tiver seções claras, identifique-as pelo conteúdo e crie-as
- Gere um resumo coerente a partir do texto se não houver um explícito
- Extraia 3 a 5 palavras-chave relevantes
- Se faltar introdução ou conclusão, crie-as brevemente e adicione warning
- NUNCA retorne markdown, blocos \`\`\`json ou qualquer texto fora do JSON`
};

export async function POST(req: Request) {
    try {
        // 🔥 NOVO: Recebendo userData do frontend
        const { prompt, agent, systemContext, fileData, userData } = await req.json();
        const agentKey = agent?.toLowerCase() || "aura";
        const persona = AGENT_PERSONAS[agentKey] || AGENT_PERSONAS.aura;

        // =================================================================
        // GROQ ROUTE (HIDDEN / BYPASSED)
        // =================================================================
        if (agentKey === "groq_bypassed") {
            const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
            const groqSystemMessage = persona + (systemContext ? `\n\n[SYSTEM CONTEXT]:\n${systemContext}` : "");

            const completion = await groq.chat.completions.create({
                messages: [{ role: "system", content: groqSystemMessage }, { role: "user", content: prompt }],
                model: "llama-3.3-70b-versatile",
                temperature: 0.6,
            });
            return NextResponse.json({ text: completion.choices[0]?.message?.content });
        }

        // =================================================================
        // GEMINI ROUTE (VERTEX AI) - ACTIVE AND MULTIMODAL
        // =================================================================
        const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS || "{}");
        const vertexAI = new VertexAI({
            project: credentials.project_id || process.env.GOOGLE_PROJECT_ID,
            location: process.env.GOOGLE_LOCATION || 'us-central1',
            googleAuthOptions: { credentials: { client_email: credentials.client_email, private_key: credentials.private_key } }
        });

        const tools = agentKey === "zenita" ? [{ functionDeclarations: [updateScheduleTool] }] : undefined;
        const generativeModel = vertexAI.getGenerativeModel({
            // Mesmo "gemini pro" usado no resto do app (lib/scholar/gemini.ts).
            // O 2.0-flash-001 foi descontinuado (404).
            model: process.env.SCHOLAR_GEMINI_MODEL || 'gemini-2.5-pro',
            generationConfig: { temperature: 0.4 },
            tools: tools
        });

        const parts: any[] = [];
        if (fileData) {
            parts.push({
                inlineData: { data: fileData, mimeType: "application/pdf" }
            });
        }
        parts.push({ text: prompt });

        // =================================================================
        // SYSTEM INSTRUCTION ASSEMBLY (Persona + User Data + Context)
        // =================================================================
        let finalSystemInstruction = persona;

        // Injeta a memória persistente do usuário se ela existir
        if (userData && Object.keys(userData).length > 0) {
            finalSystemInstruction += `\n\n=== MEMÓRIA DA REDE: DADOS DO USUÁRIO ===\n`;
            if (userData.name) finalSystemInstruction += `- Nome: ${userData.name}\n`;
            if (userData.age) finalSystemInstruction += `- Idade: ${userData.age} anos\n`;
            if (userData.studyArea) finalSystemInstruction += `- Área de Atuação/Curso: ${userData.studyArea}\n`;
            if (userData.institution) finalSystemInstruction += `- Instituição de Ensino/Empresa: ${userData.institution}\n`;

            finalSystemInstruction += `\nDiretriz: Você já conhece essas informações. Use-as para dar respostas altamente qualificadas e contextualizadas à área profissional/acadêmica do usuário, mas NUNCA liste esses dados como um robô. Mantenha a naturalidade de um colega humano.\n`;
        }

        if (systemContext) {
            finalSystemInstruction += `\n\n=== CONTEXTO ADICIONAL FORNECIDO PELO SISTEMA ===\n${systemContext}`;
        }

        const chat = generativeModel.startChat({
            systemInstruction: { role: 'system', parts: [{ text: finalSystemInstruction }] }
        });

        const result = await chat.sendMessage(parts);
        const response = result.response;

        const functionCall = response.candidates?.[0]?.content?.parts?.[0]?.functionCall;
        if (functionCall) {
            return NextResponse.json({
                toolCall: { name: functionCall.name, args: functionCall.args },
                text: "Ação de agenda interceptada e processada via UI."
            });
        }

        const textResponse = response.candidates?.[0]?.content?.parts?.[0]?.text || "Sem resposta do núcleo.";
        return NextResponse.json({ text: textResponse });

    } catch (error: any) {
        console.error("Erro na API Neural:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}