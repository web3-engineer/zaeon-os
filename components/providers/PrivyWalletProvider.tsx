"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { defineChain } from "viem";

// Definição da Rede Movement (M1/M2 EVM Compatible)
// Nota: Verifique a RPC atualizada no discord do Hackathon, esta é a padrão de devnet/testnet EVM
const movementTestnet = defineChain({
    id: 30732, // ID da Movement (M2 Testnet) - confirme se é 30732 ou 1263220063 no docs
    name: "Movement EVM",
    network: "movement-testnet",
    nativeCurrency: {
        decimals: 18,
        name: "Move",
        symbol: "MOVE",
    },
    rpcUrls: {
        default: {
            http: ["https://mevm.devnet.imola.movementlabs.xyz"], // RPC EVM
        },
        public: {
            http: ["https://mevm.devnet.imola.movementlabs.xyz"],
        },
    },
    blockExplorers: {
        default: { name: "Explorer", url: "https://explorer.movementlabs.xyz" },
    },
});

export const PrivyWalletProvider = ({ children }: { children: React.ReactNode }) => {
    return (
        <PrivyProvider
            appId="cmjye2jlq03gxl80cwzxqw5ae" // <--- COLOQUE SEU APP ID DA PRIVY AQUI (crie em dashboard.privy.io)
            config={{
                loginMethods: ["email", "google", "wallet"],
                appearance: {
                    theme: "dark",
                    accentColor: "#22d3ee", // Cyan do seu tema
                    logo: "https://seu-logo-url.png", // Opcional
                },
                supportedChains: [movementTestnet],
                embeddedWallets: {
                    createOnLogin: "users-without-wallets", // Cria carteira automática pra quem entra com Google
                },
            }}
        >
            {children}
        </PrivyProvider>
    );
};