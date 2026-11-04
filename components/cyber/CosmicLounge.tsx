"use client";
/**
 * CosmicLounge — o cyberespaço (Lounge Cósmico) como COMPONENTE do app: substitui o iframe do protótipo.
 *  - modo "janela": prévia na landing do logado — começa no menu (opção do monitor ou ESPAÇO = play), sem rede;
 *  - modo "tela": /lounge-cosmico — a sala do CollabDoc (convite por token, presença ao vivo ≤5, chat), uma
 *    base privada por pessoa. Se a sala não abrir (cheia/erro), dá pra entrar sozinho.
 * three.js é client-only e pesado: este módulo é importado com next/dynamic (ssr:false) pelos chamadores.
 */
import type { DueloApi } from "./DueloIngles";
import type { PerguntaPublica, Resultado } from "@/lib/cyber/dueloIngles";
import TelaCarregando from "./TelaCarregando";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { LIMITE_SALA, corDoUsuario } from "@/lib/lounge3d/tipos";
import { basesDosMembros, poseNoAssento } from "@/lib/cyber/bases";
import { temWebGL } from "@/lib/ui/globo";
import { LAB_ENTRADA, MSG_FECHAR_TABLET } from "@/lib/ui/loungeHub";
import { avisoRealtime } from "@/lib/lounge3d/realtimeEstado";
import { useResolverSala } from "@/components/lounge/useResolverSala";
import { useSala3D } from "@/components/lounge/useSala3D";
import type { PedidoZaeon, TurnoZaeon } from "@/lib/cyber/conversaZaeon";
import CenaCyber from "./CenaCyber";
import type { PessoaCyber } from "./engine";

export default function CosmicLounge({ modo, onSessaoIniciada }: { modo: "janela" | "tela"; onSessaoIniciada?: () => void }) {
  // DENTRO do TABLET (o laboratório num iframe por cima do cyberespaço) o cyberespaço NUNCA sobe de novo: era a tela de
  // loading recarregando o mapa quando se saía do tablet por um link do laboratório. Ele só pede pra guardar o tablet.
  const [noIframe] = useState(() => typeof window !== "undefined" && window.self !== window.top);
  useEffect(() => { if (noIframe) { try { window.parent.postMessage({ type: MSG_FECHAR_TABLET }, window.location.origin); } catch { /* outra origem */ } } }, [noIframe]);
  const webgl = useMemo(() => (typeof window === "undefined" ? true : temWebGL()), []);
  if (noIframe) return <div className="h-full w-full bg-transparent" />;
  if (!webgl) return <SemWebGL />;
  return modo === "janela" ? <Janela onSessaoIniciada={onSessaoIniciada} /> : <Tela />;
}

function SemWebGL() {
  const router = useRouter();
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-[#03030a] px-6 text-center text-sm text-white/70">
      Este aparelho não suporta o cyberespaço 3D.
      <button type="button" onClick={() => router.push(LAB_ENTRADA)} className="min-h-[44px] rounded-full bg-cyan-400 px-5 font-semibold text-slate-950">Ir para a Sala de Estudos</button>
    </div>
  );
}

const Carregando = ({ children }: { children?: React.ReactNode }) => <div className="flex h-full w-full items-center justify-center bg-[#03030a] px-6 text-center text-sm text-sky-100/80">{children ?? "conectando ao cyberespaço…"}</div>;

function Janela({ onSessaoIniciada }: { onSessaoIniciada?: () => void }) {
  const { data } = useSession();
  const eu = useMemo<PessoaCyber>(() => { const id = (data?.user as { id?: string } | undefined)?.id ?? "local"; return { id, name: data?.user?.name ?? "Visitante", color: "#45d6ff" }; }, [data]);
  const membros = useMemo(() => [eu], [eu]);
  return <CenaCyber modo="janela" eu={eu} membros={membros} onSessaoIniciada={onSessaoIniciada} />;
}

function Tela() {
  const { data } = useSession();
  const { salaId, erro, tentarDeNovo } = useResolverSala(true, "Minha sala de estudos", true);   // o MUNDO: todos no mesmo servidor
  const [solo, setSolo] = useState(false);
  // ordem canônica dos membros (define a base de cada um) — ref, pq o hook a consulta dentro dos eventos do Pusher
  const ordemRef = useRef<string[]>([]);
  const poseInicial = useCallback((id: string) => {
    const lay = basesDosMembros(ordemRef.current).get(id);
    return lay ? { ...poseNoAssento(lay), sit: true } : null;   // quem ainda não mandou posição aparece sentado na própria base
  }, []);
  const sala = useSala3D(salaId, { poseInicial });
  ordemRef.current = sala.sala?.members ?? [];

  const euSolo = useMemo<PessoaCyber>(() => { const id = (data?.user as { id?: string } | undefined)?.id ?? "local"; return { id, name: data?.user?.name ?? "Visitante", color: id === "local" ? "#45d6ff" : corDoUsuario(id) }; }, [data]);
  // a ORDEM de `sala.members[]` (só cresce) define a base de cada pessoa — igual pra todo mundo
  const membros = useMemo<PessoaCyber[]>(() => {
    const porId = new Map(sala.membros.map((m) => [m.id, m] as const));
    return (sala.sala?.members ?? []).flatMap((id) => { const m = porId.get(id); return m ? [{ id: m.id, name: m.name, color: m.color, fundador: m.fundador === true, corpo: m.corpo, nave: m.nave === true, personagem: m.personagem ?? null }] : []; });
  }, [sala.membros, sala.sala?.members]);
  // alguém que entrou depois de eu carregar: rebusca a sala (ordem canônica + nome)
  const { online, recarregar } = sala;
  const pedidos = useRef(new Set<string>());
  useEffect(() => {
    const faltam = online.filter((o) => !membros.some((m) => m.id === o.id) && !pedidos.current.has(o.id));
    if (!faltam.length) return;
    faltam.forEach((o) => pedidos.current.add(o.id));   // 1 refetch por pessoa nova (sem loop se o servidor não a listar)
    void recarregar();
  }, [online, membros, recarregar]);
  const euSala = useMemo<PessoaCyber | null>(() => (sala.eu ? { id: sala.eu.id, name: sala.eu.name, color: sala.eu.color, fundador: sala.eu.fundador === true, corpo: sala.eu.corpo, nave: sala.eu.nave === true, personagem: sala.eu.personagem ?? null } : null), [sala.eu]);
  // quem está online (pra voz abrir/fechar as conexões) — antes de qualquer return condicional (ordem dos hooks). O novato
  // no tutorial (a Zaeon só dele, ainda sem a 1ª pose) fica FORA da voz até cruzar o 1º portal
  const onlineIds = useMemo(() => sala.online.filter((m) => m.pronto !== false).map((m) => m.id), [sala.online]);
  // ações privilegiadas do dono (topo, nave): quem decide é o servidor (sessão → fundador). A Zaeon é aberta a todos.
  const pedirAcesso = useCallback(async (alvo: "topo" | "ceu" | "nave" | "dj" | "ritual") => {
    if (!salaId) return { ok: false, erro: "Sem sala." };
    const r = await fetch(`/api/lounge3d/${salaId}/acesso`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ alvo }) });
    const d = await r.json().catch(() => ({}));
    return r.ok ? { ok: true } : { ok: false, erro: (d as { error?: string })?.error ?? "Não autorizado." };
  }, [salaId]);

  // o DUELO de linguagem da Examiner (o Templo Cósmico): as perguntas e a correção são do servidor
  const dueloIngles = useMemo<DueloApi | undefined>(() => !salaId ? undefined : {
    iniciar: async () => {
      const r = await fetch(`/api/lounge3d/${salaId}/duelo`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ acao: "iniciar" }) });
      const d = (await r.json().catch(() => ({}))) as { perguntas?: PerguntaPublica[]; passou?: boolean; error?: string; faltaS?: number };
      if (r.status === 429) return { erro: `Ela ainda não quer duelar de novo. Volte em ${Math.max(1, Math.ceil((d.faltaS ?? 60) / 60))} min.` };
      return r.ok ? d : { erro: d.error ?? "A Examiner não respondeu." };
    },
    responder: async (respostas) => {
      const r = await fetch(`/api/lounge3d/${salaId}/duelo`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ acao: "responder", respostas }) });
      const d = (await r.json().catch(() => ({}))) as Resultado & { error?: string };
      return r.ok ? d : { erro: d.error ?? "A Examiner não respondeu." };
    },
  }, [salaId]);

  // a 1ª entrada no cyberespaço (nasceu no tubo de ensaio): o servidor marca — da próxima vez nasce na base
  const marcarNascimento = useCallback(() => { if (salaId) void fetch(`/api/lounge3d/${salaId}/nasceu`, { method: "POST" }).catch(() => {}); }, [salaId]);
  // um turno GERATIVO da conversa com a Zaeon (o harness do laboratório, no servidor); erro → o engine usa o roteiro local
  const conversarZaeon = useCallback(async (pedido: PedidoZaeon): Promise<TurnoZaeon> => {
    if (!salaId) throw new Error("sem sala");
    const r = await fetch(`/api/lounge3d/${salaId}/zaeon`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(pedido) });
    if (!r.ok) throw new Error(`zaeon ${r.status}`);
    return (await r.json()) as TurnoZaeon;
  }, [salaId]);
  // a VOZ da Zaeon no holograma (Leda — a do laboratório, pelo caminho do cyberespaço); erro → ela fala só no balão
  const vozZaeon = useCallback(async (texto: string): Promise<string | null> => {
    if (!salaId) return null;
    const r = await fetch(`/api/lounge3d/${salaId}/zaeon/voz`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ texto }) });
    if (!r.ok) return null;
    const d = (await r.json().catch(() => null)) as { audio_base64?: string } | null;
    return d?.audio_base64 || null;
  }, [salaId]);
  // o que a pessoa contou pra Zaeon na capela: o servidor guarda (User.cyberPerfil)
  const salvarPerfil = useCallback((perfil: Record<string, string>) => { if (salaId) void fetch(`/api/lounge3d/${salaId}/perfil`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ perfil }) }).catch(() => {}); }, [salaId]);

  if (solo) return <CenaCyber modo="tela" eu={euSolo} membros={[euSolo]} aviso="Modo solo — você não aparece para os outros." />;
  if (erro === "login") return <Carregando>Entre na sua conta para jogar.</Carregando>;
  if (erro || sala.estado === "erro" || sala.estado === "off") {
    return <Carregando><span>Não deu para abrir a sala.{" "}<button type="button" onClick={tentarDeNovo} className="underline">Tentar de novo</button>{" · "}<button type="button" onClick={() => setSolo(true)} className="underline">Entrar sozinho</button></span></Carregando>;
  }
  if (sala.estado === "cheia") {
    return <Carregando><span>Cyberespaço cheio (máximo {LIMITE_SALA}).{" "}<button type="button" onClick={() => setSolo(true)} className="underline">Entrar sozinho</button></span></Carregando>;
  }
  if (!salaId || !euSala || sala.estado === "carregando") return <div className="relative h-full w-full"><TelaCarregando carga={{ etapa: "corpo", rotulo: "Conectando à sala do cyberespaço", progresso: 0.01 }} /></div>;
  const aviso = avisoRealtime(sala.realtime, sala.motivoRealtime);
  return (
    <CenaCyber
      modo="tela" eu={euSala} membros={membros.length ? membros : [euSala]}
      remotos={sala.remotos} enviarPos={sala.enviarPos} chat={sala.chat} enviarChat={sala.enviarChat}
      tokenConvite={sala.sala?.token ?? null} online={sala.online.length || 1} aviso={aviso}
      souFundador={euSala.fundador === true} pilotoDaNave={euSala.nave === true} pedirAcesso={pedirAcesso}
      novoNoCyber={sala.eu?.novo === true} regiao={sala.eu?.regiao ?? null} motosLiberadas={sala.eu?.motos === true} examinerLiberado={sala.eu?.examiner === true} dueloIngles={dueloIngles} marcarNascimento={marcarNascimento} salvarPerfil={salvarPerfil} conversarZaeon={conversarZaeon} vozZaeon={vozZaeon}
      recadoQG={sala.recadoQG} enviarRecado={sala.enviarRecado}
      somLounge={sala.somLounge} offsetMusica={sala.offsetMusica} musica={sala.musica}
      somNave={sala.somNave} musicaNave={sala.musicaNave} ritual={sala.ritual} definirRitual={sala.definirRitual}
      naveQG={sala.naveQG} salvarNave={sala.salvarNave}
      salaId={salaId} eventoRelicario={sala.eventoRelicario}
      canalVoz={sala.canalVoz} onlineIds={onlineIds}
    />
  );
}
