"use client";

import { useState, useEffect, Suspense } from "react";
import Hero from "@/components/main/hero";
import Encryption from "@/components/main/encryption";
import StudyRoomsPage from "@/app/study-rooms/page";

// Importando do caminho que você indicou
import MacSplash from "@/components/ui/MacSplash";

export default function Home() {
    // 1. Estado para controlar se estamos carregando ou não
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // 2. Define o tempo de 3 segundos (3000ms)
        const timer = setTimeout(() => {
            setIsLoading(false);
        }, 3000);

        // Limpeza do timer caso o usuário saia da página antes
        return () => clearTimeout(timer);
    }, []);

    return (
        <main className="h-full w-full">
            {isLoading ? (
                // 3. SE estiver carregando, mostra APENAS o Splash
                // Isso cria a máscara perfeita enquanto o resto carrega no background
                <div className="fixed inset-0 z-[99999] bg-[#030014]">
                    <MacSplash />
                </div>
            ) : (
                // 4. SE terminou (passou 3s), mostra o site real
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