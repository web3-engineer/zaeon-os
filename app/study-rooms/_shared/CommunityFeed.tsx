"use client";

import React, { useRef, useState, useEffect, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Sphere, Html } from "@react-three/drei";
import * as THREE from "three";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import NextImage from "next/image";
import {
    ChatBubbleLeftRightIcon,
    UserCircleIcon,
    HeartIcon,
    SparklesIcon,
    SignalIcon,
    ArrowDownIcon,
    MapPinIcon,
    MagnifyingGlassIcon,
    DocumentIcon
} from "@heroicons/react/24/outline";
import { HeartIcon as HeartSolid } from "@heroicons/react/24/solid";

// --- TYPES ---
interface Comment {
    id: string;
    user: string;
    content: string;
    createdAt: string;
}

interface Post {
    id: string;
    user: string;
    userImage?: string;
    title?: string;
    subtitle?: string;
    content: string;
    tags: string[];
    images: string[];
    attachments?: any;
    createdAt: string;
    likes: string[];
    isLiked?: boolean;
    room: string;
    comments: Comment[];
}

// --- 1. GLOBO 3D ---
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
            <mesh
                onClick={(e) => { e.stopPropagation(); onClick(); }}
                onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer'; }}
                onPointerOut={(e) => { e.stopPropagation(); setHovered(false); document.body.style.cursor = 'auto'; }}
            >
                <sphereGeometry args={[0.04, 16, 16]} />
                <meshBasicMaterial color={hovered ? "#fbbf24" : COLOR_DOT} toneMapped={false} />
            </mesh>

            <Html distanceFactor={12} style={{ pointerEvents: 'none' }} zIndexRange={[100, 0]}>
                <AnimatePresence>
                    {hovered && (
                        <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.8 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0 }}
                            className="bg-black/90 backdrop-blur-md border border-cyan-500/50 p-3 rounded-xl w-32 shadow-[0_0_20px_rgba(6,182,212,0.3)] -mt-12 ml-4 pointer-events-none select-none"
                        >
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
                <Sphere args={[1.51, 32, 32]}>
                    <meshBasicMaterial color={COLOR_WIRE_BLUE} wireframe transparent opacity={0.12} />
                </Sphere>
                <LocationMarker lat={37.09} lon={-95.71} label="USA" cost="HIGH" onClick={() => { }} />
                <LocationMarker lat={-14.23} lon={-51.92} label="BRAZIL" cost="LOW" onClick={() => { }} />
                <LocationMarker lat={51.16} lon={10.45} label="GERMANY" cost="MED" onClick={() => { }} />
                <LocationMarker lat={35.86} lon={104.19} label="CHINA" cost="MED" onClick={() => { }} />
                <LocationMarker lat={-25.27} lon={133.77} label="AUSTRALIA" cost="HIGH" onClick={() => { }} />
                <LocationMarker lat={35.67} lon={139.65} label="JAPAN" cost="HIGH" onClick={() => { }} />
            </group>
        </group>
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

// --- COMPONENTE DA PÁGINA ---
export default function LoungeEarth() {
    const { data: session } = useSession();

    const [globalMessage, setGlobalMessage] = useState("Synchronizing global network...");
    const [isLoadingFeed, setIsLoadingFeed] = useState(true);
    const [posts, setPosts] = useState<Post[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [expandedPostId, setExpandedPostId] = useState<string | null>(null);

    useEffect(() => {
        setTimeout(() => { setGlobalMessage("System Update 4.0: Quantum coherence achieved. Welcome to the Zaeon Network."); }, 1500);
        fetchFeed();
    }, []);

    // --- FETCH REAL DO MONGODB VIA API ---
    const fetchFeed = async () => {
        setIsLoadingFeed(true);
        try {
            const res = await fetch('/api/cyber');
            if (res.ok) {
                const data = await res.json();
                setPosts(data);
            } else {
                console.error("Failed to fetch feed");
            }
        } catch (error) {
            console.error("Error fetching feed", error);
        } finally {
            setIsLoadingFeed(false);
        }
    };

    // Callback para atualizar a UI imediatamente quando um novo comentário for feito
    const handleCommentAdded = (postId: string, newComment: Comment) => {
        setPosts(currentPosts => currentPosts.map(post => {
            if (post.id === postId) {
                return { ...post, comments: [...post.comments, newComment] };
            }
            return post;
        }));
    };

    const filteredPosts = useMemo(() => {
        if (!searchQuery) return posts;
        return posts.filter(post =>
            post.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            post.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
        );
    }, [posts, searchQuery]);

    return (
        <div className="relative w-full min-h-screen font-sans bg-transparent">

            <div className="fixed inset-0 z-0 flex flex-col items-center pointer-events-auto bg-transparent">
                <div className="absolute top-10 w-full flex flex-col items-center z-10 pointer-events-none">
                    <h1 className="text-[10px] font-black uppercase tracking-[1em] text-slate-500 dark:text-white/40 flex items-center gap-4 drop-shadow-md">
                        <span className="w-8 h-[1px] bg-slate-300 dark:bg-white/20" />
                        Zaeon Global Network
                        <span className="w-8 h-[1px] bg-slate-300 dark:bg-white/20" />
                    </h1>
                </div>

                <Canvas camera={{ position: [0, -1.8, 6.5], fov: 40 }} className="w-full h-full bg-transparent">
                    <ambientLight intensity={0.6} />
                    <pointLight position={[10, 10, 10]} intensity={2.5} />
                    <CyberGlobe />
                    <OrbitControls enableZoom={false} enablePan={false} rotateSpeed={0.6} />
                </Canvas>
            </div>

            <div className="relative z-10 w-full flex flex-col pointer-events-none">
                <div className="w-full h-[60vh] flex flex-col items-center justify-end pb-8">
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1, duration: 1 }}>
                        <ArrowDownIcon className="w-5 h-5 text-cyan-500 animate-bounce drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
                    </motion.div>
                </div>

                <div className="w-full min-h-screen bg-white/5 dark:bg-[#010816]/20 backdrop-blur-3xl border-t border-white/20 dark:border-white/10 rounded-t-[3rem] shadow-[0_-20px_60px_-15px_rgba(0,0,0,0.5)] px-4 pt-16 pb-32 transition-colors duration-1000 pointer-events-auto relative">
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 w-24 h-1.5 bg-slate-300 dark:bg-white/20 rounded-full opacity-50"></div>

                    <div className="max-w-3xl mx-auto flex flex-col gap-12 relative z-10">

                        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-100px" }} className="relative w-full">
                            <div className="bg-white/20 dark:bg-black/30 backdrop-blur-md border border-cyan-500/30 rounded-[2rem] p-8 shadow-xl text-center relative overflow-hidden group">
                                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 via-transparent to-cyan-500/10 opacity-30 group-hover:opacity-60 transition-opacity duration-700"></div>
                                <div className="relative z-10 flex flex-col items-center gap-3">
                                    <div className="flex items-center gap-2 text-cyan-600 dark:text-cyan-400 mb-1">
                                        <SparklesIcon className="w-5 h-5 animate-pulse" />
                                        <span className="text-[10px] font-black uppercase tracking-[0.3em]">Zaeon Broadcast</span>
                                    </div>
                                    <h2 className="text-xl md:text-2xl font-light text-slate-800 dark:text-white leading-relaxed font-mono px-4">
                                        &quot;{globalMessage}&quot;
                                    </h2>
                                    <div className="flex items-center gap-2 mt-2">
                                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_10px_#22c55e]"></span>
                                        <span className="text-[9px] text-slate-500 dark:text-white/60 uppercase tracking-widest">Network Live // Cyber Module</span>
                                    </div>
                                </div>
                            </div>
                        </motion.div>

                        <div className="w-full min-h-[600px] bg-white/30 dark:bg-black/20 backdrop-blur-2xl border border-white/50 dark:border-white/10 rounded-[2.5rem] shadow-2xl flex flex-col relative overflow-hidden">
                            <div className="px-8 py-5 border-b border-slate-200/50 dark:border-white/10 flex justify-between items-center bg-white/40 dark:bg-white/5">
                                <div className="flex items-center gap-3">
                                    <SignalIcon className={`w-5 h-5 ${isLoadingFeed ? 'animate-pulse text-slate-500' : 'text-cyan-600 dark:text-cyan-400'}`} />
                                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-800 dark:text-white">Cyber Feed</h3>
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
                                        <div className="mb-8 relative group">
                                            <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-white/40" />
                                            <input
                                                type="text"
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                placeholder="Search documents, tags or titles..."
                                                className="w-full bg-white/60 dark:bg-white/5 border border-slate-200/50 dark:border-white/10 rounded-2xl py-4 pl-12 pr-6 text-sm text-slate-800 dark:text-white placeholder:text-slate-500 dark:placeholder:text-white/40 focus:outline-none focus:border-cyan-500/50 focus:bg-white dark:focus:bg-black/40 transition-all shadow-inner backdrop-blur-md"
                                            />
                                        </div>

                                        {filteredPosts.length > 0 ? filteredPosts.map((post) => (
                                            <FeedPost
                                                key={post.id}
                                                post={post}
                                                isExpanded={expandedPostId === post.id}
                                                onToggle={() => setExpandedPostId(expandedPostId === post.id ? null : post.id)}
                                                onCommentAdded={handleCommentAdded}
                                            />
                                        )) : (
                                            <div className="text-center py-12 text-slate-500 dark:text-white/40 text-[10px] uppercase tracking-widest border-2 border-dashed border-slate-300/50 dark:border-white/10 rounded-xl backdrop-blur-sm">
                                                No signals detected. Wait for the first post.
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

// --- SUB-COMPONENTE: POST INDIVIDUAL (AGORA COM COMENTÁRIOS REAIS) ---
function FeedPost({ post, isExpanded, onToggle, onCommentAdded }: { post: Post, isExpanded: boolean, onToggle: () => void, onCommentAdded: (postId: string, comment: Comment) => void }) {
    const { data: session } = useSession();
    const [commentText, setCommentText] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const submitComment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!commentText.trim() || isSubmitting) return;

        setIsSubmitting(true);
        try {
            const res = await fetch('/api/cyber/comment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    postId: post.id,
                    content: commentText,
                    user: session?.user?.name || "Operative",
                    userId: (session?.user as any)?.id || null
                })
            });

            if (res.ok) {
                const newComment = await res.json();
                onCommentAdded(post.id, newComment);
                setCommentText("");
            } else {
                console.error("Failed to submit comment");
            }
        } catch (error) {
            console.error("Error submitting comment:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div
            onClick={onToggle}
            className={`bg-white/60 dark:bg-white/5 backdrop-blur-md border border-slate-200/50 dark:border-white/10 p-5 rounded-3xl transition-all cursor-pointer ${isExpanded ? 'shadow-2xl border-cyan-500/30' : 'hover:bg-white hover:shadow-lg dark:hover:bg-white/10 hover:scale-[1.01]'}`}
        >
            <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-2xl bg-white/80 dark:bg-white/10 overflow-hidden flex items-center justify-center shrink-0 border border-slate-200/50 dark:border-white/10">
                    {post.userImage ? <NextImage src={post.userImage} alt="" fill className="w-full h-full object-cover" /> : <UserCircleIcon className="w-6 h-6 text-slate-500 dark:text-white/50" />}
                </div>
                <div className="flex-1 w-full">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-slate-800 dark:text-white/90">{post.user}</span>
                        </div>
                        <span className="text-[9px] text-slate-500 dark:text-white/40 font-mono">
                            {new Date(post.createdAt).toLocaleDateString()}
                        </span>
                    </div>

                    {post.title && <h4 className="text-sm font-bold text-cyan-600 dark:text-cyan-400 mb-1">{post.title}</h4>}
                    {post.subtitle && <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">{post.subtitle}</p>}

                    <div className="flex flex-wrap gap-2 mb-2">
                        {post.tags?.map(tag => (
                            <span key={tag} className="text-[9px] bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 px-2 py-1 rounded-md font-bold">#{tag}</span>
                        ))}
                    </div>

                    <AnimatePresence>
                        {isExpanded && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                            >
                                <div className="pt-4 mt-2 border-t border-slate-200/50 dark:border-white/10">
                                    <p className="text-xs text-slate-700 dark:text-white/80 leading-relaxed whitespace-pre-wrap">
                                        {post.content}
                                    </p>

                                    {post.images && post.images.length > 0 && (
                                        <div className={`grid gap-2 mt-4 ${post.images.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                                            {post.images.map((img, i) => (
                                                <div key={i} className="rounded-xl overflow-hidden border border-white/10 max-h-48">
                                                    <NextImage src={img} alt="Post Attachment" fill className="w-full h-full object-cover" />
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    <div className="mt-6 pt-4 border-t border-slate-200/50 dark:border-white/10" onClick={e => e.stopPropagation()}>
                                        <h5 className="text-[10px] uppercase font-bold text-slate-500 mb-3">Comments</h5>
                                        <div className="space-y-3 mb-4 max-h-40 overflow-y-auto custom-scrollbar">
                                            {post.comments?.length > 0 ? post.comments.map(c => (
                                                <div key={c.id} className="bg-white/50 dark:bg-black/20 p-3 rounded-xl text-[11px]">
                                                    <span className="font-bold text-cyan-600 dark:text-cyan-400">{c.user}: </span>
                                                    <span className="text-slate-700 dark:text-slate-300">{c.content}</span>
                                                </div>
                                            )) : (
                                                <p className="text-[10px] text-slate-400">No comments yet. Start the discussion.</p>
                                            )}
                                        </div>

                                        {/* FORMULÁRIO DE COMENTÁRIO REAL */}
                                        <form onSubmit={submitComment} className="flex gap-2">
                                            <input
                                                type="text"
                                                value={commentText}
                                                onChange={(e) => setCommentText(e.target.value)}
                                                disabled={isSubmitting}
                                                placeholder="Add a comment..."
                                                className="flex-1 bg-white/60 dark:bg-black/30 border border-slate-200/50 dark:border-white/10 rounded-lg px-3 py-2 text-xs outline-none disabled:opacity-50"
                                            />
                                            <button
                                                type="submit"
                                                disabled={isSubmitting || !commentText.trim()}
                                                className="px-4 py-2 bg-cyan-600 text-white rounded-lg text-[10px] font-bold uppercase hover:bg-cyan-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                {isSubmitting ? '...' : 'Send'}
                                            </button>
                                        </form>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <div className="flex gap-5 mt-4 pt-3 border-t border-transparent">
                        <button onClick={(e) => { e.stopPropagation(); }} className="flex items-center gap-1.5 text-slate-500 dark:text-white/40 hover:text-red-500 transition-colors group">
                            {post.isLiked ? <HeartSolid className="w-4 h-4 text-red-500" /> : <HeartIcon className="w-4 h-4 group-hover:scale-110 transition-transform" />}
                            <span className="text-[10px] font-mono font-bold">{post.likes?.length || 0}</span>
                        </button>
                        <div className="flex items-center gap-1.5 text-slate-500 dark:text-white/40">
                            <ChatBubbleLeftRightIcon className="w-4 h-4" />
                            <span className="text-[10px] font-mono font-bold">{post.comments?.length || 0}</span>
                        </div>
                        {post.attachments && (
                            <div className="flex items-center gap-1.5 text-slate-500 dark:text-white/40 ml-auto">
                                <DocumentIcon className="w-4 h-4" />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}