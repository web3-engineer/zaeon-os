# Perfis (papéis) + Gating do Zaeon Code

Data: 2026-06-14 · Escopo: quem pode usar o **Zaeon Code** (sala Projetos) e como
ele aparece na **Plugin Store**.

## Papéis

- **Admin supremo (super admin):** pode tudo, inclusive usar o Zaeon Code,
  independente do curso. Definido em dois lugares (decisão: allowlist + role):
  - **Allowlist no código** — `lib/auth/roles.ts` → `SUPER_ADMINS`:
    `zaeondao@gmail.com` e `donmartinez@aluno.unilab.edu.br`. Funciona já, sem mexer no banco.
  - **Campo no banco** — `User.role === "super_admin"` (para promover outros pela UI no futuro).
  - Helpers: `isSuperAdminEmail`, `isSuperAdminRole`, `isSuperAdmin({email, role})`.

## Gate de acesso ao Zaeon Code

`lib/projects/access.ts`:
- **Ligado por padrão.** `PROJECTS_GATE_ENABLED = process.env.PROJECTS_COURSE_GATE !== "off"`.
  Para liberar todos (desligar o gate), set env `PROJECTS_COURSE_GATE=off`.
- **Ordem de decisão:** super admin → gate off → curso (match exato ou keyword de
  Computação/áreas correlatas) → senão, negado (fail-closed).
- `checkEligibility(course, ctx?)` e `assertEligibleOrThrow(course, ctx?)` agora aceitam
  `ctx = { email, role }` para o bypass de super admin. `canUseProjects({course,email,role})`
  é o helper de alto nível.

### Onde o gate é aplicado (defesa em profundidade)
- `POST /api/projects/agent` — `assertEligibleOrThrow(course, {email, role})` antes de gerar.
- `GET/POST /api/projects/github` — `getEligibleUser()` idem (commit/PR só para elegíveis).
- `GET /api/projects/access` — **novo**: retorna `{ authenticated, superAdmin, canUse, reason, course }`
  para o cliente (a Plugin Store) decidir a ativação. Sempre 200.

## Plugin Store (`app/plugin-store/page.tsx`)

- **Zaeon Code é um card/banner FIXO em destaque** (`ZAEON_CODE` no código, não vem do
  banco) — sempre o primeiro, com banner gradiente roxo→ciano, descrição e selo de estado.
- **Visível para todos.** O gating acontece na **ativação**:
  - super admin / curso elegível → `Abrir Zaeon Code` leva para `/research-lab?tab=projetos`.
  - demais → abre um **modal de elegibilidade** explicando que é exclusivo para Computação e
    áreas correlatas, com atalho "Ir para o Perfil" (ajustar curso).
- Selo no topo: **"Admin Supremo"** (roxo→ciano) quando `superAdmin`.
- Reformulação visual: seção "Em destaque" (hero) + "Todos os módulos" (categorias/busca/grid),
  estado vazio tratado.

## Como religar/ajustar
- Desligar o gate (todos entram): `PROJECTS_COURSE_GATE=off`.
- Adicionar curso elegível: editar `ELIGIBLE_COURSES` / `ELIGIBLE_KEYWORDS` em `access.ts`.
- Adicionar admin: somar e-mail em `SUPER_ADMINS` (roles.ts) ou setar `role="super_admin"` no banco.
- Próximo passo sugerido: UI admin para promover `role` e para editar o destaque do Zaeon Code.
