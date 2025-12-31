import { createConfig, http } from 'wagmi';
import { sepolia } from 'wagmi/chains';
import { defineChain } from 'viem';
import { injected } from 'wagmi/connectors';

// --- CORREÇÃO FINAL: IMPORTAR COM O NOME CERTO ---
import { wepinWallet } from '@wepin/wagmi-connector';

// Definindo a Very Network
export const veryMainnet = defineChain({
    id: 4613,
    name: 'Very Mainnet',
    nativeCurrency: { name: 'Very', symbol: 'VERY', decimals: 18 },
    rpcUrls: {
        default: { http: ['https://rpc.verylabs.io'] },
    },
    blockExplorers: {
        default: { name: 'VeryScan', url: 'https://veryscan.io' },
    },
});

export const config = createConfig({
    chains: [veryMainnet, sepolia],

    connectors: [
        injected(), // MetaMask

        // --- USO DA FUNÇÃO CORRETA ---
        wepinWallet({
            appId: 'da2844c58339e33604cdfa0a5a4f3334', // <--- COLE SEU APP ID
            appKey: 'ak_live_GCTTXin6TN5WkkvaOWYZ9PWnjPxBaSLI8pLg0MkZhiG' // <--- COLE SUA APP KEY
        })
    ],

    transports: {
        [veryMainnet.id]: http(),
        [sepolia.id]: http(),
    },
    ssr: true,
});