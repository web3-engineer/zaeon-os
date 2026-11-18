"use client";

/**
 * useMicrofone — o lado-navegador do P3: pede o microfone, monta o AudioContext + AnalyserNode, e num
 * laço de animação detecta a nota tocada (lib/audio/pitch, puro). Emite `aoNota` UMA vez por nota
 * ESTÁVEL (a mesma por alguns quadros) — assim um tom sustentado conta como UM toque, não cinquenta;
 * e expõe a nota corrente pra um afinador ao vivo.
 *
 * Toda a parte difícil (achar a altura) é testada no pitch.ts; aqui é só encanamento de áudio.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { notaDoBuffer, type NotaDetectada } from "@/lib/audio/pitch";

export type EstadoMic = { ativo: boolean; erro: string | null; nota: NotaDetectada | null };

export function useMicrofone(opts: { aoNota?: (n: NotaDetectada) => void; estavelFrames?: number } = {}) {
  const estavel = opts.estavelFrames ?? 3;
  const [estado, setEstado] = useState<EstadoMic>({ ativo: false, erro: null, nota: null });

  const streamRef = useRef<MediaStream | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);
  const aoNotaRef = useRef(opts.aoNota);
  aoNotaRef.current = opts.aoNota;

  const parar = useCallback(() => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    void ctxRef.current?.close().catch(() => undefined);
    ctxRef.current = null;
    setEstado((e) => ({ ...e, ativo: false, nota: null }));
  }, []);

  const iniciar = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
      streamRef.current = stream;
      const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      ctxRef.current = ctx;
      await ctx.resume().catch(() => undefined);
      const fonte = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      fonte.connect(analyser);
      const buf = new Float32Array(analyser.fftSize);
      setEstado({ ativo: true, erro: null, nota: null });

      let candidato: string | null = null;
      let conta = 0;
      let ultimoEmitido: string | null = null;
      let silencio = 0;

      const laco = () => {
        analyser.getFloatTimeDomainData(buf);
        const nota = notaDoBuffer(buf, ctx.sampleRate);
        setEstado((e) => (e.nota?.id === nota?.id && e.nota?.cents === nota?.cents ? e : { ...e, nota }));
        if (!nota) {
          silencio++;
          if (silencio > estavel * 2) { ultimoEmitido = null; candidato = null; conta = 0; } // gap → libera repetir a mesma nota
        } else {
          silencio = 0;
          if (nota.id === candidato) conta++;
          else { candidato = nota.id; conta = 1; }
          if (conta === estavel && nota.id !== ultimoEmitido) {
            ultimoEmitido = nota.id;
            aoNotaRef.current?.(nota);
          }
        }
        rafRef.current = requestAnimationFrame(laco);
      };
      rafRef.current = requestAnimationFrame(laco);
    } catch (e: unknown) {
      const nome = (e as { name?: string })?.name;
      const erro = nome === "NotAllowedError" ? "Permissão do microfone negada." : nome === "NotFoundError" ? "Nenhum microfone encontrado." : "Não consegui abrir o microfone.";
      setEstado({ ativo: false, erro, nota: null });
    }
  }, [estavel]);

  useEffect(() => () => parar(), [parar]);

  return { estado, iniciar, parar };
}
