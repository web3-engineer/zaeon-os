---
name: geometria-jsxgraph
description: Transforma um enunciado de geometria ou de funções numa construção dinâmica — pontos, retas, segmentos, círculos, polígonos e gráficos de função — descrita em JSON para a página desenhar com o JSXGraph, onde o aluno arrasta os pontos e vê a figura reagir. Use quando o aluno pedir para desenhar um triângulo, uma circunferência, uma mediatriz, uma bissetriz, o gráfico de uma função, ou quiser visualizar um teorema de geometria mexendo na figura. Responde em JSON. Roda em Claude, Codex e Octa. A renderização é do JSXGraph (Universidade de Bayreuth, MIT ou LGPL).
license: MIT
runtime: ts
risk: read
minPlan: free
courseTags:
  - matematica
  - geometria
  - funcoes
  - geometria-analitica
metadata:
  zaeon-familia: agentic
  zaeon-titulo: Geometria dinâmica — a figura que se mexe
  zaeon-subtitulo: Descreva a construção e receba a figura interativa, com pontos que você arrasta — em qualquer modelo
  zaeon-modelo: planta
  zaeon-tags: geometria, JSXGraph, geometria dinâmica, funções, agente
  zaeon-entrega: a construção em JSON, um elemento por item; pontos livres que o aluno arrasta e elementos dependentes que acompanham; o gráfico de funções; roda em Claude, Codex e Octa; renderização pelo JSXGraph (MIT ou LGPL)
  zaeon-app-licenca: MIT OR LGPL-3.0-or-later (JSXGraph, Matthias Ehmann, Michael Gerhäuser, Carsten Miller, Alfred Wassermann e contribuidores — Universidade de Bayreuth)
---

# Geometria dinâmica — a figura que se mexe

Procedimento para transformar um enunciado numa **construção de geometria dinâmica**, descrita em
JSON, que a página desenha com o **JSXGraph** no navegador do aluno. O JSXGraph
(https://github.com/jsxgraph/jsxgraph) é a biblioteca open-source de geometria interativa e
gráficos de função da Universidade de Bayreuth, com **dupla licença MIT ou LGPL** (declarada no
`package.json`, no README e nos arquivos `LICENSE.MIT` e `LICENSE.LGPL` do repositório). Esta
skill produz a entrada dele, não o redistribui.

## O que fazer

1. Leia o enunciado e separe o que é **livre** (os pontos que o aluno poderá arrastar) do que é
   **dependente** (o que se constrói a partir deles: reta por dois pontos, ponto médio,
   perpendicular, círculo por centro e ponto).
2. Construa **na ordem da dependência**: um elemento só pode citar, em `pais`, o `nome` de
   elementos que vieram ANTES na lista.
3. **Dependente é dependente.** Ponto médio é `midpoint` dos dois pontos, nunca um `point` com a
   coordenada calculada à mão — senão a figura quebra quando o aluno arrasta. É a construção
   correta que faz o teorema aparecer.
4. Use só o que foi pedido, com até ~15 elementos, e coordenadas dentro de −8 a 8.

Tipos aceitos (os nomes são os do `board.create` do JSXGraph):

| `tipo` | `pais` |
|---|---|
| `point` | `[x, y]` (números) — ponto livre |
| `segment`, `line` | dois nomes de ponto |
| `midpoint` | dois nomes de ponto |
| `perpendicular`, `parallel` | uma reta ou segmento e um ponto |
| `bisector` | três pontos (o do meio é o vértice) |
| `intersection` | dois nomes de reta ou círculo, e o índice `0` ou `1` |
| `circle` | o centro e um ponto da circunferência |
| `polygon` | três ou mais nomes de ponto |
| `functiongraph` | uma expressão em `x` como texto, ex.: `"x^2 - 3*x + 2"` |

## O formato da resposta — OBRIGATÓRIO

Responda **APENAS um array JSON**, sem texto em volta, sem cercas de markdown. Cada elemento é
um objeto com EXATAMENTE estas chaves:

- `nome` — o rótulo do elemento, único (`A`, `B`, `r`, `M`, `c1`);
- `tipo` — um dos tipos da tabela;
- `pais` — a lista de que o elemento depende, como na tabela;
- `papel` — em poucas palavras, o que o elemento é na construção.

Exemplo (a mediatriz de um segmento):

```
[{"nome":"A","tipo":"point","pais":[-3,0],"papel":"ponto livre"},{"nome":"B","tipo":"point","pais":[3,1],"papel":"ponto livre"},{"nome":"s","tipo":"segment","pais":["A","B"],"papel":"o segmento AB"},{"nome":"M","tipo":"midpoint","pais":["A","B"],"papel":"ponto médio de AB"},{"nome":"m","tipo":"perpendicular","pais":["s","M"],"papel":"mediatriz de AB"}]
```

## O que esta skill NÃO faz

- **Não demonstra o teorema.** A figura que se mexe convence e dá a intuição; a prova é outro
  passo, e é do aluno.
- **Não desenha a figura.** Entrega a construção; quem desenha e deixa arrastar é o JSXGraph,
  na página.
- **Não inventa elemento que o enunciado não pediu** para a figura "ficar completa".
- **Não usa o GeoGebra.** A licença dele não cobre uso comercial; esta skill é construída sobre
  uma biblioteca de licença aberta.
