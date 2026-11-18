"use client";

/**
 * GeometriaDinamica — a construção da skill `geometria-jsxgraph` desenhada no chat, com os pontos
 * livres arrastáveis e o resto acompanhando. Quem desenha é o JSXGraph (MIT ou LGPL, Universidade
 * de Bayreuth), carregado sob demanda: a biblioteca é grande e só entra na página de quem recebe
 * uma figura.
 *
 * O JSON vem do modelo e passa por lib/chat/geometria (vocabulário fechado, dependência em ordem).
 * Duas coisas que o modelo escreveu NUNCA chegam cruas à biblioteca: a expressão de função (o
 * JSXGraph a interpretaria — aqui ela vira função pelo parser fechado de lib/chat/expr) e qualquer
 * texto além do `nome`, que o validador limita a letra, dígito, `_` e `'`.
 *
 * Antes de a biblioteca carregar, e se ela falhar, a lista da construção continua na tela: a
 * figura nunca some em silêncio.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { compilarExpr } from "@/lib/chat/expr";
import {
  caixaDaConstrucao, classeDoTipo, parseGeometria, pontosLivres, type ElementoGeometria,
} from "@/lib/chat/geometria";

/** O pedaço da API do JSXGraph que este componente usa. */
export type QuadroJXG = { create(tipo: string, pais: unknown[], atributos?: Record<string, unknown>): unknown };
type JXGMod = { JSXGraph: { initBoard(el: HTMLElement, attrs: Record<string, unknown>): QuadroJXG; freeBoard(b: QuadroJXG): void } };

const COR_LIVRE = "#0891b2";      // ponto que o aluno arrasta
const COR_DEPENDENTE = "#6366f1"; // o que a construção deriva
const COR_CURVA = "#f59e0b";

/** PURO: os atributos de desenho de um elemento. */
export function atributosDoElemento(e: ElementoGeometria): Record<string, unknown> {
  const classe = classeDoTipo(e.tipo);
  if (e.tipo === "point") {
    return { name: e.nome, size: 4, fillColor: COR_LIVRE, strokeColor: COR_LIVRE, highlightFillColor: COR_LIVRE };
  }
  if (classe === "ponto") {
    return { name: e.nome, size: 3, fillColor: COR_DEPENDENTE, strokeColor: COR_DEPENDENTE, fixed: true };
  }
  if (classe === "poligono") {
    return { name: e.nome, withLabel: false, fillColor: COR_DEPENDENTE, fillOpacity: 0.12, borders: { strokeColor: COR_DEPENDENTE, strokeWidth: 2 }, vertices: { visible: false } };
  }
  if (classe === "curva") return { name: e.nome, withLabel: false, strokeColor: COR_CURVA, strokeWidth: 2 };
  if (classe === "circulo") return { name: e.nome, withLabel: false, strokeColor: COR_DEPENDENTE, strokeWidth: 2, fillOpacity: 0 };
  // reta: o segmento é o dado do enunciado (traço cheio); as retas auxiliares saem tracejadas
  return { name: e.nome, withLabel: false, strokeColor: COR_DEPENDENTE, strokeWidth: 2, dash: e.tipo === "segment" || e.tipo === "line" ? 0 : 2 };
}

/**
 * Monta a construção num quadro, na ordem (o validador já garantiu que cada pai veio antes).
 * Exportada para o teste conferir, com um quadro falso, exatamente o que chega à biblioteca.
 */
export function montarConstrucao(quadro: QuadroJXG, elementos: ElementoGeometria[]): void {
  const feitos = new Map<string, unknown>();
  for (const e of elementos) {
    let pais: unknown[];
    if (e.tipo === "point") pais = e.pais;
    else if (e.tipo === "functiongraph") pais = [compilarExpr(e.pais[0] as string)];
    else pais = e.pais.map((p) => (typeof p === "string" ? feitos.get(p) : p));
    feitos.set(e.nome, quadro.create(e.tipo, pais, atributosDoElemento(e)));
  }
}

export default function GeometriaDinamica({ json }: { json: string }) {
  const r = useMemo(() => parseGeometria(json), [json]);
  const alvo = useRef<HTMLDivElement>(null);
  const [estado, setEstado] = useState<"carregando" | "pronto" | "falhou">("carregando");

  useEffect(() => {
    if (!r.ok || !alvo.current) return;
    let vivo = true;
    let jxg: JXGMod | null = null;
    let quadro: QuadroJXG | null = null;
    setEstado("carregando");
    import("jsxgraph")
      .then((m) => {
        if (!vivo || !alvo.current) return;
        jxg = ((m as unknown as { default?: JXGMod }).default ?? (m as unknown as JXGMod));
        quadro = jxg.JSXGraph.initBoard(alvo.current, {
          boundingbox: caixaDaConstrucao(r.elementos),
          keepAspectRatio: true,
          axis: true,
          showCopyright: false,
          showNavigation: false,
          // a página rola por cima da figura: sem zoom na roda e sem arrastar o plano
          zoom: { wheel: false },
          pan: { enabled: false },
        });
        montarConstrucao(quadro, r.elementos);
        setEstado("pronto");
      })
      .catch(() => { if (vivo) setEstado("falhou"); });
    return () => {
      vivo = false;
      if (jxg && quadro) { try { jxg.JSXGraph.freeBoard(quadro); } catch { /* quadro já liberado */ } }
    };
  }, [r]);

  if (!r.ok) {
    return (
      <div data-geometria-erro className="my-2 rounded-xl border border-amber-300/50 bg-amber-50/60 dark:bg-amber-400/[0.07] px-3 py-2 text-[12px] text-amber-800 dark:text-amber-200">
        Não consegui desenhar esta construção ({r.erro}).
      </div>
    );
  }

  const livres = pontosLivres(r.elementos).map((e) => e.nome);
  return (
    <figure data-geometria aria-label={`Construção geométrica com ${r.elementos.length} elementos: ${r.elementos.map((e) => e.papel || e.nome).join("; ")}`} className="my-3 w-full max-w-[600px]">
      {/* o JSXGraph assume o role e o aria-label do próprio quadro; a descrição fica na figura */}
      <div
        ref={alvo}
        data-geometria-quadro
        className={`relative aspect-square w-full touch-none select-none overflow-hidden rounded-xl border border-slate-200 dark:border-white/10 bg-white ${estado === "falhou" ? "hidden" : ""}`}
      />
      <figcaption className="mt-1.5 text-[12px] text-slate-600 dark:text-white/60">
        {estado === "falhou"
          ? "Não foi possível carregar o desenho; a construção está descrita abaixo."
          : livres.length
            ? `Arraste ${livres.length === 1 ? "o ponto" : "os pontos"} ${livres.join(", ")} — o resto da figura acompanha.`
            : "Gráfico de função."}
      </figcaption>
      <details open={estado === "falhou"} className="mt-1 text-[12px] text-slate-600 dark:text-white/60">
        <summary className="cursor-pointer select-none">Passos da construção ({r.elementos.length})</summary>
        <ol data-geometria-passos className="mt-1 list-decimal pl-5 leading-[1.5]">
          {r.elementos.map((e) => (
            <li key={e.nome}><span className="font-mono font-semibold text-slate-800 dark:text-white/85">{e.nome}</span>{e.papel ? ` — ${e.papel}` : ""}</li>
          ))}
        </ol>
      </details>
    </figure>
  );
}
