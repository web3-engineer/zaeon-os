# Suíte E2E do documento editável (Python)

Testa o caminho **real e logado**: o app Next.js de pé, sessão NextAuth de verdade, as rotas que a tela usa
(`/api/rag/minha-base`, `/api/ai/chat` em stream, `/api/tcc/:id`, `/api/tcc/:id/edit`), MongoDB e Postgres+pgvector
de verdade, o pdf-loader de verdade e o Vertex de verdade. Nada de roteiro chamando o pipeline por fora — é a aluna
usando o produto.

## A história (cada arquivo é uma cena, em ordem)

| Cena | Arquivo | O que prova |
|---|---|---|
| 0 | `test_00_oraculos.py` | os próprios oráculos (sem infra) — oráculo errado faz a suíte mentir |
| 1 | `test_10_base.py` | PDF entra na base pela skill de leitura (pdf-loader) com todas as páginas; escaneado recusado com `sem_texto`; base invisível pra outra aluna |
| 2 | `test_20_trechos.py` | **localizar**: fato plantado achado LITERAL na página certa; "todas as vezes" com recall e precisão; o que não está no material não é inventado; anexo do 📎 também |
| 3 | `test_30_artigo.py` | **gerar doc**: artigo pedido no chat nasce no documento editável, PaperOrchestra escreve; a aluna escreve a conclusão NO MEIO e o texto dela sobrevive; laudo completo; DOIs conferidos no Crossref |
| 4 | `test_40_a_partir_do_outro.py` | **um trabalho a partir do outro**: artigo → PDF → base → trecho achado NELE → TCC a partir dele, citando o artigo com a página certa do PDF |
| 5 | `test_50_isolamento.py` | outra aluna não vê, não edita e não arranca da Aura nada da primeira |
| 6 | `test_60_reserva_pdfjs.py` | o pdf-loader cai: o PDF entra pela reserva pdf.js, com páginas, e o trecho é achado |

## O material com verdade conhecida (`material.py`)

Uma apostila de 8 páginas com **fatos plantados que não existem fora dela** (o sistema "Tapiri", a engenheira
"Lucinda Prado Arraes", queda de 62% na p. 6, R$ 18 mil na p. 4, "biofiltro de juncos" exatamente nas p. 3, 5 e 7).
O modelo só acerta lendo; o oráculo sabe a resposta. O texto do PDF que vale como verdade é o do **pypdf** — não o
leitor da Zaeon.

## Os oráculos (`oraculos.py`, independentes de `lib/`)

- citação × referência (NBR 10520): toda citação tem referência, toda referência é citada;
- forma ABNT (NBR 6023): entrada em caixa alta, ano, ponto final, DOI bem formado, sem lixo interno;
- DOI real (`-m rede`): existe no Crossref/doi.org **e** é do trabalho que a referência descreve;
- trecho literal: está no PDF palavra por palavra, na página que diz;
- fato com página: parágrafo que usa um fato do material cita o material que o tem, na página dele;
- fidelidade de dado, coleta de campo inventada, chaves internas sobrando (`[E#]`, `[[T#]]`).

`verificar.laudo()` roda todos e o teste falha mostrando o laudo INTEIRO (não para no primeiro erro).

## Rodar

Pré-requisitos (uma vez): MongoDB 8 (`mongod`), PostgreSQL 18 + pgvector, OpenJDK 17, e um venv Python 3.11 com
`pytest requests pypdf reportlab` + as dependências do `pdf-loader/requirements.txt`.

```bash
MONGOD_BIN=/caminho/mongod \
PG_BIN=/opt/homebrew/opt/postgresql@18/bin \
PDF_LOADER_PY=/caminho/venv/bin/python \
JAVA_HOME=/opt/homebrew/opt/openjdk@17 \
ZAEON_ENV_PRINCIPAL=/caminho/zaeon-os/.env \
python -m pytest tests/e2e_paper -v
```

- Só os oráculos (segundos, sem nada): `python -m pytest tests/e2e_paper -m offline`
- Sem rede pública (Crossref): `-m "not rede"`
- Guardar bancos e logs no fim: `--manter` (a pasta fica em `tests/e2e_paper/.saida/pasta-da-infra.txt`)

**Segurança.** Os bancos são criados numa pasta temporária, em portas livres, e as URIs são conferidas como locais
antes de subir o app. Do `.env` principal só as variáveis `GOOGLE_*` (Vertex) são lidas, em memória, e passadas ao
processo do app — nunca gravadas em disco. O `MONGODB_URI` do `.env` (produção) nunca é lido.

**Custo e tempo.** As cenas 3 e 4 geram dois trabalhos inteiros no Vertex (≈15–30 min cada). As cenas 1, 2, 5 e 6
levam poucos minutos.

## O que fica pra leitura humana

`tests/e2e_paper/.saida/`: a apostila e os PDFs gerados, cada trabalho em markdown (`artigo.md`, `tcc.md`), o laudo de
cada um e as respostas do chat com os trechos.
