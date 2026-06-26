"use client";

import React, { useRef, useState, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Sphere, Html } from "@react-three/drei";
import * as THREE from "three";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import NextImage from "next/image";
import { useRouter } from "next/navigation"; // 🔥 IMPORTADO ROUTER PARA NAVEGAÇÃO
import {
    ChatBubbleLeftRightIcon,
    UserCircleIcon,
    HeartIcon,
    PaperAirplaneIcon,
    SparklesIcon,
    CpuChipIcon,
    GlobeAltIcon,
    SignalIcon,
    ArrowDownIcon,
    MapPinIcon,
    EyeIcon,
    BookOpenIcon,
    PlusCircleIcon,
    BeakerIcon,
    TrashIcon
} from "@heroicons/react/24/outline";
import { HeartIcon as HeartSolid } from "@heroicons/react/24/solid";
import CollabModule from "@/components/lounge/CollabModule";

const ROOM_MAPPING: Record<string, string[]> = {
    cyber: ["Ciência da Computação", "Engenharia de Software", "Sistemas de Informação", "Análise e Desenvolvimento de Sistemas", "Engenharia da Computação", "Redes de Computadores", "Segurança da Informação / Cibersegurança", "Banco de Dados", "Inteligência Artificial", "Ciência de Dados", "Computação em Nuvem", "Internet das Coisas", "Robótica", "Jogos Digitais", "Design Digital / UX / UI", "Computer Science", "Software Engineering"],
    med: ["Medicina", "Enfermagem", "Odontologia", "Farmácia", "Fisioterapia", "Nutrição", "Psicologia", "Fonoaudiologia", "Terapia Ocupacional", "Biomedicina", "Educação Física"],
    bio: ["Ciências Biológicas", "Biologia", "Biotecnologia", "Bioquímica", "Bioinformática", "Ecologia"],
    quantic: ["Matemática", "Matemática Aplicada", "Estatística", "Física", "Astronomia", "Astrofísica", "Geofísica", "Meteorologia"],
    humanities: ["História", "Geografia", "Filosofia", "Sociologia", "Antropologia", "Ciência Política", "Relações Internacionais", "Letras", "Linguística", "Pedagogia", "Artes", "Música", "Teatro", "Dança", "Cinema e Audiovisual", "Arquivologia", "Biblioteconomia", "Museologia", "Serviço Social", "Comunicação Social", "Jornalismo", "Publicidade e Propaganda", "Editoração", "Produção Cultural", "Direito", "Teologia"]
};

// 🔥 TIPOS ATUALIZADOS COM USERID E USERIMAGE 🔥
interface Comment {
    id: string;
    user: string;
    userEmail?: string; 
    userId?: string; 
    userImage?: string; 
    content: string;
    createdAt: string;
}
interface Post {
    id: string;
    user: string;
    userEmail?: string;
    userId?: string; 
    userImage?: string;
    content: string;
    createdAt: string;
    likes: string[];
    room: string;
    comments: Comment[];
}

// --- 1. GLOBO 3D (VISUAL & INTERATIVO) ---
const COLOR_TECH_BLUE = new THREE.Color("#001a2c");
const COLOR_WIRE_BLUE = new THREE.Color("#00d2ff");
const COLOR_DOT = new THREE.Color("#22d3ee");

const latLonToVector3 = (lat: number, lon: number, radius: number) => {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lon + 180) * (Math.PI / 180);
    const x = -(radius * Math.sin(phi) * Math.cos(theta));
    const z = radius * Math.sin(phi) * Math.sin(theta);
    const y = radius * Math.cos(phi);
    return new THREE.Vector3(x, y, z);
};

const LocationMarker = ({ lat, lon, label, cost, onClick }: any) => {
    const ref = useRef<THREE.Group>(null);
    const [hovered, setHovered] = useState(false);
    const position = latLonToVector3(lat, lon, 1.55);

    useFrame(({ clock }) => {
        if (ref.current) {
            ref.current.lookAt(0, 0, 8);
            const scale = hovered ? 1.3 : 1 + Math.sin(clock.getElapsedTime() * 3) * 0.1;
            ref.current.scale.set(scale, scale, scale);
        }
    });

    return (
        <group position={position} ref={ref}>
            <mesh onClick={(e) => { e.stopPropagation(); onClick(); }} onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer'; }} onPointerOut={(e) => { e.stopPropagation(); setHovered(false); document.body.style.cursor = 'auto'; }}>
                <sphereGeometry args={[0.04, 16, 16]} />
                <meshBasicMaterial color={hovered ? "#fbbf24" : COLOR_DOT} toneMapped={false} />
            </mesh>
            <Html distanceFactor={12} style={{ pointerEvents: 'none' }} zIndexRange={[100, 0]}>
                <AnimatePresence>
                    {hovered && (
                        <motion.div initial={{ opacity: 0, y: 10, scale: 0.8 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0 }} className="bg-black/90 backdrop-blur-md border border-cyan-500/50 p-3 rounded-xl w-32 shadow-[0_0_20px_rgba(6,182,212,0.3)] -mt-12 ml-4 pointer-events-none select-none">
                            <div className="flex items-center gap-2 mb-1 border-b border-white/10 pb-1">
                                <MapPinIcon className="w-3 h-3 text-cyan-400" />
                                <span className="text-[10px] font-black text-white uppercase tracking-wider">{label}</span>
                            </div>
                            <div className="flex justify-between items-center text-[9px]">
                                <span className="text-white/60 font-mono">Cost Index:</span>
                                <span className="text-emerald-400 font-bold">{cost}</span>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </Html>
        </group>
    );
};

// Pontos cosméticos traçando o Brasil sobre o globo (sem labels, sem "cost index").
// Verde/amarelo (bandeira) só pra dar identidade — puramente decorativo.
const BRAZIL_POINTS: [number, number][] = [
    [5.2, -60.7], [2.8, -60.6], [-1.45, -48.5], [-2.5, -44.3], [-3.7, -38.5],
    [-8.05, -34.9], [-12.97, -38.5], [-16.3, -39.0], [-20.3, -40.3], [-22.9, -43.2],
    [-23.55, -46.6], [-25.4, -49.2], [-27.6, -48.5], [-30.0, -51.2], [-15.6, -56.1],
    [-15.8, -47.9], [-19.9, -43.9], [-3.1, -60.0], [-10.9, -61.9], [-8.76, -63.9],
];
const COLOR_BR_GREEN = new THREE.Color("#22c55e");
const COLOR_BR_YELLOW = new THREE.Color("#fbbf24");

const CosmeticDot = ({ lat, lon, i }: { lat: number; lon: number; i: number }) => {
    const ref = useRef<THREE.Mesh>(null);
    const pos = latLonToVector3(lat, lon, 1.55);
    useFrame(({ clock }) => {
        if (ref.current) {
            const s = 1 + Math.sin(clock.getElapsedTime() * 2 + i) * 0.25;
            ref.current.scale.set(s, s, s);
        }
    });
    return (
        <mesh ref={ref} position={pos}>
            <sphereGeometry args={[0.028, 12, 12]} />
            <meshBasicMaterial color={i % 3 === 0 ? COLOR_BR_YELLOW : COLOR_BR_GREEN} toneMapped={false} />
        </mesh>
    );
};

const CyberGlobe = () => {
    const coreRef = useRef<THREE.Mesh>(null);
    const wireframeGroupRef = useRef<THREE.Group>(null);

    useFrame(({ clock }) => {
        const t = clock.getElapsedTime();
        if (wireframeGroupRef.current) wireframeGroupRef.current.rotation.y = t / 50;
        if (coreRef.current) coreRef.current.rotation.y = t / 45;
    });

    return (
        <group>
            <Sphere ref={coreRef} args={[1.5, 64, 64]}>
                <meshPhongMaterial color={COLOR_TECH_BLUE} transparent opacity={0.9} shininess={100} specular={new THREE.Color("#22d3ee")} />
            </Sphere>
            <group ref={wireframeGroupRef}>
                <Sphere args={[1.51, 32, 32]}><meshBasicMaterial color={COLOR_WIRE_BLUE} wireframe transparent opacity={0.12} /></Sphere>
                {/* Brasil em destaque — cosmético */}
                {BRAZIL_POINTS.map(([lat, lon], i) => <CosmeticDot key={i} lat={lat} lon={lon} i={i} />)}
            </group>
        </group>
    );
};

const EnergyCord = ({ startX, startY, endX, endY, delay = 0 }: any) => {
    // SVG path NÃO aceita "%": normaliza pra número e usa viewBox 0..100 esticado
    // (preserveAspectRatio="none") — mesmo visual, sem o erro "Problem parsing d".
    const n = (v: any) => String(v).replace("%", "").trim();
    const path = `M ${n(startX)} ${n(startY)} C ${n(startX)} ${n(endY)}, ${n(endX)} ${n(startY)}, ${n(endX)} ${n(endY)}`;
    return (
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-visible z-0">
            <path d={path} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="2" />
            <motion.path d={path} fill="none" stroke="#22d3ee" strokeWidth="2" strokeDasharray="10 150" initial={{ strokeDashoffset: 0 }} animate={{ strokeDashoffset: -160 }} transition={{ duration: 3, repeat: Infinity, ease: "linear", delay: delay }} className="drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
        </svg>
    );
};

const AppleSpinner = () => (
    <div className="flex justify-center items-center p-10">
        <div className="relative w-6 h-6">
            {[...Array(12)].map((_, i) => (
                <div key={i} className="absolute w-[2px] h-[5px] bg-white rounded-full left-1/2 top-0 -ml-[1px] origin-[50%_12px]" style={{ transform: `rotate(${i * 30}deg)`, animation: `apple-spinner 1.2s linear infinite`, animationDelay: `${-1.2 + i * 0.1}s`, opacity: 0.2 }} />
            ))}
        </div>
        <style jsx>{`@keyframes apple-spinner { 0% { opacity: 1; } 100% { opacity: 0.2; } }`}</style>
    </div>
);

// focusMode (vem do shell da research-lab): esconde o hero do globo e faz o conteúdo
// ocupar a tela toda — modo de trabalho sem distração. Como rota normal, focusMode = false.
export default function LoungeEarth({ focusMode = false }: { focusMode?: boolean } = {}) {
    const { data: session } = useSession();
    const router = useRouter(); // Roteador Global

    const userCourse = (session?.user as any)?.course || "";
    const isSuperAdmin = (session?.user as any)?.isAdmin === true;
    const currentUserEmail = session?.user?.email || "";
    
    // 🔥 Captura ID e Imagem do usuário logado para UX otimista 🔥
    const currentUserId = (session?.user as any)?.id || ""; 
    const currentUserImage = session?.user?.image || ""; 

    const getUserHomeRoom = () => {
        const courseStr = String(userCourse).toLowerCase().trim();
        for (const [room, courses] of Object.entries(ROOM_MAPPING)) {
            if (courses.some(c => c.toLowerCase().trim() === courseStr)) return room;
        }
        return "lounge";
    };

    const userHomeRoom = getUserHomeRoom();

    const [globalMessage, setGlobalMessage] = useState("Synchronizing global network...");
    const [activeRoom, setActiveRoom] = useState("lounge");
    const [isLoadingFeed, setIsLoadingFeed] = useState(false);
    const [posts, setPosts] = useState<Post[]>([]);
    const [newPost, setNewPost] = useState("");

    const canPost = activeRoom === 'lounge' || activeRoom === userHomeRoom || isSuperAdmin;

    useEffect(() => {
        setTimeout(() => { setGlobalMessage("System Update 4.0: Quantum coherence achieved. Welcome to the Zaeon Network."); }, 1500);
        loadFeed("lounge");
    }, []);

    const loadFeed = async (room: string) => {
        setIsLoadingFeed(true);
        setActiveRoom(room);
        try {
            const res = await fetch(`/api/posts?room=${room}`);
            if (res.ok) {
                const data = await res.json();
                setPosts(data);
            } else {
                setPosts([]);
            }
        } catch (error) {
            console.error("Erro ao puxar dados da Matrix:", error);
            setPosts([]);
        } finally {
            setIsLoadingFeed(false);
        }
    };

    const handlePostSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newPost.trim() || !canPost) return;

        const content = newPost;
        setNewPost("");

        try {
            const res = await fetch('/api/posts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content, room: activeRoom })
            });

            if (res.ok) {
                const savedPost = await res.json();
                setPosts([savedPost, ...posts]);
            } else {
                alert("Falha de transmissão.");
            }
        } catch (error) {
            console.error("Falha ao transmitir:", error);
        }
    };

    const handleDeletePost = async (postId: string) => {
        if (!confirm("Tem certeza que deseja desintegrar este sinal da rede?")) return;
        try {
            const res = await fetch(`/api/posts?id=${postId}`, { method: 'DELETE' });
            if (res.ok) setPosts(posts.filter(p => p.id !== postId));
        } catch (error) { console.error("Erro ao deletar post:", error); }
    };

    const rooms = [
        { id: 'lounge', label: 'Global', icon: <GlobeAltIcon className="w-5 h-5" />, color: 'slate' },
        { id: 'med', label: 'MedLab', icon: <PlusCircleIcon className="w-5 h-5" />, color: 'rose' },
        { id: 'bio', label: 'Bio', icon: <BeakerIcon className="w-5 h-5" />, color: 'emerald' },
        { id: 'quantic', label: 'Quantic', icon: <SparklesIcon className="w-5 h-5" />, color: 'violet' },
        { id: 'cyber', label: 'Cyber', icon: <CpuChipIcon className="w-5 h-5" />, color: 'cyan' },
        { id: 'humanities', label: 'Human', icon: <BookOpenIcon className="w-5 h-5" />, color: 'amber' },
    ];

    return (
        <div className="relative w-full min-h-screen font-sans bg-transparent">
            {/* Hero do globo (Canvas + frases) — escondido em FOCUS MODE pra não distrair. */}
            {!focusMode && (
            <div className="fixed inset-0 z-0 flex flex-col items-center pointer-events-auto bg-transparent">
                <div className="absolute top-10 w-full flex flex-col items-center z-10 pointer-events-none">
                    <h1 className="text-[10px] font-black uppercase tracking-[1em] text-slate-500 dark:text-white/40 flex items-center gap-4 drop-shadow-md">
                        <span className="w-8 h-[1px] bg-slate-300 dark:bg-white/20" />
                        Zaeon Global Network
                        <span className="w-8 h-[1px] bg-slate-300 dark:bg-white/20" />
                    </h1>
                </div>

                {/* Texto sobre o globo */}
                <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none px-6">
                    <div className="text-center -translate-y-24 sm:-translate-y-28">
                        <p className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.7),0_2px_24px_rgba(34,211,238,0.55)]">em breve, seremos globais</p>
                        <p className="text-sm sm:text-base font-mono uppercase tracking-[0.4em] text-cyan-200 dark:text-cyan-300 mt-2 drop-shadow-[0_1px_6px_rgba(0,0,0,0.7)]">— 2027 —</p>
                    </div>
                </div>

                <Canvas camera={{ position: [0, -1.8, 6.5], fov: 40 }} className="w-full h-full bg-transparent">
                    <ambientLight intensity={0.6} />
                    <pointLight position={[10, 10, 10]} intensity={2.5} />
                    <CyberGlobe />
                    <OrbitControls enableZoom={false} enablePan={false} rotateSpeed={0.6} />
                </Canvas>
            </div>
            )}

            <div className="relative z-10 w-full flex flex-col pointer-events-none">
                {/* Espaçador-hero (mostra o globo). Em focus mode some → conteúdo cobre a tela. */}
                {!focusMode && (
                <div className="w-full h-[60vh] flex flex-col items-center justify-end pb-8">
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1, duration: 1 }}>
                        <ArrowDownIcon className="w-5 h-5 text-cyan-500 animate-bounce drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
                    </motion.div>
                </div>
                )}

                <div className="w-full min-h-screen bg-white/5 dark:bg-[#010816]/20 backdrop-blur-3xl border-t border-white/20 dark:border-white/10 rounded-t-[3rem] shadow-[0_-20px_60px_-15px_rgba(0,0,0,0.5)] px-4 pt-16 pb-32 transition-colors duration-1000 pointer-events-auto relative">
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 w-24 h-1.5 bg-slate-300 dark:bg-white/20 rounded-full opacity-50"></div>

                    <div className="max-w-4xl mx-auto flex flex-col gap-12 relative z-10">

                        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-100px" }} className="relative w-full">
                            <div className="absolute left-1/2 bottom-0 w-[2px] h-12 bg-gradient-to-b from-cyan-500/50 to-transparent translate-y-full z-0"></div>
                            <div className="bg-white/20 dark:bg-black/30 backdrop-blur-md border border-cyan-500/30 rounded-[2rem] p-8 shadow-xl text-center relative overflow-hidden group">
                                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 via-transparent to-cyan-500/10 opacity-30 group-hover:opacity-60 transition-opacity duration-700"></div>
                                <div className="relative z-10 flex flex-col items-center gap-3">
                                    <h2 className="text-xl md:text-2xl font-light text-slate-800 dark:text-white leading-relaxed font-mono px-4">
                                        Trabalhe e estude junto com seus amigos em tempo real.
                                    </h2>
                                </div>
                            </div>
                        </motion.div>

                        {/* ESPAÇO COLABORATIVO — estudos/pesquisas com play → convite → co-criação */}
                        <CollabModule />

                        <div className="hidden">
                            <div className="absolute -top-6 w-full h-10 pointer-events-none opacity-50">
                                <EnergyCord startX="50%" startY="0%" endX="16%" endY="100%" delay={0} />
                                <EnergyCord startX="50%" startY="0%" endX="33%" endY="100%" delay={0.2} />
                                <EnergyCord startX="50%" startY="0%" endX="50%" endY="100%" delay={0.4} />
                                <EnergyCord startX="50%" startY="0%" endX="66%" endY="100%" delay={0.6} />
                                <EnergyCord startX="50%" startY="0%" endX="83%" endY="100%" delay={0.8} />
                            </div>

                            <div className="grid grid-cols-3 md:grid-cols-6 gap-3 relative z-10">
                                {rooms.map((room) => (
                                    <motion.button
                                        key={room.id}
                                        onClick={() => loadFeed(room.id)}
                                        whileHover={{ scale: 1.05, y: -4 }}
                                        whileTap={{ scale: 0.95 }}
                                        className={`
                                            relative h-20 rounded-2xl border backdrop-blur-md flex flex-col items-center justify-center gap-1.5 transition-all duration-300 shadow-lg overflow-hidden group
                                            ${activeRoom === room.id
                                                ? `bg-${room.color}-500/30 border-${room.color}-500/50 shadow-[0_0_20px_rgba(var(--${room.color}-rgb),0.3)]`
                                                : 'bg-white/20 dark:bg-white/5 border-slate-200/50 dark:border-white/10 hover:bg-white/40 dark:hover:bg-white/10'
                                            }
                                        `}
                                    >
                                        <div className={`p-1.5 rounded-full bg-white/40 dark:bg-white/10 ${activeRoom === room.id ? `text-${room.color}-600 dark:text-${room.color}-400` : 'text-slate-600 dark:text-white/60'}`}>
                                            {room.icon}
                                        </div>
                                        <span className={`text-[9px] font-black uppercase tracking-widest ${activeRoom === room.id ? 'text-slate-900 dark:text-white' : 'text-slate-600 dark:text-white/80'}`}>
                                            {room.label}
                                        </span>
                                    </motion.button>
                                ))}
                            </div>
                        </div>

                        <div className="hidden w-full min-h-[600px] bg-white/30 dark:bg-black/20 backdrop-blur-2xl border border-white/50 dark:border-white/10 rounded-[2.5rem] shadow-2xl flex flex-col relative overflow-hidden">
                            <div className="px-8 py-5 border-b border-slate-200/50 dark:border-white/10 flex justify-between items-center bg-white/40 dark:bg-white/5">
                                <div className="flex items-center gap-3">
                                    <SignalIcon className={`w-5 h-5 ${isLoadingFeed ? 'animate-pulse text-slate-500' : 'text-cyan-600 dark:text-cyan-400'}`} />
                                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-800 dark:text-white">
                                        {activeRoom === 'lounge' ? 'Main Lounge Feed' : `${activeRoom} Sector Feed`}
                                    </h3>
                                </div>
                                <div className="px-3 py-1 rounded-full bg-white/60 dark:bg-white/10 border border-slate-300/50 dark:border-white/10 text-[9px] font-mono text-slate-600 dark:text-white/60">
                                    {isLoadingFeed ? 'SYNCING...' : 'LIVE'}
                                </div>
                            </div>

                            <div className="flex-1 p-6 md:p-8">
                                {isLoadingFeed ? (
                                    <div className="w-full h-60 flex items-center justify-center">
                                        <AppleSpinner />
                                    </div>
                                ) : (
                                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }} className="space-y-6">

                                        {canPost ? (
                                            <form onSubmit={handlePostSubmit} className="mb-8 relative group">
                                                <input
                                                    type="text"
                                                    value={newPost}
                                                    onChange={(e) => setNewPost(e.target.value)}
                                                    placeholder={`Transmit quick text to ${activeRoom.toUpperCase()}...`}
                                                    className="w-full bg-white/60 dark:bg-white/5 border border-slate-200/50 dark:border-cyan-500/30 rounded-2xl py-4 pl-6 pr-12 text-sm text-slate-800 dark:text-white placeholder:text-slate-500 dark:placeholder:text-cyan-500/40 focus:outline-none focus:border-cyan-500 focus:bg-white dark:focus:bg-black/40 transition-all shadow-inner backdrop-blur-md"
                                                />
                                                <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-cyan-600 dark:text-cyan-400 hover:scale-110 transition-transform">
                                                    <PaperAirplaneIcon className="w-5 h-5" />
                                                </button>
                                            </form>
                                        ) : (
                                            <div className="mb-8 flex items-center justify-center gap-3 bg-slate-100/50 dark:bg-white/5 border border-dashed border-slate-300 dark:border-white/20 p-4 rounded-2xl">
                                                <EyeIcon className="w-5 h-5 text-slate-500 dark:text-white/40" />
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-white/60">Read-Only Mode</span>
                                                    <span className="text-xs text-slate-500 dark:text-white/40">You can view and comment, but only {activeRoom} specialists can initiate broadcasts here.</span>
                                                </div>
                                            </div>
                                        )}

                                        {posts.length > 0 ? posts.map((post) => (
                                            <FeedPost
                                                key={post.id}
                                                post={post}
                                                currentUserEmail={currentUserEmail}
                                                currentUserImage={currentUserImage} 
                                                currentUserId={currentUserId} 
                                                isSuperAdmin={isSuperAdmin}
                                                onDelete={handleDeletePost}
                                                router={router}
                                            />
                                        )) : (
                                            <div className="flex flex-col items-center justify-center py-16 opacity-50">
                                                <SignalIcon className="w-12 h-12 text-slate-400 mb-4" />
                                                <div className="text-center text-slate-500 dark:text-white/40 text-[10px] uppercase tracking-widest border-2 border-dashed border-slate-300/50 dark:border-white/10 p-6 rounded-xl backdrop-blur-sm">
                                                    No signals detected in the Zaeon Database. <br /> Be the first to broadcast.
                                                </div>
                                            </div>
                                        )}
                                    </motion.div>
                                )}
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
}

// --- SUB-COMPONENTE: POST INDIVIDUAL ATUALIZADO ---
function FeedPost({ 
    post, 
    currentUserEmail, 
    currentUserImage, 
    currentUserId, 
    isSuperAdmin, 
    onDelete, 
    router 
}: any) {
    const dateDisplay = post.createdAt ? new Date(post.createdAt).toLocaleDateString() : 'Just now';
    const canDelete = isSuperAdmin || (currentUserEmail === post.userEmail);

    const [likes, setLikes] = useState<string[]>(post.likes || []);
    const [comments, setComments] = useState<Comment[]>(post.comments || []);
    const [showComments, setShowComments] = useState(false);
    const [newComment, setNewComment] = useState("");
    const [isLiking, setIsLiking] = useState(false);

    const isLikedByMe = likes.includes(currentUserEmail);

    const handleToggleLike = async () => {
        if (!currentUserEmail || isLiking) return;
        setIsLiking(true);

        if (isLikedByMe) {
            setLikes(likes.filter(email => email !== currentUserEmail));
        } else {
            setLikes([...likes, currentUserEmail]);
        }

        try {
            await fetch('/api/posts/like', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ postId: post.id })
            });
        } catch (error) { console.error("Falha ao registrar like", error); } 
        finally { setIsLiking(false); }
    };

    const handleAddComment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newComment.trim() || !currentUserEmail) return;

        const commentText = newComment;
        setNewComment("");

        // 🔥 AGORA INJETAMOS A IMAGEM E O ID DO USUÁRIO LOGADO NO COMENTÁRIO PROVISÓRIO 🔥
        const tempComment: Comment = {
            id: Date.now().toString(),
            user: "Você",
            userEmail: currentUserEmail,
            userId: currentUserId,
            userImage: currentUserImage, 
            content: commentText,
            createdAt: new Date().toISOString()
        };
        setComments([...comments, tempComment]);

        try {
            const res = await fetch('/api/posts/comment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ postId: post.id, content: commentText })
            });

            if (res.ok) {
                const finalComment = await res.json();
                setComments(prev => prev.map(c => c.id === tempComment.id ? finalComment : c));
            }
        } catch (error) { console.error("Falha ao registrar comentário", error); }
    };

    const handleDeleteComment = async (commentId: string) => {
        if (!confirm("Tem certeza que deseja desintegrar este comentário?")) return;

        try {
            const res = await fetch(`/api/posts/comment?id=${commentId}`, { method: 'DELETE' });
            if (res.ok) {
                setComments(comments.filter(c => c.id !== commentId));
            } else {
                alert("Falha de permissão ao tentar excluir.");
            }
        } catch (error) { console.error("Falha ao excluir comentário", error); }
    };

    return (
        <div className="bg-white/60 dark:bg-white/5 backdrop-blur-md border border-slate-200/50 dark:border-white/10 p-5 rounded-3xl transition-all hover:bg-white hover:shadow-lg dark:hover:bg-white/10 hover:scale-[1.01] relative group/post">
            <div className="flex items-start gap-4">
                {/* 🔥 AVATAR CLICÁVEL 🔥 */}
                <div 
                    className="w-10 h-10 rounded-2xl bg-white/80 dark:bg-white/10 overflow-hidden flex items-center justify-center shrink-0 border border-slate-200/50 dark:border-white/10 cursor-pointer hover:border-cyan-400 transition-colors shadow-sm"
                    onClick={() => post.userId && router.push(`/workstation/${post.userId}`)}
                >
                    {post.userImage ? <NextImage src={post.userImage} alt="" fill className="w-full h-full object-cover" /> : <UserCircleIcon className="w-6 h-6 text-slate-500 dark:text-white/50" />}
                </div>
                <div className="flex-1 w-full overflow-hidden">
                    <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                            {/* 🔥 NOME CLICÁVEL 🔥 */}
                            <span 
                                className="text-xs font-black text-slate-800 dark:text-white/90 truncate cursor-pointer hover:text-cyan-500 transition-colors"
                                onClick={() => post.userId && router.push(`/workstation/${post.userId}`)}
                            >
                                {post.user}
                            </span>
                            <span className="text-[8px] text-slate-600 dark:text-white/60 font-mono uppercase bg-white/60 dark:bg-white/10 px-2 py-0.5 rounded border border-slate-200/50 dark:border-white/10 shrink-0">{post.room}</span>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                            <span className="text-[9px] text-slate-500 dark:text-white/40 font-mono">{dateDisplay}</span>
                            {canDelete && (
                                <button onClick={() => onDelete(post.id)} className="text-slate-400 hover:text-red-500 transition-colors opacity-0 group-hover/post:opacity-100" title="Desintegrar Post">
                                    <TrashIcon className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    </div>
                    <p className="text-xs text-slate-700 dark:text-white/80 leading-relaxed font-medium mt-1 pr-6">{post.content}</p>

                    <div className="flex gap-5 mt-4">
                        <button onClick={handleToggleLike} className={`flex items-center gap-1.5 transition-colors group ${isLikedByMe ? 'text-red-500' : 'text-slate-500 dark:text-white/40 hover:text-red-500'}`}>
                            {isLikedByMe ? <HeartSolid className="w-4 h-4" /> : <HeartIcon className="w-4 h-4 group-hover:scale-110 transition-transform" />}
                            <span className="text-[10px] font-mono font-bold">{likes.length}</span>
                        </button>

                        <button onClick={() => setShowComments(!showComments)} className={`flex items-center gap-1.5 transition-colors group ${showComments ? 'text-cyan-500' : 'text-slate-500 dark:text-white/40 hover:text-cyan-600 dark:hover:text-cyan-400'}`}>
                            <ChatBubbleLeftRightIcon className="w-4 h-4 group-hover:scale-110 transition-transform" />
                            <span className="text-[10px] font-mono font-bold">{comments.length}</span>
                            <span className="text-[9px] ml-1 opacity-0 group-hover:opacity-100 transition-opacity">Reply</span>
                        </button>
                    </div>

                    <AnimatePresence>
                        {showComments && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mt-4 pt-4 border-t border-slate-200/50 dark:border-white/10 flex flex-col gap-4">
                                {comments.map((comment) => {
                                    const canDeleteComment = isSuperAdmin || (currentUserEmail === comment.userEmail);

                                    return (
                                        <div key={comment.id} className="flex gap-3 items-start bg-slate-50/50 dark:bg-black/20 p-3 rounded-2xl border border-slate-100 dark:border-white/5 relative group/comment">
                                            {/* 🔥 FOTO DO COMENTÁRIO CLICÁVEL 🔥 */}
                                            <div 
                                                className="w-7 h-7 rounded-xl overflow-hidden shrink-0 cursor-pointer hover:border-cyan-400 border border-transparent transition-colors"
                                                onClick={() => comment.userId && router.push(`/workstation/${comment.userId}`)}
                                            >
                                                {comment.userImage ? <NextImage src={comment.userImage} alt="" fill className="w-full h-full object-cover" /> : <UserCircleIcon className="w-7 h-7 text-slate-400" />}
                                            </div>
                                            
                                            <div className="flex flex-col w-full">
                                                <div className="flex justify-between items-center">
                                                    {/* 🔥 NOME DO COMENTÁRIO CLICÁVEL 🔥 */}
                                                    <span 
                                                        className="text-[10px] font-bold text-slate-700 dark:text-white/70 cursor-pointer hover:text-cyan-500 transition-colors"
                                                        onClick={() => comment.userId && router.push(`/workstation/${comment.userId}`)}
                                                    >
                                                        {comment.user}
                                                    </span>
                                                    {canDeleteComment && (
                                                        <button onClick={() => handleDeleteComment(comment.id)} className="text-slate-400 hover:text-red-500 transition-colors opacity-0 group-hover/comment:opacity-100">
                                                            <TrashIcon className="w-3 h-3" />
                                                        </button>
                                                    )}
                                                </div>
                                                <p className="text-[11px] text-slate-600 dark:text-white/50 leading-relaxed pr-4 mt-0.5">{comment.content}</p>
                                            </div>
                                        </div>
                                    );
                                })}

                                <form onSubmit={handleAddComment} className="relative mt-2">
                                    <input type="text" value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="Adicionar resposta à rede..." className="w-full bg-white dark:bg-white/5 border border-slate-200 dark:border-cyan-500/20 rounded-xl py-2 pl-4 pr-10 text-xs text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-cyan-500 transition-all" />
                                    <button type="submit" disabled={!newComment.trim()} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-cyan-600 disabled:opacity-30 disabled:cursor-not-allowed hover:scale-110 transition-transform">
                                        <PaperAirplaneIcon className="w-4 h-4" />
                                    </button>
                                </form>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}