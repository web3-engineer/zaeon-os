"use client";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import type { MensagemChat, Presenca, RecadoQG } from "@/lib/lounge3d/tipos";
import { adicionarFaixa, controlar, removerFaixa, somVazio, type SomLounge } from "@/lib/lounge3d/musica";
import { RITUAL_OFF, ritualDesligado, type Ritual } from "@/lib/cyber/ritual";
import { corrigir, publica, sortearDoBanco, type Pergunta } from "@/lib/cyber/dueloIngles";
let dueloLocal: Pergunta[] = [];
const dueloFake = { iniciar: async () => { dueloLocal = sortearDoBanco(Date.now()); return { perguntas: dueloLocal.map(publica) }; }, responder: async (r: (number | null)[]) => corrigir(dueloLocal, r) };
if (typeof window !== "undefined") (window as unknown as { __duelo: unknown }).__duelo = { gabarito: () => dueloLocal.map((p) => p.certa) };
const CenaCyber = dynamic(() => import("@/components/cyber/CenaCyber"), { ssr: false });
const EU = "a".repeat(24), MARINA = "b".repeat(24), TEO = "c".repeat(24);
export default function Tela() {
  const giu = typeof window !== "undefined" && location.search.includes("giulia=1");
  // ?usuario=1 — a ÓTICA DE UM USUÁRIO COMUM (sem admin, sem login, já passou do tutorial): nasce na SUA nave; a Cidade Zaeon fechada
  const usuario = typeof window !== "undefined" && location.search.includes("usuario=1");
  const eu = useMemo(() => (usuario ? { id: EU, name: "Você", color: "#45f0ff", fundador: false } : giu ? { id: EU, name: "Você", color: "#d2508a", fundador: false, corpo: "giulia", personagem: { genero: "f" as const, cor: "#d2508a" } } : { id: EU, name: "Você", color: "#2f7bff", fundador: true }), [giu, usuario]);   // prévia: você como dono da Zaeon
  const membros = useMemo(() => [eu, { id: MARINA, name: "Marina", color: "#c69bff", ...(giu ? { corpo: "giulia" } : {}) }, { id: TEO, name: "Téo", color: "#ffd36b" }, { id: "d".repeat(24), name: "Andrei Bacelar", color: "#7fe0ff" }], [eu]);
  const remotos = useRef(new Map<string, Presenca>());
  const [chat, setChat] = useState<MensagemChat[]>([]);
  useEffect(() => {
    const t0 = performance.now();
    const id = setInterval(() => {
      const t = (performance.now() - t0) / 1000, x = Math.cos(t * 0.4) * 3, z = 1.5 + Math.sin(t * 0.4) * 2.2;
      const ov = (window as unknown as { __marina?: Partial<Presenca> }).__marina;   // (teste local: a Marina controlada pelo console)
      remotos.current.set(MARINA, { userId: MARINA, name: "Marina", color: "#c69bff", x, z, facing: Math.atan2(-Math.sin(t * 0.4), Math.cos(t * 0.4)), moving: true, ...(ov ?? {}) });
      remotos.current.set(TEO, { userId: TEO, name: "Téo", color: "#ffd36b", x: -2.5, z: 3.2, facing: 2.5, moving: false });
    }, 110);
    const fala = setTimeout(() => setChat([{ id: "1", userId: MARINA, name: "Marina", color: "#c69bff", texto: "oi! bora estudar? ✦", ts: Date.now() }]), 5000);
    return () => { clearInterval(id); clearTimeout(fala); };
  }, []);
  const [recado, setRecado] = useState<RecadoQG | null>(null);
  const enviarRecado = async (texto: string | null) => { setRecado(texto === null ? null : { id: String(Date.now()), texto, deId: EU, deNome: "Don Martinez", deCor: "#2f7bff", ts: Date.now() }); return { ok: true }; };
  // PRÉVIA do toca-discos: a playlist fica na memória; o arquivo enviado vira um blob: local
  const [som, setSom] = useState<SomLounge | null>(null), urls = useRef(new Map<string, string>());
  const musica = useMemo(() => ({
    async subir(file: File, dur: number, nome: string) { const hex = Array.from({ length: 20 }, () => "0123456789abcdef"[Math.floor(Math.random() * 16)]).join(""), arq = `lm_${hex}.ogg`; urls.current.set(arq, URL.createObjectURL(file)); setSom((s) => adicionarFaixa(s ?? somVazio(), { id: hex.slice(0, 16), nome, arq, dur, deId: EU }, Date.now())); return { ok: true }; },
    async controlar(acao: "tocar" | "pausar" | "parar" | "proxima" | "anterior" | "ir", i?: number) { setSom((s) => (s ? controlar(s, acao, Date.now(), i) : s)); return { ok: true }; },
    async remover(id: string) { setSom((s) => (s ? removerFaixa(s, id, Date.now()) : s)); return { ok: true }; },
    urlDe: (arq: string) => urls.current.get(arq) ?? "/assets/sounds/cyber/space-bed.ogg",
  }), []);
  // PRÉVIA do som da nave (o 2º canal) e do RITUAL (lib/cyber/ritual): tudo na memória
  const [somNave, setSomNave] = useState<SomLounge | null>(null);
  const musicaNave = useMemo(() => ({
    async subir(file: File, dur: number, nome: string) { const hex = Array.from({ length: 20 }, () => "0123456789abcdef"[Math.floor(Math.random() * 16)]).join(""), arq = `lm_${hex}.ogg`; urls.current.set(arq, URL.createObjectURL(file)); setSomNave((s) => adicionarFaixa(s ?? somVazio(), { id: hex.slice(0, 16), nome, arq, dur, deId: EU }, Date.now())); return { ok: true }; },
    async controlar(acao: "tocar" | "pausar" | "parar" | "proxima" | "anterior" | "ir", i?: number) { setSomNave((s) => (s ? controlar(s, acao, Date.now(), i) : s)); return { ok: true }; },
    async remover(id: string) { setSomNave((s) => (s ? removerFaixa(s, id, Date.now()) : s)); return { ok: true }; },
    urlDe: (arq: string) => urls.current.get(arq) ?? "/assets/sounds/cyber/space-bed.ogg",
  }), []);
  const [ritual, setRitual] = useState<Ritual | null>(null);
  const definirRitual = async (m: { tempestade?: boolean; droids?: boolean; veu?: boolean; nave?: boolean }) => { setRitual((r) => { const a = r ?? RITUAL_OFF, n = { tempestade: typeof m.tempestade === "boolean" ? (m.tempestade ? (a.tempestade || Date.now()) : 0) : a.tempestade, droids: typeof m.droids === "boolean" ? m.droids : a.droids, veu: typeof m.veu === "boolean" ? (m.veu ? (a.veu || Date.now()) : 0) : a.veu, nave: typeof m.nave === "boolean" ? m.nave : a.nave }; if (n.tempestade <= 0) n.veu = 0; return ritualDesligado(n) ? null : n; }); return { ok: true }; };
  (globalThis as { __som?: unknown }).__som = { setSom, setSomNave, setRitual };
  const enviarChat = async (texto: string) => { setChat((c) => [...c, { id: String(Date.now()), userId: EU, name: "Você", color: "#2f7bff", texto, ts: Date.now() }]); };
  return <div style={{ position: "fixed", inset: 0, zIndex: 300 }}><CenaCyber modo={typeof window !== "undefined" && location.search.includes("janela") ? "janela" : "tela"} eu={eu} membros={membros} remotos={remotos} chat={chat} enviarChat={enviarChat} tokenConvite="PREVIA" online={3} enviarPos={() => {}} souFundador={!usuario} {...(usuario ? { novoNoCyber: false } : {})} pedirAcesso={async () => ({ ok: true })} recadoQG={recado} enviarRecado={enviarRecado} somLounge={som} offsetMusica={0} musica={musica} somNave={somNave} musicaNave={musicaNave} ritual={ritual} definirRitual={definirRitual} dueloIngles={dueloFake} /></div>;
}
