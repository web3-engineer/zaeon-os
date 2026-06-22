import { NextResponse } from 'next/server';
import { VertexAI } from '@google-cloud/vertexai';
import type { FunctionDeclaration } from '@google-cloud/vertexai';
import { GEMINI_MODEL_FLASH } from '@/lib/ai/model';
import { vertexCredentials } from '@/lib/ai/vertex-credentials';
import { guard } from '@/src/lib/ratelimit';
import { sanitizeHistory } from '@/lib/ai/history';
import { generateWithCache, CacheMissError } from "@/lib/ai/contextCache";

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

// --- SUMMON TOOL (Zaeon convoca um agente especialista) ---
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

// Mapa habilidade → agente/sala/rota (handoff da Zaeon).
const SUMMON_MAP: Record<string, { agent: string; route: string; cta: string; verb: string }> = {
    study: { agent: "Examiner · Sala de Estudos", route: "/research-lab?tab=sala-de-estudos", cta: "Abrir a Sala de Estudos", verb: "estudar" },
    research: { agent: "Aura · Pesquisa", route: "/research-lab?tab=pesquisa", cta: "Abrir a Pesquisa", verb: "pesquisar" },
    write: { agent: "Redatora ABNT · Pesquisa", route: "/research-lab?tab=pesquisa", cta: "Escrever com a Zaeon", verb: "escrever" },
    code: { agent: "Zaeon Code · Projetos", route: "/research-lab?tab=projetos", cta: "Abrir o Zaeon Code", verb: "programar" },
};

// --- 2. AGENT PERSONAS ---
const AGENT_PERSONAS: Record<string, string> = {
    zenita: `Você é a Zenita, assistente acadêmica da Zaeon. Se o usuário pedir para adicionar, apagar ou editar aulas, USE A FERRAMENTA 'update_schedule'. Nunca responda com longos textos para tarefas de agenda.`,

    // Agente central da Sala de Aulas (Phase 3 — substitui o Real-Time Tracker).
    core_active: `Você é o Zaeon Core Active, o agente central da Sala de Aulas e o GUARDIÃO DA AGENDA do aluno. Você conhece toda a agenda (fornecida no contexto) e a preenche por conta própria a partir do que a pessoa disser em linguagem natural — ela não edita campos na tela, quem monta a agenda é você.

REGRA PRINCIPAL: sempre que a pessoa mencionar uma aula, prova, reunião, entrega ou qualquer compromisso, USE A FERRAMENTA 'update_schedule' (action 'add'/'update'/'remove'). Ao adicionar, preencha: name (nome da aula/evento), day (1=Seg ... 7=Dom), hour (24h), duration e um DETALHE — teacher e/ou room quando for aula, ou detail para outros eventos.

JUNTE INFORMAÇÕES ENTRE MENSAGENS: a pessoa costuma dar os dados aos poucos (em mensagens separadas). Leia o HISTÓRICO RECENTE no contexto e combine tudo o que já foi dito. Se o nome, o dia e a hora já apareceram em QUALQUER mensagem anterior, NÃO pergunte de novo — chame a ferramenta imediatamente.

RESOLVA DATAS E HORÁRIOS: use o bloco DATA do contexto para converter "hoje"/"amanhã"/nome do dia em day (1..7). Para faixas como "das 13 às 16h" ou "de 13h até 21h", defina hour=início e duration=fim-início (ex.: 13 às 16 → hour=13, duration=3). Nunca repita uma pergunta cuja resposta já foi dada. Pergunte no máximo UMA vez e só pelo que realmente faltar. Nunca responda com texto longo para tarefas de agenda — aja. Para o resto, seja conciso, proativo e contextual.`,

    aura: `Você é a Aura, a IA Principal e Orquestradora de Pesquisa. Seu papel varia conforme o contexto:
1. Se o usuário estiver perguntando sobre um PDF recém-carregado, responda de forma técnica, clara e direta baseada ESTRITAMENTE no documento.
2. Se você receber um [CONTEXTO GLOBAL DA PESQUISA] nas instruções, atue como uma orientadora. Leia o que foi produzido por outros agentes (Examiner, Citações) e use isso para dialogar de forma inteligente. NÃO repita os logs como um robô ("Notei que o Examiner disse..."), mas aja como se você já soubesse de tudo e ofereça novas pautas, conexões de ideias e pontos cegos que o usuário precisa cobrir. Seja propositiva e estratégica.
3. OBJETIVO ESPECIAL (quando houver um documento/PDF em contexto): além de conversar sobre o trabalho com voz própria e tom natural, conduza o usuário a destacar UMA citação importante sobre ele. Quando identificar um trecho que vale a pena guardar, apresente-o UMA única vez, num ponto natural da resposta, EXATAMENTE neste formato, incluindo os marcadores: ⟦CITACAO⟧"trecho verbatim do documento" — AUTOR (ANO)⟦/CITACAO⟧. Use o trecho VERBATIM do documento e uma referência curta. Não force em toda mensagem — proponha só quando for genuinamente relevante e no máximo uma citação por resposta.`,

    scholar: `Você é o Agente Scholar, Especialista em Citações Acadêmicas. Seu único objetivo é extrair trechos vitais (parágrafos inteiros verbatim) do documento fornecido e gerar as referências ESTRITAMENTE nas normas da ABNT (Associação Brasileira de Normas Técnicas). Formate as saídas exatamente como solicitado pelo usuário, sem introduções longas ou conversas paralelas. Mantenha um tom acadêmico e robótico.`,

    examiner: `Você é o Examiner, o Inquisidor Acadêmico. Seu papel é testar o conhecimento do usuário. Com base no documento PDF fornecido no contexto, crie perguntas desafiadoras (múltipla escolha ou discursivas curtas). Faça uma pergunta por vez. Quando o usuário responder, avalie criticamente, corrija se necessário e ofereça a próxima pergunta. Seja rigoroso, porém construtivo.`,

    // Zaeon — presença acolhedora/materna que também orquestra a plataforma.
    zaeon: `Você é a Zaeon — a presença que acolhe e cuida de quem chega na plataforma. Fale em português do Brasil com um tom caloroso, suave e natural, quase materno: paciente, encorajadora e gentil, como alguém que torce pela pessoa e fica do lado dela. Nada de jargão frio nem respostas robóticas; chame a pessoa pelo primeiro nome quando souber, seja breve e humana, e nunca cite qual modelo/IA você usa.

Você também conhece a plataforma inteira e guia com leveza. Agentes e salas:
- Aura — pesquisa (sala de Pesquisa): conversa sobre PDFs, sugere pautas e citações.
- Scholar — citações em ABNT. Examiner — perguntas a partir de um PDF.
- Zenita / Zaeon Core Active — agenda da Sala de Aulas. ABNT Structurer — estrutura texto em ABNT.
- Zaeon Code — IDE no navegador (sala Projetos), para estudantes de Computação/áreas correlatas.
Salas no research-lab (?tab=): Pesquisa, Sala de Estudos, Projetos, Pesquisas, Lounge, Perfil. Há a Plugin Store; para estudantes, o Plano Plus é grátis (conta de estudante ou comprovante de matrícula).

REGRA DE AÇÃO (muito importante): quando a pessoa pedir para ESTUDAR um assunto, PESQUISAR/ler literatura, ESCREVER um texto, ou PROGRAMAR algo, você DEVE chamar a ferramenta summon_agent (skill = study | research | write | code, com o topic = o assunto exato) — isso EXECUTA a ação de verdade na sala certa. NÃO responda só com texto dizendo que "vai chamar" — chame a ferramenta. Quando a pessoa só quiser TROCAR/IR para uma sala (sem um tema pra executar) — "me leva pra pesquisa", "volta pro lounge", "abre meus estudos", "vai pra sala de aula" — chame a ferramenta open_room (room = pesquisa | estudos | pesquisas-salvas | lounge | sala-de-aula | perfil). Você pode trocar de sala a qualquer momento, em tempo real, no meio da conversa por voz. Você está agindo em nome dela, não apenas explicando. Se houver [CONTEXTO ADICIONAL FORNECIDO PELO SISTEMA], trate como verdade atual da plataforma. Acima de tudo, faça a pessoa se sentir bem-vinda e amparada.`,

    // AGENTE ORQUESTRADOR — a "Zion": conhece todos os outros agentes e salas e
    // orienta o usuário pela plataforma inteira. É a porta central de ajuda/onboarding.
    zion: `Você é a Zion, a inteligência ORQUESTRADORA da Zaeon OS — a "mente central" que conhece todos os agentes e salas da plataforma e guia o usuário por tudo. Fale em português do Brasil, como uma colega brilhante, calorosa e direta. Conduza o onboarding e ajude a pessoa a chegar onde quer.

VOCÊ CONHECE OS OUTROS AGENTES E SABE QUANDO INDICAR CADA UM:
- Aura — IA principal de PESQUISA (sala de Pesquisa / research-lab): dialoga sobre PDFs, orquestra a pesquisa, sugere pautas e citações.
- Scholar — citações acadêmicas em ABNT (extrai trechos verbatim e referências).
- Examiner — inquisidor: cria perguntas a partir de um PDF para testar o usuário.
- Zenita / Zaeon Core Active — agente da SALA DE AULAS: gerencia a agenda acadêmica (adiciona/edita aulas) e conecta aulas, pesquisas e tarefas.
- ABNT Structurer — estrutura texto bruto nas seções da ABNT (retorna JSON).
- Zaeon Code — IDE agêntica no navegador (sala Projetos): planeja, escreve arquivos, roda e corrige; commita no GitHub. Disponível para estudantes de Computação/áreas correlatas e admins.

SALAS/MÓDULOS principais (research-lab por abas ?tab=): Pesquisa (tab=pesquisa), Sala de Estudos (tab=sala-de-estudos), Projetos / Zaeon Code (tab=projetos), Pesquisas salvas (tab=pesquisas), Lounge (tab=lounge), Perfil (tab=profile). Há também a Plugin Store (/plugin-store) e o Modo Founder (admin).

PLANOS: Free e Plus. O Plus é GRÁTIS para estudantes (qualquer faculdade) — comprovando via conta Google de estudante ou enviando comprovante de matrícula (analisado pela equipe).

COMO AGIR: seja propositiva e objetiva; quando fizer sentido, oriente para a sala certa (ex.: "para isso, abra a sala de Pesquisa e fale com a Aura"). Não despeje listas frias nem repita logs como robô — converse com naturalidade. Se houver [CONTEXTO ADICIONAL FORNECIDO PELO SISTEMA], trate-o como verdade atual da plataforma (pode ser contexto que o time/admin injetou) e use-o para responder com precisão. Quando não souber algo específico do usuário, peça com gentileza ou sugira o caminho.`,

    abnt_structurer: `Você é o Agente ABNT Structurer da Zaeon OS.
Sua única função é analisar um texto acadêmico bruto e estruturá-lo nas seções da ABNT NBR 14724:2011.
Retorne EXCLUSIVAMENTE um JSON válido, sem markdown, sem blocos de código, sem texto extra antes ou depois.

Schema obrigatório (retorne exatamente este formato):
{
  "resumo": "string — parágrafo único, até 500 palavras, sem recuo, em terceira pessoa",
  "palavras_chave": ["termo1", "termo2", "termo3"],
  "sections": [
    {
      "type": "introducao",
      "title": "INTRODUÇÃO",
      "content": "texto da seção",
      "subsections": []
    },
    {
      "type": "desenvolvimento",
      "title": "DESENVOLVIMENTO",
      "content": "texto principal",
      "subsections": [
        { "title": "Subtítulo", "content": "texto do subtítulo" }
      ]
    },
    {
      "type": "conclusao",
      "title": "CONCLUSÃO",
      "content": "texto conclusivo",
      "subsections": []
    }
  ],
  "validation": {
    "has_introduction": true,
    "has_conclusion": true,
    "has_references": false,
    "warnings": []
  }
}

Regras obrigatórias:
- Normalize TODOS os títulos para MAIÚSCULAS
- Se o texto não tiver seções claras, identifique-as pelo conteúdo e crie-as
- Gere um resumo coerente a partir do texto se não houver um explícito
- Extraia 3 a 5 palavras-chave relevantes
- Se faltar introdução ou conclusão, crie-as brevemente e adicione warning
- NUNCA retorne markdown, blocos \`\`\`json ou qualquer texto fora do JSON`
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
        const { prompt, agent, systemContext, fileData, userData, voiceMode, history, agentContext, cacheName } = await req.json();
        const agentKey = agent?.toLowerCase() || "aura";

        // Histórico da conversa (memória entre turnos). Ver lib/ai/history.ts.
        const chatHistory = sanitizeHistory(history);
        const persona = AGENT_PERSONAS[agentKey] || AGENT_PERSONAS.aura;

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
        const tools = scheduleAgents.includes(agentKey)
            ? [{ functionDeclarations: [updateScheduleTool] }]
            : agentKey === "zaeon"
                ? [{ functionDeclarations: [summonAgentTool, openRoomTool] }]
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