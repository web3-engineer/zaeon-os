/**
 * lib/chat/conversaShare.ts — cliente da porta de compartilhamento DA CONVERSA.
 *
 * O tipo `Convite` é o mesmo do documento (lib/tcc/client), e isso é de propósito: as duas portas
 * concedem o MESMO papel pelo MESMO trilho, então um tipo só evita que uma delas mude de forma e a
 * outra não perceba. O `escopo` continua vindo do servidor — é dele que a tela monta a frase que
 * diz o que o link concede.
 */
import type { Convite, PapelConvite } from "@/lib/tcc/client";

export type { Convite, PapelConvite };

async function json<T>(r: Response): Promise<T> {
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error((d as { error?: string })?.error || `HTTP ${r.status}`), { status: r.status });
  return d as T;
}

const enviar = (metodo: "POST" | "DELETE", body: unknown) =>
  fetch("/api/conversa/share", { method: metodo, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

export const conversaApi = {
  /** Link de convite desta conversa (só o dono). Padrão EDITOR: compartilhar é para colaborar. */
  compartilhar: (scopeId: string, papel: PapelConvite = "editor") =>
    enviar("POST", { scopeId, papel }).then((r) => json<Convite>(r)),
  /** Revoga TODOS os links. Quem já entrou continua membro — são ações diferentes. */
  revogar: (scopeId: string) => enviar("DELETE", { scopeId }).then((r) => json<{ ok: true }>(r)),
};
