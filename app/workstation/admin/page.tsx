"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import {
    IdentificationIcon,
    CurrencyDollarIcon,
    ArrowLeftIcon,
    DocumentChartBarIcon,
    PuzzlePieceIcon,
    SpeakerWaveIcon,
    UsersIcon,
    SparklesIcon,
    CpuChipIcon,
    BookOpenIcon,
    Squares2X2Icon,
    GlobeAltIcon,
    BuildingStorefrontIcon
} from "@heroicons/react/24/outline";


// --- IMPORTAÇÃO DOS MÓDULOS MODULARIZADOS ---
import ProfileModule from "./modules/ProfileModule";
import ReportsModule from "./modules/ReportsModule";
import PluginsModule from "./modules/PluginsModule";
import VoiceAccessModule from "./modules/VoiceAccessModule";
import InviteGroupsModule from "./modules/InviteGroupsModule";
import AgentsModule from "./modules/AgentsModule";
import FrotaModule from "./modules/FrotaModule";
import BaseConhecimentoModule from "./modules/BaseConhecimentoModule";
import BlueprintsModule from "./modules/BlueprintsModule";
import CanaisModule from "./modules/CanaisModule";
import VitrineModule from "./modules/VitrineModule";
import { agentsAdmin } from "@/lib/canal/flags";
import { adminLabelPlugins } from "@/lib/mentores/rota";

// --- APPLE STYLE LOADER ---
const AppleLoader = ({ status }: { status: string }) => (
    <div className="flex flex-col items-center justify-center space-y-6">
        <div className="relative w-10 h-10">
            {[...Array(12)].map((_, i) => (
                <div key={i} className="absolute w-[3px] h-[10px] bg-slate-400 dark:bg-white/40 left-[18.5px] top-0 rounded-full origin-[1.5px_20px]"
                    style={{ transform: `rotate(${i * 30}deg)`, animation: `appleSpinner 1s linear infinite`, animationDelay: `${i * 0.083}s` }} />
            ))}
        </div>
        <span className="text-[11px] font-medium text-slate-500 dark:text-white/30 tracking-[0.2em] uppercase animate-pulse">{status}</span>
    </div>
);

// --- SIDEBAR ITEM COMPONENT ---
const SidebarItem = ({ icon: Icon, label, active, onClick, isOpen }: any) => (
    <button
        onClick={onClick}
        className={`flex items-center gap-4 p-4 rounded-2xl transition-all duration-300 ${active
                ? 'bg-cyan-500 text-black shadow-lg scale-105'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
    >
        <Icon className={`w-6 h-6 shrink-0 ${active ? 'stroke-[2.5px]' : 'stroke-1'}`} />
        {isOpen && (
            <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-[10px] font-black uppercase tracking-widest"
            >
                {label}
            </motion.span>
        )}
    </button>
);

export default function AdminControlRoom() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<"profiles" | "voice" | "invites" | "reports" | "plugins" | "payments" | "agents" | "canais" | "frota" | "rag" | "blueprints" | "vitrine">("profiles");
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return (
        <div className="h-screen flex items-center justify-center bg-[#030014]">
            <AppleLoader status="Initializing Admin Core" />
        </div>
    );

    // Estilo comum para os painéis de vidro dos módulos
    const glassPanel = "bg-white/80 dark:bg-cyan-950/10 backdrop-blur-3xl border border-slate-200 dark:border-white/10 shadow-2xl";

    return (
        <div className="fixed inset-0 z-[500] bg-slate-50 dark:bg-[#030014] flex font-sans overflow-hidden transition-colors duration-500">
            {/* Matrix Rain de fundo para manter a estética Zaeon */}
            <div className="absolute inset-0 z-0 opacity-20 hidden dark:block">

            </div>

            {/* SIDEBAR MESTRA (O Shell) */}
            <motion.nav
                onMouseEnter={() => setIsSidebarOpen(true)}
                onMouseLeave={() => setIsSidebarOpen(false)}
                animate={{ width: isSidebarOpen ? 260 : 80 }}
                className="fixed left-6 z-[550] flex flex-col py-8 rounded-[35px] border shadow-2xl backdrop-blur-2xl bg-white/80 dark:bg-black/80 border-slate-200 dark:border-white/10 h-[calc(100vh-48px)] top-6"
            >
                <div className="flex flex-col gap-3 px-3 mt-12">
                    <SidebarItem
                        icon={IdentificationIcon}
                        label="Profiles"
                        active={activeTab === 'profiles'}
                        onClick={() => setActiveTab('profiles')}
                        isOpen={isSidebarOpen}
                    />
                    <SidebarItem
                        icon={SpeakerWaveIcon}
                        label="Voz"
                        active={activeTab === 'voice'}
                        onClick={() => setActiveTab('voice')}
                        isOpen={isSidebarOpen}
                    />
                    <SidebarItem
                        icon={UsersIcon}
                        label="Convites"
                        active={activeTab === 'invites'}
                        onClick={() => setActiveTab('invites')}
                        isOpen={isSidebarOpen}
                    />
                    <SidebarItem
                        icon={PuzzlePieceIcon}
                        label={adminLabelPlugins()}
                        active={activeTab === 'plugins'}
                        onClick={() => setActiveTab('plugins')}
                        isOpen={isSidebarOpen}
                    />
                    {/* Gateway de agentes (founder) — só aparece com NEXT_PUBLIC_AGENTS_ADMIN=1 */}
                    {agentsAdmin() && (
                        <SidebarItem
                            icon={SparklesIcon}
                            label="Agents"
                            active={activeTab === 'agents'}
                            onClick={() => setActiveTab('agents')}
                            isOpen={isSidebarOpen}
                        />
                    )}
                    {/* Canais do mundo real (F1, leitura): mesmo portão founder do Agents */}
                    {agentsAdmin() && (
                        <SidebarItem
                            icon={GlobeAltIcon}
                            label="Canais"
                            active={activeTab === 'canais'}
                            onClick={() => setActiveTab('canais')}
                            isOpen={isSidebarOpen}
                        />
                    )}
                    {/* a FROTA DE IAs do cyberespaço (lib/cyber/frota) */}
                    <SidebarItem
                        icon={CpuChipIcon}
                        label="Deploy agents"
                        active={activeTab === 'frota'}
                        onClick={() => setActiveTab('frota')}
                        isOpen={isSidebarOpen}
                    />
                    {/* RAG F1: PDFs por turma que o chat do Zaeon consulta */}
                    <SidebarItem
                        icon={BookOpenIcon}
                        label="Base de conhecimento"
                        active={activeTab === 'rag'}
                        onClick={() => setActiveTab('rag')}
                        isOpen={isSidebarOpen}
                    />
                    {/* a vitrine "Aqui você vale o que você constrói." da landing (só os publicados aparecem) */}
                    <SidebarItem
                        icon={Squares2X2Icon}
                        label="Blueprints"
                        active={activeTab === 'blueprints'}
                        onClick={() => setActiveTab('blueprints')}
                        isOpen={isSidebarOpen}
                    />
                    {/* os cards da VITRINE (Marketplace de Estudos) — cadastro via admin */}
                    <SidebarItem
                        icon={BuildingStorefrontIcon}
                        label="Vitrine"
                        active={activeTab === 'vitrine'}
                        onClick={() => setActiveTab('vitrine')}
                        isOpen={isSidebarOpen}
                    />
                    <SidebarItem
                        icon={DocumentChartBarIcon}
                        label="Reports"
                        active={activeTab === 'reports'}
                        onClick={() => setActiveTab('reports')}
                        isOpen={isSidebarOpen}
                    />
                    <SidebarItem
                        icon={CurrencyDollarIcon}
                        label="Finance"
                        active={activeTab === 'payments'}
                        onClick={() => setActiveTab('payments')}
                        isOpen={isSidebarOpen}
                    />
                </div>

                {/* Botão de Voltar para a Workstation */}
                <button
                    onClick={() => router.push('/workstation')}
                    className="mt-auto mx-auto p-4 text-slate-400 hover:text-red-500 transition-colors"
                    title="Exit Admin Room"
                >
                    <ArrowLeftIcon className="w-6 h-6" />
                </button>
            </motion.nav>

            {/* ÁREA DE CARREGAMENTO DOS MÓDULOS */}
            <main className="flex-1 pl-32 pr-8 py-8 h-full flex flex-col relative z-10">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className="w-full h-full flex flex-col"
                    >
                        {activeTab === 'profiles' && <ProfileModule glassPanel={glassPanel} />}
                        {activeTab === 'voice' && <VoiceAccessModule glassPanel={glassPanel} />}
                        {activeTab === 'invites' && <InviteGroupsModule glassPanel={glassPanel} />}
                        {activeTab === 'reports' && <ReportsModule glassPanel={glassPanel} />}
                        {activeTab === 'plugins' && <PluginsModule glassPanel={glassPanel} />}
                        {activeTab === 'agents' && agentsAdmin() && <AgentsModule glassPanel={glassPanel} />}
                        {activeTab === 'canais' && agentsAdmin() && <CanaisModule glassPanel={glassPanel} />}
                        {activeTab === 'frota' && <FrotaModule glassPanel={glassPanel} />}
                        {activeTab === 'rag' && <BaseConhecimentoModule glassPanel={glassPanel} />}
                        {activeTab === 'blueprints' && <BlueprintsModule glassPanel={glassPanel} />}
                        {activeTab === 'vitrine' && <VitrineModule glassPanel={glassPanel} />}

                        {activeTab === 'payments' && (
                            <div className="flex-1 flex items-center justify-center opacity-30">
                                <h2 className="text-2xl uppercase font-black tracking-[0.5em] text-slate-500">
                                    Finance Module Offline
                                </h2>
                            </div>
                        )}
                    </motion.div>
                </AnimatePresence>
            </main>

            {/* Estilos Globais para Scrollbars dos módulos */}
            <style jsx global>{`
                @keyframes appleSpinner {
                    from { opacity: 1; }
                    to { opacity: 0.15; }
                }
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { 
                    background: rgba(34, 211, 238, 0.1); 
                    border-radius: 10px; 
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { 
                    background: rgba(34, 211, 238, 0.3); 
                }
            `}</style>
        </div>
    );
}