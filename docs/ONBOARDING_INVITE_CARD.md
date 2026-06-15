# Onboarding / Convite — Card-first (2026-06-15)

## Diagnóstico do fluxo antigo
- Convite vivia na **navbar** (`InviteButton`, só logado) → gera código pessoal (3 usos) +
  link `/convite?code=XXX` (`/api/convite/meu-codigo`).
- Quem abria o link caía em `/convite` → `ConviteFlow`: **código → IA conversacional**
  (`ConviteAgent`) → finalizar com Google. O `MenuNavigation` também entrava em modo chat.
- Funcionava, mas a IA era **porta única** num passo que é um formulário curto — fricção e
  pontos de falha (latência, extração). Mês grátis acadêmico já existia (`/api/trial/edu/*`).

## O que mudou
1. **Card-first (`components/convite/InviteCard.tsx`).** Cartão "Você foi selecionado(a)",
   responsivo: **horizontal no desktop** (hero à esquerda + form à direita) e **vertical no
   mobile**. Cores das aulas (roxo→ciano), animações leves (shimmer, glow, pulse). Coleta nome,
   idade, curso/área, papel (estudante/professor) e **universidade** (seletor com busca sobre o
   dataset). Aviso **suave** do mês grátis. Botão discreto "prefiro conversar com a IA" mantém o
   caminho conversacional como **opcional**.
2. **`ConviteFlow`** agora é card-first: `card` → (opcional `chat`) → `google`. Reusa
   `salvar-pendente` e `GoogleFinishStep` (contratos intactos).
3. **Mês grátis ligado** reusando `/api/trial/edu/request` + `verify`: quando o usuário já está
   autenticado, o card pede e confirma o código inline; para o convidado novo (ainda sem login),
   coleta o e-mail acadêmico, guarda a intenção e o benefício é concedido após o login.
4. **Convite saiu da navbar → menu inicial.** `InviteButton` removido de `components/main/navbar.tsx`
   e montado no `MenuNavigation` (menu pós-login).

## Dataset de universidades (`constants/universities.ts`)
- **148 instituições**: universidades **federais** + **estaduais** + **institutos federais**
  (IFs/CEFET). Campos novos: `kind` (federal | estadual | instituto_federal) e `domain` (para
  casar o e-mail acadêmico). Helpers: `BRAZILIAN_UNIVERSITIES`, `UNIVERSITY_BY_DOMAIN`,
  `findUniversityByEmail()`, `UNIVERSITY_KIND_LABEL`. `BRAZILIAN_FEDERAL_UNIVERSITIES` mantido como
  alias (compat com `UniversityModal`/`OnboardAgent`/`WelcomeScreen`).
- A elegibilidade do mês grátis continua tolerante via `lib/eduEligibility.ts` (padrões `.edu.br`/
  `uf*.br`), então mesmo instituições fora da lista entram pelo padrão.

## Pendências / próximos passos
- Concessão automática do mês grátis pós-login para o convidado novo (hoje: promessa + claim).
- Logos reais em `/assets/universities/<id>.png` (há fallback ui-avatars).
- Opcional: apresentar o convite do "compartilhador" como card cheio (hoje é o popover do
  `InviteButton`, agora no menu).
- Conferir cidades/sedes pontuais do dataset se for exibir publicamente.
