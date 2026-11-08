"""
Rotas /motor/v1 — o contrato que o adaptador TS `motorHttp` (lib/orquestra/) consome.

  GET  /motor/v1/motores  → [MotorInfo]
  POST /motor/v1/tarefas  → Resultado | 404 motor_desconhecido | 503 motor_indisponivel
                            | 504 prazo | 502 saida_invalida | 422 corpo_invalido

O prazo é imposto AQUI (asyncio.timeout), não confiado ao motor: a resposta sai antes de
`prazo_ms`, com uma folga pra serialização.
"""
from __future__ import annotations

import asyncio
import logging
import re

from fastapi import APIRouter, Depends

import llm
from auth import exigir_token
from erros import ErroHttp
from motores import registro
from motores.base import MotorIndisponivel
from motores.citacoes import sanear
from motores.contrato import PADRAO_CHAVE, MotorInfo, Resultado, Tarefa

log = logging.getLogger("research-engine.motores")

router = APIRouter(prefix="/motor/v1", dependencies=[Depends(exigir_token)])

_CHAVE = re.compile(PADRAO_CHAVE)


def folga_s(prazo_s: float) -> float:
    """Reserva do fim do prazo pra montar/serializar a resposta: 10% até no máx. 100 ms."""
    return min(0.1, prazo_s * 0.1)


def aplicar_contrato(tarefa: Tarefa, res: Resultado) -> Resultado:
    """Guarda do contrato, vale pra QUALQUER motor (inclusive OSS que a gente não controla)."""
    evidencias = list(tarefa.evidencias)
    chaves = {e.chave for e in evidencias}
    descartadas = 0
    for e in res.evidencias:
        if e.chave in chaves:
            continue  # a de entrada vence (o motor não reescreve evidência alheia)
        if not _CHAVE.match(e.chave):
            descartadas += 1
            continue
        evidencias.append(e)
        chaves.add(e.chave)

    texto, removidas = sanear(res.texto, chaves)
    if removidas:
        log.warning("motor %s citou chaves inexistentes: %s", tarefa.motor, removidas)

    return res.model_copy(
        update={
            "motor": tarefa.motor,
            "texto": texto,
            "evidencias": evidencias,
            "degradado": bool(res.degradado or removidas or descartadas),
        }
    )


@router.get("/motores", response_model=list[MotorInfo])
async def listar_motores() -> list[MotorInfo]:
    return [m.info() for m in registro.listar()]


@router.post("/tarefas", response_model=Resultado)
async def executar_tarefa(tarefa: Tarefa) -> Resultado:
    motor = registro.obter(tarefa.motor)
    if motor is None:
        raise ErroHttp(404, "motor_desconhecido")
    if not motor.info().disponivel:
        raise ErroHttp(503, "motor_indisponivel")

    prazo_s = tarefa.prazo_ms / 1000
    folga = folga_s(prazo_s)
    loop = asyncio.get_running_loop()
    deadline = loop.time() + prazo_s - folga

    try:
        async with asyncio.timeout_at(deadline):
            res = await motor.executar(tarefa, deadline)
    except (TimeoutError, llm.PrazoEsgotado):
        raise ErroHttp(504, "prazo")
    except (MotorIndisponivel, llm.ProvedorIndisponivel) as exc:
        log.warning("motor %s indisponível: %s", tarefa.motor, exc)
        raise ErroHttp(503, "motor_indisponivel")
    except llm.SaidaInvalida as exc:
        log.warning("motor %s saída inválida: %s", tarefa.motor, exc)
        raise ErroHttp(502, "saida_invalida")
    except ErroHttp:
        raise
    except Exception:
        log.exception("motor %s falhou", tarefa.motor)
        raise ErroHttp(500, "erro_interno")

    return aplicar_contrato(tarefa, res)
