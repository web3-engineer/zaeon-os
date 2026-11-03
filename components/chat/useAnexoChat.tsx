"use client";
/**
 * useAnexoChat — anexar arquivo NO CHAT (Sala de Estudos e Sala de Pesquisa, o mesmo comportamento):
 * 📎 do composer, ou soltar um arquivo em cima da conversa. O PDF NÃO abre no leitor — a IA lê e responde
 * sobre ele (vai junto em cada pergunta enquanto o chip 📎 estiver lá). O PDF também entra na biblioteca
 * (dá pra arrastar de lá pro leitor depois). Imagem: só anexa (Gemini Vision).
 *
 * `EVT_ANEXAR` (detail `{ sala, id, nome, dataUrl, perguntar? }`): a sala pede pro chat ler um arquivo da
 * biblioteca (ex.: ▶ de um documento) e, opcional, já perguntar algo.
 *
 * MINHA BASE (RAG F3): todo PDF que o aluno logado anexa (📎 com vários, soltar vários, soltar uma PASTA) também sobe
 * pra base pessoal dele — a bandeja acima do composer mostra cada um. 1 PDF: segue o chip de hoje (a IA lê inteiro)
 * e a base guarda em silêncio. Vários: um chip 📚 POR ARQUIVO (`lote`, lib/chat/loteAnexos) que fica enquanto estiver
 * na conversa — as perguntas levam os nomes e o conteúdo vem da base; a Aura confirma o lote (`aoGuardar`).
 * Sem sessão (401): comportamento antigo (a IA lê o primeiro).
 *
 * ARQUIVO DE TEXTO (.txt/.md) — F1 de docs/PLANO_HARNESS_AGENTICO.md. Antes este hook filtrava
 * `ehPdf` e um .txt solto na conversa era DESCARTADO EM SILÊNCIO: não era PDF, não era imagem, a
 * função voltava sem fazer nada. O servidor já aceitava (`/api/rag/minha-base` + lib/rag/textoArquivo),
 * então o pedido "receber múltiplos arquivos de texto" estava fechado só aqui, na porta do cliente.
 * Texto vai SEMPRE pela base (chip 📚), nunca pelo chip de leitura inteira — e isso é melhor de
 * propósito: o caminho do `fileData` DESLIGA o harness (app/api/ai/chat/route.ts gateia em
 * `!fileData`), enquanto o caminho da base mantém o laço, o RAG e as tools de pé.
 */
import { useCallback, useEffect, useRef, useState, type DragEvent } from "react";
import { useLibraryFiles, type LibraryFile } from "@/lib/useLibraryFiles";
import { blobParaDataUrl } from "@/lib/pdfStore";
import { arquivosDasEntradas, entradasDoDrop } from "@/lib/chat/arquivosSoltos";
import { enviarLote, type EstadoEnvio } from "@/lib/chat/enviarBase";
import { motivoDoErro, resumoDoEnvio, type ErroEnvio } from "@/lib/rag/minhaBase";
import { ehArquivoTexto, semExtensao } from "@/lib/rag/textoArquivo";
import type { ItemLote } from "@/lib/chat/loteAnexos";

export type AnexoChat = { id: string; nome: string; dataUrl: string };
/** Um PDF subindo pra "Minha base" (a bandeja acima do composer). */
export type EnvioBase = { chave: string; nome: string; estado: EstadoEnvio; erro?: ErroEnvio };
/** Quanto a bandeja fica depois que o lote termina. */
const BANDEJA_MS = 6000;
export type SalaChat = "pesquisa" | "estudos";
export const EVT_ANEXAR = "zaeon:chat:anexar";

const ehPdf = (f: File) => f.type === "application/pdf" || /\.pdf$/i.test(f.name);
/** .txt/.md — o MESMO critério do servidor (lib/rag/textoArquivo), pra cliente e rota não divergirem. */
const ehTexto = (f: File) => ehArquivoTexto({ name: f.name, type: f.type });
const ehSuportado = (f: File) => ehPdf(f) || ehTexto(f);
/** o nome sem a extensão, qualquer uma das que aceitamos */
const nomeLimpo = (f: File) => (ehPdf(f) ? f.name.replace(/\.pdf$/i, "") : semExtensao(f.name));

/** #414: o PDF arrastado da biblioteca não abriu (o site de origem recusou ou saiu do ar) — a mensagem da Aura, com o link
 *  pro site quando é um endereço da web (o upload local não tem pra onde mandar). */
export function avisoPdfNaoAbriu(titulo: string, pdfUrl: string): string {
  const nome = (titulo || "esse documento").replace(/\.pdf$/i, "");
  const web = /^https?:\/\//i.test(pdfUrl);
  return web
    ? `Não consegui abrir **${nome}** aqui: o site de origem não deixou baixar o PDF (ou saiu do ar). Abra no [site original](${pdfUrl}), baixe o arquivo e solte o PDF aqui na conversa — aí eu leio.`
    : `Não consegui abrir **${nome}**: o arquivo não está mais disponível. Solte o PDF de novo aqui na conversa — aí eu leio.`;
}

/** os bytes de um PDF da biblioteca como data: URL (remoto pelo proxy; upload local direto) */
export async function pdfDaBiblioteca(f: LibraryFile): Promise<string | null> {
  try {
    const r = await fetch(/^https?:\/\//i.test(f.pdfUrl) ? `/api/ai/scholar/pdf?url=${encodeURIComponent(f.pdfUrl)}` : f.pdfUrl);
    if (!r.ok) return null;
    return await blobParaDataUrl(await r.blob());
  } catch { return null; }
}

export function useAnexoChat(
  sala: SalaChat,
  o: {
    focar: () => void;
    perguntar: (texto: string) => void;
    /** soltar um documento DA BIBLIOTECA na conversa = a IA lê (Estudos) */
    aceitaBiblioteca?: boolean;
    /** a confirmação da Aura (Markdown) depois de guardar na base — a sala põe como mensagem dela */
    aoGuardar?: (markdown: string) => void;
  },
) {
  const { saveFile, files } = useLibraryFiles();
  const filesRef = useRef(files);
  filesRef.current = files;
  const [anexo, setAnexo] = useState<AnexoChat | null>(null);
  const [arrastando, setArrastando] = useState(false);
  const anexoRef = useRef<AnexoChat | null>(null);
  anexoRef.current = anexo;
  const oRef = useRef(o);
  oRef.current = o;

  const fixar = (a: AnexoChat | null) => { anexoRef.current = a; setAnexo(a); };

  // Vários PDFs: os chips 📚 da conversa (só nome — o conteúdo vem da base).
  const [lote, setLote] = useState<ItemLote[]>([]);
  const loteRef = useRef<ItemLote[]>([]);
  const fixarLote = (l: ItemLote[]) => { loteRef.current = l; setLote(l); };

  // Minha base: a bandeja de envios e uma versão que sobe a cada lote terminado (a lista "Minha base" se recarrega).
  const [envios, setEnvios] = useState<EnvioBase[]>([]);
  const [versaoBase, setVersaoBase] = useState(0);
  const numLoteRef = useRef(0);

  /** Sobe os arquivos pra base pessoal. `silencioso`: só a bandeja (a Aura só fala se falhar). "nao_logado" = sem sessão. */
  const guardarNaBase = useCallback(async (pdfs: File[], silencioso: boolean): Promise<"ok" | "nao_logado"> => {
    const lote = ++numLoteRef.current;
    const chaves = pdfs.map((_, i) => `${lote}-${i}`);
    setEnvios((v) => [...v, ...pdfs.map((f, i) => ({ chave: chaves[i], nome: nomeLimpo(f), estado: "na_fila" as const }))]);
    const rs = await enviarLote(pdfs, {
      aoMudar: (i, estado, r) => setEnvios((v) => v.map((e) => (e.chave === chaves[i] ? { ...e, estado, erro: r?.erro } : e))),
    });
    const sair = () => setEnvios((v) => v.filter((e) => !chaves.includes(e.chave)));
    if (rs === "nao_logado") { sair(); return "nao_logado"; }
    setVersaoBase((n) => n + 1);
    setTimeout(sair, BANDEJA_MS);
    const ruins = rs.filter((r) => r.status === "erro");
    if (!silencioso) oRef.current.aoGuardar?.(resumoDoEnvio(rs));
    else if (ruins.length) oRef.current.aoGuardar?.(`Não guardei **${ruins[0].nomeArquivo.replace(/\.pdf$/i, "")}** na sua base: ${motivoDoErro(ruins[0].erro)}.`);
    return "ok";
  }, []);

  const anexarArquivos = useCallback(async (files: File[]) => {
    const docs = files.filter(ehSuportado);
    if (docs.length) {
      const ids = docs.map((f, i) => {
        // sufixo aleatório: dois lotes no mesmo ms davam o mesmo id (tirar um chip tirava o outro; a biblioteca sobrescrevia)
        const id = `${ehPdf(f) ? "pdf" : "txt"}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${i}`;
        // SÓ PDF vai pra biblioteca: ela é um acervo de PDF (arrastar de lá abre o leitor), e um
        // .txt ali viraria um item que não abre. O texto vive na base, que é onde ele é útil.
        if (ehPdf(f)) void saveFile({ id, title: nomeLimpo(f), source: "upload", savedAt: Date.now() }, f);
        return id;
      });
      // o chip de hoje: a IA lê o PDF inteiro (1 PDF; ou o 1º, quando não dá pra guardar na base)
      const lerPrimeiroPdf = async () => {
        const i = docs.findIndex(ehPdf);
        if (i < 0) return false;   // lote só de texto: não existe caminho de leitura inteira
        const dataUrl = await blobParaDataUrl(docs[i]);
        if (!dataUrl) return false;
        fixar({ id: ids[i], nome: nomeLimpo(docs[i]), dataUrl });
        return true;
      };
      // Texto NUNCA pega o chip de leitura inteira: o `fileData` desliga o harness (ver o cabeçalho),
      // e o Gemini leria um .md cru sem a estrutura que a ingestão preserva.
      if (docs.length === 1 && ehPdf(docs[0]) && !loteRef.current.length) {
        await lerPrimeiroPdf();
        void guardarNaBase(docs, true);
      } else {
        // vários (ou mais um sobre um lote, ou um arquivo de texto): a conversa segue pela base, com um chip por
        // arquivo. O chip de leitura inteira sai (faria o turno ler só ele) e entra no lote.
        const antes = anexoRef.current && !anexoRef.current.id.startsWith("img-") ? [{ id: anexoRef.current.id, nome: anexoRef.current.nome }] : [];
        const novos = docs.map((f, i) => ({ id: ids[i], nome: nomeLimpo(f) }));
        fixar(null);
        fixarLote([...antes, ...loteRef.current, ...novos].filter((a, i, l) => l.findIndex((b) => b.nome === a.nome) === i));
        void guardarNaBase(docs, false).then(async (r) => {
          if (r !== "nao_logado") return;
          // Sem sessão não há base. Com PDF, cai no comportamento antigo (a IA lê o primeiro);
          // só com texto, não há para onde cair — então a Aura DIZ, em vez de engolir o arquivo.
          fixarLote([]);
          if (!(await lerPrimeiroPdf())) oRef.current.aoGuardar?.(`Não guardei seus arquivos: ${motivoDoErro("nao_logado")}.`);
        });
      }
      oRef.current.focar();
      return;
    }
    const img = files.find((f) => f.type.startsWith("image/"));
    if (img) { const dataUrl = await blobParaDataUrl(img); if (dataUrl) { fixar({ id: `img-${Date.now()}`, nome: img.name, dataUrl }); oRef.current.focar(); } }
  }, [saveFile, guardarNaBase]);

  const anexarDaBiblioteca = useCallback(async (id: string) => {
    const f = filesRef.current.find((x) => x.id === id); if (!f) return;
    const dataUrl = await pdfDaBiblioteca(f);
    if (dataUrl) { fixar({ id: f.id, nome: f.title, dataUrl }); oRef.current.focar(); return; }
    // #414: antes não acontecia NADA ("o PDF não aparece quando arrastamos") — agora a Aura diz o que houve e o caminho
    oRef.current.aoGuardar?.(avisoPdfNaoAbriu(f.title, f.pdfUrl));
  }, []);

  useEffect(() => {
    const on = (e: Event) => {
      const d = (e as CustomEvent<AnexoChat & { sala: SalaChat; perguntar?: string }>).detail;
      if (!d?.dataUrl || d.sala !== sala) return;
      fixar({ id: d.id, nome: d.nome, dataUrl: d.dataUrl });
      if (d.perguntar) { const p = d.perguntar; setTimeout(() => oRef.current.perguntar(p), 0); } else oRef.current.focar();
    };
    window.addEventListener(EVT_ANEXAR, on);
    return () => window.removeEventListener(EVT_ANEXAR, on);
  }, [sala]);

  /** soltar arquivo(s) do computador em cima da conversa */
  const soltar = {
    onDragOver: (e: DragEvent) => {
      const t = e.dataTransfer.types;
      if (t.includes("Files") || (o.aceitaBiblioteca && t.includes("text/zaeon-file"))) { e.preventDefault(); e.dataTransfer.dropEffect = "copy"; setArrastando(true); }
    },
    onDragLeave: (e: DragEvent) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setArrastando(false); },
    onDrop: (e: DragEvent) => {
      setArrastando(false);
      const doc = o.aceitaBiblioteca ? e.dataTransfer.getData("text/zaeon-file") : "";
      if (doc) { e.preventDefault(); void anexarDaBiblioteca(doc); return; }
      if (!e.dataTransfer.files?.length) return;
      e.preventDefault();
      // pasta inteira: as entradas têm de ser pegas AGORA (o DataTransfer esvazia depois do primeiro await)
      const entradas = entradasDoDrop(e.dataTransfer);
      const soltos = Array.from(e.dataTransfer.files);
      if (entradas?.some((x) => x.isDirectory)) void arquivosDasEntradas(entradas).then((fs) => anexarArquivos(fs));
      else void anexarArquivos(soltos);
    },
  };

  return {
    anexo, anexoRef, tirar: () => { fixar(null); oRef.current.focar(); }, anexarArquivos, anexarDaBiblioteca, soltar, arrastando, envios, versaoBase,
    lote, loteRef,
    /** tira um arquivo do foco da conversa (segue na base); sem id = limpa o lote (conversa nova) */
    tirarDoLote: (id?: string) => fixarLote(id ? loteRef.current.filter((a) => a.id !== id) : []),
  };
}

/** o chip 📎 acima do texto do composer */
export function ChipAnexo({ anexo, onTirar }: { anexo: AnexoChat; onTirar: () => void }) {
  return (
    <div className="flex items-center gap-2 px-1 pb-2">
      <span className="inline-flex items-center gap-1.5 max-w-full min-h-[32px] pl-3 pr-1 rounded-full text-[12px] font-semibold bg-cyan-500/12 border border-cyan-400/40 text-cyan-800 dark:text-cyan-100" title="A IA está lendo este arquivo">
        <span aria-hidden>📎</span>
        <span className="truncate max-w-[16rem]">{anexo.nome}</span>
        <button type="button" onClick={onTirar} aria-label="Parar de ler este arquivo" className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-cyan-500/20">×</button>
      </span>
    </div>
  );
}

/** os chips 📚 dos vários arquivos da conversa (cada um sai no ×; segue na base) */
export function ChipsLote({ lote, onTirar }: { lote: ItemLote[]; onTirar: (id: string) => void }) {
  if (!lote.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5 px-1 pb-2" aria-label="Arquivos nesta conversa">
      {lote.map((a) => (
        <span key={a.id} className="inline-flex items-center gap-1.5 max-w-full min-h-[32px] pl-3 pr-1 rounded-full text-[12px] font-semibold bg-cyan-500/12 border border-cyan-400/40 text-cyan-800 dark:text-cyan-100" title="Na conversa — a IA responde pelos trechos deste arquivo na sua base">
          <span aria-hidden>📚</span>
          <span className="truncate max-w-[12rem]">{a.nome}</span>
          <button type="button" onClick={() => onTirar(a.id)} aria-label={`Tirar ${a.nome} da conversa`} className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-cyan-500/20">×</button>
        </span>
      ))}
    </div>
  );
}

/** o aviso "solte para a IA ler" por cima da conversa enquanto se arrasta um arquivo */
export function AvisoSoltar() {
  return (
    <div className="absolute inset-0 z-[60] flex items-center justify-center pointer-events-none" style={{ background: "rgba(34,211,238,0.08)", backdropFilter: "blur(2px)" }}>
      <div className="flex items-center gap-2 px-4 py-2 rounded-full" style={{ background: "rgba(8,47,73,0.92)", border: "1px solid rgba(34,211,238,0.7)" }}>
        <span aria-hidden>📎</span>
        <span className="text-[11px] font-black uppercase tracking-wide text-cyan-100">Soltar: a IA lê e guarda na sua base</span>
      </div>
    </div>
  );
}
