/**
 * POST /api/canal/[id]/mensagem { texto } — grava a mensagem humana, publica no Pusher e,
 * pra cada @agente conhecido, dispara UM turno do harness daquele agente (fila/inline).
 * Author gate: quem não pode escrever recebe 403 (IDOR coberto em teste).
 * Fatia 7 (CHORES_QUEUE=1): "@aura resume <url>" é CHORE (pool grátis, 1 mensagem com fonte), não
 * turno — triagem conservadora (lib/chore/triagem.ts): em dúvida, turno como sempre.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma, sessaoUsuario, exigirFlag, isObjectId, agentesDoCanal } from "@/lib/canal/server";
import { podeEscrever } from "@/lib/canal/gate";
import { montarAliases, parseMentions } from "@/lib/canal/mention";
import { EV_MENSAGEM, publicarPusher, type MensagemWire } from "@/lib/canal/realtime";
import { dispararTurnos, depsReais } from "@/lib/canal/queue";
import { pedidoDeChore } from "@/lib/chore/triagem";
import { choresLigadas, criarDoPedido } from "@/lib/chore/criar";

export const MAX_TEXTO = 4000;

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const off = exigirFlag(); if (off) return off;
  const u = await sessaoUsuario();
  if (!u) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isObjectId(params.id)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const canal = await prisma.canal.findUnique({ where: { id: params.id } });
  if (!canal) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!podeEscrever(canal, u.id)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const texto = String(body?.texto ?? "").trim();
  if (!texto) return NextResponse.json({ error: "Mensagem vazia." }, { status: 400 });
  if (texto.length > MAX_TEXTO) return NextResponse.json({ error: `Máximo de ${MAX_TEXTO} caracteres.` }, { status: 413 });

  const agentes = await agentesDoCanal(u.id, canal.agentes);
  const mencoes = parseMentions(texto, montarAliases(agentes.map((a) => ({ agentKey: a.agentKey, nome: a.nome }))));

  const row = await prisma.canalMensagem.create({ data: { canalId: canal.id, autorTipo: "humano", autorId: u.id, texto, mencoes } });
  // agente convocado passa a "estar" no canal (aparece na presença/seletor pra todo mundo)
  const novos = mencoes.filter((k) => !canal.agentes.includes(k));
  const touch = novos.length ? { agentes: [...canal.agentes, ...novos], updatedAt: new Date() } : { updatedAt: new Date() };
  await prisma.canal.update({ where: { id: canal.id }, data: touch }).catch(() => undefined);

  const wire: MensagemWire = {
    id: row.id, canalId: row.canalId, autorTipo: "humano", autorId: u.id, texto, mencoes,
    createdAt: row.createdAt.toISOString(), autorNome: u.name || "Alguém", autorAvatar: u.image ?? null,
  };
  await publicarPusher(canal.id, EV_MENSAGEM, wire);

  // Chore em vez de turno: 1 por mensagem, do 1º agente mencionado, na thread desta mensagem.
  const pedido = mencoes.length && choresLigadas() ? pedidoDeChore(texto) : null;
  if (pedido) {
    const { dispararChore } = await import("@/lib/queue/chores");
    const r = await criarDoPedido(prisma as any, { tipo: pedido.tipo, alvo: { url: pedido.url }, agentKey: mencoes[0], canalId: canal.id, parentId: row.id, requesterId: u.id });
    if (!("erro" in r)) {
      const via = r.row.status === "queued" ? await dispararChore(r.row) : "existente";
      return NextResponse.json({ ok: true, mensagem: wire, turnos: [], chore: { id: r.row.id, tipo: r.row.tipo, agentKey: r.row.agentKey, via } }, { status: 201 });
    }
  }

  const vias = await dispararTurnos(
    mencoes.map((agentKey) => ({ canalId: canal.id, agentKey, userId: u.id, mensagemId: row.id })),
    depsReais,
  );
  return NextResponse.json({ ok: true, mensagem: wire, turnos: mencoes.map((agentKey, i) => ({ agentKey, via: vias[i] })) }, { status: 201 });
}
