"""
tests/e2e_paper/cliente.py — o aluno, por HTTP. Fala com o app exatamente como o navegador (components/study/
StudyCoworkChat + lib/chat/auraClient): mesmas rotas, mesmo corpo, mesmo cookie de sessão, mesmo stream.
"""
from __future__ import annotations

import base64
import json
import time
from dataclasses import dataclass, field

import requests

STRUCTURED = "@@STRUCTURED@@"
PROGRESSO = "@@PROGRESS@@"


@dataclass
class RespostaChat:
    status: int
    bruto: str
    progresso: list[dict] = field(default_factory=list)
    answer: dict | None = None

    @property
    def texto(self) -> str:
        """O texto da resposta como o aluno lê: núcleo + desenvolvimento."""
        a = self.answer or {}
        return "\n\n".join(x for x in (a.get("nucleo"), a.get("desenvolvimento")) if x)

    @property
    def trechos(self) -> list[dict]:
        return list((self.answer or {}).get("trechos") or [])

    @property
    def tcc(self) -> dict | None:
        return (self.answer or {}).get("tcc")


def ler_stream(bruto: str) -> tuple[list[dict], dict | None]:
    """O stream do chat: linhas @@PROGRESS@@{json} e, no fim, @@STRUCTURED@@{json}."""
    progresso: list[dict] = []
    for linha in bruto.splitlines():
        if linha.startswith(PROGRESSO):
            try:
                progresso.append(json.loads(linha[len(PROGRESSO):]))
            except json.JSONDecodeError:
                pass
    answer = None
    i = bruto.rfind(STRUCTURED)
    if i >= 0:
        resto = bruto[i + len(STRUCTURED):].strip()
        try:
            answer = json.loads(resto)
        except json.JSONDecodeError:
            # o JSON pode vir seguido de algo: pega o maior prefixo que parseia
            for fim in range(len(resto), 0, -1):
                try:
                    answer = json.loads(resto[:fim])
                    break
                except json.JSONDecodeError:
                    continue
    return progresso, answer


class Aluno:
    def __init__(self, url: str, cookie: str, user_id: str, email: str):
        self.url, self.user_id, self.email = url, user_id, email
        self.http = requests.Session()
        nome, valor = cookie.split("=", 1)
        self.http.cookies.set(nome, valor, domain="127.0.0.1", path="/")

    # ── chat (Aura, chat único) ──
    def chat(self, prompt: str, escopo: str, *, aberto: str | None = None, pdf: tuple[str, bytes] | None = None,
             historico: list[dict] | None = None, timeout: int = 900) -> RespostaChat:
        corpo = {
            "prompt": prompt, "agent": "aura", "stream": True, "history": historico or [],
            "agentContext": {"activeTab": "sala-de-estudos", "chatUnico": True, "cartolinaScopeId": escopo,
                             **({"trabalhoAbertoId": aberto} if aberto else {})},
        }
        if pdf:
            corpo["fileData"] = "data:application/pdf;base64," + base64.b64encode(pdf[1]).decode()
        r = self.http.post(f"{self.url}/api/ai/chat", json=corpo, timeout=timeout, stream=True)
        bruto = "".join(ch.decode("utf-8", "replace") for ch in r.iter_content(chunk_size=None))
        progresso, answer = ler_stream(bruto)
        return RespostaChat(r.status_code, bruto, progresso, answer)

    # ── base do aluno (Minha base / RAG) ──
    def base_enviar(self, nome: str, conteudo: bytes, mime: str = "application/pdf") -> dict:
        r = self.http.post(f"{self.url}/api/rag/minha-base", files=[("arquivos", (nome, conteudo, mime))], timeout=300)
        assert r.status_code == 200, f"upload {r.status_code}: {r.text[:500]}"
        return r.json()

    def base_listar(self) -> list[dict]:
        r = self.http.get(f"{self.url}/api/rag/minha-base", timeout=60)
        assert r.status_code == 200, f"listar base {r.status_code}: {r.text[:300]}"
        return r.json()["documentos"]

    def base_esperar_pronto(self, documento_id: str, timeout: int = 600) -> dict:
        fim = time.time() + timeout
        ultimo = None
        while time.time() < fim:
            ultimo = next((d for d in self.base_listar() if d["id"] == documento_id), None)
            if ultimo and ultimo["status"] in ("pronto", "erro"):
                return ultimo
            time.sleep(3)
        raise TimeoutError(f"documento {documento_id} não ficou pronto: {ultimo}")

    # ── documento editável (TCC / Artigo / Relatório) ──
    def trabalho(self, work_id: str) -> tuple[int, dict | None]:
        r = self.http.get(f"{self.url}/api/tcc/{work_id}", timeout=60)
        return r.status_code, (r.json().get("tcc") if r.status_code == 200 else None)

    def trabalhos_do_escopo(self, escopo: str) -> list[dict]:
        r = self.http.get(f"{self.url}/api/tcc", params={"scopeId": escopo, "todos": "1"}, timeout=60)
        assert r.status_code == 200, r.text[:300]
        return r.json()["trabalhos"]

    def trabalho_esperar(self, work_id: str, timeout: int = 1500, ao_ver=None) -> dict:
        """Poll como o TccPanel (2,5 s). `ao_ver(tcc)` roda a cada leitura — é por ele que o aluno edita no meio."""
        fim = time.time() + timeout
        t = None
        while time.time() < fim:
            st, t = self.trabalho(work_id)
            assert st == 200, f"GET trabalho {st}"
            if ao_ver:
                ao_ver(t)
            if t and t.get("status") in ("pronto", "erro"):
                return t
            time.sleep(2.5)
        raise TimeoutError(f"trabalho {work_id} não terminou: status {t and t.get('status')}")

    def trabalho_editar(self, work_id: str, secao_id: str, corpo: str) -> requests.Response:
        return self.http.post(f"{self.url}/api/tcc/{work_id}/edit",
                              json={"op": "substituir", "secaoId": secao_id, "corpo": corpo, "origem": "aluno"}, timeout=60)
