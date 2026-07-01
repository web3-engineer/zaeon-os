# Handoff p/ agente — Reativar "ver código de convite" no menu (visível)

> **Tipo:** correção cirúrgica de regressão de UI. **Não** refatore nada além do necessário.
> **Stack:** Next.js (App Router) + React + Tailwind + NextAuth. Repo: `zaeon-os`.
> **Idioma das respostas ao usuário:** português.

## 1. Objetivo (em uma frase)

Fazer o usuário logado **ver o próprio código de convite** (ex.: `AB12CD`) + **copiar o link de compartilhamento** direto pelo **menu**, de forma **visível** — não escondido e não mandando pra página errada.

## 2. O que está acontecendo hoje (a regressão)

Toda a máquina do convite **existe e funciona** — só foi **desconectada da UI do menu**:

- **`components/sub/InviteButton.tsx`** — componente pronto que, ao clicar, chama `GET /api/convite/meu-codigo` e abre um popover mostrando: o **código**, **quantos usos restam** (`remaining/maxUses`) e o botão **"Copiar link de convite"** (`/convite?code=XXXX`). Tem `variant="menu"` feito sob medida pra ser um item de menu. **Funciona.**
- **`app/api/convite/meu-codigo/route.ts`** — gera/retorna o código pessoal (3 usos) e o `link`. **Funciona.**

O problema está em **`components/sub/MenuNavigation.tsx`**:

1. `InviteButton` é **importado (linha ~15) mas NUNCA renderizado** — import morto.
2. A única porta de convite no menu é um card **enterrado dentro do submenu "Opções"** (≈ linhas 630-638) que faz `router.push("/convite")`.
3. **`/convite` é a página de RESGATE** (`app/convite/page.tsx` → `ConviteFlow`, _"Entre com seu código de convite para acessar o Zaeon"_) — ela é pra quem **recebeu** um convite digitar o código. Mandar um usuário **já logado** pra lá **não mostra o código dele pra compartilhar** → é o bug que o usuário relatou.
4. Comentários no código confirmam que foi removido de propósito: _"Convite saiu daqui... agora vive SÓ aqui nas Opções"_.

## 3. A correção

Em **`components/sub/MenuNavigation.tsx`**, no bloco do **menu autenticado** (`status === "authenticated"`):

1. **Renderizar `<InviteButton variant="menu" />`** num ponto **visível** do menu principal — recomendado: logo **acima do item "Opções"** (≈ linha 750, onde os módulos Estudos/Pesquisas/Projetos/Lounge são listados), pra ficar no mesmo nível visual dos módulos. NÃO deixar só dentro de "Opções".
2. **Remover o card atual** que faz `router.push("/convite")` (≈ linhas 630-638, dentro de Opções) **OU** trocá-lo pelo próprio `<InviteButton variant="menu" />`. O importante: **não pode haver dois "Convidar amigos"** e **nenhum** deles pode levar o logado pra página de resgate `/convite`. O destino certo é o **popover com o código** (que o `InviteButton` já faz).
3. **Não tocar** em `/convite` / `ConviteFlow` — ela continua sendo o fluxo de resgate de quem chega por link. Só o usuário **deslogado** vai pra lá ("Tenho um convite", ≈ linha 448) — **preserve isso**.
4. Limpar o import morto só se ele ficar realmente sem uso (se você renderizar o `InviteButton`, o import passa a ser usado — mantenha).

## 4. ⚠️ Gotcha de posicionamento (verifique!)

O popover do `InviteButton` usa `className="absolute right-0 top-full ..."` com `z-[200]`. Dentro do painel do menu, confira se ele **não é cortado** por `overflow-hidden`/scroll do container do menu. Se for cortado:

- a opção mais simples é garantir `overflow-visible` no container imediato do botão, **ou**
- ajustar a ancoragem do popover (ex.: abrir pra cima/lado) **só** se necessário.

Mexa nisso **apenas** se reproduzir o corte — não otimize às cegas.

## 5. Critério de pronto (teste manual)

1. Logado, abrir o menu → existe um item **"Convidar amigos"** visível (não enterrado em Opções).
2. Clicar → abre o popover mostrando **o código** (ex.: `AB12CD`), **"X/3 restantes"** e **"Copiar link de convite"**.
3. "Copiar link" copia `https://<origin>/convite?code=XXXX` (cai no onboarding de quem recebe).
4. Quando `remaining <= 0`, o botão fica desabilitado e aparece o aviso de limite (comportamento já existente no componente — só confirmar).
5. O popover **não** aparece cortado pelas bordas do menu.
6. Deslogado: o caminho "Tenho um convite" → `/convite` continua intacto.

## 6. Sanidade técnica

- Sem mocks: a API `/api/convite/meu-codigo` é real (Prisma + `lib/invite-codes`).
- Rode um type-check rápido nos arquivos tocados (evite build completo se for lento).
- Mudança deve caber em **1 arquivo** (`MenuNavigation.tsx`); o `InviteButton` e a API **não precisam** de alteração — só se o gotcha do §4 exigir um ajuste mínimo de overflow no menu.

## 7. Arquivos relevantes (mapa rápido)

| Arquivo | Papel |
|---|---|
| `components/sub/MenuNavigation.tsx` | **Onde mexer** — renderizar o InviteButton visível, remover o card que vai pra `/convite` |
| `components/sub/InviteButton.tsx` | Componente pronto (popover com código + copiar link). `variant="menu"` |
| `app/api/convite/meu-codigo/route.ts` | API que gera/retorna o código pessoal (3 usos) + link |
| `app/convite/page.tsx` → `components/convite/ConviteFlow.tsx` | Página de **resgate** (NÃO é pra compartilhar) — não quebrar |
