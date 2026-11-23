/**
 * lib/canal/vidro.ts — o MATERIAL de vidro (Apple Liquid Glass) do escritório, claro === escuro.
 * Mesma receita do `panelClass` do MenuNavigation / LiquidGlassButton: blur + saturação, borda
 * fina, fio de luz no topo. CLARO = tom azulado (sky); ESCURO = esfumado navy. Toda classe tem
 * par `dark:` — se funciona só num modo, está errado.
 */
export const VIDRO_BASE = "backdrop-blur-2xl backdrop-saturate-[1.6] border border-white/60 dark:border-white/[0.12]";

/** Painel grande (a sala). */
export const VIDRO_PAINEL = `${VIDRO_BASE} bg-gradient-to-b from-sky-100/70 to-blue-200/45 dark:from-transparent dark:to-transparent dark:bg-white/[0.05] shadow-[0_30px_60px_-20px_rgba(37,99,235,0.22),inset_0_1px_0_0_rgba(255,255,255,0.9)] dark:shadow-[0_30px_60px_-20px_rgba(0,0,0,0.75),inset_0_1px_0_0_rgba(255,255,255,0.25)]`;

/** Bolha de mensagem (humano e agente usam o MESMO material; a identidade vem do avatar+nome). */
export const VIDRO_BOLHA = `${VIDRO_BASE} bg-white/70 dark:bg-white/[0.06] shadow-[0_8px_24px_-12px_rgba(37,99,235,0.25),inset_0_1px_0_0_rgba(255,255,255,0.85)] dark:shadow-[0_8px_24px_-12px_rgba(0,0,0,0.6),inset_0_1px_0_0_rgba(255,255,255,0.18)]`;
/** Minha bolha: o mesmo vidro, tingido (hierarquia sem bloco chapado). */
export const VIDRO_BOLHA_MINHA = `${VIDRO_BASE} bg-blue-500/15 dark:bg-blue-400/[0.14] border-blue-300/60 dark:border-blue-300/25 shadow-[0_8px_24px_-12px_rgba(37,99,235,0.35),inset_0_1px_0_0_rgba(255,255,255,0.8)] dark:shadow-[0_8px_24px_-12px_rgba(0,0,0,0.6),inset_0_1px_0_0_rgba(255,255,255,0.18)]`;

/** Input fixo embaixo. */
export const VIDRO_INPUT = `${VIDRO_BASE} bg-white/75 dark:bg-[#0b1020]/70 shadow-[0_-8px_30px_-16px_rgba(37,99,235,0.25),inset_0_1px_0_0_rgba(255,255,255,0.9)] dark:shadow-[0_-8px_30px_-16px_rgba(0,0,0,0.7),inset_0_1px_0_0_rgba(255,255,255,0.2)]`;

/** Popover (autocomplete, menus). */
export const VIDRO_POPOVER = `${VIDRO_BASE} bg-white/90 dark:bg-[#0b1020]/95 shadow-[0_18px_50px_-20px_rgba(37,99,235,0.45)] dark:shadow-[0_18px_50px_-20px_rgba(0,0,0,0.8)]`;

/**
 * Camada que CAI POR CIMA do conteúdo (agenda, menus, autocomplete). Quase opaca de propósito: o painel
 * pai já tem backdrop-filter, o que vira a "raiz do backdrop" — o blur do filho só enxerga o que está
 * dentro do pai, e a 90% de opacidade as letras do chat ainda apareciam por baixo da agenda.
 * #867: no Chrome do Android, mesmo a 98% e com backdrop-filter, as letras do chat continuavam aparecendo
 * (agenda, sino, lista de escritórios). Agora: fundo 100% sólido, SEM backdrop-filter (num fundo opaco ele
 * não serve pra nada) e `isolate` pra camada não se misturar com a de baixo.
 */
export const VIDRO_POPOVER_SOLIDO = `isolate border border-white/60 dark:border-white/[0.12] bg-white dark:bg-[#0b1020] shadow-[0_18px_50px_-20px_rgba(37,99,235,0.45)] dark:shadow-[0_18px_50px_-20px_rgba(0,0,0,0.8)]`;

/** Pill/chip (agente convocável, presença). */
export const VIDRO_CHIP = `${VIDRO_BASE} bg-white/60 hover:bg-white/85 dark:bg-white/[0.05] dark:hover:bg-white/[0.1]`;

/** Texto principal / secundário / mudo — pares garantidos (AA nos dois modos). */
export const TXT = "text-slate-900 dark:text-white";
export const TXT_2 = "text-slate-600 dark:text-white/70";
export const TXT_MUDO = "text-slate-500 dark:text-white/45";

/** Alvo de toque mínimo (44px). */
export const TOQUE = "min-h-[44px] min-w-[44px]";
