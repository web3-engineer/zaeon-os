"use client";

/**
 * BaseConhecimentoModule — aba "Base de conhecimento" do Admin (RAG F1): PDFs por turma que o chat do Zaeon consulta.
 * Seletor de turma · upload múltiplo (até 10 PDFs; cada arquivo vai num POST próprio, em sequência, com uma linha de
 * status por arquivo) · lista com status (indexando 12/40 · pronto · erro legível) · remover da turma · "testar busca".
 * Rotas: GET/POST/DELETE /api/admin/rag · POST /api/admin/rag/busca.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { VIDRO_CHIP, TXT, TXT_2, TXT_MUDO } from "@/lib/canal/vidro";

type Turma = { id: string; name: string };
type Documento = { id: string; titulo: string; nomeArquivo: string; paginas: number; status: string; erro: string | null; totalTrechos: number; comVetor: number; createdAt: string };
type Trecho = { trechoId: string; documentoId: string; titulo: string; texto: string; paginaIni: number; paginaFim: number; score: number };
type LinhaUpload = { nome: string; estado: "enviando" | "ok" | "reaproveitado" | "erro"; detalhe?: string };

export const MAX_ARQUIVOS = 10;

const ERROS: Record<string, string> = {
  grande_demais: "maior que 25 MB",
  sem_texto: "PDF sem texto (escaneado?)",
  leitura_falhou: "não consegui ler o PDF",
  indexacao_falhou: "falhou ao indexar — envie de novo",
  nao_pdf: "não é PDF",
  banco_indisponivel: "banco da base fora do ar — tente de novo",
};
/** PURO: código de erro -> português claro (código desconhecido aparece como veio). */
export const erroLegivel = (c: string | null | undefined): string => (c ? ERROS[c] ?? c : "");
/** PURO: mensagem para uma resposta HTTP que falhou — 503 é o banco da base fora do ar (a rota responde `banco_indisponivel`). */
export const erroDeResposta = (status: number, padrao: string): string => (status === 503 ? erroLegivel("banco_indisponivel") : padrao);
/** PURO: texto de status de um documento da lista. */
export function statusLegivel(d: Pick<Documento, "status" | "erro" | "comVetor" | "totalTrechos">): string {
  if (d.status === "erro") return `erro: ${erroLegivel(d.erro) || "desconhecido"}`;
  if (d.status === "indexando") return `indexando ${d.comVetor}/${d.totalTrechos}`;
  return "pronto";
}
const pagina = (t: Trecho) => (t.paginaIni === t.paginaFim ? `p. ${t.paginaIni}` : `pp. ${t.paginaIni}–${t.paginaFim}`);

export default function BaseConhecimentoModule({ glassPanel }: { glassPanel?: string }) {
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [turmaId, setTurmaId] = useState("");
  const [docs, setDocs] = useState<Documento[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [envio, setEnvio] = useState<LinhaUpload[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [pergunta, setPergunta] = useState("");
  const [achados, setAchados] = useState<{ trechos: Trecho[]; ms: number } | null>(null);
  const [buscando, setBuscando] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const carregar = useCallback(async (tid: string) => {
    try {
      const res = await fetch(`/api/admin/rag${tid ? `?turmaId=${encodeURIComponent(tid)}` : ""}`, { cache: "no-store" });
      if (!res.ok) { setErro(res.status === 401 || res.status === 403 ? "Sem permissão." : erroDeResposta(res.status, "Não consegui carregar a base.")); setCarregando(false); return; }
      const j = await res.json();
      setTurmas(j.turmas ?? []); setDocs(j.documentos ?? []); setErro(null);
      if (!tid && j.turmas?.length) setTurmaId(j.turmas[0].id);
    } catch { setErro("Não consegui carregar a base."); }
    setCarregando(false);
  }, []);
  useEffect(() => { void carregar(turmaId); }, [carregar, turmaId]);

  // enquanto algum documento indexa, atualiza o progresso
  const indexando = docs.some((d) => d.status === "indexando");
  useEffect(() => {
    if (!indexando || !turmaId) return;
    const t = setInterval(() => void carregar(turmaId), 4000);
    return () => clearInterval(t);
  }, [indexando, turmaId, carregar]);

  async function enviar(files: File[]) {
    if (!turmaId || files.length === 0 || enviando) return;
    const lote = files.slice(0, MAX_ARQUIVOS);
    setEnviando(true);
    setEnvio(lote.map((f) => ({ nome: f.name, estado: "enviando" })));
    for (let i = 0; i < lote.length; i++) {
      const fd = new FormData();
      fd.set("turmaId", turmaId);
      fd.append("arquivos", lote[i]);
      let linha: LinhaUpload;
      try {
        const res = await fetch("/api/admin/rag", { method: "POST", body: fd });
        const j = await res.json().catch(() => null);
        const r = j?.resultados?.[0];
        if (!res.ok || !r) linha = { nome: lote[i].name, estado: "erro", detalhe: erroDeResposta(res.status, "falha no envio") };
        else if (r.status === "erro") linha = { nome: lote[i].name, estado: "erro", detalhe: erroLegivel(r.erro) };
        else if (r.status === "reaproveitado") linha = { nome: lote[i].name, estado: "reaproveitado", detalhe: "já estava na base — liberado para esta turma" };
        else linha = { nome: lote[i].name, estado: "ok", detalhe: `${r.paginas} pág. · ${r.trechos} trechos` };
      } catch { linha = { nome: lote[i].name, estado: "erro", detalhe: "falha no envio" }; }
      setEnvio((atual) => atual.map((l, k) => (k === i ? linha : l)));
    }
    setEnviando(false);
    if (inputRef.current) inputRef.current.value = "";
    void carregar(turmaId);
  }

  async function remover(d: Documento) {
    if (!window.confirm(`Remover "${d.titulo}" desta turma?`)) return;
    const res = await fetch(`/api/admin/rag?documentoId=${encodeURIComponent(d.id)}&turmaId=${encodeURIComponent(turmaId)}`, { method: "DELETE" });
    if (!res.ok) setErro(erroDeResposta(res.status, "Não consegui remover."));
    void carregar(turmaId);
  }

  async function testar() {
    if (!turmaId || !pergunta.trim() || buscando) return;
    setBuscando(true); setAchados(null);
    try {
      const res = await fetch("/api/admin/rag/busca", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ turmaId, pergunta }) });
      if (res.ok) setAchados(await res.json()); else setErro(erroDeResposta(res.status, "A busca falhou."));
    } catch { setErro("A busca falhou."); }
    setBuscando(false);
  }

  const card = `${glassPanel ?? ""} rounded-3xl p-5`;
  return (
    <div className="space-y-5">
      <header>
        <h2 className={`text-xl font-black tracking-tight ${TXT}`}>Base de conhecimento</h2>
        <p className={`text-[12px] ${TXT_MUDO}`}>PDFs que o chat do Zaeon consulta para os alunos da turma escolhida.</p>
      </header>

      {erro && <p role="alert" className="text-[12px] text-rose-600 dark:text-rose-300">{erro}</p>}

      <section className={card} aria-label="Turma e upload">
        <div className="flex flex-wrap items-end gap-3">
          <label className={`text-[11px] font-bold uppercase tracking-wider ${TXT_MUDO}`}>
            Turma
            <select value={turmaId} onChange={(e) => { setTurmaId(e.target.value); setEnvio([]); setAchados(null); }} className={`mt-1 block min-h-[36px] px-3 rounded-xl text-[13px] normal-case tracking-normal ${VIDRO_CHIP} ${TXT}`}>
              {turmas.length === 0 && <option value="">{carregando ? "carregando…" : "nenhuma turma"}</option>}
              {turmas.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </label>
          <label className={`text-[11px] font-bold uppercase tracking-wider ${TXT_MUDO}`}>
            PDFs (até {MAX_ARQUIVOS})
            <input ref={inputRef} type="file" accept="application/pdf" multiple disabled={!turmaId || enviando}
              onChange={(e) => { const fs = Array.from(e.target.files ?? []); if (fs.length > MAX_ARQUIVOS) setErro(`Escolha no máximo ${MAX_ARQUIVOS} PDFs por vez — enviando os ${MAX_ARQUIVOS} primeiros.`); else setErro(null); void enviar(fs); }}
              className={`mt-1 block text-[12px] normal-case tracking-normal ${TXT_2}`} />
          </label>
        </div>
        {envio.length > 0 && (
          <ul className="mt-3 space-y-1" aria-label="Status do envio">
            {envio.map((l, i) => (
              <li key={i} className={`text-[12px] ${l.estado === "erro" ? "text-rose-600 dark:text-rose-300" : TXT_2}`}>
                <b className={TXT}>{l.nome}</b> — {l.estado === "enviando" ? "enviando…" : l.estado === "erro" ? `erro: ${l.detalhe}` : `${l.estado === "ok" ? "enviado" : "reaproveitado"} (${l.detalhe})`}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={card} aria-label="Documentos da turma">
        <h3 className={`text-[13px] font-black uppercase tracking-widest mb-3 ${TXT}`}>Documentos ({docs.length})</h3>
        {docs.length === 0 ? (
          <p className={`text-[12px] ${TXT_MUDO}`}>{carregando ? "Carregando…" : "Nenhum documento nesta turma ainda."}</p>
        ) : (
          <ul className="divide-y divide-slate-200/60 dark:divide-white/10">
            {docs.map((d) => (
              <li key={d.id} className="py-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                <div className="min-w-0 flex-1">
                  <p className={`text-[13px] font-semibold truncate ${TXT}`}>{d.titulo}</p>
                  <p className={`text-[11px] truncate ${TXT_MUDO}`}>{d.nomeArquivo} · {d.paginas} pág. · {d.totalTrechos} trechos</p>
                </div>
                <span className={`text-[11px] font-bold ${d.status === "erro" ? "text-rose-600 dark:text-rose-300" : d.status === "pronto" ? "text-emerald-700 dark:text-emerald-300" : "text-amber-700 dark:text-amber-300"}`}>{statusLegivel(d)}</span>
                <button type="button" onClick={() => void remover(d)} className={`min-h-[28px] px-2 rounded-lg text-[11px] font-bold ${VIDRO_CHIP} ${TXT_2}`}>remover</button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={card} aria-label="Testar busca">
        <h3 className={`text-[13px] font-black uppercase tracking-widest mb-3 ${TXT}`}>Testar busca</h3>
        <form onSubmit={(e) => { e.preventDefault(); void testar(); }} className="flex flex-wrap gap-2">
          <input value={pergunta} onChange={(e) => setPergunta(e.target.value)} placeholder="Pergunte algo que esteja nos PDFs da turma…" aria-label="Pergunta de teste"
            className={`flex-1 min-w-[220px] min-h-[36px] px-3 rounded-xl text-[13px] ${VIDRO_CHIP} ${TXT}`} />
          <button type="submit" disabled={!turmaId || !pergunta.trim() || buscando} className={`min-h-[36px] px-4 rounded-xl text-[12px] font-bold ${VIDRO_CHIP} ${TXT} disabled:opacity-50`}>{buscando ? "buscando…" : "buscar"}</button>
        </form>
        {achados && (
          <div className="mt-3 space-y-2">
            <p className={`text-[11px] ${TXT_MUDO}`}>{achados.trechos.length} trecho(s) em {achados.ms} ms</p>
            {achados.trechos.map((t) => (
              <article key={t.trechoId} className={`p-3 rounded-xl ${VIDRO_CHIP}`}>
                <p className={`text-[12px] font-bold ${TXT}`}>{t.titulo} <span className={`font-normal ${TXT_MUDO}`}>· {pagina(t)}</span></p>
                <p className={`mt-1 text-[12px] whitespace-pre-wrap ${TXT_2}`}>{t.texto.length > 600 ? `${t.texto.slice(0, 600)}…` : t.texto}</p>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
