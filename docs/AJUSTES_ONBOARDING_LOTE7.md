# Handoff LOTE 7 — Fecho do onboarding: voltar de Meus Estudos, card do "tipo", mini-tour do Lounge, voz opt-in, e o chat = "Zaeon"

> Para o **Claude Code**. Branch própria (`feat/onboarding-lote7`). Toca `lib/onboarding/tour.ts`,
> `components/onboard/OnboardingGuide.tsx`, `components/sub/LoungeChatWidget.tsx`,
> `app/workstation/student/StudyRoomContent.tsx`, `components/lounge/CollabModule.tsx`,
> `components/sub/MenuNavigation.tsx`, `lib/ai/personas.ts`, `app/api/ai/chat/route.ts`.
> **Rebase com a main mais recente antes** (lotes 4/5/6 mexem nos mesmos arquivos) e reaplique por
> cima. Confirme cada trecho antes de editar.

## Regras DURAS
- Branch + PR. Nunca `git add -A`. Push trava (proxy ISP) → deixe commit pronto e avise o Martinez.
- Sem segredos, sem SSH. macOS sem `python` (use `python3`). `npx tsc --noEmit` no fim; só erros novos.

---

## 1. BUG: de "Meus Estudos" não dá pra voltar pra "Estudos" (ver o esboço gerado)
**Sintoma:** no desvio do tutorial pra Meus Estudos, o usuário fica preso — não consegue voltar pra
aba **Estudos** pra ver a **pesquisa gerada esperando "Iniciar"**.
**Causa provável:** (a) o passo do tour fica travado num `advanceEvent` que não dispara, e/ou (b) a
volta de aba não está guiada/ligada (as abas ainda precisam de `data-tour` + listener `zaeon:set-tab`
— ver Lote 6 item 1). O overlay do OnboardingGuide é `pointer-events-none` (clique passa), então o
problema é de **fluxo do tour**, não de bloqueio físico.
**Rota:**
1. Garantir o listener de `zaeon:set-tab` em `StudyRoomContent` e `data-tour="tab-<id>"` nas abas
   (Lote 6 item 1) — pré-requisito.
2. No `lib/onboarding/tour.ts`, após os passos de Meus Estudos (Lote 5), adicionar um passo que
   **guia a volta**: destaca a aba **Estudos** (`[data-tour="tab-<id-estudos>"]`), `say`/hint "Volta
   pra **Estudos** pra ver o esboço da sua pesquisa esperando você." Avança ao clicar na aba
   (`clickTarget`) ou quando ela vira ativa.
3. Ao voltar, o passo seguinte destaca o **"Iniciar pesquisa"** (`data-tour="gerar"`) — que já deve
   estar pronto (geração resiliente do Lote 5). Confirmar que o esboço sobreviveu (não foi
   interrompido).
4. **Verificar:** entrar em Meus Estudos e conseguir voltar pra Estudos pelo card do tour, com o
   esboço lá.

## 2. Card do passo "🎓 TCC · Artigo · Relatório" cobre o botão → jogar pra ESQUERDA; e é o ÚLTIMO passo
**Sintoma:** na Sala de Pesquisa, o card do passo `tipo` (`[data-tour="tipo"]`) fica **em cima** do
botão de selecionar tipo de trabalho — só dá pra ver o card.
**Rota:**
1. Posicionamento (reforça o Lote 6 item A4, agora específico): no `OnboardingGuide.tsx`, quando o
   alvo é o `tipo` (ou qualquer alvo onde o card sobreporia), posicionar o card **à esquerda** do
   anel (`ring.left - cardWidth - 12`), centralizado na vertical — nunca por cima.
2. **Tour principal termina no `tipo`:** em `lib/onboarding/tour.ts`, **remover o passo `lounge`** do
   `TOUR_STEPS`. O `tipo` passa a ser o último passo do tour principal (ao concluí-lo, `finishTour()`
   marca `tourDone`). O Lounge vira um tour separado (item 3).

## 3. Mini-tour do LOUNGE (separado, SEM voz)
**Objetivo:** um tour curtinho e **sem voz** que roda **ao entrar no Lounge**, ensinando o fluxo:
expandir a bandeja de Estudos/Pesquisas → dar **play** num card → destacar o botão **Convidar** →
fim.
**Contexto (`components/lounge/CollabModule.tsx`):** bandejas retráteis (`openTrays` study/research,
~125/229), cards com `PlayBtn` (~244/252/325 → `onPlay`/`createCollab`), e o botão **"Convidar"**
no editor (~631, `reinvite`/`UserPlus`).
**Rota:**
1. Criar um segundo roteiro no tour (ex.: `LOUNGE_TOUR_STEPS` em `lib/onboarding/tour.ts`, ou um
   `loungeTour` reutilizando a mesma máquina de passos) **marcado como `silent: true`** (sem disparar
   `zaeon:onboard:say`/voz — só os cards).
2. Adicionar `data-tour` no `CollabModule`: `data-tour="lounge-tray"` (cabeçalho/botão da bandeja),
   `data-tour="lounge-play"` (um `PlayBtn` de card), `data-tour="lounge-invite"` (o botão Convidar).
3. Passos: (a) "Abre uma bandeja de Estudos/Pesquisas" → avança ao expandir; (b) "Dá **play** num
   item pra criar uma sala colaborativa" → avança ao clicar play / abrir editor; (c) "Clica em
   **Convidar** e manda o link pro seu amigo" → destaca Convidar; fim.
4. **Disparo:** ao montar o Lounge, se o usuário ainda não fez o tour do Lounge
   (`localStorage "zaeon.tourLounge"`), iniciar o mini-tour **uma vez**. Independente do tour
   principal.
5. **Sem voz mesmo** (passos `silent`): garante que rode mudo sempre, sem depender da pref de voz.

## 4. Voz do onboarding = OPT-IN; o tutorial TEM que rodar SEM voz (ESSENCIAL)
**Problema:** hoje o tour **auto-inicia** (`components/sub/MenuNavigation.tsx:~96-99`,
`startTour()` quando `!tourDone`) e a voz vem automática (o handler de `zaeon:onboard:say` chama
`tts.speak`). Isso "assusta" quem não pediu (ex.: alguém numa sala de aula).
**Rota:**
1. **Preferência persistente** `zaeon.onboard.voice` (on/off). **Default: OFF** (seguro — ninguém
   leva voz sem querer).
2. **Escolha na tela inicial:** um toggle de voz **visível e funcional** no menu/início (pode reusar
   o conceito do `VoiceModeSwitch`/o controle de voz que já existe). É aí que o usuário decide se a
   voz do onboarding fica ativa.
3. **Desligável no chat antes de começar:** mesmo com a pref ON, o usuário pode desligar a voz no
   próprio chat widget (o toggle "Voz ativa/passiva" já existe no `LoungeChatWidget`) — e isso vale
   pro onboarding também (mesma pref/estado).
4. **`zaeon:onboard:say` só fala se a pref estiver ON:** no `LoungeChatWidget`, o handler só chama
   `tts.speak`/`speakQueued` quando `zaeon.onboard.voice === on`. Quando OFF, **mostra só o texto**
   do card/mensagem (a Zaeon "escreve", não fala).
5. **Tutorial 100% funcional sem voz (ESSENCIAL):** todos os passos avançam por **ação/clique**
   (clickTarget/advanceEvent) e pelos botões dos cards — **nunca** dependem da fala. Revisar o tour
   pra garantir que nenhum passo só avança "quando a voz termina". O prewarm de voz (Lote 6) também
   só roda se a pref estiver ON.
6. **Verificar:** com voz OFF, o tour inteiro roda lendo os cards (sem áudio); com voz ON, fala +
   cards. Trocar a pref no início reflete na hora.

## 5. O chat widget se chama "ZAEON" (esquecer o "Bento")
**Decisão do Martinez:** o agente do chat widget **é a Zaeon** — não "Bento". (Os agentes
ESPECIALISTAS — Aura, Nina, etc. — podem manter nomes próprios; só o **host do chat** passa a ser
Zaeon.)
**Trocar (Bento → Zaeon):**
- `components/sub/LoungeChatWidget.tsx`: `ZAEON_AGENT.name 'Bento' → 'Zaeon'` (~71); header
  `... : "Bento"` → `"Zaeon"` (~733); títulos "Falar com o Bento" → "Falar com a Zaeon" (~705),
  title="Bento" (~802); o `systemContext` (~560) deve dizer que **ELE É a Zaeon** (remover o "NUNCA
  Zaeon"): algo como "Você é a **Zaeon**, a IA que acompanha o usuário ${userName}…". Trocar
  `agent: "bento"` (~554) pela chave nova (ver abaixo).
- `lib/ai/personas.ts`: renomear a persona `bento` → `zaeon` (`id`/`name: "Zaeon"`, `systemPrompt`
  reescrito pra ela se assumir como Zaeon, a anfitriã). **Ajustar a regra global** (~31) pra abrir
  exceção: o host **é** a Zaeon; os demais agentes mantêm nome próprio. (Cuidado pra não quebrar
  Aura/Nina/Caio/Téo.)
- `app/api/ai/chat/route.ts`: onde mapeia `agentKey === "bento"` (~142) e comentários "o Bento
  convoca/navega" — trocar pra `"zaeon"`/Zaeon. Garantir compatibilidade: se algum cliente ainda
  mandar `agent:"bento"`, aceitar como alias de `zaeon` (não quebrar em runtime).
- `components/onboard/OnboardingGuide.tsx`: comentário "(Bento conduz)" → "(Zaeon conduz)" (cosmético).
- ⚠️ **NÃO** tocar em `constants/universities.ts:210` — "Bento Gonçalves" é uma **cidade** (IFRS),
  nada a ver com o agente.
- Conferir textos/saudações hardcoded que citem "Bento" (ex.: saudação inicial do widget) e trocar
  pra Zaeon.

---

# Verificação final
1. `npx tsc --noEmit` — zero erros novos.
2. Smoke (descreva no PR):
   - Voltar de Meus Estudos → Estudos pelo card do tour, com o esboço esperando "Iniciar".
   - Card do passo "tipo" fica **à esquerda**, sem cobrir o botão; tour principal **termina no tipo**
     (sem passo Lounge).
   - Entrar no Lounge dispara o **mini-tour sem voz** (bandeja → play → Convidar), 1x.
   - Voz do onboard **OFF por padrão**: tour roda só com texto; ligar no início faz a voz vir;
     dá pra desligar no chat. Tutorial funciona 100% sem voz.
   - Chat widget exibe **"Zaeon"** em todo lugar (sem "Bento"); cidade "Bento Gonçalves" intacta.
3. Git: branch `feat/onboarding-lote7` + PR. Nunca `git add -A`.

# Arquivos
- `lib/onboarding/tour.ts` (passo de volta; remover lounge do principal; LOUNGE_TOUR silent; gate de
  prewarm por pref).
- `components/onboard/OnboardingGuide.tsx` (card do "tipo" à esquerda; "Zaeon conduz").
- `components/sub/LoungeChatWidget.tsx` (Bento→Zaeon; say só fala se pref ON; toggle de voz vale pro
  onboard).
- `app/workstation/student/StudyRoomContent.tsx` (data-tour nas abas + listener set-tab — pré-req).
- `components/lounge/CollabModule.tsx` (data-tour: lounge-tray/play/invite; disparo do mini-tour).
- `components/sub/MenuNavigation.tsx` (toggle de voz do onboard no início; default OFF).
- `lib/ai/personas.ts` + `app/api/ai/chat/route.ts` (persona bento→zaeon + alias).
