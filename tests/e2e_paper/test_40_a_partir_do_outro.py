"""
CENA 4 — UM TRABALHO FEITO A PARTIR DO OUTRO. A aluna salva o artigo da cena 3 como PDF, sobe pra base, acha um
trecho NELE, e pede um TCC a partir do artigo + apostila numa conversa nova.

A verdade agora tem duas fontes: o fato "62%" está na p. 6 da apostila E na página do PDF do artigo onde o artigo o
escreveu (pypdf diz qual). O TCC pode citar qualquer um dos dois — mas com a página certa DAQUELE documento.
"""
import re

import material as M
import oraculos as O
import verificar as V
from conftest import guardar, markdown_do_trabalho, precisa

NOME_ARTIGO = "Artigo Tapiri da aluna.pdf"


def test_artigo_salvo_em_pdf_entra_na_base(aluna, caderno):
    precisa(caderno, "artigo")
    a = caderno["artigo"]
    pdf = M.documento_pdf(a["titulo"], a["secoes"])
    guardar("artigo.pdf", pdf)
    res = aluna.base_enviar(NOME_ARTIGO, pdf)["resultados"][0]
    doc = aluna.base_esperar_pronto(res["documentoId"])
    assert doc["status"] == "pronto", doc
    texto = M.texto_pdf(pdf)
    assert doc["paginas"] == len(texto.paginas), (doc["paginas"], len(texto.paginas))
    caderno.update(artigo_pdf=pdf, artigo_doc_id=res["documentoId"], artigo_doc_titulo=doc["titulo"])


def test_acha_trecho_dentro_do_artigo_salvo(aluna, caderno):
    precisa(caderno, "artigo_pdf")
    pdf_artigo = M.texto_pdf(caderno["artigo_pdf"])
    alvo = next((p for p in (r"62\s*%", r"R\$\s*18(?:\s*mil|\.000)", r"Arraes") if re.search(p, pdf_artigo.todo())), None)
    assert alvo, "o artigo não tem nenhum dos fatos da apostila pra procurar"
    pergunta = {r"62\s*%": "a queda no consumo de água potável", r"R\$\s*18(?:\s*mil|\.000)": "o custo de implantação",
                r"Arraes": "quem descreveu o sistema Tapiri"}[alvo]
    r = aluna.chat(f"Onde o meu artigo sobre o sistema Tapiri fala de {pergunta}? Mostre o trecho do artigo.", "e2e-trechos-artigo")
    guardar("trechos-no-artigo.json", {"texto": r.texto, "trechos": r.trechos})
    assert r.status == 200 and r.answer
    pdfs = {caderno["artigo_doc_id"]: pdf_artigo, caderno["apostila_id"]: M.texto_pdf(caderno["apostila_pdf"])}
    problemas = [p for t in r.trechos for p in O.trecho_confere(t, pdfs.get(t["documentoId"], pdf_artigo))]
    assert not problemas, "\n".join(problemas)
    do_artigo = [t for t in r.trechos if t["documentoId"] == caderno["artigo_doc_id"]]
    assert do_artigo, f"nenhum trecho veio do ARTIGO (vieram de {[t['titulo'] for t in r.trechos]})"
    assert any(re.search(alvo, t["citacao"]) for t in do_artigo), [t["citacao"][:90] for t in do_artigo]


def test_tcc_a_partir_do_artigo(aluna, caderno, http_publico):
    precisa(caderno, "artigo_doc_id")
    r = aluna.chat("Escreva um TCC sobre o sistema Tapiri de reuso de água cinza em escolas rurais do semiárido, a "
                   "partir do meu artigo e da apostila que estão na minha base.", "e2e-tcc")
    guardar("tcc-chat.json", {"texto": r.texto, "tcc": r.tcc})
    assert r.status == 200 and r.tcc and r.tcc.get("workId"), r.texto[:300]
    t = aluna.trabalho_esperar(r.tcc["workId"], timeout=2700)
    guardar("tcc.md", markdown_do_trabalho(t))
    guardar("tcc.json", t)
    caderno["tcc"] = t
    assert t.get("workType") == "TCC", t.get("workType")

    pdf_artigo = M.texto_pdf(caderno["artigo_pdf"])
    ta, tr = caderno["artigo_doc_titulo"], caderno["apostila_titulo"]
    fatos = []
    for padrao, pag_apostila in ((r"62\s*%", M.FATO_INDICE[0]), (r"R\$\s*18(?:\s*mil|\.000)", M.FATO_CUSTO[0]), (r"Arraes", M.FATO_AUTORA[0])):
        no_artigo = {i + 1 for i, p in enumerate(pdf_artigo.paginas) if re.search(padrao, p)}
        fatos.append((padrao, {tr: {pag_apostila}, **({ta: no_artigo} if no_artigo else {})}))
    fora = O.fontes_academicas_fora(http_publico)
    ambiente_fora = {"openalex", "semanticscholar"} <= set(fora)
    l = V.laudo(t, fatos, min_palavras=2700, min_refs_literatura=0 if ambiente_fora else 8,
                numeros=(r"tapiri|consumo de [aá]gua pot[aá]vel|implanta", {"62%", "R$ 18 mil"}),
                titulos_materiais=[ta, tr, caderno["artigo"]["titulo"]])
    guardar("tcc-laudo.txt", (V.formatar(l) or "sem problemas") + (f"\nAMBIENTE: bases fora {fora} — mínimo de literatura não exigido" if ambiente_fora else ""))
    assert not l, "\n" + V.formatar(l)


def test_tcc_cita_o_artigo_de_origem(caderno):
    """É "a partir do outro" de verdade: o TCC cita o artigo da aluna, e o artigo está nas referências."""
    precisa(caderno, "tcc")
    corpo, refs, _ = V.partes(caderno["tcc"])
    cits = [c for c in O.citacoes(corpo) if O.eh_do_material(c, caderno["artigo_doc_titulo"])]
    assert cits, f"o TCC não cita o artigo «{caderno['artigo_doc_titulo']}»"
    assert all(c.pagina for c in cits)
    n_pag = len(M.texto_pdf(caderno["artigo_pdf"]).paginas)
    fora = [c.bruto for c in cits if max(O.paginas_do_rotulo(c.pagina) or {0}) > n_pag]
    assert not fora, f"citação a página que o artigo não tem (ele tem {n_pag}): {fora}"
    pre = M.normalizar(caderno["artigo_doc_titulo"])[:12]
    assert any(M.normalizar(r).startswith(pre) for r in refs), "o artigo não está nas referências do TCC"
