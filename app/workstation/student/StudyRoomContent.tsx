"use client";

import RostoDaAba from "@/components/agents/avatar/RostoDaAba";
import {
    useState, useRef, useLayoutEffect, useEffect, useMemo, Suspense,
} from "react";
import dynamic from "next/dynamic";
import { Triangle } from "lucide-react";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Users, BookOpen, GraduationCap,
    FlaskConical, Newspaper, User, Lock, Microscope,
} from "lucide-react";
import { isSuperAdminEmail } from "@/lib/auth/roles";
import { unifiedResearchRoom } from "@/lib/research/unifiedRoom";
import { blueprintUiOn } from "@/lib/blueprint/tipos";
import { reaBlueprintUiOn } from "@/lib/rea-blueprint/tipos";
import { EVT_ESTUDOS_VISTA } from "@/lib/onboarding/tutorialLab";
import { EVT_ESTUDOS_CHAT, EVT_PEDIDO_CONVERSA, EVT_ESTUDOS_IR, anunciarAbaEstudos, consumirAbaEstudos, type AbaEstudos } from "@/lib/chat/conversasNav";
import { EVT_ABRIR_CURSO, type CursoAberto } from "@/lib/forja/abrirCurso";
import { OmegaScholarProvider } from "./omega/OmegaScholarContext";
import OmegaScholarWorkspace from "./omega/OmegaScholarWorkspace";
import StudyRoomSuggestionDock from "./omega/StudyRoomSuggestionDock";

// ─── ROOM MAPPING ────────────────────────────────────────────────────────────
const ROOM_MAPPING: Record<string, string[]> = {
    cyber: [
        "Ciência da Computação", "Engenharia de Software", "Sistemas de Informação",
        "Análise e Desenvolvimento de Sistemas", "Engenharia da Computação",
        "Redes de Computadores", "Segurança da Informação / Cibersegurança",
        "Banco de Dados", "Inteligência Artificial", "Ciência de Dados",
        "Computação em Nuvem", "Internet das Coisas", "Robótica",
        "Jogos Digitais", "Design Digital / UX / UI",
        "Computer Science", "Software Engineering",
    ],
    med: [
        "Medicina", "Enfermagem", "Odontologia", "Farmácia", "Fisioterapia",
        "Nutrição", "Psicologia", "Fonoaudiologia", "Terapia Ocupacional",
        "Biomedicina", "Educação Física",
    ],
    bio: [
        "Ciências Biológicas", "Biologia", "Biotecnologia",
        "Bioquímica", "Bioinformática", "Ecologia",
    ],
    quantic: [
        "Matemática", "Matemática Aplicada", "Estatística", "Física",
        "Astronomia", "Astrofísica", "Geofísica", "Meteorologia",
    ],
    humanities: [
        "História", "Geografia", "Filosofia", "Sociologia", "Antropologia",
        "Ciência Política", "Relações Internacionais", "Letras", "Linguística",
        "Pedagogia", "Artes", "Música", "Teatro", "Dança", "Cinema e Audiovisual",
        "Arquivologia", "Biblioteconomia", "Museologia", "Serviço Social",
        "Comunicação Social", "Jornalismo", "Publicidade e Propaganda",
        "Editoração", "Produção Cultural", "Direito", "Teologia",
    ],
};

function getRoomForCourse(course?: string): string {
    if (!course) return "lounge";
    for (const [room, courses] of Object.entries(ROOM_MAPPING)) {
        if (courses.some(c => c.toLowerCase() === course.toLowerCase())) return room;
    }
    return "lounge";
}

// ─── ROOM METADATA ───────────────────────────────────────────────────────────
const ROOM_META: Record<string, {
    name: string;
    color: string;
    accent: string;      // for the indicator bar color
    gradient: string;
    glow: string;
}> = {
    cyber:      { name: "Cyber Room",    color: "text-cyan-600 dark:text-cyan-400",       accent: "bg-cyan-400/40 dark:bg-cyan-400/30",       gradient: "from-cyan-500/15 to-blue-500/5",      glow: "bg-cyan-400/10" },
    med:        { name: "MedLab",        color: "text-rose-600 dark:text-rose-400",        accent: "bg-rose-400/40 dark:bg-rose-400/30",        gradient: "from-rose-500/15 to-pink-500/5",       glow: "bg-rose-400/10" },
    bio:        { name: "Bio Room",      color: "text-emerald-600 dark:text-emerald-400",  accent: "bg-emerald-400/40 dark:bg-emerald-400/30",  gradient: "from-emerald-500/15 to-green-500/5",   glow: "bg-emerald-400/10" },
    quantic:    { name: "Quantic Room",  color: "text-blue-600 dark:text-blue-400",        accent: "bg-blue-400/40 dark:bg-blue-400/30",        gradient: "from-blue-500/15 to-indigo-500/5",     glow: "bg-blue-400/10" },
    humanities: { name: "Grand Archive", color: "text-amber-600 dark:text-amber-400",      accent: "bg-amber-400/40 dark:bg-amber-400/30",      gradient: "from-amber-500/15 to-orange-500/5",    glow: "bg-amber-400/10" },
    lounge:     { name: "Lounge",        color: "text-violet-600 dark:text-violet-400",    accent: "bg-violet-400/40 dark:bg-violet-400/30",    gradient: "from-violet-500/15 to-purple-500/5",   glow: "bg-violet-400/10" },
};

// ─── TAB DEFINITIONS ─────────────────────────────────────────────────────────
// Submódulos da Sala de Estudos: só Estudos / Aulas (mesmo conjunto para todas as
// salas). Provas e Projetos saíram daqui. Pesquisas/Notícias/Perfil vivem na
// sidebar da Sala de Pesquisa, não aqui.
const SALA_TABS = [
    { id: "community",  label: "Estudos",   icon: Users    },
    { id: "classes",    label: "Aulas",     icon: BookOpen },
];
const ROOM_TABS: Record<string, Array<{ id: string; label: string; icon: React.ComponentType<any> }>> = {
    cyber: SALA_TABS, med: SALA_TABS, bio: SALA_TABS,
    quantic: SALA_TABS, humanities: SALA_TABS, lounge: SALA_TABS,
};

// ─── DYNAMIC COMPONENTS ──────────────────────────────────────────────────────
const DYNAMIC_COMPONENTS: Record<string, Record<string, React.ComponentType<any>>> = {
    cyber: {
        community:  dynamic(() => import("@/app/study-rooms/cyber/main-hall/community/page")),
        classes:    dynamic(() => import("@/app/study-rooms/cyber/main-hall/classes/page")),
        exams:      dynamic(() => import("@/app/study-rooms/cyber/main-hall/exams/page")),
        projects:   dynamic(() => import("@/app/study-rooms/cyber/main-hall/projects/page")),
        researches: dynamic(() => import("@/app/study-rooms/cyber/main-hall/researches/page")),
        profile:    dynamic(() => import("@/app/study-rooms/cyber/main-hall/profile/page")),
    },
    med: {
        community:  dynamic(() => import("@/app/study-rooms/med/community/page")),
        classes:    dynamic(() => import("@/app/study-rooms/med/classes/page")),
        exams:      dynamic(() => import("@/app/study-rooms/med/exams/page")),
        projects:   dynamic(() => import("@/app/study-rooms/med/projects/page")),
        researches: dynamic(() => import("@/app/study-rooms/med/researches/page")),
        news:       dynamic(() => import("@/app/study-rooms/med/news/page")),
        profile:    dynamic(() => import("@/app/study-rooms/med/profile/page")),
    },
    bio: {
        community:  dynamic(() => import("@/app/study-rooms/bio/main-room/community/page")),
        classes:    dynamic(() => import("@/app/study-rooms/bio/main-room/classes/page")),
        exams:      dynamic(() => import("@/app/study-rooms/bio/main-room/exams/page")),
        projects:   dynamic(() => import("@/app/study-rooms/bio/main-room/projects/page")),
        researches: dynamic(() => import("@/app/study-rooms/bio/main-room/researches/page")),
        news:       dynamic(() => import("@/app/study-rooms/bio/main-room/news/page")),
        profile:    dynamic(() => import("@/app/study-rooms/bio/main-room/profile/page")),
    },
    quantic: {
        community:  dynamic(() => import("@/app/study-rooms/quantic/community/page")),
        classes:    dynamic(() => import("@/app/study-rooms/quantic/classes/page")),
        exams:      dynamic(() => import("@/app/study-rooms/quantic/exams/page")),
        projects:   dynamic(() => import("@/app/study-rooms/quantic/projects/page")),
        researches: dynamic(() => import("@/app/study-rooms/quantic/researches/page")),
        news:       dynamic(() => import("@/app/study-rooms/quantic/news/page")),
        profile:    dynamic(() => import("@/app/study-rooms/quantic/profile/page")),
    },
    humanities: {
        community:  dynamic(() => import("@/app/study-rooms/humanities/community/page")),
        classes:    dynamic(() => import("@/app/study-rooms/humanities/classes/page")),
        exams:      dynamic(() => import("@/app/study-rooms/humanities/exams/page")),
        projects:   dynamic(() => import("@/app/study-rooms/humanities/projects/page")),
        researches: dynamic(() => import("@/app/study-rooms/humanities/researches/page")),
        news:       dynamic(() => import("@/app/study-rooms/humanities/news/page")),
        profile:    dynamic(() => import("@/app/study-rooms/humanities/profile/page")),
    },
    lounge: {
        community:  dynamic(() => import("@/app/study-rooms/lounge/main-lounge/community/page")),
        classes:    dynamic(() => import("@/app/study-rooms/lounge/main-lounge/classes/page")),
        exams:      dynamic(() => import("@/app/study-rooms/lounge/main-lounge/exams/page")),
        projects:   dynamic(() => import("@/app/study-rooms/lounge/main-lounge/projects/page")),
        researches: dynamic(() => import("@/app/study-rooms/lounge/main-lounge/researches/page")),
        news:       dynamic(() => import("@/app/study-rooms/lounge/main-lounge/news/page")),
        profile:    dynamic(() => import("@/app/study-rooms/lounge/main-lounge/profile/page")),
    },
};

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function TabLoader() {
    return (
        <div className="flex items-center justify-center h-64">
            <motion.span
                animate={{ opacity: [0.3, 0.8, 0.3] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="text-sm text-slate-400 dark:text-white/30 font-medium"
            >
                Carregando...
            </motion.span>
        </div>
    );
}

function NoRoomFound() {
    return (
        <div className="flex flex-col items-center justify-center h-64 gap-4 p-8">
            <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center">
                <Lock className="w-7 h-7 text-slate-300 dark:text-white/20" />
            </div>
            <div className="text-center max-w-sm">
                <h3 className="text-base font-bold text-slate-700 dark:text-white/80 mb-1">Sala não encontrada</h3>
                <p className="text-xs text-slate-400 dark:text-white/30 leading-relaxed">
                    Complete o seu perfil para acessar a sala correta para o seu curso.
                </p>
            </div>
        </div>
    );
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────
// ⚠️ MERGE base×main: o PR01 (co-working StudyCoworkChat) e o main (feed MeusEstudosFeed +
// painel do professor) trouxeram abas/nomes diferentes p/ "Meus Estudos". Mantidos os DOIS —
// CONFERIR a composição/rótulos das abas + QA de runtime antes de mergear na base.
const StudyCoworkChat = dynamic(() => import("@/components/study/StudyCoworkChat"), { ssr: false });
const MeusEstudosFeed = dynamic(() => import("@/components/study/MeusEstudosFeed"), { ssr: false });
// "Meus Estudos" voltou a ser o BOARD (o canvas colaborativo, estética de blueprint — lib/estudos/board); o caderno
// de blocos (MeusEstudosFeed) segue abrindo por um botão no canto do board (os estudos antigos não se perdem)
const BoardEstudos = dynamic(() => import("@/components/estudos/BoardEstudos"), { ssr: false });
// "Estudos" abre na VITRINE de blueprints (lib/estudos/vitrine); a busca na literatura (o Omega) fica a um clique
const VitrineEstudos = dynamic(() => import("@/components/estudos/VitrineEstudos"), { ssr: false });
// BLUEPRINT PRÁTICO (lib/blueprint, flag NEXT_PUBLIC_BLUEPRINT_PRATICO): a "Sala de Estudos" vira o blueprint dos estudos
// nascidos no chat; o board livre e o caderno antigo só abrem pelos links que já existem (?board=, ?space=)
const SalaBlueprint = dynamic(() => import("@/components/blueprint/SalaBlueprint"), { ssr: false });
const SalaRea = dynamic(() => import("@/components/rea/SalaRea"), { ssr: false });
const SalaCurso = dynamic(() => import("@/components/study/SalaCurso"), { ssr: false });
const MeusAlunosPanel = dynamic(() => import("@/app/workstation/student/MeusAlunosPanel"), { ssr: false });

/**
 * `unified` (flag UNIFIED_RESEARCH_ROOM): a SALA DE ESTUDOS = Chat (co-working "Aura",
 * StudyCoworkChat — objetivo, sem fonte obrigatória) · Meus Estudos (caderno + biblioteca) ·
 * Estudos (Omega). O chat de Pesquisa mora na Sala de Pesquisa. Com a flag ligada, "Aulas" e
 * "Meus Alunos" somem em qualquer lugar (inclusive na workstation).
 *
 * `abasNaSidebar` (o laboratório): SEM as pills do topo — "Meus Estudos" e "Estudos" ficam na sidebar principal, sob
 * "Sala de Estudos" (lib/chat/conversasNav: a sala anuncia a aba, a sidebar pede outra).
 */
export default function StudyRoomContent({ flushTop = false, unified = false, abasNaSidebar = false }: { flushTop?: boolean; unified?: boolean; abasNaSidebar?: boolean } = {}) {
    const { data: session } = useSession();

    const course = (session?.user as any)?.course as string | undefined;
    const room   = getRoomForCourse(course);
    const meta   = ROOM_META[room] ?? ROOM_META["lounge"];
    const tabs   = ROOM_TABS[room] ?? [];
    const isTeacher =
        (session?.user as any)?.role === "teacher" ||
        (session?.user as any)?.role === "professor" ||
        !!(session?.user as any)?.isAdmin ||
        isSuperAdminEmail((session?.user as any)?.email);
    // "Meus Estudos" (feed mini-Notion) é a aba padrão (main); "Meus Alunos" só pro professor (isTeacher).
    // ⚠️ MERGE base×main: a aba "Aura" (co-working / chat) do PR01 vinha primeiro — CONFERIR se ela
    // ainda entra na composição das abas abaixo (QA de runtime).
    // A sala É o chat (as conversas ficam na sidebar principal, embaixo de "Sala de Estudos"). As
    // abas do topo são só os dois lugares de ESTUDO: "Meus Estudos" (o caderno/feed) e "Estudos"
    // (a busca). Sem aba "Chat"/"Aura", sem Aulas/Meus Alunos aqui. `meus-estudos` segue sendo o id
    // interno da CONVERSA (é o que fica ativo quando nenhuma das duas abas está).
    const allTabs = useMemo(() => [
        { id: "feed", label: "Sala de Estudos", icon: BookOpen },
        ...(reaBlueprintUiOn() ? [{ id: "rea", label: "Engenharia reversa", icon: Microscope }] : []),
        { id: "community", label: "Marketplace", icon: Users },
        // a busca na LITERATURA (o Omega) saiu do toggle da vitrine e virou aba própria
        { id: "literatura", label: "Literatura", icon: FlaskConical },
    ], []);

    // Padrão = a aba "Aura" (chats/co-working). Só cai numa aba de estudo/pesquisa se
    // o usuário SAIU da sala estando nela — restaurado da persistência no efeito abaixo.
    const [activeTab, setActiveTab] = useState("meus-estudos");

    // Persistência de aba por sala. Inicia no default estável "meus-estudos" (sem
    // hydration mismatch), depois restaura a última aba usada; e salva a cada troca.
    const tabRestored = useRef(false);
    useEffect(() => {
        if (!room) return;
        try {
            // a 1ª vez do TABLET (lib/ui/loungeHub `LAB_TABLET_PRIMEIRA`): abre no CHAT, não na última aba salva
            if (new URLSearchParams(window.location.search).get("estudo") === "chat") { setActiveTab("meus-estudos"); tabRestored.current = true; return; }
            const saved = localStorage.getItem(`zaeon:lastTab:${room}`);
            if (saved && (saved === "meus-estudos" || allTabs.some((t) => t.id === saved))) setActiveTab(saved);
            const pedida = consumirAbaEstudos();   // a sidebar pediu uma aba antes da sala montar
            if (pedida) setActiveTab(pedida);
        } catch { /* ignore */ }
        tabRestored.current = true;
    }, [room, allTabs]);
    useEffect(() => {
        if (!tabRestored.current || !room) return;
        try { localStorage.setItem(`zaeon:lastTab:${room}`, activeTab); } catch { /* ignore */ }
    }, [activeTab, room]);
    // a sidebar destaca a aba em que a sala está, e pede outra pelos subitens de "Sala de Estudos"
    useEffect(() => {
        if (activeTab === "meus-estudos" || activeTab === "feed" || activeTab === "community") anunciarAbaEstudos(activeTab);
    }, [activeTab]);
    useEffect(() => {
        const ir = (e: Event) => { const a = (e as CustomEvent<AbaEstudos>).detail; consumirAbaEstudos(); if (a) setActiveTab(a); };
        window.addEventListener(EVT_ESTUDOS_IR, ir);
        return () => window.removeEventListener(EVT_ESTUDOS_IR, ir);
    }, []);

    // CURSO DE CÓDIGO: abre na ÁREA PRÓPRIA (aba "curso", tela cheia) — não no chat, não no feed.
    // forja:* e skill:* de código disparam abrirCurso (lib/forja/abrirCurso) e caem aqui.
    const [cursoAtivo, setCursoAtivo] = useState<CursoAberto | null>(null);
    useEffect(() => {
        const onCurso = (e: Event) => {
            const d = (e as CustomEvent<CursoAberto>).detail;
            if (d?.cursoId) { setCursoAtivo(d); setActiveTab("curso"); }
        };
        window.addEventListener(EVT_ABRIR_CURSO, onCurso);
        return () => window.removeEventListener(EVT_ABRIR_CURSO, onCurso);
    }, []);

    // o BOARD de Meus Estudos aberto por um link de convite (?board=<id>&convite=<token>) e o caderno antigo por cima
    const [boardDoLink, setBoardDoLink] = useState<{ id: string | null; convite: string | null }>({ id: null, convite: null });
    const [cadernoAberto, setCadernoAberto] = useState(false);
    const [pranchaAntiga, setPranchaAntiga] = useState(false);
    // o tutorial do tablet abre direto na pesquisa — a literatura é ABA PRÓPRIA agora (vitrine = Marketplace)
    useEffect(() => {
        const f = (e: Event) => { const v = (e as CustomEvent<"vitrine" | "pesquisar">).detail; if (v === "pesquisar") setActiveTab("literatura"); else if (v === "vitrine") setActiveTab("community"); };
        window.addEventListener(EVT_ESTUDOS_VISTA, f);
        return () => window.removeEventListener(EVT_ESTUDOS_VISTA, f);
    }, []);
    useEffect(() => {
        try {
            const sp = new URLSearchParams(window.location.search), id = sp.get("board");
            if (id && /^[a-f0-9]{24}$/i.test(id)) { setBoardDoLink({ id, convite: sp.get("convite") }); setPranchaAntiga(true); setActiveTab("feed"); }
            if (sp.get("space")) { setCadernoAberto(true); setPranchaAntiga(true); }   // (o link de um estudo do caderno antigo)
        } catch { /* ignore */ }
    }, []);

    // Deep-link do menu inicial: ?space=<id> → abre direto em "Meus Estudos"
    // (o MeusEstudosFeed resolve qual estudo carregar pelo mesmo param). Sem isso,
    // clicar num estudo no menu caía na aba "Estudos" genérica, não no estudo.
    useEffect(() => {
        try {
            if (new URLSearchParams(window.location.search).get("space")) {
                setActiveTab("feed");
            }
        } catch { /* ignore */ }
    }, []);

    // "Estudar esse tema" / handoff de voz pode pedir a aba Meus Estudos em runtime.
    // Aceita set-subtab (legado) E set-tab (tour) — só para os ids de aba DESTA sala
    // (community/classes/meus-estudos/students); ids do research-lab são ignorados aqui.
    useEffect(() => {
        const SALA_IDS = new Set(["meus-estudos", "feed", "community"]);
        // "meus-estudos" é a conversa; o tour/legado que pede "Meus Estudos" quer o feed.
        const onSetSub = (e: any) => { const d = e?.detail; if (SALA_IDS.has(d)) setActiveTab(d === "meus-estudos" ? "feed" : d); };
        // Conversa escolhida na sidebar principal (ou "Nova conversa") → a sala volta pra conversa.
        const paraChat = () => setActiveTab("meus-estudos");
        const onPedido = (e: Event) => { if ((e as CustomEvent).detail?.sala === "estudos") paraChat(); };
        window.addEventListener("zaeon:set-subtab", onSetSub);
        window.addEventListener("zaeon:set-tab", onSetSub);
        window.addEventListener(EVT_ESTUDOS_CHAT, paraChat);
        window.addEventListener(EVT_PEDIDO_CONVERSA, onPedido);
        return () => {
            window.removeEventListener("zaeon:set-subtab", onSetSub); window.removeEventListener("zaeon:set-tab", onSetSub);
            window.removeEventListener(EVT_ESTUDOS_CHAT, paraChat); window.removeEventListener(EVT_PEDIDO_CONVERSA, onPedido);
        };
    }, []);

    // ── Tab indicator measurement ────────────────────────────────────────────
    // We track each tab button's position to drive an animated underline
    // that "locks" the content card to whichever tab is active.
    const tabHeaderRef = useRef<HTMLDivElement>(null);  // the relative-positioned wrapper
    const tabRefs      = useRef<(HTMLButtonElement | null)[]>([]);
    const [indicator, setIndicator] = useState({ left: 0, width: 60 });
    const [ready, setReady] = useState(false);

    const measureIndicator = () => {
        const idx     = allTabs.findIndex(t => t.id === activeTab);
        const el      = tabRefs.current[idx];
        const header  = tabHeaderRef.current;
        if (idx < 0) { setReady(false); return; }   // na conversa: nenhuma aba acesa
        if (!el || !header) return;

        const elRect     = el.getBoundingClientRect();
        const headerRect = header.getBoundingClientRect();

        setIndicator({
            left:  elRect.left - headerRect.left,
            width: elRect.width,
        });
        setReady(true);
    };

    // Run after paint so refs are populated
    useLayoutEffect(() => { measureIndicator(); }, [activeTab, allTabs]);

    // Also re-measure on window resize
    useEffect(() => {
        window.addEventListener("resize", measureIndicator);
        return () => window.removeEventListener("resize", measureIndicator);
    }, [activeTab, allTabs]);

    const ActiveComponent = DYNAMIC_COMPONENTS[room]?.[activeTab];

    return (
        <OmegaScholarProvider room={room}>
        <div className="flex flex-col h-full">

            {/* ── DOCK DE SUGESTÃO CONTEXTUAL (aparece em termo acadêmico) ── */}
            <StudyRoomSuggestionDock />

            {/* ── MAIN CARD: TABS + CONTENT ───────────────────────────── */}
            {/*
                The tab bar lives INSIDE this card so the indicator bar sits
                directly on the card's top edge — creating the "puzzle piece"
                visual: switching a tab slides the indicator along the card
                top border, clearly signalling which section is active.
            */}
            <div className={`flex-1 ${flushTop ? "mx-0 mt-3 mb-0" : "mx-6 mt-4 mb-6"} flex flex-col rounded-[2rem] overflow-hidden bg-white/50 dark:bg-slate-950/40 backdrop-blur-3xl border border-white/40 dark:border-white/10 shadow-2xl min-h-0`}>

                {/* Tab bar header (no laboratório as abas moram na sidebar — sem pills aqui) */}
                {!abasNaSidebar && (
                <div ref={tabHeaderRef} className="relative flex-shrink-0 z-10 bg-white/50 dark:bg-slate-950/40">

                    {/* Tab buttons row */}
                    <div className="flex overflow-x-auto no-scrollbar px-3 pt-3 gap-0.5">
                        {allTabs.map((tab, i) => {
                            const isActive = activeTab === tab.id;

                            // A aba "Aura" (co-working) é a PILL DO AGENTE: ⟁ + nome ao lado,
                            // nome destacado. Vive aqui na barra, ao lado de "Aulas".
                            if (tab.id === "meus-estudos") {
                                return (
                                    <button
                                        key={tab.id}
                                        ref={el => { tabRefs.current[i] = el; }}
                                        onClick={() => setActiveTab(tab.id)}
                                        aria-label={`Agente ativo: ${tab.label}`}
                                        className={`
                                            relative flex items-center gap-1.5 pl-2 pr-3.5 py-1.5 rounded-[13px] border
                                            font-tech whitespace-nowrap transition-all duration-150
                                            ${isActive
                                                ? "bg-gradient-to-b from-cyan-100 to-violet-100 text-slate-900 border-cyan-300 shadow-[0_8px_18px_-8px_rgba(34,211,238,0.55)] dark:from-cyan-400/20 dark:to-violet-500/15 dark:text-white dark:border-cyan-300/30 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_8px_20px_-8px_rgba(34,211,238,0.7)]"
                                                : "bg-white text-slate-700 border-slate-200 shadow-sm hover:border-cyan-300 hover:bg-cyan-50/60 dark:bg-white/[0.04] dark:text-white/70 dark:border-white/10 dark:shadow-none dark:hover:bg-white/[0.07]"
                                            }
                                        `}
                                    >
                                        {/* a bolinha da aba É a Aura — espelha o chat de qualquer aba (pensa/fala/sorri) */}
                                        <RostoDaAba agentId="aura" nome="Aura" ativa={isActive} size={24}>
                                            <span
                                                className="w-6 h-6 shrink-0 flex items-center justify-center text-[15px] leading-none text-cyan-600 dark:text-cyan-300"
                                                style={{ filter: "drop-shadow(0 0 5px rgba(34,211,238,0.55))" }}
                                            >⟁</span>
                                        </RostoDaAba>
                                        <span className="text-[13px] font-bold tracking-[0.02em]">{tab.label}</span>
                                    </button>
                                );
                            }

                            return (
                                <button
                                    key={tab.id}
                                    data-tour={`tab-${tab.id}`}
                                    ref={el => { tabRefs.current[i] = el; }}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`
                                        relative flex items-center gap-1.5 px-3.5 py-2.5 rounded-[12px] border
                                        text-[11px] font-semibold whitespace-nowrap
                                        transition-all duration-150
                                        ${isActive
                                            ? "bg-gradient-to-b from-violet-200 to-violet-100 text-violet-800 border-violet-300 shadow-[0_8px_18px_-8px_rgba(139,92,246,0.5)] dark:from-white/20 dark:to-white/[0.05] dark:text-white dark:border-white/25 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.42),0_8px_18px_-8px_rgba(139,92,246,0.8)]"
                                            : "bg-white text-slate-600 border-slate-200 shadow-sm hover:text-violet-700 hover:border-violet-300 hover:bg-violet-50 dark:bg-white/[0.04] dark:text-white/45 dark:border-white/10 dark:shadow-none dark:hover:text-white/70 dark:hover:bg-white/[0.07]"
                                        }
                                    `}
                                >
                                    {tab.label}
                                </button>
                            );
                        })}
                    </div>

                    {/*
                        ── THE CONNECTOR ──────────────────────────────────────────
                        A spring-animated bar that glides along the bottom of the
                        tab header, aligned exactly with the active tab.
                        Below it sits the content card — the bar acts as the
                        "dovetail" connecting the selected tab to the content area.
                    */}
                    <div className="h-[1px] mt-1 mx-3 bg-black/[0.04] dark:bg-white/[0.06] relative">
                        {ready && (
                            <motion.div
                                className={`absolute top-0 h-[2px] rounded-full ${meta.accent}`}
                                animate={{ left: indicator.left - 12, width: indicator.width }}
                                // -12 accounts for px-3 (12px) padding on the tab row
                                transition={{ type: "spring", stiffness: 520, damping: 38, mass: 0.4 }}
                            />
                        )}
                    </div>
                </div>
                )}

                {/*
                    ── CONTENT AREA ────────────────────────────────────────────
                    KEY FIX: transform: translateZ(0) makes this element the
                    containing block for any position:fixed descendants (like
                    the community globe's "fixed inset-0" canvas). Without this,
                    the canvas escapes to the viewport and blocks all UI above.
                    The absolute inner div handles scrolling within the clipped area.
                */}
                <div
                    className="flex-1 min-h-0 relative overflow-hidden"
                    style={{ transform: "translateZ(0)" }}
                >
                    <div className="absolute inset-0 overflow-y-auto" style={{ isolation: "isolate" }}>
                        {/* "Meus Estudos" = CO-WORKING: chat estilo Claude com a Aura +
                            biblioteca de artefatos à direita. Fica SEMPRE montado (só escondido)
                            → a conversa e qualquer geração NÃO resetam ao trocar de aba.
                            O editor completo de um estudo abre num modal a partir daqui.
                            A aba "Estudos" (community) permanece intocada. */}
                        <div className={activeTab === "meus-estudos" ? "h-full" : "hidden"}>
                            <StudyCoworkChat active={activeTab === "meus-estudos"} />
                        </div>
                        {activeTab === "curso" && cursoAtivo ? (
                            // ÁREA PRÓPRIA do curso de código (board graphify + base de conhecimento), tela cheia
                            <div className="relative h-full"><SalaCurso cursoId={cursoAtivo.cursoId} titulo={cursoAtivo.titulo} onFechar={() => setActiveTab("community")} /></div>
                        ) : activeTab === "rea" && reaBlueprintUiOn() ? (
                            <div className="relative h-full"><SalaRea /></div>
                        ) : activeTab === "feed" ? (
                            // a Sala de Estudos = os BLUEPRINTS. A prancha antiga e o caderno antigo saíram do menu (pedido do
                            // dono, 23/10) — só abrem pelos links que já existem (convite ?board=, estudo ?space=)
                            blueprintUiOn() && !pranchaAntiga ? (
                                <div className="relative h-full">
                                    <SalaBlueprint />
                                </div>
                            ) : (
                            <div className="relative h-full">
                                {cadernoAberto ? <MeusEstudosFeed /> : <BoardEstudos boardInicialId={boardDoLink.id} convite={boardDoLink.convite} />}
                                {blueprintUiOn() && (
                                    <div className="absolute bottom-3 left-1/2 z-[95] flex -translate-x-1/2 gap-2">
                                        <button type="button" onClick={() => { setPranchaAntiga(false); setCadernoAberto(false); }} className="rounded-full border border-sky-300/30 bg-[#05162a]/85 px-3 py-1 font-mono text-[10.5px] tracking-wide text-sky-100/80 backdrop-blur hover:text-white">← blueprints</button>
                                    </div>
                                )}
                            </div>
                            )
                        ) : activeTab === "meus-estudos" ? null : activeTab === "community" ? (
                            <div className="relative h-full"><VitrineEstudos /></div>
                        ) : activeTab === "literatura" ? (
                            // a busca na LITERATURA (o Omega) — aba própria da Sala de Estudos
                            <div className="relative h-full"><OmegaScholarWorkspace /></div>
                        ) : activeTab === "students" ? (
                            <MeusAlunosPanel />
                        ) : activeTab === "classes" && isTeacher ? (
                            // Professor: a MESMA Sala de Aula (chat + livraria + relógio) e, ABAIXO,
                            // o canvas vivo de criação de aula (Parte B1 + D) — não um form pobre.
                            <div className="min-h-full">
                                {ActiveComponent ? (
                                    <Suspense fallback={<TabLoader />}><ActiveComponent /></Suspense>
                                ) : <NoRoomFound />}
                                <div className="border-t border-white/10 mt-2">
                                    <div className="px-5 pt-4 pb-1">
                                        <h3 className="text-sm font-black uppercase tracking-[0.16em] text-white/70">Criar aula</h3>
                                        <p className="text-[12px] text-white/40">Monte a aula como um estudo: blocos, menu “/” e Studio. Toque no ＋ pra começar uma nova.</p>
                                    </div>
                                    <div className="h-[88vh]">
                                        <MeusEstudosFeed mode="teach" />
                                    </div>
                                </div>
                            </div>
                        ) : !ActiveComponent ? (
                            <NoRoomFound />
                        ) : (
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={`${room}-${activeTab}`}
                                    initial={{ opacity: 0, y: 5 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -5 }}
                                    transition={{ duration: 0.16, ease: "easeOut" }}
                                    className="h-full"
                                >
                                    <Suspense fallback={<TabLoader />}>
                                        <ActiveComponent />
                                    </Suspense>
                                </motion.div>
                            </AnimatePresence>
                        )}
                    </div>
                </div>
            </div>
        </div>
        </OmegaScholarProvider>
    );
}
