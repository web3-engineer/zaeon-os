import type { MetadataRoute } from "next";

/**
 * Manifesto do PWA.
 *
 * O Next serve este arquivo em `/manifest.webmanifest` e injeta o
 * `<link rel="manifest">` sozinho — nao existe manifest.json em public/.
 *
 * Decisoes que nao sao obvias:
 *
 * - `display: "standalone"` e nao `"fullscreen"`: a Zaeon tem navegacao propria
 *   e formularios; esconder a barra de status do sistema atrapalha mais do que
 *   ajuda, e no iOS `fullscreen` nem e respeitado.
 * - `orientation: "any"`: travar em retrato e tentador para um app de celular,
 *   mas quebra tablet e quebra quem usa o telefone preso num suporte deitado.
 * - `background_color` = a cor da tela de splash enquanto o app abre, e por isso
 *   e a MESMA do fundo escuro do app. Se fosse branco, todo cold start piscaria
 *   branco antes de virar escuro.
 * - Os icones vem em dois sabores. `any` e a arte cheia com fundo transparente.
 *   `maskable` e a arte a 72% sobre fundo solido, porque o Android RECORTA o
 *   icone na forma do launcher (circulo, squircle, gota) e a zona garantida e so
 *   80% do lado — um icone sem essa folga aparece com as beiradas decepadas.
 * - `id` fixo: sem ele o navegador usa a `start_url` como identidade, e mudar a
 *   start_url um dia faria o aparelho tratar como se fosse outro app.
 */
export default function manifest(): MetadataRoute.Manifest {
    return {
        id: "/",
        name: "Zaeon",
        short_name: "Zaeon",
        description:
            "Todas as IAs num só lugar — dentro de um sistema feito pra você produzir ciência.",
        start_url: "/",
        scope: "/",
        display: "standalone",
        orientation: "any",
        background_color: "#030014",
        theme_color: "#030014",
        lang: "pt-BR",
        dir: "ltr",
        categories: ["education", "productivity", "science"],
        icons: [
            { src: "/icons/icon-192.png?v=3", sizes: "192x192", type: "image/png", purpose: "any" },
            { src: "/icons/icon-512.png?v=3", sizes: "512x512", type: "image/png", purpose: "any" },
            {
                src: "/icons/maskable-192.png?v=3",
                sizes: "192x192",
                type: "image/png",
                purpose: "maskable",
            },
            {
                src: "/icons/maskable-512.png?v=3",
                sizes: "512x512",
                type: "image/png",
                purpose: "maskable",
            },
        ],
    };
}
