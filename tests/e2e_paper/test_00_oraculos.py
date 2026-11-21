"""Os oráculos testados sem infraestrutura: um oráculo que erra faz a suíte inteira mentir."""
import pytest

import material as M
import oraculos as O

pytestmark = pytest.mark.offline


def test_citacoes_autor_data_e_material():
    t = ("Como mostram Silva e Souza (2021), o reuso cresce (COSTA, 2019; LIMA et al., 2020a). "
         "O consumo caiu 62% (Apostila Agua Cinza no Semi…, p. 6) e o custo (APOSTILA, 2020, p. 4).")
    chaves = {c.chave for c in O.citacoes(t)}
    assert {"SILVA|2021", "COSTA|2019", "LIMA|2020a", "APOSTILA|2020"} <= chaves
    mat = [c for c in O.citacoes(t) if c.chave.startswith("T|")]
    assert len(mat) == 1 and mat[0].pagina == "6"


def test_cruzar_acha_orfas_dos_dois_lados():
    texto = "Algo (SILVA, 2020). Outro (SOUZA, 2021). Material (Apostila Agua Cinza no Semi…, p. 2)."
    refs = [
        "SILVA, A. B. Um estudo sobre reuso. **Revista X**, 2020. DOI: 10.1000/abc.",
        "COSTA, C. Nunca citado. **Revista Y**, 2019.",
        "APOSTILA AGUA CINZA NO SEMIARIDO. [referência incompleta: complete autor e ano]",
    ]
    p = O.cruzar(texto, refs)
    assert any("SOUZA, 2021" in x for x in p)          # citação sem referência
    assert any("COSTA, C." in x for x in p)            # referência nunca citada
    assert not any("SILVA" in x or "APOSTILA" in x for x in p)


def test_abnt_forma():
    assert O.abnt_forma("SILVA, A. B.; SOUZA, C. Título do trabalho. **Revista**, 2020. DOI: 10.1590/s0102-311x2020.") == []
    assert any("caixa alta" in x for x in O.abnt_forma("Silva, A. Título. Revista, 2020."))
    assert any("sem ano" in x for x in O.abnt_forma("SILVA, A. Título. **Revista**."))
    assert any("lixo" in x for x in O.abnt_forma("SILVA, A. Título [E3]. **Revista**, 2020."))


def test_titulo_da_referencia_e_similaridade():
    ref = "SILVA, A. B.; SOUZA, C. Greywater reuse in rural schools. **Water Research**, 2020. DOI: 10.1016/j.x.2020."
    assert O.titulo_da_referencia(ref) == "Greywater reuse in rural schools"
    assert O.doi_de(ref) == "10.1016/j.x.2020"
    assert O.similaridade("Greywater reuse in rural schools", "Greywater Reuse in Rural Schools: a review") >= 0.8


def test_trecho_confere_literal_e_pagina():
    pdf = M.texto_pdf(M.apostila_pdf())
    pag, frase = M.FATO_INDICE
    assert O.trecho_confere({"id": "T1", "citacao": frase, "paginas": str(pag)}, pdf) == []
    errado = O.trecho_confere({"id": "T1", "citacao": frase, "paginas": "2"}, pdf)
    assert errado and "página ERRADA" in errado[0]
    parafraseado = O.trecho_confere({"id": "T2", "citacao": "O consumo de água potável nas escolas com Tapiri caiu 62% já no primeiro ano.", "paginas": "6"}, pdf)
    assert parafraseado and "NÃO é literal" in parafraseado[0]


def test_apostila_tem_os_fatos_nas_paginas_certas():
    pdf = M.texto_pdf(M.apostila_pdf())
    assert len(pdf.paginas) == 8
    for pag, frase in (M.FATO_AUTORA, M.FATO_INDICE, M.FATO_CUSTO):
        assert pdf.pagina_de(frase) == [pag], frase
    assert [p for p in range(1, 9) if M.TERMO_RECORRENTE in M.normalizar(pdf.paginas[p - 1])] == list(M.PAGINAS_DO_TERMO)


def test_fato_citado_com_pagina():
    titulo = "Apostila Agua Cinza no Semiarido"
    certo = "O consumo caiu 62% no primeiro ano (Apostila Agua Cinza no Semi…, p. 6)."
    errado = "O consumo caiu 62% no primeiro ano (Apostila Agua Cinza no Semi…, p. 2)."
    sem = "O consumo caiu 62% no primeiro ano."
    verdade = {titulo: {6}}
    assert O.fato_citado_com_pagina(certo, r"62\s*%", verdade) == []
    assert "devia ser" in O.fato_citado_com_pagina(errado, r"62\s*%", verdade)[0]
    assert "sem citar" in O.fato_citado_com_pagina(sem, r"62\s*%", verdade)[0]
    # dois materiais: citar o artigo da aluna na página onde ELE tem o fato também vale
    dois = {titulo: {6}, "Artigo Tapiri da aluna": {3}}
    assert O.fato_citado_com_pagina("Caiu 62% (Artigo Tapiri da aluna, p. 3).", r"62\s*%", dois) == []
    assert O.fato_citado_com_pagina("Caiu 62% (Artigo Tapiri da aluna, p. 1).", r"62\s*%", dois)
    # fato do material atribuído à literatura: erro
    assert "sem citar o material (cita" in O.fato_citado_com_pagina("Caiu 62% (SILVA, 2020).", r"62\s*%", verdade)[0]


def test_numeros_fieis_e_sobras_e_metodo():
    assert O.numeros_fieis("Com o Tapiri o consumo caiu 62%.", r"tapiri", {"62%"}) == []
    assert O.numeros_fieis("Com o Tapiri o consumo caiu 65%.", r"tapiri", {"62%"})
    assert O.sobras("texto [E3] e [[T1]]") and not O.sobras("texto limpo (SILVA, 2020).")
    assert O.sobras("| Artigos [E1-E7] | x |")  # caso real do TCC (nov/2026)
    assert O.metodo_inventado("Foram realizadas entrevistas semiestruturadas com 12 participantes.")
    assert not O.metodo_inventado("Trata-se de revisão de literatura.")


def test_documento_pdf_ida_e_volta():
    secoes = [{"titulo": "INTRODUÇÃO", "corpo": "O consumo caiu 62% no primeiro ano.\n\nSegundo parágrafo & símbolo <x>."},
              {"titulo": "REFERÊNCIAS", "corpo": "SILVA, A. Título. **Revista**, 2020."}]
    pdf = M.texto_pdf(M.documento_pdf("Meu artigo", secoes))
    assert "62%" in pdf.todo() and "& símbolo <x>" in pdf.todo()


def test_citacao_de_varios_autores_e_uma_so():
    """Caso real do E2E (nov/2026): o oráculo quebrava a citação de 3 autores em 3 e acusava 22 falsos erros."""
    t = "Texto (NOGUEIRA; FIGUEIRÊDO; SOUZA, 2025) e (MISHRA et al., 2021; WANG; ZHANG, 2015) e (WU; HE, 2024)."
    chaves = [c.chave for c in O.citacoes(t)]
    assert chaves == ["NOGUEIRA|2025", "MISHRA|2021", "WANG|2015", "WU|2024"]
    refs = ["NOGUEIRA, L. C. B.; FIGUEIRÊDO, E. A. D.; SOUZA, W. Escassez de água. **Economia Aplicada**, 2025. DOI: 10.11606/x.",
            "MISHRA, B. K.; KUMAR, P. et al. Water Security. **Water**, 2021. DOI: 10.3390/w13040490.",
            "WANG, G.; ZHANG, C. Water security in China. **Sci. Sin.**, 2015.",
            "WU, S.; HE, B. Rural sanitation. **Sustainability**, 2024."]
    assert O.cruzar(t, refs) == []


def test_valor_igual_em_forma_diferente_e_fiel():
    assert O.valor("R$ 18 mil") == O.valor("R$ 18.000") == O.valor("R$ 18.000,00") == 18000
    assert O.valor("62%") == O.valor("62,0 %") == 62
    assert O.numeros_fieis("O Tapiri custou R$ 18.000 por escola.", r"tapiri", {"R$ 18 mil"}) == []
    assert O.numeros_fieis("O Tapiri custou R$ 25.000 por escola.", r"tapiri", {"R$ 18 mil"})


def test_titulo_inventado_do_material():
    reais = ["Apostila Agua Cinza no Semiarido"]
    assert O.titulo_inventado('A fonte é a "Apostila Técnica do Sistema Tapiri", que…', reais)
    assert not O.titulo_inventado('A fonte é a "Apostila Agua Cinza no Semiarido".', reais)
    assert not O.titulo_inventado('O termo "biofiltro de juncos" aparece.', reais)


def test_autor_de_nome_unico():
    """Caso real do TCC (nov/2026): arXiv com autor de nome único ("Uzma")."""
    ref = "UZMA; CHOLET, F.; QUINN, D. et al. EnviroPiNet: A Physics-Guided AI Model. **arXiv**, 2025. Disponível em: https://arxiv.org/abs/1."
    assert O.abnt_forma(ref) == []
    assert O.cruzar("Modelo (UZMA et al., 2025).", [ref]) == []
