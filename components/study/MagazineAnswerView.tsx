"use client";

/**
 * MagazineAnswerView — a resposta da Aura como página de revista (Sala de Estudos).
 *
 * Variante de renderização do MESMO `StructuredAnswer` que o StructuredAnswerView
 * desenha; não substitui nada. Se qualquer coisa falhar aqui, quem chama cai no
 * renderer antigo (ver `podeVirarRevista` + try/catch no StudyCoworkChat).
 *
 * Divisão de trabalho, que é o ponto do plano:
 *   • o harness decide O QUE dizer, quais termos importam, qual artefato entra;
 *   • esta camada decide ONDE cada letra nasce — e não raciocina sobre nada.
 *
 * Como o texto e o artefato convivem: o artefato continua sendo o componente React de
 * sempre (MoleculeView e cia), posicionado em cima do canvas; o motor só reserva o
 * espaço dele como obstáculo e o texto flui em volta. Nada é redesenhado dentro do
 * canvas — seria refazer o Studio inteiro em 2D.
 *
 * Acessibilidade: o canvas é `aria-hidden` e existe SEMPRE uma cópia em DOM do texto.
 * Durante o stream ela fica invisível (leitor de tela lê); no fim, o canvas some e a
 * cópia assume, posicionada palavra a palavra nas MESMAS coordenadas — aí o texto é
 * selecionável e encontrável pelo Ctrl+F.
 */

import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import type { StructuredAnswer } from "@/lib/agent/contracts";
import StudioBlock, { type StudioBlockData } from "@/components/studio/StudioBlock";
import MoleculeView from "@/components/studio/MoleculeView";
import { agendarChegada, chegadaInstantanea, DURACAO_CHEGADA, DURACAO_LETRA, RESPIRO_FINAL } from "@/lib/magazine/chegada";
import { familiaDaVariavel, fonteCanvas, aplicarFonte, QUEDA_CORPO, QUEDA_DISPLAY } from "@/lib/magazine/fontes";
import {
  medirDestaques, posicionarDestaques, FOLGA_DESTAQUE,
  type DestaqueMedido,
} from "@/lib/magazine/destaque";
import "katex/dist/katex.min.css";
import { temMatematica } from "@/lib/chat/matematica";
import {
  montarLayout, obstaculoCapitular, topoDaLinha, baselineNaLinha,
  type Obstaculo, type Resultado, type Metricas,
} from "@/lib/magazine/layout";
import { medirTexto, emParagrafos, contarPalavras, normalizar, type TextoMedido } from "@/lib/magazine/medir";

/* ─────────────────────────── critério de ativação (§10) ─────────────────────────── */

/**
 * Piso, não meta. 120 palavras deixou o Modo Revista invisível; 70 deixou ele
 * INTERMITENTE, que é pior — a mesma sala mudava de cara a cada resposta e parecia
 * defeito. Agora só a resposta de uma linha ("pode ser", "isso mesmo") fica no balão;
 * o resto é sempre página. Consistência vale mais que a página perfeita.
 */
export const MIN_PALAVRAS_REVISTA = 25;

/**
 * Com artefato o piso cai, mas não some. `temArtefato ||` sozinho mandava pra página
 * QUALQUER resposta com molécula, inclusive "A cafeína é um alcaloide." — e uma página
 * de revista com cinco palavras não é uma página, é uma legenda perdida. Doze palavras
 * é o mínimo pra existir texto contornando a figura.
 */
export const MIN_PALAVRAS_COM_ARTEFATO = 12;

/**
 * O corpo da página. `desenvolvimento` é opcional no contrato e SÓ o intent
 * `explicar_conceito` o exige — `conversa` e `duvida_rapida` mandam apenas `nucleo`.
 * Exigir desenvolvimento deixava o Modo Revista praticamente desligado na prática.
 */
export function corpoDaResposta(a: StructuredAnswer | undefined): string {
  return (a?.desenvolvimento?.trim() || a?.nucleo?.trim() || "");
}

export function podeVirarRevista(a: StructuredAnswer | undefined, temArtefato: boolean): boolean {
  const corpo = corpoDaResposta(a);
  if (!corpo) return false;
  // a revista desenha o corpo em CANVAS: fórmula LaTeX e ```grafico só existem no ChatMarkdown
  if (temMatematica(corpo)) return false;
  // link clicável (lista de livros, fontes) só existe no ChatMarkdown — o canvas desenha texto puro
  if (a?.livros?.length || /\[[^\]]+\]\(https?:\/\//.test(corpo)) return false;
  const palavras = contarPalavras(corpo);
  return palavras >= (temArtefato ? MIN_PALAVRAS_COM_ARTEFATO : MIN_PALAVRAS_REVISTA);
}

/* ─────────────────────────────────── tipografia ─────────────────────────────────── */

// Para o DOM (CSS de verdade resolve `var()` sem problema).
const FAMILIA_CORPO = 'var(--font-revista-corpo), Georgia, "Times New Roman", serif';
const FAMILIA_DISPLAY = 'var(--font-revista-display), Georgia, serif';

/**
 * Para o CANVAS, que NÃO resolve `var()` — ver lib/magazine/fontes.ts. Resolvidas uma vez
 * por render a partir do <html>; se a custom property ainda não existe (SSR, fonte não
 * carregada), cai em Georgia e a medição continua honesta, só com outra fonte.
 */
function familiasDoCanvas() {
  return {
    corpo: familiaDaVariavel("--font-revista-corpo", QUEDA_CORPO),
    display: familiaDaVariavel("--font-revista-display", QUEDA_DISPLAY),
  };
}

function metricasPara(
  largura: number,
  fam: { corpo: string; display: string } = familiasDoCanvas(),
): Metricas & { corpo: string; enfase: string; capitular: string } {
  const tamanho = largura < 560 ? 17 : 19;
  const entrelinha = Math.round(tamanho * 1.6);
  return {
    tamanho,
    entrelinha,
    espaco: 0, // preenchido pela medição
    corpo: fonteCanvas(400, tamanho, fam.corpo),
    enfase: fonteCanvas(600, tamanho, fam.corpo),
    capitular: fonteCanvas(600, entrelinha * 3.05, fam.display),
  };
}

const ease = (t: number) => 1 - Math.pow(1 - t, 3);
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

type Cores = { tinta: string; suave: string; ciano: string; marca: string };

function lerCores(el: HTMLElement): Cores {
  const s = getComputedStyle(el);
  // A tinta sai da cor herdada: assim o texto do canvas segue o tema do app sem
  // precisar de token novo. O resto tem par claro/escuro.
  const escuro = typeof document !== "undefined" && document.documentElement.classList.contains("dark");
  return {
    // CONTRASTE CHEIO: a tinta NÃO vem mais da cor herdada (`s.color` podia trazer alfa de um ancestral
    // `text-white/85` e deixar a 2ª resposta acinzentada). Sólida por tema.
    tinta: escuro ? "#FFFFFF" : "#0F172A",
    suave: escuro ? "#8FA1AD" : "#5C6B78",
    ciano: escuro ? "#3FD3E6" : "#0B9FB3",
    marca: escuro ? "rgba(242,210,60,.26)" : "rgba(242,210,60,.55)",
  };
}

/* ────────────────────────────────── componente ────────────────────────────────── */

export default function MagazineAnswerView({
  answer,
  streaming = false,
  recemChegada = false,
  aoAssentar,
  artefato,
  onNext,
  agente = "Aura",
}: {
  answer: StructuredAnswer;
  streaming?: boolean;
  /** Resposta que acabou de chegar (o `fresh` da mensagem) → materializa as letras. */
  recemChegada?: boolean;
  /**
   * Dispara quando a página terminou de assentar e a altura final é conhecida.
   * Quem ancora a rolagem precisa disto: a altura do bloco só existe DEPOIS do
   * layout, e ancorar antes disso ancora contra um número que ainda vai mudar.
   */
  aoAssentar?: () => void;
  artefato?: StudioBlockData | null;
  onNext?: (passo: string) => void;
  agente?: string;
}) {
  const wrap = useRef<HTMLDivElement | null>(null);
  const cv = useRef<HTMLCanvasElement | null>(null);

  const [largura, setLargura] = useState(0);
  const [assentado, setAssentado] = useState(false);
  const [dica, setDica] = useState<{ x: number; y: number; termo: string; def: string } | null>(null);

  const medidoRef = useRef<TextoMedido | null>(null);
  const layoutRef = useRef<Resultado | null>(null);
  const nascimentoRef = useRef<Float64Array | null>(null);
  const coresRef = useRef<Cores | null>(null);
  const [alturaBloco, setAlturaBloco] = useState(0);
  const [palavrasDom, setPalavrasDom] = useState<Resultado["palavras"]>([]);
  /**
   * A CAPITULAR COMO ELEMENTO, não como pincelada.
   *
   * Ela era desenhada só no canvas. Quando a materialização acabava, o canvas ia a
   * `opacity: 0` e a cópia em DOM assumia — e essa cópia nunca teve capitular. Resultado:
   * a letra aparecia por três segundos e evaporava, deixando o recuo órfão ("uando
   * falamos…"). Agora ela vive no DOM desde o primeiro frame e não depende do canvas.
   *
   * `topo` sai de `baseline - actualBoundingBoxAscent`, medido no MESMO canvas e na MESMA
   * fonte que reservou o espaço — é a única forma de o elemento cair exatamente no
   * retângulo que o motor de layout abriu pra ele.
   */
  /**
   * Destaques (LaTeX) já medidos. Ficam em ref porque `recalcular` é síncrono e não pode
   * esperar a medição — quem mede é um efeito, que depois pede um recálculo. Na primeira
   * passada a página sai sem eles e na segunda eles entram; como o layout é estável por
   * prefixo, o texto não dança.
   */
  const destaquesRef = useRef<DestaqueMedido[]>([]);
  const [destaquesPostos, setDestaquesPostos] = useState<
    { d: DestaqueMedido; x: number; y: number; w: number; h: number }[]
  >([]);
  const [capitular, setCapitular] = useState<
    { ch: string; topo: number; largura: number; fonte: string; tamanho: number } | null
  >(null);

  const semMovimento = useMemo(
    () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches,
    [],
  );

  const paragrafos = useMemo(() => emParagrafos(corpoDaResposta(answer)), [answer]);
  /** Molécula tem tratamento próprio: vira figura, não cartão. */
  const ehMolecula = artefato?.studioKind === "molecule" && !!artefato?.data?.sdf;
  // Quando o corpo JÁ É o núcleo, mostrar o núcleo de novo em cima seria eco.
  const temLinhaFina = !!answer.desenvolvimento?.trim() && !!answer.nucleo?.trim();
  const conceitos = useMemo(() => answer.conceitos ?? [], [answer.conceitos]);

  /* ── medir + posicionar ──────────────────────────────────────────────────────── */
  const recalcular = useCallback(() => {
    const canvas = cv.current;
    const caixa = wrap.current;
    if (!canvas || !caixa) return;
    const W = Math.round(caixa.clientWidth);
    if (W <= 0) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const m = metricasPara(W);
    const medido = medirTexto(ctx, paragrafos, { corpo: m.corpo, enfase: m.enfase }, conceitos);
    medidoRef.current = medido;

    // NASCIMENTO DE CADA GRAFEMA. Sem este array o desenho não acontece: o laço pinta
    // uma letra só depois de `nasc[gi]`, e a chegada só é agendada se ele existir. O
    // array é PRESERVADO entre recálculos de propósito — uma letra que já nasceu não
    // pode nascer outra vez porque a coluna mudou de largura; só as novas entram com
    // -1 ("ainda não"), que é o que o streaming precisa pra continuar de onde parou.
    const totalGrafemas = medido.totalGrafemas;
    const anterior = nascimentoRef.current;
    if (!anterior || anterior.length !== totalGrafemas) {
      const proximo = new Float64Array(totalGrafemas).fill(-1);
      if (anterior) proximo.set(anterior.subarray(0, Math.min(anterior.length, totalGrafemas)));
      nascimentoRef.current = proximo;
    }

    const metricas: Metricas = { tamanho: m.tamanho, entrelinha: m.entrelinha, espaco: medido.espaco };
    const obstaculos: Obstaculo[] = [];

    // capitular
    if (medido.capitular) {
      const fonteCap = aplicarFonte(ctx, m.capitular, QUEDA_DISPLAY);
      const med = ctx.measureText(medido.capitular);
      obstaculos.push(obstaculoCapitular(med.width + 12, metricas));
      // Mesma baseline que o canvas usava pra desenhar; o topo do elemento sai dela
      // menos a ascendente real da letra nessa fonte.
      const baseline = 2 * metricas.entrelinha + baselineNaLinha(metricas);
      const ascent = med.actualBoundingBoxAscent || metricas.entrelinha * 2.2;
      setCapitular({
        ch: medido.capitular,
        topo: Math.round(baseline - ascent),
        largura: Math.round(med.width),
        fonte: fonteCap,
        tamanho: Math.round(metricas.entrelinha * 3.05),
      });
    } else {
      setCapitular(null);
    }

    // DESTAQUES: estes SIM são obstáculo, e por mérito — já foram medidos antes desta
    // função rodar (ver lib/magazine/destaque.ts). Tamanho conhecido, uma conta só.
    const postos = posicionarDestaques(destaquesRef.current, W, metricas.entrelinha);
    postos.forEach((caixa) => {
      obstaculos.push({
        tipo: "retangulo",
        x: caixa.x, y: caixa.y, w: caixa.w, h: caixa.h,
        pad: FOLGA_DESTAQUE,
      });
    });

    // O ARTEFATO NÃO É MAIS OBSTÁCULO.
    //
    // Ele morava aqui dentro: o motor reservava um círculo (ou retângulo) no meio do rio
    // e o texto contornava. Era de onde vinha a classe inteira de bug — duas contas, a
    // que RESERVA e a que DESENHA, produzidas em momentos diferentes, tendo que
    // concordar em pixel. A do artefato nunca pôde concordar: a molécula é um canvas 3D
    // que monta sozinho e se mede depois, então o layout tinha que chutar e reconciliar.
    //
    // Agora ele vive na CABEÇA da página, ao lado da linha fina, fora do fluxo do texto.
    // O corpo voltou a ser um rio limpo e o layout voltou a ser UMA passada — a segunda
    // existia só para medir o texto antes de ancorar a figura.
    //
    // A regra que ficou: obstáculo é o que a gente consegue medir ANTES de diagramar
    // (capitular, destaque em LaTeX). O que chega depois e tem vida própria vai pra
    // cabeça.

    const res = montarLayout(
      medido.paragrafos.map((palavras) => ({ palavras, completo: !streaming })),
      obstaculos,
      W,
      metricas,
    );
    layoutRef.current = res;

    const altura = Math.ceil(res.altura);
    setAlturaBloco(altura);
    setLargura(W);
    setPalavrasDom(res.palavras);
    setDestaquesPostos(postos.map((c, i) => ({ d: destaquesRef.current[i], ...c })));

    // canvas em DPR, com a MESMA transformação usada na medição
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(altura * dpr);
    canvas.style.height = `${altura}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }, [paragrafos, conceitos, streaming]);

  /**
   * Mede os destaques quando a resposta (ou a largura) muda, e só então pede um
   * recálculo. A medição é assíncrona porque o KaTeX entra por import dinâmico e as
   * fontes dele precisam carregar — mas ela acontece INTEIRA antes de virar obstáculo,
   * que é o que separa isto da corrida da molécula.
   */
  const destaques = useMemo(() => answer.destaques ?? [], [answer.destaques]);
  useEffect(() => {
    let vivo = true;
    if (!destaques.length) {
      if (destaquesRef.current.length) { destaquesRef.current = []; recalcularRef.current?.(); }
      return;
    }
    const caixa = wrap.current;
    const W = caixa?.clientWidth || 0;
    if (!caixa || W <= 0) return;
    // Teto = a coluna inteira. Não é 62% porque quem decide a FORMA (lateral ou faixa)
    // é `posicionarDestaques`; aqui só se descarta o que não cabe de jeito nenhum.
    void medirDestaques(destaques, W, caixa).then((medidos) => {
      if (!vivo) return;
      destaquesRef.current = medidos;
      recalcularRef.current?.();
    });
    return () => { vivo = false; };
  }, [destaques, largura]);

  /* ── boot: fontes e observer montam UMA vez ─────────────────────────────────── */
  // `recalcular` muda a cada token do stream. Se o boot dependesse dele, a corrida das
  // fontes e o ResizeObserver seriam refeitos a cada letra que chega.
  const recalcularRef = useRef(recalcular);
  recalcularRef.current = recalcular;
  const [fontesProntas, setFontesProntas] = useState(false);

  useEffect(() => {
    let vivo = true;
    coresRef.current = wrap.current ? lerCores(wrap.current) : null;

    (async () => {
      try {
        const fam = familiasDoCanvas();
        const fontes = (document as any)?.fonts;
        if (fontes?.load) {
          await Promise.race([
            Promise.all([
              // Resolvidas: `document.fonts.load` usa o MESMO parser do ctx.font e
              // rejeitava `var()` do mesmo jeito calado — a espera nunca esperou nada.
              fontes.load(fonteCanvas(400, 19, fam.corpo)),
              fontes.load(fonteCanvas(600, 19, fam.corpo)),
              fontes.load(fonteCanvas(600, 90, fam.display)),
            ]),
            new Promise((r) => setTimeout(r, 2000)),
          ]);
        }
      } catch { /* segue com a fonte que houver */ }
      if (vivo) setFontesProntas(true);
    })();

    const ro = new ResizeObserver(() => recalcularRef.current());
    if (wrap.current) ro.observe(wrap.current);
    // a fonte pode chegar depois do timeout: re-medir uma vez quando assentar de vez
    (document as any)?.fonts?.ready?.then?.(() => { if (vivo) recalcularRef.current(); });

    return () => { vivo = false; ro.disconnect(); };
  }, []);

  /* ── mede o cartão do artefato e refaz o layout quando ele cresce ───────────── */
  /* ── re-medir quando texto, conceitos ou artefato mudam ─────────────────────── */
  useEffect(() => {
    if (fontesProntas) recalcular();
  }, [fontesProntas, recalcular]);

  /* ── chegada das letras ──────────────────────────────────────────────────────── */
  //
  // O DETALHE QUE FAZIA A RESPOSTA APARECER DE SOCO: a resposta estruturada NÃO chega
  // token a token. O harness manda `@@STRUCTURED@@` com o JSON inteiro no fim do stream,
  // então `streaming` já é false quando o texto chega aqui — e o caminho "sem stream"
  // acendia tudo de uma vez. A materialização existia e nunca rodava.
  //
  // Agora quem manda é `recemChegada` (o `fresh` da mensagem): resposta nova se
  // materializa mesmo tendo chegado pronta. Só o histórico nasce instantâneo.
  useEffect(() => {
    const total = medidoRef.current?.totalGrafemas ?? 0;
    const nasc = nascimentoRef.current;
    if (!nasc || !total) return;

    const animar = (recemChegada || streaming) && !semMovimento;
    if (!animar) {
      chegadaInstantanea(nasc);
      setAssentado(true);
      return;
    }

    // Toda a aritmética (e as duas armadilhas dela) mora em lib/magazine/chegada.ts,
    // que é puro e tem teste. Aqui só se obedece ao relógio que ela devolve.
    const fim = agendarChegada(nasc, performance.now());
    const t = setTimeout(() => setAssentado(true), fim);
    return () => clearTimeout(t);
  }, [palavrasDom, streaming, recemChegada, semMovimento]);

  // WATCHDOG do cross-fade: o assentamento depende de um timer que o cleanup do efeito acima cancela a
  // cada recálculo (largura/molécula). Se algum laço de re-medição o mantém vivo, `assentado` nunca vira
  // true e o texto fica preso no canvas/meio-termo. Este timer é INDEPENDENTE (só depende de a página
  // estar medida e de o stream ter acabado): passado o tempo máximo da materialização + folga, assenta.
  useEffect(() => {
    if (assentado || streaming || !palavrasDom.length) return;
    const t = setTimeout(() => setAssentado(true), DURACAO_CHEGADA + DURACAO_LETRA + RESPIRO_FINAL + 2500);
    return () => clearTimeout(t);
  }, [assentado, streaming, palavrasDom.length]);

  // Avisa o pai UMA vez, quando a página está inteira e medida.
  const avisouRef = useRef(false);
  useEffect(() => {
    if (!assentado || avisouRef.current || !alturaBloco) return;
    avisouRef.current = true;
    aoAssentar?.();
  }, [assentado, alturaBloco, aoAssentar]);

  /* ── desenho ─────────────────────────────────────────────────────────────────── */
  useEffect(() => {
    if (assentado) return; // canvas some; o DOM selecionável assume
    let raf = 0;
    const desenhar = (agora: number) => {
      const canvas = cv.current;
      const res = layoutRef.current;
      const nasc = nascimentoRef.current;
      const cores = coresRef.current ?? (wrap.current ? lerCores(wrap.current) : null);
      const medido = medidoRef.current;
      if (canvas && res && nasc && cores && medido) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          const m = metricasPara(largura || canvas.clientWidth);
          ctx.clearRect(0, 0, largura, alturaBloco);

          // A capitular NÃO é mais desenhada aqui — ela é um elemento em DOM (ver
          // `capitular` no estado). Desenhar nos dois lugares dobraria a letra durante
          // a materialização, e some de novo no fim.

          // marca-texto dos conceitos, crescendo da esquerda
          for (const mk of res.marcas) {
            const t = nasc[mk.gi];
            if (t < 0 || agora < t) continue;
            const e = semMovimento ? 1 : ease(clamp((agora - t - 120) / 520, 0, 1));
            ctx.fillStyle = cores.marca;
            ctx.fillRect(mk.x, mk.y, mk.w * e, mk.h);
          }

          // glifos
          let fonteAtual = "";
          for (const g of res.glifos) {
            const t = nasc[g.gi];
            if (t < 0 || agora < t) continue;
            const e = semMovimento ? 1 : ease(clamp((agora - t) / DURACAO_LETRA, 0, 1));
            const f = g.enfase ? m.enfase : m.corpo;
            if (f !== fonteAtual) { aplicarFonte(ctx, f, QUEDA_CORPO); fonteAtual = f; }
            ctx.globalAlpha = 1; // nunca translúcido: a materialização é deslize + ciano→tinta, não fade
            ctx.fillStyle = e < 1 ? cores.ciano : cores.tinta;
            ctx.fillText(g.ch, g.x, g.y + (1 - e) * 9);
          }
          ctx.globalAlpha = 1;
        }
      }
      raf = requestAnimationFrame(desenhar);
    };
    raf = requestAnimationFrame(desenhar);
    return () => cancelAnimationFrame(raf);
  }, [assentado, streaming, largura, alturaBloco, semMovimento]);

  /* ── glossário no hover (e como lista acessível, mais abaixo) ────────────────── */
  // `conceitos` é só uma lista de termos — o contrato não traz definição. Em vez de
  // inventar uma, procuramos entre as evidências alguma afirmação que fale daquele
  // termo. Não achou, a dica diz o que é honesto dizer: que a Aura destacou ali.
  const definicoes = useMemo(() => {
    const mapa = new Map<string, string>();
    for (const c of conceitos) {
      const chave = normalizar(c);
      const achou = (answer.evidencia ?? []).find((e) => normalizar(e.claim).includes(chave));
      if (achou) mapa.set(chave, achou.claim);
    }
    return mapa;
  }, [conceitos, answer.evidencia]);

  const aoMover = useCallback((ev: MouseEvent<HTMLDivElement>) => {
    const res = layoutRef.current;
    const caixa = wrap.current;
    if (!res || !caixa) return;
    const r = caixa.getBoundingClientRect();
    const x = ev.clientX - r.left;
    const y = ev.clientY - r.top;
    const achou = res.marcas.find((mk) => x >= mk.x && x <= mk.x + mk.w && y >= mk.y && y <= mk.y + mk.h);
    if (!achou) { setDica(null); return; }
    setDica({
      x: clamp(achou.x, 0, Math.max(0, largura - 260)),
      y: achou.y + achou.h + 8,
      termo: achou.chave,
      def: definicoes.get(achou.chave) || "Conceito destacado pela Aura nesta resposta.",
    });
  }, [definicoes, largura]);

  const mCor = metricasPara(largura || 900);
  /**
   * A figura cabe ao lado da linha fina? A linha fina trava em 34ch; o que sobra é a
   * coluna da figura. Abaixo de 560px não sobra o bastante para uma estrutura 3D ser
   * legível, então ela desce.
   */
  const larguraUtil = largura || 900;
  const cabecaLadoALado = larguraUtil >= 560;
  // Empilhada, a figura NÃO pode ocupar a coluna inteira: ela é quadrada, então largura
  // total vira altura total, e num telefone isso empurra a primeira linha do corpo pra
  // fora da tela — que é exatamente a queixa de "a página não começa no começo". 200px
  // ainda é uma estrutura 3D legível e deixa o texto aparecer na mesma dobra.
  const larguraFigura = cabecaLadoALado
    ? Math.round(clamp(larguraUtil * 0.32, 150, 260))
    : Math.round(clamp(larguraUtil * 0.55, 150, 200));

  return (
    <div className="z-revista flex flex-col gap-4">
      {/* ── CABEÇA DA PÁGINA ─────────────────────────────────────────────────
          Ordem de leitura: rótulo → linha fina → figura. A linha fina é estreita de
          propósito (34ch é medida de leitura de revista), e é isso que abre a coluna
          livre à direita onde a figura mora. Antes essa coluna ficava vazia e o
          artefato ia brigar com o corpo do texto lá embaixo.

          Coluna larga: lado a lado. Estreita (<560px, o mesmo ponto de quebra da
          tipografia): a figura desce e fica centrada, com teto de 200px — contornar num
          corredor de 170px deixaria frestas de três letras, e uma figura de largura
          inteira seria alta demais pra caber na mesma dobra que o texto. */}
      <div className="flex flex-col gap-1">
        <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500 dark:text-white/45 font-bold">
          Por {agente}, na Sala de Estudos
        </p>
        <div className={`flex gap-5 ${cabecaLadoALado ? "flex-row items-start" : "flex-col"}`}>
          {temLinhaFina && (
            <p
              className="text-slate-900 dark:text-white leading-snug flex-1 min-w-0"
              style={{ fontFamily: FAMILIA_DISPLAY, fontWeight: 300, fontSize: "clamp(19px,2.4vw,26px)", maxWidth: "34ch" }}
            >
              {answer.nucleo}
            </p>
          )}
          {artefato && (
            <figure
              className={cabecaLadoALado ? "shrink-0 m-0" : "shrink-0 m-0 self-center"}
              style={{ width: larguraFigura }}
            >
              {ehMolecula
                ? <MoleculeView data={artefato.data} nu />
                : <StudioBlock block={artefato} collapsed={false} onToggle={() => {}} />}
            </figure>
          )}
        </div>
      </div>

      {/* corpo: canvas animado + artefato por cima + DOM assentado no fim */}
      <div
        ref={wrap}
        className="relative"
        style={{ minHeight: alturaBloco || undefined }}
        onMouseMove={aoMover}
        onMouseLeave={() => setDica(null)}
      >
        {/* A capitular. Fica FORA do bloco que some com o canvas — por isso ela
            permanece. `aria-hidden` porque a letra já está no texto para o leitor de
            tela (o motor a retirou do fluxo, não do conteúdo). */}
        {capitular && (
          <span
            key={`${capitular.ch}-${capitular.topo}-${largura}`}
            aria-hidden="true"
            className="z-revista-capitular"
            style={{
              position: "absolute",
              left: 0,
              top: capitular.topo,
              font: capitular.fonte,
              lineHeight: 1,
              pointerEvents: "none",
            }}
          >
            {capitular.ch}
          </span>
        )}

        {/* Os destaques. Vivem fora do bloco que some com o canvas, como a capitular:
            são objetos da página, não pinceladas da animação. */}
        {destaquesPostos.map((p, i) => (
          <figure
            key={`${p.d.latex}-${i}`}
            className="z-revista-destaque m-0"
            style={{ position: "absolute", left: p.x, top: p.y, width: p.w, height: p.h }}
          >
            {/* Em faixa a caixa é mais larga que a fórmula: centraliza, senão a
                expressão fica encostada na borda com meia coluna de vazio ao lado. */}
            <div
              style={p.w > p.d.largura + 1 ? { textAlign: "center" } : undefined}
              dangerouslySetInnerHTML={{ __html: p.d.html }}
            />
            {p.d.rotulo && (
              <figcaption className="mt-1 text-[10px] uppercase tracking-[0.14em] text-slate-500 dark:text-white/40">
                {p.d.rotulo}
              </figcaption>
            )}
          </figure>
        ))}

        <canvas
          ref={cv}
          aria-hidden="true"
          className="block w-full"
          style={{ opacity: assentado ? 0 : 1, touchAction: "pan-y", pointerEvents: "none" }}
        />

        {/* Texto em DOM: invisível durante o stream (só pro leitor de tela), visível e
            selecionável quando assenta. Mesmas coordenadas do canvas. */}
        <div
          className="absolute inset-0 text-slate-900 dark:text-white"
          style={{
            opacity: assentado ? 1 : 0,
            pointerEvents: assentado ? "auto" : "none",
            fontFamily: FAMILIA_CORPO,
            fontSize: mCor.tamanho,
          }}
        >
          {palavrasDom.map((p, i) => (
            <span
              key={`${p.gi}-${i}`}
              className={p.chave ? "z-revista-marca" : undefined}
              style={{
                position: "absolute",
                left: p.x,
                top: topoDaLinha(p.y, mCor),
                lineHeight: `${mCor.entrelinha}px`,
                fontWeight: p.chave ? 600 : 400,
                whiteSpace: "pre",
              }}
            >
              {p.texto}{" "}
            </span>
          ))}
        </div>

        {dica && (
          <div
            className="absolute z-10 pointer-events-none max-w-[260px] rounded-xl px-3 py-2 text-[12px] leading-relaxed bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-lg"
            style={{ left: dica.x, top: dica.y }}
          >
            <b className="block mb-0.5">{dica.termo}</b>
            {dica.def}
          </div>
        )}
      </div>

      {/* glossário acessível: o hover no canvas não pode ser o único caminho */}
      {!!conceitos.length && (
        <details className="text-[12px] text-slate-600 dark:text-white/60">
          <summary className="cursor-pointer font-bold text-slate-700 dark:text-white/75">
            Conceitos desta resposta
          </summary>
          <ul className="mt-1 space-y-0.5 list-disc list-inside">
            {conceitos.map((c) => <li key={c}>{c}</li>)}
          </ul>
        </details>
      )}

      {/* continue explorando */}
      {!!answer.proximos_passos?.length && (
        <div className="flex flex-wrap gap-1.5">
          {answer.proximos_passos.map((p) => (
            <button
              key={p}
              onClick={() => onNext?.(p)}
              className="px-3 py-1.5 rounded-full text-[11px] font-bold text-slate-800 dark:text-white border border-slate-200 dark:border-white/20 hover:border-cyan-400/50 transition-colors"
            >
              {p}
            </button>
          ))}
        </div>
      )}

      {/* fontes — SEMPRE o último elemento do card: resposta → botões → Fontes */}
      {!!answer.evidencia?.length && (
        <div className="text-[12px] text-slate-700 dark:text-white/80 leading-relaxed">
          <p className="font-bold text-slate-700 dark:text-white/75 mb-1">Fontes</p>
          <ol className="list-decimal list-inside space-y-0.5">
            {answer.evidencia.map((e, i) => (
              <li key={i}>
                {e.claim}
                {e.source?.title && <span className="text-slate-500 dark:text-white/45"> — {e.source.title}</span>}
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
