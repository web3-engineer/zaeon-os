---
name: phoneuse-iphone
description: Dá ao agente do aluno um iPhone de verdade, controlado por USB a partir do Mac (PhoneUse, MIT). Use quando o pedido for sobre automatizar o iPhone, controlar o telefone por linguagem natural, tirar print da tela do iPhone ao vivo, ou plugar um agente de IA ao celular. É um app de DISPOSITIVO: o aluno baixa e roda na máquina dele; a Zaeon entrega o espelho de download e as instruções, não executa o app.
license: MIT
runtime: ts
risk: read
minPlan: free
courseTags:
  - automacao
  - ios
  - produtividade
  - agentes
metadata:
  zaeon-familia: device
  zaeon-titulo: Seu agente de IA no seu iPhone
  zaeon-subtitulo: PhoneUse — um iPhone de verdade na sua mesa, controlado por linguagem natural pelo Mac
  zaeon-modelo: chip
  zaeon-tags: iPhone, automação, agente, USB, open source
  zaeon-entrega: o espelho de download do PhoneUse (MIT); o passo a passo de instalação no Mac; como plugar o iPhone por USB; os comandos em linguagem natural; o servidor MCP para o seu agente
  zaeon-device-plataforma: macos
  zaeon-device-mirror: https://github.com/phoneuse-official/phoneuse/releases/latest
  zaeon-app-licenca: MIT (PhoneUse contributors, 2026)
---

# Seu agente de IA no seu iPhone — PhoneUse

Procedimento para instalar e usar o **PhoneUse** (open-source, MIT): ferramentas que controlam um
iPhone conectado por USB a partir do Mac — interface web local, preview da tela ao vivo, comandos em
linguagem natural, API REST e servidor MCP.

Este é um card de **dispositivo**: o app roda **no Mac do aluno**, não no servidor da Zaeon. A casa
entrega o espelho de download e estas instruções; quem executa é a máquina dele. Isso é o que torna
seguro oferecer o app — nada roda aqui.

## O que o aluno precisa ter

- Um **Mac** (o software roda nele).
- Um **iPhone** com cabo USB.
- Confiar no computador no iPhone na primeira conexão ("Confiar neste computador?").

## Passo a passo

1. **Baixe** pelo espelho do card (botão de download após o plug). É o release mais recente do
   repositório oficial, MIT.
2. **Instale no Mac** seguindo o README do pacote. Não precisa de jailbreak nem de conta de
   desenvolvedor paga para o uso local.
3. **Conecte o iPhone por USB** e confirme "Confiar neste computador" na tela do telefone.
4. **Abra a interface web local** (o pacote sobe um servidor em `localhost`). Ali aparece o preview
   da tela do iPhone ao vivo.
5. **Comande por linguagem natural** ("abra as Configurações", "tire um print", "role até o fim") —
   ou conecte o **servidor MCP** do PhoneUse ao seu agente (Claude, Codex) e deixe o agente dirigir.

## O que esta skill NÃO faz

- **Não executa o PhoneUse no servidor da Zaeon.** É dispositivo: roda no Mac do aluno.
- **Não contorna segurança do iOS.** PhoneUse usa o canal USB oficial da Apple; não há jailbreak,
  nem burla de bloqueio, nem automação de conta de terceiro sem o dono.
- **Não substitui o cabo.** O controle é por USB; não é um acesso remoto pela internet.
