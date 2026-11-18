"use client";
/**
 * CuradoriaVitrine — a aba CURADORIA do módulo da vitrine no Modo CEO (lib/estudos/curadoria). Mostra TODOS os cards
 * que a vitrine mostra (catálogo embutido, agentes da orquestra, skills do disco, cadastrados e pesquisas) e deixa o
 * dono mexer em cada um: FOTO (sobe uma imagem no lugar do emoji), título, descrição, TAGS, raridade, ordem e
 * esconder. A prévia é a própria carta da vitrine, ao vivo. Nada apaga o card original: "restaurar" tira o ajuste.
 * Escreve em /api/admin/vitrine/ajustes e /api/admin/vitrine/imagem (super-admin). O gate real é nas rotas.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import CartaVitrine from "@/components/estudos/CartaVitrine";
import { CATALOGO, NOME_TIPO, mesclarCatalogo, type ItemVitrine } from "@/lib/estudos/vitrine";
import { NOME_RARIDADE, RARIDADES, type Raridade } from "@/lib/estudos/blueprint";
import { LIMITES_AJUSTE, NOME_ORIGEM, aplicarAjuste, aplicarAjustes, origemDe, type Ajuste, type Origem } from "@/lib/estudos/curadoria";
import "@/components/estudos/vitrine-card.css";

type Rascunho = { titulo: string; subtitulo: string; tags: string[]; imagem: string | null; raridade: Raridade | ""; ordem: string; oculto: boolean };
const H = { "Content-Type": "application/json" };
const inp = "w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-[13px] text-white outline-none focus:border-cyan-400/60";
const lbl = "block text-[10px] font-bold uppercase tracking-widest text-white/40 mb-1";
const EMBUTIDOS = new Set(CATALOGO.map((i) => i.id));
const ORIGENS: Origem[] = ["catalogo", "agente", "skill", "banco", "pesquisa"];
const COR_ORIGEM: Record<Origem, string> = { catalogo: "text-sky-300 border-sky-300/30", agente: "text-violet-300 border-violet-300/30", skill: "text-emerald-300 border-emerald-300/30", banco: "text-amber-200 border-amber-200/30", pesquisa: "text-pink-300 border-pink-300/30" };

const mesmasTags = (a: string[], b: string[]) => a.length === b.length && a.every((x, i) => x === b[i]);

export default function CuradoriaVitrine({ glassPanel }: { glassPanel: string }) {
    const [base, setBase] = useState<ItemVitrine[]>(() => mesclarCatalogo([]));
    const [ajustes, setAjustes] = useState<Ajuste[]>([]);
    const [estado, setEstado] = useState<"carregando" | "ok" | "403" | "erro">("carregando");
    const [sel, setSel] = useState<string | null>(null);
    const [busca, setBusca] = useState("");
    const [origem, setOrigem] = useState<Origem | "todas" | "ocultos" | "editados">("todas");
    const [rasc, setRasc] = useState<Rascunho | null>(null);
    const [novaTag, setNovaTag] = useState("");
    const [msg, setMsg] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
    const [salvando, setSalvando] = useState(false);
    const [subindo, setSubindo] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);

    const carregar = useCallback(async () => {
        try {
            const [rA, rV] = await Promise.all([
                fetch("/api/admin/vitrine/ajustes", { cache: "no-store" }),
                fetch("/api/estudos/vitrine", { cache: "no-store" }),
            ]);
            if (rA.status === 401 || rA.status === 403) { setEstado("403"); return; }
            const a = await rA.json().catch(() => ({}));
            const v = rV.ok ? await rV.json().catch(() => ({})) : {};
            setAjustes(Array.isArray(a?.ajustes) ? a.ajustes : []);
            setBase(mesclarCatalogo(Array.isArray(v?.itens) ? v.itens : []));
            setEstado("ok");
        } catch { setEstado("erro"); }
    }, []);
    useEffect(() => { void carregar(); }, [carregar]);

    const porId = useMemo(() => new Map(ajustes.map((a) => [a.itemId, a])), [ajustes]);
    const todos = useMemo(() => aplicarAjustes(base, ajustes, { comOcultos: true }), [base, ajustes]);
    const lista = useMemo(() => {
        const q = busca.trim().toLowerCase();
        return todos.filter((it) => {
            const a = porId.get(it.id);
            if (origem === "ocultos" && !a?.oculto) return false;
            if (origem === "editados" && !a) return false;
            if (ORIGENS.includes(origem as Origem) && origemDe(it, EMBUTIDOS) !== origem) return false;
            return !q || `${it.titulo} ${it.subtitulo} ${it.autor} ${it.tags.join(" ")} ${it.id}`.toLowerCase().includes(q);
        });
    }, [todos, porId, busca, origem]);

    const original = useMemo(() => base.find((i) => i.id === sel) ?? null, [base, sel]);

    // abrir um card no editor: o rascunho começa do ajuste atual (ou do original)
    const abrir = (id: string) => {
        const it = base.find((i) => i.id === id); if (!it) return;
        const a = porId.get(id);
        setSel(id); setMsg(null); setNovaTag("");
        setRasc({
            titulo: a?.titulo ?? "", subtitulo: a?.subtitulo ?? "",
            tags: Array.isArray(a?.tags) ? [...a!.tags!] : [...it.tags],
            imagem: a?.imagem ?? null, raridade: (a?.raridade ?? "") as Raridade | "",
            ordem: typeof a?.ordem === "number" ? String(a.ordem) : "", oculto: !!a?.oculto,
        });
    };

    // a prévia: o original com o rascunho por cima
    const previa = useMemo(() => {
        if (!original || !rasc) return null;
        return aplicarAjuste(original, {
            itemId: original.id, titulo: rasc.titulo || null, subtitulo: rasc.subtitulo || null, tags: rasc.tags,
            imagem: rasc.imagem, raridade: rasc.raridade || null,
        });
    }, [original, rasc]);

    const set = <K extends keyof Rascunho>(k: K, v: Rascunho[K]) => setRasc((r) => (r ? { ...r, [k]: v } : r));
    const addTag = () => {
        const t = novaTag.trim().slice(0, LIMITES_AJUSTE.tag);
        if (!t || !rasc) return;
        if (!rasc.tags.includes(t) && rasc.tags.length < LIMITES_AJUSTE.tags) set("tags", [...rasc.tags, t]);
        setNovaTag("");
    };
    const teclaTag = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag(); }
        else if (e.key === "Backspace" && !novaTag && rasc?.tags.length) set("tags", rasc.tags.slice(0, -1));
    };

    const subirFoto = async (f: File | undefined) => {
        if (!f) return;
        setSubindo(true); setMsg(null);
        try {
            const fd = new FormData(); fd.append("file", f);
            const r = await fetch("/api/admin/vitrine/imagem", { method: "POST", body: fd });
            const j = await r.json().catch(() => ({}));
            if (!r.ok) { setMsg({ tipo: "erro", texto: j?.erro ?? "Não deu pra subir a foto." }); return; }
            set("imagem", j.url);
        } catch { setMsg({ tipo: "erro", texto: "Erro de rede ao subir a foto." }); }
        finally { setSubindo(false); if (fileRef.current) fileRef.current.value = ""; }
    };

    const salvar = async () => {
        if (!original || !rasc) return;
        setSalvando(true); setMsg(null);
        try {
            const body = {
                itemId: original.id,
                titulo: rasc.titulo.trim() || null,
                subtitulo: rasc.subtitulo.trim() || null,
                tags: mesmasTags(rasc.tags, original.tags) ? null : rasc.tags,
                imagem: rasc.imagem,
                raridade: rasc.raridade || null,
                ordem: rasc.ordem.trim() === "" ? null : Number(rasc.ordem),
                oculto: rasc.oculto,
            };
            const r = await fetch("/api/admin/vitrine/ajustes", { method: "PUT", headers: H, body: JSON.stringify(body) });
            const j = await r.json().catch(() => ({}));
            if (!r.ok) { setMsg({ tipo: "erro", texto: j?.erro ?? "Falhou." }); return; }
            setAjustes((as) => [...as.filter((a) => a.itemId !== original.id), j.ajuste]);
            setMsg({ tipo: "ok", texto: "Salvo — já vale na vitrine." });
        } catch { setMsg({ tipo: "erro", texto: "Erro de rede." }); } finally { setSalvando(false); }
    };

    const restaurar = async () => {
        if (!original || !confirm(`Restaurar "${original.titulo}" ao original? Foto, tags e textos editados saem.`)) return;
        await fetch(`/api/admin/vitrine/ajustes?itemId=${encodeURIComponent(original.id)}`, { method: "DELETE" });
        setAjustes((as) => as.filter((a) => a.itemId !== original.id));
        setRasc({ titulo: "", subtitulo: "", tags: [...original.tags], imagem: null, raridade: "", ordem: "", oculto: false });
        setMsg({ tipo: "ok", texto: "Voltou ao original." });
    };

    if (estado === "403") return (
        <div className={`flex-1 rounded-3xl p-10 ${glassPanel} flex items-center justify-center text-center`}>
            <div><div className="text-2xl font-black uppercase tracking-widest text-red-400">Acesso negado</div><p className="mt-2 text-sm text-white/50">A curadoria da vitrine é só pra super-admin.</p></div>
        </div>
    );

    const nEditados = ajustes.length, nOcultos = ajustes.filter((a) => a.oculto).length;

    return (
        <div className="flex-1 min-h-0 flex gap-5">
            {/* TODOS OS CARDS */}
            <div className={`flex-1 min-w-0 rounded-3xl p-5 ${glassPanel} flex flex-col`}>
                <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-[13px] font-black uppercase tracking-widest text-white mr-2">Todos os cards</h3>
                    {(["todas", ...ORIGENS, "editados", "ocultos"] as const).map((o) => (
                        <button key={o} onClick={() => setOrigem(o)} className={`rounded-full border px-2.5 py-1 text-[10.5px] font-bold ${origem === o ? "border-cyan-300 bg-cyan-300/15 text-white" : "border-white/15 text-white/55 hover:text-white"}`}>
                            {o === "todas" ? `todos (${todos.length})` : o === "editados" ? `editados (${nEditados})` : o === "ocultos" ? `ocultos (${nOcultos})` : NOME_ORIGEM[o]}
                        </button>
                    ))}
                    <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="buscar card, tag ou id…" className="ml-auto w-[220px] rounded-full border border-white/15 bg-black/30 px-3 py-1.5 text-[12px] text-white outline-none placeholder:text-white/30" />
                </div>
                <div className="mt-4 flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-1">
                    {estado === "carregando" && <p className="text-[13px] text-white/40">carregando…</p>}
                    {estado === "erro" && <p className="text-[13px] text-red-300">Não deu pra carregar os ajustes. Recarregue a página.</p>}
                    <div className="vt-grid grid grid-cols-[repeat(auto-fill,minmax(170px,1fr))] gap-x-6 gap-y-9 pt-5">
                        {lista.map((it) => {
                            const a = porId.get(it.id);
                            const o = origemDe(it, EMBUTIDOS);
                            return (
                                <div key={it.id} className={`relative ${a?.oculto ? "opacity-45" : ""}`}>
                                    <div className={`rounded-sm ${sel === it.id ? "outline outline-2 outline-offset-4 outline-cyan-300" : ""}`}>
                                        <CartaVitrine it={it} onClick={() => abrir(it.id)} precoNode={it.preco > 0 ? `${it.preco} SOL` : "Grátis"} />
                                    </div>
                                    <div className="mt-2 flex flex-wrap items-center gap-1">
                                        <span className={`rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${COR_ORIGEM[o]}`}>{NOME_ORIGEM[o]}</span>
                                        {a && !a.oculto && <span className="rounded border border-cyan-300/30 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-cyan-200">editado</span>}
                                        {a?.oculto && <span className="rounded border border-rose-300/40 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-rose-200">oculto</span>}
                                        {typeof a?.ordem === "number" && <span className="text-[9px] text-white/40">#{a.ordem}</span>}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    {estado === "ok" && !lista.length && <p className="mt-6 text-[13px] text-white/40">Nenhum card com esse filtro.</p>}
                </div>
            </div>

            {/* O EDITOR (com a prévia ao vivo) */}
            <div className={`w-[380px] shrink-0 rounded-3xl p-5 ${glassPanel} overflow-y-auto custom-scrollbar`}>
                {!original || !rasc || !previa ? (
                    <div className="h-full grid place-items-center text-center text-[13px] text-white/40">
                        <div>
                            <div className="text-3xl">🃏</div>
                            <p className="mt-2">Clique num card pra editar a foto, as tags e os textos.</p>
                            <p className="mt-1 text-[11px]">Nada apaga o original: dá pra restaurar quando quiser.</p>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                                <h3 className="text-[13px] font-black uppercase tracking-widest text-white">Editar card</h3>
                                <p className="mt-0.5 truncate text-[10.5px] text-white/40">{NOME_ORIGEM[origemDe(original, EMBUTIDOS)]} · {NOME_TIPO[original.tipo]} · <code>{original.id}</code></p>
                            </div>
                            <button onClick={() => { setSel(null); setRasc(null); }} className="text-[13px] text-white/40 hover:text-white" title="Fechar">✕</button>
                        </div>

                        <div className="vt-grid mx-auto mt-5 w-[200px]">
                            <CartaVitrine it={previa} precoNode={previa.preco > 0 ? `${previa.preco} SOL` : "Grátis"} className={rasc.oculto ? "opacity-50" : ""} />
                        </div>

                        <div className="mt-5 space-y-3">
                            <div>
                                <label className={lbl}>Foto do card</label>
                                <div className="flex items-center gap-2">
                                    <button type="button" disabled={subindo} onClick={() => fileRef.current?.click()} className="rounded-lg bg-cyan-500/90 px-3 py-2 text-[12px] font-black text-black hover:bg-cyan-400 disabled:opacity-50">{subindo ? "subindo…" : rasc.imagem ? "trocar foto" : "subir foto"}</button>
                                    {rasc.imagem && <button type="button" onClick={() => set("imagem", null)} className="rounded-lg border border-white/15 px-3 py-2 text-[12px] text-white/70 hover:text-white">tirar foto (volta o emoji)</button>}
                                </div>
                                <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/avif" className="hidden" onChange={(e) => subirFoto(e.target.files?.[0])} />
                                <p className="mt-1 text-[10.5px] text-white/35">PNG, JPG, WEBP, GIF ou AVIF · até 4 MB · fica melhor em retrato (63×90).</p>
                            </div>
                            <div><label className={lbl}>Título</label><input className={inp} value={rasc.titulo} maxLength={LIMITES_AJUSTE.titulo} onChange={(e) => set("titulo", e.target.value)} placeholder={original.titulo} /></div>
                            <div><label className={lbl}>Descrição (aparece no hover)</label><textarea className={`${inp} h-16 resize-none`} value={rasc.subtitulo} maxLength={LIMITES_AJUSTE.subtitulo} onChange={(e) => set("subtitulo", e.target.value)} placeholder={original.subtitulo} /></div>
                            <div>
                                <label className={lbl}>Tags</label>
                                <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-white/10 bg-black/30 px-2 py-2 focus-within:border-cyan-400/60">
                                    {rasc.tags.map((t) => (
                                        <span key={t} className="inline-flex items-center gap-1 rounded-md bg-cyan-400/15 px-2 py-0.5 text-[11.5px] text-cyan-100">
                                            {t}<button type="button" onClick={() => set("tags", rasc.tags.filter((x) => x !== t))} className="text-cyan-200/60 hover:text-white" aria-label={`tirar ${t}`}>×</button>
                                        </span>
                                    ))}
                                    <input value={novaTag} onChange={(e) => setNovaTag(e.target.value)} onKeyDown={teclaTag} onBlur={addTag} placeholder={rasc.tags.length ? "+ tag" : "digite e Enter"} className="min-w-[80px] flex-1 bg-transparent text-[12px] text-white outline-none placeholder:text-white/30" />
                                </div>
                                {!mesmasTags(rasc.tags, original.tags) && <button type="button" onClick={() => set("tags", [...original.tags])} className="mt-1 text-[10.5px] text-white/40 hover:text-white">↺ tags originais</button>}
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className={lbl}>Raridade</label>
                                    <select className={inp} value={rasc.raridade} onChange={(e) => set("raridade", e.target.value as Raridade | "")}>
                                        <option value="">original ({NOME_RARIDADE[original.raridade]})</option>
                                        {RARIDADES.map((r) => <option key={r} value={r}>{NOME_RARIDADE[r]}</option>)}
                                    </select>
                                </div>
                                <div><label className={lbl}>Ordem</label><input type="number" className={inp} value={rasc.ordem} onChange={(e) => set("ordem", e.target.value)} placeholder="natural" /></div>
                            </div>
                            <label className="flex cursor-pointer items-center gap-2 text-[12.5px] text-white/75"><input type="checkbox" checked={rasc.oculto} onChange={(e) => set("oculto", e.target.checked)} /> Esconder da vitrine</label>

                            {msg && <div className={`rounded-lg border px-3 py-2 text-[12px] ${msg.tipo === "ok" ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-200" : "border-red-500/30 bg-red-500/15 text-red-200"}`}>{msg.texto}</div>}
                            <button onClick={salvar} disabled={salvando || subindo} className="w-full rounded-xl bg-cyan-500 py-2.5 text-[13px] font-black uppercase tracking-widest text-black hover:bg-cyan-400 disabled:opacity-50">{salvando ? "Salvando…" : "Salvar"}</button>
                            {porId.has(original.id) && <button onClick={restaurar} className="w-full rounded-xl border border-white/15 py-2 text-[12px] text-white/60 hover:text-white">↺ restaurar o original</button>}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
