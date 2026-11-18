"use client";
/**
 * OnboardingTema — desenha o onboarding por TEMA (lib/onboarding/porTema) com o mesmo cartão dos outros tours
 * (components/onboard/BalaoTour). O tema vem do curso da conta (lib/rooms/temas). Só explicação: cada passo anda
 * no botão; Pular encerra. Sem a flag, sem passos, no tutorial do tablet ou com outro tour na tela: não aparece.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { OverlayTour, useDestaque } from "@/components/onboard/BalaoTour";
import { getTour } from "@/lib/onboarding/tour";
import { tourDoLabAtivo } from "@/lib/onboarding/tourSala";
import { dicaAtiva } from "@/lib/onboarding/dicas";
import { geracaoDosTours } from "@/lib/onboarding/geracaoTour";
import { esperarVistos, vistosJaLidos } from "@/lib/onboarding/vistosConta";
import { temaOuLounge } from "@/lib/rooms/temas";
import { deveMostrarOnboardingTema, marcarOnboardingTemaVisto, onboardingPorTema, onboardingTemaVisto, roteiroDoTema } from "@/lib/onboarding/porTema";

const SEM_ALVOS: string[] = [];

export default function OnboardingTema({ noTutorial }: { noTutorial: boolean }) {
  const { data: session, status } = useSession();
  const tema = temaOuLounge((session?.user as { course?: string } | undefined)?.course);
  const passos = useMemo(() => roteiroDoTema(tema), [tema]);
  const [i, setI] = useState<number | null>(null);
  // a geração em que este tour começou (um "Rever tutorial" noutra aba a invalida)
  const geracao = useRef<string | undefined>(undefined);

  useEffect(() => {
    // espera a sessão: sem ela o tema ainda é o "lounge" e o roteiro seria o errado
    if (status === "loading" || !onboardingPorTema() || passos.length === 0) { setI(null); return; }
    let vivo = true;
    const decidir = () => {
      if (!vivo) return;
      const mostrar = deveMostrarOnboardingTema({
        ligado: true, passos: passos.length, noTutorial, visto: onboardingTemaVisto(),
        outroTour: getTour().active || tourDoLabAtivo() || dicaAtiva(), largura: window.innerWidth,
      });
      if (mostrar) { geracao.current = geracaoDosTours(); setI(0); }
    };
    // antes de decidir, pergunta à conta se a pessoa já viu (como os outros tours)
    const t = setTimeout(() => { if (vistosJaLidos()) decidir(); else void esperarVistos().then(decidir); }, 1200);
    return () => { vivo = false; clearTimeout(t); };
  }, [status, passos, noTutorial]);

  const passo = i === null ? null : passos[i] ?? null;
  const { alvo, evita } = useDestaque(passo?.alvos ?? SEM_ALVOS, SEM_ALVOS, !!passo);
  if (!passo || i === null) return null;
  const sair = () => { marcarOnboardingTemaVisto(geracao.current); setI(null); };
  const ultimo = i === passos.length - 1;
  return (
    <OverlayTour
      chave={passo.id}
      alvo={alvo}
      evita={evita}
      titulo={passo.dica}
      fala={passo.fala}
      passo={i}
      total={passos.length}
      acao={{ rotulo: passo.cta, onClick: ultimo ? sair : () => setI(i + 1) }}
      onPular={sair}
    />
  );
}
