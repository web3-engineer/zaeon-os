"use client";

/**
 * CursoArvoreNeuronal — a tela do CURSO (Sala de Estudos → card de curso) desenhada pela Árvore Neuronal.
 *
 * Liga três coisas que já existiam a um componente novo:
 *   - a árvore do curso (CursoRepo.arvore + grafo do motor) → lib/knowledge-tree/adaptadorCurso;
 *   - o MIOLO de cada lição (Aprendizado / No código / Teste) → montarConteudoLicaoHtml do CursoArvoreView,
 *     com a prática (PraticaDaLicao) ao lado quando a lição tem sandbox;
 *   - o progresso POR usuário + curso → /api/studio/forja/progresso (reserva offline no localStorage).
 *
 * Fica atrás da flag de runtime ARVORE_NEURONAL (lib/knowledge-tree/flag); desligada, a SalaCurso volta
 * pro CursoArvoreView antigo.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { useTranslation } from "react-i18next";
import ArvoreNeuronal from "@/components/knowledge-tree/ArvoreNeuronal";
import PraticaDaLicao from "@/components/study/PraticaDaLicao";
import { CSS_CURSO_ARVORE, montarConteudoLicaoHtml } from "@/components/studio/CursoArvoreView";
import { noArvoreDoCurso } from "@/lib/knowledge-tree/adaptadorCurso";
import { carregarProgresso, salvarProgresso } from "@/lib/knowledge-tree/persistencia";
import type { NoArvore } from "@/lib/knowledge-tree/tipos";
import type { CursoRepo } from "@/lib/forja/tipos";
import type { LicaoCurada } from "@/lib/forja/licaoCurada";

const ESC = (s: string) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

type Props = {
  curso: CursoRepo;
  /** o id do curso no catálogo (é a chave do progresso). */
  cursoId: string;
  licoes?: Record<string, LicaoCurada>;
  titulo?: string;
  onFechar?: () => void;
};

export default function CursoArvoreNeuronal({ curso, cursoId, licoes, titulo, onFechar }: Props) {
  const { t } = useTranslation();
  const arvore = useMemo(() => noArvoreDoCurso(curso, licoes ?? {}, titulo), [curso, licoes, titulo]);
  const [userId, setUserId] = useState<string | null>(null);
  const [concluidas, setConcluidas] = useState<string[]>([]);

  useEffect(() => {
    let vivo = true;
    carregarProgresso(cursoId).then((r) => { if (vivo) { setUserId(r.userId); setConcluidas(r.concluidas); } });
    return () => { vivo = false; };
  }, [cursoId]);

  const atual = useRef<string[]>([]);
  atual.current = concluidas;
  const onConcluir = useCallback((ids: string[]) => {
    const novo = Array.from(new Set([...atual.current, ...ids]));
    atual.current = novo;
    setConcluidas(novo);
    void salvarProgresso(userId, cursoId, novo, { op: "concluir", nos: ids });
  }, [userId, cursoId]);
  const onReiniciar = useCallback(() => {
    atual.current = [];
    setConcluidas([]);
    void salvarProgresso(userId, cursoId, [], { op: "reiniciar" });
  }, [userId, cursoId]);

  // as questões do miolo (escolha / escrita) — por delegação, cada bloco independente
  const interagir = useCallback((e: MouseEvent<HTMLDivElement>) => {
    const alvo = e.target as HTMLElement;
    const opt = alvo.closest?.(".av-opt") as HTMLElement | null;
    const bloco = alvo.closest?.(".av-qbloco") as HTMLElement | null;
    if (!bloco) return;
    const exp = bloco.querySelector(".av-exp") as HTMLElement | null;
    if (opt) {
      bloco.querySelectorAll(".av-opt").forEach((x) => x.classList.remove("ok", "no"));
      opt.classList.add(opt.dataset.ok ? "ok" : "no");
      if (exp) exp.innerHTML = opt.dataset.exp ? "<p>" + opt.dataset.exp + "</p>" : "";
      return;
    }
    const ver = alvo.closest?.(".av-ver") as HTMLElement | null;
    if (ver && exp) exp.innerHTML = "<p>" + ESC(t("forja.board.aceitaExemplo")) + " <code>" + (ver.dataset.resp || "") + "</code></p>";
  }, [t]);

  // o miolo da lição: o mesmo HTML curado do quadro antigo (Aprendizado / No código / Teste)
  const pai = useMemo(() => {
    const m = new Map<string, NoArvore>();
    const andar = (n: NoArvore) => { for (const f of n.filhos) { m.set(f.id, n); andar(f); } };
    andar(arvore);
    return m;
  }, [arvore]);
  const renderLicao = useCallback((no: NoArvore) => {
    const lic = licoes?.[no.id];
    const tipo = no.tipo === "raiz" ? "repo" : no.tipo === "modulo" ? "mod" : "sim";
    const mod = pai.get(no.id)?.titulo ?? curso.repo;
    const html = montarConteudoLicaoHtml({ titulo: no.titulo, tipo, mod, resumo: no.resumo, lic, tr: t });
    return <div className="av-card av-embutido" onClick={interagir} dangerouslySetInnerHTML={{ __html: html }} />;
  }, [licoes, pai, curso.repo, t, interagir]);
  const renderLado = useCallback((no: NoArvore) => {
    const sb = licoes?.[no.id]?.sandbox;
    return sb && (sb.inicial || "").trim() ? <PraticaDaLicao key={no.id} sandbox={sb} titulo={no.titulo} /> : null;
  }, [licoes]);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS_CURSO_ARVORE + EMBUTIDO }} />
      <ArvoreNeuronal
        arvore={arvore}
        concluidas={concluidas}
        onConcluir={onConcluir}
        onReiniciar={onReiniciar}
        renderLicao={renderLicao}
        renderLado={renderLado}
        titulo={(titulo || arvore.titulo || "").trim()}
        subtitulo={curso.repo}
        onFechar={onFechar}
      />
    </>
  );
}

// o miolo herda o visual do quadro antigo (.av-card h3/p/code/quiz) sem o cartão em volta
const EMBUTIDO = `.an-root{--ink:#eef2ff;--ink2:rgba(232,238,255,.92);--soft:rgba(200,212,240,.7);--panel:#1b1824;--panel-br:rgba(255,255,255,.12);--chip:rgba(255,255,255,.06);--chip-br:rgba(255,255,255,.16);--code-bg:#0b0d14;--code-ink:#cdd9ec;--code-br:rgba(255,255,255,.12);--accent:#67e8f9;--flow:linear-gradient(90deg,#f02bff,#8b5cf6 45%,#22d3ee)}
.av-embutido{background:none!important;border:0!important;box-shadow:none!important;padding:0!important;max-height:none!important;overflow:visible!important;border-radius:0!important}`;
