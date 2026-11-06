"use client";

import { mentoresTab, lojaLabel } from "@/lib/mentores/rota";
import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";
import logoPng from "@/app/zaeon-name.png";
import ThemeToggle from "@/components/sub/ThemeToggle";
import ConfigMenu from "@/components/sub/ConfigMenu";
import { ehRotaImersiva } from "@/lib/ui/loungeHub";
import { musica } from "@/lib/audio/musica";
import "../../src/i18n";

const TRACKS = [
  "/assets/sounds/boot-track.mp3",
  "/assets/sounds/zaeon-theme-chill.mp3",
  "/assets/sounds/zaeon-theme-uplift.mp3"
];

// --- A MÚSICA tem DONO ÚNICO: lib/audio/musica.ts (play/fade/parar). O navbar só pede e mostra. ---
const audioEl = () => musica().elemento(TRACKS[0]) as unknown as HTMLAudioElement;
let globalAudioCtx: AudioContext | null = null;
let globalAnalyser: AnalyserNode | null = null;
let globalSource: MediaElementAudioSourceNode | null = null;

const NUM_BARS = 12;

export const Navbar = () => {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [showTrackName, setShowTrackName] = useState(false);
  
  // --- NOVO: Estado do Modo Foco ---
  const [isFocusMode, setIsFocusMode] = useState(false);

  const barsRef = useRef<(HTMLDivElement | null)[]>([]);
  const isPlayingRef = useRef(false);

  const isHome = pathname === "/";

  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);

  const visualize = () => {
    if (!globalAnalyser) return;
    const dataArray = new Uint8Array(globalAnalyser.frequencyBinCount);
    const render = () => {
      requestAnimationFrame(render);
      if (isPlayingRef.current && globalAnalyser) {
        globalAnalyser.getByteFrequencyData(dataArray);
        barsRef.current.forEach((bar, i) => {
          if (!bar) return;
          const val = dataArray[i * 2] || 0;
          const h = Math.min(100, Math.max(15, (val / 255) * 100 * 1.5));
          bar.style.height = `${h}%`;
        });
      }
    };
    render();
  };

  const initAudioEngine = useCallback(() => {
    const globalAudio = audioEl();
    
    if (!globalAudioCtx) {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      globalAudioCtx = new AudioContext();
    }

    if (!globalSource && globalAudioCtx) {
      globalAnalyser = globalAudioCtx.createAnalyser();
      globalAnalyser.fftSize = 128;
      
      try {
        globalSource = globalAudioCtx.createMediaElementSource(globalAudio);
        globalSource.connect(globalAnalyser);
        globalAnalyser.connect(globalAudioCtx.destination);
      } catch (err) {
        console.warn("Fonte de áudio já conectada pelo navegador.");
      }
    }

    if (globalAudioCtx.state === "suspended") globalAudioCtx.resume();
    visualize(); 
  }, []);

  useEffect(() => {
    setMounted(true);
    
    const m = musica(); audioEl();   // garante o elemento (window.zaeonAudio)
    setIsPlaying(m.estado !== "parado");
    if (m.estado !== "parado" && !isHome) initAudioEngine();
  }, [isHome, initAudioEngine]);

  // Na home, a faixa volta pro início — MAS só se a música estiver PARADA. Tocando ou em fade (a intro), nada
  // de pause()/currentTime=0: era esse corte seco que fazia a música "parar do nada".
  useEffect(() => {
    if (isHome && musica().rebobinarSeParado(TRACKS[0])) setCurrentTrackIndex(0);
  }, [pathname, isHome]);

  // o estado da música vem do dono único (a intro toca/fadeia por ele)
  useEffect(() => musica().inscrever((e) => { setIsPlaying(e !== "parado"); if (e === "tocando") initAudioEngine(); }), [initAudioEngine]);

  // --- NOVO: ESCUTA O SINAL DE MODO FOCO DAS SALAS ---
  useEffect(() => {
    const handleFocusMode = (e: any) => {
      setIsFocusMode(e.detail);
    };
    window.addEventListener("zaeon-focus-mode", handleFocusMode);
    
    // Resetar se mudar de rota
    return () => {
      window.removeEventListener("zaeon-focus-mode", handleFocusMode);
    };
  }, []);

  const togglePlay = () => {
    const m = musica(); m.destravar(); initAudioEngine();
    if (m.estado !== "parado") void m.parar(800);   // pausa com fade, nunca seco
    else void m.tocar(TRACKS[currentTrackIndex]);
  };

  const trocarFaixa = (i: number) => {
    const m = musica(); m.destravar(); initAudioEngine();
    setCurrentTrackIndex(i);
    void m.tocar(TRACKS[i]);   // fade-out da atual → troca → fade-in
  };
  const handleNextTrack = () => trocarFaixa((currentTrackIndex + 1) % TRACKS.length);
  const handlePrevTrack = () => trocarFaixa((currentTrackIndex - 1 + TRACKS.length) % TRACKS.length);

  const getTrackName = () => TRACKS[currentTrackIndex].split('/').pop()?.replace('.mp3', '') || 'Track';
  const getLinkClassName = (path: string) => {
    const active = pathname.startsWith(path);
    return `transition-all uppercase tracking-[0.2em] text-[10px] font-black ${active ? "text-cyan-500 scale-110" : "text-foreground/50 hover:text-cyan-400"}`;
  };


  if (!mounted) return null;
  // /m é o app mobile: tem cabeçalho próprio (coluna única, sem navbar do site).
  if (pathname === "/m" || pathname?.startsWith("/m/")) return null;
  // Lounge Cósmico é tela cheia imersiva: sem chrome global.
  if (ehRotaImersiva(pathname)) return null;
  // ferramentas internas de dev (ex.: estúdio de avatar /dev/avatares) — tela cheia, sem o menu do site
  if (pathname?.startsWith("/dev/")) return null;

  return (
    <div
      className={`w-full fixed top-0 z-[100] pt-[env(safe-area-inset-top)] pointer-events-none font-sans transition-all duration-700 ease-in-out ${
        isFocusMode ? "-translate-y-full opacity-0" : "translate-y-0 opacity-100"
      }`}
    >
      {/* Navbar CHAPADA: barra full-width, hairline embaixo, sem pílula/borda redonda/sombra pesada. */}
      {/* Apple liquid glass: translúcido, backdrop-blur + saturação, borda fina e um
          fio de luz especular no topo. Vale nos dois modos (whitish no claro, esfumado
          no escuro) — o material é o mesmo do 'Iniciar' e do menu principal. */}
      <div className="pointer-events-auto w-full h-[64px] flex items-center backdrop-blur-md backdrop-saturate-[1.6]
          bg-white/50 dark:bg-white/[0.06]
          border-b border-white/60 dark:border-white/[0.12]
          shadow-[inset_0_1px_0_0_rgba(255,255,255,0.9)] dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.28)]">
        <div className="w-full zaeon-borda flex items-center justify-between">

          <Link href="/" className="transition-opacity hover:opacity-80">
            <Image src={logoPng} alt="logo" width={220} height={100} priority className="h-9 w-auto invert dark:invert-0" />
          </Link>

          <nav className="hidden lg:flex items-center gap-7">
            {/* ordem do dono: Documentação › Sobre nós ("Como funciona" saiu da navbar a pedido do dono; a seção #como-funciona continua na landing) */}
            <Link href="/docs" className={getLinkClassName("/docs")}>Documentação</Link>
            <Link href="/about" className={getLinkClassName("/about")}>Sobre nós</Link>
            {/* acesso direto ao laboratório, pra quem não quiser usar o cyberespaço */}
            <Link href="/research-lab" className={getLinkClassName("/research-lab")}>Laboratório</Link>
            {/* "Assistentes" = a antiga Loja de Plugins (o /plugin-store continua no ar pros links antigos) */}
            <Link href={mentoresTab() ? "/mentores" : "/assistentes"} className={getLinkClassName(pathname.startsWith("/plugin-store") ? "/plugin-store" : mentoresTab() ? "/mentores" : "/assistentes")}>{lojaLabel()}</Link>
            <Link href="/news" className={getLinkClassName("/news")}>Notícias</Link>
          </nav>

          <div className="flex items-center gap-1.5">
            {/* #713: no celular os links do topo somem; ficam neste menu */}
            <MenuLinks itens={[
              { href: "/docs", rotulo: "Documentação" },
              { href: "/about", rotulo: "Sobre nós" },
              { href: "/research-lab", rotulo: "Laboratório" },
              { href: mentoresTab() ? "/mentores" : "/assistentes", rotulo: lojaLabel() },
              { href: "/news", rotulo: "Notícias" },
            ]} />
            <ThemeToggle />
            {/* engrenagem: voz, idioma, convite, Modo CEO (founder), sair — as opções do menu principal */}
            <ConfigMenu />
          </div>
        </div>
      </div>
    </div>
  );
};
/** #713: os links do topo no celular (abaixo de lg a barra não tem espaço pra eles) */
function MenuLinks({ itens }: { itens: { href: string; rotulo: string }[] }) {
  const [aberto, setAberto] = useState(false);
  const raiz = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  useEffect(() => { setAberto(false); }, [pathname]);
  useEffect(() => {
    if (!aberto) return;
    const fora = (e: PointerEvent) => { if (!raiz.current?.contains(e.target as Node)) setAberto(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setAberto(false); };
    document.addEventListener("pointerdown", fora); document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("pointerdown", fora); document.removeEventListener("keydown", esc); };
  }, [aberto]);
  return (
    <div ref={raiz} className="relative lg:hidden">
      <button type="button" onClick={() => setAberto((v) => !v)} aria-expanded={aberto} aria-controls="menu-links-site" aria-label={aberto ? "Fechar o menu" : "Abrir o menu"}
        className="w-11 h-11 rounded-full flex items-center justify-center text-[20px] leading-none text-slate-700 dark:text-white/85 hover:bg-slate-900/5 dark:hover:bg-white/10">
        ☰
      </button>
      {aberto && (
        <nav id="menu-links-site" aria-label="Páginas do site"
          className="absolute right-0 top-12 w-56 overflow-hidden rounded-2xl border border-slate-200 dark:border-white/10 bg-white/95 dark:bg-[#0b1020]/95 backdrop-blur-xl shadow-2xl py-1">
          {itens.map((i) => (
            <Link key={i.href} href={i.href} onClick={() => setAberto(false)} aria-current={pathname === i.href ? "page" : undefined}
              className="flex min-h-[44px] items-center px-4 text-[14px] font-semibold text-slate-700 dark:text-white/85 hover:bg-slate-900/5 dark:hover:bg-white/10 aria-[current=page]:text-cyan-600 dark:aria-[current=page]:text-cyan-300">
              {i.rotulo}
            </Link>
          ))}
        </nav>
      )}
    </div>
  );
}
