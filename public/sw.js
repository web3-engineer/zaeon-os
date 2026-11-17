/*
 * Service worker da Zaeon — escrito à mão de propósito (sem Serwist/Workbox).
 *
 * O que ele faz, e SÓ isso:
 *   - navegação ............ network-first; sem rede, devolve a /offline;
 *                            servidor mudo por 6 s → aviso "demorando" (#841)
 *   - /_next/static/* ...... cache-first (nome com hash = imutável)
 *   - /icons /assets /sponsors ... stale-while-revalidate
 *   - fotos dos agentes (/agents, /avatars: só imagem) ... idem (#841: sem
 *     internet, a foto da Aura aparecia quebrada no Menu)
 *   - todo o resto ......... não toca (API, _next/data, RSC, POST, outra origem)
 *
 * O que ele NÃO faz, e por quê:
 *   - precache do build: a Zaeon faz deploy no push pra main; um precache
 *     prenderia quem já tem o SW num build velho.
 *   - cache de HTML de página: página pode ser autenticada (NextAuth); servir
 *     a de uma sessão pra outra pessoa no mesmo aparelho é vazamento.
 *
 * Trocar VERSAO descarta todos os caches antigos no próximo activate.
 */
const VERSAO = "zaeon-v1";
const CACHE_ESTATICO = `${VERSAO}-estatico`;
const CACHE_MIDIA = `${VERSAO}-midia`;
const CACHE_PAGINAS = `${VERSAO}-paginas`;
const OFFLINE = "/offline";

// Cada deploy gera chunks com hash novo e os velhos nunca mais são pedidos.
// Sem teto, o cache estático cresceria para sempre dentro da mesma VERSAO.
const TETO_ESTATICO = 300;
const TETO_MIDIA = 150;

// ── INTERRUPTOR DE EMERGÊNCIA ───────────────────────────────────────────
// Trocar para true, fazer deploy, e todo SW instalado se desinstala sozinho
// e apaga os próprios caches. É o "desfazer" deste service worker.
// Exercitado antes do merge (ver descrição da PR).
const DESLIGAR = false;

self.addEventListener("install", (e) => {
    // skipWaiting vale também com DESLIGAR: sem ele a versão desligada fica
    // "waiting" atrás da antiga até a pessoa fechar TODAS as abas — e um F5
    // não basta. O interruptor precisa assumir na hora.
    self.skipWaiting();
    if (DESLIGAR) return;
    e.waitUntil(guardarOffline());
});

self.addEventListener("activate", (e) => {
    e.waitUntil(
        (async () => {
            if (DESLIGAR) {
                const nomes = await caches.keys();
                await Promise.all(nomes.map((n) => caches.delete(n)));
                await self.registration.unregister();
                // Só abas CONTROLADAS (o padrão do matchAll) — ou seja, as que o
                // SW antigo servia. Enquanto DESLIGAR estiver no ar, a página
                // continua registrando o /sw.js e ele se autodestrói de novo;
                // uma aba recém-aberta não é controlada, então não é recarregada
                // e não existe loop. Não troque por includeUncontrolled: true.
                const abas = await self.clients.matchAll({ type: "window" });
                abas.forEach((aba) => aba.navigate(aba.url));
                return;
            }
            // some com cache de versão anterior
            const nomes = await caches.keys();
            await Promise.all(
                nomes.filter((n) => !n.startsWith(VERSAO)).map((n) => caches.delete(n))
            );
            await self.clients.claim();
        })()
    );
});

self.addEventListener("fetch", (e) => {
    if (DESLIGAR) return; // handler existe mas não intercepta
    const req = e.request;
    if (req.method !== "GET") return;

    if (req.mode === "navigate") {
        e.respondWith(navegar(req));
        return;
    }

    const url = new URL(req.url);
    if (url.origin !== self.location.origin) return;
    if (req.headers.has("authorization")) return;

    if (url.pathname.startsWith("/_next/static/")) {
        e.respondWith(cacheFirst(req));
        return;
    }
    if (/^\/(icons|assets|sponsors)\//.test(url.pathname) || /^\/(agents|avatars)\/.+\.(png|webp|jpe?g|svg)$/i.test(url.pathname)) {
        e.respondWith(staleWhileRevalidate(req, e));
    }
    // qualquer outra coisa: o navegador segue sozinho, sem o SW no meio
});

// Navegação: a rede sempre vence. O cache só entra quando a rede FALHA —
// um 500 do servidor continua sendo mostrado como 500, não como "offline".
//
// #841: com o servidor lento (já vimos 7 a 11 s esperando o primeiro byte), a tela
// ficava parada sem dizer nada. Se em ESPERA_MS não chegar resposta, mostra o aviso
// "demorando" — uma página leve, sem rede, que tenta de novo sozinha e tem o botão.
// A navegação não é cancelada: o servidor continua respondendo, e a próxima
// tentativa costuma encontrá-lo pronto.
const ESPERA_MS = 6000;
async function navegar(req) {
    const daRede = fetch(req);
    let relogio;
    const demorou = new Promise((resolve) => { relogio = setTimeout(() => resolve(DEMOROU), ESPERA_MS); });
    try {
        const resp = await Promise.race([daRede, demorou]);
        if (resp !== DEMOROU) return resp;
        daRede.catch(() => {});   // chega depois: sem erro solto no console
        return paginaDemorando(req);
    } catch {
        const offline = await caches.match(OFFLINE, { cacheName: CACHE_PAGINAS });
        return offline || Response.error();
    } finally {
        clearTimeout(relogio);
    }
}
const DEMOROU = Symbol("demorou");

// Os textos seguem a língua do aparelho (o SW não tem o i18n do app).
const TEXTOS_DEMORANDO = {
    pt: ["A Zaeon está demorando para responder", "Seu pedido continua: tentamos de novo sozinhos em alguns segundos.", "Tentar de novo"],
    en: ["Zaeon is taking a while to respond", "Your request is still going: we'll try again on our own in a few seconds.", "Try again"],
    es: ["Zaeon está tardando en responder", "Tu pedido sigue en curso: lo intentamos de nuevo solos en unos segundos.", "Intentar de nuevo"],
    fr: ["Zaeon met du temps à répondre", "Votre demande continue : nous réessayons tout seuls dans quelques secondes.", "Réessayer"],
    de: ["Zaeon braucht etwas länger", "Deine Anfrage läuft weiter: Wir versuchen es in ein paar Sekunden von selbst erneut.", "Erneut versuchen"],
    ko: ["Zaeon의 응답이 늦어지고 있어요", "요청은 계속 진행 중이에요. 몇 초 뒤에 자동으로 다시 시도합니다.", "다시 시도"],
    zh: ["Zaeon 响应较慢", "你的请求仍在进行，几秒后会自动重试。", "重试"],
};

function paginaDemorando(req) {
    const lng = ((req.headers.get("accept-language") || "pt").split(",")[0] || "pt").slice(0, 2).toLowerCase();
    const [titulo, texto, botao] = TEXTOS_DEMORANDO[lng] || TEXTOS_DEMORANDO.pt;
    const html = `<!doctype html><html lang="${lng}"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#030014"><title>Zaeon</title>
<style>
html,body{margin:0;height:100%;background:#030014;color:#e8f3ff;font:16px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif}
main{min-height:100%;display:grid;place-items:center;padding:24px;box-sizing:border-box;text-align:center}
.anel{width:44px;height:44px;margin:0 auto 20px;border-radius:50%;border:3px solid rgba(56,240,255,.25);border-top-color:#38f0ff;animation:g 1s linear infinite}
@keyframes g{to{transform:rotate(360deg)}}
@media (prefers-reduced-motion:reduce){.anel{animation:none}}
h1{font-size:20px;margin:0 0 8px}p{margin:0 0 24px;color:#9fb2d4;max-width:340px}
button{min-height:44px;padding:0 22px;border-radius:999px;border:1px solid rgba(56,240,255,.5);background:rgba(56,240,255,.12);color:#e8f3ff;font:inherit;font-weight:600;cursor:pointer}
</style></head><body><main><div><div class="anel" aria-hidden="true"></div>
<h1 role="status">${titulo}</h1><p>${texto}</p>
<button type="button" onclick="location.reload()">${botao}</button></div></main>
<script>setTimeout(function(){location.reload()},8000)</script></body></html>`;
    return new Response(html, { status: 503, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
}

async function cacheFirst(req) {
    // caches.match (e não cache.match) porque os chunks da /offline moram
    // no CACHE_PAGINAS, fora do teto do estático.
    const guardado = await caches.match(req);
    if (guardado) return guardado;
    const resp = await fetch(req);
    if (cacheavel(resp)) guardar(CACHE_ESTATICO, req, resp.clone(), TETO_ESTATICO);
    return resp;
}

async function staleWhileRevalidate(req, e) {
    const cache = await caches.open(CACHE_MIDIA);
    const guardado = await cache.match(req);
    const daRede = fetch(req).then((resp) => {
        if (cacheavel(resp)) return guardar(CACHE_MIDIA, req, resp.clone(), TETO_MIDIA).then(() => resp);
        return resp;
    });
    if (guardado) {
        e.waitUntil(daRede.catch(() => {}));
        return guardado;
    }
    return daRede;
}

function cacheavel(resp) {
    if (!resp || resp.status !== 200 || resp.type === "opaque") return false;
    const cc = resp.headers.get("cache-control") || "";
    return !/no-store|private/i.test(cc);
}

async function guardar(nome, req, resp, teto) {
    const cache = await caches.open(nome);
    await cache.put(req, resp);
    // keys() volta em ordem de inserção: corta os mais antigos
    const chaves = await cache.keys();
    for (let i = 0; i < chaves.length - teto; i++) await cache.delete(chaves[i]);
}

// A /offline é renderizada dentro do layout raiz, então depende do CSS e dos
// chunks do build em que foi gerada. Guarda a página E esses arquivos juntos
// no mesmo cache: a cópia offline fica coerente consigo mesma mesmo depois de
// deploys novos (os arquivos têm hash, não existe "versão velha" deles).
// Isto NÃO é precache do build: é só a árvore de dependências de uma página.
async function guardarOffline() {
    const cache = await caches.open(CACHE_PAGINAS);
    const resp = await fetch(OFFLINE, { cache: "reload" });
    if (!resp.ok) throw new Error(`offline: ${resp.status}`);
    const html = await resp.clone().text();
    await cache.put(OFFLINE, resp);
    const arquivos = new Set(html.match(/\/_next\/static\/[^"'\s)\\<>]+/g) || []);
    // allSettled: um chunk que falhar não pode impedir a instalação
    await Promise.allSettled([...arquivos].map((a) => cache.add(a)));
}
