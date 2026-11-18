"use client";
/**
 * CorDaBarra — #841 · a barra de status do app (e a do navegador no celular) segue o TEMA DA ZAEON.
 *
 * O `themeColor` do layout é um só, escuro, de propósito: o tema vem do botão da Zaeon (next-themes), não do sistema —
 * um par por `prefers-color-scheme` pintaria a barra de branco para quem usa o app no escuro com o celular no claro.
 * Aqui, depois de montar, a `<meta name="theme-color">` acompanha o tema escolhido: escuro = o fundo escuro do app,
 * claro = o fundo claro do laboratório (bg-slate-100).
 */
import { useEffect } from "react";
import { useTheme } from "next-themes";

export const COR_ESCURA = "#030014";
export const COR_CLARA = "#f1f5f9";

export function CorDaBarra() {
  const { resolvedTheme } = useTheme();
  useEffect(() => {
    if (!resolvedTheme) return;
    const cor = resolvedTheme === "light" ? COR_CLARA : COR_ESCURA;
    let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (!meta) { meta = document.createElement("meta"); meta.name = "theme-color"; document.head.appendChild(meta); }
    meta.content = cor;
  }, [resolvedTheme]);
  return null;
}
