"""
Normas além da ABNT — VANCOUVER (ICMJE, área da saúde) e APA 7ª ed. (trabalho de estudante).

O motor ABNT (formatter.py) continua sendo o padrão. Aqui ficam só as diferenças de cada norma:
página (margens, entrelinha), folha de rosto, títulos de seção e — o principal — as REFERÊNCIAS:
  - Vancouver: lista NUMERADA na ordem de citação ("1. Silva AB, Souza C. Título. Revista. 2020;…");
  - APA: lista em ordem ALFABÉTICA com recuo deslocado ("Silva, A. B., & Souza, C. (2020). Título. *Revista*.").
As chamadas no texto ([1] ou (Silva, 2020)) já chegam convertidas pelo app (lib/export/citacoes.ts).
Figura, tabela/quadro, ênfase (**negrito**/*itálico*) e parágrafos vêm do motor ABNT (mesmos blocos).
"""
import io
import re
from datetime import date

from docx import Document
from docx.shared import Pt, Cm
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_LINE_SPACING, WD_BREAK

from models import DocumentPayload
import formatter as F

STYLES = ("vancouver", "apa", "peca")

# ── regras por norma ─────────────────────────────────────────────
REGRAS = {
    "vancouver": {"margem_cm": 2.5, "entrelinha": 1.5, "recuo_cm": 1.25, "alinhamento": WD_ALIGN_PARAGRAPH.JUSTIFY},
    # APA 7: 1 polegada, espaço duplo, recuo de 0,5 pol., alinhado à esquerda (margem direita irregular)
    "apa": {"margem_cm": 2.54, "entrelinha": 2.0, "recuo_cm": 1.27, "alinhamento": WD_ALIGN_PARAGRAPH.LEFT},
    # #873 PR 4 · PEÇA JURÍDICA (petição, contrato, procuração…): sem capa, folha de rosto nem resumo — o título e as
    # partes da peça, justificado, entrelinha 1,5 e recuo de parágrafo de 2,5 cm (o costume do foro)
    "peca": {"margem_cm": 2.5, "entrelinha": 1.5, "recuo_cm": 2.5, "alinhamento": WD_ALIGN_PARAGRAPH.JUSTIFY},
}
FONTE_PT = 12


def build_styled_document(payload: DocumentPayload) -> bytes:
    style = payload.style
    if style not in STYLES:
        raise ValueError(f"norma desconhecida: {style}")
    r = REGRAS[style]
    font = payload.font_choice or "Times New Roman"
    doc = Document()
    for s in doc.sections:
        s.top_margin = s.bottom_margin = s.left_margin = s.right_margin = Cm(r["margem_cm"])
        s.page_height, s.page_width = Cm(29.7), Cm(21.0)
    st = doc.styles["Normal"]
    st.font.name, st.font.size = font, Pt(FONTE_PT)
    st.paragraph_format.space_after = Pt(0)

    if style == "peca":
        _paragrafo_titulo(doc, payload.title, font, r)
    else:
        _folha_de_rosto(doc, payload, font, style)
        _quebra(doc)
        _resumo(doc, payload, font, style)

    if style == "apa":
        _quebra(doc)
        _paragrafo_titulo(doc, payload.title, font, r)  # APA repete o título no começo do texto

    counters = {"figura": 0, "year": payload.cover.year if payload.cover else None}
    for sec in payload.sections:
        if (sec.type or "").lower() == "referencias":
            continue  # a lista vem dos campos estruturados (abaixo), já na ordem da norma
        _titulo(doc, sec.title, font, style, nivel=1)
        _corpo(doc, sec.content, font, r, counters)
        for sub in sec.subsections:
            _titulo(doc, sub.title, font, style, nivel=2)
            _corpo(doc, sub.content, font, r, counters)

    if payload.references:
        if style == "apa":
            _quebra(doc)
        _referencias(doc, payload, font, style, r)

    buf = io.BytesIO()
    doc.save(buf)
    return buf.getvalue()


# ── blocos de página ─────────────────────────────────────────────
def _quebra(doc):
    doc.add_paragraph().add_run().add_break(WD_BREAK.PAGE)


def _linha(doc, texto, font, *, bold=False, italic=False, center=True, space_before=0, size=FONTE_PT):
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER if center else WD_ALIGN_PARAGRAPH.LEFT
    p.paragraph_format.space_before = Pt(space_before)
    run = p.add_run(texto)
    run.font.name, run.font.size, run.bold, run.italic = font, Pt(size), bold, italic
    return p


def _folha_de_rosto(doc, payload, font, style):
    c = payload.cover
    _linha(doc, payload.title, font, bold=True, space_before=144)
    _linha(doc, "", font)
    for t in [c.author, c.institution, c.course, (f"Orientador(a): {c.advisor}" if c.advisor else "")]:
        if t and t.strip():
            _linha(doc, t.strip(), font)
    data = c.year if style == "vancouver" else (c.year or str(date.today().year))
    rodape = ", ".join([x for x in [c.city.strip() if c.city else "", data] if x])
    if rodape:
        _linha(doc, rodape, font, space_before=24)


def _resumo(doc, payload, font, style):
    _linha(doc, "Resumo", font, bold=True)
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY if style == "vancouver" else WD_ALIGN_PARAGRAPH.LEFT
    p.paragraph_format.line_spacing = 1.0 if style == "vancouver" else 2.0
    F._add_runs(p, F._one_line(payload.resumo or ""), font, FONTE_PT)
    if payload.palavras_chave:
        k = doc.add_paragraph()
        k.paragraph_format.space_before = Pt(6)
        if style == "apa":
            k.paragraph_format.first_line_indent = Cm(1.27)
        lab = k.add_run("Palavras-chave: " if style == "apa" else "Descritores: ")
        lab.italic, lab.bold = style == "apa", style == "vancouver"
        lab.font.name, lab.font.size = font, Pt(FONTE_PT)
        t = k.add_run(", ".join(payload.palavras_chave) if style == "apa" else "; ".join(payload.palavras_chave) + ".")
        t.font.name, t.font.size = font, Pt(FONTE_PT)
    if payload.abstract and payload.abstract.strip():
        _linha(doc, "Abstract", font, bold=True, space_before=18)
        a = doc.add_paragraph()
        a.alignment = p.alignment
        F._add_runs(a, F._one_line(payload.abstract), font, FONTE_PT)


def _paragrafo_titulo(doc, titulo, font, r):
    p = _linha(doc, titulo, font, bold=True)
    p.paragraph_format.line_spacing = r["entrelinha"]


def _sem_numero(titulo: str) -> str:
    """As seções chegam numeradas/maiúsculas do ABNT ("1 INTRODUÇÃO"): nas outras normas, sem número e em caixa de título."""
    t = re.sub(r"^\s*\d+(\.\d+)*\s+", "", titulo or "").strip()
    if t.isupper():
        t = t.capitalize()
    return t


def _titulo(doc, titulo, font, style, nivel):
    texto = _sem_numero(titulo)
    if style == "peca":
        # a peça mantém a caixa das partes ("DOS FATOS", "DOS PEDIDOS"); parte sem título não vira linha vazia
        texto = re.sub(r"^\s*\d+(\.\d+)*\s+", "", titulo or "").strip()
        if not texto:
            return
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(12)
    p.paragraph_format.space_after = Pt(6)
    p.paragraph_format.keep_with_next = True
    # APA: nível 1 = negrito centralizado; nível 2 = negrito à esquerda. Vancouver: negrito à esquerda (2º itálico)
    if style == "apa" and nivel == 1:
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = p.add_run(texto)
    run.font.name, run.font.size, run.bold = font, Pt(FONTE_PT), True
    if style == "vancouver" and nivel == 2:
        run.italic, run.bold = True, False


def _corpo(doc, conteudo, font, r, counters):
    for bloco in F._normalize_blocks(conteudo or ""):
        if F._is_table_block(bloco):
            F._add_table_block(doc, bloco, font, counters)
            continue
        if F._is_figure(bloco):
            F._add_figure(doc, bloco, font, counters)
            continue
        texto = F._one_line(bloco)
        if F._is_long_quote(texto):
            # citação em bloco (APA: 40+ palavras; Vancouver segue o mesmo recuo): recuo à esquerda, sem aspas
            p = doc.add_paragraph()
            p.paragraph_format.left_indent = Cm(1.27)
            p.paragraph_format.line_spacing = r["entrelinha"]
            F._add_runs(p, F._strip_quotes(texto), font, FONTE_PT)
            continue
        p = doc.add_paragraph()
        p.alignment = r["alinhamento"]
        p.paragraph_format.first_line_indent = Cm(r["recuo_cm"])
        p.paragraph_format.line_spacing_rule = WD_LINE_SPACING.MULTIPLE
        p.paragraph_format.line_spacing = r["entrelinha"]
        F._add_runs(p, texto, font, FONTE_PT)


# ── referências ─────────────────────────────────────────────────
_PARTICULAS = {"da", "de", "do", "das", "dos", "e", "van", "von", "der", "del", "la"}


def partes_do_nome(autor: str):
    """("Silva", ["Ana", "Beatriz"]) a partir de "SILVA, Ana Beatriz", "Silva, A. B." ou "Ana Beatriz Silva"."""
    a = re.sub(r"\s+", " ", (autor or "").strip())
    if not a:
        return "", []
    if "," in a:
        sob, _, nomes = a.partition(",")
        prenomes = [n for n in re.split(r"[\s.]+", nomes) if n]
    else:
        tokens = a.split(" ")
        sob, prenomes = tokens[-1], tokens[:-1]
    sob = sob.strip()
    if sob.isupper() and len(sob) > 1:
        sob = " ".join(w.capitalize() if w.lower() not in _PARTICULAS else w.lower() for w in sob.split(" "))
    return sob, [p for p in prenomes if p.lower() not in _PARTICULAS]


def autor_vancouver(autor: str) -> str:
    sob, prenomes = partes_do_nome(autor)
    return (sob + " " + "".join(p[0].upper() for p in prenomes)).strip()


def autor_apa(autor: str) -> str:
    sob, prenomes = partes_do_nome(autor)
    iniciais = " ".join(p[0].upper() + "." for p in prenomes)
    return f"{sob}, {iniciais}".strip().rstrip(",")


def _doi_url(ref) -> str:
    if ref.doi:
        d = re.sub(r"^https?://(dx\.)?doi\.org/", "", ref.doi.strip())
        return f"https://doi.org/{d}"
    return (ref.url or "").strip()


def ref_vancouver(ref) -> str:
    """ICMJE: até 6 autores, depois "et al."; "Título. Revista. Ano." + doi/url."""
    if not ref.title and ref.text:
        return ref.text.strip()
    autores = [autor_vancouver(a) for a in ref.authors if a.strip()]
    if len(autores) > 6:
        autores = autores[:6] + ["et al"]
    partes = []
    if autores:
        partes.append(", ".join(autores) + ".")
    if ref.title:
        partes.append(ref.title.strip().rstrip(".") + ".")
    if ref.venue:
        partes.append(ref.venue.strip().rstrip(".") + ".")
    if ref.year:
        partes.append(f"{ref.year}.")
    link = _doi_url(ref)
    if link:
        partes.append(f"doi:{ref.doi.strip()}" if ref.doi else f"Disponível em: {link}")
    return " ".join(partes)


def ref_apa(ref):
    """[(trecho, itálico)] — APA 7: "Silva, A. B., & Souza, C. (2020). Título. *Revista*. https://doi.org/…"."""
    if not ref.title and ref.text:
        return [(ref.text.strip(), False)]
    autores = [autor_apa(a) for a in ref.authors if a.strip()]
    if len(autores) > 20:
        autores = autores[:19] + ["…", autores[-1]]
    if len(autores) == 1:
        quem = autores[0]
    elif autores:
        quem = ", ".join(autores[:-1]) + ", & " + autores[-1]
    else:
        quem = ""
    ano = f"({ref.year})." if ref.year else "(s.d.)."
    out = []
    if quem:
        out.append((quem + (" " if quem.endswith(".") else ". "), False))
    out.append((ano + " ", False))
    titulo = (ref.title or "").strip().rstrip(".")
    if ref.venue:
        out.append((titulo + ". ", False))
        out.append((ref.venue.strip().rstrip("."), True))
        out.append((".", False))
    else:
        out.append((titulo, True))  # livro/documento sem periódico: o título vai em itálico
        out.append((".", False))
    link = _doi_url(ref)
    if link:
        out.append((" " + link, False))
    return out


def _chave_apa(ref) -> str:
    sob = partes_do_nome(ref.authors[0])[0] if ref.authors else (ref.title or ref.text or "")
    return sob.lower()


def _referencias(doc, payload, font, style, r):
    _linha(doc, "Referências", font, bold=True, center=(style == "apa"), space_before=12)
    refs = payload.references
    if style == "apa":
        refs = sorted(refs, key=_chave_apa)
    for i, ref in enumerate(refs, start=1):
        p = doc.add_paragraph()
        p.paragraph_format.line_spacing = r["entrelinha"] if style == "apa" else 1.0
        p.paragraph_format.space_after = Pt(0 if style == "apa" else 6)
        if style == "apa":
            # recuo deslocado (hanging indent) de 0,5 pol.
            p.paragraph_format.left_indent = Cm(1.27)
            p.paragraph_format.first_line_indent = Cm(-1.27)
            for trecho, italico in ref_apa(ref):
                run = p.add_run(trecho)
                run.font.name, run.font.size, run.italic = font, Pt(FONTE_PT), italico
        else:
            run = p.add_run(f"{i}. {ref_vancouver(ref)}")
            run.font.name, run.font.size = font, Pt(FONTE_PT)
