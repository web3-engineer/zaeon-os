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







# REFERENCIAL TEÓRICO

## Conceitos Fundamentais





## Estado da Arte






# METODOLOGIA







# RESULTADOS E DISCUSSÃO







# CONCLUSÃO







# REFERÊNCIAS



`;

// ─── TEMPLATES POR TIPO DE TRABALHO ──────────────────────────────────────────
// Cada formato é uma SESSÃO própria, com seu próprio esqueleto de seções. O
// framework (as divisões do trabalho) mora AQUI — o esboço gerado só preenche o
// miolo, sem repetir as regras/seções (essas vêm prontas do template).
export type WorkType = 'Artigo' | 'Relatório' | 'TCC';

interface SectionDef { title: string; subs?: string[]; }

export const WORK_SECTIONS: Record<WorkType, SectionDef[]> = {
  TCC: [
    { title: 'INTRODUÇÃO' },
    { title: 'REFERENCIAL TEÓRICO', subs: ['Conceitos Fundamentais', 'Estado da Arte'] },
    { title: 'METODOLOGIA' },
    { title: 'RESULTADOS E DISCUSSÃO' },
    { title: 'CONCLUSÃO' },
    { title: 'REFERÊNCIAS' },
  ],
  Artigo: [
    { title: 'RESUMO' },
    { title: 'INTRODUÇÃO' },
    { title: 'METODOLOGIA' },
    { title: 'RESULTADOS E DISCUSSÃO' },
    { title: 'CONSIDERAÇÕES FINAIS' },
    { title: 'REFERÊNCIAS' },
  ],
  'Relatório': [
    { title: 'INTRODUÇÃO' },
    { title: 'OBJETIVOS' },
    { title: 'DESENVOLVIMENTO' },
    { title: 'RESULTADOS' },
    { title: 'CONCLUSÃO' },
    { title: 'REFERÊNCIAS' },
  ],
};

function renderSections(secs: SectionDef[], byTitle?: Record<string, string>): string {
  return secs.map((s) => {
    const body = byTitle?.[s.title]?.trim();
    let block = `# ${s.title}\n\n${body ? body + '\n\n' : '\n\n\n'}`;
    if (s.subs) for (const sub of s.subs) block += `## ${sub}\n\n\n\n`;
    return block;
  }).join('\n');
}

/** Esqueleto vazio do tipo (TCC = ABNT_TEMPLATE clássico). */
export function templateFor(workType?: WorkType | null): string {
  if (!workType) return ABNT_TEMPLATE;
  if (workType === 'TCC') return ABNT_TEMPLATE; // mantém o template TCC original
  // #873: tipo sem modelo próprio (ex.: "Peça jurídica", que vem do chat) → o modelo clássico, em vez de quebrar
  const secoes = WORK_SECTIONS[workType];
  return secoes ? renderSections(secoes) : ABNT_TEMPLATE;
}

/** Campos do esboço gerado pelo motor de pesquisa (research-draft). */
export interface DraftFields {
  resumo?: string;
  palavrasChave?: string;
  introducao?: string;
  objetivos?: string;
  justificativa?: string;
  metodologia?: string;
  referencias?: string;
}

/**
 * Cruza o esboço gerado com o framework do tipo escolhido: preenche o MIOLO das
 * seções existentes (sem inventar/duplicar seções). Objetivos e Justificativa
 * caem na Introdução quando o tipo não tem seção própria pra eles.
 */
export function buildDocFromDraft(workType: WorkType | null | undefined, f: DraftFields): string {
  const secs = WORK_SECTIONS[(workType ?? 'TCC') as WorkType] ?? WORK_SECTIONS.TCC;
  const titles = secs.map((s) => s.title);
  const has = (t: string) => titles.includes(t);
  const content: Record<string, string> = {};

  const kw = f.palavrasChave?.trim() ? `\n\nPalavras-chave: ${f.palavrasChave.trim()}` : '';
  if (has('RESUMO') && f.resumo?.trim()) content['RESUMO'] = f.resumo.trim() + kw;

  const intro: string[] = [];
  if (f.resumo?.trim() && !has('RESUMO')) intro.push(f.resumo.trim());
  if (f.introducao?.trim()) intro.push(f.introducao.trim());
  if (!has('OBJETIVOS') && f.objetivos?.trim()) intro.push('Objetivos: ' + f.objetivos.trim());
  if (f.justificativa?.trim()) intro.push('Justificativa (lacuna): ' + f.justificativa.trim());
  if (intro.length && has('INTRODUÇÃO')) content['INTRODUÇÃO'] = intro.join('\n\n');

  if (has('OBJETIVOS') && f.objetivos?.trim()) content['OBJETIVOS'] = f.objetivos.trim();
  if (has('METODOLOGIA') && f.metodologia?.trim()) content['METODOLOGIA'] = f.metodologia.trim();
  if (has('REFERÊNCIAS') && f.referencias?.trim()) content['REFERÊNCIAS'] = f.referencias.trim();

  return renderSections(secs, content);
}

/** Verifica se o conteúdo é vazio ou um dos templates intactos (qualquer tipo). */
export const isEmptyOrTemplate = (content: string): boolean => {
  const c = content.trim();
  if (c === '' || c === ABNT_TEMPLATE.trim()) return true;
  return (['Artigo', 'Relatório', 'TCC'] as WorkType[]).some((w) => templateFor(w).trim() === c);
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
