"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
    Briefcase,
    Search,
    Bot,
    Coffee,
    Wallet,
    PanelLeftClose,
    PanelLeftOpen,
    Focus,
    User,
    FlaskConical,
    Library,
    LayoutDashboard
} from "lucide-react";

// --- IMPORTS DOS MÓDULOS ---
import WorkStationContent from "@/app/workstation/WorkStationContent";
import TeacherHomeContent from "@/app/workstation/teacher/TeacherHomeContent";
import WorkAreaContent from "@/app/workstation/teacher/WorkAreaContent";
import ResearchAreaContent from "@/app/workstation/teacher/ResearchAreaContent";
import AgenticAreaContent from "@/app/workstation/teacher/AgenticAreaContent";
import LoungeContent from "@/app/workstation/teacher/LoungeContent";
import FinancesContent from "@/app/workstation/teacher/FinancesContent";
import HomeworkPage from "@/app/research-lab/page";

export default function TeacherWorkstation() {
    const params = useParams();
    const router = useRouter();
    const currentModule = params.module as string;

    // 🔥 CORREÇÃO DO FLICKER: Inicialização Síncrona.
    const [isSidebarExpanded, setIsSidebarExpanded] = useState(() => {
        if (typeof window !== "undefined") {
            const saved = sessionStorage.getItem("zaeon-sidebar-expanded");
            return saved !== "false";
        }
        return true;
    });

    const [isFocusMode, setIsFocusMode] = useState(() => {
        if (typeof window !== "undefined") {
            return sessionStorage.getItem("zaeon-focus-mode") === "true";
        }
        return false;
    });

    // Efeito para sincronizar as classes globais no body assim que a página carrega
    useEffect(() => {
        if (isFocusMode) {
            document.body.classList.add("focus-mode-active");
            window.dispatchEvent(new CustomEvent("zaeon-focus-mode", { detail: true }));
        } else {
            document.body.classList.remove("focus-mode-active");
            window.dispatchEvent(new CustomEvent("zaeon-focus-mode", { detail: false }));
        }
    }, [isFocusMode]);

    const toggleFocusMode = () => {
        const newMode = !isFocusMode;
        setIsFocusMode(newMode);

        if (typeof window !== "undefined") {
            sessionStorage.setItem("zaeon-focus-mode", String(newMode));
            window.dispatchEvent(new CustomEvent("zaeon-focus-mode", { detail: newMode }));

            if (newMode) {
                document.body.classList.add("focus-mode-active");
            } else {
                document.body.classList.remove("focus-mode-active");
            }
        }
    };

    const toggleSidebar = () => {
        const newState = !isSidebarExpanded;
        setIsSidebarExpanded(newState);

        if (typeof window !== "undefined") {
            sessionStorage.setItem("zaeon-sidebar-expanded", String(newState));
        }
    };

    // Ordem coerente para professores:
    // Perfil → Trabalho → Pesquisa (lab) → Repositórios → Agentes → Social → Finanças
    const menuItems = [
        { id: "home",     label: "Início",             icon: LayoutDashboard },
        { id: "profile",  label: "Meu Perfil",        icon: User          },
        { id: "work",     label: "Área de Trabalho",  icon: Briefcase     },
        { id: "research", label: "Pesquisa",           icon: FlaskConical  },
        { id: "repos",    label: "Repositórios",       icon: Library       },
        { id: "agentic",  label: "Pesquisa Agêntica",  icon: Bot           },
        { id: "lounge",   label: "Lounge",             icon: Coffee        },
        { id: "finances", label: "Finanças",           icon: Wallet        },
    ];

    const renderModuleContent = () => {
        switch (currentModule) {
            case "home":     return <TeacherHomeContent />;
            case "profile":  return <WorkStationContent isEmbedded={true} />;
            case "work":     return <WorkAreaContent />;
            case "research": return <HomeworkPage isEmbedded={true} />;
            case "repos":    return <ResearchAreaContent />;
            case "agentic":  return <AgenticAreaContent />;
            case "lounge":   return <LoungeContent />;
            case "finances": return <FinancesContent />;
            default:         return <div className="p-8 text-black/80 dark:text-white/80 font-medium">Selecione um módulo no menu lateral.</div>;
        }
    };

    return (
        <div className={`min-h-screen bg-[#f5f5f7] dark:bg-[#03050a] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-200/50 dark:from-indigo-950/20 via-transparent to-transparent flex transition-all duration-700 ease-in-out ${isFocusMode ? 'pt-2 fixed inset-0 z-50' : 'pt-24'}`}>

            {/* SIDEBAR - APPLE LIQUID GLASS ATUALIZADA */}
            <aside
                className={`
          relative flex flex-col justify-between m-4 rounded-[2rem]
          bg-white/40 dark:bg-slate-900/20 backdrop-blur-3xl 
          bg-gradient-to-b from-white/40 to-white/10 dark:from-indigo-500/10 dark:to-cyan-500/5
          border border-white/40 dark:border-white/10 dark:border-t-white/20
          shadow-[0_8px_32px_0_rgba(0,0,0,0.05)] dark:shadow-[0_8px_32px_0_rgba(0,20,40,0.4)]
          transition-all duration-500 ease-[cubic-bezier(0.25,0.1,0.25,1)]
          ${isSidebarExpanded ? "w-64" : "w-20"}
          ${isFocusMode ? 'h-[calc(100vh-2rem)]' : 'h-[calc(100vh-7rem)]'}
        `}
            >
                {/* Efeito de Reflexo Interno Profundo */}
                <div className="absolute inset-0 rounded-[2rem] shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)] dark:shadow-[inset_0_1px_2px_rgba(255,255,255,0.15)] pointer-events-none z-0"></div>

                <div className="relative z-10">
                    <div className="h-20 flex items-center justify-center border-b border-black/5 dark:border-white/5">
                        <button
                            onClick={toggleSidebar}
                            className="p-3 rounded-2xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-slate-600 dark:text-white/70 hover:text-black dark:hover:text-white"
                        >
                            {isSidebarExpanded ? <PanelLeftClose size={22} strokeWidth={1.5} /> : <PanelLeftOpen size={22} strokeWidth={1.5} />}
                        </button>
                    </div>

                    <nav className="p-3 space-y-2 mt-4">
                        {menuItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = currentModule === item.id;

                            return (
                                <button
                                    key={item.id}
                                    onClick={() => router.push(`/workstation/teacher/${item.id}`)}
                                    className={`
                                        w-full flex items-center p-3 rounded-2xl transition-all duration-300 group
                                        ${isActive
                                            ? "bg-black/5 dark:bg-white/10 shadow-[inset_0_1px_1px_rgba(0,0,0,0.05)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] text-black dark:text-white font-semibold"
                                            : "text-slate-500 dark:text-white/50 hover:bg-black/5 dark:hover:bg-white/5 hover:text-slate-800 dark:hover:text-white/90"}
                                        ${!isSidebarExpanded && "justify-center"}
                                    `}
                                >
                                    <Icon size={20} strokeWidth={isActive ? 2 : 1.5} className={isActive ? "drop-shadow-[0_0_8px_rgba(0,0,0,0.1)] dark:drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]" : ""} />
                                    {isSidebarExpanded && (
                                        <span className="ml-4 tracking-wide text-[13px]">{item.label}</span>
                                    )}
                                </button>
                            );
                        })}
                    </nav>
                </div>

                <div className="relative z-10 p-3 border-t border-black/5 dark:border-white/5 mb-2">
                    <button
                        onClick={toggleFocusMode}
                        className={`
                            w-full flex items-center p-3 rounded-2xl transition-all duration-300
                            ${isFocusMode
                                ? "bg-cyan-500/10 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border border-cyan-500/20"
                                : "text-slate-500 dark:text-white/50 hover:bg-black/5 dark:hover:bg-white/5 hover:text-slate-800 dark:hover:text-white"}
                            ${!isSidebarExpanded && "justify-center"}
                        `}
                        title="Modo Foco"
                    >
                        <Focus size={20} strokeWidth={isFocusMode ? 2 : 1.5} className={isFocusMode ? "animate-pulse" : ""} />
                        {isSidebarExpanded && (
                            <span className="ml-4 font-medium tracking-wide text-[13px]">Modo Foco</span>
                        )}
                    </button>
                </div>
            </aside>

            {/* ÁREA DE CONTEÚDO PRINCIPAL */}
            <main className={`flex-1 p-4 pl-0 transition-all duration-700 ease-in-out ${isFocusMode ? 'h-[calc(100vh-1rem)]' : 'h-[calc(100vh-6rem)]'}`}>
                {/* O contêiner principal agora tem overflow-y-auto no elemento pai para habilitar a rolagem livre */}
                <div className="w-full h-full rounded-[2rem] bg-white/50 dark:bg-slate-950/40 backdrop-blur-3xl border border-white/40 dark:border-white/10 shadow-2xl relative flex flex-col overflow-hidden">

                    {/* Linha de reflexo no topo do vidro */}
                    <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-black/5 dark:via-cyan-400/20 to-transparent z-10 pointer-events-none"></div>

                    {/* O cabeçalho redundante foi removido. */}
                    {/* A div abaixo gerencia o scroll corretamente. */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar relative z-0">
                        {renderModuleContent()}
                    </div>
                </div>
            </main>
        </div>
    );
}