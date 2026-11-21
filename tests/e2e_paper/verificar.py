"""
tests/e2e_paper/verificar.py — o laudo de um trabalho do documento editável: roda todos os oráculos e devolve os
problemas agrupados. Um teste que falha mostra o laudo inteiro, não só o primeiro erro.
"""
from __future__ import annotations

import re

import oraculos as O

RE_REFS = re.compile(r"^\s*refer[eê]ncias", re.I)
RE_RESUMO = re.compile(r"^\s*(resumo|abstract)\b", re.I)


def partes(trabalho: dict) -> tuple[str, list[str], list[dict]]:
    secoes = trabalho.get("secoes", [])
    refs = next((s for s in secoes if RE_REFS.match(s["titulo"])), None)
    corpo = "\n\n".join(s.get("corpo", "") for s in secoes if s is not refs)
    return corpo, O.referencias(refs["corpo"] if refs else ""), secoes


def palavras(t: str) -> int:
    return len(re.findall(r"\w+", t or ""))


def laudo(trabalho: dict, fatos: list[tuple[str, dict[str, set[int]]]], *, min_palavras: int, min_refs_literatura: int,
          numeros: tuple[str, set[str]] | None = None, ignorar_secoes: set[str] = frozenset(),
          titulos_materiais: list[str] | None = None) -> dict[str, list[str]]:
    corpo, refs, secoes = partes(trabalho)
    l: dict[str, list[str]] = {}
    vazias = [s["titulo"] for s in secoes if not s.get("corpo", "").strip() and not RE_REFS.match(s["titulo"])]
    if vazias:
        l["seções vazias"] = vazias
    if trabalho.get("status") != "pronto":
        l["status"] = [str(trabalho.get("status"))]
    if palavras(corpo) < min_palavras:
        l["quantidade"] = [f"{palavras(corpo)} palavras (mínimo {min_palavras})"]
    corpo_avaliado = "\n\n".join(s.get("corpo", "") for s in secoes if not RE_REFS.match(s["titulo"]) and s["titulo"] not in ignorar_secoes)
    l["sobras internas"] = O.sobras(corpo + "\n" + "\n".join(refs))
    l["coleta inventada"] = O.metodo_inventado(corpo_avaliado)
    l["forma ABNT das referências"] = [p for r in refs for p in O.abnt_forma(r)]
    l["citação × referência"] = O.cruzar(corpo_avaliado, refs)
    literatura = [r for r in refs if "[referência incompleta" not in r]
    if len(literatura) < min_refs_literatura:
        l["literatura"] = [f"{len(literatura)} referências de literatura (mínimo {min_refs_literatura})"]
    # RESUMO ABNT (NBR 6028) não cita: o fato aparece lá sem citação por regra — a exigência vale do corpo em diante
    corpo_que_cita = "\n\n".join(s.get("corpo", "") for s in secoes
                                  if not RE_REFS.match(s["titulo"]) and s["titulo"] not in ignorar_secoes and not RE_RESUMO.match(s["titulo"]))
    for padrao, verdade in fatos:
        l[f"fato /{padrao}/"] = O.fato_citado_com_pagina(corpo_que_cita, padrao, verdade)
    if titulos_materiais:
        l["título do material"] = O.titulo_inventado(corpo_avaliado, titulos_materiais)
    if numeros:
        l["fidelidade de dado"] = O.numeros_fieis(corpo_avaliado, *numeros)
    return {k: v for k, v in l.items() if v}


def formatar(l: dict[str, list[str]]) -> str:
    return "\n".join(f"── {k} ({len(v)})\n   " + "\n   ".join(v[:12]) for k, v in l.items())
