"use client";
/**
 * PesquisaAberta — o painel FORMAL de uma pesquisa aberta a APOIO (lib/estudos/pesquisas). Diferente da pasta (papéis
 * em leque), aqui a pesquisa ocupa a tela inteira como um documento, com espaço pra ler, e um painel de apoio em SOL
 * com o botão de apoiar. Entra em FADE IN e sai em FADE OUT. Fecha no ✕, no Esc ou clicando fora.
 *
 * Apoiar roda o fluxo (escolher valor em SOL, confirmar) e move a barra na hora — mas, igual ao resto da vitrine, a
 * liquidação on-chain ainda é "em breve" (MOEDA.ativa=false): nada cobra ninguém nem envia pra carteira externa.
 */
import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { ItemVitrine } from "@/lib/estudos/vitrine";
import { NOME_PARTE, VALORES_APOIO, pctApoio, solFmt, type Apoio, type Parte } from "@/lib/estudos/pesquisas";
import { nichoDe, publicadorDe, validadoresDe } from "@/lib/estudos/detalhes";
import SolanaMark from "@/components/solana/SolanaMark";
import "./vitrine-pesquisa-aberta.css";

const FECHAR_MS = 420;

export default function PesquisaAberta({ item, cor, onFechar }: { item: ItemVitrine; cor: string; onFechar: () => void }) {
    const pasta = item.pasta!;
    const [aberta, setAberta] = useState(false);
    const [partes, setPartes] = useState<Parte[] | null>(null);
    const [erro, setErro] = useState<string | null>(null);
    const fechandoRef = useRef(false);

    // o apoio, com o estado local do que a pessoa apoiou nesta sessão (a barra anda na hora)
    const base: Apoio = item.apoio ?? { ativo: true, metaSol: 0, arrecadadoSol: 0, apoiadores: 0 };
    const [extra, setExtra] = useState(0);
    const [apoiou, setApoiou] = useState(false);
    const [escolhendo, setEscolhendo] = useState(false);
    const [valor, setValor] = useState<number>(VALORES_APOIO[1]);
    const apoio: Apoio = { ...base, arrecadadoSol: Math.min(base.metaSol, base.arrecadadoSol + extra), apoiadores: base.apoiadores + (apoiou ? 1 : 0) };
    const pct = pctApoio(apoio);
    const pub = publicadorDe(item);
    const validadores = validadoresDe(item);

    const fechar = () => {
        if (fechandoRef.current) return;
        fechandoRef.current = true;
        setAberta(false);
        window.setTimeout(onFechar, FECHAR_MS);
    };

    useEffect(() => {
        const raf = requestAnimationFrame(() => setAberta(true));
        const tecla = (e: KeyboardEvent) => { if (e.key === "Escape") { if (escolhendo) setEscolhendo(false); else fechar(); } };
        window.addEventListener("keydown", tecla);
        return () => { cancelAnimationFrame(raf); window.removeEventListener("keydown", tecla); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [escolhendo]);

    useEffect(() => {
        let vivo = true;
        fetch(`/api/estudos/vitrine/pesquisas/${encodeURIComponent(pasta.slug)}`, { cache: "no-store" })
            .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
            .then((d) => { if (vivo) setPartes(Array.isArray(d?.partes) ? d.partes : []); })
            .catch(() => { if (vivo) setErro("Não deu pra abrir o conteúdo desta pesquisa agora."); });
        return () => { vivo = false; };
    }, [pasta.slug]);

    const confirmar = () => {
        setExtra((x) => x + valor);
        setApoiou(true);
        setEscolhendo(false);
    };

    return (
        <div className={`vpa-raiz${aberta ? " aberta" : ""}`} style={{ "--cor": cor } as CSSProperties} role="dialog" aria-modal="true" aria-label={item.titulo}>
            <div className="vpa-veu" onClick={fechar} />
            <article className="vpa-folha" onClick={(e) => e.stopPropagation()}>
                <button type="button" className="vpa-fechar" onClick={fechar} title="Fechar (Esc)" aria-label="Fechar">✕</button>
                <div className="vpa-conteudo">
                    <header className="vpa-cab">
                        <div className="vpa-rot">PESQUISA ABERTA A APOIO · {nichoDe(item).toUpperCase()}</div>
                        <h1 className="vpa-titulo">{item.titulo}</h1>
                        <div className="vpa-quem">
                            <span className="vpa-foto">{pub.inicial}</span>
                            <span>{pub.nome}{pub.verificada && <span className="vpa-vf" title="conta verificada"> ◆</span>}</span>
                            {validadores != null && <><span className="vpa-sep">·</span><span>{validadores.toLocaleString("pt-BR")} validadores</span></>}
                            {!!item.tags.length && <><span className="vpa-sep">·</span><span className="vpa-tags">{item.tags.slice(0, 4).join(" · ")}</span></>}
                        </div>
                    </header>

                    <div className="vpa-corpo">
                        {item.descricao && <p className="vpa-resumo">{item.descricao.split(/\n\s*\n/)[0]}</p>}
                        {erro && <p className="vpa-aviso">{erro}</p>}
                        {!partes && !erro && <p className="vpa-aviso">abrindo o conteúdo…</p>}
                        {partes?.map((p, i) => (
                            <section key={i} className="vpa-secao">
                                <h2 className="vpa-secao-tit"><span className="vpa-etq">{NOME_PARTE[p.tipo]}</span> {p.titulo}</h2>
                                {p.conteudo && <div className="vpa-texto">{p.conteudo}</div>}
                                {p.url && <a className="vpa-link" href={p.url} target="_blank" rel="noopener noreferrer">abrir material ↗</a>}
                            </section>
                        ))}
                    </div>
                </div>

                {/* painel de APOIO (SOL) */}
                <aside className="vpa-apoio">
                    <div className="vpa-apoio-sticky">
                        <div className="vpa-valor"><SolanaMark size={18} title="SOL" /><b>{solFmt(apoio.arrecadadoSol)}</b></div>
                        <div className="vpa-barra"><i style={{ width: `${(pct * 100).toFixed(1)}%` }} /></div>
                        <div className="vpa-meta">{(pct * 100).toFixed(0)}% de {solFmt(apoio.metaSol)} · {apoio.apoiadores.toLocaleString("pt-BR")} apoiando</div>

                        {apoiou && (
                            <div className="vpa-obrigado">✓ Obrigado! Seu apoio de {solFmt(extra)} entrou. A liquidação on-chain é <b>em breve</b>.</div>
                        )}

                        {escolhendo ? (
                            <div className="vpa-escolher">
                                <div className="vpa-chips">
                                    {VALORES_APOIO.map((v) => (
                                        <button key={v} type="button" className={valor === v ? "on" : ""} onClick={() => setValor(v)}>{solFmt(v)}</button>
                                    ))}
                                </div>
                                <label className="vpa-custom">
                                    outro valor
                                    <input type="number" min={0} step="0.1" value={valor} onChange={(e) => setValor(Math.max(0, Number(e.target.value) || 0))} />
                                    <span>SOL</span>
                                </label>
                                <button type="button" className="vpa-btn" disabled={valor <= 0} onClick={confirmar}>Confirmar apoio</button>
                                <button type="button" className="vpa-link-btn" onClick={() => setEscolhendo(false)}>cancelar</button>
                            </div>
                        ) : (
                            <button type="button" className="vpa-btn grande" onClick={() => setEscolhendo(true)}>◎ Apoiar esta pesquisa</button>
                        )}

                        <p className="vpa-nota">Apoio em SOL (Solana). A liquidação on-chain ainda é &quot;em breve&quot;: o fluxo roda, mas nada cobra ninguém agora.</p>
                    </div>
                </aside>
            </article>
        </div>
    );
}
