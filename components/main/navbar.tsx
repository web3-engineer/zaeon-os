'use client';

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic"; // Import para SSR

// --- IMPORT CORRIGIDO ---
import { useTranslation } from "react-i18next";
// Se Navbar está em src/components/main/, subir 2 níveis chega em src/
import "../../src/i18n";

import CONSTS from "@/constants";
import type { ComponentType } from "react";
import logoPng from "@/app/zaeon-name.png";

type NavLink = { title: string; link: string };
type Social = { name: string; link: string; icon?: ComponentType<{ className?: string }> | null };
type LinksObj = { sourceCode?: string };

const RAW = (CONSTS as unknown) as {
  NAV_LINKS?: NavLink[];
  SOCIALS?: Social[];
  LINKS?: LinksObj;
} | undefined;

const NAV_LINKS: NavLink[] = Array.isArray(RAW?.NAV_LINKS) ? (RAW!.NAV_LINKS as NavLink[]) : [];
const SOCIALS: Social[] = Array.isArray(RAW?.SOCIALS) ? (RAW!.SOCIALS as Social[]) : [];
const LINKS: LinksObj = RAW?.LINKS ?? {};

const NavbarComponent = () => {
  const { t } = useTranslation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
      <div className="w-full h-[90px] fixed top-0 z-50 flex justify-center items-center">
        {/* container estilo notch centralizado e mais amplo */}
        <div className="w-[96%] max-w-[1250px] h-[58px] rounded-3xl backdrop-blur-md bg-[#0a0a0a90] border border-[#1e293b66] shadow-[0_4px_20px_rgba(0,0,0,0.3)] flex items-center justify-between px-10 transition-all duration-300">

          {/* logo (levemente menor) */}
          <Link href="/" className="flex items-center justify-center">
            <Image
                src={logoPng}
                alt="zaeonlogo"
                width={180}
                height={180}
                priority
                draggable={false}
                className="h-14 w-auto object-contain"
            />
          </Link>

          {/* menu desktop */}
          <nav className="hidden md:flex justify-center flex-1 gap-12 text-[14px] font-medium text-slate-200 tracking-wide">
            <Link href="#about-us" className="hover:text-[#5fb4ff] transition-all duration-200 hover:scale-105">
              {t("navbar.about")}
            </Link>
            <Link href="#roadmap" className="hover:text-[#5fb4ff] transition-all duration-200 hover:scale-105">
              {t("navbar.roadmap")}
            </Link>
            <Link href="#study-rooms" className="hover:text-[#5fb4ff] transition-all duration-200 hover:scale-105">
              {t("navbar.study_rooms")}
            </Link>
          </nav>

          {/* menu mobile toggle */}
          <button
              className="md:hidden text-white focus:outline-none text-3xl"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            ☰
          </button>
        </div>

        {/* menu mobile */}
        {isMobileMenuOpen && (
            <div className="absolute top-[90px] left-0 w-full bg-[#0b0b0bcc] backdrop-blur-md p-6 flex flex-col items-center text-gray-300 md:hidden border-t border-[#1e293b80]">
              <Link href="#about-us" className="py-2 hover:text-[#5fb4ff]" onClick={() => setIsMobileMenuOpen(false)}>
                {t("navbar.about")}
              </Link>
              <Link href="#roadmap" className="py-2 hover:text-[#5fb4ff]" onClick={() => setIsMobileMenuOpen(false)}>
                {t("navbar.roadmap")}
              </Link>
              <Link href="#study-rooms" className="py-2 hover:text-[#5fb4ff]" onClick={() => setIsMobileMenuOpen(false)}>
                {t("navbar.study_rooms")}
              </Link>
            </div>
        )}
      </div>
  );
};

// Exportar com SSR: false para evitar erro de hidratação
export const Navbar = dynamic(() => Promise.resolve(NavbarComponent), { ssr: false });