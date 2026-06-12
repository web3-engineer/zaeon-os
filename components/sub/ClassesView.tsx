"use client";

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  MapPin, User, Activity, Clock, ChevronUp, ChevronDown, 
  Power, Send, Sparkles, X,
  FileText, Plus, Database, Bot, File, Briefcase, Pen, Globe,
  Users, Layers, Share2, Copy, ArrowUpRight,
  Hash, UploadCloud, Trash2, Check, Brain, Cpu, Puzzle, ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSession } from 'next-auth/react';
import { useSearchParams, useRouter } from 'next/navigation';
import NextImage from 'next/image';
import { ProFeaturePanel } from '@/components/ui/ProFeaturePanel';

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
                                        <input value={chatMsg} onChange={(e) => setChatMsg(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && sendGroupMessage()} placeholder={`Message ${activeClass?.name} group...`} className="flex-1 bg-transparent px-4 text-xs font-medium text-slate-800 dark:text-white placeholder:text-slate-400 outline-none" />
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

export default function ClassesView({ room, themeColor = 'cyan' }: ClassesViewProps) {
    const t = getThemeClasses(themeColor);
    const { data: session, status } = useSession();
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

    const [liquidChatHistory, setLiquidChatHistory] = useState<{ role: 'user' | 'agent', text: string }[]>([
        { role: 'agent', text: "Zaeon initialized. Ready." }
    ]);
    const [zaeonInput, setZaeonInput] = useState("");
    const [isZaeonProcessing, setIsZaeonProcessing] = useState(false);

    const [storedPdfs, setStoredPdfs] = useState<StoredDoc[]>([]);
    
    // STATE - AI MODULES NO BACKPACK (Apenas 1 módulo inicial agora)
    const [userModules, setUserModules] = useState<UserModule[]>([
        { id: 1, title: "Personal Backpack", items: [] }
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
        if (status === 'loading') return;

        const loadLocal = () => {
            const savedClasses = localStorage.getItem('zaeon_schedule_data');
            const savedPluggedDay = localStorage.getItem('zaeon_plugged_day');
            const savedGadgetOn = localStorage.getItem('zaeon_gadget_on');
            
            const savedLiquidChat = localStorage.getItem('zaeon_liquid_chat');
            const savedDocs = localStorage.getItem('zaeon_stored_pdfs');
            const savedModules = localStorage.getItem('zaeon_user_modules');

            if (savedClasses) setClasses(JSON.parse(savedClasses));
            if (savedPluggedDay) setPluggedDay(JSON.parse(savedPluggedDay));
            if (savedGadgetOn) setGadgetOn(JSON.parse(savedGadgetOn));
            
            if (savedLiquidChat) setLiquidChatHistory(JSON.parse(savedLiquidChat));
            if (savedDocs) setStoredPdfs(JSON.parse(savedDocs));
            
            if (savedModules) {
                const parsedModules = JSON.parse(savedModules).filter((m: any) => m.id !== 2);
                setUserModules(parsedModules.length > 0 ? parsedModules : [{ id: 1, title: "Personal Backpack", items: [] }]);
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
                             setUserModules(p.length ? p : [{ id: 1, title: "Personal Backpack", items: [] }]);
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
    }, [session, status]);


    // SAVE DATA: Nuvem e Local
    useEffect(() => {
        if (isDataLoaded) {
            localStorage.setItem('zaeon_schedule_data', JSON.stringify(classes));
            localStorage.setItem('zaeon_plugged_day', JSON.stringify(pluggedDay));
            localStorage.setItem('zaeon_gadget_on', JSON.stringify(gadgetOn));
            localStorage.setItem('zaeon_liquid_chat', JSON.stringify(liquidChatHistory));
            localStorage.setItem('zaeon_stored_pdfs', JSON.stringify(storedPdfs));
            localStorage.setItem('zaeon_user_modules', JSON.stringify(userModules));

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
                name: name || "Nova aula",
                teacher: args?.teacher || "",
                room: args?.room || "",
                location: args?.room || "Online",
                days: [day],
                hour,
                endHour: hour + duration,
                duration,
                color: CLASS_COLORS[classes.length % CLASS_COLORS.length],
                isDraft: false,
            };
            setClasses(prev => [...prev, newClass]);
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
                    ...(args.teacher ? { teacher: args.teacher } : {}),
                    ...(args.room ? { room: args.room, location: args.room } : {}),
                    ...(hour ? { hour, endHour: hour + duration, duration } : {}),
                };
            }));
            return updated ? "✏️ Atualizei a aula na agenda." : "Não encontrei essa aula para atualizar.";
        }
        return "Ação de agenda não reconhecida.";
    };

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
            const response = await fetch('/api/ai/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: msg, agent: "core_active", systemContext: `${agendaContext} ${libraryContext}` }),
            });
            const data = await response.json();
            if (data?.toolCall?.name === 'update_schedule') {
                const applied = applyScheduleTool(data.toolCall.args);
                setLiquidChatHistory(prev => [...prev, { role: 'agent', text: applied }]);
            } else {
                setLiquidChatHistory(prev => [...prev, { role: 'agent', text: data.text || "Pronto." }]);
            }
        } catch (e) { setLiquidChatHistory(prev => [...prev, { role: 'agent', text: "Conexão offline." }]); } finally { setIsZaeonProcessing(false); }
    };

    const handleUserModuleDrop = (e: React.DragEvent, moduleId: number) => {
        e.preventDefault();
        const files = Array.from(e.dataTransfer.files);
        const newItems: UserItem[] = files.map(f => ({
            id: Math.random().toString(36).substr(2, 9), type: 'file', name: f.name, meta: (f.size / 1024 / 1024).toFixed(1) + 'mb'
        }));
        setUserModules(prev => prev.map(m => m.id === moduleId ? { ...m, items: [...m.items, ...newItems] } : m));
    };

    const deleteUserItem = (moduleId: number, itemId: string) => { setUserModules(prev => prev.map(m => m.id === moduleId ? { ...m, items: m.items.filter(i => i.id !== itemId) } : m)); };

    const handleAddLink = (moduleId: number) => { const url = prompt("Enter URL:"); if (url) { const name = prompt("Link Name:") || "Link"; setUserModules(prev => prev.map(m => m.id === moduleId ? { ...m, items: [...m.items, { id: Math.random().toString(36).substr(2, 9), type: 'link', name, meta: url }] } : m)); } };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, moduleId: number) => {
        if (e.target.files) {
            const files = Array.from(e.target.files);
            const newItems: UserItem[] = files.map(f => ({ id: Math.random().toString(36).substr(2, 9), type: 'file', name: f.name, meta: (f.size / 1024 / 1024).toFixed(1) + 'mb' }));
            setUserModules(prev => prev.map(m => m.id === moduleId ? { ...m, items: [...m.items, ...newItems] } : m));
        }
    };

    const handleLibraryUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files);
            const pdfs = files.filter(f => f.type === 'application/pdf').map(f => ({ id: Math.random().toString(36).substr(2, 9), title: f.name, type: 'pdf' as const, size: (f.size / 1024 / 1024).toFixed(1) + 'mb' }));
            setStoredPdfs(prev => [...prev, ...pdfs]);
        }
    };

    // Nova função: Deletar arquivo de PDF da Library
    const handleDeletePdf = (id: string) => {
        setStoredPdfs(prev => prev.filter(pdf => pdf.id !== id));
    };

    // Agora com Sábado e Domingo inclusos
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const minHour = 6;
    const maxHour = 22;
    const totalHours = maxHour - minHour;
    const hours = Array.from({ length: totalHours + 1 }, (_, i) => minHour + i);

    return (
        <div ref={constraintsRef} onClick={handleBackgroundClick} className="relative min-h-screen w-full flex flex-col items-center p-8 bg-transparent font-sans selection:bg-cyan-500/30 text-slate-900 dark:text-white transition-colors duration-500 overflow-x-hidden">
            <div className="h-10 pointer-events-none"></div>

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
                                        Para oficializar sua entrada na turma de <strong className="text-white">{invitedClass.teacherName}</strong>, use o botão <strong>+</strong> na agenda abaixo e registre <strong>exatamente os mesmos dados</strong> deste cartão.
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

            <div className="flex justify-start items-start gap-8 flex-wrap z-20 relative w-full max-w-[1400px] mx-auto pb-10 min-h-[400px]">

                {/* ZAEON CORE ACTIVE — largest block in the line (replaces the old Real-Time Tracker) */}
                <div className="w-[440px] h-[420px] bg-white/70 dark:bg-black/40 backdrop-blur-3xl border border-white/30 dark:border-white/10 rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden relative z-10">
                    <div className="h-16 border-b border-white/20 flex items-center px-6 gap-4 bg-white/10">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#8b5cf6] to-[#22d3ee] shadow-lg flex items-center justify-center border border-white/20"><Bot size={20} className="text-white" /></div>
                        <div className="flex flex-col">
                            <span className="text-sm font-black text-slate-800 dark:text-white tracking-widest uppercase">Zaeon</span>
                            <div className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span><span className="text-[9px] text-slate-500 dark:text-white/40 font-bold uppercase tracking-tighter">Core Active</span></div>
                        </div>
                    </div>
                    <div ref={zaeonChatScrollRef} className="flex-1 overflow-y-auto p-5 space-y-4 scrollbar-hide">{liquidChatHistory.map((m, i) => (<div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[85%] p-3.5 rounded-2xl text-xs leading-relaxed backdrop-blur-md shadow-sm ${m.role === 'user' ? 'bg-[#8b5cf6] text-white font-bold' : 'bg-white/80 dark:bg-white/5 text-slate-900 dark:text-white/90 border border-white/20'}`}>{m.text}</div></div>))}</div>
                    <div className="p-4 bg-white/10 border-t border-white/20">
                        <div className="flex items-center gap-2 bg-slate-200/50 dark:bg-black/30 rounded-full px-2 py-2 border border-white/30 dark:border-white/5">
                            <input value={zaeonInput} onChange={(e) => setZaeonInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleZaeonMessage()} className="bg-transparent flex-1 text-xs text-slate-900 dark:text-white px-3 outline-none placeholder:text-slate-500 dark:placeholder:text-white/20" placeholder="Pergunte ao Core Active…" disabled={isZaeonProcessing} />
                            <button onClick={handleZaeonMessage} disabled={isZaeonProcessing} className="w-9 h-9 rounded-full bg-[#8b5cf6] flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-lg"><Send size={14} className="text-white" /></button>
                        </div>
                    </div>
                </div>

                {/* SCHEDULE */}
                <motion.div ref={agendaRef} className="group w-[300px] h-[300px] relative z-10" onClick={(e) => e.stopPropagation()}>
                    <div className={`w-full h-full backdrop-blur-xl border border-white/10 p-5 rounded-[2.5rem] shadow-xl flex flex-col items-center justify-between relative overflow-hidden bg-[#0f172a]/95 dark:bg-black/40`}>
                        <div className="w-full flex justify-between items-center mb-2 pointer-events-none">
                            <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/60">Agenda</span>
                            {pluggedDay !== null && <div className={`w-1.5 h-1.5 ${t.fill} rounded-full animate-ping ${t.shadow}`}></div>}
                        </div>
                        <div className="w-full flex gap-2 justify-between h-full pointer-events-auto relative">
                            {/* Grid de Horas */}
                            <div className="absolute inset-0 flex flex-col-reverse justify-between opacity-10 pointer-events-none z-0">
                                {hours.map(h => <div key={h} className="w-full h-px bg-white"></div>)}
                            </div>
                            
                            {days.map((day, dIdx) => (
                                <div 
                                    key={day} 
                                    onClick={(e) => handleDayClick(e, dIdx)}
                                    className="flex flex-col h-full flex-1 items-center relative z-10 cursor-pointer hover:bg-white/5 transition-colors rounded-lg"
                                >
                                    {pluggedDay === dIdx && <div className={`absolute inset-0 rounded-lg transition-all duration-500 pointer-events-none bg-cyan-500/10 border border-cyan-500/30 shadow-[0_0_15px_rgba(34,211,238,0.2)] animate-pulse`} />}

                                    <div className="flex-1 w-full relative">
                                        {classesToRender.filter((c: any) => c.days.includes(dIdx + 1)).map((cls: any) => {
                                            const safeHour = cls.hour || minHour;
                                            const safeEndHour = cls.endHour || safeHour + 1;
                                            
                                            // Lógica de Renderização De baixo para cima
                                            const bottomPercent = ((safeHour - minHour) / totalHours) * 100;
                                            const heightPercent = ((safeEndHour - safeHour) / totalHours) * 100;
                                            const isSelected = selectedClass?.id === cls.id;
                                            const isPending = isSelected && (hasUnsavedChanges || cls.isDraft);
                                            
                                            return (
                                                <div
                                                    key={cls.id}
                                                    onClick={(e) => { e.stopPropagation(); setSelectedClass(cls); setHasUnsavedChanges(false); }}
                                                    className={`absolute left-0 right-0 rounded-[4px] cursor-pointer bg-gradient-to-br ${cls.color} transition-all shadow-sm border z-20
                                                        ${isSelected ? 'ring-2 ring-white scale-110 z-50 shadow-2xl' : 'hover:scale-105 border-white/10 opacity-80 hover:opacity-100'}
                                                        ${isPending ? 'animate-pulse opacity-100 border-yellow-400' : ''}
                                                    `}
                                                    style={{ bottom: `${Math.max(0, bottomPercent)}%`, height: `calc(${Math.max(0, heightPercent)}% - 2px)` }}
                                                />
                                            );
                                        })}
                                    </div>
                                    <div className="mt-2 w-full flex flex-col items-center justify-end h-8 relative">
                                        {pluggedDay === dIdx ? (<motion.div layoutId="gadget-fuse" onClick={(e) => {e.stopPropagation(); setPluggedDay(null);}} className="w-full h-6 bg-[#222] border-t-2 border-cyan-500 rounded-b-md shadow-[0_0_10px_#22d3ee] flex items-center justify-center cursor-pointer hover:bg-[#333]"><div className={`w-2 h-2 rounded-full ${gadgetOn ? 'bg-cyan-400 shadow-[0_0_5px_#22d3ee]' : 'bg-gray-600'}`}></div></motion.div>) : (<div className="w-full h-1 bg-white/10 rounded-full mb-1"></div>)}
                                        <span className={`text-[7px] font-bold transition-colors ${pluggedDay === dIdx ? 'text-cyan-300' : 'text-white/40'}`}>{day[0]}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </motion.div>

                {/* DETAILS CARD EDITÁVEL */}
                <motion.div className="group w-44 h-44 relative z-30" onClick={(e) => e.stopPropagation()}>
                    <div 
                        className={`w-full h-full bg-white/90 dark:bg-black/40 backdrop-blur-xl border border-slate-300 dark:border-white/10 p-5 rounded-[2.5rem] shadow-xl flex flex-col justify-between relative overflow-hidden transition-colors duration-500 cursor-pointer ${selectedClass ? `bg-gradient-to-br ${selectedClass.color.replace('from-', 'bg-').split(' ')[0]} bg-opacity-90 dark:bg-opacity-20` : ''}`}
                        onClick={handleCycleColor}
                    >
                        {selectedClass ? (
                            <>
                                <button onClick={(e) => { e.stopPropagation(); handleCloseDetails(); }} className="absolute top-4 right-4 z-50 text-slate-500 dark:text-white/50 hover:text-slate-800 dark:hover:text-white"><X size={12}/></button>
                                <div className={`absolute -top-10 -right-10 w-32 h-32 bg-gradient-to-br ${selectedClass.color} rounded-full blur-[40px] opacity-40 ${(hasUnsavedChanges || selectedClass.isDraft) ? 'animate-pulse' : ''} pointer-events-none`}></div>
                                
                                <div className="relative z-10 flex justify-between items-start mt-2" onClick={(e) => e.stopPropagation()}>
                                    <div className="flex items-center gap-1.5 bg-white/50 dark:bg-white/10 px-2 py-1 rounded-full border border-slate-200 dark:border-white/5">
                                        <MapPin size={10} className="text-slate-700 dark:text-white/80" />
                                        <input 
                                            type="text" 
                                            value={selectedClass.room}
                                            onChange={(e) => handleUpdateClass('room', e.target.value)}
                                            className="w-16 bg-transparent border-none outline-none text-[9px] font-bold text-slate-800 dark:text-white/90 placeholder-slate-400 dark:placeholder-white/50"
                                            placeholder="Room"
                                        />
                                    </div>
                                    <div className="flex gap-1 z-20">
                                        {(hasUnsavedChanges || selectedClass.isDraft) && (
                                            <button 
                                                onClick={handleSaveClass}
                                                className="p-1.5 bg-emerald-500/20 hover:bg-emerald-500/40 border border-emerald-500/30 rounded-full text-emerald-600 dark:text-emerald-400 transition-colors shadow-sm dark:shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                                                title="Save Class"
                                            >
                                                <Check size={12} />
                                            </button>
                                        )}
                                        <button 
                                            onClick={(e) => handleDeleteClass(e, selectedClass.id)}
                                            className="p-1.5 bg-red-500/10 hover:bg-red-500/20 dark:bg-red-500/20 dark:hover:bg-red-500/40 border border-red-500/30 rounded-full text-red-600 dark:text-red-400 transition-colors"
                                            title="Delete Class"
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
                                </div>

                                <div className="relative z-10 mt-2 flex flex-col gap-1" onClick={(e) => e.stopPropagation()}>
                                    <input 
                                        type="text"
                                        value={selectedClass.name}
                                        onChange={(e) => handleUpdateClass('name', e.target.value)}
                                        className="text-sm font-bold text-slate-900 dark:text-white leading-tight drop-shadow-sm dark:drop-shadow-md bg-transparent border-b border-transparent hover:border-slate-300 dark:hover:border-white/20 focus:border-slate-400 dark:focus:border-white/50 outline-none w-full transition-colors"
                                        placeholder="Class Name"
                                    />
                                    
                                    <div className="flex items-center gap-1.5 text-indigo-600 dark:text-cyan-300">
                                        <Clock size={12} />
                                        <div className="flex items-center gap-1">
                                            <input 
                                                type="number" 
                                                value={selectedClass.hour === "" ? "" : selectedClass.hour}
                                                onChange={(e) => handleUpdateClass('hour', e.target.value)}
                                                className="w-8 bg-transparent border-b border-transparent hover:border-indigo-300 dark:hover:border-cyan-300/30 focus:border-indigo-400 dark:focus:border-cyan-300 outline-none text-[10px] font-mono font-medium tracking-wide text-center"
                                                placeholder="8"
                                            />
                                            <span className="text-[10px] font-mono text-slate-600 dark:text-cyan-300">:00 - </span>
                                            <input 
                                                type="number" 
                                                value={selectedClass.endHour === "" ? "" : selectedClass.endHour}
                                                onChange={(e) => handleUpdateClass('endHour', e.target.value)}
                                                className="w-8 bg-transparent border-b border-transparent hover:border-indigo-300 dark:hover:border-cyan-300/30 focus:border-indigo-400 dark:focus:border-cyan-300 outline-none text-[10px] font-mono font-medium tracking-wide text-center"
                                                placeholder="10"
                                            />
                                            <span className="text-[10px] font-mono text-slate-600 dark:text-cyan-300">:00</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="relative z-10 bg-white/60 dark:bg-white/5 border border-slate-200 dark:border-white/10 p-2 rounded-xl flex items-center gap-2 backdrop-blur-md mt-auto" onClick={(e) => e.stopPropagation()}>
                                    <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-gradient-to-br dark:from-white/10 dark:to-transparent flex items-center justify-center text-slate-500 dark:text-white/70 shrink-0"><User size={10} /></div>
                                    <div className="flex flex-col min-w-0 w-full">
                                        <span className="text-[7px] uppercase text-slate-500 dark:text-white/30 font-bold">Mentor</span>
                                        <input 
                                            type="text"
                                            value={selectedClass.teacher}
                                            onChange={(e) => handleUpdateClass('teacher', e.target.value)}
                                            className="text-[9px] font-medium text-slate-800 dark:text-white/90 truncate bg-transparent border-b border-transparent hover:border-slate-300 dark:hover:border-white/20 focus:border-slate-400 dark:focus:border-white/50 outline-none w-full"
                                            placeholder="Teacher Name"
                                        />
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-slate-400 dark:text-white/20 gap-2 pointer-events-none">
                                <Plus size={16} className="text-slate-400 dark:text-white/40" />
                                <span className="text-[9px] font-bold uppercase tracking-widest text-center">Click empty day<br/>to add Class</span>
                            </div>
                        )}
                    </div>
                </motion.div>

                {/* PLUG (agenda gadget) */}
                <AnimatePresence>
                    {pluggedDay === null && (
                        <motion.div layoutId="gadget-fuse" drag onDragEnd={handleGadgetDragEnd} dragConstraints={constraintsRef} className="group w-16 h-24 relative z-50" onClick={(e) => e.stopPropagation()}>
                            <div className="w-full h-full bg-gradient-to-b from-[#333] to-[#111] border border-gray-600 rounded-md shadow-[0_10px_20px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.2)] flex flex-col items-center justify-between p-2 relative overflow-hidden">
                                <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-8 h-2 bg-yellow-600 rounded-t-sm shadow-sm"></div>
                                <button onClick={() => setGadgetOn(!gadgetOn)} className={`w-8 h-8 rounded-full border-2 border-[#444] shadow-[0_2px_5px_rgba(0,0,0,0.5)] flex items-center justify-center transition-all ${gadgetOn ? 'bg-cyan-900 shadow-[inset_0_0_8px_#06b6d4]' : 'bg-[#222]'}`}>
                                    <Power size={10} className={`transition-colors ${gadgetOn ? 'text-cyan-400' : 'text-gray-600'}`} />
                                </button>
                                <div className="w-full h-8 bg-black/60 rounded border border-white/5 flex items-center justify-center relative overflow-hidden">
                                    {gadgetOn && <div className="absolute inset-0 bg-cyan-500/20 animate-pulse"></div>}
                                    <div className={`w-full h-[1px] bg-gray-700`}><motion.div animate={{ width: gadgetOn ? "100%" : "0%" }} className="h-full bg-cyan-400 shadow-[0_0_5px_#22d3ee]" /></div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* 4. LIBRARY & PLUGINS (static row) */}
            <div className="w-full flex justify-center flex-wrap gap-6 py-10 relative z-20 max-w-[1400px] mx-auto">
                {/* LIBRARY MODULE */}
                <div onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); const files = Array.from(e.dataTransfer.files); const pdfs = files.filter(f => f.type === 'application/pdf').map(f => ({ id: Math.random().toString(36).substr(2, 9), title: f.name, type: 'pdf' as const, size: (f.size / 1024 / 1024).toFixed(1) + 'mb' })); setStoredPdfs(prev => [...prev, ...pdfs]); }} className="h-32 w-[340px] max-w-[450px] bg-white/70 dark:bg-black/60 backdrop-blur-3xl border border-white/40 dark:border-white/10 rounded-[1.8rem] p-4 flex flex-col relative shadow-2xl">
                    <div className="flex items-center justify-between mb-3 border-b border-white/20 pb-2">
                        <div className="flex items-center gap-2"><Database size={13} className="text-[#22d3ee]" /><span className="text-[10px] font-black uppercase tracking-widest">Library</span></div>
                    </div>
                    <div className="flex gap-2 items-center h-full overflow-x-auto scrollbar-hide pr-2">
                        {storedPdfs.map(pdf => (
                            <motion.div key={pdf.id} className="group/item w-20 h-20 bg-white/10 rounded-xl border border-white/20 flex flex-col items-center justify-center gap-0.5 p-2 relative">
                                <button onClick={(e) => { e.stopPropagation(); handleDeletePdf(pdf.id); }} className="absolute bottom-1 right-1 p-1 bg-red-500/80 hover:bg-red-600 text-white rounded-md opacity-0 group-hover/item:opacity-100 transition-opacity z-20">
                                    <Trash2 size={10} />
                                </button>
                                <FileText size={22} className="text-[#22d3ee]" />
                                <span className="text-[8px] text-slate-900 dark:text-white font-black truncate w-full block text-center">{pdf.title}</span>
                            </motion.div>
                        ))}
                        <label className="w-16 h-20 rounded-xl border-2 border-dashed border-white/30 flex items-center justify-center text-white hover:bg-white/10 hover:border-[#8b5cf6] cursor-pointer transition-all group/add shrink-0"><input type="file" className="hidden" accept=".pdf" onChange={handleLibraryUpload} /><Plus size={20} className="group-hover/add:scale-125 transition-transform" /></label>
                    </div>
                </div>

                {/* PLUGINS MODULE */}
                <div className="h-32 w-[260px] max-w-[450px] bg-white/70 dark:bg-black/60 backdrop-blur-3xl border border-white/40 dark:border-white/10 rounded-[1.8rem] p-4 flex flex-col relative shadow-2xl">
                    <div className="flex items-center justify-between mb-3 border-b border-white/20 pb-2">
                        <div className="flex items-center gap-2">
                            <Puzzle size={13} className="text-[#8b5cf6]" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Plugins</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* 5. BACKPACK MINIMALISTA (AGORA NA DIREITA PARA NÃO SOBREPOR AS IAs) */}
            <div className="w-full flex justify-end gap-8 pb-32 pr-4 lg:pr-20 flex-wrap relative z-20 max-w-[1400px]">
                {userModules.map((mod) => (
                    <motion.div 
                        key={mod.id} 
                        drag 
                        dragConstraints={constraintsRef} 
                        className="h-auto min-h-[160px] min-w-[280px] max-w-[400px] flex-1 bg-white/70 dark:bg-black/60 backdrop-blur-3xl border border-white/40 dark:border-white/10 rounded-[1.8rem] p-5 flex flex-col relative shadow-xl" 
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex flex-col h-28 mb-2 shrink-0">
                            <div className="flex items-center justify-between mb-3 border-b border-emerald-200/50 dark:border-white/20 pb-2">
                                <div className="flex items-center gap-2 w-full"><Briefcase size={14} className="text-emerald-500" /><span className="text-[10px] font-black uppercase tracking-widest">{mod.title}</span></div>
                                <span className="text-[8px] text-slate-400 dark:text-white/40 font-mono ml-2 whitespace-nowrap">{mod.items.length} ITEMS</span>
                            </div>
                            <div className="flex gap-2 items-center h-full overflow-x-auto scrollbar-hide pr-2">
                                {mod.items.map((item) => (
                                    <motion.div key={item.id} initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} onPointerDown={(e) => e.stopPropagation()} onClick={() => item.type === 'link' && window.open(item.meta, '_blank')} className={`group/file w-16 h-20 rounded-xl border flex flex-col items-center justify-center gap-1 p-2 relative cursor-pointer transition-all shrink-0 shadow-sm ${item.type === 'link' ? 'bg-blue-50/40 dark:bg-blue-900/10 border-blue-200/50 dark:border-blue-500/20' : 'bg-emerald-50/30 dark:bg-emerald-900/10 border-emerald-200/50 dark:border-emerald-500/20'}`}>
                                        <button onClick={(e) => { e.stopPropagation(); deleteUserItem(mod.id, item.id); }} className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover/file:opacity-100 shadow-lg hover:scale-110 transition-all z-30 border border-white/50"><X size={10} strokeWidth={3} /></button>
                                        {item.type === 'link' ? <Globe size={20} className="text-blue-500 dark:text-blue-400 relative z-10" /> : <FileText size={20} className="text-emerald-600 dark:text-emerald-400 drop-shadow-sm" />}
                                        <span className="text-[7px] text-slate-900 dark:text-white font-black text-center truncate w-full block px-0.5 mt-1">{item.name}</span>
                                    </motion.div>
                                ))}
                                <div className="flex flex-col gap-1 shrink-0 ml-1">
                                    <label onClick={(e) => e.stopPropagation()} className="w-8 h-8 rounded-lg border border-dashed border-emerald-300/50 dark:border-white/20 flex items-center justify-center text-emerald-500 dark:text-white hover:bg-emerald-50 dark:hover:bg-white/10 hover:border-emerald-500 cursor-pointer transition-all"><input type="file" className="hidden" multiple onChange={(e) => handleFileUpload(e, mod.id)} /><Plus size={14} /></label>
                                    <button onClick={(e) => {e.stopPropagation(); handleAddLink(mod.id);}} className="w-8 h-8 rounded-lg border border-dashed border-blue-300/50 dark:border-white/20 flex items-center justify-center text-blue-500 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-white/10 hover:border-blue-500 cursor-pointer transition-all"><Globe size={14} /></button>
                                </div>
                            </div>
                        </div>

                        {/* Barra AI Launcher Minimalista com Re-Foco */}
                        <div className="pt-3 mt-auto flex items-center justify-between border-t border-slate-200/50 dark:border-white/10">
                            <div className="flex items-center gap-1.5">
                                <Bot size={12} className="text-indigo-500" />
                                <span className="text-[8px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">AI Nodes</span>
                            </div>
                            <div className="flex gap-2">
                                {aiServices.map((ai) => (
                                    <button 
                                        key={ai.id}
                                        onClick={(e) => { 
                                            e.stopPropagation(); 
                                            const w = 420; 
                                            const h = 750;
                                            const left = 50; 
                                            const top = 100;

                                            // Lógica de RE-FOCO
                                            if (aiWindows.current[ai.id] && !aiWindows.current[ai.id]?.closed) {
                                                aiWindows.current[ai.id]?.focus();
                                            } else {
                                                aiWindows.current[ai.id] = window.open(
                                                    ai.url, 
                                                    ai.name, 
                                                    `width=${w},height=${h},left=${left},top=${top},menubar=no,toolbar=no,location=no,status=no`
                                                );
                                            }
                                        }}
                                        className={`w-9 h-9 rounded-full ${ai.color} text-white flex items-center justify-center shadow-md hover:scale-110 hover:shadow-xl transition-all border border-white/20 overflow-hidden`}
                                        title={`Launch ${ai.name}`}
                                    >
                                        {ai.logo ? (
                                            <NextImage src={ai.logo} alt={ai.name} width={20} height={20} className="w-5 h-5 object-contain invert opacity-90" onError={(e) => e.currentTarget.style.display='none'} />
                                        ) : (
                                            ai.fallbackIcon && <ai.fallbackIcon size={14} strokeWidth={3} />
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>

                    </motion.div>
                ))}
            </div>

            {/* COLLECTIVE BUILD ZONE — Pro-gated (CollectiveZone component above kept, not rendered) */}
            <div className="w-full flex justify-center pb-20 relative z-20">
                <ProFeaturePanel
                    title="Collective Build Node"
                    description="Ambiente coletivo para criar trabalhos em tempo real com seus amigos — disponível apenas no Pro."
                    tooltip="Recurso Pro — em breve"
                />
            </div>

            {/* NEURAL EDITOR (Garantido no final) */}

        </div>
    );
}