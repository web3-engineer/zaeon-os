"use client";
/**
 * useResolverSala — QUAL sala 3D abrir: convite `?sala=<token>` (POST /api/collab/join) → senão a minha mais
 * recente → senão cria uma. Compartilhado pela aba Lounge 3D e pelo cyberespaço (/lounge-cosmico).
 */
import { useCallback, useEffect, useState } from "react";

export type ErroSala = "off" | "login" | "erro" | null;

export function useResolverSala(ativo = true, tituloNova = "Minha sala de estudos") {
  const [salaId, setSalaId] = useState<string | null>(null);
  const [erro, setErro] = useState<ErroSala>(null);

  const resolver = useCallback(async () => {
    try {
      const token = new URLSearchParams(location.search).get("sala");
      if (token) {
        const r = await fetch("/api/collab/join", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) });
        if (r.ok) { const d = await r.json(); if (d?.id) { setSalaId(d.id); return; } }
      }
      const r = await fetch("/api/lounge3d", { cache: "no-store" });
      if (r.status === 404) { setErro("off"); return; }
      if (r.status === 401) { setErro("login"); return; }
      const d = await r.json();
      if (Array.isArray(d.salas) && d.salas.length) { setSalaId(d.salas[0].id); return; }
      const c = await fetch("/api/lounge3d", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: tituloNova }) });
      if (!c.ok) throw new Error(String(c.status));
      setSalaId((await c.json()).sala.id);
    } catch { setErro("erro"); }
  }, [tituloNova]);

  useEffect(() => { if (ativo) void resolver(); }, [ativo, resolver]);
  const tentarDeNovo = useCallback(() => { setErro(null); void resolver(); }, [resolver]);
  return { salaId, erro, tentarDeNovo };
}
