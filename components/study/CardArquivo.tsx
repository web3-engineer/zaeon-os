"use client";

/**
 * CardArquivo — o TUTORIAL DE UM ARQUIVO do repo: à esquerda o card (função do arquivo, sub-abas
 * horizontais, snippets + quiz + dúvida) e à direita o EDITOR onde o aluno DIGITA o trecho (sem colar).
 * A harmonia: o aluno digita cada snippet; completando o arquivo, roda o teste ponta-a-ponta (via
 * useCodeRunner, no navegador) — verde só quando o que ele escreveu de fato executa.
 */
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import EditorDoCard from "@/components/study/EditorDoCard";
import { useCodeRunner, type Language } from "@/app/agentic-modules/codelab/useCodeRunner";
import { snippetsDoCard, validarDigitado, programaDeTeste, montarArquivo, type CardDeArquivo, type Snippet } from "@/lib/forja/tutorialArquivo";

const LANG: Record<string, Language> = { python: "python", javascript: "javascript", typescript: "typescript", html: "html" };

export default function CardArquivo({ card, cursoId, onFechar, prepararTeste = "", bloqueado = false, pacotes, aoTestar }: { card: CardDeArquivo; cursoId?: string; onFechar?: () => void; prepararTeste?: string; bloqueado?: boolean; pacotes?: string[]; aoTestar?: (passou: boolean) => void }) {
  const { t } = useTranslation();
  const flat = useMemo(() => {
    const arr: { s: Snippet; aba: number; local: number }[] = [];
    (card.abas ?? []).forEach((a, ai) => (a.snippets ?? []).forEach((s, li) => arr.push({ s, aba: ai, local: li })));
    return arr;
  }, [card]);

  const [idx, setIdx] = useState(0);                 // snippet corrente (global)
  const [feitos, setFeitos] = useState<boolean[]>(() => flat.map(() => false));
  const [valor, setValor] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; txt: string } | null>(null);
  const [resultado, setResultado] = useState<{ passou: boolean; saida: string } | null>(null);
  const [pub, setPub] = useState<{ fase: "idle" | "indo" | "ok" | "erro"; msg?: string; url?: string }>({ fase: "idle" });
  const { run, isRunning, isPyodideReady, pyodideError } = useCodeRunner();

  const total = flat.length;
  const atual = flat[idx];
  const abaAtual = atual?.aba ?? 0;
  const completo = feitos.every(Boolean) && total > 0;
  const lang = LANG[card.linguagem] ?? "other";
  const precisaPy = lang === "python";
  const testeLocal = precisaPy && pacotes?.includes("rdkit");
  const baixarTeste = () => {
    const arquivo = montarArquivo(card) + [
      "", "", "if __name__ == '__main__':", "    import sys",
      "    if sys.argv[1:] == ['--testar']:",
      ...(card.teste ?? "").split("\n").map((linha) => "        " + linha),
      "        print('OK')", "    else:", "        print(main())", "",
    ].join("\n");
    const url = URL.createObjectURL(new Blob([arquivo], { type: "text/x-python" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "teste_projeto.py";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const conferir = () => {
    if (!atual) return;
    if (validarDigitado(atual.s, valor)) {
      const nf = [...feitos]; nf[idx] = true; setFeitos(nf);
      setMsg({ ok: true, txt: t("forja.card.certo") });
      // avança pro próximo snippet não-feito
      const prox = flat.findIndex((_, i) => i > idx && !nf[i]);
      if (prox !== -1) { setIdx(prox); setValor(""); setTimeout(() => setMsg(null), 1500); }
      else { setMsg({ ok: true, txt: t("forja.card.completo") }); setValor(""); }
    } else {
      setMsg({ ok: false, txt: t("forja.card.naoBate") });
    }
  };

  const rodar = async () => {
    const digitados = flat.map((f) => (feitos[flat.indexOf(f)] ? f.s.codigo : ""));
    const programa = programaDeTeste(card, digitados);
    const out = await run([prepararTeste, programa].filter(Boolean).join("\n"), lang, undefined, pacotes);
    const falhou = out.some((o) => o.type === "stderr" && o.text.trim());
    const saida = out.filter((o) => o.type === "stdout" || o.type === "stderr").map((o) => o.text).join("\n").trim();
    aoTestar?.(!falhou);
    setResultado({ passou: !falhou, saida: saida || (falhou ? "erro" : "ok") });
  };

  // F3 — subir o projeto no GitHub do aluno. Portão QA leve (F5-lite): só depois do teste VERDE. O servidor
  // monta os arquivos a partir dos cards (nunca do editor); aqui só disparamos com o cursoId.
  const publicar = async () => {
    if (!cursoId) return;
    setPub({ fase: "indo" });
    try {
      const st = await fetch("/api/octa/github").then((r) => r.json()).catch(() => null);
      if (!st?.conectado) {
        setPub({ fase: "erro", msg: t("forja.card.conecteGithub"), url: "/api/projects/github/connect" });
        return;
      }
      const r = await fetch("/api/studio/forja/publicar", {
        method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ cursoId }),
      });
      const j = await r.json().catch(() => null);
      if (r.ok && j?.repoUrl) { setPub({ fase: "ok", url: j.repoUrl }); return; }
      if (r.status === 409) { setPub({ fase: "erro", msg: t("forja.card.conecteGithub"), url: "/api/projects/github/connect" }); return; }
      if (r.status === 422 && Array.isArray(j?.motivos)) { setPub({ fase: "erro", msg: t("forja.card.naoPronto", { motivos: j.motivos.join(" ") }) }); return; }
      setPub({ fase: "erro", msg: j?.detalhe || t("forja.card.falhaPublicar") });
    } catch {
      setPub({ fase: "erro", msg: t("forja.card.falhaPublicar") });
    }
  };

  return (
    <div className="ca-root">
      {/* ESQUERDA: o card do arquivo */}
      <div className="ca-card">
        <div className="ca-head">
          <div className="ca-arq">{card.arquivo}</div>
          {onFechar && <button className="ca-x" onClick={onFechar}>{t("forja.card.voltar")}</button>}
        </div>
        <p className="ca-fun">{card.funcao}</p>

        {/* sub-abas horizontais (compacto na vertical) */}
        <div className="ca-tabs">
          {(card.abas ?? []).map((a, ai) => (
            <div key={ai} className={"ca-tab" + (ai === abaAtual ? " on" : "")}>{a.titulo}</div>
          ))}
        </div>

        {/* snippets da aba atual: o trecho a digitar + a explicação */}
        <div className="ca-snips">
          {flat.map((f, i) => f.aba === abaAtual ? (
            <div key={i} className={"ca-snip" + (i === idx ? " cur" : "") + (feitos[i] ? " ok" : "")}>
              <div className="ca-snip-exp">{feitos[i] ? "✓ " : i === idx ? "▸ " : ""}{f.s.explicacao}</div>
              <pre className="ca-snip-code">{f.s.codigo}</pre>
            </div>
          ) : null)}
        </div>

        {/* quiz da aba */}
        {(card.abas[abaAtual]?.quiz ?? []).map((q, qi) => q.tipo === "escolha" ? (
          <Quiz key={qi} enunciado={q.enunciado} opcoes={q.opcoes} />
        ) : null)}

        {/* input de dúvida (semente da camada do tutor — fase seguinte liga ao LLM) */}
        <DuvidaInput arquivo={card.arquivo} trecho={atual?.s.explicacao ?? ""} />
      </div>

      {/* DIREITA: o editor + rodar */}
      <div className="ca-lab">
        <div className="ca-lab-top">
          <span>{t("forja.card.digite")} <b>{atual?.s.explicacao ?? "—"}</b></span>
          <span className="ca-prog">{feitos.filter(Boolean).length}/{total}</span>
        </div>
        <div className="ca-edwrap">
          <EditorDoCard value={valor} onChange={setValor} linguagem={card.linguagem} placeholder={t("forja.card.editorPlaceholder")} />
        </div>
        {msg && <div className={"ca-msg" + (msg.ok ? " ok" : " no")}>{msg.txt}</div>}
        <div className="ca-acoes">
          <button className="ca-btn ghost" onClick={conferir} disabled={completo}>{t("forja.card.conferir")}</button>
          {testeLocal ? <button className="ca-btn pill" onClick={baixarTeste} disabled={!completo}>{t("forja.card.baixarTeste")}</button> : <button className="ca-btn pill" onClick={rodar} disabled={bloqueado || !completo || isRunning || (precisaPy && !isPyodideReady)}>
            {isRunning ? t("forja.card.rodando") : precisaPy && !isPyodideReady ? t("forja.card.carregandoPython") : t("forja.card.rodarTestes")}
          </button>}
        </div>
        {testeLocal && <p className="ca-msg">{t("forja.card.testeLocal", { instalar: "python -m pip install rdkit", rodar: "python teste_projeto.py --testar" })}</p>}
        {bloqueado && <p className="ca-msg">{t("forja.card.concluaDependencias", { arquivos: card.dependencias?.join(", ") })}</p>}
        {precisaPy && !testeLocal && pyodideError && <div className="ca-msg no">{t("forja.card.pythonErro")} {pyodideError}</div>}
        {resultado && (
          <div className={"ca-res" + (resultado.passou ? " ok" : " no")}>
            <b>{resultado.passou ? t("forja.card.passou") : t("forja.card.naoPassou")}</b>
            <pre>{resultado.saida}</pre>
          </div>
        )}

        {/* F3 — publicar no GitHub do aluno. Só com o teste VERDE (portão QA leve). */}
        {resultado?.passou && cursoId && (
          <div className="ca-pub">
            {pub.fase === "ok" ? (
              <div className="ca-msg ok">{t("forja.card.noGithub")} <a href={pub.url} target="_blank" rel="noreferrer" style={{ color: "#a7f3d0", textDecoration: "underline" }}>{t("forja.card.abrirRepo")}</a></div>
            ) : (
              <>
                <button className="ca-btn pill" onClick={publicar} disabled={pub.fase === "indo"}>
                  {pub.fase === "indo" ? t("forja.card.subindo") : t("forja.card.subirGithub")}
                </button>
                {pub.fase === "erro" && (
                  <div className="ca-msg no">
                    {pub.msg}{pub.url ? <> <a href={pub.url} style={{ color: "#fecaca", textDecoration: "underline" }}>{t("forja.card.conectar")}</a></> : null}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      <style>{`
        .ca-root{position:absolute;inset:0;display:grid;grid-template-columns:minmax(320px,1fr) minmax(360px,1.1fr);gap:14px;padding:16px;background:radial-gradient(900px 600px at 20% 0%,rgba(37,99,235,.14),transparent 60%),#04070f;color:#eaf0ff;font-family:ui-sans-serif,system-ui,sans-serif;overflow:auto}
        .ca-card,.ca-lab{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);border-radius:18px;padding:16px;display:flex;flex-direction:column;min-height:0}
        .ca-head{display:flex;align-items:center;justify-content:space-between}
        .ca-arq{font-family:ui-monospace,Menlo,monospace;font-size:12.5px;color:#9fb3d1}
        .ca-x{border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.07);color:#cfe;border-radius:999px;padding:4px 11px;font-size:12px;cursor:pointer}
        .ca-fun{font-size:14px;line-height:1.55;color:rgba(234,240,255,.9);margin:8px 0 12px}
        .ca-tabs{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px}
        .ca-tab{font-size:11.5px;padding:4px 11px;border-radius:999px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.12);color:rgba(230,236,255,.7)}
        .ca-tab.on{color:#fff;font-weight:700;background:linear-gradient(90deg,rgba(139,92,246,.5),rgba(34,211,238,.4));border-color:rgba(255,255,255,.3)}
        .ca-snips{display:flex;flex-direction:column;gap:8px;overflow:auto}
        .ca-snip{border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:9px 11px;background:rgba(3,7,15,.4);opacity:.6}
        .ca-snip.cur{opacity:1;border-color:rgba(139,92,246,.6);box-shadow:0 0 0 1px rgba(139,92,246,.3)}
        .ca-snip.ok{opacity:1;border-color:rgba(110,231,183,.5)}
        .ca-snip-exp{font-size:13px;color:rgba(234,240,255,.9);margin-bottom:6px}
        .ca-snip-code{margin:0;font-family:ui-monospace,Menlo,monospace;font-size:12px;color:#a5e88d;white-space:pre;overflow:auto}
        .ca-lab-top{display:flex;align-items:center;justify-content:space-between;font-size:12.5px;color:rgba(214,224,255,.8);margin-bottom:8px}
        .ca-prog{font-family:ui-monospace,monospace;color:#9fb3d1}
        .ca-edwrap{flex:1;min-height:200px}
        .ca-msg{margin-top:8px;font-size:12.5px;border-radius:10px;padding:7px 11px}
        .ca-msg.ok{background:rgba(110,231,183,.12);color:#d1fae5;border:1px solid rgba(110,231,183,.4)}
        .ca-msg.no{background:rgba(248,113,113,.1);color:#fecaca;border:1px solid rgba(248,113,113,.35)}
        .ca-acoes{display:flex;gap:10px;margin-top:10px}
        .ca-btn{border-radius:999px;padding:9px 16px;font-size:13px;cursor:pointer;color:#fff}
        .ca-btn.ghost{background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.16)}
        .ca-btn.pill{background:linear-gradient(90deg,#8b5cf6,#22d3ee);border:0;font-weight:700}
        .ca-btn:disabled{opacity:.45;cursor:not-allowed}
        .ca-res{margin-top:10px;border-radius:12px;padding:10px 12px}
        .ca-res.ok{background:rgba(110,231,183,.12);border:1px solid rgba(110,231,183,.45)}
        .ca-res.no{background:rgba(248,113,113,.1);border:1px solid rgba(248,113,113,.4)}
        .ca-res pre{margin:6px 0 0;font-family:ui-monospace,monospace;font-size:11.5px;color:#cdd9ec;white-space:pre-wrap}
        .ca-pub{margin-top:10px;display:flex;flex-direction:column;gap:8px}
      `}</style>
    </div>
  );
}

function Quiz({ enunciado, opcoes }: { enunciado: string; opcoes: { texto: string; correta: boolean; explicacao?: string }[] }) {
  const [sel, setSel] = useState<number | null>(null);
  return (
    <div style={{ marginTop: 10 }}>
      <p style={{ fontSize: 13, color: "rgba(234,240,255,.9)", margin: "0 0 6px" }}>{enunciado}</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {opcoes.map((o, i) => {
          const marcado = sel === i;
          const cor = marcado ? (o.correta ? "rgba(110,231,183,.5)" : "rgba(248,113,113,.5)") : "rgba(255,255,255,.14)";
          return (
            <button key={i} onClick={() => setSel(i)} style={{ textAlign: "left", border: `1px solid ${cor}`, borderRadius: 11, padding: "9px 12px", fontSize: 13, background: "rgba(255,255,255,.04)", color: "#eaf0ff", cursor: "pointer" }}>
              {o.texto}
              {marcado && o.explicacao ? <div style={{ fontSize: 12, color: "rgba(205,216,255,.75)", marginTop: 5 }}>{o.explicacao}</div> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function DuvidaInput({ arquivo, trecho }: { arquivo: string; trecho: string }) {
  const { t } = useTranslation();
  const [q, setQ] = useState("");
  const [enviadas, setEnviadas] = useState<string[]>([]);
  const enviar = () => {
    if (!q.trim()) return;
    setEnviadas((e) => [...e, q.trim()]);
    // semente da camada do tutor: evento que a fase do LLM vai consumir (pergunta + contexto do trecho)
    if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("zaeon:tutor:duvida", { detail: { arquivo, trecho, pergunta: q.trim() } }));
    setQ("");
  };
  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ display: "flex", gap: 8 }}>
        <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && enviar()}
          placeholder={t("forja.card.duvidaPlaceholder")}
          style={{ flex: 1, boxSizing: "border-box", borderRadius: 10, border: "1px solid rgba(255,255,255,.16)", background: "rgba(3,7,15,.5)", color: "#eaf0ff", padding: "9px 12px", fontSize: 13 }} />
        <button onClick={enviar} style={{ borderRadius: 10, border: "1px solid rgba(255,255,255,.16)", background: "rgba(255,255,255,.07)", color: "#cfe", padding: "0 14px", fontSize: 12.5, cursor: "pointer" }}>{t("forja.card.perguntar")}</button>
      </div>
      {enviadas.map((e, i) => (
        <div key={i} style={{ fontSize: 12, color: "rgba(205,216,255,.7)", marginTop: 6 }}>
          <b style={{ color: "#d8c9ff" }}>{t("forja.card.voce")}</b> {e} <i style={{ color: "rgba(205,216,255,.45)" }}>{t("forja.card.tutorProxima")}</i>
        </div>
      ))}
    </div>
  );
}
