"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import CerebroCarregando from "@/components/ui/CerebroCarregando";

const TIMELINE = {
    TOTAL_DURATION: 7.0,
    STAGE_2_BAR_APPEARS: 0.1,
    STAGE_3_MOD_1_START: 1.8,
    STAGE_4_MOD_2_START: 3.6,
    STAGE_5_MOD_3_START: 5.4,
};

type Props = {
    show?: boolean;
    onDone?: () => void;
};

/**
 * A ENTRADA do site: sem botão — o beija-flor surge e a barra clássica corre (components/ui/CerebroCarregando),
 * enquanto as salas pré-carregam de verdade. SEM música (o som do site só é liberado ao conectar no cyberespaço).
 */
export default function IntroOverlay({ show = true, onDone }: Props) {
    const router = useRouter();
    const [progresso, setProgresso] = useState(0);
    const [visible, setVisible] = useState(show);
    const [saindo, setSaindo] = useState(false);
    const startTimeRef = useRef<number | null>(null);
    const exitingRef = useRef(false);
    const onDoneRef = useRef(onDone);
    useEffect(() => { onDoneRef.current = onDone; }, [onDone]);

    // LOADING FUNCIONAL: enquanto a intro roda, pré-carrega de verdade o código das salas
    // (sobretudo a Sala de Pesquisa) → quando o usuário entra, já está pronto, sem espera.
    useEffect(() => {
        try {
            router.prefetch("/research-lab");
            router.prefetch("/workstation");
            router.prefetch("/plugin-store");
        } catch { /* ignore */ }
    }, [router]);

    // a BARRA: corre do começo ao fim da intro (uma interpolação contínua: sem degrau, sem recuo); no fim, fade-out
    useEffect(() => {
        if (!show) return;
        setVisible(true);
        startTimeRef.current = performance.now();
        let raf = 0;
        const loop = () => {
            const t = (performance.now() - (startTimeRef.current ?? performance.now())) / 1000;
            const p = Math.max(0, Math.min(1, (t - TIMELINE.STAGE_2_BAR_APPEARS) / (TIMELINE.TOTAL_DURATION - TIMELINE.STAGE_2_BAR_APPEARS)));
            setProgresso(p);
            if (t < TIMELINE.TOTAL_DURATION) { raf = requestAnimationFrame(loop); return; }
            if (exitingRef.current) return;
            exitingRef.current = true;
            setTimeout(() => { setSaindo(true); setTimeout(() => { onDoneRef.current?.(); setVisible(false); }, 500); }, 500);
        };
        raf = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(raf);
    }, [show]);

    if (!visible) return null;
    return <CerebroCarregando fixo progresso={progresso} saindo={saindo} />;
}
