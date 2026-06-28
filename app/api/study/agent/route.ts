/**
 * POST /api/study/agent — o WORKER generativo da Sala de Estudos.
 *
 * Converte um comando em linguagem natural em BLOCOS estruturados (título,
 * subtítulos, parágrafos, links) que viram cards no feed "Meus Estudos".
 *
 * Robustez (Fase 0): parse tolerante + validação de "estudo de verdade"
 * (lib/study/studyAgentParse) com 1 retry. Saída degenerada LANÇA -> não entra no
 * cache (cacheJson só grava não-nulo) e a rota responde 502, em vez de cachear um
 * "estudo" só com título por 7 dias. Chave de cache versionada (studyagent2) para
 * ignorar entradas já envenenadas.
 */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth";
import { geminiText } from "@/lib/ai/gemini-text";
import { guard } from "@/src/lib/ratelimit";
import { cacheJson, hashKey } from "@/src/lib/cache";
import { buildStudy } from "@/lib/study/studyAgentParse";

export const runtime = "nodejs";
export const maxDuration = 60;

const SYSTEM =
  "Você é a Zaeon montando o caderno de estudos do aluno a partir de um comando. " +
  "Produza um material claro, didático e bem estruturado em português do Brasil. " +
  "Responda SOMENTE um JSON válido (sem markdown, sem crases), no formato: " +
  '{"title":"<título curto do estudo>","blocks":[{"kind":"heading|subheading|text|link","text":"...","url":"(só quando kind=link)"}]}. ' +
  "Regras: comece por 1 heading (o tema). Use subheadings pra organizar. Em 'text' escreva parágrafos " +
  "objetivos com os pontos-chave/insights (2 a 5 frases cada). Em 'link' dê recursos úteis e REAIS quando " +
  "tiver certeza (Wikipedia, docs oficiais, artigos conhecidos) — no máximo 3, com 'text' = nome e 'url' = endereço. " +
  "Entre 6 e 12 blocos no total. Não invente URLs improváveis; na dúvida, descreva o recurso num 'text'.";

const RETRY_HINT =
  "\n\nResponda SOMENTE o objeto JSON pedido — nada de texto fora do JSON. " +
  "Garanta de 6 a 12 blocos, com ao menos 3 parágrafos de corpo reais (kind=\"text\").";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = await guard(req, "study-agent", "ai-light");
  if (!rl.ok) return rl.response;

  const body = await req.json().catch(() => ({} as any));
  const command = typeof body.command === "string" ? body.command.trim() : "";
  if (command.length < 2) return NextResponse.json({ error: "Comando muito curto." }, { status: 400 });

  try {
    const result = await cacheJson(hashKey("studyagent2", command.toLowerCase()), 60 * 60 * 24 * 7, async () => {
      const first = await geminiText({ temperature: 0.5, system: SYSTEM, prompt: `Comando do aluno: ${command}`, json: true });
      let study = buildStudy(first, command);
      if (!study) {
        const second = await geminiText({ temperature: 0.2, system: SYSTEM, prompt: `Comando do aluno: ${command}${RETRY_HINT}`, json: true });
        study = buildStudy(second, command);
      }
      if (!study) throw new Error("ai_degenerate"); // não cacheia; vira 502 abaixo
      return study;
    });
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "ai_error", message: "Não consegui montar o estudo agora. Tente reformular o comando." }, { status: 502 });
  }
}
