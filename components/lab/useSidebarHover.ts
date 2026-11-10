"use client";
/**
 * useSidebarHover — a sidebar do laboratório abre com o MOUSE em cima e volta pro canto quando ele sai.
 *
 * O bug que isto corrige: a sidebar também abria por FOCO (`onFocusCapture`). Quando o navegador devolvia o foco a um
 * botão dela sem o mouse estar ali (trocar de janela e voltar, reabrir o tablet do cyberespaço, um modal devolvendo o
 * foco), ela abria — e como o mouse nunca tinha entrado, o "mouse saiu" nunca chegava: ficava aberta pra sempre.
 *
 * Agora: abre só com o mouse (ou com o foco de TECLADO, Tab); fecha quando o mouse sai, quando o foco de
 * teclado sai, quando a janela perde o foco, e — rede de segurança — quando o ponteiro anda FORA dela por qualquer
 * caminho (um mouseleave perdido não prende mais). Nunca fecha no meio de uma edição (renomear conversa, busca).
 */
import { useCallback, useEffect, useRef, useState } from "react";

export const ABRIR_SIDEBAR_MS = 120;
export const FECHAR_SIDEBAR_MS = 320;

type Timer = ReturnType<typeof setTimeout> | undefined;

/** O destino do mouse/foco está DENTRO da sidebar? Saindo da janela o React entrega `window` como destino — e
 *  `contains(window)` LANÇA: era a outra metade do bug (o fechar nunca rodava quando o mouse saía pela borda da tela). */
function dentroDe(nav: HTMLElement | null, alvo: EventTarget | null | undefined): boolean {
  return !!nav && typeof Node !== "undefined" && alvo instanceof Node && nav.contains(alvo);
}

/** Foco vindo do TECLADO (Tab) agora há pouco? Só esse abre a sidebar — o foco que o navegador devolve sozinho (voltar
 *  à janela, modal fechando, o tablet reabrindo) não. Guardado por nós: `:focus-visible` varia entre navegadores. */
let ultimoTab = -Infinity;
let ouvindoTeclado = false;
function ouvirTeclado() {
  if (ouvindoTeclado || typeof document === "undefined") return;
  ouvindoTeclado = true;
  document.addEventListener("keydown", (e) => { if (e.key === "Tab") ultimoTab = Date.now(); }, true);
  document.addEventListener("pointerdown", () => { ultimoTab = -Infinity; }, true);
}
export const focoDeTeclado = () => Date.now() - ultimoTab < 600;

export function useSidebarHover<T extends HTMLElement = HTMLElement>() {
  const [aberta, setAberta] = useState(false);
  const navRef = useRef<T>(null);
  const mouseDentro = useRef(false);
  const abrir = useRef<Timer>();
  const fechar = useRef<Timer>();

  const editando = () => {
    const f = document.activeElement;
    return !!f && dentroDe(navRef.current, f) && /^(INPUT|TEXTAREA)$/.test(f.tagName);
  };
  const tentarFechar = useCallback(function tentar() {
    fechar.current = undefined;
    if (mouseDentro.current) return;
    if (editando()) { fechar.current = setTimeout(tentar, FECHAR_SIDEBAR_MS); return; }
    setAberta(false);
  }, []);
  const agendarFechar = useCallback(() => {
    clearTimeout(abrir.current); abrir.current = undefined;
    if (fechar.current === undefined) fechar.current = setTimeout(tentarFechar, FECHAR_SIDEBAR_MS);
  }, [tentarFechar]);

  const onMouseEnter = useCallback(() => {
    mouseDentro.current = true;
    clearTimeout(fechar.current); fechar.current = undefined;
    clearTimeout(abrir.current);
    abrir.current = setTimeout(() => { abrir.current = undefined; if (mouseDentro.current) setAberta(true); }, ABRIR_SIDEBAR_MS);
  }, []);
  const onMouseLeave = useCallback((e?: { relatedTarget?: EventTarget | null }) => {
    // o que é desenhado por portal DENTRO da sidebar (a lista de conversas) conta como dentro
    if (dentroDe(navRef.current, e?.relatedTarget)) return;
    mouseDentro.current = false;
    agendarFechar();
  }, [agendarFechar]);
  useEffect(ouvirTeclado, []);
  const onFocusCapture = useCallback(() => {
    if (!focoDeTeclado()) return;   // foco devolvido pelo navegador/clique NÃO abre
    clearTimeout(fechar.current); fechar.current = undefined;
    setAberta(true);
  }, []);
  const onBlurCapture = useCallback((e: { relatedTarget?: EventTarget | null }) => {
    if (dentroDe(navRef.current, e.relatedTarget)) return;
    agendarFechar();
  }, [agendarFechar]);

  // Rede de segurança enquanto aberta: ponteiro fora do retângulo, saindo da janela ou a janela perdendo o foco → fecha.
  useEffect(() => {
    if (!aberta) return;
    const fora = (x: number, y: number) => {
      const r = navRef.current?.getBoundingClientRect();
      return !r || x < r.left || x > r.right || y < r.top || y > r.bottom;
    };
    const mover = (e: PointerEvent | MouseEvent) => {
      if (fora(e.clientX, e.clientY)) { mouseDentro.current = false; agendarFechar(); }
      else { mouseDentro.current = true; clearTimeout(fechar.current); fechar.current = undefined; }
    };
    const saiuDaJanela = () => { mouseDentro.current = false; agendarFechar(); };
    document.addEventListener("pointermove", mover, { passive: true });
    document.addEventListener("pointerdown", mover, { passive: true });
    document.documentElement.addEventListener("mouseleave", saiuDaJanela);
    window.addEventListener("blur", saiuDaJanela);
    return () => {
      document.removeEventListener("pointermove", mover);
      document.removeEventListener("pointerdown", mover);
      document.documentElement.removeEventListener("mouseleave", saiuDaJanela);
      window.removeEventListener("blur", saiuDaJanela);
    };
  }, [aberta, agendarFechar]);

  useEffect(() => () => { clearTimeout(abrir.current); clearTimeout(fechar.current); }, []);

  return { aberta, navRef, handlers: { onMouseEnter, onMouseLeave, onFocusCapture, onBlurCapture } };
}
