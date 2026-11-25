# Testes do #832 — telas que quebram no celular

Registro feito depois (22/11): o PR #833 (mergeado em 16/11) entrou sem o documento de testes.

## O que muda

- **1. Celular deitado** (`lib/ui/useIsMobile.ts`): nova `QUERY_CELULAR` (`max-width: 767px` ou `max-height: 500px` com toque), só no laboratório. Deitado: barra de baixo com 44 px (só ícones), sem o vão do topo, caixa de escrever com menos folga. O ⌄ "ir para o final" não cobre mais o "Traçar percurso".
- **2. Documentação** (`public/docs/index.html`): em 375 px a página tem 375 px (antes 805); só os `<pre>` rolam de lado.
- **3. Marketplace:** a vitrine não é reaberta como última aba (o app reabre na conversa); o detalhe de curso vai pro `<body>` (`createPortal`) e não abre mais cortado.
- **4. "Voltar" do Android** (`lib/ui/useFecharNoVoltar.ts`, novo): com um painel aberto, o ◀ fecha o painel em vez de sair. Aplicado em detalhe de curso, gaveta do Menu, Studio, Biblioteca, Árvore, Blueprint REA e opções da conversa.
- **5. Toques:** botões que só apareciam com o mouse ficam visíveis no toque; campos com 16 px no celular (o iPhone não dá zoom).

## Para o Martinez

- Cyberespaço (`CenaCyber.tsx`, `LoungeSala3D.tsx`, `Cartolina3D.tsx`): só a letra do campo "Falar na sala".
- Laboratório (`app/research-lab/page.tsx`): gaveta e barra de baixo do celular.

## Testes automáticos

- `lib/ui/useFecharNoVoltar.test.tsx` (novo, 5 casos) e o caso do celular deitado em `lib/ui/useIsMobile.test.tsx`.
- CI do fork verde (giu8550/zaeon-os#59).

## Como testar em produção (celular)

1. Deitado: a barra de baixo aparece com ícones e cabem pelo menos 3 linhas de conversa.
2. Abrir o Menu e apertar ◀: o Menu fecha (não sai do app).
3. Marketplace → detalhe de um curso → ◀: o detalhe fecha.
4. Fechar e reabrir o app estando na vitrine: abre na conversa.
5. `/docs` no celular: nada rola de lado, só os blocos de código.
6. Tocar em "buscar blueprint" ou na caixa do Escritório no iPhone: a tela não dá zoom.

## Resultado dos testes da Giulia

- 17/11 (app reinstalado): ❌ **Menu de baixo → Marketplace não abria** — efeito colateral deste PR (`useFecharNoVoltar` desfazia o endereço ao fechar o Menu). **Corrigido no #846** (#845 PR 1).
- **25/11 (Android da Giulia, app instalado, depois do #876 no ar):**

| Teste | Resultado |
|---|---|
| 1. Deitado: barra de baixo com ícones e 3 linhas de conversa | ✅ no chat da Aura (3 linhas, no limite) |
| 2. ◀ fecha o Menu | ✅ o Menu de baixo fecha e o app continua |
| 3. ◀ fecha o detalhe do curso | ✅ abriu inteiro (com o ✕) e o ◀ voltou pra vitrine |
| 4. Reabrir o app estando na vitrine | ✅ abriu na conversa da Aura |
| 5. `/docs` sem rolar de lado | ✅ (navegador do celular) |
| 6. Zoom no iPhone | — sem iPhone pra testar |

- **Achados novos (ficam pro card de telas, fora deste PR):**
  - Escritório deitado: cabe só 1 linha de conversa (o topo ZAEON e a fileira de agentes ocupam o resto).
  - Gaveta da esquerda deitada: apertada, a lista de conversas quase não aparece.
  - ◀ com o menu de CIMA (o ☰ ao lado da lua) aberto fecha o app — esse menu não entrou no `useFecharNoVoltar`.
