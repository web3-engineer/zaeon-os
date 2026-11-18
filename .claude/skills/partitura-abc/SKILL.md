---
name: partitura-abc
description: Escreve uma melodia curta em notação ABC — exercício de solfejo, escala, arpejo, frase melódica ou ideia de composição — que a página renderiza como partitura e toca com o abcjs. Use quando o aluno de música pedir um exercício de leitura ou de solfejo, uma escala ou arpejo escritos na pauta, um exemplo melódico de um conceito de teoria (intervalo, modo, cadência), ou um ponto de partida para compor. Responde em JSON. Roda em Claude, Codex e Octa. A renderização é do abcjs (Paul Rosen e Gregory Dyke, MIT).
license: MIT
runtime: ts
risk: read
minPlan: free
courseTags:
  - musica
  - teoria-musical
  - solfejo
  - composicao
metadata:
  zaeon-familia: agentic
  zaeon-titulo: Da ideia à pauta
  zaeon-subtitulo: Peça uma escala, um solfejo ou uma frase melódica e receba a partitura em notação ABC, pronta para ver e ouvir
  zaeon-modelo: ondas
  zaeon-tags: música, partitura, notação ABC, abcjs, solfejo, agente
  zaeon-entrega: a melodia em notação ABC válida; tom, compasso e andamento declarados; o conceito de teoria que o exemplo ilustra; roda em Claude, Codex e Octa; renderização e áudio pelo abcjs (MIT)
  zaeon-app-licenca: MIT (abcjs, Paul Rosen e Gregory Dyke)
---

# Da ideia à pauta

Procedimento para escrever uma **melodia curta em notação ABC**, que a página renderiza como
partitura (e toca) com o **abcjs** no navegador do aluno. O abcjs
(https://github.com/paulrosen/abcjs) é a biblioteca open-source de notação ABC, licença **MIT**;
esta skill produz a entrada dele, não o redistribui.

## O que fazer

1. Entenda o pedido: **o que** o aluno quer praticar ou ouvir (escala, intervalo, ritmo, modo,
   cadência) e em que **nível**.
2. Componha uma melodia **original e curta** (4 a 8 compassos) que ilustre exatamente isso.
   Para iniciante: graus conjuntos, âmbito de uma oitava, ritmo simples.
3. Escreva em ABC com o cabeçalho completo, nesta ordem: `X:1`, `T:` (título), `M:` (compasso),
   `L:` (unidade de duração), `Q:` (andamento), `K:` (tom) — o `K:` é sempre a última linha do
   cabeçalho.
4. **Confira a conta de cada compasso**: a soma das durações tem de fechar a fórmula de
   compasso. Compasso que não fecha é o erro que mais aparece — e que mais confunde quem lê.
5. Termine com a barra final `|]`.

Lembrete da notação: `C D E F G A B` é a oitava do dó central, `c d e` a de cima, `C,` a de
baixo; `^F` é fá sustenido, `_B` si bemol; `A2` dobra a duração, `A/2` divide; `z` é pausa;
`|` separa compassos.

## O formato da resposta — OBRIGATÓRIO

Responda **APENAS um objeto JSON**, sem texto em volta, sem cercas de markdown, com EXATAMENTE
estas chaves:

- `titulo` — o nome do exercício;
- `tom` — o tom, como no campo `K:` (ex.: `G`, `Dm`, `Ddor`);
- `abc` — a notação ABC completa, com as quebras de linha como `\n`;
- `conceito` — em uma frase, o que o aluno deve ouvir ou praticar ali.

Exemplo:

```
{"titulo":"Escala de Dó maior","tom":"C","abc":"X:1\nT:Escala de Dó maior\nM:4/4\nL:1/4\nQ:1/4=80\nK:C\nC D E F | G A B c | c B A G | F E D C |]","conceito":"Graus conjuntos subindo e descendo; o semitom fica entre mi-fá e si-dó."}
```

## O que esta skill NÃO faz

- **Não transcreve música protegida por direito autoral.** A melodia é original, ou de obra em
  domínio público identificada pelo nome. Pedido de "a partitura da música X" de artista atual
  recebe um exercício original no mesmo conceito.
- **Não imita a voz nem o estilo de um artista vivo para se passar por ele.**
- **Não substitui o editor de partituras.** Para arranjo completo, o caminho é o card
  `musescore-partituras`.
- **Não renderiza nem toca.** Entrega o ABC; quem desenha e toca é o abcjs, na página.
