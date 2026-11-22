"""
tests/e2e_paper/infra.py — sobe e derruba a infraestrutura ISOLADA da suíte E2E:

  - MongoDB (replica set rs0) numa pasta temporária, porta própria — o banco do app (usuários, documento editável,
    turnos, ledger). NUNCA o Mongo do .env do projeto: as URIs são montadas aqui e conferidas como locais.
  - PostgreSQL + pgvector numa pasta temporária, porta própria — a base RAG do aluno (rag-schema.sql, papel rag_app).
  - O app Next.js (`next dev`) apontado para os dois, com as flags da feature ligadas e as credenciais do Vertex
    (só as variáveis GOOGLE_* do .env principal, lidas em memória — nunca gravadas em disco).

Binários: MONGOD_BIN, PG_BIN (pasta do pg_ctl) — ver tests/e2e_paper/README.md.
"""
from __future__ import annotations

import json
import os
import shutil
import signal
import socket
import subprocess
import tempfile
import time
from dataclasses import dataclass, field
from pathlib import Path

import requests

RAIZ = Path(__file__).resolve().parents[2]


def _porta_livre() -> int:
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


def _esperar(cond, timeout: float, intervalo: float = 0.5, msg: str = "condição"):
    fim = time.time() + timeout
    ultimo = None
    while time.time() < fim:
        try:
            if cond():
                return
        except Exception as e:  # noqa: BLE001 — a condição pode lançar enquanto o serviço sobe
            ultimo = e
        time.sleep(intervalo)
    raise TimeoutError(f"esperando {msg} por {timeout:.0f}s (último erro: {ultimo})")


def credenciais_vertex(env_principal: Path) -> dict[str, str]:
    """Só as GOOGLE_* do .env principal (as do Vertex). Lidas em memória; MONGODB_URI e o resto NUNCA entram."""
    out: dict[str, str] = {}
    if not env_principal.exists():
        return out
    for linha in env_principal.read_text(encoding="utf-8", errors="replace").splitlines():
        if "=" not in linha or linha.lstrip().startswith("#"):
            continue
        k, v = linha.split("=", 1)
        k = k.strip()
        if k in {"GOOGLE_CREDENTIALS", "GOOGLE_PROJECT_ID", "GOOGLE_CLIENT_EMAIL", "GOOGLE_PRIVATE_KEY"}:
            out[k] = v.strip()
    return out


@dataclass
class Infra:
    pasta: Path = field(default_factory=lambda: Path(tempfile.mkdtemp(prefix="zaeon-e2e-")))
    porta_mongo: int = field(default_factory=_porta_livre)
    porta_pg: int = field(default_factory=_porta_livre)
    porta_app: int = field(default_factory=_porta_livre)
    porta_loader: int = field(default_factory=_porta_livre)
    loader: subprocess.Popen | None = None
    processos: list[subprocess.Popen] = field(default_factory=list)
    env_app: dict[str, str] = field(default_factory=dict)

    # ── URIs (sempre locais) ──
    @property
    def mongo_uri(self) -> str:
        return f"mongodb://127.0.0.1:{self.porta_mongo}/zaeon_e2e?replicaSet=rs0&directConnection=true"

    @property
    def rag_pg_url(self) -> str:
        return f"postgres://rag_app:teste@127.0.0.1:{self.porta_pg}/zaeon_rag"

    @property
    def url(self) -> str:
        return f"http://127.0.0.1:{self.porta_app}"

    def _rodar(self, cmd: list[str], env: dict | None = None, timeout: int = 600) -> str:
        r = subprocess.run(cmd, cwd=RAIZ, env={**os.environ, **(env or {})}, capture_output=True, text=True, timeout=timeout)
        if r.returncode != 0:
            raise RuntimeError(f"falhou: {' '.join(cmd)}\n{r.stdout[-2000:]}\n{r.stderr[-2000:]}")
        return r.stdout

    # ── Mongo ──
    def subir_mongo(self, mongod: str):
        d = self.pasta / "mongo"
        d.mkdir(parents=True, exist_ok=True)
        log = open(self.pasta / "mongod.log", "w")
        p = subprocess.Popen([mongod, "--replSet", "rs0", "--dbpath", str(d), "--port", str(self.porta_mongo),
                              "--bind_ip", "127.0.0.1", "--quiet"], stdout=log, stderr=subprocess.STDOUT,
                             start_new_session=True)  # grupo próprio: o encerramento por grupo não pode pegar o pytest
        self.processos.append(p)
        _esperar(lambda: socket.create_connection(("127.0.0.1", self.porta_mongo), 1).close() or True, 60, msg="mongod")
        self._rodar(["npx", "tsx", "tests/e2e_paper/node/mongo-preparar.ts", str(self.porta_mongo)], timeout=120)

    # ── Postgres + pgvector ──
    def subir_postgres(self, pg_bin: str):
        d = self.pasta / "pg"
        self._rodar([f"{pg_bin}/initdb", "-D", str(d), "-U", "postgres", "--auth=trust", "-E", "UTF8", "--locale=C"])
        self._rodar([f"{pg_bin}/pg_ctl", "-D", str(d), "-l", str(self.pasta / "pg.log"), "-w",
                     "-o", f"-p {self.porta_pg} -k {d} -c listen_addresses=127.0.0.1", "start"],
                    env={"LC_ALL": "C", "LANG": "C"})  # macOS: sem locale válido o postmaster aborta ("became multithreaded")
        psql = [f"{pg_bin}/psql", "-h", "127.0.0.1", "-p", str(self.porta_pg), "-U", "postgres", "-v", "ON_ERROR_STOP=1"]
        self._rodar(psql + ["-d", "postgres", "-c", "CREATE DATABASE zaeon_rag"])
        self._rodar(psql + ["-d", "zaeon_rag", "-v", "senha=teste", "-f", "infra/zaeon-models/rag-schema.sql"])
        self._pg_ctl = (pg_bin, d)

    # ── pdf-loader (o leitor de PDF de produção: opendataloader-pdf, precisa de Java 17) ──
    @property
    def loader_url(self) -> str:
        return f"http://127.0.0.1:{self.porta_loader}"

    def subir_pdf_loader(self, python: str, java_home: str):
        env = {**os.environ, "JAVA_HOME": java_home, "PATH": f"{java_home}/bin:{os.environ.get('PATH', '')}"}
        log = open(self.pasta / "pdf-loader.log", "a")
        self.loader = subprocess.Popen([python, "-m", "uvicorn", "main:app", "--host", "127.0.0.1", "--port", str(self.porta_loader)],
                                       cwd=RAIZ / "pdf-loader", env=env, stdout=log, stderr=subprocess.STDOUT, start_new_session=True)
        _esperar(lambda: requests.get(f"{self.loader_url}/health", timeout=3).json().get("ok") is True, 120, 1, "pdf-loader")

    def parar_pdf_loader(self):
        """Derruba o leitor de produção: o app (que segue com PDF_LOADER_URL apontando pra cá) tem de cair no pdf.js."""
        if self.loader and self.loader.poll() is None:
            os.killpg(os.getpgid(self.loader.pid), signal.SIGTERM)
            self.loader.wait(timeout=20)
        self.loader = None

    # ── o app ──
    def subir_app(self, extra_env: dict[str, str]):
        # o esquema Prisma no Mongo de teste (sem regenerar o client: o node_modules pode ser compartilhado)
        self._rodar(["npx", "prisma", "db", "push", "--skip-generate", "--accept-data-loss"],
                    env={"DATABASE_URL": self.mongo_uri}, timeout=300)
        env = {
            # bancos de TESTE
            "MONGODB_URI": self.mongo_uri, "DATABASE_URL": self.mongo_uri, "RAG_PG_URL": self.rag_pg_url,
            # sessão
            "NEXTAUTH_SECRET": "e2e-segredo-de-teste-que-nao-e-de-producao-" + "x" * 16,
            "NEXTAUTH_URL": self.url,
            # modelo (prod usa global + 3.5-flash)
            "GEMINI_TEXT_LOCATION": "global", "GOOGLE_LOCATION": "us-central1", "GEMINI_MODEL": "gemini-3.5-flash",
            # a feature
            "CHAT_UNICO": "1", "TCC_CROSS": "1", "PAPER_ORQUESTRA": "1", "TRECHOS_EM_PAPEL": "1",
            "DOC_POR_SECAO": "1", "CHAT_BG": "0", "CACHE_RESPOSTAS": "0",
            # sem serviços externos que a suíte não controla
            "PDF_LOADER_URL": self.loader_url if self.loader else "", "GATEWAY_URL": "", "REDIS_URL": "",
            "NODE_ENV": "development", "NEXT_TELEMETRY_DISABLED": "1",
            **extra_env,
        }
        for k in ("MONGODB_URI", "DATABASE_URL", "RAG_PG_URL", "NEXTAUTH_URL"):
            assert "127.0.0.1" in env[k] or "localhost" in env[k], f"{k} tem de ser local: {env[k]}"
        self.env_app = env
        log = open(self.pasta / "next.log", "w")
        # ambiente LIMPO: só PATH/HOME + o que montamos (o .env do projeto não é lido porque a worktree não tem um,
        # e o que viesse dele seria sobrescrito pelas chaves acima)
        base = {k: os.environ[k] for k in ("PATH", "HOME", "USER", "TMPDIR", "LANG") if k in os.environ}
        p = subprocess.Popen(["npx", "next", "dev", "-p", str(self.porta_app), "-H", "127.0.0.1"], cwd=RAIZ,
                             env={**base, **env}, stdout=log, stderr=subprocess.STDOUT, start_new_session=True)
        self.processos.append(p)
        _esperar(lambda: requests.get(f"{self.url}/api/auth/csrf", timeout=5).status_code == 200, 240, 2, "next dev")

    def sessao(self, email: str) -> dict:
        out = self._rodar(["npx", "tsx", "tests/e2e_paper/node/sessao.ts", email],
                          env={"MONGODB_URI": self.mongo_uri, "NEXTAUTH_SECRET": self.env_app["NEXTAUTH_SECRET"]})
        return json.loads(out.strip().splitlines()[-1])

    def log_app(self, ultimas: int = 200) -> str:
        f = self.pasta / "next.log"
        return "\n".join(f.read_text(errors="replace").splitlines()[-ultimas:]) if f.exists() else ""

    def descer(self, manter: bool = False):
        self.parar_pdf_loader() if self.loader else None
        for p in reversed(self.processos):
            try:
                os.killpg(os.getpgid(p.pid), signal.SIGTERM) if p.pid else None
            except Exception:  # noqa: BLE001
                p.terminate()
            try:
                p.wait(timeout=15)
            except Exception:  # noqa: BLE001
                p.kill()
        if getattr(self, "_pg_ctl", None):
            pg_bin, d = self._pg_ctl
            subprocess.run([f"{pg_bin}/pg_ctl", "-D", str(d), "-m", "fast", "stop"], capture_output=True, env={**os.environ, "LC_ALL": "C"})
        if not manter:
            shutil.rmtree(self.pasta, ignore_errors=True)
