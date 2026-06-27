"""
ABNT NBR 14724:2011 — Constantes de formatação
Norma: Trabalhos acadêmicos — Apresentação
"""
from docx.shared import Pt, Cm

# ── Página (A4) ────────────────────────────────────────────────
PAGE_WIDTH_CM  = 21.0
PAGE_HEIGHT_CM = 29.7

MARGIN_LEFT_CM   = 3.0   # encadernação
MARGIN_RIGHT_CM  = 2.0
MARGIN_TOP_CM    = 3.0
MARGIN_BOTTOM_CM = 2.0

# ── Fonte ──────────────────────────────────────────────────────
FONT_BODY           = "Times New Roman"   # ou Arial, escolha do usuário
FONT_SIZE_BODY_PT   = 12
FONT_SIZE_QUOTE_PT  = 10   # citações longas (> 3 linhas)
FONT_SIZE_NOTE_PT   = 10   # notas de rodapé
FONT_SIZE_SMALL_PT  = 10   # legendas, fontes de tabelas

# ── Espaçamento ────────────────────────────────────────────────
LINE_SPACING_BODY   = 1.5   # corpo do texto
LINE_SPACING_QUOTE  = 1.0   # citações longas, notas, legendas
LINE_SPACING_REF    = 1.0   # entre linhas de uma referência
SPACE_BETWEEN_REFS  = Pt(12)  # entre entradas de referência

SPACE_BEFORE_TITLE_PT = 12
SPACE_AFTER_TITLE_PT  = 12

# ── Recuos ─────────────────────────────────────────────────────
PARAGRAPH_INDENT_CM   = 1.25   # recuo de parágrafo (1ª linha)
LONG_QUOTE_INDENT_CM  = 4.0    # citações longas: recuo esquerdo

# ── Citações (NBR 10520) ───────────────────────────────────────
# Citação direta longa = mais de 3 linhas → bloco recuado 4cm, 10pt, simples.
# A "linha" é estimada pela largura útil da página (A4 menos margens 3+2cm =
# 16cm, fonte 12pt ≈ 75 caracteres por linha; um pouco menos para Arial).
LONG_QUOTE_MIN_LINES  = 3      # acima disso, citação vira bloco
CHARS_PER_LINE        = 75     # estimativa de caracteres por linha (12pt, A4)

# ── Numeração de páginas ───────────────────────────────────────
# Aparece no canto superior direito
# Contagem começa na capa; exibição começa na 1ª folha de texto
PAGE_NUMBER_FROM_PAGE = 1

# ── Elementos pré-textuais obrigatórios ───────────────────────
# Ordem: Capa → Folha de Rosto → Resumo → Sumário → Texto → Referências

# ── Ilustrações / Figuras (NBR 14724:2024) ─────────────────────
# Legenda no topo ("Figura N – Título", travessão), fonte embaixo, ambas em
# tamanho menor (10pt), centralizadas; imagem centralizada.
FIGURE_LABEL        = "Figura"
FIGURE_CAPTION_DELIM = " – "          # travessão (en-dash), não hífen
IMAGE_MAX_WIDTH_CM  = 15.0            # largura máxima da imagem (cabe na margem)
IMAGE_MAX_BYTES     = 12 * 1024 * 1024  # 12 MB — proteção de download
SOURCE_OWN_WORK     = "elaborado pelo próprio autor"      # figura/quadro (masc.)
SOURCE_OWN_WORK_F   = "elaborada pelo próprio autor"      # tabela (fem.)

# ── Tabelas (IBGE) e Quadros (NBR 14724:2024) ──────────────────
# Tabela: título no topo, sem bordas verticais (3 traços horizontais), fonte
# no rodapé. Quadro: caixa fechada (todas as bordas), dado qualitativo.
TABLE_LABEL         = "Tabela"
QUADRO_LABEL        = "Quadro"
FONT_SIZE_TABLE_PT  = 10             # conteúdo de células (menor, uniforme)

# ── Notas de rodapé (NBR 14724) ────────────────────────────────
# Marcador inline no texto:  texto^[conteúdo da nota]
FOOTNOTES_CONTENT_TYPE = (
    "application/vnd.openxmlformats-officedocument.wordprocessingml.footnotes+xml"
)
FOOTNOTES_REL_TYPE = (
    "http://schemas.openxmlformats.org/officeDocument/2006/relationships/footnotes"
)

# ── Bookmarks (alvos de PAGEREF no sumário/listas) ─────────────
BM_SECTION    = "sec"
BM_REFERENCES = "refs"
BM_FIGURE     = "fig"
BM_TABLE      = "tab"
BM_QUADRO     = "quadro"
BM_APPENDIX   = "apx"
BM_ANNEX      = "anx"

# ── Referências (NBR 6023:2018) ────────────────────────────────
REFERENCES_TITLE = "REFERÊNCIAS"
# Alinhadas à esquerda, sem recuo, espaço simples, separadas por linha em branco
