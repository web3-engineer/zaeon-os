/**
 * /api/studio/molecule — estrutura molecular 3D a partir de um termo da conversa.
 *
 * Diferente dos outros artefatos do Studio, este NÃO é gerado por LLM: as coordenadas
 * vêm do PubChem (lib/studio/molecule.ts). O modelo entra no máximo pra traduzir o nome.
 * Num produto de educação essa fronteira é o produto: estrutura inventada é ficção com
 * cara de ciência.
 */
import { skinDaVitrine } from "@/lib/estudos/skinVitrine";
import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { guard } from "@/src/lib/ratelimit";
import { studioUid } from "@/lib/studio/auth";
import { loadStudyContext } from "@/lib/studio/content";
import { resolverMolecula } from "@/lib/studio/molecule";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const userId = await studioUid();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // PubChem é de graça e leve; mesmo assim entra no balde normal (não é "ai-heavy":
  // não queima cota de LLM, só a tradução eventual).
  const rl = await guard(req, "studio-molecule", "ai-light");
  if (!rl.ok) return rl.response;

  const body = await req.json().catch(() => ({} as any));
  const spaceId: string | undefined = typeof body.spaceId === "string" ? body.spaceId : undefined;
  let termo: string = typeof body.topic === "string" ? body.topic.trim() : "";

  // Sem tópico explícito, tenta o título do estudo em foco (não o conteúdo: molécula
  // se resolve por NOME, e texto corrido só confundiria a busca).
  if (!termo && spaceId) {
    const ctx = await loadStudyContext({ ownerId: userId, spaceId });
    termo = (ctx.title || "").trim();
  }
  if (!termo) return NextResponse.json({ error: "Diga qual molécula você quer ver." }, { status: 400 });

  const r = await resolverMolecula(termo);
  if (!r.ok) return NextResponse.json({ error: r.reason }, { status: 404 });

  const m = r.data;
  const title = `Molécula — ${m.termo}`;
  const art = await prisma.studioArtifact.create({
    data: {
      ownerId: userId,
      sourceIds: [],
      kind: "molecule", skin: skinDaVitrine({ kind: "molecule" }),
      status: "done",
      mime: "chemical/x-mdl-sdfile",
      title,
      meta: {
        cid: m.cid,
        termo: m.termo,
        nomeResolvido: m.nomeResolvido,
        formula: m.formula,
        peso: m.peso,
        iupac: m.iupac,
        smiles: m.smiles,
        sdf: m.sdf,
        tridimensional: m.tridimensional,
        url: m.url,
        fonte: "PubChem (NCBI)",
      } as any,
    },
  });

  return NextResponse.json(art);
}
