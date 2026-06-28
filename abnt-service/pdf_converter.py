"""
Conversão de .docx para .pdf — ABNT NBR 14724:2011

Estratégia primária : LibreOffice headless (fidelidade máxima, opcional)
Estratégia fallback : ReportLab (puro Python, sem dependências de sistema)

WeasyPrint foi removido: requer GLib/GTK que não existe no macOS por padrão.
"""
import io
import os
import shutil
import subprocess
import tempfile

import abnt_rules as R


# ─────────────────────────────────────────────────────────────────────────────
# Ponto de entrada público
# ─────────────────────────────────────────────────────────────────────────────

def docx_bytes_to_pdf(docx_bytes: bytes, font_choice: str = "Times New Roman") -> bytes:
    """
    Recebe bytes de .docx e retorna bytes de .pdf.
    Tenta LibreOffice primeiro; usa ReportLab como fallback.
    """
    if _libreoffice_available():
        try:
            return _convert_with_libreoffice(docx_bytes)
        except Exception as exc:
            print(f"[pdf_converter] LibreOffice falhou ({exc}), usando ReportLab.")

    return _convert_with_reportlab(docx_bytes, font_choice)


# ─────────────────────────────────────────────────────────────────────────────
# LibreOffice headless
# ─────────────────────────────────────────────────────────────────────────────

def _libreoffice_available() -> bool:
    # macOS: o binário costuma ficar dentro do .app
    mac_path = "/Applications/LibreOffice.app/Contents/MacOS/soffice"
    return (
        shutil.which("libreoffice") is not None
        or shutil.which("soffice") is not None
        or os.path.exists(mac_path)
    )


def _get_libreoffice_cmd() -> str:
    mac_path = "/Applications/LibreOffice.app/Contents/MacOS/soffice"
    if os.path.exists(mac_path):
        return mac_path
    return shutil.which("libreoffice") or shutil.which("soffice") or "libreoffice"


def _convert_with_libreoffice(docx_bytes: bytes) -> bytes:
    with tempfile.TemporaryDirectory() as tmp_dir:
        docx_path = os.path.join(tmp_dir, "document.docx")
        pdf_path  = os.path.join(tmp_dir, "document.pdf")

        with open(docx_path, "wb") as f:
            f.write(docx_bytes)

        # -env:UserInstallation força um perfil gravável e isolado por conversão.
        # Sem isso o soffice headless pode travar quando ~/.config não é gravável
        # (container read-only / HOME inexistente). timeout evita pendurar o worker;
        # se algo falhar, o RuntimeError abaixo cai no fallback ReportLab.
        lo_profile = os.path.join(tmp_dir, "lo_profile")
        result = subprocess.run(
            [_get_libreoffice_cmd(),
             f"-env:UserInstallation=file://{lo_profile}",
             "--headless", "--convert-to", "pdf",
             "--outdir", tmp_dir, docx_path],
            capture_output=True,
            timeout=60,
        )
        if result.returncode != 0:
            raise RuntimeError(result.stderr.decode(errors="replace"))

        with open(pdf_path, "rb") as f:
            return f.read()


# ─────────────────────────────────────────────────────────────────────────────
# ReportLab — geração PDF pura Python conforme ABNT
# ─────────────────────────────────────────────────────────────────────────────

def _convert_with_reportlab(docx_bytes: bytes, font_choice: str = "Times New Roman") -> bytes:
    """
    Lê o .docx gerado pelo formatter.py e produz um PDF com ReportLab
    respeitando todas as regras ABNT NBR 14724:2011.
    """
    from docx import Document as DocxDocument
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.units import cm
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.enums import TA_JUSTIFY, TA_CENTER, TA_LEFT, TA_RIGHT
    from reportlab.platypus import (
        SimpleDocTemplate, Paragraph, Spacer, PageBreak, KeepTogether
    )
    from reportlab.lib import colors
    from reportlab.pdfgen import canvas as rl_canvas

    # Em ReportLab, 1 ponto = 1 unidade (sistema interno em pontos tipográficos)
    pt = 1  # noqa: F841  — 1pt = 1 ReportLab unit

    # ── Fonte ──────────────────────────────────────────────────────────────
    rl_font_name, rl_font_bold = _resolve_reportlab_font(font_choice)

    # ── Página ABNT ────────────────────────────────────────────────────────
    # Margens: esq 3cm, dir 2cm, sup 3cm, inf 2cm
    # O header (numeração) ocupa ~0.8cm do topo; ajustamos topMargin para 2.2cm
    # para o conteúdo ficar abaixo da linha de número de página.
    margin_left   = R.MARGIN_LEFT_CM   * cm   # 3 cm
    margin_right  = R.MARGIN_RIGHT_CM  * cm   # 2 cm
    margin_top    = R.MARGIN_TOP_CM    * cm   # 3 cm (inclui o header)
    margin_bottom = R.MARGIN_BOTTOM_CM * cm   # 2 cm

    buf = io.BytesIO()

    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        leftMargin=margin_left,
        rightMargin=margin_right,
        topMargin=margin_top,
        bottomMargin=margin_bottom,
        title="Zaeon ABNT Document",
    )

    # ── Estilos ────────────────────────────────────────────────────────────
    body_fs    = R.FONT_SIZE_BODY_PT
    quote_fs   = R.FONT_SIZE_QUOTE_PT
    leading_body  = body_fs  * R.LINE_SPACING_BODY   # 12 × 1.5 = 18
    leading_quote = quote_fs * R.LINE_SPACING_QUOTE  # 10 × 1.0 = 10

    # Parágrafo normal — recuo 1,25 cm, entrelinha 1,5
    style_body = ParagraphStyle(
        "ABNTBody",
        fontName=rl_font_name,
        fontSize=body_fs,
        leading=leading_body,
        alignment=TA_JUSTIFY,
        firstLineIndent=R.PARAGRAPH_INDENT_CM * cm,
        spaceAfter=0,
        spaceBefore=0,
    )

    # Título de seção — maiúsculas, negrito, sem recuo
    style_h1 = ParagraphStyle(
        "ABNTH1",
        fontName=rl_font_bold,
        fontSize=body_fs,
        leading=leading_body,
        alignment=TA_LEFT,
        firstLineIndent=0,
        spaceBefore=R.SPACE_BEFORE_TITLE_PT * pt,
        spaceAfter=R.SPACE_AFTER_TITLE_PT  * pt,
    )

    # Subtítulo de seção — maiúsculas, sem negrito, sem recuo
    style_h2 = ParagraphStyle(
        "ABNTH2",
        fontName=rl_font_name,
        fontSize=body_fs,
        leading=leading_body,
        alignment=TA_LEFT,
        firstLineIndent=0,
        spaceBefore=R.SPACE_BEFORE_TITLE_PT * pt,
        spaceAfter=R.SPACE_AFTER_TITLE_PT  * pt,
    )

    # Citação longa — 4 cm recuo esq, fonte 10, entrelinha simples
    style_quote = ParagraphStyle(
        "ABNTQuote",
        fontName=rl_font_name,
        fontSize=quote_fs,
        leading=leading_quote,
        alignment=TA_JUSTIFY,
        leftIndent=R.LONG_QUOTE_INDENT_CM * cm,
        firstLineIndent=0,
        spaceAfter=6 * pt,
        spaceBefore=6 * pt,
    )

    # Referência — sem recuo, entrelinha simples, espaço duplo entre entradas
    style_ref = ParagraphStyle(
        "ABNTRef",
        fontName=rl_font_name,
        fontSize=body_fs,
        leading=body_fs * R.LINE_SPACING_QUOTE,  # simples
        alignment=TA_LEFT,
        firstLineIndent=0,
        spaceAfter=body_fs * pt,  # espaço equivalente a 1 linha em branco
        spaceBefore=0,
    )

    # Centralizado (capa, folha de rosto)
    style_center = ParagraphStyle(
        "ABNTCenter",
        fontName=rl_font_name,
        fontSize=body_fs,
        leading=leading_body,
        alignment=TA_CENTER,
        firstLineIndent=0,
        spaceAfter=0,
        spaceBefore=0,
    )

    style_center_bold = ParagraphStyle(
        "ABNTCenterBold",
        fontName=rl_font_bold,
        fontSize=body_fs,
        leading=leading_body,
        alignment=TA_CENTER,
        firstLineIndent=0,
        spaceAfter=0,
        spaceBefore=0,
    )

    # ── Ler o .docx e converter parágrafos ────────────────────────────────
    src_doc = DocxDocument(io.BytesIO(docx_bytes))
    story   = []

    from docx.enum.text import WD_ALIGN_PARAGRAPH
    from lxml import etree

    def _escape(text: str) -> str:
        return (text
                .replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;"))

    def _has_page_break(para) -> bool:
        """Detecta quebra de página embutida no XML do parágrafo."""
        xml = para._element.xml
        return 'w:type="page"' in xml or "w:type='page'" in xml

    def _effective_bold(para) -> bool:
        """Verifica negrito no run OU no estilo do parágrafo."""
        # Negrito explícito em algum run com texto
        for r in para.runs:
            if r.text.strip() and r.bold:
                return True
        # Negrito herdado do estilo
        try:
            if para.style and para.style.font.bold:
                return True
        except Exception:
            pass
        return False

    def _effective_centered(para) -> bool:
        """Alinhamento centralizado no parágrafo ou no seu estilo."""
        if para.alignment == WD_ALIGN_PARAGRAPH.CENTER:
            return True
        # Quando não está definido no parágrafo (None), verifica o estilo
        if para.alignment is None:
            try:
                st = para.style
                while st:
                    if st.paragraph_format.alignment == WD_ALIGN_PARAGRAPH.CENTER:
                        return True
                    st = st.base_style
            except Exception:
                pass
        return False

    def _is_long_quote_para(para) -> bool:
        try:
            li = para.paragraph_format.left_indent
            return li is not None and li.cm >= 3.5
        except Exception:
            return False

    for para in src_doc.paragraphs:
        # Quebra de página explícita → PageBreak no PDF
        if _has_page_break(para):
            story.append(PageBreak())
            continue

        raw = para.text.strip()
        if not raw:
            story.append(Spacer(1, leading_body * 0.5))
            continue

        txt    = _escape(raw)
        bold   = _effective_bold(para)
        center = _effective_centered(para)
        lq     = _is_long_quote_para(para)

        if lq:
            story.append(Paragraph(txt, style_quote))
        elif bold and center:
            story.append(Paragraph(f"<b>{txt}</b>", style_center_bold))
        elif center:
            story.append(Paragraph(txt, style_center))
        elif bold:
            story.append(Paragraph(f"<b>{txt}</b>", style_h1))
        else:
            story.append(Paragraph(txt, style_body))

    # ── Numeração de páginas ───────────────────────────────────────────────
    def _add_page_number(canv: rl_canvas.Canvas, doc_ref):
        """Callback do ReportLab: imprime o número de página no canto sup. direito."""
        canv.saveState()
        canv.setFont(rl_font_name, body_fs)
        page_num = canv.getPageNumber()
        x = A4[0] - margin_right
        y = A4[1] - margin_top + 0.5 * cm
        canv.drawRightString(x, y, str(page_num))
        canv.restoreState()

    doc.build(
        story,
        onFirstPage=_add_page_number,
        onLaterPages=_add_page_number,
    )

    buf.seek(0)
    return buf.read()


# ─────────────────────────────────────────────────────────────────────────────
# Helpers de fonte
# ─────────────────────────────────────────────────────────────────────────────

def _resolve_reportlab_font(font_choice: str) -> tuple[str, str]:
    """
    Retorna (nome_normal, nome_bold) para uso no ReportLab.

    ReportLab tem Times-Roman e Helvetica embutidos (PDF Type-1, sem arquivo .ttf).
    "Times New Roman" → Times-Roman / Times-Bold
    "Arial"           → Helvetica   / Helvetica-Bold
    """
    if "arial" in font_choice.lower():
        return "Helvetica", "Helvetica-Bold"
    # Padrão ABNT: Times New Roman
    return "Times-Roman", "Times-Bold"
