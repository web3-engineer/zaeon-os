/** @type {import('next').NextConfig} */
const nextConfig = {
    // 1. Autorização de domínios externos
    images: {
        remotePatterns: [
            // --- NOVOS DOMÍNIOS ADICIONADOS ---
            {
                protocol: 'https',
                hostname: 'lugaresdememoria.com.br',
            },
            {
                protocol: 'https',
                hostname: 'www.shutterstock.com',
            },
            {
                protocol: 'https',
                hostname: 'lukozo.com',
            },
            {
                protocol: 'https',
                hostname: 'www.criptofacil.com',
            },
            // -----------------------------------
            {
                protocol: 'https',
                hostname: '**', // Curinga mantido por precaução
            },
            {
                protocol: 'https',
                hostname: 'media.licdn.com',
            },
            {
                protocol: 'https',
                hostname: 'miro.medium.com',
            },
            {
                protocol: 'https',
                hostname: 'lh3.googleusercontent.com',
            },
            {
                protocol: 'https',
                hostname: 'authjs.dev',
            },
            {
                protocol: 'https',
                hostname: 'images.unsplash.com',
            },
            {
                protocol: 'https',
                hostname: 'avatars.githubusercontent.com',
            },
            {
                protocol: 'https',
                hostname: '**.googleusercontent.com',
            },
            {
                protocol: 'https',
                hostname: 'cdn.simpleicons.org',
            }
        ],
    },

    // 2. Otimização de pacotes (Barrel Imports)
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

    // 3. Resolução de conflitos de Build (Canvas/PDF)
    webpack: (config, { isServer }) => {
        config.resolve.alias.canvas = false;
        // Nodebox (Sustainable Use License, proíbe uso comercial) fora do bundle do navegador: o Sandpack só o
        // carrega no template vite-react/node, que a prévia do Octa nunca usa (ruling P3: só o template `react`).
        if (!isServer) config.resolve.alias['@codesandbox/nodebox'] = false;
        config.resolve.fallback = {
            ...config.resolve.fallback,
            fs: false,
            net: false,
            tls: false
        };
        return config;
    },

    // 4. Configurações Experimentais e de Performance
    experimental: {
        serverActions: {
            bodySizeLimit: '20mb',
        },
        // instrumentation.ts SEMPRE compilado. Antes era `process.env.SCHOLAR_WORKER === "1"`, mas isso
        // é decidido no BUILD — e nem o web nem o worker recebem SCHOLAR_WORKER no build (só no runtime,
        // via `environment` do compose), então NENHUM worker de fundo subia em prod (chores, canal,
        // scholar). O register() já sai sem fazer nada sem as flags de runtime (CHORES_WORKER,
        // CANAL_WORKER, SCHOLAR_WORKER) e só carrega Prisma/bullmq por import() dinâmico, então o boot
        // do web sem flag fica igual. Ver instrumentation.ts.
        instrumentationHook: true,
        // @prisma/client + .prisma/client externos: o Next 14 tentava EMPACOTAR o Prisma
        // Client e puxava a variante wasm (erro "Can't resolve ./query_engine_bg.js"),
        // que estourou quando o instrumentation.ts passou a importar o Prisma no boot.
        // Marcá-los como externos = Next não empacota, usa o require de runtime (o correto).
        // `@modelcontextprotocol/sdk` pelo MESMO motivo do Prisma, e descoberto do mesmo jeito: rodando
        // o build. O `lib/agent/mcp.ts` importava o SDK por ESPECIFICADOR EM VARIÁVEL, truque que
        // existia pra o `tsc` não tentar resolver um pacote AUSENTE. Com o pacote presente, o truque
        // virou o defeito: o webpack não consegue analisar `import(variavel)`, resolve contra o próprio
        // mapa de módulos — que não tem o SDK — e `sdkPresente()` devolvia FALSE com o SDK instalado.
        // O boot logava "o SDK não está instalado, rode npm i" tendo ele ali. Externo + especificador
        // LITERAL = o Next não empacota e usa o require de runtime (o pacote é dual CJS/ESM, então
        // vale no Node 20 da imagem).
        serverComponentsExternalPackages: ["canvas", "sharp", "bullmq", "ioredis", "@prisma/client", ".prisma/client", "prisma", "@modelcontextprotocol/sdk"],
        // Tree-shaking dos barrels pesados (framer-motion/recharts são usados em todo
        // lugar) → bundle inicial menor, telas abrindo mais rápido. lucide/heroicons já
        // têm o modularizeImports acima; incluí-los aqui também é seguro.
        optimizePackageImports: ["framer-motion", "recharts", "@heroicons/react", "lucide-react"],
    },

    // 5. Service worker (public/sw.js). O Cache-Control é o que importa: se o
    // próprio /sw.js ficasse em cache, o interruptor de emergência (DESLIGAR)
    // não chegaria no aparelho. Vale no servidor custom porque o server.js
    // delega tudo pro app.getRequestHandler().
    async headers() {
        // os arquivos PESADOS do 3D (os corpos VRM/GLB, os clipes de movimento, os sons, as texturas) saíam com
        // `max-age=0`: toda visita reconferia, e a banda do servidor é curta (out/2026: ~250 KB/s por arquivo — a
        // avatar do chat e a Zaeon da landing ficavam minutos "chegando"). Agora o navegador guarda por 1 dia e, por
        // mais 7, usa o que tem enquanto confere o novo. (Os nomes não têm hash: uma troca de VRM leva até 1 dia pra
        // chegar em quem já tinha; o manifest.json dos avatares, que o estúdio reescreve, fica de fora.)
        const CACHE_3D = [{ key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" }];
        return [
            { source: "/avatars/:id/:arquivo(.*\\.(?:vrm|glb))", headers: CACHE_3D },
            { source: "/avatars/:id/voz/:arquivo(.*\\.(?:wav|mp3|ogg))", headers: CACHE_3D },
            { source: "/zaeon/movimento/:caminho*", headers: CACHE_3D },
            { source: "/anim/:caminho*", headers: CACHE_3D },
            { source: "/assets/sounds/:caminho*", headers: CACHE_3D },
            { source: "/assets/cyber/:caminho*", headers: CACHE_3D },
            {
                source: "/sw.js",
                headers: [
                    { key: "Content-Type", value: "application/javascript; charset=utf-8" },
                    { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
                    { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self'" },
                ],
            },
        ];
    },

    // 6. Build e Qualidade
    eslint: {
        ignoreDuringBuilds: true,
    },
    typescript: {
        ignoreBuildErrors: true,
    }
};

export default nextConfig;