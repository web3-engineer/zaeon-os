---
name: inkscape-vetorial
description: Entrega o Inkscape, o editor open-source de gráficos vetoriais (SVG) — logotipos, ícones, ilustrações, pôsteres científicos e figuras para artigo — com a instalação e o roteiro da primeira arte. Use quando o aluno quiser criar um logo, um ícone, um pôster ou banner de congresso, vetorizar um desenho, editar um SVG ou PDF, ou perguntar por uma alternativa livre ao Illustrator ou ao CorelDRAW. É um app de DISPOSITIVO — o aluno baixa e roda no computador dele; a Zaeon entrega o espelho e as instruções, não executa o app. Inkscape (Inkscape Developers, GPL).
license: GPL-3.0-or-later
runtime: ts
risk: read
minPlan: free
courseTags:
  - design
  - design-grafico
  - ilustracao
  - comunicacao-visual
metadata:
  zaeon-familia: device
  zaeon-titulo: Inkscape — desenho vetorial livre
  zaeon-subtitulo: Logos, ícones, pôsteres e figuras de artigo em SVG, no seu computador
  zaeon-modelo: ondas
  zaeon-tags: Inkscape, design, SVG, vetor, ilustração, open source
  zaeon-entrega: o espelho oficial do Inkscape (GPL); a diferença entre vetor e pixel; as ferramentas de forma, nó e caminho; operações booleanas para construir um logo; exportação em SVG, PDF e PNG no tamanho certo
  zaeon-device-plataforma: windows
  zaeon-device-mirror: https://inkscape.org/release/
  zaeon-app-licenca: GPL (Inkscape, Inkscape Developers; código-fonte majoritariamente GPL-2.0-or-later, binários sob GPL-3.0-or-later)
---

# Inkscape — desenho vetorial livre

Procedimento para instalar e começar no **Inkscape**, editor open-source de gráficos vetoriais.
Código-fonte em https://gitlab.com/inkscape/inkscape. Licença: a maior parte do código é
**GPL-2.0-or-later** e os binários completos saem sob **GPL-3.0-or-later** (está no `COPYING` do
repositório). O que o aluno DESENHA é dele — a GPL cobre o programa, não as obras.

Este é um card de **dispositivo**: o app roda **no computador do aluno**, não no servidor da
Zaeon. A casa entrega o espelho oficial de download e estas instruções.

## Instalação

**Baixe** pelo espelho do card (a página oficial de releases). O card marca Windows por ser o caso mais comum; os instaladores de **macOS** e **Linux** estão na mesma página.

## Vetor × pixel — explique primeiro

Foto é uma grade de **pixels**: ampliou, borrou. Vetor é **geometria** (pontos e curvas):
amplia do tamanho de um selo ao de um outdoor sem perder nada. Logo, ícone e figura de artigo
são trabalho de vetor.

## A primeira arte

1. **Formas** — retângulo (R), elipse (E), estrela (*). Ctrl mantém a proporção.
2. **Preenchimento e contorno** — Ctrl+Shift+F. Clique na paleta = preenchimento;
   Shift+clique = contorno.
3. **Nós** (N) — todo desenho é feito de nós e alças; a caneta Bézier (B) cria os seus. Menos
   nós, curva mais limpa.
4. **Booleanas** (menu *Caminho*) — União, Diferença, Interseção. Um logo quase sempre é meia
   dúzia de formas simples combinadas assim.
5. **Alinhar** — Ctrl+Shift+A. Alinhamento no olho é o que denuncia o amador.
6. **Texto → Caminho** (Ctrl+Shift+C) antes de enviar à gráfica, para não depender da fonte.

## Exportar

- **SVG** para web e para continuar editando; **PDF** para gráfica e para LaTeX.
- **PNG** (Ctrl+Shift+E) com a largura em pixels pedida; 300 dpi para impressão.
- Pôster de congresso: crie o documento JÁ no tamanho final (ex.: 90 × 120 cm).

## O que esta skill NÃO faz

- **Não executa o app no servidor da Zaeon.** É dispositivo: roda na máquina do aluno.
- **Não redistribui o instalador.** O espelho aponta para a página oficial do projeto.
- **Não copia marca de terceiro.** Redesenhar logo alheio para usar como se fosse dele é
  violação de marca; o aluno cria a própria identidade.
- **Não falsifica documento, selo, carimbo ou assinatura.** Pedido nessa direção não é atendido.
