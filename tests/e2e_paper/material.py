"""
tests/e2e_paper/material.py — o MATERIAL DO ALUNO da suíte, com a verdade conhecida.

Uma apostila de 8 páginas sobre um tema plausível (reuso de águas cinzas em escolas rurais do semiárido) com FATOS
PLANTADOS que não existem no mundo — o sistema "Tapiri", a engenheira "Lucinda Prado Arraes", o índice de 62% — em
páginas sabidas. O modelo não tem como acertar de memória: só acerta lendo o material. E o oráculo sabe a resposta.

Também transforma um trabalho gerado (seções do documento editável) num PDF paginado — é assim que "um trabalho é feito
a partir do outro": o aluno guarda o artigo na base e pede o TCC a partir dele.
"""
from __future__ import annotations

import io
import re
from dataclasses import dataclass

from pypdf import PdfReader
from reportlab.lib.enums import TA_JUSTIFY
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.platypus import PageBreak, Paragraph, SimpleDocTemplate, Spacer

TITULO_APOSTILA = "Apostila Agua Cinza no Semiarido"

# Os fatos plantados: (página, frase literal). A frase entra INTEIRA naquela página.
FATO_AUTORA = (2, "O sistema Tapiri foi descrito pela engenheira Lucinda Prado Arraes em 2019, a partir de experiências em escolas do sertão de Pernambuco.")
FATO_INDICE = (6, "Nas escolas que adotaram o sistema Tapiri, o consumo de água potável caiu 62% no primeiro ano de operação.")
FATO_CUSTO = (4, "O custo de implantação do sistema Tapiri ficou em torno de R$ 18 mil por escola, incluindo a mão de obra local.")
# O termo que aparece em EXATAMENTE estas páginas (o teste do "todas as vezes")
TERMO_RECORRENTE = "biofiltro de juncos"
PAGINAS_DO_TERMO = (3, 5, 7)
FRASES_DO_TERMO = {
    3: "O biofiltro de juncos é a segunda etapa do sistema Tapiri e retém a matéria orgânica dissolvida na água cinza.",
    5: "A manutenção do biofiltro de juncos exige a poda das plantas a cada três meses, tarefa assumida pelos próprios alunos.",
    7: "Em períodos de seca prolongada, o biofiltro de juncos precisa de uma reserva mínima de água para não perder as raízes.",
}

PREENCHIMENTO = [
    "A escassez hídrica no semiárido brasileiro torna o reuso de água uma estratégia relevante para a gestão escolar. "
    "Escolas rurais frequentemente dependem de cisternas e de abastecimento por carro-pipa, o que encarece a rotina e "
    "expõe a comunidade à irregularidade do fornecimento.",
    "As águas cinzas são as águas servidas de pias, chuveiros e lavatórios, sem contribuição de vasos sanitários. Por "
    "terem menor carga de patógenos que o esgoto doméstico, podem ser tratadas por sistemas simples e reutilizadas na "
    "irrigação de hortas e na limpeza de áreas externas.",
    "A participação da comunidade escolar é apontada como condição para a continuidade desses sistemas. Quando alunos e "
    "funcionários compreendem o funcionamento das etapas de tratamento, a manutenção deixa de depender de técnicos externos.",
    "O monitoramento da qualidade da água tratada deve considerar turbidez, odor e presença de espuma, indicadores "
    "simples que podem ser observados diariamente pela equipe da escola sem equipamentos de laboratório.",
]


def _estilos():
    s = getSampleStyleSheet()
    corpo = ParagraphStyle("corpo", parent=s["BodyText"], fontName="Helvetica", fontSize=11, leading=15, alignment=TA_JUSTIFY, spaceAfter=10)
    titulo = ParagraphStyle("titulo", parent=s["Heading1"], fontName="Helvetica-Bold", fontSize=15, spaceAfter=12)
    sub = ParagraphStyle("sub", parent=s["Heading2"], fontName="Helvetica-Bold", fontSize=12, spaceAfter=8)
    return corpo, titulo, sub


def apostila_pdf() -> bytes:
    """8 páginas; cada página com um título, 2 parágrafos de preenchimento e os fatos plantados dela."""
    corpo, titulo, sub = _estilos()
    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, title=TITULO_APOSTILA, leftMargin=60, rightMargin=60, topMargin=60, bottomMargin=60)
    els = []
    plantados = {FATO_AUTORA[0]: [FATO_AUTORA[1]], FATO_INDICE[0]: [FATO_INDICE[1]], FATO_CUSTO[0]: [FATO_CUSTO[1]]}
    for p, frase in FRASES_DO_TERMO.items():
        plantados.setdefault(p, []).append(frase)
    for pagina in range(1, 9):
        els.append(Paragraph(f"Capítulo {pagina}" if pagina > 1 else "Água cinza no semiárido: o sistema Tapiri", titulo if pagina == 1 else sub))
        els.append(Paragraph(PREENCHIMENTO[pagina % 4], corpo))
        for frase in plantados.get(pagina, []):
            els.append(Paragraph(frase + " " + PREENCHIMENTO[(pagina + 1) % 4], corpo))
        els.append(Paragraph(PREENCHIMENTO[(pagina + 2) % 4], corpo))
        if pagina < 8:
            els.append(PageBreak())
    doc.build(els)
    return buf.getvalue()


def documento_pdf(titulo: str, secoes: list[dict]) -> bytes:
    """Um trabalho do documento editável (secoes [{titulo, corpo}]) como PDF paginado — o "artigo salvo pelo aluno"."""
    corpo, tit, sub = _estilos()
    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, title=titulo, leftMargin=60, rightMargin=60, topMargin=60, bottomMargin=60)
    els = [Paragraph(_esc(titulo), tit)]
    for s in secoes:
        if not (s.get("corpo") or "").strip():
            continue
        els.append(Paragraph(_esc(s["titulo"]), sub))
        for bloco in re.split(r"\n{2,}", s["corpo"]):
            b = bloco.strip()
            if not b or b.startswith("|"):
                continue  # tabela markdown fica de fora do PDF simples
            b = re.sub(r"^#{1,6}\s*", "", b)
            els.append(Paragraph(_esc(b.replace("\n", " ")), corpo))
        els.append(Spacer(1, 6))
    doc.build(els)
    return buf.getvalue()


def pdf_paginas(titulo: str, paginas: list[list[str]]) -> bytes:
    """Um PDF com o texto de cada página dado (uma lista de parágrafos por página) — página sabida = oráculo."""
    corpo, tit, _ = _estilos()
    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, title=titulo, leftMargin=60, rightMargin=60, topMargin=60, bottomMargin=60)
    els = [Paragraph(_esc(titulo), tit)]
    for i, pars in enumerate(paginas):
        els += [Paragraph(_esc(p), corpo) for p in pars]
        if i < len(paginas) - 1:
            els.append(PageBreak())
    doc.build(els)
    return buf.getvalue()


def _esc(t: str) -> str:
    return t.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("**", "")


# ───────────────────────────── a VERDADE de um PDF (oráculo independente: pypdf, não o leitor da Zaeon) ─────────────────────────────
@dataclass
class TextoPdf:
    paginas: list[str]  # índice 0 = página 1

    def pagina_de(self, trecho: str) -> list[int]:
        """Em que páginas (1-based) o trecho aparece — normalizado (espaço, hífen de quebra, aspas)."""
        alvo = normalizar(trecho)
        return [i + 1 for i, t in enumerate(self.paginas) if alvo and alvo in normalizar(t)]

    def todo(self) -> str:
        return "\n".join(self.paginas)


def texto_pdf(conteudo: bytes) -> TextoPdf:
    r = PdfReader(io.BytesIO(conteudo))
    return TextoPdf([p.extract_text() or "" for p in r.pages])


def normalizar(t: str) -> str:
    import unicodedata
    t = unicodedata.normalize("NFKD", t or "")
    t = "".join(c for c in t if not unicodedata.combining(c)).lower()
    t = re.sub(r"(\w)-\s+(\w)", r"\1\2", t)  # hífen de quebra de linha
    t = re.sub(r"[“”«»\"'’‘]", "", t)
    t = re.sub(r"[–—]", "-", t)
    return re.sub(r"\s+", " ", t).strip()
