"use client";

import { avisar, confirmar, tr } from "@/lib/ui/avisos";
import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CameraIcon, ArrowPathIcon, ChevronLeftIcon, ChevronRightIcon, PlusIcon, TrashIcon, PencilIcon, CheckIcon, Cog6ToothIcon, ArrowsRightLeftIcon, XMarkIcon } from "@heroicons/react/24/outline";
import NextImage from "next/image";
import { useSearchParams } from "next/navigation";

interface PersonalPhoto {
    id: string;
    title: string;
    subtitle: string;
    image: string;
    isLandscape?: boolean;
    isEmpty?: boolean;
}

const EMPTY_FRAME: PersonalPhoto = {
    id: `empty-slot`,
    title: "Mural Vazio",
    subtitle: "Aguardando memórias",
    image: "",
    isEmpty: true
};

// 🔥 NOVO: Recebe o ID do usuário que estamos visitando. Se for undefined, é o NOSSO mural.
const MURAL_TOUR = [
    { title: '🌐 O Mural da Comunidade', description: 'Aqui vivem os estudantes Zaeon. Veja perfis, projetos em andamento e colaborações ativas.' },
    { title: '🪪 Seu Perfil', description: 'Clique no seu avatar para editar seu perfil. Adicione seus projetos, áreas de interesse e links.' },
    { title: '🤝 Conectar', description: 'Encontre colegas do mesmo curso ou universidade. Colaboração começa com uma conexão.' },
    { title: '🎓 Pronto para voar!', description: 'Sua conta está ativa. Agora é com você. Boa sorte no TCC!' },
];

export default function NetworkMural({ visitedUserId }: { visitedUserId?: string }) {
    const isVisitorMode = !!visitedUserId; // Se existe um ID, somos visitantes!
    const searchParams = useSearchParams();
    const [muralTourStep, setMuralTourStep] = useState<number | null>(null);

    const [photos, setPhotos] = useState<PersonalPhoto[]>([]);
    const [active, setActive] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);

    const [editModeGlobal, setEditModeGlobal] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editTitle, setEditTitle] = useState("");
    const [editSubtitle, setEditSubtitle] = useState("");
    const [orientations, setOrientations] = useState<Record<string, boolean>>({});

    // Se estivermos no modo visitante e não houver fotos, mostramos apenas 1 frame vazio bonito.
    // Se for o nosso mural, mostramos o frame de "Adicionar".
    const displayItems = photos.length > 0 ? [...photos, EMPTY_FRAME] : [EMPTY_FRAME];

    useEffect(() => {
        if (searchParams?.get('tour') === 'true') {
            const timer = setTimeout(() => setMuralTourStep(0), 600);
            return () => clearTimeout(timer);
        }
    }, [searchParams]);

    useEffect(() => {
        const loadPhotos = async () => {
            try {
                // 🔥 Se formos visitantes, pede pra API as fotos do alvo. Senão, pede as nossas.
                const url = isVisitorMode ? `/api/user/photos?userId=${visitedUserId}` : '/api/user/photos';
                const res = await fetch(url);
                if (res.ok) {
                    const data = await res.json();
                    setPhotos(data);
                }
            } catch (error) {
                console.error("Erro ao carregar acervo:", error);
            } finally {
                setIsLoading(false);
            }
        };
        loadPhotos();
    }, [visitedUserId, isVisitorMode]);

    // Navegação liberada TAMBÉM no modo edição (só trava enquanto edita o texto de um card).
    const nextPhoto = useCallback(() => {
        if (!editingId) setActive((prev) => (prev + 1 < displayItems.length ? prev + 1 : prev));
    }, [displayItems.length, editingId]);

    const prevPhoto = useCallback(() => {
        if (!editingId) setActive((prev) => (prev - 1 >= 0 ? prev - 1 : prev));
    }, [editingId]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (editingId) return;
            if (e.key === "ArrowRight") nextPhoto();
            if (e.key === "ArrowLeft") prevPhoto();
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [nextPhoto, prevPhoto, editingId]);

    const compressImage = (file: File): Promise<{ base64: string, isLandscape: boolean }> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new window.Image();
                img.src = event.target?.result as string;
                img.onload = () => {
                    const isLandscape = img.width > img.height;
                    const canvas = document.createElement("canvas");
                    const MAX_SIZE = 800;
                    let { width, height } = img;
                    if (width > height) {
                        if (width > MAX_SIZE) { height *= MAX_SIZE / width; width = MAX_SIZE; }
                    } else {
                        if (height > MAX_SIZE) { width *= MAX_SIZE / height; height = MAX_SIZE; }
                    }
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext("2d");
                    ctx?.drawImage(img, 0, 0, width, height);
                    resolve({ base64: canvas.toDataURL("image/jpeg", 0.7), isLandscape });
                };
                img.onerror = (err) => reject(err);
            };
            reader.onerror = (err) => reject(err);
        });
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (isVisitorMode) return; // Trava extra
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        const validImageTypes = ['image/jpeg', 'image/png', 'image/webp'];
        const validFiles = files.filter(f => validImageTypes.includes(f.type) && f.size <= 8 * 1024 * 1024);
        if (validFiles.length === 0) { avisar(tr("avisos.muralSemImagem", "Nenhuma imagem válida (JPG, PNG ou WEBP, até 8 MB)."), { tipo: "erro" }); return; }

        setIsUploading(true);
        const tempPhotos: PersonalPhoto[] = [];

        for (const file of validFiles) {
            try {
                const { base64, isLandscape } = await compressImage(file);
                tempPhotos.push({
                    id: `temp-${Math.random().toString(36)}`,
                    title: "Nova Memória", subtitle: "Clique para editar", image: base64, isEmpty: false, isLandscape
                });
            } catch (error) { console.error(error); }
        }

        setPhotos(prev => [...tempPhotos, ...prev]);
        setActive(0);

        const newOrientations = { ...orientations };
        tempPhotos.forEach(p => { newOrientations[p.id] = p.isLandscape || false; });
        setOrientations(newOrientations);

        for (const photo of tempPhotos) {
            try {
                const res = await fetch('/api/user/photos', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ image: photo.image, title: photo.title, subtitle: photo.subtitle })
                });
                if (res.ok) {
                    const savedDbPhoto = await res.json();
                    setPhotos(currentPhotos => currentPhotos.map(p => p.id === photo.id ? savedDbPhoto : p));
                }
            } catch (error) { console.error(error); }
        }

        if (fileInputRef.current) fileInputRef.current.value = '';
        setIsUploading(false);
    };

    const handleSaveEdit = async (e: React.MouseEvent) => {
        e.preventDefault(); e.stopPropagation();
        if (!editingId || isVisitorMode) return; // Trava extra

        setPhotos(prev => prev.map(p => p.id === editingId ? { ...p, title: editTitle, subtitle: editSubtitle } : p));
        setEditingId(null);

        if (!editingId.startsWith('temp-')) {
            try {
                await fetch('/api/user/photos', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: editingId, title: editTitle, subtitle: editSubtitle })
                });
            } catch (error) { console.error(error); }
        }
    };

    const handleDeletePhoto = async (id: string, e: React.MouseEvent) => {
        e.preventDefault(); e.stopPropagation();
        if (id.startsWith('empty') || isVisitorMode) return;

        if (!(await confirmar({ titulo: tr("avisos.apagarMemoria", "Apagar esta memória?"), texto: tr("avisos.semDesfazer", "Não dá pra desfazer."), botao: tr("avisos.apagar", "Apagar"), perigo: true }))) return;

        setPhotos(prev => prev.filter(p => p.id !== id));
        setActive(prev => (prev >= displayItems.length - 1 ? Math.max(0, displayItems.length - 2) : prev));

        if (!id.startsWith('temp-')) {
            try {
                await fetch(`/api/user/photos?id=${id}`, {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id })
                });
            } catch (error) { console.error(error); }
        }
    };

    const movePhoto = (direction: 'left' | 'right', index: number, e: React.MouseEvent) => {
        e.preventDefault(); e.stopPropagation();
        if (index < 0 || index >= photos.length || isVisitorMode) return;

        const newPhotos = [...photos];
        if (direction === 'left' && index > 0) {
            [newPhotos[index - 1], newPhotos[index]] = [newPhotos[index], newPhotos[index - 1]];
            setActive(index - 1);
        } else if (direction === 'right' && index < photos.length - 1) {
            [newPhotos[index + 1], newPhotos[index]] = [newPhotos[index], newPhotos[index + 1]];
            setActive(index + 1);
        }
        setPhotos(newPhotos);
    };

    if (isLoading) {
        return (
            <div className="w-full flex flex-col items-center justify-center pt-10 pb-24 opacity-50">
                <ArrowPathIcon className="w-8 h-8 animate-spin text-cyan-500 mb-4" />
                <span className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold">Lendo Acervo...</span>
            </div>
        );
    }

    const isActiveEmptyFrame = active === displayItems.length - 1;

    return (
        <div className="w-full flex flex-col items-center justify-center pt-2 pb-24 overflow-hidden relative" style={{ perspective: "1200px" }}>

            <input type="file" multiple className="hidden" accept="image/*" ref={fileInputRef} onChange={handleFileSelect} />

            <div className="mb-12 flex flex-col items-center relative z-20">
                <h2 className="text-3xl font-black uppercase tracking-tighter text-slate-900 dark:text-white mb-2">
                    {isVisitorMode ? 'Acervo Visual' : 'Minhas Fotos'}
                </h2>

                {/* 🔥 ESCONDE OS BOTÕES DE UPLOAD/EDIÇÃO SE FOR VISITANTE 🔥 */}
                {!isVisitorMode && (
                    <div className="flex gap-4 mt-4">
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploading}
                            className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-white/10 border border-white/20 backdrop-blur-2xl shadow-lg text-slate-800 dark:text-white transition-all hover:bg-white/20 disabled:opacity-50 cursor-pointer"
                        >
                            {isUploading ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : <PlusIcon className="w-4 h-4" />}
                            <span className="text-[10px] font-bold uppercase tracking-widest">{isUploading ? 'Adicionando...' : 'Adicionar'}</span>
                        </button>

                        <button
                            onClick={() => { setEditModeGlobal(!editModeGlobal); setEditingId(null); }}
                            className={`flex items-center gap-2 px-6 py-2.5 rounded-full border backdrop-blur-2xl shadow-lg transition-all cursor-pointer
                                ${editModeGlobal ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300' : 'bg-white/10 border-white/20 text-slate-800 dark:text-white hover:bg-white/20'}`}
                        >
                            {editModeGlobal ? <CheckIcon className="w-4 h-4" /> : <Cog6ToothIcon className="w-4 h-4" />}
                            <span className="text-[10px] font-bold uppercase tracking-widest">{editModeGlobal ? 'Concluir' : 'Modo Edição'}</span>
                        </button>
                    </div>
                )}
            </div>

            <div className="flex items-center justify-center relative h-[450px] w-full max-w-6xl" style={{ transformStyle: "preserve-3d" }}>

                {displayItems.length > 1 && !editingId && (
                    <>
                        <button onClick={prevPhoto} disabled={active === 0} className={`absolute left-4 md:left-10 z-50 p-3 rounded-full bg-white/10 border border-white/20 backdrop-blur-2xl text-slate-800 dark:text-white transition-all shadow-lg hover:bg-white/20 hover:scale-110 cursor-pointer ${active === 0 ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                            <ChevronLeftIcon className="w-5 h-5" />
                        </button>
                        <button onClick={nextPhoto} disabled={active === displayItems.length - 1} className={`absolute right-4 md:right-10 z-50 p-3 rounded-full bg-white/10 border border-white/20 backdrop-blur-2xl text-slate-800 dark:text-white transition-all shadow-lg hover:bg-white/20 hover:scale-110 cursor-pointer ${active === displayItems.length - 1 ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                            <ChevronRightIcon className="w-5 h-5" />
                        </button>
                    </>
                )}

                {displayItems.map((item, i) => {
                    // 🔥 Se for visitante, não renderizamos o slot vazio para não confundir 🔥
                    if (isVisitorMode && item.isEmpty) return null;

                    const isActive = i === active;
                    const isEditingThis = editingId === item.id;
                    const offset = i - active;
                    const sign = Math.sign(offset);
                    const absOffset = Math.abs(offset);

                    const isLandscape = item.isLandscape !== undefined ? item.isLandscape : (orientations[item.id] || false);
                    const widthClass = isLandscape ? 'w-[450px]' : 'w-72';
                    const heightClass = isLandscape ? 'h-80' : 'h-96';
                    const spacingMultiplier = isLandscape ? 140 : 100;

                    const rotateY = isActive ? 0 : sign * -35;
                    const translateX = isActive ? 0 : sign * (absOffset * spacingMultiplier + 130);
                    const translateZ = isActive ? 150 : -absOffset * 100;
                    const zIndex = 20 - absOffset;
                    const opacity = absOffset > 3 ? 0 : 1;

                    return (
                        <motion.div
                            key={item.id}
                            onClick={() => {
                                if (!isVisitorMode && item.isEmpty) fileInputRef.current?.click();
                                else if (!editingId && !editModeGlobal) setActive(i);
                            }}
                            animate={{ rotateY, x: translateX, z: translateZ, zIndex, opacity }}
                            transition={{ type: "spring", stiffness: 260, damping: 25 }}
                            className={`absolute ${widthClass} ${heightClass} rounded-[2.5rem] shadow-[0_20px_60px_rgba(0,0,0,0.5)] border transition-all duration-500 overflow-hidden select-none flex flex-col items-center justify-center group
                                ${item.isEmpty ? 'border-white/10 border-dashed bg-white/5 backdrop-blur-2xl hover:bg-white/10 cursor-pointer' :
                                    isEditingThis ? 'border-cyan-400/50 shadow-[0_0_50px_rgba(34,211,238,0.3)]' : 'border-white/10 bg-black cursor-pointer'}`}
                        >
                            <div className="absolute inset-0 w-full h-full flex flex-col items-center justify-center">

                                {item.isEmpty ? (
                                    <div className={`flex flex-col items-center transition-opacity duration-500 ${isActive ? 'opacity-100' : 'opacity-30'}`}>
                                        <CameraIcon className="w-10 h-10 text-slate-400/50 mb-3" />
                                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{isVisitorMode ? 'Acervo Vazio' : 'Adicionar Frame'}</span>
                                    </div>
                                ) : (
                                    <>
                                        <NextImage
                                            src={item.image}
                                            alt={item.title}
                                            fill
                                            onLoad={(e) => {
                                                const img = e.currentTarget as HTMLImageElement;
                                                setOrientations(prev => ({ ...prev, [item.id]: img.naturalWidth > img.naturalHeight }));
                                            }}
                                            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${isActive ? 'opacity-100' : 'opacity-60'}`}
                                        />

                                        <div className={`absolute inset-0 bg-gradient-to-t ${editModeGlobal ? 'from-black/90 via-black/40' : 'from-black/90 via-transparent'} to-transparent pointer-events-none transition-colors`} />

                                        {/* MODO ORGANIZAÇÃO DA FOTO (SÓ PARA O DONO) */}
                                        {editModeGlobal && !isVisitorMode && (
                                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 z-[9999] pointer-events-auto opacity-0 hover:opacity-100 transition-opacity bg-black/50 backdrop-blur-sm rounded-[2.5rem]">
                                                <div className="flex gap-4 items-center">
                                                    <button onPointerDown={(e) => e.stopPropagation()} onClick={(e) => movePhoto('left', i, e)} disabled={i === 0} className="p-3 bg-white/20 hover:bg-white/40 rounded-full text-white transition-all disabled:opacity-20 backdrop-blur-md cursor-pointer"><ChevronLeftIcon className="w-6 h-6" /></button>
                                                    <ArrowsRightLeftIcon className="w-5 h-5 text-white/50" />
                                                    <button onPointerDown={(e) => e.stopPropagation()} onClick={(e) => movePhoto('right', i, e)} disabled={i === photos.length - 1} className="p-3 bg-white/20 hover:bg-white/40 rounded-full text-white transition-all disabled:opacity-20 backdrop-blur-md cursor-pointer"><ChevronRightIcon className="w-6 h-6" /></button>
                                                </div>
                                                <span className="text-[10px] uppercase font-bold text-white tracking-widest bg-black/60 px-4 py-1 rounded-full border border-white/20 pointer-events-none">Organizar Memória</span>
                                            </div>
                                        )}

                                        <div className={`absolute bottom-6 left-6 right-6 z-10 flex flex-col items-start transition-opacity duration-500 ${isActive && !editModeGlobal ? 'opacity-100' : 'opacity-0'} pointer-events-none`}>

                                            {isEditingThis && !isVisitorMode ? (
                                                <div className="w-full flex items-end gap-3 bg-black/80 p-4 rounded-2xl backdrop-blur-2xl border border-white/20 pointer-events-auto shadow-2xl">
                                                    <div className="flex-1 flex flex-col gap-1">
                                                        <input autoFocus type="text" value={editTitle} onChange={e => setEditTitle(e.target.value)} className="w-full bg-transparent border-b border-white/30 text-white placeholder:text-white/40 focus:outline-none text-2xl font-[cursive] tracking-wide" />
                                                        <input type="text" value={editSubtitle} onChange={e => setEditSubtitle(e.target.value)} className="w-full bg-transparent text-white/70 placeholder:text-white/30 focus:outline-none text-[10px] font-bold uppercase tracking-[0.2em] mt-1" />
                                                    </div>
                                                    <button onClick={handleSaveEdit} className="p-2.5 bg-white/20 hover:bg-white/30 rounded-full border border-white/20 text-white transition-all hover:scale-110 shadow-lg cursor-pointer">
                                                        <CheckIcon className="w-4 h-4 font-black" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <div
                                                    className={`w-full group/edit ${isActive && !editModeGlobal && !isVisitorMode ? 'cursor-text pointer-events-auto' : 'pointer-events-none'}`}
                                                    onClick={(e) => {
                                                        if (!isActive || editModeGlobal || isVisitorMode) return;
                                                        e.preventDefault(); e.stopPropagation();
                                                        setEditingId(item.id); setEditTitle(item.title); setEditSubtitle(item.subtitle);
                                                    }}
                                                >
                                                    <div className="flex items-center gap-3 w-full">
                                                        <h3 className="text-3xl font-black text-white leading-tight tracking-tight drop-shadow-md font-[cursive] group-hover/edit:text-white/80 transition-colors">{item.title}</h3>
                                                        {!isVisitorMode && <PencilIcon className="w-3 h-3 text-white/0 group-hover/edit:text-white/50 transition-colors" />}
                                                    </div>
                                                    <p className="text-white/80 text-[10px] font-bold uppercase tracking-widest mt-1 drop-shadow-md">{item.subtitle}</p>
                                                </div>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            {/* PAINEL DE CONTROLE (Só aparece pro dono da Workstation se ele tiver fotos ou estiver editando) */}
            {!isVisitorMode && (
                <div className="mt-12 h-20 flex flex-col items-center justify-center relative z-50">

                    {!editModeGlobal && photos.length > 0 && (
                        <div className="flex gap-2">
                            {displayItems.map((_, i) => (
                                <button key={i} onClick={() => setActive(i)} className={`w-2 h-2 rounded-full transition-all cursor-pointer ${i === active ? 'bg-cyan-400 scale-125 shadow-[0_0_10px_rgba(34,211,238,0.5)]' : 'bg-slate-400 dark:bg-white/20 hover:bg-slate-500'}`} />
                            ))}
                        </div>
                    )}

                    <AnimatePresence>
                        {editModeGlobal && (
                            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="flex items-center gap-6 px-8 py-3 bg-white/10 backdrop-blur-2xl border border-white/20 rounded-[2rem] shadow-[0_15px_40px_rgba(0,0,0,0.5)]">
                                <button onClick={prevPhoto} disabled={active === 0} className="p-3 bg-white/5 hover:bg-white/10 rounded-full text-white transition-all disabled:opacity-20 cursor-pointer"><ChevronLeftIcon className="w-5 h-5" /></button>

                                <button
                                    onClick={(e) => handleDeletePhoto(displayItems[active]?.id, e)}
                                    disabled={isActiveEmptyFrame}
                                    className={`flex items-center gap-2 px-5 py-2.5 rounded-full transition-all font-bold text-[10px] uppercase tracking-widest cursor-pointer shadow-lg
                                        ${isActiveEmptyFrame ? 'bg-white/5 text-white/20 border border-white/5 cursor-not-allowed' : 'bg-red-500/20 hover:bg-red-500 border border-red-500/50 text-white hover:scale-105 shadow-red-500/20'}`}
                                >
                                    <TrashIcon className="w-4 h-4" /> {isActiveEmptyFrame ? 'Vazio' : 'Apagar Foto'}
                                </button>

                                <button onClick={nextPhoto} disabled={active === displayItems.length - 1} className="p-3 bg-white/5 hover:bg-white/10 rounded-full text-white transition-all disabled:opacity-20 cursor-pointer"><ChevronRightIcon className="w-5 h-5" /></button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            )}

            {/* PONTINHOS DE NAVEGAÇÃO PARA O VISITANTE */}
            {isVisitorMode && photos.length > 0 && (
                <div className="mt-12 flex gap-2 relative z-20">
                    {photos.map((_, i) => (
                        <button key={i} onClick={() => setActive(i)} className={`w-2 h-2 rounded-full transition-all cursor-pointer ${i === active ? 'bg-cyan-400 scale-125 shadow-[0_0_10px_rgba(34,211,238,0.5)]' : 'bg-slate-400 dark:bg-white/20 hover:bg-slate-500'}`} />
                    ))}
                </div>
            )}

            {/* Mini-tour overlay — shown on ?tour=true after first login */}
            <AnimatePresence>
                {muralTourStep !== null && (
                    <div className="fixed inset-0 z-[500] bg-black/60 backdrop-blur-sm flex items-center justify-center pointer-events-auto">
                        <motion.div
                            key={muralTourStep}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.22 }}
                            className="w-80 bg-white dark:bg-[#111] border border-slate-200 dark:border-white/15 rounded-3xl shadow-2xl p-6 flex flex-col gap-4"
                        >
                            <div className="flex items-start justify-between gap-2">
                                <div className="flex-1">
                                    <h3 className="font-black text-base text-black dark:text-white">{MURAL_TOUR[muralTourStep].title}</h3>
                                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-2 leading-relaxed">{MURAL_TOUR[muralTourStep].description}</p>
                                </div>
                                <button onClick={() => setMuralTourStep(null)} className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 transition-all">
                                    <XMarkIcon className="w-4 h-4" />
                                </button>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex gap-1">
                                    {MURAL_TOUR.map((_, i) => (
                                        <div key={i} className={`rounded-full transition-all ${i === muralTourStep ? 'w-4 h-1.5 bg-cyan-400' : 'w-1.5 h-1.5 bg-slate-200 dark:bg-white/20'}`} />
                                    ))}
                                </div>
                                <button
                                    onClick={() => {
                                        if (muralTourStep >= MURAL_TOUR.length - 1) {
                                            setMuralTourStep(null);
                                        } else {
                                            setMuralTourStep(s => (s ?? 0) + 1);
                                        }
                                    }}
                                    className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-black uppercase tracking-wider transition-all"
                                >
                                    {muralTourStep >= MURAL_TOUR.length - 1 ? 'Concluir' : 'Próximo'}
                                </button>
                            </div>
                            <button onClick={() => setMuralTourStep(null)} className="text-center text-[10px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-all uppercase tracking-widest font-bold">
                                Pular
                            </button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}