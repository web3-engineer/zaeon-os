# research-engine/tests/test_models.py
import pytest
from pydantic import ValidationError
from models import SuggestRequest, SuggestResponse, SuggestionItem, RefItem, InlineCitation


def test_suggest_request_valid():
    req = SuggestRequest(topic="orquídeas rosas", level="phd")
    assert req.topic == "orquídeas rosas"
    assert req.exclude_titles == []


def test_suggest_request_empty_topic_fails():
    with pytest.raises(ValidationError):
        SuggestRequest(topic="", level="grad")


def test_suggest_request_invalid_level_fails():
    with pytest.raises(ValidationError):
        SuggestRequest(topic="orquídeas", level="invalid")


def test_suggest_request_exclude_titles():
    req = SuggestRequest(topic="algo", level="msc", exclude_titles=["Título A"])
    assert req.exclude_titles == ["Título A"]


def test_suggest_response_valid():
    resp = SuggestResponse(
        suggestion=SuggestionItem(
            type="Pioneira",
            title="Título pioneiro",
            rationale="Lacuna real identificada.",
            novelty_angle="Nunca cruzado antes.",
            gap_score=0.82,
        ),
        references=[
            RefItem(
                source="PubMed",
                title="Example paper",
                authors="Smith, J. et al.",
                year="2022",
                venue="Nature Plants",
                doi="10.1234/np.2022.01",
            )
        ],
    )
    assert resp.suggestion.type == "Pioneira"
    assert len(resp.references) == 1


def test_gap_score_out_of_range_fails():
    with pytest.raises(ValidationError):
        SuggestionItem(
            type="Exploratória",
            title="T",
            rationale="R",
            novelty_angle="N",
            gap_score=1.5,
        )


def test_gap_score_below_zero_fails():
    with pytest.raises(ValidationError):
        SuggestionItem(
            type="Exploratória",
            title="T",
            rationale="R",
            novelty_angle="N",
            gap_score=-0.1,
        )


def test_ref_item_unknown_source_is_lenient():
    # Antes derrubava a resposta inteira (422); agora vira "outro".
    ref = RefItem(source="Web", title="T", authors="A", year="2022", venue="V")
    assert ref.source == "outro"


def test_suggest_request_whitespace_topic_fails():
    with pytest.raises(ValidationError):
        SuggestRequest(topic="   ", level="grad")


def test_suggest_request_references_optional():
    req = SuggestRequest(topic="algo", level="phd", references=[{"title": "Paper real", "year": 2020}])
    assert req.references[0].year == "2020" and req.references[0].source == "outro"
    assert SuggestRequest(topic="algo", level="phd").references is None


def test_suggest_response_default_status():
    resp = SuggestResponse(
        suggestion=SuggestionItem(type="Pioneira", title="T", rationale="R", novelty_angle="N", gap_score=0.9)
    )
    assert resp.references == [] and resp.references_status == "ausentes"
