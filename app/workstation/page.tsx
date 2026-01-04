"use client";

import { useState, useRef, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import {
    PaperAirplaneIcon,
    TrashIcon,
    CpuChipIcon,
    PlayIcon,
    ArrowDownTrayIcon,
    CommandLineIcon,
    HeartIcon,
    CalculatorIcon,
    ChevronUpIcon,
    EyeIcon,
    PowerIcon,
    UserCircleIcon,
    // Ícones removidos do header do terminal para limpeza visual
} from "@heroicons/react/24/outline";
import MatrixRain from "@/components/main/star-background";

// --- I18N ---
import { useTranslation } from "react-i18next";
import "../../src/i18n";

// --- 1. NEXT AUTH (IDENTIDADE - CARD SUPERIOR) ---
import { useSession, signIn, signOut } from "next-auth/react";

// --- 2. PRIVY & WEB3 (INFRA - TERMINAL INFERIOR) ---
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { uploadToPinata } from "@/src/utils/ipfs";

// --- IMAGE IMPORTS ---
import zoxImage from "./zox.png";
import ethernautImage from "./ethernaut.png";
import ballenaImage from "./ballena.png";

// --- AGENT CONFIGURATION ---
const AGENTS = {
    zenita: {
        name: "Zenita",
        roleKey: "agents.zenita.role",
        icon: CommandLineIcon,
        color: "text-cyan-400",
        bg: "bg-cyan-500/20",
        border: "border-cyan-500/50",
        image: zoxImage,
        widthClass: "w-64",
        contentPadding: "pl-[290px]"
    },
    ballena: {
        name: "Ballena",
        roleKey: "agents.ballena.role",
        icon: HeartIcon,
        color: "text-red-400",
        bg: "bg-red-500/20",
        border: "border-red-500/50",
        image: ballenaImage,
        widthClass: "w-[260px]",
        contentPadding: "pl-[290px]"
    },
    ethernaut: {
        name: "Ethernaut",
        roleKey: "agents.ethernaut.role",
        icon: CalculatorIcon,
        color: "text-purple-400",
        bg: "bg-purple-500/20",
        border: "border-purple-500/50",
        image: ethernautImage,
        widthClass: "w-[260px]",
        contentPadding: "pl-[290px]"
    },
};

type AgentKey = keyof typeof AGENTS;

export default function WorkStationPage() {
    // --- ESTADO 1: IDENTIDADE (NEXT AUTH) ---
    const { data: session } = useSession();

    // --- ESTADO 2: INFRAESTRUTURA (PRIVY) ---
    const { login: connectWallet, authenticated: privyAuthenticated, ready: privyReady, logout: disconnectWallet } = usePrivy();
    const { wallets } = useWallets();
    const wallet = wallets[0];

    const { t } = useTranslation();
    const [mounted, setMounted] = useState(false);

    // --- UI STATE ---
    const [activeSection, setActiveSection] = useState<"doc" | "chat" | "terminal" | null>(null);
    const [prompt, setPrompt] = useState("");
    const [docTitle, setDocTitle] = useState("Untitled_Research_Paper.txt");
    const [docContent, setDocContent] = useState("");
    const [terminalLogs, setTerminalLogs] = useState<string[]>([]);
    const [isBlockchainProcessing, setIsBlockchainProcessing] = useState(false);
    const [copied, setCopied] = useState(false);
    const [selectedAgent, setSelectedAgent] = useState<AgentKey>("zenita");
    const [isAgentMenuOpen, setIsAgentMenuOpen] = useState(false);
    const [isImageLoading, setIsImageLoading] = useState(false);

    const [chatHistory, setChatHistory] = useState<{role: 'user' | 'ai', text: string}[]>([]);
    const [isTyping, setIsTyping] = useState(false);

    // --- MODO FOCO ---
    const [isFocusMode, setIsFocusMode] = useState(false);

    const chatContainerRef = useRef<HTMLDivElement>(null);
    const terminalRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setMounted(true);
        setTimeout(() => addLog(t("workstation.system_init")), 100);
    }, []);

    const addLog = (msg: string) => {
        setTerminalLogs(prev => [...prev, `zaeon@root:~$ ${msg}`]);
    };

    const scrollToBottom = () => {
        if (chatContainerRef.current) {
            const { scrollHeight, clientHeight } = chatContainerRef.current;
            chatContainerRef.current.scrollTo({ top: scrollHeight - clientHeight, behavior: "smooth" });
        }
        if (terminalRef.current) {
            terminalRef.current.scrollTo({ top: terminalRef.current.scrollHeight, behavior: "smooth"});
        }
    };

    // Load Session
    useEffect(() => {
        const loadSession = async () => {
            const userId = session?.user?.email || wallet?.address;
            if (userId) {
                addLog(`Loading workspace for ${String(userId).slice(0,15)}...`);
                try {
                    const res = await fetch(`/api/workspace?userId=${userId}`);
                    const json = await res.json();
                    if (json.data) {
                        if (json.data.title) setDocTitle(json.data.title);
                        if (json.data.content) setDocContent(json.data.content);
                        if (json.data.chatHistory) setChatHistory(json.data.chatHistory);
                        addLog("Session restored successfully.");
                    }
                } catch (e) {
                    console.error("Failed to load session", e);
                }
            }
        };
        if (mounted && (session || wallet)) loadSession();
    }, [mounted, session, wallet]);

    useEffect(() => { if (mounted) scrollToBottom(); }, [chatHistory, terminalLogs, mounted, isTyping, selectedAgent]);

    const handleAgentSwitch = (key: AgentKey) => {
        if (key === selectedAgent) return;
        setIsAgentMenuOpen(false);
        setIsImageLoading(true);
        setSelectedAgent(key);
        addLog(t("workstation.logs.switched", { name: AGENTS[key].name }));
        setTimeout(() => { setIsImageLoading(false); }, 600);
    };

    const handleSend = async () => {
        if(!prompt.trim()) return;
        const currentPrompt = prompt;
        setChatHistory(prev => [...prev, { role: 'user', text: currentPrompt }]);
        setPrompt("");
        setIsTyping(true);

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: currentPrompt,
                    agent: selectedAgent
                })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || "API Error");
            setChatHistory(prev => [...prev, { role: 'ai', text: data.text }]);
        } catch (error) {
            console.error("Chat Error:", error);
            setChatHistory(prev => [...prev, { role: 'ai', text: "⚠️ Error: Connection to Zaeon Neural Core interrupted." }]);
            addLog("Error connecting to AI API.");
        } finally {
            setIsTyping(false);
        }
    };

    const saveSession = async () => {
        const userId = session?.user?.email || wallet?.address;

        if (!userId) {
            alert(t("modal.title"));
            signIn('google');
            return;
        }
        addLog("Saving session...");
        try {
            const res = await fetch('/api/workspace', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: userId,
                    title: docTitle,
                    content: docContent,
                    agent: selectedAgent,
                    chatHistory: chatHistory,
                    terminalLogs: terminalLogs
                })
            });
            if (res.ok) addLog("✅ Session saved successfully.");
            else addLog("❌ Error saving session.");
        } catch (e) { console.error(e); }
    };

    const handleGenerateProtocol = async () => {
        if (!privyAuthenticated || !wallet) {
            alert(t("workstation.no_wallet"));
            connectWallet();
            return;
        }
        if (!docTitle) {
            alert("Document title required.");
            return;
        }

        const agent = AGENTS[selectedAgent];
        setIsBlockchainProcessing(true);
        addLog(t("workstation.logs.gen_protocol", { name: agent.name }));
        setActiveSection('doc');

        setDocContent("Accessing Neural Network... Generating Research...");
        await new Promise(r => setTimeout(r, 1000));
        const generatedText = `RESEARCH PAPER: ${docTitle}\n\nAUTHOR: ${agent.name} (AI Agent)\nFIELD: ${t(agent.roleKey)}\nDATE: ${new Date().toISOString()}\n\nABSTRACT:\nThis document serves as an immutable record of research regarding "${docTitle}". Generated by the Zaeon Framework utilizing advanced neural processing.\n\nCORE ANALYSIS:\nThe integration of Artificial Intelligence with the Movement EVM Blockchain ensures that this knowledge is preserved with cryptographic certainty.\n\nCONCLUSION:\nData integrity verified.`;
        setDocContent(generatedText);
        addLog(t("workstation.logs.content_gen"));

        try {
            const ipfsHash = await uploadToPinata({
                title: docTitle,
                agent: agent.name,
                topic: t(agent.roleKey),
                content: generatedText
            });

            if (!ipfsHash) throw new Error("IPFS returned null. Check API Keys.");
            addLog(t("workstation.logs.ipfs_success", { hash: ipfsHash }));

            addLog(t("workstation.logs.blockchain_init"));

            await new Promise(r => setTimeout(r, 2000));
            const mockHash = "0x" + Math.random().toString(16).slice(2) + Math.random().toString(16).slice(2);

            addLog(`${t("workstation.logs.success")} Tx: ${mockHash.slice(0, 10)}...`);
            setChatHistory(prev => [...prev, { role: 'ai', text: `Document secured on Movement EVM.\nTx Hash: ${mockHash}` }]);

        } catch (error: any) {
            console.error("CRITICAL ERROR:", error);
            addLog(t("workstation.logs.error"));
            alert("Error during minting process.");
        } finally {
            setIsBlockchainProcessing(false);
        }
    };

    if (!mounted) return <div className="w-full h-screen bg-[#030014]" />;

    const panelStyle = "relative overflow-hidden backdrop-blur-2xl border border-white/10 shadow-[0_0_40px_rgba(34,211,238,0.12)] bg-[linear-gradient(135deg,rgba(7,38,77,0.4),rgba(11,58,164,0.3),rgba(7,38,77,0.4))] rounded-xl transition-all duration-300";
    const activeBorder = "ring-1 ring-cyan-400/50 shadow-[0_0_30px_rgba(34,211,238,0.25)] bg-[linear-gradient(135deg,rgba(7,38,77,0.6),rgba(11,58,164,0.4),rgba(7,38,77,0.6))]";
    const btnBase = "px-4 py-2 rounded-md text-[11px] font-bold border transition flex items-center gap-2 uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed";
    const activeConfig = AGENTS[selectedAgent];

    return (
        <div className={`relative w-full h-screen bg-background dark:bg-[#030014] overflow-hidden flex flex-col justify-end items-center pb-2 px-4 transition-all duration-500 ${isFocusMode ? 'z-[100] !bg-[#030014]' : ''}`}>

            <div className="absolute inset-0 z-0 pointer-events-none">
                <MatrixRain />
            </div>

            {/* --- FOCUS MODE TOGGLE --- */}
            <div className="fixed top-[18px] right-10 z-[150] flex flex-col items-center">
                <div onClick={() => setIsFocusMode(!isFocusMode)} title={t("workstation.focus_mode")} className={`w-8 h-14 rounded-full border transition-all duration-300 cursor-pointer backdrop-blur-xl shadow-lg flex flex-col items-center p-1 ${isFocusMode ? "bg-gradient-to-b from-cyan-900/80 to-blue-950/80 border-cyan-500/50 shadow-[0_0_15px_rgba(8,145,178,0.4)]" : "bg-white/80 border-slate-300 dark:bg-white/10 dark:border-white/20"}`}>
                    <motion.div className={`w-5 h-5 rounded-full shadow-sm flex items-center justify-center ${isFocusMode ? "bg-cyan-400 text-black" : "bg-slate-400 dark:bg-white/40 text-white"}`} animate={{ y: isFocusMode ? 0 : 26 }} transition={{ type: "spring", stiffness: 400, damping: 25 }}>
                        {isFocusMode ? <EyeIcon className="w-3 h-3" /> : <PowerIcon className="w-3 h-3" />}
                    </motion.div>
                </div>
            </div>

            <div className="z-20 w-full max-w-[1700px] h-[88vh] grid grid-cols-12 gap-6">

                {/* --- 1. LEFT SIDE: CHAT WINDOW --- */}
                <div onClick={() => setActiveSection('chat')} className={`col-span-7 ${panelStyle} flex flex-col ${activeSection === 'chat' ? activeBorder : ''} relative h-full`}>

                    {/* --- HEADER: NEXT AUTH GOOGLE CARD --- */}
                    <div className="absolute top-4 left-4 z-40 flex gap-3">
                        {session ? (
                            // CARD CONECTADO (Sem botão de Log Out)
                            <div className="flex items-center gap-3 bg-cyan-950/30 border border-cyan-500/20 px-4 py-2 rounded-xl backdrop-blur-md shadow-lg group hover:border-cyan-500/40 transition-all">
                                {session.user?.image ? (
                                    <img
                                        src={session.user.image}
                                        alt="User"
                                        className="w-8 h-8 rounded-full border border-cyan-400/50 shadow-[0_0_10px_rgba(34,211,238,0.3)]"
                                    />
                                ) : (
                                    <div className="w-8 h-8 rounded-full bg-cyan-900/50 flex items-center justify-center border border-cyan-500/30">
                                        <UserCircleIcon className="w-5 h-5 text-cyan-300" />
                                    </div>
                                )}

                                <div className="flex flex-col">
                <span className="text-[9px] text-cyan-400 font-bold uppercase tracking-widest leading-none mb-1">
                    {t("workstation.connected")}
                </span>
                                    <span className="text-[11px] text-white font-mono leading-none tracking-wide max-w-[120px] truncate">
                    {session.user?.name || session.user?.email}
                </span>
                                </div>
                                {/* O separador e o botão signOut() foram removidos daqui para despoluir a UI */}
                            </div>
                        ) : (
                            // BOTÃO PARA LOGIN
                            <button onClick={() => signIn('google')} className="flex items-center gap-2 bg-white/5 border border-white/20 px-4 py-2 rounded-xl hover:bg-white/10 transition-all group backdrop-blur-md hover:border-cyan-500/30">
                                <UserCircleIcon className="w-5 h-5 text-white/70 group-hover:text-white" />
                                <div className="flex flex-col items-start">
                                    <span className="text-[8px] text-white/50 font-bold uppercase tracking-widest">{t("workstation.welcome")}</span>
                                    <span className="text-[10px] text-white font-bold group-hover:text-cyan-300 transition-colors">
                    {t("workstation.login")}
                </span>
                                </div>
                            </button>
                        )}
                    </div>

                    {/* --- VISUALS --- */}
                    <div className="absolute bottom-6 left-6 z-30 flex flex-col items-center">
                        <div className={`relative transition-all duration-500 ease-in-out flex justify-center items-end ${activeConfig.widthClass} h-auto`}>
                            <AnimatePresence mode="wait">
                                {isImageLoading ? (
                                    <motion.div key="loader" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-48 w-full flex items-center justify-center">
                                        <div className="bg-black/40 p-4 rounded-full backdrop-blur-md border border-white/10">
                                            <div className="animate-spin text-white/50 w-8 h-8 rounded-full border-2 border-white/20 border-t-cyan-500"></div>
                                        </div>
                                    </motion.div>
                                ) : (
                                    <motion.div key={selectedAgent} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="w-full flex justify-center">
                                        <Image src={activeConfig.image} alt={activeConfig.name} className="w-full h-auto object-contain object-bottom drop-shadow-[0_0_35px_rgba(34,211,238,0.25)] max-h-[550px]" />
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                        <div className="relative mt-2">
                            <AnimatePresence>
                                {isAgentMenuOpen && (
                                    <motion.div initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }} className="absolute bottom-full left-0 mb-3 flex flex-col gap-2 bg-[#0a0a0a]/95 border border-white/10 rounded-xl p-2 backdrop-blur-xl shadow-2xl min-w-[160px] z-50">
                                        {Object.entries(AGENTS).map(([key, agent]) => (
                                            <button key={key} onClick={() => handleAgentSwitch(key as AgentKey)} className={`flex items-center gap-3 p-2 rounded-lg text-left transition-all hover:bg-white/10 ${selectedAgent === key ? 'bg-white/5 ring-1 ring-white/10' : ''}`}>
                                                <div className={`p-1.5 rounded ${agent.bg} ${agent.color}`}><agent.icon className="w-4 h-4" /></div>
                                                <div className="flex flex-col"><span className="text-[12px] font-bold text-white tracking-wide">{agent.name}</span><span className="text-[10px] text-white/40 uppercase">{t(agent.roleKey)}</span></div>
                                            </button>
                                        ))}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                            <button onClick={() => setIsAgentMenuOpen(!isAgentMenuOpen)} disabled={isImageLoading} className="flex items-center gap-3 bg-[#0a0a0a]/60 border border-white/10 hover:border-white/20 hover:bg-[#0a0a0a]/80 backdrop-blur-md rounded-full pl-2 pr-4 py-2 transition-all shadow-lg group disabled:opacity-50">
                                <div className={`p-1.5 rounded-full ${activeConfig.bg} ${activeConfig.color} ${activeConfig.border} border`}>{(() => { const Icon = activeConfig.icon; return <Icon className="w-4 h-4" />; })()}</div>
                                <div className="flex flex-col items-start"><span className="text-[10px] text-white/40 font-bold uppercase tracking-wider">{t("workstation.active_agent")}</span><span className="text-xs font-bold text-white tracking-wide group-hover:text-cyan-200 transition-colors">{activeConfig.name}</span></div>
                                <ChevronUpIcon className={`w-3 h-3 text-white/30 ml-2 transition-transform duration-300 ${isAgentMenuOpen ? 'rotate-180' : ''}`} />
                            </button>
                        </div>
                    </div>

                    {/* CHAT CONTENT */}
                    <div ref={chatContainerRef} className="flex-1 relative p-6 overflow-y-auto custom-scrollbar flex flex-col z-0 pt-16">
                        <div className="flex-1" />
                        <div className="space-y-6 pb-2">
                            {chatHistory.map((msg, i) => (
                                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : `justify-start transition-all duration-300 ${activeConfig.contentPadding}`}`}>
                                    <div className={`max-w-[85%] rounded-2xl px-5 py-3 text-sm font-light tracking-wide leading-relaxed shadow-lg relative ${msg.role === 'user' ? 'bg-cyan-900/40 text-cyan-50 border border-cyan-500/30' : 'bg-[#0a0a0a]/80 text-white/90 border border-white/10'}`}>{msg.text}</div>
                                </div>
                            ))}
                            {isTyping && (
                                <div className={`flex justify-start transition-all duration-300 ${activeConfig.contentPadding}`}>
                                    <div className="bg-[#0a0a0a]/60 border border-white/5 px-4 py-2 rounded-xl flex gap-1"><span className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" /><span className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce [animation-delay:0.1s]" /><span className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce [animation-delay:0.2s]" /></div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* INPUT AREA */}
                    <div className="p-5 bg-black/60 border-t border-white/10 flex flex-col gap-3 shrink-0 backdrop-blur-xl z-20 relative rounded-b-xl">
                        <div className={`flex gap-3 items-center transition-all duration-300 ${activeConfig.contentPadding}`}>
                            <div className="flex-1 relative">
                                <input type="text" value={prompt} onChange={(e) => setPrompt(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend()} placeholder={t("workstation.chat_placeholder", { role: t(activeConfig.roleKey).toLowerCase() })} className="w-full bg-black/50 border border-white/10 rounded-xl py-3 px-4 text-white placeholder:text-white/40 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all font-mono text-sm" />
                            </div>
                            <button onClick={handleSend} className="bg-cyan-500 text-black border border-cyan-400 hover:bg-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.3)] h-full px-6 rounded-xl font-bold text-xs tracking-wider flex items-center gap-2 transition-all active:scale-95">{t("workstation.send")} <PaperAirplaneIcon className="w-3.5 h-3.5 -rotate-45" /></button>
                        </div>
                        <div className={`flex justify-end items-center px-1 transition-all duration-300 ${activeConfig.contentPadding}`}>
                            <button onClick={() => setChatHistory([])} className="text-[10px] text-red-400/50 hover:text-red-400 flex items-center gap-1.5 px-2 py-1 hover:bg-red-900/10 rounded transition-colors uppercase tracking-widest"><TrashIcon className="w-3 h-3" /> {t("workstation.clear_history")}</button>
                        </div>
                    </div>
                </div>

                {/* --- 2. RIGHT SIDE: DOCUMENT & TERMINAL --- */}
                <div className="col-span-5 flex flex-col gap-4 h-full">
                    <div onClick={() => setActiveSection('doc')} className={`${panelStyle} flex-1 flex flex-col ${activeSection === 'doc' ? activeBorder : ''} group relative`}>
                        <div className="h-14 bg-black/40 border-b border-white/10 flex items-center px-6 shrink-0 gap-4">
                            <input value={docTitle} onChange={(e) => setDocTitle(e.target.value)} className="bg-transparent text-white/90 text-sm font-mono focus:outline-none focus:text-cyan-400 w-full border-b border-transparent focus:border-cyan-500/50 transition-colors placeholder:text-white/30" placeholder={t("workstation.doc_title_placeholder")} />
                        </div>
                        <textarea value={docContent} onChange={(e) => setDocContent(e.target.value)} className="flex-1 p-8 font-mono text-sm text-slate-900 leading-loose overflow-auto scrollbar-dark-thumb bg-[#f1f5f9] resize-none focus:outline-none transition-colors placeholder:text-slate-400" placeholder={t("workstation.doc_content_placeholder")} />
                        <div className="p-4 bg-[#f1f5f9] flex justify-end gap-3 rounded-b-xl">
                            <button onClick={saveSession} className={`${btnBase} bg-blue-100 text-blue-700 border-blue-400 hover:bg-blue-200`}>
                                <ArrowDownTrayIcon className="w-4 h-4" /> {t("workstation.session_save")}
                            </button>
                            <button disabled={true} className={`${btnBase} opacity-50 cursor-not-allowed bg-slate-200 text-slate-500 border-slate-300`}><CpuChipIcon className="w-4 h-4" /> {t("workstation.auto_fix")}</button>
                            <button onClick={handleGenerateProtocol} disabled={isBlockchainProcessing || !privyAuthenticated} className={`${btnBase} ${isBlockchainProcessing ? 'bg-yellow-100 border-yellow-400 text-yellow-700' : 'bg-green-100 text-green-700 border-green-400 hover:bg-green-200'}`}>{isBlockchainProcessing ? <>{t("workstation.processing")}</> : <><PlayIcon className="w-4 h-4" /> {t("workstation.generate")}</>}</button>
                        </div>
                    </div>

                    {/* --- TERMINAL (INFRA - PRIVY) --- */}
                    {!isFocusMode && (
                        <div onClick={() => setActiveSection('terminal')} className={`${panelStyle} h-[28%] flex flex-col shrink-0 ${activeSection === 'terminal' ? activeBorder : ''}`}>

                            {/* --- HEADER DO TERMINAL (LIMPO E VIBRANTE) --- */}
                            <div className="h-9 bg-[#0a0a0a] border-b border-white/5 flex items-center px-4 shrink-0 select-none gap-4">

                                {/* LED STATUS */}
                                <div
                                    className={`w-2 h-2 rounded-full shadow-[0_0_8px_currentColor] transition-colors duration-500 ${
                                        isBlockchainProcessing ? 'bg-yellow-400 text-yellow-400 animate-pulse' :
                                            (privyAuthenticated && wallet) ? 'bg-emerald-500 text-emerald-500' :
                                                'bg-red-600 text-red-600 animate-pulse'
                                    }`}
                                />

                                {/* CARD DA CARTEIRA / BOTÃO DE COPIAR */}
                                {privyReady && privyAuthenticated && wallet ? (
                                    // CONECTADO: Agora é um botão que copia o endereço
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => {
                                                navigator.clipboard.writeText(wallet.address);
                                                setCopied(true);
                                                setTimeout(() => setCopied(false), 2000);
                                                addLog("Address copied to clipboard.");
                                            }}
                                            className="flex items-center gap-3 bg-emerald-500/5 border border-emerald-500/20 px-3 py-1 rounded hover:bg-emerald-500/10 hover:border-emerald-500/40 transition-all group active:scale-95"
                                            title="Click to copy address"
                                        >
                <span className="text-[10px] font-mono text-emerald-400/90 tracking-wide">
                    {copied ? "COPIED!" : `${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}`}
                </span>

                                            {/* Ícone discreto que aparece no hover */}
                                            <div className="w-3 h-3 text-emerald-600 group-hover:text-emerald-400 transition-colors">
                                                <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-full h-full">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75" />
                                                </svg>
                                            </div>
                                        </button>

                                        {/* Botão de Disconnect separado e minimalista */}
                                        <button
                                            onClick={disconnectWallet}
                                            className="p-1 text-emerald-800 hover:text-red-500 transition-colors"
                                            title="Disconnect"
                                        >
                                            <PowerIcon className="w-3 h-3" />
                                        </button>
                                    </div>
                                ) : (
                                    // DESCONECTADO
                                    <button
                                        onClick={connectWallet}
                                        className="flex items-center bg-red-600/10 border border-red-600/40 px-3 py-1 rounded hover:bg-red-600/20 hover:border-red-500 transition-all group"
                                    >
            <span className="text-[10px] font-bold text-red-500 group-hover:text-red-400 tracking-wide uppercase">
                {t("workstation.no_wallet")}
            </span>
                                    </button>
                                )}
                                {/* Lado direito vazio para manter o foco na esquerda */}
                            </div>

                            <div ref={terminalRef} className="flex-1 p-4 font-mono text-xs text-green-500/90 bg-black/60 overflow-y-auto custom-scrollbar shadow-inner rounded-b-xl">
                                <div className="opacity-80 space-y-1">
                                    {terminalLogs.map((log, idx) => (<div key={idx} className="break-all">{log}</div>))}
                                    <p>zaeon@root:~$ <span className="animate-pulse">_</span></p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(34,211,238,0.4); }
      `}</style>
        </div>
    );
}