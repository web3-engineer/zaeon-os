"""
Configuração por ambiente (lida A CADA chamada, não no import — os testes trocam env com
monkeypatch e o processo do container herda o .env do compose).

Sem pydantic-settings de propósito: são meia dúzia de variáveis e o serviço tem que subir
mesmo com o .env da plataforma inteira (centenas de chaves que não são dele).
"""
from __future__ import annotations

import os

MODELO_PADRAO = "gemini-3.5-flash"


def _limpa(v: str | None) -> str:
    """Tira espaços e aspas de .env ("valor" / 'valor')."""
    return (v or "").strip().strip('"').strip("'").strip()


def env(nome: str, padrao: str = "") -> str:
    return _limpa(os.environ.get(nome)) or padrao


def env_int(nome: str, padrao: int) -> int:
    try:
        return int(env(nome) or padrao)
    except ValueError:
        return padrao


def env_float(nome: str, padrao: float) -> float:
    try:
        return float(env(nome) or padrao)
    except ValueError:
        return padrao


def env_bool(nome: str) -> bool:
    return env(nome).lower() in ("1", "true", "yes", "sim", "on")


def modelo() -> str:
    return env("RESEARCH_ENGINE_MODEL", MODELO_PADRAO)


def timeout_requisicao_s() -> float:
    """Teto de UMA chamada ao provedor (o prazo total da tarefa pode ser menor e vence)."""
    return env_int("RESEARCH_ENGINE_TIMEOUT_MS", 25_000) / 1000


def prazo_padrao_ms() -> int:
    """Prazo total do /suggest e /refresh (o /motor/v1/tarefas traz o seu em prazo_ms)."""
    return env_int("RESEARCH_ENGINE_PRAZO_MS", 30_000)


def max_retentativas() -> int:
    """Retentativas ALÉM da 1ª chamada. Teto duro de 2 (nunca além do prazo)."""
    return max(0, min(2, env_int("RESEARCH_ENGINE_MAX_RETRIES", 2)))


def backoff_base_s() -> float:
    return env_int("RESEARCH_ENGINE_BACKOFF_BASE_MS", 500) / 1000


def max_output_tokens() -> int:
    # Folga de verdade: os 1800 de antes truncavam o JSON (e no 3.x o "pensamento" também
    # conta nesse teto). A saída útil tem ~600 tokens; o teto só existe pra não estourar custo.
    return env_int("RESEARCH_ENGINE_MAX_OUTPUT_TOKENS", 8192)


def thinking_level() -> str:
    """'' = não manda thinking_config (default do modelo). Ex.: low | medium | high."""
    return env("RESEARCH_ENGINE_THINKING_LEVEL").lower()


def motor_token() -> str:
    return env("MOTOR_TOKEN")
