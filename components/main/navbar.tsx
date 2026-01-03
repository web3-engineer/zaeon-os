"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import dynamic from "next/dynamic";
import { useTranslation } from "react-i18next";
import logoPng from "@/app/zaeon-name.png";

import ThemeToggle from "@/components/sub/ThemeToggle";
import "../../src/i18n";

const NavbarComponent = () => {
  const { t } = useTranslation();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Lógica de Alternância (Mantida, mas sem estilo visual agressivo)
  const isHomeworkPage = pathname === "/homework";
  const toggleLink = isHomeworkPage ? "/workstation" : "/homework";
  const toggleLabel = isHomeworkPage ? t("navbar.workstation") : t("navbar.homework");

  // Estilo padrão para todos os links (Minimalista)
  const linkStyle = "hover:text-cyan-500 dark:hover:text-[#5fb4ff] transition-all duration-200 hover:scale-105 cursor-pointer";

  return (
      <div className="w-full h-[90px] fixed top-0 z-50 flex justify-center items-center pointer-events-none">
        <div className="pointer-events-auto w-[96%] max-w-[1250px] h-[70px] rounded-3xl backdrop-blur-md
                        bg-background/80 border border-foreground/10 shadow-lg
                        flex items-center justify-between px-6 md:px-10 transition-all duration-300">

          {/* LOGO */}
          <Link href="/" className="flex items-center justify-center">
            <Image
                src={logoPng}
                alt="zaeonlogo"
                width={280}
                height={150}
                priority
                draggable={false}
                className="h-12 w-auto object-contain invert dark:invert-0 transition-all"
            />
          </Link>

          {/* MENU DESKTOP - Agora todos os itens são iguais */}
          <nav className="hidden md:flex justify-center flex-1 gap-12 text-[14px] font-medium text-foreground/80 tracking-wide">
            <Link href="/#about-us" className={linkStyle}>
              {t("navbar.about")}
            </Link>

            <Link href="/#study-rooms" className={linkStyle}>
              {t("navbar.study_rooms")}
            </Link>

            {/* O Botão Toggle agora tem o MESMO ESTILO dos outros */}
            <Link href={toggleLink} className={linkStyle}>
              {toggleLabel}
            </Link>
          </nav>

          {/* DIREITA: TEMA + MOBILE TOGGLE */}
          <div className="flex items-center gap-4">
            <ThemeToggle />

            <button
                className="md:hidden text-foreground focus:outline-none text-2xl"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              ☰
            </button>
          </div>
        </div>

        {/* MENU MOBILE */}
        {isMobileMenuOpen && (
            <div className="pointer-events-auto absolute top-[85px] w-[90%] max-w-[400px] rounded-2xl bg-background/95 border border-foreground/10 backdrop-blur-xl p-6 flex flex-col items-center text-foreground shadow-2xl animate-in slide-in-from-top-5">
              <Link href="/#about-us" className="py-3 w-full text-center hover:bg-foreground/5 rounded-lg" onClick={() => setIsMobileMenuOpen(false)}>
                {t("navbar.about")}
              </Link>
              <Link href="/#study-rooms" className="py-3 w-full text-center hover:bg-foreground/5 rounded-lg" onClick={() => setIsMobileMenuOpen(false)}>
                {t("navbar.study_rooms")}
              </Link>
              <Link href={toggleLink} className="py-3 w-full text-center hover:bg-foreground/5 rounded-lg" onClick={() => setIsMobileMenuOpen(false)}>
                {toggleLabel}
              </Link>
            </div>
        )}
      </div>
  );
};

export const Navbar = dynamic(() => Promise.resolve(NavbarComponent), { ssr: false });