"""Contratos (pydantic) do Zaeon Voice Engine."""
from __future__ import annotations

from pydantic import BaseModel, Field


class SynthesizeRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=4000)
    voice: str | None = None


class SynthesizeResponse(BaseModel):
    audio_base64: str
    mime: str = "audio/wav"
    voice: str
