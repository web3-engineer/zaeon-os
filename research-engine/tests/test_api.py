# research-engine/tests/test_api.py — /health, /suggest, /refresh (HTTP, cliente falso).
from tests.fakes import SAIDA_OK, Demora, erro, resp

PEDIDO = {"topic": "orquídeas rosas", "level": "phd"}


def test_health(http):
    r = http.get("/health")
    assert r.status_code == 200
    corpo = r.json()
    assert corpo["status"] == "ok" and corpo["modelo"] == "gemini-3.5-flash"
    assert corpo["llm_configurado"] is False


def test_suggest_ok_sem_referencias(http, cliente):
    cliente(resp({**SAIDA_OK, "citadas": [1, 2]}))
    r = http.post("/suggest", json=PEDIDO)
    assert r.status_code == 200, r.text
    corpo = r.json()
    assert corpo["suggestion"]["type"] == "Pioneira"
    assert corpo["references"] == [] and corpo["references_status"] == "ausentes"


def test_suggest_com_referencias(http, cliente):
    cliente(resp({**SAIDA_OK, "citadas": [1]}))
    pedido = {**PEDIDO, "references": [{"source": "Crossref", "title": "Paper real", "doi": "10.1/x"}]}
    corpo = http.post("/refresh", json=pedido).json()
    assert corpo["references"] == [{
        "source": "DOI", "title": "Paper real", "authors": "", "year": "", "venue": "",
        "doi": "10.1/x", "url": None,
    }]
    assert corpo["references_status"] == "fornecidas"


def test_suggest_corpo_invalido_422(http):
    r = http.post("/suggest", json={"topic": "x", "level": "doutor"})
    assert r.status_code == 422 and r.json()["erro"] == "corpo_invalido"


def test_suggest_prazo_504(http, cliente, monkeypatch):
    monkeypatch.setenv("RESEARCH_ENGINE_PRAZO_MS", "200")
    cliente(Demora(5, resp(SAIDA_OK)))
    r = http.post("/suggest", json=PEDIDO)
    assert r.status_code == 504 and r.json() == {"erro": "prazo"}


def test_suggest_sem_credencial_503(http):
    r = http.post("/suggest", json=PEDIDO)
    assert r.status_code == 503 and r.json() == {"erro": "provedor_indisponivel"}


def test_suggest_provedor_fora_503(http, cliente):
    cliente(erro(503))
    assert http.post("/suggest", json=PEDIDO).status_code == 503


def test_suggest_saida_ruim_502(http, cliente):
    cliente(resp("lixo"))
    r = http.post("/suggest", json=PEDIDO)
    assert r.status_code == 502 and r.json() == {"erro": "saida_invalida"}


def test_suggest_exige_token_quando_configurado(http, cliente, monkeypatch):
    monkeypatch.setenv("MOTOR_TOKEN", "segredo")
    cliente(resp(SAIDA_OK))
    assert http.post("/suggest", json=PEDIDO).status_code == 401
    ok = http.post("/suggest", json=PEDIDO, headers={"Authorization": "Bearer segredo"})
    assert ok.status_code == 200
    assert http.get("/health").status_code == 200  # health fica aberto
