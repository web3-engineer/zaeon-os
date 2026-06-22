# Claude Code Prompt — Transição Liquid Glass de TODAS as Salas (research-lab → zaeon design system)

> **Superpowers mode ON. Ralph loop ativado. Autonomia máxima, interrupção humana mínima.**
> Agente: você tem autonomia para executar TODAS as fases abaixo de ponta a ponta sem pedir confirmação, **exceto** nos 3 pontos marcados com 🛑 `CHECKPOINT HUMANO`. Em tudo o mais, decida e prossiga.
> Stack: Next.js 14 (App Router), TypeScript, Tailwind, Framer Motion, NextAuth, Prisma, Gemini (`lib/ai/model.ts`).
> Branch: crie `feat/liquid-glass-rooms-transition` a partir do branch atual. Abra **um único PR** ao final.

---

## 0. FONTE DA VERDADE (leitura obrigatória ANTES de qualquer edição)

Estes arquivos definem o que é "padrão Zaeon". Nunca invente estilo — **derive** destes:

```
docs/superpowers/specs/2026-06-07-liquid-glass-style-reference.md   # ⭐ FONTE DA VERDADE do liquid glass (tokens exatos)
docs/superpowers/specs/2026-05-27-omega-scholar-research-lab-design.md
app/research-lab/page.tsx                                            # aba "pesquisa" = o gold standard visual a replicar
components/sub/MenuNavigation.tsx                                    # sidebar / salas
components/sub/ClassesView.tsx                                       # submódulo "aulas" (tracker, agenda, sticky, backpack, collective)
components/sub/LoungeEarth.tsx                                       # globo + feed estilo Twitter (a recuperar no Lounge)
app/study-rooms/page.tsx                                            # entrada das salas
app/study-rooms/cyber/main-hall/{exams,classes,researches,projects,profile,news,community}/page.tsx
app/study-rooms/bio/main-room/{exams,lessons,classes,researches,projects,profile}/page.tsx
app/study-rooms/lounge/main-lounge/{exams,researches,news,community,profile}/page.tsx
components/onboard/OnboardAgent.tsx                                 # cores de DNA por gênero (male/female/other)
components/main/OnboardModal.tsx                                    # idem
lib/ai/model.ts                                                    # modelo Gemini centralizado (use SEMPRE este, nunca hardcode)
```

> Estrutura confirmada: cada sala tem um `main-{hall|room|lounge}` contendo os submódulos
> `classes` / `lessons` / `exams` / `researches` / `projects` / `profile` / `news` / `community`.
> O alvo da migração é **alinhar todos esses submódulos** ao liquid glass da `research-lab`.

---

## RALPH LOOP — estrutura de execução de CADA fase

```
R — Read:    leia os arquivos da fase na íntegra (nunca edite às cegas)
A — Analyze: mapeie estado atual (componentes, estados, props, estilos inline)
L — List:    liste exatamente o que muda em cada arquivo (changed/untouched)
P — Plan:    grave o plano em docs/superpowers/plans/2026-06-12-liquid-glass-rooms.md
H — Hack:    implemente; rode `npx tsc --noEmit` após CADA arquivo
V — Verify:  build + screenshot mental do layout antes de marcar a fase como done
```

Use o roteamento de skills do `CLAUDE.md`:
- **planning-with-files** → cria/atualiza `task_plan.md` + `notes.md` na raiz (rastreio persistente)
- **engineering:system-design / architecture** → para o gateway de Provas e o agente Core Active
- **design:design-system + design:accessibility-review** → para garantir consistência e contraste do glass
- **engineering:code-review** → auto-revisão antes do PR

---

## PRINCÍPIO DE DESIGN — o "Zaeon Liquid Glass" (não-negociável)

Extraia estes tokens do doc fonte e crie **um componente compartilhado** para parar de duplicar estilo inline:

**Crie `components/ui/GlassPanel.tsx`** com variantes `shell | inner | dock | popover`, aplicando exatamente:
- shell: `rgba(22,22,34,0.55)`, border `rgba(255,255,255,0.12)`, `backdrop-filter: blur(40px) saturate(180%)`, raio `22`, shadow `0 40px 100px -30px rgba(0,0,0,0.85), inset 0 1px 0 rgba(255,255,255,0.10)`
- inner: `rgba(255,255,255,0.045)`, border `rgba(255,255,255,0.10)`, `inset 0 1px 0 rgba(255,255,255,0.12)`, raio `18`
- Acentos: violeta `#8b5cf6`, ciano `#22d3ee`. Pílulas ativas com glow violeta. Tipografia: headers `text-[9px] font-black uppercase tracking-[0.16em]`.

**Crie `components/ui/ProLockBadge.tsx`** — selo reutilizável "🔒 Pro" (glass, cadeado, tooltip configurável). Toda feature bloqueada usa este componente.

> Regra: a partir desta PR, **nenhum painel novo** usa estilo glass inline solto — todos consomem `<GlassPanel>`. Refatore os submódulos para usá-lo conforme migrar cada um.

---

## FASE 1 — SALA DE ESTUDOS (entrada) + LIMPEZA GERAL  `P0`

Objetivo: a sala de estudos é o **ponto de entrada**; precisa estar impecável e no padrão.

1. Migre `app/study-rooms/page.tsx` e o `main-{hall|room|lounge}` de cada sala para `<GlassPanel>` + paleta violeta/ciano. Botões, cards e cores idênticos à `research-lab`.
2. **Remova submódulos duplicados.** Hoje existem `news` (+ `news/articles`) e `profile` espalhados E também já migrados para a research-lab. Consolide:
   - **Notícias, Pesquisas e Perfil duplicados → remover** das salas, mantendo a versão canônica (research-lab / lounge). Atualize todos os links/rotas que apontavam para os removidos para a versão canônica (sem 404).
3. **Módulo `projects` → bloqueado como Pro.** Renderize o card de Projetos com `<ProLockBadge>` e desabilite a navegação; tooltip: _"Ferramenta Pro — em breve"_. Não delete o código; apenas porteie atrás da flag.
4. Verifique: `npx tsc --noEmit` limpo + nenhuma rota quebrada (`grep -r` nos hrefs removidos).

---

## FASE 2 — PROVAS / "Knowledge Check" como GATEWAY  `P1`  🛑 design exige atenção

Arquivos: `app/study-rooms/*/main-*/exams/page.tsx`. Reimplemente como um **gateway bidirecional** (entrada/saída) entre professor e aluno.

**Banner superior (faixa do professor — entrada):**
- Recebe informes, arquivos e **tarefas** (não só provas) enviados pelo professor.
- Permite **gerar/colar invite keys** nesta própria página.
- Upload de provas e materiais; lista do que o professor publicou.

**Corpo (aluno — saída):**
- Fazer provas online; responder testes enviados pelo professor; submeter respostas.
- **Knowledge Check adaptado ao novo modo:** o gerador de **texto + áudio aparece SEMPRE junto** (par fixo texto/áudio em cada item), refletindo a nova forma de funcionar (use `lib/ai/model.ts` para texto e o pipeline TTS existente — veja commit `feat(omega): voz (TTS)`).

Use **engineering:system-design** para desenhar o contrato de dados (provas, tarefas, keys, submissões) e grave em `docs/superpowers/specs/2026-06-12-provas-gateway-design.md` antes de codar.

> 🛑 `CHECKPOINT HUMANO #1`: após escrever o spec do gateway (modelo de dados + fluxo professor↔aluno), **pause e mostre o spec** para aprovação antes de implementar. É a única parte que pede uma nova arquitetura.

---

## FASE 3 — AULAS (`ClassesView.tsx`) — a fase mais delicada  `P1`

Reescreva `components/sub/ClassesView.tsx` mantendo TODA a estética liquid glass, mas reorganizando os módulos. **Layout final: linha horizontal única, tamanhos em ordem decrescente simétrica** (Zaeon chart = maior → demais diminuindo).

1. **Remova o `RealTimeModule` (Real-Time Tracker, ~linha 34/959).** No lugar dele entre o **"Zaeon Core Active" chat** (o maior elemento da linha):
   - Mesmos elementos visuais/glass do chat atual, mas chamando **um agente específico** que: monitora os outros agentes e o que o usuário pesquisou recentemente; sabe tudo sobre as aulas do usuário; e **tem habilidade de criar itens no modal da agenda**. Roteie pelo `agent-gateway/` + `lib/ai/model.ts`.
2. **Agenda** continua ao lado, porém **menor**. Conecte a ela o **card de detalhes** que sempre espelha a agenda + tempo real (tudo que está na agenda aparece nesse card). Os três (Core Active > Agenda > Card) ficam **na mesma linha, mesma estética, sem quebrar a horizontal** se couber.
3. **Remova as Sticky Notes** (`showSticky`, `stickyText`, ~linha 523/1114 — feature inútil). Limpe estado, persistência (`zaeon_sticky_note`) e UI.
4. **Mantenha o Backpack** (`Personal Backpack`, ~linha 536) — só ele.
5. **`CollectiveZone` / "Collective Build Node" (~linha 161/237) → flag Pro** via `<ProLockBadge>`. Texto da feature: _"Ambiente coletivo para criar trabalhos em tempo real com seus amigos — disponível apenas no Pro."_
6. **Interruptor/plug da agenda:** mantenha, porém **menor**, posicionado ao lado dos detalhes da agenda. Se com a agenda menor tudo couber na tela, ótimo; **se não couber, escreva no PR um aviso explícito** ("não coube na horizontal: X precisa de Y px") em vez de quebrar o layout silenciosamente.

> Regra de ouro do layout: ordem decrescente **simétrica** de tamanho, uma linha horizontal, estética uniforme nos três blocos.

---

## FASE 4 — PESQUISAS — engine de classificação + sincronia visual  `P1`

Arquivos: `app/study-rooms/*/main-*/researches/page.tsx` e a aba de pesquisas da research-lab.

1. **Nova engine:** ela puxa tudo que existe nesta aba **e na API** e **gera novas classificações** usando o motor que classifica níveis de posição acadêmica (reaproveite o `omega-research-termometro` — ver `docs/superpowers/specs/2026-06-04-omega-research-termometro-design.md`). Hoje esta aba está **dessincronizada** desse motor — religue-a.
2. **Padronização visual:** esta aba está fora do padrão. Traga-a 100% para o liquid glass (`<GlassPanel>`), sincronizando com o resto.
3. **Detalhe da pesquisa enxuto:** ao clicar numa pesquisa, mostre o **mínimo**. **Remova os nomes dos agentes** e metadados expostos por padrão — isso vira **opcional atrás de um botão** ("Ver detalhes").
4. **Conversar sobre a pesquisa:** o foco é poder conversar sobre o assunto.
   - Se a pesquisa for **pública** → conversa direto na página da pesquisa.
   - Se **privada** → conversa só sobre o tema no chat (função que já existe hoje, **mas está bugada — corrija**). Diagnostique com **engineering:debug** e conserte o fluxo do chat de pesquisa passada (ver `CLAUDE_CODE_PROMPT_research_suggestion_relocation_and_past_research_chat.md`).

---

## FASE 5 — LOUNGE — globo + "Twitter futurista" (recuperação)  `P2`

Recupere e religue `components/sub/LoungeEarth.tsx` (já contém `CyberGlobe`, feed, `likes`, `comments`, `/api/feed`).

- **Globo** dando a impressão de Zaeon global; abas bem separadas por região/curso.
- **Mural estilo Twitter futurista:** usuários compartilham frases, pesquisas, coisas. Cada um vê o mural do outro.
- **Regra social:** murais de **outros cursos** → só **curtir e visualizar** (sem opinar). **Comentar só é permitido para pessoas do mesmo curso.** Implemente esse gate de permissão por curso no `/api/feed` e na UI.
- Use como referência o estado anterior do projeto ("lounge de algo") — **recupere as partes inutilizadas** que já tinham o globo e as abas.

---

## FASE 6 — PERFIL — recuperar DNA por gênero  `P2`

A cápsula de DNA do perfil deixou de mostrar as cores por gênero. Restaure:
- **Azul para masculino, rosa para feminino** (e neutro para `other`).
- O dado `gender` já existe (`OnboardAgent.tsx`, `OnboardModal.tsx`: `'male' | 'female' | 'other'`). Religue a cor do DNA ao `session.user.gender` no módulo de perfil. Diagnostique por que parou de aparecer (provável regressão na migração) e corrija.

---

## RECUPERAÇÃO DE CÓDIGO MORTO  `P2`

Há várias partes inutilizadas no projeto (lounge antigo, globo, DNA, módulos legados). Faça um sweep:
```
git log --diff-filter=D --oneline    # arquivos deletados recuperáveis
grep -rn "TODO\|DEPRECATED\|LEGACY\|unused" components app
```
Liste no PR o que foi recuperado e religado vs. o que ficou morto de propósito.

---

## VERIFICAÇÃO (rode ao fim de CADA fase, não só no final)

```bash
npx tsc --noEmit            # zero erros de tipo
npm run build               # build de produção passa
grep -rn "<href removido>"  # nenhuma rota órfã
```
Para cada submódulo migrado, confirme contra o doc fonte: background `rgba(22,22,34,0.55)`, blur 40px, acentos `#8b5cf6`/`#22d3ee`. Use **design:accessibility-review** para contraste do texto sobre glass.

---

## CHECKPOINTS HUMANOS (apenas 3 — em todo o resto, autonomia total)

- 🛑 **#1** — Spec do gateway de Provas (Fase 2): aprove o modelo de dados antes de implementar.
- 🛑 **#2** — Layout de Aulas (Fase 3): se os 3 blocos **não couberem** na horizontal, reporte os números e espere decisão.
- 🛑 **#3** — Antes de **deletar** qualquer submódulo/arquivo (limpeza): liste os caminhos exatos a remover e confirme. (Operação destrutiva = nunca silenciosa.)

Fora desses três, **não pergunte — decida com base na fonte da verdade e prossiga.**

---

## ENTREGA FINAL

1. `planning-with-files`: `task_plan.md` com as 6 fases (status P0/P1/P2) + `notes.md` com evidências.
2. Specs novos em `docs/superpowers/specs/` (Provas gateway).
3. Auto-revisão com **engineering:code-review**.
4. **Um PR**, branch `feat/liquid-glass-rooms-transition`, descrição no formato:
   ```
   Conclusion:
   What I changed:   (arquivos por fase)
   What I checked:   (tsc, build, rotas, contraste)
   Risks / limits:
   Next step:
   ```
5. No corpo do PR, tabela **changed vs untouched** por fase e qualquer aviso de layout (Fase 3).
```
