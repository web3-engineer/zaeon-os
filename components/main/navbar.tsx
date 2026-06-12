"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";
import logoPng from "@/app/zaeon-name.png";
import ThemeToggle from "@/components/sub/ThemeToggle";
import InviteButton from "@/components/sub/InviteButton";
import "../../src/i18n";

const TRACKS = [
  "/assets/sounds/boot-track.mp3",
  "/assets/sounds/zaeon-theme-chill.mp3",
  "/assets/sounds/zaeon-theme-uplift.mp3"
];

// --- SINGLETON GLOBAL ---
let globalAudio: HTMLAudioElement | null = null;
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
    if (isHome && globalAudio) {
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
      if (globalAudio) {
        setIsPlaying(true); 
        initAudioEngine();
      }
    };
    window.addEventListener("zaeon-music-sync", handleMusicSync);
    return () => window.removeEventListener("zaeon-music-sync", handleMusicSync);
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

  return (
    <div 
      className={`w-full h-[90px] fixed top-0 z-[100] flex justify-center items-center pointer-events-none font-sans transition-all duration-700 ease-in-out ${
        isFocusMode ? "-translate-y-full opacity-0" : "translate-y-0 opacity-100"
      }`}
    >
      <div className="pointer-events-auto w-[96%] max-w-[1300px] h-[70px] rounded-[35px] backdrop-blur-xl bg-background/70 border border-foreground/10 shadow-2xl flex items-center justify-between px-8">
        
        <Link href="/" className="hover:scale-105 transition-transform">
          <Image src={logoPng} alt="logo" width={220} height={100} priority className="h-10 w-auto invert dark:invert-0" />
        </Link>

        <nav className="hidden lg:flex items-center gap-10">
          <Link href="/about" className={getLinkClassName("/about")}>About</Link>
          <Link href="/research-lab" className={getLinkClassName("/research-lab")}>Pesquisa</Link>
<Link href="/plugin-store" className={getLinkClassName("/plugin-store")}>Plugin Store</Link>
          <Link href="/news" className={getLinkClassName("/news")}>Notícias</Link>
        </nav>

        <div className="flex items-center gap-6">
          <div className={`flex items-center bg-white/5 backdrop-blur-2xl border border-white/10 rounded-full px-4 py-2 transition-all`}>
            <div className="flex items-center gap-3 mr-4">
              <button onClick={handlePrevTrack} className="text-foreground/40 hover:text-cyan-500">⏮</button>
              <button onClick={togglePlay} className="text-foreground hover:text-cyan-500 text-xl w-6">{isPlaying ? "⏸" : "▶"}</button>
              <button onClick={handleNextTrack} className="text-foreground/40 hover:text-cyan-500">⏭</button>
            </div>
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => setShowTrackName(!showTrackName)}>
              <div className="flex items-end gap-[3px] h-5 w-auto">
                {Array.from({ length: NUM_BARS }).map((_, i) => (
                  <div key={i} ref={(el) => { barsRef.current[i] = el; }} className="w-[2.5px] rounded-t-[1px] bg-cyan-500 shadow-[0_0_5px_rgba(34,211,238,0.4)]" style={{ height: '20%' }} />
                ))}
              </div>
              {showTrackName && <span className="text-[9px] font-black text-cyan-400 uppercase tracking-tighter ml-2">{getTrackName()}</span>}
            </div>
          </div>
          <InviteButton />
          <ThemeToggle />
        </div>
      </div>
    </div>
  );
};