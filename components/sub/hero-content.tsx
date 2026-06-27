"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { signIn, useSession } from "next-auth/react";
import { SparklesIcon, UserIcon } from "@heroicons/react/24/outline";

// Componentes Internos
import MenuNavigation from "@/components/sub/MenuNavigation";
import StarBackground from "@/components/main/star-background";

// Público-alvo que rotaciona no fim da frase ("...para <público>").
const TARGET_WORDS = [
  "você.",
  "curiosos.",
  "estudantes.",
  "professores.",
  "coordenadores.",
  "empresários.",
  "nerds.",
  "geeks.",
];

export default function HeroPage() {
  const { t } = useTranslation();
  const { status } = useSession();

  const [showChatbox, setShowChatbox] = useState(false);
  const [wordIndex, setWordIndex] = useState(0);
  // Trocadilho: "A gente" pisca pra "Agentes" de vez em quando (sincronizado com o verbo
  // facilita↔facilitam). Fica a maior parte do tempo em "A gente" e dá flashes de "Agentes".
  const [agenteOn, setAgenteOn] = useState(false);

  // Redireciona diretamente para o chat caso já esteja logado
  useEffect(() => {
    if (status === "authenticated") {
      setShowChatbox(true);
    }
  }, [status]);

  // Rotaciona o público em destaque a cada 3 segundos
  useEffect(() => {
    const interval = setInterval(() => {
      setWordIndex((prev) => (prev + 1) % TARGET_WORDS.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Flicker "A gente" → "Agentes": ~2,8s em "A gente", ~0,8s em "Agentes" (loop).
  useEffect(() => {
    let to: ReturnType<typeof setTimeout>;
    let on = false;
    const tick = () => {
      on = !on;
      setAgenteOn(on);
      to = setTimeout(tick, on ? 800 : 2800);
    };
    to = setTimeout(tick, 2800);
    return () => clearTimeout(to);
  }, []);

  return (
    <main className="w-full min-h-screen flex flex-col items-start justify-start relative px-8 md:px-16 lg:px-24 pt-24 md:pt-32 lg:pt-40 pb-20 overflow-hidden transition-colors duration-700 font-sans">

      {/* BACKGROUND LIMPO - Apenas o StarBackground visível */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <StarBackground />
      </div>

      {/* ========================================= */}
      {/* HIGHLIGHT (HERO) - MINIMALISTA & GLITCH   */}
      {/* ========================================= */}
      <motion.div
        animate={{
          scale: showChatbox ? 0.9 : 1,
          y: showChatbox ? -30 : 0,
          opacity: 1,
        }}
        transition={{ type: "spring", stiffness: 90, damping: 20 }}
        className="flex flex-col items-start text-left max-w-4xl z-10 w-full origin-left"
      >
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="relative flex flex-col items-start justify-center"
        >
          <h1 className="text-3xl sm:text-4xl md:text-[3.5rem] font-light tracking-tighter text-slate-900 dark:text-white leading-[1.2] z-10 relative">
            {/* Trocadilho: "A gente facilita" ↔ "Agentes facilitam" (sincronizado) */}
            <span
              className="cyber-glitch relative inline-block font-semibold text-cyan-600 dark:text-cyan-400"
              data-text={agenteOn ? "Agentes" : "A gente"}
            >
              {agenteOn ? "Agentes" : "A gente"}
            </span>{" "}
            {agenteOn ? "facilitam" : "facilita"} a vida para <br className="hidden md:block" />

            {/* Altura mínima garantida para evitar saltos no layout durante a troca de palavras */}
            <div className="min-h-[1.2em] flex items-center justify-start mt-2 md:mt-4">
              <AnimatePresence mode="wait">
                <motion.span
                  key={wordIndex}
                  initial={{ opacity: 0, filter: "blur(8px)", y: 10, skewX: 10 }}
                  animate={{ opacity: 1, filter: "blur(0px)", y: 0, skewX: 0 }}
                  exit={{ opacity: 0, filter: "blur(8px)", y: -10, skewX: -10 }}
                  transition={{ duration: 0.5, ease: "easeInOut" }}
                  className="font-extralight tracking-widest text-cyan-600 dark:text-cyan-400 cyber-glitch relative inline-block"
                  data-text={TARGET_WORDS[wordIndex]}
                >
                  {TARGET_WORDS[wordIndex]}
                </motion.span>
              </AnimatePresence>
            </div>
          </h1>

          <AnimatePresence>
            {!showChatbox && (
              <motion.div 
                initial={{ opacity: 0, height: 0, marginTop: 0 }}
                animate={{ opacity: 1, height: "auto", marginTop: 24 }}
                exit={{ opacity: 0, height: 0, marginTop: 0 }}
                transition={{ duration: 0.4, ease: "easeInOut" }}
                className="overflow-hidden"
              >
                <p className="max-w-2xl text-base sm:text-lg md:text-xl text-slate-600 dark:text-slate-400 font-light leading-relaxed">
                  A plataforma definitiva para orquestrar inteligências artificiais. Automatize fluxos de trabalho, ganhe eficiência e escale suas operações com agentes autônomos de última geração.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Botões Iniciais - Sem fundo pesado, mantendo a visão do espaço */}
        <AnimatePresence>
          {!showChatbox && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, filter: "blur(10px)" }}
              transition={{ duration: 0.4, delay: 0.2 }}
              className="mt-10 flex flex-col sm:flex-row gap-4 w-full sm:w-auto items-center justify-start"
            >
              <button
                onClick={() => setShowChatbox(true)}
                className="group relative flex items-center justify-center gap-3 px-10 py-4 rounded-full border border-cyan-500/30 text-cyan-700 dark:text-cyan-300 font-medium uppercase tracking-[0.2em] text-[11px] overflow-hidden transition-all hover:border-cyan-400 dark:hover:shadow-[0_0_20px_rgba(34,211,238,0.2)] hover:scale-105 bg-transparent"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-400/10 to-transparent -translate-x-[100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                <UserIcon className="w-4 h-4" />
                Entrar
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ========================================= */}
      {/* CHATBOX (Aparece ao clicar em Criar Agente) */}
      {/* ========================================= */}
      <AnimatePresence>
        {showChatbox && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: -20, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 100, damping: 20, delay: 0.1 }}
            className="w-full max-w-[760px] z-20 mt-0 relative origin-left"
          >
            <div className="flex items-center gap-4">
              <div className="w-full max-w-[500px] shrink-0">
                <MenuNavigation />
              </div>
              {/* (Convite saiu daqui — agora vive só dentro de Opções, no menu) */}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CSS do Glitch Holográfico Elegante */}
      <style jsx global>{`
        .cyber-glitch {
          position: relative;
        }
        
        .cyber-glitch::before,
        .cyber-glitch::after {
          content: attr(data-text);
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: transparent;
          pointer-events: none;
        }
        
        /* Camada 1: Ciano Deslocado */
        .cyber-glitch::before {
          left: 1px;
          text-shadow: -1px 0 rgba(6, 182, 212, 0.8);
          clip-path: polygon(0 0, 100% 0, 100% 10%, 0 10%);
          animation: glitch-elegant-1 3.5s infinite linear alternate-reverse;
        }
        
        /* Camada 2: Branco/Prata Subtil */
        .cyber-glitch::after {
          left: -1px;
          text-shadow: 1px 0 rgba(255, 255, 255, 0.3);
          clip-path: polygon(0 80%, 100% 80%, 100% 100%, 0 100%);
          animation: glitch-elegant-2 4s infinite linear alternate-reverse;
        }

        @keyframes glitch-elegant-1 {
          0% { clip-path: polygon(0 15%, 100% 15%, 100% 25%, 0 25%); transform: translate(0); }
          10% { clip-path: polygon(0 45%, 100% 45%, 100% 50%, 0 50%); transform: translate(-1px, 1px); }
          20% { clip-path: polygon(0 85%, 100% 85%, 100% 90%, 0 90%); transform: translate(1px, -1px); }
          30% { clip-path: polygon(0 10%, 100% 10%, 100% 20%, 0 20%); transform: translate(0); }
          40% { clip-path: polygon(0 60%, 100% 60%, 100% 70%, 0 70%); transform: translate(-1px, 0); }
          50% { clip-path: polygon(0 30%, 100% 30%, 100% 40%, 0 40%); transform: translate(0); }
          60%, 100% { clip-path: polygon(0 0, 0 0, 0 0, 0 0); transform: translate(0); } /* Pausa limpa sem glitch */
        }

        @keyframes glitch-elegant-2 {
          0%, 40% { clip-path: polygon(0 0, 0 0, 0 0, 0 0); transform: translate(0); } /* Pausa longa */
          50% { clip-path: polygon(0 20%, 100% 20%, 100% 30%, 0 30%); transform: translate(1px, 0); }
          60% { clip-path: polygon(0 75%, 100% 75%, 100% 80%, 0 80%); transform: translate(-1px, 1px); }
          70% { clip-path: polygon(0 40%, 100% 40%, 100% 55%, 0 55%); transform: translate(0); }
          80% { clip-path: polygon(0 80%, 100% 80%, 100% 90%, 0 90%); transform: translate(1px, -1px); }
          90% { clip-path: polygon(0 5%, 100% 5%, 100% 15%, 0 15%); transform: translate(-1px, 0); }
          100% { clip-path: polygon(0 60%, 100% 60%, 100% 65%, 0 65%); transform: translate(0); }
        }
      `}</style>
    </main>
  );
}