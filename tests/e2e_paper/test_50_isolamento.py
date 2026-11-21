"""
CENA 5 — ISOLAMENTO: outra aluna logada não vê, não acha e não edita nada da primeira. Nem pelo id, nem pelo escopo,
nem perguntando à Aura sobre o conteúdo (o nome "Lucinda Prado Arraes" só existe na apostila da primeira).
"""
import re

from conftest import precisa


def test_documento_alheio_e_404_pelo_id(intrusa, caderno):
    precisa(caderno, "artigo_id")
    st, t = intrusa.trabalho(caderno["artigo_id"])
    assert st == 404 and t is None, st
    r = intrusa.trabalho_editar(caderno["artigo_id"], "qualquer", "invasão")
    assert r.status_code in (403, 404), r.status_code


def test_escopo_alheio_nao_lista_nada(intrusa, caderno):
    precisa(caderno, "artigo_id")
    ids = {w["id"] for w in intrusa.trabalhos_do_escopo("e2e-artigo")}
    assert caderno["artigo_id"] not in ids


def test_aura_nao_vaza_o_material_da_outra(intrusa, caderno):
    precisa(caderno, "apostila_id")
    r = intrusa.chat("Onde a minha apostila fala do sistema Tapiri? Mostre os trechos e diga quem o descreveu.", "e2e-intrusa")
    assert r.status == 200
    meus = {caderno.get("apostila_id"), caderno.get("artigo_doc_id")}
    assert not [t for t in r.trechos if t["documentoId"] in meus], "trecho da base de OUTRA aluna"
    assert not re.search(r"Lucinda|Arraes", r.texto), f"vazou o conteúdo da apostila alheia: {r.texto[:400]}"
