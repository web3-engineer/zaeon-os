"""
Motor `zaeon-sugestao` (formato "unico", origem "zaeon"): a sugestão de pesquisa por análise
de lacunas (engine.py) rodando sobre as `evidencias` da tarefa.

Cada evidência vira uma referência numerada pro modelo (índice i ↔ chave E#); o modelo cita
por índice e este motor traduz pra [E#] no texto. Sem evidências → sugestão sai sem citação
e `degradado=true` (não lastreada em literatura).
"""
from __future__ import annotations

import re

import llm
from engine import gerar_sugestao
from models import ReferenceInput, SuggestRequest, SuggestResponse
from motores.base import Motor
from motores.contrato import Evidencia, Resultado, Tarefa, UsoMotor

MAX_EVIDENCIAS = 30  # mesmo teto de SuggestRequest.references

# Ordem importa: "pós-doc" antes de "doc"; "mestrado" antes de "grad".
_NIVEIS: list[tuple[str, str]] = [
    (r"p[óo]s[- ]?doc|postdoc", "postdoc"),
    (r"doutorad|\bphd\b|\bdoc\b", "phd"),
    (r"mestrad|\bmsc\b|mestre", "msc"),
    (r"gradua|\bgrad\b|\btcc\b|inicia[çc][ãa]o cient", "grad"),
]


def nivel_da_tarefa(tarefa: Tarefa) -> str:
    """O contrato não tem campo de nível; procura em intent/contexto. Padrão: mestrado."""
    alvo = f"{tarefa.intent} {tarefa.contexto or ''}".lower()
    for padrao, nivel in _NIVEIS:
        if re.search(padrao, alvo):
            return nivel
    return "msc"


def _fonte_ref(e: Evidencia) -> str:
    url = (e.source.url or "").lower()
    if "arxiv.org" in url:
        return "arXiv"
    if "pubmed" in url or "ncbi.nlm.nih.gov" in url:
        return "PubMed"
    if "doi.org" in url:
        return "DOI"
    if "scholar" in url:
        return "Scholar"
    return "outro"


def _doi(e: Evidencia) -> str | None:
    m = re.search(r"10\.\d{4,9}/\S+", e.source.url or "")
    return m.group(0).rstrip(").,;") if m else None


def renderizar(resp: SuggestResponse, chaves: list[str]) -> str:
    """Markdown pt-BR. `chaves` = chaves E# citadas (já validadas), na ordem."""
    s = resp.suggestion
    cita = "".join(f"[{c}]" for c in chaves)
    linhas = [
        f"### {s.title}",
        "",
        f"**Tipo:** {s.type} · **Lacuna (gap score):** {s.gap_score:.2f}",
        "",
        f"{s.rationale} {cita}".rstrip(),
        "",
        f"**Ângulo de novidade:** {s.novelty_angle}",
    ]
    if not chaves:
        linhas += [
            "",
            "_Sem evidência citada: sugestão não lastreada em literatura — confira antes de usar._",
        ]
    return "\n".join(linhas)


class ZaeonSugestao(Motor):
    id = "zaeon-sugestao"
    nome = "Zaeon · Sugestão de pesquisa (análise de lacunas)"
    origem = "zaeon"
    formato = "unico"

    def disponivel(self) -> bool:
        return llm.configurado()

    async def executar(self, tarefa: Tarefa, deadline: float) -> Resultado:
        evidencias = tarefa.evidencias[:MAX_EVIDENCIAS]
        refs = [
            ReferenceInput(
                source=_fonte_ref(e),
                title=e.source.title or e.chave,
                authors=e.source.authors,
                year=e.source.year,
                url=e.source.url,
                doi=_doi(e),
                snippet=e.claim[:4000],
            )
            for e in evidencias
        ]
        topico = tarefa.objetivo.strip()
        if len(topico) < 2:
            topico = f"{topico} {tarefa.intent}".strip()
        pedido = SuggestRequest(
            topic=topico[:500], level=nivel_da_tarefa(tarefa), references=refs or None
        )
        contexto = f"Intenção da tarefa: {tarefa.intent}"
        if tarefa.contexto:
            contexto += f"\n{tarefa.contexto}"

        r = await gerar_sugestao(pedido, deadline=deadline, contexto=contexto)
        chaves = [evidencias[i - 1].chave for i in r.citadas]
        return Resultado(
            motor=self.id,
            texto=renderizar(r.resposta, chaves),
            evidencias=list(tarefa.evidencias),
            uso=UsoMotor(
                prompt_tokens=r.uso.prompt_tokens,
                completion_tokens=r.uso.completion_tokens,
                chamadas=r.uso.chamadas,
            ),
            modelos=list(r.uso.modelos),
            passos=1,
            degradado=not chaves,
        )
