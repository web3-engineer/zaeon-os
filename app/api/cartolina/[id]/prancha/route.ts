/**
 * POST /api/cartolina/:id/prancha { cardId } → { card }
 * A Aura desenha a prancha do card (legenda/título = o assunto). Desenho bom → primitivas no
 * card. Não desenhável / desenho ruim → imagem (Imagen) guardada como StudioArtifact e ligada
 * ao card. Atrás de CARTOLINA_MEMORIA + CADERNO_ENABLED. Só quem ESCREVE no board.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { entrar, falha } from "@/lib/cartolina/route-auth";
import { getBoardForUser, patchBoard } from "@/lib/cartolina/store";
import { podeEscrever } from "@/lib/cartolina/access";
import { gerarPrancha } from "@/lib/harness/caderno/compile";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: Request, { params }: { params: { id: string } }) {
  if (process.env.CADERNO_ENABLED !== "1") return NextResponse.json({ error: "Not found" }, { status: 404 });
  const a = await entrar(req, "cartolina-prancha", "ai-heavy");
  if ("response" in a) return a.response;
  const body = await req.json().catch(() => ({}));
  const board = await getBoardForUser(params.id, a.userId);
  if (!board) return falha("not_found");
  if (!podeEscrever(board.papel)) return falha("forbidden");
  const card = board.cards.find((c) => c.id === body?.cardId && c.tipo === "prancha");
  if (!card) return falha("invalid");

  const tema = [card.titulo, card.legenda].filter(Boolean).join(" — ") || board.titulo;
  const { geminiJson } = await import("@/lib/scholar/gemini");
  const r = await gerarPrancha(tema, (s, u, o) => geminiJson(s, u, o));

  let novo = card;
  if (r.tipo === "desenho") {
    novo = { ...card, desenho: r.desenho };
  } else if (r.tipo === "imagem") {
    const { imagenAvailable, generateImage } = await import("@/lib/studio/imagen");
    if (!imagenAvailable()) return NextResponse.json({ error: "Não deu pra desenhar e a geração de imagem está indisponível." }, { status: 503 });
    const art = await prisma.studioArtifact.create({
      data: { ownerId: a.userId, sourceIds: [], kind: "image", status: "running", title: `Prancha — ${tema.slice(0, 60)}`, meta: { prompt: r.promptImagem } as any },
    });
    try {
      const img = await generateImage(r.promptImagem);
      if (!img) throw new Error("Imagen não retornou imagem");
      const ext = /jpe?g/i.test(img.mimeType) ? "jpg" : "png";
      const { writeStudioFile } = await import("@/lib/studio/storage");
      await writeStudioFile(art.id, ext, Buffer.from(img.data, "base64"));
      await prisma.studioArtifact.update({ where: { id: art.id }, data: { status: "done", mime: img.mimeType, storageRef: ext } });
      novo = { ...card, imagemId: art.id };
    } catch (e: any) {
      await prisma.studioArtifact.update({ where: { id: art.id }, data: { status: "error", error: String(e?.message ?? e).slice(0, 500) } }).catch(() => {});
      return NextResponse.json({ error: "Não consegui desenhar agora — tenta de novo." }, { status: 502 });
    }
  } else {
    return NextResponse.json({ error: "Não consegui desenhar agora — tenta de novo." }, { status: 502 });
  }

  const p = await patchBoard(params.id, a.userId, { upsert: [novo] });
  if (!p.ok) return falha(p.reason);
  return NextResponse.json({ card: p.board.cards.find((c) => c.id === card.id) ?? novo });
}
