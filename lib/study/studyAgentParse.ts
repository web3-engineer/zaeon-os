/**
 * Parse + validação puros do worker generativo /api/study/agent.
 *
 * Isolado da rota para ser testável em node e para endurecer a leitura do JSON do
 * Gemini (que às vezes vem com prosa em volta, fences ou vírgula sobrando). Saída
 * degenerada (vazio / só título) vira `null` — a rota trata isso como falha e NÃO
 * cacheia, evitando "estudo vazio" preso por 7 dias.
 */
export type StudyBlock = { kind: "heading" | "subheading" | "text" | "link"; text: string; url?: string };
export type Study = { title: string; blocks: StudyBlock[] };

const KINDS = ["heading", "subheading", "text", "link"] as const;

/** Lê o 1º objeto JSON balanceado de `raw` (ignora fences e prosa em volta). null se não houver. */
export function extractJson(raw: string): any | null {
  if (!raw) return null;
  const s = raw.replace(/```json/gi, "").replace(/```/g, "").trim();
  if (!s) return null;
  try { return JSON.parse(s); } catch { /* tenta o objeto balanceado abaixo */ }
  const start = s.indexOf("{");
  if (start < 0) return null;
  let depth = 0, inStr = false, esc = false;
  for (let i = start; i < s.length; i++) {
    const c = s[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === "\\") esc = true;
      else if (c === '"') inStr = false;
    } else if (c === '"') inStr = true;
    else if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) {
        try { return JSON.parse(s.slice(start, i + 1)); } catch { return null; }
      }
    }
  }
  return null;
}

/** Normaliza os blocos vindos do modelo (filtra vazios, limita kinds/url/tamanho). */
export function normalizeBlocks(parsed: any): StudyBlock[] {
  return (Array.isArray(parsed?.blocks) ? parsed.blocks : [])
    .filter((b: any) => b && typeof b.text === "string" && b.text.trim())
    .slice(0, 14)
    .map((b: any) => {
      const kind: StudyBlock["kind"] = KINDS.includes(b.kind) ? b.kind : "text";
      const out: StudyBlock = { kind, text: String(b.text).slice(0, 1200) };
      if (kind === "link" && typeof b.url === "string" && /^https?:\/\//i.test(b.url)) out.url = b.url;
      return out;
    });
}

/** Um "estudo de verdade": >= 3 blocos e ao menos 1 parágrafo de corpo real. */
export function isRealStudy(blocks: StudyBlock[]): boolean {
  if (!Array.isArray(blocks) || blocks.length < 3) return false;
  return blocks.some((b) => b.kind === "text" && b.text.trim().length >= 40);
}

/** raw do modelo -> estudo pronto, ou null quando a saída é degenerada/inparseável. */
export function buildStudy(raw: string, command: string): Study | null {
  const parsed = extractJson(raw);
  if (!parsed) return null;
  const title = typeof parsed.title === "string" ? parsed.title.slice(0, 120) : command.slice(0, 120);
  const blocks = normalizeBlocks(parsed);
  if (!blocks.some((b) => b.kind === "heading")) blocks.unshift({ kind: "heading", text: title });
  if (!isRealStudy(blocks)) return null;
  return { title, blocks };
}
