---
name: poki-iphone
description: Deixa um agente de IA usar o seu iPhone como você usa — tocando, deslizando e digitando na tela — a partir de instruções em linguagem natural. Use quando o aluno quiser automatizar o iPhone, deixar um agente operar apps do celular, ou dar ao agente controle da tela do telefone. É um app de DISPOSITIVO: o aluno instala e roda no aparelho dele; a Zaeon entrega o espelho e as instruções. Poki (JosssphZhou, AGPL-3.0).
license: AGPL-3.0
runtime: ts
risk: read
minPlan: free
courseTags:
  - ios
  - automacao
  - agentes
metadata:
  zaeon-familia: device
  zaeon-titulo: Poki — um agente que usa o seu iPhone
  zaeon-subtitulo: O agente toca, desliza e digita na tela do iPhone a partir de linguagem natural
  zaeon-modelo: robo
  zaeon-tags: iPhone, automação, agente, iOS
  zaeon-entrega: o espelho de download do Poki (AGPL-3.0); como instalar e permitir no iPhone; como dar instruções em linguagem natural; os limites do que o agente pode tocar
  zaeon-device-plataforma: ios
  zaeon-device-mirror: https://github.com/JosssphZhou/poki/releases/latest
  zaeon-app-licenca: AGPL-3.0 (Poki, JosssphZhou, 2026)
---

# Poki — um agente que usa o seu iPhone

Procedimento para instalar e usar o **Poki** (open-source, AGPL-3.0): deixa um agente de IA operar o
iPhone como o aluno operaria — tocar, deslizar, digitar — a partir de instruções em linguagem
natural.

Card de **dispositivo**: o Poki roda no aparelho e na máquina do aluno, não no servidor da Zaeon.
Isso é o que torna seguro oferecer um **AGPL**: a cláusula de rede não nos alcança porque a Zaeon
não executa o código — quem roda é o aluno, na máquina dele. A casa entrega o espelho e as
instruções.

## O que o aluno precisa

- Um **iPhone** e a máquina/conta que o Poki pede (ver o README do pacote).
- Permitir o controle de acessibilidade/automação que o Poki solicita no primeiro uso.

## Passo a passo

1. **Baixe** pelo espelho do card (release oficial, AGPL-3.0).
2. **Instale e autorize** no iPhone conforme o guia do pacote (o Poki pede permissões para operar a
   tela).
3. **Dê a instrução em linguagem natural** ("abra o WhatsApp e responda o último da Ana").
4. **Acompanhe** — o agente toca na tela; você vê e pode parar.

## O que esta skill NÃO faz

- **Não executa o Poki no servidor da Zaeon.** É dispositivo: roda no aparelho do aluno.
- **Não contorna segurança do iOS nem opera conta de terceiro sem o dono.**
- **AGPL-3.0:** o aluno roda; a Zaeon só aponta o download.
