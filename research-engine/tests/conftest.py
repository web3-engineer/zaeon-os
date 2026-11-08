from __future__ import annotations

import pytest

import llm

_ENVS = [
    "GEMINI_API_KEY", "GOOGLE_API_KEY", "GOOGLE_GENAI_USE_VERTEXAI", "GOOGLE_GENAI_USE_ENTERPRISE",
    "GOOGLE_CLOUD_PROJECT", "GOOGLE_PROJECT_ID", "GOOGLE_CLOUD_LOCATION", "GEMINI_TEXT_LOCATION",
    "GOOGLE_LOCATION", "GOOGLE_CREDENTIALS", "MOTOR_TOKEN", "RESEARCH_ENGINE_MODEL",
    "RESEARCH_ENGINE_TIMEOUT_MS", "RESEARCH_ENGINE_PRAZO_MS", "RESEARCH_ENGINE_MAX_RETRIES",
    "RESEARCH_ENGINE_BACKOFF_BASE_MS", "RESEARCH_ENGINE_MAX_OUTPUT_TOKENS",
    "RESEARCH_ENGINE_THINKING_LEVEL",
]


@pytest.fixture(autouse=True)
def ambiente_limpo(monkeypatch):
    """Sem credencial real, sem token, sem cliente em cache — e o backoff não dorme de verdade."""
    for nome in _ENVS:
        monkeypatch.delenv(nome, raising=False)
    llm.definir_cliente(None)
    esperas: list[float] = []

    async def _dormir(s: float) -> None:
        esperas.append(s)

    monkeypatch.setattr(llm, "_dormir", _dormir)
    yield esperas
    llm.definir_cliente(None)


@pytest.fixture
def esperas(ambiente_limpo):
    return ambiente_limpo


@pytest.fixture
def cliente():
    """Instala um ClienteFalso: `cliente(*roteiro)`."""
    from tests.fakes import ClienteFalso

    def _instalar(*roteiro):
        c = ClienteFalso(*roteiro)
        llm.definir_cliente(c)
        return c

    return _instalar


@pytest.fixture
def http():
    from fastapi.testclient import TestClient

    from main import app

    with TestClient(app) as c:
        yield c
