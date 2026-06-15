"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  ChevronRightIcon, ArrowLeftIcon, ArrowRightStartOnRectangleIcon
} from "@heroicons/react/24/outline";
import { Bot, Send, ShieldCheck, Loader2, Mic, MicOff, Search, GraduationCap, Code2, Crown } from "lucide-react";
import { isSuperAdmin } from "@/lib/auth/roles";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { signIn, signOut, useSession } from "next-auth/react";
import Image from "next/image";
import ZaeonLogo from "@/components/main/ZaeonLogo";
import InviteButton from "@/components/sub/InviteButton";

// 🔥 Menu simplificado: Apenas opções vitais pós-login
const MENU_ITEMS = [
  { labelKey: "menu.options", href: "/settings" },
  { labelKey: "menu.manual", href: "/workstation/admin" },
];

export default function MenuNavigation() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { data: session, status } = useSession();

  const [index, setIndex] = useState(0);
  const [isOptionsOpen, setIsOptionsOpen] = useState(false);
  const [workTitle, setWorkTitle] = useState<string | null>(null);
  const [isLoadingResearch, setIsLoadingResearch] = useState(false);

  // ==========================================
  // ESTADOS DO CHATBOT (MODO ONBOARDING NO MENU)
  // ==========================================
  // 🔥 Inicia automaticamente no chat se não estiver logado
  const [isOnboardMode, setIsOnboardMode] = useState(false);
  const [messages, setMessages] = useState<{ role: 'zaeon' | 'user', text: string }[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // ESTADOS PARA O MICROFONE
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Dados do Perfil Extraídos pela IA (Foco Acadêmico/Produtividade)
  const [userData, setUserData] = useState({
    name: '',
    age: 0,
    studyArea: '', // Concurso, Faculdade, Pesquisa
    institution: '',
    gender: 'other'
  });

  const [step, setStep] = useState(0);

  const isLoggedIn = status === "authenticated";
  const isStudent = (session?.user as any)?.role === "student" || !(session?.user as any)?.role;
  const isAdmin = !!(session?.user as any)?.isAdmin;
  // Founder (admin supremo) — allowlist/role. Só ele vê o "Modo Founder".
  const isFounder = isSuperAdmin({ email: session?.user?.email, role: (session?.user as any)?.role });
  // Acesso ao Zaeon Code (mostra "Iniciar novo projeto") + flag de convite acessado.
  const [canUseProjects, setCanUseProjects] = useState(false);
  const [inviteAccessed, setInviteAccessed] = useState(false);

  useEffect(() => {
    try { setInviteAccessed(localStorage.getItem("zaeon.inviteAccessed") === "1"); } catch { /* ignore */ }
    if (status !== "authenticated") { setCanUseProjects(false); return; }
    let alive = true;
    fetch("/api/projects/access")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (alive && d) setCanUseProjects(!!d.canUse); })
      .catch(() => { /* offline */ });
    return () => { alive = false; };
  }, [status]);

  // Garante que o estado de onboard esteja correto baseado no login
  useEffect(() => {
    if (status === "unauthenticated") {
      setIsOnboardMode(true);
    } else if (status === "authenticated") {
      setIsOnboardMode(false);
    }
  }, [status]);

  // Busca Pesquisa (Usuários logados)
  useEffect(() => {
    if (!isLoggedIn || !isStudent) return;
    const fetchResearch = async () => {
      setIsLoadingResearch(true);
      try {
        const email = session?.user?.email;
        if (!email) return;
        const res = await fetch(`/api/workspace?userId=${encodeURIComponent(email)}`);
        if (res.ok) {
          const json = await res.json();
          setWorkTitle(json.data?.workTitle || null);
        }
      } catch (e) { console.error(e); } finally { setIsLoadingResearch(false); }
    };
    fetchResearch();
  }, [isLoggedIn, isStudent, session?.user?.email]);

  // Rola chat pro final automaticamente
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  // Saudação inicial customizada para o novo nicho
  useEffect(() => {
    if (isOnboardMode && messages.length === 0) {
      setIsTyping(true);
      const timer = setTimeout(() => {
        setMessages([{
          role: 'zaeon',
          text: "Olá! O meu nome é Zaeon e fui criada para transformar a sua rotina de estudos e produtividade. Vamos criar o seu primeiro agente em segundos. Qual é o seu nome completo e a sua idade?"
        }]);
        setIsTyping(false);
      }, 1500);

      return () => clearTimeout(timer);
    }
  }, [isOnboardMode, messages.length]);

  // Lógica de Reconhecimento de Voz
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = i18n.language === 'pt' ? 'pt-BR' : 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        let transcript = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setInputValue(transcript);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error("Erro no reconhecimento de voz:", event.error);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, [i18n.language]);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      setInputValue("");
      recognitionRef.current?.start();
      setIsListening(true);
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    if (isListening) toggleListening();

    const userText = inputValue;
    setMessages(prev => [...prev, { role: 'user', text: userText }]);
    setInputValue("");
    setIsTyping(true);

    if (step === 0) {
      try {
        const res = await fetch('/api/onboarding-extract', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: userText, currentData: userData })
        });

        const result = await res.json();

        if (result.success && result.data) {
          const extracted = result.data;

          const updatedData = {
            name: extracted.name || userData.name,
            age: extracted.age || userData.age,
            studyArea: extracted.studyArea || userData.studyArea,
            institution: extracted.institution || userData.institution,
            gender: extracted.gender || userData.gender
          };

          setUserData(updatedData);

          setTimeout(() => {
            let missingFields = [];

            if (!updatedData.name) missingFields.push("nome");
            if (!updatedData.age || updatedData.age === 0) missingFields.push("idade");
            if (!updatedData.studyArea) missingFields.push("foco acadêmico/concurso");
            if (!updatedData.institution) missingFields.push("instituição de ensino ou empresa");

            if (missingFields.length > 0) {
              let askMsg = "";
              if (!updatedData.name && !updatedData.age) {
                askMsg = "Desculpe, não consegui entender bem o seu nome e idade. Pode repetir?";
              } else if (updatedData.name && !updatedData.studyArea && !updatedData.institution) {
                askMsg = `Entendido, ${updatedData.name.split(' ')[0]}! E qual é o seu curso, área de pesquisa ou concurso que está a preparar?`;
              } else if (updatedData.studyArea && !updatedData.institution) {
                askMsg = `Fabuloso atuar em ${updatedData.studyArea}, ${updatedData.name.split(' ')[0]}! Em qual faculdade ou empresa você está focado no momento?`;
              } else if (!updatedData.studyArea && updatedData.institution) {
                askMsg = `Ah, conheço a ${updatedData.institution}. Mas qual é exatamente o seu curso ou a sua área de atuação lá?`;
              } else {
                askMsg = `Quase lá! Para completarmos o seu perfil e criarmos o agente ideal, ainda preciso de saber: ${missingFields.join(" e ")}.`;
              }

              setMessages(prev => [...prev, { role: 'zaeon', text: askMsg }]);
              setIsTyping(false);

            } else {
              setMessages(prev => [...prev, {
                role: 'zaeon',
                text: `Excelente, ${updatedData.name.split(' ')[0]}! Muito bom saber que está envolvido com ${updatedData.studyArea} na ${updatedData.institution}. O seu ambiente neural está preparado.`
              }]);

              setTimeout(() => {
                setMessages(prev => [...prev, {
                  role: 'zaeon',
                  text: `Para ativarmos os seus agentes de forma segura, inicie sessão com a sua conta Google (ou Institucional).`
                }]);
                setStep(1);
                setIsTyping(false);
              }, 2000);
            }
          }, 1000);

        } else {
          throw new Error("Falha na extração");
        }
      } catch (error) {
        setMessages(prev => [...prev, { role: 'zaeon', text: "Desculpe, tive uma ligeira quebra de conexão neural. Pode repetir de forma mais direta?" }]);
        setIsTyping(false);
      }
    }
  };

  const handleLogin = async (provider: 'google' | 'guest') => {
    setIsSubmitting(true);
    const onboardingData = { ...userData, role: 'student', image: null };
    localStorage.setItem('zaeon_onboarding', JSON.stringify(onboardingData));

    if (provider === 'google') {
      await signIn('google', { callbackUrl: '/workstation' });
    } else if (provider === 'guest') {
      alert("Acesso Convidado a ser integrado.");
      setIsSubmitting(false);
    }
  };

  const visibleMenuItems = MENU_ITEMS.filter(item => item.labelKey === "menu.manual" ? isAdmin : true);

  const panelClass = "w-full mt-4 rounded-[32px] overflow-hidden backdrop-blur-2xl transition-all duration-500 bg-white/40 dark:bg-cyan-950/10 border border-slate-200 dark:border-white/10 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.1)] dark:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] flex flex-col min-h-[380px] max-h-[500px]";
  const cardBase = "group relative overflow-hidden flex items-center justify-between rounded-2xl px-4 min-h-[52px] w-full transition-all duration-300 cursor-pointer font-medium text-slate-800 dark:text-white bg-white/50 hover:bg-white/80 dark:bg-white/[0.03] dark:hover:bg-white/[0.08] border border-slate-200 dark:border-white/5 hover:border-cyan-400/50 dark:hover:border-cyan-400/30";
  const cardSelected = "bg-white border-cyan-400 dark:bg-cyan-400/10 dark:border-cyan-400/40 text-cyan-600 dark:text-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.2)] dark:shadow-[0_0_15px_rgba(34,211,238,0.15)]";
  const accentBar = (active: boolean) => `absolute left-1 top-1/2 -translate-y-1/2 h-6 w-[3px] rounded-full transition-all duration-500 ${active ? "bg-cyan-500 dark:bg-cyan-400 opacity-100 scale-y-100" : "bg-transparent opacity-0 scale-y-0"}`;

  return (
    <div className={panelClass}>
      <nav className="p-5 flex flex-col h-full relative">
        <AnimatePresence mode="wait">

          {/* ========================================= */}
          {/* FLUXO 1: MODO ONBOARD (CHAT INTERNO)      */}
          {/* ========================================= */}
          {isOnboardMode ? (
            <motion.div key="onboard" initial={{ x: 50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -50, opacity: 0 }} className="flex flex-col h-full relative">

              {/* Cabeçalho Voltar (Se o usuário estiver logado e entrou aqui acidentalmente) */}
              <div className="flex items-center gap-3 border-b border-slate-200 dark:border-white/10 pb-4 mb-4">
                {isLoggedIn && (
                  <button
                    onClick={() => setIsOnboardMode(false)}
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-200 dark:bg-white/5 hover:bg-slate-300 dark:hover:bg-white/10 transition-colors shrink-0 border border-slate-300 dark:border-white/10"
                    title="Voltar ao menu"
                  >
                    <ArrowLeftIcon className="w-4 h-4 text-slate-700 dark:text-white" />
                  </button>
                )}
                <span className="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-white">Conexão Neural</span>
              </div>

              {/* Chat Área */}
              <div ref={chatScrollRef} className="flex-1 overflow-y-auto max-h-[220px] pr-2 space-y-4 custom-scrollbar mb-4">
                {messages.map((msg, idx) => (
                  <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start gap-2'}`}>
                    {msg.role === 'zaeon' && (
                      <div className="w-6 h-6 rounded-full bg-cyan-100 dark:bg-cyan-500/20 flex items-center justify-center shrink-0 mt-1">
                        <ZaeonLogo aiState="idle" className="w-4 h-4" />
                      </div>
                    )}
                    <div className={`max-w-[85%] p-3 rounded-2xl text-[11px] md:text-xs font-medium leading-relaxed shadow-sm ${msg.role === 'user' ? 'bg-cyan-600 text-white rounded-tr-sm' : 'bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-200 rounded-tl-sm'}`}>
                      {msg.text}
                    </div>
                  </div>
                ))}

                {isTyping && (
                  <div className="flex justify-start gap-2">
                    <div className="w-6 h-6 rounded-full bg-cyan-100 dark:bg-cyan-500/20 flex items-center justify-center shrink-0 mt-1">
                      <ZaeonLogo aiState="thinking" className="w-4 h-4" />
                    </div>
                    <div className="px-3 py-2 rounded-2xl rounded-tl-sm bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 flex gap-1 items-center shadow-sm">
                      <span className="w-1.5 h-1.5 bg-cyan-500 dark:bg-cyan-400 rounded-full animate-bounce"></span>
                      <span className="w-1.5 h-1.5 bg-cyan-500 dark:bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></span>
                      <span className="w-1.5 h-1.5 bg-cyan-500 dark:bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></span>
                    </div>
                  </div>
                )}
              </div>

              {/* Ações Inferiores (Input com Voz ou Botões de Login) */}
              <div className="mt-auto pt-2 border-t border-slate-200 dark:border-white/5">
                {step === 0 ? (
                  <div className="flex flex-col gap-2">
                    <AnimatePresence>
                      {isListening && (
                        <motion.div
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          className="flex justify-center items-center gap-2 mb-1"
                        >
                          <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-pulse" />
                          <span className="text-[9px] font-bold text-cyan-600 dark:text-cyan-400 uppercase tracking-tighter">Zaeon está a ouvir...</span>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className="flex items-center gap-2 bg-white dark:bg-black/40 rounded-xl p-1.5 border border-slate-300 dark:border-white/10 focus-within:border-cyan-400 dark:focus-within:border-cyan-500/50 transition-colors shadow-sm dark:shadow-inner">
                      <input
                        autoFocus
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                        disabled={isTyping}
                        placeholder={isListening ? "Fale agora..." : "Pergunte a Zaeon..."}
                        className="flex-1 bg-transparent border-none outline-none text-[11px] text-slate-800 dark:text-white px-3 placeholder:text-slate-400"
                      />

                      <button
                        onClick={toggleListening}
                        disabled={isTyping}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${isListening
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
                        disabled={isTyping || !inputValue.trim()}
                        className="w-8 h-8 rounded-lg bg-cyan-500 text-white dark:text-slate-900 flex items-center justify-center disabled:opacity-50 transition-colors hover:bg-cyan-600 dark:hover:bg-cyan-400 shadow-sm"
                      >
                        <Send size={14} className="ml-0.5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2 mt-1 justify-center">
                    <button
                      onClick={() => handleLogin('google')}
                      disabled={isSubmitting}
                      className="flex-1 max-w-[200px] bg-black dark:bg-white text-white dark:text-black text-[10px] font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform shadow-lg"
                    >
                      {isSubmitting ? <Loader2 className="animate-spin w-4 h-4" /> : <Image src="https://authjs.dev/img/providers/google.svg" alt="G" width={14} height={14} />}
                      GOOGLE / INT.
                    </button>
                    <button
                      onClick={() => handleLogin('guest')}
                      disabled={isSubmitting}
                      className="flex-1 max-w-[150px] bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-white text-[10px] font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
                    >
                      <ShieldCheck size={14} /> CONVIDADO
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          ) :

            /* ========================================= */
            /* FLUXO 2: OPÇÕES DE LINGUAGEM E LOGOUT     */
            /* ========================================= */
            isOptionsOpen ? (
              <motion.div key="options" initial={{ x: 10, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col gap-3 w-full h-full justify-center">
                <button onClick={() => setIsOptionsOpen(false)} className="flex items-center gap-2 text-cyan-600 dark:text-cyan-400/80 hover:text-cyan-500 dark:hover:text-cyan-400 text-[10px] font-bold uppercase mb-2 ml-2 transition-colors">
                  <ArrowLeftIcon className="w-3.5 h-3.5" /> {t("menu.back")}
                </button>
                <div className={cardBase}>
                  <div className="flex flex-col flex-1 pl-2">
                    <span className="text-[9px] opacity-50 uppercase font-bold tracking-tighter text-slate-500 dark:text-white">{t("options.language")}</span>
                    <span className="text-sm text-slate-900 dark:text-white">{i18n.language.toUpperCase()}</span>
                  </div>
                  <select className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" value={i18n.language} onChange={(e) => i18n.changeLanguage(e.target.value)}>
                    <option value="en">English</option>
                    <option value="pt">Português</option>
                    <option value="es">Español</option>
                  </select>
                  <ChevronRightIcon className="h-4 w-4 opacity-30 text-slate-600 dark:text-white" />
                </div>
                <div className={`${cardBase} hover:bg-red-50 hover:border-red-300 dark:hover:bg-red-500/20 dark:hover:border-red-500/40`} onClick={() => signOut()}>
                  <div className="flex flex-col flex-1 pl-2">
                    <span className="text-[9px] opacity-50 uppercase font-bold tracking-tighter text-slate-500 dark:text-white">Session</span>
                    <span className="text-sm text-slate-900 dark:text-white">{t("menu.logout", "Disconnect")}</span>
                  </div>
                  <ArrowRightStartOnRectangleIcon className="h-4 w-4 opacity-30 text-slate-600 dark:text-white" />
                </div>
              </motion.div>
            ) :

              /* ========================================= */
              /* FLUXO 3: MENU PADRÃO PÓS LOGIN            */
              /* ========================================= */
              (
                <motion.ul key="main" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex flex-col gap-2 w-full h-full justify-center">

                  {/* INICIAR NOVA PESQUISA — leva à barra de pesquisa (destaque) */}
                  <li className="w-full">
                    <div onClick={() => router.push("/research-lab?tab=pesquisa")} className={`${cardBase} ring-1 ring-cyan-500/40 dark:ring-cyan-400/40 shadow-[0_0_20px_rgba(34,211,238,0.12)]`}>
                      <div className="absolute left-1 top-1/2 -translate-y-1/2 h-6 w-[3px] rounded-full bg-cyan-500 dark:bg-cyan-400" />
                      <span className="flex items-center gap-3 pl-2 min-w-0">
                        <Search size={17} className="text-cyan-500 dark:text-cyan-300 shrink-0" />
                        <span className="flex flex-col min-w-0">
                          <span className="text-[9px] uppercase tracking-widest text-slate-500 dark:text-white/40 font-bold">{workTitle ? "Núcleo de Pesquisa" : "Pesquisa"}</span>
                          <span className="text-sm tracking-tight truncate">{isLoadingResearch ? "Orquestrando..." : workTitle ? `Continuar: ${workTitle}` : "Iniciar nova pesquisa"}</span>
                        </span>
                      </span>
                      <ChevronRightIcon className="h-4 w-4 opacity-30 group-hover:opacity-100 transition-opacity shrink-0" />
                    </div>
                  </li>

                  {/* INICIAR NOVO ESTUDO — sala de estudos / barra de pesquisa */}
                  <li className="w-full">
                    <div onClick={() => router.push("/research-lab?tab=sala-de-estudos")} className={cardBase}>
                      <div className={accentBar(false)} />
                      <span className="flex items-center gap-3 pl-2 min-w-0">
                        <GraduationCap size={17} className="text-blue-500 dark:text-blue-300 shrink-0" />
                        <span className="text-sm tracking-tight truncate">Iniciar novo estudo</span>
                      </span>
                      <ChevronRightIcon className="h-4 w-4 opacity-30 group-hover:opacity-100 transition-opacity shrink-0" />
                    </div>
                  </li>

                  {/* INICIAR NOVO PROJETO — só quem tem acesso ao Zaeon Code */}
                  {canUseProjects && (
                    <li className="w-full">
                      <div onClick={() => router.push("/research-lab?tab=projetos")} className={cardBase}>
                        <div className={accentBar(false)} />
                        <span className="flex items-center gap-3 pl-2 min-w-0">
                          <Code2 size={17} className="text-sky-500 dark:text-sky-300 shrink-0" />
                          <span className="text-sm tracking-tight truncate">Iniciar novo projeto</span>
                        </span>
                        <ChevronRightIcon className="h-4 w-4 opacity-30 group-hover:opacity-100 transition-opacity shrink-0" />
                      </div>
                    </li>
                  )}

                  {/* CONVITE — no estilo do menu (saiu da navbar) */}
                  <li className="w-full"><InviteButton variant="menu" /></li>

                  {/* ACESSAR CONVITE — aparece depois que a pessoa acessou um convite */}
                  {inviteAccessed && (
                    <li className="w-full">
                      <div onClick={() => router.push("/convite")} className={cardBase}>
                        <div className={accentBar(false)} />
                        <span className="text-sm tracking-tight pl-2 truncate">Acessar convite</span>
                        <ChevronRightIcon className="h-4 w-4 opacity-30 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </li>
                  )}

                  {/* OPTIONS */}
                  <li className="w-full" onClick={() => setIsOptionsOpen(true)}>
                    <div className={cardBase}>
                      <div className={accentBar(false)} />
                      <span className="truncate pr-2 text-sm tracking-tight pl-2">{t("menu.options")}</span>
                      <ChevronRightIcon className="h-4 w-4 opacity-30 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </li>

                  {/* MODO FOUNDER — visível apenas para o admin supremo */}
                  {isFounder && (
                    <li className="w-full" onClick={() => router.push("/workstation/admin")}>
                      <div className={`${cardBase} hover:border-amber-400/50 dark:hover:border-amber-400/40`}>
                        <span className="absolute left-1 top-1/2 -translate-y-1/2 h-6 w-[3px] rounded-full bg-amber-400" />
                        <span className="flex items-center gap-3 pl-2 min-w-0">
                          <Crown size={17} className="text-amber-500 dark:text-amber-300 shrink-0" />
                          <span className="text-sm tracking-tight truncate">Modo Founder</span>
                        </span>
                        <ChevronRightIcon className="h-4 w-4 opacity-30 group-hover:opacity-100 transition-opacity shrink-0" />
                      </div>
                    </li>
                  )}
                </motion.ul>
              )}

        </AnimatePresence>
      </nav>

      {/* Footer Version */}
      <div className="px-8 pb-4 text-[10px] text-slate-400 dark:opacity-30 dark:text-white tracking-[0.3em] font-light mt-auto">
        {t("footer.version", "ZAEON OS v1.0.0")}
      </div>
    </div>
  );
}