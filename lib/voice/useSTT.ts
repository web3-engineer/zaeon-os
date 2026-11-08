"use client";

/**
 * useSTT — ditado por voz (fala → texto), com degradação graciosa.
 *
 * Hoje: Web Speech API do navegador (SpeechRecognition / webkitSpeechRecognition).
 * Futuro (premium/VPS): faster-whisper via /api/ai/stt (mesma interface deste hook).
 *
 * Uso:
 *   const { toggle, listening, supported, aviso } = useSTT({ onResult: (t, final) => setText(t) });
 *
 * #733: `ouviu` diz se já chegou alguma fala (até lá, a tela mostra "fale agora"), e `aviso` diz por que o microfone
 * desligou quando não foi a pessoa que parou — antes ele parava sozinho depois da pausa, ou falhava, sem dizer nada.
 */
import { useCallback, useRef, useState } from "react";

type Opts = { lang?: string; continuous?: boolean; onResult?: (text: string, final: boolean) => void };

/** por que o microfone parou sem a pessoa pedir */
export type AvisoSTT = "desligou" | "negado" | "sem-som" | "sem-microfone" | "sem-rede" | "falhou";

export const TEXTO_AVISO_STT: Record<AvisoSTT, string> = {
  desligou: "O microfone desligou depois da pausa. Toque nele para falar de novo.",
  negado: "O microfone está bloqueado. Libere o microfone para este site nas configurações do navegador.",
  "sem-som": "Não ouvi nada. Toque no microfone e fale perto dele.",
  "sem-microfone": "O navegador não encontrou um microfone funcionando. Confira se ele está ligado e escolhido no computador.",
  "sem-rede": "Sem internet, o navegador não consegue transformar a fala em texto.",
  falhou: "Não deu para usar o microfone agora. Tente de novo.",
};

/** o erro do navegador (SpeechRecognitionErrorEvent.error) no aviso de quem usa */
export function avisoDoErro(erro: string | undefined): AvisoSTT | null {
  if (erro === "aborted") return null;   // parou porque outro começou, ou a pessoa parou: não é falha
  if (erro === "not-allowed" || erro === "service-not-allowed") return "negado";
  if (erro === "no-speech") return "sem-som";
  if (erro === "audio-capture") return "sem-microfone";
  if (erro === "network") return "sem-rede";
  return "falhou";
}

export function useSTT(opts?: Opts) {
  const [listening, setListening] = useState(false);
  const [ouviu, setOuviu] = useState(false);
  const [aviso, setAviso] = useState<AvisoSTT | null>(null);
  const recRef = useRef<any>(null);
  const pediuParar = useRef(false);
  const optsRef = useRef<Opts | undefined>(opts);
  optsRef.current = opts;

  const supported = typeof window !== "undefined"
    && !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

  const stop = useCallback(() => {
    pediuParar.current = true;
    try { recRef.current?.stop(); } catch { /* ignore */ }
    setListening(false);
  }, []);

  const start = useCallback(() => {
    if (typeof window === "undefined") return;
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    pediuParar.current = true;   // o anterior, se houver, parou por causa deste — não é aviso
    try { recRef.current?.stop(); } catch { /* ignore */ }
    const rec = new SR();
    rec.lang = optsRef.current?.lang || "pt-BR";
    rec.continuous = !!optsRef.current?.continuous;
    rec.interimResults = true;
    let falhou: AvisoSTT | null = null;
    rec.onresult = (e: any) => {
      // #733: junta TODOS os trechos (antes, só a partir de `resultIndex` — no modo contínuo, o que já tinha sido
      // fechado sumia da caixa quando a pessoa continuava falando)
      let txt = "";
      for (let i = 0; i < e.results.length; i++) txt += e.results[i][0].transcript;
      const final = !!e.results[e.results.length - 1]?.isFinal;
      if (txt.trim()) setOuviu(true);
      optsRef.current?.onResult?.(txt.trim(), final);
    };
    rec.onerror = (e: any) => { falhou = avisoDoErro(e?.error); };
    rec.onend = () => {
      if (recRef.current !== rec) return;   // um mais novo já assumiu
      setListening(false);
      if (!pediuParar.current) setAviso(falhou ?? "desligou");
    };
    recRef.current = rec;
    pediuParar.current = false;
    setAviso(null); setOuviu(false);
    setListening(true);
    try { rec.start(); } catch { setListening(false); setAviso("falhou"); }
  }, []);

  const toggle = useCallback(() => { listening ? stop() : start(); }, [listening, start, stop]);
  const limparAviso = useCallback(() => setAviso(null), []);

  return { start, stop, toggle, listening, supported, ouviu, aviso, limparAviso };
}

export default useSTT;
