import { vertexCredentials } from "@/lib/ai/vertex-credentials";
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from "@/src/lib/auth";
import { VertexAI } from '@google-cloud/vertexai';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

const ABNT_SERVICE_URL = process.env.ABNT_SERVICE_URL || 'http://localhost:8001';

interface ABNTExportRequest {
    title: string;
    content: string;
    workType: string;
    citations: Array<{
        id: string;
        text: string;
        // Campos estruturados (NBR 6023:2018) — o worker formata determinísticamente
        authors?: string[];
        title?: string;
        year?: number;
        venue?: string;
        doi?: string;
        url?: string;
    }>;
    author: string;
    institution: string;
    course: string;
    advisor?: string;
    city: string;
    year: string;
    format: 'pdf' | 'docx';
    fontChoice?: string;
    parsedSections?: Array<{
        type: string;
        title: string;
        content: string;
        subsections: Array<{ title: string; content: string }>;
    }>;
    apendices?: Array<{ title: string; content: string }>;  // pós-textuais (opcional)
    anexos?: Array<{ title: string; content: string }>;
}

async function generateMetaWithGemini(request: ABNTExportRequest): Promise<{
    resumo: string;
    palavras_chave: string[];
    abstract: string;
    keywords: string[];
}> {
    const credentials = (() => { const __v = vertexCredentials(); return { project_id: __v.project, client_email: __v.client_email, private_key: __v.private_key }; })(); // robust parse
    const vertexAI = new VertexAI({
        project: credentials.project_id || process.env.GOOGLE_PROJECT_ID,
        location: process.env.GOOGLE_LOCATION || 'us-central1',
        googleAuthOptions: {
            credentials: {
                client_email: credentials.client_email,
                private_key: credentials.private_key,
            },
        },
    });

    const model = vertexAI.getGenerativeModel({ model: (process.env.GEMINI_MODEL || 'gemini-2.5-flash') });

    const prompt = `Você é um assistente acadêmico. Analise o texto abaixo e retorne EXCLUSIVAMENTE um JSON válido (sem markdown) com:
{
  "resumo": "parágrafo único, até 500 palavras, terceira pessoa, em português",
  "palavras_chave": ["termo1", "termo2", "termo3"],
  "abstract": "single paragraph, English version of the resumo, third person",
  "keywords": ["term1", "term2", "term3"]
}

O "abstract" deve ser a versão em inglês do "resumo" e "keywords" a tradução de "palavras_chave".

TÍTULO: ${request.title}
TIPO: ${request.workType}
TEXTO:
${request.content.substring(0, 3000)}`;

    const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 1024 },
    });

    const rawText = result.response.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const cleaned = rawText.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
    return JSON.parse(cleaned);
}

async function structureWithGemini(request: ABNTExportRequest): Promise<{
    resumo: string;
    palavras_chave: string[];
    abstract: string;
    keywords: string[];
    sections: Array<{
        type: string;
        title: string;
        content: string;
        subsections: Array<{ title: string; content: string }>;
    }>;
    validation: {
        has_introduction: boolean;
        has_conclusion: boolean;
        has_references: boolean;
        warnings: string[];
    };
}> {
    const credentials = (() => { const __v = vertexCredentials(); return { project_id: __v.project, client_email: __v.client_email, private_key: __v.private_key }; })(); // robust parse
    const vertexAI = new VertexAI({
        project: credentials.project_id || process.env.GOOGLE_PROJECT_ID,
        location: process.env.GOOGLE_LOCATION || 'us-central1',
        googleAuthOptions: {
            credentials: {
                client_email: credentials.client_email,
                private_key: credentials.private_key,
            },
        },
    });

    const model = vertexAI.getGenerativeModel({ model: (process.env.GEMINI_MODEL || 'gemini-2.5-flash') });

    const abntStructurerPersona = `Você é o Agente ABNT Structurer da Zaeon OS.
Sua única função é analisar um texto acadêmico bruto e estruturá-lo nas seções da ABNT NBR 14724:2011.
Retorne EXCLUSIVAMENTE um JSON válido, sem markdown, sem blocos de código, sem texto extra.

Schema obrigatório:
{
  "resumo": "parágrafo único, até 500 palavras, terceira pessoa, em português",
  "palavras_chave": ["termo1", "termo2", "termo3"],
  "abstract": "single paragraph, English version of the resumo, third person",
  "keywords": ["term1", "term2", "term3"],
  "sections": [
    {
      "type": "introducao|desenvolvimento|conclusao|custom",
      "title": "TÍTULO EM MAIÚSCULAS",
      "content": "texto da seção",
      "subsections": [{ "title": "Subtítulo", "content": "texto" }]
    }
  ],
  "validation": {
    "has_introduction": true,
    "has_conclusion": true,
    "has_references": false,
    "warnings": []
  }
}

Regras: normalize títulos para MAIÚSCULAS; se não houver seções claras, identifique pelo conteúdo; gere resumo se não houver; extraia 3-5 palavras-chave; gere "abstract" (resumo em inglês) e "keywords" (palavras-chave em inglês); NUNCA retorne markdown.

DICA: O texto pode conter marcadores explícitos no formato:
  # TÍTULO DA SEÇÃO (seção principal)
  ## Título da Subseção (subseção)
Quando presentes, USE-OS como delimitadores de seção em vez de inferir pelo conteúdo.

IMPORTANTE: PRESERVE intactos os marcadores de imagem/figura no formato ![Título|Fonte](url) — não os altere, traduza, resuma ou remova, e mantenha cada um em seu próprio parágrafo (linha isolada) dentro da seção onde aparecem.`;

    const prompt = `${abntStructurerPersona}

TIPO DE TRABALHO: ${request.workType}
TÍTULO: ${request.title}

TEXTO DO USUÁRIO:
${request.content}

CITAÇÕES SALVAS:
${request.citations.map((c, i) => `${i + 1}. ${c.text}`).join('\n') || 'Nenhuma citação salva.'}`;

    const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 4096,
        },
    });

    const rawText = result.response.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Remove markdown code blocks if the model added them despite instructions
    const cleaned = rawText
        .replace(/```json\s*/gi, '')
        .replace(/```\s*/gi, '')
        .trim();

    return JSON.parse(cleaned);
}

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
        }

        const body: ABNTExportRequest = await req.json();

        if (!body.content?.trim()) {
            return NextResponse.json(
                { error: 'Conteúdo do documento não pode estar vazio.' },
                { status: 400 }
            );
        }

        if (!body.institution?.trim() || !body.city?.trim() || !body.year?.trim()) {
            return NextResponse.json(
                { error: 'Metadados obrigatórios: instituição, cidade e ano.' },
                { status: 400 }
            );
        }

        // Step 1: Structure content
        let structured;

        if (body.parsedSections && body.parsedSections.length > 0) {
            // Fast-path: front-end already parsed # markers — skip Gemini section detection
            const hasIntro = body.parsedSections.some(s => s.type === 'introducao');
            const hasConclusion = body.parsedSections.some(s => s.type === 'conclusao');
            const hasRefs = body.parsedSections.some(s => s.type === 'referencias');

            let resumo = '';
            let palavras_chave: string[] = [];
            let abstract = '';
            let keywords: string[] = [];
            try {
                const meta = await generateMetaWithGemini(body);
                resumo = meta.resumo;
                palavras_chave = meta.palavras_chave;
                abstract = meta.abstract || '';
                keywords = meta.keywords || [];
            } catch {
                resumo = body.content.substring(0, 500);
                palavras_chave = ['Pesquisa', 'Acadêmico', 'Zaeon'];
            }

            const warnings: string[] = [];
            if (!hasIntro) warnings.push('Seção de Introdução não encontrada.');
            else if (!hasConclusion) warnings.push('Seção de Conclusão não encontrada.');

            structured = {
                resumo,
                palavras_chave,
                abstract,
                keywords,
                sections: body.parsedSections,
                validation: {
                    has_introduction: hasIntro,
                    has_conclusion: hasConclusion,
                    has_references: hasRefs,
                    warnings,
                },
            };
        } else {
            // Fallback: Gemini does full structuring (existing behavior)
            try {
                structured = await structureWithGemini(body);
            } catch (err) {
                console.error('[ABNT] Gemini structuring failed:', err);
                structured = {
                    resumo: body.content.substring(0, 500),
                    palavras_chave: ['Pesquisa', 'Acadêmico', 'Zaeon'],
                    abstract: '',
                    keywords: [],
                    sections: [
                        {
                            type: 'introducao',
                            title: 'INTRODUÇÃO',
                            content: 'Introdução ao trabalho acadêmico.',
                            subsections: [],
                        },
                        {
                            type: 'desenvolvimento',
                            title: 'DESENVOLVIMENTO',
                            content: body.content,
                            subsections: [],
                        },
                        {
                            type: 'conclusao',
                            title: 'CONCLUSÃO',
                            content: 'Considerações finais do trabalho.',
                            subsections: [],
                        },
                    ],
                    validation: {
                        has_introduction: false,
                        has_conclusion: false,
                        has_references: false,
                        warnings: ['Estruturação automática via IA falhou. Conteúdo inserido como desenvolvimento.'],
                    },
                };
            }
        }

        // Step 2: Build DocumentPayload for Python service
        const documentPayload = {
            title: body.title || 'Trabalho Acadêmico',
            work_type: body.workType || 'Artigo',
            cover: {
                author: body.author || 'Autor',
                institution: body.institution,
                course: body.course || '',
                advisor: body.advisor || null,
                city: body.city,
                year: body.year,
            },
            resumo: structured.resumo,
            palavras_chave: structured.palavras_chave,
            abstract: structured.abstract || null,
            keywords: structured.keywords || [],
            sections: structured.sections,
            references: body.citations.map((c) => ({
                text: c.text,
                authors: c.authors || [],
                title: c.title ?? null,
                year: c.year ?? null,
                venue: c.venue ?? null,
                doi: c.doi ?? null,
                url: c.url ?? null,
            })),
            apendices: body.apendices || [],
            anexos: body.anexos || [],
            validation: structured.validation,
            format: body.format,
            font_choice: body.fontChoice || 'Times New Roman',
        };

        // Step 3: Call Python ABNT service
        let serviceResponse: Response;
        try {
            serviceResponse = await fetch(`${ABNT_SERVICE_URL}/format`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(documentPayload),
                signal: AbortSignal.timeout(90_000),
            });
        } catch (err) {
            console.error('[ABNT] Python service unreachable:', err);
            return NextResponse.json(
                {
                    error: 'O formatador está reiniciando, tente em instantes.',
                    warnings: structured.validation?.warnings || [],
                },
                { status: 503 }
            );
        }

        if (!serviceResponse.ok) {
            const detail = await serviceResponse.text();
            return NextResponse.json(
                { error: `Erro no serviço ABNT: ${detail}` },
                { status: serviceResponse.status }
            );
        }

        // Step 4: Stream binary back to browser
        const fileBytes = await serviceResponse.arrayBuffer();
        const isDocx = body.format === 'docx';
        const mimeType = isDocx
            ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            : 'application/pdf';
        const extension = isDocx ? 'docx' : 'pdf';
        const filename = `${(body.title || 'documento').replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_\-]/g, '')}_ABNT.${extension}`;

        return new Response(fileBytes, {
            status: 200,
            headers: {
                'Content-Type': mimeType,
                'Content-Disposition': `attachment; filename="${filename}"`,
                'Content-Length': String(fileBytes.byteLength),
                // Pass warnings back as a header so frontend can show them
                'X-ABNT-Warnings': JSON.stringify(structured.validation?.warnings || []),
            },
        });
    } catch (err) {
        console.error('[ABNT] Unexpected error:', err);
        return NextResponse.json(
            { error: 'Erro interno no servidor ao processar o documento.' },
            { status: 500 }
        );
    }
}
