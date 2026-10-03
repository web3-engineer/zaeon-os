"use client";
/**
 * useCerebro — o cérebro da CONVERSA ATIVA (scopeId) no cliente (HANDOFF_CEREBRO_AURA §3).
 *   - GET /api/map?scopeId= → mapa + estado da bolinha;
 *   - Pusher `private-cerebro-<mapaId>` (turno/gerado/erro) → refetch ao vivo;
 *   - fallback: poll leve (3s) enquanto gera, ou enquanto o painel está aberto sem Pusher;
 *   - gerar() → POST /api/map/generate (estado "gerando" até o evento/poll trazer o backbone).
 * Trocar de conversa = outro scopeId = outro grafo (mesmo hook).
 */
import { useCallback, useEffect, useRef, useState } from "react";
import type PusherClient from "pusher-js";
import { estadoDaBolinha, type EstadoBolinha } from "@/lib/map/bolinha";
import { canalCerebro, EV_ERRO, EV_GERADO, EV_TURNO } from "@/lib/map/realtime";
import type { MapaView } from "@/lib/map/tipos";

export const mapPanelOn = (): boolean => process.env.NEXT_PUBLIC_MAP_HARNESS === "1";

export type MapaCliente = Omit<MapaView, "updatedAt"> & { updatedAt: string };
export type CerebroState = {
  mapa: MapaCliente | null;
  estado: EstadoBolinha;
  tituloSugerido: string | null;
  gerando: boolean;
  erro: string | null;
  /** ids que acenderam no último evento (o painel pisca neles). */
  recentes: string[];
};

const POLL_MS = 3000;

export function useCerebro(scopeId: string | null, opts: { aberto?: boolean } = {}) {
  const [st, setSt] = useState<CerebroState>({ mapa: null, estado: "oculta", tituloSugerido: null, gerando: false, erro: null, recentes: [] });
  const gerandoRef = useRef(false);
  const pusherRef = useRef<PusherClient | null>(null);
  const canalRef = useRef<string | null>(null);
  const on = mapPanelOn();

  const refetch = useCallback(async (recentes: string[] = []) => {
    if (!on || !scopeId) return;
    try {
      const r = await fetch(`/api/map?scopeId=${encodeURIComponent(scopeId)}`, { cache: "no-store" });
      if (!r.ok) { setSt((s) => ({ ...s, erro: r.status === 404 ? null : `HTTP ${r.status}` })); return; }
      const d = await r.json();
      const mapa: MapaCliente | null = d.mapa ?? null;
      if (mapa?.backbone?.length) gerandoRef.current = false;
      const estado = estadoDaBolinha({ estudavel: !!d.estudavel, mapaId: mapa?.id ?? null, temMapa: !!mapa, backbone: mapa?.backbone?.length ?? 0, gerando: gerandoRef.current });
      setSt({ mapa, estado, tituloSugerido: d.tituloSugerido ?? null, gerando: gerandoRef.current, erro: null, recentes });
    } catch (e: any) { setSt((s) => ({ ...s, erro: e?.message ?? "falha" })); }
  }, [on, scopeId]);

  // Conversa trocou → zera e recarrega.
  useEffect(() => { gerandoRef.current = false; setSt({ mapa: null, estado: "oculta", tituloSugerido: null, gerando: false, erro: null, recentes: [] }); void refetch(); }, [refetch]);

  // Pusher: assina o canal do mapa (privado; auth em /api/map/pusher-auth).
  useEffect(() => {
    const mapaId = st.mapa?.id;
    const key = process.env.NEXT_PUBLIC_PUSHER_KEY, cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;
    if (!on || !mapaId || !key || !cluster) return;
    let vivo = true;
    (async () => {
      const Pusher = (await import("pusher-js")).default;
      if (!vivo) return;
      const p = pusherRef.current ?? new Pusher(key, { cluster, channelAuthorization: { endpoint: "/api/map/pusher-auth", transport: "ajax" } });
      pusherRef.current = p;
      const nome = canalCerebro(mapaId);
      if (canalRef.current && canalRef.current !== nome) { try { p.unsubscribe(canalRef.current); } catch { /* ignore */ } }
      canalRef.current = nome;
      const ch = p.subscribe(nome);
      ch.bind(EV_TURNO, (ev: { novos?: string[]; tocados?: string[] }) => void refetch([...(ev.novos ?? []), ...(ev.tocados ?? [])]));
      ch.bind(EV_GERADO, () => { gerandoRef.current = false; void refetch(); });
      ch.bind(EV_ERRO, (ev: { motivo?: string }) => { gerandoRef.current = false; setSt((s) => ({ ...s, gerando: false, estado: "vazia", erro: ev?.motivo ?? "falhou" })); });
    })();
    return () => { vivo = false; };
  }, [on, st.mapa?.id, refetch]);
  useEffect(() => () => { try { pusherRef.current?.disconnect(); } catch { /* ignore */ } pusherRef.current = null; canalRef.current = null; }, []);

  // Poll de fallback: gerando (sempre) ou painel aberto sem Pusher.
  useEffect(() => {
    const semPusher = !process.env.NEXT_PUBLIC_PUSHER_KEY;
    if (!on || !scopeId || !(st.gerando || (opts.aberto && semPusher))) return;
    const id = setInterval(() => void refetch(), POLL_MS);
    return () => clearInterval(id);
  }, [on, scopeId, st.gerando, opts.aberto, refetch]);

  const gerar = useCallback(async (topico?: string) => {
    if (!on || !scopeId || gerandoRef.current) return;
    gerandoRef.current = true;
    setSt((s) => ({ ...s, gerando: true, estado: "gerando", erro: null }));
    try {
      const r = await fetch("/api/map/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ scopeId, ...(topico ? { topico } : {}) }) });
      if (!r.ok) { const d = await r.json().catch(() => ({})); throw new Error(d?.error || `HTTP ${r.status}`); }
      const d = await r.json();
      if (d?.pronto) { gerandoRef.current = false; }
      void refetch();
    } catch (e: any) {
      gerandoRef.current = false;
      setSt((s) => ({ ...s, gerando: false, estado: s.mapa ? "vazia" : "sugerida", erro: e?.message ?? "falhou" }));
    }
  }, [on, scopeId, refetch]);

  return { ...st, refetch, gerar, ligado: on };
}
