import { NextResponse } from 'next/server';
import { VertexAI } from '@google-cloud/vertexai';
import type { FunctionDeclaration } from '@google-cloud/vertexai';
import { GEMINI_MODEL_FLASH } from '@/lib/ai/model';
import { vertexCredentials } from '@/lib/ai/vertex-credentials';
import { guard } from '@/src/lib/ratelimit';
import { sanitizeHistory } from '@/lib/ai/history';
import { generateWithCache, CacheMissError } from "@/lib/ai/contextCache";
import { studioGenerateTool, normalizeStudioKind, studioLabel, researchGenerateTool } from "@/lib/agent/tools";

// Sentinela do stream: turno de tool-call não tem texto; o servidor emite esta
// linha e o cliente executa a AÇÃO (gera o artefato no Studio). Ver StudyCoworkChat.
const STUDIO_SENTINEL = "@@STUDIO_ACTION@@";
const RESEARCH_SENTINEL = "@@RESEARCH_ACTION@@";   // Sala de Pesquisa: gerar trabalho no doc
const STRUCTURED_SENTINEL = "@@STRUCTURED@@";      // harness: StructuredAnswer inteiro (render rico + artifacts inline)
import { buildPersona, DEFAULT_AGENT_ID } from "@/lib/ai/personas";

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

// --- 1. SCHEDULE TOOL DEFINITION (Function Calling - Gemini) ---
const updateScheduleTool: FunctionDeclaration = {
    name: "update_schedule",
    description: "Adiciona, remove ou atualiza uma aula OU evento na agenda do aluno. Ao adicionar, preencha sempre o NOME (aula/evento), o HORÁRIO e pelo menos um DETALHE (professor, sala ou observação).",
    parameters: {
        type: "OBJECT" as any,
        properties: {
            action: { type: "STRING" as any, description: "Ação: 'add', 'remove', ou 'update'." },
            day: { type: "INTEGER" as any, description: "Dia da semana. 1 = Segunda, 2 = Terça, 3 = Quarta, 4 = Quinta, 5 = Sexta, 6 = Sábado, 7 = Domingo." },
            hour: { type: "INTEGER" as any, description: "Hora de início. Formato 24h (ex: 8, 10, 14)." },
            name: { type: "STRING" as any, description: "Nome da aula ou evento." },
            teacher: { type: "STRING" as any, description: "Nome do professor (se for aula)." },
            room: { type: "STRING" as any, description: "Local ou sala." },
            detail: { type: "STRING" as any, description: "Detalhe livre do evento (ex.: 'prova', 'entrega', observação) quando não for professor/sala." },
            duration: { type: "INTEGER" as any, description: "Duração em horas. Padrão 2." }
        },
        required: ["action", "day", "hour"]
    }
};

// --- LESSONS TOOL (o agente acessa as AULAS do aluno) ---
const lessonsTool: FunctionDeclaration = {
    name: "lessons",
    description: "Acessa as AULAS do aluno (enviadas pelos professores). Use action='list' para listar as aulas do aluno; action='open' para abrir/rolar até uma aula específica pelo tema/título.",
    parameters: {
        type: "OBJECT" as any,
        properties: {
            action: { type: "STRING" as any, description: "Ação: 'list' (listar minhas aulas) ou 'open' (abrir uma aula)." },
            topic: { type: "STRING" as any, description: "Tema ou título da aula a abrir (quando action='open')." }
        },
        required: ["action"]
    }
};

// --- SUMMON TOOL (a Zaeon convoca um agente especialista) ---
const summonAgentTool: FunctionDeclaration = {
    name: "summon_agent",
    description: "Convoca um agente especialista e JÁ EXECUTA a ação na sala certa. Use SEMPRE que a pessoa pedir para ESTUDAR um assunto, PESQUISAR/ler literatura, ESCREVER um texto, ou PROGRAMAR algo — em vez de só responder em texto. Preencha o 'topic' com o assunto exato.",
    parameters: {
        type: "OBJECT" as any,
        properties: {
            skill: { type: "STRING" as any, description: "Uma de: 'study' (estudar), 'research' (pesquisar), 'write' (escrever), 'code' (programar)." },
            topic: { type: "STRING" as any, description: "O assunto/tema EXATO em linguagem natural (ex.: 'fotossíntese', 'redes neurais'). Obrigatório quando houver um assunto." }
        },
        required: ["skill", "topic"]
    }
};

// --- OPEN ROOM TOOL (a Zaeon NAVEGA entre salas por voz/texto, em tempo real) ---
const openRoomTool: FunctionDeclaration = {
    name: "open_room",
    description: "Abre/troca para uma SALA da plataforma quando a pessoa pedir pra ir, abrir, voltar ou mudar de sala (ex.: 'me leva pra pesquisa', 'volta pro lounge', 'abre meus estudos'). Use quando NÃO há uma tarefa a executar — só navegação. Se houver tarefa (estudar/pesquisar/escrever/programar um tema), use summon_agent.",
    parameters: {
        type: "OBJECT" as any,
        properties: {
            room: { type: "STRING" as any, description: "Uma de: 'pesquisa', 'estudos', 'projetos', 'pesquisas-salvas', 'lounge', 'sala-de-aula', 'perfil'." },
        },
        required: ["room"]
    }
};

// Mapa de salas → aba/rota (navegação da Zaeon entre as salas do research-lab).
const ROOM_MAP: Record<string, { tab: string; label: string }> = {
    "pesquisa": { tab: "pesquisa", label: "Pesquisa" },
    "estudos": { tab: "sala-de-estudos", label: "Sala de Estudos" },
    "sala-de-estudos": { tab: "sala-de-estudos", label: "Sala de Estudos" },
    "projetos": { tab: "projetos", label: "Projetos (Zaeon Code)" },
    "codigo": { tab: "projetos", label: "Projetos (Zaeon Code)" },
    "zaeon-code": { tab: "projetos", label: "Projetos (Zaeon Code)" },
    "pesquisas-salvas": { tab: "pesquisas", label: "Pesquisas salvas" },
    "pesquisas": { tab: "pesquisas", label: "Pesquisas salvas" },
    "lounge": { tab: "lounge", label: "Lounge" },
    "sala-de-aula": { tab: "pevem", label: "Sala de Aula" },
    "aulas": { tab: "pevem", label: "Sala de Aula" },
    "perfil": { tab: "profile", label: "Perfil" },
    "profile": { tab: "profile", label: "Perfil" },
};

// Mapa habilidade → agente/sala/rota (handoff da Zaeon pro agente certo).
const SUMMON_MAP: Record<string, { agent: string; route: string; cta: string; verb: string }> = {
    study: { agent: "Nina · Sala de Estudos", route: "/research-lab?tab=sala-de-estudos", cta: "Abrir a Sala de Estudos", verb: "estudar" },
    research: { agent: "Aura · Pesquisa", route: "/research-lab?tab=pesquisa", cta: "Abrir a Pesquisa", verb: "pesquisar" },
    write: { agent: "Caio · Pesquisa", route: "/research-lab?tab=pesquisa", cta: "Escrever com o Caio", verb: "escrever" },
    code: { agent: "Téo · Projetos", route: "/research-lab?tab=projetos", cta: "Abrir o Zaeon Code", verb: "programar" },
};

// Formata o world-state (AgentContext) em texto enxuto pro prompt. Puro (server-safe).
function formatAgentContext(c: any): string {
    if (!c || typeof c !== "object") return "";
    const bits: string[] = [];
    if (c.activeTab) bits.push(`Sala/aba atual: ${c.activeTab}`);
    if (c.currentGoal) bits.push(`Objetivo atual: ${c.currentGoal}`);
    if (c.currentStudyId) bits.push(`Estudo aberto: ${c.currentStudyId}`);
    if (c.currentResearchId) bits.push(`Pesquisa aberta: ${c.currentResearchId}`);
    if (c.currentProjectId) bits.push(`Projeto aberto: ${c.currentProjectId}`);
    if (Array.isArray(c.recentActions) && c.recentActions.length) {
        const recent = c.recentActions.slice(-5).map((a: any) => `${a?.kind}${a?.detail ? `(${a.detail})` : ""}`);
        bits.push(`Ações recentes: ${recent.join(", ")}`);
    }
    return bits.join("\n");
}

export async function POST(req: Request) {
    try {
        const rl = await guard(req, "ai-chat", "ai-heavy");
        if (!rl.ok) return rl.response;
        // 🔥 NOVO: Recebendo userData + history + agentContext do frontend
        const { prompt, agent, systemContext: rawSystemContext, fileData, userData, voiceMode, history, agentContext, cacheName, stream, surface, mentor, mentorId } = await req.json();
        const agentKey = agent?.toLowerCase() || DEFAULT_AGENT_ID;

        // MENTOR ativo — `mentor:"farmacia"` (slug = a chave; `mentorId` ObjectId só como fallback).
        // Um mentor NÃO é motor novo: é a Aura parametrizada — o personaText entra NA FRENTE do
        // systemContext (legado, cache e harness leem a mesma variável) e a memória ganha
        // wing = slug/userId. Só p/ agent="aura". Slug desconhecido = Aura base (nunca derruba o turno).
        let systemContext: string | undefined = rawSystemContext;
        let activeMentor: import("@/lib/agent/mentors-server").ResolvedMentor | null = null;
        if ((mentor || mentorId) && agentKey === "aura") {
            const [{ resolveMentor }, { resolveUserId: rid }] = await Promise.all([
                import("@/lib/agent/mentors-server"),
                import("@/lib/agent/transcript"),
            ]);
            const uid = await rid().catch(() => null);
            activeMentor = await resolveMentor(mentor || mentorId, uid).catch(() => null);
            if (activeMentor) systemContext = [activeMentor.context, rawSystemContext].filter(Boolean).join("\n\n");
        }

        // Histórico da conversa (memória entre turnos). Ver lib/ai/history.ts.
        const chatHistory = sanitizeHistory(history);
        // Persona = preâmbulo (modelo mental "Zaeon = coletivo" + regra de nomes) + prompt do agente.
        const persona = buildPersona(agentKey);

        // =================================================================
        // GEMINI ROUTE (VERTEX AI) — ÚNICA IA DO APP (Gemini Flash)
        // =================================================================
        const { project, client_email, private_key, location } = vertexCredentials();
        const vertexAI = new VertexAI({
            project,
            location,
            googleAuthOptions: { credentials: { client_email, private_key } }
        });

        const scheduleAgents = ["zenita", "core_active"];
        // "bento" virou "zaeon" (a anfitriã); aceitamos os dois como alias (compat).
        const isHost = agentKey === "zaeon" || agentKey === "bento";
        const tools = scheduleAgents.includes(agentKey)
            ? [{ functionDeclarations: [updateScheduleTool, lessonsTool] }]
            : isHost
                ? [{ functionDeclarations: [summonAgentTool, openRoomTool] }]
                : agentKey === "aura"
                    // Sala de Pesquisa (surface="pesquisa") → gera TRABALHO; senão → Studio.
                    ? [{ functionDeclarations: [surface === "pesquisa" ? researchGenerateTool : studioGenerateTool] }]
                    : undefined;
        const generativeModel = vertexAI.getGenerativeModel({
            // Gemini Flash é a ÚNICA IA do app (lib/ai/model.ts). Troca via env GEMINI_MODEL.
            model: GEMINI_MODEL_FLASH,
            generationConfig: { temperature: 0.4 },
            tools: tools
        });

        const parts: any[] = [];
        if (fileData && typeof fileData === "string") {
            // Aceita data URL ("data:<mime>;base64,XXXX") — usado por imagem (Vision) —
            // OU base64 cru (fluxo legado de PDF, sem prefixo → assume application/pdf).
            let mime = "application/pdf";
            let b64 = fileData;
            const m = /^data:([^;]+);base64,(.*)$/s.exec(fileData);
            if (m) { mime = m[1]; b64 = m[2]; }

            // PDFs grandes estouram o limite inline do Gemini → extrai o TEXTO (pdfjs).
            const TOO_BIG = b64.length > 18_000_000; // ~13.5MB em base64
            if (mime === "application/pdf" && TOO_BIG) {
                try {
                    const { extractPdfParagraphs } = await import("@/lib/scholar/pdf");
                    const bytes = Uint8Array.from(Buffer.from(b64, "base64"));
                    const paras = await extractPdfParagraphs(bytes).catch(() => [] as any[]);
                    const text = (paras as any[]).map((p) => p.text).join("\n\n").slice(0, 30000);
                    if (text) parts.push({ text: `=== TEXTO EXTRAÍDO DO PDF (documento grande — texto puro, sem layout) ===\n${text}` });
                } catch { /* se a extração falhar, segue sem o PDF (responde com o que tiver) */ }
            } else {
                // imagem (Gemini Vision) ou PDF dentro do limite → inline com o mime certo
                parts.push({ inlineData: { data: b64, mimeType: mime } });
            }
        }
        parts.push({ text: prompt });

        // =================================================================
        // SYSTEM INSTRUCTION ASSEMBLY (Persona + User Data + Context)
        // =================================================================
        let finalSystemInstruction = persona;

        // Injeta a memória persistente do usuário se ela existir
        if (userData && Object.keys(userData).length > 0) {
            finalSystemInstruction += `\n\n=== MEMÓRIA DA REDE: DADOS DO USUÁRIO ===\n`;
            if (userData.name) finalSystemInstruction += `- Nome: ${userData.name}\n`;
            if (userData.age) finalSystemInstruction += `- Idade: ${userData.age} anos\n`;
            if (userData.studyArea) finalSystemInstruction += `- Área de Atuação/Curso: ${userData.studyArea}\n`;
            if (userData.institution) finalSystemInstruction += `- Instituição de Ensino/Empresa: ${userData.institution}\n`;

            finalSystemInstruction += `\nDiretriz: Você já conhece essas informações. Use-as para dar respostas altamente qualificadas e contextualizadas à área profissional/acadêmica do usuário, mas NUNCA liste esses dados como um robô. Mantenha a naturalidade de um colega humano.\n`;
        }

        if (systemContext) {
            finalSystemInstruction += `\n\n=== CONTEXTO ADICIONAL FORNECIDO PELO SISTEMA ===\n${systemContext}`;
        }

        // World-state durável do workspace (sala/aba atual, entidades abertas, objetivo,
        // ações recentes). Dá à IA "contexto real do projeto", não só da conversa.
        const wsText = formatAgentContext(agentContext);
        if (wsText) {
            finalSystemInstruction += `\n\n=== ESTADO ATUAL DO WORKSPACE (use pra agir com contexto; não liste como robô) ===\n${wsText}`;
        }

        // Modo de voz (passivo/ativo) ajusta a personalidade da resposta falada.
        if (voiceMode === "passive" || voiceMode === "active") {
            const directive = voiceMode === "active"
                ? `MODO VOZ ATIVO: você pode conversar com leveza, calor e personalidade sobre o assunto — comente brevemente — e AO MESMO TEMPO acione o agente certo para executar. NÃO narre tarefas técnicas; converse com naturalidade enquanto age. Seja humana e concisa.`
                : `MODO VOZ PASSIVO: receba o comando e EXECUTE com o mínimo de conversa. Seja breve e direto, acione o agente certo sem rodeios nem narração.`;
            finalSystemInstruction += `\n\n=== MODO DE VOZ ===\n${directive}`;
        }

        // CHAT VIA CACHE: o PDF está num cachedContent do Vertex → mandamos só o
        // systemInstruction + histórico + pergunta (sem reenviar o PDF). ~90% menos
        // tokens por turno. Cache expirou → { cacheExpired: true } e o cliente recria.
        if (typeof cacheName === "string" && cacheName) {
            try {
                const text = await generateWithCache({
                    cacheName,
                    systemText: finalSystemInstruction,
                    prompt,
                    history: chatHistory,
                });
                return NextResponse.json({ text });
            } catch (e: any) {
                if (e instanceof CacheMissError) {
                    return NextResponse.json({ cacheExpired: true });
                }
                return NextResponse.json({ success: false, error: e?.message }, { status: 500 });
            }
        }

        // =================================================================
        // AURA HARNESS (Fase 1) — laço agêntico atrás da flag AURA_HARNESS.
        // Ligado por padrão; AURA_HARNESS="0" = kill-switch → cai no streaming legado
        // abaixo (IDÊNTICO a hoje). Só o co-working da Aura EM TEXTO entra no laço; turnos
        // com PDF/imagem (fileData) seguem pelo caminho legado (multimodal). Responde no
        // MESMO protocolo (datilografia + sentinelas @@STUDIO_ACTION@@/@@RESEARCH_ACTION@@).
        // =================================================================
        if (stream === true && agentKey === "aura" && process.env.AURA_HARNESS !== "0" && !fileData) {
            const encoder = new TextEncoder();
            // TUDO o que precede a trajetória mora DENTRO do start(), de propósito.
            //
            // Antes, os imports, o resolveUserId, o wakeUpContext da memória e a árvore de
            // habilidades eram aguardados aqui fora — o stream só abria depois deles. Medido
            // no dev com a rota já quente: 5 segundos dos 15 de espera, um terço do total,
            // antes do primeiro sinal de vida. Narrar só as fases do harness e deixar esse
            // terço no escuro seria consertar pela metade.
            //
            // De quebra, um erro nessa preparação agora cai no catch do stream e vira
            // mensagem amigável, em vez de derrubar a requisição inteira.
            const rs = new ReadableStream<Uint8Array>({
                async start(controller) {
                    let enfileirar: ((chunk: string) => void) | null =
                        (chunk) => controller.enqueue(encoder.encode(chunk));
                    // Fora do try porque o catch depende dele: a mensagem de erro amigável não
                    // pode virar string à mão só porque o erro aconteceu cedo demais.
                    const { messageForError } = await import("@/lib/agent/errors");
                    // O primeiro sinal de vida sai ANTES de carregar o harness. Medido em dev
                    // com a rota quente, carregar os módulos e identificar o dono do turno leva
                    // uns segundos — em produção os módulos já vêm no bundle e isso encolhe,
                    // mas "encolhe" não é "some", e tela morta no primeiro segundo é o pedaço
                    // que o aluno mais sente: é o que ele olha logo depois de apertar enter.
                    const { serializarProgresso } = await import("@/lib/agent/progresso");
                    enfileirar(serializarProgresso({ fase: "acordar", rotulo: "Acordando a Aura" }));
                    try {
                        const [{ buildHarnessDeps, resolveHarnessOutput }, { runTrajectoryTraced }, mem, { resolveUserId }] = await Promise.all([
                            import("@/lib/agent/aura-harness"),
                            import("@/lib/agent/trajectory"),
                            import("@/lib/agent/memory-provider"),
                            import("@/lib/agent/transcript"),
                        ]);
                        const userId = await resolveUserId().catch(() => null); // dono do turno (memória filtra por isto)
                        const ac: any = (agentContext && typeof agentContext === "object") ? agentContext : {};
                        const hctx: any = {
                            ...ac,
                            userId: userId || undefined,
                            activeTab: surface || ac.activeTab || "sala-de-estudos", // academicMode vem daqui (pesquisa→enforced)
                            plan: "free",     // memória/studio/research = free; gate de plano é só compute pesado (PR03)
                            execMode: "auto", // HITL "guiado" entra no PR07
                            currentGoal: ac.currentGoal || String(prompt || "").slice(0, 200),
                            // Mentor ativo: andar de memória "<slug>/<userId>" (isola por mentor E por usuário).
                            mentor: activeMentor?.slug,
                            wing: activeMentor?.wing.label,
                        };
                        // Só anuncia quando é verdade: sem dono do turno não há memória pra reler.
                        if (userId) enfileirar(serializarProgresso({ fase: "memoria", rotulo: "Retomando a conversa" }));
                        // wakeUp (L3, A8): recall + perfil pinado → systemContext. Best-effort; "" se o L3 não ligou.
                        const memBlock = userId ? await mem.wakeUpContext({ userId, surface: hctx.activeTab, hint: String(prompt || ""), wingLabel: activeMentor?.wing.label }).catch(() => "") : "";
                        // Cartolina → agente (a "bússola"): o que já foi estudado nesta conversa e o
                        // que está em aberto. "" com CARTOLINA_MEMORIA off / sem board / sem conversa.
                        const cartolinaMod = await import("@/lib/cartolina/memoria-turno");
                        const cartolinaBlock = await cartolinaMod.bussolaParaTurno(userId, ac.cartolinaScopeId);
                        // Árvore de habilidades: posição do aluno no tópico (dominados/disponíveis/nó em foco) +
                        // guardrail pedagógico → o mentor conduz pro próximo nó. Best-effort ("" sem tópico/L3).
                        const skillTopic = typeof ac.skillTopic === "string" && ac.skillTopic.trim() ? String(ac.skillTopic).trim() : null;
                        const skillNodeId = typeof ac.skillNodeId === "string" && ac.skillNodeId.trim() ? String(ac.skillNodeId).trim() : null;
                        const skillBlock = userId && skillTopic
                            ? await import("@/lib/skilltree/progress").then((m) => m.treeContextBlock(userId, skillTopic, skillNodeId)).catch(() => "")
                            : "";
                        const deps = buildHarnessDeps(hctx, {
                            systemContext: [systemContext, memBlock, cartolinaBlock, skillBlock].filter(Boolean).join("\n\n") || undefined,
                            history: (chatHistory as any[]).map((h) => ({ role: h.role, text: h?.parts?.[0]?.text ?? "" })),
                            // O CANAL DE PROGRESSO. Um turno elaborated são três chamadas de modelo
                            // em sequência (plan → reason → draft), cinco se o crítico mandar revisar
                            // — e até aqui o aluno via tela parada o tempo todo, porque este gancho
                            // nunca era passado e todo `emit` do trajectory morria num `?.()`.
                            //
                            // `emit` é síncrono e `controller.enqueue` também: dá pra narrar de
                            // dentro do laço sem esperar nada. E uma falha do canal nunca derruba a
                            // resposta — progresso é enfeite, a resposta é o produto.
                            onStep(step) {
                                if (!enfileirar || step?.kind !== "say") return;
                                const rotulo = String(step.label ?? "").trim();
                                if (!rotulo) return;
                                try {
                                    enfileirar(serializarProgresso({ fase: String(step.detail ?? ""), rotulo }));
                                } catch { /* stream fechado/abortado: segue sem narrar */ }
                            },
                        });
                        const { answer, state } = await runTrajectoryTraced(String(prompt || ""), hctx, deps);
                        const out = resolveHarnessOutput(state, answer, surface, String(prompt || ""));
                        // L3 write (A7, fire-and-forget): deriva o turno em drawers verbatim. Nunca bloqueia.
                        // Chat → cartolina: os cards do turno vão pro board da conversa (fire-and-forget).
                        if (userId) void cartolinaMod.fixarTurno({ userId, scopeId: ac.cartolinaScopeId, prompt: String(prompt || ""), answer, msgId: ac.cartolinaMsgId });
                        if (userId) void mem.writeTurnMemory({ userId, surface: hctx.activeTab, scopeId: ac.currentStudyId ?? ac.currentResearchId ?? null, prompt: String(prompt || ""), answer, wing: activeMentor?.wing });
                        // Árvore: o mentor SOBE a maestria quando o aluno demonstra domínio do nó em foco
                        // (juiz Flash, fire-and-forget — nunca atrasa nem derruba a resposta).
                        if (userId && skillTopic && skillNodeId) {
                            void import("@/lib/skilltree/assess")
                                .then((m) => m.assessAndUpdate({ userId, topicSlug: skillTopic, nodeId: skillNodeId, message: String(prompt || "") }))
                                .catch(() => null);
                        }
                        if (out.mode === "studio") {
                            controller.enqueue(encoder.encode(STUDIO_SENTINEL + JSON.stringify({ type: "studio", kind: out.kind, topic: out.topic, text: out.text })));
                        } else if (out.mode === "research") {
                            controller.enqueue(encoder.encode(RESEARCH_SENTINEL + JSON.stringify({ type: "research", kind: out.kind, topic: out.topic, text: out.text })));
                        } else if (out.mode === "structured") {
                            controller.enqueue(encoder.encode(STRUCTURED_SENTINEL + JSON.stringify(out.answer)));
                        } else {
                            controller.enqueue(encoder.encode(out.text)); // fallback texto (retrocompat)
                        }
                    } catch (e: any) {
                        // erro fatal → mensagem amigável (guardrail: nunca string à mão)
                        controller.enqueue(encoder.encode(messageForError(String(e?.message ?? e))));
                    }
                    enfileirar = null; // nada narra depois do fim
                    controller.close();
                },
            });
            return new Response(rs, {
                headers: {
                    "Content-Type": "text/plain; charset=utf-8",
                    "Cache-Control": "no-cache, no-transform",
                    "X-Accel-Buffering": "no",
                },
            });
        }

        // =================================================================
        // STREAMING (output aos poucos) — usado pelo co-working (agente aura,
        // sem tools → sem function-call, então é seguro streamar só texto).
        // O cliente lê o corpo como text/plain e vai concatenando os pedaços.
        // =================================================================
        if (stream === true) {
            const chatS = generativeModel.startChat({
                systemInstruction: { role: 'system', parts: [{ text: finalSystemInstruction }] },
                history: chatHistory,
            });
            const streamResult = await chatS.sendMessageStream(parts);
            const encoder = new TextEncoder();
            const rs = new ReadableStream<Uint8Array>({
                async start(controller) {
                    let call: any = null;   // functionCall detectada no stream (turno de tool)
                    try {
                        for await (const item of streamResult.stream) {
                            const partsArr = item?.candidates?.[0]?.content?.parts || [];
                            for (const p of partsArr) {
                                if (p?.functionCall) call = p.functionCall;
                                else if (p?.text) controller.enqueue(encoder.encode(p.text));
                            }
                        }
                    } catch { /* encerra o que tiver */ }
                    // TOOL-LOOP (Fase 0): studio_generate → AÇÃO pro cliente executar.
                    if (call?.name === "studio_generate") {
                        const a: any = call.args || {};
                        const kind = normalizeStudioKind(String(a.kind || ""));
                        const topic = typeof a.topic === "string" ? a.topic : "";
                        const text = topic
                            ? `Gerando ${studioLabel(kind)} sobre “${topic}” — já te mostro aqui.`
                            : `Gerando ${studioLabel(kind)} — já te mostro aqui.`;
                        controller.enqueue(encoder.encode(
                            STUDIO_SENTINEL + JSON.stringify({ type: "studio", kind, topic, text }),
                        ));
                    } else if (call?.name === "research_generate") {
                        const a: any = call.args || {};
                        const kind = String(a.kind || "artigo").toLowerCase();
                        const topic = typeof a.topic === "string" ? a.topic : "";
                        const text = `Gerando o trabalho sobre “${topic}” — vou encaixar no seu documento.`;
                        controller.enqueue(encoder.encode(
                            RESEARCH_SENTINEL + JSON.stringify({ type: "research", kind, topic, text }),
                        ));
                    }
                    controller.close();
                },
            });
            return new Response(rs, {
                headers: {
                    "Content-Type": "text/plain; charset=utf-8",
                    "Cache-Control": "no-cache, no-transform",
                    "X-Accel-Buffering": "no",
                },
            });
        }

        const chat = generativeModel.startChat({
            systemInstruction: { role: 'system', parts: [{ text: finalSystemInstruction }] },
            history: chatHistory, // 🔥 memória entre turnos (antes era ignorada → IA "esquecia" tudo)
        });

        const result = await chat.sendMessage(parts);
        const response = result.response;

        const functionCall = response.candidates?.[0]?.content?.parts?.[0]?.functionCall;
        if (functionCall) {
            if (functionCall.name === "summon_agent") {
                const args: any = functionCall.args || {};
                const skill = String(args.skill || "research").toLowerCase();
                const topic = typeof args.topic === "string" ? args.topic : "";
                const s = SUMMON_MAP[skill] || SUMMON_MAP.research;
                const route = s.route + (topic ? `&q=${encodeURIComponent(topic)}` : "");
                const text = topic
                    ? `Combinado! Vou te levar pra ${s.verb} sobre “${topic}” — chamei ${s.agent} pra ficar com você nessa.`
                    : `Pode deixar, vou chamar ${s.agent} pra te ajudar com isso.`;
                // Plano de passos VISÍVEIS (Fase 2): o cockpit mostra a Zaeon agindo.
                // Mesmo objeto pra texto/áudio/ligação → experiência uniforme.
                const plan = topic ? [
                    { kind: "navigate", label: `Abrindo ${s.agent.split("·").pop()?.trim() || s.cta}`, route },
                    { kind: "type", label: `Digitando o tema`, detail: topic },
                    { kind: "create", label: `${s.verb[0].toUpperCase()}${s.verb.slice(1)} sobre “${topic}”`, skill, topic, route },
                    { kind: "done", label: "Pronto — deixei tudo encaminhado pra você." },
                ] : [
                    { kind: "navigate", label: `Abrindo ${s.cta}`, route },
                    { kind: "done", label: "Pronto." },
                ];
                return NextResponse.json({ summon: { skill, topic, agent: s.agent, route, cta: s.cta }, plan, text });
            }
            if (functionCall.name === "studio_generate") {
                const args: any = functionCall.args || {};
                const kind = normalizeStudioKind(String(args.kind || ""));
                const topic = typeof args.topic === "string" ? args.topic : "";
                const text = topic
                    ? `Gerando ${studioLabel(kind)} sobre “${topic}” — já te mostro aqui.`
                    : `Gerando ${studioLabel(kind)} — já te mostro aqui.`;
                return NextResponse.json({ studioAction: { type: "studio", kind, topic, text }, text });
            }
            if (functionCall.name === "research_generate") {
                const args: any = functionCall.args || {};
                const kind = String(args.kind || "artigo").toLowerCase();
                const topic = typeof args.topic === "string" ? args.topic : "";
                const text = `Gerando o trabalho sobre “${topic}” — vou encaixar no seu documento.`;
                return NextResponse.json({ researchAction: { type: "research", kind, topic, text }, text });
            }
            if (functionCall.name === "open_room") {
                const args: any = functionCall.args || {};
                const key = String(args.room || "").toLowerCase().trim();
                const r = ROOM_MAP[key] || ROOM_MAP["pesquisa"];
                const route = `/research-lab?tab=${r.tab}`;
                const plan = [
                    { kind: "navigate", label: `Abrindo ${r.label}`, route, tab: r.tab },
                    { kind: "done", label: `Você está na ${r.label}.` },
                ];
                const text = `Pronto, te levei pra ${r.label}.`;
                return NextResponse.json({ navigate: { tab: r.tab, route, label: r.label }, plan, text });
            }
            return NextResponse.json({
                toolCall: { name: functionCall.name, args: functionCall.args },
                text: "Ação de agenda interceptada e processada via UI."
            });
        }

        const textResponse = response.candidates?.[0]?.content?.parts?.[0]?.text || "Sem resposta do núcleo.";
        return NextResponse.json({ text: textResponse });

    } catch (error: any) {
        console.error("Erro na API Neural:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}