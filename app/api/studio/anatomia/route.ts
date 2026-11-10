/**
 * /api/studio/anatomia — estrutura anatômica 3D a partir de um termo (ou da pergunta) da conversa.
 *
 * Como o `/api/studio/molecule`, e pelo mesmo motivo de produto: este artefato NÃO é gerado por LLM.
 * As malhas e os nomes vêm do BodyParts3D (CC BY 4.0), lido do disco por `lib/anatomia/carregar`, e a
 * cena é montada por `cenaDoConceito`, que é pura. Num produto de educação essa fronteira é o produto:
 * anatomia inventada é ficção com cara de medicina.
 *
 * E ele é mais barato que o molecule: nem rede tem. Nenhuma chamada sai desta rota.
 *
 * O payload é o `EstadoCena`, não uma imagem — ver o cabeçalho de `lib/anatomia/cena-do-conceito` para
 * o porquê (resumo: o atlas não tem pipeline de captura, e o visualizador do cliente desenha a partir
 * do estado, então o PNG seria custo sem ganho).
 */
import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { guard } from "@/src/lib/ratelimit";
import { studioUid } from "@/lib/studio/auth";
import { loadStudyContext } from "@/lib/studio/content";
import { atlasDisponivel, carregarAtlas } from "@/lib/anatomia/carregar";
import { cenaDoConceito } from "@/lib/anatomia/cena-do-conceito";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const userId = await studioUid();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Balde leve: não queima cota de LLM e não faz rede. Entra no balde de qualquer forma porque ler o
  // atlas do disco não é de graça (é um JSON de 1,3 MB) e a rota é pública para quem está logado.
  const rl = await guard(req, "studio-anatomia", "ai-light");
  if (!rl.ok) return rl.response;

  const body = await req.json().catch(() => ({}) as any);
  const spaceId: string | undefined = typeof body.spaceId === "string" ? body.spaceId : undefined;
  let termo: string = typeof body.topic === "string" ? body.topic.trim() : "";

  // Sem tópico explícito, tenta o TÍTULO do estudo em foco — nunca o conteúdo. Estrutura anatômica se
  // resolve por nome, e texto corrido só daria à busca uma frase longa sem termo dentro.
  if (!termo && spaceId) {
    const ctx = await loadStudyContext({ ownerId: userId, spaceId });
    termo = (ctx.title || "").trim();
  }
  if (!termo) return NextResponse.json({ error: "Diga qual estrutura você quer ver." }, { status: 400 });

  // `atlas_indisponivel` é 503 e não 404 de propósito: é o SERVIDOR que está sem o dado (imagem sem o
  // manifesto, volume não montado), não a estrutura que não existe. Confundir os dois faria o aluno
  // achar que o corpo humano não tem pulmão.
  if (!atlasDisponivel()) {
    return NextResponse.json({ error: "O atlas de anatomia não está disponível neste servidor." }, { status: 503 });
  }
  const atlas = carregarAtlas();
  if (!atlas) {
    return NextResponse.json({ error: "O atlas de anatomia não está disponível neste servidor." }, { status: 503 });
  }

  const r = cenaDoConceito(atlas, termo);
  // As ALTERNATIVAS viajam com a recusa: é assim que o aluno descobre o nome certo da peça em vez
  // de só ouvir "não achei". Nomes vindos do atlas, nunca inventados.
  if (!r.ok) {
    return NextResponse.json(
      { error: r.motivo, code: r.code, ...(r.alternativas?.length ? { alternativas: r.alternativas } : {}) },
      { status: 404 },
    );
  }

  const d = r.dados;
  const art = await prisma.studioArtifact.create({
    data: {
      ownerId: userId,
      sourceIds: [],
      kind: "anatomia",
      status: "done",
      // Não há arquivo: o artefato É o estado. `application/json` é o que ele é.
      mime: "application/json",
      title: `Anatomia — ${d.conceito.nome}`,
      meta: {
        conceito: d.conceito,
        estado: d.estado,
        sistemas: d.sistemas,
        sistemasIds: d.sistemasIds,
        pecas: d.pecas,
        explicacao: d.explicacao,
        termoBuscado: d.termoBuscado,
        viaSinonimo: d.viaSinonimo,
        alternativas: d.alternativas,
        fonte: d.fonte,
        aviso: d.aviso,
      } as any,
    },
  });

  return NextResponse.json(art);
}
