/**
 * Núcleo de REDE do Studio (gerar artefato + acompanhar) — o mesmo no desktop
 * (StudyCoworkChat.runStudioAction) e no mobile (MobileChat). Sem React.
 *
 * Cada tipo tem o seu caminho no servidor, e isto preserva exatamente o que o desktop fazia:
 *  - podcast/vídeo: POST → polla /api/studio/:id (2,5s / 3s; teto 10 / 12 min); falha CALADA
 *  - molécula: síncrono (PubChem), precisa de meta.sdf
 *  - imagem: síncrono (Imagen), precisa de dataUrl
 *  - texto (guide/faq/flashcards/timeline): fire-and-forget → polla 2s até 5 min
 *  - diagrama interativo (archify): fire-and-forget → polla 2,5s até 4 min; .html via artifactId
 *  - mapa mental: AGORA é o diagrama (formato "mapa"); o mindmap estático antigo só entra de
 *    reserva se o diagrama falhar.
 */
export type BlocoStudio = { studioKind: string; title?: string; data?: any; artifactId?: string; dataUrl?: string };

export type ResultadoStudio =
  | { tipo: "pronto"; bloco: BlocoStudio }
  /**
   * `alternativas`: quando o servidor recusa por ter entendido a CATEGORIA em vez da peça, ele manda
   * junto os nomes REAIS que existem no atlas. Sem este campo a recusa chegava só como texto e o
   * aluno não via o que podia pedir — a sugestão morria aqui no cliente.
   */
  | { tipo: "erro"; mensagem?: string; silencioso?: boolean; alternativas?: { id: string; nome: string; pecas: number }[] }
  | { tipo: "cancelado" };

export const KINDS_TEXTO = ["mindmap", "guide", "faq", "flashcards", "timeline"] as const;

type Deps = {
  fetch?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  agora?: () => number;
  cancelado?: () => boolean;
};

const H = { "Content-Type": "application/json" };

/** Cria um estudo novo pelo tópico (fonte da geração quando não há estudo em foco). */
export async function criarEstudo(titulo: string, d: Deps = {}): Promise<{ id: string; title?: string } | null> {
  try {
    const r = await (d.fetch ?? fetch)("/api/study/spaces", { method: "POST", headers: H, body: JSON.stringify({ title: titulo || "Estudo" }) });
    if (!r.ok) return null;
    const s = await r.json();
    return s?.id ? s : null;
  } catch {
    return null;
  }
}

async function json(r: Response): Promise<any> { return r.json().catch(() => null); }

/**
 * `contexto` = a explicação que o aluno acabou de ler (o diagrama reflete ela); `sala` ajusta o rigor;
 * `pdf` = o PDF anexado na conversa (a AULA pode nascer dele).
 */
export type OpcoesStudio = { spaceId?: string; topic: string; contexto?: string; sala?: "estudos" | "pesquisa"; pdf?: { dataUrl: string; nome?: string } };

export async function gerarArtefato(kind: string, o: OpcoesStudio & Deps): Promise<ResultadoStudio> {
  const f = o.fetch ?? fetch;
  const sleep = o.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const agora = o.agora ?? (() => Date.now());
  const { spaceId, topic } = o;

  const acompanhar = async (id: string, intervalo: number, teto: number, silencioso: boolean, comArtifactId: boolean, kindFinal = kind): Promise<ResultadoStudio> => {
    const inicio = agora();
    while (agora() - inicio < teto) {
      await sleep(intervalo);
      if (o.cancelado?.()) return { tipo: "cancelado" };
      const d = await f(`/api/studio/${id}`).then(json).catch(() => null);
      if (!d) continue;
      if (d.status === "done") return { tipo: "pronto", bloco: { studioKind: kindFinal, title: d.title, data: semIR(d.meta), ...(comArtifactId ? { artifactId: d.id } : {}) } };
      if (d.status === "error") return { tipo: "erro", mensagem: d?.error, silencioso };
    }
    // teto: o desktop sempre parou CALADO aqui (todas as categorias) — preservado
    return { tipo: "erro", mensagem: "Demorou demais pra gerar.", silencioso: true };
  };

  try {
    if (kind === "diagram" || kind === "mindmap") {
      const r = await gerarDiagramaCliente(f, o, kind === "mindmap" ? "mapa" : "auto", acompanhar);
      if (r.tipo !== "erro" || kind !== "mindmap") return r;
      // reserva: o mapa mental estático de antes (texto), se o diagrama não saiu
    }
    if (kind === "aula") {
      // AULA interativa (lib/aula): plano → roteiro → narração por beat, em background (~1–3 min)
      const res = await f("/api/studio/aula", {
        method: "POST",
        headers: H,
        body: JSON.stringify({ spaceId: o.spaceId || undefined, topic, contexto: o.contexto, sala: o.sala, ...(o.pdf ? { pdf: o.pdf.dataUrl, pdfNome: o.pdf.nome } : {}) }),
      });
      const data = await json(res);
      if (!res.ok || !data?.id) return { tipo: "erro", mensagem: data?.error };
      if (data.status === "done") return { tipo: "pronto", bloco: { studioKind: "aula", title: data.title, data: data.meta, artifactId: data.id } };
      return acompanhar(data.id, 3000, 8 * 60_000, false, true, "aula");
    }
    if (kind === "caderno") {
      // CADERNO de Jornada (lib/jornadas): esqueleto CURADO e determinístico — a rota devolve pronto na hora.
      const res = await f("/api/studio/caderno", { method: "POST", headers: H, body: JSON.stringify({ topic: topic || "ritmo" }) });
      const data = await json(res);
      if (!res.ok || !data?.id) return { tipo: "erro", mensagem: data?.error };
      return { tipo: "pronto", bloco: { studioKind: "caderno", title: data.title, data: data.meta, artifactId: data.id } };
    }
    if (kind === "forja") {
      // ESTUDO DE REPOSITÓRIO (lib/forja): esqueleto CURADO e determinístico — a rota devolve pronto na hora.
      const res = await f("/api/studio/forja", { method: "POST", headers: H, body: JSON.stringify({ topic: topic || "exemplo" }) });
      const data = await json(res);
      if (!res.ok || !data?.id) return { tipo: "erro", mensagem: data?.error };
      return { tipo: "pronto", bloco: { studioKind: "forja", title: data.title, data: data.meta, artifactId: data.id } };
    }
    if (kind === "device") {
      // APP DE DISPOSITIVO (skill família device): o painel de download + instruções da skill. A rota lê o
      // espelho/sha e o corpo do SKILL.md (server) — determinístico, devolve pronto na hora. `topic` = slug.
      const res = await f("/api/studio/device", { method: "POST", headers: H, body: JSON.stringify({ slug: topic }) });
      const data = await json(res);
      if (!res.ok || !data?.id) return { tipo: "erro", mensagem: data?.error };
      return { tipo: "pronto", bloco: { studioKind: "device", title: data.title, data: data.meta, artifactId: data.id } };
    }
    if (kind === "podcast" || kind === "video") {
      const res = await f(`/api/studio/${kind}`, { method: "POST", headers: H, body: JSON.stringify({ spaceId, topic }) });
      const data = await json(res);
      if (!res.ok || !data?.id) return { tipo: "erro", silencioso: true };
      if (data.status === "done") return { tipo: "pronto", bloco: { studioKind: kind, title: data.title, data: data.meta, artifactId: data.id } };
      return acompanhar(data.id, kind === "video" ? 3000 : 2500, kind === "video" ? 12 * 60_000 : 10 * 60_000, true, true);
    }
    if (kind === "molecule") {
      // Não passa pelo pipeline de texto: a estrutura vem do PubChem, não de LLM.
      const res = await f("/api/studio/molecule", { method: "POST", headers: H, body: JSON.stringify({ spaceId, topic }) });
      const data = await json(res);
      return res.ok && data?.meta?.sdf
        ? { tipo: "pronto", bloco: { studioKind: "molecule", title: data.title, data: data.meta, artifactId: data.id } }
        : { tipo: "erro", mensagem: data?.error };
    }
    if (kind === "anatomia") {
      // Nem LLM nem rede: o atlas é local e `cenaDoConceito` é pura. Vai no molde do molecule (e não
      // no caminho genérico de texto no fim desta função) por UM motivo concreto: o genérico devolve
      // o bloco SEM `artifactId`, e sem ele o `leve()` do chat não tem como re-buscar um payload que
      // ele mesmo tirou do histórico. O `estado` é pequeno, mas quem decide isso é o chat, não aqui.
      const res = await f("/api/studio/anatomia", { method: "POST", headers: H, body: JSON.stringify({ spaceId, topic }) });
      const data = await json(res);
      return res.ok && data?.meta?.estado
        ? { tipo: "pronto", bloco: { studioKind: "anatomia", title: data.title, data: data.meta, artifactId: data.id } }
        : {
            tipo: "erro",
            mensagem: data?.error,
            ...(Array.isArray(data?.alternativas) && data.alternativas.length ? { alternativas: data.alternativas } : {}),
          };
    }
    // PEÇA CAD (Eiffel). Ramo próprio pelo mesmo motivo do `anatomia`: o caminho genérico lá embaixo
    // NÃO devolve `artifactId`, e aqui ele é obrigatório — `StudyCoworkChat.leve()` tira o `data` de
    // `cad` da conversa justamente porque glTF e STEP pesam megabytes, e sem o número o bloco não
    // teria como voltar. Sem este ramo a peça ou some ao reabrir, ou fica inteira na conversa.
    if (kind === "cad") {
      const res = await f("/api/studio/cad", { method: "POST", headers: H, body: JSON.stringify({ spaceId, topic }) });
      const data = await json(res);
      return res.ok && data?.id && data?.meta?.png
        ? { tipo: "pronto", bloco: { studioKind: "cad", title: data.title, data: data.meta, artifactId: data.id } }
        : { tipo: "erro", mensagem: data?.error };
    }
    if (kind === "image") {
      const res = await f("/api/studio/image", { method: "POST", headers: H, body: JSON.stringify({ spaceId, topic }) });
      const data = await json(res);
      return res.ok && data?.dataUrl
        // #749: com o número (artifactId), a imagem fica guardada na conversa e volta ao reabrir
        ? { tipo: "pronto", bloco: { studioKind: "image", title: data.title || "Imagem", data: data.meta, dataUrl: data.dataUrl, ...(data.id ? { artifactId: data.id } : {}) } }
        : { tipo: "erro", mensagem: data?.error };
    }
    // Texto: roda em BACKGROUND no servidor (fire-and-forget) → "queued" e polling até "done".
    // Cache hit já volta "done" com meta na hora.
    const res = await f(`/api/studio/${kind}`, { method: "POST", headers: H, body: JSON.stringify({ spaceId, topic, force: true }) });
    const data = await json(res);
    if (!res.ok || !data?.id) return { tipo: "erro", mensagem: data?.error };
    if (data.status === "done" && data.meta) return { tipo: "pronto", bloco: { studioKind: kind, title: data.title, data: data.meta } };
    return acompanhar(data.id, 2000, 5 * 60_000, false, false);
  } catch {
    return { tipo: "erro" };
  }
}

/** O IR completo fica no servidor (meta.ir); o bloco da conversa só precisa do tipo e do assunto. */
function semIR(meta: any): any {
  if (!meta || typeof meta !== "object" || !("ir" in meta)) return meta;
  const { ir: _ir, ...resto } = meta;
  return resto;
}

async function gerarDiagramaCliente(
  f: typeof fetch,
  o: OpcoesStudio,
  formato: "auto" | "mapa",
  acompanhar: (id: string, intervalo: number, teto: number, silencioso: boolean, comArtifactId: boolean, kindFinal?: string) => Promise<ResultadoStudio>,
): Promise<ResultadoStudio> {
  const res = await f("/api/studio/diagram", {
    method: "POST",
    headers: H,
    body: JSON.stringify({ spaceId: o.spaceId || undefined, topic: o.topic, contexto: o.contexto, sala: o.sala, formato }),
  });
  const data = await json(res);
  if (!res.ok || !data?.id) return { tipo: "erro", mensagem: data?.error };
  if (data.status === "done") return { tipo: "pronto", bloco: { studioKind: "diagram", title: data.title, data: semIR(data.meta), artifactId: data.id } };
  return acompanhar(data.id, 2500, 4 * 60_000, false, true, "diagram");
}
