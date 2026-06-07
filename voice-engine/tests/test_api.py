"""Testes do Voice Engine — Piper mockado (não baixa modelo), no padrão do forge."""
import base64

from fastapi.testclient import TestClient

import engine
import main

client = TestClient(main.app)


def test_health():
    r = client.get("/health")
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "ok"
    assert "voice" in body


def test_synthesize_ok(monkeypatch):
    fake = {
        "audio_base64": base64.b64encode(b"RIFF....WAVEfake").decode("ascii"),
        "mime": "audio/wav",
        "voice": "pt_BR-faber-medium",
    }
    monkeypatch.setattr(engine, "synthesize_base64", lambda text, voice=None: fake)
    r = client.post("/synthesize", json={"text": "Olá, vou comentar sobre o seu projeto."})
    assert r.status_code == 200
    body = r.json()
    assert body["mime"] == "audio/wav"
    assert body["audio_base64"]
    assert body["voice"] == "pt_BR-faber-medium"


def test_synthesize_passes_voice(monkeypatch):
    captured = {}

    def fake(text, voice=None):
        captured["text"] = text
        captured["voice"] = voice
        return {"audio_base64": "AA==", "mime": "audio/wav", "voice": voice or "default"}

    monkeypatch.setattr(engine, "synthesize_base64", fake)
    r = client.post("/synthesize", json={"text": "oi", "voice": "pt_BR-edresson-low"})
    assert r.status_code == 200
    assert captured["voice"] == "pt_BR-edresson-low"


def test_synthesize_blank_text_is_400(monkeypatch):
    # min_length=1 deixa passar espaços; o route faz strip → 400.
    monkeypatch.setattr(engine, "synthesize_base64", lambda text, voice=None: {})
    r = client.post("/synthesize", json={"text": "   "})
    assert r.status_code == 400


def test_synthesize_missing_text_is_422():
    r = client.post("/synthesize", json={})
    assert r.status_code == 422


def test_synthesize_too_long_is_422():
    r = client.post("/synthesize", json={"text": "a" * 5000})
    assert r.status_code == 422


def test_missing_voice_model_is_503(monkeypatch):
    def boom(text, voice=None):
        raise FileNotFoundError("Modelo de voz não encontrado: x.onnx")

    monkeypatch.setattr(engine, "synthesize_base64", boom)
    r = client.post("/synthesize", json={"text": "oi"})
    assert r.status_code == 503


def test_synthesis_failure_is_500(monkeypatch):
    def boom(text, voice=None):
        raise RuntimeError("onnx explodiu")

    monkeypatch.setattr(engine, "synthesize_base64", boom)
    r = client.post("/synthesize", json={"text": "oi"})
    assert r.status_code == 500
