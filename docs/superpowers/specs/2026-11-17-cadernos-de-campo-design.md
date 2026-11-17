# Cadernos de Campo — 27 estudos de exemplo prontos para a ação

## Intenção e o porquê
Os 27 cards de exemplo da vitrine (PR #844, `lib/estudos/vitrineExemplos.ts`, 9 skins × 3)
hoje são só capas. O dono quer cada um virar um **caderno de campo**: material pesquisado,
com **dados reais e fontes**, que permita a uma pessoa **fazer o estudo na vida real** — do
projeto à execução. Tudo que entra tem que já ter sido feito/estudado/esquematizado por
alguém antes, com referência. Quando a atividade exige um profissional, o caderno diz isso
explicitamente e abre um campo interativo onde a Zaeon mobiliza e gerencia o trabalhador até
o resultado.

## Metas
- Um `CadernoEstudo` por card (27 no total), ligado via `cadernoEstudoId` em `vitrineExemplos`.
- **36–77 páginas** (`paginas[]`) por caderno (≥77 para os pesados: ecovila, biogás, horta,
  fotovoltaica, bacia urbana…).
- Cada caderno com: leitura, **desenhos** (pranchas), **diagramas** (Mermaid), **tarefas**
  práticas, **vídeos reais** (YouTube verificado), **lições/quiz**, **mobilização** de
  profissionais quando preciso, e **fontes** reais.
- **Toda afirmação, técnica, número, desenho e vídeo tem lastro**: o verificador confere contra
  as fontes antes da entrega.

## Não-metas / anti-metas
- NÃO inventar dados, vídeos, normas ou fontes. Um id de YouTube que não resolve, um número sem
  fonte, uma norma inexistente = reprova a página.
- NÃO comprar/pagar nada (a compra da vitrine segue "em breve").
- NÃO fazer a mobilização real de trabalhadores AGORA (ver Escopo da mobilização).

## Mudanças no schema (`lib/estudos/cadernosEstudo.ts` + tipos)
Dois blocos novos em `BlocoEstudo`:
- `{ tipo: "mobilizacao"; papel; porque; entregaEsperada; gerenciadoPor: "zaeon" }` — diz qual
  profissional a etapa exige, por quê, e o que ele entrega. Renderiza o aviso explícito + um
  **campo interativo** ("receber profissional") que publica no canal humano+agente do Escritório
  (seam `NEXT_PUBLIC_ESCRITORIO_COWORK` / cartolina) e a Zaeon acompanha até o estado "feito".
- `{ tipo: "fontes"; itens: { titulo; url; tipo: "artigo"|"norma"|"video"|"dataset"|"livro"|"site"; nota? }[] }`
  — as referências reais. Todo caderno tem ao menos uma página de fontes; as páginas citam por título.

## Escopo da mobilização (regra nova do dono)
- AGORA: o bloco `mobilizacao` é explícito e o campo interativo **abre uma vaga no Escritório**
  (o seam de coworking humano+agente que já existe) e mostra o estado (aberta → aceita → feita).
- A gestão "até o outcome" pela Zaeon reusa o canal do Escritório (Buzz/cartolina). O fio fino
  do bloco → Escritório é parte deste PR; a automação completa de acompanhamento fica como seam
  marcado, se o canal ainda não expõe tudo.

## Abordagens (como construir)
1. **Workflow multi-agente, pipeline por caderno (ESCOLHIDA).** Para cada card: Pesquisador →
   (Autor do domínio ‖ Desenhista) → Verificador de referências → Montador. Roda em background,
   27 cards em sequência (controla custo e deixa o verificador barrar antes do próximo). Casa com
   "orquestrador multi-agente + especialistas + em loop" e com a verificação obrigatória.
2. Ralph loop autônomo (um card por iteração, sem fan-out determinístico). Rejeitada: menos
   controle de qualidade/paralelismo que o Workflow, e o verificador fica solto.
3. Um agente gigante por caderno. Rejeitada: sem separação pesquisa/verificação, o lastro de
   fontes afrouxa — exatamente o que o dono exige que NÃO aconteça.

## Os especialistas (papéis do pipeline)
- **Pesquisador** (web + vídeos): junta fontes reais, datasets abertos, normas, técnicas e vídeos
  do YouTube **verificando que o id resolve**. Entrega um dossiê de fontes.
- **Autor do domínio** (engenharia / humanas / ciências, por card): escreve as páginas (texto,
  tarefas, lição, mobilização) a partir do dossiê, citando as fontes. Mira o alvo de páginas.
- **Desenhista**: pranchas (primitivas linha/seta/círculo/retângulo/curva/rótulo, viewport ~303×197)
  e diagramas Mermaid.
- **Verificador**: cada afirmação tem fonte? vídeos resolvem? schema válido? nº de páginas ≥ alvo?
  mobilização onde precisa de profissional? Reprova e devolve com o que falta.
- **Montador**: emite o objeto `CadernoEstudo` TS, apenda em `cadernos[]`, liga `cadernoEstudoId`
  em `vitrineExemplos`, roda `tsc`/teste do arquivo. Commita o caderno.

## O que fica com o builder
- O alvo de páginas por card (36 vs 77) sai da dificuldade do tema (lista no plano).
- O fio exato do bloco `mobilizacao` → Escritório, conforme o que o canal já expõe.

## Saída e entrega
- Branch `claude/cadernos-de-campo` sobre `codex/about-zaeon-oceano` (#844); um commit por caderno;
  PR empilhado no #844 ao final (ou em lotes).
- Realidade: conteúdo auto-gerado com lastro tem limite — o verificador reduz, não zera, o risco de
  um vídeo que saiu do ar ou uma citação imperfeita. Entrego com as fontes à vista para auditoria.
