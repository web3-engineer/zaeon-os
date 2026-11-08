# research-engine/tests/test_sdk_real.py — SDK google-genai DE VERDADE, transporte httpx falso (sem rede).
# Pega quebra de API do SDK num bump de versão (nomes de campo, formato do corpo, .text, usage).
import asyncio
import json

import httpx
from google import genai
from google.genai import types

import llm
from models import SaidaModelo
from tests.fakes import SAIDA_OK


def _cliente_sdk(handler) -> genai.Client:
    transporte = httpx.MockTransport(handler)
    return genai.Client(
        api_key="chave-falsa",
        http_options=types.HttpOptions(httpx_async_client=httpx.AsyncClient(transport=transporte)),
    )


def _corpo_gemini(dados: dict, status: int = 200) -> httpx.Response:
    return httpx.Response(status, json={
        "candidates": [{"content": {"role": "model", "parts": [{"text": json.dumps(dados)}]},
                        "finishReason": "STOP"}],
        "usageMetadata": {"promptTokenCount": 11, "candidatesTokenCount": 7, "totalTokenCount": 18},
    })


async def test_sdk_real_saida_estruturada():
    pedidos: list[httpx.Request] = []

    def handler(req: httpx.Request) -> httpx.Response:
        pedidos.append(req)
        return _corpo_gemini(SAIDA_OK)

    llm.definir_cliente(_cliente_sdk(handler))
    saida, uso = await llm.gerar_estruturado(
        schema=SaidaModelo, sistema="sys", mensagem="msg",
        deadline=asyncio.get_running_loop().time() + 5,
    )
    assert saida.title == SAIDA_OK["title"]
    assert (uso.prompt_tokens, uso.completion_tokens, uso.chamadas) == (11, 7, 1)

    req = pedidos[0]
    assert "gemini-3.5-flash:generateContent" in str(req.url)
    corpo = json.loads(req.content)
    gc = corpo["generationConfig"]
    assert gc["responseMimeType"] == "application/json"
    assert gc["responseSchema"]["type"] == "OBJECT"
    assert "citadas" in gc["responseSchema"]["properties"]
    assert gc["maxOutputTokens"] == 8192
    assert corpo["systemInstruction"]["parts"][0]["text"] == "sys"


async def test_sdk_real_429_vira_retentativa():
    respostas = [httpx.Response(429, json={"error": {"code": 429, "message": "quota", "status": "RESOURCE_EXHAUSTED"}}),
                 _corpo_gemini(SAIDA_OK)]

    def handler(req: httpx.Request) -> httpx.Response:
        return respostas.pop(0)

    llm.definir_cliente(_cliente_sdk(handler))
    _, uso = await llm.gerar_estruturado(
        schema=SaidaModelo, sistema="s", mensagem="m",
        deadline=asyncio.get_running_loop().time() + 5,
    )
    assert uso.chamadas == 2
