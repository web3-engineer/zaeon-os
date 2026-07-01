# Handoff — Colocar o serviço ABNT no AR em produção (pro Claude Code executar)

> Tarefa única e cirúrgica: garantir que o **abnt-service** suba e fique de pé em produção.
> Branch própria (`fix/abnt-prod`). Já foi diagnosticado — siga os passos.

## Regras DURAS
- Branch + PR. **Nunca `git add -A`** (adicione só os arquivos citados). **NÃO faça SSH no VPS.**
  Push direto na `main` trava (proxy ISP) → se travar, deixe o commit pronto e avise o Martinez.
- Sem segredos em git/chat. macOS sem `python` (use `python3`). `npx tsc --noEmit` não se aplica aqui
  (mudança é infra/python), mas valide o que der.

## Diagnóstico (já feito — confie e confirme)
- O **código do abnt-service está saudável**: boota, tem `GET /health`, e `POST /format` gera `.docx`
  e `.pdf` (LibreOffice headless, com **fallback ReportLab** puro-Python). Arquivos:
  `abnt-service/{main.py,formatter.py,pdf_converter.py,models.py,Dockerfile,requirements.txt}`.
- **Causa provável do "não sobe":** no `docker-compose.beta.yml`, o serviço **web** dependia do
  abnt como `condition: service_healthy` → se o abnt demorasse/falhasse no healthcheck (build lento
  do LibreOffice, 1º boot, OOM), **o site inteiro não subia**. Já **alterei** para
  `condition: service_started` (web não fica mais refém do abnt; export degrada com 503 amigável).
  **Confirme que essa linha está assim** em `docker-compose.beta.yml` (depends_on do `web`):
  `abnt-service: { condition: service_started }`.
- O healthcheck do abnt **existe e está correto** (usa `python3 -c urllib...:8001/health`), mantenha.

## Passos

### 1. Confirmar/garantir o fix do compose
- Em `docker-compose.beta.yml`, no `depends_on` do `web`: `abnt-service: { condition: service_started }`.
- Manter o `healthcheck` do `abnt-service` (observabilidade) e `restart: unless-stopped`.

### 2. Validar que o serviço builda/boota (local, sem VPS)
- Opção A (rápida, sem Docker): num venv, `pip install -r abnt-service/requirements.txt` e suba
  `uvicorn main:app` (cwd `abnt-service/`); bata em `/health` e faça um `POST /format` de teste
  (docx e pdf). Deve retornar 200 + bytes `PK..`/`%PDF-`. (Já reproduzido com sucesso.)
- Opção B (se tiver Docker local): `docker build -t zaeon-abnt ./abnt-service` e
  `docker run --rm -p 8001:8001 zaeon-abnt`, depois `curl localhost:8001/health`. Confirma que a
  imagem (LibreOffice + deps) builda sem erro.

### 3. Resiliência opcional (recomendado pro VPS apertado 8GB) — fazer se rápido
- **RAM:** o LibreOffice pode estourar `limits: { memory: 1200m }` em conversões → subir para
  `1536m` **se** houver folga no orçamento (web 1.5g + voz 1g + abnt + redis 0.38 + caddy 0.25 +
  pdf-loader 0.9 ≈ confira o total contra 8g). Se não houver folga, **não** suba; em vez disso:
- **Robustez do LibreOffice:** em `abnt-service/pdf_converter.py::_convert_with_libreoffice`,
  garantir (a) `-env:UserInstallation=file:///tmp/lo_profile` no comando do soffice (perfil gravável,
  evita travar), e (b) um `timeout=` no `subprocess.run`. Se o LibreOffice falhar, o **fallback
  ReportLab** já assume (não derruba o serviço). NÃO remover o fallback.

### 4. Commit + PR (é isso que coloca no ar)
- O deploy é **automático**: `.github/workflows/deploy.yml` faz SSH no VPS e roda
  `docker compose up -d --build` com `COMPOSE_FILE=docker-compose.beta.yml` ao mergear na `main`.
  Portanto: **mergear o PR já rebuilda e sobe o abnt-service**.
- Crie a branch `fix/abnt-prod`, commit dos arquivos: `docker-compose.beta.yml` (e
  `abnt-service/pdf_converter.py` se fez o passo 3). Abra PR com o corpo do passo 5. Não dê push
  forçado; se o push travar, avise o Martinez.

### 5. Corpo do PR — runbook pós-merge pro Martinez rodar no VPS (NÃO é o agente que roda)
Cole isto no PR para o Martinez executar **após o merge/deploy**:
```bash
cd <pasta-do-projeto-no-vps>
docker compose -f docker-compose.beta.yml ps                         # abnt-service Up/healthy?
docker compose -f docker-compose.beta.yml logs --tail=150 abnt-service
docker compose -f docker-compose.beta.yml up -d --build abnt-service  # forçar rebuild/subida
docker compose -f docker-compose.beta.yml exec web sh -lc \
  "wget -qO- http://abnt-service:8001/health || echo FALHOU"          # web alcança o abnt?
```
Interpretação: se o log mostrar **erro de build** (apt/libreoffice) → rede/imagem; se **OOM/Killed**
→ aplicar o passo 3 (RAM/robustez); se **Up + /health ok** → exportação ABNT volta a funcionar.

## Entregáveis
- `docker-compose.beta.yml` com `web → abnt-service: service_started` (+ healthcheck mantido).
- (Opcional) `abnt-service/pdf_converter.py` mais robusto (UserInstallation + timeout).
- Branch `fix/abnt-prod` + PR com o runbook do passo 5 no corpo.
