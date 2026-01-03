import { Suspense } from "react";
import Hero from "@/components/main/hero";
// Ajuste o caminho do Encryption se necessário (geralmente fica em sub)
import Encryption from "@/components/main/encryption";
import StudyRoomsPage from "@/app/study-rooms/page";

export default function Home() {
    return (
        <main className="h-full w-full">
            <div className="flex flex-col gap-20">

                {/* 1. Hero Section */}
                <Hero />

                {/* 2. Sobre Nós / Encryption */}
                <Encryption />

                {/* 3. Study Rooms (Com ID para o scroll do Menu) */}
                <div id="study-rooms" className="w-full">
                    <Suspense fallback={null}>
                        <StudyRoomsPage />
                    </Suspense>
                </div>

            </div>
        </main>
    );
}