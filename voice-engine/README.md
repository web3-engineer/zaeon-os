# Zaeon Voice Engine (TTS · Piper)

Voz própria do agente de chat (Aura) da biblioteca. Gratuito, offline, textura agradável.
**Não roda na Vercel** — local/host, no padrão dos engines `abnt-service` (8001) e
`suggestion-forge` (8003). O Next consome via `POST /api/ai/voice` (`VOICE_ENGINE_URL`).

## Setup

```bash
cd voice-engine
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# baixe uma voz PT-BR do Piper para ./voices (ou aponte PIPER_VOICE_DIR):
#   https://huggingface.co/rhasspy/piper-voices  → pt_BR-faber-medium.onnx (+ .onnx.json)
mkdir -p voices  # coloque os .onnx aqui

uvicorn main:app --port 8004
```

No app (Vercel/local), aponte o proxy para o engine:
```
VOICE_ENGINE_URL=http://localhost:8004   # ou o host onde você publicou
```

## Testes
```bash
.venv/bin/python -m pytest        # Piper mockado (não baixa modelo)
```

## Contrato
Veja `engine_spec.md`.
