---
name: querido-diario-direito
description: Ensina a pesquisar atos oficiais de municípios brasileiros com o Querido Diário, projeto open-source da Open Knowledge Brasil que coleta e torna pesquisáveis os diários oficiais municipais. Use quando o aluno de direito, administração pública ou jornalismo precisar achar uma licitação, nomeação, decreto ou contrato num diário oficial municipal, quiser fazer pesquisa empírica em direito administrativo, ou aprender a citar corretamente uma fonte oficial. Querido Diário (Open Knowledge Brasil, MIT).
license: MIT
runtime: ts
risk: read
minPlan: free
courseTags:
  - direito
  - administracao-publica
  - jornalismo-de-dados
  - transparencia
metadata:
  zaeon-familia: procedimento
  zaeon-repo: okfn-brasil/querido-diario
  zaeon-titulo: Querido Diário — diários oficiais pesquisáveis
  zaeon-subtitulo: Ache licitações, nomeações e decretos municipais na fonte oficial, e cite do jeito certo
  zaeon-modelo: predio
  zaeon-tags: Querido Diário, direito, diário oficial, transparência, dados abertos, open source
  zaeon-entrega: como buscar por termo, município e período; o roteiro de leitura de um ato oficial; como citar a publicação com data, edição e página; os limites de cobertura e de OCR; a ponte para pesquisa empírica em direito
  zaeon-app-licenca: MIT (Querido Diário, Open Knowledge Brasil — Rede pelo Conhecimento Livre)
---

# Querido Diário — diários oficiais pesquisáveis

Procedimento para pesquisar **atos oficiais municipais** com o **Querido Diário**, projeto
open-source da **Open Knowledge Brasil** que raspa, extrai o texto e indexa diários oficiais de
municípios brasileiros. Código-fonte em https://github.com/okfn-brasil/querido-diario (os
raspadores) e https://github.com/okfn-brasil/querido-diario-api (a API pública), ambos licença
**MIT**. A busca fica em https://queridodiario.ok.org.br.

## Por que isto importa

O ato administrativo só vale depois de **publicado**. O diário oficial é a fonte primária — e,
no nível municipal, costuma ser um PDF sem busca, num site diferente por cidade. O Querido
Diário junta tudo num lugar pesquisável.

## O roteiro de pesquisa

1. **Defina a pergunta** antes do termo: "quais contratos de merenda o município X firmou em
   2025?" rende mais do que digitar "merenda".
2. **Busque** por termo, filtrando **município** e **período**. Use o vocabulário do ato
   ("dispensa de licitação", "extrato de contrato", "nomear", "exonerar"), não o da notícia.
3. **Abra o PDF original** do resultado. O texto indexado vem de extração automática; o que
   vale juridicamente é o diário publicado.
4. **Leia o ato inteiro**: autoridade que assina, fundamento legal citado, objeto, valor, partes,
   data de vigência. Anote o que o ato NÃO diz também.
5. **Cite**: município, nome do diário, data, número da edição, página, e o link do original.
6. **Pesquisa empírica**: para muitos atos, a API pública devolve os resultados em JSON —
   documente a consulta (termo, municípios, datas) para outra pessoa conseguir repetir.

## Os limites — diga ao aluno

- **A cobertura não é total**: nem todo município está na base, e o histórico varia por cidade.
- **Ausência de resultado não prova ausência de ato.** Pode ser falha de extração de texto ou
  município fora da base — confira no site oficial da prefeitura.

## O que esta skill NÃO faz

- **Não é consulta jurídica.** Achar e ler um ato não é dizer se ele é legal; isso é parecer de
  advogado.
- **Não serve para montar dossiê de pessoa física.** Diário oficial traz nome e às vezes
  documento de servidor e de cidadão; pesquisa é sobre o ATO público, com finalidade legítima
  (LGPD vale para dado público também).
- **Não substitui a fonte oficial.** O documento que se cita e se junta ao processo é o diário
  publicado pelo município.
