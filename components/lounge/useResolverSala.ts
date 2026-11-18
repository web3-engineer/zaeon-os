"use client";
/**
 * useResolverSala — QUAL sala 3D abrir: convite `?sala=<token>` (POST /api/collab/join) → no CYBERESPAÇO (`mundo`), o
 * MUNDO — a sala única que todo mundo divide (POST /api/lounge3d/mundo; sem ele, cai no resto) → senão a minha mais
 * recente → senão cria uma. Compartilhado pela aba Lounge 3D (salas privadas) e pelo cyberespaço (/lounge-cosmico).
 */
import { useCallback, useEffect, useState } from "react";

export type ErroSala = "off" | "login" | "erro" | "cheia" | null;

export function useResolverSala(ativo = true, tituloNova = "Minha sala de estudos", mundo = false, submersa = false) {
  const [salaId, setSalaId] = useState<string | null>(null);
  const [erro, setErro] = useState<ErroSala>(null);

  const resolver = useCallback(async () => {
    try {
      const token = new URLSearchParams(location.search).get("sala");
      if (token) {
        const r = await fetch("/api/collab/join", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, submersa }) });
        if (submersa && r.status === 409) { setErro("cheia"); return; }
        if (r.ok) { const d = await r.json(); if (d?.id) { setSalaId(d.id); return; } }
        if (submersa) { setErro(r.status === 401 ? "login" : "erro"); return; }
      }
      if (mundo) {   // o cyberespaço: todo mundo no MESMO servidor
        const m = await fetch("/api/lounge3d/mundo", { method: "POST" });
        if (m.status === 401) { setErro("login"); return; }
        if (m.ok) { const d = await m.json(); if (d?.id) { setSalaId(d.id); return; } }
      }
      const r = await fetch(submersa ? "/api/lounge3d?submersa=1" : "/api/lounge3d", { cache: "no-store" });
      if (r.status === 404) { setErro("off"); return; }
      if (r.status === 401) { setErro("login"); return; }
      const d = await r.json();
      const propria = Array.isArray(d.salas) ? (submersa ? d.salas.find((s: { isOwner: boolean }) => s.isOwner) : d.salas[0]) : undefined;
      if (propria?.id) { setSalaId(propria.id); return; }
      const c = await fetch("/api/lounge3d", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: tituloNova, ...(submersa ? { submersa: true } : {}) }) });
      if (!c.ok) throw new Error(String(c.status));
      setSalaId((await c.json()).sala.id);
    } catch { setErro("erro"); }
  }, [tituloNova, mundo, submersa]);

  useEffect(() => { if (ativo) void resolver(); }, [ativo, resolver]);
  const tentarDeNovo = useCallback(() => { setErro(null); void resolver(); }, [resolver]);
  return { salaId, erro, tentarDeNovo };
}
