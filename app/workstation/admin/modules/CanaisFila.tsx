"use client";

/**
 * CanaisFila — a FILA DE APROVAÇÃO da aba Canais (F2). O bloco onde um humano diz sim.
 *
 * Três coisas, nessa ordem, porque é a ordem em que o dono trabalha:
 *   1. escrever um rascunho (manual nesta fase — gerar com IA é chore, vem depois);
 *   2. ler a PRÉVIA ASSINADA e os dois avisos (vai truncar? tem PII?) e decidir;
 *   3. rodar o executor — primeiro em SIMULAR, que diz o que aconteceria sem gravar nada.
 *
 * O aviso de ensaio fica fixo no topo e não é removível: enquanto a F2 for a fase vigente,
 * "publicado" quer dizer "gravado e logado", não "está no feed". Esconder isso seria a pior
 * mentira que esta tela poderia contar.
 */
import { useCallback, useEffect, useState } from "react";
import { VIDRO_BOLHA, VIDRO_CHIP, VIDRO_INPUT, TXT, TXT_2, TXT_MUDO } from "@/lib/canal/vidro";

type Post = {
  id: string; agentKey: string; assinaria: string | null; rede: string; estado: string;
  texto: string; previa: string | null; limiteTexto: number | null;
  vaiTruncar: boolean | null; avisoPii: string | null;
  aprovadoPor: string | null; recusaMotivo: string | null;
  textoFinal: string | null; idExterno: string | null; adapterUsado: string | null;
  publicadoEm: string | null; tentativas: number; ultimoErro: string | null; classeErro: string | null;
  criadoEm: string | null;
};
type Voz = { agentKey: string; nome: string };
type Relatorio = { seco: boolean; publicados: number; falhados: number; devolvidos: number; pulados: number; itens: Array<{ id: string; rede: string; desfecho: string; classe?: string; detalhe?: string }> };

const NOME_REDE: Record<string, string> = { instagram: "Instagram", x: "X", linkedin: "LinkedIn" };

/** PURO: cor do estado do post. Verde só pra quem já saiu; âmbar pra quem espera gente. */
export function corDoEstado(e: string): string {
  if (e === "publicado") return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30";
  if (e === "aprovado" || e === "publicando") return "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/30";
  if (e === "rascunho") return "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30";
  return "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30"; // recusado | falhou
}

export type Acao = "aprovar" | "recusar" | "devolver" | "reenfileirar";

/** PURO: as ações que fazem sentido PARA ESTE estado (espelha TRANSICOES de lib/canais/fila). */
export function acoesDe(estado: string): Acao[] {
  if (estado === "rascunho") return ["aprovar", "recusar"];
  if (estado === "aprovado") return ["devolver", "recusar"];
  if (estado === "falhou") return ["aprovar", "recusar"];
  // Preso no claim (processo morreu no meio): destravar é a única ação honesta.
  if (estado === "publicando") return ["reenfileirar"];
  return []; // publicado e recusado são terminais
}

const BOTAO = `min-h-[32px] px-3 rounded-xl text-[11px] font-black uppercase tracking-wider ${VIDRO_CHIP}`;

export default function CanaisFila({ vozes }: { vozes: Voz[] }) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [estado, setEstado] = useState<"carregando" | "ok" | "erro">("carregando");
  const [agentKey, setAgentKey] = useState("");
  const [rede, setRede] = useState("linkedin");
  const [texto, setTexto] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [rel, setRel] = useState<Relatorio | null>(null);
  const [ocupado, setOcupado] = useState(false);

  const carregar = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/canais/posts", { cache: "no-store" });
      if (!res.ok) { setEstado("erro"); return; }
      const j = await res.json();
      setPosts(j.posts ?? []);
      setEstado("ok");
    } catch { setEstado("erro"); }
  }, []);
  useEffect(() => { void carregar(); }, [carregar]);
  useEffect(() => { if (!agentKey && vozes.length) setAgentKey(vozes[0].agentKey); }, [agentKey, vozes]);

  const criar = async () => {
    if (!texto.trim() || !agentKey) return;
    setOcupado(true); setMsg(null);
    try {
      const res = await fetch("/api/admin/canais/posts", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ agentKey, rede, texto }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) setMsg(j?.error ?? "não deu pra criar");
      else { setTexto(""); setMsg(j?.avisoPii ? `rascunho criado, mas tem PII: ${j.avisoPii}` : "rascunho criado"); await carregar(); }
    } finally { setOcupado(false); }
  };

  const agir = async (id: string, acao: string) => {
    const motivo = acao === "recusar" ? window.prompt("Motivo da recusa (opcional):") ?? "" : "";
    setOcupado(true); setMsg(null);
    try {
      const res = await fetch(`/api/admin/canais/posts/${id}`, {
        method: "PATCH", headers: { "content-type": "application/json" },
        body: JSON.stringify({ acao, motivo }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) setMsg(j?.error ?? "não deu pra mudar o estado");
      await carregar();
    } finally { setOcupado(false); }
  };

  const rodar = async (seco: boolean) => {
    setOcupado(true); setMsg(null); setRel(null);
    try {
      const res = await fetch(`/api/admin/canais/publicar${seco ? "?seco=1" : ""}`, { method: "POST" });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) setMsg(j?.error ?? "o executor falhou");
      else { setRel(j); if (!seco) await carregar(); }
    } finally { setOcupado(false); }
  };

  return (
    <section aria-label="Fila de aprovação" className={`mt-5 p-4 rounded-2xl ${VIDRO_BOLHA}`}>
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <h3 className={`text-[13px] font-black uppercase tracking-widest ${TXT}`}>Fila de aprovação</h3>
        <span className="px-2 py-0.5 rounded-full border text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30">
          modo ensaio — &quot;publicado&quot; = gravado e logado, NÃO está no feed
        </span>
      </div>
      <p className={`text-[12px] ${TXT_2} mb-3`}>
        Nada sai sem você aprovar. O executor desta fase usa o adapter <b>log</b>: ele percorre o caminho
        inteiro — assinatura, teto do dia, trava de PII, trava anti-envio-duplo — e grava o resultado,
        sem contatar rede nenhuma. Rede de verdade começa na F3 (LinkedIn).
      </p>

      {/* 1. rascunho */}
      <div className={`p-3 rounded-xl ${VIDRO_INPUT} mb-3`}>
        <div className="flex flex-wrap gap-2 mb-2">
          <select aria-label="Agente que assina" value={agentKey} onChange={(e) => setAgentKey(e.target.value)}
            className={`min-h-[32px] px-2 rounded-lg text-[12px] ${VIDRO_CHIP} ${TXT_2}`}>
            {vozes.map((v) => <option key={v.agentKey} value={v.agentKey}>{v.nome}</option>)}
          </select>
          <select aria-label="Rede" value={rede} onChange={(e) => setRede(e.target.value)}
            className={`min-h-[32px] px-2 rounded-lg text-[12px] ${VIDRO_CHIP} ${TXT_2}`}>
            {["linkedin", "x", "instagram"].map((r) => <option key={r} value={r}>{NOME_REDE[r]}</option>)}
          </select>
          <button type="button" disabled={ocupado || !texto.trim()} onClick={criar} className={`${BOTAO} ${TXT} disabled:opacity-40`}>
            criar rascunho
          </button>
        </div>
        <textarea value={texto} onChange={(e) => setTexto(e.target.value)} rows={3}
          placeholder="O texto do post. A assinatura do agente é aplicada no envio — não escreva ela aqui."
          className={`w-full p-2 rounded-lg text-[12px] bg-transparent border border-slate-200 dark:border-white/10 ${TXT_2}`} />
      </div>

      {msg && <p role="status" className={`mb-2 text-[12px] ${TXT_2}`}>{msg}</p>}

      {/* 3. executor */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <button type="button" disabled={ocupado} onClick={() => rodar(true)} className={`${BOTAO} ${TXT_2} disabled:opacity-40`}>simular</button>
        <button type="button" disabled={ocupado} onClick={() => rodar(false)} className={`${BOTAO} ${TXT} ring-1 ring-cyan-400/70 disabled:opacity-40`}>
          publicar aprovados (ensaio)
        </button>
        {rel && (
          <span className={`text-[11px] ${TXT_MUDO}`}>
            {rel.seco ? "simulação: " : "executado: "}
            <b className={TXT_2}>{rel.publicados}</b> publicados · <b className={TXT_2}>{rel.falhados}</b> falhos ·{" "}
            <b className={TXT_2}>{rel.devolvidos}</b> devolvidos · <b className={TXT_2}>{rel.pulados}</b> pulados
            {rel.seco ? " (nada foi gravado)" : ""}
          </span>
        )}
      </div>
      {rel && rel.itens.some((i) => i.detalhe) && (
        <ul className={`mb-3 text-[11px] ${TXT_MUDO} space-y-0.5`}>
          {rel.itens.filter((i) => i.detalhe).map((i) => (
            <li key={`${i.id}-${i.desfecho}`}>{NOME_REDE[i.rede] ?? i.rede} · {i.desfecho}{i.classe ? ` (${i.classe})` : ""} — {i.detalhe}</li>
          ))}
        </ul>
      )}

      {/* 2. a fila */}
      {estado === "carregando" && <p className={`text-[12px] ${TXT_MUDO}`}>carregando…</p>}
      {estado === "erro" && <p role="status" className="text-[12px] text-amber-700 dark:text-amber-300">⚠ não foi possível ler a fila.</p>}
      {estado === "ok" && posts.length === 0 && <p className={`text-[12px] ${TXT_MUDO}`}>nenhum post na fila.</p>}

      <ul className="space-y-2">
        {posts.map((p) => (
          <li key={p.id} className={`p-3 rounded-xl ${VIDRO_CHIP}`}>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wider ${corDoEstado(p.estado)}`}>{p.estado}</span>
              <span className={`text-[12px] font-semibold ${TXT}`}>{NOME_REDE[p.rede] ?? p.rede}</span>
              <span className={`text-[11px] ${TXT_MUDO}`}>assina: {p.assinaria ?? <b className="text-rose-500">{p.agentKey} (fora do roster)</b>}</span>
              {p.limiteTexto && <span className={`text-[11px] ${TXT_MUDO}`}>{(p.previa ?? p.texto).length}/{p.limiteTexto}</span>}
              <span className="ml-auto flex gap-1.5">
                {acoesDe(p.estado).map((a) => (
                  <button key={a} type="button" disabled={ocupado} onClick={() => agir(p.id, a)}
                    className={`${BOTAO} ${a === "aprovar" ? TXT : TXT_MUDO} disabled:opacity-40`}>{a}</button>
                ))}
              </span>
            </div>
            <pre className={`whitespace-pre-wrap text-[12px] ${TXT_2} font-sans`}>{p.textoFinal ?? p.previa ?? p.texto}</pre>
            {p.avisoPii && <p className="mt-1 text-[11px] text-rose-600 dark:text-rose-300">⛔ PII bloquearia o envio: {p.avisoPii}</p>}
            {p.vaiTruncar && <p className="mt-1 text-[11px] text-amber-700 dark:text-amber-300">⚠ vai sair truncado com &quot;…&quot; — a assinatura é inteira, o corpo cede</p>}
            {p.ultimoErro && <p className="mt-1 text-[11px] text-rose-600 dark:text-rose-300">{p.classeErro}: {p.ultimoErro}{p.tentativas ? ` (${p.tentativas} tentativa(s))` : ""}</p>}
            {p.recusaMotivo && <p className={`mt-1 text-[11px] ${TXT_MUDO}`}>recusado: {p.recusaMotivo}</p>}
            {p.idExterno && (
              <p className={`mt-1 text-[11px] ${TXT_MUDO}`}>
                {p.adapterUsado === "log" ? "ensaio" : p.adapterUsado} · {p.idExterno}
                {p.publicadoEm ? ` · ${new Date(p.publicadoEm).toLocaleString("pt-BR")}` : ""}
              </p>
            )}
            {p.aprovadoPor && !p.idExterno && <p className={`mt-1 text-[11px] ${TXT_MUDO}`}>aprovado por {p.aprovadoPor}</p>}
          </li>
        ))}
      </ul>
    </section>
  );
}
