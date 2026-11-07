"use client";
/**
 * CenaDoCorpo — a casca React em volta de `lib/anatomia/cena.ts`.
 *
 * Ela faz TRÊS coisas e nenhuma mais: dá um `div` para a cena morar, lê o estado por ref (para o
 * laço de animação não fechar sobre um estado velho — padrão do original) e desmonta tudo.
 *
 * Por que tão fina: a cena é three.js imperativo e não ganha nada em virar JSX. O que o React
 * faria aqui — recriar objetos a cada render — é exatamente o que mata o desempenho de 2.234
 * malhas. Então o React fica de fora do laço, e esta casca é a fronteira.
 *
 * `atlas` entra na lista de dependências do efeito e `estado` NÃO: trocar de atlas remonta a cena,
 * trocar de estado é lido pelo laço no quadro seguinte. Era assim no original e é o que evita
 * reconstruir 90 MB de geometria ao mexer num cursor.
 */
import { useEffect, useRef } from "react";
import type { Atlas, EstadoCena } from "@/lib/anatomia/atlas";
import { montarCena } from "@/lib/anatomia/cena";

type Props = {
  atlas: Atlas;
  estado: EstadoCena;
  aoSelecionar: (idDaPeca: string) => void;
  aoProgredir: (porcento: number) => void;
  aoErrar: (mensagem: string) => void;
};

export default function CenaDoCorpo({ atlas, estado, aoSelecionar, aoProgredir, aoErrar }: Props) {
  const hospede = useRef<HTMLDivElement>(null);
  // refs lidas pelo laço: sempre a versão mais recente, sem remontar a cena
  const estadoRef = useRef(estado);
  const selecionarRef = useRef(aoSelecionar);
  const progredirRef = useRef(aoProgredir);
  const errarRef = useRef(aoErrar);
  estadoRef.current = estado;
  selecionarRef.current = aoSelecionar;
  progredirRef.current = aoProgredir;
  errarRef.current = aoErrar;

  useEffect(() => {
    const el = hospede.current;
    if (!el) return;
    return montarCena({
      atlas,
      hospede: el,
      estadoAtual: () => estadoRef.current,
      aoSelecionar: (id) => selecionarRef.current(id),
      aoProgredir: (n) => progredirRef.current(n),
      aoErrar: (m) => errarRef.current(m),
    });
  }, [atlas]);

  return <div ref={hospede} className="absolute inset-0 touch-none [&>canvas]:block [&>canvas]:h-full [&>canvas]:w-full" />;
}
