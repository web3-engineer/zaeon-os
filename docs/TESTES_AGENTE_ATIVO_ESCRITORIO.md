# Escritório — agente ativo sem @menção (card #392) · testes e observações

> Documento de apoio à correção do **#392** ("Agente não responde sem @menção no Escritório").
> Tudo aqui foi derivado **do código da branch** (`d1cea3f`) e dos testes que a acompanham.
> Onde algo **não foi verificado de verdade**, está marcado como `NÃO VERIFICADO`.

---

## 1. O que mudou

| Arquivo | Mudança |
|---|---|
| `lib/canal/alvo.ts` (novo) | `resolverAlvos()` — função **pura** que decide quem responde a uma mensagem. |
| `app/api/canal/[id]/mensagem/route.ts` | Usa `resolverAlvos` em vez de só `parseMentions`; devolve em `turnos` os agentes que realmente vão responder. |
| `components/office/CoworkingCanal.tsx` | "está escrevendo" e `meusAgentes` passam a vir de `j.turnos`; o placeholder mostra quem responde. |
| `lib/canal/alvo.test.ts` (novo) | 13 testes da regra. |
| `app/api/canal/[id]/mensagem/route.test.ts` | Mock ganhou `findMany`; 4 casos novos. |

### Regra (fonte: `lib/canal/alvo.ts`)

1. **Com `@menção`** → só os marcados respondem. A menção sempre manda e troca o agente ativo.
2. **Sem `@`, já houve agente no canal** → responde o **último agente que falou** (ainda convocável). **Sem limite de tempo.**
3. **Sem `@`, nenhum agente falou ainda** → responde o agente padrão (`AGENTE_PADRAO = "aura"`), **só em canal de uma pessoa**.
4. **Canal com 2+ humanos** (dono + membros): o agente ativo só atende **quem estava conversando com ele** (o último humano antes da última resposta do agente). Primeiro contato exige `@`.
5. Nada disso muda o que é **gravado** em `CanalMensagem.mencoes`: continua sendo só a menção explícita.

---

## 2. Como rodar os testes automáticos

```bash
npx vitest run lib/canal app/api/canal
```

Resultado na branch: **11 arquivos, 77 testes, todos passando** (17 s).

Pré-requisito neste projeto: `node_modules` instalado. Se for a primeira vez:

```bash
npm ci --ignore-scripts
npx prisma generate
```


Typecheck:

```bash
npx tsc --noEmit
```

Resultado: 24 erros, **todos em `server/colyseus/*`** (pacote separado, com `npm ci --prefix server/colyseus` próprio no CI). **Zero erros** em `lib/canal`, `app/api/canal` e `components/office`.

---

## 3. Matriz de testes automáticos (o que cada teste prova)

### 3.1 `lib/canal/alvo.test.ts` — regra pura (13)

| # | Cenário | Esperado |
|---|---|---|
| 1 | Com `@medicina` havendo agente ativo (aura) | `alvos=["medicina"]`, `implicito=false` |
| 2 | Sem `@`, histórico aura → medicina | `alvos=["medicina"]` (o último) |
| 3 | Sem `@`, canal vazio | `alvos=["aura"]` |
| 4 | Sem `@`, só mensagens humanas | `alvos=["aura"]` |
| 5 | `padrao: null` | `alvos=[]` |
| 6 | Padrão fora dos disponíveis | `alvos=[]` |
| 7 | Último agente não é mais convocável | cai no padrão (`aura`) |
| 8 | Dois agentes seguidos (aura, zaeon) | só o último (`zaeon`) |
| 9 | 2+ humanos, sem agente anterior | `alvos=[]` |
| 10 | 2+ humanos, remetente é o interlocutor | `alvos=["aura"]` |
| 11 | 2+ humanos, remetente é outra pessoa | `alvos=[]` |
| 12 | 2+ humanos, interlocutor continua após fala de outro humano | `alvos=["aura"]` |
| 13 | 2+ humanos, com `@` | qualquer um convoca |

### 3.2 `app/api/canal/[id]/mensagem/route.test.ts` — rota (17)

Já existiam (13): author gate (privado/turma/aberto × dono/membro/fora), 401/404, texto vazio/gigante, e `@menção` dispara 1 turno por agente conhecido.

Novos/ajustados (4+1):

| # | Cenário | Esperado |
|---|---|---|
| 14 | Canal compartilhado, sem `@`, sem agente ativo | nenhum turno (`turnos: []`) |
| 15 | Canal de uma pessoa, `eai` | 1 turno `aura`; `mencoes` gravadas = `[]` |
| 16 | Meio da conversa (aura → medicina), sem `@` | turno para `medicina` |
| 17 | `@Osler` com aura ativa | turno para `medicina` (troca) |
| 18 | Canal com 2 pessoas, outra pessoa sem `@` | nenhum turno |

### 3.3 O que **não** tem teste automático

- O componente `CoworkingCanal.tsx` (indicador "escrevendo", placeholder). Não há teste de render para ele no repositório.
- O turno real do agente (`agent-turn.ts`) com a mensagem implícita — os testes dele continuam passando, mas não foram estendidos.
- Pusher, BullMQ, Gemini: todos mockados.

---

## 4. Roteiro de teste manual (no site, depois do deploy)

Usar um canal **novo**, de uma pessoa (`membros` vazio), flag `NEXT_PUBLIC_ESCRITORIO_COWORK=1`.

| # | Passos | Esperado |
|---|---|---|
| M1 | Enviar `eai` num canal vazio | Aura aparece "escrevendo…" e responde |
| M2 | Enviar `como você está?` (sem `@`) | Aura continua respondendo |
| M3 | Enviar `@Osler explica isso` (ou outro mentor contratado) | O mentor responde |
| M4 | Enviar `e depois?` (sem `@`) | O **mentor** responde (não a Aura) |
| M5 | Ficar parado por alguns minutos e enviar sem `@` | Mesmo agente responde (sem expirar) |
| M6 | Recarregar a página e enviar sem `@` | Mesmo agente (vem do histórico, não do estado do navegador) |
| M7 | Conferir o campo de mensagem | Placeholder mostra `<Agente> responde · @ troca de agente` |
| M8 | Enviar `@fulano oi` (inexistente) | Sem `@` válido → segue o agente ativo |
| M9 | Adicionar um colega em ⚙︎ e ele enviar sem `@` | **Não** aciona agente (canal compartilhado) |
| M10 | O colega enviar `@aura oi` | Aura responde |
| M11 | Você enviar sem `@` logo depois | Segue com quem estava conversando com o agente |
| M12 | Canal de uma pessoa, mensagem com acento/emoji/maiúsculas | Mesmo comportamento |

---

## 5. Observações e riscos (com base no código)

### 5.1 Custo — **mudança de comportamento importante**
Antes, só `@` gerava chamada de LLM. Agora, **em canal de uma pessoa, toda mensagem gera um turno**.
Não há rate-limit em `/api/canal/[id]/mensagem` (já era assim). Quem digita muito rápido gera um turno por mensagem.

### 5.2 Canal `aberto` — **possível brecha de custo/ruído** (`NÃO VERIFICADO em produção`)
`humanos` é calculado como `1 + membros (≠ dono)`. Em canal `aberto`, quem **não entrou** (não está em `membros`) também pode escrever (`podeEscrever` = `podeLer`). Resultado: o canal conta como "1 humano" mesmo com várias pessoas escrevendo, e **a regra de interlocutor não se aplica** — qualquer logado que escreva sem `@` aciona o último agente (ou a Aura), com o `userId` **dele** no turno (custo e memória atribuídos a ele).
Possível correção: contar **autores humanos distintos** no histórico recente + remetente, e não só `membros`.

### 5.3 Condição de corrida
O histórico é lido **antes** de gravar a mensagem atual, e a resposta do agente só é gravada ao fim do turno.
Duas mensagens enviadas em sequência rápida podem ver o mesmo "último agente" (ou nenhum, e cair as duas na Aura). Os turnos são serializados por canal (`emSerie`), mas **só dentro de um processo**.

### 5.4 Janela do histórico
A rota lê as últimas **100** mensagens. Se o último agente falou há mais de 100 mensagens, ele é tratado como "ninguém falou" e cai no padrão (Aura).

### 5.5 Agente padrão fixo
`AGENTE_PADRAO = "aura"` está em `lib/canal/alvo.ts`. Existe também `AGENTES_BASE = ["aura"]` em `lib/canal/server.ts` — **duas fontes** para a mesma ideia. Se a Aura estiver `ativo: false` no `AgentProfile`, ela não está em `disponiveis` e o primeiro `eai` fica **sem resposta** (silenciosamente).

### 5.6 Mensagens efêmeras de erro
Respostas de erro (`efemera-<ts>`) não são gravadas, então **não contam** como "último agente falou". O cliente ignora esse id ao montar o placeholder. Se o agente falhar sempre, o próximo envio cai de novo no mesmo agente (ou na Aura).

### 5.7 Teto de 12 agentes
Agentes adicionados por **menção** ou agora por **resposta implícita** entram em `canal.agentes` sem o `.slice(0, 12)` que PATCH/POST aplicam. Não é novo (já valia para menções), mas segue em aberto.

### 5.8 Texto do agente
`blocoCanal` (em `agent-turn.ts`) ainda diz "foi convocado(a) por @chave". Com resposta implícita o agente pode soar "chamado" sem ter sido. Não quebra, mas vale ajustar o prompt depois.

### 5.9 Leitura do cliente
`CoworkingCanal` só considera `canal.membros.length === 0` para mostrar a dica no placeholder. Em canal compartilhado a dica **não aparece**, de propósito (o servidor pode não responder).

---

## 6. Fora do escopo desta correção (conhecido, **não** alterado)

- Canal em tempo real público (`canal-<id>` sem `private-`) — vazamento teórico de canais privados.
- Sem rate-limit/teto de custo por usuário no canal.
- Histórico fixo em 60 mensagens, sem paginação; sem ressincronização após queda de rede.
- `podeLer` x lista de canais: membro de canal `privado` aparece na lista e leva 403.
- `emSerie` sem timeout: turno que nunca termina trava a fila do canal.

---

## 7. Checklist antes de abrir a PR

- [x] `npx vitest run lib/canal app/api/canal` → 77/77
- [x] `tsc --noEmit` sem erros nos arquivos alterados
- [ ] Teste manual M1–M12 no ambiente de deploy
- [ ] Decidir 5.2 (canal `aberto`) — corrigir agora ou abrir card separado
- [ ] Decidir 5.5 (padrão Aura vs Zaeon, e fonte única)
- [ ] Confirmar com o dono: regra "sem limite de tempo" e "só interlocutor em canal compartilhado"
