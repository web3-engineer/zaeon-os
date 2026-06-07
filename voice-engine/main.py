"""Zaeon Voice Engine — FastAPI (porta 8004 por padrão).

Não roda na Vercel; é um engine local/host, no mesmo padrão dos demais
engines Python (abnt-service 8001, suggestion-forge 8003). O Next consome via
proxy /api/ai/voice usando VOICE_ENGINE_URL.

Rodar:  uvicorn main:app --port 8004
"""
from __future__ import annotations

from fastapi import FastAPI, HTTPException

import engine
from models import SynthesizeRequest, SynthesizeResponse

app = FastAPI(title="Zaeon Voice Engine", version="1.0.0")


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "voice": engine.DEFAULT_VOICE}


@app.post("/synthesize", response_model=SynthesizeResponse)
def synthesize(req: SynthesizeRequest) -> dict:
    text = req.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="Texto vazio.")
    try:
        return engine.synthesize_base64(text, req.voice)
    except FileNotFoundError as exc:
        # Modelo de voz ausente → 503 (o proxy degrada graciosamente).
        raise HTTPException(status_code=503, detail=str(exc))
    except Exception as exc:  # noqa: BLE001 — falha de síntese vira 500 informativo
        raise HTTPException(status_code=500, detail=f"Falha na síntese: {exc}")
