"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    User, BookOpen, ChevronUp, ChevronDown, Mars, Venus,
    Upload, Image as ImageIcon, Loader2, Maximize2,
    ShieldCheck, FileText, Globe, Mail, Phone
} from 'lucide-react';
import Image from 'next/image';
import { signIn } from 'next-auth/react';
import { useDropzone } from 'react-dropzone';
import { useTranslation } from 'react-i18next';
import { ALL_COURSES } from '@/constants/courses';

const PARTNER_INSTITUTIONS = [
    { id: 'unilab', name: 'UNILAB', logo: '/assets/unilab-logo.png' },
    { id: 'ufc', name: 'UFC', logo: '/assets/ufc-logo.png' },
    { id: 'ifce', name: 'IFCE', logo: '/assets/ifce-logo.png' },
];

const COUNTRIES = [
    { id: 'br', flag: '🇧🇷', langMatch: 'pt', placeholder: 'Ex: Engenharia de Software' },
    { id: 'cn', flag: '🇨🇳', langMatch: 'zh', placeholder: 'Ex: 计算机科学' },
    { id: 'us', flag: '🇺🇸', langMatch: 'en', placeholder: 'Ex: Computer Science' },
    { id: 'fr', flag: '🇫🇷', langMatch: 'fr', placeholder: 'Ex: Informatique' },
    { id: 'kr', flag: '🇰🇷', langMatch: 'ko', placeholder: 'Ex: 컴퓨터 공학' },
];

interface ZaeonAuthModalProps {
    isOpen: boolean;
    onClose: () => void;
    role: string;
}

const ZaeonAuthModal = ({ isOpen, onClose, role }: ZaeonAuthModalProps) => {
    const { i18n } = useTranslation();
    const [mounted, setMounted] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [selectedCountry, setSelectedCountry] = useState('br');

    const [name, setName] = useState('');
    const [age, setAge] = useState<number>(27);
    const [gender, setGender] = useState<'male' | 'female' | 'other'>('female');
    const [studyArea, setStudyArea] = useState('');
    const [studentId, setStudentId] = useState('');
    const [institution, setInstitution] = useState<string | null>(null);
    const [verificationDoc, setVerificationDoc] = useState<string | null>(null);
    const [showDropdown, setShowDropdown] = useState(false);
    const [profileImage, setProfileImage] = useState<string | null>(null);
    const [torsoImage, setTorsoImage] = useState<string | null>(null);

    // --- NOVOS ESTADOS PARA GUEST ACCOUNT ---
    const [contactEmail, setContactEmail] = useState("");
    const [phone, setPhone] = useState("");

    // NORMALIZAÇÃO DE ROLE NO TOPO (Garante que "professor" e "teacher" sejam a mesma coisa em todo o modal)
    const normalizedRole = role.toLowerCase() === 'professor' || role.toLowerCase() === 'teacher' ? 'teacher' : 'student';

    useEffect(() => {
        if (i18n?.language) {
            const matchedCountry = COUNTRIES.find(c => i18n.language.startsWith(c.langMatch));
            if (matchedCountry) setSelectedCountry(matchedCountry.id);
        }
    }, [i18n?.language]);

    useEffect(() => {
        if (selectedCountry !== 'br' && institution !== 'other') setInstitution(null);
    }, [selectedCountry, institution]);

    // CORREÇÃO: isAcademicRole agora usa o normalizedRole e só aceita student ou teacher
    const isAcademicRole = normalizedRole === 'student' || normalizedRole === 'teacher';

    const isFastTrackInst = institution === 'unilab' || institution === 'ufc' || institution === 'ifce';
    const isGuest = !isFastTrackInst;

    const hasAcademicProof = !isAcademicRole || (selectedCountry === 'br' && isFastTrackInst) || verificationDoc !== null;
    const hasGuestContact = !isGuest || (contactEmail.includes('@') && phone.length > 5);
    const isReadyToSign = name.length > 2 && studyArea.length > 2 && hasAcademicProof && hasGuestContact && !isSubmitting;

    const filteredCourses = ALL_COURSES.filter(c => c.toLowerCase().includes(studyArea.toLowerCase()));
    const activeCountryData = COUNTRIES.find(c => c.id === selectedCountry) || COUNTRIES[0];

    const getPhonePrefix = () => {
        switch (selectedCountry) {
            case 'br': return '+55';
            case 'cn': return '+86';
            case 'fr': return '+33';
            case 'kr': return '+82';
            default: return '+1'; // US e outros
        }
    };

    const convertToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = error => reject(error);
        });
    };

    const onDropProfile = useCallback(async (acceptedFiles: File[]) => {
        const file = acceptedFiles[0];
        if (file) {
            const base64 = await convertToBase64(file);
            setProfileImage(base64);
        }
    }, []);

    const onDropTorso = useCallback(async (acceptedFiles: File[]) => {
        const file = acceptedFiles[0];
        if (file) {
            const base64 = await convertToBase64(file);
            setTorsoImage(base64);
        }
    }, []);

    const onDropVerification = useCallback(async (acceptedFiles: File[]) => {
        const file = acceptedFiles[0];
        if (file) {
            const base64 = await convertToBase64(file);
            setVerificationDoc(base64);
            setInstitution('other');
        }
    }, []);

    const { getRootProps: getProfileProps, getInputProps: getProfileInput } = useDropzone({
        onDrop: onDropProfile, accept: { 'image/*': [] }, maxFiles: 1, noClick: !!profileImage
    });

    const { getRootProps: getTorsoProps, getInputProps: getTorsoInput } = useDropzone({
        onDrop: onDropTorso, accept: { 'image/*': [] }, maxFiles: 1, noDragEventsBubbling: true
    });

    const { getRootProps: getVerifProps, getInputProps: getVerifInput } = useDropzone({
        onDrop: onDropVerification, accept: { 'application/pdf': [], 'image/*': [] }, maxFiles: 1
    });

    // --- LÓGICA DE LOGIN HÍBRIDO ---
    const handleInitialize = async () => {
        setIsSubmitting(true);

        // CORREÇÃO: Define o destino correto usando a role já normalizada
        const destinationPath = normalizedRole === 'teacher' ? '/workstation/teacher/work' : '/workstation';

        const onboardingData = {
            name, age, gender, course: studyArea, identityId: studentId,
            role: normalizedRole, // <-- Vai salvar "teacher" ou "student"
            institution, verificationDoc,
            image: profileImage, torsoImage: torsoImage,
            countryCode: selectedCountry,
            contactEmail, phone: `${getPhonePrefix()} ${phone}`
        };

        if (isFastTrackInst) {
            // FLUXO NORMAL (GOOGLE)
            localStorage.setItem('zaeon_onboarding', JSON.stringify(onboardingData));
            await signIn('google', { callbackUrl: destinationPath });
        } else {
            // FLUXO (GUEST)
            try {
                const res = await fetch('/api/auth/guest-register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(onboardingData)
                });

                if (res.ok) {
                    await signIn('credentials', {
                        email: contactEmail,
                        callbackUrl: destinationPath
                    });
                } else {
                    alert("Falha ao criar acesso Guest.");
                    setIsSubmitting(false);
                }
            } catch (error) {
                console.error("Erro no Guest Auth:", error);
                setIsSubmitting(false);
            }
        }
    };

    useEffect(() => {
        setMounted(true);
        if (isOpen && !isMinimized) document.body.style.overflow = 'hidden';
        else document.body.style.overflow = 'auto';
        return () => { document.body.style.overflow = 'auto'; };
    }, [isOpen, isMinimized]);

    const canvasRef = useRef<HTMLCanvasElement>(null);
    useEffect(() => {
        if (!isOpen || !mounted || isMinimized) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        let animationFrameId: number;
        const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
        window.addEventListener('resize', resize); resize();

        class Particle {
            x: number; y: number; vx: number; vy: number; text: string; size: number;
            constructor(text: string, w: number, h: number) {
                this.text = text; this.x = Math.random() * w; this.y = Math.random() * h;
                this.vx = (Math.random() - 0.5) * 0.3; this.vy = (Math.random() - 0.5) * 0.3;
                this.size = Math.random() * 10 + 10;
            }
            update(w: number, h: number) {
                this.x += this.vx; this.y += this.vy;
                if (this.x < 0 || this.x > w) this.vx *= -1;
                if (this.y < 0 || this.y > h) this.vy *= -1;
            }
            draw(ctx: CanvasRenderingContext2D) {
                ctx.font = `${this.size}px monospace`;
                ctx.fillStyle = "rgba(16, 185, 129, 0.10)";
                ctx.fillText(this.text, this.x, this.y);
            }
        }
        // Usamos normalizedRole na animação para ficar consistente
        const particles = Array.from({ length: 20 }).map(() => new Particle(normalizedRole.toUpperCase(), canvas.width, canvas.height));
        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            particles.forEach(p => { p.update(canvas.width, canvas.height); p.draw(ctx); });
            animationFrameId = requestAnimationFrame(animate);
        };
        animate();
        return () => { window.removeEventListener('resize', resize); cancelAnimationFrame(animationFrameId); };
    }, [isOpen, mounted, normalizedRole, isMinimized]); // Adicionei normalizedRole às dependências

    const StringLine = ({ height }: { height: number }) => (
        <div className="absolute left-1/2 -translate-x-1/2 w-[1px] bg-gray-400/60 dark:bg-white/20 z-0 pointer-events-none" style={{ height: `${height}px`, top: `-${height}px` }} />
    );

    if (!mounted || !isOpen) return null;

    let loginButtonText = "Ingressar no Lounge (Guest)";
    if (selectedCountry === 'br' && institution === 'unilab') loginButtonText = "Sign in with UNILAB (.edu account)";
    else if (selectedCountry === 'br' && institution === 'ufc') loginButtonText = "Sign in with UFC (.edu account)";
    else if (selectedCountry === 'br' && institution === 'ifce') loginButtonText = "Sign in with IFCE (.edu account)";

    const modalContent = (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 md:p-0">
            <AnimatePresence mode="wait">
                {!isMinimized && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-gray-900/80 backdrop-blur-sm" onClick={onClose}>
                        <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" />
                    </motion.div>
                )}

                {!isMinimized && (
                    <motion.div
                        initial={{ scale: 0.95, y: 20, opacity: 0 }}
                        animate={{ scale: 1, y: 0, opacity: 1 }}
                        exit={{ scale: 0.8, y: 100, opacity: 0 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="relative z-10 w-full max-w-[950px] h-[720px] bg-gray-200/90 dark:bg-[#0f172a] rounded-2xl shadow-2xl overflow-hidden border border-white/50 dark:border-white/10 grid grid-cols-1 md:grid-cols-[1.3fr_0.7fr]"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="absolute top-4 left-4 z-50 flex items-center gap-2 group/traffic">
                            <button onClick={onClose} className="w-3 h-3 rounded-full bg-[#ff5f56] border border-[#e0443e] hover:brightness-90 transition-all shadow-sm" />
                            <button onClick={() => setIsMinimized(true)} className="w-3 h-3 rounded-full bg-[#ffbd2e] border border-[#dea123] hover:brightness-90 transition-all shadow-sm" />
                            <button className="w-3 h-3 rounded-full bg-[#27c93f] border border-[#1aab29] hover:brightness-90 transition-all shadow-sm" />
                        </div>

                        <div className="relative h-full p-8 flex flex-col items-center pt-14 overflow-y-auto custom-scrollbar scroll-smooth">
                            <div className="absolute top-6 left-6 opacity-5 dark:opacity-10 text-5xl font-black uppercase tracking-tighter -rotate-12 pointer-events-none select-none text-black dark:text-white">{normalizedRole}</div>

                            <div className="w-full flex flex-col gap-6 pb-8 mt-2">
                                <motion.div drag dragConstraints={{ left: -30, right: 30, top: -30, bottom: 30 }} className="relative z-40 w-full bg-white dark:bg-[#1e293b] rounded-xl p-5 border border-gray-100 dark:border-white/10 shadow-lg">
                                    <StringLine height={70} />
                                    <div className="flex items-center gap-2 mb-4 border-b border-dashed border-gray-200 pb-2">
                                        <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
                                        <span className="text-[10px] uppercase tracking-widest text-gray-500 dark:text-gray-400 font-bold">Identity Protocol</span>
                                    </div>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="text-[9px] text-gray-500 uppercase font-bold tracking-wider ml-1">Full Name</label>
                                            <div className="flex items-center bg-gray-50 dark:bg-black/30 rounded-lg border border-gray-200 dark:border-white/10 px-3 py-1 focus-within:border-purple-500 transition-colors">
                                                <User size={14} className="text-gray-400" />
                                                <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Subject Name" className="w-full bg-transparent border-none text-sm p-2 focus:ring-0 text-gray-900 dark:text-gray-200 outline-none" />
                                            </div>
                                        </div>
                                        <div className="flex gap-4">
                                            <div className="flex-1">
                                                <label className="text-[9px] text-gray-500 uppercase font-bold tracking-wider ml-1">Age Cycle</label>
                                                <div className="flex items-center justify-between bg-gray-100 dark:bg-[#0f172a] rounded-lg border p-1 h-11 border-gray-200 dark:border-white/10">
                                                    <button onClick={() => setAge(a => Math.max(1, a - 1))} className="px-2 text-gray-500"><ChevronDown size={14} /></button>
                                                    <span className="font-mono text-lg font-bold text-blue-600 dark:text-blue-400">{age}</span>
                                                    <button onClick={() => setAge(a => a + 1)} className="px-2 text-gray-500"><ChevronUp size={14} /></button>
                                                </div>
                                            </div>
                                            <div className="flex-1">
                                                <label className="text-[9px] text-gray-500 uppercase font-bold tracking-wider ml-1">Biometrics</label>
                                                <div className="relative flex h-11 bg-gray-100 dark:bg-[#0f172a] rounded-lg p-1 border cursor-pointer border-gray-200 dark:border-white/10">
                                                    <motion.div
                                                        className={`absolute top-1 bottom-1 w-[calc(33.33%-4px)] rounded-md transition-all ${gender === 'male' ? 'bg-blue-500' :
                                                            gender === 'other' ? 'bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500' :
                                                                'bg-pink-500'
                                                            }`}
                                                        animate={{
                                                            left: gender === 'male' ? '4px' : gender === 'other' ? '33.33%' : '66.66%'
                                                        }}
                                                    />
                                                    <button onClick={() => setGender('male')} className="flex-1 z-10 flex justify-center items-center"><Mars size={18} className={gender === 'male' ? 'text-white' : 'text-gray-500'} /></button>
                                                    <button onClick={() => setGender('other')} className="flex-1 z-10 flex justify-center items-center">
                                                        <div className={`w-4 h-4 rounded-sm transition-opacity ${gender === 'other' ? 'opacity-100 ring-1 ring-white/50' : 'opacity-40 grayscale'}`} style={{ background: 'linear-gradient(180deg, #FF0018 0%, #FF8D00 20%, #FFED00 40%, #008026 60%, #004CFF 80%, #732982 100%)' }} />
                                                    </button>
                                                    <button onClick={() => setGender('female')} className="flex-1 z-10 flex justify-center items-center"><Venus size={18} className={gender === 'female' ? 'text-white' : 'text-gray-500'} /></button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>

                                <motion.div drag dragConstraints={{ left: -30, right: 30 }} className="relative z-30 w-full bg-white dark:bg-[#1e293b] rounded-xl p-5 border border-gray-100 dark:border-white/10 shadow-lg">
                                    <StringLine height={40} />
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-2">
                                            <BookOpen size={14} className="text-purple-500" />
                                            <span className="text-[9px] uppercase tracking-widest text-gray-500 font-bold">Knowledge Base</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-black/40 p-1 rounded-full border border-gray-200 dark:border-white/10">
                                            {COUNTRIES.map(c => (
                                                <button
                                                    key={c.id}
                                                    onClick={() => setSelectedCountry(c.id)}
                                                    className={`w-6 h-6 flex items-center justify-center rounded-full text-xs transition-all duration-300 ${selectedCountry === c.id
                                                        ? 'bg-white dark:bg-white/20 shadow-sm scale-110 ring-1 ring-purple-500/50'
                                                        : 'opacity-50 hover:opacity-100 hover:bg-white/50 dark:hover:bg-white/10'
                                                        }`}
                                                    title={c.langMatch.toUpperCase()}
                                                >
                                                    {c.flag}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={studyArea}
                                            onChange={(e) => {
                                                setStudyArea(e.target.value);
                                                setShowDropdown(true);
                                            }}
                                            onFocus={() => setShowDropdown(true)}
                                            onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                                            placeholder={activeCountryData.placeholder}
                                            className="w-full bg-gray-50 dark:bg-black/30 border border-gray-200 dark:border-white/10 rounded px-3 py-2 text-xs focus:border-purple-500 outline-none text-slate-800 dark:text-white transition-all"
                                        />
                                        <AnimatePresence>
                                            {showDropdown && studyArea.length > 0 && (
                                                <motion.ul
                                                    initial={{ opacity: 0, y: -5 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, y: -5 }}
                                                    className="absolute top-full left-0 right-0 mt-2 max-h-40 overflow-y-auto bg-white dark:bg-[#0f172a] border border-gray-200 dark:border-white/10 rounded-lg shadow-xl z-50 custom-scrollbar"
                                                >
                                                    {filteredCourses.length > 0 ? filteredCourses.map(course => (
                                                        <li key={course} onClick={() => { setStudyArea(course); setShowDropdown(false); }} className="px-4 py-2.5 text-xs cursor-pointer hover:bg-purple-50 dark:hover:bg-white/5 text-slate-700 dark:text-gray-300 border-b border-gray-100 dark:border-white/5 last:border-none transition-colors">
                                                            {course}
                                                        </li>
                                                    )) : (
                                                        <li className="px-4 py-2.5 text-xs text-gray-400 italic">Course not found in Zaeon Registry.</li>
                                                    )}
                                                </motion.ul>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </motion.div>

                                {/* NOVOS BLOCOS: INFORMAÇÕES DE CONTATO PARA CONVIDADOS */}
                                {isGuest && (
                                    <motion.div drag dragConstraints={{ left: -10, right: 10 }} className="relative z-20 w-full bg-white dark:bg-[#1e293b] rounded-xl p-4 border border-gray-100 dark:border-white/10 shadow-md">
                                        <div className="flex flex-col gap-4">
                                            <div className="bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 p-3 rounded-xl flex flex-col gap-2">
                                                <label className="text-[9px] font-black uppercase tracking-widest text-purple-600 dark:text-purple-400">
                                                    Email de Acesso (Guest)
                                                </label>
                                                <div className="flex items-center gap-3">
                                                    <Mail size={16} className="text-gray-400" />
                                                    <input
                                                        type="email"
                                                        placeholder="seu.email@exemplo.com"
                                                        value={contactEmail}
                                                        onChange={(e) => setContactEmail(e.target.value)}
                                                        className="bg-transparent w-full text-xs outline-none text-slate-800 dark:text-white placeholder:text-slate-400/50"
                                                    />
                                                </div>
                                            </div>

                                            <div className="bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 p-3 rounded-xl flex flex-col gap-2">
                                                <label className="text-[9px] font-black uppercase tracking-widest text-purple-600 dark:text-purple-400">
                                                    Comms Link (WhatsApp/Telegram)
                                                </label>
                                                <div className="flex items-center gap-3">
                                                    <span className="text-xs font-mono font-bold text-gray-500 dark:text-white/50 bg-gray-200 dark:bg-white/5 px-2 py-1 rounded-md">
                                                        {getPhonePrefix()}
                                                    </span>
                                                    <input
                                                        type="tel"
                                                        placeholder="(11) 99999-9999"
                                                        value={phone}
                                                        onChange={(e) => setPhone(e.target.value)}
                                                        className="bg-transparent w-full text-xs outline-none font-mono text-slate-800 dark:text-white placeholder:text-slate-400/50"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}

                                {isAcademicRole && (
                                    <div className="relative z-10 w-full flex flex-col gap-6">
                                        <motion.div drag dragConstraints={{ left: -10, right: 10 }} className={`${selectedCountry === 'br' ? 'w-5/6 mx-auto' : 'w-full'} bg-white dark:bg-[#1e293b] rounded-xl p-4 border border-gray-100 dark:border-white/10 shadow-md transition-all duration-500`}>
                                            <div className="flex items-center justify-between mb-3">
                                                <div className="flex items-center gap-2">
                                                    <FileText size={14} className="text-emerald-500" />
                                                    <span className="text-[9px] uppercase tracking-widest text-gray-500 font-bold">{selectedCountry === 'br' ? 'Manual Verification' : 'Academic Verification'}</span>
                                                </div>
                                                {selectedCountry !== 'br' && (
                                                    <div className="flex items-center gap-1 opacity-50">
                                                        <Globe size={12} className="text-gray-400" /><span className="text-[8px] uppercase font-bold text-gray-400">Global Student</span>
                                                    </div>
                                                )}
                                            </div>
                                            <div {...getVerifProps()} className={`w-full border-2 border-dashed rounded-lg p-3 flex flex-col items-center justify-center cursor-pointer transition-colors ${verificationDoc ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/10' : 'border-gray-300 dark:border-white/20 hover:border-emerald-400 dark:hover:border-emerald-500'}`}>
                                                <input {...getVerifInput()} />
                                                {verificationDoc ? (
                                                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase">Document Attached</span>
                                                ) : (
                                                    <>
                                                        <Upload size={16} className="text-gray-400 mb-1" />
                                                        <span className="text-[9px] font-bold text-gray-500 dark:text-gray-400 uppercase text-center">Upload {normalizedRole === 'student' ? 'Student ID' : 'Faculty ID'}</span>
                                                    </>
                                                )}
                                            </div>
                                        </motion.div>

                                        {selectedCountry === 'br' && (
                                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                                                <div className="flex items-center w-full px-2 mb-6">
                                                    <div className="flex-1 border-t border-gray-200 dark:border-white/10"></div>
                                                    <span className="px-4 text-[9px] font-bold text-gray-400 uppercase tracking-widest">OR ACCESS VIA PARTNER</span>
                                                    <div className="flex-1 border-t border-gray-200 dark:border-white/10"></div>
                                                </div>
                                                <div className="grid grid-cols-3 gap-3 w-full px-1">
                                                    {PARTNER_INSTITUTIONS.map(inst => (
                                                        <button key={inst.id} onClick={() => { setInstitution(inst.id); setVerificationDoc(null); }} className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${institution === inst.id ? 'bg-emerald-50 border-emerald-500 shadow-md dark:bg-emerald-900/20 dark:border-emerald-500' : 'bg-white border-gray-200 hover:border-emerald-300 dark:bg-[#1e293b] dark:border-white/10 dark:hover:border-emerald-500/50'}`}>
                                                            <div className="relative w-16 h-16 mb-2 bg-white rounded-lg p-2 border border-gray-100 shadow-sm flex items-center justify-center">
                                                                <Image src={inst.logo} alt={inst.name} width={48} height={48} className="object-contain" />
                                                            </div>
                                                            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-700 dark:text-gray-200">{inst.name}</span>
                                                            <span className="text-[8px] text-gray-400 mt-1 uppercase text-center leading-tight font-medium">{normalizedRole === 'student' ? 'Student' : 'Professor'}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            </motion.div>
                                        )}
                                    </div>
                                )}

                                <div className="w-full mt-4">
                                    <button onClick={handleInitialize} disabled={!isReadyToSign} className={`w-full relative group overflow-hidden font-black py-4 rounded-full transition-transform flex items-center justify-center gap-3 ${isReadyToSign ? 'text-white hover:scale-[1.02] shadow-[0_14px_34px_-12px_rgba(34,211,238,0.55)]' : 'text-white/60 cursor-not-allowed'}`} style={isReadyToSign ? { background: 'linear-gradient(135deg, rgba(124,58,237,0.95), rgba(6,182,212,0.95))' } : { background: 'rgba(120,120,140,0.22)' }}>
                                        {isReadyToSign && <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/25 to-transparent pointer-events-none" />}
                                        {isSubmitting ? (
                                            <Loader2 className="animate-spin relative z-10" size={18} />
                                        ) : isGuest ? (
                                            <ShieldCheck size={18} className="relative z-10" />
                                        ) : (
                                            <span className="relative z-10 inline-flex items-center justify-center w-6 h-6 rounded-full bg-white shrink-0"><Image src="https://authjs.dev/img/providers/google.svg" alt="G" width={16} height={16} /></span>
                                        )}
                                        <span className="relative z-10 text-xs tracking-widest uppercase">{loginButtonText}</span>
                                    </button>

                                    {/* MENSAGEM DE AVISO PARA GUESTS */}
                                    {isGuest && (
                                        <div className="mt-4 p-3 bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-500/20 rounded-xl text-center">
                                            <p className="text-[9px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest leading-relaxed">
                                                Sua conta passará por verificação pelos agentes da Zaeon. <br />
                                                Interaja nas salas e fóruns para manter seu acesso ativo.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div {...getTorsoProps()} className="relative hidden md:block border-l border-white/50 h-full overflow-hidden bg-gray-200/50 dark:bg-[#080d16] group cursor-pointer">
                            <input {...getTorsoInput()} />
                            {torsoImage ? (
                                <Image src={torsoImage} alt="Torso" fill className="object-cover transition-all duration-700 group-hover:scale-105" priority />
                            ) : (
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 dark:text-white/20 bg-gradient-to-br from-transparent to-slate-300/20 dark:to-cyan-900/10">
                                    <ImageIcon size={48} className="mb-4 opacity-50 drop-shadow-md" />
                                    <span className="text-[10px] font-black uppercase tracking-widest bg-white/50 dark:bg-black/30 px-4 py-2 rounded-full border border-white/40 dark:border-white/10 backdrop-blur-sm">Drop Cover Photo</span>
                                </div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80 pointer-events-none" />
                            <div {...getProfileProps()} className="absolute top-[15%] right-[28%] z-30 w-32 h-32 rounded-full border-2 border-blue-400 bg-blue-50/80 dark:bg-blue-900/50 backdrop-blur-md flex flex-col items-center justify-center text-center p-2 shadow-2xl group/circle cursor-pointer overflow-hidden hover:scale-105 transition-transform shrink-0 aspect-square">
                                <input {...getProfileInput()} />
                                {profileImage ? (
                                    <Image src={profileImage} alt="Profile" fill className="object-cover" />
                                ) : (
                                    <div className="flex flex-col items-center pointer-events-none">
                                        <Upload size={20} className="text-blue-500 mb-1" />
                                        <span className="text-[9px] font-bold text-blue-600 dark:text-blue-300 uppercase">Upload Face</span>
                                    </div>
                                )}
                                <div className="absolute -bottom-3 bg-blue-600 p-1.5 rounded-full shadow-lg border-2 border-white/20 pointer-events-none shrink-0"><Upload size={14} className="text-white" /></div>
                            </div>
                            <div className="absolute bottom-10 left-8 right-8 text-white z-10 pointer-events-none">
                                <div className="inline-block px-2 py-1 bg-green-500/20 border border-green-500/30 rounded text-[10px] text-green-400 font-mono mb-2 backdrop-blur-md">
                                    SYSTEM: {(studyArea || normalizedRole).toUpperCase()}_MODE
                                </div>
                                <h2 className="text-2xl font-black truncate">{name || 'Unknown Subject'}</h2>
                                <p className="text-[10px] text-gray-300 leading-relaxed font-medium">This is how your profile card will be visible for others. You can change your photos later.</p>
                            </div>
                        </div>
                    </motion.div>
                )}

                {isMinimized && (
                    <motion.div initial={{ y: 100 }} animate={{ y: 0 }} className="fixed bottom-6 right-6 z-[10000] pointer-events-auto">
                        <div onClick={() => setIsMinimized(false)} className="flex items-center gap-3 bg-gray-900/90 backdrop-blur-xl border border-white/10 p-3 pr-5 rounded-full shadow-2xl cursor-pointer hover:bg-gray-800 transition-colors border-l-4 border-l-green-500">
                            <div className="relative w-10 h-10 rounded-full overflow-hidden bg-white/5 border border-white/10 shrink-0 aspect-square">
                                {profileImage ? <Image src={profileImage} alt="U" fill className="object-cover" /> : <User size={16} className="text-white/50" />}
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[10px] uppercase font-bold text-green-400">Session Paused</span>
                                <span className="text-sm font-bold text-white">Click to Restore</span>
                            </div>
                            <Maximize2 size={16} className="text-white/30 ml-2" />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );

    return createPortal(modalContent, document.body);
};

export default ZaeonAuthModal;