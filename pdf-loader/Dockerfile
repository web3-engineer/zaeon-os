# Zaeon pdf-loader — leitura estruturada de PDF (opendataloader-pdf, Apache 2.0).
# Núcleo é Java (CLI shaded jar); o SDK Python dispara a JVM. FastAPI fina por cima.
# MODO FAST fixo nesta VPS (sem OCR/Hybrid) — ver PDF_LOADER_HYBRID.
# bookworm (Debian 12): tem openjdk-17-jre-headless (o slim padrão já é trixie, que não tem).
FROM python:3.11-slim-bookworm

WORKDIR /app
ENV PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PDF_LOADER_HYBRID=0 \
    PDF_LOADER_TIMEOUT=30 \
    PDF_LOADER_MAX_MB=25 \
    # Teto de heap da JVM p/ caber no limite de 896m do container (resto: Python + SO).
    JAVA_TOOL_OPTIONS=-Xmx512m

# JRE (Java 17 ≥ requisito 11+) p/ o núcleo do opendataloader.
RUN apt-get update && apt-get install -y --no-install-recommends \
      openjdk-17-jre-headless \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./
RUN pip install --upgrade pip && pip install -r requirements.txt

COPY . .
EXPOSE 8005
CMD ["python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8005"]
