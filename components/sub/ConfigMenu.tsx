"use client";

/**
 * ConfigMenu — a engrenagem da navbar (ao lado do tema): as mesmas opções do "Opções" do menu
 * principal, de qualquer página, em GAVETAS (fechadas por padrão, uma aberta por vez) pra não poluir:
 *   Geral (idioma) · Cyberespaço (modo tutorial, gráficos, nitidez, FPS) · Conta (convite, MODO CEO — o admin
 *   escondido: só founder/super-admin vê —, sair, deletar conta).
 * O seletor de VOZ saiu daqui a pedido do dono: a fala segue na voz padrão do engine (lib/voice/ttsController).
 * Deslogado: Geral e Cyberespaço (sem modo tutorial).
 */
import { avisar, confirmar, tr } from "@/lib/ui/avisos";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { limparCopiaDasConversas } from "@/lib/chat/conversasServidor";
import { useTranslation } from "react-i18next";
import { Cog6ToothIcon, ChevronDownIcon, ChevronRightIcon, ArrowRightStartOnRectangleIcon } from "@heroicons/react/24/outline";
import { Activity, Gauge, Crown, Trash2, Loader2, Ticket, GraduationCap, Globe, Monitor, UserRound, Palette } from "lucide-react";
import LanguageFlagToggle from "@/components/ui/LanguageFlagToggle";
import { isSuperAdmin } from "@/lib/auth/roles";
import { CHAVE_PROGRESSO, PREF_TUTORIAL, tutorialLigado } from "@/lib/cyber/onboarding";
import { reverToursDoLab } from "@/lib/onboarding/reverTours";
import { SKINS, SKINS_ID, SKIN_PADRAO, type SkinId } from "@/lib/skins/paletas";
import { CHAVE_SKIN, EVT_SKIN, escolherSkin, lerSkinLocal } from "@/lib/skins/preferencia";
import { temaOuLounge } from "@/lib/rooms/temas";
import { EVENTO_GRAFICOS, PREF_GRAFICOS, PREF_MOSTRAR_FPS, PREF_NITIDEZ, PREF_SUAVIZAR, lerNitidez, lerPreferencia, lerSuavizar, type PreferenciaGraficos, type PreferenciaNitidez, type PreferenciaSuavizar } from "@/lib/cyber/dispositivo";

const item = "group relative flex items-center gap-3 w-full min-h-[48px] px-3 rounded-2xl text-left text-sm font-medium text-slate-800 dark:text-white border border-slate-200/80 dark:border-white/[0.06] bg-white/50 dark:bg-white/[0.03] hover:bg-white/80 dark:hover:bg-white/[0.08] hover:border-cyan-400/50 dark:hover:border-cyan-400/30 transition-colors";
const rotulo = "text-[9px] uppercase font-bold tracking-tighter text-slate-500 dark:text-white/50";

type NomeGaveta = "geral" | "cyber" | "conta";

/** Gaveta: cabeçalho que abre/fecha (aria-expanded + aria-controls) e o conteúdo logo abaixo. */
function Gaveta({ id, titulo, icone, aberta, alternar, children }: { id: NomeGaveta; titulo: string; icone: ReactNode; aberta: boolean; alternar: (g: NomeGaveta) => void; children: ReactNode }) {
  const painel = `config-gaveta-${id}`;
  return (
    <div className="rounded-2xl border border-slate-200/80 dark:border-white/[0.06] bg-white/50 dark:bg-white/[0.03] overflow-hidden">
      <button type="button" onClick={() => alternar(id)} aria-expanded={aberta} aria-controls={painel}
        className="w-full flex items-center gap-3 px-3 min-h-[48px] text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cyan-400/60 rounded-2xl">
        {icone}
        <span className="text-sm font-semibold text-slate-800 dark:text-white flex-1">{titulo}</span>
        <ChevronDownIcon className={`h-4 w-4 opacity-40 transition-transform ${aberta ? "rotate-180" : ""}`} />
      </button>
      {aberta && <div id={painel} role="region" aria-label={titulo} className="px-2 pb-2 flex flex-col gap-2 [&>*]:shrink-0">{children}</div>}
    </div>
  );
}

export default function ConfigMenu() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { data: session, status } = useSession();
  const [aberto, setAberto] = useState(false);
  const [gaveta, setGaveta] = useState<NomeGaveta | null>(null);
  const [apagando, setApagando] = useState(false);
  const [convite, setConvite] = useState(false);
  const [tutorial, setTutorial] = useState(false);
  const [graficos, setGraficos] = useState<PreferenciaGraficos>("auto");
  const [nitidez, setNitidez] = useState<PreferenciaNitidez>("auto"); const [suavizar, setSuavizar] = useState<PreferenciaSuavizar>("auto");
  const [mostrarFps, setMostrarFps] = useState(false);
  const [skin, setSkin] = useState<SkinId>(SKIN_PADRAO);
  const raiz = useRef<HTMLDivElement>(null);
  const botao = useRef<HTMLButtonElement>(null);

  const logado = status === "authenticated";
  const ceo = isSuperAdmin({ email: session?.user?.email, role: (session?.user as { role?: string } | undefined)?.role });

  useEffect(() => {
    if (!aberto) return;
    try { setConvite(localStorage.getItem("zaeon.inviteAccessed") === "1"); } catch { /* sem storage */ }
    setTutorial(tutorialLigado((k) => localStorage.getItem(k)));
    setSkin(lerSkinLocal());
    try { setGraficos(lerPreferencia(localStorage.getItem(PREF_GRAFICOS))); setMostrarFps(localStorage.getItem(PREF_MOSTRAR_FPS) === "1"); setNitidez(lerNitidez(localStorage.getItem(PREF_NITIDEZ))); setSuavizar(lerSuavizar(localStorage.getItem(PREF_SUAVIZAR))); } catch { /* sem storage */ }
    const fora = (e: PointerEvent) => { if (!raiz.current?.contains(e.target as Node)) setAberto(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") { setAberto(false); botao.current?.focus(); } };
    // a skin pode mudar com o menu aberto (a conta respondeu, ou outra aba trocou): o rádio acompanha
    const aoMudarSkin = () => setSkin(lerSkinLocal());
    const aoGuardarSkin = (e: StorageEvent) => { if (e.key === CHAVE_SKIN || e.key === null) setSkin(lerSkinLocal()); };
    window.addEventListener(EVT_SKIN, aoMudarSkin);
    window.addEventListener("storage", aoGuardarSkin);
    document.addEventListener("pointerdown", fora);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("pointerdown", fora); document.removeEventListener("keydown", esc); window.removeEventListener(EVT_SKIN, aoMudarSkin); window.removeEventListener("storage", aoGuardarSkin); };
  }, [aberto]);

  const ir = (href: string) => { setAberto(false); router.push(href); };
  // SKIN do laboratório (lib/skins): só as cores; vale na hora se o laboratório estiver aberto, e fica na conta
  const mudarSkin = (id: SkinId) => setSkin(escolherSkin(id));
  // a sala da pessoa: a do curso dela, ou o Lounge (quem não cai em nenhuma área); deslogado não tem sala
  const minhaSala = logado ? temaOuLounge((session?.user as { course?: string } | undefined)?.course) : null;
  // uma gaveta aberta por vez: abrir uma fecha a outra; clicar na aberta fecha
  const alternarGaveta = (g: NomeGaveta) => setGaveta((atual) => (atual === g ? null : g));
  // MODO TUTORIAL: ligar ou desligar sempre APAGA o progresso salvo (lib/cyber/onboarding) — desligar e ligar de novo
  // = recomeçar do tubo (pedido do dono)
  const mudarTutorial = () => {
    const novo = !tutorial; setTutorial(novo);
    try { if (novo) localStorage.setItem(PREF_TUTORIAL, "1"); else localStorage.removeItem(PREF_TUTORIAL); } catch { /* sem storage */ }
    try { localStorage.removeItem(CHAVE_PROGRESSO); } catch { /* sem storage */ }
  };

  // GRÁFICOS do cyberespaço (vale ao abrir o cyberespaço de novo): automático = pela placa de vídeo
  const mudarGraficos = (g: PreferenciaGraficos) => { setGraficos(g); try { if (g === "auto") localStorage.removeItem(PREF_GRAFICOS); else localStorage.setItem(PREF_GRAFICOS, g); } catch { /* sem storage */ } };
  // a CALIBRAGEM do serrilhado: a NITIDEZ vale na hora (o cyberespaço ouve o evento); suavizar bordas, ao abrir de novo
  const mudarNitidez = (n: PreferenciaNitidez) => { setNitidez(n); try { if (n === "auto") localStorage.removeItem(PREF_NITIDEZ); else localStorage.setItem(PREF_NITIDEZ, n); } catch { /* sem storage */ } window.dispatchEvent(new Event(EVENTO_GRAFICOS)); };
  const mudarSuavizar = (v: PreferenciaSuavizar) => { setSuavizar(v); try { if (v === "auto") localStorage.removeItem(PREF_SUAVIZAR); else localStorage.setItem(PREF_SUAVIZAR, v); } catch { /* sem storage */ } };
  const mudarFps = () => { const novo = !mostrarFps; setMostrarFps(novo); try { if (novo) localStorage.setItem(PREF_MOSTRAR_FPS, "1"); else localStorage.removeItem(PREF_MOSTRAR_FPS); } catch { /* sem storage */ } };

  const apagarConta = async () => {
    if (apagando) return;
    if (!(await confirmar({ titulo: tr("avisos.apagarConta", "Apagar sua conta?"), texto: t("configMenu.deleteConfirm"), botao: tr("avisos.apagar", "Apagar"), perigo: true }))) return;
    setApagando(true);
    try {
      const r = await fetch("/api/account", { method: "DELETE" });
      if (!r.ok) { setApagando(false); avisar(t("configMenu.deleteFailed"), { tipo: "erro" }); return; }
      limparCopiaDasConversas(session?.user?.email, true);
      await signOut({ callbackUrl: "/" });
    } catch { setApagando(false); avisar(t("configMenu.connectionError"), { tipo: "erro" }); }
  };

  return (
    <div ref={raiz} className="relative">
      <button
        ref={botao}
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-haspopup="dialog"
        aria-expanded={aberto}
        aria-label={t("siteNav.settings")}
        title={t("siteNav.settings")}
        className="relative p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60"
      >
        <Cog6ToothIcon className={`w-6 h-6 text-slate-700 dark:text-slate-200 transition-transform duration-500 ${aberto ? "rotate-90" : ""}`} />
      </button>

      {aberto && (
        <div
          role="dialog"
          aria-label={t("siteNav.settings")}
          // `[&>*]:shrink-0`: numa tela BAIXA (Windows a 100% de zoom) as linhas, em coluna flex com altura
          // máxima, encolhiam até o `min-h` e o conteúdo (o seletor Automático/Leve/Completo) vazava por cima
          // da linha de baixo, que ficava com o clique. Sem encolher, o painel ROLA (overflow-y-auto).
          className="absolute right-0 top-full mt-2 w-[min(92vw,330px)] max-h-[min(78vh,620px)] overflow-y-auto custom-scrollbar p-3 flex flex-col gap-2 rounded-[24px] [&>*]:shrink-0
            backdrop-blur-2xl backdrop-saturate-[1.6] border border-white/60 dark:border-white/[0.12]
            bg-white/90 dark:bg-skpopover/95 shadow-[0_18px_50px_-20px_rgba(37,99,235,0.45)] dark:shadow-[0_18px_50px_-20px_rgba(0,0,0,0.8)]"
        >
          <p className="px-2 pt-1 pb-0.5 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500 dark:text-white/45">{t("siteNav.settings")}</p>

          {/* GERAL: idioma */}
          <Gaveta id="geral" titulo={t("siteNav.general")} icone={<Globe size={16} className="text-cyan-600 dark:text-cyan-300 shrink-0" />} aberta={gaveta === "geral"} alternar={alternarGaveta}>
            <div className={`${item} cursor-default`}>
              <span className="flex flex-col flex-1">
                <span className={rotulo}>{t("configMenu.language")}</span>
                <span>{(i18n.language || "pt").toUpperCase()}</span>
              </span>
              <LanguageFlagToggle size={30} />
            </div>
            {/* #613: REVER os tutoriais do laboratório (Sala de Estudos e Escritório) — antes só pelo console */}
            {logado && (
              <button type="button" onClick={() => { reverToursDoLab(); setAberto(false); }} className={item}>
                <GraduationCap size={16} className="text-cyan-600 dark:text-cyan-300 shrink-0" />
                <span className="flex flex-col flex-1 min-w-0">
                  <span className={rotulo}>{t("siteNav.lab")}</span>
                  <span>{t("configMenu.rewatchTutorial")}</span>
                  <span className="text-[11px] font-normal text-slate-500 dark:text-white/45 leading-snug">{t("configMenu.rewatchTutorialHint")}</span>
                </span>
              </button>
            )}
            {/* SKIN do laboratório: o visual original é o padrão; as outras seis são as cores de cada sala (lib/skins) */}
            <div className={`${item} flex-col !items-stretch gap-2 py-2.5`}>
              <span className="flex items-center gap-3 min-w-0">
                <Palette size={16} className="text-cyan-600 dark:text-cyan-300 shrink-0" />
                <span className="flex flex-col flex-1 min-w-0">
                  <span className={rotulo}>{t("siteNav.lab")}</span>
                  <span>{t("configMenu.labSkin")}</span>
                  <span className="text-[11px] font-normal text-slate-500 dark:text-white/45 leading-snug">{t("configMenu.labSkinHint")}</span>
                </span>
              </span>
              <span role="radiogroup" aria-label={t("configMenu.labSkin")} className="grid grid-cols-2 gap-1 rounded-xl bg-slate-200/60 p-1 dark:bg-white/[0.06]">
                {SKINS_ID.map((id) => (
                  <button key={id} type="button" role="radio" aria-checked={skin === id} onClick={() => mudarSkin(id)}
                    className={`min-h-[34px] px-2 rounded-lg text-xs font-semibold text-left flex items-center gap-1.5 transition-colors ${skin === id ? "bg-white text-slate-900 shadow dark:bg-white/15 dark:text-white" : "text-slate-600 hover:text-slate-900 dark:text-white/60 dark:hover:text-white"}`}>
                    {/* a cor da bolinha é FIXA (hex), não uma classe: senão ela mudaria junto com a skin escolhida */}
                    <span aria-hidden className="h-3 w-3 shrink-0 rounded-full ring-1 ring-black/10 dark:ring-white/20" style={{ background: SKINS[id].amostra }} />
                    <span className="truncate">{id === SKIN_PADRAO ? t("configMenu.labSkinOriginal") : SKINS[id].nome}</span>
                    {id === minhaSala && <span className="ml-auto shrink-0 text-[9px] font-bold uppercase tracking-tight text-slate-500 dark:text-white/50">{t("configMenu.labSkinYours")}</span>}
                  </button>
                ))}
              </span>
            </div>
          </Gaveta>

          {/* CYBERESPAÇO: modo tutorial, gráficos, nitidez, FPS */}
          <Gaveta id="cyber" titulo={t("configMenu.cyberspace")} icone={<Monitor size={16} className="text-cyan-600 dark:text-cyan-300 shrink-0" />} aberta={gaveta === "cyber"} alternar={alternarGaveta}>

            {/* MODO TUTORIAL do cyberespaço: ligado, toda entrada começa pelo tutorial (vale na próxima entrada) */}
            {logado && (
              <button type="button" role="switch" aria-checked={tutorial} onClick={mudarTutorial} className={item}>
                <GraduationCap size={16} className="text-cyan-600 dark:text-cyan-300 shrink-0" />
                <span className="flex flex-col flex-1 min-w-0">
                  <span className={rotulo}>{t("configMenu.cyberspace")}</span>
                  <span>{t("configMenu.tutorialMode")}</span>
                  <span className="text-[11px] font-normal text-slate-500 dark:text-white/45 leading-snug">{t(tutorial ? "configMenu.tutorialOn" : "configMenu.tutorialOff")}</span>
                </span>
                <span aria-hidden className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors ${tutorial ? "bg-cyan-500" : "bg-slate-300 dark:bg-white/15"}`}>
                  <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${tutorial ? "translate-x-5" : ""}`} />
                </span>
              </button>
            )}

            {/* GRÁFICOS do cyberespaço: automático (pela placa de vídeo), leve (placa integrada / notebook) ou completo */}
            <div className={`${item} flex-col !items-stretch gap-2 py-2.5`}>
              <span className="flex items-center gap-3">
                <Gauge size={16} className="text-cyan-600 dark:text-cyan-300 shrink-0" />
                <span className="flex flex-col flex-1 min-w-0">
                  <span className={rotulo}>{t("configMenu.cyberspace")}</span>
                  <span>{t("configMenu.graphics")}</span>
                  <span className="text-[11px] font-normal text-slate-500 dark:text-white/45 leading-snug">{t(graficos === "auto" ? "configMenu.graphicsAutoHint" : graficos === "leve" ? "configMenu.graphicsLightHint" : "configMenu.graphicsFullHint")} {t("configMenu.reopenHint")}</span>
                </span>
              </span>
              <span role="radiogroup" aria-label={t("configMenu.graphicsGroup")} className="grid grid-cols-3 gap-1 rounded-xl bg-slate-200/60 p-1 dark:bg-white/[0.06]">
                {([["auto", "configMenu.graphicsAuto"], ["leve", "configMenu.graphicsLight"], ["cheio", "configMenu.graphicsFull"]] as const).map(([v, chave]) => (
                  <button key={v} type="button" role="radio" aria-checked={graficos === v} onClick={() => mudarGraficos(v)}
                    className={`min-h-[34px] rounded-lg text-xs font-semibold transition-colors ${graficos === v ? "bg-white text-slate-900 shadow dark:bg-cyan-500/25 dark:text-white" : "text-slate-600 hover:text-slate-900 dark:text-white/60 dark:hover:text-white"}`}>{t(chave)}</button>
                ))}
              </span>
            </div>
            {/* o SERRILHADO: a nitidez (pixels por pixel da tela — vale na hora) e suavizar bordas (o antialias — ao abrir de novo) */}
            <div className={`${item} flex-col !items-stretch gap-2 py-2.5`}>
              <span className="flex flex-col min-w-0 pl-7">
                <span>{t("configMenu.sharpness")}</span>
                <span className="text-[11px] font-normal text-slate-500 dark:text-white/45 leading-snug">{t("configMenu.sharpnessHint")}</span>
              </span>
              <span role="radiogroup" aria-label={t("configMenu.sharpnessGroup")} className="grid grid-cols-5 gap-1 rounded-xl bg-slate-200/60 p-1 dark:bg-white/[0.06]">
                {([["auto", null], ["0.75", "0,75×"], ["1", "1×"], ["1.5", "1,5×"], ["2", "2×"]] as const).map(([v, rot]) => (
                  <button key={v} type="button" role="radio" aria-checked={nitidez === v} onClick={() => mudarNitidez(v)}
                    className={`min-h-[34px] rounded-lg text-xs font-semibold transition-colors ${nitidez === v ? "bg-white text-slate-900 shadow dark:bg-cyan-500/25 dark:text-white" : "text-slate-600 hover:text-slate-900 dark:text-white/60 dark:hover:text-white"}`}>{rot ?? t("configMenu.auto")}</button>
                ))}
              </span>
              <span className="flex flex-col min-w-0 pl-7 pt-1">
                <span>{t("configMenu.smoothEdges")}</span>
                <span className="text-[11px] font-normal text-slate-500 dark:text-white/45 leading-snug">{t("configMenu.smoothEdgesHint")}</span>
              </span>
              <span role="radiogroup" aria-label={t("configMenu.smoothEdges")} className="grid grid-cols-3 gap-1 rounded-xl bg-slate-200/60 p-1 dark:bg-white/[0.06]">
                {([["auto", "configMenu.auto"], ["sim", "configMenu.on"], ["nao", "configMenu.off"]] as const).map(([v, chave]) => (
                  <button key={v} type="button" role="radio" aria-checked={suavizar === v} onClick={() => mudarSuavizar(v)}
                    className={`min-h-[34px] rounded-lg text-xs font-semibold transition-colors ${suavizar === v ? "bg-white text-slate-900 shadow dark:bg-cyan-500/25 dark:text-white" : "text-slate-600 hover:text-slate-900 dark:text-white/60 dark:hover:text-white"}`}>{t(chave)}</button>
                ))}
              </span>
            </div>
            <button type="button" role="switch" aria-checked={mostrarFps} onClick={mudarFps} className={item}>
              <Activity size={16} className="text-cyan-600 dark:text-cyan-300 shrink-0" />
              <span className="flex flex-col flex-1 min-w-0">
                <span className={rotulo}>{t("configMenu.cyberspace")}</span>
                <span>{t("configMenu.showFps")}</span>
                <span className="text-[11px] font-normal text-slate-500 dark:text-white/45 leading-snug">{t("configMenu.showFpsHint")}</span>
              </span>
              <span aria-hidden className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors ${mostrarFps ? "bg-cyan-500" : "bg-slate-300 dark:bg-white/15"}`}>
                <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${mostrarFps ? "translate-x-5" : ""}`} />
              </span>
            </button>
          </Gaveta>

          {/* CONTA: convite, Modo CEO, sair, deletar — só logado */}
          {logado && (
          <Gaveta id="conta" titulo={t("configMenu.account")} icone={<UserRound size={16} className="text-cyan-600 dark:text-cyan-300 shrink-0" />} aberta={gaveta === "conta"} alternar={alternarGaveta}>
            {convite && (
              <button type="button" onClick={() => ir("/convite")} className={item}>
                <Ticket size={16} className="text-cyan-600 dark:text-cyan-300 shrink-0" />
                <span className="flex-1 truncate">{t("configMenu.invite")}</span>
                <ChevronRightIcon className="h-4 w-4 opacity-30 group-hover:opacity-100" />
              </button>
            )}

            {/* MODO CEO — o admin escondido: só founder/super-admin */}
            {ceo && (
              <button type="button" onClick={() => ir("/workstation/admin")} className={`${item} hover:!border-amber-400/60`}>
                <span aria-hidden className="absolute left-1 top-1/2 -translate-y-1/2 h-6 w-[3px] rounded-full bg-amber-400" />
                <Crown size={16} className="text-amber-500 dark:text-amber-300 shrink-0" />
                <span className="flex-1 truncate">{t("configMenu.ceoMode")}</span>
                <ChevronRightIcon className="h-4 w-4 opacity-30 group-hover:opacity-100" />
              </button>
            )}

            <button type="button" onClick={() => { limparCopiaDasConversas(session?.user?.email); void signOut(); }} className={`${item} hover:!bg-red-50 hover:!border-red-300 dark:hover:!bg-red-500/20 dark:hover:!border-red-500/40`}>
              <span className="flex flex-col flex-1">
                <span className={rotulo}>{t("configMenu.session")}</span>
                <span>{t("configMenu.logout")}</span>
              </span>
              <ArrowRightStartOnRectangleIcon className="h-4 w-4 opacity-40" />
            </button>
            <button type="button" onClick={() => void apagarConta()} disabled={apagando}
              className="flex items-center gap-3 w-full min-h-[48px] px-3 rounded-2xl text-left text-sm font-medium border bg-red-50/60 text-red-600 border-red-200 hover:bg-red-100 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/30 dark:hover:bg-red-500/20 transition-colors">
              <span className="flex flex-col flex-1">
                <span className="text-[9px] uppercase font-bold tracking-tighter opacity-60">{t("configMenu.dangerZone")}</span>
                <span>{t(apagando ? "configMenu.deleting" : "configMenu.deleteAccount")}</span>
              </span>
              {apagando ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} className="opacity-70" />}
            </button>
          </Gaveta>
          )}
        </div>
      )}
    </div>
  );
}
