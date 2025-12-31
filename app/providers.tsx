'use client';

import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react'; // Importação de tipo segura

// Importando a configuração que acabamos de criar no Passo 1
// O "../" sai da pasta 'app' e entra na pasta 'config'
import { config } from '@/app/config/wagmi';

const queryClient = new QueryClient();

export function Web3Provider({ children }: { children: ReactNode }) {
    return (
        <WagmiProvider config={config}>
            <QueryClientProvider client={queryClient}>
                {children}
            </QueryClientProvider>
        </WagmiProvider>
    );
}