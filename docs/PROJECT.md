# ZAEON OS — Documento de Arquitetura & Guia de Evolução

> **Uso:** Este documento é a referência central para decisões de produto e técnicas. Leia-o antes de qualquer sessão de desenvolvimento.

---

## 1. Visão Geral

**Zaeon OS** é um Sistema Operacional Acadêmico — workspace integrado para estudantes, professores e pesquisadores, com IA generativa (Gemini 2.0 Flash via Vertex AI), visualização científica 3D (Three.js), rede social acadêmica e infra Web3 para tokenização de propriedade intelectual.

**Stack principal:**

| Camada | Tecnologia |
|--------|-----------|
| Framework | Next.js 14 (App Router) |
| Linguagem | TypeScript 5 |
| Estilo | Tailwind CSS 3 + Framer Motion |
| 3D | Three.js r160, @react-three/fiber, @react-three/drei |
| IA | Google Gemini 2.0 Flash (Vertex AI) + Groq (fallback) |
| Banco | MongoDB Atlas + Prisma 6 |
| Auth | NextAuth.js 4 (Google OAuth) |
| Tempo real | Pusher + Socket.io |
| Cache | Redis (Upstash) |
| Web3 | Viem, Wagmi, Ethers.js |
| Deploy | Custom Node.js server (`server.js`) |

---

## 2. Identidade Visual (Design System)

> **REGRA:** Nunca alterar estas definições sem revisão explícita. Toda nova página deve seguir estes tokens.

### 2.1 Cores Base

```
Dark mode bg: #030014   (deep space indigo — padrão de toda a plataforma)
Light mode bg: #f8fafc  (slate-50)
Foreground dark: #ffffff
Foreground light: #0f172a
```

### 2.2 Cores por Sala

| Sala | Primária | Destaque | Fundo dark |
|------|---------|--------|------------|
| Bio | `emerald-400` | `#22c55e` | `bg-emerald-500/10` |
| Med | `rose-400` | `#f87171` | `bg-rose-500/10` |
| Quantic | `indigo-400` | `#818cf8` | `bg-indigo-500/10` |
| Cyber | `cyan-400` | `#22d3ee` | `bg-cyan-500/10` |
| Humanities | `amber-400` | `#f59e0b` | `bg-amber-500/10` |
| Research Lab | `cyan-400 → purple-600` (gradiente) | — | `bg-[#030014]` |

### 2.3 Tipografia

| Variável CSS | Fonte | Uso |
|---|---|---|
| `--font-space` | Space Grotesk | Texto geral, headings |
| `--font-code` | JetBrains Mono | Código, dados técnicos |
| `--font-outfit` | Outfit | Hero, display |
| `.cursive` | Cedarville Cursive | Acentos decorativos |

### 2.4 Padrão Glass Card (usar em todos os cards novos)

```css
/* Dark */
bg-white/5 dark:bg-black/20
backdrop-blur-2xl
border border-white/60 dark:border-white/10
shadow-[0_8px_30px_rgb(0,0,0,0.2)]
rounded-[2rem]
```

### 2.5 Utilitários Globais CSS

| Classe | Efeito |
|--------|--------|
| `.cursive` | Cedarville Cursive font |
| `.Welcome-text` | Gradient text (violet → blue) |
| `.Welcome-box` | Pill glassmorphism |
| `.button-primary` | Botão CTA roxo com brilho |
| `.scrollbar-hidden` | Remove scrollbar |

### 2.6 Temas de Gênero (Workstation)

| Gênero | Tema | Bg Dark |
|--------|------|---------|
| Feminino | Rose / Fuchsia | `bg-[#1a0a13]` |
| Masculino | Blue / Cyan | `bg-[#050a1f]` |
| Default / LGBTQI+ | Slate / Cyan | `bg-[#030014]` |

---

## 3. Arquitetura de Rotas

### 3.1 Páginas Públicas

| Rota | Arquivo | Descrição |
|------|---------|-----------|
| `/` | `app/page.tsx` | Landing page — IntroOverlay + HeroPage + Encryption + StudyRooms |
| `/about` | `app/about/page.tsx` | Sobre a Zaeon — CyberTitle + TextBlocks + MoleculeSection |
| `/about/about-us` | `app/about/about-us/page.tsx` | Página detalhada da equipe |
| `/news` | `app/news/page.tsx` | Hub de notícias |
| `/news/articles` | `app/news/articles/page.tsx` | Listagem de artigos |
| `/plugin-store` | `app/plugin-store/page.tsx` | Marketplace de plugins |
| `/join/[token]` | `app/join/[token]/page.tsx` | Aceite de convite do professor |

### 3.2 Salas de Estudo

Cada sala tem a estrutura `/study-rooms/[sala]/` com subrotas:

| Subrota | Conteúdo |
|---------|----------|
| `page.tsx` | Entrada da sala (hub visual) |
| `main-room/classes` | Aulas |
| `main-room/community` | Feed comunitário da sala |
| `main-room/exams` | Provas e avaliações |
| `main-room/lessons` | Lições |
| `main-room/projects` | Projetos |
| `main-room/researches` | Pesquisas da sala |
| `main-room/profile` | Perfil dentro da sala |
| `main-room/news` | Notícias da sala |

**Salas existentes:** `bio`, `cyber`, `humanities`, `lounge`, `med`, `quantic`

> A sala `lounge` é o hub social — tem feed global, chat ao vivo, e a `FeedBrasil.tsx`.

### 3.3 Workstation (Área Privada)

| Rota | Arquivo | Quem acessa |
|------|---------|-------------|
| `/workstation` | `app/workstation/page.tsx` | Estudante — RPG profile |
| `/workstation/[id]` | `app/workstation/[id]/page.tsx` | Visita perfil de outro usuário |
| `/workstation/admin` | `app/workstation/admin/page.tsx` | Admin — dashboard |
| `/workstation/profiles` | `app/workstation/profiles/NetworkMural.tsx` | Mural de conexões |
| `/workstation/teacher/[module]` | `app/workstation/teacher/` | Professor — módulos |
| `/workstation/student/[module]` | `app/workstation/student/` | Estudante — módulos |

**Módulos do Professor:**

| Módulo | Arquivo | Função |
|--------|---------|--------|
| WorkArea | `WorkAreaContent.tsx` | Gerador de tarefas/provas via IA |
| AgenticArea | `AgenticAreaContent.tsx` | Aura + BioSim3D |
| ResearchArea | `ResearchAreaContent.tsx` | Área de pesquisa do professor |
| Lounge | `LoungeContent.tsx` | Social do professor |
| Finances | `FinancesContent.tsx` | Financeiro (placeholder) |

### 3.4 Research Lab

| Rota | Arquivo | Função |
|------|---------|--------|
| `/research-lab` | `app/research-lab/page.tsx` | Laboratório principal — Editor + Mural |
| `/research-lab/collab` | `app/research-lab/collab/page.tsx` | Colaboração em pesquisa |

---

## 4. API Routes

### 4.1 IA & Agentes

| Método | Rota | Função | Agent/Modelo |
|--------|------|---------|--------------|
| POST | `/api/ai/chat` | Chat multiagente | Gemini 2.0 Flash (Vertex AI) |
| POST | `/api/ai/chat/messages` | Mensagens em tempo real (Pusher) | — |
| POST | `/api/ai/generate-document` | Geração de homework/prova | Vertex AI |
| POST | `/api/ai/agent-search` | Busca por agentes | — |
| POST | `/api/agentic/biosim` | BioSim3D — Gemini → SceneDescriptor | Gemini |
| POST | `/api/agentic/biosim/pdb` | PDB molecular data | — |
| POST | `/api/agentic/biosim/pubchem` | PubChem data | — |
| POST | `/api/agentic/biosim/sessions` | Sessões BioSim | — |
| POST | `/api/agentic/biosim/annotations` | Anotações 3D | — |
| POST | `/api/agentic/codelab` | Code Lab execution | — |
| POST | `/api/agentic/quantum` | Quantum Lab | — |
| POST | `/api/gemini` | Streaming Gemini direto | Gemini |

**Personas de Agente** (definidas em `/api/ai/chat/route.ts`):

| Agente | Papel |
|--------|-------|
| `zenita` | Assistente acadêmica — gerencia agenda (function calling) |
| `aura` | Orquestradora de pesquisa — analisa PDFs e orienta |
| `scholar` | Especialista em citações ABNT |
| `scribe` | Escritor/revisor acadêmico sênior |
| `examiner` | Inquisidor acadêmico — cria e corrige provas |
| `zaeon` | Colega Neural — suporte e navegação da plataforma |

### 4.2 Usuário & Auth

| Método | Rota | Função |
|--------|------|---------|
| GET/POST | `/api/auth/[...nextauth]` | NextAuth (Google OAuth) |
| POST | `/api/auth/guest-register` | Registro de convidado |
| POST | `/api/auth/onboarding` | Dados de onboarding |
| GET/PATCH | `/api/user/update` | Atualiza perfil |
| PATCH | `/api/user/avatar` | Upload avatar (base64 comprimido) |
| GET | `/api/user/photos` | Fotos do usuário |
| GET | `/api/user/profile/[id]` | Perfil público |
| GET/PUT | `/api/user-space` | Estado persistente do workspace |

### 4.3 Social & Conteúdo

| Método | Rota | Função |
|--------|------|---------|
| GET/POST | `/api/feed` | Feed geral |
| GET/POST | `/api/posts` | Posts das salas |
| POST | `/api/posts/like` | Like em post |
| POST | `/api/posts/comment` | Comentar em post |
| GET/POST | `/api/network` | Rede social |
| POST | `/api/network/request` | Enviar pedido de conexão |
| POST | `/api/network/respond` | Responder pedido |
| GET | `/api/network/friends` | Listar conexões |
| GET/POST | `/api/news` | Notícias |
| GET/POST | `/api/citations/save` | Salvar citações ABNT |
| GET/POST | `/api/research` | Pesquisas |

### 4.4 Professor & Estudante

| Método | Rota | Função |
|--------|------|---------|
| GET/POST | `/api/teacher/documents` | Documentos do professor |
| POST | `/api/teacher/invite` | Convidar aluno |
| GET | `/api/teacher/students` | Listar alunos |
| POST | `/api/teacher/links` | Links do professor |
| GET | `/api/teacher/search-students` | Buscar alunos |
| POST | `/api/student/join` | Aluno aceita convite |
| POST | `/api/student/confirm-join` | Confirmação |
| GET | `/api/student/tasks` | Tarefas do aluno |

### 4.5 Sistema

| Método | Rota | Função |
|--------|------|---------|
| POST | `/api/onboarding-extract` | Extrai dados do onboarding via IA |
| GET/POST | `/api/workspace` | Estado do workspace |
| GET/POST | `/api/plugins` | Plugin store |
| POST | `/api/cyber/comment` | Comentários da sala cyber |
| GET | `/api/admin` | Dashboard admin |

---

## 5. Modelos de Dados (MongoDB via Prisma)

### User
```
id, name, email, image
course, bio, age, gender, countryCode, role, academicLevel
level, streak, xp, skills (Json: writing/focus/collab/participation)
walletAddress, identityId, kycStatus
→ accounts, sessions, posts, sentMessages, sentRequests, teacherDocuments
```

### UserSpaceData (1:1 com User)
```
userId, layout (Json), settings (Json), chatHistory (Json)
schedule (Json), stickyNote, objectives (Json)
```

### Post
```
id, title, content, tags[], images[], room
userId → User, comments[], likes[]
```

### TeacherDocument
```
teacherId, title, type (tarefa|prova), subject
questions (Json), headerImage, status, assignedTo[]
```

### TeacherStudent
```
teacherId, studentId — relação N:N sem approval
```

### ConnectionRequest
```
senderId, receiverId, message, status (PENDING|ACCEPTED|REJECTED)
```

### Message
```
senderId, receiverId, text
```

### Outros modelos
`Plugin`, `Comment`, `NewsPost`, `PersonalPhoto`, `SystemLog`, `SystemSetting`

---

## 6. BioSim 3D Engine

### Fluxo

```
Prompt/Preset → POST /api/agentic/biosim → Gemini → SceneDescriptor JSON
→ buildVoxels(mode, params) → VoxelBlock[]
→ VoxelCanvas.tsx (Three.js InstancedMesh + OrbitControls)
```

### Geradores de Voxel

| Arquivo | Estruturas |
|---------|-----------|
| `dna.ts` | DNA helix, RNA strand |
| `molecule.ts` | H₂O, CO₂, CH₄, adenina, glicose, NaCl |
| `cell.ts` | Célula vegetal, animal, bacteria |
| `plant.ts` | Árvore, flor, samambaia, semente, fungo, micélio |
| `animal.ts` | Cavalo, cão, humano, peixe |
| `quantum.ts` | Orbitais 1s, 2p, 3d |
| `math.ts` | Ripple, sela, paraboloide, toro |
| `protein.ts` | Alfa-hélice proteica |

### SceneDescriptor JSON

```typescript
interface SceneDescriptor {
  renderMode: 'dna'|'rna'|'molecule'|'crystal'|'cell'|'plant'|
              'fungus'|'animal'|'quantum'|'atom'|'math'|'protein';
  title: string;
  description: string;
  hint?: string;
  parameters: SceneParameters;
  accentColor?: string;
  backgroundColor?: string;
}
```

---

## 7. Componentes Globais

### Layout (`app/layout.tsx`)

Providers aninhados:
```
GlobalClickSound (áudio de clique)
└── ThemeProvider (next-themes, default: dark)
    └── AuthProvider (NextAuth SessionProvider)
        └── Web3Provider (Wagmi)
            ├── Navbar (persistente)
            ├── {children}
            └── LoungeChatWidget (chat flutuante global)
```

### Componentes `components/main/`

| Arquivo | Função |
|---------|--------|
| `navbar.tsx` | Barra de navegação global |
| `star-background.tsx` | MatrixRain / particle background |
| `OnboardModal.tsx` | Modal de onboarding (primeira vez) |
| `ParticleSystem.tsx` | Sistema de partículas da landing |
| `footer.tsx` | Rodapé global |
| `GlobalClickSound.tsx` | Som de feedback de clique |
| `hero.tsx` | Hero section |
| `encryption.tsx` | Seção animada "Encryption" |

### Componentes `components/sub/`

| Arquivo | Função |
|---------|--------|
| `LoungeChatWidget.tsx` | Widget de chat global flutuante (Pusher) |
| `MenuNavigation.tsx` | Navegação das salas de estudo |
| `HeroSceneController.tsx` | Controller do hero |
| `LoungeEarth.tsx` | Globo 3D do Lounge |
| `hero-content.tsx` | Conteúdo do hero |
| `ClassesView.tsx` | View de aulas |
| `ThemeToggle.tsx` | Toggle dark/light |

---

## 8. Internacionalização (i18n)

- **Biblioteca:** `i18next` + `react-i18next` + `i18next-browser-languagedetector`
- **Arquivos de tradução:** `public/locales/[lang]/common.json`
- **Idiomas:** `pt`, `en`, `es`, `fr`, `de`, `zh`, `ko`
- **Config:** `src/i18n.ts`

---

## 9. Web3

- **Provider:** `Web3Context.tsx` via Wagmi
- **Contratos:** `src/config/contracts.ts`
- **Wallet:** Wepin connector (`@wepin/wagmi-connector`)
- **IPFS:** `src/utils/ipfs.ts`
- **Status atual:** Infra montada, integração de IP tokenization a ser implementada

---

## 10. Servidor

O projeto usa um servidor Node.js customizado (`server.js`) que:
1. Inicia o Next.js
2. Adiciona suporte a **Socket.io** para real-time
3. Convive com o **Pusher** para mensagens

```bash
npm run dev    # → node server.js (dev)
npm run start  # → NODE_ENV=production node server.js
```

---

## 11. Backend Express (Separado)

Pasta `backend/` — servidor Express independente (TypeScript compilado para `dist/`).

| Controller | Função |
|-----------|--------|
| `user.controller.ts` | Gestão de usuários |
| `ai.controller.ts` | Endpoints de IA |
| `agent.controller.ts` | Gestão de agentes |

**Services:** `feed`, `log`, `news`, `post`, `system`, `user`, `workspace`

> **Nota:** O backend Express não está ativo no fluxo principal da app. As APIs do Next.js (App Router) são o ponto de entrada real. O Express pode ser legado ou ser usado para workers separados.

---

## 12. Estado Atual das Páginas

| Página | Status | Observações |
|--------|--------|-------------|
| Landing `/` | ✅ Pronto | IntroOverlay + Hero + Features + StudyRooms |
| `/about` | ✅ Pronto | CyberTitle + MoleculeSection — visual forte |
| `/about/about-us` | ✅ Pronto | Página da equipe |
| `/research-lab` | ✅ Funcional | Editor + Mural + Agentes AI + PDF |
| `/workstation` | ✅ Funcional | RPG profile estudante |
| `/workstation/teacher/*` | ✅ Funcional | WorkArea, AgenticArea, etc. |
| `/study-rooms/*` | ⚠️ Parcial | Hub funcional, salas internas variadas |
| `/plugin-store` | ⚠️ Placeholder | UI existe, lógica parcial |
| `/news` | ✅ Funcional | Listagem de artigos |
| `/workstation/admin` | ⚠️ Parcial | Dashboard básico |

---

## 13. Próximas Mudanças — Guia de Execução

> Esta seção é o mapa de trabalho. Cada item deve ser **confirmado com o usuário** antes de implementar.

### 13.1 Páginas a Alterar (mantendo estilo visual)

#### A. `/about` — Refatoração de Conteúdo
- **O que é:** Página pública sobre a Zaeon — posicionamento, proposta de valor
- **Estilo atual:** CyberTitle com scramble text (kanji), TextBlocks glassmorphism, MoleculeSection com FlowBond animado
- **O que manter:** Todo o sistema de animação (scramble, parallax, FlowBond), bg `#030014`, tipografia mono
- **O que mudar:** `[ A DEFINIR — aguardando instrução ]`

#### B. `/research-lab` — Melhoria de UX
- **O que é:** Laboratório de pesquisa — Editor de documentos + Mural + 3 agentes AI (Aura, Scribe, Examiner)
- **Estilo atual:** Split layout 50/50, sidebar ultra-fina, cards com `rounded-[32px]`, bg slate/white
- **O que manter:** Estrutura de tabs Editor/Mural, sistema de agentes, integração Gemini
- **O que mudar:** `[ A DEFINIR — aguardando instrução ]`

#### C. Outras Páginas
- `[ A DEFINIR conforme conversa ]`

### 13.2 Novas Features Possíveis

| Feature | Complexidade | Dependências |
|---------|-------------|-------------|
| IP tokenization via Web3 | Alta | `contracts.ts`, VERY Network |
| Plugin store funcional | Média | `/api/plugins`, UI nova |
| Dashboard admin completo | Média | `/api/admin` |
| Sala cyber com terminal | Alta | `CodeLabModule.tsx` |
| Gamification ativa | Média | Skills XP system no User model |
| Notificações em tempo real | Média | Pusher channels já configurado |

### 13.3 Regras de Implementação

1. **Não quebrar o dark mode.** Todo novo componente precisa de variantes `dark:`.
2. **Manter `rounded-[2rem]` ou `rounded-[32px]`** nos cards — é o DNA visual.
3. **Usar `backdrop-blur-xl`** em todos os painéis flutuantes.
4. **Framer Motion obrigatório** para qualquer animação de entrada (`initial/animate/whileInView`).
5. **Cores por contexto:** usar os tokens de cor da sala correspondente, nunca hardcoded genérico.
6. **`"use client"`** apenas onde necessário — preferir Server Components para dados estáticos.
7. **Não duplicar lógica de agente** — sempre usar `/api/ai/chat` com o `agent` correto.
8. **IDs seguros:** usar `crypto.randomUUID()` com fallback (`generateSafeId()`).

---

## 14. Fluxo de Desenvolvimento Recomendado

```
1. Identificar a página/feature a alterar
2. Ler o arquivo atual (Read tool)
3. Confirmar quais seções mudar vs. preservar
4. Implementar preservando o estilo visual (ver Seção 2)
5. Verificar dark mode e responsividade
6. Commit com descrição clara
```

---

## 15. Variáveis de Ambiente Necessárias

```bash
DATABASE_URL="mongodb+srv://..."
NEXTAUTH_SECRET="..."
NEXTAUTH_URL="http://localhost:3000"
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."
GOOGLE_CREDENTIALS='{"project_id":"...","client_email":"...","private_key":"..."}'
GOOGLE_PROJECT_ID="your-gcp-project"
GOOGLE_LOCATION="us-central1"
NEXT_PUBLIC_PUSHER_KEY="..."
PUSHER_APP_ID="..."
PUSHER_SECRET="..."
PUSHER_CLUSTER="..."
UPSTASH_REDIS_REST_URL="..."
UPSTASH_REDIS_REST_TOKEN="..."
GROQ_API_KEY="..."  # fallback LLM
```

---

*Última atualização: 2026-05-24 — gerado por análise automática do codebase.*
