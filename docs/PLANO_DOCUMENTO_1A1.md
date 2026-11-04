# O harness do documento: cego por construção, e como ligá-lo ao chat 1:1

Pedido do dono: *"ele está adaptado às novas habilidades do harness? precisamos melhorar esse
harness e deixar ele sempre 1:1 com a memória do chat, o conhecimento deve ser sempre documentado
corretamente a partir do momento que existe um documento ativo."*

Resposta curta da auditoria: **não está adaptado a nenhuma delas** — e o problema é pior do que
falta de adaptação.

---

## 1. O achado central: o escritor não recebe fonte nenhuma

O contrato de entrada do escritor de seção é este, inteiro:

```ts
export type PedidoSecao = {
  tema: string;
  tipo: string;
  unidade: Unidade;              // o slot + subtítulos do template
  rascunho: readonly TrechoRascunho[];   // as seções já escritas, comprimidas
  norte?: Record<string, string | undefined> | null;  // o esboço (título, objetivos, metodologia)
};
```

Não há **nada** aí de: base de conhecimento (RAG), anexos do aluno (F3), literatura achada pelo
`literature_search`, páginas lidas pelo Leitor, síntese cruzada (F4), gráficos (G3) ou memória da
conversa.

E agora o detalhe que transforma isso de lacuna em defeito. O `sys` do escritor diz:

> "NÃO invente dado, número, autor nem referência. Se faltar fundamentação para uma afirmação,
> escreva a afirmação e marque com ⟨sem fonte⟩ no fim da frase — nunca invente a fonte."

A regra está certa, e foi desenhada para proteger. Só que, **sem nenhuma fonte na mão, a única saída
honesta do modelo é marcar quase tudo**. O documento gerado hoje tende estruturalmente ao
⟨sem fonte⟩ — não porque o modelo seja preguiçoso, mas porque nós nunca lhe entregamos sobre o que
se apoiar. Ele está sendo cobrado por um rigor que o nosso próprio desenho torna impossível.

## 2. A sincronia é de mão única, e rasa

O que o chat sabe do documento (`contextoDoTcc`) é **título + lista de seções + contagem de
palavras**. Ou seja:

- o chat **não sabe o que o documento já diz** — então pode afirmar na conversa o contrário do que
  está escrito na seção ao lado, sem nenhuma trava;
- o documento **não sabe nada do chat** — a conversa pode ter achado 10 papers e lido 3 páginas, e
  a seção seguinte nasce sem saber que isso existiu.

É exatamente a distância que o dono quer fechar com "1:1 com a memória do chat".

## 3. O trilho de citação JÁ EXISTE — e está desligado

Terceira vez nesta série que auditar antes de construir muda o desenho (como o Leitor e o módulo
MCP). O caminho de fonte verificada está pronto:

- `TccRevisao.fontes: Json?` — `[{ abnt, url?, doi? }]`, "fonte VERIFICADA (scholar) de cada
  sugestão", mais `nota` ("o rigor explica, não só troca");
- `sugerirNoTcc(id, userId, sugestoes)` grava a sugestão com as fontes e status `"sugerida"` — ou
  seja, **o aluno aprova antes de entrar**;
- `referenciasNovas(secoes, fontes)` leva as fontes para a seção **REFERÊNCIAS em ABNT**,
  automaticamente;
- `lib/tcc/rigor.ts` é quem usa isso hoje (caminho "Pesquisa").

Nada disso é chamado pelo gerador por seção. Construir um mecanismo novo de citação seria repetir
trilho — o que falta é **ligar** o que existe.

## 4. O que cada habilidade nova deixaria no documento

| habilidade | o que ela já produz no chat | o que o documento perde hoje |
|---|---|---|
| F4 · base + síntese | trechos por documento, com título e página | citação da própria bibliografia do aluno |
| F3 · anexos | o texto do arquivo anexado | a fonte mais confiável que existe: o que o aluno trouxe |
| `literature_search` | papers reais com ano, autor, DOI | as referências ABNT que o trilho do §3 já sabe montar |
| Leitor (`abrir_url`) | o conteúdo da página, com URL | citação de fonte web com endereço |
| G3 · gráficos | SVG com recibo | figura com legenda e fonte (o SVG foi feito pensando nisso) |
| G1 · rede de honestidade | reprova promessa sem lastro | nada: o documento não passa pela rede |

---

## Fases propostas

| fase | o que entra | custo |
|---|---|---|
| **D1** | `PedidoSecao` ganha as FONTES do turno (base, anexo, literatura, Leitor). O `sys` passa a exigir citar o que existe, e ⟨sem fonte⟩ só quando realmente não houver. | 0 chamadas |
| **D2** | O que a seção citou vira `fontes` da revisão → `referenciasNovas` monta REFERÊNCIAS ABNT sozinho. Trilho do §3. | 0 |
| **D3** | **1:1**: com documento ativo, o conhecimento do turno é oferecido ao documento; e o chat passa a ver o CONTEÚDO do documento (resumo por seção), não só a contagem. | 0–1 |
| **D4** | Anexo do aluno vira fonte citável do documento (F3), com página. | 0 |
| **D5** | Gráfico (G3) vira figura com legenda e fonte no documento. | 0 |

D1 e D2 juntos já resolvem o essencial: **o documento deixa de nascer sem fonte**, e a bibliografia
se monta sozinha a partir do que foi realmente citado.

---

## D4 e D5 entregues (2026-11-03)

### D4 · o anexo vira fonte citável

`fontesDoTurno` passou a receber os anexos, e eles vêm **na frente de tudo**: é o material que a
pessoa escolheu trazer. Sem página na citação, de propósito — sabemos quantas páginas o arquivo
*tem*, não de qual delas saiu a afirmação, e citar página errada é pior que não citar página.

De quebra, a D4 consertou um risco que a D3 tinha deixado: as referências eram **remontadas** do
lado do documento a partir de `answer.evidencia`, e isso dependia de as duas remontagens baterem —
além de o anexo nem existir no `answer`. Agora o harness, que tem a lista original na mão, mede o
que foi citado e põe em `answer.referencias`. O caminho antigo ficou como rede.

### D5 · o gráfico no documento é QUADRO, não figura — e isso foi uma correção de rumo

O plano dizia "gráfico vira figura com legenda e fonte". **Não dá, e o motivo é estrutural:** o
corpo de uma seção é texto puro (o editor mostra num `textarea`) e a exportação vai para um serviço
Python (`abnt-service /format`) que não recebe imagem em nenhum ponto. Enfiar SVG ali mostraria
marcação crua ao aluno e sujaria o `.docx`.

Escrever só "Figura 1" sem a figura seria **prometer o que não existe** — exatamente o defeito que
esta série inteira persegue. Então foi pelo que o canal suporta e que é igualmente honesto: um
**quadro** com os números de verdade e a linha de fonte. Para "papers por ano" num trabalho
acadêmico, o quadro é inclusive a forma mais usual.

O quadro é **oferecido**, não imposto: vai no prompt com "se — e só se — couber nesta seção", e
some das seguintes assim que entra numa. É o "apenas onde couber" do dono, decidido pelo escritor.

**Figura de verdade continua possível, e custa três camadas:** onde a figura mora (schema), o
editor renderizando, e o `abnt-service` aceitando imagem. É projeto próprio, não uma fase.

**Dois deslizes meus, pegos antes do commit:**

1. eu montava o gráfico, jogava os pontos fora e **parseava o `<desc>` do SVG de volta** pra
   recuperar a série. Frágil e desnecessário: `GraficoNaResposta` passou a carregar `pontos`.
2. o primeiro teste do "quadro entra uma vez só" era irreal — eu fazia uma seção COM subtítulos
   obrigatórios devolver um corpo sem `##`, que o laço **rejeita** e reescreve. O quadro se perdia
   e o código seguia oferecendo, corretamente. Virou dois testes: o caminho aceito, e o caso do
   corpo rejeitado (que não pode consumir o quadro, porque ele não entrou no documento).

**Gates:** 5757 testes (619 arquivos, 0 falhas), `tsc` limpo, `eslint` 0.

## 🔒 Portões do dono

1. **Escrever direto ou sugerir?** O trilho existente grava `status: "sugerida"` — o aluno aprova
   antes de a mudança entrar. O gerador por seção escreve **direto**. Para "o conhecimento deve ser
   sempre documentado", qual vale: a plataforma escreve e o aluno corrige, ou a plataforma propõe e
   o aluno aceita? **Minha recomendação: escrever direto o corpo da seção (é o que ele pediu ao
   gerar), e SUGERIR quando a mudança nasce da conversa** — porque aí o aluno não pediu aquela
   edição, ela brotou do que foi conversado.
2. **O chat ver o conteúdo do documento custa contexto.** Hoje são títulos + contagem. Mandar um
   resumo por seção é mais prompt em todo turno com documento ativo. Dá para limitar ao que mudou.
3. **Autoria acadêmica.** Quanto mais o documento se escreve sozinho com fonte, mais ele parece
   pronto. O ⟨sem fonte⟩ existe para o aluno ver o que falta; não quero que ele desapareça cedo
   demais e produza uma falsa sensação de trabalho concluído.

---

## D6 · Convidar colaborador no documento (2026-11-04)

Pedido do dono: *"adicione, em cada conversa do chat que tenha um documento, a opção de convidar
colaborador (para cada documento)… o colaborador pode interagir e alterar o documento em tempo
real. Acho que essa função existia antes mas foi tirada."*

**A memória dele estava certa, e por pouco: a função existe quase inteira — o que não existia era a
porta.** Quarta vez nesta série que auditar antes de construir muda o trabalho (depois do Leitor, do
módulo MCP e do trilho de citação).

| peça | onde já estava |
|---|---|
| papéis `dono/editor/leitor` e `podeEscrever` | `lib/cartolina/access.ts` — puro, "testado exaustivamente" |
| papel do convidado **no documento** | `papelNoWork` (lib/tcc/store) — lê o `CartolinaMembro` da conversa |
| autorização nos **três** caminhos de escrita do documento | `lib/tcc/store.ts` (todas as escritas afunilam em `aplicarNoTcc`) |
| gerar link assinado e **revogar todos** (troca de sal, sem tabela de tokens) | `POST`/`DELETE /api/cartolina/:id/share` |
| tela que recebe o convite, entra e limpa o token da URL | `app/estudo/[id]/page.tsx` |
| painel do documento respeitando papel | `TccPanel` — leitor lê "sem edição"; poll de 6 s realçando o que mudou; `rev` impede que duas edições se apaguem |

**Nenhuma UI chamava o `share`.** O link só saía por `curl`. Isto foi a entrega: o botão, a ponte
que ele precisa, e o tempo real.

### A armadilha que eu quase caí: existe um SEGUNDO sistema de colaboração

`CollabDoc` + `components/lounge/CollabModule.tsx` são um editor colaborativo completo, com Pusher,
presença e convite — e o caminho óbvio seria ligar o documento do chat nele. **Seria errado**, e o
próprio schema diz por quê: *"Cópia editável compartilhada: o original fica intacto. Edição em grupo
acontece só no Lounge."* O colaborador editaria uma CÓPIA, e nada voltaria para o documento — ou
seja, quebraria em silêncio o 1:1 que a série D inteira construiu. O trilho certo era o da
cartolina, que escreve no documento de verdade.

**Segunda armadilha, pega a tempo:** `SURFACE_ESTUDOS` vale `"meus-estudos"`, mas a surface da
cartolina é `"estudos"` (`CARTOLINA_SURFACES`) — e é essa que o `papelNoWork` procura. Ligar a
constante errada geraria um convite que nunca concede nada: link válido, pessoa entrando, e
"sem acesso" na cara dela.

### As duas decisões do dono

1. **Escopo: por conversa, botão em cada documento.** O trilho concede papel pela cartolina, e uma
   conversa tem vários trabalhos — então o convidado edita todos, inclusive os futuros. Alternativa
   (membro por `ResearchWork`) foi recusada, e o cabeçalho do `store.ts` já defendia isso: *"um
   modelo de membros só pro TCC divergiria do da cartolina"*. O `access.ts` avisa que existe UM
   ponto que decide acesso; duplicá-lo por documento criaria o segundo.
   **Consequência obrigatória:** o botão fica DENTRO de um documento, então "convidar para este
   documento" é a leitura natural — e é falsa. Por isso o `escopo: "conversa"` vem do SERVIDOR e a
   frase é montada a partir dele, com teste próprio (`ConvitePainel.test.tsx`). Botão que concede
   mais do que diz é a mentira da F0 por outra porta.
2. **Tempo real: Pusher, com o poll como rede.** O servidor empurra `doc-update` em `tcc-<workId>`
   a cada escrita; o cliente só RELÊ. O poll de 6 s continua: sem env de Pusher, ou se o socket
   cair, a tela atualiza devagar em vez de congelar.

**O evento é um EMPURRÃO, não um payload** — e isso é segurança, não estilo. O canal do Pusher não
passa por `papelNoWork`: mandar o texto do trabalho no evento o entregaria a quem assinasse
`tcc-<id>`. Indo só `{ workId, rev }`, assinar o canal não rende nada a quem não poderia ler pela
rota autenticada. É a mesma doutrina do gráfico — quem tem o dado é quem entrega o dado.

Como todas as escritas afunilam em `aplicarNoTcc`, **um** ponto de aviso cobre tudo: a IA escrevendo
seção por seção, a edição do aluno, sugestão aceita, desfazer e conteúdo manual. Quem está com o
documento aberto vê o trabalho crescer ao vivo, não só a edição do colega.

### O que entrou

- `lib/tcc/compartilhar.ts` — a ponte: autoriza pelo documento (`podeAdministrar`), resolve a
  cartolina da conversa e delega ao trilho existente. **Cria a cartolina se faltar**, e isso é
  obrigatório: o papel do convidado se resolve ATRAVÉS do board, então sem board o convite nasceria
  morto. Conversa sem cartolina é o caso comum — o board só nasce em `memoria-turno.ts`, com
  `CARTOLINA_MEMORIA=1`.
- `POST`/`DELETE /api/tcc/:id/share` — convidar e revogar a partir do documento. `sem_conversa`
  responde 400 com motivo, não 404: o trabalho existe e é seu, só não dá pra compartilhar assim.
- `TccPanel` — botão "Convidar" (só para o dono), painel com link inteiro, copiar, alternar
  editor/leitor e revogar; e a assinatura do Pusher.

**Gates:** 5849 testes (628 arquivos, 0 falhas), `tsc` limpo, `eslint` 0. 15 testes novos: 11 na
ponte (inclusive "editor convidado NÃO convida" e "o convite não pode nascer morto") e 4 na frase do
escopo.

### 🟡 O que NÃO está verificado

1. **Não vi a tela rodando.** Sem banco, sessão e rede neste ambiente, o que eu provei é a lógica e
   o texto do diálogo — não o desenho na tela. Vale um olhar seu no botão e no painel.
2. **O tempo real depende de env que eu não vejo.** `NEXT_PUBLIC_PUSHER_KEY`/`CLUSTER` entram como
   build-arg do `.env` do VPS e `PUSHER_APP_ID`/`PUSHER_SECRET` só no env_file de runtime — nada
   disso passa pelo workflow, então não consigo conferir daqui. Teste barato: se "co-criar" do
   Lounge funciona hoje, isto funciona. Sem Pusher, o recurso **não quebra** — cai no poll de 6 s.
3. **Edição simultânea na MESMA seção** continua resolvida por `rev` (última vence, anterior vai pro
   histórico), não por fusão de texto. Duas pessoas na mesma seção ao mesmo tempo ainda vão se
   atropelar — com desfazer disponível. Presença por seção (a rota `/api/collab/[id]/ping` já
   existe) é o próximo passo natural, e ficou de fora de propósito.

---

## D7 · O pedido deixa de ser fatiado em 160 caracteres (2026-11-04)

Relato do dono: *"o prompt foi computado de maneira literal, o output foi obliterado e saiu
errado"*, com o resultado de um modelo SOTA em anexo como alvo.

**Não foi o modelo que errou — o harness jogava 91% do pedido fora antes de o modelo ver.**

### A medição

Rodei a função real com o pedido real (1754 caracteres):

```
>>> TEMA/TÍTULO EXTRAÍDO ( 160 chars ):
"Você é um redator acadêmico e cientista da computação sênior. Sua tarefa é redigir a primeira
 versão de um artigo científico em conformidade com as diretrizes m"
```

`temaDoPedido()` foi escrita para um caso só — *"crie um TCC **sobre** a fotossíntese"* → *"a
fotossíntese"*. Sem "sobre"/"tema:", ela faz `prompt.slice(0, 160)`. Num briefing, o resultado é o
**preâmbulo da instrução cortado no meio da palavra**. E esse string não era só o título:

| onde entrava | o que causava |
|---|---|
| `esbocoUser(topic)` | o esboço era feito sobre "Você é um redator acadêmico…" |
| `retrievePapers(topic)` | **busca de literatura com esse texto** → fontes sem relação com o tema |
| `baseParaTurno({ pergunta: topic })` | busca na base do aluno idem |
| `{ tema: topic }` no escritor | cada seção escrita sobre a instrução, não sobre o assunto |

As 5 referências obrigatórias, o plano de seções, o vocabulário de marcadores
(`[COMPLETAR:]`, `[VERIFICAR CITAÇÃO]`, `[INSERIR TABELA 1:]`), o tom e os entregáveis estavam
todos nos 1594 caracteres descartados. Pior: sem as fontes do pedido, o escritor recebia as que a
busca achou para uma consulta sem sentido — e o `sys` dele manda citar o que tem na mão.

### As decisões do dono

1. **O briefing manda; o template é o padrão.** Com plano de seções no pedido, ele vence o
   esqueleto ABNT. Sem plano, nada muda.
2. **As referências do pedido substituem a busca.** "Limite-se estritamente a estas" passa a ser
   obedecido: a busca de literatura **não roda**.

### O que entrou

- **`lib/tcc/briefing.ts`** (novo, PURO): lê o pedido e separa o que já está escrito nele — plano
  de seções (inclusive as que o pedido manda **não** redigir, só marcar), referências obrigatórias,
  vocabulário de marcadores e as instruções inteiras (teto de 6000 caracteres). É extração, não
  interpretação: **nada chama modelo e nada é inventado**. Referência só é lida sob um cabeçalho
  explícito ("REFERÊNCIAS OBRIGATÓRIAS/FORNECIDAS/PERMITIDAS") — sem ele não há como distinguir
  bibliografia de qualquer outra lista, e adivinhar seria inventar a bibliografia.
- **`fonteDoPedido()`**: a referência que a pessoa escreveu vira fonte citável. O ABNT sai
  **verbatim** — reformatar a referência de alguém é a maneira mais fácil de corrompê-la. O código
  só DERIVA a citação autor-data, e derivando do próprio texto.
- **`partidaDoPedido()`**: título e seções de partida. Num briefing o título nasce provisório e
  quem nomeia é o esboço — que agora recebe o pedido inteiro e as referências exigidas (o
  `esbocoUser(topic, refs)` sempre teve o parâmetro `refs`; nunca recebia nada).
- **`PedidoSecao.briefing`**: o escritor passa a ver o pedido. E **o marcador do pedido vence o
  nosso**: quem escreve "use `[COMPLETAR: descrição]`" não recebe mais ⟨sem fonte⟩. A regra não
  mudou — não inventar —, mudou a palavra com que a lacuna é marcada; responder noutra língua
  obrigava a pessoa a reescrever o documento inteiro.

**O caminho simples não mudou, e isso tem teste:** `"crie um TCC sobre a fotossíntese"` segue com
`ehBriefing: false`, título "a fotossíntese", esqueleto ABNT e briefing inerte. Os dois testes
legados que quebraram foram atualizados para afirmar exatamente isso — o 4º argumento chega vazio.

**Gates:** 5875 testes (629 arquivos, 0 falhas), `tsc` limpo, `eslint` 0. 26 testes novos, entre
eles o pedido real de produção, verificado item a item contra o PDF do SOTA.

### 🟡 O que NÃO está resolvido

1. **Não rodei contra o modelo.** Provei que o pedido chega inteiro ao prompt, que as seções e as
   referências são as da pessoa e que o marcador é o dela. **Se a redação resultante alcança o PDF
   do SOTA, só um turno real diz** — e isso depende da rede liberada ou do seu teste.
2. **A extração é determinística, e portanto literal.** Ela reconhece "Seção N: título",
   cabeçalhos de referência e marcadores em colchetes. Um pedido que descreva a estrutura em prosa
   corrida ("quero introdução, método e conclusão") **não** é reconhecido e cai no template — de
   propósito: errar a estrutura por adivinhação é pior que usar o padrão.
3. **Sem quadro quando as referências vêm do pedido.** O quadro é "papers por ano" contado da
   busca; sem busca não há contagem, e fabricá-la a partir de 5 referências seria número sem
   lastro.

### D7b · A comparação com o PDF, e os três defeitos que ela achou

Pedido do dono: *"verifica se o resultado ficou igual ao PDF"*. **Não dá para afirmar que ficou —
eu nunca rodei o modelo.** O que dá, e foi feito, é imprimir o PROMPT REAL que o escritor emite
para esse briefing e comparar estrutura contra estrutura. Isso achou três defeitos que nenhum teste
tinha pegado — dois deles introduzidos por mim na própria D7.

**1. `(AL., 2024)` — a citação autor-data quebrada.** `sobrenome()` pega a última palavra do
primeiro autor; em "Wang et al." a última palavra é "al.". O documento sairia mandando citar
`(AL., 2024)` no corpo.

**2. E o pior: duas das cinco referências sumiam em silêncio.** `juntarFontes` deduplica por
CITAÇÃO. Com todas virando `(AL., ano)`, "Wang et al. (2024)" e "Sun et al. (2024)" colapsavam numa
só — e o mesmo com Huang/Zheng em 2023. Num pedido que diz "limite-se estritamente a estas", chegar
com três de cinco é o oposto do pedido. O dump mostrou `(AL., 2024) (AL., 2023) (AL., 2022)`; hoje
mostra `(WANG, 2024) (HUANG, 2023) (LIANG, 2022) (SUN, 2024) (ZHENG, 2023)`, que é exatamente a
forma do PDF.

**3. Vocabulário misturado.** O marcador do pedido substituía o nosso na primeira linha do `sys`,
mas o bloco de fontes seguia dizendo ⟨precisa de fonte⟩ — o mesmo prompt pedindo documento em duas
línguas.

**4. Regressão da própria D7: a bibliografia sem destino.** `referenciasNovas` (D2) procura uma
seção chamada REFERÊNCIAS pra depositar o que foi citado. Quando as seções do pedido passaram a
vencer o template, essa seção deixou de existir — e o documento ficaria com citações no corpo e
nenhuma lista no fim, sem nenhum erro aparecendo. Agora ela é acrescentada quando o pedido não a
traz; é o único acréscimo que fazemos ao plano de alguém, e tem motivo mecânico.

### O que AINDA separa a nossa saída do PDF

Comparando o PDF inteiro (8 páginas) com o que o motor monta:

| no PDF | no nosso motor |
|---|---|
| seções do pedido, renumeradas | ✅ seções do pedido (sem renumerar) |
| só as 5 referências, citadas autor-data | ✅ as 5, com a mesma forma de citação |
| `[COMPLETAR:]` e `[VERIFICAR CITAÇÃO]` | ✅ o marcador do pedido vence o nosso |
| `[INSERIR TABELA 1: …]` nas seções 5 e 6 | ✅ seção "só marcadores" é instruída a não redigir |
| seção **Referências** com as 5 em ABNT | ✅ (depois do item 4 acima) |
| **capa**: título, `[COMPLETAR: autores]`, resumo, palavras-chave | ❌ não produzimos |
| **"Pendências: dados que devem ser fornecidos"** ao fim | ❌ não produzimos |

Os dois ❌ são decisões, não bugs:

- **A capa** o SOTA inferiu (o pedido não a listou). Acrescentar seção que ninguém pediu é
  justamente o tipo de adivinhação que produziu o defeito original — então ficou de fora, e fica
  registrado como escolha.
- **A lista de pendências** o pedido pediu explicitamente ("ao final, forneça uma lista em tópicos
  com todos os dados empíricos exatos"), mas ela **não é uma seção do documento** — é a resposta do
  turno no chat. Como o pedido inteiro foi roteado para a geração de documento, ela se perdeu. Esse
  é um buraco de ROTEAMENTO, não do escritor: hoje um pedido ou vira documento ou vira resposta,
  nunca os dois. Vale uma fase própria.

### D7c · O buraco de roteamento: a entrega que é da RESPOSTA, não do documento

Pedido do dono: *"resolve a lista de pendências no fim, é buraco de roteamento"*.

**O diagnóstico estava certo, e o mecanismo é este:** um pedido pode trazer DUAS entregas — o
documento ("redija as seções 1, 2, 3 e 6") e algo que é da conversa ("ao final, forneça uma lista
em tópicos com todos os dados empíricos que eu preciso fornecer"). O turno é binário: `intent ===
"criar_trabalho"` roteava o pedido inteiro para a geração do documento, e a lista — que não é seção
de trabalho nenhum — não tinha onde cair.

**Onde NÃO estava o defeito, e isso importou para o conserto:** o transporte. A bolha do chat
**já** preserva o `nucleo` do modelo (`resolveHarnessOutput` só descarta `work`, e o comentário "O
ARTEFATO NÃO É MAIS A RESPOSTA" registra que essa lição já tinha sido aprendida uma vez). Então não
havia o que consertar no caminho de saída: faltava **alguém dizer ao modelo** que parte daquele
pedido tinha de sair na mensagem.

**O conserto:** `entregaveisDoTurno()` (puro) reconhece essas frases e `blocoDeEntregaveis()` as põe
no `systemContext` do turno, dizendo o que é: *"isto NÃO é seção do documento; escreva no corpo
desta mensagem… e não diga que vai fornecer depois — forneça agora"*. A última linha não é enfeite:
sem ela, o caminho natural do modelo é prometer, e a rede de honestidade reprovaria a promessa
deixando a resposta pior do que antes.

**A detecção é conservadora de propósito:** exige um marcador de fecho ("ao final", "por fim", "ao
término"…) **junto** de um verbo de entrega. "Liste as referências" no meio do pedido continua
sendo instrução do documento. Errar para o lado de não detectar devolve o comportamento de hoje;
errar para o outro jogaria instrução do documento dentro da resposta — pior, e mais difícil de
perceber.

Um detalhe que o teste pegou: o filtro inicial descartava a frase por comprimento, e o entregável
costuma vir no fim de um parágrafo longo — justamente o caso que importa. Agora o recorte começa no
marcador de fecho em vez de medir a frase inteira.

**Custo zero no caminho simples:** sem entregável, o bloco sai vazio e nenhum turno de hoje ganha
texto novo no prompt. Com teste.

**Gates:** 5889 testes (629 arquivos, 0 falhas), `tsc` limpo, `eslint` 0.

**🟡 Não verificado:** que o modelo de fato produza a lista ao receber o bloco. O bloco está no
system e o `nucleo` chega à bolha — as duas pontas estão provadas; o meio depende de um turno real.

### D7d · A rota que ficou de fora da D7

Um relato de usuária (04/11, depois do deploy da D7) disse que o erro continuava. Procurando por
onde, apareceu uma **terceira porta de criação de documento que a D7 não cobriu**:
`POST /api/tcc { topic }`.

Ela repetia o defeito inteiro, só com outro número: cortava o pedido em **300** caracteres, usava
isso como **título**, montava sempre o `ESQUELETO_TCC` e chamava `gerarTccEmBackground` **sem
briefing**. A D7 consertou as duas portas do CHAT (`tccDoTurno` e `trabalhoDoTurno`); esta é a porta
da API, e eu não a procurei.

Agora ela usa o mesmo `partidaDoPedido` do chat, e o teto passou a ser o do briefing.

**Honestidade sobre o diagnóstico:** `tccApi.criar` não é chamado por nenhuma tela que eu tenha
encontrado, então **provavelmente não é a porta que a usuária usou**. Consertei porque é defeito
real e meu, não porque esteja provado que era a causa dela. O que explica o relato com mais força é
o relógio: o deploy da D7 (#552) terminou **15:44**, e um pedido feito antes disso pegou o código
antigo.

**Gates:** 5890 testes (629 arquivos, 0 falhas), `tsc` limpo, `eslint` 0.

### D7e · A causa real do relato: briefing com documento já aberto virava EDIÇÃO

A D7 estava no ar (deploy #552, 15:44) e o relato da usuária é de DEPOIS disso. Então a correção
não cobria o caso dela, e o diagnóstico anterior (relógio) estava errado.

**A causa, medida:**

```
>>> SEM documento aberto  → novo? true     ← o caminho que a D7 consertou
>>> COM documento aberto  → novo? false    ← o caminho dela
```

`pedeNovoTrabalho` decide entre criar um trabalho e editar o que está aberto. O heurístico
`PARTE_RE` procura "introducao", "metodologia", "referencia", "secao", "resultado", "justificativa"
— porque foi escrito para *"melhore a introdução"*, onde o substantivo É o alvo da edição. **Num
briefing essas mesmas palavras são os NOMES DAS SEÇÕES PEDIDAS.** Resultado: todo pedido elaborado
casava com `PARTE_RE` e era roteado como edição.

E o caminho de edição não passa pelo gerador: aplica `answer.work.sections` sobre o documento
existente. O briefing nunca chega — nem as seções do pedido, nem as referências obrigatórias, nem
os marcadores. **A D7 consertou a criação, e quem já tinha um documento na conversa nunca passava
por ela.** Como a usuária tinha tentado antes, a tentativa anterior deixou um documento aberto — e
foi ele que fez a segunda tentativa cair no caminho errado.

**O conserto:** quem traz plano de seções (≥2) está pedindo um DOCUMENTO, não um ajuste — a não ser
que diga com todas as letras que é pra mexer no que já existe (`EDICAO_EXPLICITA`, verbo de edição
nos primeiros 80 caracteres, apontando para trabalho/documento/artigo/seção).

Controles com teste, nos dois sentidos: "melhore a introdução", "reescreva a seção 2" e "continue o
trabalho" seguem edição; "Atualize o artigo com esta estrutura: Seção 1…" segue edição; e um pedido
longo SEM plano de seções não vira trabalho novo só por ser longo.

**A lição desta série, outra vez:** a D7 foi verificada no caminho que eu escolhi olhar. O caminho
que a usuária usou — conversa que já tinha documento — só apareceu porque alguém de fora usou o
sistema. Três portas de criação (`tccDoTurno`, `trabalhoDoTurno`, `POST /api/tcc`) e um roteador
decidindo antes delas; eu tinha mapeado as portas e não o roteador.

**Gates:** 5895 testes (629 arquivos, 0 falhas), `tsc` limpo, `eslint` 0.

### D8 · A porta que faltava: compartilhar pela CONVERSA

Pergunta do dono, depois de a D6 estar no ar: *"a feature de compartilhar as conversas não subiu?"*

**Tinha subido** (deploy #551, 15:04) — mas a pergunta expôs uma incoerência de desenho que é minha:
o convite da D6 **concede papel na conversa inteira** e a **única porta para ele estava dentro do
painel do documento**. Na prática:

| situação | tinha como convidar? |
|---|---|
| conversa com documento aberto, sendo dono | ✅ botão no painel |
| conversa **sem** documento | ❌ **nenhuma porta** |
| quem procura "compartilhar" na conversa | ❌ não encontra |

Eu entreguei o que foi pedido na hora (*"em cada conversa do chat que tenha um documento…"*), e o
resultado ficou torto: a concessão é da conversa, a porta era do documento.

**O que entrou:** `POST`/`DELETE /api/conversa/share` e um botão **Compartilhar** no slot de ações
da barra de abas — o mesmo lugar do zoom e do mapa, visível com ou sem documento.

**O trilho é o mesmo**, e isso importa: um convite feito pela conversa e um feito pelo documento
são a MESMA coisa (`gerarLink` + `CartolinaMembro` + `papelDe`). Não existem dois sistemas de
permissão, e o diálogo de convite virou arquivo próprio (`components/tcc/ConvitePainel.tsx`) em vez
de ser copiado — duas cópias da frase que explica o escopo seria uma delas envelhecendo calada.

**🔴 O cuidado que esta porta precisou e a do documento não:** lá a autorização vinha do próprio
trabalho. Aqui só existe o `scopeId`, e procurar o board por `{ ownerId: eu, scopeId }` seria um
buraco — quem é MEMBRO da conversa de outra pessoa não acharia o board dela e **criaria um segundo
board do mesmo escopo sob o próprio id**, virando "dono" de uma conversa alheia. Por isso a busca é
por `scopeId` primeiro, e board de outro dono é **recusa, não criação**. Tem teste, e é o teste que
eu olharia primeiro numa revisão.

O resolvedor do board foi extraído para `lib/cartolina/conversa-share.ts` e as duas portas o
importam: duplicá-lo arriscaria consertar um e esquecer o outro — e é exatamente nele que mora a
armadilha da surface (`"estudos"`, não `"meus-estudos"`).

**Gates:** 5904 testes (630 arquivos, 0 falhas), `tsc` limpo, `eslint` 0.

**🟡 Não verificado:** a tela. Sem banco e sem sessão aqui, provei a lógica e a autorização, não o
desenho do botão na barra.

### D9 · O convite virou mensagem colável, e o botão ficou só ícone

Pedido do dono: *"a opção para ser apenas o ícone, e com link (vem estudar comigo sobre ___ aqui na
Zaeon!) algo do tipo. como um link entrável em vez de por email."*

**Duas das três coisas já existiam, e isso mudou o trabalho.** Não havia e-mail em lugar nenhum
deste caminho, e o link já era **entrável**: `/estudo/<boardId>?convite=<token>` → `entrarPorConvite`
(conferido nos dois sentidos — a porta da conversa monta a MESMA forma de URL que a tela de entrada
consome, e se montasse outra o link seria um endereço bonito que não deixa ninguém entrar). O que
faltava era o **texto em volta do link**: o painel copiava o endereço cru.

**A mensagem é pura e testada** (`lib/chat/conviteTexto`), porque decide três coisas que erram caro:

- **O tema.** A conversa não tem título próprio — as abas são "Conversa" + os documentos —, então ele
  vem do trabalho/documento ABERTO, e só depois do primeiro da conversa. E título genérico ou
  provisório é **recusado**: um convite dizendo "vem estudar comigo sobre *Documento em preparação*"
  (o `TITULO_PROVISORIO` que o próprio gerador põe, desta mesma série) é pior que um sem tema nenhum.
- **O papel.** `leitor` recebe "vem acompanhar meus estudos", não "vem estudar comigo": o link dele
  não deixa escrever, e convite que promete mais do que o link dá é a mesma falta de lastro que a
  rede de honestidade persegue no chat.
- **O tamanho e as quebras.** A frase é colada no WhatsApp: título de 300 caracteres ou com `\n` no
  meio quebra a frase e engole o link. Teto de 70 com reticência, uma linha só.

**O que NÃO mudou, de propósito:** a frase do escopo. Ela avisa que o papel vale para a CONVERSA
inteira, inclusive os trabalhos futuros, e tem teste próprio desde a D8. A mensagem amigável é para
quem RECEBE; o aviso de escopo é para quem COMPARTILHA — trocar um pelo outro faria o botão conceder
mais do que diz. Ficam os dois, e um teste novo afirma que o aviso continua na tela.

Sobrou um "copiar só o link" discreto: quem vai colar num lugar que já tem texto não precisa apagar a
frase à mão.

**O botão ficou só ícone**, com `title` e `aria-label` mantidos — sem eles, um botão sem rótulo é
mudo para leitor de tela.

**Um deslize meu, pego por conferência e não por teste:** a variável que eu criei para o tema saiu
com um `е` **cirílico** no nome (homóglifo). O `tsc` passava — é um identificador válido e distinto
do `temaDoConvite` importado —, e o resultado seria uma variável que ninguém consegue grepar. Virou
`temaDaConversa`, em ASCII. Nenhum teste pegaria isso; só olhar os bytes pega.

**Gates:** `tsc` limpo, `eslint` 0, suíte cheia 5964 verdes (com o `env:` do CI reproduzido), +16
testes novos. **Não vi a tela rodando** — provei a mensagem, o papel, o tema e o formato do link.
