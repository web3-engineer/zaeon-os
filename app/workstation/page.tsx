"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import {
    PaperAirplaneIcon,
    TrashIcon,
    CpuChipIcon,
    PlayIcon,
    ArrowDownTrayIcon,
    AcademicCapIcon,
    CommandLineIcon,
    HeartIcon,
    CalculatorIcon,
    ChevronUpIcon,
} from "@heroicons/react/24/outline";
import MatrixRain from "@/components/main/star-background";

// --- I18N IMPORTS ---
import { useTranslation } from "react-i18next";
import "../../src/i18n";

// --- WEB3 IMPORTS ---
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useConnect } from 'wagmi';
import { uploadToPinata } from "@/src/utils/ipfs";

// --- IMAGE IMPORTS ---
import zoxImage from "./zox.png";
import ethernautImage from "./ethernaut.png";
import ballenaImage from "./ballena.png";

// --- CONTRACT CONFIGURATION ---
const CONTRACT_ADDRESS = "0xceccfaf7e5f883fa399b9c9272f26030890f17bbbcbdb248b56908a1c6569412";

const CONTRACT_ABI = [
    {
        "inputs": [
            { "internalType": "address", "name": "scientist", "type": "address" },
            { "internalType": "string", "name": "ipfsMetadataUrl", "type": "string" }
        ],
        "name": "mintResearch",
        "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
        "stateMutability": "nonpayable",
        "type": "function"
    }
] as const;

// --- ASSETS: PIXEL PYTHON SVG ---
const PixelPython = ({ color = "#22d3ee" }: { color?: string }) => (
    <svg width="45" height="45" viewBox="0 0 24 24" fill="none" className="drop-shadow-[0_0_15px_rgba(34,211,238,0.6)]">
        <path d="M10 4H14V6H16V10H14V8H10V10H8V6H10V10H8V6H10V4Z" fill={color} />
        <path d="M16 10H18V14H16V16H8V14H6V10H8V12H16V10Z" fill={color} fillOpacity="0.7"/>
        <rect x="9" y="5" width="1" height="1" fill="white" />
        <rect x="13" y="5" width="1" height="1" fill="white" />
    </svg>
);

// --- AGENT CONFIGURATION (Com Chaves de Tradução) ---
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
    const { t } = useTranslation();
    const [mounted, setMounted] = useState(false);

    // --- WEB3 STATE ---
    const { address, isConnected } = useAccount();
    const { connectors, connect } = useConnect();
    const { writeContract, data: hash, error: writeError } = useWriteContract();
    const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

    // --- UI STATE ---
    const [activeSection, setActiveSection] = useState<"doc" | "chat" | "terminal" | null>(null);
    const [prompt, setPrompt] = useState("");
    const [docTitle, setDocTitle] = useState("Untitled_Research_Paper.txt");
    const [docContent, setDocContent] = useState("");
    const [terminalLogs, setTerminalLogs] = useState<string[]>([]);

    const [selectedAgent, setSelectedAgent] = useState<AgentKey>("zenita");
    const [isAgentMenuOpen, setIsAgentMenuOpen] = useState(false);
    const [isImageLoading, setIsImageLoading] = useState(false);

    const [chatHistory, setChatHistory] = useState<{role: 'user' | 'ai', text: string}[]>([]);
    const [isTyping, setIsTyping] = useState(false);

    const chatContainerRef = useRef<HTMLDivElement>(null);
    const terminalRef = useRef<HTMLDivElement>(null);

    // Initial translation log
    useEffect(() => {
        setMounted(true);
        setTimeout(() => addLog(t("workstation.system_init")), 100);
    }, []);

    const scrollToBottom = () => {
        if (chatContainerRef.current) {
            const { scrollHeight, clientHeight } = chatContainerRef.current;
            chatContainerRef.current.scrollTo({ top: scrollHeight - clientHeight, behavior: "smooth" });
        }
        if (terminalRef.current) {
            terminalRef.current.scrollTo({ top: terminalRef.current.scrollHeight, behavior: "smooth"});
        }
    };

    useEffect(() => { if (mounted) scrollToBottom(); }, [chatHistory, terminalLogs, mounted, isTyping, selectedAgent]);

    // Monitoramento da Transação (Traduzido)
    useEffect(() => {
        if (isConfirming) {
            addLog(t("workstation.logs.blockchain_securing"));
        }
        if (isConfirmed) {
            addLog(`${t("workstation.logs.success")} Tx: ${hash?.slice(0, 10)}...`);
            setChatHistory(prev => [...prev, { role: 'ai', text: `Document secured on chain.\nTx Hash: ${hash}` }]);
        }
        if (writeError) {
            addLog(`ERROR: ${writeError.message.slice(0, 30)}...`);
        }
    }, [isConfirming, isConfirmed, writeError, hash]);

    const addLog = (msg: string) => {
        setTerminalLogs(prev => [...prev, `zaeon@root:~$ ${msg}`]);
    };

    const handleAgentSwitch = (key: AgentKey) => {
        if (key === selectedAgent) return;
        setIsAgentMenuOpen(false);
        setIsImageLoading(true);
        setSelectedAgent(key);
        addLog(t("workstation.logs.switched", { name: AGENTS[key].name }));
        setTimeout(() => { setIsImageLoading(false); }, 600);
    };

    const handleSend = () => {
        if(!prompt.trim()) return;
        setChatHistory(prev => [...prev, { role: 'user', text: prompt }]);
        setPrompt("");
        setIsTyping(true);

        const agent = AGENTS[selectedAgent];
        setTimeout(() => {
            setChatHistory(prev => [...prev, { role: 'ai', text: `${agent.name}: Acknowledged. I can process "${prompt}". Click GENERATE to compile the research paper.` }]);
            setIsTyping(false);
        }, 1000);
    };

    // --- MAIN LOGIC ---
    const handleGenerateProtocol = async () => {
        if (!isConnected) {
            alert("Connection required. Please link wallet.");
            addLog("Error: Wallet disconnected.");
            return;
        }
        if (!docTitle) {
            alert("Document title required.");
            return;
        }

        const agent = AGENTS[selectedAgent];
        addLog(t("workstation.logs.gen_protocol", { name: agent.name }));
        setActiveSection('doc');

        setDocContent("Accessing Neural Network... Generating Research...");
        await new Promise(r => setTimeout(r, 1000));

        const generatedText = `RESEARCH PAPER: ${docTitle}\n\nAUTHOR: ${agent.name} (AI Agent)\nFIELD: ${t(agent.roleKey)}\nDATE: ${new Date().toISOString()}\n\nABSTRACT:\nThis document serves as an immutable record of research regarding "${docTitle}". Generated by the Zaeon Framework utilizing advanced neural processing.\n\nCORE ANALYSIS:\nThe integration of Artificial Intelligence with the Very Network blockchain ensures that this knowledge is preserved with cryptographic certainty.\n\nCONCLUSION:\nData integrity verified.`;

        setDocContent(generatedText);
        addLog(t("workstation.logs.content_gen"));

        try {
            const ipfsHash = await uploadToPinata({
                title: docTitle,
                agent: agent.name,
                topic: t(agent.roleKey),
                content: generatedText
            });

            if (!ipfsHash) {
                throw new Error("IPFS returned null. Check API Keys.");
            }

            addLog(t("workstation.logs.ipfs_success", { hash: ipfsHash }));
            addLog(t("workstation.logs.blockchain_init"));

            writeContract({
                address: CONTRACT_ADDRESS as `0x${string}`,
                abi: CONTRACT_ABI,
                functionName: 'mintResearch',
                args: [address!, ipfsHash],
            });

        } catch (error) {
            console.error("ERRO CRÍTICO:", error);
            addLog(t("workstation.logs.error"));
            alert("Erro no upload. Verifique se o .env.local está configurado e reinicie o servidor.");
        }
    };

    if (!mounted) return <div className="w-full h-screen bg-[#030014]" />;

    const panelStyle = "relative overflow-hidden backdrop-blur-2xl border border-white/10 shadow-[0_0_40px_rgba(34,211,238,0.12)] bg-[linear-gradient(135deg,rgba(7,38,77,0.4),rgba(11,58,164,0.3),rgba(7,38,77,0.4))] rounded-xl transition-all duration-300";
    const activeBorder = "ring-1 ring-cyan-400/50 shadow-[0_0_30px_rgba(34,211,238,0.25)] bg-[linear-gradient(135deg,rgba(7,38,77,0.6),rgba(11,58,164,0.4),rgba(7,38,77,0.6))]";
    const btnBase = "px-4 py-2 rounded-md text-[11px] font-bold border transition flex items-center gap-2 uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed";

    const activeConfig = AGENTS[selectedAgent];

    return (
        <div className="relative w-full h-screen bg-[#030014] overflow-hidden flex flex-col justify-end items-center pb-2 px-4">
            <MatrixRain />

            <div className="z-20 w-full max-w-[1700px] h-[88vh] grid grid-cols-12 gap-6">

                {/* --- 1. LEFT SIDE: CHAT WINDOW --- */}
                <div
                    onClick={() => setActiveSection('chat')}
                    className={`col-span-7 ${panelStyle} flex flex-col ${activeSection === 'chat' ? activeBorder : ''} relative h-full`}
                >
                    <AnimatePresence>
                        {activeSection === 'chat' && (
                            <motion.div
                                initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0, y: [0, -5, 0] }} exit={{ opacity: 0, x: -20 }}
                                transition={{ y: { repeat: Infinity, duration: 2, ease: "easeInOut" } }}
                                className="absolute -left-3 top-[-10px] z-30 pointer-events-none"
                            >
                                <PixelPython color="#22d3ee" />
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* --- HEADER: WALLET BUTTONS --- */}
                    <div className="absolute top-4 left-4 z-40">
                        {isConnected ? (
                            <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/30 px-3 py-1.5 rounded-lg shadow-[0_0_15px_rgba(74,222,128,0.2)] backdrop-blur-md">
                                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse shadow-[0_0_8px_#4ade80]" />
                                <div className="flex flex-col">
                                    <span className="text-[9px] text-green-400/70 font-bold uppercase tracking-widest leading-none mb-0.5">{t("workstation.connected")}</span>
                                    <span className="text-[10px] text-white font-mono leading-none tracking-wide">{address?.slice(0,6)}...{address?.slice(-4)}</span>
                                </div>
                            </div>
                        ) : (
                            <div className="flex gap-2">
                                <button
                                    onClick={() => {
                                        const metaMask = connectors.find(c => c.id === 'io.metamask') || connectors[0];
                                        connect({ connector: metaMask });
                                    }}
                                    className="flex items-center gap-2 bg-orange-500/10 border border-orange-500/30 px-3 py-1.5 rounded-lg hover:bg-orange-500/20 transition-all group backdrop-blur-md"
                                >
                                    <span className="text-lg">🦊</span>
                                    <span className="text-[9px] text-orange-400 font-bold uppercase tracking-widest">{t("workstation.metamask")}</span>
                                </button>

                                <button
                                    onClick={() => {
                                        const wepin = connectors.find(c => c.name === 'Wepin' || c.id === 'wepin');
                                        if (wepin) {
                                            connect({ connector: wepin });
                                        } else {
                                            alert("Wepin not configured in wagmi.ts!");
                                        }
                                    }}
                                    className="flex items-center gap-2 bg-blue-500/10 border border-blue-500/30 px-3 py-1.5 rounded-lg hover:bg-blue-500/20 transition-all group backdrop-blur-md"
                                >
                                    <span className="text-lg">🔵</span>
                                    <span className="text-[9px] text-blue-400 font-bold uppercase tracking-widest">{t("workstation.wepin")}</span>
                                </button>
                            </div>
                        )}
                    </div>

                    {/* --- STATIC VISUALS CONTAINER --- */}
                    <div className="absolute bottom-6 left-6 z-30 flex flex-col items-center">
                        {/* CHARACTER IMAGE */}
                        <div className={`relative transition-all duration-500 ease-in-out flex justify-center items-end ${activeConfig.widthClass} h-auto`}>
                            <AnimatePresence mode="wait">
                                {isImageLoading ? (
                                    <motion.div
                                        key="loader"
                                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                        className="h-48 w-full flex items-center justify-center"
                                    >
                                        <div className="bg-black/40 p-4 rounded-full backdrop-blur-md border border-white/10">
                                            <div className="animate-spin text-white/50 w-8 h-8 rounded-full border-2 border-white/20 border-t-cyan-500"></div>
                                        </div>
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        key={selectedAgent}
                                        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.4 }}
                                        className="w-full flex justify-center"
                                    >
                                        <Image
                                            src={activeConfig.image}
                                            alt={activeConfig.name}
                                            className="w-full h-auto object-contain object-bottom drop-shadow-[0_0_35px_rgba(34,211,238,0.25)] max-h-[550px]"
                                        />
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* AGENT SELECTOR BUTTON */}
                        <div className="relative mt-2">
                            <AnimatePresence>
                                {isAgentMenuOpen && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                        className="absolute bottom-full left-0 mb-3 flex flex-col gap-2 bg-[#0a0a0a]/95 border border-white/10 rounded-xl p-2 backdrop-blur-xl shadow-2xl min-w-[160px] z-50"
                                    >
                                        {Object.entries(AGENTS).map(([key, agent]) => (
                                            <button
                                                key={key}
                                                onClick={() => handleAgentSwitch(key as AgentKey)}
                                                className={`flex items-center gap-3 p-2 rounded-lg text-left transition-all hover:bg-white/10 ${selectedAgent === key ? 'bg-white/5 ring-1 ring-white/10' : ''}`}
                                            >
                                                <div className={`p-1.5 rounded ${agent.bg} ${agent.color}`}>
                                                    <agent.icon className="w-4 h-4" />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-[12px] font-bold text-white tracking-wide">{agent.name}</span>
                                                    <span className="text-[10px] text-white/40 uppercase">{t(agent.roleKey)}</span>
                                                </div>
                                            </button>
                                        ))}
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <button
                                onClick={() => setIsAgentMenuOpen(!isAgentMenuOpen)}
                                disabled={isImageLoading}
                                className="flex items-center gap-3 bg-[#0a0a0a]/60 border border-white/10 hover:border-white/20 hover:bg-[#0a0a0a]/80 backdrop-blur-md rounded-full pl-2 pr-4 py-2 transition-all shadow-lg group disabled:opacity-50"
                            >
                                <div className={`p-1.5 rounded-full ${activeConfig.bg} ${activeConfig.color} ${activeConfig.border} border`}>
                                    {(() => { const Icon = activeConfig.icon; return <Icon className="w-4 h-4" />; })()}
                                </div>
                                <div className="flex flex-col items-start">
                                    <span className="text-[10px] text-white/40 font-bold uppercase tracking-wider">{t("workstation.active_agent")}</span>
                                    <span className="text-xs font-bold text-white tracking-wide group-hover:text-cyan-200 transition-colors">{activeConfig.name}</span>
                                </div>
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
                                    <div className={`
                        max-w-[85%] rounded-2xl px-5 py-3 text-sm font-light tracking-wide leading-relaxed shadow-lg relative
                        ${msg.role === 'user' ? 'bg-cyan-900/40 text-cyan-50 border border-cyan-500/30' : 'bg-[#0a0a0a]/80 text-white/90 border border-white/10'}
                      `}>
                                        {msg.text}
                                    </div>
                                </div>
                            ))}

                            {isTyping && (
                                <div className={`flex justify-start transition-all duration-300 ${activeConfig.contentPadding}`}>
                                    <div className="bg-[#0a0a0a]/60 border border-white/5 px-4 py-2 rounded-xl flex gap-1">
                                        <span className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" />
                                        <span className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce [animation-delay:0.1s]" />
                                        <span className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce [animation-delay:0.2s]" />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* INPUT AREA */}
                    <div className="p-5 bg-black/60 border-t border-white/10 flex flex-col gap-3 shrink-0 backdrop-blur-xl z-20 relative rounded-b-xl">
                        <div className={`flex gap-3 items-center transition-all duration-300 ${activeConfig.contentPadding}`}>
                            <div className="flex-1 relative">
                                <input
                                    type="text"
                                    value={prompt}
                                    onChange={(e) => setPrompt(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                    placeholder={t("workstation.chat_placeholder", { role: t(activeConfig.roleKey).toLowerCase() })}
                                    className="w-full bg-black/50 border border-white/10 rounded-xl py-3 px-4 text-white placeholder:text-white/40 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all font-mono text-sm"
                                />
                            </div>
                            <button
                                onClick={handleSend}
                                className="bg-cyan-500 text-black border border-cyan-400 hover:bg-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.3)] h-full px-6 rounded-xl font-bold text-xs tracking-wider flex items-center gap-2 transition-all active:scale-95">
                                {t("workstation.send")} <PaperAirplaneIcon className="w-3.5 h-3.5 -rotate-45" />
                            </button>
                        </div>

                        <div className={`flex justify-end items-center px-1 transition-all duration-300 ${activeConfig.contentPadding}`}>
                            <button
                                onClick={() => setChatHistory([])}
                                className="text-[10px] text-red-400/50 hover:text-red-400 flex items-center gap-1.5 px-2 py-1 hover:bg-red-900/10 rounded transition-colors uppercase tracking-widest"
                            >
                                <TrashIcon className="w-3 h-3" /> {t("workstation.clear_history")}
                            </button>
                        </div>
                    </div>
                </div>

                {/* --- 2. RIGHT SIDE: DOCUMENT & TERMINAL --- */}
                <div className="col-span-5 flex flex-col gap-4 h-full">

                    <div
                        onClick={() => setActiveSection('doc')}
                        className={`${panelStyle} flex-1 flex flex-col ${activeSection === 'doc' ? activeBorder : ''} group relative`}
                    >
                        <AnimatePresence>
                            {activeSection === 'doc' && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                                    className="absolute top-4 right-4 z-30 pointer-events-none"
                                >
                                    <PixelPython color="#60a5fa" />
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div className="h-14 bg-black/40 border-b border-white/10 flex items-center px-6 shrink-0 gap-4">
                            <input
                                value={docTitle}
                                onChange={(e) => setDocTitle(e.target.value)}
                                className="bg-transparent text-white/90 text-sm font-mono focus:outline-none focus:text-cyan-400 w-full border-b border-transparent focus:border-cyan-500/50 transition-colors placeholder:text-white/30"
                                placeholder={t("workstation.doc_title_placeholder")}
                            />
                        </div>

                        {/* --- TEXTAREA: Clean Paper Style (White) --- */}
                        <textarea
                            value={docContent}
                            onChange={(e) => setDocContent(e.target.value)}
                            // ESTILO CLEAN PAPER: bg-[#f1f5f9], text-slate-900, scrollbar-dark-thumb
                            className="flex-1 p-8 font-mono text-sm text-slate-900 leading-loose overflow-auto scrollbar-dark-thumb bg-[#f1f5f9] resize-none focus:outline-none transition-colors placeholder:text-slate-400"
                            placeholder={t("workstation.doc_content_placeholder")}
                        />

                        <div className="p-4 border-t border-white/10 bg-black/40 flex justify-end gap-3 rounded-b-xl">
                            <button disabled={true} className={`${btnBase} opacity-50 cursor-not-allowed bg-cyan-900/20 text-cyan-400 border-cyan-500/30`}>
                                <CpuChipIcon className="w-4 h-4" /> {t("workstation.auto_fix")}
                            </button>

                            <button
                                onClick={handleGenerateProtocol}
                                disabled={isConfirming || !isConnected}
                                className={`${btnBase} ${isConfirming ? 'bg-yellow-900/20 border-yellow-500/30 text-yellow-400' : 'bg-green-900/20 text-green-400 border-green-500/30 hover:bg-green-500/20'} shadow-[0_0_10px_rgba(74,222,128,0.1)]`}
                            >
                                {isConfirming ? (
                                    <>{t("workstation.processing")}</>
                                ) : (
                                    <><PlayIcon className="w-4 h-4" /> {t("workstation.generate")}</>
                                )}
                            </button>
                        </div>
                    </div>

                    <div
                        onClick={() => setActiveSection('terminal')}
                        className={`${panelStyle} h-[28%] flex flex-col shrink-0 ${activeSection === 'terminal' ? activeBorder : ''}`}
                    >
                        <div className="h-9 bg-black/60 border-b border-white/10 flex items-center justify-between px-4">
                            <span className="text-[10px] text-white/30 font-mono">{t("workstation.terminal_title")}</span>
                            <div className="flex gap-4">
                                <button className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-wider text-white/40 hover:text-purple-400 transition">
                                    <AcademicCapIcon className="w-3.5 h-3.5" /> {t("workstation.session_homework")}
                                </button>
                                <button className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-wider text-white/40 hover:text-green-400 transition">
                                    <ArrowDownTrayIcon className="w-3.5 h-3.5" /> {t("workstation.session_save")}
                                </button>
                            </div>
                        </div>

                        {/* TERMINAL LOGS */}
                        <div ref={terminalRef} className="flex-1 p-4 font-mono text-xs text-green-500/90 bg-black/60 overflow-y-auto custom-scrollbar shadow-inner rounded-b-xl">
                            <div className="opacity-80 space-y-1">
                                {terminalLogs.map((log, idx) => (
                                    <div key={idx} className="break-all">{log}</div>
                                ))}
                                <p>zaeon@root:~$ <span className="animate-pulse">_</span></p>
                            </div>
                        </div>
                    </div>
                </div>

            </div>

            <style jsx global>{`
        /* Scrollbar clara para o site geral */
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(34,211,238,0.4); }

        /* Scrollbar escura para a área de documento (fundo branco) */
        .scrollbar-dark-thumb::-webkit-scrollbar { width: 5px; }
        .scrollbar-dark-thumb::-webkit-scrollbar-track { background: transparent; }
        .scrollbar-dark-thumb::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.2); border-radius: 10px; }
        .scrollbar-dark-thumb::-webkit-scrollbar-thumb:hover { background: rgba(0,0,0,0.4); }
      `}</style>
        </div>
    );
}