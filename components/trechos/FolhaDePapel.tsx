"use client";

/**
 * FolhaDePapel — um TRECHO do material da pessoa como uma folha de caderno escrita à mão (lib/trechos).
 *
 * A animação conta a história do trecho: a folha cai e se assenta (presa por uma fita), o contexto aparece a lápis,
 * a CITAÇÃO é escrita palavra por palavra em caneta azul e, quando termina, o marca-texto passa por cima. Com
 * "reduzir movimento" do sistema, a folha já aparece pronta. Anima uma vez, quando entra na tela.
 */
import { useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Check, Copy, FileText } from "lucide-react";
import type { TrechoEmPapel } from "@/lib/agent/contracts";
import { ROTULO_RELEVANCIA, textoParaCopiar } from "@/lib/trechos/folhas";
import "@/components/trechos/folha.css";

const INCLINACAO = [-0.7, 0.55, -0.35, 0.8, -0.5];
const COR_CARIMBO: Record<TrechoEmPapel["relevancia"], string> = { 3: "#b23a2a", 2: "#2f5f9e", 1: "#7a6a52" };

export function FolhaDePapel({ trecho, indice = 0, animar = true }: { trecho: TrechoEmPapel; indice?: number; animar?: boolean }) {
  const calmo = useReducedMotion() || !animar;
  const palavras = useMemo(() => trecho.citacao.split(/(\s+)/), [trecho.citacao]);
  const nPalavras = palavras.filter((p) => p.trim()).length || 1;
  // a escrita inteira cabe em ~2,4 s, seja a citação curta ou longa
  const passo = Math.min(0.06, 2.4 / nPalavras);
  const comecaEscrita = 0.45;
  const fimEscrita = comecaEscrita + nPalavras * passo;
  const [marcada, setMarcada] = useState(calmo);
  const [copiado, setCopiado] = useState(false);
  const inclina = INCLINACAO[indice % INCLINACAO.length]!;

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(textoParaCopiar(trecho));
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1600);
    } catch { /* sem permissão de área de transferência: nada a fazer */ }
  };

  let w = 0;
  return (
    <motion.figure
      data-trecho={trecho.id}
      className="folha-papel group my-5 max-w-[600px] pl-11 pr-5 pt-6 pb-4"
      style={{ rotate: `${inclina}deg` }}
      initial={calmo ? false : { opacity: 0, y: 22, rotateX: -16, scale: 0.97 }}
      whileInView={calmo ? undefined : { opacity: 1, y: 0, rotateX: 0, scale: 1 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ type: "spring", stiffness: 170, damping: 19, mass: 0.9, delay: 0.05 * indice }}
      onAnimationComplete={() => { if (!calmo) setTimeout(() => setMarcada(true), Math.max(0, (fimEscrita - 0.3) * 1000)); }}
    >
      <span aria-hidden className="folha-fita" />

      {/* cabeçalho: de onde é a folha */}
      <figcaption className="folha-mao mb-1 flex flex-wrap items-center gap-x-2 text-[19px] leading-[30px] text-[#5a3d1e]">
        <FileText aria-hidden className="h-4 w-4 shrink-0 opacity-70" />
        <span className="min-w-0 break-words sm:truncate">{trecho.titulo}</span>
        {trecho.paginas && <span className="shrink-0 opacity-80">· p. {trecho.paginas}</span>}
        <span className="folha-carimbo ml-auto shrink-0" style={{ color: COR_CARIMBO[trecho.relevancia] }}>
          {ROTULO_RELEVANCIA[trecho.relevancia]}
        </span>
        <button
          type="button"
          onClick={copiar}
          aria-label="Copiar trecho com a referência"
          className="shrink-0 rounded p-1 text-[#5a3d1e] opacity-0 transition-opacity hover:bg-black/5 focus-visible:opacity-100 group-hover:opacity-70"
        >
          {copiado ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        </button>
      </figcaption>

      {/* o texto: lápis · caneta + marca-texto · lápis */}
      <blockquote className="folha-mao folha-texto m-0">
        {trecho.antes && (
          <motion.span
            className="folha-lapis"
            initial={calmo ? false : { opacity: 0 }}
            whileInView={calmo ? undefined : { opacity: 0.72 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.25 }}
          >
            {trecho.antes}{" "}
          </motion.span>
        )}
        <span className="folha-tinta folha-marca" data-pronta={marcada} style={{ transition: calmo ? "none" : "background-size .9s cubic-bezier(.22,1,.36,1)" }}>
          {calmo
            ? trecho.citacao
            : palavras.map((p, i) => {
                if (!p.trim()) return p;
                const k = w++;
                return (
                  <motion.span
                    key={i}
                    className="inline-block"
                    initial={{ opacity: 0, y: 3, filter: "blur(2px)" }}
                    whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.28, delay: comecaEscrita + k * passo, ease: "easeOut" }}
                  >
                    {p}
                  </motion.span>
                );
              })}
        </span>
        {trecho.depois && (
          <motion.span
            className="folha-lapis"
            initial={calmo ? false : { opacity: 0 }}
            whileInView={calmo ? undefined : { opacity: 0.72 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: fimEscrita }}
          >
            {" "}{trecho.depois}
          </motion.span>
        )}
      </blockquote>

      {trecho.motivo && (
        <motion.p
          className="folha-mao mt-2 text-[18px] leading-[30px] text-[#7b4a22]"
          initial={calmo ? false : { opacity: 0, x: -6 }}
          whileInView={calmo ? undefined : { opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: fimEscrita + 0.5 }}
        >
          ↳ {trecho.motivo}
        </motion.p>
      )}
    </motion.figure>
  );
}

/** Várias folhas em sequência (a pilha que entra depois de um parágrafo, ou no fim da resposta). */
export function FolhasDePapel({ trechos, animar = true, inicio = 0 }: { trechos: readonly TrechoEmPapel[]; animar?: boolean; inicio?: number }) {
  if (!trechos.length) return null;
  return (
    <div className="my-2" style={{ perspective: 900 }}>
      {trechos.map((t, i) => <FolhaDePapel key={t.id} trecho={t} indice={inicio + i} animar={animar} />)}
    </div>
  );
}

export default FolhaDePapel;
