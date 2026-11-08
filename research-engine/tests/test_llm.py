# research-engine/tests/test_llm.py — camada de LLM: saída estruturada, retentativa, prazo.
import asyncio
import time

import pytest

import llm
from models import SaidaModelo
from tests.fakes import SAIDA_OK, Demora, erro, resp


def _deadline(s: float) -> float:
    return asyncio.get_running_loop().time() + s


async def _gerar(prazo_s: float = 10.0):
    return await llm.gerar_estruturado(
        schema=SaidaModelo, sistema="sys", mensagem="msg", deadline=_deadline(prazo_s)
    )


async def test_saida_estruturada_nativa(cliente):
    c = cliente(resp(SAIDA_OK, prompt=120, saida=80))
    saida, uso = await _gerar()
    assert isinstance(saida, SaidaModelo)
    assert saida.type == "Pioneira" and saida.gap_score == 0.87
    assert (uso.prompt_tokens, uso.completion_tokens, uso.chamadas) == (120, 80, 1)
    assert uso.modelos == ["gemini-3.5-flash"]

    cfg = c.chamadas[0]["config"]
    assert c.chamadas[0]["model"] == "gemini-3.5-flash"
    assert cfg.response_mime_type == "application/json"
    assert cfg.response_schema is SaidaModelo
    assert cfg.max_output_tokens >= 4096  # os 1800 de antes truncavam o JSON
    assert cfg.system_instruction == "sys"
    assert cfg.http_options.timeout > 0


async def test_modelo_vem_do_env(cliente, monkeypatch):
    monkeypatch.setenv("RESEARCH_ENGINE_MODEL", "gemini-9-ultra")
    c = cliente(resp(SAIDA_OK))
    _, uso = await _gerar()
    assert c.chamadas[0]["model"] == "gemini-9-ultra"
    assert uso.modelos == ["gemini-9-ultra"]


async def test_retenta_429_e_depois_sucesso(cliente, esperas):
    c = cliente(erro(429), resp(SAIDA_OK))
    saida, uso = await _gerar()
    assert saida.title.startswith("Bioacústica")
    assert uso.chamadas == 2 and len(c.chamadas) == 2
    assert len(esperas) == 1 and esperas[0] > 0  # backoff aconteceu


async def test_backoff_exponencial_com_jitter(cliente, esperas, monkeypatch):
    monkeypatch.setenv("RESEARCH_ENGINE_BACKOFF_BASE_MS", "100")
    cliente(erro(503), erro(503), resp(SAIDA_OK))
    await _gerar()
    assert len(esperas) == 2
    assert 0.1 <= esperas[0] <= 0.2   # base·2⁰ + jitter[0, base]
    assert 0.2 <= esperas[1] <= 0.3   # base·2¹ + jitter


async def test_5xx_persistente_no_maximo_2_retentativas(cliente):
    c = cliente(erro(500))
    with pytest.raises(llm.ProvedorIndisponivel) as e:
        await _gerar()
    assert len(c.chamadas) == 3 and e.value.chamadas == 3


async def test_4xx_nao_retenta(cliente):
    c = cliente(erro(404))  # ex.: modelo aposentado
    with pytest.raises(llm.ProvedorIndisponivel):
        await _gerar()
    assert len(c.chamadas) == 1


async def test_json_invalido_retenta_e_recupera(cliente):
    c = cliente(resp("isto não é json {{{"), resp(SAIDA_OK))
    saida, _ = await _gerar()
    assert saida.gap_score == 0.87 and len(c.chamadas) == 2


async def test_truncado_max_tokens_retenta(cliente):
    c = cliente(resp('{"title": "corta', finish="MAX_TOKENS"), resp(SAIDA_OK))
    await _gerar()
    assert len(c.chamadas) == 2


async def test_saida_invalida_apos_retentativas(cliente):
    cliente(resp({"sem": "campos"}))
    with pytest.raises(llm.SaidaInvalida):
        await _gerar()


async def test_prazo_estoura_rapido(cliente):
    cliente(Demora(5, resp(SAIDA_OK)))
    t0 = time.monotonic()
    with pytest.raises(llm.PrazoEsgotado):
        await _gerar(prazo_s=0.3)
    assert time.monotonic() - t0 < 0.45  # nunca segura além do prazo


async def test_nao_dorme_backoff_que_passaria_do_prazo(cliente, esperas, monkeypatch):
    monkeypatch.setenv("RESEARCH_ENGINE_BACKOFF_BASE_MS", "5000")
    c = cliente(erro(429))
    with pytest.raises(llm.ProvedorIndisponivel):
        await _gerar(prazo_s=1.0)
    assert esperas == [] and len(c.chamadas) == 1


async def test_sem_credencial_indisponivel():
    assert llm.configurado() is False
    with pytest.raises(llm.ProvedorIndisponivel):
        await _gerar()


def test_selecao_de_backend(monkeypatch):
    assert llm.backend() == "api_key" and not llm.configurado()
    monkeypatch.setenv("GEMINI_API_KEY", "k")
    assert llm.configurado()
    monkeypatch.setenv("GOOGLE_GENAI_USE_VERTEXAI", "true")
    assert llm.backend() == "vertex" and not llm.configurado()  # vertex sem projeto
    monkeypatch.setenv("GOOGLE_PROJECT_ID", "zaeon")
    assert llm.configurado()
    assert llm._location() == "global"
    monkeypatch.setenv("GEMINI_TEXT_LOCATION", "us-east5")
    assert llm._location() == "us-east5"
    monkeypatch.setenv("GOOGLE_CLOUD_LOCATION", "europe-west4")
    assert llm._location() == "europe-west4"


def test_projeto_do_json_de_credencial(monkeypatch):
    monkeypatch.setenv("GOOGLE_GENAI_USE_VERTEXAI", "1")
    # private_key com quebra de linha REAL (comum no .env) não pode derrubar o parse
    monkeypatch.setenv("GOOGLE_CREDENTIALS", '{"project_id": "proj-x", "private_key": "-----BEGIN\nabc\n-----END"}')
    assert llm._projeto() == "proj-x"
    assert llm.configurado()
