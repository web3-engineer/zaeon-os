"use client";

/**
 * SalaCurso — a ÁREA PRÓPRIA de um curso de código na Sala de Estudos. Busca o CursoRepo pelo cursoId
 * (rota /api/studio/forja, que resolve curado OU skill-curso) e enche o grafo preguiçosamente pelo motor
 * (/api/studio/forja/mapa); depois renderiza a CursoCodigoView em tela cheia. Sem motor, o board degrada
 * pro esqueleto, sem travar.
 */
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import CursoArvoreView from "@/components/studio/CursoArvoreView";
import PraticaDaLicao from "@/components/study/PraticaDaLicao";
import CardArquivo from "@/components/study/CardArquivo";
import { comBaseDoGrafo, mesclarEnriquecimento } from "@/lib/forja/arvoreDoGrafo";
import type { CursoRepo } from "@/lib/forja/tipos";
import type { LicaoCurada } from "@/lib/forja/licaoCurada";
import { montarArquivo } from "@/lib/forja/tutorialArquivo";
import type { CardDeArquivo } from "@/lib/forja/tutorialArquivo";

const H = { "content-type": "application/json" };
type MetaCurso = CursoRepo & { licoesPorNo?: Record<string, LicaoCurada> };

export default function SalaCurso({ cursoId, titulo, onFechar }: { cursoId: string; titulo?: string; onFechar?: () => void }) {
  const { t } = useTranslation();
  const [curso, setCurso] = useState<CursoRepo | null>(null);
  const [licoes, setLicoes] = useState<Record<string, LicaoCurada>>({});
  const [erro, setErro] = useState(false);
  const [pratica, setPratica] = useState<string | null>(null);
  const [visitadas, setVisitadas] = useState<string[]>([]);
  const abrir = useCallback((id: string) => {
    setVisitadas((atuais) => atuais.includes(id) ? atuais : [...atuais, id]);
    setPratica(id);
  }, []);
  const abrirLicao = useCallback((id: string) => abrir(`licao:${id}`), [abrir]);
  const [pacotes, setPacotes] = useState<string[]>([]);
  const [preparar, setPreparar] = useState<string | null>(null);
  const [aprovados, setAprovados] = useState<Record<string, boolean>>({});
  const [cards, setCards] = useState<CardDeArquivo[]>([]);

  useEffect(() => {
    let vivo = true;
    setCurso(null); setLicoes({}); setErro(false); setPratica(null); setVisitadas([]); setCards([]); setPreparar(null); setPacotes([]); setAprovados({});
    (async () => {
      try {
        const r = await fetch("/api/studio/forja", { method: "POST", headers: H, body: JSON.stringify({ topic: cursoId }) });
        const j = await r.json().catch(() => null);
        if (!vivo) return;
        if (!r.ok || !j?.meta) { setErro(true); return; }
        const c = j.meta as MetaCurso;
        setCurso(c);                        // base curada já ensina (não espera o motor)
        setLicoes(c.licoesPorNo ?? {});     // lições reais (estudo/prova/sandbox) por nó
        if (Array.isArray(j.pacotes)) setPacotes(j.pacotes);
        if (typeof j.prepararTeste === "string") setPreparar(j.prepararTeste);
        if (Array.isArray(j.cards)) setCards(j.cards as CardDeArquivo[]); // tutorial de arquivo (F2/demo)
        // Camadas: a base curada (c.arvore) manda. O motor (graphify/understand), quando a box responde,
        // ENRIQUECE por cima — some ramos do código real à base, sem apagá-la. Sem base curada, o
        // enriquecimento É a árvore. Sem motor, nada muda (fica a base). Nunca esvazia.
        const temBaseCurada = (c.arvore?.raiz?.filhos?.length ?? 0) > 0;
        const rm = await fetch("/api/studio/forja/mapa", { method: "POST", headers: H, body: JSON.stringify({ cursoId }) }).then((x) => x.json()).catch(() => null);
        if (vivo && rm && (rm.arvoreUA || rm.grafo?.nos?.length)) {
          const grafo = rm.grafo ?? c.grafo;
          const doMotor = rm.arvoreUA ?? comBaseDoGrafo({ arvore: { raiz: { ...c.arvore.raiz, filhos: [] } }, grafo }, titulo || c.arvore.raiz.titulo);
          const arvore = temBaseCurada ? mesclarEnriquecimento(c.arvore, doMotor) : doMotor;
          setCurso({ ...c, grafo, arvore });
        }
      } catch {
        if (vivo) setErro(true);
      }
    })();
    return () => { vivo = false; };
  }, [cursoId]);

  if (erro) {
    return (
      <div className="grid h-full place-items-center bg-[#060b16] text-center text-[13px] text-white/60">
        <div>
          {t("forja.sala.erro")}
          {onFechar && <div className="mt-3"><button type="button" onClick={onFechar} className="rounded-full border border-white/15 px-3 py-1 text-white/70 hover:text-white">{t("forja.sala.voltar")}</button></div>}
        </div>
      </div>
    );
  }
  if (!curso) return <div className="grid h-full place-items-center bg-[#060b16] text-[13px] text-cyan-300/60">{t("forja.sala.montando")}</div>;

  const arquivos = cards.filter((card) => !card.residual && card.abas.some((aba) => aba.snippets.length));
  const opcoes = [
    ...arquivos.map((card, i) => ({ id: `arquivo:${i}`, titulo: card.arquivo, card })),
    ...Object.entries(licoes).flatMap(([id, licao]) => licao.sandbox ? [{
      id: `licao:${id}`, titulo: curso.arvore.raiz.filhos.find((no) => no.id === id)?.titulo ?? id, sandbox: licao.sandbox,
    }] : []),
  ];

  return (
    <div className="relative h-full">
      <div className="h-full" hidden={pratica !== null}>
        <CursoArvoreView curso={curso} licoes={licoes} titulo={titulo || curso.arvore.raiz.titulo} onFechar={onFechar} onPraticar={abrirLicao} />
        {opcoes.length > 0 && (
          <button type="button" onClick={() => abrir(opcoes[0].id)}
            className="absolute bottom-5 right-5 z-20 rounded-full bg-gradient-to-r from-violet-500 to-cyan-400 px-5 py-2.5 text-[13px] font-bold text-white">
            {t("forja.sala.praticar")}
          </button>
        )}
      </div>
      {visitadas.length > 0 && (
        <div hidden={pratica === null} className="h-full overflow-y-auto bg-[#060b16] text-slate-100">
          <div className="flex flex-wrap items-center gap-3 border-b border-white/15 p-3">
            <button type="button" onClick={() => setPratica(null)}>{t("forja.card.voltar")}</button>
            <select aria-label={t("forja.sala.praticar")} value={pratica ?? ""} onChange={(e) => abrir(e.target.value)}
              className="max-w-full rounded-lg bg-slate-800 p-2">
              {opcoes.map((opcao) => <option key={opcao.id} value={opcao.id}>{opcao.titulo}</option>)}
            </select>
          </div>
          {opcoes.filter((opcao) => visitadas.includes(opcao.id)).map((opcao) => (
            <div key={opcao.id} hidden={pratica !== opcao.id}>
              {"card" in opcao && opcao.card
                ? <CardArquivo
                    card={opcao.card}
                    cursoId={preparar === null || arquivos.every((a) => aprovados[a.arquivo]) ? cursoId : undefined}
                    bloqueado={opcao.card.dependencias?.some((path) => !aprovados[path])}
                    pacotes={pacotes}
                    prepararTeste={opcao.card.linguagem === "javascript" ? [
                      preparar,
                      ...(opcao.card.dependencias ?? []).map((path) => {
                        const dep = arquivos.find((a) => a.arquivo === path);
                        return dep && aprovados[path] ? montarArquivo(dep) : "";
                      }),
                    ].filter(Boolean).join("\n") : undefined}
                    aoTestar={(passou) => setAprovados((atuais) => ({ ...atuais, [opcao.titulo]: passou }))}
                  />
                : "sandbox" in opcao && opcao.sandbox && <PraticaDaLicao sandbox={opcao.sandbox} titulo={opcao.titulo} />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
