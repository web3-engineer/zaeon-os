import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Footer } from "@/components/main/footer";
import { Navbar } from "@/components/main/navbar";
import { StarsCanvas } from "@/components/main/star-background";
import { siteConfig } from "@/config";
import { cn } from "@/lib/utils";
import { inter, notoSansSC } from "@/app/fonts";
import ClientShell from "@/components/ClientShell";
// 1. IMPORTAÇÃO NOVA (Seu arquivo providers.tsx deve estar na mesma pasta 'app')
import { Web3Provider } from "./providers";

import "./globals.css";

export const viewport: Viewport = { themeColor: "#030014" };
export const metadata: Metadata = siteConfig;

export default function RootLayout({ children }: { children: ReactNode }) {
    return (
        <html lang="pt-BR">
        <head>
            {/* fonte Matrix global */}
            {/* Nota: href={notoSansSC.css} pode precisar de ajuste dependendo de como você carrega fontes, mas vou manter como está */}
            <script
                dangerouslySetInnerHTML={{
                    __html: `
              document.fonts.ready.then(() => {
                document.dispatchEvent(new Event("fonts-ready"));
              });
            `,
                }}
            />
        </head>
        <body
            className={cn(
                "relative bg-[#030014] text-white overflow-x-hidden overflow-y-scroll",
                inter.className
            )}
        >
        {/* 2. ENVOLVENDO TUDO COM O PROVIDER WEB3 */}
        <Web3Provider>
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