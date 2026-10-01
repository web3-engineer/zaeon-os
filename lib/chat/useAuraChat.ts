"use client";
/**
 * Chat da Aura como HOOK — o que o mobile consome (MobileChat). Mesmo núcleo de rede do
 * desktop (pedirAura) e mesmo reengate da Fase 3 (esperarTurno), sem a parte de tela do
 * desktop (datilografia, revista, árvore). Histórico L0 em localStorage por conversa.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import type { StructuredAnswer } from "@/lib/agent/contracts";
import { pedirAura, interpretarFinal, visivel } from "@/lib/chat/auraClient";
import { esperarTurno } from "@/lib/chat/turnoRetomavel";
import { separarProgresso } from "@/lib/agent/progresso";

export type MsgAura = {
  id: string;
  role: "user" | "assistant";
  text: string;
  answer?: StructuredAnswer;
  fase?: string;
  chegando?: boolean;
  turnId?: string;
  pendente?: boolean;
  erro?: boolean;
  at: number;
};

const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
export const chaveL0 = (surface: string, scopeId: string) => `zaeon.m.chat.${surface}.${scopeId}`;
const MAX_L0 = 80;

function carregar(chave: string): MsgAura[] {
  try { const v = JSON.parse(localStorage.getItem(chave) || "[]"); return Array.isArray(v) ? v : []; } catch { return []; }
}

export function useAuraChat(o: {
  scopeId: string;
  surface?: "estudos" | "pesquisa";
  /** Ação do Studio pedida pela Aura (mapa mental, flashcards…): o mobile mostra o cartão de progresso. */
  onAcao?: (a: { kind: string; topic: string; msgId: string }) => void;
}) {
  const surface = o.surface ?? "estudos";
  const chave = chaveL0(surface, o.scopeId);
  // A lista anda JUNTO com a conversa a que pertence. Com uma lista solta, o efeito que
  // persiste rodava no mount ANTES da lista carregada chegar e gravava [] por cima do L0
  // (o reengate lia vazio e o turno pendente se perdia); e, ao trocar de conversa, gravava a
  // conversa antiga na chave nova. Medido no teste de reengate, que falhava por isso.
  const [estado, setEstado] = useState<{ chave: string; msgs: MsgAura[] }>({ chave: "", msgs: [] });
  const mensagens = estado.chave === chave ? estado.msgs : [];
  const setMensagens = useCallback((f: (ms: MsgAura[]) => MsgAura[]) =>
    setEstado((e) => (e.chave === chave ? { chave, msgs: f(e.msgs) } : e)), [chave]);
  const [enviando, setEnviando] = useState(false);
  const msgsRef = useRef<MsgAura[]>([]);
  msgsRef.current = mensagens;
  const onAcaoRef = useRef(o.onAcao);
  onAcaoRef.current = o.onAcao;
  const vivos = useRef<Set<string>>(new Set()); // turnos que ALGUÉM já está acompanhando

  const patch = useCallback((id: string, p: Partial<MsgAura>) =>
    setMensagens((ms) => ms.map((m) => (m.id === id ? { ...m, ...p } : m))), [setMensagens]);

  const finalizar = useCallback((id: string, limpo: string, prompt: string) => {
    const f = interpretarFinal(limpo, prompt);
    if (f.tipo === "estruturada") patch(id, { answer: f.answer, text: f.answer.nucleo, chegando: false, pendente: false, fase: undefined });
    else if (f.tipo === "acao") { patch(id, { text: f.text, chegando: false, pendente: false, fase: undefined }); onAcaoRef.current?.({ kind: f.kind, topic: f.topic, msgId: id }); }
    else patch(id, { text: f.text, chegando: false, pendente: false, fase: undefined });
  }, [patch]);

  // L0: carrega a conversa ao trocar de escopo e, NO MESMO passo, reengata o que ficou
  // pendente no worker quando a pessoa saiu (Fase 3) — a partir da lista que acabou de ler.
  useEffect(() => {
    let vivo = true;
    const lista = carregar(chave);
    setEstado({ chave, msgs: lista });
    lista.forEach((m, i) => {
      if (!m.pendente || !m.turnId || vivos.current.has(m.turnId)) return;
      const turnId = m.turnId;
      vivos.current.add(turnId);
      const prompt = [...lista.slice(0, i)].reverse().find((x) => x.role === "user")?.text ?? "";
      patch(m.id, { chegando: true });
      void esperarTurno(turnId, {
        cancelado: () => !vivo,
        onParcial: (p) => { const ev = separarProgresso(p).eventos; if (ev.length) patch(m.id, { fase: ev[ev.length - 1].rotulo }); },
      }).then((res) => {
        vivos.current.delete(turnId);
        if (res.tipo === "cancelado") return;
        if (res.tipo === "pronto") finalizar(m.id, separarProgresso(res.acumulado).limpo, prompt);
        else patch(m.id, { text: res.tipo === "erro" ? res.mensagem : "Não consegui recuperar esta resposta. Tenta perguntar de novo.", erro: true, chegando: false, pendente: false, fase: undefined });
      });
    });
    return () => { vivo = false; };
  }, [chave, patch, finalizar]);

  // Persiste só a lista que É desta conversa (nunca a vazia de antes do carregamento).
  useEffect(() => {
    if (estado.chave !== chave) return;
    try { localStorage.setItem(chave, JSON.stringify(estado.msgs.slice(-MAX_L0).map(({ chegando, ...m }) => m))); } catch { /* cota cheia: segue sem L0 */ }
  }, [chave, estado]);

  const enviar = useCallback(async (texto: string) => {
    const prompt = texto.trim();
    if (!prompt || enviando) return;
    const history = msgsRef.current
      .filter((m) => m.text && !m.erro)
      .slice(-20)
      .map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.text }] }));
    const asstId = uid();
    setMensagens((ms) => [...ms,
      { id: uid(), role: "user", text: prompt, at: Date.now() },
      { id: asstId, role: "assistant", text: "", chegando: true, at: Date.now() },
    ]);
    setEnviando(true);
    let turnoVivo: string | null = null;
    try {
      const res = await pedirAura({
        prompt, history,
        surface: surface === "pesquisa" ? "pesquisa" : undefined,
        agentContext: { activeTab: surface === "pesquisa" ? "pesquisa" : "sala-de-estudos", cartolinaScopeId: o.scopeId, cartolinaMsgId: asstId },
      }, {
        onTurnId: (t) => { vivos.current.add(t); turnoVivo = t; patch(asstId, { turnId: t, pendente: true }); },
        onFase: (rotulo) => patch(asstId, { fase: rotulo }),
        onLimpo: (l) => patch(asstId, { text: visivel(l) }),
      });
      if (!res.ok) patch(asstId, { text: res.motivo === "rede" ? "Sem conexão com a Aura agora." : "Não consegui responder agora. Tente de novo.", erro: true, chegando: false, fase: undefined });
      else finalizar(asstId, res.limpo, prompt);
    } finally {
      if (turnoVivo) vivos.current.delete(turnoVivo);
      setEnviando(false);
    }
  }, [enviando, surface, o.scopeId, patch, finalizar, setMensagens]);

  const limpar = useCallback(() => { setEstado({ chave, msgs: [] }); try { localStorage.removeItem(chave); } catch { /* ignore */ } }, [chave]);

  return { mensagens, enviar, enviando, limpar };
}
