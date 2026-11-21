/**
 * /api/canal/[id]/agenda — a agenda semanal do escritório (#396). Regras em lib/canal/agenda.ts.
 *   GET                         → blocos do canal + pessoas (nome/foto). Quem pode LER o canal vê tudo.
 *   POST { dia, inicio, fim }   → marca o MEU horário (JUNTA com os meus que se sobrepõem ou encostam no mesmo dia).
 *   POST { dia, de, ate }       → #850: o mesmo, em minutos (7h30 = 450), de 15 em 15.
 *        + substitui: [ids]     → #850 (janelinha do bloco): apaga esses blocos MEUS antes — é assim que diminui/move.
 *   DELETE ?bloco=<id>[&bloco=…] → apaga blocos MEUS (#850: vários de uma vez — a faixa inteira); de outra pessoa → 403.
 * Author gate igual ao resto do canal (lib/canal/gate). Flag NEXT_PUBLIC_ESCRITORIO_COWORK (404 desligada).
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma, sessaoUsuario, exigirFlag, isObjectId, pessoas, type Usuario } from "@/lib/canal/server";
import { podeLer, podeEscrever } from "@/lib/canal/gate";
import { normalizarBloco, blocoDeMinutos, aplicarBloco, type Bloco, type Dia } from "@/lib/canal/agenda";
import { EV_AGENDA, publicarPusher } from "@/lib/canal/realtime";
import { ehConviteDeConversa } from "@/lib/canal/convite";

/** Teto de blocos por pessoa por canal (anti-spam; uma semana cheia de manhã+tarde cabe folgado). */
export const MAX_BLOCOS_POR_PESSOA = 40;

type Ctx = { params: { id: string } };
type Linha = { id: string; canalId: string; userId: string; dia: number; inicio: number; fim: number; de?: number | null; ate?: number | null };
const paraBloco = (b: Linha): Bloco & { id: string } => ({
  id: b.id, userId: b.userId, dia: b.dia as Dia, inicio: b.inicio, fim: b.fim,
  ...(typeof b.de === "number" && typeof b.ate === "number" ? { de: b.de, ate: b.ate } : {}),
});
const ehId = (v: unknown): v is string => typeof v === "string" && isObjectId(v);

type CanalLinha = NonNullable<Awaited<ReturnType<typeof prisma.canal.findUnique>>>;
type Carregado = { ok: false; resp: NextResponse } | { ok: true; u: Usuario; canal: CanalLinha };

/** Flag, sessão, id e canal — o começo comum das três rotas. */
async function carregar(params: Ctx["params"]): Promise<Carregado> {
  const off = exigirFlag(); if (off) return { ok: false, resp: off };
  const u = await sessaoUsuario();
  if (!u) return { ok: false, resp: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  if (!isObjectId(params.id)) return { ok: false, resp: NextResponse.json({ error: "Not found" }, { status: 404 }) };
  const canal = await prisma.canal.findUnique({ where: { id: params.id } });
  if (!canal) return { ok: false, resp: NextResponse.json({ error: "Not found" }, { status: 404 }) };
  return { ok: true, u, canal };
}

export async function GET(_req: Request, { params }: Ctx): Promise<NextResponse> {
  const c = await carregar(params); if (!c.ok) return c.resp;
  const { u, canal } = c;
  if (!podeLer(canal, u.id)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const linhas: Linha[] = await prisma.agendaBloco.findMany({ where: { canalId: canal.id }, orderBy: [{ dia: "asc" }, { inicio: "asc" }] });
  const gente = await pessoas(linhas.map((l) => l.userId));
  return NextResponse.json({ eu: u.id, blocos: linhas.map(paraBloco), pessoas: [...gente.values()], contatos: await meusContatos(u.id) });
}

/**
 * #861 PR 2: o filtro "Meus contatos" da agenda — quem tem um convite de CONTATO aceito comigo, em qualquer direção
 * (convite pra uma conversa não conta: lib/canal/convite `ehConviteDeConversa`). Só ids; se falhar, a agenda abre
 * do mesmo jeito (o filtro só fica vazio).
 */
async function meusContatos(eu: string): Promise<string[]> {
  type C = { deId: string; paraId: string; canalId?: string | null };
  let cs: C[] = [];
  try {
    cs = await prisma.canalConvite.findMany({
      where: { status: "aceito", OR: [{ deId: eu }, { paraId: eu }] },
      select: { deId: true, paraId: true, canalId: true },
      take: 500,
    });
  } catch { return []; }
  return [...new Set(cs.filter((c) => !ehConviteDeConversa(c)).map((c) => (c.deId === eu ? c.paraId : c.deId)))];
}

export async function POST(req: Request, { params }: Ctx): Promise<NextResponse> {
  const c = await carregar(params); if (!c.ok) return c.resp;
  const { u, canal } = c;
  if (!podeEscrever(canal, u.id)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const norm = body?.de !== undefined || body?.ate !== undefined
    ? blocoDeMinutos(body?.dia, body?.de, body?.ate)
    : normalizarBloco(body?.dia, body?.inicio, body?.fim);
  if (!norm) return NextResponse.json({ error: "Horário inválido." }, { status: 400 });
  // janelinha do bloco: os pedaços que a pessoa está editando saem antes (só os DELA, deste canal)
  const substitui: string[] = Array.isArray(body?.substitui) ? body.substitui.filter(ehId).slice(0, MAX_BLOCOS_POR_PESSOA) : [];

  const todosMeus: Linha[] = await prisma.agendaBloco.findMany({ where: { canalId: canal.id, userId: u.id } });
  // a janelinha ficou velha (o bloco foi apagado/mudado noutra aba): recusa em vez de recriar o que já saiu
  if (substitui.some((id) => !todosMeus.some((m) => m.id === id))) {
    return NextResponse.json({ error: "Esse horário mudou. Abra de novo e tente outra vez." }, { status: 409 });
  }
  const meus = todosMeus.filter((m) => !substitui.includes(m.id));
  // <Bloco>: o bloco novo ainda não tem id (só ganha ao ser criado); os antigos têm.
  const { removidos, blocos: depois } = aplicarBloco<Bloco>(meus.map(paraBloco), { userId: u.id, ...norm });
  // tudo checado ANTES de apagar qualquer coisa: se recusar, a agenda antiga fica como estava
  if (meus.length - removidos.length >= MAX_BLOCOS_POR_PESSOA) {
    return NextResponse.json({ error: `Máximo de ${MAX_BLOCOS_POR_PESSOA} horários por pessoa neste escritório.` }, { status: 400 });
  }
  const saem = [...substitui, ...removidos.map((r) => r.id!)];
  const novo = depois[depois.length - 1]!;   // a UNIÃO (aplicarBloco junta o que encosta)
  // apagar os antigos e criar a união juntos: ou acontece tudo, ou nada
  const [, criado] = await prisma.$transaction([
    prisma.agendaBloco.deleteMany({ where: { id: { in: saem }, userId: u.id, canalId: canal.id } }),
    prisma.agendaBloco.create({
      data: {
        canalId: canal.id, userId: u.id, dia: novo.dia, inicio: novo.inicio, fim: novo.fim,
        ...(novo.de !== undefined && novo.ate !== undefined ? { de: novo.de, ate: novo.ate } : {}),
      },
    }),
  ]);
  // já gravou: se o aviso em tempo real falhar, a resposta continua sendo sucesso (os outros veem no próximo carregamento)
  await publicarPusher(canal.id, EV_AGENDA, { canalId: canal.id }).catch(() => {});
  return NextResponse.json({ bloco: paraBloco(criado as Linha), removidos: saem }, { status: 201 });
}

export async function DELETE(req: Request, { params }: Ctx): Promise<NextResponse> {
  const c = await carregar(params); if (!c.ok) return c.resp;
  const { u, canal } = c;
  if (!podeEscrever(canal, u.id)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const ids = [...new Set(new URL(req.url).searchParams.getAll("bloco"))].slice(0, MAX_BLOCOS_POR_PESSOA);
  if (!ids.length || !ids.every(ehId)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const achados: Linha[] = await Promise.all(ids.map((id) => prisma.agendaBloco.findUnique({ where: { id } }))).then((l) => l.filter(Boolean) as Linha[]);
  if (achados.length !== ids.length || achados.some((b) => b.canalId !== canal.id)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (achados.some((b) => b.userId !== u.id)) return NextResponse.json({ error: "Só dá pra apagar o seu próprio horário." }, { status: 403 });
  await prisma.agendaBloco.deleteMany({ where: { id: { in: ids }, userId: u.id, canalId: canal.id } });
  await publicarPusher(canal.id, EV_AGENDA, { canalId: canal.id });
  return NextResponse.json({ ok: true, apagados: ids.length });
}
