# Claude Code Prompt — Research Modal: ABNT Structured Template + Didactic First-Run UX

## Contexto do sistema (leia antes de qualquer mudança)

Você está trabalhando no **Zaeon OS**, um Next.js 14 App Router com TypeScript. O produto tem uma área de pesquisa acadêmica com um editor de texto que exporta documentos no padrão ABNT NBR 14724:2011.

O fluxo completo é:
1. Usuário escreve a pesquisa num `<textarea>` livre em `/app/research-lab/page.tsx` (linha ~1216)
2. Ao clicar em "Salvar", o front envia o conteúdo bruto para `/api/documents/abnt-export`
3. A route chama o **Gemini** para detectar automaticamente as seções ABNT do texto bruto e estruturá-las em JSON
4. O JSON é enviado ao **Python ABNT service** (`abnt-service/`) que usa `python-docx` para montar o `.docx` / `.pdf` formatado conforme ABNT

### Problema atual
O `<textarea>` abre completamente em branco com apenas `placeholder="Sua pesquisa começa aqui..."`. O usuário não sabe que o sistema precisa de estrutura (introdução, desenvolvimento, conclusão) para funcionar bem. Quando o texto não tem marcadores, o Gemini infere por conta própria — mas comete erros, gera resumos genéricos e os warnings aumentam.

### Objetivo desta PR
**Sem quebrar nenhuma feature existente**, implementar:

1. **Template ABNT inicial didático** — quando o `docContent` está vazio (nova pesquisa), pré-carregar um template estruturado com marcadores de seção.
2. **Parser de marcadores no front** — extrair os marcadores `# TÍTULO` e `## Subtítulo` do texto antes de enviar ao backend, construindo o payload `sections[]` diretamente, sem depender 100% do Gemini.
3. **Enriquecer o Gemini prompt** com a hint de que o texto pode conter marcadores explícitos no formato `# SEÇÃO`.
4. **UX didática** — mostrar uma barra de dica colapsável acima do textarea explicando a lógica de escrita na Zaeon.

---

## Tarefa 1 — Leia os arquivos necessários

Antes de qualquer edição, leia **na íntegra**:

```
app/research-lab/page.tsx           # O editor principal (1629 linhas)
app/api/documents/abnt-export/route.ts  # A route de exportação ABNT
abnt-service/models.py              # Schema do DocumentPayload
abnt-service/abnt_rules.py          # Constantes ABNT
abnt-service/formatter.py           # Motor python-docx
```

Identifique:
- O estado `docContent` e `docTitle` (useState)
- O `<textarea>` do editor (linha ~1216)
- A função que chama `/api/documents/abnt-export` (provavelmente no handler do botão "Salvar")
- A interface `ABNTExportRequest` e a função `structureWithGemini` na route

---

## Tarefa 2 — Criar o template inicial ABNT

### 2a. Novo arquivo: `lib/abntTemplate.ts`

Crie `/lib/abntTemplate.ts` com:

```typescript
/**
 * Template ABNT estruturado para o primeiro carregamento do editor de pesquisa.
 * Os marcadores `# SEÇÃO` e `## Subseção` são processados pelo parser front-end
 * antes do envio ao backend, gerando o array `sections[]` do DocumentPayload.
 *
 * Formato suportado:
 *   # TÍTULO DA SEÇÃO        → SectionData (type detectado pelo título)
 *   ## Título da Subseção    → SubsectionData dentro da seção anterior
 *   Texto livre              → content da seção/subseção atual
 */

export const ABNT_TEMPLATE = `# INTRODUÇÃO
Apresente o tema, a justificativa e os objetivos do trabalho. Contextualize o problema de pesquisa e delimite o escopo do estudo. Finalize com uma breve descrição da estrutura do trabalho.

# REFERENCIAL TEÓRICO
## Conceitos Fundamentais
Apresente os principais conceitos e teorias que embasam a pesquisa. Cite autores de referência na área (ex: SOBRENOME, Nome. Título da obra. Cidade: Editora, Ano.).

## Estado da Arte
Discuta os trabalhos relacionados mais recentes e como eles se posicionam em relação à sua pesquisa.

# METODOLOGIA
Descreva o tipo de pesquisa (qualitativa, quantitativa, experimental), os instrumentos utilizados, os critérios de coleta de dados e o método de análise.

# RESULTADOS E DISCUSSÃO
Apresente os dados coletados e discuta os achados à luz do referencial teórico. Use tabelas, gráficos ou figuras quando necessário (indicando a fonte conforme ABNT).

# CONCLUSÃO
Sintetize as principais descobertas, retome os objetivos iniciais e indique as contribuições do trabalho. Aponte limitações e sugestões para trabalhos futuros.

# REFERÊNCIAS
SOBRENOME, Nome. Título do livro em itálico: subtítulo. Edição. Cidade: Editora, Ano.
SOBRENOME, Nome. Título do artigo. Nome do Periódico, Cidade, v. N, n. N, p. XX-XX, Mês Ano.
`;

/** Verifica se o conteúdo é o template intacto ou está vazio */
export const isEmptyOrTemplate = (content: string): boolean => {
  return content.trim() === '' || content.trim() === ABNT_TEMPLATE.trim();
};

/** Tipos de seção reconhecidos pelo title */
const SECTION_TYPE_MAP: Record<string, string> = {
  'INTRODUÇÃO': 'introducao',
  'INTRODUCAO': 'introducao',
  'CONCLUSÃO': 'conclusao',
  'CONCLUSAO': 'conclusao',
  'REFERÊNCIAS': 'referencias',
  'REFERENCIAS': 'referencias',
};

function normalizeSectionType(title: string): string {
  const upper = title.toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  for (const [key, type] of Object.entries(SECTION_TYPE_MAP)) {
    if (upper.includes(key)) return type;
  }
  return 'desenvolvimento';
}

export interface ParsedSection {
  type: string;
  title: string;
  content: string;
  subsections: Array<{ title: string; content: string }>;
}

/**
 * Parseia o texto do editor extraindo seções (`# TÍTULO`) e
 * subseções (`## Subtítulo`) estruturadas.
 *
 * Retorna `null` se o texto não contiver nenhum marcador `#` —
 * nesse caso o backend usa o Gemini normalmente como fallback.
 */
export function parseAbntMarkers(rawText: string): ParsedSection[] | null {
  const lines = rawText.split('\n');
  const sections: ParsedSection[] = [];
  let currentSection: ParsedSection | null = null;
  let currentSubsection: { title: string; content: string } | null = null;
  let hasAnyMarker = false;

  const flushSubsection = () => {
    if (currentSubsection && currentSection) {
      currentSection.subsections.push({
        title: currentSubsection.title,
        content: currentSubsection.content.trim(),
      });
      currentSubsection = null;
    }
  };

  const flushSection = () => {
    flushSubsection();
    if (currentSection) {
      currentSection.content = currentSection.content.trim();
      sections.push(currentSection);
      currentSection = null;
    }
  };

  for (const line of lines) {
    if (line.startsWith('## ')) {
      hasAnyMarker = true;
      flushSubsection();
      const subTitle = line.replace(/^## /, '').trim();
      currentSubsection = { title: subTitle, content: '' };
    } else if (line.startsWith('# ')) {
      hasAnyMarker = true;
      flushSection();
      const title = line.replace(/^# /, '').trim();
      currentSection = {
        type: normalizeSectionType(title),
        title: title.toUpperCase(),
        content: '',
        subsections: [],
      };
    } else {
      if (currentSubsection) {
        currentSubsection.content += line + '\n';
      } else if (currentSection) {
        currentSection.content += line + '\n';
      }
    }
  }

  flushSection();

  if (!hasAnyMarker || sections.length === 0) return null;
  return sections;
}
```

---

## Tarefa 3 — Atualizar o editor em `app/research-lab/page.tsx`

### 3a. Importar o template e o parser

No topo do arquivo, adicione:
```typescript
import { ABNT_TEMPLATE, parseAbntMarkers, isEmptyOrTemplate } from '@/lib/abntTemplate';
```

### 3b. Pré-carregar o template no estado inicial

Localize a declaração do estado `docContent`. Mude o valor inicial de `''` ou `''` para:
```typescript
const [docContent, setDocContent] = useState<string>(ABNT_TEMPLATE);
```

> Se o estado for inicializado em outro lugar (ex: `useEffect` de carregamento de rascunho salvo), mantenha a lógica existente e aplique o template apenas quando `savedContent` estiver vazio/null.

### 3c. Adicionar barra de dica colapsável (HintBar)

**Imediatamente acima do `<textarea>`** (linha ~1215), insira este componente inline:

```tsx
{/* ── ABNT HINT BAR ── */}
{(() => {
  const [hintOpen, setHintOpen] = useState(true);
  // Só mostra se o conteúdo ainda é o template ou está vazio
  if (!isEmptyOrTemplate(docContent) && !hintOpen) return null;
  return (
    <div className="mx-12 mb-4 rounded-2xl border border-indigo-200 dark:border-indigo-500/30 bg-indigo-50/80 dark:bg-indigo-950/40 overflow-hidden text-left">
      <button
        onClick={() => setHintOpen(h => !h)}
        className="w-full flex items-center justify-between px-5 py-3 text-[11px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400"
      >
        <span className="flex items-center gap-2">
          <SparklesIcon className="w-3.5 h-3.5" />
          Como escrever na Zaeon para exportação ABNT automática
        </span>
        <span>{hintOpen ? '▲' : '▼'}</span>
      </button>
      {hintOpen && (
        <div className="px-5 pb-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-[11px] text-indigo-700 dark:text-indigo-300 leading-relaxed">
          <div className="flex flex-col gap-1">
            <span className="font-black">① Use # para seções principais</span>
            <code className="bg-indigo-100 dark:bg-indigo-900/50 rounded-lg px-2 py-1 font-mono text-[10px]"># INTRODUÇÃO</code>
            <code className="bg-indigo-100 dark:bg-indigo-900/50 rounded-lg px-2 py-1 font-mono text-[10px]"># METODOLOGIA</code>
            <code className="bg-indigo-100 dark:bg-indigo-900/50 rounded-lg px-2 py-1 font-mono text-[10px]"># CONCLUSÃO</code>
            <span className="text-indigo-500 dark:text-indigo-400 text-[10px]">Títulos ficam em MAIÚSCULAS automaticamente.</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="font-black">② Use ## para subseções</span>
            <code className="bg-indigo-100 dark:bg-indigo-900/50 rounded-lg px-2 py-1 font-mono text-[10px]">## Revisão da Literatura</code>
            <code className="bg-indigo-100 dark:bg-indigo-900/50 rounded-lg px-2 py-1 font-mono text-[10px]">## Análise dos Dados</code>
            <span className="text-indigo-500 dark:text-indigo-400 text-[10px]">Subseções recebem numeração automática (ex: 2.1).</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="font-black">③ Escreva as referências em # REFERÊNCIAS</span>
            <span className="text-indigo-500 dark:text-indigo-400 text-[10px]">O sistema detecta e formata cada entrada conforme ABNT NBR 6023:2018. Uma referência por linha.</span>
            <span className="mt-1 font-black text-green-600 dark:text-green-400">✓ Estruturado → exportação ABNT perfeita</span>
            <span className="font-black text-amber-600 dark:text-amber-400">⚠ Sem marcadores → IA tenta inferir (pode errar)</span>
          </div>
        </div>
      )}
    </div>
  );
})()}
```

> **Nota:** O `useState` dentro de um IIFE não funciona em React. Ao invés disso, extraia o HintBar como um sub-componente separado no mesmo arquivo, acima do componente principal, ou use um estado no componente pai como `const [hintOpen, setHintOpen] = useState(true)`.

**Corrija isso**: declare `const [hintOpen, setHintOpen] = useState(true)` no corpo do componente principal e use a variável diretamente no JSX.

### 3d. Atualizar o handler de exportação ABNT

Localize a função que constrói o body para `POST /api/documents/abnt-export`.

Antes de enviar, tente parsear os marcadores:

```typescript
// Tenta parsear marcadores estruturados do editor
const parsedSections = parseAbntMarkers(docContent);

const body = {
  title: docTitle,
  content: docContent,          // continua enviando o texto bruto (fallback Gemini)
  // Se parseAbntMarkers retornou seções, passa como hint para o backend
  // O backend precisará aceitar `parsedSections` opcional (Tarefa 4)
  parsedSections: parsedSections ?? undefined,
  workType,
  citations,
  author: /* estado existente */,
  institution: /* estado existente */,
  // ... demais campos existentes
};
```

---

## Tarefa 4 — Atualizar a route `/api/documents/abnt-export/route.ts`

### 4a. Estender a interface `ABNTExportRequest`

```typescript
interface ABNTExportRequest {
  // ... campos existentes ...
  parsedSections?: Array<{
    type: string;
    title: string;
    content: string;
    subsections: Array<{ title: string; content: string }>;
  }>;
}
```

### 4b. Usar `parsedSections` como fast-path

Na função `POST`, antes de chamar `structureWithGemini`:

```typescript
let structured;

// Fast-path: front já parseou os marcadores → pula o Gemini para estruturação
if (body.parsedSections && body.parsedSections.length > 0) {
  const hasIntro = body.parsedSections.some(s => s.type === 'introducao');
  const hasConclusion = body.parsedSections.some(s => s.type === 'conclusao');
  const hasRefs = body.parsedSections.some(s => s.type === 'referencias');

  // Ainda usa Gemini só para gerar resumo e palavras-chave
  let resumo = '';
  let palavras_chave: string[] = [];
  try {
    const meta = await generateMetaWithGemini(body);
    resumo = meta.resumo;
    palavras_chave = meta.palavras_chave;
  } catch {
    resumo = body.content.substring(0, 500);
    palavras_chave = ['Pesquisa', 'Acadêmico', 'Zaeon'];
  }

  structured = {
    resumo,
    palavras_chave,
    sections: body.parsedSections,
    validation: {
      has_introduction: hasIntro,
      has_conclusion: hasConclusion,
      has_references: hasRefs,
      warnings: !hasIntro ? ['Seção de Introdução não encontrada.'] :
                !hasConclusion ? ['Seção de Conclusão não encontrada.'] : [],
    },
  };
} else {
  // Fallback: Gemini faz tudo (comportamento atual)
  try {
    structured = await structureWithGemini(body);
  } catch (err) {
    // ... fallback existente ...
  }
}
```

### 4c. Extrair `generateMetaWithGemini`

Refatore `structureWithGemini` para que ela possa ser chamada em modo `meta-only` (apenas resumo + palavras-chave), quando as seções já vêm do front. Você pode adicionar um parâmetro opcional `metaOnly: boolean` e adaptar o prompt do Gemini.

---

## Tarefa 5 — Enriquecer o prompt do Gemini

Na função `structureWithGemini`, atualize a `abntStructurerPersona` para incluir:

```
DICA: O texto pode conter marcadores explícitos no formato:
  # TÍTULO DA SEÇÃO (seção principal)
  ## Título da Subseção (subseção)
Quando presentes, USE-OS como delimitadores de seção em vez de inferir pelo conteúdo.
```

---

## Tarefa 6 — Verificações finais

Após implementar tudo, execute:

```bash
# Typecheck
npx tsc --noEmit

# Lint
npx eslint app/research-lab/page.tsx lib/abntTemplate.ts app/api/documents/abnt-export/route.ts --fix

# Build (garante que nada quebrou)
npm run build
```

Se qualquer erro de tipo aparecer relacionado ao `parsedSections`, corrija a tipagem em `ABNTExportRequest` para que o campo seja `optional` com `?`.

---

## Tarefa 7 — Criar a PR

```bash
git checkout -b feat/abnt-structured-editor-template

git add lib/abntTemplate.ts
git add app/research-lab/page.tsx
git add app/api/documents/abnt-export/route.ts

git commit -m "feat(research): add ABNT structured template + didactic first-run UX

- Add lib/abntTemplate.ts with ABNT_TEMPLATE constant, parseAbntMarkers()
  and isEmptyOrTemplate() utilities
- Pre-load structured ABNT template (# sections, ## subsections) as default
  docContent in research editor
- Add collapsible HintBar above textarea explaining the # / ## syntax to users
- Extend ABNTExportRequest with optional parsedSections[] field
- Add fast-path in abnt-export route: skips Gemini section detection when
  front-end already parsed structured markers (uses Gemini only for meta)
- Enrich Gemini structurer prompt to recognize explicit # markers as fallback
- Zero breaking changes: free-text mode still falls through to Gemini

Closes #<ISSUE_NUMBER>"

git push origin feat/abnt-structured-editor-template
```

Em seguida, abra a PR no GitHub com o título:
`feat(research): ABNT structured editor template + didactic first-run UX`

E description:

```markdown
## O que muda
- O editor de pesquisa abre com um template ABNT pré-estruturado na primeira vez
- Usuário aprende a escrever com `# SEÇÃO` e `## Subseção` via HintBar colapsável
- O front parseia os marcadores e envia `parsedSections[]` ao backend
- Backend usa fast-path quando as seções já vêm estruturadas (menos latência, menos custo de tokens)
- Gemini ainda é chamado como fallback para textos livres e para gerar resumo/palavras-chave

## Comportamento esperado (novo usuário)
1. Abre o Research Lab → vê o template ABNT com 6 seções pré-definidas
2. HintBar explica a sintaxe `#` / `##` em 3 colunas didáticas
3. Edita o template → escreve a pesquisa
4. Clica em "Salvar" → exportação ABNT precisa sem depender 100% da inferência IA

## Sem breaking changes
- Usuários que já têm rascunhos salvos não são afetados (estado carregado do DB sobrescreve o template)
- Textos sem marcadores continuam funcionando via Gemini como antes
```

---

## Restrições importantes

- **NÃO altere** `abnt-service/` (Python) — as mudanças são só no Node/Next.js
- **NÃO remova** nenhuma funcionalidade existente (chat, PDF viewer, Scribe, etc.)
- **Mantenha** o mesmo design visual (glassmorphism, dark mode, tokens Tailwind existentes)
- **Use** apenas os ícones já importados em `page.tsx` (ex: `SparklesIcon` já existe)
- O `hintOpen` state DEVE ser declarado no corpo do componente React, não dentro de JSX

---

## Resumo da árvore de arquivos modificados

```
zaeon-os/
├── lib/
│   └── abntTemplate.ts          ← NOVO
├── app/
│   ├── research-lab/
│   │   └── page.tsx             ← MODIFICADO (template, HintBar, handler)
│   └── api/documents/
│       └── abnt-export/
│           └── route.ts         ← MODIFICADO (parsedSections fast-path)
```
