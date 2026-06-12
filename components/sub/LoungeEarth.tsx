"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Sphere } from "@react-three/drei";
import * as THREE from "three";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import NextImage from "next/image";
import {
    ExclamationTriangleIcon,
    ChatBubbleLeftRightIcon,
    UserCircleIcon,
    HeartIcon,
    GlobeAltIcon,
    CpuChipIcon,
    PaperAirplaneIcon,
    ArrowLeftIcon,
    ArrowPathIcon,
    ShieldCheckIcon,
    SignalIcon,
    XMarkIcon
} from "@heroicons/react/24/outline";
import { HeartIcon as HeartSolid } from "@heroicons/react/24/solid";

// --- TYPES ---
interface Comment {
    id: string;
    user: string;
    content: string;
    time: string;
}

interface Post {
    id: string;
    user: string;
    userImage?: string;
    content: string;
    time: string;
    likes: number;
    isLiked: boolean;
    comments: Comment[];
    course?: string | null;     // curso/mural do post
    canComment?: boolean;       // gate social: false → outro curso (só curtir/visualizar)
}

// --- CONFIGURAÇÃO DO GLOBO ---
const COLOR_TECH_BLUE = new THREE.Color("#001a2c");
const COLOR_WIRE_BLUE = new THREE.Color("#00d2ff");
const COLOR_DOT       = new THREE.Color("#00f0ff");

const latLonToVector3 = (lat: number, lon: number, radius: number) => {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lon + 180) * (Math.PI / 180);
    const x = -(radius * Math.sin(phi) * Math.cos(theta));
    const z = radius * Math.sin(phi) * Math.sin(theta);
    const y = radius * Math.cos(phi);
    return new THREE.Vector3(x, y, z);
};

// Marcador com Hover
const LocationMarker = ({ lat, lon, code, onHover, onClick }: any) => {
    const ref = useRef<THREE.Mesh>(null);
    const position = latLonToVector3(lat, lon, 0.785);

    useFrame(({ clock }) => {
        if (ref.current) {
            const scale = 1 + Math.sin(clock.getElapsedTime() * 3) * 0.1;
            ref.current.scale.set(scale, scale, scale);
        }
    });

    return (
        <mesh
            ref={ref}
            position={position}
            onClick={(e) => { e.stopPropagation(); onClick(code); }}
            onPointerOver={(e) => { e.stopPropagation(); onHover(code); document.body.style.cursor = 'pointer'; }}
            onPointerOut={(e) => { e.stopPropagation(); onHover(null); document.body.style.cursor = 'auto'; }}
        >
            <sphereGeometry args={[0.035, 16, 16]} />
            <meshBasicMaterial color={COLOR_DOT} toneMapped={false} />
        </mesh>
    );
};

const CyberGlobe = ({ onSelectRegion, onHoverRegion }: any) => {
    const coreRef = useRef<THREE.Mesh>(null);
    const wireframeGroupRef = useRef<THREE.Group>(null);

    useFrame(({ clock }) => {
        const t = clock.getElapsedTime();
        if (coreRef.current) coreRef.current.rotation.y = t / 15;
        if (wireframeGroupRef.current) wireframeGroupRef.current.rotation.y = t / 15;
    });

    return (
        <group>
            <Sphere ref={coreRef} args={[0.75, 64, 64]}>
                <meshPhongMaterial color={COLOR_TECH_BLUE} transparent opacity={0.8} shininess={100} specular={new THREE.Color("#00d2ff")} />
            </Sphere>
            <group ref={wireframeGroupRef}>
                <Sphere args={[0.775, 32, 32]}>
                    <meshBasicMaterial color={COLOR_WIRE_BLUE} wireframe transparent opacity={0.2} toneMapped={false} />
                </Sphere>
                <LocationMarker lat={39.8} lon={-98.6} code="USA" onHover={onHoverRegion} onClick={onSelectRegion} />
                <LocationMarker lat={-14.2} lon={-51.9} code="BRAZIL" onHover={onHoverRegion} onClick={onSelectRegion} />
                <LocationMarker lat={35.8} lon={104.1} code="CHINA" onHover={onHoverRegion} onClick={onSelectRegion} />
            </group>
        </group>
    );
};

// --- COMPONENTE DE POST ESTÁTICO (Visual) ---
function StaticPost({ user, content, time, isSystem = false }: { user: string, content: string, time: string, isSystem?: boolean }) {
    return (
        <div className={`
            p-5 rounded-3xl border mb-3 backdrop-blur-sm
            ${isSystem
            ? 'bg-red-500/[0.05] border-red-500/20'
            : 'bg-white/[0.03] border-white/5'}
        `}>
            <div className="flex items-center gap-3 mb-2">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center border shadow-lg
                    ${isSystem ? 'bg-red-500/10 border-red-500/20' : 'bg-cyan-500/10 border-white/10'}`}>
                    {isSystem ? <ShieldCheckIcon className="w-5 h-5 text-red-400" /> : <UserCircleIcon className="w-5 h-5 text-cyan-400" />}
                </div>
                <div>
                    <span className={`text-[11px] font-black ${isSystem ? 'text-red-400' : 'text-cyan-400'}`}>{user}</span>
                    <span className="text-[9px] text-white/20 font-mono ml-2">• {time}</span>
                </div>
            </div>
            <p className="text-xs text-white/80 leading-relaxed font-medium">
                {content}
            </p>
        </div>
    );
}

// --- COMPONENTE PRINCIPAL ---
export default function ZaeonLobby() {
    const { data: session, status } = useSession();
    const isConnected = status === "authenticated";

    // --- ESTADOS ---
    const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
    const [isLiveFeedActive, setIsLiveFeedActive] = useState(false);
    const [hoveredCluster, setHoveredCluster] = useState<string | null>(null);
    const [accessError, setAccessError] = useState<string | null>(null);

    // MongoDB Data
    const [posts, setPosts] = useState<Post[]>([]);
    const [selectedPost, setSelectedPost] = useState<Post | null>(null);
    const [isLoadingFeed, setIsLoadingFeed] = useState(false);

    // Inputs
    const [newPost, setNewPost] = useState("");
    const [newComment, setNewComment] = useState("");

    // --- FETCH FEED ---
    const fetchPosts = useCallback(async () => {
        setIsLoadingFeed(true);
        try {
            const res = await fetch('/api/feed');
            if (res.ok) {
                const data = await res.json();
                setPosts(data);
                setSelectedPost((prev: Post | null) => {
                    if (prev) {
                        const updatedSelected = data.find((p: Post) => p.id === prev.id);
                        return updatedSelected || prev;
                    }
                    return prev;
                });
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoadingFeed(false);
        }
    }, []);

    useEffect(() => {
        if (isLiveFeedActive) {
            fetchPosts();
            const interval = setInterval(fetchPosts, 30000);
            return () => clearInterval(interval);
        }
    }, [isLiveFeedActive, fetchPosts]);

    // --- ACTIONS ---
    const handlePost = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newPost.trim()) return;
        try {
            const res = await fetch('/api/feed', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: newPost })
            });
            if (res.ok) { setNewPost(""); fetchPosts(); }
        } catch (error) { console.error(error); }
    };

    const handleComment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newComment.trim() || !selectedPost) return;
        try {
            const res = await fetch('/api/feed/comment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ postId: selectedPost.id, content: newComment })
            });
            if (res.ok) { setNewComment(""); fetchPosts(); }
        } catch (error) { console.error(error); }
    };

    const toggleLike = async (id: string) => {
        const oldPosts = [...posts];
        const updatedPosts = posts.map(p => p.id === id ? { ...p, likes: p.isLiked ? p.likes - 1 : p.likes + 1, isLiked: !p.isLiked } : p);
        setPosts(updatedPosts);
        if (selectedPost?.id === id) setSelectedPost(updatedPosts.find(p => p.id === id) || null);

        try {
            await fetch('/api/feed/like', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ postId: id })
            });
        } catch (err) { setPosts(oldPosts); }
    };

    // --- CONTROLLERS ---
    const handleSelectRegion = (code: string) => {
        if (!isConnected) return;
        if (code === "USA" || code === "CHINA") {
            setAccessError(`Acesso negado ao Cluster ${code}: Credenciais insuficientes.`);
            setSelectedRegion(null);
            setIsLiveFeedActive(false);
        } else {
            setAccessError(null);
            setSelectedRegion(code);
            setIsLiveFeedActive(false);
        }
    };

    const closeAll = () => {
        setSelectedRegion(null);
        setIsLiveFeedActive(false);
        setSelectedPost(null);
    };

    return (
        <div className="fixed inset-0 w-full h-full bg-[#010409] flex items-center justify-center p-6 lg:p-12 overflow-hidden font-sans">

            {/* SIDEBAR */}
            <div className="h-[80vh] w-16 border-l border-y border-white/10 bg-black/40 backdrop-blur-2xl rounded-l-[40px] flex flex-col items-center py-10 z-[100] shadow-2xl">
                <div className={`w-3 h-3 rounded-full ${isConnected ? "bg-emerald-500 shadow-[0_0_15px_#10b981] animate-pulse" : "bg-red-500 shadow-[0_0_15px_#ef4444]"}`} />
            </div>

            {/* MAIN CARD */}
            <div className="h-[80vh] flex-1 max-w-5xl bg-white/5 backdrop-blur-md border border-white/10 rounded-r-[40px] flex flex-col relative overflow-hidden shadow-2xl">

                {/* HEADER - ZAEON GLOBAL NETWORK */}
                <div className="w-full pt-10 pb-4 flex flex-col items-center z-[60] pointer-events-none">
                    <h1 className="text-[10px] font-black uppercase tracking-[1em] text-white/40 flex items-center gap-4">
                        <span className="w-8 h-[1px] bg-white/10" />
                        Zaeon Global Network
                        <span className="w-8 h-[1px] bg-white/10" />
                    </h1>
                </div>

                {/* TOOLTIP */}
                <AnimatePresence>
                    {(hoveredCluster || (selectedRegion && !isLiveFeedActive)) && (
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            className="absolute top-10 right-10 z-[70] bg-white/5 border border-white/10 backdrop-blur-xl p-4 rounded-2xl w-48 shadow-2xl pointer-events-none"
                        >
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <CpuChipIcon className="w-4 h-4 text-cyan-400" />
                                    <span className="text-[9px] font-black text-white uppercase tracking-widest">
                                        {selectedRegion ? selectedRegion : hoveredCluster}
                                    </span>
                                </div>

                                <div className="flex items-center gap-1.5 bg-black/40 px-2 py-1 rounded-full border border-white/5">
                                    <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? "bg-emerald-500 shadow-[0_0_8px_#10b981] animate-pulse" : "bg-red-500"}`} />
                                    <span className="text-[7px] font-bold text-white/50 uppercase">
                                        {isConnected ? "ONLINE" : "OFFLINE"}
                                    </span>
                                </div>
                            </div>

                            <p className="text-[8px] text-white/40 uppercase font-bold tracking-tighter">
                                {selectedRegion ? "Uplink: Synchronizing..." : "System: Ready for Uplink"}
                            </p>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* GLOBO 3D */}
                {/* Ajustado: camera position de [0,0,2.5] para [0,-0.2,3.5] para deixar o globo menor e visível */}
                <div className="absolute inset-0 z-0 pt-10">
                    <Canvas camera={{ position: [0, -1.8, 6.5], fov: 45 }} gl={{ antialias: true }}>
                        <ambientLight intensity={0.7} />
                        <pointLight position={[10, 10, 10]} intensity={2.5} />
                        <CyberGlobe onSelectRegion={handleSelectRegion} onHoverRegion={setHoveredCluster} />
                        <OrbitControls enableZoom={true} enablePan={false} rotateSpeed={0.5} minDistance={2.5} maxDistance={6} />
                    </Canvas>
                </div>

                {/* GAVETA INFERIOR (MODAL) */}
                <AnimatePresence>
                    {selectedRegion && (
                        <motion.div
                            initial={{ y: "100%" }}
                            animate={{ y: "20%" }}
                            exit={{ y: "100%" }}
                            transition={{ type: "spring", damping: 25, stiffness: 120 }}
                            className="absolute inset-x-0 bottom-0 z-50 h-[80%] bg-black/80 backdrop-blur-3xl border-t border-white/10 rounded-t-[40px] shadow-[0_-50px_100px_rgba(0,0,0,0.8)] flex flex-col pointer-events-auto"
                        >
                            <div onClick={closeAll} className="w-20 h-1.5 bg-white/20 rounded-full mx-auto mt-4 mb-2 cursor-pointer hover:bg-red-500 transition-colors" />

                            <div className="flex-1 overflow-hidden relative">
                                <AnimatePresence mode="wait">

                                    {!isLiveFeedActive ? (
                                        <motion.div key="gateway" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full flex flex-col px-10 pt-4 pb-20" >
                                            <div className="mb-8">
                                                <button onClick={() => setIsLiveFeedActive(true)} className="w-full group relative px-8 py-5 bg-white/5 border border-white/10 hover:border-cyan-500/50 rounded-2xl overflow-hidden transition-all hover:scale-[1.01] shadow-lg" >
                                                    <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                                                    <span className="relative flex items-center justify-center gap-3 text-xs font-black uppercase tracking-[0.2em] text-white group-hover:text-cyan-400 transition-colors">
                                                        <SignalIcon className="w-4 h-4 animate-pulse" />
                                                        COMUNIDADE ZAEON [ BRASIL ]
                                                    </span>
                                                </button>
                                            </div>

                                            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 mb-6">
                                                <StaticPost isSystem user="Zaeon Protocol" time="Required Reading" content="⚠️ Regras: A Zaeon é um ambiente de colaboração acadêmica de alto nível. Respeite os outros estudantes, pesquisadores e a hierarquia dos Agentes. Postagens desrespeitosas, spam ou conteúdo fora de contexto resultarão em banimento permanente da rede neural." />
                                                <StaticPost user="Agente Alpha" time="Welcome Note" content="Iniciando monitoramento do Cluster Brasil. Bem-vindos, exploradores e cientistas. Usem este canal para compartilhar insights, dúvidas sobre os projetos e avanços em suas pesquisas." />
                                            </div>
                                        </motion.div>
                                    ) : (
                                        <div className="h-full flex flex-col">
                                            {!selectedPost ? (
                                                <motion.div key="list" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="h-full flex flex-col" >
                                                    <div className="px-10 mt-4 mb-6">
                                                        <form onSubmit={handlePost} className="relative group">
                                                            <input type="text" value={newPost} onChange={(e) => setNewPost(e.target.value)} placeholder="Transmitir mensagem..." className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-6 pr-14 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-cyan-500/50 transition-all" />
                                                            <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-cyan-500 hover:text-cyan-300 transition-colors">
                                                                <PaperAirplaneIcon className="w-5 h-5" />
                                                            </button>
                                                        </form>
                                                    </div>

                                                    <div className="flex-1 overflow-y-auto custom-scrollbar px-10 pb-20 space-y-4">
                                                        <div className="flex items-center justify-between mb-4 px-2 border-b border-white/5 pb-2">
                                                            <div className="flex items-center gap-3 text-emerald-400">
                                                                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"/>
                                                                <span className="text-[10px] font-black uppercase tracking-[0.3em]">Live Data Stream</span>
                                                            </div>
                                                            <button onClick={() => setIsLiveFeedActive(false)} className="text-[9px] text-white/30 hover:text-white uppercase">Voltar</button>
                                                        </div>

                                                        {posts.map(post => (
                                                            <FeedPost
                                                                key={post.id}
                                                                post={post}
                                                                onLike={() => toggleLike(post.id)}
                                                                onClick={() => setSelectedPost(post)}
                                                            />
                                                        ))}
                                                    </div>
                                                </motion.div>
                                            ) : (
                                                <motion.div key="detail" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="h-full flex flex-col" >
                                                    <div className="px-10 pt-2 pb-4 border-b border-white/5 flex items-center gap-4">
                                                        <button onClick={() => setSelectedPost(null)} className="p-2 -ml-2 rounded-full hover:bg-white/10 text-white/50 hover:text-white transition-colors">
                                                            <ArrowLeftIcon className="w-5 h-5" />
                                                        </button>
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Thread View</span>
                                                    </div>

                                                    <div className="flex-1 overflow-y-auto custom-scrollbar px-10 pb-20">
                                                        <div className="py-6 border-b border-white/5">
                                                            <FeedPost post={selectedPost} onLike={() => toggleLike(selectedPost.id)} isDetailView />
                                                        </div>
                                                        <div className="py-6 space-y-6">
                                                            <h3 className="text-[9px] font-black uppercase tracking-widest text-cyan-500/50 mb-4 pl-2">
                                                                Respostas ({selectedPost.comments?.length || 0})
                                                            </h3>
                                                            {selectedPost.comments?.map((comment) => (
                                                                <div key={comment.id} className="flex gap-4 pl-4 border-l border-white/5">
                                                                    <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
                                                                        <UserCircleIcon className="w-5 h-5 text-white/30" />
                                                                    </div>
                                                                    <div>
                                                                        <div className="flex items-center gap-2 mb-1">
                                                                            <span className="text-[10px] font-bold text-white/80">{comment.user}</span>
                                                                            <span className="text-[8px] text-white/20 font-mono">• {comment.time}</span>
                                                                        </div>
                                                                        <p className="text-xs text-white/60 leading-relaxed">{comment.content}</p>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    <div className="p-6 bg-black/40 border-t border-white/10 backdrop-blur-xl absolute bottom-0 w-full rounded-t-3xl">
                                                        {selectedPost.canComment === false ? (
                                                            <div className="flex items-center justify-center gap-2 py-2 text-[11px] font-medium text-white/40">
                                                                <span aria-hidden>🔒</span>
                                                                Mural de outro curso — apenas curtir e visualizar
                                                            </div>
                                                        ) : (
                                                            <form onSubmit={handleComment} className="relative">
                                                                <input type="text" value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="Responder..." className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-4 pr-12 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-cyan-500/50 transition-all" />
                                                                <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-cyan-500 hover:text-cyan-300 transition-colors">
                                                                    <PaperAirplaneIcon className="w-4 h-4" />
                                                                </button>
                                                            </form>
                                                        )}
                                                    </div>
                                                </motion.div>
                                            )}
                                        </div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <AnimatePresence>
                    {accessError && !selectedRegion && (
                        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="absolute bottom-20 left-1/2 -translate-x-1/2 z-[65] flex flex-col items-center gap-3 bg-red-500/10 border border-red-500/20 p-6 rounded-[30px] backdrop-blur-md">
                            <ExclamationTriangleIcon className="w-8 h-8 text-red-500/40" />
                            <p className="text-[9px] font-bold text-red-400 uppercase tracking-widest text-center max-w-xs leading-relaxed">{accessError}</p>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <style jsx global>{`
                .custom-scrollbar:-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(0, 210, 255, 0.3); }
            `}</style>
        </div>
    );
}

// --- SUBCOMPONENTE DE POST REAL ATUALIZADO ---
function FeedPost({ post, onLike, onClick, isDetailView = false }: any) {
    return (
        <div onClick={!isDetailView ? onClick : undefined} className={`bg-white/[0.03] border border-white/5 p-5 rounded-3xl transition-all group flex gap-5 ${!isDetailView ? 'hover:bg-white/[0.06] cursor-pointer' : ''} ${isDetailView ? 'bg-white/[0.05] border-cyan-500/20' : ''}`}>
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 overflow-hidden flex items-center justify-center shrink-0 border border-white/10 shadow-lg">
                {post.userImage ? (
                    <NextImage src={post.userImage} alt="" fill className="w-full h-full object-cover" />
                ) : (
                    <UserCircleIcon className="w-6 h-6 text-cyan-400/50" />
                )}
            </div>
            <div className="flex-1">
                <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                        <span className="text-[11px] font-black text-white/80 group-hover:text-cyan-300 transition-colors">{post.user}</span>
                        <span className="text-[9px] text-white/20 font-mono">• {post.time}</span>
                    </div>
                </div>
                <p className={`text-xs text-white/60 leading-relaxed font-medium ${!isDetailView ? 'group-hover:text-white/70' : 'text-white/90 text-sm'}`}>{post.content}</p>
                <div className="flex gap-4 mt-3">
                    <button onClick={(e) => { e.stopPropagation(); onLike(); }} className="flex items-center gap-1.5 group/like">
                        {post.isLiked ? <HeartSolid className="w-4 h-4 text-red-500" /> : <HeartIcon className="w-4 h-4 text-white/20 group-hover/like:text-red-400 transition-colors" />}
                        <span className={`text-[10px] font-mono ${post.isLiked ? 'text-red-500' : 'text-white/20'}`}>{post.likes}</span>
                    </button>
                    <button className="flex items-center gap-1.5 text-white/20 hover:text-cyan-400 transition-colors">
                        <ChatBubbleLeftRightIcon className="w-4 h-4" />
                        <span className="text-[10px] font-mono">{post.comments?.length || 0}</span>
                    </button>
                </div>
            </div>
        </div>
    );
}