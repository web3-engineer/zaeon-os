# Handoff DEDICADO — Localização (i18n) funcional em 3 idiomas + seletor de bandeiras

> Para um **agente exclusivo** deste trabalho (não misturar com os lotes de onboarding/aula).
> Branch própria (`feat/i18n-localizacao`). Objetivo: **tirar textos hardcoded** e fazer as
> traduções **realmente funcionarem** em **3 idiomas (FOCO ATUAL) — Português, Inglês, Espanhol** —
> com **seleção por bandeiras** no menu inicial (e também em Opções).
>
> **ESCOPO:** entregar **pt/en/es** 100% funcionais agora. Francês e Chinês ficam pra um 2º passe
> (os arquivos `fr/zh` já existem no repo — **não apague**, só **deixe fora do seletor** por
> enquanto). Toda a estrutura/método abaixo deve já facilitar plugar fr/zh depois (é só adicionar ao
> `supportedLngs` e preencher as chaves).

## Regras DURAS
- Branch + PR. **Nunca `git add -A`** (adicione arquivos explicitamente). Push direto na `main`
  trava (proxy ISP) → deixe o commit pronto e avise o Martinez. Sem segredos. Sem SSH na VPS.
- macOS sem `python` (use `python3`). Ao fim: `npx tsc --noEmit` (só conserte erros novos).
- Trabalho grande: faça **incremental e por superfície** (commits por área), não um big-bang.

---

## Estado atual (já mapeado — confie e confirme)
- Config: `src/i18n.ts` — i18next + `i18next-http-backend` (carrega `/locales/{{lng}}/common.json`)
  + `i18next-browser-languagedetector` + `react-i18next`. `fallbackLng: "en"`, `ns: ["common"]`,
  `useSuspense: false`. **Não** há `supportedLngs` nem `load: "languageOnly"`.
- Locales existentes: `public/locales/{pt,en,es,fr,zh,de,ko}/common.json` — **cada um com os mesmos
  20 namespaces** já traduzidos: `navbar, intro, menu, roles, hints, options, footer, modal,
  homework, workstation, agents, encryption, study_rooms, lounge_chat, research_module, about,
  tech_room, hero, feed, profile`. Ou seja, há uma **base boa**, mas cobre só uma fração da UI.
- Uso real: **só ~18 arquivos** usam `useTranslation` (`grep -rl useTranslation app components`).
  Todo o resto é **PT hardcoded** (centenas de componentes: salas, onboarding, research-lab,
  Meus Estudos, plugin store, aulas, etc.).
- Já existe um seletor cru: `components/sub/MenuNavigation.tsx:~608` — um `<select>` com
  `i18n.changeLanguage(...)` mostrando `i18n.language.toUpperCase()`. Precisa virar **bandeiras**.

---

## FASE 0 — Infra do i18n (rápida, base de tudo)
1. `src/i18n.ts`:
   - Adicionar `supportedLngs: ["pt","en","es"]` (foco atual). `fr/zh/de/ko` **continuam como
     arquivos** (não quebram) mas **fora do seletor** — pra plugar depois é só acrescentar aqui.
   - `load: "languageOnly"` (assim `pt-BR`/`en-US`/`es-ES` caem em `pt`/`en`/`es`).
   - `nonExplicitSupportedLngs: true`.
   - Detector: garantir `detection: { order: ["localStorage","navigator","htmlTag"], caches:
     ["localStorage"], lookupLocalStorage: "zaeon.lang" }` — a escolha **persiste**.
   - Após `changeLanguage`, refletir em `document.documentElement.lang` (listener `languageChanged`).
2. Confirmar que o `i18n` é importado uma vez no boot do cliente (provavelmente já em
   `app/layout.tsx` ou num provider). Se não houver provider, garantir o import no topo do app.

## FASE 1 — Seletor de idioma por BANDEIRAS (menu inicial + Opções)
1. Criar `components/i18n/LanguageSwitcher.tsx` (client): mostra as 3 bandeiras
   🇧🇷 PT · 🇺🇸 EN · 🇪🇸 ES (use emojis de bandeira ou SVGs simples), marca a ativa,
   `onClick` → `i18n.changeLanguage(code)` (persiste via detector). Acessível (aria-label por idioma).
   Deixe a lista de idiomas num array fácil de estender (pra somar 🇫🇷/🇨🇳 depois sem refatorar).
   - Variante compacta (ícone+sigla) e variante "grid de bandeiras".
2. **Menu inicial:** substituir o `<select>` cru em `components/sub/MenuNavigation.tsx:~608` pelo
   `LanguageSwitcher` (grid de bandeiras, bonito, padrão Zaeon).
3. **Opções:** incluir o mesmo `LanguageSwitcher` na tela/aba de Opções (onde já vivem voz, tutoriais
   etc. — ver `MenuNavigation` "Opções"). Os dois pontos controlam o mesmo estado (i18n global).
4. Trocar de idioma deve **refletir na hora** em toda a UI já internacionalizada (sem reload).

## FASE 2 — De-hardcode (o grosso): externalizar textos para `t()`
Método **repetível por superfície** (não tente tudo de uma vez):
1. **Auditar** a superfície: achar as strings PT hardcoded em JSX (texto entre tags, `placeholder=`,
   `title=`, `aria-label=`, `alt=`). Dica de varredura:
   `grep -rnoE ">[^<>{}]*[A-Za-zÀ-ÿ]{3,}[^<>{}]*<" components/<area>` e revisar `placeholder|title|
   aria-label` manualmente. (Ignorar strings técnicas/classes.)
2. **Criar chaves** em `public/locales/pt/common.json` seguindo a convenção de namespace por área
   (ex.: `menu.*`, `study_rooms.*`, `research_module.*`, `onboarding.*`, `plugins.*`, `aulas.*`,
   `options.*`). Reusar namespaces existentes quando fizer sentido; criar novos por superfície nova.
3. **Substituir** no componente: `const { t } = useTranslation();` → `t("namespace.chave")`. Para
   texto com markup/variáveis, usar interpolação (`t("k", { nome })`) ou `<Trans>` quando houver
   tags embutidas.
4. **Traduzir** a MESMA chave nos 3 arquivos do foco (`pt, en, es`). **Manter as chaves
   sincronizadas** entre eles (nada de chave só em pt). (`fr/zh` ficam pro 2º passe — opcional
   espelhar a chave em branco/igual ao en pra não dar erro de carga.)
5. **Não** quebrar o que já usa `t()`. Não renomear chaves existentes sem atualizar todos os locales.

### Prioridade das superfícies (faça nesta ordem — alto impacto primeiro)
1. **Menu inicial + navbar + hero/intro** (`MenuNavigation`, `navbar`, `hero-content`,
   `HeroSceneController`) — primeira tela que todo mundo vê.
2. **Opções** (voz, tutoriais, idioma, convite).
3. **Onboarding** — os textos visíveis dos cards (`lib/onboarding/tour.ts` `hint`/`say`,
   `components/onboard/OnboardingGuide.tsx`). ⚠️ Os `say` também viram **voz** (TTS/prewarm dos
   lotes 5/6): ao localizar, o prewarm deve usar o texto **no idioma ativo** (a chave de cache já
   inclui o texto, então funciona; só garanta que o tour lê `t(step.sayKey)` em vez da constante PT).
4. **Sala de Estudos / Meus Estudos** (`StudyRoomContent` tabs/labels, `MeusEstudosFeed`,
   `StudioDock` rótulos).
5. **Sala de Pesquisa** (`app/research-lab/*` — modal de exportar, dock, citações, painéis).
6. **Plugin Store**, **Aulas** (quando os lotes de aula assentarem), **about** (já parcialmente).
7. Resto (admin, feed, etc.) — menor prioridade.

> Realismo: internacionalizar um app desse tamanho 100% é grande. Entregue as superfícies de
> prioridade 1–5 **completas nos 3 idiomas (pt/en/es)** neste PR; deixe 6–7 mapeadas (lista de
> pendências no PR) pra um segundo passe. Não invente tradução de termos técnicos da marca (Zaeon,
> Studio, etc. — mantêm o nome).

## FASE 3 — Verificação
1. `npx tsc --noEmit` — zero erros novos.
2. **Paridade de chaves:** rodar um check (script `node`/`python3`) garantindo que `en/es`
   têm exatamente as mesmas chaves de `pt` (sem faltantes/sobrando). Incluir o script no PR
   (`scripts/i18n-check.mjs` ou similar) pra rodar no CI depois. (Deixe o script já parametrizável
   pra incluir `fr/zh` quando entrarem.)
3. **Smoke por idioma:** trocar para PT, EN e ES pelo seletor de bandeiras e confirmar que
   as superfícies de prioridade 1–5 **não mostram PT hardcoded** (e que a escolha **persiste** após
   reload).
4. Conferir `document.documentElement.lang` mudando com o idioma.

---

# Entregáveis
- `src/i18n.ts` ajustado (Fase 0).
- `components/i18n/LanguageSwitcher.tsx` + plugado no **menu** e em **Opções** (Fase 1).
- Superfícies de prioridade 1–5 internacionalizadas, com chaves novas preenchidas nos **3** locales
  do foco (`pt/en/es`).
- Script de paridade de chaves + lista de pendências (superfícies 6–7 e idiomas fr/zh) no corpo do PR.
- Branch `feat/i18n-localizacao` + PR (sem push se travar; avisar o Martinez).

# Arquivos-chave
- `src/i18n.ts`, `public/locales/{pt,en,es,fr,zh}/common.json`.
- `components/sub/MenuNavigation.tsx` (troca o select por bandeiras; Opções).
- `components/i18n/LanguageSwitcher.tsx` (novo).
- Superfícies: `components/sub/hero-content.tsx`, `components/main/navbar.tsx`,
  `app/workstation/student/StudyRoomContent.tsx`, `components/study/MeusEstudosFeed.tsx`,
  `components/studio/StudioDock.tsx`, `app/research-lab/*`, `lib/onboarding/tour.ts`,
  `components/onboard/OnboardingGuide.tsx`, etc.
