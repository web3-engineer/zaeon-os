---
name: scroll-suave-lenis
description: Ensina e aplica rolagem suave (smooth scroll) numa página web com a biblioteca Lenis — leve, performática, e como integrá-la sem brigar com acessibilidade ou com âncoras. Use quando o aluno estiver fazendo um site e quiser rolagem suave, perguntar sobre scroll travado ou "pesado", ou integrar Lenis a React/GSAP. Lenis (darkroomengineering, MIT).
license: MIT
runtime: ts
risk: read
minPlan: free
courseTags:
  - web
  - front-end
  - javascript
  - animacao
metadata:
  zaeon-familia: procedimento
  zaeon-titulo: Rolagem suave com Lenis
  zaeon-subtitulo: Smooth scroll leve numa página web — e como integrar sem quebrar acessibilidade
  zaeon-modelo: ondas
  zaeon-tags: web, scroll, animação, front-end, open source
  zaeon-entrega: como instalar e inicializar o Lenis; o loop de animação certo; integração com âncoras e com React; os cuidados de acessibilidade (prefers-reduced-motion)
  zaeon-app-licenca: MIT (Lenis, darkroom.engineering, 2024)
---

# Rolagem suave com Lenis

Procedimento para aplicar **smooth scroll** numa página web com o **Lenis** (biblioteca JavaScript
leve, MIT, da darkroom.engineering). Não é um app de dispositivo — é uma biblioteca que roda no
navegador do site do aluno.

## O que fazer

1. **Instale** (`npm i lenis`) ou use pelo CDN.
2. **Inicialize** e rode o loop de animação com `requestAnimationFrame` — o Lenis precisa ser
   "tickado" a cada quadro para interpolar a rolagem.
3. **Integre as âncoras**: links `#secao` têm de chamar o `lenis.scrollTo` em vez do pulo nativo,
   senão a rolagem suave e o salto de âncora brigam.
4. **Em React**: inicialize num `useEffect`, guarde a instância, e destrua no cleanup — senão o
   hot-reload empilha vários Lenis rodando juntos.

## O cuidado que quase todo mundo esquece

**Acessibilidade.** Rolagem suave pode enjoar e atrapalhar quem usa o teclado ou tem sensibilidade a
movimento. Respeite `prefers-reduced-motion`: quando o sistema do usuário pede menos movimento,
DESLIGUE o Lenis e deixe a rolagem nativa. Uma animação bonita que ignora isso é um defeito de
acessibilidade, não um charme.

## Limites

- **Não troca o comportamento esperado do navegador** (busca com Ctrl+F, foco por teclado) — o Lenis
  acompanha a rolagem, não a sequestra.
- **Não é para app nativo** — é web.
