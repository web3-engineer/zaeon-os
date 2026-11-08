"""Erro HTTP no formato do contrato: corpo {"erro": "<código>"} (não o {"detail": …} do FastAPI)."""
from __future__ import annotations

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse


class ErroHttp(Exception):
    def __init__(self, status: int, erro: str, headers: dict[str, str] | None = None):
        super().__init__(erro)
        self.status = status
        self.erro = erro
        self.headers = headers


def instalar(app: FastAPI) -> None:
    @app.exception_handler(ErroHttp)
    async def _erro_http(_: Request, exc: ErroHttp) -> JSONResponse:
        return JSONResponse({"erro": exc.erro}, status_code=exc.status, headers=exc.headers)

    @app.exception_handler(RequestValidationError)
    async def _corpo_invalido(_: Request, exc: RequestValidationError) -> JSONResponse:
        # 422 com o mesmo formato {"erro": …}; o detalhe do Pydantic vai junto pra depurar.
        detalhe = [
            {"loc": list(e.get("loc", [])), "msg": e.get("msg", "")} for e in exc.errors()
        ]
        return JSONResponse({"erro": "corpo_invalido", "detalhe": detalhe}, status_code=422)
