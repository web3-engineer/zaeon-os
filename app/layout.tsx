import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import dynamic from "next/dynamic";
import { Space_Grotesk, JetBrains_Mono } from "next/font/google";

import { Footer } from "@/components/main/footer";
import { Navbar } from "@/components/main/navbar";
import { siteConfig } from "@/config";
import { cn } from "@/lib/utils";

// --- PROVIDERS ---
// 1. Privy Provider (Conexão EVM para o Hackathon)
import { PrivyWalletProvider } from "@/components/providers/PrivyWalletProvider";
// 2. Auth Provider (Sessão Google)
import AuthProvider from "@/src/providers/SessionProvider";
// 3. Theme Provider (Dark/Light Mode)
import { ThemeProvider } from "./providers";

import "../src/i18n";
import "./globals.css";

const StarsCanvas = dynamic(
    () => import("@/components/main/star-background"),
    { ssr: false }
);

const spaceGrotesk = Space_Grotesk({
    subsets: ["latin"],
    variable: "--font-space",
    weight: ["300", "400", "500", "600", "700"],
    display: "swap",
});

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
        <html lang="en" className="scroll-smooth" suppressHydrationWarning>
        <body
            className={cn(
                "relative bg-background text-foreground overflow-x-hidden overflow-y-scroll",
                spaceGrotesk.variable,
                jetbrainsMono.variable,
                "font-sans"
            )}
        >
        {/* 1. ThemeProvider envolve tudo */}
        <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem
            disableTransitionOnChange
        >
            {/* 2. Privy Wallet Provider (Substituindo o antigo MovementWalletProvider) */}
            <PrivyWalletProvider>
                {/* 3. Session Auth Provider */}
                <AuthProvider>
                    <StarsCanvas />
                    <Navbar />
                    {children}
                    <Footer />
                </AuthProvider>
            </PrivyWalletProvider>
        </ThemeProvider>
        </body>
        </html>
    );
}