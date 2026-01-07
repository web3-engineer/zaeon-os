/** @type {import('next').NextConfig} */
const nextConfig = {
    // 1. Autorização de domínios externos para o componente <Image />
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'lh3.googleusercontent.com',
                port: '',
                pathname: '/**',
            },
            {
                protocol: 'https',
                hostname: 'authjs.dev',
                port: '',
                pathname: '/**',
            },
        ],
    },

    // 2. Otimização de pacotes (Barrel Imports Optimization)
    // Reduz drasticamente os >13k módulos compilados
    modularizeImports: {
        "@heroicons/react/24/outline": {
            transform: "@heroicons/react/24/outline/{{member}}",
        },
        "@heroicons/react/24/solid": {
            transform: "@heroicons/react/24/solid/{{member}}",
        },
        "lucide-react": {
            transform: "lucide-react/dist/esm/icons/{{member}}",
        },
    },

    // 3. Configurações de Build e PDF
    webpack: (config) => {
        config.resolve.alias.canvas = false;
        return config;
    },

    // 4. Limite de tamanho para envios de arquivos (Zenita)
    experimental: {
        serverActions: {
            bodySizeLimit: '20mb',
        },
    },
};

export default nextConfig;