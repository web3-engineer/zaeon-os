"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import {
  User,
  FlaskConical,
  Bot,
  Coffee,
  PanelLeftClose,
  PanelLeftOpen,
  Focus,
  LockKeyhole,
  GraduationCap,
} from "lucide-react";

// --- MÓDULOS ---
import WorkStationContent from "@/app/workstation/WorkStationContent";
import AgenticAreaContent from "@/app/workstation/teacher/AgenticAreaContent";
import StudentLoungeContent from "@/app/workstation/student/StudentLoungeContent";
import StudyRoomContent from "@/app/workstation/student/StudyRoomContent";
import HomeworkPage from "@/app/research-lab/page";

// ---------------------------------------------------------------------------
// Tela de bloqueio para visitantes não-autenticados
// ---------------------------------------------------------------------------
function GuestLock({ onLogin }: { onLogin: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[60vh] gap-8 p-8">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
        className="w-24 h-24 rounded-full bg-white/60 dark:bg-white/5 flex items-center justify-center border border-black/5 dark:border-white/10 shadow-xl"
      >
        <LockKeyhole className="w-10 h-10 text-slate-400 dark:text-white/30" />
      </motion.div>

      <div className="text-center max-w-sm">
        <h2 className="text-xl font-black tracking-tight text-slate-800 dark:text-white mb-2">
          Área de Trabalho
        </h2>
        <p className="text-sm text-slate-500 dark:text-white/50 leading-relaxed">
          Você precisa estar logado para acessar sua área de trabalho.
        </p>
      </div>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onLogin}
        className="px-8 py-3 bg-black dark:bg-white text-white dark:text-black rounded-full text-sm font-bold shadow-lg hover:shadow-xl transition-shadow"
      >
        Fazer Login
      </motion.button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Workstation unificado para alunos
// ---------------------------------------------------------------------------
export default function StudentWorkstation() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const currentModule = (params?.module as string) || "profile";

  // Detecta papel do usuário
  const isTeacher =
    (session?.user as any)?.role === "teacher" ||
    (session?.user as any)?.role === "professor" ||
    !!(session?.user as any)?.isAdmin;
  const isAuthenticated = status === "authenticated";

  // Estado da sidebar (persiste na sessão)
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(() => {
    if (typeof window !== "undefined") {
      return sessionStorage.getItem("zaeon-student-sidebar") !== "false";
    }
    return true;
  });

  const [isFocusMode, setIsFocusMode] = useState(() => {
    if (typeof window !== "undefined") {
      return sessionStorage.getItem("zaeon-focus-mode") === "true";
    }
    return false;
  });

  // Sync focus mode to body class + event on mount (mirrors teacher workstation)
  useEffect(() => {
    if (isFocusMode) {
      document.body.classList.add("focus-mode-active");
      window.dispatchEvent(
        new CustomEvent("zaeon-focus-mode", { detail: true }),
      );
    } else {
      document.body.classList.remove("focus-mode-active");
      window.dispatchEvent(
        new CustomEvent("zaeon-focus-mode", { detail: false }),
      );
    }
  }, [isFocusMode]);

  // Professores vão para a workstation deles — EXCETO na Sala de Estudos ("sala"),
  // onde o professor cria/envia aulas e vê "Meus Alunos" (aba gated por isTeacher).
  useEffect(() => {
    if (status === "authenticated" && isTeacher) {
      if (currentModule === "sala") return; // professor pode entrar na Sala
      const dest = currentModule === "research" ? "research" : "profile";
      router.replace(`/workstation/teacher/${dest}`);
    }
  }, [status, isTeacher, currentModule, router]);

  const toggleSidebar = () => {
    const next = !isSidebarExpanded;
    setIsSidebarExpanded(next);
    if (typeof window !== "undefined") {
      sessionStorage.setItem("zaeon-student-sidebar", String(next));
    }
  };

  const toggleFocusMode = () => {
    const next = !isFocusMode;
    setIsFocusMode(next);
    if (typeof window !== "undefined") {
      sessionStorage.setItem("zaeon-focus-mode", String(next));
      window.dispatchEvent(
        new CustomEvent("zaeon-focus-mode", { detail: next }),
      );
      if (next) document.body.classList.add("focus-mode-active");
      else document.body.classList.remove("focus-mode-active");
    }
  };

  // ---------------------------------------------------------------------------
  // Itens da sidebar — ordem coerente para o fluxo do aluno:
  // Perfil → Pesquisa → Agentes → Social
  // ---------------------------------------------------------------------------
  const menuItems = [
    { id: "profile", label: "Perfil", icon: User, desc: "Seu espaço pessoal" },
    {
      id: "sala",
      label: "Sala de Estudos",
      icon: GraduationCap,
      desc: "Sua sala por curso",
    },
    {
      id: "research",
      label: "Pesquisa",
      icon: FlaskConical,
      desc: "Lab de trabalhos acadêmicos",
    },
    {
      id: "agentic",
      label: "Pesquisa Agêntica",
      icon: Bot,
      desc: "Agentes IA de pesquisa",
    },
    { id: "lounge", label: "Lounge", icon: Coffee, desc: "Espaço social" },
  ];

  // ---------------------------------------------------------------------------
  // Conteúdo principal — protegido para usuários não-logados
  // ---------------------------------------------------------------------------
  const renderContent = () => {
    if (status === "loading") {
      return (
        <div className="flex items-center justify-center h-full min-h-[60vh]">
          <span className="text-sm text-slate-400 dark:text-white/30 animate-pulse font-medium">
            Carregando...
          </span>
        </div>
      );
    }

    if (!isAuthenticated) {
      return <GuestLock onLogin={() => router.push("/")} />;
    }

    switch (currentModule) {
      case "profile":
        return <WorkStationContent isEmbedded={true} />;
      case "sala":
        return <StudyRoomContent />;
      case "research":
        return <HomeworkPage isEmbedded={true} />;
      case "agentic":
        return <AgenticAreaContent />;
      case "lounge":
        return <StudentLoungeContent />;
      default:
        return <WorkStationContent isEmbedded={true} />;
    }
  };

  // ---------------------------------------------------------------------------
  // Layout
  // ---------------------------------------------------------------------------
  return (
    <div
      className={`
                min-h-screen
                bg-[#f5f5f7] dark:bg-[#03050a]
                bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))]
                from-slate-200/50 dark:from-indigo-950/20
                via-transparent to-transparent
                flex transition-all duration-700 ease-in-out
                ${isFocusMode ? "pt-2 fixed inset-0 z-50" : "pt-24"}
            `}
    >
      {/* ── SIDEBAR ─────────────────────────────────────────────────────── */}
      <aside
        className={`
                    relative flex flex-col justify-between m-4 rounded-[2rem]
                    bg-white/40 dark:bg-slate-900/20 backdrop-blur-3xl
                    bg-gradient-to-b from-white/40 to-white/10 dark:from-indigo-500/10 dark:to-cyan-500/5
                    border border-white/40 dark:border-white/10 dark:border-t-white/20
                    shadow-[0_8px_32px_0_rgba(0,0,0,0.05)] dark:shadow-[0_8px_32px_0_rgba(0,20,40,0.4)]
                    transition-all duration-500 ease-[cubic-bezier(0.25,0.1,0.25,1)]
                    ${isSidebarExpanded ? "w-64" : "w-20"}
                    ${isFocusMode ? "h-[calc(100vh-2rem)]" : "h-[calc(100vh-7rem)]"}
                `}
      >
        {/* Efeito de reflexo interno */}
        <div className="absolute inset-0 rounded-[2rem] shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)] dark:shadow-[inset_0_1px_2px_rgba(255,255,255,0.15)] pointer-events-none z-0" />

        <div className="relative z-10">
          {/* Botão expand/collapse */}
          <div className="h-20 flex items-center justify-center border-b border-black/5 dark:border-white/5">
            <button
              onClick={toggleSidebar}
              className="p-3 rounded-2xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-slate-600 dark:text-white/70 hover:text-black dark:hover:text-white"
            >
              {isSidebarExpanded ? (
                <PanelLeftClose size={22} strokeWidth={1.5} />
              ) : (
                <PanelLeftOpen size={22} strokeWidth={1.5} />
              )}
            </button>
          </div>

          {/* Itens de navegação */}
          <nav className="p-3 space-y-2 mt-4">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentModule === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => router.push(`/workstation/student/${item.id}`)}
                  title={!isSidebarExpanded ? item.label : undefined}
                  className={`
                                        w-full flex items-center p-3 rounded-2xl transition-all duration-300
                                        ${
                                          isActive
                                            ? "bg-black/5 dark:bg-white/10 shadow-[inset_0_1px_1px_rgba(0,0,0,0.05)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] text-black dark:text-white font-semibold"
                                            : "text-slate-500 dark:text-white/50 hover:bg-black/5 dark:hover:bg-white/5 hover:text-slate-800 dark:hover:text-white/90"
                                        }
                                        ${!isSidebarExpanded ? "justify-center" : ""}
                                    `}
                >
                  <Icon
                    size={20}
                    strokeWidth={isActive ? 2 : 1.5}
                    className={
                      isActive
                        ? "drop-shadow-[0_0_8px_rgba(0,0,0,0.1)] dark:drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]"
                        : ""
                    }
                  />
                  {isSidebarExpanded && (
                    <span className="ml-4 tracking-wide text-[13px]">
                      {item.label}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Botão Modo Foco */}
        <div className="relative z-10 p-3 border-t border-black/5 dark:border-white/5 mb-2">
          <button
            onClick={toggleFocusMode}
            title="Modo Foco"
            className={`
                            w-full flex items-center p-3 rounded-2xl transition-all duration-300
                            ${
                              isFocusMode
                                ? "bg-cyan-500/10 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border border-cyan-500/20"
                                : "text-slate-500 dark:text-white/50 hover:bg-black/5 dark:hover:bg-white/5 hover:text-slate-800 dark:hover:text-white"
                            }
                            ${!isSidebarExpanded ? "justify-center" : ""}
                        `}
          >
            <Focus
              size={20}
              strokeWidth={isFocusMode ? 2 : 1.5}
              className={isFocusMode ? "animate-pulse" : ""}
            />
            {isSidebarExpanded && (
              <span className="ml-4 font-medium tracking-wide text-[13px]">
                Modo Foco
              </span>
            )}
          </button>
        </div>
      </aside>

      {/* ── ÁREA DE CONTEÚDO ─────────────────────────────────────────────── */}
      <main
        className={`
                    flex-1 p-4 pl-0 transition-all duration-700 ease-in-out
                    ${isFocusMode ? "h-[calc(100vh-1rem)]" : "h-[calc(100vh-6rem)]"}
                `}
      >
        <div className="w-full h-full rounded-[2rem] bg-white/50 dark:bg-slate-950/40 backdrop-blur-3xl border border-white/40 dark:border-white/10 shadow-2xl relative flex flex-col overflow-hidden">
          {/* Linha de reflexo no topo */}
          <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-black/5 dark:via-cyan-400/20 to-transparent z-10 pointer-events-none" />

          <div className="flex-1 overflow-y-auto custom-scrollbar relative z-0">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentModule}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="h-full"
              >
                {renderContent()}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </main>
    </div>
  );
}
