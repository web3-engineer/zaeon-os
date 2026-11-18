/**
 * lib/onboarding/porTema.ts — o ENCAIXE do onboarding novo, por TEMA (lib/rooms/temas).
 *
 * Aqui só mora o contrato; o roteiro está VAZIO de propósito. Para ligar o onboarding novo:
 *   1. escreva os passos em PASSOS_COMUNS (valem pra todos) e/ou PASSOS_DO_TEMA[tema] (só daquele tema);
 *   2. marque os alvos na tela com `data-tour="..."` (o mesmo jeito dos tours da sala e do Escritório);
 *   3. ligue a flag NEXT_PUBLIC_ONBOARDING_TEMA=1.
 * Quem desenha é o components/onboard/OnboardingTema (o mesmo cartão dos outros tours). Com o roteiro vazio
 * ou a flag desligada, nada aparece — é seguro deixar montado.
 *
 * O "já vi" segue o padrão dos outros tours: este navegador + a conta (lib/onboarding/vistosConta), e o
 * "Rever tutorial" das Configurações esquece este também (lib/onboarding/reverTours).
 */
import type { TemaId } from "@/lib/rooms/temas";
import { geracaoValida } from "@/lib/onboarding/geracaoTour";
import { CHAVE_LOCAL, salvarVistoNaConta } from "@/lib/onboarding/vistosConta";

/** O mesmo formato de passo do tour do Escritório: só explicação, anda no botão. */
export type PassoOnboarding = {
  id: string;
  /** a linha curta do cartão */
  dica: string;
  /** o que a Aura diz */
  fala: string;
  /** seletores do que destacar (o primeiro que existir na tela) */
  alvos: string[];
  /** rótulo do botão */
  cta: string;
};

export type RoteirosOnboarding = {
  comuns: readonly PassoOnboarding[];
  porTema: Partial<Record<TemaId, readonly PassoOnboarding[]>>;
};

/** ← o onboarding novo entra AQUI. */
export const PASSOS_COMUNS: readonly PassoOnboarding[] = [];
export const PASSOS_DO_TEMA: Partial<Record<TemaId, readonly PassoOnboarding[]>> = {};

const ROTEIROS: RoteirosOnboarding = { comuns: PASSOS_COMUNS, porTema: PASSOS_DO_TEMA };

/** Os passos de um tema: os comuns primeiro, depois os específicos dele. */
export function roteiroDoTema(tema: TemaId, roteiros: RoteirosOnboarding = ROTEIROS): PassoOnboarding[] {
  return [...roteiros.comuns, ...(roteiros.porTema[tema] ?? [])];
}

/** Problemas de um roteiro montado (id repetido, passo sem alvo/texto). Vazio = pode ir pra tela. */
export function problemasDoRoteiro(passos: readonly PassoOnboarding[]): string[] {
  const erros: string[] = [];
  const vistos = new Set<string>();
  for (const p of passos) {
    if (vistos.has(p.id)) erros.push(`id repetido: ${p.id}`);
    vistos.add(p.id);
    if (p.alvos.length === 0) erros.push(`${p.id}: sem alvo`);
    if (!p.dica.trim() || !p.fala.trim() || !p.cta.trim()) erros.push(`${p.id}: texto vazio`);
  }
  return erros;
}

const on = (v: string | undefined) => v === "1" || v === "true";
export const onboardingPorTema = (): boolean => on(process.env.NEXT_PUBLIC_ONBOARDING_TEMA);

const CHAVE = CHAVE_LOCAL["onboarding-tema"];
export const esquecerOnboardingTema = () => { try { localStorage.removeItem(CHAVE); } catch { /* ignore */ } };
export const onboardingTemaVisto = (): boolean => { try { return localStorage.getItem(CHAVE) === "1"; } catch { return true; } };
export const marcarOnboardingTemaVisto = (geracao?: string) => {
  if (!geracaoValida(geracao)) return;
  try { localStorage.setItem(CHAVE, "1"); } catch { /* ignore */ }
  salvarVistoNaConta("onboarding-tema");
};

/** Mostra? Flag ligada, roteiro com passos, uma vez, fora do tutorial do tablet, sem outro tour na tela e
 *  (como os outros tours do laboratório) nunca no celular. */
export const deveMostrarOnboardingTema = (o: { ligado: boolean; passos: number; noTutorial: boolean; visto: boolean; outroTour: boolean; largura: number }) =>
  o.ligado && o.passos > 0 && !o.noTutorial && !o.visto && !o.outroTour && o.largura >= 768;
