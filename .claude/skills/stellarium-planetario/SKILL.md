---
name: stellarium-planetario
description: Entrega o Stellarium, o planetário open-source que mostra o céu realista em 3D — estrelas, constelações, planetas e nebulosas — para qualquer lugar e qualquer data. Use quando o aluno quiser saber o que está visível no céu hoje, identificar uma estrela ou planeta, planejar uma noite de observação, simular um eclipse ou as fases da Lua, ou entender o movimento aparente do céu. É um app de DISPOSITIVO — o aluno baixa e roda no computador dele; a Zaeon entrega o espelho e as instruções, não executa o app. Stellarium (Stellarium Developers, GPL-2.0-or-later).
license: GPL-2.0-or-later
runtime: ts
risk: read
minPlan: free
courseTags:
  - astronomia
  - fisica
  - geografia
  - ensino-de-ciencias
metadata:
  zaeon-familia: device
  zaeon-titulo: Stellarium — o planetário no seu computador
  zaeon-subtitulo: O céu de qualquer lugar e de qualquer data, do jeito que se vê a olho nu ou no telescópio
  zaeon-modelo: foguete
  zaeon-tags: Stellarium, astronomia, planetário, céu, constelações, open source
  zaeon-entrega: o espelho oficial do Stellarium (GPL); como configurar o seu local; o controle do tempo para ver o céu girar; cinco experimentos de astronomia para fazer na tela; o roteiro para planejar uma observação real
  zaeon-device-plataforma: windows
  zaeon-device-mirror: https://stellarium.org/
  zaeon-app-licenca: GPL-2.0-or-later (Stellarium, Fabien Chéreau e Stellarium Developers)
---

# Stellarium — o planetário no seu computador

Procedimento para instalar e usar o **Stellarium**, planetário open-source. Código-fonte em
https://github.com/Stellarium/stellarium, licença **GNU GPL versão 2 ou posterior**.

Este é um card de **dispositivo**: o app roda **no computador do aluno**, não no servidor da
Zaeon. A casa entrega o espelho oficial de download e estas instruções.

## Instalação e ajuste inicial

1. **Baixe** pelo espelho do card (o site oficial). O card marca Windows por ser o caso mais comum; os instaladores de **macOS** e **Linux** estão na mesma página.
2. **F6 — Local**: escolha a sua cidade. O céu de Porto Alegre não é o de Manaus, e o do
   hemisfério sul não é o dos tutoriais estrangeiros.
3. **F5 — Data e hora**. Tecle **8** para voltar ao agora.

## Os controles que importam

- **L** acelera o tempo, **J** desacelera, **K** volta ao normal.
- **C** linhas das constelações, **V** nomes, **R** as figuras.
- **A** liga e desliga a atmosfera (desligue para ver as estrelas de dia); **G** o chão.
- **E** grade equatorial, **Z** grade altazimutal. **F3** busca um astro pelo nome.

## Cinco experimentos na tela

1. **O céu gira em torno de um ponto.** Olhe para o Sul, acelere o tempo: tudo roda em torno do
   polo celeste sul. A altura desse ponto acima do horizonte é a sua **latitude**.
2. **Cruzeiro do Sul como bússola**: prolongue o braço maior 4,5 vezes e chegue ao polo.
3. **Por que há estações**: acompanhe a altura do Sol ao meio-dia em junho e em dezembro.
4. **Laçada de Marte**: avance dia a dia (tecla **=**) e veja o movimento retrógrado.
5. **Fases da Lua**: avance um mês e relacione a fase com a posição em relação ao Sol.

## Planejar uma observação real

Escolha a data, veja a que horas o alvo passa de 30° de altura, confira a fase da Lua (céu
escuro pede Lua nova) e anote a direção. Para cálculo programático, o caminho é o card
`astropy-astronomia`.

## O que esta skill NÃO faz

- **Não executa o app no servidor da Zaeon.** É dispositivo: roda na máquina do aluno.
- **Não redistribui o instalador.** O espelho aponta para a página oficial do projeto.
- **Não substitui olhar o céu.** A simulação prepara; a observação é lá fora.
- **Não libera olhar o Sol.** Nunca aponte binóculo ou telescópio para o Sol sem filtro solar
  certificado na frente da objetiva — o dano à visão é imediato e permanente.
- **Não faz astrologia.**
