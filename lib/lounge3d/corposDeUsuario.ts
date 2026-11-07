/**
 * O CORPO PRÓPRIO de cada usuário (e quem é da tripulação da nave) no cyberespaço (um VRM feito sob medida — lib/cyber/estiloAvatar CORPOS_DE_JOGADOR),
 * decidido no SERVIDOR pelo id da conta (como o `fundador`): o cliente só recebe o id do corpo e o pinta. Por id e
 * não por e-mail: nada de dado pessoal no código.
 */
import { ehAdminDoMapa } from "@/lib/cyber/adminMapa";

export const CORPO_POR_USUARIO: Readonly<Record<string, string>> = {
  "6aca9995a2cd0932105a06a8": "giulia",
};
export const corpoDoUsuario = (userId: string): string | undefined => CORPO_POR_USUARIO[userId];

/**
 * A TRIPULAÇÃO DA NAVE, por ENV e nunca por código: `NAVE_TRIPULACAO="a@x.com,b@y.com"`.
 *
 * Histórico, porque isto já foi e voltou e o próximo a ler merece saber: a tripulação existia, foi
 * ABOLIDA a pedido do dono (out/2026, "só eu"), e VOLTOU a pedido dele (nov/2026) — ele precisa
 * percorrer o produto com uma conta de ALUNO e ainda assim embarcar, para avaliar a experiência de
 * dentro da nave sem ser fundador. Antes disto a nave era inalcançável fora da conta do dono, e o
 * cabeçalho da rota de acesso ainda citava uma `TRIPULACAO_DA_NAVE` que não existia em lugar nenhum.
 *
 * POR ENV por dois motivos: o cabeçalho deste módulo manda não pôr dado pessoal no código, e trocar
 * quem embarca não deve exigir deploy. Lida a cada chamada (não no import) pra o teste poder mexer.
 * Lista VAZIA — o padrão — é exatamente o comportamento de antes: só o dono pilota.
 */
export function ehTripulacaoDaNave(email?: string | null, env: Record<string, string | undefined> = process.env): boolean {
  const e = (email ?? "").trim().toLowerCase();
  if (!e) return false;
  return (env.NAVE_TRIPULACAO || "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean).includes(e);
}

/** quem PILOTA a nave-QG (e se teleporta pra dentro dela com o M — components/cyber/PortalViagem):
 *  o dono do mapa OU a tripulação. Pelo e-mail, decidido no servidor — o cliente só recebe o booleano. */
export const pilotaANave = (email: string | null | undefined, env?: Record<string, string | undefined>): boolean =>
  ehAdminDoMapa(email) || ehTripulacaoDaNave(email, env);
