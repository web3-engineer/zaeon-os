"use client";
/**
 * PesquisasVitrine — a aba PESQUISAS do módulo da vitrine no Modo CEO (lib/estudos/pesquisas). Duas coisas:
 *  - a FILA: o que os usuários mandaram da Sala de Pesquisa chega "pendente"; aqui o admin espia os papéis, APROVA
 *    (vira pasta na vitrine) ou RECUSA com um motivo (a pessoa vê);
 *  - PUBLICAR direto: uma pesquisa com as partes (artigo, dados, protocolo…), cada uma com texto ou link https.
 * Escreve em /api/admin/vitrine/pesquisas (super-admin ou console). O gate real é nas rotas.
 */
import { useCallback, useEffect, useState } from "react";
import { NOME_PARTE, STATUS, TIPOS_PARTE, partesDe, type StatusPesquisa, type TipoParte } from "@/lib/estudos/pesquisas";

type Linha = {
    id: string; slug: string; titulo: string; resumo: string; nicho: string; autor: string; origem: string; status: string;
    motivo?: string | null; partes: unknown; criadoEm: string; conta?: { id: string; name?: string | null } | null;
};
type ParteForm = { tipo: TipoParte; titulo: string; conteudo: string; url: string };

const H = { "Content-Type": "application/json" };
const inp = "w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-[13px] text-white outline-none focus:border-cyan-400/60";
const lbl = "block text-[10px] font-bold uppercase tracking-widest text-white/40 mb-1";
const NOME_STATUS: Record<StatusPesquisa, string> = { pendente: "Na fila", publicada: "Publicadas", recusada: "Recusadas" };
const NOME_ORIGEM: Record<string, string> = { usuario: "usuário", console: "console", admin: "admin" };
const PARTE0: ParteForm = { tipo: "artigo", titulo: "", conteudo: "", url: "" };

export default function PesquisasVitrine({ glassPanel }: { glassPanel: string }) {
    const [status, setStatus] = useState<StatusPesquisa>("pendente");
    const [linhas, setLinhas] = useState<Linha[]>([]);
    const [estado, setEstado] = useState<"carregando" | "ok" | "403" | "erro">("carregando");
    const [aberta, setAberta] = useState<string | null>(null);
    const [form, setForm] = useState({ titulo: "", resumo: "", nicho: "", contaEmail: "" });
    const [partes, setPartes] = useState<ParteForm[]>([PARTE0]);
    const [msg, setMsg] = useState<string | null>(null);
    const [salvando, setSalvando] = useState(false);

    const carregar = useCallback(async () => {
        try {
            const r = await fetch(`/api/admin/vitrine/pesquisas?status=${status}`, { cache: "no-store" });
            if (r.status === 401 || r.status === 403) { setEstado("403"); return; }
            const j = await r.json();
            setLinhas(Array.isArray(j?.pesquisas) ? j.pesquisas : []);
            setEstado("ok");
        } catch { setEstado("erro"); }
    }, [status]);
    useEffect(() => { void carregar(); }, [carregar]);

    const moderar = async (l: Linha, novo: "publicada" | "recusada") => {
        let motivo: string | null = null;
        if (novo === "recusada") {
            motivo = prompt(`Por que recusar "${l.titulo}"? (a pessoa vai ver)`) ?? null;
            if (motivo === null) return;
        }
        await fetch(`/api/admin/vitrine/pesquisas/${l.id}`, { method: "PATCH", headers: H, body: JSON.stringify({ status: novo, ...(motivo ? { motivo } : {}) }) });
        await carregar();
    };
    const remover = async (l: Linha) => {
        if (!confirm(`Apagar a pesquisa "${l.titulo}"?`)) return;
        await fetch(`/api/admin/vitrine/pesquisas/${l.id}`, { method: "DELETE" });
        await carregar();
    };

    const setParte = (i: number, k: keyof ParteForm, v: string) => setPartes((ps) => ps.map((p, j) => (j === i ? { ...p, [k]: v } : p)));
    const publicar = async () => {
        setSalvando(true); setMsg(null);
        try {
            const body = {
                titulo: form.titulo, resumo: form.resumo, nicho: form.nicho,
                ...(form.contaEmail.trim() ? { contaEmail: form.contaEmail.trim() } : {}),
                partes: partes.map((p) => ({ tipo: p.tipo, titulo: p.titulo, ...(p.conteudo.trim() ? { conteudo: p.conteudo } : {}), ...(p.url.trim() ? { url: p.url.trim() } : {}) })),
            };
            const r = await fetch("/api/admin/vitrine/pesquisas", { method: "POST", headers: H, body: JSON.stringify(body) });
            const j = await r.json().catch(() => ({}));
            if (!r.ok) { setMsg(j?.erro ?? "Falhou."); return; }
            setForm({ titulo: "", resumo: "", nicho: "", contaEmail: "" }); setPartes([PARTE0]);
            setStatus("publicada"); await carregar();
        } catch { setMsg("Erro de rede."); } finally { setSalvando(false); }
    };

    if (estado === "403") return (
        <div className={`flex-1 rounded-3xl p-10 ${glassPanel} flex items-center justify-center text-center`}>
            <div><div className="text-2xl font-black uppercase tracking-widest text-red-400">Acesso negado</div><p className="mt-2 text-sm text-white/50">A gestão das pesquisas é só pra super-admin.</p></div>
        </div>
    );

    return (
        <div className="flex-1 min-h-0 flex gap-5">
            {/* PUBLICAR direto */}
            <div className={`w-[360px] shrink-0 rounded-3xl p-5 ${glassPanel} overflow-y-auto custom-scrollbar`}>
                <h3 className="text-[13px] font-black uppercase tracking-widest text-white">Nova pesquisa</h3>
                <p className="mt-1 text-[11px] text-white/40">Entra publicada, como uma pasta. Cada parte é um papel dentro dela.</p>
                <div className="mt-4 space-y-3">
                    <div><label className={lbl}>Título</label><input className={inp} value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} /></div>
                    <div><label className={lbl}>Nicho</label><input className={inp} value={form.nicho} onChange={(e) => setForm({ ...form, nicho: e.target.value })} placeholder="ex.: Biologia do solo" /></div>
                    <div><label className={lbl}>Resumo</label><textarea className={`${inp} h-20 resize-none`} value={form.resumo} onChange={(e) => setForm({ ...form, resumo: e.target.value })} /></div>
                    <div><label className={lbl}>Conta que publica (e-mail, opcional)</label><input className={inp} value={form.contaEmail} onChange={(e) => setForm({ ...form, contaEmail: e.target.value })} placeholder="sem conta = autor Zaeon" /></div>
                    {partes.map((p, i) => (
                        <div key={i} className="rounded-xl border border-white/10 bg-black/20 p-3 space-y-2">
                            <div className="flex items-center gap-2">
                                <select className={`${inp} w-[130px]`} value={p.tipo} onChange={(e) => setParte(i, "tipo", e.target.value)}>{TIPOS_PARTE.map((t) => <option key={t} value={t}>{NOME_PARTE[t]}</option>)}</select>
                                <input className={inp} value={p.titulo} onChange={(e) => setParte(i, "titulo", e.target.value)} placeholder={`título (padrão: ${NOME_PARTE[p.tipo]})`} />
                                {partes.length > 1 && <button onClick={() => setPartes((ps) => ps.filter((_, j) => j !== i))} className="text-[13px] text-red-400" title="tirar esta parte">×</button>}
                            </div>
                            <textarea className={`${inp} h-20 resize-y`} value={p.conteudo} onChange={(e) => setParte(i, "conteudo", e.target.value)} placeholder="o texto (markdown ou CSV)…" />
                            <input className={inp} value={p.url} onChange={(e) => setParte(i, "url", e.target.value)} placeholder="…e/ou um link https" />
                        </div>
                    ))}
                    {partes.length < 12 && <button onClick={() => setPartes((ps) => [...ps, { ...PARTE0, tipo: "dados" }])} className="text-[11px] text-cyan-300 hover:text-cyan-100">+ outra parte</button>}
                    {msg && <div className="rounded-lg bg-red-500/15 border border-red-500/30 px-3 py-2 text-[12px] text-red-200">{msg}</div>}
                    <button onClick={publicar} disabled={salvando} className="w-full rounded-xl bg-cyan-500 py-2.5 text-[13px] font-black uppercase tracking-widest text-black hover:bg-cyan-400 disabled:opacity-50">{salvando ? "Publicando…" : "Publicar pesquisa"}</button>
                </div>
            </div>

            {/* A FILA e as publicadas/recusadas */}
            <div className={`flex-1 min-w-0 rounded-3xl p-5 ${glassPanel} overflow-y-auto custom-scrollbar`}>
                <div className="flex flex-wrap items-center gap-2">
                    {STATUS.map((s) => (
                        <button key={s} onClick={() => setStatus(s)} className={`rounded-full border px-3 py-1 text-[11px] font-bold ${status === s ? "border-cyan-300 bg-cyan-300/15 text-white" : "border-white/15 text-white/55 hover:text-white"}`}>{NOME_STATUS[s]}</button>
                    ))}
                    <span className="ml-auto text-[11px] text-white/40">{estado === "carregando" ? "carregando…" : `${linhas.length} pesquisa(s)`}</span>
                </div>
                <div className="mt-4 space-y-2">
                    {estado === "ok" && linhas.length === 0 && <p className="text-[13px] text-white/40">{status === "pendente" ? "A fila está vazia." : "Nada aqui ainda."}</p>}
                    {linhas.map((l) => {
                        const ps = partesDe(l.partes);
                        return (
                            <div key={l.id} className="rounded-xl border border-white/10 bg-black/20 px-3 py-2.5">
                                <div className="flex items-center gap-3">
                                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white/5 text-[18px]">📂</div>
                                    <div className="min-w-0 flex-1">
                                        <div className="truncate text-[13px] font-semibold text-white">{l.titulo}</div>
                                        <div className="truncate text-[11px] text-white/45">{l.conta?.name || l.autor || "Zaeon"} · via {NOME_ORIGEM[l.origem] ?? l.origem} · {ps.length} parte(s){l.nicho ? ` · ${l.nicho}` : ""}</div>
                                        {l.status === "recusada" && l.motivo && <div className="truncate text-[11px] text-rose-300/80">motivo: {l.motivo}</div>}
                                    </div>
                                    <button onClick={() => setAberta(aberta === l.id ? null : l.id)} className="text-[11px] text-white/50 hover:text-white">{aberta === l.id ? "fechar" : "espiar"}</button>
                                    {l.status !== "publicada" && <button onClick={() => moderar(l, "publicada")} className="text-[11px] font-bold text-emerald-300 hover:text-emerald-200">aprovar</button>}
                                    {l.status !== "recusada" && <button onClick={() => moderar(l, "recusada")} className="text-[11px] text-amber-300 hover:text-amber-200">recusar</button>}
                                    <button onClick={() => remover(l)} className="text-[11px] text-red-400 hover:text-red-300">apagar</button>
                                </div>
                                {aberta === l.id && (
                                    <div className="mt-3 space-y-2 border-t border-white/10 pt-3">
                                        {l.resumo && <p className="text-[12px] text-white/70 whitespace-pre-wrap">{l.resumo}</p>}
                                        {ps.map((p, i) => (
                                            <details key={i} className="rounded-lg bg-black/30 px-3 py-2">
                                                <summary className="cursor-pointer text-[12px] text-white/80"><b>{NOME_PARTE[p.tipo]}</b> · {p.titulo}{p.url ? " · link" : ""}{p.conteudo ? ` · ${p.conteudo.length.toLocaleString("pt-BR")} caracteres` : ""}</summary>
                                                {p.url && <a href={p.url} target="_blank" rel="noopener noreferrer" className="mt-2 block truncate text-[11px] text-cyan-300">{p.url}</a>}
                                                {p.conteudo && <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap text-[11.5px] leading-relaxed text-white/70">{p.conteudo.slice(0, 6000)}{p.conteudo.length > 6000 ? "\n…" : ""}</pre>}
                                            </details>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
