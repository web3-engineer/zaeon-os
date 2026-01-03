import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import dynamic from "next/dynamic";
import { Space_Grotesk, JetBrains_Mono } from "next/font/google";

import { Footer } from "@/components/main/footer";
import { Navbar } from "@/components/main/navbar";
import { siteConfig } from "@/config";
import { cn } from "@/lib/utils";
import { Web3Provider } from "./providers";
// ADICIONADO: O provedor de sessão do NextAuth
import AuthProvider from "@/src/providers/SessionProvider";
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
        <html lang="en" className="scroll-smooth">
        <body
            className={cn(
                "relative bg-background text-foreground overflow-x-hidden overflow-y-scroll",
                spaceGrotesk.variable,
                jetbrainsMono.variable,
                "font-sans"
            )}
        >
        <Web3Provider>
            <AuthProvider> {/* <--- ENVOLVENDO A APP COM SESSÃO */}
                <StarsCanvas />
                <Navbar />
                {children}
                <Footer />
            </AuthProvider>
        </Web3Provider>
        </body>
        </html>
    );
}