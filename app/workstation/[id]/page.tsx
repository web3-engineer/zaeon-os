"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
    ChevronRightIcon, BeakerIcon, CpuChipIcon, SparklesIcon,
    ArrowPathIcon, ChartBarIcon, BookOpenIcon,
    EyeIcon, LockClosedIcon, AcademicCapIcon, PencilSquareIcon, UserGroupIcon as CollabIcon, HandRaisedIcon,
    ArrowLeftIcon, UserPlusIcon, PaperAirplaneIcon, CheckIcon, XMarkIcon
} from "@heroicons/react/24/outline";

import NetworkMural from "@/app/workstation/profiles/NetworkMural";
import { temaDoCurso, VISUAL_TEMA, type TemaDeArea } from "@/lib/rooms/temas";

// Temas (nome, cor, rota, cursos): fonte única em lib/rooms/temas.ts. Só o ÍCONE mora aqui.
const ICONE_TEMA: Record<TemaDeArea, React.ComponentType<{ className?: string }>> = {
    cyber: CpuChipIcon, med: ChartBarIcon, bio: BeakerIcon, quantic: SparklesIcon, humanities: BookOpenIcon,
};
const detalhesDaSala = (id: TemaDeArea) => {
    const v = VISUAL_TEMA[id];
    return { id, name: v.nome, icon: ICONE_TEMA[id], color: v.cor, bg: v.bg, border: v.borda, route: v.rota };
};

const DEFAULT_SKILLS = [
    { id: "writing", name: "Academic Writing", icon: PencilSquareIcon, rank: "F", current: 0, next: 50, metricName: "Papers", locked: false },
    { id: "focus", name: "Deep Focus", icon: EyeIcon, rank: "F", current: 0, next: 50, metricName: "Hours", locked: false },
    { id: "collab", name: "Collective Synergy", icon: CollabIcon, rank: "F", current: 0, next: 10, metricName: "Projects", locked: false },
    { id: "participation", name: "Participation", icon: HandRaisedIcon, rank: "F", current: 0, next: 5, metricName: "Validations", locked: true, note: "Teacher Controlled" }
];

const AnimatedBlueGlobe = () => (
    <motion.div animate={{ rotate: 360 }} transition={{ duration: 15, repeat: Infinity, ease: "linear" }} className="w-10 h-10 rounded-full bg-blue-900/40 border border-cyan-400/50 flex items-center justify-center shadow-[0_0_15px_rgba(34,211,238,0.2)] shrink-0">
        <div className="w-5 h-5 rounded-full bg-blue-600/60 flex items-center justify-center">
            <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }} transition={{ duration: 2, repeat: Infinity }} className="w-2 h-2 bg-cyan-300 rounded-full" />
        </div>
    </motion.div>
);

const MiniAnimatedDNA = ({ theme }: { theme: any }) => (
    <motion.div animate={{ opacity: [0.8, 1, 0.8], scale: [0.98, 1.02, 0.98] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }} className="w-10 h-12 flex flex-col items-center justify-around z-10 shrink-0" style={{ perspective: "1000px" }}>
        {[...Array(4)].map((_, i) => (
            <motion.div key={i} className="relative w-8 h-[2px] flex items-center justify-between" animate={{ rotateY: [0, 360] }} transition={{ duration: 8, repeat: Infinity, ease: "linear", delay: i * 0.15 }}>
                <div className={`w-1.5 h-1.5 rounded-full ${theme.dnaColor1}`} />
                <div className={`flex-1 h-[1.5px] bg-gradient-to-r ${theme.dnaGradient}`} />
                <div className={`w-1.5 h-1.5 rounded-full ${theme.dnaColor2}`} />
            </motion.div>
        ))}
    </motion.div>
);

const RealisticDNA = ({ theme }: { theme: any }) => (
    <motion.div animate={{ opacity: [0.8, 1, 0.8], scale: [0.98, 1.02, 0.98] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }} className="absolute inset-0 flex flex-col items-center justify-around py-4 z-10" style={{ perspective: "1000px" }}>
        {[...Array(30)].map((_, i) => (
            <motion.div key={i} className="relative w-16 h-[3px] flex items-center justify-between" animate={{ rotateY: [0, 360] }} transition={{ duration: 8, repeat: Infinity, ease: "linear", delay: i * 0.15 }}>
                <div className={`w-3 h-3 rounded-full ${theme.dnaColor1}`} />
                <div className={`flex-1 h-[2px] bg-gradient-to-r ${theme.dnaGradient}`} />
                <div className={`w-3 h-3 rounded-full ${theme.dnaColor2}`} />
            </motion.div>
        ))}
    </motion.div>
);

const SkillDrawer = ({ skill, isOpen, onToggle, theme }: any) => {
    const progressPercent = Math.min((skill.current / skill.next) * 100, 100);
    return (
        <div className="relative z-40 group/drawer flex items-center">
            <div className={`w-6 h-[2px] ${theme.accentMuted}`} />
            <motion.button onClick={onToggle} className={`relative w-9 h-9 flex items-center justify-center border rounded-full transition-all z-50 shadow-md backdrop-blur-md hover:scale-110 ${skill.locked ? `border-white/20 opacity-70 ${theme.cardBg}` : `${theme.cardBorder} ${theme.cardBg}`}`}>
                <skill.icon className={`w-4 h-4 ${skill.locked ? 'text-slate-400' : theme.skillIconFill}`} />
            </motion.button>
            <AnimatePresence>
                {isOpen && (
                    <motion.div initial={{ x: -20, opacity: 0, scale: 0.8 }} animate={{ x: 10, opacity: 1, scale: 1 }} exit={{ x: -10, opacity: 0, scale: 0.8 }} transition={{ type: "spring", stiffness: 300, damping: 20 }} className={`absolute left-full ml-2 w-56 border p-4 rounded-2xl shadow-xl backdrop-blur-2xl z-50 ${theme.cardBg} ${theme.cardBorder}`}>
                        <div className="flex justify-between items-start mb-3">
                            <div className="flex flex-col">
                                <span className={`text-[10px] font-black uppercase tracking-widest ${theme.skillTitle}`}>{skill.name}</span>
                                <span className={`text-xs font-black mt-1 ${theme.textStrong}`}>Rank {skill.rank}</span>
                            </div>
                            {skill.locked && <LockClosedIcon className="w-4 h-4 text-slate-400" />}
                        </div>
                        <div className="flex justify-between items-end mb-1.5">
                            <span className="text-[9px] uppercase font-bold text-slate-400 dark:text-white/40 tracking-widest">Progress</span>
                            <span className={`text-[10px] font-mono font-bold ${theme.textStrong}`}>{skill.current} / {skill.next} <span className="text-[8px] uppercase">{skill.metricName}</span></span>
                        </div>
                        <div className="w-full h-2 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden shadow-inner">
                            <motion.div initial={{ width: 0 }} animate={{ width: `${progressPercent}%` }} className={`h-full ${skill.locked ? 'bg-emerald-500/50' : `${theme.skillFill} shadow-[0_0_10px_rgba(255,255,255,0.4)]`}`} />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

// 🔥 COMPONENTE DE SOLICITAÇÃO REAL: ISOLADO E MINIMALISTA (AGORA ABAIXO DAS SALAS) 🔥
const NetworkConnectionsPanel = ({ visitedUserId, currentUserId, theme }: { visitedUserId?: string, currentUserId?: string, theme: any }) => {
    const [requestState, setRequestState] = useState<0 | 1 | 2 | 3 | 4>(0);
    const [requestText, setRequestText] = useState("");
    const [isLoading, setIsLoading] = useState(true);

    const isOwnProfile = visitedUserId === currentUserId;

    useEffect(() => {
        if (!visitedUserId || isOwnProfile) {
            setIsLoading(false);
            return;
        }

        fetch(`/api/network/request?targetId=${visitedUserId}`)
            .then(res => res.json())
            .then(data => {
                if (data.status === 'PENDING') setRequestState(2);
                else if (data.status === 'REJECTED') setRequestState(3);
                else if (data.status === 'ACCEPTED') setRequestState(4);
                else setRequestState(0);
                setIsLoading(false);
            })
            .catch(() => setIsLoading(false));
    }, [visitedUserId, currentUserId, isOwnProfile]);

    const handleSendRequest = async () => {
        if (!requestText.trim()) return;
        setRequestState(2); // UI Otimista
        await fetch('/api/network/request', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ targetId: visitedUserId, message: requestText })
        });
    };

    if (isLoading) return <div className="h-10 w-32 bg-slate-200 dark:bg-white/10 rounded-full animate-pulse mt-6" />;

    return (
        <div className="flex flex-col items-end gap-2 mt-8 z-40 relative w-full">
            <AnimatePresence mode="wait">

                {/* 🛑 SE FOR O PRÓPRIO PERFIL: MOSTRA UM BOTÃO DESATIVADO 🛑 */}
                {isOwnProfile && (
                    <motion.div
                        key="btn-self"
                        initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-full border border-slate-400/30 dark:border-white/10 bg-slate-300/20 dark:bg-white/5 text-slate-500 dark:text-white/40 cursor-not-allowed`}
                    >
                        <UserPlusIcon className="w-4 h-4" />
                        <span className="text-[10px] font-black uppercase tracking-widest drop-shadow-sm">Este é Você</span>
                    </motion.div>
                )}

                {/* ESTADO 0: BOTÃO DESTACADO E ELEGANTE */}
                {!isOwnProfile && requestState === 0 && (
                    <motion.button
                        key="btn-request"
                        initial={{ opacity: 0, scale: 0.9, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }}
                        onClick={() => setRequestState(1)}
                        // 🔥 GRADIENTE PODEROSO BASEADO NO TEMA E SOMBRA SUAVE 🔥
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-white bg-gradient-to-r ${theme.dnaGradient} shadow-[0_8px_20px_rgba(0,0,0,0.15)] dark:shadow-[0_8px_20px_rgba(255,255,255,0.05)] hover:shadow-[0_8px_25px_rgba(0,0,0,0.2)] transition-all hover:-translate-y-1 border-none`}
                    >
                        <UserPlusIcon className="w-4 h-4" />
                        <span className="text-[10px] font-black uppercase tracking-widest drop-shadow-md">Conectar</span>
                    </motion.button>
                )}

                {/* ESTADO 1: FORMULÁRIO DE ENVIO COMPACTO */}
                {!isOwnProfile && requestState === 1 && (
                    <motion.div
                        key="form-request"
                        initial={{ opacity: 0, height: 0, y: 10 }} animate={{ opacity: 1, height: 'auto', y: 0 }} exit={{ opacity: 0, height: 0 }}
                        className={`flex flex-col gap-2 p-4 rounded-3xl border backdrop-blur-2xl bg-white/60 dark:bg-black/40 w-72 shadow-2xl ${theme.cardBorder}`}
                    >
                        <textarea
                            autoFocus
                            value={requestText}
                            onChange={(e) => setRequestText(e.target.value)}
                            placeholder="Envie uma mensagem curta..."
                            className={`w-full h-16 bg-white/50 dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-xl p-3 text-[11px] focus:outline-none focus:border-cyan-400 resize-none ${theme.textStrong} placeholder:opacity-50`}
                        />
                        <div className="flex justify-between items-center mt-2">
                            <button onClick={() => setRequestState(0)} className="text-[9px] uppercase font-bold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors px-2">Cancelar</button>
                            <button
                                disabled={!requestText.trim()}
                                onClick={handleSendRequest}
                                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-white bg-gradient-to-r ${theme.dnaGradient} shadow-md transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed`}
                            >
                                <PaperAirplaneIcon className="w-3.5 h-3.5" />
                                <span className="text-[9px] font-black uppercase tracking-widest">Enviar</span>
                            </button>
                        </div>
                    </motion.div>
                )}

                {/* ESTADO 2: ENVIADO */}
                {!isOwnProfile && requestState === 2 && (
                    <motion.div key="btn-sent" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex items-center gap-1.5 px-5 py-2.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shadow-[0_5px_15px_rgba(52,211,153,0.15)]">
                        <CheckIcon className="w-4 h-4" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Solicitação Enviada</span>
                    </motion.div>
                )}

                {/* ESTADO 3: REJEITADO */}
                {!isOwnProfile && requestState === 3 && (
                    <motion.div key="btn-rejected" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex items-center gap-1.5 px-5 py-2.5 rounded-full border border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400 shadow-[0_5px_15px_rgba(248,113,113,0.15)]">
                        <XMarkIcon className="w-4 h-4" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Conexão Recusada</span>
                    </motion.div>
                )}

                {/* ESTADO 4: CONECTADO */}
                {!isOwnProfile && requestState === 4 && (
                    <motion.div key="btn-accepted" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex items-center gap-1.5 px-5 py-2.5 rounded-full border border-cyan-500/30 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 shadow-[0_5px_15px_rgba(34,211,238,0.2)]">
                        <CheckIcon className="w-4 h-4" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Conexão Estabelecida</span>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default function VisitedWorkStationPage({ params }: { params: { id: string } }) {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [mounted, setMounted] = useState(false);

    const [visitedUser, setVisitedUser] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [activeSkill, setActiveSkill] = useState<string | null>(null);

    const visitedUserId = params.id;
    // @ts-ignore
    const currentUserId = session?.user?.id || "";

    useEffect(() => { setMounted(true); }, []);

    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const res = await fetch(`/api/user/profile/${visitedUserId}`);
                if (res.ok) {
                    const data = await res.json();
                    setVisitedUser(data);
                } else {
                    router.push('/workstation');
                }
            } catch (error) {
                console.error("Erro ao carregar perfil:", error);
            } finally {
                setIsLoading(false);
            }
        };

        if (status === "authenticated") fetchUserData();
    }, [visitedUserId, status, router]);

    if (!mounted || status === "loading" || isLoading) {
        return (
            <div className={`w-full h-screen flex flex-col items-center justify-center z-[999] bg-[#030014]`}>
                <ArrowPathIcon className={`w-8 h-8 animate-spin mb-4 text-cyan-400`} />
                <span className={`text-[10px] font-black uppercase tracking-[0.3em] animate-pulse text-cyan-400`}>
                    Conectando ao Agente...
                </span>
            </div>
        );
    }

    if (status === "unauthenticated") { router.replace("/"); return null; }
    if (!visitedUser) return null;

    const userCourse = visitedUser.course || "";
    const academicLevel = visitedUser.academicLevel || "Graduação";
    const userGender = visitedUser.gender || "unspecified";
    const userImage = visitedUser.image || "/assets/default-avatar.png";

    const getTargetRoom = (): TemaDeArea | null => {
        if (visitedUser.kycStatus === "rejected") return null;
        return temaDoCurso(userCourse);
    };

    const targetRoomKey = getTargetRoom();
    const targetRoom = targetRoomKey ? detalhesDaSala(targetRoomKey) : null;

    const getTheme = () => {
        const isFemale = userGender.toLowerCase() === "feminino" || userGender.toLowerCase() === "female";
        const isMale = userGender.toLowerCase() === "masculino" || userGender.toLowerCase() === "male";

        if (isFemale) {
            return {
                pageBg: "bg-pink-50/80 dark:bg-[#1a0a13]", matrixOpacity: "opacity-40", capsuleBorder: "border-pink-500/20",
                capsuleIconFill: "text-blue-600 dark:text-cyan-400", cardBg: "bg-white/10 dark:bg-pink-900/5", cardBorder: "border-pink-200/50 dark:border-pink-500/20",
                panelWrapper: "bg-pink-950/20 backdrop-blur-2xl border border-pink-500/20", highlightCard: "border-pink-500/30 bg-pink-950/20 hover:bg-pink-900/40 shadow-inner",
                textStrong: "text-pink-950 dark:text-white", textMuted: "text-pink-800/70 dark:text-pink-200/50", textHighlight: "text-white drop-shadow-[0_0_10px_rgba(255,182,193,0.8)]",
                textAccent: "text-rose-500 dark:text-rose-400", skillIconFill: "text-blue-500 dark:text-cyan-400", skillTitle: "text-blue-600 dark:text-cyan-400",
                skillFill: "bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.6)]", accentMuted: "bg-pink-400/30 dark:bg-pink-500/30", dnaColor1: "bg-rose-400 shadow-[0_0_15px_#f472b6]",
                dnaColor2: "bg-fuchsia-400 shadow-[0_0_15px_#e879f9]", dnaGradient: "from-rose-500/50 to-fuchsia-400/50",
            };
        }

        if (isMale) {
            return {
                pageBg: "bg-blue-50/80 dark:bg-[#050a1f]", matrixOpacity: "opacity-60", capsuleBorder: "border-blue-400/50 dark:border-white/10",
                capsuleIconFill: "text-blue-600 dark:text-cyan-400", cardBg: "bg-transparent", cardBorder: "border-blue-200/50 dark:border-blue-500/20",
                panelWrapper: "bg-blue-950/40 backdrop-blur-2xl border border-blue-500/20", highlightCard: "border-blue-400/30 bg-blue-800/20 hover:bg-blue-700/40 shadow-inner",
                textStrong: "text-blue-950 dark:text-white", textMuted: "text-blue-800/70 dark:text-blue-200/50", textHighlight: "text-white drop-shadow-[0_0_12px_rgba(34,211,238,1)]",
                textAccent: "text-blue-600 dark:text-cyan-400", skillIconFill: "text-blue-500 dark:text-cyan-400", skillTitle: "text-blue-600 dark:text-cyan-400",
                skillFill: "bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.6)]", accentMuted: "bg-blue-400/30 dark:bg-blue-500/30", dnaColor1: "bg-blue-500 shadow-[0_0_15px_#3b82f6]",
                dnaColor2: "bg-cyan-400 shadow-[0_0_15px_#22d3ee]", dnaGradient: "from-blue-500 to-cyan-400",
            };
        }

        return {
            pageBg: "bg-slate-200/30 dark:bg-[#030014]", matrixOpacity: "opacity-60", capsuleBorder: "border-slate-400/50 dark:border-white/20",
            capsuleIconFill: "text-blue-600 dark:text-cyan-400", cardBg: "bg-transparent", cardBorder: "border-white/60 dark:border-white/10",
            panelWrapper: "bg-slate-900/40 backdrop-blur-2xl border border-white/10", highlightCard: "border-white/20 bg-white/10 hover:bg-white/20 shadow-inner",
            textStrong: "text-slate-900 dark:text-white", textMuted: "text-slate-600 dark:text-white/50", textHighlight: "text-white drop-shadow-[0_0_12px_rgba(255,255,255,1)]",
            textAccent: "text-cyan-600 dark:text-cyan-400", skillIconFill: "text-blue-600 dark:text-cyan-400", skillTitle: "text-blue-600 dark:text-cyan-400",
            skillFill: "bg-cyan-500", accentMuted: "bg-slate-400/50 dark:bg-cyan-500/50", dnaColor1: "bg-cyan-400 shadow-[0_0_15px_#22d3ee]",
            dnaColor2: "bg-blue-500 shadow-[0_0_15px_#3b82f6]", dnaGradient: "from-cyan-400 to-blue-500",
        };
    };

    const theme = getTheme();
    const cardBaseStyle = `relative overflow-hidden transition-all duration-300 border shrink-0 ${theme.cardBorder}`;

    return (
        <div className={`w-full min-h-screen overflow-x-hidden overflow-y-auto custom-scrollbar relative transition-colors duration-1000 font-mono pb-20 ${theme.pageBg}`}>


            <div className="fixed top-24 left-8 z-[100]">
                <button onClick={() => router.push('/workstation')} className="flex items-center gap-2 px-4 py-2 bg-white/80 dark:bg-black/40 border border-slate-300 dark:border-white/10 backdrop-blur-md rounded-full text-slate-700 dark:text-white/70 hover:text-black dark:hover:text-white hover:bg-white dark:hover:bg-black/60 transition-all shadow-lg">
                    <ArrowLeftIcon className="w-4 h-4" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Sair do Espectador</span>
                </button>
            </div>

            <div className="w-full flex flex-col items-center justify-start relative z-20 pt-24 px-8">

                <div className="w-full max-w-[1400px] grid grid-cols-1 lg:grid-cols-12 gap-12 mb-12">

                    <div className="lg:col-span-6 relative flex flex-col items-start pl-4 lg:pl-10 mt-16 lg:mt-24">

                        <div className="relative flex items-start">
                            <div className={`relative w-[180px] h-[500px] rounded-[100px] border-[3px] backdrop-blur-3xl flex flex-col items-center justify-center z-20 py-10 shadow-[0_0_50px_rgba(255,255,255,0.05)] ${theme.capsuleBorder}`}>
                                <RealisticDNA theme={theme} />

                                <motion.div animate={{ y: [-8, 8, -8] }} transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }} className="relative z-30">
                                    <div className={`relative block w-28 h-28 rounded-full border-4 p-1 shadow-[0_0_30px_rgba(255,255,255,0.2)] bg-black border-cyan-400/50`}>
                                        <Image src={userImage} alt="Avatar" fill className="object-cover rounded-full" />
                                    </div>
                                </motion.div>
                            </div>

                            <div className="absolute left-[100%] top-8 flex flex-col gap-6 z-10 w-full min-w-[250px]">
                                {/* 🔥 NOME EM CIMA DO LEVEL 🔥 */}
                                <div className="flex flex-col mb-2 pl-6">
                                    <span className={`text-3xl font-black tracking-tighter drop-shadow-md ${theme.textStrong}`}>
                                        {visitedUser.name || "Unknown"}
                                    </span>
                                </div>

                                <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.3 }} className="relative flex items-center">
                                    <div className={`w-6 h-[2px] ${theme.accentMuted}`} />
                                    <div className={`border px-5 py-3 rounded-2xl backdrop-blur-md shadow-xl flex items-center gap-3 bg-white/40 dark:bg-black/20 ${theme.cardBorder}`}>
                                        <AcademicCapIcon className={`w-6 h-6 ${theme.capsuleIconFill}`} />
                                        <div>
                                            <div className={`text-[8px] uppercase font-black tracking-widest ${theme.textMuted}`}>Level</div>
                                            <div className={`text-xs font-bold uppercase ${theme.textStrong}`}>{academicLevel}</div>
                                        </div>
                                    </div>
                                </motion.div>

                                <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.5 }} className="relative flex flex-col items-start mt-4">
                                    <div className="flex items-center">
                                        <div className={`w-10 h-[2px] ${theme.accentMuted}`} />
                                        <div className={`border px-5 py-3 rounded-2xl backdrop-blur-md shadow-xl flex items-center gap-3 relative z-20 bg-white/40 dark:bg-black/20 ${theme.cardBorder}`}>
                                            <BookOpenIcon className={`w-6 h-6 ${theme.capsuleIconFill}`} />
                                            <div>
                                                <div className={`text-[8px] uppercase font-black tracking-widest ${theme.textMuted}`}>Curso</div>
                                                <div className={`text-xs font-bold uppercase truncate max-w-[180px] ${theme.textStrong}`}>{userCourse || "Undeclared"}</div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className={`flex flex-col gap-4 mt-4 ml-16 relative z-10 border-l-[2px] pl-4 py-2 ${theme.cardBorder}`}>
                                        {DEFAULT_SKILLS.map((skill) => (
                                            <SkillDrawer key={skill.id} skill={skill} isOpen={activeSkill === skill.id} onToggle={() => setActiveSkill(activeSkill === skill.id ? null : skill.id)} theme={theme} />
                                        ))}
                                    </div>
                                </motion.div>
                            </div>
                        </div>
                    </div>

                    <div className="lg:col-span-6 flex flex-col justify-center items-center lg:items-end gap-0 z-30 w-full max-w-[450px] mx-auto pb-10">

                        {/* PAINEL DE SALAS DE ESTUDO */}
                        <div className={`w-full p-8 rounded-[40px] flex flex-col gap-6 ${theme.panelWrapper}`}>
                            <div onClick={() => router.push('/study-rooms/lounge')} className={cardBaseStyle + ` ${theme.highlightCard} p-5 rounded-3xl hover:scale-[1.02] cursor-pointer`}>
                                <div className="flex justify-between items-center gap-4">
                                    <div className="flex items-center gap-4">
                                        <AnimatedBlueGlobe />
                                        <h2 className={`text-xl font-black uppercase tracking-tight ${theme.textHighlight}`}>Lounge</h2>
                                    </div>
                                    <ChevronRightIcon className={`w-5 h-5 transition-all ${theme.textHighlight} group-hover:translate-x-1`} />
                                </div>
                            </div>

                            {targetRoom && (
                                <div onClick={() => router.push(targetRoom.route)} className={cardBaseStyle + ` ${theme.highlightCard} p-5 rounded-3xl hover:scale-[1.02] cursor-pointer`}>
                                    <div className="flex justify-between items-center gap-4">
                                        <div className="flex items-center gap-4">
                                            <MiniAnimatedDNA theme={theme} />
                                            <h2 className={`text-xl font-black uppercase tracking-tight ${theme.textHighlight}`}>Sala de {userCourse}</h2>
                                        </div>
                                        <ChevronRightIcon className={`w-5 h-5 transition-all ${theme.textHighlight} group-hover:translate-x-1`} />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* 🔥 BOTÃO DE CONEXÃO INDEPENDENTE (AGORA ABAIXO DAS SALAS E DESTACADO) 🔥 */}
                        <NetworkConnectionsPanel visitedUserId={visitedUserId} currentUserId={currentUserId} theme={theme} />

                    </div>
                </div>

                <div className={`w-full max-w-[1400px] border-t mt-8 ${theme.cardBorder}`}>
                    <NetworkMural visitedUserId={visitedUserId} />
                </div>
            </div>
        </div>
    );
}