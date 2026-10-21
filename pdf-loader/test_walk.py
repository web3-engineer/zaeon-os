"""
Testes do _walk (JSON do opendataloader → paragraphs + blocks). O JSON aqui tem o formato
real do opendataloader-pdf 2.5 (gerado de um PDF de teste): lista em "list items", sublista
dentro de kids do item, tabela em rows → cells → kids.
"""
from main import _walk


def _item(texto, page=2, kids=None):
    return {"type": "list item", "page number": page, "bounding box": [80, 700, 480, 714],
            "content": texto, "kids": kids or []}


DOC = {
    "kids": [
        {"type": "heading", "heading level": 1, "page number": 1, "bounding box": [72, 636, 364, 663],
         "content": "Apostila de Biologia Celular"},
        {"type": "paragraph", "page number": 2, "bounding box": [72, 759, 116, 773], "content": "Sumario"},
        {"type": "list", "level": "1", "page number": 2, "numbering style": "unordered",
         "number of list items": 2, "list items": [
             _item("- Capitulo 1 - Introducao Esta apostila apresenta a celula e suas organelas.", kids=[
                 {"type": "list", "page number": 2, "list items": [
                     _item("- Secao 1.1 - Organelas membranosas do citoplasma."),
                     _item("- Secao 1.2 - Citoesqueleto e movimento celular.", page=3),
                 ]},
             ]),
             _item("- Capitulo 2 - Membrana plasmatica e transporte entre os meios.", page=3),
         ]},
        {"type": "paragraph", "page number": 3, "content": "A celula e a unidade basica da vida."},
    ]
}


def test_itens_de_lista_viram_blocos_na_ordem_com_pagina():
    paragraphs, blocks = _walk(DOC)
    assert [(b["type"], b["page"], b["text"]) for b in blocks] == [
        ("heading", 1, "Apostila de Biologia Celular"),
        ("paragraph", 2, "Sumario"),
        ("paragraph", 2, "- Capitulo 1 - Introducao Esta apostila apresenta a celula e suas organelas."),
        ("paragraph", 2, "- Secao 1.1 - Organelas membranosas do citoplasma."),
        ("paragraph", 3, "- Secao 1.2 - Citoesqueleto e movimento celular."),
        ("paragraph", 3, "- Capitulo 2 - Membrana plasmatica e transporte entre os meios."),
        ("paragraph", 3, "A celula e a unidade basica da vida."),
    ]
    assert blocks[0]["level"] == 1
    assert [p["idx"] for p in paragraphs] == list(range(7))
    assert len({p["text"] for p in paragraphs}) == 7  # sublista não duplica texto do item pai


def test_tabela_com_lista_numa_celula_nao_vaza_pros_blocos():
    tabela = {"type": "table", "page number": 1, "rows": [
        {"cells": [{"kids": [{"type": "paragraph", "content": "a"}]},
                   {"kids": [{"type": "list", "list items": [_item("- b")]}]}]},
    ]}
    _, blocks = _walk({"kids": [tabela]})
    assert blocks == [{"type": "table", "page": 1, "bbox": None, "text": "| a | - b |"}]
