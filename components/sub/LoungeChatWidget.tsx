"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter, usePathname } from "next/navigation";
import Image from "next/image";
import { useSession } from "next-auth/react";
import PusherClient from "pusher-js";
import {
    ChatBubbleLeftRightIcon,
    MinusIcon,
    UserIcon,
    ChevronLeftIcon,
    PaperAirplaneIcon,
    BellAlertIcon,
    UsersIcon,
    MagnifyingGlassIcon,
    UserPlusIcon,
    AcademicCapIcon,
    ArrowsRightLeftIcon
} from "@heroicons/react/24/outline";
// 🔥 ADICIONADO: Mic e MicOff
import { Bot, Mic, MicOff } from "lucide-react";
import ZaeonLogo from "@/components/main/ZaeonLogo";
import ZaeonTriangle from "@/components/main/ZaeonTriangle";
import type { AIState } from "@/components/main/ZaeonLogo";

const TypewriterText = ({ text, onComplete }: { text: string, onComplete: () => void }) => {
    const [displayedText, setDisplayedText] = useState("");
    const index = useRef(0);

    useEffect(() => {
        setDisplayedText("");
        index.current = 0;
        
        const interval = setInterval(() => {
            if (index.current < text.length) {
                setDisplayedText(prev => prev + text.charAt(index.current));
                index.current++;
            } else {
                clearInterval(interval);
                onComplete();
            }
        }, 15);

        return () => clearInterval(interval);
    }, [text, onComplete]);

    return <span>{displayedText}</span>;
};

interface LoungeChatWidgetProps {
    defaultOpen?: boolean;
}

// Mock do perfil da Zaeon para o Chat
const ZAEON_AGENT = {
    id: 'zaeon-agent',
    name: 'Zaeon',
    image: null,
    isAgent: true
};

export const LoungeChatWidget = ({ defaultOpen = false }: LoungeChatWidgetProps) => {
    const router = useRouter();
    const pathname = usePathname(); // 🔥 Consciência da página atual
    const { data: session, status } = useSession();
    // @ts-ignore
    const fallbackId = session?.user?.id || "";
    const isTeacher = (session?.user as any)?.role === "teacher" || (session?.user as any)?.role === "professor";

    const [isOpen, setIsOpen] = useState(defaultOpen);
    const [widgetPosition, setWidgetPosition] = useState<'right' | 'left'>('right'); // 🔥 Estado de Posição L/R

    const [activeTab, setActiveTab] = useState<'friends' | 'requests' | 'teachers'>('friends');
    const [activeChat, setActiveChat] = useState<any | null>(null);
    const [messageInput, setMessageInput] = useState("");

    const [realUserId, setRealUserId] = useState<string>(fallbackId);

    // Estados da API & Notificações
    const [incomingRequest, setIncomingRequest] = useState<any>(null);
    const [friends, setFriends] = useState<any[]>([]);
    const [teachers, setTeachers] = useState<any[]>([]);
    const [students, setStudents] = useState<any[]>([]);
    const [chatHistory, setChatHistory] = useState<any[]>([]);

    // 🔥 Estado exclusivo para a memória da Zaeon
    const [zaeonMessages, setZaeonMessages] = useState<any[]>([]);
    const [isZaeonTyping, setIsZaeonTyping] = useState(false);
    const [aiState, setAiState] = useState<AIState>("idle");
    const [currentlyTypingMsgId, setCurrentlyTypingMsgId] = useState<number | string | null>(null);

    // 🔥 NOVOS ESTADOS PARA O MICROFONE
    const [isListening, setIsListening] = useState(false);
    const recognitionRef = useRef<any>(null);

    // Estados para Modo Professor
    const [studentSearchQuery, setStudentSearchQuery] = useState("");
    const [studentSearchResults, setStudentSearchResults] = useState<any[]>([]);
    const [isStudentSearching, setIsStudentSearching] = useState(false);
    const [addingStudentId, setAddingStudentId] = useState<string | null>(null);

    const activeChatRef = useRef(activeChat);
    const [unreadCount, setUnreadCount] = useState(0);
    const [flash, setFlash] = useState(false);
    const [deepMode, setDeepMode] = useState(false); // pensamento profundo (Gemini Pro em chunks)

    const messagesEndRef = useRef<HTMLDivElement>(null);

    // 🔥 SAUDAÇÃO INICIAL DO AGENTE + NOTIFICAÇÃO
    useEffect(() => {
        if (status === "authenticated" && session?.user && zaeonMessages.length === 0) {
            const timer = setTimeout(() => {
                const userName = session?.user?.name;
                const firstName = userName ? userName.split(" ")[0] : "Operador";

                setZaeonMessages([
                    { id: 'intro', senderId: 'zaeon-agent', text: `Oi, ${firstName}. Que bom te ver por aqui. Eu sou a Zaeon e fico do seu lado pra ajudar no que você precisar — me conta, o que você quer fazer hoje?` }
                ]);

                if (!isOpen) {
                    setUnreadCount(prev => prev + 1);
                    setFlash(true);
                    setTimeout(() => setFlash(false), 1500);
                }
            }, 3000);

            return () => clearTimeout(timer);
        }
    }, [status, session, zaeonMessages.length, isOpen]);

    useEffect(() => {
        activeChatRef.current = activeChat;
        if (isOpen) setUnreadCount(0);
    }, [activeChat, isOpen]);

    useEffect(() => {
        if (isOpen && activeChat) {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }
    }, [chatHistory, zaeonMessages, isZaeonTyping, isOpen, activeChat]);

    // 🔥 LÓGICA DE RECONHECIMENTO DE VOZ
    useEffect(() => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (SpeechRecognition) {
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.continuous = true;
            recognitionRef.current.interimResults = true;
            recognitionRef.current.lang = 'pt-BR';

            recognitionRef.current.onresult = (event: any) => {
                let transcript = "";
                for (let i = event.resultIndex; i < event.results.length; i++) {
                    transcript += event.results[i][0].transcript;
                }
                setMessageInput(transcript);
            };

            recognitionRef.current.onerror = (event: any) => {
                console.error("Erro no reconhecimento de voz:", event.error);
                setIsListening(false);
            };

            recognitionRef.current.onend = () => {
                setIsListening(false);
            };
        }
    }, []);

    const toggleListening = () => {
        if (isListening) {
            recognitionRef.current?.stop();
            setIsListening(false);
        } else {
            setMessageInput(""); // Limpa o input ao começar a ouvir
            recognitionRef.current?.start();
            setIsListening(true);
        }
    };

    // 1. INICIALIZAÇÃO DO PUSHER (WEB SOCKET HUMANOS)
    useEffect(() => {
        if (!realUserId) return;
        const pusher = new PusherClient(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
            cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
        });
        const channel = pusher.subscribe(`user_${realUserId}`);
        channel.bind('new-message', (newMessage: any) => {
            if (activeChatRef.current?.id === newMessage.senderId) {
                setChatHistory(prev => prev.find(msg => msg.id === newMessage.id) ? prev : [...prev, newMessage]);
            } else {
                setUnreadCount(prev => prev + 1);
                setFlash(true);
                setTimeout(() => setFlash(false), 1500);
            }
        });
        return () => { pusher.unsubscribe(`user_${realUserId}`); pusher.disconnect(); };
    }, [realUserId]);

    // 2. BUSCA DE COLEGAS
    useEffect(() => {
        const fetchFriends = async () => {
            try {
                const res = await fetch(`/api/network/friends?t=${Date.now()}`, { cache: 'no-store' });
                if (res.ok) {
                    const data = await res.json();
                    if (data.myId) setRealUserId(data.myId);
                    setFriends(data.friends || []);
                    setTeachers(data.teachers || []);
                    setStudents(data.students || []);
                }
            } catch (error) { console.error(error); }
        };
        if ((isOpen && activeTab === 'friends' && !activeChat) || !realUserId) fetchFriends();
    }, [isOpen, activeTab, activeChat, realUserId]);

    // 3. RADAR DE PEDIDOS
    useEffect(() => {
        const fetchNetworkActivity = async () => {
            try {
                const resIn = await fetch(`/api/network/request?t=${Date.now()}`, { cache: 'no-store' });
                if (resIn.ok) {
                    const dataIn = await resIn.json();
                    if (dataIn && dataIn.length > 0) {
                        if (!incomingRequest) { setFlash(true); setTimeout(() => setFlash(false), 1500); }
                        setIncomingRequest({
                            id: dataIn[0].id, senderId: dataIn[0].senderId, senderName: dataIn[0].sender?.name || "Agente",
                            senderImage: dataIn[0].sender?.image || "", message: dataIn[0].message
                        });
                        if (!isTeacher && !activeChat && isOpen) setActiveTab('requests');
                    } else { setIncomingRequest(null); }
                }
            } catch (error) { console.error(error); }
        };
        fetchNetworkActivity();
        const interval = setInterval(fetchNetworkActivity, 10000);
        return () => clearInterval(interval);
    }, [activeChat, isOpen, incomingRequest, isTeacher]);

    // 4. BUSCA INICIAL DE MENSAGENS (Humanos Apenas)
    useEffect(() => {
        if (!isOpen || !activeChat || activeChat.isAgent) return;
        const fetchMessages = async () => {
            try {
                const res = await fetch(`/api/chat/messages?targetId=${activeChat.id}&t=${Date.now()}`, { cache: 'no-store' });
                if (res.ok) {
                    const data = await res.json();
                    setChatHistory(data);
                }
            } catch (error) { console.error(error); }
        };
        fetchMessages();
        const interval = setInterval(fetchMessages, 10000);
        return () => clearInterval(interval);
    }, [isOpen, activeChat]);

    // 🔥 5. FUNÇÃO DE ENVIAR MENSAGEM (Híbrida: Humano vs Zaeon) 🔥
    const handleSendMessage = async () => {
        if (!messageInput.trim() || !activeChat) return;

        // Desliga o microfone se enviar a mensagem enquanto fala
        if (isListening) {
            toggleListening();
        }

        const text = messageInput.trim();
        setMessageInput("");

        const optimisticMsg = {
            id: `opt_${Date.now()}`,
            senderId: realUserId,
            text: text,
        };

        if (activeChat.isAgent) {
            // ---> FLUXO ZAEON (IA) <---
            setZaeonMessages(prev => [...prev, optimisticMsg]);
            setIsZaeonTyping(true);
            setAiState("thinking");

            try {
                // 1. Resgata a memória do utilizador gravada no Onboarding
                let savedOnboardingData = {};
                if (typeof window !== 'undefined') {
                    savedOnboardingData = JSON.parse(localStorage.getItem('zaeon_onboarding') || '{}');
                }

                // 2. Formata o histórico da conversa para o formato que o Gemini exige
                const chatHistoryForGemini = zaeonMessages.slice(1).map(msg => ({
                    role: msg.senderId === 'zaeon-agent' ? 'model' : 'user',
                    parts: [{ text: msg.text }]
                }));

                const userName = session?.user?.name || "Operador";

                if (deepMode) {
                    // 🔥 MODO PROFUNDO — Gemini Pro em CHUNKS (plano → resposta), cada chamada curta.
                    const ctx = `Usuário: ${userName}. Página: ${pathname}.`;
                    const planRes = await fetch('/api/ai/deepthink', {
                        method: 'POST', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ step: 'plan', prompt: text, context: ctx }),
                    });
                    const planData = await planRes.json().catch(() => ({}));
                    const ansRes = await fetch('/api/ai/deepthink', {
                        method: 'POST', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ step: 'answer', prompt: text, plan: planData.plan || '', context: ctx }),
                    });
                    const ansData = await ansRes.json().catch(() => ({}));
                    const msgId = Date.now();
                    setCurrentlyTypingMsgId(msgId);
                    setZaeonMessages(prev => [...prev, { id: msgId, senderId: 'zaeon-agent', text: ansData.text || "Não consegui aprofundar agora. Tenta de novo?" }]);
                    setAiState("executing");
                } else {
                    // 3. Dispara para a rota com Contexto, Memória e Histórico (Flash)
                    const res = await fetch('/api/ai/chat', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            prompt: text,
                            agent: "zaeon",
                            userData: savedOnboardingData, // 🔥 Memória injetada!
                            history: chatHistoryForGemini, // 🔥 Histórico do chat injetado!
                            systemContext: `Você é a Zaeon. O usuário com quem você está falando se chama ${userName}. O usuário está neste momento na rota/página: ${pathname}. Se ele perguntar sobre o que ele pode fazer aqui ou pedir ajuda contextual, use essa rota como base para explicar a interface ou funcionalidades desta área específica do sistema.`
                        })
                    });

                    if (!res.ok) throw new Error("Falha de comunicação com o núcleo neural.");

                    const data = await res.json();
                    const msgId = Date.now();
                    setCurrentlyTypingMsgId(msgId);
                    // data.summon (quando a Zaeon convoca um agente) vira um card de handoff.
                    setZaeonMessages(prev => [...prev, { id: msgId, senderId: 'zaeon-agent', text: data.text, summon: data.summon }]);
                    setAiState("executing");
                }
            } catch (error) {
                const msgId = Date.now();
                setCurrentlyTypingMsgId(msgId);
                setZaeonMessages(prev => [...prev, { id: msgId, senderId: 'zaeon-agent', text: "Desculpe, minha rede neural falhou. Pode tentar novamente?" }]);
                setAiState("executing");
            } finally {
                setIsZaeonTyping(false);
            }

        } else {
            // ---> FLUXO HUMANO (Pusher) <---
            setChatHistory(prev => [...prev, optimisticMsg]);
            try {
                await fetch('/api/aichat/messages', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ targetId: activeChat.id, text })
                });
            } catch (error) { console.error(error); }
        }
    };

    const handleRespondRequest = async (status: 'ACCEPTED' | 'REJECTED') => {
        if (!incomingRequest) return;
        try {
            await fetch('/api/network/respond', {
                method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ requestId: incomingRequest.id, status })
            });
            setIncomingRequest(null);
            if (status === 'ACCEPTED') setActiveTab('friends');
        } catch (error) { console.error(error); }
    };

    const handleStudentSearch = useCallback(async () => {
        if (studentSearchQuery.length < 2) { setStudentSearchResults([]); return; }
        setIsStudentSearching(true);
        try {
            const res = await fetch(`/api/teacher/search-students?q=${encodeURIComponent(studentSearchQuery)}&t=${Date.now()}`);
            if (res.ok) setStudentSearchResults(await res.json());
        } catch (error) { console.error(error); } finally { setIsStudentSearching(false); }
    }, [studentSearchQuery]);

    useEffect(() => {
        if (!isTeacher || activeTab !== 'requests') return;
        const timeout = setTimeout(handleStudentSearch, 400);
        return () => clearTimeout(timeout);
    }, [studentSearchQuery, handleStudentSearch, isTeacher, activeTab]);

    const handleAddStudent = async (studentId: string) => {
        setAddingStudentId(studentId);
        try {
            const res = await fetch('/api/teacher/students', {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ studentId })
            });
            if (res.ok) setStudentSearchResults(prev => prev.map(s => s.id === studentId ? { ...s, isAdded: true } : s));
        } catch (error) { console.error(error); } finally { setAddingStudentId(null); }
    };

    const glassContainer = `
        backdrop-blur-3xl bg-white/95 dark:bg-[#0f172a]/80 
        border border-slate-300 dark:border-white/10 
        shadow-[0_0_40px_rgba(0,0,0,0.15)] dark:shadow-[0_10px_40px_rgba(0,0,0,0.5)]
    `;

    const displayMessages = activeChat?.isAgent ? zaeonMessages : chatHistory;

    return (
        <motion.div
            layout
            initial={false}
            animate={{
                height: isOpen ? 450 : 60,
                width: isOpen ? 320 : 60,
            }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className={`fixed z-[999] flex flex-col overflow-hidden ${glassContainer} ${isOpen ? 'bottom-0 rounded-t-3xl' : 'bottom-5 rounded-full shadow-2xl'}
            ${widgetPosition === 'right' ? 'right-4 sm:right-8' : 'left-4 sm:left-8'}`}
            style={{ willChange: "width, height" }}
        >
            <div
                onClick={() => setIsOpen(!isOpen)}
                title={isOpen ? undefined : "Falar com a Zaeon"}
                className={isOpen
                    ? `h-12 flex items-center justify-between px-5 cursor-pointer shrink-0 transition-all border-b border-slate-200 dark:border-white/5 ${flash ? "bg-cyan-500/30 dark:bg-cyan-500/40 shadow-[inset_0_0_20px_rgba(6,182,212,0.5)]" : "bg-white/50 dark:bg-black/20 hover:bg-slate-100 dark:hover:bg-white/5"}`
                    : `h-full w-full flex items-center justify-center cursor-pointer relative transition-all ${flash ? "bg-cyan-500/30" : ""}`}
            >
                {!isOpen ? (
                    /* FECHADO — só o ícone da Zaeon girando (presença forte) */
                    <div className="relative flex items-center justify-center">
                        {(unreadCount > 0 || incomingRequest) && (
                            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-red-500 rounded-full animate-ping z-10" />
                        )}
                        <ZaeonTriangle size={34} />
                    </div>
                ) : (
                  <>
                    <div className="flex items-center gap-3 relative">
                        <div className="relative flex items-center justify-center w-6 h-6 rounded-full bg-cyan-500/10">
                            <ZaeonTriangle size={16} />
                        </div>
                        <span className="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-slate-200">
                            {activeChat ? activeChat.name : "Rede Neural"}
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={(e) => { e.stopPropagation(); setWidgetPosition(p => p === 'right' ? 'left' : 'right'); }}
                            className="text-slate-400 hover:text-cyan-500 transition-colors p-1"
                            title="Mudar Lado do Widget"
                        >
                            <ArrowsRightLeftIcon className="w-4 h-4" />
                        </button>
                        <button className="text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors p-1">
                            <MinusIcon className="w-5 h-5" />
                        </button>
                    </div>
                  </>
                )}
            </div>

            <AnimatePresence mode="wait">
                {isOpen && (
                    <motion.div
                        key={activeChat ? "chat" : "menu"}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="flex-1 flex flex-col overflow-hidden relative"
                    >
                        {activeChat ? (
                            /* ===================== CHAT VIEW (HUMANO & IA) ===================== */
                            <div className="flex-1 flex flex-col h-full bg-slate-50 dark:bg-black/10">
                                <div className="flex items-center gap-3 p-3 border-b border-slate-200/50 dark:border-white/5 bg-white/50 dark:bg-black/20 backdrop-blur-md">
                                    <button onClick={() => setActiveChat(null)} className="p-1.5 rounded-full hover:bg-slate-200 dark:hover:bg-white/10 transition-colors">
                                        <ChevronLeftIcon className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                                    </button>
                                    <div className={`relative w-8 h-8 rounded-full overflow-hidden border bg-slate-200 dark:bg-black shrink-0 flex items-center justify-center ${activeChat.isAgent ? 'border-cyan-400 bg-cyan-100 dark:bg-cyan-900/30' : 'border-slate-300 dark:border-white/20'}`}>
                                        {activeChat.isAgent ? (
                                            <ZaeonTriangle size={22} />
                                        ) : activeChat.image ? (
                                            <Image src={activeChat.image} alt={activeChat.name} fill sizes="32px" className="object-cover" />
                                        ) : (
                                            <UserIcon className="w-full h-full p-1.5 text-slate-400" />
                                        )}
                                    </div>
                                    <div className="flex flex-col truncate">
                                        <span className="text-[11px] font-bold text-slate-800 dark:text-white truncate">{activeChat.name}</span>
                                        <span className={`text-[9px] font-medium ${activeChat.isAgent ? 'text-cyan-500' : 'text-slate-500 dark:text-slate-400'}`}>
                                            {activeChat.isAgent ? 'Sempre por perto' : 'Chat Seguro'}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 custom-scrollbar">
                                    {displayMessages.length === 0 && !isZaeonTyping && (
                                        <div className="flex-1 flex flex-col items-center justify-center opacity-50">
                                            <ChatBubbleLeftRightIcon className="w-8 h-8 text-slate-400 mb-2" />
                                            <span className="text-[10px] text-slate-500 font-mono italic">A conexão foi iniciada.</span>
                                        </div>
                                    )}
                                    {displayMessages.map((msg: any) => {
                                        const isMe = msg.senderId === realUserId;
                                        return (
                                            <div key={msg.id} className={`flex w-full ${isMe ? 'justify-end' : 'justify-start'}`}>
                                                <div className={`flex items-end gap-2 max-w-[85%] ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                                                    {!isMe && (
                                                        <div className={`relative w-6 h-6 rounded-full overflow-hidden shrink-0 border flex items-center justify-center ${activeChat.isAgent ? 'border-cyan-400 bg-cyan-100 dark:bg-cyan-900/30' : 'border-slate-300 dark:border-white/10 bg-slate-200 dark:bg-black'}`}>
                                                            {activeChat.isAgent ? (
                                                                <ZaeonTriangle size={16} />
                                                            ) : activeChat.image ? (
                                                                <Image src={activeChat.image} alt={activeChat.name} fill sizes="24px" className="object-cover" />
                                                            ) : (
                                                                <UserIcon className="w-full h-full p-1 text-slate-400" />
                                                            )}
                                                        </div>
                                                    )}
                                                    <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                                        <div className={`p-2.5 text-[11px] shadow-sm backdrop-blur-md ${isMe ? 'bg-cyan-500 text-white rounded-2xl rounded-br-sm' : activeChat.isAgent ? 'bg-white dark:bg-[#1e293b] text-slate-800 dark:text-slate-200 border border-cyan-200 dark:border-cyan-500/20 rounded-2xl rounded-bl-sm' : 'bg-white dark:bg-[#1e293b] text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-white/5 rounded-2xl rounded-bl-sm'}`}>
                                                            {msg.id === currentlyTypingMsgId ? (
                                                                <TypewriterText text={msg.text} onComplete={() => {
                                                                    setCurrentlyTypingMsgId(null);
                                                                    setAiState("idle");
                                                                }} />
                                                            ) : (
                                                                msg.text
                                                            )}
                                                        </div>
                                                        {!isMe && msg.summon && (
                                                            <div className="mt-2 w-full">
                                                                <div className="text-[9px] uppercase tracking-widest text-cyan-600 dark:text-cyan-400 font-black mb-1">{msg.summon.agent}</div>
                                                                <button
                                                                    onClick={() => { router.push(msg.summon.route); setIsOpen(false); }}
                                                                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-[11px] font-bold text-white transition-transform hover:scale-[1.02]"
                                                                    style={{ background: "linear-gradient(135deg,#0ea5e9,#22d3ee)" }}
                                                                >
                                                                    <span>{msg.summon.cta}</span><span>→</span>
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })}
                                    {activeChat.isAgent && isZaeonTyping && (
                                        <div className="flex justify-start w-full">
                                            <div className="flex items-end gap-2 max-w-[85%]">
                                                <div className="relative w-6 h-6 rounded-full overflow-hidden shrink-0 border border-cyan-400 bg-cyan-100 dark:bg-cyan-900/30 flex items-center justify-center">
                                                    <ZaeonTriangle size={16} />
                                                </div>
                                                <div className="px-3 py-2.5 rounded-2xl rounded-bl-sm bg-white dark:bg-[#1e293b] border border-cyan-200 dark:border-cyan-500/20 flex gap-1 items-center shadow-sm">
                                                    <span className="w-1 h-1 bg-cyan-400 rounded-full animate-bounce"></span>
                                                    <span className="w-1 h-1 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></span>
                                                    <span className="w-1 h-1 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></span>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    <div ref={messagesEndRef} />
                                </div>

                                {/* 🔥 INPUT ÁREA COM RECONHECIMENTO DE VOZ */}
                                <div className="p-3 bg-white/70 dark:bg-black/30 backdrop-blur-xl border-t border-slate-200 dark:border-white/5 flex flex-col gap-2">
                                    <AnimatePresence>
                                        {isListening && (
                                            <motion.div
                                                initial={{ opacity: 0, y: 5 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0 }}
                                                className="flex justify-center items-center gap-2 mb-1"
                                            >
                                                <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-pulse" />
                                                <span className="text-[9px] font-bold text-cyan-600 dark:text-cyan-400 uppercase tracking-tighter">Ouvindo...</span>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    {activeChat?.isAgent && (
                                        <button
                                            onClick={() => setDeepMode(v => !v)}
                                            title="Pensamento profundo — raciocínio em etapas (mais lento)"
                                            className={`self-start inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${deepMode ? "text-white" : "text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-white/5"}`}
                                            style={deepMode ? { background: "linear-gradient(135deg,#7c3aed,#06b6d4)" } : undefined}
                                        >
                                            ✦ {deepMode ? "Modo profundo ligado" : "Pensar mais a fundo"}
                                        </button>
                                    )}

                                    <div className="flex items-center gap-2 bg-white dark:bg-[#0f172a] rounded-full border border-slate-300 dark:border-white/10 p-1 pl-4 shadow-inner focus-within:border-cyan-400 dark:focus-within:border-cyan-500/50 transition-colors">
                                        <input
                                            type="text"
                                            value={messageInput}
                                            onChange={(e) => setMessageInput(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                                            placeholder={isListening ? "Fale agora..." : "Transmita algo..."}
                                            disabled={isZaeonTyping}
                                            className="flex-1 bg-transparent text-[11px] focus:outline-none text-slate-700 dark:text-white placeholder:text-slate-400 disabled:opacity-50"
                                        />

                                        {/* BOTÃO DE VOZ */}
                                        <button
                                            onClick={toggleListening}
                                            disabled={isZaeonTyping}
                                            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all shrink-0 ${isListening
                                                ? "bg-red-500/20 text-red-500 shadow-[0_0_10px_rgba(239,68,68,0.3)]"
                                                : "bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 hover:text-cyan-500"
                                                }`}
                                        >
                                            {isListening ? (
                                                <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1 }}>
                                                    <MicOff size={14} />
                                                </motion.div>
                                            ) : (
                                                <Mic size={14} />
                                            )}
                                        </button>

                                        <button
                                            onClick={handleSendMessage}
                                            disabled={!messageInput.trim() || isZaeonTyping}
                                            className="w-8 h-8 rounded-full bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 flex items-center justify-center text-white transition-colors shadow-md shrink-0"
                                        >
                                            <PaperAirplaneIcon className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>

                        ) : (
                            /* ===================== MENU VIEW ===================== */
                            <div className="flex-1 flex flex-col h-full bg-white/40 dark:bg-transparent">
                                <div className="flex p-2 bg-slate-100/50 dark:bg-black/20 gap-2 border-b border-slate-200 dark:border-white/5">
                                    <button onClick={() => setActiveTab('friends')} className={`flex-1 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${activeTab === 'friends' ? 'bg-white dark:bg-[#1e293b] text-cyan-600 dark:text-cyan-400 shadow-md border border-slate-200 dark:border-transparent' : 'text-slate-500 hover:bg-slate-200 dark:hover:bg-white/5'}`}>
                                        Colegas
                                    </button>
                                    {!isTeacher && (
                                        <button onClick={() => setActiveTab('teachers')} className={`flex-1 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${activeTab === 'teachers' ? 'bg-white dark:bg-[#1e293b] text-cyan-600 dark:text-cyan-400 shadow-md border border-slate-200 dark:border-transparent' : 'text-slate-500 hover:bg-slate-200 dark:hover:bg-white/5'}`}>
                                            Professores
                                        </button>
                                    )}
                                </div>

                                <div className="flex-1 overflow-y-auto custom-scrollbar p-2">

                                    {/* ====== ABA COLEGAS ====== */}
                                    {activeTab === 'friends' && (
                                        <div className="flex flex-col gap-1">
                                            {/* 🔥 O SEGREDO: INJETANDO A ZAEON FIXA NO TOPO DOS AMIGOS */}
                                            <div
                                                onClick={() => setActiveChat(ZAEON_AGENT)}
                                                className="flex items-center gap-3 p-2.5 rounded-2xl cursor-pointer transition-colors group border border-cyan-400/30 dark:border-cyan-500/30 bg-gradient-to-r from-cyan-50 to-white dark:from-cyan-950/20 dark:to-transparent mb-1 hover:shadow-md"
                                            >
                                                <div className="relative w-10 h-10 rounded-full border border-cyan-300 dark:border-cyan-400/50 bg-cyan-100 dark:bg-cyan-900/50 flex items-center justify-center shrink-0 shadow-inner">
                                                    <ZaeonTriangle size={26} />
                                                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white dark:border-slate-900 rounded-full animate-pulse"></span>
                                                </div>
                                                <div className="flex flex-col flex-1 overflow-hidden">
                                                    <span className="text-[11px] font-black text-cyan-700 dark:text-cyan-300 truncate">Zaeon OS</span>
                                                    <span className="text-[9px] text-cyan-600/70 dark:text-cyan-400/70 truncate">Sua parceira na Zaeon</span>
                                                </div>
                                            </div>

                                            {friends.length > 0 ? (
                                                friends.map(friend => (
                                                    <div key={friend.id} onClick={() => setActiveChat(friend)} className="flex items-center gap-3 p-2.5 rounded-2xl hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer transition-colors group">
                                                        <div className="relative w-10 h-10 rounded-full border border-slate-300 dark:border-white/10 shadow-sm overflow-hidden bg-slate-200 dark:bg-black shrink-0">
                                                            {friend.image ? <Image src={friend.image} alt={friend.name} fill sizes="40px" className="object-cover" /> : <UserIcon className="w-full h-full p-2 text-slate-400" />}
                                                        </div>
                                                        <div className="flex flex-col flex-1 overflow-hidden">
                                                            <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors truncate">{friend.name}</span>
                                                            <span className="text-[9px] text-slate-400 dark:text-slate-500 truncate">Conectado na Rede</span>
                                                        </div>
                                                    </div>
                                                ))
                                            ) : null}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar { width: 3px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(148, 163, 184, 0.3); border-radius: 10px; }
            `}</style>
        </motion.div>
    );
};