"use client";

/**
 * useVoiceAnswer — grava a resposta por voz do aluno: captura áudio (MediaRecorder)
 * e transcrição (Web Speech via useSTT) ao mesmo tempo. Ao parar, sobe o áudio em
 * /api/aulas/audio e devolve { audioUrl, transcript }.
 *
 * Degrada com graça: se não houver mic/MediaRecorder, ainda dá pra ter transcript;
 * se não houver STT, ainda dá pra ter áudio. O que faltar volta vazio.
 */
import { useCallback, useRef, useState } from "react";
import { useSTT } from "@/lib/voice/useSTT";

export type VoiceResult = { audioUrl: string; transcript: string };

export function useVoiceAnswer() {
  const [recording, setRecording] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [transcript, setTranscript] = useState("");
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const transcriptRef = useRef("");

  const stt = useSTT({ lang: "pt-BR", continuous: true, onResult: (t) => { transcriptRef.current = t; setTranscript(t); } });

  const start = useCallback(async () => {
    transcriptRef.current = ""; setTranscript("");
    chunksRef.current = [];
    try {
      if (typeof navigator !== "undefined" && navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== "undefined") {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
        const rec = new MediaRecorder(stream);
        rec.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
        recorderRef.current = rec;
        rec.start();
      }
    } catch { /* sem mic → só transcript, se houver */ }
    if (stt.supported) stt.start();
    setRecording(true);
  }, [stt]);

  const stop = useCallback(async (): Promise<VoiceResult> => {
    setRecording(false);
    try { stt.stop(); } catch { /* ignore */ }

    const rec = recorderRef.current;
    const blob = await new Promise<Blob | null>((resolve) => {
      if (!rec) return resolve(null);
      rec.onstop = () => resolve(new Blob(chunksRef.current, { type: rec.mimeType || "audio/webm" }));
      try { rec.stop(); } catch { resolve(null); }
    });
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    recorderRef.current = null;

    let audioUrl = "";
    if (blob && blob.size > 0) {
      setUploading(true);
      try {
        const fd = new FormData();
        fd.append("file", blob, "resposta.webm");
        const r = await fetch("/api/aulas/audio", { method: "POST", body: fd });
        if (r.ok) { const d = await r.json(); audioUrl = d.url || ""; }
      } catch { /* upload falhou → segue só com transcript */ }
      finally { setUploading(false); }
    }
    return { audioUrl, transcript: transcriptRef.current };
  }, [stt]);

  return { recording, uploading, transcript, supported: stt.supported, start, stop };
}

export default useVoiceAnswer;
