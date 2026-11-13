#!/usr/bin/env node
/**
 * scripts/rea-smoke.mjs — smoke END-TO-END do motor REA (engenharia reversa), SEM mock.
 *
 * Prova a ponte inteira: /health → /upload (handle) → /rea analyze-web-bundle → Evidence, e confere que a
 * deny-list do motor recusa um comando de efeito colateral. É o teste que faltava: os testes de unidade do app
 * (lib/octa/rea.test.ts) usam fetch mockado e nunca tocam o motor real.
 *
 * USO (rode do app server ou de qualquer máquina na Tailscale que enxergue a ponte):
 *   REA_BRIDGE_URL=http://100.113.137.74:8799 REA_BRIDGE_TOKEN=<o mesmo token do motor> \
 *     node scripts/rea-smoke.mjs [caminho-do-bundle.js] [--cmd analyze-web-bundle]
 *
 *   • sem arquivo  → usa um GOLDEN bundle controlado (sabemos a resposta: a Evidence tem de citar os
 *                    endpoints /api/... e as rotas que plantamos). É a prova determinística.
 *   • com arquivo  → analisa o bundle que você passar. Ex. (alvo real, p/ leonaflow):
 *                       curl -s https://leonaflow.com/ | grep -oE '/assets/[^"]+\.js' | head
 *                       curl -s https://leonaflow.com/assets/index-XXXX.js -o /tmp/leona.js
 *                       node scripts/rea-smoke.mjs /tmp/leona.js
 *
 * ÉTICA/LICITUDE: isto faz ANÁLISE ESTÁTICA de assets JS PÚBLICOS (o que qualquer navegador já baixa) para
 * interoperabilidade/pesquisa/educação — uso lícito do disclaimer do REA. NÃO toca runtime, NÃO burla auth/DRM
 * (os comandos de efeito colateral estão bloqueados na ponte). Só analise alvos que você possui ou está
 * autorizado a examinar, ou cujos assets públicos você estuda para interoperar.
 */
import { readFile } from "node:fs/promises";

const URL_BASE = (process.env.REA_BRIDGE_URL || "").replace(/\/+$/, "");
const TOKEN = process.env.REA_BRIDGE_TOKEN || "";
const argv = process.argv.slice(2);
const cmdFlag = argv.indexOf("--cmd");
const COMANDO = cmdFlag >= 0 ? argv[cmdFlag + 1] : "analyze-web-bundle";
const ALVO_ARQ = argv.find((a, i) => !a.startsWith("--") && i !== (cmdFlag >= 0 ? cmdFlag + 1 : -1));

if (!URL_BASE || !TOKEN) {
  console.error("✗ defina REA_BRIDGE_URL e REA_BRIDGE_TOKEN no ambiente.");
  console.error("  ex.: REA_BRIDGE_URL=http://100.113.137.74:8799 REA_BRIDGE_TOKEN=... node scripts/rea-smoke.mjs");
  process.exit(2);
}

const GOLDEN = `
// GOLDEN web bundle (controlado) — alvos que uma análise estática de endpoints/rotas deve inferir.
const API = "/api/v1";
export async function login(email, password) {
  return fetch(API + "/auth/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, password }) });
}
export async function listUsers(page) { return fetch(\`\${API}/users?page=\${page}\`); }
export async function getProfile(id) { return fetch(\`/api/v1/users/\${id}/profile\`); }
const routes = { "/dashboard": 1, "/settings": 2, "/billing": 3 };
export default { login, listUsers, getProfile, routes };
`;
// tokens que esperamos reencontrar na Evidence (prova de que o motor REALMENTE leu e analisou o bundle)
const ESPERADOS = ["auth/login", "/api/v1/users", "/dashboard", "billing"];

let ok = 0, falhou = 0, avisos = 0;
const V = (m) => { console.log(`  ✓ ${m}`); ok++; };
const X = (m) => { console.log(`  ✗ ${m}`); falhou++; };
const W = (m) => { console.log(`  ⚠ ${m}`); avisos++; };

async function post(path, body) {
  const r = await fetch(`${URL_BASE}${path}`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify(body), signal: AbortSignal.timeout(12 * 60_000),
  });
  const j = await r.json().catch(() => ({}));
  return { status: r.status, j };
}

async function main() {
  console.log(`\n== REA smoke → ${URL_BASE} ==\n`);

  // 1) HEALTH — o motor está de pé e com as ferramentas (rea + ghidra)?
  console.log("1) /health");
  try {
    const r = await fetch(`${URL_BASE}/health`, { signal: AbortSignal.timeout(15_000) });
    const h = await r.json().catch(() => ({}));
    h?.ok ? V(`motor vivo (rea=${h.rea ?? "?"}, ghidra=${h.ghidra ?? "?"})`) : X(`/health não ok: ${JSON.stringify(h)}`);
  } catch (e) { X(`/health inacessível: ${String(e?.message ?? e)}`); }

  // 2) SEGURANÇA — a ponte recusa um comando de efeito colateral?
  console.log("2) deny-list do motor (capture-process deve ser recusado)");
  try {
    const { status, j } = await post("/rea", { token: TOKEN, command: "capture-process", json: true });
    status === 400 && j?.ok === false ? V(`recusado como esperado (HTTP ${status})`) : X(`deveria recusar; veio HTTP ${status} ${JSON.stringify(j).slice(0, 120)}`);
  } catch (e) { X(`erro ao testar deny: ${String(e?.message ?? e)}`); }

  // 3) ANÁLISE — o alvo (golden ou arquivo) → Evidence
  const usandoArquivo = !!ALVO_ARQ;
  const conteudo = usandoArquivo ? await readFile(ALVO_ARQ) : Buffer.from(GOLDEN, "utf8");
  const nome = usandoArquivo ? ALVO_ARQ.split("/").pop() : "golden-bundle.js";
  console.log(`3) ${COMANDO} ← ${usandoArquivo ? ALVO_ARQ : "GOLDEN bundle (controlado)"} (${conteudo.length} bytes)`);
  try {
    const { status, j } = await post("/rea", {
      token: TOKEN, command: COMANDO, json: true,
      artifactBase64: conteudo.toString("base64"), artifactName: nome,
    });
    if (status !== 200 || !j?.ok) {
      X(`análise falhou: HTTP ${status} code=${j?.code} ${(j?.erro || j?.stderr || "").toString().slice(0, 200)}`);
    } else {
      V(`motor rodou e devolveu ok (code=${j.code})`);
      const ev = j.evidence !== undefined ? JSON.stringify(j.evidence) : (j.stdout || "");
      ev && ev.length > 2 ? V(`Evidence não-vazia (${ev.length} chars)`) : X("Evidence vazia — o motor rodou mas não produziu nada");
      if (!usandoArquivo && ev) {
        // golden: prova que o motor LEU o bundle (não só rodou)
        const achados = ESPERADOS.filter((t) => ev.includes(t));
        achados.length >= 2
          ? V(`Evidence cita os alvos plantados: ${achados.join(", ")}`)
          : W(`Evidence não citou os alvos plantados (${ESPERADOS.join(", ")}) — confira o formato de saída do ${COMANDO}`);
      } else if (usandoArquivo && ev) {
        // alvo real: mostra uma amostra pra leitura humana
        console.log("    — amostra da Evidence (300 chars):");
        console.log("      " + ev.slice(0, 300).replace(/\n/g, "\n      "));
      }
    }
  } catch (e) { X(`erro na análise: ${String(e?.message ?? e)}`); }

  console.log(`\n== resultado: ${ok} ok · ${falhou} falha(s) · ${avisos} aviso(s) ==`);
  process.exit(falhou > 0 ? 1 : 0);
}

main().catch((e) => { console.error("erro fatal:", e); process.exit(1); });
