import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Arquitetura da Zaeon | Agentes, privacidade e verificação",
  description: "Entenda como a Zaeon usa agentes de IA, verificação de trabalho e credenciais na Solana para apoiar estudos e projetos.",
  alternates: { canonical: "/about/about-us" },
};

export default function TechnicalAboutLayout({ children }: { children: ReactNode }) {
  return children;
}
