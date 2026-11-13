/**
 * BLUEPRINT REA → SCAFFOLD de projeto Octa. PURO (sem IO, sem modelo).
 *
 * A ponte que o dono pediu: o cartão do blueprint cria um projeto na Octa já com arquivos, e o aluno
 * usa o botão "Publicar" que já existe (repo + GitHub Pages na conta dele). Como a publicação da
 * Octa é SÓ site estático (lib/octa/publicar: React/Python voltam `tipo_nao_publicavel`), o scaffold
 * é um SITE ESTÁTICO que apresenta a engenharia reversa — o mesmo documento do blueprint, agora uma
 * página publicável: mecanismo, achados rotulados pela proveniência, passos de reconstrução e o que
 * ainda é desconhecido.
 *
 * TUDO que vem do blueprint foi escrito por um MODELO e vai virar HTML publicado — então cada pedaço
 * é ESCAPADO antes de entrar na página (`esc`), e o único "markdown" que interpretamos é `**negrito**`,
 * depois do escape. Nada de `<script>`, nada de HTML cru do modelo.
 *
 * Os arquivos saem no formato de `lib/octa/projetos.Arquivos` (caminho → conteúdo). `index.html`,
 * `style.css` e `reconstrucao.md` — as três extensões são publicáveis (lib/octa/publicar.EXTENSOES_SITE),
 * e o conjunto é `estatico` (lib/octa/tipoProjeto), então o botão Publicar aceita.
 */
import type { Arquivos } from "@/lib/octa/projetos";
import { ROTULO_PROV, type DocReaBlueprint, type Prov } from "./tipos";

/** Escapa texto para dentro de HTML (conteúdo e atributo). A 1ª barreira contra o que o modelo escreveu. */
export function esc(s: string): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

/** Inline seguro: ESCAPA primeiro, depois transforma `**x**` em <strong> e quebra de linha em <br>. */
export function inline(s: string): string {
  return esc(s).replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>").replace(/\n/g, "<br>");
}

/** Markdown curto → blocos <p>/<ul> seguros (parágrafo por linha em branco; `- ` / `* ` viram lista). */
export function blocos(markdown: string): string {
  const linhas = String(markdown ?? "").split("\n");
  const out: string[] = [];
  let lista: string[] = [];
  const fechaLista = () => { if (lista.length) { out.push(`<ul>${lista.map((li) => `<li>${inline(li)}</li>`).join("")}</ul>`); lista = []; } };
  let paragrafo: string[] = [];
  const fechaParagrafo = () => { if (paragrafo.length) { out.push(`<p>${inline(paragrafo.join("\n"))}</p>`); paragrafo = []; } };
  for (const bruta of linhas) {
    const l = bruta.trimEnd();
    const item = /^\s*[-*]\s+(.*)$/.exec(l);
    if (item) { fechaParagrafo(); lista.push(item[1]); continue; }
    if (!l.trim()) { fechaParagrafo(); fechaLista(); continue; }
    fechaLista(); paragrafo.push(l);
  }
  fechaParagrafo(); fechaLista();
  return out.join("\n") || "<p></p>";
}

const CSS = `:root{color-scheme:light dark}
*{box-sizing:border-box}
body{margin:0;font:16px/1.65 ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#0f172a;background:#f8fafc}
main{max-width:760px;margin:0 auto;padding:48px 20px 96px}
h1{font-size:30px;line-height:1.2;margin:0 0 6px}
.alvo{color:#475569;font-size:15px;margin:0 0 28px}
.resumo{font-size:18px;color:#1e293b;border-left:3px solid #10b981;padding:4px 0 4px 16px;margin:0 0 36px}
h2{font-size:13px;letter-spacing:.14em;text-transform:uppercase;color:#64748b;margin:40px 0 12px}
section p{margin:0 0 12px}
ul{margin:0 0 12px;padding-left:22px}
.achado{border:1px solid #e2e8f0;border-radius:12px;padding:14px 16px;margin:0 0 10px;background:#fff}
.achado .af{font-weight:600}
.achado .detalhe{color:#475569;font-size:14px;margin-top:4px}
.achado .fonte{color:#94a3b8;font-size:12px;margin-top:6px}
.selo{display:inline-block;font-size:11px;font-weight:700;letter-spacing:.04em;padding:2px 8px;border-radius:999px;margin-bottom:8px}
.observacao{background:#dcfce7;color:#166534}
.derivacao{background:#dbeafe;color:#1e40af}
.inferencia{background:#fef3c7;color:#92400e}
.desconhecido{background:#f1f5f9;color:#475569}
.passo{counter-increment:p;border:1px solid #e2e8f0;border-radius:12px;padding:14px 16px;margin:0 0 10px;background:#fff}
.passo .t::before{content:counter(p) ". ";color:#10b981;font-weight:700}
.passo .t{font-weight:600}
.passo .verifica{color:#475569;font-size:14px;margin-top:6px;border-top:1px dashed #e2e8f0;padding-top:6px}
.passo .verifica b{color:#166534;font-weight:600}
ol.recon{counter-reset:p;list-style:none;padding:0;margin:0}
.incerteza{color:#92400e}
footer{margin-top:48px;color:#94a3b8;font-size:12px;border-top:1px solid #e2e8f0;padding-top:16px}
@media(prefers-color-scheme:dark){body{background:#0b1220;color:#e2e8f0}.achado,.passo{background:#111a2e;border-color:#1e293b}.resumo{color:#cbd5e1}}
`;

function achadoHtml(a: DocReaBlueprint["achados"][number]): string {
  const prov = a.prov as Prov;
  return `<div class="achado"><span class="selo ${prov}">${esc(ROTULO_PROV[prov])}</span>`
    + `<div class="af">${inline(a.afirmacao)}</div>`
    + (a.detalhe ? `<div class="detalhe">${inline(a.detalhe)}</div>` : "")
    + (a.fonte ? `<div class="fonte">Fonte: ${esc(a.fonte)}</div>` : "")
    + `</div>`;
}

function passoHtml(p: DocReaBlueprint["reconstrucao"][number]): string {
  return `<li class="passo"><div class="t">${esc(p.titulo)}</div>`
    + (p.corpo ? `<div class="corpo">${blocos(p.corpo)}</div>` : "")
    + (p.verifica ? `<div class="verifica"><b>Como verificar:</b> ${inline(p.verifica)}</div>` : "")
    + `</li>`;
}

/** O `index.html` publicável que apresenta o blueprint. */
export function indexHtml(doc: DocReaBlueprint): string {
  const titulo = doc.titulo || "Engenharia reversa";
  const secoes: string[] = [];
  if (doc.resumo) secoes.push(`<p class="resumo">${inline(doc.resumo)}</p>`);
  if (doc.comoFunciona) secoes.push(`<section><h2>Como funciona</h2>${blocos(doc.comoFunciona)}</section>`);
  if (doc.achados.length) secoes.push(`<section><h2>Achados</h2>${doc.achados.map(achadoHtml).join("")}</section>`);
  if (doc.reconstrucao.length) secoes.push(`<section><h2>Como reconstruir</h2><ol class="recon">${doc.reconstrucao.map(passoHtml).join("")}</ol></section>`);
  if (doc.incertezas.length) secoes.push(`<section><h2>O que ainda é desconhecido</h2><ul>${doc.incertezas.map((i) => `<li class="incerteza">${inline(i)}</li>`).join("")}</ul></section>`);
  if (doc.ferramentas.length) secoes.push(`<section><h2>Ferramentas</h2><p>${doc.ferramentas.map(esc).join(" · ")}</p></section>`);
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(titulo)}</title>
<link rel="stylesheet" href="style.css">
</head>
<body>
<main>
<h1>${esc(titulo)}</h1>
${doc.alvo ? `<p class="alvo">${esc(doc.alvo)}</p>` : ""}
${secoes.join("\n")}
<footer>Blueprint de engenharia reversa — entendimento e reconstrução lícita (interoperabilidade, estudo, segurança, software próprio ou autorizado).</footer>
</main>
</body>
</html>
`;
}

/** Os passos de reconstrução como `reconstrucao.md` (Markdown é publicável e versionável). */
export function reconstrucaoMd(doc: DocReaBlueprint): string {
  const linhas = [`# Como reconstruir — ${doc.titulo || "engenharia reversa"}`, ""];
  if (doc.alvo) linhas.push(`**Alvo:** ${doc.alvo}`, "");
  doc.reconstrucao.forEach((p, i) => {
    linhas.push(`## ${i + 1}. ${p.titulo}`);
    if (p.corpo) linhas.push("", p.corpo);
    if (p.verifica) linhas.push("", `> **Como verificar:** ${p.verifica}`);
    linhas.push("");
  });
  if (doc.incertezas.length) {
    linhas.push("## Ainda desconhecido", "");
    doc.incertezas.forEach((i) => linhas.push(`- ${i}`));
    linhas.push("");
  }
  return linhas.join("\n");
}

/** O nome do projeto Octa a partir do blueprint (o `criarProjeto` já corta em 80). */
export const nomeDoProjeto = (doc: DocReaBlueprint): string => (doc.titulo || "Engenharia reversa").slice(0, 80);

/**
 * O scaffold completo: caminho → conteúdo, pronto pra `salvarArquivos`. Site ESTÁTICO (publicável).
 * Sem `index.html` o blueprint não tem o que mostrar, então ele sempre existe, mesmo vazio.
 */
export function scaffoldDoBlueprint(doc: DocReaBlueprint): Arquivos {
  const arquivos: Arquivos = {
    "index.html": indexHtml(doc),
    "style.css": CSS,
  };
  if (doc.reconstrucao.length) arquivos["reconstrucao.md"] = reconstrucaoMd(doc);
  return arquivos;
}
