/**
 * scripts/datasets-inventario.ts — QUANTAS bases temos e DE QUEM é cada uma.
 *
 *   npx tsx scripts/datasets-inventario.ts            # o inventário inteiro
 *   npx tsx scripts/datasets-inventario.ts --agente   # só a tabela por agente
 *   npx tsx scripts/datasets-inventario.ts --fonte    # só a tabela por fonte
 *   npx tsx scripts/datasets-inventario.ts --cobertura # quem tem base e quem não tem
 *   npx tsx scripts/datasets-inventario.ts --total     # o total, por área e por fonte
 *   npx tsx scripts/datasets-inventario.ts --recusadas # o que ficou de fora, e por quê
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
import { COBERTURA, FONTES_DE_BASE, FONTES_RECUSADAS, areasDaFonte, fontesDaArea, recusasPorMotivo, totalMedido } from "../lib/rag/fontes";
import { MENTOR_SEED } from "../lib/agent/mentors";
import { MATERIAS } from "../lib/rag/mmlu";
import { CAPACIDADES } from "../lib/agents/capacidades";
import { AGENTES_CHAT } from "../lib/agents/chatAgentes";

const args = process.argv.slice(2);
const so = (k: string) => args.includes(k);
const tudo = !so("--agente") && !so("--fonte") && !so("--cobertura") && !so("--total") && !so("--recusadas");

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

function porTotal() {
  // A matriz área x fonte, somada das medições reais. `max` por fonte+área, nunca soma — duas
  // medições da mesma fonte são duas observações de um teto (ver coberturaDaArea).
  const fontes = FONTES_DE_BASE.filter((f) => (f.medicoes ?? []).length);
  const areas = [...SLUGS_AREA, AREA_GERAL];
  const valor = (fonteId: string, area: string, onde?: "vps" | "ensaio") => {
    const f = FONTES_DE_BASE.find((x) => x.id === fonteId)!;
    return (f.medicoes ?? [])
      .filter((m) => !onde || m.onde === onde)
      .reduce((mx, m) => Math.max(mx, m.porArea[area] ?? 0), 0);
  };

  console.log("\n═══ O TOTAL, POR ÁREA E POR FONTE ═══\n");
  const cab = fontes.map((f) => f.id.slice(0, 7).padStart(8)).join("");
  console.log(`${"área".padEnd(16)}${cab}${"TOTAL".padStart(9)}${"na VPS".padStart(9)}`);
  console.log("─".repeat(16 + fontes.length * 8 + 18));
  let geral = 0, naVpsTotal = 0;
  for (const area of areas) {
    const celulas = fontes.map((f) => {
      const n = valor(f.id, area);
      return (n ? String(n) : "·").padStart(8);
    }).join("");
    const total = fontes.reduce((s2, f) => s2 + valor(f.id, area), 0);
    const naVps = fontes.reduce((s2, f) => s2 + valor(f.id, area, "vps"), 0);
    geral += total; naVpsTotal += naVps;
    console.log(`${area.padEnd(16)}${celulas}${String(total).padStart(9)}${String(naVps || "·").padStart(9)}`);
  }
  console.log("─".repeat(16 + fontes.length * 8 + 18));
  const porFonte = fontes.map((f) => areas.reduce((s2, a) => s2 + valor(f.id, a), 0));
  console.log(`${"por fonte".padEnd(16)}${porFonte.map((n) => String(n).padStart(8)).join("")}${String(geral).padStart(9)}${String(naVpsTotal).padStart(9)}`);
  console.log(
    `\n  TOTAL do dataset: ${geral.toLocaleString("pt-BR")} documentos em ${areas.length} áreas`
    + `\n    já na VPS     : ${totalMedido("vps").toLocaleString("pt-BR")}`
    + `\n    esperando deploy: ${(geral - totalMedido("vps")).toLocaleString("pt-BR")}`,
  );
  console.log("  (o número do `wikipt` é do shard 0 de 6; com os seis é bem mais)");
}

function porRecusada() {
  const NOME = {
    licenca: "LICENÇA — não permite uso comercial, ou não existe",
    acesso: "ACESSO — exige chave, autenticação ou liberação",
    inalcancavel: "INALCANÇÁVEL — o endereço público não responde",
    inadequado: "INADEQUADO — licença e acesso OK, conteúdo não serve",
    idioma: "IDIOMA — corpus em inglês que o classificador em português não roteia",
  } as const;
  console.log("\n═══ O QUE FICOU DE FORA, E POR QUÊ ═══\n");
  const grupos = recusasPorMotivo();
  for (const motivo of ["licenca", "acesso", "inalcancavel", "inadequado", "idioma"] as const) {
    const g = grupos[motivo] ?? [];
    if (!g.length) continue;
    console.log(`── ${NOME[motivo]} · ${g.length} ──`);
    for (const f of g) {
      console.log(`   ${f.id}`);
      console.log(`     ${f.origem}`);
      for (const l of quebrar(`evidência: ${f.evidencia}`, 94)) console.log(`     ${l}`);
      if (f.destrava) for (const l of quebrar(`destrava: ${f.destrava}`, 94)) console.log(`     ${l}`);
      console.log("");
    }
  }
  console.log(`  ${FONTES_RECUSADAS.length} fontes recusadas, cada uma com evidência conferível.`);
}

function porCobertura() {
  const NOME = {
    proprio: "COBERTO — corpus do ofício",
    prova: "PARCIAL — só questão de prova",
    enciclopedico: "DESCOBERTO — só enciclopédia",
  } as const;
  const dono = (slug: string) => MENTOR_SEED.find((m) => m.slug === slug)?.name ?? "(todos)";
  const soma = (r: Record<string, number>) => Object.values(r).reduce((a, b) => a + b, 0);

  console.log("\n═══ COBERTURA: QUEM TEM BASE E QUEM NÃO TEM ═══\n");
  console.log("  A régua é a NATUREZA da fonte, não o volume. Enciclopédia alcança as 17 áreas, então");
  console.log("  contá-la como cobertura diria que todo agente está coberto — e esvaziaria a palavra.");

  for (const nivel of ["proprio", "prova", "enciclopedico"] as const) {
    const grupo = COBERTURA.filter((c) => c.nivel === nivel);
    console.log(`\n── ${NOME[nivel]} · ${grupo.length} ──`);
    console.log(`   ${"agente".padEnd(12)} ${"área".padEnd(16)} ${"na VPS".padStart(7)} ${"c/ deploy".padStart(10)}  de onde`);
    for (const c of grupo) {
      const de: string[] = [];
      if (c.comDeploy.proprio) de.push(`próprio ${c.comDeploy.proprio}`);
      if (c.comDeploy.prova) de.push(`prova ${c.comDeploy.prova}`);
      if (c.comDeploy.enciclopedico) de.push(`enciclopédia ${c.comDeploy.enciclopedico}`);
      console.log(
        `   ${dono(c.area).padEnd(12)} ${c.area.padEnd(16)} ${String(soma(c.naVps)).padStart(7)} `
        + `${String(soma(c.comDeploy)).padStart(10)}  ${de.join(" · ")}`,
      );
    }
  }
  console.log(
    `\n  na VPS hoje: ${totalMedido("vps").toLocaleString("pt-BR")} documentos`
    + ` · pronto e esperando deploy: ${totalMedido("ensaio").toLocaleString("pt-BR")}`,
  );
  console.log("  (o `c/ deploy` do wikipt é do shard 0 de 6; com os seis é bem mais)");
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

if (tudo || so("--total")) porTotal();
if (tudo || so("--cobertura")) porCobertura();
if (tudo || so("--recusadas")) porRecusada();
if (tudo || so("--fonte")) porFonte();
if (tudo || so("--agente")) porAgente();
if (tudo) {
  console.log(
    "\n  Isto é a ESTRUTURA. Pra contagem real do que já entrou:\n"
    + "    docker exec -w /app zaeon_web npx tsx scripts/bases-area-placar.ts",
  );
}
