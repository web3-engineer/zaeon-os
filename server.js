// server.js
const { createServer } = require("http");
const next = require("next");
const { Server } = require("socket.io");

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = process.env.PORT || 3000;

// Inicializa a aplicação Next.js
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// ── QUEM AGENDA: só o WEB ─────────────────────────────────────────────────────────────────────
// O `worker` dedicado roda a MESMA imagem, o MESMO server.js e o MESMO env_file do web
// (docker-compose.beta.yml: env_file: ['.env', '.env.secrets'] nos dois). Então, sem esta trava, ao
// subir o worker passam a existir DOIS agendadores de WhatsApp e DOIS ouvintes de chip — e o log do
// deploy de 06/nov/2026 mostrou exatamente isso.
//
// Por que isso importa: o dedupe do disparo é LER-DEPOIS-ESCREVER sem atomicidade
// (lib/whatsapp/service.ts: `findFirst` pelo dedupeKey, depois envia, e só então grava o log) e o
// schema tem `@@index([userId, dedupeKey])` — ÍNDICE, não restrição única. Dois processos passam os
// dois pela checagem antes de qualquer um gravar, e a janela é a duração inteira do POST ao
// provedor. A única defesa restante é o `idempotencyKey` que vai no envelope da ponte, e quem o
// IMPÕE é o ChipFlow — outro sistema, que este repositório não pode verificar.
//
// A trava é por PAPEL e não por `SCHOLAR_WORKER`, de propósito: a topologia pretendida tem o web
// com SCHOLAR_WORKER=0, mas HOJE o web está com 1 — usar essa flag desligaria o agendador no web,
// que é justamente quem deve agendar. Ausente = web, então deploy existente não muda nada.
const PAPEL = (process.env.ZAEON_ROLE || "web").trim().toLowerCase();
const EH_WORKER_DEDICADO = PAPEL === "worker";

// ── Mentor no WhatsApp: tick do scheduler de disparos (docs/WHATSAPP_MENTOR.md) ──
// Chama POST /api/whatsapp/dispatch a cada N min (idempotente por dedupeKey). Só liga se
// houver token interno + um provider de envio configurado. WHATSAPP_DISPATCH=0 desliga.
function startWhatsAppScheduler(port) {
    const token = process.env.WHATSAPP_INTERNAL_TOKEN;
    const hasProvider = !!(process.env.WHATSAPP_PROVIDER || process.env.EVOLUTION_URL || process.env.DISPAROS_URL || process.env.WA_OPERATOR_URL);
    if (!token || !hasProvider || process.env.WHATSAPP_DISPATCH === "0") return;
    if (EH_WORKER_DEDICADO) { console.log("> WhatsApp scheduler NÃO ligado (papel=worker; quem agenda é o web)"); return; }
    const everyMin = Math.max(1, Number(process.env.WHATSAPP_DISPATCH_EVERY_MIN) || 15);
    const tick = async () => {
        try {
            const res = await fetch(`http://localhost:${port}/api/whatsapp/dispatch`, { method: "POST", headers: { "x-internal-token": token } });
            const body = await res.json().catch(() => ({}));
            if (body && (body.sent || body.errors)) console.log(`[whatsapp:dispatch] users=${body.users} sent=${body.sent} skipped=${body.skipped} errors=${body.errors}`);
        } catch (e) { console.warn("[whatsapp:dispatch] tick falhou:", e?.message || e); }
    };
    setTimeout(tick, 90_000); // deixa o app aquecer
    setInterval(tick, everyMin * 60_000);
    console.log(`> WhatsApp scheduler ligado (a cada ${everyMin} min)`);
}

// ── Chips da Zaeon: o OUVIDO (mensagens que chegam nos chips + estado de conexão), pelo bridge Redis ──
// Um tick curto por vez (POST /api/whatsapp/chips/eventos) — sem processo novo pra manter vivo. Liga com o
// adapter configurado (WA_OPERATOR_URL) + token interno. WA_EVENTOS=0 desliga.
function startChipsListener(port) {
    const token = process.env.WHATSAPP_INTERNAL_TOKEN;
    if (!token || !process.env.WA_OPERATOR_URL || process.env.WA_EVENTOS === "0") return;
    if (EH_WORKER_DEDICADO) { console.log("> Chips de WhatsApp NÃO ouvindo (papel=worker; quem ouve é o web)"); return; }
    const everyS = Math.max(1, Number(process.env.WA_EVENTOS_A_CADA_S) || 3);
    let rodando = false;   // um tick por vez (responder pode levar alguns segundos)
    const tick = async () => {
        if (rodando) return;
        rodando = true;
        try {
            const res = await fetch(`http://localhost:${port}/api/whatsapp/chips/eventos`, { method: "POST", headers: { "x-internal-token": token } });
            const b = await res.json().catch(() => ({}));
            if (b && (b.respondidos || b.estados)) console.log(`[chips] lidos=${b.lidos} respondidos=${b.respondidos} estados=${b.estados}`);
        } catch (e) { console.warn("[chips] tick falhou:", e?.message || e); }
        finally { rodando = false; }
    };
    setTimeout(() => setInterval(tick, everyS * 1000), 60_000);
    console.log(`> Chips de WhatsApp ouvindo (a cada ${everyS} s)`);
}

app.prepare().then(() => {
    const httpServer = createServer(handle);

    // Anexa o Socket.IO ao servidor HTTP do Next.js
    const io = new Server(httpServer);

    io.on("connection", (socket) => {
        console.log("⚡ Novo agente conectado ao Socket:", socket.id);

        // 1. O utilizador junta-se a uma "sala" com o seu próprio ID (para receber mensagens privadas)
        socket.on("join_own_room", (userId) => {
            socket.join(userId);
            console.log(`Agente ${userId} entrou na sua sala pessoal.`);
        });

        // 2. CHAT PRIVADO: Encaminha a mensagem diretamente para o ID do destinatário
        socket.on("send_private_message", (data) => {
            // data contém: { receiverId, messageObj }
            // Transmite a mensagem apenas para a sala do recetor
            socket.to(data.receiverId).emit("receive_private_message", data.messageObj);
        });

        // 3. COMUNIDADE (Preparação para o próximo passo): Junta-se ao Lounge
        socket.on("join_community", (roomName) => {
            socket.join(roomName);
        });

        socket.on("disconnect", () => {
            console.log("Agente desconectado:", socket.id);
        });
    });

    httpServer.once("error", (err) => {
        console.error(err);
        process.exit(1);
    });

    httpServer.listen(port, () => {
        console.log(`> Servidor Zaeon OS pronto e a escutar em http://${hostname}:${port}`);
        startWhatsAppScheduler(port);
        startChipsListener(port);
    });
});