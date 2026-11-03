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
