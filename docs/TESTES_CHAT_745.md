# Testes do #745 — diagrama que falha, mensagem de erro e erros no console

## O que muda

- **1. Diagrama que sai da área do desenho:** o `autoReparo` (`lib/studio/diagram.ts`) agora conserta sozinho quando uma peça sai da área do desenho. Antes a IA tentava 2 vezes sem conseguir, porque o prompt a proíbe de mexer em `width` e `viewBox`. O conserto faz três coisas:
  - **Aumenta a área** quando o archify diz o tamanho ("set meta.viewBox[0/1] to at least N") ou quando a peça passa da borda: em largura ("exceeds the horizontal bounds"), em altura ("readable diagram area" e "vertical lifecycle area") ou nos dois ("falls outside the viewBox").
  - **No dataflow**, as etapas têm lugar fixo, então crescer a área não salva a 1ª etapa. Ali o nó fica com a largura da etapa (até 168 px) e o rótulo encurta com "…".
  - **Teste refeito:** reproduzi o caso do ar, o sistema digestório com 5 etapas de nomes longos. Antes ele falhava com o erro do esôfago, e agora sai.
- **2. Mensagem de erro simples:** quando um artefato pedido falha, o aluno lê "Não consegui desenhar esse diagrama agora. Pode tentar de novo." e ganha o botão **↻ tentar de novo** (`lib/studio/falhaArtefato.ts`).
  - O motivo técnico vai para o console do navegador, sem repetir.
  - Motivo que já é para gente, como o limite do plano, continua aparecendo.
  - O próprio gerador já não repete o mesmo diagnóstico.
- **3. Erros no console dos gráficos:** o SVG dos gráficos da Aura (`lib/agent/grafico.ts`) não tem mais `height="auto"` como atributo. A altura foi para o `style`. Eram cerca de 200 erros no console numa conversa.
- **4. Instruções do diagrama:** revisei as mensagens do archify que pedem campos proibidos à IA. As de área (viewBox) entraram no conserto automático. As de rótulo (labelDx/labelDy) e largura de rótulo já eram consertadas antes.

## Para Martinez

- **Arquivos mexidos:**
  - `lib/studio/diagram.ts` (só o `autoReparo` e o texto do motivo);
  - `lib/agent/grafico.ts` (o cabeçalho do SVG);
  - a bolha de falha do chat (`StudyCoworkChat.tsx`).
- **Não mexe no harness nem no prompt do diagrama.**
- **Não precisa de `prisma db push`.**

## Testes automáticos

- `lib/studio/diagram.test.ts`:
  - o sistema digestório de 5 etapas sai, rodando o archify de verdade;
  - o `autoReparo` aumenta a área em sequence, lifecycle e architecture.
- `lib/studio/falhaArtefato.test.ts` (novo): a frase simples, o motivo para gente, a frase padrão e sem repetir.
- `lib/agent/grafico.test.ts`: o SVG sem `height="auto"`. Esse teste falha sem a correção.

## Como testar em produção

1. **Diagrama:** numa conversa, mande "faça um diagrama do sistema digestório". O diagrama tem que sair.
2. **Mensagem de erro:** se algum diagrama ainda falhar, aparece "Não consegui desenhar esse diagrama agora. Pode tentar de novo." e o botão **↻ tentar de novo**. Não aparece texto em inglês.
3. **Tentar de novo:** clique no botão. O aviso some, aparece "Desenhando o diagrama interativo…" e o diagrama é pedido de novo.
4. **Console:** abra o F12, aba Console, e peça um gráfico (por exemplo, "faça um gráfico da população do Brasil por região"). Não aparecem mais os erros `<svg> attribute height`.
