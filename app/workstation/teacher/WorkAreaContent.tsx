"use client";

import { avisar, copiarComAviso, tr } from "@/lib/ui/avisos";
import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import {
    Users, FileText, CheckCircle, MessageSquare, Link as LinkIcon, UploadCloud,
    Sparkles, ArrowRight, Loader2, Trash2, ExternalLink, Printer, Plus, RefreshCw, Save, Send, Edit2, X, Copy
} from "lucide-react";

type StudentRecord = { id: string; name: string | null; image: string | null; course: string | null; };

export default function WorkAreaContent() {
    const { data: session } = useSession();
    const [greeting, setGreeting] = useState("");
    const [activeTab, setActiveTab] = useState<'alunos' | 'tarefas' | 'provas' | null>(null);

    // Alunos
    const [myStudents, setMyStudents] = useState<StudentRecord[]>([]);
    const [isLoadingStudents, setIsLoadingStudents] = useState(false);
    const [removingId, setRemovingId] = useState<string | null>(null);

    // Links Ativos
    const [myLinks, setMyLinks] = useState<any[]>([]);
    const [isLoadingLinks, setIsLoadingLinks] = useState(false);

    // Document Generation (Tarefas & Provas)
    const [docPrompt, setDocPrompt] = useState("");
    const [docContext, setDocContext] = useState("");
    const [isGeneratingDoc, setIsGeneratingDoc] = useState(false);

    // Invite Link Generation (Novo)
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [inviteSubject, setInviteSubject] = useState("");
    const [inviteRoom, setInviteRoom] = useState("cyber");
    const [inviteLocation, setInviteLocation] = useState("");
    const [inviteHour, setInviteHour] = useState("");
    const [inviteEndHour, setInviteEndHour] = useState("");
    const [inviteDays, setInviteDays] = useState<number[]>([]);
    const [generatedLink, setGeneratedLink] = useState<string | null>(null);
    const [isGeneratingLink, setIsGeneratingLink] = useState(false);
    const [activeDocument, setActiveDocument] = useState<any>(null); // null = show prompt/list
    const [regeneratingQuestionId, setRegeneratingQuestionId] = useState<number | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [myDocuments, setMyDocuments] = useState<any[]>([]);

    useEffect(() => {
        const hours = new Date().getHours();
        setGreeting(hours < 5 ? "Boa madrugada" : hours < 12 ? "Bom dia" : hours < 18 ? "Boa tarde" : "Boa noite");
    }, []);

    const userName = session?.user?.name?.split(" ")[0] || "Professor";
    const userGender = (session?.user as any)?.gender === 'male' ? 'male' : 'female';
    const cardColor = userGender === 'male' ? "from-sky-200 to-blue-300" : "from-pink-200 to-rose-300";

    const greetingEmoji = greeting === "Boa madrugada" ? "🍷" 
        : greeting === "Boa noite" ? "🌙" 
        : (userGender === "male" ? "☀️" : "🌸");

    const fetchMyStudents = useCallback(async () => {
        setIsLoadingStudents(true);
        try {
            const res = await fetch(`/api/teacher/students?t=${Date.now()}`);
            if (res.ok) setMyStudents(await res.json());
        } catch (error) { console.error(error); }
        finally { setIsLoadingStudents(false); }
    }, []);

    const fetchMyLinks = useCallback(async () => {
        setIsLoadingLinks(true);
        try {
            const res = await fetch(`/api/teacher/links?t=${Date.now()}`);
            if (res.ok) setMyLinks(await res.json());
        } catch (error) { console.error(error); }
        finally { setIsLoadingLinks(false); }
    }, []);

    const fetchMyDocuments = useCallback(async (type: string) => {
        try {
            const res = await fetch(`/api/teacher/documents?type=${type}&t=${Date.now()}`);
            if (res.ok) setMyDocuments(await res.json());
        } catch (error) { console.error(error); }
    }, []);

    useEffect(() => {
        if (activeTab === 'alunos') {
            fetchMyStudents();
            fetchMyLinks();
        }
        else if (activeTab === 'tarefas' || activeTab === 'provas') {
            fetchMyDocuments(activeTab);
            setActiveDocument(null);
            setDocPrompt("");
        }
    }, [activeTab, fetchMyStudents, fetchMyDocuments]);

    const handleRemoveStudent = async (studentId: string) => {
        setRemovingId(studentId);
        try {
            const res = await fetch(`/api/teacher/students?studentId=${studentId}`, { method: 'DELETE' });
            if (res.ok) setMyStudents(prev => prev.filter(s => s.id !== studentId));
        } catch (error) { console.error(error); }
        finally { setRemovingId(null); }
    };

    const handleGenerateInvite = async () => {
        if (!inviteSubject || !inviteRoom || !inviteLocation || !inviteHour || !inviteEndHour || inviteDays.length === 0) return;
        setIsGeneratingLink(true);
        try {
            const res = await fetch('/api/teacher/invite', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    subject: inviteSubject,
                    room: inviteRoom,
                    location: inviteLocation,
                    hour: parseInt(inviteHour),
                    endHour: parseInt(inviteEndHour),
                    days: inviteDays
                })
            });
            const data = await res.json();
            if (res.ok && data.inviteUrl) {
                setGeneratedLink(data.inviteUrl);
                fetchMyLinks(); // Recarrega os links após gerar um novo!
            }
        } catch (error) { console.error(error); }
        finally { setIsGeneratingLink(false); }
    };

    const toggleDay = (d: number) => {
        setInviteDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]);
    };

    const handleGenerateDocument = async () => {
        if (!docPrompt.trim() || !activeTab) return;
        setIsGeneratingDoc(true);
        try {
            const res = await fetch('/api/ai/generate-document', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: activeTab, prompt: docPrompt, context: docContext })
            });
            const data = await res.json();
            if (res.ok) {
                // Initialize new unsaved document in memory
                setActiveDocument({
                    id: 'draft',
                    title: `Nova ${activeTab === 'tarefas' ? 'Tarefa' : 'Prova'}`,
                    type: activeTab,
                    questions: data.questions,
                    context: docPrompt,
                    headerImage: null
                });
            } else {
                avisar(tr("avisos.erroDocumento", "Não deu pra gerar o documento: {{erro}}", { erro: String(data?.error ?? "") }), { tipo: "erro" });
            }
        } catch (error) { console.error(error); }
        finally { setIsGeneratingDoc(false); }
    };

    const handleRegenerateQuestion = async (qNumber: number) => {
        if (!activeDocument) return;
        setRegeneratingQuestionId(qNumber);
        try {
            const res = await fetch('/api/ai/generate-document', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: activeDocument.type,
                    prompt: activeDocument.context || docPrompt,
                    regenerateQuestion: qNumber,
                    existingQuestions: activeDocument.questions
                })
            });
            const data = await res.json();
            if (res.ok && data.questions && data.questions.length > 0) {
                const newQ = data.questions[0];
                setActiveDocument((prev: any) => ({
                    ...prev,
                    questions: prev.questions.map((q: any) => q.number === qNumber ? newQ : q)
                }));
            }
        } catch (error) { console.error(error); }
        finally { setRegeneratingQuestionId(null); }
    };

    const handleSaveDocument = async () => {
        if (!activeDocument) return;
        setIsSaving(true);
        try {
            const isDraft = activeDocument.id === 'draft';
            const url = '/api/teacher/documents';
            const method = isDraft ? 'POST' : 'PATCH';
            const body = isDraft 
                ? { title: activeDocument.title, type: activeDocument.type, questions: activeDocument.questions, headerImage: activeDocument.headerImage, context: activeDocument.context }
                : { documentId: activeDocument.id, title: activeDocument.title, questions: activeDocument.questions, headerImage: activeDocument.headerImage };

            const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
            const data = await res.json();
            if (res.ok) {
                setActiveDocument(data.document);
                fetchMyDocuments(activeDocument.type);
                avisar(tr("avisos.salvo", "Salvo!"));
            }
        } catch (error) { console.error(error); }
        finally { setIsSaving(false); }
    };

    const printDocument = () => {
        window.print();
    };

    // Imagem do cabeçalho
    const handlePasteImage = (e: React.ClipboardEvent) => {
        const items = e.clipboardData.items;
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                const blob = items[i].getAsFile();
                if (blob) {
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                        setActiveDocument((prev: any) => ({ ...prev, headerImage: ev.target?.result as string }));
                    };
                    reader.readAsDataURL(blob);
                }
            }
        }
    };

    // --- RENDERERS ---

    const renderAlunosDetail = () => (
        <div className="flex flex-col gap-6 font-sans">
            <div className="flex justify-between items-center pb-4 border-b border-black/5 dark:border-white/10">
                <div>
                    <h3 className="text-xl font-medium tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                        <Sparkles size={20} className="text-cyan-500" /> Meus Alunos
                    </h3>
                </div>
                <button 
                    onClick={() => setShowInviteModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full text-sm font-bold shadow-md transition-all"
                >
                    <LinkIcon size={16} /> Novo Link de Matrícula
                </button>
            </div>

            {/* Modal de Convite (Inline) */}
            <AnimatePresence>
                {showInviteModal && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                        <div className="p-6 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 rounded-2xl flex flex-col gap-4 relative">
                            <button onClick={() => { setShowInviteModal(false); setGeneratedLink(null); }} className="absolute top-4 right-4 text-indigo-400 hover:text-indigo-600"><X size={20}/></button>
                            <h4 className="text-lg font-bold text-indigo-900 dark:text-indigo-300">Criar Matrícula Mágica</h4>
                            
                            {!generatedLink ? (
                                <>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="flex flex-col gap-1">
                                            <label className="text-xs font-bold text-indigo-700 uppercase">Nome da Disciplina</label>
                                            <input type="text" value={inviteSubject} onChange={e => setInviteSubject(e.target.value)} placeholder="Ex: Anatomia Sistêmica I" className="px-4 py-2 rounded-xl border border-indigo-200 outline-none focus:border-indigo-500 bg-white text-slate-900" />
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <label className="text-xs font-bold text-indigo-700 uppercase">Estúdio/Módulo</label>
                                            <select value={inviteRoom} onChange={e => setInviteRoom(e.target.value)} className="px-4 py-2 rounded-xl border border-indigo-200 outline-none focus:border-indigo-500 bg-white text-slate-900">
                                                <option value="cyber">Cyber</option>
                                                <option value="med">Med (Anatomia)</option>
                                                <option value="quantic">Quantic</option>
                                                <option value="humanities">Humanities</option>
                                                <option value="lounge">Lounge / Collective</option>
                                                <option value="bio">Biology</option>
                                            </select>
                                        </div>
                                        <div className="flex flex-col gap-1 col-span-1 md:col-span-2">
                                            <label className="text-xs font-bold text-indigo-700 uppercase">Local da Aula</label>
                                            <input type="text" value={inviteLocation} onChange={e => setInviteLocation(e.target.value)} placeholder="Ex: Anfiteatro 3, Google Meet, etc." className="px-4 py-2 rounded-xl border border-indigo-200 outline-none focus:border-indigo-500 bg-white text-slate-900" />
                                        </div>
                                        <div className="flex gap-4 col-span-1 md:col-span-2">
                                            <div className="flex flex-col gap-1 flex-1">
                                                <label className="text-xs font-bold text-indigo-700 uppercase">Início (Hora ex: 8)</label>
                                                <input type="number" value={inviteHour} onChange={e => setInviteHour(e.target.value)} placeholder="Obrigatório" className="px-4 py-2 rounded-xl border border-indigo-200 outline-none focus:border-indigo-500 bg-white text-slate-900" />
                                            </div>
                                            <div className="flex flex-col gap-1 flex-1">
                                                <label className="text-xs font-bold text-indigo-700 uppercase">Fim (Hora ex: 10)</label>
                                                <input type="number" value={inviteEndHour} onChange={e => setInviteEndHour(e.target.value)} placeholder="Obrigatório" className="px-4 py-2 rounded-xl border border-indigo-200 outline-none focus:border-indigo-500 bg-white text-slate-900" />
                                            </div>
                                        </div>
                                        <div className="col-span-1 md:col-span-2 flex flex-col gap-2">
                                            <label className="text-xs font-bold text-indigo-700 uppercase">Dias da Semana</label>
                                            <div className="flex gap-2 flex-wrap">
                                                {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map((d, i) => (
                                                    <button key={d} onClick={() => toggleDay(i+1)} className={`w-8 h-8 rounded-full text-xs font-bold transition-colors ${inviteDays.includes(i+1) ? 'bg-indigo-600 text-white' : 'bg-white border border-indigo-200 text-indigo-600 hover:bg-indigo-50'}`}>
                                                        {d[0]}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                    <button onClick={handleGenerateInvite} disabled={!inviteSubject || !inviteRoom || !inviteLocation || !inviteHour || !inviteEndHour || inviteDays.length === 0 || isGeneratingLink} className="mt-2 bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50 transition-colors w-full flex items-center justify-center gap-2">
                                        {isGeneratingLink ? <Loader2 className="animate-spin" size={20} /> : <LinkIcon size={20} />} Gerar Link de Matrícula
                                    </button>
                                </>
                            ) : (
                                <div className="flex flex-col items-center gap-4 py-4">
                                    <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-2"><CheckCircle size={32} /></div>
                                    <p className="text-sm font-bold text-slate-700 dark:text-slate-300 text-center">Link gerado com sucesso! Envie para seus alunos:</p>
                                    <div className="w-full bg-white dark:bg-black/20 p-4 border border-indigo-200 dark:border-indigo-500/20 rounded-xl overflow-hidden flex items-center justify-between">
                                        <span className="font-mono text-xs text-indigo-900 dark:text-indigo-300 truncate mr-2 select-all">{generatedLink}</span>
                                        <button onClick={() => { void copiarComAviso(generatedLink, tr("avisos.copiado", "Copiado!"), tr("avisos.naoCopiou", "Não deu pra copiar.")); }} className="flex-shrink-0 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors"><Copy size={12}/> Copiar</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
            {isLoadingStudents ? (
                <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-cyan-500" /></div>
            ) : myStudents.map(student => (
                <motion.div key={student.id} className="flex items-center gap-4 p-4 bg-white/60 dark:bg-black/30 border border-black/5 dark:border-white/10 rounded-2xl">
                    <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-black overflow-hidden relative border border-slate-300 dark:border-white/20 shrink-0 aspect-square">
                        {student.image ? <Image src={student.image} alt="" fill className="object-cover" /> : <Users className="w-full h-full p-2 text-slate-400" />}
                    </div>
                    <div className="flex-1">
                        <span className="text-sm font-bold text-slate-800 dark:text-white block">{student.name}</span>
                        <span className="text-xs text-slate-500 block">{student.course || "Aluno"}</span>
                    </div>
                    <button onClick={() => handleRemoveStudent(student.id)} disabled={removingId === student.id} className="text-red-500 hover:text-red-600 disabled:opacity-50">
                        {removingId === student.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                    </button>
                </motion.div>
            ))}

            {/* Links Ativos Section */}
            <div className="mt-8 border-t border-black/5 dark:border-white/10 pt-6">
                <h4 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4">Meus Links de Matrícula Ativos</h4>
                {isLoadingLinks ? (
                    <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-cyan-500" /></div>
                ) : myLinks.length === 0 ? (
                    <div className="text-sm text-slate-400 italic">Nenhum link gerado no momento.</div>
                ) : (
                    <div className="flex flex-col gap-3">
                        {myLinks.map(link => {
                            const linkUrl = `${window.location.protocol}//${window.location.host}/join/${link.token}`;
                            return (
                                <div key={link.id} className="p-4 bg-white/60 dark:bg-black/30 border border-indigo-100 dark:border-indigo-500/20 rounded-xl flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-sm font-bold text-slate-800 dark:text-white">{link.subject}</span>
                                            <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-md uppercase">{link.room}</span>
                                        </div>
                                        <div className="text-xs text-slate-500 mb-2">
                                            {link.location} • {link.hour}h até {link.endHour}h • Dias: {link.days.join(', ')}
                                        </div>
                                        <div className="text-xs font-mono text-slate-400 truncate max-w-sm md:max-w-md bg-white/50 dark:bg-black/20 px-2 py-1 rounded">
                                            {linkUrl}
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => { void copiarComAviso(linkUrl, tr("avisos.linkCopiado", "Link copiado!"), tr("avisos.naoCopiou", "Não deu pra copiar.")); }}
                                        className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:hover:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400 rounded-lg text-xs font-bold transition-colors shadow-sm"
                                    >
                                        <Copy size={14} /> Copiar
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );

    const renderDocumentEditor = () => (
        <div className="flex flex-col gap-6 font-sans print:bg-white print:text-black print:p-0">
            {/* Editor Actions Toolbar (Hidden on Print) */}
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-4 print:hidden">
                <button onClick={() => setActiveDocument(null)} className="text-sm text-slate-500 hover:text-slate-800 dark:hover:text-white flex items-center gap-2">
                    &larr; Voltar
                </button>
                <div className="flex items-center gap-3">
                    {activeDocument.type === 'provas' && (
                        <button onClick={printDocument} className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-white/10 rounded-full hover:bg-slate-200 dark:hover:bg-white/20 transition-colors text-sm font-bold text-slate-700 dark:text-white">
                            <Printer size={16} /> Salvar PDF
                        </button>
                    )}
                    <button onClick={handleSaveDocument} disabled={isSaving} className="flex items-center gap-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-600 rounded-full text-white transition-colors text-sm font-bold shadow-md">
                        {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Salvar no Zaeon
                    </button>
                </div>
            </div>

            {/* Document Render Area */}
            <div className="bg-white dark:bg-[#1e293b] p-8 md:p-12 rounded-3xl shadow-inner border border-slate-200 dark:border-white/10 print:shadow-none print:border-none print:rounded-none">
                
                {/* Header Zone */}
                <div 
                    onPaste={handlePasteImage}
                    className="w-full min-h-[100px] border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl mb-8 flex flex-col items-center justify-center p-4 print:border-none focus-within:border-cyan-500 transition-colors relative"
                >
                    {activeDocument.headerImage ? (
                        <>
                            <Image src={activeDocument.headerImage} alt="Header" width={200} height={100} className="object-contain max-h-[120px]" />
                            <button onClick={() => setActiveDocument({ ...activeDocument, headerImage: null })} className="absolute top-2 right-2 text-red-500 hover:text-red-700 bg-white/80 rounded-full p-1 print:hidden">
                                <Trash2 size={14} />
                            </button>
                        </>
                    ) : (
                        <span className="text-slate-400 text-sm flex items-center gap-2 print:hidden"><UploadCloud size={16} /> Cole a imagem do logo (Ctrl+V)</span>
                    )}
                </div>

                {/* Title */}
                <input 
                    type="text" 
                    value={activeDocument.title}
                    onChange={(e) => setActiveDocument({ ...activeDocument, title: e.target.value })}
                    className="w-full text-3xl font-black text-center mb-8 bg-transparent outline-none text-slate-800 dark:text-white focus:border-b-2 border-cyan-500 pb-2 print:border-none"
                    placeholder="Título do Documento"
                />

                {/* Questions List */}
                <div className="flex flex-col gap-8">
                    {activeDocument.questions?.map((q: any) => (
                        <div key={q.number} className="relative group p-4 border border-transparent hover:border-slate-200 dark:hover:border-white/10 rounded-2xl transition-colors print:p-0 print:border-none print:mb-6">
                            
                            {/* Actions Floating */}
                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2 print:hidden z-10">
                                <button onClick={() => handleRegenerateQuestion(q.number)} disabled={regeneratingQuestionId === q.number} className="p-1.5 bg-cyan-100 text-cyan-600 rounded-lg hover:bg-cyan-200">
                                    {regeneratingQuestionId === q.number ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                                </button>
                                <button onClick={() => {
                                    const newQ = activeDocument.questions.filter((x: any) => x.number !== q.number);
                                    setActiveDocument({ ...activeDocument, questions: newQ });
                                }} className="p-1.5 bg-red-100 text-red-600 rounded-lg hover:bg-red-200">
                                    <Trash2 size={14} />
                                </button>
                            </div>

                            <div className="flex gap-3">
                                <span className="font-bold text-lg text-slate-800 dark:text-slate-200">{q.number}.</span>
                                <div className="flex-1 flex flex-col gap-2">
                                    <textarea 
                                        value={q.statement} 
                                        onChange={(e) => {
                                            const newQ = [...activeDocument.questions];
                                            const idx = newQ.findIndex(x => x.number === q.number);
                                            newQ[idx].statement = e.target.value;
                                            setActiveDocument({ ...activeDocument, questions: newQ });
                                        }}
                                        className="w-full bg-transparent outline-none font-medium text-slate-700 dark:text-slate-300 resize-none print:resize-none"
                                        rows={Math.max(2, q.statement.split('\n').length)}
                                    />

                                    {/* Multiple Choice Render */}
                                    {q.type === 'multiple_choice' && q.options && (
                                        <div className="flex flex-col gap-2 mt-2 ml-4">
                                            {q.options.map((opt: string, i: number) => (
                                                <div key={i} className="flex gap-2 text-slate-600 dark:text-slate-400 text-sm">
                                                    <div className="w-4 h-4 rounded-full border border-slate-400 shrink-0 mt-0.5" />
                                                    <span>{opt}</span>
                                                </div>
                                            ))}
                                            <div className="mt-2 text-xs font-bold text-emerald-600 bg-emerald-50 w-max px-2 py-1 rounded-md print:hidden">Gabarito: {q.answer}</div>
                                        </div>
                                    )}

                                    {/* Open Ended Render */}
                                    {(q.type === 'open_ended' || q.type === 'true_false') && (
                                        <div className="mt-2 pl-4 print:hidden">
                                            <div className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-2 rounded-lg border border-emerald-100">
                                                <span className="block mb-1 opacity-70">Gabarito / Modelo de Resposta:</span>
                                                {q.answer}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );

    const renderAgenteDetail = (isExam: boolean) => {
        if (activeDocument) return renderDocumentEditor();

        return (
            <div className="flex flex-col gap-6 font-sans">
                {/* Generation Form */}
                <div className="p-6 bg-white/50 dark:bg-black/20 rounded-3xl border border-white/40 dark:border-white/10 shadow-sm flex flex-col gap-4">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <Sparkles className="text-cyan-500 w-5 h-5" /> Novo Documento IA
                    </h3>
                    
                    <textarea 
                        value={docPrompt}
                        onChange={(e) => setDocPrompt(e.target.value)}
                        placeholder={`Descreva a ${isExam ? 'prova' : 'tarefa'} detalhadamente... O Gemini buscará temas na internet para você.`}
                        className="w-full bg-white dark:bg-[#0f172a] p-4 rounded-2xl outline-none text-sm text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-white/5 focus:border-cyan-500"
                        rows={3}
                    />

                    <div className="flex justify-between items-center">
                        <button className="flex items-center gap-2 text-xs text-slate-500 hover:text-cyan-500 transition-colors">
                            <LinkIcon size={14} /> Adicionar Link Referência
                        </button>
                        <button 
                            onClick={handleGenerateDocument} 
                            disabled={!docPrompt.trim() || isGeneratingDoc}
                            className="flex items-center gap-2 bg-slate-900 dark:bg-white text-white dark:text-black px-6 py-2.5 rounded-full font-bold text-sm hover:scale-105 transition-transform disabled:opacity-50"
                        >
                            {isGeneratingDoc ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                            Mandar para IA
                        </button>
                    </div>
                </div>

                {/* Existing Documents List */}
                <div className="mt-4">
                    <h4 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4">Meus Documentos de {isExam ? 'Prova' : 'Tarefa'}</h4>
                    {myDocuments.length === 0 ? (
                        <div className="text-sm text-slate-400 italic">Nenhum documento salvo ainda.</div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {myDocuments.map((doc: any) => (
                                <div key={doc.id} onClick={() => setActiveDocument(doc)} className="cursor-pointer p-4 bg-white/60 dark:bg-black/30 border border-slate-200 dark:border-white/10 rounded-2xl hover:border-cyan-500 transition-colors group">
                                    <div className="flex justify-between items-start mb-2">
                                        <h5 className="font-bold text-slate-800 dark:text-white truncate pr-4">{doc.title}</h5>
                                    </div>
                                    <div className="flex gap-2 mt-4">
                                        <span className="text-xs bg-cyan-100 text-cyan-700 px-2 py-1 rounded-md font-bold">{doc.questions?.length || 0} Questões</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="p-4 md:p-8 flex flex-col gap-8 max-w-[1200px] mx-auto w-full font-sans pb-16 print:p-0 print:max-w-none">
            {/* WIDGETS E MINI MODULOS (Hidden on Print) */}
            <div className="print:hidden flex flex-col gap-6 w-full">
                <div className="flex flex-col md:flex-row gap-6 w-full">
                    <div className={`flex-[2] rounded-[3rem] p-10 bg-gradient-to-br ${cardColor} text-slate-900 shadow-xl relative overflow-hidden flex flex-col justify-center min-h-[220px]`}>
                        <div className="absolute top-0 inset-x-0 h-32 bg-white/20 blur-[50px] -translate-y-1/2 rounded-full pointer-events-none"></div>
                        <div className="relative z-10">
                            <h1 className="text-4xl md:text-5xl font-medium tracking-tight">
                                {greeting}, <br/> <span className="font-semibold">{userName} {greetingEmoji}</span>.
                            </h1>
                        </div>
                    </div>
                </div>

                {/* TABS */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {['alunos', 'tarefas', 'provas'].map(tab => {
                        const isProvas = tab === 'provas';
                        const isAlunos = tab === 'alunos';
                        const Icon = isAlunos ? Users : isProvas ? CheckCircle : FileText;
                        return (
                            <button key={tab} onClick={() => setActiveTab(activeTab === tab ? null : tab as any)} className={`relative overflow-hidden rounded-[2.5rem] p-8 text-left transition-all duration-500 border backdrop-blur-3xl ${activeTab === tab ? 'bg-white/80 dark:bg-white/10 border-slate-300 dark:border-white/20 shadow-xl scale-[1.02]' : 'bg-white/40 dark:bg-white/5 border-white/60 dark:border-white/10 shadow-sm hover:bg-white/60'}`}>
                                <div className="w-14 h-14 rounded-full bg-white/50 dark:bg-black/20 border border-white/60 dark:border-white/10 flex items-center justify-center mb-6 shadow-sm">
                                    <Icon className="text-slate-700 dark:text-white/80" size={24} />
                                </div>
                                <h3 className="text-2xl font-semibold capitalize tracking-tight mb-2 text-slate-900 dark:text-white/90">{tab}</h3>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* EXPANSÃO */}
            <AnimatePresence mode="wait">
                {activeTab && (
                    <motion.div key="detalhamento" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden print:overflow-visible">
                        <div className="p-8 md:p-10 rounded-[3rem] bg-white/60 dark:bg-white/5 backdrop-blur-3xl border border-white/60 dark:border-white/10 shadow-2xl relative mt-2 print:p-0 print:border-none print:shadow-none print:bg-white print:rounded-none">
                            <div className="relative z-10">
                                {activeTab === 'alunos' && renderAlunosDetail()}
                                {activeTab === 'tarefas' && renderAgenteDetail(false)}
                                {activeTab === 'provas' && renderAgenteDetail(true)}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}