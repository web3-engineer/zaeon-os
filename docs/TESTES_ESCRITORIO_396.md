# Escritório — card #396 · testes e observações

> Documento de apoio à PR do **#396** (branch `feat/396-escritorio`, commit final `8056500`).
> Tudo aqui foi tirado **do código da branch** e de **execuções reais** dos testes nesta máquina (Windows).
> Onde algo **não foi verificado de verdade**, está marcado como `NÃO VERIFICADO`.

---

## 1. Resumo

| Item do card | O que foi feito | Commit |
|---|---|---|
| **A** Zoom das letras | A− / A+ no canto superior direito do escritório, a mesma escolha do chat das salas | `bd665db` |
| **G** Perfis no topo | Dono, membros e você no topo (anel verde = online); agentes seguem embaixo | `bd665db`, `e0189ca` |
| **C** Estados do agente | "Nina está pesquisando / investigando / redigindo…"; chip "em descanso" no limite | `efc3050` |
| **E** Apagar escritório | Lixeira no seletor, só para o dono, com confirmação | `26c9b69` |
| **F** Agenda semanal | Bandeja à esquerda do seletor: grade dias × horas, cor por pessoa, foto no 1º quadrado | `cc243b3` |
| **D** Convite e abas | Botão **+**, convite com aceite, conversa privada 1 a 1, abas Privado / Turma / Aberto | `10a35d9` |
| **B** Agente no nicho | Responde só a área dele; marca um colega com @ e o colega responde sozinho (até 2) | `8056500` |
| — | Prova de que o agente conversa com vários usuários | `d3ce9e8` |
| — | Teste da fila estável (sem sleep fixo) | `07a8690` |

**Tamanho:** 35 arquivos, +2.492 / −45 linhas.

---

## 2. Como rodar

```bash
npx vitest run lib/canal app/api/canal components/office lib/ui
```

```bash
npx tsc --noEmit
```

```bash
npm ci --prefix server/colyseus
```

```bash
npm test --prefix server/colyseus
```

Na primeira vez: `npm ci --ignore-scripts` e depois `npx prisma generate`.

---

## 3. Resultados das execuções reais

| Verificação | Resultado |
|---|---|
| `tsc --noEmit` (raiz) | **0 erros** |
| `tsc` do `server/colyseus` | **0 erros** |
| Testes do `server/colyseus` | **11/11** (rodados sozinhos, 2 vezes) |
| Suítes do escritório (`lib/canal`, `app/api/canal`, `components/office`, `lib/ui`) | **312/312**, em **3 rodadas seguidas** |
| **Suíte inteira** (`npx vitest run`) | **2.824 de 2.826** · 339 de 340 arquivos |
| Teste de integração do cyberespaço (`salaColyseus.int`) | passa (com o pacote do Colyseus instalado) |

### As 2 falhas da suíte inteira — não são do escritório

| Teste | Causa | Já falhava na `main`? | No CI (Linux) |
|---|---|---|---|
| `lib/studio/storage.test.ts` (2) | o teste espera caminho com `/`; o Windows usa `\` (`path.join`) | **sim** | deve passar |

Instabilidade conhecida, **não** apareceu na última execução: `lib/avatars/estudio.test.ts` estoura o tempo com a máquina carregada; sozinho passa 4/4.

---

## 4. Testes automáticos — o que cada arquivo prova

**151 testes novos** (131 em 11 arquivos novos + 20 em arquivos existentes).

| Arquivo | Testes | Item | O que prova |
|---|---|---|---|
| `lib/canal/topoPessoas.test.ts` | 9 (novo) | G | dono primeiro; membros e você; visitante online depois; sem duplicar; limite 6 + "+N" |
| `lib/canal/estadoAgente.test.ts` | 13 (novo) | C | fase do harness → estado; valor estranho vira "digitando"; quem está "no ar"; rótulos |
| `lib/canal/agent-turn.test.ts` | 26 (+14) | C, B, D | estados só publicados quando mudam; teto de virtual key termina em "descanso"; vários usuários no mesmo canal; encadeamento (8 casos) |
| `lib/canal/seletor.test.ts` | 9 (novo) | E | só o dono apaga; texto do confirm; qual canal abre depois; último canal |
| `lib/canal/agenda.test.ts` | 17 (novo) | F | grade 7h–22h; dois cliques; redesenhar o próprio horário; dividir horário; foto só no 1º quadrado |
| `app/api/canal/[id]/agenda/route.test.ts` | 21 (novo) | F | acesso (9 combinações); validação; substituir o próprio; apagar só o seu; teto de 40 |
| `components/office/AgendaBandeja.test.tsx` | 10 (novo) | F | **tela**: carregar, terça 9 + terça 15, outro dia recomeça, Esc, apagar com confirmação, foto de outra pessoa não apaga |
| `lib/canal/convite.test.ts` | 14 (novo) | D | e-mail/nome; só o convidado responde; contatos; não duplicar; abas sem misturar; humanos no canal |
| `lib/canal/gate.test.ts` | 8 (+3) | D | conversa privada: só as duas pessoas, qualquer que seja o acesso; sem `dmCom` nada muda |
| `app/api/canal/convites/route.test.ts` | 14 (novo) | D | convidar por e-mail/nome; nome repetido; a si mesma; duplicado; recusado libera; teto de 20; listar; aceitar cria a conversa; responder 2× |
| `app/api/canal/[id]/route.test.ts` | 8 (novo) | D | conversa privada abre só pros dois e não recebe gente; adicionar exige convite aceito |
| `app/api/canal/[id]/mensagem/route.test.ts` | 19 (+2) | D | na conversa privada a IA não responde sem @; o outro lado escreve, terceiro não |
| `components/office/ConvitesEscritorio.test.tsx` | 6 (novo) | D | **tela**: o "+" envia/limpa/erro; aceitar e recusar com o id certo; enviados "aguardando" |
| `lib/canal/encadear.test.ts` | 10 (novo) | B | primeiro @ válido; markdown em volta; sem ping-pong; só permitidos; limite 2 |
| `lib/canal/queue.test.ts` | 5 (+1) | B | **ponta a ponta**: aura → nina → teo, e o caio não é chamado (limite) |

### O que **não** tem teste automático

- O **visual** de tudo (cores, posição, tamanho, celular). Os testes de tela conferem comportamento, não aparência.
- O `CoworkingCanal.tsx` inteiro (Pusher, várias abas abertas, notificações). As partes com regra foram extraídas para funções puras e testadas.
- As **respostas reais da IA** (se o agente de fato marca o colega com @, se fica no nicho).

---

## 5. Roteiro de teste manual (no site, depois do deploy)

Flag `NEXT_PUBLIC_ESCRITORIO_COWORK=1`. Use **duas contas** (ex.: a sua e a do Martinez) para o item D.

### A · Zoom
| # | Passos | Esperado |
|---|---|---|
| A1 | Clicar em A+ e A− no topo direito | Só o texto das mensagens muda de tamanho |
| A2 | Recarregar a página | O tamanho escolhido continua |
| A3 | Abrir a sala de estudos | O mesmo tamanho vale lá (é a mesma escolha) |

### G · Perfis
| # | Passos | Esperado |
|---|---|---|
| G1 | Abrir um canal de turma com membros | Dono primeiro, depois membros; anel verde em quem está online |
| G2 | Membro sai da página | Anel dele fica cinza |
| G3 | Canal com mais de 6 pessoas | Aparece "+N" |

### C · Estados
| # | Passos | Esperado |
|---|---|---|
| C1 | `@aura pesquisa artigos sobre X` | O balão muda: entendendo → planejando → **pesquisando** → investigando → redigindo |
| C2 | Agente estourar o limite da chave | Chip dele esmaecido com "em descanso" (ver observação C-2) |

### E · Apagar
| # | Passos | Esperado |
|---|---|---|
| E1 | Abrir o seletor como dono | Lixeira ao lado de cada escritório seu |
| E2 | Abrir o seletor como membro | **Sem** lixeira nos escritórios dos outros |
| E3 | Apagar → Cancelar | Nada some |
| E4 | Apagar o escritório aberto | Abre outro; mensagens dele somem |
| E5 | Apagar o último | Nasce "Meu escritório" vazio |

### F · Agenda
| # | Passos | Esperado |
|---|---|---|
| F1 | Clicar em 🗓 (à esquerda do seletor) | Bandeja com Seg…Dom e 7h…22h |
| F2 | Terça 9h, depois terça 15h | Sua cor das 9h às 16h; sua foto só no quadrado das 9h |
| F3 | Terça 9h, depois quinta 10h | Recomeça a seleção na quinta (não salva) |
| F4 | Esc no meio da seleção | Cancela |
| F5 | Tocar na **sua** foto | Pede confirmação e apaga |
| F6 | A outra conta marca o mesmo horário | Os dois aparecem lado a lado no quadrado; a primeira vê na hora (sem recarregar) |
| F7 | Tocar na foto da **outra** pessoa | Não apaga; começa uma seleção |

### D · Convite e abas
| # | Passos | Esperado |
|---|---|---|
| D1 | **+** → e-mail do Martinez → Convidar | "Convite enviado"; na conta dele, bolinha vermelha no seletor e aviso |
| D2 | Conta dele: seletor → aba **Privado** | Convite com Aceitar / Recusar |
| D3 | Aceitar | Abre a conversa "Giulia e Martinez" na aba Privado, nas duas contas |
| D4 | Conversar sem @ | A IA **não** responde sozinha |
| D5 | `@aura resume` na conversa | A Aura responde |
| D6 | Terceira conta tenta abrir o link da conversa | Sem acesso |
| D7 | ⚙︎ de um escritório de turma | "Seus contatos" com o Martinez; um toque o adiciona |
| D8 | Adicionar por e-mail alguém que **não** aceitou convite | Erro: "ainda não aceitou um convite seu" |
| D9 | Convidar de novo quem já é contato | "Vocês já são contatos" |
| D10 | Abas Turma e Aberto | Cada uma lista só os escritórios dela |

### B · Agente no nicho
| # | Passos | Esperado |
|---|---|---|
| B1 | Pergunta de medicina para `@aura` | A Aura responde a parte dela e marca o mentor certo com @ |
| B2 | Logo depois | O mentor responde **sozinho**, com próximos passos |
| B3 | Pergunta que atravessa 3+ áreas | No máximo 2 agentes entram depois do primeiro |
| B4 | Mensagem sem @ depois da cadeia | Responde o último agente que falou |

---

## 6. Mudanças de comportamento (avisar o Martinez)

1. **Adicionar alguém por e-mail agora exige convite aceito.** Antes a pessoa entrava direto. Quem **já** é membro continua; só as próximas adições mudam.
2. **Banco** (o deploy roda `prisma db push`), tudo **só acrescenta**:
   - coleção nova `agenda_blocos` (item F);
   - coleção nova `canal_convites` (item D);
   - campo novo `dmCom` (opcional) em `canais` + índice `[dmCom, updatedAt]`.
3. **Prompt dos agentes no canal** mudou (item B): agora pede para ficar no nicho e passar a bola com @.
4. **Novo escritório** nasce com o acesso da aba em que você está (antes era sempre "turma").

---

## 7. Observações e riscos, por item (com base no código)

### A · Zoom
- **A-1** A escala é **por aparelho** (`localStorage`, chave `zaeon.chat.fontScale.v1`) e é a **mesma** do chat das salas. Mudar no escritório muda lá também.

### G · Perfis
- **G-1** Visitante de canal **aberto** que está online aparece no topo mesmo sem ser membro (intencional).

### C · Estados
- **C-1** "Consultando outro agente" e "usando uma ferramenta" **têm texto mas não são emitidos**: o harness não sinaliza isso hoje.
- **C-2** **Lacuna:** o chip "em descanso" só aparece quando estoura o teto da **chave virtual** (erro do LLM). Pelo outro caminho — teto **por agente** (`AGENT_TETO_ENFORCE=1` + turno autônomo) — o agente avisa com a mensagem passageira, mas o turno termina **antes** de publicar o estado, então o chip **não** fica "em descanso" (`lib/canal/agent-turn.ts`, bloco "PR-A3").

### E · Apagar
- **E-1** Apagar remove **todas as mensagens** do escritório (a rota já fazia isso).
- **E-2** Na conversa privada, quem convidou é o "dono" e **pode apagá-la para os dois**.

### F · Agenda
- **F-1** Grade fixa de **7h a 22h** (o último quadrado vai até 23h). Fora disso não dá pra marcar.
- **F-2** Horas sem fuso: "terça 9h" vale como 9h para todo mundo.
- **F-3** Cor por pessoa vem de uma paleta de **10 cores**; duas pessoas podem cair na mesma cor (a foto e o nome no quadrado diferenciam).
- **F-4** Em canal **aberto**, qualquer pessoa logada pode marcar horário (mesma regra de escrever no canal).
- **F-5** Teto de **40 horários por pessoa por escritório**.
- **F-6** O card fala em "bandeja semelhante à de documentos"; não achei essa bandeja no código. Fiz um painel retrátil no vidro do escritório. **Conferir com o Martinez.**

### D · Convite e abas
- **D-1** **A Zaeon não tem "nome de usuário".** O convite aceita e-mail ou **nome**, se só uma pessoa tiver aquele nome (com duas, pede o e-mail).
- **D-2** Buscar por e-mail/nome **revela se a pessoa tem conta** (já acontecia no "adicionar por e-mail").
- **D-3** Convite pendente **não expira**. Recusado libera um convite novo **sem espera** — dá para insistir (limitado a 20 pendentes por pessoa).
- **D-4** O título da conversa ("Giulia e Martinez") é gravado no aceite; se alguém mudar de nome, o título não muda.
- **D-5** A conversa privada nasce **sem agentes**; a IA só entra com @.
- **D-6** Avisos de convite usam o canal pessoal `user_<id>` do Pusher, que já existia (mesmo padrão do Lounge).

### B · Agente no nicho
- **B-1** Depende de a IA **realmente** marcar o colega com @. O código só reage ao @ que aparece na resposta. `NÃO VERIFICADO` com o Gemini real.
- **B-2** Só o **primeiro** @ válido vale (um por vez).
- **B-3** Podem ser chamados: os agentes **que estão no canal** + as **personas da plataforma**. Mentores **contratados que não estão no canal** ficam de fora (mais restrito que o combinado; dá para ampliar).
- **B-4** Os encadeados rodam como "autônomo": o teto por agente só freia se `AGENT_TETO_ENFORCE=1`.
- **B-5** Cada agente encadeado é **uma chamada de IA a mais**: até 3 turnos por mensagem (o primeiro + 2).
- **B-6** A fila serializa por canal **dentro de um processo**; com vários workers, turnos do mesmo canal podem rodar juntos (já era assim).

### Gerais
- **X-1** O canal em tempo real `canal-<id>` é **público** no Pusher (já era): os eventos novos (agenda, estados) passam por ele também.
- **X-2** Sem limite de mensagens por minuto na rota de mensagem (já era); com o item B, cada mensagem pode gerar até 3 turnos.

---

## 8. Fora do escopo (conhecido, não alterado)

- Teste do Studio (`storage.test.ts`) que falha no Windows.
- Ponto em aberto do #392: em canal **aberto**, visitante sem `@` pode acionar o agente (`docs/TESTES_AGENTE_ATIVO_ESCRITORIO.md`, seção 5.2).
- Lista do seletor e histórico sem paginação; sem ressincronizar após queda de rede.

---

## 9. Checklist antes do merge

- [x] `tsc` sem erros
- [x] Suítes do escritório 312/312 (3 rodadas)
- [x] Suíte inteira: só as 2 falhas antigas do Windows
- [x] Colyseus 11/11
- [ ] CI verde no fork (PR em rascunho)
- [ ] Roteiro manual da seção 5 no site, com duas contas
- [ ] Martinez de acordo com as mudanças da seção 6
- [ ] Decidir C-2 (estado "em descanso" no teto por agente) e B-3 (mentores contratados fora do canal)
