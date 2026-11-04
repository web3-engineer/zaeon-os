/**
 * #686: o código de 6 números que o login por e-mail pede. Antes bastava digitar um e-mail para entrar na conta da pessoa.
 *
 * Guarda só o RESUMO do código (com o NEXTAUTH_SECRET), nunca o número. Um código por e-mail: pedir outro troca o anterior.
 * Vale 10 min, uma vez só, e cai depois de 5 tentativas erradas. Entre um envio e outro, 60 s; no máximo 5 envios por hora.
 * A coleção (`login_codes`) é do Mongo direto, como os `users` do login — não precisa de `prisma db push`.
 */
import { createHash, randomInt } from "crypto";
import { emailValido } from "./emailLogin";
export { emailValido, limparEmail } from "./emailLogin";

export const VALIDADE_MS = 10 * 60_000;
export const ESPERA_REENVIO_MS = 60_000;
export const MAX_TENTATIVAS = 5;
export const MAX_ENVIOS_HORA = 5;
const HORA = 3_600_000;

type Doc = { email: string; hash?: string; expiraEm?: Date; tentativas?: number; envios?: Date[] };
/** o pedaço da coleção do Mongo que isto usa (injetável nos testes) */
export type ColecaoCodigos = {
  findOne(f: { email: string }): Promise<Doc | null>;
  updateOne(f: Record<string, unknown>, u: Record<string, unknown>, o?: { upsert?: boolean }): Promise<{ modifiedCount: number }>;
};


export const resumoDoCodigo = (email: string, codigo: string) =>
  createHash("sha256").update(`${process.env.NEXTAUTH_SECRET ?? ""}:login:${email}:${codigo}`).digest("hex");
export const novoCodigo = () => String(randomInt(0, 1_000_000)).padStart(6, "0");

export type Preparo = { ok: true; codigo: string } | { ok: false; motivo: "espera" | "limite"; esperaS: number };

/** gera e guarda um código novo — ou diz quanto falta para poder pedir outro */
export async function prepararCodigo(c: ColecaoCodigos, email: string, agora = Date.now(), gerar = novoCodigo): Promise<Preparo> {
  const doc = await c.findOne({ email });
  const envios = (doc?.envios ?? []).map((d) => new Date(d).getTime()).filter((t) => agora - t < HORA);
  const ultimo = envios.length ? Math.max(...envios) : 0;
  if (ultimo && agora - ultimo < ESPERA_REENVIO_MS) return { ok: false, motivo: "espera", esperaS: Math.ceil((ultimo + ESPERA_REENVIO_MS - agora) / 1000) };
  if (envios.length >= MAX_ENVIOS_HORA) return { ok: false, motivo: "limite", esperaS: Math.ceil((Math.min(...envios) + HORA - agora) / 1000) };
  const codigo = gerar();
  await c.updateOne({ email }, { $set: { email, hash: resumoDoCodigo(email, codigo), expiraEm: new Date(agora + VALIDADE_MS), tentativas: 0, envios: [...envios, agora].map((t) => new Date(t)) } }, { upsert: true });
  return { ok: true, codigo };
}

/** confere e GASTA o código: o certo, dentro do prazo e das tentativas, vale uma vez só (atômico — duas abas não entram as duas) */
export async function conferirCodigo(c: ColecaoCodigos, email: string, codigo: string, agora = Date.now()): Promise<boolean> {
  if (!emailValido(email) || !/^\d{6}$/.test(codigo)) return false;
  const gastou = await c.updateOne(
    { email, hash: resumoDoCodigo(email, codigo), tentativas: { $lt: MAX_TENTATIVAS }, expiraEm: { $gt: new Date(agora) } },
    { $unset: { hash: "" } },
  );
  if (gastou.modifiedCount === 1) return true;
  await c.updateOne({ email, hash: { $exists: true } }, { $inc: { tentativas: 1 } });
  return false;
}

/** a coleção de verdade */
export async function colecaoCodigos(): Promise<ColecaoCodigos> {
  const { clientPromise } = await import("@/src/lib/db");
  return (await clientPromise).db().collection("login_codes") as unknown as ColecaoCodigos;
}
