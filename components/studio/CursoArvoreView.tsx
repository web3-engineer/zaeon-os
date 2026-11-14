"use client";

/**
 * CursoArvoreView — a UI/UX BASE de TODO curso de CÓDIGO (repo) da Zaeon: a Árvore do repositório como
 * uma JORNADA fractal de aprendizado. A raiz é o repo; cada ramo é um módulo central; cada folha, um
 * conceito. Clicar num nó dá ZOOM e expande os filhos ALI MESMO (a árvore cresce, conectada); clicar nele
 * de novo abre o BOARD da lição (aprendizado + código destacado + teste). Scroll dá zoom, arrastar navega.
 *
 * Tudo deriva do grafo REAL (graphify → arvoreDoGrafo): repo → módulos → símbolos. Serve QUALQUER
 * curso/skill com repositório — a geometria se monta sozinha pra árvores de qualquer tamanho. O conteúdo
 * das lições é preenchido pelo understand-anything (marcha 2); por ora vem um esqueleto marcado.
 *
 * Motor imperativo (SVG + requestAnimationFrame + viewBox) montado num container via ref. Estilo Liquid
 * Glass, cores da casa. Sem grafo, degrada pro esqueleto (raiz + aviso), sem travar.
 */
import { useEffect, useRef } from "react";
import type { ArvoreEntendimento, CursoRepo, NoEntendimento } from "@/lib/forja/tipos";

const NS = "http://www.w3.org/2000/svg";
const cut = (s: string, n: number) => (s && s.length > n ? s.slice(0, n - 1) + "…" : s || "");

type Nav = { id: string; tipo: "repo" | "mod" | "sim"; titulo: string; dica: string; resumo?: string; mod?: string; filhos: Nav[] };

/** Monta a árvore de navegação (repo → módulos → símbolos) a partir da base de conhecimento real. */
function navDoArvore(arvore: ArvoreEntendimento, repo: string): Nav {
  const sym = (n: NoEntendimento, modTit: string): Nav => ({ id: n.id, tipo: "sim", titulo: n.titulo, dica: "conceito central", resumo: n.resumo, mod: modTit, filhos: [] });
  const mod = (n: NoEntendimento): Nav => ({ id: n.id, tipo: "mod", titulo: n.titulo, dica: ((n.filhos?.length ?? 0) + " conceito(s)"), resumo: n.resumo, filhos: (n.filhos ?? []).map((s) => sym(s, n.titulo)) });
  return { id: "raiz", tipo: "repo", titulo: arvore.raiz.titulo || repo, dica: "o repositório inteiro", resumo: arvore.raiz.resumo, filhos: (arvore.raiz.filhos ?? []).map(mod) };
}

const CSS = `
.av-root{position:absolute;inset:0;overflow:hidden;color:#eaf0ff;font-family:ui-sans-serif,system-ui,-apple-system,"SF Pro Display",Segoe UI,Roboto,sans-serif;
  background:radial-gradient(1100px 760px at 20% 6%,rgba(37,99,235,.22),transparent 60%),radial-gradient(1000px 820px at 84% 90%,rgba(34,211,238,.16),transparent 62%),radial-gradient(760px 560px at 60% 42%,rgba(56,96,180,.14),transparent 60%),#04070f}
.av-head{position:absolute;left:20px;top:14px;z-index:9}
.av-repo{font-family:ui-monospace,Menlo,monospace;font-size:12px;color:rgba(190,205,255,.75)}
.av-tit{font-size:17px;font-weight:800;letter-spacing:-.02em;margin-top:2px;background:linear-gradient(90deg,#fff,#d8c9ff 60%,#aaf0ff);-webkit-background-clip:text;background-clip:text;color:transparent}
.av-crumbs{position:absolute;left:20px;top:54px;z-index:9;display:flex;gap:7px;flex-wrap:wrap;max-width:66%;font-size:12px}
.av-crumb{color:rgba(230,236,255,.82);cursor:pointer;padding:4px 12px;border-radius:999px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.14);backdrop-filter:blur(16px)}
.av-crumb:hover{background:rgba(255,255,255,.12)}.av-crumb.cur{color:#fff;font-weight:700;background:linear-gradient(90deg,rgba(139,92,246,.5),rgba(34,211,238,.45));border-color:rgba(255,255,255,.3)}
.av-hint{position:absolute;left:50%;bottom:14px;transform:translateX(-50%);font-size:11px;color:rgba(214,224,255,.6);z-index:9;text-align:center}
.av-close{position:absolute;right:16px;top:16px;z-index:10;border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.08);color:rgba(255,255,255,.8);border-radius:999px;padding:5px 13px;font-size:12px;cursor:pointer;backdrop-filter:blur(16px)}
.av-close:hover{background:rgba(255,255,255,.14)}
.av-svg{position:absolute;inset:0;height:100%;width:100%;touch-action:none;transition:opacity .4s ease}.av-svg.fade{opacity:0}
.av-svg text{user-select:none;pointer-events:none}.av-node{cursor:pointer}
.av-halo{animation:avbr 2.4s ease-in-out infinite;transform-box:fill-box;transform-origin:center}@keyframes avbr{0%,100%{opacity:.25;transform:scale(1)}50%{opacity:.6;transform:scale(1.4)}}
.av-gv{width:100%;height:100%;display:flex;flex-direction:column;justify-content:center;border-radius:14px;padding:6px 11px;background:rgba(255,255,255,.08);backdrop-filter:blur(22px) saturate(1.4);border:1px solid rgba(255,255,255,.2);box-shadow:0 8px 22px rgba(4,8,20,.4),inset 0 1px 0 rgba(255,255,255,.25)}
.av-gv b{font-size:12px;color:#fff;line-height:1.1}.av-gv small{font-size:9.5px;color:rgba(205,216,255,.62)}
.av-cue{width:100%;height:100%;display:flex;align-items:center;justify-content:center;border-radius:999px;font-size:10.5px;font-weight:700;color:#fff;background:linear-gradient(90deg,#8b5cf6,#e879f9 50%,#22d3ee);box-shadow:0 6px 16px rgba(139,92,246,.45)}
.av-board{position:absolute;inset:0;z-index:12;opacity:0;visibility:hidden;transition:opacity .45s ease;display:grid;place-items:center;background:rgba(6,8,20,.5)}
.av-board.on{opacity:1;visibility:visible}
.av-card{width:min(720px,92%);max-height:88%;overflow:auto;border-radius:30px;padding:28px 30px;background:rgba(255,255,255,.07);backdrop-filter:blur(40px) saturate(1.5);border:1px solid rgba(255,255,255,.18);box-shadow:0 30px 90px rgba(4,6,16,.6),inset 0 1px 0 rgba(255,255,255,.25)}
.av-card .tag{font-family:ui-monospace,monospace;font-size:11px;color:#c9b8ff}
.av-card h1{font-size:23px;margin:6px 0 2px;color:#fff}
.av-card h3{font-size:12px;text-transform:uppercase;letter-spacing:.1em;margin:20px 0 8px;background:linear-gradient(90deg,#e879f9,#22d3ee);-webkit-background-clip:text;background-clip:text;color:transparent}
.av-card p{font-size:15px;line-height:1.62;color:rgba(234,240,255,.9)}
.av-code{border-radius:16px;overflow:hidden;border:1px solid rgba(255,255,255,.12);background:rgba(3,7,15,.55)}
.av-code .bar{display:flex;align-items:center;gap:7px;padding:8px 13px;background:rgba(255,255,255,.04);border-bottom:1px solid rgba(255,255,255,.08);font-family:ui-monospace,monospace;font-size:11px;color:#9fb3d1}
.av-code .dot{width:9px;height:9px;border-radius:50%;display:inline-block}
.av-code pre{margin:0;background:transparent;padding:14px 16px;color:#cdd9ec;white-space:pre;overflow:auto;font-family:ui-monospace,monospace;font-size:12.5px}
.av-kw{color:#c792ea}.av-str{color:#a5e88d}.av-com{color:#6b86a6;font-style:italic}.av-num{color:#f78c6c}
.av-quiz{margin-top:8px;display:flex;flex-direction:column;gap:9px}
.av-opt{border:1px solid rgba(255,255,255,.14);border-radius:14px;padding:11px 14px;cursor:pointer;font-size:14px;background:rgba(255,255,255,.05);transition:.15s}
.av-opt:hover{border-color:rgba(255,255,255,.3);background:rgba(255,255,255,.09)}
.av-opt.ok{border-color:rgba(110,231,183,.7);background:rgba(110,231,183,.14);color:#d1fae5}.av-opt.no{border-color:rgba(248,113,113,.6);background:rgba(248,113,113,.12)}
.av-nav{display:flex;justify-content:space-between;margin-top:22px}
.av-btn{color:#fff;border-radius:999px;padding:9px 18px;font-size:13px;cursor:pointer}
.av-ghost{background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.16);backdrop-filter:blur(16px)}.av-ghost:hover{background:rgba(255,255,255,.14)}
.av-pill{background:linear-gradient(90deg,#8b5cf6,#e879f9 48%,#22d3ee);border:0;box-shadow:0 8px 24px rgba(139,92,246,.42),inset 0 1px 0 rgba(255,255,255,.35);font-weight:700}
.av-card b,.av-card strong{color:#d8c9ff}
`;

export default function CursoArvoreView({ curso, titulo, onFechar }: { curso: CursoRepo; titulo?: string; onFechar?: () => void }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const cabecalho = (titulo || curso.arvore.raiz.titulo || "").trim();
  const semMapa = (curso.arvore.raiz.filhos?.length ?? 0) === 0;

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const svg = root.querySelector(".av-svg") as SVGSVGElement;
    const world = root.querySelector(".av-world") as SVGGElement;
    const boardEl = root.querySelector(".av-board") as HTMLDivElement;
    const ftit = root.querySelector(".av-tit") as HTMLDivElement;
    const crumbsEl = root.querySelector(".av-crumbs") as HTMLDivElement;
    const hintEl = root.querySelector(".av-hint") as HTMLDivElement;
    const REPO = curso.repo;
    const TREE = navDoArvore(curso.arvore, REPO);

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
      const spread = (depth === 0 ? 158 : Math.max(62, 100 - depth * 16)) * Math.PI / 180;
      const L = depth === 0 ? 280 : Math.max(105, 165 - depth * 30);
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
      hintEl.innerHTML = focus === TREE ? 'clique num conceito pra <b>abrir</b> · role pra <b>zoom</b>, arraste pra navegar'
        : (temFilho(focus) && expanded.has(focus) ? '<b>' + cut(focus.titulo, 20) + '</b> abriu · clique nele <b>de novo pra aprender</b>' : 'clique em <b>' + cut(focus.titulo, 18) + '</b> pra abrir a lição');
      // raízes na base
      for (let i = 1; i <= 3; i++) { const ext = 28 + i * 30, prof = 70 + i * 14; for (const l of [-1, 1]) { const rx = BASE.x + l * ext, ry = BASE.y + prof; world.appendChild(el("path", { d: "M " + BASE.x + " " + BASE.y + " C " + (BASE.x + l * 8) + " " + (BASE.y + 32) + " " + (rx - l * 16) + " " + (ry - 24) + " " + rx + " " + ry, fill: "none", stroke: "url(#av-wire)", "stroke-width": 2.6 - i * .4, "stroke-linecap": "round", "stroke-opacity": .5 })); } }
      const gL = el("g"), gN = el("g"), gV = el("g"); world.appendChild(gL); world.appendChild(gN); world.appendChild(gV);
      for (const [node, p] of pos) { for (const c of childrenVis(node)) { const cp = pos.get(c)!; const w = Math.max(1.1, 2.6 - p.depth * .5); const d = ramo(p, cp, p.dir, cp.dir);
        gL.appendChild(el("path", { d, fill: "none", stroke: "url(#av-wire)", "stroke-width": w + 2.5, "stroke-opacity": .1, "stroke-linecap": "round", filter: "url(#av-soft)" }));
        gL.appendChild(el("path", { d, fill: "none", stroke: "url(#av-wire)", "stroke-width": w, "stroke-opacity": .92, "stroke-linecap": "round" })); } }
      for (const [node, p] of pos) {
        const ehBase = node === TREE, r = ehBase ? 15 : Math.max(7, 11 - p.depth * 1.3), ehFoco = node === focus;
        const g = el("g", { class: "av-node" });
        if (ehFoco) g.appendChild(el("circle", { cx: p.x, cy: p.y, r: r + 6, fill: "url(#av-grad)", class: "av-halo" }));
        g.appendChild(el("circle", { cx: p.x, cy: p.y, r, fill: "url(#av-nodeGrad)", stroke: ehFoco ? "rgba(255,255,255,.95)" : "rgba(255,255,255,.7)", "stroke-width": ehFoco ? 2.4 : 1.5, filter: "url(#av-g)" }));
        g.addEventListener("click", (e) => { e.stopPropagation(); clicar(node); }); world.appendChild(g);
        if (parentOf.get(node) === focus && node !== focus) {
          const lw = 150, lh = 40, off = unit(p.dir), ax = p.x + off.x * (r + 10), ay = p.y + off.y * (r + 10), cx2 = p.x + off.x * (r + 10 + lh * .7), cy2 = p.y + off.y * (r + 10 + lh * .7);
          gV.appendChild(el("line", { x1: p.x, y1: p.y, x2: ax, y2: ay, stroke: "rgba(255,255,255,.35)", "stroke-width": 1.4 }));
          const fo = el("foreignObject", { x: cx2 - lw / 2, y: cy2 - lh / 2, width: lw, height: lh }); const div = document.createElement("div"); div.setAttribute("xmlns", "http://www.w3.org/1999/xhtml"); div.className = "av-gv"; div.innerHTML = "<b>" + cut(node.titulo, 20) + "</b><small>" + (temFilho(node) ? (node.filhos.length + " dentro · abrir") : "abrir a lição") + "</small>"; fo.appendChild(div); fo.addEventListener("click", (e) => { e.stopPropagation(); clicar(node); }); gV.appendChild(fo);
        }
        if (ehFoco) { const cw = 128, chh = 24; const fo = el("foreignObject", { x: p.x - cw / 2, y: p.y + r + 9, width: cw, height: chh }); const div = document.createElement("div"); div.setAttribute("xmlns", "http://www.w3.org/1999/xhtml"); div.className = "av-cue"; div.textContent = "clique → aprender ▸"; fo.appendChild(div); fo.addEventListener("click", (e) => { e.stopPropagation(); abrirBoard(node); }); gV.appendChild(fo); }
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

    const hl = (code: string) => code.split("\n").map((ln) => { const e = ln.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); if (/^\s*#/.test(e)) return '<span class="av-com">' + e + '</span>'; return e.replace(/(&#39;[^&]*?&#39;|&quot;[^&]*?&quot;|'[^']*'|"[^"]*")/g, '<span class="av-str">$1</span>').replace(/\b(from|import|def|class|return|as|with|if|else|elif|for|in|while|None|True|False|and|or|not|lambda|yield|raise|try|except)\b/g, '<span class="av-kw">$1</span>').replace(/\b(\d+)\b/g, '<span class="av-num">$1</span>'); }).join("\n");
    const bloco = (titulo: string, codigo: string) => '<div class="av-code"><div class="bar"><span class="dot" style="background:#ff5f56"></span><span class="dot" style="background:#ffbd2e"></span><span class="dot" style="background:#27c93f"></span><span style="margin-left:6px">' + titulo + '</span></div><pre>' + hl(codigo) + '</pre></div>';
    function abrirBoard(ref2: Nav) { const f = pos.get(ref2) || BASE as any; zoomVB({ x: f.x - 150, y: f.y - 110, w: 300, h: 205 }, 440, () => { svg.classList.add("fade"); setTimeout(() => montarBoard(ref2), 200); }); }
    function montarBoard(r: Nav) {
      const par = parentOf.get(r), mod = r.mod || (par ? par.titulo : REPO), base = String(mod).split(".py")[0];
      const tag = r.tipo === "sim" ? "conceito" : r.tipo === "mod" ? "módulo" : "repositório";
      const temResumo = (r.resumo || "").trim().length > 3;
      const aprend = temResumo ? r.resumo : ('<b>' + r.titulo + '</b> é um conceito central de <b>' + mod + '</b>. Aqui entra a explicação real — analogia, o que é e por que importa — <i style="color:rgba(205,216,255,.6)">gerada pelo understand-anything a partir do grafo real</i>.');
      boardEl.innerHTML = '<div class="av-card"><div class="tag">' + tag + ' · ' + REPO + '</div><h1>' + r.titulo + '</h1>'
        + '<h3>Aprendizado</h3><p>' + aprend + '</p>'
        + '<h3>No código</h3>' + bloco('python · ' + base + '.py', '# trecho real do repositório (via graphify)\nfrom ' + base + ' import ' + r.titulo + '\n\n# o graphify aponta onde ' + r.titulo + ' é definido e quem o usa')
        + '<h3>Teste</h3><p>O que melhor descreve <b>' + r.titulo + '</b>?</p>'
        + '<div class="av-quiz"><div class="av-opt" data-ok="1">Uma peça central de ' + mod + ', referenciada por vários outros símbolos</div>'
        + '<div class="av-opt">Um arquivo de configuração sem relação com o resto</div><div class="av-opt">Apenas um trecho de documentação</div></div>'
        + '<div class="av-nav"><button class="av-btn av-ghost av-voltar">‹ voltar à árvore</button><button class="av-btn av-pill av-voltar">concluir ✓</button></div></div>';
      boardEl.classList.add("on");
      boardEl.querySelectorAll(".av-opt").forEach((o) => o.addEventListener("click", () => { boardEl.querySelectorAll(".av-opt").forEach((x) => x.classList.remove("ok", "no")); o.classList.add((o as HTMLElement).dataset.ok ? "ok" : "no"); }));
      boardEl.querySelectorAll(".av-voltar").forEach((b) => b.addEventListener("click", voltar));
      hintEl.innerHTML = 'a <b>lição</b>: aprendizado + código real + teste';
    }
    function fecharBoard() { boardEl.classList.remove("on"); }
    function voltar() { fecharBoard(); svg.classList.remove("fade"); render(); }

    // zoom manual + pan
    const onWheel = (e: WheelEvent) => { e.preventDefault(); tween = null; const m = svg.getScreenCTM()!.inverse(); const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY; const s = pt.matrixTransform(m); const f = e.deltaY > 0 ? 1.12 : .89; let nw = Math.min(2600, Math.max(240, vb.w * f)); const nh = nw * 820 / 1200; vb.x = s.x - (s.x - vb.x) * (nw / vb.w); vb.y = s.y - (s.y - vb.y) * (nh / vb.h); vb.w = nw; vb.h = nh; setVB(); };
    let pan: any = null;
    const onDown = (e: PointerEvent) => { const t = e.target as Element; if (t.closest && (t.closest(".av-node") || t.closest("foreignObject"))) return; pan = { x: e.clientX, y: e.clientY, vx: vb.x, vy: vb.y }; tween = null; try { svg.setPointerCapture(e.pointerId); } catch (_) {} };
    const onMove = (e: PointerEvent) => { if (!pan) return; const rct = svg.getBoundingClientRect(); vb.x = pan.vx - (e.clientX - pan.x) / rct.width * vb.w; vb.y = pan.vy - (e.clientY - pan.y) / rct.height * vb.h; setVB(); };
    const onUp = () => { pan = null; };
    svg.addEventListener("wheel", onWheel, { passive: false }); svg.addEventListener("pointerdown", onDown); svg.addEventListener("pointermove", onMove); svg.addEventListener("pointerup", onUp); svg.addEventListener("pointercancel", onUp);

    setVB(); raf = requestAnimationFrame(loop); render();
    return () => { cancelAnimationFrame(raf); svg.removeEventListener("wheel", onWheel); svg.removeEventListener("pointerdown", onDown); svg.removeEventListener("pointermove", onMove); svg.removeEventListener("pointerup", onUp); svg.removeEventListener("pointercancel", onUp); world.innerHTML = ""; boardEl.innerHTML = ""; boardEl.classList.remove("on"); };
  }, [curso.arvore, curso.repo]);

  return (
    <div ref={ref} className="av-root">
      <style>{CSS}</style>
      <div className="av-head"><div className="av-repo">{curso.repo}</div><div className="av-tit">{cabecalho}</div></div>
      <div className="av-crumbs" />
      <div className="av-hint" />
      {onFechar && <button type="button" className="av-close" onClick={onFechar}>← voltar</button>}
      <svg className="av-svg" viewBox="0 0 1200 820" preserveAspectRatio="xMidYMid meet">
        <defs>
          <filter id="av-g" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="3" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
          <filter id="av-soft" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="4" /></filter>
          <linearGradient id="av-grad" x1="0" y1="1" x2="1" y2="0"><stop offset="0%" stopColor="#8b5cf6" /><stop offset="50%" stopColor="#e879f9" /><stop offset="100%" stopColor="#22d3ee" /></linearGradient>
          <linearGradient id="av-wire" x1="0" y1="1" x2="1" y2="0"><stop offset="0%" stopColor="#a855f7" /><stop offset="50%" stopColor="#3b82f6" /><stop offset="100%" stopColor="#34d399" /></linearGradient>
          <radialGradient id="av-nodeGrad" cx="42%" cy="36%"><stop offset="0%" stopColor="#d7ccff" /><stop offset="55%" stopColor="#a78bfa" /><stop offset="100%" stopColor="#22d3ee" /></radialGradient>
        </defs>
        <g className="av-world" />
      </svg>
      <div className="av-board" />
      {semMapa && (
        <div className="av-hint" style={{ bottom: 40 }}>a árvore ganha galhos quando o motor analisar o repositório</div>
      )}
    </div>
  );
}
