# Handoff LOTE 8 — Aba de Aula: trocar Livraria/backpack pelo módulo de AULAS GERADAS

> Para o **Claude Code**. Branch própria (`feat/aba-aula-lote8`). Toca `components/sub/ClassesView.tsx`,
> `components/aulas/StudentAulasModule.tsx`, `app/api/aulas/[id]/route.ts` (+ `types.ts` se preciso).
> **Rebase com a main antes** (Lote 4 também mexe em ClassesView). Confirme cada trecho antes de editar.

## Regras DURAS
- Branch + PR. Nunca `git add -A`. Push trava (proxy ISP) → deixe commit pronto e avise o Martinez.
- Sem segredos, sem SSH. macOS sem `python` (use `python3`). `npx tsc --noEmit` no fim; só erros novos.

## Nota de contexto
Isto **substitui** a decisão antiga do Lote 1/4 de "renomear backpack → Acesse outros modelos": agora
o backpack **sai de vez**. A autoria generativa da aula (canvas + "/" + Studio) é o Lote 4 PARTE D;
**este Lote 8 é a LISTA/biblioteca de aulas geradas** que ocupa o espaço da antiga Livraria.

---

## 1. Remover Livraria + backpack + upload antigo (em `components/sub/ClassesView.tsx`)
- **Livraria** (~933-957): o `<div>` "LIVRARIA + PLUGINS" — painel com `storedPdfs`, o `onDrop`/
  `handleLibraryUpload` (input file `.pdf`) e o bloco "Plugins / Em breve". **Remover o painel
  inteiro**, incluindo o nome "Livraria" e a **opção antiga de upload de arquivo**. Limpar estados/
  handlers órfãos (`storedPdfs`, `handleLibraryUpload`, `handleDeletePdf`) se não usados em outro lugar.
- **Backpack** (~1031-1148): o bloco "BACKPACK MINIMALISTA" (`userModules.map`, "Acesse outros
  modelos"/"Personal Backpack", upload de arquivos, AI Nodes). **Remover**. Limpar `userModules` e
  handlers (`handleFileUpload`, `handleAddLink`, `deleteUserItem`) se órfãos.
- Manter a **estrutura** desejada (Lote 4): **chat → relógio/agenda** continuam; o espaço que era
  Livraria/backpack passa a ser o **módulo de aulas** (item 2), e o **módulo de criação** (Lote 4 D)
  fica abaixo. Ajustar o layout/flex pra não deixar buraco.

## 2. O espaço vira o MÓDULO DE AULAS GERADAS (play / visto / nova / apagar)
**Bom ponto de partida:** `components/aulas/StudentAulasModule.tsx` **já** faz quase tudo:
- lista as aulas de `/api/aulas` (a rota já devolve as aulas certas por papel: **professor** vê as
  dele, **aluno** vê as recebidas — `app/api/aulas/route.ts`);
- estados **nova** (destaque ciano + ✨), **em andamento**, **concluída** (✓) — exatamente o "marca
  se já foi vista" e "nova mais destacada" que o Martinez pediu;
- **play abre** o módulo inline (vídeo YouTube, conteúdo markdown, quiz texto/voz, nota).
**Rota:**
1. **Montar o `StudentAulasModule` no espaço liberado** do `ClassesView` (no lugar da Livraria/
   backpack). Se hoje ele já é renderizado mais abaixo, mover/garantir que é o módulo principal dessa
   área. (Nome de exibição: "Minhas aulas" / "Aulas" — sem "Livraria".)
2. **ADICIONAR: apagar aula.** A rota **`DELETE /api/aulas/[id]` JÁ EXISTE**
   (`app/api/aulas/[id]/route.ts:93`, teacher-only — já usada pelo `AulaAuthoringPanel`). Então o
   backend está pronto; falta só a **UI no módulo de aulas** (`StudentAulasModule`):
   - botão de **apagar** num card (ícone lixeira no hover, canto), `DELETE /api/aulas/${id}`, com
     confirm leve (estética Zaeon), removendo da lista ao confirmar. Só pro papel que pode apagar
     (professor; o aluno não apaga aula recebida — esconder o botão pra aluno).
   - ⚠️ Apagar é destrutivo: confirmar antes. (Se o DELETE não limpar quiz/perguntas/progresso
     associados, completar a limpeza na rota.)
3. **"Visto":** o estado já existe (`progressStatus`/`progressByAula`: new → in_progress →
   completed). Garantir que **abrir** uma aula marca como vista (já faz: `open()` seta in_progress).
   Aula nunca aberta = **nova** (destaque). Reforçar visual: nova com glow/borda ciano (já tem),
   vista sem destaque, concluída com ✓.
4. **Papel:** no `ClassesView`, este módulo de aulas vale pros dois papéis (o `/api/aulas` resolve o
   conteúdo). Para o **professor**, o "play" abre a aula que ele gerou (preview); o **criar** nova
   aula é o canvas do Lote 4 D (abaixo). Para o **aluno**, é a experiência de cursar (já existe).

---

# Verificação final
1. `npx tsc --noEmit` — zero erros novos (cuidado com estados/handlers removidos que ainda sejam
   referenciados).
2. Smoke (PR): aba de Aula **sem** Livraria/backpack/upload antigo; módulo de aulas no lugar; aula
   **nova** destacada, abrir marca como **vista**, **apagar** funciona (com confirm) e some da lista;
   estrutura chat → relógio → aulas → (criação Lote 4 D) coerente.
3. Git: branch `feat/aba-aula-lote8` + PR. Nunca `git add -A`.

# Arquivos
- `components/sub/ClassesView.tsx` (remover Livraria/backpack/upload; montar o módulo de aulas).
- `components/aulas/StudentAulasModule.tsx` (botão apagar + reforço visual visto/nova).
- `app/api/aulas/[id]/route.ts` (rota DELETE teacher-only) + `components/aulas/types.ts` se preciso.
