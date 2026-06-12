"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    User, BookOpen, ChevronUp, ChevronDown, Mars, Venus, Upload,
    Fingerprint, Trophy, Flame, Zap, Star, Target, Send, X, Plus, ArrowUpRight, Calendar
} from 'lucide-react';
import Image from 'next/image';
import { useSession } from 'next-auth/react';
import GenderDNA from "@/components/sub/GenderDNA";

// --- COMPONENTES VISUAIS ---

const StringLine = ({ height }: { height: number }) => (
    <div className="absolute left-1/2 -translate-x-1/2 w-[1px] bg-slate-400/30 dark:bg-white/10 z-0 pointer-events-none"
        style={{ height: `${height}px`, top: `-${height}px` }} />
);

// 1. GRÁFICO (Hero Section - Limpo e Imponente)
const FullWidthChart = () => {
    const dataPoints = useMemo(() => {
        const points = [];
        let value = 50;
        for (let i = 0; i < 365; i++) {
            const change = (Math.random() - 0.48) * 12;
            value += change;
            value = Math.max(10, Math.min(95, value));
            points.push(value);
        }
        return points;
    }, []);

    const svgPath = useMemo(() => {
        const step = 100 / (dataPoints.length - 1);
        let d = `M 0,${100 - dataPoints[0]} `;
        dataPoints.forEach((point, index) => {
            const x = index * step;
            const y = 100 - point;
            d += `L ${x},${y} `;
        });
        return d;
    }, [dataPoints]);

    const fillPath = `${svgPath} V 100 H 0 Z`;

    return (
        <div className="relative w-full h-80 overflow-hidden rounded-[2rem] bg-white/80 dark:bg-white/[0.02] border border-slate-300 dark:border-white/10 shadow-xl backdrop-blur-3xl group transition-all">
            <div className="absolute inset-0 w-full h-full pt-10 pr-0 pl-0">
                <svg viewBox="0 0 100 100" className="w-full h-full preserve-3d" preserveAspectRatio="none">
                    <defs>
                        <linearGradient id="chartGradient" x1="0" x2="0" y1="0" y2="1">
                            <stop offset="0%" stopColor="#facc15" stopOpacity="0.5" />
                            <stop offset="100%" stopColor="#facc15" stopOpacity="0" />
                        </linearGradient>
                    </defs>
                    <path d={fillPath} fill="url(#chartGradient)" className="opacity-50" />
                    <path d={svgPath} fill="none" stroke="#eab308" strokeWidth="0.15" vectorEffect="non-scaling-stroke" />
                </svg>
            </div>
        </div>
    );
};

// 2. MATRIZ DE OBJETIVOS (CORRIGIDA: GRID ACINZENTADO & ALINHADO)
const HabitMatrix = ({ weekData, monthName }: { weekData: any[], monthName: string }) => {
    const [habits, setHabits] = useState([
        { id: 1, name: "Deep Work Protocol", days: Array(7).fill(false) },
        { id: 2, name: "Neural Hydration", days: Array(7).fill(false) },
        { id: 3, name: "Sys Maintenance", days: Array(7).fill(false) },
    ]);
    const [newHabitName, setNewHabitName] = useState("");
    const [isAdding, setIsAdding] = useState(false);

    const toggleDay = (habitId: number, dayIndex: number) => {
        if (weekData[dayIndex]?.isFuture) return;
        setHabits(habits.map(h => h.id === habitId ? { ...h, days: h.days.map((d, i) => i === dayIndex ? !d : d) } : h));
    };

    const addHabit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newHabitName.trim()) return;
        setHabits([...habits, { id: Date.now(), name: newHabitName, days: Array(7).fill(false) }]);
        setNewHabitName("");
        setIsAdding(false);
    };

    const deleteHabit = (id: number) => {
        setHabits(habits.filter(h => h.id !== id));
    };

    return (
        <div className="w-full h-full bg-white/70 dark:bg-black/30 backdrop-blur-3xl border border-slate-300 dark:border-white/10 rounded-[1.5rem] p-6 shadow-lg flex flex-col relative overflow-hidden">

            {/* Header + Régua Integrada */}
            <div className="flex flex-col gap-4 border-b border-slate-300/50 dark:border-white/10 pb-4 mb-4">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <Trophy size={18} className="text-yellow-500 fill-current" />
                        <span className="text-[12px] font-black uppercase tracking-[0.2em] text-slate-700 dark:text-slate-200">Objectives</span>
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{monthName}</span>
                </div>

                {/* Régua de Dias Minimalista e Alinhada */}
                <div className="flex items-center gap-4">
                    <div className="w-36 shrink-0 flex items-center gap-2 text-slate-400">
                        <Calendar size={12} />
                        <span className="text-[9px] font-bold uppercase tracking-tighter">Week Cycle</span>
                    </div>
                    <div className="flex gap-2 w-full justify-between">
                        {weekData.map((day, i) => (
                            <div key={i} className="flex flex-col items-center w-8">
                                <span className={`text-[8px] font-bold uppercase ${day.isToday ? 'text-yellow-600' : 'text-slate-400'}`}>{day.dayName}</span>
                                <span className={`text-[11px] font-mono font-bold ${day.isToday ? 'text-slate-900 dark:text-white scale-110' : 'text-slate-400 dark:text-slate-600'}`}>{day.dayNumber}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Grid de Objetivos */}
            <div className="flex flex-col gap-3">
                <AnimatePresence>
                    {habits.map((habit) => (
                        <motion.div key={habit.id} className="flex items-center gap-4 group">
                            {/* Nome do Objetivo (Mais perto do grid) */}
                            <div className="w-36 flex items-center justify-start gap-2 shrink-0">
                                <button onClick={() => deleteHabit(habit.id)} className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition-all"><X size={10} /></button>
                                <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 truncate">{habit.name}</span>
                            </div>

                            {/* Quadrados (ESTILO GITHUB ACINZENTADO) */}
                            <div className="flex gap-2 w-full justify-between">
                                {habit.days.map((completed, dayIndex) => {
                                    const isFuture = weekData[dayIndex]?.isFuture;
                                    return (
                                        <motion.button
                                            key={dayIndex}
                                            whileTap={!isFuture ? { scale: 0.9 } : {}}
                                            onClick={() => toggleDay(habit.id, dayIndex)}
                                            className={`
                                                w-8 h-8 rounded-[6px] flex items-center justify-center transition-all duration-150 border
                                                ${completed
                                                    ? 'bg-yellow-400 border-yellow-500 shadow-md shadow-yellow-500/20' // MARCADO
                                                    : 'bg-slate-200 border-slate-300 dark:bg-white/10 dark:border-white/10 hover:border-yellow-400/50' // VAZIO (CINZA VISÍVEL)
                                                }
                                                ${isFuture ? 'cursor-default' : 'cursor-pointer'}
                                            `}
                                        />
                                    );
                                })}
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            {/* Initiate Objective (Inferior) */}
            <div className="mt-4 pt-3 border-t border-dashed border-slate-300/50 dark:border-white/10">
                {isAdding ? (
                    <form onSubmit={addHabit} className="relative w-full max-w-xs">
                        <input type="text" value={newHabitName} onChange={(e) => setNewHabitName(e.target.value)} placeholder="Objective name..." className="w-full bg-slate-50 dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-lg py-1.5 px-3 text-[10px] font-bold text-slate-800 dark:text-white focus:outline-none focus:border-yellow-500" autoFocus />
                        <button type="button" onClick={() => setIsAdding(false)} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><X size={12} /></button>
                    </form>
                ) : (
                    <button onClick={() => setIsAdding(true)} className="flex items-center gap-2 text-[9px] font-bold text-slate-500 hover:text-yellow-600 transition-all uppercase tracking-wider">
                        <div className="w-5 h-5 rounded bg-slate-200 dark:bg-white/10 flex items-center justify-center"><Plus size={10} /></div>
                        Initiate Objective
                    </button>
                )}
            </div>
        </div>
    );
};

// 3. LATERAL (Stats + Chatbot)
const SideModules = () => (
    <div className="flex flex-col gap-4 h-full">
        <div className="grid grid-cols-2 gap-4 shrink-0">
            <div className="bg-white/70 dark:bg-white/[0.03] border border-slate-300 dark:border-white/10 rounded-[1.5rem] p-4 flex flex-col justify-between backdrop-blur-xl shadow-md relative overflow-hidden group">
                <div className="flex justify-between items-start z-10">
                    <span className="text-[8px] uppercase tracking-widest text-slate-400 font-bold">Streak</span>
                    <Flame size={16} className="text-orange-500 fill-orange-500/10" />
                </div>
                <div className="z-10 mt-2">
                    <span className="text-3xl font-black text-slate-800 dark:text-white tracking-tighter">12</span>
                </div>
            </div>
            <div className="bg-white/70 dark:bg-white/[0.03] border border-slate-300 dark:border-white/10 rounded-[1.5rem] p-4 flex flex-col justify-between backdrop-blur-xl shadow-md relative overflow-hidden group">
                <div className="flex justify-between items-start z-10">
                    <span className="text-[8px] uppercase tracking-widest text-slate-400 font-bold">Level</span>
                    <Star size={16} className="text-indigo-500 fill-indigo-500/10" />
                </div>
                <div className="z-10 mt-2">
                    <span className="text-3xl font-black text-slate-800 dark:text-white tracking-tighter">04</span>
                </div>
            </div>
        </div>

        <div className="flex-1 bg-white/70 dark:bg-black/20 backdrop-blur-2xl border border-slate-300 dark:border-white/10 rounded-[1.5rem] p-5 flex flex-col shadow-sm min-h-0">
            <div className="flex items-center gap-2 mb-3 border-b border-slate-300/80 dark:border-white/5 pb-2 shrink-0">
                <div className="w-6 h-6 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                    <Zap size={12} className="text-yellow-600 dark:text-yellow-400 fill-current" />
                </div>
                <span className="text-[10px] font-bold text-slate-700 dark:text-white uppercase tracking-wider">Neural Assistant</span>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 mb-3 pr-1 text-[10px] text-slate-600 dark:text-slate-400">
                <p className="bg-slate-50 dark:bg-white/5 p-3 rounded-2xl rounded-tl-sm border border-slate-100 dark:border-white/5">Consistency at 100% today. Protocol maintenance active.</p>
            </div>
            <div className="relative shrink-0">
                <input type="text" placeholder="Command..." className="w-full bg-slate-50 dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-xl py-2.5 pl-3 pr-8 text-[10px] font-bold text-slate-800 dark:text-white focus:outline-none focus:border-yellow-500" />
                <button className="absolute right-2.5 top-1/2 -translate-y-1/2 text-yellow-500 hover:scale-110 transition-all"><Send size={12} /></button>
            </div>
        </div>
    </div>
);

// 4. ESTEIRA DE PERFIS
const PeopleStream = () => {
    const users = [
        { id: '1', name: 'Sarah Jenkins', role: 'Analyst', level: 12 },
        { id: '2', name: 'Alice Chen', role: 'Researcher', level: 9 },
        { id: '3', name: 'Elena R.', role: 'Dev', level: 7 },
        { id: '4', name: 'Marcus Vo', role: 'Architect', level: 5 },
        { id: '5', name: 'David K.', role: 'Student', level: 3 },
    ].sort((a, b) => b.level - a.level);

    return (
        <div className="w-full mt-4">
            <h3 className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400 mb-4 px-2">Network Rank</h3>
            <div className="flex gap-4 overflow-x-auto custom-scrollbar pb-6 px-1">
                <div className="min-w-[140px] h-[180px] bg-slate-800 rounded-[1.5rem] p-4 flex flex-col items-center justify-center gap-3 cursor-pointer shadow-lg relative group overflow-hidden shrink-0 border border-slate-700">
                    <div className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-md border border-white/20 p-0.5 mb-1"><div className="w-full h-full rounded-full bg-slate-700 overflow-hidden flex items-center justify-center"><User className="text-white w-8 h-8" /></div></div>
                    <div className="text-center"><span className="text-[10px] font-black text-white block uppercase">You</span><span className="text-[9px] font-bold text-slate-400 uppercase">Online</span></div>
                </div>
                {users.map((user, index) => (
                    <div key={user.id} className="min-w-[140px] h-[180px] bg-white/80 dark:bg-white/[0.02] backdrop-blur-xl border border-slate-300 dark:border-white/5 rounded-[1.5rem] p-4 flex flex-col items-center justify-center gap-2 cursor-pointer hover:-translate-y-1 transition-all shadow-sm group relative shrink-0">
                        <div className="absolute top-3 left-3 w-5 h-5 bg-slate-200 dark:bg-white/10 rounded-full flex items-center justify-center text-[9px] font-black text-slate-500 border border-slate-300 dark:border-white/5">{index + 1}</div>
                        <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-white/5 mb-1.5 overflow-hidden border border-slate-200 dark:border-white/10 flex items-center justify-center group-hover:border-yellow-400/50 transition-colors"><User className="w-6 h-6 text-slate-400" /></div>
                        <div className="text-center w-full">
                            <span className="text-[10px] font-bold text-slate-700 dark:text-slate-200 truncate block w-full px-1">{user.name}</span>
                            <span className="inline-block text-[8px] font-mono font-bold text-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-100">LVL {user.level}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// --- COMPONENTE PRINCIPAL ---
function ProfileModule() {
    const { data: session } = useSession();
    const [weekData, setWeekData] = useState<any[]>([]);
    const [monthName, setMonthName] = useState("");

    useEffect(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        setMonthName(today.toLocaleDateString('en-US', { month: 'long' }).toUpperCase());
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());
        const days = Array.from({ length: 7 }).map((_, i) => {
            const date = new Date(startOfWeek);
            date.setDate(startOfWeek.getDate() + i);
            return {
                dayName: date.toLocaleDateString('en-US', { weekday: 'narrow' }),
                dayNumber: date.getDate(),
                isToday: date.getTime() === today.getTime(),
                isFuture: date.getTime() > today.getTime()
            };
        });
        setWeekData(days);
    }, []);

    const [name, setName] = useState(session?.user?.name || "Operative");
    const studyArea = (session?.user as any)?.course || "Computer Science";
    const role = (session?.user as any)?.role || "ARCHITECT";
    const torsoImage = (session?.user as any)?.torsoImage || "/assets/computer.png";
    const profileImage = session?.user?.image || null;

    return (
        <div className="w-full h-full flex flex-col gap-10 overflow-y-auto custom-scrollbar p-1 pb-24 font-sans bg-transparent">
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="w-full flex flex-col gap-6">
                <FullWidthChart />
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
                    <div className="lg:col-span-2 h-full"><HabitMatrix weekData={weekData} monthName={monthName} /></div>
                    <div className="h-full"><SideModules /></div>
                </div>
                <PeopleStream />
            </motion.div>

            {/* 2. SEÇÃO DE IDENTIDADE (REESTRUTURADA: Foto ao lado do Card) */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="w-full overflow-hidden rounded-[2.5rem] shadow-xl border border-slate-300 dark:border-white/10 bg-white/40 dark:bg-black/40 backdrop-blur-3xl min-h-[450px] mt-4 flex flex-col md:flex-row"
            >
                {/* --- LADO ESQUERDO: ÁREA DE IDENTIDADE INTEGRADA --- */}
                <div className="flex-[1.5] relative p-8 md:p-12 flex flex-col md:flex-row items-center justify-center gap-8 md:gap-12">

                    {/* Background Typography (Role) */}
                    <div className="absolute top-8 left-10 opacity-5 text-6xl font-black uppercase tracking-tighter -rotate-3 pointer-events-none select-none text-black dark:text-white z-0">
                        {role}
                    </div>

                    {/* BOLINHA DE PERFIL (Agora ao lado do card) */}
                    <motion.div
                        whileHover={{ scale: 1.05 }}
                        className="relative z-20 shrink-0"
                    >
                        <GenderDNA className="mb-3 w-28" />
                        <div className="w-32 h-32 md:w-44 md:h-44 rounded-full border-[6px] border-white dark:border-white/10 bg-slate-200 dark:bg-white/5 backdrop-blur-xl flex items-center justify-center shadow-2xl overflow-hidden shrink-0 aspect-square relative">
                            {profileImage ? (
                                <Image src={profileImage} alt="Profile" fill className="object-cover rounded-full" />
                            ) : (
                                <User size={48} className="text-slate-400 dark:text-slate-600" />
                            )}

                            {/* Botão de Upload Flutuante */}
                            <button className="absolute -bottom-2 right-2 bg-blue-600 text-white p-2.5 rounded-full shadow-lg border-2 border-white dark:border-slate-900 hover:bg-blue-500 transition-colors">
                                <Upload size={16} />
                            </button>
                        </div>
                    </motion.div>

                    {/* CARD DE DADOS (Identity Protocol) */}
                    <div className="w-full max-w-sm z-10">
                        <div className="relative w-full bg-white/80 dark:bg-[#1e293b]/60 backdrop-blur-2xl rounded-[2rem] p-8 border border-slate-300 dark:border-white/10 shadow-md">
                            <StringLine height={80} />

                            <div className="flex items-center justify-between mb-6 border-b border-dashed border-slate-300 dark:border-white/10 pb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm animate-pulse" />
                                    <span className="text-[10px] font-black tracking-widest text-slate-500 dark:text-slate-400 uppercase">Identity Protocol</span>
                                </div>
                                <Fingerprint size={18} className="text-slate-400" />
                            </div>

                            <div className="space-y-6">
                                {/* Nome com Label Apple Style */}
                                <div>
                                    <label className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1 mb-1.5 block">Subject Name</label>
                                    <div className="bg-slate-100/80 dark:bg-black/30 rounded-xl border border-slate-200 dark:border-white/5 px-4 py-3 flex items-center gap-3 group focus-within:border-blue-500/50 transition-all">
                                        <User size={16} className="text-blue-500" />
                                        <input
                                            type="text"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            className="w-full bg-transparent border-none text-[12px] font-bold focus:outline-none text-slate-800 dark:text-white uppercase tracking-tight"
                                        />
                                    </div>
                                </div>

                                {/* Knowledge Area */}
                                <div>
                                    <label className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1 mb-1.5 block">Specialization Area</label>
                                    <div className="bg-slate-100/80 dark:bg-black/30 border border-slate-200 dark:border-white/5 rounded-xl px-4 py-3 flex items-center gap-3 group focus-within:border-purple-500/50 transition-all">
                                        <BookOpen size={16} className="text-purple-500" />
                                        <input
                                            type="text"
                                            value={studyArea}
                                            readOnly // ou remova se quiser editável
                                            className="w-full bg-transparent border-none text-[12px] font-bold focus:outline-none text-slate-800 dark:text-white uppercase tracking-tight"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* --- LADO DIREITO: CORPO/ESTÉTICA (Reduzido para 30%) --- */}
                <div className="relative hidden lg:block w-[30%] border-l border-slate-300 dark:border-white/5 h-full bg-slate-100 dark:bg-[#0b121f]">
                    <Image
                        src={torsoImage}
                        alt="Torso Preview"
                        fill
                        className="object-cover object-top opacity-80 dark:opacity-60"
                        priority
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-200 dark:from-black via-transparent to-transparent" />

                    <div className="absolute bottom-10 left-8 right-8 z-10">
                        <div className="bg-white/20 dark:bg-black/40 backdrop-blur-md border border-white/20 p-4 rounded-2xl">
                            <span className="text-[9px] font-black text-slate-500 dark:text-blue-400 uppercase tracking-[0.2em] mb-1 block">Status</span>
                            <h4 className="text-sm font-bold text-slate-800 dark:text-white uppercase">Neural Node Active</h4>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 leading-tight">Subject is currently synchronized with the Zaeon community protocol.</p>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}

export default ProfileModule;