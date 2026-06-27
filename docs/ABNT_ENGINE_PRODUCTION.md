# Motor ABNT production-grade — Spec p/ agente (Zaeon OS)

> **Missão:** deixar a geração ABNT da Zaeon **production-grade** e, principalmente, **mostrar
> ao usuário** as regras de formatação já como **default** no modal de salvar (fonte
> Arial/Times 12, espaçamento 1,5, **alinhamento justificado**, margens 3 cm sup/esq · 2 cm
> inf/dir). O backend já aplica o núcleo da norma — **AUDITAR primeiro, implementar só o que
> faltar.** Trabalhe em fatias, verifique cada uma, **não quebre o verde**, **não faça deploy**
> (o dono faz merge → CI deploya).
>
> **Norma de referência (ler):** NBR 14724:2011 (Trabalhos acadêmicos — Apresentação) + NBR
> 6023:2018 (Referências). Manual aprofundado (CEFET-MG):
> https://www.eng-eletrica.bh.cefetmg.br/wp-content/uploads/sites/191/2019/08/2-MANUAL-DE-NORMAS-atualizada-conforme-NBR-14724-de-abril-de-2011-1-31.pdf

---

## 0. Stack / verificação / guardrails

- **App:** Next 14 (App Router) + `server.js`. **Worker ABNT:** Python FastAPI em `abnt-service/` (porta **8001**), separado, chamado pela rota Next.
- **Deploy:** Docker Compose no VPS (`docker-compose.beta.yml`). Deploy é **automático no merge**; você **não** faz SSH/deploy.
- **Verificação (gate):**
  - Front/rota: `npx tsc --noEmit` (filtrado nos arquivos tocados; `next.config` tem `ignoreBuildErrors`, então o `tsc` é o gate real) **+** `npx vitest run`.
  - Worker Python: rodar local e gerar um `.docx` de teste, **abrir e conferir** margens/justificado/fonte/espaçamento (ver §4). As `GOOGLE_*` estão setadas localmente (a rota Next chama o Gemini pra estruturar).
- **Segredos** só em `.env`/VPS, nunca no git/log. macOS sem `python` (use `python3`).

---

## 1. Mapa de arquivos (já auditado)

**Worker Python (`abnt-service/`):**
- `abnt_rules.py` — constantes da norma. **Já tem:** `MARGIN_LEFT/TOP=3cm`, `RIGHT/BOTTOM=2cm`; `FONT_BODY=Times New Roman` (ou Arial), `FONT_SIZE_BODY_PT=12`; `LINE_SPACING_BODY=1.5`; citação longa 10pt/1,0/recuo 4cm (>250 chars); recuo parágrafo 1,25cm; numeração de página (canto sup. direito); `REFERENCES_TITLE`.
- `formatter.py` — **aplica** as regras: `_setup_page` (margens A4 3/2/3/2), `_setup_base_style` (fonte + `WD_LINE_SPACING.MULTIPLE` 1,5), corpo `WD_ALIGN_PARAGRAPH.JUSTIFY`, títulos `CENTER`, resumo, referências. **Corpo já é justificado.**
- `models.py` — `DocumentPayload`: `title, work_type, cover{author,institution,course,advisor,city,year}, resumo, palavras_chave[], sections[], references[], validation, format(pdf|docx), font_choice(Times|Arial)`. (Margens/1,5/justificado **não** são params — são fixos da norma; manter assim.)
- `main.py` — FastAPI `/format` → `.docx` ou `.pdf` (via `pdf_converter.py`); `/health`.
- `pdf_converter.py` — docx→pdf.

**Next/Front:**
- `app/api/documents/abnt-export/route.ts` — estrutura o texto via Gemini (seções/resumo/palavras-chave) → monta `DocumentPayload` → chama `ABNT_SERVICE_URL/format`. Hoje envia `font_choice` + `format`.
- `app/research-lab/page.tsx` — **modal "Exportar com ABNT"** (~linhas 2807-2934). Estado `abntMeta` (~l.851) tem `fontChoice`. O modal expõe **só Fonte (Times/Arial, ~l.2901-2921)** e os botões de formato (pdf/docx via `handleABNTExport`, ~l.1995) + "Salvar na Nuvem".
- `lib/abntTemplate.ts`, `lib/abntFormat.ts`, `lib/scholar/abnt.ts` (+ `abnt.test.ts`) — helpers ABNT no front.

---

## PARTE A — Modal de salvar mostra os defaults da norma (PRIORIDADE) ⭐

**Objetivo:** quando o modal "Exportar com ABNT" abre, o usuário **vê e já tem selecionadas** as
opções da norma. A **fonte** é a única escolha real (Arial ↔ Times, já existe). As demais são
fixas da ABNT → mostrar como **defaults marcados** (badges/itens "✓"), com um rótulo claro
"Formatação ABNT (NBR 14724) — aplicada automaticamente".

No bloco do modal em `app/research-lab/page.tsx` (logo após o seletor de Fonte ~l.2921),
adicionar um painel "Formatação ABNT" listando, já como default/ativos:
- **Tamanho da fonte:** 12 pt
- **Espaçamento entre linhas:** 1,5
- **Alinhamento:** Justificado
- **Margens:** 3 cm (superior/esquerda) · 2 cm (inferior/direita)
- **Recuo de parágrafo:** 1,25 cm · **Citação longa:** recuo 4 cm, 10 pt, espaço simples
- **Numeração:** canto superior direito

Estilo: seguir o liquid-glass da casa (pílulas/itens com ✓ ciano), modo claro+escuro.
- **Decisão de UX:** por padrão, esses itens são **informativos/locked** (a norma é fixa). Se
  quiser permitir override, exponha como toggles **default-ON** (justificado, 1,5) — mas o
  default tem que refletir a ABNT. **Não** invente params que o backend não aceita sem também
  ligar no `models.py`/`formatter.py`.
- Se adicionar qualquer opção realmente configurável (ex.: tamanho da fonte alternativo,
  margem de encadernação), **propague**: `abntMeta` → `abnt-export/route.ts` (request) →
  `DocumentPayload` (`models.py`) → `formatter.py`. Caso contrário, mantenha fixo e só exiba.

**Aceite (Parte A):** abrir o modal → ver a fonte selecionável + o painel "Formatação ABNT"
com tamanho 12 / 1,5 / justificado / margens 3-2 cm já marcados como default; exportar gera
o documento idêntico ao que o backend já produz.

---

## PARTE B — Auditoria production-grade vs NBR 14724 (implementar o que faltar)

Compare `formatter.py` com o manual (link acima) e implemente o que estiver faltando. Para cada
item: **verificar se já existe** → se não, implementar com teste/checagem visual.

**Elementos pré-textuais (ordem da norma):**
- [ ] Capa · [ ] Folha de rosto (com natureza do trabalho/“apresentado a…”) · [ ] Folha de aprovação (placeholder de assinaturas) · [ ] Dedicatória/Agradecimentos/Epígrafe (opcionais) ·
- [ ] **Resumo** (1 parágrafo + palavras-chave) — **conferir** · [ ] **Abstract** (resumo em inglês + keywords) — provavelmente FALTA · [ ] Listas (ilustrações/tabelas/abreviaturas/símbolos) quando houver ·
- [ ] **Sumário** (last pre-textual; com a numeração das seções) — verificar se é gerado.

**Texto:**
- [ ] Numeração progressiva de seções (1, 1.1, 1.1.1) coerente com o sumário.
- [ ] **Citações:** direta curta (até 3 linhas, entre aspas, no corpo) vs **direta longa** (>3 linhas → recuo 4 cm, 10 pt, espaço simples, sem aspas) — `abnt_rules.py` usa threshold por chars (250); revisar se reflete "3 linhas". Citação indireta. Sistema autor-data (SOBRENOME, ano, p.).
- [ ] **Notas de rodapé** (10 pt, espaço simples) — verificar suporte.
- [ ] **Alíneas** (a, b, c…) quando o texto pedir.
- [ ] **Ilustrações e tabelas:** legenda na parte superior (Figura/Tabela N — título) + **fonte** na parte inferior; menção no texto.

**Pós-textuais:**
- [ ] **Referências** (NBR 6023): alinhadas à esquerda, espaço simples interno, **linha em branco entre entradas** — conferir em `formatter.py`. · [ ] Apêndices/Anexos (se aplicável) · [ ] Glossário/Índice (opcionais).

**Paginação:** contagem desde a capa, **exibição a partir da 1ª folha textual**, algarismos
arábicos no canto superior direito — verificar a implementação atual.

> Priorize o que afeta a maioria dos trabalhos: **Abstract, Sumário, citação curta×longa por
> nº de linhas, legenda+fonte de figuras/tabelas, e o espaçamento das Referências.** Itens
> opcionais (dedicatória, glossário) podem ficar como suporte mínimo/placeholder.

---

## 2. Como testar o worker (local)
```bash
cd abnt-service && python3 -m venv .venv && . .venv/bin/activate && pip install -r requirements.txt
python3 -m uvicorn main:app --port 8001 &   # sobe o serviço
# POST um payload de exemplo (DocumentPayload) em /format com format:"docx",
# salvar o retorno como teste.docx e ABRIR no Word/LibreOffice para conferir
# visualmente: margens 3/2, corpo justificado, fonte 12, entrelinha 1,5, títulos centralizados.
```
Adicionar testes unitários onde der (ex.: validar que `formatter` seta `JUSTIFY` no corpo,
`Cm(3)`/`Cm(2)` nas margens, `line_spacing==1.5`) — pytest no `abnt-service/` se houver, ou
um teste de fumaça que monta o doc e inspeciona `doc.sections[0].left_margin` etc.

## 3. Ordem (fatias) — cada uma: implementar → verificar → relatar
1. **Parte A** (modal mostra defaults ABNT) — entrega o pedido visível do usuário, baixo risco.
2. Auditoria backend (Parte B): **Abstract + Sumário** (mais impactantes).
3. Citações curta×longa por linhas + legenda/fonte de figuras/tabelas.
4. Referências (espaçamento NBR 6023) + paginação + notas de rodapé/alíneas.
5. Pós-textuais opcionais (apêndices/anexos) + folha de aprovação.

## 4. Definição de DONE
- Modal de salvar mostra fonte (Arial/Times) + painel "Formatação ABNT" com 12 pt / 1,5 /
  justificado / margens 3-2 cm já como default.
- Worker gera `.docx` e `.pdf` conferidos visualmente contra a norma (margens/justificado/
  fonte/espaçamento/citações/referências/paginação).
- Abstract + Sumário presentes; citação curta×longa correta; figuras/tabelas com legenda+fonte.
- `tsc` (tolerar 1 erro pré-existente em `page.tsx`) + `vitest` verdes; sem segredo no git.
  Deploy/merge fica pro dono.
