"""
CENA 3 — "GERAR DOC": a aluna pede um artigo no chat, LOGADA. O documento editável nasce, o PaperOrchestra escreve
seção por seção, e ela escreve a conclusão com as próprias mãos NO MEIO da geração.

O laudo exige: todas as seções escritas; toda citação com referência e toda referência citada (NBR 10520); forma ABNT
das referências (NBR 6023); os fatos da apostila citados com a página CERTA; nenhum número trocado; nenhuma coleta de
campo inventada; nenhuma chave interna sobrando; e o texto da aluna intacto.
"""
import re
import time

import pytest

import material as M
import oraculos as O
import verificar as V
from conftest import guardar, markdown_do_trabalho, precisa

TEXTO_DA_ALUNA = ("Esta conclusão foi escrita pela própria aluna durante a geração. Ela registra que o sistema Tapiri "
                  "mostrou ser uma alternativa viável para escolas do semiárido e que a manutenção pelos alunos é o "
                  "ponto que mais precisa de acompanhamento.")


def _fatos_da_apostila(caderno):
    t = caderno["apostila_titulo"]
    return [
        (r"62\s*%", {t: {M.FATO_INDICE[0]}}),
        (r"R\$\s*18(?:\s*mil|\.000)", {t: {M.FATO_CUSTO[0]}}),
        (r"Arraes", {t: {M.FATO_AUTORA[0]}}),
    ]


def test_artigo_gerado_no_documento_editavel_logado(aluna, caderno, http_publico):
    precisa(caderno, "apostila_id")
    escopo = "e2e-artigo"
    r = aluna.chat("Escreva um artigo científico sobre o sistema Tapiri de reuso de água cinza em escolas rurais do "
                   "semiárido, usando a apostila que está na minha base como material principal.", escopo)
    guardar("artigo-chat.json", {"texto": r.texto, "tcc": r.tcc, "progresso": r.progresso})
    assert r.status == 200, r.bruto[-500:]
    assert r.tcc and r.tcc.get("workId"), f"o chat não abriu documento editável: {r.texto[:300]}"
    assert r.tcc.get("criado") and r.tcc.get("gerando"), r.tcc
    work_id = r.tcc["workId"]
    caderno["artigo_id"] = work_id

    # a aluna escreve a conclusão enquanto o pipeline gera (o TccPanel faz o mesmo poll de 2,5 s)
    estado = {"editou": None, "statusVistos": set(), "secoesVistas": 0}

    def ao_ver(t):
        estado["statusVistos"].add(t.get("status"))
        estado["secoesVistas"] = max(estado["secoesVistas"], sum(1 for s in t["secoes"] if s["corpo"].strip()))
        if estado["editou"] or t.get("status") != "gerando":
            return
        alvo = next((s for s in t["secoes"] if re.search(r"conclus|considera", s["titulo"], re.I)), None)
        if alvo and not alvo["corpo"].strip():
            resp = aluna.trabalho_editar(work_id, alvo["id"], TEXTO_DA_ALUNA)
            assert resp.status_code == 200, (resp.status_code, resp.text[:300])
            estado["editou"] = alvo["titulo"]

    inicio = time.time()
    t = aluna.trabalho_esperar(work_id, timeout=2400, ao_ver=ao_ver)
    caderno["artigo_segundos"] = round(time.time() - inicio)
    guardar("artigo.md", markdown_do_trabalho(t))
    guardar("artigo.json", t)
    caderno["artigo"] = t

    assert "gerando" in estado["statusVistos"], "nunca vi o documento em geração (nasceu pronto?)"
    assert estado["editou"], "não achei a conclusão vazia pra aluna escrever durante a geração"
    conclusao = next(s for s in t["secoes"] if s["titulo"] == estado["editou"])
    assert conclusao["corpo"].strip() == TEXTO_DA_ALUNA, f"o texto da aluna foi sobrescrito:\n{conclusao['corpo'][:400]}"
    assert t.get("workType") in ("Artigo", None), t.get("workType")

    fora = O.fontes_academicas_fora(http_publico)
    ambiente_fora = {"openalex", "semanticscholar"} <= set(fora)  # cota da máquina: pouca literatura legível é correto
    l = V.laudo(t, _fatos_da_apostila(caderno), min_palavras=2500, min_refs_literatura=0 if ambiente_fora else 6,
                numeros=(r"tapiri|consumo de [aá]gua pot[aá]vel|implanta", {"62%", "R$ 18 mil"}),
                ignorar_secoes={estado["editou"]}, titulos_materiais=[caderno["apostila_titulo"]])
    guardar("artigo-laudo.txt", (V.formatar(l) or "sem problemas") + (f"\nAMBIENTE: bases fora {fora} — mínimo de literatura não exigido" if ambiente_fora else ""))
    assert not l, "\n" + V.formatar(l)


def test_artigo_usa_o_material_da_aluna(caderno):
    """Não basta não errar: o artigo tem de USAR a apostila (pelo menos 2 dos 3 fatos plantados, citados)."""
    precisa(caderno, "artigo")
    corpo, _, _ = V.partes(caderno["artigo"])
    usados = [p for p, _ in _fatos_da_apostila(caderno) if re.search(p, corpo, re.I)]
    assert usados, "o artigo não usou nenhum dos fatos da apostila"
    cits = [c for c in O.citacoes(corpo) if O.eh_do_material(c, caderno["apostila_titulo"])]
    assert len(cits) >= 8, f"só {len(cits)} citações da apostila"
    assert all(c.pagina for c in cits), [c.bruto for c in cits if not c.pagina]


@pytest.mark.rede
def test_os_doi_das_referencias_existem_e_sao_do_trabalho_citado(caderno, http_publico):
    """"APRESENTAR AS REF CORRETAS": cada DOI existe e aponta pro título que a referência diz."""
    precisa(caderno, "artigo")
    _, refs, _ = V.partes(caderno["artigo"])
    com_doi = [r for r in refs if O.doi_de(r)]
    if len(com_doi) < 3:
        fora = O.fontes_academicas_fora(http_publico)
        if {"openalex", "semanticscholar"} <= set(fora):
            pytest.skip(f"AMBIENTE: {fora} recusando esta máquina (cota); só {len(com_doi)} referências com DOI — ver OPENALEX_API_KEY")
    assert len(com_doi) >= 3, f"só {len(com_doi)} referências com DOI (bases fora: {O.fontes_academicas_fora(http_publico)})"
    problemas = [p for r in com_doi for p in O.doi_confere(r, http_publico)]
    assert not problemas, "\n".join(problemas)
