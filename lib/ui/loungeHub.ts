/**
 * Cyberespaço (o Lounge Cósmico) como entrada da Zaeon — regras PURAS, testáveis.
 * Sem flag: vai direto pra produção. O nome visível é "cyberespaço"; a rota segue /lounge-cosmico.
 */
export const LOUNGE_ROTA = "/lounge-cosmico";
export const LAB_ROTA = "/research-lab";

/** Rota imersiva: sem navbar/rodapé globais (a cena ocupa a tela toda). */
export const ehRotaImersiva = (path: string | null | undefined) =>
  !!path && (path === LOUNGE_ROTA || path.startsWith(LOUNGE_ROTA + "/"));

export type CopyEntrada = { cta: string; badges: string[] };
/** Copy do CTA primário e dos badges, por estado de login. */
export function copyEntrada(logado: boolean): CopyEntrada {
  if (logado) return { cta: "✦ Entrar no cyberespaço", badges: [] };
  return { cta: "Criar conta · entrar no cyberespaço", badges: ["Entre no universo", "Sem cartão", "Todas as IAs num lugar só"] };
}
