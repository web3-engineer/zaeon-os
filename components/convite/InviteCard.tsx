"use client";

/**
 * InviteCard — cartão de aceite do convite ("seu diploma não precisa te deixar louco").
 *
 * Coleta os dados no próprio cartão (rápido), com IA opcional. Responsivo:
 * HORIZONTAL no desktop (duas colunas), VERTICAL no celular. Paleta da Zaeon
 * (azul→ciano), animações leves. Respeita modo claro/escuro.
 *
 * Curso = lista controlada (ALL_COURSES, autocomplete). E-mail acadêmico é só
 * COLETADO aqui; a verificação do status de estudante (mês grátis) acontece depois.
 */

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "next-themes";
import {
  Sparkles, GraduationCap, Search, Check, Loader2, Upload, FileText,
  ArrowRight, Building2, ChevronRight, BadgeCheck, ShieldCheck,
} from "lucide-react";
import {
  BRAZILIAN_UNIVERSITIES, UNIVERSITY_KIND_LABEL, type BrazilianUniversity,
} from "@/constants/universities";
import { ALL_COURSES } from "@/constants/courses";

interface Props {
  initialCode?: string;
  onDone: (sessionToken: string) => void;
}

type Phase = "code" | "data";
type Role = "student" | "teacher";

export default function InviteCard({ initialCode = "", onDone }: Props) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const dark = !mounted || resolvedTheme !== "light";

  const [phase, setPhase] = useState<Phase>(initialCode ? "data" : "code");
  const [code, setCode] = useState(initialCode);
  const [sessionToken, setSessionToken] = useState("");
  const [inviteCode, setInviteCode] = useState(initialCode);
  const [inviterName, setInviterName] = useState<string | null>(null);
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // dados do cadastro
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [area, setArea] = useState("");
  const [courseOpen, setCourseOpen] = useState(false);
  const [role, setRole] = useState<Role>("student");
  const [gender, setGender] = useState<"f" | "m" | "">(""); // obrigatório → define o card de boas-vindas
  const [uni, setUni] = useState<BrazilianUniversity | null>(null);
  const [saving, setSaving] = useState(false);

  // Comprovação de estudante (Plus grátis): conta Google de estudante OU comprovante.
  const [proof, setProof] = useState<"google" | "doc">("google");
  const [doc, setDoc] = useState<string | null>(null);
  const [docName, setDocName] = useState("");
  const [docErr, setDocErr] = useState<string | null>(null);

  const onFile = (file: File | undefined) => {
    setDocErr(null);
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) { setDocErr("Arquivo muito grande (máx. 4MB)."); return; }
    const r = new FileReader();
    r.onload = () => { setDoc(String(r.result)); setDocName(file.name); };
    r.onerror = () => setDocErr("Não consegui ler o arquivo.");
    r.readAsDataURL(file);
  };

  // seletor de universidade
  const [pickerOpen, setPickerOpen] = useState(false);
  const [query, setQuery] = useState("");

  // ── validação do código ─────────────────────────────────────────────────────
  const validate = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError(null); setValidating(true);
    try {
      const res = await fetch("/api/convite/validar", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error ?? "Código inválido."); return; }
      setSessionToken(data.sessionToken); setInviteCode(data.inviteCode || code);
      setInviterName(data.inviterName ?? null);
      try { localStorage.setItem("zaeon.inviteAccessed", "1"); } catch { /* ignore */ }
      setPhase("data");
    } catch { setError("Erro de conexão. Tente novamente."); }
    finally { setValidating(false); }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (initialCode) void validate(); }, []);

  // ── curso (lista controlada) ────────────────────────────────────────────────
  const courseMatches = useMemo(() => {
    const q = area.trim().toLowerCase();
    if (!q) return ALL_COURSES.slice(0, 8);
    const m = ALL_COURSES.filter((c) => c.toLowerCase().includes(q));
    if (m.length === 1 && m[0].toLowerCase() === q) return [];
    return m.slice(0, 8);
  }, [area]);
  const courseValid = ALL_COURSES.some((c) => c.toLowerCase() === area.trim().toLowerCase());

  const filteredUnis = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return BRAZILIAN_UNIVERSITIES.slice(0, 60);
    return BRAZILIAN_UNIVERSITIES.filter((u) =>
      u.acronym.toLowerCase().includes(q) || u.name.toLowerCase().includes(q) ||
      u.state.toLowerCase().includes(q) || u.city.toLowerCase().includes(q),
    ).slice(0, 60);
  }, [query]);

  // ── aceitar convite ─────────────────────────────────────────────────────────
  const accept = async () => {
    setError(null);
    if (!name.trim() || !age || !uni) { setError("Preencha nome, idade e a sua instituição."); return; }
    if (!gender) { setError("Escolha como prefere ser tratado(a)."); return; }
    if (!courseValid) { setError("Escolha o seu curso na lista."); return; }
    if (proof === "doc" && !doc) { setError("Anexe seu comprovante de matrícula, ou escolha entrar com a conta de estudante."); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/convite/salvar-pendente", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionToken, inviteCode, name, age: Number(age), area, role, institution: uni.name, gender, verificationDoc: doc ?? undefined }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setError(d.error || "Não foi possível salvar seus dados."); return; }
      // Ponte p/ a página de boas-vindas (gendered) — sobrevive ao redirect do Google OAuth.
      try {
        localStorage.setItem("zaeon.gender", gender);
        localStorage.setItem("zaeon.firstName", name.trim().split(/\s+/)[0] || "");
      } catch { /* ignore */ }
      onDone(sessionToken);
    } catch { setError("Erro de conexão."); }
    finally { setSaving(false); }
  };

  // ── tokens de tema (azul/ciano Zaeon, menos roxo) ───────────────────────────
  const GRAD = "linear-gradient(135deg,#0ea5e9,#22d3ee)";      // sky → cyan
  const pageBg = dark ? "#030014" : "#f8fafc";
  const cardBg = dark ? "rgba(13,12,26,0.72)" : "rgba(255,255,255,0.98)";
  const cardBorder = dark ? "1px solid rgba(255,255,255,0.12)" : "1px solid rgba(15,23,42,0.12)";
  const heroBg = dark
    ? "linear-gradient(150deg, rgba(14,165,233,0.24), rgba(6,182,212,0.16))"
    : "linear-gradient(150deg, rgba(14,165,233,0.12), rgba(6,182,212,0.06))";

  const fieldCls =
    "w-full rounded-2xl px-4 py-3 text-sm transition-colors focus:outline-none " +
    "bg-slate-100 text-slate-900 placeholder:text-slate-400 border border-slate-200 focus:border-cyan-500/60 " +
    "dark:bg-white/5 dark:text-white dark:placeholder:text-white/30 dark:border-white/12 dark:focus:border-cyan-400/50";

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 relative overflow-hidden" style={{ background: pageBg }}>
      <div className="pointer-events-none absolute -top-32 -left-32 w-[420px] h-[420px] rounded-full blur-3xl"
        style={{ background: "radial-gradient(circle, rgba(14,165,233,0.22), transparent 70%)" }} />
      <div className="pointer-events-none absolute -bottom-32 -right-32 w-[420px] h-[420px] rounded-full blur-3xl"
        style={{ background: "radial-gradient(circle, rgba(34,211,238,0.18), transparent 70%)" }} />

      <motion.div
        initial={{ opacity: 0, y: 26, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative w-full max-w-4xl rounded-[28px] overflow-hidden flex flex-col lg:flex-row"
        style={{
          background: cardBg, border: cardBorder,
          backdropFilter: "blur(28px) saturate(160%)", WebkitBackdropFilter: "blur(28px) saturate(160%)",
          boxShadow: dark ? "0 40px 120px -40px rgba(14,165,233,0.45), inset 0 1px 0 rgba(255,255,255,0.08)"
            : "0 30px 80px -40px rgba(14,165,233,0.35)",
        }}
      >
        {/* ── HERO ── */}
        <div className="relative lg:w-[42%] p-7 sm:p-8 flex flex-col justify-between overflow-hidden" style={{ background: heroBg }}>
          <motion.div aria-hidden className="pointer-events-none absolute inset-0"
            initial={{ x: "-120%" }} animate={{ x: "120%" }} transition={{ repeat: Infinity, duration: 4.5, ease: "easeInOut" }}
            style={{ background: "linear-gradient(75deg, transparent 40%, rgba(255,255,255,0.10) 50%, transparent 60%)" }} />
          <div className="relative">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-[0.25em] text-white" style={{ background: GRAD }}>
              <Sparkles size={11} /> {inviterName ? `Convite de ${inviterName}` : "Convite"}
            </span>
            <h1 className="mt-5 text-3xl sm:text-[2.6rem] font-black tracking-tighter leading-[1.02] text-slate-900 dark:text-white">
              Seu diploma não<br />precisa te deixar<br />
              <span style={{ background: GRAD, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>louco.</span>
            </h1>
            <p className="mt-3 text-[13px] leading-relaxed max-w-xs text-slate-600 dark:text-white/70">
              Entre na <span className="text-cyan-600 dark:text-cyan-300 font-bold">Zaeon</span> — a comunidade de
              pesquisa que mais cresce no mundo.{" "}
              {inviterName
                ? <>Você foi convidado(a) por <span className="font-bold text-slate-900 dark:text-white">{inviterName}</span>.</>
                : "Preencha seus dados e comece em segundos."}
            </p>
          </div>
          <div className="relative mt-6 flex items-center gap-2 text-[11px] text-slate-600 dark:text-white/75">
            <motion.span animate={{ scale: [1, 1.15, 1] }} transition={{ repeat: Infinity, duration: 2 }}
              className="inline-flex items-center justify-center w-7 h-7 rounded-full shrink-0"
              style={{ background: "rgba(34,211,238,0.18)", border: "1px solid rgba(34,211,238,0.4)" }}>
              <GraduationCap size={14} className="text-cyan-600 dark:text-cyan-300" />
            </motion.span>
            <span>Estudante de instituição pública? <span className="text-cyan-600 dark:text-cyan-300 font-bold">1 mês grátis</span> após confirmarmos seu vínculo.</span>
          </div>
        </div>

        {/* ── FORM ── */}
        <div className="lg:w-[58%] p-6 sm:p-8">
          <AnimatePresence mode="wait">
            {phase === "code" ? (
              <motion.form key="code" onSubmit={validate} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="h-full flex flex-col justify-center gap-4">
                <div>
                  <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">Seu código de convite</h2>
                  <p className="text-[12px] mt-1 text-slate-500 dark:text-white/45">Digite o código que você recebeu para começar.</p>
                </div>
                <input autoFocus value={code} maxLength={9} onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="XXXX-XXXX"
                  className="w-full rounded-2xl px-5 py-4 text-center text-xl font-mono tracking-[0.3em] focus:outline-none bg-slate-100 text-slate-900 placeholder:text-slate-400 border border-slate-200 focus:border-cyan-500/60 dark:bg-white/5 dark:text-white dark:placeholder:text-white/20 dark:border-white/12 dark:focus:border-cyan-400/60" />
                {error && <p className="text-[12px] text-rose-600 dark:text-rose-400 text-center">{error}</p>}
                <button type="submit" disabled={validating || code.length < 9}
                  className="w-full py-3.5 rounded-2xl text-white font-black uppercase tracking-widest text-[12px] disabled:opacity-40 transition-transform hover:scale-[1.02]" style={{ background: GRAD }}>
                  {validating ? <Loader2 size={15} className="inline animate-spin" /> : "Validar convite"}
                </button>
              </motion.form>
            ) : (
              <motion.div key="data" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="flex flex-col gap-3.5">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">Seus dados</h2>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-300">
                    <BadgeCheck size={12} /> convite válido
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2.5">
                  <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome completo" className={`${fieldCls} col-span-2`} />
                  <input value={age} onChange={(e) => setAge(e.target.value.replace(/\D/g, "").slice(0, 2))} placeholder="Idade" inputMode="numeric" className={fieldCls} />
                </div>

                {/* curso — lista controlada (autocomplete) */}
                <div className="relative">
                  <input value={area}
                    onChange={(e) => { setArea(e.target.value); setCourseOpen(true); }}
                    onFocus={() => setCourseOpen(true)}
                    onBlur={() => setTimeout(() => setCourseOpen(false), 120)}
                    placeholder="Comece a digitar seu curso…" className={fieldCls} autoComplete="off" />
                  {courseValid && <Check size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500 dark:text-emerald-300" />}
                  <AnimatePresence>
                    {courseOpen && courseMatches.length > 0 && (
                      <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        className="absolute z-20 mt-1 w-full rounded-2xl overflow-hidden border shadow-xl bg-white border-slate-200 dark:bg-[#0c0b1a] dark:border-white/10">
                        <div className="max-h-44 overflow-y-auto custom-scrollbar py-1">
                          {courseMatches.map((c) => (
                            <button key={c} type="button" onMouseDown={(e) => e.preventDefault()}
                              onClick={() => { setArea(c); setCourseOpen(false); }}
                              className="w-full text-left px-4 py-2 text-[13px] text-slate-700 dark:text-slate-200 hover:bg-cyan-500/10">
                              {c}
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  {area.trim() && !courseValid && !courseOpen && (
                    <p className="mt-1 text-[10px] text-amber-600 dark:text-amber-400">Escolha uma opção da lista.</p>
                  )}
                </div>

                {/* papel */}
                <div className="flex gap-2">
                  {([["student", "Estudante"], ["teacher", "Professor(a)"]] as const).map(([v, label]) => (
                    <button key={v} type="button" onClick={() => setRole(v)}
                      className={`flex-1 py-2.5 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all border ${
                        role === v ? "text-white border-transparent"
                          : "text-slate-500 dark:text-white/50 bg-slate-100 dark:bg-white/[0.04] border-slate-200 dark:border-white/10"}`}
                      style={role === v ? { background: GRAD } : undefined}>
                      {label}
                    </button>
                  ))}
                </div>

                {/* tratamento (gênero) — define o card de boas-vindas (pronome + estilo). Glow obrigatório. */}
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-white/45 mb-1.5 pl-1">Como prefere ser tratado(a)?</p>
                  <div className="grid grid-cols-2 gap-2.5">
                    {([["f", "♀", "Feminino", "#ec4899"], ["m", "♂", "Masculino", "#3b82f6"]] as const).map(([v, sym, label, color]) => {
                      const on = gender === v;
                      return (
                        <button key={v} type="button" onClick={() => setGender(v)}
                          className={`flex items-center justify-center gap-2 py-2.5 rounded-2xl text-[12px] font-bold transition-all border ${on ? "border-transparent text-white" : "text-slate-600 dark:text-white/60 bg-slate-100 dark:bg-white/[0.04] border-slate-200 dark:border-white/10"}`}
                          style={on ? { background: v === "f" ? "linear-gradient(135deg,#ec4899,#f9a8d4)" : "linear-gradient(135deg,#3b82f6,#60a5fa)", boxShadow: `0 8px 22px -8px ${color}` } : undefined}>
                          <span style={{ color: on ? "#fff" : color, filter: `drop-shadow(0 0 5px ${color})`, fontSize: 18, lineHeight: 1 }}>{sym}</span>
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* universidade */}
                <button type="button" onClick={() => setPickerOpen((v) => !v)}
                  className="w-full flex items-center gap-3 rounded-2xl px-4 py-3 text-left transition-colors bg-slate-100 border border-slate-200 hover:border-cyan-500/50 dark:bg-white/5 dark:border-white/12 dark:hover:border-cyan-400/40">
                  {uni ? (
                    <span className="w-7 h-7 rounded-md overflow-hidden flex items-center justify-center shrink-0 bg-white border border-slate-200 dark:bg-white/10 dark:border-white/10">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={uni.logoPath} alt={uni.acronym} className="w-full h-full object-contain p-0.5"
                        onError={(e) => { (e.currentTarget as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(uni.acronym)}&background=${uni.color.replace("#", "")}&color=fff&size=64&bold=true`; }} />
                    </span>
                  ) : <Building2 size={16} className="text-cyan-600 dark:text-cyan-300 shrink-0" />}
                  {uni ? (
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-bold truncate text-slate-900 dark:text-white">{uni.acronym} · {uni.state}</span>
                      <span className="block text-[10px] truncate text-slate-500 dark:text-white/45">{uni.name}</span>
                    </span>
                  ) : <span className="flex-1 text-sm text-slate-500 dark:text-white/40">Selecione sua universidade…</span>}
                  <ChevronRight size={15} className={`text-slate-500 dark:text-white/30 transition-transform ${pickerOpen ? "rotate-90" : ""}`} />
                </button>

                <AnimatePresence>
                  {pickerOpen && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                      <div className="rounded-2xl border p-2 bg-slate-50 border-slate-200 dark:bg-black/40 dark:border-white/10">
                        <div className="relative mb-2">
                          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-white/30" />
                          <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)}
                            placeholder="Buscar sigla, nome, cidade ou estado…"
                            className="w-full rounded-xl pl-9 pr-3 py-2 text-[12px] focus:outline-none bg-white text-slate-900 placeholder:text-slate-400 border border-slate-200 focus:border-cyan-500/50 dark:bg-white/5 dark:text-white dark:placeholder:text-white/25 dark:border-white/10 dark:focus:border-cyan-400/40" />
                        </div>
                        <div className="max-h-44 overflow-y-auto custom-scrollbar grid grid-cols-1 gap-1">
                          {filteredUnis.map((u) => (
                            <button key={u.id} type="button" onClick={() => { setUni(u); setPickerOpen(false); setQuery(""); }}
                              className="flex items-center gap-2 px-2.5 py-2 rounded-xl text-left hover:bg-cyan-500/10 transition-colors">
                              <span className="w-9 h-9 rounded-lg overflow-hidden flex items-center justify-center shrink-0 bg-white border border-slate-200 dark:bg-white/10 dark:border-white/10">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={u.logoPath} alt={u.acronym} className="w-full h-full object-contain p-1"
                                  onError={(e) => { (e.currentTarget as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(u.acronym)}&background=${u.color.replace("#", "")}&color=fff&size=72&bold=true`; }} />
                              </span>
                              <span className="flex-1 min-w-0">
                                <span className="block text-[12px] font-bold truncate text-slate-900 dark:text-white">{u.acronym} · {u.state}</span>
                                <span className="block text-[9px] truncate text-slate-500 dark:text-white/40">{u.name}</span>
                              </span>
                              <span className="text-[8px] font-black uppercase text-slate-400 dark:text-white/30 shrink-0">{UNIVERSITY_KIND_LABEL[u.kind]}</span>
                            </button>
                          ))}
                          {filteredUnis.length === 0 && <p className="text-center text-slate-400 dark:text-white/30 text-[11px] py-6">Nada encontrado.</p>}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Plano Plus grátis para estudantes — via conta Google de estudante OU comprovante */}
                <div className="rounded-2xl border p-3.5 border-cyan-500/25 bg-cyan-500/[0.06]">
                  <div className="flex items-center gap-2 mb-1">
                    <Sparkles size={13} className="text-cyan-600 dark:text-cyan-300" />
                    <span className="text-[11px] font-black text-cyan-700 dark:text-cyan-200 uppercase tracking-wider">Plano Plus — grátis para estudantes</span>
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-white/50 mb-2.5">Vale para qualquer faculdade. Comprove seu vínculo de um jeito:</p>

                  <div className="grid grid-cols-2 gap-2">
                    {([["google", "Conta de estudante (Google)"], ["doc", "Enviar comprovante"]] as const).map(([v, label]) => (
                      <button key={v} type="button" onClick={() => setProof(v)}
                        className={`py-2.5 px-2 rounded-xl text-[10px] font-bold leading-tight transition-all border text-center ${proof === v ? "text-white border-transparent" : "text-slate-500 dark:text-white/55 bg-white dark:bg-white/[0.04] border-slate-200 dark:border-white/10"}`}
                        style={proof === v ? { background: GRAD } : undefined}>
                        {label}
                      </button>
                    ))}
                  </div>

                  {proof === "google" ? (
                    <p className="mt-2.5 flex items-center gap-1.5 text-[10px] text-cyan-700 dark:text-cyan-200/90 leading-snug">
                      <ShieldCheck size={12} className="shrink-0" /> No próximo passo, entre com a sua conta <b>Google de estudante</b> — o Plus é liberado.
                    </p>
                  ) : (
                    <div className="mt-2.5">
                      <label className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-dashed cursor-pointer text-[11px] font-bold transition-colors border-cyan-500/40 text-cyan-700 dark:text-cyan-200 hover:bg-cyan-500/10">
                        {doc ? <><FileText size={14} /> {docName || "comprovante anexado"}</> : <><Upload size={14} /> Anexar comprovante (PDF/imagem)</>}
                        <input type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
                      </label>
                      {docErr && <p className="mt-1 text-[10px] text-rose-500 dark:text-rose-400">{docErr}</p>}
                      <p className="mt-1 text-[10px] text-slate-500 dark:text-white/40 leading-snug">Será analisado pela equipe. Você finaliza o cadastro com o Google no próximo passo.</p>
                    </div>
                  )}
                </div>

                {error && <p className="text-[12px] text-rose-500 dark:text-rose-400">{error}</p>}

                <button type="button" onClick={accept} disabled={saving}
                  className="w-full py-3.5 rounded-2xl text-white font-black uppercase tracking-widest text-[12px] disabled:opacity-50 transition-transform hover:scale-[1.02] flex items-center justify-center gap-2"
                  style={{ background: GRAD, boxShadow: "0 12px 30px -10px rgba(34,211,238,0.55)" }}>
                  {saving ? <Loader2 size={15} className="animate-spin" /> : <>Aceitar convite <ArrowRight size={15} /></>}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
