"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { defineChain } from "viem";

// Definição da Rede Movement (M1/M2 EVM Compatible)
const movementTestnet = defineChain({
    id: 30732,
    name: "Movement EVM",
    network: "movement-testnet",
    nativeCurrency: {
        decimals: 18,
        name: "Move",
        symbol: "MOVE",
    },
    rpcUrls: {
        default: {
            http: ["https://mevm.devnet.imola.movementlabs.xyz"],
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
            appId="cmjye2jlq03gxl80cwzxqw5ae" // Seu ID
            config={{
                loginMethods: ["email", "google", "wallet"],
                appearance: {
                    theme: "dark",
                    accentColor: "#22d3ee",
                    logo: "https://seu-logo-url.png",
                },
                supportedChains: [movementTestnet],
                embeddedWallets: {
                    // CORREÇÃO AQUI: Envolvemos a config dentro de 'ethereum' (pois Movement é EVM)
                    ethereum: {
                        createOnLogin: "users-without-wallets",
                    },
                },
            }}
        >
            {children}
        </PrivyProvider>
    );
};