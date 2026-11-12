import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import localFont from "next/font/local";

import { siteConfig } from "@/config";
import { cn } from "@/lib/utils";

// --- PROVIDERS ---
import AuthProvider from "@/src/providers/SessionProvider";
import { ThemeProvider } from "./providers";
// 1. IMPORT THE WEB3 PROVIDER
import { Web3Provider } from "@/src/context/Web3Context";

// --- COMPONENTES GLOBAIS ---
import { Navbar } from "@/components/main/navbar";
import { RegistrarSW } from "@/components/pwa/RegistrarSW";
import { AvisoVersaoNova } from "@/components/sistema/AvisoVersaoNova";
import { BannerVersaoMobile } from "@/components/mobile/BannerVersaoMobile";

import "../src/i18n";
import "./globals.css";

// Fontes LOCAIS (app/_fonts, variáveis, subset latin — baixadas do Google Fonts, licença OFL). Antes eram
// next/font/google, que baixa do fonts.googleapis.com DURANTE o build: uma resposta ruim do Google derrubou
// o deploy do #516 ("An error occurred in next/font"). Os nomes das variáveis CSS não mudaram.
const spaceGrotesk = localFont({
    src: "./_fonts/space-grotesk-latin-var.woff2",
    variable: "--font-space",
    weight: "300 700",
    display: "swap",
});

const jetbrainsMono = localFont({
    src: "./_fonts/jetbrains-mono-latin-var.woff2",
    variable: "--font-code",
    weight: "100 800",
    display: "swap",
});

const outfit = localFont({
    src: "./_fonts/outfit-latin-var.woff2",
    variable: "--font-outfit",
    weight: "100 900",
    display: "swap",
});

// Fonte "tech" fina — usada no co-working da Sala de Estudos (pill de agente, composer).
const interTight = localFont({
    src: "./_fonts/inter-tight-latin-var.woff2",
    variable: "--font-tech",
    weight: "100 900",
    display: "swap",
});

// Fonte de DISPLAY da landing (hero e títulos de seção): geométrica, moderna, "tecnológica".
const sora = localFont({
    src: "./_fonts/sora-latin-var.woff2",
    variable: "--font-display",
    weight: "100 800",
    display: "swap",
});

/**
 * `viewportFit: "cover"` e o que faz a pagina ocupar a tela inteira em aparelho
 * com entalhe/ilha; sem ele o iOS deixa duas tarjas da cor de fundo em cima e
 * embaixo quando o app roda instalado. O preco disso sao os `env(safe-area-inset-*)`
 * na navbar e no body (globals.css) -- os dois andam juntos: pedir `cover` sem
 * tratar as bordas coloca a navbar embaixo do relogio.
 *
 * NAO existe `maximumScale`/`userScalable` aqui de proposito: bloquear o zoom
 * deixa o app inacessivel para quem enxerga mal, e o iOS ignora mesmo assim.
 *
 * `themeColor` e um valor so, escuro, e nao um par por `prefers-color-scheme`:
 * a Zaeon abre no escuro por padrao, entao um par pintaria a barra do navegador
 * de branco para quem esta no claro do SO -- que e o descasamento pior.
 */
export const viewport: Viewport = {
    width: "device-width",
    initialScale: 1,
    viewportFit: "cover",
    themeColor: "#030014",
};

export const metadata: Metadata = {
    ...siteConfig,
    applicationName: "Zaeon",
    // O manifesto vive em app/manifest.ts; o Next serve e linka sozinho.
    appleWebApp: {
        capable: true,
        title: "Zaeon",
        // "black-translucent" deixa o conteudo correr por baixo da barra de
        // status; so e honesto porque a navbar recua com safe-area-inset-top.
        statusBarStyle: "black-translucent",
    },
    icons: {
        icon: [
            { url: "/icons/icon-192.png?v=3", sizes: "192x192", type: "image/png" },
            { url: "/icons/icon-512.png?v=3", sizes: "512x512", type: "image/png" },
        ],
        apple: [{ url: "/icons/apple-touch-icon.png?v=3", sizes: "180x180", type: "image/png" }],
    },
};

export default function RootLayout({ children }: { children: ReactNode }) {
    return (
        <html lang="pt-BR" className="scroll-smooth" suppressHydrationWarning>
            <body
                className={cn(
                    "relative bg-white dark:bg-background text-foreground overflow-x-hidden overflow-y-scroll",
                    spaceGrotesk.variable,
                    jetbrainsMono.variable,
                    outfit.variable,
                    interTight.variable,
                    sora.variable,
                    "font-sans"
                )}
            >
                {/* Service worker (public/sw.js): só registra em produção. */}
                <RegistrarSW />
                {/* #756: deploy novo com a aba aberta — recarrega se faltar pedaço do site, ou avisa "versão nova" */}
                <AvisoVersaoNova />

                <ThemeProvider
                    attribute="class"
                    defaultTheme="dark"
                    disableTransitionOnChange
                >
                    <AuthProvider>
                        <Web3Provider>
                            <Navbar />
                            {children}

                            {/* Oferece /m nas salas completas, no celular (NEXT_PUBLIC_MOBILE_UI). */}
                            <BannerVersaoMobile />

                        </Web3Provider>
                    </AuthProvider>
                </ThemeProvider>
            </body>
        </html>
    );
}