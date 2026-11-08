/**
 * scripts/ingerir-bases-area.ts — enche as BASES POR ÁREA dos mentores (lib/rag/areas) com conhecimento público.
 *
 *   docker exec -w /app zaeon_web npx tsx scripts/ingerir-bases-area.ts --seco              # só conta (nada grava)
 *   docker exec -w /app zaeon_web npx tsx scripts/ingerir-bases-area.ts --fontes scielo,wiki,medicina,enem
 *   docker exec -w /app zaeon_web npx tsx scripts/ingerir-bases-area.ts --fontes dataset --dir /opt/zaeon/dataset
 *   opções: --por-area 1500  --dir /tmp/bases (JSONL gerados por scripts/scielo-para-jsonl.py)  --linhas N (teto lido da SciELO)
 *
 * A fonte `dataset` lê o DATASET montado por scripts/dataset-montar.mjs: cada `<area>/<nome>.jsonl` já vem no
 * contrato {chave, titulo, texto, area} com a licença no rodapé do texto, e cada `<area>/*.pdf` entra por
 * `ingerirPdf`, que preserva o número de página — é ele que faz a citação ao aluno apontar pra folha certa.
 *
 *   docker exec -w /app zaeon_web npx tsx scripts/ingerir-bases-area.ts --fontes wikipt --wiki-shards 6
 *   docker exec -w /app zaeon_web npx tsx scripts/ingerir-bases-area.ts --fontes mmlu
 *   docker exec -w /app zaeon_web npx tsx scripts/ingerir-bases-area.ts --fontes arxiv
 *
 * A fonte `wikipt` lê o dataset `wikimedia/wikipedia` (config 20231101.pt) DIRETO DOS PARQUETS, por
 * requisição de faixa (HTTP range) — o `hyparquet` baixa só os pedaços de que precisa, então não há
 * download de 2,4 GB nem arquivo temporário. Medido em 2026-11-08: shard de 406 MB, 185.375 linhas,
 * 3 linhas lidas em 1,9 s. A API de linhas (/rows) NÃO serve pra isso: é 100 linhas por chamada e o
 * nginx do HF devolve 502 depois de ~23 chamadas anônimas (medido: 20/20 falhas em sequência).
 * A decisão de cada verbete é pura e mora em lib/rag/wikipedia (com testes); aqui fica só o I/O.
 *
 * A API de linhas do HF (datasets-server) não serve a SciELO (parquet de 2,8 GB) e devolve 429 rápido nas outras, então
 * os parquets viram JSONL antes (scielo.jsonl, medical_meadow_wikidoc_pt.jsonl, information-pt.jsonl com --cru) e o
 * ENEM vem direto dos .jsonl do repositório.
 *
 * Grava pelo MESMO caminho dos PDFs (lib/rag/ingerir `ingerirTexto`): dedupe por hash, trechos, fila de vetores
 * (o worker rag-index gera os embeddings depois; até lá a busca por palavra já acha). Rodar de novo é seguro.
 * Licenças (comercial ok): SciELO pt CC-BY-4.0, Wikipédia CC-BY-SA, rhaymison/medicine-* Apache-2.0, maritaca-ai/enem Apache-2.0.
 * A fonte e a licença vão no fim de cada documento — a citação do chat mostra o título, e o crédito fica no texto.
 */
import { AREAS, AREA_GERAL, SLUGS_AREA, classificarArea, idArea, tituloEResumo } from "../lib/rag/areas";

const args = process.argv.slice(2);
const opt = (k: string, d: string) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const SECO = args.includes("--seco");
const FONTES = opt("--fontes", "scielo,wiki,medicina,enem").split(",");
const POR_AREA = Number(opt("--por-area", "1500"));
const LINHAS = Number(opt("--linhas", "1000000"));
const DIR = opt("--dir", "/tmp/bases");
const WIKI_SHARDS_USAR = Number(opt("--wiki-shards", "6"));
const WIKI_LINHAS = Number(opt("--wiki-linhas", String(Number.MAX_SAFE_INTEGER)));
const UA = { "User-Agent": "ZaeonBot/1.0 (https://zaeon.com.br; bases de estudo)" };

const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));
/**
 * GET com JSON, devolvendo o MOTIVO em vez de jogar fora.
 *
 * Antes isto lançava um erro genérico e quem chamava fazia `.catch(() => null)`, e o resultado foi
 * uma hora perdida na VPS: a fonte `wiki` imprimiu 122 linhas de "sem texto" quando a verdade era
 * HTTP 429 da Wikimedia. A mensagem mentia, então ninguém podia saber. Agora o status volta.
 *
 * E respeita `Retry-After`: a borda da Wikimedia manda `retry-after: 1` e a escada cega de
 * 2/4/8/16/32s gastava 62 s por verbete pra esperar um segundo. Teto de 30 s porque o cabeçalho é
 * de terceiro e pode vir absurdo.
 */
type Resposta = { ok: true; dados: any } | { ok: false; motivo: string };

async function buscarJson(url: string, tentativas = 5): Promise<Resposta> {
  let ultimo = "sem resposta";
  for (let i = 0; i < tentativas; i++) {
    const r = await fetch(url, { headers: { ...UA, ...(process.env.HF_TOKEN ? { Authorization: `Bearer ${process.env.HF_TOKEN}` } : {}) } })
      .catch((e: unknown) => { ultimo = `rede: ${(e as Error)?.message ?? e}`; return null; });
    if (r?.ok) {
      const dados = await r.json().catch((e: unknown) => { ultimo = `json inválido: ${(e as Error)?.message ?? e}`; return undefined; });
      if (dados !== undefined) return { ok: true, dados };
    } else if (r) {
      ultimo = `HTTP ${r.status}`;
    }
    if (i === tentativas - 1) break;
    const pedido = Number(r?.headers.get("retry-after") ?? 0);
    const espere = pedido > 0 ? Math.min(pedido, 30) * 1000 : 2000 * 2 ** i;
    await espera(espere);
  }
  return { ok: false, motivo: `${ultimo} após ${tentativas} tentativas` };
}
async function* jsonl(caminho: string): AsyncGenerator<any> {
  const { createReadStream } = await import("node:fs");
  const { createInterface } = await import("node:readline");
  for await (const l of createInterface({ input: createReadStream(caminho, "utf8"), crlfDelay: Infinity })) if (l.trim()) yield JSON.parse(l);
}

async function main() {
  // --seco não toca no banco (dá pra rodar de qualquer máquina só pra ver a distribuição por área)
  const deps = SECO ? null : await (async () => {
    const [{ ragPg }, { enfileirarIndexacao }] = await Promise.all([import("../lib/rag/pg"), import("../lib/queue/rag")]);
    return { db: ragPg(), enfileirar: enfileirarIndexacao };
  })();
  const { ingerirTexto, ingerirPdf } = await import("../lib/rag/ingerir");
  const placar: Record<string, { novo: number; reaproveitado: number; erro: number }> = {};
  /** Áreas que vieram no dado e não existem em lib/rag/areas. Falha no fim, nunca em silêncio. */
  const semArea = new Set<string>();
  const gravar = async (area: string, fonte: string, d: { chave: string; titulo: string; texto: string }) => {
    const k = `${area} · ${fonte}`;
    placar[k] ??= { novo: 0, reaproveitado: 0, erro: 0 };
    if (SECO) { placar[k].novo++; return; }
    const r = await ingerirTexto(deps!, { ...d, origem: "dataset", criadoPor: `dataset:${fonte}`, permissao: { turmaId: idArea(area) } });
    placar[k][r.status]++;
    if (r.status === "erro") console.warn(`[erro] ${k} ${d.chave}: ${r.erro}`);
  };

  if (FONTES.includes("scielo")) {
    // {doc_id, year, titulo, resumo} — scripts/scielo-para-jsonl.py
    const porArea: Record<string, Array<{ pontos: number; titulo: string; resumo: string; id: string; ano: number }>> = {};
    let lidas = 0;
    for await (const row of jsonl(`${DIR}/scielo.jsonl`)) {
      if (lidas >= LINHAS) break;
      lidas++;
      if (String(row.resumo ?? "").length < 400) continue;
      const c = classificarArea(row.titulo, row.resumo);
      if (c) (porArea[c.slug] ??= []).push({ pontos: c.pontos, titulo: row.titulo, resumo: row.resumo, id: String(row.doc_id), ano: row.year });
      if (lidas % 20000 === 0) console.log(`[scielo] lidas ${lidas} — ${Object.entries(porArea).map(([k, v]) => `${k}:${v.length}`).join(" ")}`);
    }
    console.log(`[scielo] lidas ${lidas} — ${Object.entries(porArea).map(([k, v]) => `${k}:${v.length}`).join(" ")}`);
    for (const a of AREAS) {
      const melhores = (porArea[a.slug] ?? []).sort((x, y) => y.pontos - x.pontos).slice(0, POR_AREA);
      for (const m of melhores) {
        await gravar(a.slug, "scielo", { chave: `scielo-${m.id}`, titulo: m.titulo, texto: `${m.resumo}\n\nFonte: SciELO (${m.ano}) — licença CC BY 4.0.` });
      }
    }
  }

  if (FONTES.includes("wiki")) {
    // Esta fonte são 122 sementes pela API AO VIVO da Wikipédia, e ela depende do humor da borda da
    // Wikimedia com o IP de saída: a VPS levou 429 nas 122. Para carga de verdade use `wikipt`, que
    // lê o instantâneo em parquet (8.108 documentos por shard) de um host que não nos limita.
    // Os três desfechos são contados SEPARADAMENTE — foi juntá-los que escondeu o 429.
    const wiki = { ok: 0, falhou: 0, inexistente: 0, curto: 0 };
    const porque: Record<string, number> = {};
    for (const a of AREAS) {
      for (const t of a.wikipedia) {
        const r = await buscarJson(`https://pt.wikipedia.org/w/api.php?action=query&prop=extracts&explaintext=1&exsectionformat=plain&redirects=1&format=json&titles=${encodeURIComponent(t)}`);
        if (!r.ok) {
          wiki.falhou++;
          porque[r.motivo] = (porque[r.motivo] ?? 0) + 1;
          console.warn(`[wiki] FALHOU ${t}: ${r.motivo}`);
          await espera(300);
          continue;
        }
        const pag: any = Object.values(r.dados?.query?.pages ?? {})[0];
        // `missing` é a resposta da API pra verbete que não existe — é redirecionamento morto ou
        // título trocado na nossa lista, e tem conserto diferente de rede.
        if (!pag || pag.missing !== undefined) {
          wiki.inexistente++;
          console.warn(`[wiki] verbete inexistente: ${t}`);
          await espera(300);
          continue;
        }
        const texto = String(pag.extract ?? "").slice(0, 20_000);
        if (texto.length < 500) {
          wiki.curto++;
          console.warn(`[wiki] verbete curto: ${t} (${texto.length} chars)`);
          await espera(300);
          continue;
        }
        wiki.ok++;
        await gravar(a.slug, "wikipedia", { chave: `wiki-pt-${pag.title}`, titulo: `${pag.title} (Wikipédia)`, texto: `${texto}\n\nFonte: Wikipédia em português, verbete "${pag.title}" — licença CC BY-SA 4.0.` });
        // O passo fica FORA do caminho de sucesso: antes a pausa só acontecia quando dava certo, e
        // uma rodada limitada batia na Wikimedia sem pausa nenhuma — piorando o que já estava ruim.
        await espera(300);
      }
    }
    console.log(`[wiki] ${wiki.ok} ok · ${wiki.falhou} falharam · ${wiki.inexistente} inexistentes · ${wiki.curto} curtos`);
    for (const [m, n] of Object.entries(porque).sort((x, y) => y[1] - x[1])) console.log(`[wiki]   ${n}x ${m}`);
    if (wiki.ok === 0 && wiki.falhou > 0) {
      console.warn("[wiki] NENHUMA semente entrou e todas falharam na rede — é limite da Wikimedia pro IP de saída, não verbete vazio. Use `--fontes wikipt`.");
    }
  }

  if (FONTES.includes("medicina")) {
    // "<s> [INST] <<SYS>>…<</SYS>> pergunta [/INST] resposta </s>" → lotes de 20 perguntas e respostas por documento
    // Lê o PARQUET direto do Hugging Face, sem JSONL intermediário. Antes dependia de um arquivo em
    // --dir, e foi assim que esta fonte morreu: o /tmp da VPS foi limpo e ela não pôde ser retomada.
    // Dá pra ler direto porque estes dois são pequenos e bem repartidos — medido em 2026-11-08:
    // 5,5 MB / 10.000 linhas / 10 grupos e 3,0 MB / 6.865 linhas / 7 grupos, pico de 90 MB de RSS.
    // (A SciELO NÃO cabe nesse caminho: 2 grupos, páginas gigantes, pico de 11 GB — por isso ela
    // continua passando pelo scripts/scielo-para-jsonl.ts.)
    const hp = await import("hyparquet").catch((e: unknown) => {
      throw new Error(`o pacote \`hyparquet\` não está neste contêiner. Reconstrua a imagem, ou: `
        + `\`docker exec -u 0 -w /app zaeon_web npm i hyparquet --no-audit --no-fund\`. `
        + `Erro original: ${(e as Error)?.message ?? e}`);
    });
    const fontes = [
      { ds: "rhaymison/medicine-medical_meadow_wikidoc_pt", areas: ["medicina", "enfermagem"] },
      { ds: "rhaymison/medicine-information-pt", areas: ["farmacia", "medicina"] },
    ];
    for (const f of fontes) {
      let lote: string[] = [];
      let n = 0;
      const fechar = async () => {
        if (!lote.length) return;
        n++;
        for (const area of f.areas) {
          await gravar(area, f.ds.split("/")[1], { chave: `${f.ds}-${n}`, titulo: `Perguntas e respostas de saúde (${f.ds.split("/")[1]}) — parte ${n}`, texto: `${lote.join("\n\n")}\n\nFonte: ${f.ds} (Hugging Face) — licença Apache-2.0.` });
        }
        lote = [];
      };
      const url = `https://huggingface.co/datasets/${f.ds}/resolve/main/data/train-00000-of-00001.parquet`;
      const file = await hp.asyncBufferFromUrl({ url });
      const metadata = await hp.parquetMetadataAsync(file);
      const linhas = await hp.parquetReadObjects({ file, metadata, columns: ["input"] }) as { input?: unknown }[];
      console.log(`[medicina] ${f.ds}: ${linhas.length.toLocaleString("pt-BR")} linhas (${(file.byteLength / 1048576).toFixed(1)} MB)`);
      for (const row of linhas) {
        const m = /\[\/SYS\]\]?|<<\/SYS>>/.exec(String(row.input ?? ""));
        const corpo = String(row.input ?? "").slice(m ? m.index + m[0].length : 0);
        const [perg, resp] = corpo.split("[/INST]");
        const P = perg?.replace(/<\/?s>|\[INST\]/g, "").trim(), R = resp?.replace(/<\/?s>/g, "").trim();
        if (P && R) lote.push(`**Pergunta:** ${P}\n**Resposta:** ${R}`);
        if (lote.length >= 20) await fechar();
      }
      await fechar();
    }
  }

  if (FONTES.includes("enem")) {
    for (const ano of ["2022", "2023", "2024"]) {
      const r = await fetch(`https://huggingface.co/datasets/maritaca-ai/enem/resolve/main/${ano}.jsonl`, { headers: UA });
      if (!r.ok) throw new Error(`enem ${ano}: HTTP ${r.status}`);
      for (const l of (await r.text()).split("\n")) {
        if (!l.trim()) continue;
        const q = JSON.parse(l);
        const alts = Array.isArray(q.alternatives) ? q.alternatives.map((a: string, i: number) => `${"ABCDE"[i]}) ${a}`).join("\n") : "";
        await gravar(AREA_GERAL, "enem", { chave: `enem-${ano}-${q.id}`, titulo: `ENEM ${ano} — ${q.id}`, texto: `${q.question}\n\n${alts}\n\nGabarito: ${q.label}\n\nFonte: maritaca-ai/enem (Hugging Face) — licença Apache-2.0.` });
      }
    }
  }

  if (FONTES.includes("arxiv")) {
    // Resumos do arXiv, que JÁ VÊM ROTULADOS pela taxonomia dele — nenhum classificador no caminho.
    // É isto que faz o arXiv servir e o peS2o não: medi o peS2o em 84.967 registros e o
    // classificador aproveitou 5,4%, com física e dados-ia em ZERO, porque ele é em inglês e os
    // nossos termos são em português. Rótulo pronto resolve de graça.
    // Licença: o METADADO (título + resumo) é CC0 1.0 pelos Termos de Uso das APIs do arXiv. O texto
    // completo NÃO é — tem licença do autor, com opções NonCommercial — e por isso não entra.
    const { AREAS_DO_ARXIV, ESPERA_MS, POR_PAGINA, artigosDoAtom, documentoDoArtigo, totalDoAtom, urlDaBusca } =
      await import("../lib/rag/arxiv");

    for (const area of AREAS_DO_ARXIV) {
      let aceitos = 0, vistos = 0, curtos = 0, total = -1;
      for (let inicio = 0; aceitos < POR_AREA; inicio += POR_PAGINA) {
        const r = await fetch(urlDaBusca(area, inicio, POR_PAGINA), { headers: UA }).catch(() => null);
        if (!r?.ok) { console.warn(`[arxiv] ${area} em start=${inicio}: HTTP ${r?.status ?? "falhou"}`); break; }
        const xml = await r.text();
        if (total < 0) total = totalDoAtom(xml);
        const artigos = artigosDoAtom(xml);
        // página vazia = fim da lista (ou o arXiv cortou): parar é o certo, não insistir
        if (!artigos.length) break;
        for (const a of artigos) {
          vistos++;
          const d = documentoDoArtigo(a, area);
          if (!d) { curtos++; continue; }
          if (aceitos >= POR_AREA) break;
          aceitos++;
          await gravar(area, "arxiv", { chave: d.chave, titulo: d.titulo, texto: d.texto });
        }
        if (inicio + POR_PAGINA >= total) break;
        await espera(ESPERA_MS);   // os Termos de Uso do arXiv pedem 3 s entre chamadas
      }
      console.log(`[arxiv] ${area.padEnd(16)} ${String(aceitos).padStart(5)} de ${total.toLocaleString("pt-BR")} disponíveis (vistos ${vistos}, resumo curto ${curtos})`);
      await espera(ESPERA_MS);
    }
  }

  if (FONTES.includes("mmlu")) {
    // `FreedomIntelligence/MMLU_Portuguese`, licença MIT (lida do cardData da API). 57 matérias x 2
    // splits = 114 CSVs pequenos baixados por `resolve` — nada de parquet e nada da API de linhas,
    // que limita. O mapa matéria→área e o agrupamento em lotes de 20 são puros e ficam em
    // lib/rag/mmlu, com 11 testes; aqui fica só o download.
    const { MATERIAS, MMLU_SPLITS, documentosDaMateria, linhasDoCsv, questaoMmlu, urlDoCsv } =
      await import("../lib/rag/mmlu");
    const materias = Object.keys(MATERIAS).sort();
    let tortas = 0;
    for (const materia of materias) {
      // os dois splits entram no MESMO balaio da matéria: `dev` tem 5 questões e sozinho daria um
      // documento de 5, que é curto demais pra valer um documento.
      const questoes: string[] = [];
      for (const split of MMLU_SPLITS) {
        const r = await fetch(urlDoCsv(split, materia), { headers: UA }).catch(() => null);
        if (!r?.ok) { console.warn(`[mmlu] ${materia}/${split}: HTTP ${r?.status ?? "falhou"}`); continue; }
        for (const linha of linhasDoCsv(await r.text())) {
          const q = questaoMmlu(linha);
          if (q) questoes.push(q); else tortas++;
        }
        await espera(250);
      }
      const docs = documentosDaMateria(materia, questoes);
      for (const d of docs) await gravar(d.area, "mmlu-pt", { chave: d.chave, titulo: d.titulo, texto: d.texto });
      console.log(`[mmlu] ${materia.padEnd(36)} ${String(questoes.length).padStart(5)} questões → ${docs.length} doc(s) em ${docs[0]?.area ?? "-"}`);
    }
    if (tortas) console.log(`[mmlu] ${tortas} linha(s) descartada(s) por formato`);
  }

  if (FONTES.includes("wikipt")) {
    // O contêiner em produção foi construído ANTES de o `hyparquet` entrar no package.json, então o
    // primeiro `--fontes wikipt` lá morreria com ERR_MODULE_NOT_FOUND cru. Dizer o que fazer é mais
    // útil que a pilha de erro do node.
    const hyparquet = await import("hyparquet").catch((e: unknown) => {
      throw new Error(
        "o pacote `hyparquet` não está neste contêiner (ele entrou no package.json junto com esta fonte). "
        + "Reconstrua a imagem, ou, pra resolver agora: "
        + "`docker exec -w /app zaeon_web npm i hyparquet --no-audit --no-fund`. "
        + `Erro original: ${(e as Error)?.message ?? e}`,
      );
    });
    const { asyncBufferFromUrl, parquetMetadataAsync, parquetReadObjects } = hyparquet;
    const { WIKI_CONFIG, WIKI_DATASET, WIKI_SHARDS, documentoDaWikipedia, ehDescarte, urlDoShard } =
      await import("../lib/rag/wikipedia");

    // TETO POR ÁREA, em ordem do dataset — e esta é a escolha que importa aqui.
    // Guardar o melhor por pontos exigiria segurar POR_AREA × 17 áreas × 20 KB de texto na memória
    // (meio giga), então a carga é POR FLUXO: cada verbete é ingerido na hora e a área para quando
    // enche. O efeito medido: área abundante (biologia 162/3.000, química 82/3.000) enche no
    // primeiro shard; área escassa (eng-civil 2/3.000) recolhe o corpus inteiro. A qualidade vem do
    // limiar do classificador (5 pontos) e do mínimo de 1.200 chars, não de ranquear.
    const porArea: Record<string, number> = {};
    const descartes: Record<string, number> = {};
    const BLOCO = 2000;

    for (let shard = 0; shard < Math.min(WIKI_SHARDS_USAR, WIKI_SHARDS); shard++) {
      const url = urlDoShard(shard);
      const file = await asyncBufferFromUrl({ url });
      const metadata = await parquetMetadataAsync(file);
      const total = Math.min(Number(metadata.num_rows), WIKI_LINHAS);
      console.log(`[wikipt] shard ${shard}: ${(file.byteLength / 1048576).toFixed(0)} MB, ${total.toLocaleString("pt-BR")} verbetes`);

      for (let ini = 0; ini < total; ini += BLOCO) {
        const fim = Math.min(ini + BLOCO, total);
        // só as colunas necessárias: o `id` não entra, e cada coluna a menos é faixa a menos na rede
        const linhas = await parquetReadObjects({ file, metadata, rowStart: ini, rowEnd: fim, columns: ["title", "text", "url"] });
        for (const linha of linhas) {
          const d = documentoDaWikipedia(linha as Record<string, unknown>);
          if (ehDescarte(d)) { descartes[d.descarte] = (descartes[d.descarte] ?? 0) + 1; continue; }
          if ((porArea[d.area] ?? 0) >= POR_AREA) { descartes.area_cheia = (descartes.area_cheia ?? 0) + 1; continue; }
          porArea[d.area] = (porArea[d.area] ?? 0) + 1;
          await gravar(d.area, "wikipedia-pt", { chave: d.chave, titulo: d.titulo, texto: d.texto });
        }
        if (fim % 20000 === 0 || fim === total) {
          const cheias = Object.keys(porArea).filter((a) => (porArea[a] ?? 0) >= POR_AREA).length;
          console.log(`[wikipt] shard ${shard} ${fim.toLocaleString("pt-BR")}/${total.toLocaleString("pt-BR")} — aceitos ${Object.values(porArea).reduce((x, y) => x + y, 0)} · ${cheias} área(s) cheia(s)`);
        }
      }
    }
    console.log(`[wikipt] fonte: ${WIKI_DATASET} (${WIKI_CONFIG}) · descartes: ${Object.entries(descartes).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}=${v}`).join(" ") || "nenhum"}`);
  }

  if (FONTES.includes("dataset")) {
    const { readdirSync, readFileSync, statSync } = await import("node:fs");
    const { join } = await import("node:path");
    // A ÁREA É O ENDEREÇO. `idArea("seguranca")` devolve um turmaId que `areasDoTurno` só pede se o
    // slug estiver em SLUGS_AREA — fora dele o documento entra no banco e NENHUM agente o alcança.
    // Já perdi uma carga assim: ingerida, contabilizada, invisível. Então a área desconhecida PARA aqui.
    const desconhecidas = new Set<string>();
    const areaValida = (a: string) => {
      if (a === AREA_GERAL || SLUGS_AREA.includes(a)) return true;
      desconhecidas.add(a);
      return false;
    };
    const pastas = readdirSync(DIR).filter((n) => !n.startsWith(".") && statSync(join(DIR, n)).isDirectory());
    if (!pastas.length) throw new Error(`--dir ${DIR} não tem pasta de área nenhuma (rodou scripts/dataset-montar.mjs?)`);

    for (const pasta of pastas.sort()) {
      const dir = join(DIR, pasta);
      for (const nome of readdirSync(dir).sort()) {
        if (nome.endsWith(".jsonl")) {
          let n = 0;
          for await (const row of jsonl(join(dir, nome))) {
            const area = String(row.area ?? pasta);
            if (!areaValida(area)) continue;
            if (!row.chave || !row.titulo || !String(row.texto ?? "").trim()) continue;
            await gravar(area, nome.replace(/\.jsonl$/, ""), { chave: String(row.chave), titulo: String(row.titulo), texto: String(row.texto) });
            if (++n % 500 === 0) console.log(`[dataset] ${pasta}/${nome}: ${n}`);
          }
          console.log(`[dataset] ${pasta}/${nome}: ${n} linhas`);
        } else if (nome.toLowerCase().endsWith(".pdf")) {
          if (!areaValida(pasta)) continue;
          const k = `${pasta} · pdf`;
          placar[k] ??= { novo: 0, reaproveitado: 0, erro: 0 };
          if (SECO) { placar[k].novo++; continue; }
          // `extrair` só é importado aqui: --seco roda de qualquer máquina, sem o parser de PDF.
          // E PDF_LOADER_URL ausente faz `extractPdfStructured` devolver null em silêncio — os 14 PDFs
          // entrariam todos como erro "leitura_falhou". Melhor parar antes, dizendo o que falta.
          if (!process.env.PDF_LOADER_URL) throw new Error("PDF_LOADER_URL não está no ambiente — sem ela o parser devolve null e todo PDF falha; rode com --fontes dataset depois de configurá-la, ou mova os PDFs de fora do --dir");
          const { extractPdfStructured } = await import("../lib/scholar/pdf");
          const r = await ingerirPdf(
            { ...deps!, extrair: extractPdfStructured },
            { bytes: readFileSync(join(dir, nome)), nomeArquivo: nome, origem: "dataset", criadoPor: "dataset:pdf", permissao: { turmaId: idArea(pasta) } },
          );
          placar[k][r.status]++;
          if (r.status === "erro") console.warn(`[erro] ${k} ${nome}: ${r.erro}`);
        }
      }
    }
    for (const a of desconhecidas) semArea.add(a);
  }

  console.log(SECO ? "[seco] nada gravado — contagem do que entraria:" : "[fim] resultado:");
  for (const [k, v] of Object.entries(placar).sort()) console.log(`  ${k.padEnd(28)} novos=${v.novo} reaproveitados=${v.reaproveitado} erros=${v.erro}`);

  // A falha vem DEPOIS do placar, de propósito: o que tinha área já foi ingerido e o operador precisa
  // ver o que entrou antes de ler o que ficou de fora. Mas sai com erro, porque pular área em
  // silêncio é como se perde uma carga: ingerida, contabilizada e invisível pro aluno.
  if (semArea.size) {
    throw new Error(
      `${[...semArea].sort().join(", ")}: área inexistente em lib/rag/areas — o que está acima FOI ingerido; `
      + "estes documentos NÃO, e não entram até a área existir COM o mentor dela "
      + "(área órfã rouba a classificação de quem tem dono e desliga o portão de escopo).",
    );
  }
}
main().then(() => process.exit(0), (e) => { console.error(e); process.exit(1); });
