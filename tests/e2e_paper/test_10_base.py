"""
CENA 1 — a aluna sobe o material dela pra base, LOGADA, pela mesma rota da tela "Minha base".

Prova a skill de leitura de PDF em produção: o PDF bom entra pelo pdf-loader com todas as páginas; o escaneado é
recusado com o motivo certo ("sem_texto"), não vira documento vazio; e nada disso aparece pra outra aluna.
"""
from pathlib import Path

import material as M
from conftest import RAIZ, guardar


def test_apostila_entra_pela_skill_de_pdf_com_todas_as_paginas(infra, aluna, caderno):
    pdf = M.apostila_pdf()
    guardar("apostila.pdf", pdf)
    r = aluna.base_enviar("Apostila Agua Cinza no Semiarido.pdf", pdf)
    res = r["resultados"][0]
    assert res["status"] == "novo" and res["documentoId"], res  # resultado da ingestão; o status do documento vem na lista
    doc = aluna.base_esperar_pronto(res["documentoId"])
    assert doc["status"] == "pronto", doc
    assert doc["paginas"] == 8, f"a base registrou {doc['paginas']} páginas; o PDF tem 8"
    # QUEM leu: o pdf-loader (de pé nesta fase). O log é o diagnóstico de produção — se mente, ninguém acha o problema.
    linhas = [l for l in infra.log_app(2000).splitlines() if "[pdf] leitura:" in l]
    assert linhas and '"leitor":"pdf-loader"' in linhas[-1], linhas[-3:]
    caderno["apostila_id"] = res["documentoId"]
    caderno["apostila_titulo"] = doc["titulo"]
    caderno["apostila_pdf"] = pdf


def test_pdf_escaneado_e_recusado_com_motivo_honesto(aluna):
    escaneado = (RAIZ / "tests/fixtures/pdf/escaneado.pdf").read_bytes()
    r = aluna.base_enviar("prova-escaneada.pdf", escaneado)["resultados"][0]
    assert r["status"] == "erro" and r["erro"] == "sem_texto", r
    # e não ficou um documento fantasma "pronto" com zero trechos
    fantasmas = [d for d in aluna.base_listar() if d.get("nomeArquivo") == "prova-escaneada.pdf" and d["status"] == "pronto"]
    assert not fantasmas, fantasmas


def test_arquivo_que_nao_e_pdf_nem_texto_e_recusado(aluna):
    r = aluna.base_enviar("planilha.xlsx", b"PK\x03\x04 nada", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")["resultados"][0]
    assert r["status"] == "erro" and r["erro"] in ("nao_suportado", "leitura_falhou"), r


def test_base_da_aluna_e_invisivel_pra_outra(aluna, intrusa, caderno):
    if "apostila_id" not in caderno:
        import pytest
        pytest.skip("apostila não entrou")
    ids = {d["id"] for d in intrusa.base_listar()}
    assert caderno["apostila_id"] not in ids
    # e remover o documento alheio não funciona (404, sem dizer que existe)
    r = intrusa.http.delete(f"{intrusa.url}/api/rag/minha-base", params={"documentoId": caderno["apostila_id"]}, timeout=30)
    assert r.status_code == 404, (r.status_code, r.text[:200])
    assert caderno["apostila_id"] in {d["id"] for d in aluna.base_listar()}
