"use client";

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  MapPin, User, Activity, Clock, ChevronUp, ChevronDown, 
  Power, Send, Sparkles, X, ArrowUp,
  FileText, Plus, Database, Bot, File, Briefcase, Pen, Globe,
  Users, Layers, Share2, Copy, ArrowUpRight,
  Hash, UploadCloud, Trash2, Check, Brain, Cpu, Puzzle, ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSession } from 'next-auth/react';
import { useArmazemDaConta } from "@/lib/chat/contaNoNavegador";
import { useSearchParams, useRouter } from 'next/navigation';
import NextImage from 'next/image';
import VoiceModeSwitch from '@/components/voice/VoiceModeSwitch';
import SpeakButton from '@/components/voice/SpeakButton';
import StudentAulasModule from '@/components/aulas/StudentAulasModule';
import { useAutoFoco } from '@/lib/ui/autofoco';

// --- INITIAL DATA ---
const initialSchedule: any[] = []; 

interface StoredDoc { id: string; title: string; type: 'pdf' | 'doc'; size: string; }
interface UserItem { id: string; type: 'file' | 'link'; name: string; meta: string; }
interface UserModule { id: number; title: string; items: UserItem[]; }

// CORES DISPONÍVEIS PARA AS AULAS 
const CLASS_COLORS = [
    "from-emerald-400 to-teal-500",
    "from-blue-400 to-cyan-500",
    "from-indigo-400 to-purple-500",
    "from-fuchsia-400 to-pink-500",
    "from-rose-400 to-red-500",
    "from-amber-400 to-orange-500"
];

// AGENDA RADIAL — cores solidas + geometria do relogio de fatias
const CLASS_SOLID = ["#10b981", "#3b82f6", "#6366f1", "#d946ef", "#f43f5e", "#f59e0b"];
// Paleta basica para pintar as fatias (clique na fatia)
const BASIC_COLORS = ["#ef4444", "#f97316", "#f59e0b", "#eab308", "#22c55e", "#10b981", "#06b6d4", "#3b82f6", "#6366f1", "#8b5cf6", "#d946ef", "#ec4899", "#ffffff", "#64748b"];
const colorHex = (g?: string) => { if (g && g[0] === "#") return g; const i = CLASS_COLORS.indexOf(g || ""); return i >= 0 ? CLASS_SOLID[i] : "#8b5cf6"; };
const DAYS_PT = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sab", "Dom"];
const DAYS_FULL = ["Segunda", "Terca", "Quarta", "Quinta", "Sexta", "Sabado", "Domingo"];
const AG_MIN = 6, AG_MAX = 22, AG_TOTAL = 16;
const agAngle = (h: number) => -90 + ((h % 12) / 12) * 360; // relogio 12h, 30graus/hora, sentido horario
const agPolar = (cx: number, cy: number, r: number, deg: number) => { const a = (deg * Math.PI) / 180; return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) }; };
const agDonut = (cx: number, cy: number, rI: number, rO: number, h0: number, h1: number) => {
    const a0 = agAngle(h0), a1 = agAngle(h1);
    const large = ((a1 - a0) % 360) > 180 ? 1 : 0;
    const o0 = agPolar(cx, cy, rO, a0), o1 = agPolar(cx, cy, rO, a1);
    const i1 = agPolar(cx, cy, rI, a1), i0 = agPolar(cx, cy, rI, a0);
    return `M ${o0.x} ${o0.y} A ${rO} ${rO} 0 ${large} 1 ${o1.x} ${o1.y} L ${i1.x} ${i1.y} A ${rI} ${rI} 0 ${large} 0 ${i0.x} ${i0.y} Z`;
};

// --- COMPONENT: COLLECTIVE BUILD NODE ---
const CollectiveZone = ({ classes, currentUser, dragConstraints, themeColor = 'cyan' }: any) => {
    const t = getThemeClasses(themeColor);
    const [activeClassId, setActiveClassId] = useState<number | null>(null);
    const [inviteCode, setInviteCode] = useState<string | null>(null);
    const [members, setMembers] = useState<any[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [chatMsg, setChatMsg] = useState("");
    const [groupMessages, setGroupMessages] = useState<{user: string, text: string}[]>([
        { user: 'System', text: 'Secure channel established.' }
    ]);
    const [teacherTasks, setTeacherTasks] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<'chat' | 'tasks'>('chat'); // Alternar entre Grupo e Tarefas

    // Entrar na aba Grupo = cursor na caixa de mensagem, sem precisar clicar. O gancho
    // espera o painel ficar visível em vez de chutar um atraso, e não rouba de ninguém
    // que já esteja escrevendo em outro campo (ver lib/ui/autofoco.ts).
    const chatRef = useRef<HTMLInputElement>(null);
    useAutoFoco(chatRef, activeTab === 'chat');

    const savedClasses = classes.filter((c: any) => !c.isDraft);

    useEffect(() => {
        if (savedClasses.length === 0) {
            setActiveClassId(null);
            setInviteCode(null);
            setMembers([]);
        } else if (!activeClassId || !savedClasses.some((c: any) => c.id === activeClassId)) {
            setActiveClassId(savedClasses[0].id);
        }
    }, [savedClasses, activeClassId]);

    const activeClass = savedClasses.find((c: any) => c.id === activeClassId);

    // FETCH REAL DOS DOCUMENTOS ASSINADOS A ESSA AULA
    useEffect(() => {
        if (activeClass?.name) {
            fetch(`/api/student/tasks?subject=${encodeURIComponent(activeClass.name)}`)
                .then(r => r.json())
                .then(data => {
                    if (data && data.length) {
                        setTeacherTasks(data);
                    } else {
                        setTeacherTasks([]);
                    }
                }).catch(err => console.error("Error fetching tasks:", err));
        }
    }, [activeClass?.name]);

    const generateCode = () => {
        setIsGenerating(true);
        setTimeout(() => {
            const code = `ZAE-${Math.random().toString(36).substr(2, 4).toUpperCase()}-${Math.floor(Math.random() * 99)}`;
            setInviteCode(code);
            setIsGenerating(false);
            if (currentUser && members.length === 0) {
                setMembers([currentUser]); 
            }
        }, 1500);
    };

    const sendGroupMessage = () => {
        if (!chatMsg.trim()) return;
        setGroupMessages(prev => [...prev, { user: currentUser?.name || 'You', text: chatMsg }]);
        setChatMsg("");
    };

    if (savedClasses.length === 0) {
        return (
            <motion.div 
                drag
                dragConstraints={dragConstraints}
                whileHover={{ cursor: "grab" }}
                whileDrag={{ cursor: "grabbing", zIndex: 100 }}
                className="w-full mt-10 max-w-[1400px] relative z-30"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="relative w-full bg-white/70 dark:bg-black/30 backdrop-blur-3xl border border-slate-300 dark:border-white/10 rounded-[2.5rem] p-8 shadow-2xl flex flex-col items-center justify-center min-h-[300px] gap-4 overflow-hidden">
                    <div className="p-4 bg-indigo-500/10 rounded-full border border-indigo-500/20 text-indigo-500 mb-2">
                        <Users size={32} />
                    </div>
                    <div className="text-center flex flex-col items-center">
                        <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-800 dark:text-white mb-3">Collective Build Node</h3>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest border border-dashed border-slate-300 dark:border-white/20 p-4 rounded-xl backdrop-blur-sm max-w-sm">
                            Module in standby.<br/>Save a class in your agenda to open a secure channel.
                        </p>
                    </div>
                </div>
            </motion.div>
        );
    }

    return (
        <motion.div 
            drag
            dragConstraints={dragConstraints}
            whileHover={{ cursor: "grab" }}
            whileDrag={{ cursor: "grabbing", zIndex: 100 }}
            className="w-full mt-10 max-w-[1400px] relative z-30"
            onClick={(e) => e.stopPropagation()}
        >
            <div className="relative w-full bg-white/70 dark:bg-black/30 backdrop-blur-3xl border border-slate-300 dark:border-white/10 rounded-[2.5rem] p-8 shadow-xl dark:shadow-2xl flex flex-col gap-6 overflow-hidden">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-300/50 dark:border-white/10 pb-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-500/10 rounded-xl border border-indigo-500/20 text-indigo-500">
                            <Users size={20} />
                        </div>
                        <div>
                            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-800 dark:text-white">Collective Build Node</h3>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">Real-time collaboration workspace</p>
                        </div>
                    </div>
                    <div className="flex gap-2 overflow-x-auto scrollbar-hide max-w-full pb-1">
                        {savedClasses.map((cls: any) => (
                            <button
                                key={cls.id}
                                onClick={(e) => { 
                                    e.stopPropagation();
                                    if(activeClassId !== cls.id) {
                                        setActiveClassId(cls.id); 
                                        setInviteCode(null); 
                                        setMembers([]); 
                                        setGroupMessages([{ user: 'System', text: `Secure channel for ${cls.name} established.` }]);
                                    }
                                }}
                                className={`px-4 py-2 rounded-full text-[9px] font-bold uppercase tracking-wider transition-all whitespace-nowrap border
                                    ${activeClassId === cls.id 
                                        ? `${t.fill} text-white border-transparent shadow-lg` 
                                        : 'bg-white/50 dark:bg-white/5 text-slate-500 border-slate-300 dark:border-white/10 hover:bg-white dark:hover:bg-white/10 shadow-sm dark:shadow-none'
                                    }`}
                            >
                                {cls.name}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex flex-col lg:flex-row gap-8 h-[500px]">
                    <div className="flex-1 flex flex-col bg-white/80 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-[2rem] p-1 relative overflow-hidden shadow-md dark:shadow-none" onClick={(e) => e.stopPropagation()}>
                        <div className="px-6 py-4 flex items-center justify-between border-b border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-black/20">
                            <div className="flex items-center gap-4">
                                <button onClick={() => setActiveTab('chat')} className={`flex items-center gap-2 transition-opacity ${activeTab === 'chat' ? 'opacity-100' : 'opacity-40 hover:opacity-70'}`}>
                                    <span className={`w-2 h-2 ${t.fill} rounded-full animate-pulse shadow-[0_0_5px_currentColor]`}></span>
                                    <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase">{activeClass?.name} Channel</span>
                                </button>
                                <span className="text-white/20">|</span>
                                <button onClick={() => setActiveTab('tasks')} className={`flex items-center gap-2 transition-opacity ${activeTab === 'tasks' ? 'opacity-100' : 'opacity-40 hover:opacity-70'}`}>
                                    <FileText size={12} className={t.text} />
                                    <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase">Tarefas Prof. ({teacherTasks.length})</span>
                                </button>
                            </div>
                        </div>

                        {activeTab === 'chat' && (
                            <>
                                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                                    {groupMessages.map((msg, i) => (
                                        <div key={i} className={`flex flex-col ${msg.user === (currentUser?.name || 'You') ? 'items-end' : 'items-start'}`}>
                                            <span className="text-[8px] text-slate-400 mb-1 ml-1">{msg.user}</span>
                                            <div className={`max-w-[80%] px-4 py-2 rounded-2xl text-[11px] font-medium leading-relaxed shadow-sm ${msg.user === (currentUser?.name || 'You') ? `${t.fill} text-white rounded-tr-none` : 'bg-white dark:bg-white/10 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-white/5 rounded-tl-none'}`}>
                                                {msg.text}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="p-3 bg-slate-50 dark:bg-black/20 border-t border-slate-200 dark:border-white/5">
                                    <div className="flex items-center gap-2 bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-full px-2 py-2 shadow-inner dark:shadow-none">
                                        <input ref={chatRef} value={chatMsg} onChange={(e) => setChatMsg(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && sendGroupMessage()} placeholder={`Message ${activeClass?.name} group...`} className="flex-1 bg-transparent px-4 text-xs font-medium text-slate-800 dark:text-white placeholder:text-slate-400 outline-none" />
                                        <button onClick={sendGroupMessage} className={`w-8 h-8 ${t.fill} text-white rounded-full flex items-center justify-center hover:scale-105 transition-transform`}><ArrowUpRight size={14} /></button>
                                    </div>
                                </div>
                            </>
                        )}

                        {activeTab === 'tasks' && (
                            <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                                {teacherTasks.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2">
                                        <Check size={24} />
                                        <span className="text-xs uppercase font-bold tracking-widest">Tudo limpo por aqui</span>
                                    </div>
                                ) : (
                                    teacherTasks.map((task) => (
                                        <div key={task.id} className="p-4 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 shadow-sm">
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    <span className={`px-2 py-0.5 rounded-full text-[8px] font-bold uppercase ${t.bg} ${t.text}`}>
                                                        {task.type}
                                                    </span>
                                                    <h4 className="text-sm font-bold text-slate-800 dark:text-white">{task.title}</h4>
                                                </div>
                                                <span className="text-[10px] text-slate-400">{new Date(task.createdAt).toLocaleDateString()}</span>
                                            </div>
                                            <p className="text-xs text-slate-600 dark:text-slate-300 mb-3">{task.content.substring(0, 100)}...</p>
                                            <button className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold ${t.fill} text-white shadow-sm hover:opacity-90 transition-opacity`}>
                                                <ExternalLink size={12} /> Abrir Documento
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                    
                    <div className="w-full lg:w-80 flex flex-col gap-4">
                        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-500/10 dark:to-purple-500/10 border border-indigo-200 dark:border-indigo-500/20 rounded-[2rem] p-4 text-center relative overflow-hidden group shadow-md dark:shadow-none" onClick={(e) => e.stopPropagation()}>
                            {!inviteCode ? (
                                <div className="flex flex-col items-center gap-2 relative z-10">
                                    <div className="w-10 h-10 bg-white dark:bg-white/10 rounded-full flex items-center justify-center shadow-lg mb-1 border border-indigo-100 dark:border-none"><Share2 size={16} className="text-indigo-500" /></div>
                                    <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-700 dark:text-white">Build Together</h4>
                                    <button onClick={generateCode} disabled={isGenerating} className="mt-1 px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-black rounded-full text-[9px] font-bold uppercase tracking-wider hover:scale-105 transition-transform w-full shadow-lg">{isGenerating ? "Generating..." : "Generate Code"}</button>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center gap-2 relative z-10">
                                    <div className="w-full bg-white/80 dark:bg-white/50 dark:bg-black/30 border border-dashed border-indigo-400/50 rounded-xl p-2 flex flex-col items-center"><span className="text-[8px] font-bold text-indigo-500 uppercase mb-1">Access Code</span><span className="text-xl font-black font-mono text-slate-800 dark:text-white tracking-widest select-all">{inviteCode}</span></div>
                                    <button onClick={() => { navigator.clipboard.writeText(`zaeon.io/join/${inviteCode}`); }} className="flex items-center gap-2 text-[9px] font-bold text-slate-600 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"><Copy size={10} /> Copy Link</button>
                                </div>
                            )}
                        </div>
                        <div className="flex-1 bg-white/80 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-[2rem] p-4 flex flex-col gap-3 relative overflow-y-auto custom-scrollbar shadow-md dark:shadow-none" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-between pl-2"><span className="text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Active Nodes</span><span className="text-[9px] font-mono text-slate-500 dark:text-slate-400">{members.length} Online</span></div>
                            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 flex-1 content-start">
                                {members.length === 0 ? (
                                    <div className="col-span-full flex flex-col items-center justify-center opacity-60 h-full min-h-[100px]"><Users size={24} className="text-slate-400 mb-2" /><span className="text-[8px] font-bold uppercase tracking-wider text-slate-500">Waiting for peers...</span></div>
                                ) : (
                                    members.map((member, i) => (
                                        <div key={i} className="aspect-square rounded-2xl border border-slate-200 dark:border-slate-300/50 dark:border-white/10 bg-slate-50 dark:bg-white/30 dark:bg-black/20 flex flex-col items-center justify-center relative overflow-hidden group/slot shadow-sm">
                                            <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center gap-1 z-10 w-full">
                                                <div className="w-10 h-10 rounded-full border-2 border-indigo-400 dark:border-indigo-500 p-0.5 bg-white/50 dark:bg-white/10 backdrop-blur-md shadow-sm dark:shadow-lg"><div className="w-full h-full rounded-full overflow-hidden bg-slate-200 dark:bg-slate-800 flex items-center justify-center">{member.image ? <NextImage src={member.image} alt="" fill className="object-cover" /> : <User size={16} className="text-slate-500 dark:text-white" />}</div></div>
                                                <div className="text-center w-full px-1"><span className="text-[8px] font-bold text-slate-800 dark:text-white truncate block">{member.name}</span><span className="text-[6px] font-bold text-indigo-600 dark:text-indigo-500 bg-indigo-100 dark:bg-indigo-500/10 px-1 py-0.5 rounded-full inline-block mt-0.5 border border-indigo-200 dark:border-none">CONNECTED</span></div>
                                            </motion.div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};


export interface ClassesViewProps {
    room: string;
    themeColor: 'cyan' | 'pink' | 'indigo' | 'emerald' | 'amber' | 'violet';
}

export const getThemeClasses = (color: string) => {
    switch(color) {
        case 'pink': return { text: 'text-pink-400', border: 'border-pink-500/30', bg: 'bg-pink-500/10', shadow: 'shadow-[0_0_20px_rgba(244,114,182,0.15)]', fill: 'bg-pink-500', from: 'from-pink-600', to: 'to-pink-400' };
        case 'indigo': return { text: 'text-indigo-400', border: 'border-indigo-500/30', bg: 'bg-indigo-500/10', shadow: 'shadow-[0_0_20px_rgba(99,102,241,0.15)]', fill: 'bg-indigo-500', from: 'from-indigo-600', to: 'to-indigo-400' };
        case 'emerald': return { text: 'text-emerald-400', border: 'border-emerald-500/30', bg: 'bg-emerald-500/10', shadow: 'shadow-[0_0_20px_rgba(16,185,129,0.15)]', fill: 'bg-emerald-500', from: 'from-emerald-600', to: 'to-emerald-400' };
        case 'amber': return { text: 'text-amber-400', border: 'border-amber-500/30', bg: 'bg-amber-500/10', shadow: 'shadow-[0_0_20px_rgba(245,158,11,0.15)]', fill: 'bg-amber-500', from: 'from-amber-600', to: 'to-amber-400' };
        case 'violet': return { text: 'text-violet-400', border: 'border-violet-500/30', bg: 'bg-violet-500/10', shadow: 'shadow-[0_0_20px_rgba(139,92,246,0.15)]', fill: 'bg-violet-500', from: 'from-violet-600', to: 'to-violet-400' };
        default: return { text: 'text-cyan-400', border: 'border-cyan-500/30', bg: 'bg-cyan-500/10', shadow: 'shadow-[0_0_20px_rgba(34,211,238,0.15)]', fill: 'bg-cyan-500', from: 'from-cyan-600', to: 'to-cyan-400' };
    }
}

/** #666: trocar de conta remonta a tela; o estado da conta anterior não pode ser gravado na seguinte. */
export default function ClassesView(props: ClassesViewProps) {
    const area = useArmazemDaConta();
    if (!area) return null;
    return <TelaDaConta key={area.conta} {...props} />;
}

function TelaDaConta({ room, themeColor = 'cyan' }: ClassesViewProps) {
    const t = getThemeClasses(themeColor);
    const { data: session, status } = useSession();
    // #666: o que esta tela guarda no navegador é da conta logada (senão ia até para o servidor da conta seguinte)
    const areaDaConta = useArmazemDaConta();
    const router = useRouter();
    const searchParams = useSearchParams();
    const pendingInvite = searchParams.get('pendingInvite');
    
    const [invitedClass, setInvitedClass] = useState<any>(null);
    const [isDataLoaded, setIsDataLoaded] = useState(false);
    
    // STATE - Agenda e Módulos
    const [classes, setClasses] = useState<any[]>(initialSchedule);
    const [selectedClass, setSelectedClass] = useState<any>(null);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false); 
    
    const [gadgetOn, setGadgetOn] = useState(false);
    const [pluggedDay, setPluggedDay] = useState<number | null>(null);

    // Relógio para a barra "tempo atual" da agenda (atualiza a cada minuto).
    // null no SSR → setado no cliente (evita mismatch de hidratação).
    const [now, setNow] = useState<Date | null>(null);
    useEffect(() => {
        setNow(new Date());
        // 10s: relógio vivo (ponteiro de minuto anda) sem pesar. Antes era 60s (parado).
        const t = setInterval(() => setNow(new Date()), 10_000);
        return () => clearInterval(t);
    }, []);

    // Dia selecionado da agenda radial = hoje (na montagem)
    useEffect(() => { setSelectedDay((new Date().getDay() + 6) % 7); }, []);

    // glitch leve quando uma aula nova entra
    const flashGlitch = (id: number) => { setGlitchClassId(id); setTimeout(() => setGlitchClassId((c) => (c === id ? null : c)), 1100); };
    const setClassColor = (id: number, hex: string) => { setClasses((prev) => prev.map((c) => (c.id === id ? { ...c, color: hex } : c))); setColorPickId(null); };

    // cria rascunho de aula no dia selecionado, num horario dado
    const addDraftAt = (hour: number) => {
        if (!session?.user) { alert("Operative access required to edit schedule."); return; }
        const h = Math.min(AG_MAX - 1, Math.max(AG_MIN, Math.round(hour)));
        setSelectedClass({ id: Date.now(), name: "", teacher: "", room: "", days: [selectedDay + 1], hour: h, endHour: Math.min(AG_MAX, h + 2), color: CLASS_COLORS[classes.length % CLASS_COLORS.length], duration: 2, isDraft: true });
        setHasUnsavedChanges(true);
    };

    // clicar no anel cria aula na hora correspondente
    // valida a matricula quando uma aula com os mesmos dados do convite entra na agenda
    const checkInviteMatch = (cls: any) => {
        if (!invitedClass || !pendingInvite) return;
        const sameSubject = (cls.name || "").toLowerCase().trim() === (invitedClass.subject || "").toLowerCase().trim();
        const sameDay = (cls.days || []).some((d: number) => invitedClass.days.includes(d));
        const sameHour = Number(cls.hour) === Number(invitedClass.hour);
        if (sameSubject && sameDay && sameHour) {
            fetch('/api/student/confirm-join', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: pendingInvite }) })
                .then(() => { alert("Aula Validada! Vinculo com professor estabelecido. O Chat Seguro foi liberado."); setInvitedClass(null); router.replace(`/study-rooms/${room}`); })
                .catch(console.error);
        }
    };

    const onRingClick = (e: React.MouseEvent) => {
        if (selectedClass && (selectedClass.isDraft || hasUnsavedChanges)) return;
        const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
        const dx = e.clientX - (rect.left + rect.width / 2);
        const dy = e.clientY - (rect.top + rect.height / 2);
        const dist = Math.hypot(dx, dy) / (rect.width / 300);
        if (dist < 70 || dist > 150) return;
        const fromTop = (((Math.atan2(dy, dx) * 180) / Math.PI) + 90 + 360) % 360;
        addDraftAt(AG_MIN + (fromTop / 360) * AG_TOTAL);
    };

    const [liquidChatHistory, setLiquidChatHistory] = useState<{ role: 'user' | 'agent', text: string }[]>([
        { role: 'agent', text: "Oi! Aqui é a Zaeon. Eu cuido da sua agenda, do seu tempo e dos seus estudos — me conta suas aulas que eu encaixo tudo no seu dia." }
    ]);
    const [zaeonInput, setZaeonInput] = useState("");
    const [isZaeonProcessing, setIsZaeonProcessing] = useState(false);
    const [chatMin, setChatMin] = useState(false); // Fase 6/B2: chat minimizável (estado persistido)
    useEffect(() => { try { setChatMin(localStorage.getItem("zaeon.aula.chatMin") === "1"); } catch { /* */ } }, []);
    useEffect(() => { try { localStorage.setItem("zaeon.aula.chatMin", chatMin ? "1" : "0"); } catch { /* */ } }, [chatMin]);

    // O chat da Zaeon é O chat desta sala: abriu o painel, o cursor já está nele.
    const zaeonRef = useRef<HTMLInputElement>(null);
    useAutoFoco(zaeonRef, !chatMin);

    const [storedPdfs, setStoredPdfs] = useState<StoredDoc[]>([]);
    const [selectedDay, setSelectedDay] = useState<number>(0);
    const [glitchClassId, setGlitchClassId] = useState<number | null>(null);
    const [dayNavOpen, setDayNavOpen] = useState(false);
    const [colorPickId, setColorPickId] = useState<number | null>(null);
    
    // STATE - AI MODULES NO BACKPACK (Apenas 1 módulo inicial agora)
    const [userModules, setUserModules] = useState<UserModule[]>([
        { id: 1, title: "Acesse outros modelos", items: [] }
    ]);
    
    // REF PARA JANELAS FLUTUANTES (Re-Foco)
    const aiWindows = useRef<{ [key: string]: Window | null }>({});
    
    // SERVIÇOS DE IA PARA O LAUNCHER MINIMALISTA
    const aiServices = [
        { 
            id: 'gpt', name: "ChatGPT", url: "https://chat.openai.com", color: "bg-[#10a37f]", 
            logo: "https://upload.wikimedia.org/wikipedia/commons/0/04/ChatGPT_logo.svg" 
        },
        { 
            id: 'claude', name: "Claude", url: "https://claude.ai", color: "bg-[#d97757]", 
            logo: "https://cdn.simpleicons.org/anthropic/white" 
        },
        { 
            id: 'gemini', name: "Gemini", url: "https://gemini.google.com", color: "bg-[#1d4ed8]", 
            logo: "https://cdn.simpleicons.org/googlegemini/white" 
        },
        { 
            id: 'qwen', name: "Qwen", url: "https://chat.qwenlm.ai", color: "bg-[#6366f1]", 
            logo: "/logos/qwen.png", // Imagem local que vai adicionar
            fallbackIcon: Brain 
        } 
    ];

    const constraintsRef = useRef(null);
    const zaeonChatScrollRef = useRef<HTMLDivElement>(null);
    const agendaRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (zaeonChatScrollRef.current) zaeonChatScrollRef.current.scrollTop = zaeonChatScrollRef.current.scrollHeight;
    }, [liquidChatHistory]);

    // LOAD PENDING INVITE
    useEffect(() => {
        if (!pendingInvite) return;
        fetch('/api/student/join?token=' + pendingInvite)
            .then(res => res.json())
            .then(data => {
                if (!data.error) setInvitedClass(data);
            })
            .catch(console.error);
    }, [pendingInvite]);

    // LOAD DATA
    useEffect(() => {
        if (typeof window === 'undefined') return;
        if (status === 'loading' || !areaDaConta) return;
        const local = areaDaConta.armazem;

        const loadLocal = () => {
            const savedClasses = local.getItem('zaeon_schedule_data');
            const savedPluggedDay = local.getItem('zaeon_plugged_day');
            const savedGadgetOn = local.getItem('zaeon_gadget_on');
            
            const savedLiquidChat = local.getItem('zaeon_liquid_chat');
            const savedDocs = local.getItem('zaeon_stored_pdfs');
            const savedModules = local.getItem('zaeon_user_modules');

            if (savedClasses) setClasses(JSON.parse(savedClasses));
            if (savedPluggedDay) setPluggedDay(JSON.parse(savedPluggedDay));
            if (savedGadgetOn) setGadgetOn(JSON.parse(savedGadgetOn));
            
            if (savedLiquidChat) setLiquidChatHistory(JSON.parse(savedLiquidChat));
            if (savedDocs) setStoredPdfs(JSON.parse(savedDocs));
            
            if (savedModules) {
                const parsedModules = JSON.parse(savedModules).filter((m: any) => m.id !== 2);
                setUserModules(parsedModules.length > 0 ? parsedModules : [{ id: 1, title: "Acesse outros modelos", items: [] }]);
            }

            setIsDataLoaded(true);
        };

        if (session?.user?.email) {
            fetch(`/api/workspace?userId=${session.user.email}`)
                .then(res => res.json())
                .then(res => {
                    if (res.data && res.data.schedule && res.data.schedule.length > 0) {
                        const d = res.data;
                        if (d.schedule && Array.isArray(d.schedule)) setClasses(d.schedule);
                        if (d.layoutState) {
                           setPluggedDay(d.layoutState.pluggedDay ?? null);
                           setGadgetOn(d.layoutState.gadgetOn ?? false);
                        }
                        if (d.zaeonChat) setLiquidChatHistory(d.zaeonChat);
                        if (d.library) setStoredPdfs(d.library);
                        if (d.personalModules) {
                             const p = d.personalModules.filter((m:any) => m.id !== 2);
                             setUserModules(p.length ? p : [{ id: 1, title: "Acesse outros modelos", items: [] }]);
                        }
                        setIsDataLoaded(true);
                    } else {
                        loadLocal();
                    }
                })
                .catch((err) => {
                    console.error("Failed to load DB workspace:", err);
                    loadLocal();
                });
        } else {
            loadLocal();
        }
    }, [session, status, areaDaConta]);


    // SAVE DATA: Nuvem e Local
    useEffect(() => {
        if (isDataLoaded && areaDaConta) {
            areaDaConta.armazem.setItem('zaeon_schedule_data', JSON.stringify(classes));
            areaDaConta.armazem.setItem('zaeon_plugged_day', JSON.stringify(pluggedDay));
            areaDaConta.armazem.setItem('zaeon_gadget_on', JSON.stringify(gadgetOn));
            areaDaConta.armazem.setItem('zaeon_liquid_chat', JSON.stringify(liquidChatHistory));
            areaDaConta.armazem.setItem('zaeon_stored_pdfs', JSON.stringify(storedPdfs));
            areaDaConta.armazem.setItem('zaeon_user_modules', JSON.stringify(userModules));

            if (session?.user?.email) {
                fetch('/api/workspace', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userId: session.user.email,
                        schedule: classes,
                        zaeonChat: liquidChatHistory,
                        library: storedPdfs,
                        personalModules: userModules,
                        layoutState: { gadgetOn, pluggedDay }
                    })
                }).catch(err => console.error("Falha ao sincronizar com MongoDB:", err));
            }
        }
    }, [classes, pluggedDay, gadgetOn, liquidChatHistory, storedPdfs, userModules, isDataLoaded, session]);

    const handleBackgroundClick = () => {
        if (selectedClass?.isDraft) {
            setSelectedClass(null);
            setHasUnsavedChanges(false);
        }
    };

    const handleDayClick = (e: React.MouseEvent, dayIdx: number) => {
        e.stopPropagation(); 
        
        if (!session?.user) {
            alert("Operative access required to edit schedule.");
            return;
        }

        const dayNum = dayIdx + 1;

        if (selectedClass && (selectedClass.isDraft || hasUnsavedChanges)) {
            const newDays = selectedClass.days.includes(dayNum)
                ? selectedClass.days.filter((d: number) => d !== dayNum)
                : [...selectedClass.days, dayNum];
            
            if (newDays.length > 0) {
                setSelectedClass({ ...selectedClass, days: newDays });
                setHasUnsavedChanges(true);
            }
        } else {
            const newDraft = {
                id: Date.now(),
                name: "",
                teacher: "",
                room: "",
                days: [dayNum],
                hour: 8,
                endHour: 10,
                color: CLASS_COLORS[0], 
                duration: 2,
                isDraft: true 
            };
            setSelectedClass(newDraft);
            setHasUnsavedChanges(true);
        }
    };

    const handleUpdateClass = (field: string, value: string | number) => {
        if (!selectedClass) return;
        
        let updatedClass = { ...selectedClass, [field]: value };

        if (field === 'hour' || field === 'endHour') {
            const valNum = value === "" ? "" : Number(value); 
            updatedClass[field] = valNum;
            
            if (updatedClass.hour !== "" && updatedClass.endHour !== "") {
                const start = Number(updatedClass.hour);
                const end = Number(updatedClass.endHour);
                if (end > start) {
                    updatedClass.duration = end - start;
                }
            }
        }
        
        setSelectedClass(updatedClass);
        setHasUnsavedChanges(true);
    };

    const handleCycleColor = () => {
        if (!selectedClass) return;
        const currentIndex = CLASS_COLORS.indexOf(selectedClass.color);
        const nextIndex = (currentIndex + 1) % CLASS_COLORS.length;
        handleUpdateClass('color', CLASS_COLORS[nextIndex]);
    };

    const handleSaveClass = (e: React.MouseEvent) => {
        e.stopPropagation();
        
        if (!selectedClass.name || !selectedClass.teacher || selectedClass.hour === "" || selectedClass.endHour === "") {
            alert("Nome, Professor e Horários são obrigatórios.");
            return;
        }

        const start = Number(selectedClass.hour);
        const end = Number(selectedClass.endHour);

        if (start >= end || start < 6 || end > 23) {
            alert("Horário inválido. A aula deve terminar depois de começar (entre 6h e 23h).");
            return;
        }

        const finalizedClass = { 
            ...selectedClass, 
            location: selectedClass.location || "Online",
            hour: start, 
            endHour: end, 
            duration: end - start,
            isDraft: false 
        };

        setClasses(prevClasses => {
            const exists = prevClasses.some(c => c.id === finalizedClass.id);
            if (exists) {
                return prevClasses.map(c => c.id === finalizedClass.id ? finalizedClass : c);
            } else {
                return [...prevClasses, finalizedClass];
            }
        });

        // VALIDAR MATRÍCULA SE HOUVER INVITE
        if (invitedClass && pendingInvite) {
            const sameSubject = finalizedClass.name.toLowerCase().trim() === invitedClass.subject.toLowerCase().trim();
            const sameDay = finalizedClass.days.some((d: number) => invitedClass.days.includes(d));
            const sameHour = finalizedClass.hour === Number(invitedClass.hour);
            
            // Opcional: checar room ou location, mas isso já basta pra intenção.
            if (sameSubject && sameDay && sameHour) {
                fetch('/api/student/confirm-join', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ token: pendingInvite })
                }).then(() => {
                    alert("Aula Validada! Vínculo com professor estabelecido. O Chat Seguro foi liberado.");
                    setInvitedClass(null);
                    router.replace(`/study-rooms/${room}`);
                }).catch(console.error);
            }
        }
        
        flashGlitch(finalizedClass.id);
        setSelectedClass(finalizedClass);
        setHasUnsavedChanges(false);
    };

    const handleDeleteClass = (e: React.MouseEvent, classId: number) => {
        e.stopPropagation();
        if (selectedClass?.isDraft) {
            setSelectedClass(null);
            setHasUnsavedChanges(false);
            return;
        }
        
        setClasses(prevClasses => prevClasses.filter(c => c.id !== classId));
        if (selectedClass && selectedClass.id === classId) {
            setSelectedClass(null);
            setHasUnsavedChanges(false);
        }
    };

    const handleCloseDetails = () => {
        setSelectedClass(null);
        setHasUnsavedChanges(false);
    };

    const classesToRender = useMemo(() => {
        let list = [...classes];
        if (selectedClass && (hasUnsavedChanges || selectedClass.isDraft)) {
            const exists = list.some(c => c.id === selectedClass.id);
            if (exists) {
                list = list.map(c => c.id === selectedClass.id ? selectedClass : c);
            } else {
                list.push(selectedClass); 
            }
        }
        return list;
    }, [classes, selectedClass, hasUnsavedChanges]);


    // --- ZAEON LAB / GADGETS ---
    const handleGadgetDragEnd = (event: any, info: any) => {
        if (!agendaRef.current) return;
        const agendaRect = agendaRef.current.getBoundingClientRect();
        const dropY = info.point.y;
        const isNearBottom = dropY > agendaRect.bottom - 80 && dropY < agendaRect.bottom + 50;

        if (isNearBottom && info.point.x > agendaRect.left && info.point.x < agendaRect.right) {
            const colWidth = agendaRect.width / 7; // Ajustado para 7 dias
            const colIndex = Math.floor((info.point.x - agendaRect.left) / colWidth);
            if (colIndex >= 0 && colIndex <= 6) { // Aceita índices 0 até 6 (Seg a Dom)
                const realToday = (new Date().getDay() + 6) % 7; 
                setPluggedDay(realToday); 
                setSelectedClass(null);
                setHasUnsavedChanges(false);
            } else {
                setPluggedDay(null);
            }
        } else {
            setPluggedDay(null);
        }
    };

    // Core Active aplica a ferramenta update_schedule retornada pelo agente (cria/edita a agenda).
    const DAY_LABELS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sab", "Dom"];
    const applyScheduleTool = (args: any): string => {
        const action = String(args?.action || 'add').toLowerCase();
        const day = Number(args?.day);
        const hour = Number(args?.hour);
        const duration = Number(args?.duration) || 2;
        const name = args?.name ? String(args.name) : "";

        if (action === 'add') {
            if (!day || !hour) return "Não consegui criar a aula: dia ou horário ausente.";
            const newClass = {
                id: Date.now(),
                name: name || "Novo evento",
                teacher: args?.teacher || "",
                room: args?.room || "",
                detail: args?.detail || "",
                location: args?.room || "Online",
                days: [day],
                hour,
                endHour: hour + duration,
                duration,
                color: CLASS_COLORS[classes.length % CLASS_COLORS.length],
                isDraft: false,
            };
            setClasses(prev => [...prev, newClass]);
            flashGlitch(newClass.id);
            checkInviteMatch(newClass);
            return `✅ Adicionei "${newClass.name}" à agenda (${DAY_LABELS[day - 1]} ${hour}h–${hour + duration}h).`;
        }

        const matches = (c: any) =>
            (name && c.name?.toLowerCase() === name.toLowerCase()) ||
            ((c.days || []).includes(day) && Number(c.hour) === hour);

        if (action === 'remove') {
            let removed = false;
            setClasses(prev => prev.filter(c => { const m = matches(c); if (m) removed = true; return !m; }));
            return removed ? "🗑️ Removi a aula da agenda." : "Não encontrei essa aula para remover.";
        }
        if (action === 'update') {
            let updated = false;
            setClasses(prev => prev.map(c => {
                if (!matches(c)) return c;
                updated = true;
                return {
                    ...c,
                    ...(args.name ? { name: args.name } : {}),
                    ...(args.teacher ? { teacher: args.teacher } : {}),
                    ...(args.room ? { room: args.room, location: args.room } : {}),
                    ...(args.detail ? { detail: args.detail } : {}),
                    ...(hour ? { hour, endHour: hour + duration, duration } : {}),
                };
            }));
            return updated ? "✏️ Atualizei a aula na agenda." : "Não encontrei essa aula para atualizar.";
        }
        return "Ação de agenda não reconhecida.";
    };

    // Fase 4: o agente do chat acessa as AULAS do aluno (listar / abrir).
    const applyLessonTool = async (args: any): Promise<string> => {
        const action = String(args?.action || 'list').toLowerCase();
        try {
            if (action === 'open') {
                const topic = String(args?.topic || args?.title || '').trim();
                try { window.dispatchEvent(new CustomEvent('zaeon:aula:open', { detail: { topic } })); } catch { /* ignore */ }
                return topic ? `Abrindo sua aula sobre "${topic}" aqui embaixo.` : 'Abri o módulo das suas aulas aqui embaixo.';
            }
            const r = await fetch('/api/aulas');
            if (!r.ok) return 'Não consegui buscar suas aulas agora.';
            const d = await r.json();
            const aulas = Array.isArray(d.aulas) ? d.aulas : [];
            if (!aulas.length) return 'Você ainda não tem aulas enviadas pelos professores.';
            return `Você tem ${aulas.length} aula(s): ${aulas.slice(0, 6).map((a: any) => a.title).join('; ')}.`;
        } catch { return 'Falha ao acessar as aulas.'; }
    };

    // Fase 4: aviso de aula nova chega no chat (uma vez por montagem).
    const lessonNoticeRef = useRef(false);
    useEffect(() => {
        const onNotice = (e: any) => {
            if (lessonNoticeRef.current) return;
            const count = Number(e?.detail?.count || 0);
            if (count <= 0) return;
            lessonNoticeRef.current = true;
            setLiquidChatHistory(prev => [...prev, { role: 'agent', text: `📚 Você tem ${count} aula${count > 1 ? 's' : ''} nova${count > 1 ? 's' : ''} esperando aqui embaixo. Quer que eu abra?` }]);
        };
        window.addEventListener('zaeon:aula:notice', onNotice);
        return () => window.removeEventListener('zaeon:aula:notice', onNotice);
    }, []);

    const handleZaeonMessage = async () => {
        if (!zaeonInput.trim()) return;
        const msg = zaeonInput;
        setLiquidChatHistory(prev => [...prev, { role: 'user', text: msg }]);
        setZaeonInput("");
        setIsZaeonProcessing(true);
        try {
            const libraryContext = storedPdfs.length > 0 ? `Arquivos na biblioteca: ${storedPdfs.map(f => f.title).join(", ")}.` : "Biblioteca vazia.";
            const agendaContext = classes.length > 0
                ? `Agenda atual do aluno: ${classes.map((c: any) => `${c.name || 'Aula'} [${(c.days || []).map((d: number) => DAY_LABELS[d - 1]).join('/')} ${c.hour}-${c.endHour}h${c.teacher ? `, prof. ${c.teacher}` : ''}]`).join('; ')}.`
                : "A agenda do aluno está vazia.";
            // Contexto temporal: resolve "hoje"/"amanhã" para o número do dia (1=Seg..7=Dom)
            const _today = new Date();
            const _dow = (((_today.getDay() + 6) % 7) + 1);
            const _DOW = ["segunda", "terça", "quarta", "quinta", "sexta", "sábado", "domingo"];
            const dateContext = `DATA: hoje é ${_DOW[_dow - 1]} (day=${_dow}), ${_today.toLocaleDateString('pt-BR')}. Logo "hoje"=${_dow}, "amanhã"=${(_dow % 7) + 1}. Sempre horário 24h; duration = horaFim - horaInício.`;
            // Histórico recente da conversa (slot-filling entre turnos)
            const recent = liquidChatHistory.slice(-8).map((m) => `${m.role === 'user' ? 'Usuário' : 'Zaeon'}: ${m.text}`).join('\n');
            const convoContext = recent ? `\nHISTÓRICO RECENTE DESTA CONVERSA (use para juntar informações já ditas e NÃO repetir perguntas):\n${recent}` : "";
            const response = await fetch('/api/ai/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: msg, agent: "core_active", systemContext: `${dateContext}\n${agendaContext} ${libraryContext}\nAULAS: o aluno recebe aulas dos professores. Use a ferramenta 'lessons' (action='list' para listar; action='open' com 'topic' para abrir uma aula) quando ele perguntar sobre as aulas dele.${convoContext}` }),
            });
            const data = await response.json();
            if (data?.toolCall?.name === 'update_schedule') {
                const applied = applyScheduleTool(data.toolCall.args);
                setLiquidChatHistory(prev => [...prev, { role: 'agent', text: applied }]);
            } else if (data?.toolCall?.name === 'lessons') {
                const applied = await applyLessonTool(data.toolCall.args);
                setLiquidChatHistory(prev => [...prev, { role: 'agent', text: applied }]);
            } else {
                setLiquidChatHistory(prev => [...prev, { role: 'agent', text: data.text || "Pronto." }]);
            }
        } catch (e) { setLiquidChatHistory(prev => [...prev, { role: 'agent', text: "Conexão offline." }]); } finally { setIsZaeonProcessing(false); }
    };

    // (Livraria + backpack removidos no Lote 8 — o espaço virou o módulo de aulas geradas.
    //  storedPdfs/userModules permanecem só como persistência legada + contexto do chat.)

    // Agora com Sábado e Domingo inclusos
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const minHour = 6;
    const maxHour = 22;
    const totalHours = maxHour - minHour;
    const hours = Array.from({ length: totalHours + 1 }, (_, i) => minHour + i);

    // Aula acontecendo AGORA (alimenta a fitinha "tempo atual" abaixo da agenda).
    const DAY_NOW = now ? (((now.getDay() + 6) % 7) + 1) : null;
    const HOUR_NOW = now ? now.getHours() + now.getMinutes() / 60 : null;
    const currentClass = (DAY_NOW != null && HOUR_NOW != null)
        ? classes.find((c: any) => (c.days || []).includes(DAY_NOW) && Number(c.hour) <= HOUR_NOW && HOUR_NOW < Number(c.endHour))
        : null;
    // Relógio vivo (Parte C): hora digital, ponteiros e destaque de "hoje".
    const isToday = DAY_NOW != null && DAY_NOW === selectedDay + 1;
    const clockHHMM = now ? `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}` : '--:--';
    const minuteAngle = now ? -90 + (now.getMinutes() / 60) * 360 : -90;

    return (
        <div ref={constraintsRef} onClick={handleBackgroundClick} className="relative min-h-screen w-full flex flex-col items-start px-6 pt-8 pb-8 bg-transparent font-sans selection:bg-cyan-500/30 text-slate-900 dark:text-white transition-colors duration-500 overflow-x-hidden">
            <style>{`@keyframes agendaGlitch{0%{opacity:0;transform:translate(0,0)}15%{opacity:1;transform:translate(1.5px,-1px)}30%{transform:translate(-1.5px,1px)}45%{transform:translate(1px,1px)}60%{transform:translate(-1px,0)}100%{opacity:1;transform:translate(0,0)}}.agenda-glitch{animation:agendaGlitch .95s ease-out;transform-box:fill-box;transform-origin:center}`}</style>
            <div className="h-20 pointer-events-none"></div>

            {/* CARTÃO DE COLA (PENDING INVITE) */}
            <AnimatePresence>
                {invitedClass && pendingInvite && (
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: -20 }}
                        className="w-full max-w-[1400px] mx-auto mb-8 z-30"
                    >
                        <div className={`w-full bg-[#0a0a0a]/90 backdrop-blur-3xl border ${t.border} p-6 rounded-[2rem] shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6`}>
                            <div className="flex items-center gap-4">
                                <div className={`p-4 ${t.bg} rounded-2xl ${t.text}`}>
                                    <Sparkles size={32} className="animate-pulse" />
                                </div>
                                <div>
                                    <h3 className={`text-xs font-black uppercase tracking-[0.2em] ${t.text} mb-1 drop-shadow-md`}>Matrícula Pendente</h3>
                                    <p className="text-[11px] font-medium text-white/70 max-w-sm leading-relaxed">
                                        Para oficializar sua entrada na turma de <strong className="text-white">{invitedClass.teacherName}</strong>, peça à <strong>Zaeon</strong> (no chat) para adicionar a aula com <strong>exatamente os mesmos dados</strong> deste cartão.
                                    </p>
                                </div>
                            </div>
                            <div className={`flex flex-wrap items-center gap-4 lg:gap-8 bg-black/50 p-5 rounded-[1.5rem] border ${t.border}`}>
                                <div className="flex flex-col"><span className="text-[9px] font-bold uppercase tracking-widest text-white/40 mb-1">Disciplina</span><strong className="text-white text-sm">{invitedClass.subject}</strong></div>
                                <div className="hidden sm:block w-px h-8 bg-white/10" />
                                <div className="flex flex-col"><span className="text-[9px] font-bold uppercase tracking-widest text-white/40 mb-1">Dias</span><strong className="text-white text-sm">{invitedClass.days.map((d:number) => ["Seg","Ter","Qua","Qui","Sex","Sab","Dom"][d-1]).join(', ')}</strong></div>
                                <div className="hidden sm:block w-px h-8 bg-white/10" />
                                <div className="flex flex-col"><span className="text-[9px] font-bold uppercase tracking-widest text-white/40 mb-1">Horário</span><strong className="text-white text-sm">{invitedClass.hour}h <span className="text-white/30 mx-1">até</span> {invitedClass.endHour}h</strong></div>
                                <div className="hidden sm:block w-px h-8 bg-white/10" />
                                <div className="flex flex-col"><span className="text-[9px] font-bold uppercase tracking-widest text-white/40 mb-1">Local</span><strong className="text-white text-sm">{invitedClass.location || "Não especificado"}</strong></div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="w-full max-w-[1180px] pb-10 flex items-start justify-start gap-6 flex-wrap z-20 relative">

                {/* (Fios de energia removidos no Lote 8 — apontavam pra Livraria, que saiu.) */}

                {/* CHAT ZAEON (limpo, sem divisorias) — Fase 6: minimizável + balões padrão Zaeon */}
                <div className={`w-[400px] ${chatMin ? 'h-auto' : 'h-[440px]'} bg-[#0f172a]/95 dark:bg-black/40 backdrop-blur-xl border border-white/15 rounded-[2.4rem] shadow-[0_0_50px_-10px_rgba(139,92,246,0.55),0_0_95px_-30px_rgba(34,211,238,0.45)] flex flex-col overflow-hidden relative z-10`}>
                    <div className="px-6 pt-5 pb-1 flex items-center gap-2 shrink-0">
                        <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-[#8b5cf6] to-[#22d3ee] shadow-[0_4px_14px_rgba(139,92,246,0.45)] flex items-center justify-center text-white text-[17px] leading-none font-bold select-none">&#10177;</div>
                        <span className="text-xs font-bold text-white/70 tracking-wide">Zaeon</span>
                        <button onClick={() => setChatMin((v) => !v)} className="ml-auto p-1 rounded-lg text-white/35 hover:text-white/80 transition-colors" title={chatMin ? 'Abrir chat' : 'Minimizar chat'} aria-label={chatMin ? 'Abrir chat' : 'Minimizar chat'}>
                            {chatMin ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                    </div>
                    {!chatMin && (
                        <>
                            <div ref={zaeonChatScrollRef} className="flex-1 overflow-y-auto px-5 py-3 space-y-3 scrollbar-hide">
                                {liquidChatHistory.map((m, i) => (
                                    <div key={i} className={`group flex items-end gap-1.5 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed shadow-sm ${m.role === 'user' ? 'text-white font-semibold' : 'bg-white/[0.08] text-white/90'}`} style={m.role === 'user' ? { background: 'linear-gradient(135deg,#8b5cf6,#22d3ee)' } : undefined}>{m.text}</div>
                                        {m.role === 'agent' && <span className="opacity-0 group-hover:opacity-100 transition-opacity"><SpeakButton text={m.text} size={12} /></span>}
                                    </div>
                                ))}
                            </div>
                            <div className="px-4 pb-4 pt-1 shrink-0">
                                <div className="flex items-center gap-1.5 bg-white/[0.06] rounded-full pl-4 pr-1.5 py-1.5">
                                    <input ref={zaeonRef} value={zaeonInput} onChange={(e) => setZaeonInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleZaeonMessage()} className="bg-transparent flex-1 text-xs text-white outline-none placeholder:text-white/30" placeholder="Pergunte a Zaeon..." disabled={isZaeonProcessing} />
                                    <VoiceModeSwitch onTranscript={(t) => setZaeonInput(t)} title="Falar para a Zaeon" size={14} />
                                    <button onClick={handleZaeonMessage} disabled={isZaeonProcessing} className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#8b5cf6] to-[#22d3ee] flex items-center justify-center hover:scale-105 active:scale-95 transition-transform shadow-md disabled:opacity-40"><ArrowUp size={15} strokeWidth={2.2} className="text-white" /></button>
                                </div>
                            </div>
                        </>
                    )}
                </div>

{/* AGENDA RADIAL (relogio de fatias; dia no centro com setas) */}
                <div className="flex-1 min-w-[300px] self-start flex flex-col items-center gap-3 z-10" onClick={(e) => e.stopPropagation()}>
                    <div className="w-full max-w-[320px] bg-[#0f172a]/95 dark:bg-black/40 backdrop-blur-xl border border-white/15 rounded-[2.4rem] p-5 shadow-[0_0_50px_-10px_rgba(139,92,246,0.55),0_0_95px_-30px_rgba(34,211,238,0.45)] flex flex-col items-center gap-3 relative">
                        <div className="w-full flex items-center">
                            <span className="text-[9px] font-bold uppercase tracking-[0.22em] text-white/45">Agenda</span>
                        </div>

                        <div ref={agendaRef} className="relative">
                            <svg viewBox="0 0 300 300" width="240" height="240" className="touch-none">
                                <circle cx="150" cy="150" r="103" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="34" />
                                {Array.from({ length: 12 }).map((_, k) => { const a = -90 + k * 30; const p = agPolar(150,150,128, a); const p2 = agPolar(150,150, k % 3 === 0 ? 119 : 123, a); return <line key={k} x1={p.x} y1={p.y} x2={p2.x} y2={p2.y} stroke="rgba(255,255,255,0.22)" strokeWidth={k % 3 === 0 ? 2 : 1} />; })}
                                {([["12",-90],["3",0],["6",90],["9",180]] as [string, number][]).map(([lbl, a]) => { const p = agPolar(150,150,140, a); return <text key={lbl} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle" fill="rgba(255,255,255,0.4)" fontSize="10" fontWeight="700">{lbl}</text>; })}
                                {classesToRender.filter((c: any) => (c.days || []).includes(selectedDay + 1)).map((cls: any) => {
                                    const h0 = Math.max(AG_MIN, Math.min(AG_MAX - 0.25, Number(cls.hour) || AG_MIN));
                                    const h1 = Math.max(h0 + 0.25, Math.min(AG_MAX, Number(cls.endHour) || h0 + 1));
                                    const isNow = !!(isToday && currentClass && currentClass.id === cls.id); // aula AGORA → glow
                                    return (
                                        <path key={cls.id} d={agDonut(150,150,86,120,h0,h1)} fill={colorHex(cls.color)} onClick={(e) => { e.stopPropagation(); setColorPickId((p) => (p === cls.id ? null : cls.id)); }} className={`cursor-pointer transition-all hover:opacity-100 ${(isNow || colorPickId === cls.id) ? 'opacity-100' : 'opacity-85'} ${glitchClassId === cls.id ? 'agenda-glitch' : ''}`} style={{ stroke: (isNow || colorPickId === cls.id) ? '#fff' : 'rgba(0,0,0,0.18)', strokeWidth: isNow ? 2.5 : colorPickId === cls.id ? 2 : 1, filter: isNow ? 'drop-shadow(0 0 6px rgba(255,255,255,0.85))' : undefined }} />
                                    );
                                })}
                                {/* Ponteiros vivos — só no dia de HOJE (relógio de verdade). */}
                                {isToday && HOUR_NOW != null && (() => {
                                    const hourA = agAngle(HOUR_NOW as number);
                                    const mh = agPolar(150,150,116, minuteAngle);
                                    const hh = agPolar(150,150,78, hourA);
                                    const inRange = (HOUR_NOW as number) >= AG_MIN && (HOUR_NOW as number) <= AG_MAX;
                                    const mark = inRange ? agPolar(150,150,120, hourA) : null;
                                    return (
                                        <g>
                                            <line x1="150" y1="150" x2={mh.x} y2={mh.y} stroke="#fff" strokeWidth="2" strokeLinecap="round" className="opacity-80" />
                                            <line x1="150" y1="150" x2={hh.x} y2={hh.y} stroke="#22d3ee" strokeWidth="3.5" strokeLinecap="round" />
                                            {mark && <circle cx={mark.x} cy={mark.y} r="3.5" fill="#22d3ee" stroke="#fff" strokeWidth="1" />}
                                        </g>
                                    );
                                })()}
                                {/* Miolo: disco escuro + hora digital + dia (hoje em destaque). */}
                                <circle cx="150" cy="150" r="33" fill="rgba(10,15,28,0.72)" />
                                <circle cx="150" cy="150" r="3.5" fill="#fff" className="opacity-90" />
                                <text x="150" y="139" textAnchor="middle" dominantBaseline="middle" onClick={() => setDayNavOpen((o) => !o)} fill={isToday ? '#22d3ee' : '#fff'} fontSize="11.5" fontWeight="800" style={{ cursor: 'pointer' }}>{DAYS_FULL[selectedDay]}{isToday ? ' · hoje' : ''}</text>
                                <text x="150" y="161" textAnchor="middle" dominantBaseline="middle" fill="#fff" fontSize="21" fontWeight="900" style={{ letterSpacing: '1px' }}>{clockHHMM}</text>
                                <text x="150" y="178" textAnchor="middle" onClick={() => setDayNavOpen((o) => !o)} fill="rgba(255,255,255,0.45)" fontSize="8" fontWeight="700" style={{ cursor: 'pointer' }}>{classesToRender.filter((c: any) => (c.days || []).includes(selectedDay + 1)).length} evento(s)</text>
                            </svg>
                            {dayNavOpen && (
                                <>
                                    <button onClick={() => setSelectedDay((selectedDay + 6) % 7)} className="absolute left-[-8px] top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white/12 hover:bg-white/22 text-white flex items-center justify-center backdrop-blur-md border border-white/15 z-20 text-sm shadow-lg">&#8249;</button>
                                    <button onClick={() => setSelectedDay((selectedDay + 1) % 7)} className="absolute right-[-8px] top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white/12 hover:bg-white/22 text-white flex items-center justify-center backdrop-blur-md border border-white/15 z-20 text-sm shadow-lg">&#8250;</button>
                                </>
                            )}
                        </div>

                        {colorPickId !== null && (
                            <div className="w-full flex flex-wrap items-center justify-center gap-1.5">
                                {BASIC_COLORS.map((hex) => (
                                    <button key={hex} onClick={() => setClassColor(colorPickId as number, hex)} className="w-5 h-5 rounded-full border border-white/30 hover:scale-110 transition-transform shadow" style={{ background: hex }} title="Pintar a fatia" />
                                ))}
                            </div>
                        )}

                        {/* EVENTOS DO DIA — preenchidos pela Zaeon (somente leitura) */}
                        <div className="w-full mt-1 pt-3 border-t border-white/10">
                            {classesToRender.filter((c: any) => (c.days || []).includes(selectedDay + 1)).slice().sort((a: any, b: any) => (Number(a.hour) || 0) - (Number(b.hour) || 0)).map((c: any) => (
                                <div key={c.id} className="group flex items-center gap-2 py-1.5">
                                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: colorHex(c.color) }} />
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-baseline gap-2">
                                            <span className="text-[12px] font-bold text-white truncate">{c.name || 'Evento'}</span>
                                            <span className="text-[10px] font-mono text-white/45 shrink-0">{c.hour}h&#8211;{c.endHour}h</span>
                                        </div>
                                        {(c.teacher || c.room || c.detail) && <span className="block text-[10px] text-white/45 truncate">{[c.teacher, c.room, c.detail].filter(Boolean).join(' · ')}</span>}
                                    </div>
                                    <button onClick={(e) => handleDeleteClass(e, c.id)} className="opacity-0 group-hover:opacity-100 text-white/30 hover:text-rose-400 transition-all shrink-0" title="Remover"><X size={12} /></button>
                                </div>
                            ))}
                            {classesToRender.filter((c: any) => (c.days || []).includes(selectedDay + 1)).length === 0 && (
                                <div className="text-center text-white/30 text-[10px] font-medium py-3 leading-relaxed">Peça a Zaeon para montar seu dia &#10022;<br/><span className="text-white/20">ex.: &ldquo;adiciona Cálculo seg 8h com prof. Ana, sala 204&rdquo;</span></div>
                            )}
                        </div>
                    </div>

                    {currentClass && (
                        <div className="w-full max-w-[320px] flex items-center gap-2 rounded-full px-3 py-1.5 border border-white/20" style={{ background: colorHex(currentClass.color) }}>
                            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse shrink-0" />
                            <span className="text-[9px] font-black uppercase tracking-wider text-white truncate">{currentClass.name || 'Aula agora'}</span>
                            <span className="text-[9px] font-mono text-white/90 ml-auto shrink-0 whitespace-nowrap">{currentClass.hour}h&#8211;{currentClass.endHour}h{currentClass.room ? ` · ${currentClass.room}` : ''}</span>
                        </div>
                    )}
                </div>
            </div>

            
{/* MÓDULO DE AULAS DO ALUNO (Fase 3) — aulas enviadas pelos professores */}
            <div className="w-full max-w-[1180px] mb-12 z-20 relative">
                <StudentAulasModule />
            </div>

            {/* NEURAL EDITOR (Garantido no final) */}

        </div>
    );
}