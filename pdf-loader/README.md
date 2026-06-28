# pdf-loader — leitura estruturada de PDF

Microserviço FastAPI que envolve o [opendataloader-pdf](https://github.com/opendataloader-project/opendataloader-pdf)
para extrair PDF de forma **estruturada** (ordem de leitura multi-coluna,
títulos/seções, tabelas → Markdown, e JSON com `bounding box` por bloco).

Substitui a extração "crua" do `pdf.js` (`lib/scholar/pdf.ts`) quando
`PDF_LOADER_URL` está setado no `web`; com fallback automático pro pdf.js.

## Endpoints
- `POST /extract` — `multipart` com `file` **ou** JSON `{ "url": "<pdf>" }`.
  Resposta: `{ "markdown", "paragraphs": [{idx,page,text}], "blocks": [{type,page,bbox,text}] }`.
- `GET /health` — `{ ok, mode }`.

## Modo FAST (padrão nesta VPS)
- `PDF_LOADER_HYBRID=0` (fixo aqui): **sem OCR / SmolVLM / fórmulas** — pede 2–4 GB.
  Ligar só quando a máquina crescer (16 GB). Container limitado a `896m`.
- `sanitize=on` remove texto oculto / prompt-injection; cabeçalho/rodapé filtrados.
- `JAVA_TOOL_OPTIONS=-Xmx512m`, timeout `PDF_LOADER_TIMEOUT=30`s, upload `PDF_LOADER_MAX_MB=25`.

## Licença / atribuição
opendataloader-pdf é **Apache License 2.0** (uso comercial OK). Este serviço apenas
instala o pacote via pip; o `NOTICE`/licença viajam com o pacote. Veja o repositório
upstream para o `NOTICE` completo.
