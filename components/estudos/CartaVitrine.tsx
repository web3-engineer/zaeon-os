"use client";
/**
 * CartaVitrine — a CARTA CYBERDECK (retrato, chanfro, moldura de neon que corre, lombada de raridade, colchetes de HUD,
 * nº de série, barra de energia e o emoji do tema). É só o visual: a VitrineEstudos passa a ação (plug/comprar/
 * desconectar) e o ritual de conexão; a landing ("Aqui você vale o que você constrói.") usa a MESMA carta, só que como
 * chamariz (clicar leva pra Sala de Estudos). Fica aqui, compartilhada, pra vitrine e landing nunca divergirem.
 *
 * `--cy` (o neon de apoio) é setado AQUI na carta — na vitrine ele vinha do `.vt-grid`, mas a landing não tem grid.
 */
import { useTranslation } from "react-i18next";
import { type CSSProperties, type ReactNode } from "react";
import { COR_RARIDADE, NOME_RARIDADE } from "@/lib/estudos/blueprint";
import { NOME_TIPO, type ItemVitrine } from "@/lib/estudos/vitrine";
import { COR_PARTE, NOME_PARTE } from "@/lib/estudos/pesquisas";
import { skinDaVitrine } from "@/lib/estudos/skinVitrine";
import "./vitrine-card.css";
import "./vitrine-skins.css";

/** o DESENHO do tema (emoji/ícone, com variedade) — no lugar do wireframe 3D antigo */
export const GLYPH: Record<string, string> = {
    console: "🎮", chip: "🧠", planta: "🌱", predio: "🏛️", drone: "🚁", foguete: "🚀",
    molecula: "🧬", engrenagem: "⚙️", livro: "📖", graos: "☕", ondas: "📡", robo: "🤖", pasta: "📂",
};

/** o nº de série (escassez de colecionador): quantas frações já foram cunhadas / o total */
export const serialDe = (it: ItemVitrine) =>
    it.fracoes.total > 1
        ? `№ ${it.fracoes.vendidas.toLocaleString("pt-BR")}/${it.fracoes.total.toLocaleString("pt-BR")}`
        : "№ 0001/0001";

/** barra de energia segmentada (profundidade → 0..10 segmentos) */
export const segmentos = (prof: number) => {
    const n = Math.max(0, Math.min(10, Math.round(prof / 10)));
    return Array.from({ length: 10 }, (_, i) => i < n);
};

/** a FOTO do card (curadoria do dono, lib/estudos/curadoria) — ocupa a arte no lugar do emoji do tema */
export function ImagemCarta({ src }: { src: string }) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img className="vt-foto" src={src} alt="" loading="lazy" decoding="async" draggable={false} />;
}

const glowDe = (r: ItemVitrine["raridade"]) => (r === "lendaria" ? 34 : r === "epica" ? 24 : r === "rara" ? 16 : 12);

export default function CartaVitrine({ it, onClick, badgeGratis = false, precoFree = false, precoNode, acaoNode, arteNode, forjada = false, className }: {
    it: ItemVitrine;
    /** clique na carta (recebe a própria carta: a vitrine usa a posição pra animar o painel de detalhes) */
    onClick?: (carta: HTMLElement) => void;
    /** selo GRÁTIS no canto da arte */
    badgeGratis?: boolean;
    /** pinta o preço de verde (grátis) */
    precoFree?: boolean;
    /** o que aparece no lugar do preço (SOL + número, "Grátis", "no plano Pro"…) */
    precoNode: ReactNode;
    /** a ação à direita do preço (plug / comprar / desconectar / ✓ conectado) — opcional */
    acaoNode?: ReactNode;
    arteNode?: ReactNode;
    forjada?: boolean;
    className?: string;
}) {
    const { t } = useTranslation();
    const skin = forjada ? "tecnologia" : skinDaVitrine(it);
    const imagem = it.imagem || (skin === "geografia" ? "/assets/cyber/terra-blue-marble.jpg" : skin === "dossie" && /coração|anatomia/i.test(it.titulo) ? "/models/coracao-landing.webp" : undefined);
    const cor = COR_RARIDADE[it.raridade];
    // acessível pelo teclado quando a CARTA é o único alvo clicável (a landing) — na vitrine o clique da carta é só
    // atalho de mouse e quem leva o foco/teclado é o botão plug/comprar (`acaoNode`), então não viramos a carta num botão
    // (botão dentro de botão).
    const interativa = typeof onClick === "function" && !acaoNode;
    // PESQUISA: a carta é uma PASTA — aba em cima e os papéis (as partes) espiando atrás (até 4 na borda)
    const pasta = it.pasta;
    const papeis = pasta ? pasta.partes.slice(0, 4) : [];
    return (
        <article
            className={`vt-card${pasta ? " vt-pasta" : ""}${className ? ` ${className}` : ""}`}
            data-skin={skin}
            style={{ "--cor": cor, "--glow": `${glowDe(it.raridade)}px`, "--cy": "#38f0ff" } as CSSProperties}
            onClick={onClick ? (e) => onClick(e.currentTarget) : undefined}
            role={interativa ? "button" : undefined}
            tabIndex={interativa ? 0 : undefined}
            aria-label={interativa ? it.titulo : undefined}
            onKeyDown={interativa ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick!(e.currentTarget); } } : undefined}
        >
            {pasta && (
                <>
                    <div className="vt-papeis" aria-hidden="true">
                        {papeis.map((p, i) => (
                            <span key={i} className="vt-papel" style={{ "--i": i, "--meio": (papeis.length - 1) / 2, "--pcor": COR_PARTE[p.tipo] } as CSSProperties}><b>{NOME_PARTE[p.tipo]} · {p.titulo}</b></span>
                        ))}
                    </div>
                    <div className="vt-aba">▤ PASTA · {pasta.partes.length}</div>
                </>
            )}
            <div className="vt-frame">
                <div className="vt-panel">
                    <div className="vt-spine">{t(`landing.vitrine.raridade.${it.raridade}`, { defaultValue: NOME_RARIDADE[it.raridade] }).toUpperCase()}</div>
                    <div className="vt-art">
                        <span className="vt-br tl" /><span className="vt-br tr" /><span className="vt-br bl" /><span className="vt-br brr" />
                        {badgeGratis && <span className="vt-free">{t("landing.vitrine.gratis", { defaultValue: "" }).toUpperCase()}</span>}
                        {imagem ? <ImagemCarta src={imagem} /> : skin === "dados" ? (
                          <div className="vt-skin-chart" aria-hidden="true">
                            {[22, 34, 26, 54, 47, 65, 57, 83, 72, 93, 83, 100].map((altura, i) => <i key={i} style={{ height: `${altura}%` }} />)}
                          </div>
                        ) : skin === "agronomia" ? (
                          <div className="vt-skin-terreno" aria-hidden="true"><i /><i /><i /></div>
                        ) : <div className="vt-glyph"><b>{arteNode ?? GLYPH[it.modelo] ?? "✦"}</b></div>}
                        {pasta && (
                            <div className="vt-pasta-lista" aria-hidden="true">
                                {pasta.partes.slice(0, 6).map((p, i) => <span key={i} style={{ "--pcor": COR_PARTE[p.tipo] } as CSSProperties}>{NOME_PARTE[p.tipo].toUpperCase()}</span>)}
                            </div>
                        )}
                        {it.subtitulo.trim() && <div className="vt-desc">{it.subtitulo}</div>}
                    </div>
                    <div className="vt-plate">
                        {!forjada && <div className="vt-type">{NOME_TIPO[it.tipo].toUpperCase()}{pasta ? ` · ${pasta.partes.length} ${pasta.partes.length === 1 ? "PARTE" : "PARTES"}` : ""}</div>}
                        <h3 className="vt-title">{it.titulo}</h3>
                        <div className="vt-meter"><span className="vt-segs">{segmentos(it.profundidade).map((on, i) => <i key={i} className={on ? "on" : ""} />)}</span></div>
                        <div className="vt-pr">
                            <span className={`vt-price${precoFree ? " free" : ""}`}>{precoNode}</span>
                            {acaoNode}
                        </div>
                    </div>
                    <div className="vt-crt" />
                </div>
            </div>
        </article>
    );
}
