"""
Autenticação opcional por token: se MOTOR_TOKEN estiver definido, toda rota (menos /health)
exige `Authorization: Bearer <token>`; senão responde 401 {"erro": "nao_autorizado"}.
Sem MOTOR_TOKEN = aberto (o serviço só tem `expose` na rede interna do compose).
"""
from __future__ import annotations

import hmac

from fastapi import Request

import config
from erros import ErroHttp


async def exigir_token(request: Request) -> None:
    esperado = config.motor_token()
    if not esperado:
        return
    cabecalho = request.headers.get("authorization", "")
    esquema, _, recebido = cabecalho.partition(" ")
    if esquema.lower() != "bearer" or not hmac.compare_digest(
        recebido.strip().encode(), esperado.encode()
    ):
        raise ErroHttp(401, "nao_autorizado", headers={"WWW-Authenticate": "Bearer"})
