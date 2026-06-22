# Claude Code Prompt — Research Room: News Tab + Profile Module + Workstation Migration + Onboarding Extension

> **Superpowers mode ON. Ralph loop ativado.**
> Agente: execute cada passo em ordem estrita. Leia os arquivos antes de editar. Não quebre nenhuma feature existente. Abra um PR ao final com todos os arquivos modificados.
> Stack: Next.js 14 (App Router), TypeScript, Tailwind, Framer Motion, NextAuth, Prisma.
> Esta PR é construída **em cima da branch `feat/abnt-structured-editor-template`** — assuma que os arquivos dela já estão no branch atual.

---

## CONTEXTO DO SISTEMA — LEIA ANTES DE QUALQUER MUDANÇA

A `research-lab` (`/app/research-lab/page.tsx`) é o coração do Zaeon OS para estudantes. Ela já possui:

- Estado `activeTab: "mural" | "editor"` (linha ~377)
- Tab switcher visível em ~linha 1065 com dois botões: **Editor** e **Mural**
- `activeSection` para controlar painéis internos (PDF, Scribe, Examiner, Videos, Doc)
- O componente `ResearchRoomTour` já montado e aguardando `?tour=true` na URL

O **Workstation** (`/app/workstation/page.tsx`) é a página de perfil/gamificação do usuário, com:
- Cápsula DNA animada + avatar + skill tree
- Portais de acesso às Study Rooms
- `NetworkMural` incorporado
- Ele é acessível via link `Workstation` na navbar principal

O objetivo desta PR é:
1. **Estender `activeTab`** para incluir `"news"` e `"profile"`
2. **Adicionar aba News** na research-lab, reutilizando a lógica de `app/study-rooms/lounge/main-lounge/news/page.tsx`
3. **Adicionar aba Profile** na research-lab, reutilizando `app/study-rooms/lounge/main-lounge/profile/page.tsx`
4. **Remover o link Workstation** da navbar principal (`components/main/navbar.tsx`, linha 190)
5. **Estender o ResearchRoomTour** com passos guiados para as novas abas
6. **Criar o plano de onboarding** cobrindo as novas seções no fluxo do `ONBOARDING_PLAN.md`
7. **Abrir PR** com branch `feat/research-news-profile-migration`

---

## RALPH LOOP — ESTRUTURA DE EXECUÇÃO

```
R — Read:    Leia todos os arquivos listados no Passo 1
A — Analyze: Mapeie o estado atual (tabs existentes, imports, tipos)
L — List:    Liste exatamente o que muda em cada arquivo
P — Plan:    Confirme a ordem de edição (sem conflitos de merge)
H — Hack:    Implemente passo a passo, rodando tsc após cada arquivo
```

---

## PASSO 1 — LEIA OS ARQUIVOS (leitura obrigatória antes de qualquer edição)

Leia na íntegra:

```
app/research-lab/page.tsx                            # Editor principal (~1629 linhas)
components/onboard/ResearchRoomTour.tsx              # Tour guiado existente
components/main/navbar.tsx                           # Navbar com link Workstation (linha 190)
app/study-rooms/lounge/main-lounge/news/page.tsx     # Feed de notícias a reutilizar
app/study-rooms/lounge/main-lounge/profile/page.tsx  # Módulo de perfil a reutilizar
app/workstation/page.tsx                             # Workstation (entender o que migra)
app/workstation/admin/modules/ProfileModule.tsx      # ProfileModule administrativo (referência)
ONBOARDING_PLAN.md                                   # Plano de onboarding existente (contexto)
```

Identifique e anote:
- A declaração exata de `activeTab` e seu tipo union (linha ~377)
- O bloco do Tab Switcher (em torno de linha ~1062–1080)
- O `return` principal do JSX e onde `{activeTab === "mural" ? ... : ...}` ocorre (~linha 1082)
- A linha exata do link Workstation na navbar (linha ~190)
- Os exports default de `LoungeNewsFeed` e `ProfileModule`
- Os `import` de ícones e libs usados nos dois componentes de reutilização

---

## PASSO 2 — CRIAR COMPONENTES EXTRAÍDOS PARA REUTILIZAÇÃO

Antes de editar a research-lab, extraia os dois módulos como componentes independentes e reutilizáveis. Isso evita importar páginas inteiras (que podem ter dependências de rota do Next.js).

### 2a. Criar `components/research/NewsPanel.tsx`

Copie **toda a lógica** de `app/study-rooms/lounge/main-lounge/news/page.tsx` para este novo arquivo, fazendo os ajustes abaixo:

```tsx
// components/research/NewsPanel.tsx
"use client";

/**
 * NewsPanel — Feed de notícias reutilizável para a Research Room.
 * Extraído de app/study-rooms/lounge/main-lounge/news/page.tsx
 * Mantém: LoupeText, NewsCard, layout completo, i18n, fetch /api/news
 * Ajuste: aceita prop `className` para adaptação de layout.
 */

// Cole aqui TODO o conteúdo de lounge/main-lounge/news/page.tsx
// Renomeie o export default de `LoungeNewsFeed` para `NewsPanel`
// Adicione a prop opcional: `className?: string`
// No div raiz do componente, aplique: className={`... ${className ?? ''}`}
// Remova qualquer `import` de rota Next.js que não seja necessário fora do contexto de página

export default function NewsPanel({ className }: { className?: string }) {
  // ... (todo o código copiado de LoungeNewsFeed, com o rename)
}
```

**Atenção:** preserve os sub-componentes `LoupeText` e `NewsCard` no mesmo arquivo. Não os exporte separadamente — são internos ao `NewsPanel`.

### 2b. Criar `components/research/ProfilePanel.tsx`

Copie **toda a lógica** de `app/study-rooms/lounge/main-lounge/profile/page.tsx`:

```tsx
// components/research/ProfilePanel.tsx
"use client";

/**
 * ProfilePanel — Módulo de perfil reutilizável para a Research Room.
 * Extraído de app/study-rooms/lounge/main-lounge/profile/page.tsx
 * Mantém: FullWidthChart, HabitMatrix, SideModules, PeopleStream,
 *          Identity Protocol card, DNA torso panel
 * Ajuste: aceita prop `className` para adaptação de layout.
 */

// Cole aqui TODO o conteúdo de lounge/main-lounge/profile/page.tsx
// Renomeie o export default de `ProfileModule` para `ProfilePanel`
// Adicione a prop opcional: `className?: string`
// Preserve todos os sub-componentes (StringLine, FullWidthChart, HabitMatrix, SideModules, PeopleStream)

export default function ProfilePanel({ className }: { className?: string }) {
  // ... (todo o código copiado de ProfileModule, com o rename)
}
```

---

## PASSO 3 — ESTENDER O TIPO `activeTab` NA RESEARCH-LAB

**Arquivo:** `app/research-lab/page.tsx`

### 3a. Importar os novos painéis

No bloco de imports, adicione:
```typescript
import NewsPanel from "@/components/research/NewsPanel";
import ProfilePanel from "@/components/research/ProfilePanel";
```

### 3b. Alterar o tipo do estado `activeTab`

Localize a linha ~377:
```typescript
const [activeTab, setActiveTab] = useState<"mural" | "editor">("editor");
```

Substitua por:
```typescript
const [activeTab, setActiveTab] = useState<"editor" | "mural" | "news" | "profile">("editor");
```

---

## PASSO 4 — ADICIONAR BOTÕES NO TAB SWITCHER

**Arquivo:** `app/research-lab/page.tsx` — bloco em torno de linha ~1062–1080

O Tab Switcher atual tem dois botões: Editor e Mural. Adicione dois novos botões logo após o botão "Mural", mantendo o mesmo padrão visual.

### 4a. No switcher do sidebar esquerdo (botões icon + texto)

Localize o par de botões de sidebar (~linha 1025–1033):
```tsx
<button onClick={() => setActiveTab("editor")} ...>...</button>
<button onClick={() => setActiveTab("mural")} ...>...</button>
```

Adicione depois do botão "mural":
```tsx
{/* Botão News */}
<button
  data-tour="news-tab"
  onClick={() => setActiveTab("news")}
  className={`flex items-center gap-3 p-2 rounded-xl transition-all ${
    activeTab === 'news'
      ? 'bg-amber-500 text-white shadow-md'
      : 'text-black dark:text-white hover:bg-slate-100 dark:hover:bg-white/10 group'
  }`}
>
  <NewspaperIcon className="w-5 h-5 shrink-0" />
  <span className="text-[10px] font-black uppercase tracking-widest hidden group-hover:block whitespace-nowrap">
    News
  </span>
</button>

{/* Botão Profile */}
<button
  data-tour="profile-tab"
  onClick={() => setActiveTab("profile")}
  className={`flex items-center gap-3 p-2 rounded-xl transition-all ${
    activeTab === 'profile'
      ? 'bg-violet-600 text-white shadow-md'
      : 'text-black dark:text-white hover:bg-slate-100 dark:hover:bg-white/10 group'
  }`}
>
  <UserCircleIcon className="w-5 h-5 shrink-0" />
  <span className="text-[10px] font-black uppercase tracking-widest hidden group-hover:block whitespace-nowrap">
    Profile
  </span>
</button>
```

**Nota:** `NewspaperIcon` já é importado de `@heroicons/react/24/outline`. `UserCircleIcon` também já existe nos imports existentes.

### 4b. No switcher horizontal superior (pills visíveis no mobile/desktop)

Localize os botões pill em ~linha 1065–1080 (dois `<button>` com px-5, py-2, rounded-xl).

Adicione depois do botão "mural" pill:
```tsx
<button
  data-tour="news-tab-pill"
  onClick={() => setActiveTab("news")}
  className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
    activeTab === 'news'
      ? 'bg-amber-500 text-white shadow-md'
      : 'text-black dark:text-white hover:bg-slate-200/50 dark:hover:bg-white/5'
  }`}
>
  <NewspaperIcon className="w-4 h-4" />
  News
</button>

<button
  data-tour="profile-tab-pill"
  onClick={() => setActiveTab("profile")}
  className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
    activeTab === 'profile'
      ? 'bg-violet-600 text-white shadow-md'
      : 'text-black dark:text-white hover:bg-slate-200/50 dark:hover:bg-white/5'
  }`}
>
  <UserCircleIcon className="w-4 h-4" />
  Profile
</button>
```

---

## PASSO 5 — RENDERIZAR OS NOVOS PAINÉIS NO JSX PRINCIPAL

**Arquivo:** `app/research-lab/page.tsx`

Localize o bloco condicional em ~linha 1082:
```tsx
{activeTab === "editor" ? (
  <div>... editor content ...</div>
) : (
  <div>... mural content ...</div>
)}
```

Substitua pela estrutura expandida:
```tsx
{activeTab === "editor" && (
  <div>... (mantém exatamente o conteúdo do editor existente) ...</div>
)}

{activeTab === "mural" && (
  <div>... (mantém exatamente o conteúdo do mural existente) ...</div>
)}

{activeTab === "news" && (
  <div className="w-full h-full overflow-y-auto custom-scrollbar">
    <NewsPanel className="pb-24" />
  </div>
)}

{activeTab === "profile" && (
  <div className="w-full h-full overflow-y-auto custom-scrollbar">
    <ProfilePanel className="pb-24" />
  </div>
)}
```

**Atenção ao refactoring:** a mudança de `? :` para `&& &&` não deve quebrar lógica. Verifique se existem closings de `<div>` ou fragmentos que precisam ser ajustados para a nova estrutura.

---

## PASSO 6 — ATUALIZAR O TÍTULO E SUBTITLE DA PÁGINA CONFORME ABA ATIVA

**Arquivo:** `app/research-lab/page.tsx`

Localize a seção onde o título e descrição da página mudam conforme `activeTab` (~linha 1052–1058):
```tsx
{activeTab === "mural" ? "Mural de Pesquisas" : "Laboratório de Pesquisa"}
```

Substitua por uma função helper:
```typescript
const getTabMeta = () => {
  switch (activeTab) {
    case "mural":
      return { title: "Mural de Pesquisas", subtitle: "Pesquisas publicadas pela comunidade Zaeon" };
    case "news":
      return { title: "Central de Notícias", subtitle: "Atualizações, relatórios e eventos do ecossistema acadêmico" };
    case "profile":
      return { title: "Identidade Neural", subtitle: "Seu perfil, conquistas e rede de colaboração" };
    default:
      return { title: "Laboratório de Pesquisa", subtitle: "Seu espaço de criação e exportação ABNT" };
  }
};
const tabMeta = getTabMeta();
```

E use `tabMeta.title` e `tabMeta.subtitle` onde esses textos aparecem no JSX.

---

## PASSO 7 — REMOVER WORKSTATION DA NAVBAR

**Arquivo:** `components/main/navbar.tsx`

Localize a linha ~190:
```tsx
<Link href="/workstation" className={getLinkClassName("/workstation")}>Workstation</Link>
```

**Remova esta linha completamente.**

Verifique também se existe alguma referência a `/workstation` no mobile menu do mesmo navbar (procure por `"Workstation"` com grep no arquivo inteiro) e remova todas as ocorrências.

O link de pesquisa (`/research-lab`) já existe na navbar e será o ponto de entrada unificado.

---

## PASSO 8 — ESTENDER O `ResearchRoomTour` COM NOVOS PASSOS

**Arquivo:** `components/onboard/ResearchRoomTour.tsx`

Leia o arquivo inteiro. Localize o array `TOUR_STEPS` existente (definido no `ONBOARDING_PLAN.md` com 12 passos).

### 8a. Adicionar atributos `data-tour` nos novos botões

Confirme que os novos botões criados no Passo 4 tenham os atributos:
- Botão News sidebar: `data-tour="news-tab"`
- Botão Profile sidebar: `data-tour="profile-tab"`

(Esses atributos já foram especificados no Passo 4.)

### 8b. Inserir novos passos no `TOUR_STEPS` array

Insira estes dois passos **antes** do passo `mural-teaser` (penúltimo passo atual):

```typescript
{
  id: 'news-tab',
  target: '[data-tour="news-tab"]',
  title: '📰 Central de Notícias',
  description: 'Aqui ficam as novidades do ecossistema Zaeon — artigos publicados, eventos acadêmicos, e relatórios mensais da comunidade. Tudo que você precisa saber, em um só lugar.',
  position: 'right',
  highlight: true,
},
{
  id: 'profile-tab',
  target: '[data-tour="profile-tab"]',
  title: '🧬 Seu Perfil Neural',
  description: 'Sua identidade na Zaeon: gráfico de progresso, matriz de objetivos semanais, ranking de colaboração e card de identidade. Tudo sincronizado com sua conta. Seu perfil é sua credencial acadêmica.',
  position: 'right',
  highlight: true,
},
```

### 8c. Atualizar o passo `mural-teaser`

O passo `mural-teaser` atualmente sugere navegar para `/workstation/profiles`. Como o perfil agora vive na research-lab, atualize:

```typescript
{
  id: 'mural-teaser',
  target: null,
  title: '🌐 Explore sua comunidade',
  description: 'Você acabou de conhecer todas as ferramentas da sua sala de pesquisa. Explore a aba Mural para ver pesquisas da comunidade, e a aba Profile para gerenciar sua identidade acadêmica.',
  position: 'center',
  // Removido: hasNavigation e navigationTarget (não navega mais para /workstation)
},
```

---

## PASSO 9 — ADICIONAR ONBOARDING INTEGRADO AO FLUXO EXISTENTE

**Arquivo:** `components/onboard/ResearchRoomTour.tsx`

Esta seção define como o tour da research-lab apresenta as novas seções de forma progressiva — respeitando o design do `ONBOARDING_PLAN.md`.

### 9a. Tour em duas fases (firstVisit vs. returnVisit)

Adicione um estado para controlar se é a primeira vez que o usuário chega em cada aba:

```typescript
// Em ResearchRoomTour.tsx (ou em research-lab/page.tsx, exposto via prop)
const [visitedTabs, setVisitedTabs] = useState<Set<string>>(new Set());

// Quando o usuário troca de aba pela primeira vez:
const handleTabChange = (tab: string) => {
  if (!visitedTabs.has(tab)) {
    setVisitedTabs(prev => new Set([...prev, tab]));
    // Disparar mini-tour da aba se for firstVisit
    triggerMiniTour(tab);
  }
  setActiveTab(tab as any);
};
```

Substitua os `onClick={() => setActiveTab("news")}` dos botões do Passo 4 por `onClick={() => handleTabChange("news")}` e idem para "profile".

### 9b. Mini-tours contextuais por aba

Adicione um componente `MiniTourToast` que aparece como um tooltip "pop" no canto inferior direito quando o usuário visita uma aba pela primeira vez. É leve, não bloqueia a UI, e desaparece em 5s:

```tsx
// Em components/research/MiniTourToast.tsx

"use client";

import { motion, AnimatePresence } from "framer-motion";
import { SparklesIcon, XMarkIcon } from "@heroicons/react/24/outline";

const TAB_HINTS: Record<string, { emoji: string; title: string; tip: string }> = {
  news: {
    emoji: "📰",
    title: "Central de Notícias",
    tip: "Explore relatórios mensais e eventos do ecossistema Zaeon. Publicações são filtradas por relevância acadêmica.",
  },
  profile: {
    emoji: "🧬",
    title: "Identidade Neural",
    tip: "Clique nos quadrados da Matriz de Objetivos para registrar seu progresso diário. O gráfico atualiza automaticamente.",
  },
};

interface MiniTourToastProps {
  tab: string | null;
  onDismiss: () => void;
}

export default function MiniTourToast({ tab, onDismiss }: MiniTourToastProps) {
  const hint = tab ? TAB_HINTS[tab] : null;

  return (
    <AnimatePresence>
      {hint && (
        <motion.div
          key={tab}
          initial={{ y: 40, opacity: 0, scale: 0.9 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 40, opacity: 0, scale: 0.9 }}
          transition={{ type: "spring", stiffness: 300, damping: 22 }}
          className="fixed bottom-6 right-6 z-[9998] max-w-xs bg-white dark:bg-[#1e293b] border border-cyan-400/40 rounded-[24px] p-5 shadow-2xl shadow-cyan-500/10 flex flex-col gap-2"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{hint.emoji}</span>
              <span className="text-[11px] font-black uppercase tracking-widest text-slate-800 dark:text-white">
                {hint.title}
              </span>
            </div>
            <button
              onClick={onDismiss}
              className="w-6 h-6 flex items-center justify-center rounded-full bg-slate-100 dark:bg-white/10 text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors shrink-0 mt-0.5"
            >
              <XMarkIcon className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
            {hint.tip}
          </p>
          <div className="flex items-center gap-1.5 mt-1">
            <SparklesIcon className="w-3 h-3 text-cyan-500" />
            <span className="text-[9px] font-bold text-cyan-500 uppercase tracking-widest">
              Dica da Zaeon
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

### 9c. Integrar `MiniTourToast` na research-lab

**Arquivo:** `app/research-lab/page.tsx`

1. Importe: `import MiniTourToast from "@/components/research/MiniTourToast";`
2. Adicione estado: `const [miniTourTab, setMiniTourTab] = useState<string | null>(null);`
3. Implemente `triggerMiniTour`:
   ```typescript
   const triggerMiniTour = (tab: string) => {
     if (['news', 'profile'].includes(tab)) {
       setMiniTourTab(tab);
       // Auto-dismiss após 6 segundos
       setTimeout(() => setMiniTourTab(null), 6000);
     }
   };
   ```
4. No JSX final (antes do fechamento do `</div>` raiz da página), adicione:
   ```tsx
   <MiniTourToast tab={miniTourTab} onDismiss={() => setMiniTourTab(null)} />
   ```

---

## PASSO 10 — REDIRECT: ACESSOS DIRETOS A /workstation

**Arquivo:** `app/workstation/page.tsx`

O workstation ainda existe no sistema (é usado por professores e pela rota `/workstation/student/[module]`). Mas o link público da navbar foi removido. Para garantir que usuários que cheguem via bookmark ou URL direta sejam redirecionados:

Localize o `useEffect` de redirect existente (~linha onde `router.replace` ocorre) e adicione:

```typescript
// Se o usuário for um ALUNO acessando diretamente /workstation,
// redirecionar para /research-lab (onde o perfil agora vive)
useEffect(() => {
  if (isEmbedded || status === "loading" || isSyncing) return;

  if (pathname === '/workstation') {
    if (isTeacher) {
      router.replace('/workstation/teacher/profile');
    } else {
      // Alunos: tudo migrou para a research-lab
      router.replace('/research-lab?tab=profile');
    }
  }
}, [isTeacher, pathname, isEmbedded, router, status, isSyncing]);
```

### 10a. Suporte ao query param `?tab=` na research-lab

**Arquivo:** `app/research-lab/page.tsx`

Na research-lab, detecte o param `?tab=` via `useSearchParams`:

```typescript
import { useSearchParams } from "next/navigation";

// No corpo do componente:
const searchParams = useSearchParams();

useEffect(() => {
  const tabParam = searchParams.get("tab");
  if (tabParam && ["editor", "mural", "news", "profile"].includes(tabParam)) {
    setActiveTab(tabParam as any);
  }
}, [searchParams]);
```

Isso garante que `/research-lab?tab=profile` ative diretamente a aba de perfil (usado pelo redirect do workstation e por links externos).

---

## PASSO 11 — VERIFICAÇÕES DE TYPECHECK E BUILD

Após implementar todos os passos acima, rode na ordem:

```bash
# 1. Typecheck completo
npx tsc --noEmit

# 2. Lint com fix automático
npx eslint \
  app/research-lab/page.tsx \
  components/main/navbar.tsx \
  components/onboard/ResearchRoomTour.tsx \
  components/research/NewsPanel.tsx \
  components/research/ProfilePanel.tsx \
  components/research/MiniTourToast.tsx \
  app/workstation/page.tsx \
  --fix

# 3. Build completo (garante zero quebra)
npm run build
```

**Erros comuns a antecipar:**
- `useSearchParams()` requer que o componente seja wrapped em `<Suspense>` no App Router. Se o build reclamar, envolva o componente ou extraia o `useSearchParams` para um sub-componente filho com `<Suspense>` no pai.
- Sub-componentes copiados de páginas Next.js (como `LoupeText`) podem ter dependências de `useTranslation` ou `next/image`. Garanta que todos os imports estejam presentes nos novos arquivos `NewsPanel.tsx` e `ProfilePanel.tsx`.
- Se `ProfilePanel` usar `useSession()`, isso é ok — ele já é um Client Component.

---

## PASSO 12 — CRIAR A PR

```bash
# Criar branch a partir do feat/abnt-structured-editor-template
git checkout feat/abnt-structured-editor-template
git checkout -b feat/research-news-profile-migration

# Adicionar todos os arquivos novos e modificados
git add \
  components/research/NewsPanel.tsx \
  components/research/ProfilePanel.tsx \
  components/research/MiniTourToast.tsx \
  app/research-lab/page.tsx \
  components/main/navbar.tsx \
  components/onboard/ResearchRoomTour.tsx \
  app/workstation/page.tsx

git commit -m "feat(research-lab): add News + Profile tabs, remove Workstation from nav, extend tour

- Add components/research/NewsPanel.tsx (extracted from lounge news page)
- Add components/research/ProfilePanel.tsx (extracted from lounge profile page)
- Add components/research/MiniTourToast.tsx (contextual first-visit hints)
- Extend activeTab type: 'editor' | 'mural' | 'news' | 'profile'
- Add News and Profile tab buttons to sidebar + horizontal pill switcher
- Add data-tour attributes to new tab buttons for ResearchRoomTour targeting
- Add handleTabChange() to trigger MiniTourToast on first-visit per tab
- Add getTabMeta() helper for dynamic title/subtitle per active tab
- Add ?tab= query param support via useSearchParams for deep-linking
- Remove Workstation link from main navbar (navbar.tsx line 190)
- Redirect /workstation student access to /research-lab?tab=profile
- Extend ResearchRoomTour with 2 new steps: news-tab, profile-tab
- Update mural-teaser step: remove workstation navigation reference
- Zero breaking changes: teacher workstation routes unaffected

Closes #ISSUE — Research Room: News + Profile Migration"

git push origin feat/research-news-profile-migration
```

### Description da PR (copie para o GitHub):

```markdown
## O que muda nesta PR

Esta PR consolida a experiência do estudante Zaeon na **Research Room** (`/research-lab`),
eliminando a necessidade de uma rota separada (`/workstation`) para acesso ao perfil e às notícias.

### Novas abas na Research Room
| Aba | Cor | Conteúdo |
|-----|-----|----------|
| 📝 Editor | Roxo | Research editor ABNT (existente) |
| 🌐 Mural | Ciano | Posts da comunidade (existente) |
| 📰 News | Âmbar | Feed de notícias + Focus Reader (NOVO) |
| 🧬 Profile | Violeta | Perfil gamificado + HabitMatrix (NOVO) |

### Migração do Workstation
- Link `Workstation` removido da navbar pública
- Acesso direto a `/workstation` por alunos → redirect para `/research-lab?tab=profile`
- Rotas de professor (`/workstation/teacher/`) **inalteradas**

### Onboarding estendido
- `ResearchRoomTour` ganha 2 novos passos: News e Profile
- `MiniTourToast` aparece na primeira visita a cada nova aba (auto-dismiss 6s)
- URL `?tab=profile` funciona como deep link direto

### Sem breaking changes
- Study rooms (`/study-rooms/`) inalteradas — continuam funcionando
- Workstation de professores (`/workstation/teacher/`) inalterado
- API routes inalteradas
- Todos os dados existentes de usuário preservados
```

---

## RESTRIÇÕES IMPORTANTES

1. **NÃO remova** as páginas `/app/study-rooms/` — elas continuam sendo usadas
2. **NÃO remova** as páginas originais `news/page.tsx` e `profile/page.tsx` das study rooms — os painéis copiados (`NewsPanel`, `ProfilePanel`) são cópias independentes
3. **NÃO mexa** nas rotas do professor: `/workstation/teacher/` permanece intacto
4. **PRESERVE** o design visual (glassmorphism, dark mode, tokens Tailwind existentes)
5. **O `useSearchParams()`** em Next.js App Router requer `<Suspense>` — se o build falhar por isso, envolva o bloco correspondente
6. **Cor do botão News = âmbar** (`bg-amber-500`) — consistente com o ícone de jornal
7. **Cor do botão Profile = violeta** (`bg-violet-600`) — distinto do ciano do Mural

---

## ÁRVORE DE ARQUIVOS MODIFICADOS (RESUMO)

```
zaeon-os/
├── components/
│   ├── main/
│   │   └── navbar.tsx                    ← MODIFICADO (remove link Workstation)
│   ├── onboard/
│   │   └── ResearchRoomTour.tsx          ← MODIFICADO (+2 passos, mural-teaser atualizado)
│   └── research/                         ← NOVA PASTA
│       ├── NewsPanel.tsx                 ← NOVO (extraído de lounge/news/page.tsx)
│       ├── ProfilePanel.tsx              ← NOVO (extraído de lounge/profile/page.tsx)
│       └── MiniTourToast.tsx             ← NOVO (toast contextual first-visit)
├── app/
│   ├── research-lab/
│   │   └── page.tsx                      ← MODIFICADO (tabs, handleTabChange, ?tab= param)
│   └── workstation/
│       └── page.tsx                      ← MODIFICADO (redirect alunos → /research-lab?tab=profile)
```

---

## NOTAS FINAIS PARA O AGENTE CLAUDE CODE

1. **Ralph loop obrigatório:** sempre leia o arquivo completo antes de editar. Não edite por memória.
2. **Ordem de implementação:** Passo 2 (novos componentes) → Passo 3–6 (research-lab) → Passo 7 (navbar) → Passo 8–9 (tour + toast) → Passo 10 (redirect) → Passo 11 (build) → Passo 12 (PR).
3. **Sub-componentes do NewsPanel:** `LoupeText` e `NewsCard` são internos — não exporte.
4. **Sub-componentes do ProfilePanel:** `StringLine`, `FullWidthChart`, `HabitMatrix`, `SideModules`, `PeopleStream` são internos — não exporte.
5. **MiniTourToast** é um componente novo — crie o arquivo do zero com o código exato do Passo 9b.
6. **O `handleTabChange`** substitui todos os `onClick={() => setActiveTab(...)}` dos botões News e Profile. Os botões Editor e Mural podem manter `setActiveTab` direto (sem mini-tour).
7. Se o **build falhar por `useSearchParams`**, envolva assim:
   ```tsx
   import { Suspense } from "react";
   // ...
   <Suspense fallback={null}>
     <TabParamReader onTab={setActiveTab} />
   </Suspense>
   ```
   Onde `TabParamReader` é um micro-componente que só faz o `useSearchParams`.
8. O `ProfilePanel` usa `useSession()` — isso é intencional e não causa erro desde que o `SessionProvider` já esteja no layout raiz (está, confirmado em `src/providers/SessionProvider.tsx`).
