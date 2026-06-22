# ABNT Document Engine — Plano de Implementação

> **Objetivo:** Usuário escreve livremente no Research Lab e exporta um PDF ou Word
> 100% conforme ABNT NBR 14724:2011 — com capa, resumo, seções, citações e referências
> formatadas automaticamente por IA + motor Python.

---

## Resultado Esperado (Definition of Done)

Quando a implementação estiver completa, o usuário deve ser capaz de:

1. Escrever seu texto livremente no editor do Research Lab
2. Clicar em **"Salvar & Exportar"**
3. Preencher metadados (instituição, curso, orientador, cidade, ano)
4. Escolher formato: **PDF** ou **Word (.docx)**
5. Aguardar ~5-10s enquanto o pipeline processa
6. Receber um arquivo com **download automático** contendo:

### Estrutura do documento gerado (ABNT NBR 14724:2011):

```
┌─────────────────────────────────────────┐
│  CAPA                                   │
│  • Nome da Instituição (centralizado)   │
│  • Nome do Autor                        │
│  • Título do Trabalho (maiúsculas)      │
│  • Cidade                               │
│  • Ano                                  │
├─────────────────────────────────────────┤
│  FOLHA DE ROSTO                         │
│  • Autor + Título                       │
│  • Natureza do trabalho (ex: TCC)       │
│  • Orientador (se aplicável)            │
├─────────────────────────────────────────┤
│  RESUMO                                 │
│  • Até 500 palavras, parágrafo único    │
│  • Sem recuo de parágrafo               │
│  • Palavras-chave (3-5 termos)          │
├─────────────────────────────────────────┤
│  SUMÁRIO                                │
│  • Gerado automaticamente               │
│  • Numeração de seções                  │
├─────────────────────────────────────────┤
│  1 INTRODUÇÃO                           │
│  1.1 Subtítulo (se houver)              │
│  2 DESENVOLVIMENTO                      │
│  3 CONCLUSÃO                            │
├─────────────────────────────────────────┤
│  REFERÊNCIAS                            │
│  • Formato NBR 6023:2018               │
│  • Ordem alfabética                     │
│  • Espaço simples entre linhas          │
│  • Duplo entre entradas                 │
└─────────────────────────────────────────┘
```

### Regras ABNT verificadas 1:1:

| Regra | Especificação |
|-------|--------------|
| Papel | A4 (21cm × 29,7cm) |
| Margem superior | 3cm |
| Margem inferior | 2cm |
| Margem esquerda | 3cm |
| Margem direita | 2cm |
| Fonte corpo | Times New Roman 12pt |
| Fonte citações longas | Times New Roman 10pt |
| Entrelinha corpo | 1,5 |
| Entrelinha citações | Simples (1,0) |
| Recuo parágrafo | 1,25cm (primeira linha) |
| Recuo citações longas | 4cm (esquerda) |
| Títulos de seção | MAIÚSCULAS + Negrito + 12pt |
| Subtítulos | MAIÚSCULAS + Sem negrito + 12pt |
| Numeração de páginas | Canto superior direito, a partir da 1ª folha |
| Capa | Obrigatória |
| Folha de rosto | Obrigatória |
| Resumo | Obrigatório, parágrafo único sem recuo |
| Palavras-chave | 3-5, separadas por ponto e vírgula |
| Referências | ABNT NBR 6023:2018 |

---

## Arquitetura do Pipeline

```
Research Lab Editor (Next.js)
  │
  ▼ POST /api/documents/abnt-export
  │
  ├─ [1] Agente Gemini "abnt_structurer"
  │       Analisa texto livre → JSON com seções ABNT
  │       Gera resumo, palavras-chave, identifica seções
  │
  ├─ [2] Monta DocumentPayload com metadados do usuário
  │
  ├─ [3] POST http://localhost:8001/format
  │       Python FastAPI ABNT Service
  │       python-docx → .docx formatado ABNT
  │       LibreOffice headless → .pdf (se solicitado)
  │
  └─ [4] Stream do binário → download no browser
```

---

## FASE 1 — Python ABNT Service

### 1.1 Estrutura de arquivos a criar

```
zaeon-os/
└── abnt-service/
    ├── main.py              ← FastAPI app (endpoints)
    ├── formatter.py         ← Geração do .docx com python-docx
    ├── pdf_converter.py     ← Conversão docx → pdf
    ├── abnt_rules.py        ← Constantes NBR 14724:2011
    ├── models.py            ← Pydantic models (tipos de entrada)
    ├── requirements.txt     ← Dependências Python
    └── README.md            ← Como rodar o serviço
```

### 1.2 requirements.txt

```
fastapi==0.115.0
uvicorn==0.30.0
python-docx==1.1.2
weasyprint==62.3
pydantic==2.8.0
python-multipart==0.0.9
```

### 1.3 abnt_rules.py — Constantes NBR 14724:2011

Todas as constantes de formatação conforme a norma:
- Margens, fontes, tamanhos, espaçamentos, recuos
- Thresholds para identificar citações longas (>3 linhas / >250 chars)

### 1.4 models.py — Tipos Pydantic

```python
class CoverData(BaseModel):
    author: str
    institution: str
    course: str
    advisor: Optional[str]
    city: str
    year: str

class SectionData(BaseModel):
    type: str  # "introducao" | "desenvolvimento" | "conclusao" | "custom"
    title: str
    content: str
    subsections: List[SubsectionData] = []

class ReferenceData(BaseModel):
    text: str  # já formatada pelo agente Scholar

class DocumentPayload(BaseModel):
    title: str
    work_type: str  # "Artigo" | "TCC" | "Relatório"
    cover: CoverData
    resumo: str
    palavras_chave: List[str]
    sections: List[SectionData]
    references: List[ReferenceData]
    format: str  # "pdf" | "docx"
```

### 1.5 formatter.py — Motor ABNT com python-docx

Funções a implementar:
- `build_abnt_document(payload)` → `Document`
- `_setup_page(doc, section)` → margens A4
- `_setup_base_style(doc)` → fonte, entrelinha, recuo
- `_add_cover_page(doc, cover, title, work_type)` → capa completa
- `_add_title_page(doc, cover, title, work_type)` → folha de rosto
- `_add_resumo(doc, resumo, palavras_chave)` → resumo formatado
- `_add_toc_placeholder(doc)` → placeholder do sumário
- `_add_body_section(doc, section, number)` → seções numeradas
- `_add_references(doc, references)` → lista de referências
- `_add_page_numbers(doc)` → numeração no canto sup. direito
- `_is_long_quote(text)` → detecta citação longa (>250 chars / aspas)
- `_add_paragraph(doc, text)` → parágrafo com recuo correto

### 1.6 pdf_converter.py — Conversão para PDF

Estratégia primária: LibreOffice headless
Estratégia fallback: WeasyPrint via HTML intermediário

### 1.7 main.py — FastAPI Endpoints

```
POST /format
  Body: DocumentPayload JSON
  Returns: FileResponse (.docx ou .pdf)

GET /health
  Returns: { status: "ok", version: "1.0.0" }
```

**Critério de sucesso da Fase 1:**
- `python abnt-service/main.py` sobe sem erros
- `POST /format` com payload de teste retorna um arquivo .docx válido
- O .docx aberto no Word mostra: capa, resumo, seções, referências
- Margens, fonte e espaçamento estão corretos (verificar visualmente)

---

## FASE 2 — Agente ABNT Structurer (Gemini)

### 2.1 Nova persona em `/api/ai/chat/route.ts`

Adicionar ao objeto `AGENT_PERSONAS`:

```typescript
abnt_structurer: `Você é o Agente ABNT Structurer da Zaeon OS.
Analise o texto acadêmico bruto e retorne EXCLUSIVAMENTE um JSON válido
com as seções ABNT identificadas e estruturadas.

Schema obrigatório:
{
  "resumo": "string (até 500 palavras, parágrafo único)",
  "palavras_chave": ["string", "string", "string"],
  "sections": [
    {
      "type": "introducao|desenvolvimento|conclusao|custom",
      "title": "string em MAIÚSCULAS",
      "content": "string",
      "subsections": [{ "title": "string", "content": "string" }]
    }
  ],
  "validation": {
    "has_introduction": boolean,
    "has_conclusion": boolean,
    "has_references": boolean,
    "warnings": ["string"]
  }
}

Regras:
- Normalize títulos para MAIÚSCULAS
- Se não houver seções claras, crie com base no conteúdo
- Gere o resumo a partir do texto se não houver um explícito
- Extraia 3-5 palavras-chave relevantes
- Retorne APENAS o JSON, sem markdown, sem texto extra`
```

### 2.2 Nova rota `/api/documents/abnt-export/route.ts`

Fluxo da rota:
1. Recebe `ABNTExportRequest` do frontend
2. Chama Gemini com persona `abnt_structurer`
3. Faz parse do JSON retornado
4. Monta `DocumentPayload` completo com metadados
5. Faz `fetch('http://localhost:8001/format', { method: 'POST', body: payload })`
6. Recebe o binário do Python service
7. Retorna `Response` com headers de download

**Critério de sucesso da Fase 2:**
- `POST /api/documents/abnt-export` com texto de teste retorna arquivo binário
- O JSON gerado pelo Gemini tem todas as seções esperadas
- Warnings do agente chegam junto na resposta para exibir no frontend

---

## FASE 3 — UI no Research Lab

### 3.1 Refatorar modal "Salvar & Exportar"

O modal atual (`isSaveModalOpen`) tem 3 botões simples.
Substituir por um **fluxo de 2 passos**:

**Passo 1 — Metadados ABNT:**
```
┌────────────────────────────────────────┐
│  Exportar com formatação ABNT          │
│                                        │
│  Instituição: [________________]       │
│  Orientador:  [________________]       │ (opcional, aparece se TCC)
│  Cidade:      [________________]       │
│  Ano:         [____]                   │
│                                        │
│  Fonte: ○ Times New Roman  ○ Arial    │
│                                        │
│  [Cancelar]          [Próximo →]       │
└────────────────────────────────────────┘
```

**Passo 2 — Formato e Export:**
```
┌────────────────────────────────────────┐
│  Escolha o formato                     │
│                                        │
│  [📄 PDF — ABNT]                       │
│  Download em PDF formatado             │
│                                        │
│  [📝 Word — ABNT]                      │
│  Download em .docx editável            │
│                                        │
│  [← Voltar]                            │
└────────────────────────────────────────┘
```

**Estado de processamento:**
```
┌────────────────────────────────────────┐
│  ⟳ Formatando documento ABNT...        │
│                                        │
│  ● Estruturando seções com IA          │
│  ○ Aplicando normas NBR 14724:2011     │
│  ○ Gerando arquivo                     │
└────────────────────────────────────────┘
```

### 3.2 Novos estados no componente

```typescript
// Estados do modal ABNT
const [abntStep, setAbntStep] = useState<1 | 2>(1);
const [abntMeta, setAbntMeta] = useState({
  institution: "",
  advisor: "",
  city: "",
  year: new Date().getFullYear().toString(),
  fontChoice: "Times New Roman" as "Times New Roman" | "Arial"
});
const [isExporting, setIsExporting] = useState(false);
const [exportProgress, setExportProgress] = useState<string[]>([]);
```

### 3.3 Função handleABNTExport

```typescript
const handleABNTExport = async (format: "pdf" | "docx") => {
  setIsExporting(true);
  setExportProgress(["Estruturando seções com IA..."]);
  
  try {
    const response = await fetch('/api/documents/abnt-export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: docTitle,
        content: docContent,
        workType,
        citations: savedCitations,
        author: session?.user?.name || "",
        institution: abntMeta.institution,
        course: session?.user?.course || "",
        advisor: abntMeta.advisor,
        city: abntMeta.city,
        year: abntMeta.year,
        format
      })
    });

    setExportProgress(prev => [...prev, "Aplicando normas NBR 14724:2011...", "Gerando arquivo..."]);

    if (!response.ok) throw new Error("Falha na exportação");

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${docTitle.replace(/\s+/g, '_')}_ABNT.${format === 'pdf' ? 'pdf' : 'docx'}`;
    a.click();
    URL.revokeObjectURL(url);

    showToast(`Documento ABNT exportado com sucesso!`);
    setIsSaveModalOpen(false);
  } catch (err) {
    showToast("Erro ao exportar documento ABNT.");
  } finally {
    setIsExporting(false);
    setExportProgress([]);
    setAbntStep(1);
  }
};
```

### 3.4 Exibir warnings do agente

Se o agente detectar problemas (ex: "sem conclusão"), mostrar:
```
⚠️ O texto não contém uma conclusão clara.
   O documento será gerado assim mesmo — você pode editá-lo depois.
```

**Critério de sucesso da Fase 3:**
- Modal de 2 passos funciona sem erros
- Spinner com etapas aparece durante exportação
- Download automático do arquivo ao final
- Warnings são exibidos quando há problemas de estrutura

---

## FASE 4 — Polimento e Verificação Final

### 4.1 Checklist de qualidade do documento gerado

Abrir o documento no Word/LibreOffice e verificar:

- [ ] Capa com todos os campos (instituição, autor, título, cidade, ano)
- [ ] Folha de rosto com natureza do trabalho
- [ ] Resumo sem recuo de parágrafo, parágrafo único
- [ ] Palavras-chave separadas por ponto e vírgula
- [ ] Numeração de seções (1, 1.1, 2, 2.1, etc.)
- [ ] Títulos em MAIÚSCULAS com negrito
- [ ] Subtítulos em MAIÚSCULAS sem negrito
- [ ] Corpo com recuo 1,25cm na primeira linha
- [ ] Entrelinha 1,5 no corpo
- [ ] Referências com espaço simples entre linhas
- [ ] Referências com linha em branco entre entradas
- [ ] Margens: esquerda 3cm, direita 2cm, superior 3cm, inferior 2cm
- [ ] Fonte Times New Roman 12pt no corpo
- [ ] Numeração de páginas no canto superior direito
- [ ] PDF abre corretamente (não corrompido)

### 4.2 Salvar metadados no perfil

- Persistir `institution`, `city` no `UserSpaceData` via `/api/user-space`
- Pré-preencher no modal nas próximas exportações

### 4.3 Preview opcional

Futura melhoria: mostrar preview HTML do documento antes de baixar.

---

## Ordem de Execução

```
[FASE 1] Python ABNT Service
  ├─ abnt_rules.py     (constantes)
  ├─ models.py         (tipos Pydantic)
  ├─ formatter.py      (python-docx — geração do Word)
  ├─ pdf_converter.py  (conversão para PDF)
  ├─ main.py           (FastAPI endpoints)
  └─ requirements.txt

[FASE 2] Next.js — Agente + Rota
  ├─ Adicionar persona abnt_structurer em /api/ai/chat/route.ts
  └─ Criar /api/documents/abnt-export/route.ts

[FASE 3] UI — Research Lab
  ├─ Refatorar modal isSaveModalOpen (2 passos)
  ├─ Adicionar estados abntStep, abntMeta, isExporting
  └─ Implementar handleABNTExport

[FASE 4] Verificação
  ├─ Gerar documento de teste com conteúdo real
  ├─ Verificar cada regra ABNT visualmente
  └─ Ajustar formatação se necessário
```

---

## Comandos para Rodar

```bash
# Terminal 1 — Python ABNT Service
cd abnt-service
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8001 --reload

# Terminal 2 — Next.js
npm run dev
```

---

*Plano gerado em: 2026-05-24*
*Referência normativa: ABNT NBR 14724:2011 + NBR 6023:2018*
