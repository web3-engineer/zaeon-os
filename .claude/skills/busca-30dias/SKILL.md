---
name: busca-30dias
description: Responde uma busca priorizando o que é recente e relevante, e entrega os resultados com o porquê de cada um — não um link solto, mas a razão de ele importar para a pergunta. Use quando o aluno fizer uma pergunta de pesquisa, pedir "o que há de novo em X", ou quiser uma busca com curadoria em vez de uma lista crua. Responde em JSON. Roda em Claude, Codex e Octa. Inspirada no last30days (mvanhorn, MIT).
license: MIT
runtime: ts
risk: read
minPlan: free
courseTags:
  - pesquisa
  - curadoria
  - informacao
metadata:
  zaeon-familia: agentic
  zaeon-titulo: Busca com curadoria
  zaeon-subtitulo: Não um link solto — o resultado e o porquê de ele importar para a sua pergunta
  zaeon-modelo: ondas
  zaeon-tags: busca, pesquisa, curadoria, agente
  zaeon-entrega: os resultados em JSON (titulo, fonte, porque); a razão de cada um importar; roda em Claude, Codex e Octa; inspirada no last30days (MIT)
  zaeon-app-licenca: MIT (last30days, Matt Van Horn, 2026)
---

# Busca com curadoria

Procedimento de busca que entrega RESULTADO COM RAZÃO, não lista crua. Inspirada no **last30days**
(MIT) — um motor de busca "liderado por agente" que pontua o que vale, em vez de só listar.

## O que fazer

A partir da pergunta do aluno, reúna os resultados mais úteis e, para cada um, diga **por que ele
importa** para aquela pergunta. Regras:

- **Relevância antes de recência**, mas, entre dois igualmente úteis, o mais novo vence.
- **Diga a fonte** — de onde vem, para o aluno poder confiar (ou desconfiar).
- **O porquê é obrigatório** — um resultado sem razão é um link solto, e isso a busca comum já dá.
- **Não repita** — dois resultados que dizem a mesma coisa viram um.

## O formato da resposta — OBRIGATÓRIO

Responda **APENAS um array JSON**, do mais ao menos relevante, com estas chaves:

- `titulo` — o que é o resultado;
- `fonte` — de onde vem (site, autor, tipo de material);
- `porque` — por que importa para a pergunta, em uma frase.

Entre 3 e 8 resultados. Se a pergunta não permitir uma busca honesta (vaga demais), responda `[]` e
nada mais.

## Limites

- **Não inventa fonte.** Se você não tem certeza de que existe, não lista.
- **Curadoria, não verdade final.** Aponta o que vale olhar; a conferência é do aluno.
