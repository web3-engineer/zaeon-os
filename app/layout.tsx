import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
// 1. Importando as novas fontes direto do Google
import { Space_Grotesk, JetBrains_Mono } from "next/font/google";

import { Footer } from "@/components/main/footer";
import { Navbar } from "@/components/main/navbar";
import { StarsCanvas } from "@/components/main/star-background";
import { siteConfig } from "@/config";
import { cn } from "@/lib/utils";
import ClientShell from "@/components/ClientShell";
import { Web3Provider } from "./providers";
import "../src/i18n"; // Garante que o i18n seja carregado

import "./globals.css";

// 2. Configurando Space Grotesk (Visual Moderno/Sci-Fi)
const spaceGrotesk = Space_Grotesk({
    subsets: ["latin"],
    variable: "--font-space",
    weight: ["300", "400", "500", "600", "700"],
    display: "swap",
});

// 3. Configurando JetBrains Mono (Visual Código/Terminal)
const jetbrainsMono = JetBrains_Mono({
    subsets: ["latin"],
    variable: "--font-code",
    weight: ["100", "200", "300", "400", "500", "600", "700", "800"],
    display: "swap",
});

export const viewport: Viewport = { themeColor: "#030014" };
export const metadata: Metadata = siteConfig;

export default function RootLayout({ children }: { children: ReactNode }) {
    return (
        <html lang="en" className="scroll-smooth">
        <body
            className={cn(
                "relative bg-[#030014] text-white overflow-x-hidden overflow-y-scroll",
                // 4. Injetando as variáveis CSS das fontes
                spaceGrotesk.variable,
                jetbrainsMono.variable,
                // Definindo a fonte padrão como a Space Grotesk
                "font-sans"
            )}
        >
        {/* Provider Web3 (Wagmi + Query) */}
        <Web3Provider>
            {/* Shell do Cliente (i18n, Animações, etc) */}
            <ClientShell>
                <StarsCanvas />
                <Navbar />
                {children}
                <Footer />
            </ClientShell>
        </Web3Provider>
        </body>
        </html>
    );
}