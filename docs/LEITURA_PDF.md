# Skill de leitura de PDF (`lib/pdf/ler.ts`)

Um caminho só para a Zaeon ler PDF: a **base do aluno** (`/api/rag/minha-base` → `lib/rag/ingerir`), o **anexo do
chat** (`lib/agent/anexos-server`) e, por eles, a skill de trechos e o PaperOrchestra.

## Por que existe (nov/2026)

"O agente não lê PDF na Zaeon" tinha duas causas reais:

1. **A base só lia pelo pdf-loader.** Sem `PDF_LOADER_URL`, com o serviço fora ou lento (timeout de 35 s), o PDF do
   aluno não entrava (`leitura_falhou`) — não havia plano B. O anexo do chat tinha uma reserva própria, a base não.
2. **A reserva pdf.js quebrava no Node.** `pdfjs-dist` 3.x `legacy` faz `require("canvas")` quando não acha
   `DOMMatrix`/`Path2D`; o servidor não tem o `canvas` nativo → `Cannot find module 'canvas'`. Toda leitura por pdf.js
   no servidor (anexo do chat, texto completo do Scholar, vídeo do documento) falhava em silêncio.

## O que faz

1. **pdf-loader** (opendataloader-pdf): ordem de leitura, títulos, tabelas e a página de cada parágrafo.
2. **Reserva pdf.js** (`lib/pdf/pdfjs.ts` define stubs de `DOMMatrix`/`Path2D` — só extração de texto, nada é
   desenhado): agrupa os pedaços de texto em linhas pela altura na página e quebra parágrafo pelo espaço vertical
   (> 1,6× a altura da linha); desfaz hifenização de fim de linha; mantém a página.
3. **Escaneado** (só imagem, < 80 caracteres no documento): `sem_texto` — dito como tal, não vira documento vazio.
4. **Protegido por senha**: `protegido`.

Toda leitura loga **quem leu** (`[pdf] leitura: {"leitor":"pdf-loader"|"pdfjs", "tentativas":[…]}`) — é o
diagnóstico de produção ("o pdf-loader está mesmo de pé?").

## Testes

- `lib/pdf/ler.test.ts`: pdf.js de verdade sobre PDFs reais (`tests/fixtures/pdf/`): parágrafos e páginas certos,
  escaneado, não-PDF, loader vence, loader sem texto cai no pdf.js.
- `tests/e2e_paper/test_10_base.py` e `test_60_reserva_pdfjs.py`: o app logado com o pdf-loader real, e com ele
  derrubado no meio da sessão.
