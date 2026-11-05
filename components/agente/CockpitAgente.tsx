"use client";

/**
 * components/agente/CockpitAgente.tsx — a página de PESQUISA do agente de navegador (F8 → F10).
 *
 * O que ela mostra, e por que cada parte existe:
 *   - a SÍNTESE primeiro, com as fontes — é a resposta, e é o que o dono vem buscar;
 *   - o selo INCERTO quando a síntese não se sustenta nas páginas lidas. Resposta sem lastro
 *     marcada é útil; resposta sem lastro disfarçada de certa é o defeito que a casa persegue;
 *   - `recusadas`: o que o plano pediu e esta porta não faz (clicar, digitar, login). Sem isso um
 *     plano que pedia login terminaria com "pronto" e metade não teria acontecido;
 *   - os RESULTADOS da busca, pra o dono ver o que foi achado mesmo quando nada foi aberto;
 *   - as leituras cruas, por último, pra conferir a síntese contra a fonte.
 */
import { useState } from "react";

type Evento = { kind: string; label: string; status?: string; action?: { kind?: string; url?: string } };
type ResultadoBusca = { title: string; url: string; snippet: string };
type Sintese = { resposta: string; fontes: string[]; incerto: boolean };
type Resposta = {
  ok?: boolean;
  stop?: string;
  error?: string;
  erro?: string;
  detalhe?: string;
  motivo?: string;
  faltando?: string[];
  passos?: Evento[];
  leituras?: string[];
  sintese?: Sintese | null;
  resultados?: ResultadoBusca[];
  recusadas?: string[];
  allow?: string[];
  onde?: "container" | "web";
};

const COR: Record<string, string> = {
  done: "text-emerald-400",
  error: "text-red-400",
  blocked: "text-amber-400",
  waiting: "text-sky-400",
  running: "text-zinc-400",
};

const EXEMPLOS = [
  "quais são os prazos de inscrição do mestrado em Educação da UNILAB?",
  "o que a OMS recomenda hoje sobre tempo de tela na infância?",
  "resuma a ementa da disciplina de Cálculo I da UFC",
];

export default function CockpitAgente() {
  const [instrucao, setInstrucao] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [r, setR] = useState<Resposta | null>(null);
  const [verCru, setVerCru] = useState(false);

  async function rodar(texto = instrucao) {
    if (!texto.trim() || carregando) return;
    setCarregando(true);
    setR(null);
    try {
      const res = await fetch("/api/agentic/run", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ instrucao: texto }),
      });
      setR((await res.json()) as Resposta);
    } catch (e) {
      setR({ erro: "falha_de_rede", detalhe: String((e as Error)?.message ?? e) });
    } finally {
      setCarregando(false);
    }
  }

  const aberto = r?.allow?.includes("*");

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 text-zinc-200">
      <h1 className="text-xl font-semibold text-zinc-100">Pesquisa com navegador</h1>
      <p className="mt-2 text-sm text-zinc-400">
        O agente <strong className="text-zinc-300">busca</strong> na web, <strong className="text-zinc-300">abre</strong> as
        páginas (com JavaScript, ao contrário do Leitor) e <strong className="text-zinc-300">responde com as fontes</strong>.
        Somente leitura: não clica, não preenche formulário, não faz login — e isso é desenho, não configuração.
      </p>

      <label htmlFor="instrucao" className="mt-6 block text-sm font-medium text-zinc-300">
        O que você quer saber?
      </label>
      <textarea
        id="instrucao"
        value={instrucao}
        onChange={(e) => setInstrucao(e.target.value)}
        rows={3}
        maxLength={2000}
        placeholder="Pergunte, ou cole um endereço para ele abrir direto."
        className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-900 p-3 text-sm text-zinc-100 placeholder:text-zinc-500"
      />

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => rodar()}
          disabled={carregando || !instrucao.trim()}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
        >
          {carregando ? "Pesquisando…" : "Pesquisar"}
        </button>
        {!r && !carregando && (
          <span className="text-xs text-zinc-500">Pode levar um minuto: ele busca, abre e lê.</span>
        )}
      </div>

      {!r && !carregando && (
        <ul className="mt-5 space-y-1">
          {EXEMPLOS.map((ex) => (
            <li key={ex}>
              <button
                type="button"
                onClick={() => { setInstrucao(ex); void rodar(ex); }}
                className="text-left text-xs text-zinc-500 underline decoration-dotted hover:text-zinc-300"
              >
                {ex}
              </button>
            </li>
          ))}
        </ul>
      )}

      {r && (
        <div className="mt-8 space-y-6">
          {(r.erro || r.error) && (
            <section className="rounded-lg border border-red-900/60 bg-red-950/30 p-4">
              <h2 className="text-sm font-semibold text-red-300">Não rodou</h2>
              <p className="mt-1 text-sm text-red-200/80">{r.erro ?? r.error}{r.detalhe ? ` — ${r.detalhe}` : ""}</p>
              {!!r.faltando?.length && (
                <p className="mt-2 text-xs text-red-200/70">
                  Falta configurar: <code>{r.faltando.join(", ")}</code>
                </p>
              )}
            </section>
          )}

          {r.sintese && (
            <section className="rounded-lg border border-zinc-700 bg-zinc-900/60 p-4">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-zinc-100">Resposta</h2>
                {r.sintese.incerto && (
                  <span className="rounded bg-amber-900/50 px-2 py-0.5 text-xs text-amber-200">
                    incerto — sem lastro suficiente nas páginas lidas
                  </span>
                )}
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-200">{r.sintese.resposta}</p>
              {!!r.sintese.fontes.length && (
                <ul className="mt-3 space-y-1">
                  {r.sintese.fontes.map((u) => (
                    <li key={u}>
                      <a href={u} target="_blank" rel="noreferrer noopener"
                         className="text-xs text-sky-400 underline break-all">{u}</a>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          {!!r.recusadas?.length && (
            <section className="rounded-lg border border-amber-900/60 bg-amber-950/20 p-4">
              <h2 className="text-sm font-semibold text-amber-300">O plano pediu o que esta porta não faz</h2>
              <p className="mt-1 text-xs text-amber-200/70">Recusado por desenho (somente leitura, sem humano na página):</p>
              <ul className="mt-2 flex flex-wrap gap-2">
                {r.recusadas.map((x, i) => (
                  <li key={`${x}-${i}`} className="rounded bg-amber-900/40 px-2 py-0.5 text-xs text-amber-100">{x}</li>
                ))}
              </ul>
            </section>
          )}

          {r.motivo && <p className="text-sm text-zinc-400">{r.motivo}</p>}

          {!!r.resultados?.length && (
            <section>
              <h2 className="text-sm font-semibold text-zinc-100">O que a busca achou</h2>
              <ul className="mt-2 space-y-2">
                {r.resultados.map((x) => (
                  <li key={x.url}>
                    <a href={x.url} target="_blank" rel="noreferrer noopener"
                       className="text-sm text-sky-400 underline">{x.title || x.url}</a>
                    <p className="text-xs text-zinc-500">{x.snippet}</p>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {!!r.passos?.length && (
            <section>
              <h2 className="text-sm font-semibold text-zinc-100">
                Passos <span className="text-zinc-500">({r.stop}{r.onde ? ` · ${r.onde}` : ""})</span>
              </h2>
              <ol className="mt-2 space-y-1">
                {r.passos.map((p, i) => (
                  <li key={i} className="flex gap-2 text-sm">
                    <span className={COR[p.status ?? ""] ?? "text-zinc-400"}>•</span>
                    <span className="text-zinc-300">{p.label}</span>
                    {p.action?.url && <span className="truncate text-xs text-zinc-500">{p.action.url}</span>}
                  </li>
                ))}
              </ol>
            </section>
          )}

          {!!r.leituras?.length && (
            <section>
              <button type="button" onClick={() => setVerCru((v) => !v)}
                      className="text-sm font-semibold text-zinc-100 underline decoration-dotted">
                {verCru ? "Esconder" : "Ver"} o texto lido ({r.leituras.length})
              </button>
              {verCru && r.leituras.map((t, i) => (
                <pre key={i} className="mt-2 max-h-80 overflow-auto whitespace-pre-wrap rounded-lg border border-zinc-800 bg-zinc-900/60 p-3 text-xs text-zinc-300">
                  {t}
                </pre>
              ))}
            </section>
          )}

          <p className="text-xs text-zinc-500">
            {aberto
              ? "Domínios: internet aberta (IP privado, loopback e metadados da nuvem seguem bloqueados)."
              : `Domínios liberados: ${(r.allow ?? []).join(", ")}`}
          </p>
        </div>
      )}
    </div>
  );
}
