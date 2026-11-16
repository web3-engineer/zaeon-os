"use client";
import { CORPOS_DE_JOGADOR } from "@/lib/cyber/estiloAvatar";
import AuraCard, { type AuraVisitante } from "@/components/profile/AuraCard";

/**
 * EditableProfile — visual clássico Zaeon: CÁPSULA (à esquerda) com DNA girando e a foto
 * no centro + conectores (nome/curso/nível). No meio, uma ÁRVORE DE HABILIDADES (foco,
 * disciplina, calma… e negativas como nervosismo) — hoje zeradas, prontas pra valores reais.
 * À DIREITA, a VITRINE do personagem (o corpo do cyberespaço, em pé, girando) + "Mudar skin".
 * Editável pelo próprio usuário (nome, curso → re-verificação). Sem títulos de módulo.
 * #427: com `visitante` (o id de OUTRA pessoa, aberto pelo "Ver perfil" do escritório) a mesma página vira SÓ
 * LEITURA com os dados dela (/api/perfil/[id]): sem editar, sem trocar foto/skin, e os CÉREBROS ficam privados.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { Loader2, Check, Upload, FileText, UserCheck, ShieldCheck, ShieldAlert, Camera, Pencil, BookOpen, Award, ArrowLeft } from "lucide-react";
import { ALL_COURSES } from "@/constants/courses";
import NetworkMural from "@/app/workstation/profiles/NetworkMural";
import ModalSkin from "@/components/profile/ModalSkin";
import { minhaArmadura } from "@/lib/cyber/cores";
import DicasRapidas from "@/components/onboard/DicasRapidas";
import { dicasDoPerfil } from "@/lib/onboarding/dicas";

// three.js só no cliente (como o CosmicLounge)
const VitrinePersonagem = dynamic(() => import("@/components/cyber/VitrinePersonagem"), { ssr: false, loading: () => <div className="w-full h-full" /> });

interface Inviter { name: string | null; image: string | null; course: string | null }
interface ProfileData {
  name: string; course: string; image: string | null;
  kycStatus: string; eduVerified: boolean; plan: string; academicLevel: string; inviter: Inviter | null;
  /** o dono da Zaeon (decidido no servidor — a mesma regra do cyberespaço): tem corpo próprio, sem "Mudar skin" */
  fundador?: boolean;
  /** o corpo próprio de jogador (lib/lounge3d/corposDeUsuario) */
  corpo?: string | null;
  corArmadura?: string;
}

// Árvore de habilidades — estrutura pronta; `value` 0 até termos métricas reais.
const SKILLS: { name: string; kind: "pos" | "neg"; value: number }[] = [
  { name: "Foco", kind: "pos", value: 0 },
  { name: "Atenção", kind: "pos", value: 0 },
  { name: "Disciplina", kind: "pos", value: 0 },
  { name: "Calma", kind: "pos", value: 0 },
  { name: "Memória", kind: "pos", value: 0 },
  { name: "Criatividade", kind: "pos", value: 0 },
  { name: "Nervosismo", kind: "neg", value: 0 },
  { name: "Procrastinação", kind: "neg", value: 0 },
  { name: "Ansiedade", kind: "neg", value: 0 },
  { name: "Dispersão", kind: "neg", value: 0 },
];

function RealisticDNA() {
  return (
    <motion.div animate={{ opacity: [0.7, 1, 0.7], scale: [0.98, 1.02, 0.98] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      className="absolute inset-0 flex flex-col items-center justify-around py-6 z-0" style={{ perspective: "1000px" }} aria-hidden>
      {[...Array(26)].map((_, i) => (
        <motion.div key={i} className="relative w-16 h-[3px] flex items-center justify-between"
          animate={{ rotateY: [0, 360] }} transition={{ duration: 8, repeat: Infinity, ease: "linear", delay: i * 0.15 }}>
          <div className="w-3 h-3 rounded-full bg-cyan-400" />
          <div className="flex-1 h-[2px] bg-gradient-to-r from-cyan-400 to-violet-500" />
          <div className="w-3 h-3 rounded-full bg-violet-500" />
        </motion.div>
      ))}
    </motion.div>
  );
}

function SkillBar({ name, kind, value }: { name: string; kind: "pos" | "neg"; value: number }) {
  const grad = kind === "pos" ? "linear-gradient(90deg,#22d3ee,#3b82f6)" : "linear-gradient(90deg,#fb7185,#f59e0b)";
  return (
    <div className="flex items-center gap-3">
      <span className="text-[12px] font-semibold text-slate-700 dark:text-white/80 w-28 shrink-0 truncate">{name}</span>
      <div className="flex-1 h-2 rounded-full bg-slate-200/80 dark:bg-white/10 overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${Math.max(0, Math.min(100, value))}%`, background: grad }} />
      </div>
      <span className="text-[11px] font-mono text-slate-400 dark:text-white/40 w-6 text-right">{value}</span>
    </div>
  );
}

export default function EditableProfile({ visitante = null, onVoltar }: {
  /** #427: id de OUTRA pessoa → perfil dela, só leitura e sem cérebros. */
  visitante?: string | null;
  /** volta pra onde veio (o escritório). */
  onVoltar?: () => void;
} = {}) {
  const [data, setData] = useState<ProfileData | null>(null);
  const [auraVisitante, setAuraVisitante] = useState<AuraVisitante | null>(null);
  const [naoAchou, setNaoAchou] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [course, setCourse] = useState("");
  const [doc, setDoc] = useState<string | null>(null);
  const [docName, setDocName] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [img, setImg] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  // #438: erro da FOTO aparece do lado dela (antes ia lá pro fim da página, ninguém via)
  const [erroFoto, setErroFoto] = useState<string | null>(null);
  const [skinAberto, setSkinAberto] = useState(false);
  const fecharSkin = useCallback(() => setSkinAberto(false), []);

  useEffect(() => {
    let alive = true;
    setLoading(true); setNaoAchou(false); setEditing(false); setAuraVisitante(null);
    // #427: perfil de outra pessoa (só quem divide escritório com ela consegue; senão 404)
    const url = visitante ? `/api/perfil/${visitante}` : "/api/profile";
    fetch(url, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (!alive) return;
        if (!j) { if (visitante) setNaoAchou(true); return; }
        const d = visitante ? j.pessoa : j;
        setData(d); setName(d.name || ""); setCourse(d.course || ""); setImg(d.image || null);
        if (visitante) setAuraVisitante({ aura: j.aura ?? null, validacoesPendentes: j.validacoesPendentes ?? null });
      })
      .catch(() => { if (alive && visitante) setNaoAchou(true); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [visitante]);
  const somenteLeitura = !!visitante;

  const courseChanged = useMemo(() => !!data && course.trim() !== (data.course || "").trim(), [course, data]);
  const courseValid = ALL_COURSES.some((c) => c.toLowerCase() === course.trim().toLowerCase());
  const dirty = !!data && (name.trim() !== (data.name || "").trim() || courseChanged);

  const onDoc = (f?: File) => {
    if (!f) return;
    if (f.size > 4 * 1024 * 1024) { setMsg("Comprovante muito grande (máx. 4MB)."); return; }
    const r = new FileReader(); r.onload = () => { setDoc(String(r.result)); setDocName(f.name); }; r.readAsDataURL(f);
  };

  const onAvatar = (f?: File) => {
    if (!f) return;
    if (!f.type.startsWith("image/")) { setErroFoto("Escolha uma imagem (PNG, JPG, WEBP ou GIF)."); return; }
    setUploading(true); setErroFoto(null);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const image = new window.Image();
      image.onload = async () => {
        const canvas = document.createElement("canvas");
        const max = 512; let { width, height } = image;
        if (width > height && width > max) { height = (height * max) / width; width = max; }
        else if (height > max) { width = (width * max) / height; height = max; }
        canvas.width = width; canvas.height = height;
        canvas.getContext("2d")!.drawImage(image, 0, 0, width, height);
        const b64 = canvas.toDataURL("image/jpeg", 0.7);
        try {
          const r = await fetch("/api/user/avatar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ image: b64 }) });
          if (r.ok) { setImg(b64); setErroFoto(null); }
          else { const j = await r.json().catch(() => ({})); setErroFoto(j?.error || "Não consegui salvar a foto."); }
        }
        catch { setErroFoto("Erro ao enviar a foto. Confira a internet e tente de novo."); } finally { setUploading(false); }
      };
      image.src = String(ev.target?.result);
    };
    reader.readAsDataURL(f);
  };

  const save = async () => {
    setMsg(null);
    if (courseChanged && !courseValid) { setMsg("Escolha um curso válido da lista."); return; }
    if (courseChanged && !doc) { setMsg("Mudar de curso exige reenviar o comprovante de matrícula."); return; }
    setSaving(true);
    try {
      const r = await fetch("/api/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, course, verificationDoc: doc ?? undefined }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setMsg(d.error || "Não consegui salvar."); return; }
      setData((p) => p ? { ...p, name: name.trim(), course: course.trim(), kycStatus: d.reverify ? "pending" : p.kycStatus, eduVerified: d.reverify ? false : p.eduVerified } : p);
      setDoc(null); setDocName(""); setEditing(false);
      setMsg(d.reverify ? "Curso atualizado — vamos reverificar seu comprovante." : "Perfil salvo!");
      setTimeout(() => setMsg(null), 4000);
    } catch { setMsg("Erro de conexão."); } finally { setSaving(false); }
  };

  if (loading) return <div className="w-full h-full flex items-center justify-center text-slate-400 dark:text-white/40"><Loader2 size={18} className="animate-spin" /></div>;
  if (visitante && naoAchou) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-center p-6">
        <p role="alert" className="text-[13px] text-slate-600 dark:text-white/70">Não deu pra abrir esse perfil. Só dá pra ver o perfil de quem divide um escritório com você.</p>
        {onVoltar && <button type="button" onClick={onVoltar} className="inline-flex items-center gap-1.5 text-[12px] font-bold text-cyan-600 dark:text-cyan-300 hover:underline"><ArrowLeft size={13} /> Voltar ao escritório</button>}
      </div>
    );
  }

  const card = "border px-4 py-2.5 rounded-2xl backdrop-blur-md shadow-lg bg-white/60 dark:bg-black/30 border-cyan-300/40 dark:border-cyan-400/20";
  const label = "text-[8px] uppercase font-black tracking-widest text-slate-500 dark:text-white/45";
  const value = "text-[13px] font-bold text-slate-900 dark:text-white";

  return (
    <div className="w-full h-full overflow-y-auto custom-scrollbar p-1">
      <div className="max-w-5xl xl:max-w-7xl pb-10">
        {/* Editar (sem título de módulo) — no perfil de outra pessoa (#427): "Voltar ao escritório" */}
        <div className={`flex ${somenteLeitura ? "justify-start" : "justify-end"} mb-1`}>
          {somenteLeitura ? (
            onVoltar && (
              <button type="button" onClick={onVoltar} className="inline-flex items-center gap-1.5 text-[12px] font-bold text-cyan-600 dark:text-cyan-300 hover:underline">
                <ArrowLeft size={13} /> Voltar ao escritório
              </button>
            )
          ) : (
            <button data-tour="perfil-editar" onClick={() => { setEditing((v) => !v); setMsg(null); }} className="inline-flex items-center gap-1.5 text-[12px] font-bold text-cyan-600 dark:text-cyan-300 hover:underline">
              <Pencil size={13} /> {editing ? "Cancelar" : "Editar"}
            </button>
          )}
        </div>

        {/* HERO: cápsula (esquerda) + árvore de habilidades (meio) + o personagem em pé (direita) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_260px] gap-8 items-start">
          {/* ESQUERDA: cápsula + conectores */}
          <div className="flex items-start gap-2">
            <div className="relative w-[150px] h-[360px] rounded-[80px] border-[3px] border-cyan-400/40 dark:border-cyan-400/30 backdrop-blur-2xl flex items-center justify-center shrink-0 shadow-[0_0_50px_-10px_rgba(34,211,238,0.4)] bg-white/30 dark:bg-cyan-950/10">
              <RealisticDNA />
              <motion.div animate={{ y: [-8, 8, -8] }} transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }} className="relative z-10">
                <label className={`relative block w-28 h-28 rounded-full border-4 border-cyan-400/60 p-1 shadow-2xl group/av bg-white dark:bg-black overflow-hidden ${somenteLeitura ? "" : "cursor-pointer"}`} data-testid="foto-perfil" data-tour="perfil-foto">
                  {!somenteLeitura && <input type="file" accept="image/*" className="hidden" onChange={(e) => onAvatar(e.target.files?.[0])} disabled={uploading} />}
                  {img ? <Image src={img} alt="avatar" fill className="object-cover rounded-full" />
                    : <span className="absolute inset-0 flex items-center justify-center text-3xl font-black text-cyan-600 dark:text-cyan-300">{(name || "Z").charAt(0).toUpperCase()}</span>}
                  {!somenteLeitura && (
                    <div className="absolute inset-0 bg-black/55 rounded-full flex flex-col items-center justify-center opacity-0 group-hover/av:opacity-100 [@media(hover:none)]:opacity-100 [@media(hover:none)]:bg-black/30 transition-opacity">
                      {uploading ? <Loader2 className="w-6 h-6 text-white animate-spin" /> : <Camera className="w-7 h-7 text-white" />}
                      <span className="text-[7px] uppercase font-bold text-white tracking-widest mt-0.5">{uploading ? "salvando" : "trocar"}</span>
                    </div>
                  )}
                </label>
              </motion.div>
            </div>

            <div className="flex flex-col gap-4 pt-10 -ml-1 flex-1 min-w-0">
              {erroFoto && !somenteLeitura && (
                <p role="alert" data-testid="erro-foto" className="text-[11.5px] font-semibold text-rose-600 dark:text-rose-300 -mb-2">{erroFoto}</p>
              )}
              <div className="flex items-center">
                <div className="hidden sm:block w-6 h-[2px] bg-cyan-400/50 shrink-0" />
                <div className={`${card} flex-1 flex items-center gap-3`}>
                  <UserCheck size={18} className="text-cyan-500 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className={label}>Nome</div>
                    {editing ? <input value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-transparent outline-none text-[13px] font-bold text-slate-900 dark:text-white border-b border-cyan-400/40" />
                      : <div className={`${value} truncate`}>{name || "—"}</div>}
                  </div>
                </div>
              </div>

              <div className="flex items-center">
                <div className="hidden sm:block w-10 h-[2px] bg-cyan-400/50 shrink-0" />
                <div className={`${card} flex-1`}>
                  <div className="flex items-center gap-3">
                    <BookOpen size={18} className="text-cyan-500 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className={label}>Curso</div>
                      {editing ? <input list="ep-courses" value={course} onChange={(e) => setCourse(e.target.value)} placeholder="seu curso…" className="w-full bg-transparent outline-none text-[13px] font-bold text-slate-900 dark:text-white border-b border-cyan-400/40" />
                        : <div className={`${value} truncate`}>{course || "Não declarado"}</div>}
                    </div>
                  </div>
                  {editing && courseChanged && (
                    <div className="mt-2 rounded-xl border border-amber-400/40 bg-amber-50 dark:bg-amber-500/10 p-2.5">
                      <p className="text-[11px] text-amber-700 dark:text-amber-200 flex items-center gap-1.5 mb-1.5"><ShieldAlert size={13} /> Mudar de curso pede novo comprovante.</p>
                      <label className="flex items-center justify-center gap-2 w-full py-2 rounded-lg border border-dashed cursor-pointer text-[11px] font-bold border-amber-400/50 text-amber-700 dark:text-amber-200 hover:bg-amber-500/10">
                        {doc ? <><FileText size={13} /> {docName || "anexado"}</> : <><Upload size={13} /> Anexar comprovante</>}
                        <input type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => onDoc(e.target.files?.[0])} />
                      </label>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center">
                <div className="hidden sm:block w-14 h-[2px] bg-cyan-400/50 shrink-0" />
                <div className={`${card} flex-1 flex items-center gap-3`}>
                  <Award size={18} className="text-cyan-500 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className={label}>Nível</div>
                    <div className={`${value} flex items-center gap-2`}>
                      {data?.academicLevel || "Graduação"}
                      {data?.plan && data.plan !== "free" && <span className="px-2 py-0.5 rounded-full text-[9px] bg-cyan-500/15 text-cyan-700 dark:text-cyan-200 uppercase tracking-wider">{data.plan}</span>}
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold inline-flex items-center gap-1 ${data?.eduVerified ? "text-emerald-600 dark:text-emerald-300" : "text-amber-600 dark:text-amber-300"}`}>
                    {data?.eduVerified ? <ShieldCheck size={12} /> : <ShieldAlert size={12} />}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* DIREITA: árvore de habilidades */}
          <div data-tour="perfil-habilidades" className="rounded-3xl border border-slate-200 dark:border-white/10 bg-white/50 dark:bg-white/[0.03] p-5">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-white/45 mb-3">Habilidades</p>
            <div className="flex flex-col gap-2.5 mb-4">
              {SKILLS.filter((s) => s.kind === "pos").map((s) => <SkillBar key={s.name} {...s} />)}
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest text-rose-400/80 mb-3">A trabalhar</p>
            <div className="flex flex-col gap-2.5">
              {SKILLS.filter((s) => s.kind === "neg").map((s) => <SkillBar key={s.name} {...s} />)}
            </div>
            {!somenteLeitura && <p className="text-[10px] text-slate-400 dark:text-white/30 mt-4">Valores chegam conforme você usa a Zaeon.</p>}
          </div>

          {/* DIREITA: o personagem (vitrine 3D) — no celular/tela média vai abaixo das Habilidades, menor */}
          <div className="lg:col-span-2 xl:col-span-1 flex flex-col items-center gap-3">
            <div className="relative w-[200px] h-[320px] xl:w-full xl:h-[420px] rounded-3xl border border-slate-200 dark:border-white/10 bg-gradient-to-b from-white/40 to-cyan-100/30 dark:from-white/[0.02] dark:to-cyan-500/[0.06] overflow-hidden">
              <VitrinePersonagem fundador={!!data?.fundador} corpo={data?.corpo ? CORPOS_DE_JOGADOR[data.corpo] : undefined} cor={data?.corArmadura ?? minhaArmadura()} className="w-full h-full" />
            </div>
            {!data?.fundador && !somenteLeitura && (
              <button type="button" data-tour="perfil-skin" onClick={() => setSkinAberto(true)} aria-haspopup="dialog"
                className="px-6 py-2.5 rounded-full text-white font-black uppercase tracking-widest text-[11px] transition-transform hover:scale-[1.02] focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
                style={{ background: "linear-gradient(135deg,#2563eb,#06b6d4)" }}>
                Mudar skin
              </button>
            )}
          </div>
        </div>
        {!somenteLeitura && <ModalSkin aberto={skinAberto} fechar={fecharSkin} />}

        {/* AURA (economia de reputação) — só com NEXT_PUBLIC_AURA_ECONOMY=1; o cartão some sozinho se a rota der 404 */}
        {somenteLeitura
          ? (auraVisitante?.aura && <AuraCard visitante={auraVisitante} />)
          : (process.env.NEXT_PUBLIC_AURA_ECONOMY === "1" && <AuraCard />)}

        {/* #618: dicas rápidas na 1ª vez no PRÓPRIO perfil (no de outra pessoa, não) */}
        {!somenteLeitura && data && <DicasRapidas lugar="perfil" dicas={dicasDoPerfil({ fundador: !!data.fundador })} />}
        <datalist id="ep-courses">{ALL_COURSES.map((c) => <option key={c} value={c} />)}</datalist>

        {msg && <p className="text-[12px] font-medium text-cyan-700 dark:text-cyan-300 mt-4">{msg}</p>}
        {editing && (
          <button onClick={save} disabled={!dirty || saving}
            className="mt-4 px-7 py-3 rounded-full text-white font-black uppercase tracking-widest text-[12px] disabled:opacity-40 transition-transform hover:scale-[1.02] inline-flex items-center gap-2"
            style={{ background: "linear-gradient(135deg,#2563eb,#06b6d4)" }}>
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={15} />} Salvar
          </button>
        )}

        {/* Convidado por */}
        {data?.inviter && (
          <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white/60 dark:bg-white/[0.03] p-4 mt-6">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-white/45 mb-2 flex items-center gap-1.5"><UserCheck size={13} /> {somenteLeitura ? "Convidado(a) por" : "Você foi convidado por"}</p>
            <div className="flex items-center gap-3">
              <span className="w-11 h-11 rounded-full overflow-hidden bg-cyan-100 dark:bg-cyan-500/15 flex items-center justify-center shrink-0">
                {data.inviter.image ? <Image src={data.inviter.image} alt="" width={44} height={44} className="w-full h-full object-cover" />
                  : <span className="font-black text-cyan-600 dark:text-cyan-300">{(data.inviter.name || "?").charAt(0).toUpperCase()}</span>}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-800 dark:text-white truncate">{data.inviter.name || "Membro Zaeon"}</p>
                {data.inviter.course && <p className="text-[11px] text-slate-500 dark:text-white/45 truncate">{data.inviter.course}</p>}
              </div>
            </div>
          </div>
        )}

        {/* Mural de fotos */}
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-white/55 mb-2 mt-6">{somenteLeitura ? "Mural" : "Seu mural"}</p>
        {somenteLeitura && visitante ? <NetworkMural visitedUserId={visitante} /> : <NetworkMural />}
      </div>
    </div>
  );
}
