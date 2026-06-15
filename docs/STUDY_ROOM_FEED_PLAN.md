# Sala de Estudos — "Meus Estudos" (mini-Notion) + engine de vídeos

> Reimaginação da Sala de Estudos: além de pesquisar (Omega), o aluno CONSTRÓI o
> seu espaço de estudo — um feed pessoal onde cola tudo (refs, insights, sínteses,
> base, sugestões, PDFs, vídeos, anotações), persistente e generativo.
> Atualizado: 2026-06-15.

## Já entregue nesta passada
- **Pulse robusto:** `ZaeonTriangle` intercepta `fetch`, `EventSource` (SSE) e `XHR` →
  o triângulo pisca azul em QUALQUER busca de agente (inclui o Omega da Sala de Estudos).
- **Layout alinhado:** removido o `mx-6` interno da barra Omega e do painel (no modo
  `flushTop`), igualando as proporções da Sala de Estudos às da sala Projetos (usa só o `px-6` do main).
- **Engine de vídeos:** `POST /api/study/youtube` `{ topic }` → sugestões de vídeos.
  Com `YOUTUBE_API_KEY` retorna vídeos REAIS (videoId embutível); sem a chave, fallback
  Gemini com links de busca. Pronta para a aba "Vídeos".

## Visão
Um "mini-Notion" por tema. A aba **Pesquisa (Omega)** serve para ACESSAR conteúdo;
o engajamento vem de MONTAR a Sala de Estudos. Tudo que aparece nas outras abas
(refs, insights, sínteses, base, sugestões) vira item **colável** no feed "Meus Estudos".

## Modelo de dados (persistente)
```
StudySpace { id, title, createdAt, updatedAt }           // vários por usuário
StudyItem  {
  id, spaceId, type: "ref"|"insight"|"synthesis"|"base"|"suggestion"|"pdf"|"video"|"note",
  title, payload (json: texto/links/videoId/pdfUrl), summary?, createdAt, order
}
```
Persistência: começar em **localStorage** (rápido, igual aos projetos da IDE), com
caminho claro para **MongoDB** (coleções `study_spaces` / `study_items`) quando quiser
sincronizar entre dispositivos. (Decisão a confirmar com o Martinez.)

## UX (espelha a sala de criação de pesquisa)
- Nova aba **"Meus Estudos"** (default ao abrir) com **biblioteca à direita** (mesmo
  painel da pesquisa) e o **feed** no centro.
- **Colar:** cada item das abas refs/insights/síntese/base/sugestões ganha um botão
  "+ Meus Estudos" (ou arrastar). **Arrastar NÃO abre** — só cria um card no feed numa
  versão "abrível" depois (preview), como pedido.
- **Play contextual:** no item de PDF, opções incl. "Conversar sobre este PDF" (abre
  chat com a Aura/`/api/ai/chat` usando o PDF salvo da biblioteca).
- **Múltiplos espaços:** seletor de StudySpace (criar/renomear/excluir), tudo persistente.
- **Generativo:** botão "Resumir" em qualquer card/seleção → `/api/ai/...` (Flash) gera
  resumo do que foi colado; resumo fica salvo no item (`summary`).

## Aba "Vídeos"
- Campo de tema (ou herda o último pesquisado) → chama `/api/study/youtube`.
- Cada vídeo: jogar para a **biblioteca** como link; ao colar no feed, vira **player
  embutido** (`<iframe>` do YouTube via `videoId`) assistível dentro da sala.

## Fatiamento sugerido (próximas passadas)
1. **Slice 1:** aba "Meus Estudos" + feed localStorage + colar itens (texto/refs) +
   resumir (Flash) + múltiplos espaços. (UI principal.)
2. **Slice 2:** aba "Vídeos" consumindo `/api/study/youtube` + player embutido no feed.
3. **Slice 3:** "Conversar sobre PDF" no card de PDF + anotações ricas.
4. **Slice 4:** sincronizar no MongoDB (persistência por conta) + compartilhar espaço.

## Decisões em aberto (confirmar)
- Persistência inicial: **localStorage** (recomendado p/ velocidade) vs MongoDB já.
- `YOUTUBE_API_KEY` disponível? (sem ela, "Vídeos" funciona em modo fallback).
- "Conversar sobre PDF" reaproveita a Aura (`/api/ai/chat` + PDF da biblioteca) — ok?
