"""
Contrato HTTP /motor/v1 (espelho Python do que o adaptador TS `motorHttp` espera).
Mudou aqui → mudou lá. Não acrescente campo obrigatório sem combinar com o lib/orquestra/.
"""
from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator, model_validator

Origem = Literal["zaeon", "alibaba", "deepseek", "moonshot", "outro"]
Formato = Literal["unico", "profundo", "enxame"]

PADRAO_CHAVE = r"^E\d+$"
PRAZO_MAX_MS = 600_000  # 10 min — nada aqui deve segurar uma conexão mais que isso


class Fonte(BaseModel):
    title: str
    url: str | None = None
    authors: str | None = None
    year: int | None = None

    @field_validator("year", mode="before")
    @classmethod
    def _ano(cls, v: Any) -> int | None:
        # Leniente: "2021" → 2021; "s.d." / "" → None (não derruba a tarefa por causa do ano).
        if v in (None, ""):
            return None
        try:
            return int(str(v).strip()[:4])
        except (TypeError, ValueError):
            return None


class Evidencia(BaseModel):
    chave: str = Field(pattern=PADRAO_CHAVE)
    claim: str
    source: Fonte


class Tarefa(BaseModel):
    id: str
    motor: str
    objetivo: str = Field(min_length=1)
    intent: str
    contexto: str | None = None
    prazo_ms: int = Field(gt=0, le=PRAZO_MAX_MS)
    evidencias: list[Evidencia] = Field(default_factory=list)

    @model_validator(mode="after")
    def _chaves_unicas(self) -> "Tarefa":
        chaves = [e.chave for e in self.evidencias]
        if len(chaves) != len(set(chaves)):
            raise ValueError("evidencias com chave repetida")
        return self


class UsoMotor(BaseModel):
    prompt_tokens: int = 0
    completion_tokens: int = 0
    chamadas: int = 0


class Resultado(BaseModel):
    motor: str
    texto: str
    evidencias: list[Evidencia]
    uso: UsoMotor
    modelos: list[str]
    passos: int
    degradado: bool


class MotorInfo(BaseModel):
    id: str
    nome: str
    origem: Origem
    formato: Formato
    disponivel: bool
