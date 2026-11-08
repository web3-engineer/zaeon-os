# research-engine/tests/test_engine.py — sugestão saneada: referências só do chamador, enums lenientes.
from models import ReferenceInput, SaidaModelo, SuggestRequest
from engine import gerar_sugestao, montar_resposta
from tests.fakes import SAIDA_OK, resp

REFS = [
    ReferenceInput(source="PubMed", title="Anthocyanin biosynthesis in Phalaenopsis",
                   authors="Chen, L. et al.", year=2021, doi="10.1016/j.scienta.2021.110234",
                   snippet="Anthocyanin accumulation in Phalaenopsis petals is regulated by light."),
    ReferenceInput(source="arxiv", title="Plant bioacoustics: a review", year="2020"),
]


def _saida(**kw) -> SaidaModelo:
    return SaidaModelo.model_validate({**SAIDA_OK, **kw})


def test_sem_referencias_resposta_vazia_e_marcada():
    req = SuggestRequest(topic="orquídeas", level="phd")
    r, citadas = montar_resposta(_saida(citadas=[1, 2]), req)  # modelo "citou" o que não existe
    assert r.references == [] and citadas == []
    assert r.references_status == "ausentes"
    assert r.inline_citation is None


def test_referencias_so_as_fornecidas_e_citadas():
    req = SuggestRequest(topic="orquídeas", level="phd", references=REFS)
    r, citadas = montar_resposta(_saida(citadas=[2, 9, 2, 0, -1]), req)
    assert citadas == [2]
    assert [x.title for x in r.references] == ["Plant bioacoustics: a review"]
    assert r.references[0].source == "arXiv"  # normalizado
    assert r.references_status == "fornecidas"


def test_fonte_desconhecida_vira_outro():
    assert ReferenceInput(source="Web of Science", title="x").source == "outro"
    assert ReferenceInput(source="PUBMED", title="x").source == "PubMed"
    assert ReferenceInput(title="x").source == "outro"


def test_tipo_leniente():
    assert _saida(type="pioneira").type == "Pioneira"
    assert _saida(type="exploratoria").type == "Exploratória"
    assert _saida(type="Revolucionária").type is None
    req = SuggestRequest(topic="orquídeas", level="msc")
    r, _ = montar_resposta(_saida(type="Revolucionária"), req)
    assert r.suggestion.type == "Experimental"  # default do nível


def test_gap_score_fora_da_faixa_e_grampeado():
    assert _saida(gap_score=1.7).gap_score == 1.0
    assert _saida(gap_score=-3).gap_score == 0.0
    assert _saida(gap_score="nan?").gap_score == 0.5


def test_inline_citation_so_se_trecho_literal():
    req = SuggestRequest(topic="orquídeas", level="phd", references=REFS)
    ok = _saida(inline_citation={"quote": "regulated by  LIGHT", "ref": 1})
    r, _ = montar_resposta(ok, req)
    assert r.inline_citation and r.inline_citation.source == "PubMed"
    assert r.inline_citation.doi == "10.1016/j.scienta.2021.110234"

    inventada = _saida(inline_citation={"quote": "orchids sing at night", "ref": 1})
    assert montar_resposta(inventada, req)[0].inline_citation is None
    sem_snippet = _saida(inline_citation={"quote": "bioacoustics", "ref": 2})
    assert montar_resposta(sem_snippet, req)[0].inline_citation is None
    fora = _saida(inline_citation={"quote": "regulated by light", "ref": 7})
    assert montar_resposta(fora, req)[0].inline_citation is None


async def test_gerar_sugestao_manda_referencias_numeradas(cliente):
    c = cliente(resp({**SAIDA_OK, "citadas": [1]}))
    req = SuggestRequest(topic="orquídeas", level="phd", references=REFS)
    r = await gerar_sugestao(req)
    msg = c.chamadas[0]["contents"]
    assert "[1] Anthocyanin biosynthesis in Phalaenopsis" in msg
    assert "[2] Plant bioacoustics: a review" in msg
    assert r.citadas == [1] and r.resposta.references[0].doi.startswith("10.1016")


async def test_gerar_sugestao_sem_refs_avisa_o_modelo(cliente):
    c = cliente(resp(SAIDA_OK))
    await gerar_sugestao(SuggestRequest(topic="orquídeas", level="grad"))
    assert "REFERÊNCIAS FORNECIDAS: nenhuma" in c.chamadas[0]["contents"]
