"""
tests/e2e_paper/conftest.py — a infraestrutura da sessão de testes e o "caderno" que os cenários compartilham.

Os cenários são uma HISTÓRIA, em ordem (os arquivos são numerados): o aluno sobe a apostila, acha trechos nela, gera
um artigo, salva o artigo como PDF, gera um TCC a partir do artigo… O `caderno` guarda o que um passo deixa pro outro;
passo que depende de um anterior que falhou é PULADO com o motivo (não falha em cascata).

Rodar: ver tests/e2e_paper/README.md. `-m offline` roda só os oráculos (sem infraestrutura nem LLM).
"""
from __future__ import annotations

import json
import os
import sys
from pathlib import Path

import pytest
import requests

AQUI = Path(__file__).resolve().parent
sys.path.insert(0, str(AQUI))

from cliente import Aluno  # noqa: E402
from infra import RAIZ, Infra, credenciais_vertex  # noqa: E402

SAIDA = AQUI / ".saida"


def pytest_configure(config):
    config.addinivalue_line("markers", "offline: não precisa de infraestrutura nem de LLM")
    config.addinivalue_line("markers", "rede: consulta serviço público (Crossref/doi.org)")


def pytest_addoption(parser):
    parser.addoption("--manter", action="store_true", help="não apaga a pasta temporária (bancos e logs) no fim")


def _so_offline(config) -> bool:
    return (config.getoption("-m") or "").strip() == "offline"


@pytest.fixture(scope="session")
def infra(request):
    if _so_offline(request.config):
        pytest.skip("só oráculos")
    faltam = [k for k in ("MONGOD_BIN", "PG_BIN", "PDF_LOADER_PY", "JAVA_HOME", "ZAEON_ENV_PRINCIPAL") if not os.environ.get(k)]
    if faltam:
        pytest.skip(f"infra E2E não configurada (faltam {', '.join(faltam)}) — ver README")
    vertex = credenciais_vertex(Path(os.environ["ZAEON_ENV_PRINCIPAL"]))
    if not vertex.get("GOOGLE_PRIVATE_KEY") and not vertex.get("GOOGLE_CREDENTIALS"):
        pytest.skip("sem credenciais do Vertex (GOOGLE_*) no .env principal")
    i = Infra()
    SAIDA.mkdir(exist_ok=True)
    (SAIDA / "pasta-da-infra.txt").write_text(str(i.pasta))
    try:
        i.subir_mongo(os.environ["MONGOD_BIN"])
        i.subir_postgres(os.environ["PG_BIN"])
        i.subir_pdf_loader(os.environ["PDF_LOADER_PY"], os.environ["JAVA_HOME"])
        i.subir_app(vertex)
    except Exception:
        print("\n── log do app ──\n" + i.log_app(120), file=sys.stderr)
        i.descer(manter=True)
        raise
    del vertex  # as credenciais vivem só no ambiente do processo do app
    yield i
    i.descer(manter=request.config.getoption("--manter"))


def _aluno(infra: Infra, email: str) -> Aluno:
    s = infra.sessao(email)
    return Aluno(infra.url, s["cookie"], s["userId"], s["email"])


@pytest.fixture(scope="session")
def aluna(infra) -> Aluno:
    """A aluna da história (dona da apostila e dos trabalhos)."""
    return _aluno(infra, "aluna.e2e@teste.local")


@pytest.fixture(scope="session")
def intrusa(infra) -> Aluno:
    """Outra aluna, sem nada compartilhado: tudo da primeira tem de ser invisível pra ela."""
    return _aluno(infra, "intrusa.e2e@teste.local")


@pytest.fixture(scope="session")
def caderno() -> dict:
    return {}


@pytest.fixture(scope="session")
def http_publico():
    s = requests.Session()
    s.headers["User-Agent"] = "zaeon-e2e-tests/1.0"
    return s


def precisa(caderno: dict, *chaves: str):
    faltam = [k for k in chaves if k not in caderno]
    if faltam:
        pytest.skip(f"depende de passo anterior que não deixou: {', '.join(faltam)}")


def guardar(nome: str, conteudo):
    """O que a suíte produziu fica em tests/e2e_paper/.saida/ pra leitura humana (documentos, PDFs, respostas)."""
    SAIDA.mkdir(exist_ok=True)
    p = SAIDA / nome
    if isinstance(conteudo, bytes):
        p.write_bytes(conteudo)
    elif isinstance(conteudo, str):
        p.write_text(conteudo, encoding="utf-8")
    else:
        p.write_text(json.dumps(conteudo, ensure_ascii=False, indent=2), encoding="utf-8")
    return p


def markdown_do_trabalho(t: dict) -> str:
    partes = [f"# {t.get('titulo')}"]
    for s in t.get("secoes", []):
        partes += [f"## {s['titulo']}", s.get("corpo", "")]
    return "\n\n".join(partes)


@pytest.hookimpl(hookwrapper=True)
def pytest_runtest_makereport(item, call):
    """Teste que falhou com a infra de pé: anexa o fim do log do app (é lá que o motivo costuma estar)."""
    out = yield
    rep = out.get_result()
    if rep.when == "call" and rep.failed and "infra" in item.fixturenames:
        i = item.funcargs.get("infra")
        if i:
            rep.sections.append(("log do app (fim)", i.log_app(80)))


__all__ = ["precisa", "guardar", "markdown_do_trabalho", "RAIZ"]
