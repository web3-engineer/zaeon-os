"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation"; // <-- Adicionado usePathname
import { useSession } from "next-auth/react";
import {
    ChevronRightIcon, BeakerIcon, CpuChipIcon, SparklesIcon,
    ArrowPathIcon, ChartBarIcon, BookOpenIcon, CameraIcon,
    EyeIcon, LockClosedIcon, AcademicCapIcon, PencilSquareIcon, UserGroupIcon as CollabIcon, HandRaisedIcon, UserPlusIcon, PaperAirplaneIcon, XMarkIcon, CheckIcon
} from "@heroicons/react/24/outline";
import StarBackground from "@/components/main/star-background";

import NetworkMural from "@/app/workstation/profiles/NetworkMural";

const ROOM_MAPPING: Record<string, string[]> = {
    cyber: ["Ciência da Computação", "Engenharia de Software", "Sistemas de Informação", "Análise e Desenvolvimento de Sistemas", "Engenharia da Computação", "Redes de Computadores", "Segurança da Informação / Cibersegurança", "Banco de Dados", "Inteligência Artificial", "Ciência de Dados", "Computação em Nuvem", "Internet das Coisas", "Robótica", "Jogos Digitais", "Design Digital / UX / UI", "Computer Science", "Software Engineering"],
    med: ["Medicina", "Enfermagem", "Odontologia", "Farmácia", "Fisioterapia", "Nutrição", "Psicologia", "Fonoaudiologia", "Terapia Ocupacional", "Biomedicina", "Educação Física"],
    bio: ["Ciências Biológicas", "Biologia", "Biotecnologia", "Bioquímica", "Bioinformática", "Ecologia"],
    quantic: ["Matemática", "Matemática Aplicada", "Estatística", "Física", "Astronomia", "Astrofísica", "Geofísica", "Meteorologia"],
    humanities: ["História", "Geografia", "Filosofia", "Sociologia", "Antropologia", "Ciência Política", "Relações Internacionais", "Letras", "Linguística", "Pedagogia", "Artes", "Música", "Teatro", "Dança", "Cinema e Audiovisual", "Arquivologia", "Biblioteconomia", "Museologia", "Serviço Social", "Comunicação Social", "Jornalismo", "Publicidade e Propaganda", "Editoração", "Produção Cultural", "Direito", "Teologia"]
};

const ROOM_DETAILS = {
    cyber: { id: "cyber", name: "Cyber Room", icon: CpuChipIcon, color: "text-cyan-600 dark:text-cyan-400", bg: "bg-cyan-50 dark:bg-cyan-500/10", border: "border-cyan-300 dark:border-cyan-500/30", route: "/study-rooms/cyber" },
    med: { id: "med", name: "MedLab", icon: ChartBarIcon, color: "text-rose-600 dark:text-rose-400", bg: "bg-rose-50 dark:bg-rose-500/10", border: "border-rose-300 dark:border-rose-500/30", route: "/study-rooms/med" },
    bio: { id: "bio", name: "Bio Room", icon: BeakerIcon, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-500/10", border: "border-emerald-300 dark:border-emerald-500/30", route: "/study-rooms/bio" },
    quantic: { id: "quantic", name: "Quantic Room", icon: SparklesIcon, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-500/10", border: "border-blue-300 dark:border-blue-500/30", route: "/study-rooms/quantic" },
    humanities: { id: "humanities", name: "Grand Archive", icon: BookOpenIcon, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-500/10", border: "border-amber-300 dark:border-amber-500/30", route: "/study-rooms/humanities" },
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
                            {skill.locked && <LockClosedIcon className="w-4 h-4 text-slate-400" title="Only teachers can inject XP" />}
                        </div>
                        <div className="flex justify-between items-end mb-1.5">
                            <span className="text-[9px] uppercase font-bold text-slate-400 dark:text-white/40 tracking-widest">Progress</span>
                            <span className={`text-[10px] font-mono font-bold ${theme.textStrong}`}>{skill.current} / {skill.next} <span className="text-[8px] uppercase">{skill.metricName}</span></span>
                        </div>
                        <div className="w-full h-2 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden shadow-inner">
                            <motion.div initial={{ width: 0 }} animate={{ width: `${progressPercent}%` }} className={`h-full ${skill.locked ? 'bg-emerald-500/50' : `${theme.skillFill} shadow-[0_0_10px_rgba(255,255,255,0.4)]`}`} />
                        </div>
                        {skill.locked && <p className="text-[8px] text-emerald-600 dark:text-emerald-400 mt-2 uppercase tracking-widest font-bold">{skill.note}</p>}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

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

        const fetchStatus = async () => {
            try {
                const res = await fetch(`/api/network/request?targetId=${visitedUserId}`);
                if (res.ok) {
                    const data = await res.json();
                    if (data.status === 'PENDING') setRequestState(2);
                    else if (data.status === 'REJECTED') setRequestState(3);
                    else if (data.status === 'ACCEPTED') setRequestState(4);
                    else setRequestState(0);
                }
            } catch (error) { console.error(error); }
            finally { setIsLoading(false); }
        };

        fetchStatus();
        const intervalId = setInterval(fetchStatus, 3000);

        return () => clearInterval(intervalId);
    }, [visitedUserId, currentUserId, isOwnProfile]);

    const handleSendRequest = async () => {
        if (!requestText.trim()) return;
        setRequestState(2);
        await fetch('/api/network/request', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ targetId: visitedUserId, message: requestText })
        });
    };

    if (!visitedUserId || isOwnProfile) return null;

    if (isLoading) return <div className="h-8 w-24 bg-slate-200 dark:bg-white/10 rounded-full animate-pulse mt-4" />;

    return (
        <div className="flex flex-col items-center justify-center mt-4 w-full z-40">
            <AnimatePresence mode="wait">
                {requestState === 0 && (
                    <motion.button
                        key="btn-request"
                        initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                        onClick={() => setRequestState(1)}
                        className={`flex items-center gap-2 px-5 py-2 rounded-full text-white shadow-lg transition-all hover:scale-105 hover:shadow-[0_0_20px_rgba(255,255,255,0.3)] bg-gradient-to-r ${theme.dnaGradient}`}
                    >
                        <UserPlusIcon className="w-4 h-4 drop-shadow-md" />
                        <span className="text-[10px] font-black uppercase tracking-widest drop-shadow-md">Conectar</span>
                    </motion.button>
                )}

                {requestState === 1 && (
                    <motion.div
                        key="form-request"
                        initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                        className={`flex flex-col gap-2 p-3 rounded-2xl border backdrop-blur-xl bg-white/70 dark:bg-black/60 w-64 shadow-2xl ${theme.cardBorder}`}
                    >
                        <textarea
                            autoFocus
                            value={requestText}
                            onChange={(e) => setRequestText(e.target.value)}
                            placeholder="Sua mensagem..."
                            className={`w-full h-16 bg-transparent border-b border-slate-300 dark:border-white/10 text-[10px] focus:outline-none resize-none ${theme.textStrong} placeholder:opacity-40`}
                        />
                        <div className="flex justify-between items-center mt-1">
                            <button onClick={() => setRequestState(0)} className="text-[8px] uppercase font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors px-2">Cancelar</button>
                            <button
                                disabled={!requestText.trim()}
                                onClick={handleSendRequest}
                                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-white bg-gradient-to-r ${theme.dnaGradient} shadow-md transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed`}
                            >
                                <PaperAirplaneIcon className="w-3 h-3" />
                                <span className="text-[9px] font-bold uppercase tracking-widest">Enviar</span>
                            </button>
                        </div>
                    </motion.div>
                )}

                {requestState === 2 && (
                    <motion.div key="btn-sent" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex items-center gap-1.5 px-5 py-2 rounded-full border border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shadow-sm">
                        <CheckIcon className="w-4 h-4" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Enviado</span>
                    </motion.div>
                )}

                {requestState === 3 && (
                    <motion.div key="btn-rejected" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex items-center gap-1.5 px-5 py-2 rounded-full border border-red-500/30 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 shadow-sm">
                        <XMarkIcon className="w-4 h-4" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Rejeitado</span>
                    </motion.div>
                )}

                {requestState === 4 && (
                    <motion.div key="btn-accepted" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex items-center gap-1.5 px-5 py-2 rounded-full border border-cyan-500/30 bg-cyan-50 dark:bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.2)]">
                        <CheckIcon className="w-4 h-4" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Conectado</span>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

// 🔥 ADICIONADO: Prop `isEmbedded` para adaptar o visual quando dentro do painel do professor
export default function WorkStationPage({ isEmbedded = false }: { isEmbedded?: boolean }) {
    const { data: session, status, update } = useSession();
    const router = useRouter();
    const pathname = usePathname(); // Adicionado para verificação de rota
    const [mounted, setMounted] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [activeSkill, setActiveSkill] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    const [userSkills, setUserSkills] = useState<typeof DEFAULT_SKILLS>(DEFAULT_SKILLS);
    const [isLoadingSkills, setIsLoadingSkills] = useState(true);

    // 🔥 VERIFICAÇÃO SE É PROFESSOR
    const isTeacher = (session?.user as any)?.role === "teacher" || (session?.user as any)?.role === "professor";

    // @ts-ignore
    const isSuperAdmin = !!session?.user?.isAdmin;
    const userCourse = (session?.user as any)?.course || "";
    const kycStatus = (session?.user as any)?.kycStatus || "pending";
    const academicLevel = (session?.user as any)?.academicLevel || "Graduação";
    const userGender = (session?.user as any)?.gender || "unspecified";
    // @ts-ignore
    const currentUserId = session?.user?.id || "";

    const [userImage, setUserImage] = useState(session?.user?.image || "/assets/default-avatar.png");

    // Redireciona qualquer acesso direto a /workstation para a workstation correta
    useEffect(() => {
        if (isEmbedded || status === "loading" || isSyncing) return;

        if (pathname === '/workstation') {
            if (isTeacher) {
                router.replace('/workstation/teacher/home');
            } else {
                // Alunos e visitantes vão para o perfil na Research Room
                router.replace('/research-lab?tab=profile');
            }
        }
    }, [isTeacher, pathname, isEmbedded, router, status, isSyncing]);

    const getTargetRoom = () => {
        if (kycStatus === "rejected") return null;
        for (const [room, courses] of Object.entries(ROOM_MAPPING)) {
            if (courses.includes(userCourse)) return room as keyof typeof ROOM_DETAILS;
        }
        return null;
    };

    const targetRoomKey = getTargetRoom();
    const targetRoom = targetRoomKey ? ROOM_DETAILS[targetRoomKey] : null;

    const getTheme = () => {
        const isFemale = userGender.toLowerCase() === "feminino" || userGender.toLowerCase() === "female";
        const isMale = userGender.toLowerCase() === "masculino" || userGender.toLowerCase() === "male";
        const isLGBT = userGender.toLowerCase() === "lgbtqi+";

        if (isFemale) {
            return {
                pageBg: "bg-pink-50/80 dark:bg-[#1a0a13]", matrixOpacity: "opacity-40", capsuleBorder: "border-pink-500/20",
                capsuleIconFill: "text-blue-600 dark:text-cyan-400", cardBg: "bg-white/10 dark:bg-pink-900/5", cardBorder: "border-pink-200/50 dark:border-pink-500/20",
                panelWrapper: "bg-pink-950/20 backdrop-blur-2xl border border-pink-500/20 shadow-[0_8px_32px_rgba(236,72,153,0.1)]", highlightCard: "border-pink-500/30 bg-pink-950/20 shadow-pink-500/10",
                textStrong: "text-pink-950 dark:text-white", textMuted: "text-pink-800/70 dark:text-pink-200/50", textHighlight: "text-white drop-shadow-[0_0_10px_rgba(255,182,193,0.8)]",
                textAccent: "text-rose-500 dark:text-rose-400", skillIconFill: "text-blue-500 dark:text-cyan-400", skillTitle: "text-blue-600 dark:text-cyan-400",
                skillFill: "bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.6)]", accentMuted: "bg-pink-400/30 dark:bg-pink-500/30", dnaColor1: "bg-rose-400 shadow-[0_0_15px_#f472b6]",
                dnaColor2: "bg-fuchsia-400 shadow-[0_0_15px_#e879f9]", dnaGradient: "from-rose-500/50 to-fuchsia-400/50",
            };
        }

        if (isMale) {
            return {
                pageBg: "bg-blue-50/80 dark:bg-[#050a1f]", matrixOpacity: "opacity-60",
                capsuleBorder: "border-blue-400/50 dark:border-white/10",
                capsuleIconFill: "text-blue-600 dark:text-cyan-400", cardBg: "bg-transparent", cardBorder: "border-blue-200/50 dark:border-blue-500/20",
                panelWrapper: "bg-blue-950/40 backdrop-blur-2xl border border-blue-500/20 shadow-[0_8px_32px_rgba(59,130,246,0.2)]", highlightCard: "border-blue-400/30 bg-blue-800/20 shadow-inner",
                textStrong: "text-blue-950 dark:text-white", textMuted: "text-blue-800/70 dark:text-blue-200/50", textHighlight: "text-white drop-shadow-[0_0_12px_rgba(34,211,238,1)]",
                textAccent: "text-blue-600 dark:text-cyan-400", skillIconFill: "text-blue-500 dark:text-cyan-400", skillTitle: "text-blue-600 dark:text-cyan-400",
                skillFill: "bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.6)]", accentMuted: "bg-blue-400/30 dark:bg-blue-500/30", dnaColor1: "bg-blue-500 shadow-[0_0_15px_#3b82f6]",
                dnaColor2: "bg-cyan-400 shadow-[0_0_15px_#22d3ee]", dnaGradient: "from-blue-500 to-cyan-400",
            };
        }

        return {
            pageBg: "bg-slate-200/30 dark:bg-[#030014]", matrixOpacity: "opacity-60",
            capsuleBorder: "border-slate-400/50 dark:border-white/20",
            capsuleIconFill: "text-blue-600 dark:text-cyan-400", cardBg: "bg-transparent", cardBorder: "border-white/60 dark:border-white/10",
            panelWrapper: "bg-slate-900/40 backdrop-blur-2xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.5)]", highlightCard: "border-white/20 bg-white/10 shadow-inner",
            textStrong: "text-slate-900 dark:text-white", textMuted: "text-slate-600 dark:text-white/50", textHighlight: "text-white drop-shadow-[0_0_12px_rgba(255,255,255,1)]",
            textAccent: "text-cyan-600 dark:text-cyan-400", skillIconFill: "text-blue-600 dark:text-cyan-400", skillTitle: "text-blue-600 dark:text-cyan-400",
            skillFill: "bg-cyan-500", accentMuted: "bg-slate-400/50 dark:bg-cyan-500/50", dnaColor1: "bg-cyan-400 shadow-[0_0_15px_#22d3ee]",
            dnaColor2: "bg-blue-500 shadow-[0_0_15px_#3b82f6]", dnaGradient: "from-cyan-400 to-blue-500",
        };
    };

    const theme = getTheme();

    const loadSkills = useCallback(async () => {
        if (status === "authenticated") {
            try {
                const res = await fetch('/api/user/skills');
                if (res.ok) {
                    const dbSkills = await res.json();
                    setUserSkills(DEFAULT_SKILLS.map(ds => {
                        const fd = dbSkills.find((s: any) => s.id === ds.id);
                        return fd ? { ...ds, ...fd } : ds;
                    }));
                }
            } catch (error) { } finally { setIsLoadingSkills(false); }
        }
    }, [status]);

    useEffect(() => { setMounted(true); loadSkills(); }, [status, loadSkills]);

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const validImageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        const MAX_FILE_SIZE = 5 * 1024 * 1024;

        if (!validImageTypes.includes(file.type)) {
            alert("Protocolo Rejeitado: Apenas imagens (JPG, PNG, WEBP, GIF) são permitidas nesta fase.");
            return;
        }

        if (file.size > MAX_FILE_SIZE) {
            alert("Protocolo Rejeitado: O arquivo excede 5MB. O sistema neural entrará em colapso.");
            return;
        }

        setIsUploading(true);

        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new window.Image();
            img.src = event.target?.result as string;
            img.onload = async () => {
                const canvas = document.createElement("canvas");
                const MAX_WIDTH = 400;
                const MAX_HEIGHT = 400;
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
                } else {
                    if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext("2d");
                ctx?.drawImage(img, 0, 0, width, height);

                const compressedBase64 = canvas.toDataURL("image/jpeg", 0.7);
                setUserImage(compressedBase64);

                try {
                    const res = await fetch('/api/user/avatar', {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ image: compressedBase64 })
                    });

                    if (res.ok) {
                        await update({ image: compressedBase64 });
                    } else {
                        const err = await res.json();
                        alert("Falha ao salvar no banco: " + err.error);
                    }
                } catch (error) {
                    console.error("Erro na API:", error);
                    alert("Erro de conexão ao salvar a imagem.");
                } finally {
                    setIsUploading(false);
                }
            };
        };
    };

    if (!mounted || status === "loading" || isSyncing) {
        return (
            <div className={`w-full flex flex-col items-center justify-center z-[999] ${theme.pageBg} ${isEmbedded ? 'h-full py-20' : 'h-screen'}`}>
                <ArrowPathIcon className={`w-8 h-8 animate-spin mb-4 ${theme.skillIconFill}`} />
                <span className={`text-[10px] font-black uppercase tracking-[0.3em] animate-pulse ${theme.skillTitle}`}>
                    Loading Workstation...
                </span>
            </div>
        );
    }

    if (status === "unauthenticated" && !isEmbedded) {
        router.replace("/workstation/student/profile");
        return null;
    }

    const cardBaseStyle = `relative overflow-hidden transition-all duration-300 border shrink-0 ${theme.cardBorder}`;

    return (
        // 🔥 Layout adaptável: se for embutido, remove o "min-h-screen" para encaixar perfeitamente na página do professor
        <div className={`w-full overflow-x-hidden overflow-y-auto custom-scrollbar relative transition-colors duration-1000 font-mono ${isEmbedded ? 'min-h-full pb-10' : 'min-h-screen pb-20'} ${theme.pageBg}`}>
            {!isEmbedded && <div className={`fixed inset-0 z-0 ${theme.matrixOpacity} pointer-events-none mix-blend-overlay`}><StarBackground /></div>}

            <div className={`w-full flex flex-col items-center justify-start relative z-20 ${isEmbedded ? 'pt-8 px-2' : 'pt-24 px-8'}`}>

                <div className="w-full max-w-[1400px] grid grid-cols-1 lg:grid-cols-12 gap-12 mb-12">

                    {/* --- LADO ESQUERDO: HUD DO PERSONAGEM --- */}
                    <div className={`lg:col-span-6 relative flex flex-col items-start pl-4 lg:pl-10 ${isEmbedded ? 'mt-4' : 'mt-16 lg:mt-24'}`}>

                        <div className="relative flex items-start">
                            {/* A CÁPSULA */}
                            <div className={`relative w-[180px] h-[500px] rounded-[100px] border-[3px] backdrop-blur-3xl flex flex-col items-center justify-center z-20 py-10 shadow-[0_0_50px_rgba(255,255,255,0.05)] ${theme.capsuleBorder}`}>
                                <RealisticDNA theme={theme} />

                                <motion.div animate={{ y: [-8, 8, -8] }} transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }} className="relative z-30">
                                    <label className={`relative block w-28 h-28 rounded-full border-4 p-1 shadow-2xl cursor-pointer group/avatar bg-white dark:bg-black border-cyan-400/50 ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}>
                                        <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={isUploading} />
                                        <Image src={userImage} alt="Avatar" fill className="object-cover rounded-full" />
                                        <div className="absolute inset-0 bg-black/60 rounded-full flex flex-col items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity">
                                            {isUploading ? <ArrowPathIcon className="w-6 h-6 text-white animate-spin mb-1" /> : <CameraIcon className="w-8 h-8 text-white mb-1" />}
                                            <span className="text-[7px] uppercase font-bold text-white tracking-widest">{isUploading ? 'Saving...' : 'Change'}</span>
                                        </div>
                                    </label>
                                </motion.div>
                            </div>

                            <div className="absolute left-[100%] top-8 flex flex-col gap-6 z-10 w-full min-w-[250px]">
                                <div className="flex flex-col mb-2 pl-6">
                                    <span className={`text-3xl font-black tracking-tighter drop-shadow-md ${theme.textStrong}`}>
                                        {session?.user?.name || "Unknown"}
                                    </span>
                                </div>

                                <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.3 }} className="relative flex items-center">
                                    <div className={`w-6 h-[2px] ${theme.accentMuted}`} />
                                    <div className={`border px-5 py-3 rounded-2xl backdrop-blur-md shadow-xl flex items-center gap-3 bg-white/40 dark:bg-black/20 ${theme.cardBorder}`}>
                                        <AcademicCapIcon className={`w-6 h-6 ${isSuperAdmin ? 'text-yellow-500' : theme.capsuleIconFill}`} />
                                        <div>
                                            <div className={`text-[8px] uppercase font-black tracking-widest ${theme.textMuted}`}>Level</div>
                                            <div className={`text-xs font-bold uppercase ${theme.textStrong}`}>{isSuperAdmin ? "Architect (Max)" : academicLevel}</div>
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
                                                <div className={`text-xs font-bold uppercase truncate max-w-[180px] ${theme.textStrong}`}>{isSuperAdmin ? "Omniscient" : userCourse || "Undeclared"}</div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* 🔥 OCULTA AS SKILLS GAMIFICADAS SE FOR PROFESSOR 🔥 */}
                                    {!isTeacher && (
                                        <div className={`flex flex-col gap-4 mt-4 ml-16 relative z-10 border-l-[2px] pl-4 py-2 ${theme.cardBorder}`}>
                                            {isLoadingSkills ? (
                                                <div className="flex items-center gap-2 px-2 opacity-50">
                                                    <ArrowPathIcon className="w-4 h-4 animate-spin text-slate-500 dark:text-white/50" />
                                                </div>
                                            ) : (
                                                userSkills.map((skill) => (
                                                    <SkillDrawer key={skill.id} skill={skill} isOpen={activeSkill === skill.id} onToggle={() => setActiveSkill(activeSkill === skill.id ? null : skill.id)} theme={theme} />
                                                ))
                                            )}
                                        </div>
                                    )}
                                </motion.div>
                            </div>
                        </div>
                    </div>

                    {/* --- LADO DIREITO: PORTAS DE ACESSO OU MURAL DO PROFESSOR --- */}
                    <div className="lg:col-span-6 flex flex-col justify-center items-center gap-5 z-30 w-full max-w-[450px] mx-auto pb-10">
                        <div className={`w-full p-8 rounded-[40px] flex flex-col gap-6 ${theme.panelWrapper}`}>

                            {/* 🔥 SE FOR PROFESSOR, MOSTRA O MURAL. SE FOR ALUNO, MOSTRA AS SALAS 🔥 */}
                            {isTeacher ? (
                                <div className={`p-6 rounded-3xl ${theme.highlightCard} flex flex-col gap-4 border`}>
                                    <div className="flex items-center gap-3 mb-2">
                                        <BookOpenIcon className={`w-8 h-8 ${theme.textHighlight}`} />
                                        <h2 className={`text-xl font-black uppercase tracking-tight ${theme.textHighlight}`}>Mural de Publicações</h2>
                                    </div>
                                    <p className={`text-[11px] leading-relaxed font-medium ${theme.textMuted}`}>
                                        Fixe aqui seus artigos, teses e links importantes. Eles ficarão visíveis para todos os alunos que visitarem seu perfil.
                                    </p>
                                    <button className={`mt-2 py-3 px-4 rounded-xl text-white font-black text-[10px] uppercase tracking-widest bg-gradient-to-r ${theme.dnaGradient} hover:scale-[1.02] transition-all shadow-lg flex items-center justify-center gap-2`}>
                                        + Nova Publicação
                                    </button>
                                    <div className={`w-full h-32 border-2 border-dashed rounded-xl flex items-center justify-center mt-4 ${theme.cardBorder} bg-black/10`}>
                                        <span className={`text-[10px] uppercase font-bold tracking-widest ${theme.textMuted}`}>Nenhuma publicação fixada</span>
                                    </div>
                                </div>
                            ) : (
                                <>
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
                                </>
                            )}
                        </div>

                        <NetworkConnectionsPanel visitedUserId={undefined} currentUserId={currentUserId} theme={theme} />
                    </div>
                </div>

                <div className={`w-full max-w-[1400px] border-t mt-8 ${theme.cardBorder}`}>
                    <NetworkMural />
                </div>
            </div>

            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.2); border-radius: 10px; }
            `}</style>
        </div>
    );
}