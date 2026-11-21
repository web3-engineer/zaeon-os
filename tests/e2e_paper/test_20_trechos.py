"""
CENA 2 — "LOCALIZAR ALGO NELE": a aluna pergunta em linguagem natural e a Aura mostra os trechos do material.

O oráculo é o PDF (lido por pypdf, independente do leitor da Zaeon) e os fatos plantados, que não existem fora da
apostila: acertar só é possível lendo o material. Todo trecho mostrado tem de ser LITERAL e estar na página que diz.
"""
import re

import pytest

import material as M
import oraculos as O
from conftest import guardar, precisa


def _pergunta(aluna, caderno, nome, prompt, escopo="e2e-trechos", **kw):
    precisa(caderno, "apostila_id")
    r = aluna.chat(prompt, escopo, **kw)
    guardar(f"trechos-{nome}.json", {"prompt": prompt, "status": r.status, "texto": r.texto, "trechos": r.trechos, "progresso": r.progresso})
    assert r.status == 200 and r.answer, f"chat {r.status}: {r.bruto[-600:]}"
    return r


def _todos_literais(trechos, pdf):
    problemas = [p for t in trechos for p in O.trecho_confere(t, pdf)]
    assert not problemas, "\n".join(problemas)


def test_fato_plantado_achado_literal_na_pagina_certa(aluna, caderno):
    r = _pergunta(aluna, caderno, "indice", "Em que página a minha apostila fala da queda no consumo de água potável com o sistema Tapiri? Mostre o trecho.")
    pdf = M.texto_pdf(caderno["apostila_pdf"])
    assert r.trechos, f"nenhum trecho achado. Resposta: {r.texto[:400]}"
    _todos_literais(r.trechos, pdf)
    com_fato = [t for t in r.trechos if "62%" in t["citacao"]]
    assert com_fato, f"o trecho do 62% não veio: {[t['citacao'][:80] for t in r.trechos]}"
    assert any(O.paginas_do_rotulo(t["paginas"]) == {M.FATO_INDICE[0]} for t in com_fato)
    # a folha aparece ANCORADA no texto (o marcador saiu do texto e virou âncora)
    assert all("[[T" not in x for x in (r.answer.get("nucleo") or "", r.answer.get("desenvolvimento") or ""))
    assert any(t.get("ancora") for t in r.trechos), "nenhuma folha ancorada num parágrafo da resposta"
    # a resposta DIZ o que foi perguntado (a folha é a prova, não a resposta) e não contradiz o trecho
    assert re.search(r"62\s*%", r.texto), f"a resposta não diz a queda de 62%: {r.texto[:400]}"
    assert O.numeros_fieis(r.texto, r"consumo|tapiri", {"62%"}) == []


def test_pergunta_de_quem_responde_com_o_nome_do_material(aluna, caderno):
    r = _pergunta(aluna, caderno, "autora", "Segundo a minha apostila, quem descreveu o sistema Tapiri e em que ano? Mostre onde ela diz isso.")
    pdf = M.texto_pdf(caderno["apostila_pdf"])
    assert "Lucinda Prado Arraes" in r.texto or "Arraes" in r.texto, r.texto[:500]
    assert "2019" in r.texto
    _todos_literais(r.trechos, pdf)
    assert any("Lucinda Prado Arraes" in t["citacao"] and O.paginas_do_rotulo(t["paginas"]) == {2} for t in r.trechos), \
        [(t["paginas"], t["citacao"][:70]) for t in r.trechos]


def test_todas_as_vezes_recall_e_precisao(aluna, caderno):
    """"Todas as vezes": as 3 ocorrências (p. 3, 5 e 7), nenhuma inventada em outra página."""
    r = _pergunta(aluna, caderno, "todas-as-vezes", "Ache todas as vezes que a minha apostila fala do biofiltro de juncos.")
    pdf = M.texto_pdf(caderno["apostila_pdf"])
    _todos_literais(r.trechos, pdf)
    com_termo = [t for t in r.trechos if M.TERMO_RECORRENTE in M.normalizar(t["citacao"])]
    paginas = set().union(*(O.paginas_do_rotulo(t["paginas"]) for t in com_termo)) if com_termo else set()
    faltam = set(M.PAGINAS_DO_TERMO) - paginas
    assert not faltam, f"recall: faltaram as páginas {sorted(faltam)} (vieram {sorted(paginas)})"
    assert paginas <= set(M.PAGINAS_DO_TERMO), f"precisão: página sem o termo {sorted(paginas - set(M.PAGINAS_DO_TERMO))}"


def test_o_que_nao_esta_no_material_nao_e_inventado(aluna, caderno):
    r = _pergunta(aluna, caderno, "negativo", "Onde a minha apostila fala de dessalinização por osmose reversa? Mostre os trechos.")
    pdf = M.texto_pdf(caderno["apostila_pdf"])
    _todos_literais(r.trechos, pdf)  # se veio algum, ao menos é verdadeiro
    assert not [t for t in r.trechos if re.search(r"osmose|dessaliniz", t["citacao"], re.I)]
    assert re.search(r"n[aã]o (encontrei|achei|aparece|fala|menciona|trata|h[aá]|consta|aborda)|nenhum", r.texto, re.I), \
        f"a resposta não admite que o material não fala disso: {r.texto[:500]}"


def test_anexo_do_chat_tambem_e_lido_pela_skill_com_pagina(aluna, caderno):
    """O PDF anexado no 📎 (sem passar pela base) também vira trecho literal com página."""
    precisa(caderno, "apostila_pdf")
    r = _pergunta(aluna, caderno, "anexo", "Neste PDF que anexei, em que página fala do custo de implantação do sistema Tapiri? Mostre o trecho.",
                  escopo="e2e-anexo", pdf=("apostila-anexo.pdf", caderno["apostila_pdf"]))
    pdf = M.texto_pdf(caderno["apostila_pdf"])
    _todos_literais(r.trechos, pdf)
    assert re.search(r"R\$\s*18(?:\s*mil|\.000)", r.texto), f"a resposta não diz o custo: {r.texto[:400]}"
    assert any("R$ 18 mil" in t["citacao"] and O.paginas_do_rotulo(t["paginas"]) == {M.FATO_CUSTO[0]} for t in r.trechos), \
        [(t["paginas"], t["citacao"][:70]) for t in r.trechos]
