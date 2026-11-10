"use client";
/**
 * VitrineEstudos — a VITRINE de blueprints em "Estudos" (lib/estudos/vitrine): todo conhecimento pode ser vendido, em
 * frações, em SOL (Solana) — e no cyberespaço os estudos são itens de COLECIONADOR. Cada card é uma CARTA CYBERDECK
 * (retrato, chanfro, moldura de neon que corre, lombada de raridade, colchetes de HUD, nº de série, barra de energia e o
 * DESENHO do tema em emoji/ícone). No hover a carta "liga". Clicar abre o RITUAL DE CONEXÃO: a carta vira destaque,
 * girando devagar em 3D, com os dados numa barra discreta embaixo e só o botão CONECTAR em evidência. Ao conectar: a
 * carta para RETA, as prensas FINAS entram simétricas, a energia flui estilo TRON no contato, a compra/plug acontece e
 * então a carta DESINTEGRA e sai de cena — indo pra aba "Já conectados", com uma notificação sutil de onde ela ficou
 * disponível (chat / Sala de Estudos / Escritório). O catálogo é simulado e a compra em SOL ainda não está no ar.
 */
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { CATALOGO, FILTROS, NOME_TIPO, filtrarVitrine, precoTexto, type FiltroVitrine, type ItemVitrine } from "@/lib/estudos/vitrine";
import { COR_RARIDADE, NOME_RARIDADE } from "@/lib/estudos/blueprint";
import { plugar, desplugar, usePluginsChat } from "@/lib/plugins/chatPlugins";
import { ehAgenteOrquestra } from "@/lib/orquestra/catalogo";
import SolanaMark from "@/components/solana/SolanaMark";
import CartaVitrine, { GLYPH, segmentos } from "./CartaVitrine";
import "./vitrine-card.css";
import "./vitrine-claim.css";

/** onde a feature fica disponível DEPOIS de conectar (pra notificação) */
const destinoDe = (it: ItemVitrine) =>
    it.tipo === "agente" ? "no chat" : (it.tipo === "negocio" || it.tipo === "rwa") ? "no Escritório" : "na Sala de Estudos";

// ── os itens JÁ CONECTADOS (plugáveis e comprados), por pessoa, no navegador ──
const CHAVE_CONECTADOS = "zaeon.vitrine.conectados";
const EVT_CONECTADOS = "zaeon:vitrine:conectados";
const conectadosLista = (): string[] => { try { const v = JSON.parse(localStorage.getItem(CHAVE_CONECTADOS) || "[]"); return Array.isArray(v) ? v : []; } catch { return []; } };
const conectarItem = (id: string) => {
    const l = conectadosLista();
    if (!l.includes(id)) { const n = [...l, id]; try { localStorage.setItem(CHAVE_CONECTADOS, JSON.stringify(n)); } catch { /* storage bloqueado */ } window.dispatchEvent(new CustomEvent(EVT_CONECTADOS, { detail: n })); }
};
/** DESCONECTAR: tira da lista (e, se for plugin de chat, despluga) — a carta volta a aparecer normalmente na vitrine */
const desconectarItem = (id: string) => {
    const n = conectadosLista().filter((x) => x !== id);
    try { localStorage.setItem(CHAVE_CONECTADOS, JSON.stringify(n)); } catch { /* storage bloqueado */ }
    window.dispatchEvent(new CustomEvent(EVT_CONECTADOS, { detail: n }));
};
function useConectados(): string[] {
    const [lista, setLista] = useState<string[]>([]);
    useEffect(() => {
        setLista(conectadosLista());
        const f = (e: Event) => setLista(((e as CustomEvent).detail as string[]) ?? conectadosLista());
        const s = (e: StorageEvent) => { if (e.key === CHAVE_CONECTADOS) setLista(conectadosLista()); };
        window.addEventListener(EVT_CONECTADOS, f); window.addEventListener("storage", s);
        return () => { window.removeEventListener(EVT_CONECTADOS, f); window.removeEventListener("storage", s); };
    }, []);
    return lista;
}

// estilhaços determinísticos (sem random — evita pulo em re-render) pra desintegração
const SHARDS = Array.from({ length: 18 }, (_, i) => {
    const esq = i % 2 === 0;
    const dx = (esq ? -1 : 1) * (150 + ((i * 37) % 130));
    const dy = (((i * 53) % 200) - 100);
    const rot = (((i * 71) % 220) - 110);
    return { left: 8 + ((i * 29) % 80), top: 8 + ((i * 41) % 80), dx, dy, rot, d: (i % 5) * 40 };
});

export default function VitrineEstudos() {
    const [filtro, setFiltro] = useState<FiltroVitrine>("todos");
    const [filtrosAbertos, setFiltrosAbertos] = useState(false);
    const [busca, setBusca] = useState("");
    const [verConectados, setVerConectados] = useState(false);
    const plugados = usePluginsChat();
    const conectados = useConectados();
    const desconectar = (it: ItemVitrine) => { desconectarItem(it.id); if (it.plugavel) desplugar(it.plugavel); };
    // o ESTADO dos agentes da orquestra pra este aluno (liberado / exige plano / em breve) — lib/orquestra/loja
    const [estadoOrq, setEstadoOrq] = useState<Record<string, { estado: string; aviso: string | null }>>({});
    useEffect(() => {
        let vivo = true;
        fetch("/api/orquestra/agentes", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).then((d) => {
            if (!vivo || !Array.isArray(d?.agentes)) return;
            setEstadoOrq(Object.fromEntries(d.agentes.map((a: { id: string; estado: string; aviso: string | null }) => [a.id, { estado: a.estado, aviso: a.aviso }])));
        }).catch(() => undefined);
        return () => { vivo = false; };
    }, []);

    // os cards cadastrados no ADMIN (/api/estudos/vitrine, só ativos) — juntam-se ao catálogo embutido
    const [itensDb, setItensDb] = useState<ItemVitrine[]>([]);
    useEffect(() => {
        let vivo = true;
        fetch("/api/estudos/vitrine", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).then((d) => {
            if (vivo && Array.isArray(d?.itens)) setItensDb(d.itens as ItemVitrine[]);
        }).catch(() => undefined);
        return () => { vivo = false; };
    }, []);

    const estaConectado = (it: ItemVitrine) => conectados.includes(it.id) || (!!it.plugavel && plugados.includes(it.plugavel));

    // ── o RITUAL DE CONEXÃO (dois estágios + desintegração) ──
    const [inspecionando, setInspecionando] = useState<ItemVitrine | null>(null);
    const [fases, setFases] = useState<{ open?: boolean; forja?: boolean; clamp?: boolean; impact?: boolean; lit?: boolean; desintegra?: boolean }>({});
    const [aviso, setAviso] = useState<{ titulo: string; destino: string } | null>(null);
    const spinRef = useRef<HTMLDivElement>(null);
    const forjandoRef = useRef(false);
    const timersRef = useRef<number[]>([]);
    const inspecionar = (it: ItemVitrine) => { forjandoRef.current = false; setFases({}); setInspecionando(it); };
    const fecharInspect = () => { forjandoRef.current = false; timersRef.current.forEach(clearTimeout); timersRef.current = []; setFases({}); setInspecionando(null); };
    const confirmar = () => { forjandoRef.current = true; setFases((f) => ({ ...f, forja: true })); };

    useEffect(() => {
        if (!inspecionando) return;
        const it = inspecionando;
        const rafOpen = requestAnimationFrame(() => setFases((f) => ({ ...f, open: true })));
        let angle = 0, raf = 0, settled = false;
        const loop = () => {
            raf = requestAnimationFrame(loop);
            const card = spinRef.current; if (!card) return;
            if (!forjandoRef.current) {
                angle = (angle + 0.5) % 360;                         // giro de vitrine
                card.style.transform = `rotateY(${angle}deg)`;
            } else if (!settled) {
                const target = Math.ceil((angle + 0.001) / 360) * 360, d = target - angle;   // para na próxima FRENTE (reta)
                angle += Math.max(0.9, d * 0.14);
                if (d <= 1.2) {
                    settled = true; card.style.transform = "rotateY(0deg)";
                    timersRef.current.push(
                        window.setTimeout(() => setFases((f) => ({ ...f, clamp: true })), 70),             // prensas finas deslizam
                        window.setTimeout(() => setFases((f) => ({ ...f, impact: true, lit: true })), 700), // CONTATO: energia Tron + flash + carga
                        window.setTimeout(() => setFases((f) => ({ ...f, impact: false })), 1160),
                        window.setTimeout(() => { conectarItem(it.id); if (it.plugavel) plugar(it.plugavel); }, 1700), // COMPRA/PLUG acontece
                        window.setTimeout(() => setFases((f) => ({ ...f, desintegra: true })), 1860),        // a carta desintegra e sai de cena
                        window.setTimeout(() => { setAviso({ titulo: it.titulo, destino: destinoDe(it) }); fecharInspect(); }, 2600),
                    );
                } else {
                    card.style.transform = `rotateY(${angle % 360}deg)`;
                }
            }
        };
        raf = requestAnimationFrame(loop);
        return () => { cancelAnimationFrame(rafOpen); cancelAnimationFrame(raf); timersRef.current.forEach(clearTimeout); timersRef.current = []; };
    }, [inspecionando]);

    // a notificação some sozinha
    useEffect(() => { if (!aviso) return; const t = window.setTimeout(() => setAviso(null), 4900); return () => clearTimeout(t); }, [aviso]);

    // junta os cards do admin (banco) com o catálogo embutido
    const catalogo = useMemo(() => [...itensDb, ...CATALOGO], [itensDb]);
    const itens = useMemo(() => filtrarVitrine(catalogo, filtro, busca), [catalogo, filtro, busca]);
    const itensConectados = useMemo(() => catalogo.filter((i) => conectados.includes(i.id) || (i.plugavel && plugados.includes(i.plugavel))), [catalogo, conectados, plugados]);
    const mostra = verConectados ? itensConectados : itens;

    return (
        <div className="relative h-full w-full overflow-hidden" style={{ background: "radial-gradient(ellipse at 50% 0%, #0f3460 0%, #071a33 55%, #030c1a 100%)" }}>
            <div className="absolute inset-0 overflow-y-auto">
                <div className="mx-auto max-w-[1280px] px-4 pb-16 pt-6 md:px-8">
                    {/* barra enxuta: os FILTROS ficam escondidos atrás de um único botão que expande; só "Já conectados" e a busca ficam à mostra */}
                    <div className="flex flex-wrap items-center gap-2">
                        <button type="button" onClick={() => setFiltrosAbertos((v) => !v)} aria-expanded={filtrosAbertos} className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-mono text-[11px] tracking-wide transition ${!verConectados && filtro !== "todos" ? "border-sky-300 bg-sky-300/15 text-white" : "border-sky-300/25 text-sky-100/70 hover:text-white"}`}>
                            <span>⚙ Filtros{!verConectados && filtro !== "todos" ? ` · ${FILTROS.find((f) => f.id === filtro)?.nome ?? ""}` : ""}</span>
                            <span aria-hidden className={`transition-transform ${filtrosAbertos ? "rotate-180" : ""}`}>▾</span>
                        </button>
                        <button type="button" onClick={() => setVerConectados((v) => !v)} className={`rounded-full border px-3 py-1.5 font-mono text-[11px] tracking-wide transition ${verConectados ? "border-emerald-300 bg-emerald-300/15 text-emerald-100" : "border-emerald-300/30 text-emerald-200/70 hover:text-emerald-100"}`}>✓ Já conectados{itensConectados.length ? ` (${itensConectados.length})` : ""}</button>
                        <input value={busca} onChange={(e) => { setBusca(e.target.value); setVerConectados(false); }} placeholder="buscar blueprint…" className="ml-auto min-w-[200px] rounded-full border border-sky-300/25 bg-sky-950/40 px-3 py-1.5 font-mono text-[12px] text-sky-50 outline-none placeholder:text-sky-200/40" />
                    </div>
                    {filtrosAbertos && (
                        <div className="mt-2 flex flex-wrap gap-2">
                            {FILTROS.map((f) => (
                                <button key={f.id} type="button" onClick={() => { setFiltro(f.id); setVerConectados(false); }} className={`rounded-full border px-3 py-1.5 font-mono text-[11px] tracking-wide transition ${!verConectados && filtro === f.id ? "border-sky-300 bg-sky-300/15 text-white" : "border-sky-300/25 text-sky-100/70 hover:text-white"}`}>{f.nome}</button>
                            ))}
                        </div>
                    )}

                    <div className="vt-grid mt-6 grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-x-10 gap-y-14">
                        {mostra.map((it) => {
                            const orq = it.plugavel ? ehAgenteOrquestra(it.plugavel) : false;
                            const planoPro = !!it.plugavel && orq;
                            const graa = !planoPro && it.preco <= 0;
                            const conectado = estaConectado(it);
                            const precoNode = planoPro ? "no plano Pro" : graa ? "Grátis" : <><SolanaMark size={13} title="SOL" />{it.preco.toLocaleString("pt-BR")}</>;
                            const acaoNode = verConectados
                                ? <button type="button" className="vt-desplug" onClick={(e) => { e.stopPropagation(); desconectar(it); }}>⊘ desconectar</button>
                                : conectado
                                    ? <span className="vt-conectado">✓ conectado</span>
                                    : <button type="button" className="vt-plug" onClick={(e) => { e.stopPropagation(); inspecionar(it); }}>{it.plugavel ? "⌁ plug" : "comprar"}</button>;
                            return (
                                <CartaVitrine
                                    key={it.id}
                                    it={it}
                                    onClick={verConectados ? undefined : () => inspecionar(it)}
                                    badgeGratis={it.preco === 0 && !orq}
                                    precoFree={graa}
                                    precoNode={precoNode}
                                    acaoNode={acaoNode}
                                />
                            );
                        })}
                    </div>
                    {!mostra.length && <p className="mt-10 text-center font-mono text-[12px] text-sky-200/60">{verConectados ? "você ainda não conectou nenhum blueprint" : "nenhum blueprint com esse filtro"}</p>}
                </div>
            </div>

            {/* ── O RITUAL DE CONEXÃO: inspecionar (carta girando + barra discreta) → conectar (prensas finas + Tron) → desintegra ── */}
            {inspecionando && (() => {
                const it = inspecionando;
                const cor = COR_RARIDADE[it.raridade];
                const orq = it.plugavel ? ehAgenteOrquestra(it.plugavel) : false;
                const conectado = estaConectado(it);
                const travado = !!it.plugavel && orq && estadoOrq[it.plugavel]?.estado !== "liberado" && !conectado;
                const planoPro = !!it.plugavel && orq;
                const glow = it.raridade === "lendaria" ? 44 : it.raridade === "epica" ? 32 : it.raridade === "rara" ? 22 : 16;
                return (
                    <div className={`vt-claim${fases.open ? " open" : ""}${fases.forja ? " forja" : ""}${fases.clamp ? " clamp" : ""}${fases.impact ? " impact" : ""}${fases.lit ? " lit" : ""}${fases.desintegra ? " desintegra" : ""}`} style={{ "--cor": cor, "--glow": `${glow}px` } as CSSProperties} role="dialog" aria-modal="true" aria-label={it.titulo} onClick={fecharInspect}>
                        <div className="vt-claim-bk" />
                        <div className="vt-stage">
                            <div className="vt-cradle" />
                            <div className="vt-press left"><div className="vt-piston p1" /><div className="vt-piston p2" /><div className="vt-piston p3" /><div className="vt-jaw" /><div className="vt-flow" /></div>
                            <div className="vt-press right"><div className="vt-piston p1" /><div className="vt-piston p2" /><div className="vt-piston p3" /><div className="vt-jaw" /><div className="vt-flow" /></div>
                            <div className="vt-spin-wrap" onClick={(e) => e.stopPropagation()}>
                                <div ref={spinRef} className="vt-spin-card">
                                    <div className="vt-face vt-face-front">
                                        <div className="vt-frame"><div className="vt-panel">
                                            <div className="vt-spine">{NOME_RARIDADE[it.raridade].toUpperCase()}</div>
                                            <div className="vt-art"><span className="vt-br tl" /><span className="vt-br tr" /><span className="vt-br bl" /><span className="vt-br brr" /><div className="vt-glyph"><b>{GLYPH[it.modelo] ?? "✦"}</b></div><div className="vt-tron" /></div>
                                            <div className="vt-plate"><div className="vt-type">{NOME_TIPO[it.tipo].toUpperCase()}</div><h3 className="vt-title">{it.titulo}</h3><div className="vt-meter"><span className="vt-segs">{segmentos(it.profundidade).map((on, i) => <i key={i} className={on ? "on" : ""} />)}</span></div></div>
                                        </div></div>
                                    </div>
                                    <div className="vt-face vt-face-back"><div className="vt-back"><SolanaMark size={40} title="Solana" /><div className="vt-back-rar">{NOME_RARIDADE[it.raridade].toUpperCase()}</div></div></div>
                                    <div className="vt-shards">{SHARDS.map((s, i) => <span key={i} className="vt-shard" style={{ left: `${s.left}%`, top: `${s.top}%`, animationDelay: `${s.d}ms`, "--dx": `${s.dx}px`, "--dy": `${s.dy}px`, "--rot": `${s.rot}deg` } as CSSProperties} />)}</div>
                                </div>
                                <div className="vt-claim-charge"><i /></div>
                            </div>
                        </div>

                        {/* dados DISCRETOS embaixo; só CONECTAR em destaque */}
                        <div className="vt-dock" onClick={(e) => e.stopPropagation()}>
                            <div className="vt-dock-info">
                                <div className="vt-dock-title">{it.titulo}</div>
                                <div className="vt-dock-sub">{it.subtitulo}</div>
                            </div>
                            <div className="vt-dock-price">{planoPro ? "no plano Pro" : it.preco > 0 ? <><SolanaMark size={15} title="SOL" />{precoTexto(it.preco)}</> : "Grátis"}</div>
                            <div className="vt-dock-act">
                                {conectado ? (
                                    <div className="vt-dock-done">✓ conectado · disponível {destinoDe(it)}</div>
                                ) : travado ? (
                                    <div className="vt-dock-lock">{estadoOrq[it.plugavel!]?.estado === "exige_plano" ? "🔒 " : "⏳ "}{estadoOrq[it.plugavel!]?.aviso ?? "verificando…"}</div>
                                ) : (
                                    <button type="button" className="vt-dock-btn" onClick={confirmar}>⌁ conectar</button>
                                )}
                            </div>
                        </div>

                        <div className="vt-flash" />
                    </div>
                );
            })()}

            {/* ── a notificação sutil (feature agora disponível) ── */}
            {aviso && (
                <div className="vt-aviso" role="status">
                    <SolanaMark size={14} title="" />
                    <span><b>{aviso.titulo}</b> agora está disponível {aviso.destino}.</span>
                </div>
            )}
        </div>
    );
}
