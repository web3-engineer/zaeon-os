"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";

/**
 * O TRILHO dos carrosséis da landing — a mecânica do carrossel dos agentes (components/main/MentoresCarrossel), tirada
 * pra cá pra outra seção andar IGUAL (o dono, out/2026: "coloque o carrossel do mesmo jeito da seção dos AI agents" —
 * a dos blueprints): glide CONTÍNUO e suave, lista duplicada pro laço sem costura, o item que passa pelo MEIO ganha
 * destaque, setas no desktop.
 *
 * O QUE O SEGURA — e o que DELIBERADAMENTE não segura:
 * - ARRASTO / FOCO: com o dedo no trilho ou navegando por teclado dentro dele, o glide fica quieto.
 * - ROLAGEM MANUAL: depois que a pessoa empurra, espera 8 s antes de voltar (seta: 5 s).
 * - FORA DA TELA: não anda (senão quem chega encontra a prateleira no fim).
 * - NÃO pausa no HOVER: o trilho ocupa quase a largura toda — pausar no hover deixava o carrossel PARADO o tempo
 *   todo em que a pessoa olhava pra ele.
 * A visibilidade é um `getBoundingClientRect` no próprio quadro (não um IntersectionObserver: um observer criado com
 * a aba em segundo plano pode receber um único "fora da tela" e travar o trilho pra sempre).
 * `prefers-reduced-motion` desliga o glide; as setas continuam.
 */
export default function TrilhoCarrossel({
  n,
  render,
  rotulo,
  trilhoRef: refDeFora,
  rotuloSetas = { anterior: "Anteriores", proximo: "Próximos" },
  className = "",
  chave,
}: {
  /** quantos itens (o trilho desenha 2×n: a lista duplicada) */
  n: number;
  /** o item `i` (0..n−1); `indice` = a posição no trilho duplicado; `noCentro` = passando pelo meio */
  render: (i: number, o: { indice: number; noCentro: boolean }) => React.ReactNode;
  /** à esquerda das setas (ex.: "13 mentores · ao vivo") */
  rotulo?: React.ReactNode;
  /** o ref do trilho, quando quem usa precisa dele (ex.: o holofote dos crachás) */
  trilhoRef?: React.RefObject<HTMLDivElement>;
  rotuloSetas?: { anterior: string; proximo: string };
  className?: string;
  /** muda quando a lista muda (refaz as medidas) */
  chave?: unknown;
}) {
  const proprio = useRef<HTMLDivElement>(null);
  const trilhoRef = refDeFora ?? proprio;
  /** o item cujo centro está mais perto do MEIO do trilho */
  const [centro, setCentro] = useState(-1);
  const [podeVoltar, setPodeVoltar] = useState(false);
  const [podeAvancar, setPodeAvancar] = useState(true);
  const [semMovimento, setSemMovimento] = useState(false);
  /** arrasto em curso ou foco dentro do trilho (hover NÃO entra aqui, de propósito) */
  const pausadoRef = useRef(false);
  /** até quando o glide fica quieto depois de um toque */
  const esperaAteRef = useRef(0);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setSemMovimento(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const sincronizarSetas = useCallback(() => {
    const el = trilhoRef.current;
    if (!el) return;
    setPodeVoltar(el.scrollLeft > 8);
    setPodeAvancar(el.scrollLeft + el.clientWidth < el.scrollWidth - 8);
  }, [trilhoRef]);

  useEffect(() => {
    sincronizarSetas();
    const el = trilhoRef.current;
    if (!el) return;
    el.addEventListener("scroll", sincronizarSetas, { passive: true });
    window.addEventListener("resize", sincronizarSetas);
    return () => {
      el.removeEventListener("scroll", sincronizarSetas);
      window.removeEventListener("resize", sincronizarSetas);
    };
  }, [sincronizarSetas, trilhoRef, n, chave]);

  /** largura de um passo = um cartão real medido agora, nunca um número chutado */
  const andar = (direcao: 1 | -1) => {
    const el = trilhoRef.current;
    if (!el) return;
    esperaAteRef.current = Date.now() + 5000;   // seta clicada → deixa a pessoa olhar
    const cartao = el.firstElementChild as HTMLElement | null;
    el.scrollBy({ left: (cartao ? cartao.getBoundingClientRect().width + 16 : el.clientWidth * 0.8) * direcao, behavior: "smooth" });
  };

  // rede de segurança: soltou o dedo FORA do trilho → o `pointerup` do elemento não chega; o do documento sempre chega
  useEffect(() => {
    const soltou = () => {
      if (!pausadoRef.current) return;   // (só se o arrasto COMEÇOU no trilho)
      pausadoRef.current = false;
      esperaAteRef.current = Date.now() + 8000;
    };
    document.addEventListener("pointerup", soltou);
    document.addEventListener("pointercancel", soltou);
    return () => {
      document.removeEventListener("pointerup", soltou);
      document.removeEventListener("pointercancel", soltou);
    };
  }, []);

  // o GLIDE contínuo: poucos px por quadro; a lista é duplicada, então ao cruzar a 1ª metade volta o equivalente
  useEffect(() => {
    if (semMovimento) return;
    const el = trilhoRef.current;
    if (!el) return;
    const VEL = 0.5;   // px por quadro (~30 px/s a 60 fps): presente, sem distrair
    let raf = 0, quadro = 0;
    const passo = () => {
      raf = requestAnimationFrame(passo);
      if (document.hidden) return;
      const r = el.getBoundingClientRect();
      if (!(r.bottom > 0 && r.top < window.innerHeight)) return;
      // quem está passando pelo MEIO (a cada 6 quadros — barato; vale mesmo com o trilho parado/arrastado)
      if (++quadro % 6 === 0) {
        const meioX = r.left + r.width / 2;
        let melhor = -1, dist = Infinity;
        [...el.children].forEach((c, i) => {
          const b = c.getBoundingClientRect();
          const d = Math.abs(b.left + b.width / 2 - meioX);
          if (d < dist) { dist = d; melhor = i; }
        });
        setCentro((atual) => (atual === melhor ? atual : melhor));
      }
      if (pausadoRef.current || Date.now() < esperaAteRef.current) return;
      el.scrollLeft += VEL;
      const meia = el.scrollWidth / 2;
      if (meia > 0 && el.scrollLeft >= meia) el.scrollLeft -= meia;
    };
    raf = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(raf);
  }, [semMovimento, trilhoRef, n, chave]);

  return (
    <div className={className}>
      <div className="mb-6 flex items-end justify-between gap-6">
        {rotulo ?? <span />}
        {/* as setas são conveniência de desktop (no celular o dedo já faz isso) */}
        <div className="hidden md:flex gap-2">
          <Seta direcao="anterior" rotulo={rotuloSetas.anterior} ativa={podeVoltar} onClick={() => andar(-1)} />
          <Seta direcao="proximo" rotulo={rotuloSetas.proximo} ativa={podeAvancar} onClick={() => andar(1)} />
        </div>
      </div>

      {/* o trilho fica DENTRO da calha da página: o primeiro cartão nasce na margem do título e o último visível é
          cortado na borda do container — o corte diz "tem mais" (sangrar até a borda exigiria 100vw e rolagem lateral) */}
      <div
        ref={trilhoRef}
        onPointerDown={() => { pausadoRef.current = true; }}
        onPointerUp={() => { pausadoRef.current = false; esperaAteRef.current = Date.now() + 8000; }}
        onWheel={() => { esperaAteRef.current = Date.now() + 5000; }}
        onFocusCapture={() => { pausadoRef.current = true; }}
        onBlurCapture={() => { pausadoRef.current = false; }}
        className="flex gap-4 overflow-x-auto pt-8 pb-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {/* lista DUPLICADA: alimenta o laço sem costura do glide */}
        {Array.from({ length: n * 2 }, (_, k) => (
          <React.Fragment key={k}>{render(k % n, { indice: k, noCentro: k === centro })}</React.Fragment>
        ))}
      </div>
    </div>
  );
}

function Seta({ direcao, rotulo, ativa, onClick }: { direcao: "anterior" | "proximo"; rotulo: string; ativa: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!ativa}
      aria-label={rotulo}
      className="grid h-9 w-9 place-items-center rounded-full border border-slate-200 dark:border-white/12 bg-white/70 dark:bg-white/[0.05] text-slate-700 dark:text-white/80 transition-opacity disabled:opacity-25 hover:bg-white dark:hover:bg-white/[0.10]"
    >
      <span aria-hidden="true" className="text-sm leading-none">{direcao === "anterior" ? "←" : "→"}</span>
    </button>
  );
}
