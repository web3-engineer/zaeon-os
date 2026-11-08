"""
Saneamento de citações [E#] no `texto` de um resultado.

DECISÃO (contrato): citação a chave que NÃO existe em `evidencias` é REMOVIDA do texto — o
texto entregue nunca cita evidência fantasma. Quando algo é removido, a API marca o resultado
como `degradado=true` (sinal pro orquestrador de que o motor alucinou citação).

Também normaliza grupos ("[E1, E3]", "[E1; E3]") para a forma canônica "[E1][E3]".
"""
from __future__ import annotations

import re

# [E1] · [E1, E2] · [E1;E2] · [ E3 ]
_GRUPO = re.compile(r"\[\s*(E\d+(?:\s*[,;]\s*E\d+)*)\s*\]")
_ESPACO_ANTES_PONTUACAO = re.compile(r"[ \t]+([.,;:!?])")
_ESPACOS_DUPLOS = re.compile(r"[ \t]{2,}")


def citacoes(texto: str) -> list[str]:
    """Todas as chaves citadas, em ordem (com repetição)."""
    saida: list[str] = []
    for m in _GRUPO.finditer(texto):
        saida.extend(c.strip() for c in re.split(r"[,;]", m.group(1)))
    return saida


def sanear(texto: str, chaves_validas: set[str]) -> tuple[str, list[str]]:
    """Devolve (texto saneado, chaves removidas)."""
    removidas: list[str] = []

    def _troca(m: re.Match[str]) -> str:
        boas: list[str] = []
        for c in (x.strip() for x in re.split(r"[,;]", m.group(1))):
            if c in chaves_validas:
                if c not in boas:
                    boas.append(c)
            else:
                removidas.append(c)
        return "".join(f"[{c}]" for c in boas)

    novo = _GRUPO.sub(_troca, texto)
    if removidas:
        novo = _ESPACO_ANTES_PONTUACAO.sub(r"\1", novo)
        novo = _ESPACOS_DUPLOS.sub(" ", novo)
        novo = "\n".join(linha.rstrip() for linha in novo.split("\n"))
    return novo, removidas
