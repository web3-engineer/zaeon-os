/**
 * /api/rea/dominios — os domínios que a pessoa declarou sob o Termo de Uso do REA (lib/rea/termo.ts, lib/rea/dominios.ts).
 *   GET    → { termo: { titulo, versao, hash, texto }, finalidades, dominios }
 *   POST   { dominio, finalidade, titular: true, aceite: { versao, hash } } → { dominio }   (grava a PROVA do aceite)
 *   DELETE ?dominio=… → { ok }                                                              (revoga; a prova fica)
 * Identidade (userId/email), IP e navegador vêm SEMPRE do servidor — nunca do corpo.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth";
import { guard } from "@/src/lib/ratelimit";
import { FINALIDADES, MENSAGEM_ERRO_DOMINIO, TERMO_HASH, TERMO_TEXTO, TERMO_TITULO, TERMO_VERSAO } from "@/lib/rea/termo";
import { declararDominio, ipDoPedido, listarDominios, revogarDominio } from "@/lib/rea/dominios";

async function quem() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) return null;
  return { userId: String((session!.user as { id?: string }).id ?? email), email };
}

const ERROS: Record<string, string> = {
  ...MENSAGEM_ERRO_DOMINIO,
  titular_obrigatorio: "Você precisa declarar que é o titular do domínio (ou tem autorização expressa e por escrito do titular).",
  finalidade_invalida: "Escolha a finalidade.",
  termo_desatualizado: "O termo mudou. Recarregue a página e leia a versão atual antes de aceitar.",
  limite_de_dominios: "Você chegou ao limite de 20 domínios ativos. Revogue algum antes de declarar outro.",
};

export async function GET() {
  const q = await quem(); if (!q) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({
    termo: { titulo: TERMO_TITULO, versao: TERMO_VERSAO, hash: TERMO_HASH, texto: TERMO_TEXTO },
    finalidades: FINALIDADES,
    dominios: await listarDominios(q.userId),
  });
}

export async function POST(req: Request) {
  const g = await guard(req, "rea-dominios", "ai-light"); if (!g.ok) return g.response;
  const q = await quem(); if (!q) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const corpo = await req.json().catch(() => ({}));
  const r = await declararDominio(
    { ...q, ip: ipDoPedido(req), userAgent: req.headers.get("user-agent") },
    { dominio: corpo?.dominio, finalidade: corpo?.finalidade, titular: corpo?.titular, aceite: corpo?.aceite },
  );
  if (!r.ok) return NextResponse.json({ error: ERROS[r.erro] ?? r.erro, codigo: r.erro }, { status: r.erro === "termo_desatualizado" ? 409 : 400 });
  return NextResponse.json({ dominio: r.dominio });
}

export async function DELETE(req: Request) {
  const q = await quem(); if (!q) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const dominio = new URL(req.url).searchParams.get("dominio") ?? "";
  return NextResponse.json({ ok: await revogarDominio(q.userId, dominio) });
}
