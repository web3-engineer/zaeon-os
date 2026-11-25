"use client";

import { useEffect, useState } from "react";

type Pessoa = { id: string; name: string | null; image: string | null; course: string | null };
type Convite = { id: string; boardId: string; titulo: string; de: string; papel: string };

export default function ConvitesBoard({ boardId, dono, abrir }: { boardId: string; dono: boolean; abrir: (id: string) => void }) {
  const [aberto, setAberto] = useState(false);
  const [nome, setNome] = useState("");
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [convites, setConvites] = useState<Convite[]>([]);
  const [papel, setPapel] = useState("editor");
  const [mensagem, setMensagem] = useState("");
  const [ocupado, setOcupado] = useState(false);
  useEffect(() => {
    let vivo = true;
    const carregar = () => fetch("/api/estudos/convites", { cache: "no-store" }).then((r) => r.ok ? r.json() : null).then((j) => { if (vivo && j) setConvites(j.convites); }).catch(() => {});
    void carregar();
    const timer = setInterval(carregar, 30000);
    return () => { vivo = false; clearInterval(timer); };
  }, []);
  useEffect(() => {
    if (!aberto || !dono || nome.trim().length < 2) { setPessoas([]); return; }
    const ctrl = new AbortController();
    const timer = setTimeout(() => { fetch(`/api/estudos/board/${boardId}/pessoas?q=${encodeURIComponent(nome.trim())}`, { signal: ctrl.signal }).then((r) => r.ok ? r.json() : null).then((j) => setPessoas(j?.pessoas ?? [])).catch(() => {}); }, 300);
    return () => { clearTimeout(timer); ctrl.abort(); };
  }, [aberto, boardId, dono, nome]);
  const convidar = async (p: Pessoa) => {
    setOcupado(true); setMensagem("");
    try {
      const r = await fetch(`/api/estudos/board/${boardId}/pessoas`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: p.id, papel }) });
      setMensagem(r.ok ? `Convite enviado para ${p.name || "colega"}.` : r.status === 409 ? "Essa pessoa já participa do board." : "Não foi possível enviar o convite.");
      if (r.ok) { setNome(""); setPessoas([]); }
    } catch { setMensagem("Sem conexão. Tente novamente."); } finally { setOcupado(false); }
  };
  const responder = async (c: Convite, aceitar: boolean) => {
    setOcupado(true); setMensagem("");
    try {
      const r = await fetch(`/api/estudos/convites/${c.id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ aceitar }) });
      if (!r.ok) { setMensagem("Não foi possível responder ao convite."); return; }
      setConvites((atual) => atual.filter((v) => v.id !== c.id));
      if (aceitar) { setAberto(false); abrir(c.boardId); }
    } catch { setMensagem("Sem conexão. Tente novamente."); } finally { setOcupado(false); }
  };
  return <div className="relative" onPointerDown={(e) => e.stopPropagation()}>
    <button type="button" onClick={() => setAberto(!aberto)} aria-expanded={aberto} className="rounded border border-sky-300/40 px-2 py-1 hover:bg-sky-300/10">pessoas{convites.length ? ` · ${convites.length}` : ""}</button>
    {aberto && <div className="absolute left-0 top-full z-[100] mt-2 w-80 max-w-[85vw] rounded border border-sky-300/40 bg-[#071e35] p-3 text-sky-50 shadow-xl" onWheel={(e) => e.stopPropagation()}>
      <div className="mb-2 flex justify-between"><strong>Compartilhar board</strong><button type="button" onClick={() => setAberto(false)} aria-label="Fechar">✕</button></div>
      {dono && <><label className="block">Nome da pessoa<input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Buscar pelo nome" className="mt-1 w-full rounded border border-sky-300/30 bg-sky-950 px-2 py-1.5" /></label>
        <label className="mt-2 block">Permissão <select value={papel} onChange={(e) => setPapel(e.target.value)} className="rounded bg-sky-950 p-1"><option value="editor">Pode editar</option><option value="leitor">Pode ver</option></select></label>
        <ul className="mt-2 max-h-40 overflow-auto">{pessoas.map((p) => <li key={p.id}><button type="button" disabled={ocupado} onClick={() => void convidar(p)} className="w-full rounded p-2 text-left hover:bg-sky-300/10">{p.name || "Sem nome"}{p.course ? ` · ${p.course}` : ""} <span className="text-sky-300/60">· {p.id.slice(-6)}</span></button></li>)}</ul></>}
      <div className="mt-3 border-t border-sky-300/20 pt-2"><strong>Convites recebidos</strong>{convites.length === 0 && <p className="mt-1 text-sky-200/60">Nenhum convite pendente.</p>}{convites.map((c) => <div key={c.id} className="mt-2 rounded border border-sky-300/20 p-2"><p>{c.de} convidou você para {c.titulo} ({c.papel === "editor" ? "editar" : "visualizar"}).</p><div className="mt-2 flex gap-2"><button disabled={ocupado} onClick={() => void responder(c, true)} className="rounded border border-sky-300/40 px-2 py-1">Aceitar</button><button disabled={ocupado} onClick={() => void responder(c, false)} className="rounded border border-sky-300/40 px-2 py-1">Recusar</button></div></div>)}</div>
      {mensagem && <p role="status" className="mt-2 text-sky-200">{mensagem}</p>}
    </div>}
  </div>;
}
