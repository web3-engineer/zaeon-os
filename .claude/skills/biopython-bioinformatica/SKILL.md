---
name: biopython-bioinformatica
description: Ensina bioinformática com o Biopython — ler arquivos FASTA e GenBank, manipular sequências de DNA, RNA e proteína, transcrever, traduzir, calcular conteúdo GC e alinhar duas sequências. Use quando o aluno de biologia, biomedicina ou biotecnologia precisar analisar uma sequência, entender o dogma central na prática, abrir um arquivo FASTA, ou começar em bioinformática com Python. Biopython (Biopython Contributors, Biopython License Agreement, com arquivos em dupla licença BSD-3-Clause).
license: LicenseRef-Biopython
runtime: ts
risk: read
minPlan: free
courseTags:
  - biologia
  - bioinformatica
  - genetica
  - python
metadata:
  zaeon-familia: procedimento
  zaeon-repo: biopython/biopython
  zaeon-titulo: Biopython — o dogma central em código
  zaeon-subtitulo: Ler FASTA, transcrever, traduzir e alinhar sequências de DNA e proteína em Python
  zaeon-modelo: molecula
  zaeon-tags: Biopython, bioinformática, DNA, proteína, FASTA, open source
  zaeon-entrega: o objeto Seq e as operações de complemento, transcrição e tradução; leitura de FASTA e GenBank com SeqIO; conteúdo GC; alinhamento par a par; os cuidados com fita, quadro de leitura e códon de parada
  zaeon-app-licenca: Biopython License Agreement, permissiva, com arquivos em dupla licença BSD-3-Clause (Biopython Contributors)
---

# Biopython — o dogma central em código

Procedimento para ensinar **bioinformática** com o **Biopython**. Código-fonte em
https://github.com/biopython/biopython. Licença: **Biopython License Agreement** (permissiva,
no estilo BSD/MIT), com parte dos arquivos em dupla licença **BSD-3-Clause** — o texto está em
`LICENSE.rst` no repositório. Instala com `pip install biopython`.

## O roteiro

```python
from Bio.Seq import Seq
from Bio import SeqIO
from Bio.SeqUtils import gc_fraction

dna = Seq("ATGGCCATTGTAATGGGCCGCTGAAAGGGTGCCCGATAG")
dna.complement()            # fita complementar
dna.reverse_complement()    # a outra fita, lida 5'->3'
rna = dna.transcribe()      # T -> U
rna.translate(to_stop=True) # proteína até o primeiro códon de parada
gc_fraction(dna)            # conteúdo GC (0 a 1)

for reg in SeqIO.parse("genes.fasta", "fasta"):
    print(reg.id, len(reg.seq))
```

1. **Dogma central, na ordem**: DNA → (transcrição) → RNA → (tradução) → proteína. Faça o aluno
   prever o resultado à mão para os primeiros 3 códons antes de rodar.
2. **Fita e sentido**: `transcribe()` assume que a sequência dada é a fita CODIFICANTE. Se o gene
   está na outra fita, é `reverse_complement()` primeiro. É o erro conceitual mais comum.
3. **Quadro de leitura**: a mesma sequência tem 3 quadros por fita. Tradução cheia de `*`
   (códons de parada) no meio costuma ser quadro errado, não gene quebrado.
4. **Alinhamento par a par**: `Bio.Align.PairwiseAligner()` — global para sequências do mesmo
   tamanho e origem, local para achar um trecho parecido dentro de algo maior.

## Dados para praticar

Sequências públicas do **NCBI GenBank** e do **UniProt**. Cite o número de acesso no relatório:
sequência sem acesso não é reproduzível.

## O que esta skill NÃO faz

- **Não faz diagnóstico genético.** Analisar uma sequência em aula não é laudo; interpretação
  clínica é de profissional habilitado, com método validado.
- **Não trata dado genético de pessoa identificável.** É dado sensível pela LGPD — use só
  sequências públicas de referência.
- **Não ajuda a aumentar a periculosidade de patógeno** nem a contornar triagem de biossegurança.
