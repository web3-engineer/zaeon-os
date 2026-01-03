"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

// SOLUÇÃO: Usamos React.ComponentProps para pegar a tipagem automaticamente
// sem precisar adivinhar onde o arquivo de tipos está escondido.
export function ThemeProvider({ children, ...props }: React.ComponentProps<typeof NextThemesProvider>) {
    return (
        <NextThemesProvider {...props}>
            {children}
        </NextThemesProvider>
    );
}