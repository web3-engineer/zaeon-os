"use client";

import { avisar, tr } from "@/lib/ui/avisos";
import { useEffect, useState } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Users, BookOpen, AlertCircle, ArrowRight, Loader2, Key } from 'lucide-react';

export default function JoinClassPage({ params }: { params: { token: string } }) {
    const { token } = params;
    const { data: session, status } = useSession();
    const router = useRouter();

    const [classInfo, setClassInfo] = useState<any>(null);
    const [error, setError] = useState<string>("");
    const [loading, setLoading] = useState(true);
    const [joining, setJoining] = useState(false);

    useEffect(() => {
        if (!token) return;
        fetch('/api/student/join?token=' + token)
            .then(res => res.json())
            .then(data => {
                if (data.error) throw new Error(data.error);
                setClassInfo(data);
            })
            .catch(err => setError(err.message))
            .finally(() => setLoading(false));
    }, [token]);

    const handleJoin = async () => {
        if (!session) {
            signIn(undefined, { callbackUrl: window.location.href });
            return;
        }
        setJoining(true);
        try {
            // Apenas redireciona carregando o token. A matrícula oficial ocorrerá quando a agenda for preenchida!
            const roomTarget = classInfo?.room === 'humanity' ? 'humanities' : classInfo?.room;
            router.push(`/study-rooms/${roomTarget || 'cyber'}?pendingInvite=${token}`);
        } catch (err: any) {
            avisar(tr("avisos.falhaConvite", "Não deu pra abrir o convite: {{erro}}", { erro: String(err?.message ?? "") }), { tipo: "erro" });
        } finally {
            // delay on hiding just to pretend loading
        }
    };

    if (loading || status === "loading") {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <Loader2 size={48} className="animate-spin text-cyan-500 opacity-50" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white p-6 font-sans">
                <div className="bg-red-900/10 border border-red-500/20 rounded-[2rem] p-10 flex flex-col items-center text-center max-w-sm">
                    <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 mb-6 drop-shadow-[0_0_15px_rgba(239,68,68,0.3)]">
                        <AlertCircle size={32} />
                    </div>
                    <h2 className="text-xl font-black uppercase tracking-widest text-white mb-2">Acesso Inválido</h2>
                    <p className="text-xs text-white/50">{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white p-6 font-sans relative overflow-hidden">
            {/* Background elements */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-cyan-500/10 blur-[120px] rounded-full pointer-events-none" />
            
            <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-md bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-10 flex flex-col items-center text-center relative z-10 shadow-2xl"
            >
                <div className="w-16 h-16 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-6 drop-shadow-[0_0_20px_rgba(34,211,238,0.2)]">
                    <Key size={24} />
                </div>
                
                <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-cyan-400 mb-2">Convite de Estudo</h3>
                <h1 className="text-2xl font-black text-white mb-1 leading-tight">{classInfo?.subject}</h1>
                <p className="text-xs text-white/50 mb-8 max-w-[250px]">
                    Prof. <span className="text-white/80 font-bold">{classInfo?.teacherName}</span> convidou você para integrar sua turma em Zaeon {classInfo?.room?.toUpperCase()}.
                </p>

                {!session ? (
                    <button 
                        onClick={handleJoin}
                        className="w-full bg-white text-black font-black uppercase tracking-widest flex items-center justify-center gap-3 py-4 rounded-2xl hover:bg-cyan-400 transition-colors"
                    >
                        Criar Conta p/ Ingressar <ArrowRight size={16} />
                    </button>
                ) : (
                    <button 
                        onClick={handleJoin}
                        disabled={joining}
                        className="w-full bg-cyan-500 hover:bg-cyan-400 text-white font-black uppercase tracking-widest flex items-center justify-center gap-3 py-4 rounded-2xl transition-colors disabled:opacity-50"
                    >
                        {joining ? "Configurando Node..." : "Aceitar & Ingressar"} <ArrowRight size={16} />
                    </button>
                )}

                {!session && (
                    <p className="text-[9px] text-white/30 uppercase tracking-widest mt-6">
                        Ao prosseguir, uma nova identidade estudantil será gerada em nosso grid baseada na sua conta conectada.
                    </p>
                )}
            </motion.div>
        </div>
    );
}
