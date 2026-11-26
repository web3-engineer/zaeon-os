import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from "@/src/lib/auth";
// #873: o resumo/estrutura do export saem pelo ENVELOPE (provedores atuais) — antes era Vertex direto, e com a
// cota do Google acabada o export saía com resumo cortado e palavras-chave genéricas.
import { geminiJson } from "@/lib/scholar/gemini";
import { prisma } from '@/src/lib/prisma';
import { onWorkFinalized } from '@/lib/solana/hooks';
import { ehEstilo, prepararParaNorma, type Estilo } from '@/lib/export/norma';
import { TIPO_TRABALHO_PECA } from '@/lib/documento/pecaJuridica';
import { estruturaDaPeca } from '@/lib/export/peca';

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
    /** a NORMA: "abnt" (padrão, com capa) | "vancouver" | "apa" — lib/export/norma + abnt-service/styles.py */
    style?: Estilo;
    fontChoice?: string;
    parsedSections?: Array<{
        type: string;
        title: string;
        content: string;
        subsections: Array<{ title: string; content: string }>;
    }>;
    researchWorkId?: string;  // ResearchWork salvo em "Minhas coisas" → conquista "trabalho concluído" (credencial Solana)
    apendices?: Array<{ title: string; content: string }>;  // pós-textuais (opcional)
    anexos?: Array<{ title: string; content: string }>;
}

async function generateMetaWithGemini(request: ABNTExportRequest): Promise<{
    resumo: string;
    palavras_chave: string[];
    abstract: string;
    keywords: string[];
}> {
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

    return geminiJson("Responda SOMENTE JSON válido.", prompt, { temperature: 0.2, timeoutMs: 30_000 });
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

    return geminiJson(abntStructurerPersona, prompt.slice(abntStructurerPersona.length), { temperature: 0.2, timeoutMs: 45_000 });
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

        const estilo: Estilo = ehEstilo(body.style) ? body.style : 'abnt';
        body.citations = Array.isArray(body.citations) ? body.citations : [];
        if (!body.year?.trim()) body.year = String(new Date().getFullYear());
        // Só a ABNT tem CAPA e folha de rosto com instituição e cidade (NBR 14724); Vancouver/APA não exigem.
        // #873 PR 4: PEÇA JURÍDICA não é trabalho acadêmico — sem capa, folha de rosto nem resumo (abnt-service: style "peca")
        const peca = body.workType === TIPO_TRABALHO_PECA;
        if (!peca && estilo === 'abnt' && (!body.institution?.trim() || !body.city?.trim())) {
            return NextResponse.json(
                { error: 'Para a ABNT, preencha instituição e cidade (vão na capa).', faltando: ['institution', 'city'].filter((k) => !(body as any)[k]?.trim()) },
                { status: 400 }
            );
        }

        // Step 1: Structure content
        let structured;

        if (peca) {
            // sem IA: a peça já vem com as partes dela; resumo e palavras-chave não existem numa petição
            structured = estruturaDaPeca(body.content, body.parsedSections);
        } else if (body.parsedSections && body.parsedSections.length > 0) {
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

        // Step 1.5: Vancouver/APA — chamadas no texto na forma da norma e referências em campos (a seção REFERÊNCIAS
        // em texto ABNT sai do corpo; o serviço monta a lista na ordem/forma da norma)
        const norma = prepararParaNorma(structured.sections, body.citations, peca ? 'abnt' : estilo);
        structured.sections = norma.sections;

        // Step 2: Build DocumentPayload for Python service
        const documentPayload = {
            style: peca ? 'peca' : estilo,
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
            references: norma.references ? norma.references.map((r) => ({
                text: r.text, authors: r.authors, title: r.title ?? null, year: r.year ?? null,
                venue: r.venue ?? null, doi: r.doi ?? null, url: r.url ?? null,
            })) : body.citations.map((c) => ({
                text: c.text,
                authors: c.authors || [],
                title: c.title ?? null,
                year: c.year ?? null,
                venue: c.venue ?? null,
                doi: c.doi ?? null,
                url: c.url ?? null,
            })),
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

        // Conquista → credencial soulbound na Solana. Fire-and-forget: o export NUNCA espera o mint.
        if (body.researchWorkId) {
            const workId = String(body.researchWorkId);
            const email = session.user.email;
            void (async () => {
                const me = await prisma.user.findUnique({ where: { email }, select: { id: true } });
                if (!me) return;
                const owned = await prisma.researchWork.findFirst({ where: { id: workId, userId: me.id }, select: { id: true, title: true, workType: true } });
                if (!owned) return;
                onWorkFinalized(me.id, owned.id, (owned.title || body.title || 'Trabalho acadêmico').trim(), {
                    workType: owned.workType || body.workType || null,
                    format: body.format,
                    citations: body.citations?.length ?? 0,
                    sections: body.parsedSections?.length ?? 0,
                    exportedAt: new Date().toISOString(),
                });
            })().catch((e) => console.warn('[ABNT] credencial (work) ignorada:', e));
        }
        const isDocx = body.format === 'docx';
        const mimeType = isDocx
            ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            : 'application/pdf';
        const extension = isDocx ? 'docx' : 'pdf';
        const filename = `${(body.title || 'documento').replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_\-]/g, '')}_${estilo.toUpperCase()}.${extension}`;

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
