"""Cliente google-genai FALSO: nada sai pra rede. Cada chamada consome o próximo 'roteiro'."""
from __future__ import annotations

import asyncio
import json
from types import SimpleNamespace
from typing import Any

from google.genai import errors, types


def resp(dados: Any, *, finish: str = "STOP", prompt: int = 100, saida: int = 50) -> SimpleNamespace:
    """Resposta no formato do SDK (.text, .usage_metadata, .candidates[].finish_reason)."""
    texto = dados if isinstance(dados, str) else json.dumps(dados, ensure_ascii=False)
    return SimpleNamespace(
        text=texto,
        usage_metadata=SimpleNamespace(
            prompt_token_count=prompt, candidates_token_count=saida, thoughts_token_count=0
        ),
        candidates=[SimpleNamespace(finish_reason=getattr(types.FinishReason, finish))],
    )


def erro(codigo: int) -> errors.APIError:
    corpo = {"error": {"code": codigo, "message": "falso", "status": "X"}}
    return errors.ServerError(codigo, corpo) if codigo >= 500 else errors.ClientError(codigo, corpo)


class Demora:
    """Roteiro: dorme `s` segundos (de verdade) antes de responder `depois`."""

    def __init__(self, s: float, depois: Any = None):
        self.s, self.depois = s, depois


class _Models:
    def __init__(self, dono: "ClienteFalso"):
        self.dono = dono

    async def generate_content(self, *, model: str, contents: Any, config: Any) -> Any:
        self.dono.chamadas.append({"model": model, "contents": contents, "config": config})
        if not self.dono.roteiro:
            raise AssertionError("ClienteFalso: chamada além do roteiro")
        passo = self.dono.roteiro.pop(0) if len(self.dono.roteiro) > 1 else self.dono.roteiro[0]
        if isinstance(passo, Demora):
            await asyncio.sleep(passo.s)
            passo = passo.depois
        if isinstance(passo, BaseException):
            raise passo
        return passo


class ClienteFalso:
    """`roteiro`: lista de respostas/exceções/Demora; o último item se repete indefinidamente."""

    def __init__(self, *roteiro: Any):
        self.roteiro = list(roteiro)
        self.chamadas: list[dict[str, Any]] = []
        self.aio = SimpleNamespace(models=_Models(self))


SAIDA_OK = {
    "type": "Pioneira",
    "title": "Bioacústica e pigmentação em Phalaenopsis amabilis",
    "rationale": "Nenhum estudo cruzou bioacústica com pigmentação em Orchidaceae ornamentais.",
    "novelty_angle": "Primeira interface entre neurociência vegetal e genômica de pigmentação.",
    "gap_score": 0.87,
    "citadas": [],
    "inline_citation": None,
}
