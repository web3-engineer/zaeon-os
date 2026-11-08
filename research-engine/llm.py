"""
Camada de LLM (google-genai). Ponto ÚNICO onde o serviço fala com o Gemini — os testes trocam
o cliente por um falso com `definir_cliente(...)` e nada sai pra rede.

Garantias desta camada:
  • saída estruturada NATIVA (response_mime_type=application/json + response_schema do Pydantic);
    nada de "JSON PURO" no prompt + regex de cerca;
  • timeout por chamada E prazo total (deadline absoluto em loop.time()) — nunca passa do prazo;
  • retentativa com backoff exponencial + jitter em 429 / 5xx / timeout / saída inválida,
    no máximo 2 retentativas e só se ainda couber no prazo;
  • erros tipados que a API mapeia pra HTTP: PrazoEsgotado→504, ProvedorIndisponivel→503,
    SaidaInvalida→502.

Seleção de backend (mesmos nomes de env do SDK, com fallback pros nomes que o .env da Zaeon já usa):
  Vertex  : GOOGLE_GENAI_USE_VERTEXAI=true + GOOGLE_CLOUD_PROJECT (ou GOOGLE_PROJECT_ID, ou o
            project_id de GOOGLE_CREDENTIALS) + GOOGLE_CLOUD_LOCATION (ou GEMINI_TEXT_LOCATION,
            GOOGLE_LOCATION; padrão "global", onde o gemini-3.5-flash existe).
            Credencial: GOOGLE_CREDENTIALS (JSON da service account) ou ADC
            (GOOGLE_APPLICATION_CREDENTIALS / metadata server).
  API key : GEMINI_API_KEY (ou GOOGLE_API_KEY).
"""
from __future__ import annotations

import asyncio
import json
import logging
import random
from dataclasses import dataclass, field
from typing import Any, TypeVar

from pydantic import BaseModel, ValidationError

import config

log = logging.getLogger("research-engine.llm")

T = TypeVar("T", bound=BaseModel)

# Folga reservada no fim do prazo pra serializar a resposta e devolver — a chamada ao provedor
# nunca usa o prazo inteiro.
_FOLGA_S = 0.05


# ── Erros tipados ────────────────────────────────────────────────────────────
class ErroLLM(Exception):
    """Base dos erros desta camada. `chamadas` = quantas vezes o provedor foi chamado."""

    def __init__(self, mensagem: str, chamadas: int = 0):
        super().__init__(mensagem)
        self.chamadas = chamadas


class PrazoEsgotado(ErroLLM):
    """Estourou o prazo (por chamada ou total) → 504."""


class ProvedorIndisponivel(ErroLLM):
    """Sem credencial, modelo inexistente, 429/5xx persistente → 503."""


class SaidaInvalida(ErroLLM):
    """O modelo respondeu, mas o JSON não valida (ou veio truncado) após as retentativas → 502."""


# ── Uso ──────────────────────────────────────────────────────────────────────
@dataclass
class Uso:
    prompt_tokens: int = 0
    completion_tokens: int = 0
    chamadas: int = 0
    modelos: list[str] = field(default_factory=list)

    def somar(self, outro: "Uso") -> None:
        self.prompt_tokens += outro.prompt_tokens
        self.completion_tokens += outro.completion_tokens
        self.chamadas += outro.chamadas
        for m in outro.modelos:
            if m not in self.modelos:
                self.modelos.append(m)


# ── Cliente ──────────────────────────────────────────────────────────────────
_cliente: Any = None


def definir_cliente(cliente: Any) -> None:
    """Injeta um cliente (testes) ou zera (None) pra recriar a partir do env."""
    global _cliente
    _cliente = cliente


def _credenciais_json() -> dict[str, Any]:
    """GOOGLE_CREDENTIALS como no lib/ai/vertex-credentials.ts: tolera \\n reais na private_key."""
    raw = config.env("GOOGLE_CREDENTIALS")
    if not raw:
        return {}
    for tentativa in (raw, raw.replace("\n", "\\n")):
        try:
            dados = json.loads(tentativa)
            return dados if isinstance(dados, dict) else {}
        except json.JSONDecodeError:
            continue
    return {}


def usa_vertex() -> bool:
    return config.env_bool("GOOGLE_GENAI_USE_VERTEXAI")


def _projeto() -> str:
    return (
        config.env("GOOGLE_CLOUD_PROJECT")
        or config.env("GOOGLE_PROJECT_ID")
        or str(_credenciais_json().get("project_id") or "")
    )


def _location() -> str:
    return (
        config.env("GOOGLE_CLOUD_LOCATION")
        or config.env("GEMINI_TEXT_LOCATION")
        or config.env("GOOGLE_LOCATION")
        or "global"
    )


def _api_key() -> str:
    return config.env("GEMINI_API_KEY") or config.env("GOOGLE_API_KEY")


def configurado() -> bool:
    """Há credencial suficiente pra tentar chamar o provedor? (não faz rede)."""
    if _cliente is not None:
        return True
    return bool(_projeto()) if usa_vertex() else bool(_api_key())


def backend() -> str:
    return "vertex" if usa_vertex() else "api_key"


def _criar_cliente() -> Any:
    from google import genai  # import tardio: os testes não precisam do SDK configurado

    if usa_vertex():
        projeto = _projeto()
        if not projeto:
            raise ProvedorIndisponivel(
                "GOOGLE_GENAI_USE_VERTEXAI=true mas sem GOOGLE_CLOUD_PROJECT/GOOGLE_PROJECT_ID"
            )
        credenciais = None
        info = _credenciais_json()
        if info.get("private_key"):
            from google.oauth2 import service_account

            if "\\n" in info["private_key"]:
                info["private_key"] = info["private_key"].replace("\\n", "\n")
            credenciais = service_account.Credentials.from_service_account_info(
                info, scopes=["https://www.googleapis.com/auth/cloud-platform"]
            )
        return genai.Client(
            vertexai=True, project=projeto, location=_location(), credentials=credenciais
        )

    chave = _api_key()
    if not chave:
        raise ProvedorIndisponivel(
            "sem credencial: defina GEMINI_API_KEY ou GOOGLE_GENAI_USE_VERTEXAI=true + projeto"
        )
    return genai.Client(api_key=chave)


def obter_cliente() -> Any:
    global _cliente
    if _cliente is None:
        _cliente = _criar_cliente()
    return _cliente


# ── Chamada estruturada com retentativa ──────────────────────────────────────
# Indireção pra os testes não dormirem de verdade.
_dormir = asyncio.sleep


def _agora() -> float:
    return asyncio.get_running_loop().time()


def _status_http(exc: BaseException) -> int | None:
    """Código HTTP de um erro do SDK (google.genai.errors.APIError tem .code)."""
    codigo = getattr(exc, "code", None)
    return codigo if isinstance(codigo, int) else None


def _uso_da_resposta(resp: Any) -> tuple[int, int]:
    meta = getattr(resp, "usage_metadata", None)
    if meta is None:
        return 0, 0
    prompt = getattr(meta, "prompt_token_count", 0) or 0
    saida = (getattr(meta, "candidates_token_count", 0) or 0) + (
        getattr(meta, "thoughts_token_count", 0) or 0
    )
    return int(prompt), int(saida)


def _truncada(resp: Any) -> bool:
    for cand in getattr(resp, "candidates", None) or []:
        motivo = getattr(cand, "finish_reason", None)
        nome = getattr(motivo, "name", None) or str(motivo or "")
        if "MAX_TOKENS" in nome:
            return True
    return False


def _montar_config(schema: type[BaseModel], sistema: str, temperatura: float, timeout_s: float) -> Any:
    from google.genai import types

    kwargs: dict[str, Any] = dict(
        system_instruction=sistema,
        temperature=temperatura,
        max_output_tokens=config.max_output_tokens(),
        response_mime_type="application/json",
        response_schema=schema,
        # timeout do SDK em ms; o asyncio.wait_for em volta é a garantia (o do SDK é só higiene
        # pra não deixar conexão pendurada). Sem retry do SDK: quem retenta é este módulo.
        http_options=types.HttpOptions(timeout=max(1, int(timeout_s * 1000))),
    )
    nivel = config.thinking_level()
    if nivel:
        kwargs["thinking_config"] = types.ThinkingConfig(thinking_level=nivel)
    return types.GenerateContentConfig(**kwargs)


async def gerar_estruturado(
    *,
    schema: type[T],
    sistema: str,
    mensagem: str,
    deadline: float,
    temperatura: float = 0.7,
) -> tuple[T, Uso]:
    """
    Chama o Gemini com saída estruturada e devolve (objeto validado, uso).

    `deadline` é ABSOLUTO no relógio do loop (`asyncio.get_running_loop().time() + segundos`).
    Levanta PrazoEsgotado / ProvedorIndisponivel / SaidaInvalida.
    """
    cliente = obter_cliente()
    nome_modelo = config.modelo()
    tentativas = 1 + config.max_retentativas()
    uso = Uso(modelos=[nome_modelo])
    ultimo: ErroLLM | None = None

    for n in range(tentativas):
        restante = deadline - _agora() - _FOLGA_S
        if restante <= 0:
            raise PrazoEsgotado("prazo esgotado antes da chamada ao provedor", uso.chamadas)
        timeout_s = min(config.timeout_requisicao_s(), restante)

        uso.chamadas += 1
        try:
            resp = await asyncio.wait_for(
                cliente.aio.models.generate_content(
                    model=nome_modelo,
                    contents=mensagem,
                    config=_montar_config(schema, sistema, temperatura, timeout_s),
                ),
                timeout=timeout_s,
            )
        except (asyncio.TimeoutError, TimeoutError):
            ultimo = PrazoEsgotado(f"provedor não respondeu em {timeout_s:.2f}s", uso.chamadas)
        except asyncio.CancelledError:
            raise
        except Exception as exc:  # erros do SDK (APIError) e de transporte (httpx)
            status = _status_http(exc)
            if status == 429 or (status is not None and status >= 500):
                ultimo = ProvedorIndisponivel(f"provedor respondeu {status}", uso.chamadas)
            elif status is not None:
                # 400/401/403/404 (ex.: modelo aposentado) não melhoram com retentativa.
                raise ProvedorIndisponivel(
                    f"provedor recusou ({status}): {str(exc)[:200]}", uso.chamadas
                ) from exc
            elif "timeout" in type(exc).__name__.lower():
                ultimo = PrazoEsgotado(f"timeout de transporte: {exc}", uso.chamadas)
            else:
                # falha de rede (conexão recusada, DNS…) → trata como indisponível e retenta
                ultimo = ProvedorIndisponivel(f"falha de transporte: {exc!r}"[:240], uso.chamadas)
        else:
            p, c = _uso_da_resposta(resp)
            uso.prompt_tokens += p
            uso.completion_tokens += c
            if _truncada(resp):
                ultimo = SaidaInvalida("saída truncada (MAX_TOKENS)", uso.chamadas)
            else:
                texto = getattr(resp, "text", None) or ""
                try:
                    return schema.model_validate_json(texto), uso
                except ValidationError as exc:
                    ultimo = SaidaInvalida(
                        f"JSON fora do schema: {exc.errors()[:2]} — bruto: {texto[:200]!r}",
                        uso.chamadas,
                    )

        # Vai retentar? Só se sobrar tentativa E o backoff + uma chamada mínima couberem no prazo.
        if n + 1 >= tentativas:
            break
        espera = config.backoff_base_s() * (2**n) + random.uniform(0, config.backoff_base_s())
        if _agora() + espera + _FOLGA_S >= deadline:
            break
        log.warning("tentativa %d falhou (%s); nova em %.2fs", n + 1, ultimo, espera)
        await _dormir(espera)

    assert ultimo is not None
    ultimo.chamadas = uso.chamadas
    raise ultimo
