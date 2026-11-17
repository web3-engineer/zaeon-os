import type { Metadata } from "next";
import { descricaoZaeon, tituloZaeon } from "@/config";
import HomeLanding from "./HomeLanding";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "Zaeon",
    locale: "pt_BR",
    title: tituloZaeon,
    description: descricaoZaeon,
  },
  twitter: {
    card: "summary",
    title: tituloZaeon,
    description: descricaoZaeon,
  },
};

export default function Home() {
  return <HomeLanding />;
}
