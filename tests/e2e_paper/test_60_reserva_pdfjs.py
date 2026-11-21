"""
CENA 6 — O LEITOR DE PRODUÇÃO CAI. O pdf-loader sai do ar (o app continua apontando pra ele). O PDF da aluna tem de
entrar mesmo assim, pela reserva pdf.js da skill de leitura, com as PÁGINAS certas — e a Aura acha o trecho nele.
Fica por último: depois daqui o pdf-loader não volta.
"""
import material as M
import oraculos as O
from conftest import guardar

FATO = "O reservatório Jaçanã da escola Boa Esperança armazena 42 mil litros de água cinza tratada."
PAGINAS = [
    ["As cisternas de placa são a principal forma de armazenamento de água nas escolas rurais visitadas."] * 3,
    ["A água cinza tratada segue para um reservatório próprio, separado da água de beber. " + FATO,
     "O reservatório recebe a água depois do biofiltro e a distribui para a horta por gravidade."],
    ["A horta escolar consome a maior parte da água de reuso durante a estação seca."] * 3,
]


def test_pdf_entra_pelo_pdfjs_quando_o_loader_cai(infra, aluna, caderno):
    infra.parar_pdf_loader()
    pdf = M.pdf_paginas("Relatorio Reservatorio Jacana", PAGINAS)
    guardar("relatorio-jacana.pdf", pdf)
    res = aluna.base_enviar("Relatorio Reservatorio Jacana.pdf", pdf)["resultados"][0]
    doc = aluna.base_esperar_pronto(res["documentoId"])
    assert doc["status"] == "pronto", f"com o loader fora, o PDF não entrou: {doc}"
    assert doc["paginas"] == 3, doc
    linhas = [l for l in infra.log_app(3000).splitlines() if "[pdf] leitura:" in l]
    assert linhas and '"leitor":"pdfjs"' in linhas[-1] and "pdf-loader:indisponivel" in linhas[-1], linhas[-2:]
    caderno.update(jacana_id=res["documentoId"], jacana_pdf=pdf)


def test_trecho_achado_no_pdf_lido_pela_reserva(aluna, caderno):
    if "jacana_id" not in caderno:
        import pytest
        pytest.skip("o PDF não entrou")
    r = aluna.chat("Em que página o meu relatório fala da capacidade do reservatório Jaçanã? Mostre o trecho.", "e2e-reserva")
    guardar("trechos-reserva.json", {"texto": r.texto, "trechos": r.trechos})
    pdf = M.texto_pdf(caderno["jacana_pdf"])
    problemas = [p for t in r.trechos if t["documentoId"] == caderno["jacana_id"] for p in O.trecho_confere(t, pdf)]
    assert not problemas, "\n".join(problemas)
    assert any("42 mil litros" in t["citacao"] and O.paginas_do_rotulo(t["paginas"]) == {2} for t in r.trechos), \
        [(t["paginas"], t["citacao"][:80]) for t in r.trechos]
    assert "42 mil" in r.texto
