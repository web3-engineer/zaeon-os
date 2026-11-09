"use client";
/**
 * AnatomiaView — o artefato de estrutura anatômica no chat e na biblioteca.
 *
 * ────────────────────────── por que começa em FATOS e não em 3D ──────────────────────────
 * Montar a cena custa o atlas inteiro: `/models/atlas.json` (1,3 MB) mais os 15 pedaços binários de
 * geometria que `montarCena` baixa — dezenas de MB. Numa resposta de chat isso seria cobrado de toda
 * pessoa que passasse o olho, inclusive de quem só queria ler. Então o padrão é a PLACA: nome da
 * estrutura, quantas malhas, que sistemas atravessa, a explicação e a fonte. O 3D monta quando a
 * pessoa pede — mesmo molde do CadView (PNG primeiro, three só sob demanda) e do MoleculeView.
 *
 * Um componente e UM portão: `modo` vale para o cartão e para a figura (`nu`, o Modo Revista). O que
 * o `nu` tira é a moldura, não a escolha.
 *
 * `CenaDoCorpo` entra por import DINÂMICO com `ssr: false` — ele é three.js imperativo e quebra em
 * SSR, e é assim que `AtlasDoCorpo` já o monta. Em teste ele nunca é alcançado: a placa não chama
 * WebGL, e é a placa que o teste renderiza.
 */
import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Box, FileText, Layers, ExternalLink } from "lucide-react";
import type { Atlas, EstadoCena, SistemaId } from "@/lib/anatomia/atlas";

const CenaDoCorpo = dynamic(() => import("@/components/anatomia/CenaDoCorpo"), { ssr: false });

export type AnatomiaData = {
  conceito?: { id?: string; nome?: string };
  estado?: EstadoCena;
  sistemas?: string[];
  sistemasIds?: SistemaId[];
  pecas?: number;
  explicacao?: string;
  termoBuscado?: string;
  viaSinonimo?: boolean;
  alternativas?: { id: string; nome: string; pecas: number }[];
  fonte?: { title?: string; url?: string };
  aviso?: string;
};

/** PURA: o rótulo de contagem. Separada porque "1 malhas" é o tipo de detalhe que ninguém testa. */
export function rotuloDeMalhas(n: unknown): string {
  const k = typeof n === "number" && Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
  if (!k) return "sem malha";
  return k === 1 ? "1 malha" : `${k.toLocaleString("pt-BR")} malhas`;
}

/** PURA: o estado é utilizável? Sem peça selecionada a cena desenha o corpo todo sem destaque. */
export function cenaUtilizavel(d: AnatomiaData): boolean {
  return Array.isArray(d.estado?.selected) && d.estado!.selected.length > 0;
}

/** O visor 3D. Só monta quando chamado — busca o atlas na hora e solta na saída. */
function Visor({ estado }: { estado: EstadoCena }) {
  const [atlas, setAtlas] = useState<Atlas | null>(null);
  const [pct, setPct] = useState(0);
  const [erro, setErro] = useState<string | null>(null);
  const vivo = useRef(true);

  useEffect(() => {
    vivo.current = true;
    const aborto = new AbortController();
    fetch("/models/atlas.json", { signal: aborto.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((d) => { if (vivo.current) setAtlas(d as Atlas); })
      .catch((e) => { if (vivo.current && e?.name !== "AbortError") setErro("não consegui carregar o atlas"); });
    return () => { vivo.current = false; aborto.abort(); };
  }, []);

  if (erro) {
    return <div className="absolute inset-0 grid place-items-center px-4 text-center text-[12px] text-slate-500 dark:text-white/60">{erro}</div>;
  }
  if (!atlas) {
    return (
      <div className="absolute inset-0 grid place-items-center text-[11px] text-slate-500 dark:text-white/60">
        carregando o atlas…
      </div>
    );
  }
  return (
    <>
      <CenaDoCorpo
        atlas={atlas}
        estado={estado}
        aoSelecionar={() => { /* o card não troca de estrutura: quem faz isso é a página /anatomia */ }}
        aoProgredir={setPct}
        aoErrar={(m) => setErro(m)}
      />
      {pct > 0 && pct < 100 && (
        <div className="absolute inset-x-0 bottom-0 h-0.5 bg-slate-200/60 dark:bg-white/10">
          <div className="h-full bg-cyan-400 transition-[width]" style={{ width: `${pct}%` }} />
        </div>
      )}
    </>
  );
}

/** A placa: o que o aluno lê sem baixar geometria nenhuma. */
function Placa({ d, compacta }: { d: AnatomiaData; compacta?: boolean }) {
  const nome = d.conceito?.nome || d.termoBuscado || "estrutura";
  return (
    <div className={`flex flex-col gap-2 ${compacta ? "p-3" : "p-4"}`}>
      <div className="flex items-baseline gap-2 flex-wrap">
        <span className="text-[14px] font-black text-slate-800 dark:text-white/90">{nome}</span>
        {d.conceito?.id && <span className="text-[10px] font-mono text-slate-400 dark:text-white/40">{d.conceito.id}</span>}
      </div>
      <div className="flex items-center gap-2 flex-wrap text-[11px] text-slate-600 dark:text-white/60">
        <span className="inline-flex items-center gap-1"><Layers size={11} />{rotuloDeMalhas(d.pecas)}</span>
        {!!d.sistemas?.length && <span>· {d.sistemas.join(", ")}</span>}
      </div>
      {!compacta && d.explicacao && (
        <p className="text-[12px] leading-relaxed text-slate-700 dark:text-white/75 m-0">{d.explicacao}</p>
      )}
      {d.aviso && (
        <p className="text-[10px] leading-snug text-slate-500 dark:text-white/45 m-0">{d.aviso}</p>
      )}
    </div>
  );
}

export default function AnatomiaView({ data, nu = false }: { data: AnatomiaData; nu?: boolean }) {
  const [modo, setModo] = useState<"fatos" | "3d">("fatos");
  const podeVer3D = cenaUtilizavel(data);
  const nome = data.conceito?.nome || data.termoBuscado || "estrutura";

  // ── modo FIGURA (Modo Revista): sem moldura nem botão de fonte, mas o portão do 3D fica ──
  if (nu) {
    return (
      <figure className="relative w-full m-0" style={{ aspectRatio: "1 / 1" }}>
        <div className="absolute inset-0 rounded-2xl overflow-hidden bg-slate-100/60 dark:bg-white/[0.03] grid place-items-center">
          {modo === "3d" && podeVer3D
            ? <Visor estado={data.estado!} />
            : <Placa d={data} compacta />}
        </div>
        {modo === "fatos" && podeVer3D && (
          <button
            onClick={() => setModo("3d")}
            className="absolute bottom-2 left-1/2 -translate-x-1/2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold bg-white/80 dark:bg-black/50 text-slate-700 dark:text-white/80 border border-slate-200 dark:border-white/10"
          >
            <Box size={11} /> Ver em 3D
          </button>
        )}
        <figcaption className="sr-only">{nome}</figcaption>
      </figure>
    );
  }

  // ── modo CARTÃO ──
  return (
    <div className="flex flex-col gap-3">
      <div className="relative w-full min-h-[120px] rounded-2xl overflow-hidden bg-slate-100/60 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10">
        {modo === "3d" && podeVer3D
          ? <div className="relative w-full h-[300px]"><Visor estado={data.estado!} /></div>
          : <Placa d={data} />}
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {podeVer3D && (
          <button
            onClick={() => setModo((m) => (m === "fatos" ? "3d" : "fatos"))}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold text-slate-700 dark:text-white/80 border border-slate-200 dark:border-white/10 hover:border-cyan-400/50 transition-colors"
          >
            {modo === "fatos" ? <Box size={12} /> : <FileText size={12} />}
            {modo === "fatos" ? "Ver em 3D" : "Ver os dados"}
          </button>
        )}
        <a
          href="/anatomia"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold text-slate-700 dark:text-white/80 border border-slate-200 dark:border-white/10 hover:border-cyan-400/50 transition-colors"
        >
          <ExternalLink size={12} /> Abrir o atlas
        </a>
        {data.fonte?.url && (
          <a
            href={data.fonte.url}
            target="_blank"
            rel="noreferrer noopener"
            className="ml-auto text-[10px] text-slate-500 dark:text-white/45 hover:underline"
            title={data.fonte.title}
          >
            {data.fonte.title || "fonte"}
          </a>
        )}
      </div>
    </div>
  );
}
