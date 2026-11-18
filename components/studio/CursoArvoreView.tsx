"use client";

/**
 * CursoArvoreView — a UI/UX BASE de TODO curso de CÓDIGO (repo) da Zaeon: a ÁRVORE do curso. O tronco sobe da
 * base e se abre em galhos: cada módulo é um galho que sai da copa (numerados, da esquerda pra direita), cada
 * conceito é um ramo do módulo, e as pontas brotam em pontos de luz. A cor corre do magenta do tronco ao ciano
 * das pontas. A árvore aparece INTEIRA, sempre — um clique num nó abre a lição dele (aprendizado + código + teste)
 * e o "continuar" segue pelo curso todo, na ordem (módulo → conceitos dele → módulo seguinte). Scroll dá zoom,
 * arrastar navega. Sem trilha de botões no topo: o caminho é a própria árvore (nó visitado = miolo aceso).
 *
 * A árvore e as lições vêm EM CAMADAS: a base curada (o `curso.json`/SKILL.md, via `licoes` → estudo,
 * prova e sandbox REAIS) ensina sempre, offline; o grafo do graphify e o understand-anything ENRIQUECEM
 * por cima quando a box está no ar. O board de cada nó mostra o conteúdo real que chegou — nunca um
 * placeholder inventado. Serve QUALQUER curso/skill: a geometria se monta sozinha pra árvores de qualquer tamanho.
 *
 * Motor imperativo (SVG + requestAnimationFrame + viewBox) montado num container via ref. Tela sempre escura
 * (é um quadro próprio, nos dois temas). Sem base nem grafo, degrada pro tronco + aviso, sem travar.
 */
import { useEffect, useRef, useState } from "react";
import PraticaDaLicao from "@/components/study/PraticaDaLicao";
import { useTranslation } from "react-i18next";
import type { ArvoreEntendimento, CursoRepo, NoEntendimento } from "@/lib/forja/tipos";
import type { LicaoCurada, QuestaoProva } from "@/lib/forja/licaoCurada";

const NS = "http://www.w3.org/2000/svg";
const cut = (s: string, n: number) => (s && s.length > n ? s.slice(0, n - 1) + "…" : s || "");

type Nav = { id: string; tipo: "repo" | "mod" | "sim"; titulo: string; dica: string; resumo?: string; mod?: string; filhos: Nav[] };

/** Monta a árvore de navegação (repo → módulos → símbolos) a partir da base de conhecimento real. */
function navDoArvore(arvore: ArvoreEntendimento, repo: string): Nav {
  const sym = (n: NoEntendimento, modTit: string): Nav => ({ id: n.id, tipo: "sim", titulo: n.titulo, dica: "conceito central", resumo: n.resumo, mod: modTit, filhos: [] });
  const mod = (n: NoEntendimento): Nav => ({ id: n.id, tipo: "mod", titulo: n.titulo, dica: ((n.filhos?.length ?? 0) + " conceito(s)"), resumo: n.resumo, filhos: (n.filhos ?? []).map((s) => sym(s, n.titulo)) });
  return { id: "raiz", tipo: "repo", titulo: arvore.raiz.titulo || repo, dica: "o repositório inteiro", resumo: arvore.raiz.resumo, filhos: (arvore.raiz.filhos ?? []).map(mod) };
}

// ─────────────────────── montagem do BOARD da lição (PURA, testável) ───────────────────────
// Realce de sintaxe leve (Python) e bloco de código estilo editor.
const hl = (code: string) => code.split("\n").map((ln) => { const e = ln.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); if (/^\s*#/.test(e)) return '<span class="av-com">' + e + '</span>'; return e.replace(/(&#39;[^&]*?&#39;|&quot;[^&]*?&quot;|'[^']*'|"[^"]*")/g, '<span class="av-str">$1</span>').replace(/\b(from|import|def|class|return|as|with|if|else|elif|for|in|while|None|True|False|and|or|not|lambda|yield|raise|try|except)\b/g, '<span class="av-kw">$1</span>').replace(/\b(\d+)\b/g, '<span class="av-num">$1</span>'); }).join("\n");
const bloco = (titulo: string, codigo: string) => '<div class="av-code"><div class="bar"><span class="dot" style="background:#ff5f56"></span><span class="dot" style="background:#ffbd2e"></span><span class="dot" style="background:#27c93f"></span><span style="margin-left:6px">' + titulo + '</span></div><pre>' + hl(codigo) + '</pre></div>';
// markdown leve e SEGURO (escapa HTML; só `code` e **negrito**), p/ o texto autoral do curso.json.
const esc = (s: string) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const rico = (t: string) => esc(t).replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>");
const paras = (t: string) => String(t || "").trim().split(/\n{2,}/).map((p) => '<p>' + rico(p).replace(/\n/g, "<br>") + "</p>").join("");
const aspas = (s: string) => esc(s).replace(/"/g, "&quot;");
// i18n do board: montarBoardHtml é PURO (injetado como innerHTML, sem contexto React), então recebe uma
// função `tr` em vez de chamar o hook. Default = PT (mantém o teste puro verde); o componente passa o `t`
// real do react-i18next. As chaves vivem em public/locales/<lng>/common.json (forja.board.*).
export type TrFn = (chave: string, opts?: Record<string, unknown>) => string;
const PT_BOARD: Record<string, string> = {
  "forja.board.verResposta": "ver resposta",
  "forja.board.respostaPlaceholder": "digite sua resposta…",
  "forja.board.tagConceito": "conceito",
  "forja.board.tagModulo": "módulo",
  "forja.board.tagRepo": "repositório",
  "forja.board.licaoFallback": "{{titulo}} — a lição entra quando o motor analisar o repositório.",
  "forja.board.noCodigoComplete": "No código — complete você mesmo",
  "forja.board.exercicio": "exercício",
  "forja.board.noCodigo": "No código",
  "forja.board.teste": "Teste",
  "forja.board.desafio": "Desafio",
  "forja.board.continuar": "continuar: {{prox}} ▸",
  "forja.board.concluir": "concluir ✓",
  "forja.board.aprendizado": "Aprendizado",
  "forja.board.voltarArvore": "‹ voltar à árvore",
};
const trPT: TrFn = (k, o) => { let s = PT_BOARD[k] ?? k; if (o) for (const kk in o) s = s.split("{{" + kk + "}}").join(String(o[kk])); return s; };

// uma questão real da prova → HTML (q-choice com opções+explicação; q-written com campo + resposta).
const questaoHtml = (q: QuestaoProva, tr: TrFn) => {
  const head = '<p class="av-qperg">' + rico(q.enunciado) + "</p>";
  if (q.tipo === "escolha") {
    const opts = q.opcoes.map((o) => '<div class="av-opt" data-ok="' + (o.correta ? "1" : "") + '"' + (o.explicacao ? ' data-exp="' + aspas(o.explicacao) + '"' : "") + ">" + rico(o.texto) + "</div>").join("");
    return '<div class="av-qbloco">' + head + '<div class="av-quiz">' + opts + '</div><div class="av-exp"></div></div>';
  }
  const resp = aspas((q.aceitas && q.aceitas[0]) || "");
  return '<div class="av-qbloco">' + head + '<input class="av-in" placeholder="' + aspas(tr("forja.board.respostaPlaceholder")) + '" /><button type="button" class="av-ver" data-resp="' + resp + '">' + esc(tr("forja.board.verResposta")) + '</button><div class="av-exp"></div></div>';
};

/**
 * O HTML da lição de um nó: Aprendizado (o `estudo` real), No código (o sandbox real, ou o espelho
 * honesto do graphify) e Teste (as provas reais). PURO e exportado — o board só injeta e liga eventos.
 * NUNCA fabrica conteúdo: sem lição curada e sem grafo, mostra só o que há, sem inventar código/quiz.
 */
export function montarBoardHtml(args: { titulo: string; tipo: Nav["tipo"]; mod: string; repo: string; resumo?: string; lic?: LicaoCurada; prox?: string; passo?: string; tr?: TrFn }): string {
  const { titulo, tipo, mod, repo, resumo, lic, prox, passo } = args;
  const tr = args.tr ?? trPT;
  const base = String(mod).split(".py")[0];
  const tag = tipo === "sim" ? tr("forja.board.tagConceito") : tipo === "mod" ? tr("forja.board.tagModulo") : tr("forja.board.tagRepo");
  const temResumo = (resumo || "").trim().length > 3;
  const aprendHtml = lic?.estudo ? paras(lic.estudo)
    : temResumo ? paras(resumo!)
    : '<p>' + tr("forja.board.licaoFallback", { titulo: esc(titulo) }) + '</p>';
  let codigoHtml = "";
  if (lic?.sandbox && (lic.sandbox.inicial || "").trim()) {
    codigoHtml = '<h3>' + esc(tr("forja.board.noCodigoComplete")) + '</h3>' + bloco(lic.sandbox.linguagem + " · " + tr("forja.board.exercicio"), lic.sandbox.inicial);
  } else if (!lic && tipo !== "repo") {
    codigoHtml = '<h3>' + esc(tr("forja.board.noCodigo")) + '</h3>' + bloco("python · " + base + ".py", "# símbolo mapeado pelo graphify neste módulo\nfrom " + base + " import " + titulo);
  }
  let testeHtml = "";
  if (lic?.prova?.length) testeHtml += '<h3>' + esc(tr("forja.board.teste")) + '</h3>' + lic.prova.map((q) => questaoHtml(q, tr)).join("");
  if (lic?.desafio) testeHtml += '<h3>' + esc(tr("forja.board.desafio")) + '</h3>' + questaoHtml(lic.desafio, tr);
  const avanco = prox
    ? '<button class="av-btn av-pill av-continuar">' + tr("forja.board.continuar", { prox: esc(cut(prox, 22)) }) + '</button>'
    : '<button class="av-btn av-pill av-voltar">' + esc(tr("forja.board.concluir")) + '</button>';
  const selo = passo ? '<span class="av-passo">' + esc(passo) + "</span>" : "";
  return '<div class="av-card"><div class="tag">' + selo + esc(tag) + " · " + repo + '</div><h1>' + esc(titulo) + "</h1>"
    + '<h3>' + esc(tr("forja.board.aprendizado")) + '</h3>' + aprendHtml
    + codigoHtml
    + testeHtml
    + '<div class="av-nav"><button class="av-btn av-ghost av-voltar">' + esc(tr("forja.board.voltarArvore")) + '</button>' + avanco + '</div></div>';
}

const CSS = `
.av-root{position:absolute;inset:0;overflow:hidden;container-type:inline-size;font-family:ui-sans-serif,system-ui,-apple-system,"SF Pro Display",Segoe UI,Roboto,sans-serif;
  --ink:#eef2ff;--ink2:rgba(232,238,255,.92);--soft:rgba(200,212,240,.6);
  --panel:#1b1c22;--panel-br:rgba(255,255,255,.12);
  --chip:rgba(255,255,255,.06);--chip-br:rgba(255,255,255,.16);
  --code-bg:#0b0d14;--code-ink:#cdd9ec;--code-br:rgba(255,255,255,.12);
  --accent:#67e8f9;--flow:linear-gradient(90deg,#f02bff,#8b5cf6 45%,#22d3ee);
  --bg:#141416;color:var(--ink);background:var(--bg)}
.av-mono{font-family:ui-monospace,SFMono-Regular,Menlo,monospace}
.av-hud{position:absolute;z-index:9;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11px;letter-spacing:.09em;text-transform:uppercase;color:var(--soft);pointer-events:none;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.av-hud.tl{left:28px;top:24px;color:#f1f5f9;max-width:62%}
.av-hud.bl{left:28px;bottom:24px;color:#34d399;max-width:55%}
.av-hud.br{right:28px;bottom:24px}
.av-canto{position:absolute;width:14px;height:14px;border:1px solid rgba(255,255,255,.38);z-index:9;pointer-events:none}
.av-canto.tl{left:14px;top:14px;border-right:0;border-bottom:0}.av-canto.tr{right:14px;top:14px;border-left:0;border-bottom:0}
.av-canto.bl{left:14px;bottom:14px;border-right:0;border-top:0}.av-canto.br{right:14px;bottom:14px;border-left:0;border-top:0}
.av-hint{position:absolute;left:50%;bottom:24px;transform:translateX(-50%);font-size:11px;color:var(--soft);z-index:9;text-align:center;max-width:44%;pointer-events:none}
.av-close{position:absolute;right:30px;top:22px;z-index:10;border:1px solid var(--chip-br);background:var(--chip);color:var(--ink2);border-radius:999px;padding:5px 13px;font-size:12px;cursor:pointer}
.av-close:hover{filter:brightness(1.25)}
.av-svg{position:absolute;inset:0;height:100%;width:100%;touch-action:none;transition:opacity .35s ease}.av-svg.fade{opacity:0}
.av-svg text{user-select:none}
.av-node{cursor:pointer}.av-node:hover .av-ponto{stroke-width:3.4}
.av-halo{animation:avbr 2.6s ease-in-out infinite;transform-box:fill-box;transform-origin:center}@keyframes avbr{0%,100%{opacity:.18;transform:scale(1)}50%{opacity:.5;transform:scale(1.35)}}
.av-rot{font-size:12.5px;fill:#f4f6ff;cursor:pointer;paint-order:stroke;stroke:#141416;stroke-width:4px;stroke-linejoin:round}
.av-rot .n{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:10.5px;fill:#67e8f9;letter-spacing:.06em}
.av-rot.f{font-size:10.5px;fill:rgba(214,224,255,.78)}
.av-rot.g .n{font-size:24px;letter-spacing:0}
.av-rot.oc{opacity:0;pointer-events:none;transition:opacity .15s}.av-rot.oc.ver{opacity:1}
.av-board{position:absolute;inset:0;z-index:12;opacity:0;visibility:hidden;transition:opacity .35s ease;display:grid;place-items:center;overflow:auto;padding:24px;background:var(--bg)}
.av-board.on{opacity:1;visibility:visible}
.av-pair{width:min(720px,100%);min-width:0}
.av-lesson{min-width:0}
.av-card{width:100%;max-height:calc(100dvh - 9rem);overflow:auto;border-radius:26px;padding:28px 30px;background:var(--panel);border:1px solid var(--panel-br);box-shadow:0 30px 90px rgba(0,0,0,.5),inset 0 1px 0 rgba(255,255,255,.06)}
.av-pair.has-code{width:min(1280px,100%);display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.15fr);align-items:center;gap:64px}
.av-editor{min-width:0;position:relative;border-radius:26px;border:1px solid var(--panel-br);color:var(--ink);background:var(--panel);box-shadow:0 24px 64px rgba(0,0,0,.45)}
.av-wire-link{position:absolute;pointer-events:none;right:100%;top:50%;transform:translateY(-50%);width:64px;height:64px;overflow:visible;filter:drop-shadow(0 0 5px var(--accent))}
.av-wire-link .vertical{display:none}
.av-wire-link path{fill:none;stroke:#8b5cf6;stroke-width:2;stroke-linecap:round;opacity:.7}
.av-wire-link .pulse{stroke:#8af2ff;stroke-dasharray:14 46;opacity:1;animation:av-wire-flow 1.45s linear infinite}
@keyframes av-wire-flow{to{stroke-dashoffset:-60}}
@media (prefers-reduced-motion:reduce){.av-wire-link .pulse,.av-halo{animation:none}}
@container (max-width:760px){
  .av-board{padding:12px;place-items:start center}
  .av-pair.has-code{grid-template-columns:minmax(0,1fr);gap:48px}
  .av-card{max-height:none}
  .av-wire-link{right:50%;top:auto;bottom:100%;transform:translateX(50%);height:48px}
  .av-wire-link .horizontal{display:none}
  .av-wire-link .vertical{display:inline}
  .av-hint{display:none}
}
.av-card .tag{font-family:ui-monospace,monospace;font-size:11px;color:var(--accent);display:flex;align-items:center;gap:8px}
.av-passo{font-family:ui-sans-serif,system-ui;font-size:10px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;color:#fff;background:var(--flow);padding:3px 9px;border-radius:999px}
.av-card h1{font-size:23px;margin:10px 0 2px;color:var(--ink)}
.av-card h3{font-size:12px;text-transform:uppercase;letter-spacing:.1em;margin:20px 0 8px;background:var(--flow);-webkit-background-clip:text;background-clip:text;color:transparent}
.av-card p{font-size:15px;line-height:1.62;color:var(--ink2)}
.av-code{border-radius:16px;overflow:hidden;border:1px solid var(--code-br);background:var(--code-bg)}
.av-code .bar{display:flex;align-items:center;gap:7px;padding:8px 13px;background:rgba(255,255,255,.04);border-bottom:1px solid rgba(255,255,255,.08);font-family:ui-monospace,monospace;font-size:11px;color:#9fb3d1}
.av-code .dot{width:9px;height:9px;border-radius:50%;display:inline-block}
.av-code pre{margin:0;background:transparent;padding:14px 16px;color:var(--code-ink);white-space:pre;overflow:auto;font-family:ui-monospace,monospace;font-size:12.5px}
.av-kw{color:#93b4ff}.av-str{color:#6ee7a8}.av-com{color:#7f97b8;font-style:italic}.av-num{color:#f6a56c}
.av-quiz{margin-top:8px;display:flex;flex-direction:column;gap:9px}
.av-opt{border:1px solid var(--chip-br);border-radius:14px;padding:11px 14px;cursor:pointer;font-size:14px;color:var(--ink2);background:var(--chip);transition:.15s}
.av-opt:hover{filter:brightness(1.25)}
.av-opt.ok{border-color:rgba(16,185,129,.7);background:rgba(16,185,129,.16);color:#d1fae5}.av-opt.no{border-color:rgba(239,68,68,.6);background:rgba(239,68,68,.12);color:#fecaca}
.av-nav{display:flex;justify-content:space-between;gap:10px;margin-top:22px}
.av-btn{color:#fff;border-radius:999px;padding:9px 18px;font-size:13px;cursor:pointer;border:0}
.av-ghost{background:var(--chip);border:1px solid var(--chip-br);color:var(--ink2)}.av-ghost:hover{filter:brightness(1.25)}
.av-pill{background:var(--flow);border:0;box-shadow:0 8px 24px rgba(139,92,246,.4),inset 0 1px 0 rgba(255,255,255,.3);font-weight:700}
.av-pill:hover{filter:brightness(1.08)}
.av-card b,.av-card strong{color:var(--accent)}
.av-card code{font-family:ui-monospace,Menlo,monospace;font-size:.9em;background:rgba(103,232,249,.1);border:1px solid var(--chip-br);padding:1px 6px;border-radius:6px;color:var(--accent)}
.av-qbloco{margin-top:14px}.av-qperg{font-size:15px;line-height:1.5;color:var(--ink2);margin:0 0 9px}
.av-in{width:100%;box-sizing:border-box;border-radius:12px;border:1px solid var(--code-br);background:var(--code-bg);color:var(--code-ink);padding:10px 13px;font-size:14px;font-family:ui-monospace,monospace}
.av-ver{margin-top:9px;color:var(--ink2);background:var(--chip);border:1px solid var(--chip-br);border-radius:999px;padding:6px 14px;font-size:12.5px;cursor:pointer}
.av-ver:hover{filter:brightness(1.25)}
.av-exp{font-size:13.5px;line-height:1.55;color:var(--soft)}.av-exp p{font-size:13.5px;margin:9px 0 0}
.av-intro{position:absolute;inset:0;z-index:20;display:grid;place-items:center;pointer-events:none;opacity:0;visibility:hidden;background:radial-gradient(600px 400px at 50% 50%,rgba(139,92,246,.2),transparent 70%)}
.av-intro.play{animation:avintro 1.9s ease forwards}
.av-intro-tit{font-size:clamp(28px,6vw,64px);font-weight:900;letter-spacing:-.03em;text-align:center;padding:0 6%;background:var(--flow);-webkit-background-clip:text;background-clip:text;color:transparent;transform:scale(.86)}
.av-intro.play .av-intro-tit{animation:avintrotit 1.9s cubic-bezier(.2,.7,.2,1) forwards}
@keyframes avintro{0%{opacity:0;visibility:visible}12%{opacity:1}72%{opacity:1}100%{opacity:0;visibility:hidden}}
@keyframes avintrotit{0%{transform:scale(.8);opacity:0}18%{transform:scale(1);opacity:1}70%{transform:scale(1);opacity:1}100%{transform:scale(1.06);opacity:0}}
`;

// ─────────────────────── geometria e cor da ÁRVORE (puras) ───────────────────────
/** a cor ao longo da árvore: 0 = tronco (magenta) → violeta → azul → 1 = pontas (ciano) */
const PARADAS: [number, [number, number, number]][] = [[0, [240, 43, 255]], [0.36, [139, 92, 246]], [0.68, [59, 157, 255]], [1, [94, 234, 212]]];
export function corDaArvore(t: number): string {
  const x = Math.min(1, Math.max(0, t));
  for (let i = 1; i < PARADAS.length; i++) {
    const [t0, a] = PARADAS[i - 1]!, [t1, b] = PARADAS[i]!;
    if (x <= t1) { const k = (x - t0) / (t1 - t0); return "rgb(" + a.map((v, j) => Math.round(v + (b[j]! - v) * k)).join(",") + ")"; }
  }
  return "rgb(94,234,212)";
}
/** a ordem em que o curso é percorrido: cada módulo e, logo depois, os conceitos dele (a raiz fica de fora) */
export function ordemDoCurso<T extends { filhos: T[] }>(raiz: T): T[] {
  const ordem: T[] = [];
  (function andar(n: T) { for (const c of n.filhos || []) { ordem.push(c); andar(c); } })(raiz);
  return ordem;
}

export default function CursoArvoreView({ curso, licoes, titulo, onFechar }: { curso: CursoRepo; licoes?: Record<string, LicaoCurada>; titulo?: string; onFechar?: () => void }) {
  const { t } = useTranslation();
  const ref = useRef<HTMLDivElement | null>(null);
  const [licaoAtiva, setLicaoAtiva] = useState<{ id: string; titulo: string } | null>(null);
  const sandbox = licaoAtiva ? licoes?.[licaoAtiva.id]?.sandbox : undefined;
  const cabecalho = (titulo || curso.arvore.raiz.titulo || "").trim();
  const semMapa = (curso.arvore.raiz.filhos?.length ?? 0) === 0;

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const svg = root.querySelector(".av-svg") as SVGSVGElement;
    const world = root.querySelector(".av-world") as SVGGElement;
    const overlay = root.querySelector(".av-board") as HTMLDivElement;
    const boardEl = root.querySelector(".av-lesson") as HTMLDivElement;
    const hintEl = root.querySelector(".av-hint") as HTMLDivElement;
    const contaEl = root.querySelector(".av-hud.br") as HTMLDivElement;
    const introEl = root.querySelector(".av-intro") as HTMLDivElement | null;
    const introTit = root.querySelector(".av-intro-tit") as HTMLDivElement | null;
    let abertura: ReturnType<typeof setTimeout> | undefined;
    const REPO = curso.repo;
    const TREE = navDoArvore(curso.arvore, REPO);
    const LICOES: Record<string, LicaoCurada> = licoes || {};

    const el = (tag: string, a: Record<string, string | number> = {}) => { const e = document.createElementNS(NS, tag); for (const k in a) e.setAttribute(k, String(a[k])); return e; };
    const parentOf = new Map<Nav, Nav>();
    (function walk(n: Nav) { (n.filhos || []).forEach((c) => { parentOf.set(c, n); walk(c); }); })(TREE);
    // a ordem do curso: módulo, os conceitos dele, o módulo seguinte… — é por ela que o "continuar" anda
    const ORDEM = ordemDoCurso(TREE);
    const vistos = new Set<string>();
    type P = { x: number; y: number; dir: number; depth: number };
    const pos = new Map<Nav, P>();
    const COPA = { x: 600, y: 560 };   // onde o tronco se abre em galhos (a raiz do curso)
    let vb = { x: 0, y: 0, w: 1200, h: 820 }, tween: any = null, raf = 0;
    let AR = 1200 / 820;   // a proporção do QUADRO real (recalculada a cada desenho: no celular ele é em pé)
    const unit = (a: number) => ({ x: Math.cos(a), y: Math.sin(a) });
    // "sorteio" fixo por nó: a árvore nasce sempre igual pro mesmo curso
    const sorte = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 1000) / 1000; }; };

    /** TODOS os nós já no lugar: os módulos abrem em leque a partir da copa (1 → n, da esquerda pra direita)
     *  e os conceitos de cada módulo abrem em leque a partir dele. Nada some, nada precisa ser "aberto". */
    function layout() {
      pos.clear(); pos.set(TREE, { x: COPA.x, y: COPA.y, dir: -Math.PI / 2, depth: 0 });
      const mods = TREE.filhos || [], n = mods.length;
      const leque = Math.min(150, 46 + n * 24) * Math.PI / 180;
      mods.forEach((m, i) => {
        const a = n > 1 ? -Math.PI / 2 - leque / 2 + (i / (n - 1)) * leque : -Math.PI / 2;
        const L = 200 + Math.min(70, n * 7) + (i % 2 ? 36 : 0);
        const p: P = { x: COPA.x + Math.cos(a) * L, y: COPA.y + Math.sin(a) * L, dir: a, depth: 1 };
        pos.set(m, p);
        const fs = m.filhos || [], k = fs.length;
        const sub = Math.min(112, 30 + k * 18) * Math.PI / 180;
        fs.forEach((f, j) => {
          const b = k > 1 ? a - sub / 2 + (j / (k - 1)) * sub : a;
          const L2 = 100 + Math.min(50, k * 5) + (j % 2 ? 20 : 0);
          pos.set(f, { x: p.x + Math.cos(b) * L2, y: p.y + Math.sin(b) * L2, dir: b, depth: 2 });
        });
      });
    }
    function ramo(p: P, c: P) {
      const d = Math.hypot(c.x - p.x, c.y - p.y), u = unit(p.dir), v = unit(c.dir);
      const c1 = { x: p.x + u.x * d * .42, y: p.y + u.y * d * .42 }, c2 = { x: c.x - v.x * d * .4, y: c.y - v.y * d * .4 };
      return "M " + p.x.toFixed(1) + " " + p.y.toFixed(1) + " C " + c1.x.toFixed(1) + " " + c1.y.toFixed(1) + " " + c2.x.toFixed(1) + " " + c2.y.toFixed(1) + " " + c.x.toFixed(1) + " " + c.y.toFixed(1);
    }
    const contar = () => { contaEl.textContent = vistos.size + "/" + ORDEM.length; };

    function render() {
      layout(); world.innerHTML = "";
      hintEl.innerHTML = t("forja.arvore.hintRaiz");
      const quadro = svg.getBoundingClientRect();
      if (quadro.width > 0 && quadro.height > 0) AR = quadro.width / quadro.height;
      // tela estreita (celular): os nomes não cabem legíveis — fica só o NÚMERO do módulo, grande; o nome abre com a lição
      const estreito = quadro.width > 0 && quadro.width < 560;
      const defs = el("defs"), gT = el("g"), gB = el("g"), gL = el("g"), gN = el("g"), gR = el("g");
      world.appendChild(defs); world.appendChild(gT); world.appendChild(gB); world.appendChild(gL); world.appendChild(gN); world.appendChild(gR);
      let nGrad = 0;
      const ext = { minx: COPA.x - 60, miny: COPA.y - 40, maxx: COPA.x + 60, maxy: COPA.y + 230 };
      const cabe = (x: number, y: number) => { ext.minx = Math.min(ext.minx, x); ext.maxx = Math.max(ext.maxx, x); ext.miny = Math.min(ext.miny, y); ext.maxy = Math.max(ext.maxy, y); };
      const tinta = (x1: number, y1: number, x2: number, y2: number, t0: number, t1: number) => {
        const id = "av-e" + (nGrad++);
        const g = el("linearGradient", { id, gradientUnits: "userSpaceOnUse", x1, y1, x2, y2 });
        g.appendChild(el("stop", { offset: "0%", "stop-color": corDaArvore(t0) })); g.appendChild(el("stop", { offset: "100%", "stop-color": corDaArvore(t1) }));
        defs.appendChild(g); return "url(#" + id + ")";
      };
      // o TRONCO: sobe da base (sai por baixo do quadro) até a copa, grosso e magenta
      const base = COPA.y + 1400;
      gT.appendChild(el("path", { d: "M " + COPA.x + " " + base + " L " + COPA.x + " " + COPA.y, fill: "none", stroke: corDaArvore(0), "stroke-width": 22, "stroke-opacity": .22, "stroke-linecap": "round", filter: "url(#av-soft)" }));
      gT.appendChild(el("path", { d: "M " + COPA.x + " " + base + " L " + COPA.x + " " + COPA.y, fill: "none", stroke: corDaArvore(0), "stroke-width": 9, "stroke-linecap": "round", class: "av-tronco" }));

      // os BROTOS: galhinhos decorativos que saem de cada ponta, terminando em pontos brancos (a copa)
      const folhas = ORDEM.filter((n) => !(n.filhos || []).length).length + (ORDEM.length ? 0 : 1);
      const niveis = folhas > 40 ? 1 : folhas > 16 ? 2 : folhas > 6 ? 3 : 4;
      function broto(x: number, y: number, dir: number, len: number, nivel: number, t0: number, rng: () => number) {
        if (nivel === 0) { gB.appendChild(el("circle", { cx: x.toFixed(1), cy: y.toFixed(1), r: 1.6, fill: "#fff", "fill-opacity": .92 })); cabe(x, y); return; }
        for (const lado of [-1, 1]) {
          const a = dir + lado * (0.3 + rng() * 0.3), l = len * (0.74 + rng() * 0.3);
          const x2 = x + Math.cos(a) * l, y2 = y + Math.sin(a) * l, mx = x + Math.cos(dir) * l * .5, my = y + Math.sin(dir) * l * .5;
          const t1 = Math.min(1, t0 + 0.12);
          gB.appendChild(el("path", { d: "M " + x.toFixed(1) + " " + y.toFixed(1) + " Q " + mx.toFixed(1) + " " + my.toFixed(1) + " " + x2.toFixed(1) + " " + y2.toFixed(1), fill: "none", stroke: tinta(x, y, x2, y2, t0, t1), "stroke-width": (0.7 + nivel * 0.45).toFixed(2), "stroke-opacity": .85, "stroke-linecap": "round" }));
          broto(x2, y2, a, l * .78, nivel - 1, t1, rng);
        }
      }

      // os GALHOS: a copa liga a CADA módulo, e cada módulo aos conceitos dele — tudo conectado ao tronco
      for (const [node, p] of pos) {
        const pai = parentOf.get(node);
        if (pai) {
          const pp = pos.get(pai)!, d = ramo(pp, p), prof = p.depth;
          const t0 = prof === 1 ? 0.08 : 0.5, t1 = prof === 1 ? 0.5 : 0.82, w = prof === 1 ? 5 : 2.4;
          const cor = tinta(pp.x, pp.y, p.x, p.y, t0, t1);
          gL.appendChild(el("path", { d, fill: "none", stroke: cor, "stroke-width": w + 7, "stroke-opacity": .16, "stroke-linecap": "round", filter: "url(#av-soft)" }));
          gL.appendChild(el("path", { d, fill: "none", stroke: cor, "stroke-width": w, "stroke-linecap": "round", class: "av-ramo", "data-de": pai.id, "data-para": node.id }));
        }
        cabe(p.x, p.y);
        if (!(node.filhos || []).length) broto(p.x, p.y, p.dir, node === TREE ? 96 : p.depth === 1 ? 62 : 44, niveis, node === TREE ? 0.3 : p.depth === 1 ? 0.55 : 0.84, sorte(node.id + ":" + REPO));
      }

      // os NÓS (clicáveis): um clique abre a lição. Visitado = miolo aceso.
      const muitos = ORDEM.length > 26;
      const rotulos: { tx: Element; x0: number; x1: number; y: number; mod: boolean }[] = [];
      for (const [node, p] of pos) {
        const ehRaiz = node === TREE, r = ehRaiz ? 9 : p.depth === 1 ? 8 : 5.5;
        const cor = corDaArvore(ehRaiz ? 0.08 : p.depth === 1 ? 0.5 : 0.82), visto = vistos.has(node.id);
        const g = el("g", { class: "av-node", "data-id": node.id });
        g.appendChild(el("circle", { cx: p.x, cy: p.y, r: r + 12, fill: "transparent" }));   // área de toque
        g.appendChild(el("circle", { cx: p.x, cy: p.y, r: r + 5, fill: cor, "fill-opacity": .35, class: "av-halo", filter: "url(#av-soft)" }));
        g.appendChild(el("circle", { cx: p.x, cy: p.y, r, fill: visto ? "#ffffff" : "#141416", stroke: cor, "stroke-width": 2.4, class: "av-ponto" }));
        if (!visto) g.appendChild(el("circle", { cx: p.x, cy: p.y, r: Math.max(1.6, r * .3), fill: "#ffffff" }));
        const dica = el("title"); dica.textContent = node.titulo; g.appendChild(dica);
        g.addEventListener("click", (e) => { e.stopPropagation(); abrirBoard(node); });
        gN.appendChild(g);
        if (ehRaiz || (estreito && p.depth !== 1)) continue;
        // o RÓTULO: o número do módulo + o nome; fica do lado de fora do galho
        const lado = Math.cos(p.dir) < -0.2 ? -1 : 1;
        const tx = el("text", { x: (p.x + lado * (r + 9)).toFixed(1), y: (p.y + r + 15).toFixed(1), "text-anchor": lado < 0 ? "end" : "start", class: "av-rot" + (estreito ? " g" : p.depth === 2 ? " f" + (muitos ? " oc" : "") : "") });
        if (p.depth === 1) { const num = el("tspan", { class: "n" }); num.textContent = String((TREE.filhos || []).indexOf(node) + 1).padStart(2, "0") + "  "; tx.appendChild(num); }
        if (!estreito) tx.appendChild(document.createTextNode(cut(node.titulo, p.depth === 1 ? 30 : 24)));
        tx.addEventListener("click", (e) => { e.stopPropagation(); abrirBoard(node); });
        g.addEventListener("pointerenter", () => tx.classList.add("ver")); g.addEventListener("pointerleave", () => tx.classList.remove("ver"));
        gR.appendChild(tx);
        const larg = estreito ? 34 : (p.depth === 1 ? 4 : 0) * 6.4 + cut(node.titulo, p.depth === 1 ? 30 : 24).length * (p.depth === 1 ? 6.6 : 5.6), xa = p.x + lado * (r + 9);
        rotulos.push({ tx, x0: lado < 0 ? xa - larg : xa, x1: lado < 0 ? xa : xa + larg, y: p.y + r + 15, mod: p.depth === 1 });
        cabe(p.x + lado * (r + 9 + larg), p.y + r + 22);
      }
      // rótulos não se pisam: os dos módulos ficam onde estão; um rótulo que cairia em cima de outro desce uma linha
      const postos: typeof rotulos = [];
      for (const rt of [...rotulos].sort((a, b) => Number(b.mod) - Number(a.mod))) {
        for (let tent = 0; tent < 6 && postos.some((o) => rt.x0 < o.x1 + 6 && rt.x1 > o.x0 - 6 && Math.abs(rt.y - o.y) < 13); tent++) rt.y += 13;
        rt.tx.setAttribute("y", rt.y.toFixed(1)); postos.push(rt); cabe(rt.x0, rt.y + 8);
      }
      contar();
      // a câmera enquadra a árvore INTEIRA (nada fica fora da tela por causa de um clique)
      const pad = 46; let w = ext.maxx - ext.minx + pad * 2, h = ext.maxy - ext.miny + pad * 2;
      if (w / h < AR) w = h * AR; else h = w / AR;
      zoomVB({ x: (ext.minx + ext.maxx) / 2 - w / 2, y: (ext.miny + ext.maxy) / 2 - h / 2, w, h }, 520);
    }
    function setVB() { svg.setAttribute("viewBox", vb.x + " " + vb.y + " " + vb.w + " " + vb.h); }
    function zoomVB(target: any, dur: number, cb?: () => void) { tween = { a: { ...vb }, b: target, t0: performance.now(), dur, cb }; }
    // o relógio é o MESMO do início do tween (performance.now): o carimbo que o rAF entrega pode vir de outra base e deixava
    // o progresso negativo (a câmera recuava antes de ir, e a lição demorava a abrir)
    function loop() { if (tween) { const k = Math.min(1, Math.max(0, (performance.now() - tween.t0) / tween.dur)), e = 1 - Math.pow(1 - k, 3); vb.x = tween.a.x + (tween.b.x - tween.a.x) * e; vb.y = tween.a.y + (tween.b.y - tween.a.y) * e; vb.w = tween.a.w + (tween.b.w - tween.a.w) * e; vb.h = tween.a.h + (tween.b.h - tween.a.h) * e; setVB(); if (k >= 1) { const cb = tween.cb; tween = null; if (cb) cb(); } } raf = requestAnimationFrame(loop); }

    // UM clique abre a lição: a câmera mergulha no nó e o board entra por cima, opaco
    function abrirBoard(no: Nav) { const f = pos.get(no) || { ...COPA }; zoomVB({ x: f.x - 150, y: f.y - 110, w: 300, h: 205 }, 380, () => { svg.classList.add("fade"); clearTimeout(abertura); abertura = setTimeout(() => montarBoard(no), 160); }); }
    function montarBoard(r: Nav) {
      const lic = LICOES[r.id];
      const par = parentOf.get(r), mod = r.mod || (par ? par.titulo : REPO);
      // o PRÓXIMO é o seguinte na ordem do curso inteiro (módulo → conceitos dele → módulo seguinte),
      // não só o irmão: do 1º módulo dá pra seguir até o fim sem voltar pra árvore
      const i = ORDEM.indexOf(r);
      const prox = r === TREE ? ORDEM[0] ?? null : i >= 0 && i < ORDEM.length - 1 ? ORDEM[i + 1]! : null;
      const modulos = TREE.filhos || [], im = modulos.indexOf(r);
      const passo = im >= 0 ? t("forja.arvore.passo", { i: im + 1, n: modulos.length }) : "";
      boardEl.innerHTML = montarBoardHtml({ titulo: r.titulo, tipo: r.tipo, mod, repo: REPO, resumo: r.resumo, lic, prox: prox?.titulo, passo, tr: t });
      if (r !== TREE) { vistos.add(r.id); contar(); }
      setLicaoAtiva({ id: r.id, titulo: r.titulo });
      overlay.classList.add("on"); overlay.scrollTop = 0;
      boardEl.querySelectorAll(".av-continuar").forEach((b) => b.addEventListener("click", () => { if (prox) montarBoard(prox); }));
      // interação por BLOCO (cada questão é independente — antes um clique zerava o board inteiro).
      boardEl.querySelectorAll(".av-qbloco").forEach((bl) => {
        const exp = bl.querySelector(".av-exp") as HTMLElement | null;
        bl.querySelectorAll(".av-opt").forEach((o) => o.addEventListener("click", () => {
          bl.querySelectorAll(".av-opt").forEach((x) => x.classList.remove("ok", "no"));
          const el2 = o as HTMLElement;
          o.classList.add(el2.dataset.ok ? "ok" : "no");
          if (exp) exp.innerHTML = el2.dataset.exp ? "<p>" + el2.dataset.exp + "</p>" : "";
        }));
        const ver = bl.querySelector(".av-ver") as HTMLElement | null;
        if (ver) ver.addEventListener("click", () => { if (exp) exp.innerHTML = "<p>" + esc(t("forja.board.aceitaExemplo")) + " <code>" + (ver.dataset.resp || "") + "</code></p>"; });
      });
      boardEl.querySelectorAll(".av-voltar").forEach((b) => b.addEventListener("click", voltar));
    }
    function fecharBoard() { overlay.classList.remove("on"); setLicaoAtiva(null); }
    function voltar() { fecharBoard(); svg.classList.remove("fade"); render(); }

    // zoom manual + pan
    const onWheel = (e: WheelEvent) => { e.preventDefault(); tween = null; const m = svg.getScreenCTM()!.inverse(); const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY; const s = pt.matrixTransform(m); const f = e.deltaY > 0 ? 1.12 : .89; const nw = Math.min(3600, Math.max(240, vb.w * f)); const nh = nw / AR; vb.x = s.x - (s.x - vb.x) * (nw / vb.w); vb.y = s.y - (s.y - vb.y) * (nh / vb.h); vb.w = nw; vb.h = nh; setVB(); };
    let pan: any = null;
    const onDown = (e: PointerEvent) => { const alvo = e.target as Element; if (alvo.closest && (alvo.closest(".av-node") || alvo.closest(".av-rot"))) return; pan = { x: e.clientX, y: e.clientY, vx: vb.x, vy: vb.y }; tween = null; try { svg.setPointerCapture(e.pointerId); } catch (_) {} };
    const onMove = (e: PointerEvent) => { if (!pan) return; const rct = svg.getBoundingClientRect(); vb.x = pan.vx - (e.clientX - pan.x) / rct.width * vb.w; vb.y = pan.vy - (e.clientY - pan.y) / rct.height * vb.h; setVB(); };
    const onUp = () => { pan = null; };
    svg.addEventListener("wheel", onWheel, { passive: false }); svg.addEventListener("pointerdown", onDown); svg.addEventListener("pointermove", onMove); svg.addEventListener("pointerup", onUp); svg.addEventListener("pointercancel", onUp);

    // intro: o TÍTULO do curso entra animado, grande e centrado, e some revelando a árvore.
    if (introEl && introTit) { introTit.textContent = cut(curso.arvore.raiz.titulo || REPO, 42); introEl.classList.remove("play"); void introEl.offsetWidth; introEl.classList.add("play"); }

    setVB(); raf = requestAnimationFrame(loop); render();
    let larguraVista = svg.getBoundingClientRect().width;
    const olho = typeof ResizeObserver !== "undefined" ? new ResizeObserver(() => { const w = svg.getBoundingClientRect().width; if (Math.abs(w - larguraVista) < 24 || overlay.classList.contains("on")) return; larguraVista = w; render(); }) : null;
    olho?.observe(svg);
    return () => { olho?.disconnect(); clearTimeout(abertura); cancelAnimationFrame(raf); svg.removeEventListener("wheel", onWheel); svg.removeEventListener("pointerdown", onDown); svg.removeEventListener("pointermove", onMove); svg.removeEventListener("pointerup", onUp); svg.removeEventListener("pointercancel", onUp); world.innerHTML = ""; boardEl.innerHTML = ""; overlay.classList.remove("on"); svg.classList.remove("fade"); setLicaoAtiva(null); };
  }, [curso.arvore, curso.repo, licoes, t]);

  return (
    <div ref={ref} className="av-root">
      <style>{CSS}</style>
      <i className="av-canto tl" /><i className="av-canto tr" /><i className="av-canto bl" /><i className="av-canto br" />
      <div className="av-hud tl">{cabecalho}</div>
      <div className="av-hud bl">{curso.repo}</div>
      <div className="av-hud br" />
      <div className="av-hint" />
      {onFechar && <button type="button" className="av-close" onClick={onFechar}>{t("forja.arvore.fechar")}</button>}
      <svg className="av-svg" viewBox="0 0 1200 820" preserveAspectRatio="xMidYMid meet">
        <defs>
          <filter id="av-soft" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="5" /></filter>
        </defs>
        <g className="av-world" />
      </svg>
      <div className="av-board">
        <div className={sandbox ? "av-pair has-code" : "av-pair"}>
          <div className="av-lesson" />
          {sandbox && licaoAtiva && (
            <aside className="av-editor">
              <svg className="av-wire-link" viewBox="0 0 64 64" preserveAspectRatio="none" aria-hidden="true">
                <g className="horizontal">
                  <path d="M0 32 C19 7 45 57 64 32" />
                  <path className="pulse" d="M0 32 C19 7 45 57 64 32" />
                </g>
                <g className="vertical">
                  <path d="M32 0 C6 18 58 46 32 64" />
                  <path className="pulse" d="M32 0 C6 18 58 46 32 64" />
                </g>
              </svg>
              <PraticaDaLicao key={licaoAtiva.id} sandbox={sandbox} titulo={licaoAtiva.titulo} />
            </aside>
          )}
        </div>
      </div>
      <div className="av-intro"><div className="av-intro-tit" /></div>
      {semMapa && (
        <div className="av-hint" style={{ bottom: 48 }}>{t("forja.arvore.semMapa")}</div>
      )}
    </div>
  );
}
