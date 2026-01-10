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
    RocketLaunchIcon,
    XMarkIcon,
    DocumentDuplicateIcon,
} from "@heroicons/react/24/outline";
import MatrixRain from "@/components/main/star-background";

// --- I18N ---
import { useTranslation } from "react-i18next";
import "../../src/i18n";

// --- 1. NEXT AUTH ---
import { useSession, signIn } from "next-auth/react";

// --- 2. PRIVY & WEB3 ---
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
        boosterImage: "/assets/zenitta-booster.png",
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
        boosterImage: "/assets/ballena-booster.png",
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
        boosterImage: "/assets/ethernaut-booster.png",
        widthClass: "w-[260px]",
        contentPadding: "pl-[290px]"
    },
};

type AgentKey = keyof typeof AGENTS;

export default function WorkStationPage() {
    const { data: session } = useSession();
    const { login: connectWallet, authenticated: privyAuthenticated, ready: privyReady, logout: disconnectWallet } = usePrivy();
    const { wallets } = useWallets();
    const wallet = wallets[0];
    const { t } = useTranslation();

    const [mounted, setMounted] = useState(false);
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
    const [isFocusMode, setIsFocusMode] = useState(false);
    const [isBoosterOpen, setIsBoosterOpen] = useState(false);

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
            chatContainerRef.current.scrollTo({ top: chatContainerRef.current.scrollHeight, behavior: "smooth" });
        }
        if (terminalRef.current) {
            terminalRef.current.scrollTo({ top: terminalRef.current.scrollHeight, behavior: "smooth"});
        }
    };

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
                } catch (e) { console.error(e); }
            }
        };
        if (mounted && (session || wallet)) loadSession();
    }, [mounted, session, wallet]);

    useEffect(() => { if (mounted) scrollToBottom(); }, [chatHistory, terminalLogs, mounted, isTyping, selectedAgent]);

    // --- CORREÇÃO: ALTERNAR PERSONAGEM FUNCIONAL ---
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
                body: JSON.stringify({ prompt: currentPrompt, agent: selectedAgent })
            });
            const data = await response.json();
            setChatHistory(prev => [...prev, { role: 'ai', text: data.text }]);
        } catch (error) {
            addLog("Error connecting to AI API.");
        } finally { setIsTyping(false); }
    };

    // --- NOVO: LÓGICA DE TRANSAÇÃO + MONGODB ---
    const handleBoostAndSave = async () => {
        if (!privyAuthenticated || !wallet) {
            connectWallet();
            return;
        }

        setIsBlockchainProcessing(true);
        addLog("🚀 Initiating Smart Contract handshake...");

        try {
            const provider = await wallet.getEthereumProvider();

            // DISPARO DA TRANSAÇÃO REAL (MODAL PRIVY)
            const txHash = await provider.request({
                method: 'eth_sendTransaction',
                params: [{
                    from: wallet.address,
                    to: '0x0000000000000000000000000000000000000000', // Endereço do Contrato Zaeon
                    data: '0x', // Encode da função mintBadge()
                    value: '0x0',
                }],
            });

            addLog(`Tx Sent: ${String(txHash).slice(0, 10)}... Awaiting EVM...`);
            await new Promise(r => setTimeout(r, 2000));
            addLog("✅ Badge Minted. Memory Persistence Authorized.");

            // AGORA SALVA NO MONGODB
            const userId = session?.user?.email || wallet?.address;
            const res = await fetch('/api/workspace', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId, title: docTitle, content: docContent,
                    agent: selectedAgent, chatHistory, terminalLogs
                })
            });

            if (res.ok) {
                addLog("✅ Session saved to Neural Cloud.");
                setIsBoosterOpen(false);
            }
        } catch (error: any) {
            addLog(`❌ Transaction Error: ${error.message || "User denied"}`);
        } finally {
            setIsBlockchainProcessing(false);
        }
    };

    // --- REINTEGRAÇÃO: GERADOR DE PROTOCOLO (IPFS) ---
    const handleGenerateProtocol = async () => {
        if (!privyAuthenticated || !wallet) {
            alert(t("workstation.no_wallet"));
            connectWallet();
            return;
        }
        const agent = AGENTS[selectedAgent];
        setIsBlockchainProcessing(true);
        addLog(t("workstation.logs.gen_protocol", { name: agent.name }));

        const generatedText = `RESEARCH PAPER: ${docTitle}\n\nAUTHOR: ${agent.name} (AI Agent)\nDATE: ${new Date().toISOString()}\n\nANALYSIS: Verified on Movement EVM Blockchain via Zaeon Protocol.`;
        setDocContent(generatedText);

        try {
            const ipfsHash = await uploadToPinata({
                title: docTitle,
                agent: agent.name,
                content: generatedText
            });
            if (ipfsHash) addLog(t("workstation.logs.ipfs_success", { hash: ipfsHash }));
        } catch (e) {
            addLog("❌ IPFS Upload failed.");
        } finally {
            setIsBlockchainProcessing(false);
        }
    };

    if (!mounted) return <div className="w-full h-screen bg-[#030014]" />;

    const activeConfig = AGENTS[selectedAgent];
    const panelStyle = "relative overflow-hidden backdrop-blur-2xl border border-white/10 shadow-[0_0_40px_rgba(34,211,238,0.12)] bg-[linear-gradient(135deg,rgba(7,38,77,0.4),rgba(11,58,164,0.3),rgba(7,38,77,0.4))] rounded-[24px] transition-all duration-300";

    return (
        <div className={`relative w-full h-screen bg-background dark:bg-[#030014] overflow-hidden flex flex-col justify-end items-center pb-2 px-4 transition-all duration-500 ${isFocusMode ? 'z-[100] !bg-[#030014]' : ''}`}>

            <div className="absolute inset-0 z-0 pointer-events-none">
                <MatrixRain />
            </div>

            {/* --- FOCUS MODE BAR --- */}
            <div className="fixed top-[18px] right-2 z-[150] flex flex-col items-center">
                <div onClick={() => setIsFocusMode(!isFocusMode)} title={t("workstation.focus_mode")} className={`w-8 h-14 rounded-full border transition-all duration-300 cursor-pointer backdrop-blur-xl shadow-lg flex flex-col items-center p-1 ${isFocusMode ? "bg-cyan-900/80 border-cyan-500/50 shadow-[0_0_15px_rgba(8,145,178,0.4)]" : "bg-white/80 border-slate-300 dark:bg-white/10 dark:border-white/20"}`}>
                    <motion.div className={`w-5 h-5 rounded-full shadow-sm flex items-center justify-center ${isFocusMode ? "bg-cyan-400 text-black" : "bg-slate-400 dark:bg-white/40 text-white"}`} animate={{ y: isFocusMode ? 0 : 26 }} transition={{ type: "spring", stiffness: 400, damping: 25 }}>
                        {isFocusMode ? <EyeIcon className="w-3 h-3" /> : <PowerIcon className="w-3 h-3" />}
                    </motion.div>
                </div>
            </div>

            <div className="z-20 w-full max-w-[1700px] h-[88vh] grid grid-cols-12 gap-6">

                {/* --- CHAT WINDOW --- */}
                <div onClick={() => setActiveSection('chat')} className={`col-span-7 ${panelStyle} flex flex-col ${activeSection === 'chat' ? 'ring-1 ring-cyan-400/50' : ''} relative h-full`}>

                    {/* AUTH HEADER */}
                    <div className="absolute top-4 left-4 z-40 flex gap-3">
                        {session ? (
                            <div className="flex items-center gap-3 bg-cyan-950/30 border border-cyan-500/20 px-4 py-2 rounded-2xl backdrop-blur-md shadow-lg">
                                {session.user?.image && <Image src={session.user.image} alt="User" width={32} height={32} className="w-8 h-8 rounded-full border border-cyan-400/50" />}
                                <div className="flex flex-col">
                                    <span className="text-[9px] text-cyan-400 font-bold uppercase tracking-widest leading-none mb-1">{t("workstation.connected")}</span>
                                    <span className="text-[11px] text-white font-mono leading-none truncate max-w-[120px]">{session.user?.name}</span>
                                </div>
                            </div>
                        ) : (
                            <button onClick={() => signIn('google')} className="flex items-center gap-2 bg-white/5 border border-white/20 px-4 py-2 rounded-2xl hover:bg-white/10 transition-all backdrop-blur-md">
                                <UserCircleIcon className="w-5 h-5 text-white/70" />
                                <span className="text-[10px] text-white font-bold">{t("workstation.login")}</span>
                            </button>
                        )}
                    </div>

                    {/* AGENT RENDER */}
                    <div className="absolute bottom-6 left-6 z-30 flex flex-col items-center">
                        <div className={`relative transition-all duration-500 flex justify-center items-end ${activeConfig.widthClass} h-auto`}>
                            <AnimatePresence mode="wait">
                                {isImageLoading ? (
                                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-48 w-full flex items-center justify-center">
                                        <div className="animate-spin text-white/50 w-8 h-8 rounded-full border-2 border-white/20 border-t-cyan-500"></div>
                                    </motion.div>
                                ) : (
                                    <motion.div key={selectedAgent} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full flex justify-center">
                                        <Image src={activeConfig.image} alt={activeConfig.name} className="w-full h-auto object-contain object-bottom drop-shadow-[0_0_35px_rgba(34,211,238,0.25)] max-h-[550px]" />
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* AGENT MENU (FUNCIONAL) */}
                        <div className="relative mt-2">
                            <AnimatePresence>
                                {isAgentMenuOpen && (
                                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute bottom-full left-0 mb-3 flex flex-col gap-2 bg-[#0a0a0a]/95 border border-white/10 rounded-xl p-2 backdrop-blur-xl shadow-2xl min-w-[160px] z-50">
                                        {Object.keys(AGENTS).map((key) => {
                                            const ag = AGENTS[key as AgentKey];
                                            return (
                                                <button key={key} onClick={() => handleAgentSwitch(key as AgentKey)} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/10 transition-all text-left">
                                                    <div className={`p-1.5 rounded ${ag.bg} ${ag.color}`}><ag.icon className="w-4 h-4" /></div>
                                                    <div className="flex flex-col"><span className="text-[12px] font-bold text-white">{ag.name}</span></div>
                                                </button>
                                            );
                                        })}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                            <button onClick={() => setIsAgentMenuOpen(!isAgentMenuOpen)} className="flex items-center gap-3 bg-[#0a0a0a]/60 border border-white/10 hover:border-white/20 backdrop-blur-md rounded-full pl-2 pr-4 py-2 transition-all shadow-lg group">
                                <div className={`p-1.5 rounded-full ${activeConfig.bg} ${activeConfig.color} border ${activeConfig.border}`}><activeConfig.icon className="w-4 h-4" /></div>
                                <span className="text-xs font-bold text-white tracking-wide">{activeConfig.name}</span>
                                <ChevronUpIcon className={`w-3 h-3 text-white/30 ml-2 transition-transform duration-300 ${isAgentMenuOpen ? 'rotate-180' : ''}`} />
                            </button>
                        </div>
                    </div>

                    <div ref={chatContainerRef} className="flex-1 relative p-6 overflow-y-auto custom-scrollbar flex flex-col z-0 pt-16">
                        <div className="flex-1" />
                        <div className="space-y-6 pb-2">
                            {chatHistory.map((msg, i) => (
                                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : `justify-start transition-all duration-300 ${activeConfig.contentPadding}`}`}>
                                    <div className={`max-w-[85%] rounded-2xl px-5 py-3 text-sm font-light shadow-lg relative ${msg.role === 'user' ? 'bg-cyan-900/40 text-cyan-50 border border-cyan-500/30' : 'bg-[#0a0a0a]/80 text-white/90 border border-white/10'}`}>{msg.text}</div>
                                </div>
                            ))}
                            {isTyping && (
                                <div className={`flex justify-start transition-all duration-300 ${activeConfig.contentPadding}`}>
                                    <div className="bg-[#0a0a0a]/60 border border-white/5 px-4 py-2 rounded-xl flex gap-1"><span className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" /><span className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce [animation-delay:0.1s]" /><span className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce [animation-delay:0.2s]" /></div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="p-5 bg-black/60 border-t border-white/10 flex flex-col gap-3 shrink-0 backdrop-blur-xl z-20 relative rounded-b-[24px]">
                        <div className={`flex gap-3 items-center transition-all duration-300 ${activeConfig.contentPadding}`}>
                            <input type="text" value={prompt} onChange={(e) => setPrompt(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend()} placeholder={t("workstation.chat_placeholder", { role: t(activeConfig.roleKey).toLowerCase() })} className="flex-1 bg-black/50 border border-white/10 rounded-xl py-3 px-4 text-white placeholder:text-white/40 focus:outline-none font-mono text-sm" />
                            <button onClick={handleSend} className="bg-cyan-500 text-black px-6 rounded-xl font-bold text-xs uppercase hover:bg-cyan-400 active:scale-95 transition-all h-11">Send</button>
                        </div>
                    </div>
                </div>

                {/* --- DOC & TERMINAL --- */}
                <div className="col-span-5 flex flex-col gap-4 h-full">
                    <div onClick={() => setActiveSection('doc')} className={`${panelStyle} flex-1 flex flex-col ${activeSection === 'doc' ? 'ring-1 ring-cyan-400/50' : ''}`}>
                        <div className="h-14 bg-black/40 border-b border-white/10 flex items-center px-6">
                            <input value={docTitle} onChange={(e) => setDocTitle(e.target.value)} className="bg-transparent text-white/90 text-sm font-mono focus:outline-none w-full" />
                        </div>
                        <textarea value={docContent} onChange={(e) => setDocContent(e.target.value)} className="flex-1 p-8 font-mono text-sm text-slate-900 bg-[#f1f5f9] outline-none resize-none" />

                        <div className="p-4 bg-[#f1f5f9] flex justify-end gap-3 rounded-b-[24px]">
                            {/* ABRE O BOOSTER GATE */}
                            <button onClick={() => setIsBoosterOpen(true)} className="px-4 py-2 rounded-xl text-[11px] font-bold border transition flex items-center gap-2 bg-blue-100 text-blue-700 border-blue-400 hover:bg-blue-200 uppercase tracking-wider">
                                <ArrowDownTrayIcon className="w-4 h-4" /> Save Session
                            </button>
                            <button onClick={handleGenerateProtocol} disabled={isBlockchainProcessing} className={`px-4 py-2 rounded-xl text-[11px] font-bold border transition flex items-center gap-2 uppercase tracking-wider ${isBlockchainProcessing ? 'bg-yellow-100 text-yellow-700 border-yellow-400' : 'bg-green-100 text-green-700 border-green-400 hover:bg-green-200'}`}>
                                <PlayIcon className="w-4 h-4" /> {isBlockchainProcessing ? "Processing..." : "Generate"}
                            </button>
                        </div>
                    </div>

                    {/* --- TERMINAL WEB3 (RESTAURADO) --- */}
                    {!isFocusMode && (
                        <div onClick={() => setActiveSection('terminal')} className={`${panelStyle} h-[28%] flex flex-col shrink-0`}>
                            <div className="h-9 bg-[#0a0a0a] border-b border-white/5 flex items-center px-4 shrink-0 justify-between">
                                <div className="flex items-center gap-3">
                                    <div className={`w-2 h-2 rounded-full shadow-[0_0_8px_currentColor] ${privyAuthenticated && wallet ? 'bg-emerald-500 text-emerald-500' : 'bg-red-600 text-red-600 animate-pulse'}`} />
                                    {privyReady && privyAuthenticated && wallet ? (
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => {
                                                    navigator.clipboard.writeText(wallet.address);
                                                    setCopied(true);
                                                    setTimeout(() => setCopied(false), 2000);
                                                }}
                                                className="flex items-center gap-2 bg-emerald-500/5 border border-emerald-500/20 px-2 py-0.5 rounded hover:bg-emerald-500/10 group transition-all"
                                            >
                                                <span className="text-[9px] font-mono text-emerald-400">{copied ? "COPIED!" : `${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}`}</span>
                                                <DocumentDuplicateIcon className="w-3 h-3 text-emerald-600 group-hover:text-emerald-400" />
                                            </button>
                                            <PowerIcon onClick={disconnectWallet} className="w-3 h-3 text-emerald-800 hover:text-red-500 cursor-pointer transition-colors" />
                                        </div>
                                    ) : (
                                        <button onClick={connectWallet} className="text-[9px] font-bold text-red-500 uppercase tracking-widest hover:text-red-400 transition-colors">Connect Wallet</button>
                                    )}
                                </div>
                                <span className="text-[8px] text-white/20 font-mono tracking-[0.2em] uppercase">Zaeon Neural Node v2.0.26</span>
                            </div>

                            <div ref={terminalRef} className="flex-1 p-4 font-mono text-xs text-green-500/80 bg-black/60 overflow-y-auto custom-scrollbar rounded-b-[24px]">
                                {terminalLogs.map((log, idx) => (<div key={idx} className="mb-1">{log}</div>))}
                                <p>zaeon@root:~$ <span className="animate-pulse">_</span></p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* --- SESSION BOOSTER MODAL (Dinamico e Gatekeeper) --- */}
            <AnimatePresence>
                {isBoosterOpen && (
                    <div className="fixed inset-0 z-[300] flex items-center justify-center p-6">
                        {/* Backdrop */}
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsBoosterOpen(false)} className="absolute inset-0 bg-[#030014]/90 backdrop-blur-md cursor-pointer" />

                        {/* Modal Body */}
                        <motion.div initial={{ opacity: 0, scale: 0.9, y: 40 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 40 }}
                                    className="relative w-full max-w-5xl bg-[#0a0a0a] border border-cyan-500/20 rounded-[40px] overflow-hidden shadow-[0_0_100px_rgba(34,211,238,0.2)] flex flex-col md:flex-row min-h-[500px]"
                        >
                            <button onClick={() => setIsBoosterOpen(false)} className="absolute top-6 right-6 z-50 text-white/30 hover:text-white transition-colors">
                                <XMarkIcon className="w-6 h-6" />
                            </button>

                            {/* LADO ESQUERDO: IMAGEM DINAMICA */}
                            <div className="w-full md:w-1/2 relative min-h-[400px] bg-black">
                                <motion.div key={activeConfig.boosterImage} initial={{ opacity: 0, scale: 1.1, filter: "blur(20px)" }} animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }} transition={{ duration: 0.8, ease: "easeOut" }} className="relative w-full h-full">
                                    <Image src={activeConfig.boosterImage} alt="Neural Booster" fill className="object-cover" priority />
                                    {/* Efeito de fade no lado direito para fundir com o conteudo */}
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-[#0a0a0a] hidden md:block" />
                                </motion.div>
                            </div>

                            {/* LADO DIREITO: TRANSACTION GATE */}
                            <div className="w-full md:w-1/2 p-12 flex flex-col justify-center">
                                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-[10px] font-bold uppercase tracking-[0.2em] mb-6">
                                    <RocketLaunchIcon className="w-3 h-3" /> Movement EVM Upgrade
                                </div>
                                <h2 className="text-4xl font-bold text-white mb-6 leading-tight">
                                    Sync {activeConfig.name}'s <span className="text-cyan-400">Memory Core</span>
                                </h2>
                                <p className="text-slate-400 text-sm leading-relaxed mb-10">
                                    Seu agente atingiu o limite de buffers neurais temporários. Assine a transação de **Badge Sync** na blockchain para persistir esta pesquisa no MongoDB e habilitar o aprendizado contextual do agente.
                                </p>

                                <div className="flex flex-col gap-4">
                                    <button
                                        onClick={handleBoostAndSave}
                                        disabled={isBlockchainProcessing}
                                        className="w-full bg-cyan-500 hover:bg-cyan-400 text-black font-black py-4 rounded-2xl transition-all shadow-[0_0_20px_rgba(34,211,238,0.4)] flex items-center justify-center gap-3 uppercase tracking-widest text-xs group disabled:opacity-50"
                                    >
                                        {isBlockchainProcessing ? (
                                            <div className="animate-spin border-t-black border-2 w-5 h-5 rounded-full" />
                                        ) : (
                                            <>
                                                <RocketLaunchIcon className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                                Confirm Transaction & Save
                                            </>
                                        )}
                                    </button>
                                    <button onClick={() => setIsBoosterOpen(false)} className="w-full py-2 text-white/30 text-[10px] uppercase font-bold tracking-widest hover:text-white transition-colors">
                                        Back to Station
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar { width: 5px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(34,211,238,0.4); }
            `}</style>
        </div>
    );
}