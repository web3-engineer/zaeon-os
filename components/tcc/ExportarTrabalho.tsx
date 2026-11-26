"use client";
/**
 * "Exportar trabalho" — o salvamento em arquivo do editor dos trabalhos (o que antes era o modal ABNT da Sala de
 * Pesquisa): escolhe a NORMA (ABNT, Vancouver, APA), o formato (DOCX/PDF) e os dados da capa/folha de rosto. Os
 * dados ficam lembrados no aparelho (o aluno não redigita a instituição a cada export). Só a ABNT exige instituição
 * e cidade (vão na capa); nas outras normas tudo é opcional.
 */
import { useEffect, useState } from "react";
import { Download, Loader2, X } from "lucide-react";
import { ESTILOS, type Estilo } from "@/lib/export/norma";

export type OpcoesExport = {
  estilo: Estilo; formato: "docx" | "pdf";
  author: string; institution: string; course: string; advisor: string; city: string; year: string;
};

const CHAVE = "zaeon.export.meta.v1";

export function lerOpcoesSalvas(autorPadrao: string): OpcoesExport {
  const base: OpcoesExport = { estilo: "abnt", formato: "docx", author: autorPadrao, institution: "", course: "", advisor: "", city: "", year: String(new Date().getFullYear()) };
  try {
    const v = JSON.parse(localStorage.getItem(CHAVE) || "null");
    if (v && typeof v === "object") {
      for (const k of Object.keys(base) as (keyof OpcoesExport)[]) if (typeof v[k] === "string" && v[k]) (base as any)[k] = v[k];
    }
  } catch { /* sem armazenamento: começa em branco */ }
  if (!["abnt", "vancouver", "apa"].includes(base.estilo)) base.estilo = "abnt";
  if (base.formato !== "pdf") base.formato = "docx";
  return base;
}

/** O que falta pra exportar nessa norma (só a ABNT exige: a capa leva instituição e cidade). A PEÇA não tem capa. */
export function faltandoPara(o: OpcoesExport, peca = false): string[] {
  if (peca || o.estilo !== "abnt") return [];
  return [!o.institution.trim() && "instituição", !o.city.trim() && "cidade"].filter(Boolean) as string[];
}

export default function ExportarTrabalho({ aberto, autorPadrao, exportando, erro, onFechar, onExportar, peca = false }: {
  aberto: boolean; autorPadrao: string; exportando: boolean; erro: string | null;
  /** #873 PR 4: PEÇA JURÍDICA — sem norma acadêmica, sem capa: só o formato */
  peca?: boolean;
  onFechar: () => void; onExportar: (o: OpcoesExport) => void;
}) {
  const [o, setO] = useState<OpcoesExport>(() => lerOpcoesSalvas(autorPadrao));
  const [tentou, setTentou] = useState(false);
  useEffect(() => { if (aberto) { setO(lerOpcoesSalvas(autorPadrao)); setTentou(false); } }, [aberto, autorPadrao]);
  if (!aberto) return null;
  const falta = faltandoPara(o, peca);
  const mudar = (k: keyof OpcoesExport, v: string) => setO((x) => ({ ...x, [k]: v }));
  const exportar = () => {
    setTentou(true);
    if (falta.length) return;
    try { localStorage.setItem(CHAVE, JSON.stringify(o)); } catch { /* ignore */ }
    onExportar(o);
  };
  const campo = (k: keyof OpcoesExport, rotulo: string, obrigatorio = false, ph = "") => {
    const vazio = obrigatorio && tentou && !String(o[k]).trim();
    return (
      <label className="flex flex-col gap-1 text-[12px] font-semibold text-slate-600 dark:text-white/70">
        <span>{rotulo}{obrigatorio && <span className="text-rose-500"> *</span>}</span>
        <input value={o[k]} placeholder={ph} onChange={(e) => mudar(k, e.target.value)} aria-invalid={vazio || undefined}
          className={`h-9 rounded-lg border px-2.5 text-[13px] font-normal bg-white dark:bg-white/[0.05] text-slate-900 dark:text-white outline-none focus:border-[#2b579a] ${vazio ? "border-rose-400" : "border-slate-300 dark:border-white/15"}`} />
      </label>
    );
  };
  return (
    <div className="absolute inset-0 z-50 grid place-items-center bg-black/40 backdrop-blur-[2px] p-3" onClick={onFechar}>
      <div role="dialog" aria-modal="true" aria-label={peca ? "Exportar peça" : "Exportar trabalho"} onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[520px] max-h-full overflow-y-auto rounded-2xl bg-white dark:bg-[#15171c] text-slate-900 dark:text-white shadow-2xl border border-slate-200 dark:border-white/10">
        <div className="flex items-center gap-2 px-4 pt-4">
          <h3 className="flex-1 text-[15px] font-bold">{peca ? "Exportar peça" : "Exportar trabalho"}</h3>
          <button type="button" onClick={onFechar} aria-label="Fechar" className="h-8 w-8 grid place-items-center rounded-md hover:bg-slate-100 dark:hover:bg-white/10"><X size={16} /></button>
        </div>

        {peca ? (
          <p className="px-4 pt-3 text-[12.5px] text-slate-600 dark:text-white/65">
            A peça sai como está no editor: título e partes, sem capa, folha de rosto ou resumo (isso é de trabalho acadêmico).
          </p>
        ) : (<>
        <div className="px-4 pt-3">
          <p className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-white/50 mb-1.5">Norma</p>
          <div role="radiogroup" aria-label="Norma" className="grid grid-cols-3 gap-1.5">
            {ESTILOS.map((e) => (
              <button key={e.id} type="button" role="radio" aria-checked={o.estilo === e.id} title={e.dica} onClick={() => mudar("estilo", e.id)}
                className={`h-10 rounded-lg border text-[13px] font-bold transition-colors ${o.estilo === e.id ? "border-[#2b579a] bg-[#2b579a]/10 text-[#2b579a] dark:text-white dark:bg-white/10 dark:border-white/40" : "border-slate-300 dark:border-white/15 text-slate-600 dark:text-white/70 hover:border-slate-400"}`}>
                {e.nome}
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-[11.5px] text-slate-500 dark:text-white/50">{ESTILOS.find((e) => e.id === o.estilo)?.dica}</p>
        </div>

        <div className="px-4 pt-3 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {campo("author", "Autor(a)")}
          {campo("institution", "Instituição", o.estilo === "abnt", "Ex.: Universidade Federal do Ceará")}
          {campo("course", "Curso")}
          {campo("advisor", "Orientador(a)")}
          {campo("city", "Cidade", o.estilo === "abnt", "Ex.: Fortaleza")}
          {campo("year", "Ano")}
        </div>
        </>)}

        <div className="px-4 pt-3">
          <p className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-white/50 mb-1.5">Formato</p>
          <div role="radiogroup" aria-label="Formato" className="flex gap-1.5">
            {(["docx", "pdf"] as const).map((f) => (
              <button key={f} type="button" role="radio" aria-checked={o.formato === f} onClick={() => mudar("formato", f)}
                className={`h-9 px-4 rounded-lg border text-[12.5px] font-bold uppercase ${o.formato === f ? "border-[#2b579a] bg-[#2b579a]/10 text-[#2b579a] dark:text-white dark:bg-white/10 dark:border-white/40" : "border-slate-300 dark:border-white/15 text-slate-600 dark:text-white/70"}`}>
                {f === "docx" ? "Word (.docx)" : "PDF"}
              </button>
            ))}
          </div>
        </div>

        {(tentou && falta.length > 0) && <p role="alert" className="mx-4 mt-3 text-[12.5px] text-rose-600 dark:text-rose-300">Na ABNT a capa precisa de: {falta.join(" e ")}.</p>}
        {erro && <p role="alert" className="mx-4 mt-3 text-[12.5px] text-rose-600 dark:text-rose-300">{erro}</p>}

        <div className="flex items-center justify-end gap-2 p-4">
          <button type="button" onClick={onFechar} className="h-9 px-4 rounded-lg text-[13px] text-slate-600 dark:text-white/70 hover:bg-slate-100 dark:hover:bg-white/10">Cancelar</button>
          <button type="button" onClick={exportar} disabled={exportando}
            className="h-9 px-4 rounded-lg text-[13px] font-bold text-white bg-[#2b579a] hover:bg-[#244a85] disabled:opacity-50 inline-flex items-center gap-1.5">
            {exportando ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} Exportar
          </button>
        </div>
      </div>
    </div>
  );
}
