"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import DiagramaMermaid from "@/components/chat/DiagramaMermaid";
import { docVazio, type DocBlueprint } from "@/lib/blueprint/tipos";
import { useEffect, useId, useRef, useState, type ClipboardEvent } from "react";
import { compilarSvg, validarDesenho } from "@/lib/harness/caderno/compile";
import type { CadernoEstudo } from "@/lib/estudos/cadernosEstudo";
import { DESTINO_MARKETPLACE } from "@/lib/ui/marketplaceRota";
import styles from "./caderno-estudo.module.css";

const PranchaBlueprint = dynamic(() => import("@/components/blueprint/PranchaBlueprint"), {
  ssr: false,
  loading: () => <p role="status">Carregando a prancha…</p>,
});

type Rascunho = {
  nota?: string;
  imagem?: string;
  respostas?: Record<number, number>;
  tarefas?: Record<string, boolean>;
  fixos?: DocBlueprint["fixos"];
};
type CadernoSalvo = Record<string, Rascunho>;

function Prancha({ bloco }: { bloco: Extract<CadernoEstudo["paginas"][number]["blocos"][number], { tipo: "prancha" }> }) {
  const id = useId();
  const desenho = validarDesenho(bloco.desenho);
  if (!desenho) return null;
  return (
    <figure className={styles.prancha}>
      <div role="img" aria-label={bloco.titulo} dangerouslySetInnerHTML={{ __html: compilarSvg(desenho, { idHachura: id }) }} />
      <figcaption>{desenho.legenda}</figcaption>
    </figure>
  );
}

function Video({ titulo, youtube }: { titulo: string; youtube: string }) {
  const [aberto, setAberto] = useState(false);
  if (!/^[\w-]{11}$/.test(youtube)) return null;
  return (
    <figure className={styles.video}>
      {aberto
        ? <iframe title={titulo} src={`https://www.youtube-nocookie.com/embed/${youtube}?autoplay=1`} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen />
        : <button type="button" onClick={() => setAberto(true)}>▶ Assistir no caderno</button>}
      <figcaption>{titulo}</figcaption>
    </figure>
  );
}

function Compilado({ caderno, salvo, fixos, fixar }: {
  caderno: CadernoEstudo;
  salvo: CadernoSalvo;
  fixos?: DocBlueprint["fixos"];
  fixar: (id: string, x: number, y: number) => void;
}) {
  const paginas = caderno.paginas.filter((pagina) => !pagina.blocos.some((bloco) => bloco.tipo === "compilado"));
  const doc: DocBlueprint = {
    ...docVazio(caderno.titulo, 0),
    area: "engenharia",
    resumo: caderno.resumo,
    fixos: fixos ?? {},
    passos: paginas.flatMap((pagina) => pagina.blocos.flatMap((bloco) => bloco.tipo === "tarefas"
      ? bloco.itens.map((tarefa) => ({
        id: tarefa.id,
        titulo: tarefa.titulo,
        corpo: `${salvo[pagina.id]?.tarefas?.[tarefa.id] ? "Concluída" : "Pendente"} · ${tarefa.entrega}`,
        fase: 1 as const,
        fontes: [],
      })) : [])),
    documentos: paginas.flatMap((pagina) => pagina.blocos.flatMap((bloco) => bloco.tipo === "video"
      ? [{ id: pagina.id, titulo: bloco.titulo, tipo: "base" as const, base: true, url: `https://www.youtube.com/watch?v=${bloco.youtube}` }] : [])),
  };
  const anotadas = paginas.filter(({ id }) => salvo[id]?.nota?.trim() || salvo[id]?.imagem);
  return (
    <>
      <div className={styles.board} aria-label="Prancha de síntese arrastável">
        <PranchaBlueprint id={`caderno-${caderno.id}`} doc={doc} acoes={{ podeEditar: true }} onFixar={fixar} skin="cartolina" />
      </div>
      <section className={styles.registro} aria-label="Anotações por página">
        <h3>Anotações por página</h3>
        {anotadas.length === 0 && <p>Suas anotações e imagens aparecerão aqui conforme você preencher as páginas.</p>}
        <ol>
          {anotadas.map(({ id, titulo }) => (
            <li key={id}>
              <h4>{titulo}</h4>
              {salvo[id]?.nota?.trim() && <p>{salvo[id].nota}</p>}
              {salvo[id]?.imagem && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={salvo[id].imagem} alt={`Imagem anotada em “${titulo}”`} />
              )}
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}

export default function CadernoEstudoView({ caderno }: { caderno: CadernoEstudo }) {
  const [indice, setIndice] = useState(0);
  const [salvo, setSalvo] = useState<CadernoSalvo>({});
  const [erro, setErro] = useState("");
  const [pronto, setPronto] = useState(false);
  const tituloPagina = useRef<HTMLHeadingElement>(null);
  const chave = `zaeon:caderno-estudo:${caderno.id}`;
  const pagina = caderno.paginas[indice];
  const rascunho = salvo[pagina.id] ?? {};
  const notaId = useId();
  const ehCompilado = pagina.blocos.some((bloco) => bloco.tipo === "compilado");

  useEffect(() => {
    try {
      const carregado = localStorage.getItem(chave);
      if (carregado) setSalvo(JSON.parse(carregado));
    } catch { /* O caderno ainda pode ser usado sem armazenamento. */ }
    setPronto(true);
  }, [chave]);

  useEffect(() => {
    if (!pronto) return;
    try { localStorage.setItem(chave, JSON.stringify(salvo)); }
    catch { setErro("O navegador não conseguiu guardar estas mudanças."); }
  }, [chave, pronto, salvo]);

  const atualizar = (mudanca: Partial<Rascunho>) => setSalvo((anterior) => ({
    ...anterior, [pagina.id]: { ...anterior[pagina.id], ...mudanca },
  }));

  function virar(novoIndice: number) {
    setErro("");
    setIndice(novoIndice);
    requestAnimationFrame(() => tituloPagina.current?.focus());
  }

  function colarImagem(evento: ClipboardEvent<HTMLTextAreaElement>) {
    const arquivo = Array.from(evento.clipboardData.files).find((item) => item.type.startsWith("image/"));
    if (!arquivo) return;
    evento.preventDefault();
    if (!/^image\/(png|jpeg|webp|gif)$/.test(arquivo.type) || arquivo.size > 650_000) {
      setErro("Cole uma imagem PNG, JPEG, WebP ou GIF de até 650 KB.");
      return;
    }
    const leitor = new FileReader();
    leitor.onload = () => {
      if (typeof leitor.result === "string") atualizar({ imagem: leitor.result });
    };
    leitor.onerror = () => setErro("Não foi possível ler a imagem.");
    leitor.readAsDataURL(arquivo);
  }

  return (
    <main className={styles.mesa}>
      <div className={styles.capa}>
        <Link href={DESTINO_MARKETPLACE}>← Marketplace</Link>
        <h1>{caderno.titulo}</h1>
        <p>{caderno.resumo}</p>
      </div>
      <article key={pagina.id} className={`${styles.papel} ${ehCompilado ? styles.folhaFinal : ""}`}>
        <h2 ref={tituloPagina} tabIndex={-1}>{pagina.titulo}</h2>
        {pagina.blocos.map((bloco, i) => {
          switch (bloco.tipo) {
            case "texto": return <p key={i}>{bloco.texto}</p>;
            case "prancha": return <Prancha key={i} bloco={bloco} />;
            case "video": return <Video key={i} titulo={bloco.titulo} youtube={bloco.youtube} />;
            case "diagrama": return (
              <figure className={styles.prancha} key={i}>
                <figcaption>{bloco.titulo}</figcaption>
                <DiagramaMermaid codigo={bloco.codigo} />
              </figure>
            );
            case "tarefas": return (
              <fieldset className={styles.tarefas} key={i}>
                <legend>O que precisa ser feito</legend>
                {bloco.itens.map(({ id, titulo, entrega }) => (
                  <label key={id}>
                    <input type="checkbox" checked={rascunho.tarefas?.[id] ?? false}
                      onChange={(event) => atualizar({ tarefas: { ...rascunho.tarefas, [id]: event.target.checked } })} />
                    <span><strong>{titulo}</strong><small>{entrega}</small></span>
                  </label>
                ))}
              </fieldset>
            );
            case "compilado": return (
              <Compilado key={i} caderno={caderno} salvo={salvo} fixos={rascunho.fixos}
                fixar={(id, x, y) => atualizar({ fixos: { ...rascunho.fixos, [id]: { x, y } } })} />
            );
            case "licao": {
              const resposta = rascunho.respostas?.[i];
              return (
                <fieldset className={styles.licao} key={i}>
                  <legend>{bloco.pergunta}</legend>
                  {bloco.alternativas.map((alternativa, j) => (
                    <button key={alternativa} type="button" aria-pressed={resposta === j}
                      onClick={() => atualizar({ respostas: { ...rascunho.respostas, [i]: j } })}>
                      {alternativa}
                    </button>
                  ))}
                  <p role="status">{resposta === bloco.correta ? bloco.explicacao : resposta !== undefined ? "Ainda não. Compare as opções e tente de novo." : ""}</p>
                </fieldset>
              );
            }
            case "fontes": return (
              <aside className={styles.fontes} key={i}>
                <h3>{bloco.titulo ?? "Fontes"}</h3>
                <ul>
                  {bloco.itens.map((f, j) => (
                    <li key={j}>
                      <a href={f.url} target="_blank" rel="noreferrer noopener">{f.titulo}</a>
                      <span> · {f.tipo}{f.nota ? ` — ${f.nota}` : ""}</span>
                    </li>
                  ))}
                </ul>
              </aside>
            );
            case "mobilizacao": return (
              <aside className={styles.mobilizacao} key={i}>
                <strong>Esta etapa precisa de um profissional: {bloco.papel}</strong>
                <p>{bloco.porque}</p>
                <p><em>Entrega esperada:</em> {bloco.entregaEsperada}</p>
                <div className={styles.mobilizacaoAcao}>
                  <a href="/research-lab?tab=escritorio">Abrir vaga no Escritório →</a>
                  <span>A Zaeon acompanha até a entrega.</span>
                </div>
              </aside>
            );
          }
        })}
        {!ehCompilado && <div className={styles.anotacoes}>
          <label htmlFor={notaId}>Minhas anotações</label>
          <textarea id={notaId} placeholder="Escreva uma observação ou cole texto e imagens aqui."
            value={rascunho.nota ?? ""} maxLength={12_000}
            onChange={(event) => atualizar({ nota: event.target.value })} onPaste={colarImagem} />
          {rascunho.imagem && (
            <figure>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={rascunho.imagem} alt="Imagem colada nesta página" />
              <button type="button" onClick={() => atualizar({ imagem: undefined })}>Remover imagem</button>
            </figure>
          )}
        </div>}
        {erro && <p role="status">{erro}</p>}
      </article>
      <nav className={styles.controles} aria-label="Virar página">
        <button type="button" disabled={indice === 0} onClick={() => virar(indice - 1)}>← Anterior</button>
        <span>{indice + 1} / {caderno.paginas.length}</span>
        <button type="button" disabled={indice === caderno.paginas.length - 1} onClick={() => virar(indice + 1)}>Próxima →</button>
      </nav>
    </main>
  );
}
