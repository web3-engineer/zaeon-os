"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    User, BookOpen, ChevronUp, ChevronDown, Mars, Venus, Upload,
    Fingerprint, Trophy, Flame, Zap, Star, Target, Send, X, Plus, ArrowUpRight, Calendar, Loader2, Check
} from 'lucide-react';
import Image from 'next/image';
import { useSession } from 'next-auth/react';
import GenderDNA from "@/components/sub/GenderDNA";
import { useDropzone } from 'react-dropzone';

// --- COMPONENTES VISUAIS (MANTIDOS INTACTOS) ---

const StringLine = ({ height }: { height: number }) => (
    <div className="absolute left-1/2 -translate-x-1/2 w-[1px] bg-slate-400/30 dark:bg-white/10 z-0 pointer-events-none"
        style={{ height: `${height}px`, top: `-${height}px` }} />
);

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

    const deleteHabit = (id: number) => setHabits(habits.filter(h => h.id !== id));

    return (
        <div className="w-full h-full bg-white/70 dark:bg-black/30 backdrop-blur-3xl border border-slate-300 dark:border-white/10 rounded-[1.5rem] p-6 shadow-lg flex flex-col relative overflow-hidden">
            <div className="flex flex-col gap-4 border-b border-slate-300/50 dark:border-white/10 pb-4 mb-4">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <Trophy size={18} className="text-yellow-500 fill-current" />
                        <span className="text-[12px] font-black uppercase tracking-[0.2em] text-slate-700 dark:text-slate-200">Objectives</span>
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{monthName}</span>
                </div>
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
            <div className="flex flex-col gap-3">
                <AnimatePresence>
                    {habits.map((habit) => (
                        <motion.div key={habit.id} className="flex items-center gap-4 group">
                            <div className="w-36 flex items-center justify-start gap-2 shrink-0">
                                <button onClick={() => deleteHabit(habit.id)} className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition-all"><X size={10} /></button>
                                <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 truncate">{habit.name}</span>
                            </div>
                            <div className="flex gap-2 w-full justify-between">
                                {habit.days.map((completed, dayIndex) => {
                                    const isFuture = weekData[dayIndex]?.isFuture;
                                    return (
                                        <motion.button
                                            key={dayIndex}
                                            whileTap={!isFuture ? { scale: 0.9 } : {}}
                                            onClick={() => toggleDay(habit.id, dayIndex)}
                                            className={`w-8 h-8 rounded-[6px] flex items-center justify-center transition-all duration-150 border ${completed ? 'bg-yellow-400 border-yellow-500 shadow-md shadow-yellow-500/20' : 'bg-slate-200 border-slate-300 dark:bg-white/10 dark:border-white/10 hover:border-yellow-400/50'} ${isFuture ? 'cursor-default' : 'cursor-pointer'}`}
                                        />
                                    );
                                })}
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
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

const SideModules = () => (
    <div className="flex flex-col gap-4 h-full">
        <div className="grid grid-cols-2 gap-4 shrink-0">
            <div className="bg-white/70 dark:bg-white/[0.03] border border-slate-300 dark:border-white/10 rounded-[1.5rem] p-4 flex flex-col justify-between backdrop-blur-xl shadow-md relative overflow-hidden group">
                <div className="flex justify-between items-start z-10"><span className="text-[8px] uppercase tracking-widest text-slate-400 font-bold">Streak</span><Flame size={16} className="text-orange-500 fill-orange-500/10" /></div>
                <div className="z-10 mt-2"><span className="text-3xl font-black text-slate-800 dark:text-white tracking-tighter">12</span></div>
            </div>
            <div className="bg-white/70 dark:bg-white/[0.03] border border-slate-300 dark:border-white/10 rounded-[1.5rem] p-4 flex flex-col justify-between backdrop-blur-xl shadow-md relative overflow-hidden group">
                <div className="flex justify-between items-start z-10"><span className="text-[8px] uppercase tracking-widest text-slate-400 font-bold">Level</span><Star size={16} className="text-indigo-500 fill-indigo-500/10" /></div>
                <div className="z-10 mt-2"><span className="text-3xl font-black text-slate-800 dark:text-white tracking-tighter">04</span></div>
            </div>
        </div>
        <div className="flex-1 bg-white/70 dark:bg-black/20 backdrop-blur-2xl border border-slate-300 dark:border-white/10 rounded-[1.5rem] p-5 flex flex-col shadow-sm min-h-0">
            <div className="flex items-center gap-2 mb-3 border-b border-slate-300/80 dark:border-white/5 pb-2 shrink-0">
                <div className="w-6 h-6 rounded-lg bg-yellow-500/10 flex items-center justify-center"><Zap size={12} className="text-yellow-600 dark:text-yellow-400 fill-current" /></div>
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

// --- COMPONENTE PRINCIPAL (ATUALIZADO) ---
export default function ProfileModule() {
    const { data: session, update } = useSession();
    const [weekData, setWeekData] = useState<any[]>([]);
    const [monthName, setMonthName] = useState("");

    // --- ESTADOS EDITÁVEIS ---
    const [name, setName] = useState("");
    const [studyArea, setStudyArea] = useState("");
    const [profileImage, setProfileImage] = useState<string | null>(null);
    const [torsoImage, setTorsoImage] = useState<string | null>(null);
    
    // Status de Salvamento
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);

    // Carrega os dados iniciais da sessão quando ela estiver disponível
    useEffect(() => {
        if (session?.user) {
            setName(session.user.name || "Operative");
            setStudyArea((session.user as any).course || "Computer Science");
            setProfileImage(session.user.image || null);
            setTorsoImage((session.user as any).torsoImage || "/assets/computer.png");
        }
    }, [session]);

    // Lógica do Calendário (Mantida igual)
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

    // Helper: Converte arquivo para Base64
    const convertToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = error => reject(error);
        });
    };

    // --- CONFIGURAÇÃO DROPZONE ---
    const onDropProfile = useCallback(async (acceptedFiles: File[]) => {
        const file = acceptedFiles[0];
        if (file) {
            const base64 = await convertToBase64(file);
            setProfileImage(base64);
        }
    }, []);

    const onDropTorso = useCallback(async (acceptedFiles: File[]) => {
        const file = acceptedFiles[0];
        if (file) {
            const base64 = await convertToBase64(file);
            setTorsoImage(base64);
        }
    }, []);

    const { getRootProps: getProfileProps, getInputProps: getProfileInput } = useDropzone({
        onDrop: onDropProfile, accept: { 'image/*': [] }, maxFiles: 1, noClick: !!profileImage
    });

    const { getRootProps: getTorsoProps, getInputProps: getTorsoInput } = useDropzone({
        onDrop: onDropTorso, accept: { 'image/*': [] }, maxFiles: 1, noDragEventsBubbling: true
    });

  // --- FUNÇÃO PARA SALVAR NO BANCO ---
    const handleSaveProfile = async () => {
        setIsSaving(true);
        try {
            // Mudamos a rota para /api/user/update e o método para POST
            const res = await fetch('/api/user/update', {
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name,
                    course: studyArea,
                    image: profileImage,
                    torsoImage: torsoImage
                })
            });

            if (res.ok) {
                setSaveSuccess(true);
                // Força o NextAuth a atualizar a sessão do lado do cliente com os novos dados
                await update({ name, course: studyArea, image: profileImage, torsoImage });
                setTimeout(() => setSaveSuccess(false), 3000);
            } else {
                console.error("Failed to update profile");
            }
        } catch (error) {
            console.error("Error updating profile", error);
        } finally {
            setIsSaving(false);
        }
    };

    const role = (session?.user as any)?.role || "ARCHITECT";

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

            {/* SEÇÃO DE IDENTIDADE COM EDIÇÃO REAL E CARD DE PREVIEW */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="w-full overflow-hidden rounded-[2.5rem] shadow-xl border border-slate-300 dark:border-white/10 bg-white/40 dark:bg-black/40 backdrop-blur-3xl min-h-[450px] mt-4 flex flex-col md:flex-row relative"
            >
                {/* --- LADO ESQUERDO: ÁREA DE IDENTIDADE E EDIÇÃO --- */}
                <div className="flex-[1.5] relative p-8 md:p-12 flex flex-col md:flex-row items-center justify-center gap-8 md:gap-12">

                    <div className="absolute top-8 left-10 opacity-5 text-6xl font-black uppercase tracking-tighter -rotate-3 pointer-events-none select-none text-black dark:text-white z-0">
                        {role}
                    </div>

                    {/* CARD DE DADOS EDITÁVEIS (Formulário) */}
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
                                {/* Subject Name Input */}
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

                                {/* Specialization Area Input */}
                                <div>
                                    <label className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1 mb-1.5 block">Specialization Area</label>
                                    <div className="bg-slate-100/80 dark:bg-black/30 border border-slate-200 dark:border-white/5 rounded-xl px-4 py-3 flex items-center gap-3 group focus-within:border-purple-500/50 transition-all">
                                        <BookOpen size={16} className="text-purple-500" />
                                        <input
                                            type="text"
                                            value={studyArea}
                                            onChange={(e) => setStudyArea(e.target.value)}
                                            className="w-full bg-transparent border-none text-[12px] font-bold focus:outline-none text-slate-800 dark:text-white uppercase tracking-tight"
                                        />
                                    </div>
                                </div>

                                {/* Save Button */}
                                <div className="pt-4 border-t border-slate-200 dark:border-white/10">
                                    <button 
                                        onClick={handleSaveProfile}
                                        disabled={isSaving}
                                        className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-4 rounded-xl text-xs uppercase tracking-wider transition-all shadow-lg flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isSaving ? (
                                            <><Loader2 className="animate-spin" size={16} /> Syncing...</>
                                        ) : saveSuccess ? (
                                            <><Check size={16} /> Protocol Updated</>
                                        ) : (
                                            "Save Identity Protocol"
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* --- LADO DIREITO: PREVIEW CARD (Idêntico ao Onboard Modal) --- */}
                <div {...getTorsoProps()} className="relative hidden lg:block border-l border-white/50 h-full w-[45%] overflow-hidden bg-gray-100 dark:bg-[#0b121f] group cursor-pointer shrink-0">
                    <input {...getTorsoInput()} />
                    {/* Imagem de Fundo (Torso) */}
                    <Image 
                        src={torsoImage || "/assets/computer.png"} 
                        alt="Torso Preview" 
                        fill 
                        className="object-cover object-top transition-all duration-700 group-hover:scale-105" 
                        priority 
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80" />

                    {/* Instrução Flutuante para Upload de Fundo */}
                    <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/20 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Upload size={12} className="text-white" />
                        <span className="text-[9px] font-bold text-white uppercase">Click to change background</span>
                    </div>

                    {/* Foto de Perfil (Face Circle) */}
                    <GenderDNA className="absolute top-[14%] left-[7%] z-30 w-24" />
                    <div {...getProfileProps()} className="absolute top-[15%] right-[10%] xl:right-[20%] z-30 w-32 h-32 md:w-40 md:h-40 rounded-full border-[4px] border-blue-400 bg-blue-50/80 dark:bg-blue-900/50 backdrop-blur-md flex flex-col items-center justify-center text-center p-2 shadow-2xl group/circle cursor-pointer overflow-hidden shrink-0 aspect-square">
                        <input {...getProfileInput()} />
                        {profileImage ? (
                            <Image src={profileImage} alt="Profile" fill className="object-cover rounded-full" />
                        ) : (
                            <div className="flex flex-col items-center">
                                <Upload size={24} className="text-blue-500 mb-2" />
                                <span className="text-[10px] font-bold text-blue-600 dark:text-blue-300 uppercase">Upload Face</span>
                            </div>
                        )}
                        <div className="absolute -bottom-3 bg-blue-600 p-2 rounded-full shadow-lg border-2 border-white/20 group-hover/circle:scale-110 transition-transform">
                            <Upload size={16} className="text-white" />
                        </div>
                    </div>

                    {/* Textos Informativos de Status (Substituídos por Nome/Curso) */}
                    <div className="absolute bottom-10 left-8 right-8 z-10 text-white">
                        <div className="inline-block px-2 py-1 bg-green-500/20 border border-green-500/30 rounded text-[10px] text-green-400 font-mono mb-2 backdrop-blur-md">
                            STATUS: {(studyArea || role).toUpperCase()}_MODE
                        </div>
                        <h2 className="text-3xl font-black truncate drop-shadow-lg">{name || 'Unknown Subject'}</h2>
                        <p className="text-[11px] text-gray-300 leading-relaxed font-medium mt-1">This is how your neural node will be identified across the community network.</p>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}