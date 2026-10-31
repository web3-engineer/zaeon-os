/**
 * /api/admin/canais/posts (founder-only, flag NEXT_PUBLIC_AGENTS_ADMIN) — a FILA DE APROVAÇÃO (F2).
 *   GET  ?estado=&rede=&limite= : a fila, mais recentes primeiro, já com os avisos que o dono
 *        precisa ver ANTES de aprovar (vai truncar? tem PII?).
 *   POST { agentKey, rede, texto, midia?, fonteUrl? } : cria RASCUNHO. Nunca cria aprovado —
 *        criar e aprovar no mesmo passo seria burlar a própria trava que esta fase existe pra provar.
 *
 * Nada publica aqui. Publicar é POST /api/admin/canais/publicar.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { assertAdmin } from "@/lib/admin/assertAdmin";
import { agentsAdmin } from "@/lib/canal/flags";
import { REDES_SOCIAIS, LIMITE_TEXTO, ehRede, type Rede } from "@/lib/canais/tipos";
import { cabeNaRede, chaveDedupe, ehEstadoPost, motivoPiiNaAprovacao, textoFinalDe } from "@/lib/canais/fila";
import { diaBrt } from "@/lib/canais/politica";
import { vozDoRoster, vozes } from "@/lib/canais/vozes";

export const TEXTO_MAX = 5_000;   // acima do maior LIMITE_TEXTO: o corte por rede é no envio
export const MIDIA_MAX = 10;
export const LIMITE_PADRAO = 50;

export async function gate(): Promise<NextResponse | null> {
  if (!agentsAdmin()) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const a = await assertAdmin();
  if (!a.ok) return NextResponse.json({ error: a.status === 401 ? "Unauthorized" : "Forbidden" }, { status: a.status });
  return null;
}

/** Só as redes institucionais entram na fila: o WhatsApp tem o caminho dele em lib/whatsapp. */
const redeDaFila = (v: unknown): Rede | null =>
  ehRede(v) && (REDES_SOCIAIS as readonly string[]).includes(v) ? v : null;

export async function GET(req: Request) {
  const g = await gate(); if (g) return g;
  const q = new URL(req.url).searchParams;
  const estado = q.get("estado");
  const rede = q.get("rede");
  const limite = Math.min(200, Math.max(1, Number(q.get("limite")) || LIMITE_PADRAO));

  const where: Record<string, unknown> = {};
  if (estado && ehEstadoPost(estado)) where.estado = estado;
  if (rede && redeDaFila(rede)) where.rede = rede;

  const [linhas, elenco] = await Promise.all([
    (prisma as any).agentPost?.findMany({ where, orderBy: { createdAt: "desc" }, take: limite }).catch(() => []) ?? [],
    vozes(prisma),
  ]);

  const posts = (linhas as any[]).map((p) => {
    const voz = vozDoRoster(elenco, p.agentKey);
    // Os dois avisos que o dono precisa ANTES de aprovar. Nenhum deles barra aqui — barrar é no envio.
    const avisoPii = voz ? motivoPiiNaAprovacao({ texto: p.texto, rede: p.rede }, voz) : null;
    return {
      id: p.id,
      agentKey: p.agentKey,
      assinaria: voz?.nome ?? null,
      rede: p.rede,
      estado: p.estado,
      texto: p.texto,
      previa: voz ? textoFinalDe({ texto: p.texto, rede: p.rede }, voz) : null,
      limiteTexto: LIMITE_TEXTO[p.rede as Rede] ?? null,
      vaiTruncar: voz ? !cabeNaRede({ texto: p.texto, rede: p.rede }, voz) : null,
      avisoPii,
      midia: p.midia ?? [],
      fonteUrl: p.fonteUrl ?? null,
      aprovadoPor: p.aprovadoPor ?? null,
      aprovadoEm: p.aprovadoEm ?? null,
      recusaMotivo: p.recusaMotivo ?? null,
      textoFinal: p.textoFinal ?? null,
      idExterno: p.idExterno ?? null,
      urlExterna: p.urlExterna ?? null,
      adapterUsado: p.adapterUsado ?? null,
      publicadoEm: p.publicadoEm ?? null,
      tentativas: p.tentativas ?? 0,
      ultimoErro: p.ultimoErro ?? null,
      classeErro: p.classeErro ?? null,
      criadoEm: p.createdAt ?? null,
    };
  });

  return NextResponse.json({ posts, redes: REDES_SOCIAIS });
}

export async function POST(req: Request) {
  const g = await gate(); if (g) return g;
  const a = await assertAdmin();
  const b = await req.json().catch(() => ({}));

  const rede = redeDaFila(b?.rede);
  if (!rede) return NextResponse.json({ error: `rede deve ser uma de: ${REDES_SOCIAIS.join(", ")}` }, { status: 400 });

  const agentKey = String(b?.agentKey ?? "").trim().toLowerCase();
  const voz = vozDoRoster(await vozes(prisma), agentKey);
  if (!voz) return NextResponse.json({ error: "agentKey não está no roster (ou está inativo)" }, { status: 400 });

  const texto = String(b?.texto ?? "").trim();
  if (!texto) return NextResponse.json({ error: "texto obrigatório" }, { status: 400 });
  if (texto.length > TEXTO_MAX) return NextResponse.json({ error: `texto acima de ${TEXTO_MAX} caracteres` }, { status: 400 });

  const midia = Array.isArray(b?.midia)
    ? b.midia.map((m: unknown) => String(m).trim()).filter((m: string) => /^https:\/\//.test(m)).slice(0, MIDIA_MAX)
    : [];
  const fonteUrl = typeof b?.fonteUrl === "string" && /^https:\/\//.test(b.fonteUrl.trim()) ? b.fonteUrl.trim() : null;

  // O rascunho nasce `rascunho`, sempre. PII não barra a CRIAÇÃO: o dono tem direito de ver o
  // rascunho e reescrever. A trava vale na aprovação (aviso) e no envio (bloqueio).
  const agora = new Date();
  const dedupeKey = chaveDedupe({ agentKey, rede, texto, dia: diaBrt(agora), sufixo: `admin:${agora.getTime()}` });

  try {
    const criado = await (prisma as any).agentPost.create({
      data: { agentKey, rede, texto, midia, fonteUrl, estado: "rascunho", dedupeKey, criadoPor: a.ok ? a.email : null },
    });
    return NextResponse.json({
      ok: true,
      id: criado.id,
      previa: textoFinalDe({ texto, rede }, voz),
      vaiTruncar: !cabeNaRede({ texto, rede }, voz),
      avisoPii: motivoPiiNaAprovacao({ texto, rede }, voz),
    }, { status: 201 });
  } catch (e: any) {
    if (String(e?.code) === "P2002") return NextResponse.json({ error: "rascunho idêntico já existe" }, { status: 409 });
    console.error("CANAIS POSTS:", e);
    return NextResponse.json({ error: "não deu pra criar o rascunho" }, { status: 500 });
  }
}
