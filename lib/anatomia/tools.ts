/**
 * lib/anatomia/tools.ts — as duas FERRAMENTAS de anatomia do agente.
 *
 * São o equivalente das duas do human-atlas (`find_anatomy` e `inspect_anatomical_structure`, em
 * `app/agent-tools.ts`, MIT — procedência completa em lib/anatomia/atlas.ts). Lá elas eram
 * registradas no navegador via `document.modelContext` (WebMCP); aqui entram no registry do nosso
 * runtime, que é onde o Osler as alcança. A capacidade é a mesma; o transporte é o nosso.
 *
 * ──────────────── Por que o resultado vira `findings`, e não texto solto ────────────────
 * `ToolResult.findings` é o canal de EVIDÊNCIA do harness: cada achado leva `source`, e o examiner
 * (lib/agent/examiner) cruza o rascunho contra a evidência reunida na checagem `sem_fonte`. Então
 * uma afirmação anatômica que venha daqui é RASTREÁVEL até o BodyParts3D — e uma que o modelo
 * invente continua sem lastro, como deve ser. Se eu devolvesse texto livre, a anatomia entraria no
 * turno sem fonte e o crítico não teria o que conferir.
 *
 * ──────────────── Por que `disponivelNoTurno` ────────────────
 * Sem o manifesto no disco, as duas ferramentas DESAPARECEM do cardápio em vez de aparecerem e
 * falharem. É a regra da F0 (não anunciar o que não se pode fazer), a mesma que faz `ler_anexo`
 * sumir num turno sem anexo.
 */
import type { ToolDef, ToolResult } from "@/lib/agent/runtime";
import { registerTool } from "@/lib/agent/runtime";
import { SISTEMAS_POR_ID, explicacao } from "@/lib/anatomia/atlas";
import { acharConceito, buscarConceitos, pecasDoConceito, sistemasDoConceito } from "@/lib/anatomia/busca";
import { atlasDisponivel, carregarAtlas } from "@/lib/anatomia/carregar";
import { FONTE_ATLAS } from "@/lib/anatomia/cena-do-conceito";

/**
 * A fonte que vai em TODO achado: o dado é CC BY 4.0 e a atribuição acompanha o uso, não só o repo.
 * Mora em `lib/anatomia/cena-do-conceito` (módulo puro) desde que o artefato passou a precisar dela:
 * duas cópias da atribuição é uma que divergem. Re-exportada aqui porque era daqui que ela saía.
 */
export { FONTE_ATLAS } from "@/lib/anatomia/cena-do-conceito";

const agora = () => new Date().toISOString();
const semAtlas = (): ToolResult => ({
  ok: false, error: "o atlas de anatomia não está disponível neste servidor", code: "atlas_indisponivel",
  provenance: { at: agora() },
});

/**
 * `buscar_anatomia` — conceitos por nome ou identificador. Aceita português nos termos comuns
 * (ver SINONIMOS_PT) e diz quando traduziu, para o mentor não afirmar que o aluno escreveu em inglês.
 */
export const buscarAnatomiaDef: ToolDef = {
  name: "buscar_anatomia",
  runtime: "ts",
  risk: "read",
  minPlan: "free",
  disponivelNoTurno: () => atlasDisponivel(),
  schema: {
    name: "buscar_anatomia",
    description:
      "Busca estruturas anatômicas por nome ou identificador no atlas BodyParts3D (2.234 malhas, " +
      "3.432 conceitos nomeados, referência de adulto masculino). Aceita termos em português para " +
      "órgãos e sistemas comuns. EDUCACIONAL: não é atlas clínico nem cirúrgico.",
    parameters: {
      type: "object",
      properties: { consulta: { type: "string", description: "nome ou identificador, ex.: 'coração', 'liver', 'FMA3710'" } },
      required: ["consulta"],
    },
  } as unknown as ToolDef["schema"],
  async run(args): Promise<ToolResult> {
    const atlas = carregarAtlas();
    if (!atlas) return semAtlas();
    const consulta = String(args?.consulta ?? "").trim();
    if (!consulta) return { ok: false, error: "consulta vazia", code: "consulta_vazia", provenance: { at: agora() } };

    const r = buscarConceitos(atlas, consulta);
    if (!r.achados.length) {
      // "não achei" é resposta, e tem de ser distinguível de "não existe no corpo humano": o atlas
      // é uma referência PARCIAL (não tem linfonodo, por exemplo) e o mentor precisa poder dizer isso.
      return {
        ok: false,
        error: `nenhuma estrutura chamada "${r.termo}" neste atlas — ele é uma referência parcial de adulto masculino, não o corpo inteiro`,
        code: "sem_resultado",
        provenance: { at: agora(), toolsUsed: ["buscar_anatomia"] },
      };
    }
    return {
      ok: true,
      findings: r.achados.map((a) => ({
        claim: `${a.nome} (${a.id}) — ${a.pecas === 1 ? "1 malha" : `${a.pecas} malhas`} no atlas`,
        source: { ...FONTE_ATLAS },
        confidence: "alta" as const,
      })),
      provenance: {
        at: agora(),
        toolsUsed: ["buscar_anatomia"],
        sources: [{ ...FONTE_ATLAS }],
      },
    };
  },
};

/**
 * `inspecionar_anatomia` — o conceito por id, com explicação e sistemas. Id EXATO: devolver "o mais
 * parecido" faria o mentor descrever uma estrutura que o aluno não pediu, e isso em medicina é pior
 * que não responder.
 */
export const inspecionarAnatomiaDef: ToolDef = {
  name: "inspecionar_anatomia",
  runtime: "ts",
  risk: "read",
  minPlan: "free",
  disponivelNoTurno: () => atlasDisponivel(),
  schema: {
    name: "inspecionar_anatomia",
    description:
      "Detalha uma estrutura anatômica do atlas pelo identificador exato (ex.: FMA7088): nome, " +
      "sistemas que atravessa, quantas malhas agrupa e a explicação disponível. EDUCACIONAL.",
    parameters: {
      type: "object",
      properties: { id: { type: "string", description: "identificador exato do conceito, ex.: FMA7088" } },
      required: ["id"],
    },
  } as unknown as ToolDef["schema"],
  async run(args): Promise<ToolResult> {
    const atlas = carregarAtlas();
    if (!atlas) return semAtlas();
    const conceito = acharConceito(atlas, args?.id);
    if (!conceito) {
      return {
        ok: false,
        error: `identificador não existe neste atlas: ${String(args?.id ?? "")}`,
        code: "id_desconhecido",
        provenance: { at: agora(), toolsUsed: ["inspecionar_anatomia"] },
      };
    }
    const pecas = pecasDoConceito(atlas, conceito);
    const sistemas = sistemasDoConceito(atlas, conceito);
    const primeiro = pecas[0];
    const texto = primeiro ? explicacao(conceito.name, primeiro.system) : "";
    const rotulos = pecas.length
      ? [...new Set(pecas.map((p) => SISTEMAS_POR_ID.get(p.system)?.nome ?? p.system))].join(", ")
      : "(sem malha associada)";
    return {
      ok: true,
      findings: [
        {
          claim: `${conceito.name} (${conceito.id}) — sistema: ${rotulos}; ${pecas.length === 1 ? "1 malha" : `${pecas.length} malhas`}${texto ? `. ${texto}` : ""}`,
          source: { ...FONTE_ATLAS },
          confidence: "alta" as const,
        },
      ],
      provenance: { at: agora(), toolsUsed: ["inspecionar_anatomia"], sources: [{ ...FONTE_ATLAS }] },
    };
  },
};

/**
 * Registra as duas — e RECUSA registrar sem o manifesto, no mesmo molde de `registrarAbrirUrl`.
 *
 * Por que recusar em vez de registrar e falhar: o cardápio de capacidades que vai no prompt é
 * DERIVADO do registry (lib/agent/capacidades). Uma tool registrada que devolvesse
 * "atlas_indisponivel" em toda chamada faria o cardápio anunciar "a plataforma explora anatomia 3D"
 * — e o mentor voltaria a prometer uma ação que não acontece. É a mentira da F0 por outra porta.
 *
 * E é chamada do `aura-harness`, não do `runtime`: as tools do Leitor podem morar no runtime porque
 * são definidas lá, mas estas importam dele, e registrar de dentro criaria ciclo. Também não é no
 * boot — tool registrada só no boot fica invisível pra rota do chat, defeito que o comentário do
 * registry em lib/agent/runtime.ts documenta.
 */
export function registrarAnatomia(): boolean {
  if (!atlasDisponivel()) return false;
  registerTool(buscarAnatomiaDef);
  registerTool(inspecionarAnatomiaDef);
  return true;
}
