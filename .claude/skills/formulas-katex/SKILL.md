---
name: formulas-katex
description: Resolve um exercício de matemática passo a passo e entrega cada passo com a fórmula em LaTeX pronta para o KaTeX renderizar na página — a conta aparece tipografada como no livro, não como texto corrido. Use quando o aluno pedir a resolução passo a passo de uma equação, derivada, integral ou sistema, quiser ver a conta bem formatada, ou precisar do LaTeX de uma fórmula. Responde em JSON (um passo por item). Roda em Claude, Codex e Octa. A renderização é do KaTeX (Khan Academy e contribuidores, MIT).
license: MIT
runtime: ts
risk: read
minPlan: free
courseTags:
  - matematica
  - calculo
  - algebra
  - latex
metadata:
  zaeon-familia: agentic
  zaeon-titulo: Resolução passo a passo, tipografada
  zaeon-subtitulo: Cada passo da conta com a fórmula em LaTeX que a página renderiza com KaTeX — em qualquer modelo
  zaeon-modelo: livro
  zaeon-tags: matemática, LaTeX, KaTeX, passo a passo, agente
  zaeon-entrega: a resolução em passos numerados; a fórmula de cada passo em LaTeX compatível com KaTeX; a justificativa de cada passo em uma frase; roda em Claude, Codex e Octa; renderização pelo KaTeX (MIT)
  zaeon-app-licenca: MIT (KaTeX, Khan Academy e contribuidores)
---

# Resolução passo a passo, tipografada

Procedimento para resolver um exercício de matemática **em passos**, entregando a fórmula de cada
passo em **LaTeX** que o **KaTeX** renderiza no navegador do aluno. O KaTeX
(https://github.com/KaTeX/KaTeX) é a biblioteca de tipografia matemática da Khan Academy,
licença **MIT**; esta skill produz a entrada dele, não o redistribui.

## O que fazer

1. Leia o exercício e identifique o que se pede (resolver, derivar, integrar, simplificar).
2. Resolva em **passos pequenos**: cada passo aplica UMA regra ou UMA operação. Passo que faz
   três coisas de uma vez é onde o aluno se perde.
3. Em cada passo, escreva a expressão resultante em LaTeX e diga, em uma frase, **qual regra**
   levou do passo anterior a este.
4. O último passo traz a resposta final. Confira-a substituindo de volta (ou derivando a
   primitiva) antes de responder.

## O formato da resposta — OBRIGATÓRIO

Responda **APENAS um array JSON**, sem texto em volta, sem cercas de markdown. Cada passo é um
objeto com EXATAMENTE estas chaves:

- `passo` — o número do passo (1, 2, 3…);
- `latex` — a expressão deste passo em LaTeX compatível com KaTeX, **sem** os delimitadores `$`
  e com as barras invertidas escapadas como o JSON exige (`\\frac`, `\\sqrt`);
- `explicacao` — a regra ou operação aplicada, em uma frase em português.

Exemplo de DOIS itens:

```
[{"passo":1,"latex":"2x + 6 = 10","explicacao":"Equação original."},{"passo":2,"latex":"2x = 4","explicacao":"Subtrai 6 dos dois lados."}]
```

Use só comandos que o KaTeX suporta (`\\frac`, `\\sqrt`, `\\int`, `\\lim`, `\\sum`, `^`, `_`,
`\\cdot`, `\\pm`, `\\Rightarrow`). Nada de pacotes ou macros de LaTeX completo.

## O que esta skill NÃO faz

- **Não entrega só a resposta final.** O valor está nos passos; resposta seca não ensina.
- **Não resolve prova em andamento.** Se o pedido for claramente uma avaliação acontecendo
  agora, a skill explica o método com um exemplo parecido em vez de resolver a questão.
- **Não inventa passo para parecer rigorosa.** Se o problema não tem solução fechada, o último
  passo diz isso.
- **Não é prova formal.** É resolução didática; demonstração rigorosa é outro gênero.
