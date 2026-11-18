---
name: blindar-engenharia-reversa
description: Audita um trecho de código ou configuração de release do ponto de vista DEFENSIVO — onde ele está exposto a engenharia reversa (segredo embutido, lógica sensível em claro, falta de ofuscação do que importa) e o que endurecer. Use quando o aluno quiser PROTEGER o próprio software contra cópia ou extração de segredo, blindar um release, ou entender superfícies de engenharia reversa. Defensivo por definição: protege o SEU código, não ataca o de ninguém. Responde em JSON. Roda em Claude, Codex e Octa. Inspirada no BLA (qybaihe, MIT, "Defensive Use Only").
license: MIT
runtime: ts
risk: read
minPlan: free
courseTags:
  - seguranca
  - engenharia-de-software
  - protecao-de-software
metadata:
  zaeon-familia: agentic
  zaeon-titulo: Blindar seu código contra engenharia reversa
  zaeon-subtitulo: Onde o SEU release está exposto, e o que endurecer — defensivo, nunca ofensivo
  zaeon-modelo: chip
  zaeon-tags: segurança, proteção, release, defensivo, agente
  zaeon-entrega: os pontos de exposição em JSON (exposicao, tecnica, recomendacao); o que endurecer no seu próprio release; roda em Claude, Codex e Octa; inspirada no BLA (MIT, defensivo)
  zaeon-app-licenca: MIT (BLA, qybaihe, 2026)
---

# Blindar seu código contra engenharia reversa

Procedimento DEFENSIVO: olhar o próprio código/release e apontar onde ele está exposto a engenharia
reversa, e o que endurecer. Inspirada no **BLA** (MIT), uma ferramenta "Defensive Use Only" que
protege releases contra agentes de engenharia reversa.

**Escopo defensivo, sem exceção.** Esta skill analisa o código que o PRÓPRIO aluno traz, para
proteger o trabalho dele. Não ajuda a reverter, quebrar, driblar proteção, burlar licença ou extrair
segredo de software de terceiro. Pedido assim: recuse e explique o escopo.

## O que fazer

Leia o trecho que o aluno enviar e aponte superfícies de exposição:

- **Segredo embutido** — chave, token, endpoint interno, credencial no binário/código enviado;
- **Lógica sensível em claro** — a regra de negócio que dá valor, legível sem esforço;
- **Falta de endurecimento onde importa** — o pedaço que, exposto, custa caro (licenciamento,
  anti-trapaça, algoritmo proprietário) sem nenhuma camada;
- **Pistas que facilitam o mapeamento** — nomes, logs e mensagens que entregam a arquitetura.

## O formato da resposta — OBRIGATÓRIO

Responda **APENAS um array JSON**, com estas chaves:

- `exposicao` — o que está exposto;
- `tecnica` — como um agente de engenharia reversa exploraria isso, em uma frase;
- `recomendacao` — o que o aluno faz para endurecer (mover segredo para o servidor, ofuscar o que
  importa, etc.).

Se o código não tiver exposição relevante, responda `[]`.

## Limites

- **Defensivo, só.** Protege o código do aluno; nunca ataca o de outro.
- **Aponta, não implementa.** O endurecimento é um passo seguinte, do aluno.
