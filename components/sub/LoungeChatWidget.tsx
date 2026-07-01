"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter, usePathname } from "next/navigation";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { skipTour } from "@/lib/onboarding/tour";
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
import { Bot, Mic, MicOff, PhoneCall, PhoneOff, Paperclip, X as XIcon } from "lucide-react";
import ZaeonLogo from "@/components/main/ZaeonLogo";
import ZaeonTriangle from "@/components/main/ZaeonTriangle";
import SpeakButton from "@/components/voice/SpeakButton";
import { useVoiceMode } from "@/lib/voice/voiceMode";
import useTTS from "@/lib/voice/useTTS";
import { speakQueued, clearSpeechQueue } from "@/lib/voice/ttsController";
import VoiceOrbModal from "@/components/voice/VoiceOrbModal";
import VoiceWaveIndicator from "@/components/voice/VoiceWaveIndicator";
import { setHandoff } from "@/lib/agents/handoff";
import { useMission, startMission } from "@/lib/agents/mission";
import { getAgentContext, hydrateAgentContext, setAgentContext, pushAgentAction } from "@/lib/agent/context";
import { setStepStatus, advancePlan, finishPlan, type AgentStep } from "@/lib/agent/actions";
import { startTour } from "@/lib/onboarding/tour";
import UpgradeCard from "@/components/ui/UpgradeCard";
import { isSuperAdminEmail } from "@/lib/auth/roles";
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

// Mock do perfil do agente do chat (a Zaeon — a anfitriã, rosto do chat).
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
    const isTeacher = (session?.user as any)?.role === "teacher" || (session?.user as any)?.role === "professor" || isSuperAdminEmail((session?.user as any)?.email);

    const [isOpen, setIsOpen] = useState(defaultOpen);
    const [widgetPosition, setWidgetPosition] = useState<'right' | 'left'>('left'); // default: encaixado no canto da sidebar (esquerda). Movível.

    const [activeTab, setActiveTab] = useState<'friends' | 'requests' | 'teachers'>('friends');
    // Abre JÁ na conversa com a Zaeon (sem passo extra de clicar no perfil dela).
    const [activeChat, setActiveChat] = useState<any | null>(ZAEON_AGENT);
    const [messageInput, setMessageInput] = useState("");
    // Multimodal: imagem anexada (foto → análise por Vision) e estado de geração.
    const [pendingImage, setPendingImage] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

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
    const wantListenRef = useRef(false);   // conversa por voz ativa (reabre o mic a cada turno)
    const [callOn, setCallOn] = useState(false); // "em chamada" (modo conversa mãos-livres)
    const [onboarding, setOnboarding] = useState(false); // tour ativo → ligação automática + overlay leve
    const [ringing, setRinging] = useState(false); // T2a: "chamada recebida" do onboarding (atender/recusar)
    const ringingRef = useRef(false);
    const pendingSayRef = useRef<string[]>([]); // falas que chegam durante a chamada → flush ao atender
    const [orbMinimized, setOrbMinimized] = useState(false); // call rodando com o orb full-screen escondido
    const [voiceAllowed, setVoiceAllowed] = useState(true); // gating: voz é premium (Pulse+)
    const [showUpgrade, setShowUpgrade] = useState(false);
    const finalRef = useRef("");            // transcrição final da fala atual
    const sendRef = useRef<(t?: string) => void>(() => {}); // ponte p/ enviar sem stale-closure
    const prevSpeakingRef = useRef(false);
    const onbActiveRef = useRef(false);     // tour ativo (lido em listeners com deps [])
    const onboardMinRef = useRef(false);    // beat "minimizar" cumprido → manter chat minimizado

    // Estados para Modo Professor
    const [studentSearchQuery, setStudentSearchQuery] = useState("");
    const [studentSearchResults, setStudentSearchResults] = useState<any[]>([]);
    const [isStudentSearching, setIsStudentSearching] = useState(false);
    const [addingStudentId, setAddingStudentId] = useState<string | null>(null);

    const activeChatRef = useRef(activeChat);
    const [unreadCount, setUnreadCount] = useState(0);
    const [flash, setFlash] = useState(false);
    const [deepMode, setDeepMode] = useState(false); // pensamento profundo (Gemini Pro em chunks)
    const [voiceMode, setVoiceModeState] = useVoiceMode(); // passivo | ativo
    const tts = useTTS();
    const mission = useMission(); // o que a Zaeon está executando agora (cockpit reativo)

    // ONBOARDING: a Zaeon "puxa assunto" — cada passo do tour manda uma fala que
    // aparece aqui no chat (abre o widget) e é falada por voz (autonomia de conversa).
    useEffect(() => {
        const onSay = (e: any) => {
            const text = e?.detail;
            if (typeof text !== "string" || !text.trim()) return;
            if (ringingRef.current) { pendingSayRef.current.push(text); return; } // T2a: segura a fala até atender
            setActiveChat(ZAEON_AGENT);
            // BUG (item 2): depois do beat "minimizar", NÃO reabrir o chat a cada fala — a
            // mensagem entra no histórico; o widget fica minimizado (FAB).
            if (!onboardMinRef.current) setIsOpen(true);
            // A Zaeon SEMPRE "escreve" (texto entra no histórico) — funciona 100% sem voz.
            setZaeonMessages((prev) => [...prev, { id: `ob-${Date.now()}`, senderId: "zaeon-agent", text }]);
            // VOZ OPT-IN (item 4): só FALA se o usuário ligou a voz do onboarding (pref OFF por
            // padrão; ligável no menu inicial ou no toggle de voz do chat). Lê fresh a cada fala.
            const voiceOn = (() => { try { return localStorage.getItem("zaeon.onboard.voice") === "on"; } catch { return false; } })();
            if (voiceOn) {
                try { setVoiceModeState("active"); } catch { /* ok */ }
                try { speakQueued(text); } catch { /* voz é bônus */ } // fila: avançar card não corta
            }
        };
        window.addEventListener("zaeon:onboard:say", onSay);
        return () => window.removeEventListener("zaeon:onboard:say", onSay);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Viewport p/ tornar o widget full-screen no mobile (alvo 360–430px).
    const [vw, setVw] = useState(0);
    useEffect(() => {
        const f = () => setVw(window.innerWidth);
        f();
        window.addEventListener("resize", f);
        return () => window.removeEventListener("resize", f);
    }, []);
    const isMobile = vw > 0 && vw < 640;
    const openW = isMobile ? Math.min(vw - 12, 460) : 320;
    const openH = isMobile ? Math.round((typeof window !== "undefined" ? window.innerHeight : 800) * 0.84) : 450;

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Autofocus: ao abrir o widget no chat com a Zaeon, foca o input sozinho (sem clicar).
    // Delay pra esperar a animação do framer-motion terminar.
    useEffect(() => {
        if (isOpen && activeChat?.isAgent) {
            const t = setTimeout(() => inputRef.current?.focus(), 120);
            return () => clearTimeout(t);
        }
    }, [isOpen, activeChat?.isAgent]);

    // 🔥 SAUDAÇÃO INICIAL DO AGENTE + NOTIFICAÇÃO
    useEffect(() => {
        if (status === "authenticated" && session?.user && zaeonMessages.length === 0) {
            const timer = setTimeout(() => {
                const userName = session?.user?.name;
                const firstName = userName ? userName.split(" ")[0] : "Operador";

                setZaeonMessages([
                    { id: 'intro', senderId: 'zaeon-agent', text: `Oi, ${firstName}. Que bom te ver por aqui. Fico do seu lado pra ajudar no que precisar — me conta, o que você quer fazer hoje?` }
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

    // 🔥 ATIVAR ONBOARDING AO LOGAR
    useEffect(() => {
        if (status === "authenticated") {
            try {
                if (!localStorage.getItem("zaeon.tourDone") && !localStorage.getItem("zaeon.tourStarted")) {
                    localStorage.setItem("zaeon.tourStarted", "1");
                    setTimeout(() => startTour(), 2000);
                }
            } catch { /* ignore */ }
        }
    }, [status]);

    useEffect(() => {
        activeChatRef.current = activeChat;
        if (isOpen) setUnreadCount(0);
    }, [activeChat, isOpen]);

    // World-state durável: hidrata do servidor e registra a sala/aba atual na URL.
    useEffect(() => {
        void hydrateAgentContext();
    }, []);
    useEffect(() => {
        try {
            const tab = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("tab") : null;
            const room = pathname?.split("/").filter(Boolean)[0] || null;
            setAgentContext({ activeRoom: room, activeTab: tab });
        } catch { /* ignore */ }
    }, [pathname]);

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
            recognitionRef.current.continuous = false;   // para no fim da fala → dispara onend → envia
            recognitionRef.current.interimResults = true;
            recognitionRef.current.lang = 'pt-BR';

            recognitionRef.current.onresult = (event: any) => {
                let transcript = "";
                for (let i = event.resultIndex; i < event.results.length; i++) {
                    transcript += event.results[i][0].transcript;
                }
                finalRef.current = transcript;
                setMessageInput(transcript);
            };

            recognitionRef.current.onerror = () => { setIsListening(false); };

            recognitionRef.current.onend = () => {
                setIsListening(false);
                const said = finalRef.current.trim();
                finalRef.current = "";
                // conversa por voz: ao terminar de falar, ENVIA sozinho (sem Enter)
                if (wantListenRef.current && said) {
                    setMessageInput("");
                    sendRef.current(said);
                }
            };
        }
    }, []);

    const startListening = () => {
        if (isListening) return;
        try { finalRef.current = ""; setMessageInput(""); recognitionRef.current?.start(); setIsListening(true); } catch { /* já rodando */ }
    };
    const stopListening = () => {
        wantListenRef.current = false;
        try { recognitionRef.current?.stop(); } catch { /* ignore */ }
        setIsListening(false);
    };
    const requireVoice = () => { if (!voiceAllowed) { setShowUpgrade(true); return false; } return true; };
    const toggleListening = () => {
        if (isListening || wantListenRef.current) { stopListening(); return; }
        if (!requireVoice()) return;
        wantListenRef.current = true; startListening();
    };
    // "Ligar pra Zaeon": modo conversa mãos-livres (estilo ChatGPT) — voz ativa + escuta contínua.
    const startCall = () => {
        if (callOn) { setCallOn(false); wantListenRef.current = false; stopListening(); tts.stop(); return; }
        if (!requireVoice()) return;
        setCallOn(true);
        setVoiceModeState("active");
        wantListenRef.current = true;
        startListening();
    };

    // ONBOARDING: ao iniciar o tour, abre o widget e LIGA automaticamente pra Zaeon (sem o gate
    // premium de voz), com overlay LEVE (ondas dentro do chat, sem cobrir os botões). Ao terminar,
    // encerra a chamada e limpa tudo.
    useEffect(() => {
        const onStart = () => {
            setOnboarding(true);
            onbActiveRef.current = true;
            onboardMinRef.current = false; // tour novo começa com o chat aberto (beats 1-2)
            try { localStorage.removeItem("zaeon.onboard.min"); } catch { /* */ }
            setOrbMinimized(false);
            setActiveChat(ZAEON_AGENT);
            setIsOpen(true);
            // T2a: começa como "chamada recebida" — só conecta (voz/fala) quando o usuário Atende.
            ringingRef.current = true; setRinging(true);
        };
        const onStop = () => {
            setOnboarding(false);
            onbActiveRef.current = false;
            onboardMinRef.current = false;
            try { localStorage.removeItem("zaeon.onboard.min"); } catch { /* */ }
            setCallOn(false);
            ringingRef.current = false; setRinging(false);
            wantListenRef.current = false;
            stopListening();
            // Encerrar o tour PODE parar a voz e esvaziar a fila (intencional — item 5.4).
            try { clearSpeechQueue(); tts.stop(); } catch { /* */ }
        };
        // Beat "minimizar" cumprido → trava o chat minimizado (não reabrir a cada fala).
        const onMinimized = () => {
            if (!onbActiveRef.current) return;
            onboardMinRef.current = true;
            try { localStorage.setItem("zaeon.onboard.min", "1"); } catch { /* */ }
        };
        // Item 2.4: ao montar (ex.: depois de navegar pra outra página/sala durante o tour),
        // respeita o "minimizado" — senão o chat reabria sozinho na próxima fala.
        try { if (localStorage.getItem("zaeon.onboard.min") === "1") { onboardMinRef.current = true; onbActiveRef.current = true; } } catch { /* */ }
        window.addEventListener("zaeon:onboard:start", onStart);
        window.addEventListener("zaeon:onboard:stop", onStop);
        window.addEventListener("zaeon:chat:minimized", onMinimized);
        return () => {
            window.removeEventListener("zaeon:onboard:start", onStart);
            window.removeEventListener("zaeon:onboard:stop", onStop);
            window.removeEventListener("zaeon:chat:minimized", onMinimized);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Quando a chamada termina, o orb minimizado deixa de fazer sentido → reseta.
    useEffect(() => { if (!callOn) setOrbMinimized(false); }, [callOn]);

    // Conversa contínua: quando a Zaeon TERMINA de falar (modo ativo), reabre o mic pro próximo turno.
    useEffect(() => {
        if (!onboarding && prevSpeakingRef.current && !tts.speaking && wantListenRef.current && !isZaeonTyping && !isListening) {
            const t = setTimeout(() => { if (wantListenRef.current && !onboarding) startListening(); }, 350);
            prevSpeakingRef.current = tts.speaking;
            return () => clearTimeout(t);
        }
        prevSpeakingRef.current = tts.speaking;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tts.speaking, isZaeonTyping]);

    // 1. INICIALIZAÇÃO DO PUSHER (WEB SOCKET HUMANOS)
    useEffect(() => {
        if (!realUserId) return;
        // Sem chave (ex.: build sem NEXT_PUBLIC_PUSHER_KEY) → NÃO instancia o Pusher.
        // Antes isso lançava "You must pass your app key" e derrubava o app inteiro,
        // já que o widget é montado globalmente. Agora degrada: sem realtime, sem crash.
        const pusherKey = process.env.NEXT_PUBLIC_PUSHER_KEY;
        const pusherCluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;
        if (!pusherKey || !pusherCluster) {
            if (process.env.NODE_ENV !== "production") console.warn("[chat] Pusher sem env (NEXT_PUBLIC_PUSHER_KEY/CLUSTER) — realtime desligado.");
            return;
        }
        const pusher = new PusherClient(pusherKey, { cluster: pusherCluster });
        const channel = pusher.subscribe(`user_${realUserId}`);
        channel.bind('new-message', (newMessage: any) => {
            const isActiveChat = activeChatRef.current?.id === newMessage.senderId || activeChatRef.current?.id === newMessage.receiverId;
            if (isActiveChat) {
                setChatHistory(prev => {
                    if (newMessage.clientMsgId) {
                        const idx = prev.findIndex(msg => msg.id === newMessage.clientMsgId);
                        if (idx !== -1) {
                            const newHistory = [...prev];
                            newHistory[idx] = { ...newHistory[idx], id: newMessage.id };
                            return newHistory;
                        }
                    }
                    return prev.find(msg => msg.id === newMessage.id) ? prev : [...prev, newMessage];
                });
            } else {
                setUnreadCount(prev => prev + 1);
                setFlash(true);
                setTimeout(() => setFlash(false), 1500);
            }
        });
        // Aviso da Zaeon (ex.: alguém aceitou seu convite no Lounge) → mensagem da
        // Zaeon + abre o widget + atualiza a lista de colegas (virou conexão).
        channel.bind('zaeon-notice', (payload: any) => {
            const text = payload?.text;
            if (typeof text === "string" && text.trim()) {
                setZaeonMessages(prev => [...prev, { id: `cn-${Date.now()}`, senderId: 'zaeon-agent', text }]);
                setActiveChat(ZAEON_AGENT);
                setIsOpen(true);
                setFlash(true);
                setTimeout(() => setFlash(false), 1500);
            }
            fetch(`/api/network/friends?t=${Date.now()}`, { cache: 'no-store' })
                .then(r => (r.ok ? r.json() : null))
                .then(d => { if (d?.friends) setFriends(d.friends); })
                .catch(() => { /* ignore */ });
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
                const res = await fetch(`/api/ai/chat/messages?targetId=${activeChat.id}&t=${Date.now()}`, { cache: 'no-store' });
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
    // Foto anexada → vira data URL base64 (enviada como fileData pro Gemini Vision).
    const handleImagePick = (file?: File | null) => {
        if (!file) return;
        if (!file.type.startsWith("image/")) return;
        if (file.size > 6 * 1024 * 1024) { setPendingImage(null); alert("Imagem muito grande (máx. 6MB)."); return; }
        const reader = new FileReader();
        reader.onload = () => setPendingImage(typeof reader.result === "string" ? reader.result : null);
        reader.readAsDataURL(file);
    };

    // Detecta pedido de GERAR imagem ("gere/crie/desenhe uma imagem/diagrama de…").
    const isImageRequest = (t: string): boolean => {
        const s = t.toLowerCase();
        return /(gerar|gere|gera|criar|crie|cria|desenh\w*|ilustr\w*|fa[cç]a|fazer)/.test(s) &&
            /(imagem|figura|ilustra\w*|desenho|diagrama|foto|gr[áa]fico)/.test(s);
    };

    const handleSendMessage = async (textArg?: string) => {
        const text = (typeof textArg === "string" ? textArg : messageInput).trim();
        if (!text || !activeChat) return;
        const attachedImage = pendingImage; // captura antes de limpar o input/preview

        // Para o reconhecimento atual (a fala já virou texto); não desliga a conversa.
        try { recognitionRef.current?.stop(); } catch { /* ignore */ }
        setIsListening(false);

        setMessageInput("");

        const optimisticMsg = {
            id: `opt_${Date.now()}`,
            senderId: realUserId,
            text: text,
            ...(attachedImage ? { image: attachedImage } : {}),
        };

        if (activeChat.isAgent) {
            // ---> FLUXO ZAEON (IA) <---
            setZaeonMessages(prev => [...prev, optimisticMsg]);
            setPendingImage(null); // anexo consumido
            setIsZaeonTyping(true);
            setAiState("thinking");

            // ATALHO: pedido de GERAR imagem (Imagen) — sem anexo e sem modo profundo.
            if (!deepMode && !attachedImage && isImageRequest(text)) {
                try {
                    const r = await fetch('/api/studio/image', {
                        method: 'POST', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ prompt: text }),
                    });
                    const d = await r.json().catch(() => null);
                    const msgId = Date.now();
                    if (r.ok && d?.dataUrl) {
                        setZaeonMessages(prev => [...prev, { id: msgId, senderId: 'zaeon-agent', text: "Aqui está a imagem que você pediu 👇", image: d.dataUrl }]);
                    } else {
                        setZaeonMessages(prev => [...prev, { id: msgId, senderId: 'zaeon-agent', text: d?.error || "Não consegui gerar a imagem agora. Tenta de novo?" }]);
                    }
                } catch {
                    setZaeonMessages(prev => [...prev, { id: Date.now(), senderId: 'zaeon-agent', text: "Falha ao gerar a imagem." }]);
                } finally {
                    setIsZaeonTyping(false);
                    setAiState("idle");
                }
                return;
            }

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

                if (deepMode && !attachedImage) {
                    // 🔥 MODO PROFUNDO — Gemini Pro em CHUNKS (plano → resposta), cada chamada curta.
                    const ctx = `Usuário: ${userName}. Página: ${pathname}.`;
                    const planRes = await fetch('/api/ai/deepthink', {
                        method: 'POST', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ step: 'plan', prompt: text, context: ctx, history: chatHistoryForGemini }),
                    });
                    const planData = await planRes.json().catch(() => ({}));
                    const ansRes = await fetch('/api/ai/deepthink', {
                        method: 'POST', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ step: 'answer', prompt: text, plan: planData.plan || '', context: ctx, history: chatHistoryForGemini }),
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
                            voiceMode, // passivo | ativo (personalidade da fala)
                            ...(attachedImage ? { fileData: attachedImage } : {}), // 🔥 foto → Gemini Vision
                            userData: savedOnboardingData, // 🔥 Memória injetada!
                            history: chatHistoryForGemini, // 🔥 Histórico do chat injetado!
                            agentContext: getAgentContext(), // 🔥 World-state durável do workspace!
                            systemContext: `Você é a Zaeon, a anfitriã que acompanha o usuário ${userName} (chame-o por esse primeiro nome). Você É a Zaeon — pode se apresentar assim. O usuário está neste momento na rota/página: ${pathname}. Se ele perguntar sobre o que pode fazer aqui ou pedir ajuda contextual, use essa rota como base para explicar a interface ou funcionalidades desta área específica do sistema.`
                        })
                    });

                    if (!res.ok) throw new Error("Falha de comunicação com o núcleo neural.");

                    const data = await res.json();
                    const msgId = Date.now();
                    setCurrentlyTypingMsgId(msgId);
                    // data.summon (quando a Zaeon convoca um agente) vira um card de handoff.
                    setZaeonMessages(prev => [...prev, { id: msgId, senderId: 'zaeon-agent', text: data.text, summon: data.summon }]);
                    setAiState("executing");
                    if (voiceMode === "active" && data.text) tts.speak(data.text); // modo ativo: fala a resposta
                    // EXECUTA de verdade: guarda o handoff e leva pra sala (que roda a ação ao abrir)
                    if (data.summon?.route) {
                        if (data.summon.topic) {
                            setHandoff(data.summon.skill, data.summon.topic);
                            startMission(data.summon.skill, data.summon.topic, data.summon.route); // abre a "missão" (cockpit)
                            // World-state durável: grava objetivo + ação recente (sobrevive a reload/device).
                            setAgentContext({ currentGoal: `${data.summon.skill}: ${data.summon.topic}` });
                            pushAgentAction("summon", `${data.summon.skill}:${data.summon.topic}`);
                        }
                        // Cockpit visível (Fase 2): mostra os passos da Zaeon agindo.
                        // data.plan vem do servidor → idêntico em texto/áudio/ligação.
                        if (Array.isArray(data.plan) && data.plan.length) runPlanVisually(data.plan);
                        setTimeout(() => { router.push(data.summon.route); setIsOpen(false); }, voiceMode === "active" ? 1200 : 350);
                    }
                    // TROCA DE SALA por voz/texto em tempo real (open_room). Dispara o
                    // switch de aba mesmo já estando no research-lab (evento) + navega.
                    if (data.navigate?.tab) {
                        const tab = data.navigate.tab;
                        if (Array.isArray(data.plan) && data.plan.length) runPlanVisually(data.plan);
                        setAgentContext({ activeTab: tab });
                        pushAgentAction("open_room", tab);
                        try { window.dispatchEvent(new CustomEvent("zaeon:set-tab", { detail: tab })); } catch { /* ignore */ }
                        setTimeout(() => { router.push(data.navigate.route); if (voiceMode !== "active") setIsOpen(false); }, 250);
                    }
                }
            } catch (error) {
                const msgId = Date.now();
                setCurrentlyTypingMsgId(msgId);
                setZaeonMessages(prev => [...prev, { id: msgId, senderId: 'zaeon-agent', text: "Desculpe, minha rede neural falhou. Pode tentar novamente?" }]);
                setAiState("executing");
            } finally {
                setIsZaeonTyping(false);
                // conversa por voz no modo passivo (sem fala dela): reabre o mic pro próximo turno
                if (wantListenRef.current && voiceMode !== "active") {
                    setTimeout(() => { if (wantListenRef.current) startListening(); }, 500);
                }
            }

        } else {
            // ---> FLUXO HUMANO (Pusher) <---
            setChatHistory(prev => [...prev, optimisticMsg]);
            try {
                await fetch('/api/ai/chat/messages', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ targetId: activeChat.id, text, clientMsgId: msgId })
                });
            } catch (error) { console.error(error); }
        }
    };
    sendRef.current = handleSendMessage; // ponte sempre atualizada (sem stale-closure no reconhecimento)

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

    // Estado único da Zaeon (dirige o visual reativo: glow do FAB, etc.)
    const agentState: "idle" | "listening" | "thinking" | "speaking" | "executing" =
        isListening ? "listening"
        : (isZaeonTyping || tts.loading) ? "thinking"   // carregando a voz = pensando (ondas só quando o áudio toca)
        : tts.speaking ? "speaking"
        : mission?.status === "running" ? "executing"
        : "idle";
    const stateGlow: Record<string, string> = {
        idle: "transparent",
        listening: "rgba(34,211,238,0.55)",
        thinking: "rgba(139,92,246,0.6)",
        speaking: "rgba(34,211,238,0.6)",
        executing: "rgba(139,92,246,0.6)",
    };
    const openMission = () => { if (mission?.route) { router.push(mission.route); setIsOpen(false); } };

    // T2a: atender/recusar a "ligação" do onboarding.
    const answerCall = () => {
        ringingRef.current = false; setRinging(false);
        const voiceOn = (() => { try { return localStorage.getItem("zaeon.onboard.voice") === "on"; } catch { return false; } })();
        if (voiceOn) { setCallOn(true); setVoiceModeState("active"); }
        // conecta: solta PRIMEIRO as falas que chegaram enquanto tocava (a saudação do BEAT 1),
        // ANTES de dispatchar "answered" — senão o avanço síncrono do tour insere o BEAT 2 antes.
        const pend = pendingSayRef.current; pendingSayRef.current = [];
        if (pend.length) {
            setActiveChat(ZAEON_AGENT); setIsOpen(true);
            setZaeonMessages((prev) => [...prev, ...pend.map((t, i) => ({ id: `ob-${Date.now()}-${i}`, senderId: "zaeon-agent", text: t }))]);
            if (voiceOn) pend.forEach((t) => { try { speakQueued(t); } catch { /* */ } });
        }
        try { window.dispatchEvent(new CustomEvent("zaeon:onboard:answered")); } catch { /* */ }
    };
    const declineCall = () => {
        ringingRef.current = false; setRinging(false);
        pendingSayRef.current = [];
        try { skipTour(); } catch { /* */ } // pula o tour (finishTour → onboard:stop)
    };

    return (
        <>
        <AgentActionRunner side={widgetPosition} />
        <motion.div
            data-tour="chat-widget"
            layout
            initial={false}
            animate={{
                height: isOpen ? openH : 52,
                width: isOpen ? openW : 52,
            }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className={`fixed z-[999] flex flex-col overflow-hidden ${glassContainer} ${
                isOpen
                    ? `bottom-0 rounded-t-3xl ${widgetPosition === 'right' ? 'right-4 sm:right-8' : 'left-4 sm:left-8'}`
                    // FECHADO: à esquerda encaixa no cantinho inferior da sidebar; à direita, canto normal.
                    : `rounded-full shadow-2xl ${widgetPosition === 'right' ? 'bottom-5 right-4 sm:right-8' : 'bottom-[46px] left-[18px]'}`
            }`}
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
                        {agentState !== "idle" && (
                            <span className="absolute inset-0 -m-2 rounded-full" style={{ boxShadow: `0 0 18px 2px ${stateGlow[agentState]}` }} />
                        )}
                        {(agentState === "speaking" || agentState === "listening") ? (
                            // enquanto fala/ouve, o FAB VIRA as ondas (clicar = parar)
                            <VoiceWaveIndicator size={22} />
                        ) : (
                            <>
                                {agentState !== "idle" && (
                                    <span className="absolute inset-0 -m-1.5 rounded-full animate-ping motion-reduce:animate-none"
                                        style={{ boxShadow: `0 0 0 2px ${stateGlow[agentState]}` }} />
                                )}
                                <ZaeonTriangle size={28} spinning={false} />
                            </>
                        )}
                    </div>
                ) : (
                  <>
                    <div className="flex items-center gap-3 relative">
                        <span className="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-slate-200">
                            {activeChat && !activeChat.isAgent ? activeChat.name : "Zaeon"}
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Ligar — só pro chat ABERTO no momento (hoje a chamada por voz é com a Zaeon) */}
                        {activeChat?.isAgent && (
                            <button
                                onClick={(e) => { e.stopPropagation(); startCall(); }}
                                title={callOn ? "Encerrar conversa por voz" : "Ligar pra Zaeon (conversa por voz)"}
                                aria-pressed={callOn}
                                className={`p-1 transition-colors ${callOn ? "text-rose-500" : "text-slate-400 hover:text-cyan-500"}`}
                            >
                                {callOn ? <PhoneOff className="w-4 h-4" /> : <PhoneCall className="w-4 h-4" />}
                            </button>
                        )}
                        <button
                            data-tour="chat-flip"
                            onClick={(e) => {
                                e.stopPropagation();
                                setWidgetPosition(p => {
                                    const next = p === 'right' ? 'left' : 'right';
                                    // Onboarding: virar PRA DIREITA é o passo obrigatório do tour.
                                    if (next === 'right') { try { window.dispatchEvent(new CustomEvent("zaeon:chat:flipped-right")); } catch { /* */ } }
                                    return next;
                                });
                            }}
                            className="text-slate-400 hover:text-cyan-500 transition-colors p-1"
                            title="Mudar Lado do Widget"
                        >
                            <ArrowsRightLeftIcon className="w-4 h-4" />
                        </button>
                        <button
                            data-tour="chat-min-btn"
                            onClick={() => { setIsOpen(false); try { window.dispatchEvent(new CustomEvent("zaeon:chat:minimized")); } catch { /* */ } }}
                            className="text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors p-1"
                            title="Minimizar"
                        >
                            <MinusIcon className="w-5 h-5" />
                        </button>
                    </div>
                  </>
                )}
            </div>

            {/* T2a: CHAMADA RECEBIDA do onboarding — atender pra começar o tutorial. */}
            {ringing && (
                <div className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-5 p-6 text-center backdrop-blur-xl bg-[#0a0f1c]/85">
                    <div className="w-20 h-20 rounded-full bg-cyan-500/15 flex items-center justify-center animate-pulse">
                        <span className="text-3xl">📞</span>
                    </div>
                    <div>
                        <p className="text-[15px] font-black text-white">Zaeon está te ligando…</p>
                        <p className="text-[12px] text-white/50 mt-1">Atenda para começar o tutorial</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button onClick={answerCall} className="px-5 py-2.5 rounded-full text-white font-bold text-sm hover:scale-[1.03] transition-transform" style={{ background: "linear-gradient(135deg,#10b981,#06b6d4)" }}>Atender</button>
                        <button onClick={declineCall} className="px-5 py-2.5 rounded-full text-white/70 font-bold text-sm border border-white/15 hover:bg-white/10 transition-colors">Agora não</button>
                    </div>
                </div>
            )}

            {/* CARTÃO DE MISSÃO — o que a Zaeon está executando agora (cockpit reativo) */}
            {isOpen && mission && (
                <button onClick={openMission}
                    className={`flex items-center gap-2 px-4 py-2 text-left border-b transition-colors ${mission.status === "done"
                        ? "bg-cyan-500/10 border-cyan-400/20"
                        : "bg-violet-500/10 border-violet-400/20"}`}
                    title="Ver na sala">
                    <span className={`shrink-0 w-2 h-2 rounded-full ${mission.status === "done" ? "bg-cyan-400" : "bg-violet-400 animate-pulse"}`} />
                    <span className="flex-1 min-w-0 text-[11px] text-slate-700 dark:text-white/80 truncate">
                        <span className="font-black uppercase tracking-wide mr-1">
                            {mission.status === "done" ? "Pronto" : ({ study: "Estudando", research: "Pesquisando", write: "Escrevendo", code: "Programando" } as any)[mission.skill] || "Executando"}
                        </span>
                        {mission.topic}
                    </span>
                    <span className="shrink-0 text-[10px] font-bold text-cyan-600 dark:text-cyan-300">ver →</span>
                </button>
            )}

            {/* 3 CHATS: Colegas | Zaeon (△ pra cima) | Professores/Alunos — separados do conteúdo */}
            {isOpen && (
                <div className="flex items-stretch gap-1 p-2 border-b border-slate-200 dark:border-white/10 bg-slate-50/60 dark:bg-black/20 shrink-0">
                    <button onClick={() => { setActiveChat(null); setActiveTab('friends'); }}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${!activeChat && activeTab === 'friends' ? 'bg-white dark:bg-[#1e293b] text-cyan-600 dark:text-cyan-400 shadow-sm border border-slate-200 dark:border-transparent' : 'text-slate-500 hover:bg-slate-200/60 dark:hover:bg-white/5'}`}>
                        <UsersIcon className="w-3.5 h-3.5" /> Colegas
                    </button>
                    <button onClick={() => setActiveChat(ZAEON_AGENT)} title="Zaeon"
                        className={`flex-1 flex items-center justify-center py-1.5 rounded-xl transition-all ${activeChat?.isAgent ? 'bg-cyan-500/15 shadow-sm border border-cyan-400/30' : 'hover:bg-slate-200/60 dark:hover:bg-white/5'}`}>
                        <ZaeonTriangle size={18} spinning={false} />
                    </button>
                    <button onClick={() => { setActiveChat(null); setActiveTab('teachers'); }}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${!activeChat && activeTab === 'teachers' ? 'bg-white dark:bg-[#1e293b] text-cyan-600 dark:text-cyan-400 shadow-sm border border-slate-200 dark:border-transparent' : 'text-slate-500 hover:bg-slate-200/60 dark:hover:bg-white/5'}`}>
                        <AcademicCapIcon className="w-3.5 h-3.5" /> {isTeacher ? 'Alunos' : 'Professores'}
                    </button>
                </div>
            )}

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
                                {/* Cabeçalho só p/ chat humano — na Zaeon não repete triângulo (a barra de 3 já o mostra) */}
                                {!activeChat.isAgent && (
                                <div className="flex items-center gap-3 p-3 border-b border-slate-200/50 dark:border-white/5 bg-white/50 dark:bg-black/20 backdrop-blur-md">
                                    <button onClick={() => setActiveChat(null)} className="p-1.5 rounded-full hover:bg-slate-200 dark:hover:bg-white/10 transition-colors">
                                        <ChevronLeftIcon className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                                    </button>
                                    <div className="relative w-8 h-8 rounded-full overflow-hidden border bg-slate-200 dark:bg-black shrink-0 flex items-center justify-center border-slate-300 dark:border-white/20">
                                        {activeChat.image ? (
                                            <Image src={activeChat.image} alt={activeChat.name} fill sizes="32px" className="object-cover" />
                                        ) : (
                                            <UserIcon className="w-full h-full p-1.5 text-slate-400" />
                                        )}
                                    </div>
                                    <div className="flex flex-col truncate">
                                        <span className="text-[11px] font-bold text-slate-800 dark:text-white truncate">{activeChat.name}</span>
                                        <span className="text-[9px] font-medium text-slate-500 dark:text-slate-400">Chat Seguro</span>
                                    </div>
                                </div>
                                )}

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
                                                            {msg.image && (
                                                                // eslint-disable-next-line @next/next/no-img-element
                                                                <img src={msg.image} alt="imagem" className="mb-1.5 rounded-lg max-h-48 w-auto" />
                                                            )}
                                                            {msg.id === currentlyTypingMsgId ? (
                                                                <TypewriterText text={msg.text} onComplete={() => {
                                                                    setCurrentlyTypingMsgId(null);
                                                                    setAiState("idle");
                                                                }} />
                                                            ) : (
                                                                msg.text
                                                            )}
                                                        </div>
                                                        {!isMe && activeChat.isAgent && msg.id !== currentlyTypingMsgId && (
                                                            <div className="mt-0.5"><SpeakButton text={msg.text} size={12} title="Ouvir" /></div>
                                                        )}
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
                                    {/* Onboarding: feedback de voz LEVE dentro do chat (não cobre os botões do header). */}
                                    {onboarding && (isListening || tts.speaking || tts.loading) && (
                                        <div className="flex justify-center py-2">
                                            <VoiceWaveIndicator size={20} />
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
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <button
                                                onClick={() => setDeepMode(v => !v)}
                                                title="Pensamento profundo — raciocínio em etapas (mais lento)"
                                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${deepMode ? "text-white" : "text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-white/5"}`}
                                                style={deepMode ? { background: "linear-gradient(135deg,#7c3aed,#06b6d4)" } : undefined}
                                            >
                                                ✦ {deepMode ? "Modo profundo ligado" : "Pensar mais a fundo"}
                                            </button>
                                            <button
                                                onClick={() => { if (voiceMode !== "active" && !requireVoice()) return; const next = voiceMode === "active" ? "passive" : "active"; setVoiceModeState(next); try { localStorage.setItem("zaeon.onboard.voice", next === "active" ? "on" : "off"); } catch { /* item 4.3: toggle do chat também controla a voz do onboarding */ } }}
                                                title={voiceMode === "active" ? "Voz ativa: conversa e age (fala as respostas)" : "Voz passiva: recebe e executa, sem falar"}
                                                aria-pressed={voiceMode === "active"}
                                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${voiceMode === "active" ? "text-white" : "text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-white/5"}`}
                                                style={voiceMode === "active" ? { background: "linear-gradient(135deg,#0ea5e9,#22d3ee)" } : undefined}
                                            >
                                                🔊 {voiceMode === "active" ? "Voz ativa" : "Voz passiva"}
                                            </button>
                                        </div>
                                    )}

                                    {pendingImage && activeChat?.isAgent && (
                                        <div className="flex items-center gap-2 mb-1.5 pl-1">
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img src={pendingImage} alt="anexo" className="h-10 w-10 rounded-lg object-cover border border-cyan-300/40" />
                                            <span className="text-[10px] text-slate-500 dark:text-slate-400 flex-1">Imagem anexada — a Zaeon vai analisar.</span>
                                            <button onClick={() => setPendingImage(null)} title="Remover" className="text-slate-400 hover:text-rose-400"><XIcon size={13} /></button>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-2 bg-white dark:bg-[#0f172a] rounded-full border border-slate-300 dark:border-white/10 p-1 pl-4 shadow-inner focus-within:border-cyan-400 dark:focus-within:border-cyan-500/50 transition-colors">
                                        <input
                                            ref={inputRef}
                                            autoFocus
                                            type="text"
                                            value={messageInput}
                                            onChange={(e) => setMessageInput(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                                            placeholder={isListening ? "Fale agora..." : "Transmita algo..."}
                                            disabled={isZaeonTyping}
                                            className="flex-1 bg-transparent text-[11px] focus:outline-none text-slate-700 dark:text-white placeholder:text-slate-400 disabled:opacity-50"
                                        />

                                        {/* ANEXAR IMAGEM (Vision) — só no chat com a Zaeon */}
                                        {activeChat?.isAgent && (
                                            <>
                                                <input
                                                    ref={fileInputRef}
                                                    type="file"
                                                    accept="image/*"
                                                    className="hidden"
                                                    onChange={(e) => { handleImagePick(e.target.files?.[0]); e.currentTarget.value = ""; }}
                                                />
                                                <button
                                                    onClick={() => fileInputRef.current?.click()}
                                                    disabled={isZaeonTyping}
                                                    title="Anexar imagem (a Zaeon analisa)"
                                                    className="w-8 h-8 rounded-full flex items-center justify-center bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 hover:text-cyan-500 transition-all shrink-0 disabled:opacity-50"
                                                >
                                                    <Paperclip size={14} />
                                                </button>
                                            </>
                                        )}

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
                                            onClick={() => handleSendMessage()}
                                            disabled={!messageInput.trim() || isZaeonTyping}
                                            className="w-8 h-8 rounded-full bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 flex items-center justify-center text-white transition-colors shadow-md shrink-0"
                                        >
                                            <PaperAirplaneIcon className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>

                        ) : (
                            /* ===================== LISTAS (Colegas / Professores·Alunos) ===================== */
                            <div className="flex-1 flex flex-col h-full bg-white/40 dark:bg-transparent">
                                <div className="flex-1 overflow-y-auto custom-scrollbar p-2">

                                    {/* ====== COLEGAS ====== */}
                                    {activeTab === 'friends' && (
                                        friends.length > 0 ? (
                                            <div className="flex flex-col gap-1">
                                                {friends.map(friend => (
                                                    <div key={friend.id} onClick={() => setActiveChat(friend)} className="flex items-center gap-3 p-2.5 rounded-2xl hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer transition-colors group">
                                                        <div className="relative w-10 h-10 rounded-full border border-slate-300 dark:border-white/10 shadow-sm overflow-hidden bg-slate-200 dark:bg-black shrink-0">
                                                            {friend.image ? <Image src={friend.image} alt={friend.name} fill sizes="40px" className="object-cover" /> : <UserIcon className="w-full h-full p-2 text-slate-400" />}
                                                        </div>
                                                        <div className="flex flex-col flex-1 overflow-hidden">
                                                            <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors truncate">{friend.name}</span>
                                                            <span className="text-[9px] text-slate-400 dark:text-slate-500 truncate">Conectado na Rede</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center h-full opacity-50 gap-2 py-10">
                                                <UsersIcon className="w-7 h-7 text-slate-400" />
                                                <span className="text-[10px] text-slate-500 font-mono italic">Sem colegas ainda.</span>
                                            </div>
                                        )
                                    )}

                                    {/* ====== PROFESSORES (aluno) / ALUNOS (professor) ====== */}
                                    {activeTab === 'teachers' && (
                                        (isTeacher ? students : teachers).length > 0 ? (
                                            <div className="flex flex-col gap-1">
                                                {(isTeacher ? students : teachers).map((person: any) => (
                                                    <div key={person.id} onClick={() => setActiveChat(person)} className="flex items-center gap-3 p-2.5 rounded-2xl hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer transition-colors group">
                                                        <div className="relative w-10 h-10 rounded-full border border-slate-300 dark:border-white/10 shadow-sm overflow-hidden bg-slate-200 dark:bg-black shrink-0">
                                                            {person.image ? <Image src={person.image} alt={person.name} fill sizes="40px" className="object-cover" /> : <UserIcon className="w-full h-full p-2 text-slate-400" />}
                                                        </div>
                                                        <div className="flex flex-col flex-1 overflow-hidden">
                                                            <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors truncate">{person.name}</span>
                                                            <span className="text-[9px] text-slate-400 dark:text-slate-500 truncate">{isTeacher ? 'Seu aluno' : 'Seu professor'}</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center h-full opacity-50 gap-2 py-10">
                                                <AcademicCapIcon className="w-7 h-7 text-slate-400" />
                                                <span className="text-[10px] text-slate-500 font-mono italic">{isTeacher ? 'Sem alunos ainda.' : 'Sem professores ainda.'}</span>
                                            </div>
                                        )
                                    )}
                                </div>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            <UpgradeCard
                open={showUpgrade}
                title="Modo Voz Avançado"
                message="Converse por voz com a Zaeon — ela fala, ouve e executa pra você. Esse recurso é dos planos pagos."
                plan="Plus"
                onClose={() => setShowUpgrade(false)}
            />

            <VoiceOrbModal
                open={!orbMinimized && !onboarding && (isListening || (voiceMode === "active" && (isZaeonTyping || tts.loading || tts.speaking)))}
                state={isListening ? "listening" : (isZaeonTyping || tts.loading) ? "thinking" : "speaking"}
                caption={isListening ? (messageInput || "Pode falar — estou te ouvindo.") : undefined}
                onClose={() => {
                    // Em chamada: NÃO encerra — só minimiza o orb (a call segue rodando no FAB).
                    if (callOn) { setOrbMinimized(true); return; }
                    wantListenRef.current = false; if (isListening) stopListening(); tts.stop();
                }}
            />

            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar { width: 3px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(148, 163, 184, 0.3); border-radius: 10px; }
            `}</style>
        </motion.div>
        </>
    );
};

// ─────────────────────────────────────────────────────────────────────────────
// AgentActionRunner — o "cockpit" que mostra a Zaeon AGINDO (Fase 2).
// Lê o plano do action-bus (lib/agent/actions) e renderiza os passos rodando, com
// digitação animada. É dirigido por data.plan (resposta do servidor), então aparece
// igual para texto, áudio e ligação — experiência uniforme entre os modos.
// ─────────────────────────────────────────────────────────────────────────────
// Anima o plano no cockpit: marca cada passo running→done com um ritmo natural.
// Não re-executa navegação (isso o widget já faz uma vez) — é a camada VISÍVEL.
async function runPlanVisually(steps: AgentStep[]) {
    if (!startPlan(steps)) return;
    const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
    for (let i = 0; i < steps.length; i++) {
        setStepStatus(i, "running");
        const s = steps[i];
        // passo de digitação dura um pouco mais (efeito de "digitando o tema")
        const dur = s.kind === "type" ? 900 + Math.min((s.detail?.length || 0) * 35, 1400)
            : s.kind === "create" ? 1100
            : s.kind === "navigate" ? 700
            : 500;
        await wait(dur);
        setStepStatus(i, "done");
        advancePlan();
    }
    finishPlan();
}

function AgentActionRunner({ side }: { side: "left" | "right" }) {
    const plan = usePlan();
    if (!plan) return null;
    return (
        <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16 }}
            className={`fixed z-[1000] bottom-24 ${side === "right" ? "right-4 sm:right-8" : "left-4 sm:left-8"} w-[290px] rounded-2xl overflow-hidden border border-cyan-400/30 dark:border-cyan-500/25 bg-white/90 dark:bg-[#0b1220]/90 backdrop-blur-2xl shadow-[0_10px_40px_rgba(8,15,40,0.45)]`}
        >
            <div className="px-4 py-2.5 flex items-center gap-2 border-b border-slate-200 dark:border-white/10 bg-gradient-to-r from-violet-500/10 to-cyan-500/10">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-cyan-200">
                    {plan.active ? "Zaeon executando" : "Zaeon concluiu"}
                </span>
            </div>
            <div className="p-3 flex flex-col gap-1.5">
                {plan.steps.map((s, i) => {
                    const st = s.status || "pending";
                    const color =
                        st === "done" ? "text-cyan-600 dark:text-cyan-300"
                        : st === "running" ? "text-violet-600 dark:text-violet-300"
                        : st === "error" ? "text-red-500"
                        : "text-slate-400 dark:text-slate-500";
                    return (
                        <div key={i} className="flex items-start gap-2.5">
                            <span className={`mt-0.5 w-4 text-center text-[11px] ${color}`}>
                                {st === "done" ? "✓" : st === "running" ? "◐" : st === "error" ? "×" : "○"}
                            </span>
                            <div className="flex-1 min-w-0">
                                <p className={`text-[11px] font-semibold leading-tight ${st === "pending" ? "text-slate-400 dark:text-slate-500" : "text-slate-800 dark:text-white"}`}>
                                    {s.label}
                                </p>
                                {s.kind === "type" && s.detail && st !== "pending" && (
                                    <p className="mt-0.5 text-[10px] font-mono text-cyan-700 dark:text-cyan-300 truncate">
                                        “{s.detail}”{st === "running" && <span className="animate-pulse">▋</span>}
                                    </p>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </motion.div>
    );
}