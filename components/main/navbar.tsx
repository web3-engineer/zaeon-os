"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";
import logoPng from "@/app/zaeon-name.png";
import ThemeToggle from "@/components/sub/ThemeToggle";
import { ehRotaImersiva } from "@/lib/ui/loungeHub";
import "../../src/i18n";

const TRACKS = [
  "/assets/sounds/boot-track.mp3",
  "/assets/sounds/zaeon-theme-chill.mp3",
  "/assets/sounds/zaeon-theme-uplift.mp3"
];

// --- SINGLETON GLOBAL ---
let globalAudio: HTMLAudioElement | null = null;
// Enquanto a intro toca a música (com fade próprio), o navbar NÃO deve dar o
// pause()/currentTime=0 seco no isHome — senão corta a música no meio do fade.
let introMusicActive = false;
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
    if (!globalAudio) return;
    
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
    
    if (typeof window !== "undefined" && !globalAudio) {
      globalAudio = new Audio(TRACKS[0]);
      globalAudio.crossOrigin = "anonymous";
      globalAudio.volume = 0.4;
      (window as any).zaeonAudio = globalAudio;
    }

    if (globalAudio && !globalAudio.paused && !isHome) {
      setIsPlaying(true);
      initAudioEngine();
    }
  }, [isHome, initAudioEngine]);

  useEffect(() => {
    // Não corta enquanto a intro está tocando (ela tem fade próprio).
    if (isHome && globalAudio && !introMusicActive) {
      globalAudio.pause();
      globalAudio.currentTime = 0;
      globalAudio.src = TRACKS[0];
      setCurrentTrackIndex(0);
      setIsPlaying(false);
    }
  }, [pathname, isHome]);

  // ESCUTA O COMANDO DE SYNC DO INTRO
  useEffect(() => {
    const handleMusicSync = () => {
      introMusicActive = true; // intro assumiu a música → segura o pause do isHome
      if (globalAudio) {
        setIsPlaying(true);
        initAudioEngine();
      }
    };
    const handleMusicEnd = () => { introMusicActive = false; }; // fade terminou → volta ao normal
    window.addEventListener("zaeon-music-sync", handleMusicSync);
    window.addEventListener("zaeon-music-end", handleMusicEnd);
    return () => {
      window.removeEventListener("zaeon-music-sync", handleMusicSync);
      window.removeEventListener("zaeon-music-end", handleMusicEnd);
    };
  }, [initAudioEngine]);

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
    if (!globalAudio) return;
    initAudioEngine();

    if (isPlaying) { 
      globalAudio.pause(); 
      setIsPlaying(false); 
    } else { 
      globalAudio.play().then(() => setIsPlaying(true)); 
    }
  };

  const handleNextTrack = () => {
    if (!globalAudio) return;
    const next = (currentTrackIndex + 1) % TRACKS.length;
    setCurrentTrackIndex(next);
    globalAudio.src = TRACKS[next];
    globalAudio.play();
    setIsPlaying(true);
  };

  const handlePrevTrack = () => {
    if (!globalAudio) return;
    const prev = (currentTrackIndex - 1 + TRACKS.length) % TRACKS.length;
    setCurrentTrackIndex(prev);
    globalAudio.src = TRACKS[prev];
    globalAudio.play();
    setIsPlaying(true);
  };

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
      <div className="pointer-events-auto w-full h-[64px] flex items-center backdrop-blur-2xl backdrop-saturate-[1.6]
          bg-white/50 dark:bg-white/[0.06]
          border-b border-white/60 dark:border-white/[0.12]
          shadow-[inset_0_1px_0_0_rgba(255,255,255,0.9)] dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.28)]">
        <div className="w-full zaeon-borda flex items-center justify-between">

          <Link href="/" className="transition-opacity hover:opacity-80">
            <Image src={logoPng} alt="logo" width={220} height={100} priority className="h-9 w-auto invert dark:invert-0" />
          </Link>

          <nav className="hidden lg:flex items-center gap-10">
            <Link href="/about" className={getLinkClassName("/about")}>Sobre nós</Link>
            <Link href="/docs" className={getLinkClassName("/docs")}>Documentação</Link>
            {/* "Laboratório" saiu da navegação: o acesso é pelo cyberespaço (base de estudo → Sala de Estudos). */}
            <Link href="/plugin-store" className={getLinkClassName("/plugin-store")}>Plugins</Link>
            <Link href="/news" className={getLinkClassName("/news")}>Notícias</Link>
          </nav>

          <div className="flex items-center gap-6">
            <ThemeToggle />
          </div>
        </div>
      </div>
    </div>
  );
};