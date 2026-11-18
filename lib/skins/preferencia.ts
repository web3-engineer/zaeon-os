/**
 * lib/skins/preferencia.ts — a skin ESCOLHIDA: no navegador (rápido, vale deslogado e sem piscar ao abrir) e na
 * conta (vale em qualquer aparelho; `UserSpaceData.settings.labSkin`, via /api/user/skin).
 * A skin só existe DENTRO do laboratório: quem a põe na tela é o components/skins/SkinDoLab.
 */
import { SKIN_PADRAO, skinValida, type SkinId } from "@/lib/skins/paletas";

export const CHAVE_SKIN = "zaeon.lab.skin";
/** a skin mudou nesta aba (detail: SkinId) — o laboratório aberto troca na hora */
export const EVT_SKIN = "zaeon:lab:skin";
const ROTA = "/api/user/skin";

export function lerSkinLocal(): SkinId {
  try { return skinValida(localStorage.getItem(CHAVE_SKIN)); } catch { return SKIN_PADRAO; }
}

function gravarSkinLocal(id: SkinId): void {
  try { if (id === SKIN_PADRAO) localStorage.removeItem(CHAVE_SKIN); else localStorage.setItem(CHAVE_SKIN, id); } catch { /* sem storage */ }
}

/** põe (ou tira, no original) a marca da skin no <html>: as variáveis de cor mudam junto */
export function aplicarSkin(id: SkinId | null): void {
  if (typeof document === "undefined") return;
  const raiz = document.documentElement;
  if (!id || id === SKIN_PADRAO) delete raiz.dataset.skin; else raiz.dataset.skin = id;
}

/** a escolha da pessoa (Configurações): vale na hora, fica no navegador e sobe pra conta (sem travar se falhar) */
export function escolherSkin(valor: unknown): SkinId {
  const id = skinValida(valor);
  gravarSkinLocal(id);
  try { window.dispatchEvent(new CustomEvent<SkinId>(EVT_SKIN, { detail: id })); } catch { /* sem janela */ }
  try {
    void fetch(ROTA, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ skin: id }), keepalive: true }).catch(() => {});
  } catch { /* sem rede */ }
  return id;
}

/** o que a CONTA diz; `null` = deslogado, sem escolha salva ou sem rede (aí vale o navegador) */
export async function skinDaConta(): Promise<SkinId | null> {
  try {
    const r = await fetch(ROTA, { cache: "no-store" });
    if (!r.ok) return null;
    const j = (await r.json()) as { skin?: unknown; salva?: boolean };
    return j.salva ? skinValida(j.skin) : null;
  } catch { return null; }
}

/** a conta respondeu: ela manda (a pessoa escolheu noutro aparelho) — guarda aqui sem reenviar */
export function adotarSkinDaConta(id: SkinId): void { gravarSkinLocal(id); }
