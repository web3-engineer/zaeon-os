/**
 * lib/lounge3d/tipos.ts — vocabulário da SALA DE CO-WORKING 3D do Lounge (docs/HANDOFF_LOUNGE_COWORK_3D.md).
 * CLIENT-SAFE (zero import de servidor). A memória NÃO vive aqui (é o cérebro); a sala é um canvas
 * colaborativo: notas editáveis, artefatos, avatares que andam, chat efêmero.
 */

/** Flag de BUILD (NEXT_PUBLIC_*): precisa ser build-arg no Dockerfile/compose, senão "some" em prod. */
export const lounge3dOn = (): boolean => process.env.NEXT_PUBLIC_LOUNGE_3D === "1";

export const KIND_SALA = "lounge_canvas";
/** Teto de ocupantes por sala — aplicado NO SERVIDOR (auth do canal de presença). */
export const LIMITE_SALA = 5;

export const MAX_NOTAS = 200;
export const MAX_ARTEFATOS = 50;
export const MAX_TEXTO_NOTA = 1200;
export const MAX_TEXTO_CHAT = 400;
export const MAX_NOME = 40;
/** Difusão de posição (Hz) e tempo de interpolação dos remotos. */
export const POS_HZ = 12;
export const POS_HZ_FALLBACK = 4;

export type Presenca = {
  userId: string;
  name: string;
  color: string;      // accent do perfil (#rrggbb)
  x: number; z: number;
  facing: number;     // rad
  moving?: boolean;
  sit?: boolean;      // sentado na cadeira da própria base (cyberespaço)
  ts?: number;
};

export type NotaCanvas = {
  id: string;
  x: number; z: number;
  kind: "nota" | "do chat";
  src: string;        // quem/onde veio ("Você", "Aura", nome)
  text: string;
  autorId?: string;
  scopeId?: string;   // ponte chat→nota: a conversa de origem
};

export type ArtefatoTipo = "molecula" | "imagem";
export type ArtefatoCanvas = {
  id: string;
  type: ArtefatoTipo;
  x: number; z: number;
  data?: { titulo?: string; url?: string; preset?: string };
  autorId?: string;
};

export type ConteudoSala = { notes: NotaCanvas[]; artifacts: ArtefatoCanvas[] };

export type OpsSala = {
  upsertNotes?: unknown[]; removeNotes?: unknown[];
  upsertArtifacts?: unknown[]; removeArtifacts?: unknown[];
};

export type MensagemChat = { id: string; userId: string; name: string; color: string; texto: string; ts: number };

// ───────────── canal Pusher (presença) e eventos ─────────────
export const canalSala = (salaId: string) => `presence-lounge3d-${salaId}`;
export function salaIdDeCanal(channel: string): string | null {
  const m = /^presence-lounge3d-([a-f0-9]{24})$/i.exec(channel ?? "");
  return m ? m[1]! : null;
}
/** Posição: evento de CLIENTE (não passa pelo servidor; 12 Hz × 5 pessoas). Precisa de "client events" ligado no app Pusher. */
export const EV_POS_CLIENTE = "client-pos";
/** Posição via servidor (fallback quando client events não estão habilitados). */
export const EV_POS = "pos";
export const EV_CHAT = "chat";
export const EV_CONTEUDO = "conteudo";

/** Cor de accent determinística pelo userId (até o perfil ter campo próprio). */
export function corDoUsuario(userId: string): string {
  const PALETA = ["#4aa3ff", "#ff7fb0", "#5fd08a", "#ffbe54", "#b48cff", "#49d9d9", "#ff8a65"];
  let h = 0; for (let i = 0; i < userId.length; i++) h = (h * 31 + userId.charCodeAt(i)) | 0;
  return PALETA[Math.abs(h) % PALETA.length]!;
}
