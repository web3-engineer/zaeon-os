"use client";
/**
 * useSala3D — dados + tempo real da sala 3D (docs/HANDOFF_LOUNGE_COWORK_3D.md):
 *   GET /api/lounge3d/[id] (conteúdo, membros) · Pusher presença `presence-lounge3d-<id>` (quem está;
 *   teto 5 no auth → "cheia") · posições por `client-pos` (12 Hz, sem servidor; fallback POST /pos a 4 Hz)
 *   · chat (POST → evento "chat") · conteúdo (PATCH → evento "conteudo").
 *   Com NEXT_PUBLIC_REALTIME=colyseus, PRESENÇA e POSIÇÃO vão pelo Colyseus self-hosted (./salaColyseus: estado
 *   sincronizado, interpolação + dead reckoning, sem custo por mensagem); chat/conteúdo/recado seguem no Pusher.
 * Presença/chat são efêmeros; só notas/artefatos persistem.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type PusherClient from "pusher-js";
import { sanitizarPresenca } from "@/lib/lounge3d/sala";
import { HEARTBEAT_MS, HELLO_JITTER_MS, poseMudou, type Pose } from "@/lib/lounge3d/pose";
import { classificarErroPusher, ehFalhaDeConexao, type EstadoRealtime, type MotivoErro } from "@/lib/lounge3d/realtimeEstado";
import { POSE_HZ_COLYSEUS, transporteRealtime } from "@/lib/lounge3d/realtime";
import { conectarColyseus, type CanalVoz, type ConexaoColyseus } from "./salaColyseus";
import { sanitizarSom, type AcaoSom } from "@/lib/lounge3d/musica";
import { EV_MUSICA, EV_CHAT, EV_CONTEUDO, EV_POS, EV_POS_CLIENTE, EV_RECADO, POS_HZ, POS_HZ_FALLBACK, canalSala, type ConteudoSala, type MensagemChat, type OpsSala, type Presenca, type RecadoQG } from "@/lib/lounge3d/tipos";

export type Membro = { id: string; name: string; image: string | null; color: string; fundador?: boolean; /** (só `eu`) nunca entrou no cyberespaço: nasce num tubo de ensaio */ novo?: boolean; /** (Colyseus) já mandou a 1ª pose — o novato no tutorial não: nem aparece nem entra na voz */ pronto?: boolean };
export type Sala = { id: string; title: string; ownerId: string; isOwner: boolean; members: string[]; token: string | null; conteudo: ConteudoSala };
export type EstadoSala = "carregando" | "ok" | "cheia" | "erro" | "off";

/**
 * `poseInicial(id)`: onde mostrar alguém que está ONLINE mas ainda não mandou posição (ex.: sentado na própria base).
 * Sem ela (Cartolina 3D), o avatar remoto só aparece com a 1ª posição recebida.
 */
export type OpcoesSala3D = { poseInicial?: (userId: string) => Pose | null };

/** Evento de handshake: quem entra pede; quem já está responde reenviando a própria pose na hora. */
const EV_HELLO = "client-hello";

export function useSala3D(salaId: string | null, opts: OpcoesSala3D = {}) {
  const [sala, setSala] = useState<Sala | null>(null);
  const [eu, setEu] = useState<Membro | null>(null);
  const [membros, setMembros] = useState<Membro[]>([]);
  const [estado, setEstado] = useState<EstadoSala>("carregando");
  const [online, setOnline] = useState<Membro[]>([]);
  const [chat, setChat] = useState<MensagemChat[]>([]);
  /** conectando → pusher (ok) | erro (com `motivoRealtime`) | sem-chave (build sem NEXT_PUBLIC_PUSHER_*). Nunca "indisponível" só por estar conectando. */
  const [realtime, setRealtime] = useState<EstadoRealtime>("conectando");
  const [motivoRealtime, setMotivoRealtime] = useState<MotivoErro | null>(null);
  /** Presenças remotas (alvo da interpolação) — ref, não state: muda 12×/s. */
  const remotos = useRef<Map<string, Presenca>>(new Map());
  const pusherRef = useRef<PusherClient | null>(null);
  const canalRef = useRef<any>(null);
  const clientEventsOk = useRef(true);
  const ultimoPos = useRef(0);
  const poseInicialRef = useRef(opts.poseInicial); poseInicialRef.current = opts.poseInicial;
  /** última pose conhecida (o engine atualiza a cada frame) e a última que de fato saiu pela rede */
  const ultimaPose = useRef<Pose | null>(null);
  const ultimaEnviada = useRef<Pose | null>(null);
  /** emissor atual (ref p/ o efeito do Pusher e o heartbeat chamarem sem reinstalar) */
  const emitirRef = useRef<(p: Pose, forcar: boolean) => void>(() => {});
  /** transporte de posição/presença (flag de build): "pusher" (padrão, rollback) | "colyseus" */
  const modo = transporteRealtime();
  const colyRef = useRef<ConexaoColyseus | null>(null);
  const [canalVoz, setCanalVoz] = useState<CanalVoz | null>(null);

  const carregar = useCallback(async () => {
    if (!salaId) return;
    try {
      const r = await fetch(`/api/lounge3d/${salaId}`, { cache: "no-store" });
      if (r.status === 404) { setEstado("off"); return; }
      if (!r.ok) throw new Error(String(r.status));
      const d = await r.json();
      setSala(d.sala); setMembros(d.membros ?? []); setEu({ id: d.eu.id, name: d.eu.name, image: d.eu.image ?? null, color: d.eu.color, fundador: d.eu.fundador === true, novo: d.eu.novo === true });
      setEstado((e) => (e === "cheia" ? e : "ok"));
    } catch { setEstado("erro"); }
  }, [salaId]);
  useEffect(() => { setSala(null); setChat([]); remotos.current.clear(); setEstado("carregando"); void carregar(); }, [carregar]);

  // Pusher: presença + eventos. Depende do ID (não do objeto `eu`, recriado a cada refetch → reconectava à toa).
  const euId = eu?.id ?? null;
  useEffect(() => {
    const mapaRemotos = remotos.current;
    const key = process.env.NEXT_PUBLIC_PUSHER_KEY, cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;
    if (!salaId || !euId) return;
    // Diagnóstico (1x por montagem): o bundle recebeu a key? (NEXT_PUBLIC_* é inlinada no BUILD/start — reinicie após mexer no .env)
    console.info(`[lounge] pusher: key ${key ? "presente" : "AUSENTE"} · cluster ${cluster || "AUSENTE"} · canal ${canalSala(salaId)}`);
    if (!key || !cluster) { setRealtime("sem-chave"); return; }
    setRealtime("conectando"); setMotivoRealtime(null);
    let vivo = true;
    (async () => {
      const Pusher = (await import("pusher-js")).default;
      if (!vivo) return;
      const p = new Pusher(key, { cluster, channelAuthorization: { endpoint: `/api/lounge3d/${salaId}/pusher-auth`, transport: "ajax" } });
      pusherRef.current = p; clientEventsOk.current = true;
      // conexão: failed/unavailable = erro de verdade; o resto é transitório
      p.connection.bind("state_change", (st: { current?: string }) => {
        if (!vivo) return;
        if (ehFalhaDeConexao(st?.current)) { setRealtime("erro"); setMotivoRealtime("conexao"); }
        else if (st?.current === "connected") setRealtime((r) => (r === "erro" ? "conectando" : r));
      });
      // pusher:error 4301 = "Enable client events" desligado no painel: as posições seriam descartadas em silêncio → cai pro POST /pos
      p.connection.bind("error", (err: unknown) => {
        if (classificarErroPusher(err) === "client-events" && clientEventsOk.current) {
          clientEventsOk.current = false;
          console.warn("[lounge] Pusher sem 'client events' (4301): usando o fallback do servidor (4 Hz). Ligue 'Enable client events' em App Settings.");
        }
      });
      const ch: any = p.subscribe(canalSala(salaId));
      canalRef.current = ch;
      // SEED: todo membro online (≠ eu) ganha uma presença placeholder já — o avatar aparece antes do 1º client-pos
      // (client-pos é efêmero: quem está parado ou entrou depois ficava invisível → "um vê, o outro não").
      const seed = (m: any) => {
        const id = String(m?.id ?? ""); if (!id || id === euId || mapaRemotos.has(id)) return;
        if (m?.info?.novo) return;   // o NOVATO está no tutorial (a Zaeon só dele): a base dele fica vazia até ele aparecer de verdade
        const pose = poseInicialRef.current?.(id); if (!pose) return;
        mapaRemotos.set(id, { userId: id, name: m.info?.name ?? "Alguém", color: m.info?.color ?? "#4aa3ff", x: pose.x, z: pose.z, facing: pose.facing, moving: false, sit: pose.sit ?? true, ts: Date.now() });
      };
      const colyseus = modo === "colyseus";   // presença/posição pelo Colyseus: o Pusher fica só com chat/conteúdo/recado
      const sync = () => { if (colyseus) return; const lista: Membro[] = []; ch.members?.each((m: any) => { lista.push({ id: String(m.id), name: m.info?.name ?? "Alguém", image: m.info?.image ?? null, color: m.info?.color ?? "#4aa3ff" }); seed(m); }); setOnline(lista); };
      ch.bind("pusher:subscription_succeeded", () => {
        if (colyseus) return;
        setRealtime("pusher"); setMotivoRealtime(null); sync();
        // handshake: "cheguei" → quem já está reenvia a pose na hora (ninguém depende de o outro andar)
        try { ch.trigger(EV_HELLO, { id: euId }); } catch { /* client events off: o seed + heartbeat cobrem */ }
        if (ultimaPose.current) emitirRef.current(ultimaPose.current, true);
      });
      ch.bind(EV_HELLO, () => { setTimeout(() => { if (vivo && ultimaPose.current) emitirRef.current(ultimaPose.current, true); }, Math.random() * HELLO_JITTER_MS); });
      ch.bind("pusher:subscription_error", (e: any) => {
        if (colyseus) { console.warn("[lounge] pusher (chat/conteúdo) indisponível:", e); return; }
        const motivo = classificarErroPusher(e);
        console.warn("[lounge] assinatura do canal falhou:", motivo, e);
        if (motivo === "cheia") { setEstado("cheia"); return; }
        setRealtime("erro"); setMotivoRealtime(motivo);
      });
      if (!colyseus) {
        ch.bind("pusher:member_added", (m: any) => { seed(m); sync(); });
        ch.bind("pusher:member_removed", (m: any) => { mapaRemotos.delete(String(m.id)); sync(); });
        const onPos = (raw: unknown) => { const pr = sanitizarPresenca(raw); if (pr && pr.userId !== euId) mapaRemotos.set(pr.userId, pr); };
        ch.bind(EV_POS_CLIENTE, onPos); ch.bind(EV_POS, onPos);
      }
      ch.bind(EV_CHAT, (m: MensagemChat) => setChat((c) => [...c.slice(-199), m]));
      // recado do dono pro QG (holograma ao lado da tela do Andrei): chega na hora e fica no conteúdo
      ch.bind(EV_RECADO, (d: { recado: RecadoQG | null }) => setSala((s) => (s ? { ...s, conteudo: { ...s.conteudo, recadoQG: d.recado } } : s)));
      // o toca-discos do lounge (playlist/controle do dono): o relógio do servidor vem junto (sincronia da música)
      ch.bind(EV_MUSICA, (d: { som: unknown; agora?: number }) => aplicarMusicaRef.current(d));
      ch.bind(EV_CONTEUDO, (d: { fromUserId: string; conteudo: ConteudoSala; title?: string }) => {
        if (d.fromUserId === euId) return; // o autor já aplicou localmente
        setSala((s) => (s ? { ...s, conteudo: d.conteudo, title: d.title ?? s.title } : s));
      });
    })();
    return () => { vivo = false; try { pusherRef.current?.disconnect(); } catch { /* ignore */ } pusherRef.current = null; canalRef.current = null; if (modo !== "colyseus") { setOnline([]); mapaRemotos.clear(); } };
  }, [salaId, euId, modo]);

  // COLYSEUS: presença + posição (estado sincronizado, netcode) e o signaling da voz
  useEffect(() => {
    if (modo !== "colyseus" || !salaId || !euId) return;
    const mapaRemotos = remotos.current;
    setRealtime("conectando"); setMotivoRealtime(null);
    const c = conectarColyseus({
      salaId, euId, remotos: mapaRemotos,
      poseInicial: (id) => poseInicialRef.current?.(id) ?? null,
      onOnline: (lista) => setOnline(lista.map((m) => ({ id: m.id, name: m.name, image: null, color: m.color, fundador: m.fundador, pronto: m.pronto }))),
      onEstado: (e) => {
        if (e === "ok") { setRealtime("colyseus"); setMotivoRealtime(null); if (ultimaPose.current) emitirRef.current(ultimaPose.current, true); }
        else if (e === "cheia") setEstado("cheia");
        else if (e === "erro") { setRealtime("erro"); setMotivoRealtime("conexao"); }
        else setRealtime((r) => (r === "erro" ? r : "conectando"));
      },
    });
    colyRef.current = c; setCanalVoz(c.voz);
    return () => { c.sair(); colyRef.current = null; setCanalVoz(null); setOnline([]); mapaRemotos.clear(); };
  }, [salaId, euId, modo]);

  /** Emite a pose (throttle; `forcar` ignora o throttle — hello/heartbeat). client-pos → sem servidor; sem client events → POST a 4 Hz. */
  const euRef = useRef(eu); euRef.current = eu;
  const emitir = useCallback((p: Pose, forcar: boolean) => {
    const me = euRef.current;
    if (!salaId || !me) return;
    const agora = performance.now();
    const hz = modo === "colyseus" ? POSE_HZ_COLYSEUS : clientEventsOk.current ? POS_HZ : POS_HZ_FALLBACK;
    if (!forcar && agora - ultimoPos.current < 1000 / hz) return;
    ultimoPos.current = agora; ultimaEnviada.current = p;
    if (modo === "colyseus") { colyRef.current?.enviar(p); return; }   // a identidade vem do token, não daqui
    const payload: Presenca = { userId: me.id, name: me.name, color: me.color, ...p, ts: Date.now() };
    const ch = canalRef.current;
    if (clientEventsOk.current && ch?.subscribed) {
      const ok = ch.trigger(EV_POS_CLIENTE, payload);
      if (ok) return;
      clientEventsOk.current = false; // app Pusher sem "client events": cai no servidor
    }
    void fetch(`/api/lounge3d/${salaId}/pos`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(p) }).catch(() => {});
  }, [salaId, modo]);
  emitirRef.current = emitir;

  /** O engine chama a cada frame: guarda a pose e só envia quando MUDOU (parado não gasta a cota do Pusher). */
  const enviarPos = useCallback((p: Omit<Presenca, "userId" | "name" | "color">) => {
    const pose: Pose = { x: p.x, z: p.z, facing: p.facing, moving: !!p.moving, sit: !!p.sit, topo: !!p.topo, ceu: !!p.ceu, ...(p.voo ? { voo: p.voo } : {}), ...(p.naveParada ? { naveParada: p.naveParada } : {}), ...(typeof p.jet === "number" ? { jet: p.jet } : {}), ...(typeof p.alt === "number" ? { alt: p.alt } : {}), ...(p.moto ? { moto: p.moto } : {}), ...(p.motoLargada ? { motoLargada: p.motoLargada } : {}), ...(p.desc ? { desc: p.desc } : {}), ...(p.mov ? { mov: p.mov } : {}), ...(p.atk ? { atk: p.atk } : {}), ...(typeof p.hp === "number" && p.hp < 100 ? { hp: p.hp } : {}), ...(p.arma ? { arma: p.arma } : {}) };
    ultimaPose.current = pose;
    if (poseMudou(ultimaEnviada.current, pose)) emitir(pose, false);
  }, [emitir]);

  // HEARTBEAT independente do requestAnimationFrame (que o navegador pausa em segundo plano): reenvia a última pose
  // a cada 2 s e ao voltar pra aba — cura pacote perdido, aba oculta e quem acabou de entrar.
  useEffect(() => {
    if (!salaId) return;
    const hb = setInterval(() => { if (ultimaPose.current) emitirRef.current(ultimaPose.current, true); }, HEARTBEAT_MS);
    const vis = () => { if (!document.hidden && ultimaPose.current) emitirRef.current(ultimaPose.current, true); };
    document.addEventListener("visibilitychange", vis);
    return () => { clearInterval(hb); document.removeEventListener("visibilitychange", vis); };
  }, [salaId]);

  const enviarChat = useCallback(async (texto: string) => {
    if (!salaId || !texto.trim()) return;
    const r = await fetch(`/api/lounge3d/${salaId}/chat`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ texto }) });
    if (r.ok && realtime !== "pusher") { const d = await r.json().catch(() => null); if (d?.msg) setChat((c) => [...c.slice(-199), d.msg]); }
  }, [salaId, realtime]);

  /** Aplica no servidor e localmente (otimista) — o evento "conteudo" cobre os outros. */
  const patch = useCallback(async (ops: OpsSala & { title?: string }) => {
    if (!salaId) return;
    const r = await fetch(`/api/lounge3d/${salaId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(ops) });
    if (!r.ok) return;
    const d = await r.json().catch(() => null);
    if (d?.conteudo) setSala((s) => (s ? { ...s, conteudo: d.conteudo, title: d.title ?? s.title } : s));
  }, [salaId]);

  /** SOM DO LOUNGE: aplica um estado vindo do servidor (evento ou resposta) e acerta o relógio (servidor − cliente) */
  const [offsetMusica, setOffsetMusica] = useState(0);
  const aplicarMusica = useCallback((d: { som: unknown; agora?: number }) => {
    if (typeof d.agora === "number" && Number.isFinite(d.agora)) setOffsetMusica(d.agora - Date.now());
    const som = sanitizarSom(d.som);
    setSala((s) => (s ? { ...s, conteudo: { ...s.conteudo, somLounge: som && som.faixas.length ? som : null } } : s));
  }, []);
  const aplicarMusicaRef = useRef(aplicarMusica); aplicarMusicaRef.current = aplicarMusica;
  /** o DONO mexe no toca-discos: sobe uma música, controla (tocar/pausar/parar/próxima/anterior/ir) ou tira uma faixa */
  const musica = useMemo(() => {
    const resp = async (r: Response): Promise<{ ok: boolean; erro?: string }> => {
      const d = await r.json().catch(() => ({}));
      if (!r.ok) return { ok: false, erro: (d as { error?: string })?.error ?? "Não deu." };
      aplicarMusica(d as { som: unknown; agora?: number }); return { ok: true };
    };
    const url = salaId ? `/api/lounge3d/${salaId}/musica` : "";
    return {
      async subir(file: File, dur: number, nome: string) { if (!url) return { ok: false, erro: "Sem sala." }; const f = new FormData(); f.append("file", file); f.append("dur", String(dur)); f.append("nome", nome); return resp(await fetch(url, { method: "POST", body: f })); },
      async controlar(acao: AcaoSom, i?: number) { if (!url) return { ok: false, erro: "Sem sala." }; return resp(await fetch(url, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ acao, i }) })); },
      async remover(id: string) { if (!url) return { ok: false, erro: "Sem sala." }; return resp(await fetch(`${url}?faixa=${encodeURIComponent(id)}`, { method: "DELETE" })); },
      urlDe: (arq: string) => `${url}/${arq}`,
    };
  }, [salaId, aplicarMusica]);

  /** o DONO estacionou a nave-QG: guarda onde ela ficou (todos a veem ali, mesmo com ele offline) */
  const salvarNave = useCallback(async (pose: { x: number; y: number; z: number; yaw: number }) => {
    if (!salaId) return;
    setSala((s) => (s ? { ...s, conteudo: { ...s.conteudo, naveQG: pose } } : s));
    await fetch(`/api/lounge3d/${salaId}/nave`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(pose) }).catch(() => {});
  }, [salaId]);

  /** o DONO manda (ou apaga, `texto` null) o recado pro QG — o servidor confere a sessão; aplica aqui na hora */
  const enviarRecado = useCallback(async (texto: string | null): Promise<{ ok: boolean; erro?: string }> => {
    if (!salaId) return { ok: false, erro: "Sem sala." };
    const r = await fetch(`/api/lounge3d/${salaId}/recado`, texto === null ? { method: "DELETE" } : { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ texto }) });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) return { ok: false, erro: (d as { error?: string })?.error ?? "Não deu pra enviar." };
    const recado = texto === null ? null : ((d as { recado?: RecadoQG }).recado ?? null);
    setSala((s) => (s ? { ...s, conteudo: { ...s.conteudo, recadoQG: recado } } : s));
    return { ok: true };
  }, [salaId]);

  return { sala, eu, membros, online, chat, estado, realtime, motivoRealtime, remotos, enviarPos, enviarChat, patch, enviarRecado, canalVoz, recadoQG: sala?.conteudo.recadoQG ?? null, somLounge: sala?.conteudo.somLounge ?? null, offsetMusica, musica, naveQG: sala?.conteudo.naveQG ?? null, salvarNave, recarregar: carregar };
}
