---
name: lgpd-scan
description: Varredura rápida de LGPD num trecho de código — aponta onde dados pessoais são tratados sem base legal, sem minimização ou sem segurança, com a base legal correta. Use quando o pedido for revisar código do ponto de vista de privacidade, LGPD, dados pessoais, consentimento ou vazamento. Responde em JSON. Roda igual em Claude, Codex e Octa. Inspirada no toolkit lgpd-skills (goul4rt, MIT); é a versão enxuta de triagem, não o parecer jurídico completo.
license: MIT
runtime: ts
risk: read
minPlan: free
courseTags:
  - privacidade
  - lgpd
  - seguranca
  - engenharia-de-software
metadata:
  zaeon-familia: agentic
  zaeon-titulo: Varredura LGPD do seu código
  zaeon-subtitulo: Aponta dado pessoal tratado sem base legal, sem minimização ou sem segurança — em JSON, em qualquer modelo
  zaeon-modelo: chip
  zaeon-tags: LGPD, privacidade, segurança, código, agente
  zaeon-entrega: a lista de achados em JSON (trecho, base_legal, severidade); a base legal correta de cada tratamento; roda em Claude, Codex e Octa; inspirada no lgpd-skills (MIT)
  zaeon-app-licenca: MIT (lgpd-skills, goul4rt, 2026)
---

# Varredura LGPD do seu código

Procedimento de TRIAGEM de privacidade sobre um trecho de código, sob a LGPD (Lei 13.709/2018).
É a versão enxuta — aponta os pontos de atenção —, não o parecer jurídico completo (esse é o
toolkit `lgpd-skills`, de goul4rt, MIT, que inspira esta skill).

## O que fazer

Leia o código que o aluno enviar e encontre **tratamentos de dado pessoal** que mereçam atenção:

- dado pessoal coletado, gravado, logado ou enviado a terceiro **sem base legal clara**;
- **falta de minimização** (coleta ou retenção além do necessário);
- **falta de segurança** (dado sensível em texto puro, log com CPF/e-mail, segredo no código);
- **ausência de controle do titular** (sem apagar, sem exportar, sem consentimento quando ele é a base).

## O formato da resposta — OBRIGATÓRIO

Responda **APENAS um array JSON**, sem texto em volta, sem cercas de markdown. Cada achado é um
objeto com EXATAMENTE estas chaves:

- `trecho` — o pedaço do código (ou a linha) onde está o problema;
- `problema` — o que está errado, em uma frase;
- `base_legal` — a base legal do Art. 7º/11 que se aplicaria (ex.: "consentimento", "legítimo
  interesse", "obrigação legal", "execução de contrato") ou `"indefinida"` quando falta;
- `severidade` — `"alta"`, `"media"` ou `"baixa"`.

Exemplo de UM item:

```
[{"trecho":"logger.info(user.cpf)","problema":"CPF em log em texto puro","base_legal":"indefinida","severidade":"alta"}]
```

Se o código não tratar dado pessoal nenhum, responda `[]` (array vazio) — nunca invente um achado
para preencher.

## Limites

- **Triagem, não parecer.** Aponta onde olhar; a decisão jurídica é de um DPO/advogado.
- **Não corrige o código** — só aponta. A correção é outro passo.
- **Não inventa base legal.** Quando não dá para saber, é `"indefinida"`.
