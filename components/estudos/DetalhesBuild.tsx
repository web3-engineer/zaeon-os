"use client";
/**
 * DetalhesBuild — o painel "detalhes" de um card da vitrine (lib/estudos/detalhes). NÃO é compra: é ver quem publicou
 * (a conta, com perfil e mensagem privada), o nicho, os validadores e a descrição completa.
 *
 * A vitrine desfoca; a carta clicada sai do lugar dela, sobe e fica ATRÁS, borrada; a tela de sumário sobe de baixo
 * com a borda em CIRCUITO — as trilhas se desenham no tamanho real da tela, os pads acendem e a corrente corre pelo
 * contorno, na cor da raridade. Fecha no ✕, no Esc ou clicando fora.
 */
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import type { ItemVitrine } from "@/lib/estudos/vitrine";
import { descricaoDe, nichoDe, publicadorDe, validadoresDe } from "@/lib/estudos/detalhes";
import "./vitrine-detalhes.css";

const FECHAR_MS = 450;

/** as trilhas do circuito para uma tela W×H (o contorno segue o mesmo recorte da casca) */
function trilhas(W: number, H: number) {
    const m = 1;
    const contorno = `M ${m} ${H} L ${m} 34 L 34 ${m} L ${W - 140} ${m} L ${W - 120} 14 L ${W - 34} 14 L ${W - m} 48 L ${W - m} ${H}`;
    const ramos = [
        `M 12 ${H * 0.26} L 12 64 L 22 54`,
        `M ${W - 12} ${H * 0.3} L ${W - 12} 92 L ${W - 46} 58`,
        `M 12 ${H * 0.62} L 26 ${H * 0.62 + 14} L 26 ${H * 0.8}`,
        `M ${W - 12} ${H * 0.7} L ${W - 26} ${H * 0.7 + 14} L ${W - 26} ${H * 0.86} L ${W - 70} ${H * 0.86}`,
        `M ${W * 0.45} 6 L ${W * 0.45 + 22} 6 L ${W * 0.45 + 36} 20 L ${W * 0.6} 20`,
    ];
    const pads: Array<[number, number]> = [[22, 54], [W - 46, 58], [26, H * 0.8], [W - 70, H * 0.86], [W * 0.6, 20], [W - 140, m], [34, m]];
    return { tracos: [contorno, ...ramos], correntes: [contorno, ramos[1], ramos[3]], pads };
}

export default function DetalhesBuild({ item, cor, origem, carta, onFechar }: {
    item: ItemVitrine;
    /** a cor da raridade */
    cor: string;
    /** onde a carta estava na grade (ela sai dali e sobe) */
    origem: DOMRect | null;
    /** a carta, pra ficar atrás do painel */
    carta: ReactNode;
    onFechar: () => void;
}) {
    const [aberto, setAberto] = useState(false);
    const [tam, setTam] = useState<{ W: number; H: number } | null>(null);
    const [validNum, setValidNum] = useState(0);
    const sumarioRef = useRef<HTMLElement>(null);
    const svgRef = useRef<SVGSVGElement>(null);
    const fechandoRef = useRef(false);

    const pub = publicadorDe(item);
    const validadores = validadoresDe(item);
    const secoes = descricaoDe(item);

    const fechar = () => {
        if (fechandoRef.current) return;
        fechandoRef.current = true;
        setAberto(false);
        window.setTimeout(onFechar, FECHAR_MS);
    };

    useEffect(() => {
        const raf = requestAnimationFrame(() => setAberto(true));
        const tecla = (e: KeyboardEvent) => { if (e.key === "Escape") fechar(); };
        window.addEventListener("keydown", tecla);
        return () => { cancelAnimationFrame(raf); window.removeEventListener("keydown", tecla); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // o circuito no tamanho REAL da tela (e de novo se a janela mudar)
    useLayoutEffect(() => {
        const medir = () => { const s = sumarioRef.current; if (s) setTam({ W: s.clientWidth, H: s.clientHeight }); };
        medir();
        window.addEventListener("resize", medir);
        return () => window.removeEventListener("resize", medir);
    }, []);
    useLayoutEffect(() => {
        svgRef.current?.querySelectorAll("path").forEach((p) => p.style.setProperty("--len", String(Math.ceil(p.getTotalLength()))));
    }, [tam]);

    // os validadores sobem contando
    useEffect(() => {
        if (validadores == null || !aberto) return;
        let raf = 0;
        const t0 = performance.now() + 600;
        const passo = (t: number) => {
            const p = Math.max(0, Math.min(1, (t - t0) / 900));
            setValidNum(Math.round(validadores * (1 - Math.pow(1 - p, 3))));
            if (p < 1) raf = requestAnimationFrame(passo);
        };
        raf = requestAnimationFrame(passo);
        return () => cancelAnimationFrame(raf);
    }, [validadores, aberto]);

    // a carta: do lugar dela na grade → em cima, maior, atrás do painel
    const alvo = origem ? { w: origem.width * 1.25, h: origem.height * 1.25 } : null;
    const focoStyle: CSSProperties | undefined = origem && alvo
        ? aberto
            ? { left: `calc(50% - ${alvo.w / 2}px)`, top: "3vh", width: alvo.w, height: alvo.h }
            : { left: origem.left, top: origem.top, width: origem.width, height: origem.height }
        : undefined;

    const desenho = tam ? trilhas(tam.W, tam.H) : null;

    return (
        <div className={`vd-raiz${aberto ? " aberto" : ""}`} style={{ "--cor": cor } as CSSProperties}>
            {focoStyle && <div className="vd-foco" style={focoStyle}>{carta}</div>}
            <div className="vd-veu" onClick={fechar} />
            <section ref={sumarioRef} className="vd-sumario" role="dialog" aria-modal="true" aria-label={`Detalhes: ${item.titulo}`}>
                <div className="vd-casca" />
                <svg ref={svgRef} className="vd-circuito" aria-hidden="true" viewBox={tam ? `0 0 ${tam.W} ${tam.H}` : undefined}>
                    {desenho?.tracos.map((d, i) => <path key={`t${i}`} className="vd-traco" d={d} />)}
                    {desenho?.correntes.map((d, i) => <path key={`c${i}`} className="vd-corrente" d={d} />)}
                    {desenho?.pads.map(([x, y], i) => (
                        <rect key={`p${i}`} className="vd-pad" x={x - 3.5} y={y - 3.5} width={7} height={7} rx={i % 2 ? 3.5 : 1} style={{ animationDelay: `${1.05 + i * 0.06}s` }} />
                    ))}
                </svg>
                <button type="button" className="vd-fechar" onClick={fechar} title="Fechar (Esc)" aria-label="Fechar">✕</button>
                <div className="vd-conteudo">
                    <header className="vd-cab">
                        <div className="vd-avatar">
                            <svg viewBox="0 0 52 52" aria-hidden="true">
                                <circle cx="26" cy="26" r="24" fill="none" stroke="var(--cy)" strokeWidth="1.2" strokeDasharray="3 5 14 5" opacity=".8" />
                                <circle cx="26" cy="2" r="2" fill="var(--cor)" /><circle cx="50" cy="26" r="1.6" fill="var(--cy)" />
                            </svg>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <div className="vd-foto">{pub.avatarUrl ? <img src={pub.avatarUrl} alt="" /> : pub.inicial}</div>
                        </div>
                        <div className="vd-quem">
                            <div className="vd-rot">PUBLICADO POR</div>
                            <div className="vd-nome">{pub.nome}{pub.verificada && <span className="vd-vf" title="conta verificada">◆</span>}</div>
                            <div className="vd-handle">{pub.handle}</div>
                        </div>
                        <div className="vd-acoes">
                            <button type="button" className="vd-bt perfil" disabled={!pub.contaId} title={pub.contaId ? "Ver o perfil" : "O perfil abre quando a build estiver ligada a uma conta"}>◎ ver perfil</button>
                            <button type="button" className="vd-bt msg" disabled={!pub.contaId} title={pub.contaId ? "Mandar mensagem privada" : "A mensagem abre quando a build estiver ligada a uma conta"}>✉ mensagem privada</button>
                        </div>
                    </header>
                    <div className="vd-div" />
                    <h2 className="vd-titulo">{item.titulo}</h2>
                    <div className="vd-meta">
                        <div className="vd-chip"><span className="k">NICHO</span><span className="v">{nichoDe(item)}</span></div>
                        <div className="vd-chip">
                            <span className="k">VALIDADORES</span>
                            <span className="v">{validadores != null && <span className="vd-pilha"><i /><i /><i /><i /></span>}{validadores == null ? "—" : validNum.toLocaleString("pt-BR")}</span>
                        </div>
                    </div>
                    <article className="vd-desc">
                        {secoes.map((s, i) => (
                            <div key={i}>
                                {s.titulo && <h4>{s.titulo}</h4>}
                                {s.tipo === "paragrafos" && s.itens.map((p, j) => <p key={j}>{p}</p>)}
                                {s.tipo === "lista" && <ul>{s.itens.map((p, j) => <li key={j}>{p}</li>)}</ul>}
                                {s.tipo === "tags" && <div className="vd-tags">{s.itens.map((t) => <span key={t}>{t}</span>)}</div>}
                            </div>
                        ))}
                    </article>
                    <div className="vd-rodape"><span>detalhes · não é compra</span><span><kbd>esc</kbd> volta à vitrine</span></div>
                </div>
            </section>
        </div>
    );
}
