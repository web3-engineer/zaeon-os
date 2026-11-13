"use client";

/**
 * VozOcta — a VOZ da Octa (a casa do entregável). Um botão 🔊/🔇 que, quando ligado, faz a Zaeon LER em
 * voz alta a narração do turno (o que a Octa acabou de fazer) pela mesma voz avançada do app
 * (useTTS → /api/ai/voice, igual ao caderno e ao guia). A preferência liga/desliga fica no localStorage.
 *
 * Fala só quando `texto` MUDA pra algo não-vazio (fim de turno) e a voz está ligada — não a cada polling.
 */
import { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { useTTS } from "@/lib/voice/useTTS";

const CHAVE = "zaeon.octa.voz";

export default function VozOcta({ texto }: { texto: string }) {
  const tts = useTTS();
  const [ligado, setLigado] = useState(false);
  const jaFalou = useRef<string>("");

  useEffect(() => {
    try { setLigado(localStorage.getItem(CHAVE) === "1"); } catch { /* sem storage */ }
  }, []);

  useEffect(() => {
    if (!ligado || !texto || texto === jaFalou.current) return;
    jaFalou.current = texto;
    let voice: string | undefined, gender: "f" | "m" | undefined;
    try {
      voice = localStorage.getItem("zaeon.voice.id") || undefined;
      gender = (localStorage.getItem("zaeon.voice.gender") as "f" | "m") || undefined;
    } catch { /* voz padrão */ }
    tts.speak(texto, { voice, gender }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [texto, ligado]);

  const alternar = () => {
    const novo = !ligado;
    setLigado(novo);
    try { localStorage.setItem(CHAVE, novo ? "1" : "0"); } catch { /* sem storage */ }
    if (!novo) tts.stop();
  };

  return (
    <button type="button" onClick={alternar} aria-pressed={ligado}
      title={ligado ? "Voz da Octa ligada — clique para desligar" : "Ligar a voz da Octa"}
      className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px]"
      style={{ border: "1px solid #363c46", color: ligado ? "#74ade8" : "#a9afbc", background: ligado ? "#74ade822" : "transparent" }}>
      {ligado ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
      voz
    </button>
  );
}
