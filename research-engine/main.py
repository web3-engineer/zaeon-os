# research-engine/main.py
"""
Research Engine — host de motores Python da Zaeon (FastAPI, porta 8002).

  GET  /health                 → vivo + modelo/backend configurados (sem rede, sem auth)
  GET  /motor/v1/motores       → motores registrados (contrato do lib/orquestra/)
  POST /motor/v1/tarefas       → executa uma tarefa num motor, dentro de prazo_ms
  POST /suggest | /refresh     → sugestão de pesquisa (legado do Scholar; referências só do chamador)

Erros no formato {"erro": "<código>"}: 401 nao_autorizado · 404 motor_desconhecido ·
422 corpo_invalido · 502 saida_invalida · 503 motor_indisponivel/provedor_indisponivel · 504 prazo.
"""
from __future__ import annotations

import asyncio
import logging

from dotenv import load_dotenv
from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()  # antes dos imports que leem env (config lê a cada chamada, mas por garantia)

import config  # noqa: E402
import erros  # noqa: E402
import llm  # noqa: E402
from auth import exigir_token  # noqa: E402
from engine import gerar_sugestao  # noqa: E402
from erros import ErroHttp  # noqa: E402
from models import SuggestRequest, SuggestResponse  # noqa: E402
from motores.api import router as motores_router  # noqa: E402

VERSAO = "2.0.0"

logging.basicConfig(level=config.env("LOG_LEVEL", "INFO").upper())

app = FastAPI(
    title="Zaeon Research Engine",
    description="Host de motores Python (contrato /motor/v1) + sugestão de pesquisa por análise de lacunas",
    version=VERSAO,
)
erros.instalar(app)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://zaeonos.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(motores_router)


@app.get("/health")
async def health() -> dict:
    return {
        "status": "ok",
        "service": "zaeon-research-engine",
        "version": VERSAO,
        "modelo": config.modelo(),
        "backend": llm.backend(),
        "llm_configurado": llm.configurado(),
    }


async def _sugerir(payload: SuggestRequest) -> SuggestResponse:
    prazo_s = config.prazo_padrao_ms() / 1000
    deadline = asyncio.get_running_loop().time() + prazo_s
    try:
        async with asyncio.timeout_at(deadline):
            return (await gerar_sugestao(payload, deadline=deadline - 0.05)).resposta
    except (TimeoutError, llm.PrazoEsgotado):
        raise ErroHttp(504, "prazo")
    except llm.ProvedorIndisponivel:
        logging.getLogger("research-engine").warning("provedor indisponível", exc_info=True)
        raise ErroHttp(503, "provedor_indisponivel")
    except llm.SaidaInvalida:
        logging.getLogger("research-engine").warning("saída inválida", exc_info=True)
        raise ErroHttp(502, "saida_invalida")


@app.post("/suggest", response_model=SuggestResponse, dependencies=[Depends(exigir_token)])
async def suggest(payload: SuggestRequest) -> SuggestResponse:
    """
    Tópico + nível (+ referências REAIS opcionais) → 1 sugestão de pesquisa.
    Referências da resposta são sempre um subconjunto das enviadas; sem envio → [] e
    references_status="ausentes".
    """
    return await _sugerir(payload)


@app.post("/refresh", response_model=SuggestResponse, dependencies=[Depends(exigir_token)])
async def refresh(payload: SuggestRequest) -> SuggestResponse:
    """Mesmo contrato do /suggest; o cliente manda o título anterior em exclude_titles."""
    return await _sugerir(payload)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8002, reload=True)
