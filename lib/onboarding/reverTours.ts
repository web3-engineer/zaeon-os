/**
 * #613 · REVER os tutoriais do laboratório sem console: o botão nas Configurações esquece que a pessoa já viu os
 * tours da Sala de Estudos e do Escritório. O da sala recomeça na hora (se o laboratório está aberto); o do
 * Escritório, na próxima vez que a aba dele abrir. O "Modo tutorial" (cyberespaço) não muda.
 */
import { esquecerTourSala } from "@/lib/onboarding/tourSala";
import { esquecerTourEscritorio } from "@/lib/onboarding/tourEscritorio";
import { novaGeracaoDosTours } from "@/lib/onboarding/geracaoTour";
import { esquecerDicas } from "@/lib/onboarding/dicas";
import { esquecerOnboardingTema } from "@/lib/onboarding/porTema";
import { pedirConversa } from "@/lib/chat/conversasNav";
import { limparVistosDaConta } from "@/lib/onboarding/vistosConta";

export const EVT_REVER_TOURS = "zaeon:tour:rever";

export function reverToursDoLab(): void {
  // um tour aberto noutra aba, ao terminar, não desfaz este pedido (lib/onboarding/geracaoTour)
  novaGeracaoDosTours();
  esquecerTourSala();
  esquecerTourEscritorio();
  esquecerOnboardingTema();   // o onboarding por tema (lib/onboarding/porTema) também
  esquecerDicas();   // #618: as dicas rápidas (Perfil) também
  limparVistosDaConta();   // #629: a conta esquece também (senão ela marcava tudo como visto no próximo carregamento)
  // #626: o tour da sala começa pedindo um estudo — numa conversa que JÁ é estudo (com mapa e tudo) isso não faz
  // sentido. Abre uma conversa nova e vazia (o bilhete vale também se o laboratório ainda não estiver aberto).
  try { pedirConversa({ sala: "estudos", nova: true }); } catch { /* sem janela */ }
  try { window.dispatchEvent(new Event(EVT_REVER_TOURS)); } catch { /* sem janela */ }
}
