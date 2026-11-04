/**
 * Real-time do Lounge colaborativo — reusa o Pusher já configurado no projeto
 * (mesmas envs do chat humano em /api/ai/chat/messages).
 *   - canal `collab-<docId>`  evento `doc-update`  → edição em grupo ao vivo
 *   - canal `user_<userId>`   evento `new-message` → notificação no chat (aceite)
 * Tudo "best-effort": se o Pusher falhar/estiver sem env, nunca derruba a rota.
 */
import Pusher from "pusher";

let _pusher: Pusher | null = null;

/** As quatro envs que o Pusher exige. Uma lista só, pra `getPusher` e o recibo não divergirem. */
const ENVS_PUSHER = ["PUSHER_APP_ID", "NEXT_PUBLIC_PUSHER_KEY", "PUSHER_SECRET", "NEXT_PUBLIC_PUSHER_CLUSTER"] as const;

/**
 * O RECIBO do tempo real: quais das quatro envs FALTAM — nunca o valor de nenhuma.
 *
 * Existe porque "a colaboração está no ar" e "a colaboração é instantânea" são afirmações
 * diferentes: sem as quatro, `getPusher()` devolve null, a feature funciona e cai no poll de 6 s, e
 * isso é invisível de fora. O `/api/health` publica isto e o recibo do deploy imprime — assim quem
 * liga as envs vê que chegaram, em vez de precisar confiar em quem as ligou.
 *
 * Devolve só os NOMES que faltam: nome de env não é segredo, valor é.
 */
export function pusherFaltando(env: Record<string, string | undefined> = process.env): string[] {
  return ENVS_PUSHER.filter((k) => !env[k]?.trim());
}

export function getPusher(): Pusher | null {
  if (_pusher) return _pusher;
  const { PUSHER_APP_ID, NEXT_PUBLIC_PUSHER_KEY, PUSHER_SECRET, NEXT_PUBLIC_PUSHER_CLUSTER } = process.env;
  if (!PUSHER_APP_ID || !NEXT_PUBLIC_PUSHER_KEY || !PUSHER_SECRET || !NEXT_PUBLIC_PUSHER_CLUSTER) return null;
  _pusher = new Pusher({
    appId: PUSHER_APP_ID,
    key: NEXT_PUBLIC_PUSHER_KEY,
    secret: PUSHER_SECRET,
    cluster: NEXT_PUBLIC_PUSHER_CLUSTER,
    useTLS: true,
  });
  return _pusher;
}

export async function triggerSafe(channel: string, event: string, payload: unknown): Promise<void> {
  try {
    const p = getPusher();
    if (!p) return;
    await p.trigger(channel, event, payload);
  } catch (e) {
    console.error("[collab] pusher trigger falhou:", e);
  }
}
