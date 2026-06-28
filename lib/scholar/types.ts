// Normalized paper from any source
export interface Paragraph {
  idx: number;
  page?: number;     // present for PDF-extracted text
  section?: string;  // present for structured full-text
  text: string;
}

// Bloco estruturado (pdf-loader): tipo + posição na página → citação rastreável.
export interface Block {
  type: "heading" | "paragraph" | "table" | "figure";
  page?: number;
  bbox?: [number, number, number, number]; // [left, bottom, right, top] em pontos PDF
  text: string;
}

export interface RetrievedText {
  kind: "pdf" | "fulltext" | "abstract";
  paragraphs: Paragraph[];
  markdown?: string; // texto estruturado (títulos/tabelas) — alimenta o LLM
  blocks?: Block[];  // blocos com bbox/página — clique → fonte no PDF
}

export interface Paper {
  id: string;            // stable internal id (doi or arxiv or source:externalId)
  title: string;
  authors: string[];
  year?: number;
  venue?: string;
  doi?: string;
  arxivId?: string;
  url?: string;
  pdfUrl?: string;
  abstract?: string;
  citationCount?: number;
  openAccess: boolean;
  sources: string[];     // which APIs returned it
  retrievedText?: RetrievedText;
}

export type Locator =
  | { kind: "pdf"; page: number; paragraph?: number }
  | { kind: "fulltext"; section?: string; paragraph: number }
  | { kind: "abstract"; sentence?: number };

export interface EvidenceRecord {
  paperId: string;
  claim: string;
  quote: string;
  locator?: Locator;
  confidence: "high" | "medium" | "low";
  verified: boolean;
  fullTextAvailable: boolean;
}

export interface ScholarPayload {
  query: string;
  domain?: string;
  answer: string;
  references: Paper[];
  evidence: EvidenceRecord[];
  insights: { summary: string; trends: string[]; contradictions: string[] };
  gaps: { description: string; rqCards: string[] };
  files: { name: string; kind: string; content: string }[];
}

// Shape the LLM returns (before deterministic verification). Lives here so both
// synthesize.ts and assemble.ts can import it without an ordering dependency.
export interface RawSynthesis {
  answer: string;
  evidence: { paperId: string; claim: string; quote: string; confidence: "high" | "medium" | "low" }[];
  insights: { summary: string; trends: string[]; contradictions: string[] };
  gaps: { description: string; rqCards: string[] };
}

// NDJSON stream events (server → client)
export type ScholarEvent =
  | { type: "session"; sessionId: string }
  | { type: "phase"; phase: "planning"; message: string }
  | { type: "phase"; phase: "searching"; source: string; count: number; message?: string }
  | { type: "phase"; phase: "dedup"; unique: number; fulltext: number; message?: string }
  | { type: "phase"; phase: "synthesizing"; message?: string }
  | { type: "phase"; phase: "verifying"; checked: number; verified: number; dropped: number; message?: string }
  | { type: "answer"; text: string }
  | { type: "done"; session: any }
  | { type: "error"; message: string };

// --- Suggestion Forge (engine 8003) — ver suggestion-forge/engine_spec.md §2 ---
export type AcademicLevel = "grad" | "msc" | "phd" | "postdoc";
export type QualityTier = "regular" | "muito_bom" | "excelente" | "excepcional";
export type GapType = "empirica" | "metodologica" | "geografica" | "temporal" | "interdisciplinar";

export interface SuggestionAxes {
  difficulty: AcademicLevel;
  relevance: number;
  innovation: number;
  estimated_months_min: number;
  estimated_months_max: number;
}

export interface SuggestionDesdobramento {
  publication_targets: string[];
  required_methods: string[];
  material_resources: string[];
  prerequisites: string[];
  risks: string[];
  milestones: string[];
  evidence_refs: number[];
  cross_link_refs: number[];
}

export interface Suggestion {
  id: string;
  title: string;
  rationale: string;
  novelty_angle: string;
  gap_type: GapType;
  gap_score: number;
  axes: SuggestionAxes;
  quality_tier: QualityTier;
  desdobramentos: SuggestionDesdobramento;
}

export interface ForgeResponse {
  suggestions: Suggestion[];
  coverage_summary: string;
  generated_at: string;
  gemini_overconfidence_count?: number;
}
