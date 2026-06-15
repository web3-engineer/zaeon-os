import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import NextImage from "next/image";
import {
    IdentificationIcon,
    CalendarDaysIcon,
    AcademicCapIcon,
    BookOpenIcon,
    UserIcon,
    FingerPrintIcon,
    DocumentTextIcon,
    TrashIcon,
    XCircleIcon,
    ShieldCheckIcon,
    EnvelopeIcon,
    GlobeAmericasIcon,
    CheckBadgeIcon,
    KeyIcon
} from "@heroicons/react/24/outline";

// --- TYPES AMPLIADOS ---
interface UserRequest {
    id: string; name: string; email: string; role: string;
    course: string; age: number; gender: string; countryCode: string;
    institution: string | null; verificationDoc: string | null;
    inviteCodeUsed: string | null;
    kycStatus: string; academicLevel: string; submittedAt: string;
    deepThinkEnabled?: boolean;
}

const ACADEMIC_LEVELS = ["Graduação", "Mestrado", "Doutorado", "Pós-Doutorado"];

const DetailBoard = ({ title, value, icon: Icon, isActive }: any) => (
    <div className={`p-5 rounded-[24px] border transition-all duration-300 ${isActive ? 'bg-cyan-500/10 border-cyan-400' : 'bg-white/40 dark:bg-white/5 border-slate-100 dark:border-white/10'}`}>
        <div className="flex items-center gap-3 mb-2">
            <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-500' : 'text-slate-400'}`} />
            <h3 className="text-[9px] font-black uppercase tracking-widest text-slate-400">{title}</h3>
        </div>
        <p className={`text-sm font-bold truncate ${isActive ? 'text-cyan-600 dark:text-cyan-400' : 'text-slate-800 dark:text-white'}`}>{value}</p>
    </div>
);

interface InviteCodeRow {
  id: string;
  code: string;
  usedCount: number;
  maxUses: number;
  ownerName: string;
}

function InviteCodesPanel() {
  const [open, setOpen] = useState(false);
  const [codes, setCodes] = useState<InviteCodeRow[]>([]);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const fetchCodes = async () => {
    const res = await fetch("/api/admin/convites");
    if (res.ok) setCodes(await res.json());
  };

  const generate = async (quantidade: number) => {
    setGenerating(true);
    try {
      await fetch("/api/admin/convites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantidade }),
      });
      await fetchCodes();
    } finally {
      setGenerating(false);
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(code);
    setTimeout(() => setCopied(null), 2000);
  };

  const toggle = () => {
    if (!open) fetchCodes();
    setOpen((v) => !v);
  };

  return (
    <div className="mb-4">
      <button
        onClick={toggle}
        className="w-full flex items-center justify-between px-5 py-3 bg-white/40 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-[20px] hover:border-cyan-500/30 transition-all"
      >
        <div className="flex items-center gap-3">
          <KeyIcon className="w-4 h-4 text-cyan-500" />
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-white/60">
            Invite Codes
          </span>
          {codes.length > 0 && (
            <span className="text-[9px] bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 px-2 py-0.5 rounded-full font-bold">
              {codes.length}
            </span>
          )}
        </div>
        <span className="text-white/30 text-xs">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-2 bg-white/40 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-[20px] p-4 space-y-3"
        >
          <div className="flex gap-2">
            {[1, 5, 10].map((n) => (
              <button
                key={n}
                onClick={() => generate(n)}
                disabled={generating}
                className="flex-1 py-2 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 text-[10px] font-black uppercase tracking-wider hover:bg-cyan-500 hover:text-black transition-all disabled:opacity-40"
              >
                {generating ? "…" : `Gerar ${n}`}
              </button>
            ))}
          </div>

          <div className="space-y-1.5 max-h-52 overflow-y-auto custom-scrollbar">
            {codes.map((c) => (
              <div
                key={c.id}
                className={`flex items-center justify-between px-3 py-2 rounded-xl border ${
                  c.usedCount >= c.maxUses
                    ? "opacity-40 border-transparent bg-white/5"
                    : "border-white/5 bg-black/10 dark:bg-white/5"
                }`}
              >
                <div>
                  <span className="font-mono text-sm font-bold text-white tracking-wider">
                    {c.code}
                  </span>
                  <span className="ml-3 text-[10px] text-slate-400">
                    {c.usedCount}/{c.maxUses} · {c.ownerName}
                  </span>
                </div>
                {c.usedCount < c.maxUses && (
                  <button
                    onClick={() => copyCode(c.code)}
                    className="text-[9px] font-black uppercase tracking-wider text-cyan-500 hover:text-cyan-400 transition-colors"
                  >
                    {copied === c.code ? "✓" : "Copiar"}
                  </button>
                )}
              </div>
            ))}
            {codes.length === 0 && (
              <p className="text-center text-[11px] text-white/20 py-3">
                Nenhum código gerado ainda.
              </p>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}

export default function ProfileModule({ glassPanel }: { glassPanel: string }) {
    const [requests, setRequests] = useState<UserRequest[]>([]);
    const [selectedReq, setSelectedReq] = useState<UserRequest | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    
    // Estado para controle do nível acadêmico selecionado pelo Admin
    const [promotionLevel, setPromotionLevel] = useState("Graduação");

    const fetchQueue = async () => { 
        setIsLoading(true);
        try {
            const res = await fetch(`/api/admin?t=${Date.now()}`, { cache: 'no-store' }); 
            if (res.ok) setRequests(await res.json()); 
        } catch (e) { console.error("Erro ao carregar Nodes:", e); }
        finally { setIsLoading(false); }
    };

    useEffect(() => { fetchQueue(); }, []);

    // Sincroniza o nível quando o admin clica em um usuário diferente
    useEffect(() => {
        if (selectedReq) setPromotionLevel(selectedReq.academicLevel || "Graduação");
    }, [selectedReq]);

    const handleAction = async (type: 'approve' | 'reject' | 'purge') => {
        if (!selectedReq) return;

        const confirmMsgs = {
            approve: `Autorizar acesso e promover ${selectedReq.name} para o nível ${promotionLevel}?`,
            reject: `Reprovar credenciais de ${selectedReq.name}?`,
            purge: `⚠️ ATENÇÃO: Desintegrar permanentemente todos os dados de ${selectedReq.email}?`
        };

        if (!confirm(confirmMsgs[type])) return;

        try {
            const method = type === 'purge' ? 'DELETE' : 'PATCH';
            const endpoint = `/api/admin${type === 'purge' ? `?id=${selectedReq.id}` : ''}`;
            
            const res = await fetch(endpoint, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: type !== 'purge' ? JSON.stringify({ 
                    userId: selectedReq.id, 
                    status: type === 'approve' ? 'verified' : 'rejected',
                    academicLevel: type === 'approve' ? promotionLevel : undefined
                }) : null
            });

            if (res.ok) {
                alert(`Protocolo executado com sucesso.`);
                setSelectedReq(null);
                await fetchQueue();
            } else {
                const err = await res.json();
                alert(`Erro: ${err.error}`);
            }
        } catch (e) { alert("Falha na comunicação com o Neural Core."); }
    };

    // Modo econômico: liga/desliga o pensamento profundo (Gemini Pro) para este usuário.
    const toggleDeepThink = async () => {
        if (!selectedReq) return;
        const next = !selectedReq.deepThinkEnabled;
        try {
            const res = await fetch('/api/admin', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: selectedReq.id, deepThinkEnabled: next }),
            });
            if (res.ok) {
                setSelectedReq({ ...selectedReq, deepThinkEnabled: next });
                setRequests((prev) => prev.map((r) => (r.id === selectedReq.id ? { ...r, deepThinkEnabled: next } : r)));
            } else { alert('Não consegui atualizar o modo de IA.'); }
        } catch { alert('Falha na comunicação com o Neural Core.'); }
    };

    return (
        <div className="flex-1 flex gap-8 overflow-hidden w-full h-full">
            
            {/* LISTA LATERAL */}
            <div className={`w-[380px] rounded-[45px] flex flex-col overflow-hidden ${glassPanel}`}>
                <div className="px-6 pt-6">
                  <InviteCodesPanel />
                </div>
                <div className="p-8 border-b border-slate-200 dark:border-white/10 flex justify-between items-center">
                    <h2 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">Node Queue</h2>
                    <span className="text-[10px] font-bold bg-cyan-500 text-black px-3 py-1 rounded-full">{requests.length}</span>
                </div>
                <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                    {requests.map((req) => (
                        <div key={req.id} onClick={() => setSelectedReq(req)} className={`p-6 rounded-[28px] transition-all border cursor-pointer group ${selectedReq?.id === req.id ? 'bg-cyan-500 border-cyan-400 text-black shadow-2xl scale-[1.02]' : 'bg-white/40 dark:bg-white/5 border-transparent hover:border-cyan-500/30'}`}>
                            <div className="flex justify-between items-start mb-1">
                                <h3 className="text-sm font-bold truncate pr-4">{req.name}</h3>
                                <span className="text-[14px]">{req.countryCode === 'br' ? '🇧🇷' : req.countryCode === 'cn' ? '🇨🇳' : '🇺🇸'}</span>
                            </div>
                            <p className="text-[10px] opacity-60 font-medium font-mono uppercase tracking-wider">{req.role}</p>
                            <div className={`mt-3 text-[8px] font-black uppercase tracking-[0.2em] inline-block px-2 py-1 rounded ${req.kycStatus === 'verified' ? 'bg-green-500/20 text-green-600' : req.kycStatus === 'rejected' ? 'bg-red-500/20 text-red-600' : 'bg-amber-500/20 text-amber-600'}`}>
                                {req.kycStatus}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* PAINEL DE INSPEÇÃO */}
            <div className={`flex-1 rounded-[45px] p-10 overflow-y-auto relative custom-scrollbar ${glassPanel}`}>
                <AnimatePresence mode="wait">
                    {selectedReq ? (
                        <motion.div key={selectedReq.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-8">
                            
                            <div className="flex justify-between items-start">
                                <div>
                                    <h1 className="text-4xl font-black tracking-tighter text-slate-800 dark:text-white uppercase">{selectedReq.name}</h1>
                                    <p className="text-slate-400 font-mono text-sm mt-1">{selectedReq.email}</p>
                                </div>
                                <button onClick={() => window.location.href = `mailto:${selectedReq.email}`} className="flex items-center gap-2 px-6 py-3 bg-white/50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl hover:bg-cyan-500 hover:text-black transition-all font-bold uppercase text-[10px] tracking-widest shadow-sm">
                                    <EnvelopeIcon className="w-4 h-4" /> Comms Link
                                </button>
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <DetailBoard title="Knowledge Base" value={selectedReq.course} icon={BookOpenIcon} isActive={true} />
                                <DetailBoard title="Current Level" value={selectedReq.academicLevel || "Graduação"} icon={AcademicCapIcon} isActive={false} />
                                <DetailBoard title="Bio Age" value={`${selectedReq.age} Cycles`} icon={FingerPrintIcon} isActive={false} />
                                <DetailBoard title="Gender" value={selectedReq.gender} icon={UserIcon} isActive={false} />
                                <DetailBoard title="Institution" value={selectedReq.institution?.toUpperCase() || "Manual Entry"} icon={GlobeAmericasIcon} isActive={false} />
                                <DetailBoard title="Registry Date" value={new Date(selectedReq.submittedAt).toLocaleDateString()} icon={CalendarDaysIcon} isActive={false} />
                                <DetailBoard title="Via Convite" value={selectedReq.inviteCodeUsed || "—"} icon={KeyIcon} isActive={false} />
                            </div>

                            {/* MODO ECONÔMICO — pensamento profundo (Gemini Pro) por usuário */}
                            <div className="flex items-center justify-between gap-4 bg-white/50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-[28px] px-6 py-5">
                                <div className="min-w-0">
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Pensamento Profundo (IA)</p>
                                    <p className="text-sm font-bold text-slate-800 dark:text-white mt-1">{selectedReq.deepThinkEnabled ? "Liberado para este usuário" : "Bloqueado (modo econômico)"}</p>
                                    <p className="text-[11px] text-slate-400 mt-0.5">Por padrão usuários comuns não usam deep thinking, pra economizar créditos.</p>
                                </div>
                                <button
                                    onClick={toggleDeepThink}
                                    role="switch"
                                    aria-checked={!!selectedReq.deepThinkEnabled}
                                    className={`relative shrink-0 w-14 h-8 rounded-full transition-colors ${selectedReq.deepThinkEnabled ? "bg-cyan-500" : "bg-slate-300 dark:bg-white/15"}`}
                                    title={selectedReq.deepThinkEnabled ? "Desativar" : "Ativar"}
                                >
                                    <span className={`absolute top-1 left-1 w-6 h-6 rounded-full bg-white shadow transition-transform ${selectedReq.deepThinkEnabled ? "translate-x-6" : ""}`} />
                                </button>
                            </div>

                            {/* VISUALIZADOR DE DOCUMENTO (IMAGEM OU PDF) */}
                            <div className="bg-black/5 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-[35px] p-6 min-h-[400px] flex flex-col items-center justify-center relative overflow-hidden">
                                {selectedReq.verificationDoc ? (
                                    selectedReq.verificationDoc.includes("pdf") ? (
                                        <div className="w-full h-[600px] rounded-2xl overflow-hidden shadow-2xl">
                                            <iframe src={`${selectedReq.verificationDoc}#toolbar=0`} className="w-full h-full border-none" title="Registry View" />
                                        </div>
                                    ) : (
                                        <NextImage src={selectedReq.verificationDoc} alt="Registry" width={600} height={500} className="max-h-[500px] rounded-2xl shadow-2xl object-contain" />
                                    )
                                ) : (
                                    <div className="text-center opacity-30">
                                        <ShieldCheckIcon className="w-20 h-20 mx-auto mb-4" />
                                        <p className="text-xs font-black uppercase tracking-widest">Verified via Partner Fast-Track</p>
                                    </div>
                                )}
                            </div>

                            {/* PAINEL DE CONTROLE DE ACESSO */}
                            <div className="bg-white/50 dark:bg-white/5 p-8 rounded-[40px] border border-slate-200 dark:border-white/10 space-y-8">
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 ml-2">
                                        <CheckBadgeIcon className="w-4 h-4 text-cyan-500" />
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Promote Academic Rank</label>
                                    </div>
                                    <div className="grid grid-cols-4 gap-3">
                                        {ACADEMIC_LEVELS.map(level => (
                                            <button 
                                                key={level} 
                                                onClick={() => setPromotionLevel(level)}
                                                className={`py-4 rounded-2xl text-[10px] font-black uppercase transition-all border ${promotionLevel === level ? 'bg-cyan-500 text-black border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.4)]' : 'bg-slate-100 dark:bg-white/5 border-transparent text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10'}`}
                                            >
                                                {level}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-4">
                                    <button onClick={() => handleAction('purge')} className="flex flex-col items-center justify-center gap-2 bg-red-500/10 text-red-500 py-6 rounded-[30px] hover:bg-red-600 hover:text-white transition-all group">
                                        <TrashIcon className="w-6 h-6 group-hover:scale-110 transition-transform" />
                                        <span className="text-[9px] font-black uppercase tracking-widest">Purge Node</span>
                                    </button>
                                    <button onClick={() => handleAction('reject')} className="flex flex-col items-center justify-center gap-2 bg-amber-500/10 text-amber-600 py-6 rounded-[30px] hover:bg-amber-600 hover:text-white transition-all group">
                                        <XCircleIcon className="w-6 h-6 group-hover:scale-110 transition-transform" />
                                        <span className="text-[9px] font-black uppercase tracking-widest">Reject Node</span>
                                    </button>
                                    <button onClick={() => handleAction('approve')} className="flex flex-col items-center justify-center gap-2 bg-cyan-500 text-black py-6 rounded-[30px] hover:bg-cyan-400 shadow-2xl transition-all group">
                                        <ShieldCheckIcon className="w-6 h-6 group-hover:scale-110 transition-transform" />
                                        <div className="flex flex-col items-center">
                                            <span className="text-[10px] font-black uppercase tracking-widest leading-none">Mint Access</span>
                                            <span className="text-[7px] font-bold opacity-60 uppercase mt-1">Level: {promotionLevel}</span>
                                        </div>
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center opacity-10">
                            <IdentificationIcon className="w-24 h-24 mb-6" />
                            <h2 className="text-2xl font-black uppercase tracking-[0.5em] text-center">Select Node</h2>
                        </div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}