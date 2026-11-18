/**
 * lib/skins/preferencia.ts — a skin ESCOLHIDA: no navegador (rápido, vale deslogado e sem piscar ao abrir) e na
 * conta (vale em qualquer aparelho; `UserSpaceData.settings.labSkin`, via /api/user/skin).
 * A skin só existe DENTRO do laboratório: quem a põe na tela é o components/skins/SkinDoLab.
 *
 * Quem manda quando os dois discordam: a ÚLTIMA escolha da pessoa. Por isso cada escolha fica marcada como
 * "pendente" até a conta confirmar — enquanto estiver pendente (deslogado, sem rede, erro), a conta não desfaz
 * o que a pessoa escolheu aqui; ao abrir o laboratório de novo, a escolha pendente sobe.
 */
import { SKIN_PADRAO, skinValida, type SkinId } from "@/lib/skins/paletas";

export const CHAVE_SKIN = "zaeon.lab.skin";
/** "1" enquanto a última escolha ainda não foi confirmada pela conta */
export const CHAVE_PENDENTE = "zaeon.lab.skin.pendente";
/** o instante da última escolha (qualquer aba): uma resposta da conta pedida ANTES dele está velha */
export const CHAVE_QUANDO = "zaeon.lab.skin.quando";
/** a skin deste navegador mudou — escolha ou adoção da conta (detail: SkinId) */
export const EVT_SKIN = "zaeon:lab:skin";
const ROTA = "/api/user/skin";

const ler = (k: string): string | null => { try { return localStorage.getItem(k); } catch { return null; } };
const gravar = (k: string, v: string | null) => { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch { /* sem storage */ } };
const avisar = (id: SkinId) => { try { window.dispatchEvent(new CustomEvent<SkinId>(EVT_SKIN, { detail: id })); } catch { /* sem janela */ } };

export const lerSkinLocal = (): SkinId => skinValida(ler(CHAVE_SKIN));
export const skinPendente = (): boolean => ler(CHAVE_PENDENTE) === "1";
const gravarSkinLocal = (id: SkinId) => gravar(CHAVE_SKIN, id === SKIN_PADRAO ? null : id);

/** põe (ou tira, no original) a marca da skin: no <html>, ou só no `alvo` quando o laboratório está embutido */
export function aplicarSkin(id: SkinId | null, alvo?: HTMLElement | null): void {
  if (typeof document === "undefined") return;
  const el = alvo ?? document.documentElement;
  if (!id || id === SKIN_PADRAO) delete el.dataset.skin; else el.dataset.skin = id;
}

// As gravações na conta saem UMA de cada vez e só a mais nova vale: duas escolhas seguidas não podem chegar
// fora de ordem e deixar a mais antiga salva.
let fila: Promise<unknown> = Promise.resolve();
let ultimoPedido = 0;

/** sobe a skin pra conta; `true` se a conta confirmou ESTA (a mais nova) escolha */
export function enviarSkin(id: SkinId): Promise<boolean> {
  const meu = ++ultimoPedido;
  const vez = fila.then(async () => {
    if (meu !== ultimoPedido) return false;   // já há uma escolha mais nova na fila: esta nem sai
    try {
      const r = await fetch(ROTA, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ skin: id }), keepalive: true });
      if (!r.ok) return false;
      if (meu === ultimoPedido && lerSkinLocal() === id) gravar(CHAVE_PENDENTE, null);
      return true;
    } catch { return false; }
  });
  fila = vez;
  return vez;
}

/** a escolha da pessoa (Configurações): vale na hora, fica no navegador e sobe pra conta (sem travar se falhar) */
export function escolherSkin(valor: unknown): SkinId {
  const id = skinValida(valor);
  gravarSkinLocal(id);
  gravar(CHAVE_PENDENTE, "1");
  gravar(CHAVE_QUANDO, String(Date.now()) + ":" + Math.random().toString(36).slice(2, 8));
  avisar(id);
  void enviarSkin(id);
  return id;
}

/** o que a CONTA diz; `null` = deslogado ou sem rede (aí vale o navegador). `salva=false`: nunca escolheu. */
export async function skinDaConta(): Promise<{ skin: SkinId; salva: boolean } | null> {
  try {
    const r = await fetch(ROTA, { cache: "no-store" });
    if (!r.ok) return null;
    const j = (await r.json()) as { skin?: unknown; salva?: boolean };
    return { skin: skinValida(j.skin), salva: j.salva === true };
  } catch { return null; }
}

/**
 * Ao abrir o laboratório: acerta navegador e conta.
 *  - há escolha pendente (feita deslogado, ou o envio falhou) → ela sobe; a conta NÃO a desfaz;
 *  - a pessoa escolheu enquanto a pergunta estava a caminho → a resposta está velha, ignora;
 *  - a conta nunca teve skin e este navegador tem uma → sobe a daqui;
 *  - senão, a conta manda (a pessoa escolheu noutro aparelho) → adota e avisa.
 * Devolve a skin adotada da conta, ou `null` se nada mudou aqui.
 */
export async function reconciliarComAConta(): Promise<SkinId | null> {
  const antes = ler(CHAVE_QUANDO);
  const conta = await skinDaConta();
  if (!conta) return null;
  if (ler(CHAVE_QUANDO) !== antes) return null;
  if (skinPendente()) { void enviarSkin(lerSkinLocal()); return null; }
  const local = lerSkinLocal();
  if (!conta.salva) { if (local !== SKIN_PADRAO) void enviarSkin(local); return null; }
  if (conta.skin === local) return null;
  gravarSkinLocal(conta.skin);
  avisar(conta.skin);
  return conta.skin;
}

/** só pros testes: zera a fila de envios */
export function __reiniciarSkins(): void { fila = Promise.resolve(); ultimoPedido = 0; }
