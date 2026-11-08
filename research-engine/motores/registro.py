"""
REGISTRO dos motores hospedados aqui. Motor novo = 1 arquivo em motores/ + 1 linha abaixo.
(passo a passo no README, seção "Como adicionar um motor").

Motor open-source com dependência pesada (STORM, gpt-researcher, PaperQA2…) deve importar o
pacote DENTRO de `executar`/`disponivel`, nunca no topo do arquivo: assim o host sobe mesmo sem
o pacote instalado e o motor só aparece como `disponivel: false`.
"""
from __future__ import annotations

from motores.base import Motor
from motores.zaeon_sugestao import ZaeonSugestao

MOTORES: list[Motor] = [
    ZaeonSugestao(),
    # StormMotor(),          ← exemplo: from motores.storm import StormMotor
]

_POR_ID: dict[str, Motor] = {m.id: m for m in MOTORES}
assert len(_POR_ID) == len(MOTORES), "id de motor repetido no registro"


def listar() -> list[Motor]:
    return list(MOTORES)


def obter(motor_id: str) -> Motor | None:
    return _POR_ID.get(motor_id)
