/**
 * lib/agent/navegadorPlano.ts — o planejador do agente de navegador servidor (F8). Puro e testável:
 * monta o prompt e LÊ a resposta do modelo. Nenhuma chamada de rede aqui.
 *
 * ⟦POR QUE A LEITURA DO PLANO RECUSA EM VEZ DE DEIXAR O LAÇO NEGAR⟧ O `runAgentic` já para em
 * `stop: "denied"` quando aparece escrita sem `approve`. Só que "denied" é um veredito mudo: o dono
 * leria "não aprovado pelo admin" quando a verdade é "esta porta é somente leitura, por desenho".
 * Então as ações de escrita saem do plano E são DEVOLVIDAS em `recusadas`, com o tipo. O cockpit diz
 * o que não foi feito e por quê — em vez de um run que para na metade sem explicar.
 *
 * As ações mantidas são só as que o driver servidor sabe fazer: navigate, read, find, screenshot,
 * done. `handoff` também é recusado: não há humano na página (ver navegadorServidor.ts).
 */
import type { AgenticAction, AgenticActionKind } from "@/lib/agent/agentic";
import { AGENTE_MAX_PASSOS } from "@/lib/agent/navegadorPolitica";

/** Os tipos que ESTA porta executa. Escrita e handoff ficam de fora por desenho, não por omissão. */
export const TIPOS_DE_LEITURA: readonly AgenticActionKind[] = ["navigate", "read", "find", "screenshot", "done"];

export const SISTEMA_DO_PLANO = `Você planeja a navegação de um agente SOMENTE LEITURA, num navegador headless no servidor.

Devolva JSON: { "acoes": [ { "kind": ..., "url": ..., "selector": ..., "label": ... } ] }

Tipos permitidos e NADA MAIS:
- "navigate" com "url" (http/https) — abre a página;
- "read" com "selector" opcional (CSS) — lê o texto (sem selector, lê o corpo todo);
- "find" com "selector" — confere se existe;
- "screenshot" — foto da página;
- "done" — encerra.

REGRAS DURAS:
- Você NÃO pode clicar, digitar, preencher formulário, fazer login nem pedir ajuda humana. Não há
  humano na página e o driver recusa escrita. Se a tarefa exigir isso, devolva uma única ação
  "done" com "label" dizendo o que seria necessário e não é possível.
- Só domínios da allowlist do Leitor serão abertos; qualquer outro é barrado pela rede.
- No máximo ${AGENTE_MAX_PASSOS} ações. Prefira poucas: navegar e ler costuma bastar.
- "label" é uma frase curta em português dizendo o passo (aparece pro dono no cockpit).`;

export function promptDoPlano(instrucao: string): string {
  return `TAREFA: ${String(instrucao ?? "").slice(0, 2_000)}`;
}

export type PlanoDoAgente = {
  acoes: AgenticAction[];
  /** tipos que o modelo pediu e esta porta não faz (na ordem em que apareceram). */
  recusadas: string[];
};

const texto = (v: unknown): string | undefined => {
  const s = typeof v === "string" ? v.trim() : "";
  return s ? s : undefined;
};

/**
 * Lê a resposta do modelo. Tolerante à forma (aceita `{acoes}`, `{actions}` ou um array cru), porque
 * o modelo erra o invólucro com frequência e derrubar o run por isso seria desperdício; ESTRITA no
 * conteúdo, porque é aqui que entra o que vai rodar.
 */
export function lerPlanoDoAgente(bruto: unknown): PlanoDoAgente {
  const lista: unknown[] = Array.isArray(bruto)
    ? bruto
    : Array.isArray((bruto as { acoes?: unknown })?.acoes)
      ? ((bruto as { acoes: unknown[] }).acoes)
      : Array.isArray((bruto as { actions?: unknown })?.actions)
        ? ((bruto as { actions: unknown[] }).actions)
        : [];

  const acoes: AgenticAction[] = [];
  const recusadas: string[] = [];

  for (const item of lista) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const kind = String(o.kind ?? o.tipo ?? "").trim().toLowerCase();
    if (!kind) continue;
    if (!(TIPOS_DE_LEITURA as readonly string[]).includes(kind)) { recusadas.push(kind); continue; }
    if (acoes.length >= AGENTE_MAX_PASSOS) break;

    const a: AgenticAction = { kind: kind as AgenticActionKind };
    const url = texto(o.url);
    const selector = texto(o.selector) ?? texto(o.seletor);
    const label = texto(o.label) ?? texto(o.rotulo);
    // `navigate` sem url não é passo, é ruído: executá-lo chamaria goto("") e erraria o run inteiro.
    if (kind === "navigate") { if (!url) { recusadas.push("navigate_sem_url"); continue; } a.url = url; }
    if (selector) a.selector = selector;
    if (label) a.label = label;
    acoes.push(a);
  }

  return { acoes, recusadas };
}
