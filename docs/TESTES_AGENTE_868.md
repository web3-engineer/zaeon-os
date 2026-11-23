# Testes do #868 — agente do Escritório: pedido vago vira resposta sobre assunto aleatório

Achado no teste da Giulia em 21/11, no escritório zaeon-OS.

## O que muda

- **O caso:** "`@zaeon` me ajude com resumi" (sem dizer do quê) virou o resumo de um caso de motorista de caminhão, citando "Direito profissional — questões de prova (MMLU pt) — parte 40". O caso não existia em nenhuma mensagem do escritório.
- **Causa:** a busca na base (`lib/rag/turno.ts`) deixa passar trecho que casa **por texto** mesmo com similaridade baixa. Com um pedido sem assunto, qualquer trecho que tenha "resumo" ou "ajuda" passa, e o agente tratava esse trecho como o tema.
- **Correção** (`lib/canal/pedidoVago.ts`, `lib/canal/agent-turn.ts`):
  - `lerPedido` tira as palavras de pedido ("resume", "ajuda", "explica"…) e as de ligação ("me", "com", "isso", "por favor"…). Se não sobra nenhuma palavra de assunto, **o turno não consulta a base**.
  - Se a pessoa pediu uma ação sem assunto (`vago`), o agente recebe uma instrução: usar a conversa do canal e, se ela não deixar claro, **perguntar em uma frase** ("Resumo de quê? Me manda o texto, o arquivo ou o assunto.") em vez de escolher um tema.
  - Pedido com assunto ("resume o capítulo 3 de fotossíntese", "qual a capital da Austrália") segue igual, com a base.
- Só o turno do Escritório muda. O chat da Aura e o limite de similaridade da base não foram mexidos.

### Ajustes da revisão (Sourcery, PR #871)
- Cumprimento sem assunto ("oi, tudo bem?", "bom dia, gente") agora também **não busca na base**. Antes, "tudo" e "gente" contavam como assunto.
- Mais pedidos de ação contam como vagos: "ensina", "calcule", "resolve", "mostra", "compara"…
- "me dá uma força" e "uma mão" também contam como pedido de ajuda. "Força" e "luz" sozinhas continuam sendo assunto, porque são temas de física.
- Uma letra maiúscula sozinha é assunto ("me ajuda com C", "explica R").
- A instrução de perguntar vai **primeiro** no contexto do agente. O harness corta o contexto em 4000 caracteres, e no fim ela podia sumir.

## Para o Martinez

- Nada da área dele.
- Não precisa de `prisma db push`.

## Testes automáticos

- `lib/canal/pedidoVago.test.ts` (novo):
  - o caso do card é vago e sem assunto;
  - 7 pedidos vagos ("resume", "me ajuda", "pode fazer um resumo?"…);
  - 6 pedidos com assunto continuam com a base;
  - cumprimento ("oi") não busca na base, mas também não manda perguntar;
  - a instrução manda usar a conversa e, sem ela, perguntar;
  - a amarração no `agent-turn.ts` (sem base quando não há assunto; instrução quando é vago).
- Revisão do #871: casos novos de cumprimento ("oi, tudo bem?" sem base), verbos novos, "uma força"/"uma mão", "C" e "R", "força peso" e "o que é luz?" com assunto, e a instrução primeiro no contexto.
- `lib/canal/agent-turn.test.ts` continua passando (66 testes nos dois arquivos).
- Suíte completa (23/11): 836 arquivos, 8040 testes passando. As falhas são as mesmas da main, mais o `lib/rag/docx.test.ts`, que é instável.

## Como testar em produção (depois do deploy)

1. Num escritório, sem ter falado de nada antes: "`@zaeon` me ajude com resumi". O agente **pergunta** o que resumir e não cita nenhuma referência.
2. Depois de colar um texto no escritório: "`@zaeon` resume isso". Ele resume **o texto da conversa**.
3. "`@zaeon` resume o ciclo de Krebs": responde normalmente, e pode citar a base.
4. "`@zaeon` explica": pergunta o que explicar.
5. "`@zaeon` oi, tudo bem?": responde ao cumprimento, sem citar referência da base.
6. "`@zaeon` me dá uma força": pergunta com o quê.

## Resultado dos testes

| Teste | Resultado |
|---|---|
| 1. Pedido vago sem conversa | ⏳ falta testar |
| 2. "resume isso" com texto na conversa | ⏳ falta testar |
| 3. Pedido com assunto | ⏳ falta testar |
| 4. "explica" sozinho | ⏳ falta testar |
| 5. Cumprimento sem base | ⏳ falta testar |
| 6. "me dá uma força" | ⏳ falta testar |
