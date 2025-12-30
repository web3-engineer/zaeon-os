"use client";

import { ChevronRightIcon, ChevronLeftIcon, XMarkIcon, ArrowLeftIcon, WalletIcon, IdentificationIcon } from "@heroicons/react/24/outline";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { slideInFromLeft, slideInFromRight, slideInFromTop } from "@/lib/motion";
import onboardPng from "@/app/onboard.png";

// --- IMPORTS CORRIGIDOS ---
import { useTranslation } from "react-i18next";

// Se HeroContent está em "src/components/sub/", sobe 2 níveis para achar "src/i18n.ts"
import "../../src/i18n";

// Importa o background da pasta "src/components/main/"
import MatrixRain from "@/components/main/star-background";

/* ----------------------- Types & Constants ----------------------- */

type MenuItem = { labelKey: string; href: string };

const MENU_ITEMS: MenuItem[] = [
  { labelKey: "menu.new", href: "/signup" },
  { labelKey: "menu.load", href: "/signin" },
  { labelKey: "menu.options", href: "/settings" },
  { labelKey: "menu.manual", href: "/manual" },
];

const ROLES = [
  { slug: "student", key: "roles.student" },
  { slug: "researcher", key: "roles.researcher" },
  { slug: "professional", key: "roles.professional" },
  { slug: "entrepreneur", key: "roles.entrepreneur" },
] as const;

type Role = typeof ROLES[number]["slug"];

/* ----------------------- Onboarding Modal ----------------------- */

function OnboardModal({ open, onClose, role }: { open: boolean; onClose: () => void; role: Role }) {
  const { t } = useTranslation();

  const [idValue, setIdValue] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [step, setStep] = useState(0);

  const [useWallet, setUseWallet] = useState(false);

  const idRef = useRef<HTMLInputElement | null>(null);
  const nameRef = useRef<HTMLInputElement | null>(null);
  const emailRef = useRef<HTMLInputElement | null>(null);
  const phoneRef = useRef<HTMLInputElement | null>(null);

  const roleObj = ROLES.find((r) => r.slug === role);
  // Fallback de segurança para o label
  const roleLabel = roleObj ? t(roleObj.key) : role;

  const getRequirements = () => {
    if (useWallet) {
      return { label: t("modal.wallet_label"), placeholder: t("modal.wallet_placeholder") };
    }

    switch (role) {
      case "student": return { label: t("modal.lbl_student"), placeholder: t("modal.ph_student") };
      case "researcher": return { label: t("modal.lbl_researcher"), placeholder: t("modal.ph_researcher") };
      case "professional": return { label: t("modal.lbl_professional"), placeholder: t("modal.ph_professional") };
      case "entrepreneur": return { label: t("modal.lbl_entrepreneur"), placeholder: t("modal.ph_entrepreneur") };
      default: return { label: "ID", placeholder: "..." };
    }
  };

  const req = getRequirements();

  const steps = [
    { key: "id", label: req.label, placeholder: req.placeholder, type: "text" as const },
    { key: "name", label: t("modal.name"), placeholder: "", type: "text" as const },
    { key: "email", label: t("modal.email"), placeholder: "you@email.com", type: "email" as const },
    { key: "phone", label: t("modal.phone"), placeholder: "(00) 00000-0000", type: "text" as const },
  ] as const;

  const lastIndex = steps.length - 1;

  const validate = (idx: number) => {
    const key = steps[idx]?.key;
    if (!key) return false;
    if (key === "id") {
      return useWallet ? idValue.trim().length > 20 : idValue.trim().length > 3;
    }
    if (key === "name") return fullName.trim().length > 2;
    if (key === "email") return /\S+@\S+\.\S+/.test(email);
    if (key === "phone") return phone.trim().replace(/\D/g, "").length >= 10;
    return false;
  };

  const canSubmit = steps.every((_, i) => validate(i));

  useEffect(() => {
    if (open) {
      setIdValue("");
      setFullName("");
      setEmail("");
      setPhone("");
      setStep(0);
      setUseWallet(false);

      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      const t = setTimeout(() => idRef.current?.focus(), 20);
      return () => {
        clearTimeout(t);
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => {
      const key = steps[step]?.key;
      if (key === "id") idRef.current?.focus();
      if (key === "name") nameRef.current?.focus();
      if (key === "email") emailRef.current?.focus();
      if (key === "phone") phoneRef.current?.focus();
    }, 10);
    return () => clearTimeout(t);
  }, [step, open]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    e.stopPropagation();
    const code = e.code;
    if (code === "Escape") { e.preventDefault(); onClose(); return; }
    if (code === "Backspace" || code === "Delete") {
      const key = steps[step]?.key;
      const valueNow = key === "id" ? idValue : key === "name" ? fullName : key === "email" ? email : phone;
      if (!valueNow) { e.preventDefault(); setStep((s) => Math.max(0, s - 1)); }
      return;
    }
    if (code === "Enter") {
      e.preventDefault();
      if (!validate(step)) return;
      if (step < lastIndex) {
        setStep((s) => Math.min(lastIndex, s + 1));
      } else if (canSubmit) {
        const q = new URLSearchParams({
          role,
          id: idValue,
          idType: useWallet ? 'wallet' : 'role_id',
          name: fullName,
          email,
          phone
        }).toString();
        window.location.assign(`/signup?${q}`);
      }
    }
  };

  if (!open) return null;

  const inputClass = "h-10 rounded-lg border border-white/10 bg-black/70 px-3 text-white placeholder:text-white/40 outline-none focus:ring-2 focus:ring-cyan-400/60";

  return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center px-4" role="dialog" aria-modal="true" onKeyDown={handleKeyDown}>
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="relative w-full max-w-[960px] rounded-2xl border border-white/10 bg-[rgba(7,16,28,0.85)] shadow-[0_10px_50px_rgba(0,0,0,0.55)] overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-[2px] bg-[linear-gradient(90deg,#22d3ee,#60a5fa,#22d3ee)]/80 animate-pulse" />
          <button onClick={onClose} className="absolute right-3 top-3 rounded-md p-2 text-white/70 hover:bg-white/10"><XMarkIcon className="h-5 w-5" /></button>
          <div className="grid grid-cols-[1.3fr_0.7fr]">
            <div className="p-6 space-y-3">
              <div className="flex items-center gap-3 mb-3">
                <p className="text-sm text-white/85 tracking-wide">{t("modal.title")} · {roleLabel}</p>
              </div>
              {steps.map((s, i) => {
                const active = i === step;
                return (
                    <motion.div key={s.key} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="grid grid-cols-[220px_1fr] items-center gap-3">
                      <div className={["rounded-lg px-3 py-2 border w-full flex items-center justify-between", active ? "border-cyan-300/50 bg-[linear-gradient(120deg,rgba(34,211,238,.18),rgba(139,92,246,.18))] shadow-[0_0_22px_rgba(34,211,238,0.25)]" : "border-white/10 bg-white/[0.06]"].join(" ")}>
                        <p className="text-[12px] text-white font-semibold">{s.label}</p>
                        {s.key === 'id' && (
                            <button
                                onClick={() => {
                                  setUseWallet(!useWallet);
                                  setIdValue("");
                                  idRef.current?.focus();
                                }}
                                className="ml-2 text-[10px] uppercase font-bold tracking-wide text-cyan-400 hover:text-cyan-200 transition-colors flex items-center gap-1 bg-black/20 px-2 py-1 rounded"
                            >
                              {useWallet ? (
                                  <><IdentificationIcon className="w-3 h-3" /> {t("modal.use_id")}</>
                              ) : (
                                  <><WalletIcon className="w-3 h-3" /> {t("modal.use_wallet")}</>
                              )}
                            </button>
                        )}
                      </div>
                      <input ref={s.key === "id" ? idRef : s.key === "name" ? nameRef : s.key === "email" ? emailRef : phoneRef} className={inputClass} placeholder={s.placeholder} type={s.type} value={s.key === "id" ? idValue : s.key === "name" ? fullName : s.key === "email" ? email : phone} onChange={(e) => { const val = e.target.value; if (s.key === "id") setIdValue(val); if (s.key === "name") setFullName(val); if (s.key === "email") setEmail(val); if (s.key === "phone") setPhone(val); }} />
                    </motion.div>
                );
              })}
              <div className="flex items-center gap-3 pt-3">
                <button disabled={!canSubmit} onClick={() => {}} className={["rounded-xl px-5 h-10 text-sm font-semibold text-white", "bg-[linear-gradient(90deg,#22d3ee,#60a5fa,#22d3ee)] hover:brightness-110", "shadow-[0_0_22px_rgba(56,189,248,0.38)] transition", !canSubmit ? "opacity-50 cursor-not-allowed" : ""].join(" ")}>{t("modal.continue")}</button>
                <button onClick={onClose} className="rounded-xl px-5 h-10 text-sm font-semibold text-white/80 hover:text-white border border-white/15">{t("modal.cancel")}</button>
              </div>
            </div>
            <div className="relative flex justify-end pr-4 pt-2">
              <div className="absolute -top-6 -right-6 w-56 h-56 rounded-full bg-cyan-400/10 blur-2xl" />
              <Image src={onboardPng} alt="Zaeon Onboard" className="w-[85%] max-w-[360px] h-auto object-contain drop-shadow-[0_0_25px_rgba(34,211,238,0.25)] translate-y-[-20px]" priority draggable={false} />
            </div>
          </div>
        </motion.div>
      </div>
  );
}

/* ---------------------------------------------------------------- */

// COMPONENTE INTERNO
const HeroContentComponent = () => {
  const { t, i18n } = useTranslation();

  const [index, setIndex] = useState(0);
  const [roleIndex, setRoleIndex] = useState(0);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [onboardOpen, setOnboardOpen] = useState(false);
  const [chosenRole, setChosenRole] = useState<Role>("student");

  const [isOptionsOpen, setIsOptionsOpen] = useState(false);
  const [blockchainNode, setBlockchainNode] = useState(true);
  const [tutorials, setTutorials] = useState(true);

  const containerRef = useRef<HTMLDivElement | null>(null);

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    i18n.changeLanguage(e.target.value);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (onboardOpen) return;
      if (isOptionsOpen && e.code === "Escape") { setIsOptionsOpen(false); return; }
      if (isOptionsOpen) return;

      if (pickerOpen) {
        if (["ArrowLeft", "KeyA"].includes(e.code)) { e.preventDefault(); setRoleIndex((r) => (r - 1 + ROLES.length) % ROLES.length); return; }
        if (["ArrowRight", "KeyD"].includes(e.code)) { e.preventDefault(); setRoleIndex((r) => (r + 1) % ROLES.length); return; }
        if (e.code === "Enter") { e.preventDefault(); const chosen = ROLES[roleIndex]; setChosenRole(chosen.slug); setOnboardOpen(true); return; }
        if (e.code === "Escape") { e.preventDefault(); setPickerOpen(false); return; }
        return;
      }

      if (["ArrowUp", "KeyW"].includes(e.code)) { e.preventDefault(); setIndex((i) => (i - 1 + MENU_ITEMS.length) % MENU_ITEMS.length); return; }
      if (["ArrowDown", "KeyS"].includes(e.code)) { e.preventDefault(); setIndex((i) => (i + 1) % MENU_ITEMS.length); return; }
      if (e.code === "Enter") {
        const item = MENU_ITEMS[index];
        if (!item) return;
        if (item.labelKey === "menu.new") { e.preventDefault(); setPickerOpen(true); return; }
        if (item.labelKey === "menu.options") { setIsOptionsOpen(true); return; }
        window.location.assign(item.href);
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, pickerOpen, roleIndex, onboardOpen, isOptionsOpen]);

  const handleModalClose = () => { setOnboardOpen(false); setPickerOpen(false); };

  const panel = "relative w-full max-w-[420px] mt-16 sm:mt-24 rounded-2xl overflow-hidden backdrop-blur-2xl border border-white/10 shadow-[0_0_40px_rgba(34,211,238,0.12)] bg-[linear-gradient(135deg,rgba(7,38,77,0.28),rgba(11,58,164,0.25),rgba(16,134,201,0.32),rgba(11,58,164,0.25),rgba(7,38,77,0.28))] bg-[length:400%_400%] animate-[gradientFlow_12s_ease-in-out_infinite] after:pointer-events-none after:absolute after:inset-0 after:bg-[repeating-linear-gradient(transparent_0px,transparent_8px,rgba(255,255,255,0.025)_9px,transparent_10px)] after:opacity-20";
  const cardBase = "group relative overflow-hidden flex items-center justify-between rounded-xl px-5 min-h-[56px] sm:min-h-[64px] ring-1 ring-white/10 text-white transition-all duration-300 ease-out bg-[linear-gradient(120deg,rgba(3,22,45,0.55),rgba(6,42,90,0.55),rgba(7,60,120,0.55))] hover:bg-[linear-gradient(120deg,rgba(6,50,100,0.65),rgba(8,60,130,0.65))] hover:scale-[1.02] focus-visible:scale-[1.02] focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_0_12px_rgba(34,211,238,0.12)]";
  const cardSelected = "ring-cyan-300/45 shadow-[0_0_28px_rgba(34,211,238,0.25)]";
  const accentBar = (active: boolean) => ["absolute left-0 top-0 h-full w-[3px] rounded-l-xl", active ? "bg-[linear-gradient(180deg,#22d3ee,#60a5fa,#22d3ee)]" : "bg-white/10 group-hover:bg-[linear-gradient(180deg,rgba(34,211,238,.7),rgba(96,165,250,.7),rgba(34,211,238,.7))]",].join(" ");
  const labelClass = "text-[15px] sm:text-[16px] font-medium tracking-[0.01em] text-white";

  const renderNewAccountItem = (selected: boolean) => (
      <li>
        <button type="button" className={[cardBase, selected ? cardSelected : "", "pr-3"].join(" ")} onMouseEnter={() => setIndex(0)} onClick={() => setPickerOpen(true)} aria-expanded={pickerOpen} aria-haspopup="dialog">
          <span className={accentBar(selected)} />
          <span className={labelClass}>{t("menu.new")}</span>
          <div className="flex items-center gap-2 sm:gap-3">
            {!pickerOpen ? ( <ChevronRightIcon className="h-5 w-5 text-white/85 opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-0.5" /> ) : (
                <motion.div initial={{ opacity: 0, x: 6 }} animate={{ opacity: 1, x: 0 }} transition={{ type: "spring", stiffness: 300, damping: 24 }} className="flex items-center gap-3" role="dialog" aria-label="Select Virtue">
                  <button type="button" onClick={(e) => { e.stopPropagation(); setRoleIndex((r) => (r - 1 + ROLES.length) % ROLES.length); }} className="rounded-md p-1.5 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/60"><ChevronLeftIcon className="h-5 w-5 text-white/95" /></button>
                  <div onClick={(e) => { e.stopPropagation(); const chosen = ROLES[roleIndex]; setChosenRole(chosen.slug); setOnboardOpen(true); }} className={["select-none px-5 py-2 rounded-xl text-[14px] sm:text-[16px] font-bold transition-all duration-300 whitespace-nowrap cursor-pointer", "text-white bg-black/85 border border-white/15", "shadow-[0_0_16px_rgba(255,255,255,0.08)] hover:bg-black hover:shadow-[0_0_20px_rgba(255,255,255,0.15)]", "ring-2 ring-cyan-400/40 shadow-[0_0_30px_rgba(56,189,248,0.45)]"].join(" ")}>
                    {t(ROLES[roleIndex].key)}
                  </div>
                  <button type="button" onClick={(e) => { e.stopPropagation(); setRoleIndex((r) => (r + 1) % ROLES.length); }} className="rounded-md p-1.5 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/60"><ChevronRightIcon className="h-5 w-5 text-white/95" /></button>
                </motion.div>
            )}
          </div>
        </button>
      </li>
  );

  return (
      <>
        <div ref={containerRef} className="relative w-full min-h-screen text-white px-6 sm:px-12 py-12" aria-hidden={onboardOpen}>
          {/* MATRIX COMPONENT */}
          <MatrixRain />

          <div className="mx-auto max-w-[1400px] flex gap-8 lg:gap-12 items-start z-10 relative">
            <motion.aside variants={slideInFromLeft(0.12)} initial="hidden" animate="visible" className={panel}>
              <div className="flex items-center gap-3 px-6 pt-7 pb-4">
                <p className="text-sm text-white/85 tracking-[0.05em]">{t("footer.powered")}</p>
              </div>
              <nav className="px-4 sm:px-6 pb-6 relative min-h-[300px]">
                <AnimatePresence mode="wait" initial={false}>
                  {!isOptionsOpen ? (
                      <motion.ul key="main-menu" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }} className="flex flex-col gap-3">
                        {renderNewAccountItem(index === 0)}
                        {MENU_ITEMS.slice(1).map((item, i) => {
                          const realIndex = i + 1;
                          const selected = realIndex === index;
                          const isOptions = item.labelKey === "menu.options";
                          return (
                              <li key={item.labelKey}>
                                {isOptions ? (
                                    <button onClick={() => setIsOptionsOpen(true)} className={[cardBase, selected ? cardSelected : "", "w-full"].join(" ")} onMouseEnter={() => setIndex(realIndex)}>
                                      <span className={accentBar(selected)} />
                                      <span className={labelClass}>{t(item.labelKey)}</span>
                                      <ChevronRightIcon className="h-5 w-5 text-white/85 opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-0.5" />
                                    </button>
                                ) : (
                                    <Link href={item.href} className={[cardBase, selected ? cardSelected : ""].join(" ")} onMouseEnter={() => setIndex(realIndex)}>
                                      <span className={accentBar(selected)} />
                                      <span className={labelClass}>{t(item.labelKey)}</span>
                                      <ChevronRightIcon className="h-5 w-5 text-white/85 opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-0.5" />
                                    </Link>
                                )}
                              </li>
                          );
                        })}
                      </motion.ul>
                  ) : (
                      <motion.div key="options-menu" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.2 }} className="flex flex-col gap-4">
                        <div className="flex items-center mb-1">
                          <button onClick={() => setIsOptionsOpen(false)} className="flex items-center gap-2 text-sm text-cyan-400 hover:text-cyan-300 transition-colors">
                            <ArrowLeftIcon className="w-4 h-4" />
                            <span className="font-semibold uppercase tracking-wider text-[11px]">{t("menu.back")}</span>
                          </button>
                        </div>
                        <div className={`${cardBase} py-2`}>
                          <div className="flex flex-col">
                            <span className="text-[13px] text-white/50 font-medium uppercase tracking-wider mb-1">{t("options.language")}</span>
                            <span className="text-[15px] font-semibold text-white">
                              {i18n.language === 'en' ? 'English' : i18n.language === 'ko' ? '한국어' : i18n.language === 'pt' ? 'Português' : i18n.language === 'es' ? 'Español' : 'Français'}
                            </span>
                          </div>
                          <select className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" value={i18n.language} onChange={handleLanguageChange}>
                            <option className="bg-slate-900 text-white" value="en">English</option>
                            <option className="bg-slate-900 text-white" value="ko">한국어 (Korean)</option>
                            <option className="bg-slate-900 text-white" value="pt">Português (Brasil)</option>
                            <option className="bg-slate-900 text-white" value="es">Español (Spanish)</option>
                          </select>
                          <ChevronRightIcon className="h-5 w-5 text-white/40" />
                        </div>
                        <div className={`${cardBase} py-2 cursor-pointer`} onClick={() => setBlockchainNode(!blockchainNode)}>
                          <div className="flex flex-col">
                            <span className="text-[13px] text-white/50 font-medium uppercase tracking-wider mb-1">{t("options.node")}</span>
                            <div className="flex items-center gap-2">
                              <span className={`w-2 h-2 rounded-full ${blockchainNode ? "bg-cyan-400 shadow-[0_0_8px_cyan]" : "bg-red-500/50"}`} />
                              <span className="text-[15px] font-semibold text-white">{blockchainNode ? t("options.on") : t("options.off")}</span>
                            </div>
                          </div>
                        </div>
                        <div className={`${cardBase} py-2 cursor-pointer`} onClick={() => setTutorials(!tutorials)}>
                          <div className="flex flex-col">
                            <span className="text-[13px] text-white/50 font-medium uppercase tracking-wider mb-1">{t("options.tutorials")}</span>
                            <span className="text-[15px] font-semibold text-white">{tutorials ? t("options.on") : t("options.off")}</span>
                          </div>
                        </div>
                      </motion.div>
                  )}
                </AnimatePresence>
              </nav>
              <div className="px-6 pb-7 text-[11px] text-white/55 tracking-wide">{t("footer.version")}</div>
            </motion.aside>
            <motion.div initial="hidden" animate="visible" className="flex-1 min-h-[60vh] flex items-start">
              <div>
                <motion.div variants={slideInFromTop} className="w-fit py-2 px-3 border border-white/15 bg-white/5 rounded-lg flex items-center gap-2 shadow-[0_0_24px_rgba(34,211,238,0.16)]">
                  <span className="text-[13px] text-white/85"></span>
                </motion.div>
                <motion.h1 variants={slideInFromRight(0.28)} className="mt-6 text-5xl sm:text-6xl font-light tracking-tight leading-tight max-w-[780px] select-none">
                  <span className="bg-clip-text text-transparent" style={{ backgroundImage: "linear-gradient(90deg,#22d3ee,#60a5fa,#22d3ee)", backgroundSize: "260% 100%", WebkitTextStroke: "0.4px rgba(255,255,255,0.08)", }} />
                </motion.h1>
              </div>
            </motion.div>
          </div>
          <style jsx global>{` @keyframes float { 0%, 100% { transform: translateY(-4px) scale(1); opacity: .9; } 50% { transform: translateY(4px) scale(1.02); opacity: 1; } } `}</style>
        </div>
        <OnboardModal open={onboardOpen} onClose={handleModalClose} role={chosenRole} />
      </>
  );
}

// --- EXPORT COMO DYNAMIC PARA CORRIGIR ERRO DE HIDRATAÇÃO ---
export const HeroContent = dynamic(() => Promise.resolve(HeroContentComponent), { ssr: false });