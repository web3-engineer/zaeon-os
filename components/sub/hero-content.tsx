"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

// Componentes Internos
import MenuNavigation from "@/components/sub/MenuNavigation";
import { precarregarCyber } from "@/lib/cyber/precarga";
import styles from "./hero-aquario.module.css";
import LiquidGlassButton from "@/components/ui/LiquidGlassButton";
import MarCardumes from "./MarCardumes";
import CiclosAquario from "./CiclosAquario";

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
/** pra onde "Iniciar chat" leva quem já está logado: o chat da Aura (Sala de Estudos) */
const CHAT_ROTA = "/research-lab?tab=sala-de-estudos&estudo=chat";
/** o GAME: o cyberespaço — a rota já abre a sessão em jogo (sem menu). Sem conta, o botão abre o login, que volta direto pra cá. */
const GAME_ROTA = "/lounge-cosmico";

export default function HeroPage() {
  const { t } = useTranslation();
  const { status } = useSession();
  const router = useRouter();

  const [palavra, setPalavra] = useState(0);
  useEffect(() => {
    const movimento = window.matchMedia("(prefers-reduced-motion: reduce)");
    let timer: number | undefined;
    const sincronizar = () => {
      window.clearInterval(timer);
      if (!movimento.matches) timer = window.setInterval(() => setPalavra((i) => (i + 1) % 12), 2100);
    };
    sincronizar();
    movimento.addEventListener("change", sincronizar);
    return () => { window.clearInterval(timer); movimento.removeEventListener("change", sincronizar); };
  }, []);
  const [mensagem, setMensagem] = useState("");
  const [showChatbox, setShowChatbox] = useState(false);
  /** pra onde o login aberto agora leva: "lab" (criar conta) ou "jogo" (Iniciar jogo / Play game) */
  const [destinoLogin, setDestinoLogin] = useState<"lab" | "jogo">("lab");

  const logado = status === "authenticated";
  const beneficios = logado ? [] : ["mes", "cartao", "limites", "revisao"];

  // a PRÉ-CARGA do cyberespaço começa na primeira tela (o botão com a barra fica em cima do módulo, lá embaixo)
  useEffect(() => { precarregarCyber(); }, []);
  useEffect(() => {
    // (o "Play game" da landing abre o login JÁ pro jogo: `detail.jogo`; sem ele, o login leva ao laboratório)
    const abrir = (e: Event) => { setDestinoLogin((e as CustomEvent<{ jogo?: boolean }>).detail?.jogo ? "jogo" : "lab"); setShowChatbox(true); window.scrollTo({ top: 0, behavior: "smooth" }); };
    window.addEventListener(EVENTO_ABRIR_LOGIN, abrir);
    return () => window.removeEventListener(EVENTO_ABRIR_LOGIN, abrir);
  }, []);

  return (
    <main className={`relative isolate flex min-h-[calc(100svh-5.75rem)] w-full flex-col items-center justify-center overflow-hidden px-5 pb-16 pt-24 text-center font-display md:min-h-svh ${styles.aquario}`}>
      <div className={styles.oceano} aria-hidden="true">
        <CiclosAquario />
        <MarCardumes />
      </div>

      <motion.div
        animate={{
          scale: showChatbox ? 0.9 : 1,
          y: showChatbox ? -30 : 0,
          opacity: 1,
        }}
        transition={{ type: "spring", stiffness: 90, damping: 20 }}
        className="relative z-10 flex w-full max-w-4xl flex-col items-center text-center"
      >
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="relative flex flex-col items-center justify-center"
        >
            <h1 className="text-[clamp(2.25rem,5.2vw,4.75rem)] font-[family-name:var(--font-space)] font-semibold tracking-[-0.02em] text-slate-900 dark:text-white leading-[1.08] z-10 relative">
              <span className="sr-only">{t("landing.hero_principal.linha")} {t("landing.hero_principal.termo_0")}</span>
              <span aria-hidden="true">
                {t("landing.hero_principal.linha")}
                <span className={`block text-cyan-600 dark:text-[#67d8f2] ${styles.palavraParticulas}`}>
                  <span key={palavra} className={styles.termoParticulas}>{t(`landing.hero_principal.termo_${palavra}`)}</span>
                  <span key={`particulas-${palavra}`} className={styles.particulasPalavra}>
                    {Array.from({ length: 12 }, (_, i) => <i key={i} style={{ left: `${4 + i * 8}%`, top: `${24 + (i * 19) % 52}%`, animationDelay: `${i * 14}ms` }} />)}
                  </span>
                </span>
              </span>
            </h1>

        </motion.div>

        {!showChatbox && (
          <form className={`mt-8 w-full max-w-xl ${styles.compositor}`} onSubmit={(event) => {
            event.preventDefault();
            const texto = mensagem.trim();
            if (!texto || status === "loading") return;
            sessionStorage.setItem("zaeon:entrada:rascunho", texto);
            if (logado) router.push(CHAT_ROTA);
            else { setDestinoLogin("lab"); setShowChatbox(true); }
          }}>
            <input
              value={mensagem}
              onChange={(event) => setMensagem(event.target.value)}
              placeholder={t("landing.hero_principal.pergunta")}
              aria-label={t("landing.hero_principal.pergunta")}
              maxLength={4000}
            />
            <button type="submit" disabled={!mensagem.trim() || status === "loading"} aria-label={t("landing.hero_principal.chat")}>↑</button>
          </form>
        )}
        {!showChatbox && (
          <LiquidGlassButton className="mt-5" tom="destaque" tamanho="md" seta={false}
            onClick={() => {
              if (logado) router.push(GAME_ROTA);
              else { setDestinoLogin("jogo"); setShowChatbox(true); }
            }}>Cowork</LiquidGlassButton>
        )}

        {/* Badges de confiança (padrão ChipFlow) */}
        {!showChatbox && beneficios.length > 0 && (
          <ul className={`mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 ${styles.subtextos}`}>
            {beneficios.map((b) => (
              <li key={b} className="flex items-center gap-2 text-sm text-slate-800 dark:text-white/90">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/15">
                  <svg viewBox="0 0 20 20" className="h-3 w-3 text-emerald-500" fill="none" stroke="currentColor" strokeWidth={3} aria-hidden="true">
                    <path d="M4 10l4 4 8-9" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                {t(`landing.interface.${b}`, { defaultValue: "" })}
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
            className="w-full max-w-[520px] z-20 mt-8 relative origin-center"
          >
            {/* Menu alinhado à ESQUERDA da coluna (antes ficava centralizado junto de um
                card de "Convide" à direita, o que deixava o conjunto assimétrico). O
                convite não sumiu: mora dentro de OPÇÕES do próprio menu. */}
            <div className="w-full max-w-[500px]">
              <MenuNavigation destino={destinoLogin === "jogo" ? GAME_ROTA : CHAT_ROTA} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </main>
  );
}
