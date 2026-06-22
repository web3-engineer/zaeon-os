import { vertexCredentials } from "@/lib/ai/vertex-credentials";
import { NextResponse } from 'next/server';
import { VertexAI } from '@google-cloud/vertexai';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    try {
        const { message, currentData } = await req.json();

        const credentials = (() => { const __v = vertexCredentials(); return { project_id: __v.project, client_email: __v.client_email, private_key: __v.private_key }; })(); // robust parse
        const vertexAI = new VertexAI({
            project: credentials.project_id || process.env.GOOGLE_PROJECT_ID,
            location: process.env.GOOGLE_LOCATION || 'us-central1',
            googleAuthOptions: { credentials: { client_email: credentials.client_email, private_key: credentials.private_key } }
        });

        const model = vertexAI.getGenerativeModel({
            model: (process.env.GEMINI_MODEL || 'gemini-2.5-flash'),
            generationConfig: {
                temperature: 0.1, // Mantemos quase em zero para máxima precisão de extração
                responseMimeType: "application/json",
            }
        });

        // ============================================================================
        // PROMPT HIPER-ENRIQUECIDO (COMPREENSÃO SEMÂNTICA PROFUNDA)
        // ============================================================================
        const prompt = `
            Você é o Núcleo Analítico da Zaeon OS. A sua função é extrair, refinar e normalizar dados de perfil de um utilizador a partir de conversas naturais, informais ou complexas.
            
            DADOS ATUAIS DO UTILIZADOR:
            ${JSON.stringify(currentData)}

            NOVA MENSAGEM DO UTILIZADOR:
            "${message}"

            REGRAS DE EXTRAÇÃO E VOCABULÁRIO (Preencha ou atualize o JSON com base nisto):

            1. NOME (name):
               - Extraia apenas o nome próprio ou nome composto.
               - Ignore saudações (ex: "Olá, sou o João" -> "João").
               - Capitalize a primeira letra (ex: "evandro" -> "Evandro").

            2. IDADE (age):
               - Identifique numerais associados a tempo de vida (ex: "tenho 22", "22 anos", "faço 23 amanhã").
               - Retorne apenas o número inteiro (number).

            3. ÁREA DE ESTUDO / PROFISSÃO (studyArea):
               - Compreenda abreviaturas comuns: "eng comp" = "Engenharia da Computação", "dev" = "Desenvolvedor/Software Engineer", "ti" = "Tecnologia da Informação", "si" = "Sistemas de Informação", "med" = "Medicina".
               - Compreenda calão ou informalidade: "mexer com código", "faço sites", "trabalho com design". Tente normalizar para a profissão correta (ex: "Design", "Desenvolvimento Web").
               - Se for estudante do ensino secundário, extraia "Ensino Secundário/Médio".

            4. INSTITUIÇÃO OU EMPRESA (institution):
               - Mapeie siglas universitárias (ex: "Unilab", "UFC", "IFCE", "USP", "UFRJ", "Unicamp", "PUC") e normalize-as sempre para MAIÚSCULAS.
               - Reconheça nomes de empresas ou escolas técnicas (ex: "Rocketseat", "Alura", "Google", "Microsoft", "startup X").
               - Identifique conectores de lugar: "na [Instituição]", "pela [Instituição]", "para a [Empresa]".

            5. TIPO DE ATIVIDADE (activityType):
               - Defina estritamente como "estuda" se o utilizador usar: "faço" (seguido de curso), "curso", "estudo", "estou na faculdade", "aluno de", "caloiro", "veterano".
               - Defina estritamente como "trabalha" se o utilizador usar: "trabalho", "sou" (seguido de profissão), "atuo", "trampo de", "faço bico", "exerço", "sou sénior/júnior".
               - Se a mensagem contiver ambos, dê prioridade ao que o utilizador der mais foco na frase atual, ou mantenha o valor anterior se já estiver definido.

            6. GÉNERO (gender):
               - Faça a inferência gramatical a partir das palavras que o utilizador usa.
               - Exemplo "male": "sou aluno", "sou médico", "sou engenheiro", "obrigado".
               - Exemplo "female": "sou aluna", "sou médica", "sou engenheira", "obrigada".
               - Retorne apenas "male", "female", "other" ou null.

            7. REGRA DE OURO (ATUALIZAÇÃO INCREMENTAL):
               - NUNCA apague ou substitua por null uma informação que já existe nos "DADOS ATUAIS", a menos que o utilizador a corrija explicitamente.
               - Combine os dados novos com os dados antigos.

            Retorne APENAS um objeto JSON válido, estritamente com esta estrutura:
            {
                "name": "string ou null",
                "age": "number ou null",
                "studyArea": "string ou null",
                "institution": "string ou null",
                "activityType": "string ('estuda' ou 'trabalha') ou null",
                "gender": "string ('male', 'female', 'other') ou null"
            }
        `;

        const result = await model.generateContent(prompt);
        const responseText = result.response.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!responseText) throw new Error("Sem resposta do modelo");

        // Tratamento de segurança caso a IA adicione formatação markdown (ex: ```json ... ```)
        const cleanJsonText = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();
        const extractedData = JSON.parse(cleanJsonText);

        return NextResponse.json({ success: true, data: extractedData });

    } catch (error: any) {
        console.error("Erro na Extração:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}