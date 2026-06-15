"use client";

import {
    useState, useRef, useLayoutEffect, useEffect, useMemo, Suspense,
} from "react";
import dynamic from "next/dynamic";
import { NotebookPen } from "lucide-react";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Users, BookOpen, ClipboardList, FolderOpen,
    FlaskConical, Newspaper, User, Lock,
} from "lucide-react";
import { OmegaScholarProvider } from "./omega/OmegaScholarContext";
import OmegaScholarBar from "./omega/OmegaScholarBar";
import OmegaScholarWorkspace from "./omega/OmegaScholarWorkspace";
import StudyRoomSuggestionDock from "./omega/StudyRoomSuggestionDock";
import { ProFeaturePanel } from "@/components/ui/ProFeaturePanel";

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
// Submódulos da Sala de Estudos: só Estudos / Aulas / Provas / Projetos (mesmo
// conjunto para todas as salas). Pesquisas/Notícias/Perfil vivem na sidebar da
// Sala de Pesquisa, não aqui. Projetos é bloqueado por nível Pro (ver render).
const SALA_TABS = [
    { id: "community",  label: "Estudos",   icon: Users         },
    { id: "classes",    label: "Aulas",     icon: BookOpen      },
    { id: "exams",      label: "Provas",    icon: ClipboardList },
    { id: "projects",   label: "Projetos",  icon: FolderOpen    },
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
const MeusEstudosFeed = dynamic(() => import("@/components/study/MeusEstudosFeed"), { ssr: false });

export default function StudyRoomContent({ flushTop = false }: { flushTop?: boolean } = {}) {
    const { data: session } = useSession();

    const course = (session?.user as any)?.course as string | undefined;
    const room   = getRoomForCourse(course);
    const meta   = ROOM_META[room] ?? ROOM_META["lounge"];
    const tabs   = ROOM_TABS[room] ?? [];
    // "Meus Estudos" (feed mini-Notion) é a aba padrão, injetada antes das demais.
    const allTabs = useMemo(() => [
        { id: "meus-estudos", label: "Meus Estudos", icon: NotebookPen },
        ...tabs,
    ], [tabs]);

    // Padrão = a aba de pesquisa/estudos (onde a pesquisa acontece). "Meus Estudos"
    // fica disponível, mas não rouba o lugar da pesquisa.
    const [activeTab, setActiveTab] = useState(tabs[0]?.id ?? "community");

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

            {/* ── OMEGA SCHOLAR BAR (replaces the old ROOM HEADER) ───── */}
            <OmegaScholarBar flushTop={flushTop} onOpenResults={() => setActiveTab("community")} />

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

                {/* Tab bar header */}
                <div ref={tabHeaderRef} className="relative flex-shrink-0 z-10 bg-white/50 dark:bg-slate-950/40">

                    {/* Tab buttons row */}
                    <div className="flex overflow-x-auto no-scrollbar px-3 pt-3 gap-0.5">
                        {allTabs.map((tab, i) => {
                            const isActive = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    ref={el => { tabRefs.current[i] = el; }}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`
                                        relative flex items-center gap-1.5 px-3.5 py-2.5 rounded-[12px] border
                                        text-[11px] font-semibold whitespace-nowrap
                                        transition-all duration-150
                                        ${isActive
                                            ? "bg-gradient-to-b from-violet-100 to-violet-50 text-violet-700 border-violet-200 shadow-[0_8px_18px_-8px_rgba(139,92,246,0.45)] dark:from-white/20 dark:to-white/[0.05] dark:text-white dark:border-white/25 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.42),0_8px_18px_-8px_rgba(139,92,246,0.8)]"
                                            : "text-slate-500 dark:text-white/40 border-transparent hover:text-slate-700 dark:hover:text-white/70 hover:bg-black/[0.03] dark:hover:bg-white/[0.06]"
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
                        {activeTab === "meus-estudos" ? (
                            <MeusEstudosFeed />
                        ) : activeTab === "community" ? (
                            <OmegaScholarWorkspace />
                        ) : activeTab === "projects" ? (
                            <ProFeaturePanel
                                title="Projetos"
                                description="Ferramenta de projetos colaborativos — disponível apenas no plano Pro."
                                tooltip="Ferramenta Pro — em breve"
                            />
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
