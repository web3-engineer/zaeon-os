/**
 * lib/ui/autofoco.ts — entrar numa sala com chat deve ser igual a já ter clicado na
 * barra de input.
 *
 * O QUE ESTAVA ERRADO. O composer chutava `setTimeout(() => ref.current?.focus(), 60)`.
 * `focus()` num elemento dentro de `display:none` é SILENCIOSAMENTE IGNORADO — não
 * lança, não avisa, não acontece. Se aos 60ms o painel ainda não estivesse pintado, o
 * foco simplesmente não existia, e não havia segunda tentativa. Daí o "às vezes sim,
 * às vezes não": era uma corrida contra a pintura, decidida por um número fixo.
 *
 * O QUE MUDA. Em vez de chutar quando, a gente espera o QUE: olha a cada quadro até o
 * elemento estar de fato visível, e só então foca. Some a corrida.
 *
 * A decisão vive fora do DOM de propósito — é ela que tem as regras, e regra sem teste
 * é opinião.
 */
import { useEffect, type RefObject } from "react";

export type EstadoFoco = {
  /** A superfície está em cena (aba ativa, painel aberto). */
  ativo: boolean;
  /** O elemento existe E ocupa espaço na tela. `display:none` não é focável. */
  visivel: boolean;
  /** O alvo já está com o foco — não há o que fazer. */
  jaFocado: boolean;
  /** Existe outro campo focado COM TEXTO: alguém está escrevendo. */
  escrevendoEmOutro: boolean;
  /** A janela de tentativas acabou. */
  expirou: boolean;
};

export type Decisao = "focar" | "esperar" | "desistir";

/**
 * A regra, em uma função. A ordem importa:
 *
 * 1. Fora de cena, não foca — nem que dê tempo.
 * 2. Já focado: nada a fazer.
 * 3. Alguém escrevendo em outro campo: NÃO rouba. Perder o que se digitou porque uma
 *    aba trocou é pior do que ter que clicar. Note que "outro campo VAZIO" não protege:
 *    trocar de aba deve mover o cursor pro chat da aba nova.
 * 4. Invisível: espera o próximo quadro, até o prazo.
 * 5. Visível: foca.
 */
export function decidirFoco(e: EstadoFoco): Decisao {
  if (!e.ativo) return "desistir";
  if (e.jaFocado) return "desistir";
  if (e.escrevendoEmOutro) return "desistir";
  if (!e.visivel) return e.expirou ? "desistir" : "esperar";
  return "focar";
}

/**
 * A página está DE FATO na tela, inclusive quando roda dentro de um iframe? `visibility:hidden`/`display:none` no
 * iframe NÃO chega no documento de dentro: pra ele, tudo continua "visível". Bug de out/2026 (modo TABLET do
 * cyberespaço): com o tablet guardado (iframe invisível, mas vivo — a concorrência), a resposta terminava, o composer
 * re-armava o autofoco e ROUBAVA o foco do jogo — o avatar parava, o mouse destravava e o WASD ia pro chat escondido.
 * Sobe pelos `frameElement` (mesma origem) e checa o estilo de cada um na página de cima. Outra origem = não dá pra
 * saber → não bloqueia.
 */
export function frameVisivel(w: Window | null | undefined = typeof window === "undefined" ? null : window): boolean {
  try {
    let atual = w;
    for (let i = 0; i < 6 && atual?.frameElement; i++) {
      const fe = atual.frameElement as HTMLElement;
      const pai = fe.ownerDocument?.defaultView;
      if (!pai) return true;
      const cs = pai.getComputedStyle(fe);
      if (cs.visibility === "hidden" || cs.visibility === "collapse" || cs.display === "none" || Number(cs.opacity) === 0) return false;
      if (fe.offsetParent === null && cs.position !== "fixed") return false;   // display:none num ancestral
      const r = fe.getBoundingClientRect();
      if (r.width <= 0 || r.height <= 0) return false;
      atual = pai;
    }
    return true;
  } catch {
    return true;
  }
}

/** Ocupa espaço na tela? `offsetParent` nulo cobre `display:none` em qualquer ancestral; e o iframe (se houver) também. */
export function elementoVisivel(el: HTMLElement | null | undefined): boolean {
  if (!el || !el.isConnected) return false;
  if (!frameVisivel(el.ownerDocument?.defaultView)) return false;
  if (el.offsetParent === null && getComputedStyle(el).position !== "fixed") return false;
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0;
}

/** Há outro campo focado e com texto dentro? */
export function escrevendoEmOutro(alvo: HTMLElement | null | undefined): boolean {
  const a = typeof document === "undefined" ? null : (document.activeElement as HTMLElement | null);
  if (!a || a === alvo) return false;
  if (a.isContentEditable) return (a.textContent ?? "").trim().length > 0;
  const tag = a.tagName;
  if (tag !== "INPUT" && tag !== "TEXTAREA") return false;
  return ((a as HTMLInputElement | HTMLTextAreaElement).value ?? "").trim().length > 0;
}

/**
 * #845 · aparelho de toque (celular, tablet)? Lá o autofoco ABRE O TECLADO sozinho — cobre metade da tela quando a
 * pessoa só queria ler — e, quando o Android devolve o foco sem abrir o teclado (ao voltar pro app), o laboratório
 * achava que o teclado estava aberto e escondia a barra de baixo. No toque, o teclado abre quando a pessoa toca na caixa.
 */
export function telaDeToque(): boolean {
  try { return window.matchMedia("(hover: none) and (pointer: coarse)").matches; } catch { return false; }
}

/** Quanto tempo vale a pena esperar a superfície pintar antes de desistir em silêncio. */
export const PRAZO_MS = 2_000;

/**
 * Foca o elemento assim que ele estiver em cena e visível.
 *
 * `ativo` é a chave: vira `true` quando a sala/aba entra em cena. Enquanto for `false`,
 * o gancho não faz nada — e não é ele que decide isso, é quem chama, que sabe.
 */
export function useAutoFoco(
  ref: RefObject<HTMLElement | null>,
  ativo: boolean,
  prazoMs: number = PRAZO_MS,
): void {
  useEffect(() => {
    if (!ativo || typeof window === "undefined" || telaDeToque()) return;
    let quadro = 0;
    let limite = performance.now() + prazoMs;

    const tentar = () => {
      const el = ref.current;
      const decisao = decidirFoco({
        ativo: true,
        visivel: elementoVisivel(el),
        jaFocado: !!el && document.activeElement === el,
        escrevendoEmOutro: escrevendoEmOutro(el),
        expirou: performance.now() >= limite,
      });
      if (decisao === "esperar") { quadro = requestAnimationFrame(tentar); return; }
      if (decisao === "focar" && el) {
        el.focus({ preventScroll: true });
        // Cursor no fim, não na frente do rascunho que o aluno deixou salvo.
        const campo = el as HTMLInputElement | HTMLTextAreaElement;
        if (typeof campo.setSelectionRange === "function" && typeof campo.value === "string") {
          try { campo.setSelectionRange(campo.value.length, campo.value.length); } catch { /* type sem seleção */ }
        }
      }
    };

    // Voltou pra aba/janela (ou a página demorou a pintar e o prazo passou): se NADA tem o foco, tenta de novo —
    // o cursor volta a piscar na barra. Quem clicou/escreve em outro lugar não perde o foco (body = ninguém).
    const aoVoltar = () => {
      if (document.visibilityState !== "visible") return;
      const a = document.activeElement;
      if (a && a !== document.body) return;
      cancelAnimationFrame(quadro); limite = performance.now() + prazoMs; quadro = requestAnimationFrame(tentar);
    };

    quadro = requestAnimationFrame(tentar);
    window.addEventListener("focus", aoVoltar);
    document.addEventListener("visibilitychange", aoVoltar);
    return () => { cancelAnimationFrame(quadro); window.removeEventListener("focus", aoVoltar); document.removeEventListener("visibilitychange", aoVoltar); };
  }, [ref, ativo, prazoMs]);
}
