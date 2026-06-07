# Voice Engine — contrato (porta 8004)

Engine FastAPI de TTS (Piper). **Não roda na Vercel** — local/host, igual aos demais
engines Python. O Next consome via proxy `POST /api/ai/voice` usando `VOICE_ENGINE_URL`.

## Endpoints

### `GET /health`
```json
{ "status": "ok", "voice": "pt_BR-faber-medium" }
```

### `POST /synthesize`
Request:
```json
{ "text": "Texto a falar (1..4000 chars)", "voice": "pt_BR-faber-medium" }
```
- `text` (obrigatório, 1–4000): texto JÁ limpo (sem markdown/marcadores).
- `voice` (opcional): id do modelo Piper (`<voice>.onnx` em `PIPER_VOICE_DIR`). Default: `PIPER_VOICE`.

Response `200`:
```json
{ "audio_base64": "<WAV em base64>", "mime": "audio/wav", "voice": "pt_BR-faber-medium" }
```

Erros:
- `400` texto vazio (após trim).
- `422` payload inválido (faltando `text`, ou fora de 1–4000).
- `503` modelo de voz ausente (`.onnx` não encontrado) — o proxy degrada graciosamente.
- `500` falha de síntese.

## Config (env)
- `PIPER_VOICE_DIR` — pasta com os `.onnx`/`.onnx.json`. Default: `voice-engine/voices`.
- `PIPER_VOICE` — voz padrão. Default: `pt_BR-faber-medium`.

## Vozes
Baixe vozes PT-BR de https://huggingface.co/rhasspy/piper-voices
(ex.: `pt_BR-faber-medium.onnx` + `.onnx.json`) para `PIPER_VOICE_DIR`.
