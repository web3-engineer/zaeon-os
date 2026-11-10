/**
 * /api/studio/cad — a PEÇA do Eiffel: tema da conversa → roteiro de comandos → sólido de verdade.
 *
 * Esta rota NÃO EXISTIA, e era a causa concreta do "o Eiffel não gera artefato" (medido em produção
 * em 2026-11-10): o `studioClient` caía no caminho genérico, postava em `/api/studio/cad`, e o
 * caminho casava com a rota DINÂMICA `app/api/studio/[id]`, que só exporta GET e DELETE. O Next
 * devolvia 405 COM CORPO VAZIO, então `data?.error` era `undefined` — e a bolha ficava muda em vez
 * de explicar. Com o arquivo aqui, o POST tem dono.
 *
 * ────────────────────────── o modelo escreve, o kernel decide ──────────────────────────
 * O LLM escreve o ROTEIRO; quem diz que a peça existe é o `solidcraft-cli`. Roteiro que não
 * constrói não vira artefato — vira 422 com a mensagem do kernel. É a mesma fronteira do
 * `/api/studio/molecule` (PubChem) e do `/api/studio/anatomia` (BodyParts3D): num produto de
 * educação, geometria inventada é ficção com cara de engenharia.
 *
 * ────────────────────────── confinamento ──────────────────────────
 * Cada pedido trabalha numa pasta própria sob `RAIZ_CAD` (`lib/cad/mcp`), que é o mesmo
 * `--allow-path` do conector MCP. A pasta leva o id do dono e um sufixo aleatório: dois pedidos
 * simultâneos não se pisam, e nada é escrito fora dali.
 *
 * ⚠️ O BINÁRIO SÓ EXISTE NA IMAGEM (estágio Rust do Dockerfile). Em desenvolvimento e no CI ele não
 * está, e por isso a rota responde 503 em vez de estourar — o mesmo trilho que o atlas de anatomia
 * usa para "o servidor está sem o dado".
 */
import { NextResponse } from "next/server";
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { prisma } from "@/src/lib/prisma";
import { guard } from "@/src/lib/ratelimit";
import { studioUid } from "@/lib/studio/auth";
import { loadStudyContext } from "@/lib/studio/content";
import { gerarJson } from "@/lib/llm/envelope";
import { CAMINHO_BIN_SOLIDCRAFT, RAIZ_CAD } from "@/lib/cad/mcp";
import { construirPeca, lerScript, type Correr, type Disco } from "@/lib/cad/construir";
import { SYSTEM_ROTEIRO, tituloDaPeca, userRoteiro } from "@/lib/cad/roteiro";

export const runtime = "nodejs";
// Mais folgado que o molecule (60 s): aqui há uma chamada de modelo MAIS três execuções do kernel.
export const maxDuration = 180;

/** O teto de parede de cada execução do binário. Peça de aula não leva minutos; travar, leva. */
const PRAZO_CLI_MS = 45_000;

const correrDeVerdade: Correr = (args) =>
  new Promise((resolve) => {
    execFile(CAMINHO_BIN_SOLIDCRAFT, [...args], { timeout: PRAZO_CLI_MS, maxBuffer: 32 * 1024 * 1024 },
      (erro, stdout, stderr) => {
        const saida = `${stdout || ""}${stderr || ""}`.trim();
        resolve({ ok: !erro, saida: saida || (erro ? String(erro.message) : "") });
      });
  });

const discoDeVerdade: Disco = {
  escrever: (c, t) => writeFile(c, t, "utf8"),
  lerTexto: (c) => readFile(c, "utf8"),
  lerBase64: async (c) => (await readFile(c)).toString("base64"),
};

export async function POST(req: Request) {
  const userId = await studioUid();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // `ai-heavy`: queima cota de modelo E roda três processos de CAD. Não é um balde leve.
  const rl = await guard(req, "studio-cad", "ai-heavy");
  if (!rl.ok) return rl.response;

  const body = await req.json().catch(() => ({}) as any);
  const spaceId: string | undefined = typeof body.spaceId === "string" ? body.spaceId : undefined;
  let tema: string = typeof body.topic === "string" ? body.topic.trim() : "";

  // Sem tópico explícito, o TÍTULO do estudo em foco — nunca o conteúdo. Peça se descreve por nome;
  // texto corrido só daria ao modelo um parágrafo pra interpretar como se fosse especificação.
  if (!tema && spaceId) {
    const ctx = await loadStudyContext({ ownerId: userId, spaceId });
    tema = (ctx.title || "").trim();
  }
  if (!tema) return NextResponse.json({ error: "Diga qual peça você quer." }, { status: 400 });

  // 503 e não 404, de propósito: é o SERVIDOR que está sem o kernel, não a peça que não existe.
  // Confundir os dois faria o aluno achar que o pedido dele é que estava errado.
  if (!existsSync(CAMINHO_BIN_SOLIDCRAFT)) {
    return NextResponse.json({ error: "O kernel CAD não está disponível neste servidor." }, { status: 503 });
  }

  let bruto: unknown;
  try {
    bruto = await gerarJson<unknown>({
      system: SYSTEM_ROTEIRO,
      user: userRoteiro(tema),
      json: true,
      temperature: 0.2,          // roteiro é especificação, não redação: variedade aqui só erra mais
      timeoutMs: 60_000,
      // O consumo entra no TokenLedger na conta do EIFFEL, não da Aura: é a peça dele que custa.
      ctx: { agentKey: "eiffel", surface: "estudos", userId },
    });
  } catch {
    return NextResponse.json({ error: "Não consegui escrever o roteiro da peça agora." }, { status: 502 });
  }

  const lido = lerScript(bruto);
  if (!lido.ok) return NextResponse.json({ error: lido.motivo, code: "roteiro_invalido" }, { status: 422 });

  const pasta = `${RAIZ_CAD}/${userId.slice(0, 12)}-${randomUUID().slice(0, 8)}`;
  try {
    await mkdir(pasta, { recursive: true });
    const r = await construirPeca(lido.script, { correr: correrDeVerdade, disco: discoDeVerdade, pasta });
    if (!r.ok) return NextResponse.json({ error: r.motivo, code: r.code }, { status: 422 });

    const art = await prisma.studioArtifact.create({
      data: {
        ownerId: userId,
        sourceIds: [],
        kind: "cad",
        status: "done",
        mime: "model/step",
        title: tituloDaPeca(tema),
        meta: {
          titulo: tituloDaPeca(tema),
          // O ROTEIRO é o artefato canônico — pequeno, diffável, reconstrói a peça inteira.
          script: lido.script,
          png: r.peca.png,
          ...(r.peca.step ? { step: r.peca.step } : {}),
          ...(r.peca.gltf ? { gltf: r.peca.gltf } : {}),
          ...(r.peca.volumeMm3 !== undefined ? { volumeMm3: r.peca.volumeMm3 } : {}),
          fonte: "SolidCraft (tangency-labs, MIT/Apache-2.0)",
        } as any,
      },
    });
    return NextResponse.json(art);
  } finally {
    // A pasta é descartável por desenho: o roteiro guardado no artefato reconstrói tudo.
    await rm(pasta, { recursive: true, force: true }).catch(() => {});
  }
}
