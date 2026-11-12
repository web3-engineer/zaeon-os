"use client";
/**
 * CartaVitrine — a CARTA CYBERDECK (retrato, chanfro, moldura de neon que corre, lombada de raridade, colchetes de HUD,
 * nº de série, barra de energia e o emoji do tema). É só o visual: a VitrineEstudos passa a ação (plug/comprar/
 * desconectar) e o ritual de conexão; a landing ("Aqui você vale o que você constrói.") usa a MESMA carta, só que como
 * chamariz (clicar leva pra Sala de Estudos). Fica aqui, compartilhada, pra vitrine e landing nunca divergirem.
 *
 * `--cy` (o neon de apoio) é setado AQUI na carta — na vitrine ele vinha do `.vt-grid`, mas a landing não tem grid.
 */
import { type CSSProperties, type ReactNode } from "react";
import { COR_RARIDADE, NOME_RARIDADE } from "@/lib/estudos/blueprint";
import { NOME_TIPO, type ItemVitrine } from "@/lib/estudos/vitrine";
import "./vitrine-card.css";

/** o DESENHO do tema (emoji/ícone, com variedade) — no lugar do wireframe 3D antigo */
export const GLYPH: Record<string, string> = {
    console: "🎮", chip: "🧠", planta: "🌱", predio: "🏛️", drone: "🚁", foguete: "🚀",
    molecula: "🧬", engrenagem: "⚙️", livro: "📖", graos: "☕", ondas: "📡", robo: "🤖",
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

const glowDe = (r: ItemVitrine["raridade"]) => (r === "lendaria" ? 34 : r === "epica" ? 24 : r === "rara" ? 16 : 12);

export default function CartaVitrine({ it, onClick, badgeGratis = false, precoFree = false, precoNode, acaoNode, className }: {
    it: ItemVitrine;
    onClick?: () => void;
    /** selo GRÁTIS no canto da arte */
    badgeGratis?: boolean;
    /** pinta o preço de verde (grátis) */
    precoFree?: boolean;
    /** o que aparece no lugar do preço (SOL + número, "Grátis", "no plano Pro"…) */
    precoNode: ReactNode;
    /** a ação à direita do preço (plug / comprar / desconectar / ✓ conectado) — opcional */
    acaoNode?: ReactNode;
    className?: string;
}) {
    const cor = COR_RARIDADE[it.raridade];
    // acessível pelo teclado quando a CARTA é o único alvo clicável (a landing) — na vitrine o clique da carta é só
    // atalho de mouse e quem leva o foco/teclado é o botão plug/comprar (`acaoNode`), então não viramos a carta num botão
    // (botão dentro de botão).
    const interativa = typeof onClick === "function" && !acaoNode;
    return (
        <article
            className={`vt-card${className ? ` ${className}` : ""}`}
            style={{ "--cor": cor, "--glow": `${glowDe(it.raridade)}px`, "--cy": "#38f0ff" } as CSSProperties}
            onClick={onClick}
            role={interativa ? "button" : undefined}
            tabIndex={interativa ? 0 : undefined}
            aria-label={interativa ? it.titulo : undefined}
            onKeyDown={interativa ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick!(); } } : undefined}
        >
            <div className="vt-frame">
                <div className="vt-panel">
                    <div className="vt-spine">{NOME_RARIDADE[it.raridade].toUpperCase()}</div>
                    <div className="vt-art">
                        <span className="vt-br tl" /><span className="vt-br tr" /><span className="vt-br bl" /><span className="vt-br brr" />
                        <div className="vt-serial">{serialDe(it)}<span className="vt-barcode" /></div>
                        {badgeGratis && <span className="vt-free">GRÁTIS</span>}
                        <div className="vt-glyph"><b>{GLYPH[it.modelo] ?? "✦"}</b></div>
                        <div className="vt-desc">{it.subtitulo}</div>
                    </div>
                    <div className="vt-plate">
                        <div className="vt-type">{NOME_TIPO[it.tipo].toUpperCase()}</div>
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
