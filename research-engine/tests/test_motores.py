# research-engine/tests/test_motores.py — contrato /motor/v1 (o que o adaptador TS motorHttp consome).
import time

import pytest

from motores import registro
from motores.base import Motor
from motores.citacoes import citacoes, sanear
from motores.contrato import Evidencia, Fonte, Resultado, UsoMotor
from tests.fakes import SAIDA_OK, Demora, erro, resp

EVID = [
    {"chave": "E1", "claim": "Antocianinas em pétalas de Phalaenopsis são reguladas por luz.",
     "source": {"title": "Anthocyanin biosynthesis in Phalaenopsis", "url": "https://doi.org/10.1016/j.scienta.2021.110234",
                "authors": "Chen, L.", "year": 2021}},
    {"chave": "E2", "claim": "Plantas respondem a vibrações sonoras.",
     "source": {"title": "Plant bioacoustics", "url": "https://arxiv.org/abs/2001.00001", "authors": None, "year": None}},
]


def tarefa(**kw):
    base = {"id": "t-1", "motor": "zaeon-sugestao", "objetivo": "orquídeas rosas e bioacústica",
            "intent": "sugestao_pesquisa doutorado", "contexto": None, "prazo_ms": 5000, "evidencias": EVID}
    return {**base, **kw}


CHAVES_RESULTADO = {"motor", "texto", "evidencias", "uso", "modelos", "passos", "degradado"}


# ── catálogo ─────────────────────────────────────────────────────────────────
def test_lista_motores_formato(http):
    r = http.get("/motor/v1/motores")
    assert r.status_code == 200
    lista = r.json()
    assert isinstance(lista, list) and lista
    zs = next(m for m in lista if m["id"] == "zaeon-sugestao")
    assert set(zs) == {"id", "nome", "origem", "formato", "disponivel"}
    assert zs["origem"] == "zaeon" and zs["formato"] == "unico"
    assert zs["disponivel"] is False  # sem credencial no ambiente de teste


def test_motor_disponivel_com_credencial(http, monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "k")
    zs = next(m for m in http.get("/motor/v1/motores").json() if m["id"] == "zaeon-sugestao")
    assert zs["disponivel"] is True


# ── tarefas: forma do contrato ───────────────────────────────────────────────
def test_tarefa_forma_do_contrato(http, cliente):
    cliente(resp({**SAIDA_OK, "citadas": [2, 1]}, prompt=300, saida=120))
    r = http.post("/motor/v1/tarefas", json=tarefa())
    assert r.status_code == 200, r.text
    corpo = r.json()
    assert set(corpo) == CHAVES_RESULTADO
    assert corpo["motor"] == "zaeon-sugestao"
    assert corpo["uso"] == {"prompt_tokens": 300, "completion_tokens": 120, "chamadas": 1}
    assert corpo["modelos"] == ["gemini-3.5-flash"]
    assert corpo["passos"] == 1 and corpo["degradado"] is False
    assert corpo["evidencias"] == EVID  # entrada volta intacta
    assert "[E2][E1]" in corpo["texto"] and corpo["texto"].startswith("### ")
    assert set(citacoes(corpo["texto"])) <= {"E1", "E2"}


def test_tarefa_indice_fora_da_faixa_nao_vira_citacao(http, cliente):
    cliente(resp({**SAIDA_OK, "citadas": [9]}))
    corpo = http.post("/motor/v1/tarefas", json=tarefa()).json()
    assert citacoes(corpo["texto"]) == []
    assert corpo["degradado"] is True  # sem lastro


def test_tarefa_sem_evidencias_degradada(http, cliente):
    c = cliente(resp(SAIDA_OK))
    corpo = http.post("/motor/v1/tarefas", json=tarefa(evidencias=[])).json()
    assert corpo["evidencias"] == [] and corpo["degradado"] is True
    assert "não lastreada" in corpo["texto"]
    assert "REFERÊNCIAS FORNECIDAS: nenhuma" in c.chamadas[0]["contents"]


def test_tarefa_nivel_vem_da_intent(http, cliente):
    c = cliente(resp(SAIDA_OK))
    http.post("/motor/v1/tarefas", json=tarefa(intent="sugestao", contexto="aluno de mestrado"))
    assert "MESTRANDO" in c.chamadas[0]["config"].system_instruction


def test_tarefa_retenta_429(http, cliente):
    cliente(erro(429), resp({**SAIDA_OK, "citadas": [1]}))
    corpo = http.post("/motor/v1/tarefas", json=tarefa()).json()
    assert corpo["uso"]["chamadas"] == 2


# ── tarefas: erros ───────────────────────────────────────────────────────────
def test_motor_desconhecido_404(http):
    r = http.post("/motor/v1/tarefas", json=tarefa(motor="nao-existe"))
    assert r.status_code == 404 and r.json() == {"erro": "motor_desconhecido"}


def test_motor_indisponivel_503(http):
    r = http.post("/motor/v1/tarefas", json=tarefa())  # sem credencial
    assert r.status_code == 503 and r.json() == {"erro": "motor_indisponivel"}


def test_provedor_fora_503(http, cliente):
    cliente(erro(500))
    r = http.post("/motor/v1/tarefas", json=tarefa())
    assert r.status_code == 503 and r.json() == {"erro": "motor_indisponivel"}


def test_saida_invalida_502(http, cliente):
    cliente(resp("lixo"))
    r = http.post("/motor/v1/tarefas", json=tarefa())
    assert r.status_code == 502 and r.json() == {"erro": "saida_invalida"}


def test_prazo_504_dentro_do_prazo(http, cliente):
    cliente(Demora(5, resp(SAIDA_OK)))
    t0 = time.monotonic()
    r = http.post("/motor/v1/tarefas", json=tarefa(prazo_ms=300))
    dt = time.monotonic() - t0
    assert r.status_code == 504 and r.json() == {"erro": "prazo"}
    assert dt < 0.3 + 0.15  # 300 ms + overhead do TestClient; o servidor corta antes do prazo


@pytest.mark.parametrize("ruim", [
    {"prazo_ms": 0},
    {"prazo_ms": "rápido"},
    {"objetivo": ""},
    {"evidencias": [{"chave": "X1", "claim": "c", "source": {"title": "t"}}]},
    {"evidencias": [EVID[0], EVID[0]]},  # chave repetida
])
def test_corpo_invalido_422(http, ruim):
    r = http.post("/motor/v1/tarefas", json=tarefa(**ruim))
    assert r.status_code == 422 and r.json()["erro"] == "corpo_invalido"


def test_corpo_sem_campo_obrigatorio_422(http):
    corpo = tarefa()
    del corpo["prazo_ms"]
    assert http.post("/motor/v1/tarefas", json=corpo).status_code == 422


# ── auth ─────────────────────────────────────────────────────────────────────
def test_auth_401_sem_token(http, monkeypatch):
    monkeypatch.setenv("MOTOR_TOKEN", "s3gr3do")
    for r in (http.get("/motor/v1/motores"),
              http.post("/motor/v1/tarefas", json=tarefa()),
              http.get("/motor/v1/motores", headers={"Authorization": "Bearer errado"}),
              http.get("/motor/v1/motores", headers={"Authorization": "s3gr3do"})):
        assert r.status_code == 401 and r.json() == {"erro": "nao_autorizado"}


def test_auth_ok_com_token(http, cliente, monkeypatch):
    monkeypatch.setenv("MOTOR_TOKEN", "s3gr3do")
    cliente(resp(SAIDA_OK))
    h = {"Authorization": "Bearer s3gr3do"}
    assert http.get("/motor/v1/motores", headers=h).status_code == 200
    assert http.post("/motor/v1/tarefas", json=tarefa(), headers=h).status_code == 200


# ── guarda de citações (vale pra qualquer motor) ─────────────────────────────
class MotorMentiroso(Motor):
    id = "mentiroso"
    nome = "Motor de teste que cita evidência inexistente"
    origem = "outro"
    formato = "unico"

    async def executar(self, tarefa, deadline):
        return Resultado(
            motor="outro-nome",
            texto="Fato A [E1]. Fato B [E9]. Fato C [E1, E9; E3]. Fato D [E2] .",
            evidencias=[
                Evidencia(chave="E1", claim="SOBRESCRITA", source=Fonte(title="falsa")),  # colide: ignorada
                Evidencia(chave="E3", claim="nova", source=Fonte(title="Nova fonte", year="2024")),
            ],
            uso=UsoMotor(), modelos=["x"], passos=3, degradado=False,
        )


@pytest.fixture
def mentiroso(monkeypatch):
    m = MotorMentiroso()
    monkeypatch.setitem(registro._POR_ID, m.id, m)
    return m


def test_citacao_inexistente_e_removida_e_marca_degradado(http, mentiroso):
    corpo = http.post("/motor/v1/tarefas", json=tarefa(motor="mentiroso")).json()
    assert corpo["texto"] == "Fato A [E1]. Fato B. Fato C [E1][E3]. Fato D [E2]."
    assert "[E9]" not in corpo["texto"]
    assert corpo["degradado"] is True
    assert corpo["motor"] == "mentiroso"
    chaves = [e["chave"] for e in corpo["evidencias"]]
    assert chaves == ["E1", "E2", "E3"]
    assert corpo["evidencias"][0]["claim"] == EVID[0]["claim"]  # entrada vence
    assert corpo["evidencias"][2]["source"]["year"] == 2024
    assert set(citacoes(corpo["texto"])) <= set(chaves)


def test_sanear_sem_remocao_nao_mexe():
    texto, removidas = sanear("A [E1]  b , c [E2]", {"E1", "E2"})
    assert removidas == [] and texto == "A [E1]  b , c [E2]"


def test_sanear_grupo_todo_invalido():
    texto, removidas = sanear("Afirmação [E7; E8].\nOutra [E1]", {"E1"})
    assert texto == "Afirmação.\nOutra [E1]" and removidas == ["E7", "E8"]
