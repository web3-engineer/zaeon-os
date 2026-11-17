import type { Metadata } from "next";
import AboutContent from "./AboutContent";

const title = "Sobre a Zaeon | Projetos, credenciais e talentos";
const description = "Conheça a Zaeon, a plataforma para estudar com IA, construir projetos e demonstrar habilidades. Ajudamos empresas a encontrar talentos com trabalho comprovado.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/about" },
  openGraph: { type: "website", url: "/about", title, description, siteName: "Zaeon", locale: "pt_BR" },
  twitter: { card: "summary", title, description },
};

export default function AboutPage() {
  return <AboutContent />;
}
