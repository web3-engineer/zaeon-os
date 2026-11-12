"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import LiquidGlassButton from "@/components/ui/LiquidGlassButton";

// Componentes Internos
import MenuNavigation from "@/components/sub/MenuNavigation";
import StarBackground from "@/components/main/star-background";
import MolecularText from "@/components/ui/MolecularText";
import { LAB_ROTA, copyEntrada } from "@/lib/ui/loungeHub";
import GlitchTexto from "@/components/ui/GlitchTexto";
import { precarregarCyber } from "@/lib/cyber/precarga";
import ZaeonCard from "@/components/main/ZaeonCard";

/** o botão do cyberespaço (lá embaixo, em cima do módulo) pede o login daqui quando a pessoa está deslogada */
export const EVENTO_ABRIR_LOGIN = "zaeon:abrir-login";

// Mural de modelos (v2): as IAs que o público já conhece, num lugar só.
// Texto, não logos oficiais (limpo + evita marca de terceiros). Os "extras"
// ficam mais discretos que os quatro principais.
const MODELS_MAIN = [
  { name: "GPT", org: "OpenAI", slug: "openai" },
  { name: "Claude", org: "Anthropic", slug: "anthropic" },
  { name: "Gemini", org: "Google", slug: "google" },
  { name: "Grok", org: "xAI", slug: "xai" },
];
const MODELS_MORE = [
  { name: "Llama", slug: "meta" },
  { name: "DeepSeek", slug: "deepseek" },
  { name: "Mistral", slug: "mistral" },
];

/**
 * Logo do provedor, com o nome como rede de segurança.
 *
 * Os arquivos oficiais entram em `public/assets/models/<slug>.svg`. Enquanto não
 * estiverem lá, o `onError` devolve o texto e a página não quebra — então este
 * componente pode subir antes dos assets.
 *
 * NÃO desenhamos marca de terceiro à mão: logo de fabricante se pega no press
 * kit dele, não se aproxima no olho.
 *
 * `dark:brightness-0 dark:invert` pinta tudo de branco no escuro, o que deixa os
 * sete coerentes entre si. Algumas diretrizes de marca proíbem recolorir — se
 * for o caso de alguma, é só tirar essas duas classes.
 */
function LogoModelo({ slug, name, org }: { slug: string; name: string; org?: string }) {
  const [falhou, setFalhou] = useState(false);

  // Logo E nome, não logo NO LUGAR do nome. Duas razões concretas, descobertas
  // olhando o resultado: (1) nem toda marca tem glifo disponível — GPT e Grok
  // ficaram sem, e a fileira virou duas gramáticas misturadas; (2) glifo sozinho
  // funciona pra quem já conhece a marca, e some pra quem não conhece, que é
  // justamente o público que o mural existe pra impressionar.
  return (
    <span className="inline-flex items-center gap-2">
      {falhou ? null : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/assets/models/${slug}.svg`}
          alt=""
          aria-hidden="true"
          onError={() => setFalhou(true)}
          loading="lazy"
          className="h-4 w-4 shrink-0 object-contain opacity-90 dark:brightness-0 dark:invert"
        />
      )}
      <span className="font-medium">{name}</span>
      {org ? <span className="text-slate-400 dark:text-slate-500">· {org}</span> : null}
    </span>
  );
}

// H1: a promessa — "Aprenda a fazer" + "qualquer coisa." (em destaque). Somos uma plataforma onde dá pra construir de
// tudo: hardware, software, artigos, pesquisas. O sub-header diz isso, com a palavra que gira (ideias/estudos/…).
const FRASE_COMPLETA = "Aprenda a fazer qualquer coisa.";
const GIRO = ["ideias", "estudos", "pesquisas", "produtos"];
/** pra onde "Iniciar chat" leva quem já está logado: o chat da Aura (Sala de Estudos) */
const CHAT_ROTA = "/research-lab?tab=sala-de-estudos";
/** o GAME: o cyberespaço — a rota já abre a sessão em jogo (sem menu). Sem conta, o botão abre o login, que volta direto pra cá. */
const GAME_ROTA = "/lounge-cosmico";

export default function HeroPage() {
  const { t } = useTranslation();
  const { status } = useSession();
  const router = useRouter();

  const [showChatbox, setShowChatbox] = useState(false);
  /** pra onde o login aberto agora leva: "lab" (criar conta) ou "jogo" (Iniciar jogo / Play game) */
  const [destinoLogin, setDestinoLogin] = useState<"lab" | "jogo">("lab");

  const logado = status === "authenticated";
  const copy = copyEntrada(logado);

  // a PRÉ-CARGA do cyberespaço começa na primeira tela (o botão com a barra fica em cima do módulo, lá embaixo)
  useEffect(() => { precarregarCyber(); }, []);
  useEffect(() => {
    // (o "Play game" da landing abre o login JÁ pro jogo: `detail.jogo`; sem ele, o login leva ao laboratório)
    const abrir = (e: Event) => { setDestinoLogin((e as CustomEvent<{ jogo?: boolean }>).detail?.jogo ? "jogo" : "lab"); setShowChatbox(true); window.scrollTo({ top: 0, behavior: "smooth" }); };
    window.addEventListener(EVENTO_ABRIR_LOGIN, abrir);
    return () => window.removeEventListener(EVENTO_ABRIR_LOGIN, abrir);
  }, []);

  return (
    <main className="w-full flex flex-col items-center justify-center text-center relative zaeon-borda min-h-[calc(100svh-110px)] pt-10 md:pt-14 pb-16 md:pb-20 overflow-hidden transition-colors duration-700 font-display">

      {/* BACKGROUND LIMPO - Apenas o StarBackground visível */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <StarBackground />
      </div>

      {/* a ZAEON na moldura do Figma (ZaeonCard → ZaeonVitrine: pensa, pesquisa e gera blueprints em laço) — só no computador */}
      <ZaeonCard className="absolute bottom-[4%] right-[1%] top-[4%] z-[5] hidden w-[min(30vw,400px)] md:block xl:right-[3%]" />

      {/* ========================================= */}
      {/* HERO v2 — TODAS AS IAS, FEITO PRA CIÊNCIA */}
      {/* ========================================= */}
      <motion.div
        animate={{
          scale: showChatbox ? 0.9 : 1,
          y: showChatbox ? -30 : 0,
          opacity: 1,
        }}
        transition={{ type: "spring", stiffness: 90, damping: 20 }}
        className="flex flex-col items-start text-left max-w-4xl self-start z-10 w-full origin-center md:max-w-[64%] xl:max-w-[62%]"
      >
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="relative flex flex-col items-start justify-center"
        >
            {/* Uma linha só, sem quebrar: tamanho FLUÍDO (clamp por vw) cresce com a tela
                e encolhe no mobile em vez de quebrar a frase. whitespace-nowrap trava a
                linha inteira (inclusive os espaços entre as palavras). */}
            <h1 className="text-[clamp(2.25rem,5.2vw,4.75rem)] font-[family-name:var(--font-space)] font-semibold tracking-[-0.02em] text-slate-900 dark:text-white leading-[1.08] z-10 relative">
              <span className="sr-only">{FRASE_COMPLETA}</span>
              <span aria-hidden="true">
                <span className="whitespace-nowrap">
                  <MolecularText text="Aprenda" />{" "}
                  <MolecularText text="a" delay={0.12} />{" "}
                  <MolecularText text="fazer" delay={0.24} />
                </span>
                <br />
                <span className="whitespace-nowrap">
                  <span className="text-cyan-600 dark:text-[#67d8f2]">
                    <MolecularText text="qualquer" delay={0.4} />{" "}
                    <MolecularText text="coisa" delay={0.52} />
                  </span>
                  <MolecularText text="." delay={0.6} />
                </span>
              </span>
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
                  {/* sub-header: humanos + IAs constroem juntos — com a palavra que gira (ideias, estudos, pesquisas, produtos) */}
                  <p className="max-w-2xl text-base sm:text-lg text-slate-900 dark:text-white font-light leading-relaxed">
                    <GlitchTexto
                      texto="Aqui é onde humanos e IAs se unem para juntos construírem"
                      palavras={GIRO}
                      classePalavra="font-normal text-cyan-700 dark:text-cyan-200"
                      delay={0.5}
                    />
                  </p>
                  {/* a plataforma: dá pra construir de tudo */}
                  <p className="mt-3 max-w-[520px] text-base leading-relaxed text-slate-700 dark:text-slate-400">
                    Hardware, software, artigos, pesquisas — tudo numa plataforma só, com as melhores IAs do seu lado.
                  </p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* CTAs */}
        <AnimatePresence>
          {!showChatbox && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, filter: "blur(10px)" }}
              transition={{ duration: 0.4, delay: 0.2 }}
              className="mt-9 flex flex-col sm:flex-row gap-3 sm:gap-4 w-full sm:w-auto items-center justify-start"
            >
              {/* PRIMÁRIO (vidro TINGIDO): sem conta, "Criar minha conta" (abre o login/cadastro — e a conta nova cai no
                  LABORATÓRIO); conectado, o chat. SECUNDÁRIO (vidro incolor): "Cowork" — sem conta, abre o login, e esse
                  login cai no espaço COWORK (o mundo 3D; só abre pra quem escolhe entrar). */}
              <LiquidGlassButton
                onClick={() => (logado ? router.push(CHAT_ROTA) : (setDestinoLogin("lab"), setShowChatbox(true)))}
                tom="destaque"
                tamanho="md"
                className="w-full sm:w-auto"
              >
                {logado ? "Iniciar chat" : "Criar minha conta"}
              </LiquidGlassButton>
              <LiquidGlassButton
                onClick={() => (logado ? router.push(GAME_ROTA) : (setDestinoLogin("jogo"), setShowChatbox(true)))}
                tom="neutro"
                tamanho="md"
                className="w-full sm:w-auto"
              >
                Cowork
              </LiquidGlassButton>
            </motion.div>
          )}
        </AnimatePresence>


        {/* MURAL DE MODELOS removido do hero — as IAs agora vivem só na seção
            "Equipados com", abaixo dos cards dos agentes (encryption.tsx). */}

        {/* Badges de confiança (padrão ChipFlow) */}
        {!showChatbox && copy.badges.length > 0 && (
          <ul className="mt-8 flex flex-wrap items-center justify-start gap-x-6 gap-y-3">
            {copy.badges.map((b) => (
              <li key={b} className="flex items-center gap-2 text-sm text-slate-800 dark:text-white/90">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/15">
                  <svg viewBox="0 0 20 20" className="h-3 w-3 text-emerald-500" fill="none" stroke="currentColor" strokeWidth={3} aria-hidden="true">
                    <path d="M4 10l4 4 8-9" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                {b}
              </li>
            ))}
          </ul>
        )}
      </motion.div>

      {/* (v4) o cartão da Aura ao vivo saiu de cena no desktop — o hero é só a promessa + os dois CTAs. */}

      {/* O cyberespaço embutido mora agora em "Crie a sua própria estação de trabalho" (app/study-rooms). */}

      {/* ========================================= */}
      {/* CHATBOX (Aparece ao logar / clicar começar) */}
      {/* ========================================= */}
      <AnimatePresence>
        {showChatbox && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: -20, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 100, damping: 20, delay: 0.1 }}
            className="w-full max-w-[520px] self-start z-20 mt-12 md:mt-16 relative origin-center text-left"
          >
            {/* Menu alinhado à ESQUERDA da coluna (antes ficava centralizado junto de um
                card de "Convide" à direita, o que deixava o conjunto assimétrico). O
                convite não sumiu: mora dentro de OPÇÕES do próprio menu. */}
            <div className="w-full max-w-[500px]">
              <MenuNavigation destino={destinoLogin === "jogo" ? GAME_ROTA : LAB_ROTA} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CSS do Glitch Holográfico Elegante (assinatura da casa) */}
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

        .cyber-glitch::before {
          left: 1px;
          text-shadow: -1px 0 rgba(6, 182, 212, 0.8);
          clip-path: polygon(0 0, 100% 0, 100% 10%, 0 10%);
          animation: glitch-elegant-1 3.5s infinite linear alternate-reverse;
        }

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
          60%, 100% { clip-path: polygon(0 0, 0 0, 0 0, 0 0); transform: translate(0); }
        }

        @keyframes glitch-elegant-2 {
          0%, 40% { clip-path: polygon(0 0, 0 0, 0 0, 0 0); transform: translate(0); }
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
