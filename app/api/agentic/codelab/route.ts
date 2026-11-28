import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/src/lib/auth';
// #883 (parte 3a): a IA sai pelo envelope (Hugging Face primeiro, Google só de queda), não pelo SDK do Vertex direto
import { iaDoLaboratorio, idDoAluno } from '@/lib/agentic/labIa';

export const dynamic    = 'force-dynamic';
export const maxDuration = 30;

const SYSTEM_PROMPT = `You are a coding teaching assistant for the Zaeon OS Code Lab.

Given the user's question and their current code, provide helpful, concise assistance.

Your response should be ONLY a JSON object:
{
  "response": "Clear explanation, tip, or answer in 2-4 sentences. Use code snippets inline like \`code\`.",
  "updatedCode": "OPTIONAL: If the user asked to fix, refactor, or add something, provide the full updated code here. Otherwise omit this field."
}

RULES:
- Keep explanations beginner-friendly but accurate.
- If showing code in "response", use backtick inline code or triple-backtick blocks.
- "updatedCode" should be the COMPLETE updated code, not a snippet — only include if the user explicitly asked to change the code.
- For Python, follow PEP 8. For JS/TS, use modern ES6+ syntax.
- Never explain what JSON is. Just return valid JSON.
- Max 300 words in "response".`;

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { prompt, code, language } = await req.json();
    if (!prompt?.trim()) return NextResponse.json({ error: 'Prompt required' }, { status: 400 });

    const userMsg = `Language: ${language ?? 'javascript'}
User question: "${prompt.trim()}"
Current code:
\`\`\`${language ?? 'javascript'}
${(code ?? '').slice(0, 3000)}
\`\`\``;

    const raw = await iaDoLaboratorio('codelab', SYSTEM_PROMPT, userMsg, { temperature: 0.4, maxOutputTokens: 1024, userId: idDoAluno(session) });

    let parsed: any;
    try {
      parsed = JSON.parse(raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim());
    } catch {
      return NextResponse.json({ response: raw, raw }, { status: 200 });
    }

    return NextResponse.json({ response: parsed.response, updatedCode: parsed.updatedCode });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Server error' }, { status: 500 });
  }
}
