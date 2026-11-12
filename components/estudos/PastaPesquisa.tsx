"use client";
/**
 * PastaPesquisa — a PASTA aberta de uma pesquisa da vitrine (lib/estudos/pesquisas). A vitrine desfoca, a pasta sobe
 * pro centro, a capa da frente tomba e os PAPÉIS (as partes: artigo, dados, protocolo…) saem em leque. Clicar num
 * papel traz ele pra frente pra LER, com baixar (.md) e, se a parte for um link, abrir fora. Esc volta um passo
 * (do papel pra pasta, da pasta pra vitrine); clicar fora fecha.
 *
 * A lista da vitrine só traz os papéis RESUMIDOS (título, tipo, tamanho); o texto vem aqui, quando a pasta abre
 * (GET /api/estudos/vitrine/pesquisas/[slug]).
 */
import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { ItemVitrine } from "@/lib/estudos/vitrine";
import { COR_PARTE, NOME_PARTE, arquivoDaParte, tamanhoParte, type Parte } from "@/lib/estudos/pesquisas";
import { nichoDe, publicadorDe, validadoresDe } from "@/lib/estudos/detalhes";
import "./vitrine-pasta.css";

const FECHAR_MS = 420;

function baixar(nome: string, texto: string) {
    const url = URL.createObjectURL(new Blob([texto], { type: "text/markdown;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url; a.download = nome; a.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function PastaPesquisa({ item, cor, onFechar }: { item: ItemVitrine; cor: string; onFechar: () => void }) {
    const pasta = item.pasta!;
    const [aberta, setAberta] = useState(false);
    const [lendo, setLendo] = useState<number | null>(null);
    const [partes, setPartes] = useState<Parte[] | null>(null);
    const [erro, setErro] = useState<string | null>(null);
    const fechandoRef = useRef(false);
    const lendoRef = useRef<number | null>(null);
    lendoRef.current = lendo;

    const pub = publicadorDe(item);
    const validadores = validadoresDe(item);
    const n = pasta.partes.length;

    const fechar = () => {
        if (fechandoRef.current) return;
        fechandoRef.current = true;
        setLendo(null); setAberta(false);
        window.setTimeout(onFechar, FECHAR_MS);
    };

    useEffect(() => {
        const raf = requestAnimationFrame(() => setAberta(true));
        const tecla = (e: KeyboardEvent) => {
            if (e.key !== "Escape") return;
            if (lendoRef.current != null) setLendo(null); else fechar();
        };
        window.addEventListener("keydown", tecla);
        return () => { cancelAnimationFrame(raf); window.removeEventListener("keydown", tecla); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // o TEXTO dos papéis: vem quando a pasta abre
    useEffect(() => {
        let vivo = true;
        fetch(`/api/estudos/vitrine/pesquisas/${encodeURIComponent(pasta.slug)}`, { cache: "no-store" })
            .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
            .then((d) => { if (vivo) setPartes(Array.isArray(d?.partes) ? d.partes : []); })
            .catch(() => { if (vivo) setErro("Não deu pra abrir os papéis desta pasta agora."); });
        return () => { vivo = false; };
    }, [pasta.slug]);

    const papel = lendo != null ? pasta.partes[lendo] : null;
    const completo = lendo != null ? partes?.[lendo] : undefined;

    return (
        <div className={`vp-raiz${aberta ? " aberta" : ""}${lendo != null ? " lendo" : ""}`} style={{ "--cor": cor } as CSSProperties} role="dialog" aria-modal="true" aria-label={`Pasta: ${item.titulo}`}>
            <div className="vp-veu" onClick={fechar} />
            <button type="button" className="vp-fechar" onClick={fechar} title="Fechar (Esc)" aria-label="Fechar">✕</button>

            <header className="vp-cab">
                <div className="vp-rot">PASTA DE PESQUISA · {nichoDe(item).toUpperCase()}</div>
                <h2 className="vp-titulo">{item.titulo}</h2>
                <div className="vp-quem">
                    <span className="vp-foto">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        {pub.avatarUrl ? <img src={pub.avatarUrl} alt="" /> : pub.inicial}
                    </span>
                    <span>{pub.nome}{pub.verificada && <span className="vp-vf" title="conta verificada"> ◆</span>}</span>
                    <span className="vp-sep">·</span>
                    <span>{n} {n === 1 ? "parte" : "partes"}</span>
                    {validadores != null && <><span className="vp-sep">·</span><span>{validadores.toLocaleString("pt-BR")} validadores</span></>}
                </div>
            </header>

            {/* a PASTA: fundo, os papéis em leque e a capa da frente que tomba */}
            <div className="vp-palco" onClick={(e) => { if (e.target === e.currentTarget) fechar(); }}>
                <div className="vp-pasta">
                    <div className="vp-fundo"><span className="vp-aba">▤ {n}</span></div>
                    <div className="vp-leque">
                        {pasta.partes.map((p, i) => (
                            <button
                                key={i}
                                type="button"
                                className="vp-papel"
                                style={{ "--i": i, "--n": n, "--d": i - (n - 1) / 2, "--pcor": COR_PARTE[p.tipo] } as CSSProperties}
                                onClick={() => setLendo(i)}
                                aria-label={`Ler ${NOME_PARTE[p.tipo]}: ${p.titulo}`}
                            >
                                <span className="vp-etq">{NOME_PARTE[p.tipo].toUpperCase()}</span>
                                <span className="vp-ptit">{p.titulo}</span>
                                <span className="vp-linhas" aria-hidden="true"><i /><i /><i /><i /><i /></span>
                                <span className="vp-tam">{tamanhoParte(p)}</span>
                            </button>
                        ))}
                    </div>
                    <div className="vp-capa"><span>{item.titulo}</span></div>
                </div>
                {item.descricao && <p className="vp-resumo">{item.descricao.split(/\n\s*\n/)[0]}</p>}
                <p className="vp-dica">toque num papel pra ler · <kbd>esc</kbd> fecha a pasta</p>
            </div>

            {/* LER: o papel vem pra frente */}
            {papel && (
                <div className="vp-leitura" onClick={() => setLendo(null)}>
                    <article className="vp-folha" style={{ "--pcor": COR_PARTE[papel.tipo] } as CSSProperties} onClick={(e) => e.stopPropagation()}>
                        <div className="vp-folha-cab">
                            <span className="vp-etq">{NOME_PARTE[papel.tipo].toUpperCase()}</span>
                            <h3>{papel.titulo}</h3>
                            <div className="vp-acoes">
                                {completo?.conteudo && <button type="button" onClick={() => baixar(arquivoDaParte(pasta.slug, papel), completo.conteudo!)}>↓ baixar .md</button>}
                                {completo?.url && <a href={completo.url} target="_blank" rel="noopener noreferrer">abrir link ↗</a>}
                                <button type="button" onClick={() => setLendo(null)}>← voltar à pasta</button>
                            </div>
                        </div>
                        <div className="vp-texto">
                            {erro ? <p className="vp-aviso">{erro}</p>
                                : !partes ? <p className="vp-aviso">abrindo o papel…</p>
                                    : completo?.conteudo ? completo.conteudo
                                        : completo?.url ? <p className="vp-aviso">Esta parte fica fora da Zaeon. Use “abrir link” pra ver.</p>
                                            : <p className="vp-aviso">Este papel está vazio.</p>}
                        </div>
                    </article>
                </div>
            )}
        </div>
    );
}
