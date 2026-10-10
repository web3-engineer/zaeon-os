/**
 * lib/lounge3d/tipos.ts — vocabulário da SALA DE CO-WORKING 3D do Lounge (docs/HANDOFF_LOUNGE_COWORK_3D.md).
 * CLIENT-SAFE (zero import de servidor). A memória NÃO vive aqui (é o cérebro); a sala é um canvas
 * colaborativo: notas editáveis, artefatos, avatares que andam, chat efêmero.
 */
import type { SomLounge } from "./musica";

/** Flag de BUILD (NEXT_PUBLIC_*): precisa ser build-arg no Dockerfile/compose, senão "some" em prod. */
export const lounge3dOn = (): boolean => process.env.NEXT_PUBLIC_LOUNGE_3D === "1";

export const KIND_SALA = "lounge_canvas";
/** Teto de ocupantes por sala — aplicado NO SERVIDOR (auth do canal de presença). */
export const LIMITE_SALA = 5;

export const MAX_NOTAS = 200;
export const MAX_ARTEFATOS = 50;
export const MAX_TEXTO_NOTA = 1200;
export const MAX_TEXTO_CHAT = 400;
/** RECADO do dono (Zaeon) pro QG do Andrei: aparece num holograma ao lado da tela de trabalho dele */
export const MAX_TEXTO_RECADO = 280;
export const MAX_NOME = 40;
/** Difusão de posição (Hz) e tempo de interpolação dos remotos. */
export const POS_HZ = 9;   // abaixo do teto do Pusher (10 client events/s por conexão); o lerp suaviza
export const POS_HZ_FALLBACK = 4;

export type Presenca = {
  userId: string;
  name: string;
  color: string;      // accent do perfil (#rrggbb)
  x: number; z: number;
  facing: number;     // rad
  moving?: boolean;
  sit?: boolean;      // sentado na cadeira da própria base (cyberespaço)
  topo?: boolean;     // no topo da Zaeon (só vale pra quem o SERVIDOR marcou como fundador)
  ceu?: boolean;      // na Cidade Zaeon (céu) — idem
  voo?: { y: number; yaw: number };   // pilotando a nave (altura + rumo) — idem
  naveParada?: { x: number; y: number; z: number; yaw: number };   // a nave pousada FORA do hangar (fora dela) — idem
  jet?: number;       // voando de mochila a jato: altura no mundo (qualquer pessoa; teto no cliente)
  alt?: number;       // em pé num lugar alto que o chão não explica (o dorso da nave): altura no mundo
  falando?: boolean;  // voz (push-to-talk) ligada agora — indicador no avatar (transporte colyseus)
  moto?: { s: number; y: number; yaw: number; de?: string };   // montado numa MOTO voadora (vaga de origem, altura, rumo; `de` = de quem era a estacionada que pegou) — qualquer pessoa
  motoLargada?: { s: number; x: number; y: number; z: number; yaw: number };   // a moto que ESTACIONOU (fica lá, não volta pra vaga)
  desc?: number;      // DESCANSO no lounge: 0 em pé, 1 sentado, 2 deitado, +3 com o tablet (lib/cyber/descanso)
  mov?: number;       // o MOVIMENTO TURBINADO (lib/cyber/movimento): 1 sprint, 2 dash, 3 guarda, 4 hero landing, 5 decolagem
  atk?: number; hp?: number; arma?: number;   // ARENA PvP (lib/cyber/combate): o golpe (seq×4 + nº do combo), a vida (0–100), a espada na mão (1)
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

/** o recado ATUAL pro QG (um só; o novo substitui) — quem mandou vem da SESSÃO no servidor */
export type RecadoQG = { id: string; texto: string; deId: string; deNome: string; deCor: string; ts: number };
export type ConteudoSala = { notes: NotaCanvas[]; artifacts: ArtefatoCanvas[]; recadoQG?: RecadoQG | null; somLounge?: SomLounge | null;
  /** onde a NAVE-QG do dono ficou estacionada (todos a veem ali, mesmo com ele offline) */
  naveQG?: { x: number; y: number; z: number; yaw: number } | null };

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
/** recado do dono pro QG (broadcast pelo servidor; persiste no conteúdo da sala) */
export const EV_RECADO = "recado-qg";
/** o som do lounge da Zaeon mudou (playlist ou controle) — `agora` = relógio do servidor (acerta o dos clientes) */
export const EV_MUSICA = "musica-lounge";

/** Cor de accent determinística pelo userId (até o perfil ter campo próprio). */
export function corDoUsuario(userId: string): string {
  const PALETA = ["#4aa3ff", "#ff7fb0", "#5fd08a", "#ffbe54", "#b48cff", "#49d9d9", "#ff8a65"];
  let h = 0; for (let i = 0; i < userId.length; i++) h = (h * 31 + userId.charCodeAt(i)) | 0;
  return PALETA[Math.abs(h) % PALETA.length]!;
}
