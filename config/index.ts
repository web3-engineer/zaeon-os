import type { Metadata } from "next";

export const tituloZaeon = "Zaeon | Projetos reais, habilidades verificáveis";
export const descricaoZaeon = "Aprenda com IA e construa projetos que mostram o que você sabe fazer. Valide suas habilidades e seja descoberto por empresas que buscam seu talento.";

export const siteConfig: Metadata = {
  metadataBase: new URL("https://zaeon.com.br"),
  title: tituloZaeon,
  description: descricaoZaeon,
  authors: {
    name: "Don Martinez",
    url: "https://github.com/web3-engineer",
  },
} as const;
