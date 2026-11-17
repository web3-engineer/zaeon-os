# Cadernos de Campo — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans. Steps use `- [ ]`.

**Goal:** Dar à vitrine 27 cadernos de campo pesquisados (36–77 páginas), com fontes reais e mobilização de profissionais, gerados por um Workflow multi-agente.

**Architecture:** Andaime de schema primeiro (blocos `mobilizacao`+`fontes`, auditor `auditarCaderno`, render), depois um Workflow pipeline por caderno (pesquisador→autor‖desenhista→verificador→montador) que emite `CadernoEstudo` TS conformes e commita.

**Tech Stack:** TypeScript, Next.js, o módulo de prancha (lib/harness/caderno/compile), Mermaid, Workflow tool.

**Spec:** docs/superpowers/specs/2026-11-17-cadernos-de-campo-design.md

## Global Constraints
- Toda afirmação/número/técnica/desenho/vídeo tem fonte real; sem lastro = reprova.
- Vídeo = id de YouTube que resolve. Prancha = primitivas válidas (viewport ~303×197).
- `mobilizacao` onde a etapa exige profissional; liga ao seam do Escritório (NEXT_PUBLIC_ESCRITORIO_COWORK/cartolina).
- 36 páginas mín.; 77 nos pesados. Não quebrar tsc nem os testes da vitrine.

## Review Focus
- Caderno com páginas de menos → `auditarCaderno` reprova (`poucas_paginas`).
- Vídeo com id malformado/placeholder → reprova (`video_invalido`).
- Bloco de afirmação factual sem nenhuma página `fontes` no caderno → reprova (`sem_fontes`).
- `mobilizacao` sem papel/entrega → reprova (`mobilizacao_incompleta`).
- `vitrineExemplos`: card sem `cadernoEstudoId` quando o caderno existe → reprova (`card_desligado`).

---

### Task 1: Schema (blocos novos) + auditor
**Files:** Modify `lib/estudos/cadernosEstudo.ts`; Create `lib/estudos/auditarCaderno.ts`; Test `lib/estudos/auditarCaderno.test.ts`.
**Interfaces:** Produces `BlocoEstudo` com `mobilizacao`/`fontes`; `auditarCaderno(c: CadernoEstudo, alvo: number): string[]` (lista de problemas; vazio = ok).
- [ ] Teste: caderno com 3 páginas e alvo 36 → inclui "poucas_paginas"; vídeo "xxxx" → "video_invalido"; afirmação sem página fontes → "sem_fontes"; mobilizacao sem papel → "mobilizacao_incompleta". Caderno bom → [].
- [ ] Implementar os dois blocos em `BlocoEstudo` e `auditarCaderno`.
- [ ] tsc + teste passam. Commit.

### Task 2: Render dos blocos (view)
**Files:** Modify `components/estudos/CadernoEstudoView.tsx`, `components/estudos/caderno-estudo.module.css`.
**Interfaces:** Consumes blocos `mobilizacao`/`fontes`. Produces a UI: fontes como lista com links; mobilizacao como aviso + botão "Receber profissional" que abre vaga no Escritório (seam) e mostra o estado.
- [ ] Renderizar `fontes` (lista) e `mobilizacao` (aviso + campo interativo ligado ao seam). tsc. Commit.

### Task 3: Registry + wiring da vitrine
**Files:** Modify `lib/estudos/cadernosEstudo.ts` (cadernos[] lê de `lib/estudos/cadernos/*`), `lib/estudos/vitrineExemplos.ts` (todos os 27 ganham `cadernoEstudoId` quando o caderno existe), `lib/estudos/vitrine.test.ts`.
- [ ] `cadernos[]` agrega os arquivos por caderno; vitrineExemplos liga pelo id. Testes da vitrine verdes. Commit.

### Task 4: Orquestração (Workflow dos 27)
**Files:** Create `lib/estudos/cadernos/<id>.ts` (um por caderno, gerado).
**Interfaces:** Cada arquivo exporta `const caderno: CadernoEstudo`. Pipeline por card: pesquisador (fontes reais + vídeos verificados) → autor do domínio ‖ desenhista → verificador (`auditarCaderno` + checagem de fontes) → montador (emite o arquivo, tsc, commit). Alvo de páginas por card na tabela abaixo.
- [ ] Rodar o Workflow; cada caderno passa no auditor antes do commit.

## Tabela dos 27 (domínio · alvo de páginas)
- Pesados (77): ecovila, biogas-local, horta-comunitaria, geracao-fotovoltaica, bacia-urbana, captacao-chuva.
- Médios (48–60): rios-urbanos, isolamento-termico, luz-natural, estacao-reparo, cobertura-solo, corredores-verdes, comedouros, temperatura-bairros, cardiovascular, fluxo-caixa, governanca-comunitaria.
- Base (36): sono-aprendizagem, sinalizacao-parque, sazonalidade-feiras, memoria-ferrovia, mercados-municipais, cooperativas, acesso-transporte, mapeamento/geografia restantes, dados restantes, historia restante.
