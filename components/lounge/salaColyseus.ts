"use client";
/**
 * salaColyseus — o transporte COLYSEUS da sala 3D (NEXT_PUBLIC_REALTIME=colyseus). Mesma interface que o engine
 * já consome: preenche o Map `remotos` (userId → Presenca) e recebe a pose local por `enviar(pose)`.
 *  - entra com um token do app (POST /api/lounge3d/[id]/rt-token: sessão → token HMAC curto) — a identidade e as
 *    regalias vêm do servidor, nunca daqui;
 *  - o estado da room chega em patches (20 Hz): cada remoto vira uma Trilha (lib/lounge3d/netcode) e um laço a
 *    ~60 Hz desenha ATRASO_MS no passado, interpolando + dead reckoning (sem "travadinho");
 *  - quem entra já recebe todo mundo no 1º estado (sem a assimetria "um vê, o outro não");
 *  - caiu a conexão: reentra sozinho (token novo), com espera crescente;
 *  - também é o SIGNALING da voz (mensagens "rtc"/"fala" da room).
 */
import type { Presenca } from "@/lib/lounge3d/tipos";
import type { Pose } from "@/lib/lounge3d/pose";
import { Trilha } from "@/lib/lounge3d/netcode";
import { urlColyseus } from "@/lib/lounge3d/realtime";
import type { ServidorIce } from "@/lib/lounge3d/ice";

export type EstadoColyseus = "conectando" | "ok" | "erro" | "cheia";
type JogadorRemoto = {
  userId: string; name: string; color: string; fundador: boolean;
  x: number; z: number; facing: number; moving: boolean; sit: boolean; topo: boolean; ceu: boolean;
  voando: boolean; vooY: number; vooYaw: number; parada: boolean; npX: number; npY: number; npZ: number; npYaw: number;
  jet: number; alt: number; falando: boolean; pronto: boolean; motoS: number; motoY: number; motoYaw: number; motoDe: string; mlS: number; mlX: number; mlY: number; mlZ: number; mlYaw: number; desc: number; atk: number; hp: number; arma: boolean; mov: number;
};
export type CanalVoz = {
  /** manda offer/answer/ICE pra alguém da sala (por userId) */
  enviar(to: string, data: unknown): void;
  /** escuta o signaling que chega (from = userId da SESSÃO do remetente) — devolve o "desinscrever" */
  assinar(cb: (from: string, data: unknown) => void): () => void;
  /** liga/desliga o indicador "falando" no meu avatar (pros outros) */
  fala(on: boolean): void;
  ice: ServidorIce[];
};
export type ConexaoColyseus = { enviar(p: Pose): void; voz: CanalVoz; sair(): void };

/** os campos de um jogador do estado (os do Schema são acessores — espalhar com {...j} não copia) */
const CAMPOS: (keyof JogadorRemoto)[] = ["motoS", "motoY", "motoYaw", "motoDe", "mlS", "mlX", "mlY", "mlZ", "mlYaw", "userId", "name", "color", "fundador", "x", "z", "facing", "moving", "sit", "topo", "ceu", "voando", "vooY", "vooYaw", "parada", "npX", "npY", "npZ", "npYaw", "jet", "alt", "falando", "pronto", "desc", "atk", "hp", "arma", "mov"];
const copiar = (j: JogadorRemoto): JogadorRemoto => { const o = {} as Record<string, unknown>; for (const k of CAMPOS) o[k] = j[k]; return o as JogadorRemoto; };

export function conectarColyseus(o: {
  salaId: string; euId: string;
  remotos: Map<string, Presenca>;
  onOnline: (lista: { id: string; name: string; color: string; fundador: boolean; pronto: boolean }[]) => void;
  onEstado: (e: EstadoColyseus) => void;
  /** onde mostrar quem entrou mas ainda não mandou a 1ª pose (ex.: sentado na própria base) */
  poseInicial?: (userId: string) => { x: number; z: number; facing: number; sit?: boolean } | null;
}): ConexaoColyseus {
  let vivo = true, room: { send(t: string, m: unknown): void; leave(consented?: boolean): Promise<unknown>; onMessage(t: string, cb: (m: unknown) => void): unknown } | null = null;
  let tentativas = 0, timerReentrar: ReturnType<typeof setTimeout> | null = null, raf = 0;
  const trilhas = new Map<string, Trilha>(), ultimo = new Map<string, JogadorRemoto>();
  const ouvintesVoz = new Set<(from: string, data: unknown) => void>();
  const ice: ServidorIce[] = [];
  // laço de desenho no ritmo da tela (fora do navegador — testes — cai num timer de ~60 Hz)
  const proximoQuadro = (cb: () => void): number => (typeof requestAnimationFrame === "function" ? requestAnimationFrame(cb) : (setTimeout(cb, 16) as unknown as number));
  const cancelarQuadro = (id: number) => { if (typeof cancelAnimationFrame === "function") cancelAnimationFrame(id); else clearTimeout(id as unknown as ReturnType<typeof setTimeout>); };

  /** laço de desenho: amostra cada trilha ATRASO_MS no passado e atualiza o Map que o engine lê */
  const desenhar = () => {
    if (!vivo) return;
    const agora = performance.now();
    for (const [id, j] of ultimo) {
      const s = trilhas.get(id)?.amostrar(agora); if (!s) continue;
      o.remotos.set(id, {
        userId: id, name: j.name, color: j.color, x: s.x, z: s.z, facing: s.facing, moving: j.moving, sit: j.sit,
        topo: j.topo, ceu: j.ceu, falando: j.falando,
        ...(j.voando ? { voo: { y: j.vooY, yaw: j.vooYaw } } : {}),
        ...(j.parada ? { naveParada: { x: j.npX, y: j.npY, z: j.npZ, yaw: j.npYaw } } : {}),
        ...(j.jet >= 0 ? { jet: j.jet } : {}), ...(j.alt >= 0 ? { alt: j.alt } : {}),
        ...(j.motoS >= 0 ? { moto: { s: j.motoS, y: j.motoY, yaw: j.motoYaw, ...(j.motoDe ? { de: j.motoDe } : {}) } } : {}),
        ...(j.mlS >= 0 ? { motoLargada: { s: j.mlS, x: j.mlX, y: j.mlY, z: j.mlZ, yaw: j.mlYaw } } : {}),
        ...(j.desc ? { desc: j.desc } : {}),
        ...(j.mov ? { mov: j.mov } : {}), ...(j.atk ? { atk: j.atk } : {}), ...(typeof j.hp === "number" && j.hp < 100 ? { hp: j.hp } : {}), ...(j.arma ? { arma: 1 } : {}),
        ts: Date.now(),
      });
    }
    raf = proximoQuadro(desenhar);
  };

  const entrar = async () => {
    if (!vivo) return;
    o.onEstado("conectando");
    try {
      const r = await fetch(`/api/lounge3d/${o.salaId}/rt-token`, { method: "POST" });
      if (!r.ok) throw new Error(`token ${r.status}`);
      const d = (await r.json()) as { token: string; ice?: ServidorIce[] };
      ice.splice(0, ice.length, ...(d.ice ?? []));
      const { Client } = await import("@colyseus/sdk");
      if (!vivo) return;
      const c = new Client(urlColyseus());
      const rm = await c.joinOrCreate("lounge", { salaId: o.salaId, token: d.token });
      if (!vivo) { void rm.leave(); return; }
      room = rm as unknown as typeof room; tentativas = 0;
      o.onEstado("ok");
      rm.onStateChange((estado: unknown) => {
        const players = (estado as { players?: Map<string, JogadorRemoto> }).players; if (!players) return;
        const agora = performance.now(), vistos = new Set<string>(), lista: { id: string; name: string; color: string; fundador: boolean; pronto: boolean }[] = [];
        players.forEach((j, id) => {
          lista.push({ id, name: j.name, color: j.color, fundador: j.fundador, pronto: j.pronto === true });
          if (id === o.euId) return;
          vistos.add(id);
          const ant = ultimo.get(id);
          ultimo.set(id, copiar(j));
          // ainda sem a 1ª pose: NÃO aparece (nem sentado na base). Quem entra normal manda a pose em instantes; o novato no
          // tutorial (a instância da Zaeon dele — components/cyber/engine) só manda depois de cruzar o 1º portal, e a base
          // dele fica vazia até lá
          if (!j.pronto) { trilhas.delete(id); o.remotos.delete(id); return; }
          let t = trilhas.get(id); if (!t) { t = new Trilha(); trilhas.set(id, t); }
          if (!ant || ant.x !== j.x || ant.z !== j.z || ant.facing !== j.facing || ant.moving !== j.moving || t.vazia) t.empurrar({ t: agora, x: j.x, z: j.z, facing: j.facing, moving: j.moving });
        });
        for (const id of [...ultimo.keys()]) if (!vistos.has(id)) { ultimo.delete(id); trilhas.delete(id); o.remotos.delete(id); }   // saiu: o avatar some
        o.onOnline(lista);
      });
      rm.onMessage("rtc", (m: unknown) => { const x = m as { from?: string; data?: unknown }; if (x?.from) for (const cb of ouvintesVoz) cb(x.from, x.data); });
      rm.onLeave((code: number) => {
        room = null;
        if (!vivo || code === 4000) { if (code === 4000) o.onEstado("erro"); return; }   // 4000 = outra aba minha assumiu
        reentrar();
      });
    } catch (e) {
      const msg = String((e as { message?: string })?.message ?? e);
      if (/cheia|full|locked|409/i.test(msg)) { o.onEstado("cheia"); return; }
      console.warn("[lounge] colyseus: falhou ao entrar —", msg);
      o.onEstado("erro"); reentrar();
    }
  };
  const reentrar = () => {
    if (!vivo || timerReentrar) return;
    const espera = Math.min(10_000, 1000 * 2 ** tentativas++);
    timerReentrar = setTimeout(() => { timerReentrar = null; void entrar(); }, espera);
  };

  void entrar();
  raf = proximoQuadro(desenhar);

  return {
    enviar(p) { try { room?.send("pose", p); } catch { /* reconectando */ } },
    voz: {
      enviar(to, data) { try { room?.send("rtc", { to, data }); } catch { /* sem sala */ } },
      assinar(cb) { ouvintesVoz.add(cb); return () => { ouvintesVoz.delete(cb); }; },
      fala(on) { try { room?.send("fala", { on }); } catch { /* sem sala */ } },
      ice,
    },
    sair() {
      vivo = false; cancelarQuadro(raf); if (timerReentrar) clearTimeout(timerReentrar);
      try { void room?.leave(true); } catch { /* já */ }
      room = null; trilhas.clear(); ultimo.clear(); ouvintesVoz.clear();
    },
  };
}
