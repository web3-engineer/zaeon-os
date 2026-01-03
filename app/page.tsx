"use client";

import { useState, useEffect, useLayoutEffect, Suspense } from "react";
import Hero from "@/components/main/hero";
import Encryption from "@/components/main/encryption";
import StudyRoomsPage from "@/app/study-rooms/page";
import MacSplash from "@/components/ui/MacSplash";

export default function Home() {
    const [isLoading, setIsLoading] = useState(true);

    // useLayoutEffect roda ANTES do navegador "pintar" a tela.
    // Isso garante que o scroll aconteça antes do usuário ver o bug.
    // (O check 'typeof window' evita erro no servidor do Next.js)
    const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

    useEffect(() => {
        // 1. Configuração Inicial (Trava tudo)
        if (typeof window !== "undefined") {
            window.history.scrollRestoration = "manual"; // Desliga memória do browser
            document.body.style.overflow = "hidden";     // Trava física
            window.scrollTo(0, 0);
        }

        // 2. Timer do Splash
        const timer = setTimeout(() => {
            setIsLoading(false);
        }, 2000);

        return () => clearTimeout(timer);
    }, []);

    // 3. O PULO DO GATO (Correção do Flash)
    // Monitoramos quando o 'isLoading' muda.
    // Assim que ele vira 'false' (conteúdo aparece), forçamos o topo IMEDIATAMENTE.
    useIsomorphicLayoutEffect(() => {
        if (!isLoading) {
            window.scrollTo(0, 0);

            // Só destravamos o scroll DEPOIS de garantir que estamos no topo
            // Um micro-delay de 10ms é seguro para o React renderizar o layout
            const unlockTimer = setTimeout(() => {
                document.body.style.overflow = "";
            }, 10);

            return () => clearTimeout(unlockTimer);
        }
    }, [isLoading]);

    return (
        <main className="h-full w-full">
            {isLoading ? (
                <div className="fixed inset-0 z-[99999] bg-[#030014] overflow-hidden">
                    <MacSplash minDurationMs={2000} />
                </div>
            ) : (
                <div className="flex flex-col gap-20">
                    <Hero />
                    <Encryption />

                    <div id="study-rooms" className="w-full">
                        <Suspense fallback={null}>
                            <StudyRoomsPage />
                        </Suspense>
                    </div>
                </div>
            )}
        </main>
    );
}