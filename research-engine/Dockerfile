# Zaeon Research Engine — host de motores Python (FastAPI, porta 8002). Imagem para o VPS.
# Sem deps nativas hoje (google-genai/fastapi são wheels puros) → estágio único, slim, non-root.
# Motor OSS que precisar de pacote pesado: acrescente no requirements.txt (ver README).
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

EXPOSE 8002
CMD ["python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8002", "--no-access-log"]
