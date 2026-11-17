"use client";

/**
 * PdaEquipe — "Conheça a equipe" na interface do PDA (o mesmo idioma visual do PDA do BioSim:
 * painel escuro `#0c0c1a`, borda fina, header com ícone + rótulo em caixa alta, seções separadas
 * por linha). Um PDA por pessoa: foto, nome, cargo, bio e o que faz.
 *
 * Sem a foto em public/team/<id>.jpg, cai nas iniciais — a página nunca mostra imagem quebrada.
 * Só fade-in (once): o conteúdo fica na página ao rolar de volta.
 */
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { Fingerprint, Instagram, Linkedin, Globe, Signal, BatteryMedium } from "lucide-react";
import { EQUIPE, type MembroEquipe } from "@/lib/about/equipe";

function Foto({ m }: { m: MembroEquipe }) {
  const { t } = useTranslation();
  const [falhou, setFalhou] = useState(!m.foto);
  const iniciais = m.nome.split(/\s+/).slice(0, 2).map((p) => p[0]).join("").toUpperCase();
  return (
    <div className="relative shrink-0 h-24 w-24 md:h-28 md:w-28 rounded-2xl p-[2px]" style={{ background: `linear-gradient(160deg, ${m.acento}, transparent 70%)` }}>
      <div className="h-full w-full overflow-hidden rounded-[14px] bg-[#070a1a] grid place-items-center">
        {falhou ? (
          <span className="text-3xl font-black tracking-tight" style={{ color: m.acento }}>{iniciais}</span>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={m.foto} alt={t("about.equipe_copy.foto", { nome: m.nome })} className="h-full w-full object-cover" onError={() => setFalhou(true)} />
        )}
      </div>
      <span aria-hidden className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-[#0c0c1a]" style={{ background: m.acento, boxShadow: `0 0 12px ${m.acento}` }} />
    </div>
  );
}

function Pda({ m, i }: { m: MembroEquipe; i: number }) {
  const { t } = useTranslation();
  const cargo = m.cargo && t(`about.equipe_copy.${m.id}.cargo`, m.cargo);
  return (
    <motion.article
      initial={{ opacity: 0, y: 24, scale: 0.97 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ type: "spring", stiffness: 120, damping: 20, delay: i * 0.12 }}
      aria-label={cargo ? `${m.nome}, ${cargo}` : m.nome}
      className="relative w-full max-w-[420px] rounded-[1.6rem] border border-white/15 bg-[#0c0c1a]/95 backdrop-blur-2xl shadow-[0_20px_60px_rgba(0,0,0,0.6)] overflow-hidden"
    >
      {/* header do PDA */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Fingerprint size={14} style={{ color: m.acento }} />
          <span className="text-[11px] font-black text-white uppercase tracking-widest">{t("about.equipe_copy.pda")}</span>
        </div>
        <div className="flex items-center gap-2 text-slate-500">
          <span className="font-mono text-[9px] tracking-widest">{String(i + 1).padStart(2, "0")}/{String(EQUIPE.length).padStart(2, "0")}</span>
          <Signal size={12} /><BatteryMedium size={13} />
        </div>
      </div>

      {/* identidade */}
      <div className="px-4 pt-4 pb-3 flex items-center gap-4">
        <Foto m={m} />
        <div className="min-w-0">
          <p className="text-[8px] uppercase tracking-widest text-slate-500 font-bold">{t("about.equipe_copy.perfil")}</p>
          <h3 className="mt-0.5 text-xl md:text-2xl font-black tracking-tight text-white leading-tight">{m.nome}</h3>
          {cargo && <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.22em]" style={{ color: m.acento }}>{cargo}</p>}
        </div>
      </div>

      {m.bio && (
        <div className="mx-3 border-t border-white/10 px-1 pb-2 pt-3">
          <p className="text-[8px] uppercase tracking-widest text-slate-500 font-bold">{t("about.equipe_copy.nota")}</p>
          <p className="mt-1.5 text-[13px] leading-relaxed text-slate-200">{t(`about.equipe_copy.${m.id}.bio`, m.bio)}</p>
        </div>
      )}

      {/* o que faz */}
      <div className="px-4 pb-4 pt-1 flex flex-wrap items-center gap-1.5">
        {m.tags?.map((tag, indice) => (
          <span key={tag} className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-semibold text-slate-200">{t(`about.equipe_copy.${m.id}.tags.${indice}`, tag)}</span>
        ))}
        {m.redes && (
          <span className="ml-auto flex items-center gap-1.5">
            {m.redes.linkedin && <a href={m.redes.linkedin} target="_blank" rel="noreferrer" aria-label={`LinkedIn de ${m.nome}`} className="grid h-7 w-7 place-items-center rounded-lg border border-white/10 text-slate-300 hover:text-white"><Linkedin size={13} /></a>}
            {m.redes.instagram && <a href={m.redes.instagram} target="_blank" rel="noreferrer" aria-label={`Instagram de ${m.nome}`} className="grid h-7 w-7 place-items-center rounded-lg border border-white/10 text-slate-300 hover:text-white"><Instagram size={13} /></a>}
            {m.redes.site && <a href={m.redes.site} target="_blank" rel="noreferrer" aria-label={`Site de ${m.nome}`} className="grid h-7 w-7 place-items-center rounded-lg border border-white/10 text-slate-300 hover:text-white"><Globe size={13} /></a>}
          </span>
        )}
      </div>

      {/* brilho de tela */}
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/[0.05] via-transparent to-transparent" />
    </motion.article>
  );
}

export default function PdaEquipe({ titulo, subtitulo }: { titulo: string; subtitulo?: string }) {
  const { t } = useTranslation();
  return (
    <section aria-labelledby="equipe-titulo" className="mx-auto w-full max-w-5xl flex flex-col items-center text-center relative z-40 pb-[10vh]">
      <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }} className="mb-12">
        <p className="text-[10px] font-black uppercase tracking-[0.5em] text-cyan-500/70 mb-4">{t("about.equipe_copy.chamada")}</p>
        <h2 id="equipe-titulo" className="text-4xl md:text-6xl font-black text-slate-950 dark:text-white tracking-tighter drop-shadow-2xl">{titulo}</h2>
        {subtitulo && <p className="mt-4 text-slate-700 dark:text-white/70 max-w-xl mx-auto">{subtitulo}</p>}
      </motion.div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 w-full justify-items-center">
        {EQUIPE.map((m, i) => <Pda key={m.id} m={m} i={i} />)}
      </div>
    </section>
  );
}
