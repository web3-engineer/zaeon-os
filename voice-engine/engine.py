"""Síntese de voz (TTS) via Piper — gratuito, offline, textura agradável.

O import do Piper é LAZY (dentro das funções) para que os testes possam
rodar com a síntese mockada, sem precisar do modelo .onnx instalado — mesmo
padrão do suggestion-forge.

Modelos de voz Piper (.onnx + .onnx.json) ficam em PIPER_VOICE_DIR.
Baixe uma voz PT-BR, ex.: pt_BR-faber-medium
(https://huggingface.co/rhasspy/piper-voices).
"""
from __future__ import annotations

import base64
import io
import os
import wave
from functools import lru_cache

VOICE_DIR = os.environ.get(
    "PIPER_VOICE_DIR", os.path.join(os.path.dirname(__file__), "voices")
)
DEFAULT_VOICE = os.environ.get("PIPER_VOICE", "pt_BR-faber-medium")


@lru_cache(maxsize=4)
def _load_voice(voice_id: str):
    """Carrega (e cacheia) um PiperVoice a partir do .onnx em VOICE_DIR."""
    from piper.voice import PiperVoice  # import pesado e lazy

    onnx = os.path.join(VOICE_DIR, f"{voice_id}.onnx")
    if not os.path.exists(onnx):
        raise FileNotFoundError(
            f"Modelo de voz não encontrado: {onnx}. "
            f"Baixe uma voz Piper e coloque em {VOICE_DIR}."
        )
    return PiperVoice.load(onnx)


def synthesize_wav(text: str, voice_id: str | None = None) -> bytes:
    """Sintetiza `text` e devolve os bytes de um WAV."""
    voice_id = voice_id or DEFAULT_VOICE
    voice = _load_voice(voice_id)
    buf = io.BytesIO()
    with wave.open(buf, "wb") as wav:
        voice.synthesize(text, wav)
    return buf.getvalue()


def synthesize_base64(text: str, voice_id: str | None = None) -> dict:
    """Sintetiza `text` e devolve o WAV em base64 (pronto pro browser tocar)."""
    wav = synthesize_wav(text, voice_id)
    return {
        "audio_base64": base64.b64encode(wav).decode("ascii"),
        "mime": "audio/wav",
        "voice": voice_id or DEFAULT_VOICE,
    }
