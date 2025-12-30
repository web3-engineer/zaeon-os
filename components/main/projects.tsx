"use client";
import { motion } from "framer-motion";
import ABOUT_US from "@/constants";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import dynamic from 'next/dynamic';
import { useState, useRef, useEffect } from "react";

const TeamSection = dynamic(() => import('@/components/main/TeamSection'), { ssr: false });

type AboutItem = {
  title: string;
  description: string;
  image: string;
  link?: string;
};

// Robust extraction: ABOUT_US may be default array or an object with ABOUT_US
const RAW: any = ABOUT_US as any;
const DATA: AboutItem[] = Array.isArray(RAW)
    ? (RAW as AboutItem[])
    : Array.isArray(RAW?.ABOUT_US)
        ? (RAW.ABOUT_US as AboutItem[])
        : [];

export const Projects = () => {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const [showTeam, setShowTeam] = useState(false);
  const teamRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (showTeam && teamRef.current) {
      // slight delay to ensure TeamSection mounts before scrolling
      setTimeout(() => {
        teamRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 30);
    }
  }, [showTeam]);

  function openTeam() {
    setShowTeam(true);
  }

  return (
      <section
          id="about-us"
          className="flex flex-col items-center justify-center py-20"
      >
        <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <div className="py-20">
            <h1 className="text-[44px] sm:text-[52px] font-light tracking-tight leading-tight text-center select-none">
              <motion.span
                className="bg-[linear-gradient(90deg,_#3b82f6,_#9333ea,_#ec4899,_#3b82f6)] bg-clip-text text-transparent select-none"
                style={{ backgroundSize: "300% 100%" }}
                animate={{ backgroundPosition: ["0% 0%", "100% 0%", "0% 0%"] }}
                transition={{ duration: 6, ease: "easeInOut", repeat: Infinity }}
              >
                Conheça nossa Startup
              </motion.span>
            </h1>
          </div>
        </motion.section>

        <div className="h-full w-full flex flex-col md:flex-row gap-10 px-10">
          {DATA.length > 0 ? (
              DATA.map((item: AboutItem) => (
                  <div
                      key={item.title}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (item.title.toLowerCase().includes("nossa equipe")) openTeam();
                      }}
                      className="rounded-2xl transition-transform duration-300 hover:scale-105 hover:shadow-[0_0_30px_rgba(147,51,234,0.4)] cursor-pointer"
                  >
                    <div className="relative group overflow-hidden rounded-2xl cursor-pointer">
                      <img
                        src={item.image}
                        alt={item.title}
                        className="w-full h-full object-cover transform transition-transform duration-500 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                        <motion.div
                          style={{ backgroundSize: "200% 100%" }}
                          animate={{ backgroundPosition: ["-200% 0%", "200% 0%"] }}
                          transition={{ duration: 3.2, repeat: Infinity, ease: "linear" }}
                        >
                          <span className="text-xl sm:text-2xl font-semibold tracking-tight text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]">
                            {item.title}
                          </span>
                        </motion.div>
                      </div>
                    </div>
                  </div>
              ))
          ) : (
              <div className="text-white/70">Em breve atualizaremos esta seção.</div>
          )}
        </div>
        {showTeam && (
          <motion.div
            id="team-pane"
            ref={teamRef}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="w-full mt-16"
          >
            <TeamSection />
          </motion.div>
        )}
        <div id="projects-end" />
      </section>
  );
};

export default Projects;