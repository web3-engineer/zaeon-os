"use client";

import React, { useEffect, useState } from "react";
import { ethers } from "ethers";
import { useWeb3 } from "src/context/Web3Context";
import { ZAEON_CONFIG, ABIS } from "src/config/contracts";
import { 
    CpuChipIcon, 
    BeakerIcon, 
    CurrencyDollarIcon, 
    SparklesIcon, 
    ArrowRightIcon,
    CheckBadgeIcon,
    CubeTransparentIcon,
    ArrowPathIcon,
    PlusIcon,
    PlayIcon
} from "@heroicons/react/24/outline";
import { motion, AnimatePresence, useDragControls } from "framer-motion";

// --- TYPES ---

interface ProjectIdea {
    id: string;
    agentName: string;
    avatarColor: string;
    domain: string;
    title: string;
    description: string;
    difficultyRank: 'S' | 'A' | 'B' | 'C';
    isMinted: boolean;
}

// --- GENERATOR LOGIC ---
const generateAI_Ideas = (topics: string[], avgScore: number): ProjectIdea[] => {
    const isHighLevel = avgScore >= 80;
    const rank: 'S' | 'A' | 'B' | 'C' = avgScore >= 90 ? 'S' : avgScore >= 80 ? 'A' : avgScore >= 60 ? 'B' : 'C';

    const domains = topics.length > 0 ? topics : ["General Science", "Technology", "Innovation"];
    
    const advancedActions = ["Quantum Optimization of", "Neural Architecture Search for", "Molecular Docking Simulation for", "Zero-Knowledge Proofs for", "Hyper-Heuristic Modeling of"];
    const basicActions = ["Study of", "Basic Analysis of", "Introduction to", "Survey of", "Data Collection for"];
    
    const actions = isHighLevel ? advancedActions : basicActions;

    return Array.from({ length: 20 }).map((_, i) => { 
        const domain = domains[Math.floor(Math.random() * domains.length)];
        return {
            id: `gen-${Date.now()}-${i}`,
            agentName: isHighLevel ? "Architect-AI" : "Research-Bot",
            avatarColor: `hsl(${Math.random() * 360}, 70%, 60%)`,
            domain: domain,
            title: `${actions[Math.floor(Math.random() * actions.length)]} ${domain}`,
            description: `A ${isHighLevel ? 'cutting-edge' : 'foundational'} project exploring the boundaries of ${domain}.`,
            difficultyRank: rank,
            isMinted: false,
        };
    });
};

// --- COMPONENT: PROJECT CARD ---
function ProjectCard({ 
    data, 
    isInLab, 
    onDragEnd, 
    onInitiate,
    onClaim
}: { 
    data: ProjectIdea; 
    isInLab: boolean; 
    onDragEnd?: (data: ProjectIdea) => void;
    onInitiate?: (project: ProjectIdea) => void;
    onClaim?: (id: string) => void;
}) {
    const controls = useDragControls();

    const rankColor = {
        'S': 'text-purple-400 border-purple-500/50 bg-purple-500/10',
        'A': 'text-cyan-400 border-cyan-500/50 bg-cyan-500/10',
        'B': 'text-green-400 border-green-500/50 bg-green-500/10',
        'C': 'text-yellow-400 border-yellow-500/50 bg-yellow-500/10'
    }[data.difficultyRank];

    return (
        <motion.div
            layoutId={data.id}
            drag={!isInLab} 
            dragControls={controls}
            dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
            dragElastic={0.2}
            onDragEnd={(_, info) => {
                if (!isInLab && info.offset.x > 150 && onDragEnd) {
                    onDragEnd(data);
                }
            }}
            whileHover={{ scale: 1.02, backgroundColor: "rgba(255,255,255,0.08)" }}
            whileDrag={{ scale: 1.05, zIndex: 100, cursor: "grabbing" }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`relative group rounded-[2rem] border backdrop-blur-xl overflow-hidden transition-colors duration-500
                ${isInLab 
                    ? "w-full mb-4 bg-gradient-to-br from-blue-900/20 to-cyan-900/20 border-cyan-500/30 shadow-[0_0_30px_-10px_rgba(6,182,212,0.3)]" 
                    : "w-full mb-3 bg-white/5 border-white/5 cursor-grab active:cursor-grabbing hover:border-white/20"
                }`}
        >
            {!isInLab && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            )}

            <div className="p-5 relative z-10">
                <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3">
                        <div 
                            className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black text-black shadow-lg"
                            style={{ backgroundColor: data.avatarColor }}
                        >
                            {data.agentName.substring(0, 2)}
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h4 className="text-[10px] font-bold text-white/50 uppercase tracking-wider">{data.agentName}</h4>
                                {data.isMinted && <CheckBadgeIcon className="w-3 h-3 text-cyan-400" />}
                            </div>
                            <span className="text-[9px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/40">
                                {data.domain}
                            </span>
                        </div>
                    </div>
                    
                    {!isInLab && (
                        <div className="text-white/20 group-hover:translate-x-1 transition-transform">
                            <ArrowRightIcon className="w-4 h-4" />
                        </div>
                    )}
                </div>

                <h3 className="text-sm font-bold text-white mb-2 leading-tight">
                    {data.title}
                </h3>

                <AnimatePresence>
                    {isInLab && (
                        <motion.div 
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            transition={{ type: "spring", stiffness: 100 }}
                            className="overflow-hidden"
                        >
                            <div className="pt-4 mt-4 border-t border-white/10">
                                <div className="flex justify-between items-center mb-4">
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">Project Difficulty</span>
                                    <div className={`px-3 py-1 rounded-lg border ${rankColor} flex items-center gap-2`}>
                                        <SparklesIcon className="w-3 h-3" />
                                        <span className="text-xs font-black">Rank {data.difficultyRank}</span>
                                    </div>
                                </div>

                                {data.isMinted ? (
                                    <button 
                                        onClick={() => onClaim && onClaim(data.id.replace('asset-', ''))}
                                        className="w-full py-3 bg-green-600/20 border border-green-500/30 text-green-400 hover:bg-green-600 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all"
                                    >
                                        <CurrencyDollarIcon className="w-4 h-4" /> Claim Funding
                                    </button>
                                ) : (
                                    <button 
                                        onClick={() => onInitiate && onInitiate(data)}
                                        className="w-full py-3 bg-cyan-600/20 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500 hover:text-black rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all group/btn"
                                    >
                                        <PlayIcon className="w-4 h-4 group-hover/btn:fill-current" /> Initiate Project
                                    </button>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </motion.div>
    );
}

// --- MAIN MODULE ---
export default function ProjectsModule() {
    const { account, signer } = useWeb3();
    const [streamIdeas, setStreamIdeas] = useState<ProjectIdea[]>([]);
    const [labProjects, setLabProjects] = useState<ProjectIdea[]>([]);
    const [loading, setLoading] = useState(false);
    const [customIdeaInput, setCustomIdeaInput] = useState("");

    const loadContextAndGenerate = () => {
        if (typeof window !== 'undefined') {
            const scheduleData = localStorage.getItem('zaeon_schedule_data');
            let topics: string[] = [];
            if (scheduleData) {
                const parsed = JSON.parse(scheduleData);
                if (Array.isArray(parsed)) topics = parsed.map((c: any) => c.name);
            }

            const examHistory = localStorage.getItem('zaeon_exam_history');
            let avgScore = 50; 
            if (examHistory) {
                const parsedExams = JSON.parse(examHistory);
                if (Array.isArray(parsedExams) && parsedExams.length > 0) {
                    const total = parsedExams.reduce((acc: number, curr: any) => acc + curr.score, 0);
                    avgScore = total / parsedExams.length;
                }
            }

            const newIdeas = generateAI_Ideas(topics, avgScore);
            setStreamIdeas(newIdeas);
        }
    };

    useEffect(() => {
        loadContextAndGenerate();
    }, []);

    const handleRefresh = () => {
        setStreamIdeas([]);
        setTimeout(() => loadContextAndGenerate(), 300);
    };

    const handleCreateCustom = () => {
        if (!customIdeaInput.trim()) return;
        const customProject: ProjectIdea = {
            id: `custom-${Date.now()}`,
            agentName: "User-Authored",
            avatarColor: "#ffffff",
            domain: "Custom Research",
            title: customIdeaInput,
            description: "A unique project defined by the researcher.",
            difficultyRank: 'A',
            isMinted: false
        };
        setLabProjects(prev => [customProject, ...prev]);
        setCustomIdeaInput("");
    };

    const handleMoveToLab = (idea: ProjectIdea) => {
        setStreamIdeas(prev => prev.filter(p => p.id !== idea.id));
        setLabProjects(prev => [idea, ...prev]);
    };

    // --- UPDATED INITIATE FUNCTION ---
    const handleInitiateProject = async (project: ProjectIdea) => {
        // Removed window.confirm to avoid warning
        
        try {
            // FIXED: Send account (wallet) as fallback ID
            const response = await fetch('/api/projects/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    project,
                    userId: account || "guest_user_123" // Fallback ID if no session
                })
            });

            if (response.ok) {
                localStorage.setItem('zaeon_active_project', JSON.stringify(project));
                alert(`Project "${project.title}" Initiated! Go to Research Lab to discuss with Agent.`);
            } else {
                // If it still fails, fallback to local storage only so the UI doesn't break
                console.warn("DB Sync failed, using local storage.");
                localStorage.setItem('zaeon_active_project', JSON.stringify(project));
                alert(`Project "${project.title}" Initiated locally (Sync failed).`);
            }
        } catch (e) {
            console.error("Initiation Error:", e);
            localStorage.setItem('zaeon_active_project', JSON.stringify(project));
            alert("Network Error. Project saved locally.");
        }
    };

    const handleClaim = async (id: string) => {
        if(!signer) return;
        try {
            const treasury = new ethers.Contract(ZAEON_CONFIG.ADDRESSES.TREASURY, ABIS.TREASURY, signer);
            const tx = await treasury.claimResearchFunding(id, ZAEON_CONFIG.INTENT.GENESIS, "0x");
            await tx.wait();
            alert("Funding Claimed Successfully!");
        } catch(e) { console.error(e); alert("Claim failed."); }
    };

    return (
        <div className="w-full h-screen bg-[#0a0a0a] rounded-[3rem] overflow-hidden relative p-8 flex gap-8">
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-[-20%] left-[-10%] w-[800px] h-[800px] bg-blue-900/20 rounded-full blur-[150px] animate-pulse duration-[8000ms]"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-cyan-900/20 rounded-full blur-[150px]"></div>
            </div>

            <div className="w-1/3 flex flex-col gap-4 relative z-10 h-full">
                <div className="flex items-center justify-between px-2">
                    <div className="flex items-center gap-2">
                        <CpuChipIcon className="w-5 h-5 text-white/50" />
                        <h2 className="text-xs font-black uppercase tracking-[0.25em] text-white/50">Generate New Ideas</h2>
                    </div>
                    <button onClick={handleRefresh} className="p-2 rounded-full hover:bg-white/10 text-white/30 hover:text-white transition-colors">
                        <ArrowPathIcon className="w-4 h-4" />
                    </button>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-2xl p-2 flex gap-2 mb-2">
                    <input 
                        value={customIdeaInput} 
                        onChange={(e) => setCustomIdeaInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleCreateCustom()}
                        placeholder="Type your own research idea..." 
                        className="flex-1 bg-transparent text-white/80 text-xs px-3 focus:outline-none placeholder:text-white/20"
                    />
                    <button onClick={handleCreateCustom} className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-colors">
                        <PlusIcon className="w-4 h-4" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto scrollbar-hide pr-2 pb-20 mask-fade-bottom">
                    {streamIdeas.length === 0 ? (
                        <div className="text-center p-10 text-white/20 text-xs uppercase tracking-widest border border-dashed border-white/10 rounded-[2rem]">
                            Agenda Empty or Stream Cleared.<br/>Add classes or hit refresh.
                        </div>
                    ) : (
                        streamIdeas.map((idea) => (
                            <ProjectCard key={idea.id} data={idea} isInLab={false} onDragEnd={handleMoveToLab} />
                        ))
                    )}
                </div>
            </div>

            <div className="flex-1 flex flex-col gap-4 relative z-10 h-full">
                <div className="flex items-center justify-between px-2">
                    <div className="flex items-center gap-2">
                        <BeakerIcon className="w-5 h-5 text-cyan-400" />
                        <h2 className="text-xs font-black uppercase tracking-[0.25em] text-cyan-400 drop-shadow-[0_0_10px_rgba(34,211,238,0.5)]">My Project Lab</h2>
                    </div>
                    {loading && <span className="text-[9px] text-cyan-500/50 animate-pulse">SYNCING CHAIN...</span>}
                </div>

                <div className="flex-1 bg-black/40 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-6 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] relative overflow-hidden">
                    {labProjects.length === 0 && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-white/10 pointer-events-none">
                            <CubeTransparentIcon className="w-24 h-24 mb-4" />
                            <p className="text-sm font-bold uppercase tracking-widest">Drag Ideas Here</p>
                        </div>
                    )}
                    <div className="h-full overflow-y-auto scrollbar-hide pr-2 pb-20 mask-fade-bottom">
                         <div className="flex flex-col gap-4">
                            {labProjects.map((project) => (
                                <ProjectCard key={project.id} data={project} isInLab={true} onInitiate={handleInitiateProject} onClaim={handleClaim} />
                            ))}
                         </div>
                    </div>
                    <div className="absolute bottom-0 left-0 w-full h-24 bg-gradient-to-t from-black/80 to-transparent pointer-events-none"></div>
                </div>
            </div>
        </div>
    );
}