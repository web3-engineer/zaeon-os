"""
Modelos Pydantic v2 do /suggest e /refresh (e o schema que vai pro Gemini como response_schema).

Regra anti-alucinação: referência NUNCA vem da memória do modelo. Quem chama manda as
referências reais (busca de verdade: OpenAlex, PubMed, arXiv…); o modelo só pode citá-las pelo
ÍNDICE (1..N). Sem referências → a resposta volta com `references=[]` e
`references_status="ausentes"`.

Enums são LENIENTES: valor desconhecido vira "outro"/default em vez de derrubar a resposta
inteira (antes, um `source` fora do Literal dava 422 na sugestão toda).
"""
from __future__ import annotations

import unicodedata
from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator

AcademicLevel = Literal["grad", "msc", "phd", "postdoc"]
SourceKind = Literal["PubMed", "arXiv", "DOI", "Scholar", "outro"]
SuggestionType = Literal["Exploratória", "Experimental", "Pioneira"]

_FONTES: dict[str, SourceKind] = {
    "pubmed": "PubMed",
    "pmc": "PubMed",
    "medline": "PubMed",
    "arxiv": "arXiv",
    "doi": "DOI",
    "crossref": "DOI",
    "openalex": "DOI",
    "scholar": "Scholar",
    "googlescholar": "Scholar",
    "google scholar": "Scholar",
    "semanticscholar": "Scholar",
    "semantic scholar": "Scholar",
}

TIPO_POR_NIVEL: dict[str, SuggestionType] = {
    "grad": "Exploratória",
    "msc": "Experimental",
    "phd": "Pioneira",
    "postdoc": "Pioneira",
}


def _sem_acento(s: str) -> str:
    return "".join(c for c in unicodedata.normalize("NFD", s) if unicodedata.category(c) != "Mn")


def normalizar_fonte(v: Any) -> SourceKind:
    chave = str(v or "").strip().lower()
    return _FONTES.get(chave, _FONTES.get(chave.replace(" ", ""), "outro"))


def normalizar_tipo(v: Any) -> SuggestionType | None:
    chave = _sem_acento(str(v or "")).strip().lower()
    for tipo in ("Exploratória", "Experimental", "Pioneira"):
        if _sem_acento(tipo).lower() == chave:
            return tipo  # type: ignore[return-value]
    return None


# ── Entrada ──────────────────────────────────────────────────────────────────
class ReferenceInput(BaseModel):
    """Referência REAL fornecida por quem chama (vinda de busca, não de memória)."""

    source: SourceKind = "outro"
    title: str = Field(..., min_length=1, max_length=600)
    authors: str | None = None
    year: str | None = None
    venue: str | None = None
    doi: str | None = None
    url: str | None = None
    # Trecho real (abstract/snippet). Se presente, o inline_citation só sai se a citação
    # for um trecho literal disto — senão é descartado.
    snippet: str | None = Field(default=None, max_length=4000)

    @field_validator("source", mode="before")
    @classmethod
    def _fonte(cls, v: Any) -> SourceKind:
        return normalizar_fonte(v)

    @field_validator("year", mode="before")
    @classmethod
    def _ano(cls, v: Any) -> str | None:
        return None if v in (None, "") else str(v)


class SuggestRequest(BaseModel):
    topic: str = Field(..., min_length=2, max_length=500,
                       description="Tópico de pesquisa digitado pelo aluno")
    level: AcademicLevel = Field(..., description="grad | msc | phd | postdoc")
    exclude_titles: list[str] = Field(
        default_factory=list,
        description="Títulos já mostrados — o motor deve evitá-los no refresh",
    )
    references: list[ReferenceInput] | None = Field(
        default=None,
        max_length=30,
        description="Referências reais. Se ausente/vazio, a resposta não traz referências.",
    )

    @field_validator("topic")
    @classmethod
    def topic_not_blank(cls, v: str) -> str:
        stripped = v.strip()
        if len(stripped) < 2:
            raise ValueError("topic must have at least 2 non-whitespace characters")
        return stripped


# ── Saída pública ────────────────────────────────────────────────────────────
class RefItem(BaseModel):
    source: SourceKind
    title: str
    authors: str = ""
    year: str = ""
    venue: str = ""
    doi: str | None = None
    url: str | None = None

    @field_validator("source", mode="before")
    @classmethod
    def _fonte(cls, v: Any) -> SourceKind:
        return normalizar_fonte(v)


class InlineCitation(BaseModel):
    quote: str
    source: SourceKind
    doi: str | None = None

    @field_validator("source", mode="before")
    @classmethod
    def _fonte(cls, v: Any) -> SourceKind:
        return normalizar_fonte(v)


class SuggestionItem(BaseModel):
    type: SuggestionType
    title: str
    rationale: str
    novelty_angle: str
    gap_score: float = Field(..., ge=0.0, le=1.0)


class SuggestResponse(BaseModel):
    suggestion: SuggestionItem
    references: list[RefItem] = Field(default_factory=list)
    inline_citation: InlineCitation | None = None
    # "fornecidas": quem chamou mandou referências (as citadas estão em `references`);
    # "ausentes": não mandou → `references` vazio e a sugestão NÃO é lastreada em literatura.
    references_status: Literal["fornecidas", "ausentes"] = "ausentes"


# ── Schema da saída do MODELO (vai como response_schema) ─────────────────────
class InlineModelo(BaseModel):
    quote: str = Field(description="Trecho LITERAL do snippet da referência citada")
    ref: int = Field(description="Índice (1..N) da referência fornecida de onde saiu o trecho")


class SaidaModelo(BaseModel):
    """O que o Gemini devolve. Lenient: tipo desconhecido → None (a engine põe o do nível)."""

    type: SuggestionType | None = Field(
        default=None, description="Exploratória | Experimental | Pioneira"
    )
    title: str = Field(description="Título da pesquisa proposta, até 180 caracteres")
    rationale: str = Field(description="Qual lacuna e por que vale a pena; até 300 caracteres")
    novelty_angle: str = Field(description="O que torna o trabalho novo; até 120 caracteres")
    gap_score: float = Field(ge=0.0, le=1.0, description="0.0 a 1.0")
    citadas: list[int] = Field(
        default_factory=list,
        description="Índices (1..N) das referências FORNECIDAS que sustentam a sugestão. "
        "Vazio se nenhuma referência foi fornecida.",
    )
    inline_citation: InlineModelo | None = None

    @field_validator("type", mode="before")
    @classmethod
    def _tipo(cls, v: Any) -> SuggestionType | None:
        return normalizar_tipo(v)

    @field_validator("gap_score", mode="before")
    @classmethod
    def _clamp(cls, v: Any) -> float:
        try:
            return min(1.0, max(0.0, float(v)))
        except (TypeError, ValueError):
            return 0.5

    @field_validator("citadas", mode="before")
    @classmethod
    def _citadas(cls, v: Any) -> list[int]:
        if not isinstance(v, list):
            return []
        saida: list[int] = []
        for x in v:
            try:
                saida.append(int(x))
            except (TypeError, ValueError):
                continue
        return saida
