"""
Lógica de sugestão de pesquisa (análise de lacunas), sobre o llm.py.

O modelo só devolve a sugestão + ÍNDICES das referências fornecidas; quem monta a lista de
referências da resposta é este módulo, copiando das que o chamador mandou. Assim é impossível
uma referência inventada chegar ao aluno.
"""
from __future__ import annotations

import asyncio
import re
from dataclasses import dataclass

import config
import llm
from models import (
    TIPO_POR_NIVEL,
    InlineCitation,
    ReferenceInput,
    RefItem,
    SaidaModelo,
    SuggestionItem,
    SuggestRequest,
    SuggestResponse,
)
from prompts import build_system_prompt, build_user_message

TEMPERATURA = 0.85


@dataclass
class ResultadoSugestao:
    resposta: SuggestResponse
    citadas: list[int]  # índices 1..N válidos, sem repetição, na ordem em que o modelo citou
    uso: llm.Uso


def _norm(s: str) -> str:
    return re.sub(r"\s+", " ", s).strip().lower()


def _indices_validos(citadas: list[int], n: int) -> list[int]:
    vistos: list[int] = []
    for i in citadas:
        if 1 <= i <= n and i not in vistos:
            vistos.append(i)
    return vistos


def montar_resposta(
    saida: SaidaModelo, request: SuggestRequest
) -> tuple[SuggestResponse, list[int]]:
    """Converte a saída do modelo na resposta pública, descartando tudo que não tem lastro."""
    refs: list[ReferenceInput] = list(request.references or [])
    citadas = _indices_validos(saida.citadas, len(refs))

    sugestao = SuggestionItem(
        type=saida.type or TIPO_POR_NIVEL.get(request.level, "Exploratória"),
        title=saida.title.strip()[:300],
        rationale=saida.rationale.strip(),
        novelty_angle=saida.novelty_angle.strip(),
        gap_score=saida.gap_score,
    )

    referencias = [
        RefItem(
            source=refs[i - 1].source,
            title=refs[i - 1].title,
            authors=refs[i - 1].authors or "",
            year=refs[i - 1].year or "",
            venue=refs[i - 1].venue or "",
            doi=refs[i - 1].doi,
            url=refs[i - 1].url,
        )
        for i in citadas
    ]

    # Citação literal só sobrevive se o trecho existir de fato no snippet da referência.
    inline = None
    ic = saida.inline_citation
    if ic and 1 <= ic.ref <= len(refs):
        ref = refs[ic.ref - 1]
        quote = ic.quote.strip()
        if quote and ref.snippet and _norm(quote) in _norm(ref.snippet):
            inline = InlineCitation(quote=quote, source=ref.source, doi=ref.doi)

    resposta = SuggestResponse(
        suggestion=sugestao,
        references=referencias,
        inline_citation=inline,
        references_status="fornecidas" if refs else "ausentes",
    )
    return resposta, citadas


async def gerar_sugestao(
    request: SuggestRequest,
    *,
    deadline: float | None = None,
    contexto: str | None = None,
) -> ResultadoSugestao:
    """Chama o Gemini (estruturado, com retentativa) e devolve a sugestão já saneada."""
    if deadline is None:
        deadline = asyncio.get_running_loop().time() + config.prazo_padrao_ms() / 1000
    saida, uso = await llm.gerar_estruturado(
        schema=SaidaModelo,
        sistema=build_system_prompt(request.level, request.exclude_titles),
        mensagem=build_user_message(request.topic, request.references, contexto),
        deadline=deadline,
        temperatura=TEMPERATURA,
    )
    resposta, citadas = montar_resposta(saida, request)
    return ResultadoSugestao(resposta=resposta, citadas=citadas, uso=uso)
