# Zaeon Quality Engine — Termômetro Acadêmico (FastAPI, porta 8003). Imagem para o VPS.
# Espelha research-engine/abnt-service: deps puras (fastapi/uvicorn/pyphen/lexical-diversity/httpx),
# sem nativas pesadas → estágio único, slim, non-root. NILC_METRIX_URL é opcional (métricas extras).
FROM python:3.12.7-slim-bookworm

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

COPY requirements.txt ./
RUN pip install --upgrade 'pip==25.0' && pip install -r requirements.txt

COPY . .
RUN useradd --create-home --uid 10001 motor && chown -R motor /app
USER motor

EXPOSE 8003
CMD ["python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8003", "--no-access-log"]
