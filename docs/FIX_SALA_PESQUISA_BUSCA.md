# Fix — Sala de Pesquisa dizia "não pode realizar a busca" (2026-09-26)

## Sintoma
Na Sala de Pesquisa, a IA respondia que "a reexecução da busca sistemática (PubMed, Scopus,
Web of Science) não pode ser realizada neste momento".

## Diagnóstico (verificado ao vivo)
**Os conectores estão saudáveis.** Testei cada fonte do sandbox e a busca já deployada:

| Fonte | HTTP | 
|---|---|
| OpenAlex | 200 ✅ |
| Crossref | 200 ✅ |
| PubMed (eutils) | 200 ✅ |
| Europe PMC | 200 ✅ |
| arXiv | 200 ✅ (segue redirect) |
| CORE | 200 ✅ (segue redirect) |
| Semantic Scholar | 429 ⚠️ (rate-limit — única capenga; degrada sozinha) |

A busca real em produção (`/api/scholar/search`) retornou artigos de verdade
(ex.: "Mescaline: the forgotten psychedelic", Neuropharmacology 2022; PRISMA/BMJ para
"systematic review depression"). O pipeline `plan → retrievePapers → full-text → synthesize`
funciona, e `resolveFullText` já cai para o abstract quando não há PDF aberto — então o corpus
quase nunca fica vazio.

**Causas reais (não era conector quebrado):**
1. **Scopus e Web of Science nunca foram integrados** (exigem chave institucional paga). A IA
   os citava mesmo sem existirem no código → superpromessa.
2. **A mensagem era gerada pela IA**, não uma string do código (confirmado por grep). Com o
   `OMEGA_SYSTEM` só mandando "afirme apenas com verbatim", o modelo, diante de poucos papers,
   **hedgeava** ("não dá pra rodar a busca; refaça em PubMed/Scopus/WoS") em vez de sintetizar
   o que encontrou.

## Correção aplicada
`lib/scholar/prompt.ts` — reescrita do `OMEGA_SYSTEM`:
- **Anti-hedge:** proibido dizer que a busca não pode ser feita / mandar buscar em outro lugar.
  "VOCÊ é a busca — os papers já foram recuperados; trabalhe com eles."
- **Sem bases-fantasma:** proibido mencionar/prometer Scopus, Web of Science ou qualquer base
  fora da lista. Cobertura real declarada: OpenAlex, PubMed, Crossref, Europe PMC, arXiv.
- **Degradação honesta:** poucos trabalhos → "encontrei N sobre X" + sintetiza + sugere recortes;
  zero → diz que não achou e sugere reformular. Nunca beco sem saída.
- **Tom da Sala de Pesquisa** (distinto da Sala de Estudos): acadêmico, embasado, dialogando com
  a literatura ("Autor et al. (ano) mostra…", "em contraste…", "uma lacuna aberta é…"),
  preciso e sem a informalidade descontraída da sala de estudos.
- `planTone` ajustado para "Levantando a literatura sobre …" (mais research-toned).

As regras de fundamentação (verbatim, sem citação inventada, Evidence Records) foram mantidas.

## Follow-ups opcionais (não urgentes)
- **Semantic Scholar 429:** pegar uma chave gratuita de API do S2 (`SEMANTIC_SCHOLAR_API_KEY`)
  e enviá-la no header reduz o 429. O pipeline já compensa com as outras fontes, então é opcional.
- **Scopus/WoS de verdade:** só com contrato/chave institucional. Decisão de produto; por ora a
  IA declara honestamente a cobertura gratuita.
