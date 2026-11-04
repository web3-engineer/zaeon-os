/**
 * lib/lounge3d/server.ts — helpers SERVER da sala 3D: sessão, sala por id com IDOR por `members[]`,
 * conteúdo lido/salvo no CollabDoc (kind lounge_canvas). Nada daqui vai pro cliente.
 */
import { regiaoDoUsuario, type Regiao } from "@/lib/cyber/regiaoUsuario";
import { corpoDoUsuario, pilotaANave } from "./corposDeUsuario";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";
import { lerConteudo } from "@/lib/lounge3d/sala";
import { isSuperAdmin } from "@/lib/auth/roles";
import { KIND_SALA, corDoUsuario, type ConteudoSala } from "@/lib/lounge3d/tipos";
import { lerPersonagem, type Personagem } from "@/lib/cyber/personagem";

export const OID = /^[a-f0-9]{24}$/i;

/**
 * As rotas da sala são do CYBERESPAÇO (/lounge-cosmico), que está em produção sem flag: elas sempre respondem.
 * O acesso continua protegido por sessão + `members[]` (IDOR → 404). `lounge3dOn()` agora só liga a aba Lounge 3D
 * da Sala de Pesquisa (UI), não as rotas.
 */
export function exigirFlag(): NextResponse | null {
  return null;
}

/**
 * `fundador` = dono da Zaeon (isSuperAdmin: allowlist + User.role); `novo` = NUNCA entrou no cyberespaço
 * (User.cyberNasceuEm vazio → nasce num tubo de ensaio) — decididos AQUI, no servidor; o cliente só pinta.
 */
export type Eu = { id: string; name: string; image: string | null; color: string; fundador: boolean; novo: boolean; /** as MOTOS liberadas (a entrega ao Droid aceita + o tutorial delas — User.cyberPerfil.motosLiberadasEm; o dono sempre) */ motos?: boolean; /** o corpo próprio (lib/lounge3d/corposDeUsuario) */ corpo?: string; /** pilota a nave-QG (o dono ou a tripulação) */ nave?: boolean; /** o PERSONAGEM escolhido (gênero + cor — lib/cyber/personagem); null = ainda não escolheu */ personagem?: Personagem | null; /** venceu o DUELO de linguagem da Examiner (a cúpula do Templo Cósmico abre — User.cyberPerfil.examinerInglesEm) */ examiner?: boolean; /** a REGIÃO real pelo perfil (país → instituição → cidade — lib/cyber/regiaoUsuario): a nave coworking em que se começa; null = o perfil não diz (o cliente tenta o fuso) */ regiao?: Regiao | null };
export async function eu(): Promise<Eu | null> {
  const s = await getServerSession(authOptions).catch(() => null);
  const email = s?.user?.email;
  if (!email) return null;
  const u = await prisma.user.findUnique({ where: { email }, select: { id: true, name: true, image: true, role: true, cyberNasceuEm: true, cyberPerfil: true, countryCode: true, city: true, institution: true } });
  const rg = u ? regiaoDoUsuario({ countryCode: u.countryCode, institution: u.institution, city: u.city }) : null;
  return u ? { id: u.id, name: (u.name || email.split("@")[0] || "Alguém").slice(0, 40), image: u.image ?? null, color: lerPersonagem(u.cyberPerfil)?.cor ?? corDoUsuario(u.id), fundador: isSuperAdmin({ email, role: u.role }), novo: !u.cyberNasceuEm, motos: pilotaANave(email) || !!(u.cyberPerfil as { motosLiberadasEm?: unknown } | null)?.motosLiberadasEm, corpo: corpoDoUsuario(u.id), nave: pilotaANave(email), personagem: lerPersonagem(u.cyberPerfil), examiner: !!(u.cyberPerfil as { examinerInglesEm?: unknown } | null)?.examinerInglesEm, regiao: rg && rg.fonte !== "padrao" ? rg.regiao : null } : null;
}

export type SalaRow = { id: string; ownerId: string; title: string; kind: string; content: string; members: string[]; token: string; updatedAt: Date };

/** A sala SÓ se sou membro — "não existe" e "sem acesso" são o mesmo null (404). */
export async function salaDoMembro(id: string, userId: string): Promise<SalaRow | null> {
  if (!OID.test(id)) return null;
  const doc = await prisma.collabDoc.findUnique({ where: { id } });
  if (!doc || doc.kind !== KIND_SALA || !doc.members.includes(userId)) return null;
  return doc as SalaRow;
}

export function viewSala(s: SalaRow, me: string) {
  return { id: s.id, title: s.title, ownerId: s.ownerId, isOwner: s.ownerId === me, members: s.members, token: s.ownerId === me ? s.token : null, conteudo: lerConteudo(s.content) as ConteudoSala, updatedAt: s.updatedAt.toISOString() };
}
