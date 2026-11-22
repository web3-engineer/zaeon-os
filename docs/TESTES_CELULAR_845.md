# Testes do #845 — acabamento do celular

Registro feito depois (22/11): os PRs #846 (PR 1, mergeado em 17/11) e #849 (PR 2, mergeado em 18/11)
entraram sem o documento de testes.

## O que muda

### PR 1 (#846) — o que estava quebrado
- **Menu de baixo → Marketplace abre** (antes fechava e voltava pra conversa): quem troca o endereço tira a marca do Menu junto (`estadoSemPainel`) e o `popstate` de painel fechando é avisado (`voltaDePainel()`).
- **O teclado não abre sozinho** em tela de toque (`useAutoFoco` + `telaDeToque()`).
- **A barra de baixo não some sem teclado:** `useTecladoAberto` pede campo em foco **e** tela encolhida (`visualViewport`).
- **A faixa do Studio** (Guia, Mapa mental…) rola só dentro dela; a conversa não rola mais de lado.
- **Modo Foco com saída:** botão "Sair do foco" e o ◀ do Android desligam o Foco.

### PR 2 (#849) — acabamento
- Painel do **"Aura ▾"** em linhas com título; mentor e modelo abrem dentro do painel.
- **Nome do mentor** ("Osler"), não o slug ("Medicina").
- **Biblioteca** vira item do Menu (a faixa saiu da conversa).
- Atalhos do Studio depois dos artefatos da resposta.
- Menu: nome da conversa não espreme; sem vão entre Escritório e Marketplace; ícone ☰ de linha.
- Deitado: selo "Com …" na linha da caixa; resposta na largura toda.
- **Mapa do Cérebro** segue o tema claro; trocar o tema não fecha o mapa.
- Detalhe de curso no computador no meio da tela.
- Escritório: o lado direito do topo encolhe e rola em vez de cortar.
- Botões das respostas com 40 px; a Zaeon não manda apertar "F5".

## Para o Martinez

- `components/sub/ThemeToggle.tsx` (navbar): só o atributo `data-fica-cerebro`.
- `lib/ui/useMarketplaceNoLab.ts` (do #824): só o alinhamento do endereço.

## Testes automáticos

- `lib/ui/celular845.test.tsx` (6): Marketplace pelo Menu nas duas ordens, ◀ da pessoa, sem autofoco no toque, barra só com teclado de verdade.
- Ajustados: `ConversasSidebar.dia.test.tsx` e `DetalhesBuild`.
- Suíte completa de cada PR: sem falhas novas em relação à main. i18n 762 chaves.

## Como testar em produção (celular)

1. Menu de baixo → Marketplace: abre; ◀ volta pra conversa.
2. Abrir a conversa: o teclado não sobe sozinho.
3. Sair pro WhatsApp e voltar: a barra de baixo continua lá.
4. Depois de uma resposta com Guia/Mapa mental: a conversa não rola de lado.
5. Menu → Foco: aparece "Sair do foco"; o botão e o ◀ saem do Foco.
6. "Aura ▾": opções em linhas com título; mentor e modelo abrem inteiros.
7. Com um mentor: o topo mostra o nome ("Osler ▾").
8. Menu → Biblioteca abre; a faixa "Biblioteca" não aparece na conversa.
9. Deitado: mais linhas de conversa; selo na linha da caixa.
10. Mapa (bolinha) no tema claro: fica claro, e trocar o tema não fecha.
11. Computador, Marketplace → detalhes: painel no meio, moldura inteira.

## Resultado dos testes

- Os itens da PR 1 vieram do teste da Giulia de 17/11 (app reinstalado): Menu → Marketplace e barra de baixo sumindo ❌ → corrigidos aqui.
- Auditoria em 375 px (18/11, PR 2 ainda não no ar): nenhuma tela rola de lado; a faixa do Studio já rola só dentro dela ✅.
- **Falta a Giulia testar no celular:** itens 1 a 11 acima.
