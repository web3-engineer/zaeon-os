"use client";

/**
 * CursoArvoreView — a UI/UX BASE de TODO curso de CÓDIGO (repo) da Zaeon: a Árvore do repositório como
 * uma JORNADA fractal de aprendizado. A raiz é o repo; cada ramo é um módulo central; cada folha, um
 * conceito. Clicar num nó dá ZOOM e expande os filhos ALI MESMO (a árvore cresce, conectada); clicar nele
 * de novo abre o BOARD da lição (aprendizado + código destacado + teste). Scroll dá zoom, arrastar navega.
 *
 * A árvore e as lições vêm EM CAMADAS: a base curada (o `curso.json`/SKILL.md, via `licoes` → estudo,
 * prova e sandbox REAIS) ensina sempre, offline; o grafo do graphify e o understand-anything ENRIQUECEM
 * por cima quando a box está no ar. O board de cada nó mostra o conteúdo real que chegou — nunca um
 * placeholder inventado. Serve QUALQUER curso/skill: a geometria se monta sozinha pra árvores de qualquer tamanho.
 *
 * Motor imperativo (SVG + requestAnimationFrame + viewBox) montado num container via ref. Estilo Liquid
 * Glass, cores da casa. Sem base nem grafo, degrada pro esqueleto (raiz + aviso), sem travar.
 */
import { useEffect, useRef, useState, type ReactNode } from "react";
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
.av-root{position:absolute;inset:0;overflow:hidden;font-family:ui-sans-serif,system-ui,-apple-system,"SF Pro Display",Segoe UI,Roboto,sans-serif;
  --ink:#0b1b3a;--ink2:rgba(17,32,66,.92);--soft:rgba(30,52,96,.62);
  --panel:rgba(255,255,255,.74);--panel-br:rgba(30,64,140,.16);
  --chip:rgba(255,255,255,.72);--chip-br:rgba(30,64,140,.18);
  --code-bg:rgba(9,20,44,.94);--code-ink:#dbe7ff;--code-br:rgba(120,160,230,.22);
  --scrim:rgba(14,26,54,.34);--accent:#2563eb;
  --flow:linear-gradient(90deg,#2563eb,#38bdf8 55%,#06b6d4);
  --bg:radial-gradient(1100px 760px at 18% 4%,rgba(37,99,235,.16),transparent 60%),radial-gradient(1000px 820px at 86% 92%,rgba(6,182,212,.13),transparent 62%),linear-gradient(180deg,#eef4fe,#e6eefb);
  color:var(--ink);background:var(--bg)}
.dark .av-root{--ink:#eaf0ff;--ink2:rgba(234,240,255,.9);--soft:rgba(214,224,255,.6);
  --panel:rgba(255,255,255,.07);--panel-br:rgba(255,255,255,.18);
  --chip:rgba(255,255,255,.06);--chip-br:rgba(255,255,255,.14);
  --code-bg:rgba(3,7,15,.55);--code-ink:#cdd9ec;--code-br:rgba(255,255,255,.12);
  --scrim:rgba(6,8,20,.5);--accent:#60a5fa;
  --flow:linear-gradient(90deg,#3b82f6,#38bdf8 50%,#22d3ee);
  --bg:radial-gradient(1100px 760px at 20% 6%,rgba(37,99,235,.22),transparent 60%),radial-gradient(1000px 820px at 84% 90%,rgba(34,211,238,.16),transparent 62%),radial-gradient(760px 560px at 60% 42%,rgba(56,96,180,.14),transparent 60%),#04070f}
.av-head{position:absolute;left:20px;top:14px;z-index:9}
.av-repo{font-family:ui-monospace,Menlo,monospace;font-size:12px;color:var(--soft)}
.av-tit{font-size:17px;font-weight:800;letter-spacing:-.02em;margin-top:2px;background:var(--flow);-webkit-background-clip:text;background-clip:text;color:transparent}
.av-crumbs{position:absolute;left:20px;top:54px;z-index:9;display:flex;gap:7px;flex-wrap:wrap;max-width:66%;font-size:12px}
.av-crumb{color:var(--ink2);cursor:pointer;padding:4px 12px;border-radius:999px;background:var(--chip);border:1px solid var(--chip-br);backdrop-filter:blur(16px)}
.av-crumb:hover{filter:brightness(1.06)}.av-crumb.cur{color:#fff;font-weight:700;background:var(--flow);border-color:transparent}
.av-hint{position:absolute;left:50%;bottom:14px;transform:translateX(-50%);font-size:11px;color:var(--soft);z-index:9;text-align:center}
.av-close{position:absolute;right:16px;top:16px;z-index:10;border:1px solid var(--chip-br);background:var(--chip);color:var(--ink2);border-radius:999px;padding:5px 13px;font-size:12px;cursor:pointer;backdrop-filter:blur(16px)}
.av-close:hover{filter:brightness(1.06)}
.av-svg{position:absolute;inset:0;height:100%;width:100%;touch-action:none;transition:opacity .4s ease}.av-svg.fade{opacity:0}
.av-svg text{user-select:none;pointer-events:none}.av-node{cursor:pointer}
.av-halo{animation:avbr 2.4s ease-in-out infinite;transform-box:fill-box;transform-origin:center}@keyframes avbr{0%,100%{opacity:.3;transform:scale(1)}50%{opacity:.7;transform:scale(1.4)}}
.av-trail-flow{animation:avdash 2.2s linear infinite}@keyframes avdash{to{stroke-dashoffset:-30}}
.av-gv{width:100%;height:100%;display:flex;flex-direction:column;justify-content:center;border-radius:14px;padding:6px 11px;background:var(--panel);backdrop-filter:blur(22px) saturate(1.4);border:1px solid var(--panel-br);box-shadow:0 8px 22px rgba(10,30,70,.18),inset 0 1px 0 rgba(255,255,255,.3)}
.av-gv b{font-size:12px;color:var(--ink);line-height:1.1;display:flex;align-items:center;gap:6px}.av-gv small{font-size:9.5px;color:var(--soft)}
.av-step{font-style:normal;font-size:10px;font-weight:800;color:#fff;background:var(--flow);min-width:16px;height:16px;padding:0 4px;border-radius:999px;display:inline-flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(37,99,235,.5)}
.av-cue{width:100%;height:100%;display:flex;align-items:center;justify-content:center;border-radius:999px;font-size:10.5px;font-weight:700;color:#fff;background:var(--flow);box-shadow:0 6px 16px rgba(37,99,235,.5)}
.av-board{position:absolute;inset:0;z-index:12;opacity:0;visibility:hidden;transition:opacity .45s ease;display:grid;place-items:center;background:var(--scrim)}
.av-board.on{opacity:1;visibility:visible}
.av-root{container-type:inline-size}
.av-board{overflow:auto;padding:24px}
.av-pair{width:min(720px,100%);min-width:0}
.av-lesson{min-width:0}
.av-lesson>.av-card{width:100%;max-height:calc(100dvh - 9rem)}
.av-pair.has-code{width:min(1280px,100%);display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.15fr);align-items:center;gap:64px}
.av-editor{min-width:0;position:relative;border-radius:30px;border:1px solid var(--panel-br);color:var(--ink);background:var(--panel);backdrop-filter:blur(24px);box-shadow:0 24px 64px rgba(8,20,50,.28)}
.av-wire-link{position:absolute;pointer-events:none;right:100%;top:50%;transform:translateY(-50%);width:64px;height:64px;overflow:visible;filter:drop-shadow(0 0 5px var(--accent))}
.av-wire-link .vertical{display:none}
.av-wire-link path{fill:none;stroke:#3d94eb;stroke-width:2;stroke-linecap:round;opacity:.7}
.av-wire-link .pulse{stroke:#8af2ff;stroke-dasharray:14 46;opacity:1;animation:av-wire-flow 1.45s linear infinite}
@keyframes av-wire-flow{to{stroke-dashoffset:-60}}
@media (prefers-reduced-motion:reduce){.av-wire-link .pulse{animation:none}}
@container (max-width:760px){
  .av-board{padding:12px;place-items:start center}
  .av-pair.has-code{grid-template-columns:minmax(0,1fr);gap:48px}
  .av-lesson>.av-card{max-height:none}
  .av-wire-link{right:50%;top:auto;bottom:100%;transform:translateX(50%);height:48px}
  .av-wire-link .horizontal{display:none}
  .av-wire-link .vertical{display:inline}
}
.av-card{max-height:none}
  .av-editor::before{right:50%;top:auto;bottom:100%;width:2px;height:24px}
}
.av-card{width:min(720px,92%);max-height:88%;overflow:auto;border-radius:30px;padding:28px 30px;background:var(--panel);backdrop-filter:blur(40px) saturate(1.5);border:1px solid var(--panel-br);box-shadow:0 30px 90px rgba(8,20,50,.35),inset 0 1px 0 rgba(255,255,255,.3)}
.av-card .tag{font-family:ui-monospace,monospace;font-size:11px;color:var(--accent);display:flex;align-items:center;gap:8px}
.av-passo{font-family:ui-sans-serif,system-ui;font-size:10px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;color:#fff;background:var(--flow);padding:3px 9px;border-radius:999px;box-shadow:0 2px 10px rgba(37,99,235,.45)}
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
.av-opt:hover{filter:brightness(1.05)}
.av-opt.ok{border-color:rgba(16,185,129,.7);background:rgba(16,185,129,.16);color:#065f46}.av-opt.no{border-color:rgba(239,68,68,.6);background:rgba(239,68,68,.12)}
.dark .av-opt.ok{color:#d1fae5}.dark .av-opt.no{color:#fecaca}
.av-nav{display:flex;justify-content:space-between;gap:10px;margin-top:22px}
.av-btn{color:#fff;border-radius:999px;padding:9px 18px;font-size:13px;cursor:pointer;border:0}
.av-ghost{background:var(--chip);border:1px solid var(--chip-br);color:var(--ink2);backdrop-filter:blur(16px)}.av-ghost:hover{filter:brightness(1.06)}
.av-pill{background:var(--flow);border:0;box-shadow:0 8px 24px rgba(37,99,235,.42),inset 0 1px 0 rgba(255,255,255,.35);font-weight:700}
.av-pill:hover{filter:brightness(1.07)}
.av-card b,.av-card strong{color:var(--accent)}
.av-card code{font-family:ui-monospace,Menlo,monospace;font-size:.9em;background:rgba(37,99,235,.12);border:1px solid var(--chip-br);padding:1px 6px;border-radius:6px;color:var(--accent)}
.av-qbloco{margin-top:14px}.av-qperg{font-size:15px;line-height:1.5;color:var(--ink2);margin:0 0 9px}
.av-in{width:100%;box-sizing:border-box;border-radius:12px;border:1px solid var(--code-br);background:var(--code-bg);color:var(--code-ink);padding:10px 13px;font-size:14px;font-family:ui-monospace,monospace}
.av-ver{margin-top:9px;color:var(--ink2);background:var(--chip);border:1px solid var(--chip-br);border-radius:999px;padding:6px 14px;font-size:12.5px;cursor:pointer}
.av-ver:hover{filter:brightness(1.06)}
.av-exp{font-size:13.5px;line-height:1.55;color:var(--soft)}.av-exp p{font-size:13.5px;margin:9px 0 0}
.av-intro{position:absolute;inset:0;z-index:20;display:grid;place-items:center;pointer-events:none;opacity:0;visibility:hidden;background:radial-gradient(600px 400px at 50% 50%,rgba(37,99,235,.18),transparent 70%)}
.av-intro.play{animation:avintro 1.9s ease forwards}
.av-intro-tit{font-size:clamp(28px,6vw,64px);font-weight:900;letter-spacing:-.03em;text-align:center;padding:0 6%;background:var(--flow);-webkit-background-clip:text;background-clip:text;color:transparent;transform:scale(.86);filter:drop-shadow(0 10px 40px rgba(37,99,235,.4))}
.av-intro.play .av-intro-tit{animation:avintrotit 1.9s cubic-bezier(.2,.7,.2,1) forwards}
@keyframes avintro{0%{opacity:0;visibility:visible}12%{opacity:1}72%{opacity:1}100%{opacity:0;visibility:hidden}}
@keyframes avintrotit{0%{transform:scale(.8);opacity:0}18%{transform:scale(1);opacity:1}70%{transform:scale(1);opacity:1}100%{transform:scale(1.06);opacity:0}}
`;

export default function CursoArvoreView({ curso, licoes, titulo, onFechar, acoes }: { curso: CursoRepo; licoes?: Record<string, LicaoCurada>; titulo?: string; onFechar?: () => void; acoes?: ReactNode }) {
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
    let abertura: ReturnType<typeof setTimeout> | undefined;
    const ftit = root.querySelector(".av-tit") as HTMLDivElement;
    const crumbsEl = root.querySelector(".av-crumbs") as HTMLDivElement;
    const hintEl = root.querySelector(".av-hint") as HTMLDivElement;
    const introEl = root.querySelector(".av-intro") as HTMLDivElement | null;
    const introTit = root.querySelector(".av-intro-tit") as HTMLDivElement | null;
    const REPO = curso.repo;
    const TREE = navDoArvore(curso.arvore, REPO);
    const LICOES: Record<string, LicaoCurada> = licoes || {};

    const el = (t: string, a: Record<string, string | number> = {}) => { const e = document.createElementNS(NS, t); for (const k in a) e.setAttribute(k, String(a[k])); return e; };
    const parentOf = new Map<Nav, Nav>();
    (function walk(n: Nav) { (n.filhos || []).forEach((c) => { parentOf.set(c, n); walk(c); }); })(TREE);
    const expanded = new Set<Nav>([TREE]);
    let focus: Nav = TREE;
    const pos = new Map<Nav, { x: number; y: number; dir: number; depth: number }>();
    const BASE = { x: 600, y: 720 };
    let vb = { x: 0, y: 0, w: 1200, h: 820 }, tween: any = null, raf = 0;
    const AR = 1200 / 820;
    const unit = (a: number) => ({ x: Math.cos(a), y: Math.sin(a) });
    const temFilho = (n: Nav) => (n.filhos || []).length > 0;
    const childrenVis = (n: Nav) => (expanded.has(n) ? (n.filhos || []) : []);

    function layout() { pos.clear(); place(TREE, BASE.x, BASE.y, -Math.PI / 2, 0); }
    function place(node: Nav, x: number, y: number, dir: number, depth: number) {
      pos.set(node, { x, y, dir, depth });
      if (!expanded.has(node)) return;
      const ch = node.filhos || [], n = ch.length; if (!n) return;
      if (depth === 0) {
        // TRILHA de progressão: os módulos SOBEM numa trilha conectada (1 → 2 → 3), ligada à raiz —
        // uma jornada com começo e fim, não um leque solto. Serpenteia de leve pra respirar.
        const stepY = Math.max(96, 150 - n * 6);
        ch.forEach((c, i) => place(c, x + Math.sin(i * 1.1) * 120, y - 150 - i * stepY, -Math.PI / 2, depth + 1));
        return;
      }
      const spread = Math.max(62, 100 - depth * 16) * Math.PI / 180;
      const L = Math.max(105, 165 - depth * 30);
      ch.forEach((c, i) => { const a = n > 1 ? dir - spread / 2 + i / (n - 1) * spread : dir; place(c, x + Math.cos(a) * L, y + Math.sin(a) * L, a, depth + 1); });
    }
    function ramo(p: any, c: any, pdir: number, cdir: number) {
      const d = Math.hypot(c.x - p.x, c.y - p.y), u = unit(pdir), v = unit(cdir);
      const c1 = { x: p.x + u.x * d * .4, y: p.y + u.y * d * .4 }, c2 = { x: c.x - v.x * d * .4, y: c.y - v.y * d * .4 };
      return "M " + p.x.toFixed(1) + " " + p.y.toFixed(1) + " C " + c1.x.toFixed(1) + " " + c1.y.toFixed(1) + " " + c2.x.toFixed(1) + " " + c2.y.toFixed(1) + " " + c.x.toFixed(1) + " " + c.y.toFixed(1);
    }
    function crumbs() { crumbsEl.innerHTML = ""; const cad: Nav[] = []; let n: Nav | undefined = focus; while (n) { cad.unshift(n); n = parentOf.get(n); } cad.forEach((nn) => { const c = document.createElement("div"); c.className = "av-crumb" + (nn === focus ? " cur" : ""); c.textContent = cut(nn.titulo, 22); c.onclick = () => { focus = nn; expanded.add(nn); fecharBoard(); render(); }; crumbsEl.appendChild(c); }); }

    function render() {
      layout(); world.innerHTML = ""; ftit.textContent = cut(focus.titulo, 46); crumbs();
      hintEl.innerHTML = focus === TREE ? t("forja.arvore.hintRaiz")
        : (temFilho(focus) && expanded.has(focus) ? t("forja.arvore.hintAbriu", { titulo: cut(focus.titulo, 20) }) : t("forja.arvore.hintAbrir", { titulo: cut(focus.titulo, 18) }));
      // raízes na base
      for (let i = 1; i <= 3; i++) { const ext = 28 + i * 30, prof = 70 + i * 14; for (const l of [-1, 1]) { const rx = BASE.x + l * ext, ry = BASE.y + prof; world.appendChild(el("path", { d: "M " + BASE.x + " " + BASE.y + " C " + (BASE.x + l * 8) + " " + (BASE.y + 32) + " " + (rx - l * 16) + " " + (ry - 24) + " " + rx + " " + ry, fill: "none", stroke: "url(#av-wire)", "stroke-width": 2.6 - i * .4, "stroke-linecap": "round", "stroke-opacity": .5 })); } }
      const gL = el("g"), gN = el("g"), gV = el("g"); world.appendChild(gL); world.appendChild(gN); world.appendChild(gV);
      for (const [node, p] of pos) {
        const vis = childrenVis(node);
        if (node === TREE && vis.length) {
          // a TRILHA da progressão: raiz → módulo 1 → módulo 2 → … (sequência, não raios soltos).
          let prev = p, prevDir = -Math.PI / 2;
          for (const c of vis) {
            const cp = pos.get(c)!; const d = ramo(prev, cp, prevDir, cp.dir);
            // brilho suave por baixo
            gL.appendChild(el("path", { d, fill: "none", stroke: "url(#av-flow)", "stroke-width": 8, "stroke-opacity": .16, "stroke-linecap": "round", filter: "url(#av-soft)" }));
            // a CONEXÃO: linha SÓLIDA contínua — a raiz liga ao módulo 1, e os módulos em sequência (sem gaps).
            gL.appendChild(el("path", { d, fill: "none", stroke: "url(#av-flow)", "stroke-width": 3.8, "stroke-opacity": .98, "stroke-linecap": "round", class: "av-trail" }));
            // fluxo: pontos tracejados finos animados POR CIMA (energia, sem quebrar a linha sólida).
            gL.appendChild(el("path", { d, fill: "none", stroke: "#eaf6ff", "stroke-width": 1.7, "stroke-opacity": .85, "stroke-linecap": "round", "stroke-dasharray": "2 13", class: "av-trail-flow" }));
            prev = cp; prevDir = cp.dir;
          }
        } else {
          for (const c of vis) { const cp = pos.get(c)!; const w = Math.max(1.1, 2.6 - p.depth * .5); const d = ramo(p, cp, p.dir, cp.dir);
            gL.appendChild(el("path", { d, fill: "none", stroke: "url(#av-wire)", "stroke-width": w + 2.5, "stroke-opacity": .1, "stroke-linecap": "round", filter: "url(#av-soft)" }));
            gL.appendChild(el("path", { d, fill: "none", stroke: "url(#av-wire)", "stroke-width": w, "stroke-opacity": .92, "stroke-linecap": "round" })); }
        }
      }
      for (const [node, p] of pos) {
        const ehBase = node === TREE, r = ehBase ? 15 : Math.max(7, 11 - p.depth * 1.3), ehFoco = node === focus;
        const g = el("g", { class: "av-node" });
        if (ehFoco) g.appendChild(el("circle", { cx: p.x, cy: p.y, r: r + 6, fill: "url(#av-grad)", class: "av-halo" }));
        g.appendChild(el("circle", { cx: p.x, cy: p.y, r, fill: "url(#av-nodeGrad)", stroke: ehFoco ? "rgba(255,255,255,.95)" : "rgba(255,255,255,.7)", "stroke-width": ehFoco ? 2.4 : 1.5, filter: "url(#av-g)" }));
        g.addEventListener("click", (e) => { e.stopPropagation(); clicar(node); }); world.appendChild(g);
        if (parentOf.get(node) === focus && node !== focus) {
          const lw = 150, lh = 40, off = unit(p.dir), ax = p.x + off.x * (r + 10), ay = p.y + off.y * (r + 10), cx2 = p.x + off.x * (r + 10 + lh * .7), cy2 = p.y + off.y * (r + 10 + lh * .7);
          gV.appendChild(el("line", { x1: p.x, y1: p.y, x2: ax, y2: ay, stroke: "rgba(255,255,255,.35)", "stroke-width": 1.4 }));
          const passo = parentOf.get(node) === TREE ? TREE.filhos.indexOf(node) + 1 : 0;
          const fo = el("foreignObject", { x: cx2 - lw / 2, y: cy2 - lh / 2, width: lw, height: lh }); const div = document.createElement("div"); div.setAttribute("xmlns", "http://www.w3.org/1999/xhtml"); div.className = "av-gv"; div.innerHTML = "<b>" + (passo ? '<i class="av-step">' + passo + "</i>" : "") + cut(node.titulo, 18) + "</b><small>" + (temFilho(node) ? t("forja.arvore.dentroAbrir", { n: node.filhos.length }) : t("forja.arvore.abrirLicao")) + "</small>"; fo.appendChild(div); fo.addEventListener("click", (e) => { e.stopPropagation(); clicar(node); }); gV.appendChild(fo);
        }
        if (ehFoco) { const cw = 128, chh = 24; const fo = el("foreignObject", { x: p.x - cw / 2, y: p.y + r + 9, width: cw, height: chh }); const div = document.createElement("div"); div.setAttribute("xmlns", "http://www.w3.org/1999/xhtml"); div.className = "av-cue"; div.textContent = t("forja.arvore.cueAprender"); fo.appendChild(div); fo.addEventListener("click", (e) => { e.stopPropagation(); abrirBoard(node); }); gV.appendChild(fo); }
      }
      cameraFoco();
    }
    function cameraFoco() {
      const f = pos.get(focus); if (!f) return; const pts = [f]; for (const c of childrenVis(focus)) pts.push(pos.get(c)!);
      let minx = 1e9, miny = 1e9, maxx = -1e9, maxy = -1e9; for (const p of pts) { minx = Math.min(minx, p.x); miny = Math.min(miny, p.y); maxx = Math.max(maxx, p.x); maxy = Math.max(maxy, p.y); }
      const pad = focus === TREE ? 70 : 95; minx -= pad; miny -= pad; maxx += pad; maxy += pad;
      let w = maxx - minx, h = maxy - miny; if (w / h < AR) w = h * AR; else h = w / AR; w = Math.max(360, w); h = w / AR;
      zoomVB({ x: (minx + maxx) / 2 - w / 2, y: (miny + maxy) / 2 - h / 2, w, h }, 560);
    }
    function clicar(node: Nav) {
      if (temFilho(node) && !expanded.has(node)) { expanded.add(node); focus = node; render(); return; }
      if (node !== focus) { focus = node; if (temFilho(node)) expanded.add(node); render(); return; }
      abrirBoard(node);
    }
    function setVB() { svg.setAttribute("viewBox", vb.x + " " + vb.y + " " + vb.w + " " + vb.h); }
    function zoomVB(target: any, dur: number, cb?: () => void) { tween = { a: { ...vb }, b: target, t0: performance.now(), dur, cb }; }
    function loop(now: number) { if (tween) { const k = Math.min(1, (now - tween.t0) / tween.dur), e = 1 - Math.pow(1 - k, 3); vb.x = tween.a.x + (tween.b.x - tween.a.x) * e; vb.y = tween.a.y + (tween.b.y - tween.a.y) * e; vb.w = tween.a.w + (tween.b.w - tween.a.w) * e; vb.h = tween.a.h + (tween.b.h - tween.a.h) * e; setVB(); if (k >= 1) { const cb = tween.cb; tween = null; if (cb) cb(); } } raf = requestAnimationFrame(loop); }

    function abrirBoard(ref2: Nav) { const f = pos.get(ref2) || BASE as any; zoomVB({ x: f.x - 150, y: f.y - 110, w: 300, h: 205 }, 440, () => { svg.classList.add("fade"); clearTimeout(abertura); abertura = setTimeout(() => montarBoard(ref2), 200); }); }
    function montarBoard(r: Nav) {
      const lic = LICOES[r.id];
      const par = parentOf.get(r), mod = r.mod || (par ? par.titulo : REPO);
      const irmaos = par ? (par.filhos || []) : [];
      const idx = irmaos.indexOf(r);
      const prox = idx >= 0 && idx < irmaos.length - 1 ? irmaos[idx + 1] : null;
      const passo = par === TREE && idx >= 0 ? t("forja.arvore.passo", { i: idx + 1, n: irmaos.length }) : "";
      boardEl.innerHTML = montarBoardHtml({ titulo: r.titulo, tipo: r.tipo, mod, repo: REPO, resumo: r.resumo, lic, prox: prox?.titulo, passo, tr: t });
      setLicaoAtiva({ id: r.id, titulo: r.titulo });
      overlay.classList.add("on");
      boardEl.querySelectorAll(".av-continuar").forEach((b) => b.addEventListener("click", () => {
        if (!prox) return;
        focus = prox; if (temFilho(prox)) expanded.add(prox);
        boardEl.scrollTop = 0; montarBoard(prox);     // avança pro próximo módulo — progressão de verdade
      }));
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
      hintEl.innerHTML = lic ? t("forja.arvore.licaoReais") : t("forja.arvore.licaoModulo");
    }
    function fecharBoard() { overlay.classList.remove("on"); setLicaoAtiva(null); }
    function voltar() { fecharBoard(); svg.classList.remove("fade"); render(); }

    // zoom manual + pan
    const onWheel = (e: WheelEvent) => { e.preventDefault(); tween = null; const m = svg.getScreenCTM()!.inverse(); const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY; const s = pt.matrixTransform(m); const f = e.deltaY > 0 ? 1.12 : .89; let nw = Math.min(2600, Math.max(240, vb.w * f)); const nh = nw * 820 / 1200; vb.x = s.x - (s.x - vb.x) * (nw / vb.w); vb.y = s.y - (s.y - vb.y) * (nh / vb.h); vb.w = nw; vb.h = nh; setVB(); };
    let pan: any = null;
    const onDown = (e: PointerEvent) => { const t = e.target as Element; if (t.closest && (t.closest(".av-node") || t.closest("foreignObject"))) return; pan = { x: e.clientX, y: e.clientY, vx: vb.x, vy: vb.y }; tween = null; try { svg.setPointerCapture(e.pointerId); } catch (_) {} };
    const onMove = (e: PointerEvent) => { if (!pan) return; const rct = svg.getBoundingClientRect(); vb.x = pan.vx - (e.clientX - pan.x) / rct.width * vb.w; vb.y = pan.vy - (e.clientY - pan.y) / rct.height * vb.h; setVB(); };
    const onUp = () => { pan = null; };
    svg.addEventListener("wheel", onWheel, { passive: false }); svg.addEventListener("pointerdown", onDown); svg.addEventListener("pointermove", onMove); svg.addEventListener("pointerup", onUp); svg.addEventListener("pointercancel", onUp);

    // intro: o TÍTULO do curso entra animado, grande e centrado, e some revelando a trilha.
    if (introEl && introTit) { introTit.textContent = cut(curso.arvore.raiz.titulo || REPO, 42); introEl.classList.remove("play"); void introEl.offsetWidth; introEl.classList.add("play"); }

    setVB(); raf = requestAnimationFrame(loop); render();
    return () => { clearTimeout(abertura); cancelAnimationFrame(raf); svg.removeEventListener("wheel", onWheel); svg.removeEventListener("pointerdown", onDown); svg.removeEventListener("pointermove", onMove); svg.removeEventListener("pointerup", onUp); svg.removeEventListener("pointercancel", onUp); world.innerHTML = ""; boardEl.innerHTML = ""; overlay.classList.remove("on"); setLicaoAtiva(null); };
  }, [curso.arvore, curso.repo, licoes, t]);

  return (
    <div ref={ref} className="av-root">
      <style>{CSS}</style>
      <div className="av-head"><div className="av-repo">{curso.repo}</div><div className="av-tit">{cabecalho}</div></div>
      <div className="av-crumbs" />
      <div className="av-hint" />
      {onFechar && <button type="button" className="av-close" onClick={onFechar}>{t("forja.arvore.fechar")}</button>}
      <svg className="av-svg" viewBox="0 0 1200 820" preserveAspectRatio="xMidYMid meet">
        <defs>
          <filter id="av-g" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="3" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
          <filter id="av-soft" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="4" /></filter>
          <linearGradient id="av-grad" x1="0" y1="1" x2="1" y2="0"><stop offset="0%" stopColor="#1d4ed8" /><stop offset="50%" stopColor="#3b82f6" /><stop offset="100%" stopColor="#38bdf8" /></linearGradient>
          <linearGradient id="av-wire" x1="0" y1="1" x2="1" y2="0"><stop offset="0%" stopColor="#2563eb" /><stop offset="50%" stopColor="#3b82f6" /><stop offset="100%" stopColor="#22d3ee" /></linearGradient>
          <linearGradient id="av-flow" x1="0" y1="1" x2="1" y2="0"><stop offset="0%" stopColor="#60a5fa" /><stop offset="100%" stopColor="#22d3ee" /></linearGradient>
          <radialGradient id="av-nodeGrad" cx="40%" cy="34%"><stop offset="0%" stopColor="#dbeafe" /><stop offset="45%" stopColor="#3b82f6" /><stop offset="100%" stopColor="#06b6d4" /></radialGradient>
        </defs>
        <g className="av-world" />
      </svg>
      {!licaoAtiva && acoes}
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
        <div className="av-hint" style={{ bottom: 40 }}>{t("forja.arvore.semMapa")}</div>
      )}
    </div>
  );
}
