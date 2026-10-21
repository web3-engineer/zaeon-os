"""
Zaeon pdf-loader — leitura ESTRUTURADA de PDF (opendataloader-pdf, modo FAST).

POST /extract  → { markdown, paragraphs[], blocks[] }
GET  /health

Modo FAST fixo (sem OCR/Hybrid) nesta VPS. Não loga o conteúdo do PDF.
"""
import glob
import json
import math
import os
import signal
import subprocess
import sys
import tempfile
import urllib.request

from fastapi import FastAPI, HTTPException, Request

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
HYBRID = os.getenv("PDF_LOADER_HYBRID", "0") == "1"
TIMEOUT = int(os.getenv("PDF_LOADER_TIMEOUT", "30"))
MAX_BYTES = int(os.getenv("PDF_LOADER_MAX_MB", "25")) * 1024 * 1024

app = FastAPI(title="zaeon-pdf-loader")

# opendataloader type → nosso tipo de bloco
_TYPE_MAP = {
    "heading": "heading", "title": "heading", "doctitle": "heading",
    "paragraph": "paragraph", "text": "paragraph",
    "list": "paragraph", "list item": "paragraph", "listitem": "paragraph",
    "table": "table",
    "image": "figure", "figure": "figure", "picture": "figure",
}


@app.get("/health")
def health():
    return {"ok": True, "mode": "hybrid" if HYBRID else "fast"}


@app.post("/extract")
async def extract(request: Request):
    pdf_bytes = await _read_input(request)
    if not pdf_bytes:
        raise HTTPException(status_code=400, detail="PDF ausente (file multipart ou {url}).")
    if len(pdf_bytes) > MAX_BYTES:
        raise HTTPException(status_code=413, detail=f"PDF acima de {MAX_BYTES // (1024*1024)} MB.")
    if pdf_bytes[:5] != b"%PDF-":
        raise HTTPException(status_code=415, detail="Arquivo não é um PDF.")

    with tempfile.TemporaryDirectory() as d:
        pdf_path = os.path.join(d, "in.pdf")
        out_dir = os.path.join(d, "out")
        os.makedirs(out_dir, exist_ok=True)
        with open(pdf_path, "wb") as f:
            f.write(pdf_bytes)

        _run_convert(pdf_path, out_dir)

        markdown = _read_first(out_dir, "*.md")
        doc = _read_first_json(out_dir)
        paragraphs, blocks = _walk(doc)

    return {"markdown": markdown, "paragraphs": paragraphs, "blocks": blocks}


# ── Entrada: multipart file OU JSON {url} ──────────────────────

async def _read_input(request: Request) -> bytes | None:
    ct = request.headers.get("content-type", "")
    if ct.startswith("multipart/form-data"):
        form = await request.form()
        up = form.get("file")
        if up is None:
            return None
        return await up.read()
    if ct.startswith("application/json"):
        try:
            data = await request.json()
        except Exception:
            return None
        url = (data or {}).get("url")
        if not url or not str(url).lower().startswith(("http://", "https://")):
            return None
        return _download(str(url))
    return None


def _download(url: str) -> bytes | None:
    req = urllib.request.Request(url, headers={"User-Agent": "Zaeon-pdf-loader/1.0"})
    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT) as r:
            return r.read(MAX_BYTES + 1)
    except Exception:
        raise HTTPException(status_code=502, detail="Não consegui baixar o PDF da URL.")


# ── Conversão isolada (timeout duro + mata o grupo se travar) ──

def _run_convert(pdf_path: str, out_dir: str) -> None:
    proc = subprocess.Popen(
        [sys.executable, os.path.join(BASE_DIR, "runner.py"), pdf_path, out_dir],
        stdout=subprocess.PIPE, stderr=subprocess.PIPE, start_new_session=True,
    )
    try:
        _, _err = proc.communicate(timeout=TIMEOUT)
    except subprocess.TimeoutExpired:
        try:
            os.killpg(os.getpgid(proc.pid), signal.SIGKILL)  # mata JVM filha também
        except Exception:
            pass
        proc.wait()
        raise HTTPException(status_code=504, detail="Tempo excedido ao ler o PDF.")
    if proc.returncode != 0:
        raise HTTPException(status_code=422, detail="Não consegui interpretar o PDF.")


def _read_first(out_dir: str, pattern: str) -> str:
    hits = sorted(glob.glob(os.path.join(out_dir, "**", pattern), recursive=True))
    if not hits:
        return ""
    with open(hits[0], encoding="utf-8", errors="replace") as f:
        return f.read()


def _read_first_json(out_dir: str) -> dict:
    hits = sorted(glob.glob(os.path.join(out_dir, "**", "*.json"), recursive=True))
    if not hits:
        return {}
    with open(hits[0], encoding="utf-8", errors="replace") as f:
        return json.load(f)


# ── JSON (kids[] recursivo) → paragraphs + blocks ──────────────

def _walk(doc: dict):
    paragraphs: list[dict] = []
    blocks: list[dict] = []
    counter = {"idx": 0}

    def emit_block(bt, node, text):
        page = node.get("page number")
        bbox = node.get("bounding box")
        block = {"type": bt, "page": page, "bbox": bbox, "text": text}
        if bt == "heading":
            level = _heading_level(node.get("heading level"))
            if level is not None:
                block["level"] = level
        blocks.append(block)

    def rec(node):
        if isinstance(node, list):
            for k in node:
                rec(k)
            return
        if not isinstance(node, dict):
            return
        bt = _TYPE_MAP.get(str(node.get("type", "")).lower())
        content = (node.get("content") or "").strip()
        kids = _filhos(node)

        if bt == "table":
            emit_block("table", node, _flatten(node))
            return  # não desce nas células (evita virar espaguete nos paragraphs)
        if bt == "figure":
            emit_block("figure", node, content)
            return
        if bt in ("heading", "paragraph") and content:
            emit_block(bt, node, content)
            paragraphs.append({"idx": counter["idx"], "page": node.get("page number"), "text": content})
            counter["idx"] += 1
        for k in kids:
            rec(k)

    rec(_filhos(doc))
    return paragraphs, blocks


# Onde o opendataloader guarda os filhos. Lista NÃO usa kids: o nó "list" não tem content e os itens
# ficam em "list items" (cada item com content + kids próprios p/ sublistas). Sem essa chave os itens
# saíam no markdown mas sumiam dos blocks — e o RAG nunca os cortava.
_CHAVES_FILHOS = ("kids", "children", "elements", "list items")


def _filhos(node: dict) -> list:
    out: list = []
    for chave in _CHAVES_FILHOS:
        v = node.get(chave)
        if isinstance(v, list):
            out.extend(v)
    return out


def _heading_level(raw):
    """Nível do título (1 = mais alto) a partir do 'heading level' do opendataloader; None se inválido."""
    if isinstance(raw, bool):
        return None
    if isinstance(raw, str):
        raw = raw.strip()
        if not raw.isdigit():
            return None
        raw = int(raw)
    if isinstance(raw, float) and raw.is_integer():
        raw = int(raw)
    if isinstance(raw, int) and raw >= 1:
        return raw
    return None


def _flatten(node) -> str:
    """Texto do bloco de tabela. O opendataloader grava tabela como rows[] → cells[] → kids[]
    (não kids direto): sem descer por rows/cells a tabela saía VAZIA. Com linhas, devolve
    tabela Markdown (uma linha por row, células separadas por " | ") — o modelo lê as colunas."""
    rows = node.get("rows")
    if isinstance(rows, list) and rows:
        linhas: list[str] = []
        for row in rows:
            cells = row.get("cells") if isinstance(row, dict) else None
            if not isinstance(cells, list):
                continue
            textos = [_texto(c).replace("|", "/") for c in cells]
            if any(textos):
                linhas.append("| " + " | ".join(textos) + " |")
        if linhas:
            return "\n".join(linhas)
    return _texto(node, sep=" | ")


def _texto(node, sep: str = " ") -> str:
    """Junta o `content` de todos os descendentes (kids/children/elements/rows/cells)."""
    out: list[str] = []

    def rec(n):
        if isinstance(n, list):
            for k in n:
                rec(k)
        elif isinstance(n, dict):
            c = (n.get("content") or "").strip()
            if c:
                out.append(c)
            for chave in (*_CHAVES_FILHOS, "rows", "cells"):
                rec(n.get(chave) or [])

    rec(node)
    return sep.join(out)
