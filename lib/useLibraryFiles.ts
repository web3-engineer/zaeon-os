"use client";
import { useCallback, useEffect, useState } from "react";
import { useArmazemDaConta } from "@/lib/chat/contaNoNavegador";
import type { Armazem } from "@/lib/chat/threads";
import { dataUrlParaBlob, guardarPdf, idDaUrlIdb, lerPdf, urlIdb } from "./pdfStore";

// Arquivos salvos na biblioteca (aba "pesquisa"). Só arquivos (pdfUrl).
// Espelha o padrão do useSavedCitations: localStorage + evento de sync.
export interface LibraryFile {
  id: string;            // doi or paper id
  title: string;
  pdfUrl: string;        // o arquivo em si (só salvamos quando há pdfUrl)
  source?: string;       // fonte/base (ex.: "arXiv", "OpenAlex")
  venue?: string;
  doi?: string;
  url?: string;
  authors?: string[];
  year?: number;
  savedAt: number;
}

const KEY = "zaeon.libraryFiles";
const EVT = "zaeon:libraryFiles";

// Pure: upsert by id, newest first. Exported for tests.
export function upsertLibraryFile(list: LibraryFile[], f: LibraryFile): LibraryFile[] {
  return [f, ...list.filter((x) => x.id !== f.id)];
}

// Pure: renomeia o título de um arquivo (ignora título vazio). Exported for tests.
export function renameLibraryFile(list: LibraryFile[], id: string, title: string): LibraryFile[] {
  const t = title.trim();
  if (!t) return list;
  return list.map((f) => (f.id === id ? { ...f, title: t } : f));
}

// #666: a lista é da conta logada. Os bytes ficam no IndexedDB, e só se chega neles por ela.
function read(a: Armazem | null): LibraryFile[] {
  if (!a) return [];
  try {
    const list = JSON.parse(a.getItem(KEY) || "[]");
    if (!Array.isArray(list)) return [];
    // blob: URLs morrem ao recarregar a página → descarta entradas mortas de sessões
    // anteriores (senão renderizam e dão "WebKitBlobResource error 1" no console).
    return list.filter((f) => f && typeof f.pdfUrl === "string" && !f.pdfUrl.startsWith("blob:"));
  } catch { return []; }
}
function write(a: Armazem | null, list: LibraryFile[]) {
  if (!a) return;
  a.setItem(KEY, JSON.stringify(list));
  window.dispatchEvent(new CustomEvent(EVT));
}

// ── PDFs enviados pelo aluno: os BYTES moram no IndexedDB (lib/pdfStore), o localStorage guarda
//    `pdfUrl: "idb:<id>"`. Na sessão, cada um vira um blob: URL (o que o leitor/chat usam). ──
const urls = new Map<string, string>();     // id → blob: URL desta sessão
const idPorUrl = new Map<string, string>(); // blob: URL → id (re-salvar da lixeira/renomear não perde o vínculo)
function lembrar(id: string, blob: Blob): string {
  const velho = urls.get(id); if (velho) return velho;
  const u = URL.createObjectURL(blob); urls.set(id, u); idPorUrl.set(u, id); return u;
}
/** a lista como os componentes veem: `idb:` → blob: URL (os ainda não carregados ficam de fora um instante) */
function resolver(list: LibraryFile[]): LibraryFile[] {
  return list.flatMap((f) => { const id = idDaUrlIdb(f.pdfUrl); if (!id) return [f]; const u = urls.get(id); return u ? [{ ...f, pdfUrl: u }] : []; });
}
async function hidratar(list: LibraryFile[]): Promise<boolean> {
  let mudou = false;
  for (const f of list) {
    const id = idDaUrlIdb(f.pdfUrl); if (!id || urls.has(id)) continue;
    const b = await lerPdf(id); if (b) { lembrar(id, b); mudou = true; }
  }
  return mudou;
}
/** os data: URL antigos (que entupiam o localStorage) migram pro IndexedDB — uma vez por carga */
const migradas = new WeakSet<Armazem>();
async function migrar(a: Armazem | null): Promise<void> {
  if (!a || migradas.has(a)) return; migradas.add(a);
  const list = read(a); let mudou = false; const out: LibraryFile[] = [];
  for (const f of list) {
    if (f.pdfUrl.startsWith("data:")) { const b = dataUrlParaBlob(f.pdfUrl); if (b && (await guardarPdf(f.id, b))) { lembrar(f.id, b); out.push({ ...f, pdfUrl: urlIdb(f.id) }); mudou = true; continue; } }
    out.push(f);
  }
  if (mudou) try { write(a, out); } catch { /* ignore */ }
}
/** o registro que vai pro localStorage: PDF local (data:/blob:) → bytes no IndexedDB + `idb:<id>` */
async function paraGuardar(f: LibraryFile): Promise<LibraryFile> {
  const u = f.pdfUrl;
  if (u.startsWith("blob:")) {
    const id = idPorUrl.get(u); if (id) return { ...f, pdfUrl: urlIdb(id) };
    try { const b = await (await fetch(u)).blob(); if (await guardarPdf(f.id, b)) { lembrar(f.id, b); return { ...f, pdfUrl: urlIdb(f.id) }; } } catch { /* blob morto */ }
    return f;
  }
  if (u.startsWith("data:")) { const b = dataUrlParaBlob(u); if (b && (await guardarPdf(f.id, b))) { lembrar(f.id, b); return { ...f, pdfUrl: urlIdb(f.id) }; } }
  return f;
}
/** o registro DURÁVEL de um arquivo da lista (blob: da sessão → `idb:<id>`) — pra guardar em outro lugar (lixeira) */
export function registroDuravel(f: LibraryFile): LibraryFile {
  const id = idPorUrl.get(f.pdfUrl); return id ? { ...f, pdfUrl: urlIdb(id) } : f;
}
/** grava e devolve o arquivo JÁ resolvido (pdfUrl utilizável agora); null = não deu pra guardar */
async function gravar(a: Armazem | null, g: LibraryFile): Promise<LibraryFile | null> {
  try { write(a, upsertLibraryFile(read(a), g)); } catch { return null; }   // cota do localStorage (só metadados: raro)
  const id = idDaUrlIdb(g.pdfUrl); return id ? { ...g, pdfUrl: urls.get(id) ?? g.pdfUrl } : g;
}

export function useLibraryFiles() {
  const a = useArmazemDaConta()?.armazem ?? null;
  const [files, setFiles] = useState<LibraryFile[]>([]);
  useEffect(() => {
    let vivo = true;
    const sync = () => {
      setFiles(resolver(read(a)));
      void hidratar(read(a)).then((m) => { if (m && vivo) setFiles(resolver(read(a))); });
    };
    void migrar(a).then(sync);
    sync();
    window.addEventListener(EVT, sync);
    window.addEventListener("storage", sync);
    return () => { vivo = false; window.removeEventListener(EVT, sync); window.removeEventListener("storage", sync); };
  }, [a]);
  /** salva um registro (PDF local em data:/blob: vai pro IndexedDB) → o arquivo resolvido, ou null */
  const save = useCallback(async (f: LibraryFile) => gravar(a, await paraGuardar(f)), [a]);
  /** salva um ARQUIVO enviado (sem passar por base64) → o arquivo resolvido, ou null se não coube */
  const saveFile = useCallback(async (meta: Omit<LibraryFile, "pdfUrl">, blob: Blob): Promise<LibraryFile | null> => {
    if (await guardarPdf(meta.id, blob)) { lembrar(meta.id, blob); return gravar(a, { ...meta, pdfUrl: urlIdb(meta.id) }); }
    return null;
  }, [a]);
  const rename = useCallback((id: string, title: string) => { write(a, renameLibraryFile(read(a), id, title)); }, [a]);
  const remove = useCallback((id: string) => { write(a, read(a).filter((x) => x.id !== id)); }, [a]);   // os bytes ficam (a lixeira restaura)
  const clear = useCallback(() => { write(a, []); }, [a]);
  return { files, save, saveFile, rename, remove, clear };
}
