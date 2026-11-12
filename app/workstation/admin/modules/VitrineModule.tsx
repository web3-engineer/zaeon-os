"use client";
/**
 * VitrineModule — o CRUD dos cards da VITRINE ("Marketplace") no Modo CEO. Lista todos os itens, cria/edita por um
 * formulário e remove. Escreve em /api/admin/vitrine (super-admin); a vitrine pública (components/estudos/VitrineEstudos)
 * junta os ativos com o catálogo embutido. O gate real é nas rotas — aqui a UI só reage ao 401/403.
 * A aba CURADORIA (CuradoriaVitrine) mostra TODOS os cards da vitrine — de qualquer origem — com foto, tags, textos,
 * raridade, ordem e ocultar editáveis. A aba PESQUISAS (PesquisasVitrine) é a fila de moderação e a publicação das
 * pastas de pesquisa. A aba NOVOS CARDS é o CRUD dos cards cadastrados no banco.
 */
import { useCallback, useEffect, useState } from "react";
import { TIPOS, EXECUCOES, MODELOS, RARIDADES } from "@/lib/estudos/vitrineAdmin";
import { NOME_TIPO } from "@/lib/estudos/vitrine";
import { NOME_RARIDADE } from "@/lib/estudos/blueprint";
import PesquisasVitrine from "./PesquisasVitrine";
import CuradoriaVitrine from "./CuradoriaVitrine";

type Row = {
    id: string; slug: string; titulo: string; subtitulo: string; tipo: string; execucao: string; modelo: string;
    autor: string; raridade: string; profundidade: number; preco: number; fracoesTotal: number; fracoesVendidas: number;
    supervisionado: boolean; linksOk: boolean; codigoPrivado: boolean; entrega: string[]; tags: string[]; ironia: boolean;
    ativo: boolean; ordem: number;
};

const GLYPH: Record<string, string> = { console: "🎮", chip: "🧠", planta: "🌱", predio: "🏛️", drone: "🚁", foguete: "🚀", molecula: "🧬", engrenagem: "⚙️", livro: "📖", graos: "☕", ondas: "📡", robo: "🤖" };

type Form = {
    slug: string; titulo: string; subtitulo: string; autor: string; tipo: string; execucao: string; modelo: string;
    raridade: string; profundidade: number; preco: number; fracoesTotal: number; fracoesVendidas: number; entrega: string;
    tags: string; supervisionado: boolean; linksOk: boolean; codigoPrivado: boolean; ironia: boolean; ativo: boolean; ordem: number;
};
const FORM0: Form = {
    slug: "", titulo: "", subtitulo: "", autor: "", tipo: "curso", execucao: "dyom", modelo: "livro", raridade: "comum",
    profundidade: 50, preco: 0, fracoesTotal: 1, fracoesVendidas: 0, entrega: "", tags: "", supervisionado: false,
    linksOk: true, codigoPrivado: false, ironia: false, ativo: true, ordem: 0,
};

const H = { "Content-Type": "application/json" };
const inp = "w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-[13px] text-white outline-none focus:border-cyan-400/60";
const lbl = "block text-[10px] font-bold uppercase tracking-widest text-white/40 mb-1";

export default function VitrineModule({ glassPanel }: { glassPanel: string }) {
    const [itens, setItens] = useState<Row[]>([]);
    const [estado, setEstado] = useState<"carregando" | "ok" | "403" | "erro">("carregando");
    const [form, setForm] = useState<Form>(FORM0);
    const [editId, setEditId] = useState<string | null>(null);
    const [msg, setMsg] = useState<string | null>(null);
    const [salvando, setSalvando] = useState(false);
    const [aba, setAba] = useState<"curadoria" | "cards" | "pesquisas">("curadoria");

    const carregar = useCallback(async () => {
        try {
            const r = await fetch("/api/admin/vitrine", { cache: "no-store" });
            if (r.status === 401 || r.status === 403) { setEstado("403"); return; }
            const j = await r.json();
            setItens(Array.isArray(j?.itens) ? j.itens : []);
            setEstado("ok");
        } catch { setEstado("erro"); }
    }, []);
    useEffect(() => { void carregar(); }, [carregar]);

    const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));
    const novo = () => { setEditId(null); setForm(FORM0); setMsg(null); };
    const editar = (it: Row) => {
        setEditId(it.id); setMsg(null);
        setForm({
            slug: it.slug, titulo: it.titulo, subtitulo: it.subtitulo ?? "", autor: it.autor ?? "", tipo: it.tipo,
            execucao: it.execucao, modelo: it.modelo, raridade: it.raridade, profundidade: it.profundidade, preco: it.preco,
            fracoesTotal: it.fracoesTotal, fracoesVendidas: it.fracoesVendidas, entrega: (it.entrega ?? []).join("\n"),
            tags: (it.tags ?? []).join(", "), supervisionado: it.supervisionado, linksOk: it.linksOk,
            codigoPrivado: it.codigoPrivado, ironia: it.ironia, ativo: it.ativo, ordem: it.ordem,
        });
    };

    const salvar = async () => {
        setSalvando(true); setMsg(null);
        try {
            const body = JSON.stringify(form);
            const r = editId
                ? await fetch(`/api/admin/vitrine/${editId}`, { method: "PATCH", headers: H, body })
                : await fetch("/api/admin/vitrine", { method: "POST", headers: H, body });
            const j = await r.json().catch(() => ({}));
            if (!r.ok) { setMsg(j?.error ?? "Falhou."); return; }
            await carregar(); novo();
        } catch { setMsg("Erro de rede."); } finally { setSalvando(false); }
    };
    const remover = async (it: Row) => {
        if (!confirm(`Remover "${it.titulo}" da vitrine?`)) return;
        await fetch(`/api/admin/vitrine/${it.id}`, { method: "DELETE" });
        if (editId === it.id) novo();
        await carregar();
    };
    const alternarAtivo = async (it: Row) => {
        await fetch(`/api/admin/vitrine/${it.id}`, { method: "PATCH", headers: H, body: JSON.stringify({ ativo: !it.ativo }) });
        await carregar();
    };

    if (estado === "403") return (
        <div className={`flex-1 rounded-3xl p-10 ${glassPanel} flex items-center justify-center text-center`}>
            <div><div className="text-2xl font-black uppercase tracking-widest text-red-400">Acesso negado</div><p className="mt-2 text-sm text-white/50">A gestão da vitrine é só pra super-admin.</p></div>
        </div>
    );

    const abas = (
        <div className="flex gap-2">
            {([["curadoria", "✦ Curadoria"], ["cards", "Novos cards"], ["pesquisas", "▤ Pesquisas"]] as const).map(([id, nome]) => (
                <button key={id} onClick={() => setAba(id)} className={`rounded-full border px-4 py-1.5 text-[11px] font-black uppercase tracking-widest ${aba === id ? "border-cyan-300 bg-cyan-300/15 text-white" : "border-white/15 text-white/55 hover:text-white"}`}>{nome}</button>
            ))}
        </div>
    );
    if (aba === "curadoria") return <div className="flex-1 min-h-0 flex flex-col gap-3">{abas}<CuradoriaVitrine glassPanel={glassPanel} /></div>;
    if (aba === "pesquisas") return <div className="flex-1 min-h-0 flex flex-col gap-3">{abas}<PesquisasVitrine glassPanel={glassPanel} /></div>;

    return (
        <div className="flex-1 min-h-0 flex flex-col gap-3">{abas}
        <div className="flex-1 min-h-0 flex gap-5">
            {/* FORMULÁRIO (criar/editar) */}
            <div className={`w-[360px] shrink-0 rounded-3xl p-5 ${glassPanel} overflow-y-auto custom-scrollbar`}>
                <div className="flex items-center justify-between">
                    <h3 className="text-[13px] font-black uppercase tracking-widest text-white">{editId ? "Editar card" : "Novo card"}</h3>
                    {editId && <button onClick={novo} className="text-[11px] text-cyan-300 hover:text-cyan-100">+ novo</button>}
                </div>

                <div className="mt-4 space-y-3">
                    <div><label className={lbl}>Título</label><input className={inp} value={form.titulo} onChange={(e) => set("titulo", e.target.value)} placeholder="Ex.: Engenharia reversa do PS5" /></div>
                    <div><label className={lbl}>Descrição</label><textarea className={`${inp} h-16 resize-none`} value={form.subtitulo} onChange={(e) => set("subtitulo", e.target.value)} placeholder="uma linha que cria desejo" /></div>
                    <div><label className={lbl}>Autor</label><input className={inp} value={form.autor} onChange={(e) => set("autor", e.target.value)} placeholder="quem criou" /></div>

                    <div className="grid grid-cols-2 gap-3">
                        <div><label className={lbl}>Tipo</label><select className={inp} value={form.tipo} onChange={(e) => set("tipo", e.target.value)}>{TIPOS.map((t) => <option key={t} value={t}>{NOME_TIPO[t]}</option>)}</select></div>
                        <div><label className={lbl}>Raridade</label><select className={inp} value={form.raridade} onChange={(e) => set("raridade", e.target.value)}>{RARIDADES.map((r) => <option key={r} value={r}>{NOME_RARIDADE[r]}</option>)}</select></div>
                        <div><label className={lbl}>Ícone</label><select className={inp} value={form.modelo} onChange={(e) => set("modelo", e.target.value)}>{MODELOS.map((m) => <option key={m} value={m}>{GLYPH[m]} {m}</option>)}</select></div>
                        <div><label className={lbl}>Execução</label><select className={inp} value={form.execucao} onChange={(e) => set("execucao", e.target.value)}>{EXECUCOES.map((x) => <option key={x} value={x}>{x === "dyom" ? "Faça você mesmo" : "Um agente faz"}</option>)}</select></div>
                        <div><label className={lbl}>Preço (SOL)</label><input type="number" min={0} step="0.01" className={inp} value={form.preco} onChange={(e) => set("preco", Number(e.target.value))} /></div>
                        <div><label className={lbl}>Profundidade (0-100)</label><input type="number" min={0} max={100} className={inp} value={form.profundidade} onChange={(e) => set("profundidade", Number(e.target.value))} /></div>
                        <div><label className={lbl}>Frações (total)</label><input type="number" min={1} className={inp} value={form.fracoesTotal} onChange={(e) => set("fracoesTotal", Number(e.target.value))} /></div>
                        <div><label className={lbl}>Frações vendidas</label><input type="number" min={0} className={inp} value={form.fracoesVendidas} onChange={(e) => set("fracoesVendidas", Number(e.target.value))} /></div>
                    </div>

                    <div><label className={lbl}>O que vem (uma por linha)</label><textarea className={`${inp} h-20 resize-none`} value={form.entrega} onChange={(e) => set("entrega", e.target.value)} placeholder={"12 aulas em vídeo\no blueprint comentado"} /></div>
                    <div><label className={lbl}>Tags (vírgula)</label><input className={inp} value={form.tags} onChange={(e) => set("tags", e.target.value)} placeholder="hardware, segurança" /></div>

                    <div className="flex flex-wrap gap-x-4 gap-y-2 pt-1 text-[12px] text-white/70">
                        {([["supervisionado", "Supervisionado"], ["linksOk", "Links ok"], ["codigoPrivado", "Código privado"], ["ironia", "Ironia"], ["ativo", "Ativo (visível)"]] as [keyof Form, string][]).map(([k, t]) => (
                            <label key={k} className="flex items-center gap-1.5 cursor-pointer"><input type="checkbox" checked={form[k] as boolean} onChange={(e) => set(k, e.target.checked as never)} /> {t}</label>
                        ))}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div><label className={lbl}>Ordem</label><input type="number" className={inp} value={form.ordem} onChange={(e) => set("ordem", Number(e.target.value))} /></div>
                        <div><label className={lbl}>Slug {editId ? "" : "(auto)"}</label><input className={inp} value={form.slug} onChange={(e) => set("slug", e.target.value)} placeholder="auto do título" disabled={!!editId} /></div>
                    </div>

                    {msg && <div className="rounded-lg bg-red-500/15 border border-red-500/30 px-3 py-2 text-[12px] text-red-200">{msg}</div>}
                    <button onClick={salvar} disabled={salvando} className="w-full rounded-xl bg-cyan-500 py-2.5 text-[13px] font-black uppercase tracking-widest text-black hover:bg-cyan-400 disabled:opacity-50">
                        {salvando ? "Salvando…" : editId ? "Salvar alterações" : "Criar card"}
                    </button>
                </div>
            </div>

            {/* LISTA */}
            <div className={`flex-1 min-w-0 rounded-3xl p-5 ${glassPanel} overflow-y-auto custom-scrollbar`}>
                <div className="flex items-center justify-between">
                    <h3 className="text-[13px] font-black uppercase tracking-widest text-white">Cards da vitrine</h3>
                    <span className="text-[11px] text-white/40">{estado === "carregando" ? "carregando…" : `${itens.length} item(ns)`}</span>
                </div>
                <div className="mt-4 space-y-2">
                    {estado === "ok" && itens.length === 0 && <p className="text-[13px] text-white/40">Nenhum card ainda. Crie o primeiro no formulário ao lado.</p>}
                    {itens.map((it) => (
                        <div key={it.id} className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 ${editId === it.id ? "border-cyan-400/60 bg-cyan-400/5" : "border-white/10 bg-black/20"}`}>
                            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white/5 text-[18px]">{GLYPH[it.modelo] ?? "✦"}</div>
                            <div className="min-w-0 flex-1">
                                <div className="truncate text-[13px] font-semibold text-white">{it.titulo} {!it.ativo && <span className="ml-1 text-[10px] text-amber-300">(oculto)</span>}</div>
                                <div className="truncate text-[11px] text-white/45">{NOME_RARIDADE[it.raridade as keyof typeof NOME_RARIDADE] ?? it.raridade} · {NOME_TIPO[it.tipo as keyof typeof NOME_TIPO] ?? it.tipo} · {it.preco > 0 ? `${it.preco} SOL` : "Grátis"}</div>
                            </div>
                            <button onClick={() => alternarAtivo(it)} title={it.ativo ? "Ocultar" : "Mostrar"} className="text-[11px] text-white/50 hover:text-white">{it.ativo ? "ocultar" : "mostrar"}</button>
                            <button onClick={() => editar(it)} className="text-[11px] text-cyan-300 hover:text-cyan-100">editar</button>
                            <button onClick={() => remover(it)} className="text-[11px] text-red-400 hover:text-red-300">remover</button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
        </div>
    );
}
