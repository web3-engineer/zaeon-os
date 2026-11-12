"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

/**
 * Diagrama vivo: o que a pessoa traz -> a Zaeon -> o que ela leva.
 *
 * As duas listas pareiam NA ORDEM: sao TRES TRANSFORMACOES, uma por pilar
 * da Zaeon (ideias, estudos, empresas). Passar o dedo numa linha fixa o par.
 *
 * LEVE de proposito: um pacote de luz por fio, sem desfoque (filtro SVG) nem
 * ondulacao, e as bordas dos baloes so escorrem no par em foco. As palavras que
 * saltavam do cerebro sairam (pesavam e disputavam o olho com os baloes).
 *
 * Tudo e SVG com viewBox, incluindo o texto. A alternativa (cards em DOM e
 * linhas por cima) exige sincronizar coordenadas a cada resize e sempre erra
 * por um ou dois pixels; aqui as linhas nascem coladas nos cards por
 * construcao, em qualquer largura e em qualquer densidade de tela.
 *
 * Dois viewBox: horizontal no desktop, vertical no celular. Nao e o mesmo
 * desenho encolhido -- um leque de 4 linhas que funciona em 1000px de largura
 * vira um emaranhado ilegivel em 360px.
 */

type Par = {
    entra: string;
    sai: string;
    tom: string;
    /** Ritmo do trafego. Cada fluxo tem o seu: o conjunto respira em vez de marchar. */
    duracao: number;
    /** Fase inicial do trafego. */
    atraso: number;
    /** Periodo do escorrer da trilha. */
    onda: number;
};

// TRÊS PILARES (no plural): ideias → projetos, estudos → pesquisas e empresas → negócios.
// `entra`/`sai` = chaves do i18n (landing.flow.*); o texto em pt é o fallback enquanto o JSON carrega.
const PARES: Par[] = [
    { entra: "ideas", sai: "projects", tom: "#22d3ee", duracao: 3.2, atraso: 0, onda: 7.0 },
    { entra: "studies", sai: "research", tom: "#818cf8", duracao: 3.7, atraso: 0.6, onda: 9.3 },
    { entra: "companies", sai: "business", tom: "#2dd4bf", duracao: 4.3, atraso: 1.2, onda: 10.7 },
];
const ROTULO_PT: Record<string, string> = {
    ideas: "ideias", projects: "projetos", studies: "estudos", research: "pesquisas", companies: "empresas", business: "negócios",
};
const RESUMO_PT = "Ideias viram projetos, estudos viram pesquisas e empresas viram negócios.";

const HUMMINGBIRD = "/assets/zaeon-hummingbird.png";

/* ── geometria: computada, nunca escrita a mao ──────────────────────────── */

/** Desktop: 4 linhas saindo da borda do card ate a beirada do cerebro. */
const D = {
    vb: "0 0 1000 310",
    cardE: { x: 20, y: 36, w: 290, h: 237 },
    cardS: { x: 690, y: 36, w: 290, h: 237 },
    cerebro: { cx: 500, cy: 155, r: 92 },
    // linhas CENTRADAS no card (funciona com 3 ou 4 pares)
    linha: (i: number) => 154.5 + (i - (PARES.length - 1) / 2) * 62,
    saida: (i: number) => 154.5 + (i - (PARES.length - 1) / 2) * 62,
};

/**
 * Onde cada fluxo encosta no cerebro. As quatro linhas NAO chegam no mesmo
 * ponto: elas atracam em quatro portas distribuidas no arco, com o angulo
 * derivado do indice. Convergir tudo num ponto so empilha as curvas nos ultimos
 * 80px e o leque vira um borrao justamente onde o olho esta olhando.
 */
const ABERTURA = 0.34; // radianos entre portas vizinhas

const porta = (
    c: { cx: number; cy: number; r: number },
    base: number,
    i: number,
    n = PARES.length
) => {
    const ang = base + (i - (n - 1) / 2) * ABERTURA;
    return { x: c.cx + c.r * Math.cos(ang), y: c.cy + c.r * Math.sin(ang) };
};

/** Porta esquerda (entrada) e direita (saida) do cerebro no desktop. */
export const portaEntradaD = (i: number) => porta(D.cerebro, Math.PI, PARES.length - 1 - i);
export const portaSaidaD = (i: number) => porta(D.cerebro, 0, i);

const entradaD = (i: number) => {
    const { x: x0, y } = bolha(false, "E", i).ancora;
    const p = portaEntradaD(i);
    const meio = x0 + (p.x - x0) * 0.55;
    return `M${x0},${y} C${meio},${y} ${p.x - 55},${p.y} ${p.x.toFixed(1)},${p.y.toFixed(1)}`;
};

const saidaD = (i: number) => {
    const { x: x1, y } = bolha(false, "S", i).ancora;
    const p = portaSaidaD(i);
    const meio = p.x + (x1 - p.x) * 0.45;
    return `M${p.x.toFixed(1)},${p.y.toFixed(1)} C${p.x + 55},${p.y} ${meio},${y} ${x1},${y}`;
};

/** Mobile: o leque abre pela borda de baixo do card, nao pela lateral. */
const M = {
    vb: "0 0 360 580",
    cardE: { x: 20, y: 20, w: 320, h: 162 },
    cardS: { x: 20, y: 398, w: 320, h: 162 },
    cerebro: { cx: 180, cy: 290, r: 64 },
    linha: (i: number) => 101 + (i - (PARES.length - 1) / 2) * 38,
    saida: (i: number) => 479 + (i - (PARES.length - 1) / 2) * 38,
    /** x de onde cada fluxo deixa o card: leque distribuido na largura. */
    coluna: (i: number) => 180 + (i - (PARES.length - 1) / 2) * 90,
};

/**
 * Os BALÕES: cada palavra num balãozinho (pílula). Os três de cada lado ficam SIMÉTRICOS: dois por fora e o do meio
 * mais perto do cérebro. No desktop eles empilham com o do meio avançado; no celular, dois lado a lado e o do meio
 * centralizado, mais perto (espelhado embaixo, na saída). `ancora` = onde o fio encosta no balão.
 */
type Bolha = { x: number; y: number; w: number; h: number; ancora: { x: number; y: number } };
const BOLHA_D = { w: 190, h: 44, avanco: 90 };
const BOLHA_M = { w: 150, h: 34 };
export function bolha(mobile: boolean, lado: "E" | "S", i: number): Bolha {
    const meio = i === 1;
    if (!mobile) {
        const { w, h, avanco } = BOLHA_D, cy = D.linha(i), x = lado === "E" ? D.cardE.x + (meio ? avanco : 0) : D.cardS.x + D.cardS.w - w - (meio ? avanco : 0);
        return { x, y: cy - h / 2, w, h, ancora: { x: lado === "E" ? x + w : x, y: cy } };
    }
    const { w, h } = BOLHA_M, cx = meio ? 180 : i === 0 ? 92 : 268;
    const cy = lado === "E" ? (meio ? 120 : 62) : (meio ? 460 : 518);
    return { x: cx - w / 2, y: cy - h / 2, w, h, ancora: { x: cx, y: lado === "E" ? cy + h / 2 : cy - h / 2 } };
}

/** Portas de cima (entrada) e de baixo (saida) do cerebro no celular. */
export const portaEntradaM = (i: number) => porta(M.cerebro, -Math.PI / 2, i);
export const portaSaidaM = (i: number) => porta(M.cerebro, Math.PI / 2, PARES.length - 1 - i);

const entradaM = (i: number) => {
    const { x, y: y0 } = bolha(true, "E", i).ancora;
    const p = portaEntradaM(i);
    const meio = y0 + (p.y - y0) * 0.55;
    return `M${x},${y0} C${x},${meio} ${p.x},${p.y - 45} ${p.x.toFixed(1)},${p.y.toFixed(1)}`;
};

const saidaM = (i: number) => {
    const { x, y: y1 } = bolha(true, "S", i).ancora;
    const p = portaSaidaM(i);
    const meio = p.y + (y1 - p.y) * 0.45;
    return `M${p.x.toFixed(1)},${p.y.toFixed(1)} C${p.x},${p.y + 45} ${x},${meio} ${x},${y1}`;
};

/* ── componente ─────────────────────────────────────────────────────────── */

export default function ZaeonFlowDiagram({ className = "" }: { className?: string }) {
    const { t } = useTranslation();
    const rotulo = (k: string) => t(`landing.flow.${k}`, ROTULO_PT[k]);
    const resumo = t("landing.flow.summary", RESUMO_PT);
    /** Quem o ciclo automatico esta mostrando. */
    const [auto, setAuto] = useState<number | null>(null);
    /** Quem o ponteiro/foco esta apontando. */
    const [sobre, setSobre] = useState<number | null>(null);
    /** Quem ficou preso por clique. */
    const [fixado, setFixado] = useState<number | null>(null);
    const [semMovimento, setSemMovimento] = useState(false);

    useEffect(() => {
        const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
        const sync = () => setSemMovimento(mq.matches);
        sync();
        mq.addEventListener("change", sync);
        return () => mq.removeEventListener("change", sync);
    }, []);

    // Ciclo automatico: no celular nao existe hover, e um diagrama "interativo"
    // que so reage ao mouse fica morto justamente onde a maioria chega.
    //
    // O estado do ciclo e separado do estado do usuario de proposito: se fosse
    // um so, o setInterval se veria a si mesmo como "usuario assumiu o
    // controle", o efeito sairia cedo na re-execucao e o ciclo morreria depois
    // de um unico passo.
    useEffect(() => {
        if (semMovimento || fixado !== null || sobre !== null) return;
        const id = setInterval(() => {
            setAuto((i) => (i === null ? 0 : (i + 1) % PARES.length));
        }, 2600);
        return () => clearInterval(id);
    }, [semMovimento, fixado, sobre]);

    const destaque = fixado ?? sobre ?? auto;

    const marcar = useCallback((i: number | null) => setSobre(i), []);
    const fixar = useCallback((i: number) => setFixado((f) => (f === i ? null : i)), []);

    /** Opacidade de quem nao e o par em foco. Nao pode sumir: o fundo da landing
     *  tem particulas proprias e abaixo de ~0.35 a linha apagada some nelas. */
    const esmaecer = (i: number) => (destaque === null || destaque === i ? 1 : 0.65);   // sem "acinzentar" demais quem não está em foco
    const forte = (i: number) => destaque === i;

    const corpo = (mobile: boolean, sufixo: string) => {
        const G = mobile ? M : D;
        const dEntrada = mobile ? entradaM : entradaD;
        const dSaida = mobile ? saidaM : saidaD;

        return (
            <>
                {/* um BALÃOZINHO por palavra (preto transparente); a borda é um fio de energia na cor do par —
                    acesa e correndo no par em foco, quieta nos outros */}
                {PARES.map((p, i) => (
                    <g key={`mc-${p.entra}`} opacity={esmaecer(i)} style={{ transition: "opacity .45s ease" }}>
                        {(["E", "S"] as const).map((lado) => { const b = bolha(mobile, lado, i); return <CardMoldura key={lado} x={b.x} y={b.y} w={b.w} h={b.h} rx={b.h / 2} tom={p.tom} ativo={forte(i)} sufixo={sufixo} semMovimento={semMovimento} />; })}
                    </g>
                ))}

                {/* FLUXOS primeiro: passam por baixo dos cards e do texto. */}
                {PARES.map((p, i) => (
                    <g
                        key={p.entra}
                        opacity={esmaecer(i)}
                        style={{ transition: "opacity .45s ease" }}
                    >
                        <Fluxo d={dEntrada(i)} par={p} forte={forte(i)} />
                        <Fluxo d={dSaida(i)} par={p} forte={forte(i)} fase={p.duracao * 0.5} />
                    </g>
                ))}

                <Cerebro
                    cx={G.cerebro.cx}
                    cy={G.cerebro.cy}
                    r={G.cerebro.r}
                    destaque={destaque !== null}
                    semMovimento={semMovimento}
                    tom={destaque === null ? "#22d3ee" : PARES[destaque].tom}
                    sufixo={sufixo}
                />

                {/* PORTAS por cima do cerebro: onde cada linha atraca. */}
                {PARES.map((p, i) => (
                    <g key={`p-${p.entra}`} opacity={esmaecer(i)} style={{ transition: "opacity .45s ease" }}>
                        <Porta
                            p={mobile ? portaEntradaM(i) : portaEntradaD(i)}
                            par={p}
                            forte={forte(i)}
                        />
                        <Porta
                            p={mobile ? portaSaidaM(i) : portaSaidaD(i)}
                            par={p}
                            forte={forte(i)}
                        />
                    </g>
                ))}

                {/* TEXTO por cima, com a area de toque do par inteiro. */}
                {PARES.map((p, i) => {
                    const bE = bolha(mobile, "E", i), bS = bolha(mobile, "S", i);
                    const yE = bE.y + bE.h / 2, yS = bS.y + bS.h / 2;
                    return (
                        <g
                            key={`t-${p.entra}`}
                            opacity={esmaecer(i)}
                            onMouseEnter={() => marcar(i)}
                            onMouseLeave={() => marcar(null)}
                            onClick={() => fixar(i)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                    e.preventDefault();
                                    fixar(i);
                                }
                            }}
                            onFocus={() => marcar(i)}
                            onBlur={() => marcar(null)}
                            style={{ transition: "opacity .45s ease", cursor: "pointer" }}
                            tabIndex={0}
                            role="button"
                            aria-label={t("landing.flow.pair", { from: rotulo(p.entra), to: rotulo(p.sai), defaultValue: "{{from}} vira {{to}}" })}
                        >
                            {/* alvo de toque: a linha inteira, nao so as letras */}
                            <rect x={bE.x} y={bE.y} width={bE.w} height={bE.h} rx={bE.h / 2} fill="transparent" />
                            <rect x={bS.x} y={bS.y} width={bS.w} height={bS.h} rx={bS.h / 2} fill="transparent" />
                            <No cx={bE.x + (mobile ? 18 : 24)} cy={yE} par={p} forte={forte(i)} />
                            <Texto x={bE.x + (mobile ? 32 : 42)} y={yE} forte={forte(i)} mobile={mobile}>
                                {rotulo(p.entra)}
                            </Texto>
                            <No cx={bS.x + (mobile ? 18 : 24)} cy={yS} par={p} forte={forte(i)} />
                            <Texto x={bS.x + (mobile ? 32 : 42)} y={yS} forte={forte(i)} mobile={mobile}>
                                {rotulo(p.sai)}
                            </Texto>
                        </g>
                    );
                })}
            </>
        );
    };

    return (
        <div className={`w-full ${className}`}>
            <style>{`
                @keyframes zf-pacote  { from { stroke-dashoffset: 100 } to { stroke-dashoffset: 0 } }
                @keyframes zf-trilha  { from { stroke-dashoffset: 0 }   to { stroke-dashoffset: -15 } }
                @keyframes zf-cerebro { 0%,100% { transform: scale(1) } 50% { transform: scale(1.045) } }
                @keyframes zf-processa-luz { 0%,100% { transform: scale(.82); opacity: .45 } 12% { transform: scale(1.12); opacity: 1 } 24% { transform: scale(.9); opacity: .6 } 36% { transform: scale(1.06); opacity: .9 } 50% { transform: scale(.86); opacity: .5 } 72% { transform: scale(1); opacity: .75 } }
                @keyframes zf-gira { to { transform: rotate(360deg) } }

                .zf-pacote { animation-name: zf-pacote; animation-timing-function: linear; animation-iteration-count: infinite }
                .zf-trilha { animation-name: zf-trilha; animation-timing-function: linear; animation-iteration-count: infinite }

                @media (prefers-reduced-motion: reduce) {
                    .zf-pacote, .zf-trilha { animation: none !important }
                    .zf-pacote { stroke-dashoffset: 55 !important }
                }
            `}</style>

            <svg
                viewBox={D.vb}
                className="hidden md:block w-full h-auto"
                role="img"
                aria-label={resumo}
            >
                <Defs sufixo="d" />
                {corpo(false, "d")}
            </svg>

            <svg
                viewBox={M.vb}
                className="block md:hidden w-full h-auto"
                role="img"
                aria-label={resumo}
            >
                <Defs sufixo="m" />
                {corpo(true, "m")}
            </svg>

        </div>
    );
}

/* ── pecas ──────────────────────────────────────────────────────────────── */

function Defs({ sufixo }: { sufixo: string }) {
    return (
        <defs>
            {/* o fundo dos cards: PRETO transparente (vidro escuro) */}
            <linearGradient id={`zf-azul-${sufixo}`} x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#000000" stopOpacity="0.55" />
                <stop offset="100%" stopColor="#000000" stopOpacity="0.7" />
            </linearGradient>
            {/* o brilho que PULSA atrás do cérebro (processando) */}
            <radialGradient id={`zf-nucleo-${sufixo}`}>
                <stop offset="0%" stopColor="#7fe8ff" stopOpacity="0.85" />
                <stop offset="45%" stopColor="#3b6bff" stopOpacity="0.45" />
                <stop offset="100%" stopColor="#1d3fd0" stopOpacity="0" />
            </radialGradient>
            {/* sombra/brilho suave dos cards */}
            <filter id={`zf-card-${sufixo}`} x="-10%" y="-10%" width="120%" height="125%">
                <feDropShadow dx="0" dy="10" stdDeviation="12" floodColor="#0b1d4a" floodOpacity="0.45" />
            </filter>
        </defs>
    );
}

function CardMoldura({ x, y, w, h, rx = 14, tom, ativo = true, sufixo, semMovimento = false }: { x: number; y: number; w: number; h: number; rx?: number; tom: string; ativo?: boolean; sufixo: string; semMovimento?: boolean }) {
    // o fundo PRETO transparente; a BORDA é a trilha pontilhada na cor do par, escorrendo só no par em foco
    const b = { x: x + 0.75, y: y + 0.75, width: w - 1.5, height: h - 1.5, rx };
    const anima = (a: string) => (semMovimento || !ativo ? undefined : a);
    return (
        <g>
            <g filter={`url(#zf-card-${sufixo})`}>
                <rect x={x} y={y} width={w} height={h} rx={rx} fill={`url(#zf-azul-${sufixo})`} />
                {/* brilho de vidro no topo */}
                <rect x={x + 1} y={y + 1} width={w - 2} height={h * 0.42} rx={rx - 1} fill="#ffffff" opacity={0.03} />
            </g>
            {/* a trilha (como a dos fios): tracejada, escorrendo */}
            <rect {...b} fill="none" stroke={tom} strokeOpacity={ativo ? 0.7 : 0.35} strokeWidth={1.4} strokeDasharray="5 5"
                style={{ transition: "stroke .6s ease", animation: anima("zf-trilha 1.1s linear infinite") }} />
        </g>
    );
}


function Texto({
    x,
    y,
    forte,
    mobile,
    children,
}: {
    x: number;
    y: number;
    forte: boolean;
    mobile: boolean;
    children: React.ReactNode;
}) {
    return (
        <text
            x={x}
            y={y}
            className={
                forte
                    ? "fill-slate-900 dark:fill-white font-mono"
                    : "fill-slate-800 dark:fill-white/80 font-mono"
            }
            fontSize={mobile ? 16 : 19}
            dominantBaseline="middle"
            style={{ transition: "fill .35s ease" }}
        >
            {children}
        </text>
    );
}

/** O ponto ao lado da palavra (cresce no par em foco). */
function No({ cx, cy, par, forte }: { cx: number; cy: number; par: Par; forte: boolean }) {
    return (
        <circle cx={cx} cy={cy} r={forte ? 4.4 : 3.4} fill={par.tom} style={{ transition: "r .35s ease" }} />
    );
}

/** A porta onde um fluxo atraca no cerebro. */
function Porta({
    p,
    par,
    forte,
}: {
    p: { x: number; y: number };
    par: Par;
    forte: boolean;
}) {
    return (
        <circle cx={p.x} cy={p.y} r={forte ? 3.2 : 2.4} fill={par.tom} style={{ transition: "r .35s ease" }} />
    );
}

/**
 * Um conector: a trilha pontilhada (escorre só no par em foco) e UM pacote de luz correndo.
 *
 * `pathLength={100}` normaliza o comprimento: dasharray e dashoffset viram
 * porcentagem do caminho, entao o pacote tem o mesmo tamanho e a mesma
 * velocidade relativa em curvas de comprimentos diferentes.
 */
function Fluxo({ d, par, forte, fase = 0 }: { d: string; par: Par; forte: boolean; fase?: number }) {
    const dur = forte ? par.duracao * 0.7 : par.duracao;
    return (
        <g>
            <path
                className={forte ? "zf-trilha" : undefined}
                d={d}
                fill="none"
                stroke={par.tom}
                strokeWidth={forte ? 1.4 : 1}
                strokeDasharray="1.6 5.5"
                strokeLinecap="round"
                opacity={forte ? 0.85 : 0.4}
                style={{ animationDuration: `${par.onda * 0.5}s`, transition: "opacity .35s ease" }}
            />
            <path
                className="zf-pacote"
                d={d}
                fill="none"
                pathLength={100}
                stroke={par.tom}
                strokeWidth={forte ? 2.6 : 1.8}
                strokeLinecap="round"
                strokeDasharray="4 96"
                opacity={forte ? 0.95 : 0.55}
                style={{ animationDuration: `${dur}s`, animationDelay: `${-(par.atraso + fase)}s`, transition: "opacity .35s ease" }}
            />
        </g>
    );
}

function Cerebro({
    cx,
    cy,
    r,
    destaque,
    semMovimento,
    tom,
    sufixo,
}: {
    cx: number;
    cy: number;
    r: number;
    destaque: boolean;
    semMovimento: boolean;
    tom: string;
    sufixo: string;
}) {
    // PROCESSANDO: o núcleo de luz atrás pulsa em rajadas e um anel de dados gira, na cor do fluxo
    const anima = (a: string) => (semMovimento ? undefined : a);
    const centro = { transformBox: "fill-box" as const, transformOrigin: "center" };
    return (
        <g>
            <circle
                cx={cx}
                cy={cy}
                r={r}
                fill="#071033"
                fillOpacity={0.92}
                stroke={tom}
                strokeWidth={destaque ? 1.6 : 1}
                style={{ transition: "stroke .5s ease, stroke-width .35s ease" }}
            />
            {/* o núcleo de luz (atrás do cérebro): pulsa em rajadas */}
            <circle cx={cx} cy={cy} r={r * 0.78} fill={`url(#zf-nucleo-${sufixo})`}
                style={{ ...centro, animation: anima("zf-processa-luz 2.2s ease-in-out infinite"), opacity: semMovimento ? 0.6 : undefined }} />
            {/* o anel de DADOS: tracejado, girando, na cor do fluxo */}
            <circle cx={cx} cy={cy} r={r * 0.9} fill="none" stroke={tom} strokeOpacity={0.55} strokeWidth={1.1} strokeDasharray="2 7" strokeLinecap="round"
                style={{ ...centro, animation: anima("zf-gira 9s linear infinite"), transition: "stroke .5s ease" }} />
            <g>
                <defs>
                    <clipPath id={`zf-asa-${sufixo}`}>
                        <polygon points="5,6 46,19 58,44 53,52 30,51 12,35" />
                    </clipPath>
                </defs>
                <g transform={`translate(${cx - r * 0.62} ${cy - r * 0.62}) scale(${r * 1.24 / 100})`}>
                    <g transform="translate(53 46) rotate(42) scale(.81 .88) translate(-53 -46)"
                        clipPath={`url(#zf-asa-${sufixo})`} opacity={0.7}>
                        <image href={HUMMINGBIRD} width={100} height={100} />
                    </g>
                </g>
                <image
                    href={HUMMINGBIRD}
                    x={cx - r * 0.62}
                    y={cy - r * 0.62}
                    width={r * 1.24}
                    height={r * 1.24}
                    preserveAspectRatio="xMidYMid meet"
                />
            </g>
        </g>
    );
}
