/**
 * scripts/e2e-arvore-neuronal.mjs — E2E + desempenho da Árvore Neuronal num Chrome headless (puppeteer-core,
 * que o repo já tem; não há Playwright no projeto).
 *
 *   BASE=http://localhost:3010 node scripts/e2e-arvore-neuronal.mjs [pasta-de-saida]
 *
 * Roda contra a prévia /dev/arvore-neuronal (cursos REAIS do catálogo, sem login: o progresso cai na reserva
 * do localStorage, que é o caminho offline). O caminho logado (servidor) é coberto pelos testes da rota e
 * pelo smoke em produção. Em desktop (1440×900) e celular (390×844), para 2 cursos:
 *   abrir → começar → 3 lições seguidas via "próxima lição ▸" → recarregar e ver o progresso mantido →
 *   "visão geral" → reiniciar (2 cliques). Tira prints da raiz, de um nó de energia alta e um de baixa.
 * Desempenho: árvore sintética com 80 nós visíveis, 5 s de quadros (rAF) + trace do Chromium.
 * Sai 1 se qualquer verificação falhar.
 */
import puppeteer from "puppeteer-core";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const BASE = process.env.BASE || "http://localhost:3010";
const CHROME = process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const SAIDA = process.argv[2] || "docs/arvore-neuronal/prints";
const CURSOS = (process.env.CURSOS || "pomodoro,pandas-analise-de-dados").split(",");
const VIEWPORTS = {
  desktop: { width: 1440, height: 900, deviceScaleFactor: 1 },
  celular: { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
};

const falhas = [];
const ok = (cond, msg) => { console.log((cond ? "  ✓ " : "  ✗ ") + msg); if (!cond) falhas.push(msg); };
const espera = (ms) => new Promise((r) => setTimeout(r, ms));

async function clicar(page, texto) {
  const feito = await page.evaluate((t) => {
    const b = [...document.querySelectorAll("button")].find((x) => x.textContent.trim() === t && x.offsetParent !== null);
    if (!b) return false;
    b.click();
    return true;
  }, texto);
  if (!feito) throw new Error(`botão "${texto}" não encontrado`);
}
const contagem = (page) => page.$eval('[data-testid="an-contagem"]', (e) => e.textContent.trim());
const tituloLicao = (page) => page.evaluate(() => document.querySelector('[role="dialog"] h1')?.textContent ?? null);

async function printNo(page, seletor, arquivo) {
  const box = await page.evaluate((s) => {
    const el = document.querySelector(s);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  }, seletor);
  if (!box) return false;
  const pad = 90;
  const vp = page.viewport();
  const x = Math.max(0, box.x - pad), y = Math.max(0, box.y - pad);
  await page.screenshot({ path: arquivo, type: "jpeg", quality: 82, clip: { x, y, width: Math.min(vp.width - x, box.w + pad * 2), height: Math.min(vp.height - y, box.h + pad * 2) } });
  return true;
}

async function fluxo(browser, nomeVp, vp, cursoId) {
  console.log(`\n[${nomeVp}] curso ${cursoId}`);
  const page = await browser.newPage();
  await page.setViewport(vp);
  const erros = [];
  page.on("pageerror", (e) => erros.push(String(e)));
  page.on("console", (m) => { if (m.type() === "error" && !/api\/auth|status of 500|status of 401|CLIENT_FETCH_ERROR/.test(m.text())) erros.push(m.text()); });
  await page.goto(`${BASE}/dev/arvore-neuronal?curso=${cursoId}`, { waitUntil: "networkidle2", timeout: 120000 });
  await page.evaluate(() => { for (const k of Object.keys(localStorage)) if (k.startsWith("zaeon.arvore")) localStorage.removeItem(k); });
  await page.reload({ waitUntil: "networkidle2" });
  await page.waitForSelector('[data-testid="an-contagem"]');
  await espera(1200);
  const total = Number((await contagem(page)).split("/")[1].split(" ")[0]);
  ok((await contagem(page)).startsWith("0/"), `começa zerado (${await contagem(page)})`);
  await page.screenshot({ path: join(SAIDA, `${nomeVp}-${cursoId}-arvore.jpg`), type: "jpeg", quality: 82 });
  if (nomeVp === "desktop") await printNo(page, '[data-no].an-no-raiz', join(SAIDA, `${nomeVp}-${cursoId}-raiz.jpg`));

  await clicar(page, "começar ▸");
  await espera(400);
  ok((await tituloLicao(page)) !== null, "começar abre a 1ª lição (raiz)");
  await page.screenshot({ path: join(SAIDA, `${nomeVp}-${cursoId}-licao.jpg`), type: "jpeg", quality: 82 });
  await clicar(page, "começar a jornada ▸");
  await espera(400);
  ok((await tituloLicao(page)) === null, "a árvore aparece entre uma lição e outra");
  await espera(1400);
  const t2 = await tituloLicao(page);
  ok(!!t2, `abre a próxima: "${t2}"`);
  for (let i = 0; i < 2; i++) { await clicar(page, "próxima lição ▸"); await espera(1800); }
  ok((await contagem(page)).startsWith("3/"), `3 lições concluídas seguidas (${await contagem(page)})`);
  await clicar(page, "‹ voltar à árvore");
  await espera(600);

  await page.reload({ waitUntil: "networkidle2" });
  await page.waitForSelector('[data-testid="an-contagem"]');
  await espera(800);
  ok((await contagem(page)).startsWith("3/"), `progresso mantido depois de recarregar (${await contagem(page)})`);
  await clicar(page, "visão geral");
  await espera(1200);
  await page.screenshot({ path: join(SAIDA, `${nomeVp}-${cursoId}-visao-geral.jpg`), type: "jpeg", quality: 82 });
  const energias = await page.$$eval(".an-aresta", (as) => as.map((a) => ({ id: a.getAttribute("data-aresta"), e: Number(a.getAttribute("data-energia")) })));
  if (nomeVp === "desktop" && energias.length) {
    energias.sort((a, b) => a.e - b.e);
    const baixa = energias[0], alta = energias[energias.length - 1];
    await printNo(page, `[data-no="${alta.id}"]`, join(SAIDA, `${nomeVp}-${cursoId}-energia-alta-${alta.e.toFixed(1)}.jpg`));
    await printNo(page, `[data-no="${baixa.id}"]`, join(SAIDA, `${nomeVp}-${cursoId}-energia-baixa-${baixa.e.toFixed(1)}.jpg`));
  }
  const tracejados = await page.$$eval(".an-svg *", (els) => els.filter((e) => e.hasAttribute("stroke-dasharray") || (getComputedStyle(e).strokeDasharray || "none") !== "none").length);
  ok(tracejados === 0, `nenhum elemento tracejado na árvore (${tracejados})`);
  await clicar(page, "reiniciar progresso");
  ok((await contagem(page)).startsWith("3/"), "1º clique em reiniciar não apaga");
  await clicar(page, "clique de novo para reiniciar");
  await espera(300);
  ok((await contagem(page)) === `0/${total} lições`, `2º clique reinicia (${await contagem(page)})`);
  ok(erros.length === 0, `console sem erros${erros.length ? ": " + erros.slice(0, 3).join(" | ") : ""}`);
  await page.close();
}

async function desempenho(browser) {
  console.log("\n[desempenho] árvore sintética, 80 nós visíveis");
  const page = await browser.newPage();
  await page.setViewport(VIEWPORTS.desktop);
  await page.goto(`${BASE}/dev/arvore-neuronal?n=80`, { waitUntil: "networkidle2", timeout: 120000 });
  await page.evaluate(() => {
    const ids = ["raiz"]; for (let m = 0; m < 12; m++) ids.push(`m${m}s0`);
    localStorage.setItem("zaeon.arvore.v1:anon:sintetico", JSON.stringify({ concluidas: ids, pendente: false }));
  });
  await page.reload({ waitUntil: "networkidle2" });
  await page.waitForSelector('[data-testid="an-contagem"]');
  await clicar(page, "visão geral");
  await espera(2000);
  const visiveis = await page.$$eval("[data-no]", (x) => x.length);
  const pulsos = await page.$$eval(".an-pulso", (x) => x.length);
  await page.tracing.start({ path: join(SAIDA, "trace-80-nos.json"), categories: ["devtools.timeline", "disabled-by-default-devtools.timeline.frame"] });
  const r = await page.evaluate(async () => {
    const q = []; let ant = performance.now(); const fim = ant + 5000;
    await new Promise((res) => { const f = (t) => { q.push(t - ant); ant = t; if (t < fim) requestAnimationFrame(f); else res(); }; requestAnimationFrame(f); });
    q.shift(); q.sort((a, b) => a - b);
    return { quadros: q.length, med: q[Math.floor(q.length / 2)], p95: q[Math.floor(q.length * 0.95)], max: q[q.length - 1] };
  });
  await page.tracing.stop();
  await page.screenshot({ path: join(SAIDA, "desktop-sintetico-80.jpg"), type: "jpeg", quality: 82 });
  const fps = r.quadros / 5;
  console.log(`  ${visiveis} nós visíveis, ${pulsos} pulsos · ${fps.toFixed(1)} fps · quadro mediano ${r.med.toFixed(2)} ms · p95 ${r.p95.toFixed(2)} ms · pior ${r.max.toFixed(1)} ms`);
  ok(visiveis >= 80, `80 nós visíveis (${visiveis})`);
  ok(fps >= 55, `≥ 55 fps com 80 nós (${fps.toFixed(1)})`);
  await page.close();
  return { visiveis, pulsos, fps, ...r };
}

await mkdir(SAIDA, { recursive: true });
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ["--no-first-run", "--disable-background-timer-throttling", "--disable-renderer-backgrounding"] });
let perf = null;
try {
  for (const [nome, vp] of Object.entries(VIEWPORTS)) for (const c of CURSOS) await fluxo(browser, nome, vp, c);
  perf = await desempenho(browser);
} catch (e) {
  falhas.push(String(e?.stack || e));
  console.error(e);
} finally {
  await browser.close();
}
await writeFile(join(SAIDA, "resultado.json"), JSON.stringify({ base: BASE, cursos: CURSOS, falhas, desempenho: perf }, null, 2));
console.log(falhas.length ? `\n✗ ${falhas.length} falha(s)` : "\n✓ E2E e desempenho verdes");
process.exit(falhas.length ? 1 : 0);
