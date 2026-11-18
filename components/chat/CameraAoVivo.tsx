"use client";
/**
 * components/chat/CameraAoVivo.tsx — a CÂMERA AO VIVO ("be my eyes"). Abre a câmera do aparelho,
 * captura ~1 frame/s e pede a descrição ao servidor (/api/ai/camera, que reusa o motor de visão da
 * PR-4). Frame-polling, não streaming — o laço é o "ao vivo".
 *
 * AUTO-GATED pelo endpoint: se a flag VISAO_CAMERA está desligada, o POST volta 404 e o painel mostra
 * "indisponível" em vez de um laço que nunca responde. Então mesmo sem o prop de capacidade no pai, o
 * componente nunca promete o que o servidor não faz.
 *
 * Limpa atrás de si: para os tracks da câmera e o laço ao fechar/desmontar (câmera acesa esquecida é o
 * pior defeito possível aqui).
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, X, Loader2 } from "lucide-react";

const INTERVALO_MS = 1500; // ~1 frame a cada 1,5 s — o mesmo teto de vídeo do Gemini Live
const QUALIDADE_JPEG = 0.6;

export default function CameraAoVivo({ onFechar }: { onFechar: () => void }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const emVooRef = useRef(false); // evita sobrepor pedidos se um frame demora mais que o intervalo

  const [pergunta, setPergunta] = useState("");
  const perguntaRef = useRef("");
  useEffect(() => { perguntaRef.current = pergunta; }, [pergunta]);

  const [descricao, setDescricao] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [ativo, setAtivo] = useState(false);

  const pararTudo = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setAtivo(false);
  }, []);

  const capturarEDescrever = useCallback(async () => {
    const video = videoRef.current, canvas = canvasRef.current;
    if (!video || !canvas || emVooRef.current || !video.videoWidth) return;
    emVooRef.current = true;
    try {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const frame = canvas.toDataURL("image/jpeg", QUALIDADE_JPEG);
      const r = await fetch("/api/ai/camera", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ frame, pergunta: perguntaRef.current || undefined }),
      });
      if (r.status === 404) { setErro("A câmera ao vivo não está ligada no servidor."); pararTudo(); return; }
      if (r.status === 401) { setErro("Entre na sua conta para usar a câmera."); pararTudo(); return; }
      const j = await r.json().catch(() => ({ ok: false }));
      if (j?.ok && typeof j.texto === "string") setDescricao(j.texto);
      else if (j?.erro === "sem_credencial") { setErro("A visão não está configurada no servidor."); pararTudo(); }
    } catch {
      /* um frame que falha não derruba o laço — o próximo tenta de novo */
    } finally {
      emVooRef.current = false;
    }
  }, [pararTudo]);

  // abre a câmera ao montar
  useEffect(() => {
    let cancelado = false;
    (async () => {
      if (!navigator.mediaDevices?.getUserMedia) { setErro("Este aparelho não expõe a câmera ao navegador."); return; }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
        if (cancelado) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play().catch(() => {}); }
        setAtivo(true);
        timerRef.current = setInterval(() => { void capturarEDescrever(); }, INTERVALO_MS);
      } catch {
        setErro("Não consegui acessar a câmera — verifique a permissão do navegador.");
      }
    })();
    return () => { cancelado = true; pararTudo(); };
  }, [capturarEDescrever, pararTudo]);

  const fechar = () => { pararTudo(); onFechar(); };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 60, background: "rgba(0,0,0,0.85)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ position: "relative", width: "100%", maxWidth: 520 }}>
        <button onClick={fechar} aria-label="Fechar câmera" style={{ position: "absolute", top: -44, right: 0, background: "transparent", border: "none", color: "#fff", cursor: "pointer" }}>
          <X size={28} />
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#fff", marginBottom: 8 }}>
          <Camera size={18} /> <strong>Câmera ao vivo</strong>
          {ativo && <Loader2 size={16} className="animate-spin" aria-hidden />}
        </div>

        <video ref={videoRef} playsInline muted style={{ width: "100%", borderRadius: 12, background: "#000", aspectRatio: "3 / 4", objectFit: "cover" }} />
        <canvas ref={canvasRef} style={{ display: "none" }} />

        <input
          value={pergunta}
          onChange={(e) => setPergunta(e.target.value)}
          placeholder="O que olhar? (ex.: que diz esta placa?) — opcional"
          style={{ width: "100%", marginTop: 10, padding: "10px 12px", borderRadius: 10, border: "1px solid #444", background: "#111", color: "#fff" }}
        />

        <div aria-live="polite" style={{ marginTop: 10, minHeight: 48, color: "#fff", background: "rgba(255,255,255,0.08)", borderRadius: 10, padding: "10px 12px" }}>
          {erro ? <span style={{ color: "#ffb4b4" }}>{erro}</span>
            : descricao ? descricao
              : <span style={{ opacity: 0.6 }}>Apontando a câmera… a descrição aparece aqui.</span>}
        </div>
      </div>
    </div>
  );
}
