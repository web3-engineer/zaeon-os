/**
 * scripts/datasets-inventario.ts — QUANTAS bases temos e DE QUEM é cada uma.
 *
 *   npx tsx scripts/datasets-inventario.ts            # o inventário inteiro
 *   npx tsx scripts/datasets-inventario.ts --agente   # só a tabela por agente
 *   npx tsx scripts/datasets-inventario.ts --fonte    # só a tabela por fonte
 *
 * Roda em QUALQUER máquina: lê só o código (lib/rag/fontes, lib/rag/areas, lib/agent/mentors,
 * lib/agents/capacidades), nunca o banco. É a ESTRUTURA — quem é dono de quê.
 * Pra saber QUANTO já entrou de verdade, é `scripts/bases-area-placar.ts`, que só roda na VPS.
 *
 * A diferença entre os dois é o ponto: este diz "a Janaina lê a área `infra`, que tem 4 fontes";
 * o placar diz "a área `infra` tem 1.113 documentos". Um é desenho, o outro é realidade, e
 * confundir os dois foi exatamente como se perdeu uma carga antes.
 */
import { AREAS, AREA_GERAL, SLUGS_AREA, areasDoTurno } from "../lib/rag/areas";
import { FONTES_DE_BASE, areasDaFonte, fontesDaArea } from "../lib/rag/fontes";
import { MENTOR_SEED } from "../lib/agent/mentors";
import { MATERIAS } from "../lib/rag/mmlu";
import { CAPACIDADES } from "../lib/agents/capacidades";
import { AGENTES_CHAT } from "../lib/agents/chatAgentes";

const args = process.argv.slice(2);
const so = (k: string) => args.includes(k);
const tudo = !so("--agente") && !so("--fonte");

const ESTADO = { producao: "EM PRODUÇÃO", pronta: "pronta", bloqueada: "BLOQUEADA" } as const;

function porFonte() {
  console.log("\n═══ FONTES DE BASE ═══\n");
  console.log(`${"fonte".padEnd(10)} ${"estado".padEnd(12)} ${"licença".padEnd(34)} áreas que alcança`);
  console.log("─".repeat(100));
  for (const f of FONTES_DE_BASE) {
    const as = areasDaFonte(f);
    const resumo = as.length >= SLUGS_AREA.length ? `as ${as.length} áreas` : as.join(", ");
    console.log(`${f.id.padEnd(10)} ${ESTADO[f.estado].padEnd(12)} ${f.licenca.slice(0, 33).padEnd(34)} ${resumo}`);
  }
  console.log("");
  for (const f of FONTES_DE_BASE) {
    console.log(`· ${f.id} — ${f.origem}`);
    if (f.nota) for (const linha of quebrar(f.nota, 92)) console.log(`    ${linha}`);
  }
  const porEstado = FONTES_DE_BASE.reduce<Record<string, number>>((m, f) => ({ ...m, [f.estado]: (m[f.estado] ?? 0) + 1 }), {});
  console.log(`\n${FONTES_DE_BASE.length} fontes: ${Object.entries(porEstado).map(([e, n]) => `${n} ${ESTADO[e as keyof typeof ESTADO]}`).join(" · ")}`);
}

function porAgente() {
  // quantas sementes da Wikipédia e quantas matérias do MMLU cada área tem — isto é derivado,
  // não escrito à mão, então não envelhece quando alguém mexer nas listas
  const sementes = new Map(AREAS.map((a) => [a.slug, a.wikipedia.length]));
  const materias = new Map<string, number>();
  for (const m of Object.values(MATERIAS)) {
    const a = m.area ?? AREA_GERAL;
    materias.set(a, (materias.get(a) ?? 0) + 1);
  }

  console.log("\n═══ DE QUEM É CADA BASE ═══\n");
  console.log(`${"agente".padEnd(12)} ${"área".padEnd(16)} ${"curso".padEnd(32)} sem  mat  fontes`);
  console.log("─".repeat(104));
  for (const m of [...MENTOR_SEED].sort((a, b) => a.order - b.order)) {
    const fs = fontesDaArea(m.slug).filter((f) => f.estado !== "bloqueada").map((f) => f.id);
    console.log(
      `${m.name.padEnd(12)} ${m.slug.padEnd(16)} ${m.course.slice(0, 31).padEnd(32)} `
      + `${String(sementes.get(m.slug) ?? 0).padStart(3)}  ${String(materias.get(m.slug) ?? 0).padStart(3)}  ${fs.join(", ")}`,
    );
  }
  const fgeral = fontesDaArea(AREA_GERAL).filter((f) => f.estado !== "bloqueada").map((f) => f.id);
  console.log(
    `${"(todos)".padEnd(12)} ${AREA_GERAL.padEnd(16)} ${"— a base que todo agente lê".padEnd(32)} `
    + `${"0".padStart(3)}  ${String(materias.get(AREA_GERAL) ?? 0).padStart(3)}  ${fgeral.join(", ")}`,
  );
  console.log("\n  sem = sementes da Wikipédia (fonte `wiki`) · mat = matérias do MMLU (fonte `mmlu`)");

  console.log("\n═══ QUEM FALA NO CHAT, E O QUE LÊ ═══\n");
  for (const a of AGENTES_CHAT) {
    const cap = CAPACIDADES[a.id];
    const bases = areasDoTurno(cap?.area ?? null);
    const dono = cap?.area ? MENTOR_SEED.find((m) => m.slug === cap.area)?.name : null;
    console.log(
      `  ${a.nome.padEnd(11)} tela:${a.tela.padEnd(5)} área: ${String(cap?.area ?? "—").padEnd(12)} `
      + `lê: ${bases.join(", ").padEnd(30)}${dono && dono !== a.nome ? `(mesma área do mentor ${dono})` : ""}`,
    );
  }
  console.log(
    "\n  Um agente SEM área lê só `area:geral`. `areasDoTurno(cap.area ?? mentor?.slug)` é o que faz\n"
    + "  a base chegar: pela área da agente OU pelo slug do mentor ativo — então os 17 mentores\n"
    + "  alcançam a base deles mesmo sem estar no seletor do chat.",
  );
}

const quebrar = (t: string, n: number) => {
  const fora: string[] = [];
  let linha = "";
  for (const p of t.split(" ")) {
    if ((linha + p).length > n) { fora.push(linha.trimEnd()); linha = ""; }
    linha += `${p} `;
  }
  if (linha.trim()) fora.push(linha.trimEnd());
  return fora;
};

if (tudo || so("--fonte")) porFonte();
if (tudo || so("--agente")) porAgente();
if (tudo) {
  console.log(
    "\n  Isto é a ESTRUTURA. Pra contagem real do que já entrou:\n"
    + "    docker exec -w /app zaeon_web npx tsx scripts/bases-area-placar.ts",
  );
}
