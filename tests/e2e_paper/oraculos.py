"""
tests/e2e_paper/oraculos.py — os ORÁCULOS da suíte: o que separa "o documento parece bom" de "o documento está certo".

Escritos de forma INDEPENDENTE do código da Zaeon (nada importado de lib/): se a Zaeon e o oráculo errassem do mesmo
jeito, o teste passaria mentindo. Cada função devolve a lista de PROBLEMAS (vazia = ok), pra o teste mostrar tudo de
uma vez em vez de parar no primeiro.

  - citações × referências (NBR 10520): toda citação no texto tem a sua referência, e toda referência é citada;
  - forma ABNT da referência (NBR 6023): autoria em caixa alta, título, ano, DOI/URL bem formados;
  - DOI real (Crossref): o DOI existe E é do trabalho que a referência diz (título bate);
  - trecho literal: a citação do trecho está no PDF, palavra por palavra, na página que ele diz (pypdf, não o leitor da Zaeon);
  - fato com página: frase que usa um fato plantado cita o material com a página CERTA;
  - fidelidade de dado: número do material não pode virar outro número no texto;
  - sobras internas: [E#], [[T#]], "TODO", marcação de rascunho.
"""
from __future__ import annotations

import re
import unicodedata
from dataclasses import dataclass

from material import TextoPdf, normalizar

# ───────────────────────────── citações ─────────────────────────────
ANO = r"(?:\d{4}[a-z]?|\[s\.d\.\]|s\.d\.)"
# (SILVA, 2020) · (SILVA; SOUZA, 2021) · (SILVA et al., 2020, p. 4) · (SILVA, 2020; COSTA, 2019)
RE_PARENTESE = re.compile(r"\(([^()]{2,400}?)\)")
# Silva (2020) · Silva e Souza (2021) · Silva et al. (2020)
RE_NARRATIVA = re.compile(r"\b([A-ZÀ-Ý][\wÀ-ÿ'’-]+(?:\s+(?:e|&)\s+[A-ZÀ-Ý][\wÀ-ÿ'’-]+)?(?:\s+et\s+al\.)?)\s+\((" + ANO + r")(?:,\s*p\.\s*[\d–-]+)?\)")


@dataclass(frozen=True)
class Citacao:
    chave: str        # "SILVA|2020" (autor-data) ou "T|apostila agua cinza…" (título, material sem autor)
    pagina: str | None
    bruto: str
    pos: int


def _sem_acento(t: str) -> str:
    return "".join(c for c in unicodedata.normalize("NFKD", t) if not unicodedata.combining(c))


def _sobrenome(t: str) -> str:
    t = re.sub(r"\bet\s+al\.?", "", t, flags=re.I).strip(" .,;")
    return _sem_acento(t.split(";")[0].split(" e ")[0].split("&")[0].strip()).upper()


def _unidades(dentro: str) -> list[str]:
    """Separa "(SILVA; SOUZA, 2021; COSTA et al., 2019, p. 4)" em citações: ";" só fecha uma citação depois do ano
    (ou da página). "NOGUEIRA; FIGUEIRÊDO; SOUZA, 2025" é UMA citação de três autores."""
    out, atual = [], []
    for seg in dentro.split(";"):
        atual.append(seg)
        if re.search(r",\s*" + ANO + r"(?:,\s*p\.\s*[\d–-]+)?\s*$", seg.strip()) or re.search(r",\s*p\.\s*[\d–-]+\s*$", seg.strip()):
            out.append(";".join(atual).strip())
            atual = []
    if atual:
        out.append(";".join(atual).strip())
    return out


def citacoes(texto: str) -> list[Citacao]:
    out: list[Citacao] = []
    for m in RE_PARENTESE.finditer(texto):
        for parte in _unidades(m.group(1)):
            pag = re.search(r",\s*p\.\s*([\d]+(?:\s*[–-]\s*\d+)?)", parte)
            pagina = re.sub(r"\s*[–-]\s*", "–", pag.group(1)) if pag else None
            sem_pag = parte[: pag.start()] if pag else parte
            a = re.match(r"^(.+?),\s*(" + ANO + r")\s*$", sem_pag)
            if a and re.match(r"^[A-ZÀ-Ý][A-ZÀ-Ý'’ .;-]+(?:\s+et\s+al\.)?$", a.group(1).strip()):
                out.append(Citacao(f"{_sobrenome(a.group(1))}|{a.group(2)}", pagina, m.group(0), m.start()))
            elif pagina and not re.search(r"\d{4}", sem_pag):
                # material do aluno sem autoria: (Título curto…, p. 6)
                out.append(Citacao(f"T|{normalizar(sem_pag).rstrip('…. ')[:24]}", pagina, m.group(0), m.start()))
    for m in RE_NARRATIVA.finditer(texto):
        nome = m.group(1)
        if nome.lower() in {"em", "no", "na", "de", "do", "da", "segundo", "conforme", "desde", "ano", "anos"}:
            continue
        out.append(Citacao(f"{_sobrenome(nome)}|{m.group(2)}", None, m.group(0), m.start()))
    return out


# ───────────────────────────── referências ─────────────────────────────
def referencias(corpo: str) -> list[str]:
    linhas = [re.sub(r"^\s*(?:[-*]|\d+[.)])\s+", "", l).strip() for l in re.split(r"\n+", corpo or "")]
    return [l for l in linhas if len(l) > 15]


def chave_da_referencia(ref: str) -> list[str]:
    """As chaves que uma referência atende: "SILVA|2020" (autor-data) e/ou "T|título" (sem autoria)."""
    ref_ = re.sub(r"\*\*", "", ref)
    ano = re.search(r"\b(\d{4}[a-z]?)\.", ref_) or re.search(r"\b(\d{4}[a-z]?)\b", ref_)
    chaves = []
    autor = re.match(r"^([A-ZÀ-Ý][A-ZÀ-Ý'’ -]+)[,;.]", ref_)  # "SILVA, A." · "UZMA; CHOLET, F." (nome único)
    if autor and ano:
        chaves.append(f"{_sem_acento(autor.group(1)).strip()}|{ano.group(1)}")
    elif ano and re.match(r"^[A-ZÀ-Ý0-9][A-ZÀ-Ý0-9 :,'’-]{6,}", ref_):
        # sem autoria: a entrada é pelo TÍTULO em caixa alta (NBR 6023 8.1.1.3) → citação pela 1ª palavra
        chaves.append(f"{_sem_acento(ref_.split()[0]).strip(' .,:').upper()}|{ano.group(1)}")
    titulo = re.match(r"^([^.]{6,240})\.", ref_)
    if titulo:
        chaves.append(f"T|{normalizar(titulo.group(1))[:24]}")
    return chaves


def cruzar(texto: str, refs: list[str]) -> list[str]:
    """NBR 10520: citação sem referência e referência nunca citada são erros."""
    problemas: list[str] = []
    cits = citacoes(texto)
    atendidas = {c: r for r in refs for c in chave_da_referencia(r)}

    def atende(c: Citacao) -> str | None:
        if c.chave in atendidas:
            return atendidas[c.chave]
        if c.chave.startswith("T|"):
            pre = c.chave[2:]
            return next((r for k, r in atendidas.items() if k.startswith("T|") and (k[2:].startswith(pre) or pre.startswith(k[2:]))), None)
        return None

    citadas = set()
    for c in cits:
        r = atende(c)
        if r is None:
            problemas.append(f"citação sem referência: {c.bruto}")
        else:
            citadas.add(r)
    for r in refs:
        if r not in citadas:
            problemas.append(f"referência nunca citada: {r[:140]}")
    return problemas


RE_DOI = re.compile(r"\b(10\.\d{4,9}/[^\s\]>)]+?)\.?(?=\s|$)")


def abnt_forma(ref: str) -> list[str]:
    """A forma da referência (NBR 6023). Não julga conteúdo — isso é do Crossref."""
    p: list[str] = []
    r = ref.strip()
    if "[referência incompleta" in r:
        return []  # material do aluno sem autoria: a marca é intencional e visível (o aluno completa)
    if not re.match(r"^[A-ZÀ-Ý][A-ZÀ-Ý'’ -]+(?:,\s*[A-ZÀ-Ý]|;\s*[A-ZÀ-Ý])", r) and not re.match(r"^[A-ZÀ-Ý0-9][A-ZÀ-Ý0-9 :,'’-]{6,}\.", r):
        p.append(f"entrada sem SOBRENOME em caixa alta nem TÍTULO em caixa alta: {r[:90]}")
    if not re.search(r"\b(1[5-9]\d\d|20[0-3]\d)[a-z]?\b|\[s\.d\.\]", r):
        p.append(f"sem ano: {r[:90]}")
    if not r.endswith("."):
        p.append(f"não termina em ponto: …{r[-40:]}")
    if "doi" in r.lower() and not RE_DOI.search(r):
        p.append(f"DOI mal formado: {r[:120]}")
    if re.search(r"\[E\d+\]|\[\[T\d+\]\]|undefined|null|NaN", r):
        p.append(f"lixo interno na referência: {r[:120]}")
    return p


def doi_de(ref: str) -> str | None:
    m = RE_DOI.search(ref.replace("https://doi.org/", " ").replace("http://dx.doi.org/", " "))
    return m.group(1).rstrip(".,;") if m else None


def titulo_da_referencia(ref: str) -> str:
    """O título numa referência autor-título: o que vem depois da autoria ("SILVA, A.; SOUZA, B. Título. Veículo…")."""
    r = re.sub(r"\*\*[^*]*\*\*.*$", "", ref)  # corta do veículo (em negrito) em diante
    r = re.sub(r"^(?:[A-ZÀ-Ý'’ -]+,\s*(?:[A-ZÀ-Ý]\.\s*)+;?\s*)+(?:et al\.?\s*)?", "", r).strip()
    return r.split(". ")[0].strip().rstrip(".")


def similaridade(a: str, b: str) -> float:
    ta = {w for w in re.findall(r"[a-z0-9]{3,}", normalizar(a))}
    tb = {w for w in re.findall(r"[a-z0-9]{3,}", normalizar(b))}
    return len(ta & tb) / max(1, min(len(ta), len(tb)))


def doi_confere(ref: str, http) -> list[str]:
    """O DOI existe no Crossref e é do trabalho que a referência descreve (título semelhante)."""
    doi = doi_de(ref)
    if not doi:
        return []
    try:
        r = http.get(f"https://api.crossref.org/works/{doi}", timeout=20, headers={"User-Agent": "zaeon-e2e-tests/1.0"})
    except Exception as e:  # noqa: BLE001
        return [f"Crossref inacessível para {doi}: {e}"]
    if r.status_code == 404:
        # DataCite (Zenodo, arXiv…) não está no Crossref: o doi.org decide
        rr = http.head(f"https://doi.org/{doi}", timeout=20, allow_redirects=False)
        return [] if rr.status_code in (301, 302, 303, 307, 308) else [f"DOI inexistente: {doi}"]
    if r.status_code != 200:
        return [f"Crossref {r.status_code} para {doi}"]
    titulos = r.json().get("message", {}).get("title") or [""]
    real = titulos[0]
    nosso = titulo_da_referencia(ref)
    if real and similaridade(real, nosso) < 0.5:
        return [f"DOI {doi} é de OUTRO trabalho: referência diz «{nosso[:80]}», Crossref diz «{real[:80]}»"]
    return []


# ───────────────────────────── trechos ─────────────────────────────
def paginas_do_rotulo(rotulo: str) -> set[int]:
    m = re.match(r"^\s*(\d+)(?:\s*[–-]\s*(\d+))?\s*$", rotulo or "")
    if not m:
        return set()
    a, b = int(m.group(1)), int(m.group(2) or m.group(1))
    return set(range(a, b + 1))


def trecho_confere(trecho: dict, pdf: TextoPdf) -> list[str]:
    """O trecho é LITERAL (está no PDF) e está na página que diz. Conferido com pypdf, não com o leitor da Zaeon."""
    cit = (trecho.get("citacao") or "").strip()
    if len(cit) < 20:
        return [f"{trecho.get('id')}: citação curta demais ({cit!r})"]
    alvo = normalizar(cit)
    if alvo not in normalizar(pdf.todo()):
        # uma frase do trecho pode cruzar a quebra de página: confere cada frase longa
        frases = [f for f in re.split(r"(?<=[.!?;])\s+", cit) if len(f) > 30]
        faltam = [f for f in frases if normalizar(f) not in normalizar(pdf.todo())]
        if not frases or faltam:
            return [f"{trecho.get('id')}: NÃO é literal — «{(faltam or [cit])[0][:100]}» não está no PDF"]
    onde = set(pdf.pagina_de(cit[:80])) or set(pdf.pagina_de(cit[-80:]))
    diz = paginas_do_rotulo(trecho.get("paginas", ""))
    if not diz:
        return [f"{trecho.get('id')}: sem página (rótulo {trecho.get('paginas')!r})"]
    if onde and not (onde & diz):
        return [f"{trecho.get('id')}: página ERRADA — diz p. {trecho.get('paginas')}, o texto está na p. {sorted(onde)}"]
    return []


# ───────────────────────────── fatos e dados ─────────────────────────────
def paragrafos(texto: str) -> list[str]:
    return [p.strip() for p in re.split(r"\n{2,}", texto or "") if p.strip()]


def eh_do_material(c: Citacao, titulo: str) -> bool:
    """A citação (Título curto…, p. N) é deste material? Compara o começo do título normalizado."""
    if not c.chave.startswith("T|"):
        return False
    a, b = c.chave[2:].rstrip("… ."), normalizar(titulo)
    n = min(len(a), len(b), 16)
    return n >= 6 and a[:n] == b[:n]


def fato_citado_com_pagina(texto: str, padrao: str, paginas_por_material: dict[str, set[int]]) -> list[str]:
    """Todo parágrafo que usa o fato (regex `padrao`) cita um material que o contém, na página em que ele está.
    `paginas_por_material`: título do material → páginas onde o fato aparece nele (verdade do pypdf)."""
    problemas = []
    for par in paragrafos(texto):
        if not re.search(padrao, par, flags=re.I):
            continue
        cits = citacoes(par)
        dos_materiais = [(c, t) for c in cits for t in paginas_por_material if eh_do_material(c, t)]
        if not dos_materiais:
            # citou outra fonte (literatura) pra um fato que só existe no material: atribuição errada
            outras = [c.bruto for c in cits]
            problemas.append(f"usa o fato /{padrao}/ sem citar o material{f' (cita {outras})' if outras else ''}: «{par[:140]}…»")
            continue
        if not any(c.pagina and (paginas_do_rotulo(c.pagina) & paginas_por_material[t]) for c, t in dos_materiais):
            pags = [(t[:20], c.pagina) for c, t in dos_materiais]
            certas = {t[:20]: sorted(p) for t, p in paginas_por_material.items()}
            problemas.append(f"fato /{padrao}/ citado com página {pags}, devia ser {certas}: «{par[:120]}…»")
    return problemas


def valor(n: str) -> float | None:
    """'62%', '62 %', '62,0%' → 62; 'R$ 18 mil', 'R$ 18.000', 'R$ 18.000,00' → 18000. A forma muda, o valor não."""
    t = n.replace("R$", "").replace("%", "").strip().lower()
    mult = 1000 if t.endswith("mil") else 1
    t = t.replace("mil", "").strip()
    if re.fullmatch(r"\d{1,3}(?:\.\d{3})+(?:,\d+)?", t):  # 18.000 / 18.000,00
        t = t.replace(".", "").replace(",", ".")
    else:
        t = t.replace(",", ".")
    try:
        return float(t) * mult
    except ValueError:
        return None


def numeros_fieis(texto: str, contexto: str, permitidos: set[str]) -> list[str]:
    """Em frases sobre `contexto` (regex), todo percentual/valor em R$ tem de VALER um dos do material."""
    problemas = []
    ok = {valor(p) for p in permitidos}
    for frase in re.split(r"(?<=[.!?])\s+", texto or ""):
        if not re.search(contexto, frase, flags=re.I):
            continue
        for n in re.findall(r"\d+(?:[.,]\d+)*\s*%|R\$\s*\d+(?:[.,]\d+)*\s*(?:mil\b)?", frase):
            if valor(n) not in ok:
                problemas.append(f"número que o material não tem: {n.strip()!r} em «{frase[:140]}»")
    return problemas


RE_NOME_DE_DOC = re.compile(r"[\"“«]([^\"”»]{6,90})[\"”»]")
PALAVRA_DE_DOC = re.compile(r"\b(apostila|cartilha|manual|guia|documento|relat[oó]rio|artigo|caderno)\b", re.I)


def titulo_inventado(texto: str, titulos_reais: list[str]) -> list[str]:
    """O texto chama um material de um nome entre aspas que não é o título dele (achado real do E2E, nov/2026:
    "Apostila Técnica do Sistema Tapiri" para a "Apostila Agua Cinza no Semiarido")."""
    reais = [normalizar(t) for t in titulos_reais]
    out = []
    for m in RE_NOME_DE_DOC.finditer(texto or ""):
        nome = m.group(1).strip()
        if PALAVRA_DE_DOC.search(nome) and not any(normalizar(nome) in r or r in normalizar(nome) for r in reais):
            out.append(f"material chamado por um título que não é o dele: «{nome}» (reais: {titulos_reais})")
    return out


RE_SOBRA = re.compile(r"\[E\d+[^\]\n]{0,40}\]|\[\[T\d+\]\]|\bTODO\b|\[A FAZER\]|\{\{|\}\}|@@\w+@@")


def sobras(texto: str) -> list[str]:
    return [f"sobra interna {m.group(0)!r}: …{texto[max(0, m.start() - 50):m.end() + 30]}…" for m in RE_SOBRA.finditer(texto or "")]


METODO_INVENTADO = re.compile(
    r"\b(entrevistas? semiestruturadas?|question[aá]rios? (?:aplicados?|online)|grupos? focais?|amostra de \d+|"
    r"\d+ (?:participantes|entrevistados|respondentes)|aprovad[oa] pelo comit[eê] de [eé]tica|CAAE)\b", re.I)


def metodo_inventado(texto: str) -> list[str]:
    """Pesquisa de campo que ninguém fez: o pedido não tem coleta, então o texto não pode ter."""
    return [f"coleta inventada: «{m.group(0)}»" for m in METODO_INVENTADO.finditer(texto or "")]


def fontes_academicas_fora(http) -> list[str]:
    """Quais bases de resumo estão recusando ESTA máquina agora (429/erro). Com OpenAlex e Semantic Scholar fora, o
    gerador — corretamente — não cita o que não leu, e sobra pouco com DOI: é ambiente, não defeito do gerador."""
    fora = []
    for nome, url in (("openalex", "https://api.openalex.org/works?search=water&per-page=1"),
                      ("semanticscholar", "https://api.semanticscholar.org/graph/v1/paper/search?query=water&limit=1")):
        try:
            if http.get(url, timeout=15).status_code != 200:
                fora.append(nome)
        except Exception:  # noqa: BLE001
            fora.append(nome)
    return fora
