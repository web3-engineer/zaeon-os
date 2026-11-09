/**
 * lib/orquestra/elenco.ts — os AGENTES DA CASA no console (docs/HERMES_ZAEON.md · GET /agentes).
 *
 * O painel mostrava a Aura e os motores da orquestra. Mas quem atende aluno todo dia são as personas
 * (Zaeon, Aura, Nina, Zenita, Eiffel, Davi, Caio, Téo…), os 17 mentores e os agentes criados no admin.
 * Esta lista junta TODOS, com o que cada um é e o que fez em produção:
 *
 *  - identidade: o roster (lib/agents/roster), que já é a fonte única de quem existe, com o
 *    AgentProfile e o MentorTemplate do banco por cima;
 *  - o que sabe fazer: lib/agents/capacidades (agentes do chat) e as skills do mentor;
 *  - onde trabalha: lib/agents/chatAgentes (chat do lab, IDE, plugado pela Loja);
 *  - o que leu e fez: o TokenLedger, por `agentKey` (é a chave que o runChatTurn grava).
 *
 * Chave do ledger que nenhum agente reclama (ex.: "sistema") vira uma linha `tipo: "sistema"`: o console
 * não esconde gasto. PURA: recebe as linhas, devolve a lista — testável sem banco.
 */
import { rosterComMentores, mergeProfiles, type AgentProfileLike, type MentorRowLike } from "@/lib/agents/roster";
import { AGENTES_CHAT, type AgenteChatId } from "@/lib/agents/chatAgentes";
import { CAPACIDADES, habilidadesDoTurno, toolsPermitidas } from "@/lib/agents/capacidades";
import { MENTOR_SEED, RUNTIME_SKILLS, mentorPersonaText, type MentorSkill, type MentorLike } from "@/lib/agent/mentors";
import { PERSONAS, buildPersona } from "@/lib/ai/personas";
import { areasDoTurno } from "@/lib/rag/areas";

export type LinhaLedgerAgente = {
  at: Date | string; agentKey: string; model: string; surface: string; phase?: string | null;
  ok: boolean; erro?: string | null; ms: number; totalTokens: number; estimatedCostUsd: number; taskId?: string | null;
};

export type MentorDb = MentorRowLike & Partial<Pick<MentorLike, "signatureArtifacts" | "sources" | "guardrail" | "academicLevel">> & { enabledSkills?: string[] };

export type UsoAgente = {
  janelaDias: number;
  chamadas: number; falhas: number; taxaFalha: number; turnos: number;
  msP50: number; msP90: number; tokens: number; custoUsd: number; ultimo: string | null;
  modelos: Array<{ modelo: string; chamadas: number }>;
  superficies: Array<{ superficie: string; chamadas: number }>;
  erros: Array<{ erro: string; chamadas: number }>;
  porDia: Array<{ dia: string; chamadas: number; falhas: number }>;
};

export type AgenteDaCasa = {
  id: string;
  nome: string;
  tipo: "persona" | "mentor" | "custom" | "sistema";
  emoji: string;
  bio: string;
  curso: string | null;
  ativo: boolean;
  conversacional: boolean;
  /** onde o aluno encontra: "chat do lab", "IDE", "Loja (octa-code)", "mentor plugável"… */
  ondeTrabalha: string[];
  plugin: string | null;
  distincao: string | null;
  habilidades: string[];
  /** declaradas mas que o runtime ainda não resolve (a persona fica, o artefato espera) */
  habilidadesDegradadas: string[];
  ferramentas: string[];
  /** ids do catálogo de datasets do painel (rag:area:<slug>) */
  datasets: string[];
  protocolo: { ensemble: number; reflexoes: number; porque: string } | null;
  artefatos: string[];
  fontes: string[];
  guardrail: string | null;
  nivel: string | null;
  /** chaves do TokenLedger somadas nesta linha */
  chavesLedger: string[];
  prompt: string;
  uso: UsoAgente;
};

const pct = (xs: number[], p: number) => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.min(s.length - 1, Math.floor(s.length * p))] : 0; };
const taxa = (a: number, b: number) => (b ? Math.round((a / b) * 10_000) / 10_000 : 0);
const r6 = (n: number) => Math.round(n * 1e6) / 1e6;
const topo = (m: Map<string, number>, n = 6) => [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n);
const somar = (m: Map<string, number>, k: string) => m.set(k, (m.get(k) ?? 0) + 1);

/** PURA: o uso de um agente nas linhas do ledger (já filtradas pelas chaves dele). */
export function usoDe(linhas: LinhaLedgerAgente[], janelaDias: number): UsoAgente {
  const modelos = new Map<string, number>(), superficies = new Map<string, number>(), erros = new Map<string, number>();
  const dias = new Map<string, { chamadas: number; falhas: number }>();
  const turnos = new Set<string>();
  let tokens = 0, custo = 0, ultimo: string | null = null;
  const msOk: number[] = [];
  for (const l of linhas) {
    somar(modelos, l.model); somar(superficies, l.surface || "outro");
    if (!l.ok) somar(erros, l.erro || "desconhecido"); else msOk.push(l.ms || 0);
    tokens += l.totalTokens || 0; custo += l.estimatedCostUsd || 0;
    if (l.taskId) turnos.add(l.taskId);
    const iso = new Date(l.at).toISOString();
    if (!ultimo || iso > ultimo) ultimo = iso;
    const d = dias.get(iso.slice(0, 10)) ?? { chamadas: 0, falhas: 0 };
    d.chamadas++; if (!l.ok) d.falhas++; dias.set(iso.slice(0, 10), d);
  }
  const falhas = linhas.length - msOk.length;
  return {
    janelaDias, chamadas: linhas.length, falhas, taxaFalha: taxa(falhas, linhas.length), turnos: turnos.size,
    msP50: pct(msOk, 0.5), msP90: pct(msOk, 0.9), tokens, custoUsd: r6(custo), ultimo,
    modelos: topo(modelos).map(([modelo, chamadas]) => ({ modelo, chamadas })),
    superficies: topo(superficies).map(([superficie, chamadas]) => ({ superficie, chamadas })),
    erros: topo(erros).map(([erro, chamadas]) => ({ erro, chamadas })),
    porDia: [...dias.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([dia, v]) => ({ dia, ...v })),
  };
}

const datasetsDe = (area: string | null | undefined) => areasDoTurno(area).map((a) => `rag:${a}`);
const degradadas = (hs: readonly string[]) => hs.filter((h) => !RUNTIME_SKILLS.has(h as MentorSkill));

/**
 * PURA: o elenco inteiro. `mentores` e `perfis` vêm do banco (podem vir vazios: aí vale o seed);
 * `ledger` são as linhas da janela.
 */
export function montarElenco(e: {
  mentores?: MentorDb[];
  perfis?: AgentProfileLike[];
  ledger?: LinhaLedgerAgente[];
  janelaDias?: number;
}): AgenteDaCasa[] {
  const janela = e.janelaDias ?? 7;
  const mentoresDb = e.mentores ?? [];
  const roster = mergeProfiles(rosterComMentores(mentoresDb), e.perfis ?? []);
  const porChave = new Map<string, LinhaLedgerAgente[]>();
  for (const l of e.ledger ?? []) (porChave.get(l.agentKey) ?? porChave.set(l.agentKey, []).get(l.agentKey)!).push(l);

  // Agentes do CHAT (o rosto do lab) — os orq-* ficam no painel de motores, não aqui.
  const doChat = AGENTES_CHAT.filter((a) => !a.id.startsWith("orq-"));
  const chatPorId = new Map(doChat.map((a) => [a.id as string, a]));
  const reclamadas = new Set<string>();

  const linha = (base: Omit<AgenteDaCasa, "uso" | "chavesLedger">, chaves: string[]): AgenteDaCasa => {
    chaves.forEach((k) => reclamadas.add(k));
    return { ...base, chavesLedger: chaves, uso: usoDe(chaves.flatMap((k) => porChave.get(k) ?? []), janela) };
  };

  const out: AgenteDaCasa[] = [];
  for (const a of roster) {
    const chat = chatPorId.get(a.agentKey);
    const cap = chat ? CAPACIDADES[chat.id as keyof typeof CAPACIDADES] : undefined;
    const persona = PERSONAS[a.agentKey];
    if (a.tipo === "mentor") {
      const db = mentoresDb.find((m) => m.slug === a.agentKey);
      const seed = MENTOR_SEED.find((m) => m.slug === a.agentKey);
      const skills = ((db?.enabledSkills?.length ? db.enabledSkills : seed?.enabledSkills) ?? []) as MentorSkill[];
      const hs = habilidadesDoTurno({ agente: "aura", habilidadesDoMentor: skills });
      const fonte: MentorLike | null = seed || db
        ? {
            name: a.nome, course: a.curso ?? db?.course ?? seed?.course ?? "",
            personaText: db?.personaText ?? seed?.personaText ?? "",
            signatureArtifacts: db?.signatureArtifacts ?? seed?.signatureArtifacts ?? [],
            academicLevel: (db?.academicLevel ?? seed?.academicLevel ?? "graduacao") as MentorLike["academicLevel"],
            guardrail: db?.guardrail ?? seed?.guardrail, sources: db?.sources ?? seed?.sources,
          }
        : null;
      out.push(linha({
        id: a.agentKey, nome: a.nome, tipo: a.custom ? "custom" : "mentor", emoji: a.emoji, bio: a.bio, curso: a.curso ?? null,
        ativo: a.ativo, conversacional: a.conversacional,
        ondeTrabalha: ["mentor plugável (Assistentes)", "chat com a voz da Aura"], plugin: null,
        distincao: a.curso ? `Mentor de ${a.curso}` : null,
        habilidades: [...hs], habilidadesDegradadas: degradadas(skills), ferramentas: [...toolsPermitidas(hs)].sort(),
        datasets: datasetsDe(a.agentKey), protocolo: CAPACIDADES.aura.protocolo,
        artefatos: fonte?.signatureArtifacts ?? [], fontes: fonte?.sources ?? [], guardrail: fonte?.guardrail ?? null,
        nivel: fonte?.academicLevel ?? null, prompt: fonte ? mentorPersonaText(fonte) : "",
      }, [a.agentKey]));
      continue;
    }
    // persona (ou custom criado no admin)
    const hs = cap?.habilidades ?? [];
    out.push(linha({
      id: a.agentKey, nome: a.nome, tipo: a.custom ? "custom" : "persona", emoji: a.emoji, bio: a.bio, curso: a.curso ?? null,
      ativo: a.ativo, conversacional: a.conversacional,
      ondeTrabalha: chat ? [chat.tela === "ide" ? "IDE do lab" : "chat do lab", ...(chat.plugin ? [`Loja (${chat.plugin})`] : [])]
        : a.conversacional ? ["canal coworking (@menção)"] : ["interno (formata saída)"],
      plugin: chat?.plugin ?? null, distincao: cap?.distincao ?? persona?.role ?? null,
      habilidades: [...hs], habilidadesDegradadas: degradadas(hs),
      ferramentas: cap ? [...toolsPermitidas(hs)].sort() : [],
      datasets: cap ? datasetsDe(cap.area) : [], protocolo: cap?.protocolo ?? null,
      artefatos: [], fontes: [], guardrail: null, nivel: null,
      prompt: persona ? buildPersona(a.agentKey) : "",
    }, [a.agentKey]));
  }

  // Agente do chat sem linha no roster (o Octa: a voz é da Aura, mas o cargo e o ledger são dele).
  for (const chat of doChat) {
    if (out.some((x) => x.id === chat.id)) continue;
    const cap = CAPACIDADES[chat.id as Exclude<AgenteChatId, `orq-${string}`> as keyof typeof CAPACIDADES];
    const hs = cap?.habilidades ?? [];
    out.push(linha({
      id: chat.id, nome: chat.nome, tipo: "persona", emoji: "⟁", bio: chat.papel, curso: null, ativo: true, conversacional: true,
      ondeTrabalha: [chat.tela === "ide" ? "IDE do lab" : "chat do lab", ...(chat.plugin ? [`Loja (${chat.plugin})`] : [])],
      plugin: chat.plugin ?? null, distincao: cap?.distincao ?? null,
      habilidades: [...hs], habilidadesDegradadas: degradadas(hs), ferramentas: [...toolsPermitidas(hs)].sort(),
      datasets: datasetsDe(cap?.area), protocolo: cap?.protocolo ?? null,
      artefatos: [], fontes: [], guardrail: null, nivel: null,
      prompt: cap ? buildPersona(cap.persona) : "",
    }, [chat.id]));
  }

  // Gasto que nenhum agente reclama: aparece, com o nome da chave.
  for (const [k] of topo(new Map([...porChave.entries()].filter(([k]) => !reclamadas.has(k)).map(([k, v]) => [k, v.length])), 50)) {
    out.push(linha({
      id: k, nome: k, tipo: "sistema", emoji: "⚙", bio: "Chamadas de modelo gravadas com esta chave no TokenLedger, fora de qualquer agente do roster.",
      curso: null, ativo: true, conversacional: false, ondeTrabalha: ["interno"], plugin: null, distincao: null,
      habilidades: [], habilidadesDegradadas: [], ferramentas: [], datasets: [], protocolo: null,
      artefatos: [], fontes: [], guardrail: null, nivel: null, prompt: "",
    }, [k]));
  }
  return out;
}
