"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  ChevronRightIcon, ChevronDownIcon, ArrowLeftIcon, ArrowRightStartOnRectangleIcon
} from "@heroicons/react/24/outline";
import { Bot, Send, ShieldCheck, Loader2, Mic, MicOff, Crown, Trash2, GraduationCap, UserPlus } from "lucide-react";
import { isSuperAdmin } from "@/lib/auth/roles";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { signIn, signOut, useSession } from "next-auth/react";
import Image from "next/image";
import ZaeonLogo from "@/components/main/ZaeonLogo";
import InviteButton from "@/components/sub/InviteButton";
import VoicePicker from "@/components/settings/VoicePicker";
import { startTour, getTour, isTourReplay, setTourReplay, stopTourReplay } from "@/lib/onboarding/tour";

type ModuleKey = "estudos" | "pesquisas" | "projetos" | "lounge";
interface RecentItem { id: string; title: string; href: string }

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

  // Menu reformado: módulos expansíveis com as últimas interações do usuário.
  const [deletingAcc, setDeletingAcc] = useState(false);
  const [openModule, setOpenModule] = useState<ModuleKey | null>(null);
  const [recent, setRecent] = useState<{ research: RecentItem[]; studies: RecentItem[] }>({ research: [], studies: [] });
  const [recentProjects, setRecentProjects] = useState<RecentItem[]>([]);
  // Pesquisas = os DOCS salvos (TCC/Artigo/Relatório) — cada tipo é uma sessão (localStorage).
  const [researchDocs, setResearchDocs] = useState<RecentItem[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(false);
  const [voiceOpen, setVoiceOpen] = useState(false); // escolha de voz retraída por padrão
  // Switch de Tutoriais (só super admin): liga/desliga o tour (replay) e roda na hora.
  const [tutorialsOn, setTutorialsOn] = useState(false);
  useEffect(() => { try { setTutorialsOn(isTourReplay()); } catch { /* ignore */ } }, []);
  const toggleTutorials = () => {
    if (tutorialsOn) { stopTourReplay(); setTutorialsOn(false); }            // desliga
    else { setTourReplay(true); setTutorialsOn(true); setIsOptionsOpen(false); startTour(); } // liga + roda agora
  };
  // Onboarding do usuário comum: quem ainda NÃO fez o tour (User.tourDone=false) começa
  // AUTOMATICAMENTE — sem card de boas-vindas (removido). O OnboardingGuide global mostra
  // o 1º passo no menu (destaca Estudos). Roda 1x; concluir/pular marca tourDone no servidor.
  const autoTourRef = useRef(false);
  useEffect(() => {
    if (status !== "authenticated") return;
    let alive = true;
    fetch("/api/onboard/tour").then((r) => (r.ok ? r.json() : null)).then((d) => {
      if (alive && d && !d.tourDone && !autoTourRef.current) {
        autoTourRef.current = true;
        try { if (!getTour().active) startTour(); } catch { /* ignore */ }
      }
    }).catch(() => { /* offline */ });
    return () => { alive = false; };
  }, [status]);

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

  // Últimas interações: pesquisas + estudos (servidor) e projetos (localStorage).
  useEffect(() => {
    if (status !== "authenticated") return;
    let alive = true;
    setLoadingRecent(true);
    fetch("/api/menu/recent")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (alive && d) setRecent({ research: d.research || [], studies: d.studies || [] }); })
      .catch(() => { /* offline */ })
      .finally(() => { if (alive) setLoadingRecent(false); });
    try {
      const idx = JSON.parse(localStorage.getItem("zaeon.proj.index.v1") || "[]");
      if (Array.isArray(idx)) {
        const top = [...idx]
          .sort((a, b) => (b?.updatedAt || 0) - (a?.updatedAt || 0))
          .slice(0, 3)
          .map((p: any) => ({ id: String(p.id), title: p.name || "Projeto", href: `/research-lab?tab=projetos&project=${p.id}` }));
        setRecentProjects(top);
      }
    } catch { /* ignore */ }
    // Pesquisas REAIS = os docs TCC/Artigo/Relatório com conteúdo (não o template vazio).
    try {
      const raw = localStorage.getItem("zaeon_research_docs");
      const docs = raw ? (JSON.parse(raw)?.docs || {}) : {};
      const items: RecentItem[] = [];
      for (const type of ["TCC", "Artigo", "Relatório"]) {
        const doc = docs[type];
        if (!doc?.content) continue;
        // tira cabeçalhos/linhas vazias → se sobrar texto, é uma pesquisa de verdade
        const body = String(doc.content).split("\n").filter((l: string) => l.trim() && !l.trim().startsWith("#")).join(" ").trim();
        if (body.length < 3) continue;
        const title = doc.title && doc.title !== "minha_pesquisa.pdf" ? doc.title : type;
        items.push({ id: type, title: `${title} · ${type}`, href: `/research-lab?tab=pesquisa&worktype=${encodeURIComponent(type)}` });
      }
      setResearchDocs(items);
    } catch { /* ignore */ }
    return () => { alive = false; };
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

  // Um módulo expansível (Pesquisas/Estudos/Projetos) — SEM ícones, só o título e as
  // últimas interações. Clicar num item leva direto ao documento; "+ novo" abre a sala.
  const renderModule = (id: ModuleKey, label: string, items: RecentItem[], newLabel: string, newHref: string, tourId?: string) => {
    const open = openModule === id;
    return (
      <li className="w-full" data-tour={tourId}>
        <div onClick={() => setOpenModule(open ? null : id)} className={cardBase}>
          <div className={accentBar(open)} />
          <span className="text-sm tracking-tight pl-2 truncate font-semibold">{label}</span>
          <ChevronDownIcon className={`h-4 w-4 opacity-40 transition-transform duration-300 shrink-0 ${open ? "rotate-180" : ""}`} />
        </div>
        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              key={`${id}-body`}
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <div className="flex flex-col gap-1 pl-3 pr-1 pt-1.5 pb-1">
                {loadingRecent ? (
                  <span className="text-[11px] text-slate-400 dark:text-white/30 px-2 py-1.5 flex items-center gap-1.5">
                    <Loader2 size={12} className="animate-spin" /> Carregando…
                  </span>
                ) : items.length === 0 ? (
                  <span className="text-[11px] text-slate-400 dark:text-white/30 px-2 py-1.5">Nada por aqui ainda.</span>
                ) : (
                  items.map((it) => (
                    <div
                      key={it.id}
                      onClick={() => router.push(it.href)}
                      className="group/item flex items-center justify-between rounded-xl px-3 py-2 cursor-pointer bg-white/40 dark:bg-white/[0.02] hover:bg-cyan-50 dark:hover:bg-cyan-500/10 border border-transparent hover:border-cyan-300/50 dark:hover:border-cyan-400/20 transition-colors"
                    >
                      <span className="text-[12px] text-slate-700 dark:text-white/80 truncate">{it.title}</span>
                      <ChevronRightIcon className="h-3.5 w-3.5 opacity-0 group-hover/item:opacity-60 transition-opacity shrink-0" />
                    </div>
                  ))
                )}
                <button
                  onClick={() => router.push(newHref)}
                  className="mt-0.5 text-left text-[11px] font-bold uppercase tracking-wide text-cyan-600 dark:text-cyan-400/80 hover:text-cyan-500 dark:hover:text-cyan-300 px-3 py-1.5 transition-colors"
                >
                  + {newLabel}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </li>
    );
  };

  // ── DESLOGADO: painel de LOGIN (onboard em linguagem natural foi desativado) ──
  // Login só "passa" se a pessoa já tem conta OU preencheu um convite (gate no signIn do NextAuth).
  if (status !== "authenticated") {
    return (
      <div className={panelClass}>
        <nav className="p-6 flex flex-col h-full justify-center gap-5">
          <div className="flex flex-col items-center text-center gap-3">
            {/* Ícone da Zaeon EM CIMA do título, maior e com leve glow */}
            <span className="inline-flex" style={{ filter: "drop-shadow(0 0 12px rgba(34,211,238,0.45))" }}>
              <ZaeonLogo aiState="idle" className="w-16 h-16" />
            </span>
            <div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white">Bem-vindo à Zaeon</h2>
              <p className="text-[13px] text-slate-700 dark:text-white/80 mt-1 leading-relaxed">
                Entre para acessar seus estudos, pesquisas e agentes.
              </p>
            </div>
          </div>

          <button
            onClick={() => signIn("google", { callbackUrl: "/workstation" })}
            className="w-full flex items-center justify-center gap-2.5 bg-black dark:bg-white text-white dark:text-black text-[13px] font-bold py-3.5 rounded-full hover:scale-[1.02] transition-transform shadow-md"
          >
            <Image src="https://authjs.dev/img/providers/google.svg" alt="G" width={16} height={16} /> Entrar com Google
          </button>

          <div className="flex items-center gap-3">
            <span className="flex-1 h-px bg-slate-200 dark:bg-white/10" />
            <span className="text-[10px] uppercase tracking-widest text-slate-500 dark:text-white/50">ou</span>
            <span className="flex-1 h-px bg-slate-200 dark:bg-white/10" />
          </div>

          <div className="text-center">
            <p className="text-[12px] text-slate-700 dark:text-white/75 mb-2">Novo por aqui? É preciso um convite.</p>
            <button
              onClick={() => router.push("/convite")}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-slate-300 dark:border-white/15 text-slate-800 dark:text-white text-[12px] font-bold hover:border-cyan-400/60 hover:bg-cyan-50 dark:hover:bg-cyan-500/10 transition-colors"
            >
              <ShieldCheck size={15} /> Tenho um convite
            </button>
          </div>
        </nav>
        <div className="px-8 pb-4 text-[10px] text-slate-500 dark:text-white/45 tracking-[0.3em] font-medium mt-auto">
          {t("footer.version", "ZAEON OS v1.0.0")}
        </div>
      </div>
    );
  }

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
              <motion.div key="options" initial={{ x: 10, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col gap-3 w-full h-full overflow-y-auto custom-scrollbar pr-1">
                <button onClick={() => { setIsOptionsOpen(false); }} className="flex items-center gap-2 text-cyan-600 dark:text-cyan-400/80 hover:text-cyan-500 dark:hover:text-cyan-400 text-[10px] font-bold uppercase mb-1 ml-2 transition-colors shrink-0">
                  <ArrowLeftIcon className="w-3.5 h-3.5" /> {t("menu.back")}
                </button>

                {/* VOZ — retraída por padrão; abre pra escolher (libera espaço pro botão de apagar conta) */}
                <div className="rounded-2xl border border-slate-200 dark:border-white/5 bg-white/40 dark:bg-white/[0.02] overflow-hidden">
                  <button onClick={() => setVoiceOpen((v) => !v)} className="w-full flex items-center gap-2 px-3 py-3">
                    <Mic size={15} className="text-cyan-600 dark:text-cyan-300 shrink-0" />
                    <span className="text-sm tracking-tight text-slate-800 dark:text-white flex-1 text-left">Voz da Zaeon</span>
                    <ChevronDownIcon className={`h-4 w-4 opacity-40 transition-transform ${voiceOpen ? "rotate-180" : ""}`} />
                  </button>
                  {voiceOpen && <div className="px-3 pb-3"><VoicePicker /></div>}
                </div>

                {/* IDIOMA */}
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

                {/* (Convite saiu daqui: virou um card próprio à direita do menu, no hero-content) */}

                {/* CONVITE — agora vive SÓ aqui nas Opções (saiu do menu/hero). Sempre disponível. */}
                <div onClick={() => router.push("/convite")} className={cardBase}>
                  <div className={accentBar(false)} />
                  <span className="flex items-center gap-3 pl-2 min-w-0">
                    <UserPlus size={16} className="text-cyan-600 dark:text-cyan-300 shrink-0" />
                    <span className="text-sm tracking-tight truncate">{inviteAccessed ? "Acessar convite" : "Convidar amigos"}</span>
                  </span>
                  <ChevronRightIcon className="h-4 w-4 opacity-30 group-hover:opacity-100 transition-opacity shrink-0" />
                </div>

                {/* TUTORIAIS (escondido) — só super admin: liga/desliga o tour e roda na hora.
                    Usuário comum não vê isto; ele passa pelo tour uma vez (card de boas-vindas). */}
                {isFounder && (
                  <div className={`${cardBase} cursor-default`}>
                    <span className="flex items-center gap-3 pl-2 min-w-0">
                      <GraduationCap size={16} className="text-cyan-500 dark:text-cyan-300 shrink-0" />
                      <span className="flex flex-col min-w-0">
                        <span className="text-sm tracking-tight truncate">Tutoriais</span>
                        <span className="text-[9px] uppercase font-bold tracking-tighter text-slate-400 dark:text-white/40">
                          {tutorialsOn ? "Ligado — roda a cada visita" : "Desligado"}
                        </span>
                      </span>
                    </span>
                    <button
                      onClick={toggleTutorials}
                      role="switch"
                      aria-checked={tutorialsOn}
                      title={tutorialsOn ? "Desligar tutoriais" : "Ligar tutoriais (roda agora)"}
                      className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${tutorialsOn ? "bg-cyan-500" : "bg-slate-300 dark:bg-white/15"}`}
                    >
                      <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${tutorialsOn ? "translate-x-5" : ""}`} />
                    </button>
                  </div>
                )}

                {/* MODO FOUNDER — só admin supremo */}
                {isFounder && (
                  <div onClick={() => router.push("/workstation/admin")} className={`${cardBase} hover:border-amber-400/50 dark:hover:border-amber-400/40`}>
                    <span className="absolute left-1 top-1/2 -translate-y-1/2 h-6 w-[3px] rounded-full bg-amber-400" />
                    <span className="flex items-center gap-3 pl-2 min-w-0">
                      <Crown size={16} className="text-amber-500 dark:text-amber-300 shrink-0" />
                      <span className="text-sm tracking-tight truncate">Modo Founder</span>
                    </span>
                    <ChevronRightIcon className="h-4 w-4 opacity-30 group-hover:opacity-100 transition-opacity shrink-0" />
                  </div>
                )}

                {/* LOGOUT */}
                <div className={`${cardBase} hover:bg-red-50 hover:border-red-300 dark:hover:bg-red-500/20 dark:hover:border-red-500/40`} onClick={() => signOut()}>
                  <div className="flex flex-col flex-1 pl-2">
                    <span className="text-[9px] opacity-50 uppercase font-bold tracking-tighter text-slate-500 dark:text-white">Session</span>
                    <span className="text-sm text-slate-900 dark:text-white">{t("menu.logout", "Disconnect")}</span>
                  </div>
                  <ArrowRightStartOnRectangleIcon className="h-4 w-4 opacity-30 text-slate-600 dark:text-white" />
                </div>

                {/* DELETAR CONTA — purga completa (reset fresh) + logout. Confirmação dupla. */}
                <div
                  onClick={async () => {
                    if (deletingAcc) return;
                    if (!window.confirm("Apagar sua conta? Isso remove TODOS os seus dados e libera o e-mail pra começar do zero. Não dá pra desfazer.")) return;
                    setDeletingAcc(true);
                    try {
                      const r = await fetch("/api/account", { method: "DELETE" });
                      if (!r.ok) { setDeletingAcc(false); window.alert("Não consegui apagar a conta agora. Tente de novo."); return; }
                      await signOut({ callbackUrl: "/" });
                    } catch { setDeletingAcc(false); window.alert("Erro de conexão."); }
                  }}
                  className="group relative overflow-hidden flex items-center justify-between rounded-2xl px-4 min-h-[52px] w-full transition-all duration-300 cursor-pointer font-medium border bg-red-50/60 text-red-600 border-red-200 hover:bg-red-100 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/30 dark:hover:bg-red-500/20"
                >
                  <div className="flex flex-col flex-1 pl-2">
                    <span className="text-[9px] opacity-60 uppercase font-bold tracking-tighter">Zona de risco</span>
                    <span className="text-sm">{deletingAcc ? "Apagando…" : "Deletar minha conta"}</span>
                  </div>
                  {deletingAcc ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} className="opacity-70" />}
                </div>
              </motion.div>
            ) :

              /* ========================================= */
              /* FLUXO 3: MENU PADRÃO PÓS LOGIN            */
              /* ========================================= */
              (
                <motion.ul key="main" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex flex-col gap-2 w-full h-full justify-center overflow-y-auto custom-scrollbar pr-1">

                  {/* (Card de boas-vindas "Conta verificada" removido — o tour agora
                       começa sozinho pra quem nunca fez, e o admin liga/desliga em Opções) */}

                  {/* Mesma ordem da sidebar: Estudos · Pesquisas · Projetos (gated) · Lounge */}
                  {renderModule("estudos", "Estudos", recent.studies, "Novo estudo", "/research-lab?tab=sala-de-estudos", "menu-estudos")}

                  {/* PESQUISAS — só os docs salvos (TCC/Artigo/Relatório). Sem nenhum → só "Nova pesquisa". */}
                  {renderModule("pesquisas", "Pesquisas", researchDocs, "Nova pesquisa", "/research-lab?tab=pesquisa")}

                  {/* PROJETOS — só quem tem acesso ao Zaeon Code (poucos, por permissão) */}
                  {canUseProjects && renderModule("projetos", "Projetos", recentProjects, "Novo projeto", "/research-lab?tab=projetos")}

                  {/* LOUNGE — co-criar com amigos */}
                  {renderModule("lounge", "Lounge", [], "Criar em conjunto", "/research-lab?tab=lounge")}

                  {/* OPTIONS — concentra voz, idioma, convite, founder e logout */}
                  <li className="w-full" onClick={() => setIsOptionsOpen(true)}>
                    <div className={cardBase}>
                      <div className={accentBar(false)} />
                      <span className="truncate pr-2 text-sm tracking-tight pl-2">{t("menu.options")}</span>
                      <ChevronRightIcon className="h-4 w-4 opacity-30 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </li>
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