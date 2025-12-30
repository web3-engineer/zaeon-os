// app/layout.tsx
import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Footer } from "@/components/main/footer";
import { Navbar } from "@/components/main/navbar";
import { StarsCanvas } from "@/components/main/star-background";
import { siteConfig } from "@/config";
import { cn } from "@/lib/utils";
import { inter, notoSansSC } from "@/app/fonts";
import ClientShell from "@/components/ClientShell";

import "./globals.css";

export const viewport: Viewport = { themeColor: "#030014" };
export const metadata: Metadata = siteConfig;

export default function RootLayout({ children }: { children: ReactNode }) {
    return (
        <html lang="pt-BR">
        <head>
            {/* fonte Matrix global */}
            <link rel="stylesheet" href={notoSansSC.css} />
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
        {/* Splash + hidratação controlada no cliente */}
        <ClientShell>
            <StarsCanvas />
            <Navbar />
            {children}
            <Footer />
        </ClientShell>
        </body>
        </html>
    );
}